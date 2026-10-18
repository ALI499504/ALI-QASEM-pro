import { NextResponse } from "next/server";
import { getNewsEvents, getUpcomingNews } from "@/lib/news-filter";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// GET /api/gold/news-events — returns all high-impact news events
export async function GET(req: Request) {
  const url = new URL(req.url);
  const upcoming = url.searchParams.get("upcoming") === "true";
  try {
    const events = upcoming ? await getUpcomingNews() : await getNewsEvents();
    return NextResponse.json({ events, count: events.length });
  } catch (e: any) {
    return NextResponse.json({ events: [], count: 0, error: e?.message });
  }
}
