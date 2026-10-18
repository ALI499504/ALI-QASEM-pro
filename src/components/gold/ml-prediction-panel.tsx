"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, TrendingUp, TrendingDown, Minus, Clock, Activity } from "lucide-react";

interface MLPrediction {
  direction: string;
  directionAr: string;
  probability: number;
  bullProbability: number;
  bearProbability: number;
  predictedPrice: number;
  priceMin: number;
  priceMax: number;
  priceRange: number;
  confidence: number;
  modelAccuracy: number;
  features: { name: string; nameAr: string; value: number; contribution: number; weight: number }[];
  nextCandleTime: string;
  currentCandleClose: number;
  summary: string;
}

export default function MLPredictionPanel() {
  const [prediction, setPrediction] = useState<MLPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchPrediction() {
    try {
      const res = await fetch("/api/gold/predict", { cache: "no-store" });
      const data = await res.json();
      if (data?.prediction) setPrediction(data.prediction);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchPrediction();
    const t = setInterval(fetchPrediction, 15_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Brain className="w-4 h-4 section-heading-icon" />
          نموذج التنبؤ بالذكاء الاصطناعي
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  const dirColor = prediction.direction === "UP" ? "#22d39a" : prediction.direction === "DOWN" ? "#ff4d6a" : "#fbbf24";
  const dirEmoji = prediction.direction === "UP" ? "" : prediction.direction === "DOWN" ? "" : "●";

  return (
    <div className="card-elevated p-4 border-2" style={{ borderColor: `${dirColor}40` }}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Brain className="w-4 h-4 section-heading-icon" />
          نموذج التنبؤ بالذكاء الاصطناعي
        </h2>
        <span className="section-subtitle flex items-center gap-1">
          <Clock className="w-3 h-3" /> الشمعة القادمة: {prediction.nextCandleTime}
        </span>
      </div>

      {/* Main prediction */}
      <motion.div
        layout
        className="p-4 rounded-xl text-center mb-3"
        style={{ background: `${dirColor}10`, border: `2px solid ${dirColor}40` }}
      >
        <div className="text-3xl mb-1">{dirEmoji}</div>
        <div className="text-xl font-bold" style={{ color: dirColor }}>{prediction.directionAr}</div>
        <div className="text-[11px] text-muted-foreground mt-1">
          احتمالية {prediction.probability}% • ثقة النموذج {prediction.confidence}%
        </div>
        <div className="mt-2 flex justify-center gap-4 text-[10px]">
          <span className="text-emerald-400">▲ {prediction.bullProbability}%</span>
          <span className="text-rose-400">▼ {prediction.bearProbability}%</span>
        </div>
      </motion.div>

      {/* Price prediction */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2 border border-rose-500/20 bg-rose-500/[0.04] text-center">
          <div className="text-[9px] text-muted-foreground">الحد الأدنى</div>
          <div className="text-sm font-bold text-rose-400 tabular-nums ltr-nums">${prediction.priceMin.toFixed(2)}</div>
        </div>
        <div className="rounded-lg p-2 border border-gold/20 bg-gold/[0.04] text-center">
          <div className="text-[9px] text-muted-foreground">السعر المتوقع</div>
          <div className="text-sm font-bold text-gold tabular-nums ltr-nums">${prediction.predictedPrice.toFixed(2)}</div>
        </div>
        <div className="rounded-lg p-2 border border-emerald-500/20 bg-emerald-500/[0.04] text-center">
          <div className="text-[9px] text-muted-foreground">الحد الأعلى</div>
          <div className="text-sm font-bold text-emerald-400 tabular-nums ltr-nums">${prediction.priceMax.toFixed(2)}</div>
        </div>
      </div>

      {/* Price range bar */}
      <div className="mb-3">
        <div className="text-[10px] text-muted-foreground mb-1">نطاق السعر المتوقع</div>
        <div className="relative h-3 rounded-full bg-gradient-to-r from-rose-500/30 via-yellow-500/30 to-emerald-500/30">
          <div
            className="absolute top-0 w-1 h-full bg-gold rounded-full"
            style={{ left: "50%" }}
          />
          <div className="absolute -top-4 left-0 text-[8px] text-rose-400 tabular-nums ltr-nums">${prediction.priceMin.toFixed(0)}</div>
          <div className="absolute -top-4 right-0 text-[8px] text-emerald-400 tabular-nums ltr-nums">${prediction.priceMax.toFixed(0)}</div>
        </div>
      </div>

      {/* Model accuracy */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="stat-box">
          <div className="stat-label">دقة النموذج التاريخية</div>
          <div className="stat-value text-sm text-gold">{prediction.modelAccuracy}%</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">نطاق التوقع</div>
          <div className="stat-value text-sm tabular-nums ltr-nums">${prediction.priceRange.toFixed(2)}</div>
        </div>
      </div>

      {/* Top features */}
      <div className="mb-2">
        <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-gold" />
          أهم العوامل المؤثرة في التنبؤ
        </div>
        <div className="space-y-1">
          {prediction.features.slice(0, 6).map((f, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 rounded text-[10px] bg-secondary/30 border border-border">
              <span className="font-semibold">{f.nameAr}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">وزن ×{f.weight.toFixed(1)}</span>
                <span
                  className="font-bold tabular-nums ltr-nums"
                  style={{ color: f.contribution > 0 ? "#22d39a" : f.contribution < 0 ? "#ff4d6a" : "#8a96a8" }}
                >
                  {f.contribution > 0 ? "+" : ""}{Math.round(f.contribution * 100)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">
        {prediction.summary}
      </div>
    </div>
  );
}
