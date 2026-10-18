"use client";

import { motion } from "framer-motion";
import { GitCompare } from "lucide-react";

interface Correlation {
  symbol: string;
  name: string;
  value: number; // -1 to 1
}

// Sample correlation values — historical references (last 6 months, well-documented)
// In a production app, these would be computed from real price history via API.
// These values reflect the long-term statistical relationships between gold and
// other assets. They are NOT real-time — they're educational references.
const CORRELATIONS: Correlation[] = [
  { symbol: "DXY", name: "مؤشر الدولار", value: -0.82 },
  { symbol: "US10Y", name: "عوائد 10 سنوات", value: -0.65 },
  { symbol: "US02Y", name: "عوائد سنتين", value: -0.55 },
  { symbol: "SPX", name: "S&P 500", value: -0.18 },
  { symbol: "BTCUSD", name: "بيتكوين", value: 0.12 },
  { symbol: "WTI", name: "نفط خام", value: 0.34 },
  { symbol: "XAGUSD", name: "فضة", value: 0.78 },
  { symbol: "EURUSD", name: "يورو/دولار", value: 0.42 },
];

function corrColor(v: number): string {
  if (v > 0.5) return "#4ade80";
  if (v > 0.2) return "#86efac";
  if (v > -0.2) return "#8a96a8";
  if (v > -0.5) return "#fca5a5";
  return "#f87171";
}

function corrStrength(v: number): string {
  if (Math.abs(v) > 0.7) return "قوي";
  if (Math.abs(v) > 0.4) return "متوسط";
  if (Math.abs(v) > 0.2) return "ضعيف";
  return "مهمل";
}

export default function CorrelationMatrix() {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <GitCompare className="w-4 h-4 section-heading-icon" />
          مصفوفة الارتباط
        </h2>
        <span className="section-subtitle">ارتباط الذهب التاريخي مع الأصول الأخرى • مرجعي</span>
      </div>

      <div className="mb-2 px-2 py-1 rounded text-[9px] text-amber-400/80 bg-amber-500/[0.04] border border-amber-500/20 flex items-center gap-1.5">
        <span></span>
        <span>قيم مرجعية تاريخية (إحصائية طويلة الأمد) — ليست حسابات لحظية</span>
      </div>

      <div className="space-y-1.5">
        {CORRELATIONS.map((c, i) => {
          const color = corrColor(c.value);
          const widthPct = Math.abs(c.value) * 100;
          const isPositive = c.value >= 0;
          return (
            <motion.div
              key={c.symbol}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3"
            >
              <div className="w-24 flex-shrink-0">
                <div className="text-xs font-bold text-foreground">{c.symbol}</div>
                <div className="text-[10px] text-muted-foreground">{c.name}</div>
              </div>
              <div className="flex-1 relative h-6 rounded bg-secondary border border-border overflow-hidden">
                {/* Center marker */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct / 2}%` }}
                  transition={{ duration: 0.8, delay: i * 0.04 + 0.1 }}
                  className="absolute top-0 h-full"
                  style={{
                    background: color,
                    left: isPositive ? "50%" : `${50 - widthPct / 2}%`,
                  }}
                />
              </div>
              <div className="w-16 text-left">
                <div
                  className="text-xs font-bold tabular-nums ltr-nums"
                  style={{ color }}
                >
                  {c.value >= 0 ? "+" : ""}{c.value.toFixed(2)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {corrStrength(c.value)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground">
         ارتباط سالب قوي مع DXY يعني أن الذهب يرتفع عند انخفاض الدولار
      </div>
    </div>
  );
}
