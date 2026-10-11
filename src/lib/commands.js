// Keyboard shortcut "fix all" (Ctrl+Shift+F by default, changeable in the
// browser's shortcut settings): asks the content script of the active tab to
// apply the first suggestion of every problem in the field being edited.
// Loaded by the Firefox background page and the Chromium service worker.

/* global fcApi */
/* exported fcSetupCommands */

function fcSetupCommands() {
  fcApi.commands?.onCommand.addListener(async (command, tab) => {
    if (command !== "fix-all") return;
    const target = tab ?? (await fcApi.tabs.query({ active: true, currentWindow: true }))[0];
    if (target?.id === undefined) return;
    Promise.resolve(fcApi.tabs.sendMessage(target.id, { type: "fixAll" })).catch(() => {});
  });
}

fcSetupCommands();
