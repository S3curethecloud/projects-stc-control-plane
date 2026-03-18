// SecureTheCloud layout loader

// ------------------------------------------------------
// Global Runtime Configuration
// ------------------------------------------------------

window.STC_API_KEY = "FCn017yGzG5Y7zv3HcZUg03vcNYfHNCXpnEWBOMPXr0";


// ------------------------------------------------------
// Navigation Injection (REPLACED - NO PARTIAL FETCH)
// ------------------------------------------------------

function loadNav() {
  const container = document.getElementById("nav-container");

  if (!container) return;

  container.innerHTML = `
<nav class="stc-nav" role="navigation">

  <div class="nav-left">

    <div class="logo">
      <a href="/">SecureTheCloud</a>
    </div>

    <div class="nav-group">
      <span class="nav-label">Control</span>
      <a href="/runtime.html" data-route="/runtime.html">Runtime</a>
      <a href="/shield.html" data-route="/shield.html">Shield</a>
      <a href="/sessions.html" data-route="/sessions.html">Sessions</a>
      <a href="/operator.html" data-route="/operator.html">Operator</a>
    </div>

    <div class="nav-group">
      <span class="nav-label">Tenancy</span>
      <a href="/tenants.html" data-route="/tenants.html">Tenants</a>
      <a href="/usage.html" data-route="/usage.html">Billing</a>
    </div>

    <div class="nav-group">
      <span class="nav-label">Analysis</span>
      <a href="/blast-radius.html" data-route="/blast-radius.html">Blast</a>
      <a href="/heatmap.html" data-route="/heatmap.html">Heatmap</a>
      <a href="/intelligence.html" data-route="/intelligence.html">Intel</a>
    </div>

  </div>

  <div class="nav-right">
    <a href="/observability.html" data-route="/observability.html">Observability</a>
    <a href="/activity.html" data-route="/activity.html">Activity</a>
    <a href="/copilot.html" data-route="/copilot.html">Copilot</a>
    <a href="/docs.html" data-route="/docs.html">Help</a>
  </div>

</nav>
`;

  // Apply active highlighting AFTER injection
  highlightActiveNav();

  // Demo highlight
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
