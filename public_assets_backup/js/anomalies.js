const REFRESH_INTERVAL = 10000;

async function loadAnomalies() {

  const res = await STC_API.request("/v1/admin/anomalies");

  const table = document.getElementById("anomaly_table");

  table.innerHTML = "";

  res.anomalies.forEach(a => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${a.tenant_id}</td>
      <td>${a.baseline}</td>
      <td>${a.current}</td>
      <td>${a.threshold}</td>
    `;

    table.appendChild(row);

  });

}

async function refresh() {

  try {
    await loadAnomalies();
  } catch (err) {
    console.error(err);
  }

}

async function init() {

  await refresh();

  setInterval(refresh, REFRESH_INTERVAL);

}

init();
