import { NextResponse } from "next/server";
import { fetchGoldPrice } from "@/lib/gold-price";
import { fetchCandles, computeIndicators, setLastKnownPrice } from "@/lib/indicators";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
    // Use REAL Binance 5m candles (120 = last 10 hours of price action)
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
