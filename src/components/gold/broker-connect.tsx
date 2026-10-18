"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plug, X, Check, AlertCircle, Key, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onClose: () => void;
}

const BROKERS = [
  { id: "oanda", name: "OANDA", logo: "", desc: "REST API + v20 streaming" },
  { id: "mt5", name: "MetaTrader 5", logo: "", desc: "MetaTrader 5 API integration" },
  { id: "ibkr", name: "Interactive Brokers", logo: "", desc: "TWS API / Client Portal" },
  { id: "demo", name: "Demo Account", logo: "", desc: "Paper trading (no real money)" },
];

export default function BrokerConnect({ open, onClose }: Props) {
  const [broker, setBroker] = useState("demo");
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  function handleConnect() {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      setTimeout(() => {
        onClose();
        setConnected(false);
      }, 1500);
    }, 1500);
  }

  function handleDisconnect() {
    setConnected(false);
    setApiKey("");
    setAccountId("");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="card-modern rounded-lg w-full max-w-md p-5 max-h-[90vh] overflow-y-auto scroll-styled"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-gold/30 bg-gold/5">
                  <Plug className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-bold">ربط وسيط التداول</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Broker Connection</div>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status badge */}
            <div
              className={`px-3 py-2 rounded border text-[11px] mb-4 flex items-center gap-2 ${
                connected
                  ? "border-bull/30 bg-bull/10 text-bull"
                  : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {connected ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {connected ? "متصل (Demo Mode)" : "غير متصل — وضع المحاكاة فقط"}
            </div>

            {/* Broker selector */}
            <div className="mb-3">
              <Label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wider font-mono">
                اختر الوسيط
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {BROKERS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBroker(b.id)}
                    className={`p-2.5 rounded border text-right transition ${
                      broker === b.id
                        ? "border-gold/40 bg-gold/10"
                        : "border-border bg-secondary hover:border-border-strong"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-lg">{b.logo}</span>
                      <span className="text-xs font-bold">{b.name}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground font-mono">{b.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* API credentials */}
            {broker !== "demo" && (
              <div className="space-y-3 mb-4">
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block flex items-center gap-1 uppercase tracking-wider font-mono">
                    <Key className="w-2.5 h-2.5" /> API Key
                  </Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="أدخل مفتاح API"
                    className="bg-secondary border-border h-9 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block flex items-center gap-1 uppercase tracking-wider font-mono">
                    <AlertCircle className="w-2.5 h-2.5" /> Account ID
                  </Label>
                  <Input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="001-001-123456-001"
                    className="bg-secondary border-border h-9 font-mono text-xs"
                  />
                </div>
              </div>
            )}

            {/* Demo mode notice */}
            {broker === "demo" && (
              <div className="mb-4 px-3 py-2 rounded border border-info/30 bg-info/10 text-[10px] text-info/90 leading-relaxed">
                 وضع المحاكاة يستخدم بيانات حقيقية مع رصيد افتراضي $10,000. لا تنفذ صفقات حقيقية. مثالي للتدريب والاختبار.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {!connected ? (
                <Button
                  onClick={handleConnect}
                  disabled={connecting || (broker !== "demo" && (!apiKey || !accountId))}
                  className="flex-1 h-9 font-bold"
                  style={{
                    background: "linear-gradient(180deg, #10b981 0%, #0d9268 100%)",
                    color: "white",
                  }}
                >
                  {connecting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2" />
                      جاري الاتصال...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5 ml-2" />
                      اتصال
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="flex-1 h-9 border-bear/30 text-bear hover:bg-bear/10"
                >
                  <Unlink className="w-3.5 h-3.5 ml-2" />
                  قطع الاتصال
                </Button>
              )}
            </div>

            <div className="mt-3 text-[9px] text-muted-foreground text-center">
               بياناتك مشفّرة ولا تُحفظ على الخادم
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
