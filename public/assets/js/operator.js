if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/operator.js

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("issue_token");
  const apiKeyInput = document.getElementById("api_key");
  const principalInput = document.getElementById("principal");
  const scopesInput = document.getElementById("scopes");
  const ttlInput = document.getElementById("ttl");
  const output = document.getElementById("token_output");
  const notes = document.getElementById("operator_notes");

  function setNotes(message) {
    if (notes) notes.textContent = message;
  }

  function getApiKey() {
    const typed = apiKeyInput.value.trim();
    if (typed) return typed;

    const stored = localStorage.getItem("STC_API_KEY");
    if (stored) {
      apiKeyInput.value = stored;
      return stored;
    }

    return "";
  }

  btn.addEventListener("click", async () => {
    const apiKey = getApiKey();
    const principal = principalInput.value.trim();
    const scopes = scopesInput.value
      .split(" ")
      .map(s => s.trim())
      .filter(Boolean);
    const ttl = parseInt(ttlInput.value, 10);

    output.value = "";

    if (!apiKey) {
      setNotes("API key is required.");
      return;
    }

    if (!principal) {
      setNotes("Operator principal is required.");
      return;
    }

    if (!scopes.length) {
      setNotes("At least one scope is required.");
      return;
    }

    if (!Number.isFinite(ttl) || ttl <= 0) {
      setNotes("TTL must be a positive number.");
      return;
    }

    setNotes("Issuing operator token...");

    try {
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
        output.value = JSON.stringify(data, null, 2);
        setNotes(`Token issue failed: HTTP ${res.status}`);
        return;
      }

      output.value = data.token || JSON.stringify(data, null, 2);
      localStorage.setItem("STC_API_KEY", apiKey);
      setNotes(`Operator token issued for principal ${principal}.`);

    } catch (err) {
      console.error("Operator token issue failed:", err);
      output.value = "";
      setNotes("Operator token issue failed.");
    }
  });

  const storedKey = localStorage.getItem("STC_API_KEY");
  if (storedKey) {
    apiKeyInput.value = storedKey;
  }

  setNotes("Ready to issue operator token.");
});
