/* global fcApi, fcGetSettings, fcSetSettings, fcHostOf */

(async () => {
  const enabledBox = document.getElementById("enabled");
  const siteBox = document.getElementById("site-enabled");
  const siteRow = document.getElementById("site-row");

  const [tab] = await fcApi.tabs.query({ active: true, currentWindow: true });
  const host = fcHostOf(tab?.url ?? "");
  let settings = await fcGetSettings();

  function render() {
    enabledBox.checked = settings.enabled;
    siteRow.hidden = !host;
    siteRow.classList.toggle("disabled", !settings.enabled);
    document.getElementById("site").textContent = host;
    siteBox.checked = !settings.disabledSites.includes(host);
  }

  enabledBox.addEventListener("change", async () => {
    settings.enabled = enabledBox.checked;
    await fcSetSettings({ enabled: settings.enabled });
    render();
  });

  siteBox.addEventListener("change", async () => {
    const sites = settings.disabledSites.filter((s) => s !== host);
    if (!siteBox.checked) sites.push(host);
    settings.disabledSites = sites;
    await fcSetSettings({ disabledSites: sites });
    render();
  });

  document.getElementById("open-demo").addEventListener("click", () => {
    fcApi.tabs.create({ url: fcApi.runtime.getURL("demo/demo.html") });
    window.close();
  });

  document.getElementById("open-options").addEventListener("click", () => {
    fcApi.runtime.openOptionsPage();
    window.close();
  });

  render();
})();
