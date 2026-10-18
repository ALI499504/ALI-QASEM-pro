"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Clock,
  Activity,
  DollarSign,
  Users,
} from "lucide-react";
import type { AISignal } from "@/lib/ai-types";
import type { MultiAgentResult } from "@/lib/agent-types";
import { verdictLabel } from "@/lib/agent-types";

interface Props {
  signal: AISignal | null;
  agents: MultiAgentResult | null;
  currentPrice: number;
}

export default function TradePlan({ signal, agents, currentPrice }: Props) {
  const [today, setToday] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }));
  }, []);

  if (!agents || !signal) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <Users className="w-4 h-4 section-heading-icon" />
            خطة تداول اليوم
          </h2>
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  // Use AGENTS' CONSENSUS as the primary authority
  const consensus = agents.consensus;
  const isBuy = consensus.includes("BUY");
  const isSell = consensus.includes("SELL");
  const accent = isBuy ? "#4ade80" : isSell ? "#f87171" : "#c8a050";
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Activity;

  // Determine premium/discount zone based on consensus
  const premiumDiscount = isBuy ? "Discount Zone (شراء بسعر مخفض)" : isSell ? "Premium Zone (بيع بسعر مرتفع)" : "Mid-range";

  // Trade plan structure — uses signal's entry/SL/TP but consensus direction
  const plan = {
    direction: verdictLabel(consensus),
    entryZone: `${(signal.entry * 0.998).toFixed(2)} - ${signal.entry.toFixed(2)}`,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfits: [signal.takeProfit1, signal.takeProfit2, signal.takeProfit3],
    riskReward: signal.riskReward,
    holdingPeriod: signal.timeframe,
    positionSize: "0.10 - 0.30 لوت (1% مخاطرة)",
    riskScore: agents.consensusConfidence >= 85 ? "منخفض" : agents.consensusConfidence >= 65 ? "متوسط" : "مرتفع",
    riskColor: agents.consensusConfidence >= 85 ? "#4ade80" : agents.consensusConfidence >= 65 ? "#fbbf24" : "#f87171",
  };

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Users className="w-4 h-4 section-heading-icon" />
          خطة تداول اليوم — بإجماع الوكلاء
        </h2>
        <div className="flex items-center gap-2">
          <span className="section-subtitle">{today || "\u00A0"}</span>
        </div>
      </div>

      {/* Direction hero */}
      <div
        className="rounded p-3 mb-3 border"
        style={{
          background: `${accent}08`,
          borderColor: `${accent}30`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ background: `${accent}15`, color: accent }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">قرار الوكلاء الموحد</div>
              <div className="text-lg font-extrabold" style={{ color: accent }}>
                {plan.direction}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-[10px] text-muted-foreground">درجة المخاطرة</div>
            <span
              className="pill"
              style={{ background: `${plan.riskColor}15`, color: plan.riskColor, border: `1px solid ${plan.riskColor}30` }}
            >
              {plan.riskScore}
            </span>
          </div>
        </div>
      </div>

      {/* Plan grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <PlanItem icon={<Target className="w-3 h-3" />} label="منطقة الدخول" value={plan.entryZone} color="#60a5fa" />
        <PlanItem icon={<Shield className="w-3 h-3" />} label="وقف الخسارة" value={`$${plan.stopLoss.toFixed(2)}`} color="#f87171" />
        <PlanItem icon={<TrendingUp className="w-3 h-3" />} label="الهدف الأول" value={`$${plan.takeProfits[0].toFixed(2)}`} color="#4ade80" />
        <PlanItem icon={<TrendingUp className="w-3 h-3" />} label="الهدف الثاني" value={`$${plan.takeProfits[1].toFixed(2)}`} color="#4ade80" />
        <PlanItem icon={<TrendingUp className="w-3 h-3" />} label="الهدف الثالث" value={`$${plan.takeProfits[2].toFixed(2)}`} color="#4ade80" />
        <PlanItem icon={<Activity className="w-3 h-3" />} label="مخاطرة/عائد" value={`1:${plan.riskReward}`} color="#c8a050" />
        <PlanItem icon={<Clock className="w-3 h-3" />} label="فترة الاحتفاظ" value={plan.holdingPeriod} color="#a78bfa" />
        <PlanItem icon={<DollarSign className="w-3 h-3" />} label="حجم العقد المقترح" value={plan.positionSize} color="#fbbf24" />
      </div>

      {/* Premium/Discount zone */}
      <div className="px-3 py-2 rounded bg-secondary border border-border text-[11px] flex items-center justify-between mb-3">
        <span className="text-muted-foreground">المنطقة (SMC):</span>
        <span className="font-semibold" style={{ color: accent }}>{premiumDiscount}</span>
      </div>

      {/* Action plan steps */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-foreground mb-1.5"> خطوات التنفيذ:</div>
        <PlanStep num={1} text={`انتظر إجماع الوكلاء على ${plan.direction} (ثقة ${agents.consensusConfidence}%)`} />
        <PlanStep num={2} text={`ادخل صفقة ${plan.direction} بحجم ${plan.positionSize}`} />
        <PlanStep num={3} text={`ضع وقف الخسارة عند $${plan.stopLoss.toFixed(2)}`} />
        <PlanStep num={4} text={`أهداف الربح: $${plan.takeProfits[0].toFixed(2)} / $${plan.takeProfits[1].toFixed(2)} / $${plan.takeProfits[2].toFixed(2)}`} />
        <PlanStep num={5} text={`أغلق الصفقة قبل نهاية ${plan.holdingPeriod} و راجع موقف الوكلاء`} />
      </div>

      {/* Validity */}
      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
        <span>الخطة صالحة حتى: {new Date(signal.validUntil).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" })}</span>
        <span>الإشارة #{signal.aiModel.slice(0, 12)}</span>
      </div>
    </div>
  );
}

function PlanItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="stat-box">
      <div className="stat-label flex items-center gap-1" style={{ color }}>
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="stat-value tabular-nums ltr-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function PlanStep({ num, text }: { num: number; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: num * 0.05 }}
      className="flex items-start gap-2 text-[11px]"
    >
      <div className="w-4 h-4 rounded-full bg-gold/15 text-gold flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
        {num}
      </div>
      <span className="text-foreground/85">{text}</span>
    </motion.div>
  );
}
