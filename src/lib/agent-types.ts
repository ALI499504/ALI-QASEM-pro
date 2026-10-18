// Shared types for the multi-agent system.
// This file MUST NOT import z-ai-web-dev-sdk so it can be safely
// imported by client components.

export interface AgentAnalysis {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  specialty: string;
  verdict: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  reasoning: string;
  keyFactors: string[];
}

export interface MultiAgentResult {
  agents: AgentAnalysis[];
  consensus: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  consensusScore: number; // -100..100
  consensusConfidence: number; // 0..100
  agreement: number; // 0..100 (how aligned agents are)
  summary: string;
  generatedAt: string;
  aiModel: string;
}

export function verdictLabel(v: AgentAnalysis["verdict"]): string {
  switch (v) {
    case "STRONG_BUY":
      return "شراء قوي";
    case "BUY":
      return "شراء";
    case "SELL":
      return "بيع";
    case "STRONG_SELL":
      return "بيع قوي";
    default:
      return "انتظار";
  }
}
