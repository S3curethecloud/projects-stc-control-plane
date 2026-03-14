import { setAdminSecret, setApiKey, clearAdminSecret, clearApiKey } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {

  const enterBtn = document.getElementById("enter_console_btn");
  const clearBtn = document.getElementById("clear_keys_btn");

  const adminInput = document.getElementById("admin_secret");
  const apiKeyInput = document.getElementById("api_key");

  if (enterBtn) {
    enterBtn.addEventListener("click", () => {

      const adminSecret = adminInput.value.trim();
      const apiKey = apiKeyInput.value.trim();

      if (!adminSecret) {
        alert("Admin Secret required");
        return;
      }

      setAdminSecret(adminSecret);

      if (apiKey) {
        setApiKey(apiKey);
      }

      window.location.href = "/console.html";

    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {

      clearAdminSecret();
      clearApiKey();

      adminInput.value = "";
      apiKeyInput.value = "";

    });
  }

});
