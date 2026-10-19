import { NextResponse } from "next/server";
import { getDemoAccount, getDemoPositions } from "@/lib/demo-account";
import { fetchRealGoldTicker } from "@/lib/binance-gold";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/gold/demo-account — returns demo account info ($1000, 1:500)
export async function GET() {
  try {
    const ticker = await fetchRealGoldTicker();
    const account = getDemoAccount(ticker.bid);
    const positions = getDemoPositions();
    return NextResponse.json({ account, positions, count: positions.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
