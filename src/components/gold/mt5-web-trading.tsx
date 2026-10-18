"use client";

// =====================================================================
//  M.ROBOT MT5 Web Trading — Pre-Authenticated Trading Interface
// =====================================================================
//  This component REPLACES the MetaQuotes trade.mql5.com iframe
//  entirely. Instead of showing the user a login screen (which
//  MetaQuotes requires for security), this component is ALREADY
//  logged in to a pre-configured demo account:
//
//    Login:    50123456
//    Server:   M.ROBOT-Demo
//    Balance:  $1000 USD
//    Leverage: 1:500
//
//  When the user clicks "MT5 Web", they go DIRECTLY to the trading
//  interface — no login screen, no iframe, no manual credentials.
//
//  Features:
//    - Real-time XAUUSD chart (lightweight-charts)
//    - Bid/Ask live spread display
//    - One-click BUY / SELL order panel
//    - SL / TP configuration
//    - Open positions table with live P/L
//    - Close single position / Close all
//    - Account summary (Balance, Equity, Margin, Free Margin, Margin Level)
// =====================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wifi,
  RefreshCw,
  X,
  Settings,
  Maximize2,
  Loader2,
  ChevronDown,
  Activity,
  Zap,
} from "lucide-react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";

// ====================== Theme ======================
const COLORS = {
  bg: "#0e0e0e",
  panelBg: "#1a1a1a",
  panelHeader: "#232323",
  border: "#2a2a2a",
  borderLight: "#3a3a3a",
  text: "#d4d4d4",
  textBright: "#ffffff",
  textMuted: "#888888",
  bid: "#ef4444",       // red (sell)
  ask: "#22c55e",       // green (buy)
  up: "#22c55e",
  down: "#ef4444",
  accent: "#3b82f6",    // MT5 Web blue
  warning: "#f59e0b",
};

// ====================== Types ======================
interface MarketData {
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  source: string;
  timestamp: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DemoAccount {
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
}

interface DemoPosition {
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  time: number;
  comment: string;
}

const SYMBOL = "XAUUSD";
const SYMBOL_DESC = "Gold vs US Dollar";

// ====================== Component ======================
export default function MT5WebTrading() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Order form state
  const [volume, setVolume] = useState(0.01);
  const [useSL, setUseSL] = useState(true);
  const [useTP, setUseTP] = useState(true);
  const [slPips, setSlPips] = useState(10);
  const [tpPips, setTpPips] = useState(30);
  const [oneClick, setOneClick] = useState(true);
  const [showConfirm, setShowConfirm] = useState<null | "BUY" | "SELL">(null);

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const livePriceLineRef = useRef<any>(null);
  const mainRef = useRef<any>(null);

  // ====================== Fetch Market ======================
  const fetchMarket = useCallback(async () => {
    try {
      const r = await fetch("/api/gold/market", { cache: "no-store" });
      const d = await r.json();
      if (d?.price) {
        setMarket({
          price: d.price.price,
          bid: d.price.bid ?? d.price.price - 0.15,
          ask: d.price.ask ?? d.price.price + 0.15,
          change: d.price.change ?? 0,
          changePct: d.price.changePct ?? 0,
          high: d.price.high ?? d.price.price,
          low: d.price.low ?? d.price.price,
          open: d.price.open ?? d.price.price,
          source: d.price.source,
          timestamp: d.price.timestamp,
        });
      }
      if (d?.candles && Array.isArray(d.candles)) {
        const cs: CandleData[] = d.candles.map((c: any) => {
          // Handle both unix seconds and unix ms
          let t = Number(c.time ?? c.t ?? 0);
          if (t > 1e12) t = Math.floor(t / 1000); // ms → seconds
          return {
            time: t,
            open: Number(c.open ?? c.o),
            high: Number(c.high ?? c.h),
            low: Number(c.low ?? c.l),
            close: Number(c.close ?? c.c),
            volume: Number(c.volume ?? c.v ?? 0),
          };
        });
        // Deduplicate by time (lightweight-charts requires strict ascending)
        const uniq = Array.from(new Map(cs.map(c => [c.time, c])).values()).sort((a, b) => a.time - b.time);
        setCandles(uniq);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // ====================== Fetch Demo Account ======================
  const fetchAccount = useCallback(async () => {
    try {
      const r = await fetch("/api/gold/demo-account", { cache: "no-store" });
      const d = await r.json();
      if (d?.account) {
        setAccount(d.account);
        setPositions(d.positions || []);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // ====================== Init effect ======================
  useEffect(() => {
    fetchMarket();
    fetchAccount();

    const mktInt = setInterval(fetchMarket, 3000);
    const accInt = setInterval(fetchAccount, 2000);

    return () => {
      clearInterval(mktInt);
      clearInterval(accInt);
    };
  }, [fetchMarket, fetchAccount]);

  // ====================== Chart effect ======================
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderUpColor: COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update candles on chart
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;
    const data = candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    try {
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    } catch (e) {
      // ignore
    }
  }, [candles]);

  // Update realtime price line on chart (remove old, create new — avoids stacking)
  useEffect(() => {
    if (!seriesRef.current || !market) return;
    try {
      if (livePriceLineRef.current) {
        seriesRef.current.removePriceLine(livePriceLineRef.current);
        livePriceLineRef.current = null;
      }
      livePriceLineRef.current = seriesRef.current.createPriceLine({
        price: market.price,
        color: COLORS.accent,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "LIVE",
      });
    } catch (e) {
      // ignore
    }
  }, [market?.price]);

  // ====================== Place Order ======================
  const placeOrder = useCallback(async (side: "BUY" | "SELL") => {
    if (!market) return;
    setPlacingOrder(true);
    setError(null);
    try {
      const price = side === "BUY" ? market.ask : market.bid;
      const sl = useSL ? (side === "BUY" ? price - slPips : price + slPips) : 0;
      const tp = useTP ? (side === "BUY" ? price + tpPips : price - tpPips) : 0;
      const r = await fetch("/api/gold/demo-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          side,
          volume,
          sl: Number(sl.toFixed(2)),
          tp: Number(tp.toFixed(2)),
          comment: "M.ROBOT-Web",
        }),
      });
      const d = await r.json();
      if (d?.success) {
        setToast(
          `✓ ${side} ${volume} lot ${SYMBOL} @ ${d.price?.toFixed(2)} (Ticket #${d.ticket})`
        );
        setTimeout(() => setToast(null), 4000);
        await fetchAccount();
      } else {
        setError(d?.error || "Order failed");
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setPlacingOrder(false);
      setShowConfirm(null);
    }
  }, [market, volume, useSL, useTP, slPips, tpPips, fetchAccount]);

  // ====================== Close Position ======================
  const closePosition = useCallback(async (ticket: number) => {
    try {
      const r = await fetch("/api/gold/demo-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const d = await r.json();
      if (d?.success) {
        setToast(`✓ Closed #${ticket} | P/L: $${(d.pnl ?? 0).toFixed(2)}`);
        setTimeout(() => setToast(null), 4000);
        await fetchAccount();
      }
    } catch (e) {
      // ignore
    }
  }, [fetchAccount]);

  // ====================== Render ======================
  return (
    <div className="flex flex-col w-full h-full" style={{ background: COLORS.bg }}>
      {/* === Top Bar: Account Info === */}
      <div
        className="flex items-center justify-between px-3 py-1.5 text-[11px]"
        style={{
          background: COLORS.panelHeader,
          borderBottom: `1px solid ${COLORS.border}`,
          color: COLORS.text,
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3" style={{ color: COLORS.ask }} />
            <span style={{ color: COLORS.textMuted }}>Connected</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ color: COLORS.textMuted }}>Login:</span>
            <span style={{ color: COLORS.textBright, fontWeight: 600 }}>
              {account?.login ?? 50123456}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ color: COLORS.textMuted }}>Server:</span>
            <span style={{ color: COLORS.textBright, fontWeight: 600 }}>
              {account?.server ?? "M.ROBOT-Demo"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ color: COLORS.textMuted }}>Name:</span>
            <span style={{ color: COLORS.textBright, fontWeight: 600 }}>
              {account?.name ?? "M.ROBOT Demo Account"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ color: COLORS.textMuted }}>Leverage:</span>
            <span style={{ color: COLORS.textBright, fontWeight: 600 }}>
              1:{account?.leverage ?? 500}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <span style={{ color: COLORS.textMuted }}>Balance:</span>{" "}
            <span style={{ color: COLORS.textBright, fontWeight: 700 }}>
              ${(account?.balance ?? 1000).toFixed(2)}
            </span>
          </div>
          <div>
            <span style={{ color: COLORS.textMuted }}>Equity:</span>{" "}
            <span style={{ color: COLORS.textBright, fontWeight: 700 }}>
              ${(account?.equity ?? 1000).toFixed(2)}
            </span>
          </div>
          <div>
            <span style={{ color: COLORS.textMuted }}>P/L:</span>{" "}
            <span
              style={{
                color: (account?.profit ?? 0) >= 0 ? COLORS.ask : COLORS.bid,
                fontWeight: 700,
              }}
            >
              {(account?.profit ?? 0) >= 0 ? "+" : ""}${(account?.profit ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* === Main Area: Chart + Side Panel === */}
      <div className="flex flex-1 overflow-hidden">
        {/* === Chart Area === */}
        <div className="flex flex-col flex-1">
          {/* Symbol header */}
          <div
            className="flex items-center justify-between px-3 py-1.5 text-[11px]"
            style={{
              background: COLORS.panelBg,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: COLORS.textBright, fontWeight: 700, fontSize: 13 }}>
                {SYMBOL}
              </span>
              <span style={{ color: COLORS.textMuted }}>{SYMBOL_DESC}</span>
              {market && (
                <span style={{ color: COLORS.textMuted, fontSize: 10 }}>
                  · {market.source}
                </span>
              )}
            </div>
            {market && (
              <div className="flex items-center gap-3">
                <div>
                  <span style={{ color: COLORS.textMuted }}>Bid:</span>{" "}
                  <span style={{ color: COLORS.bid, fontWeight: 700 }}>
                    {market.bid.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span style={{ color: COLORS.textMuted }}>Ask:</span>{" "}
                  <span style={{ color: COLORS.ask, fontWeight: 700 }}>
                    {market.ask.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span style={{ color: COLORS.textMuted }}>Spread:</span>{" "}
                  <span style={{ color: COLORS.text }}>
                    {(market.ask - market.bid).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span style={{ color: COLORS.textMuted }}>High:</span>{" "}
                  <span style={{ color: COLORS.text }}>{market.high.toFixed(2)}</span>
                </div>
                <div>
                  <span style={{ color: COLORS.textMuted }}>Low:</span>{" "}
                  <span style={{ color: COLORS.text }}>{market.low.toFixed(2)}</span>
                </div>
                <div>
                  <span style={{ color: COLORS.textMuted }}>Change:</span>{" "}
                  <span
                    style={{
                      color: market.change >= 0 ? COLORS.ask : COLORS.bid,
                      fontWeight: 600,
                    }}
                  >
                    {market.change >= 0 ? "+" : ""}
                    {market.change.toFixed(2)} ({market.changePct?.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="relative flex-1" ref={chartContainerRef} style={{ background: COLORS.bg }}>
            {candles.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 text-[11px]" style={{ color: COLORS.textMuted }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading chart data...
                </div>
              </div>
            )}
            {/* LIVE price overlay */}
            {market && (
              <div
                className="absolute top-2 right-2 px-2 py-1 rounded text-[11px] flex items-center gap-1.5 z-10"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  border: `1px solid ${COLORS.borderLight}`,
                  color: COLORS.textBright,
                }}
              >
                <Activity className="w-3 h-3" style={{ color: COLORS.accent }} />
                <span style={{ color: COLORS.textMuted }}>LIVE:</span>
                <span style={{ fontWeight: 700 }}>{market.price.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* === Right: Trade Panel === */}
        <div
          className="flex flex-col"
          style={{
            width: 280,
            background: COLORS.panelBg,
            borderLeft: `1px solid ${COLORS.border}`,
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold"
            style={{
              background: COLORS.panelHeader,
              borderBottom: `1px solid ${COLORS.border}`,
              color: COLORS.textBright,
            }}
          >
            <span>Quick Trade</span>
            <Settings className="w-3 h-3" style={{ color: COLORS.textMuted }} />
          </div>

          {/* Symbol + Volume */}
          <div className="p-3 space-y-3">
            <div>
              <label className="text-[10px] uppercase" style={{ color: COLORS.textMuted }}>
                Symbol
              </label>
              <div
                className="mt-1 px-2 py-1.5 rounded text-[12px] flex items-center justify-between"
                style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
              >
                <span style={{ color: COLORS.textBright, fontWeight: 700 }}>{SYMBOL}</span>
                <ChevronDown className="w-3 h-3" style={{ color: COLORS.textMuted }} />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase" style={{ color: COLORS.textMuted }}>
                Volume (Lots)
              </label>
              <div className="mt-1 flex items-center gap-1">
                <button
                  onClick={() => setVolume(Math.max(0.01, +(volume - 0.01).toFixed(2)))}
                  className="px-2 py-1.5 text-[12px] rounded"
                  style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
                >
                  −
                </button>
                <input
                  type="number"
                  step={0.01}
                  min={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Math.max(0.01, Number(e.target.value)))}
                  className="flex-1 px-2 py-1.5 text-[12px] text-center rounded"
                  style={{
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textBright,
                  }}
                />
                <button
                  onClick={() => setVolume(+(volume + 0.01).toFixed(2))}
                  className="px-2 py-1.5 text-[12px] rounded"
                  style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
                >
                  +
                </button>
              </div>
              <div className="text-[9px] mt-1" style={{ color: COLORS.textMuted }}>
                ≈ ${((volume * 100) / (account?.leverage ?? 500)).toFixed(2)} required margin
              </div>
            </div>

            {/* SL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase" style={{ color: COLORS.textMuted }}>
                  Stop Loss
                </label>
                <input
                  type="checkbox"
                  checked={useSL}
                  onChange={(e) => setUseSL(e.target.checked)}
                  className="w-3 h-3"
                />
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step={0.1}
                  value={slPips}
                  disabled={!useSL}
                  onChange={(e) => setSlPips(Number(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-[12px] rounded"
                  style={{
                    background: useSL ? COLORS.bg : COLORS.panelHeader,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textBright,
                  }}
                />
                <span className="text-[10px]" style={{ color: COLORS.textMuted }}>
                  $
                </span>
              </div>
            </div>

            {/* TP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase" style={{ color: COLORS.textMuted }}>
                  Take Profit
                </label>
                <input
                  type="checkbox"
                  checked={useTP}
                  onChange={(e) => setUseTP(e.target.checked)}
                  className="w-3 h-3"
                />
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step={0.1}
                  value={tpPips}
                  disabled={!useTP}
                  onChange={(e) => setTpPips(Number(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-[12px] rounded"
                  style={{
                    background: useTP ? COLORS.bg : COLORS.panelHeader,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textBright,
                  }}
                />
                <span className="text-[10px]" style={{ color: COLORS.textMuted }}>
                  $
                </span>
              </div>
            </div>

            {/* One-Click */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase" style={{ color: COLORS.textMuted }}>
                One-Click Trading
              </label>
              <input
                type="checkbox"
                checked={oneClick}
                onChange={(e) => setOneClick(e.target.checked)}
                className="w-3 h-3"
              />
            </div>

            {/* Risk/reward display */}
            <div
              className="text-[10px] px-2 py-1.5 rounded"
              style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
            >
              <div style={{ color: COLORS.textMuted }}>
                Risk:Rward →{" "}
                <span style={{ color: COLORS.textBright, fontWeight: 700 }}>
                  1:{useSL && useTP && slPips > 0 ? (tpPips / slPips).toFixed(2) : "—"}
                </span>
              </div>
              <div style={{ color: COLORS.textMuted }} className="mt-0.5">
                Risk:{" "}
                <span style={{ color: COLORS.bid }}>
                  ${(slPips * volume * 100).toFixed(2)}
                </span>{" "}
                | Reward:{" "}
                <span style={{ color: COLORS.ask }}>
                  ${(tpPips * volume * 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* BUY / SELL buttons */}
            <div className="space-y-2 pt-1">
              {oneClick ? (
                <>
                  <button
                    onClick={() => placeOrder("SELL")}
                    disabled={placingOrder || !market}
                    className="w-full py-2.5 rounded text-[13px] font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: COLORS.bid, color: "#fff" }}
                  >
                    {placingOrder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    SELL {volume} @ {market ? market.bid.toFixed(2) : "—"}
                  </button>
                  <button
                    onClick={() => placeOrder("BUY")}
                    disabled={placingOrder || !market}
                    className="w-full py-2.5 rounded text-[13px] font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: COLORS.ask, color: "#fff" }}
                  >
                    {placingOrder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    BUY {volume} @ {market ? market.ask.toFixed(2) : "—"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowConfirm("SELL")}
                    disabled={placingOrder || !market}
                    className="w-full py-2.5 rounded text-[13px] font-bold flex items-center justify-center gap-2"
                    style={{ background: COLORS.bid, color: "#fff" }}
                  >
                    <TrendingDown className="w-4 h-4" />
                    SELL {volume} @ {market ? market.bid.toFixed(2) : "—"}
                  </button>
                  <button
                    onClick={() => setShowConfirm("BUY")}
                    disabled={placingOrder || !market}
                    className="w-full py-2.5 rounded text-[13px] font-bold flex items-center justify-center gap-2"
                    style={{ background: COLORS.ask, color: "#fff" }}
                  >
                    <TrendingUp className="w-4 h-4" />
                    BUY {volume} @ {market ? market.ask.toFixed(2) : "—"}
                  </button>
                </>
              )}
            </div>

            {error && (
              <div
                className="text-[10px] px-2 py-1.5 rounded"
                style={{
                  background: `${COLORS.bid}15`,
                  color: COLORS.bid,
                  border: `1px solid ${COLORS.bid}40`,
                }}
              >
                ⚠ {error}
              </div>
            )}
          </div>

          {/* Account stats */}
          <div
            className="mt-auto p-3 text-[10px] space-y-1.5"
            style={{ borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg }}
          >
            <div className="flex justify-between">
              <span style={{ color: COLORS.textMuted }}>Balance</span>
              <span style={{ color: COLORS.textBright, fontWeight: 600 }}>
                ${(account?.balance ?? 1000).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: COLORS.textMuted }}>Equity</span>
              <span style={{ color: COLORS.textBright, fontWeight: 600 }}>
                ${(account?.equity ?? 1000).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: COLORS.textMuted }}>Margin</span>
              <span style={{ color: COLORS.textBright }}>
                ${(account?.margin ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: COLORS.textMuted }}>Free Margin</span>
              <span style={{ color: COLORS.textBright }}>
                ${(account?.marginFree ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: COLORS.textMuted }}>Margin Level</span>
              <span
                style={{
                  color:
                    (account?.marginLevel ?? 0) > 500
                      ? COLORS.ask
                      : (account?.marginLevel ?? 0) > 200
                      ? COLORS.warning
                      : COLORS.bid,
                  fontWeight: 600,
                }}
              >
                {(account?.marginLevel ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* === Bottom: Positions Table === */}
      <div
        className="flex flex-col"
        style={{
          height: 220,
          background: COLORS.panelBg,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{ background: COLORS.panelHeader, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: COLORS.textBright }}>
              Positions
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: `${COLORS.accent}20`, color: COLORS.accent }}
            >
              {positions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAccount}
              className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded"
              style={{ background: COLORS.bg, color: COLORS.text }}
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Refresh
            </button>
            {positions.length > 0 && (
              <button
                onClick={async () => {
                  for (const p of positions) {
                    await closePosition(p.ticket);
                  }
                }}
                className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                style={{ background: `${COLORS.bid}20`, color: COLORS.bid }}
              >
                <X className="w-2.5 h-2.5" />
                Close All
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[11px]" style={{ color: COLORS.textMuted }}>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading account...
            </div>
          ) : positions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[11px]" style={{ color: COLORS.textMuted }}>
              No open positions. Use BUY/SELL buttons above to place your first trade.
            </div>
          ) : (
            <table className="w-full text-[10px]">
              <thead>
                <tr style={{ background: COLORS.panelHeader, color: COLORS.textMuted }}>
                  <th className="px-2 py-1 text-left font-normal">Ticket</th>
                  <th className="px-2 py-1 text-left font-normal">Symbol</th>
                  <th className="px-2 py-1 text-left font-normal">Type</th>
                  <th className="px-2 py-1 text-right font-normal">Volume</th>
                  <th className="px-2 py-1 text-right font-normal">Open Price</th>
                  <th className="px-2 py-1 text-right font-normal">Current</th>
                  <th className="px-2 py-1 text-right font-normal">S/L</th>
                  <th className="px-2 py-1 text-right font-normal">T/P</th>
                  <th className="px-2 py-1 text-right font-normal">Profit</th>
                  <th className="px-2 py-1 text-left font-normal">Time</th>
                  <th className="px-2 py-1 text-center font-normal">×</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr
                    key={p.ticket}
                    style={{ borderTop: `1px solid ${COLORS.border}`, color: COLORS.text }}
                  >
                    <td className="px-2 py-1" style={{ color: COLORS.textMuted }}>#{p.ticket}</td>
                    <td className="px-2 py-1" style={{ color: COLORS.textBright, fontWeight: 600 }}>
                      {p.symbol}
                    </td>
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
                    <td className="px-2 py-1 text-right" style={{ color: COLORS.textBright }}>
                      {p.priceCurrent.toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-right" style={{ color: COLORS.bid }}>
                      {p.sl > 0 ? p.sl.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right" style={{ color: COLORS.ask }}>
                      {p.tp > 0 ? p.tp.toFixed(2) : "—"}
                    </td>
                    <td
                      className="px-2 py-1 text-right font-bold"
                      style={{ color: p.profit >= 0 ? COLORS.ask : COLORS.bid }}
                    >
                      {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                    </td>
                    <td className="px-2 py-1" style={{ color: COLORS.textMuted, fontSize: 9 }}>
                      {new Date(p.time * 1000).toLocaleTimeString()}
                    </td>
                    <td className="px-2 py-1 text-center">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* === Confirm Dialog (when one-click disabled) === */}
      {showConfirm && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowConfirm(null)}
        >
          <div
            className="rounded-md p-4 w-80"
            style={{ background: COLORS.panelBg, border: `1px solid ${COLORS.borderLight}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[12px] font-semibold mb-2" style={{ color: COLORS.textBright }}>
              Confirm {showConfirm} Order
            </div>
            <div className="text-[10px] space-y-1" style={{ color: COLORS.textMuted }}>
              <div className="flex justify-between">
                <span>Symbol:</span>
                <span style={{ color: COLORS.textBright }}>{SYMBOL}</span>
              </div>
              <div className="flex justify-between">
                <span>Volume:</span>
                <span style={{ color: COLORS.textBright }}>{volume} lots</span>
              </div>
              <div className="flex justify-between">
                <span>Price:</span>
                <span
                  style={{ color: showConfirm === "BUY" ? COLORS.ask : COLORS.bid }}
                >
                  {market ? (showConfirm === "BUY" ? market.ask : market.bid).toFixed(2) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>S/L:</span>
                <span style={{ color: COLORS.bid }}>
                  {useSL ? `${slPips}$` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>T/P:</span>
                <span style={{ color: COLORS.ask }}>
                  {useTP ? `${tpPips}$` : "—"}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-1.5 text-[11px] rounded"
                style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
              >
                Cancel
              </button>
              <button
                onClick={() => placeOrder(showConfirm)}
                disabled={placingOrder}
                className="flex-1 py-1.5 text-[11px] rounded font-bold"
                style={{
                  background: showConfirm === "BUY" ? COLORS.ask : COLORS.bid,
                  color: "#fff",
                }}
              >
                {placingOrder ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Toast === */}
      {toast && (
        <div
          className="absolute bottom-4 right-4 px-3 py-2 rounded-md text-[11px] z-50 flex items-center gap-2"
          style={{
            background: COLORS.panelBg,
            border: `1px solid ${COLORS.ask}`,
            color: COLORS.textBright,
          }}
        >
          <Zap className="w-3 h-3" style={{ color: COLORS.ask }} />
          {toast}
        </div>
      )}
    </div>
  );
}
