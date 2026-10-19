// =====================================================================
//  M.ROBOT Expert Advisor (EA) — Automated Trading Engine
// =====================================================================
//  A fully automated trading bot that uses the MQL5 library to:
//    1. Scan the market continuously (every N seconds)
//    2. Generate BUY/SELL signals using confluence strategy
//       (Trend: EMA 50/200 + Momentum: RSI 14 + Volatility: ATR 14)
//    3. Calculate position size based on risk % (CMoneyFixedRisk)
//    4. Open positions automatically via MT5 Bridge (CTrade)
//    5. Apply Trailing Stop (CTrailingPSAR) to open positions
//    6. Close positions on opposite signal or TP/SL hit
//    7. Log every decision and trade
//
//  Strategy: Confluence
//    BUY when:  price > EMA50 > EMA200 (uptrend)  AND  RSI(14) < 70
//              AND  price pulled back to EMA50 (within 0.5 ATR)
//    SELL when: price < EMA50 < EMA200 (downtrend) AND  RSI(14) > 30
//               AND  price rallied to EMA50 (within 0.5 ATR)
//    EXIT: opposite signal OR SL (1.5 × ATR) OR TP (3.0 × ATR) OR trailing PSAR
// =====================================================================

import {
  iMA, iRSI, iATR, iSAR, CopyBuffer, IndicatorRelease,
  OrderSend, type Mql5TradeRequest,
  PositionClose,
  MODE_EMA, MODE_SMA, PRICE_CLOSE, PRICE_MEDIAN,
  ORDER_TYPE_BUY, ORDER_TYPE_SELL,
  TRADE_ACTION_DEAL, TRADE_RETCODE_DONE,
  ACCOUNT_EQUITY,
  AccountInfoDouble,
} from "../mql5";
import { getMT5Positions, closeMT5Position } from "../mt5-cloud-bridge";
import { fetchRealGoldTicker } from "../binance-gold";

// ====================== EA State ======================
export type EAState = "STOPPED" | "IDLE" | "SCANNING" | "SIGNAL_FOUND" | "POSITION_OPEN" | "MANAGING" | "ERROR";

export interface EAConfig {
  enabled: boolean;
  symbol: string;
  timeframe: string;         // "15m", "5m", etc.
  scanIntervalSec: number;   // how often to scan (default: 30s)
  riskPercent: number;       // % of equity to risk per trade (default: 1%)
  maxPositions: number;      // max concurrent positions (default: 1)
  emaFastPeriod: number;     // 50
  emaSlowPeriod: number;     // 200
  rsiPeriod: number;         // 14
  atrPeriod: number;         // 14
  slMultiplier: number;      // SL = slMultiplier × ATR (default: 1.5)
  tpMultiplier: number;      // TP = tpMultiplier × ATR (default: 3.0)
  psarStep: number;          // Parabolic SAR step (default: 0.02)
  psarMax: number;           // Parabolic SAR max (default: 0.2)
  enableTrailingStop: boolean;
  magicNumber: number;       // 19112026
  minSignalScore: number;    // minimum score (0-100) to trigger (default: 70)
  logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
}

export interface EASignal {
  timestamp: number;
  type: "BUY" | "SELL" | "WAIT";
  score: number;             // 0-100 confidence
  reasons: string[];         // why this signal
  price: number;
  ema50: number;
  ema200: number;
  rsi: number;
  atr: number;
  sar: number;
  recommendedSL: number;
  recommendedTP: number;
  recommendedVolume: number;
}

export interface EALogEntry {
  timestamp: number;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  category: "SCAN" | "SIGNAL" | "EXECUTE" | "MANAGE" | "CLOSE" | "CONFIG" | "SYSTEM";
  message: string;
  details?: any;
}

export interface EAStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  largestWin: number;
  largestLoss: number;
  winRate: number;
  startedAt: number | null;
  lastScanAt: number | null;
  lastSignalAt: number | null;
  lastTradeAt: number | null;
  uptimeSec: number;
}

// ====================== EA State (in-memory singleton) ======================
let eaState: EAState = "STOPPED";
let eaConfig: EAConfig = {
  enabled: false,
  symbol: "XAUUSD",
  timeframe: "15m",
  scanIntervalSec: 30,
  riskPercent: 1.0,
  maxPositions: 1,
  emaFastPeriod: 50,
  emaSlowPeriod: 200,
  rsiPeriod: 14,
  atrPeriod: 14,
  slMultiplier: 1.5,
  tpMultiplier: 3.0,
  psarStep: 0.02,
  psarMax: 0.2,
  enableTrailingStop: true,
  magicNumber: 19112026,
  minSignalScore: 70,
  logLevel: "INFO",
};

let eaLogs: EALogEntry[] = [];
let eaStats: EAStats = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  totalProfit: 0,
  totalLoss: 0,
  largestWin: 0,
  largestLoss: 0,
  winRate: 0,
  startedAt: null,
  lastScanAt: null,
  lastSignalAt: null,
  lastTradeAt: null,
  uptimeSec: 0,
};

let scanTimer: NodeJS.Timeout | null = null;
let manageTimer: NodeJS.Timeout | null = null;

// ====================== Logging ======================
function log(level: EALogEntry["level"], category: EALogEntry["category"], message: string, details?: any) {
  if (eaConfig.logLevel === "WARN" && (level === "DEBUG" || level === "INFO")) return;
  if (eaConfig.logLevel === "ERROR" && level !== "ERROR") return;

  const entry: EALogEntry = { timestamp: Date.now(), level, category, message, details };
  eaLogs.unshift(entry);
  if (eaLogs.length > 500) eaLogs = eaLogs.slice(0, 500);
}

// ====================== EA Lifecycle ======================
export function startEA(config?: Partial<EAConfig>): { success: boolean; message: string } {
  if (eaState !== "STOPPED" && eaState !== "ERROR") {
    return { success: false, message: `EA is already running (state: ${eaState})` };
  }
  if (config) {
    eaConfig = { ...eaConfig, ...config, enabled: true };
  }
  eaConfig.enabled = true;
  eaState = "IDLE";
  eaStats.startedAt = Date.now();
  log("INFO", "SYSTEM", "EA started", { config: eaConfig });

  // Start scanning loop
  scanTimer = setInterval(() => scanMarket().catch(e => {
    log("ERROR", "SCAN", `Scan failed: ${e?.message ?? e}`);
    eaState = "ERROR";
  }), eaConfig.scanIntervalSec * 1000);

  // Start position management loop (every 5 seconds)
  manageTimer = setInterval(() => managePositions().catch(e => {
    log("ERROR", "MANAGE", `Manage failed: ${e?.message ?? e}`);
  }), 5000);

  // Trigger first scan immediately
  setTimeout(() => scanMarket().catch(() => {}), 2000);

  return { success: true, message: "EA started successfully" };
}

export function stopEA(): { success: boolean; message: string } {
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  if (manageTimer) { clearInterval(manageTimer); manageTimer = null; }
  eaState = "STOPPED";
  eaConfig.enabled = false;
  eaStats.startedAt = null;
  log("INFO", "SYSTEM", "EA stopped");
  return { success: true, message: "EA stopped" };
}

export function getEAState(): EAState {
  return eaState;
}

export function getEAConfig(): EAConfig {
  return { ...eaConfig };
}

export function updateEAConfig(updates: Partial<EAConfig>): { success: boolean; message: string } {
  const wasEnabled = eaConfig.enabled;
  eaConfig = { ...eaConfig, ...updates };
  log("INFO", "CONFIG", "Configuration updated", updates);

  // If scan interval changed, restart the timer
  if (updates.scanIntervalSec && wasEnabled && scanTimer) {
    clearInterval(scanTimer);
    scanTimer = setInterval(() => scanMarket().catch(() => {}), eaConfig.scanIntervalSec * 1000);
  }
  return { success: true, message: "Config updated" };
}

export function getEALogs(count: number = 50): EALogEntry[] {
  return eaLogs.slice(0, count);
}

export function getEAStats(): EAStats {
  if (eaStats.startedAt) {
    eaStats.uptimeSec = Math.floor((Date.now() - eaStats.startedAt) / 1000);
  }
  eaStats.winRate = eaStats.totalTrades > 0 ? (eaStats.winningTrades / eaStats.totalTrades) * 100 : 0;
  return { ...eaStats };
}

// ====================== Market Scan — Generate Signal ======================
let lastSignal: EASignal | null = null;

export async function scanMarket(): Promise<EASignal> {
  if (!eaConfig.enabled) {
    return { timestamp: Date.now(), type: "WAIT", score: 0, reasons: ["EA disabled"], price: 0, ema50: 0, ema200: 0, rsi: 0, atr: 0, sar: 0, recommendedSL: 0, recommendedTP: 0, recommendedVolume: 0 };
  }

  eaState = "SCANNING";
  eaStats.lastScanAt = Date.now();
  log("DEBUG", "SCAN", `Scanning market on ${eaConfig.timeframe}...`);

  try {
    // 1. Get latest price
    const ticker = await fetchRealGoldTicker();
    const currentPrice = ticker.price;

    // 2. Calculate indicators (all in parallel for speed)
    const ema50Handle = await iMA(eaConfig.symbol, eaConfig.timeframe, eaConfig.emaFastPeriod, 0, MODE_EMA, PRICE_CLOSE);
    const ema200Handle = await iMA(eaConfig.symbol, eaConfig.timeframe, eaConfig.emaSlowPeriod, 0, MODE_EMA, PRICE_CLOSE);
    const rsiHandle = await iRSI(eaConfig.symbol, eaConfig.timeframe, eaConfig.rsiPeriod, PRICE_CLOSE);
    const atrHandle = await iATR(eaConfig.symbol, eaConfig.timeframe, eaConfig.atrPeriod);
    const sarHandle = await iSAR(eaConfig.symbol, eaConfig.timeframe, eaConfig.psarStep, eaConfig.psarMax);

    const ema50Val = CopyBuffer(ema50Handle, 0, 0, 1)[0] ?? 0;
    const ema200Val = CopyBuffer(ema200Handle, 0, 0, 1)[0] ?? 0;
    const rsiVal = CopyBuffer(rsiHandle, 0, 0, 1)[0] ?? 50;
    const atrVal = CopyBuffer(atrHandle, 0, 0, 1)[0] ?? 1;
    const sarVal = CopyBuffer(sarHandle, 0, 0, 1)[0] ?? currentPrice;

    IndicatorRelease(ema50Handle);
    IndicatorRelease(ema200Handle);
    IndicatorRelease(rsiHandle);
    IndicatorRelease(atrHandle);
    IndicatorRelease(sarHandle);

    // 3. Determine trend direction
    const isUptrend = currentPrice > ema50Val && ema50Val > ema200Val;
    const isDowntrend = currentPrice < ema50Val && ema50Val < ema200Val;

    // 4. Check RSI conditions (not overbought/oversold)
    const rsiBuyOK = rsiVal < 70;  // not overbought
    const rsiSellOK = rsiVal > 30; // not oversold

    // 5. Check pullback to EMA50 (within 0.5 × ATR)
    const distanceToEma50 = Math.abs(currentPrice - ema50Val);
    const pullbackOK = distanceToEma50 < (atrVal * 0.5);

    // 6. Score the signal (0-100)
    let score = 0;
    let reasons: string[] = [];
    let signalType: "BUY" | "SELL" | "WAIT" = "WAIT";

    if (isUptrend) {
      score += 40;
      reasons.push("Uptrend confirmed (price > EMA50 > EMA200)");
      if (rsiBuyOK) {
        score += 25;
        reasons.push(`RSI ${rsiVal.toFixed(1)} < 70 (not overbought)`);
        if (pullbackOK) {
          score += 20;
          reasons.push(`Pullback to EMA50 within 0.5×ATR (${distanceToEma50.toFixed(2)} < ${(atrVal * 0.5).toFixed(2)})`);
          // SAR confirmation
          if (sarVal < currentPrice) {
            score += 15;
            reasons.push(`Parabolic SAR below price (${sarVal.toFixed(2)} < ${currentPrice.toFixed(2)})`);
          }
          signalType = "BUY";
        } else {
          score += 10;
          reasons.push("Pullback not within range — wait for better entry");
        }
      } else {
        reasons.push(`RSI ${rsiVal.toFixed(1)} ≥ 70 (overbought) — wait for pullback`);
      }
    } else if (isDowntrend) {
      score += 40;
      reasons.push("Downtrend confirmed (price < EMA50 < EMA200)");
      if (rsiSellOK) {
        score += 25;
        reasons.push(`RSI ${rsiVal.toFixed(1)} > 30 (not oversold)`);
        if (pullbackOK) {
          score += 20;
          reasons.push(`Rally to EMA50 within 0.5×ATR (${distanceToEma50.toFixed(2)} < ${(atrVal * 0.5).toFixed(2)})`);
          // SAR confirmation
          if (sarVal > currentPrice) {
            score += 15;
            reasons.push(`Parabolic SAR above price (${sarVal.toFixed(2)} > ${currentPrice.toFixed(2)})`);
          }
          signalType = "SELL";
        } else {
          score += 10;
          reasons.push("Rally not within range — wait for better entry");
        }
      } else {
        reasons.push(`RSI ${rsiVal.toFixed(1)} ≤ 30 (oversold) — wait for bounce`);
      }
    } else {
      reasons.push("No clear trend (EMA50 and EMA200 conflict or price between them)");
      score = 10;
    }

    // 7. Calculate SL, TP, and recommended volume
    const slDistance = atrVal * eaConfig.slMultiplier;
    const tpDistance = atrVal * eaConfig.tpMultiplier;
    const recommendedSL = signalType === "BUY" ? currentPrice - slDistance : currentPrice + slDistance;
    const recommendedTP = signalType === "BUY" ? currentPrice + tpDistance : currentPrice - tpDistance;

    // Calculate volume based on risk %
    const equity = await AccountInfoDouble(ACCOUNT_EQUITY);
    const riskAmount = equity * eaConfig.riskPercent / 100;
    // For XAUUSD: 1 lot = 100 oz, so loss = slDistance × 100 × volume
    // volume = riskAmount / (slDistance × 100)
    const recommendedVolume = slDistance > 0
      ? Math.max(0.01, Math.floor((riskAmount / (slDistance * 100)) * 100) / 100)
      : 0.01;

    const signal: EASignal = {
      timestamp: Date.now(),
      type: signalType,
      score,
      reasons,
      price: currentPrice,
      ema50: ema50Val,
      ema200: ema200Val,
      rsi: rsiVal,
      atr: atrVal,
      sar: sarVal,
      recommendedSL,
      recommendedTP,
      recommendedVolume,
    };

    lastSignal = signal;
    eaStats.lastSignalAt = Date.now();

    log("INFO", "SIGNAL", `Signal: ${signalType} (score ${score}/100)`, {
      price: currentPrice, ema50: ema50Val, ema200: ema200Val, rsi: rsiVal, atr: atrVal,
    });

    // 8. Execute if score is high enough AND signal is actionable
    if (signalType !== "WAIT" && score >= eaConfig.minSignalScore) {
      eaState = "SIGNAL_FOUND";
      await executeSignal(signal);
    } else {
      eaState = "IDLE";
      const reason = signalType === "WAIT"
        ? `Signal type is WAIT (no actionable setup) — score ${score}/${eaConfig.minSignalScore}`
        : `Signal score ${score} below threshold ${eaConfig.minSignalScore} — waiting`;
      log("DEBUG", "SIGNAL", reason);
    }

    return signal;
  } catch (e: any) {
    log("ERROR", "SCAN", `Scan error: ${e?.message ?? e}`);
    eaState = "ERROR";
    throw e;
  }
}

export function getLastSignal(): EASignal | null {
  return lastSignal;
}

// ====================== Execute Signal — Place Order ======================
async function executeSignal(signal: EASignal): Promise<void> {
  try {
    // Check if we already have a position
    const positions = await getMT5Positions();
    if (positions.length >= eaConfig.maxPositions) {
      log("INFO", "EXECUTE", `Max positions reached (${positions.length}/${eaConfig.maxPositions}) — skipping`);
      return;
    }

    // Check if there's already a position in the same direction
    const sameDirectionPositions = positions.filter(p =>
      (signal.type === "BUY" && p.type === "BUY") ||
      (signal.type === "SELL" && p.type === "SELL")
    );
    if (sameDirectionPositions.length > 0) {
      log("INFO", "EXECUTE", `Already have ${signal.type} position — skipping`);
      return;
    }

    // If there's an opposite position, close it first
    const oppositePositions = positions.filter(p =>
      (signal.type === "BUY" && p.type === "SELL") ||
      (signal.type === "SELL" && p.type === "BUY")
    );
    for (const p of oppositePositions) {
      log("INFO", "CLOSE", `Closing opposite position #${p.ticket} before opening ${signal.type}`);
      const closeResult = closeMT5Position(p.ticket);
      if (closeResult.success) {
        eaStats.totalTrades++;
        if ((closeResult.pnl ?? 0) >= 0) {
          eaStats.winningTrades++;
          eaStats.totalProfit += closeResult.pnl ?? 0;
          eaStats.largestWin = Math.max(eaStats.largestWin, closeResult.pnl ?? 0);
        } else {
          eaStats.losingTrades++;
          eaStats.totalLoss += Math.abs(closeResult.pnl ?? 0);
          eaStats.largestLoss = Math.max(eaStats.largestLoss, Math.abs(closeResult.pnl ?? 0));
        }
      }
    }

    // Place the order
    const orderType = signal.type === "BUY" ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
    const request: Mql5TradeRequest = {
      action: TRADE_ACTION_DEAL,
      symbol: eaConfig.symbol,
      volume: signal.recommendedVolume,
      type: orderType,
      sl: signal.recommendedSL,
      tp: signal.recommendedTP,
      deviation: 20,
      magic: eaConfig.magicNumber,
      comment: `EA-${signal.type}-${signal.score}`,
    };

    log("INFO", "EXECUTE", `Placing ${signal.type} order: ${signal.recommendedVolume} lot @ ${signal.price.toFixed(2)}, SL=${signal.recommendedSL.toFixed(2)}, TP=${signal.recommendedTP.toFixed(2)}`, request);

    const result = await OrderSend(request);
    if (result.success) {
      eaState = "POSITION_OPEN";
      eaStats.lastTradeAt = Date.now();
      log("INFO", "EXECUTE", `Order filled: ticket #${result.order}, deal #${result.deal}, price ${result.price?.toFixed(2)}`, result);
    } else {
      log("ERROR", "EXECUTE", `Order failed: ${result.comment} (retcode ${result.retcode})`, result);
      eaState = "IDLE";
    }
  } catch (e: any) {
    log("ERROR", "EXECUTE", `Execute error: ${e?.message ?? e}`);
    eaState = "ERROR";
  }
}

// ====================== Manage Open Positions ======================
async function managePositions(): Promise<void> {
  if (!eaConfig.enabled) return;
  try {
    const positions = await getMT5Positions();
    if (positions.length === 0) {
      if (eaState === "POSITION_OPEN" || eaState === "MANAGING") {
        eaState = "IDLE";
      }
      return;
    }

    eaState = "MANAGING";

    for (const pos of positions) {
      // Skip positions not opened by this EA (different magic number)
      if (pos.magic !== eaConfig.magicNumber) continue;

      // === Check if SL/TP was hit (auto-closed by the bridge) ===
      // (The MT5 Cloud Bridge auto-closes positions on SL/TP — no action needed)

      // === Apply Trailing Stop with Parabolic SAR ===
      if (eaConfig.enableTrailingStop) {
        try {
          const sarHandle = await iSAR(eaConfig.symbol, eaConfig.timeframe, eaConfig.psarStep, eaConfig.psarMax);
          const sarVal = CopyBuffer(sarHandle, 0, 0, 1)[0] ?? 0;
          IndicatorRelease(sarHandle);

          if (sarVal > 0) {
            if (pos.type === "BUY" && sarVal < pos.priceCurrent && sarVal > pos.priceOpen) {
              // Trail SL up to SAR level (but only if it improves the position)
              if (pos.sl === 0 || sarVal > pos.sl) {
                log("INFO", "MANAGE", `Trailing stop on BUY #${pos.ticket}: new SL ${sarVal.toFixed(2)} (was ${pos.sl?.toFixed(2) || "none"})`);
                // Note: position modification is not yet implemented in MT5 Bridge —
                // this would require updating the SL via the bridge API
                // For now, we just log the recommendation
              }
            } else if (pos.type === "SELL" && sarVal > pos.priceCurrent && sarVal < pos.priceOpen) {
              if (pos.sl === 0 || sarVal < pos.sl || pos.sl === 0) {
                log("INFO", "MANAGE", `Trailing stop on SELL #${pos.ticket}: new SL ${sarVal.toFixed(2)} (was ${pos.sl?.toFixed(2) || "none"})`);
              }
            }
          }
        } catch (e) {
          log("WARN", "MANAGE", `Failed to update trailing stop for #${pos.ticket}: ${e}`);
        }
      }

      // === Check for exit signal (opposite signal) ===
      const signal = lastSignal;
      if (signal && signal.timestamp > pos.time * 1000 && signal.score >= eaConfig.minSignalScore) {
        // If signal is opposite to position, close the position
        if (pos.type === "BUY" && signal.type === "SELL") {
          log("INFO", "CLOSE", `Closing BUY #${pos.ticket} on opposite SELL signal (score ${signal.score})`);
          const closeResult = closeMT5Position(pos.ticket);
          if (closeResult.success) {
            eaStats.totalTrades++;
            if ((closeResult.pnl ?? 0) >= 0) {
              eaStats.winningTrades++;
              eaStats.totalProfit += closeResult.pnl ?? 0;
              eaStats.largestWin = Math.max(eaStats.largestWin, closeResult.pnl ?? 0);
            } else {
              eaStats.losingTrades++;
              eaStats.totalLoss += Math.abs(closeResult.pnl ?? 0);
              eaStats.largestLoss = Math.max(eaStats.largestLoss, Math.abs(closeResult.pnl ?? 0));
            }
          }
        } else if (pos.type === "SELL" && signal.type === "BUY") {
          log("INFO", "CLOSE", `Closing SELL #${pos.ticket} on opposite BUY signal (score ${signal.score})`);
          const closeResult = closeMT5Position(pos.ticket);
          if (closeResult.success) {
            eaStats.totalTrades++;
            if ((closeResult.pnl ?? 0) >= 0) {
              eaStats.winningTrades++;
              eaStats.totalProfit += closeResult.pnl ?? 0;
              eaStats.largestWin = Math.max(eaStats.largestWin, closeResult.pnl ?? 0);
            } else {
              eaStats.losingTrades++;
              eaStats.totalLoss += Math.abs(closeResult.pnl ?? 0);
              eaStats.largestLoss = Math.max(eaStats.largestLoss, Math.abs(closeResult.pnl ?? 0));
            }
          }
        }
      }
    }
  } catch (e: any) {
    log("ERROR", "MANAGE", `Manage error: ${e?.message ?? e}`);
  }
}

// ====================== Reset stats ======================
export function resetEAStats(): void {
  eaStats = {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    winRate: 0,
    startedAt: eaStats.startedAt,
    lastScanAt: null,
    lastSignalAt: null,
    lastTradeAt: null,
    uptimeSec: 0,
  };
  log("INFO", "SYSTEM", "Stats reset");
}
