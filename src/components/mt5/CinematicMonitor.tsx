"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import MT5Chart from "@/components/mt5/MT5Chart";
import AIPredictionTerminal from "@/components/mt5/AIPredictionTerminal";
import {
  fetchAccount,
  fetchBridgeStatus,
  placeOrder,
  closePosition,
  type Candle,
  type Position,
  type Account,
  type BridgeStatus,
  type AIPrediction,
} from "@/lib/mt5-data";

interface CinematicMonitorProps {
  symbol: string;
  period: string;
  setSymbol: (s: string) => void;
  setPeriod: (p: string) => void;
  onExecuteOrder: (type: "BUY" | "SELL", volume?: number, sl?: number, tp?: number) => void;
  onToast: (msg: string, type?: "info" | "success" | "error") => void;
  positions: Position[];
  onClosePosition: (ticket: number) => void;
}

const SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD"];
const PERIODS = ["M5", "M15", "M30", "H1", "H4", "D1"];

export default function CinematicMonitor({
  symbol,
  period,
  setSymbol,
  setPeriod,
  onExecuteOrder,
  onToast,
  positions,
  onClosePosition,
}: CinematicMonitorProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [volume, setVolume] = useState(0.01);

  // ============= Refresh account info every 5s =============
  const refreshAccount = useCallback(async () => {
    try {
      const { account } = await fetchAccount();
      setAccount(account);
    } catch {}
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await fetchBridgeStatus();
      setBridgeStatus(s);
    } catch {}
  }, []);

  useEffect(() => {
    refreshAccount();
    refreshStatus();
    const id1 = setInterval(refreshAccount, 5000);
    const id2 = setInterval(refreshStatus, 15_000);
    return () => {
      clearInterval(id1);
      clearInterval(id2);
    };
  }, [refreshAccount, refreshStatus]);

  // ============= Position close handler =============
  const handleClose = useCallback(
    (ticket: number) => {
      onClosePosition(ticket);
    },
    [onClosePosition]
  );

  // ============= Order handlers =============
  const handleBuy = useCallback(() => {
    onExecuteOrder("BUY", volume);
  }, [onExecuteOrder, volume]);

  const handleSell = useCallback(() => {
    onExecuteOrder("SELL", volume);
  }, [onExecuteOrder, volume]);

  const handlePrediction = useCallback((p: AIPrediction) => {
    setPrediction(p);
  }, []);

  // ============= Color codes =============
  const sourceColor =
    bridgeStatus?.source === "MetaApi Cloud" ? "#10b981" : "#f59e0b";
  const pnlColor =
    (account?.profit ?? 0) >= 0 ? "#10b981" : "#ef4444";

  return (
    <div
      style={{
        background: "#020617",
        color: "#e2e8f0",
        fontFamily: "JetBrains Mono, monospace",
        minHeight: "100vh",
        padding: "12px 16px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* ====== Top bar: account + bridge status ====== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 12,
          alignItems: "center",
          padding: "10px 14px",
          background: "linear-gradient(135deg, #0c1226, #060b1f)",
          border: "1px solid #1e293b",
          borderRadius: 6,
        }}
      >
        <div style={{ fontSize: 11 }}>
          <div style={{ color: "#64748b", letterSpacing: 1 }}>ACCOUNT</div>
          <div style={{ color: "#f1f5f9", fontWeight: 700, marginTop: 2 }}>
            #{account?.login ?? "—"} · {account?.server ?? "—"}
          </div>
          <div style={{ color: "#94a3b8", marginTop: 1, fontSize: 10 }}>
            {account?.companyName ?? "—"}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 10, letterSpacing: 1 }}>EQUITY · BALANCE</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 2 }}>
            <div style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 800 }}>
              ${account?.equity?.toFixed(2) ?? "0.00"}
            </div>
            <div style={{ color: "#64748b", fontSize: 11 }}>
              / ${account?.balance?.toFixed(2) ?? "0.00"}
            </div>
          </div>
          <div style={{ color: pnlColor, fontSize: 11, marginTop: 1, fontWeight: 700 }}>
            P/L {(account?.profit ?? 0) >= 0 ? "+" : ""}
            {account?.profit?.toFixed(2) ?? "0.00"}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <div
              style={{
                width: 8,
                height: 8,
                background: sourceColor,
                borderRadius: "50%",
                boxShadow: `0 0 6px ${sourceColor}`,
              }}
            />
            <span style={{ color: sourceColor, fontWeight: 700, letterSpacing: 1 }}>
              {bridgeStatus?.source?.toUpperCase() ?? "INITIALIZING"}
            </span>
          </div>
          <div style={{ color: "#64748b", marginTop: 2 }}>
            {bridgeStatus?.endpoint ?? "—"}
          </div>
          <div style={{ color: "#64748b", marginTop: 1 }}>
            Latency {bridgeStatus?.latencyMs ?? 0}ms
          </div>
        </div>
      </div>

      {/* ====== Symbol / period selector ====== */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
          padding: "6px 10px",
          background: "#0a0f1f",
          border: "1px solid #1e293b",
          borderRadius: 4,
        }}
      >
        <span style={{ color: "#64748b", fontSize: 10, letterSpacing: 2 }}>SYMBOL</span>
        {SYMBOLS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            style={{
              padding: "4px 10px",
              background: symbol === s ? "#4f46e5" : "transparent",
              color: symbol === s ? "#fff" : "#94a3b8",
              border: `1px solid ${symbol === s ? "#4f46e5" : "#1e293b"}`,
              borderRadius: 3,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
        <span style={{ color: "#64748b", fontSize: 10, letterSpacing: 2, marginLeft: 10 }}>
          PERIOD
        </span>
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "4px 8px",
              background: period === p ? "#7c3aed" : "transparent",
              color: period === p ? "#fff" : "#94a3b8",
              border: `1px solid ${period === p ? "#7c3aed" : "#1e293b"}`,
              borderRadius: 3,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ====== Two-screen seamless cockpit ====== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          height: "calc(100vh - 230px)",
          minHeight: 500,
        }}
      >
        {/* Left: Chart */}
        <div
          style={{
            background: "#020617",
            border: "1px solid #1e293b",
            borderRadius: 6,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <MT5Chart
            symbol={symbol}
            period={period}
            predictionPrice={prediction?.nextCandle?.close}
            predictionDirection={prediction?.ensemble?.finalDecision}
            onCandlesLoaded={setCandles}
            height={500}
          />
        </div>
        {/* Right: AI Prediction Terminal */}
        <div
          style={{
            background: "#020617",
            border: "1px solid #1e293b",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <AIPredictionTerminal
            symbol={symbol}
            period={period}
            candles={candles}
            onPrediction={handlePrediction}
            height={500}
          />
        </div>
      </div>

      {/* ====== Bottom: order panel + positions ====== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 8,
          minHeight: 140,
        }}
      >
        {/* Order panel */}
        <div
          style={{
            background: "#0a0f1f",
            border: "1px solid #1e293b",
            borderRadius: 6,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 2 }}>ORDER PANEL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#64748b", fontSize: 10 }}>Volume:</span>
            <input
              type="number"
              step={0.01}
              min={0.01}
              value={volume}
              onChange={(e) => setVolume(Math.max(0.01, Number(e.target.value)))}
              style={{
                width: 80,
                background: "#020617",
                color: "#f1f5f9",
                border: "1px solid #1e293b",
                padding: "4px 8px",
                borderRadius: 3,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
              }}
            />
            <span style={{ color: "#64748b", fontSize: 10 }}>lots</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleBuy}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "linear-gradient(135deg, #10b981, #047857)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ▲ BUY {volume}
            </button>
            <button
              onClick={handleSell}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ▼ SELL {volume}
            </button>
          </div>
          {prediction && (
            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
              AI Signal:{" "}
              <span
                style={{
                  color:
                    prediction.ensemble.finalDecision === "BUY"
                      ? "#10b981"
                      : prediction.ensemble.finalDecision === "SELL"
                      ? "#ef4444"
                      : "#fbbf24",
                  fontWeight: 700,
                }}
              >
                {prediction.ensemble.finalDecision}{" "}
                ({((prediction.ensemble.finalConfidence || 0) * 100).toFixed(0)}%)
              </span>
            </div>
          )}
        </div>

        {/* Positions list */}
        <div
          style={{
            background: "#0a0f1f",
            border: "1px solid #1e293b",
            borderRadius: 6,
            padding: 10,
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#64748b", fontSize: 10, letterSpacing: 2 }}>
              OPEN POSITIONS ({positions.length})
            </span>
          </div>
          {positions.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 11, textAlign: "center", padding: "20px 0" }}>
              No open positions
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                fontSize: 10,
                borderCollapse: "collapse",
                color: "#cbd5e1",
              }}
            >
              <thead>
                <tr style={{ color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: "4px 6px", borderBottom: "1px solid #1e293b" }}>#</th>
                  <th style={{ padding: "4px 6px", borderBottom: "1px solid #1e293b" }}>SYMBOL</th>
                  <th style={{ padding: "4px 6px", borderBottom: "1px solid #1e293b" }}>TYPE</th>
                  <th style={{ padding: "4px 6px", borderBottom: "1px solid #1e293b" }}>VOL</th>
                  <th style={{ padding: "4px 6px", borderBottom: "1px solid #1e293b" }}>OPEN</th>
                  <th style={{ padding: "4px 6px", borderBottom: "1px solid #1e293b" }}>CURR</th>
                  <th style={{ padding: "4px 6px", borderBottom: "1px solid #1e293b" }}>P/L</th>
                  <th style={{ padding: "4px 6px", borderBottom: "1px solid #1e293b" }}></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.ticket}>
                    <td style={{ padding: "4px 6px", color: "#64748b" }}>{p.ticket}</td>
                    <td style={{ padding: "4px 6px", color: "#f1f5f9", fontWeight: 700 }}>{p.symbol}</td>
                    <td
                      style={{
                        padding: "4px 6px",
                        color: p.type === "BUY" ? "#10b981" : "#ef4444",
                        fontWeight: 700,
                      }}
                    >
                      {p.type}
                    </td>
                    <td style={{ padding: "4px 6px" }}>{p.volume.toFixed(2)}</td>
                    <td style={{ padding: "4px 6px" }}>{p.priceOpen.toFixed(2)}</td>
                    <td style={{ padding: "4px 6px" }}>{p.priceCurrent.toFixed(2)}</td>
                    <td
                      style={{
                        padding: "4px 6px",
                        color: p.profit >= 0 ? "#10b981" : "#ef4444",
                        fontWeight: 700,
                      }}
                    >
                      {p.profit >= 0 ? "+" : ""}
                      {p.profit.toFixed(2)}
                    </td>
                    <td style={{ padding: "4px 6px" }}>
                      <button
                        onClick={() => handleClose(p.ticket)}
                        style={{
                          background: "#7f1d1d",
                          color: "#fecaca",
                          border: "none",
                          padding: "2px 8px",
                          borderRadius: 3,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
