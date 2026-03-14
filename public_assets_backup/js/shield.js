document.addEventListener("DOMContentLoaded", () => {

  const panel = document.getElementById("shield-panel");

  function renderNode(label, state){
    return `
      <div class="panel" style="margin-bottom:16px;">
        <strong>${label}</strong>
        <div style="margin-top:8px;color:${state ? '#1F6FEB' : '#E5484D'}">
          ${state ? 'Active' : 'Inactive'}
        </div>
      </div>
    `;
  }

  STC_API.openShieldStream((data) => {

    panel.innerHTML = `
      ${renderNode("Token Issued", true)}
      ${renderNode("Decision Hash Bound", !!data.analysis)}
      ${renderNode("Introspection Valid", true)}
      ${renderNode("CAE Trigger", !!data.revocation_flag)}
      ${renderNode("Audit Chain Updated", true)}
    `;

  });

});
