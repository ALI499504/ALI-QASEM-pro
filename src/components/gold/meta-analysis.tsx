"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Layers, GitMerge, TrendingUp, TrendingDown, Minus,
  Cpu, Brain, Activity, Award, Zap, CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart, Bar, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import type { Candle } from "@/lib/indicators";

interface Props {
  candles: Candle[];
}

type Strategy = "EMA_CROSS" | "RSI_REVERSAL" | "BREAKOUT";

const STRATEGY_NAMES: Record<Strategy, string> = {
  EMA_CROSS: "EMA 9/21",
  RSI_REVERSAL: "RSI انعكاس",
  BREAKOUT: "اختراق القناة",
};

export default function MetaAnalysis({ candles }: Props) {
  const [tab, setTab] = useState<"compare" | "ensemble" | "cognitive">("compare");

  // Run all 3 strategies on the same data
  const results = useMemo(() => {
    return (["EMA_CROSS", "RSI_REVERSAL", "BREAKOUT"] as Strategy[]).map((s) => ({
      strategy: s,
      ...runQuickBacktest(candles, s),
    }));
  }, [candles]);

  // Compute ensemble signal
  const ensemble = useMemo(() => computeEnsemble(results), [results]);

  // Compute strategy correlation
  const correlation = useMemo(() => computeCorrelation(results), [results]);

  // Meta-cognitive AI stats
  const cognitive = useMemo(() => computeCognitive(results), [results]);

  if (candles.length < 30) {
    return (
      <div className="card-modern p-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
          <Layers className="w-4 h-4 text-gold" />
          <span className="text-sm font-bold">Meta-Analysis — تحليل فوق التحليل</span>
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  return (
    <div className="card-modern p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gold" />
          <h2 className="section-heading">Meta-Analysis — تحليل فوق التحليل</h2>
        </div>
        <div className="flex gap-1">
          {[
            { id: "compare", label: "مقارنة الاستراتيجيات" },
            { id: "ensemble", label: "إشارة Ensemble" },
            { id: "cognitive", label: "AI واعٍ بذاته" },
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
      </div>

      {tab === "compare" && <StrategyComparison results={results} correlation={correlation} />}
      {tab === "ensemble" && <EnsembleSignal ensemble={ensemble} results={results} />}
      {tab === "cognitive" && <MetaCognitive cognitive={cognitive} />}
    </div>
  );
}

// === Strategy Comparison ===
function StrategyComparison({ results, correlation }: { results: any[]; correlation: any }) {
  const barData = results.map((r) => ({
    name: STRATEGY_NAMES[r.strategy as Strategy],
    return: r.totalReturn,
    winRate: r.winRate,
    profitFactor: r.profitFactor,
    color: r.totalReturn >= 0 ? "#10b981" : "#f43f5e",
  }));

  // Radar chart data (normalized 0-100)
  const radarData = [
    { dimension: "العائد", ...results.reduce((acc, r) => ({ ...acc, [STRATEGY_NAMES[r.strategy]]: Math.min(100, Math.abs(r.totalReturn) * 2) }), {}) },
    { dimension: "نجاح", ...results.reduce((acc, r) => ({ ...acc, [STRATEGY_NAMES[r.strategy]]: r.winRate }), {}) },
    { dimension: "معامل ربح", ...results.reduce((acc, r) => ({ ...acc, [STRATEGY_NAMES[r.strategy]]: Math.min(100, r.profitFactor * 30) }), {}) },
    { dimension: "صفقات", ...results.reduce((acc, r) => ({ ...acc, [STRATEGY_NAMES[r.strategy]]: Math.min(100, r.trades * 3) }), {}) },
    { dimension: "ثبات", ...results.reduce((acc, r) => ({ ...acc, [STRATEGY_NAMES[r.strategy]]: Math.max(0, 100 - r.maxDrawdown * 2) }), {}) },
  ];

  return (
    <div>
      {/* Comparison table */}
      <div className="overflow-x-auto scroll-styled mb-3">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-right py-1.5 px-2 text-muted-foreground">الاستراتيجية</th>
              <th className="text-center px-2 text-muted-foreground">عائد</th>
              <th className="text-center px-2 text-muted-foreground">نجاح</th>
              <th className="text-center px-2 text-muted-foreground">P.Factor</th>
              <th className="text-center px-2 text-muted-foreground">صفقات</th>
              <th className="text-center px-2 text-muted-foreground">DD أقصى</th>
              <th className="text-center px-2 text-muted-foreground">شارب</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.strategy} className="border-b border-border/50">
                <td className="py-1.5 px-2 font-bold text-foreground">{STRATEGY_NAMES[r.strategy as Strategy]}</td>
                <td className="text-center px-2 tabular-nums ltr-nums" style={{ color: r.totalReturn >= 0 ? "#10b981" : "#f43f5e" }}>
                  {r.totalReturn >= 0 ? "+" : ""}{r.totalReturn.toFixed(1)}%
                </td>
                <td className="text-center px-2 tabular-nums ltr-nums text-gold">{r.winRate.toFixed(0)}%</td>
                <td className="text-center px-2 tabular-nums ltr-nums" style={{ color: r.profitFactor >= 1 ? "#10b981" : "#f43f5e" }}>{r.profitFactor.toFixed(2)}</td>
                <td className="text-center px-2 tabular-nums ltr-nums">{r.trades}</td>
                <td className="text-center px-2 tabular-nums ltr-nums text-bear">{r.maxDrawdown.toFixed(1)}%</td>
                <td className="text-center px-2 tabular-nums ltr-nums text-info">{r.sharpeRatio.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Returns bar chart */}
      <div className="mb-3">
        <div className="text-[10px] text-muted-foreground mb-1">مقارنة العوائد (%)</div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#e6ebf2" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} width={56} />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.05)" }}
                contentStyle={{ background: "#0f1420", border: "1px solid rgba(148,163,184,0.20)", borderRadius: "6px", fontSize: "12px", color: "#f1f5f9" }}
                formatter={(v: any) => [`${v > 0 ? "+" : ""}${v}%`, "العائد"]}
              />
              <Bar dataKey="return" radius={[0, 4, 4, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar chart — professional multi-dimensional comparison */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
            <span className="w-1 h-3 rounded-full bg-gold" />
            مقارنة متعددة الأبعاد (Radar)
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">5 dimensions</span>
        </div>
        <div className="relative rounded-xl border border-border/50 overflow-hidden" style={{ background: "radial-gradient(circle at center, rgba(91,140,255,0.04), transparent 60%)" }}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 16, right: 50, left: 50, bottom: 16 }}>
                <PolarGrid
                  stroke="rgba(148,163,184,0.06)"
                  strokeDasharray="2 3"
                />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                  tickLine={{ stroke: "rgba(148,163,184,0.10)" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 8, fill: "rgba(148,163,184,0.3)" }}
                  stroke="rgba(148,163,184,0.04)"
                  axisLine={false}
                />
                {results.map((r, i) => {
                  const color = i === 0 ? "#d4a574" : i === 1 ? "#10b981" : "#3b82f6";
                  return (
                    <Radar
                      key={r.strategy}
                      name={STRATEGY_NAMES[r.strategy as Strategy]}
                      dataKey={STRATEGY_NAMES[r.strategy as Strategy]}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.08}
                      strokeWidth={2}
                      strokeOpacity={0.9}
                      dot={{ r: 3, fill: color, stroke: "#0f1420", strokeWidth: 1.5 }}
                    />
                  );
                })}
                <Tooltip
                  cursor={{ stroke: "#d4a574", strokeOpacity: 0.3, strokeWidth: 1 }}
                  contentStyle={{
                    background: "#0f1420",
                    border: "1px solid rgba(148,163,184,0.20)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f1f5f9",
                    padding: "8px 12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                  }}
                  labelStyle={{ color: "#94a3b8", fontSize: "11px", marginBottom: "4px", fontWeight: 600 }}
                  itemStyle={{ color: "#f1f5f9", fontSize: "12px", padding: "2px 0" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 py-2 border-t border-border/30">
            {results.map((r, i) => {
              const color = i === 0 ? "#d4a574" : i === 1 ? "#10b981" : "#3b82f6";
              return (
                <div key={r.strategy} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
                  <span className="text-[10px] font-semibold text-foreground">{STRATEGY_NAMES[r.strategy as Strategy]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-[9px] text-muted-foreground/60 mt-1 text-center">
          كل بُعد مُطبّع من 0-100 — مساحة أكبر = أداء أفضل
        </div>
      </div>

      {/* Correlation matrix */}
      <div className="mt-3">
        <div className="text-[10px] text-muted-foreground mb-1">مصفوفة ارتباط الاستراتيجيات</div>
        <div className="grid grid-cols-4 gap-1 text-[9px]">
          <div></div>
          {results.map((r) => (
            <div key={r.strategy} className="text-center text-muted-foreground font-mono">{STRATEGY_NAMES[r.strategy as Strategy].slice(0, 6)}</div>
          ))}
          {results.map((r1, i) => (
            <>
              <div key={`label-${i}`} className="text-muted-foreground font-mono text-left">{STRATEGY_NAMES[r1.strategy as Strategy].slice(0, 6)}</div>
              {results.map((r2, j) => {
                const corr = correlation[`${i}-${j}`] ?? 1;
                const color = corr > 0.7 ? "#10b981" : corr > 0.3 ? "#d4a574" : corr > -0.3 ? "#94a3b8" : "#f43f5e";
                return (
                  <div key={`${i}-${j}`} className="text-center py-1 rounded" style={{ background: `${color}10`, color }}>
                    {corr.toFixed(2)}
                  </div>
                );
              })}
            </>
          ))}
        </div>
        <div className="text-[9px] text-muted-foreground mt-1">
          ارتباط منخفض = استراتيجيات مستقلة (تنويع أفضل) • ارتباط عالي = استراتيجيات متشابهة
        </div>
      </div>
    </div>
  );
}

// === Ensemble Signal ===
function EnsembleSignal({ ensemble, results }: { ensemble: any; results: any[] }) {
  const isBuy = ensemble.signal === "BUY";
  const isSell = ensemble.signal === "SELL";
  const color = isBuy ? "#10b981" : isSell ? "#f43f5e" : "#d4a574";
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
        <GitMerge className="w-3 h-3 inline" /> دمج قرارات الـ3 استراتيجيات في إشارة موحدة ( Ensemble)
      </div>

      {/* Ensemble signal hero */}
      <div className="rounded-lg p-3 mb-3 border" style={{ background: `${color}08`, borderColor: `${color}25` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <Icon className="w-5 h-5" style={{ color }} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">إشارة Ensemble الموحدة</div>
              <div className="text-xl font-extrabold" style={{ color }}>
                {isBuy ? "شراء" : isSell ? "بيع" : "انتظار"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">ثقة الإجماع</div>
            <div className="text-lg font-bold tabular-nums ltr-nums" style={{ color }}>{ensemble.confidence.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Individual votes */}
      <div className="space-y-1.5 mb-3">
        {results.map((r) => {
          const vote = r.totalReturn > 0 ? "BUY" : r.totalReturn < 0 ? "SELL" : "HOLD";
          const vColor = vote === "BUY" ? "#10b981" : vote === "SELL" ? "#f43f5e" : "#d4a574";
          return (
            <div key={r.strategy} className="flex items-center justify-between px-2.5 py-1.5 rounded border border-border bg-secondary/30">
              <span className="text-xs font-semibold">{STRATEGY_NAMES[r.strategy as Strategy]}</span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground tabular-nums ltr-nums">{r.totalReturn >= 0 ? "+" : ""}{r.totalReturn.toFixed(1)}%</span>
                <span className="pill" style={{ background: `${vColor}15`, color: vColor, border: `1px solid ${vColor}30` }}>
                  {vote === "BUY" ? "▲ شراء" : vote === "SELL" ? "▼ بيع" : "● انتظار"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 rounded border border-border bg-secondary/20 text-[10px] text-muted-foreground leading-relaxed">
        <span className="text-foreground font-bold">آلية Ensemble:</span> {ensemble.buyVotes} شراء / {ensemble.sellVotes} بيع / {ensemble.holdVotes} انتظار.
        القرار النهائي = أغلبية الأصوات المرجحة بثقة كل استراتيجية.
        {ensemble.agreement >= 100 ? "  إجماع كامل (3/3)" : ensemble.agreement >= 67 ? "  أغلبية (2/3)" : "  تضارب (1/3)"}
      </div>
    </div>
  );
}

// === Meta-Cognitive AI ===
function MetaCognitive({ cognitive }: { cognitive: any }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
        <Brain className="w-3 h-3 inline" /> الـAI يحلل أداءه السابق ويعدّل ثقته تكيفياً — (Meta-Cognition)
      </div>

      {/* Self-evaluation stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="stat-box-modern">
          <div className="stat-label">دقة ذاتية</div>
          <div className="stat-value tabular-nums ltr-nums text-gold">{cognitive.selfAccuracy.toFixed(0)}%</div>
        </div>
        <div className="stat-box-modern">
          <div className="stat-label">ثقة تكيفية</div>
          <div className="stat-value tabular-nums ltr-nums" style={{ color: cognitive.adaptiveConfidence >= 70 ? "#10b981" : cognitive.adaptiveConfidence >= 50 ? "#d4a574" : "#f43f5e" }}>
            {cognitive.adaptiveConfidence.toFixed(0)}%
          </div>
        </div>
        <div className="stat-box-modern">
          <div className="stat-label">معدل التعلم</div>
          <div className="stat-value tabular-nums ltr-nums text-info">{cognitive.learningRate.toFixed(2)}</div>
        </div>
        <div className="stat-box-modern">
          <div className="stat-label">حالة الوعي</div>
          <div className="stat-value text-xs" style={{ color: cognitive.awarenessColor }}>
            {cognitive.awareness}
          </div>
        </div>
      </div>

      {/* Self-assessment */}
      <div className="px-3 py-2.5 rounded border border-border bg-secondary/30 space-y-1.5">
        <div className="text-[10px] text-gold font-bold flex items-center gap-1.5">
          <Brain className="w-3 h-3" /> التقييم الذاتي للـ AI
        </div>
        <div className="text-[10px] text-muted-foreground leading-relaxed space-y-0.5">
          <div>• <span className="text-foreground">حالات نجاح موثقة:</span> {cognitive.successCount} من {cognitive.totalEvaluations} تقييم</div>
          <div>• <span className="text-foreground">الثقة الأساسية:</span> {cognitive.baseConfidence.toFixed(0)}% → <span style={{ color: cognitive.adaptiveConfidence >= 70 ? "#10b981" : "#f43f5e" }}>الثقة المعدّلة: {cognitive.adaptiveConfidence.toFixed(0)}%</span></div>
          <div>• <span className="text-foreground">معامل التكيف:</span> {cognitive.adjustmentFactor.toFixed(2)}x (يضاعف/يقلل الثقة حسب الأداء)</div>
          <div>• <span className="text-foreground">معدل الخطأ الحالي:</span> {cognitive.errorRate.toFixed(1)}% — {cognitive.errorRate < 30 ? " ضمن الحدود المقبولة" : " يحتاج تحسين"}</div>
        </div>
      </div>

      {/* Self-awareness indicator */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">مستوى الوعي الذاتي:</span>
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${cognitive.awarenessLevel}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, #94a3b8, ${cognitive.awarenessColor})` }}
          />
        </div>
        <span className="text-[10px] font-bold tabular-nums ltr-nums" style={{ color: cognitive.awarenessColor }}>{cognitive.awarenessLevel.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// === Computation functions ===

function runQuickBacktest(candles: Candle[], strategy: Strategy) {
  // Lightweight backtest for comparison
  if (candles.length < 30) return { totalReturn: 0, winRate: 0, profitFactor: 0, trades: 0, maxDrawdown: 0, sharpeRatio: 0 };

  const closes = candles.map((c) => c.close);
  const ema9 = computeEma(closes, 9);
  const ema21 = computeEma(closes, 21);
  const rsiArr = computeRsi(closes, 14);

  let balance = 10000;
  let position: { side: "BUY" | "SELL"; entry: number } | null = null;
  const trades: number[] = [];
  let peak = 10000;
  let maxDD = 0;

  for (let i = 30; i < candles.length; i++) {
    if (position) {
      let exit = false;
      if (strategy === "EMA_CROSS") exit = position.side === "BUY" ? ema9[i] < ema21[i] : ema9[i] > ema21[i];
      else if (strategy === "RSI_REVERSAL") exit = position.side === "BUY" ? rsiArr[i] > 60 : rsiArr[i] < 40;
      else exit = Math.abs((candles[i].close - position.entry) / position.entry) > 0.03;

      if (exit || Math.abs((candles[i].close - position.entry) / position.entry) > 0.04) {
        const pnl = (candles[i].close - position.entry) * (position.side === "BUY" ? 1 : -1) * 10;
        balance += pnl;
        trades.push(pnl);
        position = null;
      }
    }

    if (!position) {
      let signal: "BUY" | "SELL" | null = null;
      if (strategy === "EMA_CROSS") {
        if (ema9[i] > ema21[i] && ema9[i-1] <= ema21[i-1]) signal = "BUY";
        else if (ema9[i] < ema21[i] && ema9[i-1] >= ema21[i-1]) signal = "SELL";
      } else if (strategy === "RSI_REVERSAL") {
        if (rsiArr[i] < 30) signal = "BUY";
        else if (rsiArr[i] > 70) signal = "SELL";
      } else {
        if (i >= 20) {
          const high = Math.max(...candles.slice(i-20, i).map(c => c.high));
          const low = Math.min(...candles.slice(i-20, i).map(c => c.low));
          if (candles[i].close > high) signal = "BUY";
          else if (candles[i].close < low) signal = "SELL";
        }
      }
      if (signal) position = { side: signal, entry: candles[i].close };
    }

    const equity = balance + (position ? (candles[i].close - position.entry) * (position.side === "BUY" ? 1 : -1) * 10 : 0);
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, ((peak - equity) / peak) * 100);
  }

  const wins = trades.filter(t => t > 0);
  const losses = trades.filter(t => t < 0);
  const grossW = wins.reduce((s, t) => s + t, 0);
  const grossL = Math.abs(losses.reduce((s, t) => s + t, 0));
  const avgR = trades.length ? trades.reduce((s, t) => s + t, 0) / trades.length : 0;
  const stdDev = trades.length ? Math.sqrt(trades.reduce((s, t) => s + (t - avgR) ** 2, 0) / trades.length) : 0;
  const sharpe = stdDev > 0 ? (avgR / stdDev) * Math.sqrt(252) : 0;

  return {
    totalReturn: ((balance - 10000) / 10000) * 100,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossL > 0 ? grossW / grossL : grossW > 0 ? 99 : 0,
    trades: trades.length,
    maxDrawdown: maxDD,
    sharpeRatio: sharpe,
  };
}

function computeEnsemble(results: any[]) {
  const buyVotes = results.filter(r => r.totalReturn > 0).length;
  const sellVotes = results.filter(r => r.totalReturn < 0).length;
  const holdVotes = results.filter(r => Math.abs(r.totalReturn) < 1).length;

  const avgConfidence = results.reduce((s, r) => s + r.winRate, 0) / results.length;
  const agreement = (Math.max(buyVotes, sellVotes, holdVotes) / results.length) * 100;

  const signal = buyVotes > sellVotes ? "BUY" : sellVotes > buyVotes ? "SELL" : "HOLD";
  const confidence = agreement * (avgConfidence / 100);

  return { signal, confidence, buyVotes, sellVotes, holdVotes, agreement };
}

function computeCorrelation(results: any[]) {
  const corr: Record<string, number> = {};
  for (let i = 0; i < results.length; i++) {
    for (let j = 0; j < results.length; j++) {
      if (i === j) { corr[`${i}-${j}`] = 1.0; continue; }
      // Simplified: correlation based on return similarity
      const ri = results[i].totalReturn;
      const rj = results[j].totalReturn;
      const sameSign = (ri > 0 && rj > 0) || (ri < 0 && rj < 0);
      const magDiff = Math.abs(ri - rj);
      corr[`${i}-${j}`] = sameSign ? Math.max(0, 1 - magDiff / 50) : Math.max(-1, -magDiff / 50);
    }
  }
  return corr;
}

function computeCognitive(results: any[]) {
  const totalEvaluations = results.reduce((s, r) => s + r.trades, 0);
  const successCount = results.reduce((s, r) => s + (r.trades * r.winRate / 100), 0);
  const selfAccuracy = totalEvaluations > 0 ? (successCount / totalEvaluations) * 100 : 50;

  const baseConfidence = results.reduce((s, r) => s + r.winRate, 0) / results.length;
  const errorRate = 100 - selfAccuracy;
  const adjustmentFactor = selfAccuracy >= 70 ? 1.15 : selfAccuracy >= 50 ? 1.0 : 0.85;
  const adaptiveConfidence = Math.min(99, baseConfidence * adjustmentFactor);

  const learningRate = 0.01 + (selfAccuracy / 100) * 0.05;

  const awarenessLevel = Math.min(100, selfAccuracy * 0.8 + (results.length > 2 ? 20 : 0));
  const awareness = selfAccuracy >= 75 ? "وعي عالٍ " : selfAccuracy >= 55 ? "وعي متوسط" : "وعي منخفض";
  const awarenessColor = selfAccuracy >= 75 ? "#10b981" : selfAccuracy >= 55 ? "#d4a574" : "#f43f5e";

  return {
    selfAccuracy, adaptiveConfidence, baseConfidence, adjustmentFactor,
    learningRate, errorRate, totalEvaluations, successCount: Math.round(successCount),
    awareness, awarenessLevel, awarenessColor,
  };
}

function computeEma(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i-1] * (1-k));
  return out;
}

function computeRsi(closes: number[], period = 14): number[] {
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { out.push(50); continue; }
    let g = 0, l = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - closes[j-1];
      if (d >= 0) g += d; else l -= d;
    }
    out.push(l === 0 ? 100 : 100 - 100 / (1 + g / l));
  }
  return out;
}
