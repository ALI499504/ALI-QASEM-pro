/**
 * BFX AI — MetaApi Cloud Proxy (Node.js / Express)
 * ====================================================
 * Deploy to: Render.com (free tier)
 * URL pattern: https://bfx-mt5-proxy.onrender.com/<path>
 *
 * Why Node.js instead of Cloudflare Worker?
 *   Cloudflare Workers strictly verify upstream SSL certs and reject
 *   api.metaapi.cloud with error 526. There is NO way to disable this
 *   verification in Workers.
 *
 *   Node.js fetch (via undici) DOES allow disabling SSL verification
 *   with NODE_TLS_REJECT_UNAUTHORIZED=0 (set as env var on Render).
 *   This bypasses the MetaApi SSL cert chain issue entirely.
 *
 * Endpoints:
 *   GET  https://bfx-mt5-proxy.onrender.com/<any-path>
 *     → forwards to: GET https://api.metaapi.cloud/<any-path>
 *   POST https://bfx-mt5-proxy.onrender.com/<any-path>
 *     → forwards to: POST https://api.metaapi.cloud/<any-path>
 *   (all HTTP methods supported, including OPTIONS for CORS preflight)
 *
 * Required env vars (set in Render dashboard):
 *   METAAPI_TOKEN       — your MetaApi JWT (eyJhbGciOi...)
 *   PORT                — set automatically by Render (default 10000)
 *   ALLOWED_ORIGIN      — optional: e.g. "https://preview-1.space-z.ai"
 *
 * NOTE: NODE_TLS_REJECT_UNAUTHORIZED=0 must ALSO be set in Render env vars
 *       to bypass SSL verification of api.metaapi.cloud.
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// ============================================================================
// Middleware: CORS
// ============================================================================
const corsOptions = {
  origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN.split(","),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "X-BFX-Client"],
  credentials: false,
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight

// ============================================================================
// Middleware: parse JSON / raw body
// ============================================================================
app.use(express.raw({ type: "*/*", limit: "10mb" }));

// ============================================================================
// Health check endpoint (no upstream call)
// ============================================================================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "bfx-mt5-proxy",
    version: "1.0.0",
    metaapiTokenConfigured: !!METAAPI_TOKEN,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Main proxy handler — forwards everything to api.metaapi.cloud
// ============================================================================
app.use(async (req, res) => {
  if (req.path === "/health") return; // already handled above
  if (!METAAPI_TOKEN) {
    return res.status(500).json({
      error: "METAAPI_TOKEN env var is not set on the proxy server.",
      hint: "Set it in Render dashboard → Environment → Add METAAPI_TOKEN",
    });
  }

  // Build upstream URL: https://api.metaapi.cloud/<path>?<query>
  const path = req.path.startsWith("/") ? req.path : "/" + req.path;
  const queryString = req.url.includes("?") ? "?" + req.url.split("?")[1] : "";
  const upstreamUrl = "https://api.metaapi.cloud" + path + queryString;

  // Build upstream request headers — DROP all incoming headers
  // (especially Host, Authorization, Cloudflare headers from our own site)
  // and set only what MetaApi needs.
  const upstreamHeaders = {
    Authorization: "Bearer " + METAAPI_TOKEN,
    "Content-Type":
      req.get("Content-Type") || "application/json",
    "User-Agent": "BFX-AI-Render-Proxy/1.0 (+node)",
    Accept: req.get("Accept") || "application/json",
    "X-Forwarded-Host": req.hostname,
  };

  // Read request body
  let body = null;
  if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
    body = req.body;
  }

  try {
    // Use Node.js fetch (built-in since Node 18+, available in Node 20+ on Render)
    // NODE_TLS_REJECT_UNAUTHORIZED=0 disables SSL verification for ALL fetches
    // in this process. This is what bypasses the MetaApi SSL cert issue.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: body,
      signal: controller.signal,
      // Don't follow redirects — return them
      redirect: "manual",
    });
    clearTimeout(timeout);

    // Forward upstream response headers (drop hop-by-hop)
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
    respHeaders["X-BFX-Proxy"] = "render-node-v1.0";
    respHeaders["X-BFX-Upstream-Status"] = String(upstream.status);

    // Get upstream response body
    const respBody = await upstream.text();

    res.status(upstream.status).set(respHeaders).send(respBody);
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] Proxy error for ${req.method} ${path}:`,
      err.message
    );
    res.status(502).json({
      error: "Proxy fetch to api.metaapi.cloud failed",
      detail: err.message,
      hint:
        "If error is SSL/certificate-related, ensure NODE_TLS_REJECT_UNAUTHORIZED=0 is set in Render env vars.",
      upstreamUrl,
    });
  }
});

// ============================================================================
// Start the server
// ============================================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`BFX MT5 Proxy listening on port ${PORT}`);
  console.log(`  → Forwarding to: https://api.metaapi.cloud`);
  console.log(`  → MetaApi token: ${METAAPI_TOKEN ? "configured ✓" : "MISSING ✗"}`);
  console.log(`  → NODE_TLS_REJECT_UNAUTHORIZED: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ? "0 (SSL bypass enabled)" : "default (strict)"}`);
  console.log(`  → CORS allowed origin: ${ALLOWED_ORIGIN}`);
});
