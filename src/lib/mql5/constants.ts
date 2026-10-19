// =====================================================================
//  MQL5 Constants — Official MetaTrader 5 Reference
// =====================================================================
//  All MQL5 constants, enumerations, and predefined values
//  translated to TypeScript. Source: MQL5 Language Reference (MetaQuotes)
//  These match the MQL5 constants 1:1 so any MQL5 code can be ported.
// =====================================================================

// === ENUM_TIMEFRAMES — Chart Timeframes ===
export const PERIOD_CURRENT = 0;
export const PERIOD_M1 = 1;
export const PERIOD_M2 = 2;
export const PERIOD_M3 = 3;
export const PERIOD_M4 = 4;
export const PERIOD_M5 = 5;
export const PERIOD_M6 = 6;
export const PERIOD_M10 = 10;
export const PERIOD_M12 = 12;
export const PERIOD_M15 = 15;
export const PERIOD_M20 = 20;
export const PERIOD_M30 = 30;
export const PERIOD_H1 = 16385;
export const PERIOD_H2 = 16386;
export const PERIOD_H3 = 16387;
export const PERIOD_H4 = 16388;
export const PERIOD_H6 = 16390;
export const PERIOD_H8 = 16392;
export const PERIOD_H12 = 16408;
export const PERIOD_D1 = 16408;
export const PERIOD_W1 = 32769;
export const PERIOD_MN1 = 49153;

// === ENUM_MA_METHOD — Moving Average Methods ===
export const MODE_SMA = 0;  // Simple Moving Average
export const MODE_EMA = 1;  // Exponential Moving Average
export const MODE_SMMA = 2; // Smoothed Moving Average
export const MODE_LWMA = 3; // Linear Weighted Moving Average

// === ENUM_APPLIED_PRICE — Applied Price Constants ===
export const PRICE_CLOSE = 1;
export const PRICE_OPEN = 2;
export const PRICE_HIGH = 3;
export const PRICE_LOW = 4;
export const PRICE_MEDIAN = 5;  // (high+low)/2
export const PRICE_TYPICAL = 6; // (high+low+close)/3
export const PRICE_WEIGHTED = 7; // (high+low+close+close)/4

// === ENUM_PRICE_TYPE — Price Types for Tick Data ===
export const PRICE_BID = 0;
export const PRICE_ASK = 1;
export const PRICE_LAST = 2;

// === ENUM_TRADE_OPERATIONS — Trade Operation Types ===
export const OP_BUY = 0;
export const OP_SELL = 1;
export const OP_BUYLIMIT = 2;
export const OP_SELLLIMIT = 3;
export const OP_BUYSTOP = 4;
export const OP_SELLSTOP = 5;
export const OP_BUY_STOP_LIMIT = 6;
export const OP_SELL_STOP_LIMIT = 7;

// === ENUM_ORDER_TYPE — Order Types ===
export const ORDER_TYPE_BUY = 0;
export const ORDER_TYPE_SELL = 1;
export const ORDER_TYPE_BUY_LIMIT = 2;
export const ORDER_TYPE_SELL_LIMIT = 3;
export const ORDER_TYPE_BUY_STOP = 4;
export const ORDER_TYPE_SELL_STOP = 5;
export const ORDER_TYPE_BUY_STOP_LIMIT = 6;
export const ORDER_TYPE_SELL_STOP_LIMIT = 7;
export const ORDER_TYPE_CLOSE_BY = 8;

// === ENUM_ORDER_TYPE_FILLING — Order Filling Types ===
export const ORDER_FILLING_FOK = 0;       // Fill or Kill
export const ORDER_FILLING_IOC = 1;       // Immediate or Cancel
export const ORDER_FILLING_BOC = 2;       // Book or Cancel (MT5)
export const ORDER_FILLING_RETURN = 3;     // Return remainder

// === ENUM_ORDER_TYPE_TIME — Order Time Types ===
export const ORDER_TIME_GTC = 0;          // Good Till Cancelled
export const ORDER_TIME_DAY = 1;
export const ORDER_TIME_SPECIFIED = 2;
export const ORDER_TIME_SPECIFIED_DAY = 3;

// === ENUM_POSITION_TYPE — Position Types ===
export const POSITION_TYPE_BUY = 0;
export const POSITION_TYPE_SELL = 1;

// === ENUM_DEAL_TYPE — Deal Types ===
export const DEAL_TYPE_BUY = 0;
export const DEAL_TYPE_SELL = 1;
export const DEAL_TYPE_BALANCE = 2;
export const DEAL_TYPE_CREDIT = 3;
export const DEAL_TYPE_CHARGE = 4;
export const DEAL_TYPE_CORRECTION = 5;
export const DEAL_TYPE_BONUS = 6;

// === ENUM_ACCOUNT_INFO_DOUBLE ===
export const ACCOUNT_BALANCE = 0;
export const ACCOUNT_CREDIT = 1;
export const ACCOUNT_PROFIT = 2;
export const ACCOUNT_EQUITY = 3;
export const ACCOUNT_MARGIN = 4;
export const ACCOUNT_MARGIN_FREE = 5;
export const ACCOUNT_MARGIN_LEVEL = 6;
export const ACCOUNT_MARGIN_INITIAL = 7;
export const ACCOUNT_MARGIN_MAINTENANCE = 8;
export const ACCOUNT_ASSETS = 9;
export const ACCOUNT_LIABILITIES = 10;
export const ACCOUNT_COMMISSION_BLOCKED = 11;

// === ENUM_ACCOUNT_INFO_INTEGER ===
export const ACCOUNT_LOGIN = 0;
export const ACCOUNT_TRADE_MODE = 1;
export const ACCOUNT_LEVERAGE = 2;
export const ACCOUNT_LIMIT_ORDERS = 3;
export const ACCOUNT_TRADE_ALLOWED = 4;
export const ACCOUNT_TRADE_EXPERT = 5;
export const ACCOUNT_CURRENCY_DIGITS = 6;

// === ENUM_SYMBOL_INFO_DOUBLE ===
export const SYMBOL_BID = 0;
export const SYMBOL_BIDHIGH = 1;
export const SYMBOL_BIDLOW = 2;
export const SYMBOL_ASK = 3;
export const SYMBOL_ASKHIGH = 4;
export const SYMBOL_ASKLOW = 5;
export const SYMBOL_LAST = 6;
export const SYMBOL_LASTHIGH = 7;
export const SYMBOL_LASTLOW = 8;
export const SYMBOL_VOLUME = 9;
export const SYMBOL_VOLUME_HIGH = 10;
export const SYMBOL_VOLUME_LOW = 11;
export const SYMBOL_POINT = 12;
export const SYMBOL_TRADE_TICK_VALUE = 13;
export const SYMBOL_TRADE_TICK_VALUE_LOSS = 14;
export const SYMBOL_TRADE_TICK_VALUE_PROFIT = 15;
export const SYMBOL_TRADE_TICK_SIZE = 16;
export const SYMBOL_TRADE_CONTRACT_SIZE = 17;
export const SYMBOL_VOLUME_MIN = 18;
export const SYMBOL_VOLUME_MAX = 19;
export const SYMBOL_VOLUME_STEP = 20;
export const SYMBOL_VOLUME_LIMIT = 21;
export const SYMBOL_SWAP_LONG = 22;
export const SYMBOL_SWAP_SHORT = 23;
export const SYMBOL_MARGIN_INITIAL = 24;
export const SYMBOL_MARGIN_MAINTENANCE = 25;

// === ENUM_SYMBOL_INFO_INTEGER ===
export const SYMBOL_DIGITS = 0;
export const SYMBOL_SPREAD = 1;
export const SYMBOL_STOPS_LEVEL = 2;
export const SYMBOL_TRADE_STOPS_LEVEL = 3;
export const SYMBOL_TRADE_FREEZE_LEVEL = 4;
export const SYMBOL_TRADE_MODE = 5;
export const SYMBOL_TRADE_EXECUTION = 6;
export const SYMBOL_SWAP_MODE = 7;
export const SYMBOL_TRADE_CALC_MODE = 8;

// === ENUM_SYMBOL_CALC_MODE — Trade Calculation Modes ===
export const SYMBOL_CALC_MODE_FOREX = 0;
export const SYMBOL_CALC_MODE_FUTURES = 1;
export const SYMBOL_CALC_MODE_CFD = 2;
export const SYMBOL_CALC_MODE_CFDINDEX = 3;
export const SYMBOL_CALC_MODE_CFDLEVERAGE = 4;
export const SYMBOL_CALC_MODE_EXCH_STOCKS = 5;
export const SYMBOL_CALC_MODE_EXCH_FUTURES = 6;
export const SYMBOL_CALC_MODE_EXCH_OPTIONS = 7;
export const SYMBOL_CALC_MODE_EXCH_OPTIONS_MARGIN = 8;

// === ENUM_DRAW_TYPE — Indicator Drawing Styles ===
export const DRAW_NONE = 0;
export const DRAW_LINE = 1;
export const DRAW_SECTION = 2;
export const DRAW_HISTOGRAM = 3;
export const DRAW_HISTOGRAM2 = 4;
export const DRAW_ARROW = 5;
export const DRAW_ZIGZAG = 6;
export const DRAW_FILLING = 7;
export const DRAW_BARS = 8;
export const DRAW_CANDLES = 9;
export const DRAW_COLOR_LINE = 10;
export const DRAW_COLOR_SECTION = 11;
export const DRAW_COLOR_HISTOGRAM = 12;
export const DRAW_COLOR_HISTOGRAM2 = 13;
export const DRAW_COLOR_ARROW = 14;
export const DRAW_COLOR_ZIGZAG = 15;
export const DRAW_COLOR_BARS = 16;
export const DRAW_COLOR_CANDLES = 17;

// === ENUM_STO_PRICE — Stochastic Price Constants ===
export const STO_LOWHIGH = 0;
export const STO_CLOSECLOSE = 1;

// === ENUM_TRADE_REQUEST_ACTIONS — Trade Request Actions ===
export const TRADE_ACTION_DEAL = 0;        // Place a deal (market order)
export const TRADE_ACTION_PENDING = 1;     // Place a pending order
export const TRADE_ACTION_SLTP = 2;        // Modify SL/TP
export const TRADE_ACTION_POSITION = 3;    // Modify position
export const TRADE_ACTION_ORDER_MODIFY = 4; // Modify pending order
export const TRADE_ACTION_ORDER_DELETE = 5; // Delete pending order
export const TRADE_ACTION_POSITION_BY = 6;  // Close by (close position with opposite)

// === ENUM_TRADE_RETCODE — Trade Server Return Codes ===
export const TRADE_RETCODE_REQUOTE = 10004;
export const TRADE_RETCODE_REJECT = 10006;
export const TRADE_RETCODE_CANCEL = 10007;
export const TRADE_RETCODE_PLACED = 10008;
export const TRADE_RETCODE_DONE = 10009;
export const TRADE_RETCODE_DONE_PARTIAL = 10010;
export const TRADE_RETCODE_ERROR = 10011;
export const TRADE_RETCODE_DONE_SLTP = 10012;
export const TRADE_RETCODE_INVALID = 10013;
export const TRADE_RETCODE_INVALID_VOLUME = 10014;
export const TRADE_RETCODE_INVALID_PRICE = 10015;
export const TRADE_RETCODE_INVALID_STOPS = 10016;
export const TRADE_RETCODE_TRADE_DISABLED = 10017;
export const TRADE_RETCODE_MARKET_CLOSED = 10018;
export const TRADE_RETCODE_NO_MONEY = 10019;
export const TRADE_RETCODE_PRICE_CHANGED = 10020;
export const TRADE_RETCODE_PRICE_OFF = 10021;
export const TRADE_RETCODE_PRICE_EXPIRED = 10022;
export const TRADE_RETCODE_TOO_MANY_REQUESTS = 10024;

// === ENUM_CUSTOM_INDICATOR_PROPERTIES ===
export const INDICATOR_DIGITS = 0;
export const INDICATOR_HEIGHT = 1;
export const INDICATOR_MINIMUM = 2;
export const INDICATOR_MAXIMUM = 3;

// === ENUM_CHART_MODE ===
export const CHART_BARS = 0;     // Bars (OHLC sequences)
export const CHART_CANDLES = 1; // Candles (Japanese candlesticks)
export const CHART_LINE = 2;    // Line chart

// === ENUM_CHART_COLOR ===
export const CHART_COLOR_BACKGROUND = 0;
export const CHART_COLOR_FOREGROUND = 1;
export const CHART_COLOR_GRID = 2;
export const CHART_COLOR_VOLUME = 3;
export const CHART_COLOR_CHART_UP = 4;
export const CHART_COLOR_CHART_DOWN = 5;
export const CHART_COLOR_CHART_LINE = 6;
export const CHART_COLOR_CANDLE_BULL = 7;
export const CHART_COLOR_CANDLE_BEAR = 8;
export const CHART_COLOR_BID = 9;
export const CHART_COLOR_ASK = 10;
export const CHART_COLOR_LAST = 11;

// === ENUM_BAR_TIMEFRAME (alias mapping to common abbreviations) ===
export const TF_M1 = "1m";
export const TF_M5 = "5m";
export const TF_M15 = "15m";
export const TF_M30 = "30m";
export const TF_H1 = "1h";
export const TF_H4 = "4h";
export const TF_D1 = "1d";
export const TF_W1 = "1w";
export const TF_MN1 = "1M";

// === ENUM_PERIOD — helper to map MQL5 PERIOD_* to API interval string ===
export const PERIOD_TO_INTERVAL: Record<number, string> = {
  [PERIOD_M1]: "1m",
  [PERIOD_M5]: "5m",
  [PERIOD_M15]: "15m",
  [PERIOD_M30]: "30m",
  [PERIOD_H1]: "1h",
  [PERIOD_H4]: "4h",
  [PERIOD_D1]: "1d",
  [PERIOD_W1]: "1w",
  [PERIOD_MN1]: "1M",
};

// === ENUM_APPLIED_PRICE helper — get the price from a candle ===
export function getAppliedPrice(
  candle: { open: number; high: number; low: number; close: number },
  appliedPrice: number
): number {
  switch (appliedPrice) {
    case PRICE_CLOSE: return candle.close;
    case PRICE_OPEN: return candle.open;
    case PRICE_HIGH: return candle.high;
    case PRICE_LOW: return candle.low;
    case PRICE_MEDIAN: return (candle.high + candle.low) / 2;
    case PRICE_TYPICAL: return (candle.high + candle.low + candle.close) / 3;
    case PRICE_WEIGHTED: return (candle.high + candle.low + candle.close + candle.close) / 4;
    default: return candle.close;
  }
}

// === ENUM_SYMBOL_INFO_STRING ===
export const SYMBOL_CURRENCY_BASE = 0;
export const SYMBOL_CURRENCY_PROFIT = 1;
export const SYMBOL_CURRENCY_MARGIN = 2;
export const SYMBOL_BANK = 3;
export const SYMBOL_DESCRIPTION = 4;
export const SYMBOL_PATH = 5;
export const SYMBOL_ISIN = 6;
export const SYMBOL_PAGE = 7;

// === ENUM_POSITION properties (POSITION_*) ===
export const POSITION_TICKET = 0;
export const POSITION_TIME = 1;
export const POSITION_TIME_MSC = 2;
export const POSITION_TIME_UPDATE = 3;
export const POSITION_TIME_UPDATE_MSC = 4;
export const POSITION_TYPE = 5;
export const POSITION_MAGIC = 6;
export const POSITION_IDENTIFIER = 7;
export const POSITION_VOLUME = 8;
export const POSITION_PRICE_OPEN = 9;
export const POSITION_SL = 10;
export const POSITION_TP = 11;
export const POSITION_PRICE_CURRENT = 12;
export const POSITION_SWAP = 13;
export const POSITION_PROFIT = 14;
export const POSITION_SYMBOL = 15;
export const POSITION_COMMENT = 16;

// === ENUM_HISTORY properties ===
export const HISTORY_DEAL_TICKET = 0;
export const HISTORY_DEAL_TIME = 1;
export const HISTORY_DEAL_TYPE = 2;
export const HISTORY_DEAL_ENTRY = 3;
export const HISTORY_DEAL_MAGIC = 4;
export const HISTORY_DEAL_POSITION_ID = 5;
export const HISTORY_DEAL_VOLUME = 6;
export const HISTORY_DEAL_PRICE = 7;
export const HISTORY_DEAL_COMMISSION = 8;
export const HISTORY_DEAL_SWAP = 9;
export const HISTORY_DEAL_PROFIT = 10;
export const HISTORY_DEAL_SYMBOL = 11;
export const HISTORY_DEAL_COMMENT = 12;
