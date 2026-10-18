"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogIn, UserPlus, Shield, Mail, Lock, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import { playUIClick } from "@/lib/audio";

export default function LoginModal() {
  const { loginOpen, setLoginOpen, setUser, setSubscription } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "حدث خطأ");
        return;
      }
      playUIClick();
      setUser(data.user);
      setSubscription(data.subscription);
      setLoginOpen(false);
      // Reset
      setEmail("");
      setPassword("");
      setName("");
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {loginOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setLoginOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="card-modern rounded-lg w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-gold/30 bg-gold/5">
                  <Shield className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-bold">
                    {mode === "login" ? "تسجيل الدخول" : "حساب جديد"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {mode === "login" ? "Sign In" : "Create Account"}
                  </div>
                </div>
              </div>
              <button onClick={() => setLoginOpen(false)} className="p-1.5 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-1 mb-4 p-1 rounded-lg bg-secondary/40">
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className={`py-1.5 rounded text-xs font-bold transition ${
                  mode === "login" ? "bg-gold/10 text-gold border border-gold/30" : "text-muted-foreground"
                }`}
              >
                <LogIn className="w-3 h-3 inline ml-1" /> دخول
              </button>
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className={`py-1.5 rounded text-xs font-bold transition ${
                  mode === "register" ? "bg-gold/10 text-gold border border-gold/30" : "text-muted-foreground"
                }`}
              >
                <UserPlus className="w-3 h-3 inline ml-1" /> تسجيل
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3">
              {mode === "register" && (
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-mono">الاسم</Label>
                  <div className="relative">
                    <User className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اسمك"
                      className="pr-8 bg-secondary border-border h-9"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-mono">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pr-8 bg-secondary border-border h-9 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-mono">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                    placeholder="••••••••"
                    className="pr-8 bg-secondary border-border h-9"
                  />
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 rounded border border-bear/30 bg-bear/10 text-[11px] text-bear flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" /> {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || !email || !password}
                className="w-full h-9 font-bold"
                style={{
                  background: "linear-gradient(180deg, #d4a574 0%, #94774a 100%)",
                  color: "#080b14",
                }}
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin ml-2" />
                    جاري...
                  </>
                ) : (
                  <>
                    {mode === "login" ? <LogIn className="w-3.5 h-3.5 ml-2" /> : <UserPlus className="w-3.5 h-3.5 ml-2" />}
                    {mode === "login" ? "دخول" : "إنشاء حساب"}
                  </>
                )}
              </Button>

              {/* Demo credentials */}
              {mode === "login" && (
                <div className="text-[9px] text-muted-foreground/70 text-center pt-1">
                  تجريبي: admin@mrobot.ai / admin123 أو user@mrobot.ai / user123
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
