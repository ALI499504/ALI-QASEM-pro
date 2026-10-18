"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, Target } from "lucide-react";

interface Props {
  strategyId: string | null;
  onClose: () => void;
}

export default function ChartSignalPopup({ strategyId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!strategyId) return;
    setLoading(true);
    setData(null);

    const urls: Record<string, string> = {
      "smc": "/api/gold/smc-setup",
      "wyckoff": "/api/gold/wyckoff",
      "price-action": "/api/gold/price-action",
      "elliott": "/api/gold/elliott-wave",
      "role-reversal": "/api/gold/role-reversal",
      "htf-levels": "/api/gold/htf-levels",
      "false-breakout": "/api/gold/false-breakout",
    };

    const names: Record<string, string> = {
      "smc": "SMC/ICT",
      "wyckoff": "Wyckoff Method",
      "price-action": "Price Action",
      "elliott": "Elliott Wave + Fibonacci",
      "role-reversal": "Role Reversal",
      "htf-levels": "HTF Key Levels",
      "false-breakout": "False Breakout",
    };

    async function fetchData() {
      try {
        const res = await fetch(urls[strategyId], { cache: "no-store" });
        const d = await res.json();
        d._name = names[strategyId];
        setData(d);
      } catch {}
      finally { setLoading(false); }
    }
    fetchData();
  }, [strategyId]);

  if (!strategyId) return null;

  const isComplete = data?.isComplete;
  const conditions = data?.conditions || [];
  const trade = data?.trade;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-96 max-w-[90vw] card-elevated border-2 border-gold/30 rounded-xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-l from-gold/10 to-transparent">
          <div className="text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-gold" />
            {data?._name || "Strategy"}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="p-3 max-h-[60vh] overflow-y-auto scroll-styled">
            {/* Status */}
            <div className={"p-2.5 rounded-lg mb-2 text-center " + (isComplete ? "bg-emerald-500/[0.08] border border-emerald-500/20" : "bg-amber-500/[0.04] border border-amber-500/15")}>
              <div className={"text-sm font-bold " + (isComplete ? "text-emerald-400" : "text-amber-400")}>
                {data.messageAr || data.message || "waiting"}
              </div>
            </div>

            {/* Trade details */}
            {isComplete && trade && (
              <div className="p-2.5 rounded-lg bg-gold/[0.04] border border-gold/20 mb-2">
                <div className="text-[10px] text-gold font-bold mb-1.5">Trade Details:</div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="stat-box p-1.5"><div className="stat-label">Type</div><div className="font-bold" style={{ color: trade.typeAr?.includes("شراء") ? "#22d39a" : "#ff4d6a" }}>{trade.typeAr}</div></div>
                  <div className="stat-box p-1.5"><div className="stat-label">Entry</div><div className="font-bold tabular-nums ltr-nums text-gold">${trade.entry?.toFixed(2)}</div></div>
                  <div className="stat-box p-1.5"><div className="stat-label">SL</div><div className="font-bold tabular-nums ltr-nums text-rose-400">${trade.stopLoss?.toFixed(2)}</div></div>
                  <div className="stat-box p-1.5"><div className="stat-label">TP</div><div className="font-bold tabular-nums ltr-nums text-emerald-400">${trade.takeProfit1?.toFixed(2) || trade.takeProfit?.toFixed(2)}</div></div>
                  {trade.riskRewardRatio && <div className="stat-box p-1.5"><div className="stat-label">R:R</div><div className="font-bold text-gold">1:{trade.riskRewardRatio?.toFixed(1)}</div></div>}
                  {trade.riskPercent && <div className="stat-box p-1.5"><div className="stat-label">Risk</div><div className="font-bold text-rose-400">{trade.riskPercent}%</div></div>}
                </div>
              </div>
            )}

            {/* Conditions */}
            {conditions.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground mb-1">Conditions ({conditions.filter((c: any) => c.passed).length}/{conditions.length}):</div>
                {conditions.map((c: any, i: number) => (
                  <div key={i} className={"flex items-start gap-1.5 p-1.5 rounded border text-[10px] " + (c.passed ? "bg-emerald-500/[0.04] border-emerald-500/15" : "bg-rose-500/[0.04] border-rose-500/15")}>
                    {c.passed ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-semibold">{c.nameAr}</div>
                      <div className="text-[9px] text-muted-foreground">{c.detailsAr || c.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="text-[9px] text-muted-foreground text-center pt-2 mt-2 border-t border-border">
              {data.summary}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground">Failed to load strategy data</div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
