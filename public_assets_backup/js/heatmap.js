const REFRESH_INTERVAL = 10000;

async function loadHeatmap() {

  try {

    const tenants = await STC_API.getTenants();

    const table = document.getElementById("heatmap_table");

    table.innerHTML = "";

    let totalTokens = 0;
    let totalDenied = 0;
    let totalRevoked = 0;

    for (const t of tenants.tenants) {

      const usage = await STC_API.getTenantUsage(t.tenant_id);

      const tokens = usage.tokens_issued || 0;
      const denied = usage.policy_denied || 0;
      const revoked = usage.sessions_revoked || 0;

      const risk = denied * 5 + revoked * 3;

      totalTokens += tokens;
      totalDenied += denied;
      totalRevoked += revoked;

      const tr = document.createElement("tr");

      let riskClass = "";

      if (risk > 20) riskClass = "status-deny";
      else if (risk > 5) riskClass = "status-warning";

      tr.innerHTML = `
        <td>${t.tenant_id}</td>
        <td>${tokens}</td>
        <td>${denied}</td>
        <td>${revoked}</td>
        <td class="${riskClass}">${risk}</td>
      `;

      table.appendChild(tr);

    }

    document.getElementById("total_tokens").textContent = totalTokens;
    document.getElementById("total_denied").textContent = totalDenied;
    document.getElementById("total_revoked").textContent = totalRevoked;

  } catch (err) {

    console.error("Heatmap load failed:", err);

  }

}

async function init() {

  await loadHeatmap();

  setInterval(loadHeatmap, REFRESH_INTERVAL);

}

init();
