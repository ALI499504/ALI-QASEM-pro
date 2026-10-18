"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import type { Candle } from "@/lib/indicators";

export interface SMCAnnotations {
  sweepLevel?: number;
  sweepType?: "sell-side" | "buy-side";
  chochLevel?: number;
  chochDirection?: "up" | "down";
  entryZoneTop?: number;
  entryZoneBottom?: number;
  entryZoneType?: "FVG" | "OB";
  entry?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  nextLiquidityLevel?: number;
}

interface Props {
  candles: Candle[];
  annotations?: SMCAnnotations;
  htfLabel?: string;
  height?: number;
  // Live price updates the last candle's close in real-time (tick-by-tick)
  livePrice?: number;
}

export default function SMCStrictChart({
  candles,
  annotations = {},
  htfLabel,
  height = 340,
  livePrice,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const mainRef = useRef<any>(null);
  const volRef = useRef<any>(null);
  const priceLinesRef = useRef<any[]>([]);
  const lastCandleRef = useRef<Candle | null>(null);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d1018" },
        textColor: "#7d8aa0",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.02)" },
        horzLines: { color: "rgba(255,255,255,0.02)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(212,165,116,0.5)", labelBackgroundColor: "#ffb020", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(212,165,116,0.5)", labelBackgroundColor: "#ffb020", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "#1c2433",
        scaleMargins: { top: 0.08, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#1c2433",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 6,
      },
    });

    chartRef.current = chart;

    mainRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#6cffb2",
      downColor: "#ff5a6a",
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
      volRef.current = null;
      priceLinesRef.current = [];
      lastCandleRef.current = null;
    };
  }, []);

  // Update candles + annotations
  useEffect(() => {
    if (!mainRef.current || !candles.length) return;

    const data = candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    mainRef.current.setData(data);
    volRef.current?.setData(
      candles.map((c) => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? "rgba(34,211,154,0.25)" : "rgba(255,77,106,0.25)",
      })),
    );
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from: 0,
      to: Math.max(20, candles.length - 1),
    });

    // Track the last candle so we can update its close with livePrice
    lastCandleRef.current = candles.at(-1) ?? null;

    // Clear old price lines
    priceLinesRef.current.forEach((l) => {
      try { mainRef.current?.removePriceLine(l); } catch {}
    });
    priceLinesRef.current = [];

    const addLine = (price: number, color: string, title: string, style: any = LineStyle.Dashed, lineWidth: number = 1) => {
      try {
        const line = mainRef.current?.createPriceLine({
          price,
          color,
          lineWidth,
          lineStyle: style,
          axisLabelVisible: true,
          title,
        });
        if (line) priceLinesRef.current.push(line);
      } catch {}
    };

    if (annotations.sweepLevel && annotations.sweepLevel > 0) {
      addLine(annotations.sweepLevel, "#06b6d4", `Sweep (${annotations.sweepType ?? ""})`, LineStyle.Dotted, 1);
    }
    if (annotations.chochLevel && annotations.chochLevel > 0) {
      addLine(annotations.chochLevel, "#b57cff", `CHoCH (${annotations.chochDirection ?? ""})`, LineStyle.Solid, 1);
    }
    if (annotations.entryZoneTop && annotations.entryZoneBottom && annotations.entryZoneTop > 0) {
      addLine(annotations.entryZoneTop, "#ffb020", `${annotations.entryZoneType ?? ""} Top`, LineStyle.LargeDashed, 1);
      addLine(annotations.entryZoneBottom, "#ffb020", `${annotations.entryZoneType ?? ""} Bottom`, LineStyle.LargeDashed, 1);
    }
    if (annotations.entry && annotations.entry > 0) {
      addLine(annotations.entry, "#ffb020", "Entry", LineStyle.Solid, 2);
    }
    if (annotations.stopLoss && annotations.stopLoss > 0) {
      addLine(annotations.stopLoss, "#ff5a6a", "Stop Loss", LineStyle.Solid, 2);
    }
    if (annotations.takeProfit1 && annotations.takeProfit1 > 0) {
      addLine(annotations.takeProfit1, "#6cffb2", "TP1", LineStyle.Dashed, 1);
    }
    if (annotations.takeProfit2 && annotations.takeProfit2 > 0) {
      addLine(annotations.takeProfit2, "#6cffb2", "TP2", LineStyle.Dashed, 1);
    }
    if (annotations.takeProfit3 && annotations.takeProfit3 > 0) {
      addLine(annotations.takeProfit3, "#ffb020", "TP3 (target)", LineStyle.Dashed, 2);
    }
    if (annotations.nextLiquidityLevel && annotations.nextLiquidityLevel > 0) {
      addLine(annotations.nextLiquidityLevel, "#6ea8ff", "Next Liquidity", LineStyle.Dotted, 1);
    }
  }, [candles, annotations]);

  // === LIVE PRICE UPDATE: update last candle's close + high/low with tick ===
  useEffect(() => {
    if (!mainRef.current || !livePrice || livePrice <= 0 || !lastCandleRef.current) return;
    const last = lastCandleRef.current;
    // Update the last candle with the live price
    const updatedCandle = {
      time: last.time as any,
      open: last.open,
      high: Math.max(last.high, livePrice),
      low: Math.min(last.low, livePrice),
      close: livePrice,
    };
    try {
      mainRef.current.update(updatedCandle);
    } catch {}
  }, [livePrice]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-[#1c2433] bg-[#0d1018]">
      {htfLabel && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-[#0d1018]/80 border border-[#1c2433] text-[9px] font-bold text-[#d7e0ee] tracking-wide">
          HTF: {htfLabel}
        </div>
      )}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d1018]/80 border border-[#1c2433] text-[9px] text-[#d7e0ee]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#6cffb2] animate-pulse" />
        M.ROBOT • 15m • LIVE
      </div>

      {livePrice && livePrice > 0 && (
        <div className="absolute top-9 right-2 z-10 px-2 py-0.5 rounded bg-[#0d1018]/80 border border-[#ffb020]/40 text-[10px] font-bold text-[#ffb020] tabular-nums ltr-nums">
          ${livePrice.toFixed(2)}
        </div>
      )}

      <div className="absolute bottom-2 left-2 z-10 flex flex-wrap items-center gap-1.5 text-[9px]">
        <span className="flex items-center gap-1 bg-[#0d1018]/80 border border-[#1c2433] px-1.5 py-0.5 rounded">
          <span className="w-2 h-0.5 bg-[#06b6d4]" /> Sweep
        </span>
        <span className="flex items-center gap-1 bg-[#0d1018]/80 border border-[#1c2433] px-1.5 py-0.5 rounded">
          <span className="w-2 h-0.5 bg-[#b57cff]" /> CHoCH
        </span>
        <span className="flex items-center gap-1 bg-[#0d1018]/80 border border-[#1c2433] px-1.5 py-0.5 rounded">
          <span className="w-2 h-0.5 bg-[#ffb020]" /> FVG/OB
        </span>
        <span className="flex items-center gap-1 bg-[#0d1018]/80 border border-[#1c2433] px-1.5 py-0.5 rounded">
          <span className="w-2 h-0.5 bg-[#ffb020]" /> Entry
        </span>
        <span className="flex items-center gap-1 bg-[#0d1018]/80 border border-[#1c2433] px-1.5 py-0.5 rounded">
          <span className="w-2 h-0.5 bg-[#ff5a6a]" /> SL
        </span>
        <span className="flex items-center gap-1 bg-[#0d1018]/80 border border-[#1c2433] px-1.5 py-0.5 rounded">
          <span className="w-2 h-0.5 bg-[#6cffb2]" /> TP1/2
        </span>
        <span className="flex items-center gap-1 bg-[#0d1018]/80 border border-[#1c2433] px-1.5 py-0.5 rounded">
          <span className="w-2 h-0.5 bg-[#6ea8ff]" /> Next Liq
        </span>
      </div>

      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}

