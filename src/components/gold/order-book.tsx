"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { BookOpen, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";

interface Level {
  price: number;
  size: number;
}

interface Props {
  midPrice: number;
}

export default function OrderBook({ midPrice }: Props) {
  const [bids, setBids] = useState<Level[]>([]);
  const [asks, setAsks] = useState<Level[]>([]);
  const [spread, setSpread] = useState(0);
  const [source, setSource] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const midRef = useRef<number>(midPrice);
  midRef.current = midPrice;

  useEffect(() => {
    let active = true;

    async function fetchDepth() {
      try {
        const res = await fetch("/api/gold/orderbook", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (Array.isArray(data.bids) && Array.isArray(data.asks)) {
          setBids(data.bids.slice(0, 8));
          setAsks(data.asks.slice(0, 8));
          setSpread(data.spread ?? 0);
          setSource(data.source ?? "");
          setLastUpdate(new Date());
        }
      } catch (e) {
        // ignore
      }
    }

    fetchDepth();
    const t = setInterval(fetchDepth, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const maxSize = Math.max(
    ...bids.map((b) => b.size),
    ...asks.map((a) => a.size),
    1
  );

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold" />
          دفتر الطلبات
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {source && (
            <span className="flex items-center gap-1 text-emerald-400" title={`مصدر حقيقي: ${source}`}>
              <CheckCircle2 className="w-2.5 h-2.5" />
              {source === "XAUUSD-spot" ? "Binance " : source}
            </span>
          )}
          <span>
            فروق: <span className="text-gold tabular-nums ltr-nums">{spread.toFixed(2)}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 text-[11px]">
        {/* Bids */}
        <div>
          <div className="text-[10px] text-emerald-400 mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> عروض الشراء
          </div>
          <div className="space-y-0.5">
            {bids.length === 0 ? (
              <div className="text-[10px] text-muted-foreground text-center py-2">جارٍ تحميل البيانات...</div>
            ) : (
              bids.map((b, i) => (
                <motion.div
                  key={`bid-${i}-${b.price}`}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative flex justify-between items-center py-0.5 px-1 rounded"
                >
                  <div
                    className="absolute right-0 top-0 h-full bg-emerald-500/15 rounded"
                    style={{ width: `${(b.size / maxSize) * 100}%` }}
                  />
                  <span className="relative tabular-nums ltr-nums text-emerald-400 font-semibold">
                    {b.price.toFixed(2)}
                  </span>
                  <span className="relative tabular-nums ltr-nums text-muted-foreground">
                    {b.size.toFixed(4)}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Asks */}
        <div>
          <div className="text-[10px] text-rose-400 mb-1 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> عروض البيع
          </div>
          <div className="space-y-0.5">
            {asks.length === 0 ? (
              <div className="text-[10px] text-muted-foreground text-center py-2">جارٍ تحميل البيانات...</div>
            ) : (
              asks.map((a, i) => (
                <motion.div
                  key={`ask-${i}-${a.price}`}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative flex justify-between items-center py-0.5 px-1 rounded"
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-rose-500/15 rounded"
                    style={{ width: `${(a.size / maxSize) * 100}%` }}
                  />
                  <span className="relative tabular-nums ltr-nums text-rose-400 font-semibold">
                    {a.price.toFixed(2)}
                  </span>
                  <span className="relative tabular-nums ltr-nums text-muted-foreground">
                    {a.size.toFixed(4)}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">سعر السوق</span>
        <span className="text-gold font-bold tabular-nums ltr-nums glow-gold">
          {midPrice.toFixed(2)}
        </span>
      </div>
      {lastUpdate && (
        <div className="mt-1 text-[9px] text-muted-foreground/60 text-center">
          آخر تحديث: {lastUpdate.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      )}
    </div>
  );
}
