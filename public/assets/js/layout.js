(function () {
  const DEMO_BANNER_ID = "stc-demo-banner";

  function getStoredApiKey() {
    try {
      return localStorage.getItem("STC_API_KEY") || "";
    } catch {
      return "";
    }
  }

  // Backward compatibility for pages still reading window.STC_API_KEY
  window.STC_API_KEY = window.STC_API_KEY || getStoredApiKey();

  function normalizePath(path) {
    if (!path) return "/";
    if (path === "/index.html") return "/";
    return path;
  }

  function currentPath() {
    return normalizePath(window.location.pathname);
  }

  function buildNav() {
    return `
<nav class="stc-nav" role="navigation" aria-label="SecureTheCloud Navigation">

  <div class="nav-brand-row">
    
<div class="logo">
  <a href="/" class="brand-link" aria-label="SecureTheCloud home">

    <span class="brand-shield" aria-hidden="true">
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 4L10 12V28C10 43 21 56 32 60C43 56 54 43 54 28V12L32 4Z" fill="#0d1b2a"/>
        <path d="M32 10L16 16V28C16 40 24 50 32 53C40 50 48 40 48 28V16L32 10Z" fill="#f5b301"/>
      </svg>
    </span>

    <span class="brand-text" aria-hidden="true">
      <span class="brand-secure">Secure</span>
      <span class="brand-cloud">TheCloud</span>
    </span>

  </a>
</div>

    <button
      id="navToggle"
      class="nav-toggle"
      type="button"
      aria-expanded="false"
      aria-controls="stcNavGroups"
      aria-label="Toggle navigation"
    >
      ☰
    </button>
  </div>

  <div id="stcNavGroups" class="stc-nav-groups">

    <div class="nav-group">
      <span class="nav-label">Control</span>
      <a href="/" data-route="/">Overview</a>
       <a href="/runtime.html" data-route="/runtime.html">Runtime</a>
      <a href="/shield.html" data-route="/shield.html">Shield</a>
      <a href="/sessions.html" data-route="/sessions.html">Sessions</a>
      <a href="/operator.html" data-route="/operator.html">Operator</a>
    </div>

    <div class="nav-group">
      <span class="nav-label">Tenancy</span>
      <a href="/tenants.html" data-route="/tenants.html">Tenants</a>
      <a href="/provision.html" data-route="/provision.html">Provision</a>
      <a href="/usage.html" data-route="/usage.html">Billing</a>
    </div>

    <div class="nav-group">
      <span class="nav-label">Analysis</span>
      <a href="/blast-radius.html" data-route="/blast-radius.html">Blast</a>
      <a href="/heatmap.html" data-route="/heatmap.html">Heatmap</a>
      <a href="/integrity.html" data-route="/integrity.html">Integrity</a>
      <a href="/intelligence.html" data-route="/intelligence.html">Intel</a>
      <a href="/copilot.html" data-route="/copilot.html">Copilot</a>
    </div>

    <div class="nav-group nav-group-support">
      <span class="nav-label">Support</span>
      <a href="/observability.html" data-route="/observability.html">Observability</a>
      <a href="/activity.html" data-route="/activity.html">Activity</a>
      <a href="/docs.html" data-route="/docs.html">Help</a>

      <span class="nav-status">
        <span class="status-dot"></span>
        Connected
      </span>
    </div>

  </div>

</nav>
`;
   }

  function highlightActiveNav() {
    const path = currentPath();

    document.querySelectorAll("[data-route]").forEach((link) => {
      const route = normalizePath(link.getAttribute("data-route"));
      const active = route === path;
      link.classList.toggle("active", active);

      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function bindNavToggle() {
    const toggle = document.getElementById("navToggle");
    const groups = document.getElementById("stcNavGroups");

    if (!toggle || !groups) return;

    toggle.addEventListener("click", () => {
      const open = groups.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    groups.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        groups.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function injectDemoBanner() {
    if (document.getElementById(DEMO_BANNER_ID)) return;

    const banner = document.createElement("div");
    banner.id = DEMO_BANNER_ID;
    banner.className = "demo-banner";
    banner.textContent =
      "Demo Mode — Follow: Runtime → Shield → Tenants → Sessions → Blast Radius → Operator";

    document.body.prepend(banner);
  }

  function loadNav() {
    const container = document.getElementById("nav-container");
    if (!container) return;

    container.innerHTML = buildNav();
    highlightActiveNav();
    bindNavToggle();

    document
      .querySelector('[data-route="/runtime.html"]')
      ?.classList.add("demo-highlight");
  }

  function initLayout() {
    injectDemoBanner();
    loadNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLayout);
  } else {
    initLayout();
  }
})();
