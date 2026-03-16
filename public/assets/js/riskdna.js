(function () {
  const BLAST_MAP = {
    "refund:create": ["payment_db", "audit_ledger", "ledger_backup"],
    "payment:update": ["payment_db", "notification_bus"],
    "token:issue": ["session_store", "audit_ledger"],
    "default": ["runtime_control"]
  };

  let latestEvent = null;

  function clear(container) {
    container.innerHTML = "";
  }

  function riskColor(score) {
    const n = Number(score || 0);
    if (n >= 60) return "#ff6b6b";
    if (n >= 30) return "#ffb84d";
    return "#2ecc71";
  }

  function drawNode(svg, x, y, w, h, title, subtitle, fill) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("rx", 14);
    rect.setAttribute("fill", fill);
    rect.setAttribute("stroke", "rgba(85,183,255,0.22)");
    rect.setAttribute("stroke-width", "1");

    const t1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t1.setAttribute("x", x + 16);
    t1.setAttribute("y", y + 28);
    t1.setAttribute("fill", "#ffffff");
    t1.setAttribute("font-size", "16");
    t1.setAttribute("font-weight", "700");
    t1.textContent = title;

    const t2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t2.setAttribute("x", x + 16);
    t2.setAttribute("y", y + 52);
    t2.setAttribute("fill", "#9eb0d5");
    t2.setAttribute("font-size", "13");
    t2.textContent = subtitle;

    g.appendChild(rect);
    g.appendChild(t1);
    g.appendChild(t2);
    svg.appendChild(g);
  }

  function drawLine(svg, x1, y1, x2, y2, color, dashed = false) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");
    if (dashed) line.setAttribute("stroke-dasharray", "8 8");
    svg.appendChild(line);
  }

  function drawLabel(svg, x, y, text, color = "#8aa4d4") {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x);
    label.setAttribute("y", y);
    label.setAttribute("fill", color);
    label.setAttribute("font-size", "12");
    label.setAttribute("font-weight", "600");
    label.textContent = text;
    svg.appendChild(label);
  }

  function renderPlaceholder(container) {
    clear(container);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1100 360");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "360");

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", "1100");
    bg.setAttribute("height", "360");
    bg.setAttribute("rx", "12");
    bg.setAttribute("fill", "#0b162b");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "550");
    text.setAttribute("y", "185");
    text.setAttribute("fill", "#9eb0d5");
    text.setAttribute("font-size", "22");
    text.setAttribute("text-anchor", "middle");
    text.textContent = "Awaiting live RiskDNA event…";

    svg.appendChild(bg);
    svg.appendChild(text);
    container.appendChild(svg);
  }

  function renderEvent(container, event) {
    clear(container);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1100 360");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "360");

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", "1100");
    bg.setAttribute("height", "360");
    bg.setAttribute("rx", "12");
    bg.setAttribute("fill", "#0b162b");
    svg.appendChild(bg);

    const impacts = BLAST_MAP[event.intent] || BLAST_MAP.default;
    const decisionColor = event.decision === "deny" ? "#ff6b6b" : "#2ecc71";
    const scoreColor = riskColor(event.risk_score);

    drawNode(svg, 60, 120, 180, 76, "Tenant", event.tenant_id || "--", "#102041");
    drawNode(svg, 300, 70, 200, 76, "Principal", event.principal || "--", "#102041");
    drawNode(svg, 300, 210, 200, 76, "Intent", event.intent || "--", "#102041");
    drawNode(svg, 560, 70, 190, 76, "Decision", (event.decision || "--").toUpperCase(), "#13253b");
    drawNode(svg, 560, 210, 190, 76, "Risk Score", String(event.risk_score ?? "--"), "#13253b");

    drawLine(svg, 240, 158, 300, 108, "#4ea1ff");
    drawLine(svg, 240, 158, 300, 248, "#4ea1ff");
    drawLine(svg, 500, 108, 560, 108, decisionColor);
    drawLine(svg, 500, 248, 560, 248, scoreColor);

    drawLabel(svg, 518, 96, "policy");
    drawLabel(svg, 518, 236, "risk");

    impacts.forEach((impact, index) => {
      const y = 58 + (index * 90);
      drawNode(svg, 830, y, 210, 64, "Blast Radius", impact, "#162a3f");
      drawLine(svg, 750, 108, 830, y + 32, "#ffb84d", true);
    });

    drawLabel(svg, 62, 42, "Latest authorization path", "#55b7ff");
    drawLabel(svg, 560, 328, `Policy Revision: ${event.policy_revision || "--"}`, "#9eb0d5");

    container.appendChild(svg);
  }

  window.RiskDNAGraph = {
    pushEvent(event) {
      latestEvent = event;
      const container = document.getElementById("riskdna_graph");
      if (!container) return;
      renderEvent(container, latestEvent);
    },
    reset() {
      latestEvent = null;
      const container = document.getElementById("riskdna_graph");
      if (!container) return;
      renderPlaceholder(container);
    }
  };

  function init() {
    const container = document.getElementById("riskdna_graph");
    if (!container) return;
    renderPlaceholder(container);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
