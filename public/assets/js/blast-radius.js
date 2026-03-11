async function loadBlastRadius() {

  const sessions = await STC_API.getActiveSessions();

  const table = document.getElementById("blast_table");

  table.innerHTML = "";

  for (const s of sessions.sessions) {

    const impact = computeImpact(s.intent);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${formatTime(s.issued_at)}</td>
      <td>${s.principal}</td>
      <td>${s.intent}</td>
      <td>${s.tenant_id}</td>
      <td>allow</td>
      <td>${impact}</td>
    `;

    table.appendChild(row);

  }

}

function computeImpact(intent) {

  if (!intent) return "application";

  if (intent.includes("refund"))
    return "billing-system";

  if (intent.includes("token"))
    return "identity-system";

  if (intent.includes("session"))
    return "auth-system";

  return "application";

}

function formatTime(ts) {

  if (!ts) return "";

  return new Date(ts * 1000).toLocaleString();

}

async function init() {

  await loadBlastRadius();

}

init();
