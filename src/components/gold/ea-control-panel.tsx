"use client";

// =====================================================================
//  EA Control Panel — Expert Advisor Management UI
// =====================================================================
//  Shows:
//    • EA state (STOPPED / SCANNING / SIGNAL_FOUND / POSITION_OPEN / MANAGING)
//    • Start / Stop button
//    • Last signal (BUY/SELL/WAIT) with score and reasons
//    • Open positions (with live P/L)
//    • Trading statistics (total trades, win rate, P/L)
//    • Configuration panel (risk %, lot size, strategy params)
//    • Decision log (recent 50 entries)
// =====================================================================

import { useEffect, useState, useCallback } from "react";
import {
  X, Play, Square, RefreshCw, TrendingUp, TrendingDown, Activity,
  Settings, Zap, Clock, ChevronDown, ChevronRight, AlertTriangle,
} from "lucide-react";

interface EASignal {
  timestamp: number;
  type: "BUY" | "SELL" | "WAIT";
  score: number;
  reasons: string[];
  price: number;
  ema50: number;
  ema200: number;
  rsi: number;
  atr: number;
  sar: number;
  recommendedSL: number;
  recommendedTP: number;
  recommendedVolume: number;
}

interface EAStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  largestWin: number;
  largestLoss: number;
  winRate: number;
  startedAt: number | null;
  lastScanAt: number | null;
  lastSignalAt: number | null;
  lastTradeAt: number | null;
  uptimeSec: number;
}

interface EAConfig {
  enabled: boolean;
  symbol: string;
  timeframe: string;
  scanIntervalSec: number;
  riskPercent: number;
  maxPositions: number;
  emaFastPeriod: number;
  emaSlowPeriod: number;
  rsiPeriod: number;
  atrPeriod: number;
  slMultiplier: number;
  tpMultiplier: number;
  psarStep: number;
  psarMax: number;
  enableTrailingStop: boolean;
  magicNumber: number;
  minSignalScore: number;
}

interface EALogEntry {
  timestamp: number;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  category: string;
  message: string;
  details?: any;
}

interface EAStatus {
  state: string;
  enabled: boolean;
  config: EAConfig;
  lastSignal: EASignal | null;
  stats: EAStats;
  positions: {
    count: number;
    list: any[];
    floatingPL: number;
  };
  summary: {
    totalTrades: number;
    winRate: string;
    netProfit: number;
    floatingPL: number;
    totalEquity: number;
    uptimeSec: number;
    lastScanAt: number | null;
    lastSignalAt: number | null;
    lastTradeAt: number | null;
  };
}

const COLORS = {
  bg: "#0e0e0e",
  panel: "#1a1a1a",
  panelHeader: "#232323",
  border: "#2a2a2a",
  borderLight: "#3a3a3a",
  text: "#d4d4d4",
  textBright: "#ffffff",
  textMuted: "#888888",
  bid: "#ef4444",
  ask: "#22c55e",
  accent: "#3b82f6",
  warning: "#f59e0b",
};

export default function EAControlPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<EAStatus | null>(null);
  const [logs, setLogs] = useState<EALogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "positions" | "logs" | "config">("dashboard");
  const [showConfig, setShowConfig] = useState(false);

  // Local config state (for editing)
  const [localConfig, setLocalConfig] = useState<EAConfig | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/ea/status", { cache: "no-store" });
      const d = await r.json();
      setStatus(d);
      if (!localConfig && d.config) setLocalConfig(d.config);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [localConfig]);

  const fetchLogs = useCallback(async () => {
    try {
      const r = await fetch("/api/ea/logs?count=30", { cache: "no-store" });
      const d = await r.json();
      setLogs(d.logs || []);
    } catch {
      // ignore
    }
  }, []);

  const startEA = useCallback(async () => {
    setActionInProgress(true);
    try {
      await fetch("/api/ea/start", { method: "POST" });
      await fetchStatus();
    } finally {
      setTimeout(() => setActionInProgress(false), 500);
    }
  }, [fetchStatus]);

  const stopEA = useCallback(async () => {
    setActionInProgress(true);
    try {
      await fetch("/api/ea/stop", { method: "POST" });
      await fetchStatus();
    } finally {
      setTimeout(() => setActionInProgress(false), 500);
    }
  }, [fetchStatus]);

  const triggerScan = useCallback(async () => {
    setActionInProgress(true);
    try {
      await fetch("/api/ea/scan", { method: "POST" });
      await fetchStatus();
      await fetchLogs();
    } finally {
      setTimeout(() => setActionInProgress(false), 500);
    }
  }, [fetchStatus, fetchLogs]);

  const saveConfig = useCallback(async () => {
    if (!localConfig) return;
    setActionInProgress(true);
    try {
      await fetch("/api/ea/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localConfig),
      });
      await fetchStatus();
    } finally {
      setTimeout(() => setActionInProgress(false), 500);
    }
  }, [localConfig, fetchStatus]);

  useEffect(() => {
    if (open) {
      fetchStatus();
      fetchLogs();
      const interval = setInterval(() => {
        fetchStatus();
        fetchLogs();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [open, fetchStatus, fetchLogs]);

  if (!open) return null;

  const isRunning = status?.enabled && status.state !== "STOPPED";
  const stateColor = !isRunning
    ? COLORS.textMuted
    : status.state === "ERROR"
      ? COLORS.bid
      : status.state === "SCANNING"
        ? COLORS.accent
        : status.state === "SIGNAL_FOUND"
          ? COLORS.warning
          : status.state === "POSITION_OPEN" || status.state === "MANAGING"
            ? COLORS.ask
            : COLORS.text;

  const uptime = status?.stats.uptimeSec ?? 0;
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;

  const lastSignalAge = status?.summary.lastSignalAt
    ? Math.floor((Date.now() - status.summary.lastSignalAt) / 1000)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-2xl overflow-hidden flex flex-col"
        style={{
          background: COLORS.bg,
          border: `1px solid ${COLORS.borderLight}`,
          width: "min(950px, 95vw)",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* === Header === */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            background: COLORS.panelHeader,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: stateColor,
                animation: isRunning ? "pulse 2s infinite" : "none",
              }}
            />
            <div>
              <div className="text-[13px] font-bold flex items-center gap-2" style={{ color: COLORS.textBright }}>
                <Zap className="w-3.5 h-3.5" style={{ color: COLORS.accent }} />
                Expert Advisor — Control Panel
              </div>
              <div className="text-[10px]" style={{ color: COLORS.textMuted }}>
                M.ROBOT Automated Trading Engine v1.0 • {status?.config.timeframe ?? "15m"} • Risk {status?.config.riskPercent ?? 1}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                onClick={stopEA}
                disabled={actionInProgress}
                className="px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5"
                style={{
                  background: `${COLORS.bid}20`,
                  border: `1px solid ${COLORS.bid}40`,
                  color: COLORS.bid,
                }}
              >
                <Square className="w-3 h-3" />
                Stop EA
              </button>
            ) : (
              <button
                onClick={startEA}
                disabled={actionInProgress}
                className="px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5"
                style={{
                  background: `${COLORS.ask}20`,
                  border: `1px solid ${COLORS.ask}40`,
                  color: COLORS.ask,
                }}
              >
                <Play className="w-3 h-3" />
                Start EA
              </button>
            )}
            <button
              onClick={triggerScan}
              disabled={actionInProgress}
              className="px-2 py-1.5 rounded text-[11px] flex items-center gap-1"
              style={{
                background: `${COLORS.accent}20`,
                border: `1px solid ${COLORS.accent}40`,
                color: COLORS.accent,
              }}
              title="Trigger manual market scan"
            >
              <RefreshCw className={`w-3 h-3 ${actionInProgress ? "animate-spin" : ""}`} />
              Scan
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:opacity-70"
              style={{ color: COLORS.textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* === Status bar === */}
        <div
          className="flex items-center justify-between px-4 py-2 text-[10px] flex-shrink-0"
          style={{
            background: COLORS.panel,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="flex items-center gap-4">
            <span>
              <span style={{ color: COLORS.textMuted }}>State:</span>{" "}
              <span style={{ color: stateColor, fontWeight: 700 }}>
                {status?.state ?? "—"}
              </span>
            </span>
            <span>
              <span style={{ color: COLORS.textMuted }}>Uptime:</span>{" "}
              <span style={{ color: COLORS.textBright }}>
                {isRunning ? uptimeStr : "—"}
              </span>
            </span>
            <span>
              <span style={{ color: COLORS.textMuted }}>Last scan:</span>{" "}
              <span style={{ color: COLORS.text }}>
                {status?.summary.lastScanAt
                  ? `${Math.floor((Date.now() - status.summary.lastScanAt) / 1000)}s ago`
                  : "—"}
              </span>
            </span>
            <span>
              <span style={{ color: COLORS.textMuted }}>Last signal:</span>{" "}
              <span style={{ color: COLORS.text }}>
                {lastSignalAge !== null ? `${lastSignalAge}s ago` : "—"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3" style={{ color: isRunning ? COLORS.ask : COLORS.textMuted }} />
            <span style={{ color: isRunning ? COLORS.ask : COLORS.textMuted }}>
              {isRunning ? "AUTO-TRADING ACTIVE" : "EA STOPPED"}
            </span>
          </div>
        </div>

        {/* === Tabs === */}
        <div
          className="flex items-center gap-1 px-4 py-1.5 flex-shrink-0"
          style={{
            background: COLORS.panel,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          {[
            { id: "dashboard" as const, label: "Dashboard", icon: Activity },
            { id: "positions" as const, label: `Positions (${status?.positions.count ?? 0})`, icon: TrendingUp },
            { id: "logs" as const, label: "Decision Log", icon: Clock },
            { id: "config" as const, label: "Configuration", icon: Settings },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-3 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1.5 transition"
                style={{
                  background: active ? `${COLORS.accent}20` : "transparent",
                  color: active ? COLORS.accent : COLORS.textMuted,
                  border: active ? `1px solid ${COLORS.accent}40` : `1px solid transparent`,
                }}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* === Content === */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div
              className="flex items-center justify-center py-12 text-[11px]"
              style={{ color: COLORS.textMuted }}
            >
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading EA status...
            </div>
          ) : activeTab === "dashboard" ? (
            <DashboardTab status={status} />
          ) : activeTab === "positions" ? (
            <PositionsTab positions={status?.positions.list ?? []} floatingPL={status?.positions.floatingPL ?? 0} />
          ) : activeTab === "logs" ? (
            <LogsTab logs={logs} />
          ) : (
            <ConfigTab
              config={localConfig}
              onChange={setLocalConfig}
              onSave={saveConfig}
              saving={actionInProgress}
              expanded={showConfig}
              onToggleExpand={() => setShowConfig(!showConfig)}
            />
          )}
        </div>

        {/* === Footer === */}
        <div
          className="flex items-center justify-between px-4 py-2 text-[9px] flex-shrink-0"
          style={{
            background: COLORS.panelHeader,
            borderTop: `1px solid ${COLORS.border}`,
            color: COLORS.textMuted,
          }}
        >
          <span>
            Strategy: Confluence (EMA 50/200 + RSI 14 + ATR 14 + PSAR) • MQL5 Library
          </span>
          <span>
            Last update: {status ? new Date().toLocaleTimeString("en-GB") : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ====================== Dashboard Tab ======================
function DashboardTab({ status }: { status: EAStatus | null }) {
  if (!status) return null;
  const sig = status.lastSignal;
  const sigColor = sig?.type === "BUY" ? COLORS.ask : sig?.type === "SELL" ? COLORS.bid : COLORS.textMuted;

  return (
    <div className="space-y-4">
      {/* === Last Signal Card === */}
      <div
        className="p-3 rounded"
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}` }}
      >
        <div className="text-[10px] uppercase mb-2" style={{ color: COLORS.textMuted }}>
          Last Signal
        </div>
        {!sig ? (
          <div className="text-[11px]" style={{ color: COLORS.textMuted }}>
            No signal yet — start the EA or trigger a manual scan
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="px-3 py-1.5 rounded text-[14px] font-bold"
                style={{ background: `${sigColor}20`, color: sigColor, border: `1px solid ${sigColor}40` }}
              >
                {sig.type === "BUY" ? <TrendingUp className="w-4 h-4 inline mr-1" /> :
                 sig.type === "SELL" ? <TrendingDown className="w-4 h-4 inline mr-1" /> : null}
                {sig.type}
              </div>
              <div>
                <div className="text-[12px]" style={{ color: COLORS.textBright, fontWeight: 700 }}>
                  Score: {sig.score}/100
                </div>
                <div className="text-[9px]" style={{ color: COLORS.textMuted }}>
                  {new Date(sig.timestamp).toLocaleTimeString("en-GB")}
                </div>
              </div>
            </div>

            {/* Indicator values */}
            <div className="grid grid-cols-5 gap-2 text-[10px] mb-3">
              <Metric label="Price" value={sig.price.toFixed(2)} />
              <Metric label="EMA 50" value={sig.ema50.toFixed(2)} />
              <Metric label="EMA 200" value={sig.ema200.toFixed(2)} />
              <Metric label="RSI" value={sig.rsi.toFixed(1)} />
              <Metric label="ATR" value={sig.atr.toFixed(2)} />
              <Metric label="PSAR" value={sig.sar.toFixed(2)} />
              <Metric label="SL" value={sig.recommendedSL.toFixed(2)} color={COLORS.bid} />
              <Metric label="TP" value={sig.recommendedTP.toFixed(2)} color={COLORS.ask} />
              <Metric label="Volume" value={`${sig.recommendedVolume.toFixed(2)} lot`} color={COLORS.accent} />
              <Metric label="R:R" value={`1:${(sig.recommendedTP - sig.price) / (sig.price - sig.recommendedSL) >= 0 ? ((sig.recommendedTP - sig.price) / (sig.price - sig.recommendedSL)).toFixed(2) : "—"}`} />
            </div>

            {/* Reasons */}
            <div className="text-[10px]" style={{ color: COLORS.textMuted }}>
              <div className="mb-1" style={{ color: COLORS.text }}>Reasons:</div>
              <ul className="list-disc ml-4 space-y-0.5">
                {sig.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* === Trading Stats === */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Total Trades" value={String(status.stats.totalTrades)} />
        <StatCard
          label="Win Rate"
          value={`${status.stats.winRate.toFixed(1)}%`}
          color={status.stats.winRate >= 50 ? COLORS.ask : COLORS.bid}
        />
        <StatCard
          label="Net Profit"
          value={`$${(status.stats.totalProfit - status.stats.totalLoss).toFixed(2)}`}
          color={(status.stats.totalProfit - status.stats.totalLoss) >= 0 ? COLORS.ask : COLORS.bid}
        />
        <StatCard
          label="Floating P/L"
          value={`${status.positions.floatingPL >= 0 ? "+" : ""}$${status.positions.floatingPL.toFixed(2)}`}
          color={status.positions.floatingPL >= 0 ? COLORS.ask : COLORS.bid}
        />
        <StatCard label="Winning Trades" value={String(status.stats.winningTrades)} color={COLORS.ask} />
        <StatCard label="Losing Trades" value={String(status.stats.losingTrades)} color={COLORS.bid} />
        <StatCard label="Largest Win" value={`$${status.stats.largestWin.toFixed(2)}`} color={COLORS.ask} />
        <StatCard label="Largest Loss" value={`-$${status.stats.largestLoss.toFixed(2)}`} color={COLORS.bid} />
      </div>

      {/* === Config Summary === */}
      <div
        className="p-3 rounded text-[10px]"
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}` }}
      >
        <div className="text-[10px] uppercase mb-2" style={{ color: COLORS.textMuted }}>
          Configuration
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Timeframe" value={status.config.timeframe} />
          <StatCard label="Risk %" value={`${status.config.riskPercent}%`} />
          <StatCard label="Max Positions" value={String(status.config.maxPositions)} />
          <StatCard label="Min Score" value={String(status.config.minSignalScore)} />
          <StatCard label="Scan Interval" value={`${status.config.scanIntervalSec}s`} />
          <StatCard label="SL × ATR" value={String(status.config.slMultiplier)} />
          <StatCard label="TP × ATR" value={String(status.config.tpMultiplier)} />
          <StatCard label="Trailing Stop" value={status.config.enableTrailingStop ? "ON" : "OFF"} color={status.config.enableTrailingStop ? COLORS.ask : COLORS.textMuted} />
        </div>
      </div>
    </div>
  );
}

// ====================== Positions Tab ======================
function PositionsTab({ positions, floatingPL }: { positions: any[]; floatingPL: number }) {
  if (positions.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-12 text-[11px]"
        style={{ color: COLORS.textMuted }}
      >
        No open positions. The EA will open positions automatically when signals reach the threshold.
      </div>
    );
  }
  return (
    <div>
      <div
        className="p-2 mb-3 rounded text-[11px] flex justify-between"
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}` }}
      >
        <span style={{ color: COLORS.textMuted }}>
          Open Positions: <span style={{ color: COLORS.textBright }}>{positions.length}</span>
        </span>
        <span style={{ color: COLORS.textMuted }}>
          Floating P/L:{" "}
          <span style={{ color: floatingPL >= 0 ? COLORS.ask : COLORS.bid, fontWeight: 700 }}>
            {floatingPL >= 0 ? "+" : ""}${floatingPL.toFixed(2)}
          </span>
        </span>
      </div>
      <table className="w-full text-[10px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: COLORS.panelHeader, color: COLORS.textMuted }}>
            <th className="px-2 py-1 text-left font-normal">Ticket</th>
            <th className="px-2 py-1 text-left font-normal">Type</th>
            <th className="px-2 py-1 text-right font-normal">Volume</th>
            <th className="px-2 py-1 text-right font-normal">Open</th>
            <th className="px-2 py-1 text-right font-normal">Current</th>
            <th className="px-2 py-1 text-right font-normal">SL</th>
            <th className="px-2 py-1 text-right font-normal">TP</th>
            <th className="px-2 py-1 text-right font-normal">P/L</th>
            <th className="px-2 py-1 text-left font-normal">Comment</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.ticket} style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <td className="px-2 py-1" style={{ color: COLORS.textMuted }}>#{p.ticket}</td>
              <td className="px-2 py-1">
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                  style={{
                    background: p.type === "BUY" ? `${COLORS.ask}20` : `${COLORS.bid}20`,
                    color: p.type === "BUY" ? COLORS.ask : COLORS.bid,
                  }}
                >
                  {p.type}
                </span>
              </td>
              <td className="px-2 py-1 text-right">{p.volume.toFixed(2)}</td>
              <td className="px-2 py-1 text-right">{p.priceOpen.toFixed(2)}</td>
              <td className="px-2 py-1 text-right" style={{ color: COLORS.textBright }}>{p.priceCurrent.toFixed(2)}</td>
              <td className="px-2 py-1 text-right" style={{ color: COLORS.bid }}>
                {p.sl > 0 ? p.sl.toFixed(2) : "—"}
              </td>
              <td className="px-2 py-1 text-right" style={{ color: COLORS.ask }}>
                {p.tp > 0 ? p.tp.toFixed(2) : "—"}
              </td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: p.profit >= 0 ? COLORS.ask : COLORS.bid }}>
                {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
              </td>
              <td className="px-2 py-1" style={{ color: COLORS.textMuted }}>{p.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ====================== Logs Tab ======================
function LogsTab({ logs }: { logs: EALogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-12 text-[11px]"
        style={{ color: COLORS.textMuted }}
      >
        No logs yet — start the EA to see decision logs.
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {logs.map((log, i) => (
        <div
          key={i}
          className="px-2 py-1.5 rounded text-[10px] flex items-start gap-2"
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <span style={{ color: COLORS.textMuted, fontSize: 9, minWidth: 65 }}>
            {new Date(log.timestamp).toLocaleTimeString("en-GB")}
          </span>
          <span
            className="px-1.5 py-0.5 rounded font-bold"
            style={{
              background:
                log.level === "ERROR" ? `${COLORS.bid}20`
                : log.level === "WARN" ? `${COLORS.warning}20`
                : log.level === "INFO" ? `${COLORS.accent}20`
                : "transparent",
              color:
                log.level === "ERROR" ? COLORS.bid
                : log.level === "WARN" ? COLORS.warning
                : log.level === "INFO" ? COLORS.accent
                : COLORS.textMuted,
              fontSize: 9,
              minWidth: 45,
            }}
          >
            {log.level}
          </span>
          <span
            className="px-1.5 py-0.5 rounded"
            style={{
              background: `${COLORS.borderLight}20`,
              color: COLORS.text,
              fontSize: 9,
              minWidth: 55,
            }}
          >
            {log.category}
          </span>
          <span style={{ color: COLORS.text, flex: 1 }}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

// ====================== Config Tab ======================
function ConfigTab({
  config, onChange, onSave, saving, expanded, onToggleExpand,
}: {
  config: EAConfig | null;
  onChange: (c: EAConfig) => void;
  onSave: () => void;
  saving: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  if (!config) return null;
  return (
    <div className="space-y-3">
      <div
        className="p-3 rounded"
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}` }}
      >
        <div className="text-[10px] uppercase mb-2 flex items-center gap-1" style={{ color: COLORS.textMuted }}>
          <ChevronRight
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            onClick={onToggleExpand}
            style={{ cursor: "pointer" }}
          />
          <span onClick={onToggleExpand} style={{ cursor: "pointer" }}>Strategy Configuration</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ConfigField label="Symbol" value={config.symbol} onChange={(v) => onChange({ ...config, symbol: v })} />
          <ConfigField label="Timeframe" value={config.timeframe} onChange={(v) => onChange({ ...config, timeframe: v })} />
          <ConfigField label="Scan Interval (sec)" type="number" value={String(config.scanIntervalSec)} onChange={(v) => onChange({ ...config, scanIntervalSec: Number(v) })} />
          <ConfigField label="Risk %" type="number" value={String(config.riskPercent)} onChange={(v) => onChange({ ...config, riskPercent: Number(v) })} />
          <ConfigField label="Max Positions" type="number" value={String(config.maxPositions)} onChange={(v) => onChange({ ...config, maxPositions: Number(v) })} />
          <ConfigField label="Min Signal Score" type="number" value={String(config.minSignalScore)} onChange={(v) => onChange({ ...config, minSignalScore: Number(v) })} />
          <ConfigField label="EMA Fast Period" type="number" value={String(config.emaFastPeriod)} onChange={(v) => onChange({ ...config, emaFastPeriod: Number(v) })} />
          <ConfigField label="EMA Slow Period" type="number" value={String(config.emaSlowPeriod)} onChange={(v) => onChange({ ...config, emaSlowPeriod: Number(v) })} />
          <ConfigField label="RSI Period" type="number" value={String(config.rsiPeriod)} onChange={(v) => onChange({ ...config, rsiPeriod: Number(v) })} />
          <ConfigField label="ATR Period" type="number" value={String(config.atrPeriod)} onChange={(v) => onChange({ ...config, atrPeriod: Number(v) })} />
          <ConfigField label="SL × ATR" type="number" value={String(config.slMultiplier)} onChange={(v) => onChange({ ...config, slMultiplier: Number(v) })} />
          <ConfigField label="TP × ATR" type="number" value={String(config.tpMultiplier)} onChange={(v) => onChange({ ...config, tpMultiplier: Number(v) })} />
          <ConfigField label="PSAR Step" type="number" value={String(config.psarStep)} onChange={(v) => onChange({ ...config, psarStep: Number(v) })} />
          <ConfigField label="PSAR Max" type="number" value={String(config.psarMax)} onChange={(v) => onChange({ ...config, psarMax: Number(v) })} />
          <ConfigField label="Magic Number" type="number" value={String(config.magicNumber)} onChange={(v) => onChange({ ...config, magicNumber: Number(v) })} />
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase" style={{ color: COLORS.textMuted }}>
              Trailing Stop
            </label>
            <input
              type="checkbox"
              checked={config.enableTrailingStop}
              onChange={(e) => onChange({ ...config, enableTrailingStop: e.target.checked })}
              className="w-3 h-3"
            />
          </div>
        </div>
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-2 rounded text-[12px] font-bold flex items-center justify-center gap-2"
        style={{ background: COLORS.accent, color: "#fff" }}
      >
        {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
        Save Configuration
      </button>
    </div>
  );
}

// ====================== Sub-components ======================
function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[8px] uppercase" style={{ color: COLORS.textMuted }}>{label}</div>
      <div className="text-[10px] font-bold" style={{ color: color || COLORS.text }}>{value}</div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="p-2 rounded text-center"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}` }}
    >
      <div className="text-[8px] uppercase" style={{ color: COLORS.textMuted }}>{label}</div>
      <div className="text-[13px] font-bold mt-0.5" style={{ color: color || COLORS.textBright }}>{value}</div>
    </div>
  );
}

function ConfigField({
  label, value, onChange, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div>
      <label className="text-[9px] uppercase block mb-1" style={{ color: COLORS.textMuted }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 text-[11px] rounded"
        style={{
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          color: COLORS.textBright,
        }}
      />
    </div>
  );
}
