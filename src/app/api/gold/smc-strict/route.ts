import { NextResponse } from "next/server";
import { computeSMCStrictSignal } from "@/lib/smc-strict-strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/gold/smc-strict?balance=1000
// Runs the strict SMC/ICT strategy check on XAUUSD (Daily + 4H + 15m).
// Returns either a complete trade setup OR a "no complete setup" message with reason.

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountBalance = Number(url.searchParams.get("balance") || 1000);

    const result = await computeSMCStrictSignal(accountBalance);

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { hasSetup: false, notSetupReason: e?.message ?? "SMC strict strategy failed", error: e?.message },
      { status: 500 },
    );
  }
}
