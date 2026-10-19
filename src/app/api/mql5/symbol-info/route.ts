import { NextResponse } from "next/server";
import { SymbolInfoDouble, SymbolInfoInteger, SymbolInfoString, SymbolInfoTick } from "@/lib/mql5";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/mql5/symbol-info?symbol=XAUUSD
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol") || "XAUUSD";

    const [bid, ask, last, point, contractSize, tickValue, volMin, volMax, volStep] = await Promise.all([
      SymbolInfoDouble(symbol, 0),   // SYMBOL_BID
      SymbolInfoDouble(symbol, 3),   // SYMBOL_ASK
      SymbolInfoDouble(symbol, 6),   // SYMBOL_LAST
      SymbolInfoDouble(symbol, 12),  // SYMBOL_POINT
      SymbolInfoDouble(symbol, 17),  // SYMBOL_TRADE_CONTRACT_SIZE
      SymbolInfoDouble(symbol, 13),  // SYMBOL_TRADE_TICK_VALUE
      SymbolInfoDouble(symbol, 18),  // SYMBOL_VOLUME_MIN
      SymbolInfoDouble(symbol, 19),  // SYMBOL_VOLUME_MAX
      SymbolInfoDouble(symbol, 20),  // SYMBOL_VOLUME_STEP
    ]);

    const digits = await SymbolInfoInteger(symbol, 0);
    const [base, profit, margin, desc, path] = await Promise.all([
      SymbolInfoString(symbol, 0), SymbolInfoString(symbol, 1), SymbolInfoString(symbol, 2),
      SymbolInfoString(symbol, 4), SymbolInfoString(symbol, 5),
    ]);

    const tick = await SymbolInfoTick(symbol);

    return NextResponse.json({
      symbol,
      bid, ask, last, point, contractSize, tickValue,
      volumeMin: volMin, volumeMax: volMax, volumeStep: volStep,
      digits,
      currencyBase: base, currencyProfit: profit, currencyMargin: margin,
      description: desc, path,
      tick,
      spread: Math.round((ask - bid) / point),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch symbol info" },
      { status: 500 }
    );
  }
}
