import { NextResponse } from "next/server";
import { fetchRealCandles, type KlineInterval } from "@/lib/binance-gold";
import { fetchGoldPrice as getGoldPrice } from "@/lib/gold-price";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Fetch ~3 months of real XAUUSD candles from Yahoo Finance (GC=F).
// Yahoo returns up to ~750 1h candles for range=3mo, so one request is enough.

async function fetch3MonthsCandles(interval: KlineInterval = "1h"): Promise<any[]> {
  try {
    const yInterval = interval === "4h" ? "1h" : interval === "1d" ? "1d" : interval;
    const yRange = interval === "1d" ? "1y" : "3mo";
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=${yInterval}&range=${yRange}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "M.ROBOT/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) {
      // fallback to fetchRealCandles (which also handles synthetic)
      return await fetchRealCandles(interval, 750);
    }
    const j: any = await res.json();
    const result = j?.chart?.result?.[0];
    if (!result) return await fetchRealCandles(interval, 750);

    const ts: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const o: number[] = quote.open ?? [];
    const h: number[] = quote.high ?? [];
    const l: number[] = quote.low ?? [];
    const c: number[] = quote.close ?? [];
    const v: number[] = quote.volume ?? [];

    const candles: any[] = [];
    for (let i = 0; i < ts.length; i++) {
      if (c[i] == null || !Number.isFinite(c[i])) continue;
      candles.push({
        time: Number(ts[i]),
        open: Number(o[i] ?? c[i]),
        high: Number(h[i] ?? c[i]),
        low: Number(l[i] ?? c[i]),
        close: Number(c[i]),
        volume: Number(v[i] ?? 0),
      });
    }

    // Aggregate 1h → 4h if needed
    if (interval === "4h" && candles.length >= 4) {
      const aggregated: any[] = [];
      for (let i = 0; i + 4 <= candles.length; i += 4) {
        const slice = candles.slice(i, i + 4);
        aggregated.push({
          time: slice[0].time,
          open: slice[0].open,
          high: Math.max(...slice.map((x) => x.high)),
          low: Math.min(...slice.map((x) => x.low)),
          close: slice.at(-1).close,
          volume: slice.reduce((s: number, x: any) => s + x.volume, 0),
        });
      }
      return aggregated;
    }

    return candles;
  } catch (e) {
    return await fetchRealCandles(interval, 750);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const interval = (url.searchParams.get("interval") || "1h") as KlineInterval;
    const months = Number(url.searchParams.get("months") || 3);

    const price = await getGoldPrice();
    const candles = await fetch3MonthsCandles(interval);

    const intervalLabel: Record<string, string> = {
      "1m": "دقيقة", "5m": "5 دقائق", "15m": "15 دقيقة", "30m": "30 دقيقة",
      "1h": "ساعة", "4h": "4 ساعات", "1d": "يومي", "1w": "أسبوعي",
    };

    let range = "";
    if (candles.length > 0) {
      const secondsPer = candles.length > 1
        ? candles[candles.length - 1].time - candles[candles.length - 2].time
        : 3600;
      const totalDays = Math.round((candles.length * secondsPer) / 86400);
      range = totalDays > 60 ? `${Math.round(totalDays / 30)} أشهر` : `${totalDays} يوم`;
    }

    return NextResponse.json({
      candles,
      currentPrice: price.price,
      range,
      interval: intervalLabel[interval] || interval,
      totalCandles: candles.length,
      startDate: candles.length ? new Date(candles[0].time * 1000).toISOString() : null,
      endDate: candles.length ? new Date(candles[candles.length - 1].time * 1000).toISOString() : null,
      source: "XAUUSD-yahoo-gcf-3months",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "history failed" }, { status: 500 });
  }
}
