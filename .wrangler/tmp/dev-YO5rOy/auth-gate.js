var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/auth-gate.js
var RATE_LIMIT = 60;
var RATE_WINDOW = 6e4;
var rateMap = /* @__PURE__ */ new Map();
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
__name(isRateLimited, "isRateLimited");
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
__name(applySecurityHeaders, "applySecurityHeaders");
var auth_gate_default = {
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
        timestamp: Math.floor(Date.now() / 1e3)
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
        created_at: Math.floor(Date.now() / 1e3)
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
    const summaryMatch = url.pathname.match(/^\/v1\/admin\/tenants\/([^/]+)\/summary$/);
    if (summaryMatch) {
      const tenantId = decodeURIComponent(summaryMatch[1]);
      const summaryByTenant = {
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
      return new Response(JSON.stringify(
        summaryByTenant[tenantId] || {
          status: "unknown",
          policy_version: "none",
          policy_digest: "none"
        }
      ), {
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
    const billingMatch = url.pathname.match(/^\/v1\/admin\/tenants\/([^/]+)\/billing$/);
    if (billingMatch) {
      const tenantId = decodeURIComponent(billingMatch[1]);
      const usageByTenant = {
        "tenant-abc": { tokens_issued: 12 },
        "tenant-75": { tokens_issued: 18 },
        "tenant-75a": { tokens_issued: 20 },
        "tenant-xyz": { tokens_issued: 24 },
        "tenant-launch": { tokens_issued: 30 }
      };
      const quantity = usageByTenant[tenantId]?.tokens_issued ?? 0;
      const unitPriceCents = 5;
      return new Response(JSON.stringify({
        tenant_id: tenantId,
        billable_metric: "tokens_issued",
        unit_price_cents: unitPriceCents,
        quantity,
        amount_cents: quantity * unitPriceCents
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const sessionsMatch = url.pathname.match(/^\/v1\/admin\/tenants\/([^/]+)\/sessions$/);
    if (sessionsMatch) {
      const tenantId = decodeURIComponent(sessionsMatch[1]);
      const sessionsByTenant = {
        "tenant-abc": [
          {
            session_id: "sess-abc-1",
            principal: "agent-demo",
            intent: "refund:create",
            scopes: ["refund:create"],
            issued_at: Math.floor(Date.now() / 1e3) - 300,
            ttl: 300
          }
        ],
        "tenant-75": [],
        "tenant-75a": [],
        "tenant-xyz": [],
        "tenant-launch": [
          {
            session_id: "sess-launch-1",
            principal: "agent_refund",
            intent: "refund:create",
            scopes: ["refund:create"],
            issued_at: Math.floor(Date.now() / 1e3) - 120,
            ttl: 300
          }
        ]
      };
      return new Response(JSON.stringify({
        sessions: sessionsByTenant[tenantId] || []
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const revokeMatch = url.pathname.match(/^\/v1\/admin\/sessions\/([^/]+)\/revoke$/);
    if (revokeMatch) {
      const sessionId = decodeURIComponent(revokeMatch[1]);
      return new Response(JSON.stringify({
        revoked: true,
        session_id: sessionId,
        revoked_at: Math.floor(Date.now() / 1e3)
      }), {
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
        timestamp: Math.floor(Date.now() / 1e3)
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

// ../../../usr/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../usr/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-wTE0X2/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = auth_gate_default;

// ../../../usr/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-wTE0X2/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=auth-gate.js.map
