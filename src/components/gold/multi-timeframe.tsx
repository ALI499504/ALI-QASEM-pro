"use client";

import { motion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Candle } from "@/lib/indicators";
import { ema } from "@/lib/indicators";

interface Props {
  candles: Candle[];
}

interface TimeframeConfig {
  label: string;
  period: number; // candles per "bar" on this timeframe
  shortEma: number;
  longEma: number;
}

const TIMEFRAMES: TimeframeConfig[] = [
  { label: "1m", period: 1, shortEma: 9, longEma: 21 },
  { label: "5m", period: 1, shortEma: 5, longEma: 13 },
  { label: "15m", period: 3, shortEma: 9, longEma: 21 },
  { label: "1H", period: 12, shortEma: 9, longEma: 21 },
  { label: "4H", period: 48, shortEma: 9, longEma: 21 },
  { label: "1D", period: 120, shortEma: 9, longEma: 21 },
];

export default function MultiTimeframePanel({ candles }: Props) {
  if (!candles.length) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <Clock className="w-4 h-4 section-heading-icon" />
            تحليل متعدد الأطر الزمنية
          </h2>
          <span className="section-subtitle">جاري التحميل...</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {TIMEFRAMES.map((tf, i) => (
            <div key={i} className="card-elevated p-3 h-20 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  const signals = TIMEFRAMES.map((tf) => computeSignalForTF(candles, tf));

  // Overall consensus
  const buyCount = signals.filter((s) => s.verdict === "BUY" || s.verdict === "STRONG_BUY").length;
  const sellCount = signals.filter((s) => s.verdict === "SELL" || s.verdict === "STRONG_SELL").length;
  const overallTrend =
    buyCount > sellCount + 1 ? "صاعد" : sellCount > buyCount + 1 ? "هابط" : "متذبذب";
  const overallColor =
    buyCount > sellCount + 1 ? "#4ade80" : sellCount > buyCount + 1 ? "#f87171" : "#c8a050";

  return (
    <section>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Clock className="w-4 h-4 section-heading-icon" />
          تحليل متعدد الأطر الزمنية
        </h2>
        <div className="flex items-center gap-3">
          <span className="section-subtitle">الإجماع:</span>
          <span
            className="pill"
            style={{
              background: `${overallColor}15`,
              color: overallColor,
              border: `1px solid ${overallColor}30`,
            }}
          >
            {overallTrend} ({buyCount} شراء / {sellCount} بيع)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {signals.map((s, i) => (
          <TFCard key={i} signal={s} delay={i * 0.05} />
        ))}
      </div>
    </section>
  );
}

function TFCard({
  signal,
  delay,
}: {
  signal: { label: string; verdict: string; shortEma: number; longEma: number; price: number };
  delay: number;
}) {
  const isBuy = signal.verdict.includes("BUY");
  const isSell = signal.verdict.includes("SELL");
  const color = isBuy ? "#4ade80" : isSell ? "#f87171" : "#c8a050";
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
  const verdictLabel = isBuy ? "شراء" : isSell ? "بيع" : "انتظار";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="card-elevated card-elevated-hover p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-foreground">{signal.label}</span>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div
        className="text-sm font-bold mb-1"
        style={{ color }}
      >
        {verdictLabel}
      </div>
      <div className="text-[10px] text-muted-foreground tabular-nums ltr-nums space-y-0.5">
        <div className="flex justify-between">
          <span>EMA{signal.shortEma}</span>
          <span>{signal.shortEma.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>EMA{signal.longEma}</span>
          <span>{signal.longEma.toFixed(2)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function computeSignalForTF(candles: Candle[], tf: TimeframeConfig) {
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

  const closes = aggregated.map((c) => c.close);
  const shortEma = ema(closes, Math.min(tf.shortEma, closes.length));
  const longEma = ema(closes, Math.min(tf.longEma, closes.length));
  const price = closes.at(-1) ?? 0;

  let verdict = "HOLD";
  if (shortEma > longEma * 1.001 && price > shortEma) verdict = "BUY";
  else if (shortEma > longEma * 1.005) verdict = "STRONG_BUY";
  else if (shortEma < longEma * 0.999 && price < shortEma) verdict = "SELL";
  else if (shortEma < longEma * 0.995) verdict = "STRONG_SELL";

  return {
    label: tf.label,
    verdict,
    shortEma,
    longEma,
    price,
  };
}
