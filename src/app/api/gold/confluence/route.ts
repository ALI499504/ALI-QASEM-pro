import { NextResponse } from "next/server";
import { computeConfluenceSignal } from "@/lib/confluence-strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 20;

// GET /api/gold/confluence?balance=1000
// Confluence Hybrid Strategy: SMC/ICT + Wyckoff + HTF Trend + News Filter
// Only enters if 3 systems agree | R:R = 1:3 | Lot = 0.01

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const balance = Number(url.searchParams.get("balance") || 1000);
    const result = await computeConfluenceSignal(balance);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { hasSetup: false, notSetupReason: e?.message ?? "Confluence failed" },
      { status: 500 },
    );
  }
}
