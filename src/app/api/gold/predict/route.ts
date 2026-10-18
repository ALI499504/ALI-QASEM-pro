import { NextResponse } from "next/server";
import { fetchGoldPrice } from "@/lib/gold-price";
import { fetchCandles, computeIndicators, setLastKnownPrice } from "@/lib/indicators";
import { predictNextCandle } from "@/lib/ml-prediction";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
    const candles = await fetchCandles("15m", 120);
    const indicators = computeIndicators(candles);
    const prediction = predictNextCandle(candles, indicators);
    return NextResponse.json({ prediction, price: price.price, generatedAt: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "predict failed" }, { status: 500 });
  }
}
