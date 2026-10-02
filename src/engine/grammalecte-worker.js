// Runs the Grammalecte engine off the main thread. Grammalecte loads its data
// with synchronous XHR, which is only acceptable inside a worker.
//
// Messages in:  { id, type: "init", options } | { id, type: "check", text }
// Messages out: { id, result } | { id, error }

"use strict";

const VENDOR = "../vendor/grammalecte/";

importScripts(
  VENDOR + "graphspell/helpers.js",
  VENDOR + "graphspell/str_transform.js",
  VENDOR + "graphspell/char_player.js",
  VENDOR + "graphspell/lexgraph_fr.js",
  VENDOR + "graphspell/ibdawg.js",
  VENDOR + "graphspell/spellchecker.js",
  VENDOR + "text.js",
  VENDOR + "graphspell/tokenizer.js",
  VENDOR + "fr/conj.js",
  VENDOR + "fr/mfsp.js",
  VENDOR + "fr/phonet.js",
  VENDOR + "fr/cregex.js",
  VENDOR + "fr/gc_options.js",
  VENDOR + "fr/gc_functions.js",
  VENDOR + "fr/gc_rules.js",
  VENDOR + "fr/gc_rules_graph.js",
  VENDOR + "fr/gc_engine.js",
  "suggestions.js",
  "rules.js",
  "sentence-rules.js"
);

/* global helpers, conj, mfsp, phonet, gc_engine, fcRankSuggestions, fcClearRankingCache,
   fcIsCascadeError, fcHasErrorAt, fcSentenceRules, fcLoadFrequencies, fcSpellSuggestions,
   fcCustomRules, fcIsTypographicOnly, fcLooksLikeProperNoun, fcUrlRanges */

// A wider pool than we show: the ranking step picks the best ones in context.
const MAX_SPELL_SUGGESTIONS = 10;
const MAX_SUGGESTED_WORDS = 40;
const MAX_RANKED_MATCHES = 30;
const MAX_SHOWN_SUGGESTIONS = 8;
const PARAGRAPH_CACHE_SIZE = 500;

// Grammalecte option name -> our display category.
const OPTION_CATEGORY = {
  conf: "grammar", loc: "grammar", gn: "grammar", infi: "grammar",
  conj: "grammar", ppas: "grammar", imp: "grammar", inte: "grammar",
  vmode: "grammar", date: "grammar",
  bs: "style", pleo: "style", eleu: "style", neg: "style",
  redon1: "style", redon2: "style",
};

const CATEGORY_LABEL = {
  spelling: "Orthographe",
  grammar: "Grammaire",
  style: "Style",
  typo: "Typographie",
};

let spellChecker = null;
const paragraphCache = new Map();
let picky = false; // show printer's typography fixes too

function init(options) {
  if (!spellChecker) {
    const base = new URL(VENDOR, self.location.href).href;
    conj.init(helpers.loadFile(base + "fr/conj_data.json"));
    phonet.init(helpers.loadFile(base + "fr/phonet_data.json"));
    mfsp.init(helpers.loadFile(base + "fr/mfsp_data.json"));
    gc_engine.load("JavaScript", "aHSL", base + "graphspell/_dictionaries");
    spellChecker = gc_engine.getSpellChecker();
    if (!spellChecker) throw new Error("Grammalecte failed to load its dictionary");
    fcLoadFrequencies(helpers.loadFile(new URL("../data/fr-freq.txt", self.location.href).href));
  }
  if (options) {
    const { fcPicky = false, ...grammalecteOptions } = options;
    picky = fcPicky;
    gc_engine.setOptions(new Map(Object.entries(grammalecteOptions)));
    fcClearRankingCache();
    paragraphCache.clear();
  }
  return true;
}

const AUXILIARY_BEFORE = /(?:^|[\s’'])(suis|es|est|sommes|êtes|sont|étais|était|étaient|ai|as|a|avons|avez|ont|avait|avaient|été)\s+$/i;

// After an auxiliary, the misspelled word is most likely a past participle:
// "sont partient" -> "parties", even though the dictionary's nearest words
// are "partent" and "partirent". The contextual ranking picks the agreement.
function spellSuggestions(word, before = "") {
  const out = fcSpellSuggestions(spellChecker, word, MAX_SPELL_SUGGESTIONS);
  if (!AUXILIARY_BEFORE.test(before)) return out;
  const participles = [];
  for (const s of out.slice(0, 4)) {
    let forms = "";
    try {
      forms = suggVerbPpas(s) || "";
    } catch {
      // Not a verb.
    }
    for (const form of String(forms).split("|")) {
      if (form && !out.includes(form) && !participles.includes(form)) participles.push(form);
    }
  }
  // Participles go among the first candidates: the ranking only looks at
  // the head of the list.
  const all = [...out.slice(0, 3), ...participles.slice(0, 5), ...out.slice(3)];
  all.participles = participles;
  return all;
}

// A finite verb right after an auxiliary ("sont partent") is ungrammatical:
// when the ranking still put one first, prefer the closest participle.
function preferParticiple(replacements, participles) {
  if (!participles?.length || !replacements.length) return replacements;
  const morphs = spellChecker.getMorph(replacements[0]);
  const finite = morphs.some((m) => /:V.*:(Ip|Iq|Is|If|K|Sp|Sq)/.test(m)) && !morphs.some((m) => /:(Q|A|N)/.test(m));
  if (!finite) return replacements;
  const best = replacements.find((r) => participles.includes(r));
  return best ? [best, ...replacements.filter((r) => r !== best)] : replacements;
}

function overlaps(a, b) {
  return a.offset < b.offset + b.length && b.offset < a.offset + a.length;
}

// Offsets are UTF-16 indices into the original text, so we never normalize or
// strip characters: the content script maps them straight onto the field value.
// Re-rank each match's suggestions in context, left to right, applying the
// best fix of each error before ranking the next one, so "je vien te parlé"
// is judged as "je viens te parlé" when ranking the suggestions for "parlé".
// Returns the matches to keep.
function rankParagraph(paragraph, paraStart, found) {
  const kept = [];
  const fixes = []; // earlier errors we fixed in `fixed`, in paragraph offsets
  let fixed = paragraph;
  let delta = 0;
  let ranked = 0;
  let lastEnd = 0;

  // Two errors that each disappear when the other is fixed are one mistake
  // with two possible fixes ("Ces problème" -> "Ce problème" or "Ces
  // problèmes"); only drop an error when the dependency goes one way.
  const fixesAnEarlierError = (start, m) => {
    const own = m.replacements[0];
    if (own === undefined) return false;
    const alt = paragraph.slice(0, start) + own + paragraph.slice(start + m.length);
    return fixes.some(
      (f) => fcHasErrorAt(paragraph, f.start, f.length) && !fcHasErrorAt(alt, f.start, f.length)
    );
  };

  for (const m of found) {
    const start = m.offset - paraStart;
    if (start < lastEnd) {
      kept.push(m); // overlapping errors keep Grammalecte's order
      continue;
    }
    if (
      m.category !== "spelling" &&
      fixed !== paragraph &&
      fcIsCascadeError(paragraph, start, fixed, start + delta, m.length) &&
      !fixesAnEarlierError(start, m)
    ) {
      continue;
    }
    kept.push(m);
    lastEnd = start + m.length;
    if (ranked++ < MAX_RANKED_MATCHES) {
      const participles = m.replacements.participles;
      m.replacements = fcRankSuggestions(
        spellChecker, fixed, start + delta, m.length, m.replacements, m.category === "spelling"
      );
      m.replacements = preferParticiple(m.replacements, participles);
    }
    m.replacements = m.replacements.slice(0, MAX_SHOWN_SUGGESTIONS);
    const best = m.replacements[0];
    if (best !== undefined) {
      fixed = fixed.slice(0, start + delta) + best + fixed.slice(start + delta + m.length);
      delta += best.length - m.length;
      fixes.push({ start, length: m.length });
    }
  }
  return kept;
}

// Matches of one paragraph, with offsets relative to it. Cached, since a check
// runs after every pause in typing and usually only one paragraph changed.
function checkParagraph(paragraph) {
  const cached = paragraphCache.get(paragraph);
  if (cached) return cached;

  const spelling = [];
  let suggested = 0;
  for (const token of spellChecker.parseParagraph(paragraph)) {
    const word = token.sValue;
    if (fcLooksLikeProperNoun(paragraph, token.nStart, word)) continue;
    spelling.push({
      offset: token.nStart,
      length: token.nEnd - token.nStart,
      word,
      message: "Mot inconnu du dictionnaire.",
      replacements: suggested++ < MAX_SUGGESTED_WORDS ? spellSuggestions(word, paragraph.slice(Math.max(0, token.nStart - 12), token.nStart)) : [],
      ruleId: "SPELLING",
      category: "spelling",
      label: CATEGORY_LABEL.spelling,
    });
  }

  const grammar = [];
  for (const err of gc_engine.parse(paragraph, "FR", false, null, false)) {
    const category = OPTION_CATEGORY[err.sType] ?? "typo";
    const m = {
      offset: err.nStart,
      length: err.nEnd - err.nStart,
      word: paragraph.slice(err.nStart, err.nEnd),
      message: err.sMessage,
      replacements: (err.aSuggestions ?? []).filter((s) => s !== ""),
      ruleId: err.sRuleId,
      category,
      label: CATEGORY_LABEL[category],
      url: err.URL || "",
    };
    if (!picky && fcIsTypographicOnly(m.word, m.replacements)) continue;
    // An unknown word is the more useful report; drop grammar noise on top of it.
    if (!spelling.some((s) => overlaps(s, m))) grammar.push(m);
  }

  const custom = fcCustomRules(paragraph, spellChecker, [...spelling, ...grammar]);
  const urls = fcUrlRanges(paragraph);
  const overriding = custom.filter((m) => m.override);
  const notOverridden = (m) => !overriding.some((o) => overlaps(o, m));
  const found = [...spelling.filter(notOverridden), ...grammar.filter(notOverridden), ...custom]
    .filter((m) => !urls.some(([a, b]) => m.offset < b && a < m.offset + m.length))
    .sort((a, b) => a.offset - b.offset);
  const result = rankParagraph(paragraph, 0, found);
  if (paragraphCache.size >= PARAGRAPH_CACHE_SIZE) paragraphCache.clear();
  paragraphCache.set(paragraph, result);
  return result;
}

function check(text) {
  init();
  const matches = [];
  let paraStart = 0;
  let prevEnd = "";
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim()) {
      // Copies: the sentence rules may adjust them, the cache must stay as is.
      const own = checkParagraph(paragraph).map((m) => ({ ...m, replacements: [...m.replacements] }));
      // Sentence rules depend on the previous paragraph (list items after ":").
      const all = [...own, ...fcSentenceRules(paragraph, own, spellChecker, prevEnd)];
      for (const m of all.sort((a, b) => a.offset - b.offset)) {
        matches.push({ ...m, offset: paraStart + m.offset });
      }
      prevEnd = paragraph.trimEnd().slice(-1);
    }
    paraStart += paragraph.length + 1;
  }
  return matches;
}

self.onmessage = (event) => {
  const { id, type } = event.data;
  try {
    let result;
    if (type === "init") result = init(event.data.options);
    else if (type === "check") result = check(String(event.data.text ?? ""));
    else throw new Error(`Unknown message type: ${type}`);
    self.postMessage({ id, result });
  } catch (err) {
    console.error("[FreeCorrector worker]", err);
    self.postMessage({ id, error: String(err?.message ?? err) });
  }
};
