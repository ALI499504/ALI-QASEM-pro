// Multi-Agent Trading System — 6 specialized professional agents
// ====================================================================
// Inspired by OctoBot + Freqtrade + BlackRock Aladdin + 3Commas
//
// Each agent has:
//   - Specific role and expertise
//   - Own state and memory
//   - Inputs from other agents
//   - Outputs (decisions + confidence + commentary)
//   - Runs in parallel with the orchestrator
//
// The Orchestrator coordinates all 6 agents and produces a final
// consensus decision (BUY/SELL/WAIT) with weighted confidence.
//
// Architecture:
//   ┌─ 1. Market Analyst ──────── HTF Trend + Regime + News + Session
//   ├─ 2. SMC/ICT Strategist ──── Liquidity + CHoCH + FVG/OB + Checklist
//   ├─ 3. Risk Manager ────────── Position Sizing + R:R + Daily Limits
//   ├─ 4. AI Decision Maker ──── GLM-4 Aggregator + Final Verdict
//   ├─ 5. Execution Agent ────── MT5 Order Coordination
//   └─ 6. Performance Monitor ── Metrics + Patterns + Optimization

import { computeSMCStrictSignal, type SMCStrictResult } from "@/lib/smc-strict-strategy";
import { generateSMCStrictAIAnalysis, type SMCStrictAIAnalysis } from "@/lib/smc-strict-ai";
import { fetchRealCandles, type KlineInterval } from "@/lib/binance-gold";
import { getBridgeConfig, fetchMTPositions } from "@/lib/mt-bridge";
import type { Candle } from "@/lib/indicators";

// === Agent types ===
export type AgentType =
  | "market_analyst"
  | "smc_strategist"
  | "risk_manager"
  | "ai_decision"
  | "execution"
  | "performance_monitor";

export interface AgentOutput {
  agentId: AgentType;
  name: string;
  nameAr: string;
  status: "idle" | "scanning" | "active" | "blocked" | "executed";
  confidence: number;            // 0..100
  output: any;                    // agent-specific data
  commentary: string;            // professional narrative
  reasoning: string;             // why this output
  timestamp: number;
}

export interface MultiAgentState {
  agents: AgentOutput[];
  consensus: {
    verdict: "BUY" | "SELL" | "WAIT";
    confidence: number;
    reasoning: string;
    agreement: number;           // 0..100% (how aligned agents are)
  };
  isRunning: boolean;
  lastCycle: number;
}

let agentState: MultiAgentState = {
  agents: [],
  consensus: {
    verdict: "WAIT",
    confidence: 0,
    reasoning: "System initializing. Awaiting first cycle.",
    agreement: 0,
  },
  isRunning: false,
  lastCycle: Date.now(),
};

// === Helpers ===
function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

function detectTrend(candles: Candle[]): "bullish" | "bearish" | "ranging" {
  if (candles.length < 50) return "ranging";
  const closes = candles.map((c) => c.close);
  const ema50 = ema(closes, 50);
  const ema100 = ema(closes, Math.min(100, closes.length));
  const lastEma50 = ema50.at(-1) ?? 0;
  const lastEma100 = ema100.at(-1) ?? 0;
  const lastPrice = closes.at(-1) ?? 0;
  if (lastPrice > lastEma50 && lastEma50 > lastEma100) return "bullish";
  if (lastPrice < lastEma50 && lastEma50 < lastEma100) return "bearish";
  return "ranging";
}

function getSession(): { name: string; color: string; activity: "low" | "medium" | "high" } {
  const h = new Date().getUTCHours();
  if (h >= 0 && h < 7) return { name: "ASIA", color: "#a78bfa", activity: "medium" };
  if (h >= 7 && h < 12) return { name: "LONDON", color: "#10b981", activity: "high" };
  if (h >= 12 && h < 21) return { name: "NEW YORK", color: "#5b8cff", activity: "high" };
  return { name: "ASIA", color: "#a78bfa", activity: "medium" };
}

function detectRegime(candles: Candle[]): "trending" | "ranging" | "volatile" {
  if (candles.length < 30) return "ranging";
  const closes = candles.map((c) => c.close);
  const recent = closes.slice(-30);
  const mean = recent.reduce((s, x) => s + x, 0) / recent.length;
  const variance = recent.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / recent.length;
  const stdDev = Math.sqrt(variance);
  const avgRange = candles.slice(-20).reduce((s, c) => s + (c.high - c.low), 0) / 20;
  const cv = (stdDev / mean) * 100;
  if (cv > 1.5 || avgRange / mean > 0.005) return "volatile";
  // Simple ADX approximation
  const directionalMoves = recent.filter((v, i) => i > 0 && Math.abs(v - recent[i - 1]) > stdDev * 0.5).length;
  if (directionalMoves > 15) return "trending";
  return "ranging";
}

// ============================================================================
// AGENT 1: Market Analyst
// Analyzes macro market context (HTF trend, regime, sessions, correlation)
// ============================================================================
async function marketAnalyst(): Promise<AgentOutput> {
  try {
    const [daily, h4, h1] = await Promise.all([
      fetchRealCandles("1d" as KlineInterval, 200),
      fetchRealCandles("4h" as KlineInterval, 200),
      fetchRealCandles("1h" as KlineInterval, 200),
    ]);

    const dailyTrend = detectTrend(daily);
    const h4Trend = detectTrend(h4);
    const h1Trend = detectTrend(h1);
    const regime = detectRegime(h1);
    const session = getSession();

    // Determine bias (alignment of HTF)
    const allBullish = dailyTrend === "bullish" && h4Trend === "bullish" && h1Trend === "bullish";
    const allBearish = dailyTrend === "bearish" && h4Trend === "bearish" && h1Trend === "bearish";
    const bias = allBullish ? "LONG" : allBearish ? "SHORT" : "NEUTRAL";
    const confidence = allBullish || allBearish ? 90 : 40;

    const output = {
      dailyTrend, h4Trend, h1Trend, regime, session, bias,
      agreement: allBullish || allBearish,
    };

    return {
      agentId: "market_analyst",
      name: "Market Analyst",
      nameAr: "محلل السوق",
      status: "active",
      confidence,
      output,
      commentary: `السوق يعرض ${dailyTrend === "bullish" ? "صعود" : dailyTrend === "bearish" ? "هبوط" : "تذبذب"} على الفريم اليومي مع ${h4Trend === "bullish" ? "صعود" : h4Trend === "bearish" ? "هبوط" : "تذبذب"} على 4 ساعات. النظام العام: ${regime === "trending" ? "ترند واضح" : regime === "volatile" ? "تذبذب عالي" : "تذبذب جانبي"}. الجلسة الحالية: ${session.name}.`,
      reasoning: bias === "NEUTRAL"
        ? "الاتجاهات غير متوافقة على الفريمات الكبرى — يُفضل انتظار توافقها قبل البحث عن فرص"
        : `توافق ${bias === "LONG" ? "صاعد" : "هابط"} على 3 فريمات (Daily + 4H + 1H) — البيئة مواتية للبحث عن صفقات ${bias === "LONG" ? "شراء" : "بيع"}`,
      timestamp: Date.now(),
    };
  } catch (e: any) {
    return {
      agentId: "market_analyst",
      name: "Market Analyst",
      nameAr: "محلل السوق",
      status: "blocked",
      confidence: 0,
      output: {},
      commentary: `فشل التحليل: ${e?.message || "unknown error"}`,
      reasoning: "Data unavailable",
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// AGENT 2: SMC/ICT Strategist
// Runs the strict 5-condition SMC strategy
// ============================================================================
async function smcStrategist(accountBalance: number): Promise<{ output: AgentOutput; strategy: SMCStrictResult | null }> {
  try {
    const strategy = await computeSMCStrictSignal(accountBalance);
    const conditions = strategy.conditions;
    const passedCount = [conditions.htfTrend.passed, conditions.liquiditySweep.passed, conditions.choch.passed, conditions.entryZone.passed, conditions.riskReward.passed].filter(Boolean).length;
    const confidence = (passedCount / 5) * 100;

    return {
      output: {
        agentId: "smc_strategist",
        name: "SMC/ICT Strategist",
        nameAr: "استراتيجي SMC",
        status: strategy.hasSetup ? "active" : "scanning",
        confidence,
        output: {
          hasSetup: strategy.hasSetup,
          trade: strategy.trade,
          conditions: strategy.conditions,
          passedCount,
        },
        commentary: strategy.hasSetup
          ? `تم اكتشاف إعداد A+! ${strategy.trade!.type} @ $${strategy.trade!.entry.toFixed(2)} مع R:R 1:${strategy.trade!.rrRatio.toFixed(2)} وتحقيق ${passedCount}/5 شروط.`
          : `لا يوجد إعداد مكتمل حالياً. تحققت ${passedCount}/5 شروط. السبب: ${strategy.notSetupReason}`,
        reasoning: strategy.hasSetup
          ? "تكامل 5 شروط SMC صارمة: HTF Trend + Liquidity Sweep + CHoCH + FVG/OB + R:R ≥ 1:3"
          : "الشرط المفقود يمنع التنفيذ — نلتزم بالصارم وفق مدرسة ICT",
        timestamp: Date.now(),
      },
      strategy,
    };
  } catch (e: any) {
    return {
      output: {
        agentId: "smc_strategist",
        name: "SMC/ICT Strategist",
        nameAr: "استراتيجي SMC",
        status: "blocked",
        confidence: 0,
        output: {},
        commentary: `فشل التحليل الاستراتيجي: ${e?.message}`,
        reasoning: "Strategy execution failed",
        timestamp: Date.now(),
      },
      strategy: null,
    };
  }
}

// ============================================================================
// AGENT 3: Risk Manager
// Validates position sizing, R:R, daily limits
// ============================================================================
function riskManager(strategy: SMCStrictResult | null, accountBalance: number, dailyPnl: number, dailyTrades: number): AgentOutput {
  // Default state when no setup
  if (!strategy?.hasSetup || !strategy.trade) {
    return {
      agentId: "risk_manager",
      name: "Risk Manager",
      nameAr: "مدير المخاطر",
      status: "idle",
      confidence: 100,
      output: {
        approved: false,
        reason: "لا يوجد إعداد للموافقة عليه",
      },
      commentary: "لا توجد صفقة قيد المراجعة. النظام في وضع المراقبة.",
      reasoning: "Risk Manager نشط بانتظار إعداد صالح للمراجعة",
      timestamp: Date.now(),
    };
  }

  const trade = strategy.trade;
  const riskAmount = accountBalance * 0.01;
  const slDistance = Math.abs(trade.entry - trade.stopLoss);
  const tpDistance = Math.abs(trade.takeProfit3 - trade.entry);
  const rrRatio = slDistance > 0 ? tpDistance / slDistance : 0;

  const checks: { name: string; passed: boolean; detail: string }[] = [
    { name: "1% Risk Rule", passed: trade.riskAmount <= riskAmount, detail: `$${trade.riskAmount.toFixed(2)} ≤ $${riskAmount.toFixed(2)}` },
    { name: "R:R ≥ 1:3", passed: rrRatio >= 3, detail: `1:${rrRatio.toFixed(2)}` },
    { name: "Daily Loss Limit", passed: dailyPnl > -accountBalance * 0.03, detail: `P/L: $${dailyPnl.toFixed(2)}` },
    { name: "Max Daily Trades", passed: dailyTrades < 5, detail: `${dailyTrades}/5` },
    { name: "SL Distance", passed: slDistance > 0.5, detail: `$${slDistance.toFixed(2)}` },
  ];

  const approved = checks.every((c) => c.passed);
  const passedCount = checks.filter((c) => c.passed).length;
  const confidence = (passedCount / checks.length) * 100;

  return {
    agentId: "risk_manager",
    name: "Risk Manager",
    nameAr: "مدير المخاطر",
    status: approved ? "active" : "blocked",
    confidence,
    output: {
      approved,
      checks,
      lotSize: trade.lotSize,
      riskAmount: trade.riskAmount,
    },
    commentary: approved
      ? `تمت الموافقة على الصفقة. جميع ${checks.length} فحوصات مخاطر نجحت. حجم اللوت: ${trade.lotSize.toFixed(3)}، مخاطرة: $${trade.riskAmount.toFixed(2)} (1%).`
      : `تم رفض الصفقة. فشلت ${checks.length - passedCount} فحوصات مخاطر. يجب الالتزام بحدود الإدارة الصارمة.`,
    reasoning: approved
      ? "كل المعايير المؤسسية محققة: 1% Rule + R:R ≥ 1:3 + Daily Limits + SL Distance"
      : `الفحوصات الفاشلة: ${checks.filter((c) => !c.passed).map((c) => c.name).join(", ")}`,
    timestamp: Date.now(),
  };
}

// ============================================================================
// AGENT 4: AI Decision Maker
// Aggregates all agents + calls GLM-4 for final verdict
// ============================================================================
async function aiDecisionMaker(
  analyst: AgentOutput,
  strategist: AgentOutput,
  risk: AgentOutput,
  strategy: SMCStrictResult | null
): Promise<{ output: AgentOutput; aiAnalysis: SMCStrictAIAnalysis | null }> {
  try {
    // First generate AI analysis from the strategy
    let aiAnalysis: SMCStrictAIAnalysis | null = null;
    if (strategy) {
      aiAnalysis = await generateSMCStrictAIAnalysis(strategy);
    }

    // Determine final verdict based on all agents
    const analystBias = analyst.output.bias;
    const strategistHasSetup = strategist.output.hasSetup;
    const riskApproved = risk.output.approved;
    const aiVerdict = aiAnalysis?.finalVerdict ?? "WAIT";

    // Consensus: all must agree on BUY or all on SELL
    let finalVerdict: "BUY" | "SELL" | "WAIT" = "WAIT";
    let confidence = 0;
    let agreement = 0;

    if (strategistHasSetup && riskApproved && strategy?.trade) {
      const tradeType = strategy.trade.type;
      const analystAgrees = (analystBias === "LONG" && tradeType === "BUY") || (analystBias === "SHORT" && tradeType === "SELL");
      const aiAgrees = aiVerdict === tradeType;

      if (analystAgrees && aiAgrees) {
        finalVerdict = tradeType;
        confidence = 90;
        agreement = 100;
      } else if (analystAgrees || aiAgrees) {
        finalVerdict = tradeType;
        confidence = 65;
        agreement = 75;
      } else {
        finalVerdict = "WAIT";
        confidence = 30;
        agreement = 40;
      }
    }

    return {
      output: {
        agentId: "ai_decision",
        name: "AI Decision Maker",
        nameAr: "وكيل AI",
        status: finalVerdict === "WAIT" ? "scanning" : "active",
        confidence,
        output: {
          finalVerdict,
          agreement,
          aiVerdict,
          analystBias,
          strategistHasSetup,
          riskApproved,
        },
        commentary: aiAnalysis?.marketNarrative || `القرار النهائي: ${finalVerdict} بمستوى ثقة ${confidence}%.`,
        reasoning: finalVerdict === "WAIT"
          ? "لا يوجد توافق كامل بين الوكلاء — ننتظر اكتمال الإشارة"
          : `توافق ${agreement}% بين الوكلاء الأربعة على قرار ${finalVerdict}`,
        timestamp: Date.now(),
      },
      aiAnalysis,
    };
  } catch (e: any) {
    return {
      output: {
        agentId: "ai_decision",
        name: "AI Decision Maker",
        nameAr: "وكيل AI",
        status: "blocked",
        confidence: 0,
        output: {},
        commentary: `فشل اتخاذ القرار: ${e?.message}`,
        reasoning: "Decision engine failed",
        timestamp: Date.now(),
      },
      aiAnalysis: null,
    };
  }
}

// ============================================================================
// AGENT 5: Execution Agent
// Handles MT5 order coordination
// ============================================================================
async function executionAgent(
  decision: AgentOutput,
  strategy: SMCStrictResult | null,
  risk: AgentOutput
): Promise<AgentOutput> {
  const bridgeConfigured = Boolean(getBridgeConfig());

  // Check open positions
  let openPositions: any[] = [];
  if (bridgeConfigured) {
    try {
      openPositions = await fetchMTPositions();
    } catch {}
  }

  // If we have open positions, we're in "manage" mode
  if (openPositions.length > 0) {
    return {
      agentId: "execution",
      name: "Execution Agent",
      nameAr: "وكيل التنفيذ",
      status: "executed",
      confidence: 80,
      output: {
        mode: "MANAGE",
        openPositions,
        bridgeConfigured,
      },
      commentary: `يوجد ${openPositions.length} صفقة مفتوحة على MT5. وضع الإدارة نشط — مراقبة SL/TP.`,
      reasoning: "وضع الإدارة: تتبع الصفقات المفتوحة + إغلاق عند الحاجة",
      timestamp: Date.now(),
    };
  }

  // If no setup or not approved → idle
  if (!strategy?.hasSetup || !risk.output.approved || decision.output.finalVerdict === "WAIT") {
    return {
      agentId: "execution",
      name: "Execution Agent",
      nameAr: "وكيل التنفيذ",
      status: "idle",
      confidence: bridgeConfigured ? 80 : 40,
      output: {
        mode: "READY",
        bridgeConfigured,
        ready: bridgeConfigured && decision.output.finalVerdict !== "WAIT",
      },
      commentary: bridgeConfigured
        ? "MT5 Bridge متصل وجاهز للتنفيذ. بانتظار إشارة موافق عليها."
        : "MT5 Bridge غير مهيأ. التنفيذ التلقائي معطّل — اربط الـ bridge أولاً.",
      reasoning: bridgeConfigured
        ? "وضع الاستعداد: بانتظار قرار AI بالموافقة"
        : "الـ bridge غير مهيأ — التنفيذ غير ممكن حالياً",
      timestamp: Date.now(),
    };
  }

  // Ready to execute
  return {
    agentId: "execution",
    name: "Execution Agent",
    nameAr: "وكيل التنفيذ",
    status: "active",
    confidence: 95,
    output: {
      mode: "PREPARE",
      bridgeConfigured,
      ready: true,
      orderToExecute: strategy.trade,
    },
    commentary: `تم تجهيز أمر ${strategy.trade!.type} على MT5 — بانتظار التأكيد اليدوي أو التنفيذ التلقائي. حجم اللوت: ${strategy.trade!.lotSize.toFixed(3)}.`,
    reasoning: "وضع التحضير: قرار الموافقة موجود + الـ bridge متصل + الإعداد جاهز",
    timestamp: Date.now(),
  };
}

// ============================================================================
// AGENT 6: Performance Monitor
// Tracks metrics + provides optimization insights
// ============================================================================
function performanceMonitor(tradeHistory: any[], dailyPnl: number): AgentOutput {
  const closedTrades = tradeHistory.filter((t) => t.outcome === "WIN" || t.outcome === "LOSS");
  const wins = closedTrades.filter((t) => t.outcome === "WIN");
  const losses = closedTrades.filter((t) => t.outcome === "LOSS");
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  const grossProfit = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);

  // Generate recommendations
  const recommendations: string[] = [];
  if (winRate < 40 && closedTrades.length >= 5) {
    recommendations.push("معدل الفوز أقل من 40% — راجع شروط الدخول أو وسّع وقت الانتظار");
  }
  if (profitFactor < 1.5 && closedTrades.length >= 5) {
    recommendations.push("Profit Factor أقل من 1.5 — حسّن إدارة R:R (هدف 1:3 صارم)");
  }
  if (losses.length > 3 && losses.slice(-3).every((t) => t.pnl < 0)) {
    recommendations.push("3 خسائر متتالية — توقف 24 ساعة لمراجعة النظام");
  }
  if (closedTrades.length < 5) {
    recommendations.push("البيانات محدودة — استمر بالتنفيذ المحافظ لجمع عينة كافية");
  }
  if (recommendations.length === 0) {
    recommendations.push("الأداء ضمن النطاق المقبول — واصل الاستراتيجية الحالية");
  }

  return {
    agentId: "performance_monitor",
    name: "Performance Monitor",
    nameAr: "وكيل الأداء",
    status: "active",
    confidence: Math.min(100, 50 + closedTrades.length * 10),
    output: {
      totalTrades: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: Math.round(winRate),
      profitFactor: Math.round(profitFactor * 100) / 100,
      totalPnl,
      dailyPnl,
      bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnl ?? 0)) : 0,
      worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnl ?? 0)) : 0,
      recommendations,
    },
    commentary: `تم تحليل ${closedTrades.length} صفقة. Win Rate: ${Math.round(winRate)}%، Profit Factor: ${profitFactor.toFixed(2)}، إجمالي P/L: $${totalPnl.toFixed(2)}.`,
    reasoning: recommendations[0],
    timestamp: Date.now(),
  };
}

// ============================================================================
// ORCHESTRATOR — runs all 6 agents in parallel and produces consensus
// ============================================================================
export async function runMultiAgentCycle(
  accountBalance: number = 1000,
  dailyPnl: number = 0,
  dailyTrades: number = 0,
  tradeHistory: any[] = []
): Promise<MultiAgentState> {
  agentState.isRunning = true;
  agentState.lastCycle = Date.now();

  try {
    // Run agents in parallel where possible (1, 2 in parallel; 3 depends on 2; 4 depends on 1+2+3; 5 depends on 4; 6 independent)
    const [analyst, strategistResult] = await Promise.all([
      marketAnalyst(),
      smcStrategist(accountBalance),
    ]);

    const strategist = strategistResult.output;
    const strategy = strategistResult.strategy;

    const risk = riskManager(strategy, accountBalance, dailyPnl, dailyTrades);

    const decisionResult = await aiDecisionMaker(analyst, strategist, risk, strategy);
    const decision = decisionResult.output;

    const execution = await executionAgent(decision, strategy, risk);
    const performance = performanceMonitor(tradeHistory, dailyPnl);

    const agents: AgentOutput[] = [analyst, strategist, risk, decision, execution, performance];

    // Build consensus
    const consensus = {
      verdict: decision.output.finalVerdict ?? "WAIT",
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      agreement: decision.output.agreement ?? 0,
    };

    agentState.agents = agents;
    agentState.consensus = consensus;
    agentState.isRunning = false;
    agentState.lastCycle = Date.now();

    return { ...agentState };
  } catch (e: any) {
    agentState.isRunning = false;
    agentState.consensus = {
      verdict: "WAIT",
      confidence: 0,
      reasoning: `Orchestrator error: ${e?.message}`,
      agreement: 0,
    };
    agentState.lastCycle = Date.now();
    return { ...agentState };
  }
}

// === Public API ===
export function getMultiAgentState(): MultiAgentState {
  return { ...agentState, agents: [...agentState.agents] };
}

// Background loop
let loopRunning = false;
export function startMultiAgentLoop(balance: number = 1000) {
  if (loopRunning) return;
  loopRunning = true;

  // Initial cycle
  runMultiAgentCycle(balance).catch(() => {});

  setInterval(() => {
    if (!agentState.isRunning) {
      runMultiAgentCycle(balance).catch(() => {});
    }
  }, 45_000); // every 45s (slower than agent since multi-agent is heavier)
}
