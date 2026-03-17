if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

const BLAST_MAP = {
  "refund:create": ["payment_db", "audit_ledger", "ledger_backup"],
  "payment:update": ["payment_db", "notification_bus"],
  "token:issue": ["session_store", "audit_ledger"],
  "default": ["runtime_control"]
};

const serviceHits = {};

function setBlastNotes(message) {
  const el = document.getElementById("blast_radius_notes");
  if (!el) return;
  el.textContent = message;
}

function resetHits() {
  Object.keys(serviceHits).forEach((key) => delete serviceHits[key]);
}

function registerImpact(event) {
  const impacts = BLAST_MAP[event.intent] || BLAST_MAP.default;

  impacts.forEach((service) => {
    if (!serviceHits[service]) {
      serviceHits[service] = 0;
    }
    serviceHits[service] += 1;
  });
}

function drawMap() {
  const container = document.getElementById("blast_radius_map");
  if (!container) return;

  container.innerHTML = "";

  const services = Object.keys(serviceHits);

  if (services.length === 0) {
    container.innerHTML =
      "<div class='empty'>No active blast radius data available.</div>";
    return;
  }

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(220px,1fr))";
  grid.style.gap = "16px";

  services.forEach((service) => {
    const count = serviceHits[service];

    let color = "#2ecc71";
    if (count > 5) color = "#ffb84d";
    if (count > 10) color = "#ff6b6b";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${service}</h3>
      <div class="card-value">${count}</div>
      <div class="card-sub" style="color:${color}">
        impact events
      </div>
    `;

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

async function loadBlastRadius() {
  try {
    resetHits();

    const res = await STC_API.getAdminSessions();
    const sessions = Array.isArray(res.sessions) ? res.sessions : [];

    sessions.forEach((session) => {
      registerImpact({ intent: session.intent });
    });

    drawMap();
    setBlastNotes(`Mapped ${sessions.length} active session(s) into impacted services.`);

  } catch (err) {
    console.error("Blast radius load failed:", err);
    drawMap();
    setBlastNotes("Blast radius data unavailable.");
  }
}

document.addEventListener("DOMContentLoaded", loadBlastRadius);
