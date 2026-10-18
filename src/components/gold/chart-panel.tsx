"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createTextWatermark,
} from "lightweight-charts";
import type { Candle, IndicatorSet } from "@/lib/indicators";
import { useTradingStore } from "@/lib/store";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, BarChart3, Maximize2 } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface Props {
  candles: Candle[];
  indicators: IndicatorSet;
  height?: number;
}

export default function GoldChart({ candles, indicators, height = 600 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const mainRef = useRef<any>(null);
  const volRef = useRef<any>(null);
  const priceLinesRef = useRef<any[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const { positions } = useTradingStore();

  const floatingPL = positions
    .filter((p) => p.status === "OPEN")
    .reduce((s, p) => {
      const dir = p.side === "BUY" ? 1 : -1;
      return s + (p.currentPrice - p.entryPrice) * dir * p.lotSize * 100;
    }, 0);

  const currentPrice = candles.at(-1)?.close ?? 0;
  const up = (indicators.macdHist ?? 0) >= 0;

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0e1a" },
        textColor: "#6b7280",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        panes: {
          separator: { visible: true, color: "#1a2030", size: 2 },
        },
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#d4a574", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#d4a574" },
        horzLine: { color: "#d4a574", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#d4a574" },
      },
      rightPriceScale: {
        borderColor: "#1a2030",
        scaleMargins: { top: 0.08, bottom: 0.25 },
        textColor: "#6b7280",
      },
      timeScale: {
        borderColor: "#1a2030",
        timeVisible: true,
        secondsVisible: false,
        textColor: "#6b7280",
      },
      width: containerRef.current.clientWidth,
      height: fullscreen ? window.innerHeight - 40 : height,
      autoSize: false,
    });

    chartRef.current = chart;

    mainRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#22d39a",
      downColor: "#ff4d6a",
      wickUpColor: "rgba(34,211,154,0.6)",
      wickDownColor: "rgba(255,77,106,0.6)",
      borderVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      priceLineColor: "rgba(212,165,116,0.3)",
      priceLineStyle: LineStyle.Dotted,
    });

    volRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    try {
      const pane = chart.panes()[0];
      if (pane) {
        createTextWatermark(pane, {
          text: "M.ROBOT",
          color: "rgba(212,165,116,0.05)",
          fontSize: 80,
          fontWeight: 900,
          visible: true,
        });
      }
    } catch {}

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      mainRef.current = null;
      volRef.current = null;
      priceLinesRef.current = [];
    };
  }, [fullscreen]);

  const prevCandlesRef = useRef<Candle[] | null>(null);

  useEffect(() => {
    if (!mainRef.current || !candles.length) return;

    const prevCandles = prevCandlesRef.current;
    const lastCandle = candles[candles.length - 1];

    const isLiveUpdate =
      prevCandles && prevCandles.length === candles.length && prevCandles.length > 0 &&
      prevCandles[prevCandles.length - 1].time === lastCandle.time;

    if (isLiveUpdate) {
      mainRef.current.update({ time: lastCandle.time as any, open: lastCandle.open, high: lastCandle.high, low: lastCandle.low, close: lastCandle.close });
      volRef.current?.update({ time: lastCandle.time as any, value: lastCandle.volume, color: lastCandle.close >= lastCandle.open ? "rgba(34,211,154,0.3)" : "rgba(255,77,106,0.3)" });
    } else {
      const data = candles.map((c) => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close }));
      mainRef.current.setData(data);
      volRef.current?.setData(candles.map((c) => ({ time: c.time as any, value: c.volume, color: c.close >= c.open ? "rgba(34,211,154,0.3)" : "rgba(255,77,106,0.3)" })));
      chartRef.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, candles.length - 60), to: candles.length + 4 });
    }

    prevCandlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    if (!mainRef.current) return;
    priceLinesRef.current.forEach((l) => { try { mainRef.current?.removePriceLine(l); } catch {} });
    priceLinesRef.current = [];

    if (indicators.resistance > 0)
      priceLinesRef.current.push(mainRef.current.createPriceLine({ price: indicators.resistance, color: "rgba(255,77,106,0.5)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "R" }));
    if (indicators.support > 0)
      priceLinesRef.current.push(mainRef.current.createPriceLine({ price: indicators.support, color: "rgba(34,211,154,0.5)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "S" }));
    if (indicators.pivot > 0)
      priceLinesRef.current.push(mainRef.current.createPriceLine({ price: indicators.pivot, color: "rgba(255,201,51,0.4)", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "P" }));
    if (indicators.vwap > 0)
      priceLinesRef.current.push(mainRef.current.createPriceLine({ price: indicators.vwap, color: "rgba(91,140,255,0.4)", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "VWAP" }));
  }, [indicators.resistance, indicators.support, indicators.pivot, indicators.vwap]);

  return (
    <div className={"relative rounded-xl overflow-hidden border border-[#1a2030] bg-[#0a0e1a] " + (fullscreen ? "fixed inset-0 z-[100] rounded-none" : "")}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2030] bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-[#d4a574]">XAU/USD</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a2030] text-[#6b7280]">XAU</span>
          </div>
          <div className="flex items-center gap-1">
            {["1m", "5m", "15m", "1H", "4H"].map((tf) => (
              <button key={tf} className="text-[9px] px-2 py-0.5 rounded hover:bg-[#1a2030] text-[#6b7280] transition">
                {tf}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className={"text-sm font-bold tabular-nums ltr-nums " + (up ? "text-[#22d39a]" : "text-[#ff4d6a]")}>
              ${currentPrice.toFixed(2)}
            </span>
            <span className={"text-[9px] tabular-nums ltr-nums " + (up ? "text-[#22d39a]" : "text-[#ff4d6a]")}>
              {up ? "+" : ""}{indicators.macdHist?.toFixed(2) ?? "0"}
            </span>
          </div>
          <button onClick={() => setFullscreen(!fullscreen)} className="p-1 rounded hover:bg-[#1a2030] text-[#6b7280] transition">
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full" style={{ height: fullscreen ? "calc(100vh - 80px)" : height - 40 }} />

      {/* Bottom Bar - Account Info */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#1a2030] bg-[#0d1117] text-[10px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Wallet className="w-3 h-3 text-[#6b7280]" />
            <span className="text-[#6b7280]">Equity:</span>
            <span className="font-bold text-[#d4a574] tabular-nums ltr-nums">
              ${(10000 + floatingPL).toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-[#6b7280]" />
            <span className="text-[#6b7280]">P/L:</span>
            <span className={"font-bold tabular-nums ltr-nums " + (floatingPL >= 0 ? "text-[#22d39a]" : "text-[#ff4d6a]")}>
              {floatingPL >= 0 ? "+" : ""}${floatingPL.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#6b7280]">MACD:</span>
            <span className={"font-bold tabular-nums ltr-nums " + (indicators.macdHist >= 0 ? "text-[#22d39a]" : "text-[#ff4d6a]")}>
              {indicators.macdHist >= 0 ? "+" : ""}{indicators.macdHist?.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#6b7280]">XAUUSD Spot</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#22d39a] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
