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
    const heard = fcHeardKeys(lower);
    // A silent "h" left out: "otel" -> "hôtel".
    const initials = FC_VOWEL_START.test(plain) ? [plain[0], "h"] : [plain[0]];
    for (const { word: candidate, plain: p } of initials.flatMap((i) => fcFrequentByInitial.get(i) ?? [])) {
      // Cheap filter on accent-free forms, exact typing cost on the survivors.
      // Further away when it sounds the same: "resonnable" -> "raisonnable".
      if (candidate === lower) continue;
      const within = fcWithin(plain, p, 3);
      if (within > 3) continue;
      const sound = fcSoundsLike(heard, fcHeardKeys(candidate));
      if (within > 2 && !sound) continue;
      const distance = fcTypingDistance(lower, candidate);
      if (distance <= 1.6 || sound) {
        scored.push([candidate, distance - FC_SOUND_BONUS * sound - FC_FREQ_WEIGHT * fcFrequency(candidate)]);
      }
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

// Looser keys for misspellings, written as heard: "magnifik" and "magnifique",
// "otel" and "hôtel", "resonnable" and "raisonnable" sound the same. A final
// "é" is heard ("acheté" is not "achète"). An "s" between vowels sounds "z",
// but people often write it for "ss" ("dosier"): both readings are kept.
function fcHeardKeys(word) {
  const key = (w) => w
    .replace(/(?<!c)h/g, "")
    .replace(/[ae][nm](?![aeiouyéèênm])/g, "an")
    .replace(/[aeu]?[iy][nm](?![aeiouyéèênm])/g, "in")
    .replace(/(ai|ei|è|ê|ë)/g, "e")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1")
    .replace(/(?<!i)ent$/, "")
    .replace(/(es|e|s|t|x|d)$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const base = word
    .toLowerCase()
    .replace(/['’\- ]/g, "")
    .replace(/(er|ez)$/, "é")
    .replace(/e?au/g, "o")
    .replace(/ph/g, "f")
    .replace(/(qu|ck|q|c(?=[aouàâôûùlrtkc]|$))/g, "k")
    .replace(/(c(?=[eiyéèêëîï])|ç)/g, "s")
    .replace(/g(?=[eiyéèêëîï])/g, "j")
    .replace(/gu(?=[eiyéèê])/g, "g");
  return [key(base), key(base.replace(/(?<=[aeiouyàâéèêëîïôûù])s(?=[aeiouyàâéèêëîïôûù])/g, "z"))];
}

function fcSoundsLike(keys, other) {
  return keys[0] === other[0] || keys[1] === other[1];
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
  // An ending written as heard: "magnifik", "informatic" -> "-ique".
  [/[kc]$/, "que"],
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
  // Text without punctuation can be one huge "sentence": a few words around
  // the error are enough context, and keep each check fast.
  if (start - s > FC_CONTEXT_CHARS) s = text.lastIndexOf(" ", start - FC_CONTEXT_CHARS) + 1;
  if (e - end > FC_CONTEXT_CHARS) {
    const cut = text.indexOf(" ", end + FC_CONTEXT_CHARS);
    if (cut > 0) e = cut - 1;
  }
  return [s, Math.min(e + 1, text.length)];
}
const FC_CONTEXT_CHARS = 250;

// Grammar errors of a sentence, as [start, end, first suggestion].
function fcSentenceErrors(sentence) {
  let spans = fcErrorCountCache.get(sentence);
  if (spans === undefined) {
    spans = gc_engine.parse(sentence, "FR", false, null, false).map((e) => [e.nStart, e.nEnd, e.aSuggestions?.[0]]);
    if (fcErrorCountCache.size >= FC_RANK_CACHE_SIZE) fcErrorCountCache.clear();
    fcErrorCountCache.set(sentence, spans);
  }
  return spans;
}

function fcCountErrors(sentence) {
  return fcSentenceErrors(sentence).length;
}

// Errors of a sentence once the ones at least a word away from [a, b) (the
// candidate) take their first suggestion. A good fix can bring out another
// real mistake that the original error hid: "sont à nouveau commandable" now
// shows that "commandable" needs an s, while "sont as nouveau commandable"
// only confuses the rules into silence. Both then count as clean, and the
// usual order decides. An error next to the candidate is about the candidate
// ("au balles"), so it counts.
function fcErrorsAfterRepair(sentence, a, b) {
  const spans = fcSentenceErrors(sentence);
  const away = (x, y) => /\p{L}\s/u.test(sentence.slice(b, x)) || /\s\p{L}/u.test(sentence.slice(y, a));
  if (!spans.length || spans.some(([x, y, fix]) => !fix || !away(x, y))) return spans.length;
  let fixed = sentence;
  let limit = Infinity;
  for (const [x, y, fix] of [...spans].sort((p, q) => q[0] - p[0])) {
    if (y > limit) return spans.length;
    fixed = fixed.slice(0, x) + fix + fixed.slice(y);
    limit = x;
  }
  return Math.min(spans.length, fcCountErrors(fixed));
}

// Errors of a sentence with a spelling candidate at `a`, minus a missing hyphen
// right after it: that is a mistake of its own, shown once the word is fixed.
// "achete toi" -> "achète" (then "achète-toi"), not "acheté" that hides it.
function fcErrorsForWord(sentence, a) {
  return fcSentenceErrors(sentence).filter(
    ([x, y, fix]) => !(x === a && fix && / /.test(sentence.slice(x, y)) && fix === sentence.slice(x, y).replace(/ /g, "-"))
  );
}

function fcCountErrorsForWord(sentence, a) {
  return fcErrorsForWord(sentence, a).length;
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

const FC_SKIP_IN_VERB_GROUP = /^(ne|n|pas|plus|jamais|bien|déjà|toujours|vraiment|très|tous|toutes|enfin|encore|aussi|me|m|te|t|se|s|lui|leur|y|en|d|de)$/i;
const FC_COMPLEMENT_MARK = /^(de|d|du)$/i;
const FC_STOP_WORD = /^(pourquoi|quand|comme|si|et|ou|mais|car|donc|parce|lorsque|puisque|où|qui|que|qu|dont|quoi)$/i;
const FC_PRONOUN_AGREEMENT = { il: ["m", "s"], ils: ["m", "p"], elle: ["f", "s"], elles: ["f", "p"] };

// Gender and number of a noun as written: "la literie" (f, s), "des frais" (m, p).
// An epicene noun takes its gender from the determiner ("une somme").
function fcNounAgreement(spellChecker, words, i) {
  const morphs = spellChecker.getMorph(words[i].toLowerCase()).map((m) => m.match(/:N:([mfe]):([spi])/)).filter(Boolean);
  if (!morphs.length) return null;
  const genders = new Set(morphs.map((m) => m[1]));
  const numbers = new Set(morphs.map((m) => m[2]));
  const det = (words[i - 1] ?? "").toLowerCase();
  let g = genders.size === 1 && !genders.has("e") ? [...genders][0] : null;
  if (!g && genders.size === 1) g = /^(la|une|cette|ma|ta|sa)$/.test(det) ? "f" : /^(le|un|ce|cet)$/.test(det) ? "m" : null;
  let n = numbers.size === 1 && !numbers.has("i") ? [...numbers][0] : null;
  // "des frais", "le prix": the determiner tells the number of an invariable noun.
  if (!n) n = /^(les|des|ces|mes|tes|ses|nos|vos|leurs|plusieurs|quelques)$/.test(det) ? "p" : /^(le|la|un|une|ce|cet|cette|mon|ton|son|ma|ta|sa)$/.test(det) ? "s" : null;
  return g || n ? [g, n] : null;
}

// What a participle right after the error's auxiliary should agree with, as [gender, number]
// (either may be null), or null when the sentence does not say:
// - after "être", "été": the subject, skipping the complements in "de"
//   ("la literie mériterait d’être changé" -> f, s; "des frais de tenue de compte m’ont
//   été prélevé" -> m, p);
// - after "avoir" in a relative clause: the noun before "que" ("sa fille, qu’il n’a jamais
//   oublié" -> f, s). Not an adverb there: "la réunion de demain que j’ai rédigé" says nothing.
function fcAgreementTarget(spellChecker, before) {
  const words = before.match(/[\p{L}-]+|[,;:]/gu) ?? [];
  let i = words.length - 1;
  let aux = null;
  while (i >= 0) {
    const w = words[i].toLowerCase();
    if (/^(être|été|suis|es|est|sommes|êtes|sont|étais|était|étions|étiez|étaient|serai|seras|sera|serons|serez|seront|serais|serait|serions|seriez|seraient|soit|soient|fut|furent)$/.test(w)) aux = aux ?? "être";
    else if (/^(ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient|aurai|auras|aura|aurons|aurez|auront|aurais|aurait|aurions|auriez|auraient|ait|aient|eu|avoir)$/.test(w)) aux = aux ?? "avoir";
    else if (!FC_SKIP_IN_VERB_GROUP.test(w) && !(aux && spellChecker.getMorph(w).some((m) => /:V/.test(m)) &&
               !spellChecker.getMorph(w).some((m) => /:[NG]/.test(m)))) break;
    i--;
  }
  if (!aux) return null;
  if (aux === "avoir") {
    // The subject of the relative clause, then "que".
    while (i >= 0 && !/^(que|qu)$/i.test(words[i]) && /^(je|j|tu|il|elle|on|nous|vous|ils|elles)$/i.test(words[i])) i--;
    if (i < 1 || !/^(que|qu)$/i.test(words[i])) return null;
    i--;
    if (words[i] === ",") i--;
    return i >= 0 ? fcNounAgreement(spellChecker, words, i) : null;
  }
  for (; i >= 0; i--) {
    const w = words[i].toLowerCase();
    if (FC_STOP_WORD.test(w) || /^[,;:]$/.test(w)) return null;
    if (FC_PRONOUN_AGREEMENT[w]) return FC_PRONOUN_AGREEMENT[w];
    if (/^(je|j|tu|on|nous|vous)$/.test(w)) return null;
    const noun = fcNounAgreement(spellChecker, words, i);
    if (!noun) continue;
    // A complement: "de tenue", "du compte", "la tenue des comptes".
    const prev = (words[i - 1] ?? "").toLowerCase();
    if (FC_COMPLEMENT_MARK.test(prev) || prev === "des" && i > 1 && fcNounAgreement(spellChecker, words, i - 2)) continue;
    return noun;
  }
  return null;
}

// The form a grammar rule asks for in its message, as a test on a morphology
// (":V1_…:Ip:3p", ":Q:A:f:s"), or null: "Accord avec “Les pneus…”. Le verbe devrait
// être à la 3ᵉ personne du pluriel." -> "tiennent", not "tiens".
function fcMessageNeeds(message) {
  const person = message.match(/devrait être à la (1|2|3)(?:ʳᵉ|ᵉ) personne du (singulier|pluriel)/);
  if (person) {
    const tag = `:${person[1]}${person[2][0]}`;
    return (m) => m.includes(tag) || tag === ":1s" && m.includes(":1ś");
  }
  const agreement = message.match(/devrait être (?:un participe passé |au )(masculin |féminin )?(singulier|pluriel)?/);
  if (!agreement || !agreement[1] && !agreement[2]) return null;
  const g = agreement[1]?.[0];
  const n = agreement[2]?.[0];
  return (m) => {
    const x = m.match(/:([mfe]):([spi])/);
    return !!x && (!g || x[1] === g || x[1] === "e") && (!n || x[2] === n || x[2] === "i");
  };
}

// Rank the suggestions for the error text.slice(start, start + length).
// `text` should already contain the best fix for the errors before it.
// `message` is the rule message, for the form it asks for.
function fcRankSuggestions(spellChecker, text, start, length, suggestions, isSpelling, message = "") {
  const word = text.slice(start, start + length);
  const isWord = /^[\p{L}’'-]+$/u.test(word);
  const extras = [];
  if (isWord) {
    const sources = isSpelling ? suggestions.slice(0, 5) : [word];
    extras.push(...fcHomophoneVerbForms(spellChecker, word, sources).slice(0, 6));
    // Not when only an accent is wrong: "Leve" is "Lève", not "L’Eve".
    const accentOnly = suggestions.some((s) => !/['’]/.test(s) && fcPlain(s) === fcPlain(word));
    if ((isSpelling || !suggestions.length) && !accentOnly) extras.push(...fcElisionCandidates(spellChecker, word));
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
  const wordHeard = fcHeardKeys(word);
  const afterSi = !isSpelling && FC_AFTER_SI.test(before);
  const accentless = /^[a-z]+$/i.test(word);
  // Forms of one participle or adjective ("changé | changés | changée"): the one that agrees.
  const target = isSpelling ? null : fcAgreementTarget(spellChecker, before);
  const agrees = (c) => spellChecker.getMorph(c).some((m) => {
    const x = m.match(/:[QA](?::A)?:([mfe]):([spi])/);
    return x && (!target[0] || x[1] === target[0] || x[1] === "e") && (!target[1] || x[2] === target[1] || x[2] === "i");
  });
  const needs = isSpelling ? null : fcMessageNeeds(message);
  const nameTyped = isSpelling && wordIsLower && word.length > 2 && suggestions[0]?.toLowerCase() === word &&
    !candidates.some((c) => c === c.toLowerCase() && fcPlain(c) === fcPlain(word));

  const scored = candidates.map((c) => {
    const index = suggestions.indexOf(c);
    const extra = index < 0;
    const sound = fcSoundKey(c) === wordKey ? 1 : 0;
    const typing = fcTypingDistance(word, c);
    const spelling = fcSpellingCost(word, c);
    let cost = spelling - FC_FREQ_WEIGHT * fcFrequency(c);
    // Spelling: a candidate that sounds like the typo ("magnifik" -> "magnifique"), unless a
    // known confusion already made it cheap: "fallus" -> "fallu", not "phallus". A word cut in
    // two always sounds the same: "couramant" -> "couramment", not "cou ramant".
    if (isSpelling && spelling >= typing && !c.includes(" ") && fcSoundsLike(wordHeard, fcHeardKeys(c))) cost -= FC_SOUND_BONUS;
    // Elided forms ("j’ai" for "jai") are as trustworthy as Grammalecte's own.
    if (extra && !c.includes("’")) cost += FC_EXTRA_PENALTY;
    if (!extra) cost += FC_ORDER_WEIGHT * index;
    return {
      c,
      extra,
      errors: isSpelling ? fcCountErrorsForWord(before + c + after, before.length) : fcCountErrors(before + c + after),
      repaired: isSpelling ? null : fcErrorsAfterRepair(before + c + after, before.length, before.length + c.length),
      // The very word with a capital is a name typed in lowercase ("en espagne" -> "Espagne",
      // not "es pagne"), unless a common word is only an accent away ("pres" -> "près").
      caseChange: wordIsLower !== (c === c.toLowerCase()) && !(nameTyped && c.toLowerCase() === word) ? 1 : 0,
      // Only accents missing ("etre" -> "être"): first, even when the right word brings out a
      // real mistake next to it ("pour être accepter") that a wrong one hides ("êtres").
      // Not when the word itself is then wrong: "Il appele" -> "appelle", not "appelé".
      accentOnly: isSpelling && accentless && fcBase(c) === word &&
        !fcErrorsForWord(before + c + after, before.length).some(([x, y]) => x < before.length + c.length && before.length < y) ? 0 : 1,
      // For grammar errors, sounding the same is the strongest hint:
      // "parlé" -> "parler" rather than "parle".
      // "si" + conditional is a classic: "si j’aurais" -> "si j’avais".
      soundTier: isSpelling ? 0 : afterSi ? (fcIsImperfect(spellChecker, c) ? 0 : 1) : 1 - sound,
      agreement: target && !agrees(c) ? 1 : 0,
      asked: needs && !spellChecker.getMorph(c.toLowerCase()).some(needs) ? 1 : 0,
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
      a.accentOnly - b.accentOnly ||
      (isSpelling ? a.errors - b.errors : a.repaired - b.repaired) ||
      a.caseChange - b.caseChange ||
      a.asked - b.asked ||
      a.soundTier - b.soundTier ||
      a.agreement - b.agreement ||
      a.cost - b.cost ||
      a.errors - b.errors
    )
    .map((x) => x.c);
}
