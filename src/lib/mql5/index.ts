// =====================================================================
//  MQL5 Library — Main Exports
// =====================================================================
//  Re-exports all MQL5-compatible functions and classes from one entry point.
//  Use: `import { iMA, iRSI, OrderSend, CTrade, ... } from "@/lib/mql5"`
// =====================================================================

// === Constants ===
export * from "./constants";

// === Indicators ===
export {
  type Mql5Candle,
  // Trend indicators
  iMA, iDEMA, iTEMA, iFrAMA, iAMA, iVIDyA,
  iBands, iEnvelopes, iIchimoku, iSAR, iStdDev,
  iADX, iADXWilder, iAlligator, iGator,
  // Oscillators
  iRSI, iMACD, iStochastic, iCCI, iMomentum,
  iRVI, iDeMarker, iWPR, iOsMA, iTriX,
  iBearsPower, iBullsPower, iForce, iATR, iChaikin,
  // Volume indicators
  iOBV, iMFI, iVolumes, iAD, iBWMFI,
  // Bill Williams
  iAC, iAO, iFractals,
  // Custom indicator placeholder
  iCustom,
  // Handle management
  CopyBuffer, BarsCalculated, IndicatorRelease,
  // Timeseries access
  iBars, iBarShift, iOpen, iHigh, iLow, iClose, iTime, iVolume,
} from "./indicators";

// === Trade & Account Functions ===
export {
  type Mql5TradeRequest, type Mql5TradeResult,
  OrderSend, OrderCheck, OrderCalcMargin, OrderCalcProfit,
  PositionsTotal, PositionGetSymbol, PositionGetTicket,
  PositionSelect, PositionSelectByTicket,
  PositionGetDouble, PositionGetInteger, PositionGetString,
  AccountInfoDouble, AccountInfoInteger, AccountInfoString,
  SymbolInfoDouble, SymbolInfoInteger, SymbolInfoString, SymbolInfoTick,
  HistorySelect, HistoryDealsTotal, HistoryDealGetTicket,
  HistoryDealGetDouble, HistoryDealGetInteger, HistoryDealGetString,
  SymbolsTotal, SymbolName, SymbolSelect,
  GetLastError, ResetLastError, PeriodSeconds,
  Symbol, Digits, Point, NormalizeDouble,
  PositionClose, PositionCloseAll,
} from "./trade";

// === Standard Library Classes ===
export {
  CTrade, CAccountInfo, CSymbolInfo, CPositionInfo, CDealInfo,
  CMoneyFixedLot, CMoneyFixedRisk,
  CTrailingPSAR, CTrailingMA,
} from "./standard-library";
