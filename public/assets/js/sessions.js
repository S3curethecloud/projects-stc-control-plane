if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/sessions.js

const REFRESH_INTERVAL = 5000;

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toISOString();
}

async function loadSessions() {

  const res = await STC_API.getActiveSessions();
  const table = document.getElementById("sessions_table");

  table.innerHTML = "";

  const sessions = res.sessions || res.active_sessions || [];

  sessions.forEach(s => {

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
        <button onclick="revoke('${s.session_id}')">Revoke</button>
      </td>
    `;

    table.appendChild(tr);

  });

}

async function revoke(sessionId) {

  const confirmed = confirm(
    "Revoke session " + sessionId + " ?"
  );

  if (!confirmed) return;

  try {

    await STC_API.revokeSession(sessionId);

    alert("Session revoked");

    await loadSessions();

  } catch (err) {

    console.error(err);
    alert("Failed to revoke session");

  }

}

function copy(value) {

  navigator.clipboard.writeText(value)
    .then(() => alert("Copied: " + value))
    .catch(() => alert("Copy failed"));

}

async function refreshSessionsLoop() {
  await loadSessions();
}

async function init() {

  try {

    await refreshSessionsLoop();

    setInterval(refreshSessionsLoop, REFRESH_INTERVAL);

  } catch (err) {

    console.error("Session load error:", err);
    alert("Failed to load sessions");

  }

}

init();
