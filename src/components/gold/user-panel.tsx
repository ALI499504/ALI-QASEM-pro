"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, User, CreditCard, Check, Calendar, Crown, Zap } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";

export default function UserPanel() {
  const { user, subscription, userPanelOpen, setUserPanelOpen, logout } = useAuthStore();

  const plan = subscription?.plan;
  const daysLeft = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <AnimatePresence>
      {userPanelOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setUserPanelOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="card-modern rounded-lg w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-gold/30 bg-gold/5">
                  <User className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-bold">حسابي</div>
                  <div className="text-[10px] text-muted-foreground font-mono">My Account</div>
                </div>
              </div>
              <button onClick={() => setUserPanelOpen(false)} className="p-1.5 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User info */}
            <div className="px-3 py-2.5 rounded border border-border bg-secondary/30 mb-3">
              <div className="text-xs font-bold">{user?.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{user?.email}</div>
              <div className="mt-1.5 flex items-center gap-2">
                {user?.role === "ADMIN" && (
                  <span className="pill pill-modern-neutral text-[9px]">
                    <Crown className="w-2.5 h-2.5" /> مدير
                  </span>
                )}
                {subscription?.status === "ACTIVE" && (
                  <span className="pill pill-modern-bull text-[9px]">
                    <Check className="w-2.5 h-2.5" /> نشط
                  </span>
                )}
              </div>
            </div>

            {/* Subscription info */}
            {plan ? (
              <div className="px-3 py-2.5 rounded border border-gold/20 bg-gold/[0.04] mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-gold">{plan.nameAr}</div>
                  <CreditCard className="w-3.5 h-3.5 text-gold" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                  <div>
                    <Calendar className="w-2.5 h-2.5 inline ml-1" />
                    {daysLeft > 0 ? `${daysLeft} يوم متبقي` : "منتهي"}
                  </div>
                  <div>
                    <Zap className="w-2.5 h-2.5 inline ml-1" />
                    {plan.maxTrades} صفقة/يوم
                  </div>
                  <div>حجم أقصى: {plan.maxLotSize} لوت</div>
                  <div>رافعة قصوى: 1:{plan.maxLeverage}</div>
                </div>
                {/* Features */}
                <div className="mt-2 pt-2 border-t border-border space-y-0.5">
                  {plan.featuresAr.map((f, i) => (
                    <div key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                      <Check className="w-2.5 h-2.5 text-bull mt-0.5 flex-shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded border border-border bg-secondary/30 mb-3 text-center text-xs text-muted-foreground">
                لا يوجد اشتراك نشط
              </div>
            )}

            {/* Logout */}
            <Button
              onClick={() => { logout(); setUserPanelOpen(false); }}
              variant="outline"
              className="w-full h-9 border-bear/30 text-bear hover:bg-bear/10"
            >
              تسجيل الخروج
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
