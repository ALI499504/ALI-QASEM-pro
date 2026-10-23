"""
BFX Gold AI Bot — بوت تداول ذهب بالـ AI على GitHub Actions
يعمل على Windows runner في GitHub Actions مع MT5

المميزات:
- يتصل بـ MT5 ويراقب الذهب (XAUUSD)
- يحلل بـ RSI + MACD + EMA + Bollinger + ADX
- يأخذ صفقات BUY/SELL تلقائياً
- يرسل إشارات لتيليجرام
- يحفظ السجلات
"""

import os
import sys
import json
import time
import datetime
import MetaTrader5 as mt5
import pandas as pd
import pandas_ta as ta
import requests
from pathlib import Path

# === الإعدادات ===
SYMBOL = "XAUUSD"
TIMEFRAME = mt5.TIMEFRAME_M15
LOT_SIZE = 0.10
MAGIC_NUMBER = 20261022
MAX_POSITIONS = 1

# === المتغيرات من GitHub Secrets ===
MT5_LOGIN = int(os.environ.get("MT5_LOGIN", "0"))
MT5_PASSWORD = os.environ.get("MT5_PASSWORD", "")
MT5_SERVER = os.environ.get("MT5_SERVER", "Exness-Main")
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# === مجلد السجلات ===
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

def log(msg: str):
    """يسجل رسالة"""
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_DIR / "bot.log", "a", encoding="utf-8") as f:
        f.write(line + "\n")

def send_telegram(msg: str):
    """يرسل رسالة لتيليجرام"""
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        data = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": msg,
            "parse_mode": "HTML",
        }
        requests.post(url, json=data, timeout=10)
    except Exception as e:
        log(f"Telegram error: {e}")

def connect_mt5():
    """يتصل بـ MT5"""
    if not mt5.initialize():
        log(f"MT5 initialize failed: {mt5.last_error()}")
        return False
    
    # حاول تسجيل الدخول
    authorized = mt5.login(MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER)
    if not authorized:
        # جرب الاتصال بدون login (قد يكون MT5 مسجل دخول مسبقاً)
        authorized = mt5.login(MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER)
    
    if authorized:
        acc = mt5.account_info()
        if acc:
            log(f"✓ Connected to MT5: {acc.name} | Balance: {acc.balance} {acc.currency}")
            return True
    
    log(f"✗ MT5 login failed: {mt5.last_error()}")
    return False

def get_candles():
    """يجلب شموع الذهب"""
    rates = mt5.copy_rates_from_pos(SYMBOL, TIMEFRAME, 0, 200)
    if rates is None:
        log(f"Failed to get candles: {mt5.last_error()}")
        return None
    
    df = pd.DataFrame(rates)
    df["time"] = pd.to_datetime(df["time"], unit="s")
    return df

def analyze(df):
    """يحلل الشموع ويعطي قرار"""
    # RSI
    df["rsi"] = ta.rsi(df["close"], length=14)
    
    # MACD
    macd = ta.macd(df["close"], fast=12, slow=26, signal=9)
    df["macd"] = macd.iloc[:, 0]
    df["macd_signal"] = macd.iloc[:, 1]
    df["macd_hist"] = macd.iloc[:, 2]
    
    # EMA
    df["ema_50"] = ta.ema(df["close"], length=50)
    df["ema_200"] = ta.ema(df["close"], length=200)
    
    # Bollinger
    bb = ta.bbands(df["close"], length=20, std=2)
    df["bb_lower"] = bb.iloc[:, 0]
    df["bb_upper"] = bb.iloc[:, 2]
    
    # ADX
    adx = ta.adx(df["high"], df["low"], df["close"], length=14)
    df["adx"] = adx.iloc[:, 0]
    
    last = df.iloc[-1]
    
    # شروط الدخول
    bull = 0
    bear = 0
    
    # EMA trend
    if last["ema_50"] > last["ema_200"]:
        bull += 1
    else:
        bear += 1
    
    # RSI
    if last["rsi"] < 40:
        bull += 1
    elif last["rsi"] > 60:
        bear += 1
    
    # MACD
    if last["macd_hist"] > 0:
        bull += 1
    else:
        bear += 1
    
    # Bollinger
    if last["close"] < last["bb_lower"]:
        bull += 1
    elif last["close"] > last["bb_upper"]:
        bear += 1
    
    # ADX
    if last["adx"] > 25:
        if last["close"] > last["ema_50"]:
            bull += 1
        else:
            bear += 1
    
    if bull > bear:
        return "BUY", bull, bear, last
    elif bear > bull:
        return "SELL", bull, bear, last
    else:
        return "WAIT", bull, bear, last

def get_positions():
    """يجلب المراكز المفتوحة"""
    positions = mt5.positions_get(symbol=SYMBOL)
    if positions is None:
        return []
    return list(positions)

def place_order(direction: str, price: float, sl: float, tp: float):
    """يضع أمر"""
    order_type = mt5.ORDER_TYPE_BUY if direction == "BUY" else mt5.ORDER_TYPE_SELL
    
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": LOT_SIZE,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": MAGIC_NUMBER,
        "comment": "BFX AI Bot",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(request)
    return result

def close_position(position):
    """يغلق مركز"""
    tick = mt5.symbol_info_tick(SYMBOL)
    if not tick:
        return False
    
    close_type = mt5.ORDER_TYPE_SELL if position.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
    close_price = tick.bid if position.type == mt5.POSITION_TYPE_BUY else tick.ask
    
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": position.volume,
        "type": close_type,
        "position": position.ticket,
        "price": close_price,
        "deviation": 20,
        "magic": MAGIC_NUMBER,
        "comment": "BFX Close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(request)
    return result

def main():
    log("=" * 50)
    log("BFX Gold AI Bot — Starting")
    log(f"Symbol: {SYMBOL} | Timeframe: M15")
    
    # 1. اتصل بـ MT5
    if not connect_mt5():
        log("Cannot connect to MT5. Exiting.")
        send_telegram("⚠️ BFX Bot: فشل الاتصال بـ MT5")
        return
    
    # 2. احصل على الشموع
    df = get_candles()
    if df is None or len(df) < 50:
        log("Not enough candle data")
        return
    
    last_price = df.iloc[-1]["close"]
    log(f"Current price: {last_price}")
    
    # 3. حلل
    decision, bull, bear, last = analyze(df)
    confidence = round(abs(bull - bear) / 5 * 100 + 20)
    log(f"Analysis: {decision} (Bull={bull} Bear={bear} Confidence={confidence}%)")
    
    # 4. افحص المراكز المفتوحة
    positions = get_positions()
    log(f"Open positions: {len(positions)}")
    
    # 5. قرر: افتح مركز جديد أو أغلق موجوداً
    if len(positions) == 0 and decision != "WAIT":
        # افتح مركز جديد
        tick = mt5.symbol_info_tick(SYMBOL)
        if decision == "BUY":
            price = tick.ask
            sl = price - 5.0  # SL 5$ تحت الدخول
            tp = price + 7.5  # TP 7.5$ فوق الدخول (R/R = 1:1.5)
        else:
            price = tick.bid
            sl = price + 5.0
            tp = price - 7.5
        
        log(f"Placing {decision} order @ {price} | SL={sl} | TP={tp}")
        result = place_order(decision, price, sl, tp)
        
        if result and result.retcode == 10009:
            log(f"✓ Order placed! Ticket: {result.order}")
            msg = f"""
🔔 <b>BFX AI Bot — صفقة جديدة</b>

📊 {SYMBOL} | M15
{'🟢 شراء' if decision == 'BUY' else '🔴 بيع'} @ ${price:.2f}
🎯 SL: ${sl:.2f} | TP: ${tp:.2f}
💪 الثقة: {confidence}%
⏰ {datetime.datetime.now().strftime('%H:%M:%S')}
"""
            send_telegram(msg)
        else:
            log(f"✗ Order failed: {result.retcode if result else 'no result'}")
    
    elif len(positions) > 0:
        # افحص المراكز الموجودة — أغلق إذا تغيّر الاتجاه
        for pos in positions:
            if (pos.type == mt5.POSITION_TYPE_BUY and decision == "SELL") or \
               (pos.type == mt5.POSITION_TYPE_SELL and decision == "BUY"):
                log(f"Closing position #{pos.ticket} (direction changed)")
                result = close_position(pos)
                if result:
                    log(f"✓ Position closed: #{pos.ticket}")
                    profit = pos.profit
                    msg = f"""
✅ <b>BFX AI Bot — تم الإغلاق</b>

📊 {SYMBOL}
#{pos.ticket} | P&L: ${profit:.2f}
⏰ {datetime.datetime.now().strftime('%H:%M:%S')}
"""
                    send_telegram(msg)
            else:
                # اطبع حالة المركز
                log(f"Position #{pos.ticket} | Type: {'BUY' if pos.type == mt5.POSITION_TYPE_BUY else 'SELL'} | Profit: ${pos.profit:.2f}")
    
    # 6. أرسل تحديث دوري (كل ساعة تقريباً)
    now_min = datetime.datetime.now().minute
    if now_min < 15:
        acc = mt5.account_info()
        msg = f"""
📊 <b>BFX AI Bot — تحديث دوري</b>

💰 الرصيد: ${acc.balance:.2f}
📈 equity: ${acc.equity:.2f}
📊 المراكز: {len(positions)}
🔍 التحليل: {decision} ({confidence}%)
💵 السعر: ${last_price:.2f}
"""
        send_telegram(msg)
    
    # 7. احفظ حالة
    state = {
        "timestamp": datetime.datetime.now().isoformat(),
        "price": last_price,
        "decision": decision,
        "confidence": confidence,
        "bull_signals": bull,
        "bear_signals": bear,
        "open_positions": len(positions),
        "balance": mt5.account_info().balance if mt5.account_info() else 0,
    }
    with open(LOG_DIR / "state.json", "w") as f:
        json.dump(state, f, indent=2)
    
    log(f"State saved. Done.")
    mt5.shutdown()

if __name__ == "__main__":
    main()
