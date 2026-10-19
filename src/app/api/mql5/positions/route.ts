import { NextResponse } from "next/server";
import { PositionsTotal, PositionGetTicket, PositionGetSymbol } from "@/lib/mql5";
import { getMT5Positions } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/mql5/positions — returns all open MT5 positions
export async function GET() {
  try {
    const positions = await getMT5Positions();
    const total = await PositionsTotal();
    return NextResponse.json({
      positions,
      count: positions.length,
      total,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch positions" },
      { status: 500 }
    );
  }
}
