/* global fcApi, fcGetSettings, fcSetSettings, fcLocalizePage, fcT, fcPlural, fcUiLang */

fcLocalizePage();

(async () => {
  const $ = (id) => document.getElementById(id);
  let settings = await fcGetSettings();
  const sortWords = (words) => words.sort((a, b) => a.localeCompare(b, fcUiLang));

  function chip(label, onRemove) {
    const li = document.createElement("li");
    li.append(label);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "×";
    btn.title = fcT("optRemove");
    btn.addEventListener("click", onRemove);
    li.append(btn);
    return li;
  }

  // A turned-off rule: its message, and the word it was turned off on.
  function ruleItem(rule) {
    const text = document.createElement("span");
    text.append(rule.message || rule.key);
    if (rule.word) {
      const word = document.createElement("span");
      word.className = "muted";
      word.textContent = fcUiLang === "fr" ? ` (« ${rule.word} »)` : ` (“${rule.word}”)`;
      text.append(word);
    }
    return chip(text, () => fcSetSettings({ disabledRules: settings.disabledRules.filter((r) => r.key !== rule.key) }));
  }

  function render() {
    $("enabled").checked = settings.enabled;
    $("picky").checked = settings.picky;
    $("sentence-rules").checked = settings.sentenceRules;
    $("language").value = settings.language;
    $("english-dialect").value = settings.englishDialect;

    $("words").replaceChildren(
      ...settings.dictionary.map((word) =>
        chip(word, () =>
          fcSetSettings({ dictionary: settings.dictionary.filter((w) => w !== word) })
        )
      )
    );
    $("no-words").hidden = settings.dictionary.length > 0;
    $("export-words").hidden = settings.dictionary.length === 0;

    $("rules").replaceChildren(...settings.disabledRules.map(ruleItem));
    $("no-rules").hidden = settings.disabledRules.length > 0;

    $("sites").replaceChildren(
      ...settings.disabledSites.map((site) =>
        chip(site, () =>
          fcSetSettings({ disabledSites: settings.disabledSites.filter((s) => s !== site) })
        )
      )
    );
    $("no-sites").hidden = settings.disabledSites.length > 0;
  }

  $("enabled").addEventListener("change", (e) => fcSetSettings({ enabled: e.target.checked }));
  $("picky").addEventListener("change", (e) => fcSetSettings({ picky: e.target.checked }));
  $("language").addEventListener("change", (e) => fcSetSettings({ language: e.target.value }));
  $("english-dialect").addEventListener("change", (e) => fcSetSettings({ englishDialect: e.target.value }));
  $("sentence-rules").addEventListener("change", (e) =>
    fcSetSettings({ sentenceRules: e.target.checked })
  );

  $("add-word").addEventListener("submit", (e) => {
    e.preventDefault();
    const word = $("new-word").value.trim();
    if (!word) return;
    $("new-word").value = "";
    if (settings.dictionary.some((w) => w.toLowerCase() === word.toLowerCase())) return;
    fcSetSettings({ dictionary: sortWords([...settings.dictionary, word]) });
  });

  // ---------- Dictionary file: one word per line ----------

  $("export-words").addEventListener("click", () => {
    const blob = new Blob([`${settings.dictionary.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fcT("optExportFile");
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  $("import-words").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const known = new Set(settings.dictionary.map((w) => w.toLowerCase()));
    const added = [];
    for (const line of (await file.text()).split(/\r?\n/)) {
      const word = line.trim();
      // A word or a short expression, not a stray line of some other file.
      if (!word || word.length > 60 || known.has(word.toLowerCase())) continue;
      known.add(word.toLowerCase());
      added.push(word);
    }
    if (added.length) await fcSetSettings({ dictionary: sortWords([...settings.dictionary, ...added]) });
    $("import-result").textContent = fcPlural("optImported", added.length);
  });

  fcApi.storage.onChanged.addListener(async (_changes, area) => {
    if (area !== "local") return;
    settings = await fcGetSettings();
    render();
  });

  render();
})();
