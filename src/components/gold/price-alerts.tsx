"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, X, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { playPriceAlert } from "@/lib/audio";
import { motion, AnimatePresence } from "framer-motion";

interface Alert {
  id: string;
  type: "above" | "below";
  price: number;
  createdAt: number;
  triggered: boolean;
}

interface Props {
  currentPrice: number;
}

const STORAGE_KEY = "mrobot-price-alerts";

export default function PriceAlerts({ currentPrice }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [newPrice, setNewPrice] = useState<string>("");
  const [newType, setNewType] = useState<"above" | "below">("above");
  const [browserNotify, setBrowserNotify] = useState(false);

  // Load alerts from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setAlerts(stored);
    } catch {
      setAlerts([]);
    }
  }, []);

  // Save alerts
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  // Check alerts whenever price changes
  useEffect(() => {
    if (!currentPrice || alerts.length === 0) return;
    for (const alert of alerts) {
      if (alert.triggered) continue;
      const triggered =
        (alert.type === "above" && currentPrice >= alert.price) ||
        (alert.type === "below" && currentPrice <= alert.price);
      if (triggered) {
        // Mark as triggered
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, triggered: true } : a))
        );
        // Show browser notification
        showBrowserNotification(alert, currentPrice);
        playPriceAlert();
        // Play sound
        try {
          const audio = new Audio(
            "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ=="
          );
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch {}
      }
    }
  }, [currentPrice, alerts]);

  async function showBrowserNotification(alert: Alert, currentPrice: number) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const direction = alert.type === "above" ? "ارتفع" : "انخفض";
      const arrow = alert.type === "above" ? "" : "";
      const notif = new Notification(`M.ROBOT — تنبيه سعري ${arrow}`, {
        body: `${direction} الذهب إلى $${currentPrice.toFixed(2)} (هدفك: $${alert.price.toFixed(2)})`,
        icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
        tag: alert.id,
        requireInteraction: true,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setBrowserNotify(result === "granted");
    } else {
      setBrowserNotify(Notification.permission === "granted");
    }
  }

  function addAlert() {
    const price = parseFloat(newPrice);
    if (!Number.isFinite(price) || price <= 0) return;
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: newType,
      price,
      createdAt: Date.now(),
      triggered: false,
    };
    setAlerts((prev) => [...prev, alert]);
    setNewPrice("");
    if (!browserNotify) requestNotificationPermission();
  }

  function removeAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function clearTriggered() {
    setAlerts((prev) => prev.filter((a) => !a.triggered));
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border bg-secondary hover:border-gold/30 transition text-[11px] font-bold"
        title="تنبيهات سعرية مخصصة"
      >
        {alerts.some((a) => !a.triggered) ? (
          <BellRing className="w-3.5 h-3.5 text-gold" />
        ) : (
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span className="hidden sm:inline">تنبيهات</span>
        {alerts.some((a) => !a.triggered) && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed top-16 left-2 z-50 w-80 max-w-[calc(100vw-1rem)] glass rounded-xl border border-border shadow-2xl p-3"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <div className="text-sm font-bold flex items-center gap-2">
                <BellRing className="w-4 h-4 text-gold" />
                التنبيهات السعرية
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add new alert */}
            <div className="mb-3 space-y-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setNewType("above")}
                  className={`flex-1 px-2 py-1.5 rounded text-[10px] font-bold border ${
                    newType === "above"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-secondary border-border text-muted-foreground"
                  }`}
                >
                  <TrendingUp className="w-3 h-3 inline ml-1" />
                  فوق
                </button>
                <button
                  onClick={() => setNewType("below")}
                  className={`flex-1 px-2 py-1.5 rounded text-[10px] font-bold border ${
                    newType === "below"
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                      : "bg-secondary border-border text-muted-foreground"
                  }`}
                >
                  <TrendingDown className="w-3 h-3 inline ml-1" />
                  تحت
                </button>
              </div>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder={`السعر (الآن: ${currentPrice.toFixed(2)})`}
                  className="flex-1 px-2 py-1.5 rounded bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-gold/30 focus:outline-none"
                  step="0.01"
                  min="0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addAlert();
                  }}
                />
                <button
                  onClick={addAlert}
                  className="px-3 py-1.5 rounded bg-gold/20 border border-gold/30 text-gold hover:bg-gold/30 transition text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {!browserNotify && (
                <button
                  onClick={requestNotificationPermission}
                  className="w-full px-2 py-1.5 rounded text-[10px] bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition"
                >
                   فعّل تنبيهات المتصفح (لإشعارات حتى مع إغلاق الموقع)
                </button>
              )}
              {browserNotify && (
                <div className="text-[9px] text-emerald-400/80 text-center">
                   تنبيهات المتصفح مفعّلة
                </div>
              )}
            </div>

            {/* Active alerts */}
            <div className="space-y-1 max-h-60 overflow-y-auto scroll-styled pr-1">
              {alerts.length === 0 ? (
                <div className="text-center py-4 text-[11px] text-muted-foreground">
                  لا توجد تنبيهات بعد. أضف تنبيهاً的价格 ليُنبّهك عندما يصل السعر إليه.
                </div>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between p-2 rounded border text-[11px] ${
                      a.triggered
                        ? "bg-emerald-500/[0.04] border-emerald-500/20"
                        : "bg-secondary border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {a.type === "above" ? (
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                      )}
                      <div>
                        <div className="font-bold tabular-nums ltr-nums">
                          ${a.price.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {a.type === "above" ? "عند الارتفاع" : "عند الانخفاض"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.triggered && (
                        <span className="text-[9px] text-emerald-400 font-bold">
                           تم
                        </span>
                      )}
                      <button
                        onClick={() => removeAlert(a.id)}
                        className="text-muted-foreground hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {alerts.some((a) => a.triggered) && (
              <button
                onClick={clearTriggered}
                className="w-full mt-2 py-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground border border-border bg-secondary hover:bg-accent transition"
              >
                مسح المنفذة
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
