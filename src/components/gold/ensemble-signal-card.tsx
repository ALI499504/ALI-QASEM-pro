"use client";

import { motion } from "framer-motion";
import { Cpu, TrendingUp, TrendingDown, Minus, Brain, Check, X } from "lucide-react";
import type { EnsembleSignal as Signal } from "@/lib/alpha-factors";

interface Props {
  signal: Signal | null;
}

const ACTION_STYLES: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  STRONG_BUY: { color: "#22d39a", bg: "rgba(34,211,154,0.12)", border: "rgba(34,211,154,0.4)", emoji: "" },
  BUY: { color: "#86efac", bg: "rgba(134,239,172,0.08)", border: "rgba(134,239,172,0.3)", emoji: "" },
  HOLD: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", emoji: "" },
  SELL: { color: "#fca5a5", bg: "rgba(252,165,165,0.08)", border: "rgba(252,165,165,0.3)", emoji: "" },
  STRONG_SELL: { color: "#ff4d6a", bg: "rgba(255,77,106,0.12)", border: "rgba(255,77,106,0.4)", emoji: "" },
};

export default function EnsembleSignalCard({ signal }: Props) {
  if (!signal) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Cpu className="w-4 h-4 section-heading-icon" />
          إشارة الذكاء الاصطناعي المجمّعة (Ensemble)
        </div>
        <div className="h-48 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const style = ACTION_STYLES[signal.action] ?? ACTION_STYLES.HOLD;
  const score = signal.finalScore; // -100..100
  const scorePct = (score + 100) / 2; // 0..100

  return (
    <div
      className="card-elevated p-4 border-2"
      style={{ borderColor: style.border, background: `linear-gradient(180deg, ${style.bg} 0%, var(--card) 100%)` }}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Cpu className="w-4 h-4 section-heading-icon" />
          إشارة الذكاء الاصطناعي المجمّعة
        </h2>
        <span className="section-subtitle">20 Alpha Factors • ML Ensemble</span>
      </div>

      {/* Main action display */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="p-4 rounded-xl text-center mb-3"
        style={{ background: style.bg, border: `2px solid ${style.border}` }}
      >
        <div className="text-4xl mb-2">{"(" + (style.color === "#22d39a" ? "LONG" : style.color === "#ff4d6a" ? "SHORT" : "WAIT") + ")"}</div>
        <div className="text-2xl font-extrabold" style={{ color: style.color }}>
          {signal.actionAr}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {signal.action} • ثقة {signal.confidence}%
        </div>

        {/* Score bar */}
        <div className="mt-3 relative h-3 rounded-full bg-gradient-to-r from-rose-500/30 via-yellow-500/30 to-emerald-500/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.abs(score)}%` }}
            transition={{ duration: 0.6 }}
            className="absolute top-0 h-full rounded-full"
            style={{
              background: style.color,
              left: score >= 0 ? "50%" : `${50 - Math.abs(score) / 2}%`,
            }}
          />
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-border" />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>بيع قوي</span>
          <span className="font-bold" style={{ color: style.color }}>
            النتيجة: {score >= 0 ? "+" : ""}{score}/100
          </span>
          <span>شراء قوي</span>
        </div>
      </motion.div>

      {/* Voting distribution */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2 bg-emerald-500/[0.04] border border-emerald-500/20 text-center">
          <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-0.5" />
          <div className="text-base font-bold text-emerald-400 tabular-nums ltr-nums">
            {signal.bullCount}
          </div>
          <div className="text-[9px] text-muted-foreground">صعودي</div>
        </div>
        <div className="rounded-lg p-2 bg-yellow-500/[0.04] border border-yellow-500/20 text-center">
          <Minus className="w-4 h-4 text-yellow-400 mx-auto mb-0.5" />
          <div className="text-base font-bold text-yellow-400 tabular-nums ltr-nums">
            {signal.neutralCount}
          </div>
          <div className="text-[9px] text-muted-foreground">محايد</div>
        </div>
        <div className="rounded-lg p-2 bg-rose-500/[0.04] border border-rose-500/20 text-center">
          <TrendingDown className="w-4 h-4 text-rose-400 mx-auto mb-0.5" />
          <div className="text-base font-bold text-rose-400 tabular-nums ltr-nums">
            {signal.bearCount}
          </div>
          <div className="text-[9px] text-muted-foreground">هبوطي</div>
        </div>
      </div>

      {/* Top factors */}
      <div className="mb-2">
        <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
          <Brain className="w-3 h-3 text-gold" />
          أقوى 5 عوامل مؤثرة
        </div>
        <div className="space-y-1">
          {signal.topFactors.map((f, i) => (
            <div
              key={f.id}
              className="flex items-center justify-between p-1.5 rounded text-[10px] bg-secondary/50 border border-border"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground w-3">
                  {i + 1}
                </span>
                <span className="font-semibold">{f.nameAr}</span>
                <span className="text-[8px] text-muted-foreground px-1 rounded bg-secondary">
                  {f.category}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground">
                  وزن ×{f.weight.toFixed(1)}
                </span>
                <span
                  className="font-bold tabular-nums ltr-nums"
                  style={{ color: f.score > 0 ? "#22d39a" : f.score < 0 ? "#ff4d6a" : "#8a96a8" }}
                >
                  {f.score > 0 ? "+" : ""}{Math.round(f.score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground leading-relaxed">
        {signal.summary}
      </div>
    </div>
  );
}
