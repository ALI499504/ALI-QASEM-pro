# BFX AI — Cloudflare Worker Proxy (Setup Guide)

> الهدف: تشغيل MetaApi Cloud (api.metaapi.cloud) من Cloudflare Worker
> لتفادي حظر الشبكة، والحصول على بيانات MT5 حقيقية من HotForex (49877585).

---

## الخطوة 0: المتطلبات المسبقة

- متصفح إنترنت (للتسجيل في Cloudflare)
- التوكن الخاص بـ MetaApi (عندك بالفعل — JWT طويل يبدأ بـ `eyJ...`)
- بيانات حساب HotForex Demo:
  - **Login**: `49877585`
  - **Server**: `HFMarketsGlobal-Demo`
  - **Password**: كلمة المرور بتاعتك في HotForex

---

## الخطوة 1: إنشاء حساب Cloudflare (مجاني 100%)

1. افتح المتصفح واذهب إلى: **https://dash.cloudflare.com/sign-up**
2. اكتب:
   - **Email**: بريدك الإلكتروني
   - **Password**: كلمة مرور قوية
3. اضغط **Create Account**
4. Cloudflare سيرسل لك كود تحقق على الإيميل — أدخله
5. بعد الدخول للوحة التحكم، اكتب اسم أي domain وهمي (مثلاً `bfx-temp.example`) أو اضغط **Skip** على step إضافة domain
6. ✅ الآن لديك حساب Cloudflare مجاني

---

## الخطوة 2: تثبيت wrangler (CLI) على جهازك

`wrangler` هو أداة سطر الأوامر لنشر Workers.

### على Windows:
```powershell
# تثبيت Node.js أولاً من https://nodejs.org (إذا لم يكن مثبتاً)
npm install -g wrangler
```

### على Mac:
```bash
brew install node
npm install -g wrangler
```

### على Linux:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g wrangler
```

تحقق من التثبيت:
```bash
wrangler --version
# يجب أن يطبع: ⛅️ wrangler 3.x.x
```

---

## الخطوة 3: تسجيل الدخول في Cloudflare عبر wrangler

```bash
wrangler login
```

سيفتح المتصفح تلقائياً — اضغط **Allow** على صفحة Cloudflare.

عندما ترى:
```
✅ Successfully logged in.
```

تقدر تكمل.

---

## الخطوة 4: تحميل ملفات Worker

### الطريقة الأسهل: عبر GitHub

1. اذهب إلى repo: https://github.com/ALI499504/ALI-QASEM-pro
2. حمّل المجلد `cloudflare-worker/` الذي يحتوي على:
   - `worker.js` (الكود)
   - `wrangler.toml` (الإعدادات)
   - `package.json`

أو انسخهم يدوياً:

```bash
mkdir bfx-mt5-proxy && cd bfx-mt5-proxy

# انسخ ملف worker.js من المشروع
# انسخ ملف wrangler.toml
# انسخ ملف package.json
```

---

## الخطوة 5: تعديل اسم الـ Worker (اختياري)

افتح `wrangler.toml` وغيّر `name`:

```toml
name = "bfx-mt5-proxy"   # ← غيّره إلى اسم مميز، مثلاً "ali-mt5-proxy"
                          #   سيكون URL: https://ali-mt5-proxy.<subdomain>.workers.dev
main = "worker.js"
compatibility_date = "2024-09-23"
```

---

## الخطوة 6: ضبط الـ Secret — التوكن

من داخل مجلد `cloudflare-worker/`:

```bash
wrangler secret put METAAPI_TOKEN
```

عندما يطلب القيمة، **الصق التوكن كاملاً** (الـ JWT الطويل الذي يبدأ بـ `eyJ...`) ثم Enter.

> ⚠️ **مهم**: لا تضع التوكن في ملف `wrangler.toml` — استخدم `secret put` فقط حتى لا يظهر في Git.

إذا نجحت سترى:
```
✅ Success! Uploaded secret METAAPI_TOKEN
```

---

## الخطوة 7: (اختياري) ضبط حماية CORS

لمنع استخدام الـ Worker من مواقع أخرى:

```bash
wrangler secret put ALLOWED_ORIGIN
# أدخل: https://preview-1.space-z.ai
```

---

## الخطوة 8: نشر الـ Worker

```bash
wrangler deploy
```

عندما ينتهي سترى شيئاً مثل:
```
Published bfx-mt5-proxy (1.23 sec)
  https://bfx-mt5-proxy.<your-subdomain>.workers.dev
```

انسخ هذا الـ URL — ستحتاجه في الخطوة التالية.

---

## الخطوة 9: اختبار الـ Worker

افتح المتصفح أو استخدم curl:

```bash
# اختبر التوكن وقائمة الحسابات
curl https://bfx-mt5-proxy.<your-subdomain>.workers.dev/users/current/accounts

# يجب أن ترى JSON array بحساباتك (أو array فارغ في أول مرة)
```

لو رجع JSON فيه بيانات → الـ Worker شغال 100%! ✅

---

## الخطوة 10: ربط منصة BFX AI بالـ Worker

الآن نخبر المنصة (BFX AI) إنها تستدعي الـ Worker بدل api.metaapi.cloud مباشرة.

### الطريقة 1: عبر متغير بيئة (الأبسط)

في ملف `.env` في جذر المشروع (`/home/z/my-project/.env`):

```env
METAAPI_PROXY_URL=https://bfx-mt5-proxy.<your-subdomain>.workers.dev
MT5_LOGIN=49877585
MT5_SERVER=HFMarketsGlobal-Demo
MT5_PASSWORD=<كلمة مرور HotForex Demo>
```

### الطريقة 2: مباشرة في الكود

عدّل السطر في `/home/z/my-project/src/lib/metaapi-cloud-bridge.ts`:

```ts
const METAAPI_BASE =
  process.env.METAAPI_PROXY_URL ||
  "https://bfx-mt5-proxy.<your-subdomain>.workers.dev";  // ← URL الـ Worker
```

---

## الخطوة 11: إعادة بناء + نشر المنصة

```bash
cd /home/z/my-project
bun run build
# ثم نشر على Cloudflare Pages أو workers.dev كما كنا نفعل
```

---

## الخطوة 12: التحقق من البيانات الحقيقية

بعد نشر المنصة، افتح:
- **/api/mt5/status** → يجب أن يظهر:
  ```json
  {
    "source": "MetaApi Cloud",
    "connectionType": "MetaApi Cloud",
    "account": {
      "login": "49877585",
      "server": "HFMarketsGlobal-Demo",
      "balance": 100000,
      ...
    }
  }
  ```

لو شفت `source: "MetaApi Cloud"` → البيانات الحقيقية flowing! ✅

---

## استكشاف الأخطاء

### المشكلة: `METAAPI_TOKEN secret is not set`
- الحل: شغّل `wrangler secret put METAAPI_TOKEN` وألصق التوكن

### المشكلة: الـ Worker يرجع 401 من MetaApi
- التوكن منتهي الصلاحية. افتح https://app.metaapi.cloud/api-access/generate-token
  وأنشئ توكن جديد، ثم حدّث الـ secret:
  ```bash
  wrangler secret put METAAPI_TOKEN
  ```

### المشكلة: حسابك مش موجود في MetaApi
- أول مرة، الـ bridge يحاول إنشاء الحساب تلقائياً. إذا فشل:
  1. افتح https://app.metaapi.cloud
  2. اذهب إلى Accounts → Add Account
  3. أدخل: Login `49877585`، Password، Server `HFMarketsGlobal-Demo`
  4. انتظر 1-2 دقيقة حتى يصل `DEPLOYED` state
  5. المنصة ستلتقطه تلقائياً

### المشكلة: `account.connection.state = CONNECTING` لفترة طويلة
- عادي — MetaApi يحتاج 1-3 دقائق أول مرة لـ synch مع broker
- الـ status polling كل 15 ثانية سيظهر الحالة عند جاهزيتها

---

## ملخص التكلفة

| الخدمة | التكلفة |
|---|---|
| حساب Cloudflare | مجاني 100% |
| Workers (100k request/day) | مجاني |
| MetaApi (حساب واحد) | مجاني (Free tier) |
| **المجموع** | **0 دولار/شهر** |

عند الحاجة لـ scaling (عند 100k+ طلب/يوم):
- Workers Paid plan: $5/شهر → 10M request/day + 30s CPU/request
- MetaApi Paid: ~$15/شهر لحساب MetaApi Cloud可靠性 عالية

---

## الملفات الموجودة في المشروع

```
/home/z/my-project/cloudflare-worker/
├── worker.js        (الكود الرئيسي للـ Worker)
├── wrangler.toml    (إعدادات النشر)
├── package.json     (scripts للنشر)
└── SETUP.md         (هذا الدليل)

/home/z/my-project/src/lib/metaapi-cloud-bridge.ts
  ↑ تم تحديثه ليدعم METAAPI_PROXY_URL env var
  ↑ إذا لم يضبط، يستخدم api.metaapi.cloud مباشرة (fallback)
```

---

## المسار المختصر (TL;DR)

```bash
# 1. ثبت wrangler
npm install -g wrangler
wrangler login

# 2. انسخ ملفات Worker + ادخل المجلد
cd /home/z/my-project/cloudflare-worker

# 3. ضع التوكن كـ secret
wrangler secret put METAAPI_TOKEN
# (ألصق التوكن الـ JWT الطويل)

# 4. انشر
wrangler deploy
# (انسخ URL الناتج)

# 5. حدّث .env في المنصة:
# METAAPI_PROXY_URL=https://bfx-mt5-proxy.<your-subdomain>.workers.dev

# 6. أعد بناء المنصة + نشرها
cd /home/z/my-project
bun run build
# ثم deploy كما كنا نفعل
```

> ⏱️ المدة المتوقعة: 15-20 دقيقة فقط.
> 💰 التكلفة: 0 دولار.
> 🎯 النتيجة: بيانات MT5 حقيقية حصراً من HotForex (49877585) — 24/7.
