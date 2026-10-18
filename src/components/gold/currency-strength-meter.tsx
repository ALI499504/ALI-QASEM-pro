"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins } from "lucide-react";

interface CurrencyStrength {
  currency: string;
  name: string;
  strength: number; // -100..100
  rank: number;
}

interface StrengthMap {
  [currency: string]: { score: number; changes: number[] };
}

const CURRENCIES = [
  { code: "USD", name: "دولار أمريكي" },
  { code: "EUR", name: "يورو" },
  { code: "GBP", name: "جنيه إسترليني" },
  { code: "JPY", name: "ين ياباني" },
  { code: "CHF", name: "فرنك سويسري" },
  { code: "AUD", name: "دولار أسترالي" },
  { code: "CAD", name: "دولار كندي" },
  { code: "NZD", name: "دولار نيوزيلندي" },
];

// Major Binance pairs that include these currencies (as USD-quoted)
const PAIRS = [
  { symbol: "EURUSDT", base: "EUR", quote: "USD" },
  { symbol: "GBPUSDT", base: "GBP", quote: "USD" },
  { symbol: "JPYUSDT", base: "JPY", quote: "USD" }, // synthetic — use YEN
  { symbol: "CHFUSDT", base: "CHF", quote: "USD" }, // synthetic
  { symbol: "AUDUSDT", base: "AUD", quote: "USD" },
  { symbol: "CADUSDT", base: "CAD", quote: "USD" }, // not on binance — fallback
  { symbol: "NZDUSDT", base: "NZD", quote: "USD" },
  { symbol: "BTCUSDT", base: "BTC", quote: "USD" }, // as a reference (not currency)
  { symbol: "XAUUSD", base: "XAU", quote: "USD" }, // gold spot reference
];

async function fetchBinanceChange(symbol: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Number(j.priceChangePercent);
  } catch {
    return null;
  }
}

export default function CurrencyStrengthMeter() {
  const [strengths, setStrengths] = useState<CurrencyStrength[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function compute() {
      const map: StrengthMap = {};
      CURRENCIES.forEach((c) => (map[c.code] = { score: 0, changes: [] }));

      const promises = PAIRS.map(async (p) => {
        const change = await fetchBinanceChange(p.symbol);
        if (change === null) return;
        // Base currency gains strength when pair is up (vs quote)
        // Quote currency loses strength when pair is up
        if (map[p.base]) {
          map[p.base].score += change;
          map[p.base].changes.push(change);
        }
        if (map[p.quote]) {
          map[p.quote].score -= change;
          map[p.quote].changes.push(change);
        }
      });

      await Promise.all(promises);
      if (!active) return;

      const result: CurrencyStrength[] = CURRENCIES.map((c) => {
        const m = map[c.code];
        const avg = m.changes.length > 0 ? m.score / m.changes.length : 0;
        // Normalize to -100..100 range (rough: 2% change = 100)
        const strength = Math.max(-100, Math.min(100, avg * 50));
        return {
          currency: c.code,
          name: c.name,
          strength: Math.round(strength * 10) / 10,
          rank: 0,
        };
      });

      // Sort by strength descending and assign rank
      const sorted = [...result].sort((a, b) => b.strength - a.strength);
      sorted.forEach((s, i) => (s.rank = i + 1));

      setStrengths(sorted);
      setLoading(false);
    }

    compute();
    const t = setInterval(compute, 30_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  function getColor(s: number): string {
    if (s > 50) return "#22d39a";
    if (s > 20) return "#86efac";
    if (s > -20) return "#8a96a8";
    if (s > -50) return "#fca5a5";
    return "#ff4d6a";
  }

  function getLabel(s: number): string {
    if (s > 50) return "قوي جداً";
    if (s > 20) return "قوي";
    if (s > -20) return "محايد";
    if (s > -50) return "ضعيف";
    return "ضعيف جداً";
  }

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Coins className="w-4 h-4 section-heading-icon" />
          قوة العملات
        </h2>
        <span className="section-subtitle">Currency Strength Meter — تحديث 30 ثانية</span>
      </div>

      <div className="mb-2 px-2 py-1 rounded text-[9px] text-amber-400/80 bg-amber-500/[0.04] border border-amber-500/20 flex items-center gap-1.5">
        <span></span>
        <span>مُحسوبة من 8 أزواج Binance حقيقية (24h % تغير)</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {CURRENCIES.map((c) => (
            <div key={c.code} className="h-20 rounded-lg bg-secondary/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {strengths.map((c, i) => {
            const color = getColor(c.strength);
            const isPositive = c.strength >= 0;
            return (
              <motion.div
                key={c.currency}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg p-2.5 border"
                style={{
                  background: `${color}10`,
                  borderColor: `${color}30`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold" style={{ color }}>
                    {c.currency}
                  </div>
                  <div className="text-[9px] text-muted-foreground">#{c.rank}</div>
                </div>
                <div className="text-[10px] text-muted-foreground mb-1.5 truncate">
                  {c.name}
                </div>
                {/* Strength bar */}
                <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden mb-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.abs(c.strength)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      background: color,
                      left: isPositive ? "50%" : `${50 - Math.abs(c.strength) / 2}%`,
                    }}
                  />
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{getLabel(c.strength)}</span>
                  <span
                    className="font-bold tabular-nums ltr-nums"
                    style={{ color: isPositive ? "#22d39a" : "#ff4d6a" }}
                  >
                    {isPositive ? "+" : ""}
                    {c.strength.toFixed(1)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
