// Market Regime Detection — HMM-inspired (inspired by zero-was-here/tradingbot)
// Classifies market state into 6 regimes using rule-based approximation of
// Hidden Markov Model with ADX, ATR, RSI, EMA, and price action analysis.

import type { Candle, IndicatorSet } from "@/lib/indicators";

export type RegimeType =
  | "trending_bull"      // قوي صاعد
  | "trending_bear"      // قوي هابط
  | "ranging_neutral"    // متذبذب محايد
  | "volatile_breakout"  // متقلّب اختراق
  | "accumulation"       // تجميع
  | "distribution";      // توزيع

export interface RegimeSignal {
  regime: RegimeType;
  regimeAr: string;
  regimeEn: string;
  confidence: number;        // 0..100
  volatility: "low" | "medium" | "high";
  trendStrength: number;     // 0..100 (based on ADX)
  recommendedStrategy: string;
  recommendedRiskMultiplier: number; // 0.5 (cautious) .. 2.0 (aggressive)
  expectedHoldTime: string;  // "scalp" | "intraday" | "swing"
  indicators: {
    adx: number;
    atr: number;
    atrPct: number;     // ATR as % of price
    rsi: number;
    emaSpread: number;  // (ema9 - ema50) / ema50 * 100
    volatility: number; // stddev of last 20 closes
  };
  summary: string;
}

const REGIME_INFO: Record<RegimeType, { ar: string; en: string; strategy: string; risk: number; hold: string; color: string }> = {
  trending_bull: {
    ar: "صاعد قوي",
    en: "Trending Bull",
    strategy: "شراء عند الارتداد من الدعم، استراتيجية EMA crossover، trailing stop",
    risk: 1.5,
    hold: "intraday-swing",
    color: "#22d39a",
  },
  trending_bear: {
    ar: "هابط قوي",
    en: "Trending Bear",
    strategy: "بيع عند الارتداد من المقاومة، استراتيجية EMA crossover، trailing stop",
    risk: 1.5,
    hold: "intraday-swing",
    color: "#ff4d6a",
  },
  ranging_neutral: {
    ar: "متذبذب محايد",
    en: "Ranging Neutral",
    strategy: "RSI Reversal — شراء عند RSI<30 من الدعم، بيع عند RSI>70 من المقاومة، وقف خسارة ضيق",
    risk: 0.75,
    hold: "scalp-intraday",
    color: "#8a96a8",
  },
  volatile_breakout: {
    ar: "متقلّب اختراق",
    en: "Volatile Breakout",
    strategy: "انتظر الاختراق المؤكد (إغلاق فوق/تحت المستوى + حجم مرتفع)، ادخل بعد الإعادة + تأكيد",
    risk: 0.5,
    hold: "intraday",
    color: "#fbbf24",
  },
  accumulation: {
    ar: "تجميع",
    en: "Accumulation",
    strategy: "شراء تدريجي عند الانخفاضات، توقع اختراق صاعد قادم، patience + scaling in",
    risk: 1.0,
    hold: "swing-position",
    color: "#5b8cff",
  },
  distribution: {
    ar: "توزيع",
    en: "Distribution",
    strategy: "بيع تدريجي عند الارتفاعات، توقع اختراق هابط قادم، scaling out + tighten stops",
    risk: 1.0,
    hold: "swing-position",
    color: "#b07cff",
  },
};

export function detectRegime(candles: Candle[], ind: IndicatorSet): RegimeSignal {
  if (candles.length < 30 || !ind) {
    return {
      regime: "ranging_neutral",
      regimeAr: "متذبذب محايد",
      regimeEn: "Ranging Neutral",
      confidence: 0,
      volatility: "low",
      trendStrength: 0,
      recommendedStrategy: "بيانات غير كافية",
      recommendedRiskMultiplier: 1,
      expectedHoldTime: "scalp",
      indicators: { adx: 0, atr: 0, atrPct: 0, rsi: 50, emaSpread: 0, volatility: 0 },
      summary: "بيانات غير كافية",
    };
  }

  const lastPrice = candles.at(-1)!.close;
  const closes = candles.map((c) => c.close);
  const recentCloses = closes.slice(-20);

  // Volatility = std dev of last 20 closes
  const mean = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;
  const variance = recentCloses.reduce((s, c) => s + (c - mean) ** 2, 0) / recentCloses.length;
  const volatility = Math.sqrt(variance);

  const atrPct = lastPrice > 0 ? (ind.atr / lastPrice) * 100 : 0;
  const emaSpread = ind.ema50 > 0 ? ((ind.ema9 - ind.ema50) / ind.ema50) * 100 : 0;
  const trendStrength = ind.adx;

  // Detect regime using multiple factors
  let regime: RegimeType = "ranging_neutral";
  let confidence = 40;

  // 1. Strong trending regimes (ADX > 25 + clear EMA direction)
  if (trendStrength > 25) {
    if (emaSpread > 0.05 && ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) {
      regime = "trending_bull";
      confidence = Math.min(95, 60 + trendStrength);
    } else if (emaSpread < -0.05 && ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) {
      regime = "trending_bear";
      confidence = Math.min(95, 60 + trendStrength);
    }
  }

  // 2. Volatile breakout (ATR % > 0.5 + recent move)
  if (atrPct > 0.5) {
    const recent20 = candles.slice(-20);
    const range20 = Math.max(...recent20.map((c) => c.high)) - Math.min(...recent20.map((c) => c.low));
    const rangePct = (range20 / lastPrice) * 100;
    if (rangePct > 1.5 && trendStrength > 20) {
      regime = "volatile_breakout";
      confidence = Math.min(85, 55 + Math.round(rangePct * 5));
    }
  }

  // 3. Accumulation/Distribution (low volatility + price compression + RSI extremes)
  if (atrPct < 0.3 && trendStrength < 20) {
    // Check if price is at lower (accumulation) or upper (distribution) of range
    const recent50 = candles.slice(-50);
    const high50 = Math.max(...recent50.map((c) => c.high));
    const low50 = Math.min(...recent50.map((c) => c.low));
    const range50 = high50 - low50;
    const position = range50 > 0 ? (lastPrice - low50) / range50 : 0.5;

    if (position < 0.35 && ind.rsi < 45) {
      regime = "accumulation";
      confidence = Math.min(80, 50 + Math.round((0.5 - position) * 60));
    } else if (position > 0.65 && ind.rsi > 55) {
      regime = "distribution";
      confidence = Math.min(80, 50 + Math.round((position - 0.5) * 60));
    }
  }

  // 4. Default ranging if no other regime matches
  if (regime === "ranging_neutral" && trendStrength < 20) {
    confidence = Math.min(70, 35 + Math.round((20 - trendStrength) * 1.5));
  }

  const info = REGIME_INFO[regime];
  const vol: "low" | "medium" | "high" = atrPct > 0.5 ? "high" : atrPct > 0.25 ? "medium" : "low";

  const summary = `${info.ar} (${confidence}% ثقة) | ADX=${trendStrength} | ATR=${atrPct.toFixed(2)}% | RSI=${ind.rsi} | تشتت EMA=${emaSpread.toFixed(2)}%`;

  return {
    regime,
    regimeAr: info.ar,
    regimeEn: info.en,
    confidence,
    volatility: vol,
    trendStrength,
    recommendedStrategy: info.strategy,
    recommendedRiskMultiplier: info.risk,
    expectedHoldTime: info.hold,
    indicators: {
      adx: Math.round(trendStrength * 10) / 10,
      atr: ind.atr,
      atrPct: Math.round(atrPct * 100) / 100,
      rsi: ind.rsi,
      emaSpread: Math.round(emaSpread * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
    },
    summary,
  };
}
