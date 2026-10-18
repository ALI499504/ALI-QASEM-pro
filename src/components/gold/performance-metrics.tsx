"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { useTradingStore } from "@/lib/store";

const ACCOUNT_BALANCE = 10000;

export default function PerformanceMetrics() {
  const { positions } = useTradingStore();

  const openPositions = positions.filter((p) => p.status === "OPEN");
  const closedPositions = positions.filter(
    (p) => p.status === "CLOSED" && typeof p.pnl === "number"
  );

  // Real metrics from closed positions
  const totalClosedPnL = closedPositions.reduce((s, p) => s + (p.pnl ?? 0), 0);
  const wins = closedPositions.filter((p) => (p.pnl ?? 0) > 0);
  const losses = closedPositions.filter((p) => (p.pnl ?? 0) < 0);
  const winRate = closedPositions.length > 0 ? (wins.length / closedPositions.length) * 100 : 0;
  const grossProfit = wins.reduce((s, p) => s + (p.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + (p.pnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? -grossLoss / losses.length : 0;
  const biggestWin = wins.length > 0 ? Math.max(...wins.map((p) => p.pnl ?? 0)) : 0;
  const biggestLoss = losses.length > 0 ? Math.min(...losses.map((p) => p.pnl ?? 0)) : 0;
  const floatingPnL = openPositions.reduce((s, p) => {
    const dir = p.side === "BUY" ? 1 : -1;
    return s + (p.currentPrice - p.entryPrice) * dir * p.lotSize * 100;
  }, 0);

  const currentEquity = ACCOUNT_BALANCE + totalClosedPnL + floatingPnL;
  const totalReturn = ((currentEquity - ACCOUNT_BALANCE) / ACCOUNT_BALANCE) * 100;

  const metrics: Array<{
    label: string;
    value: string;
    delta?: string;
    deltaColor?: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      label: "نسبة النجاح",
      value: closedPositions.length > 0 ? `${winRate.toFixed(1)}%` : "—",
      delta:
        closedPositions.length > 0
          ? `${wins.length} رابحة / ${losses.length} خاسرة`
          : "لا توجد صفقات مغلقة بعد",
      deltaColor: closedPositions.length > 0 ? "#4ade80" : "#8a96a8",
      icon: <Target className="w-3.5 h-3.5" />,
      color: "#4ade80",
    },
    {
      label: "معامل الربح",
      value:
        closedPositions.length > 0
          ? profitFactor === Infinity
            ? "∞"
            : profitFactor.toFixed(2)
          : "—",
      delta:
        grossProfit > 0 || grossLoss > 0
          ? `ربح $${grossProfit.toFixed(0)} / خسارة $${grossLoss.toFixed(0)}`
          : "لا توجد بيانات",
      deltaColor: profitFactor >= 1 ? "#4ade80" : "#f87171",
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      color: "#c8a050",
    },
    {
      label: "متوسط الربح",
      value: wins.length > 0 ? `+$${avgWin.toFixed(2)}` : "—",
      delta: wins.length > 0 ? `من ${wins.length} صفقة رابحة` : "لا أرباح بعد",
      deltaColor: "#4ade80",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      color: "#4ade80",
    },
    {
      label: "متوسط الخسارة",
      value: losses.length > 0 ? `-$${Math.abs(avgLoss).toFixed(2)}` : "—",
      delta: losses.length > 0 ? `من ${losses.length} صفقة خاسرة` : "لا خسائر بعد",
      deltaColor: "#f87171",
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      color: "#f87171",
    },
    {
      label: "الملكية الحالية",
      value: `$${currentEquity.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
      delta: `${floatingPnL >= 0 ? "+" : ""}$${floatingPnL.toFixed(2)} عائم`,
      deltaColor: floatingPnL >= 0 ? "#4ade80" : "#f87171",
      icon: <Wallet className="w-3.5 h-3.5" />,
      color: "#c8a050",
    },
    {
      label: "إجمالي العائد",
      value: `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`,
      delta: `${totalReturn >= 0 ? "+" : ""}$${(currentEquity - ACCOUNT_BALANCE).toFixed(2)}`,
      deltaColor: totalReturn >= 0 ? "#4ade80" : "#f87171",
      icon: <Activity className="w-3.5 h-3.5" />,
      color: totalReturn >= 0 ? "#4ade80" : "#f87171",
    },
  ];

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <BarChart3 className="w-4 h-4 section-heading-icon" />
          مؤشرات الأداء
        </h2>
        <span className="section-subtitle">
          {closedPositions.length} مغلقة + {openPositions.length} مفتوحة
        </span>
      </div>

      {closedPositions.length === 0 && openPositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-2 py-6">
          <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
          <div className="text-xs text-muted-foreground">
            لا توجد صفقات بعد — افتح صفقة من لوحة التداول لرؤية مؤشرات الأداء تُحسب من بياناتك الحقيقية.
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {metrics.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="stat-box"
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ background: `${m.color}15`, color: m.color }}
                  >
                    {m.icon}
                  </div>
                </div>
                <div className="stat-label">{m.label}</div>
                <div
                  className="stat-value tabular-nums ltr-nums"
                  style={{ color: m.color }}
                >
                  {m.value}
                </div>
                {m.delta && (
                  <div
                    className="text-[9px] mt-1 tabular-nums ltr-nums"
                    style={{ color: m.deltaColor }}
                  >
                    {m.delta}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Bottom summary */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="data-row">
              <span className="text-[11px] text-muted-foreground">عدد الصفقات الكلي</span>
              <span className="text-xs font-bold tabular-nums ltr-nums text-foreground">
                {positions.length} صفقة
              </span>
            </div>
            <div className="data-row">
              <span className="text-[11px] text-muted-foreground">أكبر ربح</span>
              <span className="text-xs font-bold tabular-nums ltr-nums text-bull">
                {biggestWin > 0 ? `+$${biggestWin.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="data-row">
              <span className="text-[11px] text-muted-foreground">أكبر خسارة</span>
              <span className="text-xs font-bold tabular-nums ltr-nums text-bear">
                {biggestLoss < 0 ? `-$${Math.abs(biggestLoss).toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="data-row">
              <span className="text-[11px] text-muted-foreground">الربح/الخسارة الإجمالية</span>
              <span
                className="text-xs font-bold tabular-nums ltr-nums"
                style={{ color: totalClosedPnL + floatingPnL >= 0 ? "#4ade80" : "#f87171" }}
              >
                {totalClosedPnL + floatingPnL >= 0 ? "+" : ""}$
                {(totalClosedPnL + floatingPnL).toFixed(2)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
