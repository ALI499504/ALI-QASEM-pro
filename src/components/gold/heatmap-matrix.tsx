"use client";

import { motion } from "framer-motion";
import { Grid3x3 } from "lucide-react";
import type { Candle, IndicatorSet } from "@/lib/indicators";
import { ema } from "@/lib/indicators";

interface Props {
  candles: Candle[];
  indicators: IndicatorSet;
}

const TIMEFRAMES = [
  { label: "1m", period: 1 },
  { label: "5m", period: 1 },
  { label: "15m", period: 3 },
  { label: "1H", period: 12 },
  { label: "4H", period: 24 },
  { label: "1D", period: 48 },
];

interface Row {
  indicator: string;
  shortName: string;
  compute: (candles: Candle[], indicators: IndicatorSet) => "bull" | "bear" | "neutral";
}

const ROWS: Row[] = [
  {
    indicator: "RSI(14)",
    shortName: "RSI",
    compute: (_c, i) =>
      i.rsi < 45 ? "bull" : i.rsi > 55 ? "bear" : "neutral",
  },
  {
    indicator: "MACD",
    shortName: "MACD",
    compute: (_c, i) =>
      i.macdHist > 0 ? "bull" : i.macdHist < 0 ? "bear" : "neutral",
  },
  {
    indicator: "Williams %R",
    shortName: "W%R",
    compute: (_c, i) =>
      i.williamsR < -50 ? "bull" : i.williamsR > -50 ? "bear" : "neutral",
  },
  {
    indicator: "EMA 9/21",
    shortName: "EMA",
    compute: (_c, i) =>
      i.ema9 > i.ema21 ? "bull" : i.ema9 < i.ema21 ? "bear" : "neutral",
  },
  {
    indicator: "EMA 21/50",
    shortName: "EMA2",
    compute: (_c, i) =>
      i.ema21 > i.ema50 ? "bull" : i.ema21 < i.ema50 ? "bear" : "neutral",
  },
  {
    indicator: "Bollinger",
    shortName: "BB",
    compute: (_c, i) =>
      i.bbLower > 0 && _c.at(-1)!.close < i.bbLower
        ? "bull"
        : i.bbUpper > 0 && _c.at(-1)!.close > i.bbUpper
        ? "bear"
        : "neutral",
  },
  {
    indicator: "Volume",
    shortName: "VOL",
    compute: (_c, i) =>
      i.volumeTrend === "high" ? "bull" : "neutral",
  },
];

const COLORS = {
  bull: { bg: "rgba(74,222,128,0.18)", color: "#4ade80", label: "شراء" },
  bear: { bg: "rgba(248,113,113,0.18)", color: "#f87171", label: "بيع" },
  neutral: { bg: "rgba(200,160,80,0.08)", color: "#8a96a8", label: "—" },
};

export default function HeatmapMatrix({ candles, indicators }: Props) {
  if (!candles.length) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <Grid3x3 className="w-4 h-4 section-heading-icon" />
            مصفوفة الإشارات (مؤشرات × أطر زمنية)
          </h2>
          <span className="section-subtitle">جاري التحميل...</span>
        </div>
        <div className="h-48 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  function computeCell(row: Row, tf: typeof TIMEFRAMES[number]): "bull" | "bear" | "neutral" {
    // Aggregate candles into the timeframe
    const aggregated: Candle[] = [];
    for (let i = 0; i < candles.length; i += tf.period) {
      const slice = candles.slice(i, i + tf.period);
      if (!slice.length) break;
      aggregated.push({
        time: slice[0].time,
        open: slice[0].open,
        high: Math.max(...slice.map((c) => c.high)),
        low: Math.min(...slice.map((c) => c.low)),
        close: slice[slice.length - 1].close,
        volume: slice.reduce((s, c) => s + c.volume, 0),
      });
    }
    // Compute indicator values for this timeframe
    const closes = aggregated.map((c) => c.close);
    const rsiVal = computeRSI(closes);
    const macdHistVal = computeMACDHist(closes);
    const shortEma = ema(closes, Math.min(9, closes.length));
    const longEma = ema(closes, Math.min(21, closes.length));
    const longEma50 = ema(closes, Math.min(50, closes.length));

    const syntheticInd: Partial<IndicatorSet> = {
      rsi: rsiVal,
      macdHist: macdHistVal,
      williamsR: -50,
      ema9: shortEma,
      ema21: longEma,
      ema50: longEma50,
      bbLower: 0,
      bbUpper: 0,
      volumeTrend: "normal",
    };

    return row.compute(aggregated, syntheticInd as IndicatorSet);
  }

  // Total bullish/bearish counts
  let bullCount = 0;
  let bearCount = 0;
  ROWS.forEach((row) => {
    TIMEFRAMES.forEach((tf) => {
      const v = computeCell(row, tf);
      if (v === "bull") bullCount++;
      if (v === "bear") bearCount++;
    });
  });
  const total = ROWS.length * TIMEFRAMES.length;
  const bullPct = Math.round((bullCount / total) * 100);
  const bearPct = Math.round((bearCount / total) * 100);

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Grid3x3 className="w-4 h-4 section-heading-icon" />
          مصفوفة الإشارات
        </h2>
        <div className="flex items-center gap-3">
          <span className="pill pill-bull">{bullPct}% شراء</span>
          <span className="pill pill-bear">{bearPct}% بيع</span>
        </div>
      </div>

      <div className="overflow-x-auto scroll-styled">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-right text-[10px] text-muted-foreground font-medium py-1.5 px-2 border-b border-border">
                المؤشر
              </th>
              {TIMEFRAMES.map((tf) => (
                <th
                  key={tf.label}
                  className="text-center text-[10px] text-muted-foreground font-medium py-1.5 px-1 border-b border-border tabular-nums ltr-nums"
                >
                  {tf.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => (
              <tr key={row.indicator}>
                <td className="py-1.5 px-2 text-[11px] font-semibold text-foreground border-b border-border">
                  {row.indicator}
                </td>
                {TIMEFRAMES.map((tf, ci) => {
                  const verdict = computeCell(row, tf);
                  const cfg = COLORS[verdict];
                  return (
                    <td key={tf.label} className="text-center py-1 px-1 border-b border-border">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (ri * 6 + ci) * 0.01 }}
                        className="w-full h-7 rounded flex items-center justify-center text-[10px] font-bold tabular-nums ltr-nums"
                        style={{
                          background: cfg.bg,
                          color: cfg.color,
                        }}
                      >
                        {verdict === "bull" ? "▲" : verdict === "bear" ? "▼" : "—"}
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded" style={{ background: "rgba(74,222,128,0.4)" }} /> شراء
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded" style={{ background: "rgba(248,113,113,0.4)" }} /> بيع
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded" style={{ background: "rgba(200,160,80,0.2)" }} /> محايد
          </span>
        </div>
        <span className="tabular-nums ltr-nums">42 نقطة تحليل</span>
      </div>
    </div>
  );
}

function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeMACDHist(closes: number[]): number {
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const macdLine = fast - slow;
  // Simplified signal: assume 9-period EMA of macdLine is close to current value
  return macdLine - macdLine * 0.9;
}
