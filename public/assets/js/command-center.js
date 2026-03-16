const RUNTIME_BASE = "https://ztr-runtime.fly.dev";
const API_KEY = localStorage.getItem("STC_API_KEY") || "";

let streamAbortController = null;
let reconnectTimer = null;

function el(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value;
}

function formatTime(ts) {
  if (!ts) return "--";
  return new Date(ts * 1000).toLocaleTimeString();
}

function decisionClass(decision) {
  if (decision === "allow") return "status-allow";
  if (decision === "deny") return "status-deny";
  return "";
}

function riskLevel(score) {
  const numeric = Number(score || 0);
  if (numeric >= 60) return "HIGH";
  if (numeric >= 30) return "MEDIUM";
  return "LOW";
}

function updateRisk(score) {
  const level = riskLevel(score);
  setText("risk_level", level);

  const badge = el("risk_badge");
  if (!badge) return;

  badge.textContent = level;
  badge.className = "badge";

  if (level === "HIGH") badge.classList.add("badge-high");
  else if (level === "MEDIUM") badge.classList.add("badge-medium");
  else badge.classList.add("badge-low");
}

function clearEmptyRow(rowId) {
  const empty = el(rowId);
  if (empty) empty.remove();
}

function addDecisionRow(event) {
  const table = el("activity_table");
  if (!table) return;

  clearEmptyRow("activity_empty");

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${formatTime(event.timestamp)}</td>
    <td>${event.tenant_id || "--"}</td>
    <td>${event.principal || "--"}</td>
    <td>${event.intent || "--"}</td>
    <td class="${decisionClass(event.decision)}">${event.decision || "--"}</td>
    <td>${event.risk_score ?? "--"}</td>
    <td>${event.policy_revision || "--"}</td>
  `;

  table.prepend(row);

  while (table.children.length > 50) {
    table.removeChild(table.lastChild);
  }

  updateRisk(event.risk_score);

  if (window.RiskDNAGraph && typeof window.RiskDNAGraph.pushEvent === "function") {
    window.RiskDNAGraph.pushEvent(event);
  }

  if (window.GlobalBlastRadius && typeof window.GlobalBlastRadius.register === "function") {
    window.GlobalBlastRadius.register(event);
  }

  if (window.RiskDNAUniverse && typeof window.RiskDNAUniverse.ingest === "function") {
    window.RiskDNAUniverse.ingest(event);
  }
}

function renderSessions(data) {
  const table = el("sessions_table");
  if (!table) return;

  table.innerHTML = "";

  const sessions = Array.isArray(data.sessions) ? data.sessions : [];

  if (sessions.length === 0) {
    table.innerHTML = `
      <tr id="sessions_empty">
        <td colspan="5" class="empty">No active sessions.</td>
      </tr>
    `;
    return;
  }

  for (const session of sessions) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${session.session_id}</td>
      <td>${session.principal || "--"}</td>
      <td>${session.intent || "--"}</td>
      <td>${session.ttl ?? "--"}s</td>
      <td>
        <button class="button" data-session-id="${session.session_id}">
          Revoke
        </button>
      </td>
    `;
    table.appendChild(row);
  }

  table.querySelectorAll("button[data-session-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const sessionId = button.getAttribute("data-session-id");
      await revokeSession(sessionId, button);
    });
  });
}

async function loadHealth() {
  try {
    const res = await fetch(`${RUNTIME_BASE}/health`, {
      method: "GET",
      cache: "no-store"
    });

    if (!res.ok) throw new Error(`health_http_${res.status}`);

    const data = await res.json();
    setText("policy_revision", data.policy_rev || "--");
  } catch (err) {
    console.error("health load error", err);
    setText("policy_revision", "--");
  }
}

async function loadIntegrity() {
  try {
    const res = await fetch(`${RUNTIME_BASE}/v1/audit/verify`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "X-Stc-Api-Key": API_KEY
      }
    });

    if (!res.ok) throw new Error(`audit_http_${res.status}`);

    const data = await res.json();

    setText("audit_status", data.status === "valid" ? "✔ VALID" : "BROKEN");
    setText("audit_events", `Events: ${data.events_verified ?? "--"}`);
  } catch (err) {
    console.error("integrity load error", err);
    setText("audit_status", "ERROR");
    setText("audit_events", "Events: --");
  }
}

async function loadSessions() {
  try {
    const res = await fetch(`${RUNTIME_BASE}/v1/sessions/active`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "X-Stc-Api-Key": API_KEY
      }
    });

    if (!res.ok) throw new Error(`sessions_http_${res.status}`);

    const data = await res.json();

    setText("session_count", String(data.active_sessions ?? 0));
    renderSessions(data);
  } catch (err) {
    console.error("sessions load error", err);
    setText("session_count", "--");
    renderSessions({ sessions: [] });
  }
}

async function revokeSession(sessionId, button) {
  try {
    if (button) button.disabled = true;

    const res = await fetch(`${RUNTIME_BASE}/v1/sessions/revoke`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Stc-Api-Key": API_KEY
      },
      body: JSON.stringify({ session_id: sessionId })
    });

    if (!res.ok) throw new Error(`revoke_http_${res.status}`);

    await loadSessions();
    await loadIntegrity();
  } catch (err) {
    console.error("revoke error", err);
  } finally {
    if (button) button.disabled = false;
  }
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(startDecisionStream, 3000);
}

function processSSEChunk(buffer) {
  const blocks = buffer.split("\n\n");
  return {
    complete: blocks.slice(0, -1),
    remainder: blocks[blocks.length - 1] || ""
  };
}

function parseSSEBlock(block) {
  const lines = block.split("\n");
  for (const line of lines) {
    if (line.startsWith("data:")) {
      return line.slice(5).trim();
    }
  }
  return null;
}

async function startDecisionStream() {
  const status = el("stream_status");

  if (!API_KEY) {
    if (status) status.textContent = "Missing API key";
    return;
  }

  if (streamAbortController) {
    streamAbortController.abort();
  }

  streamAbortController = new AbortController();

  try {
    if (status) status.textContent = "Connecting...";

    const res = await fetch(`${RUNTIME_BASE}/v1/decisions/stream`, {
      method: "GET",
      cache: "no-store",
      signal: streamAbortController.signal,
      headers: {
        "Accept": "text/event-stream",
        "X-Stc-Api-Key": API_KEY
      }
    });

    if (!res.ok || !res.body) {
      throw new Error(`stream_http_${res.status}`);
    }

    if (status) status.textContent = "Connected";

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        throw new Error("stream_closed");
      }

      buffer += decoder.decode(value, { stream: true });

      const { complete, remainder } = processSSEChunk(buffer);
      buffer = remainder;

      for (const block of complete) {
        const payload = parseSSEBlock(block);
        if (!payload) continue;

        try {
          const event = JSON.parse(payload);
          addDecisionRow(event);
          loadSessions();
          loadIntegrity();
        } catch (err) {
          console.error("stream parse error", err, payload);
        }
      }
    }
  } catch (err) {
    if (streamAbortController.signal.aborted) return;
    console.warn("decision stream disconnected", err);
    if (status) status.textContent = "Reconnecting...";
    scheduleReconnect();
  }
}

function initCommandCenter() {
  if (!API_KEY) {
    setText("stream_status", "Missing API key");
    setText("audit_status", "ERROR");
    setText("audit_events", "Events: --");
    setText("session_count", "--");
    setText("policy_revision", "--");
    return;
  }

  loadHealth();
  loadIntegrity();
  loadSessions();
  startDecisionStream();

  setInterval(loadSessions, 5000);
  setInterval(loadIntegrity, 10000);
  setInterval(loadHealth, 15000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCommandCenter);
} else {
  initCommandCenter();
}
