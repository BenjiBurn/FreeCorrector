// Shared by the background script, content scripts, popup and options page.
// Each context loads this file as a classic script, so everything here is global.

/* exported fcApi, FC_DEFAULTS, fcGetSettings, fcSetSettings, fcHostOf */

const fcApi = globalThis.browser ?? globalThis.chrome;

const FC_DEFAULTS = Object.freeze({
  enabled: true,
  disabledSites: [],
  language: "fr",
  picky: false,
  sentenceRules: true,
  dictionary: [],
});

async function fcGetSettings() {
  const stored = await fcApi.storage.local.get(Object.keys(FC_DEFAULTS));
  return { ...FC_DEFAULTS, ...stored };
}

function fcSetSettings(patch) {
  return fcApi.storage.local.set(patch);
}

function fcHostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
