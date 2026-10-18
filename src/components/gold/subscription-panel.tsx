"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Crown, Shield, Zap, X, Star, Sparkles,
  TrendingUp, Users, DollarSign, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { playUIClick } from "@/lib/audio";

interface Plan {
  id: string;
  name: string;
  nameAr: string;
  priceMonthly: number;
  priceYearly: number;
  maxTrades: number;
  maxLotSize: number;
  maxLeverage: number;
  featuresAr: string[];
  active: boolean;
}

export default function SubscriptionPanel() {
  const { user, subscription, setLoginOpen } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/subscriptions");
        const data = await res.json();
        if (active && data.plans) setPlans(data.plans.filter((p: Plan) => p.active));
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const currentPlan = subscription?.plan?.name;

  if (loading) {
    return (
      <div className="card-elevated rounded-xl p-5">
        <div className="h-64 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-gold/30 bg-gold/5">
            <Crown className="w-4 h-4 text-gold" />
          </div>
          <div>
            <h2 className="text-sm font-bold">باقات الاشتراك</h2>
            <p className="text-[10px] text-muted-foreground font-mono">Subscription Plans</p>
          </div>
        </div>
        {/* Billing toggle */}
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/40">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-3 py-1 rounded text-[10px] font-bold transition ${billing === "monthly" ? "bg-gold/10 text-gold border border-gold/30" : "text-muted-foreground"}`}
          >
            شهري
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-3 py-1 rounded text-[10px] font-bold transition ${billing === "yearly" ? "bg-gold/10 text-gold border border-gold/30" : "text-muted-foreground"}`}
          >
            سنوي
            <span className="text-[8px] text-bull mr-1">-17%</span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {plans.map((plan, i) => {
          const isCurrent = currentPlan === plan.name;
          const isPopular = plan.name === "Pro";
          const price = billing === "monthly" ? plan.priceMonthly : plan.priceYearly;
          const accent = plan.name === "Free" ? "#94a3b8" : plan.name === "Pro" ? "#d4a574" : "#a78bfa";

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-xl p-4 border-2 transition-all ${isPopular ? "border-gold/40" : "border-border/50"}`}
              style={{
                background: isPopular
                  ? "linear-gradient(135deg, rgba(212,165,116,0.06), transparent)"
                  : "linear-gradient(135deg, rgba(148,163,184,0.03), transparent)",
              }}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full gold-gradient text-[9px] font-bold text-black flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-black" /> الأكثر شعبية
                </div>
              )}

              {/* Plan name */}
              <div className="text-center mb-3">
                <div className="text-lg font-extrabold" style={{ color: accent }}>{plan.nameAr}</div>
                <div className="text-[9px] text-muted-foreground font-mono">{plan.name}</div>
              </div>

              {/* Price */}
              <div className="text-center mb-3">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-extrabold tabular-nums ltr-nums" style={{ color: accent }}>
                    ${price === 0 ? "0" : price}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/{billing === "monthly" ? "شهر" : "سنة"}</span>
                </div>
                {price === 0 && <div className="text-[10px] text-muted-foreground">مجاني للأبد</div>}
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-1 mb-3 text-center text-[9px]">
                <div className="px-1 py-1.5 rounded bg-secondary/30">
                  <div className="text-muted-foreground">صفقات/يوم</div>
                  <div className="font-bold text-foreground tabular-nums ltr-nums">{plan.maxTrades}</div>
                </div>
                <div className="px-1 py-1.5 rounded bg-secondary/30">
                  <div className="text-muted-foreground">حجم أقصى</div>
                  <div className="font-bold text-foreground tabular-nums ltr-nums">{plan.maxLotSize}</div>
                </div>
                <div className="px-1 py-1.5 rounded bg-secondary/30">
                  <div className="text-muted-foreground">رافعة</div>
                  <div className="font-bold text-foreground tabular-nums ltr-nums">1:{plan.maxLeverage}</div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1.5 mb-4">
                {plan.featuresAr.map((f, j) => (
                  <div key={j} className="flex items-start gap-1.5 text-[10px]">
                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: accent }} />
                    <span className="text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>

              {/* Action button */}
              <Button
                onClick={() => {
                  playUIClick();
                  if (!user) { setLoginOpen(true); return; }
                  // For demo: just show notification
                }}
                disabled={isCurrent}
                className={`w-full py-2 text-xs font-bold rounded-lg ${
                  isCurrent
                    ? "bg-secondary text-muted-foreground cursor-default"
                    : isPopular
                    ? "gold-gradient text-black"
                    : "bg-secondary border border-border text-foreground hover:bg-accent"
                }`}
              >
                {isCurrent ? " باقتك الحالية" : !user ? "سجل دخول للاشتراك" : "اشترك الآن"}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-3 text-center text-[9px] text-muted-foreground/60">
         جميع الأسعار بالدولار الأمريكي • يمكنك الإلغاء في أي وقت • بدون رسوم خفية
      </div>
    </div>
  );
}
