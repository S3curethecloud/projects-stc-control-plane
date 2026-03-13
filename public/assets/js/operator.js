const btn = document.getElementById("issue_token");

btn.onclick = async () => {

  const principal = document.getElementById("principal").value;
  const scopes = document.getElementById("scopes").value.split(" ");
  const ttl = parseInt(document.getElementById("ttl").value);

  const apiKey = window.STC_API_KEY;

  const res = await fetch("https://ztr-runtime.fly.dev/v1/tokens/issue", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Stc-Api-Key": apiKey
    },
    body: JSON.stringify({
      principal,
      scopes,
      ttl_seconds: ttl,
      intent: "controlplane:access",
      context: {
        risk_score: 0,
        device_trust: true,
        session_binding: "operator-panel",
        network_zone: "internal"
      }
    })
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById("token_output").value =
      JSON.stringify(data, null, 2);
    return;
  }

  document.getElementById("token_output").value = data.token;

};
