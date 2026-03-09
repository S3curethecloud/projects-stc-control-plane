const STREAM_URL =
  "https://ztr-runtime.fly.dev/v1/decisions/stream";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString();
}

function addEventRow(event) {

  const table = document.getElementById("activity_table");

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${formatTime(event.time)}</td>
    <td>${event.principal || ""}</td>
    <td>${event.intent || ""}</td>
    <td>${event.result || ""}</td>
    <td>${event.policy_revision || ""}</td>
  `;

  table.prepend(row);

  if (table.children.length > 100) {
    table.removeChild(table.lastChild);
  }

}

function startStream() {

  const source = new EventSource(STREAM_URL);

  source.onmessage = function(event) {

    try {

      const data = JSON.parse(event.data);

      addEventRow(data);

    } catch (err) {

      console.error("Stream parse error", err);

    }

  };

  source.onerror = function(err) {

    console.error("Stream connection lost", err);

  };

}

function clearStream() {

  document.getElementById("activity_table").innerHTML = "";

}

startStream();
