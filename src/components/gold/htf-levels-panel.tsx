"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layers, CheckCircle2, XCircle, Target } from "lucide-react";

interface HTFCondition { id: string; nameAr: string; passed: boolean; details: string; }
interface HTFLevelSetup {
  isComplete: boolean; message: string; conditions: HTFCondition[];
  trade?: any;
  analysis: any;
  summary: string;
}

export default function HTFLevelsPanel() {
  const [setup, setSetup] = useState<HTFLevelSetup | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchHTF() {
    try {
      const r = await fetch("/api/gold/htf-levels", { cache: "no-store" });
      setSetup(await r.json());
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchHTF();
    const t = setInterval(fetchHTF, 60000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="card-elevated p-4 border-2 border-indigo-500/30">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Layers className="w-4 h-4 section-heading-icon" />
          HTF Key Levels (M/W/D)
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!setup) return null;

  const passed = setup.conditions.filter((c) => c.passed).length;
  const total = setup.conditions.length;
  const a = setup.analysis || {};

  return (
    <div className={"card-elevated p-4 border-2 " + (setup.isComplete ? "border-emerald-500/40" : "border-indigo-500/30")}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Layers className="w-4 h-4 section-heading-icon" />
          HTF Key Levels (M/W/D)
        </h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          {passed}/{total}
        </span>
      </div>

      {a.monthlyHigh > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="stat-box text-center">
            <div className="stat-label text-[8px]">Monthly</div>
            <div className="text-[9px] text-emerald-400 tabular-nums ltr-nums">${a.monthlyHigh?.toFixed(0)}</div>
            <div className="text-[9px] text-rose-400 tabular-nums ltr-nums">${a.monthlyLow?.toFixed(0)}</div>
          </div>
          <div className="stat-box text-center">
            <div className="stat-label text-[8px]">Weekly</div>
            <div className="text-[9px] text-emerald-400 tabular-nums ltr-nums">${a.weeklyHigh?.toFixed(0)}</div>
            <div className="text-[9px] text-rose-400 tabular-nums ltr-nums">${a.weeklyLow?.toFixed(0)}</div>
          </div>
          <div className="stat-box text-center">
            <div className="stat-label text-[8px]">Daily</div>
            <div className="text-[9px] text-emerald-400 tabular-nums ltr-nums">${a.dailyHigh?.toFixed(0)}</div>
            <div className="text-[9px] text-rose-400 tabular-nums ltr-nums">${a.dailyLow?.toFixed(0)}</div>
          </div>
        </div>
      )}

      {a.nearestAbove?.price > 0 && (
        <div className="p-2 rounded-lg bg-secondary/30 border border-border mb-2 text-[10px]">
          <div className="text-muted-foreground">
            السعر: <span className="text-gold font-bold tabular-nums ltr-nums">${a.currentPrice?.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-rose-400">تحت: {a.nearestBelow?.label} ${a.nearestBelow?.price?.toFixed(2)}</span>
            <span className="text-emerald-400">فوق: {a.nearestAbove?.label} ${a.nearestAbove?.price?.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className={"p-3 rounded-xl mb-3 text-center " + (setup.isComplete ? "bg-emerald-500/[0.08] border border-emerald-500/20" : "bg-indigo-500/[0.04] border border-indigo-500/15")}>
        {setup.isComplete && setup.trade ? (
          <>
            
            <div className="text-sm font-bold text-emerald-400">{setup.message}</div>
          </>
        ) : (
          <>
            
            <div className="text-xs font-bold text-indigo-400">{setup.message}</div>
          </>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        {setup.conditions.map((c) => (
          <div key={c.id} className={"flex items-start gap-2 p-2 rounded-lg border text-[11px] " + (c.passed ? "bg-emerald-500/[0.04] border-emerald-500/15" : "bg-rose-500/[0.04] border-rose-500/15")}>
            {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <div className="font-bold text-foreground">{c.nameAr}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{c.details}</div>
            </div>
          </div>
        ))}
      </div>

      {setup.isComplete && setup.trade && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-xl bg-gold/[0.04] border border-gold/20 mb-3">
          <div className="text-[10px] text-gold font-bold mb-2 flex items-center gap-1">
            <Target className="w-3 h-3" /> امر التداول HTF:
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="stat-box"><div className="stat-label">النوع</div><div className="stat-value text-sm" style={{ color: setup.trade.typeAr?.includes("شراء") ? "#22d39a" : "#ff4d6a" }}>{setup.trade.typeAr}</div></div>
            <div className="stat-box"><div className="stat-label">الدخول</div><div className="stat-value text-sm tabular-nums ltr-nums text-gold">${setup.trade.entry?.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">SL</div><div className="stat-value text-sm tabular-nums ltr-nums text-rose-400">${setup.trade.stopLoss?.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">TP1</div><div className="stat-value text-sm tabular-nums ltr-nums text-emerald-400">${setup.trade.takeProfit1?.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">R:R</div><div className="stat-value text-sm text-gold">1:{setup.trade.riskRewardRatio?.toFixed(1)}</div></div>
            <div className="stat-box"><div className="stat-label">المستوى المكسور</div><div className="stat-value text-xs text-indigo-400">{setup.trade.brokenLevelType}</div></div>
          </div>
        </motion.div>
      )}

      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">{setup.summary}</div>
    </div>
  );
}
