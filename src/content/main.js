/* global fcApi, fcGetSettings, FcTextField, FcRichField, FcUi */

// Entry point: attach a checker to each text field the user focuses.

(async () => {
  let settings = await fcGetSettings();
  let ui = null;
  let attached = new WeakMap();

  const isActive = () =>
    settings.enabled && !settings.disabledSites.includes(location.hostname);

  // Code editors are contenteditable too, but their text is not prose.
  const CODE_EDITORS = ".CodeMirror, .cm-editor, .monaco-editor, .ace_editor, .code-editor, [data-language]";

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
      return el.disabled || el.readOnly ? null : el;
    }
    if (!el.isContentEditable) return null;
    let host = el;
    while (host.parentElement?.isContentEditable) host = host.parentElement;
    if (host.getAttribute("spellcheck") === "false" || host.closest(CODE_EDITORS)) return null;
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

  fcApi.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local") return;
    const wasActive = isActive();
    settings = await fcGetSettings();
    if (wasActive && !isActive()) {
      ui?.removeAll();
      attached = new WeakMap();
    } else if (!wasActive && isActive()) {
      attach(deepActiveElement());
    } else if ("dictionary" in changes || "picky" in changes) {
      ui?.recheckAll();
    }
    if (ui && "sentenceRules" in changes) {
      ui.sentenceRules = settings.sentenceRules;
      ui.refreshAll();
    }
  });
})();
