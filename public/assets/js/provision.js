if (!localStorage.getItem("STC_ADMIN_SECRET")) {
  window.location.href = "index.html";
}


// FILE: public/assets/js/provision.js

async function provisionTenant() {

  const tenantId = document.getElementById("tenant_id").value.trim();
  const label = document.getElementById("label").value.trim();
  const keyLabel = document.getElementById("key_label").value.trim();

  if (!tenantId || !keyLabel) {
    alert("tenant_id and key_label are required");
    return;
  }

  const payload = {
    tenant_id: tenantId,
    label: label,
    key_label: keyLabel
  };

  try {

    const result = await STC_API.provisionTenant(payload);

    document.getElementById("provision_result").textContent =
      JSON.stringify(result, null, 2);

  } catch (err) {

    console.error(err);
    alert("Provisioning failed");

  }

}
