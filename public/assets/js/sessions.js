if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/sessions.js

const REFRESH_INTERVAL = 5000;

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toISOString();
}

function attachSessionHandlers() {

  document.querySelectorAll(".revoke-button").forEach((button) => {

    button.addEventListener("click", async () => {

      const sessionId = button.getAttribute("data-session-id");

      try {
        await STC_API.revokeSession(sessionId);
        await loadSessions();

      } catch (err) {
        console.error("Revoke failed", err);
      }

    });

  });

}

function attachToolbarHandlers() {

  const btn = document.getElementById("refresh_sessions_btn");

  if (!btn) return;

  btn.addEventListener("click", async () => {
    await loadSessions();
  });

}

async function loadSessions() {

  const tenant = localStorage.getItem("STC_TENANT_ID");
  const res = await STC_API.getTenantSessions(tenant);
  const table = document.getElementById("sessions_table");

  table.innerHTML = "";

  const sessions = res.sessions || res.active_sessions || [];

  sessions.forEach((s) => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        ${s.session_id}
        <button onclick="copy('${s.session_id}')">Copy</button>
      </td>

      <td>${s.principal}</td>

      <td>${s.intent}</td>

      <td>${(s.scopes || []).join(", ")}</td>

      <td>${formatTime(s.issued_at)}</td>

      <td>${s.ttl}</td>

      <td>
        <button class="revoke-button" data-session-id="${s.session_id}">
          Revoke
        </button>
      </td>
    `;

    table.appendChild(tr);

  });

  attachSessionHandlers();

}

function copy(value) {

  navigator.clipboard.writeText(value)
    .then(() => alert("Copied: " + value))
    .catch(() => alert("Copy failed"));

}

async function refreshSessionsLoop() {
  await loadSessions();
}

document.addEventListener("DOMContentLoaded", () => {

  attachToolbarHandlers();
  loadSessions();

  setInterval(refreshSessionsLoop, REFRESH_INTERVAL);

});
