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
  'font-size':10,
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
  'color':'#000000'
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
  }

  ],

  layout: {
    name: "breadthfirst",
    directed: true,
    padding: 20
  }

});

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

function updateSummary(event){

totalDecisions++;

agents.add(event.principal);
tenants.add(event.tenant_id);

document.getElementById("total_decisions").innerText = totalDecisions;
document.getElementById("active_agents").innerText = agents.size;
document.getElementById("active_tenants").innerText = tenants.size;

if(event.decision === "deny"){
  const el = document.getElementById("high_risk");
  el.innerText = parseInt(el.innerText) + 1;
}

}

function ensureNode(id, label, type){

  if(!cy.getElementById(id).length){

    cy.add({
      data:{
        id:id,
        label:label,
        type:type
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

function animateEdge(source, target){

  const edgeId = source + "_" + target;

  const edge = cy.getElementById(edgeId);

  if(!edge.length) return;

  edge.animate({
    style:{
      'line-color':'#00e5ff',
      'target-arrow-color':'#00e5ff',
      'width':4
    }
  },{
    duration:300
  }).delay(200).animate({
    style:{
      'line-color':'#8fb7d9',
      'target-arrow-color':'#8fb7d9',
      'width':2
    }
  },{
    duration:500
  });

}

function addGraphEvent(event){

const agent = "agent_" + event.principal;
const intent = "intent_" + event.intent;
const resource = "resource_" + computeImpact(event.intent);
const tenant = "tenant_" + (event.tenant_id || "unknown");

ensureNode(agent, event.principal, "agent");

ensureNode(intent, event.intent, "intent");

ensureNode(resource, computeImpact(event.intent), "resource");

ensureNode(tenant, event.tenant_id || "unknown", "tenant");

addEdgeSafe(agent, intent);
addEdgeSafe(intent, resource);
addEdgeSafe(resource, tenant);

animateEdge(agent, intent);
animateEdge(intent, resource);
animateEdge(resource, tenant);

if(cy.nodes().length < 25){
  cy.layout({ name:"breadthfirst", directed:true }).run();
}

}

async function loadBlastRadius() {

  const sessions = await STC_API.getActiveSessions();

  table.innerHTML = "";

  for (const s of sessions.sessions) {

    const event = {
      timestamp: s.issued_at,
      principal: s.principal,
      intent: s.intent,
      tenant_id: s.tenant_id || "unknown",
      decision: "allow"
    };

    addRow(event);
    updateSummary(event);
    addGraphEvent(event);

  }

}

async function loadRecent() {

  const res = await fetch(
    "https://ztr-runtime.fly.dev/v1/decisions?limit=20",
    { headers: { "X-Stc-Api-Key": apiKey } }
  );

  const data = await res.json();

  for (const e of data.events) {

    const event = {
      timestamp: e.time,
      tenant_id: e.tenant_id || "unknown",
      principal: e.principal,
      intent: e.intent,
      decision: e.result
    };

    addRow(event);
    updateSummary(event);
    addGraphEvent(event);
  }

}

function startStream() {

  const source = new EventSource(STREAM_URL);

  source.onmessage = (msg) => {

    try {

      const event = JSON.parse(msg.data);

      event.timestamp = event.timestamp * 1000;

      addRow(event);
      updateSummary(event);
      addGraphEvent(event);

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
  startStream();

}

init();
