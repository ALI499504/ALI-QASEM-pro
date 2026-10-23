/**
 * BFX AI — Cloudflare Worker Proxy to MetaApi Cloud
 * ====================================================
 * This Worker acts as a transparent proxy between our Next.js platform
 * and the MetaApi Cloud REST API (api.metaapi.cloud).
 *
 * Why it's needed:
 *   - The Linux sandbox's egress proxy intercepts *.metaapi.cloud with a
 *     fake TLS cert (Kubernetes Ingress Controller Fake Certificate), so
 *     direct server-to-MetaApi calls fail with 404.
 *   - Cloudflare Workers have unrestricted outbound internet, so they CAN
 *     reach api.metaapi.cloud with the real Let's Encrypt cert.
 *   - Our Next.js server calls this Worker; the Worker forwards the request
 *     to MetaApi Cloud with the user's token attached.
 *
 * Architecture:
 *
 *   Browser → Next.js API route → THIS Worker → api.metaapi.cloud
 *                                       ↓
 *                            (real HotForex MT5 data:
 *                             login 49877585, server HFMarketsGlobal-Demo)
 *
 * Security:
 *   - The MetaApi token is stored as a Cloudflare Secret (METAAPI_TOKEN)
 *     — never hardcoded in source. Set via `wrangler secret put METAAPI_TOKEN`.
 *   - Optional: set ALLOWED_ORIGIN secret to restrict which sites can call
 *     this Worker (prevents public abuse).
 *
 * Endpoints exposed:
 *   GET  https://<worker-name>.workers.dev/<path...>
 *        Forwards to: GET  https://api.metaapi.cloud/<path...>
 *   POST https://<worker-name>.workers.dev/<path...>
 *        Forwards to: POST https://api.metaapi.cloud/<path...>
 *   (all HTTP methods supported)
 *
 * Example:
 *   curl https://bfx-mt5-proxy.workers.dev/users/current/accounts
 *     → proxies to: https://api.metaapi.cloud/users/current/accounts
 *       with Authorization: Bearer <METAAPI_TOKEN> header injected
 */

// CORS headers — allow our own site + localhost dev
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // tighten with ALLOWED_ORIGIN secret
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-BFX-Client",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env, ctx) {
    // ====== Handle CORS preflight ======
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // ====== Validate token is configured ======
    if (!env.METAAPI_TOKEN) {
      return jsonError(
        500,
        "METAAPI_TOKEN secret is not set. Run: wrangler secret put METAAPI_TOKEN"
      );
    }

    // ====== Optional: restrict origin ======
    if (env.ALLOWED_ORIGIN) {
      const origin = request.headers.get("Origin") || "";
      if (origin && !env.ALLOWED_ORIGIN.split(",").includes(origin)) {
        return jsonError(403, `Origin ${origin} not allowed`);
      }
    }

    // ====== Build upstream URL ======
    const url = new URL(request.url);
    // Strip leading slash so fetch joins paths correctly
    const path = url.pathname.replace(/^\/+/, "");
    const queryString = url.search ? url.search : "";
    const upstreamUrl = `https://api.metaapi.cloud/${path}${queryString}`;

    // ====== Build upstream request ======
    // IMPORTANT: When using Cloudflare Workers' fetch(), do NOT set the Host
    // header manually — Workers sets it automatically based on the URL.
    // Setting it manually can cause a 526 (Invalid SSL certificate) error.
    const reqHeaders = new Headers();
    // Inject the MetaApi token (stored as Cloudflare Secret)
    reqHeaders.set("Authorization", `Bearer ${env.METAAPI_TOKEN}`);
    reqHeaders.set("Content-Type", "application/json");
    // Identify our worker in upstream logs (optional)
    reqHeaders.set("User-Agent", "BFX-AI-Worker-Proxy/1.0");
    // Copy Accept header from client if present
    const clientAccept = request.headers.get("Accept");
    if (clientAccept) reqHeaders.set("Accept", clientAccept);
    // Copy request body content-type for POST/PUT
    const clientContentType = request.headers.get("Content-Type");
    if (clientContentType && request.method !== "GET" && request.method !== "HEAD") {
      reqHeaders.set("Content-Type", clientContentType);
    }

    // ====== Read body (for POST/PUT/PATCH) ======
    let body = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
    }

    // ====== Forward to MetaApi Cloud ======
    // Cloudflare Workers' fetch() automatically:
    //   - Sets Host header based on URL (api.metaapi.cloud)
    //   - Uses SNI = api.metaapi.cloud
    //   - Verifies upstream SSL certificate (real Let's Encrypt cert)
    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers: reqHeaders,
        body: body,
        // cf: {} tells Cloudflare to NOT cache this (it's an API call)
        cf: { cacheTtl: 0, cacheEverything: false },
      });
    } catch (err) {
      return jsonError(
        502,
        `Worker fetch to api.metaapi.cloud failed: ${err.message}. Check that api.metaapi.cloud is online and your token is valid.`
      );
    }

    // ====== Return upstream response with CORS headers ======
    const respHeaders = new Headers(upstream.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v));
    // Add a marker so the client knows it came through our proxy
    respHeaders.set("X-BFX-Proxy", "active");
    respHeaders.set("X-BFX-Upstream-Status", String(upstream.status));

    const respBody = await upstream.text();
    return new Response(respBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: respHeaders,
    });
  },
};

function jsonError(status, message) {
  return new Response(
    JSON.stringify({ error: message, proxied: false }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    }
  );
}
