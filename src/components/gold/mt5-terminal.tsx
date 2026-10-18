"use client";
// Build version: bust-cache
const __BUILD_VERSION__ = "v" + Date.now();

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Settings,
  Wifi,
  WifiOff,
  Bell,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw,
  Maximize2,
  Minus,
  Square,
  FileText,
  Eye,
  Insert,
  ChartBar,
  Tool,
  Window,
  HelpCircle,
  Tv,
  Loader2,
} from "lucide-react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import type { Candle } from "@/lib/indicators";
import BacktestModal from "@/components/gold/backtest-modal";

// === Prevent tree-shaking of Loader2 (needed by old cached chunks) ===
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepLoader2 = Loader2;

// === MT5 Dark Theme Colors ===
const COLORS = {
  // Background shades (matches MT5 dark)
  titleBar: "#2d2d2d",
  menuBar: "#1e1e1e",
  toolbar: "#2b2b2b",
  panelBg: "#252525",
  panelHeader: "#2d2d2d",
  chartBg: "#1e1e1e",
  toolboxBg: "#252525",
  statusBar: "#2d2d2d",
  border: "#3c3c3c",
  borderLight: "#4a4a4a",
  // Text
  text: "#d4d4d4",
  textBright: "#ffffff",
  textMuted: "#888888",
  textDim: "#5a5a5a",
  // Market colors
  bid: "#ff4d4d",  // red (sell price)
  ask: "#00b050",  // green (buy price)
  up: "#00b050",
  down: "#ff4d4d",
  // UI accents
  accent: "#007acc",
  warning: "#ffaa00",
  bg: "#1e1e1e",
};

// === Symbol for MT5 ===
const SYMBOL = "XAUUSD";
const SYMBOL_DESC = "Gold vs US Dollar";

interface MarketData {
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
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

interface MTAccount {
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

interface MTPosition {
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

interface AgentAlert {
  id: string;
  timestamp: number;
  agent: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const TF_MAP: Record<string, string> = {
  M1: "1m", M5: "5m", M15: "15m", M30: "30m",
  H1: "1h", H4: "4h", D1: "1d", W1: "1w",
};

const MARKET_WATCH_SYMBOLS = [
  { name: "XAUUSD", desc: "Gold vs US Dollar", bid: 0, ask: 0, change: 0 },
  { name: "XAGUSD", desc: "Silver vs US Dollar", bid: 0, ask: 0, change: 0 },
  { name: "EURUSD", desc: "Euro vs US Dollar", bid: 0, ask: 0, change: 0 },
  { name: "GBPUSD", desc: "Pound vs US Dollar", bid: 0, ask: 0, change: 0 },
  { name: "USDJPY", desc: "Dollar vs Yen", bid: 0, ask: 0, change: 0 },
  { name: "USDCHF", desc: "Dollar vs Franc", bid: 0, ask: 0, change: 0 },
  { name: "AUDUSD", desc: "Aussie vs US Dollar", bid: 0, ask: 0, change: 0 },
  { name: "USDCAD", desc: "Dollar vs Loonie", bid: 0, ask: 0, change: 0 },
  { name: "BTCUSD", desc: "Bitcoin vs Dollar", bid: 0, ask: 0, change: 0 },
  { name: "ETHUSD", desc: "Ethereum vs Dollar", bid: 0, ask: 0, change: 0 },
];

export default function MT5Terminal() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [account, setAccount] = useState<MTAccount | null>(null);
  const [positions, setPositions] = useState<MTPosition[]>([]);
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [mt5Connected, setMt5Connected] = useState(false);
  const [timeframe, setTimeframe] = useState("M15");
  const [activeToolboxTab, setActiveToolboxTab] = useState<"trade" | "history" | "alerts" | "tv_signals" | "backtest" | "news" | "terminal">("trade");
  const [history, setHistory] = useState<any[]>([]);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [chartSource, setChartSource] = useState<"mt5" | "tradingview">("mt5"); // chart switcher
  const [tvSignals, setTVSignals] = useState<any[]>([]);
  const [tvDecisions, setTVDecisions] = useState<any[]>([]);
  // === Backtest state ===
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [showBacktestModal, setShowBacktestModal] = useState(false);
  const [newsStatus, setNewsStatus] = useState<any>(null);
  const [newsEvents, setNewsEvents] = useState<any[]>([]);
  const [wyckoffResult, setWyckoffResult] = useState<any>(null);
  // === DEMO MODE (Market Simulation) ===
  const [demoMode, setDemoMode] = useState(false);
  const [demoPrice, setDemoPrice] = useState(0);
  const [demoSpeed, setDemoSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const demoCandlesRef = useRef<CandleData[]>([]);
  const chartRef = useRef<any>(null);
  const mainRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCandlesRef = useRef<CandleData[] | null>(null);

  // === Fetch market data ===
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
          prevClose: d.price.prevClose ?? d.price.price,
          volume: d.price.volume ?? 0,
          source: d.price.source,
          timestamp: d.price.timestamp,
        });
        if (d.price.source?.includes("MT5")) {
          setMt5Connected(true);
          setConnectionStatus("connected");
        } else {
          setConnectionStatus("connected-fallback");
        }
      }
    } catch (e) {
      setConnectionStatus("disconnected");
    }
  }, []);

  // === Fetch candles ===
  const fetchCandles = useCallback(async (tf: string) => {
    try {
      const r = await fetch(`/api/gold/history?interval=${TF_MAP[tf]}&months=3`, { cache: "no-store" });
      const d = await r.json();
      if (Array.isArray(d?.candles)) {
        const cs: CandleData[] = d.candles.map((c: any) => ({
          time: Number(c.time),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        }));
        setCandles(cs.slice(-200)); // last 200 for display
      }
    } catch (e) {}
  }, []);

  // === Fetch MT5 account + positions (demo account always works) ===
  const fetchMT5Data = useCallback(async () => {
    // Try real MT5 bridge first
    try {
      const r = await fetch("/api/gold/mt-connect", { cache: "no-store" });
      const d = await r.json();
      if (d?.status?.mt5Connected && d?.status?.account) {
        const a = d.status.account;
        setAccount({
          login: a.login, name: a.name, server: a.server, currency: a.currency,
          leverage: a.leverage, balance: a.balance, equity: a.equity,
          margin: a.margin, marginFree: a.marginFree, marginLevel: a.marginLevel, profit: a.profit,
        });
        setMt5Connected(true);
        try {
          const pr = await fetch("/api/gold/mt-positions", { cache: "no-store" });
          const pd = await pr.json();
          if (Array.isArray(pd?.positions)) setPositions(pd.positions);
        } catch {}
        return;
      }
    } catch {}
    // Fallback: use demo account ($1000, 1:500)
    try {
      const dr = await fetch("/api/gold/demo-account", { cache: "no-store" });
      const dd = await dr.json();
      if (dd?.account) {
        setAccount({
          login: dd.account.login, name: dd.account.name, server: dd.account.server,
          currency: dd.account.currency, leverage: dd.account.leverage,
          balance: dd.account.balance, equity: dd.account.equity,
          margin: dd.account.margin, marginFree: dd.account.marginFree,
          marginLevel: dd.account.marginLevel, profit: dd.account.profit,
        });
        setMt5Connected(true);
        setConnectionStatus("connected");
        if (Array.isArray(dd.positions)) {
          setPositions(dd.positions.map((p: any) => ({
            ticket: p.ticket, symbol: p.symbol, type: p.type, volume: p.volume,
            priceOpen: p.priceOpen, priceCurrent: p.priceCurrent, sl: p.sl, tp: p.tp,
            profit: p.profit, swap: p.swap || 0, time: p.time, comment: p.comment || "",
          })));
        }
      }
    } catch {
      setMt5Connected(false);
    }
  }, []);

  // === Background: poll multi-agent (HIDDEN — only alerts are surfaced) ===
  const fetchAgentAlerts = useCallback(async () => {
    try {
      const r = await fetch("/api/gold/multi-agent", { cache: "no-store" });
      const d = await r.json();
      if (d?.agents && d?.consensus) {
        // Convert agent decisions to alerts
        const newAlerts: AgentAlert[] = [];
        d.agents.forEach((a: any) => {
          if (a.status === "active" || a.status === "executed") {
            newAlerts.push({
              id: `${a.agentId}-${a.timestamp}`,
              timestamp: a.timestamp,
              agent: a.name,
              severity: a.status === "executed" ? "critical" : "info",
              message: a.commentary.slice(0, 200),
            });
          }
        });
        if (d.consensus.verdict !== "WAIT" && d.consensus.confidence > 50) {
          newAlerts.unshift({
            id: `consensus-${d.lastCycle}`,
            timestamp: d.lastCycle,
            agent: "Multi-Agent Consensus",
            severity: "warning",
            message: `Verdict: ${d.consensus.verdict} (${d.consensus.confidence}% confidence, ${d.consensus.agreement}% agreement). ${d.consensus.reasoning}`,
          });
        }
        setAlerts((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          const fresh = newAlerts.filter((a) => !seen.has(a.id));
          return [...fresh, ...prev].slice(0, 50);
        });
      }
    } catch (e) {}
  }, []);

  // === Fetch News Filter status ===
  const fetchNewsStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/gold/news-filter", { cache: "no-store" });
      const j = await r.json();
      setNewsStatus(j);
    } catch {}
    // Also fetch upcoming events
    try {
      const r2 = await fetch("/api/gold/news-events?upcoming=true", { cache: "no-store" });
      const j2 = await r2.json();
      if (Array.isArray(j2?.events)) setNewsEvents(j2.events);
    } catch {}
  }, []);

  // === Fetch Wyckoff analysis ===
  const fetchWyckoff = useCallback(async () => {
    try {
      const r = await fetch("/api/gold/wyckoff-strict?balance=1000", { cache: "no-store" });
      const j = await r.json();
      setWyckoffResult(j);
      // Add to alerts if phase found
      if (j?.phase && j.phase !== "Ranging" && j.phase !== "None") {
        const newAlert: AgentAlert = {
          id: `wyckoff-${j.timestamp}`,
          timestamp: j.timestamp,
          agent: "Wyckoff Method",
          severity: j.hasSetup ? "critical" : "warning",
          message: `مرحلة: ${j.phaseAr} | ${j.hasSetup ? `✓ صفقة ${j.trade?.type} @ $${j.trade?.entry?.toFixed(2)} | SL $${j.trade?.stopLoss?.toFixed(2)} | TP $${j.trade?.takeProfit1?.toFixed(2)}` : j.notSetupReason?.slice(0, 150)}`,
        };
        setAlerts((prev) => {
          if (prev.some((a) => a.id === newAlert.id)) return prev;
          return [newAlert, ...prev].slice(0, 50);
        });
      }
    } catch {}
  }, []);

  // === Run 1-year backtest ===
  const runBacktest = useCallback(async () => {
    setBacktestLoading(true);
    try {
      const r = await fetch("/api/gold/backtest", { cache: "no-store" });
      const j = await r.json();
      setBacktestResult(j);
    } catch (e) {}
    finally { setBacktestLoading(false); }
  }, []);

  // === Fetch TradingView signals (from hidden TV agent) ===
  const fetchTVSignals = useCallback(async () => {
    try {
      const r = await fetch("/api/gold/tv-signals", { cache: "no-store" });
      const d = await r.json();
      if (Array.isArray(d?.signals)) setTVSignals(d.signals);
      if (Array.isArray(d?.decisions)) setTVDecisions(d.decisions);
    } catch {}
  }, []);

  // === Initial fetch + intervals ===
  useEffect(() => {
    fetchMarket();
    fetchCandles(timeframe);
    fetchMT5Data();
    fetchAgentAlerts();
    fetchTVSignals();
    fetchNewsStatus();
    fetchWyckoff();

    const marketInterval = setInterval(fetchMarket, 3000);
    const mt5Interval = setInterval(fetchMT5Data, 15000);
    const agentInterval = setInterval(fetchAgentAlerts, 45000);
    const tvInterval = setInterval(fetchTVSignals, 10000);
    const newsInterval = setInterval(fetchNewsStatus, 60000);
    const wyckoffInterval = setInterval(fetchWyckoff, 45000);

    return () => {
      clearInterval(marketInterval);
      clearInterval(mt5Interval);
      clearInterval(agentInterval);
      clearInterval(tvInterval);
      clearInterval(newsInterval);
      clearInterval(wyckoffInterval);
    };
  }, [fetchMarket, fetchCandles, fetchMT5Data, fetchAgentAlerts, fetchTVSignals, fetchNewsStatus, fetchWyckoff, timeframe]);

  // === AUTO-DEMO: enable DEMO MODE when market is closed (price doesn't change) ===
  const lastPriceRef = useRef(0);
  const staleCountRef = useRef(0);
  useEffect(() => {
    if (!market?.price) return;
    if (demoMode) return; // already in demo mode
    if (lastPriceRef.current === market.price) {
      staleCountRef.current++;
      // If price hasn't changed for 5 consecutive fetches (~15s), auto-enable DEMO
      if (staleCountRef.current >= 5) {
        setDemoMode(true);
        demoCandlesRef.current = [...candles];
        staleCountRef.current = 0;
      }
    } else {
      lastPriceRef.current = market.price;
      staleCountRef.current = 0;
    }
  }, [market?.timestamp, demoMode, candles]);

  // === DEMO MODE ENGINE: simulate live price ticks + candle updates ===
  useEffect(() => {
    if (!demoMode) {
      demoCandlesRef.current = []; // reset
      return;
    }
    // Use latest candles from real fetch + start with last close
    if (candles.length === 0 && !market) return;
    const basePrice = market?.price || (candles.at(-1)?.close ?? 4181);
    if (demoCandlesRef.current.length === 0) {
      // Seed with real candles
      demoCandlesRef.current = [...candles];
      setDemoPrice(basePrice);
    }

    const speedMs = demoSpeed === "slow" ? 1500 : demoSpeed === "fast" ? 300 : 700;
    const volatility = demoSpeed === "slow" ? 0.0006 : demoSpeed === "fast" ? 0.002 : 0.001; // 0.06%, 0.20%, 0.10%
    const tickInterval = setInterval(() => {
      setDemoPrice((prev) => {
        const cur = prev || basePrice;
        // Random walk with Gaussian-ish distribution
        const drift = (Math.random() - 0.5) * 2 * cur * volatility;
        // Small mean-reversion to basePrice (10% pull)
        const reversion = (basePrice - cur) * 0.02;
        const newPrice = cur + drift + reversion;
        // Update last candle in demoCandlesRef
        const demoArr = demoCandlesRef.current;
        if (demoArr.length > 0) {
          const last = { ...demoArr[demoArr.length - 1] };
          last.close = newPrice;
          last.high = Math.max(last.high, newPrice);
          last.low = Math.min(last.low, newPrice);
          last.volume += Math.floor(Math.random() * 50);
          demoArr[demoArr.length - 1] = last;
          // Update chart with new candle
          if (mainRef.current) {
            try {
              mainRef.current.update({
                time: last.time as any,
                open: last.open,
                high: last.high,
                low: last.low,
                close: last.close,
              });
            } catch {}
          }
        }
        return newPrice;
      });
    }, speedMs);

    // Generate new candle every 15s (in normal speed; faster in fast mode)
    const candleInterval = setInterval(() => {
      const demoArr = demoCandlesRef.current;
      if (demoArr.length === 0) return;
      const last = demoArr[demoArr.length - 1];
      const newCandle: CandleData = {
        time: last.time + 900, // 15m = 900s
        open: last.close,
        high: last.close,
        low: last.close,
        close: last.close,
        volume: 100 + Math.floor(Math.random() * 500),
      };
      demoArr.push(newCandle);
      if (demoArr.length > 250) demoArr.shift(); // keep last 250
      // Add new candle to chart
      if (mainRef.current) {
        try {
          mainRef.current.update({
            time: newCandle.time as any,
            open: newCandle.open,
            high: newCandle.high,
            low: newCandle.low,
            close: newCandle.close,
          });
          // Scroll to show latest
          chartRef.current?.timeScale().scrollToRealTime();
        } catch {}
      }
    }, demoSpeed === "fast" ? 5000 : 15000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(candleInterval);
    };
  }, [demoMode, demoSpeed, candles.length, market?.price]);

  // === Create chart when candles arrive ===
  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;
    if (chartRef.current) return; // already created

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: COLORS.chartBg },
        textColor: COLORS.textMuted,
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.3)", labelBackgroundColor: COLORS.accent },
        horzLine: { color: "rgba(255,255,255,0.3)", labelBackgroundColor: COLORS.accent },
      },
      rightPriceScale: {
        borderColor: COLORS.border,
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;
    mainRef.current = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      borderVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      mainRef.current = null;
    };
  }, [candles.length > 0]);

  // === Update chart data ===
  useEffect(() => {
    if (!mainRef.current || candles.length === 0) return;
    const data = candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    mainRef.current.setData(data);
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from: Math.max(0, candles.length - 80),
      to: candles.length + 2,
    });
    prevCandlesRef.current = candles;
  }, [candles]);

  // === Update last candle with live price ===
  useEffect(() => {
    if (!mainRef.current || !market || candles.length === 0) return;
    const last = candles[candles.length - 1];
    const updatedCandle = {
      time: last.time as any,
      open: last.open,
      high: Math.max(last.high, market.price),
      low: Math.min(last.low, market.price),
      close: market.price,
    };
    try { mainRef.current.update(updatedCandle); } catch {}
  }, [market?.price, candles]);

  // === Bid/Ask price lines on chart ===
  useEffect(() => {
    if (!mainRef.current || !market) return;
    // Remove old lines (lightweight-charts handles this internally)
    // Add bid/ask lines
    try {
      mainRef.current.applyOptions({
        priceLineVisible: true,
      });
    } catch {}
  }, [market?.bid, market?.ask]);

  const totalPL = positions.reduce((s, p) => s + p.profit, 0);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden select-none"
      style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Segoe UI', Tahoma, sans-serif", fontSize: 12 }}
    >
      {/* === TITLE BAR === */}
      <div
        className="flex items-center justify-between px-2 h-7 flex-shrink-0"
        style={{ background: COLORS.titleBar, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm flex items-center justify-center" style={{ background: "#007acc" }}>
            <span className="text-[10px] font-bold text-white">M</span>
          </div>
          <span className="text-[11px] font-semibold" style={{ color: COLORS.textBright }}>
            MetaTrader 5 — M.ROBOT Terminal
          </span>
          <span className="text-[10px] ml-2" style={{ color: COLORS.textMuted }}>
            — {SYMBOL} • {SYMBOL_DESC}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-[#3c3c3c] rounded">
            <Minus className="w-3 h-3" />
          </button>
          <button className="p-1 hover:bg-[#3c3c3c] rounded">
            <Square className="w-3 h-3" />
          </button>
          <button className="p-1 hover:bg-[#ff4d4d] rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* === MENU BAR === */}
      <div
        className="flex items-center px-2 h-6 flex-shrink-0 text-[11px]"
        style={{ background: COLORS.menuBar, borderBottom: `1px solid ${COLORS.border}` }}
      >
        {["File", "View", "Insert", "Charts", "Tools", "Window", "Help"].map((m) => (
          <button
            key={m}
            className="px-2 py-0.5 hover:bg-[#3c3c3c] rounded"
            style={{ color: COLORS.text }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* === TOOLBAR === */}
      <div
        className="flex items-center px-2 h-8 gap-1 flex-shrink-0"
        style={{ background: COLORS.toolbar, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <button className="p-1.5 hover:bg-[#3c3c3c] rounded" title="New Chart">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button className="p-1.5 hover:bg-[#3c3c3c] rounded" title="Open">
          <FileText className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 mx-1" style={{ background: COLORS.border }} />
        {/* === NEWS FILTER badge === */}
        {newsStatus && (
          <button
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold"
            style={{
              background: newsStatus.isBlocked ? `${COLORS.bid}20` : `${COLORS.ask}20`,
              color: newsStatus.isBlocked ? COLORS.bid : COLORS.ask,
              border: `1px solid ${newsStatus.isBlocked ? COLORS.bid : COLORS.ask}40`,
            }}
            title={newsStatus.reason}
          >
            <Bell className="w-3 h-3" />
            {newsStatus.isBlocked ? "NEWS BLOCK" : "NEWS OK"}
          </button>
        )}
        <div className="w-px h-4 mx-1" style={{ background: COLORS.border }} />
        <button
          onClick={() => {
            const next = !demoMode;
            setDemoMode(next);
            if (next) {
              // Initialize demo candles from current candles
              demoCandlesRef.current = [...candles];
            } else {
              demoCandlesRef.current = [];
            }
          }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition"
          style={{
            background: demoMode ? `${COLORS.warning}20` : COLORS.panelHeader,
            color: demoMode ? COLORS.warning : COLORS.textMuted,
            border: `1px solid ${demoMode ? COLORS.warning : COLORS.border}40`,
          }}
          title="Demo Mode: simulate live price movement for testing"
        >
          <Activity className={`w-3 h-3 ${demoMode ? "animate-pulse" : ""}`} />
          {demoMode ? "DEMO ON" : "DEMO"}
        </button>
        {/* === DEMO SPEED SELECTOR === */}
        {demoMode && (
          <select
            value={demoSpeed}
            onChange={(e) => setDemoSpeed(e.target.value as any)}
            className="text-[9px] px-1 py-0.5 rounded"
            style={{
              background: COLORS.panelHeader,
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        )}
        <div className="w-px h-4 mx-1" style={{ background: COLORS.border }} />
        <button
          className="p-1.5 hover:bg-[#3c3c3c] rounded flex items-center gap-1.5"
          title={mt5Connected ? `MT5 Bridge: ${account?.server ?? "Connected"}` : market ? `Live data via XAUUSD — MT5 Bridge not configured` : "Disconnected"}
        >
          {market ? (
            <Wifi className="w-3.5 h-3.5" style={{ color: mt5Connected ? COLORS.ask : COLORS.warning }} />
          ) : (
            <WifiOff className="w-3.5 h-3.5" style={{ color: COLORS.bid }} />
          )}
          {/* Show LIVE badge when data is flowing */}
          {market && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{
                background: mt5Connected ? `${COLORS.ask}20` : `${COLORS.warning}20`,
                color: mt5Connected ? COLORS.ask : COLORS.warning,
                border: `1px solid ${mt5Connected ? `${COLORS.ask}40` : `${COLORS.warning}40`}`,
              }}
            >
              {mt5Connected ? "MT5 LIVE" : "LIVE"}
            </span>
          )}
        </button>
        <div className="w-px h-4 mx-1" style={{ background: COLORS.border }} />
        <button
          className="px-2 py-1 rounded text-[11px] font-semibold hover:bg-[#3c3c3c]"
          style={{ color: COLORS.text }}
          onClick={() => setShowOrderDialog(true)}
          title="New Order (F9)"
        >
          New Order
        </button>
        <div className="w-px h-4 mx-1" style={{ background: COLORS.border }} />
        <button className="p-1.5 hover:bg-[#3c3c3c] rounded" title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <div className="ml-auto flex items-center gap-2 text-[10px]" style={{ color: COLORS.textMuted }}>
          <span>Server Time: {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        </div>
      </div>

      {/* === TIMEFRAME BAR === */}
      <div
        className="flex items-center px-2 h-7 gap-0.5 flex-shrink-0"
        style={{ background: COLORS.toolbar, borderBottom: `1px solid ${COLORS.border}` }}
      >
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className="px-2 py-0.5 rounded text-[11px] font-semibold transition"
            style={{
              background: timeframe === tf ? COLORS.accent : "transparent",
              color: timeframe === tf ? "#fff" : COLORS.text,
            }}
          >
            {tf}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-[10px]" style={{ color: COLORS.textMuted }}>
          <span>{SYMBOL}</span>
          <span>•</span>
          <span>Bar mode: Candlesticks</span>
          <span>•</span>
          <span>Scale: Auto</span>
          {/* === Chart Source Switcher: MT5 / TradingView === */}
          <div className="flex items-center gap-0.5 ml-2 p-0.5 rounded" style={{ background: COLORS.panelHeader }}>
            <button
              onClick={() => setChartSource("mt5")}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition"
              style={{
                background: chartSource === "mt5" ? COLORS.accent : "transparent",
                color: chartSource === "mt5" ? "#fff" : COLORS.textMuted,
              }}
              title="Use M.ROBOT native chart"
            >
              MT5
            </button>
            <button
              onClick={() => setChartSource("tradingview")}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition flex items-center gap-1"
              style={{
                background: chartSource === "tradingview" ? COLORS.accent : "transparent",
                color: chartSource === "tradingview" ? "#fff" : COLORS.textMuted,
              }}
              title="Use TradingView Advanced Chart widget (with all TV indicators + strategies)"
            >
              <Tv className="w-2.5 h-2.5" />
              TradingView
            </button>
          </div>
        </div>
      </div>

      {/* === MAIN GRID: Sidebar + Chart === */}
      <div className="flex flex-1 overflow-hidden">
        {/* === LEFT SIDEBAR: Market Watch + Navigator === */}
        <div className="flex flex-col w-56 flex-shrink-0" style={{ background: COLORS.panelBg, borderRight: `1px solid ${COLORS.border}` }}>
          {/* Market Watch */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div
              className="flex items-center justify-between px-2 h-5 text-[11px] font-semibold cursor-pointer"
              style={{ background: COLORS.panelHeader, borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textBright }}
            >
              <span>Market Watch</span>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr style={{ background: COLORS.panelHeader, color: COLORS.textMuted }}>
                    <th className="text-left px-2 py-1 font-medium">Symbol</th>
                    <th className="text-right px-2 py-1 font-medium">Bid</th>
                    <th className="text-right px-2 py-1 font-medium">Ask</th>
                    <th className="text-right px-2 py-1 font-medium">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {MARKET_WATCH_SYMBOLS.map((s) => {
                    const isActive = s.name === SYMBOL;
                    const bid = s.name === SYMBOL ? market?.bid ?? 0 : s.bid;
                    const ask = s.name === SYMBOL ? market?.ask ?? 0 : s.ask;
                    const change = s.name === SYMBOL ? market?.change ?? 0 : s.change;
                    const isUp = change >= 0;
                    return (
                      <tr
                        key={s.name}
                        className="cursor-pointer hover:bg-[#3c3c3c]"
                        style={{
                          background: isActive ? `${COLORS.accent}30` : "transparent",
                          color: isActive ? COLORS.textBright : COLORS.text,
                        }}
                      >
                        <td className="px-2 py-1">
                          <div style={{ fontWeight: isActive ? 600 : 400 }}>{s.name}</div>
                          <div className="text-[8px]" style={{ color: COLORS.textDim }}>{s.desc}</div>
                        </td>
                        <td className="text-right px-2 py-1 tabular-nums ltr-nums" style={{ color: COLORS.bid }}>
                          {bid ? bid.toFixed(s.name.includes("JPY") ? 3 : 2) : "—"}
                        </td>
                        <td className="text-right px-2 py-1 tabular-nums ltr-nums" style={{ color: COLORS.ask }}>
                          {ask ? ask.toFixed(s.name.includes("JPY") ? 3 : 2) : "—"}
                        </td>
                        <td className="text-right px-2 py-1 tabular-nums ltr-nums text-[9px]" style={{ color: isUp ? COLORS.ask : COLORS.bid }}>
                          {change !== 0 ? (isUp ? "+" : "") + change.toFixed(2) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigator */}
          <div className="flex flex-col" style={{ borderTop: `1px solid ${COLORS.border}`, height: "40%" }}>
            <div
              className="flex items-center justify-between px-2 h-5 text-[11px] font-semibold cursor-pointer"
              style={{ background: COLORS.panelHeader, borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textBright }}
            >
              <span>Navigator</span>
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="flex-1 overflow-y-auto p-1 text-[11px]">
              <NavSection title="Accounts">
                <NavItem
                  text={account ? `#${account.login} (${account.server})` : "No account connected"}
                  color={account ? COLORS.ask : COLORS.bid}
                  active={true}
                />
              </NavSection>
              <NavSection title="Indicators">
                <NavItem text="Moving Average" />
                <NavItem text="Bollinger Bands" />
                <NavItem text="RSI" />
                <NavItem text="MACD" />
                <NavItem text="ATR" />
              </NavSection>
              <NavSection title="Expert Advisors">
                <NavItem text="M.ROBOT Multi-Agent" color={COLORS.accent} active={true} />
                <NavItem text="SMC Strict Scanner" color={COLORS.accent} />
                <NavItem text="ICT Liquidity Hunter" color={COLORS.accent} />
              </NavSection>
              <NavSection title="Scripts">
                <NavItem text="One-Click Trading" />
                <NavItem text="Close All Positions" />
              </NavSection>
            </div>
          </div>
        </div>

        {/* === CENTER: Chart === */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {chartSource === "tradingview" ? (
            /* === TradingView Advanced Chart Widget === */
            <div className="relative flex-1" style={{ background: COLORS.chartBg }}>
              <iframe
                key={SYMBOL + timeframe}
                src={`https://s3.tradingview.com/tv.js?v=20261018&symbol=${encodeURIComponent(SYMBOL)}&interval=${TF_MAP[timeframe] || "15"}&theme=dark&style=1&hide_side_toolbar=false&details=false&hotlist=false&calendar=false&studies=[]`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="TradingView Chart"
              />
            </div>
          ) : (
            /* === Native M.ROBOT Chart === */
            <div className="relative flex-1" ref={containerRef} style={{ background: COLORS.chartBg }}>
              {/* === DEMO MODE badge (prominent) === */}
              {demoMode && (
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5"
                  style={{
                    background: `${COLORS.warning}20`,
                    color: COLORS.warning,
                    border: `1px solid ${COLORS.warning}60`,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Activity className="w-3 h-3 animate-pulse" />
                  ● DEMO MODE — Live Simulation
                  <span className="text-[8px]" style={{ color: COLORS.textMuted }}>({demoSpeed})</span>
                </div>
              )}
              {/* Chart overlay info */}
              {market && (
                <div className="absolute top-2 left-2 z-10 text-[10px] space-y-0.5" style={{ color: COLORS.text }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: COLORS.textBright, fontWeight: 700 }}>{SYMBOL}</span>
                    <span style={{ color: COLORS.textMuted }}>{timeframe}</span>
                    {demoMode && demoPrice > 0 && (
                      <span style={{ color: COLORS.warning, fontWeight: 700 }}>(simulated)</span>
                    )}
                  </div>
                  <div>
                    O: {(demoMode && demoCandlesRef.current.at(-1)?.open) ? demoCandlesRef.current.at(-1)!.open.toFixed(2) : market.open.toFixed(2)}
                    {" "}H: {(demoMode && demoCandlesRef.current.at(-1)?.high) ? demoCandlesRef.current.at(-1)!.high.toFixed(2) : market.high.toFixed(2)}
                    {" "}L: {(demoMode && demoCandlesRef.current.at(-1)?.low) ? demoCandlesRef.current.at(-1)!.low.toFixed(2) : market.low.toFixed(2)}
                    {" "}C: <span style={{ color: demoMode && demoPrice > 0 ? (demoPrice >= market.open ? COLORS.ask : COLORS.bid) : (market.change >= 0 ? COLORS.ask : COLORS.bid), fontWeight: 600 }}>
                      {demoMode && demoPrice > 0 ? demoPrice.toFixed(2) : market.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {/* Bid/Ask overlay */}
              {market && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-2 text-[11px]">
                  <div className="px-2 py-0.5 rounded-l" style={{ background: COLORS.bid, color: "#fff" }}>
                    {demoMode && demoPrice > 0 ? (demoPrice - 0.15).toFixed(2) : market.bid.toFixed(2)}
                  </div>
                  <div className="px-2 py-0.5 rounded-r" style={{ background: COLORS.ask, color: "#fff" }}>
                    {demoMode && demoPrice > 0 ? (demoPrice + 0.15).toFixed(2) : market.ask.toFixed(2)}
                  </div>
                </div>
              )}
              {/* No data state */}
              {candles.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-[11px]" style={{ color: COLORS.textMuted }}>
                  Waiting for market data...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* === BOTTOM: TOOLBOX === */}
      <div className="flex flex-col flex-shrink-0" style={{ background: COLORS.toolboxBg, borderTop: `1px solid ${COLORS.border}`, height: 200 }}>
        {/* Tabs */}
        <div className="flex items-center" style={{ background: COLORS.panelHeader, borderBottom: `1px solid ${COLORS.border}` }}>
          {[
            { id: "trade", label: "Trade", icon: TrendingUp },
            { id: "history", label: "History", icon: Clock },
            { id: "alerts", label: "Alerts", icon: Bell },
            { id: "tv_signals", label: "TV Signals", icon: Tv },
            { id: "backtest", label: "Backtest", icon: BarChart3 },
            { id: "news", label: "Calendar", icon: Bell },
            { id: "terminal", label: "Terminal", icon: Activity },
          ].map((t) => {
            const active = activeToolboxTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveToolboxTab(t.id as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-r transition"
                style={{
                  background: active ? COLORS.toolboxBg : "transparent",
                  color: active ? COLORS.textBright : COLORS.textMuted,
                  borderBottom: active ? `2px solid ${COLORS.accent}` : "none",
                  borderColor: COLORS.border,
                }}
              >
                <Icon className="w-3 h-3" />
                {t.label}
                {t.id === "alerts" && alerts.length > 0 && (
                  <span
                    className="ml-1 px-1 py-0.5 rounded-full text-[8px] font-bold"
                    style={{ background: COLORS.bid, color: "#fff" }}
                  >
                    {alerts.length}
                  </span>
                )}
                {t.id === "tv_signals" && tvSignals.length > 0 && (
                  <span
                    className="ml-1 px-1 py-0.5 rounded-full text-[8px] font-bold"
                    style={{ background: COLORS.accent, color: "#fff" }}
                  >
                    {tvSignals.length}
                  </span>
                )}
              </button>
            );
          })}
          <div className="ml-auto pr-2 text-[10px]" style={{ color: COLORS.textMuted }}>
            Spread: {market ? (market.ask - market.bid).toFixed(2) : "—"}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeToolboxTab === "trade" && (
            <TradeTab positions={positions} account={account} totalPL={totalPL} />
          )}
          {activeToolboxTab === "history" && <HistoryTab />}
          {activeToolboxTab === "alerts" && <AlertsTab alerts={alerts} />}
          {activeToolboxTab === "tv_signals" && <TVSignalsTab signals={tvSignals} decisions={tvDecisions} />}
          {activeToolboxTab === "backtest" && (
            <div className="p-4 text-center" style={{ color: COLORS.textMuted }}>
              <BarChart3 style={{ width: 32, height: 32, color: COLORS.accent, margin: "0 auto 8px" }} />
              <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>1-Year Backtest — MT5 Strategy Tester</div>
              <div style={{ fontSize: 10, marginBottom: 12 }}>
                {backtestResult ? `Last: ${backtestResult.stats.totalTrades} trades, ${backtestResult.stats.winRate}% win, PF ${backtestResult.stats.profitFactor}` : "Click below to open full-screen Strategy Tester"}
              </div>
              <button
                onClick={() => { setShowBacktestModal(true); if (!backtestResult) runBacktest(); }}
                className="px-6 py-2 rounded text-[12px] font-bold"
                style={{ background: COLORS.accent, color: "#fff" }}
              >
                {backtestResult ? "Open Strategy Tester" : "▶ Run 1-Year Backtest"}
              </button>
            </div>
          )}
          {activeToolboxTab === "news" && (
            <div className="overflow-y-auto" style={{ maxHeight: "100%" }}>
              {/* Status banner */}
              {newsStatus && (
                <div
                  className="flex items-center gap-2 px-3 py-2 border-b"
                  style={{
                    background: newsStatus.isBlocked ? `${COLORS.bid}15` : `${COLORS.ask}10`,
                    borderColor: COLORS.border,
                  }}
                >
                  <Bell
                    className={`w-4 h-4 ${newsStatus.isBlocked ? "animate-pulse" : ""}`}
                    style={{ color: newsStatus.isBlocked ? COLORS.bid : COLORS.ask }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: newsStatus.isBlocked ? COLORS.bid : COLORS.ask }}>
                    {newsStatus.isBlocked ? "⛔ تداول موقوف" : "✅ تداول مفتوح"}
                  </span>
                  <span style={{ fontSize: 10, color: COLORS.textMuted, marginLeft: "auto" }}>
                    {newsStatus.reason}
                  </span>
                </div>
              )}
              {/* Calendar table */}
              <table className="w-full text-[10px]">
                <thead style={{ position: "sticky", top: 0, background: COLORS.panelHeader }}>
                  <tr style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}>
                    <th className="text-left px-2 py-1">Time</th>
                    <th className="text-center px-2 py-1">Cur</th>
                    <th className="text-left px-2 py-1">Event</th>
                    <th className="text-center px-2 py-1">Impact</th>
                    <th className="text-right px-2 py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {newsEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: COLORS.textMuted }}>
                        No upcoming high-impact events in the next 7 days.
                      </td>
                    </tr>
                  ) : (
                    newsEvents.map((e: any, i: number) => {
                      const now = Math.floor(Date.now() / 1000);
                      const diff = e.timestamp - now;
                      const isUpcoming = diff > 0;
                      const minutesUntil = Math.floor(diff / 60);
                      const isBlocked = isUpcoming && minutesUntil <= 10;
                      const isRecent = !isUpcoming && Math.abs(diff) <= 600;
                      return (
                        <tr key={i} style={{
                          borderBottom: `1px solid ${COLORS.border}`,
                          background: isBlocked ? `${COLORS.bid}10` : isRecent ? `${COLORS.bid}08` : "transparent",
                        }}>
                          <td className="px-2 py-1.5" style={{ color: COLORS.textMuted }}>
                            {new Date(e.timestamp * 1000).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="text-center px-2 py-1.5">
                            <span style={{
                              display: "inline-block",
                              padding: "1px 5px",
                              borderRadius: 3,
                              fontSize: 9,
                              fontWeight: 700,
                              background: e.currency === "USD" ? "#2a5d8a" : e.currency === "EUR" ? "#3a5d3a" : e.currency === "GBP" ? "#5d3a5d" : "#4a4a4a",
                              color: "#fff",
                            }}>
                              {e.currency}
                            </span>
                          </td>
                          <td className="px-2 py-1.5" style={{ color: COLORS.text }}>
                            {e.title}
                          </td>
                          <td className="text-center px-2 py-1.5">
                            <span style={{ color: COLORS.bid, fontSize: 14 }}>●</span>
                            <span style={{ fontSize: 8, color: COLORS.textDim, marginLeft: 2 }}>High</span>
                          </td>
                          <td className="text-right px-2 py-1.5">
                            {isBlocked ? (
                              <span style={{ color: COLORS.bid, fontWeight: 700, fontSize: 9 }}>⛔ BLOCKED</span>
                            ) : isRecent ? (
                              <span style={{ color: COLORS.warning, fontSize: 9 }}>just passed</span>
                            ) : isUpcoming ? (
                              <span style={{ color: COLORS.textMuted, fontSize: 9 }}>
                                {minutesUntil > 1440
                                  ? `${Math.floor(minutesUntil / 1440)}d ${Math.floor((minutesUntil % 1440) / 60)}h`
                                  : minutesUntil > 60
                                    ? `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`
                                    : `${minutesUntil}m`}
                              </span>
                            ) : (
                              <span style={{ color: COLORS.textDim, fontSize: 9 }}>past</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeToolboxTab === "terminal" && <TerminalTab mt5Connected={mt5Connected} account={account} market={market} wyckoff={wyckoffResult} />}
        </div>
      </div>

      {/* === BACKTEST MODAL (Full-screen MT5 Strategy Tester) === */}
      <BacktestModal
        open={showBacktestModal}
        onClose={() => setShowBacktestModal(false)}
        result={backtestResult}
        loading={backtestLoading}
        onRun={runBacktest}
      />

      {/* === STATUS BAR === */}
      <div
        className="flex items-center justify-between px-2 h-5 text-[10px] flex-shrink-0"
        style={{ background: COLORS.statusBar, borderTop: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                background: market ? (mt5Connected ? COLORS.ask : COLORS.warning) : COLORS.bid,
              }}
            />
            <span style={{ color: market ? (mt5Connected ? COLORS.ask : COLORS.warning) : COLORS.bid, fontWeight: 600 }}>
              {market ? (mt5Connected ? "● CONNECTED" : "● LIVE") : "● DISCONNECTED"}
            </span>
            <span className="ml-1 text-[9px]" style={{ color: COLORS.textMuted }}>
              {mt5Connected && account ? `MT5: ${account.server}` : market ? `Source: ${market.source}` : "No data"}
            </span>
          </span>
          <span>•</span>
          <span>Symbol: <span style={{ color: COLORS.textBright, fontWeight: 600 }}>{SYMBOL}</span></span>
          <span>•</span>
          <span>Price: <span style={{ color: market ? (demoMode && demoPrice > 0 ? (demoPrice >= market.open ? COLORS.ask : COLORS.bid) : (market.change >= 0 ? COLORS.ask : COLORS.bid)) : COLORS.textMuted, fontWeight: 600 }}>${(demoMode && demoPrice > 0) ? demoPrice.toFixed(2) : (market ? market.price.toFixed(2) : "—")}</span></span>
          <span>•</span>
          <span>Balance: {account ? `$${account.balance.toFixed(2)}` : "$1,000.00"}</span>
          <span>•</span>
          <span>P/L: <span style={{ color: totalPL >= 0 ? COLORS.ask : COLORS.bid, fontWeight: 600 }}>{totalPL >= 0 ? "+" : ""}{totalPL.toFixed(2)}</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: COLORS.accent }}>EA: M.ROBOT Multi-Agent (running)</span>
          <span>•</span>
          <span>TV Webhook: <span style={{ color: COLORS.ask }}>active</span></span>
          {newsStatus && (
            <>
              <span>•</span>
              <span style={{ color: newsStatus.isBlocked ? COLORS.bid : COLORS.ask, fontWeight: 600 }}>
                {newsStatus.isBlocked ? "⛔ NEWS BLOCK" : "✅ NEWS OK"}
              </span>
              {newsStatus.nextEvent && (
                <span style={{ color: COLORS.textDim, fontSize: 9 }}>
                  next: {newsStatus.nextEvent.title} ({newsStatus.nextEvent.currency}) {newsStatus.nextEventIn}د
                </span>
              )}
            </>
          )}
          {demoMode && (
            <>
              <span>•</span>
              <span style={{ color: COLORS.warning, fontWeight: 700 }}>● DEMO MODE</span>
            </>
          )}
          <span>•</span>
          <span className="tabular-nums ltr-nums">{new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })}</span>
        </div>
      </div>
    </div>
  );
}

// === Sub-components ===
function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <div
        className="flex items-center gap-1 px-1 py-0.5 cursor-pointer hover:bg-[#3c3c3c]"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="font-semibold" style={{ color: COLORS.text }}>{title}</span>
      </div>
      {open && <div className="ml-3">{children}</div>}
    </div>
  );
}

function NavItem({ text, color, active }: { text: string; color?: string; active?: boolean }) {
  return (
    <div
      className="flex items-center gap-1 px-1 py-0.5 cursor-pointer hover:bg-[#3c3c3c] text-[10px]"
      style={{ color: active ? (color ?? COLORS.text) : COLORS.text, fontWeight: active ? 600 : 400 }}
    >
      <ChevronRight className="w-2.5 h-2.5 opacity-0" />
      <span>{text}</span>
    </div>
  );
}

function TradeTab({ positions, account, totalPL }: { positions: MTPosition[]; account: MTAccount | null; totalPL: number }) {
  if (!account) {
    return (
      <div className="p-4 text-center text-[11px]" style={{ color: COLORS.textMuted }}>
        No account connected. Connect MT5 Bridge to view live positions.
        <br />
        <span className="text-[10px]">Background: M.ROBOT Multi-Agent EA is running in scan mode.</span>
      </div>
    );
  }
  if (positions.length === 0) {
    return (
      <div className="p-4 text-center text-[11px]" style={{ color: COLORS.textMuted }}>
        No open positions.
        <br />
        <span className="text-[10px]">EA: 6 agents scanning market for A+ setups.</span>
      </div>
    );
  }
  return (
    <table className="w-full text-[10px]">
      <thead>
        <tr style={{ background: COLORS.panelHeader, color: COLORS.textMuted }}>
          <th className="text-left px-2 py-1">Ticket</th>
          <th className="text-left px-2 py-1">Time</th>
          <th className="text-left px-2 py-1">Symbol</th>
          <th className="text-left px-2 py-1">Type</th>
          <th className="text-right px-2 py-1">Volume</th>
          <th className="text-right px-2 py-1">Open Price</th>
          <th className="text-right px-2 py-1">Current</th>
          <th className="text-right px-2 py-1">S/L</th>
          <th className="text-right px-2 py-1">T/P</th>
          <th className="text-right px-2 py-1">Profit</th>
        </tr>
      </thead>
      <tbody>
        {positions.map((p) => (
          <tr key={p.ticket} className="hover:bg-[#3c3c3c]">
            <td className="px-2 py-1 tabular-nums ltr-nums">{p.ticket}</td>
            <td className="px-2 py-1">{new Date(p.time * 1000).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
            <td className="px-2 py-1 font-semibold">{p.symbol}</td>
            <td className="px-2 py-1" style={{ color: p.type === "BUY" ? COLORS.ask : COLORS.bid, fontWeight: 600 }}>
              {p.type === "BUY" ? "buy" : "sell"}
            </td>
            <td className="text-right px-2 py-1 tabular-nums ltr-nums">{p.volume.toFixed(2)}</td>
            <td className="text-right px-2 py-1 tabular-nums ltr-nums">{p.priceOpen.toFixed(2)}</td>
            <td className="text-right px-2 py-1 tabular-nums ltr-nums">{p.priceCurrent.toFixed(2)}</td>
            <td className="text-right px-2 py-1 tabular-nums ltr-nums">{p.sl > 0 ? p.sl.toFixed(2) : "—"}</td>
            <td className="text-right px-2 py-1 tabular-nums ltr-nums">{p.tp > 0 ? p.tp.toFixed(2) : "—"}</td>
            <td className="text-right px-2 py-1 tabular-nums ltr-nums font-semibold" style={{ color: p.profit >= 0 ? COLORS.ask : COLORS.bid }}>
              {p.profit >= 0 ? "+" : ""}{p.profit.toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: COLORS.panelHeader }}>
          <td colSpan={9} className="px-2 py-1 text-right font-semibold">Total P/L:</td>
          <td className="text-right px-2 py-1 tabular-nums ltr-nums font-bold" style={{ color: totalPL >= 0 ? COLORS.ask : COLORS.bid }}>
            {totalPL >= 0 ? "+" : ""}{totalPL.toFixed(2)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function HistoryTab() {
  return (
    <div className="p-4 text-center text-[11px]" style={{ color: COLORS.textMuted }}>
      No trade history yet. Closed trades will appear here.
    </div>
  );
}

function AlertsTab({ alerts }: { alerts: AgentAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="p-4 text-center text-[11px]" style={{ color: COLORS.textMuted }}>
        No alerts. Background agents are scanning...
      </div>
    );
  }
  return (
    <table className="w-full text-[10px]">
      <thead>
        <tr style={{ background: COLORS.panelHeader, color: COLORS.textMuted }}>
          <th className="text-left px-2 py-1">Time</th>
          <th className="text-left px-2 py-1">Source</th>
          <th className="text-left px-2 py-1">Severity</th>
          <th className="text-left px-2 py-1">Message</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map((a) => (
          <tr key={a.id} className="hover:bg-[#3c3c3c]">
            <td className="px-2 py-1 tabular-nums ltr-nums text-[9px]" style={{ color: COLORS.textMuted }}>
              {new Date(a.timestamp).toLocaleTimeString("en-GB")}
            </td>
            <td className="px-2 py-1 font-semibold" style={{ color: COLORS.accent }}>{a.agent}</td>
            <td className="px-2 py-1">
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{
                  background: a.severity === "critical" ? `${COLORS.bid}20` : a.severity === "warning" ? `${COLORS.warning}20` : `${COLORS.accent}20`,
                  color: a.severity === "critical" ? COLORS.bid : a.severity === "warning" ? COLORS.warning : COLORS.accent,
                }}
              >
                {a.severity.toUpperCase()}
              </span>
            </td>
            <td className="px-2 py-1">{a.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TerminalTab({ mt5Connected, account, market, wyckoff }: { mt5Connected: boolean; account: MTAccount | null; market: MarketData | null; wyckoff?: any }) {
  return (
    <div className="p-2 font-mono text-[10px] space-y-0.5" style={{ color: COLORS.text, fontFamily: "'Consolas', monospace" }}>
      <div style={{ color: COLORS.ask }}>[OK] M.ROBOT Multi-Agent EA initialized</div>
      <div style={{ color: COLORS.textMuted }}>[{new Date().toLocaleTimeString("en-GB")}] 6 agents online: Analyst, Strategist, Risk, AI, Execution, Performance</div>
      <div style={{ color: COLORS.textMuted }}>[{new Date().toLocaleTimeString("en-GB")}] Strategy 1: SMC/ICT Strict (5 conditions)</div>
      <div style={{ color: COLORS.textMuted }}>[{new Date().toLocaleTimeString("en-GB")}] Strategy 2: Wyckoff Method (Accumulation/Distribution)</div>
      <div style={{ color: COLORS.textMuted }}>[{new Date().toLocaleTimeString("en-GB")}] Risk: 0.5-1.5% per trade ($5-15), R:R 1:1.3-3, Lot: 0.01 per $1000, max 5 daily</div>
      <div style={{ color: COLORS.accent }}>[OK] TradingView Webhook listener ready</div>
      <div style={{ color: COLORS.textMuted }}>[{new Date().toLocaleTimeString("en-GB")}] Webhook URL: /api/gold/tradingview-webhook</div>
      <div style={{ color: COLORS.textMuted }}>[{new Date().toLocaleTimeString("en-GB")}] Hidden TV Monitor: scans incoming TV signals + combines with SMC consensus</div>
      <div style={{ color: COLORS.textMuted }}>[{new Date().toLocaleTimeString("en-GB")}] News Filter: 15min before / 60min after high-impact news</div>
      <div style={{ color: mt5Connected ? COLORS.ask : COLORS.warning }}>
        [{new Date().toLocaleTimeString("en-GB")}] MT5 Bridge: {mt5Connected ? "CONNECTED" : "OFFLINE (using Yahoo GC=F)"}
      </div>
      {market && (
        <div style={{ color: COLORS.textMuted }}>
          [{new Date().toLocaleTimeString("en-GB")}] {SYMBOL}: bid={market.bid.toFixed(2)} ask={market.ask.toFixed(2)} src={market.source}
        </div>
      )}
      {wyckoff && (
        <>
          <div style={{ color: COLORS.textMuted }}>─────────────────────────────────────────</div>
          <div style={{ color: wyckoff.hasSetup ? COLORS.ask : COLORS.warning }}>
            [{new Date().toLocaleTimeString("en-GB")}] Wyckoff: Phase={wyckoff.phase} ({wyckoff.phaseAr}) | Price=${wyckoff.currentPrice?.toFixed(2)}
          </div>
          {wyckoff.hasSetup && wyckoff.trade ? (
            <div style={{ color: COLORS.ask }}>
              [{new Date().toLocaleTimeString("en-GB")}] ✓ Wyckoff Setup: {wyckoff.trade.type} @ ${wyckoff.trade.entry?.toFixed(2)} | SL ${wyckoff.trade.stopLoss?.toFixed(2)} | TP ${wyckoff.trade.takeProfit1?.toFixed(2)} | R:R 1:{wyckoff.trade.rrRatio?.toFixed(2)}
            </div>
          ) : (
            <div style={{ color: COLORS.textMuted }}>
              [{new Date().toLocaleTimeString("en-GB")}] {wyckoff.notSetupReason?.slice(0, 120)}
            </div>
          )}
          <div style={{ color: COLORS.textDim }}>
            [Wyckoff] TR={wyckoff.conditions?.tradingRange?.passed ? "✓" : "✗"} Spring={wyckoff.conditions?.spring?.passed ? "✓" : "✗"} JAC={wyckoff.conditions?.jac?.passed ? "✓" : "✗"} LPS={wyckoff.conditions?.lps?.passed ? "✓" : "✗"} RR={wyckoff.conditions?.riskReward?.passed ? "✓" : "✗"}
          </div>
        </>
      )}
      {account && (
        <div style={{ color: COLORS.textMuted }}>
          [{new Date().toLocaleTimeString("en-GB")}] Account #{account.login} ({account.server}) balance=${account.balance.toFixed(2)} equity=${account.equity.toFixed(2)}
        </div>
      )}
      <div style={{ color: COLORS.textMuted }}>[{new Date().toLocaleTimeString("en-GB")}] Next scan in ~45s...</div>
    </div>
  );
}

function TVSignalsTab({ signals, decisions }: { signals: any[]; decisions: any[] }) {
  if (signals.length === 0) {
    return (
      <div className="p-4 text-center text-[11px]" style={{ color: COLORS.textMuted }}>
        <Tv style={{ width: 32, height: 32, color: COLORS.accent, margin: "0 auto 8px" }} />
        No TradingView signals received yet.
        <br />
        <span className="text-[10px]">Setup: open TradingView → create alert → set webhook URL to:</span>
        <br />
        <code className="text-[9px]" style={{ color: COLORS.accent, background: COLORS.panelHeader, padding: "2px 6px", borderRadius: 3, display: "inline-block", marginTop: 4 }}>
          {typeof window !== "undefined" ? window.location.origin : ""}/api/gold/tradingview-webhook
        </code>
        <br />
        <span className="text-[10px]" style={{ color: COLORS.dim }}>Hidden agent: running</span>
      </div>
    );
  }
  // Build decision map for lookup
  const decisionMap = new Map(decisions.map((d) => [d.signalId, d]));
  return (
    <table className="w-full text-[10px]">
      <thead>
        <tr style={{ background: COLORS.panelHeader, color: COLORS.textMuted }}>
          <th className="text-left px-2 py-1">Time</th>
          <th className="text-left px-2 py-1">Strategy</th>
          <th className="text-left px-2 py-1">Symbol</th>
          <th className="text-left px-2 py-1">Side</th>
          <th className="text-right px-2 py-1">Price</th>
          <th className="text-left px-2 py-1">TF</th>
          <th className="text-left px-2 py-1">Action</th>
          <th className="text-right px-2 py-1">Conf</th>
          <th className="text-left px-2 py-1">Reason</th>
        </tr>
      </thead>
      <tbody>
        {signals.slice(0, 50).map((s) => {
          const d = decisionMap.get(s.id);
          const actionColor = d?.action === "EXECUTE" ? COLORS.ask :
                              d?.action === "REJECT" ? COLORS.bid :
                              d?.action === "ALERT_ONLY" ? COLORS.warning :
                              COLORS.textMuted;
          return (
            <tr key={s.id} className="hover:bg-[#3c3c3c]">
              <td className="px-2 py-1 tabular-nums ltr-nums text-[9px]" style={{ color: COLORS.textMuted }}>
                {new Date(s.timestamp).toLocaleTimeString("en-GB")}
              </td>
              <td className="px-2 py-1 font-semibold" style={{ color: COLORS.accent }}>
                {s.strategy?.slice(0, 25) ?? "—"}
              </td>
              <td className="px-2 py-1 font-semibold">{s.symbol}</td>
              <td className="px-2 py-1" style={{ color: s.side === "buy" ? COLORS.ask : COLORS.bid, fontWeight: 600, textTransform: "uppercase" }}>
                {s.side}
              </td>
              <td className="text-right px-2 py-1 tabular-nums ltr-nums">
                {s.price ? s.price.toFixed(2) : "—"}
              </td>
              <td className="px-2 py-1 text-[9px]" style={{ color: COLORS.textMuted }}>{s.timeframe ?? "—"}</td>
              <td className="px-2 py-1 font-bold" style={{ color: actionColor }}>
                {d?.action ?? "..."}
                {d?.mt5OrderSent && (
                  <span style={{ color: COLORS.ask, marginLeft: 4 }}>✓MT5</span>
                )}
              </td>
              <td className="text-right px-2 py-1 tabular-nums ltr-nums" style={{ color: actionColor }}>
                {d?.confidence ? `${d.confidence}%` : "—"}
              </td>
              <td className="px-2 py-1 text-[9px]" style={{ color: COLORS.textMuted }}>
                {d?.reason?.slice(0, 50) ?? "—"}{(d?.reason?.length ?? 0) > 50 ? "..." : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}


function BacktestTab({ result, loading, onRun }: { result: any; loading: boolean; onRun: () => void }) {
  const equityCanvasRef = useRef<HTMLCanvasElement>(null);
  const ddCanvasRef = useRef<HTMLCanvasElement>(null);

  // === Draw equity curve + drawdown on canvas (like MT5 Strategy Tester) ===
  useEffect(() => {
    if (!result?.equity || !equityCanvasRef.current) return;
    const drawChart = (canvas: HTMLCanvasElement, data: { time: number; equity: number; drawdown: number }[], field: "equity" | "drawdown", color: string, fill: boolean) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (data.length < 2) return;
      // Sample data (max 500 points for performance)
      const step = Math.max(1, Math.floor(data.length / 500));
      const sampled: typeof data = [];
      for (let i = 0; i < data.length; i += step) sampled.push(data[i]);
      if (sampled[sampled.length - 1] !== data[data.length - 1]) sampled.push(data[data.length - 1]);

      const values = sampled.map(d => d[field]);
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (min === max) { min -= 1; max += 1; }
      const range = max - min;
      const padding = range * 0.1;
      min -= padding; max += padding;

      // Background grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw line/area
      ctx.beginPath();
      sampled.forEach((d, i) => {
        const x = (i / (sampled.length - 1)) * w;
        const y = h - ((d[field] - min) / (max - min)) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });

      if (fill) {
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = color + "20";
        ctx.fill();
        // Re-draw line on top
        ctx.beginPath();
        sampled.forEach((d, i) => {
          const x = (i / (sampled.length - 1)) * w;
          const y = h - ((d[field] - min) / (max - min)) * h;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Labels: min and max
      ctx.fillStyle = "#888888";
      ctx.font = "9px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(max.toFixed(2), 4, 12);
      ctx.fillText(min.toFixed(2), 4, h - 4);
    };

    drawChart(equityCanvasRef.current, result.equity, "equity", COLORS.ask, true);
    if (ddCanvasRef.current) drawChart(ddCanvasRef.current, result.equity, "drawdown", COLORS.bid, true);
  }, [result]);

  if (loading) {
    return (
      <div className="p-4 text-center text-[11px]" style={{ color: COLORS.textMuted }}>
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: COLORS.accent, borderTopColor: "transparent" }} />
        Running 1-year backtest on 5684 hourly candles...
      </div>
    );
  }
  if (!result || !result.stats) {
    return (
      <div className="p-4 text-center text-[11px]" style={{ color: COLORS.textMuted }}>
        <BarChart3 style={{ width: 32, height: 32, color: COLORS.accent, margin: "0 auto 8px" }} />
        <div className="font-bold mb-1" style={{ color: COLORS.text }}>1-Year Backtest — MT5 Strategy Tester Style</div>
        <div className="text-[10px] mb-3">
          باك تست احترافي لمدة سنة كاملة على بيانات حقيقية من Yahoo GC=F<br />
          5684 شمعة • $1000 رصيد • 1% مخاطرة • R:R 1:1.3-3
        </div>
        <button onClick={onRun} className="px-4 py-1.5 rounded text-[10px] font-bold" style={{ background: COLORS.accent, color: "#fff" }}>
          ▶ Run 1-Year Backtest
        </button>
      </div>
    );
  }
  const s = result.stats;
  const profit = s.totalReturn >= 0;
  const trades = result.trades || [];
  return (
    <div className="p-2 overflow-y-auto" style={{ maxHeight: "100%" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px]" style={{ color: COLORS.textMuted }}>
          Period: {result.startDate?.slice(0, 10)} → {result.endDate?.slice(0, 10)} • {result.totalCandles} candles • {s.totalTrades} trades
        </div>
        <button onClick={onRun} disabled={loading} className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: COLORS.accent, color: "#fff" }}>
          {loading ? "..." : "Re-run"}
        </button>
      </div>

      {/* === Equity Curve Chart (like MT5 Graph tab) === */}
      <div className="mb-2">
        <div className="text-[9px] font-bold mb-1" style={{ color: COLORS.ask }}>EQUITY CURVE</div>
        <div style={{ background: COLORS.chartBg, borderRadius: 4, border: `1px solid ${COLORS.border}`, height: 100, position: "relative" }}>
          <canvas ref={equityCanvasRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {/* === Drawdown Chart === */}
      <div className="mb-2">
        <div className="text-[9px] font-bold mb-1" style={{ color: COLORS.bid }}>DRAWDOWN</div>
        <div style={{ background: COLORS.chartBg, borderRadius: 4, border: `1px solid ${COLORS.border}`, height: 60, position: "relative" }}>
          <canvas ref={ddCanvasRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {/* === Key metrics === */}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        <Stat label="INITIAL" value={`$${s.initialBalance}`} color={COLORS.text} />
        <Stat label="FINAL" value={`$${s.finalBalance}`} color={profit ? COLORS.ask : COLORS.bid} />
        <Stat label="RETURN" value={`${profit ? "+" : ""}${s.totalReturnPct}%`} color={profit ? COLORS.ask : COLORS.bid} />
        <Stat label="MAX DD" value={`${s.maxDrawdownPct}%`} color={COLORS.bid} />
        <Stat label="TRADES" value={s.totalTrades} color={COLORS.text} />
        <Stat label="WIN RATE" value={`${s.winRate}%`} color={s.winRate >= 50 ? COLORS.ask : COLORS.warning} />
        <Stat label="PROFIT F." value={s.profitFactor} color={s.profitFactor >= 1.5 ? COLORS.ask : s.profitFactor >= 1 ? COLORS.warning : COLORS.bid} />
        <Stat label="SHARPE" value={s.sharpeRatio} color={COLORS.accent} />
      </div>

      {/* === Monthly Returns === */}
      {result.monthly && result.monthly.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] font-bold mb-1" style={{ color: COLORS.accent }}>MONTHLY RETURNS</div>
          <div className="flex gap-0.5">
            {result.monthly.map((m: any, i: number) => {
              const up = m.returnPct >= 0;
              const height = Math.min(30, Math.abs(m.returnPct) * 6);
              return (
                <div key={i} className="flex-1 flex flex-col items-center" title={`${m.month}: ${m.returnPct}% (${m.trades} trades)`}>
                  <div style={{ height: 30, display: "flex", alignItems: up ? "flex-end" : "flex-start" }}>
                    <div style={{ width: "100%", height: Math.max(2, height), background: up ? COLORS.ask : COLORS.bid, borderRadius: 1 }} />
                  </div>
                  <div className="text-[7px]" style={{ color: COLORS.textDim }}>{m.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === Trades Table (like MT5 Backtest tab) === */}
      {trades.length > 0 && (
        <div>
          <div className="text-[9px] font-bold mb-1" style={{ color: COLORS.accent }}>TRADES ({trades.length})</div>
          <table className="w-full text-[9px]">
            <thead>
              <tr style={{ background: COLORS.panelHeader, color: COLORS.textMuted }}>
                <th className="text-left px-1 py-0.5">#</th>
                <th className="text-left px-1 py-0.5">Time</th>
                <th className="text-left px-1 py-0.5">Type</th>
                <th className="text-right px-1 py-0.5">Entry</th>
                <th className="text-right px-1 py-0.5">Exit</th>
                <th className="text-right px-1 py-0.5">P/L</th>
                <th className="text-left px-1 py-0.5">Reason</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(-15).reverse().map((t: any, i: number) => (
                <tr key={i} className="hover:bg-[#3c3c3c]">
                  <td className="px-1 py-0.5 tabular-nums ltr-nums" style={{ color: COLORS.textDim }}>{trades.length - i}</td>
                  <td className="px-1 py-0.5" style={{ color: COLORS.textMuted }}>{new Date(t.entryTime * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}</td>
                  <td className="px-1 py-0.5 font-bold" style={{ color: t.side === "BUY" ? COLORS.ask : COLORS.bid }}>{t.side}</td>
                  <td className="text-right px-1 py-0.5 tabular-nums ltr-nums">{t.entryPrice?.toFixed(2)}</td>
                  <td className="text-right px-1 py-0.5 tabular-nums ltr-nums">{t.exitPrice?.toFixed(2)}</td>
                  <td className="text-right px-1 py-0.5 tabular-nums ltr-nums font-bold" style={{ color: t.pnl >= 0 ? COLORS.ask : COLORS.bid }}>
                    {t.pnl >= 0 ? "+" : ""}{t.pnl?.toFixed(2)}
                  </td>
                  <td className="px-1 py-0.5 text-[8px]" style={{ color: COLORS.textDim }}>{t.exitReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Source */}
      <div className="text-[8px] mt-2" style={{ color: COLORS.textDim }}>
        Source: {result.source}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: COLORS.panelHeader, padding: 6, borderRadius: 4 }}>
      <div className="text-[8px]" style={{ color: COLORS.textMuted }}>{label}</div>
      <div className="text-[10px] font-bold tabular-nums ltr-nums" style={{ color }}>{value}</div>
    </div>
  );
}
