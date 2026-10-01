// Chromium background (Chrome, Edge, Opera, Brave, Vivaldi…).
//
// A service worker cannot start a Web Worker, so the engine lives in an
// offscreen document (offscreen.html). This worker reads the settings, makes
// sure the document exists and forwards each check to it.

/* global fcApi, fcGetSettings */

importScripts("../lib/settings.js");

const FC_OFFSCREEN_URL = "chromium/offscreen.html";
let fcCreating = null;

async function fcEnsureOffscreen() {
  const url = fcApi.runtime.getURL(FC_OFFSCREEN_URL);
  const contexts = await fcApi.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [url] });
  if (contexts.length) return;
  // Several checks can arrive at once: create the document only once.
  fcCreating ??= fcApi.offscreen
    .createDocument({
      url: FC_OFFSCREEN_URL,
      reasons: ["WORKERS"],
      justification: "Runs the local grammar checker in a Web Worker.",
    })
    .finally(() => {
      fcCreating = null;
    });
  await fcCreating;
}

async function fcCheck(text) {
  const settings = await fcGetSettings();
  await fcEnsureOffscreen();
  return fcApi.runtime.sendMessage({
    target: "fc-offscreen",
    type: "check",
    text,
    settings: { picky: settings.picky, dictionary: settings.dictionary },
  });
}

fcApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "check" || msg.target) return false;
  fcCheck(String(msg.text ?? "")).then(sendResponse, (err) => {
    console.error("[FreeCorrector]", err);
    sendResponse({ error: String(err?.message ?? err) });
  });
  return true;
});
