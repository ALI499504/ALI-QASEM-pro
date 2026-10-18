import { NextResponse } from "next/server";
import { fetchRealGoldNews } from "@/lib/binance-gold";

export const dynamic = "force-dynamic";

// Real gold news from Google News RSS (Arabic + English)

export async function GET() {
  try {
    const news = await fetchRealGoldNews(12);
    return NextResponse.json({ news, source: "google-news-rss", fetchedAt: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "news failed" }, { status: 500 });
  }
}
