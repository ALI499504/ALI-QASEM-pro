// Wyckoff Method — Professional Accumulation/Distribution Analysis
// Detects: Selling Climax (SC), Spring, Jump Across Creek (JAC), LPS
// Identifies current Wyckoff phase and provides entry signals

import { fetchCandles, setLastKnownPrice, type Candle, type IndicatorSet, computeIndicators } from "@/lib/indicators";
import type { KlineInterval } from "@/lib/binance-gold";

export type WyckoffPhase =
  | "NO_SETUP"           // لا يوجد نمط وايكوف
  | "PHASE_A_SC"         // Selling Climax — هبوط حاد بحجم ضخم
  | "PHASE_B_RANGE"      // نطاق جانبي (تجميع/توزيع)
  | "PHASE_C_SPRING"     // Spring/Upthrust — اختبار وهمي بحجم منخفض
  | "PHASE_D_JAC"        // Jump Across the Creek — كسر بحجم مرتفع
  | "PHASE_E_LPS"        // Last Point of Support — إعادة اختبار بحجم منخفض = دخول!
  | "MARKUP"             // بعد الدخول — ارتفاع
  | "MARKDOWN";          // بعد الدخول — انخفاض

export interface WyckoffCondition {
  id: string;
  nameAr: string;
  passed: boolean;
  details: string;
}

export interface WyckoffSetup {
  // Phase
  phase: WyckoffPhase;
  phaseAr: string;
  phaseDescription: string;
  setupType: "ACCUMULATION" | "DISTRIBUTION" | "NONE";
  setupTypeAr: string;

  // Is entry signal ready?
  isEntrySignal: boolean;
  message: string;

  // Conditions checklist
  conditions: WyckoffCondition[];

  // Trade details (if isEntrySignal = true)
  trade?: {
    type: "LONG" | "SHORT";
    typeAr: string;
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskPercent: number;
    riskRewardRatio: number;
    lotSize: number;
    riskAmount: number;
    potentialProfit: number;
    rangeHeight: number;
    measuredMove: number;
    springLevel: number;
    creekLevel: number; // الحد العلوي المكسور
  };

  // Analysis details
  analysis: {
    rangeTop: number;
    rangeBottom: number;
    rangeHeight: number;
    scLevel: number;          // Selling Climax price
    scVolume: number;         // Selling Climax volume
    scVolumeRatio: number;   // SC volume / avg volume
    springLevel: number;     // Spring low (false breakdown)
    springVolume: number;
    springVolumeRatio: number;
    jacLevel: number;         // JAC breakout price
    jacVolume: number;
    jacVolumeRatio: number;
    lpsLevel: number;         // LPS retest level
    lpsVolume: number;
    lpsVolumeRatio: number;
    avgVolume: number;
    currentPhase: string;
  };

  summary: string;
  timestamp: number;
}

const PIPS_10 = 1.00; // 10 pips = $1.00 for gold (1 pip = $0.10)

// Find trading range (sideways consolidation after a move)
function findTradingRange(candles: Candle[]): { top: number; bottom: number; startIdx: number; height: number } | null {
  if (candles.length < 40) return null;

  // Look at last 60 candles for range
  const window = candles.slice(-60);
  const highs = window.map((c) => c.high);
  const lows = window.map((c) => c.low);
  const rangeTop = Math.max(...highs);
  const rangeBottom = Math.min(...lows);
  const height = rangeTop - rangeBottom;

  // Check if it's a range (height < 2% of price)
  const price = candles.at(-1)!.close;
  if (height / price > 0.03) return null; // too wide = not a range

  // Count how many candles are within 80% of the range
  const range80Top = rangeBottom + height * 0.8;
  const range80Bottom = rangeBottom + height * 0.2;
  const inRange = window.filter((c) => c.close >= range80Bottom && c.close <= range80Top).length;

  // At least 40% of candles should be in the range
  if (inRange / window.length < 0.4) return null;

  return { top: rangeTop, bottom: rangeBottom, startIdx: candles.length - 60, height };
}

// Find Selling Climax (SC) — sharp drop with ultra-high volume
function findSellingClimax(candles: Candle[], avgVolume: number): { idx: number; price: number; volume: number; volumeRatio: number } | null {
  if (candles.length < 20 || avgVolume === 0) return null;

  // Look for the candle with highest volume in last 40 that also had a big drop
  let bestSC: any = null;
  const window = candles.slice(-40);

  for (let i = 0; i < window.length; i++) {
    const c = window[i];
    const volRatio = c.volume / avgVolume;
    const drop = (c.open - c.close) / c.open;

    // SC criteria: volume > 1.8× average AND drop > 0.3%
    if (volRatio > 1.8 && drop > 0.003) {
      if (!bestSC || volRatio > bestSC.volumeRatio) {
        bestSC = {
          idx: candles.length - 40 + i,
          price: c.low,
          volume: c.volume,
          volumeRatio: volRatio,
        };
      }
    }
  }

  return bestSC || null;
}

// Find Spring — false breakdown below SC low with LOW volume
function findSpring(candles: Candle[], scLevel: number, rangeBottom: number, avgVolume: number): { level: number; volume: number; volumeRatio: number; idx: number } | null {
  if (!scLevel || avgVolume === 0) return null;

  // Look for a candle that:
  // 1. Goes below the range bottom (or SC level)
  // 2. Closes back inside the range
  // 3. Has LOW volume (< 0.7× average)

  for (let i = candles.length - 30; i < candles.length; i++) {
    if (i < 0) continue;
    const c = candles[i];
    const brokeBelow = c.low < rangeBottom * 0.999;
    const closedInside = c.close > rangeBottom;
    const volRatio = c.volume / avgVolume;
    const lowVolume = volRatio < 0.8;

    if (brokeBelow && closedInside && lowVolume) {
      return { level: c.low, volume: c.volume, volumeRatio: volRatio, idx: i };
    }
  }

  return null;
}

// Find JAC (Jump Across the Creek) — breakout above range with HIGH volume
function findJAC(candles: Candle[], rangeTop: number, avgVolume: number): { level: number; volume: number; volumeRatio: number; idx: number } | null {
  if (avgVolume === 0) return null;

  for (let i = candles.length - 20; i < candles.length; i++) {
    if (i < 0) continue;
    const c = candles[i];
    const brokeAbove = c.close > rangeTop * 1.001;
    const volRatio = c.volume / avgVolume;
    const highVolume = volRatio > 1.5;

    if (brokeAbove && highVolume) {
      return { level: c.close, volume: c.volume, volumeRatio: volRatio, idx: i };
    }
  }

  return null;
}

// Find LPS (Last Point of Support) — retest of broken range top with LOW volume
function findLPS(candles: Candle[], creekLevel: number, jacIdx: number, avgVolume: number): { level: number; volume: number; volumeRatio: number; idx: number } | null {
  if (jacIdx < 0 || avgVolume === 0) return null;

  // Look AFTER the JAC for a retest
  for (let i = jacIdx + 1; i < candles.length; i++) {
    const c = candles[i];
    const nearCreek = Math.abs(c.low - creekLevel) / creekLevel < 0.003; // within 0.3%
    const volRatio = c.volume / avgVolume;
    const lowVolume = volRatio < 0.7;

    if (nearCreek && lowVolume && c.close > creekLevel) {
      return { level: c.low, volume: c.volume, volumeRatio: volRatio, idx: i };
    }
  }

  return null;
}

// For Distribution (mirror of Accumulation)
function findBuyingClimax(candles: Candle[], avgVolume: number): { idx: number; price: number; volume: number; volumeRatio: number } | null {
  if (candles.length < 20 || avgVolume === 0) return null;

  let bestBC: any = null;
  const window = candles.slice(-40);

  for (let i = 0; i < window.length; i++) {
    const c = window[i];
    const volRatio = c.volume / avgVolume;
    const rise = (c.close - c.open) / c.open;

    if (volRatio > 1.8 && rise > 0.003) {
      if (!bestBC || volRatio > bestBC.volumeRatio) {
        bestBC = {
          idx: candles.length - 40 + i,
          price: c.high,
          volume: c.volume,
          volumeRatio: volRatio,
        };
      }
    }
  }

  return bestBC || null;
}

// Find Upthrust — false breakout above BC high with LOW volume (distribution)
function findUpthrust(candles: Candle[], rangeTop: number, avgVolume: number): { level: number; volume: number; volumeRatio: number; idx: number } | null {
  if (avgVolume === 0) return null;

  for (let i = candles.length - 30; i < candles.length; i++) {
    if (i < 0) continue;
    const c = candles[i];
    const brokeAbove = c.high > rangeTop * 1.001;
    const closedInside = c.close < rangeTop;
    const volRatio = c.volume / avgVolume;
    const lowVolume = volRatio < 0.8;

    if (brokeAbove && closedInside && lowVolume) {
      return { level: c.high, volume: c.volume, volumeRatio: volRatio, idx: i };
    }
  }

  return null;
}

const PHASE_INFO: Record<WyckoffPhase, { ar: string; desc: string }> = {
  NO_SETUP: { ar: "لا يوجد نمط", desc: "لا يوجد نمط وايكوف واضح حالياً" },
  PHASE_A_SC: { ar: "المرحلة A — Selling Climax", desc: "هبوط حاد بحجم تداول هائل (ذروة البيع) — بداية التجميع المحتمل" },
  PHASE_B_RANGE: { ar: "المرحلة B — نطاق جانبي", desc: "السعر يتحرك في نطاق جانبي — تجميع أو توزيع (مراقبة)" },
  PHASE_C_SPRING: { ar: "المرحلة C — Spring/Upthrust", desc: "اختبار وهمي للقاع/القمة بحجم منخفض — تأكيد عدم وجود بائعين/مشترين" },
  PHASE_D_JAC: { ar: "المرحلة D — Jump Across the Creek", desc: "كسر الحد العلوي/السفلي بحجم مرتفع — بداية التحرك" },
  PHASE_E_LPS: { ar: "المرحلة E — LPS (إشارة دخول!)", desc: "إعادة اختبار المستوى المكسور بحجم منخفض — نقطة دخول!" },
  MARKUP: { ar: "Mark-Up — ارتفاع", desc: "السعر في مرحلة صعود بعد الدخول" },
  MARKDOWN: { ar: "Mark-Down — انخفاض", desc: "السعر في مرحلة هبوط بعد الدخول" },
};

export async function detectWyckoffSetup(accountBalance: number = 10000): Promise<WyckoffSetup> {
  const conditions: WyckoffCondition[] = [];

  // Fetch candles (1H for better structure visibility)
  try {
    const { fetchGoldPrice } = await import("@/lib/gold-price");
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
  } catch {}

  const candles = await fetchCandles("1h", 200);

  if (candles.length < 40) {
    return {
      phase: "NO_SETUP",
      phaseAr: PHASE_INFO.NO_SETUP.ar,
      phaseDescription: PHASE_INFO.NO_SETUP.desc,
      setupType: "NONE",
      setupTypeAr: "لا يوجد",
      isEntrySignal: false,
      message: "البيانات غير كافية لتحليل وايكوف",
      conditions: [],
      analysis: {} as any,
      summary: "بيانات غير كافية",
      timestamp: Date.now(),
    };
  }

  // Calculate average volume
  const volumes = candles.map((c) => c.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const lastPrice = candles.at(-1)!.close;

  // === Step 1: Find Trading Range ===
  const range = findTradingRange(candles);

  if (!range) {
    conditions.push({ id: "range", nameAr: "النطاق الجانبي", passed: false, details: "لا يوجد نطاق جانبي واضح" });
    return buildResult("NO_SETUP", "NONE", conditions, false, "السوق لا يعرض نمط وايكوف حالياً — لا يوجد نطاق جانبي", candles, avgVolume, {});
  }

  conditions.push({
    id: "range",
    nameAr: "النطاق الجانبي",
    passed: true,
    details: `القمة: $${range.top.toFixed(2)} | القاع: $${range.bottom.toFixed(2)} | الارتفاع: $${range.height.toFixed(2)}`,
  });

  // === Step 2: Detect SC (Selling Climax) or BC (Buying Climax) ===
  const sc = findSellingClimax(candles, avgVolume);
  const bc = findBuyingClimax(candles, avgVolume);

  const hasAccumulation = sc !== null;
  const hasDistribution = bc !== null;

  if (!hasAccumulation && !hasDistribution) {
    conditions.push({ id: "sc", nameAr: "Selling/Buying Climax", passed: false, details: "لا يوجد ذروة بيع أو شراء واضحة" });
    return buildResult("PHASE_B_RANGE", "NONE", conditions, false, "السوق في مرحلة نطاق جانبي ولم تصل إشارة الدخول بعد", candles, avgVolume, { rangeTop: range.top, rangeBottom: range.bottom, rangeHeight: range.height, avgVolume });
  }

  if (hasAccumulation) {
    conditions.push({
      id: "sc",
      nameAr: "Selling Climax (ذروة البيع)",
      passed: true,
      details: `السعر: $${sc!.price.toFixed(2)} | الحجم: ${sc!.volume.toFixed(0)} (${sc!.volumeRatio.toFixed(1)}× المتوسط)`,
    });
  } else {
    conditions.push({
      id: "bc",
      nameAr: "Buying Climax (ذروة الشراء)",
      passed: true,
      details: `السعر: $${bc!.price.toFixed(2)} | الحجم: ${bc!.volume.toFixed(0)} (${bc!.volumeRatio.toFixed(1)}× المتوسط)`,
    });
  }

  const setupType = hasAccumulation ? "ACCUMULATION" : "DISTRIBUTION";

  // === Step 3: Find Spring (accumulation) or Upthrust (distribution) ===
  const spring = hasAccumulation ? findSpring(candles, sc!.price, range.bottom, avgVolume) : null;
  const upthrust = hasDistribution ? findUpthrust(candles, range.top, avgVolume) : null;
  const hasSpring = spring !== null;
  const hasUpthrust = upthrust !== null;

  if (!hasSpring && !hasUpthrust) {
    // Still in Phase B (range)
    const phaseName = hasAccumulation ? "PHASE_B_RANGE" : "PHASE_B_RANGE";
    conditions.push({ id: "spring", nameAr: "Spring/Upthrust", passed: false, details: "لم يتم كشف Spring/Upthrust بعد" });
    return buildResult(phaseName, setupType, conditions, false, `السوق في مرحلة نطاق جانبي (${hasAccumulation ? "تجميع" : "توزيع"}) ولم تصل إشارة الدخول بعد`, candles, avgVolume, {
      rangeTop: range.top, rangeBottom: range.bottom, rangeHeight: range.height, avgVolume,
      scLevel: sc?.price ?? bc?.price,
      scVolume: sc?.volume ?? bc?.volume,
      scVolumeRatio: sc?.volumeRatio ?? bc?.volumeRatio,
    });
  }

  if (hasSpring) {
    conditions.push({
      id: "spring",
      nameAr: "Spring (اختبار وهمي للقاع)",
      passed: true,
      details: `المستوى: $${spring!.level.toFixed(2)} | الحجم: ${spring!.volume.toFixed(0)} (${spring!.volumeRatio.toFixed(1)}× المتوسط — منخفض )`,
    });
  } else {
    conditions.push({
      id: "upthrust",
      nameAr: "Upthrust (اختبار وهمي للقمة)",
      passed: true,
      details: `المستوى: $${upthrust!.level.toFixed(2)} | الحجم: ${upthrust!.volume.toFixed(0)} (${upthrust!.volumeRatio.toFixed(1)}× المتوسط — منخفض )`,
    });
  }

  // === Step 4: Find JAC (Jump Across the Creek) ===
  const jac = findJAC(candles, range.top, avgVolume);
  // For distribution: find breakdown below range bottom with high volume
  let fti: any = null;
  if (hasDistribution) {
    for (let i = candles.length - 20; i < candles.length; i++) {
      if (i < 0) continue;
      const c = candles[i];
      const brokeBelow = c.close < range.bottom * 0.999;
      const volRatio = c.volume / avgVolume;
      if (brokeBelow && volRatio > 1.5) {
        fti = { level: c.close, volume: c.volume, volumeRatio: volRatio, idx: i };
        break;
      }
    }
  }

  const hasJAC = jac !== null;
  const hasFTI = fti !== null;

  if (!hasJAC && !hasFTI) {
    conditions.push({ id: "jac", nameAr: "JAC/FTI (الكسر بحجم مرتفع)", passed: false, details: "لم يتم كسر النطاق بحجم مرتفع بعد" });
    return buildResult("PHASE_C_SPRING", setupType, conditions, false, `السوق في مرحلة Spring/Upthrust (${hasAccumulation ? "تجميع" : "توزيع"}) ولم تصل إشارة الدخول بعد`, candles, avgVolume, {
      rangeTop: range.top, rangeBottom: range.bottom, rangeHeight: range.height, avgVolume,
      scLevel: sc?.price ?? bc?.price,
      springLevel: spring?.level ?? upthrust?.level,
      springVolume: spring?.volume ?? upthrust?.volume,
      springVolumeRatio: spring?.volumeRatio ?? upthrust?.volumeRatio,
    });
  }

  if (hasJAC) {
    conditions.push({
      id: "jac",
      nameAr: "JAC — Jump Across the Creek",
      passed: true,
      details: `الكسر: $${jac!.level.toFixed(2)} | الحجم: ${jac!.volume.toFixed(0)} (${jac!.volumeRatio.toFixed(1)}× المتوسط — مرتفع )`,
    });
  } else {
    conditions.push({
      id: "fti",
      nameAr: "FTI — Fall Through the Ice",
      passed: true,
      details: `الكسر: $${fti!.level.toFixed(2)} | الحجم: ${fti!.volume.toFixed(0)} (${fti!.volumeRatio.toFixed(1)}× المتوسط — مرتفع )`,
    });
  }

  // === Step 5: Find LPS (Last Point of Support) ===
  const creekLevel = hasJAC ? range.top : range.bottom;
  const jacIdx = hasJAC ? jac!.idx : fti!.idx;

  const lps = findLPS(candles, creekLevel, jacIdx, avgVolume);
  // For distribution: find LPSY (retest of broken support with low volume)
  let lpsy: any = null;
  if (hasDistribution) {
    for (let i = jacIdx + 1; i < candles.length; i++) {
      const c = candles[i];
      const nearIce = Math.abs(c.high - creekLevel) / creekLevel < 0.003;
      const volRatio = c.volume / avgVolume;
      const lowVolume = volRatio < 0.7;
      if (nearIce && lowVolume && c.close < creekLevel) {
        lpsy = { level: c.high, volume: c.volume, volumeRatio: volRatio, idx: i };
        break;
      }
    }
  }

  const hasLPS = lps !== null;
  const hasLPSY = lpsy !== null;

  if (!hasLPS && !hasLPSY) {
    conditions.push({ id: "lps", nameAr: "LPS/LPSY (إعادة اختبار بحجم منخفض)", passed: false, details: "بانتظار إعادة اختبار المستوى المكسور بحجم منخفض" });
    return buildResult("PHASE_D_JAC", setupType, conditions, false, `السوق في مرحلة JAC/FTI (${hasAccumulation ? "تجميع" : "توزيع"}) ولم تصل إشارة الدخول بعد`, candles, avgVolume, {
      rangeTop: range.top, rangeBottom: range.bottom, rangeHeight: range.height, avgVolume,
      scLevel: sc?.price ?? bc?.price,
      springLevel: spring?.level ?? upthrust?.level,
      jacLevel: jac?.level ?? fti?.level,
      jacVolume: jac?.volume ?? fti?.volume,
      jacVolumeRatio: jac?.volumeRatio ?? fti?.volumeRatio,
    });
  }

  // === ALL CONDITIONS MET — ENTRY SIGNAL! ===
  conditions.push({
    id: "lps",
    nameAr: hasLPS ? "LPS (إعادة اختبار بحجم منخفض)" : "LPSY (إعادة اختبار بحجم منخفض)",
    passed: true,
    details: `المستوى: $${(lps?.level ?? lpsy?.level)!.toFixed(2)} | الحجم: ${(lps?.volume ?? lpsy?.volume)!.toFixed(0)} (${(lps?.volumeRatio ?? lpsy?.volumeRatio)!.toFixed(1)}× المتوسط — منخفض )`,
  });

  // === Risk Management ===
  const tradeType = hasAccumulation ? "LONG" : "SHORT";
  const entry = lastPrice;
  const springLevel = spring?.level ?? lps?.level ?? range.bottom;
  const stopLoss = hasAccumulation ? springLevel - PIPS_10 : (upthrust?.level ?? lpsy?.level ?? range.top) + PIPS_10;

  // TP = 2× range height (Measured Move)
  const measuredMove = range.height * 2;
  const tp1 = hasAccumulation ? creekLevel + range.height * 0.5 : creekLevel - range.height * 0.5;
  const tp2 = hasAccumulation ? entry + measuredMove : entry - measuredMove;

  const slDist = Math.abs(entry - stopLoss);
  const tpDist = Math.abs(tp2 - entry);
  const rr = slDist > 0 ? tpDist / slDist : 0;

  const riskAmount = accountBalance * 0.01;
  const lotSize = riskAmount / slDist;
  const potentialProfit = riskAmount * rr;

  conditions.push({
    id: "risk",
    nameAr: "إدارة المخاطر (SL تحت Spring + 10 pips، TP = 2× النطاق)",
    passed: rr >= 1,
    details: `R:R = 1:${rr.toFixed(1)} | SL: $${stopLoss.toFixed(2)} | TP: $${tp2.toFixed(2)} | النطاق: $${range.height.toFixed(2)} | Measured Move: $${measuredMove.toFixed(2)}`,
  });

  const trade: WyckoffSetup["trade"] = {
    type: tradeType,
    typeAr: tradeType === "LONG" ? "شراء (Long)" : "بيع (Short)",
    entry,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp2,
    riskPercent: 1,
    riskRewardRatio: rr,
    lotSize,
    riskAmount,
    potentialProfit,
    rangeHeight: range.height,
    measuredMove,
    springLevel,
    creekLevel,
  };

  return buildResult("PHASE_E_LPS", setupType, conditions, true, ` إشارة دخول وايكوف! ${tradeTypeAr}`, candles, avgVolume, {
    rangeTop: range.top, rangeBottom: range.bottom, rangeHeight: range.height, avgVolume,
    scLevel: sc?.price ?? bc?.price,
    scVolume: sc?.volume ?? bc?.volume,
    scVolumeRatio: sc?.volumeRatio ?? bc?.volumeRatio,
    springLevel: spring?.level ?? upthrust?.level,
    springVolume: spring?.volume ?? upthrust?.volume,
    springVolumeRatio: spring?.volumeRatio ?? upthrust?.volumeRatio,
    jacLevel: jac?.level ?? fti?.level,
    jacVolume: jac?.volume ?? fti?.volume,
    jacVolumeRatio: jac?.volumeRatio ?? fti?.volumeRatio,
    lpsLevel: lps?.level ?? lpsy?.level,
    lpsVolume: lps?.volume ?? lpsy?.volume,
    lpsVolumeRatio: lps?.volumeRatio ?? lpsy?.volumeRatio,
  }, trade);

  function tradeTypeAr() {
    return tradeType === "LONG" ? "شراء" : "بيع";
  }
}

function buildResult(
  phase: WyckoffPhase,
  setupType: string,
  conditions: WyckoffCondition[],
  isEntry: boolean,
  message: string,
  candles: Candle[],
  avgVolume: number,
  analysis: any,
  trade?: WyckoffSetup["trade"],
): WyckoffSetup {
  const info = PHASE_INFO[phase];
  return {
    phase,
    phaseAr: info.ar,
    phaseDescription: info.desc,
    setupType: setupType as any,
    setupTypeAr: setupType === "ACCUMULATION" ? "تجميع" : setupType === "DISTRIBUTION" ? "توزيع" : "لا يوجد",
    isEntrySignal: isEntry,
    message,
    conditions,
    trade,
    analysis: {
      avgVolume,
      currentPhase: phase,
      ...analysis,
    },
    summary: isEntry && trade
      ? `${trade.typeAr} | دخول: $${trade.entry.toFixed(2)} | SL: $${trade.stopLoss.toFixed(2)} | TP: $${trade.takeProfit2.toFixed(2)} | R:R 1:${trade.riskRewardRatio.toFixed(1)} | النطاق: $${trade.rangeHeight.toFixed(2)}`
      : message,
    timestamp: Date.now(),
  };
}
