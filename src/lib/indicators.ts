// Technical indicators + real XAUUSD candle fetcher (Yahoo GC=F + gold-api spot)
// Falls back to synthetic random walk ONLY if Binance is unreachable.

import { fetchRealCandles, type KlineInterval } from "@/lib/binance-gold";

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorSet {
  rsi: number;            // 0..100
  rsiSignal: "oversold" | "overbought" | "neutral";
  macd: number;
  macdSignal: number;
  macdHist: number;
  macdTrend: "bullish" | "bearish" | "neutral";
  williamsR: number;      // -100..0
  williamsSignal: "oversold" | "overbought" | "neutral";
  ema9: number;
  ema21: number;
  ema50: number;
  emaTrend: "bullish" | "bearish" | "neutral";
  sma20: number;
  sma50: number;
  sma200: number;
  bbUpper: number;
  bbLower: number;
  bbMiddle: number;
  atr: number;
  volume: number;
  avgVolume: number;
  volumeTrend: "high" | "normal" | "low";
  support: number;
  resistance: number;
  pivot: number;
  // Advanced indicators (added for pro features)
  vwap: number;                 // Volume-Weighted Average Price
  vwapSignal: "above" | "below" | "at";
  stochasticK: number;          // 0..100
  stochasticD: number;          // 0..100
  stochasticSignal: "oversold" | "overbought" | "neutral";
  adx: number;                   // 0..100 (trend strength)
  adxTrend: "strong" | "weak" | "neutral";
  ichimokuTenkan: number;        // 9-period conversion line
  ichimokuKijun: number;         // 26-period base line
  ichimokuSenkouA: number;       // leading span A
  ichimokuSenkouB: number;       // leading span B
  ichimokuCloud: "bullish" | "bearish" | "neutral";
  obv: number;                   // On-Balance Volume (cumulative)
  obvTrend: "bullish" | "bearish" | "neutral";
  cci: number;                   // Commodity Channel Index
  mfi: number;                   // Money Flow Index 0..100
}

/**
 * Fetch REAL OHLCV candles of XAUUSD (spot gold via Yahoo GC=F futures).
 * Falls back to synthetic generator ONLY if Binance is unreachable.
 */
export async function fetchCandles(
  interval: KlineInterval = "5m",
  limit: number = 120
): Promise<Candle[]> {
  try {
    const real = await fetchRealCandles(interval, limit);
    if (real && real.length > 0) {
      return real;
    }
  } catch (e) {
    // fall through to synthetic
  }
  // Synthetic fallback — last resort only
  return generateCandles(lastKnownRealPrice, limit);
}

// Default export — current fallback price for synthetic generator
let lastKnownRealPrice = 2650;
export function setLastKnownPrice(p: number) {
  if (Number.isFinite(p) && p > 100) lastKnownRealPrice = p;
}

// Generate realistic intraday 5-min candles ending at the current price
export function generateCandles(currentPrice: number, count = 120): Candle[] {
  const candles: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);
  // Start `count` 5-min intervals ago
  const startTime = now - count * 300;

  // We work backwards from current price to ensure the last candle closes near currentPrice
  // Build a random walk anchored to the current price for the final close
  const base = currentPrice;
  // Estimated open from `count` candles ago — drift up to ±1.5% over the session
  const sessionDrift = (Math.random() - 0.5) * 0.03;
  let price = base * (1 - sessionDrift);

  const closes: number[] = [];
  for (let i = 0; i < count; i++) {
    // Bias very slightly toward the target so the final close lands near currentPrice
    const progress = i / count;
    const target = base * (1 + (Math.sin(progress * Math.PI * 2 + Math.random() * 0.5) * 0.004));
    const meanRevert = (target - price) * 0.15;
    const noise = (Math.random() - 0.5) * base * 0.0024;
    const newPrice = Math.max(50, price + meanRevert + noise);
    closes.push(newPrice);
    price = newPrice;
  }

  // Force final close to be the currentPrice (real anchor)
  closes[closes.length - 1] = currentPrice;

  for (let i = 0; i < count; i++) {
    const c = closes[i];
    const prev = i > 0 ? closes[i - 1] : c;
    const open = i === 0 ? c * (1 - (Math.random() - 0.5) * 0.001) : prev;
    const wickUp = Math.abs(c - open) + Math.random() * base * 0.0008;
    const wickDn = Math.abs(c - open) + Math.random() * base * 0.0008;
    const high = Math.max(open, c) + wickUp;
    const low = Math.min(open, c) - wickDn;
    const baseVol = 800 + Math.random() * 2400;
    const spike = Math.abs(c - open) / (base * 0.001);
    const volume = Math.round(baseVol * (1 + spike));
    candles.push({
      time: startTime + i * 300,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(c),
      volume,
    });
  }

  return candles;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

// ---- Indicator math ----
export function sma(values: number[], period: number): number {
  if (values.length < period) return values.at(-1) ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let emaPrev = values[0];
  for (let i = 1; i < values.length; i++) {
    emaPrev = values[i] * k + emaPrev * (1 - k);
  }
  return emaPrev;
}

export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(closes: number[]): { macd: number; signal: number; hist: number } {
  const fast = emaSeries(closes, 12);
  const slow = emaSeries(closes, 26);
  const macdLine: number[] = [];
  const len = Math.min(fast.length, slow.length);
  for (let i = 0; i < len; i++) {
    macdLine.push(fast[fast.length - len + i] - slow[slow.length - len + i]);
  }
  const macdVal = macdLine.at(-1) ?? 0;
  const signalLine = ema(macdLine, 9);
  const hist = macdVal - signalLine;
  return { macd: macdVal, signal: signalLine, hist };
}

function emaSeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export function williamsR(candles: Candle[], period = 14): number {
  if (candles.length < period) return -50;
  const slice = candles.slice(-period);
  const highs = slice.map((c) => c.high);
  const lows = slice.map((c) => c.low);
  const hh = Math.max(...highs);
  const ll = Math.min(...lows);
  const close = slice.at(-1)!.close;
  if (hh === ll) return -50;
  return ((hh - close) / (hh - ll)) * -100;
}

export function bollinger(closes: number[], period = 20, mult = 2): { upper: number; lower: number; middle: number } {
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  const sd = Math.sqrt(variance);
  return {
    middle: mean,
    upper: mean + mult * sd,
    lower: mean - mult * sd,
  };
}

export function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
    trs.push(tr);
  }
  return trs.reduce((a, b) => a + b, 0) / period;
}

export function pivotPoints(prevHigh: number, prevLow: number, prevClose: number) {
  const pivot = (prevHigh + prevLow + prevClose) / 3;
  const r1 = 2 * pivot - prevLow;
  const s1 = 2 * pivot - prevHigh;
  const r2 = pivot + (prevHigh - prevLow);
  const s2 = pivot - (prevHigh - prevLow);
  return { pivot, r1, s1, r2, s2 };
}

export function computeIndicators(candles: Candle[]): IndicatorSet {
  const closes = candles.map((c) => c.close);
  const rsiVal = rsi(closes, 14);
  const macdVal = macd(closes);
  const wr = williamsR(candles, 14);
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const ema50 = ema(closes, 50);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, Math.min(200, closes.length));
  const bb = bollinger(closes, 20, 2);
  const atrVal = atr(candles, 14);
  const volumes = candles.map((c) => c.volume);
  const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const lastVol = volumes.at(-1) ?? 0;

  const pivot = pivotPoints(
    Math.max(...candles.slice(-30).map((c) => c.high)),
    Math.min(...candles.slice(-30).map((c) => c.low)),
    candles.at(-2)?.close ?? candles.at(-1)!.close
  );

  // === Advanced indicators ===
  // VWAP (Volume-Weighted Average Price) — uses typical price (H+L+C)/3
  const vwapVal = computeVWAP(candles, Math.min(60, candles.length));
  const vwapSig: "above" | "below" | "at" =
    Math.abs(closes.at(-1)! - vwapVal) / vwapVal < 0.0005
      ? "at"
      : closes.at(-1)! > vwapVal
      ? "above"
      : "below";

  // Stochastic (14,3,3)
  const stoch = computeStochastic(candles, 14, 3);
  const stochSignal: "oversold" | "overbought" | "neutral" =
    stoch.k < 20 ? "oversold" : stoch.k > 80 ? "overbought" : "neutral";

  // ADX (14) — trend strength
  const adxVal = computeADX(candles, 14);
  const adxTrend: "strong" | "weak" | "neutral" =
    adxVal > 25 ? "strong" : adxVal < 20 ? "weak" : "neutral";

  // Ichimoku Cloud (9, 26, 52)
  const ichi = computeIchimoku(candles);
  const ichiCloud: "bullish" | "bearish" | "neutral" =
    ichi.senkouA > ichi.senkouB ? "bullish" : ichi.senkouA < ichi.senkouB ? "bearish" : "neutral";

  // OBV (On-Balance Volume)
  const obvVal = computeOBV(candles);
  const obvTrend: "bullish" | "bearish" | "neutral" =
    obvVal > 0 ? "bullish" : obvVal < 0 ? "bearish" : "neutral";

  // CCI (20)
  const cciVal = computeCCI(candles, 20);

  // MFI (14)
  const mfiVal = computeMFI(candles, 14);

  return {
    rsi: round(rsiVal),
    rsiSignal:
      rsiVal < 30 ? "oversold" : rsiVal > 70 ? "overbought" : "neutral",
    macd: round(macdVal.macd),
    macdSignal: round(macdVal.signal),
    macdHist: round(macdVal.hist),
    macdTrend:
      macdVal.hist > 0 && macdVal.macd > macdVal.signal
        ? "bullish"
        : macdVal.hist < 0 && macdVal.macd < macdVal.signal
        ? "bearish"
        : "neutral",
    williamsR: round(wr),
    williamsSignal:
      wr < -80 ? "oversold" : wr > -20 ? "overbought" : "neutral",
    ema9: round(ema9),
    ema21: round(ema21),
    ema50: round(ema50),
    emaTrend:
      ema9 > ema21 && ema21 > ema50 ? "bullish" : ema9 < ema21 && ema21 < ema50 ? "bearish" : "neutral",
    sma20: round(sma20),
    sma50: round(sma50),
    sma200: round(sma200),
    bbUpper: round(bb.upper),
    bbLower: round(bb.lower),
    bbMiddle: round(bb.middle),
    atr: round(atrVal),
    volume: lastVol,
    avgVolume: round(avgVol),
    volumeTrend:
      lastVol > avgVol * 1.4 ? "high" : lastVol < avgVol * 0.7 ? "low" : "normal",
    support: round(pivot.s1),
    resistance: round(pivot.r1),
    pivot: round(pivot.pivot),
    // Advanced indicators
    vwap: round(vwapVal),
    vwapSignal: vwapSig,
    stochasticK: round(stoch.k),
    stochasticD: round(stoch.d),
    stochasticSignal: stochSignal,
    adx: round(adxVal),
    adxTrend: adxTrend,
    ichimokuTenkan: round(ichi.tenkan),
    ichimokuKijun: round(ichi.kijun),
    ichimokuSenkouA: round(ichi.senkouA),
    ichimokuSenkouB: round(ichi.senkouB),
    ichimokuCloud: ichiCloud,
    obv: round(obvVal),
    obvTrend: obvTrend,
    cci: round(cciVal),
    mfi: round(mfiVal),
  };
}

// === VWAP — Volume-Weighted Average Price ===
function computeVWAP(candles: Candle[], period: number): number {
  const slice = candles.slice(-period);
  let pvSum = 0;
  let volSum = 0;
  for (const c of slice) {
    const typical = (c.high + c.low + c.close) / 3;
    pvSum += typical * c.volume;
    volSum += c.volume;
  }
  return volSum > 0 ? pvSum / volSum : candles.at(-1)!.close;
}

// === Stochastic Oscillator (%K, %D) ===
function computeStochastic(candles: Candle[], period = 14, smoothK = 3): { k: number; d: number } {
  if (candles.length < period) return { k: 50, d: 50 };
  const ks: number[] = [];
  for (let i = candles.length - period - smoothK + 1; i < candles.length - period + 1; i++) {
    if (i < 0) continue;
    const slice = candles.slice(i, i + period);
    if (slice.length < period) continue;
    const hh = Math.max(...slice.map((c) => c.high));
    const ll = Math.min(...slice.map((c) => c.low));
    const close = slice.at(-1)!.close;
    const k = hh === ll ? 50 : ((close - ll) / (hh - ll)) * 100;
    ks.push(k);
  }
  if (ks.length === 0) return { k: 50, d: 50 };
  const k = ks.at(-1)!;
  const d = ks.slice(-smoothK).reduce((a, b) => a + b, 0) / Math.min(smoothK, ks.length);
  return { k, d };
}

// === ADX (Average Directional Index) — trend strength ===
function computeADX(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    const plusDM = up > down && up > 0 ? up : 0;
    const minusDM = down > up && down > 0 ? down : 0;
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trs.push(tr);
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }
  const slice = trs.slice(-period);
  const plusSlice = plusDMs.slice(-period);
  const minusSlice = minusDMs.slice(-period);
  const atr = slice.reduce((a, b) => a + b, 0) / period;
  if (atr === 0) return 0;
  const plusDI = (plusSlice.reduce((a, b) => a + b, 0) / period / atr) * 100;
  const minusDI = (minusSlice.reduce((a, b) => a + b, 0) / period / atr) * 100;
  const dx = plusDI + minusDI === 0 ? 0 : (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
  return dx;
}

// === Ichimoku Cloud ===
function computeIchimoku(candles: Candle[]): {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
} {
  const tenkan = (highest(candles, 9) + lowest(candles, 9)) / 2;
  const kijun = (highest(candles, 26) + lowest(candles, 26)) / 2;
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = (highest(candles, 52) + lowest(candles, 52)) / 2;
  return { tenkan, kijun, senkouA, senkouB };
}

function highest(candles: Candle[], period: number): number {
  const slice = candles.slice(-period);
  return Math.max(...slice.map((c) => c.high));
}

function lowest(candles: Candle[], period: number): number {
  const slice = candles.slice(-period);
  return Math.min(...slice.map((c) => c.low));
}

// === OBV (On-Balance Volume) ===
function computeOBV(candles: Candle[]): number {
  let obv = 0;
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    if (curr.close > prev.close) obv += curr.volume;
    else if (curr.close < prev.close) obv -= curr.volume;
    // equal: no change
  }
  return obv;
}

// === CCI (Commodity Channel Index) ===
function computeCCI(candles: Candle[], period = 20): number {
  if (candles.length < period) return 0;
  const slice = candles.slice(-period);
  const tps = slice.map((c) => (c.high + c.low + c.close) / 3);
  const sma = tps.reduce((a, b) => a + b, 0) / period;
  const meanDev =
    tps.reduce((acc, tp) => acc + Math.abs(tp - sma), 0) / period;
  if (meanDev === 0) return 0;
  const tp = tps.at(-1)!;
  return (tp - sma) / (0.015 * meanDev);
}

// === MFI (Money Flow Index) ===
function computeMFI(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 50;
  const slice = candles.slice(-(period + 1));
  const mfs: { flow: number; positive: boolean }[] = [];
  for (let i = 1; i < slice.length; i++) {
    const tp1 = (slice[i - 1].high + slice[i - 1].low + slice[i - 1].close) / 3;
    const tp2 = (slice[i].high + slice[i].low + slice[i].close) / 3;
    const mf = tp2 * slice[i].volume;
    mfs.push({ flow: mf, positive: tp2 > tp1 });
  }
  const recent = mfs.slice(-period);
  const posFlow = recent.filter((m) => m.positive).reduce((a, b) => a + b.flow, 0);
  const negFlow = recent.filter((m) => !m.positive).reduce((a, b) => a + b.flow, 0);
  if (negFlow === 0) return 100;
  const mfr = posFlow / negFlow;
  return 100 - 100 / (1 + mfr);
}
