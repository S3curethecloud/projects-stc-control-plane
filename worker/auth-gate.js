// FILE: worker/auth-gate.js

// Optional: operator IP allowlist (SOC / admin access)
// Enable later when needed

const ALLOWED_IPS = [
  "203.0.113.10",   // office
  "198.51.100.25",  // VPN gateway
  "192.0.2.44"      // admin workstation
];

const RATE_LIMIT = 60;        // requests
const RATE_WINDOW = 60_000;   // 1 minute

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

    // Optional SOC IP restriction
    // Uncomment when needed
    /*
    if (!isAllowedOperatorIP(ip)) {
      return new Response("Operator access restricted", { status: 403 });
    }
    */

    if (isRateLimited(ip)) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    if (url.pathname === "/") {
      return Response.redirect(url.origin + "/index.html", 302);
    }

    // observability endpoints

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
      return new Response(JSON.stringify({
        events: []
      }), {
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

    // tenant administration endpoints

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

    const usageMatch = url.pathname.match(/^\/v1\/admin\/tenants\/([^/]+)\/usage$/);

    if (usageMatch) {
      const tenantId = decodeURIComponent(usageMatch[1]);

      const usageByTenant = {
        "tenant-abc": {
          tokens_issued: 12,
          policy_denied: 1,
          sessions_revoked: 0,
          risk_score: 5
        },
        "tenant-75": {
          tokens_issued: 18,
          policy_denied: 2,
          sessions_revoked: 1,
          risk_score: 9
        },
        "tenant-75a": {
          tokens_issued: 20,
          policy_denied: 3,
          sessions_revoked: 0,
          risk_score: 12
        },
        "tenant-xyz": {
          tokens_issued: 24,
          policy_denied: 4,
          sessions_revoked: 0,
          risk_score: 15
        },
        "tenant-launch": {
          tokens_issued: 30,
          policy_denied: 10,
          sessions_revoked: 2,
          risk_score: 20
        }
      };

      return new Response(JSON.stringify(
        usageByTenant[tenantId] || {
          tokens_issued: 0,
          policy_denied: 0,
          sessions_revoked: 0,
          risk_score: 0
        }
      ), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/v1/intelligence/risk") {
      return new Response(JSON.stringify({
        top_risky_tenants: [
          { tenant: "tenant-launch", risk: 20 },
          { tenant: "tenant-xyz", risk: 15 },
          { tenant: "tenant-75a", risk: 12 },
          { tenant: "tenant-75", risk: 9 },
          { tenant: "tenant-abc", risk: 5 }
        ],
        suspicious_principals: [
          { principal: "agent-demo", events: 14 },
          { principal: "agent_refund", events: 9 },
          { principal: "agent-ops", events: 4 }
        ],
        deny_spike: {
          detected: true,
          current: 20
        },
        policy_drift: false,
        timestamp: Math.floor(Date.now() / 1000)
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const response = await env.ASSETS.fetch(request);

    if (!response) {
      return new Response("Not Found", { status: 404 });
    }

    return applySecurityHeaders(response);
  }
};
