/* global fcApi, fcGetSettings, fcSetSettings, fcHostOf, fcLocalizePage, fcUiLang */

fcLocalizePage();

// The review page of the store this copy comes from: Thunderbird's add-ons
// site, Firefox's (its Android pages on a phone), or the Chrome Web Store,
// where Chrome, Edge, Brave and Opera install it from.
function fcReviewUrl() {
  const fr = fcUiLang === "fr";
  if (typeof globalThis.messenger !== "undefined") {
    return `https://addons.thunderbird.net/${fr ? "fr" : "en-US"}/thunderbird/addon/freecorrector/reviews/add`;
  }
  if (fcApi.runtime.getURL("").startsWith("moz-extension:")) {
    const app = /Android/i.test(navigator.userAgent) ? "android" : "firefox";
    return `https://addons.mozilla.org/${fr ? "fr" : "en-US"}/${app}/addon/freecorrector/reviews/`;
  }
  return "https://chromewebstore.google.com/detail/pbojifdopikeihflcjikofbpfgebahdi/reviews";
}

(async () => {
  const enabledBox = document.getElementById("enabled");
  const siteBox = document.getElementById("site-enabled");
  const siteRow = document.getElementById("site-row");
  const pickyBox = document.getElementById("picky");

  const [tab] = await fcApi.tabs.query({ active: true, currentWindow: true });
  // Web sites only: on the extension's own pages the host is its internal id.
  const host = /^https?:/.test(tab?.url ?? "") ? fcHostOf(tab.url) : "";
  let settings = await fcGetSettings();

  function render() {
    enabledBox.checked = settings.enabled;
    siteRow.hidden = !host;
    siteRow.classList.toggle("disabled", !settings.enabled);
    document.getElementById("site").textContent = host;
    siteBox.checked = !settings.disabledSites.includes(host);
    pickyBox.checked = settings.picky;
    document.getElementById("picky-row").classList.toggle("disabled", !settings.enabled);
  }

  pickyBox.addEventListener("change", async () => {
    settings.picky = pickyBox.checked;
    await fcSetSettings({ picky: settings.picky });
    render();
  });

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

  document.getElementById("open-editor").addEventListener("click", () => {
    fcApi.tabs.create({ url: fcApi.runtime.getURL("editor/editor.html") });
    window.close();
  });

  // The test page only exists in development (the store packages leave it out).
  const demoButton = document.getElementById("open-demo");
  fetch(fcApi.runtime.getURL("demo/demo.html"), { method: "HEAD" })
    .then((res) => { demoButton.hidden = !res.ok; }, () => {});
  demoButton.addEventListener("click", () => {
    fcApi.tabs.create({ url: fcApi.runtime.getURL("demo/demo.html") });
    window.close();
  });

  document.getElementById("open-options").addEventListener("click", () => {
    fcApi.runtime.openOptionsPage();
    window.close();
  });

  // ---------- "Leave a review" ----------
  // After REVIEW_AFTER fixes (counted in this browser only, lib/settings.js),
  // once: "Later" asks again REVIEW_LATER fixes later, the review link and
  // the cross never again.
  const REVIEW_AFTER = 100;
  const REVIEW_LATER = 150;
  const review = document.getElementById("review");
  const { fixCount = 0, reviewState } = await fcApi.storage.local.get(["fixCount", "reviewState"]);
  review.hidden = reviewState === "done" || fixCount < (reviewState?.later ?? REVIEW_AFTER);
  const reviewDone = () => {
    review.hidden = true;
    return fcApi.storage.local.set({ reviewState: "done" });
  };
  document.getElementById("review-leave").addEventListener("click", async () => {
    await reviewDone();
    fcApi.tabs.create({ url: fcReviewUrl() });
    window.close();
  });
  document.getElementById("review-close").addEventListener("click", reviewDone);
  document.getElementById("review-later").addEventListener("click", () => {
    review.hidden = true;
    fcApi.storage.local.set({ reviewState: { later: fixCount + REVIEW_LATER } });
  });

  render();
})();
