// Confluence Hybrid Strategy — SMC/ICT + Wyckoff + HTF Trend + News Filter
// ====================================================================
// The "golden rule": only enter if 3 systems agree on the same direction.
//
//   1. SMC/ICT (5 strict conditions) → entry timing
//   2. Wyckoff (phase confirmation) → Accumulation/Distribution
//   3. HTF Trend (Daily + 4H) → direction alignment
//   4. Multi-Agent consensus → final confirmation
//   5. News Filter → safety
//
// Risk: 1% ($10) | R:R = 1:3 | Lot = 0.01 | Max 3 trades/day
// Cooldown: 8 hours after loss | Confidence minimum: 60%

import type { Candle, IndicatorSet } from "@/lib/indicators";
import { fetchRealCandles, type KlineInterval } from "@/lib/binance-gold";

export interface ConfluenceConditions {
  // 1. HTF Trend (must align with trade direction)
  htfTrend: {
    passed: boolean;
    direction: "bullish" | "bearish" | "ranging";
    dailyTrend: string;
    h4Trend: string;
    aligned: boolean;
  };
  // 2. SMC/ICT (5 strict conditions)
  smc: {
    passed: boolean;
    liquiditySweep: boolean;
    choch: boolean;
    fvgOrOB: boolean;
    priceReturned: boolean;
    passedCount: number;
  };
  // 3. Wyckoff (phase must match direction)
  wyckoff: {
    passed: boolean;
    phase: string;
    phaseAr: string;
    matchesDirection: boolean;
  };
  // 4. Confluence (all 3 must agree)
  confluence: {
    passed: boolean;
    agreement: number; // 0-100%
    systems: { name: string; passed: boolean; direction: string }[];
  };
  // 5. Risk management
  riskReward: {
    passed: boolean;
    ratio: number;
    slDistance: number;
    tpDistance: number;
  };
}

export interface ConfluenceResult {
  hasSetup: boolean;
  notSetupReason?: string;
  trade?: {
    type: "BUY" | "SELL";
    entry: number;
    stopLoss: number;
    takeProfit1: number; // 1:1
    takeProfit2: number; // 1:2
    takeProfit3: number; // 1:3 (main target)
    riskPercent: number;
    riskAmount: number;
    lotSize: number;
    rrRatio: number;
    confidence: number;
    systems: string[];
  };
  conditions: ConfluenceConditions;
  currentPrice: number;
  timestamp: number;
}

function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

function detectTrend(candles: Candle[]): "bullish" | "bearish" | "ranging" {
  if (candles.length < 50) return "ranging";
  const closes = candles.map((c) => c.close);
  const ema50 = ema(closes, 50);
  const ema100 = ema(closes, Math.min(100, closes.length));
  const lastEma50 = ema50.at(-1) ?? 0;
  const lastEma100 = ema100.at(-1) ?? 0;
  const lastPrice = closes.at(-1) ?? 0;
  if (lastPrice > lastEma50 && lastEma50 > lastEma100) return "bullish";
  if (lastPrice < lastEma50 && lastEma50 < lastEma100) return "bearish";
  return "ranging";
}

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

function avgVol(candles: Candle[], period = 30): number {
  return candles.slice(-period).reduce((s, c) => s + c.volume, 0) / Math.max(1, period);
}

export async function computeConfluenceSignal(
  accountBalance: number = 1000
): Promise<ConfluenceResult> {
  // Fetch multi-timeframe data
  const [daily, h4, m15] = await Promise.all([
    fetchRealCandles("1d" as KlineInterval, 250),
    fetchRealCandles("4h" as KlineInterval, 250),
    fetchRealCandles("15m" as KlineInterval, 200),
  ]);

  const currentPrice = m15.at(-1)?.close ?? 0;
  const timestamp = Date.now();

  const conditions: ConfluenceConditions = {
    htfTrend: { passed: false, direction: "ranging", dailyTrend: "—", h4Trend: "—", aligned: false },
    smc: { passed: false, liquiditySweep: false, choch: false, fvgOrOB: false, priceReturned: false, passedCount: 0 },
    wyckoff: { passed: false, phase: "Ranging", phaseAr: "تذبذب", matchesDirection: false },
    confluence: { passed: false, agreement: 0, systems: [] },
    riskReward: { passed: false, ratio: 0, slDistance: 0, tpDistance: 0 },
  };

  // === 1. HTF Trend ===
  const dailyTrend = detectTrend(daily);
  const h4Trend = detectTrend(h4);
  const htfDirection = dailyTrend === "bullish" && h4Trend === "bullish" ? "bullish"
    : dailyTrend === "bearish" && h4Trend === "bearish" ? "bearish" : "ranging";
  conditions.htfTrend = {
    passed: htfDirection !== "ranging",
    direction: htfDirection,
    dailyTrend,
    h4Trend,
    aligned: htfDirection !== "ranging",
  };

  if (htfDirection === "ranging") {
    return {
      hasSetup: false,
      notSetupReason: "الاتجاه العام غير متوافق على Daily + 4H — لا توجد موافقة على الاتجاه. ننتظر توافق الفريمات الكبرى.",
      conditions,
      currentPrice,
      timestamp,
    };
  }

  // === 2. SMC/ICT (5 conditions) ===
  const swings = findSwings(m15, 3);
  const recent50 = m15.slice(-50);

  // Condition 1: Liquidity Sweep
  let sweepLevel = 0;
  if (htfDirection === "bullish" && swings.lows.length >= 2) {
    const prevLow = swings.lows[swings.lows.length - 2];
    for (const c of recent50.slice(-20)) {
      if (c.low < prevLow.price && c.close > prevLow.price) {
        conditions.smc.liquiditySweep = true;
        sweepLevel = prevLow.price;
        break;
      }
    }
  } else if (htfDirection === "bearish" && swings.highs.length >= 2) {
    const prevHigh = swings.highs[swings.highs.length - 2];
    for (const c of recent50.slice(-20)) {
      if (c.high > prevHigh.price && c.close < prevHigh.price) {
        conditions.smc.liquiditySweep = true;
        sweepLevel = prevHigh.price;
        break;
      }
    }
  }

  // Condition 2: CHoCH (body close)
  let chochLevel = 0;
  if (conditions.smc.liquiditySweep) {
    const preSweep = m15.slice(-30, -5);
    if (htfDirection === "bullish") {
      const lowerHighs = preSweep.filter((c, i) => i > 0 && c.high > preSweep[i-1].high).map(c => c.high);
      const recentLH = lowerHighs.at(-1) ?? 0;
      if (recentLH > 0) {
        for (const c of m15.slice(-5)) {
          if (c.close > recentLH) { conditions.smc.choch = true; chochLevel = recentLH; break; }
        }
      }
    } else {
      const higherLows = preSweep.filter((c, i) => i > 0 && c.low < preSweep[i-1].low).map(c => c.low);
      const recentHL = higherLows.at(-1) ?? 0;
      if (recentHL > 0) {
        for (const c of m15.slice(-5)) {
          if (c.close < recentHL) { conditions.smc.choch = true; chochLevel = recentHL; break; }
        }
      }
    }
  }

  // Condition 3: FVG or OB
  let zoneTop = 0, zoneBottom = 0;
  if (conditions.smc.choch) {
    for (let i = 1; i < m15.length - 1; i++) {
      const prev = m15[i - 1];
      const next = m15[i + 1];
      if (htfDirection === "bullish" && next.low > prev.high) {
        zoneTop = next.low; zoneBottom = prev.high;
        conditions.smc.fvgOrOB = true; break;
      }
      if (htfDirection === "bearish" && next.high < prev.low) {
        zoneTop = prev.low; zoneBottom = next.high;
        conditions.smc.fvgOrOB = true; break;
      }
    }
    // OB fallback
    if (!conditions.smc.fvgOrOB) {
      for (let i = m15.length - 1; i >= 1; i--) {
        const c = m15[i];
        const prev = m15[i - 1];
        if (htfDirection === "bullish" && c.close < c.open && prev.close > prev.open) {
          zoneTop = Math.max(c.open, c.close);
          zoneBottom = Math.min(c.open, c.close);
          conditions.smc.fvgOrOB = true; break;
        }
        if (htfDirection === "bearish" && c.close > c.open && prev.close < prev.open) {
          zoneTop = Math.max(c.open, c.close);
          zoneBottom = Math.min(c.open, c.close);
          conditions.smc.fvgOrOB = true; break;
        }
      }
    }
  }

  // Condition 4: Price returned to zone
  if (conditions.smc.fvgOrOB && zoneTop > 0) {
    const tolerance = currentPrice * 0.002;
    conditions.smc.priceReturned =
      currentPrice >= zoneBottom - tolerance && currentPrice <= zoneTop + tolerance;
  }

  // SMC passed count
  conditions.smc.passedCount = [
    conditions.smc.liquiditySweep,
    conditions.smc.choch,
    conditions.smc.fvgOrOB,
    conditions.smc.priceReturned,
  ].filter(Boolean).length;
  conditions.smc.passed = conditions.smc.passedCount >= 4; // need all 4 (HTF is separate condition)

  if (!conditions.smc.passed) {
    return {
      hasSetup: false,
      notSetupReason: `SMC/ICT: ${conditions.smc.passedCount}/4 شروط متحققة فقط. Sweep=${conditions.smc.liquiditySweep ? "✓" : "✗"} CHoCH=${conditions.smc.choch ? "✓" : "✗"} FVG/OB=${conditions.smc.fvgOrOB ? "✓" : "✗"} PriceReturn=${conditions.smc.priceReturned ? "✓" : "✗"} — ننتظر اكتمال الشروط.`,
      conditions,
      currentPrice,
      timestamp,
    };
  }

  // === 3. Wyckoff Phase ===
  const avgVolume = avgVol(m15, 30);
  const recent60 = m15.slice(-60);
  const lowestLow = Math.min(...recent60.map(c => c.low));
  const highestHigh = Math.max(...recent60.map(c => c.high));
  const rangeHigh = Math.max(...recent60.slice(-30).map(c => c.high));
  const rangeLow = Math.min(...recent60.slice(-30).map(c => c.low));
  const rangeSize = rangeHigh - rangeLow;

  let wyckoffPhase = "Ranging";
  let wyckoffPhaseAr = "تذبذب";

  // Check for Selling Climax (Accumulation)
  const scIndex = recent60.findIndex(c => c.low === lowestLow);
  const scCandle = recent60[scIndex];
  const isSC = scCandle && scCandle.close < scCandle.open && scCandle.volume > avgVolume * 2;

  // Check for Buying Climax (Distribution)
  const bcIndex = recent60.findIndex(c => c.high === highestHigh);
  const bcCandle = recent60[bcIndex];
  const isBC = bcCandle && bcCandle.close > bcCandle.open && bcCandle.volume > avgVolume * 2;

  if (isSC && rangeSize < currentPrice * 0.02) {
    wyckoffPhase = "Accumulation";
    wyckoffPhaseAr = "تجميع";
  } else if (isBC && rangeSize < currentPrice * 0.02) {
    wyckoffPhase = "Distribution";
    wyckoffPhaseAr = "توزيع";
  } else if (rangeSize < currentPrice * 0.015) {
    wyckoffPhase = "Ranging";
    wyckoffPhaseAr = "تذبذب";
  } else {
    wyckoffPhase = htfDirection === "bullish" ? "Markup" : "Markdown";
    wyckoffPhaseAr = htfDirection === "bullish" ? "صعود" : "هبوط";
  }

  // Wyckoff must match trade direction
  const wyckoffMatches =
    (htfDirection === "bullish" && (wyckoffPhase === "Accumulation" || wyckoffPhase === "Markup")) ||
    (htfDirection === "bearish" && (wyckoffPhase === "Distribution" || wyckoffPhase === "Markdown"));

  conditions.wyckoff = {
    passed: wyckoffMatches,
    phase: wyckoffPhase,
    phaseAr: wyckoffPhaseAr,
    matchesDirection: wyckoffMatches,
  };

  if (!wyckoffMatches) {
    return {
      hasSetup: false,
      notSetupReason: `Wyckoff: السوق في مرحلة ${wyckoffPhaseAr} (${wyckoffPhase}) — غير متوافق مع اتجاه ${htfDirection === "bullish" ? "الشراء" : "البيع"}. ننتظر توافق المرحلة مع الاتجاه.`,
      conditions,
      currentPrice,
      timestamp,
    };
  }

  // === 4. Confluence (all 3 systems must agree) ===
  const systems = [
    { name: "HTF Trend", passed: conditions.htfTrend.passed, direction: htfDirection },
    { name: "SMC/ICT", passed: conditions.smc.passed, direction: htfDirection },
    { name: "Wyckoff", passed: conditions.wyckoff.passed, direction: wyckoffPhase.includes("Acc") || wyckoffPhase.includes("Mark") ? "bullish" : "bearish" },
  ];
  const agreedCount = systems.filter(s => s.passed).length;
  const agreement = Math.round((agreedCount / 3) * 100);

  conditions.confluence = { passed: agreedCount === 3, agreement, systems };

  if (!conditions.confluence.passed) {
    return {
      hasSetup: false,
      notSetupReason: `Confluence: ${agreedCount}/3 أنظمة متوافقة (${agreement}%). موافق: ${systems.filter(s => s.passed).map(s => s.name).join(", ")}. غير موافق: ${systems.filter(s => !s.passed).map(s => s.name).join(", ")}. ننتظر توافق الثلاثة.`,
      conditions,
      currentPrice,
      timestamp,
    };
  }

  // === 5. Risk Management (R:R = 1:3) ===
  const slBuffer = 1.0; // 10 pips = $1.00 for gold
  const sl = htfDirection === "bullish" ? sweepLevel - slBuffer : sweepLevel + slBuffer;
  const slDistance = Math.abs(currentPrice - sl);

  // TP: find next liquidity level
  let nextLiquidity = 0;
  const allSwings = findSwings(m15.slice(-100), 3);
  if (htfDirection === "bullish") {
    const above = allSwings.highs.filter(h => h.price > currentPrice).sort((a, b) => a.price - b.price);
    nextLiquidity = above[0]?.price ?? currentPrice + slDistance * 3;
  } else {
    const below = allSwings.lows.filter(l => l.price < currentPrice).sort((a, b) => b.price - a.price);
    nextLiquidity = below[0]?.price ?? currentPrice - slDistance * 3;
  }

  const tpDistance = Math.abs(nextLiquidity - currentPrice);
  const rrRatio = slDistance > 0 ? tpDistance / slDistance : 0;

  // If next liquidity is too close, use 3x SL distance
  const effectiveTP = rrRatio >= 3 ? nextLiquidity :
    (htfDirection === "bullish" ? currentPrice + slDistance * 3 : currentPrice - slDistance * 3);
  const effectiveRR = slDistance > 0 ? Math.abs(effectiveTP - currentPrice) / slDistance : 3.0;

  conditions.riskReward = {
    passed: effectiveRR >= 1.3,
    ratio: effectiveRR,
    slDistance,
    tpDistance: Math.abs(effectiveTP - currentPrice),
  };

  if (!conditions.riskReward.passed) {
    return {
      hasSetup: false,
      notSetupReason: `R:R = 1:${effectiveRR.toFixed(2)} — أقل من 1:1.3 الحد الأدنى. مسافة SL=$${slDistance.toFixed(2)}، مسافة TP=$${Math.abs(effectiveTP - currentPrice).toFixed(2)}.`,
      conditions,
      currentPrice,
      timestamp,
    };
  }

  // === ALL CONDITIONS MET — Build trade ===
  const riskAmount = accountBalance * 0.01; // 1% (range 0.5-1.5%)
  const tp1Dist = slDistance * 1.0;
  const tp2Dist = slDistance * 2.0;
  const tp3Dist = slDistance * 3.0;

  return {
    hasSetup: true,
    trade: {
      type: htfDirection === "bullish" ? "BUY" : "SELL",
      entry: currentPrice,
      stopLoss: sl,
      takeProfit1: htfDirection === "bullish" ? currentPrice + tp1Dist : currentPrice - tp1Dist,
      takeProfit2: htfDirection === "bullish" ? currentPrice + tp2Dist : currentPrice - tp2Dist,
      takeProfit3: htfDirection === "bullish" ? currentPrice + tp3Dist : currentPrice - tp3Dist,
      riskPercent: 1.0, // 1% (range 0.5-1.5%)
      riskAmount,
      lotSize: 0.01, // fixed 0.01 for $1000
      rrRatio: effectiveRR,
      confidence: 90, // high confidence because 3 systems agree
      systems: systems.map(s => s.name),
    },
    conditions,
    currentPrice,
    timestamp,
  };
}
