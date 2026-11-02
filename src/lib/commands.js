// Keyboard shortcut "fix all" (Ctrl+Shift+F by default, changeable in the
// browser's shortcut settings): asks the content script of the active tab to
// apply the first suggestion of every problem in the field being edited.
// "Toggle page" (Alt+Shift+F): checking on or off in the tab until it leaves
// the page, also on a site turned off in the settings.
// Loaded by the Firefox background page and the Chromium service worker.

/* global fcApi */
/* exported fcSetupCommands */

function fcSetupCommands() {
  fcApi.commands?.onCommand.addListener(async (command, tab) => {
    const type = { "fix-all": "fixAll", "toggle-page": "togglePage" }[command];
    if (!type) return;
    // The extension's own pages (the proofreader) have no content script.
    if (type === "fixAll") Promise.resolve(fcApi.runtime.sendMessage({ type })).catch(() => {});
    const target = tab ?? (await fcApi.tabs.query({ active: true, currentWindow: true }))[0];
    if (target?.id === undefined) return;
    Promise.resolve(fcApi.tabs.sendMessage(target.id, { type })).catch(() => {});
  });
}

fcSetupCommands();
