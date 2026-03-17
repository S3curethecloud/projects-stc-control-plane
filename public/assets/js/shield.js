if (!localStorage.getItem("STC_API_KEY")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/shield.js

document.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById("shield-panel");

  if (!panel) return;

  function renderNode(label, state, detail) {
    return `
      <div class="card" style="margin-bottom:16px;">
        <h3>${label}</h3>
        <div class="card-value" style="color:${state ? "#2ecc71" : "#ff6b6b"}">
          ${state ? "ACTIVE" : "INACTIVE"}
        </div>
        <div class="card-sub">${detail || "--"}</div>
      </div>
    `;
  }

  function renderShield(data) {
    const decision = data && data.decision ? data.decision : "--";
    const risk = data && data.risk_score !== undefined ? data.risk_score : "--";
    const tenant = data && data.tenant_id ? data.tenant_id : "--";
    const principal = data && data.principal ? data.principal : "--";
    const policy = data && data.policy_revision ? data.policy_revision : "--";

    panel.innerHTML = `
      ${renderNode("Token Issued", true, `Principal: ${principal}`)}
      ${renderNode("Decision Hash Bound", !!data, `Decision: ${decision}`)}
      ${renderNode("Introspection Valid", decision === "allow", `Policy: ${policy}`)}
      ${renderNode("CAE Trigger", decision === "deny", `Tenant: ${tenant}`)}
      ${renderNode("Audit Chain Updated", true, `Risk Score: ${risk}`)}
    `;
  }

  function renderWaiting(message) {
    panel.innerHTML = `
      ${renderNode("Token Issued", false, message)}
      ${renderNode("Decision Hash Bound", false, message)}
      ${renderNode("Introspection Valid", false, message)}
      ${renderNode("CAE Trigger", false, message)}
      ${renderNode("Audit Chain Updated", false, message)}
    `;
  }

  renderWaiting("Awaiting live shield telemetry...");

  try {
    STC_API.subscribeDecisionStream((data) => {
      renderShield(data);
    });
  } catch (err) {
    console.error("Shield stream failed:", err);
    renderWaiting("Shield stream unavailable");
  }
});
