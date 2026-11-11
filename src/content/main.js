/* global fcApi, fcGetSettings, FcTextField, FcRichField, FcDocsField, fcDocsEditor, FcUi, FC_COMPOSE_WINDOW, FC_DOCS */

// Entry point: attach a checker to each text field the user focuses.

(async () => {
  // Google Docs' input iframe only receives the keys: the text is checked by
  // the page above it (docs-field.js).
  try {
    if (window.frameElement?.classList.contains("docs-texteventtarget-iframe")) return;
  } catch {
    // A frame of another site: not Docs'.
  }

  let settings = await fcGetSettings();
  let ui = null;
  let attached = new WeakMap();
  // "Turn off on this site" is about the site in the address bar, also for the
  // frames it shows from other hosts (sign-in boxes, comment widgets…).
  const site = (await Promise.resolve(fcApi.runtime.sendMessage({ type: "siteHost" })).catch(() => "")) || location.hostname;

  // The "toggle page" shortcut overrides the settings until the page is left.
  let pageOverride = null;
  const isActive = () =>
    pageOverride ?? (settings.enabled && !settings.disabledSites.includes(site));
  // The toolbar icon goes grey when checking is off here (lib/action-icon.js).
  // Every frame follows the same state: only the top one tells.
  const topFrame = window === window.top;
  const tellState = () => {
    if (topFrame) Promise.resolve(fcApi.runtime.sendMessage({ type: "pageState", active: isActive() })).catch(() => {});
  };

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
    if (el) attachField(el, el.isContentEditable ? FcRichField : FcTextField);
  }

  function attachField(el, Field) {
    if (!isActive() || attached.has(el)) return;
    if (!ui) {
      ui = new FcUi();
      ui.sentenceRules = settings.sentenceRules;
      ui.onFieldRemoved = (field) => attached.delete(field.el);
    }
    const field = new Field(el, ui);
    attached.set(el, field);
    ui.addField(field);
  }

  // Google Docs: no field to focus, the document is checked as soon as Docs
  // shows its text (and again when it rebuilds its editor).
  if (FC_DOCS && topFrame) {
    setInterval(() => {
      const editor = fcDocsEditor();
      if (editor) attachField(editor, FcDocsField);
    }, 1000);
  }

  // composedPath()[0] reaches fields inside open shadow roots (web components).
  document.addEventListener("focusin", (e) => attach(e.composedPath()[0]), true);
  // Typing also attaches: some fields only become editable after they get the
  // focus (X's messages: the badge showed only after the text was retyped).
  document.addEventListener("input", (e) => attach(e.composedPath()[0]), true);

  function deepActiveElement() {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }
  attach(deepActiveElement());
  if (!isActive()) tellState();

  // The "fix all" keyboard shortcut (lib/commands.js), sent to every frame of
  // the tab: only the frame where the user is typing acts.
  fcApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    // The background asks, once a page has loaded (sent to the top frame only).
    if (msg?.type === "pageState") {
      sendResponse(isActive());
      return false;
    }
    // Every frame follows, like the settings do.
    if (msg?.type === "togglePage") {
      pageOverride = !isActive();
      if (pageOverride) attach(deepActiveElement());
      else {
        ui?.removeAll();
        attached = new WeakMap();
      }
      tellState();
      return;
    }
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
      tellState();
    } else if (!wasActive && isActive()) {
      attach(deepActiveElement());
      tellState();
    } else if (["dictionary", "disabledRules", "picky", "language", "englishDialect"].some((k) => k in changes)) {
      ui?.recheckAll();
    }
    if (ui && "sentenceRules" in changes) {
      ui.sentenceRules = settings.sentenceRules;
      ui.refreshAll();
    }
  });
})();
