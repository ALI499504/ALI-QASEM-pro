import { NextResponse } from "next/server";
import { computeWyckoffSignal } from "@/lib/wyckoff-strict-strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 20;

// GET /api/gold/wyckoff-strict?balance=1000
// Runs the Wyckoff Method strategy on XAUUSD (1H timeframe)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountBalance = Number(url.searchParams.get("balance") || 1000);
    const result = await computeWyckoffSignal(accountBalance);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { hasSetup: false, notSetupReason: e?.message ?? "Wyckoff strategy failed", error: e?.message },
      { status: 500 },
    );
  }
}
