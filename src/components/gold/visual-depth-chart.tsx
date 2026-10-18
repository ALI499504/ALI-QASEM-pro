"use client";

import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface Level {
  price: number;
  size: number;
}

interface Props {
  midPrice: number;
}

/**
 * VisualDepthChart — replaces the table-style OrderBook with a visual depth chart
 * showing cumulative bid/ask sizes (similar to Binance/Ftx depth chart).
 */
export default function VisualDepthChart({ midPrice }: Props) {
  const [bids, setBids] = useState<Level[]>([]);
  const [asks, setAsks] = useState<Level[]>([]);
  const [source, setSource] = useState("");
  const [view, setView] = useState<"chart" | "table">("chart");

  useEffect(() => {
    let active = true;
    async function fetchDepth() {
      try {
        const res = await fetch("/api/gold/orderbook", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (Array.isArray(data.bids) && Array.isArray(data.asks)) {
          setBids(data.bids.slice(0, 12));
          setAsks(data.asks.slice(0, 12));
          setSource(data.source ?? "");
        }
      } catch {
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

  // Build cumulative depths for the visual chart
  const cumulativeBids: { price: number; size: number; total: number }[] = [];
  let bidTotal = 0;
  for (const b of bids) {
    bidTotal += b.size;
    cumulativeBids.push({ price: b.price, size: b.size, total: bidTotal });
  }
  const cumulativeAsks: { price: number; size: number; total: number }[] = [];
  let askTotal = 0;
  for (const a of asks) {
    askTotal += a.size;
    cumulativeAsks.push({ price: a.price, size: a.size, total: askTotal });
  }

  const maxTotal = Math.max(bidTotal, askTotal, 1);
  const allPrices = [...bids.map((b) => b.price), ...asks.map((a) => a.price)];
  const minPrice = allPrices.length ? Math.min(...allPrices) : midPrice * 0.999;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : midPrice * 1.001;
  const priceRange = Math.max(maxPrice - minPrice, 0.01);

  // SVG path for depth curve (bids going up from left, asks going up from right)
  const chartWidth = 100;
  const chartHeight = 100;

  // Bids area path (left side)
  const bidPath = cumulativeBids
    .map((b, i) => {
      const x = (i / Math.max(cumulativeBids.length - 1, 1)) * (chartWidth / 2);
      const y = chartHeight - (b.total / maxTotal) * chartHeight;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  // Asks area path (right side)
  const askPath = cumulativeAsks
    .map((a, i) => {
      const x = chartWidth / 2 + (i / Math.max(cumulativeAsks.length - 1, 1)) * (chartWidth / 2);
      const y = chartHeight - (a.total / maxTotal) * chartHeight;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const bidArea = `${bidPath} L ${(chartWidth / 2).toFixed(2)} ${chartHeight} L 0 ${chartHeight} Z`;
  const askArea = `${askPath} L ${chartWidth} ${chartHeight} L ${(chartWidth / 2).toFixed(2)} ${chartHeight} Z`;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gold" />
          دفتر الطلبات (Depth)
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          {source && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {source === "XAUUSD-spot" ? "Binance " : source}
            </span>
          )}
          <button
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            className="px-2 py-0.5 rounded bg-secondary hover:bg-gold/10 text-muted-foreground"
          >
            {view === "chart" ? "جدول" : "رسم"}
          </button>
        </div>
      </div>

      {view === "chart" ? (
        <div>
          {/* SVG depth chart */}
          <div className="relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 18}`} className="w-full" style={{ height: 160 }}>
              {/* Background grid */}
              <line x1="50" y1="0" x2="50" y2={chartHeight} stroke="rgba(255,201,51,0.2)" strokeWidth="0.2" strokeDasharray="0.5" />
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="rgba(255,201,51,0.05)" strokeWidth="0.2" />

              {/* Bids area (left, green) */}
              {bids.length > 0 && (
                <>
                  <path d={bidArea} fill="rgba(34,211,154,0.25)" stroke="#22d39a" strokeWidth="0.4" />
                  <path d={askArea} fill="rgba(255,77,106,0.25)" stroke="#ff4d6a" strokeWidth="0.4" />
                </>
              )}

              {/* Mid price line */}
              <line
                x1="50"
                y1="0"
                x2="50"
                y2={chartHeight}
                stroke="#d4a574"
                strokeWidth="0.4"
                strokeDasharray="1"
              />
              <text x="50.5" y="6" fill="#d4a574" fontSize="3" textAnchor="start">
                {midPrice.toFixed(2)}
              </text>
            </svg>
          </div>

          {/* Stats row */}
          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-center">
            <div className="rounded bg-emerald-500/[0.04] border border-emerald-500/20 p-1.5">
              <div className="text-emerald-400 font-bold tabular-nums ltr-nums">
                {bidTotal.toFixed(4)}
              </div>
              <div className="text-muted-foreground">إجمالي الطلبات</div>
            </div>
            <div className="rounded bg-amber-500/[0.04] border border-amber-500/20 p-1.5">
              <div className="text-gold font-bold tabular-nums ltr-nums">{midPrice.toFixed(2)}</div>
              <div className="text-muted-foreground">السعر الحالي</div>
            </div>
            <div className="rounded bg-rose-500/[0.04] border border-rose-500/20 p-1.5">
              <div className="text-rose-400 font-bold tabular-nums ltr-nums">
                {askTotal.toFixed(4)}
              </div>
              <div className="text-muted-foreground">إجمالي العروض</div>
            </div>
          </div>
        </div>
      ) : (
        /* Table view */
        <div className="grid grid-cols-2 gap-x-3 text-[11px]">
          <div>
            <div className="text-[10px] text-emerald-400 mb-1">عروض الشراء</div>
            <div className="space-y-0.5">
              {bids.slice(0, 6).map((b, i) => (
                <div
                  key={i}
                  className="relative flex justify-between items-center py-0.5 px-1 rounded"
                >
                  <div
                    className="absolute right-0 top-0 h-full bg-emerald-500/15 rounded"
                    style={{ width: `${(b.size / maxTotal) * 100}%` }}
                  />
                  <span className="relative text-emerald-400 font-semibold tabular-nums ltr-nums">
                    {b.price.toFixed(2)}
                  </span>
                  <span className="relative tabular-nums ltr-nums text-muted-foreground">
                    {b.size.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-rose-400 mb-1">عروض البيع</div>
            <div className="space-y-0.5">
              {asks.slice(0, 6).map((a, i) => (
                <div
                  key={i}
                  className="relative flex justify-between items-center py-0.5 px-1 rounded"
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-rose-500/15 rounded"
                    style={{ width: `${(a.size / maxTotal) * 100}%` }}
                  />
                  <span className="relative text-rose-400 font-semibold tabular-nums ltr-nums">
                    {a.price.toFixed(2)}
                  </span>
                  <span className="relative tabular-nums ltr-nums text-muted-foreground">
                    {a.size.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
