const BLAST_MAP = {
  "refund:create": ["payment_db", "audit_ledger", "ledger_backup"],
  "payment:update": ["payment_db", "notification_bus"],
  "token:issue": ["session_store", "audit_ledger"],
  "default": ["runtime_control"]
};

function renderBlastRadius(event) {

  const svg = document.getElementById("blast_radius_graph");

  if (!svg) return;

  svg.innerHTML = "";

  const title = document.createElementNS("http://www.w3.org/2000/svg","text");
  title.setAttribute("x","40");
  title.setAttribute("y","40");
  title.setAttribute("fill","#ffffff");
  title.setAttribute("font-size","20");
  title.textContent = `${event.principal} → ${event.intent}`;

  svg.appendChild(title);

  const impacts = BLAST_MAP[event.intent] || BLAST_MAP.default;

  impacts.forEach((impact,index)=>{

    const y = 120 + (index * 80);

    const node = document.createElementNS("http://www.w3.org/2000/svg","text");

    node.setAttribute("x","260");
    node.setAttribute("y",y);
    node.setAttribute("fill","#9eb0d5");
    node.setAttribute("font-size","18");

    node.textContent = impact;

    svg.appendChild(node);

  });

}

async function startBlastRadiusStream(){

  const API_KEY = window.STC_API_KEY;

  const res = await fetch(
    "https://ztr-runtime.fly.dev/v1/decisions/stream",
    {
      headers: {
        "Accept":"text/event-stream",
        "X-Stc-Api-Key": API_KEY
      }
    }
  );

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while(true){

    const {value,done} = await reader.read();

    if(done) break;

    buffer += decoder.decode(value,{stream:true});

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop();

    for(const block of blocks){

      const line = block.split("\n").find(l => l.startsWith("data:"));

      if(!line) continue;

      const event = JSON.parse(line.slice(5));

      renderBlastRadius(event);

    }

  }

}

document.addEventListener("DOMContentLoaded", startBlastRadiusStream);
