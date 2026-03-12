const apiKey = localStorage.getItem("STC_API_KEY");

const STREAM_URL =
  "https://ztr-runtime.fly.dev/v1/decisions/stream?api_key=" + apiKey;

const table = document.getElementById("blast_table");

function computeImpact(intent) {

  if (!intent) return "application";

  if (intent.includes("refund"))
    return "billing-system";

  if (intent.includes("token"))
    return "identity-system";

  if (intent.includes("session"))
    return "auth-system";

  return "application";
}

function formatTime(ts) {

  if (!ts) return "";

  return new Date(ts * 1000).toLocaleString();
}

function addRow(event) {

  const impact = computeImpact(event.intent);

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${formatTime(event.timestamp)}</td>
    <td>${event.principal}</td>
    <td>${event.intent}</td>
    <td>${event.tenant_id}</td>
    <td>${event.decision}</td>
    <td>${impact}</td>
  `;

  table.prepend(row);

  if (table.children.length > 100) {
    table.removeChild(table.lastChild);
  }

}

async function loadRecent() {

  const apiKey = localStorage.getItem("STC_API_KEY");

  const res = await fetch(
    "https://ztr-runtime.fly.dev/v1/decisions?limit=20",
    { headers: { "X-Stc-Api-Key": apiKey } }
  );

  const data = await res.json();

  for (const e of data.events) {
    addRow({
      timestamp: e.time / 1000,
      tenant_id: "tenant-launch",
      principal: e.principal,
      intent: e.intent,
      decision: e.result
    });
  }

}

function startStream() {

  const source = new EventSource(STREAM_URL);

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
  };

}

async function init() {
  await loadRecent();
  startStream();
}

init();
