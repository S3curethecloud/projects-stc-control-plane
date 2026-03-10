// SecureTheCloud layout loader

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

document.addEventListener("DOMContentLoaded", loadNav);
