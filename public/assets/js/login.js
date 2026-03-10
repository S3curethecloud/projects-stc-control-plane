const btn = document.getElementById("login_btn");

btn.onclick = () => {

  const token = document.getElementById("token_input").value.trim();

  if (!token) {
    alert("Token required");
    return;
  }

  localStorage.setItem("stc_operator_token", token);

  window.location.href = "/console.html";

};
