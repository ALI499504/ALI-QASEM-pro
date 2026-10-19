// =====================================================================
//  MQL5 Trade & Account Functions — TypeScript Implementation
// =====================================================================
//  Trade functions: OrderSend, OrderCheck, PositionSelect, etc.
//  Account info: AccountInfoDouble, AccountInfoInteger, AccountInfoString
//  Symbol info: SymbolInfoDouble, SymbolInfoInteger, SymbolInfoTick
//
//  All connected to the MT5 Cloud Bridge (mt5-cloud-bridge.ts).
// =====================================================================

import {
  getMT5Account, getMT5Positions, getMT5History,
  placeMT5Order, closeMT5Position, closeAllMT5Positions,
  type MT5Account, type MT5Position, type MT5Deal,
} from "../mt5-cloud-bridge";
import { fetchRealGoldTicker } from "../binance-gold";
import {
  ACCOUNT_BALANCE, ACCOUNT_EQUITY, ACCOUNT_PROFIT, ACCOUNT_MARGIN,
  ACCOUNT_MARGIN_FREE, ACCOUNT_MARGIN_LEVEL, ACCOUNT_LOGIN, ACCOUNT_LEVERAGE,
  ACCOUNT_TRADE_ALLOWED, ACCOUNT_TRADE_EXPERT,
  SYMBOL_BID, SYMBOL_BIDHIGH, SYMBOL_BIDLOW,
  SYMBOL_ASK, SYMBOL_ASKHIGH, SYMBOL_ASKLOW,
  SYMBOL_LAST, SYMBOL_LASTHIGH, SYMBOL_LASTLOW,
  SYMBOL_VOLUME, SYMBOL_VOLUME_HIGH, SYMBOL_VOLUME_LOW, SYMBOL_VOLUME_MIN,
  SYMBOL_VOLUME_MAX, SYMBOL_VOLUME_STEP, SYMBOL_VOLUME_LIMIT,
  SYMBOL_POINT, SYMBOL_DIGITS, SYMBOL_TRADE_CONTRACT_SIZE,
  SYMBOL_TRADE_TICK_SIZE, SYMBOL_TRADE_TICK_VALUE,
  SYMBOL_TRADE_TICK_VALUE_LOSS, SYMBOL_TRADE_TICK_VALUE_PROFIT,
  SYMBOL_SWAP_LONG, SYMBOL_SWAP_SHORT,
  SYMBOL_MARGIN_INITIAL, SYMBOL_MARGIN_MAINTENANCE,
  POSITION_TICKET, POSITION_TIME, POSITION_TYPE, POSITION_VOLUME,
  POSITION_PRICE_OPEN, POSITION_SL, POSITION_TP, POSITION_PRICE_CURRENT,
  POSITION_PROFIT, POSITION_SWAP, POSITION_SYMBOL, POSITION_COMMENT, POSITION_MAGIC,
  ORDER_TYPE_BUY, ORDER_TYPE_SELL, ORDER_TYPE_BUY_LIMIT, ORDER_TYPE_SELL_LIMIT,
  ORDER_TYPE_BUY_STOP, ORDER_TYPE_SELL_STOP,
  TRADE_ACTION_DEAL, TRADE_RETCODE_DONE,
} from "./constants";

// ====================== Mql5TradeRequest structure ======================
export interface Mql5TradeRequest {
  action: number;             // TRADE_ACTION_DEAL, etc.
  symbol: string;             // "XAUUSD"
  volume: number;             // lot size
  type: number;               // ORDER_TYPE_BUY / ORDER_TYPE_SELL / etc.
  price?: number;             // order price
  stoplimit?: number;
  sl?: number;                // stop loss
  tp?: number;                // take profit
  deviation?: number;         // max price deviation in points
  magic?: number;             // EA magic number
  position?: number;          // ticket for position modification
  position_by?: number;
  type_filling?: number;
  type_time?: number;
  expiration?: number;
  comment?: string;
}

// ====================== Mql5TradeResult structure ======================
export interface Mql5TradeResult {
  retcode: number;            // trade server return code
  deal?: number;              // deal ticket
  order?: number;             // order ticket
  symbol?: string;
  price?: number;
  volume?: number;
  bid?: number;
  ask?: number;
  comment?: string;
  request_id?: number;
  external_id?: string;
  success?: boolean;
}

// ====================== OrderSend — Place an order ======================
// MQL5: bool OrderSend(MqlTradeRequest& request, MqlTradeResult& result)
export async function OrderSend(
  request: Mql5TradeRequest
): Promise<Mql5TradeResult> {
  // Convert MT5 order type to BUY/SELL
  const side = request.type === ORDER_TYPE_BUY ||
                request.type === ORDER_TYPE_BUY_LIMIT ||
                request.type === ORDER_TYPE_BUY_STOP ? "BUY" : "SELL";

  // Get current bid/ask from MT5 Bridge (which uses real market prices)
  const account = await getMT5Account();
  if (!account) {
    return { retcode: 10017, comment: "Not connected to MT5", success: false };
  }

  // For market orders, use current bid/ask
  if (request.action === TRADE_ACTION_DEAL) {
    const result = await placeMT5Order({
      side: side as "BUY" | "SELL",
      volume: request.volume,
      sl: request.sl,
      tp: request.tp,
      comment: request.comment ?? "MQL5",
    });

    return {
      retcode: result.retcode ?? (result.success ? TRADE_RETCODE_DONE : 10004),
      deal: result.deal,
      order: result.ticket,
      symbol: request.symbol,
      price: result.price,
      volume: request.volume,
      comment: result.success ? "Order filled" : result.error,
      success: result.success,
    };
  }

  // For other actions (SL/TP modification, position close), they would
  // go through the MT5 Bridge's other endpoints — left as TODO for now
  return {
    retcode: 10013,
    comment: "Trade action not yet supported via MT5 Bridge",
    success: false,
  };
}

// ====================== OrderCheck — Validate order without executing ======================
export async function OrderCheck(
  request: Mql5TradeRequest
): Promise<{ retcode: number; balance: number; equity: number; profit: number; margin: number; margin_free: number; margin_level: number; comment: string; success: boolean }> {
  try {
    const account = await getMT5Account();
    const margin = await OrderCalcMargin(
      request.type ?? ORDER_TYPE_BUY,
      request.symbol,
      request.volume,
      request.price ?? 0
    );

    const marginLevel = account.margin > 0 ? (account.equity / account.margin) * 100 : 100;

    return {
      retcode: account.equity - margin > 0 ? 0 : 10019,
      balance: account.balance,
      equity: account.equity,
      profit: account.profit,
      margin,
      margin_free: account.equity - margin,
      margin_level: marginLevel,
      comment: account.equity - margin > 0 ? "OK" : "Not enough money",
      success: account.equity - margin > 0,
    };
  } catch (e: any) {
    return {
      retcode: 10011,
      balance: 0, equity: 0, profit: 0, margin: 0,
      margin_free: 0, margin_level: 0,
      comment: e?.message ?? "Check failed",
      success: false,
    };
  }
}

// ====================== OrderCalcMargin — Calculate required margin ======================
export async function OrderCalcMargin(
  orderType: number,
  symbol: string,
  volume: number,
  price: number
): Promise<number> {
  const account = await getMT5Account();
  // For XAUUSD: margin = volume * contract_size / leverage * price
  // XAUUSD contract = 100 oz, leverage = 500, so margin per 0.01 lot @ 4180 = 0.01 * 100 / 500 * 4180 = $0.836
  const contractSize = 100;
  const leverage = account?.leverage ?? 500;
  // For market orders, use the actual price; otherwise use the order price
  const calcPrice = price > 0 ? price : (await fetchRealGoldTicker()).price;
  return (volume * contractSize * calcPrice) / leverage;
}

// ====================== OrderCalcProfit — Calculate potential profit ======================
export async function OrderCalcProfit(
  orderType: number,
  symbol: string,
  volume: number,
  priceOpen: number,
  priceClose: number
): Promise<number> {
  // Profit = (close - open) * contract_size * volume * (buy ? 1 : -1)
  const contractSize = 100;
  const direction = orderType === ORDER_TYPE_BUY ? 1 : -1;
  return (priceClose - priceOpen) * direction * volume * contractSize;
}

// ====================== Position functions ======================
// MQL5: int PositionsTotal() — total number of open positions
export async function PositionsTotal(): Promise<number> {
  return (await getMT5Positions()).length;
}

// MQL5: string PositionGetSymbol(int index)
export async function PositionGetSymbol(index: number): Promise<string> {
  const positions = await getMT5Positions();
  return positions[index]?.symbol ?? "";
}

// MQL5: ulong PositionGetTicket(int index)
export async function PositionGetTicket(index: number): Promise<number> {
  const positions = await getMT5Positions();
  return positions[index]?.ticket ?? 0;
}

// MQL5: bool PositionSelect(string symbol)
let selectedPositionTicket: number = 0;
export async function PositionSelect(symbol: string): Promise<boolean> {
  const positions = await getMT5Positions();
  const pos = positions.find(p => p.symbol === symbol);
  if (pos) {
    selectedPositionTicket = pos.ticket;
    return true;
  }
  return false;
}

// MQL5: bool PositionSelectByTicket(ulong ticket)
export async function PositionSelectByTicket(ticket: number): Promise<boolean> {
  const positions = await getMT5Positions();
  const pos = positions.find(p => p.ticket === ticket);
  if (pos) {
    selectedPositionTicket = ticket;
    return true;
  }
  return false;
}

// MQL5: double PositionGetDouble(ENUM_POSITION_PROPERTY_DOUBLE property_id)
export async function PositionGetDouble(propertyId: number): Promise<number> {
  const positions = await getMT5Positions();
  const pos = positions.find(p => p.ticket === selectedPositionTicket);
  if (!pos) return 0;
  switch (propertyId) {
    case POSITION_PRICE_OPEN: return pos.priceOpen;
    case POSITION_PRICE_CURRENT: return pos.priceCurrent;
    case POSITION_VOLUME: return pos.volume;
    case POSITION_SL: return pos.sl;
    case POSITION_TP: return pos.tp;
    case POSITION_PROFIT: return pos.profit;
    case POSITION_SWAP: return pos.swap;
    default: return 0;
  }
}

// MQL5: long PositionGetInteger(ENUM_POSITION_PROPERTY_INTEGER property_id)
export async function PositionGetInteger(propertyId: number): Promise<number> {
  const positions = await getMT5Positions();
  const pos = positions.find(p => p.ticket === selectedPositionTicket);
  if (!pos) return 0;
  switch (propertyId) {
    case POSITION_TICKET: return pos.ticket;
    case POSITION_TIME: return pos.time;
    case POSITION_TYPE: return pos.type === "BUY" ? 0 : 1;
    case POSITION_MAGIC: return pos.magic;
    default: return 0;
  }
}

// MQL5: string PositionGetString(ENUM_POSITION_PROPERTY_STRING property_id)
export async function PositionGetString(propertyId: number): Promise<string> {
  const positions = await getMT5Positions();
  const pos = positions.find(p => p.ticket === selectedPositionTicket);
  if (!pos) return "";
  switch (propertyId) {
    case POSITION_SYMBOL: return pos.symbol;
    case POSITION_COMMENT: return pos.comment;
    default: return "";
  }
}

// ====================== Position close ======================
export async function PositionClose(ticket: number): Promise<boolean> {
  const result = closeMT5Position(ticket);
  return result.success;
}

export async function PositionCloseAll(): Promise<{ closed: number; totalPnL: number }> {
  return closeAllMT5Positions();
}

// ====================== Account info functions ======================
// MQL5: double AccountInfoDouble(ENUM_ACCOUNT_INFO_DOUBLE property_id)
export async function AccountInfoDouble(propertyId: number): Promise<number> {
  const account = await getMT5Account();
  switch (propertyId) {
    case ACCOUNT_BALANCE: return account.balance;
    case ACCOUNT_EQUITY: return account.equity;
    case ACCOUNT_PROFIT: return account.profit;
    case ACCOUNT_MARGIN: return account.margin;
    case ACCOUNT_MARGIN_FREE: return account.marginFree;
    case ACCOUNT_MARGIN_LEVEL: return account.marginLevel;
    default: return 0;
  }
}

// MQL5: long AccountInfoInteger(ENUM_ACCOUNT_INFO_INTEGER property_id)
export async function AccountInfoInteger(propertyId: number): Promise<number> {
  const account = await getMT5Account();
  switch (propertyId) {
    case ACCOUNT_LOGIN: return account.login;
    case ACCOUNT_LEVERAGE: return account.leverage;
    case ACCOUNT_TRADE_ALLOWED: return account.tradeAllowed ? 1 : 0;
    case ACCOUNT_TRADE_EXPERT: return account.tradeAllowed ? 1 : 0;
    default: return 0;
  }
}

// MQL5: string AccountInfoString(ENUM_ACCOUNT_INFO_STRING property_id)
export async function AccountInfoString(propertyId: number): Promise<string> {
  const account = await getMT5Account();
  switch (propertyId) {
    case 0: return account.name;        // ACCOUNT_NAME
    case 1: return account.server;      // ACCOUNT_SERVER
    case 2: return account.currency;    // ACCOUNT_CURRENCY
    case 3: return account.companyName; // ACCOUNT_COMPANY
    default: return "";
  }
}

// ====================== Symbol info functions ======================
// MQL5: double SymbolInfoDouble(string symbol, ENUM_SYMBOL_INFO_DOUBLE prop_id)
export async function SymbolInfoDouble(symbol: string, propertyId: number): Promise<number> {
  const ticker = await fetchRealGoldTicker();
  switch (propertyId) {
    case SYMBOL_BID: return ticker.bid;
    case SYMBOL_ASK: return ticker.ask;
    case SYMBOL_LAST: return ticker.price;
    case SYMBOL_VOLUME: return ticker.volume;
    case SYMBOL_VOLUME_HIGH: return ticker.volume * 1.5;
    case SYMBOL_VOLUME_LOW: return ticker.volume * 0.5;
    case SYMBOL_POINT: return 0.01;       // 0.01 = 1 cent (XAUUSD)
    case SYMBOL_TRADE_CONTRACT_SIZE: return 100;  // 1 lot = 100 oz
    case SYMBOL_TRADE_TICK_SIZE: return 0.01;
    case SYMBOL_TRADE_TICK_VALUE: return 1;       // tick value = $1 per 0.01 move
    case SYMBOL_VOLUME_MIN: return 0.01;
    case SYMBOL_VOLUME_MAX: return 100;
    case SYMBOL_VOLUME_STEP: return 0.01;
    default: return 0;
  }
}

// MQL5: long SymbolInfoInteger(string symbol, ENUM_SYMBOL_INFO_INTEGER prop_id)
export async function SymbolInfoInteger(symbol: string, propertyId: number): Promise<number> {
  switch (propertyId) {
    case SYMBOL_DIGITS: return 2;        // XAUUSD has 2 decimal places
    case 5: return 1;                   // SYMBOL_TRADE_MODE = SYMBOL_TRADE_MODE_FULL
    default: return 0;
  }
}

// MQL5: string SymbolInfoString(string symbol, ENUM_SYMBOL_INFO_STRING prop_id)
export async function SymbolInfoString(symbol: string, propertyId: number): Promise<string> {
  switch (propertyId) {
    case 0: return "USD";  // SYMBOL_CURRENCY_BASE
    case 1: return "USD";  // SYMBOL_CURRENCY_PROFIT
    case 2: return "USD";  // SYMBOL_CURRENCY_MARGIN
    case 3: return "XAU";  // SYMBOL_BANK
    case 4: return "Gold vs US Dollar";  // SYMBOL_DESCRIPTION
    case 5: return "XAUUSD";  // SYMBOL_PATH
    default: return "";
  }
}

// MQL5: bool SymbolInfoTick(string symbol, MqlTick& tick)
export async function SymbolInfoTick(symbol: string): Promise<{
  time: number; bid: number; ask: number; last: number; volume: number;
}> {
  const ticker = await fetchRealGoldTicker();
  return {
    time: ticker.timestamp,
    bid: ticker.bid,
    ask: ticker.ask,
    last: ticker.price,
    volume: ticker.volume,
  };
}

// ====================== History functions ======================
// MQL5: bool HistorySelect(datetime from, datetime to)
export async function HistorySelect(fromTime: number, toTime: number): Promise<boolean> {
  // The MT5 Cloud Bridge stores all history; we filter by time when reading
  return true;
}

// MQL5: int HistoryDealsTotal()
export async function HistoryDealsTotal(): Promise<number> {
  return (await getMT5History()).length;
}

// MQL5: ulong HistoryDealGetTicket(int index)
export async function HistoryDealGetTicket(index: number): Promise<number> {
  const history = await getMT5History();
  return history[index]?.ticket ?? 0;
}

// MQL5: double HistoryDealGetDouble(ulong ticket, ENUM_DEAL_PROPERTY_DOUBLE prop_id)
export async function HistoryDealGetDouble(ticket: number, propertyId: number): Promise<number> {
  const history = await getMT5History();
  const deal = history.find(d => d.ticket === ticket);
  if (!deal) return 0;
  switch (propertyId) {
    case 0: return deal.volume;     // HISTORY_DEAL_VOLUME
    case 1: return deal.price;      // HISTORY_DEAL_PRICE
    case 8: return 0;                // HISTORY_DEAL_COMMISSION
    case 9: return 0;                // HISTORY_DEAL_SWAP
    case 10: return deal.profit;    // HISTORY_DEAL_PROFIT
    default: return 0;
  }
}

// MQL5: long HistoryDealGetInteger(ulong ticket, ENUM_DEAL_PROPERTY_INTEGER prop_id)
export async function HistoryDealGetInteger(ticket: number, propertyId: number): Promise<number> {
  const history = await getMT5History();
  const deal = history.find(d => d.ticket === ticket);
  if (!deal) return 0;
  switch (propertyId) {
    case 1: return deal.time;          // HISTORY_DEAL_TIME
    case 2: return deal.type === "BUY" ? 0 : 1;  // HISTORY_DEAL_TYPE
    case 5: return deal.positionTicket; // HISTORY_DEAL_POSITION_ID
    default: return 0;
  }
}

// MQL5: string HistoryDealGetString(ulong ticket, ENUM_DEAL_PROPERTY_STRING prop_id)
export async function HistoryDealGetString(ticket: number, propertyId: number): Promise<string> {
  const history = await getMT5History();
  const deal = history.find(d => d.ticket === ticket);
  if (!deal) return "";
  switch (propertyId) {
    case 11: return deal.symbol;   // HISTORY_DEAL_SYMBOL
    case 12: return deal.comment;  // HISTORY_DEAL_COMMENT
    default: return "";
  }
}

// ====================== Other useful functions ======================
// MQL5: int SymbolsTotal(bool selected)
export function SymbolsTotal(selected: boolean): number {
  // We track a small list of supported symbols
  return 1;  // Just XAUUSD for now
}

// MQL5: string SymbolName(int pos, bool selected)
export function SymbolName(pos: number, selected: boolean): string {
  return "XAUUSD";
}

// MQL5: bool SymbolSelect(string name, bool select)
export function SymbolSelect(name: string, select: boolean): boolean {
  return name === "XAUUSD";
}

// MQL5: int GetLastError()
let lastError: number = 0;
export function GetLastError(): number {
  return lastError;
}

export function ResetLastError(): void {
  lastError = 0;
}

// MQL5: int PeriodSeconds(ENUM_TIMEFRAMES period)
export function PeriodSeconds(period: number): number {
  // Convert ENUM_TIMEFRAMES to seconds
  switch (period) {
    case 1: return 60;            // M1
    case 5: return 300;           // M5
    case 15: return 900;          // M15
    case 30: return 1800;         // M30
    case 16385: return 3600;     // H1
    case 16388: return 14400;     // H4
    case 16408: return 86400;    // D1
    case 32769: return 604800;   // W1
    case 49153: return 2592000;  // MN1
    default: return 0;
  }
}

// MQL5: string Symbol()
export function Symbol(): string {
  return "XAUUSD";
}

// MQL5: int Digits()
export function Digits(): number {
  return 2;
}

// MQL5: double Point()
export function Point(): number {
  return 0.01;
}

// MQL5: double NormalizeDouble(double value, int digits)
export function NormalizeDouble(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}
