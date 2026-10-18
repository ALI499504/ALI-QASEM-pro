"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, Trash2 } from "lucide-react";
import { useTradingStore } from "@/lib/store";
import type { Notification } from "@/lib/store";

export default function NotificationsCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, markAllRead, clearNotifications, notificationsOpen, setNotificationsOpen } = useTradingStore();
  const unread = notifications.filter((n) => !n.read).length;

  // Auto-open when notificationsOpen is set to true (e.g., when a trade is executed)
  useEffect(() => {
    if (notificationsOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setOpen(true);
      setNotificationsOpen(false);
      // Auto-close after 4 seconds
      const t = setTimeout(() => {
        setOpen(false);
      }, 4000);
      /* eslint-enable react-hooks/set-state-in-effect */
      return () => clearTimeout(t);
    }
  }, [notificationsOpen, setNotificationsOpen]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleOpen() {
    setOpen((o) => !o);
    if (!open) {
      // mark read after a small delay
      setTimeout(() => markAllRead(), 2000);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded border border-border bg-secondary hover:border-gold/30 transition"
        aria-label="الإشعارات"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center tabular-nums ltr-nums"
            style={{ background: "#f87171", color: "white" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 mt-2 w-[360px] max-w-[92vw] card-elevated z-50 overflow-hidden"
            style={{ background: "var(--popover)" }}
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gold" />
                <span className="text-sm font-bold">الإشعارات</span>
                {unread > 0 && (
                  <span className="pill pill-bear">{unread} غير مقروء</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={markAllRead}
                  className="p-1.5 rounded hover:bg-secondary transition"
                  title="تعليم الكل كمقروء"
                >
                  <Check className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={clearNotifications}
                  className="p-1.5 rounded hover:bg-secondary transition"
                  title="مسح الكل"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto scroll-styled">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  لا توجد إشعارات حالياً
                </div>
              ) : (
                notifications.map((n) => <NotifItem key={n.id} notif={n} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotifItem({ notif }: { notif: Notification }) {
  const color =
    notif.type === "signal" ? "#c8a050" :
    notif.type === "alert" ? "#f87171" :
    notif.type === "trade" ? "#4ade80" :
    "#60a5fa";

  const typeLabel =
    notif.type === "signal" ? "إشارة" :
    notif.type === "alert" ? "تنبيه" :
    notif.type === "trade" ? "صفقة" :
    "معلومة";

  return (
    <div className={`px-3 py-2.5 border-b border-border hover:bg-secondary/50 transition ${!notif.read ? "bg-gold/[0.04]" : ""}`}>
      <div className="flex items-start gap-2">
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ background: color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="pill text-[9px]"
              style={{
                background: `${color}15`,
                color: color,
                border: `1px solid ${color}30`,
              }}
            >
              {typeLabel}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums ltr-nums">
              {timeAgo(notif.timestamp)}
            </span>
            {!notif.read && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c8a050" }} />
            )}
          </div>
          <div className="text-xs font-semibold text-foreground truncate">
            {notif.title}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {notif.message}
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}
