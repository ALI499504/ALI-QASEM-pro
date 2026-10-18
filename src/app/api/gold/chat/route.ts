import { NextRequest, NextResponse } from "next/server";
import { fetchGoldPrice } from "@/lib/gold-price";
import { fetchCandles, computeIndicators, setLastKnownPrice } from "@/lib/indicators";
import { generateAISignal, chatWithAI } from "@/lib/ai-signal";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "question required" }, { status: 400 });
    }
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
    // Use REAL candles for context
    const candles = await fetchCandles("15m", 120);
    const indicators = computeIndicators(candles);
    const signal = await generateAISignal(price.price, candles, indicators);
    const answer = await chatWithAI(question, {
      price: price.price,
      candles,
      indicators,
      signal,
    });
    return NextResponse.json({ answer, ts: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "chat failed" }, { status: 500 });
  }
}
