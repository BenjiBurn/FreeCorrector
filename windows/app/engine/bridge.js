// The engines of the Windows app: those of the online proofreader
// (web/fc-web.js standing in for the extension APIs, engine/host.js running
// the workers), in a hidden WebView2 page. The app posts { id, type, … } and
// gets { id, … } back; the settings live in this origin's localStorage,
// shared with the settings window (options/options.html).

/* global fcEngineCheck, fcEngineWarmup, fcGetSettings, fcSetSettings, fcRuleKey */

(() => {
  // engine/sentence-rules.js: shown only when the setting is on (the
  // extension filters them in its content scripts, content/field.js).
  const SENTENCE_RULES = new Set(["FC_CAPITAL_START", "FC_FINAL_PUNCT"]);

  const handlers = {
    // → { matches } or { error }
    check: async ({ text }) => {
      try {
        const settings = await fcGetSettings();
        const answer = await fcEngineCheck(String(text ?? ""), settings);
        if (answer.matches && !settings.sentenceRules) answer.matches = answer.matches.filter((m) => !SENTENCE_RULES.has(m.ruleId));
        return answer;
      } catch (err) {
        return { error: String(err?.message ?? err) };
      }
    },
    addWord: async ({ word }) => {
      const { dictionary } = await fcGetSettings();
      if (!dictionary.includes(word)) await fcSetSettings({ dictionary: [...dictionary, word] });
      return {};
    },
    // The same record as the extension's "turn off this rule".
    disableRule: async ({ match }) => {
      const { disabledRules } = await fcGetSettings();
      const key = fcRuleKey(match);
      if (!disabledRules.some((r) => r.key === key)) {
        await fcSetSettings({ disabledRules: [...disabledRules, { key, message: match.message, word: match.word }] });
      }
      return {};
    },
    getSettings: async () => ({ settings: await fcGetSettings() }),
    setSettings: async ({ patch }) => {
      await fcSetSettings(patch ?? {});
      return {};
    },
  };

  chrome.webview.addEventListener("message", async ({ data }) => {
    const handler = handlers[data?.type];
    const answer = handler ? await handler(data) : { error: `unknown request ${data?.type}` };
    chrome.webview.postMessage({ id: data.id, ...answer });
  });

  // The settings window wrote something: the app checks again.
  addEventListener("storage", (event) => {
    if (event.key?.startsWith("freecorrector:")) chrome.webview.postMessage({ type: "settings" });
  });

  // Both engines, so the first check does not wait for them (the files are
  // local here, unlike on the website).
  fcGetSettings().then((settings) => fcEngineWarmup({ ...settings, language: "auto" }));
  chrome.webview.postMessage({ type: "ready" });
})();
