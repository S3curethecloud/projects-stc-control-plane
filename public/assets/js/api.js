// FILE: public/assets/js/api.js
// SecureTheCloud Control Plane + Runtime API Client
// Deterministic implementation aligned to Phase-8 backend contracts

function stcFetch(url, options = {}) {
  const token = localStorage.getItem("stc_operator_token");

  options.headers = options.headers || {};

  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, options);
}

const STC_API = (() => {
  const CONFIG = {
    BASE_URL: "https://ztr-runtime.fly.dev",
    TIMEOUT: 6000,
  };

  /* ---------------------------------------------------
     Credential Retrieval
  --------------------------------------------------- */

  function getAdminSecret() {
    const value = localStorage.getItem("STC_ADMIN_SECRET");
    if (!value) throw new Error("Missing admin secret");
    return value;
  }

  function getApiKey() {
    const value = localStorage.getItem("STC_API_KEY");
    if (!value) throw new Error("Missing tenant API key");
    return value;
  }

  /* ---------------------------------------------------
     Core Request
  --------------------------------------------------- */

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    try {
      const res = await stcFetch(`${CONFIG.BASE_URL}${path}`, {
        cache: "no-store",
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json();
    } catch (err) {
      clearTimeout(timer);
      console.error("STC API error:", err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     Control Plane Requests
  --------------------------------------------------- */

  function adminGet(path) {
    return request(path, {
      method: "GET",
      headers: {
        "X-Stc-Admin-Secret": getAdminSecret(),
      },
    });
  }

  function adminPost(path, body) {
    return request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Stc-Admin-Secret": getAdminSecret(),
      },
      body: JSON.stringify(body),
    });
  }

  /* ---------------------------------------------------
     Runtime Requests
  --------------------------------------------------- */

  function runtimeGet(path) {
    return request(path, {
      method: "GET",
      headers: {
        "X-Stc-Api-Key": getApiKey(),
      },
    });
  }

  function runtimePost(path, body) {
    return request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Stc-Api-Key": getApiKey(),
      },
      body: JSON.stringify(body),
    });
  }

  /* ---------------------------------------------------
     Control Plane API
  --------------------------------------------------- */

  function getAdminRuntime() {
    return adminGet("/v1/runtime/integrity").then(r => ({
      status: "healthy",
      redis: r.redis_ok ? "ok" : "failed",
      policy_revision: r.policy_revision,
      active_sessions: r.active_sessions || 0
    }));
  }

  function getAdminMetrics() {
    return adminGet("/v1/admin/metrics");
  }

  function getTenants() {
    return adminGet("/v1/admin/tenants");
  }

  function getTenantSummary(tenantId) {
    return adminGet(`/v1/admin/tenants/${encodeURIComponent(tenantId)}/summary`);
  }

  function getTenantUsage(tenantId) {
    return adminGet(`/v1/admin/tenants/${encodeURIComponent(tenantId)}/usage`);
  }

  function getTenantBilling(tenantId) {
    return adminGet(`/v1/admin/tenants/${encodeURIComponent(tenantId)}/billing`);
  }

  function getTenantSessions(tenantId) {
    return adminGet(`/v1/admin/tenants/${encodeURIComponent(tenantId)}/sessions`);
  }

  function provisionTenant(payload) {
    return adminPost("/v1/admin/provision", payload);
  }

  /* ---------------------------------------------------
     Runtime API
  --------------------------------------------------- */

  function issueToken(payload) {
    return runtimePost("/v1/tokens/issue", payload);
  }

  function getActiveSessions() {
    return runtimeGet("/v1/sessions/active");
  }

  function revokeSession(sessionId) {
    return runtimePost("/v1/sessions/revoke", {
      session_id: sessionId,
    });
  }

  /* ---------------------------------------------------
     PHASE 9 OBSERVABILITY
  --------------------------------------------------- */

  function getRuntimeActivity() {
    return request("/v1/runtime/activity", {
      method: "GET",
      headers: {
        "X-Stc-Admin-Secret": getAdminSecret(),
      }
    });
  }

  function getRuntimeIntegrity() {
    return request("/v1/runtime/integrity", {
      method: "GET",
      headers: {
        "X-Stc-Admin-Secret": getAdminSecret(),
      }
    });
  }

  function getRuntimeMetrics() {
    return request("/v1/metrics", {
      method: "GET",
      headers: {
        "X-Stc-Admin-Secret": getAdminSecret(),
      }
    });
  }

  /* ---------------------------------------------------
     Public API Surface
  --------------------------------------------------- */

  return {
    /* control plane */
    getAdminRuntime,
    getAdminMetrics,
    getTenants,
    getTenantSummary,
    getTenantUsage,
    getTenantBilling,
    getTenantSessions,
    provisionTenant,

    /* runtime plane */
    issueToken,
    getActiveSessions,
    revokeSession,

    /* observability */
    getRuntimeActivity,
    getRuntimeIntegrity,
    getRuntimeMetrics
  };
})();
