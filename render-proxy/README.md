# BFX AI — MetaApi Proxy on Render.com

> خادم Node.js ي proxie طلبات MetaApi Cloud مع تجاوز قيود SSL.
> ينشر على Render.com مجاناً، ويشغل بيانات MT5 حقيقية من HotForex.

## لماذا Render وليس Cloudflare Worker؟

Cloudflare Workers ترفض `api.metaapi.cloud` بخطأ **526** (SSL verification failure)
ولا يمكن تعطيل هذا التحقق من جانبنا.

Node.js على Render يستخدم `NODE_TLS_REJECT_UNAUTHORIZED=0` لتجاوز أي مشاكل SSL
بالكامل، فيستطيع الوصول لـ MetaApi مباشرة بدون أي حجب.

---

## الخطوة 1: ادفع الكود إلى GitHub

تم تجهيز كل الملفات في `/home/z/my-project/render-proxy/`:
- `server.js` — الكود (200 سطر)
- `package.json` — dependencies

سأرفعها إلى repo بتاعك (`ALI499504/ALI-QASEM-pro`) في مجلد `render-proxy/`.

---

## الخطوة 2: أنشئ حساب Render.com

1. افتح **https://render.com/auth/register** (أو Login لو عندك حساب)
2. اضغط **"Sign up with GitHub"** (الأسهل)
3. صدّق على Render للوصول لـ GitHub

---

## الخطوة 3: أنشئ Web Service جديد

1. اذهب إلى **https://dashboard.render.com**
2. اضغط **"New +"** (أعلى اليمين)
3. اختر **"Web Service"**
4. ابحث عن repo: `ALI499504/ALI-QASEM-pro`
5. اضغط **"Connect"**

---

## الخطوة 4: املأ إعدادات الخدمة

| الحقل | القيمة |
|---|---|
| **Name** | `bfx-mt5-proxy` |
| **Region** | اختار الأقرب (Singapore أو Frankfurt) |
| **Branch** | `main` |
| **Root** | `render-proxy` (مجلد المشروع) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

---

## الخطوة 5: اضبط Environment Variables

اضغط **"Add Environment Variable"** وأضف:

| Key | Value |
|---|---|
| `METAAPI_TOKEN` | (الصق الـ JWT الطويل الذي يبدأ بـ `eyJ...`) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` |
| `ALLOWED_ORIGIN` | `*` (مؤقتاً، سنضيّقه لاحقاً) |

---

## الخطوة 6: انشر الخدمة

اضغط **"Create Web Service"** في الأسفل.

Render سيأخذ 1-2 دقيقة لـ:
- Clone الـ repo
- Run `npm install`
- Start `npm start`

ستظهر الـ URL: `https://bfx-mt5-proxy.onrender.com`

> ⚠️ Free tier على Render "sleeps" بعد 15 دقيقة من عدم الاستخدام. أول طلب
> بعد الاستيقاظ يأخذ ~30 ثانية. لكن المنصة تستدعيه كل 5 ثوانٍ فسيبقى مفعّلاً.

---

## الخطوة 7: اختبر الخدمة

```bash
# Health check
curl https://bfx-mt5-proxy.onrender.com/health
# Expected: {"status":"ok","metaapiTokenConfigured":true,...}

# Test real MetaApi call (list accounts)
curl https://bfx-mt5-proxy.onrender.com/users/current/accounts
# Expected: JSON array of MT5 accounts (or empty array first time)
```

---

## الخطوة 8: حدّث المنصة لاستخدام Render URL

في `/home/z/my-project/.env`:

```env
METAAPI_PROXY_URL=https://bfx-mt5-proxy.onrender.com
MT5_LOGIN=49877585
MT5_SERVER=HFMarketsGlobal-Demo
MT5_PASSWORD=<your_hotforex_demo_password>
```

ثم أعد بناء المنصة:
```bash
cd /home/z/my-project
bun run build
```

---

## التكلفة

| الخدمة | التكلفة |
|---|---|
| Render.com Free tier | **$0/شهر** (sleeps after 15min idle, but our 5s polling keeps it alive) |
| GitHub repo | **$0** |
| MetaApi Cloud (free) | **$0** |
| **المجموع** | **0$/شهر** |

> لو احتجت uptime أعلى: Render Paid = $7/شهر (لا sleeps، 1GB RAM).
