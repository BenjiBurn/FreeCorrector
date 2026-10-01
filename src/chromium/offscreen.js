// Chromium offscreen document: runs the engine (engine/host.js) for the
// service worker. Content scripts' own messages also reach this page; only
// the ones addressed to it are answered.

/* global fcApi, fcEngineCheck */

fcApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "fc-offscreen" || msg.type !== "check") return false;
  fcEngineCheck(String(msg.text ?? ""), msg.settings ?? {}).then(sendResponse, (err) => {
    console.error("[FreeCorrector]", err);
    sendResponse({ error: String(err?.message ?? err) });
  });
  return true;
});
