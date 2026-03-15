let nodes = new vis.DataSet([
  { id: 1, label: "tenant-launch", color: "#4ea1ff" },
  { id: 2, label: "agent_refund", color: "#2ecc71" },
  { id: 3, label: "refund:create", color: "#f39c12" },
  { id: 4, label: "payment_db", color: "#ff6b6b" }
])

let edges = new vis.DataSet([
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 4 }
])

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
