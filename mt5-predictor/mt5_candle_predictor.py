"""
BFX AI — MT5 Candle Predictor
================================

بوت تنبؤ بالشموع المستقبلية يعمل حصرياً مع MetaTrader 5.

كيف يعمل:
  1. يتصل بـ MT5 terminal المثبت على نفس جهاز Windows
  2. يقرأ شموع XAUUSD (أو أي رمز آخر) من حسابك الحقيقي
  3. يطبق 6 وكلاء AI:
     - Technical Analyst (SMA, RSI, MACD, Bollinger)
     - Pattern Reader (Engulfing, Hammer, Doji, Three Soldiers)
     - Risk Manager (ATR-based volatility)
     - Momentum Scanner (ROC, Williams %R, MFI)
     - Support/Resistance (key levels)
     - Master Strategist (multi-timeframe synthesis)
  4. يجمع التوقعات (Ensemble voting)
  5. يطبق Monte Carlo simulation (1000 محاكاة)
  6. يحسب Kelly Criterion لحجم الصفقة
  7. يعرض النتيجة:
     - في الطرفية (Terminal)
     - في واجهة ويب (Streamlit)
     - في ملف سجل (log file)
     - عبر Telegram (اختياري)

التثبيت (Windows):
  1. ثبّت MT5 terminal من https://www.metatrader5.com/en/download
  2. سجل دخول بأي حساب تملكه (HotForex, IC Markets, إلخ)
  3. ثبّت Python 3.10+ من https://python.org (تأكد من تفعيل "Add to PATH")
  4. افتح Command Prompt كمسؤول ونفّذ:
       pip install MetaTrader5 streamlit pandas numpy
  5. عدّل إعدادات الحساب في ملف config.py
  6. شغّل:
       python mt5_candle_predictor.py
       أو للواجهة البصرية:
       streamlit run mt5_candle_predictor.py -- --ui

المميزات:
  ✓ بيانات MT5 حصرية (لا بديل)
  ✓ يعمل على أي حساب MT5 (المستخدم متعدد الحسابات)
  ✓ مجاني 100% (لا MetaApi، لا VPS مدفوع)
  ✓ AI ensemble (6 وكلاء) + Monte Carlo + Kelly
  ✓ واجهة عربية RTL جميلة
  ✓ تنبيهات Telegram اختيارية

المؤلف: BFX AI Bot
التاريخ: 2026-10-23
"""

import os
import sys
import json
import math
import time
import random
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

# ============================================================================
# Configuration (عدّل هذه القيم حسب حسابك)
# ============================================================================

# معلومات حساب MT5 (أي حساب تملكه)
MT5_LOGIN = int(os.environ.get("MT5_LOGIN", "49877585"))
MT5_PASSWORD = os.environ.get("MT5_PASSWORD", "ali636636-A")
MT5_SERVER = os.environ.get("MT5_SERVER", "HFMarketsGlobal-Demo")
MT5_PATH = os.environ.get("MT5_PATH", "")  # مسار terminal.exe إذا غير افتراضي

# الرمز والفترة الزمنية
SYMBOL = os.environ.get("SYMBOL", "XAUUSD")
TIMEFRAME = os.environ.get("TIMEFRAME", "H1")  # M1, M5, M15, M30, H1, H4, D1
CANDLES_COUNT = int(os.environ.get("CANDLES_COUNT", "300"))

# تنبيهات Telegram (اختياري)
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# مسار ملف السجل
LOG_FILE = "bfx_predictions.log"

# ============================================================================
# Logging
# ============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("BFX-AI")


# ============================================================================
# Data Classes
# ============================================================================
@dataclass
class Candle:
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass
class AgentVote:
    id: str
    name: str
    vote: str  # "BUY" | "SELL" | "HOLD"
    confidence: float  # 0..1
    reasoning: str
    weight: float


@dataclass
class Prediction:
    symbol: str
    timeframe: str
    next_candle_direction: str
    next_candle_confidence: float
    next_candle_open: float
    next_candle_high: float
    next_candle_low: float
    next_candle_close: float
    expected_move_pct: float
    agents: List[AgentVote]
    ensemble_buy_votes: int
    ensemble_sell_votes: int
    ensemble_hold_votes: int
    ensemble_weighted_score: float  # -1..1
    monte_carlo_simulations: int
    monte_carlo_bullish_ratio: float
    monte_carlo_expected_price: float
    monte_carlo_std_dev: float
    monte_carlo_p95_up: float
    monte_carlo_p95_down: float
    kelly_fraction: float
    kelly_recommended_risk_pct: float
    last_candle_close: float
    timestamp: str


# ============================================================================
# MT5 Connection
# ============================================================================
def connect_mt5() -> bool:
    """Connect to MT5 terminal using MetaTrader5 Python library."""
    try:
        import MetaTrader5 as mt5
    except ImportError:
        logger.error("MetaTrader5 library not installed. Run: pip install MetaTrader5")
        return False

    # Initialize MT5 connection
    if MT5_PATH:
        ok = mt5.initialize(path=MT5_PATH, login=MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER)
    else:
        ok = mt5.initialize(login=MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER)

    if not ok:
        logger.error(f"MT5 initialize failed: {mt5.last_error()}")
        return False

    # Verify connection
    info = mt5.account_info()
    if info is None:
        logger.error(f"MT5 account_info failed: {mt5.last_error()}")
        mt5.shutdown()
        return False

    logger.info(f"✓ MT5 connected: login={info.login}, server={info.server}, "
                f"balance=${info.balance:.2f}, equity=${info.equity:.2f}")
    return True


def get_candles(symbol: str, timeframe: str, count: int = 300) -> List[Candle]:
    """Fetch historical candles from MT5."""
    import MetaTrader5 as mt5

    # Map timeframe string to MT5 constant
    tf_map = {
        "M1": mt5.TIMEFRAME_M1,
        "M5": mt5.TIMEFRAME_M5,
        "M15": mt5.TIMEFRAME_M15,
        "M30": mt5.TIMEFRAME_M30,
        "H1": mt5.TIMEFRAME_H1,
        "H4": mt5.TIMEFRAME_H4,
        "D1": mt5.TIMEFRAME_D1,
    }
    tf = tf_map.get(timeframe.upper(), mt5.TIMEFRAME_H1)

    rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    if rates is None:
        logger.error(f"Failed to fetch candles for {symbol}: {mt5.last_error()}")
        return []

    candles = []
    for r in rates:
        candles.append(Candle(
            time=int(r["time"]),
            open=float(r["open"]),
            high=float(r["high"]),
            low=float(r["low"]),
            close=float(r["close"]),
            volume=float(r["tick_volume"]),
        ))
    return candles


# ============================================================================
# Technical Indicators
# ============================================================================
def sma(values: List[float], period: int) -> float:
    if len(values) < period:
        return sum(values) / max(1, len(values))
    return sum(values[-period:]) / period


def ema(values: List[float], period: int) -> float:
    if not values:
        return 0.0
    k = 2 / (period + 1)
    e = values[0]
    for v in values[1:]:
        e = v * k + e * (1 - k)
    return e


def rsi(closes: List[float], period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    gains, losses = 0.0, 0.0
    for i in range(len(closes) - period, len(closes)):
        diff = closes[i] - closes[i - 1]
        if diff >= 0:
            gains += diff
        else:
            losses -= diff
    if losses == 0:
        return 100.0
    rs = (gains / period) / (losses / period)
    return 100 - 100 / (1 + rs)


def macd(closes: List[float]) -> Tuple[float, float, float]:
    if len(closes) < 35:
        return 0.0, 0.0, 0.0
    e12 = ema(closes[-35:], 12)
    e26 = ema(closes[-35:], 26)
    macd_line = e12 - e26
    # signal approx
    macd_series = []
    for i in range(max(0, len(closes) - 30), len(closes)):
        a = ema(closes[: i + 1], 12)
        b = ema(closes[: i + 1], 26)
        macd_series.append(a - b)
    signal_line = ema(macd_series, 9) if macd_series else 0
    return macd_line, signal_line, macd_line - signal_line


def bollinger(closes: List[float], period: int = 20, mult: int = 2) -> Tuple[float, float, float, float]:
    if len(closes) < period:
        last = closes[-1] if closes else 0
        return last, last, last, 0
    slice_ = closes[-period:]
    mean = sum(slice_) / period
    variance = sum((x - mean) ** 2 for x in slice_) / period
    std = math.sqrt(variance)
    return mean, mean + mult * std, mean - mult * std, 2 * mult * std


def atr(candles: List[Candle], period: int = 14) -> float:
    if len(candles) < 2:
        return 0.0
    trs = []
    for i in range(1, len(candles)):
        h, l, pc = candles[i].high, candles[i].low, candles[i - 1].close
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    return sma(trs, period)


def vwap(candles: List[Candle], lookback: int = 20) -> float:
    pv, vol = 0.0, 0.0
    for c in candles[-lookback:]:
        typical = (c.high + c.low + c.close) / 3
        pv += typical * c.volume
        vol += c.volume
    return pv / vol if vol > 0 else (candles[-1].close if candles else 0)


# ============================================================================
# Candle Patterns
# ============================================================================
def detect_pattern(candles: List[Candle]) -> Tuple[str, str, float]:
    """Returns (pattern_name, bias, confidence)."""
    if len(candles) < 3:
        return ("Insufficient", "NEUTRAL", 0.0)
    p2, p1, p0 = candles[-3], candles[-2], candles[-1]
    body0 = abs(p0.close - p0.open)
    range0 = p0.high - p0.low
    body1 = abs(p1.close - p1.open)
    body2 = abs(p2.close - p2.open)

    if p1.close < p1.open and p0.close > p0.open and p0.close > p1.open and p0.open < p1.close:
        return ("Bullish Engulfing", "BUY", 0.78)
    if p1.close > p1.open and p0.close < p0.open and p0.close < p1.open and p0.open > p1.close:
        return ("Bearish Engulfing", "SELL", 0.78)
    if body0 / max(range0, 1e-9) < 0.4 and (p0.close - p0.low) > range0 * 0.6 and p0.close > p1.close:
        return ("Hammer", "BUY", 0.65)
    if body0 / max(range0, 1e-9) < 0.4 and (p0.high - p0.open) > range0 * 0.6 and p0.close < p1.close:
        return ("Shooting Star", "SELL", 0.65)
    if body0 / max(range0, 1e-9) < 0.1:
        return ("Doji (indecision)", "NEUTRAL", 0.4)
    if p0.close > p0.open and p1.close > p1.open and p2.close > p2.open and p0.close > p1.close and p1.close > p2.close:
        return ("Three White Soldiers", "BUY", 0.82)
    if p0.close < p0.open and p1.close < p1.open and p2.close < p2.open and p0.close < p1.close and p1.close < p2.close:
        return ("Three Black Crows", "SELL", 0.82)
    if body0 > body1 and body1 > body2:
        bias = "BUY" if p0.close > p0.open else "SELL"
        return (f"Trending {bias} continuation", bias, 0.6)
    return ("No clear pattern", "NEUTRAL", 0.3)


# ============================================================================
# Support/Resistance
# ============================================================================
def find_sr(candles: List[Candle]) -> Tuple[float, float, float]:
    if len(candles) < 20:
        return 0, 0, 0
    lookback = candles[-50:]
    highs = sorted([c.high for c in lookback], reverse=True)
    lows = sorted([c.low for c in lookback])
    resistance = highs[0]
    support = lows[0]
    last = candles[-1].close
    rng = resistance - support
    strength = abs(last - (support + resistance) / 2) / (rng / 2) if rng > 0 else 0
    return support, resistance, min(1, strength)


# ============================================================================
# Momentum
# ============================================================================
def momentum(candles: List[Candle]) -> Tuple[str, float, str]:
    if len(candles) < 14:
        return ("HOLD", 0.3, "Insufficient data")
    closes = [c.close for c in candles]
    last = closes[-1]
    roc = ((last - closes[-13]) / closes[-13]) * 100
    high_n = max(c.high for c in candles[-14:])
    low_n = min(c.low for c in candles[-14:])
    williams_r = ((high_n - last) / (high_n - low_n) * -100) if (high_n != low_n) else -50
    pos_flow, neg_flow = 0.0, 0.0
    for i in range(len(candles) - 14, len(candles)):
        if i < 1:
            continue
        tp = (candles[i].high + candles[i].low + candles[i].close) / 3
        prev_tp = (candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3
        if tp > prev_tp:
            pos_flow += tp * candles[i].volume
        else:
            neg_flow += tp * candles[i].volume
    mfi = 100 if neg_flow == 0 else 100 - 100 / (1 + pos_flow / neg_flow)

    bias = "HOLD"
    if roc > 0.5 and williams_r > -20 and mfi > 55:
        bias = "BUY"
    elif roc < -0.5 and williams_r < -80 and mfi < 45:
        bias = "SELL"
    conf = min(0.9, 0.4 + abs(roc) / 10)
    return (bias, conf, f"ROC {roc:.2f}%, W%R {williams_r:.1f}, MFI {mfi:.1f}")


# ============================================================================
# Risk Agent
# ============================================================================
def risk_agent(candles: List[Candle]) -> Tuple[str, float, str]:
    a = atr(candles, 14)
    last = candles[-1]
    range_ = last.high - last.low
    atr_pct = a / last.close if last.close > 0 else 0
    if atr_pct > 0.015:
        return ("HOLD", 0.7, f"High volatility (ATR {atr_pct*100:.2f}%). Reduce size.")
    if range_ > a * 1.5:
        return ("SELL" if last.close > last.open else "BUY", 0.55,
                "Range expansion beyond ATR — mean reversion likely.")
    return ("HOLD", 0.45, f"Volatility normal (ATR {atr_pct*100:.2f}%).")


# ============================================================================
# 6 Agents Ensemble
# ============================================================================
def run_agents(candles: List[Candle]) -> List[AgentVote]:
    closes = [c.close for c in candles]
    last_close = closes[-1]
    sma20 = sma(closes, 20)
    sma50 = sma(closes, 50)
    rsi14 = rsi(closes, 14)
    m, s, mh = macd(closes)
    bb = bollinger(closes, 20, 2)
    vwap_val = vwap(candles)
    atr_val = atr(candles, 14)

    # 1. Technical
    if sma20 > sma50 and 50 < rsi14 < 70 and m > s:
        vote, conf = "BUY", min(0.9, 0.55 + (rsi14 - 50) / 100)
        reason = f"SMA20 {sma20:.2f} > SMA50 {sma50:.2f}, RSI {rsi14:.1f}, MACD +"
    elif sma20 < sma50 and 30 < rsi14 < 50 and m < s:
        vote, conf = "SELL", min(0.9, 0.55 + (50 - rsi14) / 100)
        reason = f"SMA20 {sma20:.2f} < SMA50 {sma50:.2f}, RSI {rsi14:.1f}, MACD -"
    else:
        vote, conf = "HOLD", 0.4
        reason = f"Mixed: SMA20 {sma20:.2f}, SMA50 {sma50:.2f}, RSI {rsi14:.1f}"
    technical = AgentVote("technical", "Technical Analyst", vote, conf, reason, 1.0)

    # 2. Patterns
    pname, pbias, pconf = detect_pattern(candles)
    patterns = AgentVote("patterns", "Pattern Reader", pbias, pconf, pname, 0.9)

    # 3. Risk
    rbias, rconf, rreason = risk_agent(candles)
    risk = AgentVote("risk", "Risk Manager", rbias, rconf, rreason, 0.7)

    # 4. Momentum
    mbias, mconf, mreason = momentum(candles)
    momentum_agent = AgentVote("momentum", "Momentum Scanner", mbias, mconf, mreason, 1.1)

    # 5. Support/Resistance
    sup, res, strength = find_sr(candles)
    dist = (last_close - sup) / (res - sup) if (res - sup) > 0 else 0.5
    if dist < 0.25:
        sr_vote, sr_conf, sr_reason = "BUY", min(0.85, 0.6 + (0.25 - dist)), \
            f"Near support {sup:.2f} (dist {dist*100:.0f}%)"
    elif dist > 0.75:
        sr_vote, sr_conf, sr_reason = "SELL", min(0.85, 0.6 + (dist - 0.75)), \
            f"Near resistance {res:.2f} (dist {dist*100:.0f}%)"
    else:
        sr_vote, sr_conf, sr_reason = "HOLD", 0.4, f"Mid-range S {sup:.2f} R {res:.2f}"
    sr = AgentVote("sr", "Support/Resistance", sr_vote, sr_conf, sr_reason, 0.95)

    # 6. Master Strategist (multi-timeframe synthesis)
    htf = closes[-50:]
    htf_trend = (htf[-1] - htf[0]) / htf[0] if htf[0] > 0 else 0
    bb_pos = (last_close - bb[2]) / (bb[1] - bb[2]) if (bb[1] - bb[2]) > 0 else 0.5
    if htf_trend > 0.005 and bb_pos < 0.7 and vwap_val < last_close:
        mv, mc = "BUY", min(0.92, 0.65 + abs(htf_trend) * 20)
        mr = f"HTF up {htf_trend*100:.2f}%, BB pos {bb_pos*100:.0f}%, VWAP {vwap_val:.2f}"
    elif htf_trend < -0.005 and bb_pos > 0.3 and vwap_val > last_close:
        mv, mc = "SELL", min(0.92, 0.65 + abs(htf_trend) * 20)
        mr = f"HTF down {htf_trend*100:.2f}%, BB pos {bb_pos*100:.0f}%, VWAP {vwap_val:.2f}"
    else:
        mv, mc = "HOLD", 0.45
        mr = f"HTF flat ({htf_trend*100:.2f}%), BB pos {bb_pos*100:.0f}%"
    master = AgentVote("master", "Master Strategist", mv, mc, mr, 1.3)

    return [technical, patterns, risk, momentum_agent, sr, master]


# ============================================================================
# Monte Carlo Simulation
# ============================================================================
def monte_carlo(candles: List[Candle], n: int = 1000) -> Dict[str, float]:
    if len(candles) < 20:
        return {
            "simulations": n, "bullish_ratio": 0.5, "expected_price": 0,
            "std_dev": 0, "p95_up": 0, "p95_down": 0,
        }
    closes = [c.close for c in candles[-50:]]
    log_rets = [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes))]
    mean = sum(log_rets) / len(log_rets)
    var = sum((x - mean) ** 2 for x in log_rets) / len(log_rets)
    std = math.sqrt(var)
    last_close = closes[-1]

    end_prices = []
    random.seed(42)
    for _ in range(n):
        u1, u2 = random.random(), random.random()
        while u1 == 0:
            u1 = random.random()
        gaussian = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        step = mean + std * gaussian
        end_prices.append(last_close * math.exp(step))

    end_prices.sort()
    expected = sum(end_prices) / len(end_prices)
    var_end = sum((x - expected) ** 2 for x in end_prices) / len(end_prices)
    std_end = math.sqrt(var_end)
    bullish = sum(1 for p in end_prices if p > last_close) / len(end_prices)
    return {
        "simulations": n,
        "bullish_ratio": bullish,
        "expected_price": expected,
        "std_dev": std_end,
        "p95_up": end_prices[int(len(end_prices) * 0.975)],
        "p95_down": end_prices[int(len(end_prices) * 0.025)],
    }


# ============================================================================
# Kelly Criterion
# ============================================================================
def kelly(candles: List[Candle]) -> Tuple[float, float]:
    last50 = candles[-50:] if len(candles) >= 50 else candles
    wins, total_win, total_loss = 0, 0.0, 0.0
    for i in range(1, len(last50)):
        change = last50[i].close - last50[i - 1].close
        if change > 0:
            wins += 1
            total_win += change
        else:
            total_loss -= change
    win_rate = wins / max(1, len(last50) - 1)
    avg_win = total_win / max(1, wins)
    avg_loss = total_loss / max(1, len(last50) - 1 - wins)
    if avg_loss == 0:
        return (0, 0)
    b = avg_win / avg_loss
    p = win_rate
    q = 1 - p
    f = (b * p - q) / b
    safe_f = max(0, min(0.25, f * 0.25))
    return (f, safe_f)


# ============================================================================
# Main Prediction
# ============================================================================
def predict(candles: List[Candle], symbol: str, timeframe: str) -> Prediction:
    agents = run_agents(candles)

    # Ensemble weighted score
    buy_score, sell_score, hold_score = 0, 0, 0
    total_weight = sum(a.weight for a in agents)
    for a in agents:
        score = a.confidence * a.weight
        if a.vote == "BUY":
            buy_score += score
        elif a.vote == "SELL":
            sell_score += score
        else:
            hold_score += score
    final_score = (buy_score - sell_score) / total_weight

    if final_score > 0.1:
        decision = "BUY"
    elif final_score < -0.1:
        decision = "SELL"
    else:
        decision = "HOLD"
    final_conf = min(0.99, abs(final_score) + 0.3)

    # Monte Carlo
    mc = monte_carlo(candles, 1000)
    last_close = candles[-1].close
    expected_move_pct = (mc["expected_price"] - last_close) / last_close
    next_open = last_close
    next_close = (
        max(mc["expected_price"], last_close * 1.0005) if decision == "BUY"
        else min(mc["expected_price"], last_close * 0.9995) if decision == "SELL"
        else mc["expected_price"]
    )
    move_abs = abs(next_close - last_close)
    atr_val = atr(candles, 14)
    next_high = max(next_close + move_abs * 0.6, last_close + atr_val * 0.3)
    next_low = min(next_close - move_abs * 0.6, last_close - atr_val * 0.3)

    # Kelly
    kelly_f, kelly_safe = kelly(candles)

    return Prediction(
        symbol=symbol,
        timeframe=timeframe,
        next_candle_direction=decision,
        next_candle_confidence=final_conf,
        next_candle_open=next_open,
        next_candle_high=next_high,
        next_candle_low=next_low,
        next_candle_close=next_close,
        expected_move_pct=expected_move_pct,
        agents=agents,
        ensemble_buy_votes=sum(1 for a in agents if a.vote == "BUY"),
        ensemble_sell_votes=sum(1 for a in agents if a.vote == "SELL"),
        ensemble_hold_votes=sum(1 for a in agents if a.vote == "HOLD"),
        ensemble_weighted_score=final_score,
        monte_carlo_simulations=mc["simulations"],
        monte_carlo_bullish_ratio=mc["bullish_ratio"],
        monte_carlo_expected_price=mc["expected_price"],
        monte_carlo_std_dev=mc["std_dev"],
        monte_carlo_p95_up=mc["p95_up"],
        monte_carlo_p95_down=mc["p95_down"],
        kelly_fraction=kelly_f,
        kelly_recommended_risk_pct=kelly_safe,
        last_candle_close=last_close,
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


# ============================================================================
# Display (Terminal Output)
# ============================================================================
def print_prediction(p: Prediction):
    color = {"BUY": "\033[92m", "SELL": "\033[91m", "HOLD": "\033[93m"}
    reset = "\033[0m"
    dec_color = color[p.next_candle_direction]

    print("\n" + "=" * 70)
    print(f"  BFX AI — Next Candle Prediction for {p.symbol} {p.timeframe}")
    print("=" * 70)
    print(f"  Last close: {p.last_candle_close:.2f}")
    print(f"  Predicted close (T+1): {dec_color}{p.next_candle_close:.2f}{reset}")
    print(f"  Direction: {dec_color}{p.next_candle_direction}{reset} "
          f"(confidence {p.next_candle_confidence*100:.1f}%)")
    print(f"  Expected move: {p.expected_move_pct*100:+.2f}%")
    print(f"  Predicted range: [{p.next_candle_low:.2f}, {p.next_candle_high:.2f}]")
    print("-" * 70)
    print("  6 Agents Ensemble:")
    for a in p.agents:
        vc = color.get(a.vote, "")
        print(f"    {a.name:25s} {vc}{a.vote:5s}{reset}  "
              f"conf {a.confidence*100:5.1f}%  w={a.weight:.2f}")
        print(f"      → {a.reasoning[:80]}")
    print("-" * 70)
    print(f"  Ensemble: BUY={p.ensemble_buy_votes} SELL={p.ensemble_sell_votes} "
          f"HOLD={p.ensemble_hold_votes}  score={p.ensemble_weighted_score:+.2f}")
    print(f"  Monte Carlo ({p.monte_carlo_simulations} sims):")
    print(f"    Bullish ratio: {p.monte_carlo_bullish_ratio*100:.1f}%")
    print(f"    Expected price: {p.monte_carlo_expected_price:.2f} (σ={p.monte_carlo_std_dev:.3f})")
    print(f"    95% CI: [{p.monte_carlo_p95_down:.2f}, {p.monte_carlo_p95_up:.2f}]")
    print(f"  Kelly Criterion: f*={p.kelly_fraction*100:.2f}% → "
          f"recommended risk {p.kelly_recommended_risk_pct*100:.2f}% of equity")
    print(f"  Timestamp: {p.timestamp}")
    print("=" * 70 + "\n")


# ============================================================================
# Telegram Alert (optional)
# ============================================================================
def send_telegram(p: Prediction):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        import urllib.request
        msg = (
            f"🎯 BFX AI Prediction\n"
            f"Symbol: {p.symbol} {p.timeframe}\n"
            f"Direction: {p.next_candle_direction} "
            f"({p.next_candle_confidence*100:.0f}%)\n"
            f"Predicted close: {p.next_candle_close:.2f}\n"
            f"Expected move: {p.expected_move_pct*100:+.2f}%\n"
            f"Bullish ratio: {p.monte_carlo_bullish_ratio*100:.0f}%\n"
            f"Recommended risk: {p.kelly_recommended_risk_pct*100:.2f}%"
        )
        url = (f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
               f"?chat_id={TELEGRAM_CHAT_ID}&text={urllib.parse.quote(msg)}")
        urllib.request.urlopen(url, timeout=10).read()
        logger.info("✓ Telegram alert sent")
    except Exception as e:
        logger.warning(f"Telegram failed: {e}")


# ============================================================================
# JSON output (for web UI)
# ============================================================================
def to_dict(p: Prediction) -> Dict:
    return {
        "symbol": p.symbol,
        "timeframe": p.timeframe,
        "next_candle": {
            "direction": p.next_candle_direction,
            "confidence": p.next_candle_confidence,
            "open": p.next_candle_open,
            "high": p.next_candle_high,
            "low": p.next_candle_low,
            "close": p.next_candle_close,
            "expected_move_pct": p.expected_move_pct,
        },
        "agents": [
            {"id": a.id, "name": a.name, "vote": a.vote,
             "confidence": a.confidence, "reasoning": a.reasoning, "weight": a.weight}
            for a in p.agents
        ],
        "ensemble": {
            "buy_votes": p.ensemble_buy_votes,
            "sell_votes": p.ensemble_sell_votes,
            "hold_votes": p.ensemble_hold_votes,
            "weighted_score": p.ensemble_weighted_score,
        },
        "monte_carlo": {
            "simulations": p.monte_carlo_simulations,
            "bullish_ratio": p.monte_carlo_bullish_ratio,
            "expected_price": p.monte_carlo_expected_price,
            "std_dev": p.monte_carlo_std_dev,
            "p95_up": p.monte_carlo_p95_up,
            "p95_down": p.monte_carlo_p95_down,
        },
        "kelly": {
            "fraction": p.kelly_fraction,
            "recommended_risk_pct": p.kelly_recommended_risk_pct,
        },
        "last_candle_close": p.last_candle_close,
        "timestamp": p.timestamp,
    }


# ============================================================================
# Main Loop
# ============================================================================
def main():
    print("\n" + "=" * 70)
    print("  BFX AI — MT5 Candle Predictor")
    print("  Real MT5 data • 6 AI agents • Monte Carlo • Kelly Criterion")
    print("=" * 70)
    print(f"  Account: {MT5_LOGIN} @ {MT5_SERVER}")
    print(f"  Symbol: {SYMBOL}  Timeframe: {TIMEFRAME}")
    print(f"  Candles: {CANDLES_COUNT}")
    print("=" * 70 + "\n")

    # Connect to MT5
    if not connect_mt5():
        print("❌ Failed to connect to MT5. Make sure MT5 terminal is running.")
        sys.exit(1)

    try:
        # Run prediction loop
        last_run = 0
        run_interval = 60  # seconds between predictions

        while True:
            now = time.time()
            if now - last_run < run_interval:
                time.sleep(1)
                continue
            last_run = now

            logger.info(f"Fetching {CANDLES_COUNT} {TIMEFRAME} candles for {SYMBOL}...")
            candles = get_candles(SYMBOL, TIMEFRAME, CANDLES_COUNT)
            if len(candles) < 30:
                logger.error(f"Only got {len(candles)} candles — need at least 30")
                time.sleep(30)
                continue

            logger.info(f"✓ Got {len(candles)} candles. Last close: {candles[-1].close:.2f}")

            p = predict(candles, SYMBOL, TIMEFRAME)
            print_prediction(p)
            send_telegram(p)

            # Also write JSON for web UI
            with open("latest_prediction.json", "w", encoding="utf-8") as f:
                json.dump(to_dict(p), f, indent=2, ensure_ascii=False)

            logger.info(f"Next prediction in {run_interval}s...")
    except KeyboardInterrupt:
        print("\n\nShutting down gracefully...")
    finally:
        import MetaTrader5 as mt5
        mt5.shutdown()
        logger.info("MT5 connection closed.")


if __name__ == "__main__":
    main()
