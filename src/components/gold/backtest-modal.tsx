"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  BarChart3,
  FileText,
  List,
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";

const COLORS = {
  bg: "#1e1e1e",
  panel: "#252525",
  panelHeader: "#2d2d2d",
  border: "#3c3c3c",
  text: "#d4d4d4",
  textBright: "#ffffff",
  textMuted: "#888888",
  textDim: "#5a5a5a",
  bid: "#ff4d4d",
  ask: "#00b050",
  accent: "#007acc",
  warning: "#ffaa00",
  chartBg: "#1e1e1e",
};

type ModalTab = "graph" | "report" | "trades" | "journal";

interface Props {
  open: boolean;
  onClose: () => void;
  result: any;
  loading: boolean;
  onRun: () => void;
}

export default function BacktestModal({ open, onClose, result, loading, onRun }: Props) {
  const [tab, setTab] = useState<ModalTab>("graph");
  const equityCanvasRef = useRef<HTMLCanvasElement>(null);
  const ddCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !result?.equity) return;
    const timer = setTimeout(() => {
      drawCharts();
    }, 100);
    return () => clearTimeout(timer);
  }, [open, result, tab]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function drawCharts() {
    if (!result?.equity) return;
    drawChart(equityCanvasRef.current, result.equity, "equity", COLORS.ask, true);
    drawChart(ddCanvasRef.current, result.equity, "drawdown", COLORS.bid, true);
  }

  function drawChart(canvas: HTMLCanvasElement | null, data: any[], field: string, color: string, fill: boolean) {
    if (!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    const step = Math.max(1, Math.floor(data.length / 800));
    const sampled: any[] = [];
    for (let i = 0; i < data.length; i += step) sampled.push(data[i]);
    if (sampled[sampled.length - 1] !== data[data.length - 1]) sampled.push(data[data.length - 1]);
    const values = sampled.map((d: any) => d[field]);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.08;
    min -= pad; max += pad;

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const x = (w / 8) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // Area fill
    if (fill) {
      ctx.beginPath();
      sampled.forEach((d: any, i: number) => {
        const x = (i / (sampled.length - 1)) * w;
        const y = h - ((d[field] - min) / (max - min)) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color + "30");
      grad.addColorStop(1, color + "05");
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    sampled.forEach((d: any, i: number) => {
      const x = (i / (sampled.length - 1)) * w;
      const y = h - ((d[field] - min) / (max - min)) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Labels
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = "10px Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(max.toFixed(2), 6, 14);
    ctx.fillText(((max + min) / 2).toFixed(2), 6, h / 2 + 4);
    ctx.fillText(min.toFixed(2), 6, h - 6);

    // Zero line for drawdown
    if (field === "drawdown") {
      const zeroY = h - ((0 - min) / (max - min)) * h;
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (!open) return null;

  const s = result?.stats;
  const profit = s?.totalReturn >= 0;
  const trades = result?.trades || [];

  const tabs = [
    { id: "graph" as const, label: "Graph", icon: BarChart3 },
    { id: "report" as const, label: "Report", icon: FileText },
    { id: "trades" as const, label: "Trades", icon: List },
    { id: "journal" as const, label: "Journal", icon: Activity },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.9)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="flex flex-col m-auto rounded-lg overflow-hidden"
        style={{
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          width: "95vw",
          height: "92vh",
          maxWidth: 1600,
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* === Header === */}
        <div className="flex items-center justify-between px-4 h-10 flex-shrink-0"
          style={{ background: COLORS.panelHeader, borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center gap-2">
            <BarChart3 style={{ width: 16, height: 16, color: COLORS.accent }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textBright }}>
              Strategy Tester — M.ROBOT SMC Strict
            </span>
            {s && (
              <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 8 }}>
                {result.startDate?.slice(0, 10)} → {result.endDate?.slice(0, 10)} • {s.totalTrades} trades
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRun}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 rounded text-[11px] font-bold transition"
              style={{
                background: COLORS.accent,
                color: "#fff",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <RefreshCw style={{ width: 12, height: 12 }} className={loading ? "animate-spin" : ""} />
              {loading ? "Running..." : "Re-run"}
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-[#3c3c3c]" style={{ color: COLORS.text }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {/* === Tabs === */}
        <div className="flex items-center flex-shrink-0" style={{ background: COLORS.panelHeader, borderBottom: `1px solid ${COLORS.border}` }}>
          {tabs.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition"
                style={{
                  background: active ? COLORS.bg : "transparent",
                  color: active ? COLORS.textBright : COLORS.textMuted,
                  borderBottom: active ? `2px solid ${COLORS.accent}` : "none",
                  borderRight: `1px solid ${COLORS.border}`,
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* === Content === */}
        <div className="flex-1 overflow-hidden flex">
          {loading && (
            <div className="flex-1 flex items-center justify-center" style={{ color: COLORS.textMuted, fontSize: 13 }}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                  style={{ borderColor: COLORS.accent, borderTopColor: "transparent" }} />
                <div>Running 1-year backtest...</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Analyzing 5684 hourly candles with 5 SMC conditions</div>
              </div>
            </div>
          )}

          {!loading && !s && (
            <div className="flex-1 flex items-center justify-center" style={{ color: COLORS.textMuted, fontSize: 13 }}>
              <div className="text-center">
                <BarChart3 style={{ width: 48, height: 48, color: COLORS.accent, margin: "0 auto 12px" }} />
                <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>MT5 Strategy Tester</div>
                <div style={{ fontSize: 11, marginBottom: 16 }}>
                  باك تست احترافي لمدة سنة على بيانات حقيقية<br />
                  5684 شمعة • $1000 • 1% مخاطرة • R:R ≥ 1:1.3
                </div>
                <button onClick={onRun} className="px-6 py-2 rounded text-[12px] font-bold"
                  style={{ background: COLORS.accent, color: "#fff" }}>
                  ▶ Start Backtest
                </button>
              </div>
            </div>
          )}

          {/* === GRAPH TAB === */}
          {!loading && s && tab === "graph" && (
            <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
              {/* Equity Curve */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.ask }}>Equity Curve</span>
                  <span style={{ fontSize: 10, color: COLORS.textMuted }}>
                    ${s.initialBalance} → ${s.finalBalance} ({profit ? "+" : ""}{s.totalReturnPct}%)
                  </span>
                </div>
                <div style={{ background: COLORS.chartBg, border: `1px solid ${COLORS.border}`, borderRadius: 4, height: 300, position: "relative" }}>
                  <canvas ref={equityCanvasRef} style={{ width: "100%", height: "100%" }} />
                </div>
              </div>
              {/* Drawdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.bid }}>Drawdown</span>
                  <span style={{ fontSize: 10, color: COLORS.textMuted }}>Max: ${s.maxDrawdown} ({s.maxDrawdownPct}%)</span>
                </div>
                <div style={{ background: COLORS.chartBg, border: `1px solid ${COLORS.border}`, borderRadius: 4, height: 150, position: "relative" }}>
                  <canvas ref={ddCanvasRef} style={{ width: "100%", height: "100%" }} />
                </div>
              </div>
              {/* Monthly */}
              {result.monthly && result.monthly.length > 0 && (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent }}>Monthly Returns</span>
                  <div className="flex gap-1 mt-2" style={{ height: 60, alignItems: "flex-end" }}>
                    {result.monthly.map((m: any, i: number) => {
                      const up = m.returnPct >= 0;
                      const h = Math.min(55, Math.abs(m.returnPct) * 10);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${m.month}: ${m.returnPct}% (${m.trades} trades)`}>
                          <span style={{ fontSize: 8, color: up ? COLORS.ask : COLORS.bid, marginBottom: 2 }}>
                            {m.returnPct > 0 ? "+" : ""}{m.returnPct}%
                          </span>
                          <div style={{ width: "80%", height: Math.max(3, h), background: up ? COLORS.ask : COLORS.bid, borderRadius: 2 }} />
                          <span style={{ fontSize: 8, color: COLORS.textDim, marginTop: 2 }}>{m.month.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === REPORT TAB === */}
          {!loading && s && tab === "report" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textBright, marginBottom: 12 }}>Backtest Report</div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <ReportCard label="Initial Deposit" value={`$${s.initialBalance}`} color={COLORS.text} />
                <ReportCard label="Total Net Profit" value={`${profit ? "+" : ""}$${s.totalReturn}`} color={profit ? COLORS.ask : COLORS.bid} />
                <ReportCard label="Profit Factor" value={s.profitFactor} color={s.profitFactor >= 1.5 ? COLORS.ask : COLORS.warning} />
                <ReportCard label="Balance" value={`$${s.finalBalance}`} color={COLORS.text} />
                <ReportCard label="Total Return" value={`${profit ? "+" : ""}${s.totalReturnPct}%`} color={profit ? COLORS.ask : COLORS.bid} />
                <ReportCard label="Sharpe Ratio" value={s.sharpeRatio} color={COLORS.accent} />
                <ReportCard label="Total Trades" value={s.totalTrades} color={COLORS.text} />
                <ReportCard label="Win Rate" value={`${s.winRate}%`} color={s.winRate >= 50 ? COLORS.ask : COLORS.warning} />
                <ReportCard label="Profit Trades" value={`${s.wins} (${s.winRate}%)`} color={COLORS.ask} />
                <ReportCard label="Loss Trades" value={`${s.losses} (${(100 - s.winRate).toFixed(1)}%)`} color={COLORS.bid} />
                <ReportCard label="Max Drawdown" value={`$${s.maxDrawdown} (${s.maxDrawdownPct}%)`} color={COLORS.bid} />
                <ReportCard label="Avg Win" value={`$${s.avgWin}`} color={COLORS.ask} />
                <ReportCard label="Avg Loss" value={`$${s.avgLoss}`} color={COLORS.bid} />
                <ReportCard label="Biggest Win" value={`$${s.biggestWin}`} color={COLORS.ask} />
                <ReportCard label="Biggest Loss" value={`$${s.biggestLoss}`} color={COLORS.bid} />
                <ReportCard label="Win Streak" value={s.longestWinStreak} color={COLORS.ask} />
                <ReportCard label="Loss Streak" value={s.longestLossStreak} color={COLORS.bid} />
                <ReportCard label="Buy Trades" value={`${s.buyTrades}`} color={COLORS.ask} />
                <ReportCard label="Sell Trades" value={`${s.sellTrades}`} color={COLORS.bid} />
                <ReportCard label="Avg Hold Bars" value={`${s.avgHoldBars}h`} color={COLORS.text} />
              </div>
              <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 8 }}>
                Source: {result.source} • Candles: {result.totalCandles}
              </div>
            </div>
          )}

          {/* === TRADES TAB === */}
          {!loading && s && tab === "trades" && (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1, background: COLORS.panelHeader }}>
                  <tr style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Entry Time</th>
                    <th className="text-left px-3 py-2">Exit Time</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-right px-3 py-2">Entry</th>
                    <th className="text-right px-3 py-2">Exit</th>
                    <th className="text-right px-3 py-2">Volume</th>
                    <th className="text-right px-3 py-2">P/L</th>
                    <th className="text-right px-3 py-2">P/L %</th>
                    <th className="text-left px-3 py-2">Hold</th>
                    <th className="text-left px-3 py-2">Reason</th>
                    <th className="text-right px-3 py-2">Conf.</th>
                    <th className="text-right px-3 py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,122,204,0.08)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td className="px-3 py-1.5 tabular-nums ltr-nums" style={{ color: COLORS.textDim }}>{i + 1}</td>
                      <td className="px-3 py-1.5" style={{ color: COLORS.textMuted }}>{new Date(t.entryTime * 1000).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-3 py-1.5" style={{ color: COLORS.textMuted }}>{new Date(t.exitTime * 1000).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-3 py-1.5 font-bold" style={{ color: t.side === "BUY" ? COLORS.ask : COLORS.bid }}>
                        {t.side === "BUY" ? "▲ Buy" : "▼ Sell"}
                      </td>
                      <td className="text-right px-3 py-1.5 tabular-nums ltr-nums">{t.entryPrice?.toFixed(2)}</td>
                      <td className="text-right px-3 py-1.5 tabular-nums ltr-nums">{t.exitPrice?.toFixed(2)}</td>
                      <td className="text-right px-3 py-1.5 tabular-nums ltr-nums" style={{ color: COLORS.textDim }}>{t.lotSize?.toFixed(3)}</td>
                      <td className="text-right px-3 py-1.5 tabular-nums ltr-nums font-bold" style={{ color: t.pnl >= 0 ? COLORS.ask : COLORS.bid }}>
                        {t.pnl >= 0 ? "+" : ""}{t.pnl?.toFixed(2)}
                      </td>
                      <td className="text-right px-3 py-1.5 tabular-nums ltr-nums" style={{ color: t.pnlPct >= 0 ? COLORS.ask : COLORS.bid }}>
                        {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct?.toFixed(2)}%
                      </td>
                      <td className="px-3 py-1.5" style={{ color: COLORS.textDim }}>{t.holdBars}h</td>
                      <td className="px-3 py-1.5" style={{ color: COLORS.textDim }}>{t.exitReason}</td>
                      <td className="text-right px-3 py-1.5 tabular-nums ltr-nums" style={{ color: COLORS.textDim }}>{t.confidence}%</td>
                      <td className="text-right px-3 py-1.5 tabular-nums ltr-nums" style={{ color: COLORS.textDim }}>{t.signalScore?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* === JOURNAL TAB === */}
          {!loading && s && tab === "journal" && (
            <div className="flex-1 overflow-y-auto p-3" style={{ fontFamily: "Consolas, monospace", fontSize: 11, lineHeight: 1.6 }}>
              <div style={{ color: COLORS.ask }}>[INFO] Backtest started — {result.startDate?.slice(0, 10)} → {result.endDate?.slice(0, 10)}</div>
              <div style={{ color: COLORS.textMuted }}>[INFO] Strategy: SMC/ICT Strict (5 conditions)</div>
              <div style={{ color: COLORS.textMuted }}>[INFO] Initial balance: ${s.initialBalance} | Risk: 1% | R:R ≥ 1:1.3</div>
              <div style={{ color: COLORS.textMuted }}>[INFO] Candles analyzed: {result.totalCandles}</div>
              <div style={{ color: COLORS.textMuted }}>[INFO] Source: {result.source}</div>
              <div style={{ color: COLORS.textDim, marginTop: 4 }}>─────────────────────────────────────────</div>
              {trades.slice(0, 50).map((t: any, i: number) => (
                <div key={i} style={{ color: t.pnl >= 0 ? COLORS.ask : COLORS.bid }}>
                  [{new Date(t.exitTime * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}] Trade #{i + 1}: {t.side} @ {t.entryPrice?.toFixed(2)} → {t.exitPrice?.toFixed(2)} | P/L: {t.pnl >= 0 ? "+" : ""}{t.pnl?.toFixed(2)} | {t.exitReason}
                </div>
              ))}
              {trades.length > 50 && (
                <div style={{ color: COLORS.textDim, marginTop: 4 }}>... and {trades.length - 50} more trades</div>
              )}
              <div style={{ color: COLORS.textDim, marginTop: 4 }}>─────────────────────────────────────────</div>
              <div style={{ color: profit ? COLORS.ask : COLORS.bid, fontWeight: 700 }}>
                [RESULT] Final balance: ${s.finalBalance} | Net P/L: {profit ? "+" : ""}${s.totalReturn} ({profit ? "+" : ""}{s.totalReturnPct}%) | Win rate: {s.winRate}% | PF: {s.profitFactor} | Max DD: ${s.maxDrawdown}
              </div>
            </div>
          )}
        </div>

        {/* === Status bar === */}
        {s && (
          <div className="flex items-center justify-between px-4 h-6 flex-shrink-0 text-[10px]"
            style={{ background: COLORS.panelHeader, borderTop: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
            <div className="flex items-center gap-3">
              <span>Net Profit: <span style={{ color: profit ? COLORS.ask : COLORS.bid, fontWeight: 600 }}>{profit ? "+" : ""}${s.totalReturn}</span></span>
              <span>•</span>
              <span>PF: <span style={{ color: COLORS.accent }}>{s.profitFactor}</span></span>
              <span>•</span>
              <span>DD: <span style={{ color: COLORS.bid }}>{s.maxDrawdownPct}%</span></span>
              <span>•</span>
              <span>{s.totalTrades} trades ({s.wins}W/{s.losses}L)</span>
            </div>
            <div>{tab.toUpperCase()} | Press ESC to close</div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ReportCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "Segoe UI, sans-serif" }} className="tabular-nums ltr-nums">
        {value}
      </div>
    </div>
  );
}
