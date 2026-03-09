const REFRESH_INTERVAL = 5000;

async function loadActivity() {

  const data = await STC_API.getRuntimeActivity();

  document.getElementById("tokens").textContent =
    data.tokens_issued;

  document.getElementById("allowed").textContent =
    data.policy_allowed;

  document.getElementById("denied").textContent =
    data.policy_denied;

  document.getElementById("revoked").textContent =
    data.sessions_revoked;
}

async function loadMetrics() {

  const metrics = await STC_API.getRuntimeMetrics();

  document.getElementById("decision_latency").textContent =
    metrics.decision_latency_ms;

  document.getElementById("opa_latency").textContent =
    metrics.opa_latency_ms;

  document.getElementById("redis_latency").textContent =
    metrics.redis_latency_ms;
}

async function refreshObservability() {

  await loadActivity();
  await loadMetrics();

}

async function init() {

  await refreshObservability();

  setInterval(refreshObservability, REFRESH_INTERVAL);

}

init();
