"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchAIPrediction,
  type AIPrediction,
  type Candle,
  type AgentVote,
} from "@/lib/mt5-data";

interface AIPredictionTerminalProps {
  symbol: string;
  period: string;
  candles: Candle[];
  onPrediction?: (p: AIPrediction) => void;
  height?: number;
}

const AGENT_META: Record<string, { color: string; icon: string }> = {
  technical: { color: "#3b82f6", icon: "📐" },
  patterns: { color: "#a855f7", icon: "📊" },
  risk: { color: "#ef4444", icon: "🛡️" },
  momentum: { color: "#f59e0b", icon: "⚡" },
  sr: { color: "#10b981", icon: "🎯" },
  master: { color: "#fbbf24", icon: "👑" },
};

export default function AIPredictionTerminal({
  symbol,
  period,
  candles,
  onPrediction,
  height = 540,
}: AIPredictionTerminalProps) {
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runPrediction = useCallback(async () => {
    if (candles.length < 30) return;
    setLoading(true);
    setError(null);
    try {
      const p = await fetchAIPrediction(symbol, period, candles);
      setPrediction(p);
      setLastRun(Date.now());
      onPrediction?.(p);
    } catch (e: any) {
      setError(e?.message ?? "Prediction failed");
    } finally {
      setLoading(false);
    }
  }, [symbol, period, candles, onPrediction]);

  // Auto-poll every 30 seconds once we have enough candles
  useEffect(() => {
    if (candles.length < 30) return;
    runPrediction();
    pollRef.current = setInterval(runPrediction, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [candles.length, runPrediction]);

  const finalDecision = prediction?.ensemble.finalDecision;
  const finalConfidence = prediction?.ensemble.finalConfidence ?? 0;
  const decisionColor =
    finalDecision === "BUY" ? "#10b981" : finalDecision === "SELL" ? "#ef4444" : "#fbbf24";

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #020617 0%, #0c1226 100%)",
        color: "#e2e8f0",
        fontFamily: "JetBrains Mono, monospace",
        height: "100%",
        overflowY: "auto",
        padding: 14,
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            AI Prediction Terminal · {symbol} · {period}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginTop: 2 }}>
            BFX Ensemble Intelligence
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#64748b" }}>
          <div>{candles.length} candles analyzed</div>
          {lastRun > 0 && <div>Last run: {new Date(lastRun).toLocaleTimeString()}</div>}
        </div>
      </div>

      {/* Decision banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${decisionColor}22, ${decisionColor}05)`,
          border: `1px solid ${decisionColor}55`,
          borderRadius: 8,
          padding: 14,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 1 }}>NEXT CANDLE T+1</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: decisionColor,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            {finalDecision ?? "—"}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            Confidence: {((finalConfidence || 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {prediction?.nextCandle && (
            <>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Predicted Close</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>
                {prediction.nextCandle.close.toFixed(2)}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: prediction.nextCandle.expectedMovePct >= 0 ? "#10b981" : "#ef4444",
                }}
              >
                {prediction.nextCandle.expectedMovePct >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(prediction.nextCandle.expectedMovePct * 100).toFixed(2)}%
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(127,29,29,0.35)",
            border: "1px solid #ef4444",
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 11,
            color: "#fecaca",
            marginBottom: 10,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Agents grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {prediction?.agents?.map((a) => {
          const meta = AGENT_META[a.id] || AGENT_META.technical;
          const voteColor =
            a.vote === "BUY" ? "#10b981" : a.vote === "SELL" ? "#ef4444" : "#fbbf24";
          return (
            <div
              key={a.id}
              style={{
                background: "rgba(15,23,42,0.6)",
                border: `1px solid ${meta.color}33`,
                borderLeft: `3px solid ${meta.color}`,
                borderRadius: 4,
                padding: "8px 10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{meta.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>
                    {a.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: voteColor,
                    padding: "1px 6px",
                    background: `${voteColor}22`,
                    borderRadius: 3,
                  }}
                >
                  {a.vote}
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: 9, color: "#64748b" }}>
                w={a.weight.toFixed(2)} · conf={((a.confidence || 0) * 100).toFixed(0)}%
              </div>
              {/* Confidence bar */}
              <div
                style={{
                  marginTop: 4,
                  height: 3,
                  background: "rgba(30,41,59,0.8)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (a.confidence || 0) * 100)}%`,
                    height: "100%",
                    background: voteColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Ensemble vote tally */}
      {prediction?.ensemble && (
        <div
          style={{
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 4,
            padding: "8px 10px",
            marginBottom: 12,
            fontSize: 10,
          }}
        >
          <div style={{ color: "#64748b", marginBottom: 4 }}>ENSEMBLE WEIGHTED TALLY</div>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ color: "#10b981" }}>BUY {prediction.ensemble.buyVotes}</span>
            <span style={{ color: "#ef4444" }}>SELL {prediction.ensemble.sellVotes}</span>
            <span style={{ color: "#fbbf24" }}>HOLD {prediction.ensemble.holdVotes}</span>
            <span style={{ marginLeft: "auto", color: "#94a3b8" }}>
              score {prediction.ensemble.weightedScore.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Monte Carlo */}
      {prediction?.monteCarlo && (
        <div
          style={{
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 4,
            padding: "8px 10px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>
            MONTE CARLO · {prediction.monteCarlo.simulations} simulations
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>
            E[Price] = <span style={{ color: "#f1f5f9", fontWeight: 700 }}>
              {prediction.monteCarlo.expectedPrice.toFixed(2)}
            </span>{" "}
            · σ = <span style={{ color: "#f1f5f9" }}>{prediction.monteCarlo.stdDev.toFixed(3)}</span>
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            Bullish ratio:{" "}
            <span style={{ color: "#10b981", fontWeight: 700 }}>
              {((prediction.monteCarlo.bullishRatio || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
            95% CI: [{prediction.monteCarlo.percentile95Down.toFixed(2)}, {prediction.monteCarlo.percentile95Up.toFixed(2)}]
          </div>
        </div>
      )}

      {/* Kelly criterion */}
      {prediction?.kelly && (
        <div
          style={{
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 4,
            padding: "8px 10px",
            marginBottom: 12,
            fontSize: 10,
          }}
        >
          <span style={{ color: "#64748b" }}>KELLY CRITERION</span>
          <span style={{ marginLeft: 10, color: "#f1f5f9" }}>
            f* = {((prediction.kelly.fraction || 0) * 100).toFixed(2)}%
          </span>
          <span style={{ marginLeft: 10, color: "#fbbf24" }}>
            → risk {(prediction.kelly.recommendedRiskPct * 100).toFixed(2)}% of equity
          </span>
        </div>
      )}

      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(2,6,23,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fbbf24",
            fontSize: 12,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                border: "2px solid #fbbf2433",
                borderTopColor: "#fbbf24",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span>Running 6-agent ensemble + Monte Carlo…</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <button
        onClick={runPrediction}
        disabled={loading || candles.length < 30}
        style={{
          width: "100%",
          padding: "8px 0",
          background: loading ? "#1e293b" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          cursor: loading ? "wait" : "pointer",
          opacity: candles.length < 30 ? 0.5 : 1,
        }}
      >
        {loading ? "ANALYZING…" : candles.length < 30 ? "NEED ≥30 CANDLES" : "RE-RUN ENSEMBLE"}
      </button>
    </div>
  );
}
