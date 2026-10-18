import { NextResponse } from "next/server";
import { fetchSpotXAUUSD } from "@/lib/spot-price";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/gold/spot — real-time XAUUSD spot price from broker-grade sources
export async function GET() {
  try {
    const price = await fetchSpotXAUUSD();
    return NextResponse.json({ price });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
