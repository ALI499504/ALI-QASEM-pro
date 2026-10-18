"use client";

import { motion } from "framer-motion";
import { Layers, Activity, Target, Waves, Zap } from "lucide-react";
import type { Candle } from "@/lib/indicators";

interface Props {
  candles: Candle[];
}

interface SmcSignal {
  type: "OB" | "FVG" | "BOS" | "CHOCH" | "LIQUIDITY";
  direction: "bullish" | "bearish";
  level: number;
  description: string;
  color: string;
}

export default function SmcPanel({ candles }: Props) {
  if (!candles.length || candles.length < 20) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <h2 className="section-heading">
            <Layers className="w-4 h-4 section-heading-icon" />
            مفاهيم المال الذكي (SMC)
          </h2>
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const signals = analyzeSMC(candles).slice(0, 6);

  // Find bullish/bearish count
  const bullCount = signals.filter((s) => s.direction === "bullish").length;
  const bearCount = signals.filter((s) => s.direction === "bearish").length;
  const bias = bullCount > bearCount ? "صعودي" : bearCount > bullCount ? "هبوطي" : "متوازن";
  const biasColor = bullCount > bearCount ? "#4ade80" : bearCount > bullCount ? "#f87171" : "#c8a050";

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Layers className="w-4 h-4 section-heading-icon" />
          مفاهيم المال الذكي (SMC)
        </h2>
        <div className="flex items-center gap-2">
          <span className="section-subtitle">الانحياز:</span>
          <span
            className="pill"
            style={{ background: `${biasColor}15`, color: biasColor, border: `1px solid ${biasColor}30` }}
          >
            {bias}
          </span>
        </div>
      </div>

      {/* SMC summary bar */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <SmcStat icon={<Activity className="w-3 h-3" />} label="BOS" count={signals.filter(s => s.type === "BOS").length} color="#60a5fa" />
        <SmcStat icon={<Zap className="w-3 h-3" />} label="CHOCH" count={signals.filter(s => s.type === "CHOCH").length} color="#a78bfa" />
        <SmcStat icon={<Layers className="w-3 h-3" />} label="OB" count={signals.filter(s => s.type === "OB").length} color="#c8a050" />
        <SmcStat icon={<Target className="w-3 h-3" />} label="FVG" count={signals.filter(s => s.type === "FVG").length} color="#4ade80" />
      </div>

      <div className="space-y-2">
        {signals.map((s, i) => {
          const Icon =
            s.type === "OB" ? Layers :
            s.type === "FVG" ? Target :
            s.type === "BOS" ? Activity :
            s.type === "CHOCH" ? Zap :
            Waves;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-2.5 rounded border border-border hover:bg-secondary transition"
            >
              <div
                className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}15`, color: s.color }}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {s.type === "OB" ? "Order Block" : s.type === "FVG" ? "Fair Value Gap" : s.type === "BOS" ? "Break of Structure" : s.type === "CHOCH" ? "Change of Character" : "Liquidity Zone"}
                  </span>
                  <span
                    className="pill text-[9px]"
                    style={{
                      background: `${s.color}15`,
                      color: s.color,
                      border: `1px solid ${s.color}30`,
                    }}
                  >
                    {s.direction === "bullish" ? "صعودي" : "هبوطي"}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums ltr-nums mr-auto">
                    @ {s.level.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {signals.length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          لا توجد إشارات SMC واضحة حالياً
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground">
         Order Blocks: مناطق الطلب/العرض المؤسسي | FVG: فجوات القيمة العادلة | BOS/CHOCH: كسر/تغيير البنية
      </div>
    </div>
  );
}

function SmcStat({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="stat-box text-center">
      <div className="flex items-center justify-center mb-1" style={{ color }}>{icon}</div>
      <div className="stat-value tabular-nums ltr-nums" style={{ color }}>{count}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function analyzeSMC(candles: Candle[]): SmcSignal[] {
  const signals: SmcSignal[] = [];
  const recent = candles.slice(-30);

  // 1. Find Order Blocks — last opposite-color candle before strong move
  for (let i = 3; i < recent.length; i++) {
    const c = recent[i];
    const prev3 = recent.slice(i - 3, i);
    const isStrongBull = c.close > c.open && (c.close - c.open) > Math.abs(prev3[0].close - prev3[0].open) * 1.5;
    const isStrongBear = c.close < c.open && (c.open - c.close) > Math.abs(prev3[0].open - prev3[0].close) * 1.5;
    const prev = recent[i - 1];
    if (isStrongBull && prev.close < prev.open) {
      signals.push({
        type: "OB",
        direction: "bullish",
        level: (prev.open + prev.close) / 2,
        description: "آخر شمعة حمراء قبل حركة صعودية قوية — منطقة طلب مؤسسي",
        color: "#c8a050",
      });
      break; // only take the most recent
    }
    if (isStrongBear && prev.close > prev.open) {
      signals.push({
        type: "OB",
        direction: "bearish",
        level: (prev.open + prev.close) / 2,
        description: "آخر شمعة خضراء قبل حركة هبوطية قوية — منطقة عرض مؤسسي",
        color: "#c8a050",
      });
      break;
    }
  }

  // 2. Fair Value Gaps (FVG) — gap between candle[i-2].high and candle[i].low
  for (let i = recent.length - 1; i >= 2; i--) {
    const c = recent[i];
    const c2 = recent[i - 2];
    // Bullish FVG: low[i] > high[i-2]
    if (c.low > c2.high) {
      signals.push({
        type: "FVG",
        direction: "bullish",
        level: (c.low + c2.high) / 2,
        description: `فجوة قيمة عادلة صعودية بين ${c2.high.toFixed(2)} و${c.low.toFixed(2)} — عدم توازن يحتاج للاختبار`,
        color: "#4ade80",
      });
      break;
    }
    // Bearish FVG: high[i] < low[i-2]
    if (c.high < c2.low) {
      signals.push({
        type: "FVG",
        direction: "bearish",
        level: (c.high + c2.low) / 2,
        description: `فجوة قيمة عادلة هبوطية بين ${c2.low.toFixed(2)} و${c.high.toFixed(2)} — عدم توازن sells side`,
        color: "#4ade80",
      });
      break;
    }
  }

  // 3. BOS / CHOCH — swing high/low breakage
  const swingHigh = Math.max(...recent.slice(0, 10).map((c) => c.high));
  const swingLow = Math.min(...recent.slice(0, 10).map((c) => c.low));
  const lastClose = recent.at(-1)!.close;
  if (lastClose > swingHigh) {
    signals.push({
      type: "BOS",
      direction: "bullish",
      level: swingHigh,
      description: `كسر بنية صعودي — السعر تجاوز القمة السابقة ${swingHigh.toFixed(2)} ويؤكد الاستمرار الصعودي`,
      color: "#60a5fa",
    });
  } else if (lastClose < swingLow) {
    signals.push({
      type: "BOS",
      direction: "bearish",
      level: swingLow,
      description: `كسر بنية هبوطي — السعر تجاوز القاع السابق ${swingLow.toFixed(2)} ويؤكد الاستمرار الهبوطي`,
      color: "#60a5fa",
    });
  }

  // CHOCH detection (simplified): direction change after a strong move
  const last5 = recent.slice(-5);
  const firstHalf = last5.slice(0, 2);
  const lastHalf = last5.slice(-2);
  const firstTrend = firstHalf[1].close - firstHalf[0].open;
  const lastTrend = lastHalf[1].close - lastHalf[0].open;
  if (firstTrend < 0 && lastTrend > 0 && Math.abs(lastTrend) > Math.abs(firstTrend) * 0.6) {
    signals.push({
      type: "CHOCH",
      direction: "bullish",
      level: lastHalf[0].open,
      description: "تغيير شخصية صعودي — تحول من هيكل هبوطي إلى محاولة بناء هيكل صعودي",
      color: "#a78bfa",
    });
  } else if (firstTrend > 0 && lastTrend < 0 && Math.abs(lastTrend) > Math.abs(firstTrend) * 0.6) {
    signals.push({
      type: "CHOCH",
      direction: "bearish",
      level: lastHalf[0].open,
      description: "تغيير شخصية هبوطي — تحول من هيكل صعودي إلى محاولة بناء هيكل هبوطي",
      color: "#a78bfa",
    });
  }

  // 4. Liquidity zones — previous day high/low (approx with first 10 candles of recent)
  const pdHigh = Math.max(...recent.slice(0, 15).map((c) => c.high));
  const pdLow = Math.min(...recent.slice(0, 15).map((c) => c.low));
  signals.push({
    type: "LIQUIDITY",
    direction: "bullish",
    level: pdHigh,
    description: `سيولة بيع معلقة فوق ${pdHigh.toFixed(2)} — هدف محتمل لاختبارها وتجاوزها`,
    color: "#fbbf24",
  });
  signals.push({
    type: "LIQUIDITY",
    direction: "bearish",
    level: pdLow,
    description: `سيولة شراء معلقة تحت ${pdLow.toFixed(2)} — هدف محتمل لاختبارها`,
    color: "#fbbf24",
  });

  return signals;
}
