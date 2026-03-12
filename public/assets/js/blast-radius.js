const apiKey = localStorage.getItem("STC_API_KEY");

const STREAM_URL =
  "https://ztr-runtime.fly.dev/v1/decisions/stream?api_key=" + apiKey;

const table = document.getElementById("blast_table");

const graph = cytoscape({
  container: document.getElementById("blast_graph"),

  style: [
    {
      selector: "node",
      style: {
        "background-color": "#4db3ff",
        "label": "data(label)",
        "color": "#fff",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "10px"
      }
    },
    {
      selector: "edge",
      style: {
        "line-color": "#7aa8d8",
        "target-arrow-color": "#7aa8d8",
        "target-arrow-shape": "triangle"
      }
    }
  ],

  layout:{
    name:"breadthfirst",
    directed:true,
    spacingFactor:1.6,
    padding:30,
    animate:false
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

}

function ensureNode(id, label){

  if(graph.getElementById(id).length === 0){

    graph.add({
      data:{
        id:id,
        label:label
      }
    });

  }

}

function ensureEdge(source,target){

  const id = source + "_" + target;

  if(graph.getElementById(id).length === 0){

    graph.add({
      data:{
        id:id,
        source:source,
        target:target
      }
    });

  }

}

function addGraphEvent(event){

const agent = "agent_" + event.principal;
const intent = "intent_" + event.intent;
const resource = "resource_" + computeImpact(event.intent);
const tenant = "tenant_" + event.tenant_id;

ensureNode(agent, event.principal);
ensureNode(intent, event.intent);
ensureNode(resource, computeImpact(event.intent));
ensureNode(tenant, event.tenant_id);

ensureEdge(agent,intent);
ensureEdge(intent,resource);
ensureEdge(resource,tenant);

graph.layout({
  name:"breadthfirst",
  directed:true,
  spacingFactor:1.6,
  padding:30,
  animate:false
}).run();

}

async function loadBlastRadius() {

  const sessions = await STC_API.getActiveSessions();

  const table = document.getElementById("blast_table");

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

  const apiKey = localStorage.getItem("STC_API_KEY");

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
