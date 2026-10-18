// SMC/ICT Professional Strategy — Smart Money Concepts Trading
// Strict rules-based setup detection following ICT methodology:
// 1. Higher Timeframe Trend (Daily + 4H)
// 2. Liquidity Sweep
// 3. Market Structure Shift / CHOCH (15m)
// 4. Entry Zone (FVG or Order Block)
// 5. Risk Management (1% risk, 1:3 R:R, 5 pips SL beyond local high/low)

import { fetchRealCandles, type KlineInterval } from "@/lib/binance-gold";
import type { Candle } from "@/lib/indicators";
import { ema, computeIndicators, fetchCandles, setLastKnownPrice } from "@/lib/indicators";

export interface SMCCondition {
  id: string;
  name: string;
  nameAr: string;
  passed: boolean;
  details: string;
  detailsAr: string;
  critical: boolean; // if false, this is informational only
}

export interface SMCSetup {
  // Overall status
  isComplete: boolean;        // true if ALL conditions are met
  message: string;            // "no setup" message if incomplete
  messageAr: string;

  // Conditions checklist
  conditions: SMCCondition[];

  // Trade details (if isComplete = true)
  trade?: {
    type: "LONG" | "SHORT";
    typeAr: string;
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    riskPercent: number;       // 1%
    riskRewardRatio: number;  // should be >= 3
    lotSize: number;
    riskAmount: number;
    potentialProfit: number;

    // Context
    htfTrend: string;
    liquidityType: string;
    chochDirection: string;
    entryZoneType: string;     // FVG or OB
    entryZoneTop: number;
    entryZoneBottom: number;
  };

  // Analysis details
  analysis: {
    dailyTrend: { ema9: number; ema21: number; ema50: number; bias: string };
    h4Trend: { ema9: number; ema21: number; ema50: number; bias: string };
    m15Structure: { lastSwingHigh: number; lastSwingLow: number; bias: string };
    liquiditySweep: { type: string; level: number; swept: boolean };
    fvgOrOB: { type: string; top: number; bottom: number; found: boolean };
    nextLiquidity: { above: number; below: number };
  };

  summary: string;
  timestamp: number;
}

// Fetch candles for a specific interval with synthetic fallback
async function getCandles(interval: KlineInterval, limit: number): Promise<Candle[]> {
  try {
    // Use fetchCandles from indicators.ts which has synthetic fallback
    return await fetchCandles(interval, limit);
  } catch {
    return [];
  }
}

// Determine trend from EMA alignment
function getEMATrend(candles: Candle[]): { ema9: number; ema21: number; ema50: number; bias: string } {
  if (candles.length < 50) return { ema9: 0, ema21: 0, ema50: 0, bias: "insufficient_data" };
  const ind = computeIndicators(candles);
  const bias = ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50 ? "bullish" :
               ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50 ? "bearish" : "neutral";
  return { ema9: ind.ema9, ema21: ind.ema21, ema50: ind.ema50, bias };
}

// Find swing highs/lows (fractal pattern)
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

// Detect liquidity sweep — price goes beyond previous swing then reverses
function detectLiquiditySweep(candles: Candle[], swings: { highs: any[]; lows: any[] }) {
  if (candles.length < 10 || swings.highs.length < 2 || swings.lows.length < 2) {
    return { type: "none", level: 0, swept: false };
  }

  const lastCandle = candles.at(-1)!;
  const prevHighs = swings.highs.slice(-3).map((h) => h.price);
  const prevLows = swings.lows.slice(-3).map((l) => l.price);
  const highestPrevHigh = Math.max(...prevHighs);
  const lowestPrevLow = Math.min(...prevLows);

  // Check last 5 candles for sweep
  const recent = candles.slice(-5);

  // Sell-side liquidity sweep (price dips below previous low, then reverses up) → BUY setup
  const sellSideSweep = recent.some((c) => c.low <= lowestPrevLow * 1.001) &&
                         lastCandle.close > lowestPrevLow;

  // Buy-side liquidity sweep (price spikes above previous high, then reverses down) → SELL setup
  const buySideSweep = recent.some((c) => c.high >= highestPrevHigh * 0.999) &&
                       lastCandle.close < highestPrevHigh;

  if (sellSideSweep) return { type: "sell-side", level: lowestPrevLow, swept: true };
  if (buySideSweep) return { type: "buy-side", level: highestPrevHigh, swept: true };
  return { type: "none", level: 0, swept: false };
}

// Detect CHOCH (Change of Character) on 15m
function detectCHOCH(candles: Candle[], sweeps: any) {
  if (candles.length < 20) return { direction: "none", level: 0, confirmed: false };

  const swings = findSwings(candles);
  if (swings.highs.length < 2 || swings.lows.length < 2) {
    return { direction: "none", level: 0, confirmed: false };
  }

  const lastHigh = swings.highs[swings.highs.length - 1];
  const lastLow = swings.lows[swings.lows.length - 1];
  const prevHigh = swings.highs[swings.highs.length - 2];
  const prevLow = swings.lows[swings.lows.length - 2];

  // Check for bullish CHOCH (after sell-side sweep, price breaks above last lower high)
  if (sweeps.type === "sell-side") {
    // Need: previous structure was making lower highs, now price breaks above last high
    const wasMakingLowerHighs = prevHigh.price > lastHigh.price;
    const currentClose = candles.at(-1)!.close;
    const brokeAbove = currentClose > lastHigh.price;
    if (wasMakingLowerHighs && brokeAbove) {
      return { direction: "bullish", level: lastHigh.price, confirmed: true };
    }
  }

  // Check for bearish CHOCH (after buy-side sweep, price breaks below last higher low)
  if (sweeps.type === "buy-side") {
    const wasMakingHigherLows = lastLow.price > prevLow.price;
    const currentClose = candles.at(-1)!.close;
    const brokeBelow = currentClose < lastLow.price;
    if (wasMakingHigherLows && brokeBelow) {
      return { direction: "bearish", level: lastLow.price, confirmed: true };
    }
  }

  return { direction: "none", level: 0, confirmed: false };
}

// Find Fair Value Gap (FVG) or Order Block near the CHOCH
function findEntryZone(candles: Candle[], choch: any) {
  if (choch.direction === "none" || candles.length < 5) {
    return { type: "none", top: 0, bottom: 0, found: false };
  }

  // Look at the last 10 candles before the CHOCH for FVG
  for (let i = candles.length - 3; i >= Math.max(2, candles.length - 15); i--) {
    const c1 = candles[i - 2];
    const c3 = candles[i];

    // Bullish FVG (gap up): c1.high < c3.low
    if (choch.direction === "bullish" && c1.high < c3.low) {
      return { type: "FVG (bullish)", top: c3.low, bottom: c1.high, found: true };
    }
    // Bearish FVG (gap down): c1.low > c3.high
    if (choch.direction === "bearish" && c1.low > c3.high) {
      return { type: "FVG (bearish)", top: c1.low, bottom: c3.high, found: true };
    }
  }

  // If no FVG found, look for Order Block (last opposite candle before the CHOCH move)
  for (let i = candles.length - 4; i >= Math.max(0, candles.length - 10); i--) {
    const c = candles[i];
    if (choch.direction === "bullish" && c.close < c.open) {
      // Bearish OB before bullish move
      return { type: "OB (bullish)", top: c.open, bottom: c.close, found: true };
    }
    if (choch.direction === "bearish" && c.close > c.open) {
      // Bullish OB before bearish move
      return { type: "OB (bearish)", top: c.close, bottom: c.open, found: true };
    }
  }

  return { type: "none", top: 0, bottom: 0, found: false };
}

// Find next liquidity levels (for TP targets)
function findNextLiquidity(swings: any, currentPrice: number) {
  const allHighs = swings.highs.map((h: any) => h.price).sort((a: number, b: number) => a - b);
  const allLows = swings.lows.map((l: any) => l.price).sort((a: number, b: number) => a - b);

  const above = allHighs.find((p: number) => p > currentPrice) ?? currentPrice * 1.01;
  const below = allLows.reverse().find((p: number) => p < currentPrice) ?? currentPrice * 0.99;

  return { above, below };
}

const PIPS_TO_PRICE = 0.50; // 5 pips = $0.50 for gold (1 pip = $0.10)

export async function detectSMCSetup(accountBalance: number = 10000): Promise<SMCSetup> {
  const conditions: SMCCondition[] = [];

  // === Set the last known price from gold-api.com fallback before fetching candles ===
  try {
    const { fetchGoldPrice } = await import("@/lib/gold-price");
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
  } catch {}

  // === 1. Fetch all timeframes ===
  const dailyCandles = await getCandles("1d", 200);
  const h4Candles = await getCandles("4h", 200);
  const m15Candles = await getCandles("15m", 200);

  if (dailyCandles.length < 50 || h4Candles.length < 50 || m15Candles.length < 50) {
    return {
      isComplete: false,
      message: "Insufficient data for SMC analysis",
      messageAr: "لا توجد فرصة مكتملة الشروط حالياً حسب مدرسة SMC — البيانات غير كافية للتحليل متعدد الأطر الزمنية.",
      conditions: [],
      analysis: {
        dailyTrend: { ema9: 0, ema21: 0, ema50: 0, bias: "no_data" },
        h4Trend: { ema9: 0, ema21: 0, ema50: 0, bias: "no_data" },
        m15Structure: { lastSwingHigh: 0, lastSwingLow: 0, bias: "no_data" },
        liquiditySweep: { type: "none", level: 0, swept: false },
        fvgOrOB: { type: "none", top: 0, bottom: 0, found: false },
        nextLiquidity: { above: 0, below: 0 },
      },
      summary: "بيانات غير كافية",
      timestamp: Date.now(),
    };
  }

  // === CONDITION 1: Higher Timeframe Trend (Daily + 4H) ===
  const dailyTrend = getEMATrend(dailyCandles);
  const h4Trend = getEMATrend(h4Candles);

  const trendsAligned =
    (dailyTrend.bias === "bullish" && h4Trend.bias === "bullish") ||
    (dailyTrend.bias === "bearish" && h4Trend.bias === "bearish");

  conditions.push({
    id: "htf_trend",
    name: "Higher Timeframe Trend (Daily + 4H)",
    nameAr: "الاتجاه العام (يومي + 4 ساعات)",
    passed: trendsAligned,
    details: `Daily: ${dailyTrend.bias} (EMA9=${dailyTrend.ema9.toFixed(0)}, EMA21=${dailyTrend.ema21.toFixed(0)}, EMA50=${dailyTrend.ema50.toFixed(0)}) | 4H: ${h4Trend.bias} (EMA9=${h4Trend.ema9.toFixed(0)}, EMA21=${h4Trend.ema21.toFixed(0)})`,
    detailsAr: `اليومي: ${dailyTrend.bias === "bullish" ? "صاعد" : dailyTrend.bias === "bearish" ? "هابط" : "محايد"} | 4 ساعات: ${h4Trend.bias === "bullish" ? "صاعد" : h4Trend.bias === "bearish" ? "هابط" : "محايد"}`,
    critical: true,
  });

  // Determine trade direction from HTF trend
  const tradeDirection = dailyTrend.bias === "bullish" ? "LONG" : dailyTrend.bias === "bearish" ? "SHORT" : null;

  // === CONDITION 2: Liquidity Sweep ===
  // Use 1H candles for liquidity sweep detection (between HTF and LTF)
  const m15Swings = findSwings(m15Candles, 2);
  const liquiditySweep = detectLiquiditySweep(m15Candles, m15Swings);

  // For LONG: need sell-side liquidity sweep
  // For SHORT: need buy-side liquidity sweep
  const sweepCorrect = tradeDirection === "LONG"
    ? liquiditySweep.type === "sell-side"
    : tradeDirection === "SHORT"
    ? liquiditySweep.type === "buy-side"
    : false;

  conditions.push({
    id: "liquidity_sweep",
    name: "Liquidity Sweep",
    nameAr: "سحب السيولة",
    passed: sweepCorrect,
    details: `Type: ${liquiditySweep.type} | Level: ${liquiditySweep.level.toFixed(2)} | Swept: ${liquiditySweep.swept} | Needed: ${tradeDirection === "LONG" ? "sell-side (for long)" : "buy-side (for short)"}`,
    detailsAr: `النوع: ${liquiditySweep.type === "sell-side" ? "سحب سيولة بيعية (تحت القاع)" : liquiditySweep.type === "buy-side" ? "سحب سيولة شرائية (فوق القمة)" : "لا يوجد"} | المستوى: ${liquiditySweep.level.toFixed(2)} | ${sweepCorrect ? " مطابق للاتجاه" : " غير مطابق"}`,
    critical: true,
  });

  // === CONDITION 3: Market Structure Shift / CHOCH (15m) ===
  const choch = detectCHOCH(m15Candles, liquiditySweep);

  const chochCorrect = tradeDirection === "LONG"
    ? choch.direction === "bullish"
    : tradeDirection === "SHORT"
    ? choch.direction === "bearish"
    : false;

  conditions.push({
    id: "choch",
    name: "Market Structure Shift / CHOCH (15m)",
    nameAr: "تغير الهيكل / CHOCH (15 دقيقة)",
    passed: chochCorrect,
    details: `Direction: ${choch.direction} | Level: ${choch.level.toFixed(2)} | Confirmed: ${choch.confirmed} | Needed: ${tradeDirection === "LONG" ? "bullish CHOCH" : "bearish CHOCH"}`,
    detailsAr: `الاتجاه: ${choch.direction === "bullish" ? "صاعد (كسر لأعلى)" : choch.direction === "bearish" ? "هابط (كسر لأسفل)" : "لا يوجد كسر"} | المستوى: ${choch.level.toFixed(2)} | ${choch.confirmed ? " مؤكد" : " غير مؤكد"}`,
    critical: true,
  });

  // === CONDITION 4: Entry Zone (FVG or OB) ===
  const entryZone = findEntryZone(m15Candles, choch);
  const lastPrice = m15Candles.at(-1)!.close;
  const priceInZone = entryZone.found &&
    lastPrice >= entryZone.bottom * 0.998 &&
    lastPrice <= entryZone.top * 1.002;

  conditions.push({
    id: "entry_zone",
    name: "Entry Zone (FVG or Order Block)",
    nameAr: "منطقة الدخول (FVG أو OB)",
    passed: entryZone.found,
    details: entryZone.found
      ? `Type: ${entryZone.type} | Zone: ${entryZone.bottom.toFixed(2)} - ${entryZone.top.toFixed(2)} | Price at: ${lastPrice.toFixed(2)} | In zone: ${priceInZone}`
      : "No FVG or OB found near CHOCH",
    detailsAr: entryZone.found
      ? `النوع: ${entryZone.type} | المنطقة: $${entryZone.bottom.toFixed(2)} - $${entryZone.top.toFixed(2)} | السعر: $${lastPrice.toFixed(2)} | ${priceInZone ? " السعر في المنطقة" : " بانتظار عودة السعر للمنطقة"}`
      : "لا توجد FVG أو OB بالقرب من الكسر",
    critical: true,
  });

  // === CONDITION 5: Risk Management ===
  const nextLiquidity = findNextLiquidity(m15Swings, lastPrice);
  const allCriticalPassed = conditions.filter((c) => c.critical).every((c) => c.passed);

  let trade: SMCSetup["trade"] = undefined;
  let rmPassed = false;
  let rmDetails = "";
  let rmDetailsAr = "";

  if (allCriticalPassed && tradeDirection) {
    // Calculate trade levels
    const isLong = tradeDirection === "LONG";
    const localExtreme = isLong ? entryZone.bottom : entryZone.top;
    const slDistance = PIPS_TO_PRICE; // 5 pips beyond local extreme
    const stopLoss = isLong ? localExtreme - slDistance : localExtreme + slDistance;

    // TP targets = next liquidity levels
    const tp1 = isLong ? nextLiquidity.above : nextLiquidity.below;
    const tpDist1 = Math.abs(tp1 - lastPrice);
    const tp2 = isLong ? nextLiquidity.above + (nextLiquidity.above - lastPrice) * 0.5 : nextLiquidity.below - (lastPrice - nextLiquidity.below) * 0.5;
    const tp3 = isLong ? nextLiquidity.above * 1.005 : nextLiquidity.below * 0.995;

    const slDist = Math.abs(lastPrice - stopLoss);
    const tpDist = Math.abs(tp2 - lastPrice);
    const rr = slDist > 0 ? tpDist / slDist : 0;

    rmPassed = rr >= 3;
    rmDetails = `RRR: 1:${rr.toFixed(1)} (need 1:3+) | SL: ${stopLoss.toFixed(2)} (${slDist.toFixed(2)} away) | TP2: ${tp2.toFixed(2)}`;
    rmDetailsAr = `نسبة المخاطرة/العائد: 1:${rr.toFixed(1)} (المطلوب 1:3) | وقف الخسارة: $${stopLoss.toFixed(2)} (بعد ${slDist.toFixed(2)} من القاع) | الهدف: $${tp2.toFixed(2)}`;

    if (rmPassed) {
      const riskAmount = accountBalance * 0.01; // 1%
      const lotSize = riskAmount / slDist;
      const potentialProfit = riskAmount * rr;

      trade = {
        type: tradeDirection,
        typeAr: tradeDirection === "LONG" ? "شراء (Long)" : "بيع (Short)",
        entry: lastPrice,
        stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskPercent: 1,
        riskRewardRatio: rr,
        lotSize,
        riskAmount,
        potentialProfit,
        htfTrend: dailyTrend.bias,
        liquidityType: liquiditySweep.type,
        chochDirection: choch.direction,
        entryZoneType: entryZone.type,
        entryZoneTop: entryZone.top,
        entryZoneBottom: entryZone.bottom,
      };
    }
  } else {
    rmDetails = "Cannot calculate — prior conditions not met";
    rmDetailsAr = "لا يمكن حساب — الشروط السابقة غير مكتملة";
  }

  conditions.push({
    id: "risk_management",
    name: "Risk Management (1% risk, 1:3 RRR, 5 pips SL)",
    nameAr: "إدارة المخاطر (1% مخاطرة، 1:3 عائد/مخاطرة، 5 نقاط SL)",
    passed: rmPassed,
    details: rmDetails,
    detailsAr: rmDetailsAr,
    critical: true,
  });

  // === Final determination ===
  const isComplete = conditions.every((c) => c.passed);

  // Build message
  let messageAr = "";
  if (isComplete && trade) {
    messageAr = ` فرصة SMC مكتملة! ${trade.typeAr}`;
  } else {
    const failedConditions = conditions.filter((c) => !c.passed);
    const failedNames = failedConditions.map((c) => c.nameAr).join("، ");
    messageAr = `لا توجد فرصة مكتملة الشروط حالياً حسب مدرسة SMC — لم تتحقق الشروط التالية: ${failedNames}`;
  }

  return {
    isComplete,
    message: isComplete ? "SMC setup complete!" : "No complete SMC setup",
    messageAr,
    conditions,
    trade,
    analysis: {
      dailyTrend,
      h4Trend,
      m15Structure: {
        lastSwingHigh: m15Swings.highs.at(-1)?.price ?? 0,
        lastSwingLow: m15Swings.lows.at(-1)?.price ?? 0,
        bias: choch.direction,
      },
      liquiditySweep,
      fvgOrOB: entryZone,
      nextLiquidity,
    },
    summary: isComplete && trade
      ? `${trade.typeAr} | دخول: $${trade.entry.toFixed(2)} | SL: $${trade.stopLoss.toFixed(2)} | TP: $${trade.takeProfit2.toFixed(2)} | R:R 1:${trade.riskRewardRatio.toFixed(1)} | مخاطرة 1%`
      : messageAr,
    timestamp: Date.now(),
  };
}
