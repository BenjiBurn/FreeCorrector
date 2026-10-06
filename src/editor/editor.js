/* global fcApi, fcGetSettings, fcParagraphLanguages, FcUi, FcTextField, fcLocalizePage, fcT, fcPlural, fcMatchLabel, fcUiLang */

fcLocalizePage();

// The "Correcteur" page: a large text area checked like any field on the web,
// plus the list of every problem found, with its recommended fix first.

(async () => {
  const DRAFT_KEY = "editorDraft";
  // Text sent by the right-click menu ("Check with FreeCorrector").
  const INCOMING_KEY = "editorIncoming";
  const LANG_NAME = { fr: fcT("langFr"), en: fcT("langEn") };

  const $ = (id) => document.getElementById(id);
  const textEl = $("text");
  const list = $("list");
  let settings = await fcGetSettings();

  // Restore the last text: it stays in this browser only.
  try {
    const stored = await fcApi.storage.local.get(DRAFT_KEY);
    if (typeof stored[DRAFT_KEY] === "string") textEl.value = stored[DRAFT_KEY];
  } catch {
    // No draft.
  }

  const ui = new FcUi();
  ui.sentenceRules = settings.sentenceRules;
  const field = new FcTextField(textEl, ui);
  ui.addField(field);
  const baseFieldChanged = ui.fieldChanged.bind(ui);
  ui.fieldChanged = (f) => {
    baseFieldChanged(f);
    if (f === field) renderList();
  };

  // ---------- Problem list ----------

  function el(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  const shown = (s) => (s === "" ? fcT("deleteSuggestion") : s);

  function renderList() {
    const matches = field.matches;
    const n = matches.length;
    $("total").textContent = String(n);
    $("total-label").textContent = fcT(n > 1 || (n === 0 && fcUiLang === "en") ? "edTotalMany" : "edTotalOne");
    $("n-spelling").textContent = String(matches.filter((m) => m.category === "spelling").length);
    $("n-grammar").textContent = String(matches.filter((m) => m.category === "grammar").length);
    $("n-style").textContent = String(matches.filter((m) => m.category === "style" || m.category === "typo").length);
    $("fix-all").disabled = !matches.some((m) => m.replacements.length);

    if (!n) {
      const empty = el("div", "empty", field.text.trim() ? fcT("edEmptyClean") : fcT("edEmptyNoText"));
      list.replaceChildren(empty);
      return;
    }

    list.replaceChildren(...matches.map((m, index) => {
      const item = el("div", `item ${m.category}`);
      item.title = fcT("edShowInText");

      const head = el("div", "item-head");
      head.append(el("span", "", fcMatchLabel(m)));
      item.append(head);

      const [best, ...others] = m.replacements.slice(0, 5);
      const fix = el("div", "item-fix");
      fix.append(el("span", "wrong", m.word));
      if (best !== undefined) {
        fix.append(el("span", "arrow", "→"));
        const btn = el("button", "best", shown(best));
        btn.type = "button";
        btn.title = fcT("edApplyBest");
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          field.apply(m, best);
        });
        fix.append(btn);
      }
      item.append(fix);

      item.append(el("div", "item-msg", m.message));

      if (others.length) {
        const row = el("div", "others");
        row.append(el("span", "others-label", fcT("edOthers")));
        for (const s of others) {
          const alt = el("button", "alt", shown(s));
          alt.type = "button";
          alt.addEventListener("click", (e) => {
            e.stopPropagation();
            field.apply(m, s);
          });
          row.append(alt);
        }
        item.append(row);
      }

      const actions = el("div", "item-actions");
      const ignore = el("button", "", fcT("ignore"));
      ignore.type = "button";
      ignore.addEventListener("click", (e) => {
        e.stopPropagation();
        ui.ignore(m);
      });
      actions.append(ignore);
      if (m.category === "spelling") {
        const add = el("button", "", fcT("addToDictionary"));
        add.type = "button";
        add.addEventListener("click", (e) => {
          e.stopPropagation();
          ui.addToDictionary(m);
        });
        actions.append(add);
      } else {
        const off = el("button", "", fcT("turnOffRule"));
        off.type = "button";
        off.title = fcT("turnOffRuleTitle");
        off.addEventListener("click", (e) => {
          e.stopPropagation();
          ui.disableRule(m);
        });
        actions.append(off);
      }
      item.append(actions);

      item.addEventListener("mouseenter", () => field.setActive(index, true));
      item.addEventListener("mouseleave", () => field.setActive(index, false));
      item.addEventListener("click", () => {
        textEl.focus();
        field.select(m);
      });
      return item;
    }));
  }

  // ---------- Text: stats, language, draft ----------

  let saveTimer = 0;
  function onTextChange() {
    const text = textEl.value;
    const words = (text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
    const chars = [...text].length;
    $("stats").textContent = `${fcPlural("edWords", words)} · ${fcPlural("edChars", chars)}`;

    const chip = $("language");
    const paragraphs = text.split("\n").filter((p) => p.trim());
    chip.hidden = !paragraphs.length;
    if (paragraphs.length) {
      if (settings.language !== "auto") {
        chip.textContent = LANG_NAME[settings.language];
      } else {
        const langs = new Set(fcParagraphLanguages(paragraphs));
        chip.textContent = langs.size > 1 ? fcT("edLangBoth") : fcT("edLangDetected", LANG_NAME[[...langs][0]]);
      }
    }

    $("saved").textContent = "";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await fcApi.storage.local.set({ [DRAFT_KEY]: textEl.value });
        $("saved").textContent = fcT("edSaved");
      } catch {
        // Not saved: nothing to tell.
      }
    }, 300);
  }
  textEl.addEventListener("input", onTextChange);
  onTextChange();
  renderList();

  // Replace the whole text through the editing API, so Ctrl+Z still works.
  function replaceAll(newText) {
    textEl.focus();
    textEl.select();
    const done = newText === ""
      ? document.execCommand("delete")
      : document.execCommand("insertText", false, newText);
    if (!done) {
      textEl.value = newText;
      textEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  $("fix-all").addEventListener("click", () => {
    let text = field.text;
    if (textEl.value !== text) return;
    let limit = Infinity;
    // From the end, so the offsets of the earlier problems stay valid.
    for (const m of [...field.matches].sort((a, b) => b.offset - a.offset)) {
      const best = m.replacements[0];
      if (best === undefined || m.offset + m.length > limit) continue;
      text = text.slice(0, m.offset) + best + text.slice(m.offset + m.length);
      limit = m.offset;
    }
    replaceAll(text);
  });

  $("copy").addEventListener("click", async () => {
    const button = $("copy");
    try {
      await navigator.clipboard.writeText(textEl.value);
      button.textContent = fcT("edCopied");
    } catch {
      textEl.select();
      document.execCommand("copy");
      button.textContent = fcT("edCopied");
    }
    setTimeout(() => { button.textContent = fcT("edCopy"); }, 1500);
  });

  // Ctrl+Z brings the text back.
  $("clear").addEventListener("click", () => replaceAll(""));

  // Text selected on a page and sent with "Check with FreeCorrector":
  // it replaces the draft (Ctrl+Z brings the draft back).
  async function takeIncoming() {
    let incoming;
    try {
      incoming = (await fcApi.storage.local.get(INCOMING_KEY))[INCOMING_KEY];
    } catch {
      return;
    }
    if (typeof incoming !== "string") return;
    await fcApi.storage.local.remove(INCOMING_KEY);
    if (incoming.trim()) replaceAll(incoming);
  }
  await takeIncoming();

  fcApi.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local") return;
    // Another selection sent while this page is open.
    if (changes[INCOMING_KEY]?.newValue !== undefined) takeIncoming();
    settings = await fcGetSettings();
    if (["dictionary", "disabledRules", "picky", "language", "englishDialect"].some((k) => k in changes)) {
      field.scheduleCheck(0);
      onTextChange();
    }
    if ("sentenceRules" in changes) {
      ui.sentenceRules = settings.sentenceRules;
      ui.refreshAll();
    }
  });

  textEl.focus();
})();
