// Firefox background page: hosts the engine directly (engine/host.js).
// Content scripts send { type: "check", text } and get back { matches } or
// { error }, { type: "warmup" } when a field gets focus, to have the
// engines ready before the first check, and { type: "siteHost" } for the host
// name of the tab (see content/main.js). Everything runs locally: no text
// ever leaves the browser.

/* global fcApi, fcGetSettings, fcEngineCheck, fcEngineWarmup, fcHostOf, fcSetActionIcon */

fcApi.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // "Report" in the bubble: the website's report page (content scripts cannot
  // open tabs). Thunderbird opens it in the default browser.
  if (msg?.type === "openReport") {
    const url = String(msg.url ?? "");
    if (!url.startsWith("https://lapigeonnerie.fr/freecorrector/")) return false;
    const tb = globalThis.messenger?.windows?.openDefaultBrowser;
    Promise.resolve(tb ? tb(url) : fcApi.tabs.create({ url })).catch(() => {});
    return false;
  }
  // "See how to conjugate" in the bubble: the conjugator on that verb.
  // Thunderbird: in a window of its own, in front of the message being written.
  if (msg?.type === "openConjugator") {
    const url = `${fcApi.runtime.getURL("conjugator/conjugator.html")}?v=${encodeURIComponent(String(msg.verb ?? "").slice(0, 60))}`;
    const tb = globalThis.messenger?.windows;
    Promise.resolve(tb ? tb.create({ url, type: "popup", width: 1100, height: 850 }) : fcApi.tabs.create({ url })).catch(() => {});
    return false;
  }
  if (msg?.type === "siteHost") {
    sendResponse(fcHostOf(sender.tab?.url ?? ""));
    return false;
  }
  // Checking on or off in the tab: the toolbar icon follows (lib/action-icon.js).
  if (msg?.type === "pageState") {
    fcSetActionIcon(sender.tab?.id, msg.active !== false);
    return false;
  }
  if (msg?.type === "warmup") {
    fcGetSettings().then((settings) => fcEngineWarmup(settings, String(msg.pageLang ?? "")), () => {});
    return false;
  }
  if (msg?.type !== "check") return false;
  fcGetSettings()
    .then((settings) => fcEngineCheck(String(msg.text ?? ""), settings))
    .then(sendResponse, (err) => {
      console.error("[FreeCorrector]", err);
      sendResponse({ error: String(err?.message ?? err) });
    });
  return true;
});
