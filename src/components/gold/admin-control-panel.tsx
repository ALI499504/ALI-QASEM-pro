"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Crown, Users, CreditCard, TrendingUp, DollarSign,
  Ban, Check, Edit3, Save, Trash2, Plus, Shield, Activity,
  BarChart3, UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import { playUIClick, playTradeClosed } from "@/lib/audio";

interface AdminUser {
  id: string; email: string; name: string; role: string;
  banned: boolean; createdAt: string;
  subscription: { status: string; endDate: string | null; plan: { name: string; nameAr: string } | null } | null;
}

interface Plan {
  id: string; name: string; nameAr: string; priceMonthly: number; priceYearly: number;
  maxTrades: number; maxLotSize: number; maxLeverage: number;
  featuresAr: string[]; active: boolean;
}

export default function AdminControlPanel() {
  const { user, adminPanelOpen, setAdminPanelOpen } = useAuthStore();
  const [tab, setTab] = useState<"overview" | "users" | "plans">("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);

  const headers = { "x-user-id": user?.id || "", "x-user-role": user?.role || "" };

  async function fetchData() {
    setLoading(true);
    try {
      const [usersRes, plansRes] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/subscriptions"),
      ]);
      const ud = await usersRes.json();
      const pd = await plansRes.json();
      if (ud.users) setUsers(ud.users);
      if (pd.plans) setPlans(pd.plans);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (adminPanelOpen && user?.role === "ADMIN") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [adminPanelOpen, user]);

  // Stats
  const totalUsers = users.length;
  const activeSubs = users.filter(u => u.subscription?.status === "ACTIVE").length;
  const bannedUsers = users.filter(u => u.banned).length;
  const totalRevenue = plans.reduce((s, p) => s + p.priceMonthly, 0) * activeSubs;

  async function toggleBan(userId: string, banned: boolean) {
    playUIClick();
    await fetch("/api/admin/users", {
      method: "PUT", headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ userId, banned: !banned }),
    });
    fetchData();
  }

  async function assignSub(userId: string, planId: string) {
    playUIClick();
    await fetch("/api/subscriptions/plans", {
      method: "POST", headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ userId, planId, durationDays: 30 }),
    });
    fetchData();
  }

  async function savePlan(plan: Plan) {
    playTradeClosed();
    await fetch("/api/admin/subscriptions", {
      method: "PUT", headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ planId: plan.id, ...plan, featuresAr: plan.featuresAr }),
    });
    setEditingPlan(null);
    fetchData();
  }

  return (
    <AnimatePresence>
      {adminPanelOpen && user?.role === "ADMIN" && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setAdminPanelOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-nexus rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-gold/30 bg-gold/5">
                  <Crown className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-bold">لوحة تحكم الإدارة</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Admin Control Panel — Full Access</div>
                </div>
              </div>
              <button onClick={() => setAdminPanelOpen(false)} className="p-1.5 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-border flex-shrink-0">
              {[
                { id: "overview", label: "نظرة عامة", icon: <BarChart3 className="w-3.5 h-3.5" /> },
                { id: "users", label: "المستخدمون", icon: <Users className="w-3.5 h-3.5" /> },
                { id: "plans", label: "الباقات والأسعار", icon: <CreditCard className="w-3.5 h-3.5" /> },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => { playUIClick(); setTab(t.id as any); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition ${
                    tab === t.id ? "bg-gold/10 text-gold border border-gold/30" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scroll-styled p-4">
              {loading ? (
                <div className="text-center py-8 text-xs text-muted-foreground">جاري التحميل...</div>
              ) : tab === "overview" ? (
                <div className="space-y-3">
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <AdminStat icon={<Users className="w-4 h-4" />} label="إجمالي المستخدمين" value={`${totalUsers}`} color="#3b82f6" />
                    <AdminStat icon={<TrendingUp className="w-4 h-4" />} label="اشتراكات نشطة" value={`${activeSubs}`} color="#10b981" />
                    <AdminStat icon={<Ban className="w-4 h-4" />} label="مستخدمون محظورون" value={`${bannedUsers}`} color="#f43f5e" />
                    <AdminStat icon={<DollarSign className="w-4 h-4" />} label="إيراد شهري متوقع" value={`$${totalRevenue.toLocaleString("en-US")}`} color="#d4a574" />
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3 bg-secondary/20">
                      <div className="text-[10px] font-bold text-foreground mb-2 flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-gold" /> إحصائيات النظام
                      </div>
                      <div className="space-y-1 text-[10px] text-muted-foreground">
                        <div className="flex justify-between"><span>الAdmin:</span><span className="font-bold text-foreground">{user?.email}</span></div>
                        <div className="flex justify-between"><span>عدد الباقات:</span><span className="font-bold text-foreground">{plans.length}</span></div>
                        <div className="flex justify-between"><span>الباقات النشطة:</span><span className="font-bold text-foreground">{plans.filter(p => p.active).length}</span></div>
                        <div className="flex justify-between"><span>معدل التحويل:</span><span className="font-bold text-foreground">{totalUsers > 0 ? Math.round(activeSubs / totalUsers * 100) : 0}%</span></div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3 bg-secondary/20">
                      <div className="text-[10px] font-bold text-foreground mb-2 flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-gold" /> صلاحيات الإدارة
                      </div>
                      <div className="space-y-1 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5"><Check className="w-2.5 h-2.5 text-bull" /> إنشاء/تعديل/حذف الباقات</div>
                        <div className="flex items-center gap-1.5"><Check className="w-2.5 h-2.5 text-bull" /> حظر/إلغاء حظر المستخدمين</div>
                        <div className="flex items-center gap-1.5"><Check className="w-2.5 h-2.5 text-bull" /> تعيين اشتراكات للمستخدمين</div>
                        <div className="flex items-center gap-1.5"><Check className="w-2.5 h-2.5 text-bull" /> تغيير دور المستخدم (Admin/User)</div>
                        <div className="flex items-center gap-1.5"><Check className="w-2.5 h-2.5 text-bull" /> تعديل الأسعار والحدود</div>
                      </div>
                    </div>
                  </div>

                  {/* Recent users */}
                  <div>
                    <div className="text-[10px] font-bold text-foreground mb-1.5">أحدث المستخدمين</div>
                    <div className="space-y-1">
                      {users.slice(0, 5).map(u => (
                        <div key={u.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-secondary/20 text-[10px]">
                          <span className="font-bold text-foreground">{u.name || u.email}</span>
                          <span className="text-muted-foreground">{u.subscription?.plan?.nameAr ?? "لا اشتراك"}</span>
                          <span className="text-muted-foreground/60">{new Date(u.createdAt).toLocaleDateString("ar-EG")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : tab === "users" ? (
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 rounded border border-border bg-secondary/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{u.name || u.email}</span>
                          {u.role === "ADMIN" && <Crown className="w-3 h-3 text-gold" />}
                          {u.banned && <span className="pill pill-modern-bear text-[9px]">محظور</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">{u.email}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {u.subscription ? `${u.subscription.plan?.nameAr ?? "غير محدد"} • ${u.subscription.status}` : "لا اشتراك"}
                        </div>
                      </div>
                      {/* Assign plan */}
                      <select
                        onChange={(e) => e.target.value && assignSub(u.id, e.target.value)}
                        className="w-28 h-7 text-[10px] rounded bg-secondary border border-border px-1"
                        defaultValue=""
                      >
                        <option value="" disabled>تعيين خطة</option>
                        {plans.map(p => <option key={p.id} value={p.id}>{p.nameAr}</option>)}
                      </select>
                      {/* Ban */}
                      <button
                        onClick={() => toggleBan(u.id, u.banned)}
                        className={`p-1.5 rounded border transition ${
                          u.banned ? "border-bull/30 text-bull hover:bg-bull/10" : "border-bear/30 text-bear hover:bg-bear/10"
                        }`}
                      >
                        {u.banned ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map(plan => (
                    <AdminPlanCard
                      key={plan.id}
                      plan={plan}
                      editing={editingPlan === plan.id}
                      onEdit={() => { playUIClick(); setEditingPlan(plan.id); }}
                      onSave={savePlan}
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

function AdminStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="stat-box-modern">
      <div className="flex items-center justify-between mb-1">
        <div className="stat-label">{label}</div>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="stat-value tabular-nums ltr-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function AdminPlanCard({ plan, editing, onEdit, onSave }: {
  plan: Plan; editing: boolean; onEdit: () => void; onSave: (p: Plan) => void;
}) {
  const [local, setLocal] = useState(plan);
  const [featuresText, setFeaturesText] = useState(plan.featuresAr.join("\n"));

  if (editing) {
    return (
      <div className="p-3 rounded border border-gold/30 bg-gold/[0.03] space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[9px] text-muted-foreground">الاسم (EN)</Label>
            <Input value={local.name} onChange={e => setLocal({ ...local, name: e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">الاسم (AR)</Label>
            <Input value={local.nameAr} onChange={e => setLocal({ ...local, nameAr: e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-[9px] text-muted-foreground">$/شهر</Label>
            <Input type="number" value={local.priceMonthly} onChange={e => setLocal({ ...local, priceMonthly: +e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">$/سنة</Label>
            <Input type="number" value={local.priceYearly} onChange={e => setLocal({ ...local, priceYearly: +e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">صفقات/يوم</Label>
            <Input type="number" value={local.maxTrades} onChange={e => setLocal({ ...local, maxTrades: +e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
          <div>
            <Label className="text-[9px] text-muted-foreground">رافعة قصوى</Label>
            <Input type="number" value={local.maxLeverage} onChange={e => setLocal({ ...local, maxLeverage: +e.target.value })} className="h-7 text-xs bg-secondary" />
          </div>
        </div>
        <div>
          <Label className="text-[9px] text-muted-foreground">الميزات (كل سطر ميزة)</Label>
          <textarea
            value={featuresText}
            onChange={e => { setFeaturesText(e.target.value); setLocal({ ...local, featuresAr: e.target.value.split("\n").filter(Boolean) }); }}
            className="w-full h-20 text-[10px] bg-secondary border border-border rounded p-2"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(local)} className="bg-bull text-white hover:bg-bull/80 h-7 text-[10px]">
            <Save className="w-3 h-3 ml-1" /> حفظ
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit} className="h-7 text-[10px]">إلغاء</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded border border-border bg-secondary/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{plan.nameAr}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{plan.name}</span>
          {!plan.active && <span className="pill pill-modern-bear text-[9px]">معطّل</span>}
        </div>
        <button onClick={onEdit} className="p-1.5 rounded border border-border hover:border-gold/30 text-muted-foreground hover:text-gold transition">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 text-[10px]">
        <div><DollarSign className="w-2.5 h-2.5 inline text-gold" /> ${plan.priceMonthly}/شهر</div>
        <div><DollarSign className="w-2.5 h-2.5 inline text-gold" /> ${plan.priceYearly}/سنة</div>
        <div><TrendingUp className="w-2.5 h-2.5 inline text-info" /> {plan.maxTrades} صفقة</div>
        <div><Shield className="w-2.5 h-2.5 inline text-bull" /> 1:{plan.maxLeverage}</div>
      </div>
      <div className="mt-1.5 text-[9px] text-muted-foreground">
        الميزات: {plan.featuresAr.join(" • ")}
      </div>
    </div>
  );
}
