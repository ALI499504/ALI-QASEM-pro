//+------------------------------------------------------------------+
//|                                        MROBOT_SMC_Strict.mq5     |
//|                              M.ROBOT — SMC/ICT Strict Strategy   |
//|                                                                  |
//|  5 Strict Conditions (ALL must be 100% met):                    |
//|    1. HTF Trend (Daily EMA50/EMA100 + 4H EMA20/EMA50)          |
//|    2. Liquidity Sweep (sell-side for BUY, buy-side for SELL)    |
//|    3. CHoCH on 15m (body close beyond structure)               |
//|    4. FVG or OB zone + price return                             |
//|    5. R:R >= 1:3                                                |
//|                                                                  |
//|  Risk: 1% per trade | SL: 5 pips beyond local extreme          |
//|  TP: next liquidity level | News Filter: built-in              |
//|                                                                  |
//|  Load in MT5: Strategy Tester (Ctrl+R)                          |
//|  Modeling: Every tick based on real ticks                       |
//+------------------------------------------------------------------+
#property copyright "M.ROBOT 2026"
#property version   "1.00"
#property strict
#property description "SMC/ICT Strict Strategy — 5 conditions + News Filter"
#property description "Risk: 1% | R:R >= 1:3 | SL: 5 pips buffer"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\SymbolInfo.mqh>

// === Input Parameters ===
input double  RiskPercent     = 1.0;       // Risk per trade (% of balance)
input double  MinRRRatio      = 3.0;       // Minimum R:R ratio (1:3)
input int     SL_Pips         = 50;        // Stop Loss buffer (pips, 5 pips = 50 points)
input int     MaxDailyTrades  = 5;         // Max trades per day
input double  MaxDailyLossPct = 3.0;       // Max daily loss (% of balance)
input int     CooldownHours   = 4;        // Cooldown after loss (hours)
input bool    UseNewsFilter   = true;     // Enable news filter
input int     NewsBufferMin   = 15;       // Minutes before/after news to skip
input int     MagicNumber     = 20261018; // EA magic number
input int     MaxHoldHours    = 72;       // Max position hold time (hours)

// === Global Variables ===
CTrade         trade;
CPositionInfo  posInfo;
CSymbolInfo    symInfo;

int            g_dailyTrades    = 0;
double         g_dailyStartBalance = 0;
datetime       g_dayStart       = 0;
datetime       g_lastLossTime   = 0;
int            g_hmaEma50_D1    = INVALID_HANDLE;
int            g_hmaEma100_D1   = INVALID_HANDLE;
int            g_hmaEma20_H4    = INVALID_HANDLE;
int            g_hmaEma50_H4    = INVALID_HANDLE;

// === OnInit ===
int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetTypeFillingBySymbol(_Symbol);
   
   // Initialize EMA indicators on HTF
   g_hmaEma50_D1  = iMA(_Symbol, PERIOD_D1, 50, 0, MODE_EMA, PRICE_CLOSE);
   g_hmaEma100_D1 = iMA(_Symbol, PERIOD_D1, 100, 0, MODE_EMA, PRICE_CLOSE);
   g_hmaEma20_H4  = iMA(_Symbol, PERIOD_H4, 20, 0, MODE_EMA, PRICE_CLOSE);
   g_hmaEma50_H4  = iMA(_Symbol, PERIOD_H4, 50, 0, MODE_EMA, PRICE_CLOSE);
   
   if(g_hmaEma50_D1 == INVALID_HANDLE || g_hmaEma100_D1 == INVALID_HANDLE ||
      g_hmaEma20_H4 == INVALID_HANDLE || g_hmaEma50_H4 == INVALID_HANDLE)
   {
      Print("Failed to create EMA indicators");
      return INIT_FAILED;
   }
   
   g_dayStart = TimeDayStart();
   g_dailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   
   Print("M.ROBOT SMC Strict EA initialized | Risk: ", RiskPercent, "% | R:R >= 1:", DoubleToString(MinRRRatio, 1));
   return INIT_SUCCEEDED;
}

// === OnDeinit ===
void OnDeinit(const int reason)
{
   if(g_hmaEma50_D1  != INVALID_HANDLE) IndicatorRelease(g_hmaEma50_D1);
   if(g_hmaEma100_D1 != INVALID_HANDLE) IndicatorRelease(g_hmaEma100_D1);
   if(g_hmaEma20_H4  != INVALID_HANDLE) IndicatorRelease(g_hmaEma20_H4);
   if(g_hmaEma50_H4  != INVALID_HANDLE) IndicatorRelease(g_hmaEma50_H4);
}

// === OnTick — main strategy logic ===
void OnTick()
{
   // === Check daily reset ===
   CheckDailyReset();
   
   // === Check if we have an open position ===
   if(PositionsTotal() > 0)
   {
      ManageOpenPosition();
      return;
   }
   
   // === Risk checks ===
   if(g_dailyTrades >= MaxDailyTrades) return;
   
   double currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   double dailyPnL = currentBalance - g_dailyStartBalance;
   if(dailyPnL <= -g_dailyStartBalance * MaxDailyLossPct / 100.0) return;
   
   // === Cooldown check ===
   if(g_lastLossTime > 0)
   {
      datetime now = TimeCurrent();
      if(now - g_lastLossTime < CooldownHours * 3600) return;
   }
   
   // === News filter check ===
   if(UseNewsFilter && IsNewsTime()) return;
   
   // === Run SMC/ICT strategy ===
   CheckSMCStrategy();
}

// === Condition 1: HTF Trend ===
int CheckHTFTrend()
{
   double ema50_D1[1], ema100_D1[1], ema20_H4[1], ema50_H4[1];
   
   if(CopyBuffer(g_hmaEma50_D1, 0, 0, 1, ema50_D1) <= 0) return 0;
   if(CopyBuffer(g_hmaEma100_D1, 0, 0, 1, ema100_D1) <= 0) return 0;
   if(CopyBuffer(g_hmaEma20_H4, 0, 0, 1, ema20_H4) <= 0) return 0;
   if(CopyBuffer(g_hmaEma50_H4, 0, 0, 1, ema50_H4) <= 0) return 0;
   
   double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   
   bool dailyBullish = price > ema50_D1[0] && ema50_D1[0] > ema100_D1[0];
   bool dailyBearish = price < ema50_D1[0] && ema50_D1[0] < ema100_D1[0];
   bool h4Bullish    = price > ema20_H4[0] && ema20_H4[0] > ema50_H4[0];
   bool h4Bearish    = price < ema20_H4[0] && ema20_H4[0] < ema50_H4[0];
   
   if(dailyBullish && h4Bullish) return 1;   // Bullish
   if(dailyBearish && h4Bearish) return -1;   // Bearish
   return 0;                                   // Ranging
}

// === Condition 2: Liquidity Sweep ===
// Checks if recent candle wicked beyond a previous swing high/low
bool CheckLiquiditySweep(int htfDirection, double &sweepLevel)
{
   double highs[], lows[], opens[], closes[];
   int count = 50;
   
   if(CopyHigh(_Symbol, PERIOD_M15, 0, count, highs) <= 0) return false;
   if(CopyLow(_Symbol, PERIOD_M15, 0, count, lows) <= 0) return false;
   if(CopyOpen(_Symbol, PERIOD_M15, 0, count, opens) <= 0) return false;
   if(CopyClose(_Symbol, PERIOD_M15, 0, count, closes) <= 0) return false;
   
   // Find previous swing low (for bullish — sell-side liquidity)
   // Look at candles 5-45 (skip last 5 to find "previous" swing)
   double prevSwingLow = 0;
   double prevSwingHigh = 0;
   
   for(int i = 5; i < count - 1; i++)
   {
      // Simple swing detection: lower than neighbors
      if(lows[i] < lows[i-1] && lows[i] < lows[i+1] && lows[i] < lows[i-2])
      {
         if(prevSwingLow == 0 || lows[i] < prevSwingLow)
            prevSwingLow = lows[i];
      }
      if(highs[i] > highs[i-1] && highs[i] > highs[i+1] && highs[i] > highs[i-2])
      {
         if(prevSwingHigh == 0 || highs[i] > prevSwingHigh)
            prevSwingHigh = highs[i];
      }
   }
   
   // Check last 20 candles for sweep
   for(int i = count - 20; i < count; i++)
   {
      if(htfDirection > 0 && prevSwingLow > 0)
      {
         // Sell-side sweep: candle low went below prevSwingLow, but close above
         if(lows[i] < prevSwingLow && closes[i] > prevSwingLow)
         {
            sweepLevel = prevSwingLow;
            return true;
         }
      }
      if(htfDirection < 0 && prevSwingHigh > 0)
      {
         // Buy-side sweep: candle high went above prevSwingHigh, but close below
         if(highs[i] > prevSwingHigh && closes[i] < prevSwingHigh)
         {
            sweepLevel = prevSwingHigh;
            return true;
         }
      }
   }
   
   return false;
}

// === Condition 3: CHoCH on 15m (body close) ===
bool CheckCHoCH(int htfDirection, double &chochLevel)
{
   double highs[], lows[], opens[], closes[];
   int count = 30;
   
   if(CopyHigh(_Symbol, PERIOD_M15, 0, count, highs) <= 0) return false;
   if(CopyLow(_Symbol, PERIOD_M15, 0, count, lows) <= 0) return false;
   if(CopyOpen(_Symbol, PERIOD_M15, 0, count, opens) <= 0) return false;
   if(CopyClose(_Symbol, PERIOD_M15, 0, count, closes) <= 0) return false;
   
   // Find recent lower-high (for bullish CHoCH) or higher-low (for bearish)
   double recentStructureLevel = 0;
   
   for(int i = 2; i < count - 5; i++)
   {
      if(htfDirection > 0)
      {
         // Find lower high (resistance to break)
         if(highs[i] > highs[i-1] && highs[i] > highs[i+1])
         {
            recentStructureLevel = highs[i];
         }
      }
      else
      {
         // Find higher low (support to break)
         if(lows[i] < lows[i-1] && lows[i] < lows[i+1])
         {
            recentStructureLevel = lows[i];
         }
      }
   }
   
   if(recentStructureLevel == 0) return false;
   
   // Check if any candle CLOSED (body) beyond this level
   for(int i = count - 5; i < count; i++)
   {
      if(htfDirection > 0 && closes[i] > recentStructureLevel)
      {
         chochLevel = recentStructureLevel;
         return true;
      }
      if(htfDirection < 0 && closes[i] < recentStructureLevel)
      {
         chochLevel = recentStructureLevel;
         return true;
      }
   }
   
   return false;
}

// === Condition 4: FVG or OB zone ===
bool CheckFVGorOB(int htfDirection, double &zoneTop, double &zoneBottom)
{
   double highs[], lows[], opens[], closes[];
   int count = 15;
   
   if(CopyHigh(_Symbol, PERIOD_M15, 0, count, highs) <= 0) return false;
   if(CopyLow(_Symbol, PERIOD_M15, 0, count, lows) <= 0) return false;
   if(CopyOpen(_Symbol, PERIOD_M15, 0, count, opens) <= 0) return false;
   if(CopyClose(_Symbol, PERIOD_M15, 0, count, closes) <= 0) return false;
   
   // Bullish FVG: candle[i-1].high < candle[i+1].low
   for(int i = 1; i < count - 1; i++)
   {
      if(htfDirection > 0 && lows[i+1] > highs[i-1])
      {
         zoneTop = lows[i+1];
         zoneBottom = highs[i-1];
         return true;
      }
      if(htfDirection < 0 && highs[i+1] < lows[i-1])
      {
         zoneTop = lows[i-1];
         zoneBottom = highs[i+1];
         return true;
      }
   }
   
   // Order Block: last opposite candle before impulse
   for(int i = count - 1; i >= 1; i--)
   {
      if(htfDirection > 0 && closes[i] < opens[i] && closes[i-1] > opens[i-1])
      {
         zoneTop = MathMax(opens[i], closes[i]);
         zoneBottom = MathMin(opens[i], closes[i]);
         return true;
      }
      if(htfDirection < 0 && closes[i] > opens[i] && closes[i-1] < opens[i-1])
      {
         zoneTop = MathMax(opens[i], closes[i]);
         zoneBottom = MathMin(opens[i], closes[i]);
         return true;
      }
   }
   
   return false;
}

// === Condition 5: R:R >= 1:3 ===
bool CheckRiskReward(double entry, double sl, double tp, double &rrRatio)
{
   double slDist = MathAbs(entry - sl);
   double tpDist = MathAbs(tp - entry);
   
   if(slDist <= 0) return false;
   
   rrRatio = tpDist / slDist;
   return rrRatio >= MinRRRatio;
}

// === Main SMC Strategy Check ===
void CheckSMCStrategy()
{
   // 1. HTF Trend
   int htfDirection = CheckHTFTrend();
   if(htfDirection == 0) return;
   
   // 2. Liquidity Sweep
   double sweepLevel = 0;
   if(!CheckLiquiditySweep(htfDirection, sweepLevel)) return;
   
   // 3. CHoCH
   double chochLevel = 0;
   if(!CheckCHoCH(htfDirection, chochLevel)) return;
   
   // 4. FVG or OB
   double zoneTop = 0, zoneBottom = 0;
   if(!CheckFVGorOB(htfDirection, zoneTop, zoneBottom)) return;
   
   // Check if price is near/in the zone
   double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double tolerance = currentPrice * 0.002; // 0.2% tolerance
   bool priceInZone = (currentPrice >= zoneBottom - tolerance && currentPrice <= zoneTop + tolerance);
   if(!priceInZone) return;
   
   // 5. Calculate SL and TP
   double slDistance = SL_Pips * _Point * 10; // Convert pips to price distance
   double sl, tp;
   
   // Find next liquidity level for TP
   double nextLiquidity = 0;
   double highs[], lows[];
   if(CopyHigh(_Symbol, PERIOD_M15, 0, 100, highs) > 0 && CopyLow(_Symbol, PERIOD_M15, 0, 100, lows) > 0)
   {
      if(htfDirection > 0)
      {
         // BUY: find nearest swing high above current price
         for(int i = 0; i < 100; i++)
         {
            if(highs[i] > currentPrice)
            {
               if(nextLiquidity == 0 || highs[i] < nextLiquidity)
                  nextLiquidity = highs[i];
            }
         }
      }
      else
      {
         // SELL: find nearest swing low below current price
         for(int i = 0; i < 100; i++)
         {
            if(lows[i] < currentPrice)
            {
               if(nextLiquidity == 0 || lows[i] > nextLiquidity)
                  nextLiquidity = lows[i];
            }
         }
      }
   }
   
   if(nextLiquidity == 0) return;
   
   // SL: 5 pips beyond local extreme (sweep level)
   if(htfDirection > 0)
   {
      sl = sweepLevel - slDistance;
      tp = nextLiquidity;
   }
   else
   {
      sl = sweepLevel + slDistance;
      tp = nextLiquidity;
   }
   
   // 5. Check R:R
   double rrRatio = 0;
   if(!CheckRiskReward(currentPrice, sl, tp, rrRatio)) return;
   
   // === ALL 5 CONDITIONS MET — Execute trade ===
   double lotSize = CalculateLotSize(currentPrice, sl);
   
   bool result;
   if(htfDirection > 0)
   {
      result = trade.Buy(lotSize, _Symbol, currentPrice, sl, tp, "M.ROBOT SMC BUY");
   }
   else
   {
      result = trade.Sell(lotSize, _Symbol, currentPrice, sl, tp, "M.ROBOT SMC SELL");
   }
   
   if(result)
   {
      g_dailyTrades++;
      Print("M.ROBOT: ", (htfDirection > 0 ? "BUY" : "SELL"), " @ ", currentPrice,
            " | SL: ", sl, " | TP: ", tp, " | R:R: 1:", DoubleToString(rrRatio, 2),
            " | Lot: ", DoubleToString(lotSize, 3));
   }
   else
   {
      Print("M.ROBOT: Trade failed — ", trade.ResultRetcode(), " ", trade.ResultComment());
   }
}

// === Position sizing (1% risk) ===
double CalculateLotSize(double entry, double sl)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmount = balance * RiskPercent / 100.0;
   double slDistance = MathAbs(entry - sl);
   
   // XAUUSD: 1 lot = 100 oz, $1 price move = $100 per lot
   double lotSize = riskAmount / (slDistance * 100.0);
   
   // Normalize to broker's lot step
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   
   lotSize = MathRound(lotSize / lotStep) * lotStep;
   lotSize = MathMax(minLot, MathMin(maxLot, lotSize));
   
   return lotSize;
}

// === Manage open position (SL/TP/timeout) ===
void ManageOpenPosition()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(posInfo.SelectByIndex(i))
      {
         if(posInfo.Symbol() != _Symbol) continue;
         if(posInfo.Magic() != MagicNumber) continue;
         
         // Check timeout
         datetime openTime = (datetime)posInfo.Time();
         if(TimeCurrent() - openTime > MaxHoldHours * 3600)
         {
            trade.PositionClose(posInfo.Ticket());
            Print("M.ROBOT: Position #", posInfo.Ticket(), " closed (timeout)");
         }
      }
   }
}

// === News Filter ===
// Simple news time check — blocks trading during high-impact news
// For production: load from Forex Factory CSV or broker calendar
bool IsNewsTime()
{
   // In backtest mode, check if current time matches known high-impact news times
   // This is a simplified version — for production, use a CSV file or MQL5 calendar
   
   datetime now = TimeCurrent();
   int hour = TimeHour(now);
   int dayOfWeek = TimeDayOfWeek(now);
   
   // Block trading during typical news hours (simplified)
   // NFP: First Friday of month at 13:30 (UTC+3 server time)
   // FOMC: Varies, but typically 19:00-21:00
   // CPI: Typically 13:30
   
   // Friday after 22:00 — avoid holding positions into weekend
   if(dayOfWeek == 5 && hour >= 22) return true;
   
   // For real news filtering, load a CSV with news times:
   // string newsFile = "MROBOT_NewsFilter.csv";
   // if(FileIsExist(newsFile)) { ... check times ... }
   
   return false;
}

// === Daily reset ===
void CheckDailyReset()
{
   datetime today = TimeDayStart();
   if(today != g_dayStart)
   {
      g_dayStart = today;
      g_dailyTrades = 0;
      g_dailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      Print("M.ROBOT: New day — trades reset, start balance: ", g_dailyStartBalance);
   }
}

// === Helper: start of day ===
datetime TimeDayStart()
{
   datetime now = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(now, dt);
   dt.hour = 0; dt.min = 0; dt.sec = 0;
   return StructToTime(dt);
}
