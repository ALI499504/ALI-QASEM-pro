@echo off
REM ==========================================
REM BFX AI - MT5 Candle Predictor
REM Windows startup script
REM ==========================================

REM Configure your MT5 account here:
set MT5_LOGIN=49877585
set MT5_PASSWORD=ali636636-A
set MT5_SERVER=HFMarketsGlobal-Demo

REM Symbol and timeframe
set SYMBOL=XAUUSD
set TIMEFRAME=H1
set CANDLES_COUNT=300

REM Optional: Telegram alerts
REM set TELEGRAM_BOT_TOKEN=your_bot_token
REM set TELEGRAM_CHAT_ID=your_chat_id

REM Optional: Custom MT5 path
REM set MT5_PATH=C:\Program Files\HotForex MetaTrader\terminal64.exe

echo ==========================================
echo   BFX AI - MT5 Candle Predictor
echo ==========================================
echo   Account: %MT5_LOGIN% @ %MT5_SERVER%
echo   Symbol: %SYMBOL%  Timeframe: %TIMEFRAME%
echo ==========================================
echo.

REM Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed!
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

REM Check MetaTrader5 library
python -c "import MetaTrader5" >nul 2>&1
if errorlevel 1 (
    echo Installing MetaTrader5 library...
    pip install MetaTrader5 pandas numpy
)

REM Run the predictor
python mt5_candle_predictor.py

pause
