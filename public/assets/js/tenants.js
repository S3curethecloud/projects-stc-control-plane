if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

function formatTime(ts) {
  if (!ts) return "--";
  return new Date(ts * 1000).toISOString();
}

function summarizeError(err) {
  const raw = String(err && err.message ? err.message : err || "unknown_error");
  return raw.length > 140 ? raw.slice(0, 140) : raw;
}

function setTenantNotes(message) {
  const el = document.getElementById("tenant_notes");
  if (!el) return;
  el.textContent = message;
}

function renderEmptyTenants(message) {
  const table = document.getElementById("tenant_table");
  if (!table) return;

  table.innerHTML = `
    <tr id="tenant_empty">
      <td colspan="6" class="empty">${message}</td>
    </tr>
  `;
}

function buildTenantRow(tenant) {
  const tr = document.createElement("tr");

  const tenantId = tenant.tenant_id || "--";
  const encodedTenantId = encodeURIComponent(tenantId);

  tr.innerHTML = `
    <td>
      <div>${tenantId}</div>
      <button
        type="button"
        class="button tenant-copy-btn"
        data-tenant-id="${tenantId}"
        style="margin-top:8px"
      >
        Copy
      </button>
    </td>
    <td>${tenant.label || "--"}</td>
    <td>${tenant.status || "--"}</td>
    <td>${tenant.policy_version || "--"}</td>
    <td>${formatTime(tenant.created_at)}</td>
    <td>
      <a href="tenant-detail.html?tenant=${encodedTenantId}">Open</a>
      |
      <a href="sessions.html?tenant=${encodedTenantId}">Sessions</a>
      |
      <a href="usage.html?tenant=${encodedTenantId}">Usage</a>
    </td>
  `;

  return tr;
}

async function copyTenantId(value) {
  try {
    await navigator.clipboard.writeText(value);
    setTenantNotes(`Copied tenant ID: ${value}`);
  } catch (err) {
    console.error("Copy failed:", err);
    setTenantNotes(`Copy failed for tenant ID: ${value}`);
  }
}

async function loadTenants() {
  const table = document.getElementById("tenant_table");
  if (!table) return;

  table.innerHTML = "";

  try {
    const res = await STC_API.getTenants();
    const tenants = Array.isArray(res.tenants) ? res.tenants : [];

    if (!tenants.length) {
      renderEmptyTenants("No tenants available.");
      setTenantNotes("Tenant inventory is empty.");
      return;
    }

    tenants.forEach((tenant) => {
      table.appendChild(buildTenantRow(tenant));
    });

    setTenantNotes(`Loaded ${tenants.length} tenants.`);
  } catch (err) {
    console.error("Tenant load error:", err);
    renderEmptyTenants("Tenant inventory unavailable.");
    setTenantNotes(`Tenant load failed: ${summarizeError(err)}`);
  }
}

function bindTenantActions() {
  const refreshBtn = document.getElementById("refresh-tenants-btn");
  const table = document.getElementById("tenant_table");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadTenants);
  }

  if (table) {
    table.addEventListener("click", async (event) => {
      const button = event.target.closest(".tenant-copy-btn");
      if (!button) return;

      const tenantId = button.dataset.tenantId;
      if (!tenantId) return;

      await copyTenantId(tenantId);
    });
  }
}

function init() {
  bindTenantActions();
  loadTenants();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
