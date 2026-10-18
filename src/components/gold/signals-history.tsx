"use client";

import { motion } from "framer-motion";
import { History, Check, Clock, TrendingUp, TrendingDown } from "lucide-react";

interface SignalRecord {
  action: string;
  actionLabel: string;
  price: number;
  confidence: number;
  time: string;
  outcome?: "win" | "loss" | "pending";
  pnl?: number;
}

const SAMPLE: SignalRecord[] = [
  {
    action: "STRONG_BUY",
    actionLabel: "شراء قوي",
    price: 2632.5,
    confidence: 92,
    time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    outcome: "win",
    pnl: 1.42,
  },
  {
    action: "BUY",
    actionLabel: "شراء",
    price: 2625.8,
    confidence: 78,
    time: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    outcome: "win",
    pnl: 0.84,
  },
  {
    action: "SELL",
    actionLabel: "بيع",
    price: 2618.2,
    confidence: 71,
    time: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    outcome: "loss",
    pnl: -0.32,
  },
  {
    action: "BUY",
    actionLabel: "شراء",
    price: 2614.9,
    confidence: 81,
    time: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    outcome: "win",
    pnl: 1.05,
  },
  {
    action: "HOLD",
    actionLabel: "انتظار",
    price: 2609.3,
    confidence: 64,
    time: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    outcome: "pending",
  },
];

export default function SignalsHistory() {
  const wins = SAMPLE.filter((s) => s.outcome === "win").length;
  const losses = SAMPLE.filter((s) => s.outcome === "loss").length;
  const winRate = ((wins / (wins + losses)) * 100).toFixed(0);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <History className="w-4 h-4 text-gold" />
          سجل الإشارات
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold">
            دقة {winRate}%
          </span>
        </div>
      </div>

      {/* Performance bar */}
      <div className="mb-3 px-3 py-2.5 rounded-xl bg-gradient-to-l from-emerald-500/10 to-rose-500/10 border border-white/5">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-emerald-400">{wins} رابحة</span>
          <span className="text-rose-400">{losses} خاسرة</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-rose-500/30 overflow-hidden">
          <div
            className="absolute top-0 right-0 h-full bg-emerald-500/80"
            style={{ width: `${(wins / (wins + losses)) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto scroll-styled pr-1">
        {SAMPLE.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                s.action.includes("BUY")
                  ? "bg-emerald-500/15 text-emerald-400"
                  : s.action.includes("SELL")
                  ? "bg-rose-500/15 text-rose-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              {s.action.includes("BUY") ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : s.action.includes("SELL") ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{s.actionLabel}</span>
                <span className="text-[10px] text-muted-foreground">
                  @ {s.price.toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(s.time).toLocaleTimeString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                • ثقة {s.confidence}%
              </div>
            </div>
            <div className="text-left">
              {s.outcome === "win" && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> +{s.pnl}%
                </span>
              )}
              {s.outcome === "loss" && (
                <span className="text-xs font-bold text-rose-400">{s.pnl}%</span>
              )}
              {s.outcome === "pending" && (
                <span className="text-[10px] text-amber-400">قيد المتابعة</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
