import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/oanda/account
// يجلب معلومات الحساب (رصيد، equity، margin)
export async function GET(req: NextRequest) {
  const token = req.headers.get("x-oanda-token") || "";
  const accountId = req.headers.get("x-oanda-account") || "";

  if (!token || !accountId) {
    return NextResponse.json({ ok: false, error: "OANDA token required" }, { status: 400 });
  }

  try {
    const apiUrl = `https://api-fxpractice.oanda.com/v3/accounts/${accountId}/summary`;
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
    const acc = data.account;

    // اجلب المراكز المفتوحة
    const positionsUrl = `https://api-fxpractice.oanda.com/v3/accounts/${accountId}/openPositions`;
    const posR = await fetch(positionsUrl, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const posData = posR.ok ? await posR.json() : { positions: [] };

    return NextResponse.json({
      ok: true,
      account: {
        login: accountId,
        balance: parseFloat(acc.balance),
        equity: parseFloat(acc.equity),
        margin: parseFloat(acc.marginUsed),
        freeMargin: parseFloat(acc.marginAvailable),
        marginLevel: parseFloat(acc.marginCloseoutPercent) * 100,
        profit: parseFloat(acc.unrealizedPL),
        currency: acc.currency,
        leverage: 1,
      },
      positions: (posData.positions || []).map((p: any) => ({
        ticket: p.id,
        symbol: p.instrument.replace("_", ""),
        type: p.long?.units ? "BUY" : p.short?.units ? "SELL" : "WAIT",
        volume: parseFloat(p.long?.units || p.short?.units || "0"),
        priceOpen: parseFloat(p.long?.averagePrice || p.short?.averagePrice || "0"),
        priceCurrent: 0, // يحتاج pricing call
        profit: parseFloat(p.unrealizedPL),
        sl: 0,
        tp: 0,
      })),
      source: "oanda",
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
