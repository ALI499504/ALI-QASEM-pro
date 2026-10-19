import { NextResponse } from "next/server";
import { scanMarket } from "@/lib/ea/expert-advisor";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// POST /api/ea/scan — Trigger a manual market scan
export async function POST() {
  try {
    const signal = await scanMarket();
    return NextResponse.json({ success: true, signal });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Scan failed", signal: null },
      { status: 500 }
    );
  }
}
