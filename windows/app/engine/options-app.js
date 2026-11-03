// The extension's options page in the Windows app's settings window, after
// web/fc-web.js: the few things a web page lacks, and the parts that only
// make sense in a browser hidden (keyboard shortcuts, sites).

browser.runtime.getManifest = () => ({ version: new URLSearchParams(location.search).get("v") ?? "" });

document.head.append(Object.assign(document.createElement("style"), {
  textContent: "#shortcut, #shortcut-toggle, section:has(#sites) { display: none; }",
}));
