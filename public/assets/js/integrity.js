const REFRESH_INTERVAL = 10000;

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString();
}

async function loadIntegrity() {

  const data = await STC_API.getRuntimeIntegrity();

  document.getElementById("runtime_revision").textContent =
    data.runtime_revision;

  document.getElementById("policy_revision").textContent =
    data.policy_revision;

  document.getElementById("ledger_anchor").textContent =
    data.ledger_anchor || "none";

  document.getElementById("redis_status").textContent =
    data.redis_ok ? "OK" : "ERROR";

  document.getElementById("timestamp").textContent =
    formatTime(data.timestamp);

}

async function refreshIntegrity() {

  try {
    await loadIntegrity();
  } catch (err) {
    console.error("Integrity load error:", err);
  }

}

async function init() {

  await refreshIntegrity();

  setInterval(refreshIntegrity, REFRESH_INTERVAL);

}

init();
