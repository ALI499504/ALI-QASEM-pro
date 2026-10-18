"use client";

import { motion } from "framer-motion";
import { LineChart, TrendingUp, TrendingDown, Activity, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useTradingStore } from "@/lib/store";
import { useMemo } from "react";

const ACCOUNT_BALANCE = 10000;

export default function EquityCurve() {
  const { positions } = useTradingStore();

  // Compute REAL floating P/L from open positions
  const floatingPnL = positions
    .filter((p) => p.status === "OPEN")
    .reduce((s, p) => {
      const direction = p.side === "BUY" ? 1 : -1;
      return s + (p.currentPrice - p.entryPrice) * direction * p.lotSize * 100;
    }, 0);

  // Closed trades P/L (real)
  const closedPnL = positions
    .filter((p) => p.status === "CLOSED" && typeof p.pnl === "number")
    .reduce((s, p) => s + (p.pnl ?? 0), 0);

  const openCount = positions.filter((p) => p.status === "OPEN").length;
  const closedCount = positions.filter((p) => p.status === "CLOSED").length;
  const totalCount = positions.length;

  const currentEquity = ACCOUNT_BALANCE + floatingPnL + closedPnL;
  const peakEquity = Math.max(ACCOUNT_BALANCE, currentEquity);
  const currentDrawdown = peakEquity - currentEquity;
  const totalReturn = ((currentEquity - ACCOUNT_BALANCE) / ACCOUNT_BALANCE) * 100;
  const isProfit = totalReturn >= 0;

  // Build a real equity progression chart based on closed + open positions
  const chartData = useMemo(() => {
    const points: { time: string; equity: number; label: string }[] = [
      { time: "البداية", equity: ACCOUNT_BALANCE, label: "رصيد ابتدائي" },
    ];

    let runningPnL = 0;
    const closedPositions = positions
      .filter((p) => p.status === "CLOSED" && typeof p.pnl === "number")
      .sort((a, b) => (a.closedAt ?? "").localeCompare(b.closedAt ?? ""));

    closedPositions.forEach((p, i) => {
      runningPnL += p.pnl ?? 0;
      points.push({
        time: `#${i + 1}`,
        equity: ACCOUNT_BALANCE + runningPnL,
        label: `${p.side === "BUY" ? "شراء" : "بيع"} ${p.pnl! >= 0 ? "+" : ""}$${p.pnl!.toFixed(0)}`,
      });
    });

    // Add current state (with floating P/L)
    points.push({
      time: "الآن",
      equity: currentEquity,
      label: `${floatingPnL >= 0 ? "+" : ""}$${floatingPnL.toFixed(0)} عائم`,
    });

    return points;
  }, [positions, currentEquity, floatingPnL]);

  const hasData = positions.length > 0;

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <LineChart className="w-4 h-4 section-heading-icon" />
          منحنى الملكية
        </h2>
        <span className="section-subtitle">
          Equity Curve • {openCount} مفتوحة + {closedCount} مغلقة
        </span>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="stat-box">
          <div className="stat-label">الرصيد الابتدائي</div>
          <div className="stat-value tabular-nums ltr-nums">
            ${ACCOUNT_BALANCE.toLocaleString("en-US")}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">الملكية الحالية</div>
          <div className="stat-value tabular-nums ltr-nums" style={{ color: isProfit ? "#4ade80" : "#f87171" }}>
            ${currentEquity.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">إجمالي العائد</div>
          <div className="stat-value tabular-nums ltr-nums" style={{ color: isProfit ? "#4ade80" : "#f87171" }}>
            {isProfit ? "+" : ""}{totalReturn.toFixed(2)}%
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">الربح/الخسارة العائمة</div>
          <div className="stat-value tabular-nums ltr-nums" style={{ color: floatingPnL >= 0 ? "#4ade80" : "#f87171" }}>
            {floatingPnL >= 0 ? "+" : ""}${floatingPnL.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8a050" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#c8a050" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#232a3d" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#8a96a8"
                tick={{ fontSize: 9, fill: "#8a96a8" }}
                tickLine={false}
                axisLine={{ stroke: "#232a3d" }}
              />
              <YAxis
                stroke="#8a96a8"
                tick={{ fontSize: 9, fill: "#8a96a8" }}
                tickLine={false}
                axisLine={{ stroke: "#232a3d" }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "#131826",
                  border: "1px solid #232a3d",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
                labelStyle={{ color: "#8a96a8" }}
                formatter={(value: any) => [
                  <span key="v" style={{ color: "#c8a050" }} className="tabular-nums ltr-nums">
                    ${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>,
                  "الملكية",
                ]}
              />
              <ReferenceLine y={ACCOUNT_BALANCE} stroke="#4ade80" strokeDasharray="3 3" strokeOpacity={0.4} />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#c8a050"
                strokeWidth={2}
                fill="url(#equityGradient)"
                dot={{ r: 3, fill: "#c8a050" }}
                activeDot={{ r: 5, fill: "#c8a050" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
            <div className="text-xs text-muted-foreground">
              لا توجد صفقات بعد — افتح صفقة من لوحة التداول لرؤية منحنى الملكية يتطور.
            </div>
          </div>
        )}
      </div>

      {/* Bottom indicators */}
      <div className="mt-3 pt-2 border-t border-border grid grid-cols-3 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-gold" />
          <span className="text-muted-foreground">إجمالي الصفقات:</span>
          <span className="font-bold text-foreground tabular-nums ltr-nums">{totalCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-bull" />
          <span className="text-muted-foreground">نقطة الذروة:</span>
          <span className="font-bold text-bull tabular-nums ltr-nums">${peakEquity.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3 h-3 text-bear" />
          <span className="text-muted-foreground">التراجع الحالي:</span>
          <span className="font-bold text-bear tabular-nums ltr-nums">
            {peakEquity > 0 ? `-${((currentDrawdown / peakEquity) * 100).toFixed(1)}%` : "0%"}
          </span>
        </div>
      </div>
    </div>
  );
}
