import { NextResponse } from "next/server";
import { computeCopyTradePlan, DEFAULT_COPY_TRADE_SETTINGS, type CopyTradeSettings } from "@/lib/copy-trading";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/gold/copy-trade
// Body: { masterBalance, followerBalance, entryPrice, stopLoss, settings? }
// Returns: proportional lot sizing plan for MT4/MT5 execution

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { masterBalance, followerBalance, entryPrice, stopLoss } = body;

    if (!masterBalance || !followerBalance || !entryPrice || !stopLoss) {
      return NextResponse.json(
        { error: "missing required fields: masterBalance, followerBalance, entryPrice, stopLoss" },
        { status: 400 }
      );
    }

    const settings: CopyTradeSettings = {
      ...DEFAULT_COPY_TRADE_SETTINGS,
      ...(body.settings || {}),
    };

    const plan = computeCopyTradePlan(
      Number(masterBalance),
      Number(followerBalance),
      Number(entryPrice),
      Number(stopLoss),
      settings
    );

    return NextResponse.json({
      ...plan,
      settings,
      timestamp: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "copy-trade failed" }, { status: 500 });
  }
}
