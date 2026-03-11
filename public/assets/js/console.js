if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

const REFRESH_INTERVAL = 10000;

async function loadRuntime() {

  const runtime = await STC_API.getAdminRuntime();

  document.getElementById("runtime_status").textContent = runtime.status;
  document.getElementById("redis_status").textContent = runtime.redis;
  document.getElementById("policy_revision").textContent = runtime.policy_revision;
  document.getElementById("active_sessions").textContent = runtime.active_sessions;

}

async function loadMetrics() {

  const res = await STC_API.getAdminMetrics();

  const metrics = res.metrics || res;
  const platform = res.platform || {};

  document.getElementById("tokens_issued").textContent =
    metrics.tokens_issued ?? "--";

  document.getElementById("policy_denied").textContent =
    metrics.policy_denied ?? "--";

  document.getElementById("sessions_revoked").textContent =
    metrics.sessions_revoked ?? "--";

  if (platform.tenant_count !== undefined) {
    document.getElementById("tenant_count").textContent =
      platform.tenant_count;
  }

}

async function loadTenants() {

  const res = await STC_API.getTenants();
  const table = document.getElementById("tenant_table");

  table.innerHTML = "";

  for (const t of res.tenants) {

    const summary = await STC_API.getTenantSummary(t.tenant_id);

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${t.tenant_id}</td>
      <td>${t.label || ""}</td>
      <td>${summary.status || "active"}</td>
      <td>${summary.policy_version || "v1"}</td>
      <td>${new Date(t.created_at * 1000).toISOString()}</td>
      <td><a href="tenant-detail.html?tenant=${t.tenant_id}">Open</a></td>
    `;

    table.appendChild(tr);

  }

}

async function refreshConsole() {
  try {
    await loadRuntime();
    await loadMetrics();
  } catch (err) {
    console.error("Refresh error:", err);
  }
}

async function init() {

  try {

    await loadTenants();
    await refreshConsole();

    setInterval(refreshConsole, REFRESH_INTERVAL);

  } catch (err) {

    console.error("Console load error:", err);
    alert("Failed to load platform data");

  }

}

init();
