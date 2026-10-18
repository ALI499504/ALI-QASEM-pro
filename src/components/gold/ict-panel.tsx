"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layers, TrendingUp, TrendingDown, Zap } from "lucide-react";

interface ICTResponse {
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
  components: {
    orderBlocks: { bullish: any[]; bearish: any[]; activeBlock: any };
    fvgs: { bullish: any[]; bearish: any[]; activeFvg: any };
    liquidity: { buySide: number[]; sellSide: number[]; recentSweep: any };
    marketStructure: { trend: string; lastBOS: any; lastCHoCH: any };
    checklist: { label: string; passed: boolean }[];
  };
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

export default function ICTPanel() {
  const [data, setData] = useState<ICTResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setIntervalT] = useState("15m");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/gold/ict?interval=${interval}&balance=1000`);
        if (r.ok) {
          const j = await r.json();
          if (mounted) setData(j);
        }
      } catch (e) {
        // silent
      } finally {
        if (mounted) setLoading(false);
      }
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
          <Layers className="w-4 h-4 text-[#d4a574]" />
          <h3 className="text-sm font-bold text-white">ICT Strategy</h3>
        </div>
        <div className="flex gap-1">
          {["5m", "15m", "1h"].map((t) => (
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
        <div className="text-xs text-[#6b7280] text-center py-4">جاري تحليل ICT...</div>
      ) : data ? (
        <div className="space-y-3">
          {/* Action */}
          <div className="rounded-lg p-2 border" style={{ backgroundColor: `${color}10`, borderColor: `${color}40` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] text-[#6b7280] uppercase">الإجراء</div>
                <div className="text-lg font-bold" style={{ color }}>{actionAr[data.action] || data.action}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#6b7280]">الثقة</div>
                <div className="text-lg font-bold text-white">{data.confidence}%</div>
              </div>
            </div>
          </div>

          {/* Levels */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">الدخول</div>
              <div className="text-white font-bold">${data.entryPrice.toFixed(2)}</div>
            </div>
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">الوقف</div>
              <div className="text-[#ef4444] font-bold">${data.stopLoss.toFixed(2)}</div>
            </div>
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">TP1 (R:R 1:1.5)</div>
              <div className="text-[#22d39a] font-bold">${data.takeProfit1.toFixed(2)}</div>
            </div>
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">TP2 (1:2)</div>
              <div className="text-[#22d39a] font-bold">${data.takeProfit2.toFixed(2)}</div>
            </div>
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">TP3 (1:3)</div>
              <div className="text-[#22d39a] font-bold">${data.takeProfit3.toFixed(2)}</div>
            </div>
            <div className="bg-[#1a2030] rounded p-2">
              <div className="text-[#6b7280]">اللوت</div>
              <div className="text-[#d4a574] font-bold">{data.lotSize.toFixed(2)}</div>
            </div>
          </div>

          {/* Components summary */}
          <div className="bg-[#1a2030] rounded p-2 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">البنية:</span>
              <span className="text-white">{data.components.marketStructure.trend === "bullish" ? "صاعدة" : data.components.marketStructure.trend === "bearish" ? "هابطة" : "متذبذبة"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">OB صاعد/هابط:</span>
              <span className="text-white">{data.components.orderBlocks.bullish.length} / {data.components.orderBlocks.bearish.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">FVG صاعد/هابط:</span>
              <span className="text-white">{data.components.fvgs.bullish.length} / {data.components.fvgs.bearish.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">اجتياح سيولة:</span>
              <span className="text-white">{data.components.liquidity.recentSweep ? (data.components.liquidity.recentSweep.type === "buy-side" ? "شرائية فوق" : "بيعية تحت") : "لا"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">R:R:</span>
              <span className="text-white font-bold">1:{data.riskRewardRatio.toFixed(2)} (min 1.3)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">المخاطرة:</span>
              <span className="text-[#f59e0b]">${data.riskAmount.toFixed(2)} (1%)</span>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-1">
            {data.components.checklist.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className={c.passed ? "text-[#22d39a]" : "text-[#ef4444]"}>
                  {c.passed ? "✓" : "✗"}
                </span>
                <span className={c.passed ? "text-[#9ca3af]" : "text-[#6b7280] line-through"}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* Narrative */}
          <div className="text-[10px] text-[#9ca3af] bg-[#1a2030]/50 rounded p-2 border border-[#1a2030]">
            {data.narrative}
          </div>
        </div>
      ) : (
        <div className="text-xs text-[#6b7280] text-center py-4">فشل تحميل ICT</div>
      )}
    </motion.div>
  );
}
