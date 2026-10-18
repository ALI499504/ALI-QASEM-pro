"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, Target, Activity, BarChart3,
  Calendar, Zap, RefreshCw, Trophy, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, ReferenceLine, Cell, ComposedChart, Line,
} from "recharts";

interface Trade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  side: "BUY" | "SELL";
  pnl: number;
  pnlPct: number;
  exitReason: string;
  holdBars: number;
  confidence: number;
  signalScore: number;
}

interface BacktestResult {
  trades: Trade[];
  equity: { time: number; equity: number; drawdown: number }[];
  stats: {
    initialBalance: number;
    finalBalance: number;
    totalReturn: number;
    totalReturnPct: number;
    winRate: number;
    wins: number;
    losses: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    maxDrawdownPct: number;
    avgWin: number;
    avgLoss: number;
    biggestWin: number;
    biggestLoss: number;
    longestWinStreak: number;
    longestLossStreak: number;
    avgHoldBars: number;
    totalTrades: number;
    buyTrades: number;
    sellTrades: number;
  };
  monthly: { month: string; returnPct: number; trades: number }[];
  signalStats: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number };
  startDate: string;
  endDate: string;
  totalCandles: number;
  source: string;
}

export default function SmartBacktest() {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"results" | "trades" | "tv">("results");

  async function runBacktest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gold/backtest", { cache: "no-store" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runBacktest();
  }, []);

  if (loading) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 section-heading mb-3">
          <BarChart3 className="w-4 h-4 section-heading-icon" />
          باك تيست ذكي — 3 أشهر (Ensemble ML)
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <RefreshCw className="w-8 h-8 text-gold animate-spin" />
          <div className="text-sm text-muted-foreground">
            جارٍ تحليل 3 أشهر من بيانات Binance الحقيقية باستخدام 20 عامل alpha...
          </div>
          <div className="text-[10px] text-muted-foreground">
            يتم حساب Ensemble Signal على كل شمعة (2160 شمعة × 20 عامل)
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 section-heading mb-3">
          <BarChart3 className="w-4 h-4 section-heading-icon" />
          باك تيست ذكي — 3 أشهر
        </div>
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <div className="text-sm text-muted-foreground mb-3">{error}</div>
          <button onClick={runBacktest} className="px-4 py-2 rounded bg-gold/20 border border-gold/30 text-gold hover:bg-gold/30 text-xs font-bold">
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const s = result.stats;
  const isProfit = s.totalReturn >= 0;

  const equityData = result.equity.map((e, i) => ({
    time: new Date(e.time * 1000).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }),
    equity: e.equity,
    drawdown: e.drawdown,
    idx: i,
  }));

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <BarChart3 className="w-4 h-4 section-heading-icon" />
          باك تيست ذكي — 3 أشهر (Ensemble ML)
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("results")}
            className={`px-2 py-1 rounded text-[10px] font-bold ${view === "results" ? "bg-gold/20 border border-gold/30 text-gold" : "bg-secondary text-muted-foreground"}`}
          >
            النتائج
          </button>
          <button
            onClick={() => setView("trades")}
            className={`px-2 py-1 rounded text-[10px] font-bold ${view === "trades" ? "bg-gold/20 border border-gold/30 text-gold" : "bg-secondary text-muted-foreground"}`}
          >
            الصفقات ({s.totalTrades})
          </button>
          <button
            onClick={() => setView("tv")}
            className={`px-2 py-1 rounded text-[10px] font-bold ${view === "tv" ? "bg-gold/20 border border-gold/30 text-gold" : "bg-secondary text-muted-foreground"}`}
          >
            TradingView
          </button>
          <button onClick={runBacktest} className="p-1.5 rounded bg-secondary hover:bg-accent">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="mb-2 px-2 py-1 rounded text-[9px] text-amber-400/80 bg-amber-500/[0.04] border border-amber-500/20 flex items-center gap-1.5">
        <span></span>
        <span>تم تحليل {result.totalCandles} شمعة حقيقية من Yahoo XAUUSD (GC=F) | {result.startDate.slice(0, 10)} → {result.endDate.slice(0, 10)} | {s.totalTrades} صفقة | مصدر: {result.source}</span>
      </div>

      {view === "results" && (
        <>
          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <StatCard
              icon={<DollarSign className="w-3 h-3" />}
              label="الرصيد النهائي"
              value={`$${s.finalBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              sub={`${isProfit ? "+" : ""}${s.totalReturnPct}%`}
              color={isProfit ? "#22d39a" : "#ff4d6a"}
            />
            <StatCard
              icon={<Target className="w-3 h-3" />}
              label="نسبة النجاح"
              value={`${s.winRate}%`}
              sub={`${s.wins}W / ${s.losses}L`}
              color={s.winRate >= 50 ? "#22d39a" : "#fbbf24"}
            />
            <StatCard
              icon={<Activity className="w-3 h-3" />}
              label="معامل الربح"
              value={s.profitFactor.toString()}
              sub={`Sharpe: ${s.sharpeRatio}`}
              color={s.profitFactor >= 1 ? "#22d39a" : "#ff4d6a"}
            />
            <StatCard
              icon={<TrendingDown className="w-3 h-3" />}
              label="أقصى تراجع"
              value={`-${s.maxDrawdownPct}%`}
              sub={`$${s.maxDrawdown}`}
              color="#ff4d6a"
            />
          </div>

          {/* Equity Curve */}
          <div className="mb-3">
            <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-gold" />
              منحنى الملكية — 3 أشهر
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={equityData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="btEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isProfit ? "#22d39a" : "#ff4d6a"} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={isProfit ? "#22d39a" : "#ff4d6a"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#232a3d" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" stroke="#8a96a8" tick={{ fontSize: 8, fill: "#8a96a8" }} interval={Math.floor(equityData.length / 8)} tickLine={false} />
                  <YAxis stroke="#8a96a8" tick={{ fontSize: 9, fill: "#8a96a8" }} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={40} />
                  <Tooltip
                    contentStyle={{ background: "#131826", border: "1px solid #232a3d", borderRadius: 4, fontSize: 11 }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`, "الملكية"]}
                  />
                  <ReferenceLine y={s.initialBalance} stroke="#8a96a8" strokeDasharray="3 3" strokeOpacity={0.3} />
                  <Area type="monotone" dataKey="equity" stroke={isProfit ? "#22d39a" : "#ff4d6a"} strokeWidth={2} fill="url(#btEquity)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Returns + Signal Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[11px] font-bold mb-1.5">العوائد الشهرية</div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.monthly}>
                    <CartesianGrid stroke="#232a3d" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="#8a96a8" tick={{ fontSize: 9, fill: "#8a96a8" }} tickLine={false} />
                    <YAxis stroke="#8a96a8" tick={{ fontSize: 9, fill: "#8a96a8" }} tickLine={false} tickFormatter={(v) => `${v}%`} width={35} />
                    <Tooltip contentStyle={{ background: "#131826", border: "1px solid #232a3d", borderRadius: 4, fontSize: 11 }} formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "العائد"]} />
                    <ReferenceLine y={0} stroke="#8a96a8" />
                    <Bar dataKey="returnPct" radius={[4, 4, 0, 0]}>
                      {result.monthly.map((m, i) => (
                        <Cell key={i} fill={m.returnPct >= 0 ? "#22d39a" : "#ff4d6a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold mb-1.5">توزيع الإشارات (3 أشهر)</div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: "شراء قوي", value: result.signalStats.strongBuy, color: "#22d39a", emoji: "" },
                  { label: "شراء", value: result.signalStats.buy, color: "#86efac", emoji: "" },
                  { label: "انتظار", value: result.signalStats.hold, color: "#fbbf24", emoji: "" },
                  { label: "بيع", value: result.signalStats.sell, color: "#fca5a5", emoji: "" },
                  { label: "بيع قوي", value: result.signalStats.strongSell, color: "#ff4d6a", emoji: "" },
                ].map((s) => (
                  <div key={s.label} className="rounded p-2 text-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
                    <div className="text-base">{s.emoji}</div>
                    <div className="text-sm font-bold tabular-nums ltr-nums" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[8px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="stat-box">
                  <div className="stat-label">صفقات شراء</div>
                  <div className="stat-value text-emerald-400 text-sm">{s.buyTrades}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">صفقات بيع</div>
                  <div className="stat-value text-rose-400 text-sm">{s.sellTrades}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <MiniStat label="متوسط الربح" value={`+$${s.avgWin}`} color="#22d39a" />
            <MiniStat label="متوسط الخسارة" value={`-$${Math.abs(s.avgLoss)}`} color="#ff4d6a" />
            <MiniStat label="أكبر ربح" value={`+$${s.biggestWin}`} color="#22d39a" />
            <MiniStat label="أكبر خسارة" value={`$${s.biggestLoss}`} color="#ff4d6a" />
            <MiniStat label="أطول سلسلة رابحة" value={`${s.longestWinStreak}`} color="#22d39a" />
            <MiniStat label="أطول سلسلة خاسرة" value={`${s.longestLossStreak}`} color="#ff4d6a" />
            <MiniStat label="متوسط مدة الصفقة" value={`${s.avgHoldBars}h`} color="#d4a574" />
            <MiniStat label="إجمالي الصفقات" value={`${s.totalTrades}`} color="#5b8cff" />
          </div>

          <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">
             الأداء السابق لا يضمن النتائج المستقبلية | البيانات حقيقية من Yahoo XAUUSD (GC=F) | الاستراتيجية: Ensemble ML (20 عامل)
          </div>
        </>
      )}

      {view === "trades" && (
        <div className="overflow-x-auto scroll-styled">
          <table className="w-full text-[10px] text-center">
            <thead className="text-[9px] text-muted-foreground border-b border-border">
              <tr>
                <th className="py-1.5 px-1">#</th>
                <th className="py-1.5 px-1">النوع</th>
                <th className="py-1.5 px-1">دخول</th>
                <th className="py-1.5 px-1">خروج</th>
                <th className="py-1.5 px-1">سعر الدخول</th>
                <th className="py-1.5 px-1">سعر الخروج</th>
                <th className="py-1.5 px-1">P/L</th>
                <th className="py-1.5 px-1">%</th>
                <th className="py-1.5 px-1">السبب</th>
                <th className="py-1.5 px-1">مدة</th>
                <th className="py-1.5 px-1">ثقة</th>
              </tr>
            </thead>
            <tbody>
              {result.trades.slice().reverse().map((t, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-1 px-1 text-muted-foreground">{result.trades.length - i}</td>
                  <td className="py-1 px-1">
                    <span className={t.side === "BUY" ? "text-emerald-400" : "text-rose-400"}>
                      {t.side === "BUY" ? "شراء" : "بيع"}
                    </span>
                  </td>
                  <td className="py-1 px-1 tabular-nums ltr-nums text-muted-foreground">
                    {new Date(t.entryTime * 1000).toLocaleDateString("ar-EG", { day: "numeric", month: "numeric" })}
                  </td>
                  <td className="py-1 px-1 tabular-nums ltr-nums text-muted-foreground">
                    {new Date(t.exitTime * 1000).toLocaleDateString("ar-EG", { day: "numeric", month: "numeric" })}
                  </td>
                  <td className="py-1 px-1 tabular-nums ltr-nums">${t.entryPrice.toFixed(2)}</td>
                  <td className="py-1 px-1 tabular-nums ltr-nums">${t.exitPrice.toFixed(2)}</td>
                  <td className="py-1 px-1 tabular-nums ltr-nums font-bold" style={{ color: t.pnl >= 0 ? "#22d39a" : "#ff4d6a" }}>
                    {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(0)}
                  </td>
                  <td className="py-1 px-1 tabular-nums ltr-nums" style={{ color: t.pnl >= 0 ? "#22d39a" : "#ff4d6a" }}>
                    {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                  </td>
                  <td className="py-1 px-1 text-[8px] text-muted-foreground">
                    {t.exitReason === "TP" ? " TP" : t.exitReason === "SL" ? " SL" : t.exitReason === "SIGNAL_REVERSE" ? "↔ عكس" : " مهلة"}
                  </td>
                  <td className="py-1 px-1 tabular-nums ltr-nums text-muted-foreground">{t.holdBars}h</td>
                  <td className="py-1 px-1 tabular-nums ltr-nums text-muted-foreground">{t.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "tv" && (
        <div>
          <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-gold" />
            مخطط TradingView — الذهب (XAUUSD) مع الصفقات
          </div>
          <div className="rounded-lg overflow-hidden border border-border" style={{ height: 500 }}>
            <iframe
              src="https://s.tradingview.com/widget_embed/?frameElementId=tv-chart&symbol=OANDA:XAUUSD&interval=240&hidesidetoolbar=false&theme=dark&style=1&studies=%5B%22MASimple%40tv-mini%22%2C%22RSI%40tv-basicstudies%22%2C%22MACD%40tv-basicstudies%22%5D&toolbarbg=f1f3f6&timezone=UTC&hideideasbtn=true&hidetoptoolbarbtn=false&saveimagebtn=false&calendar=false&hotlist=false&news=false&marketlogosize=2&studiesOverlays=%5B%5D&hidevolume=true&compareSymbol=OANDA:XAGUSD&compareSymbo=false&widgetBarBackgroundColor=%23f1f3f6&widgetBarActiveTab=1&compareSymbo=true&backGroundColor=%230a0e1a&gridColor=%23131826&fontColor=%23c7ccd9&isTransparent=false&showpopupwidth=true&showpopupscroll=true&width=100%25&height=500"
              style={{ width: "100%", height: "100%", border: 0 }}
              allowTransparency
              scrolling="no"
              title="TradingView Chart"
            />
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground text-center">
             TradingView Widget — رسم بياني احترافي مع مؤشرات RSI, MACD, MA + مقارنة مع الفضة (XAGUSD)
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-lg p-2.5 border" style={{ background: `${color}10`, borderColor: `${color}30` }}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] text-muted-foreground flex items-center gap-1" style={{ color }}>{icon}{label}</div>
      </div>
      <div className="text-base font-bold tabular-nums ltr-nums" style={{ color }}>{value}</div>
      <div className="text-[9px] mt-0.5" style={{ color: `${color}cc` }}>{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="stat-box">
      <div className="stat-label">{label}</div>
      <div className="stat-value text-sm tabular-nums ltr-nums" style={{ color }}>{value}</div>
    </div>
  );
}
