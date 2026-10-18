// Wyckoff Method Strategy — professional implementation
// ====================================================================
// Detects Wyckoff phases: Accumulation, Distribution, Markup, Markdown
// Entry conditions (Accumulation/Buy example):
//   1. Trading Range with Selling Climax (SC) + Ultra High Volume
//   2. Spring (false breakdown with low volume) 
//   3. Jump Across the Creek (JAC) — breakout with high volume
//   4. Last Point of Support (LPS) — retest with low volume
//   5. Risk: SL 10 pips below Spring | TP = 2x range (Measured Move)
//
// Reversed for Distribution/Sell:
//   BC → UT → FTI → LPSY

import type { Candle, IndicatorSet } from "@/lib/indicators";
import { fetchRealCandles, type KlineInterval } from "@/lib/binance-gold";

export interface WyckoffConditions {
  tradingRange: {
    passed: boolean;
    phase: "Accumulation" | "Distribution" | "Markup" | "Markdown" | "Ranging";
    rangeHigh: number;
    rangeLow: number;
    climaxType: "Selling Climax" | "Buying Climax" | null;
    climaxVolume: number;
    avgVolume: number;
  };
  spring: {
    passed: boolean;
    type: "Spring" | "Upthrust" | null;
    price: number;
    volume: number;
    isLowVolume: boolean;
  };
  jac: {
    passed: boolean;
    type: "Jump Across Creek" | "Fall Through Ice" | null;
    breakoutPrice: number;
    volume: number;
    isHighVolume: boolean;
  };
  lps: {
    passed: boolean;
    type: "Last Point of Support" | "Last Point of Supply" | null;
    retestPrice: number;
    volume: number;
    isLowVolume: boolean;
  };
  riskReward: {
    passed: boolean;
    ratio: number;
    slDistance: number;
    tpDistance: number;
    rangeSize: number;
  };
}

export interface WyckoffResult {
  hasSetup: boolean;
  notSetupReason?: string;
  trade?: {
    type: "BUY" | "SELL";
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    riskPercent: number;
    riskAmount: number;
    lotSize: number;
    rrRatio: number;
  };
  conditions: WyckoffConditions;
  phase: string;
  phaseAr: string;
  currentPrice: number;
  timestamp: number;
}

const FIVE_PIPS = 0.50;  // 5 pips for gold = $0.50
const TEN_PIPS = 1.00;  // 10 pips for gold = $1.00

function avgVol(candles: Candle[], period = 20): number {
  const slice = candles.slice(-period);
  return slice.reduce((s, c) => s + c.volume, 0) / Math.max(1, slice.length);
}

function findSwings(candles: Candle[], lookback = 3) {
  const highs: { time: number; price: number; index: number; volume: number }[] = [];
  const lows: { time: number; price: number; index: number; volume: number }[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    if (candles[i].high >= Math.max(...slice.map(c => c.high))) {
      highs.push({ time: candles[i].time, price: candles[i].high, index: i, volume: candles[i].volume });
    }
    if (candles[i].low <= Math.min(...slice.map(c => c.low))) {
      lows.push({ time: candles[i].time, price: candles[i].low, index: i, volume: candles[i].volume });
    }
  }
  return { highs, lows };
}

export async function computeWyckoffSignal(
  accountBalance: number = 1000
): Promise<WyckoffResult> {
  const candles = await fetchRealCandles("1h" as KlineInterval, 200);
  const currentPrice = candles.at(-1)?.close ?? 0;
  const timestamp = Date.now();

  const avgVolume = avgVol(candles, 30);
  const { highs, lows } = findSwings(candles, 3);

  const conditions: WyckoffConditions = {
    tradingRange: {
      passed: false,
      phase: "Ranging",
      rangeHigh: 0,
      rangeLow: 0,
      climaxType: null,
      climaxVolume: 0,
      avgVolume,
    },
    spring: { passed: false, type: null, price: 0, volume: 0, isLowVolume: false },
    jac: { passed: false, type: null, breakoutPrice: 0, volume: 0, isHighVolume: false },
    lps: { passed: false, type: null, retestPrice: 0, volume: 0, isLowVolume: false },
    riskReward: { passed: false, ratio: 0, slDistance: 0, tpDistance: 0, rangeSize: 0 },
  };

  // === Condition 1: Trading Range + Climax ===
  // Look for a selling climax (large bearish candle with ultra-high volume)
  // followed by a consolidation range
  if (candles.length >= 60 && lows.length >= 2) {
    // Find the lowest low in the last 60 candles (potential SC)
    const recentCandles = candles.slice(-60);
    const lowestLow = Math.min(...recentCandles.map(c => c.low));
    const scIndex = recentCandles.findIndex(c => c.low === lowestLow);
    const scCandle = recentCandles[scIndex];
    const scVolume = scCandle?.volume ?? 0;
    const isSC = scCandle && scCandle.close < scCandle.open && scVolume > avgVolume * 2;

    // Find the highest high (potential BC for distribution)
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    const bcIndex = recentCandles.findIndex(c => c.high === highestHigh);
    const bcCandle = recentCandles[bcIndex];
    const bcVolume = bcCandle?.volume ?? 0;
    const isBC = bcCandle && bcCandle.close > bcCandle.open && bcVolume > avgVolume * 2;

    // Define the trading range
    const rangeHigh = Math.max(...recentCandles.slice(-30).map(c => c.high));
    const rangeLow = Math.min(...recentCandles.slice(-30).map(c => c.low));
    const rangeSize = rangeHigh - rangeLow;

    if (isSC && rangeSize < currentPrice * 0.02) {
      // Accumulation phase
      conditions.tradingRange = {
        passed: true,
        phase: "Accumulation",
        rangeHigh,
        rangeLow,
        climaxType: "Selling Climax",
        climaxVolume: scVolume,
        avgVolume,
      };
    } else if (isBC && rangeSize < currentPrice * 0.02) {
      // Distribution phase
      conditions.tradingRange = {
        passed: true,
        phase: "Distribution",
        rangeHigh,
        rangeLow,
        climaxType: "Buying Climax",
        climaxVolume: bcVolume,
        avgVolume,
      };
    } else if (rangeSize < currentPrice * 0.015) {
      conditions.tradingRange = {
        passed: false,
        phase: "Ranging",
        rangeHigh,
        rangeLow,
        climaxType: null,
        climaxVolume: 0,
        avgVolume,
      };
    } else {
      // Check if trending
      const emaClose = candles.slice(-10).map(c => c.close);
      const trending = emaClose[0] < emaClose[emaClose.length - 1] ? "Markup" : "Markdown";
      conditions.tradingRange = {
        passed: false,
        phase: trending as any,
        rangeHigh,
        rangeLow,
        climaxType: null,
        climaxVolume: 0,
        avgVolume,
      };
    }
  }

  const phase = conditions.tradingRange.phase;
  const isAccumulation = phase === "Accumulation";
  const isDistribution = phase === "Distribution";

  // === Condition 2: Spring / Upthrust ===
  if (conditions.tradingRange.passed) {
    const range = conditions.tradingRange;
    const recent20 = candles.slice(-20);
    
    if (isAccumulation) {
      // Spring: false breakdown below rangeLow with LOW volume, then close back inside range
      for (const c of recent20) {
        if (c.low < range.rangeLow && c.close > range.rangeLow && c.volume < avgVolume * 0.7) {
          conditions.spring = {
            passed: true,
            type: "Spring",
            price: c.low,
            volume: c.volume,
            isLowVolume: true,
          };
          break;
        }
      }
    } else if (isDistribution) {
      // Upthrust: false breakout above rangeHigh with LOW volume, then close back inside range
      for (const c of recent20) {
        if (c.high > range.rangeHigh && c.close < range.rangeHigh && c.volume < avgVolume * 0.7) {
          conditions.spring = {
            passed: true,
            type: "Upthrust",
            price: c.high,
            volume: c.volume,
            isLowVolume: true,
          };
          break;
        }
      }
    }
  }

  // === Condition 3: JAC / FTI ===
  if (conditions.spring.passed) {
    const range = conditions.tradingRange;
    const recent10 = candles.slice(-10);
    
    if (isAccumulation) {
      // JAC: breakout above rangeHigh with HIGH volume
      for (const c of recent10) {
        if (c.close > range.rangeHigh && c.volume > avgVolume * 1.5) {
          conditions.jac = {
            passed: true,
            type: "Jump Across Creek",
            breakoutPrice: range.rangeHigh,
            volume: c.volume,
            isHighVolume: true,
          };
          break;
        }
      }
    } else if (isDistribution) {
      // FTI: breakdown below rangeLow with HIGH volume
      for (const c of recent10) {
        if (c.close < range.rangeLow && c.volume > avgVolume * 1.5) {
          conditions.jac = {
            passed: true,
            type: "Fall Through Ice",
            breakoutPrice: range.rangeLow,
            volume: c.volume,
            isHighVolume: true,
          };
          break;
        }
      }
    }
  }

  // === Condition 4: LPS / LPSY ===
  if (conditions.jac.passed) {
    const range = conditions.tradingRange;
    const recent5 = candles.slice(-5);
    const breakout = conditions.jac.breakoutPrice;
    
    if (isAccumulation) {
      // LPS: price retests the breakout level (rangeHigh) with LOW volume
      for (const c of recent5) {
        if (Math.abs(c.low - breakout) < currentPrice * 0.002 && c.volume < avgVolume * 0.8) {
          conditions.lps = {
            passed: true,
            type: "Last Point of Support",
            retestPrice: c.low,
            volume: c.volume,
            isLowVolume: true,
          };
          break;
        }
      }
    } else if (isDistribution) {
      // LPSY: price retests the breakout level (rangeLow) with LOW volume
      for (const c of recent5) {
        if (Math.abs(c.high - breakout) < currentPrice * 0.002 && c.volume < avgVolume * 0.8) {
          conditions.lps = {
            passed: true,
            type: "Last Point of Supply",
            retestPrice: c.high,
            volume: c.volume,
            isLowVolume: true,
          };
          break;
        }
      }
    }
  }

  // === Condition 5: Risk Reward ===
  const range = conditions.tradingRange;
  const rangeSize = range.rangeHigh - range.rangeLow;
  
  if (conditions.lps.passed && rangeSize > 0) {
    const springPrice = conditions.spring.price;
    const slDistance = TEN_PIPS; // 10 pips below Spring
    const sl = isAccumulation ? springPrice - slDistance : springPrice + slDistance;
    const tpDistance = rangeSize * 2; // Measured Move = 2x range
    const tp1 = isAccumulation ? currentPrice + rangeSize : currentPrice - rangeSize;
    const tp2 = isAccumulation ? currentPrice + rangeSize * 1.5 : currentPrice - rangeSize * 1.5;
    const tp3 = isAccumulation ? currentPrice + tpDistance : currentPrice - tpDistance;
    const rrRatio = Math.abs(tp1 - currentPrice) / Math.abs(sl - currentPrice);

    conditions.riskReward = {
      passed: rrRatio >= 1.3,
      ratio: rrRatio,
      slDistance: Math.abs(sl - currentPrice),
      tpDistance: Math.abs(tp1 - currentPrice),
      rangeSize,
    };

    if (conditions.riskReward.passed) {
      const riskAmount = accountBalance * 0.01; // 1% (range 0.5-1.5%)
      const lotSize = 0.01;
      
      return {
        hasSetup: true,
        trade: {
          type: isAccumulation ? "BUY" : "SELL",
          entry: currentPrice,
          stopLoss: sl,
          takeProfit1: tp1,
          takeProfit2: tp2,
          takeProfit3: tp3,
          riskPercent: 1.0, // 1% (range 0.5-1.5%)
          riskAmount,
          lotSize,
          rrRatio,
        },
        conditions,
        phase,
        phaseAr: phase === "Accumulation" ? "التجميع" : phase === "Distribution" ? "التوزيع" : phase === "Markup" ? "الصعود" : phase === "Markdown" ? "الهبوط" : "تذبذب",
        currentPrice,
        timestamp,
      };
    }
  }

  // Not complete — determine reason
  let reason = "";
  const phaseAr = phase === "Accumulation" ? "التجميع" : phase === "Distribution" ? "التوزيع" : phase === "Markup" ? "الصعود" : phase === "Markdown" ? "الهبوط" : "تذبذب";
  
  if (!conditions.tradingRange.passed) {
    reason = `السوق في مرحلة ${phaseAr} ولم تصل إشارة الدخول بعد — لم يتم رصد نطاق تجميع/توزيع مع Climax واضح.`;
  } else if (!conditions.spring.passed) {
    reason = `السوق في مرحلة ${phaseAr} ولم تصل إشارة الدخول بعد — لم يتم رصد ${isAccumulation ? "Spring (كسر وهمي بفوليوم منخفض)" : "Upthrust (اختراق وهمي بفوليوم منخفض)"}.`;
  } else if (!conditions.jac.passed) {
    reason = `السوق في مرحلة ${phaseAr} ولم تصل إشارة الدخول بعد — ${isAccumulation ? "لم يتم JAC (اختراق الكريك بفوليوم عالي)" : "لم يتم FTI (كسر الجليد بفوليوم عالي)"}.`;
  } else if (!conditions.lps.passed) {
    reason = `السوق في مرحلة ${phaseAr} ولم تصل إشارة الدخول بعد — ${isAccumulation ? "لم يتم LPS (إعادة اختبار الكريك بفوليوم منخفض)" : "لم يتم LPSY (إعادة اختبار الجليد بفوليوم منخفض)"}.`;
  } else if (!conditions.riskReward.passed) {
    reason = `السوق في مرحلة ${phaseAr} — اكتملت الشروط لكن R:R 1:${conditions.riskReward.ratio.toFixed(2)} أقل من 1:1.3 الحد الأدنى.`;
  } else {
    reason = `السوق في مرحلة ${phaseAr} ولم تصل إشارة الدخول بعد.`;
  }

  return {
    hasSetup: false,
    notSetupReason: reason,
    conditions,
    phase,
    phaseAr,
    currentPrice,
    timestamp,
  };
}
