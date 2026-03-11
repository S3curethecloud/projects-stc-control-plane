const REFRESH_INTERVAL = 10000;

async function loadHeatmap() {

  try {

    const tenants = await STC_API.getTenants();

    const table = document.getElementById("heatmap_table");

    table.innerHTML = "";

    for (const t of tenants.tenants) {

      const usage = await STC_API.getTenantUsage(t.tenant_id);

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${t.tenant_id}</td>
        <td>${usage.tokens_issued || 0}</td>
        <td>${usage.policy_denied || 0}</td>
        <td>${usage.sessions_revoked || 0}</td>
      `;

      table.appendChild(tr);

    }

  } catch (err) {

    console.error("Heatmap load failed:", err);

  }

}

async function init() {

  await loadHeatmap();

  setInterval(loadHeatmap, REFRESH_INTERVAL);

}

init();
