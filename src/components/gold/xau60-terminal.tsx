"use client";
import { useEffect, useState, useRef } from "react";

// XAU-60 MT5 Trading Bot Pro — Web Terminal
// Based on lordgaruda/XAU-60 with Streamlit dashboard
// Uses Binance PAXG for live gold prices + mock MT5 for trading

const SYMBOL = "XAUUSD";
const BRAND = "XAU-60 MT5 Trading Bot Pro";

export default function XAU60Terminal() {
  const [price, setPrice] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const [aiSignal, setAiSignal] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [balance, setBalance] = useState(10000);
  const [equity, setEquity] = useState(10000);
  const [log, setLog] = useState<string[]>([]);
  const [botRunning, setBotRunning] = useState(false);
  const [candles, setCandles] = useState<any[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, totalPL: 0, totalTrades: 0 });
  const lastPriceRef = useRef(0);
  const wsRef = useRef<any>(null);

  // Generate candlestick data from live prices
  useEffect(() => {
    // Initialize with some candles
    const initialCandles = [];
    let basePrice = 2650;
    for (let i = 0; i < 50; i++) {
      const open = basePrice;
      const change = (Math.random() - 0.5) * 5;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      initialCandles.push({ open, close, high, low, time: Date.now() - (50 - i) * 60000 });
      basePrice = close;
    }
    setCandles(initialCandles);
  }, []);

  // WebSocket for live price
  useEffect(() => {
    function connect() {
      try {
        wsRef.current = new WebSocket("wss://stream.binance.com:9443/ws/paxgusdt@ticker");
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const newPrice = parseFloat(data?.c || data?.p);
            if (Number.isFinite(newPrice) && newPrice > 100) {
              const old = lastPriceRef.current;
              if (old > 0 && newPrice !== old) {
                setPrice(newPrice);
                setPriceFlash(newPrice > old ? "up" : "down");
                setTimeout(() => setPriceFlash(null), 300);
                // Update last candle
                setCandles(prev => {
                  const updated = [...prev];
                  if (updated.length > 0) {
                    const last = updated[updated.length - 1];
                    last.close = newPrice;
                    last.high = Math.max(last.high, newPrice);
                    last.low = Math.min(last.low, newPrice);
                  }
                  return updated;
                });
              }
              lastPriceRef.current = newPrice;
            }
          } catch {}
        };
        wsRef.current.onclose = () => { setTimeout(connect, 3000); };
        wsRef.current.onerror = () => { try { wsRef.current?.close(); } catch {} };
      } catch { setTimeout(connect, 5000); }
    }
    connect();
    return () => { if (wsRef.current) { try { wsRef.current.close(); } catch {} } };
  }, []);

  // Update equity from positions
  useEffect(() => {
    if (!price) return;
    let pl = 0;
    for (const p of positions) {
      if (p.side === "BUY") pl += (price - p.entry) * p.volume * 100;
      else pl += (p.entry - price) * p.volume * 100;
    }
    setEquity(balance + pl);
  }, [price, positions, balance]);

  // Simple AI signal generator
  useEffect(() => {
    if (candles.length < 5) return;
    const sma = candles.slice(-20).reduce((s, c) => s + c.close, 0) / Math.min(20, candles.length);
    const current = candles[candles.length - 1].close;
    if (current > sma && candles.length > 0) {
      const conf = Math.min(95, Math.floor(Math.abs((current - sma) / sma) * 10000));
      if (conf >= 15) {
        setAiSignal({ signal: "BUY", direction: "bullish", confidence: conf, score: conf, entry: current.toFixed(2), stopLoss: (current - 5).toFixed(2), takeProfit: (current + 12).toFixed(2) });
      }
    } else if (current < sma) {
      const conf = Math.min(95, Math.floor(Math.abs((sma - current) / sma) * 10000));
      if (conf >= 15) {
        setAiSignal({ signal: "SELL", direction: "bearish", confidence: conf, score: -conf, entry: current.toFixed(2), stopLoss: (current + 5).toFixed(2), takeProfit: (current - 12).toFixed(2) });
      }
    }
  }, [candles]);

  // Auto-trade when bot is running
  useEffect(() => {
    if (!botRunning || !aiSignal || !price) return;
    if (aiSignal.signal === "WAIT") return;
    if (positions.length >= 3) return;
    // Don't duplicate
    const key = `${aiSignal.signal}-${aiSignal.confidence}`;
    if (positions.some(p => p.comment === key)) return;
    const ticket = Date.now();
    const newPos = { ticket, side: aiSignal.signal, volume: 0.01, entry: price, time: Date.now(), sl: parseFloat(aiSignal.stopLoss), tp: parseFloat(aiSignal.takeProfit), comment: key };
    setPositions(prev => [...prev, newPos]);
    setLog(prev => [`${new Date().toLocaleTimeString()} - OPENED ${aiSignal.signal} 0.01 XAUUSD @ ${price.toFixed(2)} (conf: ${aiSignal.confidence}%)`, ...prev.slice(0, 30)]);
  }, [botRunning, aiSignal, price, positions]);

  // Check SL/TP
  useEffect(() => {
    if (!price) return;
    for (const p of positions) {
      let shouldClose = false;
      let reason = "";
      if (p.side === "BUY") {
        if (p.sl > 0 && price <= p.sl) { shouldClose = true; reason = "SL hit"; }
        if (p.tp > 0 && price >= p.tp) { shouldClose = true; reason = "TP hit"; }
      } else {
        if (p.sl > 0 && price >= p.sl) { shouldClose = true; reason = "SL hit"; }
        if (p.tp > 0 && price <= p.tp) { shouldClose = true; reason = "TP hit"; }
      }
      if (shouldClose) {
        const pnl = p.side === "BUY" ? (price - p.entry) * p.volume * 100 : (p.entry - price) * p.volume * 100;
        setBalance(b => b + pnl);
        setPositions(prev => prev.filter(x => x.ticket !== p.ticket));
        setStats(s => ({ wins: s.wins + (pnl > 0 ? 1 : 0), losses: s.losses + (pnl < 0 ? 1 : 0), totalPL: s.totalPL + pnl, totalTrades: s.totalTrades + 1 }));
        setLog(prev => [`${new Date().toLocaleTimeString()} - CLOSED #${p.ticket} ${reason} P&L: $${pnl.toFixed(2)}`, ...prev.slice(0, 30)]);
      }
    }
  }, [price, positions]);

  const executeTrade = (side: "BUY" | "SELL") => {
    if (!price) return;
    const ticket = Date.now();
    setPositions(prev => [...prev, { ticket, side, volume: 0.01, entry: price, time: Date.now(), sl: side === "BUY" ? price - 5 : price + 5, tp: side === "BUY" ? price + 12 : price - 12, comment: "Manual" }]);
    setLog(prev => [`${new Date().toLocaleTimeString()} - MANUAL ${side} 0.01 XAUUSD @ ${price.toFixed(2)}`, ...prev.slice(0, 30)]);
  };

  const closeAll = () => {
    if (!price) return;
    let totalPnL = 0;
    for (const p of positions) {
      totalPnL += p.side === "BUY" ? (price - p.entry) * p.volume * 100 : (p.entry - price) * p.volume * 100;
    }
    setBalance(b => b + totalPnL);
    setStats(s => ({ ...s, totalPL: s.totalPL + totalPnL, totalTrades: s.totalTrades + positions.length }));
    setPositions([]);
    setLog(prev => [`${new Date().toLocaleTimeString()} - CLOSE ALL — P&L: $${totalPnL.toFixed(2)}`, ...prev.slice(0, 30)]);
  };

  const floatingPL = equity - balance;
  const winRate = stats.totalTrades > 0 ? ((stats.wins / stats.totalTrades) * 100).toFixed(1) : "0.0";

  // Candlestick chart
  const maxCandles = 40;
  const visibleCandles = candles.slice(-maxCandles);
  const allPrices = visibleCandles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...allPrices) - 2;
  const maxP = Math.max(...allPrices) + 2;
  const range = maxP - minP || 1;
  const candleWidth = 100 / maxCandles;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#0a0e14", color: "#d4d4d4", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top Bar */}
      <div style={{ background: "linear-gradient(to bottom, #0f1923, #1a2b3c)", padding: "8px 16px", borderBottom: "2px solid #1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>{BRAND}</span>
          <span style={{ color: "#5a8ab5", fontSize: 11 }}>· lordgaruda/XAU-60</span>
          {price != null && (
            <span style={{ color: priceFlash === "up" ? "#22c55e" : priceFlash === "down" ? "#ef4444" : "#888", fontFamily: "Consolas, monospace", fontWeight: 700, fontSize: 14 }}>
              ${price.toFixed(2)}
            </span>
          )}
          {aiSignal && (
            <span style={{ color: aiSignal.score >= 15 ? "#22c55e" : aiSignal.score <= -15 ? "#ef4444" : "#888", fontWeight: 700, fontSize: 12 }}>
              AI: {aiSignal.signal} ({aiSignal.confidence}%)
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => executeTrade("BUY")} style={{ padding: "6px 16px", background: "linear-gradient(to bottom, #16a34a, #15803d)", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 700, fontSize: 11 }}>BUY</button>
          <button onClick={() => executeTrade("SELL")} style={{ padding: "6px 16px", background: "linear-gradient(to bottom, #dc2626, #b91c1c)", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 700, fontSize: 11 }}>SELL</button>
          <button onClick={() => setBotRunning(!botRunning)} style={{ padding: "6px 14px", background: botRunning ? "linear-gradient(to bottom, #fbbf24, #f59e0b)" : "linear-gradient(to bottom, #3c3c3c, #252525)", color: botRunning ? "#000" : "#9ca3af", border: "1px solid #4a4a4a", borderRadius: 5, cursor: "pointer", fontWeight: 700, fontSize: 11 }}>{botRunning ? "AUTO ON" : "AUTO OFF"}</button>
          {positions.length > 0 && <button onClick={closeAll} style={{ padding: "6px 12px", background: "rgba(255,77,77,0.15)", color: "#ff8080", border: "1px solid rgba(255,77,77,0.4)", borderRadius: 5, cursor: "pointer", fontWeight: 700, fontSize: 11 }}>CLOSE ALL ({positions.length})</button>}
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 320px", gap: 8, padding: 8, minHeight: 0 }}>
        {/* Chart Area */}
        <div style={{ position: "relative", background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, overflow: "hidden" }}>
          {/* Candlestick Chart */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", position: "absolute" }}>
            {visibleCandles.map((c, i) => {
              const x = i * candleWidth + candleWidth / 2;
              const isGreen = c.close >= c.open;
              const color = isGreen ? "#22c55e" : "#ef4444";
              const wickTop = ((maxP - c.high) / range) * 100;
              const wickBottom = ((maxP - c.low) / range) * 100;
              const bodyTop = ((maxP - Math.max(c.open, c.close)) / range) * 100;
              const bodyHeight = Math.max(0.5, ((Math.abs(c.close - c.open)) / range) * 100);
              const cw = candleWidth * 0.7;
              return (
                <g key={i}>
                  <line x1={x} y1={wickTop} x2={x} y2={wickBottom} stroke={color} strokeWidth="0.3" />
                  <rect x={x - cw / 2} y={bodyTop} width={cw} height={bodyHeight} fill={color} opacity="0.8" />
                </g>
              );
            })}
            {/* Price line */}
            {price != null && (
              <line x1="0" y1={((maxP - price) / range) * 100} x2="100" y2={((maxP - price) / range) * 100} stroke="#fbbf24" strokeWidth="0.2" strokeDasharray="0.5,0.5" />
            )}
          </svg>
          {/* Price labels */}
          <div style={{ position: "absolute", right: 4, top: 4, color: "#6b7280", fontSize: 10, fontFamily: "Consolas, monospace", textAlign: "right" }}>
            <div style={{ color: "#22c55e" }}>${maxP.toFixed(2)}</div>
            <div style={{ color: "#fbbf24" }}>${price?.toFixed(2)}</div>
            <div style={{ color: "#ef4444" }}>${minP.toFixed(2)}</div>
          </div>
          {/* AI Signal arrows */}
          {aiSignal && aiSignal.signal !== "WAIT" && (
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
              <div style={{ width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderBottom: aiSignal.signal === "BUY" ? "16px solid #22c55e" : "none", borderTop: aiSignal.signal === "SELL" ? "16px solid #ef4444" : "none" }} />
              <div style={{ background: aiSignal.signal === "BUY" ? "#22c55e" : "#ef4444", color: "#000", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 3, fontFamily: "Consolas, monospace" }}>
                {aiSignal.signal} {aiSignal.confidence}%
              </div>
              <div style={{ color: "#888", fontSize: 9, marginTop: 2 }}>SL: {aiSignal.stopLoss} | TP: {aiSignal.takeProfit}</div>
            </div>
          )}
        </div>

        {/* Right Panel — Account + Positions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
          {/* Account Summary */}
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: 10 }}>
            <div style={{ color: "#60a5fa", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8, borderBottom: "1px solid #1f2937", paddingBottom: 4 }}>Account Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div><div style={{ color: "#6b7280", fontSize: 9 }}>Balance</div><div style={{ color: "#22c55e", fontWeight: 700, fontFamily: "Consolas, monospace" }}>${balance.toFixed(2)}</div></div>
              <div><div style={{ color: "#6b7280", fontSize: 9 }}>Equity</div><div style={{ color: floatingPL >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700, fontFamily: "Consolas, monospace" }}>${equity.toFixed(2)}</div></div>
              <div><div style={{ color: "#6b7280", fontSize: 9 }}>Floating P&L</div><div style={{ color: floatingPL >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700, fontFamily: "Consolas, monospace" }}>{floatingPL >= 0 ? "+" : ""}${floatingPL.toFixed(2)}</div></div>
              <div><div style={{ color: "#6b7280", fontSize: 9 }}>Positions</div><div style={{ color: positions.length > 0 ? "#fbbf24" : "#6b7280", fontWeight: 700 }}>{positions.length}</div></div>
              <div><div style={{ color: "#6b7280", fontSize: 9 }}>Win Rate</div><div style={{ color: parseFloat(winRate) >= 50 ? "#22c55e" : "#fbbf24", fontWeight: 700 }}>{winRate}%</div></div>
              <div><div style={{ color: "#6b7280", fontSize: 9 }}>Total Trades</div><div style={{ fontWeight: 700 }}>{stats.totalTrades}</div></div>
            </div>
          </div>

          {/* Positions Table */}
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, flex: 1, overflow: "auto", minHeight: 0 }}>
            <div style={{ color: "#60a5fa", fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "8px 10px 4px", borderBottom: "1px solid #1f2937" }}>Open Positions</div>
            {positions.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead><tr><th style={{ padding: "4px 6px", textAlign: "left", color: "#6b7280", fontSize: 9 }}>Type</th><th style={{ padding: "4px 6px", textAlign: "right", color: "#6b7280", fontSize: 9 }}>Entry</th><th style={{ padding: "4px 6px", textAlign: "right", color: "#6b7280", fontSize: 9 }}>P&L</th></tr></thead>
                <tbody>
                  {positions.map(p => {
                    const pnl = price != null ? (p.side === "BUY" ? (price - p.entry) * p.volume * 100 : (p.entry - price) * p.volume * 100) : 0;
                    return (
                      <tr key={p.ticket}>
                        <td style={{ padding: "4px 6px" }}><span style={{ background: p.side === "BUY" ? "#22c55e20" : "#ef444420", color: p.side === "BUY" ? "#22c55e" : "#ef4444", padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: 700 }}>{p.side}</span></td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "Consolas, monospace" }}>${p.entry.toFixed(2)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "Consolas, monospace", color: pnl >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: "#6b7280", fontSize: 11 }}>No open positions</div>
            )}
          </div>

          {/* Log */}
          <div style={{ background: "#0a0e14", border: "1px solid #1f2937", borderRadius: 8, padding: 8, height: 120, overflowY: "auto", fontFamily: "Consolas, monospace", fontSize: 10 }}>
            {log.length > 0 ? log.map((l, i) => <div key={i} style={{ color: "#9ca3af", padding: "1px 0" }}>{l}</div>) : <div style={{ color: "#6b7280" }}>Ready</div>}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "4px 12px", background: "#0f1923", borderTop: "1px solid #1e3a5f", gap: 12, fontSize: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1s infinite" }} />
        <span style={{ color: price != null ? "#22c55e" : "#6b7280", fontWeight: 600 }}>WebSocket LIVE</span>
        <span style={{ color: "#6b7280" }}>|</span>
        <span style={{ color: "#6b7280" }}>XAUUSD · Binance PAXG</span>
        <span style={{ color: "#6b7280" }}>|</span>
        <span style={{ color: "#6b7280" }}>Bot: {botRunning ? "RUNNING" : "STOPPED"}</span>
        <span style={{ color: "#6b7280" }}>|</span>
        <span style={{ color: "#6b7280" }}>W: {stats.wins} L: {stats.losses}</span>
        <span style={{ marginLeft: "auto", color: "#6b7280" }}>XAU-60 v2.0 · lordgaruda © 2026</span>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
