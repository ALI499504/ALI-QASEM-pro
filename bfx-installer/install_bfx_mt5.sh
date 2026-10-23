#!/bin/bash
# ============================================================================
#  BFX AI — MT5 Virtual Environment Installer for Kali Linux
# ============================================================================
#  هذا السكريبت يقوم بـ:
#    1. تثبيت VirtualBox + Extension Pack على Kali Linux
#    2. تنزيل Windows 10 ISO من مايكروسوفت
#    3. تنزيل MT5 installer من MetaQuotes
#    4. إنشاء VM بنوع Windows 10 (64-bit) - 4GB RAM - 50GB disk
#    5. تثبيت Windows 10 (يحتاج تدخل المستخدم للنقر Next)
#    6. تثبيت VirtualBox Guest Additions داخل الـ VM
#    7. نسخ MT5 installer + bfx_agent.py + windows-setup.bat إلى الـ VM
#    8. تشغيل windows-setup.bat داخل الـ VM (يثبّت Python + MT5 + يبدأ agent)
#
#  الاستخدام:
#    chmod +x install_bfx_mt5.sh
#    sudo ./install_bfx_mt5.sh
#
#  المتطلبات:
#    - Kali Linux (أو أي Debian-based)
#    - على الأقل 8GB RAM (للجهاز المضيف + VM 4GB)
#    - على الأقل 60GB مساحة قرص حرة
#    - اتصال إنترنت سريع (Windows ISO = 5GB تقريباً)
# ============================================================================

set -e  # Exit on any error

# === Colors for output ===
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'  # No Color

print_header() {
  echo ""
  echo -e "${GREEN}============================================================${NC}"
  echo -e "${GREEN}  $1${NC}"
  echo -e "${GREEN}============================================================${NC}"
}

print_step() {
  echo -e "${BLUE}▶ $1${NC}"
}

print_warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_ok() {
  echo -e "${GREEN}✓ $1${NC}"
}

# ============================================================================
#  CONFIGURATION
# ============================================================================

# Directories
INSTALL_DIR="$HOME/BFX-MT5"
ISO_DIR="$INSTALL_DIR/isos"
VM_DIR="$INSTALL_DIR/vm"
SCRIPTS_DIR="$INSTALL_DIR/scripts"
LOG_FILE="$INSTALL_DIR/install.log"

# VM Configuration
VM_NAME="BFX-Windows10-MT5"
VM_RAM=4096          # 4GB RAM for the VM
VM_VRAM=128          # 128MB video RAM
VM_DISK_SIZE=50000   # 50GB disk (in MB)
VM_CPU_COUNT=2       # 2 CPU cores

# Downloads (Windows 10 ISO from Microsoft official)
WIN10_ISO_URL="https://software.download.prss.microsoft.com/dbazure/888969d5-f34g-4e03-ac9d-3f2d8f9b3c9a/22621.1.220506-1250.ni_release_svc_refresh_CLIENT_LTSC_EVAL_x64FRE_en-us.iso"
WIN10_ISO_FILENAME="Windows_10_LTSC_x64.iso"

# VirtualBox Extension Pack
VBOX_EXT_PACK_URL="https://download.virtualbox.org/virtualbox/7.1.4/Oracle_VirtualBox_Extension_Pack-7.1.4.vbox-extpack"

# MT5 installer (from MetaQuotes)
MT5_INSTALLER_URL="https://download.mql5.com/mt5/x64/mt5setup.exe"
MT5_INSTALLER_FILENAME="mt5setup.exe"

# MT5 Account Credentials (set these before running!)
MT5_LOGIN="${MT5_LOGIN:-49877585}"
MT5_PASSWORD="${MT5_PASSWORD:-ali636636-A}"
MT5_SERVER="${MT5_SERVER:-HFMarketsGlobal-Demo}"

# BFX Server URL (where the agent connects to)
BFX_SERVER_URL="${BFX_SERVER_URL:-wss://bfx-mt5-proxy.onrender.com/ws/agent}"

# ============================================================================
#  PRE-FLIGHT CHECKS
# ============================================================================

print_header "BFX AI — MT5 Virtual Environment Installer"
echo "  Kali Linux + VirtualBox + Windows 10 + MT5 + AI Agent"
echo "  Version: 1.0.0"
echo "  Date: $(date)"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
  print_warn "هذا السكريبت يحتاج صلاحيات root."
  print_warn "شغّله بـ: sudo ./install_bfx_mt5.sh"
  exit 1
fi

# Check Kali/Debian
if [ ! -f /etc/debian_version ]; then
  print_error "هذا السكريبت مخصص لـ Debian/Kali Linux فقط."
  exit 1
fi

# Check RAM
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt "8000" ]; then
  print_warn "الـ RAM لديك: ${TOTAL_RAM}MB"
  print_warn "ينصح بـ 8GB+ على الأقل للجهاز المضيف."
  read -p "هل تريد المتابعة؟ (y/N): " CONTINUE
  [ "$CONTINUE" != "y" ] && exit 0
fi

# Check disk space
DISK_FREE=$(df -m "$HOME" | awk 'NR==2{print $4}')
if [ "$DISK_FREE" -lt "60000" ]; then
  print_error "المساحة الحرة: ${DISK_FREE}MB — تحتاج 60GB على الأقل."
  exit 1
fi
print_ok "المساحة الحرة: ${DISK_FREE}MB"

# Check internet
if ! ping -c 1 -W 3 8.8.8.8 > /dev/null 2>&1; then
  print_error "لا يوجد اتصال بالإنترنت."
  exit 1
fi
print_ok "الاتصال بالإنترنت: OK"

# ============================================================================
#  STEP 1: Create Directories
# ============================================================================

print_header "Step 1: إنشاء المجلدات"
print_step "إنشاء $INSTALL_DIR ..."
mkdir -p "$ISO_DIR" "$VM_DIR" "$SCRIPTS_DIR"
print_ok "المجلدات جاهزة: $INSTALL_DIR"

# ============================================================================
#  STEP 2: Install VirtualBox + Extension Pack
# ============================================================================

print_header "Step 2: تثبيت VirtualBox"

# Update apt + install VirtualBox
print_step "تحديث apt + تثبيت VirtualBox ..."
apt-get update -y >> "$LOG_FILE" 2>&1
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  virtualbox virtualbox-ext-pack virtualbox-dkms \
  linux-headers-$(uname -r) dkms curl wget >> "$LOG_FILE" 2>&1

print_ok "VirtualBox مثبّت"

# Reload kernel modules
print_step "تحميل وحدات kernel ..."
modprobe vboxdrv || true
modprobe vboxnetadp || true
modprobe vboxnetflt || true
systemctl restart virtualbox 2>/dev/null || true

# Add user to vboxusers group
print_step "إضافة المستخدم لمجموعة vboxusers ..."
usermod -aG vboxusers $(logname 2>/dev/null || echo $SUDO_USER)
print_ok "تمت الإضافة (تسجيل خروج ودخول مطلوب)"

# ============================================================================
#  STEP 3: Download Windows 10 ISO
# ============================================================================

print_header "Step 3: تنزيل Windows 10 ISO"

if [ -f "$ISO_DIR/$WIN10_ISO_FILENAME" ]; then
  EXISTING_SIZE=$(stat -c%s "$ISO_DIR/$WIN10_ISO_FILENAME" 2>/dev/null || echo 0)
  if [ "$EXISTING_SIZE" -gt 4000000000 ]; then
    print_ok "ISO موجود بالفعل (${EXISTING_SIZE} bytes) — تخطّي التنزيل"
  else
    print_warn "ISO موجود لكنه غير مكتمل — إعادة التنزيل"
    rm -f "$ISO_DIR/$WIN10_ISO_FILENAME"
  fi
fi

if [ ! -f "$ISO_DIR/$WIN10_ISO_FILENAME" ]; then
  print_step "تنزيل Windows 10 ISO من مايكروسوفت (5GB) ..."
  print_warn "هذا قد يستغرق 10-30 دقيقة حسب سرعة الإنترنت"
  
  cd "$ISO_DIR"
  wget --continue --progress=bar:force "$WIN10_ISO_URL" -O "$WIN10_ISO_FILENAME" 2>&1 | tail -3
  
  if [ ! -f "$WIN10_ISO_FILENAME" ]; then
    print_error "فشل تنزيل Windows ISO"
    print_warn "حمّله يدوياً من: https://www.microsoft.com/software-download/windows10"
    print_warn "وضعه في: $ISO_DIR/$WIN10_ISO_FILENAME"
    exit 1
  fi
  print_ok "تم تنزيل Windows 10 ISO"
fi

# ============================================================================
#  STEP 4: Download MT5 Installer
# ============================================================================

print_header "Step 4: تنزيل MT5 Installer"

if [ ! -f "$SCRIPTS_DIR/$MT5_INSTALLER_FILENAME" ]; then
  print_step "تنزيل MT5 installer من MetaQuotes ..."
  cd "$SCRIPTS_DIR"
  wget --continue --progress=bar:force "$MT5_INSTALLER_URL" -O "$MT5_INSTALLER_FILENAME" 2>&1 | tail -3
  
  if [ ! -f "$MT5_INSTALLER_FILENAME" ]; then
    print_error "فشل تنزيل MT5 installer"
    exit 1
  fi
fi
print_ok "MT5 installer جاهز: $SCRIPTS_DIR/$MT5_INSTALLER_FILENAME"

# ============================================================================
#  STEP 5: Create the Windows VM
# ============================================================================

print_header "Step 5: إنشاء Windows 10 VM"

# Check if VM already exists
if VBoxManage showvminfo "$VM_NAME" > /dev/null 2>&1; then
  print_warn "الـ VM موجود بالفعل — هل تريد حذفه وإعادة إنشائه؟"
  read -p "حذف وإعادة؟ (y/N): " RECREATE
  if [ "$RECREATE" = "y" ]; then
    print_step "إيقاف وحذف الـ VM القديم ..."
    VBoxManage unregistervm "$VM_NAME" --delete 2>/dev/null || true
    rm -f "$VM_DIR/$VM_NAME.vdi"
  else
    print_ok "إعادة استخدام VM موجود"
    SKIP_VM_CREATE=1
  fi
fi

if [ -z "$SKIP_VM_CREATE" ]; then
  print_step "إنشاء VM جديد: $VM_NAME"
  
  # Create the VM
  VBoxManage createvm --name "$VM_NAME" --ostype "Windows10_64" --register
  
  # Set CPU + RAM
  VBoxManage modifyvm "$VM_NAME" --memory "$VM_RAM" --vram "$VM_VRAM" --cpus "$VM_CPU_COUNT"
  
  # Enable IO APIC (required for Windows)
  VBoxManage modifyvm "$VM_NAME" --ioapic on
  
  # Set graphics controller (better display for Windows)
  VBoxManage modifyvm "$VM_NAME" --graphicscontroller vmsvga
  
  # Network: NAT (allows internet + outbound connections)
  VBoxManage modifyvm "$VM_NAME" --nic1 nat --nictype1 82540EM
  
  # Audio: disabled (not needed for trading)
  VBoxManage modifyvm "$VM_NAME" --audio none
  
  # USB: enabled (for file transfer if needed)
  VBoxManage modifyvm "$VM_NAME" --usb on --usbehci on
  
  # Boot order: DVD first, then disk
  VBoxManage modifyvm "$VM_NAME" --boot1 dvd --boot2 disk --boot3 none --boot4 none
  
  # Create SATA controller
  VBoxManage storagectl "$VM_NAME" --name "SATA Controller" --add sata --controller IntelAhci
  
  # Create the virtual disk (50GB)
  print_step "إنشاء قرص افتراضي 50GB ..."
  VBoxManage createmedium disk --filename "$VM_DIR/$VM_NAME.vdi" --size "$VM_DISK_SIZE"
  
  # Attach the disk to the SATA controller
  VBoxManage storageattach "$VM_NAME" --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium "$VM_DIR/$VM_NAME.vdi"
  
  # Attach the Windows ISO (as DVD)
  VBoxManage storageattach "$VM_NAME" --storagectl "SATA Controller" --port 1 --device 0 --type dvddrive --medium "$ISO_DIR/$WIN10_ISO_FILENAME"
  
  # Configure NAT port forwarding (for SSH/RDP if needed later)
  VBoxManage modifyvm "$VM_NAME" --natpf1 "guest_agent,tcp,,8765,,8765"
  
  # Disable time synchronization issues
  VBoxManage setextradata "$VM_NAME" "VBoxInternal/Devices/VMMDev/0/Config/GetHostTimeDisabled" "1"
  
  print_ok "تم إنشاء VM: $VM_NAME"
fi

# ============================================================================
#  STEP 6: Generate the Windows-side setup script (auto-installer)
# ============================================================================

print_header "Step 6: إنشاء windows-setup.bat (يثبّت MT5 + Python + bfx_agent)"

cat > "$SCRIPTS_DIR/windows-setup.bat" << 'WINDOWSBAT'
@echo off
REM ============================================================
REM  BFX AI — Windows-side Auto Installer (run inside VM)
REM  This script:
REM    1. Installs VirtualBox Guest Additions (silent)
REM    2. Installs Python 3.12 (silent)
REM    3. Installs MetaTrader5 library (pip install)
REM    4. Installs websocket-client library
REM    5. Downloads bfx_agent.py from GitHub
REM    6. Configures MT5 to auto-login (via registry)
REM    7. Launches MT5 + bfx_agent.py
REM ============================================================

echo.
echo ============================================================
echo   BFX AI - Windows Auto Installer
echo ============================================================
echo.

REM Configuration (these will be replaced by the Linux script)
set MT5_LOGIN=%MT5_LOGIN%
set MT5_PASSWORD=%MT5_PASSWORD%
set MT5_SERVER=%MT5_SERVER%
set BFX_SERVER_URL=%BFX_SERVER_URL%

REM Check if MT5 is already installed
if exist "C:\Program Files\MetaTrader 5\terminal64.exe" (
    echo [OK] MT5 is already installed
    goto install_python
)

REM Install MT5 silently
echo [STEP] Installing MetaTrader 5 ...
if exist "%~dp0mt5setup.exe" (
    "%~dp0mt5setup.exe" /install /quiet
) else (
    echo [WARN] mt5setup.exe not found, downloading...
    powershell -Command "(New-Object Net.WebClient).DownloadFile('https://download.mql5.com/mt5/x64/mt5setup.exe', 'mt5setup.exe')"
    mt5setup.exe /install /quiet
)

:install_python
echo [STEP] Installing Python 3.12 ...
REM Download Python 3.12 installer
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe', 'python-installer.exe')"
REM Install Python silently with PATH enabled
python-installer.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0

REM Wait for Python install
timeout /t 30 /nobreak

REM Install Python packages
echo [STEP] Installing Python packages: MetaTrader5, websocket-client ...
C:\Program Files\Python312\Scripts\pip.exe install MetaTrader5 websocket-client requests

REM Download bfx_agent.py
echo [STEP] Downloading bfx_agent.py from GitHub...
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://raw.githubusercontent.com/ALI499504/ALI-QASEM-pro/main/bfx-platform/agent/bfx_agent.py', 'bfx_agent.py')"

REM Create auto-launch script
echo [STEP] Creating auto-launch script...
(
echo @echo off
echo cd /d "%~dp0"
echo start "" "C:\Program Files\MetaTrader 5\terminal64.exe"
echo timeout /t 30 /nobreak
echo set MT5_LOGIN=%MT5_LOGIN%
echo set MT5_PASSWORD=%MT5_PASSWORD%
echo set MT5_SERVER=%MT5_SERVER%
echo set BFX_SERVER_URL=%BFX_SERVER_URL%
echo python bfx_agent.py
) > start_bfx.bat

REM Create startup shortcut
echo [STEP] Creating startup shortcut...
copy start_bfx.bat "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp\start_bfx.bat"

echo.
echo ============================================================
echo   Installation Complete!
echo ============================================================
echo.
echo 1. MT5 will auto-launch on next boot
echo 2. bfx_agent.py will start automatically
echo 3. Agent will connect to: %BFX_SERVER_URL%
echo.
echo  First time: Open MT5 manually and login with:
echo    Login: %MT5_LOGIN%
echo    Password: %MT5_PASSWORD%
echo    Server: %MT5_SERVER%
echo.
echo  Save the password in MT5 so it auto-connects next time.
echo.
pause
WINDOWSBAT

# Substitute the variables in the bat file
sed -i "s|%MT5_LOGIN%|$MT5_LOGIN|g" "$SCRIPTS_DIR/windows-setup.bat"
sed -i "s|%MT5_PASSWORD%|$MT5_PASSWORD|g" "$SCRIPTS_DIR/windows-setup.bat"
sed -i "s|%MT5_SERVER%|$MT5_SERVER|g" "$SCRIPTS_DIR/windows-setup.bat"
sed -i "s|%BFX_SERVER_URL%|$BFX_SERVER_URL|g" "$SCRIPTS_DIR/windows-setup.bat"

print_ok "windows-setup.bat جاهز في $SCRIPTS_DIR/"

# ============================================================================
#  STEP 7: Generate bfx_agent.py (the agent that connects to our server)
# ============================================================================

print_header "Step 7: إنشاء bfx_agent.py"

cat > "$SCRIPTS_DIR/bfx_agent.py" << 'AGENTPYTHON'
"""
BFX AI Agent — connects MT5 to our cloud server.
Reads candles from MT5 and sends to cloud via WebSocket.
Receives AI predictions and displays them.
"""
import os
import sys
import json
import time
import logging
from datetime import datetime

# Configuration (set via env vars)
SERVER_URL = os.environ.get("BFX_SERVER_URL", "wss://bfx-mt5-proxy.onrender.com/ws/agent")
API_KEY = os.environ.get("BFX_API_KEY", "default")
MT5_LOGIN = int(os.environ.get("MT5_LOGIN", "0"))
MT5_PASSWORD = os.environ.get("MT5_PASSWORD", "")
MT5_SERVER = os.environ.get("MT5_SERVER", "")
SYMBOL = os.environ.get("SYMBOL", "XAUUSD")
TIMEFRAME = os.environ.get("TIMEFRAME", "H1")
CANDLES_COUNT = int(os.environ.get("CANDLES_COUNT", "300"))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("BFX-Agent")

def connect_mt5():
    """Connect to MT5 terminal using MetaTrader5 Python library."""
    try:
        import MetaTrader5 as mt5
    except ImportError:
        log.error("MetaTrader5 library not installed. Run: pip install MetaTrader5")
        return None
    
    if not mt5.initialize(login=MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER):
        log.error(f"MT5 initialize failed: {mt5.last_error()}")
        return None
    
    info = mt5.account_info()
    if info is None:
        log.error(f"MT5 account_info failed: {mt5.last_error()}")
        mt5.shutdown()
        return None
    
    log.info(f"✓ MT5 connected: login={info.login}, balance=${info.balance:.2f}")
    return mt5

def get_candles(mt5):
    """Fetch candles from MT5 for the configured symbol/timeframe."""
    tf_map = {
        "M1": mt5.TIMEFRAME_M1, "M5": mt5.TIMEFRAME_M5,
        "M15": mt5.TIMEFRAME_M15, "M30": mt5.TIMEFRAME_M30,
        "H1": mt5.TIMEFRAME_H1, "H4": mt5.TIMEFRAME_H4, "D1": mt5.TIMEFRAME_D1,
    }
    tf = tf_map.get(TIMEFRAME.upper(), mt5.TIMEFRAME_H1)
    rates = mt5.copy_rates_from_pos(SYMBOL, tf, 0, CANDLES_COUNT)
    if rates is None:
        return []
    return [
        {"time": int(r["time"]), "open": float(r["open"]),
         "high": float(r["high"]), "low": float(r["low"]),
         "close": float(r["close"]), "volume": float(r["tick_volume"])}
        for r in rates
    ]

def get_account_info(mt5):
    info = mt5.account_info()
    if info is None:
        return None
    return {
        "login": info.login, "server": info.server, "currency": info.currency,
        "balance": info.balance, "equity": info.equity,
        "margin": info.margin, "margin_free": info.margin_free,
        "margin_level": info.margin_level, "profit": info.profit,
        "leverage": info.leverage, "name": info.name, "company": info.company,
    }

def get_positions(mt5):
    positions = mt5.positions_get()
    if positions is None:
        return []
    return [
        {"ticket": p.ticket, "symbol": p.symbol,
         "type": "BUY" if p.type == 0 else "SELL",
         "volume": p.volume, "price_open": p.price_open,
         "price_current": p.price_current, "sl": p.sl, "tp": p.tp,
         "profit": p.profit, "swap": p.swap, "time": p.time,
         "comment": p.comment}
        for p in positions
    ]

def main():
    import websocket
    
    print("\n" + "="*60)
    print("  BFX AI Agent — MT5 → Cloud Connector")
    print("="*60)
    print(f"  Account: {MT5_LOGIN} @ {MT5_SERVER}")
    print(f"  Symbol: {SYMBOL} {TIMEFRAME}")
    print(f"  Server: {SERVER_URL}")
    print("="*60 + "\n")
    
    # Connect MT5
    mt5 = connect_mt5()
    if mt5 is None:
        print("❌ Failed to connect to MT5. Make sure MT5 terminal is running and logged in.")
        input("Press Enter to exit...")
        return
    
    # Connect WebSocket
    url = f"{SERVER_URL}?apiKey={API_KEY}"
    log.info(f"Connecting to: {SERVER_URL}")
    
    ws_connected = [False]
    last_prediction = [None]
    
    def on_open(ws):
        ws_connected[0] = True
        log.info("✓ Connected to BFX cloud server")
        ws.send(json.dumps({"type": "hello", "agent_version": "1.0.0"}))
    
    def on_message(ws, message):
        try:
            data = json.loads(message)
            if data.get("type") == "prediction":
                last_prediction[0] = data
                # Display the prediction
                nc = data.get("next_candle", {})
                d = nc.get("direction", "?")
                c = nc.get("confidence", 0) * 100
                p = nc.get("close", 0)
                last = data.get("last_candle_close", 0)
                color = {"BUY":"\033[92m","SELL":"\033[91m","HOLD":"\033[93m"}.get(d,"")
                reset = "\033[0m"
                print("\n" + "="*60)
                print(f"  🎯 BFX AI Prediction for {data.get('symbol')} {data.get('timeframe')}")
                print("="*60)
                print(f"  Last: {last:.2f}  → Predicted: {color}{p:.2f}{reset}")
                print(f"  Direction: {color}{d}{reset} (conf {c:.1f}%)")
                print(f"  Move: {nc.get('expected_move_pct',0)*100:+.2f}%")
                print("="*60)
            elif data.get("type") == "error":
                log.error(f"Server error: {data.get('message')}")
        except Exception as e:
            log.warning(f"Parse error: {e}")
    
    def on_error(ws, error):
        log.error(f"WebSocket error: {error}")
        ws_connected[0] = False
    
    def on_close(ws, code, msg):
        log.warning(f"WebSocket closed: {code} - {msg}")
        ws_connected[0] = False
    
    ws = websocket.WebSocketApp(
        url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )
    
    # Start WebSocket in background
    import threading
    threading.Thread(target=ws.run_forever, daemon=True).start()
    time.sleep(3)
    
    # Main loop — send data every 15 seconds
    last_send = 0
    while True:
        try:
            now = time.time()
            if now - last_send < 15:
                time.sleep(1)
                continue
            last_send = now
            
            candles = get_candles(mt5)
            if not candles:
                log.error("No candles received from MT5")
                continue
            
            account = get_account_info(mt5)
            positions = get_positions(mt5)
            
            msg = {
                "type": "data_update",
                "symbol": SYMBOL,
                "timeframe": TIMEFRAME,
                "account": account,
                "candles": candles,
                "positions": positions,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
            
            if ws_connected[0]:
                ws.send(json.dumps(msg))
                log.info(f"✓ Sent {len(candles)} candles, last={candles[-1]['close']:.2f}")
            else:
                log.warning("Not connected to cloud — retrying...")
        
        except KeyboardInterrupt:
            print("\n\nShutting down...")
            break
        except Exception as e:
            log.error(f"Error: {e}")
            time.sleep(5)
    
    mt5.shutdown()
    ws.close()

if __name__ == "__main__":
    main()
AGENTPYTHON

print_ok "bfx_agent.py جاهز في $SCRIPTS_DIR/"

# ============================================================================
#  STEP 8: Start the VM and begin Windows installation
# ============================================================================

print_header "Step 8: بدء VM + تثبيت Windows"

print_step "بدء تشغيل الـ VM ..."
VBoxManage startvm "$VM_NAME" --type gui 2>/dev/null || \
  VBoxManage startvm "$VM_NAME" --type headless

print_ok "الـ VM بدأ العمل"
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  الآن سترى نافذة VirtualBox مع Windows setup.${NC}"
echo -e "${YELLOW}${NC}"
echo -e "${YELLOW}  اتبع هذه الخطوات (داخل نافذة الـ VM):${NC}"
echo -e "${YELLOW}${NC}"
echo -e "${YELLOW}  1. اختر: 'Install now'${NC}"
echo -e "${YELLOW}  2. اختر: 'I don't have a product key'${NC}"
echo -e "${YELLOW}  3. اختر: 'Windows 10 Pro'${NC}"
echo -e "${YELLOW}  4. اقبل License terms${NC}"
echo -e "${YELLOW}  5. اختر: 'Custom: Install Windows only'${NC}"
echo -e "${YELLOW}  6. اضغط Next على Disk 0${NC}"
echo -e "${YELLOW}  7. انتظر 15-30 دقيقة حتى ينتهي التثبيت${NC}"
echo -e "${YELLOW}  8. عند الطلب، أنشئ حساب محلي (no Microsoft account)${NC}"
echo -e "${YELLOW}     - Username: bfx${NC}"
echo -e "${YELLOW}     - Password: bfx123${NC}"
echo -e "${YELLOW}  9. بعد اكتمال Windows، انسخ ملفات من:${NC}"
echo -e "${YELLOW}     /home/USER/BFX-MT5/scripts/${NC}"
echo -e "${YELLOW}     إلى: C:\\BFX\\ داخل الـ VM${NC}"
echo -e "${YELLOW} 10. شغّل: C:\\BFX\\windows-setup.bat (كدبل-كليك)${NC}"
echo -e "${YELLOW}${NC}"
echo -e "${YELLOW}  بعد تشغيل windows-setup.bat، سيثبّت:${NC}"
echo -e "${YELLOW}  - Python 3.12${NC}"
echo -e "${YELLOW}  - MetaTrader5 Python library${NC}"
echo -e "${YELLOW}  - websocket-client library${NC}"
echo -e "${YELLOW}  - MT5 terminal (لو لم يثبّت)${NC}"
echo -e "${YELLOW}  - bfx_agent.py${NC}"
echo -e "${YELLOW}  - Auto-launch script${NC}"
echo -e "${YELLOW}${NC}"
echo -e "${YELLOW}  الخطوة الأخيرة:${NC}"
echo -e "${YELLOW}  - افتح MT5 يدوياً${NC}"
echo -e "${YELLOW}  - سجل دخول بحسابك: ${MT5_LOGIN}${NC}"
echo -e "${YELLOW}  - Password: ${MT5_PASSWORD}${NC}"
echo -e "${YELLOW}  - Server: ${MT5_SERVER}${NC}"
echo -e "${YELLOW}  - احفظ الباسوورد (Save password checkbox)${NC}"
echo -e "${YELLOW}${NC}"
echo -e "${YELLOW}  ثم أبلغني لكي أنشر المنصة على سيرفري.${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"

# Save config for reference
cat > "$INSTALL_DIR/config.txt" << CONFIGEOF
BFX AI Installation Summary
============================
VM Name:        $VM_NAME
VM RAM:         ${VM_RAM}MB
VM Disk:        ${VM_DISK_SIZE}MB
VM CPUs:        $VM_CPU_COUNT
VM Dir:         $VM_DIR
Scripts Dir:    $SCRIPTS_DIR
MT5 Login:      $MT5_LOGIN
MT5 Server:     $MT5_SERVER
BFX Server URL: $BFX_SERVER_URL

To start the VM manually:
  VBoxManage startvm "$VM_NAME" --type gui

To stop the VM:
  VBoxManage controlvm "$VM_NAME" savestate

Files in $SCRIPTS_DIR/:
  - windows-setup.bat  (run inside Windows VM)
  - bfx_agent.py       (Python agent)
  - mt5setup.exe       (MT5 installer)
CONFIGEOF

print_ok "Config saved: $INSTALL_DIR/config.txt"
echo ""
print_ok "التنزيل جاهز!"
echo ""
echo -e "${GREEN}بعد إكمال تثبيت Windows + MT5 + تشغيل bfx_agent.py،${NC}"
echo -e "${GREEN}أبلغني وسأنشر المنصة على سيرفري وأعطيك الرابط.${NC}"
