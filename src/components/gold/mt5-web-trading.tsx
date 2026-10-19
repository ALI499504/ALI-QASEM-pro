"use client";

// =====================================================================
//  M.ROBOT MT5 Web Trading — Faithful MetaTrader 5 Chart Replica
// =====================================================================
//  This component is JUST the chart (candlesticks + indicators + bid/ask
//  lines + OHLC info top-left + floating one-click trading panel).
//
//  All surrounding panels (Market Watch, Navigator, Toolbox, Status Bar,
//  Title Bar, Menu Bar, Toolbar, Timeframe Bar) are provided by the parent
//  MT5Terminal component — so the user sees the full MT5 experience.
//
//  • Real candlestick data from Yahoo GC=F (via /api/gold/market?tf=)
//  • Multi-timeframe support (synced with parent's timeframe prop)
//  • Volume histogram (colored by direction)
//  • EMA 50 (yellow) + EMA 200 (blue) — MT5 defaults
//  • Bid line (red dashed) + Ask line (green dashed) + Last (blue solid)
//  • OHLC info top-left (matches MT5)
//  • Floating one-click trading panel (BUY/SELL + volume + SL/TP)
//  • Pre-authenticated demo account (Login 50123456 / M.ROBOT-Demo)
// =====================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Activity,
  Zap,
  X,
} from "lucide-react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";

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

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const SYMBOL = "XAUUSD";
const SYMBOL_DESC = "Gold vs US Dollar";

// Convert MT5 timeframe code (M1, M5, M15, M30, H1, H4, D1, W1) → API tf
const TF_TO_API: Record<string, string> = {
  M1: "1",
  M5: "5",
  M15: "15",
  M30: "30",
  H1: "60",
  H4: "240",
  D1: "D",
  W1: "W",
};

// ====================== EMA helper ======================
function computeEMASeries(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let ema: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (ema === null) {
      const slice = values.slice(0, period);
      ema = slice.reduce((a, b) => a + b, 0) / period;
    } else {
      ema = values[i] * k + ema * (1 - k);
    }
    out.push(ema);
  }
  return out;
}

// ====================== Component ======================
export default function MT5WebTrading({ timeframe: tfProp = "M15" }: { timeframe?: string }) {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  // Internal timeframe state — synced with parent prop
  const [tvInterval, setTvInterval] = useState<string>(TF_TO_API[tfProp] || "15");

  // === Floating one-click trading panel state ===
  const [showTradePanel, setShowTradePanel] = useState(true);
  const [volume, setVolume] = useState(0.01);
  const [useSL, setUseSL] = useState(true);
  const [useTP, setUseTP] = useState(true);
  const [slPips, setSlPips] = useState(10);
  const [tpPips, setTpPips] = useState(30);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // === Chart refs ===
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ema50SeriesRef = useRef<any>(null);
  const ema200SeriesRef = useRef<any>(null);
  const bidLineRef = useRef<any>(null);
  const askLineRef = useRef<any>(null);
  const lastPriceLineRef = useRef<any>(null);
  const prevCandlesKeyRef = useRef<string>("");

  // ====================== Sync parent timeframe → internal ======================
  useEffect(() => {
    const newTf = TF_TO_API[tfProp] || "15";
    if (newTf !== tvInterval) {
      setTvInterval(newTf);
    }
  }, [tfProp]);

  // ====================== Fetch Market (price + candles) ======================
  const fetchMarket = useCallback(
    async (opts?: { tf?: string }) => {
      try {
        const tfParam = opts?.tf ?? tvInterval;
        const r = await fetch(`/api/gold/market?tf=${encodeURIComponent(tfParam)}&_=${Date.now()}`, {
          cache: "no-store",
        });
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
        if (d?.candles && Array.isArray(d.candles) && d.candles.length > 0) {
          const cs: CandleData[] = d.candles.map((c: any) => {
            let t = Number(c.time ?? c.t ?? 0);
            if (t > 1e12) t = Math.floor(t / 1000);
            return {
              time: t,
              open: Number(c.open ?? c.o),
              high: Number(c.high ?? c.h),
              low: Number(c.low ?? c.l),
              close: Number(c.close ?? c.c),
              volume: Number(c.volume ?? c.v ?? 0),
            };
          });
          const uniq = Array.from(
            new Map(cs.map((c) => [c.time, c])).values()
          ).sort((a, b) => a.time - b.time);
          setCandles(uniq);
        }
      } catch (e) {
        // ignore
      }
    },
    [tvInterval]
  );

  // ====================== Init effects ======================
  useEffect(() => {
    fetchMarket();
    const mktInt = setInterval(fetchMarket, 3000);
    return () => clearInterval(mktInt);
  }, [fetchMarket]);

  // ====================== Initialize chart ======================
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let containerW = chartContainerRef.current.clientWidth;
    let containerH = chartContainerRef.current.clientHeight;

    if (containerW === 0 || containerH === 0) {
      const initRetry = setInterval(() => {
        if (!chartContainerRef.current) {
          clearInterval(initRetry);
          return;
        }
        const w = chartContainerRef.current.clientWidth;
        const h = chartContainerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          clearInterval(initRetry);
          initChart(w, h);
        }
      }, 50);
      setTimeout(() => clearInterval(initRetry), 3000);
      return;
    }
    initChart(containerW, containerH);

    function initChart(w: number, h: number) {
      if (!chartContainerRef.current || chartRef.current) return;

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: COLORS.bg },
          textColor: COLORS.text,
          fontFamily: "Inter, system-ui, Segoe UI, sans-serif",
          fontSize: 11,
          attributionLogo: false,
          panSize: 0,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.035)" },
          horzLines: { color: "rgba(255,255,255,0.035)" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: "rgba(255,255,255,0.4)",
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: COLORS.accent,
          },
          horzLine: {
            color: "rgba(255,255,255,0.4)",
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: COLORS.accent,
          },
        },
        rightPriceScale: {
          borderColor: COLORS.border,
          scaleMargins: { top: 0.08, bottom: 0.28 },
          entireTextOnly: true,
        },
        timeScale: {
          borderColor: COLORS.border,
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 5,
          barSpacing: 9,
        },
        width: w,
        height: h,
        autoSize: false,
      });

      // Volume histogram (bottom)
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
        lastValueVisible: false,
        priceLineVisible: false,
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      // EMA 50 (yellow)
      const ema50Series = chart.addSeries(LineSeries, {
        color: "#facc15",
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      // EMA 200 (blue)
      const ema200Series = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      // Main candlestick series (last so it's on top)
      const series = chart.addSeries(CandlestickSeries, {
        upColor: COLORS.up,
        downColor: COLORS.down,
        borderUpColor: COLORS.up,
        borderDownColor: COLORS.down,
        wickUpColor: "rgba(34,197,94,0.85)",
        wickDownColor: "rgba(239,68,68,0.85)",
        priceLineStyle: LineStyle.Dashed,
        lastValueVisible: true,
      });

      chartRef.current = chart;
      seriesRef.current = series;
      volumeSeriesRef.current = volumeSeries;
      ema50SeriesRef.current = ema50Series;
      ema200SeriesRef.current = ema200Series;

      setChartLoading(false);

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };
      window.addEventListener("resize", handleResize);
      let resizeObserver: ResizeObserver | null = null;
      if (chartContainerRef.current && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);
      }

      // cleanup function attached to outer return
      (chartRef as any).__cleanup = () => {
        window.removeEventListener("resize", handleResize);
        resizeObserver?.disconnect();
        try {
          chart.remove();
        } catch (e) {
          // ignore
        }
      };
    }

    return () => {
      const cleanup = (chartRef as any).__cleanup;
      if (cleanup) cleanup();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema200SeriesRef.current = null;
      bidLineRef.current = null;
      askLineRef.current = null;
      lastPriceLineRef.current = null;
      prevCandlesKeyRef.current = "";
    };
  }, []);

  // ====================== Apply candles to chart (with Volume + EMA) ======================
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;
    const candlesKey = candles.map((c) => c.time).join(",");
    if (candlesKey === prevCandlesKeyRef.current) return;
    prevCandlesKeyRef.current = candlesKey;

    try {
      const ohlcData = candles.map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      seriesRef.current.setData(ohlcData);

      if (volumeSeriesRef.current) {
        const volData = candles
          .filter((c) => Number.isFinite(c.volume) && c.volume > 0)
          .map((c) => ({
            time: c.time as any,
            value: c.volume,
            color:
              c.close >= c.open
                ? "rgba(34,197,94,0.45)"
                : "rgba(239,68,68,0.45)",
          }));
        volumeSeriesRef.current.setData(volData);
      }

      if (ema50SeriesRef.current) {
        const closes = candles.map((c) => c.close);
        const ema50 = computeEMASeries(closes, 50);
        const ema50Data = candles
          .map((c, i) => ({
            time: c.time as any,
            value: ema50[i],
          }))
          .filter((d) => d.value !== null);
        ema50SeriesRef.current.setData(ema50Data);
      }

      if (ema200SeriesRef.current) {
        const closes = candles.map((c) => c.close);
        const ema200 = computeEMASeries(closes, 200);
        const ema200Data = candles
          .map((c, i) => ({
            time: c.time as any,
            value: ema200[i],
          }))
          .filter((d) => d.value !== null);
        ema200SeriesRef.current.setData(ema200Data);
      }

      chartRef.current?.timeScale().fitContent();
    } catch (e) {
      // ignore
    }
  }, [candles]);

  // ====================== Live tick — update last candle ======================
  useEffect(() => {
    if (!seriesRef.current || !market || candles.length === 0) return;
    try {
      const lastCandle = candles[candles.length - 1];
      if (!lastCandle) return;

      seriesRef.current.update({
        time: lastCandle.time as any,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, market.price),
        low: Math.min(lastCandle.low, market.price),
        close: market.price,
      });

      if (volumeSeriesRef.current && lastCandle.volume > 0) {
        volumeSeriesRef.current.update({
          time: lastCandle.time as any,
          value: lastCandle.volume,
          color:
            lastCandle.close >= lastCandle.open
              ? "rgba(34,197,94,0.45)"
              : "rgba(239,68,68,0.45)",
        });
      }

      // Update EMA50/EMA200 last point
      const closes = candles.map((c) => c.close);
      closes[closes.length - 1] = market.price;
      if (ema50SeriesRef.current) {
        const ema50 = computeEMASeries(closes, 50);
        const lastEMA = ema50[ema50.length - 1];
        if (lastEMA !== null && Number.isFinite(lastEMA)) {
          ema50SeriesRef.current.update({
            time: lastCandle.time as any,
            value: lastEMA,
          });
        }
      }
      if (ema200SeriesRef.current) {
        const ema200 = computeEMASeries(closes, 200);
        const lastEMA = ema200[ema200.length - 1];
        if (lastEMA !== null && Number.isFinite(lastEMA)) {
          ema200SeriesRef.current.update({
            time: lastCandle.time as any,
            value: lastEMA,
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }, [market?.price]);

  // ====================== Bid / Ask / Last price lines ======================
  useEffect(() => {
    if (!seriesRef.current || !market) return;
    try {
      const removeIfExists = (ref: any) => {
        if (ref.current) {
          try {
            seriesRef.current.removePriceLine(ref.current);
          } catch (e) {
            // ignore
          }
          ref.current = null;
        }
      };
      removeIfExists(bidLineRef);
      removeIfExists(askLineRef);
      removeIfExists(lastPriceLineRef);

      bidLineRef.current = seriesRef.current.createPriceLine({
        price: market.bid,
        color: COLORS.bid,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "BID",
      });
      askLineRef.current = seriesRef.current.createPriceLine({
        price: market.ask,
        color: COLORS.ask,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "ASK",
      });
      lastPriceLineRef.current = seriesRef.current.createPriceLine({
        price: market.price,
        color: COLORS.accent,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "LAST",
      });
    } catch (e) {
      // ignore
    }
  }, [market?.price, market?.bid, market?.ask]);

  // ====================== Reset chart on timeframe change ======================
  useEffect(() => {
    setChartLoading(true);
    setChartError(null);
    prevCandlesKeyRef.current = "";
    try {
      seriesRef.current?.setData([]);
      volumeSeriesRef.current?.setData([]);
      ema50SeriesRef.current?.setData([]);
      ema200SeriesRef.current?.setData([]);
    } catch (e) {
      // ignore
    }
    fetchMarket({ tf: tvInterval }).then(() => setChartLoading(false));
    const t = setTimeout(() => setChartLoading(false), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          setToast(`✓ ${side} ${volume} lot @ ${d.price?.toFixed(2)} (#${d.ticket})`);
          setTimeout(() => setToast(null), 4000);
        } else {
          setError(d?.error || "Order failed");
        }
      } catch (e: any) {
        setError(e?.message || "Network error");
      } finally {
        setPlacingOrder(false);
      }
    },
    [market, volume, useSL, useTP, slPips, tpPips]
  );

  // ====================== Render ======================
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: COLORS.bg, minHeight: 0 }}
    >
      {/* Watermark — large faint symbol name */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{
          color: "rgba(255,255,255,0.025)",
          fontSize: "120px",
          fontWeight: 900,
          letterSpacing: "8px",
          fontFamily: "Inter, system-ui, sans-serif",
          userSelect: "none",
        }}
      >
        {SYMBOL}
      </div>

      {/* Chart container */}
      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      />

      {/* Loading state */}
      {chartLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center text-[11px] z-20 pointer-events-none"
          style={{ color: COLORS.textMuted, background: COLORS.bg }}
        >
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading {tfProp} chart...
        </div>
      )}

      {/* MT5-style OHLC info top-left */}
      {market && !chartLoading && (
        <div
          className="absolute top-1.5 left-2 z-10 pointer-events-none text-[10px] leading-tight"
          style={{ color: COLORS.text, fontFamily: "Consolas, monospace" }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: COLORS.textBright, fontWeight: 700, fontSize: 11 }}>
              {SYMBOL}
            </span>
            <span style={{ color: COLORS.textMuted }}>{tfProp}</span>
            <span style={{ color: COLORS.textMuted, fontSize: 9 }}>· {market.source}</span>
          </div>
          <div className="text-[9px] mt-0.5" style={{ color: COLORS.textMuted }}>
            Bid <span style={{ color: COLORS.bid, fontWeight: 600 }}>{market.bid.toFixed(2)}</span>
            {"  "}
            Ask <span style={{ color: COLORS.ask, fontWeight: 600 }}>{market.ask.toFixed(2)}</span>
          </div>
          {candles.length > 0 && (
            <div className="text-[9px] mt-0.5" style={{ color: COLORS.textMuted }}>
              {(() => {
                const c = candles[candles.length - 1];
                return (
                  <>
                    O <span style={{ color: COLORS.text }}>{c.open.toFixed(2)}</span>
                    {"  "}H <span style={{ color: COLORS.ask }}>{Math.max(c.high, market.price).toFixed(2)}</span>
                    {"  "}L <span style={{ color: COLORS.bid }}>{Math.min(c.low, market.price).toFixed(2)}</span>
                    {"  "}C <span style={{ color: market.price >= c.open ? COLORS.ask : COLORS.bid, fontWeight: 600 }}>
                      {market.price.toFixed(2)}
                    </span>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* LIVE price top-right */}
      {market && !chartLoading && (
        <div
          className="absolute top-1.5 right-2 px-2 py-0.5 rounded text-[11px] flex items-center gap-1.5 z-10 pointer-events-none"
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
          <span style={{ fontWeight: 700 }}>{market.price.toFixed(2)}</span>
        </div>
      )}

      {/* === Floating One-Click Trading Panel (top-right, below LIVE) === */}
      {showTradePanel && market && !chartLoading && (
        <div
          className="absolute top-10 right-2 z-30 rounded-md shadow-2xl"
          style={{
            background: "rgba(26,26,26,0.96)",
            border: `1px solid ${COLORS.borderLight}`,
            width: 200,
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold"
            style={{
              background: COLORS.panelHeader,
              borderBottom: `1px solid ${COLORS.border}`,
              color: COLORS.textBright,
            }}
          >
            <span>One-Click Trading</span>
            <button
              onClick={() => setShowTradePanel(false)}
              className="hover:opacity-70"
              style={{ color: COLORS.textMuted }}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-2 space-y-2">
            {/* Volume */}
            <div>
              <label
                className="text-[8px] uppercase block mb-0.5"
                style={{ color: COLORS.textMuted }}
              >
                Volume (Lots)
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVolume(Math.max(0.01, +(volume - 0.01).toFixed(2)))}
                  className="px-1.5 py-0.5 text-[10px] rounded"
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
                  onChange={(e) => setVolume(Math.max(0.01, Number(e.target.value)))}
                  className="flex-1 px-1 py-0.5 text-[10px] text-center rounded"
                  style={{
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textBright,
                  }}
                />
                <button
                  onClick={() => setVolume(+(volume + 0.01).toFixed(2))}
                  className="px-1.5 py-0.5 text-[10px] rounded"
                  style={{
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* SL / TP compact row */}
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label
                  className="text-[8px] uppercase block mb-0.5"
                  style={{ color: COLORS.bid }}
                >
                  S/L
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={slPips}
                  disabled={!useSL}
                  onChange={(e) => setSlPips(Number(e.target.value))}
                  className="w-full px-1 py-0.5 text-[10px] rounded"
                  style={{
                    background: useSL ? COLORS.bg : COLORS.panelHeader,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textBright,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-[8px] uppercase block mb-0.5"
                  style={{ color: COLORS.ask }}
                >
                  T/P
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={tpPips}
                  disabled={!useTP}
                  onChange={(e) => setTpPips(Number(e.target.value))}
                  className="w-full px-1 py-0.5 text-[10px] rounded"
                  style={{
                    background: useTP ? COLORS.bg : COLORS.panelHeader,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textBright,
                  }}
                />
              </div>
            </div>

            {/* BUY / SELL buttons */}
            <div className="space-y-1 pt-0.5">
              <button
                onClick={() => placeOrder("SELL")}
                disabled={placingOrder}
                className="w-full py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition hover:opacity-90 disabled:opacity-50"
                style={{ background: COLORS.bid, color: "#fff" }}
              >
                {placingOrder ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                SELL {volume} @ {market.bid.toFixed(2)}
              </button>
              <button
                onClick={() => placeOrder("BUY")}
                disabled={placingOrder}
                className="w-full py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition hover:opacity-90 disabled:opacity-50"
                style={{ background: COLORS.ask, color: "#fff" }}
              >
                {placingOrder ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <TrendingUp className="w-3 h-3" />
                )}
                BUY {volume} @ {market.ask.toFixed(2)}
              </button>
            </div>

            {error && (
              <div
                className="text-[9px] px-1.5 py-1 rounded"
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
        </div>
      )}

      {/* Show floating panel button when hidden */}
      {!showTradePanel && (
        <button
          onClick={() => setShowTradePanel(true)}
          className="absolute top-10 right-2 z-30 px-2 py-1 text-[10px] rounded-md shadow-2xl flex items-center gap-1"
          style={{
            background: COLORS.accent,
            color: "#fff",
          }}
        >
          <Zap className="w-3 h-3" />
          Show Trade Panel
        </button>
      )}

      {/* Toast */}
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
