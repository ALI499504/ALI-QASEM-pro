import { NextResponse } from "next/server";
import { OrderSend, type Mql5TradeRequest } from "@/lib/mql5";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// POST /api/mql5/order
// Body: Mql5TradeRequest structure
//   { action: 0, symbol: "XAUUSD", volume: 0.01, type: 0, sl: 4170, tp: 4210, comment: "..." }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const request: Mql5TradeRequest = {
      action: body.action ?? 0,
      symbol: body.symbol ?? "XAUUSD",
      volume: Number(body.volume) || 0.01,
      type: body.type ?? 0,
      price: body.price ?? 0,
      stoplimit: body.stoplimit ?? 0,
      sl: body.sl ?? 0,
      tp: body.tp ?? 0,
      deviation: body.deviation ?? 10,
      magic: body.magic ?? 0,
      position: body.position,
      position_by: body.position_by,
      type_filling: body.type_filling ?? 0,
      type_time: body.type_time ?? 0,
      expiration: body.expiration,
      comment: body.comment ?? "MQL5",
    };

    const result = await OrderSend(request);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { retcode: 10011, error: e?.message ?? "Order failed", success: false },
      { status: 500 }
    );
  }
}
