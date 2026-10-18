"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Zap,
} from "lucide-react";

interface TradeDetails {
  type: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  lotSize: number;
  riskAmount: number;
  riskPercent: number;
}

interface ExecutionResult {
  success: boolean;
  retcode?: number;
  deal?: number;
  order?: number;
  price?: number;
  volume?: number;
  comment?: string;
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  trade: TradeDetails | null;
  currentPrice: number;
  symbol?: string;
  onExecuted?: (result: ExecutionResult) => void;
}

export default function MT5ExecutionModal({
  open,
  onClose,
  trade,
  currentPrice,
  symbol = "XAUUSD",
  onExecuted,
}: Props) {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  if (!open || !trade) return null;

  const isBuy = trade.type === "BUY";
  const color = isBuy ? "#6cffb2" : "#ff5a6a";

  const handleExecute = async () => {
    setExecuting(true);
    setResult(null);
    try {
      const r = await fetch("/api/gold/mt-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side: trade.type,
          volume: trade.lotSize,
          sl: trade.stopLoss,
          tp: trade.takeProfit3, // primary target = TP3
          deviation: 20,
          comment: `M.ROBOT SMC Strict (${trade.riskPercent}% risk)`,
        }),
      });
      const j = await r.json();
      if (j.success) {
        setResult({
          success: true,
          retcode: j.retcode,
          deal: j.deal,
          order: j.order,
          price: j.price,
          volume: j.volume,
          comment: j.comment,
        });
        onExecuted?.({ success: true, ...j });
      } else {
        setResult({
          success: false,
          error: j.error || `retcode ${j.retcode}: ${j.comment || "execution failed"}`,
        });
      }
    } catch (e: any) {
      setResult({ success: false, error: e?.message || "network error" });
    } finally {
      setExecuting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="rounded-2xl border border-[#1c2433] bg-[#07080c] shadow-2xl shadow-black/60 w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2433] bg-gradient-to-r from-[#07080c] to-[#0d1018]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                <Zap className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">تنفيذ على MetaTrader 5</h3>
                <p className="text-[9px] text-[#7d8aa0] tracking-wide">MT5 BRIDGE • DIRECT ORDER SEND</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-1 rounded hover:bg-[#1c2433] text-[#d7e0ee]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {result ? (
              // === RESULT VIEW ===
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                {result.success ? (
                  <>
                    <div className="rounded-xl border border-[#6cffb2]/40 bg-[#6cffb2]/10 p-4 text-center">
                      <CheckCircle2 className="w-10 h-10 text-[#6cffb2] mx-auto mb-2" />
                      <div className="text-sm font-bold text-[#6cffb2]">تم تنفيذ الأمر بنجاح</div>
                      <div className="text-[10px] text-[#d7e0ee] mt-1">
                        تم إرسال أمر {trade.type} إلى MT5 — راجع الـ Terminal للتأكيد
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {result.deal && (
                        <div className="bg-[#1c2433] rounded p-2">
                          <div className="text-[#7d8aa0]">Deal #</div>
                          <div className="text-white font-bold tabular-nums ltr-nums">{result.deal}</div>
                        </div>
                      )}
                      {result.order && (
                        <div className="bg-[#1c2433] rounded p-2">
                          <div className="text-[#7d8aa0]">Order #</div>
                          <div className="text-white font-bold tabular-nums ltr-nums">{result.order}</div>
                        </div>
                      )}
                      {result.price && (
                        <div className="bg-[#1c2433] rounded p-2">
                          <div className="text-[#7d8aa0]">Fill Price</div>
                          <div className="text-white font-bold tabular-nums ltr-nums">${result.price.toFixed(2)}</div>
                        </div>
                      )}
                      {result.volume && (
                        <div className="bg-[#1c2433] rounded p-2">
                          <div className="text-[#7d8aa0]">Volume (lots)</div>
                          <div className="text-white font-bold tabular-nums ltr-nums">{result.volume}</div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-[#ff5a6a]/40 bg-[#ff5a6a]/10 p-4 text-center">
                    <AlertTriangle className="w-10 h-10 text-[#ff5a6a] mx-auto mb-2" />
                    <div className="text-sm font-bold text-[#ff5a6a]">فشل تنفيذ الأمر</div>
                    <div className="text-[10px] text-[#d7e0ee] mt-1">{result.error}</div>
                  </div>
                )}
                <button
                  onClick={handleClose}
                  className="w-full py-2 rounded-lg bg-[#1c2433] hover:bg-[#232a3a] text-white text-xs font-bold transition"
                >
                  إغلاق
                </button>
              </motion.div>
            ) : (
              // === CONFIRMATION VIEW ===
              <>
                {/* Trade summary */}
                <div className="rounded-xl border p-3" style={{ borderColor: `${color}40`, background: `${color}10` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isBuy ? (
                        <TrendingUp className="w-5 h-5" style={{ color }} />
                      ) : (
                        <TrendingDown className="w-5 h-5" style={{ color }} />
                      )}
                      <span className="text-base font-bold" style={{ color }}>
                        {isBuy ? "Buy (Long)" : "Sell (Short)"} {symbol}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                      M.ROBOT Signal
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-[#1c2433] rounded p-2">
                      <div className="text-[#7d8aa0]">Volume</div>
                      <div className="text-white font-bold">{trade.lotSize.toFixed(2)} lots</div>
                    </div>
                    <div className="bg-[#1c2433] rounded p-2">
                      <div className="text-[#7d8aa0]">Current Price</div>
                      <div className="text-white font-bold tabular-nums ltr-nums">${currentPrice.toFixed(2)}</div>
                    </div>
                    <div className="bg-[#1c2433] rounded p-2">
                      <div className="text-[#7d8aa0]">Stop Loss</div>
                      <div className="text-[#ff5a6a] font-bold tabular-nums ltr-nums">${trade.stopLoss.toFixed(2)}</div>
                    </div>
                    <div className="bg-[#1c2433] rounded p-2">
                      <div className="text-[#7d8aa0]">Take Profit (TP3)</div>
                      <div className="text-[#6cffb2] font-bold tabular-nums ltr-nums">${trade.takeProfit3.toFixed(2)}</div>
                    </div>
                    <div className="bg-[#1c2433] rounded p-2 col-span-2">
                      <div className="text-[#7d8aa0]">Risk</div>
                      <div className="text-[#ffb020] font-bold">${trade.riskAmount.toFixed(2)} ({trade.riskPercent}%)</div>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="rounded-lg border border-[#ffb020]/30 bg-[#ffb020]/10 p-2.5 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#ffb020] mt-0.5 flex-shrink-0" />
                  <div className="text-[10px] text-[#d7e0ee] leading-relaxed">
                    تأكيد الإرسال المباشر للأمر إلى حساب MT5. تأكد من مراجعة جميع القيم قبل النقر على تنفيذ.
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleClose}
                    disabled={executing}
                    className="flex-1 py-2.5 rounded-lg bg-[#1c2433] hover:bg-[#232a3a] text-[#d7e0ee] text-xs font-bold transition disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={executing}
                    className="flex-1 py-2.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                    style={{
                      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                      color: "#000",
                    }}
                  >
                    {executing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        تأكيد التنفيذ
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
