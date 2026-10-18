// ICT Strategy (Inner Circle Trader) — professional smart-money concepts
// Components:
//   1. Order Blocks (OB) — last opposite candle before strong impulse move
//   2. Fair Value Gaps (FVG) — imbalance / 3-candle gap left by momentum
//   3. Liquidity Sweeps — stop-hunts above swing-high / below swing-low
//   4. Change of Character (CHoCH) — first break of structure against trend
//   5. Break of Structure (BOS) — continuation of trend
//
// Signal triggers when 3+ ICT components align with confluence.
// Risk: max 1% per trade | R:R minimum 1:1.3 (target 1:3), target 1:1.5 to 1:3

import type { Candle, IndicatorSet } from "@/lib/indicators";

export interface ICTSignal {
  action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;        // 0..100
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;       // R:R 1:1.5
  takeProfit2: number;       // R:R 1:2
  takeProfit3: number;       // R:R 1:3
  riskRewardRatio: number;  // computed, minimum 1.3
  riskAmount: number;        // $ risked (1% of $1000 = $10)
  lotSize: number;           // lots for XAUUSD
  components: ICTComponents;
  narrative: string;
  timestamp: number;
}

export interface ICTComponents {
  orderBlocks: {
    bullish: OrderBlock[];
    bearish: OrderBlock[];
    activeBlock: OrderBlock | null;
  };
  fvgs: {
    bullish: FairValueGap[];
    bearish: FairValueGap[];
    activeFvg: FairValueGap | null;
  };
  liquidity: {
    buySide: number[];   // rest buy-stops above swing highs
    sellSide: number[];  // rest sell-stops below swing lows
    recentSweep: { type: "buy-side" | "sell-side"; price: number; time: number } | null;
  };
  marketStructure: {
    trend: "bullish" | "bearish" | "ranging";
    lastBOS: { direction: "up" | "down"; price: number; time: number } | null;
    lastCHoCH: { direction: "up" | "down"; price: number; time: number } | null;
  };
  checklist: { label: string; passed: boolean }[];
}

export interface OrderBlock {
  type: "bullish" | "bearish";
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  top: number;
  bottom: number;
  mitigated: boolean;
}

export interface FairValueGap {
  type: "bullish" | "bearish";
  time: number;
  top: number;
  bottom: number;
  midpoint: number;
  filled: boolean;
}

// === Swing detection ===
function findSwings(candles: Candle[], lookback = 3): {
  highs: { time: number; price: number; index: number }[];
  lows: { time: number; price: number; index: number }[];
} {
  const highs: { time: number; price: number; index: number }[] = [];
  const lows: { time: number; price: number; index: number }[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    const isHigh = slice.every((c) => candles[i].high >= c.high);
    const isLow = slice.every((c) => candles[i].low <= c.low);
    if (isHigh) highs.push({ time: candles[i].time, price: candles[i].high, index: i });
    if (isLow) lows.push({ time: candles[i].time, price: candles[i].low, index: i });
  }
  return { highs, lows };
}

// === Order Block detection ===
// Bullish OB = last bearish candle before a strong bullish impulse (engulfing + breaks structure)
// Bearish OB = last bullish candle before a strong bearish impulse
function detectOrderBlocks(candles: Candle[]): { bullish: OrderBlock[]; bearish: OrderBlock[] } {
  const bullish: OrderBlock[] = [];
  const bearish: OrderBlock[] = [];
  if (candles.length < 5) return { bullish, bearish };

  for (let i = 2; i < candles.length - 1; i++) {
    const cur = candles[i];
    const next = candles[i + 1];
    const prev = candles[i - 1];

    // Bullish OB: bearish candle followed by strong bullish candle that displaces price
    if (cur.close < cur.open && next.close > cur.high) {
      const displacement = (next.close - next.open) / cur.close;
      const bodySize = Math.abs(cur.close - cur.open);
      const avgBody = candles.slice(Math.max(0, i - 10), i).reduce((s, c) => s + Math.abs(c.close - c.open), 0) / Math.min(10, i);
      if (displacement > 0.001 && bodySize > avgBody * 0.8) {
        bullish.push({
          type: "bullish",
          openTime: cur.time,
          open: cur.open,
          high: cur.high,
          low: cur.low,
          close: cur.close,
          top: Math.max(cur.open, cur.close),
          bottom: Math.min(cur.open, cur.close),
          mitigated: false,
        });
      }
    }
    // Bearish OB: bullish candle followed by strong bearish candle
    if (cur.close > cur.open && next.close < cur.low) {
      const displacement = (next.open - next.close) / cur.close;
      const bodySize = Math.abs(cur.close - cur.open);
      const avgBody = candles.slice(Math.max(0, i - 10), i).reduce((s, c) => s + Math.abs(c.close - c.open), 0) / Math.min(10, i);
      if (displacement > 0.001 && bodySize > avgBody * 0.8) {
        bearish.push({
          type: "bearish",
          openTime: cur.time,
          open: cur.open,
          high: cur.high,
          low: cur.low,
          close: cur.close,
          top: Math.max(cur.open, cur.close),
          bottom: Math.min(cur.open, cur.close),
          mitigated: false,
        });
      }
    }
  }

  // Mark mitigated OBs (price has returned to them)
  const lastPrice = candles.at(-1)!.close;
  const recent = candles.slice(-30);
  for (const ob of bullish) {
    if (recent.some((c) => c.low <= ob.top && c.low >= ob.bottom)) ob.mitigated = true;
  }
  for (const ob of bearish) {
    if (recent.some((c) => c.high >= ob.bottom && c.high <= ob.top)) ob.mitigated = true;
  }

  // Return only the most recent 5 each
  return {
    bullish: bullish.slice(-5),
    bearish: bearish.slice(-5),
  };
}

// === Fair Value Gap (FVG) detection ===
// Bullish FVG: candle[i-1].high < candle[i+1].low (gap up)
// Bearish FVG: candle[i-1].low > candle[i+1].high (gap down)
function detectFVGs(candles: Candle[]): { bullish: FairValueGap[]; bearish: FairValueGap[] } {
  const bullish: FairValueGap[] = [];
  const bearish: FairValueGap[] = [];
  if (candles.length < 3) return { bullish, bearish };

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const next = candles[i + 1];

    if (next.low > prev.high) {
      bullish.push({
        type: "bullish",
        time: candles[i].time,
        top: next.low,
        bottom: prev.high,
        midpoint: (next.low + prev.high) / 2,
        filled: false,
      });
    }
    if (next.high < prev.low) {
      bearish.push({
        type: "bearish",
        time: candles[i].time,
        top: prev.low,
        bottom: next.high,
        midpoint: (prev.low + next.high) / 2,
        filled: false,
      });
    }
  }

  // Mark filled FVGs
  const lastPrice = candles.at(-1)!.close;
  for (const fvg of bullish) {
    if (lastPrice < fvg.bottom) fvg.filled = false;
    else if (lastPrice >= fvg.bottom && lastPrice <= fvg.top) fvg.filled = false;
    else fvg.filled = true;
  }
  for (const fvg of bearish) {
    if (lastPrice > fvg.top) fvg.filled = false;
    else if (lastPrice >= fvg.bottom && lastPrice <= fvg.top) fvg.filled = false;
    else fvg.filled = true;
  }

  return {
    bullish: bullish.slice(-5),
    bearish: bearish.slice(-5),
  };
}

// === Liquidity detection ===
// Buy-side liquidity = stop-losses above equal highs and swing highs
// Sell-side liquidity = stop-losses below equal lows and swing lows
function detectLiquidity(candles: Candle[]) {
  const { highs, lows } = findSwings(candles, 3);

  // Group nearby highs as buy-side liquidity pools
  const buySide: number[] = [];
  for (const h of highs.slice(-5)) {
    if (!buySide.some((p) => Math.abs(p - h.price) < h.price * 0.0005)) {
      buySide.push(h.price);
    }
  }
  // Sort descending (most recent first)
  buySide.sort((a, b) => b - a);

  const sellSide: number[] = [];
  for (const l of lows.slice(-5)) {
    if (!sellSide.some((p) => Math.abs(p - l.price) < l.price * 0.0005)) {
      sellSide.push(l.price);
    }
  }
  sellSide.sort((a, b) => a - b);

  // Detect recent sweep (price wicked beyond a swing level then reversed)
  let recentSweep: { type: "buy-side" | "sell-side"; price: number; time: number } | null = null;
  if (candles.length >= 3) {
    const last3 = candles.slice(-3);
    const last = last3.at(-1)!;
    // Buy-side sweep: last candle wicked above a previous swing high then closed below
    for (const h of highs.slice(-10)) {
      if (last3.some((c) => c.high > h.price) && last.close < h.price) {
        recentSweep = { type: "buy-side", price: h.price, time: last.time };
        break;
      }
    }
    if (!recentSweep) {
      for (const l of lows.slice(-10)) {
        if (last3.some((c) => c.low < l.price) && last.close > l.price) {
          recentSweep = { type: "sell-side", price: l.price, time: last.time };
          break;
        }
      }
    }
  }

  return { buySide, sellSide, recentSweep };
}

// === Market structure (BOS + CHoCH) ===
function detectMarketStructure(candles: Candle[]) {
  const { highs, lows } = findSwings(candles, 3);
  let trend: "bullish" | "bearish" | "ranging" = "ranging";
  let lastBOS: { direction: "up" | "down"; price: number; time: number } | null = null;
  let lastCHoCH: { direction: "up" | "down"; price: number; time: number } | null = null;

  if (highs.length >= 2 && lows.length >= 2) {
    const lastHigh = highs.at(-1)!;
    const prevHigh = highs.at(-2)!;
    const lastLow = lows.at(-1)!;
    const prevLow = lows.at(-2)!;
    const last = candles.at(-1)!;

    // Trending up: higher highs + higher lows
    if (lastHigh.price > prevHigh.price && lastLow.price > prevLow.price) {
      trend = "bullish";
    } else if (lastHigh.price < prevHigh.price && lastLow.price < prevLow.price) {
      trend = "bearish";
    }

    // BOS = continuation (closes beyond last swing in trend direction)
    if (trend === "bullish" && last.close > lastHigh.price) {
      lastBOS = { direction: "up", price: lastHigh.price, time: last.time };
    } else if (trend === "bearish" && last.close < lastLow.price) {
      lastBOS = { direction: "down", price: lastLow.price, time: last.time };
    }

    // CHoCH = reversal (break against trend direction)
    if (trend === "bullish" && last.close < lastLow.price) {
      lastCHoCH = { direction: "down", price: lastLow.price, time: last.time };
    } else if (trend === "bearish" && last.close > lastHigh.price) {
      lastCHoCH = { direction: "up", price: lastHigh.price, time: last.time };
    }
  }

  return { trend, lastBOS, lastCHoCH };
}

/**
 * Compute ICT signal — strict 5-component checklist.
 * BUY signal requires:
 *   1. Bullish OB present and unmitigated below current price
 *   2. Bullish FVG unfilled below current price
 *   3. Recent sell-side liquidity sweep (stop-hunt below swing low)
 *   4. Market structure: bullish BOS OR CHoCH up from bearish
 *   5. Price currently inside or near the OB / FVG zone
 */
export function computeICTSignal(
  candles: Candle[],
  ind: IndicatorSet,
  accountBalance: number = 1000
): ICTSignal {
  const currentPrice = candles.at(-1)?.close ?? 0;
  const obs = detectOrderBlocks(candles);
  const fvgs = detectFVGs(candles);
  const liq = detectLiquidity(candles);
  const structure = detectMarketStructure(candles);

  // Find the closest active bullish OB below current price
  const activeBullOB = obs.bullish.filter((o) => !o.mitigated && o.top < currentPrice).at(-1) ?? null;
  const activeBearOB = obs.bearish.filter((o) => !o.mitigated && o.bottom > currentPrice).at(0) ?? null;
  const activeBlock = activeBullOB ?? activeBearOB;

  // Find the closest active bullish FVG below current price
  const activeBullFVG = fvgs.bullish.filter((f) => !f.filled && f.top < currentPrice).at(-1) ?? null;
  const activeBearFVG = fvgs.bearish.filter((f) => !f.filled && f.bottom > currentPrice).at(0) ?? null;
  const activeFvg = activeBullFVG ?? activeBearFVG;

  const checklist: { label: string; passed: boolean }[] = [];

  // BUY checklist
  const buyChecklist = [
    { label: "OB صاعد غير مُتعادل أسفل السعر", passed: !!activeBullOB },
    { label: "FVG صاعد غير مملوء أسفل السعر", passed: !!activeBullFVG },
    { label: "اجتياح سيولة بيعية حديث (Stop-hunt تحت القاع)", passed: liq.recentSweep?.type === "sell-side" },
    { label: "بنية السوق: BOS صاعد أو CHoCH صاعد", passed: structure.lastBOS?.direction === "up" || structure.lastCHoCH?.direction === "up" },
    { label: "السعر قرب منطقة الـ OB / FVG (ضمن 0.3%)", passed: activeBullOB ? Math.abs(currentPrice - activeBullOB.top) / currentPrice < 0.003 : false },
  ];

  // SELL checklist
  const sellChecklist = [
    { label: "OB هابط غير مُتعادل فوق السعر", passed: !!activeBearOB },
    { label: "FVG هابط غير مملوء فوق السعر", passed: !!activeBearFVG },
    { label: "اجتياح سيولة شرائية حديث (Stop-hunt فوق القمة)", passed: liq.recentSweep?.type === "buy-side" },
    { label: "بنية السوق: BOS هابط أو CHoCH هابط", passed: structure.lastBOS?.direction === "down" || structure.lastCHoCH?.direction === "down" },
    { label: "السعر قرب منطقة الـ OB / FVG (ضمن 0.3%)", passed: activeBearOB ? Math.abs(currentPrice - activeBearOB.bottom) / currentPrice < 0.003 : false },
  ];

  const buyScore = buyChecklist.filter((c) => c.passed).length;
  const sellScore = sellChecklist.filter((c) => c.passed).length;

  let action: ICTSignal["action"] = "HOLD";
  let direction: "BUY" | "SELL" | "NONE" = "NONE";
  let narrative = "";

  if (buyScore >= 3 && buyScore > sellScore) {
    action = buyScore === 5 ? "STRONG_BUY" : "BUY";
    direction = "BUY";
    narrative = `إشارة شراء ICT: ${buyScore}/5 شروط متحققة. OB صاعد غير مُتعادل + FVG + اجتياح سيولة + بنية السوق صاعدة.`;
    checklist.push(...buyChecklist);
  } else if (sellScore >= 3 && sellScore > buyScore) {
    action = sellScore === 5 ? "STRONG_SELL" : "SELL";
    direction = "SELL";
    narrative = `إشارة بيع ICT: ${sellScore}/5 شروط متحققة. OB هابط غير مُتعادل + FVG + اجتياح سيولة + بنية السوق هابطة.`;
    checklist.push(...sellChecklist);
  } else {
    action = "HOLD";
    narrative = `لا توجد إشارة ICT كافية. شروط الشراء: ${buyScore}/5، شروط البيع: ${sellScore}/5. ننتظر تجمع السيولة.`;
    checklist.push(...buyChecklist);
  }

  const confidence = Math.max(buyScore, sellScore) * 20; // 0..100

  // Risk management — strict: 1% per trade, min R:R 1:1.3-3
  const riskAmount = Math.min(accountBalance * 0.01, 10); // max $10 on $1000
  const slPct = 0.006; // 0.6% SL distance
  const slDistance = currentPrice * slPct;
  const stopLoss = direction === "BUY"
    ? (activeBullOB ? activeBullOB.bottom : currentPrice - slDistance)
    : (activeBearOB ? activeBearOB.top : currentPrice + slDistance);
  const actualSLDist = Math.abs(currentPrice - stopLoss);

  // Take profits at R:R 1:1.5, 1:2, 1:3 (all above 1.3 minimum)
  const tp1Dist = actualSLDist * 1.5;
  const tp2Dist = actualSLDist * 2.0;
  const tp3Dist = actualSLDist * 3.0;
  const takeProfit1 = direction === "BUY" ? currentPrice + tp1Dist : currentPrice - tp1Dist;
  const takeProfit2 = direction === "BUY" ? currentPrice + tp2Dist : currentPrice - tp2Dist;
  const takeProfit3 = direction === "BUY" ? currentPrice + tp3Dist : currentPrice - tp3Dist;

  // Lot size for XAUUSD: 1 lot = 100 oz, $1 move = $100 per lot
  // Risk = (SL_distance_in_dollars) * lot * 100
  // So lot = riskAmount / (actualSLDist * 100)
  const lotSize = actualSLDist > 0 ? Math.min(0.05, Math.max(0.01, riskAmount / (actualSLDist * 100))) : 0.01;

  const rrRatio = actualSLDist > 0 ? tp1Dist / actualSLDist : 1.5; // min 1.3 enforced by design

  return {
    action,
    confidence,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    riskRewardRatio: Math.max(1.3, rrRatio),
    riskAmount,
    lotSize,
    components: {
      orderBlocks: { ...obs, activeBlock },
      fvgs: { ...fvgs, activeFvg },
      liquidity: liq,
      marketStructure: structure,
      checklist,
    },
    narrative,
    timestamp: Date.now(),
  };
}
