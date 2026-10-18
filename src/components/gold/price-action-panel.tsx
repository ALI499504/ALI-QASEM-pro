"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, CheckCircle2, XCircle, Target, TrendingUp } from "lucide-react";

interface PACondition {
  id: string; nameAr: string; passed: boolean; details: string;
}

interface PriceActionSetup {
  isComplete: boolean; message: string;
  conditions: PACondition[];
  trade?: {
    typeAr: string; entry: number; stopLoss: number;
    takeProfit1: number; takeProfit2: number; riskRewardRatio: number;
    lotSize: number; riskAmount: number; potentialProfit: number;
    breakoutLevel: number; retestLevel: number;
    confirmationType: string; confirmationCandle: string;
  };
  analysis: {
    supportLevels: number[]; resistanceLevels: number[];
    keyLevels: { price: number; type: string; touches: number }[];
    breakout: any; retest: any; confirmation: any; nextLevel: number;
  };
  summary: string;
}

export default function PriceActionPanel() {
  const [setup, setSetup] = useState<PriceActionSetup | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchPA() {
    try {
      const res = await fetch("/api/gold/price-action", { cache: "no-store" });
      const data = await res.json();
      setSetup(data);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchPA();
    const t = setInterval(fetchPA, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="card-elevated p-4 border-2 border-blue-500/30">
        <div className="flex items-center gap-2 section-heading mb-3">
          <LineChart className="w-4 h-4 section-heading-icon" />
          Price Action & Structure
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
        <div className="text-[10px] text-muted-foreground text-center">جارٍ تحليل S/R + Breakout + Retest + Confirmation على 1H و 15m...</div>
      </div>
    );
  }

  if (!setup) return null;
  const passed = setup.conditions.filter((c) => c.passed).length;
  const total = setup.conditions.length;

  return (
    <div className={`card-elevated p-4 border-2 ${setup.isComplete ? "border-emerald-500/40" : "border-blue-500/30"}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <LineChart className="w-4 h-4 section-heading-icon" />
          Price Action & Structure
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
          {passed}/{total} شروط
        </span>
      </div>

      {/* Status */}
      <div className={`p-3 rounded-xl mb-3 text-center ${setup.isComplete ? "bg-emerald-500/[0.08] border border-emerald-500/20" : "bg-blue-500/[0.04] border border-blue-500/15"}`}>
        {setup.isComplete && setup.trade ? (
          <>
            <div className="text-2xl mb-1">{setup.trade.typeAr === "شراء (Long)" ? "" : ""}</div>
            <div className="text-sm font-bold text-emerald-400">{setup.message}</div>
            <div className="text-[10px] text-muted-foreground mt-1"> جميع الشروط الخمسة مكتملة</div>
          </>
        ) : (
          <>
            
            <div className="text-xs font-bold text-blue-400">{setup.message}</div>
          </>
        )}
      </div>

      {/* Key S/R Levels */}
      {setup.analysis?.keyLevels?.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-gold" />
            المستويات الرئيسية (1H):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {setup.analysis.keyLevels.slice(0, 6).map((l, i) => (
              <span key={i} className={`text-[10px] px-2 py-1 rounded-full border ${
                l.type === "support" ? "bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-400" : "bg-rose-500/[0.04] border-rose-500/20 text-rose-400"
              }`}>
                ${l.price.toFixed(2)} {l.type === "support" ? "دعم" : "مقاومة"} ×{l.touches}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conditions checklist */}
      <div className="space-y-1.5 mb-3">
        {setup.conditions.map((c) => (
          <div key={c.id} className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] ${
            c.passed ? "bg-emerald-500/[0.04] border-emerald-500/15" : "bg-rose-500/[0.04] border-rose-500/15"
          }`}>
            {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <div className="font-bold text-foreground">{c.nameAr}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{c.details}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Trade details */}
      {setup.isComplete && setup.trade && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-xl bg-gold/[0.04] border border-gold/20 mb-3">
          <div className="text-[10px] text-gold font-bold mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> تقرير التداول:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="stat-box"><div className="stat-label">النوع</div><div className="stat-value text-sm" style={{ color: setup.trade.typeAr.includes("شراء") ? "#22d39a" : "#ff4d6a" }}>{setup.trade.typeAr}</div></div>
            <div className="stat-box"><div className="stat-label">الدخول</div><div className="stat-value text-sm tabular-nums ltr-nums text-gold">${setup.trade.entry.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">وقف الخسارة</div><div className="stat-value text-sm tabular-nums ltr-nums text-rose-400">${setup.trade.stopLoss.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">الهدف 1 (S/R)</div><div className="stat-value text-sm tabular-nums ltr-nums text-emerald-400">${setup.trade.takeProfit1.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">R:R</div><div className="stat-value text-sm text-gold">1:{setup.trade.riskRewardRatio.toFixed(1)}</div></div>
            <div className="stat-box"><div className="stat-label">التأكيد</div><div className="stat-value text-xs text-blue-400">{setup.trade.confirmationType}</div></div>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground grid grid-cols-2 gap-1">
            <div> مستوى الاختراق: ${setup.trade.breakoutLevel.toFixed(2)}</div>
            <div> إعادة الاختبار: ${setup.trade.retestLevel.toFixed(2)}</div>
          </div>
        </motion.div>
      )}

      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">{setup.summary}</div>
    </div>
  );
}
