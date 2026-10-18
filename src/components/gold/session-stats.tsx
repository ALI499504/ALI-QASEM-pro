"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import type { Candle } from "@/lib/indicators";

interface Props {
  candles: Candle[];
}

interface SessionStats {
  name: string;
  nameAr: string;
  flag: string;
  startUTC: number;
  endUTC: number;
  candles: Candle[];
  high: number;
  low: number;
  range: number;
  avgRange: number;
  volatility: "low" | "medium" | "high";
  bullishPct: number;
}

const SESSIONS = [
  { name: "Sydney", nameAr: "سيدني", flag: "", startUTC: 22, endUTC: 7 },
  { name: "Tokyo", nameAr: "طوكيو", flag: "", startUTC: 0, endUTC: 9 },
  { name: "London", nameAr: "لندن", flag: "", startUTC: 8, endUTC: 17 },
  { name: "New York", nameAr: "نيويورك", flag: "", startUTC: 13, endUTC: 22 },
];

export default function SessionStats({ candles }: Props) {
  if (!candles.length) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <BarChart3 className="w-4 h-4 section-heading-icon" />
            إحصائيات الجلسات
          </h2>
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const stats = computeSessionStats(candles);

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <BarChart3 className="w-4 h-4 section-heading-icon" />
          إحصائيات الجلسات
        </h2>
        <span className="section-subtitle">تقلبات ومدى كل جلسة</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {stats.map((s, i) => {
          const volColor = s.volatility === "high" ? "#f87171" : s.volatility === "medium" ? "#fbbf24" : "#4ade80";
          const volLabel = s.volatility === "high" ? "عالية" : s.volatility === "medium" ? "متوسطة" : "منخفضة";
          return (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded border border-border p-3 bg-secondary/30 hover:bg-secondary transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{s.flag}</span>
                  <div>
                    <div className="text-xs font-bold text-foreground">{s.nameAr}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.startUTC.toString().padStart(2, "0")}:00 - {s.endUTC.toString().padStart(2, "0")}:00 UTC
                    </div>
                  </div>
                </div>
                <span
                  className="pill text-[9px]"
                  style={{ background: `${volColor}15`, color: volColor, border: `1px solid ${volColor}30` }}
                >
                  تقلب {volLabel}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <div className="text-muted-foreground">أعلى</div>
                  <div className="font-bold text-bull tabular-nums ltr-nums">{s.high.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">أدنى</div>
                  <div className="font-bold text-bear tabular-nums ltr-nums">{s.low.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">المدى</div>
                  <div className="font-bold text-gold tabular-nums ltr-nums">{s.range.toFixed(2)}</div>
                </div>
              </div>

              {/* Range bar */}
              <div className="mt-2 relative h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (s.range / Math.max(...stats.map((x) => x.range))) * 100)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                  className="absolute top-0 h-full rounded-full"
                  style={{ background: volColor }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>متوسط المدى: <span className="text-foreground tabular-nums ltr-nums">{s.avgRange.toFixed(2)}</span></span>
                <span>صعودي: <span className="text-bull tabular-nums ltr-nums">{s.bullishPct.toFixed(0)}%</span></span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground">
         جلسة نيويورك عادة الأعلى تقلباً (1.5x من المتوسط)، بينما سيدني الأهدأ
      </div>
    </div>
  );
}

function computeSessionStats(candles: Candle[]): SessionStats[] {
  return SESSIONS.map((session) => {
    const sessionCandles = candles.filter((c) => {
      const hour = new Date(c.time * 1000).getUTCHours();
      if (session.startUTC < session.endUTC) {
        return hour >= session.startUTC && hour < session.endUTC;
      }
      return hour >= session.startUTC || hour < session.endUTC;
    });

    const highs = sessionCandles.map((c) => c.high);
    const lows = sessionCandles.map((c) => c.low);
    const ranges = sessionCandles.map((c) => c.high - c.low);
    const high = highs.length ? Math.max(...highs) : 0;
    const low = lows.length ? Math.min(...lows) : 0;
    const range = high - low;
    const avgRange = ranges.length ? ranges.reduce((s, r) => s + r, 0) / ranges.length : 0;
    const allRanges = candles.map((c) => c.high - c.low);
    const overallAvg = allRanges.reduce((s, r) => s + r, 0) / allRanges.length;
    const volatility: SessionStats["volatility"] =
      avgRange > overallAvg * 1.3 ? "high" : avgRange < overallAvg * 0.8 ? "low" : "medium";
    const bullish = sessionCandles.filter((c) => c.close > c.open).length;
    const bullishPct = sessionCandles.length ? (bullish / sessionCandles.length) * 100 : 0;

    return {
      ...session,
      candles: sessionCandles,
      high,
      low,
      range,
      avgRange,
      volatility,
      bullishPct,
    };
  });
}
