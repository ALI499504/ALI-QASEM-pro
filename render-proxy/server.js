/**
 * BFX AI — MetaApi Cloud Proxy v6.0
 * 
 * Routes to 3 different MetaApi hosts based on path:
 * 
 *   /provisioning/* → mt-provisioning-api-v1 (account management)
 *   /market-data/*  → mt-market-data-client-api-v1 (historical candles/ticks)
 *   /client-api/*   → mt-client-api-v1 (account info, positions, orders, history)
 *   default (no prefix) → mt-provisioning-api-v1 (backward compat)
 * 
 * Examples:
 *   GET /users/current/accounts                                      → provisioning
 *   GET /market-data/users/current/accounts/<id>/historical-candles/XAUUSD/1h/latest?limit=100
 *   GET /client-api/users/current/accounts/<id>/account-information
 *   GET /client-api/users/current/accounts/<id>/positions
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// Three MetaApi hosts (all use the same domain: agiliumtrade.agiliumtrade.ai)
const HOSTS = {
  provisioning: "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai",
  marketData: "https://mt-market-data-client-api-v1.agiliumtrade.agiliumtrade.ai",
  clientApi: "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai",
};

// Path prefix → host mapping
function routeToHost(path) {
  if (path.startsWith("/market-data/")) return HOSTS.marketData;
  if (path.startsWith("/client-api/")) return HOSTS.clientApi;
  return HOSTS.provisioning; // default
}

function stripPrefix(path) {
  // Remove the routing prefix so we forward the correct path to upstream
  if (path.startsWith("/market-data/")) return "/" + path.slice("/market-data/".length);
  if (path.startsWith("/client-api/")) return "/" + path.slice("/client-api/".length);
  return path;
}

app.use(cors({ origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN.split(",") }));
app.use(express.raw({ type: "*/*", limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "bfx-mt5-proxy",
    version: "6.0.0",
    hosts: HOSTS,
    metaapiTokenConfigured: !!METAAPI_TOKEN,
    timestamp: new Date().toISOString(),
  });
});

// List of accounts
app.get("/test/accounts", async (req, res) => {
  try {
    const r = await fetch(HOSTS.provisioning + "/users/current/accounts", {
      headers: { "auth-token": METAAPI_TOKEN }
    });
    const body = await r.text();
    res.json({ status: r.status, body: JSON.parse(body) });
  } catch (e) { res.json({ error: e.message }); }
});

// Main proxy handler
app.use(async (req, res) => {
  if (["/health", "/test/accounts"].includes(req.path)) return;
  
  if (!METAAPI_TOKEN) {
    return res.status(500).json({ error: "METAAPI_TOKEN not set" });
  }

  // Determine the upstream host
  const upstreamHost = routeToHost(req.path);
  const upstreamPath = stripPrefix(req.path);
  const queryString = req.url.includes("?") ? "?" + req.url.split("?")[1] : "";
  const upstreamUrl = upstreamHost + upstreamPath + queryString;

  const upstreamHeaders = {
    "auth-token": METAAPI_TOKEN,
    "Content-Type": req.get("Content-Type") || "application/json",
    Accept: "application/json",
    "User-Agent": "MetaApi-JavaScript-SDK/19.7.0",
  };

  let body = null;
  if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
    body = req.body;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body,
      signal: controller.signal,
      redirect: "manual",
    });
    clearTimeout(timeout);

    const respHeaders = {};
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!lower.startsWith("cf-") && !["transfer-encoding", "connection", "keep-alive", "host"].includes(lower)) {
        respHeaders[key] = value;
      }
    });
    respHeaders["X-BFX-Proxy"] = "render-node-v6.0";
    respHeaders["X-BFX-Upstream-Status"] = String(upstream.status);
    respHeaders["X-BFX-Upstream-URL"] = upstreamUrl;
    respHeaders["X-BFX-Upstream-Host"] = upstreamHost;

    const respBody = await upstream.text();
    res.status(upstream.status).set(respHeaders).send(respBody);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Proxy error ${req.method} ${upstreamPath}:`, err.message);
    res.status(502).json({ error: "Proxy fetch failed", detail: err.message, upstreamUrl });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BFX MT5 Proxy v6.0 listening on port ${PORT}`);
  console.log(`  Provisioning:  ${HOSTS.provisioning}`);
  console.log(`  Market data:   ${HOSTS.marketData}`);
  console.log(`  Client API:    ${HOSTS.clientApi}`);
  console.log(`  Token: ${METAAPI_TOKEN ? "OK" : "MISSING"}`);
});
