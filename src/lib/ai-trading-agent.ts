// Advanced AI Trading Agent — institutional-grade autonomous trading manager
// ====================================================================
// The agent operates as a state machine that continuously:
//   1. Monitors market data (price, candles, indicators)
//   2. Runs the SMC Strict strategy
//   3. Generates AI commentary via GLM-4
//   4. Makes decisions: WAIT / PREPARE / ENTER / MANAGE / EXIT
//   5. Manages risk: daily loss limits, max concurrent trades, cooldown
//   6. Executes trades on MT5 (in SEMI_AUTO or FULL_AUTO mode)
//
// Modes:
//   - MANUAL:     Agent suggests, user executes manually
//   - SEMI_AUTO:  Agent prepares order, user confirms in modal
//   - FULL_AUTO:  Agent executes automatically when conditions met
//
// States:
//   - IDLE:              Waiting for next analysis cycle
//   - SCANNING:          Running strategy check
//   - OPPORTUNITY_FOUND: Setup detected, awaiting decision
//   - IN_POSITION:       Has open position, managing it
//   - COOLDOWN:          After loss/close, waiting before next trade
//   - PAUSED:            User paused the agent
//
// Risk Limits (institutional defaults):
//   - Max daily loss: 3% of account ($30 on $1000)
//   - Max concurrent trades: 1 (focus mode)
//   - Cooldown after loss: 4 hours
//   - Max trades per day: 5

import { computeSMCStrictSignal, type SMCStrictResult } from "@/lib/smc-strict-strategy";
import { generateSMCStrictAIAnalysis, type SMCStrictAIAnalysis } from "@/lib/smc-strict-ai";
import { getBridgeConfig, fetchMTPositions, sendMTOrder, closeMTPosition } from "@/lib/mt-bridge";

export type AgentMode = "MANUAL" | "SEMI_AUTO" | "FULL_AUTO";
export type AgentState = "IDLE" | "SCANNING" | "OPPORTUNITY_FOUND" | "IN_POSITION" | "COOLDOWN" | "PAUSED";

export interface AgentDecision {
  action: "WAIT" | "PREPARE_ENTRY" | "ENTER" | "MANAGE_POSITION" | "EXIT" | "COOLDOWN";
  reasoning: string;
  confidence: number;        // 0..100
  urgency: "low" | "medium" | "high";
  tradeToExecute?: SMCStrictResult["trade"];
  nextActionIn?: number;     // seconds until next action
}

export interface AgentMemory {
  // Trade history (last 20)
  tradeHistory: {
    timestamp: number;
    type: "BUY" | "SELL";
    entry: number;
    exit?: number;
    pnl?: number;
    outcome: "WIN" | "LOSS" | "OPEN" | "CANCELLED";
    reason: string;
  }[];
  // Daily stats
  dailyPnl: number;
  dailyTrades: number;
  dailyLossLimit: number;        // 3% = $30 on $1000
  dailyLossLimitPct: number;     // 3.0
  maxDailyTrades: number;
  // Cooldown
  lastLossTimestamp: number | null;
  cooldownMs: number;             // 4 hours
  // Current position (if any)
  currentPosition: {
    ticket: number;
    type: "BUY" | "SELL";
    symbol: string;
    volume: number;
    entry: number;
    sl: number;
    tp: number;
    openTime: number;
    currentPrice: number;
    floatingPL: number;
  } | null;
}

export interface AgentStatus {
  mode: AgentMode;
  state: AgentState;
  decision: AgentDecision;
  memory: AgentMemory;
  strategyResult: SMCStrictResult | null;
  aiAnalysis: SMCStrictAIAnalysis | null;
  lastUpdate: number;
  isThinking: boolean;
}

// === Default memory ===
function createDefaultMemory(accountBalance: number): AgentMemory {
  return {
    tradeHistory: [],
    dailyPnl: 0,
    dailyTrades: 0,
    dailyLossLimit: accountBalance * 0.03, // 3% hard cap
    dailyLossLimitPct: 3.0,
    maxDailyTrades: 5,
    lastLossTimestamp: null,
    cooldownMs: 4 * 60 * 60 * 1000, // 4 hours
    currentPosition: null,
  };
}

// === In-memory agent state (singleton per server instance) ===
let agentState: AgentStatus = {
  mode: "MANUAL",
  state: "IDLE",
  decision: {
    action: "WAIT",
    reasoning: "Agent initialized. Awaiting first scan.",
    confidence: 0,
    urgency: "low",
  },
  memory: createDefaultMemory(1000),
  strategyResult: null,
  aiAnalysis: null,
  lastUpdate: Date.now(),
  isThinking: false,
};

let accountBalance: number = 1000;

// === Public API ===
export function getAgentStatus(): AgentStatus {
  return { ...agentState, memory: { ...agentState.memory } };
}

export function setAgentMode(mode: AgentMode): AgentStatus {
  agentState.mode = mode;
  if (mode === "PAUSED" as any) {
    agentState.state = "PAUSED";
  } else if (agentState.state === "PAUSED") {
    agentState.state = "IDLE";
  }
  agentState.lastUpdate = Date.now();
  return getAgentStatus();
}

export function pauseAgent(): AgentStatus {
  agentState.state = "PAUSED";
  agentState.lastUpdate = Date.now();
  return getAgentStatus();
}

export function resumeAgent(): AgentStatus {
  if (agentState.state === "PAUSED") {
    agentState.state = "IDLE";
  }
  agentState.lastUpdate = Date.now();
  return getAgentStatus();
}

export function resetAgentMemory(): AgentStatus {
  agentState.memory = createDefaultMemory(accountBalance);
  agentState.state = "IDLE";
  agentState.lastUpdate = Date.now();
  return getAgentStatus();
}

// === Core: run analysis + make decision ===
export async function runAgentCycle(balance: number = 1000): Promise<AgentStatus> {
  if (agentState.state === "PAUSED") {
    return getAgentStatus();
  }

  accountBalance = balance;
  agentState.isThinking = true;
  agentState.state = "SCANNING";
  agentState.lastUpdate = Date.now();

  try {
    // Step 1: Run the SMC strict strategy
    const strategy = await computeSMCStrictSignal(balance);
    agentState.strategyResult = strategy;

    // Step 2: Generate AI commentary
    const ai = await generateSMCStrictAIAnalysis(strategy);
    agentState.aiAnalysis = ai;

    // Step 3: Check MT5 for open positions
    let openPosition = agentState.memory.currentPosition;
    try {
      if (getBridgeConfig()) {
        const positions = await fetchMTPositions();
        if (positions.length > 0) {
          const p = positions[0]; // single-position mode
          openPosition = {
            ticket: p.ticket,
            type: p.type,
            symbol: p.symbol,
            volume: p.volume,
            entry: p.priceOpen,
            sl: p.sl,
            tp: p.tp,
            openTime: p.time * 1000,
            currentPrice: p.priceCurrent,
            floatingPL: p.profit,
          };
        } else {
          openPosition = null;
        }
        agentState.memory.currentPosition = openPosition;
      }
    } catch {}

    // Step 4: Make a decision
    const decision = makeDecision(strategy, ai, openPosition);
    agentState.decision = decision;

    // Step 5: Update state based on decision
    if (openPosition) {
      agentState.state = "IN_POSITION";
      // In FULL_AUTO mode, manage the position (e.g., close if hit TP/SL or conditions changed)
      if (agentState.mode === "FULL_AUTO") {
        await maybeManagePosition(openPosition, strategy, decision);
      }
    } else if (strategy.hasSetup && strategy.trade) {
      agentState.state = "OPPORTUNITY_FOUND";
      // In FULL_AUTO mode, execute the trade
      if (agentState.mode === "FULL_AUTO" && decision.action === "ENTER") {
        await maybeExecuteTrade(strategy, decision);
      }
    } else if (agentState.memory.lastLossTimestamp &&
               Date.now() - agentState.memory.lastLossTimestamp < agentState.memory.cooldownMs) {
      agentState.state = "COOLDOWN";
    } else {
      agentState.state = "IDLE";
    }

    agentState.lastUpdate = Date.now();
    return getAgentStatus();
  } catch (e: any) {
    agentState.decision = {
      action: "WAIT",
      reasoning: `Agent cycle failed: ${e?.message || "unknown error"}`,
      confidence: 0,
      urgency: "low",
    };
    agentState.state = "IDLE";
    agentState.lastUpdate = Date.now();
    return getAgentStatus();
  } finally {
    agentState.isThinking = false;
  }
}

// === Decision-making logic ===
function makeDecision(
  strategy: SMCStrictResult,
  ai: SMCStrictAIAnalysis,
  openPosition: AgentMemory["currentPosition"]
): AgentDecision {
  // If we have an open position → manage it
  if (openPosition) {
    const isBuy = openPosition.type === "BUY";
    const currentPrice = openPosition.currentPrice;
    const slDistance = Math.abs(openPosition.entry - openPosition.sl);
    const tpDistance = Math.abs(openPosition.tp - openPosition.entry);
    const currentPnLDist = isBuy
      ? (currentPrice - openPosition.entry)
      : (openPosition.entry - currentPrice);

    // Check if we should exit (signal reversed or SL/SL hit)
    if (strategy.hasSetup && strategy.trade && strategy.trade.type !== openPosition.type) {
      return {
        action: "EXIT",
        reasoning: `Signal reversed to ${strategy.trade.type}. Current position ${openPosition.type} should be closed to avoid counter-trend exposure.`,
        confidence: 85,
        urgency: "high",
      };
    }

    // Check if SL hit
    if (isBuy && currentPrice <= openPosition.sl) {
      return {
        action: "EXIT",
        reasoning: `Stop Loss hit at $${currentPrice.toFixed(2)}. Position should be closed.`,
        confidence: 95,
        urgency: "high",
      };
    }
    if (!isBuy && currentPrice >= openPosition.sl) {
      return {
        action: "EXIT",
        reasoning: `Stop Loss hit at $${currentPrice.toFixed(2)}. Position should be closed.`,
        confidence: 95,
        urgency: "high",
      };
    }

    // Check if TP hit
    if (isBuy && currentPrice >= openPosition.tp) {
      return {
        action: "EXIT",
        reasoning: `Take Profit target reached at $${currentPrice.toFixed(2)}. Booking profit.`,
        confidence: 95,
        urgency: "high",
      };
    }
    if (!isBuy && currentPrice <= openPosition.tp) {
      return {
        action: "EXIT",
        reasoning: `Take Profit target reached at $${currentPrice.toFixed(2)}. Booking profit.`,
        confidence: 95,
        urgency: "high",
      };
    }

    // Position is healthy — manage it
    const progressPct = slDistance > 0 ? (currentPnLDist / tpDistance) * 100 : 0;
    return {
      action: "MANAGE_POSITION",
      reasoning: `Position ${openPosition.type} ${openPosition.symbol} running. Progress: ${progressPct.toFixed(1)}% to TP. Floating P/L: $${openPosition.floatingPL.toFixed(2)}. Holding per plan.`,
      confidence: 70,
      urgency: "low",
      nextActionIn: 60,
    };
  }

  // No open position — look for new opportunity
  if (strategy.hasSetup && strategy.trade) {
    // Check risk limits
    if (agentState.memory.dailyTrades >= agentState.memory.maxDailyTrades) {
      return {
        action: "WAIT",
        reasoning: `Daily trade limit reached (${agentState.memory.maxDailyTrades} trades). Reset tomorrow.`,
        confidence: 100,
        urgency: "low",
      };
    }

    if (agentState.memory.dailyPnl <= -agentState.memory.dailyLossLimit) {
      return {
        action: "WAIT",
        reasoning: `Daily loss limit hit ($${agentState.memory.dailyPnl.toFixed(2)}). Stop trading for today.`,
        confidence: 100,
        urgency: "high",
      };
    }

    // Check cooldown
    if (agentState.memory.lastLossTimestamp &&
        Date.now() - agentState.memory.lastLossTimestamp < agentState.memory.cooldownMs) {
      const remaining = Math.ceil((agentState.memory.cooldownMs - (Date.now() - agentState.memory.lastLossTimestamp)) / 60000);
      return {
        action: "COOLDOWN",
        reasoning: `Cooldown after loss. ${remaining} minutes remaining before next trade.`,
        confidence: 100,
        urgency: "low",
        nextActionIn: remaining * 60,
      };
    }

    // Opportunity detected — decide action based on mode
    const action = agentState.mode === "FULL_AUTO" ? "ENTER" : "PREPARE_ENTRY";
    return {
      action,
      reasoning: `A+ setup detected: ${strategy.trade.type} @ $${strategy.trade.entry.toFixed(2)} | R:R 1:${strategy.trade.rrRatio.toFixed(2)} | Risk $${strategy.trade.riskAmount.toFixed(2)} (${strategy.trade.riskPercent}%). AI verdict: ${ai.finalVerdict}. Ready for ${agentState.mode === "FULL_AUTO" ? "automatic execution" : "user confirmation"}.`,
      confidence: Math.min(100, 80 + Math.max(0, ai.confidenceAdjustment)),
      urgency: "medium",
      tradeToExecute: strategy.trade,
      nextActionIn: 30,
    };
  }

  // No opportunity — wait
  return {
    action: "WAIT",
    reasoning: strategy.notSetupReason ?? "No A+ setup detected. Waiting for next scan.",
    confidence: 0,
    urgency: "low",
    nextActionIn: 60,
  };
}

// === Auto-execution helpers ===
async function maybeExecuteTrade(strategy: SMCStrictResult, decision: AgentDecision) {
  if (!strategy.trade || !getBridgeConfig()) return;
  try {
    const result = await sendMTOrder({
      symbol: "XAUUSD",
      side: strategy.trade.type,
      volume: strategy.trade.lotSize,
      sl: strategy.trade.stopLoss,
      tp: strategy.trade.takeProfit3,
      comment: `M.ROBOT Agent AUTO (${strategy.trade.riskPercent}% risk)`,
    });
    if (result.success) {
      // Update memory: increment daily trades
      agentState.memory.dailyTrades++;
      agentState.memory.tradeHistory.unshift({
        timestamp: Date.now(),
        type: strategy.trade.type,
        entry: strategy.trade.entry,
        outcome: "OPEN",
        reason: `Auto-executed @ ${result.price ?? strategy.trade.entry}`,
      });
      if (agentState.memory.tradeHistory.length > 20) {
        agentState.memory.tradeHistory = agentState.memory.tradeHistory.slice(0, 20);
      }
    }
  } catch {}
}

async function maybeManagePosition(
  openPosition: NonNullable<AgentMemory["currentPosition"]>,
  strategy: SMCStrictResult,
  decision: AgentDecision
) {
  if (decision.action !== "EXIT" || !getBridgeConfig()) return;
  try {
    const result = await closeMTPosition(openPosition.ticket);
    if (result.success) {
      // Record outcome
      const pnl = openPosition.floatingPL;
      agentState.memory.tradeHistory.unshift({
        timestamp: Date.now(),
        type: openPosition.type,
        entry: openPosition.entry,
        exit: openPosition.currentPrice,
        pnl,
        outcome: pnl >= 0 ? "WIN" : "LOSS",
        reason: decision.reasoning,
      });
      agentState.memory.dailyPnl += pnl;
      if (pnl < 0) {
        agentState.memory.lastLossTimestamp = Date.now();
      }
      agentState.memory.currentPosition = null;
    }
  } catch {}
}

// === Background agent loop (runs every 30s in server memory) ===
let agentLoopRunning = false;

export function startAgentLoop(balance: number = 1000) {
  if (agentLoopRunning) return;
  agentLoopRunning = true;

  // Run initial cycle
  runAgentCycle(balance).catch(() => {});

  // Schedule recurring cycles every 30s
  setInterval(() => {
    if (agentState.state !== "PAUSED") {
      runAgentCycle(balance).catch(() => {});
    }
  }, 30_000);
}

// === Get performance summary ===
export function getPerformanceSummary(): {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldTimeMin: number;
} {
  const history = agentState.memory.tradeHistory.filter(t => t.outcome === "WIN" || t.outcome === "LOSS");
  const wins = history.filter(t => t.outcome === "WIN");
  const losses = history.filter(t => t.outcome === "LOSS");
  const totalPnl = history.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const pnls = history.map(t => t.pnl ?? 0);

  return {
    totalTrades: history.length,
    wins: wins.length,
    losses: losses.length,
    winRate: history.length > 0 ? Math.round((wins.length / history.length) * 100) : 0,
    totalPnl,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
    avgHoldTimeMin: 0, // would need close timestamps to compute
  };
}
