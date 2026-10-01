// Context-aware ranking of suggestions, on top of Grammalecte.
//
// Grammalecte's spell checker suggests words without looking at the sentence
// or at how common they are, and its grammar rules often miss the right verb
// form (e.g. "je viens te parlé" only offers "parle | parlait | parla").
// We fix this by:
//   1. adding candidates: homophone verb forms ("parlé" -> "parler") and
//      elided forms for a forgotten apostrophe ("jai" -> "j’ai"),
//   2. putting each candidate back into the sentence, with the earlier errors
//      already corrected, and re-running the grammar checker on it,
//   3. ranking by remaining errors, then by a typing cost that makes forgotten
//      accents and apostrophes cheap, favours frequent words and homophones.
//
// Loaded by the worker after Grammalecte; uses its globals.

/* global gc_engine, conj */
/* exported fcRankSuggestions, fcClearRankingCache, fcIsCascadeError, fcHasErrorAt,
   fcLoadFrequencies, fcElisionCandidates, fcFrequency */

const FC_RANK_MAX_CANDIDATES = 16;
const FC_RANK_CACHE_SIZE = 5000;
const FC_TENSES = [":P", ":Q", ":Ip", ":Iq", ":Is", ":If", ":K", ":Sp", ":Sq", ":E"];
const FC_PERSONS = [":1s", ":1ś", ":2s", ":3s", ":1p", ":2p", ":3p", ":m:s", ":f:s", ":m:p", ":f:p"];
const FC_SENTENCE_END = /[.!?…]/;
const FC_ELISION_PREFIXES = ["jusqu", "lorsqu", "puisqu", "quoiqu", "qu", "j", "l", "d", "n", "s", "c", "m", "t"];
const FC_VOWEL_START = /^[aeiouyhàâäéèêëîïôöùûüœæ]/i;

// Weights of the ranking cost (lower cost = better suggestion).
const FC_FREQ_WEIGHT = 0.3; // per log10 of corpus occurrences
const FC_SOUND_BONUS = 0.5; // spelling: candidate sounds like the typo
const FC_EXTRA_PENALTY = 0.2; // candidate we generated, not from Grammalecte
const FC_ORDER_WEIGHT = 0.15; // per position in Grammalecte's own list

const fcErrorCountCache = new Map(); // sentence -> error spans
const fcFrequencies = new Map(); // lowercase word -> log10(occurrences)

function fcClearRankingCache() {
  fcErrorCountCache.clear();
}

// Frequent words grouped by their first letter without accent, to find
// candidates the spell checker misses ("aujourdui" -> "aujourd’hui").
const fcFrequentByInitial = new Map();

// `text` is "word count" per line, most frequent first.
function fcLoadFrequencies(text) {
  for (const line of text.split("\n")) {
    const space = line.indexOf(" ");
    if (space <= 0) continue;
    const word = line.slice(0, space).replace(/'/g, "’");
    const freq = Math.log10(Number(line.slice(space + 1)) + 1);
    fcFrequencies.set(word, freq);
    const plain = fcPlain(word);
    if (!plain) continue;
    if (!fcFrequentByInitial.has(plain[0])) fcFrequentByInitial.set(plain[0], []);
    fcFrequentByInitial.get(plain[0]).push({ word, plain });
  }
}

// Lowercase, no accents, no apostrophes: "Aujourd’hui" -> "aujourdhui".
function fcPlain(word) {
  return word.toLowerCase().normalize("NFD").replace(/[̀-ͯ’'-]/g, "");
}

// Plain Levenshtein distance, or max + 1 as soon as it exceeds `max`.
function fcWithin(a, b, max) {
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

const fcNeighbourCache = new Map();

// Frequent dictionary words within a small typing distance of `word`.
function fcFrequentNeighbours(spellChecker, word, limit = 3) {
  const lower = word.toLowerCase();
  let found = fcNeighbourCache.get(lower);
  if (!found) {
    const plain = fcPlain(lower);
    const scored = [];
    for (const { word: candidate, plain: p } of fcFrequentByInitial.get(plain[0]) ?? []) {
      // Cheap filter on accent-free forms, exact typing cost on the survivors.
      if (candidate === lower || fcWithin(plain, p, 2) > 2) continue;
      const distance = fcTypingDistance(lower, candidate);
      if (distance <= 1.6) scored.push([candidate, distance - FC_FREQ_WEIGHT * fcFrequency(candidate)]);
    }
    found = scored
      .sort((a, b) => a[1] - b[1])
      .map(([c]) => c)
      .filter((c) => spellChecker.isValid(c) || spellChecker.isValid(c.replace(/’/g, "'")))
      .slice(0, limit);
    if (fcNeighbourCache.size > 5000) fcNeighbourCache.clear();
    fcNeighbourCache.set(lower, found);
  }
  return found.map((c) => fcMatchCase(word, c));
}

// Elided forms are scored on the word after the apostrophe ("j’ai" -> "ai").
function fcFrequency(word) {
  const lower = word.toLowerCase().replace(/'/g, "’");
  const direct = fcFrequencies.get(lower) ?? fcFrequencies.get(lower.replace(/’/g, "'"));
  if (direct !== undefined) return direct;
  const apos = lower.indexOf("’");
  return apos > 0 ? fcFrequencies.get(lower.slice(apos + 1)) ?? 0 : 0;
}

// Rough French pronunciation key, good enough to tell that "parlé", "parler"
// and "parlez" sound the same while "parle" and "parlait" do not.
function fcSoundKey(word) {
  return word
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/(ées|ée|és|é|er|ez)$/, "1")
    .replace(/(aient|ais|ait|ai|ès|êt|est|et)$/, "2")
    .replace(/(?<!i)ent$/, "")
    .replace(/(es|e|s|t|x|d)$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^h/, "")
    .replace(/(.)\1+/g, "$1");
}

const fcBase = (ch) => ch.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Edit distance where the slips people make most are cheap: a missing or
// wrong accent, a forgotten apostrophe, hyphen or silent "h", swapped letters.
function fcTypingDistance(a, b) {
  a = a.toLowerCase().replace(/'/g, "’");
  b = b.toLowerCase().replace(/'/g, "’");
  const indel = (ch) => (ch === "’" || ch === "-" || ch === " " ? 0.3 : ch === "h" ? 0.5 : 1);
  const sub = (x, y) => (x === y ? 0 : fcBase(x) === fcBase(y) ? 0.2 : 1);
  const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) d[i][0] = d[i - 1][0] + indel(a[i - 1]);
  for (let j = 1; j <= b.length; j++) d[0][j] = d[0][j - 1] + indel(b[j - 1]);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + indel(a[i - 1]),
        d[i][j - 1] + indel(b[j - 1]),
        d[i - 1][j - 1] + sub(a[i - 1], b[j - 1])
      );
      // Doubling or undoubling a letter: "dévelloper", "rettard".
      if (i > 1 && a[i - 1] === a[i - 2]) d[i][j] = Math.min(d[i][j], d[i - 1][j] + 0.5);
      if (j > 1 && b[j - 1] === b[j - 2]) d[i][j] = Math.min(d[i][j], d[i][j - 1] + 0.5);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 0.8);
      }
    }
  }
  return d[a.length][b.length];
}

// Spelling patterns people confuse, tried on the typo before measuring.
const FC_CONFUSIONS = [
  [/ction/g, "xion"], [/xion/g, "ction"], [/ph/g, "f"], [/f/g, "ph"],
  [/an/g, "en"], [/en/g, "an"], [/ai/g, "è"], [/è/g, "ai"], [/au/g, "o"], [/o/g, "au"],
];

function fcSpellingCost(typo, candidate) {
  let best = fcTypingDistance(typo, candidate);
  for (const [from, to] of FC_CONFUSIONS) {
    const variant = typo.toLowerCase().replace(from, to);
    if (variant !== typo.toLowerCase()) best = Math.min(best, 0.4 + fcTypingDistance(variant, candidate));
  }
  return best;
}

const FC_AFTER_SI = /(^|[\s,;:(])si\s+(j’|j'|je\s|tu\s|il\s|elle\s|on\s|nous\s|vous\s|ils\s|elles\s)\s*$/i;

function fcIsImperfect(spellChecker, word) {
  return spellChecker.getMorph(word.toLowerCase()).some((m) => m.includes(":Iq"));
}

function fcMatchCase(model, word) {
  if (model.length > 1 && model === model.toUpperCase()) return word.toUpperCase();
  if (model[0] && model[0] === model[0].toUpperCase() && model[0] !== model[0].toLowerCase()) {
    return word[0].toUpperCase() + word.slice(1);
  }
  return word;
}

function fcSpellSuggestions(spellChecker, word, limit) {
  const out = [];
  for (const list of spellChecker.suggest(word, limit)) {
    for (const s of list) {
      if (!out.includes(s)) out.push(s);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// "jai" -> "j’ai", "lecole" -> "l’école", "dabitude" -> "d’habitude".
function fcElisionCandidates(spellChecker, word) {
  const lower = word.toLowerCase();
  const out = [];
  for (const prefix of FC_ELISION_PREFIXES) {
    if (!lower.startsWith(prefix) || lower.length <= prefix.length) continue;
    const head = word.slice(0, prefix.length);
    const rest = word.slice(prefix.length);
    // The rest may itself lack an accent or an "h": "lecole", "dabitude".
    const tails = (spellChecker.isValid(rest)
      ? [rest]
      : fcSpellSuggestions(spellChecker, rest, 4).filter((s) => fcTypingDistance(rest, s) <= 1)
    ).filter((t) => FC_VOWEL_START.test(t));
    for (const tail of tails) {
      const candidate = `${head}’${tail}`;
      if (!out.includes(candidate)) out.push(candidate);
    }
    if (out.length) break; // the longest matching prefix wins ("qu" before "q")
  }
  return out;
}

// Every conjugated form that sounds like `word`, among the verbs that any of
// `sources` can be a form of. For a known word the source is the word itself;
// for a misspelling it is the spell checker's suggestions ("vien" -> "viens"
// -> venir -> "viennes").
function fcHomophoneVerbForms(spellChecker, word, sources) {
  const key = fcSoundKey(word);
  const lemmas = new Set();
  for (const source of sources) {
    for (const morph of spellChecker.getMorph(source.toLowerCase())) {
      if (!morph.startsWith(">") || !morph.includes(":V")) continue;
      const lemma = morph.slice(1, morph.indexOf("/"));
      if (conj.isVerb(lemma)) lemmas.add(lemma);
    }
  }
  const out = [];
  for (const lemma of lemmas) {
    const forms = [lemma];
    for (const tense of FC_TENSES) {
      for (const who of FC_PERSONS) {
        try {
          const form = conj.getConj(lemma, tense, who);
          if (form) forms.push(form);
        } catch {
          // This tense/person pair does not exist for this verb.
        }
      }
    }
    for (const form of forms) {
      if (form !== word && fcSoundKey(form) === key && !out.includes(form)) out.push(form);
    }
  }
  return out.map((f) => fcMatchCase(word, f));
}

function fcSentenceBounds(text, start, end) {
  let s = start;
  while (s > 0 && !FC_SENTENCE_END.test(text[s - 1])) s--;
  let e = end;
  while (e < text.length && !FC_SENTENCE_END.test(text[e])) e++;
  return [s, Math.min(e + 1, text.length)];
}

// Grammar errors of a sentence, as [start, end] pairs.
function fcSentenceErrors(sentence) {
  let spans = fcErrorCountCache.get(sentence);
  if (spans === undefined) {
    spans = gc_engine.parse(sentence, "FR", false, null, false).map((e) => [e.nStart, e.nEnd]);
    if (fcErrorCountCache.size >= FC_RANK_CACHE_SIZE) fcErrorCountCache.clear();
    fcErrorCountCache.set(sentence, spans);
  }
  return spans;
}

function fcCountErrors(sentence) {
  return fcSentenceErrors(sentence).length;
}

function fcHasErrorAt(text, start, length) {
  const [s, e] = fcSentenceBounds(text, start, start + length);
  const a = start - s;
  const b = a + length;
  return fcSentenceErrors(text.slice(s, e)).some(([x, y]) => x < b && a < y);
}

// True when a grammar error only existed because of an earlier error in the
// same sentence ("Il ma dit" flags "dit" because of "ma"; once "m’a" is fixed
// the error is gone). Rules that only fire on whole paragraphs are kept.
function fcIsCascadeError(original, originalStart, fixed, fixedStart, length) {
  return (
    fcHasErrorAt(original, originalStart, length) &&
    !fcHasErrorAt(fixed, fixedStart, length)
  );
}

// Rank the suggestions for the error text.slice(start, start + length).
// `text` should already contain the best fix for the errors before it.
function fcRankSuggestions(spellChecker, text, start, length, suggestions, isSpelling) {
  const word = text.slice(start, start + length);
  const isWord = /^[\p{L}’'-]+$/u.test(word);
  const extras = [];
  if (isWord) {
    const sources = isSpelling ? suggestions.slice(0, 5) : [word];
    extras.push(...fcHomophoneVerbForms(spellChecker, word, sources).slice(0, 6));
    if (isSpelling || !suggestions.length) extras.push(...fcElisionCandidates(spellChecker, word));
    if (isSpelling) extras.push(...fcFrequentNeighbours(spellChecker, word));
  }
  const wordIsLower = word === word.toLowerCase();
  const candidates = [...new Set([...suggestions.slice(0, 8), ...extras])]
    .filter((c) => c !== word)
    // Drop "VIe"-style forms (roman numerals, acronyms) for a lowercase word.
    .filter((c) => !wordIsLower || c.slice(1) === c.slice(1).toLowerCase())
    .slice(0, FC_RANK_MAX_CANDIDATES);
  if (candidates.length <= 1) return candidates;

  const [s, e] = fcSentenceBounds(text, start, start + length);
  const before = text.slice(s, start);
  const after = text.slice(start + length, e);
  const baseline = fcCountErrors(before + word + after);
  const wordKey = fcSoundKey(word);
  const afterSi = !isSpelling && FC_AFTER_SI.test(before);

  const scored = candidates.map((c) => {
    const index = suggestions.indexOf(c);
    const extra = index < 0;
    const sound = fcSoundKey(c) === wordKey ? 1 : 0;
    let cost = fcSpellingCost(word, c) - FC_FREQ_WEIGHT * fcFrequency(c);
    // Elided forms ("j’ai" for "jai") are as trustworthy as Grammalecte's own.
    if (extra && !c.includes("’")) cost += FC_EXTRA_PENALTY;
    if (!extra) cost += FC_ORDER_WEIGHT * index;
    if (isSpelling) cost -= FC_SOUND_BONUS * sound;
    return {
      c,
      extra,
      errors: fcCountErrors(before + c + after),
      caseChange: wordIsLower !== (c === c.toLowerCase()) ? 1 : 0,
      // For grammar errors, sounding the same is the strongest hint:
      // "parlé" -> "parler" rather than "parle".
      // "si" + conditional is a classic: "si j’aurais" -> "si j’avais".
      soundTier: isSpelling ? 0 : afterSi ? (fcIsImperfect(spellChecker, c) ? 0 : 1) : 1 - sound,
      cost,
    };
  });

  // Our own additions must do at least as well as what Grammalecte proposed.
  // An unknown word is invisible to the grammar rules, so for spelling errors
  // compare with the best original suggestion rather than with the typo.
  const originals = scored.filter((x) => !x.extra).map((x) => x.errors);
  const bestOriginal = originals.length ? Math.min(...originals) : Infinity;
  const bar = isSpelling ? bestOriginal : Math.min(baseline - 1, bestOriginal);

  return scored
    .filter((x) => !x.extra || x.errors <= bar)
    .sort((a, b) =>
      a.errors - b.errors ||
      a.caseChange - b.caseChange ||
      a.soundTier - b.soundTier ||
      a.cost - b.cost
    )
    .map((x) => x.c);
}
