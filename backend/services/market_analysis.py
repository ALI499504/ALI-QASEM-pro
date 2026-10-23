from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Literal, Optional

import pandas as pd
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.trend import EMAIndicator, MACD, SMAIndicator
from ta.volatility import BollingerBands, AverageTrueRange

from models.schemas import (
    IndicatorPoint,
    MACDPoint,
    BollingerPoint,
    StochasticPoint,
    TechnicalSummary,
    MarketZone,
    TradeSignal,
    MarketAnalysis,
)


# ──────────────────────────────────────────────────────────────────────
# helpers
# ──────────────────────────────────────────────────────────────────────

def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(result) or math.isinf(result):
        return None
    return result


def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    required = {"Date", "Open", "High", "Low", "Close", "Volume"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"History data is missing columns: {', '.join(sorted(missing))}")
    prepared = df.copy()
    for col in ["Close", "Open", "High", "Low"]:
        prepared[col] = pd.to_numeric(prepared[col], errors="coerce")
    prepared["Volume"] = pd.to_numeric(prepared["Volume"], errors="coerce").fillna(0)
    prepared = prepared.dropna(subset=["Close", "High", "Low"])
    if prepared.empty:
        raise ValueError("History data has no usable price rows")
    return prepared


def _series_points(df: pd.DataFrame, values: pd.Series) -> list[IndicatorPoint]:
    points: list[IndicatorPoint] = []
    for idx, value in values.items():
        points.append(
            IndicatorPoint(
                date=df.iloc[idx]["Date"] if hasattr(df.iloc[idx], "Date") else idx,
                value=_safe_float(value),
            )
        )
    return points


# ──────────────────────────────────────────────────────────────────────
# Classic Technical Indicators
# ──────────────────────────────────────────────────────────────────────

def rsi(df: pd.DataFrame, window: int = 14) -> pd.Series:
    prepared = _prepare(df)
    return RSIIndicator(prepared["Close"], window=window).rsi()


def macd(df: pd.DataFrame) -> pd.DataFrame:
    prepared = _prepare(df)
    indicator = MACD(prepared["Close"], window_slow=26, window_fast=12, window_sign=9)
    return pd.DataFrame(
        {
            "macd": indicator.macd(),
            "signal": indicator.macd_signal(),
            "histogram": indicator.macd_diff(),
        }
    )


def bollinger_bands(df: pd.DataFrame, window: int = 20, window_dev: int = 2) -> pd.DataFrame:
    prepared = _prepare(df)
    indicator = BollingerBands(prepared["Close"], window=window, window_dev=window_dev)
    return pd.DataFrame(
        {
            "upper": indicator.bollinger_hband(),
            "middle": indicator.bollinger_mavg(),
            "lower": indicator.bollinger_lband(),
            "width": indicator.bollinger_wband(),
        }
    )


def sma(df: pd.DataFrame, window: int) -> pd.Series:
    prepared = _prepare(df)
    return SMAIndicator(prepared["Close"], window=window).sma_indicator()


def ema(df: pd.DataFrame, window: int) -> pd.Series:
    prepared = _prepare(df)
    return EMAIndicator(prepared["Close"], window=window).ema_indicator()


def atr(df: pd.DataFrame, window: int = 14) -> pd.Series:
    prepared = _prepare(df)
    return AverageTrueRange(prepared["High"], prepared["Low"], prepared["Close"], window=window).average_true_range()


def stochastic(df: pd.DataFrame, window: int = 14, smooth_window: int = 3) -> pd.DataFrame:
    prepared = _prepare(df)
    indicator = StochasticOscillator(
        high=prepared["High"],
        low=prepared["Low"],
        close=prepared["Close"],
        window=window,
        smooth_window=smooth_window,
    )
    return pd.DataFrame({"k": indicator.stoch(), "d": indicator.stoch_signal()})


# ──────────────────────────────────────────────────────────────────────
# ICT Concepts (Internal Combined Trading)
# ──────────────────────────────────────────────────────────────────────

def _detect_fair_value_gaps(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Detect Fair Value Gaps (FVG) - gaps in price action."""
    gaps = []
    close = df["Close"]
    high = df["High"]
    low = df["Low"]

    for i in range(2, len(df)):
        # Bullish FVG: low[i-1] > high[i-2]
        if low[i - 1] > high[i - 2]:
            gaps.append(
                {
                    "type": "bullish",
                    "low": float(low[i - 1]),
                    "high": float(high[i - 2]),
                    "index": i - 1,
                    "strength": float(close.iloc[i] - high[i - 2]),
                }
            )
        # Bearish FVG: high[i-1] < low[i-2]
        if high[i - 1] < low[i - 2]:
            gaps.append(
                {
                    "type": "bearish",
                    "high": float(high[i - 1]),
                    "low": float(low[i - 2]),
                    "index": i - 1,
                    "strength": float(low[i - 2] - close.iloc[i]),
                }
            )
    return gaps


def _detect_order_blocks(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Detect Order Blocks - reversal candles."""
    obs = []
    close = df["Close"]
    open_ = df["Open"]
    high = df["High"]
    low = df["Low"]

    for i in range(1, len(df)):
        # Bullish OB: down candle followed by up move
        if close.iloc[i - 1] < open_.iloc[i - 1] and close.iloc[i] > open_.iloc[i]:
            obs.append(
                {
                    "type": "bullish",
                    "price": float(close.iloc[i - 1]),
                    "index": i - 1,
                    "strength": float(close.iloc[i] - close.iloc[i - 1]),
                }
            )
        # Bearish OB: up candle followed by down move
        if close.iloc[i - 1] > open_.iloc[i - 1] and close.iloc[i] < open_.iloc[i]:
            obs.append(
                {
                    "type": "bearish",
                    "price": float(close.iloc[i - 1]),
                    "index": i - 1,
                    "strength": float(close.iloc[i - 1] - close.iloc[i]),
                }
            )
    return obs


def _session_high_low(df: pd.DataFrame, session_hours: tuple[int, int] = (8, 17)) -> dict[str, float]:
    """Get session high/low for NY session (8AM-5PM ET)."""
    # Convert to ET for session detection - simplified
    times = pd.to_datetime(df["Date"])
    session_mask = times.dt.hour.between(session_hours[0], session_hours[1])
    if session_mask.any():
        session_data = df.loc[session_mask]
        return {"high": float(session_data["High"].max()), "low": float(session_data["Low"].min())}
    # Fallback: use daily high/low
    return {"high": float(df["High"].max()), "low": float(df["Low"].min())}


def _detect_kill_zones(df: pd.DataFrame) -> dict[str, Any]:
    """Detect ICT Kill Zones - high-volume session open periods.
    
    London Open: 8:00 AM - 10:00 AM ET
    New York Open: 9:30 AM - 12:00 PM ET
    """
    try:
        times = pd.to_datetime(df["Date"])
        results = {}
        
        # London Open session (8:00 - 10:00 AM ET)
        london_mask = times.dt.hour.between(8, 10)
        london_data = df.loc[london_mask]
        if not london_data.empty:
            results["london"] = {
                "is_active": True,
                "volume": float(london_data["Volume"].sum()),
                "high": float(london_data["High"].max()),
                "low": float(london_data["Low"].min()),
                "session_type": "london_open",
            }
        else:
            results["london"] = {
                "is_active": False,
                "volume": 0.0,
                "high": 0.0,
                "low": 0.0,
                "session_type": "london_open",
            }
        
        # New York Open session (9:30 AM - 12:00 PM ET)
        # Approximated as 9:00 - 11:00 AM ET for simplicity
        ny_mask = times.dt.hour.between(9, 11)
        ny_data = df.loc[ny_mask]
        if not ny_data.empty:
            results["new_york"] = {
                "is_active": True,
                "volume": float(ny_data["Volume"].sum()),
                "high": float(ny_data["High"].max()),
                "low": float(ny_data["Low"].min()),
                "session_type": "new_york_open",
            }
        else:
            results["new_york"] = {
                "is_active": False,
                "volume": 0.0,
                "high": 0.0,
                "low": 0.0,
                "session_type": "new_york_open",
            }
        
        # Determine if any kill zone is active
        active_zones = [k for k, v in results.items() if v["is_active"]]
        results["any_active"] = len(active_zones) > 0
        results["primary_zone"] = active_zones[0] if active_zones else "none"
        
        return results
        
    except Exception:
        return {
            "london": {"is_active": False, "volume": 0.0, "high": 0.0, "low": 0.0, "session_type": "london_open"},
            "new_york": {"is_active": False, "volume": 0.0, "high": 0.0, "low": 0.0, "session_type": "new_york_open"},
            "any_active": False,
            "primary_zone": "none",
        }


# ──────────────────────────────────────────────────────────────────────
# Market Zone Detection
# ──────────────────────────────────────────────────────────────────────

def detect_support_resistance_zones(
    df: pd.DataFrame,
    lookback: int = 20,
    min_touches: int = 2,
) -> list[MarketZone]:
    """Detect Support/Resistance zones from pivot highs/lows."""
    high = df["High"]
    low = df["Low"]
    zones: list[MarketZone] = []

    # Resistance zones (peaks)
    for i in range(lookback, len(df) - lookback):
        is_peak = all(high.iloc[i] >= high.iloc[i - j] for j in range(1, lookback + 1)) and \
                  all(high.iloc[i] >= high.iloc[i + j] for j in range(1, lookback + 1))
        if is_peak:
            zone_low = float(low.iloc[i - lookback : i + lookback + 1].min())
            zone_high = float(high.iloc[i])
            # Count touches in last N bars
            recent = df.iloc[i - lookback - 10 : i + lookback + 1]
            touches_low = int((recent["Low"] >= zone_low - 0.02 * zone_high).sum())
            touches_high = int((recent["High"] <= zone_high + 0.02 * zone_high).sum())

            if touches_high >= min_touches:
                zones.append(
                    MarketZone(
                        name=f"Resistance_{i}",
                        zone_type="resistance",
                        high=zone_high,
                        low=zone_low,
                        strength=min(touches_high, 5) / 5.0,
                        test_count=touches_high,
                    )
                )

        # Support zones (valleys)
        is_valley = all(low.iloc[i] <= low.iloc[i - j] for j in range(1, lookback + 1)) and \
                    all(low.iloc[i] <= low.iloc[i + j] for j in range(1, lookback + 1))
        if is_valley:
            zone_high = float(high.iloc[i - lookback : i + lookback + 1].max())
            zone_low = float(low.iloc[i])
            recent = df.iloc[i - lookback - 10 : i + lookback + 1]
            touches_low = int((recent["Low"] >= zone_low - 0.02 * zone_low).sum())
            touches_high = int((recent["High"] <= zone_high + 0.02 * zone_high).sum())

            if touches_low >= min_touches:
                zones.append(
                    MarketZone(
                        name=f"Support_{i}",
                        zone_type="support",
                        high=zone_high,
                        low=zone_low,
                        strength=min(touches_low, 5) / 5.0,
                        test_count=touches_low,
                    )
                )

    # Sort by strength desc then recency
    zones.sort(key=lambda z: (z.strength, z.test_count), reverse=True)
    return zones


# ──────────────────────────────────────────────────────────────────────
# Market Analysis (ICT + Classical)
# ──────────────────────────────────────────────────────────────────────

def analyze_market(
    df: pd.DataFrame,
    symbol: str = "XAUUSD",
) -> MarketAnalysis:
    """Complete market analysis combining ICT & Classical."""
    prepared = _prepare(df)

    # --- Classic Indicators ---
    rsi_val = rsi(prepared).iloc[-1]
    macd_df = macd(prepared)
    macd_val = macd_df["macd"].iloc[-1]
    macd_sig = macd_df["signal"].iloc[-1]
    macd_hist = macd_df["histogram"].iloc[-1]
    bb = bollinger_bands(prepared)
    bb_upper = bb["upper"].iloc[-1]
    bb_middle = bb["middle"].iloc[-1]
    bb_lower = bb["lower"].iloc[-1]
    bb_width = bb["width"].iloc[-1]
    sma_20 = sma(prepared, 20).iloc[-1]
    sma_50 = sma(prepared, 50).iloc[-1]
    atr_val = atr(prepared).iloc[-1]
    stoch_df = stochastic(prepared)
    stoch_k = stoch_df["k"].iloc[-1]
    stoch_d = stoch_df["d"].iloc[-1]

    # --- ICT Concepts ---
    fvgs = _detect_fair_value_gaps(prepared)
    obs = _detect_order_blocks(prepared)
    session = _session_high_low(prepared)

    # --- Trend Determination ---
    trend = "neutral"
    if rsi_val > 50 and macd_val > macd_sig and macd_hist > 0:
        trend = "bullish"
    elif rsi_val < 50 and macd_val < macd_sig and macd_hist < 0:
        trend = "bearish"

    # --- Zones ---
    zones = detect_support_resistance_zones(prepared, lookback=15, min_touches=2)

    # --- Trade Signal ---
    signal = _generate_trade_signal(
        rsi_val, macd_val, macd_sig, macd_hist, bb_upper, bb_lower, stoch_k, zones
    )

    # --- Classical Analysis ---
    # Recent swing high/low
    recent_high = float(df["High"].iloc[-1])
    recent_low = float(df["Low"].iloc[-1])

    # --- Build Response ---
    return MarketAnalysis(
        symbol=symbol,
        trend=trend,
        zones=zones[:10],  # top 10 zones
        signal=signal,
        classical={
            "rsi": float(rsi_val) if rsi_val else None,
            "sma_20": float(sma_20) if sma_20 else None,
            "sma_50": float(sma_50) if sma_50 else None,
            "bb_upper": float(bb_upper) if bb_upper else None,
            "bb_lower": float(bb_lower) if bb_lower else None,
        },
        ict={
            "fair_value_gaps": fvgs[-5:],  # last 5 FVGs
            "order_blocks": obs[-3:],  # last 3 OB
            "session_high": session["high"],
            "session_low": session["low"],
        },
    )


def _generate_trade_signal(
    rsi: float | None,
    macd: float | None,
    macd_signal: float | None,
    macd_hist: float | None,
    bb_upper: float | None,
    bb_lower: float | None,
    stoch_k: float | None,
    zones: list[MarketZone],
) -> TradeSignal:
    """Generate buy/sell/hold signal with SL/TP based on zones & indicators."""
    action = "hold"
    entry = None
    sl = None
    tps: list[float] = []
    rr_ratio = 0.0

    # Zone-based logic
    demand_zones = [z for z in zones if z.zone_type == "support"]
    supply_zones = [z for z in zones if z.zone_type == "resistance"]

    if demand_zones and rsi and rsi < 30:
        # Buy at support with oversold RSI
        zone = demand_zones[0]
        action = "buy"
        entry = zone.low * 0.999  # slight below zone low
        sl = zone.low * 0.985
        tp1 = zone.high * 1.002
        tp2 = zone.high * 1.015
        tps = [tp1, tp2]
        risk = entry - sl
        reward = min(tps) - entry if risk else 0
        rr_ratio = reward / risk if risk else 0

    elif supply_zones and rsi and rsi > 70:
        # Sell at resistance with overbought RSI
        action = "sell"
        zone = supply_zones[0]
        entry = zone.high * 1.001  # slight above zone high
        sl = zone.high * 1.015
        tp1 = zone.low * 0.998
        tp2 = zone.low * 0.985
        tps = [tp1, tp2]
        risk = sl - entry
        reward = entry - min(tps) if risk else 0
        rr_ratio = reward / risk if risk else 0

    # Fallback: MACD-based
    if action == "hold" and macd and macd_signal:
        if macd > macd_signal and macd_hist > 0:
            action = "buy"
        elif macd < macd_signal and macd_hist < 0:
            action = "sell"

    # Default levels if no zone signal
    if action in ("buy", "sell") and entry and sl and not tps:
        risk = abs(entry - sl)
        tp = entry + risk * 2 if action == "buy" else entry - risk * 2
        tps = [tp]
        rr_ratio = 2.0

    return TradeSignal(
        action=action,
        entry=round(entry, 2) if entry else None,
        stop_loss=round(sl, 2) if sl else None,
        take_profit=[round(t, 2) for t in tps],
        risk_reward_ratio=round(rr_ratio, 2),
    )


# ──────────────────────────────────────────────────────────────────────
# Exported Functions
# ──────────────────────────────────────────────────────────────────────

__all__ = [
    "rsi",
    "macd",
    "bollinger_bands",
    "sma",
    "ema",
    "atr",
    "stochastic",
    "_detect_fair_value_gaps",
    "_detect_order_blocks",
    "_session_high_low",
    "detect_support_resistance_zones",
    "analyze_market",
    "_generate_trade_signal",
]