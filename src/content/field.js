/* exported FcFieldBase, FcTextField, FC_RULE_CAPITAL, FC_RULE_FINAL_PUNCT */
/* global fcApi */

// A checker attached to one editable element. FcFieldBase holds what every
// kind of field shares (checking, the counter badge, keeping underlines in
// place while typing, applying fixes); subclasses know how to read the text,
// draw the underlines and change the text:
//   - FcTextField: <textarea> and <input>, drawn with a "mirror";
//   - FcRichField (rich-field.js): contenteditable editors.

const FC_CHECK_DELAY = 600;
const FC_BADGE_SIZE = 22;
const FC_WORD_CHAR = /[\p{L}\p{N}'’_-]/u;
const FC_SVG_NS = "http://www.w3.org/2000/svg";

// Rule ids of the sentence rules from engine/sentence-rules.js.
const FC_RULE_CAPITAL = "FC_CAPITAL_START";
const FC_RULE_FINAL_PUNCT = "FC_FINAL_PUNCT";

class FcFieldBase {
  constructor(el, ui) {
    this.el = el;
    this.ui = ui;
    this.isSearch = false;
    this.text = "";
    this.allMatches = [];
    this.matches = [];
    this.state = "idle";
    this.error = "";
    this.reqId = 0;
    this.timer = 0;
    this.destroyed = false;

    this.root = document.createElement("div");
    this.badge = document.createElement("div");
    this.badge.className = "fc-badge";
    ui.layer.append(this.root);

    // Keep focus in the field when the badge is clicked.
    this.badge.addEventListener("mousedown", (e) => e.preventDefault());
    this.badge.addEventListener("click", () => ui.togglePanel(this));

    this.onInput = this.onInput.bind(this);
    this.onClick = this.onClick.bind(this);
    // Focus and caret moves can show or hide the "missing final period" hint.
    this.onFocusChange = () => {
      this.refreshVisible();
      this.renderBadge();
    };
    this.onCaretMove = () => this.refreshVisible();
    this.listen(el, "input", this.onInput);
    this.listen(el, "click", this.onClick);
    this.listen(el, "focus", this.onFocusChange);
    this.listen(el, "blur", this.onFocusChange);
    this.listen(el, "keyup", this.onCaretMove);
    this.listen(el, "mouseup", this.onCaretMove);

    // Our underlines replace the browser's, so avoid drawing both.
    this.originalSpellcheck = el.getAttribute("spellcheck");
    el.spellcheck = false;

    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
      ui.schedule();
    });
    this.resizeObserver.observe(el);
  }

  // Subclasses call this at the end of their constructor.
  start() {
    this.text = this.readText();
    this.root.append(this.badge);
    this.onResize();
    this.renderMarks();
    this.renderBadge();
    this.scheduleCheck(0);
  }

  listen(target, type, handler) {
    target.addEventListener(type, handler);
    (this.listeners ??= []).push([target, type, handler]);
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.timer);
    this.resizeObserver.disconnect();
    for (const [target, type, handler] of this.listeners ?? []) target.removeEventListener(type, handler);
    const el = this.el;
    if (this.originalSpellcheck === null) el.removeAttribute("spellcheck");
    else el.setAttribute("spellcheck", this.originalSpellcheck);
    this.root.remove();
  }

  // ---------- To implement in subclasses ----------

  readText() { return ""; }
  caretOffset() { return null; } // text offset of the caret, or null
  hasSelection() { return false; }
  isFocused() { return document.activeElement === this.el; }
  onResize() {}
  layout(_hostRect) {}
  renderMarks() {}
  matchAt(_x, _y) { return -1; }
  anchorRect(_index) { return null; }
  setActive(_index, _on) {}
  replaceText(_offset, _length, _replacement) {}
  selectText(_offset, _length) {}

  // ---------- Badge ----------

  // Places the badge at the bottom right of `box` (viewport coordinates of the
  // area text is drawn in), or vertically centered on single-line fields.
  placeBadge(box, hostRect, centered) {
    const bs = this.badge.style;
    bs.left = `${box.right - hostRect.left - FC_BADGE_SIZE - 4}px`;
    bs.top = centered || box.height < FC_BADGE_SIZE + 12
      ? `${box.top - hostRect.top + (box.height - FC_BADGE_SIZE) / 2}px`
      : `${box.bottom - hostRect.top - FC_BADGE_SIZE - 4}px`;
  }

  renderBadge() {
    const badge = this.badge;
    const n = this.matches.length;
    const hasText = this.text.trim() !== "";
    badge.hidden = !(this.isFocused() || this.ui.panelField === this || (n > 0 && hasText));

    badge.classList.remove("fc-only-minor");
    badge.replaceChildren();
    if (this.state === "error") {
      badge.dataset.state = "error";
      badge.textContent = "!";
      badge.title = `FreeCorrector : ${fcErrorText(this.error)}`;
    } else if (n > 0) {
      badge.dataset.state = "errors";
      badge.textContent = n > 99 ? "99+" : String(n);
      if (!this.matches.some((m) => m.category === "spelling" || m.category === "grammar")) {
        badge.classList.add("fc-only-minor");
      }
      badge.title = `${n} ${n > 1 ? "problèmes détectés" : "problème détecté"} : cliquer pour voir`;
    } else if (this.state === "checking") {
      badge.dataset.state = "checking";
      badge.title = "Vérification en cours…";
    } else {
      badge.dataset.state = "ok";
      badge.append(fcCheckIcon());
      badge.title = "Aucune faute détectée";
    }
  }

  // ---------- Checking ----------

  scheduleCheck(delay = FC_CHECK_DELAY) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.check(), delay);
  }

  async check() {
    const text = this.readText();
    const id = ++this.reqId;
    if (!text.trim()) {
      this.text = text;
      this.setMatches([]);
      return;
    }
    this.state = "checking";
    this.renderBadge();

    let res;
    try {
      res = await fcApi.runtime.sendMessage({ type: "check", text });
    } catch (err) {
      res = { error: String(err?.message ?? err) };
    }
    // A newer edit has already scheduled another check.
    if (this.destroyed || id !== this.reqId || this.readText() !== text) return;

    if (res?.error) {
      this.state = "error";
      this.error = res.error;
      this.renderBadge();
      return;
    }
    this.text = text;
    this.setMatches(res.matches.filter((m) => !this.ui.isIgnored(m)));
  }

  setMatches(matches) {
    this.allMatches = matches;
    this.state = "done";
    this.error = "";
    this.refreshVisible(true);
  }

  // `allMatches` is everything the engine reported; `matches` is what we show.
  isVisible(m) {
    if (m.ruleId !== FC_RULE_CAPITAL && m.ruleId !== FC_RULE_FINAL_PUNCT) return true;
    if (!this.ui.sentenceRules || this.isSearch) return false;
    // Don't ask for a final period while the user is still writing the sentence.
    if (m.ruleId === FC_RULE_FINAL_PUNCT && this.isFocused()) {
      const caret = this.caretOffset();
      return caret !== null && caret < m.offset + m.length;
    }
    return true;
  }

  refreshVisible(force = false) {
    const visible = this.allMatches.filter((m) => this.isVisible(m));
    const same =
      visible.length === this.matches.length && visible.every((m, i) => m === this.matches[i]);
    if (same && !force) return;
    this.matches = visible;
    this.renderMarks();
    this.renderBadge();
    this.ui.fieldChanged(this);
    this.ui.schedule();
  }

  // Keep existing underlines in place while the user types: shift the ones
  // after the edit, drop the ones it touched, then re-check after a pause.
  onInput() {
    const oldText = this.text;
    const newText = this.readText();
    if (oldText === newText) return;

    let start = 0;
    const maxStart = Math.min(oldText.length, newText.length);
    while (start < maxStart && oldText[start] === newText[start]) start++;
    let tail = 0;
    while (
      tail < oldText.length - start &&
      tail < newText.length - start &&
      oldText[oldText.length - 1 - tail] === newText[newText.length - 1 - tail]
    ) tail++;
    const oldEnd = oldText.length - tail;
    const newEnd = newText.length - tail;
    const delta = newText.length - oldText.length;
    const isWord = (ch) => ch !== undefined && FC_WORD_CHAR.test(ch);

    this.allMatches = this.allMatches.flatMap((m) => {
      const end = m.offset + m.length;
      if (end < start || (end === start && !isWord(newText[start]))) return [m];
      if (m.offset > oldEnd || (m.offset === oldEnd && !isWord(newText[newEnd - 1]))) {
        return [{ ...m, offset: m.offset + delta }];
      }
      return [];
    });
    this.text = newText;
    this.refreshVisible(true);
    this.scheduleCheck();
  }

  onClick(event) {
    if (this.hasSelection()) return;
    const index = this.matchAt(event.clientX, event.clientY);
    if (index >= 0) this.ui.openCard(this, index);
    else this.ui.closeCard();
  }

  // ---------- Corrections ----------

  apply(match, replacement) {
    const { offset, length, word } = match;
    if (this.readText().slice(offset, offset + length) !== word) {
      this.scheduleCheck(0);
      return;
    }
    this.replaceText(offset, length, replacement);
    // Some editors apply the change asynchronously: catch up afterwards.
    setTimeout(() => this.poll(), 50);
  }

  select(match) {
    this.selectText(match.offset, match.length);
  }

  // Remove matches locally (after "ignore" or "add to dictionary").
  removeMatches(predicate) {
    const kept = this.allMatches.filter((m) => !predicate(m));
    if (kept.length !== this.allMatches.length) this.setMatches(kept);
  }

  // Catch changes that fire no input event (scripts, some editors).
  poll() {
    if (!this.destroyed && this.readText() !== this.text) this.onInput();
  }
}

// ---------------------------------------------------------------------------

// Computed properties that affect where glyphs land.
const FC_MIRRORED_PROPS = [
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant",
  "fontStretch", "fontFeatureSettings", "fontKerning", "letterSpacing",
  "wordSpacing", "lineHeight", "textTransform", "textIndent", "textAlign",
  "direction", "tabSize", "whiteSpace", "wordBreak", "overflowWrap",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
];

// <textarea> and <input>: the underlines are drawn with a "mirror", a
// transparent copy of the field's text laid exactly over it, where each error
// is wrapped in an underlined <span>.
class FcTextField extends FcFieldBase {
  constructor(el, ui) {
    super(el, ui);
    this.isInput = el.localName === "input";
    this.isSearch = this.isInput && (el.getAttribute("type") || "").toLowerCase() === "search";
    this.spans = [];
    this.mirror = document.createElement("div");
    this.mirror.className = "fc-mirror";
    this.inner = document.createElement("div");
    this.inner.className = "fc-mirror-inner";
    this.mirror.append(this.inner);
    this.root.append(this.mirror);
    this.start();
  }

  readText() {
    return this.el.value;
  }

  caretOffset() {
    return this.el.selectionEnd;
  }

  hasSelection() {
    return this.el.selectionStart !== this.el.selectionEnd;
  }

  onResize() {
    const cs = getComputedStyle(this.el);
    // Firefox reports clientLeft/clientTop/clientWidth of an <input> relative
    // to its content box, so measure the padding box from the borders instead.
    this.borders = {
      left: parseFloat(cs.borderLeftWidth) || 0,
      top: parseFloat(cs.borderTopWidth) || 0,
      right: parseFloat(cs.borderRightWidth) || 0,
      bottom: parseFloat(cs.borderBottomWidth) || 0,
    };
    const style = this.mirror.style;
    for (const prop of FC_MIRRORED_PROPS) style[prop] = cs[prop];
    if (this.isInput) {
      // Single-line inputs never wrap and center their line vertically.
      style.whiteSpace = "pre";
      style.overflowWrap = "normal";
      const contentHeight =
        this.paddingBox().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      style.lineHeight = `${Math.max(contentHeight, 0)}px`;
    }
  }

  // Size of the area text is drawn in: inside the borders, minus scrollbars.
  paddingBox() {
    const el = this.el;
    if (!this.isInput) return { width: el.clientWidth, height: el.clientHeight };
    const b = this.borders;
    return {
      width: el.offsetWidth - b.left - b.right,
      height: el.offsetHeight - b.top - b.bottom,
    };
  }

  layout(hostRect) {
    const el = this.el;
    const r = el.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0;
    this.root.hidden = !visible;
    if (!visible) return;

    const left = r.left + this.borders.left;
    const top = r.top + this.borders.top;
    const box = this.paddingBox();
    const ms = this.mirror.style;
    ms.left = `${left - hostRect.left}px`;
    ms.top = `${top - hostRect.top}px`;
    ms.width = `${box.width}px`;
    ms.height = `${box.height}px`;
    this.inner.style.transform = `translate(${-el.scrollLeft}px, ${-el.scrollTop}px)`;

    const area = { left, top, right: left + box.width, bottom: top + box.height, height: box.height };
    this.placeBadge(area, hostRect, this.isInput);
  }

  renderMarks() {
    const text = this.text;
    const frag = document.createDocumentFragment();
    this.spans = [];
    let pos = 0;
    this.matches.forEach((m, index) => {
      if (m.offset < pos || m.length <= 0) return;
      if (m.offset > pos) frag.append(text.slice(pos, m.offset));
      const span = document.createElement("span");
      span.className = `fc-err fc-${m.category}`;
      span.dataset.index = String(index);
      span.textContent = text.slice(m.offset, m.offset + m.length);
      frag.append(span);
      this.spans.push(span);
      pos = m.offset + m.length;
    });
    // The zero-width space keeps a trailing newline from collapsing.
    frag.append(text.slice(pos) + "​");
    this.inner.replaceChildren(frag);
  }

  // Index of the match drawn under viewport point (x, y), or -1.
  matchAt(x, y) {
    for (const span of this.spans) {
      for (const rect of span.getClientRects()) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom + 4) {
          return Number(span.dataset.index);
        }
      }
    }
    return -1;
  }

  spanFor(index) {
    return this.spans.find((s) => Number(s.dataset.index) === index) ?? null;
  }

  anchorRect(index) {
    return this.spanFor(index)?.getClientRects()[0] ?? null;
  }

  setActive(index, on) {
    this.spanFor(index)?.classList.toggle("fc-active", on);
  }

  replaceText(offset, length, replacement) {
    const el = this.el;
    el.focus();
    el.setSelectionRange(offset, offset + length);
    // execCommand keeps the browser's undo history and fires a real input
    // event, which frameworks like React listen to.
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, replacement);
    } catch {
      ok = false;
    }
    if (!ok) {
      el.setRangeText(replacement, offset, offset + length, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  selectText(offset, length) {
    this.el.focus();
    this.el.setSelectionRange(offset, offset + length);
  }
}

function fcErrorText(code) {
  if (code === "too-long") return "texte trop long pour être vérifié.";
  return `erreur du correcteur (${code}).`;
}

function fcCheckIcon() {
  const svg = document.createElementNS(FC_SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  const path = document.createElementNS(FC_SVG_NS, "path");
  path.setAttribute("d", "M3 8.5l3 3 7-7");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2.2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}
