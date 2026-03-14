const askBtn = document.getElementById("ask-copilot")

askBtn.addEventListener("click", async () => {

  const query = document.getElementById("copilot-query").value

  const response = await fetch("/api/copilot", {
    method: "POST",
    body: JSON.stringify({query})
  })

  const data = await response.json()

  document.getElementById("copilot-response").textContent =
    JSON.stringify(data, null, 2)
})
