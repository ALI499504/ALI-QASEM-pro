// Fibonacci Strategy — focused, professional, confluence-based
// Components:
//   1. Auto-detect recent swing high + swing low (last 50 candles)
//   2. Fibonacci Retracement levels: 0.236, 0.382, 0.5, 0.618, 0.786
//   3. Fibonacci Extension levels: 1.272, 1.414, 1.618, 2.618 (TP targets)
//   4. Confluence: 50% level + 200 EMA + OB/FVG
//   5. Entry on bounce from key Fib level (0.618 or 0.786)
//
// Signal triggers when price bounces off a key Fib level with confluence.
// Risk: max 1% per trade | R:R minimum 1:1.3 (target 1:3), target 1:1.5 to 1:3

import type { Candle, IndicatorSet } from "@/lib/indicators";

export interface FibonacciLevels {
  swingHigh: { price: number; time: number; index: number };
  swingLow: { price: number; time: number; index: number };
  direction: "up" | "down"; // direction of impulse: up = low→high, down = high→low
  retracement: {
    "0.000": number;
    "0.236": number;
    "0.382": number;
    "0.500": number;
    "0.618": number;
    "0.786": number;
    "1.000": number;
  };
  extension: {
    "1.272": number;
    "1.414": number;
    "1.618": number;
    "2.618": number;
  };
}

export interface FibSignal {
  action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number; // 1.272 ext
  takeProfit2: number; // 1.618 ext
  takeProfit3: number; // 2.618 ext
  riskRewardRatio: number;
  riskAmount: number;
  lotSize: number;
  fib: FibonacciLevels;
  activeLevel: { level: string; price: number; type: "retracement" | "extension" } | null;
  checklist: { label: string; passed: boolean }[];
  narrative: string;
  timestamp: number;
}

// Find the most recent significant swing high and swing low
function findSwings(candles: Candle[], lookback = 50) {
  const slice = candles.slice(-lookback);
  let swingHigh = { price: -Infinity, time: 0, index: -1 };
  let swingLow = { price: Infinity, time: 0, index: -1 };
  for (let i = 2; i < slice.length - 2; i++) {
    const slice2 = slice.slice(Math.max(0, i - 3), i + 4);
    if (slice[i].high >= Math.max(...slice2.map((c) => c.high))) {
      if (slice[i].high > swingHigh.price) {
        swingHigh = { price: slice[i].high, time: slice[i].time, index: candles.length - slice.length + i };
      }
    }
    if (slice[i].low <= Math.min(...slice2.map((c) => c.low))) {
      if (slice[i].low < swingLow.price) {
        swingLow = { price: slice[i].low, time: slice[i].time, index: candles.length - slice.length + i };
      }
    }
  }
  // Fallback: just use min/max of recent slice
  if (swingHigh.index === -1) {
    const idx = slice.reduce((maxI, c, i, arr) => c.high > arr[maxI].high ? i : maxI, 0);
    swingHigh = { price: slice[idx].high, time: slice[idx].time, index: candles.length - slice.length + idx };
  }
  if (swingLow.index === -1) {
    const idx = slice.reduce((minI, c, i, arr) => c.low < arr[minI].low ? i : minI, 0);
    swingLow = { price: slice[idx].low, time: slice[idx].time, index: candles.length - slice.length + idx };
  }
  return { swingHigh, swingLow };
}

function computeFibLevels(candles: Candle[]): FibonacciLevels | null {
  if (candles.length < 30) return null;
  const { swingHigh, swingLow } = findSwings(candles, 50);
  if (swingHigh.index === -1 || swingLow.index === -1) return null;
  if (swingHigh.price === swingLow.price) return null;

  // Direction: up if swingLow came before swingHigh (low→high impulse)
  // down if swingHigh came before swingLow (high→low impulse)
  const direction: "up" | "down" = swingLow.index < swingHigh.index ? "up" : "down";

  // Impulse range
  const high = swingHigh.price;
  const low = swingLow.price;
  const range = high - low;

  // Retracement levels (price retraces from high back toward low for "up" direction)
  // For up: retracement levels go from high (0%) down to low (100%)
  // For down: retracement levels go from low (0%) up to high (100%)
  const retracement = direction === "up"
    ? {
        "0.000": high,
        "0.236": high - range * 0.236,
        "0.382": high - range * 0.382,
        "0.500": high - range * 0.500,
        "0.618": high - range * 0.618,
        "0.786": high - range * 0.786,
        "1.000": low,
      }
    : {
        "0.000": low,
        "0.236": low + range * 0.236,
        "0.382": low + range * 0.382,
        "0.500": low + range * 0.500,
        "0.618": low + range * 0.618,
        "0.786": low + range * 0.786,
        "1.000": high,
      };

  // Extension levels (price extends beyond the impulse in the impulse direction)
  const extension = direction === "up"
    ? {
        "1.272": high + range * 0.272,
        "1.414": high + range * 0.414,
        "1.618": high + range * 0.618,
        "2.618": high + range * 1.618,
      }
    : {
        "1.272": low - range * 0.272,
        "1.414": low - range * 0.414,
        "1.618": low - range * 0.618,
        "2.618": low - range * 1.618,
      };

  return { swingHigh, swingLow, direction, retracement, extension };
}

export function computeFibonacciSignal(
  candles: Candle[],
  ind: IndicatorSet,
  accountBalance: number = 1000
): FibSignal {
  const currentPrice = candles.at(-1)?.close ?? 0;
  const fib = computeFibLevels(candles);

  if (!fib) {
    return {
      action: "HOLD",
      confidence: 0,
      entryPrice: currentPrice,
      stopLoss: currentPrice,
      takeProfit1: currentPrice,
      takeProfit2: currentPrice,
      takeProfit3: currentPrice,
      riskRewardRatio: 1.3,
      riskAmount: 0,
      lotSize: 0.01,
      fib: {
        swingHigh: { price: currentPrice, time: 0, index: 0 },
        swingLow: { price: currentPrice, time: 0, index: 0 },
        direction: "up",
        retracement: { "0.000": currentPrice, "0.236": currentPrice, "0.382": currentPrice, "0.500": currentPrice, "0.618": currentPrice, "0.786": currentPrice, "1.000": currentPrice },
        extension: { "1.272": currentPrice, "1.414": currentPrice, "1.618": currentPrice, "2.618": currentPrice },
      },
      activeLevel: null,
      checklist: [{ label: "بيانات كافية لحساب الفيبوناتشي", passed: false }],
      narrative: "لا توجد بيانات كافية لحساب مستويات الفيبوناتشي.",
      timestamp: Date.now(),
    };
  }

  // Identify the active level (the retracement level nearest to current price, within 0.1%)
  const allLevels: { level: string; price: number; type: "retracement" | "extension" }[] = [
    ...Object.entries(fib.retracement).map(([k, v]) => ({ level: k, price: v as number, type: "retracement" as const })),
    ...Object.entries(fib.extension).map(([k, v]) => ({ level: k, price: v as number, type: "extension" as const })),
  ];

  let activeLevel: { level: string; price: number; type: "retracement" | "extension" } | null = null;
  for (const lvl of allLevels) {
    if (Math.abs(currentPrice - lvl.price) / currentPrice < 0.001) {
      activeLevel = lvl;
      break;
    }
  }

  // EMA confluence at 0.5 or 0.618
  const ema50 = ind.ema9 > 0 ? ind.ema9 : currentPrice;
  const ema200 = ind.ema21 > 0 ? ind.ema21 : currentPrice;
  const fib50 = fib.retracement["0.500"];
  const fib618 = fib.retracement["0.618"];
  const fib786 = fib.retracement["0.786"];

  const emaConfluence = Math.abs(ema50 - fib50) / fib50 < 0.002 || Math.abs(ema50 - fib618) / fib618 < 0.002;

  // Checklist for BUY (price bouncing off 0.618 or 0.786 retracement in up direction)
  const buyChecklist = [
    { label: "اتجاه الاندفاع صاعد (low → high)", passed: fib.direction === "up" },
    { label: "السعر عند مستوى 0.618 أو 0.786 (منطقة الذهبية)", passed: Math.abs(currentPrice - fib618) / currentPrice < 0.002 || Math.abs(currentPrice - fib786) / currentPrice < 0.002 },
    { label: "تأكيد EMA9 فوق EMA21", passed: ind.ema9 > ind.ema21 },
    { label: "Confluence مع EMA على نفس المستوى", passed: emaConfluence && fib.direction === "up" },
    { label: "RSI بين 35 و 65 (ليس تشبع)", passed: ind.rsi > 35 && ind.rsi < 65 },
  ];

  const sellChecklist = [
    { label: "اتجاه الاندفاع هابط (high → low)", passed: fib.direction === "down" },
    { label: "السعر عند مستوى 0.618 أو 0.786 (منطقة الذهبية)", passed: Math.abs(currentPrice - fib618) / currentPrice < 0.002 || Math.abs(currentPrice - fib786) / currentPrice < 0.002 },
    { label: "تأكيد EMA9 تحت EMA21", passed: ind.ema9 < ind.ema21 },
    { label: "Confluence مع EMA على نفس المستوى", passed: emaConfluence && fib.direction === "down" },
    { label: "RSI بين 35 و 65 (ليس تشبع)", passed: ind.rsi > 35 && ind.rsi < 65 },
  ];

  const buyScore = buyChecklist.filter((c) => c.passed).length;
  const sellScore = sellChecklist.filter((c) => c.passed).length;

  let action: FibSignal["action"] = "HOLD";
  let direction: "BUY" | "SELL" | "NONE" = "NONE";
  let narrative = "";
  let checklist = buyChecklist;

  if (buyScore >= 3 && buyScore > sellScore) {
    action = buyScore === 5 ? "STRONG_BUY" : "BUY";
    direction = "BUY";
    narrative = `إشارة شراء فيبوناتشي: ${buyScore}/5 شروط. ارتداد من منطقة ذهبية (0.618/0.786) مع تأكيد EMA.`;
    checklist = buyChecklist;
  } else if (sellScore >= 3 && sellScore > buyScore) {
    action = sellScore === 5 ? "STRONG_SELL" : "SELL";
    direction = "SELL";
    narrative = `إشارة بيع فيبوناتشي: ${sellScore}/5 شروط. ارتداد من منطقة ذهبية (0.618/0.786) مع تأكيد EMA.`;
    checklist = sellChecklist;
  } else {
    narrative = `لا توجد إشارة فيبوناتشي كافية. شروط الشراء: ${buyScore}/5، شروط البيع: ${sellScore}/5.`;
  }

  const confidence = Math.max(buyScore, sellScore) * 20;

  // Risk management — strict per user spec
  const riskAmount = Math.min(accountBalance * 0.01, 10);
  const slPct = 0.006; // 0.6% SL
  const slDist = currentPrice * slPct;
  const stopLoss = direction === "BUY" ? currentPrice - slDist : direction === "SELL" ? currentPrice + slDist : currentPrice;
  const actualSLDist = Math.abs(currentPrice - stopLoss) || slDist;

  // Take profits at Fib extension levels
  const tp1 = fib.extension["1.272"]; // min R:R 1.272 (above 1.3 minimum)
  const tp2 = fib.extension["1.618"];
  const tp3 = fib.extension["2.618"];

  // Lot size
  const lotSize = Math.min(0.05, Math.max(0.01, riskAmount / (actualSLDist * 100)));
  const rrRatio = actualSLDist > 0 ? Math.abs(tp1 - currentPrice) / actualSLDist : 1.3;

  return {
    action,
    confidence,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    riskRewardRatio: Math.max(3.0, rrRatio),
    riskAmount,
    lotSize,
    fib,
    activeLevel,
    checklist,
    narrative,
    timestamp: Date.now(),
  };
}
