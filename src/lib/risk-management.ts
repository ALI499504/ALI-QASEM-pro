// Advanced Risk Management — Kelly Criterion + ATR-based stops
// Inspired by professional trading bots (Freqtrade, OctoBot, zero-was-here)

import type { IndicatorSet } from "@/lib/indicators";
import { detectRegime } from "@/lib/regime-detection";
import type { Candle } from "@/lib/indicators";

export interface RiskAssessment {
  // Position sizing
  recommendedLotSize: number;       // in lots
  riskAmount: number;                 // in $ (per trade)
  potentialProfit: number;            // in $ (at TP)
  riskRewardRatio: number;            // e.g. 1:2.5
  kellyFull: number;                  // % of capital (full Kelly)
  kellyHalf: number;                  // % of capital (half Kelly — recommended)
  kellyQuarter: number;               // % of capital (quarter Kelly — safe)

  // Stop loss / Take profit
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  stopLossPips: number;
  stopLossPercent: number;
  riskPerTradePercent: number;

  // Market risk
  marketRiskLevel: "low" | "medium" | "high" | "extreme";
  riskMultiplier: number;            // 0.5 (cautious) .. 2.0 (aggressive)
  maxConcurrentTrades: number;
  maxDailyLossPercent: number;        // % of capital

  // Pre-trade checklist
  checklist: {
    label: string;
    passed: boolean;
    severity: "info" | "warning" | "critical";
  }[];

  summary: string;
}

export function computeRiskManagement(
  candles: Candle[],
  ind: IndicatorSet,
  accountBalance: number,
  direction: "BUY" | "SELL",
  confidence: number,
): RiskAssessment {
  const currentPrice = candles.at(-1)?.close ?? 0;
  const regime = detectRegime(candles, ind);
  const riskMultiplier = regime.recommendedRiskMultiplier;
  const atr = ind.atr > 0 ? ind.atr : currentPrice * 0.004;
  const support = ind.support > 0 ? ind.support : currentPrice - atr * 1.5;
  const resistance = ind.resistance > 0 ? ind.resistance : currentPrice + atr * 1.5;

  // === Stop Loss — ATR-based ===
  const slDistance = atr * 1.5;  // 1.5 * ATR for breathing room
  const stopLoss = direction === "BUY" ? currentPrice - slDistance : currentPrice + slDistance;
  const stopLossPips = Math.abs(currentPrice - stopLoss);
  const stopLossPercent = (Math.abs(currentPrice - stopLoss) / currentPrice) * 100;

  // === Take Profit — R:R = 1:2 minimum ===
  // TP1 = 1:1.5, TP2 = 1:2, TP3 = 1:3
  const tp1 = direction === "BUY" ? currentPrice + slDistance * 1.5 : currentPrice - slDistance * 1.5;
  const tp2 = direction === "BUY" ? currentPrice + slDistance * 2 : currentPrice - slDistance * 2;
  const tp3 = direction === "BUY" ? currentPrice + slDistance * 3 : currentPrice - slDistance * 3;

  // === Risk per trade — STRICT USER SPEC ===
  // Base risk = 1% of account (HARD CAP, no adjustments)
  // On $1000 account → $10 max risk per trade
  // On 0.01 lot for XAUUSD, SL must be ~$1 to keep risk at $10
  const baseRiskPercent = 1.0;
  // Regime reduces risk in volatile markets, but never increases beyond 1%
  const riskPerTradePercent = Math.min(baseRiskPercent, baseRiskPercent * riskMultiplier);
  const clampedRiskPercent = Math.min(1.0, Math.max(0.25, riskPerTradePercent));

  const riskAmount = accountBalance * (clampedRiskPercent / 100);
  // Hard cap: max $10 risk per trade on $1000 account (user spec)
  const cappedRiskAmount = Math.min(riskAmount, accountBalance * 0.01);

  // === Kelly Criterion ===
  // Kelly % = W - (1-W)/R
  const winRate = Math.min(0.7, Math.max(0.4, confidence / 100 * 0.7 + 0.25));
  const rewardRatio = 1.5;  // min R:R 1:1.5 per user spec
  const kellyFull = Math.max(0, (winRate - (1 - winRate) / rewardRatio) * 100);
  const kellyHalf = kellyFull * 0.5;
  const kellyQuarter = kellyFull * 0.25;

  // === Position sizing — STRICT for $1000 account ===
  // XAUUSD: 1 lot = 100 oz, $1 price move = $100 P/L per lot
  // For 0.01 lot: $1 price move = $1 P/L
  // Risk = (SL distance in $) * lotSize * 100
  // lotSize = cappedRiskAmount / (slDistance * 100)
  // On $1000 with $10 risk and $1 SL distance: lotSize = 10/(1*100) = 0.1 → fixed at 0.01
  const recommendedLotSize = 0.01;
  const potentialProfit = cappedRiskAmount * rewardRatio * 100; // XAUUSD: 1 lot = 100 oz, so profit = risk * RR * 100

  // === Market risk level ===
  const atrPct = (atr / currentPrice) * 100;
  const marketRiskLevel: RiskAssessment["marketRiskLevel"] =
    atrPct > 0.8 ? "extreme" :
    atrPct > 0.5 ? "high" :
    atrPct > 0.25 ? "medium" : "low";

  // === Trade limits ===
  const maxConcurrentTrades = marketRiskLevel === "extreme" ? 1 :
    marketRiskLevel === "high" ? 2 :
    marketRiskLevel === "medium" ? 3 : 4;

  const maxDailyLossPercent = 3;  // hard cap

  // === Pre-trade checklist ===
  const checklist: RiskAssessment["checklist"] = [
    {
      label: `ثقة الإشارة ≥ 60% (الحالي: ${confidence}%)`,
      passed: confidence >= 60,
      severity: confidence < 50 ? "critical" : confidence < 60 ? "warning" : "info",
    },
    {
      label: `R:R 1:1.3-3 (الحالي: 1:${(Math.abs(tp1 - currentPrice) / slDistance).toFixed(2)})`,
      passed: Math.abs(tp1 - currentPrice) / slDistance >= 1.3,
      severity: "info",
    },
    {
      label: `مستوى مخاطر السوق مقبول (الحالي: ${marketRiskLevel === "ar" ? "" : marketRiskLevel})`,
      passed: marketRiskLevel !== "extreme",
      severity: marketRiskLevel === "extreme" ? "critical" : marketRiskLevel === "high" ? "warning" : "info",
    },
    {
      label: `نسبة المخاطرة ≤ 1% (الحالي: ${clampedRiskPercent.toFixed(2)}%) — حد صارم`,
      passed: clampedRiskPercent <= 1.0,
      severity: clampedRiskPercent > 1.0 ? "critical" : "info",
    },
    {
      label: `ATR ضمن النطاق الطبيعي (الحالي: ${atr.toFixed(2)})`,
      passed: atrPct < 1,
      severity: atrPct > 1 ? "critical" : atrPct > 0.8 ? "warning" : "info",
    },
    {
      label: `نظام السوق مناسب (${regime.regimeAr})`,
      passed: !["volatile_breakout"].includes(regime.regime),
      severity: regime.regime === "volatile_breakout" ? "warning" : "info",
    },
    {
      label: `منطقة الدخول جيدة (${direction === "BUY" ? "قرب الدعم" : "قرب المقاومة"})`,
      passed: direction === "BUY"
        ? currentPrice <= support * 1.005
        : currentPrice >= resistance * 0.995,
      severity: "info",
    },
  ];

  const passedCount = checklist.filter((c) => c.passed).length;
  const totalCount = checklist.length;
  const criticalCount = checklist.filter((c) => !c.passed && c.severity === "critical").length;

  const summary = `${direction === "BUY" ? "شراء" : "بيع"} ${recommendedLotSize.toFixed(3)} لوت | مخاطرة $${cappedRiskAmount.toFixed(0)} (${clampedRiskPercent.toFixed(2)}%) | SL=$${stopLoss.toFixed(2)} (${stopLossPercent.toFixed(2)}%) | TP1=$${tp1.toFixed(2)} | R:R 1:${(Math.abs(tp1 - currentPrice) / slDistance).toFixed(2)} (min 1.3, target 3.0) | Kelly ${kellyHalf.toFixed(1)}% | ${passedCount}/${totalCount} شروط | مستوى المخاطر: ${marketRiskLevel}`;

  return {
    recommendedLotSize,
    riskAmount: cappedRiskAmount,
    potentialProfit,
    riskRewardRatio: Math.max(1.3, Math.abs(tp1 - currentPrice) / slDistance),
    kellyFull,
    kellyHalf,
    kellyQuarter,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    stopLossPips,
    stopLossPercent,
    riskPerTradePercent: clampedRiskPercent,
    marketRiskLevel,
    riskMultiplier,
    maxConcurrentTrades,
    maxDailyLossPercent,
    checklist,
    summary,
  };
}
