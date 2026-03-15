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

function drawBlastRadius(intent){

  const canvas=document.getElementById("blast_canvas")

  const ctx=canvas.getContext("2d")

  ctx.clearRect(0,0,400,400)

  ctx.beginPath()
  ctx.arc(200,200,40,0,2*Math.PI)
  ctx.fillStyle="#3aa6ff"
  ctx.fill()

  ctx.fillText("Agent",180,205)

  ctx.beginPath()
  ctx.arc(200,200,120,0,2*Math.PI)
  ctx.strokeStyle="#ff9c3a"
  ctx.stroke()

  ctx.fillText(intent,160,100)

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

  drawBlastRadius(event.intent)

}

function startStream() {

  const source = new EventSource(STREAM_URL);

  source.onmessage = (msg) => {

    try {

      const event = JSON.parse(msg.data);

      event.timestamp = event.timestamp * 1000;

      processEvent(event);
      analyzeGraph();

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
