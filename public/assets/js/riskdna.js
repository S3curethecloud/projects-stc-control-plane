let nodes = new vis.DataSet([])
let edges = new vis.DataSet([])

let latestEvent = null

const EVENT_HISTORY_LIMIT = 50
const eventHistory = []

let threatPulseActive = false
let threatPulseTime = 0

const container = document.getElementById("riskdna_graph")

const data = {
  nodes: nodes,
  edges: edges
}

const options = {
  nodes: {
    shape: "dot",
    size: 18,
    font: { color: "#ffffff" }
  },
  edges: {
    color: "#4ea1ff",
    smooth: true
  },
  physics: {
    stabilization: false,
    barnesHut: { gravitationalConstant: -4000 }
  },
  interaction: {
    hover: true
  }
}

const network = new vis.Network(container, data, options)

function riskColor(score){
  if(score >= 40) return "#ff6b6b"
  if(score >= 10) return "#ffb84d"
  return "#2ecc71"
}

function deriveImpacts(event){

  if(event.impacts) return event

  const impacts = []

  const intent = event.intent || ""

  if(intent.includes("refund")){
    impacts.push("payment_db")
    impacts.push("ledger")
  }

  if(intent.includes("token")){
    impacts.push("auth_service")
  }

  if(intent.includes("session")){
    impacts.push("session_store")
  }

  event.impacts = impacts

  return event
}

function updateTimelineSlider() {

  const slider = document.getElementById("riskdna_timeline");

  if (!slider) return;
  if (eventHistory.length === 0) return;

  const latestIndex = eventHistory.length - 1;

  slider.max = latestIndex;
  slider.value = latestIndex;

  window.RiskDNATimeline.replay(latestIndex);
}

function renderEvent(container, event){

  if(!container) return

  nodes.clear()
  edges.clear()

  const risk = event.risk_score || 0
  const riskNodeColor = riskColor(risk)

  let decisionColor

  if (event.decision === "deny") {

    if (threatPulseActive && Date.now() - threatPulseTime < 1500) {
      decisionColor = "#ff4d4d"
    } else {
      decisionColor = "#3a1418"
    }

  } else {

    decisionColor = "#0f2b1e"

  }

  nodes.add([
    { id: 1, label: event.tenant_id || "tenant", color: "#4ea1ff" },
    { id: 2, label: event.principal || "principal", color: "#2ecc71" },
    { id: 3, label: event.intent || "intent", color: "#f39c12" },
    { id: 4, label: "Risk Score\n"+risk, color: riskNodeColor },
    { id: 5, label: event.decision || "decision", color: decisionColor }
  ])

  edges.add([
    { from:1, to:2 },
    { from:2, to:3 },
    { from:3, to:4 },
    { from:4, to:5 }
  ])

  if (threatPulseActive && Date.now() - threatPulseTime > 1500) {
    threatPulseActive = false
  }

}

window.RiskDNAGraph = {

  pushEvent(event){

    event = deriveImpacts(event)

    latestEvent = event

    if (event.decision === "deny") {
      threatPulseActive = true
      threatPulseTime = Date.now()
    }

    eventHistory.push(event)

    if (eventHistory.length > EVENT_HISTORY_LIMIT) {
      eventHistory.shift()
    }

    updateTimelineSlider()

  }

}

window.RiskDNATimeline = {

  replay(index){

    const event = eventHistory[index]

    if(!event) return

    const container = document.getElementById("riskdna_graph")

    renderEvent(container, event)

  }

}
