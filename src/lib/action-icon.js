// Toolbar icon per tab: grey when checking is off on the page (the site turned
// off, checking turned off everywhere, or the "toggle page" shortcut), in color
// otherwise. Without the "tabs" permission the background does not see the
// tabs' addresses, so the content script of the top frame tells its state
// ({ type: "pageState", active }, content/main.js).
// Loaded by the Firefox background page and the Chromium service worker.
// (Thunderbird: the compose window's button is left as it is.)

/* global fcApi, fcT */
/* exported fcSetActionIcon */

// The manifest's icons and their grey copies: "icons/icon.svg" (Firefox) or
// { 16: "icons/icon-16.png", … } (Chromium) -> "icons/icon-off.svg", "icons/icon-off-16.png"…
function fcActionIcons() {
  const manifest = fcApi.runtime.getManifest();
  const on = manifest.action?.default_icon;
  if (!on || !fcApi.action || manifest.compose_action) return null;
  const off = (p) => p.replace(/icon(-\d+)?\.(svg|png)$/, "icon-off$1.$2");
  return { on, off: typeof on === "string" ? off(on) : Object.fromEntries(Object.entries(on).map(([k, p]) => [k, off(p)])) };
}

const fcIcons = fcActionIcons();

function fcSetActionIcon(tabId, active) {
  if (!fcIcons || tabId === undefined || tabId < 0) return;
  Promise.resolve(fcApi.action.setIcon({ tabId, path: active ? fcIcons.on : fcIcons.off })).catch(() => {});
  Promise.resolve(fcApi.action.setTitle({ tabId, title: fcT(active ? "actionTitle" : "actionTitleOff") })).catch(() => {});
}

if (fcIcons) {
  // Chromium keeps a tab's icon from one page to the next: once a page has loaded,
  // ask its top frame. No answer (a browser page, a store) means the usual icon.
  // Same for a change of address inside the page (history.pushState).
  fcApi.tabs?.onUpdated.addListener((tabId, change) => {
    if (change.status !== "complete") return;
    Promise.resolve(fcApi.tabs.sendMessage(tabId, { type: "pageState" }, { frameId: 0 }))
      .then((active) => fcSetActionIcon(tabId, active !== false), () => fcSetActionIcon(tabId, true));
  });
}
