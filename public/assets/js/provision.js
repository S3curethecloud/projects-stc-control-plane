if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}

// FILE: public/assets/js/provision.js

const provisionBtn = document.getElementById("provision_btn");
const tenantIdInput = document.getElementById("tenant_id");
const labelInput = document.getElementById("label");
const keyLabelInput = document.getElementById("key_label");
const provisionNotes = document.getElementById("provision_notes");
const provisionResult = document.getElementById("provision_result");

function setNotes(message) {
  if (provisionNotes) {
    provisionNotes.textContent = message;
  }
}

function setLoading(isLoading) {
  if (!provisionBtn) return;
  provisionBtn.disabled = isLoading;
  provisionBtn.textContent = isLoading ? "Provisioning..." : "Provision Tenant";
}

async function provisionTenant() {
  const tenantId = tenantIdInput.value.trim();
  const label = labelInput.value.trim();
  const keyLabel = keyLabelInput.value.trim();

  if (!tenantId || !keyLabel) {
    setNotes("tenant_id and key_label are required.");
    return;
  }

  const payload = {
    tenant_id: tenantId,
    label,
    key_label: keyLabel
  };

  try {
    setLoading(true);
    setNotes(`Provisioning tenant ${tenantId}...`);
    provisionResult.textContent = "";

    const result = await STC_API.provisionTenant(payload);

    provisionResult.textContent = JSON.stringify(result, null, 2);
    setNotes(`Tenant provisioned successfully: ${tenantId}`);

    tenantIdInput.value = "";
    labelInput.value = "";
    keyLabelInput.value = "";

  } catch (err) {
    console.error(err);
    provisionResult.textContent = "";
    setNotes(`Provisioning failed: ${err.message || err}`);
  } finally {
    setLoading(false);
  }
}

if (provisionBtn) {
  provisionBtn.addEventListener("click", provisionTenant);
}
