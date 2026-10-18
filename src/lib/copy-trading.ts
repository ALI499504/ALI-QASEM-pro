// Copy-Trading Module — proportional position sizing for personal copy trading
// Not for distribution. Used to copy signals to user's own MT4/MT5 broker account.
//
// Rules (user spec):
//   - Master account: $1000
//   - Per-trade risk: max 1% = $10
//   - Lot size: 0.01 (micro) for $1000 account
//   - Proportional scaling: copy scales lot size by (follower_balance / master_balance)
//   - R:R fixed at 1:1.5 minimum (target 1:2 to 1:3)
//
// Example:
//   - Master balance: $1000 → lot size 0.01
//   - Follower balance: $5000 → lot size 0.05
//   - Follower balance: $500 → lot size 0.005 (but min lot is 0.01)

export interface CopyTradeSettings {
  masterBalance: number;       // master account balance (e.g., $1000)
  followerBalance: number;      // follower account balance (user's broker)
  riskPerTradePct: number;     // 1.0 (1%) — user spec
  maxLotSize: number;           // 0.01 for $1000 account
  minLotSize: number;           // 0.01 (broker minimum)
  lotStep: number;              // 0.01 (most brokers)
  riskRewardMin: number;        // 3.0 (user spec)
  riskRewardTarget: number;     // 1.5 (user spec target)
  riskRewardStretch: number;    // 3.0 (max)
}

export interface CopyTradePlan {
  masterLotSize: number;
  followerLotSize: number;
  scaledLotSize: number;          // round to lotStep
  effectiveRiskAmount: number;    // $ risked on follower
  effectiveRiskPct: number;       // % of follower balance
  ratio: number;                  // follower/master
  warning: string | null;
  isValid: boolean;
}

export const DEFAULT_COPY_TRADE_SETTINGS: CopyTradeSettings = {
  masterBalance: 1000,
  followerBalance: 1000,
  riskPerTradePct: 1.0, // 0.5-1.5% dynamic
  maxLotSize: 0.01,
  minLotSize: 0.01,
  lotStep: 0.01,
  riskRewardMin: 1.3,
  riskRewardTarget: 1.5,
  riskRewardStretch: 3.0,
};

/**
 * Compute copy-trade plan from master signal to follower account.
 * Proportional lot sizing:
 *   masterLot = masterRisk / (slDistance * 100)
 *   followerLot = followerRisk / (slDistance * 100)
 *   ratio = followerBalance / masterBalance
 */
export function computeCopyTradePlan(
  masterBalance: number,
  followerBalance: number,
  entryPrice: number,
  stopLoss: number,
  settings: CopyTradeSettings = DEFAULT_COPY_TRADE_SETTINGS
): CopyTradePlan {
  const slDistance = Math.abs(entryPrice - stopLoss);
  if (slDistance <= 0) {
    return {
      masterLotSize: 0.01,
      followerLotSize: 0.01,
      scaledLotSize: 0.01,
      effectiveRiskAmount: 0,
      effectiveRiskPct: 0,
      ratio: 1,
      warning: "مسافة الوقف صفر — تحقق من السعر",
      isValid: false,
    };
  }

  // Master lot
  const masterRisk = masterBalance * (settings.riskPerTradePct / 100);
  // XAUUSD: 1 lot = 100 oz, $1 move = $100 P/L per lot
  const rawMasterLot = masterRisk / (slDistance * 100);
  const masterLotSize = Math.min(settings.maxLotSize, Math.max(settings.minLotSize, rawMasterLot));

  // Follower lot — proportional
  const ratio = followerBalance / masterBalance;
  const followerRisk = followerBalance * (settings.riskPerTradePct / 100);
  const rawFollowerLot = followerRisk / (slDistance * 100);

  // Scale by ratio (proportional)
  const scaledLot = masterLotSize * ratio;
  // Round to lot step
  const steppedLot = Math.round(scaledLot / settings.lotStep) * settings.lotStep;
  // Clamp to [min, max]
  const finalLot = Math.min(settings.maxLotSize, Math.max(settings.minLotSize, steppedLot));

  const effectiveRiskAmount = finalLot * slDistance * 100;
  const effectiveRiskPct = (effectiveRiskAmount / followerBalance) * 100;

  let warning: string | null = null;
  if (effectiveRiskPct > 1.5) {
    warning = `تنبيه: نسبة المخاطرة الفعلية ${effectiveRiskPct.toFixed(2)}% تتجاوز 1%. قلّل حجم اللوت.`;
  }
  if (finalLot < rawFollowerLot * 0.9) {
    warning = `تنبيه: اللوت تم تقليله من ${rawFollowerLot.toFixed(3)} إلى ${finalLot.toFixed(2)} بسبب حد السمسار الأدنى.`;
  }

  return {
    masterLotSize: +masterLotSize.toFixed(3),
    followerLotSize: +rawFollowerLot.toFixed(3),
    scaledLotSize: +finalLot.toFixed(2),
    effectiveRiskAmount: +effectiveRiskAmount.toFixed(2),
    effectiveRiskPct: +effectiveRiskPct.toFixed(2),
    ratio: +ratio.toFixed(3),
    warning,
    isValid: effectiveRiskPct <= 2.0,
  };
}

/**
 * Format lot size with proper precision for MT4/MT5 orders.
 */
export function formatLotSize(lot: number, lotStep: number = 0.01): string {
  const decimals = lotStep >= 0.1 ? 1 : lotStep >= 0.01 ? 2 : 3;
  return lot.toFixed(decimals);
}

/**
 * Generate MT4/MT5 order command (text format the user can manually execute).
 */
export function generateMTOrder(
  symbol: string,
  side: "BUY" | "SELL",
  lotSize: number,
  stopLoss: number,
  takeProfit1: number,
  takeProfit2?: number,
  takeProfit3?: number,
  deviation: number = 20
): string {
  const cmd = `// ${symbol} ${side} ${formatLotSize(lotSize)} @ market
// SL: ${stopLoss.toFixed(2)}
// TP1: ${takeProfit1.toFixed(2)}${takeProfit2 ? ` (50% close)` : ""}
${takeProfit2 ? `// TP2: ${takeProfit2.toFixed(2)} (25% close)\n` : ""}${takeProfit3 ? `// TP3: ${takeProfit3.toFixed(2)} (25% close)\n` : ""}// Deviation: ${deviation} points
// Time: ${new Date().toISOString()}
// Risk: 1% max | R:R min 1:1.3-3 | target 1:1.5 to 1:3

OrderSend("${symbol}", ${side === "BUY" ? "OP_BUY" : "OP_SELL"}, ${formatLotSize(lotSize)}, Ask, ${deviation}, ${stopLoss.toFixed(2)}, ${takeProfit1.toFixed(2)}, "M.ROBOT Copy", 0, 0, clrNone);`;

  return cmd;
}
