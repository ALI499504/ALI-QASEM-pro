"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CopyTradeResponse {
  masterLotSize: number;
  followerLotSize: number;
  scaledLotSize: number;
  effectiveRiskAmount: number;
  effectiveRiskPct: number;
  ratio: number;
  warning: string | null;
  isValid: boolean;
}

export default function CopyTradingPanel({
  masterBalance = 1000,
  signalEntry,
  signalStopLoss,
  signalSide,
}: {
  masterBalance?: number;
  signalEntry?: number;
  signalStopLoss?: number;
  signalSide?: "BUY" | "SELL";
}) {
  const [followerBalance, setFollowerBalance] = useState(1000);
  const [entry, setEntry] = useState(signalEntry ?? 4180);
  const [sl, setSL] = useState(signalStopLoss ?? 4170);
  const [side, setSide] = useState<"BUY" | "SELL">(signalSide ?? "BUY");
  const [result, setResult] = useState<CopyTradeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const compute = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/gold/copy-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterBalance,
          followerBalance,
          entryPrice: entry,
          stopLoss: sl,
        }),
      });
      if (r.ok) {
        const j = await r.json();
        setResult(j);
      }
    } catch (e) {}
    finally { setLoading(false); }
  };

  // Sync props
  if (signalEntry && signalEntry !== entry) setEntry(signalEntry);
  if (signalStopLoss && signalStopLoss !== sl) setSL(signalStopLoss);
  if (signalSide && signalSide !== side) setSide(signalSide);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#1a2030] bg-[#0d1117] p-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <Copy className="w-4 h-4 text-[#d4a574]" />
        <h3 className="text-sm font-bold text-white">Copy Trading — نسخ تناسبي</h3>
      </div>

      <div className="text-[9px] text-[#6b7280] bg-[#1a2030]/50 p-1.5 rounded mb-2 border border-[#1a2030]">
        للنسخ الشخصي فقط — غير مخصص للتوزيع. يدوي على MT4/MT5.
      </div>

      <div className="space-y-2 text-[10px]">
        <div>
          <label className="text-[#6b7280] block mb-0.5">رصيد الحساب الرئيسي ($)</label>
          <input
            type="number"
            value={masterBalance}
            disabled
            className="w-full bg-[#1a2030] text-white px-2 py-1 rounded text-[11px] disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-[#6b7280] block mb-0.5">رصيد حسابك ($)</label>
          <input
            type="number"
            value={followerBalance}
            onChange={(e) => setFollowerBalance(Number(e.target.value))}
            className="w-full bg-[#1a2030] text-white px-2 py-1 rounded text-[11px]"
          />
        </div>
        <div>
          <label className="text-[#6b7280] block mb-0.5">اتجاه الصفقة</label>
          <div className="flex gap-1">
            <button
              onClick={() => setSide("BUY")}
              className={`flex-1 px-2 py-1 rounded text-[11px] ${
                side === "BUY" ? "bg-[#22d39a] text-black" : "bg-[#1a2030] text-[#6b7280]"
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setSide("SELL")}
              className={`flex-1 px-2 py-1 rounded text-[11px] ${
                side === "SELL" ? "bg-[#ef4444] text-black" : "bg-[#1a2030] text-[#6b7280]"
              }`}
            >
              SELL
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[#6b7280] block mb-0.5">سعر الدخول</label>
            <input
              type="number"
              step="0.01"
              value={entry}
              onChange={(e) => setEntry(Number(e.target.value))}
              className="w-full bg-[#1a2030] text-white px-2 py-1 rounded text-[11px]"
            />
          </div>
          <div>
            <label className="text-[#6b7280] block mb-0.5">الوقف</label>
            <input
              type="number"
              step="0.01"
              value={sl}
              onChange={(e) => setSL(Number(e.target.value))}
              className="w-full bg-[#1a2030] text-white px-2 py-1 rounded text-[11px]"
            />
          </div>
        </div>

        <button
          onClick={compute}
          disabled={loading}
          className="w-full bg-[#d4a574] text-black font-bold py-1.5 rounded text-[11px] hover:bg-[#c19660] disabled:opacity-50"
        >
          {loading ? "جاري الحساب..." : "احسب خطة النسخ"}
        </button>

        {result && (
          <div className="mt-2 space-y-2">
            <div className={`rounded p-2 border ${result.isValid ? "bg-[#22d39a]/10 border-[#22d39a]/40" : "bg-[#ef4444]/10 border-[#ef4444]/40"}`}>
              <div className="flex items-center gap-1.5">
                {result.isValid ? (
                  <CheckCircle2 className="w-3 h-3 text-[#22d39a]" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-[#ef4444]" />
                )}
                <span className={`font-bold text-[11px] ${result.isValid ? "text-[#22d39a]" : "text-[#ef4444]"}`}>
                  {result.isValid ? "خطة صالحة" : "خطة غير صالحة"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#1a2030] rounded p-2">
                <div className="text-[#6b7280]">لوت الماستر</div>
                <div className="text-white font-bold">{result.masterLotSize.toFixed(3)}</div>
              </div>
              <div className="bg-[#1a2030] rounded p-2">
                <div className="text-[#6b7280]">لوتك (نسبي)</div>
                <div className="text-[#d4a574] font-bold">{result.scaledLotSize.toFixed(2)}</div>
              </div>
              <div className="bg-[#1a2030] rounded p-2">
                <div className="text-[#6b7280]">المخاطرة الفعلية</div>
                <div className="text-[#f59e0b] font-bold">${result.effectiveRiskAmount.toFixed(2)}</div>
              </div>
              <div className="bg-[#1a2030] rounded p-2">
                <div className="text-[#6b7280]">النسبة المئوية</div>
                <div className="text-white font-bold">{result.effectiveRiskPct.toFixed(2)}%</div>
              </div>
              <div className="bg-[#1a2030] rounded p-2 col-span-2">
                <div className="text-[#6b7280]">نسبة المتابعة (Follower/Master)</div>
                <div className="text-white font-bold">{result.ratio.toFixed(3)}x</div>
              </div>
            </div>

            {result.warning && (
              <div className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 p-2 rounded border border-[#f59e0b]/30">
                {result.warning}
              </div>
            )}

            {/* MT4 Order */}
            <div className="bg-[#0a0e14] rounded p-2 border border-[#1a2030] text-[9px] font-mono text-[#9ca3af] whitespace-pre-wrap">
{`// XAUUSD ${side} ${result.scaledLotSize.toFixed(2)} @ market
// SL: ${sl.toFixed(2)}
// Risk: ${result.effectiveRiskPct.toFixed(2)}% = $${result.effectiveRiskAmount.toFixed(2)}
// R:R min 1:1.3, target 1:1.5 to 1:3

OrderSend("XAUUSD", ${side === "BUY" ? "OP_BUY" : "OP_SELL"}, ${result.scaledLotSize.toFixed(2)}, Ask, 20, ${sl.toFixed(2)}, 0, "M.ROBOT Copy", 0, 0, clrNone);`}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
