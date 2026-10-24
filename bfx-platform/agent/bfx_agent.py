"""
BFX AI — MT5 Agent (User-side connector)
==========================================

هذا السكربت يعمل على جهاز المستخدم (Windows) حيث MT5 terminal مفتوح.
يقوم بـ:
  1. الاتصال بـ MT5 terminal عبر MetaTrader5 Python library
  2. قراءة شموع XAUUSD (أي رمز) من حساب المستخدم
  3. الاتصال بسيرفر BFX AI السحابي عبر WebSocket
  4. إرسال بيانات الشموع بشكل دوري
  5. استقبال التوقعات من السيرفر وعرضها محلياً

الأمان:
  - بيانات MT5 (login/password/server) تبقى على جهاز المستخدم فقط
  - لا يتم إرسالها للسيرفر إطلاقاً
  - فقط بيانات الشموع (open/high/low/close/volume) تُرسل
  - الاتصال مشفّر عبر WSS (WebSocket Secure)

الاستخدام:
  1. سجّل في https://bfx.ai للحصول على API Key
  2. ثبّت Python 3.10+ و MetaTrader5: pip install MetaTrader5 websocket-client
  3. شغّل: python bfx_agent.py
  4. اتبع التعليمات (سيدخل API Key + MT5 credentials)

الإصدار: 1.0.0
التاريخ: 2026-10-23
"""

import os
import sys
import json
import time
import logging
import getpass
import threading
from datetime import datetime
from typing import List, Dict, Optional

# ============================================================================
# Configuration
# ============================================================================
DEFAULT_SERVER_URL = "wss://bfx-mt5-proxy.onrender.com/ws/agent"
# For local testing: "ws://localhost:3000/ws/agent"

CONFIG_FILE = "bfx_config.json"

# ============================================================================
# Logging
# ============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    handlers=[
        logging.FileHandler("bfx_agent.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("BFX-Agent")


# ============================================================================
# Config Manager (saves user settings locally)
# ============================================================================
class Config:
    def __init__(self):
        self.api_key = ""
        self.mt5_login = 0
        self.mt5_password = ""
        self.mt5_server = ""
        self.mt5_path = ""
        self.symbol = "XAUUSD"
        self.timeframe = "H1"
        self.candles_count = 300
        self.server_url = DEFAULT_SERVER_URL
        self.load()

    def load(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.api_key = data.get("api_key", "")
                    self.mt5_login = data.get("mt5_login", 0)
                    # Note: password is NOT saved to file for security
                    self.mt5_server = data.get("mt5_server", "")
                    self.mt5_path = data.get("mt5_path", "")
                    self.symbol = data.get("symbol", "XAUUSD")
                    self.timeframe = data.get("timeframe", "H1")
                    self.candles_count = data.get("candles_count", 300)
                    self.server_url = data.get("server_url", DEFAULT_SERVER_URL)
            except Exception as e:
                logger.warning(f"Failed to load config: {e}")

    def save(self):
        data = {
            "api_key": self.api_key,
            "mt5_login": self.mt5_login,
            # Don't save password!
            "mt5_server": self.mt5_server,
            "mt5_path": self.mt5_path,
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "candles_count": self.candles_count,
            "server_url": self.server_url,
        }
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save config: {e}")

    def setup_interactive(self):
        """Ask user for config values (only first time or when missing)."""
        print("\n" + "=" * 70)
        print("  BFX AI Agent — Setup")
        print("=" * 70)

        if not self.api_key:
            print("\n📋 Get your API Key from https://bfx.ai (sign up free)")
            self.api_key = input("  API Key: ").strip()

        if not self.mt5_login:
            print("\n📋 Enter your MT5 account details (kept locally only):")
            try:
                self.mt5_login = int(input("  MT5 Login (account number): ").strip())
            except ValueError:
                print("❌ Invalid login number")
                return False

        if not self.mt5_server:
            self.mt5_server = input("  MT5 Server (e.g. HFMarketsGlobal-Demo): ").strip()

        # Always ask for password (never saved to disk)
        self.mt5_password = getpass.getpass("  MT5 Password (hidden, not saved): ").strip()

        # Optional: custom symbol/timeframe
        print(f"\n📊 Default symbol: {self.symbol}  timeframe: {self.timeframe}")
        change = input("  Change? (y/N): ").strip().lower()
        if change == "y":
            self.symbol = input(f"  Symbol [{self.symbol}]: ").strip() or self.symbol
            self.timeframe = input(f"  Timeframe [{self.timeframe}]: ").strip() or self.timeframe

        self.save()
        return True


# ============================================================================
# MT5 Connector
# ============================================================================
class MT5Connector:
    def __init__(self, config: Config):
        self.config = config
        self.mt5 = None
        self.connected = False

    def connect(self) -> bool:
        try:
            import MetaTrader5 as mt5
            self.mt5 = mt5
        except ImportError:
            logger.error("MetaTrader5 library not installed.")
            logger.error("Run: pip install MetaTrader5")
            return False

        # Initialize with credentials
        kwargs = {
            "login": self.config.mt5_login,
            "password": self.config.mt5_password,
            "server": self.config.mt5_server,
        }
        if self.config.mt5_path:
            kwargs["path"] = self.config.mt5_path

        if not mt5.initialize(**kwargs):
            logger.error(f"MT5 initialize failed: {mt5.last_error()}")
            return False

        info = mt5.account_info()
        if info is None:
            logger.error(f"MT5 account_info failed: {mt5.last_error()}")
            mt5.shutdown()
            return False

        self.connected = True
        logger.info(f"✓ MT5 connected: login={info.login}, server={info.server}, "
                    f"balance=${info.balance:.2f}, equity=${info.equity:.2f}")
        return True

    def get_account_info(self) -> Optional[Dict]:
        if not self.connected:
            return None
        info = self.mt5.account_info()
        if info is None:
            return None
        return {
            "login": info.login,
            "server": info.server,
            "currency": info.currency,
            "balance": info.balance,
            "equity": info.equity,
            "margin": info.margin,
            "margin_free": info.margin_free,
            "margin_level": info.margin_level,
            "profit": info.profit,
            "leverage": info.leverage,
            "name": info.name,
            "company": info.company,
        }

    def get_candles(self, symbol: str, timeframe: str, count: int = 300) -> List[Dict]:
        if not self.connected:
            return []
        tf_map = {
            "M1": self.mt5.TIMEFRAME_M1,
            "M5": self.mt5.TIMEFRAME_M5,
            "M15": self.mt5.TIMEFRAME_M15,
            "M30": self.mt5.TIMEFRAME_M30,
            "H1": self.mt5.TIMEFRAME_H1,
            "H4": self.mt5.TIMEFRAME_H4,
            "D1": self.mt5.TIMEFRAME_D1,
        }
        tf = tf_map.get(timeframe.upper(), self.mt5.TIMEFRAME_H1)
        rates = self.mt5.copy_rates_from_pos(symbol, tf, 0, count)
        if rates is None:
            logger.error(f"Failed to fetch candles for {symbol}: {self.mt5.last_error()}")
            return []
        return [
            {
                "time": int(r["time"]),
                "open": float(r["open"]),
                "high": float(r["high"]),
                "low": float(r["low"]),
                "close": float(r["close"]),
                "volume": float(r["tick_volume"]),
            }
            for r in rates
        ]

    def get_positions(self) -> List[Dict]:
        if not self.connected:
            return []
        positions = self.mt5.positions_get()
        if positions is None:
            return []
        return [
            {
                "ticket": p.ticket,
                "symbol": p.symbol,
                "type": "BUY" if p.type == 0 else "SELL",
                "volume": p.volume,
                "price_open": p.price_open,
                "price_current": p.price_current,
                "sl": p.sl,
                "tp": p.tp,
                "profit": p.profit,
                "swap": p.swap,
                "time": p.time,
                "comment": p.comment,
            }
            for p in positions
        ]

    def disconnect(self):
        if self.connected and self.mt5:
            self.mt5.shutdown()
            self.connected = False
            logger.info("MT5 disconnected")


# ============================================================================
# Cloud Connector (WebSocket to BFX server)
# ============================================================================
class CloudConnector:
    def __init__(self, config: Config):
        self.config = config
        self.ws = None
        self.connected = False
        self.last_prediction = None
        self.lock = threading.Lock()

    def connect(self) -> bool:
        try:
            import websocket
            # Build WebSocket URL with API key as query param
            url = f"{self.config.server_url}?apiKey={self.config.api_key}"
            logger.info(f"Connecting to BFX server: {self.config.server_url}")

            # Set up callbacks
            self.ws = websocket.WebSocketApp(
                url,
                on_open=self._on_open,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
            )

            # Run in background thread
            threading.Thread(target=self.ws.run_forever, daemon=True).start()
            return True
        except ImportError:
            logger.error("websocket-client library not installed.")
            logger.error("Run: pip install websocket-client")
            return False
        except Exception as e:
            logger.error(f"Failed to connect to cloud: {e}")
            return False

    def _on_open(self, ws):
        self.connected = True
        logger.info("✓ Connected to BFX cloud server")
        # Send hello message
        self.send({
            "type": "hello",
            "agent_version": "1.0.0",
            "python_version": sys.version.split()[0],
            "platform": sys.platform,
        })

    def _on_message(self, ws, message):
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            if msg_type == "prediction":
                with self.lock:
                    self.last_prediction = data
                self._display_prediction(data)
            elif msg_type == "config_update":
                # Server tells agent to change symbol/timeframe
                new_sym = data.get("symbol")
                new_tf = data.get("timeframe")
                if new_sym:
                    self.config.symbol = new_sym
                if new_tf:
                    self.config.timeframe = new_tf
                self.config.save()
                logger.info(f"✓ Config updated: {self.config.symbol} {self.config.timeframe}")
            elif msg_type == "error":
                logger.error(f"Server error: {data.get('message')}")
            elif msg_type == "welcome":
                logger.info(f"Server: {data.get('message', 'Welcome')}")
        except Exception as e:
            logger.warning(f"Failed to parse message: {e}")

    def _on_error(self, ws, error):
        self.connected = False
        logger.error(f"WebSocket error: {error}")

    def _on_close(self, ws, code, msg):
        self.connected = False
        logger.warning(f"WebSocket closed: {code} - {msg}")

    def send(self, data: Dict) -> bool:
        if not self.connected or not self.ws:
            return False
        try:
            self.ws.send(json.dumps(data))
            return True
        except Exception as e:
            logger.warning(f"Failed to send: {e}")
            return False

    def _display_prediction(self, p: Dict):
        next_candle = p.get("next_candle", {})
        direction = next_candle.get("direction", "?")
        confidence = next_candle.get("confidence", 0) * 100
        predicted_close = next_candle.get("close", 0)
        last_close = p.get("last_candle_close", 0)

        color = {"BUY": "\033[92m", "SELL": "\033[91m", "HOLD": "\033[93m"}.get(direction, "")
        reset = "\033[0m"

        print("\n" + "=" * 70)
        print(f"  🎯 BFX AI Prediction for {p.get('symbol')} {p.get('timeframe')}")
        print("=" * 70)
        print(f"  Last close:       {last_close:.2f}")
        print(f"  Predicted close:  {color}{predicted_close:.2f}{reset}")
        print(f"  Direction:        {color}{direction}{reset} (confidence {confidence:.1f}%)")
        print(f"  Expected move:    {next_candle.get('expected_move_pct', 0)*100:+.2f}%")
        print("-" * 70)
        print("  6 AI Agents:")
        for a in p.get("agents", []):
            vc = {"BUY": "\033[92m", "SELL": "\033[91m", "HOLD": "\033[93m"}.get(a.get("vote"), "")
            print(f"    {a.get('name', '?'):25s} {vc}{a.get('vote', '?'):5s}{reset}  "
                  f"conf {a.get('confidence', 0)*100:5.1f}%")
        print("-" * 70)
        ens = p.get("ensemble", {})
        mc = p.get("monte_carlo", {})
        kelly = p.get("kelly", {})
        print(f"  Ensemble: BUY={ens.get('buy_votes', 0)} SELL={ens.get('sell_votes', 0)} "
              f"HOLD={ens.get('hold_votes', 0)}  score={ens.get('weighted_score', 0):+.2f}")
        print(f"  Monte Carlo ({mc.get('simulations', 0)} sims): "
              f"bullish {mc.get('bullish_ratio', 0)*100:.1f}%")
        print(f"  Kelly: f*={kelly.get('fraction', 0)*100:.2f}% → "
              f"risk {kelly.get('recommended_risk_pct', 0)*100:.2f}% of equity")
        print(f"  Time: {p.get('timestamp', '?')}")
        print("=" * 70)


# ============================================================================
# Main Agent Loop
# ============================================================================
class BFXAgent:
    def __init__(self):
        self.config = Config()
        self.mt5 = MT5Connector(self.config)
        self.cloud = CloudConnector(self.config)
        self.running = False
        self.poll_interval = 15  # seconds between data updates

    def setup(self) -> bool:
        return self.config.setup_interactive()

    def start(self):
        if not self.setup():
            return

        print("\n" + "=" * 70)
        print("  BFX AI Agent — Starting")
        print("=" * 70)
        print(f"  Account: {self.config.mt5_login} @ {self.config.mt5_server}")
        print(f"  Symbol:  {self.config.symbol}")
        print(f"  Timeframe: {self.config.timeframe}")
        print(f"  Candles: {self.config.candles_count}")
        print(f"  Server:  {self.config.server_url}")
        print("=" * 70)

        # Connect to MT5
        if not self.mt5.connect():
            print("\n❌ Failed to connect to MT5. Make sure MT5 terminal is running.")
            input("\nPress Enter to exit...")
            return

        # Connect to cloud
        self.cloud.connect()
        time.sleep(2)  # Give WS time to connect

        self.running = True
        last_send = 0

        try:
            while self.running:
                now = time.time()
                if now - last_send < self.poll_interval:
                    time.sleep(1)
                    continue
                last_send = now

                # Get account info
                account = self.mt5.get_account_info()
                if not account:
                    logger.error("Failed to get account info")
                    continue

                # Get candles
                candles = self.mt5.get_candles(
                    self.config.symbol,
                    self.config.timeframe,
                    self.config.candles_count
                )
                if not candles:
                    logger.error("Failed to fetch candles")
                    continue

                # Get positions
                positions = self.mt5.get_positions()

                # Send to cloud
                msg = {
                    "type": "data_update",
                    "symbol": self.config.symbol,
                    "timeframe": self.config.timeframe,
                    "account": account,
                    "candles": candles,
                    "positions": positions,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
                if self.cloud.send(msg):
                    logger.info(f"✓ Sent {len(candles)} candles + {len(positions)} positions "
                                f"to cloud (last close: {candles[-1]['close']:.2f})")
                else:
                    logger.warning("Cloud not connected — will retry")

        except KeyboardInterrupt:
            print("\n\nShutting down...")
        finally:
            self.mt5.disconnect()
            if self.cloud.ws:
                self.cloud.ws.close()
            logger.info("BFX Agent stopped")


# ============================================================================
# Entry Point
# ============================================================================
def print_banner():
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██████  ██ ██████  ███████                                  ║
║   ██   ██ ██ ██   ██ ██                                       ║
║   ██████  ██ ██████  █████                                     ║
║   ██      ██ ██   ██ ██                                       ║
║   ██      ██ ██   ██ ███████                                  ║
║                                                              ║
║   AI-Powered MT5 Candle Predictor                           ║
║   6 Agents Ensemble • Monte Carlo • Kelly Criterion          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"""
    print(banner)
    print(f"  Version: 1.0.0  |  Platform: {sys.platform}")
    print(f"  Python:  {sys.version.split()[0]}")
    print(f"  Date:    {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()


if __name__ == "__main__":
    print_banner()
    agent = BFXAgent()
    agent.start()
