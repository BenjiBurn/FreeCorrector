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
import "./mask.js";
import "./collocations.js";
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
const EN_IRREGULAR_PAST = /^(hid|ran|ate|went|came|saw|took|gave|made|told|wrote|met|chose|brought|thought|found|left|spoke|drove|knew|forgot|sat|stood|paid|sold|taught|caught|began|won|lost|spent|heard|felt|kept|slept|fell|flew|grew|drew|broke|woke|wore|sang|swam|did|had|got|put|cut|let|set|read|hit|hurt|bought|sent|built|meant|held|led|fed|bit|shook|stole|rode|rose|hung|lit|dug|threw|blew|tore|swore|froze|struck|fought|sought|bent|lent|dealt|\p{L}+ed)$/iu;
// A known word behind a prefix: "midafternoon", "nonprofit", "multiyear".
// Not "re", "inter", "un", "co"…: "interresting", "recommand" are typos.
const EN_PREFIXED = /^(non|over|under|sub|super|multi|self|anti|counter|mid|post|semi|micro|mini)-?(\p{L}{4,})$/iu;
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
    // Harper's first spelling suggestions are slower: done now, not on the
    // user's first typo.
    await lintCount("Thsi sentense has typos.");
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

// The text Harper gets: unknown words with accented letters ("Besançon",
// "électroménager") are blanked, same length so offsets hold. They are names
// or foreign words Harper cannot fix, and the first one costs it about two
// seconds of index building. Known ones ("café", "naïve") stay.
function harperText(text) {
  if (!/[^\x00-\x7F]/.test(text)) return text;
  return text.replace(/[\p{L}\p{M}'’-]+/gu, (w) =>
    /[^\x00-\x7F’]/.test(w) && !frequencies.has(w.toLowerCase()) ? " ".repeat(w.length) : w);
}

async function lintCount(text) {
  const lints = await linter.lint(harperText(text), { language: "plaintext" });
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
    // But a past form takes no -s: "it tooks" -> "took", not "tools".
    if (m.word.toLowerCase() === `${c.toLowerCase()}s` && EN_IRREGULAR_PAST.test(c)) cost -= 1;
    else if (/[^s's]s$/i.test(m.word) && !/s$/i.test(c)) cost += 1;
    // French spellings drop the final "e" of "-ile": "profils" -> "profiles", not "profits".
    if (/il$/i.test(m.word) ? c.toLowerCase() === `${m.word.toLowerCase()}e` :
        /ils$/i.test(m.word) && c.toLowerCase() === `${m.word.toLowerCase().slice(0, -1)}es`) cost -= 1;
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
const FOREIGN_LETTERS = /[łøåßğşıčćžšőűăţșțđħŋþðæéèêëàâîïôûùçñãõáíóúäöü]/i;
const HONORIFIC = /(^|[\s(])(Mr|Mrs|Ms|Mx|Dr|Prof|St|Sr|Jr|Rev|Capt|Sgt|Lt|Col|Gen|Gov|Sen|Rep)\.?\s*$/;

function looksLikeName(text, start, word, replacements = []) {
  // @mentions and #hashtags
  if (/[@#][\w.-]*$/.test(text.slice(Math.max(0, start - 30), start))) return true;
  if (word[0] === word[0].toLowerCase()) return false;
  const before = text.slice(0, start).trimEnd();
  if (before !== "" && !/[.!?…:"“(\n]$/.test(before)) return true;
  // At the start of a sentence: "Mrs. García", "José made…", "Priya, Diego and Mei".
  if (HONORIFIC.test(before)) return true;
  // After an initial, not a full stop: "V. A. Sundaram", "Charles W. Alcock".
  if (/(^|[\s(])\p{Lu}\.$/u.test(before)) return true;
  // Contractions and split words are typos, not names ("Dont", "Alot", "Im").
  if (contractionFor(word) || replacements.some((r) => r.replace(/[\s'’]/g, "").toLowerCase() === word.toLowerCase())) return false;
  // "Yann @Helpdesk": a display name next to a handle, alone on its line; not a swap of
  // letters such as "Teh @admin".
  const letters = (w) => [...w.toLowerCase()].sort().join("");
  if (/(^|\n)\s*$/.test(text.slice(0, start)) && /^\s+\(?@[\w.-]+\)?\s*(\n|$)/.test(text.slice(start + word.length)) &&
      !replacements.some((r) => letters(r) === letters(word))) return true;
  if (FOREIGN_LETTERS.test(word)) return true;
  // A first name the frequency list knows well (it comes from film subtitles;
  // typos such as "alot" or "untill" are far less frequent than names).
  if (frequency(word) >= 3) return true;
  // "Priyanka says it's…": an unknown capitalized word acting as a subject.
  // "Isaacson writes that…", "Searle challenges this claim": an author and a reporting verb.
  if (/^\s+(says|said|is|was|has|had|told|thinks|wants|just|will|can|and|loves|likes|got|gets|went|made|writes|wrote|argues|argued|challenges|challenged|considered|considers|believes|believed|claims|claimed|suggests|suggested|notes|noted|explains|explained|describes|described|defines|defined|proposed|proposes|recommends|recommended|disagreed|disagrees|agreed|agrees|replied|states|stated|concluded|coined|founded|insisted|warned|predicted|observed|remarked)\b/.test(text.slice(start + word.length))) return true;
  // "Yitzhak Navon, Ben-Gurion's secretary", "Demis Hassabis of DeepMind": a first name
  // before a surname the frequency list does not know either.
  const surname = text.slice(start + word.length).match(/^ (\p{Lu}[\p{L}’'-]+)/u)?.[1];
  if (surname && frequency(surname.replace(/['’]s$/, "")) < 2) return true;
  return /^\s*(,|and\b|&)\s*\p{Lu}/u.test(text.slice(start + word.length));
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

// British words the rules above do not turn into American ones ("practise", "cheque", "tyre").
const EN_BRITISH = /^(practis(e|es|ed|ing)|cheques?|tyres?|kerbs?|aluminium|ploughs?|pyjamas|mums?|storeys|whilst|amongst|learnt|spelt|dreamt|burnt|aeroplanes?|manoeuvres?|jewellery|cosy|sceptical|enquir(y|ies|e|ed|ing|er|ers)|fulfil|enrol|instalments?|ageing|judgements?|moustaches?|draughts?|offences?|licences?|defences?|programmes?|catalogues?|dialogues?|grey|afterwards|focuss(ed|es|ing)|mediaeval|sizeable)$/i;
// Right words Harper's dictionary lacks ("employee wellbeing", "a gauge invariance").
const EN_KNOWN_WORDS = /^(wellbeing|invariances?|wavefunctions?|rulesets?|matchdays?|timewasting|redshifts?|lensing|futsal|bosons?|reprises?|affective|affectively)$/i;
// A known word behind a scientific or learned prefix, which Harper offers to split:
// "antisymmetric", "pseudotensor", "bioenergy". Not "inter" ("interresting" -> "inter resting").
const EN_LEARNED_PREFIX = /^(anti|pseudo|non|semi|bio|neuro|quasi|proto|macro|micro|multi|poly|mono|cyber|electro|thermo|hydro|geo|socio|psycho|hyper|ultra|meta)(\p{L}{4,})$/iu;
// ... or before a suffix: "personhood", "illusionism", "Computationalism", "cyberneticist".
const EN_LEARNED_SUFFIX = /^(\p{L}{4,})(hood|isms?|ists?)$/iu;
// "John von Neumann", "Annalen der Physik": a particle inside a name.
const EN_NAME_PARTICLE = /^(von|der|van|den|zu|zur|de|di|da|du|del|della|dos|das|le|la|bin|ibn|al|el|ter|ten)$/i;
// Function words of French, German, Spanish, Italian, never English words: a quotation
// holding one ("simple mais efficace", "Folgerungen aus den…") is in that language.
const EN_FOREIGN_FUNCTION = /^(der|das|und|aus|mit|zur|zum|eine|einer|eines|ein|nicht|ist|sind|auf|für|über|bei|nach|vom|dem|les|des|du|et|mais|avec|pour|dans|devant|chez|est|sont|une|aux|très|soi|moi|toi|nous|vous|cette|qui|que|ne|pas|bon|bonne|el|los|las|del|con|por|para|una|il|di|della|che|per|sono)$/i;

function isDialectVariant(word, suggestion) {
  return word.toLowerCase() !== suggestion.toLowerCase() && dialectForm(word) === dialectForm(suggestion);
}

// Harper's false alarms on edited prose (articles, reports, essays): initials,
// acronyms, learned words, names and particles, a few constructions it misreads.
function editedProseFalseAlarm(paragraph, forHarper, offset, end, word, kind, replacements, message) {
  const spelling = kind === "Spelling" || kind === "Typo";
  const lower = word.toLowerCase();
  const after = paragraph.slice(end);
  const before = paragraph.slice(0, offset);
  const same = (r, w) => r.toLowerCase() === w.toLowerCase();
  if (spelling) {
    // "Franklin D. Roosevelt", "W. E. B. Du Bois": initials.
    if (/^\p{Lu}\.$/u.test(word) && /^\s+\p{Lu}/u.test(after)) return true;
    // "the support vector machine (SVM)", "IFAB recommends": an acronym in a text written in
    // lowercase (all in capitals, "PLEASE SEND IT TOMOROW", the words stay checked).
    if (/^[A-Z]{2,}s?$/.test(word) && !contractionFor(word) &&
        (paragraph.match(/\p{Ll}/gu) ?? []).length > 2 * (paragraph.match(/\p{Lu}/gu) ?? []).length) return true;
    if (EN_KNOWN_WORDS.test(word)) return true;
    // "antisymmetric" -> "anti symmetric", "personhood" -> "person hood": a learned prefix
    // or suffix on a word Harper knows; "Computationalism" -> "Computational".
    const prefixed = word.match(EN_LEARNED_PREFIX);
    if (prefixed && (frequency(prefixed[2]) >= 3 || replacements.some((r) => same(r, `${prefixed[1]} ${prefixed[2]}`) || same(r, `${prefixed[1]}-${prefixed[2]}`)))) return true;
    const suffixed = word.match(EN_LEARNED_SUFFIX);
    if (suffixed && replacements.some((r) => same(r, `${suffixed[1]} ${suffixed[2]}`) || same(r, suffixed[1]))) return true;
    // "neuro-symbolic", "sci-fi", "doi:10.1000/…": a piece of a hyphenated word or a reference.
    if (`${word}xxxx`.match(EN_LEARNED_PREFIX)?.[2] === "xxxx" && /^-\p{L}/u.test(after) || /^fi$/i.test(word) && /\b(sci|wi|hi)-$/i.test(before) ||
        /^doi$/i.test(word) && /^:\s*10\./.test(after)) return true;
    // "the Nazi book burnings", "the turnings of the road": the plural of a noun in -ing.
    // (Not "differents", "criterias", "Tonights": a plural an adjective or a name does not take.)
    if (/^\p{L}{3,}ings$/u.test(word) && replacements.slice(0, 3).some((r) => same(r, word.slice(0, -1)))) return true;
    // "John von Neumann", "Annalen der Physik"
    if (EN_NAME_PARTICLE.test(word) && /^\s+\p{Lu}/u.test(after)) return true;
    // "frequency f is", "a matrix A": a variable.
    if (/^[defghjlmopqstvwz]$/.test(word)) return true;
  }
  // "with a latex bladder", "active lidar": the material and the technique, not the brands.
  if (kind === "Capitalization" && /^(latex|lidar)$/.test(word)) return true;
  // "DeepMind developed…", "McCarthy defines…": a capital asked for in the middle of a sentence.
  if (kind === "Capitalization" && /^This sentence does not start/.test(message) && /[\p{L}\p{N},;]\s+$/u.test(before)) return true;
  // "Löwenthal nevertheless remained": the name before was blanked for Harper; not a sentence start.
  if (kind === "Punctuation" && replacements.every((r) => r === `${word},`) &&
      forHarper.slice(0, offset).trimEnd().length !== before.trimEnd().length) return true;
  // "an MIT licence", "an FBI agent", "an SQL query": letters read one by one.
  if (/^an$/i.test(word) && replacements.every((r) => /^a$/i.test(r)) && /^\s+[AEFHILMNORSX][A-Z0-9]+\b/.test(after)) return true;
  // "his paper on mass–energy equivalence", "some one-shot collaborations": half of a hyphenated word.
  if (/\s/.test(word) && /^[-–]\p{L}/u.test(after)) return true;
  // "one of the four first selected": a number, not a noun to put in the plural;
  // "one of the family": a group.
  if (kind === "Usage" && /^(two|three|four|five|six|seven|eight|nine|ten|first|last|family|team|staff|crew|group|class|band|public)$/i.test(word)) return true;
  // "a call from some 400 scientists", "(both 1968)": right as written.
  if (kind === "Grammar" && /should not be used before a number/.test(message)) return true;
  // "made up most of the team": the phrasal verb "make up", not "upmost".
  if (/^up most$/i.test(word) && /\b(make|makes|made|making)\s+$/i.test(before)) return true;
  // "had a bearing on", "an appreciation for music", "a shortening of": Harper takes these
  // for mass nouns; the ones every learner gets wrong ("an advice") stay flagged.
  if (kind === "Agreement" && /is a mass noun/.test(message) && /^(a|an)\s/i.test(word) &&
      !/^(advice|information|furniture|equipment|knowledge|homework|luggage|baggage|feedback|evidence|research|software|news|traffic|progress|weather|money|vocabulary|machinery|garbage|rubbish|scenery|jewelry|jewellery|music|bread|water|work|fun|stuff|health|accommodation|transportation|clothing|mail|spam|slang|grammar|electricity|pollution|permission|luck|weather)\b/i.test(lower.replace(/^an?\s+/, "").replace(/^(good|great|bad|useful|important|new|very|real|little|big|excellent|wonderful|nice|terrible)\s+/, ""))) return true;
  return false;
}

function suggestionText(suggestion, problem) {
  const kind = suggestion.kind();
  if (kind === SuggestionKind.Remove) return "";
  const text = suggestion.get_replacement_text();
  return kind === SuggestionKind.InsertAfter ? problem + text : text;
}

async function lintParagraph(paragraph) {
  const forHarper = harperText(paragraph);
  const toUtf16 = codePointToUtf16(forHarper);
  const lints = await linter.lint(forHarper, { language: "plaintext" });
  const out = [];
  for (const lint of lints) {
    try {
      const span = lint.span();
      const offset = toUtf16(span.start);
      const end = toUtf16(span.end);
      span.free?.();
      const word = paragraph.slice(offset, end);
      // Harper saw blanks there ("Besançon" hidden from it): not a real error.
      if (forHarper.slice(offset, end) !== word) continue;
      const kind = lint.lint_kind();
      const category = KIND_CATEGORY[kind] ?? "grammar";
      if (!picky && PICKY_KINDS.has(kind)) continue;
      const replacements = [];
      for (const s of lint.suggestions()) {
        const r = suggestionText(s, word);
        s.free?.();
        if (!replacements.includes(r)) replacements.push(r);
      }
      if (!picky && kind === "Formatting" && TYPOGRAPHY_ONLY(word, replacements)) continue;
      // Names ("Ceylon", "Turkey", "José") are not errors, whatever Harper files them as.
      if ((kind === "Spelling" || kind === "Typo" || !/^(Their|There|They're|Your|You're|Its|It's|Whose|Who's|Then|Than|Were|Where|Affect|Effect)$/i.test(word)) &&
          kind !== "Capitalization" && /^[\p{L}'’-]+$/u.test(word) && looksLikeName(paragraph, offset, word, replacements)) continue;
      // "going there tomorrow": a place adverb, never "their" before these.
      if (/^there$/i.test(word) && replacements[0]?.toLowerCase() === "their" &&
          /^\s*([,.;:!?)]|$|(tomorrow|today|tonight|now|yesterday|soon|again|later|and|but|with|for|at|by|alone|together|too|early|late|once|first|last|before|after|on|in|until|till|anymore|already|yet)\b)/i.test(paragraph.slice(end))) continue;
      // Closed compounds ("roadmap", "website"): only picky mode asks to split them.
      if (!picky && kind === "WordChoice" && replacements.length && replacements.every((r) => r.includes(" ") && r.replace(/[\s-]/g, "") === word)) continue;
      // Debatable or harmful guesses, kept for picky mode: "whom" -> "who",
      // joining "the sun rise", "day one" -> "Day One", "Mia" -> "MIA",
      // "eagerness to learn" -> "learn to".
      if (!picky && /^whom$/i.test(word)) continue;
      if (!picky && kind === "WordChoice" && replacements.length && replacements.every((r) => r === word.replace(/\s+/g, "") || r.startsWith(`${word} `))) continue;
      if (!picky && kind === "Capitalization" && replacements.every((r) => r.length > 1 && r === r.toUpperCase() && r !== word)) continue;
      if (!picky && kind === "Capitalization" && /^(day|week|year|chapter|step|phase|round|level|page|part|act|scene|stage) (one|two|three|four|five|\d+)$/i.test(word)) continue;
      // "Mr. and Mrs.": an abbreviation's period does not end the sentence.
      if (kind === "Capitalization" && /\b(Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e|approx|no|Jr|Sr)\.\s*$/i.test(paragraph.slice(0, offset))) continue;
      // "lol", "gonna", "congrats": informal on purpose.
      if (self.FC_INFORMAL_WORDS.has(word.toLowerCase())) continue;
      // "cancelled", "colour", "organise" are right in British English (and
      // "canceled" in American): only picky mode asks for the chosen dialect.
      if (!picky && (kind === "Spelling" || kind === "Typo") && (replacements.some((r) => isDialectVariant(word, r)) ||
          EN_BRITISH.test(word) || dialectForm(word) !== word.toLowerCase() && frequency(dialectForm(word)) >= 3)) continue;
      // "she hid", "they ran": a past form has no third-person -s.
      if (kind === "Agreement" && EN_IRREGULAR_PAST.test(word) && replacements.every((r) => /s$/i.test(r))) continue;
      // "1. a valid passport": a list item, not a sentence.
      if (kind === "Capitalization" && /(^|\n)\s*(\d+[.)]|[-*•–])\s*$/.test(paragraph.slice(0, offset))) continue;
      // "non-native", "midafternoon", "rebooking": correct hyphenated or prefixed words.
      if (!picky && (kind === "Spelling" || kind === "Typo") && (
        // ("carefull" -> "care full" is a typo: only a hyphen dropped counts.)
        word.includes("-") && replacements.length && replacements.every((r) => r.replace(/-/g, "").toLowerCase() === word.replace(/-/g, "").toLowerCase()) ||
        EN_PREFIXED.test(word) && frequency(word.toLowerCase().replace(EN_PREFIXED, "$2")) >= 3)) continue;
      // "Reply YES to confirm or NO to cancel": words in capitals are on purpose.
      if (/^[A-Z]{2,}\s/.test(word) || /^[A-Z]{2,}$/.test(word) && kind !== "Spelling" && kind !== "Typo") continue;
      // A span starting at a space, after an emoji: nothing to fix there.
      if (/^\s/.test(word) && /[\p{Extended_Pictographic}‍️]\s*$/u.test(paragraph.slice(0, offset + 1))) continue;
      // "He had had enough", "I think that that idea": right as written.
      if (kind === "Repetition" && /^(had|that)\s+(had|that)$/i.test(word)) continue;
      // "Notwithstanding the foregoing": a preposition, not a discourse marker wanting a comma.
      if (!picky && kind === "Punctuation" && replacements.every((r) => r === `${word},`) &&
          /^\s+(the|a|an|this|that|these|those|his|her|my|your|our|their|its|any|all|such)\b/i.test(paragraph.slice(end))) continue;
      // Accented words in English text are borrowed ("crème", "déjà"): not typos.
      if ((kind === "Spelling" || kind === "Typo") && /[^\x00-\x7F’]/.test(word)) continue;
      // Right after a blanked word ("Siobhán and"): not the start of a sentence.
      if (kind === "Capitalization" && forHarper.slice(0, offset).trimEnd().length !== paragraph.slice(0, offset).trimEnd().length) continue;
      // "I think it's time to go", "I guess it's money well spent": a verb taking a clause, then
      // "it is" ("I think its color is wrong", with its verb after the noun, stays flagged).
      if (kind === "Agreement" && /^it['’]s$/i.test(word) && replacements.every((r) => /^its$/i.test(r)) &&
          /\b(think|thought|guess|guessed|know|knew|hope|hoped|believe|believed|feel|felt|bet|reckon|suppose|figure|figured|say|said|mean|meant|realize|realized|realise|realised|sure|seems|seemed|heard|agree|agreed)\s+$/i.test(paragraph.slice(Math.max(0, offset - 14), offset)) &&
          !/^\s+\p{L}+\s+(is|was|are|were|has|had|have|will|would|can|could|should|must|might|may|does|did|\p{L}+(ed|es|s))\b/iu.test(paragraph.slice(end))) continue;
      // "one serving", "one building": a count noun in -ing, not a mass noun.
      if (kind === "Agreement" && replacements.length && replacements.every((r) => / piece of /.test(r)) && /ing$/i.test(word)) continue;
      // Guesses with nothing to offer ("You may be missing a preposition").
      if (kind === "Miscellaneous" && !replacements.length) continue;
      // "the deploy's been pushed": a known word + 's (is, has, possessive), not a typo.
      if ((kind === "Spelling" || kind === "Typo") && /^\p{L}+['’]s$/u.test(word) && frequency(word.slice(0, -2).toLowerCase()) >= 2) continue;
      // "reduce the heat to low": a setting, not "too low".
      if (/^to$/i.test(word) && replacements.some((r) => /^too$/i.test(r)) &&
          /\b(reduce|reduced|turn|turned|set|lower|lowered|raise|raised|increase|increased|bring|adjust|change|changed|switch|drop|dropped|cut|move|moved|slide)\b[^.!?]{0,25}$/i.test(paragraph.slice(Math.max(0, offset - 40), offset))) continue;
      // "the camera is fire": slang for great, not "fired".
      if (/^fire$/i.test(word) && /\b(is|was|so|'s|’s|straight|lowkey|kinda)\s+$/i.test(paragraph.slice(Math.max(0, offset - 12), offset))) continue;
      // "Peace and quiet", "the quiet of the night": "quiet" is a noun here, not "quite".
      if (/^quiet$/i.test(word) && /\b(and|the|some|of|for|in|a|bit of|peace and)\s+$/i.test(paragraph.slice(Math.max(0, offset - 12), offset))) continue;
      // "does anyone want anything?": after do/does/did, the verb stays bare.
      if (replacements.length && replacements.every((r) => r.toLowerCase() === `${word.toLowerCase()}s` || r.toLowerCase() === `${word.toLowerCase()}es`) &&
          /\b(do|does|did|don't|doesn't|didn't|will|would|can|could|should|must|might|may)\s+\p{L}+\s+$/iu.test(paragraph.slice(Math.max(0, offset - 30), offset))) continue;
      // Never lowercase the first word of a sentence ("Who's coming?").
      const sentenceStart = /(^|[.!?…]\s+)["“‘'(]?$/.test(paragraph.slice(0, offset));
      const plainQuote = (w) => w.replace(/’/g, "'");
      if (kind === "Capitalization" && sentenceStart && replacements[0] && plainQuote(replacements[0]) === plainQuote(word).toLowerCase()) continue;
      // "Their being late cost us the set": a gerund after a possessive, not "they're".
      if (!picky && /^their$/i.test(word) && /^\s+being\b/i.test(paragraph.slice(end))) continue;
      if (editedProseFalseAlarm(paragraph, forHarper, offset, end, word, kind, replacements, lint.message())) continue;
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
  // A quotation in another language ("simple mais efficace", "Zur Elektrodynamik bewegter
  // Körper"): its words are not English typos.
  for (const q of paragraph.matchAll(/["“„«]([^"“”„«»\n]{2,200})["”»]/g)) {
    const qStart = q.index + 1;
    const qEnd = qStart + q[1].length;
    const inside = (m) => m.category === "spelling" && m.offset >= qStart && m.offset + m.length <= qEnd;
    const words = q[1].match(/[\p{L}]+/gu) ?? [];
    if (out.some((m) => inside(m) && EN_FOREIGN_FUNCTION.test(m.word)) ||
        out.some(inside) && words.filter((w) => EN_FOREIGN_FUNCTION.test(w)).length >= 2) {
      for (let k = out.length - 1; k >= 0; k--) if (inside(out[k])) out.splice(k, 1);
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
    // "greek food", "trip to paris": a common word the dictionary only knows with
    // its capital is that name, not "geek" or "pairs" (but "finnish" -> "finish",
    // a word sixty times more frequent; frequencies are log10 counts).
    const named = m.category === "spelling" && /^\p{Ll}+$/u.test(m.word) && !rare &&
      frequency(m.word) >= Math.max(0, ...m.replacements.slice(0, 3).map(frequency)) - 1 &&
      await lintCount(m.word) > 0 && await lintCount(m.word[0].toUpperCase() + m.word.slice(1)) === 0;
    if (named) {
      const name = m.word[0].toUpperCase() + m.word.slice(1);
      m.replacements = [name, ...m.replacements.filter((r) => r !== name)];
      m.message = "Names of people, places, languages and nationalities take a capital letter.";
    } else if (oneWord && m.category !== "typo" && (m.category === "spelling" || rare || contractionFor(m.word))) {
      if (ranked++ < MAX_RANKED && performance.now() < deadline) m.replacements = await rankSpelling(paragraph, m);
      if (rare || contractionFor(m.word)) {
        m.category = "spelling";
        m.label = CATEGORY_LABEL.spelling;
      }
    }
    // "They're", "They’re" and "They're " are the same suggestion: keep one,
    // written with the apostrophe the user types.
    const curly = /’/.test(paragraph);
    const seen = new Set();
    m.replacements = m.replacements
      .map((r) => (curly ? r.replace(/'/g, "’") : r.replace(/’/g, "'")))
      .filter((r) => !seen.has(r.trim()) && seen.add(r.trim()))
      .slice(0, MAX_SUGGESTIONS);
  }
  return out;
}

// Checks English text; paragraphs are separated by "\n".
export async function check(text) {
  await init();
  // Tokens over 40 characters are hashes, keys or encoded data, never words:
  // blanked (same length, so offsets hold) instead of costing seconds.
  const original = text;
  // Code (`npm install`, config.json, fetchUser) is not English prose: blanked too.
  text = self.fcMaskCode(text).replace(/\S{41,}/g, (s) => " ".repeat(s.length))
    // "déjà vu", "café au lait": borrowed phrases are not English to check.
    .replace(self.FC_LOAN_PHRASES, (s) => " ".repeat(s.length));
  const matches = [];
  let paraStart = 0;
  let prevEnd = "";
  const paragraphs = text.split("\n");
  for (const [index, paragraph] of paragraphs.entries()) {
    if (paragraph.trim()) {
      // Usually only one paragraph changed since the last check.
      let cached = paragraphCache.get(paragraph);
      if (!cached) {
        const harper = await lintParagraph(paragraph);
        const own = englishRules(paragraph, harper, frequency);
        // "the mane entrance", "hard word": a slip inside a set phrase.
        for (const s of self.fcCollocationSlips(paragraph, "en")) {
          if (own.some((m) => m.offset < s.end && s.start < m.offset + m.length)) continue;
          own.push({
            override: true,
            offset: s.start,
            length: s.end - s.start,
            word: s.word,
            message: `Did you mean “${s.fix}”?`,
            replacements: [s.fix],
            ruleId: "FC_EN_COLLOCATION",
            category: "grammar",
            label: CATEGORY_LABEL.grammar,
          });
        }
        const overriding = own.filter((m) => m.override);
        // "be there form 9 to 5": "their form" only reads as a noun phrase because of the
        // typo we fix next to it; Harper's there/their swap goes.
        const beforeOwnFix = (h) => /^(there|their|they're)$/i.test(h.word ?? paragraph.slice(h.offset, h.offset + h.length)) &&
          own.some((o) => o.override && /^\s+$/.test(paragraph.slice(h.offset + h.length, o.offset)));
        const kept = harper.filter((h) => !overriding.some((o) => o.offset < h.offset + h.length && h.offset < o.offset + o.length) && !beforeOwnFix(h));
        cached = [...kept, ...own];
        if (paragraphCache.size >= 500) paragraphCache.clear();
        paragraphCache.set(paragraph, cached);
      }
      // Copies: the sentence rules may adjust them, the cache must stay as is.
      // A line continuing the previous one ("…in a tin box / and read them"): no capital to ask for.
      const continues = /[\p{L}\p{N},;:]/u.test(prevEnd);
      const own = cached
        .filter((m) => !(continues && m.ruleId === "EN_Capitalization" && !paragraph.slice(0, m.offset).trim()))
        .map((m) => ({ ...m, replacements: [...m.replacements] }));
      const all = [...own, ...fcSentenceRules(paragraph, own, null, prevEnd, "en", fcNextStart(paragraphs, index), original.slice(paraStart, paraStart + paragraph.length))];
      for (const m of all.sort((a, b) => a.offset - b.offset)) matches.push({ ...m, offset: paraStart + m.offset });
      // "search engines (such as Google Search)": a list item closed by a bracket ends on its word.
      prevEnd = paragraph.trimEnd().replace(/(?<=[\p{L}\p{N}])[)\]]+$/u, "").slice(-1);
    }
    paraStart += paragraph.length + 1;
  }
  // Nothing about the blanks themselves ("multiple spaces").
  // A grammar match right before a blanked URL or code ("Go to https://… now" read as
  // "Go to now"): the context it judged was not there.
  const beforeMask = (m) => {
    let j = m.offset + m.length;
    while (j < original.length && /[ \t]/.test(original[j])) j++;
    return j < original.length && text[j] === " " && original[j] !== " ";
  };
  // A capital asked for right after a blanked name ("DeepMind developed", "McCarthy defines"):
  // the sentence did not start there.
  const afterMask = (m) => {
    let j = m.offset - 1;
    while (j >= 0 && /[ \t]/.test(original[j])) j--;
    return j >= 0 && text[j] === " " && /[\p{L}\p{N}]/u.test(original[j]);
  };
  return matches.filter((m) => original.slice(m.offset, m.offset + m.length) === m.word && !(m.category !== "spelling" && beforeMask(m)) &&
    !(m.ruleId === "EN_Capitalization" && afterMask(m)));
}
