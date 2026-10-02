// Firefox background page: hosts the engine directly (engine/host.js).
// Content scripts send { type: "check", text } and get back { matches } or
// { error }, and { type: "warmup" } when a field gets focus, to have the
// engines ready before the first check. Everything runs locally: no text
// ever leaves the browser.

/* global fcApi, fcGetSettings, fcEngineCheck, fcEngineWarmup */

fcApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
