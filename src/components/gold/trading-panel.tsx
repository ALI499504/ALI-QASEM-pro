"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calculator,
  X,
  Loader2,
  Shield,
  Target,
  AlertTriangle,
  History,
} from "lucide-react";
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
import { useTradingStore, computePositionPnL } from "@/lib/store";
import { playTradeBuy, playTradeSell, playTradeClosed, playUIClick } from "@/lib/audio";

interface Props {
  currentPrice: number;
}

const CONTRACT_SIZE = 100; // 1 lot = 100 oz of gold
const ACCOUNT_BALANCE = 10000;

export default function TradingPanel({ currentPrice }: Props) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [lotSize, setLotSize] = useState("0.10");
  const [leverage, setLeverage] = useState("10");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [executing, setExecuting] = useState(false);
  const [flash, setFlash] = useState<"buy" | "sell" | null>(null);
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop" | "oco" | "trailing">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [trailingDistance, setTrailingDistance] = useState("2.00");
  const [brokerConnected, setBrokerConnected] = useState(false);
  const { positions, openPosition, closePosition, addNotification, pendingTrade, setPendingTrade, setNotificationsOpen } = useTradingStore();

  const lot = Math.max(0.01, parseFloat(lotSize) || 0);
  const lev = parseInt(leverage) || 1;
  const positionValue = lot * CONTRACT_SIZE * currentPrice;

  // Reusable execution function — used by both manual button and auto-fill
  function executeTrade(
    tradeSide: "BUY" | "SELL",
    tradeLot: number,
    tradeLev: number,
    tradeSL: number,
    tradeTP: number,
    source: string = ""
  ) {
    const tradeValue = tradeLot * CONTRACT_SIZE * currentPrice;
    const tradeMargin = tradeValue / tradeLev;
    if (tradeMargin > ACCOUNT_BALANCE || tradeLot <= 0) return;

    //  Play sound IMMEDIATELY (before setTimeout) — must be in user gesture context
    if (tradeSide === "BUY") playTradeBuy();
    else playTradeSell();

    setExecuting(true);
    setFlash(tradeSide === "BUY" ? "buy" : "sell");
    setTimeout(() => setFlash(null), 600);
    setTimeout(() => {
      openPosition({
        side: tradeSide,
        symbol: "XAUUSD",
        lotSize: tradeLot,
        leverage: tradeLev,
        entryPrice: currentPrice,
        stopLoss: tradeSL,
        takeProfit: tradeTP,
        margin: tradeMargin,
        currentPrice,
      });
      addNotification({
        type: "trade",
        title: `تم فتح صفقة ${tradeSide === "BUY" ? "شراء" : "بيع"} ${source}`,
        message: `${tradeLot.toFixed(2)} لوت @ $${currentPrice.toFixed(2)} • رافعة 1:${tradeLev}`,
      });
      //  Auto-open notifications panel
      setNotificationsOpen(true);
      setExecuting(false);
    }, 400);
  }

  // Auto-fill from pending trade (e.g., from "Execute on Consensus" button)
  useEffect(() => {
    if (!pendingTrade) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setSide(pendingTrade.side);
    setLotSize(pendingTrade.lotSize.toFixed(2));
    setLeverage(String(pendingTrade.leverage));
    setStopLoss(pendingTrade.stopLoss.toFixed(2));
    setTakeProfit(pendingTrade.takeProfit.toFixed(2));
    /* eslint-enable react-hooks/set-state-in-effect */
    // Auto-execute after a brief delay so the user sees the fill
    const t = setTimeout(() => {
      executeTrade(
        pendingTrade.side,
        pendingTrade.lotSize,
        pendingTrade.leverage,
        pendingTrade.stopLoss,
        pendingTrade.takeProfit,
        `بإجماع الوكلاء (${pendingTrade.source})`
      );
      setPendingTrade(null);
    }, 800);
    return () => clearTimeout(t);
  }, [pendingTrade]);

  const requiredMargin = positionValue / lev;
  const pipValue = lot * 1;
  const potentialProfit = takeProfit
    ? (parseFloat(takeProfit) - currentPrice) * (side === "BUY" ? 1 : -1) * lot * CONTRACT_SIZE
    : 0;
  const potentialLoss = stopLoss
    ? (parseFloat(stopLoss) - currentPrice) * (side === "BUY" ? 1 : -1) * lot * CONTRACT_SIZE
    : 0;

  const canExecute = requiredMargin <= ACCOUNT_BALANCE && lot > 0;

  function execute() {
    if (!canExecute || executing) return;
    //  Play sound IMMEDIATELY (before setTimeout) — must be in user gesture context
    if (side === "BUY") playTradeBuy();
    else playTradeSell();
    setExecuting(true);
    setFlash(side === "BUY" ? "buy" : "sell");
    setTimeout(() => setFlash(null), 600);
    setTimeout(() => {
      openPosition({
        side,
        symbol: "XAUUSD",
        lotSize: lot,
        leverage: lev,
        entryPrice: currentPrice,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        margin: requiredMargin,
        currentPrice,
      });
      addNotification({
        type: "trade",
        title: `تم فتح صفقة ${side === "BUY" ? "شراء" : "بيع"}`,
        message: `${lot.toFixed(2)} لوت @ $${currentPrice.toFixed(2)} • رافعة 1:${lev}`,
      });
      setNotificationsOpen(true);
      setExecuting(false);
    }, 400);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Order entry card — takes 3/5 width on large screens */}
      <div
        className={`lg:col-span-3 glass-strong rounded-3xl p-5 relative overflow-hidden ${
          flash === "buy" ? "neon-bull" : flash === "sell" ? "neon-bear" : ""
        }`}
      >
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                flash === "buy"
                  ? "radial-gradient(400px 200px at 50% 50%, rgba(34,211,154,0.25), transparent)"
                  : "radial-gradient(400px 200px at 50% 50%, rgba(255,77,106,0.25), transparent)",
            }}
          />
        )}

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Wallet className="w-4 h-4 text-gold" />
              لوحة التداول
            </div>
            <div className="text-[11px] text-muted-foreground">
              الرصيد:{" "}
              <span className="text-gold font-bold tabular-nums ltr-nums">
                ${ACCOUNT_BALANCE.toLocaleString("en-US")}
              </span>
            </div>
          </div>

          {/* Order type selector — 2026 Advanced */}
          <div className="mb-3">
            <Label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wider font-mono">
              نوع الأمر
            </Label>
            <div className="grid grid-cols-5 gap-1">
              {([
                { id: "market", label: "سوقي" },
                { id: "limit", label: "محدد" },
                { id: "stop", label: "إيقاف" },
                { id: "oco", label: "OCO" },
                { id: "trailing", label: "متتبع" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOrderType(t.id)}
                  className={`py-1.5 px-1 rounded text-[10px] font-bold transition border ${
                    orderType === t.id
                      ? "border-gold/40 bg-gold/10 text-gold"
                      : "border-border bg-secondary text-muted-foreground hover:border-border-strong"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Order type specific fields */}
          {(orderType === "limit" || orderType === "stop") && (
            <div className="mb-3">
              <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-mono">
                {orderType === "limit" ? "سعر الأمر المحدد" : "سعر إيقاف التفعيل"}
              </Label>
              <Input
                type="number"
                placeholder={currentPrice.toFixed(2)}
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                step="0.01"
                className="tabular-nums ltr-nums bg-white/[0.04] border-white/10 h-9"
              />
            </div>
          )}

          {orderType === "trailing" && (
            <div className="mb-3">
              <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-mono">
                مسافة التتبع (Trailing)
              </Label>
              <Input
                type="number"
                value={trailingDistance}
                onChange={(e) => setTrailingDistance(e.target.value)}
                step="0.01"
                className="tabular-nums ltr-nums bg-white/[0.04] border-white/10 h-9"
              />
              <div className="text-[9px] text-muted-foreground mt-1">
                 يتحرك وقف الخسارة مع السعر بمقدار ${trailingDistance} للحفاظ على المسافة
              </div>
            </div>
          )}

          {orderType === "oco" && (
            <div className="mb-3 px-2 py-1.5 rounded border border-info/30 bg-info/10 text-[10px] text-info">
               OCO: ضع وقف خسارة وأخذ رح — تنفيذ أحدهما يلغي الآخر تلقائياً
            </div>
          )}

          {/* Buy / Sell side toggle */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setSide("BUY")}
              className={`py-2.5 rounded-2xl font-bold transition-all relative overflow-hidden flex items-center justify-center gap-2 ${
                side === "BUY"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 neon-bull"
                  : "bg-white/[0.03] text-muted-foreground border border-white/5 hover:border-emerald-500/30"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">شراء</span>
              <span className="text-[10px] opacity-70 tabular-nums ltr-nums">
                @ {(currentPrice * 1.0001).toFixed(2)}
              </span>
            </button>
            <button
              onClick={() => setSide("SELL")}
              className={`py-2.5 rounded-2xl font-bold transition-all relative overflow-hidden flex items-center justify-center gap-2 ${
                side === "SELL"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 neon-bear"
                  : "bg-white/[0.03] text-muted-foreground border border-white/5 hover:border-rose-500/30"
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">بيع</span>
              <span className="text-[10px] opacity-70 tabular-nums ltr-nums">
                @ {(currentPrice * 0.9999).toFixed(2)}
              </span>
            </button>
          </div>

          {/* Order entry fields — 4 columns horizontal */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">
                حجم العقد
              </Label>
              <Input
                type="number"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                min="0.01"
                step="0.01"
                className="tabular-nums ltr-nums bg-white/[0.04] border-white/10 h-9"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">
                الرافعة
              </Label>
              <Select value={leverage} onValueChange={setLeverage}>
                <SelectTrigger className="bg-white/[0.04] border-white/10 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1:1</SelectItem>
                  <SelectItem value="5">1:5</SelectItem>
                  <SelectItem value="10">1:10</SelectItem>
                  <SelectItem value="20">1:20</SelectItem>
                  <SelectItem value="50">1:50</SelectItem>
                  <SelectItem value="100">1:100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> وقف الخسارة
              </Label>
              <Input
                type="number"
                placeholder={currentPrice.toFixed(2)}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="tabular-nums ltr-nums bg-white/[0.04] border-white/10 h-9"
                step="0.01"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <Target className="w-3 h-3" /> أخذ الربح
              </Label>
              <Input
                type="number"
                placeholder={currentPrice.toFixed(2)}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="tabular-nums ltr-nums bg-white/[0.04] border-white/10 h-9"
                step="0.01"
              />
            </div>
          </div>

          {/* Calculator row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
            <Stat
              label="قيمة العقد"
              value={`$${positionValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
            />
            <Stat
              label="الهامش"
              value={`$${requiredMargin.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
              color="#ffc933"
            />
            <Stat label="قيمة النقطة" value={`$${pipValue.toFixed(2)}`} />
            <Stat
              label="المخاطرة/الربح"
              value={
                stopLoss && takeProfit
                  ? `1:${(Math.abs(potentialProfit) / Math.abs(potentialLoss || 1)).toFixed(1)}`
                  : "—"
              }
              color="#5b8cff"
            />
          </div>

          {/* Potential P/L preview */}
          {(stopLoss || takeProfit) && (
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> خسارة محتملة
                </div>
                <div className="font-bold tabular-nums ltr-nums text-rose-400">
                  {stopLoss ? `${potentialLoss.toFixed(2)}$` : "—"}
                </div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" /> ربح محتمل
                </div>
                <div className="font-bold tabular-nums ltr-nums text-emerald-400">
                  {takeProfit ? `${potentialProfit.toFixed(2)}$` : "—"}
                </div>
              </div>
            </div>
          )}

          {/* Execute button */}
          <Button
            onClick={execute}
            disabled={!canExecute || executing}
            className={`w-full py-3 font-bold transition-all ${
              side === "BUY"
                ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                : "bg-rose-500 hover:bg-rose-400 text-white"
            }`}
          >
            {executing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                جاري التنفيذ...
              </>
            ) : (
              <>
                {side === "BUY" ? (
                  <TrendingUp className="w-4 h-4 ml-2" />
                ) : (
                  <TrendingDown className="w-4 h-4 ml-2" />
                )}
                {side === "BUY" ? "شراء" : "بيع"} {lot.toFixed(2)} لوت @ {currentPrice.toFixed(2)}
              </>
            )}
          </Button>

          {!canExecute && (
            <div className="mt-2 text-[10px] text-rose-400 text-center">
              الهامش المطلوب أكبر من رصيدك المتاح
            </div>
          )}
        </div>
      </div>

      {/* Open Positions card — takes 2/5 width on large screens */}
      <div className="lg:col-span-2">
        <OpenPositions currentPrice={currentPrice} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-2.5 py-2 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
        <Calculator className="w-2.5 h-2.5" /> {label}
      </div>
      <div className="font-bold tabular-nums ltr-nums" style={{ color: color ?? "#e6e9f2" }}>
        {value}
      </div>
    </div>
  );
}

function OpenPositions({ currentPrice }: { currentPrice: number }) {
  const { positions, closePosition, addNotification, setNotificationsOpen } = useTradingStore();
  const open = positions.filter((p) => p.status === "OPEN");
  const closed = positions.filter((p) => p.status === "CLOSED").slice(0, 4);

  function handleClose(p: any) {
    //  Play close sound IMMEDIATELY (user gesture context)
    playTradeClosed();
    closePosition(p.id, currentPrice);
    const direction = p.side === "BUY" ? 1 : -1;
    const pnl = (currentPrice - p.entryPrice) * direction * p.lotSize * 100;
    addNotification({
      type: "trade",
      title: `تم إغلاق صفقة ${p.side === "BUY" ? "شراء" : "بيع"}`,
      message: `@ $${p.entryPrice.toFixed(2)} → $${currentPrice.toFixed(2)} • ${pnl >= 0 ? "ربح" : "خسارة"} ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
    });
    //  Auto-open notifications panel
    setNotificationsOpen(true);
  }

  const totalPnL = open.reduce((s, p) => {
    const tempP = { ...p, currentPrice };
    return s + computePositionPnL(tempP).pnl;
  }, 0);

  return (
    <div className="glass-strong rounded-3xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gold" />
          الصفقات المفتوحة
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">إجمالي P/L</div>
          <div
            className="text-sm font-bold tabular-nums ltr-nums"
            style={{ color: totalPnL >= 0 ? "#22d39a" : "#ff4d6a" }}
          >
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 max-h-[320px] overflow-y-auto scroll-styled pr-1">
        <AnimatePresence>
          {open.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-xs text-muted-foreground"
            >
              لا توجد صفقات مفتوحة
              <div className="text-[10px] mt-1 opacity-70">
                استخدم لوحة التداول لفتح صفقة جديدة
              </div>
            </motion.div>
          )}
          {open.map((p) => {
            const tempP = { ...p, currentPrice };
            const { pnl, pnlPct, pips } = computePositionPnL(tempP);
            const isProfit = pnl >= 0;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="rounded-xl p-2.5 bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        p.side === "BUY"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {p.side === "BUY" ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">
                        {p.side === "BUY" ? "شراء" : "بيع"} {p.lotSize.toFixed(2)} لوت
                      </div>
                      <div className="text-[10px] text-muted-foreground tabular-nums ltr-nums">
                        @ {p.entryPrice.toFixed(2)} → {currentPrice.toFixed(2)} • 1:{p.leverage}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div
                      className="text-xs font-bold tabular-nums ltr-nums"
                      style={{ color: isProfit ? "#22d39a" : "#ff4d6a" }}
                    >
                      {isProfit ? "+" : ""}${pnl.toFixed(2)}
                    </div>
                    <div
                      className="text-[10px] tabular-nums ltr-nums"
                      style={{ color: isProfit ? "#22d39a" : "#ff4d6a" }}
                    >
                      {isProfit ? "+" : ""}
                      {pnlPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {p.stopLoss && (
                      <span className="text-rose-400 tabular-nums ltr-nums">
                        SL: {p.stopLoss.toFixed(2)}
                      </span>
                    )}
                    {p.takeProfit && (
                      <span className="text-emerald-400 tabular-nums ltr-nums">
                        TP: {p.takeProfit.toFixed(2)}
                      </span>
                    )}
                    {!p.stopLoss && !p.takeProfit && <span>بدال SL/TP</span>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 bg-white/[0.04] border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                    onClick={() => handleClose(p)}
                  >
                    <X className="w-3 h-3 ml-1" /> إغلاق
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {closed.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
            <History className="w-3 h-3" /> آخر الصفقات المغلقة
          </div>
          <div className="space-y-1">
            {closed.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-white/[0.02]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                      p.side === "BUY"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {p.side === "BUY" ? "شراء" : "بيع"}
                  </span>
                  <span className="text-muted-foreground text-[10px] tabular-nums ltr-nums">
                    {p.entryPrice.toFixed(2)} → {p.closePrice?.toFixed(2)}
                  </span>
                </div>
                <span
                  className="font-bold tabular-nums ltr-nums"
                  style={{ color: (p.pnl ?? 0) >= 0 ? "#22d39a" : "#ff4d6a" }}
                >
                  {(p.pnl ?? 0) >= 0 ? "+" : ""}${(p.pnl ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
