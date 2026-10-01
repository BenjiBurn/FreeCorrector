/* global fcApi, fcGetSettings, fcSetSettings */

(async () => {
  const $ = (id) => document.getElementById(id);
  let settings = await fcGetSettings();

  function chip(label, onRemove) {
    const li = document.createElement("li");
    li.append(label);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "×";
    btn.title = "Retirer";
    btn.addEventListener("click", onRemove);
    li.append(btn);
    return li;
  }

  function render() {
    $("enabled").checked = settings.enabled;
    $("picky").checked = settings.picky;
    $("sentence-rules").checked = settings.sentenceRules;
    $("language").value = settings.language;

    $("words").replaceChildren(
      ...settings.dictionary.map((word) =>
        chip(word, () =>
          fcSetSettings({ dictionary: settings.dictionary.filter((w) => w !== word) })
        )
      )
    );
    $("no-words").hidden = settings.dictionary.length > 0;

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
  $("sentence-rules").addEventListener("change", (e) =>
    fcSetSettings({ sentenceRules: e.target.checked })
  );

  $("add-word").addEventListener("submit", (e) => {
    e.preventDefault();
    const word = $("new-word").value.trim();
    if (!word) return;
    $("new-word").value = "";
    if (settings.dictionary.some((w) => w.toLowerCase() === word.toLowerCase())) return;
    fcSetSettings({
      dictionary: [...settings.dictionary, word].sort((a, b) => a.localeCompare(b, "fr")),
    });
  });

  fcApi.storage.onChanged.addListener(async (_changes, area) => {
    if (area !== "local") return;
    settings = await fcGetSettings();
    render();
  });

  render();
})();
