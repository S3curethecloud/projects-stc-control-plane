document.addEventListener("DOMContentLoaded", () => {

  const healthEl = document.getElementById("health-status");
  const auditEl = document.getElementById("audit-status");
  const revokeEl = document.getElementById("revoke-result");

  async function loadHealth() {
    try {
      const data = await STC_API.getHealth();
      healthEl.textContent = `Status: ${data.status}`;
    } catch (e) {
      healthEl.textContent = `Error: ${e.message}`;
    }
  }

  async function loadAudit() {
    try {
      const data = await STC_API.verifyAudit();
      auditEl.textContent =
        `Chain Status: ${data.status} • Events Verified: ${data.events_verified}`;
    } catch (e) {
      auditEl.textContent = `Error: ${e.message}`;
    }
  }

  async function revokeSession() {
    const sid = document.getElementById("session-id").value.trim();
    if (!sid) {
      revokeEl.textContent = "Session ID required.";
      return;
    }

    try {
      const data = await STC_API.revokeSession(sid);
      revokeEl.textContent = `Deleted: ${data.deleted}`;
    } catch (e) {
      revokeEl.textContent = `Error: ${e.message}`;
    }
  }

  document.getElementById("refresh-health").addEventListener("click", loadHealth);
  document.getElementById("refresh-audit").addEventListener("click", loadAudit);
  document.getElementById("revoke-btn").addEventListener("click", revokeSession);

  loadHealth();
  loadAudit();

});
