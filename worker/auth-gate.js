// FILE: worker/auth-gate.js

const ALLOWED_IPS = [
  "203.0.113.10",
  "198.51.100.25",
  "192.0.2.44"
];

const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;

const rateMap = new Map();

function isAllowedOperatorIP(ip) {
  return ALLOWED_IPS.includes(ip);
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry) {
    rateMap.set(ip, { count: 1, start: now });
    return false;
  }

  if (now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { count: 1, start: now });
    return false;
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    return true;
  }

  return false;
}

function applySecurityHeaders(response) {
  const headers = new Headers(response.headers);

  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://ztr-runtime.fly.dev; img-src 'self' data:; font-src 'self';"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const url = new URL(request.url);

    if (isRateLimited(ip)) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    if (url.pathname === "/") {
      return Response.redirect(url.origin + "/index.html", 302);
    }

    if (url.pathname === "/v1/admin/metrics") {
      return new Response(JSON.stringify({
        tokens_issued: 104,
        policy_allowed: 84,
        policy_denied: 20,
        sessions_revoked: 3,
        active_sessions: 2,
        decision_latency_ms: 11,
        opa_latency_ms: 4,
        redis_latency_ms: 2
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/v1/runtime/activity") {
      return new Response(JSON.stringify({ events: [] }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/v1/runtime/integrity") {
      return new Response(JSON.stringify({
        redis_ok: true,
        runtime_revision: "ztr-runtime",
        policy_revision: "dev-1",
        timestamp: Math.floor(Date.now()/1000)
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/v1/admin/provision" && request.method === "POST") {
      const payload = await request.json();
      const tenantId = payload?.tenant_id || "tenant-new";

      return new Response(JSON.stringify({
        provisioned: true,
        tenant_id: tenantId,
        created_at: Math.floor(Date.now() / 1000)
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/v1/admin/tenants") {
      return new Response(JSON.stringify({
        tenants: [
          { tenant_id: "tenant-abc", label: "Test Tenant" },
          { tenant_id: "tenant-75", label: "Phase 7.5 Test Tenant" },
          { tenant_id: "tenant-75a", label: "Phase 7.5A Load Test Tenant" },
          { tenant_id: "tenant-xyz", label: "New Tenant" },
          { tenant_id: "tenant-launch", label: "Launch Tenant" }
        ]
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/v1/admin/sessions") {
      return new Response(JSON.stringify({
        sessions: [
          {
            tenant_id: "tenant-launch",
            session_id: "sess-launch-1",
            principal: "agent_refund",
            intent: "refund:create",
            scopes: ["refund:create"],
            issued_at: Math.floor(Date.now() / 1000) - 180,
            ttl: 300
          },
          {
            tenant_id: "tenant-abc",
            session_id: "sess-abc-1",
            principal: "agent-demo",
            intent: "refund:create",
            scopes: ["refund:create"],
            issued_at: Math.floor(Date.now() / 1000) - 300,
            ttl: 300
          }
        ]
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/v1/admin/sessions/revoke" && request.method === "POST") {
      const body = await request.json();
      const sessionId = body?.session_id || "unknown";

      return new Response(JSON.stringify({
        status: "revoked",
        session_id: sessionId
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const assetRequest = new Request(url.origin + url.pathname, request);
    const response = await env.ASSETS.fetch(assetRequest);

    if (!response) {
      return new Response("Not Found", { status: 404 });
    }

    return applySecurityHeaders(response);
  }
};
