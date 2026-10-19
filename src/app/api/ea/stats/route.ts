import { NextResponse } from "next/server";
import { getEAStats } from "@/lib/ea/expert-advisor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/ea/stats — Get EA trading statistics
export async function GET() {
  return NextResponse.json({ stats: getEAStats() });
}
