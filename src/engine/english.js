// English checking with Harper (vendor/harper, WebAssembly, runs locally).
// Converts Harper's lints to FreeCorrector matches, the same shape as the
// French engine's: { offset, length, word, message, replacements, ruleId,
// category, label }, adds our own rules (english-rules.js) and re-ranks
// spelling suggestions like the French engine does: more candidates from a
// word-frequency list, each tried in the sentence, frequent words first.

import { LocalLinter, Dialect, SuggestionKind } from "../vendor/harper/index.js";
import { slimBinary } from "../vendor/harper/slimBinary.js";
import { englishRules, contractionFor } from "./english-rules.js";
import "./informal.js";
import "./sentence-rules.js";

const { fcSentenceRules } = self;

const MAX_SUGGESTIONS = 6;
const MAX_CANDIDATES = 6;
const MAX_RANKED = 12; // errors re-ranked per paragraph
const RANK_BUDGET_MS = 300;
const FREQ_WEIGHT = 0.3;
const HARPER_ORDER_WEIGHT = 0.15;

// Harper lint kinds -> our display categories.
const KIND_CATEGORY = {
  Spelling: "spelling",
  Typo: "spelling",
  Capitalization: "typo",
  Punctuation: "typo",
  Formatting: "typo",
  Style: "style",
  WordChoice: "style",
  Readability: "style",
  Repetition: "grammar",
  Redundancy: "style",
  Enhancement: "style",
  Eggcorn: "grammar",
  Malapropism: "grammar",
  Agreement: "grammar",
  Grammar: "grammar",
  BoundaryError: "grammar",
  Usage: "grammar",
  Miscellaneous: "grammar",
};

const CATEGORY_LABEL = {
  spelling: "Orthographe",
  grammar: "Grammaire",
  style: "Style",
  typo: "Typographie",
};

const DIALECTS = { us: Dialect.American, gb: Dialect.British, ca: Dialect.Canadian, au: Dialect.Australian };

let linter = null;
let linterDialect = null;
let picky = false; // also show style advice and printer's typography
const paragraphCache = new Map(); // paragraph -> matches (offsets relative to it)
const neighbourCache = new Map();

// Advice most people do not want by default: sentence length, Oxford comma…
const PICKY_KINDS = new Set(["Readability", "Style", "Enhancement"]);
const TYPOGRAPHY_ONLY = (word, replacements) => {
  const plain = (s) => s.replace(/…/g, "...").replace(/[‘’]/g, "'").replace(/[“”]/g, "\"").replace(/[–—]/g, "-");
  return replacements.some((r) => plain(r) === plain(word));
};
const frequencies = new Map(); // lowercase word -> log10(occurrences)
const byInitial = new Map(); // first letter -> frequent words

async function loadText(relativeUrl) {
  const url = new URL(relativeUrl, import.meta.url);
  if (typeof process !== "undefined" && url.protocol === "file:") {
    const fs = await import("fs");
    return fs.promises.readFile(url, "utf8");
  }
  return (await fetch(url)).text();
}

async function loadFrequencies() {
  if (frequencies.size) return;
  const text = await loadText("../data/en-freq.txt");
  for (const line of text.split("\n")) {
    const space = line.indexOf(" ");
    if (space <= 0) continue;
    const word = line.slice(0, space);
    const count = Number(line.slice(space + 1));
    frequencies.set(word, Math.log10(count + 1));
    // Rare entries of the list are often typos ("untill"): not candidates.
    if (count < 500 || !/^[a-z]+$/.test(word)) continue;
    if (!byInitial.has(word[0])) byInitial.set(word[0], []);
    byInitial.get(word[0]).push(word);
  }
}

export async function init(options = {}) {
  if (options.picky !== undefined && !!options.picky !== picky) {
    picky = !!options.picky;
    paragraphCache.clear();
  }
  const dialect = DIALECTS[options.dialect] ?? linterDialect ?? Dialect.American;
  if (dialect !== linterDialect) paragraphCache.clear();
  if (!linter || dialect !== linterDialect) {
    linter = new LocalLinter({ binary: slimBinary, dialect });
    linterDialect = dialect;
    await Promise.all([linter.setup(), loadFrequencies()]);
    // Harper builds parts of its spelling-suggestion index on the first
    // unknown words (accented ones especially),
    // which takes about two seconds: do it now rather than on the user's
    // first typo.
    await lintCount("Thsi sentense has typos, électroménagr included.");
  }
  return true;
}

// ---------- Ranking helpers ----------

function frequency(word) {
  const lower = word.toLowerCase().replace(/’/g, "'");
  return frequencies.get(lower) ?? frequencies.get(lower.replace(/'/g, "")) ?? 0;
}

// Edit distance where a forgotten apostrophe, space or hyphen is cheap and
// doubled letters or swapped letters cost less than other slips.
function typingDistance(a, b) {
  a = a.toLowerCase().replace(/’/g, "'");
  b = b.toLowerCase().replace(/’/g, "'");
  const indel = (ch) => (ch === "'" || ch === " " || ch === "-" ? 0.3 : 1);
  const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) d[i][0] = d[i - 1][0] + indel(a[i - 1]);
  for (let j = 1; j <= b.length; j++) d[0][j] = d[0][j - 1] + indel(b[j - 1]);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + indel(a[i - 1]),
        d[i][j - 1] + indel(b[j - 1]),
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      if (i > 1 && a[i - 1] === a[i - 2]) d[i][j] = Math.min(d[i][j], d[i - 1][j] + 0.5);
      if (j > 1 && b[j - 1] === b[j - 2]) d[i][j] = Math.min(d[i][j], d[i][j - 1] + 0.5);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 0.8);
      }
    }
  }
  return d[a.length][b.length];
}

function matchCase(model, word) {
  if (model.length > 1 && model === model.toUpperCase()) return word.toUpperCase();
  if (/^\p{Lu}/u.test(model)) return word[0].toUpperCase() + word.slice(1);
  return word;
}

// Frequent words close to a typo, which Harper may not suggest.
// Plain Levenshtein distance, or max + 1 as soon as it exceeds `max`.
function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function frequentNeighbours(word, limit = 3) {
  const lower = word.toLowerCase().replace(/['’]/g, "");
  let found = neighbourCache.get(lower);
  if (!found) {
    const scored = [];
    for (const candidate of byInitial.get(lower[0]) ?? []) {
      // Cheap filter first, exact typing cost on the survivors.
      if (candidate === lower || within(lower, candidate, 2) > 2) continue;
      const distance = typingDistance(lower, candidate);
      if (distance <= 1.5) scored.push([candidate, distance - FREQ_WEIGHT * frequency(candidate)]);
    }
    found = scored.sort((a, b) => a[1] - b[1]).slice(0, limit).map(([c]) => c);
    if (neighbourCache.size > 5000) neighbourCache.clear();
    neighbourCache.set(lower, found);
  }
  return found.map((c) => matchCase(word, c));
}

async function lintCount(text) {
  const lints = await linter.lint(text, { language: "plaintext" });
  const n = lints.length;
  for (const l of lints) l.free?.();
  return n;
}

function sentenceAround(text, start, end) {
  let s = start;
  while (s > 0 && !/[.!?]/.test(text[s - 1])) s--;
  let e = end;
  while (e < text.length && !/[.!?]/.test(text[e])) e++;
  return [s, Math.min(e + 1, text.length)];
}

// Spelling suggestions, best first: fewest errors left in the sentence, then
// cheapest to type, most frequent, Harper's own order.
async function rankSpelling(paragraph, m) {
  const harper = m.replacements;
  const prevWord = paragraph.slice(0, m.offset).match(/([A-Za-z]+)[^A-Za-z]*$/)?.[1] ?? "";
  const contraction = contractionFor(m.word, prevWord);
  const candidates = [...new Set([
    ...(contraction ? [matchCase(m.word, contraction)] : []),
    ...harper,
    ...frequentNeighbours(m.word),
  ])]
    .filter((c) => c && c !== m.word)
    // No proper nouns ("Comoros") for a lowercase word.
    .filter((c) => m.word !== m.word.toLowerCase() || c === c.toLowerCase() || /^I(['’]|$)/.test(c))
    .slice(0, MAX_CANDIDATES);
  if (candidates.length <= 1) return candidates;

  const scored = candidates.map((c) => {
    const index = harper.indexOf(c);
    let cost = typingDistance(m.word, c) - FREQ_WEIGHT * frequency(c);
    cost += index >= 0 ? HARPER_ORDER_WEIGHT * index : 0.2;
    if (c === contraction || c.toLowerCase() === contraction?.toLowerCase()) cost -= 1;
    // A plural typo wants a plural fix: "grocerys" -> "groceries", not "grocery".
    if (/[^s's]s$/i.test(m.word) && !/s$/i.test(c)) cost += 1;
    return { c, cost, errors: 0 };
  }).sort((a, b) => a.cost - b.cost);

  // Trying candidates in the sentence costs a lint each: only when the
  // typing cost does not already single out a clear winner.
  if (scored[1].cost - scored[0].cost < 0.8) {
    // A window of words around the typo is enough context, and much faster
    // than the whole (sometimes very long) sentence.
    let [s, e] = sentenceAround(paragraph, m.offset, m.offset + m.length);
    s = Math.max(s, paragraph.lastIndexOf(" ", Math.max(m.offset - 60, 0)) + 1);
    const cut = paragraph.indexOf(" ", m.offset + m.length + 60);
    if (cut > 0) e = Math.min(e, cut);
    const before = paragraph.slice(s, m.offset);
    const after = paragraph.slice(m.offset + m.length, e);
    for (const x of scored) x.errors = await lintCount(before + x.c + after);
  }
  const ranked = scored.sort((a, b) => a.errors - b.errors || a.cost - b.cost).map((x) => x.c);
  // A known contraction ("dont" -> "don't", "she dont" -> "doesn't") is
  // what was meant, whatever the scores say.
  if (contraction) {
    const fixed = matchCase(m.word, contraction);
    return [fixed, ...ranked.filter((c) => c !== fixed)];
  }
  return ranked;
}

// ---------- Harper -> matches ----------

// Harper counts characters (Unicode code points); JavaScript strings count
// UTF-16 units. Map one to the other for texts with emoji and the like.
function codePointToUtf16(text) {
  const map = [];
  let unit = 0;
  for (const ch of text) {
    map.push(unit);
    unit += ch.length;
  }
  map.push(unit);
  return (i) => map[Math.min(i, map.length - 1)];
}

// Unknown capitalized words in the middle of a sentence are names.
function looksLikeName(text, start, word) {
  if (word[0] === word[0].toLowerCase()) return false;
  const before = text.slice(0, start).trimEnd();
  return before !== "" && !/[.!?…:"“(\n]$/.test(before);
}

// The same word in another English spelling: colour/color, organise/organize,
// centre/center, travelled/traveled, catalogue/catalog, defence/defense.
function dialectForm(word) {
  return word.toLowerCase()
    .replace(/our(s|ed|ing|ful|ite|ites)?$/, "or$1")
    .replace(/our(?=[a-z])/, "or")
    .replace(/is(e|es|ed|ing|er|ers|ation|ations)$/, "iz$1")
    .replace(/ys(e|es|ed|ing)$/, "yz$1")
    .replace(/([^aeiou])re(s|d)?$/, "$1er$2")
    .replace(/ll(ed|ing|er|ers|ation)$/, "l$1")
    .replace(/ogue(s)?$/, "og$1")
    .replace(/ence(s)?$/, "ense$1")
    .replace(/^grey/, "gray")
    .replace(/mme(s)?$/, "m$1");
}

function isDialectVariant(word, suggestion) {
  return word.toLowerCase() !== suggestion.toLowerCase() && dialectForm(word) === dialectForm(suggestion);
}

function suggestionText(suggestion, problem) {
  const kind = suggestion.kind();
  if (kind === SuggestionKind.Remove) return "";
  const text = suggestion.get_replacement_text();
  return kind === SuggestionKind.InsertAfter ? problem + text : text;
}

async function lintParagraph(paragraph) {
  const toUtf16 = codePointToUtf16(paragraph);
  const lints = await linter.lint(paragraph, { language: "plaintext" });
  const out = [];
  for (const lint of lints) {
    try {
      const span = lint.span();
      const offset = toUtf16(span.start);
      const end = toUtf16(span.end);
      span.free?.();
      const word = paragraph.slice(offset, end);
      const kind = lint.lint_kind();
      const category = KIND_CATEGORY[kind] ?? "grammar";
      // Names ("Ceylon", "Turkey") are not errors, whatever Harper files them as.
      if (kind !== "Capitalization" && /^[\p{L}'’-]+$/u.test(word) && looksLikeName(paragraph, offset, word)) continue;
      if (!picky && PICKY_KINDS.has(kind)) continue;
      const replacements = [];
      for (const s of lint.suggestions()) {
        const r = suggestionText(s, word);
        s.free?.();
        if (!replacements.includes(r)) replacements.push(r);
      }
      if (!picky && kind === "Formatting" && TYPOGRAPHY_ONLY(word, replacements)) continue;
      // "lol", "gonna", "congrats": informal on purpose.
      if (self.FC_INFORMAL_WORDS.has(word.toLowerCase())) continue;
      // "cancelled", "colour", "organise" are right in British English (and
      // "canceled" in American): only picky mode asks for the chosen dialect.
      if (!picky && (kind === "Spelling" || kind === "Typo") && replacements.some((r) => isDialectVariant(word, r))) continue;
      // Guesses with nothing to offer ("You may be missing a preposition").
      if (kind === "Miscellaneous" && !replacements.length) continue;
      // Never lowercase the first word of a sentence ("Who's coming?").
      const sentenceStart = /(^|[.!?…]\s+)$/.test(paragraph.slice(0, offset));
      if (kind === "Capitalization" && sentenceStart && replacements[0] === word.toLowerCase()) continue;
      out.push({
        offset,
        length: end - offset,
        word,
        message: lint.message().replace(/`([^`]*)`/g, "“$1”"),
        replacements,
        ruleId: `EN_${kind}`,
        category,
        label: CATEGORY_LABEL[category],
      });
    } finally {
      lint.free?.();
    }
  }
  // Ranking costs a few lints per error: bounded, so a long foreign or
  // garbled paragraph cannot stall the checks (Harper's own order is kept).
  let ranked = 0;
  const deadline = performance.now() + RANK_BUDGET_MS;
  for (const m of out) {
    // "They're house" -> "Their"; "They're is a problem" -> "There".
    if (/^they['’]re$/i.test(m.word)) {
      const next = paragraph.slice(m.offset + m.length).match(/^\s+([A-Za-z'’]+)/)?.[1]?.toLowerCase() ?? "";
      const want = /^(is|are|was|were|will|has|have|isn['’]t|aren['’]t|wasn['’]t|weren['’]t|must|might|may|could|should|would|seems?)$/.test(next) ? "there" : "their";
      const hit = m.replacements.find((r) => r.toLowerCase() === want);
      if (hit) m.replacements = [hit, ...m.replacements.filter((r) => r !== hit)];
    }
    // Harper files some typos under other kinds ("untill": WordChoice,
    // "wont": Miscellaneous): rank any one-word fix of a rare or unknown word.
    // Not a contraction used for the wrong word: that is grammar, ranked above.
    const oneWord = /^[\p{L}'’]+$/u.test(m.word) && !/['’](re|s|ll|ve|d|t)$/i.test(m.word);
    const rare = frequency(m.word) < 2.7;
    if (oneWord && m.category !== "typo" && (m.category === "spelling" || rare || contractionFor(m.word))) {
      if (ranked++ < MAX_RANKED && performance.now() < deadline) m.replacements = await rankSpelling(paragraph, m);
      if (rare || contractionFor(m.word)) {
        m.category = "spelling";
        m.label = CATEGORY_LABEL.spelling;
      }
    }
    m.replacements = m.replacements.slice(0, MAX_SUGGESTIONS);
  }
  return out;
}

// Checks English text; paragraphs are separated by "\n".
export async function check(text) {
  await init();
  // Tokens over 40 characters are hashes, keys or encoded data, never words:
  // blanked (same length, so offsets hold) instead of costing seconds.
  text = text.replace(/\S{41,}/g, (s) => " ".repeat(s.length));
  const matches = [];
  let paraStart = 0;
  let prevEnd = "";
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim()) {
      // Usually only one paragraph changed since the last check.
      let cached = paragraphCache.get(paragraph);
      if (!cached) {
        const harper = await lintParagraph(paragraph);
        const own = englishRules(paragraph, harper, frequency);
        const overriding = own.filter((m) => m.override);
        const kept = harper.filter((h) => !overriding.some((o) => o.offset < h.offset + h.length && h.offset < o.offset + o.length));
        cached = [...kept, ...own];
        if (paragraphCache.size >= 500) paragraphCache.clear();
        paragraphCache.set(paragraph, cached);
      }
      // Copies: the sentence rules may adjust them, the cache must stay as is.
      const own = cached.map((m) => ({ ...m, replacements: [...m.replacements] }));
      const all = [...own, ...fcSentenceRules(paragraph, own, null, prevEnd, "en")];
      for (const m of all.sort((a, b) => a.offset - b.offset)) matches.push({ ...m, offset: paraStart + m.offset });
      prevEnd = paragraph.trimEnd().slice(-1);
    }
    paraStart += paragraph.length + 1;
  }
  return matches;
}
