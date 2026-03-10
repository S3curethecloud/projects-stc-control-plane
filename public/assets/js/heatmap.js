const REFRESH_INTERVAL = 10000;

function denialClass(denied) {

  if (denied === 0) return "heat-low";
  if (denied < 5) return "heat-medium";
  if (denied < 20) return "heat-high";

  return "heat-critical";

}

async function loadHeatmap() {

  const res = await STC_API.request("/v1/admin/decision-heatmap");

  const table = document.getElementById("heatmap_table");

  table.innerHTML = "";

  res.tenants.forEach(t => {

    const row = document.createElement("tr");

    const denialStyle = denialClass(t.policy_denied);

    row.innerHTML = `
      <td>${t.tenant_id}</td>
      <td>${t.tokens_issued}</td>
      <td class="${denialStyle}">${t.policy_denied}</td>
      <td>${t.sessions_revoked}</td>
    `;

    table.appendChild(row);

  });

}

async function refresh() {

  try {
    await loadHeatmap();
  } catch (err) {
    console.error(err);
  }

}

async function init() {

  await refresh();

  setInterval(refresh, REFRESH_INTERVAL);

}

init();
