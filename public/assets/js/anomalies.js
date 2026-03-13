const REFRESH_INTERVAL = 10000;

async function loadAnomalies() {

  const res = await fetch("https://ztr-runtime.fly.dev/v1/intelligence/risk");
  const data = await res.json();

  const table = document.getElementById("anomaly_table");

  table.innerHTML = "";

  data.top_risky_tenants.forEach(t => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${t.tenant}</td>
      <td>${t.risk}</td>
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
