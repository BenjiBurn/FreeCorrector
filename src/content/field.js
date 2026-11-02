/* exported FcFieldBase, FcTextField, FC_RULE_CAPITAL, FC_RULE_FINAL_PUNCT */
/* global fcApi, fcT, fcPlural, fcCountFixes */

// A checker attached to one editable element. FcFieldBase holds what every
// kind of field shares (checking, the counter badge, keeping underlines in
// place while typing, applying fixes); subclasses know how to read the text,
// draw the underlines and change the text:
//   - FcTextField: <textarea> and <input>, drawn with a "mirror";
//   - FcRichField (rich-field.js): contenteditable editors.

const FC_CHECK_DELAY = 450;
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
    this.onFocusChange = (event) => {
      this.refreshVisible();
      this.renderBadge();
      // The background may have gone idle and stopped the engines: restart
      // them before the user's next check (no cost when they are running).
      if (event?.type === "focus") Promise.resolve(fcApi.runtime.sendMessage({ type: "warmup" })).catch(() => {});
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
  // Whether the page shows the field at `r` (its viewport rectangle): not made
  // invisible (X hides its header with opacity when the page scrolls) nor covered
  // by other content. A label laid over the field does not count.
  isShown(r) {
    if (r.width <= 0 || r.height <= 0) return false;
    const el = this.el;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    // Off screen: nothing to see anyway, the layout places the marks there.
    if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) return true;
    const isAncestor = (a) => {
      for (let n = el; n; n = n.parentNode ?? n.host) if (n === a) return true;
      return false;
    };
    // Tested on the part a scrolling box shows: a long prompt scrolled down hides its top.
    const v = this.visibleRect(r);
    if (v.right - v.left <= 0 || v.bottom - v.top <= 0) return false;
    const y = Math.min(v.top + Math.min((v.bottom - v.top) / 2, 16), window.innerHeight - 1);
    for (const x of [v.left + 8, (v.left + v.right) / 2, v.right - 8]) {
      if (x < 0 || x >= window.innerWidth) continue;
      const top = document.elementsFromPoint(x, y).find((e) => e !== this.ui.host);
      if (!top || top === el || el.contains(top) || isAncestor(top) || top.control === el ||
          top.closest?.("label")?.control === el) return true;
    }
    return false;
  }

  // `r` (the field's viewport rectangle) cut to the boxes of the page that
  // scroll or clip it, and to the viewport.
  visibleRect(r) {
    let left = Math.max(r.left, 0), top = Math.max(r.top, 0);
    let right = Math.min(r.right, window.innerWidth), bottom = Math.min(r.bottom, window.innerHeight);
    // (Nothing above a fixed box clips it.)
    let fixed = getComputedStyle(this.el).position === "fixed";
    for (let n = this.el.parentNode ?? this.el.host; n && !fixed && n !== document.documentElement && n !== document.body;
      n = n.parentNode ?? n.host) {
      if (n.nodeType !== Node.ELEMENT_NODE) continue;
      const cs = getComputedStyle(n);
      fixed = cs.position === "fixed";
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      // Its padding box, without its scrollbars.
      const b = n.getBoundingClientRect();
      const bl = b.left + n.clientLeft, bt = b.top + n.clientTop;
      if (cs.overflowX !== "visible") { left = Math.max(left, bl); right = Math.min(right, bl + n.clientWidth); }
      if (cs.overflowY !== "visible") { top = Math.max(top, bt); bottom = Math.min(bottom, bt + n.clientHeight); }
    }
    return { left, top, right: Math.max(left, right), bottom: Math.max(top, bottom) };
  }

  layout(_hostRect) {}
  renderMarks() {}
  matchAt(_x, _y) { return -1; }
  anchorRect(_index) { return null; }
  setActive(_index, _on) {}
  replaceText(_offset, _length, _replacement) {}
  selectText(_offset, _length) {}

  // ---------- Badge ----------

  // Places the badge at the bottom right of `box` (viewport coordinates of the
  // area text is drawn in), or vertically centered on single-line fields. When
  // that hides the text (typed up to the edge: "c'est un peu chiant" on X), it
  // goes out of the way: right of the field, on its top right corner or under
  // it, where the page has nothing to click.
  placeBadge(box, hostRect, centered) {
    const S = FC_BADGE_SIZE;
    const top = centered || box.height < S + 12 ? box.top + (box.height - S) / 2 : box.bottom - S - 4;
    const spots = [
      { left: box.right - S - 4, top },
      { left: box.right + 6, top },
      { left: box.right - S + 6, top: box.top - S + 6 },
      { left: box.right - S - 4, top: box.bottom + 6 },
    ];
    let rects = null;
    const coversText = (s) => {
      // (Only the text shown: what a scrolling box hides does not count.)
      rects ??= [...this.textRects()].map((r) => ({
        left: Math.max(r.left, box.left), right: Math.min(r.right, box.right),
        top: Math.max(r.top, box.top), bottom: Math.min(r.bottom, box.bottom),
      }));
      return rects.some((r) => r.right > r.left && r.bottom > r.top &&
        r.left < s.left + S + 1 && s.left - 1 < r.right && r.top < s.top + S + 1 && s.top - 1 < r.bottom);
    };
    const spot = spots.find((s, i) => (i === 0 || this.isFreeSpot(s)) && !coversText(s)) ?? spots[0];
    const bs = this.badge.style;
    bs.left = `${spot.left - hostRect.left}px`;
    bs.top = `${spot.top - hostRect.top}px`;
  }

  // Viewport rectangles of the field's text, for the badge to keep off it.
  textRects() { return []; }

  // Whether the badge at `s` (viewport) is on screen and covers nothing of the
  // page's to click or type in.
  isFreeSpot(s) {
    const S = FC_BADGE_SIZE;
    if (s.left < 0 || s.top < 0 || s.left + S > window.innerWidth || s.top + S > window.innerHeight) return false;
    for (const [x, y] of [[s.left + S / 2, s.top + S / 2], [s.left + 1, s.top + 1], [s.left + S - 1, s.top + 1], [s.left + 1, s.top + S - 1], [s.left + S - 1, s.top + S - 1]]) {
      const top = document.elementsFromPoint(x, y).find((e) => e !== this.ui.host);
      if (top?.closest?.("a, button, input, select, textarea, label, [role=button], [role=link], [role=textbox], [contenteditable=''], [contenteditable=true]") &&
          top !== this.el && !this.el.contains(top)) return false;
      // A scrollbar (ChatGPT's prompt) is to click too.
      if (!top?.getBoundingClientRect) continue;
      const b = top.getBoundingClientRect();
      const barX = top.offsetWidth - top.clientWidth - 2 * top.clientLeft;
      const barY = top.offsetHeight - top.clientHeight - 2 * top.clientTop;
      if (barX > 4 && x > b.left + top.clientLeft + top.clientWidth && x < b.right - top.clientLeft ||
          barY > 4 && y > b.top + top.clientTop + top.clientHeight && y < b.bottom - top.clientTop) return false;
    }
    return true;
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
      badge.title = fcPlural("badgeProblems", n);
    } else if (this.state === "checking") {
      badge.dataset.state = "checking";
      badge.title = fcT("badgeChecking");
    } else {
      badge.dataset.state = "ok";
      badge.append(fcCheckIcon());
      badge.title = fcT("badgeOk");
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
    // Right after the install (or a restart), the background may not listen
    // yet: "Receiving end does not exist". It is worth a few more tries.
    for (let attempt = 0; ; attempt++) {
      try {
        res = await fcApi.runtime.sendMessage({ type: "check", text });
      } catch (err) {
        res = { error: String(err?.message ?? err) };
      }
      if (!/Receiving end does not exist|Could not establish connection/i.test(res?.error ?? "") || attempt >= 4) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
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
    this.setMatches(res.matches.filter((m) => !this.ui.isIgnored(m, text)));
  }

  setMatches(matches) {
    this.allMatches = matches;
    this.state = "done";
    this.error = "";
    this.refreshVisible(true);
  }

  // `allMatches` is everything the engine reported; `matches` is what we show.
  isVisible(m) {
    // Search queries are not sentences, and searches ignore case: no capital
    // asked for ("ford capri" -> Ford).
    if (this.isSearch && m.replacements[0] !== m.word &&
        m.replacements[0]?.toLowerCase() === m.word.toLowerCase()) return false;
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
    // Some editors apply the change asynchronously: catch up afterwards.
    Promise.resolve(this.replaceText(offset, length, replacement))
      .finally(() => setTimeout(() => this.poll(), 50));
    fcCountFixes(1);
  }

  // The "fix all" shortcut: the first suggestion of every problem shown, from
  // the end so the earlier offsets stay valid. Style hints are questions
  // ("vouliez-vous écrire…"): left out. Returns how many were fixed.
  async fixAll() {
    if (this.readText() !== this.text || this.state !== "done") {
      clearTimeout(this.timer);
      await this.check();
    }
    const text = this.readText();
    if (this.destroyed || text !== this.text) return 0;
    let limit = Infinity;
    const fixes = [];
    for (const m of [...this.matches].sort((a, b) => b.offset - a.offset)) {
      const best = m.replacements[0];
      if (best === undefined || m.category === "style" || m.offset + m.length > limit) continue;
      if (text.slice(m.offset, m.offset + m.length) !== m.word) continue;
      fixes.push({ offset: m.offset, length: m.length, best });
      limit = m.offset;
    }
    if (fixes.length) await this.replaceFixes(text, fixes);
    fcCountFixes(fixes.length);
    setTimeout(() => this.poll(), 50);
    return fixes.length;
  }

  // One edit per fix, the last one first (rich editors keep their formatting).
  async replaceFixes(_text, fixes) {
    for (const f of fixes) await this.replaceText(f.offset, f.length, f.best);
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
    this.isSearch = this.isInput && fcIsSearchInput(el);
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

  // The mirror's text sits exactly over the field's (very long texts: not looked at).
  textRects() {
    if (this.text.length > 5000) return [];
    const range = document.createRange();
    range.selectNodeContents(this.inner);
    return range.getClientRects();
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
    this.paddingRight = parseFloat(cs.paddingRight) || 0;
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
    const visible = this.isShown(r);
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
    // What a scrolling box of the page hides of the field stays hidden.
    const v = this.visibleRect({ left, top, right: left + box.width, bottom: top + box.height });
    ms.clipPath = `inset(${v.top - top}px ${left + box.width - v.right}px ${top + box.height - v.bottom}px ${v.left - left}px)`;

    // A wide right padding keeps room for the site's own buttons (leboncoin's
    // "Rechercher"): the badge goes before it.
    const reserved = this.isInput && this.paddingRight >= FC_BADGE_SIZE ? this.paddingRight : 0;
    const area = { left, top, right: left + box.width - reserved, bottom: top + box.height, height: box.height };
    if (this.isInput) area.right = this.freeRight(area);
    this.placeBadge(area, hostRect, this.isInput);
  }

  // The right end of `area` not covered by the page's own content (a button laid
  // over the field without padding): the badge goes left of it.
  freeRight(area) {
    const el = this.el;
    const y = area.top + area.height / 2;
    let right = area.right;
    for (let k = 0; k < 3 && y >= 0 && y < window.innerHeight; k++) {
      const x = right - 4 - FC_BADGE_SIZE / 2;
      if (x - FC_BADGE_SIZE < area.left || x < 0 || x >= window.innerWidth) break;
      const top = document.elementsFromPoint(x, y).find((e) => e !== this.ui.host);
      let isField = false;
      for (let n = el; n && !isField; n = n.parentNode ?? n.host) isField = n === top;
      if (!top || isField || el.contains(top)) break;
      const r = top.getBoundingClientRect();
      // (A dialog over the page is not a button on the field.)
      if (r.width > (area.right - area.left) / 2 || r.left >= right) break;
      right = r.left;
    }
    return right;
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

  // Plain text: a single edit from the first fix to the last, so one Ctrl+Z undoes them all.
  replaceFixes(text, fixes) {
    const start = fixes.at(-1).offset;
    const end = fixes[0].offset + fixes[0].length;
    let middle = text.slice(start, end);
    for (const f of fixes) middle = middle.slice(0, f.offset - start) + f.best + middle.slice(f.offset - start + f.length);
    this.replaceText(start, end - start, middle);
  }
}

// A search box: a query, not a sentence. Sites mark them in many ways
// (leboncoin: a text input with role="combobox" and "Rechercher sur leboncoin").
function fcIsSearchInput(el) {
  if ((el.getAttribute("type") || "").toLowerCase() === "search" || el.enterKeyHint === "search") return true;
  if (/^(searchbox|combobox)$/.test(el.getAttribute("role") ?? "") || el.closest("[role=search]")) return true;
  if (/^(q|query|s|search|recherche|keywords?)$/i.test(el.name)) return true;
  return /search|recherch|cherche/i.test(`${el.id} ${el.placeholder} ${el.getAttribute("aria-label") ?? ""}`);
}

function fcErrorText(code) {
  if (code === "too-long") return fcT("errTooLong");
  return fcT("errEngine", code);
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
