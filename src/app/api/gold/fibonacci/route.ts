import { NextResponse } from "next/server";
import { fetchCandles, computeIndicators } from "@/lib/indicators";
import { computeFibonacciSignal } from "@/lib/fibonacci-strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const interval = (url.searchParams.get("interval") || "1h") as any;
    const accountBalance = Number(url.searchParams.get("balance") || 1000);

    // Fibonacci works better on higher timeframes (1h, 4h, 1d)
    const candles = await fetchCandles(interval, 200);
    if (candles.length < 30) {
      return NextResponse.json({ error: "Not enough candles" }, { status: 400 });
    }
    const ind = computeIndicators(candles);
    const signal = computeFibonacciSignal(candles, ind, accountBalance);

    return NextResponse.json({
      ...signal,
      currentPrice: candles.at(-1)?.close,
      interval,
      timestamp: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Fib failed" }, { status: 500 });
  }
}
