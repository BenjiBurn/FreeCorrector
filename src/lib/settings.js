// Shared by the background script, content scripts, popup and options page.
// Each context loads this file as a classic script, so everything here is global.

/* exported fcApi, FC_DEFAULTS, fcGetSettings, fcSetSettings, fcHostOf, fcRuleKey, fcCountFixes */

const fcApi = globalThis.browser ?? globalThis.chrome;

const FC_DEFAULTS = Object.freeze({
  enabled: true,
  disabledSites: [],
  language: "auto",
  englishDialect: "us",
  picky: false,
  sentenceRules: true,
  dictionary: [],
  // Rules turned off by the user: [{ key, message, word }] (see fcRuleKey).
  disabledRules: [],
});

// A stable name for the rule behind a match, to turn it off for good.
// Grammalecte rule ids are stable; our own rules and Harper's are named by
// their message with the quoted words taken out ("… : « endormie »").
function fcRuleKey(match) {
  if (!/^(FC_|EN_|SPELLING)/.test(match.ruleId)) return match.ruleId;
  const template = String(match.message ?? "")
    .replace(/«[^»]*»|“[^”]*”|"[^"]*"|‘[^’]*’/g, "…")
    .replace(/\s+/g, " ")
    .trim();
  return `${match.ruleId.startsWith("EN_") ? match.ruleId : "FC"}|${template}`;
}

async function fcGetSettings() {
  const stored = await fcApi.storage.local.get(Object.keys(FC_DEFAULTS));
  return { ...FC_DEFAULTS, ...stored };
}

function fcSetSettings(patch) {
  return fcApi.storage.local.set(patch);
}

// How many fixes the user applied, kept in this browser only: the popup asks
// for a review on the store after a while (popup/popup.js).
function fcCountFixes(n) {
  if (!n) return;
  Promise.resolve(fcApi.storage.local.get("fixCount"))
    .then(({ fixCount = 0 }) => fcApi.storage.local.set({ fixCount: fixCount + n }))
    .catch(() => {});
}

function fcHostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
