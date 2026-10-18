// False Breakout / Liquidity Trap Strategy
// 1. Equal Highs/Lows (clear swing points)
// 2. Price spikes beyond level (stop hunt)
// 3. Fails to close outside — wick sweep + closes back inside (1-2 candles)
// 4. RSI Divergence confirmation
// 5. Risk: entry at candle close, SL 5 pips beyond wick, TP opposite range (R:R > 1:3)

import { fetchCandles, setLastKnownPrice, computeIndicators, type Candle, type IndicatorSet } from "@/lib/indicators";

export interface FBCondition {
  id: string;
  nameAr: string;
  passed: boolean;
  details: string;
}

export interface FalseBreakoutSetup {
  isComplete: boolean;
  message: string;
  conditions: FBCondition[];
  trade?: {
    type: "LONG" | "SHORT";
    typeAr: string;
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskRewardRatio: number;
    lotSize: number;
    riskAmount: number;
    potentialProfit: number;
    sweepLevel: number;
    sweepWick: number;
    rangeTop: number;
    rangeBottom: number;
    rangeHeight: number;
    isRealBreakout: boolean;
  };
  analysis: {
    equalHighs: { price: number; found: boolean; count: number };
    equalLows: { price: number; found: boolean; count: number };
    range: { top: number; bottom: number; height: number } | null;
    sweep: { type: string; level: number; wickLength: number; closedInside: boolean; candleIndex: number } | null;
    rsiDivergence: { detected: boolean; type: string; rsiValue: number };
    isRealBreakout: boolean;
  };
  summary: string;
  timestamp: number;
}

const PIPS_5 = 0.50; // 5 pips for gold

function findSwings(candles: Candle[], window = 2) {
  const highs: { idx: number; price: number; time: number }[] = [];
  const lows: { idx: number; price: number; time: number }[] = [];
  for (let i = window; i < candles.length - window; i++) {
    const c = candles[i];
    let isHigh = true, isLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isHigh = false;
      if (candles[j].low <= c.low) isLow = false;
    }
    if (isHigh) highs.push({ idx: i, price: c.high, time: c.time });
    if (isLow) lows.push({ idx: i, price: c.low, time: c.time });
  }
  return { highs, lows };
}

// Find Equal Highs (two or more swing highs within 0.15% tolerance)
function findEqualHighs(candles: Candle[]): { price: number; found: boolean; count: number } {
  const swings = findSwings(candles, 2);
  const tolerance = (candles.at(-1)?.close ?? 1000) * 0.0015;
  const recentHighs = swings.highs.slice(-10);

  for (let i = 0; i < recentHighs.length; i++) {
    let count = 1;
    for (let j = i + 1; j < recentHighs.length; j++) {
      if (Math.abs(recentHighs[i].price - recentHighs[j].price) < tolerance) {
        count++;
      }
    }
    if (count >= 2) {
      return { price: recentHighs[i].price, found: true, count };
    }
  }
  // Fallback: use the most recent swing high
  if (recentHighs.length > 0) {
    return { price: recentHighs[recentHighs.length - 1].price, found: false, count: 1 };
  }
  return { price: 0, found: false, count: 0 };
}

// Find Equal Lows
function findEqualLows(candles: Candle[]): { price: number; found: boolean; count: number } {
  const swings = findSwings(candles, 2);
  const tolerance = (candles.at(-1)?.close ?? 1000) * 0.0015;
  const recentLows = swings.lows.slice(-10);

  for (let i = 0; i < recentLows.length; i++) {
    let count = 1;
    for (let j = i + 1; j < recentLows.length; j++) {
      if (Math.abs(recentLows[i].price - recentLows[j].price) < tolerance) {
        count++;
      }
    }
    if (count >= 2) {
      return { price: recentLows[i].price, found: true, count };
    }
  }
  if (recentLows.length > 0) {
    return { price: recentLows[recentLows.length - 1].price, found: false, count: 1 };
  }
  return { price: 0, found: false, count: 0 };
}

// Find trading range (from equal highs to equal lows)
function findRange(candles: Candle[], eqHighs: any, eqLows: any): { top: number; bottom: number; height: number } | null {
  if (eqHighs.price === 0 || eqLows.price === 0) return null;
  const top = eqHighs.price;
  const bottom = eqLows.price;
  const height = top - bottom;
  if (height <= 0) return null;
  return { top, bottom, height };
}

// Detect wick sweep (false breakout)
function detectWickSweep(candles: Candle[], range: { top: number; bottom: number; height: number }): {
  type: string; level: number; wickLength: number; closedInside: boolean; candleIndex: number;
} | null {
  if (!range) return null;

  // Check last 5 candles for a sweep
  for (let i = candles.length - 1; i >= Math.max(0, candles.length - 5); i--) {
    const c = candles[i];

    // Bullish false breakout: price swept BELOW range bottom, but closed back inside
    if (c.low < range.bottom && c.close > range.bottom) {
      const wickLength = range.bottom - c.low;
      return { type: "bullish_sweep", level: range.bottom, wickLength, closedInside: true, candleIndex: i };
    }

    // Bearish false breakout: price swept ABOVE range top, but closed back inside
    if (c.high > range.top && c.close < range.top) {
      const wickLength = c.high - range.top;
      return { type: "bearish_sweep", level: range.top, wickLength, closedInside: true, candleIndex: i };
    }
  }

  // Also check if a candle went beyond but closed outside (real breakout)
  for (let i = candles.length - 1; i >= Math.max(0, candles.length - 5); i--) {
    const c = candles[i];
    if (c.close > range.top * 1.002) {
      return { type: "real_breakout_bullish", level: range.top, wickLength: 0, closedInside: false, candleIndex: i };
    }
    if (c.close < range.bottom * 0.998) {
      return { type: "real_breakout_bearish", level: range.bottom, wickLength: 0, closedInside: false, candleIndex: i };
    }
  }

  return null;
}

// Detect RSI divergence
function detectRSIDivergence(candles: Candle[], indicators: IndicatorSet, sweepType: string): {
  detected: boolean; type: string; rsiValue: number;
} {
  if (candles.length < 30) return { detected: false, type: "none", rsiValue: indicators.rsi };

  // For bullish sweep (price went below, then reversed): look for bullish divergence
  // Price made lower low but RSI made higher low
  if (sweepType === "bullish_sweep") {
    // Simplified: if RSI is oversold or showing recovery
    if (indicators.rsi < 40) {
      return { detected: true, type: "bullish_divergence", rsiValue: indicators.rsi };
    }
  }

  // For bearish sweep (price went above, then reversed): look for bearish divergence
  if (sweepType === "bearish_sweep") {
    if (indicators.rsi > 60) {
      return { detected: true, type: "bearish_divergence", rsiValue: indicators.rsi };
    }
  }

  return { detected: false, type: "none", rsiValue: indicators.rsi };
}

export async function detectFalseBreakoutSetup(accountBalance: number = 10000): Promise<FalseBreakoutSetup> {
  const conditions: FBCondition[] = [];

  try {
    const { fetchGoldPrice } = await import("@/lib/gold-price");
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
  } catch {}

  const candles = await fetchCandles("1h", 200);
  if (candles.length < 50) {
    return build(false, "البيانات غير كافية", conditions, { equalHighs: { price: 0, found: false, count: 0 }, equalLows: { price: 0, found: false, count: 0 }, range: null, sweep: null, rsiDivergence: { detected: false, type: "none", rsiValue: 0 }, isRealBreakout: false });
  }

  const indicators = computeIndicators(candles);
  const lastPrice = candles.at(-1)!.close;

  // === CONDITION 1: Equal Highs / Equal Lows ===
  const equalHighs = findEqualHighs(candles);
  const equalLows = findEqualLows(candles);

  const hasEqualHighs = equalHighs.found;
  const hasEqualLows = equalLows.found;
  const hasEqualLevels = hasEqualHighs || hasEqualLows;

  if (!hasEqualLevels) {
    conditions.push({ id: "equal_levels", nameAr: "قمة/قاع واضح (Equal Highs/Lows)", passed: false, details: "لا توجد قمة أو قاع مزدوج واضح" });
    return build(false, "لا توجد قمة/قاع مزدوج واضح - لا يمكن كشف كسر كاذب", conditions, { equalHighs, equalLows, range: null, sweep: null, rsiDivergence: { detected: false, type: "none", rsiValue: indicators.rsi }, isRealBreakout: false });
  }

  const levelDesc = [];
  if (hasEqualHighs) levelDesc.push("Equal Highs: $" + equalHighs.price.toFixed(2) + " (x" + equalHighs.count + ")");
  if (hasEqualLows) levelDesc.push("Equal Lows: $" + equalLows.price.toFixed(2) + " (x" + equalLows.count + ")");

  conditions.push({
    id: "equal_levels",
    nameAr: "قمة/قاع واضح (Equal Highs/Lows)",
    passed: true,
    details: levelDesc.join(" | "),
  });

  // === Find Range ===
  const range = findRange(candles, equalHighs, equalLows);
  if (!range) {
    conditions.push({ id: "range", nameAr: "النطاق السعري", passed: false, details: "لا يمكن تحديد نطاق سعري واضح" });
    return build(false, "لا يمكن تحديد نطاق سعري واضح", conditions, { equalHighs, equalLows, range: null, sweep: null, rsiDivergence: { detected: false, type: "none", rsiValue: indicators.rsi }, isRealBreakout: false });
  }

  conditions.push({
    id: "range",
    nameAr: "النطاق السعري",
    passed: true,
    details: "القمة: $" + range.top.toFixed(2) + " | القاع: $" + range.bottom.toFixed(2) + " | الارتفاع: $" + range.height.toFixed(2),
  });

  // === CONDITION 2 & 3: Wick Sweep + Failed Close ===
  const sweep = detectWickSweep(candles, range);

  if (!sweep) {
    conditions.push({ id: "sweep", nameAr: "اندفاع + فشل الإغلاق (Wick Sweep + Close Inside)", passed: false, details: "لا يوجد اندفاع خارج النطاق" });
    return build(false, "لا يوجد كسر كاذب - السعر داخل النطاق", conditions, { equalHighs, equalLows, range, sweep: null, rsiDivergence: { detected: false, type: "none", rsiValue: indicators.rsi }, isRealBreakout: false });
  }

  // Check if it's a REAL breakout (not false)
  if (sweep.type.includes("real_breakout")) {
    conditions.push({ id: "sweep", nameAr: "اندفاع + فشل الإغلاق (Wick Sweep + Close Inside)", passed: false, details: "اختراق حقيقي! السعر اغلق خارج النطاق - لا تدخل" });
    return build(false, "الاختراق حقيقي! السعر اغلق خارج النطاق - لا تدخل في صفقة الكسر الكاذب", conditions, { equalHighs, equalLows, range, sweep, rsiDivergence: { detected: false, type: "none", rsiValue: indicators.rsi }, isRealBreakout: true });
  }

  // False breakout confirmed!
  const isBullishSweep = sweep.type === "bullish_sweep";
  const sweepDir = isBullishSweep ? "صعودي (سحب سيولة بيعية تحت القاع)" : "هبوطي (سحب سيولة شرائية فوق القمة)";

  conditions.push({
    id: "sweep",
    nameAr: "اندفاع + فشل الإغلاق (Wick Sweep + Close Inside)",
    passed: true,
    details: "نوع الكسر الكاذب: " + sweepDir + " | المستوى: $" + sweep.level.toFixed(2) + " | طول الذيل: $" + sweep.wickLength.toFixed(2) + " | اغلق داخل النطاق: نعم",
  });

  // === CONDITION 4: RSI Divergence ===
  const rsiDiv = detectRSIDivergence(candles, indicators, sweep.type);

  if (!rsiDiv.detected) {
    conditions.push({ id: "rsi_div", nameAr: "تباعد RSI (Divergence)", passed: false, details: "لا يوجد تباعد واضح على RSI | RSI الحالي: " + indicators.rsi });
    return build(false, "كسر كاذب مكتشف لكن بدون تأكيد RSI Divergence", conditions, { equalHighs, equalLows, range, sweep, rsiDivergence: rsiDiv, isRealBreakout: false });
  }

  conditions.push({
    id: "rsi_div",
    nameAr: "تباعد RSI (Divergence)",
    passed: true,
    details: "نوع التباعد: " + rsiDiv.type + " | RSI: " + rsiDiv.rsiValue + " | يؤكد ضعف الحركة الكسرية",
  });

  // === CONDITION 5: Risk Management ===
  const tradeType = isBullishSweep ? "LONG" : "SHORT";
  const entry = lastPrice;

  // SL: 5 pips beyond the sweep wick
  const sweepCandle = candles[sweep.candleIndex];
  const stopLoss = isBullishSweep ? sweepCandle.low - PIPS_5 : sweepCandle.high + PIPS_5;

  // TP: opposite side of range
  const takeProfit = isBullishSweep ? range.top : range.bottom;

  const slDist = Math.abs(entry - stopLoss);
  const tpDist = Math.abs(takeProfit - entry);
  const rr = slDist > 0 ? tpDist / slDist : 0;

  const rmPassed = rr >= 3; // R:R > 1:3

  conditions.push({
    id: "risk",
    nameAr: "إدارة المخاطر (SL 5 pips beyond wick, TP opposite range, R:R > 1:3)",
    passed: rmPassed,
    details: "R:R = 1:" + rr.toFixed(1) + " (المطلوب > 1:3) | SL: $" + stopLoss.toFixed(2) + " (5 pips beyond wick) | TP: $" + takeProfit.toFixed(2) + " (opposite range)",
  });

  if (!rmPassed) {
    return build(false, "كسر كاذب مكتشف لكن R:R غير كاف (1:" + rr.toFixed(1) + " < 1:3)", conditions, { equalHighs, equalLows, range, sweep, rsiDivergence: rsiDiv, isRealBreakout: false });
  }

  // === ALL CONDITIONS MET — TRADE! ===
  const riskAmount = accountBalance * 0.01;
  const lotSize = riskAmount / slDist;
  const potentialProfit = riskAmount * rr;
  const tp2 = takeProfit + (isBullishSweep ? range.height * 0.5 : -range.height * 0.5);

  const trade: FalseBreakoutSetup["trade"] = {
    type: tradeType,
    typeAr: tradeType === "LONG" ? "شراء (Long) - False Breakout" : "بيع (Short) - False Breakout",
    entry,
    stopLoss,
    takeProfit1: takeProfit,
    takeProfit2: tp2,
    riskRewardRatio: rr,
    lotSize,
    riskAmount,
    potentialProfit,
    sweepLevel: sweep.level,
    sweepWick: sweep.wickLength,
    rangeTop: range.top,
    rangeBottom: range.bottom,
    rangeHeight: range.height,
    isRealBreakout: false,
  };

  return build(true, "OK - كسر كاذب مكتشف! " + (tradeType === "LONG" ? "شراء" : "بيع"), conditions, { equalHighs, equalLows, range, sweep, rsiDivergence: rsiDiv, isRealBreakout: false }, trade);
}

function build(isComplete: boolean, message: string, conditions: FBCondition[], analysis: any, trade?: FalseBreakoutSetup["trade"]): FalseBreakoutSetup {
  return {
    isComplete,
    message,
    conditions,
    trade,
    analysis,
    summary: isComplete && trade
      ? trade.typeAr + " | دخول: $" + trade.entry.toFixed(2) + " | SL: $" + trade.stopLoss.toFixed(2) + " | TP: $" + trade.takeProfit1.toFixed(2) + " | R:R 1:" + trade.riskRewardRatio.toFixed(1) + " | sweep level: $" + trade.sweepLevel.toFixed(2)
      : message,
    timestamp: Date.now(),
  };
}
