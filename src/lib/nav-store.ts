"use client";

import { create } from "zustand";

export type ViewId = "dashboard" | "ai" | "analysis" | "performance" | "market";

interface NavState {
  activeView: ViewId;
  sidebarCollapsed: boolean;
  setActiveView: (v: ViewId) => void;
  toggleSidebar: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  activeView: "dashboard",
  sidebarCollapsed: false,
  setActiveView: (activeView) => set({ activeView }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

export const NAV_ITEMS: { id: ViewId; label: string; icon: string; desc: string }[] = [
  { id: "dashboard", label: "لوحة القيادة", icon: "", desc: "الإشارة + الشارت + التداول" },
  { id: "ai", label: "ذكاء الوكلاء", icon: "", desc: "متتبع + قرار عصبي + Meta" },
  { id: "analysis", label: "التحليل الفني", icon: "", desc: "مؤشرات + Heatmap + ارتباط" },
  { id: "performance", label: "الأداء", icon: "", desc: "Backtest + Monte Carlo + منحنى" },
  { id: "market", label: "السوق", icon: "", desc: "أخبار + متابعة + تدفق" },
];
