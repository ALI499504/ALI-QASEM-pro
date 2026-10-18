"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, Users, CreditCard, Trash2, Ban, Check, Crown,
  Plus, Edit3, Save, TrendingUp, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { playUIClick } from "@/lib/audio";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  banned: boolean;
  createdAt: string;
  subscription: { status: string; endDate: string | null; plan: { name: string; nameAr: string } | null } | null;
}

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

export default function AdminPanel() {
  const { user, adminPanelOpen, setAdminPanelOpen } = useAuthStore();
  const [tab, setTab] = useState<"users" | "plans">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const headers = { "x-user-id": user?.id || "", "x-user-role": user?.role || "" };
      const [usersRes, plansRes] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/subscriptions"),
      ]);
      const usersData = await usersRes.json();
      const plansData = await plansRes.json();
      if (usersData.users) setUsers(usersData.users);
      if (plansData.plans) setPlans(plansData.plans);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (adminPanelOpen && user?.role === "ADMIN") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [adminPanelOpen, user]);

  async function toggleBan(userId: string, banned: boolean) {
    playUIClick();
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-id": user?.id || "", "x-user-role": user?.role || "" },
      body: JSON.stringify({ userId, banned: !banned }),
    });
    fetchData();
  }

  async function assignSubscription(userId: string, planId: string) {
    playUIClick();
    await fetch("/api/subscriptions/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user?.id || "", "x-user-role": user?.role || "" },
      body: JSON.stringify({ userId, planId, durationDays: 30 }),
    });
    fetchData();
  }

  async function savePlan(plan: Plan) {
    playUIClick();
    await fetch("/api/admin/subscriptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-id": user?.id || "", "x-user-role": user?.role || "" },
      body: JSON.stringify({ planId: plan.id, ...plan, featuresAr: plan.featuresAr }),
    });
    setEditingPlan(null);
    fetchData();
  }

  async function deletePlan(planId: string) {
    playUIClick();
    await fetch(`/api/admin/subscriptions?id=${planId}`, {
      method: "DELETE",
      headers: { "x-user-id": user?.id || "", "x-user-role": user?.role || "" },
    });
    fetchData();
  }

  return (
    <AnimatePresence>
      {adminPanelOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setAdminPanelOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="card-modern rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-gold/30 bg-gold/5">
                  <Crown className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-bold">لوحة الإدارة</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Admin Dashboard</div>
                </div>
              </div>
              <button onClick={() => setAdminPanelOpen(false)} className="p-1.5 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-border flex-shrink-0">
              <button
                onClick={() => setTab("users")}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  tab === "users" ? "bg-gold/10 text-gold border border-gold/30" : "text-muted-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5 inline ml-1.5" /> المستخدمون ({users.length})
              </button>
              <button
                onClick={() => setTab("plans")}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  tab === "plans" ? "bg-gold/10 text-gold border border-gold/30" : "text-muted-foreground"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 inline ml-1.5" /> خطط الاشتراك ({plans.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scroll-styled p-4">
              {loading ? (
                <div className="text-center py-8 text-xs text-muted-foreground">جاري التحميل...</div>
              ) : tab === "users" ? (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 rounded border border-border bg-secondary/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{u.name || u.email}</span>
                          {u.role === "ADMIN" && <Crown className="w-3 h-3 text-gold" />}
                          {u.banned && <span className="pill pill-modern-bear text-[9px]">محظور</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">{u.email}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {u.subscription ? `${u.subscription.plan?.nameAr || "غير محدد"} • ${u.subscription.status}` : "لا اشتراك"}
                        </div>
                      </div>
                      {/* Assign subscription */}
                      <Select onValueChange={(planId) => assignSubscription(u.id, planId)}>
                        <SelectTrigger className="w-28 h-7 text-[10px] bg-secondary border-border">
                          <SelectValue placeholder="تعيين خطة" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.nameAr} (${p.priceMonthly}/شهر)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Ban/unban */}
                      <button
                        onClick={() => toggleBan(u.id, u.banned)}
                        className={`p-1.5 rounded border transition ${
                          u.banned
                            ? "border-bull/30 text-bull hover:bg-bull/10"
                            : "border-bear/30 text-bear hover:bg-bear/10"
                        }`}
                        title={u.banned ? "رفع الحظر" : "حظر"}
                      >
                        {u.banned ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      editing={editingPlan === plan.id}
                      onEdit={() => setEditingPlan(plan.id)}
                      onSave={savePlan}
                      onDelete={() => deletePlan(plan.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlanCard({ plan, editing, onEdit, onSave, onDelete }: {
  plan: Plan;
  editing: boolean;
  onEdit: () => void;
  onSave: (plan: Plan) => void;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState(plan);

  if (editing) {
    return (
      <div className="p-3 rounded border border-gold/30 bg-gold/[0.03] space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[9px] text-muted-foreground">الاسم (EN)</Label>
            <Input value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">الاسم (AR)</Label>
            <Input value={local.nameAr} onChange={(e) => setLocal({ ...local, nameAr: e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-[9px] text-muted-foreground">$/شهر</Label>
            <Input type="number" value={local.priceMonthly} onChange={(e) => setLocal({ ...local, priceMonthly: +e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">$/سنة</Label>
            <Input type="number" value={local.priceYearly} onChange={(e) => setLocal({ ...local, priceYearly: +e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">صفقات/يوم</Label>
            <Input type="number" value={local.maxTrades} onChange={(e) => setLocal({ ...local, maxTrades: +e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">رافعة قصوى</Label>
            <Input type="number" value={local.maxLeverage} onChange={(e) => setLocal({ ...local, maxLeverage: +e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(local)} className="bg-bull text-white hover:bg-bull/80 h-7">
            <Save className="w-3 h-3 ml-1" /> حفظ
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit} className="h-7">إلغاء</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded border border-border bg-secondary/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{plan.nameAr}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{plan.name}</span>
          {!plan.active && <span className="pill pill-modern-bear text-[9px]">معطّل</span>}
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 rounded border border-border hover:border-gold/30 text-muted-foreground hover:text-gold">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded border border-border hover:border-bear/30 text-muted-foreground hover:text-bear">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-[10px]">
        <div><DollarSign className="w-2.5 h-2.5 inline text-gold" /> {plan.priceMonthly}/شهر</div>
        <div><DollarSign className="w-2.5 h-2.5 inline text-gold" /> {plan.priceYearly}/سنة</div>
        <div><TrendingUp className="w-2.5 h-2.5 inline text-info" /> {plan.maxTrades} صفقة</div>
        <div><Shield className="w-2.5 h-2.5 inline text-bull" /> 1:{plan.maxLeverage}</div>
      </div>
      <div className="mt-1.5 text-[9px] text-muted-foreground">
        الميزات: {plan.featuresAr.join(" • ")}
      </div>
    </div>
  );
}
