// The online conjugator's data (lapigeonnerie.fr/freecorrector/conjugaison/<verbe>):
// every verb the conjugation engine knows, computed once here and loaded into the
// site's MySQL table fc_verbs. The site's page only reads that table.
//
//   node scripts/conjugations.js [out.sql]     (default: dist/conjugaison/fc_verbs.sql)
//
// Per verb: its tables as the extension's conjugator shows them (the page's
// script redraws the same thing, then adds the options: negation, pronominal…),
// the classic traps that can be read off those tables (« mangé ou manger »,
// « je ferai ou je ferais », « il a fini » without t…), its model (the verbs
// conjugated alike) and a rank: how often it is used, counted on the French
// texts of the tests. Run again when the engine changes.

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL, fileURLToPath } = require("url");

const ROOT = path.join(__dirname, "..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "dist", "conjugaison", "fc_verbs.sql"));

// ---------- The engine, as in the extension (conjugator/conj-worker.js) ----------

const workerUrl = pathToFileURL(path.join(ROOT, "src", "conjugator", "conj-worker.js")).href;
const ctx = {
  console: { ...console, log() {} },
  URL, Map, Set,
  location: { href: workerUrl },
  XMLHttpRequest: class {
    open(_method, url) { this.url = url; }
    overrideMimeType() {}
    send() {
      this.responseText = fs.readFileSync(fileURLToPath(this.url), "utf8");
      this.status = 200;
    }
  },
  importScripts: (...urls) => {
    for (const u of urls) {
      const file = fileURLToPath(new URL(u, workerUrl));
      vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
    }
  },
};
ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(fileURLToPath(workerUrl), "utf8"), ctx);
const engine = (code) => vm.runInContext(code, ctx);
const table = (verb, pro) => engine(`table(${JSON.stringify({ verb, pro })})`);
const verbs = engine("verbs()");
const models = engine("JSON.stringify(Object.fromEntries(Object.entries(conj._dVerb).map(([v, x]) => [v, x[1]])))");
const modelOf = JSON.parse(models);

// ---------- Helpers ----------

// The conjugated word of a row: "je peux" -> peux, "j’allais" -> allais, "il s’assied" -> assied.
const word = (row) => (row ? row.split(" ").pop().replace(/^(?:[jmtsnl]’)+/, "") : "");
const plain = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae");
const lower = (s) => (s ? s[0].toLowerCase() + s.slice(1) : "");

// One form, its ending apart (what follows the stem it shares with the
// infinitive): the same cut as the extension's conjugator (conjugator.js, form()).
// Gives [before, ending, after], or the text alone when there is no cut.
function cut(text, stem) {
  if (!text) return "";
  const words = text.split(" ");
  const elided = /^(?:[jmtsnl]’)+/;
  const i = stem ? words.findIndex((w) => w.replace(elided, "").startsWith(stem.slice(0, -1))) : -1;
  if (i < 0) return text;
  const w = words[i];
  const bare = w.replace(elided, "");
  const pre = w.slice(0, w.length - bare.length);
  const dash = bare.indexOf("-");
  const core = dash > 0 ? bare.slice(0, dash) : bare;
  let k = 0;
  while (k < stem.length && (core[k] === stem[k] || (core[k] === "ç" && stem[k] === "c"))) k++;
  if (k === stem.length && stem.endsWith("g") && core[k] === "e" && /^[aoâ]/.test(core.slice(k + 1))) k++;
  return [
    [...words.slice(0, i), pre + core.slice(0, k)].join(" "),
    core.slice(k),
    [bare.slice(core.length), ...words.slice(i + 1)].join(" "),
  ];
}

// The cards of the page, in the extension's order (conjugator.js, render()).
function cards(v) {
  const t = v.table;
  const stem = ["1", "2"].includes(v.group) ? v.verb.replace(/(er|ir)$/, "") : "";
  const six = (p) => [1, 2, 3, 4, 5, 6].map((n) => p + n);
  const card = (mood, key, title, keys) => {
    const rows = keys.map((k) => t[k]).filter((x) => x);
    return title && rows.length ? { mood, key, title, rows: rows.map((r) => cut(r, stem)) } : null;
  };
  return [
    card("Indicatif", "ipre", t.t_ipre, six("ipre")),
    card("Indicatif", "iimp", t.t_iimp, six("iimp")),
    card("Indicatif", "ipsi", t.t_ipsi, six("ipsi")),
    card("Indicatif", "ifut", t.t_ifut, six("ifut")),
    card("Conditionnel et subjonctif", "conda", `Conditionnel ${lower(t.t_conda)}`, six("conda")),
    t.t_condb ? card("Conditionnel et subjonctif", "condb", `Conditionnel ${lower(t.t_condb)}`, six("condb")) : null,
    card("Conditionnel et subjonctif", "spre", t.t_spre && `Subjonctif ${lower(t.t_spre)}`, six("spre")),
    card("Conditionnel et subjonctif", "simp", t.t_simp && `Subjonctif ${lower(t.t_simp)}`, six("simp")),
    card("Impératif, participes", "impe", t.t_impe && `Impératif ${lower(t.t_impe)}`, ["impe1", "impe2", "impe3"]),
    card("Impératif, participes", "ppre", "Participe présent", ["ppre"]),
    card("Impératif, participes", "ppas", "Participe passé", ["ppas1", "ppas2", "ppas3", "ppas4"]),
  ].filter(Boolean);
}

// The usual future, from the infinitive: manger -> mangerai, finir -> finirai, prendre -> prendrai.
function regularFuture(infi) {
  if (/re$/.test(infi)) return infi.slice(0, -1) + "ai";
  if (/(er|ir)$/.test(infi)) return infi + "ai";
  return "";
}

const TRAP_ORDER = ["ppas_i", "ppas_silent", "ppas_infi", "subj", "nous_ions", "pres_sg", "pres_es", "impe", "fut_stem", "stem", "cer_ger", "fut_cond", "psi_imp", "simp"];

// The traps of one verb, read off its own forms: only what is true of this verb.
// The page words them (in French or in English) from `k` and the forms given.
function traps(v) {
  const t = v.table;
  const infi = v.verb;
  const g = v.group;
  const out = [];
  const add = (k, forms) => out.push({ k, ...forms });
  const W = (key) => word(t[key]);

  // "j’ai mangé" / "je vais manger" / "vous mangez": same sound, three spellings.
  if (g === "1" && t.ppas1) add("ppas_infi", { ppas: t.ppas1, infi, ipre5: t.ipre5 });
  // "il a fini", no t: the participle is not "il finit".
  if (/i$/.test(W("ppas1")) && (W("ipre3") === W("ppas1") + "t" || W("ipsi3") === W("ppas1") + "t")) {
    add("ppas_i", { ppas: t.ppas1, fem: t.ppas2, verb3: W("ipre3") === W("ppas1") + "t" ? t.ipre3 : t.ipsi3 });
  }
  // "pris", "dit", "fait": a silent letter, heard in the feminine.
  if (/[st]$/.test(W("ppas1")) && t.ppas2 === t.ppas1 + "e") add("ppas_silent", { ppas: t.ppas1, fem: t.ppas2 });
  // "je ferai" (future) or "je ferais" (conditional).
  if (t.ifut1 && W("ifut1") + "s" === W("conda1")) add("fut_cond", { fut: t.ifut1, cond: t.conda1, fut4: t.ifut4, cond4: t.conda4 });
  // "je peux, tu peux, il peut": the third person ends differently.
  if (t.ipre1 && W("ipre1") === W("ipre2") && W("ipre3") !== W("ipre1")) add("pres_sg", { p1: t.ipre1, p2: t.ipre2, p3: t.ipre3 });
  // "je mange, tu manges": the s of the second person.
  else if (t.ipre1 && W("ipre1") === W("ipre3") && W("ipre2") === W("ipre1") + "s") add("pres_es", { p1: t.ipre1, p2: t.ipre2, p3: t.ipre3 });
  // The imperative without s: "mange !", "va !", but "manges-en", "vas-y".
  if (t.impe1 && W("impe1") !== W("ipre2") && W("impe1") + "s" === W("ipre2")) add("impe", { impe: t.impe1, p2: t.ipre2, back: /[ea]$/.test(W("impe1")) });
  // "que je voie" / "je vois": the subjunctive heard like the indicative.
  if (t.spre1 && /e$/.test(W("spre1")) && /[sxt]$/.test(W("ipre1")) && W("spre1").slice(0, -1) === W("ipre1").slice(0, -1)) {
    add("subj", { s1: t.spre1, i1: t.ipre1 });
  }
  // "nous voyions" (imperfect, subjunctive) / "nous voyons" (present): heard alike after y or i.
  if (t.ipre4 && /[yi]ons$/.test(W("ipre4")) && W("ipre4").replace(/ons$/, "ions") === W("iimp4") && W("iimp4") === W("spre4")) {
    add("nous_ions", { imp4: t.iimp4, pre4: t.ipre4 });
  }
  // "je mangeai" (simple past) or "je mangeais" (imperfect).
  if (g === "1" && W("ipsi1") + "s" === W("iimp1")) add("psi_imp", { psi: t.ipsi1, imp: t.iimp1 });
  // "il fut" / "qu’il fût": the circumflex of the imperfect subjunctive.
  if (t.simp3 && W("simp3") !== W("ipsi3") && plain(W("simp3")) === plain(W("ipsi3"))) add("simp", { psi: t.ipsi3, simp: t.simp3 });
  // "nous mangeons", "nous commençons": the e and the cedilla.
  if (/[cg]er$/.test(infi) && t.ipre4) add("cer_ger", { p4: t.ipre4, imp: t.iimp1, soft: /cer$/.test(infi) ? "ç" : "ge" });
  // "j’appelle / nous appelons", "j’achète / nous achetons": the stem changes.
  if (g === "1" && t.ipre1 && t.ipre4) {
    const stem = infi.replace(/er$/, "");
    if (W("ipre1") !== stem + "e" && W("ipre4") === stem + "ons") add("stem", { p1: t.ipre1, p4: t.ipre4 });
  }
  // An irregular future: "je ferai", "je courrai" (two r), "j’enverrai".
  const fut = W("ifut1");
  if (fut && regularFuture(infi) && fut !== regularFuture(infi)) {
    add("fut_stem", { fut: t.ifut1, rr: /rr/.test(fut) && !/rr/.test(infi) });
  }
  // The most useful first: the page shows a few.
  return out.sort((a, b) => TRAP_ORDER.indexOf(a.k) - TRAP_ORDER.indexOf(b.k));
}

// ---------- How often each verb is used ----------

// The frequency list of the checker (src/data/fr-freq.txt: 50,000 words of
// everyday French), form by form. A form counts for the verbs it belongs to
// ("suis": être and suivre, shared), and only for its share of verb meanings in
// the dictionary: "plus" is mostly an adverb, not "plaire"; "tu" a pronoun, not "taire".
function counts(all) {
  const owners = new Map();
  for (const v of all) {
    for (const [key, row] of Object.entries(v.table)) {
      if (key.startsWith("t_") || !row) continue;
      const w = word(row).toLowerCase();
      if (!owners.has(w)) owners.set(w, new Set());
      owners.get(w).add(v.verb);
    }
  }
  const freq = new Map();
  for (const line of fs.readFileSync(path.join(ROOT, "src", "data", "fr-freq.txt"), "utf8").split("\n")) {
    const [w, n] = line.trim().split(/\s+/);
    if (w && n) freq.set(w.replace(/'/g, "’"), Number(n));
  }
  const morph = checkerMorph();
  const n = new Map();
  for (const [w, who] of owners) {
    const f = freq.get(w);
    if (!f) continue;
    const m = morph(w);
    // A word that is also something else ("tu", "plus", "chose") mostly is that.
    const verbal = m.length ? m.filter((x) => /:V/.test(x)).length / m.length : 1;
    const share = verbal < 1 ? verbal / 50 : 1;
    for (const v of who) n.set(v, (n.get(v) ?? 0) + (f * share) / who.size);
  }
  return n;
}

// The checker's dictionary (Grammalecte's spell checker), for the meanings of a word.
function checkerMorph() {
  const url = pathToFileURL(path.join(ROOT, "src", "engine", "grammalecte-worker.js")).href;
  const c = {
    console: { ...console, log() {} },
    URL, Map, Set, WebAssembly, TextDecoder, TextEncoder,
    location: { href: url },
    postMessage() {},
    XMLHttpRequest: ctx.XMLHttpRequest,
    importScripts: (...urls) => {
      for (const u of urls) {
        const file = fileURLToPath(new URL(u, url));
        vm.runInContext(fs.readFileSync(file, "utf8"), c, { filename: file });
      }
    },
  };
  c.self = c;
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(fileURLToPath(url), "utf8"), c);
  c.onmessage({ data: { id: 1, type: "init", options: {} } });
  return (w) => vm.runInContext(`spellChecker.getMorph(${JSON.stringify(w)})`, c);
}

// ---------- SQL ----------

const sql = (s) => (s === null ? "NULL" : `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`);

function main() {
  const all = [];
  for (const verb of verbs) {
    let v = table(verb, false);
    if (!v) continue;
    // "s’évanouir": only used in the pronominal form, shown that way.
    if (v.pronominable === 1) v = table(verb, true) ?? v;
    all.push(v);
  }
  const used = counts(all);
  const collator = new Intl.Collator("fr");
  const ranked = [...all].sort((a, b) => (used.get(b.verb) ?? 0) - (used.get(a.verb) ?? 0) || collator.compare(a.verb, b.verb));
  const rank = new Map(ranked.map((v, i) => [v.verb, i + 1]));

  const lines = [
    "-- FreeCorrector — le conjugueur en ligne : tous les verbes, calculés par",
    "-- scripts/conjugations.js (dépôt FreeCorrector). Généré, ne pas modifier à la main :",
    "-- relancer le script, puis recharger ce fichier (il remplace la table).",
    "",
    "DROP TABLE IF EXISTS fc_verbs_new;",
    "CREATE TABLE fc_verbs_new (",
    "  verb        VARCHAR(60)       NOT NULL,              -- l’infinitif, tel que dans l’adresse",
    "  plain       VARCHAR(60)       NOT NULL,              -- sans accents ni majuscules (« resoudre »)",
    "  name        VARCHAR(80)       NOT NULL,              -- tel qu’affiché (« s’évanouir »)",
    "  grp         CHAR(1)           NOT NULL,              -- groupe : 1, 2, 3",
    "  model       SMALLINT UNSIGNED NOT NULL,              -- modèle de conjugaison (mêmes formes)",
    "  rank_n      SMALLINT UNSIGNED NOT NULL,              -- 1 = le plus courant",
    "  pronominable TINYINT          NOT NULL,              -- 1 : pronominal seulement, 2 : les deux, 0 : non",
    "  head        TEXT              NOT NULL,              -- JSON : groupe et étiquettes",
    "  cards       MEDIUMTEXT        NOT NULL,              -- JSON : les tableaux, terminaisons à part",
    "  traps       TEXT              NOT NULL,              -- JSON : les pièges de ce verbe",
    "  PRIMARY KEY (verb),",
    "  KEY idx_plain (plain),",
    "  KEY idx_rank (rank_n),",
    "  KEY idx_model (model, rank_n)",
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;",
    "",
  ];
  const rows = all.map((v) => {
    const head = { group: v.groupLabel, info: v.info, pronominable: v.pronominable };
    return `(${[
      sql(v.verb), sql(plain(v.verb)), sql(v.name), sql(v.group), modelOf[v.verb] ?? 0, rank.get(v.verb),
      v.pronominable, sql(JSON.stringify(head)), sql(JSON.stringify(cards(v))), sql(JSON.stringify(traps(v))),
    ].join(", ")})`;
  });
  for (let i = 0; i < rows.length; i += 200) {
    lines.push("INSERT INTO fc_verbs_new (verb, plain, name, grp, model, rank_n, pronominable, head, cards, traps) VALUES");
    lines.push(rows.slice(i, i + 200).join(",\n") + ";");
  }
  lines.push(
    "",
    "-- Bascule d’un coup : la page n’est jamais devant une table à moitié remplie.",
    "CREATE TABLE IF NOT EXISTS fc_verbs LIKE fc_verbs_new;",
    "RENAME TABLE fc_verbs TO fc_verbs_old, fc_verbs_new TO fc_verbs;",
    "DROP TABLE fc_verbs_old;",
    "",
  );
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join("\n"));
  const withTraps = all.filter((v) => traps(v).length).length;
  console.log(`${all.length} verbes, ${withTraps} avec des pièges, ${used.size} vus dans les textes -> ${path.relative(process.cwd(), OUT)}`);
  console.log("Les 30 plus courants :", ranked.slice(0, 30).map((v) => v.verb).join(", "));
}

main();
