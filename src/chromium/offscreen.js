// Chromium offscreen document: runs the engine (engine/host.js) for the
// service worker. Content scripts' own messages also reach this page; only
// the ones addressed to it are answered.

/* global fcApi, fcEngineCheck, fcEngineWarmup, fcOnEnginesIdle: writable */

// Idle engines stopped: have the service worker close this document too,
// which frees the word lists and the page itself.
fcOnEnginesIdle = () => Promise.resolve(fcApi.runtime.sendMessage({ type: "offscreenIdle" })).catch(() => {});

fcApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "fc-offscreen") return false;
  if (msg.type === "warmup") {
    fcEngineWarmup(msg.settings ?? {}, msg.pageLang);
    sendResponse(true);
    return false;
  }
  if (msg.type !== "check") return false;
  fcEngineCheck(String(msg.text ?? ""), msg.settings ?? {}).then(sendResponse, (err) => {
    console.error("[FreeCorrector]", err);
    sendResponse({ error: String(err?.message ?? err) });
  });
  return true;
});
