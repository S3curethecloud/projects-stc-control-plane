(function(){

const canvas = document.getElementById("riskdna_universe")

if(!canvas) return

const ctx = canvas.getContext("2d")

let width
let height

function resize(){
  width = canvas.clientWidth
  height = canvas.clientHeight
  canvas.width = width
  canvas.height = height
}

resize()
window.addEventListener("resize", resize)

const nodes = []

function createNode(type, label){

  return {
    type,
    label,
    angle: Math.random()*Math.PI*2,
    orbit: 60 + Math.random()*140,
    speed: 0.002 + Math.random()*0.003
  }

}

function addEvent(event){

  nodes.push(createNode("tenant", event.tenant_id))
  nodes.push(createNode("principal", event.principal))
  nodes.push(createNode("intent", event.intent))

  const impacts = event.impacts || []

  impacts.forEach(s => {
    nodes.push(createNode("service", s))
  })

  if(nodes.length > 40){
    nodes.splice(0, nodes.length-40)
  }

}

window.RiskDNAUniverse = {
  ingest(event){
    addEvent(event)
  }
}

function drawNode(x,y,color,label){

  ctx.beginPath()
  ctx.arc(x,y,5,0,Math.PI*2)
  ctx.fillStyle = color
  ctx.fill()

  ctx.font="11px system-ui"
  ctx.fillStyle="#9eb0d5"
  ctx.fillText(label,x+8,y+4)

}

function frame(){

  ctx.clearRect(0,0,width,height)

  const cx = width/2
  const cy = height/2

  nodes.forEach(n => {

    n.angle += n.speed

    const x = cx + Math.cos(n.angle)*n.orbit
    const y = cy + Math.sin(n.angle)*n.orbit

    let color="#55b7ff"

    if(n.type==="tenant") color="#2ecc71"
    if(n.type==="principal") color="#ffb84d"
    if(n.type==="service") color="#ff6b6b"

    drawNode(x,y,color,n.label)

  })

  requestAnimationFrame(frame)

}

frame()

})()
