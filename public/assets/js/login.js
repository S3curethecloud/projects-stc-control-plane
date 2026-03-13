import { setAdminSecret, setApiKey, clearAdminSecret, clearApiKey } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const enterBtn = document.getElementById("enter_console_btn");
  const clearBtn = document.getElementById("clear_keys_btn");
  const adminInput = document.getElementById("admin_secret");
  const apiKeyInput = document.getElementById("api_key");

  if (adminInput) {
    adminInput.value = localStorage.getItem("STC_ADMIN_SECRET") || "";
  }

  if (apiKeyInput) {
    apiKeyInput.value = localStorage.getItem("STC_API_KEY") || "";
  }

  if (enterBtn) {
    enterBtn.addEventListener("click", () => {
      const adminSecret = adminInput ? adminInput.value.trim() : "";
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";

      if (!adminSecret) {
        alert("Admin Secret required");
        return;
      }

      setAdminSecret(adminSecret);

      if (apiKey) {
        setApiKey(apiKey);
      } else {
        clearApiKey();
      }

      window.location.href = "/console.html";
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearAdminSecret();
      clearApiKey();

      if (adminInput) adminInput.value = "";
      if (apiKeyInput) apiKeyInput.value = "";
    });
  }
});
