"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Calculator, DollarSign, Activity, Zap,
  TrendingUp, TrendingDown,
} from "lucide-react";

interface Props {
  currentPrice: number;
  indicators: {
    atr: number;
    rsi: number;
    ema9: number;
    ema21: number;
    ema50: number;
    macdHist: number;
    williamsR: number;
    volumeTrend: string;
  } | null;
}

const ACCOUNT_BALANCE = 10000;

export default function AutoPositionSizing({ currentPrice, indicators }: Props) {
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const result = useMemo(() => {
    if (!indicators || !currentPrice) return null;

    const entryPrice = entry ? parseFloat(entry) : currentPrice;
    const sl = stopLoss ? parseFloat(stopLoss) : currentPrice - indicators.atr * 1.5;
    const riskPercent = parseFloat(riskPct) || 1;
    const riskAmount = (ACCOUNT_BALANCE * riskPercent) / 100;

    // Risk per unit
    const slDistance = Math.abs(entryPrice - sl);
    if (slDistance <= 0) return null;

    // Kelly Criterion
    const winRate = 0.55 + (indicators.macdHist > 0 ? 0.05 : -0.05) + (indicators.rsi < 40 ? 0.05 : indicators.rsi > 60 ? -0.05 : 0);
    const adjustedWinRate = Math.max(0.3, Math.min(0.8, winRate));
    const avgWin = indicators.atr * 2;
    const avgLoss = indicators.atr * 1.5;
    const payoffRatio = avgWin / avgLoss;
    const kellyFull = Math.max(0, adjustedWinRate - (1 - adjustedWinRate) / payoffRatio);
    const kellyHalf = kellyFull / 2;

    // Volatility-adjusted lot size
    const atrPct = (indicators.atr / currentPrice) * 100;
    const volMultiplier = atrPct > 0.8 ? 0.5 : atrPct > 0.5 ? 0.75 : 1.0;

    // Correlation factor (simplified — if gold and DXY likely inverse)
    const correlationFactor = 0.9;

    // Calculate lot size
    const riskLotSize = riskAmount / (slDistance * 100); // 1 lot = 100 oz
    const kellyLotSize = (ACCOUNT_BALANCE * kellyHalf * volMultiplier * correlationFactor) / (slDistance * 100 * 10);
    const recommendedLot = Math.min(riskLotSize, kellyLotSize);
    const recommendedLotCapped = Math.min(recommendedLot, 5); // max 5 lots

    // TP suggestions
    const tp1 = entryPrice + (entryPrice - sl) * 2 * (indicators.macdHist > 0 ? 1 : -1);
    const tp2 = entryPrice + (entryPrice - sl) * 3 * (indicators.macdHist > 0 ? 1 : -1);

    // Risk metrics
    const positionValue = recommendedLotCapped * 100 * entryPrice;
    const marginRequired = positionValue / 10; // 1:10 leverage
    const potentialLoss = riskAmount;
    const potentialProfit = riskAmount * (payoffRatio || 2);

    // Confidence in the setup
    const confluenceScore = Math.min(100,
      (indicators.macdHist > 0 ? 15 : -10) +
      (indicators.rsi < 35 ? 15 : indicators.rsi > 65 ? -10 : 5) +
      (indicators.ema9 > indicators.ema21 ? 10 : -5) +
      (indicators.ema21 > indicators.ema50 ? 10 : -5) +
      (indicators.williamsR < -50 ? 10 : 0) +
      (indicators.volumeTrend === "high" ? 10 : 0) +
      50
    );

    return {
      recommendedLot: Math.round(recommendedLotCapped * 100) / 100,
      kellyFull: Math.round(kellyFull * 1000) / 10,
      kellyHalf: Math.round(kellyHalf * 1000) / 10,
      riskAmount: Math.round(riskAmount * 100) / 100,
      potentialLoss: Math.round(potentialLoss * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      positionValue: Math.round(positionValue),
      marginRequired: Math.round(marginRequired),
      tp1: Math.round(tp1 * 100) / 100,
      tp2: Math.round(tp2 * 100) / 100,
      winRate: Math.round(adjustedWinRate * 100),
      atrPct: Math.round(atrPct * 100) / 100,
      volMultiplier,
      confluenceScore: Math.max(0, Math.min(100, confluenceScore)),
      riskReward: Math.round((potentialProfit / potentialLoss) * 100) / 100,
    };
  }, [currentPrice, indicators, entry, stopLoss, riskPct]);

  if (!result) return null;

  const confluenceColor = result.confluenceScore > 70 ? "#10b981" : result.confluenceScore > 50 ? "#fbbf24" : "#f43f5e";

  return (
    <div className="relative rounded-xl p-4 border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold/10 border border-gold/30">
            <Shield className="w-4 h-4 text-gold" />
          </div>
          <div>
            <div className="text-sm font-bold">حجم الصفقة الآلي</div>
            <div className="text-[9px] text-muted-foreground font-mono">Auto Position Sizing — Kelly + Volatility</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-muted-foreground">درجة الإقناع</div>
          <div className="text-sm font-bold tabular-nums ltr-nums" style={{ color: confluenceColor }}>{result.confluenceScore}%</div>
        </div>
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="text-[9px] text-muted-foreground block mb-0.5">نسبة المخاطرة</label>
          <select
            value={riskPct}
            onChange={(e) => setRiskPct(e.target.value)}
            className="w-full h-7 rounded bg-secondary border border-border text-[10px] px-1"
          >
            <option value="0.5">0.5%</option>
            <option value="1">1%</option>
            <option value="2">2%</option>
            <option value="3">3%</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground block mb-0.5">سعر الدخول</label>
          <input
            type="number"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder={currentPrice.toFixed(2)}
            className="w-full h-7 rounded bg-secondary border border-border text-[10px] px-1 tabular-nums ltr-nums"
          />
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground block mb-0.5">وقف الخسارة</label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder={(currentPrice - (indicators?.atr ?? 5) * 1.5).toFixed(2)}
            className="w-full h-7 rounded bg-secondary border border-border text-[10px] px-1 tabular-nums ltr-nums"
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="stat-box-modern">
          <div className="stat-label">حجم موصى به</div>
          <div className="stat-value text-gold tabular-nums ltr-nums">{result.recommendedLot} لوت</div>
        </div>
        <div className="stat-box-modern">
          <div className="stat-label">مبلغ المخاطرة</div>
          <div className="stat-value text-bear tabular-nums ltr-nums">${result.riskAmount}</div>
        </div>
        <div className="stat-box-modern">
          <div className="stat-label">ربح متوقع</div>
          <div className="stat-value text-bull tabular-nums ltr-nums">+${result.potentialProfit}</div>
        </div>
        <div className="stat-box-modern">
          <div className="stat-label">مخاطرة/عائد</div>
          <div className="stat-value text-info tabular-nums ltr-nums">1:{result.riskReward}</div>
        </div>
      </div>

      {/* Kelly + Volatility details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-[10px]">
        <div className="px-2 py-1.5 rounded bg-secondary/30 border border-border/30">
          <div className="text-muted-foreground">Kelly كامل</div>
          <div className="font-bold tabular-nums ltr-nums text-gold">{result.kellyFull}%</div>
        </div>
        <div className="px-2 py-1.5 rounded bg-secondary/30 border border-border/30">
          <div className="text-muted-foreground">Kelly نصف</div>
          <div className="font-bold tabular-nums ltr-nums text-bull">{result.kellyHalf}%</div>
        </div>
        <div className="px-2 py-1.5 rounded bg-secondary/30 border border-border/30">
          <div className="text-muted-foreground">معدل النجاح المتوقع</div>
          <div className="font-bold tabular-nums ltr-nums">{result.winRate}%</div>
        </div>
        <div className="px-2 py-1.5 rounded bg-secondary/30 border border-border/30">
          <div className="text-muted-foreground">معامل التقلب</div>
          <div className="font-bold tabular-nums ltr-nums" style={{ color: result.volMultiplier < 1 ? "#f43f5e" : "#10b981" }}>×{result.volMultiplier}</div>
        </div>
      </div>

      {/* Confluence bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[9px] mb-1">
          <span className="text-muted-foreground">درجة الإقناع (Confluence)</span>
          <span className="font-bold tabular-nums ltr-nums" style={{ color: confluenceColor }}>{result.confluenceScore}/100</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${result.confluenceScore}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, #f43f5e, ${confluenceColor})` }}
          />
        </div>
      </div>

      {/* Suggested TP levels */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-muted-foreground">أهداف مقترحة:</span>
        <span className="font-bold text-bull tabular-nums ltr-nums">TP1: ${result.tp1}</span>
        <span className="text-muted-foreground">•</span>
        <span className="font-bold text-bull tabular-nums ltr-nums">TP2: ${result.tp2}</span>
      </div>
    </div>
  );
}
