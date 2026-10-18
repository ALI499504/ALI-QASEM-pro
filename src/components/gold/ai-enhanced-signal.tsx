"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, Zap, Shield, Clock, CheckCircle2 } from "lucide-react";

interface Props {
  currentPrice: number;
}

interface AISignal {
  provider: string;
  providerLabel: string;
  model: string;
  isAI: boolean;
  responseTimeMs: number;
  action: string;
  actionAr: string;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskReward: number;
  reasoning: string;
  bullFactors: string[];
  bearFactors: string[];
  summary: string;
}

const ACTION_STYLES: Record<string, { color: string; bg: string; emoji: string }> = {
  STRONG_BUY: { color: "#22d39a", bg: "rgba(34,211,154,0.12)", emoji: "" },
  BUY: { color: "#86efac", bg: "rgba(134,239,172,0.08)", emoji: "" },
  HOLD: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", emoji: "" },
  SELL: { color: "#fca5a5", bg: "rgba(252,165,165,0.08)", emoji: "" },
  STRONG_SELL: { color: "#ff4d6a", bg: "rgba(255,77,106,0.12)", emoji: "" },
};

const PROVIDER_STYLES: Record<string, { color: string; emoji: string }> = {
  groq: { color: "#f97316", emoji: "" },
  gemini: { color: "#4285f4", emoji: "" },
  zai: { color: "#8b5cf6", emoji: "" },
  "rule-based": { color: "#64748b", emoji: "" },
};

export default function AIEnhancedSignal({ currentPrice }: Props) {
  const [signal, setSignal] = useState<AISignal | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSignal() {
    try {
      const res = await fetch("/api/gold/ai-signal", { cache: "no-store" });
      const data = await res.json();
      if (data?.signal) setSignal(data.signal);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSignal();
    const t = setInterval(fetchSignal, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Brain className="w-4 h-4 section-heading-icon" />
          إشارة الذكاء الاصطناعي الاحترافية
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <div className="text-[11px] text-muted-foreground">
            جارٍ التحليل بـ Groq Llama 3.3 / Gemini / Z-AI...
          </div>
        </div>
      </div>
    );
  }

  if (!signal) return null;

  const style = ACTION_STYLES[signal.action] ?? ACTION_STYLES.HOLD;
  const provStyle = PROVIDER_STYLES[signal.provider] ?? PROVIDER_STYLES["rule-based"];

  return (
    <div
      className="card-elevated p-4 border-2"
      style={{ borderColor: `${style.color}40`, background: `linear-gradient(180deg, ${style.bg} 0%, var(--card) 100%)` }}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Brain className="w-4 h-4 section-heading-icon" />
          إشارة الذكاء الاصطناعي الاحترافية
        </h2>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border"
            style={{ borderColor: `${provStyle.color}40`, background: `${provStyle.color}10`, color: provStyle.color }}
          >
            {provStyle.emoji} {signal.providerLabel}
          </span>
          {signal.isAI && (
            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-2.5 h-2.5" /> AI
            </span>
          )}
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> {signal.responseTimeMs}ms
          </span>
        </div>
      </div>

      {/* Main action */}
      <motion.div
        layout
        className="p-4 rounded-xl text-center mb-3"
        style={{ background: style.bg, border: `2px solid ${style.color}40` }}
      >
        <div className="text-4xl mb-2">{"(" + (style.color === "#22d39a" ? "LONG" : style.color === "#ff4d6a" ? "SHORT" : "WAIT") + ")"}</div>
        <div className="text-2xl font-extrabold" style={{ color: style.color }}>
          {signal.actionAr}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          ثقة {signal.confidence}% • R:R 1:{signal.riskReward.toFixed(1)}
        </div>
      </motion.div>

      {/* Levels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <Level label="الدخول" value={signal.entry} color="#d4a574" />
        <Level label="وقف الخسارة" value={signal.stopLoss} color="#ff4d6a" />
        <Level label="الهدف 1" value={signal.takeProfit1} color="#86efac" />
        <Level label="الهدف 2" value={signal.takeProfit2} color="#22d39a" highlight />
      </div>

      {/* Reasoning */}
      {signal.reasoning && (
        <div className="p-2.5 rounded-lg bg-secondary/50 border border-border mb-2">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-gold" />
            تحليل الذكاء الاصطناعي:
          </div>
          <div className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
            {signal.reasoning}
          </div>
        </div>
      )}

      {/* Bull / Bear factors */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {signal.bullFactors.length > 0 && (
          <div className="p-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20">
            <div className="text-[10px] text-emerald-400 font-bold mb-1">عوامل صعودية:</div>
            {signal.bullFactors.map((f, i) => (
              <div key={i} className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                <span className="text-emerald-400">▲</span> {f}
              </div>
            ))}
          </div>
        )}
        {signal.bearFactors.length > 0 && (
          <div className="p-2 rounded-lg bg-rose-500/[0.04] border border-rose-500/20">
            <div className="text-[10px] text-rose-400 font-bold mb-1">عوامل هبوطية:</div>
            {signal.bearFactors.map((f, i) => (
              <div key={i} className="text-[10px] text-rose-400/80 flex items-center gap-1">
                <span className="text-rose-400">▼</span> {f}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">
        {signal.summary}
      </div>

      {/* Provider info */}
      {!signal.isAI && (
        <div className="mt-2 px-2 py-1 rounded text-[9px] text-amber-400/80 bg-amber-500/[0.04] border border-amber-500/20 text-center">
           يعمل بنظام Rule-Based Ensemble (20 عامل) — للحصول على قرارات AI احترافية، أضف مفاتيح API مجانية:
          <br />
          <span className="text-blue-400">GROQ_API_KEY</span> من console.groq.com |
          <span className="text-blue-400"> GOOGLE_AI_API_KEY</span> من ai.google.dev
        </div>
      )}
    </div>
  );
}

function Level({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg p-2 border text-center ${highlight ? "border-gold/30 bg-gold/[0.04]" : "border-border bg-secondary/30"}`}
    >
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums ltr-nums" style={{ color }}>
        ${value.toFixed(2)}
      </div>
    </div>
  );
}
