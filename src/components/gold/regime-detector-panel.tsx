"use client";

import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, Shield } from "lucide-react";
import type { RegimeSignal } from "@/lib/regime-detection";

interface Props {
  signal: RegimeSignal | null;
}

const REGIME_STYLES: Record<string, { bg: string; border: string; color: string; emoji: string }> = {
  trending_bull: { bg: "rgba(34,211,154,0.08)", border: "rgba(34,211,154,0.3)", color: "#22d39a", emoji: "" },
  trending_bear: { bg: "rgba(255,77,106,0.08)", border: "rgba(255,77,106,0.3)", color: "#ff4d6a", emoji: "" },
  ranging_neutral: { bg: "rgba(138,150,168,0.08)", border: "rgba(138,150,168,0.3)", color: "#8a96a8", emoji: "●" },
  volatile_breakout: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", color: "#fbbf24", emoji: "" },
  accumulation: { bg: "rgba(91,140,255,0.08)", border: "rgba(91,140,255,0.3)", color: "#5b8cff", emoji: "" },
  distribution: { bg: "rgba(176,124,255,0.08)", border: "rgba(176,124,255,0.3)", color: "#b07cff", emoji: "" },
};

export default function RegimeDetectorPanel({ signal }: Props) {
  if (!signal) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Activity className="w-4 h-4 section-heading-icon" />
          كاشف النظام السوقي (HMM)
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const style = REGIME_STYLES[signal.regime] ?? REGIME_STYLES.ranging_neutral;

  return (
    <div
      className="card-elevated p-4 border-2"
      style={{ borderColor: style.border, background: `linear-gradient(180deg, ${style.bg} 0%, var(--card) 100%)` }}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Activity className="w-4 h-4 section-heading-icon" />
          كاشف النظام السوقي
        </h2>
        <span className="section-subtitle">HMM-inspired</span>
      </div>

      {/* Main regime display */}
      <div
        className="p-3 rounded-xl mb-3 text-center"
        style={{ background: style.bg, border: `1px solid ${style.border}` }}
      >
        <div className="text-3xl mb-1">{style.emoji}</div>
        <div className="text-lg font-bold" style={{ color: style.color }}>
          {signal.regimeAr}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {signal.regimeEn} • ثقة {signal.confidence}%
        </div>
      </div>

      {/* Risk multiplier */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">مضاعف المخاطرة الموصى به</span>
          <span className="font-bold" style={{ color: style.color }}>
            ×{(signal.recommendedRiskMultiplier ?? signal.riskMultiplier ?? 1).toFixed(1)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(signal.recommendedRiskMultiplier ?? signal.riskMultiplier ?? 1) * 50}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full"
            style={{ background: style.color }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
          <span>حذر (×0.5)</span>
          <span>متوازن (×1)</span>
          <span>هجومي (×2)</span>
        </div>
      </div>

      {/* Indicator grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="stat-box">
          <div className="stat-label">ADX</div>
          <div className="stat-value text-sm tabular-nums ltr-nums">
            {signal.indicators.adx}
          </div>
          <div className="text-[9px] text-muted-foreground">
            {signal.trendStrength > 25 ? "اتجاه قوي" : signal.trendStrength > 20 ? "ضعيف" : "بدون اتجاه"}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">ATR%</div>
          <div className="stat-value text-sm tabular-nums ltr-nums">
            {signal.indicators.atrPct}%
          </div>
          <div className="text-[9px] text-muted-foreground">
            تقلب {signal.volatility === "ar" ? "" : signal.volatility}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">EMA Spread</div>
          <div className="stat-value text-sm tabular-nums ltr-nums" style={{ color: signal.indicators.emaSpread >= 0 ? "#22d39a" : "#ff4d6a" }}>
            {signal.indicators.emaSpread >= 0 ? "+" : ""}{signal.indicators.emaSpread}%
          </div>
          <div className="text-[9px] text-muted-foreground">9-21-50</div>
        </div>
      </div>

      {/* Recommended strategy */}
      <div className="p-2.5 rounded-lg bg-secondary/50 border border-border mb-2">
        <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          الاستراتيجية الموصى بها:
        </div>
        <div className="text-[11px] text-foreground leading-relaxed">
          {signal.recommendedStrategy}
        </div>
        <div className="mt-1.5 text-[10px] text-gold">
           فترة الاحتفاظ: {signal.expectedHoldTime}
        </div>
      </div>

      {/* Summary */}
      <div className="text-[10px] text-muted-foreground text-center">
        {signal.summary}
      </div>
    </div>
  );
}
