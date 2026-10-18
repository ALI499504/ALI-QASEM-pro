"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Waves, CheckCircle2, XCircle, Target } from "lucide-react";

interface EWCondition {
  id: string; nameAr: string; passed: boolean; details: string;
}

interface ElliottWaveSetup {
  isComplete: boolean; message: string;
  conditions: EWCondition[];
  trade?: {
    typeAr: string; entry: number; stopLoss: number; takeProfit: number;
    riskRewardRatio: number; lotSize: number; riskAmount: number;
    potentialProfit: number; wave1Start: number; wave1End: number;
    wave2End: number; fib61_8: number; fib161_8: number;
    goldenZoneTop: number; goldenZoneBottom: number;
  };
  analysis: {
    wave1: { start: number; end: number; length: number; subWaves: number; detected: boolean };
    wave2: { start: number; end: number; retracementPct: number; inGoldenZone: boolean; detected: boolean };
    fibLevels: { level: string; price: number }[];
    rsiDivergence: { detected: boolean; rsiLow1: number; rsiLow2: number };
    goldenZone: { top: number; bottom: number; price: number; inZone: boolean };
  };
  summary: string;
}

export default function ElliottWavePanel() {
  const [setup, setSetup] = useState<ElliottWaveSetup | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchEW() {
    try {
      const res = await fetch("/api/gold/elliott-wave", { cache: "no-store" });
      const data = await res.json();
      setSetup(data);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchEW();
    const t = setInterval(fetchEW, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="card-elevated p-4 border-2 border-cyan-500/30">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Waves className="w-4 h-4 section-heading-icon" />
          Elliott Wave + Fibonacci
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
        <div className="text-[10px] text-muted-foreground text-center">جارٍ تحليل الموجات ومستويات فيبوناتشي...</div>
      </div>
    );
  }

  if (!setup) return null;

  const passed = setup.conditions.filter((c) => c.passed).length;
  const total = setup.conditions.length;

  return (
    <div className={`card-elevated p-4 border-2 ${setup.isComplete ? "border-emerald-500/40" : "border-cyan-500/30"}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Waves className="w-4 h-4 section-heading-icon" />
          Elliott Wave + Fibonacci
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          {passed}/{total}
        </span>
      </div>

      {/* Status */}
      <div className={`p-3 rounded-xl mb-3 text-center ${setup.isComplete ? "bg-emerald-500/[0.08] border border-emerald-500/20" : "bg-cyan-500/[0.04] border border-cyan-500/15"}`}>
        {setup.isComplete && setup.trade ? (
          <>
            
            <div className="text-sm font-bold text-emerald-400">{setup.message}</div>
            <div className="text-[10px] text-muted-foreground mt-1">جميع شروط الموجة 3 الدافعة مكتملة</div>
          </>
        ) : (
          <>
            
            <div className="text-xs font-bold text-cyan-400">{setup.message}</div>
          </>
        )}
      </div>

      {/* Fibonacci Levels */}
      {setup.analysis?.fibLevels?.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-bold mb-1.5">مستويات فيبوناتشي:</div>
          <div className="grid grid-cols-3 gap-1.5">
            {setup.analysis.fibLevels.map((f, i) => {
              const isGolden = f.level === "50%" || f.level === "61.8%";
              const isTarget = f.level === "161.8% Ext";
              const isEntry = f.level === "100%";
              return (
                <div key={i} className={`p-1.5 rounded text-[9px] text-center border ${
                  isGolden ? "bg-amber-500/[0.08] border-amber-500/30 text-amber-400 font-bold" :
                  isTarget ? "bg-emerald-500/[0.08] border-emerald-500/30 text-emerald-400 font-bold" :
                  isEntry ? "bg-rose-500/[0.08] border-rose-500/30 text-rose-400" :
                  "bg-secondary/30 border-border text-muted-foreground"
                }`}>
                  <div className="font-bold">{f.level}</div>
                  <div className="tabular-nums ltr-nums">${f.price.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wave analysis */}
      {setup.analysis?.wave1?.detected && (
        <div className="mb-2 grid grid-cols-2 gap-2 text-[10px]">
          <div className="stat-box">
            <div className="stat-label">الموجة 1</div>
            <div className="stat-value text-xs tabular-nums ltr-nums text-emerald-400">
              ${setup.analysis.wave1.start.toFixed(0)} → ${setup.analysis.wave1.end.toFixed(0)}
            </div>
            <div className="text-[9px] text-muted-foreground">طول: ${setup.analysis.wave1.length.toFixed(2)} | موجات: {setup.analysis.wave1.subWaves}</div>
          </div>
          {setup.analysis.wave2?.detected && (
            <div className="stat-box">
              <div className="stat-label">الموجة 2 (تصحيح)</div>
              <div className="stat-value text-xs tabular-nums ltr-nums text-amber-400">
                ${setup.analysis.wave2.start.toFixed(0)} → ${setup.analysis.wave2.end.toFixed(0)}
              </div>
              <div className="text-[9px] text-muted-foreground">تصحيح: {setup.analysis.wave2.retracementPct.toFixed(1)}% {setup.analysis.wave2.inGoldenZone ? "(ذهبية!)" : ""}</div>
            </div>
          )}
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
          <div className="text-[10px] text-gold font-bold mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> تقرير تداول الموجة 3:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="stat-box"><div className="stat-label">النوع</div><div className="stat-value text-sm text-emerald-400">{setup.trade.typeAr}</div></div>
            <div className="stat-box"><div className="stat-label">الدخول</div><div className="stat-value text-sm tabular-nums ltr-nums text-gold">${setup.trade.entry.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">وقف الخسارة (بداية الموجة 1)</div><div className="stat-value text-sm tabular-nums ltr-nums text-rose-400">${setup.trade.stopLoss.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">الهدف (161.8% Ext)</div><div className="stat-value text-sm tabular-nums ltr-nums text-emerald-400">${setup.trade.takeProfit.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">R:R</div><div className="stat-value text-sm text-gold">1:{setup.trade.riskRewardRatio.toFixed(1)}</div></div>
            <div className="stat-box"><div className="stat-label">الربح المتوقع</div><div className="stat-value text-sm text-emerald-400">+${setup.trade.potentialProfit.toFixed(0)}</div></div>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground grid grid-cols-2 gap-1">
            <div>Wave 1: ${setup.trade.wave1Start.toFixed(2)} → ${setup.trade.wave1End.toFixed(2)}</div>
            <div>Wave 2 bottom: ${setup.trade.wave2End.toFixed(2)}</div>
            <div>Golden Zone: ${setup.trade.goldenZoneBottom.toFixed(2)} - ${setup.trade.goldenZoneTop.toFixed(2)}</div>
            <div>Fib 161.8%: ${setup.trade.fib161_8.toFixed(2)}</div>
          </div>
        </motion.div>
      )}

      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">{setup.summary}</div>
    </div>
  );
}
