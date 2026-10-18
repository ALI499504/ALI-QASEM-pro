"use client";

import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

export interface SubscriptionInfo {
  status: string;
  startDate?: string;
  endDate?: string;
  plan: {
    name: string;
    nameAr: string;
    maxTrades: number;
    maxLotSize: number;
    maxLeverage: number;
    featuresAr: string[];
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  subscription: SubscriptionInfo | null;
  loginOpen: boolean;
  adminPanelOpen: boolean;
  userPanelOpen: boolean;
  setUser: (user: AuthUser | null) => void;
  setSubscription: (sub: SubscriptionInfo | null) => void;
  setLoginOpen: (open: boolean) => void;
  setAdminPanelOpen: (open: boolean) => void;
  setUserPanelOpen: (open: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  subscription: null,
  loginOpen: false,
  adminPanelOpen: false,
  userPanelOpen: false,
  setUser: (user) => set({ user }),
  setSubscription: (subscription) => set({ subscription }),
  setLoginOpen: (loginOpen) => set({ loginOpen }),
  setAdminPanelOpen: (adminPanelOpen) => set({ adminPanelOpen }),
  setUserPanelOpen: (userPanelOpen) => set({ userPanelOpen }),
  logout: () => set({ user: null, subscription: null, adminPanelOpen: false, userPanelOpen: false }),
}));
