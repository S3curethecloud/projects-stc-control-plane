// SecureTheCloud layout loader

(function () {
  const DEMO_BANNER_ID = "stc-demo-banner";

  function getStoredApiKey() {
    try {
      return localStorage.getItem("STC_API_KEY") || "";
    } catch {
      return "";
    }
  }

  // Keep backward compatibility for any page still reading window.STC_API_KEY
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
      <a href="/">SecureTheCloud</a>
    </div>

    <button
      id="stc-nav-toggle"
      class="nav-toggle"
      type="button"
      aria-expanded="false"
      aria-controls="stc-nav-groups"
      aria-label="Toggle navigation"
    >
      ☰
    </button>
  </div>

  <div id="stc-nav-groups" class="stc-nav-groups">

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
    const toggle = document.getElementById("stc-nav-toggle");
    const groups = document.getElementById("stc-nav-groups");

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
    if (!document.getElementById("nav-container")) return;
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
