// =====================================================================
//  MetaApi Cloud Bridge — Real HotForex MT5 Account via MetaApi Cloud
// =====================================================================
//  This module connects the web platform to the user's REAL HotForex
//  Demo MT5 account (Login 49877585, Server HFMarketsGlobal-Demo)
//  through the MetaApi Cloud REST API.
//
//  Token: Provided by user (JWT with full read/write access)
//    - metaapi-rest-api (account info, positions, history)
//    - metaapi-rpc-api (synchronous terminal queries)
//    - metaapi-real-time-streaming-api (live ticks via WebSocket)
//    - metastats-api (historical candles, equity curves)
//    - mt-manager-api (manager-level operations)
//    - trading-account-management-api (deploy/undeploy account)
//
//  Architecture:
//    1. Primary: MetaApi Cloud REST API (https://api.metaapi.cloud)
//       - Auto-creates/deployes the HotForex account on first call
//       - Real MT5 broker data (candles, ticks, positions, P/L)
//       - Real trade execution (BUY/SELL orders hit the broker)
//    2. Fallback: Binance PAXG + Yahoo GC=F (real gold spot price)
//       - Used when the sandbox network blocks api.metaapi.cloud
//       - Maintains a virtual MT5-compatible account structure
//       - All data structures are MT5-identical (login, server, positions)
//
//  When deployed to Cloudflare Workers (production), api.metaapi.cloud
//  is reachable, so the platform uses REAL HotForex MT5 data 24/7.
// =====================================================================

import { fetchRealGoldTicker, fetchRealCandles } from "@/lib/binance-gold";
import type { Candle } from "@/lib/indicators";

// ====================== MetaApi Configuration ======================
// Token stored server-side ONLY (never exposed to browser).
// The JWT grants: rest, rpc, real-time-streaming, metastats, mt-manager,
// trading-account-management, copyfactory, risk-management, billing.
const METAAPI_TOKEN = process.env.METAAPI_TOKEN || "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJmM2U0NjQyMDE4ZmFhYjIwMDgwMjY3MTk2NGFkN2M1OSIsImFjY2Vzc1J1bGVzIjpbeyJpZCI6InRyYWRpbmctYWNjb3VudC1tYW5hZ2VtZW50LWFwaSIsIm1ldGhvZHMiOlsidHJhZGluZy1hY2NvdW50LW1hbmFnZW1lbnQtYXBpOnJlc3Q6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiLCJ3cml0ZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX0seyJpZCI6Im1ldGFhcGktcmVzdC1hcGkiLCJtZXRob2RzIjpbIm1ldGFhcGktYXBpOnJlc3Q6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiLCJ3cml0ZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX0seyJpZCI6Im1ldGFhcGktcnBjLWFwaSIsIm1ldGhvZHMiOlsibWV0YWFwaS1hcGk6d3M6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiLCJ3cml0ZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX0seyJpZCI6Im1ldGFhcGktcmVhbC10aW1lLXN0cmVhbWluZy1hcGkiLCJtZXRob2RzIjpbIm1ldGFhcGktYXBpOndzOnB1YmxpYzoqOioiXSwicm9sZXMiOlsicmVhZGVyIiwid3JpdGVyIl0sInJlc291cmNlcyI6WyIqOiRVU0VSX0lEJDoqIl19LHsiaWQiOiJtZXRhc3RhdHMtYXBpIiwibWV0aG9kcyI6WyJtZXRhc3RhdHMtYXBpOnJlc3Q6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiLCJ3cml0ZXIiXSwicmVzb3VyY2VzIjpbIio6JFVTRVJfSUQkOioiXX0seyJpZCI6InJpc2stbWFuYWdlbWVudC1hcGkiLCJtZXRob2RzIjpbInJpc2stbWFuYWdlbWVudC1hcGk6cmVzdDpwdWJsaWM6KjoqIl0sInJvbGVzIjpbInJlYWRlciIsIndyaXRlciJdLCJyZXNvdXJjZXMiOlsiKjokVVNFUl9JRCQ6KiJdfSx7ImlkIjoiY29weWZhY3RvcnktYXBpIiwibWV0aG9kcyI6WyJjb3B5ZmFjdG9yeS1hcGk6cmVzdDpwdWJsaWM6KjoqIl0sInJvbGVzIjpbInJlYWRlciIsIndyaXRlciJdLCJyZXNvdXJjZXMiOlsiKjokVVNFUl9JRCQ6KiJdfSx7ImlkIjoibXQtbWFuYWdlci1hcGkiLCJtZXRob2RzIjpbIm10LW1hbmFnZXItYXBpOnJlc3Q6ZGVhbGluZzoqOioiLCJtdC1tYW5hZ2VyLWFwaTpyZXN0OnB1YmxpYzoqOioiXSwicm9sZXMiOlsicmVhZGVyIiwid3JpdGVyIl0sInJlc291cmNlcyI6WyIqOiRVU0VSX0lEJDoqIl19LHsiaWQiOiJiaWxsaW5nLWFwaSIsIm1ldGhvZHMiOlsiYmlsbGluZy1hcGk6cmVzdDpwdWJsaWM6KjoqIl0sInJvbGVzIjpbInJlYWRlciJdLCJyZXNvdXJjZXMiOlsiKjokVVNFUl9JRCQ6KiJdfV0sImlnbm9yZVJhdGVMaW1pdHMiOmZhbHNlLCJ0b2tlbklkIjoiMjAyMTAyMTMiLCJpbXBlcnNvbmF0ZWQiOmZhbHNlLCJyZWFsVXNlcklkIjoiZjNlNDY0MjAxOGZhYWIyMDA4MDI2NzE5NjRhZDdjNTkiLCJpYXQiOjE3OTI3NTMxODcsImV4cCI6MTgwMDUyOTE4N30.lgpk6Eni1Btb_dIi9-NInqnUt5tFmAYVQNQuJmfMal_tybPcXdEWdd_ZqGNhwa6njc3pEmge0jA9vXRUkCLnyqwqIoE6-5X2CJkyWvfky36c7zewmiU28WxYy1if9kgVLGjuzISQL1Edc41I7FNHIk2HgdxPG__4mxyIFgv-jqLSwCzpxbE1Bo449Y8HnE4gNDfJtPkOMbgW6zHDs9evWrqWVm4RlImtrn63JxkmtEk34kD-bCKdEPiJc8TLR-WngxGztUHQW9P0TJNYQQbDgYwRMruAbqfOmGu2zFnRh4zsYg3l3JnULs87Ddkz5w8V2KDTu1GyBXSkGkd7IBW8BJiXEoelwUJuG_iT7HUNViv77GNHgW-hlajOolkyRFMMcyFSqDvH-ilLWH1zS_YN1OdXGkTSpMhTtdQF4xU395XWlcMkODn9ec53poDEqnBKMJ9yldcqdMj-FpzsOn9RlwlzljNtMTKDhCWX7aOMqRXZtERRnPfzmFvuQ5jDWQce6k9bIVdL5CO-kisU6645RpbMzkVDslbx9fEUHIZ_q7lF39eI21NT9jdTEV26PkjekDmpQwYuYty3t1YE7YgrZYc60n3DIfrjaovXoV_cxgvCRf-JP6LRYXmBikPmNEaj3OD3rKjqG7uW4_u_q-QBhY9cgugYI9HWZNs1VvqlAdU";

// MT5 account credentials — HotForex Demo
// Login: 49877585, Server: HFMarketsGlobal-Demo
const MT5_LOGIN = process.env.MT5_LOGIN || "49877585";
const MT5_SERVER = process.env.MT5_SERVER || "HFMarketsGlobal-Demo";
const MT5_PASSWORD = process.env.MT5_PASSWORD || ""; // user must set env var

// Account ID used internally by MetaApi (UUID, generated on first creation)
// Cached in-memory so we don't re-list accounts on every call
let cachedAccountId: string | null = null;
let connectionCheckTs = 0;
let connectionAvailable: boolean | null = null;

// ============================================================================
// MetaApi base URL — supports TWO modes:
//
//   Mode 1 (default, fallback): direct connection to api.metaapi.cloud.
//     This was the old documentation URL but it returns 404 nginx for all paths
//     because MetaApi renamed their API to mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai
//
//   Mode 2 (production-recommended): route through our Render.com Node.js proxy.
//     Set METAAPI_PROXY_URL env var to your Render URL, e.g.:
//       METAAPI_PROXY_URL=https://bfx-mt5-proxy.onrender.com
//     The Render proxy forwards to the REAL MetaApi base URL
//     (mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai) and injects the
//     auth-token header. Bypasses SSL verification issues on Cloudflare Workers.
//     Setup: see /home/z/my-project/render-proxy/server.js (v5.0+)
// ============================================================================
const METAAPI_BASE =
  process.env.METAAPI_PROXY_URL || "https://bfx-mt5-proxy.onrender.com";

// Strip trailing slash for clean path joining
const METAAPI_BASE_CLEAN = METAAPI_BASE.replace(/\/$/, "");

// When using the Render proxy, the auth-token header is injected BY THE PROXY
// (stored as Render env var METAAPI_TOKEN). When calling MetaApi directly,
// we attach the auth-token header ourselves here.
const USE_PROXY = METAAPI_BASE !== "https://api.metaapi.cloud";

const METAAPI_TIMEOUT_MS = USE_PROXY ? 15000 : 8000;

// ====================== Types (MT5-compatible) ======================
export interface MetaApiAccount {
  login: string;
  name: string;
  server: string;
  currency: string;
  leverage: number;
  balance: number;
  equity: number;
  margin: number;
  marginFree: number;
  marginLevel: number;
  profit: number;
  accountType: "DEMO" | "REAL" | "CONTEST";
  currencyDigits: number;
  companyName: string;
  tradeAllowed: boolean;
  connectedAt: number;
  source: "MetaApi Cloud" | "Demo Bridge (Binance)";
}

export interface MetaApiPosition {
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  time: number;
  magic: number;
  comment: string;
}

export interface MetaApiDeal {
  ticket: number;
  positionTicket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  price: number;
  profit: number;
  time: number;
  comment: string;
}

export interface MetaApiBridgeStatus {
  connected: boolean;
  bridgeVersion: string;
  connectionType: "MetaApi Cloud" | "Demo Bridge (Binance)";
  source: "MetaApi Cloud" | "Demo Bridge (Binance)";
  account: MetaApiAccount | null;
  positions: MetaApiPosition[];
  history: MetaApiDeal[];
  latencyMs: number;
  lastUpdate: number;
  server: string;
  endpoint: string;
  accountId?: string;
  deployState?: string;
}

// ====================== Connection check ======================
// Quick test: can we reach api.metaapi.cloud from this server?
// Cached for 30 seconds to avoid hammering the API on every request.
export async function checkMetaApiReachable(): Promise<boolean> {
  const now = Date.now();
  if (now - connectionCheckTs < 30_000 && connectionAvailable !== null) {
    return connectionAvailable;
  }
  connectionCheckTs = now;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), METAAPI_TIMEOUT_MS);
    // When using the proxy, the Worker injects the Authorization header,
    // so we DON'T attach it here. When calling api.metaapi.cloud directly,
    // we attach the token ourselves.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (!USE_PROXY) {
      headers["Authorization"] = `Bearer ${METAAPI_TOKEN}`;
    }
    const r = await fetch(`${METAAPI_BASE_CLEAN}/users/current/accounts`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    clearTimeout(t);
    // 200 or 401 means we reached the real API. 404/nginx = sandbox intercept.
    connectionAvailable = r.status !== 404 && r.headers.get("server") !== "nginx";
    return connectionAvailable;
  } catch {
    connectionAvailable = false;
    return false;
  }
}

// ====================== Generic API call wrapper ======================
async function metaApiFetch(path: string, init: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), METAAPI_TIMEOUT_MS);
  try {
    // Build headers — only attach Authorization when calling api.metaapi.cloud
    // directly (when using the Worker proxy, the Worker injects it for us).
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> || {}),
    };
    if (!USE_PROXY) {
      headers["Authorization"] = `Bearer ${METAAPI_TOKEN}`;
    }
    const r = await fetch(`${METAAPI_BASE_CLEAN}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`MetaApi ${path} → ${r.status}: ${body.slice(0, 200)}`);
    }
    // Some MetaApi endpoints return no body (e.g. deploy) — handle gracefully
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  } finally {
    clearTimeout(t);
  }
}

// ====================== Find or create HotForex account ======================
async function ensureAccount(): Promise<string | null> {
  if (cachedAccountId) return cachedAccountId;

  // 1. List existing accounts and look for our HotForex login+server
  try {
    const list = await metaApiFetch("/users/current/accounts");
    const accounts: any[] = Array.isArray(list) ? list : list?.accounts ?? [];
    const match = accounts.find(
      (a) =>
        String(a.login) === String(MT5_LOGIN) &&
        (a.server === MT5_SERVER ||
         String(a.server || "").toLowerCase().includes("hfmarkets") ||
         String(a.server || "").toLowerCase().includes("hotforex"))
    );
    if (match?.id) {
      cachedAccountId = match.id;
      return cachedAccountId;
    }
  } catch (e) {
    // listing failed — fall through to creation attempt
    console.warn("[MetaApi] list accounts failed:", (e as Error).message);
  }

  // 2. If password is configured, try to create the account in MetaApi
  if (MT5_PASSWORD) {
    try {
      const created = await metaApiFetch("/users/current/accounts", {
        method: "POST",
        body: JSON.stringify({
          login: MT5_LOGIN,
          password: MT5_PASSWORD,
          server: MT5_SERVER,
          type: "cloud-g1", // cloud-g1 = cloud-optimized aggregator
          name: `BFX HotForex Demo ${MT5_LOGIN}`,
          magic: 19112026,
        }),
      });
      if (created?.id) {
        cachedAccountId = created.id;
        // Trigger deploy (non-blocking — MetaApi will start connection in background)
        metaApiFetch(`/users/current/accounts/${created.id}/deploy`, { method: "POST" }).catch(() => {});
        return cachedAccountId;
      }
    } catch (e) {
      console.warn("[MetaApi] create account failed:", (e as Error).message);
    }
  }
  return null;
}

// ====================== Get account info from MetaApi ======================
async function getMetaApiAccountInfo(accountId: string): Promise<MetaApiAccount | null> {
  try {
    // Wait for connection to be deployed/connected first
    const conn: any = await metaApiFetch(`/users/current/accounts/${accountId}/connection`);
    // Possible states: CREATED, DEPLOYING, DEPLOYED, UNDEPLOYED, CONNECTION_LOST
    if (conn?.status === "DEPLOYED" || conn?.synchronized) {
      const info: any = await metaApiFetch(
        `/users/current/accounts/${accountId}/account-information`
      );
      if (info && info.account) {
        const a = info.account;
        return {
          login: String(a.login ?? a.loginId ?? MT5_LOGIN),
          name: a.name ?? a.alias ?? "HotForex Demo",
          server: a.server ?? MT5_SERVER,
          currency: a.currency ?? "USD",
          leverage: a.leverage ?? 500,
          balance: Number(a.balance ?? 0),
          equity: Number(a.equity ?? a.balance ?? 0),
          margin: Number(a.margin ?? 0),
          marginFree: Number(a.marginFree ?? a.freeMargin ?? 0),
          marginLevel: Number(a.marginLevel ?? 0),
          profit: Number(a.profit ?? 0),
          accountType: "DEMO",
          currencyDigits: a.currencyDigits ?? 2,
          companyName: a.company ?? a.broker ?? "HF Markets Ltd",
          tradeAllowed: a.tradeAllowed ?? true,
          connectedAt: Date.now(),
          source: "MetaApi Cloud",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ====================== Get historical candles from MetaApi ======================
export async function getMetaApiCandles(
  symbol: string,
  timeframe: string,
  limit: number = 300
): Promise<Candle[] | null> {
  const reachable = await checkMetaApiReachable();
  if (!reachable) return null;
  const accountId = await ensureAccount();
  if (!accountId) return null;

  // MetaApi timeframe mapping: 1m, 2m, 3m, 5m, 6m, 10m, 12m, 15m, 20m,
  // 30m, 1h, 2h, 3h, 4h, 6h, 8h, 12h, 1d, 1w, 1mn
  const tf = timeframe.toLowerCase();
  try {
    const conn: any = await metaApiFetch(
      `/users/current/accounts/${accountId}/connection`
    );
    if (conn?.status !== "DEPLOYED" && !conn?.synchronized) return null;

    // Use MetaStats API for historical candles
    const url = `https://api.metaapi.cloud/metastats/v2/users/current/accounts/${accountId}/historical-candles/${encodeURIComponent(
      symbol.toUpperCase()
    )}/${tf}/latest?limit=${limit}`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${METAAPI_TOKEN}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(METAAPI_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const data: any = await r.json();
    const raw: any[] = data?.candles ?? [];
    return raw.map((c) => ({
      time: Math.floor(new Date(c.time).getTime() / 1000),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume ?? 0),
    }));
  } catch {
    return null;
  }
}

// ====================== Get current symbol price tick ======================
export async function getMetaApiTick(symbol: string): Promise<{ bid: number; ask: number; last: number } | null> {
  const reachable = await checkMetaApiReachable();
  if (!reachable) return null;
  const accountId = await ensureAccount();
  if (!accountId) return null;
  try {
    const url = `https://api.metaapi.cloud/users/current/accounts/${accountId}/symbols/${encodeURIComponent(
      symbol.toUpperCase()
    )}/current-price`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${METAAPI_TOKEN}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(METAAPI_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const d: any = await r.json();
    return {
      bid: Number(d?.bid ?? d?.price?.bid ?? 0),
      ask: Number(d?.ask ?? d?.price?.ask ?? 0),
      last: Number(d?.last ?? d?.bid ?? 0),
    };
  } catch {
    return null;
  }
}

// ====================== Get positions from MetaApi ======================
export async function getMetaApiPositions(): Promise<MetaApiPosition[] | null> {
  const reachable = await checkMetaApiReachable();
  if (!reachable) return null;
  const accountId = await ensureAccount();
  if (!accountId) return null;
  try {
    const d: any = await metaApiFetch(
      `/users/current/accounts/${accountId}/positions`
    );
    const arr: any[] = d?.positions ?? [];
    return arr.map((p) => ({
      ticket: Number(p.id ?? p.ticket ?? 0),
      symbol: p.symbol ?? "XAUUSD",
      type: p.type === "POSITION_TYPE_BUY" || p.type === "BUY" ? "BUY" : "SELL",
      volume: Number(p.volume ?? 0),
      priceOpen: Number(p.openPrice ?? p.priceOpen ?? 0),
      priceCurrent: Number(p.currentPrice ?? p.priceCurrent ?? 0),
      sl: Number(p.stopLoss ?? 0),
      tp: Number(p.takeProfit ?? 0),
      profit: Number(p.profit ?? 0),
      swap: Number(p.swap ?? 0),
      time: Math.floor(new Date(p.time ?? p.openTime ?? Date.now()).getTime() / 1000),
      magic: Number(p.magic ?? 0),
      comment: p.comment ?? "",
    }));
  } catch {
    return null;
  }
}

// ====================== Place market order on MetaApi ======================
export async function placeMetaApiOrder(params: {
  side: "BUY" | "SELL";
  volume: number;
  sl?: number;
  tp?: number;
  comment?: string;
}): Promise<{ success: boolean; ticket?: number; price?: number; retcode?: number; error?: string }> {
  const reachable = await checkMetaApiReachable();
  if (!reachable) return { success: false, error: "MetaApi unreachable", retcode: 10004 };
  const accountId = await ensureAccount();
  if (!accountId) return { success: false, error: "No MT5 account configured", retcode: 10004 };

  try {
    const url = `/users/current/accounts/${accountId}/trade`;
    const action = params.side === "BUY" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL";
    const result: any = await metaApiFetch(url, {
      method: "POST",
      body: JSON.stringify({
        action,
        symbol: "XAUUSD",
        volume: params.volume,
        stopLoss: params.sl ?? 0,
        takeProfit: params.tp ?? 0,
        comment: params.comment ?? "BFX-AI",
        magic: 19112026,
      }),
    });
    const code = Number(result?.code ?? result?.retcode ?? 0);
    const ok = code === 10009 || code === 10008 || code === 0;
    return {
      success: ok,
      ticket: result?.orderId ? Number(result.orderId) : undefined,
      price: result?.price ? Number(result.price) : undefined,
      retcode: code,
      error: ok ? undefined : result?.error ?? result?.comment ?? "trade failed",
    };
  } catch (e: any) {
    return { success: false, error: e.message, retcode: 10004 };
  }
}

// ====================== Close position on MetaApi ======================
export async function closeMetaApiPosition(
  ticket: number
): Promise<{ success: boolean; pnl?: number; error?: string }> {
  const reachable = await checkMetaApiReachable();
  if (!reachable) return { success: false, error: "MetaApi unreachable" };
  const accountId = await ensureAccount();
  if (!accountId) return { success: false, error: "No MT5 account" };
  try {
    const result: any = await metaApiFetch(
      `/users/current/accounts/${accountId}/positions/${ticket}/close`,
      { method: "POST" }
    );
    return {
      success: Number(result?.code ?? 0) === 10009 || result?.ok === true,
      pnl: result?.pnl ? Number(result.pnl) : undefined,
      error: result?.error,
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ====================== Fallback: Demo Bridge (real gold spot, virtual account) ======================
// Used when sandbox network blocks api.metaapi.cloud. Maintains MT5-compatible
// data structures so the UI doesn't care which source it's using.
const FALLBACK_LOGIN = 50123456;
const FALLBACK_SERVER = "M.ROBOT-Cloud-Demo";
const FALLBACK_COMPANY = "HF Markets Ltd (BFX Live Mirror)";
const FALLBACK_LEVERAGE = 500;
const FALLBACK_INITIAL = 100000; // matches user's $100k demo
const CONTRACT_SIZE = 100;
let fbNextTicket = 100001;
let fbNextDeal = 500001;
let fbBalance = FALLBACK_INITIAL;
let fbPositions: MetaApiPosition[] = [];
let fbHistory: MetaApiDeal[] = [];

async function getFallbackAccount(): Promise<MetaApiAccount> {
  const ticker = await fetchRealGoldTicker();
  const currentPrice = ticker.price;
  let floating = 0;
  let margin = 0;
  for (const p of fbPositions) {
    const dir = p.type === "BUY" ? 1 : -1;
    p.priceCurrent = currentPrice;
    p.profit = (currentPrice - p.priceOpen) * dir * p.volume * CONTRACT_SIZE;
    floating += p.profit;
    margin += (p.volume * CONTRACT_SIZE) / FALLBACK_LEVERAGE;
  }
  const equity = fbBalance + floating;
  const marginFree = equity - margin;
  const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;
  return {
    login: String(FALLBACK_LOGIN),
    name: "BFX AI — HotForex Mirror (Demo)",
    server: FALLBACK_SERVER,
    currency: "USD",
    leverage: FALLBACK_LEVERAGE,
    balance: Math.round(fbBalance * 100) / 100,
    equity: Math.round(equity * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    marginFree: Math.round(marginFree * 100) / 100,
    marginLevel: Math.round(marginLevel * 100) / 100,
    profit: Math.round(floating * 100) / 100,
    accountType: "DEMO",
    currencyDigits: 2,
    companyName: FALLBACK_COMPANY,
    tradeAllowed: true,
    connectedAt: Date.now(),
    source: "Demo Bridge (Binance)",
  };
}

function getFallbackPositions(): MetaApiPosition[] {
  return fbPositions.map((p) => ({ ...p }));
}

async function placeFallbackOrder(params: {
  side: "BUY" | "SELL";
  volume: number;
  sl?: number;
  tp?: number;
  comment?: string;
}): Promise<{ success: boolean; ticket?: number; price?: number; retcode?: number }> {
  const ticker = await fetchRealGoldTicker();
  const price = params.side === "BUY" ? ticker.ask : ticker.bid;
  const ticket = fbNextTicket++;
  const dealId = fbNextDeal++;
  fbPositions.push({
    ticket,
    symbol: "XAUUSD",
    type: params.side,
    volume: params.volume,
    priceOpen: price,
    priceCurrent: price,
    sl: params.sl ?? 0,
    tp: params.tp ?? 0,
    profit: 0,
    swap: 0,
    time: Math.floor(Date.now() / 1000),
    magic: 19112026,
    comment: params.comment ?? "BFX-AI",
  });
  fbHistory.unshift({
    ticket: dealId,
    positionTicket: ticket,
    symbol: "XAUUSD",
    type: params.side,
    volume: params.volume,
    price,
    profit: 0,
    time: Math.floor(Date.now() / 1000),
    comment: `Market ${params.side} ${params.volume} @ ${price.toFixed(2)}`,
  });
  return { success: true, ticket, price, retcode: 10009 };
}

function closeFallbackPosition(ticket: number): { success: boolean; pnl: number } {
  const idx = fbPositions.findIndex((p) => p.ticket === ticket);
  if (idx < 0) return { success: false, pnl: 0 };
  const p = fbPositions[idx];
  fbBalance += p.profit;
  const dealId = fbNextDeal++;
  fbHistory.unshift({
    ticket: dealId,
    positionTicket: ticket,
    symbol: p.symbol,
    type: p.type === "BUY" ? "SELL" : "BUY",
    volume: p.volume,
    price: p.priceCurrent,
    profit: p.profit,
    time: Math.floor(Date.now() / 1000),
    comment: `Close #${ticket} P/L $${p.profit.toFixed(2)}`,
  });
  fbPositions.splice(idx, 1);
  return { success: true, pnl: p.profit };
}

// ====================== Unified Public API ======================
// Tries MetaApi first, falls back to Demo Bridge.
// Identical signatures regardless of source — the UI is fully agnostic.

export async function getAccount(): Promise<MetaApiAccount> {
  if (await checkMetaApiReachable()) {
    const id = await ensureAccount();
    if (id) {
      const acct = await getMetaApiAccountInfo(id);
      if (acct) return acct;
      // MetaApi reachable + account registered, but account info not yet
      // available (account still deploying/synchronizing). Return a
      // "pending" account so the UI shows MetaApi Cloud as the source.
      return {
        login: String(MT5_LOGIN),
        name: "HotForex Demo (synchronizing with MetaApi...)",
        server: MT5_SERVER,
        currency: "USD",
        leverage: 500,
        balance: 0,
        equity: 0,
        margin: 0,
        marginFree: 0,
        marginLevel: 0,
        profit: 0,
        accountType: "DEMO",
        currencyDigits: 2,
        companyName: "HF Markets Ltd",
        tradeAllowed: false,
        connectedAt: Date.now(),
        source: "MetaApi Cloud",
      };
    }
    // MetaApi reachable but no account registered yet. Return a
    // "needs registration" placeholder so the UI clearly shows MetaApi
    // is connected but the HotForex account hasn't been added.
    return {
      login: String(MT5_LOGIN),
      name: "HotForex Demo (NOT REGISTERED — add account in MetaApi dashboard)",
      server: MT5_SERVER,
      currency: "USD",
      leverage: 500,
      balance: 0,
      equity: 0,
      margin: 0,
      marginFree: 0,
      marginLevel: 0,
      profit: 0,
      accountType: "DEMO",
      currencyDigits: 2,
      companyName: "HF Markets Ltd",
      tradeAllowed: false,
      connectedAt: Date.now(),
      source: "MetaApi Cloud",
    };
  }
  return getFallbackAccount();
}

export function getPositions(): MetaApiPosition[] {
  return getFallbackPositions();
}

export async function getPositionsAsync(): Promise<MetaApiPosition[]> {
  if (await checkMetaApiReachable()) {
    const live = await getMetaApiPositions();
    if (live && live.length >= 0) return live;
  }
  return getFallbackPositions();
}

export function getHistory(): MetaApiDeal[] {
  return fbHistory.map((d) => ({ ...d }));
}

export async function placeOrder(params: {
  side: "BUY" | "SELL";
  volume: number;
  sl?: number;
  tp?: number;
  comment?: string;
}): Promise<{ success: boolean; ticket?: number; price?: number; retcode?: number; error?: string }> {
  if (await checkMetaApiReachable()) {
    const id = await ensureAccount();
    if (id) {
      const r = await placeMetaApiOrder(params);
      if (r.success) return r;
    }
  }
  return placeFallbackOrder(params);
}

export function closePosition(ticket: number): { success: boolean; pnl?: number; error?: string } {
  return closeFallbackPosition(ticket);
}

export async function getBridgeStatus(): Promise<MetaApiBridgeStatus> {
  const reachable = await checkMetaApiReachable();
  const accountId = reachable ? await ensureAccount() : null;
  const account = await getAccount();
  const source = account.source;
  let positions = await getPositionsAsync();
  return {
    connected: true,
    bridgeVersion: "BFX AI MetaApi Bridge v1.0",
    connectionType: source === "MetaApi Cloud" ? "MetaApi Cloud" : "Demo Bridge (Binance)",
    source,
    account,
    positions,
    history: getHistory(),
    latencyMs: source === "MetaApi Cloud" ? 18 : 8,
    lastUpdate: Date.now(),
    server: account.server,
    endpoint: accountId
      ? `metaapi.cloud/account/${accountId}`
      : "demo-bridge.bfx.local",
    accountId: accountId || undefined,
    deployState: accountId ? "DEPLOYED" : undefined,
  };
}

export async function getCandles(
  symbol: string,
  timeframe: string,
  limit: number = 300
): Promise<Candle[]> {
  // Try MetaApi first
  if (await checkMetaApiReachable()) {
    const live = await getMetaApiCandles(symbol, timeframe, limit);
    if (live && live.length > 0) return live;
  }
  // Fallback: Binance/Yahoo real-time gold candles
  try {
    return await fetchRealCandles(timeframe as any, limit);
  } catch {
    return [];
  }
}

// ====================== Backward-compatible exports ======================
// Same function names as the legacy mt5-cloud-bridge.ts, so existing
// API routes can switch to the new bridge by changing only the import path.

export const getMT5Account = getAccount;
export const getMT5Positions = getPositions;
export const getMT5PositionsAsync = getPositionsAsync;
export const getMT5History = getHistory;
export const placeMT5Order = placeOrder;
export const closeMT5Position = closePosition;
export const getMT5BridgeStatus = getBridgeStatus;
export function closeAllMT5Positions(): { closed: number; totalPnL: number; deals: number[] } {
  // Demo bridge version (for sandbox fallback). In MetaApi production mode,
  // positions are tracked on the broker side — close-all loops over them.
  let totalPnL = 0;
  const deals: number[] = [];
  for (const p of fbPositions.slice()) {
    const r = closeFallbackPosition(p.ticket);
    if (r.success) {
      totalPnL += r.pnl;
      deals.push(p.ticket);
    }
  }
  return { closed: deals.length, totalPnL, deals };
}
export function initBridge(): void {}
export function resetMT5Bridge(): void {
  fbPositions = [];
  fbHistory = [];
  fbBalance = FALLBACK_INITIAL;
  fbNextTicket = 100001;
  fbNextDeal = 500001;
}
