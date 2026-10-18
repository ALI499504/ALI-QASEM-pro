// Price Action Role Reversal Strategy
// 1. Key S/R level (tested >= 2x on 1H)
// 2. Breakout (Marubozu/Momentum candle closes clearly outside)
// 3. Retest (price returns slowly to broken level = role reversal)
// 4. Trigger (Pin Bar/Hammer or Bullish Engulfing on 15m at retest)
// 5. Risk (entry at candle close, SL 5-8 pips below reversal tail, R:R >= 1:2.5)

import { fetchCandles, setLastKnownPrice, type Candle } from "@/lib/indicators";

export interface RRCondition {
  id: string;
  nameAr: string;
  passed: boolean;
  details: string;
}

export interface RoleReversalSetup {
  isComplete: boolean;
  message: string;
  conditions: RRCondition[];
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
    roleReversalType: string; // "Resistance -> Support" or "Support -> Resistance"
    triggerType: string; // "Pin Bar" or "Bullish Engulfing"
    marubozuClose: number;
  };
  analysis: {
    keyLevels: { price: number; type: string; touches: number; role: string }[];
    breakout: { level: number; direction: string; candleType: string; isMarubozu: boolean; bodyRatio: number } | null;
    retest: { level: number; approached: boolean; closedInside: boolean; candlesToReach: number } | null;
    trigger: { type: string; found: boolean; candleDetails: string } | null;
    nextLevel: number;
  };
  summary: string;
  timestamp: number;
}

const PIPS_5_8 = 0.70; // 5-8 pips = $0.50-$0.80 for gold (using $0.70 average)

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

function findKeyLevels(candles: Candle[]) {
  const swings = findSwings(candles, 2);
  const tolerance = (candles.at(-1)?.close ?? 1000) * 0.0015;
  const levels: Map<number, { price: number; type: string; touches: number }> = new Map();

  for (const h of swings.highs) {
    let found = false;
    for (const [, v] of levels) {
      if (Math.abs(v.price - h.price) < tolerance) { v.touches++; found = true; break; }
    }
    if (!found) levels.set(h.price, { price: h.price, type: "resistance", touches: 1 });
  }
  for (const l of swings.lows) {
    let found = false;
    for (const [, v] of levels) {
      if (Math.abs(v.price - l.price) < tolerance) { v.touches++; found = true; break; }
    }
    if (!found) levels.set(l.price, { price: l.price, type: "support", touches: 1 });
  }

  return Array.from(levels.values()).filter((l) => l.touches >= 2).sort((a, b) => b.touches - a.touches);
}

function isMarubozu(c: Candle): { isMarubozu: boolean; bodyRatio: number } {
  const range = c.high - c.low;
  if (range <= 0) return { isMarubozu: false, bodyRatio: 0 };
  const body = Math.abs(c.close - c.open);
  const bodyRatio = body / range;
  return { isMarubozu: bodyRatio > 0.85, bodyRatio }; // Marubozu = body > 85% of range
}

function isMomentum(c: Candle): boolean {
  const range = c.high - c.low;
  if (range <= 0) return false;
  return Math.abs(c.close - c.open) / range > 0.7;
}

function detectBreakout(candles: Candle[], keyLevels: any[]) {
  for (let i = candles.length - 1; i >= Math.max(0, candles.length - 15); i--) {
    const c = candles[i];
    for (const lvl of keyLevels) {
      // Bullish breakout: Marubozu closes above resistance
      if (lvl.type === "resistance" && c.close > lvl.price * 1.001 && c.open < lvl.price) {
        const mb = isMarubozu(c);
        if (mb.isMarubozu || isMomentum(c)) {
          // Check no candle closed back below
          let valid = true;
          for (let j = i + 1; j < candles.length; j++) {
            if (candles[j].close < lvl.price) { valid = false; break; }
          }
          if (valid) return { level: lvl.price, direction: "bullish", candleType: mb.isMarubozu ? "Marubozu" : "Momentum", isMarubozu: mb.isMarubozu, bodyRatio: mb.bodyRatio, idx: i };
        }
      }
      // Bearish breakout: Marubozu closes below support
      if (lvl.type === "support" && c.close < lvl.price * 0.999 && c.open > lvl.price) {
        const mb = isMarubozu(c);
        if (mb.isMarubozu || isMomentum(c)) {
          let valid = true;
          for (let j = i + 1; j < candles.length; j++) {
            if (candles[j].close > lvl.price) { valid = false; break; }
          }
          if (valid) return { level: lvl.price, direction: "bearish", candleType: mb.isMarubozu ? "Marubozu" : "Momentum", isMarubozu: mb.isMarubozu, bodyRatio: mb.bodyRatio, idx: i };
        }
      }
    }
  }
  return null;
}

function detectRetest(m15Candles: Candle[], breakoutLevel: number, direction: string) {
  const tolerance = breakoutLevel * 0.002;
  let approached = false;
  let candlesToReach = 0;
  let closedInside = false;

  for (let i = m15Candles.length - 20; i < m15Candles.length; i++) {
    if (i < 0) continue;
    const c = m15Candles[i];
    const nearLevel = Math.abs(c.low - breakoutLevel) < tolerance || Math.abs(c.high - breakoutLevel) < tolerance || Math.abs(c.close - breakoutLevel) < tolerance;
    if (nearLevel) {
      approached = true;
      candlesToReach++;
      if (direction === "bullish" && c.close < breakoutLevel) closedInside = true;
      if (direction === "bearish" && c.close > breakoutLevel) closedInside = true;
    }
  }
  if (approached && !closedInside) return { level: breakoutLevel, approached: true, closedInside: false, candlesToReach };
  return null;
}

function detectTrigger(m15Candles: Candle[], breakoutLevel: number, direction: string) {
  const tolerance = breakoutLevel * 0.003;
  const recent = m15Candles.slice(-10);

  for (let i = recent.length - 1; i >= 1; i--) {
    const c = recent[i];
    const prev = recent[i - 1];
    const nearLevel = Math.abs(c.low - breakoutLevel) < tolerance || Math.abs(c.high - breakoutLevel) < tolerance;
    if (!nearLevel) continue;

    const range = c.high - c.low;
    if (range <= 0) continue;

    // Pin Bar / Hammer
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const body = Math.abs(c.close - c.open);

    if (direction === "bullish" && lowerWick > range * 0.6 && body < range * 0.3) {
      return { type: "Pin Bar (Hammer)", found: true, candleDetails: "ذيل سفلي طويل " + (lowerWick / range * 100).toFixed(0) + "% من المدى" };
    }
    if (direction === "bearish" && upperWick > range * 0.6 && body < range * 0.3) {
      return { type: "Pin Bar (Shooting Star)", found: true, candleDetails: "ذيل علوي طويل " + (upperWick / range * 100).toFixed(0) + "% من المدى" };
    }

    // Bullish Engulfing
    if (direction === "bullish" && c.close > c.open && prev.close < prev.open) {
      if (c.open <= prev.close && c.close >= prev.open) {
        return { type: "Bullish Engulfing", found: true, candleDetails: "شمعة صاعدة تبتلع الشمعة الهابطة السابقة" };
      }
    }
    // Bearish Engulfing
    if (direction === "bearish" && c.close < c.open && prev.close > prev.open) {
      if (c.open >= prev.close && c.close <= prev.open) {
        return { type: "Bearish Engulfing", found: true, candleDetails: "شمعة هابطة تبتلع الشمعة الصاعدة السابقة" };
      }
    }
  }
  return { type: "none", found: false, candleDetails: "لم تظهر شمعة انعكاسية بعد" };
}

export async function detectRoleReversalSetup(accountBalance: number = 10000): Promise<RoleReversalSetup> {
  const conditions: RRCondition[] = [];

  try {
    const { fetchGoldPrice } = await import("@/lib/gold-price");
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
  } catch {}

  const h1Candles = await fetchCandles("1h", 200);
  const m15Candles = await fetchCandles("15m", 200);

  if (h1Candles.length < 50 || m15Candles.length < 50) {
    return build(false, "البيانات غير كافية", conditions, { keyLevels: [], breakout: null, retest: null, trigger: null, nextLevel: 0 });
  }

  const lastPrice = h1Candles.at(-1)!.close;

  // === CONDITION 1: Key S/R Level (tested >= 2x on 1H) ===
  const keyLevels = findKeyLevels(h1Candles);
  if (keyLevels.length === 0) {
    conditions.push({ id: "key_level", nameAr: "المستوى الرئيسي (مقاومة/دعم تم اختباره >= 2x على 1H)", passed: false, details: "لا توجد مستويات رئيسية" });
    return build(false, "لا توجد صفقة متكاملة، في انتظار إعادة الاختبار", conditions, { keyLevels: [], breakout: null, retest: null, trigger: null, nextLevel: 0 });
  }

  const topLevels = keyLevels.slice(0, 5);
  conditions.push({
    id: "key_level",
    nameAr: "المستوى الرئيسي (مقاومة/دعم تم اختباره >= 2x على 1H)",
    passed: true,
    details: topLevels.length + " مستويات: " + topLevels.map((l) => "$" + l.price.toFixed(2) + "(" + (l.type === "support" ? "دعم" : "مقاومة") + " x" + l.touches + ")").join(", "),
  });

  // === CONDITION 2: Breakout (Marubozu/Momentum candle closes clearly outside) ===
  const breakout = detectBreakout(h1Candles, keyLevels);
  if (!breakout) {
    conditions.push({ id: "breakout", nameAr: "الكسر (شمعة Marubozu/Momentum تغلق بوضوح خارج المستوى)", passed: false, details: "لا يوجد كسر بشمعة Marubozu أو Momentum" });
    return build(false, "لا توجد صفقة متكاملة، في انتظار إعادة الاختبار", conditions, { keyLevels: topLevels, breakout: null, retest: null, trigger: null, nextLevel: 0 });
  }

  const roleReversalType = breakout.direction === "bullish" ? "مقاومة -> دعم (Resistance -> Support)" : "دعم -> مقاومة (Support -> Resistance)";
  conditions.push({
    id: "breakout",
    nameAr: "الكسر (شمعة Marubozu/Momentum تغلق بوضوح خارج المستوى)",
    passed: true,
    details: "الاتجاه: " + (breakout.direction === "bullish" ? "صعودي (كسر مقاومة)" : "هبوطي (كسر دعم)") + " | المستوى: $" + breakout.level.toFixed(2) + " | الشمعة: " + breakout.candleType + " (جسم " + (breakout.bodyRatio * 100).toFixed(0) + "% من المدى) | تبادل الادوار: " + roleReversalType,
  });

  // === CONDITION 3: Retest (price returns slowly to broken level) ===
  const retest = detectRetest(m15Candles, breakout.level, breakout.direction);
  if (!retest) {
    conditions.push({ id: "retest", nameAr: "إعادة الاختبار (رجوع السعر للمستوى المكسور = Role Reversal)", passed: false, details: "السعر لم يعد لاختبار المستوى المكسور بعد" });
    return build(false, "لا توجد صفقة متكاملة، في انتظار إعادة الاختبار", conditions, { keyLevels: topLevels, breakout, retest: null, trigger: null, nextLevel: 0 });
  }

  conditions.push({
    id: "retest",
    nameAr: "إعادة الاختبار (رجوع السعر للمستوى المكسور = Role Reversal)",
    passed: true,
    details: "السعر عاد لاختبار $" + retest.level.toFixed(2) + " (" + retest.candlesToReach + " شمعات 15m) | لم يغلق داخل المنطقة (التبادل مؤكد)",
  });

  // === CONDITION 4: Trigger (Pin Bar/Hammer or Bullish Engulfing on 15m) ===
  const trigger = detectTrigger(m15Candles, breakout.level, breakout.direction);
  if (!trigger || !trigger.found) {
    conditions.push({ id: "trigger", nameAr: "الشمعة الانعكاسية (Pin Bar/Hammer أو Engulfing على 15m)", passed: false, details: trigger ? trigger.candleDetails : "بانتظار ظهور شمعة انعكاسية" });
    return build(false, "لا توجد صفقة متكاملة، في انتظار إعادة الاختبار", conditions, { keyLevels: topLevels, breakout, retest, trigger: null, nextLevel: 0 });
  }

  conditions.push({
    id: "trigger",
    nameAr: "الشمعة الانعكاسية (Pin Bar/Hammer أو Engulfing على 15m)",
    passed: true,
    details: "النوع: " + trigger.type + " | " + trigger.candleDetails,
  });

  // === CONDITION 5: Risk Management ===
  const tradeType = breakout.direction === "bullish" ? "LONG" : "SHORT";
  const entry = lastPrice;

  // SL: 5-8 pips below reversal candle's tail
  const lastM15 = m15Candles.at(-1)!;
  const stopLoss = tradeType === "LONG" ? lastM15.low - PIPS_5_8 : lastM15.high + PIPS_5_8;

  // TP: next key level or R:R >= 1:2.5
  const allLevels = keyLevels.map((l) => l.price).sort((a, b) => a - b);
  const nextLevel = tradeType === "LONG"
    ? allLevels.find((l) => l > entry) ?? entry * 1.01
    : allLevels.reverse().find((l) => l < entry) ?? entry * 0.99;

  const slDist = Math.abs(entry - stopLoss);
  const tpDist = Math.abs(nextLevel - entry);
  const rr = slDist > 0 ? tpDist / slDist : 0;

  const rmPassed = rr >= 2.5;
  conditions.push({
    id: "risk",
    nameAr: "إدارة المخاطر (SL أسفل ذيل الشمعة بـ 5-8 pips، R:R >= 1:2.5)",
    passed: rmPassed,
    details: "R:R = 1:" + rr.toFixed(1) + " (المطلوب 1:2.5) | SL: $" + stopLoss.toFixed(2) + " (أسفل الذيل بـ " + PIPS_5_8.toFixed(2) + ") | TP: $" + nextLevel.toFixed(2),
  });

  if (!rmPassed) {
    return build(false, "لا توجد صفقة متكاملة، نسبة المخاطرة/العائد غير كافية", conditions, { keyLevels: topLevels, breakout, retest, trigger, nextLevel });
  }

  // === ALL CONDITIONS MET — TRADE! ===
  const riskAmount = accountBalance * 0.01;
  const lotSize = riskAmount / slDist;
  const potentialProfit = riskAmount * rr;
  const tp2 = nextLevel + (tradeType === "LONG" ? tpDist * 0.5 : -tpDist * 0.5);

  const trade: RoleReversalSetup["trade"] = {
    type: tradeType,
    typeAr: tradeType === "LONG" ? "شراء (Long) - Role Reversal" : "بيع (Short) - Role Reversal",
    entry,
    stopLoss,
    takeProfit1: nextLevel,
    takeProfit2: tp2,
    riskRewardRatio: rr,
    lotSize,
    riskAmount,
    potentialProfit,
    brokenLevel: breakout.level,
    roleReversalType,
    triggerType: trigger.type,
    marubozuClose: breakout.level,
  };

  return build(true, "OK - امر تداول: " + (tradeType === "LONG" ? "شراء" : "بيع") + " Role Reversal", conditions, { keyLevels: topLevels, breakout, retest, trigger, nextLevel }, trade);
}

function build(isComplete: boolean, message: string, conditions: RRCondition[], analysis: any, trade?: RoleReversalSetup["trade"]): RoleReversalSetup {
  return {
    isComplete,
    message,
    conditions,
    trade,
    analysis,
    summary: isComplete && trade
      ? trade.typeAr + " | دخول: $" + trade.entry.toFixed(2) + " | SL: $" + trade.stopLoss.toFixed(2) + " | TP: $" + trade.takeProfit1.toFixed(2) + " | R:R 1:" + trade.riskRewardRatio.toFixed(1) + " | " + trade.triggerType
      : message,
    timestamp: Date.now(),
  };
}
