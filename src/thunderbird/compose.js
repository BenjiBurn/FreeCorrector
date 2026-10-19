// Thunderbird: the checker runs in the message compose window, the only place
// where the user types text. The content scripts of the browser versions are
// registered there as compose scripts (thunderbird/scripts.js lists them, from
// the manifest), and injected into the compose windows already open when the
// add-on is installed or updated.

/* global FC_COMPOSE_SCRIPTS */

(() => {
  const api = globalThis.messenger;
  const compose = api?.scripting?.compose;
  if (!compose) return;
  const ID = "freecorrector";

  compose.getRegisteredScripts().then((scripts) => {
    if (!scripts.some((s) => s.id === ID)) return compose.registerScripts([{ id: ID, js: FC_COMPOSE_SCRIPTS }]);
  }).catch((err) => console.error("[FreeCorrector]", err));

  api.runtime.onInstalled.addListener(async () => {
    const tabs = await api.tabs.query({ type: "messageCompose" });
    for (const tab of tabs) {
      api.scripting.executeScript({ target: { tabId: tab.id }, files: FC_COMPOSE_SCRIPTS }).catch(() => {});
    }
  });
})();
