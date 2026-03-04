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

  const sessionsBody = document.getElementById("sessions-body");

  async function loadSessions() {
    try {
      const data = await STC_API.getActiveSessions();

      if (!data.active_sessions || data.active_sessions.length === 0) {
        sessionsBody.innerHTML = `
        <tr>
          <td colspan="5" class="muted">No active sessions</td>
        </tr>
      `;
        return;
      }

      sessionsBody.innerHTML = data.active_sessions.map(session => `
      <tr>
        <td>${session.sid}</td>
        <td>${session.principal}</td>
        <td>${session.intent}</td>
        <td>${session.ttl_remaining}s</td>
        <td>
          <button class="btn btn-danger" data-sid="${session.sid}">
            Revoke
          </button>
        </td>
      </tr>
    `).join("");

    } catch (e) {
      sessionsBody.innerHTML = `
      <tr>
        <td colspan="5" class="muted">Error loading sessions</td>
        </tr>
    `;
    }
  }

  document.getElementById("refresh-health").addEventListener("click", loadHealth);
  document.getElementById("refresh-audit").addEventListener("click", loadAudit);
  document.getElementById("revoke-btn").addEventListener("click", revokeSession);

  document.getElementById("refresh-sessions")
    .addEventListener("click", loadSessions);

  sessionsBody.addEventListener("click", async (e) => {
    if (e.target.dataset.sid) {
      await STC_API.revokeSession(e.target.dataset.sid);
      loadSessions();
    }
  });

  loadHealth();
  loadAudit();
  loadSessions();
  setInterval(loadSessions, 5000);

});
