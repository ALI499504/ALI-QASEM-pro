"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ExternalLink } from "lucide-react";

interface NewsItem {
  title: string;
  source: string;
  summary: string;
  time: string;
  sentiment: "bullish" | "bearish" | "neutral";
  url?: string;
}

interface Props {
  news: NewsItem[];
}

/**
 * NewsCarousel — auto-rotating news banner that cycles through top headlines.
 * Replaces the static news list with a more engaging, animated display.
 */
export default function NewsCarousel({ news }: Props) {
  const [index, setIndex] = useState(0);
  const items = news.slice(0, 6);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="card-elevated p-3 text-xs text-muted-foreground text-center">
        جارٍ تحميل آخر أخبار الذهب...
      </div>
    );
  }

  const current = items[index];
  const sentimentColor =
    current.sentiment === "bullish"
      ? "#4ade80"
      : current.sentiment === "bearish"
      ? "#f87171"
      : "#8a96a8";
  const sentimentLabel =
    current.sentiment === "bullish"
      ? "صعودي "
      : current.sentiment === "bearish"
      ? "هبوطي "
      : "محايد ●";

  return (
    <div className="card-elevated p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Newspaper className="w-3.5 h-3.5 text-gold" />
          آخر الأخبار
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{
              background: `${sentimentColor}20`,
              color: sentimentColor,
              border: `1px solid ${sentimentColor}40`,
            }}
          >
            {sentimentLabel}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="text-xs"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-muted-foreground font-bold">
              {current.source}
            </span>
            <span className="text-[9px] text-muted-foreground">
              {new Date(current.time).toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <a
            href={current.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-semibold text-foreground hover:text-gold transition leading-tight"
          >
            {current.title}
            {current.url && (
              <ExternalLink className="w-2.5 h-2.5 inline ml-1 text-muted-foreground" />
            )}
          </a>
          {current.summary && current.summary !== current.title && (
            <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
              {current.summary.slice(0, 120)}
              {current.summary.length > 120 ? "..." : ""}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1 mt-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1 rounded-full transition-all ${
              i === index ? "w-4 bg-gold" : "w-1 bg-muted-foreground/30"
            }`}
            aria-label={`الخبر ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
