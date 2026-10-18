"use client";

// =====================================================================
//  M.ROBOT MT5 Web Trading — Pre-Authenticated Trading Interface
// =====================================================================
//  • Pre-logged-in to demo account (Login 50123456 / M.ROBOT-Demo)
//  • $1000 balance, 1:500 leverage
//  • Real MetaTrader-style chart (TradingView widget — same engine
//    MetaQuotes uses for MT5 Web)
//  • Coordinated layout: top bar / chart + side panel / positions
// =====================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wifi,
  RefreshCw,
  X,
  Settings,
  Loader2,
  ChevronDown,
  Activity,
  Zap,
  Clock,
} from "lucide-react";

// ====================== Theme (MT5 dark) ======================
const COLORS = {
  bg: "#0e0e0e",
  panelBg: "#1a1a1a",
  panelHeader: "#232323",
  border: "#2a2a2a",
  borderLight: "#3a3a3a",
  text: "#d4d4d4",
  textBright: "#ffffff",
  textMuted: "#888888",
  bid: "#ef4444",
  ask: "#22c55e",
  up: "#22c55e",
  down: "#ef4444",
  accent: "#3b82f6",
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
const TV_SYMBOL = "OANDA:XAUUSD"; // TradingView symbol — same as MT5 default

// ====================== Component ======================
export default function MT5WebTrading() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tvInterval, setTvInterval] = useState("15"); // TradingView interval

  // Order form state
  const [volume, setVolume] = useState(0.01);
  const [useSL, setUseSL] = useState(true);
  const [useTP, setUseTP] = useState(true);
  const [slPips, setSlPips] = useState(10);
  const [tpPips, setTpPips] = useState(30);
  const [oneClick, setOneClick] = useState(true);
  const [showConfirm, setShowConfirm] = useState<null | "BUY" | "SELL">(null);

  // TradingView widget container ref
  const tvContainerRef = useRef<HTMLDivElement>(null);
  const tvScriptRef = useRef<HTMLScriptElement | null>(null);
  const tvWidgetRef = useRef<any>(null);

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

  // ====================== Init effects ======================
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

  // ====================== TradingView Widget ======================
  useEffect(() => {
    if (!tvContainerRef.current) return;

    // Remove any existing widget
    if (tvContainerRef.current.firstChild) {
      tvContainerRef.current.innerHTML = "";
    }

    // Load tv.js once
    const loadTV = () => {
      if (typeof window === "undefined") return;
      const w = window as any;
      if (w.TradingView) {
        createWidget();
        return;
      }
      // Inject script
      if (!tvScriptRef.current) {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = createWidget;
        script.onerror = () => {
          // Fallback: show error placeholder
          if (tvContainerRef.current) {
            tvContainerRef.current.innerHTML =
              '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:11px;font-family:Segoe UI, sans-serif">Chart unavailable — check your connection</div>';
          }
        };
        document.head.appendChild(script);
        tvScriptRef.current = script;
      } else {
        // Script is loading, wait then create
        const check = setInterval(() => {
          if ((window as any).TradingView) {
            clearInterval(check);
            createWidget();
          }
        }, 200);
      }
    };

    const createWidget = () => {
      const w = window as any;
      if (!w.TradingView || !tvContainerRef.current) return;
      try {
        tvWidgetRef.current = new w.TradingView.widget({
          autosize: true,
          symbol: TV_SYMBOL,
          interval: tvInterval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1", // Candles
          locale: "ar_AE",
          toolbar_bg: COLORS.panelHeader,
          enable_publishing: false,
          allow_symbol_change: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          details: false,
          hotlist: false,
          calendar: false,
          studies: [],
          container: tvContainerRef.current,
        });
      } catch (e) {
        // ignore
      }
    };

    loadTV();

    return () => {
      if (tvContainerRef.current) {
        tvContainerRef.current.innerHTML = "";
      }
      tvWidgetRef.current = null;
    };
    // Re-init when interval changes
  }, [tvInterval]);

  // ====================== Place Order ======================
  const placeOrder = useCallback(
    async (side: "BUY" | "SELL") => {
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
    },
    [market, volume, useSL, useTP, slPips, tpPips, fetchAccount]
  );

  // ====================== Close Position ======================
  const closePosition = useCallback(
    async (ticket: number) => {
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
    },
    [fetchAccount]
  );

  const fmtTime = (t: number) => {
    if (!t) return "—";
    return new Date(t * 1000).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // ====================== Render ======================
  return (
    <div
      className="flex flex-col w-full h-full overflow-hidden"
      style={{ background: COLORS.bg, color: COLORS.text }}
    >
      {/* === Top Bar: Account Info (compact, single row) === */}
      <div
        className="flex items-center justify-between px-3 text-[11px] flex-shrink-0"
        style={{
          background: COLORS.panelHeader,
          borderBottom: `1px solid ${COLORS.border}`,
          height: 32,
        }}
      >
        {/* Left: Connection + Account */}
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
            <span style={{ color: COLORS.textMuted }}>Leverage:</span>
            <span style={{ color: COLORS.textBright, fontWeight: 600 }}>
              1:{account?.leverage ?? 500}
            </span>
          </div>
        </div>

        {/* Right: Account metrics */}
        <div className="flex items-center gap-3">
          <Metric
            label="Balance"
            value={`$${(account?.balance ?? 1000).toFixed(2)}`}
          />
          <Metric
            label="Equity"
            value={`$${(account?.equity ?? 1000).toFixed(2)}`}
          />
          <Metric
            label="Margin"
            value={`$${(account?.margin ?? 0).toFixed(2)}`}
          />
          <Metric
            label="Free"
            value={`$${(account?.marginFree ?? 0).toFixed(2)}`}
          />
          <div className="flex items-center gap-1">
            <span style={{ color: COLORS.textMuted }}>P/L:</span>
            <span
              style={{
                color: (account?.profit ?? 0) >= 0 ? COLORS.ask : COLORS.bid,
                fontWeight: 700,
              }}
            >
              {(account?.profit ?? 0) >= 0 ? "+" : ""}$
              {(account?.profit ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* === Main Area: Chart (left) + Side Panel (right) === */}
      <div className="flex flex-1 overflow-hidden">
        {/* === Chart Area === */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Symbol header */}
          <div
            className="flex items-center justify-between px-3 text-[11px] flex-shrink-0"
            style={{
              background: COLORS.panelBg,
              borderBottom: `1px solid ${COLORS.border}`,
              height: 28,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                style={{ color: COLORS.textBright, fontWeight: 700, fontSize: 12 }}
              >
                {SYMBOL}
              </span>
              <span style={{ color: COLORS.textMuted }}>{SYMBOL_DESC}</span>
              {market && (
                <span style={{ color: COLORS.textMuted, fontSize: 9 }}>
                  · {market.source}
                </span>
              )}
            </div>

            {/* Timeframe switcher (TV interval) */}
            <div
              className="flex items-center gap-0.5 p-0.5 rounded"
              style={{ background: COLORS.panelHeader }}
            >
              {["1", "5", "15", "30", "60", "240", "D", "W"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTvInterval(tf)}
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold transition"
                  style={{
                    background:
                      tvInterval === tf ? COLORS.accent : "transparent",
                    color: tvInterval === tf ? "#fff" : COLORS.textMuted,
                  }}
                >
                  {tf === "60" ? "H1" : tf === "240" ? "H4" : tf === "D" ? "D1" : tf === "W" ? "W1" : tf === "1" ? "M1" : tf === "5" ? "M5" : tf === "15" ? "M15" : "M30"}
                </button>
              ))}
            </div>

            {market && (
              <div className="flex items-center gap-3">
                <BidAsk label="Bid" value={market.bid} color={COLORS.bid} />
                <BidAsk label="Ask" value={market.ask} color={COLORS.ask} />
                <span style={{ color: COLORS.textMuted }}>
                  Spread:{" "}
                  <span style={{ color: COLORS.text }}>
                    {(market.ask - market.bid).toFixed(2)}
                  </span>
                </span>
                <span style={{ color: COLORS.textMuted }}>
                  H:{" "}
                  <span style={{ color: COLORS.text }}>
                    {market.high.toFixed(2)}
                  </span>
                </span>
                <span style={{ color: COLORS.textMuted }}>
                  L:{" "}
                  <span style={{ color: COLORS.text }}>
                    {market.low.toFixed(2)}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* TradingView chart container */}
          <div
            className="relative flex-1"
            style={{
              background: COLORS.bg,
              minHeight: 0, // allow flex shrink
            }}
          >
            <div
              ref={tvContainerRef}
              style={{ width: "100%", height: "100%" }}
            />
            {/* LIVE price overlay */}
            {market && (
              <div
                className="absolute top-2 right-2 px-2 py-1 rounded text-[11px] flex items-center gap-1.5 z-10 pointer-events-none"
                style={{
                  background: "rgba(0,0,0,0.65)",
                  border: `1px solid ${COLORS.borderLight}`,
                  color: COLORS.textBright,
                }}
              >
                <Activity
                  className="w-3 h-3 animate-pulse"
                  style={{ color: COLORS.accent }}
                />
                <span style={{ color: COLORS.textMuted }}>LIVE:</span>
                <span style={{ fontWeight: 700 }}>
                  {market.price.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* === Right Side Panel (Trade + Account) === */}
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
            className="flex items-center justify-between px-3 text-[11px] font-semibold flex-shrink-0"
            style={{
              background: COLORS.panelHeader,
              borderBottom: `1px solid ${COLORS.border}`,
              color: COLORS.textBright,
              height: 28,
            }}
          >
            <span>Quick Trade</span>
            <Settings
              className="w-3 h-3"
              style={{ color: COLORS.textMuted }}
            />
          </div>

          {/* Form fields */}
          <div className="p-3 space-y-3 flex-1 overflow-auto">
            {/* Symbol */}
            <Field label="Symbol">
              <div
                className="px-2 py-1.5 rounded text-[12px] flex items-center justify-between"
                style={{
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <span style={{ color: COLORS.textBright, fontWeight: 700 }}>
                  {SYMBOL}
                </span>
                <ChevronDown
                  className="w-3 h-3"
                  style={{ color: COLORS.textMuted }}
                />
              </div>
            </Field>

            {/* Volume */}
            <Field label="Volume (Lots)">
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setVolume(Math.max(0.01, +(volume - 0.01).toFixed(2)))
                  }
                  className="px-2 py-1.5 text-[12px] rounded"
                  style={{
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  step={0.01}
                  min={0.01}
                  value={volume}
                  onChange={(e) =>
                    setVolume(Math.max(0.01, Number(e.target.value)))
                  }
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
                  style={{
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                  }}
                >
                  +
                </button>
              </div>
              <div className="text-[9px] mt-1" style={{ color: COLORS.textMuted }}>
                ≈ $
                {((volume * 100) / (account?.leverage ?? 500)).toFixed(2)}{" "}
                required margin
              </div>
            </Field>

            {/* SL */}
            <Field label="Stop Loss" hasCheckbox={useSL} onToggle={setUseSL}>
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
                <span
                  className="text-[10px]"
                  style={{ color: COLORS.textMuted }}
                >
                  $
                </span>
              </div>
            </Field>

            {/* TP */}
            <Field label="Take Profit" hasCheckbox={useTP} onToggle={setUseTP}>
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
                <span
                  className="text-[10px]"
                  style={{ color: COLORS.textMuted }}
                >
                  $
                </span>
              </div>
            </Field>

            {/* One-Click */}
            <div className="flex items-center justify-between">
              <label
                className="text-[10px] uppercase"
                style={{ color: COLORS.textMuted }}
              >
                One-Click Trading
              </label>
              <input
                type="checkbox"
                checked={oneClick}
                onChange={(e) => setOneClick(e.target.checked)}
                className="w-3 h-3"
              />
            </div>

            {/* R:R display */}
            <div
              className="text-[10px] px-2 py-1.5 rounded"
              style={{
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <div style={{ color: COLORS.textMuted }}>
                Risk:Reward →{" "}
                <span style={{ color: COLORS.textBright, fontWeight: 700 }}>
                  1:
                  {useSL && useTP && slPips > 0
                    ? (tpPips / slPips).toFixed(2)
                    : "—"}
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
              <button
                onClick={() => (oneClick ? placeOrder("SELL") : setShowConfirm("SELL"))}
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
                onClick={() => (oneClick ? placeOrder("BUY") : setShowConfirm("BUY"))}
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

          {/* Account stats (sticky at bottom of side panel) */}
          <div
            className="p-3 text-[10px] space-y-1.5 flex-shrink-0"
            style={{
              borderTop: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            <Stat
              label="Balance"
              value={`$${(account?.balance ?? 1000).toFixed(2)}`}
            />
            <Stat
              label="Equity"
              value={`$${(account?.equity ?? 1000).toFixed(2)}`}
            />
            <Stat
              label="Margin"
              value={`$${(account?.margin ?? 0).toFixed(2)}`}
            />
            <Stat
              label="Free Margin"
              value={`$${(account?.marginFree ?? 0).toFixed(2)}`}
            />
            <Stat
              label="Margin Level"
              value={`${(account?.marginLevel ?? 0).toFixed(2)}%`}
              color={
                (account?.marginLevel ?? 0) > 500
                  ? COLORS.ask
                  : (account?.marginLevel ?? 0) > 200
                    ? COLORS.warning
                    : COLORS.bid
              }
            />
          </div>
        </div>
      </div>

      {/* === Bottom: Positions Table (compact) === */}
      <div
        className="flex flex-col flex-shrink-0"
        style={{
          height: 200,
          background: COLORS.panelBg,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        {/* Tabs row */}
        <div
          className="flex items-center justify-between px-3 text-[11px] flex-shrink-0"
          style={{
            background: COLORS.panelHeader,
            borderBottom: `1px solid ${COLORS.border}`,
            height: 28,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-semibold"
              style={{
                color: COLORS.textBright,
                borderBottom: `2px solid ${COLORS.accent}`,
                paddingBottom: 4,
              }}
            >
              Positions
            </span>
            <span style={{ color: COLORS.textMuted }}>|</span>
            <span style={{ color: COLORS.textMuted }}>History</span>
            <span style={{ color: COLORS.textMuted }}>|</span>
            <span style={{ color: COLORS.textMuted }}>Journal</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                background: `${COLORS.accent}20`,
                color: COLORS.accent,
              }}
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
                style={{
                  background: `${COLORS.bid}20`,
                  color: COLORS.bid,
                }}
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
            <div
              className="flex items-center justify-center h-full text-[11px]"
              style={{ color: COLORS.textMuted }}
            >
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading account...
            </div>
          ) : positions.length === 0 ? (
            <div
              className="flex items-center justify-center h-full text-[11px]"
              style={{ color: COLORS.textMuted }}
            >
              No open positions. Use BUY/SELL buttons above to place your first
              trade.
            </div>
          ) : (
            <table
              className="w-full text-[10px]"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ background: COLORS.panelHeader }}>
                  {[
                    "Ticket",
                    "Symbol",
                    "Type",
                    "Volume",
                    "Open Price",
                    "Current",
                    "S/L",
                    "T/P",
                    "Profit",
                    "Time",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-2 py-1 font-normal"
                      style={{
                        color: COLORS.textMuted,
                        textAlign:
                          i === 0 || i === 1 || i === 2 || i === 9 || i === 10
                            ? "left"
                            : "right",
                        borderBottom: `1px solid ${COLORS.border}`,
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      {h}
                    </th>
                  ))}
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
                    <td className="px-2 py-1" style={{ color: COLORS.textMuted }}>
                      #{p.ticket}
                    </td>
                    <td
                      className="px-2 py-1"
                      style={{ color: COLORS.textBright, fontWeight: 600 }}
                    >
                      {p.symbol}
                    </td>
                    <td className="px-2 py-1">
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
                    </td>
                    <td className="px-2 py-1 text-right">
                      {p.volume.toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {p.priceOpen.toFixed(2)}
                    </td>
                    <td
                      className="px-2 py-1 text-right"
                      style={{ color: COLORS.textBright }}
                    >
                      {p.priceCurrent.toFixed(2)}
                    </td>
                    <td
                      className="px-2 py-1 text-right"
                      style={{ color: COLORS.bid }}
                    >
                      {p.sl > 0 ? p.sl.toFixed(2) : "—"}
                    </td>
                    <td
                      className="px-2 py-1 text-right"
                      style={{ color: COLORS.ask }}
                    >
                      {p.tp > 0 ? p.tp.toFixed(2) : "—"}
                    </td>
                    <td
                      className="px-2 py-1 text-right font-bold"
                      style={{
                        color: p.profit >= 0 ? COLORS.ask : COLORS.bid,
                      }}
                    >
                      {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                    </td>
                    <td
                      className="px-2 py-1"
                      style={{ color: COLORS.textMuted, fontSize: 9 }}
                    >
                      <Clock className="w-2.5 h-2.5 inline mr-1" />
                      {fmtTime(p.time)}
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
            style={{
              background: COLORS.panelBg,
              border: `1px solid ${COLORS.borderLight}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="text-[12px] font-semibold mb-2"
              style={{ color: COLORS.textBright }}
            >
              Confirm {showConfirm} Order
            </div>
            <div
              className="text-[10px] space-y-1"
              style={{ color: COLORS.textMuted }}
            >
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
                  style={{
                    color: showConfirm === "BUY" ? COLORS.ask : COLORS.bid,
                  }}
                >
                  {market
                    ? (showConfirm === "BUY" ? market.ask : market.bid).toFixed(
                        2
                      )
                    : "—"}
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
                style={{
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => placeOrder(showConfirm)}
                disabled={placingOrder}
                className="flex-1 py-1.5 text-[11px] rounded font-bold"
                style={{
                  background:
                    showConfirm === "BUY" ? COLORS.ask : COLORS.bid,
                  color: "#fff",
                }}
              >
                {placingOrder ? (
                  <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                ) : (
                  "Confirm"
                )}
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

// ====================== Reusable subcomponents ======================
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: COLORS.textMuted }}>{label}:</span>
      <span style={{ color: COLORS.textBright, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span style={{ color: COLORS.textMuted }}>{label}</span>
      <span style={{ color: color || COLORS.textBright, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function BidAsk({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <span style={{ color: COLORS.textMuted }}>
      {label}:{" "}
      <span style={{ color, fontWeight: 700 }}>{value.toFixed(2)}</span>
    </span>
  );
}

function Field({
  label,
  children,
  hasCheckbox,
  onToggle,
}: {
  label: string;
  children: React.ReactNode;
  hasCheckbox?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label
          className="text-[10px] uppercase"
          style={{ color: COLORS.textMuted }}
        >
          {label}
        </label>
        {hasCheckbox !== undefined && onToggle && (
          <input
            type="checkbox"
            checked={hasCheckbox}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-3 h-3"
          />
        )}
      </div>
      {children}
    </div>
  );
}
