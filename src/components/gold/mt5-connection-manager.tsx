"use client";

// =====================================================================
//  MT5 Connection Manager — Professional Bridge Status Panel
// =====================================================================
//  Shows the MT5 Bridge connection status with full technical details:
//    • Connection status (Connected / Disconnected)
//    • Account info (login, server, balance, equity, leverage, P/L)
//    • Open positions table with live P/L
//    • Recent deals history
//    • Connection metrics (latency, version, endpoint)
//    • Action buttons: Reconnect, Refresh, Close All
// =====================================================================

import { useEffect, useState, useCallback } from "react";
import {
  X,
  Wifi,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Server,
  Database,
  Zap,
  Settings,
} from "lucide-react";

interface MT5Account {
  login: number;
  name: string;
  server: string;
  currency: string;
  leverage: number;
  balance: number;
  equity: number;
  margin: number;
  marginFree: number;
  marginLevel: number;
  profit: number;
  accountType: string;
  companyName: string;
  tradeAllowed: boolean;
  connectedAt: number;
}

interface MT5Position {
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  sl: number;
  tp: number;
  profit: number;
  time: number;
  comment: string;
}

interface MT5Deal {
  ticket: number;
  positionTicket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  price: number;
  profit: number;
  time: number;
  comment: string;
}

interface MT5BridgeStatus {
  connected: boolean;
  bridgeVersion: string;
  connectionType: string;
  account: MT5Account | null;
  positions: MT5Position[];
  history: MT5Deal[];
  latencyMs: number;
  lastUpdate: number;
  server: string;
  endpoint: string;
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

export default function MT5ConnectionManager({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<MT5BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<"account" | "positions" | "history">("account");

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/mt5/status", { cache: "no-store" });
      const d = await r.json();
      setStatus(d);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const reconnect = useCallback(async () => {
    setReconnecting(true);
    try {
      await fetch("/api/mt5/reconnect", { method: "POST" });
      await fetchStatus();
    } finally {
      setTimeout(() => setReconnecting(false), 500);
    }
  }, [fetchStatus]);

  const closePosition = useCallback(
    async (ticket: number) => {
      try {
        await fetch("/api/mt5/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
        });
        await fetchStatus();
      } catch {}
    },
    [fetchStatus]
  );

  const closeAll = useCallback(async () => {
    try {
      await fetch("/api/mt5/close-all", { method: "POST" });
      await fetchStatus();
    } catch {}
  }, [fetchStatus]);

  useEffect(() => {
    if (open) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [open, fetchStatus]);

  if (!open) return null;

  const account = status?.account;
  const positions = status?.positions ?? [];
  const history = status?.history ?? [];
  const uptime = account?.connectedAt
    ? Math.floor((Date.now() - account.connectedAt) / 1000)
    : 0;
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;

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
          width: "min(900px, 95vw)",
          maxHeight: "85vh",
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
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                background: status?.connected ? COLORS.ask : COLORS.bid,
              }}
            />
            <div>
              <div
                className="text-[13px] font-bold flex items-center gap-2"
                style={{ color: COLORS.textBright }}
              >
                <Server className="w-3.5 h-3.5" style={{ color: COLORS.accent }} />
                MT5 Bridge — Connection Manager
              </div>
              <div className="text-[10px]" style={{ color: COLORS.textMuted }}>
                {status?.bridgeVersion ?? "M.ROBOT MT5 Bridge"} • {status?.endpoint ?? "—"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reconnect}
              disabled={reconnecting}
              className="px-2 py-1 rounded text-[10px] flex items-center gap-1"
              style={{
                background: reconnecting ? COLORS.panel : `${COLORS.accent}20`,
                border: `1px solid ${COLORS.accent}40`,
                color: COLORS.accent,
                cursor: reconnecting ? "wait" : "pointer",
              }}
            >
              {reconnecting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Reconnect
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
            color: COLORS.text,
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3" style={{ color: COLORS.ask }} />
              <span style={{ color: COLORS.textMuted }}>Status:</span>{" "}
              <span style={{ color: COLORS.ask, fontWeight: 700 }}>
                {status?.connected ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </span>
            <span>
              <span style={{ color: COLORS.textMuted }}>Type:</span>{" "}
              <span style={{ color: COLORS.textBright }}>
                {status?.connectionType ?? "Demo Bridge"}
              </span>
            </span>
            <span>
              <span style={{ color: COLORS.textMuted }}>Latency:</span>{" "}
              <span style={{ color: COLORS.accent }}>
                {status?.latencyMs ?? 0}ms
              </span>
            </span>
            <span>
              <span style={{ color: COLORS.textMuted }}>Uptime:</span>{" "}
              <span style={{ color: COLORS.textBright }}>{uptimeStr}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 animate-pulse" style={{ color: COLORS.ask }} />
            <span style={{ color: COLORS.textMuted }}>Live data flowing</span>
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
            { id: "account" as const, label: "Account", icon: Settings },
            { id: "positions" as const, label: `Positions (${positions.length})`, icon: TrendingUp },
            { id: "history" as const, label: `History (${history.length})`, icon: Database },
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
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Connecting to MT5 Bridge...
            </div>
          ) : activeTab === "account" ? (
            account ? (
              <div className="grid grid-cols-2 gap-3">
                <DetailCard
                  title="Login"
                  value={String(account.login)}
                  icon={<Server className="w-3 h-3" />}
                />
                <DetailCard
                  title="Account Type"
                  value={account.accountType}
                  valueColor={
                    account.accountType === "DEMO"
                      ? COLORS.warning
                      : COLORS.ask
                  }
                />
                <DetailCard
                  title="Server"
                  value={account.server}
                  icon={<Database className="w-3 h-3" />}
                />
                <DetailCard
                  title="Company"
                  value={account.companyName}
                />
                <DetailCard
                  title="Currency"
                  value={account.currency}
                />
                <DetailCard
                  title="Leverage"
                  value={`1:${account.leverage}`}
                  valueColor={COLORS.accent}
                />
                <DetailCard
                  title="Balance"
                  value={`$${account.balance.toFixed(2)}`}
                  valueColor={COLORS.textBright}
                />
                <DetailCard
                  title="Equity"
                  value={`$${account.equity.toFixed(2)}`}
                  valueColor={COLORS.textBright}
                />
                <DetailCard
                  title="Margin Used"
                  value={`$${account.margin.toFixed(2)}`}
                />
                <DetailCard
                  title="Free Margin"
                  value={`$${account.marginFree.toFixed(2)}`}
                />
                <DetailCard
                  title="Margin Level"
                  value={`${account.marginLevel.toFixed(2)}%`}
                  valueColor={
                    account.marginLevel > 500
                      ? COLORS.ask
                      : account.marginLevel > 200
                        ? COLORS.warning
                        : COLORS.bid
                  }
                />
                <DetailCard
                  title="Floating P/L"
                  value={`${account.profit >= 0 ? "+" : ""}$${account.profit.toFixed(2)}`}
                  valueColor={
                    account.profit >= 0 ? COLORS.ask : COLORS.bid
                  }
                />
                <DetailCard
                  title="Trade Allowed"
                  value={account.tradeAllowed ? "YES" : "NO"}
                  valueColor={
                    account.tradeAllowed ? COLORS.ask : COLORS.bid
                  }
                />
                <DetailCard
                  title="Connected At"
                  value={new Date(account.connectedAt).toLocaleString("en-GB")}
                />
              </div>
            ) : (
              <NoData />
            )
          ) : activeTab === "positions" ? (
            positions.length === 0 ? (
              <NoData message="No open positions. Use New Order (F9) to place a trade." />
            ) : (
              <div className="space-y-2">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={closeAll}
                    className="px-2 py-1 rounded text-[10px] flex items-center gap-1"
                    style={{
                      background: `${COLORS.bid}20`,
                      border: `1px solid ${COLORS.bid}40`,
                      color: COLORS.bid,
                    }}
                  >
                    <X className="w-3 h-3" />
                    Close All Positions
                  </button>
                </div>
                <table className="w-full text-[10px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: COLORS.panelHeader, color: COLORS.textMuted }}>
                      <Th>Ticket</Th>
                      <Th>Symbol</Th>
                      <Th>Type</Th>
                      <Th align="right">Volume</Th>
                      <Th align="right">Open</Th>
                      <Th align="right">Current</Th>
                      <Th align="right">S/L</Th>
                      <Th align="right">T/P</Th>
                      <Th align="right">P/L</Th>
                      <Th>Time</Th>
                      <Th align="center">×</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => (
                      <tr
                        key={p.ticket}
                        style={{
                          borderTop: `1px solid ${COLORS.border}`,
                          color: COLORS.text,
                        }}
                      >
                        <Td style={{ color: COLORS.textMuted }}>#{p.ticket}</Td>
                        <Td style={{ color: COLORS.textBright, fontWeight: 600 }}>
                          {p.symbol}
                        </Td>
                        <Td>
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{
                              background:
                                p.type === "BUY"
                                  ? `${COLORS.ask}20`
                                  : `${COLORS.bid}20`,
                              color: p.type === "BUY" ? COLORS.ask : COLORS.bid,
                            }}
                          >
                            {p.type}
                          </span>
                        </Td>
                        <Td align="right">{p.volume.toFixed(2)}</Td>
                        <Td align="right">{p.priceOpen.toFixed(2)}</Td>
                        <Td align="right" style={{ color: COLORS.textBright }}>
                          {p.priceCurrent.toFixed(2)}
                        </Td>
                        <Td align="right" style={{ color: COLORS.bid }}>
                          {p.sl > 0 ? p.sl.toFixed(2) : "—"}
                        </Td>
                        <Td align="right" style={{ color: COLORS.ask }}>
                          {p.tp > 0 ? p.tp.toFixed(2) : "—"}
                        </Td>
                        <Td
                          align="right"
                          style={{
                            color: p.profit >= 0 ? COLORS.ask : COLORS.bid,
                            fontWeight: 700,
                          }}
                        >
                          {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                        </Td>
                        <Td style={{ color: COLORS.textMuted, fontSize: 9 }}>
                          {new Date(p.time * 1000).toLocaleTimeString("en-GB")}
                        </Td>
                        <Td align="center">
                          <button
                            onClick={() => closePosition(p.ticket)}
                            className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{
                              background: `${COLORS.bid}20`,
                              color: COLORS.bid,
                            }}
                          >
                            Close
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : history.length === 0 ? (
            <NoData message="No deals in history. Closed trades will appear here." />
          ) : (
            <table className="w-full text-[10px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: COLORS.panelHeader, color: COLORS.textMuted }}>
                  <Th>Deal #</Th>
                  <Th>Position #</Th>
                  <Th>Symbol</Th>
                  <Th>Type</Th>
                  <Th align="right">Volume</Th>
                  <Th align="right">Price</Th>
                  <Th align="right">P/L</Th>
                  <Th>Time</Th>
                  <Th>Comment</Th>
                </tr>
              </thead>
              <tbody>
                {history.map((d) => (
                  <tr
                    key={d.ticket}
                    style={{
                      borderTop: `1px solid ${COLORS.border}`,
                      color: COLORS.text,
                    }}
                  >
                    <Td style={{ color: COLORS.textMuted }}>#{d.ticket}</Td>
                    <Td style={{ color: COLORS.textMuted }}>#{d.positionTicket}</Td>
                    <Td style={{ color: COLORS.textBright, fontWeight: 600 }}>
                      {d.symbol}
                    </Td>
                    <Td>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{
                          background:
                            d.type === "BUY"
                              ? `${COLORS.ask}20`
                              : `${COLORS.bid}20`,
                          color: d.type === "BUY" ? COLORS.ask : COLORS.bid,
                        }}
                      >
                        {d.type}
                      </span>
                    </Td>
                    <Td align="right">{d.volume.toFixed(2)}</Td>
                    <Td align="right">{d.price.toFixed(2)}</Td>
                    <Td
                      align="right"
                      style={{
                        color: d.profit >= 0 ? COLORS.ask : COLORS.bid,
                        fontWeight: 700,
                      }}
                    >
                      {d.profit >= 0 ? "+" : ""}${d.profit.toFixed(2)}
                    </Td>
                    <Td style={{ color: COLORS.textMuted, fontSize: 9 }}>
                      {new Date(d.time * 1000).toLocaleString("en-GB")}
                    </Td>
                    <Td style={{ color: COLORS.textMuted }}>{d.comment}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <span className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" style={{ color: COLORS.accent }} />
            Last update:{" "}
            {status?.lastUpdate
              ? new Date(status.lastUpdate).toLocaleTimeString("en-GB")
              : "—"}
          </span>
          <span>
            Powered by M.ROBOT MT5 Cloud Bridge • Real-time market data from Binance PAXG + gold-api.com + Yahoo GC=F
          </span>
        </div>
      </div>
    </div>
  );
}

// === Sub-components ===
function DetailCard({
  title,
  value,
  icon,
  valueColor,
}: {
  title: string;
  value: string;
  icon?: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div
      className="p-3 rounded"
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        className="text-[9px] uppercase mb-1 flex items-center gap-1"
        style={{ color: COLORS.textMuted }}
      >
        {icon}
        {title}
      </div>
      <div
        className="text-[13px] font-bold"
        style={{ color: valueColor ?? COLORS.text }}
      >
        {value}
      </div>
    </div>
  );
}

function NoData({ message = "No data available" }: { message?: string }) {
  return (
    <div
      className="flex items-center justify-center py-12 text-[11px]"
      style={{ color: COLORS.textMuted }}
    >
      {message}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className="px-2 py-1 font-normal"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  style,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  style?: React.CSSProperties;
}) {
  return (
    <td className="px-2 py-1" style={{ textAlign: align, ...style }}>
      {children}
    </td>
  );
}
