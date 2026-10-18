import { NextResponse } from "next/server";
import { processTradingViewSignal, getTVSignals } from "@/lib/tradingview-agent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// === POST /api/gold/tradingview-webhook ===
// Receives alerts from TradingView strategies.
// User configures alerts in TradingView with this URL + JSON body.
//
// Example alert message from TradingView:
// {
//   "symbol": "XAUUSD",
//   "side": "buy",
//   "strategy": "RSI Divergence v3",
//   "price": 4181.10,
//   "timeframe": "15",
//   "indicators": { "rsi": 32, "macd": -0.5 },
//   "note": "Bullish divergence on 15m"
// }
//
// Or TradingView's default alert format:
// {
//   "exchange": "FX",
//   "symbol": "XAUUSD",
//   "interval": "15",
//   "price": 4181.10,
//   "side": "buy",
//   "alert": "Bullish RSI divergence"
// }

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("X-TV-Secret") || req.headers.get("tv-secret") || "";

    // Optional: validate secret if user configured one
    const configuredSecret = process.env.TV_WEBHOOK_SECRET;
    if (configuredSecret && authHeader !== configuredSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    // Normalize the alert payload (support both our format and TV's default)
    const normalized = {
      symbol: body.symbol || body.ticker || "XAUUSD",
      side: (body.side || body.action || body.alert_action || "").toLowerCase().includes("sell")
        ? "sell"
        : "buy",
      strategy: body.strategy || body.alert_name || body.strategy_name || "TradingView Alert",
      price: Number(body.price || body.close || 0),
      timeframe: body.interval || body.timeframe || body.tf || "15",
      indicators: body.indicators || body.indicator || {},
      note: body.note || body.alert || body.message || "",
      timestamp: Date.now(),
      raw: body,
    };

    // Send to hidden agent for processing (combines with multi-agent consensus)
    await processTradingViewSignal(normalized);

    return NextResponse.json({
      success: true,
      message: "Signal received and forwarded to hidden agent",
      signal: normalized,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "webhook failed" },
      { status: 500 },
    );
  }
}

// GET — show webhook info + setup instructions
export async function GET() {
  const baseUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_URL || "https://mrobot-gold.quilt-estimate.workers.dev";
  return NextResponse.json({
    webhookUrl: `${baseUrl}/api/gold/tradingview-webhook`,
    method: "POST",
    contentType: "application/json",
    headers: process.env.TV_WEBHOOK_SECRET ? { "X-TV-Secret": "<your-secret>" } : {},
    setup: {
      step1: "Open TradingView → Open your chart → Load any Pine Script strategy or indicator",
      step2: "Right-click chart → Add Alert",
      step3: "In 'Alert Condition' tab → set the trigger (e.g., RSI crosses 30)",
      step4: "In 'Notifications' tab → Webhook tab → Paste the webhookUrl above",
      step5: "Set the message body to JSON format (see example)",
      step6: "Click Create — TradingView will start sending alerts here",
    },
    examplePayload: {
      symbol: "XAUUSD",
      side: "buy",
      strategy: "RSI Divergence",
      price: 4181.10,
      timeframe: "15",
      note: "Bullish divergence",
    },
    recentSignals: getTVSignals().slice(0, 5),
    hiddenAgentStatus: "M.ROBOT Hidden Agent is running — combines TV signals with our SMC/ICT multi-agent system + decides execution",
  });
}
