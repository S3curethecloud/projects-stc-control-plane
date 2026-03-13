const API_KEY = "FCn017yGzG5Y7zv3HcZUg03vcNYfHNCXpnEWBOMPXr0";

const STREAM_URL =
  "https://ztr-runtime.fly.dev/v1/decisions/stream?api_key=" + API_KEY;

const table = document.getElementById("activity_table");

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString();
}

function decisionClass(decision) {
  if (decision === "allow") return "status-allow";
  if (decision === "deny") return "status-deny";
  return "";
}

function addRow(event) {

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${formatTime(event.timestamp)}</td>
    <td>${event.tenant_id}</td>
    <td>${event.principal}</td>
    <td>${event.intent}</td>
    <td class="${decisionClass(event.decision)}">${event.decision}</td>
    <td>${event.risk_score || ""}</td>
    <td>${event.policy_revision || ""}</td>
  `;

  table.prepend(row);

  if (table.children.length > 100) {
    table.removeChild(table.lastChild);
  }
}

function startStream() {

  const source = new EventSource(STREAM_URL);

  const status = document.getElementById("stream_status");
  status.innerText = "Connected";

  source.onmessage = (msg) => {

    try {
      const event = JSON.parse(msg.data);
      addRow(event);
    } catch (err) {
      console.error("stream parse error", err);
    }

  };

  source.onerror = () => {
    console.log("stream reconnecting...");
    status.innerText = "Reconnecting...";
  };

}

startStream();

function clearStream() {
  table.innerHTML = "";
}
