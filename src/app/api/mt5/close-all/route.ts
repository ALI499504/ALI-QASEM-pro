import { NextResponse } from "next/server";
import { closeAllMT5Positions } from "@/lib/metaapi-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/mt5/close-all — close all open positions
export async function POST() {
  try {
    const result = closeAllMT5Positions();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Close-all failed" },
      { status: 500 }
    );
  }
}
