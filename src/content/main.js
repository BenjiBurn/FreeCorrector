/* global fcApi, fcGetSettings, FcField, FcUi */

// Entry point: attach a checker to each text field the user focuses.

(async () => {
  let settings = await fcGetSettings();
  let ui = null;
  let attached = new WeakMap();

  const isActive = () =>
    settings.enabled && !settings.disabledSites.includes(location.hostname);

  function isEligible(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.disabled || el.readOnly) return false;
    if (el.getAttribute("data-freecorrector") === "off") return false;
    if (el.localName === "textarea") return true;
    if (el.localName === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      return type === "text" || type === "search";
    }
    return false;
  }

  function attach(el) {
    if (!isActive() || !isEligible(el) || attached.has(el)) return;
    if (!ui) {
      ui = new FcUi();
      ui.sentenceRules = settings.sentenceRules;
      ui.onFieldRemoved = (field) => attached.delete(field.el);
    }
    const field = new FcField(el, ui);
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
