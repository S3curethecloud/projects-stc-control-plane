// SecureTheCloud layout loader

// ------------------------------------------------------
// Global Runtime Configuration
// ------------------------------------------------------

window.STC_API_KEY = "FCn017yGzG5Y7zv3HcZUg03vcNYfHNCXpnEWBOMPXr0";


// ------------------------------------------------------
// Navigation Loader
// ------------------------------------------------------

async function loadNav() {
  const container = document.getElementById("nav-container");

  if (!container) return;

  try {
    const res = await fetch("/partials/nav.html");

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    container.innerHTML = html;

    // Ensure active nav is applied AFTER nav is injected
    highlightActiveNav();

  } catch (err) {
    console.error("Failed to load navigation", err);
  }
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
