const INTELLIGENCE_REFRESH_INTERVAL = 10000;
let intelligenceRefreshHandle = null;
let intelligenceLoading = false;

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = value;
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

function ensureTableEmpty(tableId, emptyId, message, colspan) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;

  if (document.getElementById(emptyId)) return;
  if (tbody.children.length > 0) return;

  const row = document.createElement("tr");
  row.id = emptyId;
  row.innerHTML = `<td colspan="${colspan}" class="empty">${message}</td>`;
  tbody.appendChild(row);
}

function clearTable(tableId) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;
  tbody.innerHTML = "";
}

function renderTenants(tenants) {
  const tbody = document.getElementById("tenant_table");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(tenants) || tenants.length === 0) {
    ensureTableEmpty("tenant_table", "tenant_empty", "No risky tenants detected.", 2);
    return;
  }

  tenants.forEach((t) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.tenant || "--"}</td>
      <td>${t.risk ?? "--"}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderPrincipals(principals) {
  const tbody = document.getElementById("principal_table");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(principals) || principals.length === 0) {
    ensureTableEmpty("principal_table", "principal_empty", "No suspicious principals detected.", 2);
    return;
  }

  principals.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.principal || "--"}</td>
      <td>${p.events ?? "--"}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderSummary(data) {
  const topTenant = Array.isArray(data.top_risky_tenants) && data.top_risky_tenants.length
    ? data.top_risky_tenants[0]
    : null;

  const topPrincipal = Array.isArray(data.suspicious_principals) && data.suspicious_principals.length
    ? data.suspicious_principals[0]
    : null;

  setText("highest_risk_tenant", topTenant ? topTenant.tenant : "none");
  setText(
    "highest_risk_detail",
    topTenant ? `Risk score ${topTenant.risk}` : "No elevated tenant concentration"
  );

  setText("top_principal", topPrincipal ? topPrincipal.principal : "none");
  setText(
    "top_principal_detail",
    topPrincipal ? `${topPrincipal.events} flagged events` : "No suspicious principal concentration"
  );

  const denySpikeDetected = !!(data.deny_spike && data.deny_spike.detected);
  const denySpikeCurrent = data.deny_spike && data.deny_spike.current !== undefined
    ? data.deny_spike.current
    : "--";

  setText("deny_spike", denySpikeDetected ? "DETECTED" : "NORMAL");
  setText(
    "deny_spike_detail",
    denySpikeDetected
      ? `Current deny pressure ${denySpikeCurrent}`
      : `Current deny pressure ${denySpikeCurrent}`
  );

  const driftDetected = !!data.policy_drift;

  setText("policy_drift", driftDetected ? "DRIFT" : "STABLE");
  setText(
    "policy_drift_detail",
    driftDetected ? "Policy drift requires review" : "No policy drift detected"
  );
}

function renderTimestamp(timestampSeconds) {
  const ts = Number(timestampSeconds);
  if (!Number.isFinite(ts)) {
    setText("intelligence_timestamp", "Last Updated: " + new Date().toLocaleString());
    return;
  }

  setText(
    "intelligence_timestamp",
    "Last Updated: " + new Date(ts * 1000).toLocaleString()
  );
}

function renderFailure(err) {
  clearTable("tenant_table");
  clearTable("principal_table");

  ensureTableEmpty("tenant_table", "tenant_empty", "Tenant intelligence unavailable.", 2);
  ensureTableEmpty("principal_table", "principal_empty", "Principal intelligence unavailable.", 2);

  setText("highest_risk_tenant", "--");
  setText("highest_risk_detail", "Risk telemetry unavailable");

  setText("top_principal", "--");
  setText("top_principal_detail", "Principal telemetry unavailable");

  setText("deny_spike", "CHECK");
  setText("deny_spike_detail", "Deny spike signal unavailable");

  setText("policy_drift", "CHECK");
  setText("policy_drift_detail", "Policy drift signal unavailable");

  setText("intelligence_timestamp", "Last Updated: " + new Date().toLocaleString());
  setText("intelligence_notes", `intelligence_unavailable=${summarizeError(err)}`);
}

async function fetchIntelligence() {
  const adminSecret = localStorage.getItem("STC_ADMIN_SECRET");

  if (!adminSecret) {
    throw new Error("missing_STC_ADMIN_SECRET");
  }

  const res = await fetch("/v1/intelligence/risk", {
    method: "GET",
    headers: {
      "X-Stc-Admin-Secret": adminSecret
    }
  });

  if (!res.ok) {
    throw new Error(`/v1/intelligence/risk -> HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("/v1/intelligence/risk -> non-JSON response");
  }

  return res.json();
}

async function loadIntelligence() {
  if (intelligenceLoading) return;
  intelligenceLoading = true;

  try {
    const data = await fetchIntelligence();

    renderSummary(data);
    renderTenants(data.top_risky_tenants || []);
    renderPrincipals(data.suspicious_principals || []);
    renderTimestamp(data.timestamp);

    const notes = [
      `risky_tenants=${Array.isArray(data.top_risky_tenants) ? data.top_risky_tenants.length : 0}`,
      `suspicious_principals=${Array.isArray(data.suspicious_principals) ? data.suspicious_principals.length : 0}`,
      `deny_spike=${data.deny_spike && data.deny_spike.detected ? "detected" : "normal"}`,
      `policy_drift=${data.policy_drift ? "detected" : "stable"}`
    ];

    setText("intelligence_notes", notes.join(" | "));

  } catch (err) {
    console.error("Intelligence load failed:", err);
    renderFailure(err);
  } finally {
    intelligenceLoading = false;
  }
}

function startIntelligence() {
  loadIntelligence();

  if (intelligenceRefreshHandle) {
    clearInterval(intelligenceRefreshHandle);
  }

  intelligenceRefreshHandle = setInterval(loadIntelligence, INTELLIGENCE_REFRESH_INTERVAL);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startIntelligence);
} else {
  startIntelligence();
}
