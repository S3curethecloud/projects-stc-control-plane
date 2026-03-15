async function loadHeatmap() {

  const tenantsRes = await STC_API.getTenants();
  const tenants = tenantsRes.tenants || [];

  const tbody = document.getElementById("heatmap_table_body");

  tbody.innerHTML = "";

  let totalIssued = 0;
  let totalDenied = 0;
  let totalRevoked = 0;

  for (const tenant of tenants) {

    const usage = await STC_API.getTenantUsage(tenant.tenant_id);

    const issued = usage.tokens_issued ?? 0;
    const denied = usage.policy_denied ?? 0;
    const revoked = usage.sessions_revoked ?? 0;
    const risk = usage.risk_score ?? "--";

    totalIssued += issued;
    totalDenied += denied;
    totalRevoked += revoked;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${tenant.tenant_id}</td>
      <td>${issued}</td>
      <td>${denied}</td>
      <td>${revoked}</td>
      <td>${risk}</td>
    `;

    tbody.appendChild(row);

  }

  document.getElementById("total_tokens_issued").textContent = totalIssued;
  document.getElementById("total_policy_denied").textContent = totalDenied;
  document.getElementById("total_sessions_revoked").textContent = totalRevoked;

}

document.addEventListener("DOMContentLoaded", loadHeatmap);
