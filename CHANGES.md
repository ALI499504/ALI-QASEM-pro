# Changes Summary: Stock Vision Pro User-Facing Product Extension

This document lists every file created or modified during the user-facing product extension (Authentication, Watchlists, Saved Backtests, Alerts, and Honest Model Confidence Panel).

| File | Status | Description |
| :--- | :---: | :--- |
| `.env.example` | **Created** | Root environment configuration template with `JWT_SECRET_KEY`, token expiration settings, and database variables. |
| `.gitignore` | **Modified** | Added exclusions for local audit files (`AUDIT.md`), walk-forward validation scripts/reports, scratch scripts, and tests. |
| `backend/.env.example` | **Modified** | Backend environment template documenting JWT signing secret, token lifetimes, and database connection. |
| `backend/data/walk_forward_results.json` | **Created** | Pre-computed 36-ticker walk-forward validation benchmark database containing model MAPEs, naive MAPEs, Skill Scores, and Diebold-Mariano statistics. |
| `backend/main.py` | **Modified** | Mounted `auth` and `saved_backtests` routers and upgraded background alert scheduler to evaluate all 5 condition types. |
| `backend/models/database.py` | **Modified** | Added `User`, `RefreshToken`, `Watchlist`, `SavedBacktest` models, and updated `Alert` model with dual modern/legacy column synchronization. |
| `backend/models/schemas.py` | **Modified** | Added Pydantic schemas for Auth, Watchlists, Saved Backtests, Alerts, Model Confidence, Market Status, and strong password validation. |
| `backend/requirements.txt` | **Modified** | Pinned `passlib==1.7.4`, `bcrypt==4.0.1`, and added `pyjwt==2.10.1`, `slowapi==0.1.10`, and `pytest`. |
| `backend/routers/alerts.py` | **Modified** | Implemented user-scoped alert CRUD endpoints and `GET /api/alerts/triggered` for in-app client notification polling. |
| `backend/routers/auth.py` | **Created** | Added `/register`, `/login`, `/refresh`, `/logout`, `/me`, rate limiting (5 req/min), in-memory access token issuance, and `httpOnly` refresh cookies. |
| `backend/routers/forecast.py` | **Modified** | Added `GET /api/forecast/{symbol}/confidence` reading pre-computed walk-forward results and returning calibrated disclosures. |
| `backend/routers/saved_backtests.py` | **Created** | Added user-scoped backtest CRUD endpoints and `POST /api/saved-backtests/{id}/rerun` for live re-execution against fresh market data. |
| `backend/routers/watchlist.py` | **Modified** | Upgraded watchlist endpoints to be user-scoped with live market quotes and backward compatibility. |
| `backend/tests/test_extended_features.py` | **Created** | Automated test suite verifying password validation, auth flows, refresh revocation, watchlists, saved backtests, alerts, and model confidence. |
| `backend/tests/test_market_status.py` | **Created** | Automated test suite verifying 4-state market sessions, holiday closures, 10:09 PM night hours, and API response schema. |
| `frontend/src/api/client.ts` | **Modified** | Rewritten API layer with in-memory token state, Axios 401 automatic silent refresh interceptor, and typed endpoints. |
| `frontend/src/components/AuthModal.tsx` | **Created** | Interactive modal component for user login and registration with real-time password requirements verification. |
| `frontend/src/components/BacktestingStudio.tsx` | **Created** | Full-featured quantitative backtesting laboratory supporting SMA/RSI algorithms, KPI performance cards, trade history logs, and "My Strategies" manager. |
| `frontend/src/components/ForecastStudio.tsx` | **Modified** | Integrated "+ Add to Watchlist" button and the Honest Model Confidence Panel with Skill Score and formal statistical disclosure. |
| `frontend/src/components/MobileBottomNav.tsx` | **Modified** | Updated navigation view types to support Backtesting Studio. |
| `frontend/src/components/MobileHeader.tsx` | **Modified** | Updated header view types and title mappings to support Backtesting Studio. |
| `frontend/src/main.tsx` | **Modified** | Wired in authentication session lifecycle, first-class Watchlist desk, Backtesting Studio navigation, Topbar/sidebar user seat badges, triggered alert notifications, AuthModal, and 4-state animated market indicator. |
| `backend/routers/market.py` | **Modified** | Implemented authoritative `GET /api/market/status` computing 4 market sessions in `America/New_York` timezone, NYSE holiday awareness, and next transition UTC. |
| `frontend/src/utils/marketStatus.ts` | **Modified** | Upgraded to backend polling, local timezone separation, minute-by-minute countdown, session progress calculation, and state transition detection. |
| `frontend/src/styles/globals.css` | **Modified** | Added 4-state badges, heartbeat pulse animation, slower pulse, smooth transition ripple/glow, and toast styles. |
| `frontend/src/data/newsSentimentFallback.ts` | **Created** | Comprehensive offline/curated market news catalysts fallback (20 verified articles, top beneficiaries, and downside risk assets). |
| `backend/services/analysis_service.py` | **Modified** | Expanded backend fallback catalysts to 20 complete items across all 5 sectors with automated beneficiary and downside mapping. |
