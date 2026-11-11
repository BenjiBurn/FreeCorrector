/* exported FcDocsField, fcDocsEditor, FC_DOCS */
/* global FcRichField */

// Google Docs. Its text is drawn in a <canvas>, but docs-annotate.js asks it for
// an invisible copy laid over the page, one SVG <rect> per line (or per piece
// of a line in another font), grouped by paragraph:
//
//   <g role="paragraph"><rect aria-label="the line's text" data-font-css="400 14.6667px Arial"
//      transform="matrix(…)" width="…" height="…"></rect>…</g>
//
// The text is read from these labels. A word's place on its line is measured
// with the line's font (canvas measureText), scaled to the line's real width,
// which takes Docs' zoom into account. Typing happens in Docs' own input
// iframe: fixes select the word and type the replacement there.

const FC_DOCS = location.hostname === "docs.google.com" && location.pathname.startsWith("/document/");
const FC_DOCS_LINE = 'g[role="paragraph"] > rect[aria-label]';

// The editor of the page once Docs shows its annotated text, or null.
function fcDocsEditor() {
  const editor = document.querySelector(".kix-appview-editor");
  return editor?.querySelector(FC_DOCS_LINE) ? editor : null;
}

class FcDocsField extends FcRichField {
  constructor(el, ui) {
    super(el, ui);
    // The keys go to Docs' input iframe, not to the editor: focus and caret
    // moves are followed there.
    const frame = this.inputFrame();
    if (frame?.contentWindow) {
      this.listen(frame.contentWindow, "focus", this.onFocusChange);
      this.listen(frame.contentWindow, "blur", this.onFocusChange);
      this.listen(frame.contentWindow, "keyup", this.onCaretMove);
    }
  }

  // ---------- Text ----------

  // Typing changes the label of the line, not the page's text.
  get textAttributes() {
    return ["aria-label"];
  }

  // Paragraphs end with "\n". Docs leaves the spaces at the ends of the pieces
  // out of their labels: they are put back. Lines of a paragraph wrapped by Docs
  // are joined by a space (not after a hyphen: "porte-" then "monnaie"); pieces
  // of one line in different fonts ("un mot **vraiment** en gras") by a space
  // when there is room for one between them, which a word half in bold has not.
  //
  // Each page is drawn apart, and a paragraph cut by the end of a page is
  // given as two (" … le même paragraphe. On" / "ajoute encore …"): it goes on
  // when the first word of the next page would not have fitted at the end of
  // the page's last line, the way Docs wraps lines.
  readText() {
    // The pages in reading order (Docs reuses their elements while scrolling).
    const pages = new Map();
    for (const paragraph of this.el.querySelectorAll('g[role="paragraph"]')) {
      const svg = paragraph.ownerSVGElement;
      if (!pages.has(svg)) pages.set(svg, []);
      pages.get(svg).push(paragraph);
    }
    const order = [...pages.keys()].map((svg) => ({ svg, box: svg?.getBoundingClientRect() }))
      .sort((a, b) => (a.box?.top ?? 0) - (b.box?.top ?? 0) || (a.box?.left ?? 0) - (b.box?.left ?? 0));

    const pieces = (paragraph) => [...paragraph.children].filter((r) => r.localName === "rect" && r.hasAttribute("aria-label"))
      .map((rect) => ({ rect, label: rect.getAttribute("aria-label"), font: rect.getAttribute("data-font-css") || "", ...this.svgBox(rect) }));
    // Where Docs wraps lines: the right of the widest line it wrapped (none
    // seen, as in a list of short lines: no paragraph is joined to another).
    let right = 0;
    const paragraphs = [];
    for (const { svg } of order) {
      pages.get(svg).forEach((paragraph, i) => {
        const items = pieces(paragraph);
        items.forEach((p, k) => {
          if (k + 1 < items.length && !this.sameLine(p, items[k + 1])) right = Math.max(right, p.right);
        });
        paragraphs.push({ items, pageStart: i === 0 });
      });
    }

    let text = "";
    const segments = [];
    let prev = null;
    for (const { items, pageStart } of paragraphs) {
      if (!items.length) continue;
      const goesOn = pageStart && prev && this.wrapped(prev, items[0], right);
      if (text && !goesOn && !text.endsWith("\n")) text += "\n";
      if (!goesOn) prev = null;
      for (const item of items) {
        if (prev && !/\s$/.test(text) && !/^\s/.test(item.label)) {
          const spaced = !goesOn && this.sameLine(prev, item)
            ? item.left - prev.right > this.measure(prev.font, " ") / 2
            : !/[-‐/]$/.test(text);
          if (spaced) text += " ";
        }
        segments.push({ rect: item.rect, start: text.length, label: item.label, font: item.font });
        text += item.label;
        prev = item;
      }
    }
    this.segments = segments;
    return text;
  }

  // Whether the line `last` was wrapped before `next`: the first word of `next`
  // would not have fitted after it, before `right`.
  wrapped(last, next, right) {
    if (!right) return false;
    const word = /^\S*/.exec(next.label)[0];
    return last.right + this.measure(last.font, " ") + this.measure(next.font, word) > right + 0.5;
  }

  // Where a piece of line sits in Docs' own units (no layout needed): its
  // translation, plus its x and y.
  svgBox(rect) {
    const m = /matrix\(([^)]*)\)/.exec(rect.getAttribute("transform") ?? "");
    const f = m ? m[1].split(/[ ,]+/).map(Number) : [1, 0, 0, 1, 0, 0];
    const top = (f[5] || 0) + (Number(rect.getAttribute("y")) || 0);
    const left = (f[4] || 0) + (Number(rect.getAttribute("x")) || 0);
    const num = (name) => Number(rect.getAttribute(name)) || 0;
    return { top, bottom: top + num("height"), left, right: left + num("width") };
  }

  // Two pieces are on the same line when they overlap over most of their height.
  sameLine(a, b) {
    const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return overlap > 0.5 * Math.min(a.bottom - a.top, b.bottom - b.top);
  }

  syncSegments() {
    if (this.segments.some((s) => !s.rect.isConnected)) this.readText();
  }

  // ---------- Places ----------

  // Width of `text` drawn in `font`, in Docs' units.
  measure(font, text) {
    if (!text) return 0;
    // (Made here: the parent's constructor already reads the text.)
    this.canvas ??= document.createElement("canvas").getContext("2d");
    // (The canvas writes the font its own way: compared with what was given.)
    if (this.canvasFont !== font) this.canvas.font = this.canvasFont = font;
    return this.canvas.measureText(text).width;
  }

  // Viewport rectangles of the text from `offset`, `length` characters long: one per piece of line.
  rectsFor(offset, length) {
    const end = offset + length;
    const out = [];
    const segs = this.segments;
    // (Long documents: the first piece is found by halves.)
    let lo = 0;
    for (let hi = segs.length - 1; lo < hi;) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid].start <= offset) lo = mid;
      else hi = mid - 1;
    }
    for (let i = lo; i < segs.length && segs[i].start < end; i++) {
      const seg = segs[i];
      const segEnd = seg.start + seg.label.length;
      if (segEnd <= offset) continue;
      if (!seg.rect.isConnected) continue;
      const box = seg.rect.getBoundingClientRect();
      if (!box.width) continue;
      const full = this.measure(seg.font, seg.label);
      const scale = full > 0 ? box.width / full : 1;
      const from = Math.max(offset, seg.start) - seg.start;
      const to = Math.min(end, segEnd) - seg.start;
      const left = box.left + this.measure(seg.font, seg.label.slice(0, from)) * scale;
      const right = box.left + this.measure(seg.font, seg.label.slice(0, to)) * scale;
      out.push({ left, top: box.top, right, bottom: box.bottom, width: right - left, height: box.height });
    }
    return out;
  }

  markRects(mark, r) {
    return this.rectsFor(mark.match.offset, mark.match.length).filter((x) => x.width > 0)
      .map((x) => ({ left: x.left - r.left, top: x.top - r.top, width: x.width, height: x.height }));
  }

  anchorRect(index) {
    const m = this.matches[index];
    if (!m) return null;
    this.syncSegments();
    return this.rectsFor(m.offset, m.length)[0] ?? null;
  }

  // (Long documents: not looked at.)
  textRects() {
    if (this.segments.length > 400) return [];
    return this.segments.filter((s) => s.rect.isConnected).map((s) => s.rect.getBoundingClientRect());
  }

  // ---------- Caret and focus ----------

  // Docs types in an iframe of its own, and draws its caret as an element.
  inputFrame() {
    return document.querySelector(".docs-texteventtarget-iframe");
  }

  isFocused() {
    const active = document.activeElement;
    return document.hasFocus() && !!active && (active === this.inputFrame() || this.el.contains(active));
  }

  // (Other people's carets are drawn too, with other ids.)
  caretRect() {
    const r = document.getElementById("kix-current-user-cursor-caret")?.getBoundingClientRect();
    return r && r.height ? r : null;
  }

  // Text offset of the caret: the piece of line it stands on, then the
  // character it is closest to.
  caretOffset() {
    const c = this.caretRect();
    if (!c) return null;
    const y = c.top + c.height / 2;
    const x = c.left + c.width / 2;
    for (const seg of this.segments) {
      if (!seg.rect.isConnected) continue;
      const box = seg.rect.getBoundingClientRect();
      if (y < box.top || y > box.bottom || x < box.left - 2 || x > box.right + 2) continue;
      const full = this.measure(seg.font, seg.label);
      const scale = full > 0 ? box.width / full : 1;
      let best = 0;
      for (let i = 1; i <= seg.label.length; i++) {
        const at = box.left + this.measure(seg.font, seg.label.slice(0, i)) * scale;
        if (at > x) {
          const before = box.left + this.measure(seg.font, seg.label.slice(0, i - 1)) * scale;
          best = x - before < at - x ? i - 1 : i;
          break;
        }
        best = i;
      }
      return seg.start + best;
    }
    return null;
  }

  // Docs draws the selection as rectangles of its own.
  selectionRects() {
    return [...document.querySelectorAll(".kix-canvas-tile-selection svg rect")]
      .map((r) => r.getBoundingClientRect()).filter((b) => b.width > 0 && b.height > 0);
  }

  hasSelection() {
    return this.selectionRects().length > 0;
  }

  // ---------- Editing ----------
  //
  // Docs takes no text from scripts (execCommand is refused), but it handles
  // mouse and key events like the user's: a click before the word, a
  // Shift+click after it, then the replacement typed key by key in its input
  // iframe. Typed this way, the fix is one more step in Docs' undo history.

  inputTarget() {
    const doc = this.inputFrame()?.contentDocument;
    return doc?.querySelector("[contenteditable=true]") ?? doc?.body ?? null;
  }

  // Selects the text from `offset`, `length` characters long, as Docs'
  // selection. Returns whether Docs selected exactly that text.
  async selectRange(offset, length) {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    this.readText();
    let rects = this.rectsFor(offset, length);
    if (!rects.length) return false;
    // Out of sight (the list of mistakes, "fix all"): scrolled to first, and
    // measured again once Docs has drawn it.
    const view = this.el.getBoundingClientRect();
    if (rects[0].top < view.top + 8 || rects.at(-1).bottom > view.bottom - 8) {
      this.el.scrollTop += rects[0].top - (view.top + view.height / 3);
      await wait(150);
      this.readText();
      rects = this.rectsFor(offset, length);
      if (!rects.length) return false;
    }
    const first = rects[0];
    const last = rects.at(-1);
    this.click(first.left + 0.5, first.top + first.height / 2, false);
    this.click(last.right - 0.5, last.top + last.height / 2, true);
    await wait(30);
    // Nothing is typed unless Docs selected the very words.
    const sel = this.selectionRects();
    const near = (a, b) => Math.abs(a - b) <= 3;
    const covers = (y, x, side) => sel.some((s) => y >= s.top && y <= s.bottom && near(s[side], x));
    return covers(first.top + first.height / 2, first.left, "left") &&
      covers(last.top + last.height / 2, last.right, "right");
  }

  // A click of the left button at viewport point (x, y), on the page of the
  // document that is there.
  click(x, y, shiftKey) {
    const target = document.elementsFromPoint(x, y).find((e) => this.el.contains(e)) ?? this.el;
    for (const type of ["mousedown", "mouseup", "click"]) {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true, composed: true, view: window,
        clientX: x, clientY: y, button: 0, buttons: type === "mousedown" ? 1 : 0, detail: 1, shiftKey,
      }));
    }
  }

  async replaceText(offset, length, replacement) {
    if (!(await this.selectRange(offset, length))) return;
    const input = this.inputTarget();
    if (!input) return;
    input.focus();
    const view = input.ownerDocument.defaultView;
    if (replacement === "") {
      for (const type of ["keydown", "keyup"]) {
        input.dispatchEvent(new KeyboardEvent(type, { key: "Backspace", code: "Backspace", keyCode: 8, which: 8, bubbles: true, cancelable: true, view }));
      }
      return;
    }
    for (const ch of replacement) {
      const code = ch.codePointAt(0);
      input.dispatchEvent(new KeyboardEvent("keypress", { key: ch, charCode: code, keyCode: code, which: code, bubbles: true, cancelable: true, view }));
    }
  }

  async selectText(offset, length) {
    await this.selectRange(offset, length);
    this.inputTarget()?.focus();
  }
}
