import { NextResponse } from "next/server";
import { fetchRealCandles } from "@/lib/binance-gold";
import { fetchGoldPrice as getGoldPrice } from "@/lib/gold-price";
import { fetchCandles, computeIndicators, setLastKnownPrice, type Candle, type IndicatorSet } from "@/lib/indicators";
import { computeEnsembleSignal, type EnsembleSignal } from "@/lib/alpha-factors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 0;

// 3-month backtest using the Ensemble ML Signal (20 alpha factors)
// For each candle, we compute the ensemble signal using the previous 120 candles
// and simulate a trade based on the signal.
// Data source: real XAUUSD candles from Yahoo Finance GC=F (NOT Binance PAXG crypto).

interface BacktestTrade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  side: "BUY" | "SELL";
  lotSize: number;
  pnl: number;
  pnlPct: number;
  exitReason: "TP" | "SL" | "SIGNAL_REVERSE" | "TIMEOUT";
  holdBars: number;
  confidence: number;
  signalScore: number;
}

interface BacktestResult {
  trades: BacktestTrade[];
  equity: { time: number; equity: number; drawdown: number }[];
  stats: {
    initialBalance: number;
    finalBalance: number;
    totalReturn: number;
    totalReturnPct: number;
    winRate: number;
    wins: number;
    losses: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    maxDrawdownPct: number;
    avgWin: number;
    avgLoss: number;
    biggestWin: number;
    biggestLoss: number;
    longestWinStreak: number;
    longestLossStreak: number;
    avgHoldBars: number;
    totalTrades: number;
    buyTrades: number;
    sellTrades: number;
  };
  monthly: { month: string; returnPct: number; trades: number }[];
  signalStats: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  };
  startDate: string;
  endDate: string;
  totalCandles: number;
  source: string;
}

const INITIAL_BALANCE = 1000; // user spec: $1000 account
const RISK_PER_TRADE = 0.01; // 1% baseline (0.5-1.5% dynamic range)
const MAX_HOLD_BARS = 144; // 6 days max hold for R:R 1:3
// === Confluence Hybrid Strategy: R:R = 1:3 ===
const SL_PCT = 0.006; // 0.6% stop loss
const TP_PCT = 0.018; // 1.8% take profit → R:R = 1:3
const MAX_LOT_SIZE = 0.01; // cap lot size for $1000 account
const LOOKBACK = 120;
const MIN_ADX = 20;
const MIN_CONFIDENCE = 60; // raised from 55 to 60 (quality over quantity)
const MIN_RR_RATIO = 1.3; // user requirement: minimum R:R 1:1.3-3

async function fetch1YearCandles(): Promise<Candle[]> {
  // Set price from gold-api.com (always works)
  try {
    const { fetchGoldPrice } = await import("@/lib/gold-price");
    const price = await fetchGoldPrice();
    setLastKnownPrice(price.price);
  } catch {}
  // === Fetch 1 year of hourly candles from Yahoo GC=F (range=1y gives ~6000 1h candles) ===
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1h&range=1y",
      { signal: ctrl.signal, headers: { "User-Agent": "M.ROBOT/1.0" } },
    );
    clearTimeout(t);
    if (r.ok) {
      const j: any = await r.json();
      const result = j?.chart?.result?.[0];
      if (result) {
        const ts: number[] = result.timestamp ?? [];
        const q = result.indicators?.quote?.[0] ?? {};
        const allCandles: Candle[] = [];
        for (let i = 0; i < ts.length; i++) {
          if (q.close?.[i] == null || !Number.isFinite(q.close[i])) continue;
          allCandles.push({
            time: Number(ts[i]),
            open: Number(q.open?.[i] ?? q.close[i]),
            high: Number(q.high?.[i] ?? q.close[i]),
            low: Number(q.low?.[i] ?? q.close[i]),
            close: Number(q.close[i]),
            volume: Number(q.volume?.[i] ?? 0),
          });
        }
        if (allCandles.length >= 200) {
          setLastKnownPrice(allCandles.at(-1)!.close);
          return allCandles;
        }
      }
    }
  } catch {}
  // Fallback: use fetchCandles (gets ~500-1000 candles)
  try {
    const candles = await fetchCandles("1h", 1000);
    if (candles.length >= 80) return candles;
  } catch {}
  return [];
}

export async function GET() {
  try {
    const price = await getGoldPrice();
    const candles = await fetch1YearCandles();

    if (candles.length < LOOKBACK + 10) {
      return NextResponse.json({ error: "Not enough candles for backtest" }, { status: 400 });
    }

    // Simulate trades
    const trades: BacktestTrade[] = [];
    const equity: { time: number; equity: number; drawdown: number }[] = [];
    let balance = INITIAL_BALANCE;
    let peak = balance;
    const signalCounts = { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 };

    let currentTrade: {
      side: "BUY" | "SELL";
      entryPrice: number;
      entryTime: number;
      entryBar: number;
      stopLoss: number;
      takeProfit: number;
      lotSize: number;
      confidence: number;
      signalScore: number;
    } | null = null;

    // Iterate through candles, starting from LOOKBACK
    for (let i = LOOKBACK; i < candles.length; i++) {
      // Compute indicators and ensemble signal using candles[0..i]
      const windowCandles = candles.slice(i - LOOKBACK + 1, i + 1);
      const indicators = computeIndicators(windowCandles);
      const ensemble = computeEnsembleSignal(windowCandles, indicators);

      // Count signal distribution
      switch (ensemble.action) {
        case "STRONG_BUY": signalCounts.strongBuy++; break;
        case "BUY": signalCounts.buy++; break;
        case "HOLD": signalCounts.hold++; break;
        case "SELL": signalCounts.sell++; break;
        case "STRONG_SELL": signalCounts.strongSell++; break;
      }

      const currentCandle = candles[i];
      const currentPrice = currentCandle.close;

      // If we have an open trade, check for SL/TP/timeout
      if (currentTrade) {
        const isBuy = currentTrade.side === "BUY";
        const hitSL = isBuy
          ? currentCandle.low <= currentTrade.stopLoss
          : currentCandle.high >= currentTrade.stopLoss;
        const hitTP = isBuy
          ? currentCandle.high >= currentTrade.takeProfit
          : currentCandle.low <= currentTrade.takeProfit;
        const timeout = i - currentTrade.entryBar >= MAX_HOLD_BARS;

        // Check signal reversal
        const signalReversal =
          (isBuy && (ensemble.action === "SELL" || ensemble.action === "STRONG_SELL")) ||
          (!isBuy && (ensemble.action === "BUY" || ensemble.action === "STRONG_BUY"));

        let exitReason: BacktestTrade["exitReason"] | null = null;
        let exitPrice = currentPrice;

        if (hitSL) {
          exitReason = "SL";
          exitPrice = currentTrade.stopLoss;
        } else if (hitTP) {
          exitReason = "TP";
          exitPrice = currentTrade.takeProfit;
        } else if (signalReversal) {
          exitReason = "SIGNAL_REVERSE";
          exitPrice = currentPrice;
        } else if (timeout) {
          exitReason = "TIMEOUT";
          exitPrice = currentPrice;
        }

        if (exitReason) {
          const direction = currentTrade.side === "BUY" ? 1 : -1;
          const priceDiff = (exitPrice - currentTrade.entryPrice) * direction;
          const pnl = priceDiff * currentTrade.lotSize * 100; // XAUUSD: 1 lot = 100 oz
          const pnlPct = (pnl / balance) * 100;
          balance += pnl;

          trades.push({
            entryTime: currentTrade.entryTime,
            entryPrice: currentTrade.entryPrice,
            exitTime: currentCandle.time,
            exitPrice,
            side: currentTrade.side,
            lotSize: currentTrade.lotSize,
            pnl,
            pnlPct,
            exitReason,
            holdBars: i - currentTrade.entryBar,
            confidence: currentTrade.confidence,
            signalScore: currentTrade.signalScore,
          });

          currentTrade = null;
        }
      }

      // If no open trade, check if we should open one
      // Strategy: Ensemble signal + EMA trend filter + RSI filter
      if (!currentTrade) {
        const prevCandles = candles.slice(Math.max(0, i - LOOKBACK), i);
        if (prevCandles.length >= 50) {
          // EMA trend direction
          const trendUp = indicators.ema9 > indicators.ema21;
          const trendDown = indicators.ema9 < indicators.ema21;

          // RSI filter
          const rsiOk = indicators.rsi > 30 && indicators.rsi < 75;

          // Ensemble signal
          const ensembleBuy = ensemble.action === "BUY" || ensemble.action === "STRONG_BUY" || ensemble.finalScore > 10;
          const ensembleSell = ensemble.action === "SELL" || ensemble.action === "STRONG_SELL" || ensemble.finalScore < -10;

          // Trade in direction of EMA trend, confirmed by ensemble
          // Stop trading if balance dropped below 50% of initial
          if (balance < INITIAL_BALANCE * 0.5) continue;

          const shouldBuy = trendUp && rsiOk && ensembleBuy && ensemble.confidence >= MIN_CONFIDENCE;
          const shouldSell = trendDown && rsiOk && ensembleSell && ensemble.confidence >= MIN_CONFIDENCE;

          if (shouldBuy || shouldSell) {
            const side: "BUY" | "SELL" = shouldBuy ? "BUY" : "SELL";

            const slDist = currentPrice * SL_PCT;
            const tpDist = currentPrice * TP_PCT; // R:R = 1:3
            const stopLoss = side === "BUY" ? currentPrice - slDist : currentPrice + slDist;
            const takeProfit = side === "BUY" ? currentPrice + tpDist : currentPrice - tpDist;

            const riskAmount = balance * RISK_PER_TRADE;
            const lotSize = 0.01; // fixed 0.01 for $1000

            currentTrade = {
              side,
              entryPrice: currentPrice,
              entryTime: currentCandle.time,
              entryBar: i,
              stopLoss,
              takeProfit,
              lotSize,
              confidence: ensemble.confidence,
              signalScore: ensemble.finalScore,
            };
          }
        }
      }

      // Track equity
      peak = Math.max(peak, balance);
      const drawdown = peak - balance;
      equity.push({
        time: currentCandle.time,
        equity: Math.round(balance * 100) / 100,
        drawdown: Math.round(drawdown * 100) / 100,
      });
    }

    // Close any remaining trade at the last price
    if (currentTrade) {
      const lastCandle = candles[candles.length - 1];
      const exitPrice = lastCandle.close;
      const direction = currentTrade.side === "BUY" ? 1 : -1;
      const priceDiff = (exitPrice - currentTrade.entryPrice) * direction;
      const pnl = priceDiff * currentTrade.lotSize * 100; // XAUUSD: 1 lot = 100 oz
      balance += pnl;

      trades.push({
        entryTime: currentTrade.entryTime,
        entryPrice: currentTrade.entryPrice,
        exitTime: lastCandle.time,
        exitPrice,
        side: currentTrade.side,
        lotSize: currentTrade.lotSize,
        pnl,
        pnlPct: (pnl / (balance - pnl)) * 100,
        exitReason: "TIMEOUT",
        holdBars: candles.length - 1 - currentTrade.entryBar,
        confidence: currentTrade.confidence,
        signalScore: currentTrade.signalScore,
      });
    }

    // Calculate stats
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl <= 0);
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    // Max drawdown
    let maxDD = 0;
    let peakDD = INITIAL_BALANCE;
    for (const e of equity) {
      peakDD = Math.max(peakDD, e.equity);
      maxDD = Math.max(maxDD, peakDD - e.equity);
    }

    // Sharpe ratio (simplified — using trade returns)
    const returns = trades.map((t) => t.pnlPct / 100);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1
      ? Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length)
      : 0;
    const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Streaks
    let longestWin = 0, longestLoss = 0, curWin = 0, curLoss = 0;
    for (const t of trades) {
      if (t.pnl > 0) { curWin++; curLoss = 0; longestWin = Math.max(longestWin, curWin); }
      else { curLoss++; curWin = 0; longestLoss = Math.max(longestLoss, curLoss); }
    }

    // Monthly returns
    const monthly: { month: string; returnPct: number; trades: number }[] = {};
    for (const t of trades) {
      const d = new Date(t.exitTime * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) monthly[key] = { month: key, returnPct: 0, trades: 0 };
      if (balance > 0) monthly[key].returnPct += t.pnlPct;
      monthly[key].trades++;
    }

    const buyTrades = trades.filter((t) => t.side === "BUY").length;

    const result: BacktestResult = {
      trades,
      equity,
      stats: {
        initialBalance: INITIAL_BALANCE,
        finalBalance: Math.round(balance * 100) / 100,
        totalReturn: Math.round((balance - INITIAL_BALANCE) * 100) / 100,
        totalReturnPct: Math.round(((balance - INITIAL_BALANCE) / INITIAL_BALANCE) * 10000) / 100,
        winRate: trades.length > 0 ? Math.round((wins.length / trades.length) * 10000) / 100 : 0,
        wins: wins.length,
        losses: losses.length,
        profitFactor: profitFactor === Infinity ? 99 : Math.round(profitFactor * 100) / 100,
        sharpeRatio: Math.round(sharpe * 100) / 100,
        maxDrawdown: Math.round(maxDD * 100) / 100,
        maxDrawdownPct: Math.round((maxDD / INITIAL_BALANCE) * 10000) / 100,
        avgWin: wins.length > 0 ? Math.round((grossProfit / wins.length) * 100) / 100 : 0,
        avgLoss: losses.length > 0 ? Math.round((-grossLoss / losses.length) * 100) / 100 : 0,
        biggestWin: wins.length > 0 ? Math.round(Math.max(...wins.map((t) => t.pnl)) * 100) / 100 : 0,
        biggestLoss: losses.length > 0 ? Math.round(Math.min(...losses.map((t) => t.pnl)) * 100) / 100 : 0,
        longestWinStreak: longestWin,
        longestLossStreak: longestLoss,
        avgHoldBars: trades.length > 0 ? Math.round((trades.reduce((s, t) => s + t.holdBars, 0) / trades.length) * 10) / 10 : 0,
        totalTrades: trades.length,
        buyTrades: buyTrades,
        sellTrades: trades.length - buyTrades,
      },
      monthly: Object.values(monthly),
      signalStats: signalCounts,
      startDate: candles[LOOKBACK] ? new Date(candles[LOOKBACK].time * 1000).toISOString() : "",
      endDate: candles[candles.length - 1] ? new Date(candles[candles.length - 1].time * 1000).toISOString() : "",
      totalCandles: candles.length,
      source: "XAUUSD Confluence Hybrid (SMC+Wyckoff+HTF) R:R 1:3 backtest",
    };

    return NextResponse.json(JSON.parse(JSON.stringify(result, (k, v) => v === Infinity ? 999 : v === -Infinity ? -999 : v)));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "backtest failed" }, { status: 500 });
  }
}
