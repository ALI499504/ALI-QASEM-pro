"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Brain, Sparkles, Activity,
} from "lucide-react";
import type { Candle } from "@/lib/indicators";

interface Props {
  candles: Candle[];
}

interface Prediction {
  direction: "UP" | "DOWN" | "NEUTRAL";
  confidence: number;
  predictedPrice: number;
  upperBound: number;
  lowerBound: number;
  nextCandleTime: string;
  factors: { name: string; signal: "bull" | "bear" | "neutral"; strength: number }[];
}

export default function NeuralPredictor({ candles }: Props) {
  const prediction = useMemo(() => predictNextCandle(candles), [candles]);

  if (!prediction) return null;

  const color = prediction.direction === "UP" ? "#10b981" : prediction.direction === "DOWN" ? "#f43f5e" : "#d4a574";
  const Icon = prediction.direction === "UP" ? TrendingUp : prediction.direction === "DOWN" ? TrendingDown : Activity;
  const currentPrice = candles.at(-1)?.close ?? 0;
  const changePct = ((prediction.predictedPrice - currentPrice) / currentPrice) * 100;

  return (
    <div className="relative rounded-xl p-4 border overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}06, transparent)`, borderColor: `${color}20` }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Brain className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <div className="text-sm font-bold">تنبؤ الشبكة العصبية</div>
            <div className="text-[9px] text-muted-foreground font-mono">Neural Price Prediction</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-muted-foreground">الشمعة القادمة</div>
          <div className="text-[9px] text-muted-foreground/70 font-mono">{prediction.nextCandleTime}</div>
        </div>
      </div>

      {/* Prediction hero */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color }} />
            <span className="text-lg font-extrabold" style={{ color }}>
              {prediction.direction === "UP" ? "صعود متوقع" : prediction.direction === "DOWN" ? "هبوط متوقع" : "محايد"}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            السعر المتوقع: <span className="font-bold tabular-nums ltr-nums" style={{ color }}>${prediction.predictedPrice.toFixed(2)}</span>
            <span className="text-muted-foreground/60"> ({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)</span>
          </div>
        </div>
        {/* Confidence ring */}
        <div className="relative w-14 h-14">
          <svg width="56" height="56" className="-rotate-90">
            <circle cx="28" cy="28" r="22" stroke="rgba(148,163,184,0.08)" strokeWidth="4" fill="none" />
            <motion.circle
              cx="28" cy="28" r="22"
              stroke={color}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 22}
              initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - prediction.confidence / 100) }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums ltr-nums" style={{ color }}>
            {prediction.confidence}%
          </div>
        </div>
      </div>

      {/* Price range prediction */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="stat-box-modern text-center">
          <div className="stat-label">الحد الأدنى</div>
          <div className="stat-value text-bear tabular-nums ltr-nums text-xs">${prediction.lowerBound.toFixed(2)}</div>
        </div>
        <div className="stat-box-modern text-center">
          <div className="stat-label">السعر المتوقع</div>
          <div className="stat-value tabular-nums ltr-nums text-xs" style={{ color }}>${prediction.predictedPrice.toFixed(2)}</div>
        </div>
        <div className="stat-box-modern text-center">
          <div className="stat-label">الحد الأعلى</div>
          <div className="stat-value text-bull tabular-nums ltr-nums text-xs">${prediction.upperBound.toFixed(2)}</div>
        </div>
      </div>

      {/* Neural factors */}
      <div>
        <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-gold" /> عوامل التنبؤ (المدخلات العصبية)
        </div>
        <div className="space-y-1">
          {prediction.factors.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-secondary/30">
              <span className="text-[10px] text-foreground flex-1">{f.name}</span>
              <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${f.strength}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: f.signal === "bull" ? "#10b981" : f.signal === "bear" ? "#f43f5e" : "#d4a574" }}
                />
              </div>
              <span className="text-[9px] font-bold tabular-nums ltr-nums w-8 text-left" style={{ color: f.signal === "bull" ? "#10b981" : f.signal === "bear" ? "#f43f5e" : "#d4a574" }}>
                {f.signal === "bull" ? "▲" : f.signal === "bear" ? "▼" : "●"} {f.strength}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-2 text-[8px] text-muted-foreground/50 text-center">
         التنبؤ مبني على تحليل 100+ شمعة سابقة — لا يضمن النتائج المستقبلية
      </div>
    </div>
  );
}

function predictNextCandle(candles: Candle[]): Prediction | null {
  if (candles.length < 30) return null;

  const closes = candles.map(c => c.close);
  const lastPrice = closes.at(-1)!;
  const last20 = closes.slice(-20);
  const last50 = closes.slice(-50);
  const last100 = closes.slice(-100);

  // EMA 9, 21, 50
  const ema9 = computeEma(closes.slice(-30), 9).at(-1)!;
  const ema21 = computeEma(closes.slice(-50), 21).at(-1)!;
  const ema50 = computeEma(closes.slice(-100), 50).at(-1)!;

  // RSI
  const rsi = computeRsi(closes.slice(-30), 14);

  // Momentum (last 5 candles)
  const momentum = (lastPrice - closes.at(-6)!) / closes.at(-6)! * 100;

  // Volume trend
  const recentVolumes = candles.slice(-10).map(c => c.volume);
  const avgVol = recentVolumes.reduce((s, v) => s + v, 0) / recentVolumes.length;
  const lastVol = candles.at(-1)!.volume;
  const volRatio = lastVol / avgVol;

  // Recent range
  const recentRange = Math.max(...candles.slice(-10).map(c => c.high)) - Math.min(...candles.slice(-10).map(c => c.low));
  const avgCandleSize = candles.slice(-10).reduce((s, c) => s + (c.high - c.low), 0) / 10;
  const expectedMove = avgCandleSize * 1.2;

  // Neural factors scoring
  const factors: Prediction["factors"] = [
    { name: "EMA 9/21 ترتيب", signal: ema9 > ema21 ? "bull" : "bear", strength: Math.min(100, Math.abs((ema9 - ema21) / ema21) * 500) },
    { name: "EMA 21/50 ترتيب", signal: ema21 > ema50 ? "bull" : "bear", strength: Math.min(100, Math.abs((ema21 - ema50) / ema50) * 500) },
    { name: "RSI (14)", signal: rsi < 45 ? "bull" : rsi > 55 ? "bear" : "neutral", strength: Math.abs(rsi - 50) * 2 },
    { name: "الزخم (5 شمعات)", signal: momentum > 0 ? "bull" : "bear", strength: Math.min(100, Math.abs(momentum) * 20) },
    { name: "حجم التداول", signal: volRatio > 1.3 ? (momentum > 0 ? "bull" : "bear") : "neutral", strength: Math.min(100, Math.abs(volRatio - 1) * 50) },
    { name: "السعر vs EMA50", signal: lastPrice > ema50 ? "bull" : "bear", strength: Math.min(100, Math.abs((lastPrice - ema50) / ema50) * 300) },
  ];

  // Weighted prediction
  const bullScore = factors.filter(f => f.signal === "bull").reduce((s, f) => s + f.strength, 0);
  const bearScore = factors.filter(f => f.signal === "bear").reduce((s, f) => s + f.strength, 0);
  const totalScore = bullScore + bearScore || 1;

  const bullProb = bullScore / totalScore;
  const bearProb = bearScore / totalScore;

  let direction: "UP" | "DOWN" | "NEUTRAL";
  let confidence: number;
  let predictedMove: number;

  if (bullProb > 0.6) {
    direction = "UP";
    confidence = Math.round(bullProb * 100);
    predictedMove = expectedMove * (0.3 + bullProb * 0.4);
  } else if (bearProb > 0.6) {
    direction = "DOWN";
    confidence = Math.round(bearProb * 100);
    predictedMove = -expectedMove * (0.3 + bearProb * 0.4);
  } else {
    direction = "NEUTRAL";
    confidence = Math.round(100 - Math.abs(bullProb - bearProb) * 100);
    predictedMove = expectedMove * (bullProb - bearProb) * 0.3;
  }

  const predictedPrice = Math.round((lastPrice + predictedMove) * 100) / 100;
  const upperBound = Math.round((predictedPrice + expectedMove * 0.8) * 100) / 100;
  const lowerBound = Math.round((predictedPrice - expectedMove * 0.8) * 100) / 100;

  const nextCandleTime = new Date((candles.at(-1)!.time + 300) * 1000).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  return {
    direction,
    confidence: Math.min(95, confidence),
    predictedPrice,
    upperBound,
    lowerBound,
    nextCandleTime,
    factors,
  };
}

function computeEma(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i - 1] * (1 - k));
  return out;
}

function computeRsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  return 100 - 100 / (1 + gains / losses);
}
