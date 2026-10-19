import { NextResponse } from "next/server";
import { getMT5BridgeStatus } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/mt5/status — full MT5 Bridge status (account + positions + history)
export async function GET() {
  try {
    const status = await getMT5BridgeStatus();
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        connected: false,
        error: e?.message ?? "Bridge unavailable",
      },
      { status: 500 }
    );
  }
}
