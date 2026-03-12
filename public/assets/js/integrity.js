async function loadIntegrity(){

  const res = await fetch(
    "https://ztr-runtime.fly.dev/v1/runtime/integrity"
  );

  const data = await res.json();

  document.getElementById("runtime_rev").innerText = data.runtime_revision;

  document.getElementById("policy_rev").innerText = data.policy_revision;

  document.getElementById("redis_status").innerText =
    data.redis_ok ? "healthy" : "offline";

  document.getElementById("audit_chain").innerText = data.audit_chain;

  document.getElementById("last_check").innerText =
    new Date(data.timestamp * 1000).toLocaleString();

}

loadIntegrity();
