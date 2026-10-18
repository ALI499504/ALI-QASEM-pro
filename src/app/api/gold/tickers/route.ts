import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Real multi-asset ticker prices for TopTicker
// Sources: Yahoo Finance (XAUUSD spot gold via GC=F, DXY, US10Y, WTI, SPX), CoinGecko (silver), Binance (BTC only)

interface TickerItem {
  label: string;
  value: number;
  change: number;
  changePct: number;
  source: string;
}

async function fetchWithTimeout(url: string, ms = 4000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "M.ROBOT/1.0" },
    });
  } finally {
    clearTimeout(t);
  }
}

async function fetchBinanceTicker(symbol: string): Promise<{ last: number; change: number; changePct: number } | null> {
  try {
    const r = await fetchWithTimeout(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    if (!r.ok) return null;
    const j: any = await r.json();
    const last = Number(j.lastPrice);
    const change = Number(j.priceChange);
    const changePct = Number(j.priceChangePercent);
    if (!Number.isFinite(last) || last <= 0) return null;
    return { last, change, changePct };
  } catch {
    return null;
  }
}

async function fetchYahooQuote(symbol: string): Promise<{ last: number; change: number; changePct: number } | null> {
  try {
    const r = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return null;
    const closes: number[] = result?.indicators?.quote?.[0]?.close?.filter((x: any) => x != null) ?? [];
    const meta = result.meta;
    const last = Number(closes.at(-1));
    const prev = Number(closes.at(-2) ?? last);
    if (!Number.isFinite(last) || last <= 0) return null;
    return {
      last,
      change: last - prev,
      changePct: prev > 0 ? ((last - prev) / prev) * 100 : 0,
    };
  } catch {
    return null;
  }
}

async function fetchCoinGeckoPrice(id: string): Promise<{ last: number; change: number; changePct: number } | null> {
  try {
    const r = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    const last = Number(j?.[id]?.usd);
    const changePct = Number(j?.[id]?.usd_24h_change ?? 0);
    if (!Number.isFinite(last) || last <= 0) return null;
    return { last, change: (last * changePct) / 100, changePct };
  } catch {
    return null;
  }
}

export async function GET() {
  const items: TickerItem[] = [];

  // 1. XAUUSD (Gold) — Yahoo Finance GC=F (COMEX Gold Futures, tracks spot XAUUSD)
  const gold = await fetchYahooQuote("GC=F");
  if (gold) {
    items.push({
      label: "XAUUSD",
      value: gold.last,
      change: gold.change,
      changePct: gold.changePct,
      source: "XAUUSD",
    });
  }

  // 2. XAGUSD (Silver) — CoinGecko
  const silver = await fetchCoinGeckoPrice("silver");
  if (silver) {
    items.push({
      label: "XAGUSD",
      value: silver.last,
      change: silver.change,
      changePct: silver.changePct,
      source: "coingecko",
    });
  }

  // 3. DXY (US Dollar Index) — Yahoo DX-Y
  const dxy = await fetchYahooQuote("DX-Y");
  if (dxy) {
    items.push({ label: "DXY", value: dxy.last, change: dxy.change, changePct: dxy.changePct, source: "yahoo" });
  }

  // 4. US10Y (10-Year Treasury Yield) — Yahoo ^TNX
  const tnx = await fetchYahooQuote("^TNX");
  if (tnx) {
    items.push({ label: "US10Y", value: tnx.last, change: tnx.change, changePct: tnx.changePct, source: "yahoo" });
  }

  // 5. WTI Crude Oil — Yahoo CL=F
  const wti = await fetchYahooQuote("CL=F");
  if (wti) {
    items.push({ label: "WTI", value: wti.last, change: wti.change, changePct: wti.changePct, source: "yahoo" });
  }

  // 6. BTCUSD — Binance BTCUSDT (always works)
  const btc = await fetchBinanceTicker("BTCUSDT");
  if (btc) {
    items.push({
      label: "BTCUSD",
      value: btc.last,
      change: btc.change,
      changePct: btc.changePct,
      source: "binance",
    });
  }

  // 7. SPX (S&P 500) — Yahoo ^GSPC
  const spx = await fetchYahooQuote("^GSPC");
  if (spx) {
    items.push({ label: "SPX", value: spx.last, change: spx.change, changePct: spx.changePct, source: "yahoo" });
  }

  return NextResponse.json({
    items,
    fetchedAt: Date.now(),
    sources: Array.from(new Set(items.map((i) => i.source))),
  });
}
