let copilotRefreshHandle = null;
let copilotLoading = false;

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = value;
}

function summarizeError(err) {
  const raw = String(err && err.message ? err.message : err || "unknown_error");

  if (raw.includes("<!DOCTYPE") || raw.includes("<html")) {
    return "non_json_error_response";
  }

  const httpMatch = raw.match(/HTTP\s+(\d{3})/i);
  if (httpMatch) {
    return `http_${httpMatch[1]}`;
  }

  return raw.length > 120 ? raw.slice(0, 120) : raw;
}

function firstValue(obj, keys, fallback = null) {
  if (!obj || typeof obj !== "object") return fallback;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }

  return fallback;
}

function renderNotes(rows) {
  const tbody = document.getElementById("copilot_notes_table");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="empty">No notes available.</td>
      </tr>
    `;
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.label}</td>
      <td>${row.value}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFailure(err) {
  setText("copilot_platform_status", "CHECK");
  setText("copilot_platform_detail", "Copilot telemetry unavailable");

  setText("copilot_audit_status", "--");
  setText("copilot_audit_detail", "Integrity signal unavailable");

  setText("copilot_top_tenant", "--");
  setText("copilot_top_tenant_detail", "Tenant analysis unavailable");

  setText("copilot_action_title", "INVESTIGATE");
  setText("copilot_action_detail", "Restore telemetry sources before operator briefing");

  setText(
    "copilot_brief",
    `Copilot could not complete a deterministic executive briefing. Cause: ${summarizeError(err)}.`
  );

  renderNotes([
    { label: "copilot_status", value: "degraded" },
    { label: "error", value: summarizeError(err) }
  ]);
}

async function loadCopilot() {
  if (copilotLoading) return;
  copilotLoading = true;

  try {
    const [metricsRes, integrityRes, tenantsRes, auditRes] = await Promise.all([
      STC_API.getAdminMetrics(),
      STC_API.getRuntimeIntegrity(),
      STC_API.getTenants(),
      fetch("https://ztr-runtime.fly.dev/v1/audit/verify", {
        method: "GET",
        headers: {
          "X-Stc-Api-Key": localStorage.getItem("STC_API_KEY") || ""
        }
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(`audit_verify_http_${res.status}`);
        }
        return res.json();
      })
    ]);

    const metricsRoot = metricsRes || {};
    const metrics = metricsRoot.metrics && typeof metricsRoot.metrics === "object"
      ? metricsRoot.metrics
      : metricsRoot;

    const tenants = tenantsRes.tenants || [];

    const usageResults = await Promise.allSettled(
      tenants.map((t) => STC_API.getTenantUsage(t.tenant_id))
    );

    let highestRiskTenant = null;
    let highestRiskScore = -1;

    let totalDenied = Number(firstValue(metrics, ["policy_denied"], 0)) || 0;
    let totalIssued = Number(firstValue(metrics, ["tokens_issued"], 0)) || 0;
    let totalRevoked = Number(firstValue(metrics, ["sessions_revoked"], 0)) || 0;
    let activeSessions = Number(firstValue(metrics, ["active_sessions"], 0)) || 0;

    tenants.forEach((tenant, index) => {
      const result = usageResults[index];
      if (result.status !== "fulfilled") return;

      const usage = result.value || {};
      const riskScore = Number(usage.risk_score ?? 0) || 0;

      if (riskScore > highestRiskScore) {
        highestRiskScore = riskScore;
        highestRiskTenant = {
          tenantId: tenant.tenant_id,
          riskScore,
          denied: Number(usage.policy_denied ?? 0) || 0,
          issued: Number(usage.tokens_issued ?? 0) || 0,
          revoked: Number(usage.sessions_revoked ?? 0) || 0
        };
      }
    });

    const auditValid = auditRes.status === "valid";
    const redisHealthy = !!integrityRes.redis_ok;

    let platformStatus = "HEALTHY";
    let platformDetail = "Runtime and control-plane signals are stable";

    if (!redisHealthy || !auditValid) {
      platformStatus = "CHECK";
      platformDetail = "One or more control-plane trust signals need attention";
    }

    setText("copilot_platform_status", platformStatus);
    setText("copilot_platform_detail", platformDetail);

    setText("copilot_audit_status", auditValid ? "VALID" : "CHECK");
    setText(
      "copilot_audit_detail",
      auditValid
        ? `${auditRes.events_verified ?? "--"} events verified`
        : "Audit verification requires attention"
    );

    setText(
      "copilot_top_tenant",
      highestRiskTenant ? highestRiskTenant.tenantId : "none"
    );
    setText(
      "copilot_top_tenant_detail",
      highestRiskTenant
        ? `Risk score ${highestRiskTenant.riskScore}`
        : "No tenant risk concentration detected"
    );

    let actionTitle = "MONITOR";
    let actionDetail = "Continue normal observation";

    if (highestRiskTenant && highestRiskTenant.riskScore >= 20) {
      actionTitle = "REVIEW TENANT";
      actionDetail = `Inspect ${highestRiskTenant.tenantId} for elevated denial pressure`;
    } else if (totalDenied > 10) {
      actionTitle = "REVIEW POLICY";
      actionDetail = "Denied decisions exceed normal low-pressure range";
    } else if (totalRevoked > 0) {
      actionTitle = "CONFIRM REVOCATIONS";
      actionDetail = "Review revoked sessions for expected operator action";
    }

    setText("copilot_action_title", actionTitle);
    setText("copilot_action_detail", actionDetail);

    const briefParts = [];

    briefParts.push(
      `Platform status is ${platformStatus.toLowerCase()} with ${auditValid ? "validated audit integrity" : "audit integrity requiring review"}.`
    );

    briefParts.push(
      `The environment has issued ${totalIssued} tokens, recorded ${totalDenied} denied decisions, and revoked ${totalRevoked} sessions.`
    );

    if (highestRiskTenant) {
      briefParts.push(
        `The highest-risk tenant is ${highestRiskTenant.tenantId} with a risk score of ${highestRiskTenant.riskScore}.`
      );
    } else {
      briefParts.push("No concentrated tenant risk signal is currently dominant.");
    }

    briefParts.push(`Recommended action: ${actionTitle.toLowerCase()} — ${actionDetail}.`);

    setText("copilot_brief", briefParts.join(" "));

    renderNotes([
      { label: "runtime_revision", value: integrityRes.runtime_revision || "unknown" },
      { label: "policy_revision", value: integrityRes.policy_revision || "unknown" },
      { label: "redis_status", value: redisHealthy ? "healthy" : "offline" },
      { label: "audit_status", value: auditValid ? "valid" : "check" },
      { label: "events_verified", value: String(auditRes.events_verified ?? "--") },
      { label: "tokens_issued", value: String(totalIssued) },
      { label: "policy_denied", value: String(totalDenied) },
      { label: "sessions_revoked", value: String(totalRevoked) },
      { label: "active_sessions", value: String(activeSessions) },
      {
        label: "highest_risk_tenant",
        value: highestRiskTenant ? highestRiskTenant.tenantId : "none"
      }
    ]);

  } catch (err) {
    console.error("Copilot load failed:", err);
    renderFailure(err);
  } finally {
    copilotLoading = false;
  }
}

function startCopilot() {
  loadCopilot();

  if (copilotRefreshHandle) {
    clearInterval(copilotRefreshHandle);
  }

  copilotRefreshHandle = setInterval(loadCopilot, 15000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCopilot);
} else {
  startCopilot();
}
