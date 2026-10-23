import { NextResponse } from "next/server";
import { getCandles } from "@/lib/metaapi-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// GET /api/mt5/candles?symbol=XAUUSD&period=1h&limit=300
// Returns: { candles: [{time, open, high, low, close, volume}, ...], source }
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "XAUUSD").toUpperCase();
    const period = url.searchParams.get("period") || "1h";
    const limit = Math.min(1000, Math.max(50, Number(url.searchParams.get("limit") || 300)));

    const candles = await getCandles(symbol, period, limit);
    return NextResponse.json(
      { candles, count: candles.length, symbol, period, limit },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch candles", candles: [] },
      { status: 500 }
    );
  }
}
