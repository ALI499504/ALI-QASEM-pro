import { NextResponse } from "next/server";
import { getMT5PositionsAsync as getMT5Positions } from "@/lib/metaapi-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/mt5/positions — all open MT5 positions (MetaApi or Demo fallback)
export async function GET() {
  try {
    const positions = await getMT5Positions();
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
