import { NextResponse } from "next/server";
import { fetchRealDepth } from "@/lib/binance-gold";

export const dynamic = "force-dynamic";

// Synthetic orderbook depth around XAUUSD spot price (spot gold has no public L2)

export async function GET() {
  try {
    const depth = await fetchRealDepth(20);
    return NextResponse.json({
      bids: depth.bids.map((b) => ({ price: b.price, size: b.size })),
      asks: depth.asks.map((a) => ({ price: a.price, size: a.size })),
      spread: depth.spread,
      mid: depth.mid,
      ts: depth.timestamp,
      source: "XAUUSD-spot",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "orderbook failed" }, { status: 500 });
  }
}
