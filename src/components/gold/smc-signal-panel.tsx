"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Crosshair, Shield, Target, TrendingUp, Activity, Zap } from "lucide-react";

interface SMCCondition {
  id: string;
  nameAr: string;
  passed: boolean;
  detailsAr: string;
  critical: boolean;
}

interface SMCSetup {
  isComplete: boolean;
  messageAr: string;
  conditions: SMCCondition[];
  trade?: {
    type: string;
    typeAr: string;
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    riskPercent: number;
    riskRewardRatio: number;
    lotSize: number;
    riskAmount: number;
    potentialProfit: number;
    htfTrend: string;
    liquidityType: string;
    chochDirection: string;
    entryZoneType: string;
    entryZoneTop: number;
    entryZoneBottom: number;
  };
  analysis: any;
  summary: string;
}

export default function SMCSignalPanel() {
  const [setup, setSetup] = useState<SMCSetup | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSetup() {
    try {
      const res = await fetch("/api/gold/smc-setup", { cache: "no-store" });
      const data = await res.json();
      setSetup(data);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchSetup();
    const t = setInterval(fetchSetup, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="card-elevated p-4 border-2 border-gold/30">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Crosshair className="w-4 h-4 section-heading-icon" />
          SMC/ICT — متداول المال الذكي الاحترافي
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
        <div className="text-[10px] text-muted-foreground text-center">جارٍ تحليل Daily + 4H + 15m للبحث عن فرصة SMC...</div>
      </div>
    );
  }

  if (!setup) return null;

  const passed = setup.conditions.filter((c) => c.passed).length;
  const total = setup.conditions.length;

  return (
    <div className={`card-elevated p-4 border-2 ${setup.isComplete ? "border-emerald-500/40" : "border-amber-500/30"}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Crosshair className="w-4 h-4 section-heading-icon" />
          SMC/ICT — متداول المال الذكي
        </h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          setup.isComplete
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
        }`}>
          {passed}/{total} شروط
        </span>
      </div>

      {/* Status message */}
      <div className={`p-3 rounded-xl mb-3 text-center ${setup.isComplete ? "bg-emerald-500/[0.08] border border-emerald-500/20" : "bg-amber-500/[0.08] border border-amber-500/20"}`}>
        {setup.isComplete && setup.trade ? (
          <>
            <div className="text-2xl mb-1">{setup.trade.type === "LONG" ? "" : ""}</div>
            <div className="text-lg font-bold" style={{ color: setup.trade.type === "LONG" ? "#22d39a" : "#ff4d6a" }}>
              {setup.trade.typeAr}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1"> جميع الشروط الخمسة مكتملة</div>
          </>
        ) : (
          <>
            
            <div className="text-sm font-bold text-amber-400">لا توجد فرصة مكتملة الشروط حالياً</div>
            <div className="text-[10px] text-muted-foreground mt-1">حسب مدرسة SMC — لم تتحقق كل الشروط الخمسة</div>
          </>
        )}
      </div>

      {/* Conditions checklist */}
      <div className="space-y-1.5 mb-3">
        {setup.conditions.map((c) => (
          <div
            key={c.id}
            className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] ${
              c.passed
                ? "bg-emerald-500/[0.04] border-emerald-500/15"
                : "bg-rose-500/[0.04] border-rose-500/15"
            }`}
          >
            {c.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold text-foreground">{c.nameAr}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{c.detailsAr}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Trade details (if complete) */}
      {setup.isComplete && setup.trade && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 rounded-xl bg-gold/[0.04] border border-gold/20 mb-3"
        >
          <div className="text-[10px] text-gold font-bold mb-2 flex items-center gap-1">
            <Target className="w-3 h-3" />
            تفاصيل الصفقة:
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="stat-box">
              <div className="stat-label">نوع الصفقة</div>
              <div className="stat-value text-sm" style={{ color: setup.trade.type === "LONG" ? "#22d39a" : "#ff4d6a" }}>
                {setup.trade.typeAr}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">نقطة الدخول</div>
              <div className="stat-value text-sm tabular-nums ltr-nums text-gold">${setup.trade.entry.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">وقف الخسارة</div>
              <div className="stat-value text-sm tabular-nums ltr-nums text-rose-400">${setup.trade.stopLoss.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">الهدف 1</div>
              <div className="stat-value text-sm tabular-nums ltr-nums text-emerald-400">${setup.trade.takeProfit1.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">الهدف 2 (رئيسي)</div>
              <div className="stat-value text-sm tabular-nums ltr-nums text-emerald-400">${setup.trade.takeProfit2.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">الهدف 3</div>
              <div className="stat-value text-sm tabular-nums ltr-nums text-emerald-400">${setup.trade.takeProfit3.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <div className="stat-box">
              <div className="stat-label">المخاطرة</div>
              <div className="stat-value text-xs text-rose-400">{setup.trade.riskPercent}% (${setup.trade.riskAmount.toFixed(0)})</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">R:R</div>
              <div className="stat-value text-xs text-gold">1:{setup.trade.riskRewardRatio.toFixed(1)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">حجم العقد</div>
              <div className="stat-value text-xs tabular-nums ltr-nums">{setup.trade.lotSize.toFixed(3)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">الربح المتوقع</div>
              <div className="stat-value text-xs text-emerald-400">+${setup.trade.potentialProfit.toFixed(0)}</div>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-muted-foreground grid grid-cols-2 gap-1">
            <div> الاتجاه: {setup.trade.htfTrend}</div>
            <div> سحب السيولة: {setup.trade.liquidityType}</div>
            <div> CHOCH: {setup.trade.chochDirection}</div>
            <div> الدخول: {setup.trade.entryZoneType}</div>
          </div>
        </motion.div>
      )}

      {/* Summary */}
      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">
        {setup.summary}
      </div>
    </div>
  );
}
