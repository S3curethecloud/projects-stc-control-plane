let nodes = new vis.DataSet([])
let edges = new vis.DataSet([])

const container = document.getElementById("riskdna_graph")

const data = {
  nodes: nodes,
  edges: edges
}

const options = {

  nodes: {
    shape: "dot",
    size: 16,
    font: { color: "#ffffff" }
  },

  edges: {
    color: "#4ea1ff",
    smooth: true
  },

  physics: {
    stabilization: false,
    barnesHut: {
      gravitationalConstant: -4000
    }
  },

  interaction: {
    hover: true
  }

}

const network = new vis.Network(container, data, options)
