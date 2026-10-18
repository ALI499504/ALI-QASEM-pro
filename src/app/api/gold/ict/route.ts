import { NextResponse } from "next/server";
import { fetchCandles, computeIndicators } from "@/lib/indicators";
import { computeICTSignal } from "@/lib/ict-strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ICT Strategy — Inner Circle Trader (Order Blocks + FVG + Liquidity)
// Returns: action, confidence, entry, SL, TP1/2/3, components

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const interval = (url.searchParams.get("interval") || "15m") as any;
    const accountBalance = Number(url.searchParams.get("balance") || 1000);

    const candles = await fetchCandles(interval, 200);
    if (candles.length < 30) {
      return NextResponse.json({ error: "Not enough candles" }, { status: 400 });
    }
    const ind = computeIndicators(candles);
    const signal = computeICTSignal(candles, ind, accountBalance);

    return NextResponse.json({
      ...signal,
      currentPrice: candles.at(-1)?.close,
      interval,
      timestamp: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ICT failed" }, { status: 500 });
  }
}
