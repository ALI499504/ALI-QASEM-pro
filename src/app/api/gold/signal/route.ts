import { NextResponse } from "next/server";
import { fetchGoldPrice } from "@/lib/gold-price";
import { fetchCandles, computeIndicators, setLastKnownPrice } from "@/lib/indicators";
import { generateAISignal } from "@/lib/ai-signal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
    // Use REAL 15m candles for signal analysis (last 30 hours of price action)
    const candles = await fetchCandles("15m", 120);
    const indicators = computeIndicators(candles);
    const signal = await generateAISignal(price.price, candles, indicators);
    return NextResponse.json({ signal, generatedAt: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "signal failed" }, { status: 500 });
  }
}
