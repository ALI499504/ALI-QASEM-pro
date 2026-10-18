"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";

interface FibResponse {
  action: string;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
  riskAmount: number;
  lotSize: number;
  fib: {
    swingHigh: { price: number; time: number };
    swingLow: { price: number; time: number };
    direction: string;
    retracement: Record<string, number>;
    extension: Record<string, number>;
  };
  activeLevel: { level: string; price: number; type: string } | null;
  checklist: { label: string; passed: boolean }[];
  narrative: string;
  currentPrice: number;
  timestamp: number;
}

const actionColors: Record<string, string> = {
  STRONG_BUY: "#22d39a",
  BUY: "#5b8cff",
  HOLD: "#6b7280",
  SELL: "#f59e0b",
  STRONG_SELL: "#ef4444",
};

const actionAr: Record<string, string> = {
  STRONG_BUY: "شراء قوي",
  BUY: "شراء",
  HOLD: "انتظار",
  SELL: "بيع",
  STRONG_SELL: "بيع قوي",
};

export default function FibonacciPanel() {
  const [data, setData] = useState<FibResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setIntervalT] = useState("1h");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/gold/fibonacci?interval=${interval}&balance=1000`);
        if (r.ok) {
          const j = await r.json();
          if (mounted) setData(j);
        }
      } catch (e) {}
      finally { if (mounted) setLoading(false); }
    };
    load();
    const i = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(i); };
  }, [interval]);

  const color = data ? actionColors[data.action] || "#6b7280" : "#6b7280";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#1a2030] bg-[#0d1117] p-3"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[#d4a574]" />
          <h3 className="text-sm font-bold text-white">Fibonacci</h3>
        </div>
        <div className="flex gap-1">
          {["15m", "1h", "4h"].map((t) => (
            <button
              key={t}
              onClick={() => setIntervalT(t)}
              className={`text-[9px] px-2 py-0.5 rounded transition ${
                interval === t
                  ? "bg-[#d4a574] text-black"
                  : "bg-[#1a2030] text-[#6b7280] hover:bg-[#232a3a]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="text-xs text-[#6b7280] text-center py-4">جاري تحليل Fibonacci...</div>
      ) : data ? (
        <div className="space-y-3">
          <div className="rounded-lg p-2 border" style={{ backgroundColor: `${color}10`, borderColor: `${color}40` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] text-[#6b7280] uppercase">الإجراء</div>
                <div className="text-lg font-bold" style={{ color }}>{actionAr[data.action]}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#6b7280]">الثقة</div>
                <div className="text-lg font-bold text-white">{data.confidence}%</div>
              </div>
            </div>
          </div>

          {/* Swing points */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">القمة (Swing High)</div>
              <div className="text-white font-bold">${data.fib.swingHigh.price.toFixed(2)}</div>
            </div>
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">القاع (Swing Low)</div>
              <div className="text-white font-bold">${data.fib.swingLow.price.toFixed(2)}</div>
            </div>
            <div className="bg-[#1a2030] rounded p-2 col-span-2">
              <div className="text-[#6b7280]">الاتجاه</div>
              <div className="text-white font-bold">{data.fib.direction === "up" ? "صاعد (low → high)" : "هابط (high → low)"}</div>
            </div>
          </div>

          {/* Retracement levels */}
          <div className="bg-[#1a2030] rounded p-2">
            <div className="text-[#d4a574] text-[10px] font-bold mb-1">مستويات التصحيح:</div>
            <div className="space-y-0.5">
              {Object.entries(data.fib.retracement).map(([level, price]) => {
                const isActive = data.activeLevel?.level === level;
                const isGolden = level === "0.618" || level === "0.786";
                return (
                  <div key={level} className={`flex justify-between text-[10px] ${isActive ? "bg-[#d4a574]/20 px-1 rounded" : ""}`}>
                    <span className={isGolden ? "text-[#d4a574] font-bold" : "text-[#6b7280]"}>
                      {level} {isGolden ? "★" : ""}
                    </span>
                    <span className={isGolden ? "text-[#d4a574] font-bold" : "text-white"}>
                      ${(price as number).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extension levels (TPs) */}
          <div className="bg-[#1a2030] rounded p-2">
            <div className="text-[#22d39a] text-[10px] font-bold mb-1">أهداف الامتداد:</div>
            <div className="space-y-0.5">
              {Object.entries(data.fib.extension).map(([level, price]) => (
                <div key={level} className="flex justify-between text-[10px]">
                  <span className="text-[#6b7280]">Ext {level}</span>
                  <span className="text-[#22d39a] font-bold">${(price as number).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trade plan */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">الوقف</div>
              <div className="text-[#ef4444] font-bold">${data.stopLoss.toFixed(2)}</div>
            </div>
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">R:R</div>
              <div className="text-[#d4a574] font-bold">1:{data.riskRewardRatio.toFixed(2)}</div>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-1">
            {data.checklist.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className={c.passed ? "text-[#22d39a]" : "text-[#ef4444]"}>
                  {c.passed ? "✓" : "✗"}
                </span>
                <span className={c.passed ? "text-[#9ca3af]" : "text-[#6b7280] line-through"}>{c.label}</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-[#9ca3af] bg-[#1a2030]/50 rounded p-2 border border-[#1a2030]">
            {data.narrative}
          </div>
        </div>
      ) : (
        <div className="text-xs text-[#6b7280] text-center py-4">فشل تحميل Fibonacci</div>
      )}
    </motion.div>
  );
}
