// Firefox background page: hosts the engine directly (engine/host.js).
// Content scripts send { type: "check", text } and get back { matches } or
// { error }. Everything runs locally: no text ever leaves the browser.

/* global fcApi, fcGetSettings, fcEngineCheck */

fcApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "check") return false;
  fcGetSettings()
    .then((settings) => fcEngineCheck(String(msg.text ?? ""), settings))
    .then(sendResponse, (err) => {
      console.error("[FreeCorrector]", err);
      sendResponse({ error: String(err?.message ?? err) });
    });
  return true;
});
