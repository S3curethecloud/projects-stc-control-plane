const btn = document.getElementById("login_btn");

if (!btn) {
  console.error("login_btn not found");
} else {

  btn.onclick = () => {

    const input = document.getElementById("token_input");
    const token = input ? input.value.trim() : "";

    if (!token) {
      alert("Token required");
      return;
    }

    localStorage.setItem("stc_operator_token", token);

    window.location.href = "/console.html";
  };

}
