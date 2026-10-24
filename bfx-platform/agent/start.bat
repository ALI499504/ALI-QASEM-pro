@echo off
REM ==========================================
REM BFX AI Agent - MT5 Connector
REM Windows startup script (easy double-click)
REM ==========================================

title BFX AI Agent

echo.
echo ==========================================
echo   BFX AI Agent - MT5 Connector
echo ==========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed!
    echo Please install Python 3.10+ from https://python.org
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

REM Check dependencies
echo Checking dependencies...
python -c "import MetaTrader5" >nul 2>&1
if errorlevel 1 (
    echo Installing MetaTrader5...
    pip install MetaTrader5
)
python -c "import websocket" >nul 2>&1
if errorlevel 1 (
    echo Installing websocket-client...
    pip install websocket-client
)

echo.
echo Starting BFX AI Agent...
echo.
python bfx_agent.py

echo.
echo Agent stopped. Press any key to exit.
pause >nul
