document.addEventListener("DOMContentLoaded", () => {

  const healthEl = document.getElementById("health-status");
  const auditEl = document.getElementById("audit-status");
  const revokeEl = document.getElementById("revoke-result");

  const introspectResultEl = document.getElementById("introspect-result");
  const introspectTokenEl = document.getElementById("introspect-token");

  const sessionsBody = document.getElementById("sessions-body");

  function formatTTL(ttl) {
    const m = Math.floor(ttl / 60);
    const s = ttl % 60;
    return `${m}:${s.toString().padStart(2,"0")}`;
  }

  function maskSID(sid){
    if (!sid || sid.length < 18) return sid;
    return sid.slice(0,12) + "…" + sid.slice(-6);
  }

  function statusColor(status){
    switch(status){
      case "ACTIVE":
        return "green";
      case "DENY":
        return "red";
      case "REVOKED":
        return "orange";
      case "EXPIRED":
        return "gray";
      default:
        return "white";
    }
  }

  async function loadHealth() {
    try {
      const data = await STC_API.getHealth();

      healthEl.textContent = `Status: ${data.status}`;

      document.getElementById("metric-runtime").textContent = data.status;
      document.getElementById("metric-policy").textContent = data.policy_rev ?? "—";

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

  async function introspectToken() {
    const token = introspectTokenEl.value.trim();

    if (!token) {
      introspectResultEl.textContent = "Token required.";
      return;
    }

    introspectResultEl.textContent = "Checking...";

    try {

      const data = await STC_API.introspectToken(token);

      const scopes = Array.isArray(data.scopes) ? data.scopes.join(", ") : "";
      const exp = data.expires_at ? new Date(data.expires_at * 1000).toISOString() : "n/a";
      const rev = data.policy_revision ?? "n/a";

      const color = statusColor(data.status);

      introspectResultEl.innerHTML =
        `<span style="color:${color}">
        Status: ${data.status}
        </span> • Principal: ${data.principal}
        • Intent: ${data.intent}
        • Expires: ${exp}
        • Policy: ${rev}` +
        (scopes ? ` • Scopes: ${scopes}` : "");

    } catch (e) {
      introspectResultEl.textContent = `Error: ${e.message}`;
    }
  }

  async function loadSessions() {

    try {

      const data = await STC_API.getActiveSessions();

      document.getElementById("metric-sessions").textContent = data.count;

      if (!data.active_sessions || data.active_sessions.length === 0) {

        sessionsBody.innerHTML = `
        <tr>
          <td colspan="5" class="muted">No active sessions</td>
        </tr>
        `;
        return;
      }

      sessionsBody.innerHTML = data.active_sessions.map(session => {

        return `
        <tr>
          <td>${maskSID(session.sid)}</td>
          <td>${session.principal}</td>
          <td>${session.intent}</td>
          <td class="ttl" data-ttl="${session.ttl_remaining}">
            ${formatTTL(session.ttl_remaining)}
          </td>
          <td>
            <button class="btn btn-danger" data-sid="${session.sid}">
              Revoke
            </button>
          </td>
        </tr>
        `;

      }).join("");

    } catch (e) {

      sessionsBody.innerHTML = `
      <tr>
        <td colspan="5" class="muted">Error loading sessions</td>
      </tr>
      `;
    }
  }

  function tickTTL(){

    const cells = document.querySelectorAll(".ttl");

    cells.forEach(cell => {

      let ttl = parseInt(cell.dataset.ttl,10);

      if (ttl > 0){
        ttl -= 1;
        cell.dataset.ttl = ttl;
        cell.textContent = formatTTL(ttl);
      }

    });

  }

  document.getElementById("refresh-health")
    .addEventListener("click", loadHealth);

  document.getElementById("refresh-audit")
    .addEventListener("click", loadAudit);

  document.getElementById("revoke-btn")
    .addEventListener("click", revokeSession);

  document.getElementById("introspect-btn")
    .addEventListener("click", introspectToken);

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

  setInterval(() => {
    if (introspectTokenEl.value.trim()) {
      introspectToken();
    }
  }, 5000);

  setInterval(tickTTL,1000);

});
