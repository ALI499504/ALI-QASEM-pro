"use client";

import { Wallet, TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import { useTradingStore, computePositionPnL } from "@/lib/store";
import type { MarketData } from "@/app/page";

interface Props {
  market: MarketData | null;
}

const ACCOUNT_BALANCE = 10000;

export default function AccountSummary({ market }: Props) {
  const { positions } = useTradingStore();
  const open = positions.filter((p) => p.status === "OPEN");
  const currentPrice = market?.price?.price ?? 0;

  // Calculate account metrics
  const usedMargin = open.reduce((s, p) => s + p.margin, 0);
  const floatingPnL = open.reduce((s, p) => {
    const tempP = { ...p, currentPrice };
    return s + computePositionPnL(tempP).pnl;
  }, 0);
  const equity = ACCOUNT_BALANCE + floatingPnL;
  const freeMargin = equity - usedMargin;
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0;

  return (
    <div className="card-elevated rounded-lg p-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryStat
          label="الرصيد"
          value={`$${ACCOUNT_BALANCE.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          icon={<Wallet className="w-3.5 h-3.5" />}
        />
        <SummaryStat
          label="الملكية"
          value={`$${equity.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          color={floatingPnL >= 0 ? "#4ade80" : "#f87171"}
          icon={<Activity className="w-3.5 h-3.5" />}
        />
        <SummaryStat
          label="الهامش المستخدم"
          value={`$${usedMargin.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          icon={<TrendingDown className="w-3.5 h-3.5" />}
        />
        <SummaryStat
          label="الهامر المتاح"
          value={`$${freeMargin.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          color="#60a5fa"
          icon={<TrendingUp className="w-3.5 h-3.5" />}
        />
        <SummaryStat
          label="مستوى الهامش"
          value={usedMargin > 0 ? `${marginLevel.toFixed(1)}%` : "—"}
          color={marginLevel > 200 ? "#4ade80" : marginLevel > 100 ? "#fbbf24" : "#f87171"}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
        />
        <SummaryStat
          label="الربح/الخسارة العائمة"
          value={`${floatingPnL >= 0 ? "+" : ""}$${floatingPnL.toFixed(2)}`}
          color={floatingPnL >= 0 ? "#4ade80" : "#f87171"}
          icon={floatingPnL >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        />
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded flex items-center justify-center"
        style={{ background: `${color ?? "#c8a050"}15`, color: color ?? "#c8a050" }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div
          className="text-sm font-bold tabular-nums ltr-nums"
          style={{ color: color ?? "#e6ebf2" }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
