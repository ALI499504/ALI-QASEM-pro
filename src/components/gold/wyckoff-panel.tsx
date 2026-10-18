"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, XCircle, Target, Activity } from "lucide-react";

interface WyckoffCondition {
  id: string; nameAr: string; passed: boolean; details: string;
}

interface WyckoffSetup {
  phase: string; phaseAr: string; phaseDescription: string;
  setupType: string; setupTypeAr: string;
  isEntrySignal: boolean; message: string;
  conditions: WyckoffCondition[];
  trade?: {
    typeAr: string; entry: number; stopLoss: number;
    takeProfit1: number; takeProfit2: number; riskPercent: number;
    riskRewardRatio: number; lotSize: number; riskAmount: number;
    potentialProfit: number; rangeHeight: number; measuredMove: number;
    springLevel: number; creekLevel: number;
  };
  analysis: any;
  summary: string;
}

const PHASE_COLORS: Record<string, string> = {
  NO_SETUP: "#8a96a8", PHASE_A_SC: "#ff4d6a", PHASE_B_RANGE: "#fbbf24",
  PHASE_C_SPRING: "#5b8cff", PHASE_D_JAC: "#a78bfa", PHASE_E_LPS: "#22d39a",
  MARKUP: "#22d39a", MARKDOWN: "#ff4d6a",
};

export default function WyckoffPanel() {
  const [setup, setSetup] = useState<WyckoffSetup | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchWyckoff() {
    try {
      const res = await fetch("/api/gold/wyckoff", { cache: "no-store" });
      const data = await res.json();
      setSetup(data);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchWyckoff();
    const t = setInterval(fetchWyckoff, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="card-elevated p-4 border-2 border-purple-500/30">
        <div className="flex items-center gap-2 section-heading mb-3">
          <BarChart3 className="w-4 h-4 section-heading-icon" />
          تحليل وايكوف (Wyckoff Method)
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
        <div className="text-[10px] text-muted-foreground text-center">جارٍ البحث عن مراحل التجميع/التوزيع...</div>
      </div>
    );
  }

  if (!setup) return null;

  const color = PHASE_COLORS[setup.phase] ?? "#8a96a8";
  const passed = setup.conditions.filter((c) => c.passed).length;
  const total = setup.conditions.length;

  return (
    <div className={`card-elevated p-4 border-2`} style={{ borderColor: `${color}40` }}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <BarChart3 className="w-4 h-4 section-heading-icon" />
          تحليل وايكوف (Wyckoff)
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
          {setup.setupTypeAr} | {passed}/{total}
        </span>
      </div>

      {/* Phase display */}
      <div className="p-3 rounded-xl mb-3 text-center" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
        <div className="text-lg font-bold" style={{ color }}>{setup.phaseAr}</div>
        <div className="text-[10px] text-muted-foreground mt-1">{setup.phaseDescription}</div>
      </div>

      {/* Entry signal or status message */}
      <div className={`p-3 rounded-lg mb-3 text-center ${setup.isEntrySignal ? "bg-emerald-500/[0.08] border border-emerald-500/20" : "bg-amber-500/[0.04] border border-amber-500/15"}`}>
        {setup.isEntrySignal ? (
          <>
            <div className="text-2xl mb-1">{setup.trade?.typeAr === "شراء (Long)" ? "" : ""}</div>
            <div className="text-sm font-bold text-emerald-400">{setup.message}</div>
          </>
        ) : (
          <>
            
            <div className="text-xs font-bold text-amber-400">{setup.message}</div>
          </>
        )}
      </div>

      {/* Conditions checklist */}
      <div className="space-y-1.5 mb-3">
        {setup.conditions.map((c) => (
          <div key={c.id} className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] ${c.passed ? "bg-emerald-500/[0.04] border-emerald-500/15" : "bg-rose-500/[0.04] border-rose-500/15"}`}>
            {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <div className="font-bold text-foreground">{c.nameAr}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{c.details}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Trade details if entry signal */}
      {setup.isEntrySignal && setup.trade && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-xl bg-gold/[0.04] border border-gold/20 mb-3">
          <div className="text-[10px] text-gold font-bold mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> تفاصيل صفقة وايكوف:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="stat-box"><div className="stat-label">النوع</div><div className="stat-value text-sm" style={{ color: setup.trade.typeAr.includes("شراء") ? "#22d39a" : "#ff4d6a" }}>{setup.trade.typeAr}</div></div>
            <div className="stat-box"><div className="stat-label">الدخول</div><div className="stat-value text-sm tabular-nums ltr-nums text-gold">${setup.trade.entry.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">وقف الخسارة</div><div className="stat-value text-sm tabular-nums ltr-nums text-rose-400">${setup.trade.stopLoss.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">الهدف 1</div><div className="stat-value text-sm tabular-nums ltr-nums text-emerald-400">${setup.trade.takeProfit1.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">الهدف 2 (Measured Move)</div><div className="stat-value text-sm tabular-nums ltr-nums text-emerald-400">${setup.trade.takeProfit2.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">R:R</div><div className="stat-value text-sm text-gold">1:{setup.trade.riskRewardRatio.toFixed(1)}</div></div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
            <div className="stat-box"><div className="stat-label">ارتفاع النطاق</div><div className="stat-value text-xs tabular-nums ltr-nums">${setup.trade.rangeHeight.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">Measured Move</div><div className="stat-value text-xs tabular-nums ltr-nums">${setup.trade.measuredMove.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">Spring Level</div><div className="stat-value text-xs tabular-nums ltr-nums">${setup.trade.springLevel.toFixed(2)}</div></div>
          </div>
        </motion.div>
      )}

      {/* Analysis details */}
      {setup.analysis?.rangeTop && (
        <div className="mb-2 grid grid-cols-3 gap-2 text-[10px]">
          <div className="stat-box"><div className="stat-label">قمة النطاق</div><div className="stat-value text-xs tabular-nums ltr-nums text-emerald-400">${setup.analysis.rangeTop?.toFixed(2)}</div></div>
          <div className="stat-box"><div className="stat-label">قاع النطاق</div><div className="stat-value text-xs tabular-nums ltr-nums text-rose-400">${setup.analysis.rangeBottom?.toFixed(2)}</div></div>
          <div className="stat-box"><div className="stat-label">متوسط الحجم</div><div className="stat-value text-xs tabular-nums ltr-nums">{setup.analysis.avgVolume?.toFixed(0)}</div></div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">{setup.summary}</div>
    </div>
  );
}
