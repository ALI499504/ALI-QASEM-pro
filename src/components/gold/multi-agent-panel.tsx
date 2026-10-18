"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Activity,
  Target,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Eye,
  Award,
  Loader2,
  RefreshCw,
  Clock,
} from "lucide-react";
import RingVisualization from "./ring-visualization";

interface AgentOutput {
  agentId: string;
  name: string;
  nameAr: string;
  status: "idle" | "scanning" | "active" | "blocked" | "executed";
  confidence: number;
  output: any;
  commentary: string;
  reasoning: string;
  timestamp: number;
}

interface MultiAgentState {
  agents: AgentOutput[];
  consensus: {
    verdict: "BUY" | "SELL" | "WAIT";
    confidence: number;
    reasoning: string;
    agreement: number;
  };
  isRunning: boolean;
  lastCycle: number;
}

// === ATS Matrix design tokens (exact replica) ===
const COLORS = {
  bg: "#07080c",
  panel: "#0d1018",
  panel2: "#10141e",
  line: "#1c2433",
  text: "#d7e0ee",
  muted: "#7d8aa0",
  dim: "#4d586c",
  green: "#6cffb2",
  cyan: "#5ce1ff",
  pink: "#ff4d9d",
  amber: "#ffb020",
  violet: "#b57cff",
  red: "#ff5a6a",
  blue: "#6ea8ff",
  white: "#f4f7fb",
};

// Worker shapes from ATS Matrix (each agent gets a unique shape)
const agentMeta: Record<string, { icon: any; color: string; shape: "hex" | "pent" | "diamond" | "tri" | "circle" | "square" }> = {
  market_analyst: { icon: Activity, color: COLORS.green, shape: "hex" },
  smc_strategist: { icon: Target, color: COLORS.cyan, shape: "pent" },
  risk_manager: { icon: Shield, color: COLORS.pink, shape: "diamond" },
  ai_decision: { icon: Brain, color: COLORS.amber, shape: "tri" },
  execution: { icon: Zap, color: COLORS.violet, shape: "circle" },
  performance_monitor: { icon: Award, color: COLORS.red, shape: "square" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  idle: { color: COLORS.dim, label: "IDLE" },
  scanning: { color: COLORS.cyan, label: "SCAN" },
  active: { color: COLORS.green, label: "ACTIVE" },
  blocked: { color: COLORS.red, label: "BLOCK" },
  executed: { color: COLORS.amber, label: "EXEC" },
};

const verdictConfig: Record<string, { color: string; icon: any; ar: string }> = {
  BUY: { color: COLORS.green, icon: TrendingUp, ar: "شراء" },
  SELL: { color: COLORS.red, icon: TrendingDown, ar: "بيع" },
  WAIT: { color: COLORS.amber, icon: Eye, ar: "انتظار" },
};

const PHASES = [
  { key: "INTAKE", cls: "dispatch", note: "the core reads the brief before a single tool fires" },
  { key: "DISPATCH", cls: "dispatch", note: "the planner cuts it into steps a worker can actually finish" },
  { key: "SCRATCHPAD", cls: "dispatch", note: "the scratchpad moves state between workers, never whole transcripts" },
  { key: "FAN-OUT", cls: "fan", note: "the executor only calls a tool it already has the arguments for" },
  { key: "CROSS-CHECK", cls: "cross", note: "the validator reads every claim a second time, from the source" },
  { key: "REPORT", cls: "report", note: "the logger writes the trace before the answer is allowed to ship" },
];

export default function MultiAgentPanel() {
  const [state, setState] = useState<MultiAgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/gold/multi-agent", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setState(j);
    } catch (e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 8_000);
    return () => clearInterval(i);
  }, [load]);

  // Rotate phases every 8s (like ATS Matrix)
  useEffect(() => {
    const i = setInterval(() => {
      setPhaseIdx((p) => (p + 1) % PHASES.length);
    }, 8_000);
    return () => clearInterval(i);
  }, []);

  const runCycle = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/gold/multi-agent?action=run", { cache: "no-store" });
      const j = await r.json();
      setState(j);
    } catch {}
    finally { setBusy(false); }
  };

  if (loading && !state) {
    return (
      <div className="rounded-lg border p-8 flex items-center justify-center"
        style={{ background: COLORS.bg, borderColor: COLORS.line }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.cyan }} />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-lg border p-4 text-center text-xs"
        style={{ background: COLORS.bg, borderColor: COLORS.line, color: COLORS.muted }}>
        Multi-agent system unavailable
      </div>
    );
  }

  const consensus = state.consensus;
  const verdictInfo = verdictConfig[consensus.verdict];
  const VerdictIcon = verdictInfo.icon;

  // Build ring nodes — 6 workers around one core
  const ringNodes = state.agents.map((a, i) => {
    const meta = agentMeta[a.agentId] || agentMeta.market_analyst;
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / state.agents.length;
    return {
      id: a.agentId,
      name: a.name,
      nameAr: a.nameAr,
      color: meta.color,
      shape: meta.shape,
      status: a.status,
      confidence: a.confidence,
      angle,
    };
  });

  const phase = PHASES[phaseIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg overflow-hidden"
      style={{
        background: `radial-gradient(1200px 600px at 20% -10%, rgba(181,124,255,.08), transparent 50%),
                     radial-gradient(900px 500px at 90% 0%, rgba(255,77,157,.06), transparent 45%),
                     ${COLORS.bg}`,
        border: `1px solid ${COLORS.line}`,
      }}
    >
      {/* === KICKER === */}
      <div
        className="flex justify-between items-baseline"
        style={{
          color: COLORS.dim,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "10px",
          letterSpacing: ".18em",
          textTransform: "uppercase",
          padding: "18px 20px 8px",
        }}
      >
        <span>ONE CORE · SIX WORKERS · A CONSENSUS THAT DECIDES · EVERY HOP ON THE RECORD</span>
        <span>ATS MATRIX · LIVE FLOOR</span>
      </div>

      {/* === TITLE === */}
      <h1
        className="px-5 mb-2"
        style={{
          fontSize: "clamp(22px, 2.4vw, 34px)",
          fontWeight: 600,
          lineHeight: 1.15,
          color: COLORS.text,
        }}
      >
        Multi-Agent Trading Ring —{" "}
        <em style={{ fontStyle: "normal", color: COLORS.pink }}>
          one task walks in, six workers take it apart, one verdict walks out
        </em>
      </h1>

      <p
        className="px-5 mb-3"
        style={{
          maxWidth: "1180px",
          color: COLORS.muted,
          fontSize: "13.5px",
          lineHeight: 1.55,
        }}
      >
        A signal is not one prompt with a bigger window. A market brief gets cut into steps, and each step is closed by the worker that can actually close it.
        The cheapest worker that can finish the step is the right worker.{" "}
        <strong style={{ color: COLORS.green, fontWeight: 560 }}>Routing is the product.</strong>
      </p>

      {/* === PRINCIPLES === */}
      <div className="flex flex-wrap gap-2 px-5 mb-3">
        {[
          "six workers around one core",
          "handoffs carry state, not transcripts",
          "every claim gets a second reader",
        ].map((p, i) => (
          <div
            key={i}
            className="pill"
            style={{
              border: `1px solid ${COLORS.line}`,
              background: "#0b0e16",
              color: COLORS.muted,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              padding: "5px 9px",
              borderRadius: 4,
            }}
          >
            <b style={{ color: COLORS.cyan, fontWeight: 500 }}>+</b> {p}
          </div>
        ))}
      </div>

      {/* === PHASES === */}
      <div className="flex gap-2 items-center px-5 mb-3 flex-wrap">
        {PHASES.map((p, i) => (
          <div
            key={i}
            className="phase-dot"
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: `1px solid ${COLORS.line}`,
              display: "grid",
              placeItems: "center",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: i === phaseIdx ? "#08110c" : COLORS.dim,
              background: i === phaseIdx ? COLORS.green : "#0b0e16",
              borderColor: i === phaseIdx ? COLORS.green : COLORS.line,
              fontWeight: i === phaseIdx ? 700 : 400,
            }}
          >
            {i + 1}
          </div>
        ))}
        <span
          style={{
            color: COLORS.muted,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
          }}
        >
          {phase.note}
        </span>
      </div>

      {/* === MAIN GRID === */}
      <div
        className="grid gap-3 p-5"
        style={{ gridTemplateColumns: "1.35fr 0.95fr" }}
      >
        {/* === LEFT: RING CANVAS === */}
        <article
          className="card"
          style={{
            background: "linear-gradient(180deg, #10141d 0%, #0c1018 100%)",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: "12px 14px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="flex justify-between gap-2 flex-wrap mb-2"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: COLORS.dim,
              letterSpacing: ".04em",
              textTransform: "uppercase",
            }}
          >
            <span>The ring · six workers around one core · live trace</span>
            <span>consensus inside the core</span>
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: COLORS.text }}>
            The core decides who moves — the ring does the work
          </h3>
          <div
            className="flex justify-between gap-2 flex-wrap mb-2"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: COLORS.dim,
              letterSpacing: ".04em",
              textTransform: "uppercase",
            }}
          >
            <span>the core is the only thing holding the task state</span>
            <span>six specialists, running at the same time</span>
            <span>a handoff is a message, not a re-read</span>
          </div>

          {/* === THE RING === */}
          <RingVisualization
            nodes={ringNodes}
            centerLabel="VERDICT"
            centerValue={consensus.verdict}
            centerColor={verdictInfo.color}
            isRunning={state.isRunning}
            activeAgentId={state.agents.find((a) => a.status === "active")?.agentId}
            height={360}
          />

          <p
            style={{
              textAlign: "center",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: COLORS.dim,
              marginTop: 4,
            }}
          >
            nothing runs until the core has named a worker · the scratchpad hands over state without a copy
          </p>

          {/* Verdict below ring */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <VerdictIcon className="w-5 h-5" style={{ color: verdictInfo.color }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: verdictInfo.color }}>
              {consensus.verdict} ({verdictInfo.ar})
            </span>
            <span style={{ color: COLORS.muted, fontSize: 11 }}>
              {consensus.confidence}% conf · {consensus.agreement}% agreement
            </span>
          </div>

          {/* Legend */}
          <div
            className="grid mt-3"
            style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 12px" }}
          >
            {state.agents.map((a) => {
              const meta = agentMeta[a.agentId];
              return (
                <div key={a.agentId} className="flex items-center gap-1.5" style={{ fontSize: 10, color: COLORS.muted }}>
                  <span
                    className="sw"
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: meta.color,
                    }}
                  />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: meta.color, fontWeight: 600 }}>
                    {a.name.split(" ")[0].toUpperCase()}
                  </span>
                  <span style={{ color: COLORS.dim }}>· {a.nameAr}</span>
                </div>
              );
            })}
          </div>
        </article>

        {/* === RIGHT: SIDE PANELS === */}
        <div className="space-y-3">
          {/* Phase badge + metrics */}
          <article
            className="card"
            style={{
              background: "linear-gradient(180deg, #10141d 0%, #0c1018 100%)",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 10,
              padding: "12px 14px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="badge"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                letterSpacing: ".12em",
                padding: "4px 8px",
                borderRadius: 4,
                border: `1px solid`,
                color: COLORS.cyan,
                borderColor: "rgba(92,225,255,.4)",
                background: "rgba(92,225,255,.08)",
              }}
            >
              {phase.key}
            </div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: COLORS.dim,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                marginBottom: 8,
              }}
            >
              PHASE {phaseIdx + 1}/6 · {phase.key}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Metric label="STEPS" value={state.agents.length} color={COLORS.cyan} />
              <Metric label="HOPS" value={state.agents.filter(a => a.status === "active" || a.status === "executed").length} color={COLORS.green} />
              <Metric label="TPS" value={(state.consensus.confidence / 10).toFixed(1)} color={COLORS.pink} />
            </div>

            {/* Load bars per worker */}
            <div className="mt-4 space-y-1">
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  color: COLORS.dim,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                WORKER LOAD
              </div>
              {state.agents.map((a, i) => {
                const meta = agentMeta[a.agentId];
                return (
                  <div key={a.agentId} className="flex items-center gap-2" style={{ fontSize: 11 }}>
                    <label
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: meta.color,
                        fontWeight: 600,
                        width: 80,
                      }}
                    >
                      {a.name.split(" ")[0].slice(0, 8).toUpperCase()}
                    </label>
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        background: COLORS.panel2,
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${a.confidence}%` }}
                        transition={{ duration: 0.6, delay: 0.05 * i }}
                        style={{
                          height: "100%",
                          background: meta.color,
                        }}
                      />
                    </div>
                    <em
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        color: COLORS.muted,
                        fontStyle: "normal",
                        width: 36,
                        textAlign: "right",
                      }}
                    >
                      {a.confidence}%
                    </em>
                  </div>
                );
              })}
            </div>
          </article>

          {/* AI Reasoning */}
          <article
            className="card"
            style={{
              background: "linear-gradient(180deg, #10141d 0%, #0c1018 100%)",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: COLORS.dim,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                marginBottom: 6,
              }}
            >
              <span style={{ color: verdictInfo.color }}>●</span> AI REASONING
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.55, color: COLORS.text }}>
              {consensus.reasoning}
            </div>
          </article>

          {/* Action button */}
          <button
            onClick={runCycle}
            disabled={busy || state.isRunning}
            className="w-full py-2 rounded text-[11px] font-bold tracking-wide transition disabled:opacity-50"
            style={{
              background: busy || state.isRunning
                ? COLORS.panel2
                : `linear-gradient(90deg, ${COLORS.green}, ${COLORS.cyan})`,
              color: busy || state.isRunning ? COLORS.muted : "#08110c",
              border: `1px solid ${COLORS.line}`,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {busy || state.isRunning ? "PROCESSING..." : "▶ RUN FULL CYCLE"}
          </button>
        </div>
      </div>

      {/* === AGENT CARDS GRID === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 px-5 pb-5">
        {state.agents.map((agent, i) => (
          <AgentCard key={agent.agentId} agent={agent} index={i} />
        ))}
      </div>

      {/* === FOOTER === */}
      <div
        className="flex items-center justify-between px-5 py-2 border-t"
        style={{
          borderColor: COLORS.line,
          background: COLORS.panel,
          color: COLORS.muted,
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: state.isRunning ? COLORS.green : COLORS.dim,
              animation: state.isRunning ? "pulse-anim 2s ease-in-out infinite" : "none",
            }}
          />
          <span style={{ letterSpacing: ".04em" }}>
            {state.isRunning ? "PROCESSING" : "IDLE"} · background cycle every 45s
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {new Date(state.lastCycle).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse-anim {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </motion.div>
  );
}

// === Sub-components ===
function Metric({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          color: COLORS.dim,
          textTransform: "uppercase",
          letterSpacing: ".04em",
        }}
      >
        {label}
      </div>
      <div
        className="tabular-nums ltr-nums"
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 18,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// === Agent Card sub-component ===
function AgentCard({ agent, index }: { agent: AgentOutput; index: number }) {
  const meta = agentMeta[agent.agentId] || agentMeta.market_analyst;
  const status = statusConfig[agent.status] || statusConfig.idle;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      style={{
        background: "linear-gradient(180deg, #10141d 0%, #0c1018 100%)",
        border: `1px solid ${meta.color}30`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: `1px solid ${meta.color}20`,
          background: `linear-gradient(90deg, ${meta.color}10, transparent)`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: `${meta.color}20`,
              border: `1px solid ${meta.color}40`,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon style={{ width: 14, height: 14, color: meta.color }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
              {agent.name.split(" ")[0].toUpperCase()}
            </div>
            <div style={{ fontSize: 8, color: COLORS.muted }}>{agent.nameAr}</div>
          </div>
        </div>
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 3,
            background: `${status.color}20`,
            color: status.color,
            border: `1px solid ${status.color}40`,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {status.label}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between mb-1" style={{ fontSize: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
            <span style={{ color: COLORS.muted, letterSpacing: ".04em" }}>CONFIDENCE</span>
            <span style={{ fontWeight: 700, color: meta.color }}>{agent.confidence}%</span>
          </div>
          <div style={{ height: 3, background: COLORS.panel2, borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${agent.confidence}%` }}
              transition={{ duration: 0.6, delay: 0.05 * index }}
              style={{ height: "100%", background: meta.color }}
            />
          </div>
        </div>

        {/* Commentary */}
        <div style={{ fontSize: 9, lineHeight: 1.5, color: COLORS.text }}>
          {agent.commentary.length > 130 ? agent.commentary.slice(0, 130) + "..." : agent.commentary}
        </div>

        {/* Output summary */}
        <AgentOutputSummary agent={agent} color={meta.color} />
      </div>
    </motion.div>
  );
}

// === Agent-specific output summary ===
function AgentOutputSummary({ agent, color }: { agent: AgentOutput; color: string }) {
  const o = agent.output;
  if (!o || Object.keys(o).length === 0) {
    return (
      <div style={{ fontSize: 8, color: COLORS.muted, fontStyle: "italic" }}>لا توجد بيانات</div>
    );
  }

  switch (agent.agentId) {
    case "market_analyst":
      return (
        <div className="grid grid-cols-3 gap-1" style={{ fontSize: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
          <KV label="D" value={o.dailyTrend?.slice(0, 3)} color={color} />
          <KV label="4H" value={o.h4Trend?.slice(0, 3)} color={color} />
          <KV label="1H" value={o.h1Trend?.slice(0, 3)} color={color} />
          <KV label="SES" value={o.session?.name} color={color} />
          <KV label="BIAS" value={o.bias} color={color} />
          <KV label="RGM" value={o.regime?.slice(0, 4)} color={color} />
        </div>
      );
    case "smc_strategist":
      return (
        <div className="space-y-0.5" style={{ fontSize: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
          <KV label="SETUP" value={o.hasSetup ? "VALID" : "NONE"} color={color} />
          {o.trade && (
            <>
              <KV label="TYPE" value={o.trade.type} color={color} />
              <KV label="ENTRY" value={`$${o.trade.entry?.toFixed(2)}`} color={color} />
              <KV label="R:R" value={`1:${o.trade.rrRatio?.toFixed(1)}`} color={color} />
            </>
          )}
          <KV label="COND" value={`${o.passedCount}/5`} color={color} />
        </div>
      );
    case "risk_manager":
      return (
        <div className="space-y-0.5" style={{ fontSize: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
          <KV label="APPROVED" value={o.approved ? "YES" : "NO"} color={color} />
          {o.lotSize && <KV label="LOT" value={o.lotSize?.toFixed(3)} color={color} />}
          {o.riskAmount && <KV label="RISK" value={`$${o.riskAmount?.toFixed(2)}`} color={color} />}
          {o.checks && (
            <div className="mt-1 flex flex-wrap gap-1">
              {o.checks.map((c: any, i: number) => (
                <span
                  key={i}
                  style={{
                    fontSize: 7,
                    padding: "1px 4px",
                    borderRadius: 2,
                    background: c.passed ? `${COLORS.green}20` : `${COLORS.red}20`,
                    color: c.passed ? COLORS.green : COLORS.red,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                  title={c.detail}
                >
                  {c.passed ? "✓" : "✗"} {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    case "ai_decision":
      return (
        <div className="grid grid-cols-2 gap-1" style={{ fontSize: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
          <KV label="VERDICT" value={o.finalVerdict} color={color} />
          <KV label="AI" value={o.aiVerdict} color={color} />
          <KV label="BIAS" value={o.analystBias} color={color} />
          <KV label="AGREE" value={`${o.agreement}%`} color={color} />
        </div>
      );
    case "execution":
      return (
        <div className="grid grid-cols-2 gap-1" style={{ fontSize: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
          <KV label="MODE" value={o.mode} color={color} />
          <KV label="BRIDGE" value={o.bridgeConfigured ? "ON" : "OFF"} color={color} />
          <KV label="READY" value={o.ready ? "YES" : "NO"} color={color} />
          {o.orderToExecute && (
            <KV label="ORDER" value={o.orderToExecute.type} color={color} />
          )}
        </div>
      );
    case "performance_monitor":
      return (
        <div className="grid grid-cols-3 gap-1" style={{ fontSize: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
          <KV label="WIN%" value={o.winRate} color={color} />
          <KV label="PF" value={o.profitFactor?.toFixed(2)} color={color} />
          <KV label="P/L" value={`$${o.totalPnl?.toFixed(0)}`} color={color} />
          <KV label="W/L" value={`${o.wins}/${o.losses}`} color={color} />
          <KV label="BEST" value={`$${o.bestTrade?.toFixed(0)}`} color={color} />
          <KV label="WRST" value={`$${o.worstTrade?.toFixed(0)}`} color={color} />
        </div>
      );
    default:
      return null;
  }
}

function KV({ label, value, color }: { label: string; value?: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: COLORS.muted }}>{label}</span>
      <span style={{ fontWeight: 700, color }} className="tabular-nums ltr-nums">{value ?? "—"}</span>
    </div>
  );
}
