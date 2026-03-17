if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/sessions.js

const REFRESH_INTERVAL = 5000;
let sessionsRefreshHandle = null;
let sessionsLoading = false;

function formatTime(ts) {
  if (!ts) return "--";
  return new Date(ts * 1000).toISOString();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

function setSessionsNotes(message) {
  setText("sessions_notes", message);
}

function renderEmptySessions(message) {
  const table = document.getElementById("sessions_table");
  if (!table) return;

  table.innerHTML = `
    <tr id="sessions_empty">
      <td colspan="8" class="empty">${message}</td>
    </tr>
  `;
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    setSessionsNotes(`Copied session ID: ${value}`);
  } catch (err) {
    console.error("Copy failed:", err);
    setSessionsNotes(`Copy failed for session ID: ${value}`);
  }
}

async function revokeSession(sessionId) {
  if (!sessionId) return;

  const approved = window.confirm(`Revoke session ${sessionId}?`);
  if (!approved) {
    setSessionsNotes(`Revoke cancelled for session ${sessionId}.`);
    return;
  }

  try {
    await STC_API.revokeAdminSession(sessionId);
    setSessionsNotes(`Session revoked: ${sessionId}`);
    await loadSessions();
  } catch (err) {
    console.error("Revoke failed:", err);
    setSessionsNotes(`Revoke failed for session ${sessionId}.`);
  }
}

function bindSessionTableActions() {
  const table = document.getElementById("sessions_table");
  if (!table) return;

  table.addEventListener("click", async (event) => {
    const copyBtn = event.target.closest(".copy-session-btn");
    if (copyBtn) {
      await copyText(copyBtn.dataset.sessionId || "");
      return;
    }

    const revokeBtn = event.target.closest(".revoke-session-btn");
    if (revokeBtn) {
      await revokeSession(revokeBtn.dataset.sessionId || "");
    }
  });
}

function bindToolbarHandlers() {
  const btn = document.getElementById("refresh_sessions_btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    await loadSessions();
  });
}

async function loadSessions() {
  if (sessionsLoading) return;
  sessionsLoading = true;

  try {
    const res = await STC_API.getAdminSessions();
    const table = document.getElementById("sessions_table");
    const sessions = Array.isArray(res.sessions) ? res.sessions : [];

    table.innerHTML = "";

    if (!sessions.length) {
      renderEmptySessions("No active sessions across the platform.");
      setSessionsNotes("Loaded 0 active sessions.");
      sessionsLoading = false;
      return;
    }

    sessions.forEach((s) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${s.tenant_id || "--"}</td>
        <td>
          ${s.session_id || "--"}
          <button
            type="button"
            class="button copy-session-btn"
            data-session-id="${s.session_id || ""}"
          >
            Copy
          </button>
        </td>
        <td>${s.principal || "--"}</td>
        <td>${s.intent || "--"}</td>
        <td>${Array.isArray(s.scopes) ? s.scopes.join(", ") : "--"}</td>
        <td>${formatTime(s.issued_at)}</td>
        <td>${s.ttl ?? "--"}</td>
        <td>
          <button
            type="button"
            class="button revoke-session-btn"
            data-session-id="${s.session_id || ""}"
          >
            Revoke
          </button>
        </td>
      `;

      table.appendChild(tr);
    });

    setSessionsNotes(`Loaded ${sessions.length} active session(s) across the platform.`);

  } catch (err) {
    console.error("Session load failed:", err);
    renderEmptySessions("Platform session inventory unavailable.");
    setSessionsNotes("Session load failed.");
  } finally {
    sessionsLoading = false;
  }
}

function init() {
  bindToolbarHandlers();
  bindSessionTableActions();
  loadSessions();

  if (sessionsRefreshHandle) {
    clearInterval(sessionsRefreshHandle);
  }

  sessionsRefreshHandle = setInterval(loadSessions, REFRESH_INTERVAL);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
