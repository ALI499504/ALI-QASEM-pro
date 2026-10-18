import { NextResponse } from "next/server";
import { fetchGoldPrice } from "@/lib/gold-price";
import { fetchCandles, computeIndicators, setLastKnownPrice } from "@/lib/indicators";
import { runMultiAgentAnalysis } from "@/lib/agents";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
    // Use REAL 15m candles for multi-agent analysis
    const candles = await fetchCandles("15m", 120);
    const indicators = computeIndicators(candles);
    const result = await runMultiAgentAnalysis(price.price, candles, indicators);
    return NextResponse.json({ result, generatedAt: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "agents failed" }, { status: 500 });
  }
}
