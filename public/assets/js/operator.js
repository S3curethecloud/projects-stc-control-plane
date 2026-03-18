const issueBtn = document.getElementById("issue_token");
const saveBtn = document.getElementById("save_api_key");
const apiKeyInput = document.getElementById("api_key");
const principalInput = document.getElementById("principal");
const scopesInput = document.getElementById("scopes");
const ttlInput = document.getElementById("ttl");
const output = document.getElementById("token_output");
const notes = document.getElementById("operator_notes");

function setNotes(message) {
  if (notes) notes.textContent = message;
}

function getStoredApiKey() {
  return localStorage.getItem("STC_API_KEY") || "";
}

function setStoredApiKey(value) {
  localStorage.setItem("STC_API_KEY", value);
}

function normalizeScopes(value) {
  return value
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderOutput(value) {
  if (output) {
    output.value = value;
  }
}

async function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    setNotes("API key is required before saving.");
    return;
  }

  setStoredApiKey(apiKey);
  setNotes("API key saved to local storage.");
}

async function issueToken() {
  const apiKey = apiKeyInput.value.trim();
  const principal = principalInput.value.trim();
  const scopes = normalizeScopes(scopesInput.value);
  const ttl = parseInt(ttlInput.value, 10);

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

  if (!Number.isFinite(ttl) || ttl < 60) {
    setNotes("TTL must be 60 seconds or greater.");
    return;
  }

  issueBtn.disabled = true;
  issueBtn.classList.add("loading");
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
      renderOutput(JSON.stringify(data, null, 2));
      setNotes(`Token issuance failed with HTTP ${res.status}.`);
      return;
    }

    renderOutput(data.token || JSON.stringify(data, null, 2));

    if (notes) {
      notes.className = "note success";
      notes.textContent = "Operator token issued. Control-plane access granted.";
    }

  } catch (err) {
    console.error("Operator token issuance failed:", err);
    renderOutput("");
    setNotes("Token issuance failed due to network or runtime error.");
  } finally {
    issueBtn.disabled = false;
    issueBtn.classList.remove("loading");
  }
}

function initOperator() {
  apiKeyInput.value = getStoredApiKey();

  if (issueBtn) {
    issueBtn.addEventListener("click", issueToken);
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", saveApiKey);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOperator);
} else {
  initOperator();
}
