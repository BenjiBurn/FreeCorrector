/* exported FcRichField */
/* global FcFieldBase */

// contenteditable editors (Gmail, Outlook, Discord, Slack, LinkedIn…).
//
// The text is read by walking the DOM, remembering which text node each part
// comes from. Underlines are drawn from the real position of the words
// (Range.getClientRects), in a layer clipped to the editor's box. Fixes select
// the word and use execCommand("insertText"), which rich-text frameworks
// (ProseMirror, Slate, Draft.js, Lexical, Quill…) handle like typing.

const FC_BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT", "FIELDSET",
  "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER",
  "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "TBODY", "TD", "TH",
  "THEAD", "TR", "UL",
]);
const FC_SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "SVG", "IMG", "VIDEO", "AUDIO", "CANVAS"]);
// Not the user's own writing in a reply: the quoted message, its "X wrote:"
// line, a forwarded message, the signature (Thunderbird, Gmail).
const FC_QUOTE_SELECTOR =
  'blockquote[type="cite"], .moz-cite-prefix, .moz-forward-container, .moz-signature, .gmail_quote, .gmail_signature';

class FcRichField extends FcFieldBase {
  constructor(el, ui) {
    super(el, ui);
    this.segments = []; // { node, start } for each text node, in text order
    this.marks = []; // { index, boxes: [div…] } for each drawn match
    this.clip = document.createElement("div");
    this.clip.className = "fc-clip";
    this.root.append(this.clip);

    // Editors often change the DOM without an input event (paste, undo,
    // formatting, other scripts): watch it. Nothing else changes the text read
    // by readText(), so poll() only reads it again after a change.
    this.domChanged = false;
    this.mutationObserver = new MutationObserver((records) => {
      this.domChanged = true;
      // Formatting moves the words without changing the text (bold, a class).
      this.stale = true;
      // Attributes alone are for the next pass: some pages animate them all the time.
      if (records.every((r) => r.type === "attributes")) return;
      clearTimeout(this.mutationTimer);
      this.mutationTimer = setTimeout(() => this.poll(), 30);
    });
    this.mutationObserver.observe(el, { subtree: true, childList: true, characterData: true, attributes: true });
    this.listen(document, "selectionchange", this.onCaretMove);
    this.start();
  }

  destroy() {
    this.mutationObserver.disconnect();
    clearTimeout(this.mutationTimer);
    super.destroy();
  }

  poll() {
    if (!this.domChanged) return;
    this.domChanged = false;
    super.poll();
    // The same text, formatted otherwise: the underlines are placed again.
    this.ui.schedule();
  }

  onInput() {
    // The text is read now: what the observer was about to tell is known.
    if (this.mutationObserver.takeRecords().length) this.stale = true;
    this.domChanged = false;
    super.onInput();
  }

  // ---------- Text <-> DOM ----------

  readText() {
    let text = "";
    const segments = [];
    const newline = () => {
      if (text && !text.endsWith("\n")) text += "\n";
    };
    const walk = (node) => {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === Node.TEXT_NODE) {
          const data = child.data;
          if (!data) continue;
          segments.push({ node: child, start: text.length });
          // Same length as the node, so offsets map 1:1. Source line breaks
          // and tabs render as spaces in normal HTML.
          text += data.replace(/[\n\r\t]/g, " ");
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const tag = child.tagName.toUpperCase();
          if (tag === "BR") {
            text += "\n";
            continue;
          }
          if (FC_SKIPPED_TAGS.has(tag)) continue;
          if (child.matches(FC_QUOTE_SELECTOR)) {
            newline();
            continue;
          }
          // Mentions, chips, embedded widgets: one opaque word.
          if (child.getAttribute("contenteditable") === "false") {
            text += " ";
            continue;
          }
          const block = FC_BLOCK_TAGS.has(tag);
          if (block) newline();
          walk(child);
          if (block) newline();
        }
      }
    };
    walk(this.el);
    this.segments = segments;
    return text;
  }

  // DOM position of text offset `offset`. `atEnd` picks the end of the
  // previous text node when the offset falls between two nodes.
  domPoint(offset, atEnd) {
    const segs = this.segments;
    let lo = 0;
    let hi = segs.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (segs[mid].start <= offset) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (found < 0) return null;
    let seg = segs[found];
    if (atEnd && offset === seg.start && found > 0) seg = segs[found - 1];
    const local = offset - seg.start;
    if (local < 0 || local > seg.node.data.length) return null;
    return { node: seg.node, offset: local };
  }

  // Text nodes may have been replaced since the last read.
  syncSegments() {
    if (this.segments.some((s) => !s.node.isConnected)) this.readText();
  }

  rangeFor(offset, length) {
    this.syncSegments();
    return this.rangeAt(offset, length);
  }

  // (For several ranges in a row: syncSegments() first, once.)
  rangeAt(offset, length) {
    const a = this.domPoint(offset, false);
    const b = this.domPoint(offset + length, true);
    if (!a || !b) return null;
    const range = document.createRange();
    try {
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
    } catch {
      return null;
    }
    return range;
  }

  // (Long documents: not looked at.)
  textRects() {
    if (this.segments.length > 400) return [];
    const range = document.createRange();
    const rects = [];
    for (const { node } of this.segments) {
      if (!node.isConnected || !/\S/.test(node.data)) continue;
      range.selectNodeContents(node);
      rects.push(...range.getClientRects());
    }
    return rects;
  }

  caretOffset() {
    const sel = getSelection();
    if (!sel || !sel.rangeCount) return null;
    const seg = this.segments.find((s) => s.node === sel.focusNode);
    return seg ? seg.start + sel.focusOffset : null;
  }

  hasSelection() {
    const sel = getSelection();
    return !!sel && !sel.isCollapsed;
  }

  isFocused() {
    const active = document.activeElement;
    return !!active && (active === this.el || this.el.contains(active));
  }

  // ---------- Drawing ----------

  renderMarks() {
    for (const mark of this.marks) for (const box of mark.boxes) box.remove();
    this.marks = this.matches.map((m, index) => ({ index, match: m, boxes: [] }));
    this.stale = true;
    this.ui.schedule();
  }

  layout(hostRect) {
    const el = this.el;
    const r = el.getBoundingClientRect();
    const clip = this.shownIn(r);
    this.root.hidden = !clip;
    if (!clip) return;

    // Clip to the part of the editor the page shows: tall editors scroll inside
    // a box of the page (ChatGPT's prompt, an e-mail body) or the viewport.
    const v = this.visibleRect(r, clip);
    const top = v.top;
    const bottom = v.bottom;
    const cs = this.clip.style;
    cs.left = `${r.left - hostRect.left}px`;
    cs.top = `${r.top - hostRect.top}px`;
    cs.width = `${r.width}px`;
    cs.height = `${r.height}px`;
    // (Marks stay placed from the editor's corner; the clip-path hides what the page hides.)
    cs.clipPath = `inset(${Math.max(0, v.top - r.top)}px ${Math.max(0, r.right - v.right)}px ${Math.max(0, r.bottom - v.bottom)}px ${Math.max(0, v.left - r.left)}px)`;

    // The marks are placed from the editor's corner: while the words stay where
    // they are inside it (the page scrolls, nothing changes), they are left as
    // they are. The editor scrolling its own text moves them (no event tells it
    // inside a shadow tree), and so does what nothing tells about (a font that
    // loads, a style of the page): the first and last marks are measured to see.
    this.syncSegments();
    const scroll = `${el.scrollLeft},${el.scrollTop}`;
    if (scroll !== this.scroll || (!this.stale && this.marksMoved(r))) this.stale = true;
    this.scroll = scroll;
    for (const mark of this.takeStale() ? this.marks : []) {
      const rects = this.markRects(mark, r);
      while (mark.boxes.length < rects.length) {
        const box = document.createElement("div");
        box.className = `fc-mark fc-${mark.match.category}`;
        if (mark.active) box.classList.add("fc-active");
        this.clip.append(box);
        mark.boxes.push(box);
      }
      while (mark.boxes.length > rects.length) mark.boxes.pop().remove();
      rects.forEach((rect, i) => {
        const bs = mark.boxes[i].style;
        bs.left = `${rect.left}px`;
        bs.top = `${rect.top}px`;
        bs.width = `${rect.width}px`;
        bs.height = `${rect.height}px`;
      });
      mark.rects = rects;
    }

    const area = { left: v.left, top, right: v.right, bottom, height: bottom - top };
    this.placeBadge(area, hostRect, r.height < FC_BADGE_SIZE + 12, r);
  }

  // Where the words of a mark are drawn, from the corner of the editor (at `r`).
  markRects(mark, r) {
    const range = this.rangeAt(mark.match.offset, mark.match.length);
    if (!range) return [];
    return [...range.getClientRects()].filter((x) => x.width > 0)
      .map((x) => ({ left: x.left - r.left, top: x.top - r.top, width: x.width, height: x.height }));
  }

  // Whether the first or the last mark is no longer where it was drawn.
  marksMoved(r) {
    const drawn = this.marks.filter((mark) => mark.rects);
    return [...new Set([drawn[0], drawn.at(-1)])].some((mark) => {
      if (!mark) return false;
      const now = this.markRects(mark, r);
      return now.length !== mark.rects.length || now.some((b, i) => {
        const a = mark.rects[i];
        return Math.abs(a.left - b.left) > 0.5 || Math.abs(a.top - b.top) > 0.5 ||
          Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5;
      });
    });
  }

  matchAt(x, y) {
    const r = this.el.getBoundingClientRect();
    x -= r.left;
    y -= r.top;
    for (const mark of this.marks) {
      for (const rect of mark.rects ?? []) {
        if (x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height + 4) return mark.index;
      }
    }
    return -1;
  }

  anchorRect(index) {
    const m = this.matches[index];
    return m ? this.rangeFor(m.offset, m.length)?.getClientRects()[0] ?? null : null;
  }

  setActive(index, on) {
    const mark = this.marks.find((x) => x.index === index);
    if (!mark) return;
    mark.active = on;
    for (const box of mark.boxes) box.classList.toggle("fc-active", on);
  }

  // ---------- Editing ----------

  selectRange(offset, length) {
    const range = this.rangeFor(offset, length);
    if (!range) return null;
    this.el.focus();
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return range;
  }

  async replaceText(offset, length, replacement) {
    const before = this.readText();
    if (!this.selectRange(offset, length)) return;
    // Editors like those of chat and social sites keep their own copy of the
    // selection, updated on "selectionchange", which fires a moment later;
    // typing right away would insert at their stale caret ("ÇaCa").
    await new Promise((resolve) => setTimeout(resolve, 0));
    const range = this.selectRange(offset, length);
    if (!range) return;
    this.insertText(range, replacement);
    // Still only inserted, the old word after the new one: remove it.
    await new Promise((resolve) => setTimeout(resolve, 30));
    const after = this.readText();
    if (after === before.slice(0, offset) + replacement + before.slice(offset) &&
        this.selectRange(offset + replacement.length, length)) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (this.selectRange(offset + replacement.length, length)) document.execCommand("delete");
    }
  }

  insertText(range, replacement) {
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, replacement);
    } catch {
      ok = false;
    }
    if (!ok) {
      // Plain DOM edit for editors that refuse execCommand.
      range.deleteContents();
      range.insertNode(document.createTextNode(replacement));
      this.el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: replacement }));
    }
  }

  selectText(offset, length) {
    this.selectRange(offset, length);
  }
}
