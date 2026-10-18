"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Newspaper, Brain, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

interface NewsItem {
  title: string;
  source: string;
  summary: string;
  time: string;
  sentiment: "bullish" | "bearish" | "neutral";
}

interface Props {
  news: NewsItem[];
}

interface SentimentResult {
  score: number;       // -100 to +100
  label: string;
  color: string;
  impact: string;
  bullScore: number;
  bearScore: number;
}

export default function NewsSentimentAI({ news }: Props) {
  const sentiments = useMemo(() => news.map(n => analyzeSentiment(n)), [news]);
  const overall = useMemo(() => {
    if (!sentiments.length) return null;
    const avg = sentiments.reduce((s, r) => s + r.score, 0) / sentiments.length;
    return getSentimentInfo(avg);
  }, [sentiments]);

  if (!overall) return null;

  return (
    <div className="relative rounded-xl p-4 border border-border overflow-hidden">
      {/* Overall sentiment */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${overall.color}15`, border: `1px solid ${overall.color}30` }}>
            <Brain className="w-4 h-4" style={{ color: overall.color }} />
          </div>
          <div>
            <div className="text-sm font-bold">تحليل مشاعر الأخبار بالـAI</div>
            <div className="text-[9px] text-muted-foreground font-mono">AI News Sentiment Analysis</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold tabular-nums ltr-nums" style={{ color: overall.color }}>
            {overall.score > 0 ? "+" : ""}{overall.score.toFixed(0)}
          </div>
          <div className="text-[9px] text-muted-foreground">{overall.label}</div>
        </div>
      </div>

      {/* Sentiment gauge bar */}
      <div className="mb-3">
        <div className="relative h-3 rounded-full overflow-hidden bg-secondary">
          {/* Gradient bar -100 to +100 */}
          <div className="absolute inset-0 rounded-full" style={{
            background: "linear-gradient(90deg, #f43f5e 0%, #f43f5e40 30%, #94a3b840 50%, #10b98140 70%, #10b981 100%)",
          }} />
          {/* Pointer */}
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-white rounded-full"
            style={{ boxShadow: "0 0 8px rgba(255,255,255,0.6)" }}
            initial={{ left: "50%" }}
            animate={{ left: `${Math.max(2, Math.min(98, ((overall.score + 100) / 200) * 100))}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground/50 mt-0.5">
          <span>سلبي جداً (-100)</span>
          <span>محايد (0)</span>
          <span>إيجابي جداً (+100)</span>
        </div>
      </div>

      {/* Individual news sentiment */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto scroll-styled pr-1">
        {news.map((n, i) => {
          const s = sentiments[i];
          if (!s) return null;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2 p-2 rounded border border-border/50 bg-secondary/20"
            >
              {/* Score badge */}
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center text-[9px] font-bold"
                style={{ background: `${s.color}15`, border: `1px solid ${s.color}30`, color: s.color }}
              >
                <span className="tabular-nums ltr-nums text-xs">{s.score > 0 ? "+" : ""}{s.score}</span>
              </div>

              {/* News content */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-foreground line-clamp-1">{n.title}</div>
                <div className="text-[8px] text-muted-foreground line-clamp-1 mt-0.5">{n.summary}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] text-muted-foreground/60">{n.source}</span>
                  <span className="text-[8px]" style={{ color: s.color }}>{s.label} • {s.impact}</span>
                </div>
              </div>

              {/* Mini bar */}
              <div className="flex-shrink-0 w-12 h-6 flex items-center">
                <div className="relative w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      width: `${Math.abs(s.score) / 2}%`,
                      background: s.color,
                      left: s.score > 0 ? "50%" : undefined,
                      right: s.score < 0 ? "50%" : undefined,
                    }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-muted-foreground/20" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-2 px-2 py-1.5 rounded-lg border border-border/30 bg-secondary/10 text-[9px] text-muted-foreground leading-relaxed">
        <span className="font-bold" style={{ color: overall.color }}>تأثير متوقع: </span>
        {overall.score > 30 ? "إيجابي قوي على الذهب — قد يدفع السعر للأعلى" :
         overall.score > 10 ? "إيجابي معتدل — دعم خفيف للسعر" :
         overall.score < -30 ? "سلبي قوي — قد يضغط على السعر للهبوط" :
         overall.score < -10 ? "سلبي معتدل — ضغط خفيف على السعر" :
         "محايد — تأثير محدود على السعر"}
      </div>
    </div>
  );
}

function analyzeSentiment(news: NewsItem): SentimentResult {
  const text = (news.title + " " + news.summary).toLowerCase();
  let score = 0;

  // Bullish keywords
  const bullWords = [
    { w: "rise", s: 20 }, { w: "rising", s: 20 }, { w: "surge", s: 30 }, { w: "rally", s: 25 },
    { w: "gain", s: 15 }, { w: "gains", s: 15 }, { w: "bullish", s: 25 }, { w: "support", s: 10 },
    { w: "safe-haven", s: 20 }, { w: "safe haven", s: 20 }, { w: "demand", s: 15 }, { w: "buying", s: 15 },
    { w: "up", s: 10 }, { w: "climb", s: 20 }, { w: "jump", s: 25 }, { w: "soar", s: 30 },
    { w: "strength", s: 10 }, { w: "optimism", s: 15 }, { w: "recovery", s: 15 }, { w: "eases", s: 10 },
    { w: "cut rates", s: 25 }, { w: "rate cut", s: 25 }, { w: "dovish", s: 20 }, { w: "stimulus", s: 20 },
    { w: "inflation", s: 10 }, { w: "geopolitical", s: 15 }, { w: "tension", s: 10 }, { w: "war", s: 15 },
    { w: "central bank", s: 10 }, { w: "buy", s: 10 }, { w: "strong", s: 10 }, { w: "high", s: 5 },
  ];

  // Bearish keywords
  const bearWords = [
    { w: "fall", s: 20 }, { w: "falling", s: 20 }, { w: "drop", s: 25 }, { w: "decline", s: 20 },
    { w: "loss", s: 15 }, { w: "bearish", s: 25 }, { w: "sell", s: 15 }, { w: "selling", s: 15 },
    { w: "down", s: 10 }, { w: "crash", s: 35 }, { w: "plunge", s: 30 }, { w: "tumble", s: 25 },
    { w: "weakness", s: 15 }, { w: "pessimism", s: 15 }, { w: "rate hike", s: 25 }, { w: "hike rates", s: 25 },
    { w: "hawkish", s: 20 }, { w: "tighten", s: 20 }, { w: "strong dollar", s: 20 }, { w: "dollar rises", s: 15 },
    { w: "yields rise", s: 15 }, { w: "bonds", s: 5 }, { w: "risk appetite", s: 10 }, { w: "risk-on", s: 10 },
    { w: "stock market", s: 5 }, { w: "low", s: 5 }, { w: "weak", s: 10 }, { w: "pressure", s: 10 },
  ];

  for (const { w, s } of bullWords) {
    if (text.includes(w)) score += s;
  }
  for (const { w, s } of bearWords) {
    if (text.includes(w)) score -= s;
  }

  // Cap at -100/+100
  score = Math.max(-100, Math.min(100, score));

  // Use existing sentiment if available
  if (news.sentiment === "bullish") score = Math.max(score, 15);
  if (news.sentiment === "bearish") score = Math.min(score, -15);

  return {
    score,
    ...getSentimentInfo(score),
    bullScore: Math.max(0, score),
    bearScore: Math.max(0, -score),
  };
}

function getSentimentInfo(score: number) {
  if (score > 50) return { score, label: "إيجابي قوي", color: "#10b981", impact: "تأثير عالي" };
  if (score > 20) return { score, label: "إيجابي", color: "#4ade80", impact: "تأثير متوسط" };
  if (score > 5) return { score, label: "إيجابي خفيف", color: "#86efac", impact: "تأثير منخفض" };
  if (score < -50) return { score, label: "سلبي قوي", color: "#f43f5e", impact: "تأثير عالي" };
  if (score < -20) return { score, label: "سلبي", color: "#fb7185", impact: "تأثير متوسط" };
  if (score < -5) return { score, label: "سلبي خفيف", color: "#fda4af", impact: "تأثير منخفض" };
  return { score, label: "محايد", color: "#d4a574", impact: "تأثير محدود" };
}
