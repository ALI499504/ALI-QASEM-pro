"use client";

import { motion } from "framer-motion";
import { Brain, TrendingUp, TrendingDown, Layers, Cloud, Droplets } from "lucide-react";
import type { SMCSignal } from "@/lib/smc-analysis";

interface Props {
  signal: SMCSignal | null;
}

export default function EnhancedSMCPanel({ signal }: Props) {
  if (!signal) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 section-heading mb-3">
          <Brain className="w-4 h-4 section-heading-icon" />
          مفاهيم المال الذكي المتقدمة (SMC)
        </div>
        <div className="h-32 animate-pulse bg-secondary/40 rounded" />
      </div>
    );
  }

  const ms = signal.marketStructure;
  const biasColor = ms.bias === "bullish" ? "#22d39a" : ms.bias === "bearish" ? "#ff4d6a" : "#8a96a8";
  const biasLabel = ms.bias === "bullish" ? "صاعد" : ms.bias === "bearish" ? "هابط" : "محايد";

  const zoneColor = ms.premiumDiscount === "discount" ? "#22d39a" : ms.premiumDiscount === "premium" ? "#ff4d6a" : "#8a96a8";
  const zoneLabel = ms.premiumDiscount === "discount" ? "منطقة شراء (Discount)" : ms.premiumDiscount === "premium" ? "منطقة بيع (Premium)" : "توازن";

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Brain className="w-4 h-4 section-heading-icon" />
          مفاهيم المال الذكي المتقدمة
        </h2>
        <span className="section-subtitle">SMC Pro • ثقة {signal.confidence}%</span>
      </div>

      {/* Market Structure Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
        <div className="stat-box">
          <div className="stat-label">الانحياز</div>
          <div className="stat-value" style={{ color: biasColor }}>
            {biasLabel} {ms.bias === "bullish" ? "" : ms.bias === "bearish" ? "" : "●"}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">المنطقة</div>
          <div className="stat-value" style={{ color: zoneColor }}>
            {zoneLabel}
          </div>
          <div className="text-[9px] text-muted-foreground">
            {ms.currentZonePct}% من القاع
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">BOS / CHOCH</div>
          <div className="stat-value text-xs" style={{ color: ms.choch.detected ? "#fbbf24" : ms.bos.detected ? "#22d39a" : "#8a96a8" }}>
            {ms.choch.detected ? ` CHOCH ${ms.choch.direction === "up" ? "↑" : "↓"}` :
             ms.bos.detected ? ` BOS ${ms.bos.direction === "up" ? "↑" : "↓"}` :
             "— لا يوجد"}
          </div>
        </div>
      </div>

      {/* Premium/Discount Visual Bar */}
      <div className="mb-3">
        <div className="text-[10px] text-muted-foreground mb-1">منطقة السعر (Discount ↔ Premium)</div>
        <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-500/40 via-yellow-500/40 to-rose-500/40">
          <div
            className="absolute -top-1 w-3 h-4 rounded-sm border-2 border-foreground bg-gold"
            style={{ left: `calc(${ms.currentZonePct}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>القاع (Discount) — شراء</span>
          <span>القمة (Premium) — بيع</span>
        </div>
      </div>

      {/* Order Blocks */}
      <div className="mb-3">
        <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-gold" />
          Order Blocks ({signal.orderBlocks.length})
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto scroll-styled">
          {signal.orderBlocks.length === 0 ? (
            <div className="text-[10px] text-muted-foreground text-center py-2">
              لا توجد Order Blocks مكتشفة
            </div>
          ) : (
            signal.orderBlocks.slice().reverse().map((ob, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-1.5 rounded text-[10px] border ${
                  ob.type === "bullish"
                    ? "bg-emerald-500/[0.04] border-emerald-500/20"
                    : "bg-rose-500/[0.04] border-rose-500/20"
                }`}
              >
                <span className={ob.type === "bullish" ? "text-emerald-400" : "text-rose-400"}>
                  {ob.type === "bullish" ? " Bullish OB" : " Bearish OB"}
                </span>
                <span className="tabular-nums ltr-nums text-muted-foreground">
                  ${ob.bottom.toFixed(2)} - ${ob.top.toFixed(2)}
                </span>
                <span className={`text-[9px] ${ob.mitigatedated ? "text-muted-foreground" : "text-gold font-bold"}`}>
                  {ob.mitigated ? " مُخفّف" : "● نشط"}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  قوة {ob.strength}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fair Value Gaps */}
      <div className="mb-3">
        <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
          <Cloud className="w-3 h-3 text-gold" />
          Fair Value Gaps ({signal.fairValueGaps.length})
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {signal.fairValueGaps.slice(0, 4).map((fvg, i) => (
            <div
              key={i}
              className={`p-1.5 rounded text-[10px] border ${
                fvg.type === "bullish"
                  ? "bg-emerald-500/[0.04] border-emerald-500/20"
                  : "bg-rose-500/[0.04] border-rose-500/20"
              }`}
            >
              <div className={fvg.type === "bullish" ? "text-emerald-400" : "text-rose-400"}>
                {fvg.type === "bullish" ? "▲ صاعد" : "▼ هابط"}
              </div>
              <div className="tabular-nums ltr-nums text-muted-foreground">
                ${fvg.bottom.toFixed(2)} - ${fvg.top.toFixed(2)}
              </div>
              <div className="text-[9px] text-muted-foreground">عمر: {fvg.age}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Liquidity Zones */}
      <div>
        <div className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5">
          <Droplets className="w-3 h-3 text-gold" />
          مناطق السيولة ({signal.liquidityZones.length})
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {signal.liquidityZones.slice(0, 4).map((zone, i) => (
            <div
              key={i}
              className={`p-1.5 rounded text-[10px] border ${
                zone.type === "buyside"
                  ? "bg-emerald-500/[0.04] border-emerald-500/20"
                  : "bg-rose-500/[0.04] border-rose-500/20"
              }`}
            >
              <div className={zone.type === "buyside" ? "text-emerald-400" : "text-rose-400"}>
                {zone.type === "buyside" ? " Buyside (فوق)" : " Sellside (تحت)"}
              </div>
              <div className="tabular-nums ltr-nums text-muted-foreground">
                ${zone.price.toFixed(2)}
              </div>
              <div className="text-[9px] text-muted-foreground">قوة {zone.strength}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground">
        {signal.summary}
      </div>
    </div>
  );
}
