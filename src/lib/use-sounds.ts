"use client";

import { useEffect, useRef } from "react";
import {
  playUIClick,
  setEnabled,
  playRSIOversold,
  playRSIOverbought,
  playMACDCross,
  playSupportBreak,
  playResistanceBreak,
} from "@/lib/audio";
import { useTradingStore } from "@/lib/store";

/**
 * Hook that adds subtle click sounds to all button-like elements.
 * Respects the audio toggle (mute = no sounds).
 */
export function useClickSounds() {
  const { audioEnabled } = useTradingStore();

  useEffect(() => {
    setEnabled(audioEnabled);
  }, [audioEnabled]);

  useEffect(() => {
    if (!audioEnabled) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const clickable = target.closest(
        'button, [role="button"], .cursor-pointer, a[href], [data-clickable]'
      );
      if (clickable) {
        if (
          clickable.hasAttribute("disabled") ||
          clickable.closest("[disabled]")
        ) {
          return;
        }
        playUIClick();
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [audioEnabled]);
}

/**
 * Hook for indicator event sounds — plays sounds when indicators cross thresholds.
 * Call this with the live indicators data.
 */
export function useIndicatorSounds(
  rsi: number | null,
  macdHist: number | null,
  price: number | null,
  support: number | null,
  resistance: number | null,
  audioEnabled: boolean
) {
  const prevRsiRef = useRef<number | null>(null);
  const prevMacdHistRef = useRef<number | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  // RSI threshold crossings
  useEffect(() => {
    if (!audioEnabled || rsi === null || prevRsiRef.current === null) {
      prevRsiRef.current = rsi;
      return;
    }
    const prev = prevRsiRef.current;
    if (prev >= 30 && rsi < 30) {
      playRSIOversold();
    } else if (prev <= 70 && rsi > 70) {
      playRSIOverbought();
    }
    prevRsiRef.current = rsi;
  }, [rsi, audioEnabled]);

  // MACD histogram zero-cross
  useEffect(() => {
    if (!audioEnabled || macdHist === null || prevMacdHistRef.current === null) {
      prevMacdHistRef.current = macdHist;
      return;
    }
    const prev = prevMacdHistRef.current;
    if ((prev <= 0 && macdHist > 0) || (prev >= 0 && macdHist < 0)) {
      playMACDCross();
    }
    prevMacdHistRef.current = macdHist;
  }, [macdHist, audioEnabled]);

  // Price crossing support/resistance
  useEffect(() => {
    if (!audioEnabled || price === null || prevPriceRef.current === null) {
      prevPriceRef.current = price;
      return;
    }
    const prev = prevPriceRef.current;
    if (support && prev >= support && price < support) {
      playSupportBreak();
    }
    if (resistance && prev <= resistance && price > resistance) {
      playResistanceBreak();
    }
    prevPriceRef.current = price;
  }, [price, support, resistance, audioEnabled]);
}
