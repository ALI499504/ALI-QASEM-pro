"use client";

import { motion } from "framer-motion";
import { Shield, AlertTriangle, Check, X, DollarSign, Target } from "lucide-react";
import type { RiskAssessment } from "@/lib/risk-management";

interface Props {
  assessment: RiskAssessment | null;
}

const RISK_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: "#22d39a", bg: "rgba(34,211,154,0.08)", border: "rgba(34,211,154,0.3)" },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)" },
  high: { color: "#fb923c", bg: "rgba(251,146,60,0.08)", border: "rgba(251,146,60,0.3)" },
  extreme: { color: "#ff4d6a", bg: "rgba(255,77,106,0.08)", border: "rgba(255,77,106,0.3)" },
};

const SEVERITY_ICONS = {
  info: Check,
  warning: AlertTriangle,
  critical: X,
};

export default function AdvancedRiskManager({ assessment }: Props) {
  if (!assessment) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Shield className="w-4 h-4 section-heading-icon" />
          إدارة المخاطر المتقدمة
        </div>
        <div className="h-48 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const riskStyle = RISK_COLORS[assessment.marketRiskLevel] ?? RISK_COLORS.medium;

  return (
    <div
      className="card-elevated p-4 border-2"
      style={{ borderColor: riskStyle.border }}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Shield className="w-4 h-4 section-heading-icon" />
          إدارة المخاطر المتقدمة
        </h2>
        <span className="section-subtitle">Kelly + ATR</span>
      </div>

      {/* Market Risk Level */}
      <div
        className="p-3 rounded-xl mb-3 text-center"
        style={{ background: riskStyle.bg, border: `1px solid ${riskStyle.border}` }}
      >
        <div className="text-[10px] text-muted-foreground mb-0.5">مستوى مخاطر السوق</div>
        <div className="text-xl font-bold" style={{ color: riskStyle.color }}>
          {assessment.marketRiskLevel === "ar" ? "" : assessment.marketRiskLevel.toUpperCase()}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          ATR {assessment.stopLossPercent.toFixed(2)}% من السعر
        </div>
      </div>

      {/* Position sizing */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
        <div className="stat-box">
          <div className="stat-label">حجم العقد الموصى به</div>
          <div className="stat-value text-base tabular-nums ltr-nums text-gold">
            {assessment.recommendedLotSize.toFixed(3)}
          </div>
          <div className="text-[9px] text-muted-foreground">لوت</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">المبلغ المخاطر به</div>
          <div className="stat-value text-base tabular-nums ltr-nums text-rose-400">
            ${assessment.riskAmount.toFixed(0)}
          </div>
          <div className="text-[9px] text-muted-foreground">
            {assessment.riskPerTradePercent.toFixed(2)}% من الحساب
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">الربح المتوقع</div>
          <div className="stat-value text-base tabular-nums ltr-nums text-emerald-400">
            +${assessment.potentialProfit.toFixed(0)}
          </div>
          <div className="text-[9px] text-muted-foreground">
            R:R 1:{assessment.riskRewardRatio.toFixed(1)}
          </div>
        </div>
      </div>

      {/* SL/TP levels */}
      <div className="mb-3">
        <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
          <Target className="w-3 h-3 text-gold" />
          مستويات SL/TP (ATR-based)
        </div>
        <div className="space-y-1">
          <LevelRow label="وقف الخسارة (SL)" value={assessment.stopLoss} color="#ff4d6a" sub={`${assessment.stopLossPercent.toFixed(2)}%`} />
          <LevelRow label="الهدف 1 (TP1)" value={assessment.takeProfit1} color="#86efac" sub="R:R 1:1.5" />
          <LevelRow label="الهدف 2 (TP2)" value={assessment.takeProfit2} color="#22d39a" sub="R:R 1:2" highlight />
          <LevelRow label="الهدف 3 (TP3)" value={assessment.takeProfit3} color="#10b981" sub="R:R 1:3" />
        </div>
      </div>

      {/* Kelly Criterion */}
      <div className="p-2.5 rounded-lg bg-secondary/50 border border-border mb-3">
        <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          Kelly Criterion — تحديد حجم العقد بناءً على نسبة الفوز
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[9px] text-muted-foreground">Full Kelly</div>
            <div className="text-sm font-bold text-rose-400 tabular-nums ltr-nums">
              {assessment.kellyFull.toFixed(1)}%
            </div>
            <div className="text-[9px] text-muted-foreground">هجومي</div>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground">Half Kelly</div>
            <div className="text-sm font-bold text-gold tabular-nums ltr-nums">
              {assessment.kellyHalf.toFixed(1)}%
            </div>
            <div className="text-[9px] text-muted-foreground">موصى به</div>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground">Quarter Kelly</div>
            <div className="text-sm font-bold text-emerald-400 tabular-nums ltr-nums">
              {assessment.kellyQuarter.toFixed(1)}%
            </div>
            <div className="text-[9px] text-muted-foreground">حذر</div>
          </div>
        </div>
      </div>

      {/* Pre-trade checklist */}
      <div className="mb-2">
        <div className="text-[11px] font-bold mb-1.5">
          قائمة فحص ما قبل التداول
        </div>
        <div className="space-y-1">
          {assessment.checklist.map((item, i) => {
            const Icon = SEVERITY_ICONS[item.severity];
            const passedColor = item.passed ? "#22d39a" : item.severity === "critical" ? "#ff4d6a" : "#fbbf24";
            return (
              <div
                key={i}
                className="flex items-center gap-2 p-1.5 rounded text-[10px] bg-secondary/30 border border-border"
              >
                <Icon className="w-3 h-3 shrink-0" style={{ color: passedColor }} />
                <span className="flex-1">{item.label}</span>
                <span
                  className="font-bold"
                  style={{ color: passedColor }}
                >
                  {item.passed ? "" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground leading-relaxed">
        {assessment.summary}
      </div>
    </div>
  );
}

function LevelRow({ label, value, color, sub, highlight }: { label: string; value: number; color: string; sub: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between p-1.5 rounded text-[11px] border ${
        highlight ? "border-gold/30 bg-gold/[0.04]" : "border-border bg-secondary/30"
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground">{sub}</span>
        <span className="font-bold tabular-nums ltr-nums" style={{ color }}>
          ${value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
