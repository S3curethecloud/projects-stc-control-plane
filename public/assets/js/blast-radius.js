const apiKey = localStorage.getItem("STC_API_KEY");

const STREAM_URL =
  "https://ztr-runtime.fly.dev/v1/decisions/stream?api_key=" + apiKey;

const table = document.getElementById("blast_table");

const cy = cytoscape({

  container: document.getElementById("blast_graph"),

  elements: [],

  style: [

  {
  selector: 'node',
  style:{
  'label':'data(label)',
  'text-valign':'center',
  'text-halign':'center',
  'color':'#ffffff',
  'font-size':11,
  'font-weight':'bold',
  'text-outline-width':2,
  'text-outline-color':'#0b2239',
  'width':28,
  'height':28
  }
  },

  {
  selector: 'node[type="agent"]',
  style:{
  'background-color':'#4da3ff'
  }
  },

  {
  selector: 'node[type="intent"]',
  style:{
  'background-color':'#ffc857',
  'label':'data(label)',
  'color':'#ffffff',
  'text-outline-width':2,
  'text-outline-color':'#000000'
  }
  },

  {
  selector: 'node[type="resource"]',
  style:{
  'background-color':'#ff5c5c'
  }
  },

  {
  selector: 'node[type="tenant"]',
  style:{
  'background-color':'#9b6cff'
  }
  },

  {
  selector:'edge',
  style:{
  'curve-style':'bezier',
  'target-arrow-shape':'triangle',
  'line-color':'#8fb7d9',
  'target-arrow-color':'#8fb7d9',
  'width':2,
  'opacity':0.9
  }
  },

  {
    selector: 'edge.attack-path',
    style: {
      'line-color': '#ff4d4f',
      'target-arrow-color': '#ff4d4f',
      'width': 4
    }
  },

  {
    selector: 'node.attack-node',
    style: {
      'border-width': 3,
      'border-color': '#ff4d4f'
    }
  }

  ],

  layout: {
    name: "breadthfirst",
    directed: true,
    padding: 20,
    spacingFactor: 1.3,
    avoidOverlap: true,
    animate: true
  }

});

function relayoutGraph(){
  cy.layout({
    name: "breadthfirst",
    directed: true,
    padding: 20,
    spacingFactor: 1.3,
    animate: true
  }).run();
}

const seenEvents = new Set();

function eventKey(event) {
  return [
    event.timestamp,
    event.tenant_id || "unknown",
    event.principal || "",
    event.intent || "",
    event.decision || ""
  ].join("|");
}

function processEvent(event) {

  const key = eventKey(event);

  if (seenEvents.has(key)) return;

  seenEvents.add(key);

  addRow(event);
  updateSummary(event);
  addGraphEvent(event);

}

let totalDecisions = 0;
const agents = new Set();
const tenants = new Set();

function computeImpact(intent) {

  if (!intent) return "application";

  if (intent.includes("refund"))
    return "billing-system";

  if (intent.includes("token"))
    return "identity-system";

  if (intent.includes("session"))
    return "auth-system";

  return "application";
}

function formatTime(ts) {

  if (!ts) return "";

  return new Date(ts).toLocaleString();

}

function addRow(event) {

  const key = event.timestamp + event.principal + event.intent;

  if (document.getElementById(key)) return;

  const impact = computeImpact(event.intent);

  const row = document.createElement("tr");

  row.id = key;

  row.innerHTML = `
    <td>${formatTime(event.timestamp)}</td>
    <td>${event.principal}</td>
    <td>${event.intent}</td>
    <td>${event.tenant_id}</td>
    <td>${event.decision}</td>
    <td>${impact}</td>
  `;

  table.prepend(row);

  if (table.children.length > 100) {
    table.removeChild(table.lastChild);
  }

}

function updateSummary(event) {

  totalDecisions++;

  agents.add(event.principal);

  if (event.tenant_id && event.tenant_id !== "unknown") {
    tenants.add(event.tenant_id);
  }

  document.getElementById("total_decisions").innerText = totalDecisions;
  document.getElementById("active_agents").innerText = agents.size;
  document.getElementById("active_tenants").innerText = tenants.size;

  if (event.decision === "deny") {
    const el = document.getElementById("high_risk");
    el.innerText = String(parseInt(el.innerText || "0", 10) + 1);
  }

}

function ensureNode(id, label, type) {

  if (cy.getElementById(id).length === 0) {
    cy.add({
      data: {
        id: id,
        label: label,
        type: type
      }
    });
  }

}

function addEdgeSafe(source, target) {

  const id = source + "_" + target;

  if (!cy.getElementById(id).length) {
    cy.add({
      data: {
        id,
        source,
        target
      }
    });
  }

}

function addGraphEvent(event) {

  const agent = "agent_" + event.principal;
  const intent = "intent_" + event.intent;
  const resource = "resource_" + computeImpact(event.intent);
  const tenantId = event.tenant_id || "unknown";
  const tenant = "tenant_" + tenantId;

  ensureNode(agent, event.principal, "agent");
  ensureNode(intent, event.intent, "intent");
  ensureNode(resource, computeImpact(event.intent), "resource");
  ensureNode(tenant, tenantId, "tenant");

  addEdgeSafe(agent, intent);
  addEdgeSafe(intent, resource);
  addEdgeSafe(resource, tenant);

  if (cy.nodes().length < 40) {
    relayoutGraph();
  }

}

function detectAttackPaths() {

  const paths = [];

  cy.edges().forEach(e1 => {
    cy.edges().forEach(e2 => {
      cy.edges().forEach(e3 => {

        if (
          e1.target().id() === e2.source().id() &&
          e2.target().id() === e3.source().id()
        ) {

          const n1 = cy.getElementById(e1.source().id());
          const n2 = cy.getElementById(e1.target().id());
          const n3 = cy.getElementById(e2.target().id());
          const n4 = cy.getElementById(e3.target().id());

          if (
            n1.data("type") === "agent" &&
            n2.data("type") === "intent" &&
            n3.data("type") === "resource" &&
            n4.data("type") === "tenant"
          ) {
            paths.push({
              edges: [e1.id(), e2.id(), e3.id()],
              resource: n3.id()
            });
          }

        }

      });
    });
  });

  return paths;
}

function clearAttackHighlights() {
  cy.edges().removeClass("attack-path");
  cy.nodes().removeClass("attack-node");
}

function highlightAttackPaths(paths) {

  clearAttackHighlights();

  paths.forEach(path => {

    path.edges.forEach(edgeId => {
      cy.getElementById(edgeId).addClass("attack-path");
    });

    cy.getElementById(path.resource).addClass("attack-node");

  });

}

function analyzeGraph() {
  const paths = detectAttackPaths();
  highlightAttackPaths(paths);
}

async function loadBlastRadius() {

  const sessions = await STC_API.getActiveSessions();

  table.innerHTML = "";

  for (const s of sessions.sessions) {

    const event = {
      timestamp: s.issued_at * 1000,
      principal: s.principal,
      intent: s.intent,
      tenant_id: s.tenant_id || "unknown",
      decision: "allow"
    };

    processEvent(event);

  }

}

async function loadRecent() {

  const res = await fetch(
    "https://ztr-runtime.fly.dev/v1/decisions?limit=20",
    { headers: { "X-Stc-Api-Key": apiKey } }
  );

  const data = await res.json();

  const events = data.events || [];

  events.forEach(e => {

    const event = {
      timestamp: e.time,
      tenant_id: e.tenant_id || "unknown",
      principal: e.principal,
      intent: e.intent,
      decision: e.result
    };

    processEvent(event);

  });

}

function startStream() {

  const source = new EventSource(STREAM_URL);

  source.onmessage = (msg) => {

    try {

      const event = JSON.parse(msg.data);

      event.timestamp = event.timestamp * 1000;

      processEvent(event);
      analyzeGraph();

      status.innerText = "Connected";

    } catch (err) {

      console.error("stream parse error", err);

    }

  };

  source.onerror = () => {
    console.log("stream reconnecting...");
  };

}

async function init() {

  await loadBlastRadius();
  await loadRecent();

  analyzeGraph();

  startStream();

}

init();
