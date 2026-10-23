"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi,
  ISeriesApi,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import { fetchCandles, type Candle } from "@/lib/mt5-data";

interface MT5ChartProps {
  symbol: string;
  period: string;
  predictionPrice?: number | null; // AI predicted next candle close
  predictionDirection?: "BUY" | "SELL" | "HOLD" | null;
  onCandlesLoaded?: (candles: Candle[]) => void;
  height?: number;
}

const PERIOD_MS: Record<string, number> = {
  "M1": 60_000,
  "M5": 300_000,
  "M15": 900_000,
  "M30": 1_800_000,
  "H1": 3_600_000,
  "H4": 14_400_000,
  "D1": 86_400_000,
};

// Map UI period → API interval
const API_PERIOD_MAP: Record<string, string> = {
  "M1": "1m",
  "M5": "5m",
  "M15": "15m",
  "M30": "30m",
  "H1": "1h",
  "H4": "4h",
  "D1": "1d",
};

export default function MT5Chart({
  symbol,
  period,
  predictionPrice,
  predictionDirection,
  onCandlesLoaded,
  height = 540,
}: MT5ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const predictionLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [lastCandle, setLastCandle] = useState<Candle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ====== Create chart on mount ======
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#cbd5e1",
        fontSize: 11,
        fontFamily: "JetBrains Mono, monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(51,65,85,0.18)" },
        horzLines: { color: "rgba(51,65,85,0.18)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#6366f1",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#4f46e5",
        },
        horzLine: {
          color: "#6366f1",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#4f46e5",
        },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
      },
      width: containerRef.current.clientWidth,
      height,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
      priceLineVisible: true,
      priceLineStyle: LineStyle.Dashed,
      priceLineColor: "#fbbf24",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "rgba(99,102,241,0.45)",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
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
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      predictionLineRef.current = null;
    };
  }, [height]);

  // ====== Load candles ======
  const loadCandles = useCallback(async () => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const apiPeriod = API_PERIOD_MAP[period] || "1h";
      const raw = await fetchCandles(symbol, apiPeriod, 300);
      if (raw.length === 0) {
        setError("No candles returned");
        setLoading(false);
        return;
      }
      // Sort ascending by time and dedupe
      const sorted = [...raw].sort((a, b) => a.time - b.time);
      const seen = new Set<number>();
      const candles = sorted.filter((c) => {
        if (seen.has(c.time)) return false;
        seen.add(c.time);
        return true;
      });

      candleSeriesRef.current.setData(
        candles.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      volumeSeriesRef.current.setData(
        candles.map((c) => ({
          time: c.time as any,
          value: c.volume,
          color: c.close >= c.open ? "rgba(16,185,129,0.55)" : "rgba(239,68,68,0.55)",
        }))
      );
      setLastCandle(candles[candles.length - 1]);
      onCandlesLoaded?.(candles);
      chartRef.current?.timeScale().fitContent();
    } catch (e: any) {
      setError(e?.message ?? "Failed to load chart");
    } finally {
      setLoading(false);
    }
  }, [symbol, period, onCandlesLoaded]);

  useEffect(() => {
    loadCandles();
  }, [loadCandles]);

  // ====== Live tick simulation: nudge last candle on every poll ======
  // (When MetaApi is reachable, this is replaced with real tick streaming
  //  via the WebSocket connection in /api/mt5/tick. For now we poll
  //  the same /api/mt5/candles endpoint every 10s and update the last bar.)
  useEffect(() => {
    const id = setInterval(async () => {
      if (!candleSeriesRef.current) return;
      try {
        const apiPeriod = API_PERIOD_MAP[period] || "1h";
        const fresh = await fetchCandles(symbol, apiPeriod, 5);
        if (fresh.length === 0) return;
        const sorted = [...fresh].sort((a, b) => a.time - b.time);
        for (const c of sorted) {
          candleSeriesRef.current.update({
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          });
        }
        const last = sorted[sorted.length - 1];
        setLastCandle(last);
      } catch {
        /* ignore polling errors */
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [symbol, period]);

  // ====== Prediction price line ======
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    if (predictionLineRef.current) {
      try {
        chartRef.current?.removeSeries(predictionLineRef.current);
      } catch {}
      predictionLineRef.current = null;
    }
    if (predictionPrice && predictionPrice > 0) {
      const lineSeries = chartRef.current!.addSeries(LineSeries, {
        color: predictionDirection === "BUY" ? "#10b981" : predictionDirection === "SELL" ? "#ef4444" : "#fbbf24",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: true,
        title: `AI T+1: ${predictionPrice.toFixed(2)}`,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
      });
      // Draw a horizontal line from the last candle to the right edge at predictionPrice
      if (lastCandle) {
        lineSeries.setData([
          { time: lastCandle.time as any, value: predictionPrice },
        ]);
      }
      predictionLineRef.current = lineSeries;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictionPrice, predictionDirection, lastCandle]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          background: "transparent",
        }}
      />
      {/* Overlay: symbol info */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 14,
          color: "#e2e8f0",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
          fontWeight: 700,
          textShadow: "0 0 6px rgba(0,0,0,0.6)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#fbbf24", fontSize: 16 }}>{symbol}</span>
          <span style={{ color: "#64748b", fontSize: 11 }}>· {period}</span>
        </div>
        {lastCandle && (
          <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: lastCandle.close >= lastCandle.open ? "#10b981" : "#ef4444" }}>
              {lastCandle.close.toFixed(2)}
            </span>
            <span style={{ color: "#64748b", marginLeft: 8, fontSize: 10 }}>
              H {lastCandle.high.toFixed(2)} L {lastCandle.low.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(2,6,23,0.5)",
            color: "#fbbf24",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 14,
                height: 14,
                border: "2px solid #fbbf2433",
                borderTopColor: "#fbbf24",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span>Fetching {symbol} {period} candles…</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "rgba(127,29,29,0.85)",
            color: "#fecaca",
            padding: "6px 10px",
            borderRadius: 4,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            maxWidth: 280,
            zIndex: 5,
          }}
        >
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
