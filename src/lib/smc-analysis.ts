// Enhanced Smart Money Concepts (SMC) — inspired by zero-was-here/tradingbot
// Detects institutional order flow, fair value gaps, liquidity zones, and
// market structure shifts (BOS/CHOCH).

import type { Candle } from "@/lib/indicators";

export interface SMCSignal {
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquidityZones: LiquidityZone[];
  marketStructure: {
    bias: "bullish" | "bearish" | "neutral";
    bos: { detected: boolean; direction: "up" | "down" | null; level: number | null };
    choch: { detected: boolean; direction: "up" | "down" | null; level: number | null };
    swingHighs: number[];
    swingLows: number[];
    premiumDiscount: "premium" | "discount" | "equilibrium";
    currentZonePct: number; // 0 = discount (buy zone), 100 = premium (sell zone)
  };
  confidence: number; // 0..100
  summary: string;
}

interface OrderBlock {
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  startTime: number;
  endTime: number;
  mitigated: boolean; // has price returned to this OB?
  strength: number; // 0..100
}

interface FairValueGap {
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  time: number;
  filled: boolean;
  age: number; // candles since creation
}

interface LiquidityZone {
  type: "buyside" | "sellside"; // buyside = above (resting buys), sellside = below (resting sells)
  price: number;
  strength: number; // 0..100
}

// Find swing highs/lows using fractal pattern (5-candle)
function findSwings(candles: Candle[]): { highs: { idx: number; price: number }[]; lows: { idx: number; price: number }[] } {
  const highs: { idx: number; price: number }[] = [];
  const lows: { idx: number; price: number }[] = [];
  const window = 2; // 5-candle fractal

  for (let i = window; i < candles.length - window; i++) {
    const c = candles[i];
    let isHigh = true;
    let isLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isHigh = false;
      if (candles[j].low <= c.low) isLow = false;
    }
    if (isHigh) highs.push({ idx: i, price: c.high });
    if (isLow) lows.push({ idx: i, price: c.low });
  }
  return { highs, lows };
}

// Detect Order Blocks — last opposite-color candle before a strong move
function detectOrderBlocks(candles: Candle[]): OrderBlock[] {
  const blocks: OrderBlock[] = [];
  if (candles.length < 10) return blocks;

  for (let i = 5; i < candles.length - 3; i++) {
    const c = candles[i];
    const next3 = candles.slice(i + 1, i + 4);
    const isBull = c.close < c.open; // bearish candle
    const move = next3.reduce((s, x) => s + (x.close - x.open), 0);
    const moveStrength = Math.abs(move) / c.close;

    if (isBull && move > 0 && moveStrength > 0.002) {
      // Bearish OB before bullish move — bullish OB
      blocks.push({
        type: "bullish",
        top: c.open,
        bottom: c.close,
        startTime: c.time,
        endTime: next3[next3.length - 1].time,
        mitigated: candles.slice(i + 4).some((x) => x.low <= c.open && x.low >= c.close),
        strength: Math.min(100, Math.round(moveStrength * 5000)),
      });
    } else if (!isBull && move < 0 && moveStrength > 0.002) {
      // Bullish OB before bearish move — bearish OB
      blocks.push({
        type: "bearish",
        top: c.close,
        bottom: c.open,
        startTime: c.time,
        endTime: next3[next3.length - 1].time,
        mitigated: candles.slice(i + 4).some((x) => x.high >= c.close && x.high <= c.open),
        strength: Math.min(100, Math.round(moveStrength * 5000)),
      });
    }
  }
  return blocks.slice(-5); // last 5 OBs
}

// Detect Fair Value Gaps — imbalance between consecutive candles
function detectFVGs(candles: Candle[]): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];

    // Bullish FVG: c1.high < c3.low (gap up)
    if (c1.high < c3.low) {
      const top = c3.low;
      const bottom = c1.high;
      const age = candles.length - i - 1;
      const filled = candles.slice(i + 1).some((x) => x.low <= top && x.low >= bottom);
      if (!filled && top - bottom > 0.01) {
        fvgs.push({
          type: "bullish",
          top,
          bottom,
          time: candles[i].time,
          filled,
          age,
        });
      }
    }

    // Bearish FVG: c1.low > c3.high (gap down)
    if (c1.low > c3.high) {
      const top = c1.low;
      const bottom = c3.high;
      const age = candles.length - i - 1;
      const filled = candles.slice(i + 1).some((x) => x.high >= bottom && x.high <= top);
      if (!filled && top - bottom > 0.01) {
        fvgs.push({
          type: "bearish",
          top,
          bottom,
          time: candles[i].time,
          filled,
          age,
        });
      }
    }
  }
  return fvgs.slice(-5); // last 5 FVGs
}

// Detect liquidity zones — equal highs/lows where stops accumulate
function detectLiquidityZones(candles: Candle[], swings: { highs: { idx: number; price: number }[]; lows: { idx: number; price: number }[] }): LiquidityZone[] {
  const zones: LiquidityZone[] = [];
  const tolerance = (candles.at(-1)?.close ?? 1000) * 0.0008; // 0.08% tolerance

  // Equal highs (buyside liquidity)
  for (let i = 0; i < swings.highs.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 5, swings.highs.length); j++) {
      if (Math.abs(swings.highs[i].price - swings.highs[j].price) < tolerance) {
        const price = Math.max(swings.highs[i].price, swings.highs[j].price);
        zones.push({
          type: "buyside",
          price,
          strength: Math.min(100, 60 + (j - i) * 10),
        });
        break;
      }
    }
  }

  // Equal lows (sellside liquidity)
  for (let i = 0; i < swings.lows.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 5, swings.lows.length); j++) {
      if (Math.abs(swings.lows[i].price - swings.lows[j].price) < tolerance) {
        const price = Math.min(swings.lows[i].price, swings.lows[j].price);
        zones.push({
          type: "sellside",
          price,
          strength: Math.min(100, 60 + (j - i) * 10),
        });
        break;
      }
    }
  }

  return zones.slice(-6);
}

// Detect Break of Structure (BOS) and Change of Character (CHOCH)
function detectStructure(
  candles: Candle[],
  swings: { highs: { idx: number; price: number }[]; lows: { idx: number; price: number }[] }
) {
  const lastPrice = candles.at(-1)!.close;
  const recentHighs = swings.highs.slice(-3);
  const recentLows = swings.lows.slice(-3);

  const highestHigh = recentHighs.length ? Math.max(...recentHighs.map((h) => h.price)) : lastPrice;
  const lowestLow = recentLows.length ? Math.min(...recentLows.map((l) => l.price)) : lastPrice;

  // BOS: price breaks previous high (bullish) or low (bearish) in trend direction
  const bosUp = lastPrice > highestHigh * 0.999 && recentHighs.length >= 2;
  const bosDown = lastPrice < lowestLow * 1.001 && recentLows.length >= 2;

  // CHOCH: reversal — price breaks opposite structure
  // Bullish CHOCH: was making lower lows, now breaks above recent high
  // Bearish CHOCH: was making higher highs, now breaks below recent low
  const chochUp = bosUp && recentLows.length >= 2 && recentLows[recentLows.length - 1].price > recentLows[recentLows.length - 2].price;
  const chochDown = bosDown && recentHighs.length >= 2 && recentHighs[recentHighs.length - 1].price < recentHighs[recentHighs.length - 2].price;

  const bias: "bullish" | "bearish" | "neutral" =
    chochUp ? "bullish" : chochDown ? "bearish" : bosUp ? "bullish" : bosDown ? "bearish" : "neutral";

  // Premium/Discount zone
  const range = highestHigh - lowestLow;
  const currentZonePct = range > 0 ? ((lastPrice - lowestLow) / range) * 100 : 50;
  const premiumDiscount: "premium" | "discount" | "equilibrium" =
    currentZonePct > 60 ? "premium" : currentZonePct < 40 ? "discount" : "equilibrium";

  return {
    bias,
    bos: {
      detected: bosUp || bosDown,
      direction: bosUp ? "up" : bosDown ? "down" : null,
      level: bosUp ? highestHigh : bosDown ? lowestLow : null,
    },
    choch: {
      detected: chochUp || chochDown,
      direction: chochUp ? "up" : chochDown ? "down" : null,
      level: chochUp ? highestHigh : chochDown ? lowestLow : null,
    },
    swingHighs: recentHighs.map((h) => h.price),
    swingLows: recentLows.map((l) => l.price),
    premiumDiscount,
    currentZonePct: Math.round(currentZonePct * 10) / 10,
  };
}

export function analyzeSMC(candles: Candle[]): SMCSignal {
  if (candles.length < 20) {
    return {
      orderBlocks: [],
      fairValueGaps: [],
      liquidityZones: [],
      marketStructure: {
        bias: "neutral",
        bos: { detected: false, direction: null, level: null },
        choch: { detected: false, direction: null, level: null },
        swingHighs: [],
        swingLows: [],
        premiumDiscount: "equilibrium",
        currentZonePct: 50,
      },
      confidence: 0,
      summary: "بيانات غير كافية لتحليل SMC",
    };
  }

  const swings = findSwings(candles);
  const orderBlocks = detectOrderBlocks(candles);
  const fairValueGaps = detectFVGs(candles);
  const liquidityZones = detectLiquidityZones(candles, swings);
  const marketStructure = detectStructure(candles, swings);

  // Calculate confidence
  let score = 0;
  if (marketStructure.bias !== "neutral") score += 30;
  if (marketStructure.choch.detected) score += 25;
  if (marketStructure.bos.detected && !marketStructure.choch.detected) score += 15;
  if (orderBlocks.some((ob) => !ob.mitigated)) score += 15;
  if (fairValueGaps.length > 0) score += 10;
  if (liquidityZones.length > 0) score += 5;
  if (marketStructure.premiumDiscount === "discount" && marketStructure.bias === "bullish") score += 10;
  if (marketStructure.premiumDiscount === "premium" && marketStructure.bias === "bearish") score += 10;

  const biasLabel =
    marketStructure.bias === "bullish" ? "صاعد" : marketStructure.bias === "bearish" ? "هابط" : "محايد";
  const zoneLabel =
    marketStructure.premiumDiscount === "discount"
      ? "منطقة الخصم (شراء)"
      : marketStructure.premiumDiscount === "premium"
      ? "منطقة العلاوة (بيع)"
      : "توازن";

  const summary = `SMC: انحياز ${biasLabel} | ${zoneLabel} (${marketStructure.currentZonePct}%) | ${orderBlocks.length} Order Blocks | ${fairValueGaps.length} FVG | ${liquidityZones.length} مناطق سيولة${marketStructure.choch.detected ? " |  CHOCH مكتشف" : marketStructure.bos.detected ? " |  BOS" : ""}`;

  return {
    orderBlocks,
    fairValueGaps,
    liquidityZones,
    marketStructure,
    confidence: Math.min(100, score),
    summary,
  };
}
