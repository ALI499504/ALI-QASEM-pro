"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, XCircle, Target } from "lucide-react";

interface FBCondition { id: string; nameAr: string; passed: boolean; details: string; }
interface FalseBreakoutSetup {
  isComplete: boolean; message: string; conditions: FBCondition[];
  trade?: any;
  analysis: any;
  summary: string;
}

export default function FalseBreakoutPanel() {
  const [setup, setSetup] = useState<FalseBreakoutSetup | null>(null);
  const [loading, setLoading] = useState(true);
  async function fetchFB() { try { const r = await fetch("/api/gold/false-breakout", { cache: "no-store" }); setSetup(await r.json()); } catch {} finally { setLoading(false); } }
  useEffect(() => { fetchFB(); const t = setInterval(fetchFB, 60000); return () => clearInterval(t); }, []);

  if (loading) return (
    <div className="card-elevated p-4 border-2 border-amber-500/30">
      <div className="flex items-center gap-2 section-heading mb-3"><AlertTriangle className="w-4 h-4 section-heading-icon" /> False Breakout / Liquidity Trap</div>
      <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>
    </div>
  );
  if (!setup) return null;

  const passed = setup.conditions.filter((c) => c.passed).length;
  const total = setup.conditions.length;
  const isReal = setup.analysis?.isRealBreakout;

  return (
    <div className={"card-elevated p-4 border-2 " + (setup.isComplete ? "border-emerald-500/40" : isReal ? "border-rose-500/40" : "border-amber-500/30")}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading"><AlertTriangle className="w-4 h-4 section-heading-icon" /> False Breakout / Liquidity Trap</h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">{passed}/{total}</span>
      </div>

      <div className={"p-3 rounded-xl mb-3 text-center " + (setup.isComplete ? "bg-emerald-500/[0.08] border border-emerald-500/20" : isReal ? "bg-rose-500/[0.08] border border-rose-500/20" : "bg-amber-500/[0.04] border border-amber-500/15")}>
        {setup.isComplete && setup.trade ? (
          <><div className="text-sm font-bold text-emerald-400">{setup.message}</div></>
        ) : isReal ? (
          <><div className="text-xs font-bold text-rose-400">{setup.message}</div></>
        ) : (
          <><div className="text-xs font-bold text-amber-400">{setup.message}</div></>
        )}
      </div>

      {setup.analysis?.range && (
        <div className="mb-2 grid grid-cols-3 gap-2 text-[10px]">
          <div className="stat-box"><div className="stat-label">قمة النطاق</div><div className="stat-value text-xs tabular-nums ltr-nums text-emerald-400">${setup.analysis.range.top?.toFixed(2)}</div></div>
          <div className="stat-box"><div className="stat-label">قاع النطاق</div><div className="stat-value text-xs tabular-nums ltr-nums text-rose-400">${setup.analysis.range.bottom?.toFixed(2)}</div></div>
          <div className="stat-box"><div className="stat-label">ارتفاع النطاق</div><div className="stat-value text-xs tabular-nums ltr-nums text-gold">${setup.analysis.range.height?.toFixed(2)}</div></div>
        </div>
      )}

      {setup.analysis?.sweep && (
        <div className="mb-2 p-2 rounded-lg bg-secondary/30 border border-border text-[10px]">
          <div className="text-muted-foreground">Sweep: <span className="text-amber-400 font-bold">${setup.analysis.sweep.level?.toFixed(2)}</span></div>
          {setup.analysis.sweep.wickLength > 0 && <div className="text-muted-foreground">Wick: <span className="text-amber-400">${setup.analysis.sweep.wickLength?.toFixed(2)}</span></div>}
          <div className="text-muted-foreground">Closed inside: <span className={setup.analysis.sweep.closedInside ? "text-emerald-400" : "text-rose-400"}>{setup.analysis.sweep.closedInside ? "YES" : "NO"}</span></div>
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        {setup.conditions.map((c) => (
          <div key={c.id} className={"flex items-start gap-2 p-2 rounded-lg border text-[11px] " + (c.passed ? "bg-emerald-500/[0.04] border-emerald-500/15" : "bg-rose-500/[0.04] border-rose-500/15")}>
            {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
            <div className="flex-1"><div className="font-bold text-foreground">{c.nameAr}</div><div className="text-[10px] text-muted-foreground mt-0.5">{c.details}</div></div>
          </div>
        ))}
      </div>

      {setup.isComplete && setup.trade && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-xl bg-gold/[0.04] border border-gold/20 mb-3">
          <div className="text-[10px] text-gold font-bold mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> صفقة الكسر الكاذب:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="stat-box"><div className="stat-label">النوع</div><div className="stat-value text-sm" style={{ color: setup.trade.typeAr.includes("شراء") ? "#22d39a" : "#ff4d6a" }}>{setup.trade.typeAr}</div></div>
            <div className="stat-box"><div className="stat-label">الدخول</div><div className="stat-value text-sm tabular-nums ltr-nums text-gold">${setup.trade.entry?.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">SL (5 pips beyond wick)</div><div className="stat-value text-sm tabular-nums ltr-nums text-rose-400">${setup.trade.stopLoss?.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">TP (opposite range)</div><div className="stat-value text-sm tabular-nums ltr-nums text-emerald-400">${setup.trade.takeProfit1?.toFixed(2)}</div></div>
            <div className="stat-box"><div className="stat-label">R:R</div><div className="stat-value text-sm text-gold">1:{setup.trade.riskRewardRatio?.toFixed(1)}</div></div>
            <div className="stat-box"><div className="stat-label">Sweep Level</div><div className="stat-value text-xs text-amber-400">${setup.trade.sweepLevel?.toFixed(2)}</div></div>
          </div>
        </motion.div>
      )}

      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">{setup.summary}</div>
    </div>
  );
}
