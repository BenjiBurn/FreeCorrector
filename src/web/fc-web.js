// The proofreader as a plain web page (lapigeonnerie.fr/freecorrector/correcteur):
// the extension's editor page, with the few extension APIs it uses replaced.
// Loaded first, before lib/settings.js, which picks `browser` up as fcApi.
//
//   storage.local      -> localStorage (settings, personal dictionary, draft)
//   i18n.getMessage    -> the messages of _locales/, bundled in web/messages.js
//   runtime.sendMessage({ type: "check" | "warmup" }) -> engine/host.js, in this page
//   runtime.getURL     -> a file next to this one
//
// The engines run in Web Workers of this page: the text never leaves the browser.

/* global FC_MESSAGES, fcGetSettings, fcEngineCheck, fcEngineWarmup */

(() => {
  // The app's root folder: this script is in <root>/web/.
  const ROOT = new URL("../", document.currentScript.src).href;
  const LANG = /^en/i.test(document.documentElement.lang) ? "en" : "fr";
  const PREFIX = "freecorrector:";
  const listeners = new Set();

  const read = (key) => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? undefined : JSON.parse(raw);
    } catch {
      return undefined;
    }
  };
  const write = (key, value) => {
    try {
      if (value === undefined) localStorage.removeItem(PREFIX + key);
      else localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Private browsing or storage full: the page still works, it just forgets.
    }
  };
  const notify = (changes) => {
    if (!Object.keys(changes).length) return;
    setTimeout(() => { for (const fn of listeners) fn(changes, "local"); }, 0);
  };

  const local = {
    async get(keys) {
      const names = keys == null ? [] : typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of names) {
        const v = read(k);
        if (v !== undefined) out[k] = v;
        else if (keys && typeof keys === "object" && !Array.isArray(keys)) out[k] = keys[k];
      }
      return out;
    },
    async set(items) {
      const changes = {};
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: read(k), newValue: v };
        write(k, v);
      }
      notify(changes);
    },
    async remove(keys) {
      const changes = {};
      for (const k of [].concat(keys)) {
        changes[k] = { oldValue: read(k) };
        write(k, undefined);
      }
      notify(changes);
    },
  };

  // Chrome's message format: "$1" placeholders, or named ones defined in "placeholders".
  function getMessage(key, subs) {
    if (key === "@@ui_locale") return LANG;
    const entry = FC_MESSAGES[LANG]?.[key] ?? FC_MESSAGES.en?.[key];
    if (!entry) return "";
    const values = [].concat(subs ?? []).map(String);
    let text = entry.message.replace(/\$([A-Za-z_][\w]*)\$/g, (whole, name) => {
      const ph = entry.placeholders?.[name.toLowerCase()];
      return ph ? ph.content : whole;
    });
    text = text.replace(/\$(\d)/g, (_, n) => values[Number(n) - 1] ?? "");
    return text.replace(/\$\$/g, "$");
  }

  globalThis.browser = {
    storage: {
      local,
      onChanged: { addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn) },
    },
    i18n: { getMessage },
    runtime: {
      getURL: (path) => new URL(path, ROOT).href,
      async sendMessage(msg) {
        if (msg?.type === "warmup") {
          // Only the page's language: the English engine is an 8 MB download,
          // fetched when an English paragraph shows up.
          fcEngineWarmup({ ...(await fcGetSettings()), language: LANG });
          return undefined;
        }
        if (msg?.type === "check") {
          try {
            return await fcEngineCheck(String(msg.text ?? ""), await fcGetSettings());
          } catch (err) {
            return { error: String(err?.message ?? err) };
          }
        }
        return undefined;
      },
      onMessage: { addListener() {} },
    },
  };
})();
