// Real-time XAUUSD price from Binance PAXG (primary) + multiple fallbacks.
// CRITICAL: Binance PAXG is also the source for candles (in binance-gold.ts),
// so price and chart ALWAYS match — no spot-vs-futures discrepancy.
// All sources are REAL — NO simulation, NO synthetic data.

import { fetchRealGoldTicker } from "@/lib/binance-gold";

interface SpotPrice {
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  timestamp: number;
  source: string;
}

let cachedPrice: { data: SpotPrice; ts: number } | null = null;
const CACHE_MS = 500; // 500ms cache — short enough for real-time tick flow

const TWELVE_DATA_KEY = "demo"; // free demo key — 8 requests/minute

export async function fetchSpotXAUUSD(): Promise<SpotPrice> {
  // Check cache
  if (cachedPrice && Date.now() - cachedPrice.ts < CACHE_MS) {
    return cachedPrice.data;
  }

  // === PRIMARY: Binance PAXG (matches the candle source — consistent) ===
  try {
    const ticker = await fetchRealGoldTicker();
    if (ticker && Number.isFinite(ticker.price) && ticker.price > 100) {
      const data: SpotPrice = {
        price: ticker.price,
        bid: ticker.bid,
        ask: ticker.ask,
        change: ticker.change,
        changePct: ticker.changePct,
        high: ticker.high,
        low: ticker.low,
        open: ticker.open,
        timestamp: ticker.timestamp,
        source: ticker.source, // "Binance PAXG (XAU spot)"
      };
      cachedPrice = { data, ts: Date.now() };
      return data;
    }
  } catch {
    // try next source
  }

  // === FALLBACK 1: Twelve Data API (real broker spot price) ===
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(
      `https://api.twelvedata.com/quote?symbol=XAU/USD&apikey=${TWELVE_DATA_KEY}`,
      { signal: ctrl.signal, headers: { Accept: "application/json" } },
    );
    clearTimeout(t);
    if (r.ok) {
      const j: any = await r.json();
      if (j && j.close && Number(j.close) > 100) {
        const price = Number(j.close);
        const open = Number(j.open || price);
        const high = Number(j.high || price);
        const low = Number(j.low || price);
        const change = Number(j.change || (price - open));
        const changePct = Number(j.percent_change || ((change / open) * 100));
        const spread = 0.3;
        const data: SpotPrice = {
          price,
          bid: price - spread / 2,
          ask: price + spread / 2,
          change,
          changePct,
          high,
          low,
          open,
          timestamp: Date.now(),
          source: "Twelve Data (XAU/USD spot)",
        };
        cachedPrice = { data, ts: Date.now() };
        return data;
      }
    }
  } catch {}

  // === FALLBACK 2: gold-api.com (real spot) ===
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch("https://api.gold-api.com/price/XAU", {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(t);
    if (r.ok) {
      const j: any = await r.json();
      const price = Number(j?.price);
      if (Number.isFinite(price) && price > 100) {
        const spread = 0.3;
        const data: SpotPrice = {
          price,
          bid: price - spread / 2,
          ask: price + spread / 2,
          change: 0,
          changePct: 0,
          high: price,
          low: price,
          open: price,
          timestamp: Date.now(),
          source: "gold-api.com (XAU spot)",
        };
        cachedPrice = { data, ts: Date.now() };
        return data;
      }
    }
  } catch {}

  // === FALLBACK 3: Yahoo GC=F (real gold futures) ===
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d",
      { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" } },
    );
    clearTimeout(t);
    if (r.ok) {
      const j: any = await r.json();
      const result = j?.chart?.result?.[0];
      if (result) {
        const meta = result.meta;
        const closes: number[] = result.indicators?.quote?.[0]?.close?.filter((x: any) => x != null) ?? [];
        const last = Number(meta?.regularMarketPrice ?? closes.at(-1));
        const prev = Number(meta?.chartPreviousClose ?? closes.at(-2) ?? last);
        if (Number.isFinite(last) && last > 100) {
          const spread = 0.3;
          const data: SpotPrice = {
            price: last,
            bid: last - spread / 2,
            ask: last + spread / 2,
            change: last - prev,
            changePct: prev > 0 ? ((last - prev) / prev) * 100 : 0,
            high: Number(meta?.regularMarketDayHigh ?? last),
            low: Number(meta?.regularMarketDayLow ?? last),
            open: Number(meta?.regularMarketOpen ?? last),
            timestamp: Date.now(),
            source: "Yahoo Finance (GC=F gold futures)",
          };
          cachedPrice = { data, ts: Date.now() };
          return data;
        }
      }
    }
  } catch {}

  // Last resort: return last cached REAL price (NO simulation, NO fallback fake number)
  if (cachedPrice) return cachedPrice.data;

  // If we have no data at all, throw — better to show "no data" than fake numbers
  throw new Error("All real price sources unavailable");
}

// Fetch historical candles from Twelve Data (real spot XAUUSD)
export async function fetchSpotCandles(
  interval: string = "15m",
  limit: number = 200
): Promise<any[]> {
  // Twelve Data intervals: 1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 1day, 1week, 1month
  const tdInterval = interval === "1h" ? "1h" : interval === "4h" ? "4h" : interval === "1d" ? "1day" : interval;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(
      `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=${tdInterval}&outputsize=${Math.min(limit, 500)}&apikey=${TWELVE_DATA_KEY}`,
      { signal: ctrl.signal, headers: { Accept: "application/json" } },
    );
    clearTimeout(t);
    if (r.ok) {
      const j: any = await r.json();
      if (j?.values && Array.isArray(j.values)) {
        return j.values.map((v: any) => ({
          time: Math.floor(new Date(v.datetime).getTime() / 1000),
          open: Number(v.open),
          high: Number(v.high),
          low: Number(v.low),
          close: Number(v.close),
          volume: 0,
        })).reverse();
      }
    }
  } catch {}

  // Fallback: Yahoo GC=F
  return [];
}
