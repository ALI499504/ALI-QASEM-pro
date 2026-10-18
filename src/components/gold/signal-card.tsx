"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Sparkles,
  Target,
  Shield,
  Activity,
  Users,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AISignal } from "@/lib/ai-types";
import { actionLabel } from "@/lib/ai-types";
import type { MultiAgentResult, AgentAnalysis } from "@/lib/agent-types";
import { verdictLabel } from "@/lib/agent-types";

interface Props {
  signal: AISignal | null; // Used for entry/SL/TP levels
  agents: MultiAgentResult | null; // Used as the PRIMARY authority for direction
  loading?: boolean;
  onExecuteOnConsensus?: () => void;
}

export default function SignalCard({ signal, agents, loading, onExecuteOnConsensus }: Props) {
  if (loading || !agents) {
    return (
      <div className="card-modern rounded-lg p-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Users className="w-4 h-4 animate-pulse" />
          <span>الوكلاء الخمسة يحللون السوق...</span>
        </div>
        <div className="mt-6 h-32 rounded bg-secondary/40 animate-pulse" />
      </div>
    );
  }

  // The CONSENSUS is the primary authority
  const consensus = agents.consensus;
  const isBuy = consensus.includes("BUY");
  const isSell = consensus.includes("SELL");
  const accent = isBuy ? "#4ade80" : isSell ? "#f87171" : "#c8a050";
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;

  // Use signal levels (entry/SL/TP) but direction comes from consensus
  // If single signal direction matches consensus → high confidence
  // If they disagree → still use consensus but show warning
  const signalMatchesConsensus = signal && (
    (isBuy && signal.action.includes("BUY")) ||
    (isSell && signal.action.includes("SELL")) ||
    (!isBuy && !isSell && signal.action === "HOLD")
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-modern rounded-lg p-5 lg:p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 bottom-0 right-0 w-0.5" style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }} />

      <div className="relative">
        {/* Header — 2026 refined */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: `${accent}10`, border: `1px solid ${accent}25` }}
            >
              <Users className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground tracking-tight">
                إجماع الوكلاء الأذكياء
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {agents.aiModel} · 5 وكلاء متخصصين
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="status-dot live" style={{ width: 6, height: 6, background: "#10b981" }} />
            مباشر
          </div>
        </div>

        {/* Consensus direction + agreement meter */}
        <div className="flex items-center gap-5 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: `${accent}10`, border: `1px solid ${accent}25` }}
              >
                <Icon className="w-6 h-6" strokeWidth={2.2} style={{ color: accent }} />
              </div>
              <div>
                <div className="text-3xl font-extrabold tracking-tight" style={{ color: accent }}>
                  {verdictLabel(consensus)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  قرار موحد من 5 وكلاء · XAUUSD
                </div>
              </div>
            </div>
          </div>

          {/* Agreement strength meter */}
          <div className="flex flex-col items-center">
            <AgreementRing value={agents.agreement} color={accent} />
            <div className="text-[10px] text-muted-foreground mt-1">نسبة التوافق</div>
          </div>
        </div>

        {/* Agent vote bar — visual votes */}
        <AgentVoteBar agents={agents.agents} consensus={consensus} />

        {/* Summary */}
        <div className="px-3 py-2.5 rounded bg-secondary/60 border border-border text-sm leading-relaxed mb-4 mt-3">
          <span className="text-[10px] text-muted-foreground block mb-1 uppercase tracking-wider font-mono">خلاصة الوكلاء</span>
          {agents.summary}
        </div>

        {/* Levels from signal (if available) */}
        {signal && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <LevelCard
              icon={<Target className="w-3 h-3" />}
              label="الدخول"
              value={signal.entry}
              color="#3b82f6"
            />
            <LevelCard
              icon={<Shield className="w-3 h-3" />}
              label="وقف الخسارة"
              value={signal.stopLoss}
              color="#f43f5e"
            />
            <LevelCard
              icon={<Sparkles className="w-3 h-3" />}
              label="الهدف ١"
              value={signal.takeProfit1}
              color="#10b981"
            />
            <LevelCard
              icon={<Sparkles className="w-3 h-3" />}
              label="الهدف ٢"
              value={signal.takeProfit2}
              color="#10b981"
            />
          </div>
        )}

        {/* Disagreement warning */}
        {signal && !signalMatchesConsensus && (
          <div className="mb-3 px-3 py-2 rounded border border-warning/30 bg-warning/10 text-[11px] text-warning flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            تنبيه: الإشارة الفردية خالفت الإجماع — تم الاعتماد على قرار الوكلاء
          </div>
        )}

        {/* Risk reward + validity */}
        {signal && (
          <div className="flex items-center justify-between text-[11px] mb-4 pb-3 border-b border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Activity className="w-3 h-3" />
              <span>
                المخاطرة/العائد ={" "}
                <span className="font-bold tabular-nums ltr-nums" style={{ color: accent }}>
                  1:{signal.riskReward}
                </span>
              </span>
            </div>
            <div className="text-muted-foreground">
              ثقة الإجماع: <span className="font-bold tabular-nums ltr-nums" style={{ color: accent }}>{agents.consensusConfidence}%</span>
            </div>
          </div>
        )}

        {/* Execute on Consensus button — 2026 refined */}
        <Button
          onClick={onExecuteOnConsensus}
          disabled={!onExecuteOnConsensus || !signal}
          className="w-full py-3 font-bold transition-all rounded-lg"
          style={{
            background: `linear-gradient(180deg, ${accent} 0%, ${accent}dd 100%)`,
            color: "#080b14",
            border: `1px solid ${accent}40`,
          }}
        >
          <Zap className="w-4 h-4 ml-2" />
          تنفيذ صفقة {verdictLabel(consensus)} بإجماع الوكلاء
        </Button>

        <div className="mt-2 text-[10px] text-muted-foreground text-center">
           يملأ لوحة التداول تلقائياً وينفذ الصفقة بناءً على إجماع الـ5 وكلاء
        </div>
      </div>
    </motion.div>
  );
}

function LevelCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="stat-box-modern">
      <div className="text-[10px] mb-1 flex items-center gap-1 font-mono uppercase tracking-wider" style={{ color }}>
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-bold tabular-nums ltr-nums" style={{ color }}>
        ${value.toFixed(2)}
      </div>
    </div>
  );
}

function AgreementRing({ value, color }: { value: number; color: string }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative w-[88px] h-[88px]">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} stroke="rgba(148, 163, 184, 0.08)" strokeWidth="5" fill="none" />
        <motion.circle
          cx="44"
          cy="44"
          r={r}
          stroke={color}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-lg font-bold tabular-nums ltr-nums" style={{ color }}>
          {value}%
        </div>
      </div>
    </div>
  );
}

// Visual vote bar showing each agent's verdict
function AgentVoteBar({ agents, consensus }: { agents: AgentAnalysis[]; consensus: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1 font-mono uppercase tracking-wider">
        <Users className="w-3 h-3" />
        تصويت الوكلاء الخمسة
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {agents.map((agent) => {
          const isBuy = agent.verdict.includes("BUY");
          const isSell = agent.verdict.includes("SELL");
          const color = isBuy ? "#10b981" : isSell ? "#f43f5e" : "#d4a574";
          const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
          const agreesWithConsensus =
            (isBuy && consensus.includes("BUY")) ||
            (isSell && consensus.includes("SELL")) ||
            (!isBuy && !isSell && !consensus.includes("BUY") && !consensus.includes("SELL"));
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded p-1.5 text-center border"
              style={{
                background: `${color}08`,
                borderColor: agreesWithConsensus ? `${color}40` : "rgba(148, 163, 184, 0.08)",
              }}
              title={`${agent.name}: ${verdictLabel(agent.verdict)} (${agent.confidence}%)`}
            >
              <div className="text-base mb-0.5">{agent.icon}</div>
              <Icon className="w-3 h-3 mx-auto" style={{ color }} />
              <div className="text-[9px] mt-0.5 font-semibold" style={{ color }}>
                {verdictLabel(agent.verdict).slice(0, 6)}
              </div>
              <div className="text-[8px] text-muted-foreground tabular-nums ltr-nums font-mono">
                {agent.confidence}%
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
