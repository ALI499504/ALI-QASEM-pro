"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Activity, Waves, Zap,
  Gauge, BarChart3, AlertCircle,
} from "lucide-react";
import type { Candle, IndicatorSet } from "@/lib/indicators";

interface Props {
  candles: Candle[];
  indicators: IndicatorSet | null;
}

interface Regime {
  type: "trending_bull" | "trending_bear" | "ranging" | "volatile";
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  confidence: number;
  recommended: string;
  atr: number;
  adx: number;
  volatilityLevel: "low" | "medium" | "high";
}

export default function MarketRegimeDetector({ candles, indicators }: Props) {
  const regime = useMemo(() => detectRegime(candles, indicators), [candles, indicators]);

  if (!regime) return null;

  const metrics = [
    { label: "ADX (قوة الاتجاه)", value: regime.adx.toFixed(0), color: regime.adx > 25 ? "#10b981" : "#94a3b8", status: regime.adx > 25 ? "اتجاه قوي" : "ضعيف" },
    { label: "ATR (التقلب)", value: regime.atr.toFixed(2), color: regime.volatilityLevel === "high" ? "#f43f5e" : regime.volatilityLevel === "medium" ? "#fbbf24" : "#10b981", status: regime.volatilityLevel === "high" ? "مرتفع" : regime.volatilityLevel === "medium" ? "متوسط" : "منخفض" },
    { label: "RSI", value: indicators?.rsi?.toFixed(0) ?? "—", color: "#3b82f6", status: (indicators?.rsi ?? 50) < 30 ? "بيعي" : (indicators?.rsi ?? 50) > 70 ? "شرائي" : "محايد" },
    { label: "EMA ترتيب", value: indicators?.emaTrend === "bullish" ? "صاعد" : indicators?.emaTrend === "bearish" ? "هابط" : "متشابك", color: indicators?.emaTrend === "bullish" ? "#10b981" : indicators?.emaTrend === "bearish" ? "#f43f5e" : "#94a3b8", status: "" },
  ];

  return (
    <div
      className="relative rounded-xl p-4 border overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${regime.bgColor}08, transparent)`,
        borderColor: `${regime.color}25`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${regime.color}15`, border: `1px solid ${regime.color}30` }}>
            {regime.icon}
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: regime.color }}>{regime.label}</div>
            <div className="text-[9px] text-muted-foreground font-mono">{regime.labelEn}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-muted-foreground">ثقة التصنيف</div>
          <div className="text-sm font-bold tabular-nums ltr-nums" style={{ color: regime.color }}>{regime.confidence}%</div>
        </div>
      </div>

      {/* Regime bar visualization */}
      <div className="mb-3">
        <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary">
          {(["trending_bull", "trending_bear", "ranging", "volatile"] as const).map((t) => {
            const r = getRegimeInfo(t);
            const isCurrent = regime.type === t;
            const pct = isCurrent ? regime.confidence : 0;
            return (
              <motion.div
                key={t}
                initial={{ width: 0 }}
                animate={{ width: isCurrent ? `${pct}%` : "0%" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ background: r.color }}
                className="h-full"
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground/60 mt-0.5">
          <span>صاعد</span>
          <span>هابط</span>
          <span>متذبذب</span>
          <span>متقلّب</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {metrics.map((m, i) => (
          <div key={i} className="stat-box-modern">
            <div className="stat-label">{m.label}</div>
            <div className="stat-value tabular-nums ltr-nums" style={{ color: m.color }}>{m.value}</div>
            {m.status && <div className="text-[8px] text-muted-foreground">{m.status}</div>}
          </div>
        ))}
      </div>

      {/* AI recommendation */}
      <div className="px-3 py-2 rounded-lg border" style={{ background: `${regime.color}05`, borderColor: `${regime.color}15` }}>
        <div className="flex items-start gap-2">
          <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: regime.color }} />
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-bold" style={{ color: regime.color }}>استراتيجية موصى بها: </span>
            {regime.recommended}
          </div>
        </div>
      </div>
    </div>
  );
}

function detectRegime(candles: Candle[], indicators: IndicatorSet | null): Regime | null {
  if (!candles.length || !indicators) return null;

  // ADX approximation (using EMA separation + range)
  const ema9 = indicators.ema9;
  const ema50 = indicators.ema50;
  const emaSeparation = Math.abs(ema9 - ema50) / ema50 * 100;
  const adx = Math.min(80, emaSeparation * 8 + 15);

  // ATR-based volatility
  const atr = indicators.atr;
  const avgPrice = candles.at(-1)?.close ?? 1000;
  const atrPct = (atr / avgPrice) * 100;
  const volatilityLevel: "low" | "medium" | "high" = atrPct > 0.8 ? "high" : atrPct > 0.4 ? "medium" : "low";

  // Recent range (last 20 candles)
  const recent = candles.slice(-20);
  const range = Math.max(...recent.map(c => c.high)) - Math.min(...recent.map(c => c.low));
  const avgRange = recent.reduce((s, c) => s + (c.high - c.low), 0) / recent.length;
  const rangeRatio = range / avgRange; // if < 2, ranging; if > 3, trending

  // RSI
  const rsi = indicators.rsi;
  const emaTrend = indicators.emaTrend;

  // Determine regime
  let type: Regime["type"] = "ranging";
  let confidence = 50;

  if (adx > 30 && emaTrend === "bullish") {
    type = "trending_bull";
    confidence = Math.min(95, 50 + adx * 0.5 + (rangeRatio > 3 ? 15 : 0));
  } else if (adx > 30 && emaTrend === "bearish") {
    type = "trending_bear";
    confidence = Math.min(95, 50 + adx * 0.5 + (rangeRatio > 3 ? 15 : 0));
  } else if (volatilityLevel === "high" || atrPct > 1.0) {
    type = "volatile";
    confidence = Math.min(90, 50 + atrPct * 15);
  } else {
    type = "ranging";
    confidence = Math.min(85, 50 + (rangeRatio < 2 ? 20 : 0) + (adx < 20 ? 15 : 0));
  }

  const info = getRegimeInfo(type);

  return {
    type,
    label: info.label,
    labelEn: info.labelEn,
    color: info.color,
    bgColor: info.color,
    icon: info.icon,
    confidence: Math.round(confidence),
    recommended: info.recommended,
    adx,
    atr,
    volatilityLevel,
  };
}

function getRegimeInfo(type: Regime["type"]) {
  switch (type) {
    case "trending_bull":
      return {
        label: "اتجاه صاعد قوي",
        labelEn: "Strong Bullish Trend",
        color: "#10b981",
        icon: <TrendingUp className="w-4 h-4" />,
        recommended: "استراتيجية EMA Crossover — شراء عند التصحيح، احتفاظ بالصفقات لفترة أطول. وقف خسارة أوسع.",
      };
    case "trending_bear":
      return {
        label: "اتجاه هابط قوي",
        labelEn: "Strong Bearish Trend",
        color: "#f43f5e",
        icon: <TrendingDown className="w-4 h-4" />,
        recommended: "استراتيجية EMA Crossover — بيع عند الارتداد، احتفاظ بالصفقات لفترة أطول. حذر من الارتدادات الحادة.",
      };
    case "ranging":
      return {
        label: "سوق متذبذب (Ranging)",
        labelEn: "Ranging Market",
        color: "#fbbf24",
        icon: <Waves className="w-4 h-4" />,
        recommended: "استراتيجية RSI Reversal — شراء عند الدعم + RSI<30، بيع عند المقاومة + RSI>70. وقف خسارة ضيق.",
      };
    case "volatile":
      return {
        label: "سوق متقلّب (Volatile)",
        labelEn: "High Volatility",
        color: "#a78bfa",
        icon: <Activity className="w-4 h-4" />,
        recommended: "تقليل حجم الصفقات بنسبة 50%. استراتيجية Breakout مع وقف خسارة واسع. انتظار تأكيد الاختراق بحجم مرتفع.",
      };
    default:
      return {
        label: "غير محدد",
        labelEn: "Unknown",
        color: "#94a3b8",
        icon: <AlertCircle className="w-4 h-4" />,
        recommended: "انتظار حتى تتضح المعالم.",
      };
  }
}
