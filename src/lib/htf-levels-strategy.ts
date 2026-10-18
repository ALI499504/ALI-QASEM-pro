// HTF Key Levels & Role Reversal Strategy
// Uses Monthly, Weekly, Daily candle Highs/Lows
// When price breaks a HTF High -> becomes support (Buy)
// When price breaks a HTF Low -> becomes resistance (Sell)
// Retest on 15m/1H + Reversal candle confirmation

import { fetchCandles, setLastKnownPrice, type Candle } from "@/lib/indicators";

export interface HTFCondition {
  id: string;
  nameAr: string;
  passed: boolean;
  details: string;
}

export interface HTFLevelSetup {
  isComplete: boolean;
  message: string;
  conditions: HTFCondition[];
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
    brokenLevel: number;
    brokenLevelType: string; // "Monthly High" or "Weekly Low" etc
    roleReversalType: string;
    triggerType: string;
  };
  analysis: {
    monthlyHigh: number;
    monthlyLow: number;
    weeklyHigh: number;
    weeklyLow: number;
    dailyHigh: number;
    dailyLow: number;
    allLevels: { price: number; label: string; type: string }[];
    nearestAbove: { price: number; label: string };
    nearestBelow: { price: number; label: string };
    currentPrice: number;
    brokenLevel: number | null;
    brokenLevelLabel: string;
    retest: { level: number; approached: boolean; closedInside: boolean } | null;
    trigger: { type: string; found: boolean } | null;
  };
  summary: string;
  timestamp: number;
}

const PIPS_5_8 = 0.70;

// Get previous candle's High/Low from a timeframe
function getPrevCandleHL(candles: Candle[]): { high: number; low: number } {
  if (candles.length < 2) return { high: 0, low: 0 };
  const prev = candles[candles.length - 2];
  return { high: prev.high, low: prev.low };
}

// Check if price broke above a level recently
function checkBreakoutAbove(candles: Candle[], level: number): { broke: boolean; idx: number; isStrong: boolean } {
  for (let i = candles.length - 1; i >= Math.max(0, candles.length - 20); i--) {
    const c = candles[i];
    if (c.close > level && c.open < level) {
      const range = c.high - c.low;
      const body = Math.abs(c.close - c.open);
      const isStrong = range > 0 && body / range > 0.6;
      // Check no candle closed back below
      let valid = true;
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j].close < level) { valid = false; break; }
      }
      if (valid) return { broke: true, idx: i, isStrong };
    }
  }
  return { broke: false, idx: -1, isStrong: false };
}

function checkBreakoutBelow(candles: Candle[], level: number): { broke: boolean; idx: number; isStrong: boolean } {
  for (let i = candles.length - 1; i >= Math.max(0, candles.length - 20); i--) {
    const c = candles[i];
    if (c.close < level && c.open > level) {
      const range = c.high - c.low;
      const body = Math.abs(c.close - c.open);
      const isStrong = range > 0 && body / range > 0.6;
      let valid = true;
      for (let j = i + 1; j < candles.length; j++) {
        if (candles[j].close > level) { valid = false; break; }
      }
      if (valid) return { broke: true, idx: i, isStrong };
    }
  }
  return { broke: false, idx: -1, isStrong: false };
}

function detectRetest(candles: Candle[], level: number, direction: "bullish" | "bearish") {
  const tolerance = level * 0.002;
  let approached = false;
  let closedInside = false;
  let count = 0;
  for (let i = candles.length - 20; i < candles.length; i++) {
    if (i < 0) continue;
    const c = candles[i];
    const near = Math.abs(c.low - level) < tolerance || Math.abs(c.high - level) < tolerance || Math.abs(c.close - level) < tolerance;
    if (near) {
      approached = true;
      count++;
      if (direction === "bullish" && c.close < level) closedInside = true;
      if (direction === "bearish" && c.close > level) closedInside = true;
    }
  }
  return { level, approached, closedInside, count };
}

function detectTrigger(candles: Candle[], level: number, direction: "bullish" | "bearish") {
  const tolerance = level * 0.003;
  const recent = candles.slice(-10);
  for (let i = recent.length - 1; i >= 1; i--) {
    const c = recent[i];
    const prev = recent[i - 1];
    const near = Math.abs(c.low - level) < tolerance || Math.abs(c.high - level) < tolerance;
    if (!near) continue;
    const range = c.high - c.low;
    if (range <= 0) continue;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const body = Math.abs(c.close - c.open);

    if (direction === "bullish" && lowerWick > range * 0.6 && body < range * 0.3)
      return { type: "Pin Bar (Hammer)", found: true };
    if (direction === "bearish" && upperWick > range * 0.6 && body < range * 0.3)
      return { type: "Pin Bar (Shooting Star)", found: true };
    if (direction === "bullish" && c.close > c.open && prev.close < prev.open && c.open <= prev.close && c.close >= prev.open)
      return { type: "Bullish Engulfing", found: true };
    if (direction === "bearish" && c.close < c.open && prev.close > prev.open && c.open >= prev.close && c.close <= prev.open)
      return { type: "Bearish Engulfing", found: true };
  }
  return { type: "none", found: false };
}

export async function detectHTFLevelsSetup(accountBalance: number = 10000): Promise<HTFLevelSetup> {
  const conditions: HTFCondition[] = [];

  try {
    const { fetchGoldPrice } = await import("@/lib/gold-price");
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
  } catch {}

  // Fetch all timeframes
  const monthlyCandles = await fetchCandles("1d", 60); // use daily as proxy for monthly (aggregate)
  const weeklyCandles = await fetchCandles("1d", 30); // daily as proxy for weekly
  const dailyCandles = await fetchCandles("1d", 10);
  const h1Candles = await fetchCandles("1h", 100);
  const m15Candles = await fetchCandles("15m", 100);

  if (dailyCandles.length < 5 || h1Candles.length < 30 || m15Candles.length < 30) {
    return build(false, "البيانات غير كافية", conditions, { monthlyHigh: 0, monthlyLow: 0, weeklyHigh: 0, weeklyLow: 0, dailyHigh: 0, dailyLow: 0, allLevels: [], nearestAbove: { price: 0, label: "" }, nearestBelow: { price: 0, label: "" }, currentPrice: 0, brokenLevel: null, brokenLevelLabel: "", retest: null, trigger: null });
  }

  // Aggregate daily into monthly and weekly
  // Monthly = last 30 daily candles
  // Weekly = last 7 daily candles
  // Previous monthly = daily candles [length-31] to [length-2] (previous month)
  // Previous weekly = daily candles [length-9] to [length-2] (previous week)
  // Previous daily = daily[length-2] (previous day)

  const prevDaily = dailyCandles[dailyCandles.length - 2];
  const dailyHigh = prevDaily.high;
  const dailyLow = prevDaily.low;

  // Previous weekly (7 days ago to 1 day ago)
  const weeklySlice = dailyCandles.slice(Math.max(0, dailyCandles.length - 9), dailyCandles.length - 1);
  const weeklyHigh = Math.max(...weeklySlice.map((c) => c.high));
  const weeklyLow = Math.min(...weeklySlice.map((c) => c.low));

  // Previous monthly (30 days ago to 1 day ago)
  const monthlySlice = dailyCandles.slice(Math.max(0, dailyCandles.length - 31), dailyCandles.length - 1);
  const monthlyHigh = Math.max(...monthlySlice.map((c) => c.high));
  const monthlyLow = Math.min(...monthlySlice.map((c) => c.low));

  const currentPrice = h1Candles.at(-1)!.close;

  // Build all levels
  const allLevels = [
    { price: monthlyHigh, label: "Monthly High", type: "resistance" },
    { price: monthlyLow, label: "Monthly Low", type: "support" },
    { price: weeklyHigh, label: "Weekly High", type: "resistance" },
    { price: weeklyLow, label: "Weekly Low", type: "support" },
    { price: dailyHigh, label: "Daily High", type: "resistance" },
    { price: dailyLow, label: "Daily Low", type: "support" },
  ].sort((a, b) => a.price - b.price);

  // Find nearest above and below
  const above = allLevels.filter((l) => l.price > currentPrice).sort((a, b) => a.price - b.price);
  const below = allLevels.filter((l) => l.price < currentPrice).sort((a, b) => b.price - a.price);
  const nearestAbove = above[0] ?? { price: currentPrice * 1.01, label: "none" };
  const nearestBelow = below[0] ?? { price: currentPrice * 0.99, label: "none" };

  // === CONDITION 1: Key HTF Levels Mapping ===
  conditions.push({
    id: "htf_levels",
    nameAr: "تحديد مستويات الفريمات الكبيرة (Monthly/Weekly/Daily High & Low)",
    passed: true,
    details: "Monthly: $" + monthlyHigh.toFixed(2) + " / $" + monthlyLow.toFixed(2) + " | Weekly: $" + weeklyHigh.toFixed(2) + " / $" + weeklyLow.toFixed(2) + " | Daily: $" + dailyHigh.toFixed(2) + " / $" + dailyLow.toFixed(2),
  });

  // === CONDITION 2: Check for breakout of any HTF level ===
  let brokenLevel: number | null = null;
  let brokenLevelLabel = "";
  let breakoutDirection: "bullish" | "bearish" = "bullish";
  let breakoutFound = false;

  // Check bullish breakouts (price broke above a High -> becomes support)
  for (const lvl of allLevels.filter((l) => l.type === "resistance")) {
    const brk = checkBreakoutAbove(h1Candles, lvl.price);
    if (brk.broke && brk.isStrong) {
      brokenLevel = lvl.price;
      brokenLevelLabel = lvl.label;
      breakoutDirection = "bullish";
      breakoutFound = true;
      break;
    }
  }

  // Check bearish breakouts (price broke below a Low -> becomes resistance)
  if (!breakoutFound) {
    for (const lvl of allLevels.filter((l) => l.type === "support")) {
      const brk = checkBreakoutBelow(h1Candles, lvl.price);
      if (brk.broke && brk.isStrong) {
        brokenLevel = lvl.price;
        brokenLevelLabel = lvl.label;
        breakoutDirection = "bearish";
        breakoutFound = true;
        break;
      }
    }
  }

  if (!breakoutFound) {
    conditions.push({ id: "breakout", nameAr: "كسر مستوى HTF رئيسي بشمعة قوية", passed: false, details: "لا يوجد كسر لمستوى Monthly/Weekly/Daily" });
    return build(false, "لا توجد صفقة قائمة، السعر يتداول بين المستويات التالية: " + nearestBelow.label + " ($" + nearestBelow.price.toFixed(2) + ") و " + nearestAbove.label + " ($" + nearestAbove.price.toFixed(2) + ")", conditions, { monthlyHigh, monthlyLow, weeklyHigh, weeklyLow, dailyHigh, dailyLow, allLevels, nearestAbove, nearestBelow, currentPrice, brokenLevel: null, brokenLevelLabel: "", retest: null, trigger: null });
  }

  const roleReversal = breakoutDirection === "bullish" ? "مقاومة -> دعم (Buy)" : "دعم -> مقاومة (Sell)";
  conditions.push({
    id: "breakout",
    nameAr: "كسر مستوى HTF رئيسي بشمعة قوية",
    passed: true,
    details: "المستوى المكسور: " + brokenLevelLabel + " ($" + brokenLevel!.toFixed(2) + ") | الاتجاه: " + (breakoutDirection === "bullish" ? "صعودي" : "هبوطي") + " | التبادل: " + roleReversal,
  });

  // === CONDITION 3: Retest on 15m/1H ===
  const retest = detectRetest(m15Candles, brokenLevel!, breakoutDirection);
  if (!retest || !retest.approached) {
    conditions.push({ id: "retest", nameAr: "إعادة اختبار المستوى المكسور على 15m/1H", passed: false, details: "السعر لم يعد لاختبار " + brokenLevelLabel + " بعد" });
    return build(false, "لا توجد صفقة قائمة، السعر يتداول بين المستويات التالية: " + nearestBelow.label + " ($" + nearestBelow.price.toFixed(2) + ") و " + nearestAbove.label + " ($" + nearestAbove.price.toFixed(2) + ")", conditions, { monthlyHigh, monthlyLow, weeklyHigh, weeklyLow, dailyHigh, dailyLow, allLevels, nearestAbove, nearestBelow, currentPrice, brokenLevel, brokenLevelLabel, retest: null, trigger: null });
  }

  if (retest.closedInside) {
    conditions.push({ id: "retest", nameAr: "إعادة اختبار المستوى المكسور على 15m/1H", passed: false, details: "السعر أغلق داخل المستوى المكسور - الكسر فاشل!" });
    return build(false, "لا توجد صفقة قائمة، السعر يتداول بين المستويات التالية: " + nearestBelow.label + " ($" + nearestBelow.price.toFixed(2) + ") و " + nearestAbove.label + " ($" + nearestAbove.price.toFixed(2) + ")", conditions, { monthlyHigh, monthlyLow, weeklyHigh, weeklyLow, dailyHigh, dailyLow, allLevels, nearestAbove, nearestBelow, currentPrice, brokenLevel, brokenLevelLabel, retest, trigger: null });
  }

  conditions.push({
    id: "retest",
    nameAr: "إعادة اختبار المستوى المكسور على 15m/1H",
    passed: true,
    details: "السعر يعود لاختبار " + brokenLevelLabel + " ($" + retest.level.toFixed(2) + ") | " + retest.count + " شمعات قريبة | لم يغلق داخل المستوى",
  });

  // === CONDITION 4: Reversal Candle Trigger ===
  const trigger = detectTrigger(m15Candles, brokenLevel!, breakoutDirection);
  if (!trigger || !trigger.found) {
    conditions.push({ id: "trigger", nameAr: "شمعة انعكاسية (Pinbar/Engulfing) عند المستوى", passed: false, details: "لم تظهر شمعة انعكاسية بعد" });
    return build(false, "لا توجد صفقة قائمة، السعر يتداول بين المستويات التالية: " + nearestBelow.label + " ($" + nearestBelow.price.toFixed(2) + ") و " + nearestAbove.label + " ($" + nearestAbove.price.toFixed(2) + ")", conditions, { monthlyHigh, monthlyLow, weeklyHigh, weeklyLow, dailyHigh, dailyLow, allLevels, nearestAbove, nearestBelow, currentPrice, brokenLevel, brokenLevelLabel, retest, trigger: null });
  }

  conditions.push({
    id: "trigger",
    nameAr: "شمعة انعكاسية (Pinbar/Engulfing) عند المستوى",
    passed: true,
    details: "النوع: " + trigger.type,
  });

  // === CONDITION 5: Risk Management ===
  const tradeType = breakoutDirection === "bullish" ? "LONG" : "SHORT";
  const entry = currentPrice;
  const lastM15 = m15Candles.at(-1)!;
  const stopLoss = tradeType === "LONG" ? lastM15.low - PIPS_5_8 : lastM15.high + PIPS_5_8;

  // TP = opposite HTF level
  const oppositeLevels = tradeType === "LONG"
    ? allLevels.filter((l) => l.price > entry).sort((a, b) => a.price - b.price)
    : allLevels.filter((l) => l.price < entry).sort((a, b) => b.price - a.price);
  const tp1 = oppositeLevels[0]?.price ?? entry * 1.01;

  const slDist = Math.abs(entry - stopLoss);
  const tpDist = Math.abs(tp1 - entry);
  const rr = slDist > 0 ? tpDist / slDist : 0;
  const rmPassed = rr >= 2.5;

  conditions.push({
    id: "risk",
    nameAr: "إدارة المخاطر (1% risk, SL 5-8 pips, R:R >= 1:2.5)",
    passed: rmPassed,
    details: "R:R = 1:" + rr.toFixed(1) + " | SL: $" + stopLoss.toFixed(2) + " | TP: $" + tp1.toFixed(2) + " (" + (oppositeLevels[0]?.label ?? "none") + ")",
  });

  if (!rmPassed) {
    return build(false, "لا توجد صفقة قائمة، نسبة المخاطرة/العائد غير كافية", conditions, { monthlyHigh, monthlyLow, weeklyHigh, weeklyLow, dailyHigh, dailyLow, allLevels, nearestAbove, nearestBelow, currentPrice, brokenLevel, brokenLevelLabel, retest, trigger });
  }

  // === ALL CONDITIONS MET ===
  const riskAmount = accountBalance * 0.01;
  const lotSize = riskAmount / slDist;
  const potentialProfit = riskAmount * rr;

  const trade: HTFLevelSetup["trade"] = {
    type: tradeType,
    typeAr: tradeType === "LONG" ? "شراء (Long) - HTF Role Reversal" : "بيع (Short) - HTF Role Reversal",
    entry,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp1 + (tradeType === "LONG" ? tpDist * 0.5 : -tpDist * 0.5),
    riskRewardRatio: rr,
    lotSize,
    riskAmount,
    potentialProfit,
    brokenLevel: brokenLevel!,
    brokenLevelType: brokenLevelLabel,
    roleReversalType: roleReversal,
    triggerType: trigger.type,
  };

  return build(true, "OK - امر تداول: " + (tradeType === "LONG" ? "شراء" : "بيع") + " HTF Role Reversal", conditions, { monthlyHigh, monthlyLow, weeklyHigh, weeklyLow, dailyHigh, dailyLow, allLevels, nearestAbove, nearestBelow, currentPrice, brokenLevel, brokenLevelLabel, retest, trigger }, trade);
}

function build(isComplete: boolean, message: string, conditions: HTFCondition[], analysis: any, trade?: HTFLevelSetup["trade"]): HTFLevelSetup {
  return {
    isComplete,
    message,
    conditions,
    trade,
    analysis,
    summary: isComplete && trade
      ? trade.typeAr + " | دخول: $" + trade.entry.toFixed(2) + " | SL: $" + trade.stopLoss.toFixed(2) + " | TP: $" + trade.takeProfit1.toFixed(2) + " | R:R 1:" + trade.riskRewardRatio.toFixed(1) + " | " + trade.brokenLevelType + " | " + trade.triggerType
      : message,
    timestamp: Date.now(),
  };
}
