import { NextResponse } from "next/server";
import { getEALogs } from "@/lib/ea/expert-advisor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/ea/logs?count=50 — Get recent EA logs
export async function GET(req: Request) {
  const url = new URL(req.url);
  const count = parseInt(url.searchParams.get("count") || "50");
  const logs = getEALogs(Math.min(count, 500));
  return NextResponse.json({ logs, count: logs.length });
}
