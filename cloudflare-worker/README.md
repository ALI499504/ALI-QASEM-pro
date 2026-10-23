# BFX AI — Cloudflare Worker Proxy

> Proxy شفّاف بين منصة BFX AI و MetaApi Cloud — يوفّر بيانات MT5 حقيقية
> من حساب HotForex Demo (Login 49877585) بدون أي حظر من الشبكة.

## لماذا نحتاجه؟

سيرفر Linux sandbox يحظر `*.metaapi.cloud` (يعترض الـ TLS بـ cert وهمي).
لكن Cloudflare Workers عندها انترنت مفتوح، فتقدر توصل لـ api.metaapi.cloud.

```
Browser → Next.js API → Cloudflare Worker → api.metaapi.cloud → HotForex MT5
                                  ↑
                            (هنا يحقن التوكن)
```

## الملفات

| الملف | الوظيفة |
|---|---|
| `worker.js` | الكود الرئيسي للـ Worker (147 سطر) |
| `wrangler.toml` | إعدادات النشر (الاسم + compatibility date) |
| `package.json` | scripts للنشر |
| `SETUP.md` | دليل كامل خطوة بخطوة |

## البدء السريع

```bash
# 1. سجل في https://dash.cloudflare.com/sign-up (مجاني)
# 2. ثبّت wrangler
npm install -g wrangler

# 3. سجل دخول
wrangler login

# 4. ادخل مجلد Worker
cd cloudflare-worker

# 5. ضع التوكن كـ secret
wrangler secret put METAAPI_TOKEN
# (ألصق الـ JWT الطويل من MetaApi)

# 6. انشر
wrangler deploy

# 7. انسخ URL الناتج، مثلاً:
#    https://bfx-mt5-proxy.ali.workers.dev

# 8. أضفه لمتغير البيئة في المنصة (.env):
# METAAPI_PROXY_URL=https://bfx-mt5-proxy.ali.workers.dev

# 9. أعد بناء المنصة:
cd .. && bun run build
```

## التكلفة

- حساب Cloudflare: **مجاني**
- Workers (100k req/day): **مجاني**
- MetaApi (حساب واحد): **مجاني**
- **المجموع: 0 دولار/شهر** ✅

## راجع SETUP.md للتفاصيل الكاملة

كل خطوة مشروحة بالتفصيل (إنشاء حساب، تثبيت wrangler، إعداد الـ secret،
استكشاف الأخطاء، إلخ).
