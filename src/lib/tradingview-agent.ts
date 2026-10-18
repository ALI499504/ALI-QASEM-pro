// Hidden TradingView Monitor Agent
// ====================================================================
// Runs in background — receives all incoming TradingView alerts and:
// 1. Validates them (symbol, side, timeframe)
// 2. Combines with our SMC/ICT multi-agent consensus
// 3. Decides whether to execute on MT5
// 4. Stores decisions in memory for the MT5 terminal to display
//
// The agent is HIDDEN — no visual cards. Only its decisions surface
// as alerts in the MT5 terminal toolbox "Alerts" or "TV Signals" tab.

import { runMultiAgentCycle, getMultiAgentState } from "@/lib/multi-agent-system";
import { getBridgeConfig, sendMTOrder } from "@/lib/mt-bridge";

export interface TVSignal {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  strategy: string;
  price: number;
  timeframe: string;
  indicators: Record<string, any>;
  note: string;
  timestamp: number;
  raw?: any;
}

export interface TVAgentDecision {
  signalId: string;
  action: "EXECUTE" | "WAIT" | "REJECT" | "ALERT_ONLY";
  reason: string;
  consensusAligned: boolean;        // does it align with our SMC/ICT consensus?
  confidence: number;                // 0..100
  mt5OrderSent: boolean;
  mt5OrderResult?: any;
  timestamp: number;
}

// === In-memory storage ===
let signals: TVSignal[] = [];
let decisions: Map<string, TVAgentDecision> = new Map();
let lastAgentRun: number = 0;

// === Public API ===
export function getTVSignals(): TVSignal[] {
  return [...signals].sort((a, b) => b.timestamp - a.timestamp);
}

export function getTVDecisions(): TVAgentDecision[] {
  return Array.from(decisions.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export function clearTVSignals() {
  signals = [];
  decisions.clear();
}

// === Main entry: process incoming TV signal ===
export async function processTradingViewSignal(signal: TVSignal): Promise<TVAgentDecision> {
  // Generate unique ID
  if (!signal.id) {
    signal.id = `tv-${signal.timestamp}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // Store signal (keep last 100)
  signals.unshift(signal);
  if (signals.length > 100) signals = signals.slice(0, 100);

  // Get current multi-agent consensus (force refresh if stale > 45s)
  let consensus = getMultiAgentState().consensus;
  if (Date.now() - lastAgentRun > 45_000) {
    try {
      await runMultiAgentCycle(1000);
      consensus = getMultiAgentState().consensus;
      lastAgentRun = Date.now();
    } catch {}
  }

  // === Decision logic ===
  // Check if TV signal aligns with our SMC/ICT consensus
  const consensusSide =
    consensus.verdict === "BUY" ? "buy" :
    consensus.verdict === "SELL" ? "sell" : null;

  const consensusAligned =
    consensusSide === signal.side && consensus.confidence > 40;

  // Determine action
  let action: TVAgentDecision["action"] = "WAIT";
  let reason = "";
  let confidence = 0;

  if (consensusAligned && consensus.confidence >= 50) {
    // Both TV and our agents agree → EXECUTE
    action = "EXECUTE";
    confidence = Math.min(100, consensus.confidence + 15);
    reason = `TradingView "${signal.strategy}" aligned with our SMC consensus (${consensus.verdict} ${consensus.confidence}%). Combined confidence: ${confidence}%.`;
  } else if (consensusAligned) {
    // Aligned but low confidence → ALERT_ONLY
    action = "ALERT_ONLY";
    confidence = consensus.confidence + 10;
    reason = `TradingView "${signal.strategy}" aligned with our consensus (${consensus.verdict} ${consensus.confidence}%) but confidence below execution threshold (50%). Alert only.`;
  } else if (consensus.verdict === "WAIT") {
    // Our agents say WAIT → reject TV signal
    action = "REJECT";
    confidence = 30;
    reason = `TradingView "${signal.strategy}" signal rejected. Our SMC agents are in WAIT mode (no A+ setup). Reason: ${consensus.reasoning}`;
  } else {
    // TV signal conflicts with our consensus → REJECT
    action = "REJECT";
    confidence = 20;
    reason = `TradingView "${signal.strategy}" conflicts with our SMC consensus (${consensus.verdict} ${consensus.confidence}%). TV says ${signal.side.toUpperCase()}, our agents say ${consensusSide?.toUpperCase() ?? "WAIT"}. Not aligned.`;
  }

  // === Execute if approved ===
  let mt5OrderSent = false;
  let mt5OrderResult: any = undefined;

  if (action === "EXECUTE") {
    const bridgeConfigured = Boolean(getBridgeConfig());
    if (bridgeConfigured) {
      // Send order to MT5
      try {
        const lotSize = 0.01; // default to 1% risk on $1000
        const sl = signal.side === "buy" ? signal.price - 10 : signal.price + 10;
        const tp = signal.side === "buy" ? signal.price + 30 : signal.price - 30;
        const result = await sendMTOrder({
          symbol: signal.symbol,
          side: signal.side === "buy" ? "BUY" : "SELL",
          volume: lotSize,
          sl,
          tp,
          comment: `TV: ${signal.strategy.slice(0, 30)}`,
        });
        mt5OrderSent = result.success;
        mt5OrderResult = result;
      } catch (e: any) {
        mt5OrderResult = { error: e?.message };
      }
    } else {
      // MT5 not connected — keep as alert only
      action = "ALERT_ONLY";
      reason += " (MT5 bridge not connected — alert only, no execution)";
    }
  }

  const decision: TVAgentDecision = {
    signalId: signal.id,
    action,
    reason,
    consensusAligned,
    confidence,
    mt5OrderSent,
    mt5OrderResult,
    timestamp: Date.now(),
  };

  decisions.set(signal.id, decision);
  // Keep only last 100 decisions
  if (decisions.size > 100) {
    const oldest = Array.from(decisions.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < oldest.length - 100; i++) {
      decisions.delete(oldest[i][0]);
    }
  }

  return decision;
}

// === Background loop: refresh agent consensus every 45s ===
let loopStarted = false;
export function startTVAgentLoop() {
  if (loopStarted) return;
  loopStarted = true;

  // Initial run
  runMultiAgentCycle(1000).catch(() => {});
  lastAgentRun = Date.now();

  setInterval(() => {
    if (Date.now() - lastAgentRun > 45_000) {
      runMultiAgentCycle(1000).catch(() => {});
      lastAgentRun = Date.now();
    }
  }, 30_000);
}
