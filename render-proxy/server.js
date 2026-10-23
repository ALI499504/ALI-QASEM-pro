/**
 * BFX AI — MetaApi Cloud Proxy v5.0
 * 
 * ANOTHER BREAKTHROUGH: MetaApi uses 'auth-token' header (NOT 'Authorization: Bearer')
 * 
 * Error was: "Authorization failed because no auth-token header provided"
 * 
 * So the correct header to send is:
 *   auth-token: <jwt_token>
 * 
 * NOT the standard:
 *   Authorization: Bearer <jwt_token>
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// === REAL MetaApi Cloud API base URL (from SDK source) ===
const METAAPI_BASE_URL = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

app.use(cors({ origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN.split(",") }));
app.use(express.raw({ type: "*/*", limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "bfx-mt5-proxy",
    version: "5.0.0",
    metaapiBaseUrl: METAAPI_BASE_URL,
    authHeaderName: "auth-token",
    metaapiTokenConfigured: !!METAAPI_TOKEN,
    nodeTlsSetting: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint
app.get("/debug", (req, res) => {
  const path = req.query.path || "/users/current/accounts";
  const upstreamUrl = METAAPI_BASE_URL + (path.startsWith("/") ? path : "/" + path);
  res.json({
    requestPath: path,
    upstreamUrl,
    tokenConfigured: !!METAAPI_TOKEN,
    tokenPreview: METAAPI_TOKEN ? METAAPI_TOKEN.slice(0, 50) + "..." : null,
    nodeVersion: process.version,
  });
});

// Raw test endpoint - tries fetching and shows full response
app.get("/raw-test", async (req, res) => {
  const path = req.query.path || "/users/current/accounts";
  const upstreamUrl = METAAPI_BASE_URL + (path.startsWith("/") ? path : "/" + path);
  
  try {
    const r = await fetch(upstreamUrl, {
      headers: {
        "auth-token": METAAPI_TOKEN,  // ← THE FIX! 'auth-token' not 'Authorization'
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "MetaApi-JavaScript-SDK/19.7.0",
      }
    });
    const body = await r.text();
    res.json({
      upstreamUrl,
      status: r.status,
      statusText: r.statusText,
      ok: r.ok,
      bodyPreview: body.slice(0, 1500),
      bodyLength: body.length,
      headers: Object.fromEntries(r.headers),
    });
  } catch (err) {
    res.json({ error: err.message, name: err.name, upstreamUrl });
  }
});

// Main proxy handler
app.use(async (req, res) => {
  if (["/health", "/raw-test", "/debug"].includes(req.path)) return;
  
  if (!METAAPI_TOKEN) {
    return res.status(500).json({ error: "METAAPI_TOKEN not set" });
  }

  let path = req.path;
  if (!path.startsWith("/")) path = "/" + path;
  const queryString = req.url.includes("?") ? "?" + req.url.split("?")[1] : "";
  const upstreamUrl = METAAPI_BASE_URL + path + queryString;

  // THE FIX: MetaApi uses 'auth-token' header, not 'Authorization: Bearer'
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
    respHeaders["X-BFX-Proxy"] = "render-node-v5.0";
    respHeaders["X-BFX-Upstream-Status"] = String(upstream.status);
    respHeaders["X-BFX-Upstream-URL"] = upstreamUrl;

    const respBody = await upstream.text();
    res.status(upstream.status).set(respHeaders).send(respBody);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Proxy error ${req.method} ${path}:`, err.message);
    res.status(502).json({ error: "Proxy fetch failed", detail: err.message, upstreamUrl });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BFX MT5 Proxy v5.0 listening on port ${PORT}`);
  console.log(`  Upstream: ${METAAPI_BASE_URL}`);
  console.log(`  Auth header: auth-token`);
  console.log(`  Token: ${METAAPI_TOKEN ? "OK" : "MISSING"}`);
  console.log(`  TLS reject: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED}`);
});
