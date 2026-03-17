if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

const REFRESH_INTERVAL = 10000;
let tenantRefreshHandle = null;
let tenantLoading = false;

function getTenantId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("tenant");
}

function formatTime(ts) {
  if (!ts) return "--";
  return new Date(ts * 1000).toISOString();
}

function summarizeError(err) {
  const raw = String(err && err.message ? err.message : err || "unknown_error");
  return raw.length > 140 ? raw.slice(0, 140) : raw;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

function setTenantDetailNotes(message) {
  setText("tenant_detail_notes", message);
}

function renderEmptySessions(message) {
  const table = document.getElementById("session_table");
  if (!table) return;

  table.innerHTML = `
    <tr id="session_empty">
      <td colspan="7" class="empty">${message}</td>
    </tr>
  `;
}

async function loadSummary(tenantId) {
  const summary = await STC_API.getTenantSummary(tenantId);

  setText("tenant_id", tenantId);
  setText("tenant_status", summary.status || "--");
  setText("policy_version", summary.policy_version || "--");
  setText("policy_digest", summary.policy_digest || "--");
  setText("raw_summary", JSON.stringify(summary, null, 2));
}

async function loadUsage(tenantId) {
  const usage = await STC_API.getTenantUsage(tenantId);

  setText("usage_tokens", usage.tokens_issued ?? "--");
  setText("usage_denied", usage.policy_denied ?? "--");
  setText("usage_revoked", usage.sessions_revoked ?? "--");
  setText("usage_period", usage.period || "current_period");
}

async function loadBilling(tenantId) {
  const billing = await STC_API.getTenantBilling(tenantId);

  setText("billing_metric", billing.billable_metric || "--");
  setText("billing_price", billing.unit_price_cents ?? "--");
  setText("billing_quantity", billing.quantity ?? "--");
  setText("billing_amount", billing.amount_cents ?? "--");
}

async function loadSessions(tenantId) {
  const res = await STC_API.getTenantSessions(tenantId);
  const table = document.getElementById("session_table");

  if (!table) return;

  table.innerHTML = "";

  const sessions = Array.isArray(res.sessions) ? res.sessions : [];

  if (!sessions.length) {
    renderEmptySessions("No active sessions for this tenant.");
    return;
  }

  sessions.forEach((s) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${s.session_id || "--"}</td>
      <td>${s.principal || "--"}</td>
      <td>${s.intent || "--"}</td>
      <td>${Array.isArray(s.scopes) ? s.scopes.join(", ") : "--"}</td>
      <td>${formatTime(s.issued_at)}</td>
      <td>${s.ttl ?? "--"}</td>
      <td>
        <button
          type="button"
          class="button revoke-session-btn"
          data-session-id="${s.session_id || ""}"
        >
          Revoke
        </button>
      </td>
    `;

    table.appendChild(tr);
  });
}

async function revokeSession(sessionId) {
  const tenantId = getTenantId();

  if (!tenantId || !sessionId) return;

  const approved = window.confirm(`Revoke session ${sessionId}?`);
  if (!approved) {
    setTenantDetailNotes(`Revoke cancelled for session ${sessionId}.`);
    return;
  }

  try {
    await STC_API.revokeSession(sessionId);
    setTenantDetailNotes(`Session revoked: ${sessionId}`);
    await refreshTenant();
  } catch (err) {
    console.error("Session revoke failed:", err);
    setTenantDetailNotes(`Session revoke failed: ${summarizeError(err)}`);
  }
}

async function refreshTenant() {
  if (tenantLoading) return;

  const tenantId = getTenantId();
  if (!tenantId) {
    setTenantDetailNotes("Tenant ID missing from query string.");
    return;
  }

  tenantLoading = true;

  const results = await Promise.allSettled([
    loadSummary(tenantId),
    loadUsage(tenantId),
    loadBilling(tenantId),
    loadSessions(tenantId)
  ]);

  const failures = results.filter((r) => r.status === "rejected");

  if (failures.length === 0) {
    setTenantDetailNotes(`Tenant detail refreshed for ${tenantId}.`);
  } else {
    failures.forEach((failure) => {
      console.error("Tenant detail section failed:", failure.reason);
    });
    setTenantDetailNotes(
      `Partial refresh for ${tenantId}: ${failures.length} section(s) unavailable.`
    );
  }

  tenantLoading = false;
}

function bindTenantDetailActions() {
  const refreshBtn = document.getElementById("refresh-tenant-btn");
  const sessionTable = document.getElementById("session_table");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshTenant);
  }

  if (sessionTable) {
    sessionTable.addEventListener("click", async (event) => {
      const button = event.target.closest(".revoke-session-btn");
      if (!button) return;

      const sessionId = button.dataset.sessionId;
      if (!sessionId) return;

      await revokeSession(sessionId);
    });
  }
}

function init() {
  const tenantId = getTenantId();

  if (!tenantId) {
    setTenantDetailNotes("Tenant ID missing.");
    return;
  }

  setText("tenant_header", `Tenant: ${tenantId}`);
  setText("tenant_id", tenantId);

  bindTenantDetailActions();
  refreshTenant();

  if (tenantRefreshHandle) {
    clearInterval(tenantRefreshHandle);
  }

  tenantRefreshHandle = setInterval(refreshTenant, REFRESH_INTERVAL);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
