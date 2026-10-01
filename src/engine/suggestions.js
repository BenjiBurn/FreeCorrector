// Context-aware ranking of suggestions, on top of Grammalecte.
//
// Grammalecte's spell checker suggests words without looking at the sentence,
// and its grammar rules often miss the right verb form (e.g. "je viens te
// parlé" only offers "parle | parlait | parla"). We fix both by:
//   1. adding homophone verb forms as candidates ("parlé" -> "parler", "parlez"),
//   2. putting each candidate back into the sentence, with the earlier errors
//      already corrected, and re-running the grammar checker on it,
//   3. ranking by remaining errors, then case, sound and spelling similarity.
//
// Loaded by the worker after Grammalecte; uses its globals.

/* global gc_engine, conj */
/* exported fcRankSuggestions, fcClearRankingCache, fcIsCascadeError, fcHasErrorAt */

const FC_RANK_MAX_CANDIDATES = 14;
const FC_RANK_CACHE_SIZE = 5000;
const FC_TENSES = [":P", ":Q", ":Ip", ":Iq", ":Is", ":If", ":K", ":Sp", ":Sq", ":E"];
const FC_PERSONS = [":1s", ":1ś", ":2s", ":3s", ":1p", ":2p", ":3p", ":m:s", ":f:s", ":m:p", ":f:p"];
const FC_SENTENCE_END = /[.!?…]/;

const fcErrorCountCache = new Map(); // sentence -> error spans

function fcClearRankingCache() {
  fcErrorCountCache.clear();
}

// Rough French pronunciation key, good enough to tell that "parlé", "parler"
// and "parlez" sound the same while "parle" and "parlait" do not.
function fcSoundKey(word) {
  return word
    .toLowerCase()
    .replace(/(ées|ée|és|é|er|ez)$/, "1")
    .replace(/(aient|ais|ait|ai|ès|êt|et)$/, "2")
    .replace(/(?<!i)ent$/, "")
    .replace(/(es|e|s|t|x|d)$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(.)\1+/g, "$1");
}

function fcEditDistance(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

function fcMatchCase(model, word) {
  if (model.length > 1 && model === model.toUpperCase()) return word.toUpperCase();
  if (model[0] && model[0] === model[0].toUpperCase() && model[0] !== model[0].toLowerCase()) {
    return word[0].toUpperCase() + word.slice(1);
  }
  return word;
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
  const sources = isSpelling ? suggestions.slice(0, 5) : [word];
  const extras = fcHomophoneVerbForms(spellChecker, word, sources);
  const wordIsLower = word === word.toLowerCase();
  const candidates = [...new Set([...suggestions.slice(0, 8), ...extras.slice(0, 6)])]
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

  const scored = candidates.map((c, index) => ({
    c,
    index,
    extra: !suggestions.includes(c),
    errors: fcCountErrors(before + c + after),
    caseChange: wordIsLower !== (c === c.toLowerCase()) ? 1 : 0,
    sound: fcSoundKey(c) === wordKey ? 0 : 1,
    distance: fcEditDistance(word, c),
  }));

  // Our own additions must do at least as well as what Grammalecte proposed.
  // An unknown word is invisible to the grammar rules, so for spelling errors
  // compare with the best original suggestion rather than with the typo.
  const bestOriginal = Math.min(...scored.filter((x) => !x.extra).map((x) => x.errors));
  const bar = isSpelling ? bestOriginal : Math.min(baseline - 1, bestOriginal);

  return scored
    .filter((x) => !x.extra || x.errors <= bar)
    .sort((a, b) =>
      a.errors - b.errors ||
      a.caseChange - b.caseChange ||
      a.sound - b.sound ||
      a.distance - b.distance ||
      a.index - b.index
    )
    .map((x) => x.c);
}
