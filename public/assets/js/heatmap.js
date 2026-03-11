const REFRESH_INTERVAL = 10000;

function decisionColor(value) {

  if (value > 10) return "status-deny";
  if (value > 0) return "status-warning";
  return "status-ok";

}

async function loadHeatmap() {

  try {

    const res = await STC_API.getRuntimeMetrics();

    const table = document.getElementById("heatmap_table");

    table.innerHTML = "";

    if (!res.decisions) return;

    for (const row of res.decisions) {

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${row.tenant_id}</td>
        <td>${row.intent}</td>
        <td class="status-ok">${row.allow_count}</td>
        <td class="status-deny">${row.deny_count}</td>
        <td class="${decisionColor(row.risk_avg)}">${row.risk_avg || 0}</td>
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
