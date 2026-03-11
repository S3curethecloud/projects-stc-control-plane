const STREAM_URL = "https://ztr-runtime.fly.dev/v1/decisions/stream";

const table = document.getElementById("blast_table");

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString();
}

function computeImpact(intent) {

  if (!intent) return "unknown";

  if (intent.includes("refund"))
    return "billing-system";

  if (intent.includes("token"))
    return "identity-system";

  if (intent.includes("session"))
    return "auth-system";

  return "application";
}

function addRow(event) {

  const row = document.createElement("tr");

  const impact = computeImpact(event.intent);

  row.innerHTML = `
    <td>${formatTime(event.timestamp)}</td>
    <td>${event.principal}</td>
    <td>${event.intent}</td>
    <td>${event.tenant}</td>
    <td>${event.decision}</td>
    <td>${impact}</td>
  `;

  table.prepend(row);

  if (table.children.length > 100) {
    table.removeChild(table.lastChild);
  }

}

function startStream() {

  const source = new EventSource(STREAM_URL);

  source.onmessage = (msg) => {

    try {

      const event = JSON.parse(msg.data);

      addRow(event);

    } catch (err) {

      console.error("blast radius parse error", err);

    }

  };

}

startStream();
