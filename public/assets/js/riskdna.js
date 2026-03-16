(function(){

const serviceHits = {}

function drawMap() {

  const container = document.getElementById("blast_radius_map")
  if(!container) return

  container.innerHTML = ""

  const services = Object.keys(serviceHits)

  if(services.length === 0){
    container.innerHTML =
      "<div style='color:#8aa4d4'>Awaiting system impact data…</div>"
    return
  }

  const grid = document.createElement("div")
  grid.style.display = "grid"
  grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(180px,1fr))"
  grid.style.gap = "16px"

  services.forEach(service => {

    const count = serviceHits[service]

    const card = document.createElement("div")

    card.style.background = "#0f223d"
    card.style.borderRadius = "10px"
    card.style.padding = "14px"
    card.style.border = "1px solid rgba(85,183,255,0.15)"

    let color = "#2ecc71"
    if(count > 5) color = "#ffb84d"
    if(count > 10) color = "#ff6b6b"

    card.innerHTML = `
      <div style="font-weight:700">${service}</div>
      <div style="margin-top:6px;color:${color}">
        impact events: ${count}
      </div>
    `

    grid.appendChild(card)

  })

  container.appendChild(grid)

}

window.GlobalBlastRadius = {

  register(event){

    const impacts = event.impacts || []

    impacts.forEach(service => {

      if(!serviceHits[service]){
        serviceHits[service] = 0
      }

      serviceHits[service]++

    })

    drawMap()
  }

}

})();
