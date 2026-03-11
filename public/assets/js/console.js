if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

const REFRESH_INTERVAL = 10000;

async function loadRuntime() {

  const runtime = await STC_API.getAdminRuntime();

  document.getElementById("runtime_status").textContent = runtime.status;
  document.getElementById("redis_status").textContent = runtime.redis;
  document.getElementById("policy_revision").textContent = runtime.policy_revision;
  document.getElementById("tenant_count").textContent = runtime.tenant_count;
  document.getElementById("active_sessions").textContent = runtime.active_sessions;
}

async function loadMetrics() {

  const metrics = await STC_API.getAdminMetrics();

  document.getElementById("tokens_issued").textContent = metrics.tokens_issued;
  document.getElementById("policy_denied").textContent = metrics.policy_denied;
  document.getElementById("sessions_revoked").textContent = metrics.sessions_revoked;
}

async function loadTenants() {

  const res = await STC_API.getTenants();
  const table = document.getElementById("tenant_table");

  table.innerHTML = "";

  document.getElementById("tenant_count").textContent = res.tenants.length;

  res.tenants.forEach(t => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${t.tenant_id}</td>
      <td>${t.label || ""}</td>
      <td>${t.status || ""}</td>
      <td>${t.policy_version || ""}</td>
      <td>${new Date(t.created_at * 1000).toISOString()}</td>
      <td><a href="tenant-detail.html?tenant=${t.tenant_id}">Open</a></td>
    `;

    table.appendChild(tr);

  });
}

async function refreshConsole() {
  await loadRuntime();
  await loadMetrics();
  await loadTenants();
}

async function init() {

  try {

    await refreshConsole();

    setInterval(refreshConsole, REFRESH_INTERVAL);

  } catch (err) {

    console.error("Console load error:", err);
    alert("Failed to load platform data");

  }

}

init();
