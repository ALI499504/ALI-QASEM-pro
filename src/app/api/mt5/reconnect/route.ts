import { NextResponse } from "next/server";
import { getMT5BridgeStatus } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/mt5/reconnect — simulate a reconnect (the bridge auto-reconnects)
export async function POST() {
  try {
    const status = await getMT5BridgeStatus();
    return NextResponse.json({
      success: true,
      message: "MT5 Bridge reconnected successfully",
      status,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Reconnect failed" },
      { status: 500 }
    );
  }
}
