if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/runtime.js

const REFRESH_INTERVAL = 15000;

async function loadRuntimeDiagnostics() {
  const [runtime, tenantsRes, metrics] = await Promise.all([
    STC_API.getAdminRuntime(),
    STC_API.getTenants(),
    STC_API.getAdminMetrics()
  ]);

  document.getElementById("runtime_status").textContent =
    runtime.status || "--";

  document.getElementById("redis_status").textContent =
    runtime.redis || "--";

  document.getElementById("policy_revision").textContent =
    runtime.policy_revision || "--";

  document.getElementById("tenant_count").textContent =
    Array.isArray(tenantsRes.tenants) ? tenantsRes.tenants.length : 0;

  document.getElementById("active_sessions").textContent =
    metrics.active_sessions ?? runtime.active_sessions ?? 0;

  document.getElementById("runtime_period").textContent =
    "current_period";
}

async function refreshRuntime() {
  await loadRuntimeDiagnostics();
}

async function init() {
  try {
    await refreshRuntime();
    setInterval(refreshRuntime, REFRESH_INTERVAL);
  } catch (err) {
    console.error("Runtime load error:", err);
  }
}

init();
