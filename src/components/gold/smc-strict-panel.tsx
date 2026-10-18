"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Target,
  Shield,
  Activity,
  RefreshCw,
  Brain,
  TrendingUp,
  TrendingDown,
  Clock,
  Wifi,
  BarChart3,
  Zap,
  Eye,
  ChevronRight,
  Cable,
} from "lucide-react";
import SMCStrictChart from "./smc-strict-chart";
import MT5ExecutionModal from "./mt5-execution-modal";
import type { Candle } from "@/lib/indicators";

interface SMCStrictResponse {
  strategy: {
    hasSetup: boolean;
    notSetupReason?: string;
    trade?: {
      type: "BUY" | "SELL";
      entry: number;
      stopLoss: number;
      takeProfit1: number;
      takeProfit2: number;
      takeProfit3: number;
      riskPercent: number;
      riskAmount: number;
      lotSize: number;
      rrRatio: number;
    };
    conditions?: any;
    currentPrice?: number;
    dailyCandlesCount?: number;
    h4CandlesCount?: number;
    m15CandlesCount?: number;
    visualization?: {
      m15Candles: Candle[];
      htfDirection: string;
      htfLabel: string;
      annotations: any;
    };
    timestamp?: number;
  };
  ai?: {
    marketNarrative: string;
    setupValidity: string;
    riskCommentary: string;
    executionPlan: string;
    alternativeScenarios: string[];
    confidenceAdjustment: number;
    finalVerdict: string;
    modelUsed: string;
    timestamp: number;
  };
  error?: string;
}

const condMeta = [
  { key: "htfTrend", label: "HTF Trend", icon: TrendingUp, color: "#6ea8ff" },
  { key: "liquiditySweep", label: "Liquidity Sweep", icon: Zap, color: "#06b6d4" },
  { key: "choch", label: "CHoCH", icon: BarChart3, color: "#b57cff" },
  { key: "entryZone", label: "FVG / OB", icon: Target, color: "#ffb020" },
  { key: "riskReward", label: "R:R ≥ 1:3", icon: Shield, color: "#6cffb2" },
];

function safeDir(v: string | null | undefined): string {
  if (!v) return "—";
  const m: Record<string, string> = {
    bullish: "صاعد",
    bearish: "هابط",
    ranging: "متذبذب",
    up: "صاعد",
    down: "هابط",
    flat: "ثابت",
    "sell-side": "بيعية",
    "buy-side": "شرائية",
    FVG: "FVG",
    OB: "OB",
  };
  return m[v] ?? v;
}

function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

interface Props {
  livePrice?: number;
  liveBid?: number;
  liveAsk?: number;
}

const STRATEGY_REFRESH_MS = 15_000;
const COUNTDOWN_TICK_MS = 1000;

export default function SMCStrictPanel({ livePrice, liveBid, liveAsk }: Props) {
  const [data, setData] = useState<SMCStrictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(STRATEGY_REFRESH_MS / 1000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mt5Connected, setMt5Connected] = useState(false);
  const [mt5Checking, setMt5Checking] = useState(true);
  const [executionModalOpen, setExecutionModalOpen] = useState(false);

  // Check MT5 bridge connection status
  const checkMT5 = useCallback(async () => {
    try {
      const r = await fetch("/api/gold/mt-connect", { cache: "no-store" });
      const j = await r.json();
      setMt5Connected(Boolean(j?.status?.mt5Connected));
    } catch {
      setMt5Connected(false);
    } finally {
      setMt5Checking(false);
    }
  }, []);

  useEffect(() => {
    checkMT5();
    const i = setInterval(checkMT5, 30_000); // check every 30s
    return () => clearInterval(i);
  }, [checkMT5]);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const r = await fetch("/api/gold/smc-strict-ai?balance=1000", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as SMCStrictResponse;
      if (j?.error) throw new Error(j.error);
      setData(j);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "fetch failed");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setNextRefreshIn(STRATEGY_REFRESH_MS / 1000);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, STRATEGY_REFRESH_MS);
    return () => clearInterval(i);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      setNextRefreshIn((prev) => (prev > 0 ? prev - 1 : STRATEGY_REFRESH_MS / 1000));
    }, COUNTDOWN_TICK_MS);
    return () => clearInterval(t);
  }, []);

  // Build conditions checklist safely
  const conds: { key: string; label: string; icon: any; color: string; passed: boolean; detail: string }[] = [];
  if (data?.strategy?.conditions) {
    try {
      const c = data.strategy.conditions;
      conds.push({
        key: "htfTrend",
        label: "HTF Trend",
        icon: TrendingUp,
        color: "#6ea8ff",
        passed: Boolean(c?.htfTrend?.passed),
        detail: `يومي ${safeDir(c?.htfTrend?.dailyTrend?.slope)} • 4H ${safeDir(c?.htfTrend?.h4Trend?.slope)} → ${safeDir(c?.htfTrend?.direction)}`,
      });
      conds.push({
        key: "liquiditySweep",
        label: "Liquidity Sweep",
        icon: Zap,
        color: "#06b6d4",
        passed: Boolean(c?.liquiditySweep?.passed),
        detail: c?.liquiditySweep?.type
          ? `${safeDir(c.liquiditySweep.type)} @ $${fmt(c?.liquiditySweep?.sweptLevel)}`
          : "—",
      });
      conds.push({
        key: "choch",
        label: "CHoCH",
        icon: BarChart3,
        color: "#b57cff",
        passed: Boolean(c?.choch?.passed),
        detail: c?.choch?.direction
          ? `كسر ${safeDir(c.choch.direction)} @ $${fmt(c?.choch?.brokenLevel)}`
          : "—",
      });
      conds.push({
        key: "entryZone",
        label: "FVG / OB",
        icon: Target,
        color: "#ffb020",
        passed: Boolean(c?.entryZone?.passed),
        detail: c?.entryZone?.zone
          ? `${c?.entryZone?.type ?? "—"} $${fmt(c.entryZone.zone.bottom)}-$${fmt(c.entryZone.zone.top)}`
          : "—",
      });
      conds.push({
        key: "riskReward",
        label: "R:R ≥ 1:3",
        icon: Shield,
        color: "#6cffb2",
        passed: Boolean(c?.riskReward?.passed),
        detail: `1:${fmt(c?.riskReward?.ratio)} (SL $${fmt(c?.riskReward?.slDistance)} • TP $${fmt(c?.riskReward?.tpDistance)})`,
      });
    } catch (e) {}
  }

  const strat = data?.strategy;
  const trade = strat?.trade;
  const ai = data?.ai;
  const effectiveLivePrice = livePrice && livePrice > 0 ? livePrice : strat?.currentPrice ?? 0;
  const spread = liveAsk && liveBid ? liveAsk - liveBid : 0;

  // Setup completion percentage
  const passedCount = conds.filter((c) => c.passed).length;
  const setupPercent = conds.length > 0 ? Math.round((passedCount / conds.length) * 100) : 0;

  // AI status
  const aiAgeSeconds = ai?.timestamp ? Math.floor((Date.now() - ai.timestamp) / 1000) : 0;
  const aiColor = ai?.modelUsed?.includes("GLM") ? "#6ea8ff" : "#06b6d4";
  const aiLabel = ai?.modelUsed?.includes("GLM") ? "GLM-4 AI" : "AI Analysis";

  // Verdict color
  const verdictColor =
    ai?.finalVerdict === "BUY" ? "#6cffb2" :
    ai?.finalVerdict === "SELL" ? "#ff5a6a" : "#ffb020";

  // Trade levels for ladder (sorted high to low)
  const tradeLadder = trade ? [
    { label: "TP3 (target)", price: trade.takeProfit3, color: "#ffb020", side: "tp" },
    { label: "TP2", price: trade.takeProfit2, color: "#6cffb2", side: "tp" },
    { label: "TP1", price: trade.takeProfit1, color: "#6cffb2", side: "tp" },
    { label: trade.type === "BUY" ? "Entry (Buy)" : "Entry (Sell)", price: trade.entry, color: "#ffb020", side: "entry" },
    { label: "Stop Loss", price: trade.stopLoss, color: "#ff5a6a", side: "sl" },
  ].sort((a, b) => b.price - a.price) : [];

  // Price range for ladder visualization
  const ladderMin = tradeLadder.length > 0 ? Math.min(...tradeLadder.map((l) => l.price)) : 0;
  const ladderMax = tradeLadder.length > 0 ? Math.max(...tradeLadder.map((l) => l.price)) : 0;
  const ladderRange = ladderMax - ladderMin || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#1c2433] bg-gradient-to-br from-[#07080c] via-[#07080c] to-[#0d1018] overflow-hidden shadow-2xl shadow-black/40"
    >
      {/* === HEADER === */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-[#1c2433] bg-gradient-to-r from-[#07080c] via-[#0d1018] to-[#07080c]">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#ffb020] to-[#8b6914] shadow-lg shadow-[#ffb020]/20">
            <Crosshair className="w-4 h-4 text-black" strokeWidth={2.5} />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#6cffb2] ring-2 ring-[#07080c] animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide leading-none">
              SMC/ICT AI ANALYZER
            </h2>
            <p className="text-[9px] text-[#7d8aa0] mt-0.5 tracking-widest">
              SMART MONEY CONCEPTS • GLM-4 PLUS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#6cffb2]/10 border border-[#6cffb2]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6cffb2] animate-pulse" />
            <span className="text-[#6cffb2] font-bold tracking-wide">LIVE</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1c2433] border border-[#1c2433] text-[#7d8aa0] tabular-nums ltr-nums">
            <Clock className="w-3 h-3" />
            <span>{nextRefreshIn}s</span>
          </div>
          <button
            onClick={load}
            disabled={isRefreshing}
            className="p-1.5 rounded-md bg-[#1c2433] hover:bg-[#232a3a] text-[#d7e0ee] hover:text-[#ffb020] transition disabled:opacity-50"
            title="إعادة فحص فوري"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* === LIVE PRICE STRIP === */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1c2433] bg-[#0d1018]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#7d8aa0] tracking-wider">XAU/USD</span>
            <motion.span
              key={effectiveLivePrice}
              initial={{ scale: 1.1, color: "#fff" }}
              animate={{ scale: 1, color: "#fff" }}
              transition={{ duration: 0.2 }}
              className="text-base font-bold tabular-nums ltr-nums"
            >
              ${fmt(effectiveLivePrice)}
            </motion.span>
          </div>
          {liveBid && liveBid > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#7d8aa0]">BID</span>
              <span className="text-[10px] font-semibold text-[#ff5a6a] tabular-nums ltr-nums">{fmt(liveBid)}</span>
            </div>
          )}
          {liveAsk && liveAsk > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#7d8aa0]">ASK</span>
              <span className="text-[10px] font-semibold text-[#6cffb2] tabular-nums ltr-nums">{fmt(liveAsk)}</span>
            </div>
          )}
          {spread > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#7d8aa0]">SPREAD</span>
              <span className="text-[10px] font-semibold text-[#d7e0ee] tabular-nums ltr-nums">${spread.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3" style={{ color: strat?.currentPrice ? "#6cffb2" : "#7d8aa0" }} />
          <span className="text-[9px] text-[#7d8aa0] tracking-wide">{strat?.currentPrice ? "XAUUSD SPOT" : "—"}</span>
          {/* MT5 Bridge status badge */}
          <div className="ml-2 px-2 py-0.5 rounded-md flex items-center gap-1 border"
            style={{
              background: mt5Connected ? "rgba(34,211,154,0.1)" : "rgba(107,114,128,0.1)",
              borderColor: mt5Connected ? "rgba(34,211,154,0.4)" : "rgba(107,114,128,0.3)",
            }}
          >
            <Cable className="w-3 h-3" style={{ color: mt5Connected ? "#6cffb2" : "#7d8aa0" }} />
            <span className="text-[9px] font-bold tracking-wide" style={{ color: mt5Connected ? "#6cffb2" : "#7d8aa0" }}>
              {mt5Checking ? "..." : mt5Connected ? "MT5 LINKED" : "MT5 OFF"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading && !data ? (
          <div className="text-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-[#ffb020] mx-auto mb-3" />
            <div className="text-xs text-[#d7e0ee] mb-1">جاري التحليل على 3 فريمات</div>
            <div className="text-[10px] text-[#7d8aa0]">Daily + 4H + 15m + استدعاء GLM-4 AI</div>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-xs text-[#ff5a6a]">
            <AlertCircle className="w-5 h-5 mx-auto mb-2" />
            خطأ: {error}
          </div>
        ) : strat ? (
          <>
            {/* === TOP ROW: Status Gauge + Verdict + Mini Stats === */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-12 gap-3"
            >
              {/* Circular progress gauge */}
              <div className="col-span-4 sm:col-span-3 rounded-xl border border-[#1c2433] bg-[#0d1018] p-3 flex flex-col items-center justify-center">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="35" stroke="#1c2433" strokeWidth="6" fill="none" />
                    <motion.circle
                      cx="40"
                      cy="40"
                      r="35"
                      stroke={strat.hasSetup ? "#6cffb2" : "#ffb020"}
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${setupPercent * 2.2} 220`}
                      initial={{ strokeDasharray: "0 220" }}
                      animate={{ strokeDasharray: `${setupPercent * 2.2} 220` }}
                      transition={{ duration: 0.8 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      className="text-xl font-extrabold text-white tabular-nums ltr-nums"
                    >
                      {setupPercent}%
                    </motion.span>
                    <span className="text-[8px] text-[#7d8aa0] mt-0.5 tracking-wider">SETUP</span>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-[10px] font-bold ${strat.hasSetup ? "text-[#6cffb2]" : "text-[#ffb020]"}`}>
                    {passedCount}/5 شروط
                  </div>
                  <div className="text-[8px] text-[#7d8aa0] mt-0.5">
                    {strat.hasSetup ? "مكتمل" : "غير مكتمل"}
                  </div>
                </div>
              </div>

              {/* Verdict + signal direction */}
              <div className="col-span-8 sm:col-span-5 rounded-xl border border-[#1c2433] bg-[#0d1018] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[#7d8aa0] tracking-wider">القرار النهائي</span>
                  <Brain className="w-3.5 h-3.5" style={{ color: aiColor }} />
                </div>
                <div className="my-2">
                  <motion.div
                    key={ai?.finalVerdict}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    {ai?.finalVerdict === "BUY" ? (
                      <TrendingUp className="w-6 h-6" style={{ color: verdictColor }} />
                    ) : ai?.finalVerdict === "SELL" ? (
                      <TrendingDown className="w-6 h-6" style={{ color: verdictColor }} />
                    ) : (
                      <Eye className="w-6 h-6" style={{ color: verdictColor }} />
                    )}
                    <span className="text-2xl font-extrabold tracking-wide" style={{ color: verdictColor }}>
                      {ai?.finalVerdict ?? "—"}
                    </span>
                  </motion.div>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-[#7d8aa0]">المصدر</span>
                  <span className="font-bold flex items-center gap-1" style={{ color: aiColor }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: aiColor }} />
                    {aiLabel}
                  </span>
                </div>
              </div>

              {/* Mini stats column */}
              <div className="col-span-12 sm:col-span-4 rounded-xl border border-[#1c2433] bg-[#0d1018] p-3 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[8px] text-[#7d8aa0] tracking-wider">DAILY</div>
                  <div className="text-[10px] font-bold text-[#d7e0ee]">{strat.dailyCandlesCount} شمعة</div>
                </div>
                <div>
                  <div className="text-[8px] text-[#7d8aa0] tracking-wider">4H</div>
                  <div className="text-[10px] font-bold text-[#d7e0ee]">{strat.h4CandlesCount} شمعة</div>
                </div>
                <div>
                  <div className="text-[8px] text-[#7d8aa0] tracking-wider">15M</div>
                  <div className="text-[10px] font-bold text-[#d7e0ee]">{strat.m15CandlesCount} شمعة</div>
                </div>
                <div>
                  <div className="text-[8px] text-[#7d8aa0] tracking-wider">AI AGE</div>
                  <div className="text-[10px] font-bold text-[#d7e0ee] tabular-nums ltr-nums">{aiAgeSeconds}s</div>
                </div>
              </div>
            </motion.div>

            {/* === VISUAL CHART === */}
            {strat.visualization && strat.visualization.m15Candles.length > 0 ? (
              <SMCStrictChart
                candles={strat.visualization.m15Candles}
                annotations={strat.visualization.annotations}
                htfLabel={strat.visualization.htfLabel}
                height={320}
                livePrice={effectiveLivePrice}
              />
            ) : (
              <div className="h-[320px] rounded-xl bg-[#0d1018] border border-[#1c2433] flex items-center justify-center text-[#7d8aa0] text-[10px]">
                لا توجد بيانات شمعات كافية للعرض
              </div>
            )}

            {/* === CONDITIONS FLOW (horizontal step indicator) === */}
            <div className="rounded-xl border border-[#1c2433] bg-[#0d1018] p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-[#ffb020]" />
                  <span className="text-[11px] font-bold text-white">كشف الشروط الخمسة</span>
                </div>
                <span className="text-[9px] text-[#7d8aa0]">{passedCount}/5 ✓</span>
              </div>
              <div className="flex items-start gap-1">
                {conds.map((c, i) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className="flex-1 flex flex-col items-center">
                      <div className="flex items-center w-full">
                        {/* left line */}
                        {i > 0 && (
                          <div
                            className="flex-1 h-0.5"
                            style={{ background: conds[i-1].passed && c.passed ? c.color : "#1c2433" }}
                          />
                        )}
                        {/* circle */}
                        <motion.div
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.05 * i }}
                          className="w-7 h-7 rounded-full flex items-center justify-center border-2"
                          style={{
                            borderColor: c.passed ? c.color : "#1c2433",
                            background: c.passed ? `${c.color}20` : "#07080c",
                          }}
                        >
                          {c.passed ? (
                            <CheckCircle2 className="w-4 h-4" style={{ color: c.color }} />
                          ) : (
                            <Icon className="w-3.5 h-3.5 text-[#7d8aa0]" />
                          )}
                        </motion.div>
                        {/* right line */}
                        {i < conds.length - 1 && (
                          <div
                            className="flex-1 h-0.5"
                            style={{ background: c.passed && conds[i+1].passed ? conds[i+1].color : "#1c2433" }}
                          />
                        )}
                      </div>
                      <div className="text-[8px] mt-1.5 text-center font-semibold" style={{ color: c.passed ? c.color : "#7d8aa0" }}>
                        {c.label}
                      </div>
                      <div className="text-[7px] mt-0.5 text-center text-[#7d8aa0] leading-tight px-1">
                        {c.detail}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* === TRADE LADDER (when setup exists) === */}
            {trade && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[#1c2433] bg-[#0d1018] p-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    {trade.type === "BUY" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-[#6cffb2]" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-[#ff5a6a]" />
                    )}
                    <span className="text-[11px] font-bold text-white">
                      خطة التنفيذ — {trade.type === "BUY" ? "صفقة شراء" : "صفقة بيع"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 text-[9px]">
                      <span className="px-1.5 py-0.5 rounded bg-[#ffb020]/20 text-[#ffb020] font-bold">
                        Risk ${fmt(trade.riskAmount)} ({trade.riskPercent}%)
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#ffb020]/20 text-[#ffb020] font-bold">
                        Lot {fmt(trade.lotSize)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#6cffb2]/20 text-[#6cffb2] font-bold">
                        R:R 1:{fmt(trade.rrRatio)}
                      </span>
                    </div>
                    {/* === EXECUTE ON MT5 BUTTON === */}
                    <button
                      onClick={() => setExecutionModalOpen(true)}
                      disabled={!mt5Connected}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: mt5Connected
                          ? `linear-gradient(90deg, ${trade.type === "BUY" ? "#6cffb2" : "#ff5a6a"}, ${trade.type === "BUY" ? "#1cb588" : "#d63852"})`
                          : "#1c2433",
                        color: mt5Connected ? "#000" : "#7d8aa0",
                        border: mt5Connected ? "none" : "1px solid #1c2433",
                      }}
                      title={mt5Connected ? "تنفيذ مباشر على MT5" : "MT5 Bridge غير مهيأ — اربطه أولاً"}
                    >
                      <Zap className="w-3 h-3" />
                      {mt5Connected ? "تنفيذ على MT5" : "MT5 غير مهيأ"}
                    </button>
                  </div>
                </div>

                {/* Vertical ladder visualization */}
                <div className="space-y-1.5">
                  {tradeLadder.map((level, i) => {
                    const pos = ((level.price - ladderMin) / ladderRange) * 100;
                    const isEntry = level.side === "entry";
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="flex items-center gap-2 text-[10px]"
                      >
                        <div className="w-20 text-right">
                          <span className="text-[#7d8aa0]">{level.label}</span>
                        </div>
                        {/* bar */}
                        <div className="flex-1 h-5 rounded relative bg-[#1c2433] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pos}%` }}
                            transition={{ duration: 0.6, delay: 0.05 * i }}
                            className="absolute left-0 top-0 h-full rounded"
                            style={{ background: `linear-gradient(90deg, ${level.color}40, ${level.color}80)` }}
                          />
                          {isEntry && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-white">● ENTRY</span>
                            </div>
                          )}
                        </div>
                        <div className="w-20 text-left">
                          <span className="font-bold tabular-nums ltr-nums" style={{ color: level.color }}>
                            ${fmt(level.price)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* === NO SETUP MESSAGE (when no trade) === */}
            {!trade && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-[#ffb020]/40 bg-gradient-to-r from-[#ffb020]/10 to-transparent p-3"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-[#ffb020] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#ffb020] mb-1">
                      لا توجد فرصة مكتملة الشروط حالياً حسب مدرسة SMC
                    </div>
                    <div className="text-[10px] text-[#d7e0ee] leading-relaxed">
                      {strat.notSetupReason ?? "لم تتحقق جميع الشروط."}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* === AI ANALYSIS CARDS === */}
            {ai && (
              <div className="space-y-2">
                {/* AI header */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[#6ea8ff]/30 bg-gradient-to-r from-[#6ea8ff]/10 to-transparent">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#6ea8ff]" />
                    <span className="text-sm font-bold text-[#6ea8ff]">تحليل GLM-4 الاحترافي</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className="font-bold flex items-center gap-1" style={{ color: aiColor }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: aiColor }} />
                      {aiLabel}
                    </span>
                    <span className="text-[#7d8aa0] tabular-nums ltr-nums">• {aiAgeSeconds}s</span>
                  </div>
                </div>

                {/* Card 1: Market Narrative */}
                {ai.marketNarrative && (
                  <AnalysisCard icon={BarChart3} title="سياق السوق" color="#6ea8ff">
                    {ai.marketNarrative}
                  </AnalysisCard>
                )}

                {/* Card 2: Setup Validity */}
                {ai.setupValidity && (
                  <AnalysisCard icon={CheckCircle2} title="صحة الإعداد" color="#6cffb2">
                    {ai.setupValidity}
                  </AnalysisCard>
                )}

                {/* Card 3: Risk Commentary */}
                {ai.riskCommentary && (
                  <AnalysisCard icon={Shield} title="إدارة المخاطر" color="#ffb020">
                    {ai.riskCommentary}
                  </AnalysisCard>
                )}

                {/* Card 4: Execution Plan */}
                {ai.executionPlan && (
                  <AnalysisCard icon={Target} title="خطة التنفيذ" color="#ffb020">
                    {ai.executionPlan}
                  </AnalysisCard>
                )}

                {/* Card 5: Alternative Scenarios */}
                {ai.alternativeScenarios && ai.alternativeScenarios.length > 0 && (
                  <AnalysisCard icon={Eye} title="سيناريوهات بديلة" color="#b57cff">
                    <ul className="space-y-1 list-disc list-inside">
                      {ai.alternativeScenarios.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </AnalysisCard>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* === MT5 EXECUTION MODAL === */}
      <MT5ExecutionModal
        open={executionModalOpen}
        onClose={() => setExecutionModalOpen(false)}
        trade={trade ?? null}
        currentPrice={effectiveLivePrice}
        symbol="XAUUSD"
      />
    </motion.div>
  );
}

// === Sub-component: Analysis Card ===
function AnalysisCard({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: any;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl border bg-[#0d1018] overflow-hidden"
      style={{ borderColor: `${color}30` }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: `${color}20`, background: `linear-gradient(90deg, ${color}10, transparent)` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[11px] font-bold" style={{ color }}>{title}</span>
      </div>
      <div className="px-3 py-2 text-[10px] text-[#d7e0ee] leading-relaxed whitespace-pre-line">
        {children}
      </div>
    </motion.div>
  );
}
