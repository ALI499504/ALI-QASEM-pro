"use client";

import { motion } from "framer-motion";
import { Newspaper, ExternalLink } from "lucide-react";

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

const SENTIMENT_COLORS: Record<NewsItem["sentiment"], string> = {
  bullish: "#22d39a",
  bearish: "#ff4d6a",
  neutral: "#ffc933",
};

const SENTIMENT_LABELS: Record<NewsItem["sentiment"], string> = {
  bullish: "إيجابي",
  bearish: "سلبي",
  neutral: "محايد",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  return `قبل ${Math.floor(h / 24)} يوم`;
}

export default function NewsFeed({ news }: Props) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Newspaper className="w-4 h-4 text-gold" />
          أخبار الذهب
        </div>
        <span className="text-[10px] text-muted-foreground">محدّث</span>
      </div>
      <div className="space-y-3 max-h-72 overflow-y-auto scroll-styled pr-1">
        {news.map((n, i) => (
          <motion.article
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="group rounded-xl p-3 bg-white/[0.02] border border-white/5 hover:border-gold/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                style={{
                  background: `${SENTIMENT_COLORS[n.sentiment]}1a`,
                  color: SENTIMENT_COLORS[n.sentiment],
                }}
              >
                {SENTIMENT_LABELS[n.sentiment]}
              </span>
              <span className="text-[10px] text-muted-foreground">{n.source}</span>
              <span className="text-[10px] text-muted-foreground/70">• {timeAgo(n.time)}</span>
            </div>
            <h4 className="text-sm font-semibold leading-snug mb-1 group-hover:text-gold transition">
              {n.title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{n.summary}</p>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
