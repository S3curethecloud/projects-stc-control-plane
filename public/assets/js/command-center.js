const API_KEY = localStorage.getItem("STC_API_KEY")

const STREAM_URL = "https://ztr-runtime.fly.dev/v1/decisions/stream"

function formatTime(ts){
  return new Date(ts*1000).toLocaleTimeString()
}

/* =============================
   LIVE DECISION STREAM
============================= */

function addDecisionRow(event){

  const table=document.getElementById("activity_table")

  const row=document.createElement("tr")

  row.innerHTML=`
  <td>${formatTime(event.timestamp)}</td>
  <td>${event.tenant_id}</td>
  <td>${event.principal}</td>
  <td>${event.intent}</td>
  <td class="${event.decision==="allow"?"status-allow":"status-deny"}">
  ${event.decision}
  </td>
  <td>${event.risk_score || ""}</td>
  <td>${event.policy_revision || ""}</td>
  `

  table.prepend(row)

  if(table.children.length>100){
    table.removeChild(table.lastChild)
  }

}

function startStream(){

  const status=document.getElementById("stream_status")

  const url=`${STREAM_URL}?api_key=${API_KEY}`

  const source=new EventSource(url)

  status.innerText="Connected"

  source.onmessage=(msg)=>{
    try{
      const event=JSON.parse(msg.data)
      addDecisionRow(event)
    }catch(err){
      console.error("stream parse error",err)
    }
  }

  source.onerror=()=>{
    status.innerText="Reconnecting..."
    source.close()
    setTimeout(startStream,3000)
  }

}

/* =============================
   AUDIT INTEGRITY
============================= */

async function loadIntegrity(){

  const res=await fetch(
    "https://ztr-runtime.fly.dev/v1/audit/verify",
    {headers:{"X-Stc-Api-Key":API_KEY}}
  )

  const data=await res.json()

  document.getElementById("audit_status").textContent =
    data.status==="valid" ? "✔ VALID" : "BROKEN"

  document.getElementById("audit_events").textContent =
    "Events: "+data.events_verified

}

/* =============================
   ACTIVE SESSIONS
============================= */

async function loadSessions(){

  const res=await fetch(
    "https://ztr-runtime.fly.dev/v1/sessions/active",
    {headers:{"X-Stc-Api-Key":API_KEY}}
  )

  const data=await res.json()

  document.getElementById("session_count").textContent =
    data.active_sessions

  const table=document.getElementById("sessions_table")
  table.innerHTML=""

  for(const s of data.sessions){

    const row=document.createElement("tr")

    row.innerHTML=`
    <td>${s.session_id}</td>
    <td>${s.principal}</td>
    <td>${s.intent}</td>
    <td>${s.ttl}s</td>
    <td>
      <button onclick="revokeSession('${s.session_id}')">
      Revoke
      </button>
    </td>
    `

    table.appendChild(row)
  }

}

async function revokeSession(sessionId){

  await fetch(
    "https://ztr-runtime.fly.dev/v1/sessions/revoke",
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "X-Stc-Api-Key":API_KEY
      },
      body:JSON.stringify({session_id:sessionId})
    }
  )

  loadSessions()

}

/* =============================
   INIT
============================= */

startStream()
loadSessions()
loadIntegrity()

setInterval(loadSessions,5000)
setInterval(loadIntegrity,10000)
