// Shared types for the gold trading dashboard.
// This file MUST NOT import z-ai-web-dev-sdk so it can be safely
// imported by client components.

export interface AISignal {
  action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskReward: number;
  reasoning: string;
  bullFactors: string[];
  bearFactors: string[];
  timeframe: string;
  validUntil: string;
  generatedAt: string;
  aiModel: string;
  summary: string;
}

export function actionLabel(a: AISignal["action"]): string {
  switch (a) {
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
