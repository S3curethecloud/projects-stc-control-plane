async function loadObservability(){

  const apiKey = localStorage.getItem("STC_API_KEY");

  const res = await fetch(
    "https://ztr-runtime.fly.dev/v1/audit/metrics",
    { headers: { "X-Stc-Api-Key": apiKey } }
  );

  const data = await res.json();

  document.getElementById("tokens_issued").innerText =
    data.tokens_issued || 0;

  document.getElementById("policy_allowed").innerText =
    data.policy_allowed || 0;

  document.getElementById("policy_denied").innerText =
    data.policy_denied || 0;

  document.getElementById("sessions_revoked").innerText =
    data.sessions_revoked || 0;

  document.getElementById("decision_latency").innerText =
    data.decision_latency_ms || 0;

  document.getElementById("opa_latency").innerText =
    data.opa_latency_ms || 0;

  document.getElementById("redis_latency").innerText =
    data.redis_latency_ms || 0;

}

loadObservability();

setInterval(loadObservability, 5000);
