// SecureTheCloud layout loader

// ------------------------------------------------------
// Global Runtime Configuration
// ------------------------------------------------------

window.STC_API_KEY = "FCn017yGzG5Y7zv3HcZUg03vcNYfHNCXpnEWBOMPXr0";


// ------------------------------------------------------
// Navigation Injection (MERGED + UPGRADED)
// ------------------------------------------------------

function loadNav() {
  const container = document.getElementById("nav-container");

  if (!container) return;

  container.innerHTML = `
<nav class="stc-nav" role="navigation" aria-label="SecureTheCloud Navigation">

  <div class="nav-toggle" id="navToggle">☰</div>

  <div class="nav-left">

    <div class="logo">
      <a href="/">🔒 SecureTheCloud</a>
    </div>

    <div class="nav-links primary-nav">

      <a href="/" data-route="/">Overview</a>

      <a href="/runtime.html" data-route="/runtime.html">Runtime</a>

      <a href="/shield.html" data-route="/shield.html">Shield</a>

      <a href="/tenants.html" data-route="/tenants.html">Tenants</a>

      <a href="/sessions.html" data-route="/sessions.html">Sessions</a>

      <a href="/operator.html" data-route="/operator.html">Operator</a>

      <a href="/blast-radius.html" data-route="/blast-radius.html">Blast Radius</a>

      <a href="/heatmap.html" data-route="/heatmap.html">Heatmap</a>

      <a href="/integrity.html" data-route="/integrity.html">Integrity</a>

    </div>

  </div>

  <div class="nav-right nav-links secondary-nav">

    <a href="/provision.html" data-route="/provision.html">Provision</a>

    <a href="/observability.html" data-route="/observability.html">Observability</a>

    <a href="/usage.html" data-route="/usage.html">Usage & Billing</a>

    <a href="/activity.html" data-route="/activity.html">Activity</a>

    <a href="/intelligence.html" data-route="/intelligence.html">Intelligence</a>

    <a href="/copilot.html" data-route="/copilot.html">Copilot</a>

    <a href="/docs.html" data-route="/docs.html">Help</a>

    <span class="nav-status">
      <span class="status-dot"></span>
      Connected
    </span>

  </div>

</nav>
`;

  // Apply active highlighting AFTER injection
  highlightActiveNav();

  // Demo highlight (Runtime = entry point)
  document.querySelector('[data-route="/runtime.html"]')
    ?.classList.add("demo-highlight");
}


// ------------------------------------------------------
// Active Navigation Highlight
// ------------------------------------------------------

function highlightActiveNav() {
  const path = window.location.pathname;

  document.querySelectorAll("[data-route]").forEach(link => {
    if (link.getAttribute("data-route") === path) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}


// ------------------------------------------------------
// Live Status Indicator
// ------------------------------------------------------

async function updateNavStatus() {
  try {
    const res = await fetch("/v1/runtime/integrity");

    if (!res.ok) throw new Error();

    const data = await res.json();

    const dot = document.querySelector(".status-dot");
    const label = document.querySelector(".nav-status");

    if (!dot || !label) return;

    if (data.redis_ok) {
      dot.style.background = "#2ecc71";
      label.childNodes[1].nodeValue = " Connected";
    } else {
      dot.style.background = "#ff6b6b";
      label.childNodes[1].nodeValue = " Degraded";
    }

  } catch {
    const dot = document.querySelector(".status-dot");
    const label = document.querySelector(".nav-status");

    if (dot) dot.style.background = "#ff6b6b";
    if (label) label.childNodes[1].nodeValue = " Offline";
  }
}

document.addEventListener("DOMContentLoaded", updateNavStatus);


// ------------------------------------------------------
// Mobile Toggle
// ------------------------------------------------------

function enableMobileNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.querySelector(".stc-nav");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

document.addEventListener("DOMContentLoaded", enableMobileNav);


// ------------------------------------------------------
// Demo Mode Banner
// ------------------------------------------------------

function injectDemoBanner() {

  const banner = document.createElement("div");

  banner.innerHTML = `
    <div style="
      background:#0f223d;
      border-bottom:1px solid rgba(85,183,255,0.2);
      padding:8px 16px;
      font-size:13px;
      color:#8aa4d4;
    ">
      Demo Mode — Follow: Runtime → Shield → Tenants → Sessions → Blast Radius → Operator
    </div>
  `;

  document.body.prepend(banner);
}

document.addEventListener("DOMContentLoaded", injectDemoBanner);


// ------------------------------------------------------
// Initialization
// ------------------------------------------------------

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadNav);
} else {
  loadNav();
}
