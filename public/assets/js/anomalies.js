const REFRESH_INTERVAL = 10000;

async function loadIntelligence() {

  const res = await fetch("https://ztr-runtime.fly.dev/v1/intelligence/risk");
  const data = await res.json();

  const tenantTable = document.getElementById("tenant_table");
  const principalTable = document.getElementById("principal_table");
  const policyDrift = document.getElementById("policy_drift");
  const timestamp = document.getElementById("intelligence_timestamp");

  tenantTable.innerHTML = "";
  principalTable.innerHTML = "";

  data.top_risky_tenants.forEach(t => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.tenant}</td>
      <td>${t.risk}</td>
    `;
    tenantTable.appendChild(row);
  });

  data.suspicious_principals.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.principal}</td>
      <td>${p.events}</td>
    `;
    principalTable.appendChild(row);
  });

  policyDrift.textContent = data.policy_drift ? "Drift detected" : "No drift detected";
  timestamp.textContent = "Last Updated: " + new Date(data.timestamp * 1000).toLocaleString();
}

async function refresh() {
  try {
    await loadIntelligence();
  } catch (err) {
    console.error("Intelligence load failed:", err);
  }
}

async function init() {
  await refresh();
  setInterval(refresh, REFRESH_INTERVAL);
}

init();
