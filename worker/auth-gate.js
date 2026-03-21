// FILE: worker/auth-gate.js

const ALLOWED_IPS = [
  "203.0.113.10",
  "198.51.100.25",
  "192.0.2.44"
];

const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;

const rateMap = new Map();

const TENANTS = [
  {
    tenant_id: "tenant-abc",
    label: "Test Tenant",
    status: "active",
    policy_version: "v1",
    created_at: 1710590000
  },
  {
    tenant_id: "tenant-75",
    label: "Phase 7.5 Test Tenant",
    status: "active",
    policy_version: "v1",
    created_at: 1710593600
  },
  {
    tenant_id: "tenant-75a",
    label: "Phase 7.5A Load Test Tenant",
    status: "active",
    policy_version: "v1",
    created_at: 1710597200
  },
  {
    tenant_id: "tenant-xyz",
    label: "New Tenant",
    status: "active",
    policy_version: "v1",
    created_at: 1710600800
  },
  {
    tenant_id: "tenant-launch",
    label: "Launch Tenant",
    status: "active",
    policy_version: "v1",
    created_at: 1710604400
  }
];

const TENANT_SUMMARIES = {
  "tenant-abc": {
    status: "active",
    policy_version: "v1",
    policy_digest: "sha256-abc123"
  },
  "tenant-75": {
    status: "active",
    policy_version: "v1",
    policy_digest: "sha256-75"
  },
  "tenant-75a": {
    status: "active",
    policy_version: "v1",
    policy_digest: "sha256-75a"
  },
  "tenant-xyz": {
    status: "active",
    policy_version: "v1",
    policy_digest: "sha256-xyz"
  },
  "tenant-launch": {
    status: "active",
    policy_version: "v1",
    policy_digest: "sha256-launch"
  }
};

const TENANT_USAGE = {
  "tenant-abc": {
    tokens_issued: 12,
    policy_denied: 1,
    sessions_revoked: 0,
    risk_score: 5,
    period: "current_period"
  },
  "tenant-75": {
    tokens_issued: 18,
    policy_denied: 2,
    sessions_revoked: 1,
    risk_score: 9,
    period: "current_period"
  },
  "tenant-75a": {
    tokens_issued: 20,
    policy_denied: 3,
    sessions_revoked: 0,
    risk_score: 12,
    period: "current_period"
  },
  "tenant-xyz": {
    tokens_issued: 24,
    policy_denied: 4,
    sessions_revoked: 0,
    risk_score: 15,
    period: "current_period"
  },
  "tenant-launch": {
    tokens_issued: 30,
    policy_denied: 10,
    sessions_revoked: 2,
    risk_score: 20,
    period: "current_period"
  }
};

const TENANT_SESSIONS = {
  "tenant-abc": [
    {
      tenant_id: "tenant-abc",
      session_id: "sess-abc-1",
      principal: "agent-demo",
      intent: "refund:create",
      scopes: ["refund:create"],
      issued_at: Math.floor(Date.now() / 1000) - 300,
      ttl: 300
    }
  ],
  "tenant-75": [],
  "tenant-75a": [],
  "tenant-xyz": [],
  "tenant-launch": [
    {
      tenant_id: "tenant-launch",
      session_id: "sess-launch-1",
      principal: "agent_refund",
      intent: "refund:create",
      scopes: ["refund:create"],
      issued_at: Math.floor(Date.now() / 1000) - 180,
      ttl: 300
    }
  ]
};

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

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
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

    // Optional operator IP restriction
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

    if (url.pathname === "/v1/admin/metrics") {
      return jsonResponse({
        tokens_issued: 104,
        policy_allowed: 84,
        policy_denied: 20,
        sessions_revoked: 3,
        active_sessions: 2,
        decision_latency_ms: 11,
        opa_latency_ms: 4,
        redis_latency_ms: 2,
        tenant_count: TENANTS.length
      });
    }

    if (url.pathname === "/v1/runtime/activity") {
      return jsonResponse({
        events: [
          {
            timestamp: Math.floor(Date.now() / 1000) - 180,
            event_type: "decision",
            tenant_id: "tenant-launch",
            principal: "agent_refund",
            detail: "refund:create allow"
          },
          {
            timestamp: Math.floor(Date.now() / 1000) - 300,
            event_type: "decision",
            tenant_id: "tenant-abc",
            principal: "agent-demo",
            detail: "refund:create allow"
          }
        ]
      });
    }

    if (url.pathname === "/v1/runtime/integrity") {
      return jsonResponse({
        redis_ok: true,
        runtime_revision: "ztr-runtime",
        policy_revision: "dev-1",
        timestamp: Math.floor(Date.now() / 1000)
      });
    }

    if (url.pathname === "/v1/admin/provision" && request.method === "POST") {
      const payload = await request.json();
      const tenantId = payload?.tenant_id || "tenant-new";

      return jsonResponse({
        provisioned: true,
        tenant_id: tenantId,
        label: payload?.label || "",
        key_label: payload?.key_label || "",
        created_at: Math.floor(Date.now() / 1000)
      });
    }

    if (url.pathname === "/v1/admin/tenants") {
      return jsonResponse({ tenants: TENANTS });
    }

    if (url.pathname === "/v1/admin/sessions") {
      return jsonResponse({
        sessions: [
          ...(TENANT_SESSIONS["tenant-launch"] || []),
          ...(TENANT_SESSIONS["tenant-abc"] || [])
        ]
      });
    }

    if (url.pathname === "/v1/admin/sessions/revoke" && request.method === "POST") {
      const body = await request.json();
      const sessionId = body?.session_id || "unknown";

      return jsonResponse({
        status: "revoked",
        session_id: sessionId
      });
    }

    const summaryMatch = url.pathname.match(/^\/v1\/admin\/tenants\/([^/]+)\/summary$/);
    if (summaryMatch) {
      const tenantId = decodeURIComponent(summaryMatch[1]);
      return jsonResponse(
        TENANT_SUMMARIES[tenantId] || {
          status: "unknown",
          policy_version: "none",
          policy_digest: "none"
        }
      );
    }

    const usageMatch = url.pathname.match(/^\/v1\/admin\/tenants\/([^/]+)\/usage$/);
    if (usageMatch) {
      const tenantId = decodeURIComponent(usageMatch[1]);
      return jsonResponse(
        TENANT_USAGE[tenantId] || {
          tokens_issued: 0,
          policy_denied: 0,
          sessions_revoked: 0,
          risk_score: 0,
          period: "current_period"
        }
      );
    }

    const billingMatch = url.pathname.match(/^\/v1\/admin\/tenants\/([^/]+)\/billing$/);
    if (billingMatch) {
      const tenantId = decodeURIComponent(billingMatch[1]);
      const quantity = TENANT_USAGE[tenantId]?.tokens_issued ?? 0;
      const unitPriceCents = 5;

      return jsonResponse({
        tenant_id: tenantId,
        billable_metric: "tokens_issued",
        unit_price_cents: unitPriceCents,
        quantity,
        amount_cents: quantity * unitPriceCents
      });
    }

    const tenantSessionsMatch = url.pathname.match(/^\/v1\/admin\/tenants\/([^/]+)\/sessions$/);
    if (tenantSessionsMatch) {
      const tenantId = decodeURIComponent(tenantSessionsMatch[1]);
      return jsonResponse({
        sessions: TENANT_SESSIONS[tenantId] || []
      });
    }

    if (url.pathname === "/v1/intelligence/risk") {
      return jsonResponse({
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
