"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playNotification } from "@/lib/audio";
import { Bell, BellRing, X, BellOff, TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";

interface Props {
  currentPrice: number;
  signalAction?: string;
  signalConfidence?: number;
  regimeAr?: string;
}

interface NotificationType {
  id: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const STORAGE_KEY = "mrobot-push-settings";

export default function SmartNotifications({ currentPrice, signalAction, signalConfidence, regimeAr }: Props) {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [types, setTypes] = useState<NotificationType[]>([
    { id: "signal", label: "إشارات جديدة (BUY/SELL)", icon: <TrendingUp className="w-3 h-3" />, enabled: true },
    { id: "price", label: "تنبيهات سعرية", icon: <Zap className="w-3 h-3" />, enabled: true },
    { id: "regime", label: "تغير النظام السوقي", icon: <Activity className="w-3 h-3" />, enabled: true },
    { id: "smc", label: "أحداث SMC (CHOCH/BOS)", icon: <Bell className="w-3 h-3" />, enabled: false },
  ]);
  const prevSignalRef = useRef<string | null>(null);
  const prevRegimeRef = useRef<string | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTypes((prev) => prev.map((t) => ({ ...t, enabled: parsed.find((p: any) => p.id === t.id)?.enabled ?? t.enabled })));
        }
      }
    } catch {}
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
  }, [types]);

  // Check permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Monitor for signal changes and send notifications
  useEffect(() => {
    if (permission !== "granted") return;

    // Check signal change
    if (signalAction && signalAction !== prevSignalRef.current && prevSignalRef.current !== null) {
      const signalType = types.find((t) => t.id === "signal");
      if (signalType?.enabled) {
        const isBuy = signalAction === "BUY" || signalAction === "STRONG_BUY";
        showNotification(
          `${isBuy ? "" : ""} إشارة جديدة: ${signalAction}`,
          `الثقة: ${signalConfidence}% | السعر: $${currentPrice.toFixed(2)}`,
          isBuy ? "#22d39a" : "#ff4d6a"
        );
      }
    }
    prevSignalRef.current = signalAction ?? null;

    // Check regime change
    if (regimeAr && regimeAr !== prevRegimeRef.current && prevRegimeRef.current !== null) {
      const regimeType = types.find((t) => t.id === "regime");
      if (regimeType?.enabled) {
        showNotification(
          ` تغير النظام السوقي`,
          `النظام الجديد: ${regimeAr}`,
          "#5b8cff"
        );
      }
    }
    prevRegimeRef.current = regimeAr ?? null;
  }, [signalAction, signalConfidence, regimeAr, currentPrice, permission, types]);

  function showNotification(title: string, body: string, color: string) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    try { playNotification(); } catch(e) {}

    try {
      const notif = new Notification(`M.ROBOT — ${title}`, {
        body,
        icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
        tag: title,
        requireInteraction: false,
      });

      // Play a sound
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==");
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch {}

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      // Auto close after 8 seconds
      setTimeout(() => notif.close(), 8000);
    } catch (e) {
      // ignore
    }
  }

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      showNotification(" التنبيهات مفعّلة", "ستصلك إشعارات الإشارات والتغيرات تلقائياً", "#22d39a");
    }
  }

  function toggleType(id: string) {
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  }

  const activeCount = types.filter((t) => t.enabled).length;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border bg-secondary hover:border-gold/30 transition text-[11px] font-bold"
        title="تنبيهات ذكية"
      >
        {permission === "granted" && activeCount > 0 ? (
          <BellRing className="w-3.5 h-3.5 text-gold" />
        ) : (
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span className="hidden sm:inline">تنبيهات</span>
        {permission === "granted" && activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 live-dot" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed top-16 left-2 z-50 w-80 max-w-[calc(100vw-1rem)] glass-strong rounded-xl border border-border shadow-2xl p-3"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <div className="text-sm font-bold flex items-center gap-2">
                <BellRing className="w-4 h-4 text-gold" />
                التنبيهات الذكية
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {permission !== "granted" ? (
              <button
                onClick={requestPermission}
                className="w-full px-3 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition text-xs font-bold flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                فعّل تنبيهات المتصفح
              </button>
            ) : (
              <>
                <div className="text-[10px] text-emerald-400 mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> التنبيهات مفعّلة
                </div>

                <div className="space-y-1.5">
                  {types.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleType(t.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-[11px] transition ${
                        t.enabled
                          ? "bg-emerald-500/[0.04] border-emerald-500/20 text-foreground"
                          : "bg-secondary/30 border-border text-muted-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={t.enabled ? "text-emerald-400" : "text-muted-foreground"}>{t.icon}</span>
                        {t.label}
                      </span>
                      <span
                        className={`w-8 h-4 rounded-full transition relative ${
                          t.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition ${
                            t.enabled ? "left-4" : "left-0.5"
                          }`}
                        />
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    showNotification(" تنبيه تجريبي", "التنبيهات تعمل بشكل صحيح!", "#d4a574");
                  }}
                  className="w-full mt-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent text-[10px] text-muted-foreground border border-border"
                >
                  إرسال تنبيه تجريبي
                </button>
              </>
            )}

            <div className="mt-2 text-[9px] text-muted-foreground/70 text-center">
              التنبيهات تظهر حتى مع تصفح مواقع أخرى
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
