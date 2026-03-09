if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/tenants.js

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toISOString();
}

async function loadTenants() {

  const res = await STC_API.getTenants();
  const table = document.getElementById("tenant_table");

  table.innerHTML = "";

  res.tenants.forEach(t => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        ${t.tenant_id}
        <button onclick="copyText('${t.tenant_id}')">Copy</button>
      </td>

      <td>${t.label || ""}</td>

      <td>${t.status || ""}</td>

      <td>${t.policy_version || ""}</td>

      <td>${formatTime(t.created_at)}</td>

      <td>
        <a href="tenant-detail.html?tenant=${t.tenant_id}">Open</a>
        |
        <a href="sessions.html?tenant=${t.tenant_id}">Sessions</a>
        |
        <a href="usage.html?tenant=${t.tenant_id}">Usage</a>
      </td>
    `;

    table.appendChild(tr);

  });

}

function refreshTenants() {
  loadTenants();
}

function copyText(value) {

  navigator.clipboard.writeText(value)
    .then(() => alert("Copied: " + value))
    .catch(() => alert("Copy failed"));

}

async function init() {

  try {

    await loadTenants();

  } catch (err) {

    console.error("Tenant load error:", err);
    alert("Failed to load tenants");

  }

}

init();
