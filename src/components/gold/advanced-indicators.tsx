"use client";

import { motion } from "framer-motion";
import {
  Layers,
  Activity,
  TrendingUp,
  TrendingDown,
  Cloud,
  DollarSign,
} from "lucide-react";
import type { IndicatorSet } from "@/lib/indicators";
import AnimatedNumber from "@/components/ui/animated-number";

interface Props {
  indicators: IndicatorSet;
}

/**
 * AdvancedIndicators — displays the pro-tier technical indicators:
 * VWAP, Stochastic, ADX, Ichimoku Cloud, OBV, CCI, MFI
 */
export default function AdvancedIndicators({ indicators: i }: Props) {
  if (!i) return null;

  const ichiBullColor = i.ichimokuCloud === "bullish" ? "#22d39a" : i.ichimokuCloud === "bearish" ? "#ff4d6a" : "#8a96a8";
  const ichiBullLabel =
    i.ichimokuCloud === "bullish" ? "صاعد " : i.ichimokuCloud === "bearish" ? "هابط " : "محايد ●";
  const vwapLabel =
    i.vwapSignal === "above" ? "فوق VWAP" : i.vwapSignal === "below" ? "تحت VWAP" : "عند VWAP";
  const vwapColor = i.vwapSignal === "above" ? "#22d39a" : i.vwapSignal === "below" ? "#ff4d6a" : "#8a96a8";

  const stochColor = i.stochasticSignal === "oversold" ? "#22d39a" : i.stochasticSignal === "overbought" ? "#ff4d6a" : "#8a96a8";
  const stochLabel =
    i.stochasticSignal === "oversold" ? "تشبع بيعي" : i.stochasticSignal === "overbought" ? "تشبع شرائي" : "محايد";

  const adxColor = i.adxTrend === "strong" ? "#22d39a" : i.adxTrend === "weak" ? "#ff4d6a" : "#8a96a8";
  const adxLabel = i.adxTrend === "strong" ? "اتجاه قوي" : i.adxTrend === "weak" ? "اتجاه ضعيف" : "محايد";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3"
    >
      {/* VWAP */}
      <IndicatorCard
        icon={<DollarSign className="w-3 h-3" />}
        label="VWAP"
        value={
          <AnimatedNumber value={i.vwap} decimals={2} className="tabular-nums ltr-nums" />
        }
        sub={vwapLabel}
        color={vwapColor}
      />

      {/* Stochastic */}
      <IndicatorCard
        icon={<Activity className="w-3 h-3" />}
        label="Stochastic"
        value={
          <span className="tabular-nums ltr-nums">
            <AnimatedNumber value={i.stochasticK} decimals={1} /> /{" "}
            <AnimatedNumber value={i.stochasticD} decimals={1} />
          </span>
        }
        sub={stochLabel}
        color={stochColor}
      />

      {/* ADX */}
      <IndicatorCard
        icon={<TrendingUp className="w-3 h-3" />}
        label="ADX (Trend)"
        value={<AnimatedNumber value={i.adx} decimals={1} className="tabular-nums ltr-nums" />}
        sub={adxLabel}
        color={adxColor}
      />

      {/* Ichimoku Cloud */}
      <IndicatorCard
        icon={<Cloud className="w-3 h-3" />}
        label="Ichimoku Cloud"
        value={
          <span className="text-xs">
            T:<AnimatedNumber value={i.ichimokuTenkan} decimals={2} /> / K:
            <AnimatedNumber value={i.ichimokuKijun} decimals={2} />
          </span>
        }
        sub={ichiBullLabel}
        color={ichiBullColor}
      />

      {/* OBV */}
      <IndicatorCard
        icon={<Layers className="w-3 h-3" />}
        label="OBV"
        value={
          <AnimatedNumber
            value={i.obv}
            decimals={0}
            prefix={i.obv >= 0 ? "+" : ""}
            className="tabular-nums ltr-nums"
          />
        }
        sub={i.obvTrend === "bullish" ? "صاعد" : i.obvTrend === "bearish" ? "هابط" : "محايد"}
        color={i.obvTrend === "bullish" ? "#22d39a" : i.obvTrend === "bearish" ? "#ff4d6a" : "#8a96a8"}
      />

      {/* CCI */}
      <IndicatorCard
        icon={<Activity className="w-3 h-3" />}
        label="CCI (20)"
        value={
          <AnimatedNumber
            value={i.cci}
            decimals={1}
            prefix={i.cci >= 0 ? "+" : ""}
            className="tabular-nums ltr-nums"
          />
        }
        sub={i.cci > 100 ? "زائد مشترى" : i.cci < -100 ? "زائد مباع" : "نطاق طبيعي"}
        color={i.cci > 100 ? "#22d39a" : i.cci < -100 ? "#ff4d6a" : "#8a96a8"}
      />

      {/* MFI */}
      <IndicatorCard
        icon={<TrendingDown className="w-3 h-3" />}
        label="MFI (14)"
        value={<AnimatedNumber value={i.mfi} decimals={1} className="tabular-nums ltr-nums" />}
        sub={i.mfi < 20 ? "تشبع بيعي" : i.mfi > 80 ? "تشبع شرائي" : "محايد"}
        color={i.mfi < 20 ? "#22d39a" : i.mfi > 80 ? "#ff4d6a" : "#8a96a8"}
      />

      {/* Ichimoku Spans */}
      <IndicatorCard
        icon={<Cloud className="w-3 h-3" />}
        label="Senkou A/B"
        value={
          <span className="text-xs tabular-nums ltr-nums">
            <AnimatedNumber value={i.ichimokuSenkouA} decimals={2} /> /{" "}
            <AnimatedNumber value={i.ichimokuSenkouB} decimals={2} />
          </span>
        }
        sub={ichiBullLabel}
        color={ichiBullColor}
      />
    </motion.div>
  );
}

function IndicatorCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-lg p-2.5 border"
      style={{
        background: `${color}10`,
        borderColor: `${color}30`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] text-muted-foreground flex items-center gap-1" style={{ color }}>
          {icon}
          {label}
        </div>
      </div>
      <div className="text-base font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] mt-0.5" style={{ color: `${color}cc` }}>
        {sub}
      </div>
    </motion.div>
  );
}
