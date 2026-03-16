let observabilityRefreshHandle = null;
let observabilityLoading = false;

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = value;
}

function formatTime(tsSeconds) {
  const ts = Number(tsSeconds);
  if (!Number.isFinite(ts)) return new Date().toLocaleString();
  return new Date(ts * 1000).toLocaleString();
}

function toDisplayNumber(value, fallback = "--") {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : fallback;
}

function firstValue(obj, keys, fallback = null) {
  if (!obj || typeof obj !== "object") return fallback;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }

  return fallback;
}

function summarizeError(err) {
  const raw = String(err && err.message ? err.message : err || "unknown_error");

  if (raw.includes("<!DOCTYPE") || raw.includes("<html")) {
    return "non_json_error_response";
  }

  const httpMatch = raw.match(/HTTP\s+(\d{3})/i);
  if (httpMatch) {
    return `http_${httpMatch[1]}`;
  }

  return raw.length > 120 ? raw.slice(0, 120) : raw;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`${url} -> non-JSON response`);
  }

  return res.json();
}

async function fetchAdminMetrics() {
  const adminSecret = localStorage.getItem("STC_ADMIN_SECRET");

  if (!adminSecret) {
    throw new Error("missing_STC_ADMIN_SECRET");
  }

  return fetchJson("/v1/admin/metrics", {
    method: "GET",
    headers: {
      "X-Stc-Admin-Secret": adminSecret
    }
  });
}

async function fetchRuntimeActivity() {
  const adminSecret = localStorage.getItem("STC_ADMIN_SECRET");

  if (!adminSecret) {
    throw new Error("missing_STC_ADMIN_SECRET");
  }

  return fetchJson("/v1/runtime/activity", {
    method: "GET",
    headers: {
      "X-Stc-Admin-Secret": adminSecret
    }
  });
}

async function fetchRuntimeIntegrity() {
  const adminSecret = localStorage.getItem("STC_ADMIN_SECRET");

  if (!adminSecret) {
    throw new Error("missing_STC_ADMIN_SECRET");
  }

  return fetchJson("/v1/runtime/integrity", {
    method: "GET",
    headers: {
      "X-Stc-Admin-Secret": adminSecret
    }
  });
}

function normalizeMetrics(payload) {
  const root = payload || {};
  const metrics = root.metrics && typeof root.metrics === "object" ? root.metrics : root;
  const platform = root.platform && typeof root.platform === "object" ? root.platform : {};

  return {
    tokensIssued: firstValue(metrics, ["tokens_issued"], null),
    policyAllowed: firstValue(metrics, ["policy_allowed"], null),
    policyDenied: firstValue(metrics, ["policy_denied"], null),
    sessionsRevoked: firstValue(metrics, ["sessions_revoked"], null),
    activeSessions: firstValue(metrics, ["active_sessions"], firstValue(platform, ["active_sessions"], null)),
    decisionLatency: firstValue(metrics, ["decision_latency_ms"], null),
    opaLatency: firstValue(metrics, ["opa_latency_ms"], null),
    redisLatency: firstValue(metrics, ["redis_latency_ms"], null)
  };
}

function normalizeActivity(payload) {
  const root = payload || {};

  const events =
    firstValue(root, ["events", "activity", "items", "recent_events"], []) || [];

  if (!Array.isArray(events)) {
    return [];
  }

  return events.slice(0, 10).map((event) => ({
    timestamp: firstValue(event, ["timestamp", "ts", "time"], null),
    type: firstValue(event, ["event_type", "type", "decision"], "--"),
    tenant: firstValue(event, ["tenant_id", "tenant"], "--"),
    principal: firstValue(event, ["principal", "subject"], "--"),
    detail: firstValue(event, ["intent", "detail", "message"], "--")
  }));
}

function renderMetrics(metrics) {
  setText("tokens_issued", toDisplayNumber(metrics.tokensIssued));
  setText("policy_allowed", toDisplayNumber(metrics.policyAllowed));
  setText("policy_denied", toDisplayNumber(metrics.policyDenied));
  setText("sessions_revoked", toDisplayNumber(metrics.sessionsRevoked));
  setText("active_sessions", toDisplayNumber(metrics.activeSessions));

  setText("decision_latency", toDisplayNumber(metrics.decisionLatency));
  setText("opa_latency", toDisplayNumber(metrics.opaLatency));
  setText("redis_latency", toDisplayNumber(metrics.redisLatency));
}

function renderRuntimeStatus(integrityResult, metricsResult, activityResult) {
  if (integrityResult.status === "fulfilled") {
    const integrity = integrityResult.value;
    setText("runtime_status", integrity.redis_ok ? "HEALTHY" : "CHECK");
    setText("redis_status", integrity.redis_ok ? "HEALTHY" : "OFFLINE");
    setText("last_checked", formatTime(integrity.timestamp || Math.floor(Date.now() / 1000)));
    return;
  }

  const haveOtherSignals =
    metricsResult.status === "fulfilled" || activityResult.status === "fulfilled";

  setText("runtime_status", haveOtherSignals ? "PARTIAL" : "CHECK");
  setText("redis_status", "--");
  setText("last_checked", new Date().toLocaleString());
}

function renderActivity(events) {
  const table = document.getElementById("activity_table");
  if (!table) return;

  table.innerHTML = "";

  if (!events.length) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty">No recent runtime activity available.</td>
      </tr>
    `;
    return;
  }

  for (const event of events) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${event.timestamp ? formatTime(event.timestamp) : "--"}</td>
      <td>${event.type || "--"}</td>
      <td>${event.tenant || "--"}</td>
      <td>${event.principal || "--"}</td>
      <td>${event.detail || "--"}</td>
    `;

    table.appendChild(tr);
  }
}

function renderFallbacks(results) {
  if (results.metrics.status !== "fulfilled") {
    setText("tokens_issued", "--");
    setText("policy_allowed", "--");
    setText("policy_denied", "--");
    setText("sessions_revoked", "--");
    setText("active_sessions", "--");
    setText("decision_latency", "--");
    setText("opa_latency", "--");
    setText("redis_latency", "--");
  }

  if (results.activity.status !== "fulfilled") {
    renderActivity([]);
  }
}

function renderNotes(results) {
  const notes = [];

  if (results.metrics.status === "fulfilled") {
    notes.push("metrics=available");
  } else {
    notes.push(`metrics_unavailable=${summarizeError(results.metrics.reason)}`);
  }

  if (results.activity.status === "fulfilled") {
    notes.push("activity=available");
  } else {
    notes.push(`activity_unavailable=${summarizeError(results.activity.reason)}`);
  }

  if (results.integrity.status === "fulfilled") {
    notes.push(`integrity=${results.integrity.value.redis_ok ? "healthy" : "check"}`);
  } else {
    notes.push(`integrity_unavailable=${summarizeError(results.integrity.reason)}`);
  }

  setText("observability_notes", notes.join(" | "));
}

async function loadObservability() {
  if (observabilityLoading) return;
  observabilityLoading = true;

  try {
    const [metricsResult, activityResult, integrityResult] = await Promise.allSettled([
      fetchAdminMetrics(),
      fetchRuntimeActivity(),
      fetchRuntimeIntegrity()
    ]);

    const results = {
      metrics: metricsResult,
      activity: activityResult,
      integrity: integrityResult
    };

    if (metricsResult.status === "fulfilled") {
      renderMetrics(normalizeMetrics(metricsResult.value));
    }

    if (activityResult.status === "fulfilled") {
      renderActivity(normalizeActivity(activityResult.value));
    }

    renderRuntimeStatus(integrityResult, metricsResult, activityResult);
    renderFallbacks(results);
    renderNotes(results);

  } catch (err) {
    console.error("Observability load failed:", err);
    setText("observability_notes", `observability_unavailable=${summarizeError(err)}`);
  } finally {
    observabilityLoading = false;
  }
}

function startObservabilityRefresh() {
  loadObservability();

  if (observabilityRefreshHandle) {
    clearInterval(observabilityRefreshHandle);
  }

  observabilityRefreshHandle = setInterval(loadObservability, 10000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startObservabilityRefresh);
} else {
  startObservabilityRefresh();
}
