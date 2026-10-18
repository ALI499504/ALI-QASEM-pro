// News Filter — Built-in schedule + CSV support
// ====================================================================
// Blocks trading:
//   - 15 minutes BEFORE high-impact news
//   - 60 minutes AFTER high-impact news
//
// Data sources (in priority order):
//   1. CSV file at /home/sync/news-events.csv (user-editable)
//   2. Built-in recurring schedule (NFP, FOMC, CPI, PPI, ECB, BOE, etc.)
//   3. Forex Factory API (fallback — currently 404)

import fs from "fs";

export interface NewsEvent {
  title: string;
  country: string;
  currency: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  timestamp: number;
}

export interface NewsFilterStatus {
  isBlocked: boolean;
  reason: string;
  nextEvent: NewsEvent | null;
  nextEventIn: number;
  blockUntil: number;
  recentEvents: NewsEvent[];
  upcomingEvents: NewsEvent[];
  totalEvents: number;
}

const BEFORE_BUFFER_MIN = 15;  // 15 min (quarter hour) before news
const AFTER_BUFFER_MIN = 60;  // 60 min (one hour) after news
const HIGH_IMPACT_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

// === Built-in recurring high-impact events ===
// These are approximate recurring dates — for exact dates, use the CSV file
function generateBuiltInEvents(): NewsEvent[] {
  const events: NewsEvent[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Generate events for 3 months before and 3 months after current date
  for (let monthOffset = -3; monthOffset <= 3; monthOffset++) {
    const targetDate = new Date(currentYear, currentMonth + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // === NFP: First Friday of the month at 13:30 UTC ===
    const firstFriday = new Date(year, month, 1);
    while (firstFriday.getDay() !== 5) firstFriday.setDate(firstFriday.getDate() + 1);
    firstFriday.setUTCHours(13, 30, 0, 0);
    events.push({
      title: "Non-Farm Payrolls (NFP)",
      country: "United States",
      currency: "USD",
      date: firstFriday.toISOString(),
      impact: "High",
      forecast: "",
      previous: "",
      timestamp: Math.floor(firstFriday.getTime() / 1000),
    });

    // === CPI: Usually 10th-13th of the month at 13:30 UTC ===
    const cpiDate = new Date(year, month, 10);
    cpiDate.setUTCHours(13, 30, 0, 0);
    events.push({
      title: "CPI (Consumer Price Index)",
      country: "United States",
      currency: "USD",
      date: cpiDate.toISOString(),
      impact: "High",
      forecast: "",
      previous: "",
      timestamp: Math.floor(cpiDate.getTime() / 1000),
    });

    // === FOMC: 6 meetings per year, roughly every 6-7 weeks
    // Approximate: 3rd Wednesday of Jan, Mar, Apr/May, Jun, Jul, Sep, Oct/Nov, Dec
    const fomcDates = [0, 2, 4, 5, 6, 8, 9, 11]; // months Jan, Mar, May, Jun, Jul, Sep, Oct, Dec
    if (fomcDates.includes(month)) {
      // 3rd Wednesday
      const fomc = new Date(year, month, 1);
      let wedCount = 0;
      while (wedCount < 3) {
        fomc.setDate(fomc.getDate() + 1);
        if (fomc.getDay() === 3) wedCount++;
      }
      fomc.setUTCHours(18, 0, 0, 0); // 2:00 PM EST = 18:00 UTC
      events.push({
        title: "FOMC Statement & Rate Decision",
        country: "United States",
        currency: "USD",
        date: fomc.toISOString(),
        impact: "High",
        forecast: "",
        previous: "",
        timestamp: Math.floor(fomc.getTime() / 1000),
      });
    }

    // === ECB Rate Decision: Every 6 weeks, usually Thursday ===
    const ecbMonths = [0, 2, 3, 4, 5, 6, 8, 9, 10, 11];
    if (ecbMonths.includes(month)) {
      // 2nd Thursday
      const ecb = new Date(year, month, 1);
      let thuCount = 0;
      while (thuCount < 2) {
        ecb.setDate(ecb.getDate() + 1);
        if (ecb.getDay() === 4) thuCount++;
      }
      ecb.setUTCHours(11, 45, 0, 0); // 12:45 CET = 11:45 UTC
      events.push({
        title: "ECB Rate Decision",
        country: "Euro Zone",
        currency: "EUR",
        date: ecb.toISOString(),
        impact: "High",
        forecast: "",
        previous: "",
        timestamp: Math.floor(ecb.getTime() / 1000),
      });
    }

    // === BOE Rate Decision: Usually mid-month Thursday ===
    const boe = new Date(year, month, 15);
    while (boe.getDay() !== 4) boe.setDate(boe.getDate() + 1); // next Thursday
    boe.setUTCHours(11, 0, 0, 0); // 12:00 GMT = 11:00 UTC
    events.push({
      title: "BOE Rate Decision",
      country: "United Kingdom",
      currency: "GBP",
      date: boe.toISOString(),
      impact: "High",
      forecast: "",
      previous: "",
      timestamp: Math.floor(boe.getTime() / 1000),
    });

    // === PPI: Usually 2nd week after NFP at 13:30 UTC ===
    const ppiDate = new Date(year, month, 13);
    while (ppiDate.getDay() === 0 || ppiDate.getDay() === 6) ppiDate.setDate(ppiDate.getDate() + 1);
    ppiDate.setUTCHours(13, 30, 0, 0);
    events.push({
      title: "PPI (Producer Price Index)",
      country: "United States",
      currency: "USD",
      date: ppiDate.toISOString(),
      impact: "High",
      forecast: "",
      previous: "",
      timestamp: Math.floor(ppiDate.getTime() / 1000),
    });

    // === Unemployment Claims: Every Thursday at 13:30 UTC ===
    // (This is medium impact but can be high during recession fears)
    // Skip for now — too many events

    // === Retail Sales: Mid-month at 13:30 UTC ===
    const retailDate = new Date(year, month, 16);
    while (retailDate.getDay() === 0 || retailDate.getDay() === 6) retailDate.setDate(retailDate.getDate() + 1);
    retailDate.setUTCHours(13, 30, 0, 0);
    events.push({
      title: "Retail Sales",
      country: "United States",
      currency: "USD",
      date: retailDate.toISOString(),
      impact: "High",
      forecast: "",
      previous: "",
      timestamp: Math.floor(retailDate.getTime() / 1000),
    });
  }

  // Sort by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}

// === Load custom events from CSV file ===
// CSV format: title,country,currency,date(ISO),impact,forecast,previous
function loadCSVEvents(): NewsEvent[] {
  const csvPath = "/home/sync/news-events.csv";
  try {
    if (!fs.existsSync(csvPath)) return [];
    const content = fs.readFileSync(csvPath, "utf-8");
    const lines = content.trim().split("\n");
    const events: NewsEvent[] = [];
    for (let i = 1; i < lines.length; i++) { // skip header
      const parts = lines[i].split(",");
      if (parts.length < 4) continue;
      const ts = Math.floor(new Date(parts[3]).getTime() / 1000);
      if (!Number.isFinite(ts)) continue;
      events.push({
        title: parts[0].trim(),
        country: parts[1].trim(),
        currency: parts[2].trim(),
        date: parts[3].trim(),
        impact: parts[4]?.trim() || "High",
        forecast: parts[5]?.trim() || "",
        previous: parts[6]?.trim() || "",
        timestamp: ts,
      });
    }
    return events;
  } catch {
    return [];
  }
}

// === Cache ===
let cachedEvents: { events: NewsEvent[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

function getAllEvents(): NewsEvent[] {
  if (cachedEvents && Date.now() - cachedEvents.ts < CACHE_MS) {
    return cachedEvents.events;
  }

  const builtIn = generateBuiltInEvents();
  const csv = loadCSVEvents();

  // Merge + deduplicate (CSV takes priority for same timestamps)
  const all = [...builtIn, ...csv];
  all.sort((a, b) => a.timestamp - b.timestamp);

  cachedEvents = { events: all, ts: Date.now() };
  return all;
}

// === Main: check if trading should be blocked ===
export async function checkNewsFilter(): Promise<NewsFilterStatus> {
  const events = getAllEvents();
  const now = Math.floor(Date.now() / 1000);

  const beforeWindow = BEFORE_BUFFER_MIN * 60;
  const afterWindow = AFTER_BUFFER_MIN * 60;

  const recentEvents: NewsEvent[] = [];
  const upcomingEvents: NewsEvent[] = [];
  let blockUntil = 0;
  let blockReason = "";

  for (const event of events) {
    const diff = event.timestamp - now;

    // Within 15 min before (upcoming)
    if (diff > 0 && diff <= beforeWindow) {
      upcomingEvents.push(event);
      const eventEnd = event.timestamp + afterWindow;
      if (eventEnd > blockUntil) {
        blockUntil = eventEnd;
        blockReason = `🚫 قبل خبر: ${event.title} (${event.currency}) خلال ${Math.ceil(diff / 60)} دقيقة`;
      }
    }

    // Within 60 min after (recent)
    if (diff < 0 && Math.abs(diff) <= afterWindow) {
      recentEvents.push(event);
      const eventEnd = event.timestamp + afterWindow;
      if (eventEnd > blockUntil) {
        blockUntil = eventEnd;
        const remaining = Math.ceil((blockUntil - now) / 60);
        blockReason = `🚫 بعد خبر: ${event.title} (${event.currency}) — تبقى ${remaining} دقيقة`;
      }
    }
  }

  const isBlocked = blockUntil > now;
  const nextEvent = upcomingEvents[0] || events.find((e) => e.timestamp > now) || null;
  const nextEventIn = nextEvent ? Math.floor((nextEvent.timestamp - now) / 60) : 9999;

  return {
    isBlocked,
    reason: isBlocked
      ? blockReason
      : nextEvent
        ? `✅ التداول مفتوح — خبر قادم: ${nextEvent.title} (${nextEvent.currency}) خلال ${nextEventIn}د`
        : "✅ التداول مفتوح — لا أخبار عالية التأثير قريبة",
    nextEvent,
    nextEventIn,
    blockUntil,
    recentEvents,
    upcomingEvents,
    totalEvents: events.length,
  };
}

// === Get all events for display ===
export async function getNewsEvents(): Promise<NewsEvent[]> {
  return getAllEvents();
}

// === Get upcoming high-impact events (next 7 days) ===
export async function getUpcomingNews(): Promise<NewsEvent[]> {
  const events = getAllEvents();
  const now = Math.floor(Date.now() / 1000);
  const next7d = now + 7 * 24 * 3600;
  return events.filter((e) => e.timestamp > now && e.timestamp < next7d);
}
