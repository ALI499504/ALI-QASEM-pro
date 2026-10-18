import { NextResponse } from "next/server";
import { getTVSignals, getTVDecisions, startTVAgentLoop, clearTVSignals } from "@/lib/tradingview-agent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/gold/tv-signals — returns all TradingView signals + decisions
export async function GET() {
  startTVAgentLoop(); // lazy-start the background agent
  return NextResponse.json({
    signals: getTVSignals(),
    decisions: getTVDecisions(),
    total: getTVSignals().length,
  });
}

// DELETE — clear all signals (admin)
export async function DELETE() {
  clearTVSignals();
  return NextResponse.json({ success: true, message: "TV signals cleared" });
}
