import { NextResponse } from "next/server";
import { getMT5History } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/mql5/history — returns closed deals (history)
export async function GET() {
  try {
    const history = await getMT5History();
    return NextResponse.json({
      history,
      count: history.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch history" },
      { status: 500 }
    );
  }
}
