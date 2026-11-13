/* global fcApi, fcT, fcLocalizePage, fcIsExtension, fcUiLang, fcGetSettings */

fcLocalizePage();

// The "Conjugueur" page: every tense of a French verb (Grammalecte's
// conjugation tables) or of an English one (en-conj.js), computed in
// conj-worker.js. ?v=faire (or ?v=se laver) opens a verb, ?l=en the English
// verbs (the default when the interface is in English).
// French tense names and forms stay French whatever the interface language,
// English ones English: they are what the page teaches. Beside the English
// ones, their French names for French speakers.
//
// On the website (lapigeonnerie.fr/freecorrector/conjugaison/<verbe>), the page is
// written by the server, verb included: <body data-conj-base="…/conjugaison/"
// data-verb="pouvoir" data-conj-lang="fr">. There, another verb is another page
// (its own address), the popular verbs and the language switch are the
// server's links, and this script adds the options in place.

(() => {
  const $ = (id) => document.getElementById(id);
  const input = $("q");
  const list = $("suggestions");
  const out = $("out");

  const SITE = document.body.dataset.conjBase ?? "";
  const PAGE_VERB = document.body.dataset.verb ?? "";
  const params = new URLSearchParams(location.search);
  // The language of the verbs: "fr" or "en".
  const STORE_KEY = "fc-conj-lang";
  const stored = (() => {
    try {
      return localStorage.getItem(STORE_KEY);
    } catch {
      return null;
    }
  })();
  let lang = SITE ? document.body.dataset.conjLang || "fr"
    : [params.get("l"), stored].find((x) => x === "fr" || x === "en") ?? (fcUiLang === "en" ? "en" : "fr");

  // The website in English, French verbs: the French names of the tenses,
  // translated beside them. English verbs: their French names, for French speakers.
  const SITE_GLOSS = SITE && window.FC_CONJ_GLOSS ? window.FC_CONJ_GLOSS : {};
  const gloss = (node, title, fr) => {
    const text = lang === "en" ? (fcUiLang === "fr" ? fr : "") : SITE_GLOSS[title];
    if (text) node.append(" ", el("span", "gloss", text));
    return node;
  };
  const POPULAR = {
    fr: ["être", "avoir", "aller", "faire", "pouvoir", "vouloir", "savoir", "venir", "dire", "prendre", "devoir", "voir", "mettre", "résoudre", "s’asseoir"],
    en: ["be", "have", "do", "go", "get", "make", "take", "see", "come", "think", "know", "say", "give", "buy", "can"],
  };
  const MAX_SUGGESTIONS = 8;
  // The page's options, kept from one verb to the next (except "pronominal").
  const OPTS = {
    fr: { neg: false, pro: false, tpsco: false, int: false, fem: false },
    en: { neg: false, int: false, contr: false },
  };
  const TOGGLES = {
    fr: [["neg", "cjNegation"], ["pro", "cjPronominal"], ["tpsco", "cjCompound"], ["int", "cjQuestion"], ["fem", "cjFeminine"]],
    en: [["neg", "cjNegation"], ["int", "cjQuestion"], ["contr", "cjContractions"]],
  };
  // American or British spelling (the options' English dialect).
  let dialect = "us";
  if (!SITE) fcGetSettings().then((s) => { dialect = s.englishDialect; }, () => {});

  // The two tool pages side by side, in the extension only.
  const tabs = document.querySelector(".tabs");
  if (tabs) tabs.hidden = !fcIsExtension();

  // ---------- The worker ----------

  const worker = new Worker(fcApi.runtime.getURL("conjugator/conj-worker.js"));
  const pending = new Map();
  let nextId = 1;
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    if (data.error) p.reject(new Error(data.error));
    else p.resolve(data.result);
  };
  worker.onerror = (event) => {
    console.error("[FreeCorrector] conj-worker.js:", event.message);
    for (const p of pending.values()) p.reject(new Error(event.message || "worker error"));
    pending.clear();
  };
  const ask = (type, payload = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, ...payload });
  });

  // ---------- Search ----------

  // Accents and case left out: "resoudre" finds "résoudre", "oeuvrer" "œuvrer".
  const plain = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae");
  // [plain form, verb] of each language, in dictionary order (French) or most common first (English).
  const lists = {};
  const verbsOf = (l) => (lists[l] ??= ask("verbs", { lang: l }).then((all) => {
    if (l === "fr") all.sort(new Intl.Collator("fr").compare);
    return all.map((v) => [plain(v), v]);
  }));
  let verbs = [];
  let known = verbsOf(lang).then((v) => { verbs = v; });

  // "se laver", "s’asseoir", "s'en aller": the verb and its pronominal form.
  // "to go": the verb.
  const PRONOUN = /^\s*(?:s['’]\s*en\s+|se\s+|s['’]\s*)/i;
  const TO = /^\s*to\s+/i;
  function parse(text) {
    if (lang === "en") return { pro: false, word: plain(text.replace(TO, "").trim()) };
    const pro = PRONOUN.exec(text);
    return { pro: !!pro, word: plain(text.slice(pro ? pro[0].length : 0).trim()) };
  }

  function find(text) {
    const { word } = parse(text);
    if (!word) return [];
    const exact = verbs.filter(([p]) => p === word).map(([, v]) => v);
    const starts = verbs.filter(([p]) => p !== word && p.startsWith(word)).map(([, v]) => v);
    // English: the most common first, already.
    return [...exact, ...starts].slice(0, MAX_SUGGESTIONS);
  }

  // The closest verbs to a word that is not one ("manjer" -> manger).
  function nearest(word, n = 3) {
    const w = plain(word);
    if (!w) return [];
    const scored = [];
    verbs.forEach(([p, v], rank) => {
      if (Math.abs(p.length - w.length) > 2) return;
      const d = distance(w, p);
      if (d <= 2) scored.push([d, rank, v]);
    });
    scored.sort((a, b) => a[0] - b[0] || (lang === "en" ? a[1] - b[1] : 0));
    const close = scored.slice(0, n).map(([, , v]) => v);
    return close.length ? close : find(w.slice(0, 3)).slice(0, n);
  }

  // Edit distance (insertions, deletions, substitutions); letters that sound
  // alike cost half: "manjer" is closer to "manger" than to "mander".
  const ALIKE = ["gj", "ckq", "sz", "iy"];
  const swap = (x, y) => (x === y ? 0 : ALIKE.some((g) => g.includes(x) && g.includes(y)) ? 0.5 : 1);
  function distance(a, b) {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++) {
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + swap(a[i - 1], b[j - 1]));
      }
      prev = row;
    }
    return prev[b.length];
  }

  let sel = 0;
  function closeList() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }

  input.addEventListener("input", () => {
    const found = find(input.value);
    sel = 0;
    list.replaceChildren(...found.map((v, i) => {
      const b = el("button", i === 0 ? "sel" : "", v);
      b.type = "button";
      b.setAttribute("role", "option");
      b.tabIndex = -1;
      // Before the field loses focus.
      b.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pick(v);
      });
      return b;
    }));
    list.hidden = !found.length;
    input.setAttribute("aria-expanded", String(found.length > 0));
  });

  input.addEventListener("keydown", (e) => {
    const items = list.hidden ? [] : [...list.children];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!items.length) return;
      e.preventDefault();
      items[sel].classList.remove("sel");
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[sel].classList.add("sel");
    } else if (e.key === "Enter") {
      e.preventDefault();
      const v = items[sel]?.textContent ?? find(input.value)[0];
      if (v) pick(v);
      // English: "went", "stopped" are forms of a verb, which the worker finds.
      else if (input.value.trim() && lang === "en") pick(input.value.trim());
      else if (input.value.trim()) showUnknown(input.value.trim());
    } else if (e.key === "Escape") {
      closeList();
    }
  });
  input.addEventListener("blur", () => setTimeout(closeList, 100));

  function pick(v) {
    closeList();
    show(v, parse(input.value).pro || undefined);
  }

  // ---------- The language of the verbs ----------

  const switcher = document.querySelector(".verb-langs");
  function drawPopular() {
    const box = $("popular");
    // The website writes its own links.
    if (SITE) return;
    box.querySelectorAll(".chip").forEach((c) => c.remove());
    for (const v of POPULAR[lang]) {
      const b = el("button", "chip", v);
      b.type = "button";
      b.addEventListener("click", () => {
        show(v.replace(PRONOUN, ""), parse(v).pro || undefined);
      });
      box.append(b);
    }
  }

  function drawLang() {
    document.documentElement.dataset.verbs = lang;
    const intro = document.querySelector("[data-i18n='cjIntro']");
    if (!SITE) {
      if (intro) intro.textContent = fcT(lang === "en" ? "cjIntroEn" : "cjIntro");
      input.placeholder = fcT(lang === "en" ? "cjPlaceholderEn" : "cjPlaceholder");
    }
    if (switcher && !SITE) {
      switcher.hidden = false;
      for (const b of switcher.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    }
    drawPopular();
  }

  async function setLang(l, verb) {
    if (l === lang && !verb) return;
    lang = l;
    try {
      localStorage.setItem(STORE_KEY, l);
    } catch {
      // Private browsing: the choice lasts as long as the page.
    }
    current = null;
    known = verbsOf(lang).then((v) => { verbs = v; });
    drawLang();
    input.value = "";
    await known;
    show(verb ?? (lang === "en" ? "be" : "faire"));
  }

  if (switcher && !SITE) {
    for (const b of switcher.querySelectorAll("button")) b.addEventListener("click", () => setLang(b.dataset.lang));
  }

  // ---------- A verb ----------

  let current = null; // the worker's answer for the verb shown
  let shownId = 0;

  // `pro`: true for "se laver", false to leave the pronominal form out,
  // undefined for the verb's usual form ("évanouir" is shown as "s’évanouir").
  async function show(verb, pro) {
    const id = ++shownId;
    const l = lang;
    let answer;
    try {
      await known;
      if (l === "en") {
        answer = await ask("table", { lang: "en", verb, ...OPTS.en, dialect });
        // The website: another verb is another page.
        if (answer && SITE && answer.verb !== PAGE_VERB) {
          location.href = SITE + encodeURIComponent(answer.verb);
          return;
        }
      } else {
        // "resoudre", "Résoudre": the verb as the tables spell it.
        verb = verbs.find(([p]) => p === plain(verb))?.[1] ?? verb;
        if (SITE && plain(verb) !== plain(PAGE_VERB) && verbs.some(([, x]) => x === verb)) {
          location.href = SITE + encodeURIComponent(verb);
          return;
        }
        answer = await ask("table", { lang: "fr", verb, ...OPTS.fr, pro: pro ?? false });
        // "s’évanouir", "se souvenir": only used in the pronominal form.
        if (answer && pro === undefined && answer.pronominable === 1) answer = await ask("table", { lang: "fr", verb, ...OPTS.fr, pro: true });
      }
    } catch (err) {
      console.error("[FreeCorrector]", err);
      if (id === shownId) out.replaceChildren(el("div", "empty muted", fcT("cjFailed")));
      return;
    }
    if (id !== shownId || l !== lang) return;
    if (!answer) {
      showUnknown(verb);
      return;
    }
    current = answer;
    if (l === "fr") {
      OPTS.fr.pro = answer.pro;
      input.value = answer.name;
    } else {
      input.value = answer.verb;
    }
    remember(l === "en" ? answer.verb : answer.name);
    render();
  }

  // The verb in the address, so a reload or a bookmark comes back to it.
  function remember(name) {
    // The website's address and title are the server's.
    if (SITE) return;
    try {
      const url = new URL(location.href);
      url.searchParams.set("v", name);
      url.searchParams.set("l", lang);
      history.replaceState(null, "", url);
    } catch {
      // Not on this page's address: nothing to keep.
    }
    document.title = `${name} · ${fcT("cjTitle")}`;
  }

  async function showUnknown(text) {
    current = null;
    const id = shownId;
    const box = el("div", "empty muted", fcT(lang === "en" ? "cjUnknownEn" : "cjUnknown", text));
    const close = nearest(parse(text).word);
    if (close.length) {
      box.append(" ", fcT("cjDidYouMean"), " ");
      for (const v of close) {
        const b = el("button", "chip", v);
        b.type = "button";
        b.addEventListener("click", () => show(v, parse(text).pro || undefined));
        box.append(b);
      }
    }
    out.replaceChildren(box);
    // A verb of the other language: "go" typed among the French verbs.
    if (SITE) return;
    const other = lang === "en" ? "fr" : "en";
    let found = null;
    try {
      if (other === "en") found = await ask("lookup", { lang: "en", verb: text });
      else {
        const word = plain(text.replace(PRONOUN, "").trim());
        found = (await verbsOf("fr")).find(([p]) => p === word)?.[1] ?? null;
      }
    } catch {
      return;
    }
    if (!found || id !== shownId || current) return;
    const line = el("p", "", fcT(other === "en" ? "cjOtherLangEn" : "cjOtherLangFr"));
    const b = el("button", "chip", found);
    b.type = "button";
    b.addEventListener("click", () => setLang(other, found));
    line.append(" ", b);
    box.append(line);
  }

  function el(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // One French form, its ending in colour: what follows the stem it shares with the
  // infinitive ("nous mang|eons"). For the regular groups only (`stem` empty
  // otherwise): on irregular verbs the stem itself changes (faire -> ferai).
  function form(text, stem) {
    const li = el("li");
    if (!text) {
      li.append(el("span", "none", "—"));
      return li;
    }
    const words = text.split(" ");
    const elided = /^(?:[jmtsnl]’)+/;
    const i = stem ? words.findIndex((w) => w.replace(elided, "").startsWith(stem.slice(0, -1))) : -1;
    if (i < 0) {
      li.textContent = text;
      return li;
    }
    const word = words[i];
    const bare = word.replace(elided, "");
    const pre = word.slice(0, word.length - bare.length);
    // "mange-t-il": the ending stops at the hyphen.
    const dash = bare.indexOf("-");
    const core = dash > 0 ? bare.slice(0, dash) : bare;
    let k = 0;
    while (k < stem.length && (core[k] === stem[k] || (core[k] === "ç" && stem[k] === "c"))) k++;
    // "mangeais", "mangeons": that e only keeps the g soft, it belongs to the stem.
    if (k === stem.length && stem.endsWith("g") && core[k] === "e" && /^[aoâ]/.test(core.slice(k + 1))) k++;
    li.append(
      [...words.slice(0, i), pre + core.slice(0, k)].join(" "),
      el("span", "end", core.slice(k)),
      [bare.slice(core.length), ...words.slice(i + 1)].join(" "),
    );
    return li;
  }

  // One English form: [before, ending, after] (the ending in colour) or text.
  function enForm(row) {
    const li = el("li");
    if (Array.isArray(row)) li.append(row[0], el("span", "end", row[1]), row[2]);
    else li.textContent = row;
    return li;
  }
  const rowText = (row) => (Array.isArray(row) ? row.join("") : row);

  async function copy(button, text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = el("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    button.textContent = fcT("cjCopied");
    setTimeout(() => { button.textContent = fcT("cjCopy"); }, 1500);
  }

  // A card: its title, the copy button, its rows.
  function makeCard(title, fr, rows, draw) {
    if (!title || !rows.length) return null;
    const box = el("div", "card");
    const h = gloss(el("h3", "", title), title, fr);
    const button = el("button", "", fcT("cjCopy"));
    button.type = "button";
    button.title = fcT("cjCopyTitle");
    button.addEventListener("click", () => copy(button, rows.map(rowText).join("\n")));
    h.append(button);
    const ol = el("ol");
    ol.append(...rows.map(draw));
    box.append(h, ol);
    return box;
  }
  const mood = (title, fr, ...cards) => {
    const shown = cards.filter(Boolean);
    if (!shown.length) return [];
    const grid = el("div", "grid");
    grid.append(...shown);
    return [gloss(el("div", "mood", title), title, fr), grid];
  };

  function options() {
    const box = el("div", "options");
    const opts = OPTS[lang];
    for (const [key, label] of TOGGLES[lang]) {
      const b = el("button", "toggle", fcT(label));
      b.type = "button";
      b.setAttribute("aria-pressed", String(opts[key]));
      if (key === "pro" && current.pronominable < 0) {
        b.disabled = true;
        b.title = fcT("cjNotPronominal");
      }
      b.addEventListener("click", () => {
        opts[key] = !opts[key];
        show(current.verb, opts.pro);
      });
      box.append(b);
    }
    return box;
  }

  function render() {
    if (lang === "en") renderEnglish();
    else renderFrench();
  }

  function renderEnglish() {
    const v = current;
    const head = el("div", "head");
    head.append(el("h2", "", v.name));
    head.append(el("span", "tag", fcT(v.kind === "irregular" ? "cjIrregular" : v.kind === "modal" ? "cjModal" : "cjRegular")));
    // go – went – gone: what one learns by heart.
    if (v.parts) head.append(el("span", "parts", [v.parts.base, v.parts.past, v.parts.pp].join(" – ")));
    const notes = [];
    const PART = { past: "cjPartPast", pp: "cjPartPp", ing: "cjPartIng" };
    const byPart = new Map();
    for (const x of v.variants) {
      const text = x.form + (x.dialect ? ` ${fcT(x.dialect === "gb" ? "cjGb" : "cjUs")}` : "");
      byPart.set(x.part, [...(byPart.get(x.part) ?? []), text]);
    }
    const colon = fcUiLang === "fr" ? " : " : ": ";
    for (const [part, forms] of byPart) notes.push(fcT(PART[part]) + colon + fcT("cjAlso", forms.join(", ")));
    if (v.sense) notes.push(fcT(`cjSense${v.sense[0].toUpperCase()}${v.sense.slice(1)}`));
    const parts = [head, options()];
    if (notes.length) {
      const ul = el("ul", "notes");
      ul.append(...notes.map((n) => el("li", "", n)));
      parts.splice(1, 0, ul);
    }
    for (const m of v.moods) {
      parts.push(...mood(m.title, m.gloss, ...m.cards.map((c) => makeCard(c.title, c.gloss, c.rows, enForm))));
    }
    out.replaceChildren(...parts);
  }

  function renderFrench() {
    const v = current;
    const t = v.table;
    const stem = ["1", "2"].includes(v.group) ? v.verb.replace(/(er|ir)$/, "") : "";

    const card = (title, keys) => makeCard(title, "", keys.map((k) => t[k]).filter((x) => x), (r) => form(r, stem));
    const six = (p) => [1, 2, 3, 4, 5, 6].map((n) => p + n);
    const lower = (s) => (s ? s[0].toLowerCase() + s.slice(1) : "");

    const head = el("div", "head");
    head.append(el("h2", "", t.infi.replace(/\s*…\s*\?$/, "")));
    if (v.groupLabel) head.append(el("span", "tag", v.groupLabel));
    for (const x of v.info) head.append(el("span", "tag", x));

    out.replaceChildren(
      head,
      options(),
      ...mood("Indicatif", "",
        card(t.t_ipre, six("ipre")), card(t.t_iimp, six("iimp")), card(t.t_ipsi, six("ipsi")), card(t.t_ifut, six("ifut"))),
      ...mood("Conditionnel et subjonctif", "",
        card(`Conditionnel ${lower(t.t_conda)}`, six("conda")),
        t.t_condb ? card(`Conditionnel ${lower(t.t_condb)}`, six("condb")) : null,
        card(t.t_spre && `Subjonctif ${lower(t.t_spre)}`, six("spre")),
        card(t.t_simp && `Subjonctif ${lower(t.t_simp)}`, six("simp"))),
      ...mood("Impératif, participes", "",
        card(t.t_impe && `Impératif ${lower(t.t_impe)}`, ["impe1", "impe2", "impe3"]),
        card("Participe présent", ["ppre"]),
        card("Participe passé", ["ppas1", "ppas2", "ppas3", "ppas4"])),
    );
  }

  // ---------- Start ----------

  drawLang();
  const asked = SITE ? PAGE_VERB : params.get("v")?.trim();
  if (asked && lang === "en") show(asked);
  else if (asked) show(asked.replace(PRONOUN, ""), parse(asked).pro || undefined);
  else if (!SITE) show(lang === "en" ? "be" : "faire");
})();
