"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Zap, CheckCircle2 } from "lucide-react";

interface Trade {
  id: number;
  price: number;
  qty: number;
  side: "BUY" | "SELL";
  time: number;
}

interface Props {
  currentPrice: number;
}

export default function TradeFlow({ currentPrice: _currentPrice }: Props) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [source, setSource] = useState<string>("");
  const seenIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let active = true;

    async function fetchTrades() {
      try {
        const res = await fetch("/api/gold/trades", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !Array.isArray(data.trades)) return;

        const newTrades: Trade[] = [];
        for (const t of data.trades) {
          const id = Number(t.id);
          if (seenIdsRef.current.has(id)) continue;
          newTrades.push({
            id,
            price: Number(t.price),
            qty: Number(t.qty),
            side: t.side === "BUY" ? "BUY" : "SELL",
            time: Number(t.time),
          });
          seenIdsRef.current.add(id);
        }

        if (newTrades.length > 0) {
          setTrades((prev) => [...newTrades, ...prev].slice(0, 14));
        } else {
          // Just update with the latest list (in case first fetch)
          setTrades(
            data.trades.slice(0, 14).map((t: any) => ({
              id: Number(t.id),
              price: Number(t.price),
              qty: Number(t.qty),
              side: t.side === "BUY" ? "BUY" : "SELL",
              time: Number(t.time),
            }))
          );
        }

        if (data.source) setSource(data.source);
      } catch (e) {
        // ignore
      }
    }

    fetchTrades();
    const t = setInterval(fetchTrades, 2500);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  function formatTime(ts: number): string {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold" />
          تدفق الصفقات
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {source && (
            <span className="flex items-center gap-1 text-emerald-400" title={`مصدر حقيقي: ${source}`}>
              <CheckCircle2 className="w-2.5 h-2.5" />
              {source === "XAUUSD-spot" ? "Binance " : source}
            </span>
          )}
          <span>Time & Sales</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground mb-1 px-1">
        <div className="col-span-4">الوقت</div>
        <div className="col-span-4 text-center">السعر</div>
        <div className="col-span-4 text-left">الحجم</div>
      </div>

      <div className="space-y-0.5 max-h-64 overflow-y-auto scroll-styled pr-1">
        <AnimatePresence initial={false}>
          {trades.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-muted-foreground">
              جارٍ جلب آخر الصفقات من Binance...
            </div>
          ) : (
            trades.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-12 gap-2 py-1 px-1 rounded text-[11px] hover:bg-white/[0.02]"
              >
                <div
                  className={`col-span-4 font-mono tabular-nums ltr-nums ${
                    t.side === "BUY" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                    style={{
                      background: t.side === "BUY" ? "#22d39a" : "#ff4d6a",
                    }}
                  />
                  {formatTime(t.time)}
                </div>
                <div
                  className="col-span-4 text-center tabular-nums ltr-nums font-semibold"
                  style={{ color: t.side === "BUY" ? "#22d39a" : "#ff4d6a" }}
                >
                  {t.price.toFixed(2)}
                </div>
                <div className="col-span-4 text-left tabular-nums ltr-nums text-muted-foreground">
                  {t.qty.toFixed(4)}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
