let activityEventSource = null;
let activityReconnectTimer = null;
let activityHasConnected = false;
const ACTIVITY_ROW_LIMIT = 100;
const STREAM_URL = "https://ztr-runtime.fly.dev/v1/decisions/stream";

function getApiKey() {
  return localStorage.getItem("STC_API_KEY") || "";
}

function getActivityTable() {
  return document.getElementById("activity_table");
}

function getStreamStatus() {
  return document.getElementById("stream_status");
}

function setStreamStatus(text) {
  const el = getStreamStatus();
  if (el) {
    el.innerText = text;
  }
}

function formatTime(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n)) return "--";
  return new Date(n * 1000).toLocaleString();
}

function decisionClass(decision) {
  if (decision === "allow") return "status-allow";
  if (decision === "deny") return "status-deny";
  return "";
}

function ensureEmptyStateRemoved() {
  const empty = document.getElementById("activity_empty");
  if (empty) {
    empty.remove();
  }
}

function ensureEmptyStateShown(message = "Awaiting runtime decision events...") {
  const table = getActivityTable();
  if (!table) return;

  if (document.getElementById("activity_empty")) return;
  if (table.children.length > 0) return;

  const row = document.createElement("tr");
  row.id = "activity_empty";
  row.innerHTML = `
    <td colspan="7" class="empty">${message}</td>
  `;
  table.appendChild(row);
}

function addRow(event) {
  const table = getActivityTable();
  if (!table) return;

  ensureEmptyStateRemoved();

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

  while (table.children.length > ACTIVITY_ROW_LIMIT) {
    table.removeChild(table.lastChild);
  }
}

function clearStream() {
  const table = getActivityTable();
  if (!table) return;

  table.innerHTML = "";
  ensureEmptyStateShown("Stream cleared. Awaiting new runtime decision events...");
}

function closeStream() {
  if (activityEventSource) {
    activityEventSource.close();
    activityEventSource = null;
  }
}

function scheduleReconnect() {
  if (activityReconnectTimer) return;

  activityReconnectTimer = setTimeout(() => {
    activityReconnectTimer = null;
    startStream();
  }, 3000);
}

function startStream() {
  closeStream();

  const apiKey = getApiKey();

  if (!apiKey) {
    setStreamStatus("Missing API key");
    ensureEmptyStateShown("No API key found. Add STC_API_KEY to continue.");
    return;
  }

  setStreamStatus(activityHasConnected ? "Reconnecting..." : "Connecting...");

  const url = `${STREAM_URL}?api_key=${encodeURIComponent(apiKey)}`;
  const source = new EventSource(url);
  activityEventSource = source;

  source.onopen = () => {
    activityHasConnected = true;
    setStreamStatus("Connected");
  };

  source.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data);
      addRow(event);
    } catch (err) {
      console.error("Activity stream parse error:", err);
    }
  };

  source.onerror = () => {
    setStreamStatus("Reconnecting...");
    closeStream();
    scheduleReconnect();
  };
}

function initActivityPage() {
  const clearButton = document.getElementById("clear_stream_button");
  if (clearButton) {
    clearButton.addEventListener("click", clearStream);
  }

  ensureEmptyStateShown();
  startStream();

  window.addEventListener("beforeunload", () => {
    closeStream();
    if (activityReconnectTimer) {
      clearTimeout(activityReconnectTimer);
      activityReconnectTimer = null;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initActivityPage);
} else {
  initActivityPage();
}
