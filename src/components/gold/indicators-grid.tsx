"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  BarChart3,
} from "lucide-react";
import type { IndicatorSet } from "@/lib/indicators";

interface Props {
  indicators: IndicatorSet;
}

export default function IndicatorsGrid({ indicators: i }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <RSICard value={i.rsi} signal={i.rsiSignal} />
      <MACDCard
        macd={i.macd}
        signal={i.macdSignal}
        hist={i.macdHist}
        trend={i.macdTrend}
      />
      <WilliamsCard value={i.williamsR} signal={i.williamsSignal} />
      <EMACard ema9={i.ema9} ema21={i.ema21} ema50={i.ema50} trend={i.emaTrend} />
      <BollingerCard upper={i.bbUpper} mid={i.bbMiddle} lower={i.bbLower} />
      <VolumeCard vol={i.volume} avg={i.avgVolume} trend={i.volumeTrend} />
    </div>
  );
}

function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass rounded-2xl p-4 card-hover"
    >
      {children}
    </motion.div>
  );
}

function Tag({ tone }: { tone: "bull" | "bear" | "neutral" }) {
  const map = {
    bull: { color: "#22d39a", label: "صعودي" },
    bear: { color: "#ff4d6a", label: "هبوطي" },
    neutral: { color: "#ffc933", label: "محايد" },
  } as const;
  const c = map[tone];
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
      style={{ background: `${c.color}1a`, color: c.color }}
    >
      {c.label}
    </span>
  );
}

function toneOf(bull: boolean, bear: boolean): "bull" | "bear" | "neutral" {
  return bull ? "bull" : bear ? "bear" : "neutral";
}

function RSICard({ value, signal }: { value: number; signal: string }) {
  const tone = signal === "oversold" ? "bull" : signal === "overbought" ? "bear" : "neutral";
  const color = tone === "bull" ? "#22d39a" : tone === "bear" ? "#ff4d6a" : "#ffc933";
  // position on bar 0..100
  const pct = Math.min(100, Math.max(0, value));
  return (
    <Card delay={0.0}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Gauge className="w-3.5 h-3.5" /> RSI (14)
        </div>
        <Tag tone={toneOf(signal === "oversold", signal === "overbought")} />
      </div>
      <div className="text-2xl font-bold tabular-nums ltr-nums" style={{ color }}>
        {value.toFixed(1)}
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
        <div className="absolute top-0 -translate-x-1/2 h-2 w-px bg-white/30" style={{ left: "30%" }} />
        <div className="absolute top-0 -translate-x-1/2 h-2 w-px bg-white/30" style={{ left: "70%" }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1">
        <span>تشبع بيعي</span>
        <span>محايد</span>
        <span>تشبع شرائي</span>
      </div>
    </Card>
  );
}

function MACDCard({
  macd,
  signal,
  hist,
  trend,
}: {
  macd: number;
  signal: number;
  hist: number;
  trend: string;
}) {
  const tone = trend === "bullish" ? "bull" : trend === "bearish" ? "bear" : "neutral";
  const color = tone === "bull" ? "#22d39a" : tone === "bear" ? "#ff4d6a" : "#ffc933";
  return (
    <Card delay={0.05}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Activity className="w-3.5 h-3.5" /> MACD
        </div>
        <Tag tone={toneOf(trend === "bullish", trend === "bearish")} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] text-muted-foreground">MACD</div>
          <div className="text-sm font-semibold tabular-nums ltr-nums" style={{ color }}>
            {macd.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">سيقنال</div>
          <div className="text-sm font-semibold tabular-nums ltr-nums text-foreground">
            {signal.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">هيستوغرام</div>
          <div
            className="text-sm font-semibold tabular-nums ltr-nums"
            style={{ color: hist >= 0 ? "#22d39a" : "#ff4d6a" }}
          >
            {hist >= 0 ? "+" : ""}
            {hist.toFixed(2)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function WilliamsCard({ value, signal }: { value: number; signal: string }) {
  const tone = signal === "oversold" ? "bull" : signal === "overbought" ? "bear" : "neutral";
  const color = tone === "bull" ? "#22d39a" : tone === "bear" ? "#ff4d6a" : "#ffc933";
  // scale -100..0 → 0..100
  const pct = (-value / 100) * 100;
  return (
    <Card delay={0.1}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Gauge className="w-3.5 h-3.5" /> Williams %R
        </div>
        <Tag tone={toneOf(signal === "oversold", signal === "overbought")} />
      </div>
      <div className="text-2xl font-bold tabular-nums ltr-nums" style={{ color }}>
        {value.toFixed(1)}
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1">
        <span>-100</span>
        <span>-50</span>
        <span>0</span>
      </div>
    </Card>
  );
}

function EMACard({
  ema9,
  ema21,
  ema50,
  trend,
}: {
  ema9: number;
  ema21: number;
  ema50: number;
  trend: string;
}) {
  const tone = trend === "bullish" ? "bull" : trend === "bearish" ? "bear" : "neutral";
  const color = tone === "bull" ? "#22d39a" : tone === "bear" ? "#ff4d6a" : "#ffc933";
  const Icon = tone === "bull" ? TrendingUp : tone === "bear" ? TrendingDown : Minus;
  return (
    <Card delay={0.15}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Layers className="w-3.5 h-3.5" /> المتوسطات المتحركة
        </div>
        <span
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
          style={{ background: `${color}1a`, color }}
        >
          <Icon className="w-3 h-3" /> {tone === "bull" ? "صاعد" : tone === "bear" ? "هابط" : "محايد"}
        </span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">EMA 9</span>
          <span className="tabular-nums ltr-nums" style={{ color: "#5b8cff" }}>
            {ema9.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">EMA 21</span>
          <span className="tabular-nums ltr-nums" style={{ color: "#b07cff" }}>
            {ema21.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">EMA 50</span>
          <span className="tabular-nums ltr-nums" style={{ color: "#ffc933" }}>
            {ema50.toFixed(2)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function BollingerCard({
  upper,
  mid,
  lower,
}: {
  upper: number;
  mid: number;
  lower: number;
}) {
  return (
    <Card delay={0.2}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Layers className="w-3.5 h-3.5" /> بولينجر باند
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">العلوي</span>
          <span className="tabular-nums ltr-nums text-rose-400">{upper.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">المتوسط</span>
          <span className="tabular-nums ltr-nums text-gold">{mid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">السفلي</span>
          <span className="tabular-nums ltr-nums text-emerald-400">{lower.toFixed(2)}</span>
        </div>
      </div>
    </Card>
  );
}

function VolumeCard({
  vol,
  avg,
  trend,
}: {
  vol: number;
  avg: number;
  trend: string;
}) {
  const tone = trend === "high" ? "bull" : trend === "low" ? "bear" : "neutral";
  const color = tone === "bull" ? "#22d39a" : tone === "bear" ? "#ff4d6a" : "#ffc933";
  const ratio = avg ? vol / avg : 0;
  return (
    <Card delay={0.25}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <BarChart3 className="w-3.5 h-3.5" /> الحجم
        </div>
        <Tag tone={tone} />
      </div>
      <div className="text-2xl font-bold tabular-nums ltr-nums" style={{ color }}>
        {(vol / 1000).toFixed(2)}K
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">
        متوسط 30 جلسة: {(avg / 1000).toFixed(2)}K
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, ratio * 60)}%`, background: color }}
        />
      </div>
    </Card>
  );
}
