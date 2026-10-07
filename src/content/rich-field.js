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

class FcRichField extends FcFieldBase {
  constructor(el, ui) {
    super(el, ui);
    this.segments = []; // { node, start } for each text node, in text order
    this.marks = []; // { index, boxes: [div…] } for each drawn match
    this.clip = document.createElement("div");
    this.clip.className = "fc-clip";
    this.root.append(this.clip);

    // Editors often change the DOM without an input event (paste, undo,
    // formatting, other scripts): watch it.
    this.mutationObserver = new MutationObserver(() => {
      clearTimeout(this.mutationTimer);
      this.mutationTimer = setTimeout(() => this.poll(), 30);
    });
    this.mutationObserver.observe(el, { subtree: true, childList: true, characterData: true });
    this.listen(document, "selectionchange", this.onCaretMove);
    this.start();
  }

  destroy() {
    this.mutationObserver.disconnect();
    clearTimeout(this.mutationTimer);
    super.destroy();
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

  rangeFor(offset, length) {
    // Text nodes may have been replaced since the last read.
    if (this.segments.some((s) => !s.node.isConnected)) this.readText();
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
    this.ui.schedule();
  }

  layout(hostRect) {
    const r = this.el.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0;
    this.root.hidden = !visible;
    if (!visible) return;

    // Clip to the editor and to the viewport: tall editors (an e-mail body)
    // scroll inside the page.
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, window.innerHeight);
    const cs = this.clip.style;
    cs.left = `${r.left - hostRect.left}px`;
    cs.top = `${r.top - hostRect.top}px`;
    cs.width = `${r.width}px`;
    cs.height = `${r.height}px`;

    for (const mark of this.marks) {
      const range = this.rangeFor(mark.match.offset, mark.match.length);
      const rects = range ? [...range.getClientRects()].filter((x) => x.width > 0) : [];
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
        bs.left = `${rect.left - r.left}px`;
        bs.top = `${rect.top - r.top}px`;
        bs.width = `${rect.width}px`;
        bs.height = `${rect.height}px`;
      });
      mark.rects = rects;
    }

    const area = { left: r.left, top, right: r.right, bottom, height: bottom - top };
    this.placeBadge(area, hostRect, r.height < FC_BADGE_SIZE + 12);
  }

  matchAt(x, y) {
    for (const mark of this.marks) {
      for (const rect of mark.rects ?? []) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom + 4) return mark.index;
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
