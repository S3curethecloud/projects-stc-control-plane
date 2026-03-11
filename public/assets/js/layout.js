// SecureTheCloud layout loader

const token = localStorage.getItem("stc_operator_token");

if (!token && window.location.pathname !== "/login.html") {
  window.location.href = "/login.html";
}

function stcLogout() {

  localStorage.removeItem("stc_operator_token");

  window.location.href = "/login.html";

}

async function loadNav() {

  const container = document.getElementById("nav-container");

  if (!container) return;

  try {

    const res = await fetch("/partials/nav.html");

    const html = await res.text();

    container.innerHTML = html;

  } catch (err) {

    console.error("Failed to load navigation", err);

  }

}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadNav);
} else {
  loadNav();
}
