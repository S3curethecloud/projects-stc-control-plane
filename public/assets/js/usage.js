if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/usage.js

const REFRESH_INTERVAL = 20000;

async function loadPlatformMetrics() {

  const metrics = await STC_API.getAdminMetrics();

  document.getElementById("platform_tokens").textContent =
    metrics.tokens_issued;

  document.getElementById("platform_denied").textContent =
    metrics.policy_denied;

  document.getElementById("platform_revoked").textContent =
    metrics.sessions_revoked;

  document.getElementById("platform_tenants").textContent =
    metrics.tenant_count;

  document.getElementById("platform_sessions").textContent =
    metrics.active_sessions;
}

async function populateTenantSelector() {

  const res = await STC_API.getTenants();
  const select = document.getElementById("tenant_selector");

  select.innerHTML = "";

  res.tenants.forEach(t => {

    const opt = document.createElement("option");
    opt.value = t.tenant_id;
    opt.textContent = t.tenant_id;

    select.appendChild(opt);

  });

}

async function loadTenantUsage() {

  const tenantId = document.getElementById("tenant_selector").value;

  if (!tenantId) return;

  const usage = await STC_API.getTenantUsage(tenantId);

  document.getElementById("tenant_tokens").textContent =
    usage.tokens_issued;

  document.getElementById("tenant_denied").textContent =
    usage.policy_denied;

  document.getElementById("tenant_revoked").textContent =
    usage.sessions_revoked;

  document.getElementById("tenant_period").textContent =
    usage.period;

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

async function refreshUsage() {

  await loadPlatformMetrics();

}

async function init() {

  try {

    await populateTenantSelector();
    await refreshUsage();

    setInterval(refreshUsage, REFRESH_INTERVAL);

  } catch (err) {

    console.error("Usage page load error:", err);
    alert("Failed to load usage data");

  }

}

init();
