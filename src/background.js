// Firefox background page: hosts the engine directly (engine/host.js).
// Content scripts send { type: "check", text } and get back { matches } or
// { error }, { type: "warmup" } when a field gets focus, to have the
// engines ready before the first check, and { type: "siteHost" } for the host
// name of the tab (see content/main.js). Everything runs locally: no text
// ever leaves the browser.

/* global fcApi, fcGetSettings, fcEngineCheck, fcEngineWarmup, fcHostOf */

fcApi.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "siteHost") {
    sendResponse(fcHostOf(sender.tab?.url ?? ""));
    return false;
  }
  if (msg?.type === "warmup") {
    fcGetSettings().then(fcEngineWarmup, () => {});
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
