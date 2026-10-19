import { NextResponse } from "next/server";
import {
  getEAState, getEAConfig, getLastSignal, getEAStats,
} from "@/lib/ea/expert-advisor";
import { getMT5Positions } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/ea/status — Full EA status (state + config + last signal + positions + stats)
export async function GET() {
  try {
    const state = getEAState();
    const config = getEAConfig();
    const lastSignal = getLastSignal();
    const stats = getEAStats();
    const positions = await getMT5Positions();

    // Calculate current P/L
    const floatingPL = positions.reduce((sum, p) => sum + p.profit, 0);
    const totalEquity = (stats.totalProfit - stats.totalLoss) + floatingPL;

    return NextResponse.json({
      state,
      enabled: config.enabled,
      config,
      lastSignal,
      stats,
      positions: {
        count: positions.length,
        list: positions,
        floatingPL: Math.round(floatingPL * 100) / 100,
      },
      summary: {
        totalTrades: stats.totalTrades,
        winRate: stats.winRate.toFixed(2) + "%",
        netProfit: Math.round((stats.totalProfit - stats.totalLoss) * 100) / 100,
        floatingPL: Math.round(floatingPL * 100) / 100,
        totalEquity: Math.round(totalEquity * 100) / 100,
        uptimeSec: stats.uptimeSec,
        lastScanAt: stats.lastScanAt,
        lastSignalAt: stats.lastSignalAt,
        lastTradeAt: stats.lastTradeAt,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch EA status" },
      { status: 500 }
    );
  }
}
