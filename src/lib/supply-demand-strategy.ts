// Supply/Demand Zone Strategy — professional institutional zones
// Components:
//   1. Demand Zone — base of bullish impulse (institutional buy zone)
//   2. Supply Zone — base of bearish impulse (institutional sell zone)
//   3. Zone Strength — rated by Rally-Base-Rally / Rally-Base-Drop / Drop-Base-Drop / Drop-Base-Rally patterns
//   4. Re-Test Detection — price returning to unmitigated zone
//   5. Confluence with Order Block / FVG
//
// Signal triggers when price re-tests an unmitigated zone with confluence.
// Risk: max 1% per trade | R:R minimum 1:1.3

import type { Candle, IndicatorSet } from "@/lib/indicators";

export interface SDZone {
  type: "demand" | "supply";
  pattern: "RBR" | "RBD" | "DBD" | "DBR"; // Rally-Base-Rally / Rally-Base-Drop / Drop-Base-Drop / Drop-Base-Rally
  openTime: number;
  top: number;
  bottom: number;
  midpoint: number;
  strength: "strong" | "moderate" | "weak";
  mitigated: boolean;
  retests: number;
  createdAt: number;
}

export interface SDSignal {
  action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
  riskAmount: number;
  lotSize: number;
  zones: SDZone[];
  activeZone: SDZone | null;
  checklist: { label: string; passed: boolean }[];
  narrative: string;
  timestamp: number;
}

function isBullish(c: Candle) { return c.close > c.open; }
function isBearish(c: Candle) { return c.close < c.open; }
function bodySize(c: Candle) { return Math.abs(c.close - c.open); }
function avgBody(candles: Candle[], idx: number, lookback = 10) {
  const start = Math.max(0, idx - lookback);
  const slice = candles.slice(start, idx);
  return slice.reduce((s, c) => s + bodySize(c), 0) / Math.max(1, slice.length);
}

function classifyStrength(rallySize: number, baseSize: number, avgBodyVal: number): "strong" | "moderate" | "weak" {
  if (rallySize > avgBodyVal * 2.5 && baseSize < avgBodyVal * 0.8) return "strong";
  if (rallySize > avgBodyVal * 1.5) return "moderate";
  return "weak";
}

function detectZones(candles: Candle[]): SDZone[] {
  const zones: SDZone[] = [];
  if (candles.length < 6) return zones;

  for (let i = 2; i < candles.length - 3; i++) {
    const prev = candles[i - 1];
    const base = candles[i];
    const next = candles[i + 1];
    const next2 = candles[i + 2];
    const avg = avgBody(candles, i, 10);

    const baseBody = bodySize(base);
    if (baseBody > avg * 0.8) continue; // base should be small

    const rallyBefore = prev.close - prev.open; // bullish if +
    const rallyAfter = next2.close - next.open; // bullish if +
    const baseTop = Math.max(base.open, base.close);
    const baseBottom = Math.min(base.open, base.close);
    const baseMid = (baseTop + baseBottom) / 2;

    // Drop-Base-Rally (DBR) → Demand zone (reversal from down to up)
    if (rallyBefore < 0 && rallyAfter > 0 && rallyAfter > avg * 1.5) {
      zones.push({
        type: "demand",
        pattern: "DBR",
        openTime: base.time,
        top: baseTop,
        bottom: baseBottom,
        midpoint: baseMid,
        strength: classifyStrength(rallyAfter, baseBody, avg),
        mitigated: false,
        retests: 0,
        createdAt: base.time,
      });
    }
    // Drop-Base-Drop (DBD) → Supply zone (continuation of downtrend)
    else if (rallyBefore < 0 && rallyAfter < 0 && Math.abs(rallyAfter) > avg * 1.5) {
      zones.push({
        type: "supply",
        pattern: "DBD",
        openTime: base.time,
        top: baseTop,
        bottom: baseBottom,
        midpoint: baseMid,
        strength: classifyStrength(Math.abs(rallyAfter), baseBody, avg),
        mitigated: false,
        retests: 0,
        createdAt: base.time,
      });
    }
    // Rally-Base-Drop (RBD) → Supply zone (reversal from up to down)
    else if (rallyBefore > 0 && rallyAfter < 0 && Math.abs(rallyAfter) > avg * 1.5) {
      zones.push({
        type: "supply",
        pattern: "RBD",
        openTime: base.time,
        top: baseTop,
        bottom: baseBottom,
        midpoint: baseMid,
        strength: classifyStrength(Math.abs(rallyAfter), baseBody, avg),
        mitigated: false,
        retests: 0,
        createdAt: base.time,
      });
    }
    // Rally-Base-Rally (RBR) → Demand zone (continuation of uptrend)
    else if (rallyBefore > 0 && rallyAfter > 0 && rallyAfter > avg * 1.5) {
      zones.push({
        type: "demand",
        pattern: "RBR",
        openTime: base.time,
        top: baseTop,
        bottom: baseBottom,
        midpoint: baseMid,
        strength: classifyStrength(rallyAfter, baseBody, avg),
        mitigated: false,
        retests: 0,
        createdAt: base.time,
      });
    }
  }

  // Mark mitigation (price has returned to zone AND closed beyond it)
  const recent = candles.slice(-30);
  for (const z of zones) {
    for (const c of recent) {
      if (c.low <= z.top && c.high >= z.bottom) {
        z.retests++;
      }
      if (z.type === "demand" && c.close < z.bottom * 0.998) z.mitigated = true;
      if (z.type === "supply" && c.close > z.top * 1.002) z.mitigated = true;
    }
  }

  return zones.slice(-10);
}

export function computeSupplyDemandSignal(
  candles: Candle[],
  ind: IndicatorSet,
  accountBalance: number = 1000
): SDSignal {
  const currentPrice = candles.at(-1)?.close ?? 0;
  const allZones = detectZones(candles);

  // Find unmitigated demand zone below current price (for BUY)
  const activeDemand = allZones
    .filter((z) => z.type === "demand" && !z.mitigated && z.top < currentPrice)
    .sort((a, b) => b.createdAt - a.createdAt)
    .at(0) ?? null;

  // Find unmitigated supply zone above current price (for SELL)
  const activeSupply = allZones
    .filter((z) => z.type === "supply" && !z.mitigated && z.bottom > currentPrice)
    .sort((a, b) => b.createdAt - a.createdAt)
    .at(0) ?? null;

  // Are we currently inside an unmitigated zone?
  const inDemand = allZones.find((z) => z.type === "demand" && !z.mitigated && currentPrice >= z.bottom && currentPrice <= z.top);
  const inSupply = allZones.find((z) => z.type === "supply" && !z.mitigated && currentPrice >= z.bottom && currentPrice <= z.top);

  const buyChecklist = [
    { label: "منطقة طلب غير مُتعادية أسفل السعر", passed: !!activeDemand },
    { label: "قوة المنطقة (قوية أو متوسطة)", passed: activeDemand?.strength === "strong" || activeDemand?.strength === "moderate" },
    { label: "السعر داخل أو قرب المنطقة (ضمن 0.5%)", passed: inDemand ? true : (activeDemand ? Math.abs(currentPrice - activeDemand.top) / currentPrice < 0.005 : false) },
    { label: "نمط逆转 — DBR (تحول من هبوط لصعود)", passed: activeDemand?.pattern === "DBR" },
    { label: "EMA9 فوق EMA21 (تأكيد زخم صاعد)", passed: ind.ema9 > ind.ema21 },
  ];

  const sellChecklist = [
    { label: "منطقة عرض غير مُتعادية فوق السعر", passed: !!activeSupply },
    { label: "قوة المنطقة (قوية أو متوسطة)", passed: activeSupply?.strength === "strong" || activeSupply?.strength === "moderate" },
    { label: "السعر داخل أو قرب المنطقة (ضمن 0.5%)", passed: inSupply ? true : (activeSupply ? Math.abs(currentPrice - activeSupply.bottom) / currentPrice < 0.005 : false) },
    { label: "نمط逆转 — RBD (تحول من صعود لهبوط)", passed: activeSupply?.pattern === "RBD" },
    { label: "EMA9 تحت EMA21 (تأكيد زخم هابط)", passed: ind.ema9 < ind.ema21 },
  ];

  const buyScore = buyChecklist.filter((c) => c.passed).length;
  const sellScore = sellChecklist.filter((c) => c.passed).length;

  let action: SDSignal["action"] = "HOLD";
  let direction: "BUY" | "SELL" | "NONE" = "NONE";
  let narrative = "";
  let activeZone: SDZone | null = null;
  let checklist: { label: string; passed: boolean }[] = [];

  if (buyScore >= 3 && buyScore > sellScore) {
    action = buyScore === 5 ? "STRONG_BUY" : "BUY";
    direction = "BUY";
    activeZone = activeDemand;
    narrative = `إشارة شراء عرض/طلب: ${buyScore}/5 شروط. منطقة طلب ${activeDemand?.pattern} قوة ${activeDemand?.strength} غير مُتعادية.`;
    checklist = buyChecklist;
  } else if (sellScore >= 3 && sellScore > buyScore) {
    action = sellScore === 5 ? "STRONG_SELL" : "SELL";
    direction = "SELL";
    activeZone = activeSupply;
    narrative = `إشارة بيع عرض/طلب: ${sellScore}/5 شروط. منطقة عرض ${activeSupply?.pattern} قوة ${activeSupply?.strength} غير مُتعادية.`;
    checklist = sellChecklist;
  } else {
    narrative = `لا توجد منطقة عرض/طلب كافية. شروط الشراء: ${buyScore}/5، شروط البيع: ${sellScore}/5. ننتظر عودة السعر لمنطقة قوية.`;
    checklist = buyChecklist;
  }

  const confidence = Math.max(buyScore, sellScore) * 20;

  // Risk management
  const riskAmount = Math.min(accountBalance * 0.01, 10);
  let stopLoss: number;
  if (direction === "BUY") {
    stopLoss = activeZone ? activeZone.bottom - (currentPrice * 0.001) : currentPrice * (1 - 0.006);
  } else if (direction === "SELL") {
    stopLoss = activeZone ? activeZone.top + (currentPrice * 0.001) : currentPrice * (1 + 0.006);
  } else {
    stopLoss = currentPrice;
  }
  const slDist = Math.abs(currentPrice - stopLoss);

  // Take profits at R:R 1:1.5, 1:2, 1:3
  const tp1 = direction === "BUY" ? currentPrice + slDist * 1.5 : currentPrice - slDist * 1.5;
  const tp2 = direction === "BUY" ? currentPrice + slDist * 2.0 : currentPrice - slDist * 2.0;
  const tp3 = direction === "BUY" ? currentPrice + slDist * 3.0 : currentPrice - slDist * 3.0;

  // Lot size: riskAmount = slDist * lot * 100 (XAUUSD: 1 lot = 100 oz)
  const lotSize = slDist > 0 ? Math.min(0.05, Math.max(0.01, riskAmount / (slDist * 100))) : 0.01;
  const rrRatio = slDist > 0 ? 1.5 : 1.3;

  return {
    action,
    confidence,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    riskRewardRatio: Math.max(1.3, rrRatio),
    riskAmount,
    lotSize,
    zones: allZones,
    activeZone,
    checklist,
    narrative,
    timestamp: Date.now(),
  };
}
