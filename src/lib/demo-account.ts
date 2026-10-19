// Simulated MT5 Demo Account — $1000 balance, 1:500 leverage
// ====================================================================
// This module provides a simulated MT5 demo account that works WITHOUT
// a Windows VPS. It simulates:
//   - Account balance: $1000
//   - Leverage: 1:500
//   - Open positions
//   - Trade execution (BUY/SELL)
//   - P/L calculation (using real XAUUSD price)
//
// This is NOT a real MT5 connection — it's a simulated account that
// uses real market prices from Yahoo GC=F for P/L calculation.
// When the user sets up a real MT5 Bridge on Windows VPS, this is
// automatically replaced by the real connection.

import { fetchRealGoldTicker } from "@/lib/binance-gold";

export interface DemoAccount {
  login: number;
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
}

export interface DemoPosition {
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
  comment: string;
}

let nextTicket = 100001;
let positions: DemoPosition[] = [];
let balance = 1000.0;
const LEVERAGE = 500;
const LOGIN = 50123456;
const SERVER = "M.ROBOT-Demo";
const NAME = "M.ROBOT Demo Account";

export function getDemoAccount(currentPrice: number = 0): DemoAccount {
  // Calculate equity = balance + floating P/L
  let floatingPL = 0;
  let totalMargin = 0;

  for (const pos of positions) {
    const cp = currentPrice > 0 ? currentPrice : pos.priceCurrent;
    const direction = pos.type === "BUY" ? 1 : -1;
    pos.priceCurrent = cp;
    pos.profit = (cp - pos.priceOpen) * direction * pos.volume * 100; // 100 oz per lot
    floatingPL += pos.profit;
    // Margin = volume * contractSize / leverage = volume * 100 / 500
    totalMargin += (pos.volume * 100) / LEVERAGE;
  }

  const equity = balance + floatingPL;
  const marginFree = equity - totalMargin;
  const marginLevel = totalMargin > 0 ? (equity / totalMargin) * 100 : 0;

  return {
    login: LOGIN,
    name: NAME,
    server: SERVER,
    currency: "USD",
    leverage: LEVERAGE,
    balance: Math.round(balance * 100) / 100,
    equity: Math.round(equity * 100) / 100,
    margin: Math.round(totalMargin * 100) / 100,
    marginFree: Math.round(marginFree * 100) / 100,
    marginLevel: Math.round(marginLevel * 100) / 100,
    profit: Math.round(floatingPL * 100) / 100,
  };
}

export function getDemoPositions(): DemoPosition[] {
  return positions.map(p => ({ ...p }));
}

export async function openDemoPosition(
  side: "BUY" | "SELL",
  volume: number,
  sl: number,
  tp: number,
  comment: string = "M.ROBOT"
): Promise<{ success: boolean; ticket?: number; price?: number; error?: string }> {
  try {
    const ticker = await fetchRealGoldTicker();
    const price = side === "BUY" ? ticker.ask : ticker.bid;

    const pos: DemoPosition = {
      ticket: nextTicket++,
      symbol: "XAUUSD",
      type: side,
      volume,
      priceOpen: price,
      priceCurrent: price,
      sl,
      tp,
      profit: 0,
      swap: 0,
      time: Math.floor(Date.now() / 1000),
      comment,
    };

    positions.push(pos);

    return {
      success: true,
      ticket: pos.ticket,
      price,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "failed to open position" };
  }
}

export function closeDemoPosition(ticket: number): { success: boolean; pnl?: number; error?: string } {
  const idx = positions.findIndex(p => p.ticket === ticket);
  if (idx < 0) return { success: false, error: "position not found" };

  const pos = positions[idx];
  balance += pos.profit;
  const pnl = pos.profit;
  positions.splice(idx, 1);

  return { success: true, pnl };
}

export function closeAllDemoPositions(): { closed: number; totalPnL: number } {
  let totalPnL = 0;
  for (const pos of positions) {
    totalPnL += pos.profit;
  }
  balance += totalPnL;
  const count = positions.length;
  positions = [];
  return { closed: count, totalPnL };
}

export function updateDemoPrices(currentPrice: number): void {
  for (const pos of positions) {
    const direction = pos.type === "BUY" ? 1 : -1;
    pos.priceCurrent = currentPrice;
    pos.profit = (currentPrice - pos.priceOpen) * direction * pos.volume * 100;

    // Auto-close on SL or TP
    if (pos.type === "BUY") {
      if (pos.sl > 0 && currentPrice <= pos.sl) {
        closeDemoPosition(pos.ticket);
      } else if (pos.tp > 0 && currentPrice >= pos.tp) {
        closeDemoPosition(pos.ticket);
      }
    } else {
      if (pos.sl > 0 && currentPrice >= pos.sl) {
        closeDemoPosition(pos.ticket);
      } else if (pos.tp > 0 && currentPrice <= pos.tp) {
        closeDemoPosition(pos.ticket);
      }
    }
  }
}

export function resetDemoAccount(): void {
  positions = [];
  balance = 1000.0;
  nextTicket = 100001;
}
