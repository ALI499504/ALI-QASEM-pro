"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  History, TrendingUp, TrendingDown, Activity, Award,
  BarChart3, Target, Zap, Calendar, DollarSign,
  ArrowUp, ArrowDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart, Area, LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import type { Candle } from "@/lib/indicators";
import { ema } from "@/lib/indicators";

interface Props {
  candles: Candle[];
}

type Strategy = "EMA_CROSS" | "RSI_REVERSAL" | "BREAKOUT";

const STRATEGIES: { id: Strategy; name: string; nameAr: string; desc: string }[] = [
  { id: "EMA_CROSS", name: "EMA 9/21 Crossover", nameAr: "تقاطع EMA 9/21", desc: "شراء عند تقاطع EMA9 لـ EMA21 صعوداً، بيع عند العكس" },
  { id: "RSI_REVERSAL", name: "RSI Reversal", nameAr: "انعكاس RSI", desc: "شراء عند RSI<30، بيع عند RSI>70" },
  { id: "BREAKOUT", name: "Channel Breakout", nameAr: "اختراق القناة", desc: "شراء عند اختراق أعلى 20 شمعة، بيع عند كسر أدنى 20" },
];

const INITIAL_BALANCE = 10000;
const CONTRACT_SIZE = 100;
const LOT_SIZE = 0.1;

interface BacktestTrade {
  side: "BUY" | "SELL";
  entry: number;
  exit: number;
  pnl: number;
  time: number;
  exitTime: number;
  bars: number;
}

interface BacktestResult {
  trades: BacktestTrade[];
  finalBalance: number;
  totalReturn: number;
  wins: number;
  losses: number;
  winRate: number;
  maxWin: number;
  maxLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgWin: number;
  avgLoss: number;
  longestWinStreak: number;
  longestLossStreak: number;
  equityCurve: { i: number; balance: number; date: string; drawdown: number }[];
  monthlyReturns: { month: string; return: number; trades: number }[];
  dailyReturns: { date: string; pnl: number; return: number }[];
}

export default function StrategyBacktest({ candles: liveCandles }: Props) {
  const [strategy, setStrategy] = useState<Strategy>("EMA_CROSS");
  const [history, setHistory] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch 3-month historical data
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/gold/history", { cache: "no-store" });
        const data = await res.json();
        if (data?.candles) {
          setHistory(data.candles);
        }
      } catch {}
      setLoading(false);
    }
    fetchHistory();
  }, []);

  // Use historical data for backtest, fall back to live candles
  const backtestCandles = history.length > 0 ? history : liveCandles;

  const result = useMemo(() => runBacktest(backtestCandles, strategy), [backtestCandles, strategy]);

  if (loading || backtestCandles.length < 30) {
    return (
      <div className="card-modern p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <h2 className="section-heading">
            <History className="w-4 h-4 section-heading-icon" />
            Backtest — آخر 3 أشهر
          </h2>
        </div>
        <div className="h-64 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  return (
    <div className="card-modern p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="section-heading">
            <History className="w-4 h-4 section-heading-icon" />
            Backtest — آخر 3 أشهر
          </h2>
          <span className="section-subtitle">
            {backtestCandles.length} شمعة • 1H • {new Date(backtestCandles[0].time * 1000).toLocaleDateString("ar-EG")} → {new Date(backtestCandles.at(-1)!.time * 1000).toLocaleDateString("ar-EG")}
          </span>
        </div>
        {/* Strategy selector */}
        <div className="flex gap-1">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStrategy(s.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition border ${
                strategy === s.id
                  ? "border-gold/40 bg-gold/10 text-gold"
                  : "border-border bg-secondary text-muted-foreground hover:border-border-strong"
              }`}
            >
              {s.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="px-3 py-2 rounded bg-secondary/40 border border-border text-[11px] text-muted-foreground mb-3">
        {STRATEGIES.find((s) => s.id === strategy)?.desc}
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        <MetricCard label="الرصيد النهائي" value={`$${result.finalBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} color={result.totalReturn >= 0 ? "#10b981" : "#f43f5e"} icon={<DollarSign className="w-3 h-3" />} />
        <MetricCard label="إجمالي العائد" value={`${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(1)}%`} color={result.totalReturn >= 0 ? "#10b981" : "#f43f5e"} icon={<TrendingUp className="w-3 h-3" />} />
        <MetricCard label="نسبة النجاح" value={`${result.winRate.toFixed(0)}%`} color="#d4a574" icon={<Target className="w-3 h-3" />} />
        <MetricCard label="معامل الربح" value={result.profitFactor.toFixed(2)} color="#a78bfa" icon={<Award className="w-3 h-3" />} />
        <MetricCard label="نسبة شارب" value={result.sharpeRatio.toFixed(2)} color="#3b82f6" icon={<Activity className="w-3 h-3" />} />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3 text-[10px]">
        <MiniMetric label="عدد الصفقات" value={`${result.trades.length}`} />
        <MiniMetric label="رابحة/خاسرة" value={`${result.wins}/${result.losses}`} />
        <MiniMetric label="أكبر ربح" value={`+$${result.maxWin.toFixed(0)}`} color="#10b981" />
        <MiniMetric label="أكبر خسارة" value={`-$${Math.abs(result.maxLoss).toFixed(0)}`} color="#f43f5e" />
        <MiniMetric label="أقصى تراجع" value={`${result.maxDrawdown.toFixed(1)}%`} color="#f43f5e" />
        <MiniMetric label="أطول سلسلة رابحة" value={`${result.longestWinStreak}`} color="#10b981" />
      </div>

      {/* Equity Curve — full 3 months */}
      <div className="mb-3">
        <div className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-gold" />
          منحنى الملكية — 3 أشهر
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result.equityCurve} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={result.totalReturn >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={result.totalReturn >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.08)" }}
                interval={Math.floor(result.equityCurve.length / 6)}
                tickFormatter={(v) => v}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.08)" }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                width={36}
              />
              <Tooltip
                cursor={{ stroke: "#d4a574", strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "#0f1420",
                  border: "1px solid rgba(148,163,184,0.20)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#f1f5f9",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}
                labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
                itemStyle={{ color: "#f1f5f9" }}
                formatter={(v: any) => [<span key="v" style={{ color: "#d4a574", fontWeight: 700 }}>${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>, "الرصيد"]}
              />
              <ReferenceLine y={INITIAL_BALANCE} stroke="#94a3b8" strokeDasharray="2 2" />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={result.totalReturn >= 0 ? "#10b981" : "#f43f5e"}
                strokeWidth={2}
                fill="url(#equityGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Returns + Drawdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* Monthly Returns */}
        <div>
          <div className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gold" />
            العوائد الشهرية
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.monthlyReturns} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} tickFormatter={(v) => `${v}%`} width={32} />
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.05)" }}
                  contentStyle={{ background: "#0f1420", border: "1px solid rgba(148,163,184,0.20)", borderRadius: "6px", fontSize: "12px", color: "#f1f5f9" }}
                  formatter={(v: any) => [`${v > 0 ? "+" : ""}${v}%`, "العائد"]}
                />
                <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                  {result.monthlyReturns.map((entry, i) => (
                    <Cell key={i} fill={entry.return >= 0 ? "#10b981" : "#f43f5e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drawdown */}
        <div>
          <div className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-gold" />
            منحنى التراجع (Drawdown)
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.equityCurve} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} interval={Math.floor(result.equityCurve.length / 4)} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} tickFormatter={(v) => `${v}%`} width={32} />
                <Tooltip
                  cursor={{ stroke: "#f43f5e", strokeDasharray: "3 3" }}
                  contentStyle={{ background: "#0f1420", border: "1px solid rgba(148,163,184,0.20)", borderRadius: "6px", fontSize: "12px", color: "#f1f5f9" }}
                  formatter={(v: any) => [`${v}%`, "التراجع"]}
                />
                <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" strokeWidth={1.5} fill="url(#ddGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top & Bottom Trades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Best trades */}
        <div>
          <div className="text-[11px] font-semibold text-bull mb-1.5 flex items-center gap-1.5">
            <ArrowUp className="w-3.5 h-3.5" /> أفضل 5 صفقات
          </div>
          <div className="space-y-1">
            {result.trades.filter((t) => t.pnl > 0).sort((a, b) => b.pnl - a.pnl).slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-bull/[0.06] border border-bull/15 text-[10px]">
                <span className="font-bold text-bull">{t.side === "BUY" ? "شراء" : "بيع"}</span>
                <span className="text-muted-foreground tabular-nums ltr-nums">${t.entry.toFixed(2)} → ${t.exit.toFixed(2)}</span>
                <span className="font-bold text-bull tabular-nums ltr-nums">+${t.pnl.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Worst trades */}
        <div>
          <div className="text-[11px] font-semibold text-bear mb-1.5 flex items-center gap-1.5">
            <ArrowDown className="w-3.5 h-3.5" /> أسوأ 5 صفقات
          </div>
          <div className="space-y-1">
            {result.trades.filter((t) => t.pnl < 0).sort((a, b) => a.pnl - b.pnl).slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-bear/[0.06] border border-bear/15 text-[10px]">
                <span className="font-bold text-bear">{t.side === "BUY" ? "شراء" : "بيع"}</span>
                <span className="text-muted-foreground tabular-nums ltr-nums">${t.entry.toFixed(2)} → ${t.exit.toFixed(2)}</span>
                <span className="font-bold text-bear tabular-nums ltr-nums">${t.pnl.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-gold" />
          تم اختبار {result.trades.length} صفقة على {backtestCandles.length} شمعة
        </span>
        <span> الأداء السابق لا يضمن النتائج المستقبلية</span>
      </div>

      {/* === Advanced Analytics Section === */}
      <AdvancedAnalytics result={result} candles={backtestCandles} strategy={strategy} />

    </div>
  );
}

// === Advanced Analytics Component ===
function AdvancedAnalytics({ result, candles, strategy }: { result: BacktestResult; candles: Candle[]; strategy: Strategy }) {
  const [tab, setTab] = useState<"montecarlo" | "walkforward" | "kelly" | "rmultiple" | "benchmark">("montecarlo");

  if (result.trades.length < 5) return null;

  return (
    <div className="mt-4 pt-4 border-t-2 border-gold/20">
      <div className="text-[11px] font-bold text-gold mb-2 flex items-center gap-1.5 uppercase tracking-wider font-mono">
        <Activity className="w-3.5 h-3.5" /> Advanced Analytics — تحليلات متقدمة
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {[
          { id: "montecarlo", label: "مونت كارلو" },
          { id: "walkforward", label: "Walk-Forward" },
          { id: "kelly", label: "كيلي + المخاطر" },
          { id: "rmultiple", label: "R-Multiple" },
          { id: "benchmark", label: "مقارنة B&H" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
              tab === t.id ? "border-gold/40 bg-gold/10 text-gold" : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "montecarlo" && <MonteCarloAnalysis trades={result.trades} />}
      {tab === "walkforward" && <WalkForwardAnalysis candles={candles} strategy={strategy} />}
      {tab === "kelly" && <KellyAnalysis result={result} />}
      {tab === "rmultiple" && <RMultipleAnalysis trades={result.trades} />}
      {tab === "benchmark" && <BenchmarkComparison result={result} candles={candles} />}
    </div>
  );
}

// === Monte Carlo Simulation ===
function MonteCarloAnalysis({ trades }: { trades: BacktestTrade[] }) {
  const [iterations] = useState(500);
  const mc = useMemo(() => runMonteCarlo(trades, iterations, INITIAL_BALANCE), [trades, iterations]);

  // Build chart data — equity curves (median + 5th + 95th percentile)
  const chartData = mc.medianCurve.map((val, i) => ({
    i,
    median: Math.round(val),
    p5: Math.round(mc.p5Curve[i]),
    p95: Math.round(mc.p95Curve[i]),
  }));

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
         محاكاة 500 سيناريو بإعادة ترتيب الصفقات عشوائياً — يعرض نطاقات الثقة الإحصائية
      </div>

      {/* MC Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <MiniMetric label="احتمال الربح" value={`${mc.probProfit.toFixed(0)}%`} color="#10b981" />
        <MiniMetric label="متوسط العائد" value={`${mc.avgReturn >= 0 ? "+" : ""}${mc.avgReturn.toFixed(1)}%`} color={mc.avgReturn >= 0 ? "#10b981" : "#f43f5e"} />
        <MiniMetric label="أسوأ سيناريو (5%)" value={`${mc.worstReturn.toFixed(1)}%`} color="#f43f5e" />
        <MiniMetric label="أفضل سيناريو (95%)" value={`+${mc.bestReturn.toFixed(1)}%`} color="#10b981" />
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="mcBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="i" stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} interval={99} tickFormatter={(v) => `${v}`} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} domain={["auto", "auto"]} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={36} />
            <Tooltip
              cursor={{ stroke: "#d4a574", strokeDasharray: "3 3" }}
              contentStyle={{ background: "#0f1420", border: "1px solid rgba(148,163,184,0.20)", borderRadius: "6px", fontSize: "12px", color: "#f1f5f9" }}
              formatter={(v: any, name: string) => [`$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`, name === "p5" ? "أسوأ 5%" : name === "p95" ? "أفضل 95%" : "الوسيط"]}
            />
            {/* Confidence band */}
            <Area type="monotone" dataKey="p95" stroke="none" fill="url(#mcBand)" />
            <Area type="monotone" dataKey="p5" stroke="none" fill="#0f1420" />
            {/* Median line */}
            <Area type="monotone" dataKey="median" stroke="#d4a574" strokeWidth={2} fill="none" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[9px] text-muted-foreground mt-1">
        النطاق الأزرق = نطاق الثقة 90% • الخط الذهبي = المسار المتوقع (الوسيط)
      </div>
    </div>
  );
}

function runMonteCarlo(trades: BacktestTrade[], iterations: number, initialBalance: number) {
  const pnls = trades.map((t) => t.pnl);
  const finalBalances: number[] = [];
  const allCurves: number[][] = [];

  for (let iter = 0; iter < iterations; iter++) {
    // Shuffle PnLs
    const shuffled = [...pnls].sort(() => Math.random() - 0.5);
    let balance = initialBalance;
    const curve: number[] = [balance];
    for (const pnl of shuffled) {
      balance += pnl;
      curve.push(balance);
    }
    finalBalances.push(balance);
    allCurves.push(curve);
  }

  // Sort for percentiles
  finalBalances.sort((a, b) => a - b);

  const avgReturn = (finalBalances.reduce((s, b) => s + (b - initialBalance) / initialBalance * 100, 0) / iterations);
  const probProfit = (finalBalances.filter((b) => b > initialBalance).length / iterations) * 100;
  const worstReturn = ((finalBalances[Math.floor(iterations * 0.05)] - initialBalance) / initialBalance) * 100;
  const bestReturn = ((finalBalances[Math.floor(iterations * 0.95)] - initialBalance) / initialBalance) * 100;

  // Build median + percentile curves
  const curveLen = allCurves[0]?.length ?? 1;
  const medianCurve: number[] = [];
  const p5Curve: number[] = [];
  const p95Curve: number[] = [];

  for (let i = 0; i < curveLen; i++) {
    const values = allCurves.map((c) => c[i]).sort((a, b) => a - b);
    medianCurve.push(values[Math.floor(iterations * 0.5)]);
    p5Curve.push(values[Math.floor(iterations * 0.05)]);
    p95Curve.push(values[Math.floor(iterations * 0.95)]);
  }

  return { avgReturn, probProfit, worstReturn, bestReturn, medianCurve, p5Curve, p95Curve };
}

// === Walk-Forward Analysis ===
function WalkForwardAnalysis({ candles, strategy }: { candles: Candle[]; strategy: Strategy }) {
  const wf = useMemo(() => runWalkForward(candles, strategy), [candles, strategy]);

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
         تقسيم البيانات: 70% تحسين + 30% اختبار خارج العينة (Out-of-Sample)
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <MiniMetric label="عائد In-Sample" value={`${wf.isReturn.toFixed(1)}%`} color={wf.isReturn >= 0 ? "#10b981" : "#f43f5e"} />
        <MiniMetric label="عائد Out-of-Sample" value={`${wf.oosReturn.toFixed(1)}%`} color={wf.oosReturn >= 0 ? "#10b981" : "#f43f5e"} />
        <MiniMetric label="كفاءة Walk-Forward" value={`${wf.efficiency.toFixed(0)}%`} color="#d4a574" />
        <MiniMetric label="صفقات OOS" value={`${wf.oosTrades}`} color="#3b82f6" />
      </div>

      <div className="px-3 py-2 rounded border border-border bg-secondary/30 text-[10px] text-muted-foreground leading-relaxed">
        <span className="text-foreground font-bold">كفاءة Walk-Forward:</span> {wf.efficiency.toFixed(0)}% — نسبة عائد خارج العينة من عائد العينة.
        {wf.efficiency > 50 ? "  استراتيجية صامدة (robust)" : wf.efficiency > 0 ? "  استراتيجية مقبولة لكن قد تكون محسّنة بشكل مفرط" : "  استراتيجية محسّنة بشكل مفرط (overfitted)"}
      </div>
    </div>
  );
}

function runWalkForward(candles: Candle[], strategy: Strategy) {
  const splitIdx = Math.floor(candles.length * 0.7);
  const inSample = candles.slice(0, splitIdx);
  const outSample = candles.slice(splitIdx);

  const isResult = runBacktest(inSample, strategy);
  const oosResult = runBacktest(outSample, strategy);

  const efficiency = isResult.totalReturn !== 0 ? (oosResult.totalReturn / isResult.totalReturn) * 100 : 0;

  return {
    isReturn: isResult.totalReturn,
    oosReturn: oosResult.totalReturn,
    efficiency: Math.max(0, efficiency),
    oosTrades: oosResult.trades.length,
  };
}

// === Kelly Criterion + Risk of Ruin ===
function KellyAnalysis({ result }: { result: BacktestResult }) {
  const kelly = useMemo(() => computeKelly(result), [result]);

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
         معيار كيلي لحجم الصفقة الأمثل + احتمال الإفلاس + Value at Risk
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <MiniMetric label="نسبة كيلي الكاملة" value={`${kelly.fullKelly.toFixed(1)}%`} color="#d4a574" />
        <MiniMetric label="نصف كيلي (مقترح)" value={`${kelly.halfKelly.toFixed(1)}%`} color="#10b981" />
        <MiniMetric label="احتمال الإفلاس" value={`${kelly.riskOfRuin.toFixed(2)}%`} color={kelly.riskOfRuin < 1 ? "#10b981" : "#f43f5e"} />
        <MiniMetric label="VaR (95%)" value={`$${kelly.var95.toFixed(0)}`} color="#f43f5e" />
      </div>

      <div className="px-3 py-2 rounded border border-border bg-secondary/30 text-[10px] text-muted-foreground leading-relaxed space-y-1">
        <div><span className="text-foreground font-bold">معيار كيلي:</span> {kelly.fullKelly.toFixed(1)}% من رأس المال لكل صفقة — لكن يُنصح باستخدام نصف كيلي ({kelly.halfKelly.toFixed(1)}%) لتقليل التقلب</div>
        <div><span className="text-foreground font-bold">احتمال الإفلاس:</span> {kelly.riskOfRuin.toFixed(2)}% — احتمال خسارة كامل رأس المال {kelly.riskOfRuin < 1 ? " آمن جداً" : " مرتفع"}</div>
        <div><span className="text-foreground font-bold">VaR 95%:</span> $${kelly.var95.toFixed(0)} — أقصى خسارة متوقعة في يوم واحد بمستوى ثقة 95%</div>
        <div><span className="text-foreground font-bold">Expectancy:</span> ${kelly.expectancy.toFixed(2)} لكل صفقة — متوسط الربح المتوقع لكل صفقة</div>
      </div>
    </div>
  );
}

function computeKelly(result: BacktestResult) {
  const winRate = result.winRate / 100;
  const lossRate = 1 - winRate;
  const avgWin = result.avgWin || 0;
  const avgLoss = result.avgLoss || 1;
  const payoffRatio = avgWin / avgLoss;

  // Kelly formula: f = W - (L/B)
  const fullKelly = winRate > 0 && payoffRatio > 0 ? Math.max(0, (winRate - lossRate / payoffRatio) * 100) : 0;
  const halfKelly = fullKelly / 2;

  // Risk of Ruin (simplified)
  const edge = winRate * avgWin - lossRate * avgLoss;
  const riskOfRuin = edge > 0 ? Math.pow(lossRate / (payoffRatio * winRate), 100 / Math.max(1, avgLoss)) * 100 : 100;

  // VaR (95%) — based on trade PnL distribution
  const pnls = result.trades.map((t) => t.pnl).sort((a, b) => a - b);
  const var95Idx = Math.floor(pnls.length * 0.05);
  const var95 = Math.abs(pnls[var95Idx] || 0);

  // Expectancy
  const expectancy = (winRate * avgWin) - (lossRate * avgLoss);

  return { fullKelly, halfKelly, riskOfRuin, var95, expectancy };
}

// === R-Multiple Analysis ===
function RMultipleAnalysis({ trades }: { trades: BacktestTrade[] }) {
  const rm = useMemo(() => computeRMultiples(trades), [trades]);

  // Build histogram data
  const histogramData = rm.rMultiples.reduce((acc, r) => {
    const bucket = Math.floor(r * 2) / 2;
    const existing = acc.find((a) => a.bucket === bucket);
    if (existing) existing.count++;
    else acc.push({ bucket, count: 1, label: `${r < 0 ? "" : "+"}${bucket.toFixed(1)}R` });
    return acc;
  }, [] as { bucket: number; count: number; label: string }[]).sort((a, b) => a.bucket - b.bucket);

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
         كل صققة تُقاس بـ R (نسبة الربح/الخسارة للمخاطرة) — المعيار الاحترافي للتنبؤ بالأداء
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <MiniMetric label="متوسط R" value={`${rm.avgR >= 0 ? "+" : ""}${rm.avgR.toFixed(2)}R`} color={rm.avgR >= 0 ? "#10b981" : "#f43f5e"} />
        <MiniMetric label="أفضل صفقة" value={`+${rm.maxR.toFixed(2)}R`} color="#10b981" />
        <MiniMetric label="أسوأ صفقة" value={`${rm.minR.toFixed(2)}R`} color="#f43f5e" />
        <MiniMetric label="Expectancy" value={`${rm.expectancy.toFixed(2)}R`} color="#d4a574" />
      </div>

      {/* R Distribution histogram */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogramData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} width={24} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.05)" }}
              contentStyle={{ background: "#0f1420", border: "1px solid rgba(148,163,184,0.20)", borderRadius: "6px", fontSize: "12px", color: "#f1f5f9" }}
              formatter={(v: any) => [`${v} صفقة`, ""]}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {histogramData.map((entry, i) => (
                <Cell key={i} fill={entry.bucket >= 0 ? "#10b981" : "#f43f5e"} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[9px] text-muted-foreground mt-1">
        توزيع R-Multiple: الأعمدة الخضراء = صفقات رابحة (R موجب) • الحمراء = خاسرة (R سالب)
      </div>
    </div>
  );
}

function computeRMultiples(trades: BacktestTrade[]) {
  // Approximate risk per trade = average loss (or fixed fraction)
  const losses = trades.filter((t) => t.pnl < 0).map((t) => Math.abs(t.pnl));
  const avgRisk = losses.length ? losses.reduce((s, l) => s + l, 0) / losses.length : 100;

  const rMultiples = trades.map((t) => t.pnl / avgRisk);
  const avgR = rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length;
  const maxR = Math.max(...rMultiples);
  const minR = Math.min(...rMultiples);
  const wins = trades.filter((t) => t.pnl > 0);
  const winRate = wins.length / trades.length;
  const expectancy = avgR; // Same as avg R

  return { rMultiples, avgR, maxR, minR, expectancy, winRate };
}

// === Benchmark Comparison (Buy & Hold) ===
function BenchmarkComparison({ result, candles }: { result: BacktestResult; candles: Candle[] }) {
  const bench = useMemo(() => computeBenchmark(candles, result), [candles, result]);

  const chartData = bench.strategyCurve.map((val, i) => ({
    i,
    strategy: Math.round(val),
    buyHold: Math.round(bench.buyHoldCurve[i]),
  }));

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
         مقارنة الاستراتيجية مع الشراء والاحتفاظ (Buy & Hold) — Alpha و Beta
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <MiniMetric label="عائد الاستراتيجية" value={`${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(1)}%`} color={result.totalReturn >= 0 ? "#10b981" : "#f43f5e"} />
        <MiniMetric label="عائد B&H" value={`${bench.buyHoldReturn >= 0 ? "+" : ""}${bench.buyHoldReturn.toFixed(1)}%`} color={bench.buyHoldReturn >= 0 ? "#3b82f6" : "#f43f5e"} />
        <MiniMetric label="Alpha" value={`${bench.alpha >= 0 ? "+" : ""}${bench.alpha.toFixed(1)}%`} color={bench.alpha >= 0 ? "#10b981" : "#f43f5e"} />
        <MiniMetric label="Beta" value={bench.beta.toFixed(2)} color="#d4a574" />
      </div>

      {/* Comparison chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4a574" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#d4a574" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bhGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="i" stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} interval={99} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} domain={["auto", "auto"]} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={36} />
            <Tooltip
              cursor={{ stroke: "#d4a574", strokeDasharray: "3 3" }}
              contentStyle={{ background: "#0f1420", border: "1px solid rgba(148,163,184,0.20)", borderRadius: "6px", fontSize: "12px", color: "#f1f5f9" }}
              formatter={(v: any, name: string) => [`$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`, name === "strategy" ? "الاستراتيجية" : "Buy & Hold"]}
            />
            <ReferenceLine y={INITIAL_BALANCE} stroke="#94a3b8" strokeDasharray="2 2" />
            <Area type="monotone" dataKey="buyHold" stroke="#3b82f6" strokeWidth={1.5} fill="url(#bhGrad)" dot={false} />
            <Area type="monotone" dataKey="strategy" stroke="#d4a574" strokeWidth={2} fill="url(#stratGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[9px] text-muted-foreground mt-1 flex gap-3">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#d4a574" }} /> الاستراتيجية</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} /> Buy & Hold</span>
        {bench.alpha > 0 && <span className="text-bull"> تتفوق على السوق بـ +{bench.alpha.toFixed(1)}%</span>}
      </div>
    </div>
  );
}

function computeBenchmark(candles: Candle[], result: BacktestResult) {
  const startPrice = candles[0]?.close ?? 1000;
  const endPrice = candles.at(-1)?.close ?? 1000;
  const buyHoldReturn = ((endPrice - startPrice) / startPrice) * 100;

  // Buy & Hold equity curve
  const buyHoldCurve: number[] = [];
  const totalCandles = candles.length;
  for (let i = 0; i < totalCandles; i += Math.floor(totalCandles / result.equityCurve.length || 1)) {
    const priceRatio = candles[i]?.close / startPrice;
    buyHoldCurve.push(INITIAL_BALANCE * priceRatio);
  }
  // Pad or trim to match strategy curve length
  while (buyHoldCurve.length < result.equityCurve.length) buyHoldCurve.push(buyHoldCurve.at(-1) ?? INITIAL_BALANCE);
  buyHoldCurve.length = result.equityCurve.length;

  // Strategy equity curve
  const strategyCurve = result.equityCurve.map((e) => e.balance);

  // Alpha = strategy return - market return
  const alpha = result.totalReturn - buyHoldReturn;

  // Beta (simplified — correlation of strategy vs market)
  const strategyReturns = strategyCurve.map((v, i) => i > 0 ? (v - strategyCurve[i - 1]) / strategyCurve[i - 1] : 0);
  const marketReturns = buyHoldCurve.map((v, i) => i > 0 ? (v - buyHoldCurve[i - 1]) / buyHoldCurve[i - 1] : 0);
  const avgStrategy = strategyReturns.reduce((s, r) => s + r, 0) / strategyReturns.length;
  const avgMarket = marketReturns.reduce((s, r) => s + r, 0) / marketReturns.length;
  let cov = 0, varM = 0;
  for (let i = 0; i < strategyReturns.length; i++) {
    cov += (strategyReturns[i] - avgStrategy) * (marketReturns[i] - avgMarket);
    varM += (marketReturns[i] - avgMarket) ** 2;
  }
  const beta = varM > 0 ? cov / varM : 1;

  return { buyHoldReturn, buyHoldCurve, strategyCurve, alpha, beta };
}


function getEntrySignal(strategy: Strategy, i: number, ema9: number[], ema21: number[], rsi: number[], candles: Candle[]): "BUY" | "SELL" | null {
  if (i < 1) return null;
  switch (strategy) {
    case "EMA_CROSS":
      if (ema9[i] > ema21[i] && ema9[i - 1] <= ema21[i - 1]) return "BUY";
      if (ema9[i] < ema21[i] && ema9[i - 1] >= ema21[i - 1]) return "SELL";
      return null;
    case "RSI_REVERSAL":
      if (rsi[i] < 30) return "BUY";
      if (rsi[i] > 70) return "SELL";
      return null;
    case "BREAKOUT": {
      if (i < 20) return null;
      const high = Math.max(...candles.slice(i - 20, i).map((c) => c.high));
      const low = Math.min(...candles.slice(i - 20, i).map((c) => c.low));
      if (candles[i].close > high) return "BUY";
      if (candles[i].close < low) return "SELL";
      return null;
    }
    default: return null;
  }
}

function shouldExit(strategy: Strategy, i: number, ema9: number[], ema21: number[], rsi: number[], pos: { side: "BUY" | "SELL" }): boolean {
  if (i < 1) return false;
  switch (strategy) {
    case "EMA_CROSS":
      return pos.side === "BUY" ? ema9[i] < ema21[i] && ema9[i - 1] >= ema21[i - 1] : ema9[i] > ema21[i] && ema9[i - 1] <= ema21[i - 1];
    case "RSI_REVERSAL":
      return pos.side === "BUY" ? rsi[i] > 60 : rsi[i] < 40;
    case "BREAKOUT":
      return pos.side === "BUY" ? ema9[i] < ema21[i] : ema9[i] > ema21[i];
    default: return false;
  }
}

function computeEmaSeries(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i - 1] * (1 - k));
  return out;
}

function computeRsiSeries(closes: number[], period = 14): number[] {
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { out.push(50); continue; }
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    if (losses === 0) out.push(100); else { const rs = gains / losses; out.push(100 - 100 / (1 + rs)); }
  }
  return out;
}

function computeMonthlyReturns(trades: BacktestTrade[], candles: Candle[]) {
  const months: Record<string, { pnl: number; trades: number }> = {};
  for (const t of trades) {
    const date = new Date(t.exitTime * 1000);
    const key = date.toLocaleDateString("ar-EG", { month: "short" });
    if (!months[key]) months[key] = { pnl: 0, trades: 0 };
    months[key].pnl += t.pnl;
    months[key].trades++;
  }
  let runningBalance = INITIAL_BALANCE;
  return Object.entries(months).map(([month, data]) => {
    const ret = (data.pnl / runningBalance) * 100;
    runningBalance += data.pnl;
    return { month, return: Math.round(ret * 10) / 10, trades: data.trades };
  });
}

function emptyResult(): BacktestResult {
  return { trades: [], finalBalance: INITIAL_BALANCE, totalReturn: 0, wins: 0, losses: 0, winRate: 0, maxWin: 0, maxLoss: 0, profitFactor: 0, maxDrawdown: 0, sharpeRatio: 0, avgWin: 0, avgLoss: 0, longestWinStreak: 0, longestLossStreak: 0, equityCurve: [{ i: 0, balance: INITIAL_BALANCE, date: "", drawdown: 0 }], monthlyReturns: [], dailyReturns: [] };
}

// === Backtest engine ===
function runBacktest(candles: Candle[], strategy: Strategy): BacktestResult {
  if (candles.length < 30) return emptyResult();

  const closes = candles.map((c) => c.close);
  const trades: BacktestTrade[] = [];
  let balance = INITIAL_BALANCE;
  let position: { side: "BUY" | "SELL"; entry: number; entryTime: number; entryIdx: number } | null = null;
  const equityCurve: { i: number; balance: number; date: string; drawdown: number }[] = [];
  let peak = INITIAL_BALANCE;
  let maxDD = 0;
  const returns: number[] = [];

  const ema9arr = computeEmaSeries(closes, 9);
  const ema21arr = computeEmaSeries(closes, 21);
  const rsiArr = computeRsiSeries(closes, 14);

  for (let i = 30; i < candles.length; i++) {
    // Check exit
    if (position) {
      const exitNow = shouldExit(strategy, i, ema9arr, ema21arr, rsiArr, position);
      const movePct = Math.abs((candles[i].close - position.entry) / position.entry);
      if (exitNow || movePct > 0.04) {
        const pnl = (candles[i].close - position.entry) * (position.side === "BUY" ? 1 : -1) * CONTRACT_SIZE * LOT_SIZE;
        balance += pnl;
        returns.push(pnl);
        trades.push({
          side: position.side,
          entry: position.entry,
          exit: candles[i].close,
          pnl,
          time: position.entryTime,
          exitTime: candles[i].time,
          bars: i - position.entryIdx,
        });
        position = null;
      }
    }

    // Check entry
    if (!position) {
      const signal = getEntrySignal(strategy, i, ema9arr, ema21arr, rsiArr, candles);
      if (signal) {
        position = { side: signal, entry: candles[i].close, entryTime: candles[i].time, entryIdx: i };
      }
    }

    // Track equity
    const unreal = position ? (candles[i].close - position.entry) * (position.side === "BUY" ? 1 : -1) * CONTRACT_SIZE * LOT_SIZE : 0;
    const equity = balance + unreal;
    peak = Math.max(peak, equity);
    const dd = ((peak - equity) / peak) * 100;
    maxDD = Math.max(maxDD, dd);

    // Record equity curve (every 24 candles = daily)
    if (i % 24 === 0 || i === candles.length - 1) {
      equityCurve.push({
        i,
        balance: Math.round(equity),
        date: new Date(candles[i].time * 1000).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }),
        drawdown: Math.round(dd * 10) / 10,
      });
    }
  }

  // Close remaining position
  if (position) {
    const pnl = (closes.at(-1)! - position.entry) * (position.side === "BUY" ? 1 : -1) * CONTRACT_SIZE * LOT_SIZE;
    balance += pnl;
    returns.push(pnl);
    trades.push({ side: position.side, entry: position.entry, exit: closes.at(-1)!, pnl, time: position.entryTime, exitTime: candles.at(-1)!.time, bars: candles.length - position.entryIdx });
  }

  // Calculate metrics
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

  // Sharpe ratio (simplified)
  const avgReturn = returns.length ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance = returns.length ? returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Win/loss streaks
  let curWin = 0, curLoss = 0, maxWinStreak = 0, maxLossStreak = 0;
  for (const t of trades) {
    if (t.pnl > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
  }

  // Monthly returns
  const monthlyReturns = computeMonthlyReturns(trades, candles);

  // Total return
  const totalReturn = ((balance - INITIAL_BALANCE) / INITIAL_BALANCE) * 100;

  return {
    trades,
    finalBalance: Math.round(balance),
    totalReturn,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    maxWin: trades.length ? Math.max(...trades.map((t) => t.pnl)) : 0,
    maxLoss: trades.length ? Math.min(...trades.map((t) => t.pnl)) : 0,
    profitFactor,
    maxDrawdown: maxDD,
    sharpeRatio,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    longestWinStreak: maxWinStreak,
    longestLossStreak: maxLossStreak,
    equityCurve,
    monthlyReturns,
    dailyReturns: [],
  };
}

// === Sub-components ===
function MetricCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="stat-box-modern">
      <div className="flex items-center gap-1 mb-1" style={{ color }}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value tabular-nums ltr-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="stat-box-modern">
      <div className="stat-label">{label}</div>
      <div className="stat-value tabular-nums ltr-nums" style={{ color: color ?? "#e6ebf2" }}>{value}</div>
    </div>
  );
}
