"use client";

import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";
import type { Candle } from "@/lib/indicators";

interface Props {
  candles: Candle[];
}

const FIB_LEVELS = [
  { pct: 0, label: "0%" },
  { pct: 23.6, label: "23.6%" },
  { pct: 38.2, label: "38.2%" },
  { pct: 50, label: "50%" },
  { pct: 61.8, label: "61.8%" },
  { pct: 78.6, label: "78.6%" },
  { pct: 100, label: "100%" },
  { pct: 161.8, label: "161.8% Ext" },
];

export default function FibonacciLevels({ candles }: Props) {
  if (!candles.length || candles.length < 30) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <GitBranch className="w-4 h-4 section-heading-icon" />
            مستويات فيبوناتشي
          </h2>
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const recent = candles.slice(-30);
  const swingHigh = Math.max(...recent.map((c) => c.high));
  const swingLow = Math.min(...recent.map((c) => c.low));
  const range = swingHigh - swingLow;
  const currentPrice = candles.at(-1)!.close;

  // Calculate fib levels (bullish: from low to high)
  const levels = FIB_LEVELS.map((f) => {
    const value = swingLow + (range * f.pct) / 100;
    const isPremium = f.pct >= 50;
    const isDiscount = f.pct < 50;
    return {
      ...f,
      value,
      isPremium,
      isDiscount,
    };
  });

  // Find current zone
  const currentPct = ((currentPrice - swingLow) / range) * 100;
  const currentZone =
    currentPct >= 50 ? "Premium (منطقة الربح)" : "Discount (منطقة الشراء)";

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <GitBranch className="w-4 h-4 section-heading-icon" />
          مستويات فيبوناتشي
        </h2>
        <span className="section-subtitle">آخر 30 شمعة</span>
      </div>

      {/* Swing info */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="stat-box">
          <div className="stat-label">القمة (Swing High)</div>
          <div className="stat-value text-bear tabular-nums ltr-nums">{swingHigh.toFixed(2)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">القاع (Swing Low)</div>
          <div className="stat-value text-bull tabular-nums ltr-nums">{swingLow.toFixed(2)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">السعر الحالي</div>
          <div className="stat-value text-gold tabular-nums ltr-nums">{currentPrice.toFixed(2)}</div>
        </div>
      </div>

      {/* Premium/Discount indicator */}
      <div className="mb-3 px-3 py-2 rounded border border-border bg-secondary text-[11px] flex items-center justify-between">
        <span className="text-muted-foreground">المنطقة الحالية:</span>
        <span
          className="pill"
          style={{
            background: currentPct >= 50 ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
            color: currentPct >= 50 ? "#f87171" : "#4ade80",
            border: `1px solid ${currentPct >= 50 ? "#f8717130" : "#4ade8030"}`,
          }}
        >
          {currentZone} ({currentPct.toFixed(1)}%)
        </span>
      </div>

      {/* Fib ladder */}
      <div className="space-y-1">
        {[...levels].reverse().map((lvl, i) => {
          // Distance from current price
          const distance = ((currentPrice - lvl.value) / currentPrice) * 100;
          const isAbove = distance < 0;
          const isCurrent = Math.abs(distance) < 0.15;
          return (
            <motion.div
              key={lvl.label}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-2 p-1.5 rounded text-[11px] ${
                isCurrent
                  ? "bg-gold/10 border border-gold/30"
                  : "bg-secondary/40 border border-transparent hover:bg-secondary"
              }`}
            >
              {/* Premium/Discount color */}
              <div
                className="w-1 h-6 rounded-full"
                style={{
                  background: lvl.isPremium ? "#f87171" : "#4ade80",
                  opacity: 0.5,
                }}
              />
              <div className="w-16 text-muted-foreground font-mono">{lvl.label}</div>
              <div className="flex-1 font-bold tabular-nums ltr-nums" style={{ color: isCurrent ? "#c8a050" : "#e6ebf2" }}>
                {lvl.value.toFixed(2)}
              </div>
              {isCurrent ? (
                <span className="pill pill-neutral text-[9px]">السعر هنا</span>
              ) : (
                <div className="text-[9px] text-muted-foreground tabular-nums ltr-nums text-left" style={{ color: isAbove ? "#4ade80" : "#f87171" }}>
                  {isAbove ? "+" : ""}{distance.toFixed(2)}%
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: "#4ade80" }} /> Discount (شراء)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: "#f87171" }} /> Premium (بيع)
        </span>
      </div>
    </div>
  );
}
