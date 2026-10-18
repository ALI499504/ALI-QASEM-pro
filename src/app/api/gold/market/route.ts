import { NextResponse } from "next/server";
import { fetchSpotXAUUSD } from "@/lib/spot-price";
import { fetchGoldPrice as fetchYahooPrice } from "@/lib/gold-price";
import { fetchCandles, computeIndicators, setLastKnownPrice } from "@/lib/indicators";
import type { KlineInterval } from "@/lib/binance-gold";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Map UI timeframe codes to API interval codes
const TF_MAP: Record<string, KlineInterval> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "30": "30m",
  "60": "1h",
  "240": "4h",
  D: "1d",
  W: "1w",
};

// GET /api/gold/market?tf=15
// Returns:
//   price:    current XAUUSD price (bid/ask/high/low/...)
//   candles:  OHLCV candles for the requested timeframe (200 candles)
//   indicators: EMA50, EMA200, RSI, ATR, ...
//   serverTime: Date.now()
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tf = url.searchParams.get("tf") || "15";
    const interval = TF_MAP[tf] || "15m";

    // === Price: try spot first (real broker-grade XAUUSD), then Yahoo
    let price;
    try {
      const spot = await fetchSpotXAUUSD();
      price = spot;
      setLastKnownPrice(price.price);
    } catch {
      price = await fetchYahooPrice();
      setLastKnownPrice(price.price);
    }

    // === Candles: real OHLCV for the requested timeframe
    const candles = await fetchCandles(interval, 200);
    const indicators = computeIndicators(candles);

    return NextResponse.json(
      {
        price,
        candles,
        indicators,
        tf,
        interval,
        serverTime: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "fetch failed" },
      { status: 500 }
    );
  }
}
