/* global fcApi, fcGetSettings, FcUi, FcTextField, fcLocalizePage, fcT */

// The page opened once, when the extension is installed: what it does, a field
// to try it at once, and where the settings are (the per-site switch most of all).

fcLocalizePage();

(async () => {
  // Thunderbird checks the message compose window, not web pages.
  const thunderbird = typeof globalThis.messenger !== "undefined";
  const $ = (id) => document.getElementById(id);

  $("intro").textContent = fcT(thunderbird ? "wlcIntroTb" : "wlcIntro");
  const tips = thunderbird
    ? ["wlcTipBadge", "wlcTipComposeTb", "wlcTipDict", "wlcTipShortcut"]
    : ["wlcTipBadge", "wlcTipSite", "wlcTipDict", "wlcTipShortcut", "wlcTipLogin"];
  // The "fix all" shortcut as the browser has it (Ctrl+Shift+F, Ctrl+Shift+Space
  // in Firefox, or the user's own); no tip when none is set.
  const commands = await Promise.resolve(fcApi.commands?.getAll?.()).catch(() => null);
  const shortcut = commands?.find((c) => c.name === "fix-all")?.shortcut;
  for (const key of tips) {
    if (key === "wlcTipShortcut" && !shortcut) continue;
    const li = document.createElement("li");
    li.textContent = fcT(key, key === "wlcTipSite" ? fcT("popupSiteEnabled") : key === "wlcTipShortcut" ? shortcut : undefined);
    $("tips").append(li);
  }

  // The same checker as on web pages, on a text with a few mistakes.
  const textEl = $("try");
  textEl.value = fcT("wlcSample");
  const settings = await fcGetSettings();
  const ui = new FcUi();
  ui.sentenceRules = settings.sentenceRules;
  ui.addField(new FcTextField(textEl, ui));

  $("open-options").addEventListener("click", () => fcApi.runtime.openOptionsPage());
  $("open-editor").addEventListener("click", () => fcApi.tabs.create({ url: fcApi.runtime.getURL("editor/editor.html") }));
})();
