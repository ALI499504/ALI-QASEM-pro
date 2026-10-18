"use client";

import { useEffect, useState } from "react";
import { Globe, Clock } from "lucide-react";

interface Session {
  name: string;
  nameAr: string;
  city: string;
  flag: string;
  startUTC: number; // hour
  endUTC: number;
  color: string;
}

const SESSIONS: Session[] = [
  { name: "Sydney", nameAr: "سيدني", city: "أستراليا", flag: "", startUTC: 22, endUTC: 7, color: "#a78bfa" },
  { name: "Tokyo", nameAr: "طوكيو", city: "اليابان", flag: "", startUTC: 0, endUTC: 9, color: "#f87171" },
  { name: "London", nameAr: "لندن", city: "بريطانيا", flag: "", startUTC: 8, endUTC: 17, color: "#60a5fa" },
  { name: "New York", nameAr: "نيويورك", city: "أمريكا", flag: "", startUTC: 13, endUTC: 22, color: "#4ade80" },
];

export default function TradingSessions() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <Globe className="w-4 h-4 section-heading-icon" />
            جلسات التداول
          </h2>
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;

  function isSessionActive(s: Session): boolean {
    if (s.startUTC < s.endUTC) {
      return utcHour >= s.startUTC && utcHour < s.endUTC;
    }
    // wraps midnight
    return utcHour >= s.startUTC || utcHour < s.endUTC;
  }

  function sessionProgress(s: Session): number {
    let elapsed: number;
    if (s.startUTC < s.endUTC) {
      elapsed = utcHour - s.startUTC;
    } else {
      if (utcHour >= s.startUTC) elapsed = utcHour - s.startUTC;
      else elapsed = 24 - s.startUTC + utcHour;
    }
    const total = s.endUTC - s.startUTC;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  function timeUntil(s: Session): string {
    const active = isSessionActive(s);
    if (active) {
      // time until close
      let remaining: number;
      if (s.startUTC < s.endUTC) {
        remaining = s.endUTC - utcHour;
      } else {
        remaining = utcHour < s.endUTC ? s.endUTC - utcHour : 24 - utcHour + s.endUTC;
      }
      const h = Math.floor(remaining);
      const m = Math.floor((remaining - h) * 60);
      return `${h}س ${m}د حتى الإغلاق`;
    } else {
      // time until open
      let untilOpen: number;
      if (s.startUTC < s.endUTC) {
        untilOpen = utcHour < s.startUTC ? s.startUTC - utcHour : 24 - utcHour + s.startUTC;
      } else {
        if (utcHour < s.endUTC) {
          untilOpen = 0; // already open
        } else if (utcHour >= s.endUTC && utcHour < s.startUTC) {
          untilOpen = s.startUTC - utcHour;
        } else {
          untilOpen = 24 - utcHour + s.startUTC;
        }
      }
      const h = Math.floor(untilOpen);
      const m = Math.floor((untilOpen - h) * 60);
      return `${h}س ${m}د حتى الافتتاح`;
    }
  }

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Globe className="w-4 h-4 section-heading-icon" />
          جلسات التداول
        </h2>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          UTC {now.toUTCString().slice(17, 22)}
        </div>
      </div>

      <div className="space-y-2">
        {SESSIONS.map((s) => {
          const active = isSessionActive(s);
          const progress = active ? sessionProgress(s) : 0;
          return (
            <div
              key={s.name}
              className={`rounded border p-2.5 transition ${
                active
                  ? "border-[#3a4258] bg-secondary"
                  : "border-border bg-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{s.flag}</span>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {s.nameAr}
                      {active && (
                        <span className="pill pill-bull">
                          <span className="status-dot live" style={{ width: 5, height: 5 }} />
                          مفتوحة
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.city} • {s.startUTC.toString().padStart(2, "0")}:00 - {s.endUTC.toString().padStart(2, "0")}:00 UTC
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums ltr-nums text-left">
                  {timeUntil(s)}
                </div>
              </div>
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: active ? s.color : "transparent",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground">
         أعلى سيولة في تداخل جلستي لندن ونيويورك (13:00-17:00 UTC)
      </div>
    </div>
  );
}
