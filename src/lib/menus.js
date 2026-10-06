// Right-click on selected text -> "Check with FreeCorrector": opens the
// proofreader page with that text. The text goes through extension storage
// (editorIncoming), never through the network.
// Loaded by the Firefox background page and the Chromium service worker.

/* global fcApi, fcT */
/* exported fcSetupMenus */

const FC_MENU_ID = "fc-check-selection";

function fcSetupMenus() {
  const menus = fcApi.menus ?? fcApi.contextMenus;
  if (!menus) return;
  const create = () =>
    Promise.resolve(menus.removeAll())
      .then(() => menus.create({ id: FC_MENU_ID, title: fcT("menuCheckSelection"), contexts: ["selection"] }))
      .catch(() => {});
  fcApi.runtime.onInstalled.addListener(create);
  fcApi.runtime.onStartup?.addListener(create);
  menus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== FC_MENU_ID) return;
    await fcApi.storage.local.set({ editorIncoming: String(info.selectionText ?? "") });
    fcApi.tabs.create({ url: fcApi.runtime.getURL("editor/editor.html") });
  });
}

fcSetupMenus();
