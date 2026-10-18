// Price Action & Structure Strategy — Classical Technical Analysis
// 1. Key S/R levels (bounced ≥2x on 1H)
// 2. Breakout (full 1H body outside S/R + momentum candle)
// 3. Retest (15m slow return to broken level without closing inside)
// 4. Confirmation Trigger (Pinbar or Engulfing at retest)
// 5. Risk Management (R:R ≥ 1:2, SL behind confirmation candle, TP at next S/R)

import { fetchCandles, setLastKnownPrice, type Candle } from "@/lib/indicators";

export interface PACondition {
  id: string;
  nameAr: string;
  passed: boolean;
  details: string;
}

export interface PriceActionSetup {
  isComplete: boolean;
  message: string;
  conditions: PACondition[];
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
    breakoutLevel: number;
    retestLevel: number;
    confirmationType: string; // "Pinbar" or "Engulfing"
    confirmationCandle: string;
  };
  analysis: {
    supportLevels: number[];
    resistanceLevels: number[];
    keyLevels: { price: number; type: "support" | "resistance"; touches: number }[];
    breakout: { level: number; direction: string; candleType: string; isMomentum: boolean } | null;
    retest: { level: number; approached: boolean; closedInside: boolean; candlesToReach: number } | null;
    confirmation: { type: string; direction: string; found: boolean } | null;
    nextLevel: number;
  };
  summary: string;
  timestamp: number;
}

// Find swing highs/lows using fractal pattern
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

// Find key support/resistance levels (touched ≥2 times)
function findKeyLevels(candles: Candle[]): {
  support: number[]; resistance: number[];
  key: { price: number; type: "support" | "resistance"; touches: number }[];
} {
  const swings = findSwings(candles, 2);
  const tolerance = (candles.at(-1)?.close ?? 1000) * 0.0015; // 0.15% tolerance
  const levels: Map<number, { price: number; type: "support" | "resistance"; touches: number }> = new Map();

  // Group similar swing highs (resistance)
  for (const h of swings.highs) {
    let found = false;
    for (const [, v] of levels) {
      if (Math.abs(v.price - h.price) < tolerance) {
        v.touches++;
        found = true;
        break;
      }
    }
    if (!found) levels.set(h.price, { price: h.price, type: "resistance", touches: 1 });
  }

  // Group similar swing lows (support)
  for (const l of swings.lows) {
    let found = false;
    for (const [, v] of levels) {
      if (Math.abs(v.price - l.price) < tolerance) {
        v.touches++;
        found = true;
        break;
      }
    }
    if (!found) levels.set(l.price, { price: l.price, type: "support", touches: 1 });
  }

  // Filter to key levels (≥2 touches)
  const keyLevels = Array.from(levels.values()).filter((l) => l.touches >= 2).sort((a, b) => b.touches - a.touches);
  const support = keyLevels.filter((l) => l.type === "support").map((l) => l.price);
  const resistance = keyLevels.filter((l) => l.type === "resistance").map((l) => l.price);

  return { support, resistance, key: keyLevels };
}

// Check if a candle is a momentum candle (body > 60% of range)
function isMomentumCandle(c: Candle): boolean {
  const range = c.high - c.low;
  if (range <= 0) return false;
  const body = Math.abs(c.close - c.open);
  return body / range > 0.6;
}

// Detect breakout on 1H
function detectBreakout(candles: Candle[], keyLevels: { price: number; type: string }[]): {
  level: number; direction: "bullish" | "bearish"; candleType: string; isMomentum: boolean; idx: number;
} | null {
  if (candles.length < 3) return null;
  const lastCandle = candles.at(-1)!;

  for (const lvl of keyLevels) {
    // Bullish breakout: candle body closes ABOVE resistance
    if (lvl.type === "resistance" && lastCandle.close > lvl.price && lastCandle.open < lvl.price) {
      const momentum = isMomentumCandle(lastCandle);
      const candleType = lastCandle.close > lastCandle.open ? "Bullish" : "Bearish";
      if (momentum) {
        return { level: lvl.price, direction: "bullish", candleType, isMomentum: true, idx: candles.length - 1 };
      }
    }
    // Bearish breakout: candle body closes BELOW support
    if (lvl.type === "support" && lastCandle.close < lvl.price && lastCandle.open > lvl.price) {
      const momentum = isMomentumCandle(lastCandle);
      const candleType = lastCandle.close < lastCandle.open ? "Bearish" : "Bullish";
      if (momentum) {
        return { level: lvl.price, direction: "bearish", candleType, isMomentum: true, idx: candles.length - 1 };
      }
    }
  }
  return null;
}

// Also check recent breakouts (last 10 candles)
function detectRecentBreakout(candles: Candle[], keyLevels: { price: number; type: string }[]): {
  level: number; direction: "bullish" | "bearish"; candleType: string; isMomentum: boolean; idx: number;
} | null {
  // Check last 10 1H candles for a breakout
  for (let i = candles.length - 1; i >= Math.max(0, candles.length - 10); i--) {
    const c = candles[i];
    for (const lvl of keyLevels) {
      if (lvl.type === "resistance" && c.close > lvl.price && c.open < lvl.price && isMomentumCandle(c)) {
        // Check no candle after this closed back below the level
        let stillValid = true;
        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].close < lvl.price) { stillValid = false; break; }
        }
        if (stillValid) return { level: lvl.price, direction: "bullish", candleType: "Bullish", isMomentum: true, idx: i };
      }
      if (lvl.type === "support" && c.close < lvl.price && c.open > lvl.price && isMomentumCandle(c)) {
        let stillValid = true;
        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].close > lvl.price) { stillValid = false; break; }
        }
        if (stillValid) return { level: lvl.price, direction: "bearish", candleType: "Bearish", isMomentum: true, idx: i };
      }
    }
  }
  return null;
}

// Detect retest on 15m
function detectRetest(m15Candles: Candle[], breakoutLevel: number, direction: "bullish" | "bearish"): {
  level: number; approached: boolean; closedInside: boolean; candlesToReach: number;
} | null {
  const tolerance = breakoutLevel * 0.002; // 0.2% tolerance
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
      // Check if any candle closed back inside (below resistance for bullish, above support for bearish)
      if (direction === "bullish" && c.close < breakoutLevel) closedInside = true;
      if (direction === "bearish" && c.close > breakoutLevel) closedInside = true;
    }
  }

  if (approached && !closedInside) {
    return { level: breakoutLevel, approached: true, closedInside: false, candlesToReach };
  }
  if (approached) {
    return { level: breakoutLevel, approached: true, closedInside: true, candlesToReach };
  }
  return null;
}

// Detect confirmation candle (Pinbar or Engulfing)
function detectConfirmation(m15Candles: Candle[], breakoutLevel: number, direction: "bullish" | "bearish"): {
  type: string; direction: string; found: boolean; candleIndex: number;
} | null {
  const tolerance = breakoutLevel * 0.003; // 0.3% tolerance
  const recent = m15Candles.slice(-10);

  for (let i = recent.length - 1; i >= 1; i--) {
    const c = recent[i];
    const prev = recent[i - 1];
    const nearLevel = Math.abs(c.low - breakoutLevel) < tolerance || Math.abs(c.high - breakoutLevel) < tolerance;

    if (!nearLevel) continue;

    // Check Pinbar: long wick in breakout direction
    const range = c.high - c.low;
    if (range > 0) {
      const upperWick = c.high - Math.max(c.open, c.close);
      const lowerWick = Math.min(c.open, c.close) - c.low;
      const body = Math.abs(c.close - c.open);

      // Bullish pinbar: long lower wick (rejection from below)
      if (direction === "bullish" && lowerWick > range * 0.6 && body < range * 0.3) {
        return { type: "Pinbar (صعودي)", direction: "bullish", found: true, candleIndex: m15Candles.length - (recent.length - i) };
      }
      // Bearish pinbar: long upper wick (rejection from above)
      if (direction === "bearish" && upperWick > range * 0.6 && body < range * 0.3) {
        return { type: "Pinbar (هبوطي)", direction: "bearish", found: true, candleIndex: m15Candles.length - (recent.length - i) };
      }
    }

    // Check Engulfing: current candle engulfs previous in breakout direction
    if (direction === "bullish" && c.close > c.open && prev.close < prev.open) {
      // Bullish engulfing
      if (c.open <= prev.close && c.close >= prev.open) {
        return { type: "Bullish Engulfing", direction: "bullish", found: true, candleIndex: m15Candles.length - (recent.length - i) };
      }
    }
    if (direction === "bearish" && c.close < c.open && prev.close > prev.open) {
      // Bearish engulfing
      if (c.open >= prev.close && c.close <= prev.open) {
        return { type: "Bearish Engulfing", direction: "bearish", found: true, candleIndex: m15Candles.length - (recent.length - i) };
      }
    }
  }

  return { type: "none", direction, found: false, candleIndex: -1 };
}

export async function detectPriceActionSetup(accountBalance: number = 10000): Promise<PriceActionSetup> {
  const conditions: PACondition[] = [];

  // Set price from fallback
  try {
    const { fetchGoldPrice } = await import("@/lib/gold-price");
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
  } catch {}

  // Fetch 1H and 15m candles
  const h1Candles = await fetchCandles("1h", 200);
  const m15Candles = await fetchCandles("15m", 200);

  if (h1Candles.length < 50 || m15Candles.length < 50) {
    return {
      isComplete: false,
      message: "البيانات غير كافية لتحليل Price Action",
      conditions: [],
      analysis: { supportLevels: [], resistanceLevels: [], keyLevels: [], breakout: null, retest: null, confirmation: null, nextLevel: 0 },
      summary: "بيانات غير كافية",
      timestamp: Date.now(),
    };
  }

  const lastPrice = h1Candles.at(-1)!.close;

  // === CONDITION 1: Key Support/Resistance Levels ===
  const { support, resistance, key } = findKeyLevels(h1Candles);

  if (key.length === 0) {
    conditions.push({ id: "sr_levels", nameAr: "المستويات الرئيسية (ارتداد ≥2× على فريم الساعة)", passed: false, details: "لا توجد مستويات دعم/مقاومة رئيسية" });
    return buildResult(false, "في انتظار تكوين مستويات دعم/مقاومة رئيسية", conditions, { supportLevels: support, resistanceLevels: resistance, keyLevels: key, breakout: null, retest: null, confirmation: null, nextLevel: 0 });
  }

  const topLevels = key.slice(0, 5);
  conditions.push({
    id: "sr_levels",
    nameAr: "المستويات الرئيسية (ارتداد ≥2× على فريم الساعة)",
    passed: true,
    details: `${topLevels.length} مستويات: ${topLevels.map((l) => `$${l.price.toFixed(2)}(${l.type === "support" ? "دعم" : "مقاومة"}×${l.touches})`).join("، ")}`,
  });

  // === CONDITION 2: Breakout (full 1H body outside S/R + momentum candle) ===
  const breakout = detectRecentBreakout(h1Candles, key);

  if (!breakout) {
    conditions.push({ id: "breakout", nameAr: "الاختراق (شمعة 1H زخم كامل الجسم خارج المستوى)", passed: false, details: "لا يوجد اختراق بشمعة زخم على فريم الساعة" });
    return buildResult(false, "في انتظار إعادة الاختبار أو التأكيد", conditions, { supportLevels: support, resistanceLevels: resistance, keyLevels: key, breakout: null, retest: null, confirmation: null, nextLevel: 0 });
  }

  conditions.push({
    id: "breakout",
    nameAr: "الاختراق (شمعة 1H زخم كامل الجسم خارج المستوى)",
    passed: true,
    details: "الاتجاه: " + (breakout.direction === "bullish" ? "صعودي (كسر مقاومة)" : "هبوطي (كسر دعم)") + " | المستوى: $" + breakout.level.toFixed(2) + " | شمعة: " + breakout.candleType + " Momentum",
  });

  // === CONDITION 3: Retest (15m slow return without closing inside) ===
  const retest = detectRetest(m15Candles, breakout.level, breakout.direction);

  if (!retest || !retest.approached) {
    conditions.push({ id: "retest", nameAr: "إعادة الاختبار (رجوع السعر على 15m للمستوى المكسور)", passed: false, details: "السعر لم يعد لاختبار المستوى المكسور بعد" });
    return buildResult(false, "في انتظار إعادة الاختبار أو التأكيد", conditions, { supportLevels: support, resistanceLevels: resistance, keyLevels: key, breakout, retest: null, confirmation: null, nextLevel: 0 });
  }

  if (retest.closedInside) {
    conditions.push({ id: "retest", nameAr: "إعادة الاختبار (رجوع السعر على 15m للمستوى المكسور)", passed: false, details: " السعر أغلق داخل المنطقة المكسورة — الاختراق فاشل!" });
    return buildResult(false, "في انتظار إعادة الاختبار أو التأكيد — الاختراق الحالي فشل", conditions, { supportLevels: support, resistanceLevels: resistance, keyLevels: key, breakout, retest, confirmation: null, nextLevel: 0 });
  }

  conditions.push({
    id: "retest",
    nameAr: "إعادة الاختبار (رجوع السعر على 15m للمستوى المكسور)",
    passed: true,
    details: `السعر عاد لاختبار $${retest.level.toFixed(2)} (${retest.candlesToReach} شمعات 15m) | لم يغلق داخل المنطقة OK`,
  });

  // === CONDITION 4: Confirmation Trigger (Pinbar or Engulfing) ===
  const confirmation = detectConfirmation(m15Candles, breakout.level, breakout.direction);

  if (!confirmation || !confirmation.found) {
    conditions.push({ id: "confirmation", nameAr: "شمعة التأكيد (Pinbar أو Engulfing عند إعادة الاختبار)", passed: false, details: "لم تظهر شمعة انعكاسية (Pinbar/Engulfing) عند منطقة إعادة الاختبار بعد" });
    return buildResult(false, "في انتظار إعادة الاختبار أو التأكيد", conditions, { supportLevels: support, resistanceLevels: resistance, keyLevels: key, breakout, retest, confirmation: null, nextLevel: 0 });
  }

  conditions.push({
    id: "confirmation",
    nameAr: "شمعة التأكيد (Pinbar أو Engulfing عند إعادة الاختبار)",
    passed: true,
    details: `النوع: ${confirmation.type} | الاتجاه: ${confirmation.direction === "bullish" ? "صعودي OK" : "هبوطي OK"}`,
  });

  // === CONDITION 5: Risk Management ===
  const tradeType = breakout.direction === "bullish" ? "LONG" : "SHORT";
  const entry = lastPrice;

  // SL: behind the confirmation candle
  const confirmCandle = m15Candles[confirmation.candleIndex] ?? m15Candles.at(-1)!;
  const stopLoss = tradeType === "LONG" ? confirmCandle.low - 0.50 : confirmCandle.high + 0.50;

  // TP: next key S/R level
  const allLevels = [...support, ...resistance].sort((a, b) => a - b);
  const nextLevel = tradeType === "LONG"
    ? allLevels.find((l) => l > entry) ?? entry * 1.01
    : allLevels.reverse().find((l) => l < entry) ?? entry * 0.99;

  const slDist = Math.abs(entry - stopLoss);
  const tpDist = Math.abs(nextLevel - entry);
  const rr = slDist > 0 ? tpDist / slDist : 0;

  const rmPassed = rr >= 2;
  conditions.push({
    id: "risk",
    nameAr: "إدارة المخاطر (R:R ≥ 1:2، SL خلف شمعة التأكيد، TP مستوى S/R قادم)",
    passed: rmPassed,
    details: `R:R = 1:${rr.toFixed(1)} (المطلوب 1:2) | SL: $${stopLoss.toFixed(2)} | TP: $${nextLevel.toFixed(2)}`,
  });

  if (!rmPassed) {
    return buildResult(false, "في انتظار إعادة الاختبار أو التأكيد — نسبة المخاطرة/العائد غير كافية", conditions, { supportLevels: support, resistanceLevels: resistance, keyLevels: key, breakout, retest, confirmation, nextLevel });
  }

  // === ALL CONDITIONS MET — TRADE SIGNAL! ===
  const riskAmount = accountBalance * 0.01;
  const lotSize = riskAmount / slDist;
  const potentialProfit = riskAmount * rr;

  const trade: PriceActionSetup["trade"] = {
    type: tradeType,
    typeAr: tradeType === "LONG" ? "شراء (Long)" : "بيع (Short)",
    entry,
    stopLoss,
    takeProfit1: nextLevel,
    takeProfit2: nextLevel + (tradeType === "LONG" ? (nextLevel - entry) * 0.5 : (entry - nextLevel) * 0.5),
    riskRewardRatio: rr,
    lotSize,
    riskAmount,
    potentialProfit,
    breakoutLevel: breakout.level,
    retestLevel: retest.level,
    confirmationType: confirmation.type,
    confirmationCandle: `15m candle #${confirmation.candleIndex}`,
  };

  return buildResult(true, ` إشارة Price Action مكتملة! ${tradeTypeAr()}`, conditions, { supportLevels: support, resistanceLevels: resistance, keyLevels: key, breakout, retest, confirmation, nextLevel }, trade);

  function tradeTypeAr() {
    return tradeType === "LONG" ? "شراء" : "بيع";
  }
}

function buildResult(
  isComplete: boolean,
  message: string,
  conditions: PACondition[],
  analysis: any,
  trade?: PriceActionSetup["trade"],
): PriceActionSetup {
  return {
    isComplete,
    message,
    conditions,
    trade,
    analysis,
    summary: isComplete && trade
      ? `${trade.typeAr} | دخول: $${trade.entry.toFixed(2)} | SL: $${trade.stopLoss.toFixed(2)} | TP: $${trade.takeProfit1.toFixed(2)} | R:R 1:${trade.riskRewardRatio.toFixed(1)} | ${trade.confirmationType}`
      : message,
    timestamp: Date.now(),
  };
}
