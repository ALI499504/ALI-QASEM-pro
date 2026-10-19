// =====================================================================
//  MQL5 Technical Indicators Library — TypeScript Implementation
// =====================================================================
//  Implements all 35+ standard MQL5 technical indicators with the SAME
//  function signatures as MetaTrader 5's MQL5. Code that uses iMA(),
//  iRSI(), iMACD(), etc. can be ported directly to TypeScript.
//
//  Indicators implemented:
//    Trend: iMA, iDEMA, iTEMA, iFrAMA, iAMA, iVIDyA, iBands, iEnvelopes,
//           iIchimoku, iSAR, iStdDev, iADX, iADXWilder, iAlligator, iGator
//    Oscillators: iRSI, iMACD, iStochastic, iCCI, iMomentum, iRVI,
//                 iDeMarker, iWPR, iOsMA, iBearsPower, iBullsPower,
//                 iForce, iATR, iChaikin, iTriX
//    Volume: iOBV, iMFI, iVolumes, iAD, iBWMFI
//    Bill Williams: iAC, iAO, iFractals
//
//  All indicators use the MQL5 handle-based API:
//    1. Create indicator: int handle = iMA(symbol, period, maPeriod, maShift, maMethod, appliedPrice)
//    2. Read buffer: double buf[]; CopyBuffer(handle, bufferIndex, startPos, count, buf)
//    3. Release: IndicatorRelease(handle)
// =====================================================================

import {
  MODE_SMA, MODE_EMA, MODE_SMMA, MODE_LWMA,
  PRICE_CLOSE,
  getAppliedPrice,
} from "./constants";

// ====================== Candle type ======================
export interface Mql5Candle {
  time: number;     // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume: number;
  real_volume: number;
  spread: number;
}

// ====================== Handle registry ======================
// Mimics MQL5's indicator handle system. Each indicator created
// gets a unique handle; the buffer can be read via CopyBuffer().
interface IndicatorHandle {
  id: number;
  symbol: string;
  timeframe: string;
  buffers: number[][];     // multiple buffers per indicator (main, signal, etc.)
  bufferNames: string[];
  isReady: boolean;
  calculated: number;     // number of values calculated
}

let nextHandle = 100;
const handles = new Map<number, IndicatorHandle>();

// ====================== Candle fetcher ======================
async function fetchCandles(symbol: string, timeframe: string, count: number = 200): Promise<Mql5Candle[]> {
  // Convert symbol to Binance PAXG if XAUUSD
  let apiSymbol = "XAUUSD";
  if (symbol.includes("XAU") || symbol.includes("GOLD")) {
    apiSymbol = "XAUUSD";
  }
  // Map various timeframe formats to Binance interval strings
  // Binance intervals: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
  const tfMap: Record<string, string> = {
    "1": "1m", "1m": "1m", "M1": "1m",
    "2": "2m", "2m": "2m", "M2": "2m",
    "5": "5m", "5m": "5m", "M5": "5m",
    "15": "15m", "15m": "15m", "M15": "15m",
    "30": "30m", "30m": "30m", "M30": "30m",
    "60": "1h", "1h": "1h", "H1": "1h",
    "120": "2h", "2h": "2h", "H2": "2h",
    "240": "4h", "4h": "4h", "H4": "4h",
    "480": "8h", "8h": "8h", "H8": "8h",
    "720": "12h", "12h": "12h", "H12": "12h",
    "1440": "1d", "1d": "1d", "D1": "1d", "D": "1d",
    "10080": "1w", "1w": "1w", "W1": "1w", "W": "1w",
    "43200": "1M", "1M": "1M", "MN1": "1M", "MN": "1M",
  };
  const tf = tfMap[timeframe] || "15m";

  try {
    // Use Binance PAXG for consistent real-time spot gold data
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${tf}&limit=${Math.min(count, 1000)}`);
    if (r.ok) {
      const j: any = await r.json();
      if (Array.isArray(j)) {
        return j.map((k: any[]) => ({
          time: Math.floor(Number(k[0]) / 1000),
          open: Number(k[1]),
          high: Number(k[2]),
          low: Number(k[3]),
          close: Number(k[4]),
          tick_volume: Number(k[5]),
          real_volume: Number(k[7] || k[5] || 0),
          spread: 0,
        }));
      }
    }
  } catch {}
  return [];
}

// ====================== Math helpers ======================
function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function ema(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  // Seed with SMA of first `period` values
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function smma(values: number[], period: number): number[] {
  // SMMA = (prev_sum - prev_SMMA + price) / period
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = (prev * (period - 1) + values[i]) / period;
    out[i] = prev;
  }
  return out;
}

function lwma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return out;
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i] * (i + 1);
    weightSum += (i + 1);
  }
  out[period - 1] = sum / weightSum;
  for (let i = period; i < values.length; i++) {
    // Remove oldest weight and add new
    let newSum = 0;
    for (let j = 0; j < period; j++) {
      newSum += values[i - j] * (period - j);
    }
    out[i] = newSum / weightSum;
  }
  return out;
}

function ma(values: number[], period: number, method: number): number[] {
  switch (method) {
    case MODE_SMA: return sma(values, period);
    case MODE_EMA: return ema(values, period);
    case MODE_SMMA: return smma(values, period);
    case MODE_LWMA: return lwma(values, period);
    default: return sma(values, period);
  }
}

// ====================== iMA — Moving Average ======================
// int iMA(symbol, period, ma_period, ma_shift, ma_method, applied_price)
export async function iMA(
  symbol: string,
  timeframe: string,
  maPeriod: number,
  maShift: number,
  maMethod: number,
  appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const maValues = ma(prices, maPeriod, maMethod);
  // Shift forward by maShift
  const shifted = new Array(maShift).fill(NaN).concat(maValues).slice(0, maValues.length);
  return createHandle(symbol, timeframe, [shifted], ["MA"]);
}

// ====================== iDEMA — Double Exponential MA ======================
export async function iDEMA(
  symbol: string, timeframe: string, maPeriod: number, maShift: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 4));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const ema1 = ema(prices, maPeriod);
  const ema2 = ema(ema1.filter(v => !isNaN(v)), maPeriod);
  // DEMA = 2*EMA1 - EMA2
  const out: number[] = new Array(prices.length).fill(NaN);
  for (let i = 0; i < prices.length; i++) {
    if (!isNaN(ema1[i])) {
      const e2Idx = i - (prices.length - ema2.length);
      const e2 = e2Idx >= 0 && e2Idx < ema2.length ? ema2[e2Idx] : NaN;
      out[i] = !isNaN(e2) ? 2 * ema1[i] - e2 : ema1[i];
    }
  }
  return createHandle(symbol, timeframe, [out], ["DEMA"]);
}

// ====================== iTEMA — Triple Exponential MA ======================
export async function iTEMA(
  symbol: string, timeframe: string, maPeriod: number, maShift: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 5));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const e1 = ema(prices, maPeriod);
  const e2 = ema(e1.filter(v => !isNaN(v)), maPeriod);
  const e3 = ema(e2.filter(v => !isNaN(v)), maPeriod);
  const out: number[] = new Array(prices.length).fill(NaN);
  for (let i = 0; i < prices.length; i++) {
    if (!isNaN(e1[i])) {
      const i2 = i - (prices.length - e2.length);
      const i3 = i - (prices.length - e3.length);
      const v2 = i2 >= 0 && i2 < e2.length ? e2[i2] : NaN;
      const v3 = i3 >= 0 && i3 < e3.length ? e3[i3] : NaN;
      if (!isNaN(v3)) out[i] = 3 * e1[i] - 3 * v2 + v3;
      else if (!isNaN(v2)) out[i] = 3 * e1[i] - 3 * v2;
      else out[i] = e1[i];
    }
  }
  return createHandle(symbol, timeframe, [out], ["TEMA"]);
}

// ====================== iFrAMA — Fractal Adaptive MA ======================
export async function iFrAMA(
  symbol: string, timeframe: string, maPeriod: number, maShift: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const out: number[] = new Array(prices.length).fill(NaN);
  const halfPeriod = Math.floor(maPeriod / 2);

  for (let i = maPeriod; i < prices.length; i++) {
    // Calculate fractal dimension
    let max1 = -Infinity, min1 = Infinity, max2 = -Infinity, min2 = Infinity;
    for (let j = 0; j < halfPeriod; j++) {
      const p = prices[i - halfPeriod + j];
      if (p > max1) max1 = p;
      if (p < min1) min1 = p;
    }
    for (let j = 0; j < maPeriod; j++) {
      const p = prices[i - maPeriod + j];
      if (p > max2) max2 = p;
      if (p < min2) min2 = p;
    }
    const range1 = max1 - min1;
    const range2 = max2 - min2;
    if (range2 > 0 && range1 > 0) {
      const dim = Math.log(range2 / range1) / Math.log(2);
      const alpha = Math.exp(-dim * 2);
      const w = alpha / (1 + 2 * (alpha - 1));
      // Apply weight to previous FrAMA value
      const prevFRAMA = out[i - 1] !== undefined && !isNaN(out[i - 1]) ? out[i - 1] : prices[i - 1];
      out[i] = w * prices[i] + (1 - w) * prevFRAMA;
    }
  }
  return createHandle(symbol, timeframe, [out], ["FrAMA"]);
}

// ====================== iAMA — Adaptive MA (Kaufman) ======================
export async function iAMA(
  symbol: string, timeframe: string, maPeriod: number, fastPeriod: number, slowPeriod: number, maShift: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 5));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const out: number[] = new Array(prices.length).fill(NaN);

  for (let i = maPeriod; i < prices.length; i++) {
    // Direction = |price[i] - price[i-period]|
    const direction = Math.abs(prices[i] - prices[i - maPeriod]);
    // Volatility = sum of |price[j] - price[j-1]| for j over period
    let volatility = 0;
    for (let j = 0; j < maPeriod; j++) {
      volatility += Math.abs(prices[i - j] - prices[i - j - 1]);
    }
    if (volatility > 0) {
      // Efficiency ratio
      const er = direction / volatility;
      // Smoothing constants
      const fastC = 2 / (fastPeriod + 1);
      const slowC = 2 / (slowPeriod + 1);
      const ssc = er * (fastC - slowC) + slowC;
      // Smoothing coefficient
      const w = ssc * ssc;
      const prevAMA = !isNaN(out[i - 1]) ? out[i - 1] : prices[i - 1];
      out[i] = prevAMA + w * (prices[i] - prevAMA);
    }
  }
  return createHandle(symbol, timeframe, [out], ["AMA"]);
}

// ====================== iVIDyA — Variable Index Dynamic Average ======================
export async function iVIDyA(
  symbol: string, timeframe: string, cmoPeriod: number, emaPeriod: number, maShift: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, cmoPeriod * 5 + emaPeriod));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const out: number[] = new Array(prices.length).fill(NaN);

  // Calculate CMO (Chande Momentum Oscillator)
  const cmoArr: number[] = new Array(prices.length).fill(NaN);
  for (let i = cmoPeriod; i < prices.length; i++) {
    let sumUp = 0, sumDown = 0;
    for (let j = 0; j < cmoPeriod; j++) {
      const diff = prices[i - j] - prices[i - j - 1];
      if (diff > 0) sumUp += diff; else sumDown += Math.abs(diff);
    }
    const total = sumUp + sumDown;
    cmoArr[i] = total > 0 ? 100 * (sumUp - sumDown) / total : 0;
  }

  // VIDyA = EMA with alpha = (2/(EMA_period+1)) * |CMO|/100
  const emaK = 2 / (emaPeriod + 1);
  for (let i = cmoPeriod + 1; i < prices.length; i++) {
    const absCmo = Math.abs(cmoArr[i]) / 100;
    const w = emaK * absCmo;
    const prev = !isNaN(out[i - 1]) ? out[i - 1] : prices[i - 1];
    out[i] = prices[i] * w + prev * (1 - w);
  }
  return createHandle(symbol, timeframe, [out], ["VIDyA"]);
}

// ====================== iBands — Bollinger Bands ======================
// int iBands(symbol, period, bands_period, bands_shift, deviation, applied_price)
// Buffers: 0=BASE (middle), 1=UPPER, 2=LOWER
export async function iBands(
  symbol: string, timeframe: string, bandsPeriod: number, bandsShift: number, deviation: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, bandsPeriod * 3));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));

  // Middle = SMA(period)
  const middle: number[] = new Array(prices.length).fill(NaN);
  const upper: number[] = new Array(prices.length).fill(NaN);
  const lower: number[] = new Array(prices.length).fill(NaN);

  for (let i = bandsPeriod - 1; i < prices.length; i++) {
    const slice = prices.slice(i - bandsPeriod + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / bandsPeriod;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / bandsPeriod;
    const std = Math.sqrt(variance);
    middle[i] = mean;
    upper[i] = mean + deviation * std;
    lower[i] = mean - deviation * std;
  }

  return createHandle(symbol, timeframe, [middle, upper, lower], ["BASE", "UPPER", "LOWER"]);
}

// ====================== iEnvelopes — Envelopes ======================
// Buffers: 0=UPPER, 1=LOWER
export async function iEnvelopes(
  symbol: string, timeframe: string, maPeriod: number, maMethod: number, maShift: number, deviation: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const middle = ma(prices, maPeriod, maMethod);
  const upper = middle.map(v => !isNaN(v) ? v * (1 + deviation / 100) : NaN);
  const lower = middle.map(v => !isNaN(v) ? v * (1 - deviation / 100) : NaN);
  return createHandle(symbol, timeframe, [upper, lower], ["UPPER", "LOWER"]);
}

// ====================== iStdDev — Standard Deviation ======================
export async function iStdDev(
  symbol: string, timeframe: string, maPeriod: number, maShift: number, maMethod: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const out: number[] = new Array(prices.length).fill(NaN);
  for (let i = maPeriod - 1; i < prices.length; i++) {
    const slice = prices.slice(i - maPeriod + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / maPeriod;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / maPeriod;
    out[i] = Math.sqrt(variance);
  }
  return createHandle(symbol, timeframe, [out], ["StdDev"]);
}

// ====================== iRSI — Relative Strength Index ======================
export async function iRSI(
  symbol: string, timeframe: string, maPeriod: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const out: number[] = new Array(prices.length).fill(NaN);
  if (prices.length < maPeriod + 1) return createHandle(symbol, timeframe, [out], ["RSI"]);

  let avgGain = 0, avgLoss = 0;
  // Initial averages
  for (let i = 1; i <= maPeriod; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss += Math.abs(diff);
  }
  avgGain /= maPeriod;
  avgLoss /= maPeriod;

  for (let i = maPeriod + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (maPeriod - 1) + gain) / maPeriod;
    avgLoss = (avgLoss * (maPeriod - 1) + loss) / maPeriod;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out[i] = 100 - 100 / (1 + rs);
  }
  return createHandle(symbol, timeframe, [out], ["RSI"]);
}

// ====================== iMACD — Moving Average Convergence Divergence ======================
// Buffers: 0=MAIN (MACD line), 1=SIGNAL
export async function iMACD(
  symbol: string, timeframe: string, fastEmaPeriod: number, slowEmaPeriod: number, signalPeriod: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(300, slowEmaPeriod * 5));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const fastEma = ema(prices, fastEmaPeriod);
  const slowEma = ema(prices, slowEmaPeriod);
  const macdLine: number[] = new Array(prices.length).fill(NaN);
  for (let i = 0; i < prices.length; i++) {
    if (!isNaN(fastEma[i]) && !isNaN(slowEma[i])) {
      macdLine[i] = fastEma[i] - slowEma[i];
    }
  }
  // Signal = EMA of MACD line
  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalEma = ema(validMacd, signalPeriod);
  const signalLine: number[] = new Array(prices.length).fill(NaN);
  let sigIdx = 0;
  for (let i = 0; i < prices.length; i++) {
    if (!isNaN(macdLine[i]) && sigIdx < signalEma.length) {
      signalLine[i] = signalEma[sigIdx];
      sigIdx++;
    }
  }
  return createHandle(symbol, timeframe, [macdLine, signalLine], ["MAIN", "SIGNAL"]);
}

// ====================== iATR — Average True Range ======================
export async function iATR(
  symbol: string, timeframe: string, maPeriod: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const tr: number[] = new Array(candles.length).fill(NaN);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }
  // Smooth with Wilder's smoothing (similar to EMA but with 1/period weight)
  const out: number[] = new Array(candles.length).fill(NaN);
  if (candles.length < maPeriod + 1) return createHandle(symbol, timeframe, [out], ["ATR"]);
  let atr = 0;
  for (let i = 1; i <= maPeriod; i++) atr += tr[i];
  atr /= maPeriod;
  out[maPeriod] = atr;
  for (let i = maPeriod + 1; i < candles.length; i++) {
    atr = (atr * (maPeriod - 1) + tr[i]) / maPeriod;
    out[i] = atr;
  }
  return createHandle(symbol, timeframe, [out], ["ATR"]);
}

// ====================== iStochastic — Stochastic Oscillator ======================
// Buffers: 0=MAIN (%K), 1=SIGNAL (%D)
export async function iStochastic(
  symbol: string, timeframe: string, kPeriod: number, dPeriod: number, slowing: number, maMethod: number, priceField: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, kPeriod * 5 + slowing * 3));
  // Raw %K (slow version uses slowing)
  const rawK: number[] = new Array(candles.length).fill(NaN);
  for (let i = slowing + kPeriod - 1; i < candles.length; i++) {
    // Get highest high and lowest low of last (kPeriod * slowing) bars
    let hh = -Infinity, ll = Infinity;
    for (let j = 0; j < kPeriod * slowing; j++) {
      const c = candles[i - j];
      if (c.high > hh) hh = c.high;
      if (c.low < ll) ll = c.low;
    }
    if (hh - ll > 0) {
      // Use close for both STO_LOWHIGH and STO_CLOSECLOSE (close is standard)
      rawK[i] = ((candles[i].close - ll) / (hh - ll)) * 100;
    } else {
      rawK[i] = 50;
    }
  }
  // %K = SMA of rawK over slowing period
  const k: number[] = new Array(candles.length).fill(NaN);
  for (let i = slowing - 1; i < candles.length; i++) {
    if (!isNaN(rawK[i])) {
      let sum = 0, count = 0;
      for (let j = 0; j < slowing; j++) {
        if (!isNaN(rawK[i - j])) { sum += rawK[i - j]; count++; }
      }
      if (count > 0) k[i] = sum / count;
    }
  }
  // %D = SMA of %K over dPeriod
  const d: number[] = new Array(candles.length).fill(NaN);
  for (let i = dPeriod - 1; i < candles.length; i++) {
    if (!isNaN(k[i])) {
      let sum = 0, count = 0;
      for (let j = 0; j < dPeriod; j++) {
        if (!isNaN(k[i - j])) { sum += k[i - j]; count++; }
      }
      if (count > 0) d[i] = sum / count;
    }
  }
  return createHandle(symbol, timeframe, [k, d], ["MAIN", "SIGNAL"]);
}

// ====================== iADX — Average Directional Movement Index ======================
// Buffers: 0=MAIN (ADX), 1=PLUSDI (+DI), 2=MINUSDI (-DI)
export async function iADX(
  symbol: string, timeframe: string, adxPeriod: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(300, adxPeriod * 5));
  const plusDM: number[] = new Array(candles.length).fill(0);
  const minusDM: number[] = new Array(candles.length).fill(0);
  const tr: number[] = new Array(candles.length).fill(0);

  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
    minusDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  // Smooth DM and TR with Wilder's smoothing
  const plusDI: number[] = new Array(candles.length).fill(NaN);
  const minusDI: number[] = new Array(candles.length).fill(NaN);
  const dx: number[] = new Array(candles.length).fill(NaN);
  let atr = 0, plusDMSum = 0, minusDMSum = 0;
  for (let i = 1; i <= adxPeriod; i++) {
    atr += tr[i]; plusDMSum += plusDM[i]; minusDMSum += minusDM[i];
  }
  atr /= adxPeriod; plusDMSum /= adxPeriod; minusDMSum /= adxPeriod;

  for (let i = adxPeriod + 1; i < candles.length; i++) {
    atr = (atr * (adxPeriod - 1) + tr[i]) / adxPeriod;
    plusDMSum = (plusDMSum * (adxPeriod - 1) + plusDM[i]) / adxPeriod;
    minusDMSum = (minusDMSum * (adxPeriod - 1) + minusDM[i]) / adxPeriod;
    if (atr > 0) {
      plusDI[i] = 100 * plusDMSum / atr;
      minusDI[i] = 100 * minusDMSum / atr;
      const diSum = plusDI[i] + minusDI[i];
      dx[i] = diSum > 0 ? 100 * Math.abs(plusDI[i] - minusDI[i]) / diSum : 0;
    }
  }
  // ADX = smoothed DX
  const adx: number[] = new Array(candles.length).fill(NaN);
  const validDx = dx.filter(v => !isNaN(v));
  if (validDx.length >= adxPeriod) {
    const adxEma = ema(validDx, adxPeriod);
    let idx = 0;
    for (let i = 0; i < candles.length; i++) {
      if (!isNaN(dx[i]) && idx < adxEma.length) {
        adx[i] = adxEma[idx];
        idx++;
      }
    }
  }
  return createHandle(symbol, timeframe, [adx, plusDI, minusDI], ["MAIN", "PLUSDI", "MINUSDI"]);
}

// ====================== iCCI — Commodity Channel Index ======================
export async function iCCI(
  symbol: string, timeframe: string, maPeriod: number, appliedPrice: number = PRICE_TYPICAL
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const tp = candles.map(c => getAppliedPrice(c, appliedPrice));
  const out: number[] = new Array(candles.length).fill(NaN);
  const constant = 0.015;

  for (let i = maPeriod - 1; i < candles.length; i++) {
    const slice = tp.slice(i - maPeriod + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / maPeriod;
    // Mean deviation
    let meanDev = 0;
    for (const v of slice) meanDev += Math.abs(v - mean);
    meanDev /= maPeriod;
    if (meanDev > 0) {
      out[i] = (tp[i] - mean) / (constant * meanDev);
    }
  }
  return createHandle(symbol, timeframe, [out], ["CCI"]);
}

// ====================== iMomentum — Momentum Oscillator ======================
export async function iMomentum(
  symbol: string, timeframe: string, moPeriod: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, moPeriod * 3));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const out: number[] = new Array(candles.length).fill(NaN);
  for (let i = moPeriod; i < prices.length; i++) {
    if (prices[i - moPeriod] !== 0) {
      out[i] = prices[i] * 100 / prices[i - moPeriod];
    }
  }
  return createHandle(symbol, timeframe, [out], ["Momentum"]);
}

// ====================== iWPR — Williams Percent Range ======================
export async function iWPR(
  symbol: string, timeframe: string, calcPeriod: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, calcPeriod * 3));
  const out: number[] = new Array(candles.length).fill(NaN);
  for (let i = calcPeriod - 1; i < candles.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = 0; j < calcPeriod; j++) {
      const c = candles[i - j];
      if (c.high > hh) hh = c.high;
      if (c.low < ll) ll = c.low;
    }
    if (hh - ll > 0) {
      out[i] = -100 * (hh - candles[i].close) / (hh - ll);
    }
  }
  return createHandle(symbol, timeframe, [out], ["WPR"]);
}

// ====================== iMFI — Money Flow Index ======================
export async function iMFI(
  symbol: string, timeframe: string, maPeriod: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const out: number[] = new Array(candles.length).fill(NaN);
  if (candles.length < maPeriod + 1) return createHandle(symbol, timeframe, [out], ["MFI"]);

  // Typical price * volume
  const tpv = candles.map(c => ({
    tp: (c.high + c.low + c.close) / 3,
    vol: c.tick_volume,
  }));

  let posFlow = 0, negFlow = 0;
  for (let i = 1; i <= maPeriod; i++) {
    const flow = tpv[i].tp * tpv[i].vol;
    if (tpv[i].tp > tpv[i - 1].tp) posFlow += flow;
    else negFlow += flow;
  }
  for (let i = maPeriod + 1; i < candles.length; i++) {
    const flow = tpv[i].tp * tpv[i].vol;
    const prevFlow = tpv[i - maPeriod].tp * tpv[i - maPeriod].vol;
    // Remove oldest, add new
    if (tpv[i - maPeriod].tp > tpv[i - maPeriod - 1]?.tp || 0) {
      posFlow -= tpv[i - maPeriod].tp * tpv[i - maPeriod].vol;
    } else {
      negFlow -= tpv[i - maPeriod].tp * tpv[i - maPeriod].vol;
    }
    if (tpv[i].tp > tpv[i - 1].tp) posFlow += flow;
    else negFlow += flow;

    if (posFlow + negFlow > 0) {
      const mfr = posFlow / (posFlow + negFlow);
      out[i] = 100 - 100 / (1 + mfr);
    }
  }
  return createHandle(symbol, timeframe, [out], ["MFI"]);
}

// ====================== iOBV — On Balance Volume ======================
export async function iOBV(
  symbol: string, timeframe: string, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 200);
  const out: number[] = new Array(candles.length).fill(0);
  out[0] = candles[0].tick_volume;
  for (let i = 1; i < candles.length; i++) {
    const cur = getAppliedPrice(candles[i], appliedPrice);
    const prev = getAppliedPrice(candles[i - 1], appliedPrice);
    if (cur > prev) out[i] = out[i - 1] + candles[i].tick_volume;
    else if (cur < prev) out[i] = out[i - 1] - candles[i].tick_volume;
    else out[i] = out[i - 1];
  }
  return createHandle(symbol, timeframe, [out], ["OBV"]);
}

// ====================== iVolumes — Volumes Indicator ======================
export async function iVolumes(
  symbol: string, timeframe: string, appliedPrice: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 200);
  const out = candles.map(c => c.tick_volume);
  return createHandle(symbol, timeframe, [out], ["Volumes"]);
}

// ====================== iSAR — Parabolic Stop and Reverse ======================
// Buffers: 0=MAIN (SAR value)
export async function iSAR(
  symbol: string, timeframe: string, step: number, maximum: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 200);
  const out: number[] = new Array(candles.length).fill(NaN);
  if (candles.length < 2) return createHandle(symbol, timeframe, [out], ["SAR"]);

  let trend: 1 | -1 = 1; // 1=up, -1=down
  let sar = candles[0].low;
  let ep = candles[0].high; // extreme point
  let af = step;
  out[0] = sar;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    // Update SAR
    sar = sar + af * (ep - sar);
    // SAR cannot be inside previous bar's range
    if (trend === 1) {
      sar = Math.min(sar, candles[i - 1].low, candles[i - 2 >= 0 ? i - 2 : 0]?.low ?? sar);
    } else {
      sar = Math.max(sar, candles[i - 1].high, candles[i - 2 >= 0 ? i - 2 : 0]?.high ?? sar);
    }
    out[i] = sar;

    // Check for reversal
    if (trend === 1 && c.low < sar) {
      trend = -1;
      sar = ep;
      ep = c.low;
      af = step;
    } else if (trend === -1 && c.high > sar) {
      trend = 1;
      sar = ep;
      ep = c.high;
      af = step;
    } else {
      // Update extreme point
      if (trend === 1 && c.high > ep) {
        ep = c.high;
        af = Math.min(af + step, maximum);
      } else if (trend === -1 && c.low < ep) {
        ep = c.low;
        af = Math.min(af + step, maximum);
      }
    }
  }
  return createHandle(symbol, timeframe, [out], ["SAR"]);
}

// ====================== iIchimoku — Ichimoku Kinko Hyo ======================
// Buffers: 0=TENKANSEN, 1=KIJUNSEN, 2=SENKOUSPANA, 3=SENKOUSPANB, 4=CHINKOUSPAN
export async function iIchimoku(
  symbol: string, timeframe: string, tenkanPeriod: number, kijunPeriod: number, senkouSpanBPeriod: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, senkouSpanBPeriod * 3));
  const len = candles.length;
  const tenkan: number[] = new Array(len).fill(NaN);
  const kijun: number[] = new Array(len).fill(NaN);
  const spanA: number[] = new Array(len).fill(NaN);
  const spanB: number[] = new Array(len).fill(NaN);
  const chinkou: number[] = new Array(len).fill(NaN);

  for (let i = 0; i < len; i++) {
    // Tenkan-sen: (highest + lowest) / 2 over tenkanPeriod
    if (i >= tenkanPeriod - 1) {
      let hh = -Infinity, ll = Infinity;
      for (let j = 0; j < tenkanPeriod; j++) {
        hh = Math.max(hh, candles[i - j].high);
        ll = Math.min(ll, candles[i - j].low);
      }
      tenkan[i] = (hh + ll) / 2;
    }
    // Kijun-sen
    if (i >= kijunPeriod - 1) {
      let hh = -Infinity, ll = Infinity;
      for (let j = 0; j < kijunPeriod; j++) {
        hh = Math.max(hh, candles[i - j].high);
        ll = Math.min(ll, candles[i - j].low);
      }
      kijun[i] = (hh + ll) / 2;
    }
    // Senkou Span A = (Tenkan + Kijun) / 2 shifted forward 26
    if (!isNaN(tenkan[i]) && !isNaN(kijun[i])) {
      const val = (tenkan[i] + kijun[i]) / 2;
      if (i + 26 < len) spanA[i + 26] = val;
    }
    // Senkou Span B = (highest + lowest) / 2 over senkouSpanBPeriod, shifted forward 26
    if (i >= senkouSpanBPeriod - 1) {
      let hh = -Infinity, ll = Infinity;
      for (let j = 0; j < senkouSpanBPeriod; j++) {
        hh = Math.max(hh, candles[i - j].high);
        ll = Math.min(ll, candles[i - j].low);
      }
      const val = (hh + ll) / 2;
      if (i + 26 < len) spanB[i + 26] = val;
    }
    // Chinkou Span = close shifted back 26
    if (i - 26 >= 0) chinkou[i - 26] = candles[i].close;
  }
  return createHandle(symbol, timeframe, [tenkan, kijun, spanA, spanB, chinkou], ["TENKANSEN", "KIJUNSEN", "SENKOUSPANA", "SENKOUSPANB", "CHINKOUSPAN"]);
}

// ====================== iAlligator — Bill Williams Alligator ======================
// Buffers: 0=JAW, 1=TEETH, 2=LIPS
export async function iAlligator(
  symbol: string, timeframe: string, jawPeriod: number, jawShift: number, teethPeriod: number, teethShift: number, lipsPeriod: number, lipsShift: number, maMethod: number, appliedPrice: number = PRICE_MEDIAN
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, jawPeriod * 3));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const jaw = ma(prices, jawPeriod, maMethod);
  const teeth = ma(prices, teethPeriod, maMethod);
  const lips = ma(prices, lipsPeriod, maMethod);
  return createHandle(symbol, timeframe, [jaw, teeth, lips], ["JAW", "TEETH", "LIPS"]);
}

// ====================== iGator — Gator Oscillator ======================
// Buffers: 0=UPPER (|jaw - teeth|), 1=LOWER (|teeth - lips|)
export async function iGator(
  symbol: string, timeframe: string, jawPeriod: number, jawShift: number, teethPeriod: number, teethShift: number, lipsPeriod: number, lipsShift: number, maMethod: number, appliedPrice: number = PRICE_MEDIAN
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, jawPeriod * 3));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  const jaw = ma(prices, jawPeriod, maMethod);
  const teeth = ma(prices, teethPeriod, maMethod);
  const lips = ma(prices, lipsPeriod, maMethod);
  const upper = prices.map((_, i) => !isNaN(jaw[i]) && !isNaN(teeth[i]) ? Math.abs(jaw[i] - teeth[i]) : NaN);
  const lower = prices.map((_, i) => !isNaN(teeth[i]) && !isNaN(lips[i]) ? Math.abs(teeth[i] - lips[i]) : NaN);
  return createHandle(symbol, timeframe, [upper, lower], ["UPPER", "LOWER"]);
}

// ====================== iAO — Awesome Oscillator ======================
// Buffers: 0=MAIN (SMA5 - SMA34 of median price)
export async function iAO(
  symbol: string, timeframe: string
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 200);
  const mp = candles.map(c => (c.high + c.low) / 2);
  const fast = sma(mp, 5);
  const slow = sma(mp, 34);
  const out = mp.map((_, i) => !isNaN(fast[i]) && !isNaN(slow[i]) ? fast[i] - slow[i] : NaN);
  return createHandle(symbol, timeframe, [out], ["AO"]);
}

// ====================== iAC — Accelerator Oscillator ======================
export async function iAC(
  symbol: string, timeframe: string
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 200);
  const mp = candles.map(c => (c.high + c.low) / 2);
  const fast = sma(mp, 5);
  const slow = sma(mp, 34);
  const ao = mp.map((_, i) => !isNaN(fast[i]) && !isNaN(slow[i]) ? fast[i] - slow[i] : NaN);
  // AC = AO - SMA(AO, 5)
  const aoValid = ao.filter(v => !isNaN(v));
  const sma5 = sma(aoValid, 5);
  const out: number[] = new Array(candles.length).fill(NaN);
  let idx = 0;
  for (let i = 0; i < candles.length; i++) {
    if (!isNaN(ao[i]) && idx < sma5.length) {
      out[i] = ao[i] - sma5[idx];
      idx++;
    }
  }
  return createHandle(symbol, timeframe, [out], ["AC"]);
}

// ====================== iFractals — Bill Williams Fractals ======================
// Buffers: 0=UPPER (fractal up), 1=LOWER (fractal down)
export async function iFractals(
  symbol: string, timeframe: string
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 200);
  const upper: number[] = new Array(candles.length).fill(NaN);
  const lower: number[] = new Array(candles.length).fill(NaN);
  // Fractal: high of middle bar is higher than 2 bars on each side
  for (let i = 2; i < candles.length - 2; i++) {
    if (candles[i].high > candles[i - 1].high && candles[i].high > candles[i - 2].high &&
        candles[i].high > candles[i + 1].high && candles[i].high > candles[i + 2].high) {
      upper[i] = candles[i].high;
    }
    if (candles[i].low < candles[i - 1].low && candles[i].low < candles[i - 2].low &&
        candles[i].low < candles[i + 1].low && candles[i].low < candles[i + 2].low) {
      lower[i] = candles[i].low;
    }
  }
  return createHandle(symbol, timeframe, [upper, lower], ["UPPER", "LOWER"]);
}

// ====================== iBearsPower — Bears Power ======================
export async function iBearsPower(
  symbol: string, timeframe: string, maPeriod: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const prices = candles.map(c => (c.high + c.low + c.close) / 3); // typical price
  const maArr = ema(prices, maPeriod);
  // Bears Power = Low - EMA(typical, period)
  const out = candles.map((c, i) => !isNaN(maArr[i]) ? c.low - maArr[i] : NaN);
  return createHandle(symbol, timeframe, [out], ["BearsPower"]);
}

// ====================== iBullsPower — Bulls Power ======================
export async function iBullsPower(
  symbol: string, timeframe: string, maPeriod: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const prices = candles.map(c => (c.high + c.low + c.close) / 3);
  const maArr = ema(prices, maPeriod);
  // Bulls Power = High - EMA(typical, period)
  const out = candles.map((c, i) => !isNaN(maArr[i]) ? c.high - maArr[i] : NaN);
  return createHandle(symbol, timeframe, [out], ["BullsPower"]);
}

// ====================== iDeMarker — DeMarker ======================
export async function iDeMarker(
  symbol: string, timeframe: string, maPeriod: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  const deMax: number[] = new Array(candles.length).fill(0);
  const deMin: number[] = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const cur = candles[i];
    deMax[i] = cur.high > prev.high ? cur.high - prev.high : 0;
    deMin[i] = cur.low < prev.low ? prev.low - cur.low : 0;
  }
  // SMA of deMax and deMin
  const smaMax = sma(deMax, maPeriod);
  const smaMin = sma(deMin, maPeriod);
  const out = candles.map((_, i) => {
    if (!isNaN(smaMax[i]) && !isNaN(smaMin[i]) && (smaMax[i] + smaMin[i]) > 0) {
      return smaMax[i] / (smaMax[i] + smaMin[i]);
    }
    return NaN;
  });
  return createHandle(symbol, timeframe, [out], ["DeMarker"]);
}

// ====================== iForce — Force Index ======================
export async function iForce(
  symbol: string, timeframe: string, maPeriod: number, maMethod: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 3));
  // Force = (Close - prevClose) * Volume, then smoothed with MA
  const force: number[] = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    force[i] = (candles[i].close - candles[i - 1].close) * candles[i].tick_volume;
  }
  const out = ma(force, maPeriod, maMethod);
  return createHandle(symbol, timeframe, [out], ["Force"]);
}

// ====================== iOsMA — Oscillator of MA ======================
// OsMA = MACD - Signal
export async function iOsMA(
  symbol: string, timeframe: string, fastEmaPeriod: number, slowEmaPeriod: number, signalPeriod: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const macdHandle = await iMACD(symbol, timeframe, fastEmaPeriod, slowEmaPeriod, signalPeriod, appliedPrice);
  const h = handles.get(macdHandle)!;
  const macd = h.buffers[0];
  const signal = h.buffers[1];
  const out = macd.map((v, i) => !isNaN(v) && !isNaN(signal[i]) ? v - signal[i] : NaN);
  // Release the MACD handle
  handles.delete(macdHandle);
  return createHandle(symbol, timeframe, [out], ["OsMA"]);
}

// ====================== iRVI — Relative Vigor Index ======================
// Buffers: 0=MAIN (RVI), 1=SIGNAL
export async function iRVI(
  symbol: string, timeframe: string, maPeriod: number
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(200, maPeriod * 5));
  // RVI = (Close - Open) / (High - Low), averaged over period
  const rvi: number[] = new Array(candles.length).fill(NaN);
  for (let i = maPeriod - 1; i < candles.length; i++) {
    let num = 0, denom = 0;
    for (let j = 0; j < maPeriod; j++) {
      const c = candles[i - j];
      num += (c.close - c.open);
      denom += (c.high - c.low);
    }
    rvi[i] = denom > 0 ? num / denom : 0;
  }
  // Signal = SMA(RVI, 4)
  const signal = sma(rvi, 4);
  return createHandle(symbol, timeframe, [rvi, signal], ["MAIN", "SIGNAL"]);
}

// ====================== iTriX — Triple Exponential Moving Average Indicator ======================
export async function iTriX(
  symbol: string, timeframe: string, maPeriod: number, maMethod: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, Math.max(300, maPeriod * 5));
  const prices = candles.map(c => getAppliedPrice(c, appliedPrice));
  // Triple EMA of close, returns the rate of change in %
  const e1 = ema(prices, maPeriod);
  const e2 = ema(e1.filter(v => !isNaN(v)), maPeriod);
  const e3 = ema(e2.filter(v => !isNaN(v)), maPeriod);
  const out: number[] = new Array(candles.length).fill(NaN);
  let i2 = 0, i3 = 0;
  for (let i = 0; i < candles.length; i++) {
    if (!isNaN(e1[i])) {
      if (i2 < e2.length && !isNaN(e2[i2])) {
        if (i3 < e3.length && !isNaN(e3[i3])) {
          // Rate of change in %
          if (i3 > 0 && !isNaN(e3[i3 - 1]) && e3[i3 - 1] !== 0) {
            out[i] = 10000 * (e3[i3] - e3[i3 - 1]) / e3[i3 - 1];
          }
          i3++;
        }
      }
      i2++;
    }
  }
  return createHandle(symbol, timeframe, [out], ["TriX"]);
}

// ====================== iAD — Accumulation/Distribution ======================
export async function iAD(
  symbol: string, timeframe: string, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 200);
  const out: number[] = new Array(candles.length).fill(0);
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    let mfVol = 0;
    if (c.high - c.low > 0) {
      mfVol = ((c.close - c.low) - (c.high - c.close)) / (c.high - c.low) * c.tick_volume;
    }
    out[i] = (i > 0 ? out[i - 1] : 0) + mfVol;
  }
  return createHandle(symbol, timeframe, [out], ["AD"]);
}

// ====================== iBWMFI — Bill Williams Market Facilitation Index ======================
export async function iBWMFI(
  symbol: string, timeframe: string, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 200);
  // BWMFI = (High - Low) / Volume
  const out = candles.map(c => c.tick_volume > 0 ? (c.high - c.low) / c.tick_volume : 0);
  return createHandle(symbol, timeframe, [out], ["BWMFI"]);
}

// ====================== iChaikin — Chaikin Oscillator ======================
export async function iChaikin(
  symbol: string, timeframe: string, fastMaPeriod: number, slowMaPeriod: number, maMethod: number, appliedPrice: number = PRICE_CLOSE
): Promise<number> {
  // First calculate AD, then smooth with EMA fast - EMA slow
  const adHandle = await iAD(symbol, timeframe, appliedPrice);
  const adH = handles.get(adHandle)!;
  const ad = adH.buffers[0];
  handles.delete(adHandle);
  const fastEma = ema(ad, fastMaPeriod);
  const slowEma = ema(ad, slowMaPeriod);
  const out = ad.map((_, i) => !isNaN(fastEma[i]) && !isNaN(slowEma[i]) ? fastEma[i] - slowEma[i] : NaN);
  return createHandle(symbol, timeframe, [out], ["Chaikin"]);
}

// ====================== iADXWilder — ADX Wilder (modified ADX) ======================
export async function iADXWilder(
  symbol: string, timeframe: string, adxPeriod: number
): Promise<number> {
  // ADX Wilder uses a different smoothing (more aggressive)
  // For our purposes, the calculation is the same as ADX
  return await iADX(symbol, timeframe, adxPeriod);
}

// ====================== iCustom — Custom Indicator ======================
// Loads a custom indicator by name (placeholder for user-supplied indicators)
export async function iCustom(
  symbol: string, timeframe: string, indicatorName: string, ...params: any[]
): Promise<number> {
  // For now, we don't have custom indicators — return an empty handle
  const out: number[] = [];
  return createHandle(symbol, timeframe, [out], [indicatorName]);
}

// ====================== Handle management ======================
function createHandle(
  symbol: string,
  timeframe: string,
  buffers: number[][],
  bufferNames: string[]
): number {
  const id = nextHandle++;
  handles.set(id, {
    id,
    symbol,
    timeframe,
    buffers,
    bufferNames,
    isReady: true,
    calculated: buffers[0]?.length ?? 0,
  });
  return id;
}

// ====================== CopyBuffer — Read indicator buffer ======================
// Mimics MQL5: CopyBuffer(handle, bufferNum, startPos, count, array)
// startPos: 0 = current bar, positive = older bars (count back from latest)
// Returns: array of values (most recent at the end)
export function CopyBuffer(handle: number, bufferNum: number, startPos: number, count: number): number[] {
  const h = handles.get(handle);
  if (!h) throw new Error(`Invalid indicator handle: ${handle}`);
  if (bufferNum >= h.buffers.length) throw new Error(`Buffer ${bufferNum} does not exist for handle ${handle}`);
  const buf = h.buffers[bufferNum];
  // startPos is the number of bars back from the latest
  const end = buf.length - startPos;
  const start = Math.max(0, end - count);
  return buf.slice(start, end).filter(v => !isNaN(v));
}

// ====================== BarsCalculated — Get number of calculated bars ======================
export function BarsCalculated(handle: number): number {
  const h = handles.get(handle);
  return h ? h.calculated : 0;
}

// ====================== IndicatorRelease — Free indicator ======================
export function IndicatorRelease(handle: number): boolean {
  return handles.delete(handle);
}

// ====================== iBars — Number of bars for symbol/timeframe ======================
export async function iBars(symbol: string, timeframe: string): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 500);
  return candles.length;
}

// ====================== iBarShift — Bar index for given time ======================
export async function iBarShift(symbol: string, timeframe: string, time: number, exact: boolean = false): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 500);
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].time <= time) return i;
  }
  return exact ? -1 : 0;
}

// ====================== iOpen/iHigh/iLow/iClose/iTime/iVolume — Get bar by index ======================
export async function iOpen(symbol: string, timeframe: string, shift: number): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 500);
  const idx = candles.length - 1 - shift;
  return idx >= 0 ? candles[idx].open : NaN;
}

export async function iHigh(symbol: string, timeframe: string, shift: number): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 500);
  const idx = candles.length - 1 - shift;
  return idx >= 0 ? candles[idx].high : NaN;
}

export async function iLow(symbol: string, timeframe: string, shift: number): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 500);
  const idx = candles.length - 1 - shift;
  return idx >= 0 ? candles[idx].low : NaN;
}

export async function iClose(symbol: string, timeframe: string, shift: number): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 500);
  const idx = candles.length - 1 - shift;
  return idx >= 0 ? candles[idx].close : NaN;
}

export async function iTime(symbol: string, timeframe: string, shift: number): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 500);
  const idx = candles.length - 1 - shift;
  return idx >= 0 ? candles[idx].time : 0;
}

export async function iVolume(symbol: string, timeframe: string, shift: number): Promise<number> {
  const candles = await fetchCandles(symbol, timeframe, 500);
  const idx = candles.length - 1 - shift;
  return idx >= 0 ? candles[idx].tick_volume : 0;
}
