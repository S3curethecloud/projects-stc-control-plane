// FILE: public/assets/js/api.js

const STC_API = (() => {

  const CONFIG = {
    RUNTIME_BASE: "http://localhost:8000",
    TIMEOUT: 5000,
  };

  function getApiKey() {
    const key = sessionStorage.getItem("stc_api_key");

    if (!key) {
      const input = prompt("Enter Tenant API Key:");
      if (!input) throw new Error("API key required");
      sessionStorage.setItem("stc_api_key", input);
      return input;
    }

    return key;
  }

  async function request(path, options = {}) {
    const apiKey = getApiKey();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    try {
      const res = await fetch(`${CONFIG.RUNTIME_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-STC-API-Key": apiKey,
          ...(options.headers || {})
        },
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json();

    } catch (err) {
      clearTimeout(timeout);
      console.error("API error:", err);
      throw err;
    }
  }

  return {
    getHealth: () => request("/health"),
    verifyAudit: () => request("/v1/audit/verify"),
    getActiveSessions: () => request("/v1/sessions/active"),
    introspectToken: (token) =>
      request("/v1/introspect", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    revokeSession: (sessionId) =>
      request("/v1/sessions/revoke", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      }),
  };

})();
