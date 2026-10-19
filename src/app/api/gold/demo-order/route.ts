import { NextResponse } from "next/server";
import { openDemoPosition } from "@/lib/demo-account";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// POST /api/gold/demo-order
// Body: { side: "BUY"|"SELL", volume: 0.01, sl: 4171, tp: 4231, comment: "..." }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { side, volume, sl, tp, comment } = body;
    if (!side || !volume) return NextResponse.json({ error: "missing side or volume" }, { status: 400 });
    const result = await openDemoPosition(side, Number(volume), Number(sl) || 0, Number(tp) || 0, comment || "M.ROBOT");
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
