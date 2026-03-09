// FILE: public/assets/js/login.js

const ADMIN_KEY = "STC_ADMIN_SECRET";
const API_KEY = "STC_API_KEY";

function saveCredentials() {

  const admin = document.getElementById("admin_secret").value.trim();
  const api = document.getElementById("api_key").value.trim();

  if (!admin) {
    alert("Admin secret is required");
    return;
  }

  localStorage.setItem(ADMIN_KEY, admin);

  if (api) {
    localStorage.setItem(API_KEY, api);
  }

  window.location.href = "console.html";

}

function clearCredentials() {

  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(API_KEY);

  alert("Credentials cleared");

}
