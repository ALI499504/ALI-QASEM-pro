import { NextResponse } from "next/server";
import { closeAllMT5Positions } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/mql5/close-all — close all positions
export async function POST() {
  try {
    const result = closeAllMT5Positions();
    return NextResponse.json({
      ...result,
      success: true,
      retcode: 10009,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, retcode: 10011, error: e?.message ?? "Close-all failed" },
      { status: 500 }
    );
  }
}
