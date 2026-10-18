@echo off
REM M.ROBOT MT5 Bridge — Windows startup script
REM شغّل هذا الملف بـ double-click أو ضعه في startup folder

cd /d C:\mrobot-bridge

REM تعيين المتغيرات (بدّلها بحسابك)
set BRIDGE_API_KEY=your-secret-api-key-make-it-long
set MT5_LOGIN=12345678
set MT5_PASSWORD=your-mt5-password
set MT5_SERVER=ICMarkets-Live11
set BRIDGE_HOST=0.0.0.0
set BRIDGE_PORT=8765

echo ============================================================
echo M.ROBOT MT5 Bridge starting...
echo Host: %BRIDGE_HOST%:%BRIDGE_PORT%
echo MT5 login: %MT5_LOGIN%, server: %MT5_SERVER%
echo ============================================================

python server.py

pause
