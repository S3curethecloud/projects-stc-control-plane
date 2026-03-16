let integrityRefreshHandle = null;
let integrityLoading = false;

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = value;
}

function formatTime(tsSeconds) {
  const ts = Number(tsSeconds);
  if (!Number.isFinite(ts)) return new Date().toLocaleString();
  return new Date(ts * 1000).toLocaleString();
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`${url} -> non-JSON response`);
  }

  return res.json();
}

async function fetchControlPlaneIntegrity() {
  const adminSecret = localStorage.getItem("STC_ADMIN_SECRET");

  if (!adminSecret) {
    throw new Error("Missing STC_ADMIN_SECRET");
  }

  return fetchJson("/v1/runtime/integrity", {
    method: "GET",
    headers: {
      "X-Stc-Admin-Secret": adminSecret
    }
  });
}

async function fetchAuditVerify() {
  const apiKey = localStorage.getItem("STC_API_KEY");

  if (!apiKey) {
    throw new Error("Missing STC_API_KEY");
  }

  return fetchJson("https://ztr-runtime.fly.dev/v1/audit/verify", {
    method: "GET",
    headers: {
      "X-Stc-Api-Key": apiKey
    }
  });
}

function renderRuntimeBlock(runtime) {
  setText("runtime_rev", runtime.runtime_revision || "unknown");
  setText("policy_rev", runtime.policy_revision || "unknown");
  setText("redis_status", runtime.redis_ok ? "HEALTHY" : "OFFLINE");
  setText(
    "last_check",
    formatTime(runtime.timestamp || Math.floor(Date.now() / 1000))
  );
}

function renderRuntimeUnavailable() {
  setText("runtime_rev", "--");
  setText("policy_rev", "--");
  setText("redis_status", "--");
  setText("last_check", new Date().toLocaleString());
}

function renderAuditBlock(audit, fallbackChainHead = "--") {
  setText("audit_status", (audit.status || "unknown").toUpperCase());
  setText("events_verified", String(audit.events_verified ?? "--"));
  setText("chain_head", audit.chain_head || fallbackChainHead || "--");
}

function renderAuditUnavailable(fallbackChainHead = "--") {
  setText("audit_status", "--");
  setText("events_verified", "--");
  setText("chain_head", fallbackChainHead || "--");
}

function renderOverall(runtimeResult, auditResult) {
  const runtimeOk =
    runtimeResult.status === "fulfilled" &&
    !!runtimeResult.value &&
    runtimeResult.value.redis_ok === true;

  const auditOk =
    auditResult.status === "fulfilled" &&
    !!auditResult.value &&
    auditResult.value.status === "valid";

  if (runtimeOk && auditOk) {
    setText("overall_status", "VERIFIED");
    setText("overall_detail", "Runtime and audit chain are healthy");
    return;
  }

  if (auditOk || runtimeOk) {
    setText("overall_status", "PARTIAL");
    setText("overall_detail", "One integrity signal is available; one needs attention");
    return;
  }

  setText("overall_status", "ERROR");
  setText("overall_detail", "Integrity telemetry unavailable");
}

function renderNotes(runtimeResult, auditResult) {
  const notes = [];

  if (runtimeResult.status === "fulfilled") {
    const r = runtimeResult.value;
    notes.push(`runtime=${r.runtime_revision || "unknown"}`);
    notes.push(`policy=${r.policy_revision || "unknown"}`);
    notes.push(`redis=${r.redis_ok ? "healthy" : "offline"}`);
  } else {
    notes.push(`runtime_path_unavailable=${runtimeResult.reason.message}`);
  }

  if (auditResult.status === "fulfilled") {
    const a = auditResult.value;
    notes.push(`audit=${a.status || "unknown"}`);
    notes.push(`events_verified=${a.events_verified ?? "--"}`);
  } else {
    notes.push(`audit_verify_unavailable=${auditResult.reason.message}`);
  }

  setText("integrity_notes", notes.join(" | "));
}

async function loadIntegrity() {
  if (integrityLoading) return;
  integrityLoading = true;

  try {
    const [runtimeResult, auditResult] = await Promise.allSettled([
      fetchControlPlaneIntegrity(),
      fetchAuditVerify()
    ]);

    if (runtimeResult.status === "fulfilled") {
      renderRuntimeBlock(runtimeResult.value);
    } else {
      console.error("Runtime integrity failed:", runtimeResult.reason);
      renderRuntimeUnavailable();
    }

    const fallbackChainHead =
      runtimeResult.status === "fulfilled"
        ? runtimeResult.value.ledger_anchor || "--"
        : "--";

    if (auditResult.status === "fulfilled") {
      renderAuditBlock(auditResult.value, fallbackChainHead);
    } else {
      console.error("Audit verify failed:", auditResult.reason);
      renderAuditUnavailable(fallbackChainHead);
    }

    renderOverall(runtimeResult, auditResult);
    renderNotes(runtimeResult, auditResult);

  } finally {
    integrityLoading = false;
  }
}

function startIntegrityRefresh() {
  loadIntegrity();

  if (integrityRefreshHandle) {
    clearInterval(integrityRefreshHandle);
  }

  integrityRefreshHandle = setInterval(loadIntegrity, 10000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startIntegrityRefresh);
} else {
  startIntegrityRefresh();
}
