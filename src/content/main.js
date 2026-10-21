/* global fcApi, fcGetSettings, FcTextField, FcRichField, FcUi, FC_COMPOSE_WINDOW */

// Entry point: attach a checker to each text field the user focuses.

(async () => {
  let settings = await fcGetSettings();
  let ui = null;
  let attached = new WeakMap();
  // "Turn off on this site" is about the site in the address bar, also for the
  // frames it shows from other hosts (sign-in boxes, comment widgets…).
  const site = (await Promise.resolve(fcApi.runtime.sendMessage({ type: "siteHost" })).catch(() => "")) || location.hostname;

  const isActive = () =>
    settings.enabled && !settings.disabledSites.includes(site);

  // Code editors are contenteditable too, but their text is not prose.
  const CODE_EDITORS = ".CodeMirror, .cm-editor, .monaco-editor, .ace_editor, .code-editor, [data-language]";

  // Sign-in, sign-up and identity fields: user names, e-mail addresses, codes,
  // phone and card numbers… never prose, and a badge there is in the way.
  const IDENTITY_AUTOCOMPLETE = /(?<![\w-])(username|email|one-time-code|current-password|new-password|tel(-[\w-]+)?|cc-[\w-]+|postal-code|street-address|address-line\d|address-level\d|country(-name)?|given-name|family-name|additional-name|name|nickname|organization|bday(-[\w-]+)?|webauthn)(?![\w-])/i;
  const IDENTITY_WORDS = /user|login|log-in|signin|sign-in|e-?mail|courriel|identifiant|pseudo|passw|mot.?de.?passe|otp|2fa|captcha|phone|t[eé]l[eé]phone|iban/i;
  function isIdentityField(el) {
    if (IDENTITY_AUTOCOMPLETE.test(el.getAttribute("autocomplete") ?? "")) return true;
    if (/^(email|tel|numeric|decimal)$/i.test(el.getAttribute("inputmode") ?? "")) return true;
    if (IDENTITY_WORDS.test(`${el.name} ${el.id} ${el.getAttribute("aria-label") ?? ""} ${el.placeholder}`)) return true;
    // A form with a password field signs in or signs up.
    return !!(el.form ?? el.closest("form"))?.querySelector("input[type=password]");
  }

  // The element to check for a focused element, or null: the field itself
  // for <textarea>/<input>, the editing host (outermost editable ancestor)
  // for contenteditable.
  function editableTarget(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;
    if (el.closest("[data-freecorrector='off']")) return null;
    if (el.localName === "textarea") return el.disabled || el.readOnly ? null : el;
    if (el.localName === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (type !== "text" && type !== "search") return null;
      return el.disabled || el.readOnly || isIdentityField(el) ? null : el;
    }
    if (!el.isContentEditable) return null;
    let host = el;
    while (host.parentElement?.isContentEditable) host = host.parentElement;
    // A whole editable document (designMode, Thunderbird's compose window): its text is in <body>.
    if (host === document.documentElement) host = document.body;
    if (!host) return null;
    // spellcheck="false": not prose. Except in Thunderbird's compose window,
    // where it only says that Thunderbird's own spelling checker is off.
    if ((host.getAttribute("spellcheck") === "false" && !FC_COMPOSE_WINDOW) || host.closest(CODE_EDITORS)) return null;
    return host;
  }

  function attach(focused) {
    const el = editableTarget(focused);
    if (!el || !isActive() || attached.has(el)) return;
    if (!ui) {
      ui = new FcUi();
      ui.sentenceRules = settings.sentenceRules;
      ui.onFieldRemoved = (field) => attached.delete(field.el);
    }
    const Field = el.isContentEditable ? FcRichField : FcTextField;
    const field = new Field(el, ui);
    attached.set(el, field);
    ui.addField(field);
  }

  // composedPath()[0] reaches fields inside open shadow roots (web components).
  document.addEventListener("focusin", (e) => attach(e.composedPath()[0]), true);

  function deepActiveElement() {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }
  attach(deepActiveElement());

  // The "fix all" keyboard shortcut (lib/commands.js), sent to every frame of
  // the tab: only the frame where the user is typing acts.
  fcApi.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "fixAll" || !document.hasFocus() || !ui) return;
    const field = [...ui.fields].find((f) => f.isFocused());
    field?.fixAll();
  });

  fcApi.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local") return;
    const wasActive = isActive();
    settings = await fcGetSettings();
    if (wasActive && !isActive()) {
      ui?.removeAll();
      attached = new WeakMap();
    } else if (!wasActive && isActive()) {
      attach(deepActiveElement());
    } else if (["dictionary", "disabledRules", "picky", "language", "englishDialect"].some((k) => k in changes)) {
      ui?.recheckAll();
    }
    if (ui && "sentenceRules" in changes) {
      ui.sentenceRules = settings.sentenceRules;
      ui.refreshAll();
    }
  });
})();
