"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { useTradingStore } from "@/lib/store";
import { playSignalAlert, setEnabled } from "@/lib/audio";
import type { AISignal } from "@/lib/ai-types";

interface Props {
  signal: AISignal | null;
}

const ACTION_LABELS: Record<string, string> = {
  STRONG_BUY: "شراء قوي",
  BUY: "شراء",
  HOLD: "انتظار",
  SELL: "بيع",
  STRONG_SELL: "بيع قوي",
};

export default function AudioAlertsManager({ signal }: Props) {
  const { audioEnabled, toggleAudio, addNotification } = useTradingStore();
  const prevSignalRef = useRef<string | null>(null);

  useEffect(() => {
    setEnabled(audioEnabled);
  }, [audioEnabled]);

  // Only fire when signal action actually changes — play musical chime + push notification
  useEffect(() => {
    if (!signal) return;
    if (prevSignalRef.current === null) {
      prevSignalRef.current = signal.action;
      return;
    }
    if (prevSignalRef.current !== signal.action) {
      prevSignalRef.current = signal.action;
      if (audioEnabled) playSignalAlert(signal.action);
      // Push notification
      const label = ACTION_LABELS[signal.action] ?? signal.action;
      addNotification({
        type: "signal",
        title: `إشارة تداول جديدة: ${label}`,
        message: `الثقة ${signal.confidence}% • الدخول $${signal.entry.toFixed(2)} • وقف الخسارة $${signal.stopLoss.toFixed(2)}`,
      });
    }
  }, [signal?.action, audioEnabled, signal, addNotification]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleAudio}
      className={`border-border ${
        audioEnabled
          ? "bg-secondary text-gold border-gold/30 hover:bg-accent"
          : "bg-secondary text-muted-foreground border-border hover:bg-accent"
      }`}
      aria-label={audioEnabled ? "كتم التنبيهات" : "تشغيل التنبيهات"}
    >
      {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline mr-1.5">
        {audioEnabled ? "التنبيهات" : "مكتوم"}
      </span>
    </Button>
  );
}
