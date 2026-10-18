import { NextResponse } from "next/server";
import { fetchSpotXAUUSD } from "@/lib/spot-price";
import { fetchGoldPrice as fetchYahooPrice } from "@/lib/gold-price";
import { fetchCandles, computeIndicators, setLastKnownPrice } from "@/lib/indicators";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Try spot price first (real broker-grade XAUUSD)
    let price;
    try {
      const spot = await fetchSpotXAUUSD();
      price = spot;
      setLastKnownPrice(price.price);
    } catch {
      // Fallback to Yahoo
      price = await fetchYahooPrice();
      setLastKnownPrice(price.price);
    }

    const candles = await fetchCandles("5m", 120);
    const indicators = computeIndicators(candles);

    return NextResponse.json({
      price,
      candles,
      indicators,
      serverTime: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "fetch failed" },
      { status: 500 }
    );
  }
}
