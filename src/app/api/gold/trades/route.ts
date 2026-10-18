import { NextResponse } from "next/server";
import { fetchRealTrades } from "@/lib/binance-gold";

export const dynamic = "force-dynamic";

// Synthetic Time & Sales tape around XAUUSD spot price

export async function GET() {
  try {
    const trades = await fetchRealTrades(20);
    return NextResponse.json({
      trades: trades.map((t) => ({
        id: t.id,
        price: t.price,
        qty: t.qty,
        time: t.time,
        side: t.side,
      })),
      source: "XAUUSD-spot",
      fetchedAt: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "trades failed" }, { status: 500 });
  }
}
