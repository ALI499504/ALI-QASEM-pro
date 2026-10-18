"use client";

import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Activity,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Layers,
  Vote,
} from "lucide-react";
import type { MultiAgentResult, AgentAnalysis } from "@/lib/agent-types";
import { verdictLabel } from "@/lib/agent-types";

interface Props {
  agents: MultiAgentResult | null;
}

export default function AgentHologram({ agents }: Props) {
  if (!agents) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <Brain className="w-4 h-4 section-heading-icon" />
            مجلس الوكلاء — لوحة القرار العصبي
          </h2>
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const consensus = agents.consensus;
  const isBuy = consensus.includes("BUY");
  const isSell = consensus.includes("SELL");
  const consensusColor = isBuy ? "#4ade80" : isSell ? "#f87171" : "#c8a050";
  const consensusIcon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
  const ConsensusIcon = consensusIcon;

  // Vote distribution
  const buyVotes = agents.agents.filter((a) => a.verdict.includes("BUY")).length;
  const sellVotes = agents.agents.filter((a) => a.verdict.includes("SELL")).length;
  const holdVotes = agents.agents.filter((a) => a.verdict === "HOLD").length;

  return (
    <div className="card-elevated p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded flex items-center justify-center border border-gold/30 bg-gold/5">
            <Brain className="w-4 h-4 text-gold" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              لوحة القرار العصبي
            </h2>
            <p className="text-[11px] text-muted-foreground font-mono">
              Neural Decision Board — {agents.aiModel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground tabular-nums ltr-nums">
            {agents.agents.length} agents • {agents.agreement}% agreement
          </span>
          <span className="status-dot live" style={{ width: 6, height: 6 }} />
        </div>
      </div>

      {/* === Section 1: Final Consensus Hero Card === */}
      <div
        className="rounded-lg p-4 mb-4"
        style={{
          background: `${consensusColor}08`,
          border: `1px solid ${consensusColor}25`,
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-mono">
              Final Consensus Decision
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded flex items-center justify-center"
                style={{ background: `${consensusColor}15`, color: consensusColor }}
              >
                <ConsensusIcon className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-2xl font-extrabold" style={{ color: consensusColor }}>
                  {verdictLabel(consensus)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  XAUUSD • Gold Spot / US Dollar
                </div>
              </div>
            </div>
          </div>

          {/* Consensus confidence ring */}
          <ConsensusRing value={agents.consensusConfidence} color={consensusColor} />
        </div>

        {/* Consensus metrics row */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border">
          <Metric label="الثقة الإجمالية" value={`${agents.consensusConfidence}%`} color={consensusColor} />
          <Metric label="نسبة التوافق" value={`${agents.agreement}%`} color="#5b8cff" />
          <Metric label="نتيجة الإجماع" value={`${agents.consensusScore > 0 ? "+" : ""}${agents.consensusScore}`} color={consensusColor} />
          <Metric label="إجمالي الأصوات" value={`${agents.agents.length}`} color="#a78bfa" />
        </div>

        {/* Summary */}
        <div className="mt-3 px-3 py-2 rounded bg-secondary/40 border border-border text-[12px] text-foreground/85 leading-relaxed">
          {agents.summary}
        </div>
      </div>

      {/* === Section 2: Decision Pipeline === */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gold" />
          مسار اتخاذ القرار — Decision Pipeline
        </div>
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scroll-styled">
            <PipelineStep
              num={1}
              label="مدخلات السوق"
              sublabel="Market Data"
              icon={<Activity className="w-3 h-3" />}
            />
            <ArrowConnector />
            <PipelineStep
              num={2}
              label="تحليل فردي"
              sublabel="Individual Analysis"
              icon={<Brain className="w-3 h-3" />}
            />
            <ArrowConnector />
            <PipelineStep
              num={3}
              label="تدقيق متبادل"
              sublabel="Cross-Validation"
              icon={<CheckCircle2 className="w-3 h-3" />}
            />
            <ArrowConnector />
            <PipelineStep
              num={4}
              label="محرك الإجماع"
              sublabel="Consensus Engine"
              icon={<Cpu className="w-3 h-3" />}
              highlight
            />
            <ArrowConnector />
            <PipelineStep
              num={5}
              label="القرار النهائي"
              sublabel="Final Decision"
              icon={<Vote className="w-3 h-3" />}
              color={consensusColor}
            />
          </div>
        </div>
      </div>

      {/* === Section 3: Vote Distribution === */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Vote className="w-3.5 h-3.5 text-gold" />
          توزيع الأصوات — Voting Distribution
        </div>
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          {/* Single horizontal bar with 5 segments */}
          <div className="flex h-8 rounded overflow-hidden border border-border">
            {agents.agents.map((agent, i) => {
              const isBuy = agent.verdict.includes("BUY");
              const isSell = agent.verdict.includes("SELL");
              const color = isBuy ? "#4ade80" : isSell ? "#f87171" : "#c8a050";
              return (
                <motion.div
                  key={agent.id}
                  initial={{ width: 0 }}
                  animate={{ width: "20%" }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="flex items-center justify-center gap-1 border-l border-border last:border-l-0"
                  style={{ background: `${color}25` }}
                  title={`${agent.nameAr}: ${verdictLabel(agent.verdict)} (${agent.confidence}%)`}
                >
                  <span className="text-xs">{agent.icon}</span>
                  <span className="text-[10px] font-bold tabular-nums ltr-nums" style={{ color }}>
                    {isBuy ? "▲" : isSell ? "▼" : "●"} {agent.confidence}%
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Vote summary */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <VoteSummary label="شراء" count={buyVotes} color="#4ade80" icon={<TrendingUp className="w-3 h-3" />} />
            <VoteSummary label="انتظار" count={holdVotes} color="#c8a050" icon={<Minus className="w-3 h-3" />} />
            <VoteSummary label="بيع" count={sellVotes} color="#f87171" icon={<TrendingDown className="w-3 h-3" />} />
          </div>
        </div>
      </div>

      {/* === Section 4: Agent Cards Grid === */}
      <div>
        <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-gold" />
          بطاقات الوكلاء — Agent Roster
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.agents.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} delay={i * 0.06} />
          ))}
        </div>
      </div>

      {/* === Footer === */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-gold" />
          تم اتخاذ القرار بإجماع {agents.agents.length} وكلاء متخصصين
        </span>
        <span className="font-mono tabular-nums ltr-nums">
          consensus: {agents.consensusScore > 0 ? "+" : ""}{agents.consensusScore} • agreement: {agents.agreement}%
        </span>
      </div>
    </div>
  );
}

// === Sub-components ===

function ConsensusRing({ value, color }: { value: number; color: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative w-[68px] h-[68px]">
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
        <motion.circle
          cx="34"
          cy="34"
          r={r}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-extrabold tabular-nums ltr-nums" style={{ color }}>
          {value}%
        </span>
        <span className="text-[8px] text-muted-foreground">ثقة</span>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold tabular-nums ltr-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function PipelineStep({
  num,
  label,
  sublabel,
  icon,
  color,
  highlight,
}: {
  num: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color?: string;
  highlight?: boolean;
}) {
  const accent = color ?? (highlight ? "#c8a050" : "#5b8cff");
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: num * 0.1 }}
      className="flex flex-col items-center min-w-[90px] p-2 rounded border"
      style={{
        background: highlight ? `${accent}08` : "var(--secondary)",
        borderColor: `${accent}25`,
      }}
    >
      <div className="flex items-center gap-1 mb-1">
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{ background: accent, color: "white" }}
        >
          {num}
        </span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="text-[10px] font-semibold text-foreground whitespace-nowrap">{label}</div>
      <div className="text-[9px] text-muted-foreground font-mono whitespace-nowrap">{sublabel}</div>
    </motion.div>
  );
}

function ArrowConnector() {
  return (
    <div className="flex-shrink-0 flex items-center justify-center text-muted-foreground/40">
      <ArrowLeft className="w-3 h-3" />
    </div>
  );
}

function VoteSummary({
  label,
  count,
  color,
  icon,
}: {
  label: string;
  count: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded p-2 border"
      style={{
        background: `${color}08`,
        borderColor: `${color}25`,
      }}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color }}>
        {icon}
        <span className="text-[10px] font-bold">{label}</span>
      </div>
      <div className="text-lg font-extrabold tabular-nums ltr-nums" style={{ color }}>
        {count}
      </div>
      <div className="text-[9px] text-muted-foreground">من 5 وكلاء</div>
    </div>
  );
}

function AgentCard({ agent, delay }: { agent: AgentAnalysis; delay: number }) {
  const isBuy = agent.verdict.includes("BUY");
  const isSell = agent.verdict.includes("SELL");
  const verdictColor = isBuy ? "#4ade80" : isSell ? "#f87171" : "#c8a050";
  const VerdictIcon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-lg border overflow-hidden"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Top accent strip */}
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${agent.color}, transparent)` }}
      />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{
                background: `${agent.color}10`,
                border: `1px solid ${agent.color}25`,
              }}
            >
              {agent.icon}
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">{agent.nameAr}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{agent.role}</div>
            </div>
          </div>
          {/* Verdict badge */}
          <div
            className="px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"
            style={{
              background: `${verdictColor}10`,
              color: verdictColor,
              border: `1px solid ${verdictColor}25`,
            }}
          >
            <VerdictIcon className="w-3 h-3" strokeWidth={2.5} />
            {verdictLabel(agent.verdict)}
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">نسبة الثقة</span>
            <span className="font-bold tabular-nums ltr-nums" style={{ color: agent.color }}>
              {agent.confidence}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${agent.confidence}%` }}
              transition={{ duration: 0.8, delay: delay + 0.2 }}
              className="h-full rounded-full"
              style={{ background: agent.color }}
            />
          </div>
        </div>

        {/* Specialty */}
        <div className="mb-3 px-2 py-1.5 rounded bg-secondary/40 text-[10px] text-muted-foreground leading-relaxed">
          {agent.specialty}
        </div>

        {/* Key factors */}
        <div>
          <div className="text-[10px] font-semibold text-foreground mb-1.5 flex items-center gap-1">
            <Activity className="w-3 h-3" style={{ color: agent.color }} />
            المعايير الأساسية للقرار
          </div>
          <div className="space-y-1">
            {agent.keyFactors.map((f, j) => (
              <div
                key={j}
                className="flex items-start gap-1.5 text-[10px] text-foreground/80"
              >
                <span className="flex-shrink-0 mt-0.5" style={{ color: agent.color }}>•</span>
                <span className="leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reasoning snippet */}
        <div className="mt-3 pt-2 border-t border-border">
          <div className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2">
            {agent.reasoning}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
