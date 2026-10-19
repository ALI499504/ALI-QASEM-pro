import { NextResponse } from "next/server";
import { getMT5History } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/mt5/history — closed deals history
export async function GET() {
  try {
    const history = getMT5History();
    return NextResponse.json({ history, count: history.length }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch history" },
      { status: 500 }
    );
  }
}
