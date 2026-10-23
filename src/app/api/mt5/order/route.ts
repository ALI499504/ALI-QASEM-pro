import { NextResponse } from "next/server";
import { placeMT5Order } from "@/lib/metaapi-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// POST /api/mt5/order — place a market BUY/SELL order
// Body: { side: "BUY"|"SELL", volume: 0.01, sl?: 4170, tp?: 4210, comment?: "..." }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { side, volume, sl, tp, comment } = body;
    if (!side || !volume) {
      return NextResponse.json(
        {
          success: false,
          retcode: 10013, // MT5 TRADE_RETCODE_INVALID
          error: "missing side or volume",
        },
        { status: 400 }
      );
    }
    const result = await placeMT5Order({
      side,
      volume: Number(volume),
      sl: Number(sl) || 0,
      tp: Number(tp) || 0,
      comment: comment || "M.ROBOT",
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        retcode: 10004, // MT5 TRADE_RETCODE_REQUOTE
        error: e?.message ?? "Order failed",
      },
      { status: 500 }
    );
  }
}
