import { NextResponse } from "next/server";
import { getBridgeConfig, sendMTOrder } from "@/lib/mt-bridge";

export const dynamic = "force-dynamic";

// POST /api/gold/mt-order
// Body: { symbol?, side, volume, sl?, tp?, deviation?, comment? }
// Sends a market order to MT5 via the bridge.

export async function POST(req: Request) {
  const config = getBridgeConfig();
  if (!config) {
    return NextResponse.json({ error: "MT5 bridge not configured" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const { side, volume, sl, tp, deviation, comment } = body;
    if (!side || !volume) {
      return NextResponse.json({ error: "missing side or volume" }, { status: 400 });
    }
    if (side !== "BUY" && side !== "SELL") {
      return NextResponse.json({ error: "side must be BUY or SELL" }, { status: 400 });
    }
    const result = await sendMTOrder({
      symbol: body.symbol,
      side,
      volume: Number(volume),
      sl: sl ? Number(sl) : undefined,
      tp: tp ? Number(tp) : undefined,
      deviation: deviation ? Number(deviation) : 20,
      comment: comment || "M.ROBOT Copy",
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
