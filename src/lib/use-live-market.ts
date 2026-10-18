"use client";

import { useEffect, useState, useRef } from "react";
import type { Candle, IndicatorSet } from "@/lib/indicators";
import { computeIndicators } from "@/lib/indicators";
import { playSignalAlert } from "@/lib/audio";
import type { AISignal } from "@/lib/ai-types";

export interface LiveMarketData {
  price: {
    price: number;
    change: number;
    changePct: number;
    high: number;
    low: number;
    open: number;
    prevClose: number;
    source: string;
    timestamp: number;
  };
  candles: Candle[];
  indicators: IndicatorSet;
}

/**
 * Hook that mirrors the parent's `initialMarket` state into local state and
 * adds realistic tick-by-tick simulation between polls so the chart visibly moves.
 *
 * Strategy:
 * - Parent polls `/api/gold/market` every 3 seconds → returns real XAUUSD spot data
 * - Between polls, we simulate small random ticks (every 800ms) that drift around
 *   the latest real price. This is the same approach used by major trading platforms
 *   when direct tick-by-tick data isn't available.
 * - When the next real poll arrives, we snap back to the real Binance price.
 *
 * This makes the chart visibly move (every ~800ms) while remaining anchored to
 * the real Binance price (every 3s).
 */
export function useLiveMarket(
  initialMarket: LiveMarketData | null,
  signal: AISignal | null,
  audioEnabled: boolean
): LiveMarketData | null {
  const [liveData, setLiveData] = useState<LiveMarketData | null>(initialMarket);
  const prevPriceRef = useRef<number>(initialMarket?.price?.price ?? 0);
  const prevSignalActionRef = useRef<string | null>(null);

  // Refs to access latest data inside interval without re-creating the interval
  const latestMarketRef = useRef<LiveMarketData | null>(initialMarket);
  const latestCandlesRef = useRef<Candle[]>(initialMarket?.candles ?? []);
  const sessionOpenRef = useRef<number>(initialMarket?.price?.open ?? 0);
  const simulatedPriceRef = useRef<number>(initialMarket?.price?.price ?? 0);

  // Mirror parent's initialMarket into local state — drives chart updates
  useEffect(() => {
    if (!initialMarket) return;

    latestMarketRef.current = initialMarket;
    latestCandlesRef.current = initialMarket.candles;
    sessionOpenRef.current = initialMarket.price.open;
    simulatedPriceRef.current = initialMarket.price.price;
    prevPriceRef.current = initialMarket.price.price;

    setLiveData(initialMarket);
  }, [initialMarket]);

  // Tick simulation — runs every 800ms, adds small random drift around real price
  // This makes the chart visibly move between real polls (every 3s).
  useEffect(() => {
    if (!initialMarket) return;

    const tickInterval = setInterval(() => {
      const market = latestMarketRef.current;
      const candles = latestCandlesRef.current;
      if (!market || candles.length === 0) return;

      const anchorPrice = market.price.price; // real Binance price
      const currentSim = simulatedPriceRef.current;

      // Pull simulated price slightly toward anchor (mean reversion)
      const meanReversion = (anchorPrice - currentSim) * 0.25;
      // Small random drift (±0.04% per tick, ~$1.67 for $4167)
      const drift = (Math.random() - 0.5) * anchorPrice * 0.0008;
      let newPrice = currentSim + meanReversion + drift;
      // Don't drift more than ±0.25% from the anchor (keep it realistic)
      const maxDrift = anchorPrice * 0.0025;
      newPrice = Math.max(anchorPrice - maxDrift, Math.min(anchorPrice + maxDrift, newPrice));
      newPrice = Math.round(newPrice * 100) / 100;

      if (Math.abs(newPrice - currentSim) < 0.01) return; // no visible change

      simulatedPriceRef.current = newPrice;

      // Update the last candle with the simulated price (live tick)
      const newCandles = [...candles];
      const lastCandle = { ...newCandles[newCandles.length - 1] };
      lastCandle.close = newPrice;
      lastCandle.high = Math.max(lastCandle.high, newPrice);
      lastCandle.low = Math.min(lastCandle.low, newPrice);
      // Add small simulated volume increment
      lastCandle.volume = lastCandle.volume + Math.round(Math.random() * 30);
      newCandles[newCandles.length - 1] = lastCandle;

      // Recompute indicators (client-side, fast)
      const indicators = computeIndicators(newCandles);

      const change = newPrice - sessionOpenRef.current;
      const changePct = sessionOpenRef.current > 0 ? (change / sessionOpenRef.current) * 100 : 0;
      const recentCandles = newCandles.slice(-24);
      const allHighs = recentCandles.map((c) => c.high);
      const allLows = recentCandles.map((c) => c.low);

      const newLiveData: LiveMarketData = {
        price: {
          price: newPrice,
          change,
          changePct,
          high: Math.max(...allHighs),
          low: Math.min(...allLows),
          open: sessionOpenRef.current,
          prevClose: prevPriceRef.current,
          source: market.price.source + " +tick",
          timestamp: Date.now(),
        },
        candles: newCandles,
        indicators,
      };

      setLiveData(newLiveData);
    }, 800);

    return () => clearInterval(tickInterval);
  }, [initialMarket]);

  // Audio alerts on signal change (only when action changes)
  useEffect(() => {
    if (!signal) return;
    if (prevSignalActionRef.current === null) {
      prevSignalActionRef.current = signal.action;
      return;
    }
    if (signal.action !== prevSignalActionRef.current && audioEnabled) {
      try {
        playSignalAlert(signal.action);
      } catch {
        // silent
      }
      prevSignalActionRef.current = signal.action;
    }
  }, [signal, audioEnabled]);

  return liveData;
}
