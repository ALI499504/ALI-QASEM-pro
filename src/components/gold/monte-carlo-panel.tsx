"use client";

import { motion } from "framer-motion";
import { Dice5, TrendingDown, Shield, Activity, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, ReferenceLine, LineChart, Line,
} from "recharts";
import { useEffect, useState } from "react";

interface MonteCarloResult {
  // Original backtest stats
  originalReturn: number;
  originalWinRate: number;
  originalProfitFactor: number;

  // Monte Carlo statistics
  scenarios: number;
  medianReturn: number;
  meanReturn: number;
  worstCase5: number;      // 5th percentile
  bestCase95: number;      // 95th percentile
  probProfit: number;       // % of scenarios that are profitable
  probLoss: number;
  riskOfRuin: number;       // % of scenarios where balance hits 0
  maxDrawdownMedian: number;
  maxDrawdownWorst: number; // 95th percentile max DD
  maxDrawdownBest: number;  // 5th percentile max DD
  optimalKelly: number;
  halfKelly: number;

  // Equity curves (sample)
  equityCurves: { scenario: number; equity: number[] }[];

  // Distribution
  returnDistribution: { bucket: string; count: number; pct: number }[];

  // Walk-Forward
  walkForward: {
    inSampleReturn: number;
    outOfSampleReturn: number;
    overfittingScore: number; // 0..100 (higher = more overfit)
    periods: { period: string; inSample: number; outOfSample: number }[];
  };

  summary: string;
}

export default function MonteCarloPanel() {
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<any[]>([]);
  const [initialBalance] = useState(10000);

  async function fetchBacktest() {
    try {
      const res = await fetch("/api/gold/backtest", { cache: "no-store" });
      const data = await res.json();
      if (data.trades) setTrades(data.trades);
    } catch {}
  }

  useEffect(() => {
    fetchBacktest();
    if (!trades || trades.length === 0) {
      setLoading(false);
      return;
    }

    // Run Monte Carlo simulation
    const numScenarios = 500;
    const pnls = trades.map((t) => t.pnl);
    const originalReturn = pnls.reduce((a, b) => a + b, 0);
    const originalWinRate = (trades.filter((t) => t.pnl > 0).length / trades.length) * 100;
    const grossProfit = pnls.filter((p) => p > 0).reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0));
    const originalPF = grossLoss > 0 ? grossProfit / grossLoss : 0;

    // Generate 500 scenarios by reordering trades
    const scenarioReturns: number[] = [];
    const scenarioMaxDDs: number[] = [];
    const sampleCurves: { scenario: number; equity: number[] }[] = [];

    for (let s = 0; s < numScenarios; s++) {
      // Shuffle PnLs
      const shuffled = [...pnls].sort(() => Math.random() - 0.5);
      let bal = initialBalance;
      let peak = bal;
      let maxDD = 0;
      const equity: number[] = [bal];
      let ruined = false;

      for (const pnl of shuffled) {
        bal += pnl;
        if (bal <= 0) {
          ruined = true;
          bal = 0;
          break;
        }
        peak = Math.max(peak, bal);
        maxDD = Math.max(maxDD, (peak - bal) / peak);
        equity.push(bal);
      }

      const ret = ((bal - initialBalance) / initialBalance) * 100;
      scenarioReturns.push(ret);
      scenarioMaxDDs.push(maxDD * 100);

      if (s < 20) {
        sampleCurves.push({ scenario: s, equity });
      }
    }

    // Sort for percentile calculations
    const sortedReturns = [...scenarioReturns].sort((a, b) => a - b);
    const sortedDDs = [...scenarioMaxDDs].sort((a, b) => a - b);

    const medianReturn = sortedReturns[Math.floor(numScenarios * 0.5)] || 0;
    const meanReturn = scenarioReturns.reduce((a, b) => a + b, 0) / numScenarios;
    const worstCase5 = sortedReturns[Math.floor(numScenarios * 0.05)] || 0;
    const bestCase95 = sortedReturns[Math.floor(numScenarios * 0.95)] || 0;
    const probProfit = (scenarioReturns.filter((r) => r > 0).length / numScenarios) * 100;
    const probLoss = 100 - probProfit;
    const riskOfRuin = (scenarioReturns.filter((r) => r <= -99).length / numScenarios) * 100;
    const maxDrawdownMedian = sortedDDs[Math.floor(numScenarios * 0.5)] || 0;
    const maxDrawdownWorst = sortedDDs[Math.floor(numScenarios * 0.95)] || 0;
    const maxDrawdownBest = sortedDDs[Math.floor(numScenarios * 0.05)] || 0;

    // Kelly Criterion
    const winRate = originalWinRate / 100;
    const rewardRatio = 2; // R:R = 1:2
    const optimalKelly = Math.max(0, (winRate - (1 - winRate) / rewardRatio) * 100);

    // Return distribution (buckets)
    const buckets = [
      { label: "<-50%", min: -Infinity, max: -50 },
      { label: "-50% to -25%", min: -50, max: -25 },
      { label: "-25% to 0%", min: -25, max: 0 },
      { label: "0% to +25%", min: 0, max: 25 },
      { label: "+25% to +50%", min: 25, max: 50 },
      { label: ">+50%", min: 50, max: Infinity },
    ];
    const returnDistribution = buckets.map((b) => {
      const count = scenarioReturns.filter((r) => r >= b.min && r < b.max).length;
      return { bucket: b.label, count, pct: Math.round((count / numScenarios) * 1000) / 10 };
    });

    // Walk-Forward (split trades into 3 periods)
    const periodSize = Math.floor(trades.length / 3);
    const wfPeriods = [];
    let wfInSample = 0;
    let wfOutOfSample = 0;

    for (let p = 0; p < 3; p++) {
      const start = p * periodSize;
      const end = p === 2 ? trades.length : (p + 1) * periodSize;
      const periodTrades = trades.slice(start, end);
      const periodReturn = periodTrades.reduce((s, t) => s + t.pnl, 0);
      const periodReturnPct = (periodReturn / initialBalance) * 100;

      if (p < 2) {
        wfInSample += periodReturnPct;
      } else {
        wfOutOfSample += periodReturnPct;
      }

      wfPeriods.push({
        period: `فترة ${p + 1}`,
        inSample: p < 2 ? periodReturnPct : 0,
        outOfSample: p === 2 ? periodReturnPct : 0,
      });
    }

    wfInSample = wfInSample / 2;
    const overfittingScore = Math.max(0, Math.min(100, Math.abs(wfInSample - wfOutOfSample) * 2));

    setResult({
      originalReturn,
      originalWinRate,
      originalProfitFactor: originalPF,
      scenarios: numScenarios,
      medianReturn,
      meanReturn,
      worstCase5,
      bestCase95,
      probProfit,
      probLoss,
      riskOfRuin,
      maxDrawdownMedian,
      maxDrawdownWorst,
      maxDrawdownBest,
      optimalKelly,
      halfKelly: optimalKelly * 0.5,
      equityCurves: sampleCurves,
      returnDistribution,
      walkForward: {
        inSampleReturn: wfInSample,
        outOfSampleReturn: wfOutOfSample,
        overfittingScore,
        periods: wfPeriods,
      },
      summary: `Monte Carlo (${numScenarios} سيناريو) | متوسط العائد: ${meanReturn.toFixed(1)}% | احتمال الربح: ${probProfit.toFixed(0)}% | Risk of Ruin: ${riskOfRuin.toFixed(1)}% | Kelly الأمثل: ${optimalKelly.toFixed(1)}%`,
    });
    setLoading(false);
  }, [trades]);

  if (loading) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Dice5 className="w-4 h-4 section-heading-icon" />
          Monte Carlo + Walk-Forward
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!result || !trades || trades.length === 0) return null;

  // Sample equity curves for chart
  const equityData = result.equityCurves[0]?.equity.map((_, idx) => {
    const point: any = { trade: idx };
    result.equityCurves.slice(0, 10).forEach((s) => {
      point[`s${s.scenario}`] = s.equity[idx] || s.equity[s.equity.length - 1];
    });
    return point;
  }) || [];

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Dice5 className="w-4 h-4 section-heading-icon" />
          Monte Carlo + Walk-Forward Analysis
        </h2>
        <span className="section-subtitle">{result.scenarios} سيناريو</span>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <StatBox label="متوسط العائد" value={`${result.meanReturn.toFixed(1)}%`} color={result.meanReturn >= 0 ? "#22d39a" : "#ff4d6a"} />
        <StatBox label="احتمال الربح" value={`${result.probProfit.toFixed(0)}%`} color="#22d39a" />
        <StatBox label="Risk of Ruin" value={`${result.riskOfRuin.toFixed(1)}%`} color={result.riskOfRuin > 5 ? "#ff4d6a" : "#22d39a"} />
        <StatBox label="Kelly الأمثل" value={`${result.optimalKelly.toFixed(1)}%`} color="#d4a574" />
      </div>

      {/* Percentile ranges */}
      <div className="mb-3">
        <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-gold" />
          نطاق العوائد المتوقعة (500 سيناريو)
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[9px] text-muted-foreground">أسوأ سيناريو (5%)</div>
              <div className="text-sm font-bold text-rose-400 tabular-nums ltr-nums">{result.worstCase5.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground">الوسيط (50%)</div>
              <div className="text-sm font-bold text-gold tabular-nums ltr-nums">{result.medianReturn.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground">أفضل سيناريو (95%)</div>
              <div className="text-sm font-bold text-emerald-400 tabular-nums ltr-nums">{result.bestCase95.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Equity Curves */}
      <div className="mb-3">
        <div className="text-[11px] font-bold mb-1.5">10 سيناريوهات عشوائية (منحنيات الملكية)</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equityData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid stroke="#232a3d" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="trade" stroke="#8a96a8" tick={{ fontSize: 8, fill: "#8a96a8" }} tickLine={false} />
              <YAxis stroke="#8a96a8" tick={{ fontSize: 9, fill: "#8a96a8" }} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={35} />
              <Tooltip contentStyle={{ background: "#131826", border: "1px solid #232a3d", borderRadius: 4, fontSize: 11 }} />
              <ReferenceLine y={initialBalance} stroke="#8a96a8" strokeDasharray="3 3" strokeOpacity={0.3} />
              {result.equityCurves.slice(0, 10).map((s, i) => (
                <Line key={s.scenario} type="monotone" dataKey={`s${s.scenario}`} stroke={`hsl(${i * 36}, 70%, 55%)`} strokeWidth={1} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Return Distribution */}
      <div className="mb-3">
        <div className="text-[11px] font-bold mb-1.5">توزيع العوائد</div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={result.returnDistribution}>
              <CartesianGrid stroke="#232a3d" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" stroke="#8a96a8" tick={{ fontSize: 8, fill: "#8a96a8" }} tickLine={false} />
              <YAxis stroke="#8a96a8" tick={{ fontSize: 9, fill: "#8a96a8" }} tickLine={false} tickFormatter={(v) => `${v}%`} width={30} />
              <Tooltip contentStyle={{ background: "#131826", border: "1px solid #232a3d", borderRadius: 4, fontSize: 11 }} formatter={(v: any, n: any, p: any) => [`${v}%`, p.payload.bucket]} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {result.returnDistribution.map((d, i) => (
                  <Cell key={i} fill={d.bucket.includes("-") && !d.bucket.includes("+") ? "#ff4d6a" : "#22d39a"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Walk-Forward Analysis */}
      <div className="mb-3">
        <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3 text-gold" />
          Walk-Forward Optimization
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/30 border border-border">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="text-center p-1.5 rounded bg-emerald-500/[0.04] border border-emerald-500/20">
              <div className="text-[9px] text-muted-foreground">In-Sample (تدريب)</div>
              <div className="text-sm font-bold text-emerald-400 tabular-nums ltr-nums">{result.walkForward.inSampleReturn.toFixed(1)}%</div>
            </div>
            <div className="text-center p-1.5 rounded bg-blue-500/[0.04] border border-blue-500/20">
              <div className="text-[9px] text-muted-foreground">Out-of-Sample (اختبار)</div>
              <div className="text-sm font-bold text-blue-400 tabular-nums ltr-nums">{result.walkForward.outOfSampleReturn.toFixed(1)}%</div>
            </div>
          </div>
          <div className="text-center p-1.5 rounded bg-amber-500/[0.04] border border-amber-500/20">
            <div className="text-[9px] text-muted-foreground">درجة الـ Overfitting</div>
            <div className={`text-sm font-bold tabular-nums ltr-nums ${result.walkForward.overfittingScore > 50 ? "text-rose-400" : "text-amber-400"}`}>
              {result.walkForward.overfittingScore.toFixed(0)}/100
              {result.walkForward.overfittingScore > 50 ? "  overfitting" : "  موثوق"}
            </div>
          </div>
        </div>
      </div>

      {/* Max Drawdown Distribution */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <StatBox label="أقل تراجع (5%)" value={`${result.maxDrawdownBest.toFixed(1)}%`} color="#22d39a" small />
        <StatBox label="وسيط التراجع" value={`${result.maxDrawdownMedian.toFixed(1)}%`} color="#fbbf24" small />
        <StatBox label="أسوأ تراجع (95%)" value={`${result.maxDrawdownWorst.toFixed(1)}%`} color="#ff4d6a" small />
      </div>

      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">
        {result.summary}
      </div>
    </div>
  );
}

function StatBox({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="rounded-lg p-2 border border-border bg-secondary/30 text-center">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className={`${small ? "text-xs" : "text-sm"} font-bold tabular-nums ltr-nums`} style={{ color }}>{value}</div>
    </div>
  );
}
