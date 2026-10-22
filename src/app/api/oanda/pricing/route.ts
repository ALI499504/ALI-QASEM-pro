import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/oanda/pricing?symbol=XAU_USD
// يجلب الأسعار الحية من OANDA
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") || "XAU_USD";
  const token = req.headers.get("x-oanda-token") || "";
  const accountId = req.headers.get("x-oanda-account") || "";

  if (!token || !accountId) {
    return NextResponse.json({ ok: false, error: "OANDA token required" }, { status: 400 });
  }

  try {
    const apiUrl = `https://api-fxpractice.oanda.com/v3/accounts/${accountId}/pricing?instruments=${symbol}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);

    const r = await fetch(apiUrl, {
      headers: { "Authorization": `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `OANDA: ${r.status}` }, { status: 502 });
    }

    const data = await r.json();
    const price = data.prices?.[0];
    if (!price) {
      return NextResponse.json({ ok: false, error: "No price data" }, { status: 502 });
    }

    const bid = parseFloat(price.bids?.[0]?.price || "0");
    const ask = parseFloat(price.asks?.[0]?.price || "0");
    const spread = ask - bid;

    return NextResponse.json({
      ok: true,
      symbol,
      bid,
      ask,
      last: (bid + ask) / 2,
      spread,
      changePct: parseFloat(price.closeoutBid || "0") > 0 ?
        ((bid - parseFloat(price.closeoutBid || bid.toString())) / parseFloat(price.closeoutBid || bid.toString()) * 100) : 0,
      source: "oanda",
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
