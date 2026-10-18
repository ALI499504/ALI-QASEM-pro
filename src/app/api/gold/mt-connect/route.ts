import { NextResponse } from "next/server";
import {
  getBridgeConfig,
  setBridgeConfig,
  clearBridgeConfig,
  testBridgeConnection,
} from "@/lib/mt-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET — fetch current bridge config (without revealing API key) + test status
export async function GET() {
  const config = getBridgeConfig();
  if (!config) {
    return NextResponse.json({
      configured: false,
      message: "MT5 Bridge not configured. Set URL + API Key to use broker prices.",
    });
  }

  // Don't leak API key — return only URL + symbol + masked key
  let status: any = null;
  try {
    status = await testBridgeConnection();
  } catch (e: any) {
    status = { connected: false, mt5Connected: false, error: e?.message };
  }

  return NextResponse.json({
    configured: true,
    url: config.url,
    symbol: config.symbol,
    apiKeyMasked: config.apiKey.slice(0, 4) + "••••••••" + config.apiKey.slice(-4),
    status,
  });
}

// POST — save bridge config + test connection
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, apiKey, symbol } = body;
    if (!url || !apiKey) {
      return NextResponse.json(
        { error: "missing required fields: url, apiKey" },
        { status: 400 },
      );
    }
    const config = {
      url: url.replace(/\/$/, ""), // strip trailing slash
      apiKey,
      symbol: symbol || "XAUUSD",
    };

    // Test first
    let status: any;
    try {
      status = await testBridgeConnection(config);
    } catch (e: any) {
      return NextResponse.json({
        success: false,
        error: e?.message || "Bridge unreachable",
        hint: "تأكد أن URL صحيح وأن الـ bridge يعمل على VPS.",
      });
    }

    // Save only if test passes
    if (status.mt5Connected) {
      setBridgeConfig(config);
      return NextResponse.json({
        success: true,
        message: "تم الاتصال بنجاح بـ MT5 Bridge — الأسعار الآن من بروكرك بالضبط.",
        status,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Bridge reachable but MT5 not connected",
        hint: "تأكد أن MT5 Terminal شغّال على VPS وأن الـ credentials صحيحة.",
        status,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "request failed" }, { status: 500 });
  }
}

// DELETE — clear bridge config (revert to Yahoo GC=F)
export async function DELETE() {
  clearBridgeConfig();
  return NextResponse.json({
    success: true,
    message: "تم حذف إعدادات الـ MT5 Bridge — العودة لـ Yahoo GC=F.",
  });
}
