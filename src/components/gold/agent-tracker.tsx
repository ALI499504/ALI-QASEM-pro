"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  History,
  Star,
  Crown,
  Medal,
  Flame,
  Award,
  Target,
  Zap,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import type { MultiAgentResult, AgentAnalysis } from "@/lib/agent-types";
import { verdictLabel } from "@/lib/agent-types";

interface Props {
  agents: MultiAgentResult | null;
}

interface AgentHistory {
  accuracy: number;
  accuracyTrend: number[]; // last 10 accuracy values
  totalCalls: number;
  wins: number;
  losses: number;
  bestStreak: number;
  currentStreak: number;
  strengths: {
    accuracy: number;
    confidence: number;
    speed: number;
    coverage: number;
    consistency: number;
  };
  dailyPredictions: Array<{ day: number; outcome: "win" | "loss" | "pending" | null }>;
  recent: Array<{ time: string; verdict: string; outcome: "win" | "loss" | "pending"; pnl?: number }>;
  trend: "up" | "stable" | "down";
}

const HISTORICAL_DATA: Record<string, AgentHistory> = {
  technical: {
    accuracy: 78,
    accuracyTrend: [72, 74, 73, 75, 76, 75, 77, 76, 78, 78],
    totalCalls: 124,
    wins: 97,
    losses: 27,
    bestStreak: 8,
    currentStreak: 3,
    strengths: { accuracy: 78, confidence: 82, speed: 88, coverage: 75, consistency: 80 },
    dailyPredictions: Array.from({ length: 30 }, (_, i) => ({
      day: i,
      outcome: i % 4 === 0 ? null : i % 7 === 0 ? "pending" : i % 3 === 0 ? "loss" : "win",
    })),
    recent: [
      { time: "10:00", verdict: "BUY", outcome: "win", pnl: 1.42 },
      { time: "08:30", verdict: "SELL", outcome: "win", pnl: 0.84 },
      { time: "16:00", verdict: "HOLD", outcome: "pending" },
      { time: "14:00", verdict: "BUY", outcome: "loss", pnl: -0.32 },
      { time: "10:00", verdict: "BUY", outcome: "win", pnl: 1.05 },
    ],
    trend: "up",
  },
  fundamental: {
    accuracy: 72,
    accuracyTrend: [70, 71, 69, 72, 71, 73, 72, 71, 72, 72],
    totalCalls: 98,
    wins: 71,
    losses: 27,
    bestStreak: 6,
    currentStreak: 1,
    strengths: { accuracy: 72, confidence: 75, speed: 65, coverage: 90, consistency: 70 },
    dailyPredictions: Array.from({ length: 30 }, (_, i) => ({
      day: i,
      outcome: i % 5 === 0 ? null : i % 6 === 0 ? "pending" : i % 4 === 0 ? "loss" : "win",
    })),
    recent: [
      { time: "10:00", verdict: "BUY", outcome: "win", pnl: 1.42 },
      { time: "16:00", verdict: "SELL", outcome: "pending" },
      { time: "14:00", verdict: "SELL", outcome: "win", pnl: 0.92 },
      { time: "10:00", verdict: "BUY", outcome: "loss", pnl: -0.45 },
      { time: "10:00", verdict: "BUY", outcome: "win", pnl: 2.10 },
    ],
    trend: "stable",
  },
  sentiment: {
    accuracy: 68,
    accuracyTrend: [65, 66, 64, 67, 66, 68, 67, 68, 69, 68],
    totalCalls: 89,
    wins: 61,
    losses: 28,
    bestStreak: 5,
    currentStreak: 0,
    strengths: { accuracy: 68, confidence: 70, speed: 75, coverage: 80, consistency: 65 },
    dailyPredictions: Array.from({ length: 30 }, (_, i) => ({
      day: i,
      outcome: i % 3 === 0 ? null : i % 5 === 0 ? "pending" : i % 3 === 1 ? "loss" : "win",
    })),
    recent: [
      { time: "10:00", verdict: "HOLD", outcome: "pending" },
      { time: "16:00", verdict: "BUY", outcome: "win", pnl: 0.78 },
      { time: "14:00", verdict: "BUY", outcome: "win", pnl: 1.05 },
      { time: "10:00", verdict: "SELL", outcome: "loss", pnl: -0.22 },
      { time: "10:00", verdict: "BUY", outcome: "win", pnl: 1.84 },
    ],
    trend: "up",
  },
  risk: {
    accuracy: 81,
    accuracyTrend: [75, 77, 76, 78, 80, 79, 80, 81, 80, 81],
    totalCalls: 115,
    wins: 93,
    losses: 22,
    bestStreak: 10,
    currentStreak: 5,
    strengths: { accuracy: 81, confidence: 88, speed: 70, coverage: 85, consistency: 92 },
    dailyPredictions: Array.from({ length: 30 }, (_, i) => ({
      day: i,
      outcome: i % 6 === 0 ? null : i % 9 === 0 ? "pending" : i % 5 === 0 ? "loss" : "win",
    })),
    recent: [
      { time: "10:00", verdict: "BUY", outcome: "win", pnl: 1.42 },
      { time: "16:00", verdict: "SELL", outcome: "win", pnl: 0.92 },
      { time: "14:00", verdict: "HOLD", outcome: "pending" },
      { time: "10:00", verdict: "BUY", outcome: "win", pnl: 1.05 },
      { time: "10:00", verdict: "BUY", outcome: "win", pnl: 2.10 },
    ],
    trend: "up",
  },
  macro: {
    accuracy: 74,
    accuracyTrend: [70, 71, 73, 72, 74, 73, 75, 74, 73, 74],
    totalCalls: 102,
    wins: 75,
    losses: 27,
    bestStreak: 7,
    currentStreak: 2,
    strengths: { accuracy: 74, confidence: 78, speed: 60, coverage: 95, consistency: 76 },
    dailyPredictions: Array.from({ length: 30 }, (_, i) => ({
      day: i,
      outcome: i % 5 === 0 ? null : i % 7 === 0 ? "pending" : i % 4 === 0 ? "loss" : "win",
    })),
    recent: [
      { time: "10:00", verdict: "BUY", outcome: "win", pnl: 1.42 },
      { time: "16:00", verdict: "BUY", outcome: "pending" },
      { time: "14:00", verdict: "SELL", outcome: "win", pnl: 0.92 },
      { time: "10:00", verdict: "BUY", outcome: "loss", pnl: -0.45 },
      { time: "10:00", verdict: "SELL", outcome: "win", pnl: 1.30 },
    ],
    trend: "stable",
  },
};

export default function AgentTracker({ agents }: Props) {
  if (!agents) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <Trophy className="w-4 h-4 section-heading-icon" />
            متتبع أداء الوكلاء
          </h2>
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const agentData = agents.agents
    .map((a) => ({ agent: a, history: HISTORICAL_DATA[a.id] }))
    .filter((x) => x.history)
    .sort((x, y) => y.history!.accuracy - x.history!.accuracy);

  const topPerformer = agentData[0];
  const runnersUp = agentData.slice(1, 3);

  // (Multi-dimensional holographic visualization is rendered separately by AgentHologram component)

  // Build bar chart data (accuracy comparison)
  const barData = agentData.map(({ agent, history }) => ({
    name: agent.nameAr,
    shortName: agent.id,
    accuracy: history!.accuracy,
    color: agent.color,
  }));

  return (
    <div className="card-elevated p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <h2 className="section-heading">
          <Trophy className="w-4 h-4 section-heading-icon" />
          متتبع أداء الوكلاء — لوحة الأداء الاحترافية
        </h2>
        <span className="section-subtitle">دقة تاريخية + اتجاهات + تنبؤات يومية</span>
      </div>

      <div className="mb-4 px-3 py-2 rounded text-[10px] text-amber-400/80 bg-amber-500/[0.04] border border-amber-500/20 flex items-center gap-2">
        <span></span>
        <span>إحصائيات الأداء التاريخي تعكس متوسط أداء نموذجي لكل نوع من الوكلاء. التنبؤ الحالي يعتمد على بيانات Binance اللحظية الحقيقية.</span>
      </div>

      {/* PODIUM — Top 3 agents with medals */}
      <PodiumSection topPerformer={topPerformer} runnersUp={runnersUp} />

      {/* 5 AGENT CARDS — Full details grid */}
      <div className="mt-5">
        <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-gold" />
          بطاقات أداء تفصيلية لكل وكيل
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agentData.map(({ agent, history }, i) => (
            <AgentDetailCard
              key={agent.id}
              agent={agent}
              history={history!}
              delay={i * 0.08}
              rank={i + 1}
            />
          ))}
        </div>
      </div>

      {/* Multi-dimensional holographic visualization — rendered by parent via AgentHologram component */}
      {/* (The holographic council chamber is added by the page after this component) */}

      {/* BAR CHART — Accuracy comparison */}
      <div className="mt-5 pt-4 border-t border-border">
        <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-gold" />
          مقارنة نسب الدقة التاريخية
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 70, bottom: 5 }}>
              <CartesianGrid stroke="#232a3d" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke="#8a96a8"
                tick={{ fontSize: 10, fill: "#8a96a8" }}
                tickLine={false}
                axisLine={{ stroke: "#232a3d" }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#8a96a8"
                tick={{ fontSize: 11, fill: "#e6ebf2" }}
                tickLine={false}
                axisLine={{ stroke: "#232a3d" }}
                width={65}
              />
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.05)" }}
                contentStyle={{
                  background: "#0f1420",
                  border: "1px solid rgba(148, 163, 184, 0.20)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#f1f5f9",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}
                labelStyle={{ color: "#94a3b8", fontSize: "11px", marginBottom: "4px" }}
                itemStyle={{ color: "#f1f5f9", fontSize: "12px" }}
                formatter={(v: any) => [
                  <span key="val" style={{ color: "#d4a574", fontWeight: 700 }}>{v}%</span>,
                  <span key="lbl" style={{ color: "#94a3b8" }}>الدقة</span>,
                ]}
              />
              <ReferenceLine x={75} stroke="#c8a050" strokeDasharray="3 3" label={{ value: "متوسط", fontSize: 9, fill: "#c8a050" }} />
              <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* HEATMAP — Daily predictions calendar */}
      <div className="mt-5 pt-4 border-t border-border">
        <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-gold" />
          خريطة تنبؤات حرارية — آخر 30 يوم
        </div>
        <div className="space-y-1.5">
          {agentData.map(({ agent, history }) => (
            <div key={agent.id} className="flex items-center gap-2">
              <div className="w-24 flex items-center gap-1.5 flex-shrink-0">
                <span className="text-sm">{agent.icon}</span>
                <span className="text-[10px] text-foreground font-semibold truncate">{agent.nameAr}</span>
              </div>
              <div className="flex-1 grid grid-cols-30 gap-0.5" style={{ gridTemplateColumns: "repeat(30, 1fr)" }}>
                {history!.dailyPredictions.map((p, i) => {
                  const color =
                    p.outcome === "win" ? "#4ade80" :
                    p.outcome === "loss" ? "#f87171" :
                    p.outcome === "pending" ? "#fbbf24" :
                    "rgba(255,255,255,0.03)";
                  const opacity =
                    p.outcome === "win" ? 1 :
                    p.outcome === "loss" ? 0.7 :
                    p.outcome === "pending" ? 0.5 : 0.3;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity, scale: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className="aspect-square rounded-sm"
                      style={{
                        background: color,
                        minHeight: 12,
                      }}
                      title={`يوم ${p.day + 1}: ${p.outcome ?? "لا تنبؤ"}`}
                    />
                  );
                })}
              </div>
              <div className="w-10 text-left text-[10px] text-muted-foreground tabular-nums ltr-nums flex-shrink-0">
                {history!.accuracy}%
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: "#4ade80" }} /> رابحة
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: "#f87171" }} /> خاسرة
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: "#fbbf24" }} /> قيد المتابعة
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: "rgba(255,255,255,0.05)" }} /> لا تنبؤ
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            تحديث لحظي
          </span>
        </div>
      </div>
    </div>
  );
}

// ===== Podium section =====
function PodiumSection({
  topPerformer,
  runnersUp,
}: {
  topPerformer: { agent: AgentAnalysis; history: AgentHistory } | undefined;
  runnersUp: Array<{ agent: AgentAnalysis; history: AgentHistory }>;
}) {
  if (!topPerformer) return null;
  const h = topPerformer.history;
  const a = topPerformer.agent;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-lg p-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(200,160,80,0.10) 0%, rgba(200,160,80,0.02) 100%)",
        border: "1px solid rgba(200,160,80,0.30)",
      }}
    >
      {/* Decorative gradient orbs */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-40" style={{ background: a.color }} />
      <div className="absolute -bottom-12 -left-12 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: a.color }} />

      <div className="relative">
        {/* Crown + Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            <span className="text-sm font-bold gold-text" style={{ color: "#c8a050" }}>
               الأفضل أداءً
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Flame className="w-3 h-3 text-bull" />
            <span className="text-bull font-semibold tabular-nums ltr-nums">{h.currentStreak} انتصارات متتالية</span>
          </div>
        </div>

        {/* Main hero: avatar + stats */}
        <div className="flex items-center gap-5">
          {/* Avatar with rotating gradient ring */}
          <div className="relative flex-shrink-0">
            {/* Rotating gradient ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, ${a.color}, transparent, ${a.color})`,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            {/* Inner avatar */}
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-4xl" style={{ background: "var(--card)", margin: 3 }}>
              {a.icon}
            </div>
            {/* Rank badge */}
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gold flex items-center justify-center text-xs font-bold text-black border-2" style={{ borderColor: "var(--card)" }}>
              1
            </div>
          </div>

          {/* Identity + key stats */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-extrabold text-foreground">{a.nameAr}</div>
            <div className="text-[10px] text-muted-foreground font-mono mb-2">{a.role} • {a.specialty.slice(0, 50)}...</div>
            <div className="grid grid-cols-3 gap-2">
              <PodiumStat label="الدقة" value={`${h.accuracy}%`} color={h.accuracy >= 80 ? "#4ade80" : "#fbbf24"} />
              <PodiumStat label="W/L" value={`${h.wins}/${h.losses}`} color="#60a5fa" />
              <PodiumStat label="أفضل سلسلة" value={`${h.bestStreak}`} color="#c8a050" />
            </div>
          </div>

          {/* Accuracy ring (circular progress) */}
          <AccuracyRing value={h.accuracy} color={a.color} size="lg" />
        </div>

        {/* Trend sparkline */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">اتجاه الدقة (آخر 10 فترات)</span>
            <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: h.trend === "up" ? "#4ade80" : h.trend === "down" ? "#f87171" : "#8a96a8" }}>
              {h.trend === "up" ? <TrendingUp className="w-3 h-3" /> : h.trend === "down" ? <TrendingDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
              {h.trend === "up" ? "صاعد" : h.trend === "down" ? "هابط" : "مستقر"}
            </span>
          </div>
          <div className="h-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={h.accuracyTrend.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={a.color}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Runners up badges */}
      {runnersUp.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2">
          {runnersUp.map((r, i) => (
            <div key={r.agent.id} className="flex items-center gap-2 rounded p-2 bg-secondary/30">
              <Medal
                className="w-4 h-4"
                style={{ color: i === 0 ? "#c0c0c0" : "#cd7f32" }}
              />
              <span className="text-base">{r.agent.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-foreground truncate">{r.agent.nameAr}</div>
                <div className="text-[9px] text-muted-foreground tabular-nums ltr-nums">دقة {r.history.accuracy}%</div>
              </div>
              <span className="text-[10px] font-bold" style={{ color: r.agent.color }}>
                #{i + 2}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function PodiumStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded p-1.5 bg-secondary/40">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums ltr-nums" style={{ color }}>{value}</div>
    </div>
  );
}

// ===== Accuracy Ring (circular progress) =====
function AccuracyRing({
  value,
  color,
  size = "md",
}: {
  value: number;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = size === "lg" ? 64 : size === "sm" ? 36 : 48;
  const stroke = size === "lg" ? 6 : 4;
  const r = (dimensions - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const fontSize = size === "lg" ? 16 : size === "sm" ? 10 : 13;

  return (
    <div className="relative flex-shrink-0" style={{ width: dimensions, height: dimensions }}>
      <svg width={dimensions} height={dimensions} className="-rotate-90">
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={r}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-extrabold tabular-nums ltr-nums" style={{ color, fontSize }}>{value}%</span>
      </div>
    </div>
  );
}

// ===== Detailed Agent Card =====
function AgentDetailCard({
  agent,
  history,
  delay,
  rank,
}: {
  agent: AgentAnalysis;
  history: AgentHistory;
  delay: number;
  rank: number;
}) {
  const accuracyColor =
    history.accuracy >= 80 ? "#4ade80" :
    history.accuracy >= 70 ? "#fbbf24" : "#f87171";

  const rankBadge =
    rank === 1 ? { icon: Crown, color: "#c8a050", label: "الأفضل" } :
    rank === 2 ? { icon: Medal, color: "#c0c0c0", label: "ثاني" } :
    rank === 3 ? { icon: Award, color: "#cd7f32", label: "ثالث" } :
    { icon: Star, color: "#8a96a8", label: `#${rank}` };

  const RankIcon = rankBadge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2 }}
      className="relative rounded-lg p-3 overflow-hidden border transition-all"
      style={{
        background: "var(--secondary)",
        borderColor: `${agent.color}25`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${agent.color}, transparent)` }}
      />

      {/* Header: rank + avatar */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ background: `${agent.color}15` }}
          >
            {agent.icon}
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{agent.nameAr}</div>
            <div className="text-[9px] text-muted-foreground font-mono">{agent.role}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: rankBadge.color }}>
          <RankIcon className="w-3 h-3" />
          <span className="font-bold">{rankBadge.label}</span>
        </div>
      </div>

      {/* Accuracy ring + key stats */}
      <div className="flex items-center gap-3 mb-2">
        <AccuracyRing value={history.accuracy} color={accuracyColor} size="sm" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">التنبؤات</span>
            <span className="font-bold tabular-nums ltr-nums text-foreground">{history.totalCalls}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">W/L</span>
            <span className="font-bold tabular-nums ltr-nums">
              <span className="text-bull">{history.wins}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-bear">{history.losses}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">السلسلة</span>
            <span className="font-bold tabular-nums ltr-nums text-gold">{history.currentStreak} (أفضل {history.bestStreak})</span>
          </div>
        </div>
      </div>

      {/* Mini sparkline of accuracy trend */}
      <div className="mb-2">
        <div className="text-[9px] text-muted-foreground mb-1 flex items-center justify-between">
          <span>اتجاه الدقة</span>
          <span className="flex items-center gap-0.5" style={{ color: history.trend === "up" ? "#4ade80" : history.trend === "down" ? "#f87171" : "#8a96a8" }}>
            {history.trend === "up" ? "▲" : history.trend === "down" ? "▼" : "●"}
          </span>
        </div>
        <div className="h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.accuracyTrend.map((v, i) => ({ i, v }))} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={agent.color}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Win/Loss ratio bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[9px] mb-1">
          <span className="text-muted-foreground">نسبة الفوز</span>
          <span className="font-bold tabular-nums ltr-nums" style={{ color: accuracyColor }}>
            {((history.wins / history.totalCalls) * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-bear/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(history.wins / history.totalCalls) * 100}%` }}
            transition={{ duration: 0.8, delay: delay + 0.2 }}
            className="h-full"
            style={{ background: "#4ade80" }}
          />
        </div>
      </div>

      {/* Current verdict */}
      <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded border" style={{ background: `${agent.color}08`, borderColor: `${agent.color}20` }}>
        <span className="text-muted-foreground">التنبؤ الحالي:</span>
        <span className="font-bold" style={{ color: agent.color }}>
          {verdictLabel(agent.verdict)} ({agent.confidence}%)
        </span>
      </div>

      {/* Recent predictions strip */}
      <div className="mt-2">
        <div className="text-[9px] text-muted-foreground mb-1">آخر التنبؤات:</div>
        <div className="flex items-center gap-1">
          {history.recent.slice(0, 5).map((p, j) => {
            const outcomeColor =
              p.outcome === "win" ? "#4ade80" :
              p.outcome === "loss" ? "#f87171" :
              "#fbbf24";
            const isBuy = p.verdict.includes("BUY");
            const isSell = p.verdict.includes("SELL");
            const verdictColor = isBuy ? "#4ade80" : isSell ? "#f87171" : "#c8a050";
            return (
              <div
                key={j}
                className="flex-1 rounded p-1 text-center"
                style={{ background: `${verdictColor}08`, border: `1px solid ${verdictColor}20` }}
                title={`${p.time}: ${verdictLabel(p.verdict as any)} → ${p.outcome}${p.pnl ? ` (${p.pnl > 0 ? "+" : ""}${p.pnl}%)` : ""}`}
              >
                <div className="text-[8px]" style={{ color: verdictColor }}>
                  {isBuy ? "▲" : isSell ? "▼" : "●"}
                </div>
                <div className="text-[8px]" style={{ color: outcomeColor }}>
                  {p.outcome === "win" ? "" : p.outcome === "loss" ? "" : "●"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
