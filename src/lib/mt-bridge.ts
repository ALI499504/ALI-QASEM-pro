// MT5 Bridge client — talks to the Python bridge on Windows VPS
// Fetches real broker prices, candles, account info, and can send orders.
//
// Configuration: stored in DB or env vars (MT5_BRIDGE_URL, MT5_BRIDGE_API_KEY).
// The user sets these via the MT Bridge Panel UI.

import type { Candle } from "@/lib/indicators";

export interface MTBridgeConfig {
  url: string;           // e.g., https://your-tunnel.trycloudflare.com
  apiKey: string;       // bridge API key
  symbol: string;       // XAUUSD or GOLD depending on broker
}

export interface MTBridgeStatus {
  connected: boolean;
  mt5Connected: boolean;
  account: {
    login: number;
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
  } | null;
  bridgeVersion: string;
  timestamp: number;
}

export interface MTTicker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  time: number;
  timestamp: string;
}

export interface MTPosition {
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

export interface MTOrderResult {
  retcode: number;
  deal: number;
  order: number;
  symbol: string;
  price: number;
  volume: number;
  comment: string;
  success: boolean;
  timestamp: string;
}

// === Storage (in-memory + persisted to /home/sync or localStorage on browser) ===

const CONFIG_FILE = "/home/sync/mt-bridge-config.json";

let cachedConfig: MTBridgeConfig | null = null;

export function getBridgeConfig(): MTBridgeConfig | null {
  if (cachedConfig) return cachedConfig;
  // On server, try reading from file
  if (typeof window === "undefined") {
    try {
      const fs = require("fs");
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        cachedConfig = JSON.parse(raw);
        return cachedConfig;
      }
    } catch (e) {
      // ignore
    }
    // Fall back to env vars
    const url = process.env.MT5_BRIDGE_URL;
    const apiKey = process.env.MT5_BRIDGE_API_KEY;
    if (url && apiKey) {
      cachedConfig = {
        url,
        apiKey,
        symbol: process.env.MT5_SYMBOL || "XAUUSD",
      };
      return cachedConfig;
    }
  } else {
    // On browser, use localStorage
    try {
      const raw = localStorage.getItem("mt-bridge-config");
      if (raw) {
        cachedConfig = JSON.parse(raw);
        return cachedConfig;
      }
    } catch (e) {}
  }
  return null;
}

export function setBridgeConfig(config: MTBridgeConfig): void {
  cachedConfig = config;
  if (typeof window === "undefined") {
    try {
      const fs = require("fs");
      const path = require("path");
      fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (e) {
      // ignore
    }
  } else {
    try {
      localStorage.setItem("mt-bridge-config", JSON.stringify(config));
    } catch (e) {}
  }
}

export function clearBridgeConfig(): void {
  cachedConfig = null;
  if (typeof window === "undefined") {
    try {
      const fs = require("fs");
      if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
    } catch (e) {}
  } else {
    try {
      localStorage.removeItem("mt-bridge-config");
    } catch (e) {}
  }
}

// === API calls ===

async function mtFetch(path: string, options: RequestInit = {}): Promise<any> {
  const config = getBridgeConfig();
  if (!config) throw new Error("MT5 bridge not configured");

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${config.url}${path}`, {
      ...options,
      signal: ctrl.signal,
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MT5 bridge error ${res.status}: ${text}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function testBridgeConnection(config?: MTBridgeConfig): Promise<MTBridgeStatus> {
  const oldConfig = getBridgeConfig();
  // Temporarily use the provided config for the test
  if (config) {
    cachedConfig = config;
  }
  try {
    const j = await mtFetch("/health");
    return {
      connected: true,
      mt5Connected: Boolean(j.mt5_connected),
      account: j.mt5_account
        ? {
            login: j.mt5_account.login,
            name: j.mt5_account.name,
            server: j.mt5_account.server,
            currency: j.mt5_account.currency,
            leverage: j.mt5_account.leverage,
            balance: j.mt5_account.balance,
            equity: j.mt5_account.equity,
            margin: j.mt5_account.margin,
            marginFree: j.mt5_account.margin_free,
            marginLevel: j.mt5_account.margin_level,
            profit: j.mt5_account.profit,
          }
        : null,
      bridgeVersion: j.bridge || "unknown",
      timestamp: Date.now(),
    };
  } finally {
    // Restore old config
    if (config && oldConfig) {
      cachedConfig = oldConfig;
    } else if (config) {
      cachedConfig = null;
    }
  }
}

export async function fetchMTTicker(symbol?: string): Promise<MTTicker> {
  const config = getBridgeConfig();
  if (!config) throw new Error("MT5 bridge not configured");
  const sym = symbol || config.symbol;
  return mtFetch(`/ticker?symbol=${encodeURIComponent(sym)}`);
}

export async function fetchMTCandles(
  interval: string = "1h",
  limit: number = 200,
  symbol?: string,
): Promise<Candle[]> {
  const config = getBridgeConfig();
  if (!config) throw new Error("MT5 bridge not configured");
  const sym = symbol || config.symbol;
  const j = await mtFetch(
    `/candles?symbol=${encodeURIComponent(sym)}&interval=${interval}&limit=${limit}`,
  );
  if (!Array.isArray(j.candles)) return [];
  return j.candles.map((c: any) => ({
    time: Number(c.time),
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    volume: Number(c.volume),
  }));
}

export async function fetchMTAccount(): Promise<any> {
  return mtFetch("/account");
}

export async function fetchMTPositions(symbol?: string): Promise<MTPosition[]> {
  const config = getBridgeConfig();
  const sym = symbol || config?.symbol;
  const path = sym ? `/positions?symbol=${encodeURIComponent(sym)}` : "/positions";
  const j = await mtFetch(path);
  return j.positions || [];
}

export async function sendMTOrder(params: {
  symbol?: string;
  side: "BUY" | "SELL";
  volume: number;
  sl?: number;
  tp?: number;
  deviation?: number;
  comment?: string;
}): Promise<MTOrderResult> {
  const config = getBridgeConfig();
  if (!config) throw new Error("MT5 bridge not configured");
  return mtFetch("/order", {
    method: "POST",
    body: JSON.stringify({
      symbol: params.symbol || config.symbol,
      side: params.side,
      volume: params.volume,
      sl: params.sl,
      tp: params.tp,
      deviation: params.deviation ?? 20,
      comment: params.comment ?? "M.ROBOT Copy",
    }),
  });
}

export async function closeMTPosition(ticket: number): Promise<MTOrderResult> {
  return mtFetch("/close_position", {
    method: "POST",
    body: JSON.stringify({ ticket }),
  });
}

/**
 * Convenience: check if MT5 bridge is currently active (configured + reachable).
 */
export async function isMTBridgeActive(): Promise<boolean> {
  const config = getBridgeConfig();
  if (!config) return false;
  try {
    const status = await testBridgeConnection();
    return status.mt5Connected;
  } catch {
    return false;
  }
}
