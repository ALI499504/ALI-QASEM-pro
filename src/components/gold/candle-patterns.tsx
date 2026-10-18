"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CandlestickChart, TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { Candle } from "@/lib/indicators";

interface Props {
  candles: Candle[];
}

interface Pattern {
  name: string;
  nameAr: string;
  type: "bullish" | "bearish" | "neutral";
  confidence: number;
  description: string;
  index: number;
}

export default function CandlePatterns({ candles }: Props) {
  const [lastScan, setLastScan] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastScan(new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [candles]);

  if (!candles.length || candles.length < 5) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <CandlestickChart className="w-4 h-4 section-heading-icon" />
            كشف الأنماط الشموعية
          </h2>
          <span className="section-subtitle">جاري التحميل...</span>
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const patterns = detectPatterns(candles).slice(0, 6);

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <CandlestickChart className="w-4 h-4 section-heading-icon" />
          كشف الأنماط الشموعية
        </h2>
        <span className="section-subtitle">آخر 20 شمعة • Candlestick Patterns</span>
      </div>

      {patterns.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          لا توجد أنماط واضحة في آخر 20 شمعة
          <div className="text-[10px] mt-1 opacity-70">السوق في حالة تشتت</div>
        </div>
      ) : (
        <div className="space-y-2">
          {patterns.map((p, i) => {
            const color =
              p.type === "bullish" ? "#4ade80" : p.type === "bearish" ? "#f87171" : "#c8a050";
            const Icon = p.type === "bullish" ? TrendingUp : p.type === "bearish" ? TrendingDown : Activity;
            return (
              <motion.div
                key={`${p.name}-${p.index}`}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-2.5 rounded border border-border hover:border-[#3a4258] hover:bg-secondary transition"
              >
                <div
                  className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15`, color: color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-foreground">{p.nameAr}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">{p.name}</span>
                    <span
                      className="pill text-[9px]"
                      style={{
                        background: `${color}15`,
                        color: color,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {p.type === "bullish" ? "صعودي" : p.type === "bearish" ? "هبوطي" : "محايد"}
                    </span>
                    <span className="text-[9px] text-muted-foreground tabular-nums ltr-nums mr-auto">
                      ثقة {p.confidence}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
        <span>آخر فحص: {lastScan || "—"}</span>
        <span className="tabular-nums ltr-nums">{patterns.length} أنماط</span>
      </div>
    </div>
  );
}

function detectPatterns(candles: Candle[]): Pattern[] {
  const recent = candles.slice(-20);
  const patterns: Pattern[] = [];

  for (let i = 2; i < recent.length; i++) {
    const c = recent[i];
    const prev = recent[i - 1];
    const prev2 = recent[i - 2];

    // Bullish Engulfing
    if (prev.close < prev.open && c.close > c.open && c.close > prev.open && c.open < prev.close) {
      patterns.push({
        name: "Bullish Engulfing",
        nameAr: "ابتلاع صعودي",
        type: "bullish",
        confidence: 82,
        description: "شمعة خضراء كبيرة تبتلع الشمعة الحمراء السابقة بالكامل — إشارة قوية على انعكاس صعودي محتمل",
        index: i,
      });
    }

    // Bearish Engulfing
    if (prev.close > prev.open && c.close < c.open && c.close < prev.open && c.open > prev.close) {
      patterns.push({
        name: "Bearish Engulfing",
        nameAr: "ابتلاع هبوطي",
        type: "bearish",
        confidence: 80,
        description: "شمعة حمراء كبيرة تبتلع الشمعة الخضراء السابقة — إشارة على انعكاس هبوطي محتمل",
        index: i,
      });
    }

    // Hammer
    const body = Math.abs(c.close - c.open);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const upperWick = c.high - Math.max(c.open, c.close);
    if (body > 0 && lowerWick > body * 2 && upperWick < body * 0.6) {
      patterns.push({
        name: "Hammer",
        nameAr: "المطرقة",
        type: "bullish",
        confidence: 75,
        description: "جسم صغير مع ظل سفلي طويل — رفض البائعين دفع السعر لأسفل، إشارة على قرب ارتداد صعودي",
        index: i,
      });
    }

    // Shooting Star
    if (body > 0 && upperWick > body * 2 && lowerWick < body * 0.6) {
      patterns.push({
        name: "Shooting Star",
        nameAr: "الشهاب",
        type: "bearish",
        confidence: 73,
        description: "جسم صغير مع ظل علوي طويل — فشل المشترين في الحفاظ على السعر، إشارة هبوطية",
        index: i,
      });
    }

    // Doji
    if (body > 0 && body <= (c.high - c.low) * 0.1) {
      patterns.push({
        name: "Doji",
        nameAr: "دوجي",
        type: "neutral",
        confidence: 65,
        description: "فتح وإغلاق متساويان تقريباً — تردد في السوق وحالة توقف مؤقت، قد يمهد لانعكاس",
        index: i,
      });
    }

    // Morning Star (3-candle bullish reversal)
    if (
      prev2.close < prev2.open &&
      Math.abs(prev.close - prev.open) < Math.abs(prev2.close - prev2.open) * 0.3 &&
      c.close > c.open &&
      c.close > prev2.open
    ) {
      patterns.push({
        name: "Morning Star",
        nameAr: "نجم الصباح",
        type: "bullish",
        confidence: 88,
        description: "نموذج 3 شموع: شمعة حمراء كبيرة → شمعة صغيرة → شمعة خضراء كبيرة — انعكاس صعودي قوي",
        index: i,
      });
    }

    // Evening Star (3-candle bearish reversal)
    if (
      prev2.close > prev2.open &&
      Math.abs(prev.close - prev.open) < Math.abs(prev2.close - prev2.open) * 0.3 &&
      c.close < c.open &&
      c.close < prev2.open
    ) {
      patterns.push({
        name: "Evening Star",
        nameAr: "نجم المساء",
        type: "bearish",
        confidence: 87,
        description: "نموذج 3 شموع: شمعة خضراء كبيرة → شمعة صغيرة → شمعة حمراء كبيرة — انعكاس هبوطي قوي",
        index: i,
      });
    }

    // Three White Soldiers (3 consecutive bullish)
    if (i >= 4 && recent[i - 2].close > recent[i - 2].open && recent[i - 1].close > recent[i - 1].open && c.close > c.open &&
        recent[i - 1].close > recent[i - 2].close && c.close > recent[i - 1].close) {
      patterns.push({
        name: "Three White Soldiers",
        nameAr: "ثلاثة جنود بيض",
        type: "bullish",
        confidence: 90,
        description: "ثلاث شموع خضراء متتالية صاعدة — إشارة على زخم صعودي قوي ومستدام",
        index: i,
      });
    }

    // Three Black Crows
    if (i >= 4 && recent[i - 2].close < recent[i - 2].open && recent[i - 1].close < recent[i - 1].open && c.close < c.open &&
        recent[i - 1].close < recent[i - 2].close && c.close < recent[i - 1].close) {
      patterns.push({
        name: "Three Black Crows",
        nameAr: "ثلاثة غربان سود",
        type: "bearish",
        confidence: 89,
        description: "ثلاث شموع حمراء متتالية هابطة — إشارة على زخم هبوطي قوي ومستدام",
        index: i,
      });
    }
  }

  // Sort by confidence, take top 6
  return patterns.sort((a, b) => b.confidence - a.confidence);
}
