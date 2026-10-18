// Alpha Factors Library — inspired by Vibe-Trading's 452 alpha factors.
// Each factor returns a score from -100 (bearish) to +100 (bullish).
// The ensemble signal combines all factors with dynamic weighting.

import type { Candle, IndicatorSet } from "@/lib/indicators";
import { detectRegime, type RegimeType } from "@/lib/regime-detection";

export interface AlphaFactor {
  id: string;
  name: string;
  nameAr: string;
  category: "momentum" | "mean_reversion" | "volume" | "volatility" | "trend" | "pattern" | "smc";
  score: number;        // -100 to +100
  weight: number;      // dynamic weight based on regime (0..2)
  confidence: number;  // 0..100
  description: string;
}

export interface EnsembleSignal {
  factors: AlphaFactor[];
  totalScore: number;          // -100 to +100
  finalScore: number;          // normalized 0..100
  action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  actionAr: string;
  confidence: number;          // 0..100
  bullCount: number;
  bearCount: number;
  neutralCount: number;
  regime: RegimeType;
  topFactors: AlphaFactor[];   // top 5 by absolute score
  summary: string;
}

// === Individual alpha factors ===

// 1. RSI Mean Reversion — score: -100 (overbought) to +100 (oversold)
function factorRSI(ind: IndicatorSet): number {
  if (ind.rsi < 30) return 100 - ind.rsi * 2;       // very oversold → +100
  if (ind.rsi < 45) return (45 - ind.rsi) * 4;       // mildly oversold
  if (ind.rsi > 70) return -(ind.rsi - 70) * 3;      // very overbought → -100
  if (ind.rsi > 55) return -(ind.rsi - 55) * 3;      // mildly overbought
  return 0;
}

// 2. MACD Momentum
function factorMACD(ind: IndicatorSet): number {
  const hist = ind.macdHist;
  if (hist > 0) return Math.min(100, hist * 50);
  return Math.max(-100, hist * 50);
}

// 3. EMA Trend Alignment
function factorEMATrend(ind: IndicatorSet): number {
  if (ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) return 100;
  if (ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) return -100;
  if (ind.ema9 > ind.ema21) return 40;
  if (ind.ema9 < ind.ema21) return -40;
  return 0;
}

// 4. Bollinger Band position
function factorBollinger(candles: Candle[], ind: IndicatorSet): number {
  const price = candles.at(-1)?.close ?? 0;
  if (price > ind.bbUpper) return -80;   // breakout above = overbought reversal
  if (price < ind.bbLower) return 80;     // breakout below = oversold reversal
  const range = ind.bbUpper - ind.bbLower;
  if (range === 0) return 0;
  const pct = (price - ind.bbLower) / range;  // 0..1
  return Math.round((0.5 - pct) * 100);       // middle = 0, lower = +100, upper = -100
}

// 5. Stochastic
function factorStochastic(ind: IndicatorSet): number {
  if (ind.stochasticK < 20) return 80;
  if (ind.stochasticK > 80) return -80;
  if (ind.stochasticK > ind.stochasticD) return 30;
  if (ind.stochasticK < ind.stochasticD) return -30;
  return 0;
}

// 6. VWAP position
function factorVWAP(candles: Candle[], ind: IndicatorSet): number {
  const price = candles.at(-1)?.close ?? 0;
  const diff = (price - ind.vwap) / ind.vwap;
  // Slightly above VWAP = bullish; far above = overbought
  if (diff > 0.005) return -Math.min(100, diff * 10000);
  if (diff < -0.005) return Math.min(100, -diff * 10000);
  return Math.round(diff * 5000);
}

// 7. ADX trend strength (no direction, just confirms other signals)
function factorADXStrength(ind: IndicatorSet): number {
  if (ind.adx < 20) return 0;       // weak trend, no signal
  // Combine with EMA direction
  if (ind.ema9 > ind.ema21) return Math.min(100, ind.adx * 2);
  if (ind.ema9 < ind.ema21) return Math.max(-100, -ind.adx * 2);
  return 0;
}

// 8. Williams %R
function factorWilliamsR(ind: IndicatorSet): number {
  if (ind.williamsR < -80) return 80;
  if (ind.williamsR > -20) return -80;
  return 0;
}

// 9. CCI (Commodity Channel)
function factorCCI(ind: IndicatorSet): number {
  if (ind.cci < -100) return 80;
  if (ind.cci > 100) return -80;
  return Math.round(-ind.cci / 2);
}

// 10. MFI (Money Flow Index)
function factorMFI(ind: IndicatorSet): number {
  if (ind.mfi < 20) return 90;
  if (ind.mfi > 80) return -90;
  if (ind.mfi < 45) return Math.round((45 - ind.mfi) * 2);
  if (ind.mfi > 55) return Math.round(-(ind.mfi - 55) * 2);
  return 0;
}

// 11. OBV (On-Balance Volume) trend
function factorOBV(ind: IndicatorSet): number {
  if (ind.obvTrend === "bullish") return 70;
  if (ind.obvTrend === "bearish") return -70;
  return 0;
}

// 12. Ichimoku Cloud
function factorIchimoku(ind: IndicatorSet): number {
  if (ind.ichimokuCloud === "bullish" && ind.ichimokuTenkan > ind.ichimokuKijun) return 90;
  if (ind.ichimokuCloud === "bearish" && ind.ichimokuTenkan < ind.ichimokuKijun) return -90;
  if (ind.ichimokuCloud === "bullish") return 50;
  if (ind.ichimokuCloud === "bearish") return -50;
  return 0;
}

// 13. Price vs SMA200 (long-term trend)
function factorPriceVsSMA200(candles: Candle[], ind: IndicatorSet): number {
  const price = candles.at(-1)?.close ?? 0;
  if (price > ind.sma200) return Math.min(100, ((price - ind.sma200) / ind.sma200) * 5000);
  return Math.max(-100, ((price - ind.sma200) / ind.sma200) * 5000);
}

// 14. Momentum (rate of change over last 10 candles)
function factorMomentum(candles: Candle[]): number {
  if (candles.length < 11) return 0;
  const close10 = candles.at(-11)!.close;
  const closeNow = candles.at(-1)!.close;
  const roc = ((closeNow - close10) / close10) * 100;
  return Math.max(-100, Math.min(100, roc * 10));
}

// 15. Volume trend
function factorVolumeTrend(ind: IndicatorSet): number {
  if (ind.volumeTrend === "high") {
    // High volume confirms direction (use MACD direction)
    return ind.macdHist > 0 ? 60 : -60;
  }
  if (ind.volumeTrend === "low") return 0;
  return ind.macdHist > 0 ? 30 : -30;
}

// 16. Volatility expansion (ATR)
function factorVolatilityExpansion(ind: IndicatorSet): number {
  // High ATR relative to price = potential breakout
  const atrPct = (ind.atr / 1000) * 100; // rough
  if (atrPct > 0.5) {
    // Combine with trend direction
    return ind.macdHist > 0 ? 40 : -40;
  }
  return 0;
}

// 17. Candle pattern (last 3 candles)
function factorCandlePattern(candles: Candle[]): number {
  if (candles.length < 3) return 0;
  const last3 = candles.slice(-3);
  const bullCount = last3.filter((c) => c.close > c.open).length;
  const avgMove = last3.reduce((s, c) => s + (c.close - c.open), 0) / 3;
  if (bullCount === 3) return Math.min(80, 50 + Math.abs(avgMove) * 100);
  if (bullCount === 0) return Math.max(-80, -(50 + Math.abs(avgMove) * 100));
  return (bullCount - 1.5) * 20;
}

// 18. Higher high + higher low (uptrend structure)
function factorTrendStructure(candles: Candle[]): number {
  if (candles.length < 20) return 0;
  const recent = candles.slice(-20);
  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);
  const firstHalf = recent.slice(0, 10);
  const secondHalf = recent.slice(10);
  const fhHigh = Math.max(...firstHalf.map((c) => c.high));
  const shHigh = Math.max(...secondHalf.map((c) => c.high));
  const fhLow = Math.min(...firstHalf.map((c) => c.low));
  const shLow = Math.min(...secondHalf.map((c) => c.low));
  if (shHigh > fhHigh && shLow > fhLow) return 80;
  if (shHigh < fhHigh && shLow < fhLow) return -80;
  return 0;
}

// 19. Volume spike (current vs avg)
function factorVolumeSpike(candles: Candle[], ind: IndicatorSet): number {
  if (ind.avgVolume === 0) return 0;
  const ratio = ind.volume / ind.avgVolume;
  if (ratio > 2) {
    // 2x avg volume = strong conviction in direction
    return ind.macdHist > 0 ? 70 : -70;
  }
  if (ratio > 1.5) {
    return ind.macdHist > 0 ? 40 : -40;
  }
  return 0;
}

// 20. Support/Resistance proximity
function factorSupportResistance(candles: Candle[], ind: IndicatorSet): number {
  const price = candles.at(-1)?.close ?? 0;
  const distToSupport = Math.abs(price - ind.support) / price;
  const distToResistance = Math.abs(price - ind.resistance) / price;
  if (distToSupport < 0.002) return 50;   // near support = bullish bounce
  if (distToResistance < 0.002) return -50; // near resistance = bearish reversal
  return 0;
}

// Dynamic weight based on regime
function getRegimeWeight(category: AlphaFactor["category"], regime: RegimeType): number {
  const weightMap: Record<RegimeType, Partial<Record<AlphaFactor["category"], number>>> = {
    trending_bull: {
      trend: 1.8,
      momentum: 1.5,
      volume: 1.3,
      mean_reversion: 0.4,
      pattern: 1.0,
      smc: 1.2,
      volatility: 0.8,
    },
    trending_bear: {
      trend: 1.8,
      momentum: 1.5,
      volume: 1.3,
      mean_reversion: 0.4,
      pattern: 1.0,
      smc: 1.2,
      volatility: 0.8,
    },
    ranging_neutral: {
      mean_reversion: 1.8,
      pattern: 1.5,
      trend: 0.4,
      momentum: 0.6,
      volume: 1.0,
      smc: 0.8,
      volatility: 0.7,
    },
    volatile_breakout: {
      volatility: 1.8,
      volume: 1.5,
      momentum: 1.3,
      pattern: 1.2,
      trend: 0.8,
      mean_reversion: 0.3,
      smc: 1.0,
    },
    accumulation: {
      smc: 1.6,
      volume: 1.4,
      pattern: 1.2,
      mean_reversion: 1.3,
      trend: 0.6,
      momentum: 0.7,
      volatility: 0.5,
    },
    distribution: {
      smc: 1.6,
      volume: 1.4,
      pattern: 1.2,
      mean_reversion: 1.3,
      trend: 0.6,
      momentum: 0.7,
      volatility: 0.5,
    },
  };
  return weightMap[regime]?.[category] ?? 1.0;
}

export function computeEnsembleSignal(
  candles: Candle[],
  ind: IndicatorSet,
): EnsembleSignal {
  // Detect regime first
  const regimeSignal = detectRegime(candles, ind);
  const regime = regimeSignal.regime;

  // Compute all factors
  const rawFactors: Omit<AlphaFactor, "weight">[] = [
    { id: "rsi", name: "RSI Mean Reversion", nameAr: "ارتداد RSI", category: "mean_reversion", score: factorRSI(ind), confidence: 80, description: "RSI < 30 = تشبع بيعي (فرصة شراء)" },
    { id: "macd", name: "MACD Momentum", nameAr: "زخم MACD", category: "momentum", score: factorMACD(ind), confidence: 85, description: "هيستوغرام MACD الموجب = زخم صاعد" },
    { id: "ema_trend", name: "EMA Trend", nameAr: "اتجاه EMA", category: "trend", score: factorEMATrend(ind), confidence: 90, description: "ترتيب EMA 9>21>50 = اتجاه صاعد" },
    { id: "bollinger", name: "BB Position", nameAr: "موقع Bollinger", category: "volatility", score: factorBollinger(candles, ind), confidence: 70, description: "السعر عند الباند السفلي = فرصة شراء" },
    { id: "stochastic", name: "Stochastic", nameAr: "ستوكاستيك", category: "mean_reversion", score: factorStochastic(ind), confidence: 75, description: "K<20 = تشبع بيعي" },
    { id: "vwap", name: "VWAP", nameAr: "VWAP", category: "volume", score: factorVWAP(candles, ind), confidence: 80, description: "السعر فوق VWAP = قوة شرائية" },
    { id: "adx_strength", name: "ADX Strength", nameAr: "قوة ADX", category: "trend", score: factorADXStrength(ind), confidence: 85, description: "ADX>25 = اتجاه قوي" },
    { id: "williams_r", name: "Williams %R", nameAr: "ويليامز %R", category: "mean_reversion", score: factorWilliamsR(ind), confidence: 70, description: "%R<-80 = تشبع بيعي" },
    { id: "cci", name: "CCI", nameAr: "CCI", category: "mean_reversion", score: factorCCI(ind), confidence: 72, description: "CCI<-100 = فرصة شراء" },
    { id: "mfi", name: "MFI", nameAr: "MFI", category: "volume", score: factorMFI(ind), confidence: 78, description: "MFI<20 = تدفق نقدي بيعي" },
    { id: "obv", name: "OBV Trend", nameAr: "اتجاه OBV", category: "volume", score: factorOBV(ind), confidence: 75, description: "OBV صاعد = تجميع" },
    { id: "ichimoku", name: "Ichimoku Cloud", nameAr: "سحابة Ichimoku", category: "trend", score: factorIchimoku(ind), confidence: 82, description: "Senkou A>B = سحابة صاعدة" },
    { id: "price_sma200", name: "Price vs SMA200", nameAr: "السعر مقابل SMA200", category: "trend", score: factorPriceVsSMA200(candles, ind), confidence: 88, description: "السعر فوق SMA200 = اتجاه صاعد طويل الأمد" },
    { id: "momentum", name: "Rate of Change (10)", nameAr: "معدل التغير", category: "momentum", score: factorMomentum(candles), confidence: 80, description: "ROC الموجب = زخم صاعد" },
    { id: "volume_trend", name: "Volume Trend", nameAr: "اتجاه الحجم", category: "volume", score: factorVolumeTrend(ind), confidence: 70, description: "حجم مرتفع يؤكد الاتجاه" },
    { id: "vol_expansion", name: "Volatility Expansion", nameAr: "توسع التقلب", category: "volatility", score: factorVolatilityExpansion(ind), confidence: 65, description: "ATR مرتفع = اختراق محتمل" },
    { id: "candle_pattern", name: "Candle Pattern", nameAr: "نمط الشموع", category: "pattern", score: factorCandlePattern(candles), confidence: 68, description: "3 شموع خضراء = زخم صاعد" },
    { id: "trend_structure", name: "Trend Structure", nameAr: "بنية الاتجاه", category: "pattern", score: factorTrendStructure(candles), confidence: 76, description: "قمم وقيعان أعلى = اتجاه صاعد" },
    { id: "volume_spike", name: "Volume Spike", nameAr: "ارتفاع الحجم", category: "volume", score: factorVolumeSpike(candles, ind), confidence: 73, description: "حجم 2x المتوسط = اقتناع قوي" },
    { id: "sr_proximity", name: "Support/Resistance", nameAr: "الدعم/المقاومة", category: "smc", score: factorSupportResistance(candles, ind), confidence: 72, description: "قرب الدعم = ارتداد محتمل" },
  ];

  // Apply dynamic weights based on regime
  const factors: AlphaFactor[] = rawFactors.map((f) => ({
    ...f,
    weight: getRegimeWeight(f.category, regime),
  }));

  // Weighted score
  let weightedSum = 0;
  let totalWeight = 0;
  for (const f of factors) {
    weightedSum += f.score * f.weight * (f.confidence / 100);
    totalWeight += f.weight * (f.confidence / 100);
  }
  const totalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Normalize to 0..100 (where -100 = strong sell, +100 = strong buy)
  const finalScore = Math.round(Math.max(-100, Math.min(100, totalScore)));

  // Determine action
  let action: EnsembleSignal["action"];
  if (finalScore >= 60) action = "STRONG_BUY";
  else if (finalScore >= 20) action = "BUY";
  else if (finalScore > -20) action = "HOLD";
  else if (finalScore > -60) action = "SELL";
  else action = "STRONG_SELL";

  const actionAr =
    action === "STRONG_BUY" ? "شراء قوي" :
    action === "BUY" ? "شراء" :
    action === "HOLD" ? "انتظار" :
    action === "SELL" ? "بيع" : "بيع قوي";

  const bullCount = factors.filter((f) => f.score > 20).length;
  const bearCount = factors.filter((f) => f.score < -20).length;
  const neutralCount = factors.length - bullCount - bearCount;

  // Top 5 factors by absolute score
  const topFactors = [...factors].sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 5);

  // Confidence = how aligned the factors are (bull vs bear consensus)
  const consensus = Math.abs(bullCount - bearCount) / factors.length;
  const confidence = Math.round(Math.min(98, Math.abs(finalScore) * 0.6 + consensus * 50 + 30));

  const summary = `Ensemble (${factors.length} عوامل): ${actionAr} بثقة ${confidence}% | ${bullCount} صعودي / ${bearCount} هبوطي / ${neutralCount} محايد | النظام: ${regimeSignal.regimeAr} | Top: ${topFactors[0]?.nameAr ?? "-"}`;

  return {
    factors,
    totalScore: Math.round(totalScore * 10) / 10,
    finalScore,
    action,
    actionAr,
    confidence,
    bullCount,
    bearCount,
    neutralCount,
    regime,
    topFactors,
    summary,
  };
}
