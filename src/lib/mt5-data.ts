// =====================================================================
//  BFX AI — MT5 Data Layer (client-side)
// =====================================================================
//  This module is imported by the React UI (page.tsx, CinematicMonitor).
//  All functions hit our own Next.js API routes (server-side), which
//  in turn call the MetaApi Cloud bridge (real HotForex MT5 account)
//  with Binance/Yahoo fallback when MetaApi is unreachable.
// =====================================================================

export interface Account {
  login: string;
  name: string;
  server: string;
  currency: string;
  leverage: number;
  balance: number;
  equity: number;
  margin: number;
  marginFree: number;
  marginLevel: number;
  profit: number;
  accountType: "DEMO" | "REAL" | "CONTEST";
  currencyDigits: number;
  companyName: string;
  tradeAllowed: boolean;
  source: "MetaApi Cloud" | "Demo Bridge (Binance)";
}

export interface Position {
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  time: number;
  magic: number;
  comment: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BridgeStatus {
  connected: boolean;
  bridgeVersion: string;
  source: "MetaApi Cloud" | "Demo Bridge (Binance)";
  connectionType: string;
  account: Account | null;
  positions: Position[];
  latencyMs: number;
  lastUpdate: number;
  server: string;
  endpoint: string;
  accountId?: string;
}

async function jsonOrThrow<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`${r.status}: ${txt.slice(0, 200)}`);
  }
  return r.json() as Promise<T>;
}

// ====================== Account ======================
export async function fetchAccount(): Promise<{
  account: Account;
  positions: Position[];
}> {
  const [acctRes, posRes] = await Promise.all([
    fetch("/api/mt5/account", { cache: "no-store" }),
    fetch("/api/mt5/positions", { cache: "no-store" }),
  ]);
  const account = (await jsonOrThrow<{ account: Account }>(acctRes)).account;
  const positions = (await jsonOrThrow<{ positions: Position[] }>(posRes)).positions || [];
  return { account, positions };
}

// ====================== Bridge status ======================
export async function fetchBridgeStatus(): Promise<BridgeStatus> {
  const r = await fetch("/api/mt5/status", { cache: "no-store" });
  return jsonOrThrow<BridgeStatus>(r);
}

// ====================== Candles ======================
export async function fetchCandles(
  symbol: string,
  period: string,
  limit: number = 300
): Promise<Candle[]> {
  const r = await fetch(
    `/api/mt5/candles?symbol=${encodeURIComponent(symbol)}&period=${encodeURIComponent(
      period
    )}&limit=${limit}`,
    { cache: "no-store" }
  );
  const data = await jsonOrThrow<{ candles: Candle[] }>(r);
  return data.candles || [];
}

// ====================== Place order ======================
export async function placeOrder(params: {
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  sl?: number;
  tp?: number;
  comment?: string;
}): Promise<{ success: boolean; ticket?: number; price?: number; retcode?: number; error?: string }> {
  const r = await fetch("/api/mt5/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      side: params.type,
      volume: params.volume,
      sl: params.sl,
      tp: params.tp,
      comment: params.comment || "BFX-AI",
    }),
  });
  return jsonOrThrow(r);
}

// ====================== Close position ======================
export async function closePosition(
  ticket: number
): Promise<{ success: boolean; pnl?: number; error?: string }> {
  const r = await fetch(`/api/mt5/close?ticket=${ticket}`, {
    method: "POST",
  });
  return jsonOrThrow(r);
}

// ====================== Close all positions ======================
export async function closeAllPositions(): Promise<{
  closed: number;
  totalPnL: number;
}> {
  const r = await fetch("/api/mt5/close-all", { method: "POST" });
  return jsonOrThrow(r);
}

// ====================== AI Prediction Terminal ======================
export interface AgentVote {
  id: string;
  name: string;
  vote: "BUY" | "SELL" | "HOLD";
  confidence: number; // 0..1
  reasoning: string;
  weight: number;
}

export interface AIPrediction {
  symbol: string;
  timeframe: string;
  nextCandle: {
    direction: "BUY" | "SELL" | "HOLD";
    confidence: number; // 0..1
    open: number;
    high: number;
    low: number;
    close: number;
    expectedMovePct: number;
  };
  agents: AgentVote[];
  ensemble: {
    buyVotes: number;
    sellVotes: number;
    holdVotes: number;
    weightedScore: number; // -1..1
    finalDecision: "BUY" | "SELL" | "HOLD";
    finalConfidence: number; // 0..1
  };
  monteCarlo: {
    simulations: number;
    bullishRatio: number;
    expectedPrice: number;
    stdDev: number;
    percentile95Up: number;
    percentile95Down: number;
    paths: number[][];
  };
  kelly: {
    fraction: number;
    recommendedRiskPct: number;
  };
  timestamp: number;
  lastCandleClose: number;
}

export async function fetchAIPrediction(
  symbol: string,
  period: string,
  candles: Candle[]
): Promise<AIPrediction> {
  const r = await fetch("/api/ai-agents/terminal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, period, candles }),
  });
  return jsonOrThrow<AIPrediction>(r);
}
