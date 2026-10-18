"use client";

import { motion } from "framer-motion";
import { Star, TrendingUp, TrendingDown } from "lucide-react";

interface Symbol {
  name: string;
  longName: string;
  price: number;
  change: number;
  changePct: number;
}

interface Props {
  symbols: Symbol[];
  active: string;
  onSelect: (name: string) => void;
}

export default function Watchlist({ symbols, active, onSelect }: Props) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Star className="w-4 h-4 text-gold" />
          قائمة المتابعة
        </div>
        <span className="text-[10px] text-muted-foreground">{symbols.length} رموز</span>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto scroll-styled pr-1">
        {symbols.map((s, i) => {
          const up = s.change >= 0;
          const isActive = s.name === active;
          return (
            <motion.button
              key={s.name}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect(s.name)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition text-right ${
                isActive
                  ? "bg-gold/10 border-gold/40 neon-gold"
                  : "bg-white/[0.02] border-white/5 hover:border-gold/30 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${isActive ? "text-gold" : ""}`}>
                  {s.name}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {s.longName}
                </div>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold tabular-nums ltr-nums">
                  {s.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className={`text-[11px] flex items-center gap-0.5 justify-end tabular-nums ltr-nums`}
                  style={{ color: up ? "#22d39a" : "#ff4d6a" }}
                >
                  {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {up ? "+" : ""}
                  {s.change.toFixed(2)}
                  <span className="text-[10px]">({up ? "+" : ""}{s.changePct.toFixed(2)}%)</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
