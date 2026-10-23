/**
 * BFX AI — MetaApi Cloud Proxy v7.0
 * 
 * Routes to 4 different MetaApi hosts based on path:
 * 
 *   /provisioning/* → mt-provisioning-api-v1 (account management)
 *   /market-data/*  → mt-market-data-client-api-v1 (historical candles/ticks)
 *   /client-api/*   → mt-client-api-v1 (account info, positions)
 *   /metastats/*    → metastats-api-v1.london (account metrics, trades history)
 *   default         → mt-provisioning-api-v1
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const HOSTS = {
  provisioning: "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai",
  marketData: "https://mt-market-data-client-api-v1.agiliumtrade.agiliumtrade.ai",
  clientApi: "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai",
  metaStats: "https://metastats-api-v1.london.agiliumtrade.agiliumtrade.ai",
};

function routeToHost(path) {
  if (path.startsWith("/market-data/")) return HOSTS.marketData;
  if (path.startsWith("/client-api/")) return HOSTS.clientApi;
  if (path.startsWith("/metastats/")) return HOSTS.metaStats;
  return HOSTS.provisioning;
}

function stripPrefix(path) {
  if (path.startsWith("/market-data/")) return "/" + path.slice("/market-data/".length);
  if (path.startsWith("/client-api/")) return "/" + path.slice("/client-api/".length);
  if (path.startsWith("/metastats/")) return "/" + path.slice("/metastats/".length);
  return path;
}

app.use(cors({ origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN.split(",") }));
app.use(express.raw({ type: "*/*", limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "bfx-mt5-proxy",
    version: "7.0.0",
    hosts: HOSTS,
    metaapiTokenConfigured: !!METAAPI_TOKEN,
    timestamp: new Date().toISOString(),
  });
});

app.use(async (req, res) => {
  if (req.path === "/health") return;
  
  if (!METAAPI_TOKEN) {
    return res.status(500).json({ error: "METAAPI_TOKEN not set" });
  }

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
    respHeaders["X-BFX-Proxy"] = "render-node-v7.0";
    respHeaders["X-BFX-Upstream-Status"] = String(upstream.status);
    respHeaders["X-BFX-Upstream-Host"] = upstreamHost;

    const respBody = await upstream.text();
    res.status(upstream.status).set(respHeaders).send(respBody);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Proxy error ${req.method} ${upstreamPath}:`, err.message);
    res.status(502).json({ error: "Proxy fetch failed", detail: err.message, upstreamUrl });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BFX MT5 Proxy v7.0 listening on port ${PORT}`);
  console.log(`  Provisioning: ${HOSTS.provisioning}`);
  console.log(`  Market data:  ${HOSTS.marketData}`);
  console.log(`  Client API:   ${HOSTS.clientApi}`);
  console.log(`  MetaStats:    ${HOSTS.metaStats}`);
  console.log(`  Token: ${METAAPI_TOKEN ? "OK" : "MISSING"}`);
});
