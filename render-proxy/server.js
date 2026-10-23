/**
 * BFX AI — MetaApi Cloud Proxy (Node.js / Express)
 * Renders at: https://bfx-mt5-proxy.onrender.com
 * Forwards all requests to https://api.metaapi.cloud with token injected
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// CORS middleware
const corsOptions = {
  origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN.split(","),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "X-BFX-Client"],
  credentials: false,
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.raw({ type: "*/*", limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "bfx-mt5-proxy",
    version: "2.0.0",
    metaapiTokenConfigured: !!METAAPI_TOKEN,
    nodeTlsSetting: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
    timestamp: new Date().toISOString(),
  });
});

// DEBUG endpoint — shows what URL and headers we WOULD send
app.get("/debug", (req, res) => {
  const path = req.query.path || "/users/current/accounts";
  const upstreamUrl = "https://api.metaapi.cloud" + (path.startsWith("/") ? path : "/" + path);
  res.json({
    requestPath: path,
    upstreamUrl,
    tokenConfigured: !!METAAPI_TOKEN,
    tokenPreview: METAAPI_TOKEN ? METAAPI_TOKEN.slice(0, 50) + "..." : null,
    nodeTlsSetting: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
    nodeVersion: process.version,
    fetchAvailable: typeof fetch,
  });
});

// RAW fetch test — tries to fetch upstream and shows full response details
app.get("/raw-test", async (req, res) => {
  const path = req.query.path || "/users/current/accounts";
  const upstreamUrl = "https://api.metaapi.cloud" + (path.startsWith("/") ? path : "/" + path);
  
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + METAAPI_TOKEN,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "MetaApi-JavaScript-SDK/19.7.0",
      },
      redirect: "manual",
    });
    
    const body = await upstream.text();
    
    res.json({
      upstreamUrl,
      status: upstream.status,
      statusText: upstream.statusText,
      ok: upstream.ok,
      bodyPreview: body.slice(0, 1000),
      bodyLength: body.length,
      headers: Object.fromEntries(upstream.headers),
      redirected: upstream.redirected,
      type: upstream.type,
      url: upstream.url,
    });
  } catch (err) {
    res.json({
      error: err.message,
      name: err.name,
      stack: err.stack?.split("\n").slice(0, 5),
    });
  }
});

// Main proxy handler — forwards everything to api.metaapi.cloud
app.use(async (req, res) => {
  // Skip the special endpoints
  if (req.path === "/health" || req.path === "/debug" || req.path === "/raw-test") {
    return;
  }
  
  if (!METAAPI_TOKEN) {
    return res.status(500).json({
      error: "METAAPI_TOKEN env var is not set",
      hint: "Set it in Render dashboard → Environment",
    });
  }

  // Build upstream URL
  let path = req.path;
  if (!path.startsWith("/")) path = "/" + path;
  const queryString = req.url.includes("?") ? "?" + req.url.split("?")[1] : "";
  const upstreamUrl = "https://api.metaapi.cloud" + path + queryString;

  // Build upstream request headers
  const upstreamHeaders = {
    Authorization: "Bearer " + METAAPI_TOKEN,
    "Content-Type": req.get("Content-Type") || "application/json",
    "User-Agent": "MetaApi-JavaScript-SDK/19.7.0",
    Accept: req.get("Accept") || "application/json",
  };

  // Read body for POST/PUT
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
      body: body,
      signal: controller.signal,
      redirect: "manual",
    });
    clearTimeout(timeout);

    // Forward upstream response headers
    const respHeaders = {};
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        !lower.startsWith("cf-") &&
        !["transfer-encoding", "connection", "keep-alive", "host"].includes(lower)
      ) {
        respHeaders[key] = value;
      }
    });
    respHeaders["X-BFX-Proxy"] = "render-node-v2.0";
    respHeaders["X-BFX-Upstream-Status"] = String(upstream.status);
    respHeaders["X-BFX-Upstream-URL"] = upstreamUrl;

    const respBody = await upstream.text();
    res.status(upstream.status).set(respHeaders).send(respBody);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Proxy error ${req.method} ${path}:`, err.message);
    res.status(502).json({
      error: "Proxy fetch failed",
      detail: err.message,
      upstreamUrl,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BFX MT5 Proxy v2.0 listening on port ${PORT}`);
  console.log(`  MetaApi token: ${METAAPI_TOKEN ? "configured ✓" : "MISSING ✗"}`);
  console.log(`  NODE_TLS_REJECT_UNAUTHORIZED: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED}`);
});
