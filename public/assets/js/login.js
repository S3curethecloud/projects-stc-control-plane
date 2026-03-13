```javascript
// FILE: public/assets/js/login.js
// SecureTheCloud Operator Login

document.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("login_btn");
  const input = document.getElementById("token_input");
  const status = document.getElementById("login_status");

  function submitLogin() {

    const token = input.value.trim();

    if (!token) {
      status.textContent = "Token required";
      return;
    }

    try {

      localStorage.setItem("stc_operator_token", token);

      status.textContent = "Token stored. Loading console...";

      setTimeout(() => {
        window.location.href = "/console.html";
      }, 300);

    } catch (err) {
      console.error("Login error:", err);
      status.textContent = "Failed to store token";
    }

  }

  // Button click
  if (btn) {
    btn.addEventListener("click", submitLogin);
  }

  // Ctrl + Enter submit
  if (input) {
    input.addEventListener("keydown", (event) => {

      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        submitLogin();
      }

    });
  }

});
```
