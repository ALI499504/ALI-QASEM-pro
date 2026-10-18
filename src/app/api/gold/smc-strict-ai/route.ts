import { NextResponse } from "next/server";
import { computeSMCStrictSignal } from "@/lib/smc-strict-strategy";
import { generateSMCStrictAIAnalysis } from "@/lib/smc-strict-ai";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// GET /api/gold/smc-strict-ai?balance=1000
// Returns the SMC strict strategy result + AI professional analysis
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountBalance = Number(url.searchParams.get("balance") || 1000);

    // Run the strict strategy (3 timeframes fetch)
    const strategy = await computeSMCStrictSignal(accountBalance);

    // Generate AI commentary (with timeout + fallback)
    const aiAnalysis = await generateSMCStrictAIAnalysis(strategy);

    return NextResponse.json({
      strategy,
      ai: aiAnalysis,
      timestamp: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "SMC strict AI failed" },
      { status: 500 },
    );
  }
}
