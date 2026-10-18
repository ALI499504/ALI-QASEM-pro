"""
M.ROBOT MT5 Bridge — Windows VPS bridge between MetaTrader 5 terminal and the cloud backend.

Architecture:
  [MT5 Terminal on Windows VPS] ↔ [this Python bridge (FastAPI on :8765)] ↔ [M.ROBOT Next.js backend]

Provides:
  GET  /health          → bridge status + MT5 terminal connection
  GET  /ticker?symbol=XAUUSD  → live ticker (bid/ask/last/high/low/volume)
  GET  /candles?symbol=XAUUSD&interval=1h&limit=200  → historical OHLCV
  POST /order            → send market order to MT5 (BUY/SELL with SL/TP)
  GET  /positions        → list open positions
  POST /close_position   → close position by ticket
  GET  /account          → account balance/equity/free margin

Security:
  All endpoints require X-API-Key header matching BRIDGE_API_KEY env var.
  Bind to 127.0.0.1 only if using Cloudflare Tunnel; bind to 0.0.0.0 if using direct VPS IP + HTTPS.

Setup (Windows VPS):
  1. Install MT5 terminal, log in to your broker account
  2. Install Python 3.10+ (https://python.org)
  3. pip install MetaTrader5 fastapi uvicorn pydantic
  4. Set env vars:
       set BRIDGE_API_KEY=your-secret-key-here
       set MT5_LOGIN=your-mt5-login
       set MT5_PASSWORD=your-mt5-password
       set MT5_SERVER=your-broker-server
       set BRIDGE_HOST=0.0.0.0
       set BRIDGE_PORT=8765
  5. python server.py
  6. (Optional) Use Cloudflare Tunnel or ngrok to expose via HTTPS

Test:
  curl -H "X-API-Key: your-secret-key-here" http://localhost:8765/health
"""

import os
import asyncio
import time
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta

import MetaTrader5 as mt5
from fastapi import FastAPI, Header, HTTPException, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# === Configuration ===
BRIDGE_API_KEY = os.environ.get("BRIDGE_API_KEY", "mrobot-default-key-change-me")
MT5_LOGIN = int(os.environ.get("MT5_LOGIN", "0"))
MT5_PASSWORD = os.environ.get("MT5_PASSWORD", "")
MT5_SERVER = os.environ.get("MT5_SERVER", "")
BRIDGE_HOST = os.environ.get("BRIDGE_HOST", "0.0.0.0")
BRIDGE_PORT = int(os.environ.get("BRIDGE_PORT", "8765"))

# === Logging ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("mt5-bridge")

# === FastAPI app ===
app = FastAPI(
    title="M.ROBOT MT5 Bridge",
    version="1.0.0",
    description="Windows VPS bridge between MetaTrader 5 terminal and M.ROBOT backend",
)

# CORS — allow M.ROBOT backend to call this bridge
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your backend domain in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# === MT5 Connection ===
mt5_connected = False
mt5_account_info: Optional[Dict[str, Any]] = None


def require_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    if x_api_key != BRIDGE_API_KEY:
        raise HTTPException(status_code=401, detail="invalid or missing X-API-Key header")


def connect_mt5():
    """Connect to MT5 terminal using the configured credentials."""
    global mt5_connected, mt5_account_info
    if not MT5_LOGIN or not MT5_PASSWORD or not MT5_SERVER:
        log.error("MT5_LOGIN / MT5_PASSWORD / MT5_SERVER env vars not set")
        return False

    # Initialize MT5 connection
    if not mt5.initialize(login=MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER):
        err = mt5.last_error()
        log.error(f"MT5 initialize failed: {err}")
        mt5_connected = False
        return False

    info = mt5.account_info()
    if info is None:
        log.error("MT5 account_info() returned None — login failed")
        mt5_connected = False
        return False

    mt5_account_info = {
        "login": info.login,
        "name": info.name,
        "server": info.server,
        "currency": info.currency,
        "leverage": info.leverage,
        "balance": info.balance,
        "equity": info.equity,
        "margin": info.margin,
        "margin_free": info.margin_free,
        "margin_level": info.margin_level,
        "profit": info.profit,
    }
    mt5_connected = True
    log.info(f"✓ Connected to MT5: login={info.login}, server={info.server}, balance={info.balance} {info.currency}")
    return True


def ensure_connected() -> bool:
    """Reconnect if needed."""
    global mt5_connected
    if not mt5_connected or mt5.account_info() is None:
        return connect_mt5()
    return True


# === Pydantic models ===
class OrderRequest(BaseModel):
    symbol: str
    side: str  # "BUY" or "SELL"
    volume: float  # lot size
    sl: Optional[float] = None
    tp: Optional[float] = None
    deviation: int = 20
    magic: int = 0
    comment: str = "M.ROBOT Copy"


class ClosePositionRequest(BaseModel):
    ticket: int
    deviation: int = 20


# === Endpoints ===

@app.get("/health")
async def health():
    """Public health endpoint — does NOT require API key."""
    return {
        "status": "ok",
        "bridge": "M.ROBOT MT5 Bridge v1.0",
        "mt5_connected": mt5_connected,
        "mt5_account": mt5_account_info,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/ticker")
async def get_ticker(
    symbol: str = "XAUUSD",
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """Live ticker for a symbol — bid/ask/last/high/low/volume."""
    require_api_key(api_key)
    if not ensure_connected():
        raise HTTPException(503, "MT5 not connected")
    info = mt5.symbol_info_tick(symbol)
    if info is None:
        raise HTTPException(404, f"symbol {symbol} not found")
    return {
        "symbol": symbol,
        "bid": info.bid,
        "ask": info.ask,
        "last": info.last,
        "volume": info.volume,
        "time": info.time,
        "flags": info.flags,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/candles")
async def get_candles(
    symbol: str = "XAUUSD",
    interval: str = "1h",
    limit: int = 200,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """Historical OHLCV candles from MT5."""
    require_api_key(api_key)
    if not ensure_connected():
        raise HTTPException(503, "MT5 not connected")

    # Make sure symbol is selected in Market Watch
    if not mt5.symbol_select(symbol, True):
        raise HTTPException(404, f"cannot select symbol {symbol}")

    # Map interval to MT5 timeframe constant
    timeframe_map = {
        "1m": mt5.TIMEFRAME_M1,
        "5m": mt5.TIMEFRAME_M5,
        "15m": mt5.TIMEFRAME_M15,
        "30m": mt5.TIMEFRAME_M30,
        "1h": mt5.TIMEFRAME_H1,
        "4h": mt5.TIMEFRAME_H4,
        "1d": mt5.TIMEFRAME_D1,
        "1w": mt5.TIMEFRAME_W1,
    }
    tf = timeframe_map.get(interval, mt5.TIMEFRAME_H1)
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, min(max(limit, 1), 1000))
    if rates is None:
        raise HTTPException(404, f"no rates for {symbol} {interval}")

    candles = []
    for r in rates:
        candles.append({
            "time": int(r["time"]),
            "open": float(r["open"]),
            "high": float(r["high"]),
            "low": float(r["low"]),
            "close": float(r["close"]),
            "volume": int(r["tick_volume"]),
        })
    return {
        "symbol": symbol,
        "interval": interval,
        "candles": candles,
        "count": len(candles),
        "source": "MT5",
    }


@app.get("/account")
async def get_account(api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """Account info: balance, equity, margin, etc."""
    require_api_key(api_key)
    if not ensure_connected():
        raise HTTPException(503, "MT5 not connected")
    info = mt5.account_info()
    if info is None:
        raise HTTPException(500, "account_info() returned None")
    return {
        "login": info.login,
        "name": info.name,
        "server": info.server,
        "currency": info.currency,
        "leverage": info.leverage,
        "balance": info.balance,
        "equity": info.equity,
        "margin": info.margin,
        "margin_free": info.margin_free,
        "margin_level": info.margin_level,
        "profit": info.profit,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/positions")
async def get_positions(
    symbol: Optional[str] = None,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """List open positions."""
    require_api_key(api_key)
    if not ensure_connected():
        raise HTTPException(503, "MT5 not connected")
    positions = mt5.positions_get(symbol=symbol) if symbol else mt5.positions_get()
    if positions is None:
        return {"positions": [], "count": 0}
    return {
        "positions": [
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
                "magic": p.magic,
                "comment": p.comment,
            }
            for p in positions
        ],
        "count": len(positions),
    }


@app.post("/order")
async def send_order(
    req: OrderRequest,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """Send a market order to MT5."""
    require_api_key(api_key)
    if not ensure_connected():
        raise HTTPException(503, "MT5 not connected")
    if not mt5.symbol_select(req.symbol, True):
        raise HTTPException(404, f"cannot select symbol {req.symbol}")

    tick = mt5.symbol_info_tick(req.symbol)
    if tick is None:
        raise HTTPException(500, f"no tick for {req.symbol}")

    price = tick.ask if req.side == "BUY" else tick.bid
    order_type = mt5.ORDER_TYPE_BUY if req.side == "BUY" else mt5.ORDER_TYPE_SELL

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": req.symbol,
        "volume": float(req.volume),
        "type": order_type,
        "price": price,
        "sl": float(req.sl) if req.sl else 0.0,
        "tp": float(req.tp) if req.tp else 0.0,
        "deviation": req.deviation,
        "magic": req.magic,
        "comment": req.comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result is None:
        raise HTTPException(500, f"order_send returned None: {mt5.last_error()}")

    return {
        "retcode": result.retcode,
        "deal": result.deal,
        "order": result.order,
        "symbol": result.symbol,
        "price": result.price,
        "volume": result.volume,
        "comment": result.comment,
        "success": result.retcode == mt5.TRADE_RETCODE_DONE,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/close_position")
async def close_position(
    req: ClosePositionRequest,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """Close an open position by ticket."""
    require_api_key(api_key)
    if not ensure_connected():
        raise HTTPException(503, "MT5 not connected")
    positions = mt5.positions_get(ticket=req.ticket)
    if not positions:
        raise HTTPException(404, f"position {req.ticket} not found")
    pos = positions[0]
    tick = mt5.symbol_info_tick(pos.symbol)
    if tick is None:
        raise HTTPException(500, f"no tick for {pos.symbol}")

    is_buy = pos.type == 0  # POSITION_TYPE_BUY
    order_type = mt5.ORDER_TYPE_SELL if is_buy else mt5.ORDER_TYPE_BUY
    price = tick.bid if is_buy else tick.ask

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": pos.symbol,
        "volume": pos.volume,
        "type": order_type,
        "position": pos.ticket,
        "price": price,
        "deviation": req.deviation,
        "magic": pos.magic,
        "comment": f"M.ROBOT close #{pos.ticket}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    result = mt5.order_send(request)
    if result is None:
        raise HTTPException(500, f"order_send returned None: {mt5.last_error()}")
    return {
        "retcode": result.retcode,
        "deal": result.deal,
        "order": result.order,
        "price": result.price,
        "success": result.retcode == mt5.TRADE_RETCODE_DONE,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.on_event("startup")
async def startup():
    log.info("=" * 60)
    log.info("M.ROBOT MT5 Bridge starting...")
    log.info(f"Host: {BRIDGE_HOST}:{BRIDGE_PORT}")
    log.info(f"MT5 login: {MT5_LOGIN}, server: {MT5_SERVER}")
    log.info("=" * 60)
    # Try initial MT5 connection in background
    asyncio.create_task(connect_mt5_async())


async def connect_mt5_async():
    """Async wrapper to connect on startup without blocking."""
    await asyncio.to_thread(connect_mt5)


@app.on_event("shutdown")
async def shutdown():
    log.info("Shutting down MT5 connection...")
    mt5.shutdown()


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=BRIDGE_HOST,
        port=BRIDGE_PORT,
        log_level="info",
    )
