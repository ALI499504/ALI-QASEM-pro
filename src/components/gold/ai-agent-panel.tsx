"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Zap,
  Target,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Sparkles,
  Award,
} from "lucide-react";

interface AgentStatus {
  mode: "MANUAL" | "SEMI_AUTO" | "FULL_AUTO";
  state: "IDLE" | "SCANNING" | "OPPORTUNITY_FOUND" | "IN_POSITION" | "COOLDOWN" | "PAUSED";
  decision: {
    action: "WAIT" | "PREPARE_ENTRY" | "ENTER" | "MANAGE_POSITION" | "EXIT" | "COOLDOWN";
    reasoning: string;
    confidence: number;
    urgency: "low" | "medium" | "high";
    tradeToExecute?: any;
    nextActionIn?: number;
  };
  memory: {
    tradeHistory: any[];
    dailyPnl: number;
    dailyTrades: number;
    dailyLossLimit: number;
    dailyLossLimitPct: number;
    maxDailyTrades: number;
    lastLossTimestamp: number | null;
    cooldownMs: number;
    currentPosition: any;
  };
  strategyResult: any;
  aiAnalysis: any;
  lastUpdate: number;
  isThinking: boolean;
  performance?: {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    bestTrade: number;
    worstTrade: number;
  };
}

const stateConfig: Record<string, { color: string; label: string; icon: any }> = {
  IDLE: { color: "#8892a0", label: "IDLE", icon: Clock },
  SCANNING: { color: "#4f8ff7", label: "SCANNING", icon: Activity },
  OPPORTUNITY_FOUND: { color: "#00d68f", label: "OPPORTUNITY", icon: Target },
  IN_POSITION: { color: "#f97316", label: "IN POSITION", icon: TrendingUp },
  COOLDOWN: { color: "#ffc107", label: "COOLDOWN", icon: Clock },
  PAUSED: { color: "#8892a0", label: "PAUSED", icon: Pause },
};

const actionConfig: Record<string, { color: string; label: string; ar: string }> = {
  WAIT: { color: "#8892a0", label: "WAIT", ar: "انتظار" },
  PREPARE_ENTRY: { color: "#4f8ff7", label: "PREPARE ENTRY", ar: "تحضير دخول" },
  ENTER: { color: "#00d68f", label: "ENTER", ar: "تنفيذ" },
  MANAGE_POSITION: { color: "#f97316", label: "MANAGE", ar: "إدارة صفقة" },
  EXIT: { color: "#ff4d6a", label: "EXIT", ar: "خروج" },
  COOLDOWN: { color: "#ffc107", label: "COOLDOWN", ar: "هدوء" },
};

const modeConfig: Record<string, { color: string; label: string; ar: string }> = {
  MANUAL: { color: "#4f8ff7", label: "MANUAL", ar: "يدوي" },
  SEMI_AUTO: { color: "#ffc107", label: "SEMI-AUTO", ar: "نصف تلقائي" },
  FULL_AUTO: { color: "#00d68f", label: "FULL AUTO", ar: "تلقائي كامل" },
};

export default function AIAgentPanel() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/gold/ai-agent", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setStatus(j);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 5_000); // refresh every 5s for live updates
    return () => clearInterval(i);
  }, [load]);

  const control = async (action: string, mode?: string) => {
    setBusy(true);
    try {
      await fetch("/api/gold/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, mode }),
      });
      await load();
    } catch {}
    finally { setBusy(false); }
  };

  const runCycle = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/gold/ai-agent?action=run", { cache: "no-store" });
      const j = await r.json();
      setStatus(j);
    } catch {}
    finally { setBusy(false); }
  };

  if (loading && !status) {
    return (
      <div className="rounded-2xl border border-[#1e2630] bg-[#0b0e11] p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#f97316]" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-2xl border border-[#1e2630] bg-[#0b0e11] p-4 text-center text-xs text-[#8892a0]">
        Agent unavailable
      </div>
    );
  }

  const stateInfo = stateConfig[status.state] || stateConfig.IDLE;
  const StateIcon = stateInfo.icon;
  const actionInfo = actionConfig[status.decision.action] || actionConfig.WAIT;
  const modeInfo = modeConfig[status.mode];

  const confidence = status.decision.confidence;
  const confidenceColor = confidence >= 80 ? "#00d68f" : confidence >= 50 ? "#ffc107" : "#8892a0";

  const dailyPnlColor = status.memory.dailyPnl >= 0 ? "#00d68f" : "#ff4d6a";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-[#4f8ff7]/40 bg-gradient-to-br from-[#0b0e11] via-[#0b0e11] to-[#151a21] overflow-hidden shadow-2xl shadow-black/50"
    >
      {/* === HEADER === */}
      <div className="relative px-4 py-3 border-b border-[#1e2630] bg-gradient-to-r from-[#4f8ff7]/10 via-transparent to-[#4f8ff7]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{
                boxShadow: status.isThinking
                  ? ["0 0 0 0 rgba(91,140,255,0.5)", "0 0 0 8px rgba(91,140,255,0)"]
                  : "0 0 0 0 rgba(91,140,255,0)",
              }}
              transition={{ duration: 1.5, repeat: status.isThinking ? Infinity : 0 }}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#4f8ff7] to-[#3b5cff]"
            >
              <Brain className="w-5 h-5 text-white" strokeWidth={2.4} />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">AI TRADING AGENT</h2>
                <motion.span
                  animate={{ opacity: status.isThinking ? [0.4, 1, 0.4] : 1 }}
                  transition={{ duration: 1, repeat: status.isThinking ? Infinity : 0 }}
                  className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: `${stateInfo.color}20`, color: stateInfo.color }}
                >
                  {status.isThinking ? "THINKING..." : stateInfo.label}
                </motion.span>
              </div>
              <p className="text-[9px] text-[#8892a0] mt-0.5 tracking-widest">
                AUTONOMOUS • SMC/ICT • GLM-4 POWERED
              </p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#1e2630] border border-[#1e2630]">
            {(["MANUAL", "SEMI_AUTO", "FULL_AUTO"] as const).map((m) => {
              const info = modeConfig[m];
              const isActive = status.mode === m;
              return (
                <button
                  key={m}
                  onClick={() => control("set_mode", m)}
                  disabled={busy}
                  className="px-2 py-1 rounded text-[9px] font-bold tracking-wide transition disabled:opacity-50"
                  style={{
                    background: isActive ? info.color : "transparent",
                    color: isActive ? "#000" : "#8892a0",
                  }}
                  title={info.ar}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* === DECISION CARD (Main brain output) === */}
        <motion.div
          key={status.decision.action}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border p-3"
          style={{
            borderColor: `${actionInfo.color}40`,
            background: `linear-gradient(135deg, ${actionInfo.color}15, transparent)`,
          }}
        >
          <div className="flex items-start gap-3">
            {/* Action icon */}
            <motion.div
              animate={{ rotate: status.isThinking ? [0, 360] : 0 }}
              transition={{ duration: 2, repeat: status.isThinking ? Infinity : 0, ease: "linear" }}
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${actionInfo.color}20`, border: `2px solid ${actionInfo.color}50` }}
            >
              {status.decision.action === "ENTER" ? (
                <Zap className="w-6 h-6" style={{ color: actionInfo.color }} />
              ) : status.decision.action === "EXIT" ? (
                <AlertTriangle className="w-6 h-6" style={{ color: actionInfo.color }} />
              ) : status.decision.action === "WAIT" ? (
                <Clock className="w-6 h-6" style={{ color: actionInfo.color }} />
              ) : (
                <Sparkles className="w-6 h-6" style={{ color: actionInfo.color }} />
              )}
            </motion.div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-[9px] text-[#8892a0] tracking-wider">DECISION</div>
                  <div className="text-lg font-extrabold" style={{ color: actionInfo.color }}>
                    {actionInfo.label}
                  </div>
                </div>
                {/* Confidence gauge */}
                <div className="text-right">
                  <div className="text-[9px] text-[#8892a0] tracking-wider">CONFIDENCE</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-[#1e2630] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${confidence}%` }}
                        className="h-full rounded-full"
                        style={{ background: confidenceColor }}
                      />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums ltr-nums" style={{ color: confidenceColor }}>
                      {confidence}%
                    </span>
                  </div>
                </div>
              </div>
              {/* Reasoning */}
              <div className="text-[10px] text-[#e4e8ed] leading-relaxed mt-2">
                {status.decision.reasoning}
              </div>
              {/* Next action */}
              {status.decision.nextActionIn && (
                <div className="mt-2 flex items-center gap-1 text-[9px] text-[#8892a0]">
                  <Clock className="w-3 h-3" />
                  <span>الإجراء التالي خلال: {status.decision.nextActionIn}s</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* === STATE MACHINE FLOW === */}
        <div className="rounded-xl border border-[#1e2630] bg-[#151a21] p-3">
          <div className="text-[10px] font-bold text-[#f97316] mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            حالة الـ Agent (State Machine)
          </div>
          <div className="flex items-center gap-1">
            {(["IDLE", "SCANNING", "OPPORTUNITY_FOUND", "IN_POSITION", "COOLDOWN"] as const).map((s, i) => {
              const info = stateConfig[s];
              const isActive = status.state === s;
              const Icon = info.icon;
              return (
                <div key={s} className="flex-1 flex flex-col items-center">
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div
                        className="flex-1 h-0.5"
                        style={{ background: isActive ? info.color : "#1e2630" }}
                      />
                    )}
                    <motion.div
                      animate={{
                        scale: isActive ? [1, 1.1, 1] : 1,
                        boxShadow: isActive ? `0 0 12px ${info.color}80` : "none",
                      }}
                      transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
                      className="w-7 h-7 rounded-full flex items-center justify-center border-2"
                      style={{
                        borderColor: isActive ? info.color : "#1e2630",
                        background: isActive ? `${info.color}30` : "#0b0e11",
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: isActive ? info.color : "#8892a0" }} />
                    </motion.div>
                    {i < 4 && (
                      <div
                        className="flex-1 h-0.5"
                        style={{ background: "#1e2630" }}
                      />
                    )}
                  </div>
                  <div className="text-[7px] mt-1 text-center font-bold tracking-wider"
                    style={{ color: isActive ? info.color : "#8892a0" }}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* === STATS GRID === */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Daily P/L */}
          <div className="rounded-xl border border-[#1e2630] bg-[#151a21] p-2.5">
            <div className="text-[8px] text-[#8892a0] tracking-wider mb-0.5">DAILY P/L</div>
            <div className="text-sm font-bold tabular-nums ltr-nums" style={{ color: dailyPnlColor }}>
              {status.memory.dailyPnl >= 0 ? "+" : ""}${status.memory.dailyPnl.toFixed(2)}
            </div>
            <div className="text-[8px] text-[#8892a0] mt-0.5">
              limit: -${status.memory.dailyLossLimit.toFixed(0)}
            </div>
          </div>

          {/* Trades today */}
          <div className="rounded-xl border border-[#1e2630] bg-[#151a21] p-2.5">
            <div className="text-[8px] text-[#8892a0] tracking-wider mb-0.5">TRADES TODAY</div>
            <div className="text-sm font-bold text-white tabular-nums ltr-nums">
              {status.memory.dailyTrades}
              <span className="text-[#8892a0] text-[10px]"> / {status.memory.maxDailyTrades}</span>
            </div>
            <div className="text-[8px] text-[#8892a0] mt-0.5">max daily</div>
          </div>

          {/* Win rate */}
          <div className="rounded-xl border border-[#1e2630] bg-[#151a21] p-2.5">
            <div className="text-[8px] text-[#8892a0] tracking-wider mb-0.5">WIN RATE</div>
            <div className="text-sm font-bold text-[#00d68f] tabular-nums ltr-nums">
              {status.performance?.winRate ?? 0}%
            </div>
            <div className="text-[8px] text-[#8892a0] mt-0.5">
              {status.performance?.wins ?? 0}W / {status.performance?.losses ?? 0}L
            </div>
          </div>

          {/* Total P/L */}
          <div className="rounded-xl border border-[#1e2630] bg-[#151a21] p-2.5">
            <div className="text-[8px] text-[#8892a0] tracking-wider mb-0.5">TOTAL P/L</div>
            <div className="text-sm font-bold tabular-nums ltr-nums"
              style={{ color: (status.performance?.totalPnl ?? 0) >= 0 ? "#00d68f" : "#ff4d6a" }}
            >
              {(status.performance?.totalPnl ?? 0) >= 0 ? "+" : ""}${(status.performance?.totalPnl ?? 0).toFixed(2)}
            </div>
            <div className="text-[8px] text-[#8892a0] mt-0.5">
              {status.performance?.totalTrades ?? 0} trades
            </div>
          </div>
        </div>

        {/* === CURRENT POSITION (if any) === */}
        {status.memory.currentPosition && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#f97316]/40 bg-gradient-to-r from-[#f97316]/10 to-transparent p-3"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#f97316]" />
              <span className="text-[11px] font-bold text-[#f97316]">الصفقة المفتوحة</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="bg-[#1e2630] rounded p-2">
                <div className="text-[#8892a0]">Type</div>
                <div className="font-bold" style={{ color: status.memory.currentPosition.type === "BUY" ? "#00d68f" : "#ff4d6a" }}>
                  {status.memory.currentPosition.type} {status.memory.currentPosition.symbol}
                </div>
              </div>
              <div className="bg-[#1e2630] rounded p-2">
                <div className="text-[#8892a0]">Volume</div>
                <div className="text-white font-bold tabular-nums ltr-nums">{status.memory.currentPosition.volume}</div>
              </div>
              <div className="bg-[#1e2630] rounded p-2">
                <div className="text-[#8892a0]">Entry</div>
                <div className="text-white font-bold tabular-nums ltr-nums">${status.memory.currentPosition.entry.toFixed(2)}</div>
              </div>
              <div className="bg-[#1e2630] rounded p-2">
                <div className="text-[#8892a0]">Current</div>
                <div className="text-white font-bold tabular-nums ltr-nums">${status.memory.currentPosition.currentPrice.toFixed(2)}</div>
              </div>
              <div className="bg-[#1e2630] rounded p-2">
                <div className="text-[#8892a0]">Floating P/L</div>
                <div className="font-bold tabular-nums ltr-nums"
                  style={{ color: status.memory.currentPosition.floatingPL >= 0 ? "#00d68f" : "#ff4d6a" }}
                >
                  {status.memory.currentPosition.floatingPL >= 0 ? "+" : ""}${status.memory.currentPosition.floatingPL.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#1e2630] rounded p-2">
                <div className="text-[#8892a0]">Ticket</div>
                <div className="text-white font-bold tabular-nums ltr-nums">#{status.memory.currentPosition.ticket}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* === TRADE HISTORY (last 5) === */}
        {status.memory.tradeHistory.length > 0 && (
          <div className="rounded-xl border border-[#1e2630] bg-[#151a21] p-3">
            <div className="text-[10px] font-bold text-[#f97316] mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              آخر الصفقات ({status.memory.tradeHistory.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {status.memory.tradeHistory.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px] py-1 border-b border-[#1e2630]/50 last:border-0">
                  <span className="font-bold" style={{ color: t.type === "BUY" ? "#00d68f" : "#ff4d6a" }}>
                    {t.type}
                  </span>
                  <span className="text-[#e4e8ed] tabular-nums ltr-nums">${t.entry?.toFixed(2)}</span>
                  {t.exit && (
                    <span className="text-[#e4e8ed] tabular-nums ltr-nums">→ ${t.exit.toFixed(2)}</span>
                  )}
                  <span
                    className="ml-auto font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: t.outcome === "WIN" ? "rgba(34,211,154,0.15)" :
                                 t.outcome === "LOSS" ? "rgba(244,63,94,0.15)" :
                                 t.outcome === "OPEN" ? "rgba(91,140,255,0.15)" :
                                 "rgba(107,114,128,0.15)",
                      color: t.outcome === "WIN" ? "#00d68f" :
                             t.outcome === "LOSS" ? "#ff4d6a" :
                             t.outcome === "OPEN" ? "#4f8ff7" : "#8892a0",
                    }}
                  >
                    {t.outcome}
                  </span>
                  {t.pnl != null && (
                    <span className="font-bold tabular-nums ltr-nums"
                      style={{ color: t.pnl >= 0 ? "#00d68f" : "#ff4d6a" }}
                    >
                      {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === CONTROL BUTTONS === */}
        <div className="flex items-center gap-2">
          <button
            onClick={runCycle}
            disabled={busy || status.state === "PAUSED"}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1e2630] hover:bg-[#232a3a] text-white text-[10px] font-bold transition disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {busy ? "جاري..." : "فحص فوري"}
          </button>

          {status.state === "PAUSED" ? (
            <button
              onClick={() => control("resume")}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#00d68f]/20 hover:bg-[#00d68f]/30 text-[#00d68f] border border-[#00d68f]/40 text-[10px] font-bold transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              استئناف
            </button>
          ) : (
            <button
              onClick={() => control("pause")}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#ffc107]/20 hover:bg-[#ffc107]/30 text-[#ffc107] border border-[#ffc107]/40 text-[10px] font-bold transition disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5" />
              إيقاف
            </button>
          )}

          <button
            onClick={() => { if (confirm("متأكد من إعادة ضبط الذاكرة؟ سيتم حذف سجل الصفقات.")) control("reset"); }}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#ff4d6a]/20 hover:bg-[#ff4d6a]/30 text-[#ff4d6a] border border-[#ff4d6a]/40 text-[10px] font-bold transition disabled:opacity-50"
            title="إعادة ضبط الذاكرة"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* === AI ANALYSIS (from agent's last cycle) === */}
        {status.aiAnalysis && (
          <div className="rounded-xl border border-[#4f8ff7]/30 bg-gradient-to-r from-[#4f8ff7]/5 to-transparent p-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-3.5 h-3.5 text-[#4f8ff7]" />
              <span className="text-[11px] font-bold text-[#4f8ff7]">آخر تحليل AI</span>
              <span className="text-[9px] text-[#8892a0] ml-auto">
                {status.aiAnalysis.modelUsed} • {status.aiAnalysis.finalVerdict}
              </span>
            </div>
            <div className="text-[10px] text-[#e4e8ed] leading-relaxed">
              {status.aiAnalysis.marketNarrative}
            </div>
          </div>
        )}

        {/* === FOOTER === */}
        <div className="flex items-center justify-between text-[8px] text-[#8892a0] border-t border-[#1e2630] pt-2">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d68f] animate-pulse" />
            {status.state === "PAUSED" ? "متوقف" : "نشط"}
          </span>
          <span className="tabular-nums ltr-nums">
            آخر تحديث: {new Date(status.lastUpdate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
