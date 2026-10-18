"use client";

import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";

interface EconEvent {
  date: string;
  time: string;
  name: string;
  country: string;
  impact: "high" | "medium" | "low";
  forecast: string;
  previous: string;
}

// Curated reference events for the current FOMC/economic cycle.
// These are the regularly-scheduled recurring US economic events that historically
// move gold prices. They are shown as a reference calendar — actual upcoming
// scheduled events require a real calendar API (Trading Economics / Forex Factory).
const EVENTS: EconEvent[] = [
  {
    date: "أسبوعياً",
    time: "13:30 EST",
    name: "مطالبات البطالة الأسبوعية",
    country: "",
    impact: "medium",
    forecast: "~220K",
    previous: "—",
  },
  {
    date: "شهرياً",
    time: "08:30 EST",
    name: "تقرير الوظائف غير الزراعية (NFP)",
    country: "",
    impact: "high",
    forecast: "~180K",
    previous: "—",
  },
  {
    date: "شهرياً",
    time: "08:30 EST",
    name: "مؤشر أسعار المستهلك (CPI)",
    country: "",
    impact: "high",
    forecast: "~0.3%",
    previous: "—",
  },
  {
    date: "شهرياً",
    time: "08:30 EST",
    name: "مؤشر أسعار المنتجين (PPI)",
    country: "",
    impact: "medium",
    forecast: "~0.2%",
    previous: "—",
  },
  {
    date: "8 مرات/سنة",
    time: "14:00 EST",
    name: "قرار الفائدة الأمريكي (FOMC)",
    country: "",
    impact: "high",
    forecast: "~4.75%",
    previous: "—",
  },
  {
    date: "شهرياً",
    time: "10:00 EST",
    name: "مؤشر مديري المشتريات التصنيعي (ISM)",
    country: "",
    impact: "medium",
    forecast: "~47.5",
    previous: "—",
  },
  {
    date: "ربع سنوي",
    time: "08:30 EST",
    name: "ناتج محلي إجمالي (GDP)",
    country: "",
    impact: "high",
    forecast: "~2.5%",
    previous: "—",
  },
  {
    date: "شهرياً",
    time: "10:00 EST",
    name: "مؤشر ثقة المستهلك (CB)",
    country: "",
    impact: "medium",
    forecast: "~100",
    previous: "—",
  },
];

const IMPACT_CONFIG = {
  high: { color: "#f87171", label: "تأثير عالي" },
  medium: { color: "#fbbf24", label: "تأثير متوسط" },
  low: { color: "#4ade80", label: "تأثير منخفض" },
};

export default function EconomicCalendar() {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Calendar className="w-4 h-4 section-heading-icon" />
          التقويم الاقتصادي
        </h2>
        <span className="section-subtitle">الأحداث الاقتصادية المجدولة — مرجع دوري</span>
      </div>

      <div className="mb-2 px-2 py-1 rounded text-[9px] text-amber-400/80 bg-amber-500/[0.04] border border-amber-500/20 flex items-center gap-1.5">
        <span></span>
        <span>الأحداث المجدولة دورياً (تواريخ تقريبية) — راجع Forex Factory أو Investing.com للتواريخ الدقيقة</span>
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto scroll-styled pr-1">
        {EVENTS.map((ev, i) => {
          const cfg = IMPACT_CONFIG[ev.impact];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-2.5 rounded border border-border hover:border-[#3a4258] hover:bg-secondary transition"
            >
              {/* Impact indicator */}
              <div
                className="w-1 self-stretch rounded-full"
                style={{ background: cfg.color }}
              />

              {/* Date/time */}
              <div className="text-center min-w-[60px]">
                <div className="text-[11px] font-semibold text-foreground">{ev.date}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-center tabular-nums ltr-nums">
                  <Clock className="w-2.5 h-2.5" />
                  {ev.time}
                </div>
              </div>

              {/* Event name */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {ev.country} {ev.name}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <span style={{ color: cfg.color }}>{cfg.label}</span>
                  {ev.forecast !== "—" && (
                    <span className="tabular-nums ltr-nums">
                      متوقع: <span className="text-info">{ev.forecast}</span>
                    </span>
                  )}
                  {ev.previous !== "—" && (
                    <span className="tabular-nums ltr-nums">
                      سابق: <span className="text-muted-foreground">{ev.previous}</span>
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: "#f87171" }} /> عالي
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: "#fbbf24" }} /> متوسط
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: "#4ade80" }} /> منخفض
        </span>
      </div>
    </div>
  );
}
