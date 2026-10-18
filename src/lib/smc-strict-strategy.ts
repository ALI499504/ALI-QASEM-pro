// SMC/ICT Strict Strategy — Professional Smart Money Concepts
// ===========================================================
// 5 Strict Conditions (ALL must be 100% met, otherwise "no setup"):
//
// 1. HTF Trend Alignment:
//    - Daily EMA50 vs EMA200 + slope direction
//    - 4H EMA20 vs EMA50 + slope direction
//    - Both must agree (both bullish for BUY, both bearish for SELL)
//    - NEVER trade against HTF trend
//
// 2. Liquidity Sweep:
//    - For BUY: candle wicks BELOW recent swing low (sell-side liquidity) but closes back above
//    - For SELL: candle wicks ABOVE recent swing high (buy-side liquidity) but closes back below
//    - Sweep must be on 15m timeframe
//
// 3. Market Structure Shift (CHoCH) on 15m:
//    - After sweep, candle CLOSES (body, not wick) beyond the recent opposite structure
//    - For BUY: close above recent lower-high (after sweep of sell-side liquidity)
//    - For SELL: close below recent higher-low (after sweep of buy-side liquidity)
//
// 4. Entry Zone (FVG or OB):
//    - Find FVG or Order Block created by the CHoCH impulse move
//    - Bullish FVG: gap up where candle[i-1].high < candle[i+1].low
//    - Bullish OB: last bearish candle before strong bullish impulse
//    - Price must RETURN to touch the FVG/OB zone
//
// 5. Risk Management:
//    - Risk: 1% of capital
//    - R:R 1:1.3-3 (min 1.3, target 3.0)
//    - SL: 5 pips beyond local extreme (5 pips = $0.50 for gold)
//    - TP: next liquidity level (next major swing high/low)
//    - If R:R < 3 → setup invalid

import type { Candle, IndicatorSet } from "@/lib/indicators";
import { fetchRealCandles, type KlineInterval } from "@/lib/binance-gold";

export interface SMCStrictConditions {
  // 1. HTF Trend
  htfTrend: {
    passed: boolean;
    direction: "bullish" | "bearish" | "ranging";
    dailyTrend: { ema50: number; ema200: number; slope: "up" | "down" | "flat"; price: number };
    h4Trend: { ema20: number; ema50: number; slope: "up" | "down" | "flat"; price: number };
    aligned: boolean;
  };
  // 2. Liquidity Sweep
  liquiditySweep: {
    passed: boolean;
    type: "sell-side" | "buy-side" | null;
    sweepPrice: number;
    sweepTime: number;
    sweptLevel: number;
  };
  // 3. CHoCH on 15m
  choch: {
    passed: boolean;
    direction: "up" | "down" | null;
    brokenLevel: number;
    brokenTime: number;
    bodyClose: boolean;
  };
  // 4. FVG or OB
  entryZone: {
    passed: boolean;
    type: "FVG" | "OB" | null;
    zone: { top: number; bottom: number; midpoint: number } | null;
    priceReturned: boolean;
  };
  // 5. R:R 1:1.3-3 (min 1.3, target 3.0)
  riskReward: {
    passed: boolean;
    ratio: number;
    slDistance: number;
    tpDistance: number;
    nextLiquidityLevel: number | null;
  };
}

export interface SMCStrictResult {
  hasSetup: boolean;
  notSetupReason?: string;
  trade?: {
    type: "BUY" | "SELL";
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    riskPercent: number;       // 1.0
    riskAmount: number;         // $10 on $1000
    lotSize: number;
    rrRatio: number;
  };
  conditions: SMCStrictConditions;
  currentPrice: number;
  dailyCandlesCount: number;
  h4CandlesCount: number;
  m15CandlesCount: number;
  // === Visual data for chart rendering ===
  visualization: {
    m15Candles: Candle[];                                    // last 50 15m candles for mini chart
    htfDirection: "bullish" | "bearish" | "ranging";
    htfLabel: string;                                          // e.g., "Daily↑ • 4H↑"
    // All annotation levels for the mini chart
    annotations: {
      // Liquidity sweep level (the swept swing)
      sweepLevel?: number;
      sweepType?: "sell-side" | "buy-side";
      // CHoCH broken level
      chochLevel?: number;
      chochDirection?: "up" | "down";
      // FVG/OB zone
      entryZoneTop?: number;
      entryZoneBottom?: number;
      entryZoneType?: "FVG" | "OB";
      // Trade levels (if hasSetup)
      entry?: number;
      stopLoss?: number;
      takeProfit1?: number;
      takeProfit2?: number;
      takeProfit3?: number;
      // Next liquidity target
      nextLiquidityLevel?: number;
    };
  };
  timestamp: number;
}

// === Helper: EMA calculation ===
function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

// === Helper: EMA slope (last 10 candles) ===
function emaSlope(emaValues: number[]): "up" | "down" | "flat" {
  if (emaValues.length < 10) return "flat";
  const recent = emaValues.slice(-10);
  const start = recent[0];
  const end = recent[recent.length - 1];
  const change = (end - start) / start;
  if (change > 0.0005) return "up";
  if (change < -0.0005) return "down";
  return "flat";
}

// === Helper: Find swing highs/lows ===
function findSwings(candles: Candle[], lookback = 3) {
  const highs: { time: number; price: number; index: number }[] = [];
  const lows: { time: number; price: number; index: number }[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    if (candles[i].high >= Math.max(...slice.map((c) => c.high))) {
      highs.push({ time: candles[i].time, price: candles[i].high, index: i });
    }
    if (candles[i].low <= Math.min(...slice.map((c) => c.low))) {
      lows.push({ time: candles[i].time, price: candles[i].low, index: i });
    }
  }
  return { highs, lows };
}

// === 5 PIPS buffer for gold (XAUUSD) ===
// Most brokers: 1 pip on XAUUSD = $0.10, so 5 pips = $0.50
const PIP_SIZE = 0.10;
const FIVE_PIPS = PIP_SIZE * 5; // = $0.50

// === Fetch multi-timeframe candles ===
async function fetchMultiTimeframe(): Promise<{
  daily: Candle[];
  h4: Candle[];
  m15: Candle[];
}> {
  const [daily, h4, m15] = await Promise.all([
    fetchRealCandles("1d", 250),
    fetchRealCandles("4h", 250),
    fetchRealCandles("15m", 200),
  ]);
  return { daily, h4, m15 };
}

// === Main Strategy ===
// === Build visualization data for the chart ===
function buildVisualization(
  m15: Candle[],
  conditions: SMCStrictConditions,
  trade?: { entry: number; stopLoss: number; takeProfit1: number; takeProfit2: number; takeProfit3: number }
): SMCStrictResult["visualization"] {
  const last50 = m15.slice(-50);
  const dir = conditions.htfTrend.direction;
  const htfLabel = "Daily " + (conditions.htfTrend.dailyTrend.slope === "up" ? "UP" : conditions.htfTrend.dailyTrend.slope === "down" ? "DN" : "->") + " | 4H " + (conditions.htfTrend.h4Trend.slope === "up" ? "UP" : conditions.htfTrend.h4Trend.slope === "down" ? "DN" : "->");
  return {
    m15Candles: last50,
    htfDirection: dir,
    htfLabel,
    annotations: {
      sweepLevel: conditions.liquiditySweep.sweptLevel || undefined,
      sweepType: conditions.liquiditySweep.type || undefined,
      chochLevel: conditions.choch.brokenLevel || undefined,
      chochDirection: conditions.choch.direction || undefined,
      entryZoneTop: conditions.entryZone.zone?.top,
      entryZoneBottom: conditions.entryZone.zone?.bottom,
      entryZoneType: conditions.entryZone.type || undefined,
      entry: trade?.entry,
      stopLoss: trade?.stopLoss,
      takeProfit1: trade?.takeProfit1,
      takeProfit2: trade?.takeProfit2,
      takeProfit3: trade?.takeProfit3,
      nextLiquidityLevel: conditions.riskReward.nextLiquidityLevel || undefined,
    },
  };
}

export async function computeSMCStrictSignal(
  accountBalance: number = 1000
): Promise<SMCStrictResult> {
  const { daily, h4, m15 } = await fetchMultiTimeframe();

  const currentPrice = m15.at(-1)?.close ?? 0;
  const timestamp = Date.now();

  // Initialize all conditions as failed
  const conditions: SMCStrictConditions = {
    htfTrend: {
      passed: false,
      direction: "ranging",
      dailyTrend: { ema50: 0, ema200: 0, slope: "flat", price: 0 },
      h4Trend: { ema20: 0, ema50: 0, slope: "flat", price: 0 },
      aligned: false,
    },
    liquiditySweep: { passed: false, type: null, sweepPrice: 0, sweepTime: 0, sweptLevel: 0 },
    choch: { passed: false, direction: null, brokenLevel: 0, brokenTime: 0, bodyClose: false },
    entryZone: { passed: false, type: null, zone: null, priceReturned: false },
    riskReward: { passed: false, ratio: 0, slDistance: 0, tpDistance: 0, nextLiquidityLevel: null },
  };

  // === Condition 1: HTF Trend ===
  if (daily.length >= 100 && h4.length >= 50) {
    const dailyCloses = daily.map((c) => c.close);
    const h4Closes = h4.map((c) => c.close);

    const dailyEma50Arr = ema(dailyCloses, 50);
    const dailyEma100Arr = ema(dailyCloses, 100);
    const h4Ema20Arr = ema(h4Closes, 20);
    const h4Ema50Arr = ema(h4Closes, 50);

    const dailyEma50 = dailyEma50Arr.at(-1) ?? 0;
    const dailyEma100 = dailyEma100Arr.at(-1) ?? 0;
    const h4Ema20 = h4Ema20Arr.at(-1) ?? 0;
    const h4Ema50 = h4Ema50Arr.at(-1) ?? 0;
    const dailyPrice = daily.at(-1)!.close;
    const h4Price = h4.at(-1)!.close;

    const dailySlope = emaSlope(dailyEma50Arr.slice(-50));
    const h4Slope = emaSlope(h4Ema20Arr.slice(-50));

    conditions.htfTrend.dailyTrend = { ema50: dailyEma50, ema200: dailyEma100, slope: dailySlope, price: dailyPrice };
    conditions.htfTrend.h4Trend = { ema20: h4Ema20, ema50: h4Ema50, slope: h4Slope, price: h4Price };

    // Bullish HTF: price > EMA50 > EMA100 on daily AND price > EMA20 > EMA50 on 4H AND slopes up
    const dailyBullish = dailyPrice > dailyEma50 && dailyEma50 > dailyEma100 && dailySlope !== "down";
    const h4Bullish = h4Price > h4Ema20 && h4Ema20 > h4Ema50 && h4Slope !== "down";
    const dailyBearish = dailyPrice < dailyEma50 && dailyEma50 < dailyEma100 && dailySlope !== "up";
    const h4Bearish = h4Price < h4Ema20 && h4Ema20 < h4Ema50 && h4Slope !== "up";

    if (dailyBullish && h4Bullish) {
      conditions.htfTrend.direction = "bullish";
      conditions.htfTrend.aligned = true;
      conditions.htfTrend.passed = true;
    } else if (dailyBearish && h4Bearish) {
      conditions.htfTrend.direction = "bearish";
      conditions.htfTrend.aligned = true;
      conditions.htfTrend.passed = true;
    } else {
      conditions.htfTrend.direction = "ranging";
      conditions.htfTrend.aligned = false;
      conditions.htfTrend.passed = false;
    }
  }

  // If HTF trend is not aligned, fail early
  if (!conditions.htfTrend.passed) {
    return {
      hasSetup: false,
      notSetupReason: `الاتجاه العام على الفريمات الكبرى غير واضح أو متضارب (يومي: ${conditions.htfTrend.dailyTrend.slope}, 4 ساعات: ${conditions.htfTrend.h4Trend.slope}).`,
      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  const direction = conditions.htfTrend.direction; // "bullish" or "bearish"

  // === Condition 2: Liquidity Sweep on 15m ===
  // For BUY (bullish HTF): look for sell-side sweep (wick below recent swing low, close above)
  // For SELL (bearish HTF): look for buy-side sweep (wick above recent swing high, close below)
  if (m15.length >= 50) {
    const last50 = m15.slice(-50);
    const swings = findSwings(last50, 3);

    if (direction === "bullish") {
      // Find recent swing lows (sell-side liquidity targets)
      const swingLows = swings.lows;
      if (swingLows.length >= 2) {
        // The "old" swing low that price should sweep
        const sweptLow = swingLows[swingLows.length - 2]; // previous swing low
        // Look for a candle in the last 20 that wicked below this swing low but closed above
        const recentCandles = last50.slice(-20);
        for (const c of recentCandles) {
          if (c.low < sweptLow.price && c.close > sweptLow.price) {
            conditions.liquiditySweep = {
              passed: true,
              type: "sell-side",
              sweepPrice: c.low,
              sweepTime: c.time,
              sweptLevel: sweptLow.price,
            };
            break;
          }
        }
      }
    } else {
      // bearish: buy-side sweep
      const swingHighs = swings.highs;
      if (swingHighs.length >= 2) {
        const sweptHigh = swingHighs[swingHighs.length - 2];
        const recentCandles = last50.slice(-20);
        for (const c of recentCandles) {
          if (c.high > sweptHigh.price && c.close < sweptHigh.price) {
            conditions.liquiditySweep = {
              passed: true,
              type: "buy-side",
              sweepPrice: c.high,
              sweepTime: c.time,
              sweptLevel: sweptHigh.price,
            };
            break;
          }
        }
      }
    }
  }

  if (!conditions.liquiditySweep.passed) {
    return {
      hasSetup: false,
      notSetupReason:
        direction === "bullish"
          ? "لم يتم سحب سيولة بيعية (Sell-side Liquidity) واضحة على فريم 15 دقيقة (لا يوجد ضرب قاع سابق مهم)."
          : "لم يتم سحب سيولة شرائية (Buy-side Liquidity) واضحة على فريم 15 دقيقة (لا يوجد ضرب قمة سابقة مهمة).",
      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  // === Condition 3: CHoCH on 15m (body close) ===
  // For BUY: after sell-side sweep, candle must CLOSE (body) above recent lower-high
  // For SELL: after buy-side sweep, candle must CLOSE (body) below recent higher-low
  if (m15.length >= 30) {
    const sweepTime = conditions.liquiditySweep.sweepTime;
    // Find the candle that swept liquidity, then look at candles after it
    const sweepIdx = m15.findIndex((c) => c.time === sweepTime);
    if (sweepIdx >= 0 && sweepIdx < m15.length - 1) {
      const postSweepCandles = m15.slice(sweepIdx + 1);

      if (direction === "bullish") {
        // Find recent lower-highs (resistance) BEFORE the sweep
        const preSweepCandles = m15.slice(Math.max(0, sweepIdx - 30), sweepIdx);
        const preSwings = findSwings(preSweepCandles, 2);
        const lowerHighs = preSwings.highs;
        if (lowerHighs.length > 0) {
          const recentLowerHigh = lowerHighs.at(-1)!;
          // Check if any post-sweep candle CLOSES (body) above this level
          for (const c of postSweepCandles) {
            // Body close: candle close > recent lower high (real break, not just wick)
            if (c.close > recentLowerHigh.price) {
              conditions.choch = {
                passed: true,
                direction: "up",
                brokenLevel: recentLowerHigh.price,
                brokenTime: c.time,
                bodyClose: true,
              };
              break;
            }
          }
        }
      } else {
        // bearish: find higher-lows
        const preSweepCandles = m15.slice(Math.max(0, sweepIdx - 30), sweepIdx);
        const preSwings = findSwings(preSweepCandles, 2);
        const higherLows = preSwings.lows;
        if (higherLows.length > 0) {
          const recentHigherLow = higherLows.at(-1)!;
          for (const c of postSweepCandles) {
            if (c.close < recentHigherLow.price) {
              conditions.choch = {
                passed: true,
                direction: "down",
                brokenLevel: recentHigherLow.price,
                brokenTime: c.time,
                bodyClose: true,
              };
              break;
            }
          }
        }
      }
    }
  }

  if (!conditions.choch.passed) {
    return {
      hasSetup: false,
      notSetupReason:
        direction === "bullish"
          ? "لم يحدث كسر هيكل صاعد (CHoCH up) على فريم 15 دقيقة بعد السحب — لا يوجد إغلاق جسم شمعة فوق آخر قمة قاعية (Lower High)."
          : "لم يحدث كسر هيكل هابط (CHoCH down) على فريم 15 دقيقة بعد السحب — لا يوجد إغلاق جسم شمعة تحت آخر قاع صاعد (Higher Low).",
      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  // === Condition 4: FVG or OB after CHoCH ===
  // Look at the impulse move that caused the CHoCH
  // Find FVG (3-candle gap) or OB (last opposite candle before impulse)
  if (m15.length >= 5) {
    const chochTime = conditions.choch.brokenTime;
    const chochIdx = m15.findIndex((c) => c.time === chochTime);

    if (chochIdx >= 2 && chochIdx < m15.length) {
      // Look at candles around the CHoCH impulse (3 candles before + the CHoCH candle + few after)
      const startIdx = Math.max(2, chochIdx - 5);
      const endIdx = Math.min(m15.length - 1, chochIdx + 2);
      const impulseCandles = m15.slice(startIdx, endIdx + 1);

      // Detect FVG: 3-candle pattern
      // Bullish FVG: candle[i-1].high < candle[i+1].low (gap up)
      // Bearish FVG: candle[i-1].low > candle[i+1].high (gap down)
      let fvgZone: { top: number; bottom: number; midpoint: number } | null = null;
      let obZone: { top: number; bottom: number; midpoint: number } | null = null;

      for (let i = 1; i < impulseCandles.length - 1; i++) {
        const prev = impulseCandles[i - 1];
        const next = impulseCandles[i + 1];
        if (direction === "bullish" && next.low > prev.high) {
          fvgZone = {
            top: next.low,
            bottom: prev.high,
            midpoint: (next.low + prev.high) / 2,
          };
          break;
        }
        if (direction === "bearish" && next.high < prev.low) {
          fvgZone = {
            top: prev.low,
            bottom: next.high,
            midpoint: (prev.low + next.high) / 2,
          };
          break;
        }
      }

      // If no FVG, look for Order Block
      if (!fvgZone) {
        // Bullish OB: last bearish candle before the strong bullish impulse that broke structure
        // Bearish OB: last bullish candle before the strong bearish impulse
        for (let i = impulseCandles.length - 1; i >= 1; i--) {
          const c = impulseCandles[i];
          const prev = impulseCandles[i - 1];
          if (direction === "bullish" && c.close < c.open && prev.close > prev.open) {
            // c is bearish, prev is bullish — c is the OB
            obZone = {
              top: Math.max(c.open, c.close),
              bottom: Math.min(c.open, c.close),
              midpoint: (c.open + c.close) / 2,
            };
            break;
          }
          if (direction === "bearish" && c.close > c.open && prev.close < prev.open) {
            obZone = {
              top: Math.max(c.open, c.close),
              bottom: Math.min(c.open, c.close),
              midpoint: (c.open + c.close) / 2,
            };
            break;
          }
        }
      }

      const zone = fvgZone ?? obZone;
      const zoneType = fvgZone ? "FVG" : obZone ? "OB" : null;

      if (zone && zoneType) {
        // Check if price has returned to this zone
        // Price is "in zone" if currentPrice is between bottom and top (or within 0.1% of zone)
        const tolerance = currentPrice * 0.001; // 0.1%
        const priceReturned =
          (currentPrice >= zone.bottom - tolerance && currentPrice <= zone.top + tolerance) ||
          (direction === "bullish" && currentPrice >= zone.bottom && currentPrice <= zone.top + tolerance * 2) ||
          (direction === "bearish" && currentPrice <= zone.top && currentPrice >= zone.bottom - tolerance * 2);

        conditions.entryZone = {
          passed: priceReturned,
          type: zoneType,
          zone,
          priceReturned,
        };
      }
    }
  }

  if (!conditions.entryZone.passed) {
    return {
      hasSetup: false,
      notSetupReason:
        conditions.entryZone.type === null
          ? "لا توجد فجوة سعرية (FVG) أو بلوك أوامر (OB) واضح ناتج عن الكسر."
          : `السعر لم يعد بعد لمنطقة ${conditions.entryZone.type} (نطاق: $${conditions.entryZone.zone!.bottom.toFixed(2)} - $${conditions.entryZone.zone!.top.toFixed(2)}). بانتظار عودة السعر.`,
      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      timestamp,
    };
  }

  // === Condition 5. R:R 1:1.3-3 (min 1.3, target 3.0) ===
  // SL: local extreme ± 5 pips ($0.50)
  // TP: next liquidity level (next swing high for BUY, next swing low for SELL)
  // R:R = TP_distance / SL_distance must be ≥ 3

  // Find local extreme (the swept level is the local extreme)
  const localExtreme = conditions.liquiditySweep.sweptLevel;
  const slBuffer = FIVE_PIPS; // 5 pips = $0.50 for gold

  let stopLoss: number;
  let nextLiquidity: number | null = null;

  if (direction === "bullish") {
    stopLoss = localExtreme - slBuffer;
    // Find next swing high above current price (buy-side liquidity target)
    const swings = findSwings(m15.slice(-100), 3);
    const aboveSwings = swings.highs.filter((h) => h.price > currentPrice);
    if (aboveSwings.length > 0) {
      // Closest swing high above
      nextLiquidity = aboveSwings.sort((a, b) => a.price - b.price)[0].price;
    }
  } else {
    stopLoss = localExtreme + slBuffer;
    const swings = findSwings(m15.slice(-100), 3);
    const belowSwings = swings.lows.filter((l) => l.price < currentPrice);
    if (belowSwings.length > 0) {
      nextLiquidity = belowSwings.sort((a, b) => b.price - a.price)[0].price;
    }
  }

  conditions.riskReward.nextLiquidityLevel = nextLiquidity;

  if (nextLiquidity === null || nextLiquidity === 0) {
    conditions.riskReward.passed = false;
    return {
      hasSetup: false,
      notSetupReason:
        "لا توجد مستويات سيولة واضحة (أقرب قمة/قاع رئيسي) لتحديد هدف جني الأرباح.",
      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  const slDistance = Math.abs(currentPrice - stopLoss);
  const tpDistance = Math.abs(nextLiquidity - currentPrice);
  const rrRatio = slDistance > 0 ? tpDistance / slDistance : 0;

  conditions.riskReward.slDistance = slDistance;
  conditions.riskReward.tpDistance = tpDistance;
  conditions.riskReward.ratio = rrRatio;
  conditions.riskReward.passed = rrRatio >= 1.3;

  if (!conditions.riskReward.passed) {
    return {
      hasSetup: false,
      notSetupReason: `نسبة العائد إلى المخاطرة 1:${rrRatio.toFixed(2)} — أقل من 1:1.3 الحد الأدنىة. مسافة الوقف $${slDistance.toFixed(2)}، مسافة الهدف $${tpDistance.toFixed(2)}.`,
      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  // === ALL 5 CONDITIONS MET — output trade ===
  // Calculate lot size for 1% risk
  const riskAmount = accountBalance * 0.01; // $10 on $1000
  // XAUUSD: 1 lot = 100 oz, $1 price move = $100 P/L per lot
  // lotSize = riskAmount / (slDistance * 100)
  const lotSize = 0.01;

  // TP levels at 1:1, 1:2, 1:3
  const tp1Dist = slDistance * 1.0;
  const tp2Dist = slDistance * 2.0;
  const tp3Dist = slDistance * 3.0;

  const trade = {
    type: direction === "bullish" ? ("BUY" as const) : ("SELL" as const),
    entry: currentPrice,
    stopLoss,
    takeProfit1: direction === "bullish" ? currentPrice + tp1Dist : currentPrice - tp1Dist,
    takeProfit2: direction === "bullish" ? currentPrice + tp2Dist : currentPrice - tp2Dist,
    takeProfit3: direction === "bullish" ? currentPrice + tp3Dist : currentPrice - tp3Dist,
    riskPercent: 1.0,
    riskAmount,
    lotSize,
    rrRatio,
  };

  return {
    hasSetup: true,
    trade,
    conditions,
    currentPrice,
    dailyCandlesCount: daily.length,
    h4CandlesCount: h4.length,
    m15CandlesCount: m15.length,
    visualization: buildVisualization(m15, conditions, trade),
    timestamp,
  };
}
