const btn = document.getElementById("issue_token");

btn.onclick = async () => {

  const principal = document.getElementById("principal").value;
  const scopes = document.getElementById("scopes").value.split(" ");
  const ttl = parseInt(document.getElementById("ttl").value);

  const token = localStorage.getItem("stc_operator_token");

  const res = await fetch("https://ztr-runtime.fly.dev/v1/tokens/issue", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      principal,
      scopes,
      ttl_seconds: ttl,
      intent: "controlplane:access"
    })
  });

  const data = await res.json();

  document.getElementById("token_output").value = data.token;

};
