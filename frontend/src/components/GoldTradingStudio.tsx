import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  History,
  Play,
  Bookmark,
  RefreshCw,
  Trash2,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  DollarSign,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";

import { analyzeMarket, getQuote, type MarketZone, type TradeSignal } from "../api/client";

interface GoldTradingStudioProps {
  symbol: string;
  setSymbol: (s: string) => void;
  setView: (v: any) => void;
  user: any | null;
  onOpenAuth: () => void;
  isDark?: boolean;
}

interface ZoneCardProps {
  zone: any;
  onTest: () => void;
}

interface SignalCardProps {
  signal: any;
}

export default function GoldTradingStudio({
  symbol: initialSymbol,
  setSymbol,
  setView,
  user,
  onOpenAuth,
  isDark = false,
}: GoldTradingStudioProps) {
  const qc = useQueryClient();
  const [targetSymbol, setTargetSymbol] = useState(initialSymbol || "XAUUSD");
  const [analysis, setAnalysis] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [signal, setSignal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<any | null>(null);

  // Fetch market analysis
  const loadAnalysis = useQuery({
    queryKey: ["market-analysis", targetSymbol],
    queryFn: async () => {
      try {
        const response: any = await analyze_market(targetSymbol);
        setAnalysis(response);
        setZones(response.zones || []);
        setSignal(response.signal);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to load analysis");
        setLoading(false);
      }
    },
    enabled: !!targetSymbol.trim(),
  });

  // Fetch zones separately
  useEffect(() => {
    if (targetSymbol.trim()) {
      // Can fetch zones if needed
    }
  }, [targetSymbol]);

  // Live quote
  const quoteQuery = useQuery({
    queryKey: ["quote", targetSymbol],
    queryFn: () => getQuote(targetSymbol),
    enabled: !!targetSymbol.trim(),
  });

  // Compute derived values from analysis
  const trendColor = analysis?.trend === "bullish" ? "text-green-500" : analysis?.trend === "bearish" ? "text-red-500" : "text-gray-400";
  const signalAction = signal?.action || "hold";
  const signalEntry = signal?.entry;
  const signalSL = signal?.stop_loss;
  const signalTP = signal?.take_profit || [];
  const signalRR = signal?.risk_reward_ratio;

  // Handle zone selection
  const handleZoneSelect = (zone: any) => {
    setSelectedZone(zone);
  };

  // Execute trade
  const executeTrade = async () => {
    if (!signalEntry || !signalSL) {
      showToast("لا توجد إشارة تداول صالحة");
      return;
    }
    // In a real implementation, this would send the trade to the backend
    showToast(`تم إرسال أمر:${signalAction === "buy" ? "شراء" : "بيع"} ${targetSymbol}`);
  };

  // Show toast
  const showToast = (msg: string) => {
    // Simplified toast - in real app would use a toast library
    alert(msg);
  };

  if (loading && !analysis) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="pacepace-progress">
          <span className="pacepace-spinner">
            <span />
            <span />
            <span />
          </span>
        </div>
        <span className="mx-2">تحليل السوق...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-100/20 rounded-lg border-red-200/50">
        <h3 className="text-red-400 mb-2">خطأ</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => setError(null)}
          className="mt-2 btn btn-primary"
        >
          حاول مرة أخرى
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[--bg-surface] rounded-lg border border-[--border]">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4">
            <span className="text-[--accent-teal]">استوديو تداول الذهب</span>
            {targetSymbol}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[--text-muted]">الرمز:</span>
          <span className="font-medium {trendColor}">
            {targetSymbol}
          </span>
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="mt-4 p-3 rounded-lg {trendColor}/20 {trendColor}/50 border {trendColor}/20">
        <div className="flex items-center gap-2">
          <span className="lucide-react {trendColor === 'text-green-500' ? 'TrendingUp' : trendColor === 'text-red-500' ? 'TrendingDown' : 'Zap'} mr-1"></span>
          <span>{analysis?.trend?.toUpperCase() || "NEUTRAL"}</span>
        </div>
        <p className="text-xs text-[--text-muted]">
          {analysis?.trend || "تحليل趋势 جاري..."}
        </p>
      </div>

      {/* Zones Section */}
      {zones.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium mb-2">
            مناطق الدعم والمقاومة
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {zones.slice(0, 4).map((zone: any) => (
              <div
                key={zone.name}
                onClick={() => handleZoneSelect(zone)}
                className={`p-3 rounded-lg cursor-pointer ${
                  selectedZone?.name === zone.name
                    ? "bg-[--accent-teal]/20 border-[--accent-teal]/50"
                    : "bg-transparent hover:bg-[--bg-hover]"
                }`}
              >
                <div className="h-4 rounded-full bg-{zone.zone_type === "support" ? "green-500" : "red-500"} w-4 inline-block mr-2"></div>
                <span className="text-xs">{zone.zone_type.toUpperCase()}</span>
                <span className="text-xs block mt-1">{zone.high?.toFixed(2)} / {zone.low?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signal Section */}
      <div className="mt-4 p-4 rounded-lg border-t border-b {signalAction === "buy" ? "bg-green-100/50" : signalAction === "sell" ? "bg-red-100/50" : "bg-gray-100/50"}">
        <h3 className="text-sm font-medium mb-3">
          {signalAction === "buy" ? "🟢 إشارة شراء" : signalAction === "sell" ? "🔴 إشارة بيع" : "⚪ Hold"}
        </h3>

        {signalAction !== "hold" && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-[--text-muted]">نقطة الدخول</p>
              <p className="font-medium">{signalEntry?.toFixed(2) || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-[--text-muted]">وقف الخسارة</p>
              <p className="font-medium">{signalSL?.toFixed(2) || "N/A"}</p>
            </div>
          </div>

          {signalTP.length > 0 && (
            <div>
              <p className="text-xs text-[--text-muted]">أخذ الأرباح</p>
              <div className="grid grid-cols-2 gap-1">
                {signalTP.map((tp: number, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs rounded bg-green-100/30 text-green-400"
                  >
                    TP{idx + 1}: {tp.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {signalRR > 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-[--text-muted]">نسبة المخاطرة/العائد</p>
              <p className="font-medium text-green-500">{signalRR >= 1 ? "جيد" : "منخفض"} ({signalRR}:1)</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6">
        <button
          onClick={executeTrade}
          className="w-full px-4 py-2 rounded-lg font-medium {signalAction === "hold" ? "opacity-50 cursor-not-allowed" : "bg-[--accent-teal]/20 hover:bg-[--accent-teal]/50 text-[--accent-teal] transition-colors"}>
            {signalAction === "hold"
              ? "تحليل جاري..."
              : `${signalAction === "buy" ? "شراء" : "بيع"} ${targetSymbol}`}
        </button>
      </div>
    </div>
  );
}