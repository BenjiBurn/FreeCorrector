// Right-click on selected text:
// - "Check with FreeCorrector": opens the proofreader page with that text. The
//   text goes through extension storage (editorIncoming), never through the network.
// - "Report a missed mistake": opens the report page on the author's website with
//   the selection in the URL fragment, which the browser never sends; the page
//   sends nothing until the user has reviewed it and clicked "Send".
// Loaded by the Firefox background page and the Chromium service worker.

/* global fcApi, fcT, fcUiLang */
/* exported fcSetupMenus */

const FC_MENU_ID = "fc-check-selection";
const FC_MENU_MISSED_ID = "fc-report-missed";
const FC_MISSED_PAGE = { fr: "https://lapigeonnerie.fr/freecorrector/report", en: "https://lapigeonnerie.fr/freecorrector/en/report" };

// The report page for a mistake nothing underlined: { k: "missed", s: selection }.
function fcMissedReportUrl(selection) {
  const base = fcApi.runtime.getURL("");
  const app = typeof globalThis.messenger !== "undefined" ? "thunderbird"
    : base.startsWith("moz-extension:") ? "firefox" : base.startsWith("chrome-extension:") ? "chrome" : "web";
  const data = { k: "missed", s: String(selection ?? "").trim().slice(0, 1000), w: "", f: "", m: "", id: "", l: "", a: app, v: fcApi.runtime.getManifest().version };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${FC_MISSED_PAGE[fcUiLang] ?? FC_MISSED_PAGE.en}#r=${b64}`;
}

function fcSetupMenus() {
  const menus = fcApi.menus ?? fcApi.contextMenus;
  if (!menus) return;
  const create = () =>
    Promise.resolve(menus.removeAll())
      .then(() => {
        menus.create({ id: FC_MENU_ID, title: fcT("menuCheckSelection"), contexts: ["selection"] });
        menus.create({ id: FC_MENU_MISSED_ID, title: fcT("menuReportMissed"), contexts: ["selection"] });
      })
      .catch(() => {});
  fcApi.runtime.onInstalled.addListener(create);
  fcApi.runtime.onStartup?.addListener(create);
  menus.onClicked.addListener(async (info) => {
    if (info.menuItemId === FC_MENU_MISSED_ID) {
      const url = fcMissedReportUrl(info.selectionText);
      const tb = globalThis.messenger?.windows?.openDefaultBrowser;
      Promise.resolve(tb ? tb(url) : fcApi.tabs.create({ url })).catch(() => {});
      return;
    }
    if (info.menuItemId !== FC_MENU_ID) return;
    await fcApi.storage.local.set({ editorIncoming: String(info.selectionText ?? "") });
    fcApi.tabs.create({ url: fcApi.runtime.getURL("editor/editor.html") });
  });
}

fcSetupMenus();
