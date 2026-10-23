import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/oanda/candles?symbol=XAU_USD&interval=H1&limit=200
// يجلب شموع حقيقية من OANDA (ذهب، فوركس، إلخ)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") || "XAU_USD";
  const interval = url.searchParams.get("interval") || "H1";
  const limit = url.searchParams.get("limit") || "200";

  // OANDA API token من الإعدادات
  const token = req.headers.get("x-oanda-token") || "";
  const accountId = req.headers.get("x-oanda-account") || "";

  if (!token || !accountId) {
    return NextResponse.json({
      ok: false,
      error: "OANDA token and account ID required. Set them in Settings.",
    }, { status: 400 });
  }

  // خريطة الفترات
  const granularityMap: Record<string, string> = {
    M1: "M1", M5: "M5", M15: "M15", M30: "M30",
    H1: "H1", H4: "H4", D1: "D", W1: "W", MN: "M",
  };
  const granularity = granularityMap[interval] || "H1";

  try {
    const apiUrl = `https://api-fxpractice.oanda.com/v3/instruments/${symbol}/candles?granularity=${granularity}&count=${limit}&price=BA`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const r = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!r.ok) {
      const err = await r.text();
      return NextResponse.json({ ok: false, error: `OANDA API: ${r.status} - ${err.slice(0, 200)}` }, { status: 502 });
    }

    const data = await r.json();
    const candles = (data.candles || []).map((c: any) => ({
      time: Math.floor(new Date(c.time).getTime() / 1000),
      open: parseFloat(c.bid.o),
      high: parseFloat(c.bid.h),
      low: parseFloat(c.bid.l),
      close: parseFloat(c.bid.c),
      volume: parseInt(c.volume) || 0,
    }));

    return NextResponse.json({
      ok: true,
      symbol,
      interval,
      candles,
      source: "oanda",
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
