# M.ROBOT MT5 Bridge — Windows VPS Setup Guide

هاد الدليل الكامل لتثبيت الـ MT5 Bridge على Windows VPS وحصولك على أسعار بروكرك بالضبط (مو من Yahoo أو Binance).

## المتطلبات

1. **Windows VPS** (Windows Server 2016+ أو Windows 10/11)
   - موصى به: Contabo / Vultr / Hetzner / FxVPS (RAM 2GB+)
   - تأكد إنو VPS قريب من بروكرك (أوروبا لو بروكرك أوروبي، آسيا لو آسيوي)

2. **MT5 Terminal مثبت** على الـ VPS
   - نزل من موقع بروكرك
   - سجّل دخول بحسابك (حقيقي أو demo)

3. **Python 3.10+** — https://www.python.org/downloads/
   - أثناء التثبيت، فعّل "Add Python to PATH"

---

## خطوات التثبيت

### 1) انسخ مجلد `mt5-bridge/` إلى الـ Windows VPS

```powershell
# على الـ VPS:
cd C:\
mkdir mrobot-bridge
cd mrobot-bridge
# انسخ ملفات: server.py و requirements.txt
```

### 2) ثبّت الـ dependencies

افتح PowerShell كـ Administrator:

```powershell
cd C:\mrobot-bridge
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3) فعّل MetaTrader5 API في الـ Terminal

افتح MT5 Terminal على الـ VPS، روح على:
```
Tools → Options → Expert Advisors
```
فعّل:
- ☑ **Allow automated trading**
- ☑ **Allow DLL imports**

سجّل دخول بحسابك لو لساتك ما سجلت.

### 4) اعرف بيانات حسابك

افتح MT5 Terminal، من الـ Navigator (لوحة اليسار):
- بعث على حسابك تحت `Accounts`
- بتشوف: `login` (رقم الحساب)، `server` (اسم السيرفر)

مثال: `login: 12345678`, `server: "ICMarkets-Live11"`

### 5) ضع متغيرات البيئة

افتح PowerShell:

```powershell
# ضع هذه المتغيرات (بدّل القيم بحسابك):
setx BRIDGE_API_KEY "your-secret-api-key-make-it-long-and-random"
setx MT5_LOGIN "12345678"
setx MT5_PASSWORD "your-mt5-password"
setx MT5_SERVER "ICMarkets-Live11"
setx BRIDGE_HOST "0.0.0.0"
setx BRIDGE_PORT "8765"
```

أغلق PowerShell وافتحها من جديد (لتطبيق المتغيرات).

### 6) شغّل الـ Bridge

```powershell
cd C:\mrobot-bridge
python server.py
```

بتشوف:
```
============================================================
M.ROBOT MT5 Bridge starting...
Host: 0.0.0.0:8765
MT5 login: 12345678, server: ICMarkets-Live11
============================================================
✓ Connected to MT5: login=12345678, server=ICMarkets-Live11, balance=1000.00 USD
INFO:     Uvicorn running on http://0.0.0.0:8765
```

### 7) اختبر الـ Bridge محلياً

افتح PowerShell ثانية:

```powershell
# اختبار الـ health (مو محمي):
curl http://localhost:8765/health

# اختبار الـ ticker (محمي بـ API key):
curl -H "X-API-Key: your-secret-api-key-make-it-long-and-random" http://localhost:8765/ticker?symbol=XAUUSD

# اختبار الـ candles:
curl -H "X-API-Key: your-secret-api-key-make-it-long-and-random" "http://localhost:8765/candles?symbol=XAUUSD&interval=1h&limit=200"
```

### 8) اعرض الـ Bridge للإنترنت (خيارين)

#### الخيار A: Cloudflare Tunnel (موصى به — مجاني + HTTPS)

```powershell
# نزل cloudflared من: https://github.com/cloudflare/cloudflared/releases/latest
# ضعه في C:\Program Files\cloudflared\

cloudflared tunnel --url http://localhost:8765
```

راح يعطيك URL مثل: `https://random-name-xyz.trycloudflare.com`

#### الخيار B: ngrok (مجاني للاستخدام الشخصي)

```powershell
# نزل ngrok من: https://ngrok.com/download
ngrok http 8765
```

راح يعطيك: `https://abc123.ngrok.io`

### 9) اربط M.ROBOT بالـ Bridge

روح على موقع M.ROBOT (https://mrobot-gold.quilt-estimate.workers.dev/):

1. في لوحة **MT5 Bridge Connection** (تحت الرسم البياني):
2. أدخل:
   - **Bridge URL:** `https://random-name-xyz.trycloudflare.com` (URL اللي حصلت عليه)
   - **API Key:** `your-secret-api-key-make-it-long-and-random`
   - **Symbol:** `XAUUSD` (أو `GOLD` حسب بروكرك)
3. اضغط **Test Connection**
4. لو ظهر ✓ Connected → غيّر **Data Source** إلى `MT5 Bridge`
5. الأسعار والأشكال الشمعية الآن من بروكرك بالضبط!

---

## استكشاف الأخطاء

### المشكلة: `MT5 initialize failed`
- تأكد إنو MT5 Terminal شغّال على الـ VPS
- تأكد من `MT5_LOGIN`, `MT5_PASSWORD`, `MT5_SERVER` صحيحة
- تأكد إنو "Allow automated trading" مفعّلة في الـ Terminal

### المشكلة: `symbol XAUUSD not found`
- بعض البروكرات تستخدم `GOLD` بدل `XAUUSD`
- جرب: `GOLD`, `XAUUSD`, `GOLDUSD`, `XAUSD`
- شوف الـ symbols المتاحة في MT5 Terminal → View → Symbols

### المشكلة: الـ Bridge ما يشتغل تلقائياً بعد restart
استخدم Windows Task Scheduler أو NSSM لعمل service:

```powershell
# تثبيت NSSM:
choco install nssm

# تثبيت الـ bridge كـ Windows service:
nssm install MRobotBridge "C:\Python311\python.exe" "C:\mrobot-bridge\server.py"
nssm set MRobotBridge AppDirectory "C:\mrobot-bridge"
nssm start MRobotBridge
```

### المشكلة: الأسعار لا تتحدث في M.ROBOT
- تأكد إنو Cloudflare Tunnel أو ngrok شغّال
- اختبر من VPS مباشرة: `curl -H "X-API-Key: ..." http://localhost:8765/health`
- اختبر من خارج VPS: `curl -H "X-API-Key: ..." https://your-tunnel-url/health`
- شوف logs: `C:\mrobot-bridge\` على PowerShell

---

## الأمان

1. **API Key**: استخدم 32+ حرف عشوائي (مثال: `mrobot_b1a2c3d4e5f6...`)
2. **Cloudflare Tunnel** يوفر HTTPS تلقائياً — مو محتاج شهادات
3. **MT5 Terminal**: استخدم حساب demo أولاً للاختبار
4. **VPS Firewall**: فعّل Windows Firewall، اسمح فقط port 8765 من Cloudflare

## الصيانة

- راجع logs الـ bridge أسبوعياً
- اعمل restart للـ bridge إذا توقف (NSSM بيعمل ذاك تلقائياً)
- حدّث MetaTrader5 package شهرياً: `pip install --upgrade MetaTrader5`

## ملاحظات مهمة

- الـ bridge يفتح تلقائياً مع MT5 Terminal — لازم MT5 شغّال دائماً
- لو سجّلت خروج من MT5، الـ bridge يفقد الاتصال (سجّل دخول من جديد)
- بعض البروكرات تحظر الـ automated trading — تأكد من شروط بروكرك
- الـ bridge لا يخزن أي بيانات حساسة — الـ password يبقى في env vars فقط
