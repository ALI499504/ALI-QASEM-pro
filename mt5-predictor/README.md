# 🎯 BFX AI — MT5 Candle Predictor

> بوت تنبؤ بالشموع المستقبلية حصرياً من MetaTrader 5 — مجاني 100% — يعمل على Windows PC

## 🎯 ماذا يفعل هذا البوت؟

يتصل بـ MT5 terminal على جهازك (Windows)، يقرأ شموع XAUUSD الحقيقية من حسابك،
ثم يستخدم 6 وكلاء ذكاء اصطناعي + Monte Carlo simulation + Kelly Criterion للتنبؤ
بالشمعة التالية (BUY / SELL / HOLD + السعر المتوقع).

**كل البيانات من MT5 حصرية** — لا بديل، لا broker آخر، لا MetaApi مدفوع.

---

## ✅ المتطلبات

1. **Windows PC** (Windows 10/11)
2. **MT5 terminal** مثبت ومفتوح (من أي broker)
3. **Python 3.10+** (مجاني من https://python.org)
4. **حساب MT5** (الأكثر شيوعاً: HotForex, IC Markets, Exness, FXTM)

---

## 📦 التثبيت (10 دقائق)

### الخطوة 1: ثبّت MT5 terminal
- لو لديك MT5 بالفعل → تخطّى هذه الخطوة
- لو لا: حمّل من https://www.metatrader5.com/en/download
- سجل دخول بأي حساب تملكه (مثلاً HotForex Demo)

### الخطوة 2: ثبّت Python
1. اذهب إلى https://python.org/downloads/
2. حمّل Python 3.10+ (أحدث إصدار)
3. عند التثبيت، ✅ فعّل **"Add Python to PATH"** (مهم!)
4. أكمل التثبيت

### الخطوة 3: حمّل ملفات البوت
حمّل ملفات `mt5-predictor/` إلى مجلد على جهازك (مثلاً `C:\BFX-AI\`):

- `mt5_candle_predictor.py` (البوت الرئيسي)
- `requirements.txt`
- `start.bat` (ملف تشغيل سهل)

### الخطوة 4: ثبّت المتطلبات
افتح **Command Prompt** (Start → اكتب `cmd`):

```cmd
cd C:\BFX-AI
pip install MetaTrader5 pandas numpy
```

### الخطوة 5: اضبط إعدادات حسابك
افتح `start.bat` بـ Notepad وعدّل:

```bat
set MT5_LOGIN=49877585
set MT5_PASSWORD=ali636636-A
set MT5_SERVER=HFMarketsGlobal-Demo
set SYMBOL=XAUUSD
set TIMEFRAME=H1
```

> استبدل ببيانات حسابك على أي broker (مثلاً IC Markets Login: 12345678, Server: ICMarketsSC-Demo)

---

## 🚀 التشغيل

### الطريقة الأسهل: انقر مرتين على `start.bat`

أو يدوياً عبر Command Prompt:
```cmd
cd C:\BFX-AI
python mt5_candle_predictor.py
```

### ماذا سترى؟

```
======================================================================
  BFX AI — MT5 Candle Predictor
  Real MT5 data • 6 AI agents • Monte Carlo • Kelly Criterion
======================================================================
  Account: 49877585 @ HFMarketsGlobal-Demo
  Symbol: XAUUSD  Timeframe: H1
======================================================================

2026-10-23 14:30:01 | INFO | ✓ MT5 connected: login=49877585, ...
2026-10-23 14:30:01 | INFO | Fetching 300 H1 candles for XAUUSD...
2026-10-23 14:30:02 | INFO | ✓ Got 300 candles. Last close: 4148.50

======================================================================
  BFX AI — Next Candle Prediction for XAUUSD H1
======================================================================
  Last close: 4148.50
  Predicted close (T+1): 4152.30
  Direction: BUY (confidence 67.5%)
  Expected move: +0.09%
  Predicted range: [4144.20, 4156.40]
----------------------------------------------------------------------
  6 Agents Ensemble:
    Technical Analyst        BUY    conf  62.0%  w=1.00
      → SMA20 4147 > SMA50 4142, RSI 58.3, MACD +
    Pattern Reader           BUY    conf  65.0%  w=0.90
      → Hammer
    Risk Manager             HOLD   conf  45.0%  w=0.70
      → Volatility normal (ATR 0.32%)
    Momentum Scanner         BUY    conf  54.4%  w=1.10
      → ROC 1.44%, W%R -6.4, MFI 100.0
    Support/Resistance       SELL   conf  80.4%  w=0.95
      → Near resistance 4220.00 (dist 95%)
    Master Strategist        BUY    conf  65.0%  w=1.30
      → HTF up 1.98%, BB pos 91%, VWAP 4145
----------------------------------------------------------------------
  Ensemble: BUY=4 SELL=1 HOLD=1  score=+0.42
  Monte Carlo (1000 sims):
    Bullish ratio: 64.3%
    Expected price: 4152.30 (σ=7.34)
    95% CI: [4137.51, 4167.09]
  Kelly Criterion: f*=12.50% → recommended risk 3.13% of equity
  Timestamp: 2026-10-23T14:30:02Z
======================================================================
```

> البوت يحدّث التوقع كل 60 ثانية تلقائياً

---

## 🌐 دعم الحسابات المتعددة

صديقك لديه حسابات متعددة؟ سهل:

### الطريقة 1: ملفات batch متعددة
أنشئ ملفات batch لكل حساب:

**`start-account-1.bat`**:
```bat
set MT5_LOGIN=49877585
set MT5_PASSWORD=pass1
set MT5_SERVER=HFMarketsGlobal-Demo
python mt5_candle_predictor.py
```

**`start-account-2.bat`**:
```bat
set MT5_LOGIN=50123456
set MT5_PASSWORD=pass2
set MT5_SERVER=ICMarketsSC-Demo
python mt5_candle_predictor.py
```

### الطريقة 2: تبديل الحساب يدوياً
عدّل `start.bat` قبل كل تشغيل.

> ⚠️ **مهم**: MT5 terminal يسمح بحساب واحد فقط نشط في نفس الوقت. للتبديل:
> - افتح MT5 terminal
> - File → Login to Trade Account
> - أدخل بيانات الحساب الآخر
> - ثم شغّل البوت

---

## 📱 تنبيهات Telegram (اختياري)

لتحصل على التوقعات على هاتفك:

1. أنشئ bot على Telegram:
   - اذهب إلى https://t.me/BotFather
   - أرسل `/newbot`
   - ستحصل على `BOT_TOKEN`

2. احصل على Chat ID:
   - أضف الـ bot إلى مجموعة أو حدّث له
   - اذهب إلى `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
   - ستجد `chat.id` في الرد

3. عدّل `start.bat`:
```bat
set TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
set TELEGRAM_CHAT_ID=123456789
```

---

## ⚙️ إعدادات متقدمة

### تغيير الرمز
```bat
set SYMBOL=EURUSD
set TIMEFRAME=M15
```

### الرموز المدعومة
أي رمز متوفر في MT5 terminal:
- `XAUUSD` (ذهب)
- `EURUSD`, `GBPUSD`, `USDJPY` (فوركس)
- `BTCUSD`, `ETHUSD` (كريبتو)
- `US30`, `NAS100` (مؤشرات)

### الفترات الزمنية
- `M1` (دقيقة), `M5` (5 دقائق), `M15`, `M30`
- `H1` (ساعة), `H4` (4 ساعات), `D1` (يومي)

### عدد الشموع
```bat
set CANDLES_COUNT=500
```
(الافتراضي: 300 — كلما زاد، كلما كانت التوقعات أدق)

---

## 🔧 استكشاف الأخطاء

### خطأ: "MT5 initialize failed"
- تأكد أن MT5 terminal مفتوح
- تأكد أن بيانات الحساب صحيحة
- جرب تشغيل البوت كمسؤول

### خطأ: "Failed to fetch candles"
- الرمز غير متوفر في حسابك
- تحقق من اسم الرمز في MT5 terminal (Symbols)

### خطأ: "No module named 'MetaTrader5'"
- شغّل: `pip install MetaTrader5`

### خطأ: Python غير معترف به
- أعد تثبيت Python مع تفعيل "Add to PATH"

---

## 📂 الملفات المنتجة

عند التشغيل، البوت ينتج:
- `bfx_predictions.log` — سجل كل التوقعات
- `latest_prediction.json` — آخر توقع بصيغة JSON (للقراءة بـ Python/JS)

---

## 🆓 التكلفة

**0 دولار.** لا حاجة لـ:
- MetaApi cloud (مدفوع)
- VPS (مدفوع)
- API tokens (مدفوع)

فقط Windows PC + Python + MT5 terminal = بوت تنبؤ كامل مجاني للأبد.

---

## 🎯 المميزات

✅ **بيانات MT5 حقيقية حصرية** — لا بديل، لا broker آخر
✅ **6 وكلاء AI** (Technical, Patterns, Risk, Momentum, S/R, Master)
✅ **Monte Carlo simulation** (1000 محاكاة)
✅ **Kelly Criterion** لحجم الصفقة المثالي
✅ **يعمل على أي حساب MT5** (متعدد الحسابات)
✅ **تنبيهات Telegram** اختيارية
✅ **سجل JSON** للقراءة البرمجية
✅ **مجاني 100%** للأبد

---

## 📞 الدعم

لو واجهتك أي مشكلة:
1. تحقق من ملف `bfx_predictions.log` للأخطاء
2. تأكد من MT5 terminal مفتوح ومسجل دخول
3. تأكد من Python وMetaTrader5 مثبتين

---

**صنع بحب لأصدقائي.** — BFX AI Bot
