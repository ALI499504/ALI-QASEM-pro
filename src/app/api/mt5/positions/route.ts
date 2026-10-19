import { NextResponse } from "next/server";
import { getMT5Positions } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/mt5/positions — all open MT5 positions
export async function GET() {
  try {
    const positions = getMT5Positions();
    return NextResponse.json({ positions, count: positions.length }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch positions" },
      { status: 500 }
    );
  }
}
