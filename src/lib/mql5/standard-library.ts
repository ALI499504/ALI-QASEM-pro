// =====================================================================
//  MQL5 Standard Library Classes — TypeScript Implementation
// =====================================================================
//  Implements the most-used MQL5 standard library classes:
//    • CTrade           — trading class (Buy, Sell, PositionClose, etc.)
//    • CAccountInfo     — account information class
//    • CSymbolInfo      — symbol information class
//    • CPositionInfo    — position information class
//    • CDealInfo        — deal information class
//
//  These classes mirror the MQL5 Standard Library (Trade/Classes) and
//  use the same method names. MQL5 code that uses `CTrade trade; trade.Buy(...)`
//  can be ported directly to TypeScript as `const trade = new CTrade(); await trade.Buy(...)`.
// =====================================================================

import {
  AccountInfoDouble, AccountInfoInteger, AccountInfoString,
  SymbolInfoDouble, SymbolInfoInteger, SymbolInfoString, SymbolInfoTick,
  PositionsTotal, PositionGetSymbol, PositionGetTicket, PositionSelect,
  PositionSelectByTicket, PositionGetDouble, PositionGetInteger, PositionGetString,
  OrderSend, OrderCheck, OrderCalcMargin, OrderCalcProfit,
  type Mql5TradeRequest, type Mql5TradeResult,
} from "./trade";
import {
  ACCOUNT_BALANCE, ACCOUNT_EQUITY, ACCOUNT_PROFIT, ACCOUNT_MARGIN,
  ACCOUNT_MARGIN_FREE, ACCOUNT_MARGIN_LEVEL,
  SYMBOL_BID, SYMBOL_ASK, SYMBOL_LAST,
  ORDER_TYPE_BUY, ORDER_TYPE_SELL, ORDER_TYPE_BUY_LIMIT, ORDER_TYPE_SELL_LIMIT,
  ORDER_TYPE_BUY_STOP, ORDER_TYPE_SELL_STOP,
  TRADE_ACTION_DEAL,
  POSITION_TICKET, POSITION_TIME, POSITION_TYPE, POSITION_VOLUME,
  POSITION_PRICE_OPEN, POSITION_PRICE_CURRENT, POSITION_SL, POSITION_TP,
  POSITION_PROFIT, POSITION_SYMBOL, POSITION_COMMENT,
  MODE_EMA, PRICE_CLOSE,
} from "./constants";
import { iMA, CopyBuffer } from "./indicators";

// ====================== CTrade — Trading Class ======================
export class CTrade {
  private _magic: number = 0;
  private _deviation: number = 10;  // points
  private _typeFilling: number = 0;
  private _asyncMode: boolean = false;
  private _logLevel: number = 1;

  // === Properties ===
  public SetExpertMagicNumber(magic: number): void { this._magic = magic; }
  public SetDeviationInPoints(dev: number): void { this._deviation = dev; }
  public SetTypeFilling(type: number): void { this._typeFilling = type; }
  public SetAsyncMode(async: boolean): void { this._asyncMode = async; }

  // === Buy ===
  public async Buy(volume: number, symbol: string = "XAUUSD", price: number = 0,
    sl: number = 0, tp: number = 0, comment: string = ""): Promise<Mql5TradeResult> {
    const req: Mql5TradeRequest = {
      action: TRADE_ACTION_DEAL,
      symbol, volume,
      type: ORDER_TYPE_BUY,
      price: price > 0 ? price : await SymbolInfoDouble(symbol, SYMBOL_ASK),
      sl, tp, deviation: this._deviation,
      magic: this._magic, comment,
    };
    return OrderSend(req);
  }

  // === Sell ===
  public async Sell(volume: number, symbol: string = "XAUUSD", price: number = 0,
    sl: number = 0, tp: number = 0, comment: string = ""): Promise<Mql5TradeResult> {
    const req: Mql5TradeRequest = {
      action: TRADE_ACTION_DEAL,
      symbol, volume,
      type: ORDER_TYPE_SELL,
      price: price > 0 ? price : await SymbolInfoDouble(symbol, SYMBOL_BID),
      sl, tp, deviation: this._deviation,
      magic: this._magic, comment,
    };
    return OrderSend(req);
  }

  // === BuyLimit (pending) ===
  public async BuyLimit(volume: number, price: number, symbol: string = "XAUUSD",
    sl: number = 0, tp: number = 0, comment: string = ""): Promise<Mql5TradeResult> {
    return OrderSend({
      action: 1, // TRADE_ACTION_PENDING
      symbol, volume, type: ORDER_TYPE_BUY_LIMIT,
      price, sl, tp, magic: this._magic, comment,
    });
  }

  // === SellLimit ===
  public async SellLimit(volume: number, price: number, symbol: string = "XAUUSD",
    sl: number = 0, tp: number = 0, comment: string = ""): Promise<Mql5TradeResult> {
    return OrderSend({
      action: 1, symbol, volume, type: ORDER_TYPE_SELL_LIMIT,
      price, sl, tp, magic: this._magic, comment,
    });
  }

  // === BuyStop ===
  public async BuyStop(volume: number, price: number, symbol: string = "XAUUSD",
    sl: number = 0, tp: number = 0, comment: string = ""): Promise<Mql5TradeResult> {
    return OrderSend({
      action: 1, symbol, volume, type: ORDER_TYPE_BUY_STOP,
      price, sl, tp, magic: this._magic, comment,
    });
  }

  // === SellStop ===
  public async SellStop(volume: number, price: number, symbol: string = "XAUUSD",
    sl: number = 0, tp: number = 0, comment: string = ""): Promise<Mql5TradeResult> {
    return OrderSend({
      action: 1, symbol, volume, type: ORDER_TYPE_SELL_STOP,
      price, sl, tp, magic: this._magic, comment,
    });
  }

  // === PositionClose (by ticket) ===
  public async PositionClose(ticket: number, deviation: number = this._deviation): Promise<Mql5TradeResult> {
    const { closeMT5Position } = await import("../mt5-cloud-bridge");
    const result = closeMT5Position(ticket);
    return {
      retcode: result.success ? 10009 : 10004,
      order: ticket,
      comment: result.success ? "Position closed" : result.error,
      success: result.success,
    };
  }

  // === PositionCloseAll ===
  public async PositionCloseAll(): Promise<{ closed: number; totalPnL: number; success: boolean }> {
    const { closeAllMT5Positions } = await import("../mt5-cloud-bridge");
    const result = closeAllMT5Positions();
    return { ...result, success: true };
  }

  // === PositionModify (modify SL/TP) ===
  public async PositionModify(ticket: number, sl: number, tp: number): Promise<Mql5TradeResult> {
    // TODO: implement position modification via MT5 Bridge
    return { retcode: 10013, comment: "PositionModify not yet implemented", success: false };
  }
}

// ====================== CAccountInfo — Account Information Class ======================
export class CAccountInfo {
  public async Login(): Promise<number> {
    return AccountInfoInteger(0);  // ACCOUNT_LOGIN
  }

  public async TradeMode(): Promise<number> {
    return AccountInfoInteger(1);  // ACCOUNT_TRADE_MODE (0=Demo, 1=Real, 2=Contest)
  }

  public async TradeModeDescription(): Promise<string> {
    const mode = await this.TradeMode();
    return ["DEMO", "REAL", "CONTEST"][mode] ?? "DEMO";
  }

  public async Leverage(): Promise<number> {
    return AccountInfoInteger(2);  // ACCOUNT_LEVERAGE
  }

  public async TradeAllowed(): Promise<boolean> {
    return (await AccountInfoInteger(4)) === 1;
  }

  public async TradeExpert(): Promise<boolean> {
    return (await AccountInfoInteger(5)) === 1;
  }

  public async Balance(): Promise<number> {
    return AccountInfoDouble(ACCOUNT_BALANCE);
  }

  public async Profit(): Promise<number> {
    return AccountInfoDouble(ACCOUNT_PROFIT);
  }

  public async Equity(): Promise<number> {
    return AccountInfoDouble(ACCOUNT_EQUITY);
  }

  public async Margin(): Promise<number> {
    return AccountInfoDouble(ACCOUNT_MARGIN);
  }

  public async FreeMargin(): Promise<number> {
    return AccountInfoDouble(ACCOUNT_MARGIN_FREE);
  }

  public async MarginLevel(): Promise<number> {
    return AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
  }

  public async Name(): Promise<string> { return AccountInfoString(0); }
  public async Server(): Promise<string> { return AccountInfoString(1); }
  public async Currency(): Promise<string> { return AccountInfoString(2); }
  public async Company(): Promise<string> { return AccountInfoString(3); }

  public async OrderProfitCheck(
    symbol: string, orderType: number, volume: number,
    priceOpen: number, priceClose: number
  ): Promise<number> {
    return OrderCalcProfit(orderType, symbol, volume, priceOpen, priceClose);
  }

  public async MarginCheck(
    symbol: string, orderType: number, volume: number, price: number
  ): Promise<number> {
    return OrderCalcMargin(orderType, symbol, volume, price);
  }
}

// ====================== CSymbolInfo — Symbol Information Class ======================
export class CSymbolInfo {
  private _name: string = "XAUUSD";

  constructor(name: string = "XAUUSD") {
    this._name = name;
  }

  public get Name(): string { return this._name; }

  public async Refresh(): Promise<void> {
    // Cache the latest tick
    await SymbolInfoTick(this._name);
  }

  public async RefreshRates(): Promise<void> {
    await this.Refresh();
  }

  public async Bid(): Promise<number> {
    return SymbolInfoDouble(this._name, SYMBOL_BID);
  }

  public async Ask(): Promise<number> {
    return SymbolInfoDouble(this._name, SYMBOL_ASK);
  }

  public async Last(): Promise<number> {
    return SymbolInfoDouble(this._name, SYMBOL_LAST);
  }

  public async Volume(): Promise<number> {
    return SymbolInfoDouble(this._name, 9);
  }

  public async Spread(): Promise<number> {
    const [bid, ask] = await Promise.all([this.Bid(), this.Ask()]);
    return Math.round((ask - bid) / 0.01);  // in points
  }

  public async Digits(): Promise<number> {
    return SymbolInfoInteger(this._name, 0);
  }

  public async Point(): Promise<number> {
    return SymbolInfoDouble(this._name, 12);
  }

  public async ContractSize(): Promise<number> {
    return SymbolInfoDouble(this._name, 17);
  }

  public async TickValue(): Promise<number> {
    return SymbolInfoDouble(this._name, 13);
  }

  public async VolumeMin(): Promise<number> {
    return SymbolInfoDouble(this._name, 18);
  }

  public async VolumeMax(): Promise<number> {
    return SymbolInfoDouble(this._name, 19);
  }

  public async VolumeStep(): Promise<number> {
    return SymbolInfoDouble(this._name, 20);
  }

  public async NormalizePrice(price: number): Promise<number> {
    const pt = await this.Point();
    const digits = await this.Digits();
    return Math.round(price / pt) * pt * Math.pow(10, digits) / Math.pow(10, digits);
  }
}

// ====================== CPositionInfo — Position Information Class ======================
export class CPositionInfo {
  private _ticket: number = 0;
  private _symbol: string = "";
  private _type: number = 0;
  private _volume: number = 0;
  private _priceOpen: number = 0;
  private _priceCurrent: number = 0;
  private _sl: number = 0;
  private _tp: number = 0;
  private _profit: number = 0;
  private _swap: number = 0;
  private _time: number = 0;
  private _comment: string = "";

  public get Ticket(): number { return this._ticket; }
  public get Symbol(): string { return this._symbol; }
  public get PositionType(): number { return this._type; }
  public get Volume(): number { return this._volume; }
  public get PriceOpen(): number { return this._priceOpen; }
  public get PriceCurrent(): number { return this._priceCurrent; }
  public get StopLoss(): number { return this._sl; }
  public get TakeProfit(): number { return this._tp; }
  public get Profit(): number { return this._profit; }
  public get Swap(): number { return this._swap; }
  public get Time(): number { return this._time; }
  public get Comment(): string { return this._comment; }

  public async SelectByTicket(ticket: number): Promise<boolean> {
    const success = await PositionSelectByTicket(ticket);
    if (success) {
      this._ticket = ticket;
      this._symbol = await PositionGetString(POSITION_SYMBOL);
      this._type = await PositionGetInteger(POSITION_TYPE);
      this._volume = await PositionGetDouble(POSITION_VOLUME);
      this._priceOpen = await PositionGetDouble(POSITION_PRICE_OPEN);
      this._priceCurrent = await PositionGetDouble(POSITION_PRICE_CURRENT);
      this._sl = await PositionGetDouble(POSITION_SL);
      this._tp = await PositionGetDouble(POSITION_TP);
      this._profit = await PositionGetDouble(POSITION_PROFIT);
      this._swap = await PositionGetDouble(13);  // POSITION_SWAP
      this._time = await PositionGetInteger(POSITION_TIME);
      this._comment = await PositionGetString(POSITION_COMMENT);
      return true;
    }
    return false;
  }

  public TypeDescription(): string {
    return this._type === 0 ? "BUY" : "SELL";
  }
}

// ====================== CDealInfo — Deal Information Class ======================
export class CDealInfo {
  private _ticket: number = 0;
  private _order: number = 0;
  private _time: number = 0;
  private _type: number = 0;
  private _entry: number = 0;
  private _volume: number = 0;
  private _price: number = 0;
  private _profit: number = 0;
  private _symbol: string = "";
  private _comment: string = "";

  public get Ticket(): number { return this._ticket; }
  public get Order(): number { return this._order; }
  public get Time(): number { return this._time; }
  public get DealType(): number { return this._type; }
  public get Volume(): number { return this._volume; }
  public get Price(): number { return this._price; }
  public get Profit(): number { return this._profit; }
  public get Symbol(): string { return this._symbol; }
  public get Comment(): string { return this._comment; }

  public async SelectByIndex(index: number): Promise<boolean> {
    const { getMT5History } = await import("../mt5-cloud-bridge");
    const history = await getMT5History();
    if (index < 0 || index >= history.length) return false;
    const deal = history[index];
    this._ticket = deal.ticket;
    this._order = deal.positionTicket;
    this._time = deal.time;
    this._type = deal.type === "BUY" ? 0 : 1;
    this._volume = deal.volume;
    this._price = deal.price;
    this._profit = deal.profit;
    this._symbol = deal.symbol;
    this._comment = deal.comment;
    return true;
  }

  public TypeDescription(): string {
    return this._type === 0 ? "BUY" : "SELL";
  }
}

// ====================== CMoneyFixedLot — Money Management (Fixed Lot) ======================
export class CMoneyFixedLot {
  private _lots: number = 0.01;

  constructor(lots: number = 0.01) {
    this._lots = lots;
  }

  public get Lots(): number { return this._lots; }
  public set Lots(value: number) { this._lots = value; }

  public async CheckOpenLong(): Promise<number> {
    return this._lots;
  }

  public async CheckOpenShort(): Promise<number> {
    return this._lots;
  }
}

// ====================== CMoneyFixedRisk — Money Management (Fixed Risk %) ======================
export class CMoneyFixedRisk {
  private _riskPercent: number = 1.0;  // 1% risk per trade
  private _balance: number = 1000;

  constructor(riskPercent: number = 1.0) {
    this._riskPercent = riskPercent;
  }

  public get RiskPercent(): number { return this._riskPercent; }
  public set RiskPercent(value: number) { this._riskPercent = value; }

  // Calculate lot size based on SL distance and account balance
  public async CalculateLotSize(slDistancePoints: number, pointValue: number = 1): Promise<number> {
    const account = new CAccountInfo();
    const balance = await account.Balance();
    const riskAmount = balance * this._riskPercent / 100;
    // For XAUUSD: 1 lot = 100 oz, so loss = slDistance * 100 per lot
    // Risk = slDistancePoints * pointValue * 100 * volume
    // volume = riskAmount / (slDistancePoints * pointValue * 100)
    const volume = riskAmount / (slDistancePoints * pointValue * 100);
    // Round to nearest 0.01 lot
    return Math.max(0.01, Math.floor(volume * 100) / 100);
  }
}

// ====================== CTrailingPSAR — Trailing Stop using Parabolic SAR ======================
export class CTrailingPSAR {
  private _step: number = 0.02;
  private _maximum: number = 0.2;

  constructor(step: number = 0.02, maximum: number = 0.2) {
    this._step = step;
    this._maximum = maximum;
  }

  public get Step(): number { return this._step; }
  public set Step(value: number) { this._step = value; }
  public get Maximum(): number { return this._maximum; }
  public set Maximum(value: number) { this._maximum = value; }

  public async CheckTrailingStopLong(symbol: string, timeframe: string, currentPrice: number): Promise<{
    shouldMove: boolean; newStopLoss: number;
  }> {
    // Use iSAR to get current SAR value
    const { iSAR } = await import("./indicators");
    const handle = await iSAR(symbol, timeframe, this._step, this._maximum);
    const sarBuffer = CopyBuffer(handle, 0, 0, 1);
    const { IndicatorRelease } = await import("./indicators");
    IndicatorRelease(handle);

    if (sarBuffer.length === 0) return { shouldMove: false, newStopLoss: 0 };

    const sar = sarBuffer[0];
    // For long position: SAR is below price → trailing stop loss
    if (sar < currentPrice && sar > 0) {
      return { shouldMove: true, newStopLoss: sar };
    }
    return { shouldMove: false, newStopLoss: 0 };
  }

  public async CheckTrailingStopShort(symbol: string, timeframe: string, currentPrice: number): Promise<{
    shouldMove: boolean; newStopLoss: number;
  }> {
    const { iSAR } = await import("./indicators");
    const handle = await iSAR(symbol, timeframe, this._step, this._maximum);
    const sarBuffer = CopyBuffer(handle, 0, 0, 1);
    const { IndicatorRelease } = await import("./indicators");
    IndicatorRelease(handle);

    if (sarBuffer.length === 0) return { shouldMove: false, newStopLoss: 0 };

    const sar = sarBuffer[0];
    // For short position: SAR is above price → trailing stop loss
    if (sar > currentPrice) {
      return { shouldMove: true, newStopLoss: sar };
    }
    return { shouldMove: false, newStopLoss: 0 };
  }
}

// ====================== CTrailingMA — Trailing Stop using Moving Average ======================
export class CTrailingMA {
  private _period: number = 50;
  private _maMethod: number = MODE_EMA;
  private _appliedPrice: number = PRICE_CLOSE;

  constructor(period: number = 50, maMethod: number = MODE_EMA, appliedPrice: number = PRICE_CLOSE) {
    this._period = period;
    this._maMethod = maMethod;
    this._appliedPrice = appliedPrice;
  }

  public async CheckTrailingStopLong(symbol: string, timeframe: string, currentPrice: number): Promise<{
    shouldMove: boolean; newStopLoss: number;
  }> {
    const handle = await iMA(symbol, timeframe, this._period, 0, this._maMethod, this._appliedPrice);
    const maBuffer = CopyBuffer(handle, 0, 0, 1);
    const { IndicatorRelease } = await import("./indicators");
    IndicatorRelease(handle);

    if (maBuffer.length === 0) return { shouldMove: false, newStopLoss: 0 };

    const ma = maBuffer[0];
    // For long position: if MA < price, use MA as stop loss
    if (ma < currentPrice) {
      return { shouldMove: true, newStopLoss: ma };
    }
    return { shouldMove: false, newStopLoss: 0 };
  }

  public async CheckTrailingStopShort(symbol: string, timeframe: string, currentPrice: number): Promise<{
    shouldMove: boolean; newStopLoss: number;
  }> {
    const handle = await iMA(symbol, timeframe, this._period, 0, this._maMethod, this._appliedPrice);
    const maBuffer = CopyBuffer(handle, 0, 0, 1);
    const { IndicatorRelease } = await import("./indicators");
    IndicatorRelease(handle);

    if (maBuffer.length === 0) return { shouldMove: false, newStopLoss: 0 };

    const ma = maBuffer[0];
    // For short position: if MA > price, use MA as stop loss
    if (ma > currentPrice) {
      return { shouldMove: true, newStopLoss: ma };
    }
    return { shouldMove: false, newStopLoss: 0 };
  }
}
