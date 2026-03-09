if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/tenant-detail.js

const REFRESH_INTERVAL = 10000;

function getTenantId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("tenant");
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toISOString();
}

async function loadSummary(tenantId) {

  const summary = await STC_API.getTenantSummary(tenantId);

  document.getElementById("tenant_id").textContent = tenantId;
  document.getElementById("tenant_status").textContent = summary.status;
  document.getElementById("policy_version").textContent = summary.policy_version;
  document.getElementById("policy_digest").textContent = summary.policy_digest;

  document.getElementById("raw_summary").textContent =
    JSON.stringify(summary, null, 2);

}

async function loadUsage(tenantId) {

  const usage = await STC_API.getTenantUsage(tenantId);

  document.getElementById("usage_tokens").textContent = usage.tokens_issued;
  document.getElementById("usage_denied").textContent = usage.policy_denied;
  document.getElementById("usage_revoked").textContent = usage.sessions_revoked;
  document.getElementById("usage_period").textContent = usage.period;

}

async function loadBilling(tenantId) {

  const billing = await STC_API.getTenantBilling(tenantId);

  document.getElementById("billing_metric").textContent =
    billing.billable_metric;

  document.getElementById("billing_price").textContent =
    billing.unit_price_cents;

  document.getElementById("billing_quantity").textContent =
    billing.quantity;

  document.getElementById("billing_amount").textContent =
    billing.amount_cents;

}

async function loadSessions(tenantId) {

  const res = await STC_API.getTenantSessions(tenantId);
  const table = document.getElementById("session_table");

  table.innerHTML = "";

  res.sessions.forEach(s => {

   const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${s.session_id}</td>
      <td>${s.principal}</td>
      <td>${s.intent}</td>
      <td>${(s.scopes || []).join(", ")}</td>
      <td>${formatTime(s.issued_at)}</td>
      <td>${s.ttl}</td>
      <td>
        <button onclick="revoke('${s.session_id}')">Revoke</button>
      </td>
    `;

    table.appendChild(tr);

  });

}

async function revoke(sessionId) {

  if (!confirm("Revoke session " + sessionId + "?")) return;

  try {

    await STC_API.revokeSession(sessionId);
    alert("Session revoked");

    const tenantId = getTenantId();
    loadSessions(tenantId);

  } catch (err) {

    console.error(err);
    alert("Failed to revoke session");

  }

}

async function refreshTenant() {

  const tenantId = getTenantId();

  await loadSummary(tenantId);
  await loadUsage(tenantId);
  await loadBilling(tenantId);
  await loadSessions(tenantId);

}

async function init() {

  const tenantId = getTenantId();

  if (!tenantId) {
    alert("Tenant ID missing");
    return;
  }

  document.getElementById("tenant_header").textContent =
    "Tenant: " + tenantId;

  try {

    await refreshTenant();

    setInterval(refreshTenant, REFRESH_INTERVAL);

  } catch (err) {

    console.error(err);
    alert("Failed to load tenant data");

  }

}

init();
