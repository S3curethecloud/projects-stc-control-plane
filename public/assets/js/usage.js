if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "/index.html";
}

const USAGE_REFRESH_INTERVAL = 20000;
const DEFAULT_BILLABLE_METRIC = "tokens_issued";

let cachedTenants = [];
let usageRefreshHandle = null;
let usageLoading = false;

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

  return raw.length > 140 ? raw.slice(0, 140) : raw;
}

function updateLastChecked() {
  setText("usage_last_checked", new Date().toLocaleString());
}

async function populateTenantSelector() {
  const res = await STC_API.getTenants();
  const select = document.getElementById("tenant_selector");

  cachedTenants = Array.isArray(res.tenants) ? res.tenants : [];
  select.innerHTML = "";

  cachedTenants.forEach((tenant) => {
    const opt = document.createElement("option");
    opt.value = tenant.tenant_id;
    opt.textContent = tenant.tenant_id;
    select.appendChild(opt);
  });

  if (cachedTenants.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No tenants available";
    select.appendChild(opt);
  }
}

async function loadPlatformMetrics() {
  const metrics = await STC_API.getAdminMetrics();

  setText("platform_tokens", metrics.tokens_issued ?? "--");
  setText("platform_denied", metrics.policy_denied ?? "--");
  setText("platform_revoked", metrics.sessions_revoked ?? "--");
  setText("platform_sessions", metrics.active_sessions ?? "--");

  const tenantCount =
    metrics.tenant_count ??
    (Array.isArray(cachedTenants) ? cachedTenants.length : "--");

  setText("platform_tenants", tenantCount);
}

async function loadTenantUsage() {
  const tenantId = document.getElementById("tenant_selector").value;

  if (!tenantId) {
    setText("usage_notes", "usage_idle=no_tenant_selected");
    return;
  }

  const usage = await STC_API.getTenantUsage(tenantId);

  setText("tenant_tokens", usage.tokens_issued ?? 0);
  setText("tenant_denied", usage.policy_denied ?? 0);
  setText("tenant_revoked", usage.sessions_revoked ?? 0);
  setText("tenant_period", usage.period || "current_period");

  // Deterministic fallback preview
  let billableMetric = DEFAULT_BILLABLE_METRIC;
  let unitPriceCents = "--";
  let quantity = usage.tokens_issued ?? 0;
  let amountCents = "--";
  let billingNotes = "billing_preview=fallback_tokens_only";

  if (STC_API && typeof STC_API.getTenantBilling === "function") {
    try {
      const billing = await STC_API.getTenantBilling(tenantId);

      billableMetric = billing.billable_metric ?? DEFAULT_BILLABLE_METRIC;
      unitPriceCents = billing.unit_price_cents ?? "--";
      quantity = billing.quantity ?? quantity;
      amountCents = billing.amount_cents ?? "--";
      billingNotes = "billing_preview=backend_available";
    } catch (err) {
      billingNotes = `billing_preview_unavailable=${summarizeError(err)}`;
    }
  } else {
    billingNotes = "billing_preview_unavailable=missing_STC_API_getTenantBilling";
  }

  setText("billing_metric", billableMetric);
  setText("billing_price", unitPriceCents);
  setText("billing_quantity", quantity);
  setText("billing_amount", amountCents);

  setText(
    "usage_notes",
    [
      `selected_tenant=${tenantId}`,
      `tokens=${usage.tokens_issued ?? 0}`,
      `policy_denied=${usage.policy_denied ?? 0}`,
      `sessions_revoked=${usage.sessions_revoked ?? 0}`,
      billingNotes
    ].join(" | ")
  );
}

async function refreshUsage() {
  if (usageLoading) return;
  usageLoading = true;

  try {
    if (!cachedTenants.length) {
      await populateTenantSelector();
    }

    await loadPlatformMetrics();

    const selector = document.getElementById("tenant_selector");
    if (selector && selector.value) {
      await loadTenantUsage();
    }

    updateLastChecked();
  } catch (err) {
    console.error("Usage page load error:", err);
    setText("usage_notes", `usage_unavailable=${summarizeError(err)}`);
    updateLastChecked();
  } finally {
    usageLoading = false;
  }
}

async function initUsage() {
  const loadButton = document.getElementById("load_usage_btn");

  if (loadButton) {
    loadButton.addEventListener("click", loadTenantUsage);
  }

  await populateTenantSelector();

  const selector = document.getElementById("tenant_selector");
  if (selector && selector.options.length > 0 && selector.value) {
    await loadTenantUsage();
  }

  await refreshUsage();

  if (usageRefreshHandle) {
    clearInterval(usageRefreshHandle);
  }

  usageRefreshHandle = setInterval(refreshUsage, USAGE_REFRESH_INTERVAL);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUsage);
} else {
  initUsage();
}
