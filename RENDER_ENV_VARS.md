# Environment Variables for Render Dashboard

Copy these EXACT values to your Render Web Service → Environment → Environment Variables:

---

## ✅ REQUIRED (Must set before deploy)

| Key | Value | Notes |
|-----|-------|-------|
| `ENV` | `production` | |
| `CORS_ORIGIN` | `https://ali-qasem-pro.vercel.app` | Must match your Vercel URL exactly |
| `JWT_SECRET_KEY` | `9a647d6c6e1db05a909477e68cf6dc8a2455e6c7fa823023e669e2501ff80e14` | Already in render.yaml - keep this |
| `JWT_ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | |
| `PRICE_REFRESH_SECONDS` | `10` | |
| `PYTHON_VERSION` | `3.11` | |

---

## 🔴 REQUIRED FOR PRODUCTION DATABASE (Set after creating PostgreSQL on Render)

**Step 1:** In Render Dashboard → New → PostgreSQL → Create
- Name: `stockvision-db`
- Database: `stockvision`
- User: `stockvision_user`
- Region: Oregon (same as web service)

**Step 2:** Copy the "External Database URL" from PostgreSQL info page, looks like:
```
postgresql://stockvision_user:password@host.oregon.render.com/stockvision
```

**Step 3:** Add to Environment Variables:
| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://stockvision_user:YOUR_PASSWORD@host.oregon.render.com/stockvision` |

---

## 🔵 REQUIRED FOR MONGODB (News Sentiment feature)

**Step 1:** Create free cluster at https://cloud.mongodb.com
**Step 2:** Create database user and get connection string
**Step 3:** Add to Environment Variables:
| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://your_user:your_password@cluster0.xxxxx.mongodb.net/stockvision?retryWrites=true&w=majority` |

---

## 🟡 OPTIONAL (AI Features)

| Key | Value | Notes |
|-----|-------|-------|
| `NEWSAPI_KEY` | `your_newsapi_org_key` | Get from https://newsapi.org |
| `GROQ_API_KEY` | `your_groq_key` | Get from https://console.groq.com |
| `GEMINI_API_KEY` | `your_gemini_key` | Get from https://aistudio.google.com |
| `OPENAI_API_KEY` | `your_openai_key` | Get from https://platform.openai.com |

---

## ✅ VERCEL ENVIRONMENT VARIABLES

In Vercel Dashboard → Settings → Environment Variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_URL` | `https://stockvision-backend-l5c7.onrender.com/api` | Production |
| `VITE_APP_TITLE` | `StockVision Pro` | Production |

---

## 📋 QUICK CHECKLIST

- [ ] Create PostgreSQL on Render
- [ ] Copy PostgreSQL External URL → `DATABASE_URL`
- [ ] Create MongoDB Atlas cluster
- [ ] Copy MongoDB URI → `MONGODB_URI`
- [ ] Set `CORS_ORIGIN` = your Vercel URL
- [ ] Set `ENV=production`
- [ ] Deploy backend
- [ ] Deploy frontend on Vercel with `VITE_API_URL`
- [ ] Test health endpoint: `https://stockvision-backend-l5c7.onrender.com/health`
- [ ] Test frontend loads and shows "متصل" status