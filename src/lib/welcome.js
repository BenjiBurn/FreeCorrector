// Opens the welcome page (welcome/) once, when the extension is installed:
// never on updates, nor when a developer loads it temporarily.
// Loaded by the Firefox/Thunderbird background page and the Chromium service worker.

/* global fcApi */

fcApi.runtime.onInstalled.addListener(({ reason, temporary }) => {
  if (reason !== "install" || temporary) return;
  Promise.resolve(fcApi.tabs.create({ url: fcApi.runtime.getURL("welcome/welcome.html") })).catch(() => {});
});
