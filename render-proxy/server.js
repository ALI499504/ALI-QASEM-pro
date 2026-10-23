/**
 * BFX AI — MetaApi Cloud Proxy v3.0
 * Now tries multiple Host headers + User-Agents to find what works
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;
const METAAPI_TOKEN = process.env.METAAPI_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use(cors({ origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN.split(",") }));
app.use(express.raw({ type: "*/*", limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({
    status: "ok", service: "bfx-mt5-proxy", version: "3.0.0",
    metaapiTokenConfigured: !!METAAPI_TOKEN,
    nodeTlsSetting: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
    timestamp: new Date().toISOString(),
  });
});

// Comprehensive raw-test endpoint that tries multiple approaches
app.get("/raw-test", async (req, res) => {
  const path = req.query.path || "/users/current/accounts";
  const upstreamUrl = "https://api.metaapi.cloud" + (path.startsWith("/") ? path : "/" + path);
  
  const tests = {};
  
  // Test 1: Default fetch (no special headers)
  try {
    const r = await fetch(upstreamUrl, {
      headers: { Authorization: "Bearer " + METAAPI_TOKEN, "Content-Type": "application/json" }
    });
    const body = await r.text();
    tests["default"] = {
      status: r.status, headers: Object.fromEntries(r.headers),
      bodyPreview: body.slice(0, 300),
    };
  } catch (e) { tests["default"] = { error: e.message }; }
  
  // Test 2: With explicit Host header
  try {
    const r = await fetch(upstreamUrl, {
      headers: {
        Authorization: "Bearer " + METAAPI_TOKEN,
        Host: "api.metaapi.cloud",
        "Content-Type": "application/json",
        Accept: "application/json",
      }
    });
    const body = await r.text();
    tests["with-host"] = {
      status: r.status, bodyPreview: body.slice(0, 300),
    };
  } catch (e) { tests["with-host"] = { error: e.message }; }
  
  // Test 3: With SDK User-Agent
  try {
    const r = await fetch(upstreamUrl, {
      headers: {
        Authorization: "Bearer " + METAAPI_TOKEN,
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "User-Agent": "axios/1.7.2",
      }
    });
    const body = await r.text();
    tests["axios-ua"] = {
      status: r.status, bodyPreview: body.slice(0, 300),
    };
  } catch (e) { tests["axios-ua"] = { error: e.message }; }
  
  // Test 4: Try without TLS verification (if NODE_TLS_REJECT_UNAUTHORIZED is set)
  try {
    const r = await fetch(upstreamUrl, {
      headers: { Authorization: "Bearer " + METAAPI_TOKEN, "Content-Type": "application/json" },
      // Try fetch with node-specific options
      dispatcher: undefined,
    });
    const body = await r.text();
    tests["dispatcher-undefined"] = {
      status: r.status, bodyPreview: body.slice(0, 300),
    };
  } catch (e) { tests["dispatcher-undefined"] = { error: e.message }; }
  
  // Test 5: Try fetching app.metaapi.cloud (which we KNOW works) to verify Worker
  try {
    const r = await fetch("https://app.metaapi.cloud");
    const body = await r.text();
    tests["app-metaapi-works"] = {
      status: r.status, bodyPreview: body.slice(0, 200),
    };
  } catch (e) { tests["app-metaapi-works"] = { error: e.message }; }
  
  // Test 6: Try fetching api-v1.metaapi.cloud (different subdomain)
  try {
    const r = await fetch("https://api-v1.metaapi.cloud" + (path.startsWith("/") ? path : "/" + path), {
      headers: { Authorization: "Bearer " + METAAPI_TOKEN, "Content-Type": "application/json" }
    });
    const body = await r.text();
    tests["api-v1-subdomain"] = {
      status: r.status, bodyPreview: body.slice(0, 300),
    };
  } catch (e) { tests["api-v1-subdomain"] = { error: e.message }; }
  
  res.json({ upstreamUrl, tests });
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
  const upstreamUrl = "https://api.metaapi.cloud" + path + queryString;

  const upstreamHeaders = {
    Authorization: "Bearer " + METAAPI_TOKEN,
    "Content-Type": req.get("Content-Type") || "application/json",
    Accept: "application/json, text/plain, */*",
    "User-Agent": "axios/1.7.2",
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
    respHeaders["X-BFX-Proxy"] = "render-node-v3.0";
    respHeaders["X-BFX-Upstream-Status"] = String(upstream.status);

    const respBody = await upstream.text();
    res.status(upstream.status).set(respHeaders).send(respBody);
  } catch (err) {
    res.status(502).json({ error: "Proxy fetch failed", detail: err.message, upstreamUrl });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BFX MT5 Proxy v3.0 listening on port ${PORT}`);
  console.log(`  Token: ${METAAPI_TOKEN ? "OK" : "MISSING"}`);
  console.log(`  TLS reject: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED}`);
});
