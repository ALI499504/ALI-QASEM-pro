"use client";

import { create } from "zustand";

export interface Notification {
  id: string;
  type: "signal" | "alert" | "trade" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Position {
  id: string;
  side: "BUY" | "SELL";
  symbol: string;
  lotSize: number;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  margin: number;
  openedAt: string;
  status: "OPEN" | "CLOSED";
  closePrice?: number;
  closedAt?: string;
  pnl?: number;
  pnlPct?: number;
}

interface PendingTrade {
  side: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  leverage: number;
  source: string; // description of source (e.g., "consensus")
  timestamp: number;
}

interface TradingState {
  positions: Position[];
  notifications: Notification[];
  audioEnabled: boolean;
  lastSignalAction: string | null;
  pendingTrade: PendingTrade | null;
  notificationsOpen: boolean;
  toggleAudio: () => void;
  setLastSignalAction: (a: string | null) => void;
  openPosition: (
    p: Omit<
      Position,
      "id" | "openedAt" | "status" | "currentPrice"
    > & { currentPrice?: number }
  ) => Position;
  closePosition: (id: string, currentPrice: number) => void;
  updatePrices: (price: number) => void;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  setPendingTrade: (t: PendingTrade | null) => void;
  setNotificationsOpen: (open: boolean) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  positions: [],
  notifications: [],
  audioEnabled: true,
  lastSignalAction: null,
  pendingTrade: null,
  notificationsOpen: false,
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  setLastSignalAction: (a) => set({ lastSignalAction: a }),
  openPosition: (p) => {
    const id = `pos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const position: Position = {
      ...p,
      id,
      currentPrice: p.currentPrice ?? p.entryPrice,
      openedAt: new Date().toISOString(),
      status: "OPEN",
    };
    set((s) => ({ positions: [position, ...s.positions] }));
    return position;
  },
  closePosition: (id, currentPrice) => {
    set((s) => ({
      positions: s.positions.map((p) => {
        if (p.id !== id || p.status !== "OPEN") return p;
        const direction = p.side === "BUY" ? 1 : -1;
        const priceDiff = (currentPrice - p.entryPrice) * direction;
        const pnl = priceDiff * p.lotSize * 100; // 1 lot = 100 oz
        const cost = p.margin;
        const pnlPct = (pnl / cost) * 100;
        return {
          ...p,
          status: "CLOSED" as const,
          closePrice: currentPrice,
          closedAt: new Date().toISOString(),
          pnl,
          pnlPct,
          currentPrice,
        };
      }),
    }));
  },
  updatePrices: (price) => {
    set((s) => ({
      positions: s.positions.map((p) =>
        p.status === "OPEN" ? { ...p, currentPrice: price } : p
      ),
    }));
  },
  addNotification: (n) => {
    const notif: Notification = {
      ...n,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    set((s) => ({
      notifications: [notif, ...s.notifications].slice(0, 50),
    }));
  },
  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
  clearNotifications: () => set({ notifications: [] }),
  setPendingTrade: (t) => set({ pendingTrade: t }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
}));

export function computePositionPnL(p: Position): {
  pnl: number;
  pnlPct: number;
  pips: number;
} {
  const direction = p.side === "BUY" ? 1 : -1;
  const priceDiff = (p.currentPrice - p.entryPrice) * direction;
  const pnl = priceDiff * p.lotSize * 100;
  const cost = p.margin;
  const pnlPct = (pnl / cost) * 100;
  const pips = priceDiff * 100; // gold pips = 0.01
  return { pnl, pnlPct, pips };
}
