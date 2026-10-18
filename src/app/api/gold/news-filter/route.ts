import { NextResponse } from "next/server";
import { checkNewsFilter } from "@/lib/news-filter";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// GET /api/gold/news-filter — returns current news filter status
export async function GET() {
  try {
    const status = await checkNewsFilter();
    return NextResponse.json(status);
  } catch (e: any) {
    return NextResponse.json(
      { isBlocked: false, reason: "News filter unavailable", error: e?.message },
      { status: 200 },
    );
  }
}
