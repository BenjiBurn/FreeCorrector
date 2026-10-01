/* exported FcUi */
/* global FC_CSS, fcGetSettings, fcSetSettings */

// Owns FreeCorrector's single shadow root on the page: the per-field layers,
// the suggestion card and the error-list panel.

const FC_MAX_CARD_SUGGESTIONS = 5;

class FcUi {
  constructor() {
    this.fields = new Set();
    this.ignored = new Set();
    this.card = null; // { field, index, el }
    this.panel = null; // { field, el }
    this.frame = 0;
    this.sentenceRules = true;

    this.host = document.createElement("freecorrector-root");
    this.host.style.cssText =
      "all: initial !important; position: absolute !important; top: 0 !important;" +
      "left: 0 !important; width: 0 !important; height: 0 !important;" +
      "z-index: 2147483647 !important; display: block !important;";
    const shadow = this.host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = FC_CSS;
    this.layer = document.createElement("div");
    this.layer.className = "fc-layer";
    shadow.append(style, this.layer);

    this.schedule = this.schedule.bind(this);
    window.addEventListener("scroll", this.schedule, { capture: true, passive: true });
    window.addEventListener("resize", this.schedule, { passive: true });
    document.addEventListener("mousedown", (e) => this.onDocumentMouseDown(e), true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && (this.card || this.panel)) {
        this.closeCard();
        this.closePanel();
      }
    }, true);
    this.pollTimer = setInterval(() => this.tick(), 500);
  }

  get panelField() {
    return this.panel?.field ?? null;
  }

  ensureMounted() {
    if (!this.host.isConnected) document.documentElement.append(this.host);
  }

  // ---------- Fields ----------

  addField(field) {
    this.ensureMounted();
    this.fields.add(field);
    this.schedule();
  }

  removeField(field) {
    if (this.card?.field === field) this.closeCard();
    if (this.panel?.field === field) this.closePanel();
    field.destroy();
    this.fields.delete(field);
    this.onFieldRemoved?.(field);
  }

  removeAll() {
    for (const field of [...this.fields]) this.removeField(field);
  }

  refreshAll() {
    for (const field of this.fields) field.refreshVisible();
  }

  recheckAll() {
    for (const field of this.fields) field.scheduleCheck(0);
  }

  // Called by a field whenever its matches change.
  fieldChanged(field) {
    if (this.card?.field === field) this.closeCard();
    if (this.panel?.field === field) this.renderPanel();
  }

  tick() {
    this.ensureMounted();
    for (const field of [...this.fields]) {
      if (!field.el.isConnected) this.removeField(field);
      else field.poll();
    }
    this.schedule();
  }

  schedule() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.layoutAll();
    });
  }

  layoutAll() {
    if (!this.fields.size) return;
    const hostRect = this.host.getBoundingClientRect();
    for (const field of this.fields) field.layout(hostRect);
    if (this.card) this.positionCard(hostRect);
    if (this.panel) this.positionPanel(hostRect);
  }

  // ---------- Ignore / dictionary ----------

  ignoreKey(m) {
    return `${m.ruleId}|${m.word}`;
  }

  isIgnored(m) {
    return this.ignored.has(this.ignoreKey(m));
  }

  ignore(match) {
    const key = this.ignoreKey(match);
    this.ignored.add(key);
    for (const field of this.fields) field.removeMatches((m) => this.ignoreKey(m) === key);
  }

  async addToDictionary(match) {
    const word = match.word;
    const lower = word.toLowerCase();
    for (const field of this.fields) {
      field.removeMatches((m) => m.category === "spelling" && m.word.toLowerCase() === lower);
    }
    const { dictionary } = await fcGetSettings();
    if (!dictionary.some((w) => w.toLowerCase() === lower)) {
      await fcSetSettings({ dictionary: [...dictionary, word].sort((a, b) => a.localeCompare(b, "fr")) });
    }
  }

  // ---------- Suggestion card ----------

  openCard(field, index) {
    this.closeCard();
    this.closePanel();
    const match = field.matches[index];
    if (!match || !field.anchorRect(index)) return;
    field.setActive(index, true);

    const el = fcEl("div", "fc-card");
    el.addEventListener("mousedown", (e) => e.preventDefault());
    el.append(this.buildMatchBody(field, match, () => this.closeCard()));
    this.layer.append(el);
    this.card = { field, index, el };
    this.positionCard(this.host.getBoundingClientRect());
  }

  closeCard() {
    if (!this.card) return;
    this.card.field.setActive(this.card.index, false);
    this.card.el.remove();
    this.card = null;
  }

  positionCard(hostRect) {
    const rect = this.card.field.anchorRect(this.card.index);
    if (!rect) return this.closeCard();
    fcPlace(this.card.el, rect, hostRect);
  }

  // ---------- Error list panel ----------

  togglePanel(field) {
    if (this.panel?.field === field) return this.closePanel();
    this.closeCard();
    this.closePanel();
    const el = fcEl("div", "fc-panel");
    el.addEventListener("mousedown", (e) => e.preventDefault());
    this.layer.append(el);
    this.panel = { field, el };
    this.renderPanel();
    field.renderBadge();
  }

  closePanel() {
    if (!this.panel) return;
    const { field, el } = this.panel;
    el.remove();
    this.panel = null;
    field.renderBadge();
  }

  renderPanel() {
    const { field, el } = this.panel;
    const n = field.matches.length;

    const head = fcEl("div", "fc-panel-head");
    head.append(fcEl("span", "", n ? `${n} ${n > 1 ? "problèmes" : "problème"}` : "Aucune faute"));
    const close = fcEl("button", "fc-close", "×");
    close.title = "Fermer";
    close.addEventListener("click", () => this.closePanel());
    head.append(close);

    const list = fcEl("div", "fc-list");
    if (!n) {
      list.append(fcEl("div", "fc-empty-state", "Rien à corriger, bravo !"));
    }
    for (const match of field.matches) {
      const item = fcEl("div", "fc-item");
      item.append(this.buildMatchBody(field, match, null, true));
      list.append(item);
    }

    const foot = fcEl("div", "fc-foot", "Analyse locale par Grammalecte, aucun texte n’est envoyé.");
    el.replaceChildren(head, list, foot);
    this.positionPanel(this.host.getBoundingClientRect());
  }

  positionPanel(hostRect) {
    const { field, el } = this.panel;
    const rect = field.badge.getBoundingClientRect();
    if (!rect.width) return this.closePanel();
    fcPlace(el, rect, hostRect, { alignRight: true });
  }

  // ---------- Shared match rendering ----------

  buildMatchBody(field, match, onDone, withContext = false) {
    const frag = document.createDocumentFragment();

    const head = fcEl("div", "fc-head");
    const label = match.lang === "en" ? `${match.label} · anglais` : match.label;
    head.append(fcEl("span", `fc-dot fc-${match.category}`), fcEl("span", "", label));
    frag.append(head);

    if (withContext) {
      const ctx = fcEl("div", "fc-context");
      const before = field.text.slice(Math.max(0, match.offset - 30), match.offset);
      const after = field.text.slice(match.offset + match.length, match.offset + match.length + 30);
      ctx.append(
        (match.offset > 30 ? "…" : "") + before,
        fcEl("mark", `fc-${match.category}`, match.word),
        after + (match.offset + match.length + 30 < field.text.length ? "…" : "")
      );
      ctx.title = "Sélectionner dans le champ";
      ctx.addEventListener("click", () => field.select(match));
      frag.append(ctx);
    }

    frag.append(fcEl("div", "fc-msg", match.message));

    const repls = fcEl("div", "fc-repls");
    const suggestions = match.replacements.slice(0, FC_MAX_CARD_SUGGESTIONS);
    for (const s of suggestions) {
      const btn = fcEl("button", "fc-repl", s);
      btn.addEventListener("click", () => {
        onDone?.();
        field.apply(match, s);
      });
      repls.append(btn);
    }
    if (!suggestions.length) repls.append(fcEl("span", "fc-msg", "Aucune suggestion."));
    frag.append(repls);

    const actions = fcEl("div", "fc-actions");
    const ignore = fcEl("button", "fc-action", "Ignorer");
    ignore.addEventListener("click", () => {
      onDone?.();
      this.ignore(match);
    });
    actions.append(ignore);
    if (match.category === "spelling") {
      const add = fcEl("button", "fc-action", "Ajouter au dictionnaire");
      add.addEventListener("click", () => {
        onDone?.();
        this.addToDictionary(match);
      });
      actions.append(add);
    }
    if (match.url) {
      const more = fcEl("a", "fc-action", "En savoir plus");
      more.href = match.url;
      more.target = "_blank";
      more.rel = "noopener noreferrer";
      actions.append(more);
    }
    frag.append(actions);
    return frag;
  }

  onDocumentMouseDown(event) {
    if (event.composedPath().includes(this.host)) return;
    this.closeCard();
    this.closePanel();
  }
}

function fcEl(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

// Position a floating box next to an anchor rect (viewport coordinates),
// below it when there is room, otherwise above, and clamped to the viewport.
function fcPlace(el, anchor, hostRect, { alignRight = false } = {}) {
  const margin = 8;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let x = alignRight ? anchor.right - w : anchor.left;
  x = Math.max(margin, Math.min(x, window.innerWidth - w - margin));
  let y = anchor.bottom + 6;
  if (y + h > window.innerHeight - margin && anchor.top - h - 6 >= margin) {
    y = anchor.top - h - 6;
  }
  el.style.left = `${x - hostRect.left}px`;
  el.style.top = `${y - hostRect.top}px`;
}
