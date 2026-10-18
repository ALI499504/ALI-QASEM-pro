import { NextResponse } from "next/server";
import { fetchGoldPrice } from "@/lib/gold-price";
import { fetchCandles, computeIndicators, setLastKnownPrice } from "@/lib/indicators";
import { analyzeSMC } from "@/lib/smc-analysis";
import { detectRegime } from "@/lib/regime-detection";
import { computeEnsembleSignal } from "@/lib/alpha-factors";
import { computeRiskManagement } from "@/lib/risk-management";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ACCOUNT_BALANCE = 10000;

export async function GET() {
  try {
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
    // Use real 15m candles for smart analysis
    const candles = await fetchCandles("15m", 120);
    const indicators = computeIndicators(candles);

    // Compute all smart signals
    const smc = analyzeSMC(candles);
    const regime = detectRegime(candles, indicators);
    const ensemble = computeEnsembleSignal(candles, indicators);

    // Determine direction from ensemble
    const direction: "BUY" | "SELL" =
      ensemble.action === "STRONG_BUY" || ensemble.action === "BUY" ? "BUY" :
      ensemble.action === "STRONG_SELL" || ensemble.action === "SELL" ? "SELL" : "BUY";

    // Risk management based on ensemble confidence
    const risk = computeRiskManagement(candles, indicators, ACCOUNT_BALANCE, direction, ensemble.confidence);

    return NextResponse.json({
      price: price.price,
      timestamp: Date.now(),
      smc,
      regime,
      ensemble,
      risk,
      source: "XAUUSD-spot + ML-ensemble",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "smart-signal failed" }, { status: 500 });
  }
}
