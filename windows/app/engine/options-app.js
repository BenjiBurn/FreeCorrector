// The extension's options page in the Windows app's settings window, after
// web/fc-web.js: the few things a web page lacks, and the parts that only
// make sense in a browser hidden (keyboard shortcuts, sites).

browser.runtime.getManifest = () => ({ version: new URLSearchParams(location.search).get("v") ?? "" });

// « Vos statistiques »: the app counts its fixes in the registry (Review.cs), not in the
// page's storage; PageWindow.cs passes the count as ?fixes=.
const fcLocalGet = browser.storage.local.get.bind(browser.storage.local);
browser.storage.local.get = async (keys) => {
  const out = await fcLocalGet(keys);
  if (keys === "fixCount") out.fixCount = Number(new URLSearchParams(location.search).get("fixes")) || 0;
  return out;
};

document.head.append(Object.assign(document.createElement("style"), {
  textContent: "#shortcut, #shortcut-toggle, section:has(#sites) { display: none; }",
}));
