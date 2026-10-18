"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp, Activity } from "lucide-react";

interface StrategyStatus {
  id: string;
  name: string;
  nameAr: string;
  action: string;
  actionAr: string;
  confidence: number;
  color: string;
  isComplete: boolean;
}

interface DashboardProps {
  onStrategyClick?: (id: string) => void;
}

export default function ChartSignalsDashboard({ onStrategyClick }: DashboardProps) {
  const [strategies, setStrategies] = useState<StrategyStatus[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchAllSignals() {
    const apis = [
      { id: "smc", nameAr: "SMC/ICT", url: "/api/gold/smc-setup" },
      { id: "wyckoff", nameAr: "Wyckoff", url: "/api/gold/wyckoff" },
      { id: "price-action", nameAr: "Price Action", url: "/api/gold/price-action" },
      { id: "elliott", nameAr: "Elliott Wave", url: "/api/gold/elliott-wave" },
      { id: "role-reversal", nameAr: "Role Reversal", url: "/api/gold/role-reversal" },
      { id: "htf-levels", nameAr: "HTF Levels", url: "/api/gold/htf-levels" },
      { id: "false-breakout", nameAr: "False Breakout", url: "/api/gold/false-breakout" },
    ];

    const results: StrategyStatus[] = [];
    for (const api of apis) {
      try {
        const res = await fetch(api.url, { cache: "no-store" });
        const data = await res.json();
        const isComplete = data.isComplete || false;
        let actionAr = data.messageAr || data.message || "waiting";
        if (actionAr.length > 30) actionAr = actionAr.substring(0, 30) + "...";
        const confidence = data.trade?.confidence || data.conditions?.filter((c: any) => c.passed).length * 20 || 0;
        const passed = data.conditions?.filter((c: any) => c.passed).length || 0;
        const total = data.conditions?.length || 5;

        let color = "#8a96a8";
        if (isComplete && data.trade) {
          color = data.trade.type === "LONG" || data.trade.typeAr?.includes("شراء") ? "#22d39a" : "#ff4d6a";
        } else if (passed >= total * 0.6) {
          color = "#fbbf24";
        }

        results.push({
          id: api.id,
          name: api.id,
          nameAr: api.nameAr,
          action: isComplete ? (data.trade?.type || "WAIT") : "WAIT",
          actionAr: isComplete ? (data.trade?.typeAr || actionAr) : actionAr,
          confidence: Math.round(confidence),
          color,
          isComplete,
        });
      } catch {
        results.push({
          id: api.id,
          name: api.id,
          nameAr: api.nameAr,
          action: "WAIT",
          actionAr: "error",
          confidence: 0,
          color: "#8a96a8",
          isComplete: false,
        });
      }
    }

    setStrategies(results);
    setLoading(false);
  }

  useEffect(() => {
    fetchAllSignals();
    const t = setInterval(fetchAllSignals, 60_000);
    return () => clearInterval(t);
  }, []);

  // Calculate consensus
  const buyCount = strategies.filter((s) => s.isComplete && (s.action === "LONG" || s.actionAr.includes("شراء"))).length;
  const sellCount = strategies.filter((s) => s.isComplete && (s.action === "SHORT" || s.actionAr.includes("بيع"))).length;
  const waitCount = strategies.length - buyCount - sellCount;
  const consensus = buyCount > sellCount ? "BUY" : sellCount > buyCount ? "SELL" : "WAIT";
  const consensusColor = consensus === "BUY" ? "#22d39a" : consensus === "SELL" ? "#ff4d6a" : "#fbbf24";
  const consensusAr = consensus === "BUY" ? "شراء" : consensus === "SELL" ? "بيع" : "انتظار";

  if (loading) {
    return (
      <div className="fixed bottom-20 right-5 z-40 w-72 card-elevated p-3 border-2 border-gold/30 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-bold mb-2">
          <Activity className="w-3.5 h-3.5 text-gold" />
          M.ROBOT Dashboard
        </div>
        <div className="flex items-center justify-center py-3">
          <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-5 z-40 w-72 card-elevated border-2 border-gold/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2.5 border-b border-border bg-gradient-to-l from-gold/10 to-transparent">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <Activity className="w-3.5 h-3.5 text-gold" />
          M.ROBOT Signals
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground">
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Consensus */}
            <div className="p-2.5 border-b border-border text-center">
              <div className="text-[9px] text-muted-foreground mb-0.5">الاجماع (7 استراتيجيات)</div>
              <div className="text-base font-bold" style={{ color: consensusColor }}>
                {consensusAr} ({buyCount} شراء / {sellCount} بيع / {waitCount} انتظار)
              </div>
            </div>

            {/* Strategy list */}
            <div className="p-1.5 space-y-1 max-h-60 overflow-y-auto scroll-styled">
              {strategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onStrategyClick?.(s.id)}
                  className="w-full flex items-center justify-between p-1.5 rounded-lg border text-[10px] hover:bg-secondary transition"
                  style={{ borderColor: `${s.color}30`, background: `${s.color}08` }}
                >
                  <span className="font-semibold text-foreground">{s.nameAr}</span>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: s.color }} className="font-bold">
                      {s.isComplete ? (s.actionAr.includes("شراء") ? "BUY" : s.actionAr.includes("بيع") ? "SELL" : "OK") : "WAIT"}
                    </span>
                    {s.isComplete && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
