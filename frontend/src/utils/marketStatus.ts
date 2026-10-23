import { useState, useEffect, useRef, useCallback } from "react";
import { getMarketStatus, BackendMarketStatus } from "../api/client";

export type MarketState = "CLOSED" | "PRE_MARKET" | "REGULAR" | "AFTER_HOURS";
export type MarketSessionStatus = "open" | "closed" | "pre_market" | "after_hours";

export interface MarketStatus {
  state: MarketState;
  status: MarketSessionStatus;
  isOpen: boolean;
  isPreMarket: boolean;
  isAfterHours: boolean;
  label: string;
  subtext: string;
  detail: string;
  nextSession: string;
  nextTransitionUtc: string;
  countdownText: string;
  sessionProgressPct: number;
  nyTime: string;
  localTime: string;
  localTz: string;
  localTzLong: string;
  regularHours: string;
  extendedHours: string;
  isTransitioning: boolean;
  toastMessage: string | null;
  dismissToast: () => void;
  reason?: string;
}

// Major NYSE Holidays list for fallback client-side determination if backend is unreachable
export const NYSE_HOLIDAYS_MAP: Record<string, string> = {
  "2025-01-01": "New Year's Day",
  "2025-01-20": "Martin Luther King Jr. Day",
  "2025-02-17": "Presidents' Day",
  "2025-04-18": "Good Friday",
  "2025-05-26": "Memorial Day",
  "2025-06-19": "Juneteenth",
  "2025-07-04": "Independence Day",
  "2025-09-01": "Labor Day",
  "2025-11-27": "Thanksgiving Day",
  "2025-12-25": "Christmas Day",
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Presidents' Day",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day (Observed)",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving Day",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year's Day",
  "2027-01-18": "Martin Luther King Jr. Day",
  "2027-02-15": "Presidents' Day",
  "2027-03-26": "Good Friday",
  "2027-05-31": "Memorial Day",
  "2027-06-18": "Juneteenth (Observed)",
  "2027-07-05": "Independence Day (Observed)",
  "2027-09-06": "Labor Day",
  "2027-11-25": "Thanksgiving Day",
  "2027-12-24": "Christmas Day (Observed)",
};

export function getLocalTimeZoneInfo(): { abbr: string; long: string } {
  try {
    const long = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
    }).formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    const abbr = tzPart?.value || "Local";
    return { abbr, long };
  } catch {
    return { abbr: "Local", long: "Local Time" };
  }
}

export function formatNyTime(date: Date = new Date()): string {
  try {
    return (
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(date) + " ET"
    );
  } catch {
    return "";
  }
}

export function formatLocalTime(date: Date = new Date()): string {
  try {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return date.toTimeString().split(" ")[0];
  }
}

export function formatCountdown(nextTransitionUtc: string): string {
  if (!nextTransitionUtc) return "";
  const target = new Date(nextTransitionUtc).getTime();
  const now = Date.now();
  const diffMs = target - now;
  if (isNaN(diffMs) || diffMs <= 0) {
    return "Opens soon";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `Opens in ${hours}h ${minutes}m`;
  }
  return `Opens in ${minutes}m`;
}

export function calculateSessionProgressPct(now: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const parts: Record<string, string> = {};
    for (const p of formatter.formatToParts(now)) {
      parts[p.type] = p.value;
    }
    const hour = parseInt(parts.hour, 10);
    const minute = parseInt(parts.minute, 10);
    const second = parseInt(parts.second, 10);
    const secToday = hour * 3600 + minute * 60 + second;

    const startSec = 9 * 3600 + 30 * 60; // 9:30 AM = 34200
    const endSec = 16 * 3600; // 4:00 PM = 57600
    if (secToday <= startSec) return 0;
    if (secToday >= endSec) return 100;
    return Math.round(((secToday - startSec) / (endSec - startSec)) * 1000) / 10;
  } catch {
    return 0;
  }
}

/**
 * Fallback computation in America/New_York timezone if the backend hasn't responded yet.
 */
export function calculateFallbackStatus(date: Date = new Date()): MarketStatus {
  const { abbr: localTz, long: localTzLong } = getLocalTimeZoneInfo();
  const localTime = formatLocalTime(date);
  const nyTime = formatNyTime(date);

  const regularHours = "Mon–Fri 9:30 AM – 4:00 PM ET";
  const extendedHours = "Pre: 4:00 AM – 9:30 AM | Post: 4:00 PM – 8:00 PM ET";

  let state: MarketState = "CLOSED";
  let label = "Markets Closed";
  let subtext = "Outside Trading Hours";
  let detail = "NYSE & NASDAQ are currently closed.";
  let nextSession = "Pre-Market opens 4:00 AM ET";
  let sessionProgressPct = 0;
  let nextTransitionUtc = "";

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const parts: Record<string, string> = {};
    for (const p of formatter.formatToParts(date)) {
      parts[p.type] = p.value;
    }

    const weekday = parts.weekday;
    const dateIso = `${parts.year}-${parts.month}-${parts.day}`;
    const hour = parseInt(parts.hour, 10);
    const minute = parseInt(parts.minute, 10);
    const second = parseInt(parts.second, 10);
    const secToday = hour * 3600 + minute * 60 + second;

    const isWeekend = weekday === "Sat" || weekday === "Sun";
    const holidayName = NYSE_HOLIDAYS_MAP[dateIso];

    if (isWeekend || holidayName) {
      state = "CLOSED";
      label = holidayName ? `Markets Closed (${holidayName})` : "Markets Closed";
      subtext = holidayName ? `Holiday • ${holidayName}` : "Weekend • NYSE Closed";
      detail = holidayName
        ? `NYSE & NASDAQ are closed for ${holidayName}.`
        : "NYSE & NASDAQ are closed for the weekend.";
      nextSession = "Next trading day at 4:00 AM ET";
    } else {
      if (secToday < 14400) {
        state = "CLOSED";
        label = "Markets Closed";
        subtext = "Overnight • Pre-Market 4:00 AM ET";
        detail = "Markets are closed overnight. Pre-market opens at 4:00 AM ET.";
        nextSession = "Pre-market starts today at 4:00 AM ET";
      } else if (secToday < 34200) {
        state = "PRE_MARKET";
        label = "Pre-Market";
        subtext = "Pre-Market • Regular Opens 9:30 AM ET";
        detail = "US Pre-Market trading session is active (4:00 AM – 9:30 AM ET).";
        nextSession = "Regular trading opens at 9:30 AM ET";
      } else if (secToday < 57600) {
        state = "REGULAR";
        label = "Markets Open";
        subtext = "Regular Session • Closes 4:00 PM ET";
        detail = "NYSE & NASDAQ regular trading session is active (9:30 AM – 4:00 PM ET).";
        nextSession = "Regular session closes at 4:00 PM ET";
        sessionProgressPct = calculateSessionProgressPct(date);
      } else if (secToday < 72000) {
        state = "AFTER_HOURS";
        label = "After-Hours";
        subtext = "After-Hours • Session Closes 8:00 PM ET";
        detail = "Extended after-hours trading session is active (4:00 PM – 8:00 PM ET).";
        nextSession = "Extended after-hours closes at 8:00 PM ET";
        sessionProgressPct = 100;
      } else {
        state = "CLOSED";
        label = "Markets Closed";
        subtext = "Closed for the Day";
        detail = "All trading sessions have concluded for today.";
        nextSession = "Next session opens at 4:00 AM ET";
      }
    }
  } catch {
    // fallback defaults
  }

  const statusMap: Record<MarketState, MarketSessionStatus> = {
    REGULAR: "open",
    PRE_MARKET: "pre_market",
    AFTER_HOURS: "after_hours",
    CLOSED: "closed",
  };

  return {
    state,
    status: statusMap[state],
    isOpen: state === "REGULAR",
    isPreMarket: state === "PRE_MARKET",
    isAfterHours: state === "AFTER_HOURS",
    label,
    subtext,
    detail,
    nextSession,
    nextTransitionUtc,
    countdownText: "",
    sessionProgressPct,
    nyTime,
    localTime,
    localTz,
    localTzLong,
    regularHours,
    extendedHours,
    isTransitioning: false,
    toastMessage: null,
    dismissToast: () => {},
  };
}

export function useMarketStatus(): MarketStatus {
  const [data, setData] = useState<MarketStatus>(() => calculateFallbackStatus(new Date()));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-memory component state: stores last seen market state across polls.
  // Resets to null on fresh page load/refresh so transition animation/toast NEVER fires on load.
  const lastStateRef = useRef<MarketState | null>(null);
  const backendDataRef = useRef<BackendMarketStatus | null>(null);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const triggerTransition = useCallback((prevState: MarketState, nextState: MarketState) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 650);

    let msg = "";
    if (nextState === "REGULAR") {
      msg = "🔔 Markets are now open";
    } else if (nextState === "AFTER_HOURS") {
      msg = "Markets have closed for regular trading. After-hours active.";
    } else if (nextState === "CLOSED") {
      msg = "Markets have closed for the day";
    } else if (nextState === "PRE_MARKET") {
      msg = "🌅 Pre-market trading is now open";
    }

    if (msg) {
      setToastMessage(msg);
      setTimeout(() => {
        setToastMessage((cur) => (cur === msg ? null : cur));
      }, 4500);
    }
  }, []);

  const syncWithBackend = useCallback(async () => {
    try {
      const res = await getMarketStatus();
      backendDataRef.current = res;

      const previousState = lastStateRef.current;
      const newState = res.state;

      if (previousState === null) {
        // Initial load / refresh: record state, DO NOT fire animation or toast
        lastStateRef.current = newState;
      } else if (previousState !== newState) {
        // State actually changed during session
        lastStateRef.current = newState;
        triggerTransition(previousState, newState);
      }

      setData((prev) => {
        const countdown =
          newState === "CLOSED" ? formatCountdown(res.next_transition_utc) : "";
        const progress =
          newState === "REGULAR"
            ? res.session_progress_pct || calculateSessionProgressPct(new Date())
            : newState === "AFTER_HOURS"
            ? 100
            : 0;

        const subtext =
          newState === "CLOSED"
            ? countdown || "Markets Closed"
            : res.subtext || prev.subtext;

        const statusMap: Record<MarketState, MarketSessionStatus> = {
          REGULAR: "open",
          PRE_MARKET: "pre_market",
          AFTER_HOURS: "after_hours",
          CLOSED: "closed",
        };

        return {
          ...prev,
          state: newState,
          status: statusMap[newState],
          isOpen: newState === "REGULAR",
          isPreMarket: newState === "PRE_MARKET",
          isAfterHours: newState === "AFTER_HOURS",
          label: res.label,
          subtext,
          detail: res.detail,
          nextTransitionUtc: res.next_transition_utc,
          nextSession:
            newState === "CLOSED"
              ? countdown
                ? `Next session: ${countdown}`
                : "Opens next trading day"
              : `Next session: ${res.next_state}`,
          countdownText: countdown,
          sessionProgressPct: progress,
          nyTime: res.eastern_time || formatNyTime(new Date()),
        };
      });
    } catch {
      // Backend error: keep current data or fallback
    }
  }, [triggerTransition]);

  // Initial fetch and 60-second polling for authoritative backend state
  useEffect(() => {
    syncWithBackend();
    const pollInterval = window.setInterval(syncWithBackend, 60000);
    return () => window.clearInterval(pollInterval);
  }, [syncWithBackend]);

  // 1-second live clock ticker for local time and New York time
  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      const now = new Date();
      const localTime = formatLocalTime(now);
      const nyTime = formatNyTime(now);

      setData((prev) => {
        const isClosed = prev.state === "CLOSED";
        const countdown =
          isClosed && prev.nextTransitionUtc
            ? formatCountdown(prev.nextTransitionUtc)
            : prev.countdownText;

        const progress =
          prev.state === "REGULAR" ? calculateSessionProgressPct(now) : prev.sessionProgressPct;

        const subtext = isClosed && countdown ? countdown : prev.subtext;

        return {
          ...prev,
          localTime,
          nyTime,
          countdownText: countdown,
          sessionProgressPct: progress,
          subtext,
        };
      });
    }, 1000);

    return () => window.clearInterval(clockInterval);
  }, []);

  return {
    ...data,
    isTransitioning,
    toastMessage,
    dismissToast,
  };
}
