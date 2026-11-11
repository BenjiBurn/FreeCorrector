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
  "confusions.js",
  "collocations.js",
  "rules.js",
  "informal.js",
  "mask.js",
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
  neg: "grammar",
  bs: "style", pleo: "style", eleu: "style",
  redon1: "style", redon2: "style",
};

// The missing "ne", from Grammalecte ("je sais pas") or our rules ("de pas le faire").
const FC_NEG_RULE = "g2__neg_ne_manquant";

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
    const frList = helpers.loadFile(new URL("../data/fr-freq.txt", self.location.href).href);
    fcLoadFrequencies(frList);
    loadEnglishLeaning(frList, helpers.loadFile(new URL("../data/en-freq.txt", self.location.href).href));
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
// Verb forms spelled as they sound: "fesait" (faisait), "disez" (dites).
// All the forms of that tense are offered: the ranking in context picks the
// person ("Ils fesait" -> faisaient).
const PHONETIC_VERBS = [
  [/^fes(ai[st]?|aient|ions|iez)$/, ["faisais", "faisait", "faisions", "faisiez", "faisaient"]],
  [/^fes(ons)$/, ["faisons"]],
  [/^(fesez|faisez|fesé)$/, ["faites"]],
  [/^disez$/, ["dites"]],
  [/^(venent|vienent)$/, ["viennent"]],
  [/^(prenent|prène|prènent)$/, ["prennent"]],
  [/^(comprenent)$/, ["comprennent"]],
  [/^(aprenent|apprenent)$/, ["apprennent"]],
  [/^(tienent)$/, ["tiennent"]],
  [/^(croivent|croyent)$/, ["croient"]],
  [/^(voyent|voivent)$/, ["voient"]],
  [/^(fesant)$/, ["faisant"]],
];

// Classic misspellings whose right form the dictionary's nearest words miss
// or rank too low.
const COMMON_MISSPELLINGS = {
  succinte: "succincte", dilemne: "dilemme", rénumération: "rémunération", aréoport: "aéroport",
  infractus: "infarctus", pécunier: "pécuniaire", apparament: "apparemment", notament: "notamment",
  sincérement: "sincèrement", aquérir: "acquérir", acceuil: "accueil", acceuillir: "accueillir",
  receuil: "recueil", receuillir: "recueillir", bizzare: "bizarre", language: "langage", example: "exemple",
  connection: "connexion", addresse: "adresse", developpement: "développement", dévellopement: "développement",
  environement: "environnement", personnelement: "personnellement", professionel: "professionnel",
  traditionel: "traditionnel", exceptionel: "exceptionnel", rationel: "rationnel", fonctionel: "fonctionnel",
  occurence: "occurrence", résonnance: "résonance", vraissemblable: "vraisemblable", chaqu: "chaque",
  malgrés: "malgré", parmis: "parmi", hormi: "hormis", certe: "certes", jusqua: "jusqu’à", ormis: "hormis",
  onions: "oignons", onion: "oignon", qualitée: "qualité", économic: "économique", enviromnent: "environnement",
  enviroment: "environnement", envoierai: "enverrai", envoierais: "enverrais", envoiera: "enverra", envoierons: "enverrons", envoyerai: "enverrai", envoyeras: "enverras", envoyera: "enverra", envoyerons: "enverrons", envoyerez: "enverrez", envoyeront: "enverront", envoyerais: "enverrais", envoyerait: "enverrait", apartir: "à partir", envoiras: "enverras", envoira: "enverra", envoirai: "enverrai", envoirons: "enverrons", envoirez: "enverrez", envoiront: "enverront", prenu: "pris", prenus: "pris", acquéri: "acquis", acquéris: "acquis", "va-s-y": "vas-y", peindu: "peint", éteindu: "éteint", craindu: "craint", rejoindu: "rejoint", ouvri: "ouvert", offri: "offert", souffri: "souffert", mouru: "mort", naissu: "né", vivu: "vécu", résolvu: "résolu", qd: "quand",
  envoieront: "enverront", envoyerai: "enverrai", envoyerais: "enverrais", envoyera: "enverra", appercevoir: "apercevoir",
  // Regular endings put on irregular verbs.
  résoudu: "résolu", mouru: "mort", prendu: "pris", metté: "mis", mettu: "mis", ouvri: "ouvert", offri: "offert",
  souffri: "souffert", couvri: "couvert", découvri: "découvert", craindu: "craint", peindu: "peint", éteindu: "éteint",
  joindu: "joint", plaindu: "plaint", naissu: "né", vivu: "vécu", conclu: "conclu", recevu: "reçu", apercevu: "aperçu",
  boivé: "bu", buvé: "bu", savu: "su", pouvu: "pu", voulé: "voulu", asseyé: "assis", assoyé: "assis",
};

// Software and services typed in lowercase, missing from the dictionary ("un excel" -> Excel):
// the dictionary's nearest words are nonsense ("excès", "poseront"). Lowercase only: "Youtube"
// with its capital passes as a name.
const FC_BRANDS = Object.fromEntries([
  "Excel", "PowerPoint", "Outlook", "OneDrive", "SharePoint", "YouTube", "iPhone", "iPad", "WhatsApp",
  "LinkedIn", "Gmail", "Hotmail", "Yahoo", "Skype", "Slack", "Spotify", "PayPal", "Dropbox", "ChatGPT",
  "MacBook", "iOS", "macOS", "Messenger", "Twitch", "GitHub", "GitLab", "Jira", "Trello", "Canva",
  "Photoshop", "Doodle", "WordPress",
].map((b) => [b.toLowerCase(), b]));

// Plurals of -al / -ail nouns: "chevals" -> chevaux, "festivaux" -> festivals,
// "vitrails" -> vitraux, "jeus" -> jeux. Only when the result is a real word.
function irregularPlural(lower) {
  const tries = [];
  if (/als$/.test(lower)) tries.push(lower.replace(/als$/, "aux"));
  if (/aux$/.test(lower)) tries.push(lower.replace(/aux$/, "als"));
  if (/ails$/.test(lower)) tries.push(lower.replace(/ails$/, "aux"));
  if (/(eus|aus|eaus)$/.test(lower)) tries.push(lower.replace(/s$/, "x"));
  if (/(ous)$/.test(lower)) tries.push(lower.replace(/s$/, "x"));
  return tries.find((w) => spellChecker.isValidToken(w)) ?? null;
}

function spellSuggestions(word, before = "") {
  const lower = word.toLowerCase();
  const known = COMMON_MISSPELLINGS[lower] ?? irregularPlural(lower);
  if (known) {
    const fixed = word[0] === word[0].toUpperCase() ? known[0].toUpperCase() + known.slice(1) : known;
    const forms = [fixed];
    forms.only = [fixed];
    return forms;
  }
  // A name typed in lowercase: "chez paul", "en espagne", "à marseille".
  if (word === lower && word.length > 2) {
    const capitalized = word[0].toUpperCase() + word.slice(1);
    let known = false;
    try {
      // A proper noun of the dictionary, and no lowercase word only an accent away ("pres" is "près").
      known = spellChecker.isValidToken(capitalized) && spellChecker.getMorph(capitalized).some((m) => /:M/.test(m)) &&
        !fcSpellSuggestions(spellChecker, word, 4).some((s) => s !== capitalized && s === s.toLowerCase() && fcPlain(s) === fcPlain(word));
    } catch {
      known = false;
    }
    if (known) {
      const forms = [capitalized];
      forms.only = [capitalized];
      return forms;
    }
  }
  const phonetic = PHONETIC_VERBS.find(([re]) => re.test(lower));
  if (phonetic) {
    const forms = phonetic[1].map((f) => (word[0] === word[0].toUpperCase() ? f[0].toUpperCase() + f.slice(1) : f));
    forms.only = [...forms];
    return forms;
  }
  let out = fcSpellSuggestions(spellChecker, word, MAX_SPELL_SUGGESTIONS);
  // Only an accent wrong or missing ("treve", "trève" -> trêve): a candidate with
  // another first letter ("crève", "drève") is noise. ("Il appele" keeps "appelle".)
  if (out.some((s) => fcPlain(s) === fcPlain(lower))) out = out.filter((s) => fcPlain(s)[0] === fcPlain(lower)[0]);
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
// "Les équipes se sont bien organiser" -> organisées: when the fixes are the
// forms of one participle after a plural "être", pick the one that agrees
// with the subject noun found before it.
function agreeWithSubject(text, start, replacements) {
  if (replacements.length < 2) return replacements;
  const before = text.slice(Math.max(0, start - 80), start);
  const aux = before.match(/(?:^|\s)(sommes|êtes|sont|étaient|seront|serons|seraient)(\s+(bien|tous|toutes|déjà|vraiment|très|pas|jamais|enfin))*\s+$/);
  if (!aux) return replacements;
  const forms = replacements.map((r) => ({ r, morph: spellChecker.getMorph(r).find((x) => /:Q/.test(x)) ?? "" }));
  if (!forms[0].morph) return replacements;
  // The nearest noun before "être" gives the gender; "nous", "vous" give none.
  let gender = "m";
  const words = before.slice(0, aux.index).match(/[\p{L}’'-]+/gu) ?? [];
  for (const w of words.slice(-6).reverse()) {
    const noun = spellChecker.getMorph(w.toLowerCase()).find((x) => /:N:[mfe]:[pi]/.test(x));
    if (noun) {
      gender = noun.match(/:N:([mfe])/)[1] === "f" ? "f" : "m";
      break;
    }
    if (/^(ils|elles|nous|vous|on)$/i.test(w)) {
      gender = /^elles$/i.test(w) ? "f" : "m";
      break;
    }
  }
  const want = new RegExp(`:Q(:A)?:(${gender}|e):(p|i)`);
  const best = forms.find((f) => want.test(f.morph));
  return best ? [best.r, ...replacements.filter((r) => r !== best.r)] : replacements;
}

function preferParticiple(replacements, participles) {
  if (!participles?.length || !replacements.length) return replacements;
  const morphs = spellChecker.getMorph(replacements[0]);
  const finite = morphs.some((m) => /:V.*:(Ip|Iq|Is|If|K|Sp|Sq)/.test(m)) && !morphs.some((m) => /:(Q|A|N)/.test(m));
  if (!finite) return replacements;
  const best = replacements.find((r) => participles.includes(r));
  return best ? [best, ...replacements.filter((r) => r !== best)] : replacements;
}

// "et finalement tu prend une berline" -> prends, not "prennes": the
// subjunctive only comes after a "que" (or "qu’") earlier in the sentence.
function preferIndicative(text, start, replacements) {
  if (replacements.length < 2) return replacements;
  const before = text.slice(Math.max(0, start - 80), start).split(/[.!?;]/).pop();
  if (/(^|[^\p{L}])qu(e|’|')/iu.test(before)) return replacements;
  const subjunctiveOnly = (r) => {
    const morphs = spellChecker.getMorph(r);
    return morphs.some((m) => /:(Sp|Sq)/.test(m)) && !morphs.some((m) => /:(Ip|Iq|Is|If|K|E|Q|N|A)/.test(m));
  };
  return [...replacements.filter((r) => !subjunctiveOnly(r)), ...replacements.filter(subjunctiveOnly)];
}

// "T’aurai pas été invitée" -> aurais: a "t’" opening the clause, right
// before the verb, is the familiar "tu" ("il t’aurait dit" keeps its subject).
function preferTu(text, start, replacements) {
  if (replacements.length < 2) return replacements;
  if (!/(^|[.!?;:,«"—]\s*|(^|\s)(et|mais|si|que|qu’|qu'|quand|parce que|car|donc|ou)\s+)[tT][’']$/.test(text.slice(Math.max(0, start - 20), start))) return replacements;
  const tu = (r) => spellChecker.getMorph(r).some((m) => /:V.*:2s/.test(m));
  return [...replacements.filter(tu), ...replacements.filter((r) => !tu(r))];
}

// "les décisions qu’il a pris" -> prises, not "prît": the imperfect subjunctive is
// almost never what was meant; it goes last.
function demoteImperfectSubjunctive(replacements) {
  const rare = (r) => {
    const verbs = spellChecker.getMorph(r).filter((m) => /:V/.test(m));
    // (Tenses come grouped: "réfléchisses" is ":Sp:Sq:2s", a present subjunctive too.)
    return verbs.length > 0 && verbs.every((m) => /:Sq/.test(m) && !/:(Ip|Iq|Is|If|K|Sp|E|P|Q|Y)/.test(m)) &&
      !spellChecker.getMorph(r).some((m) => /:[NAQ]/.test(m));
  };
  return [...replacements.filter((r) => !rare(r)), ...replacements.filter(rare)];
}

// A misspelled word keeps its ending: "convainquants" -> convaincants (not "convainquant"),
// "fatiguante" -> fatigante. Among the first candidates, those with the same ending go first.
function keepEnding(word, replacements) {
  const ending = (w) => (/es$/i.test(w) ? "es" : /[sx]$/i.test(w) ? "s" : /e$/i.test(w) ? "e" : "");
  const want = ending(word);
  if (!want || replacements.length < 2 || ending(replacements[0]) === want) return replacements;
  // Only when the first candidate merely drops that ending ("convainquants" -> "convainquant"):
  // the ending typed is often the mistake itself ("responsabilitée" -> responsabilité).
  // And only when that first candidate is a present participle ("fatiguant") standing for
  // the adjective ("fatigante"): "responsabilitée" -> responsabilité is right as it is.
  if (replacements[0].toLowerCase() !== word.toLowerCase().slice(0, -want.length) &&
      replacements[0].toLowerCase() !== word.toLowerCase().slice(0, -1)) return replacements;
  if (!spellChecker.getMorph(replacements[0].toLowerCase()).some((m) => /:V[^/]*:P/.test(m))) return replacements;
  const head = replacements.slice(0, 4);
  const same = head.filter((r) => ending(r) === want);
  return same.length ? [...same, ...head.filter((r) => !same.includes(r)), ...replacements.slice(4)] : replacements;
}

// « Great job! » inside a French text: a quote in English, not French misspellings.
const FC_EN_QUOTE_WORDS = /^(the|a|an|and|or|of|to|in|on|is|are|was|be|you|your|i|it|my|we|our|this|that|for|with|great|good|nice|job|thanks|thank|please|yes|no|not|so|very|well|done|love|happy|best|sorry|cool|wow|see|let|go|get|me|all|just|what|how)$/i;
function insideEnglishQuote(paragraph, start) {
  const before = paragraph.slice(0, start);
  const open = Math.max(before.lastIndexOf("«"), before.lastIndexOf("“"), before.lastIndexOf("\""));
  if (open < 0 || /[»”"]/.test(before.slice(open + 1))) return false;
  const rest = paragraph.slice(open + 1);
  const close = rest.search(/[»”"]/);
  if (close < 0) return false;
  const words = rest.slice(0, close).match(/\p{L}+(?:'\p{L}+)?/gu) ?? [];
  if (!words.length || /[éèêàçùûôîœ]/i.test(rest.slice(0, close))) return false;
  const english = words.filter((w) => FC_EN_QUOTE_WORDS.test(w) || !spellChecker.isValidToken(w)).length;
  return english / words.length >= 0.6;
}

// Words more frequent in English than in French (data/*-freq.txt, measured as language.js
// does). Leaning: at least ten times more ("the", "learning", "women", not "machine" or
// "table"). Common: at least as frequent ("data", "business"); never a French function word.
const FC_ENGLISH_LEANING = new Set();
const FC_ENGLISH_COMMON = new Set();
function loadEnglishLeaning(frList, enList) {
  const parse = (list) => {
    const counts = new Map();
    let total = 0;
    for (const line of list.split("\n")) {
      const space = line.lastIndexOf(" ");
      const count = Number(line.slice(space + 1));
      if (space > 0 && count > 0) {
        const word = line.slice(0, space);
        counts.set(word.includes("'") ? word.replace(/'/g, "’") : word, count);
        total += count;
      }
    }
    return { counts, total };
  };
  const fr = parse(frList), en = parse(enList);
  for (const [word, count] of en.counts) {
    const ratio = (count / en.total) / ((fr.counts.get(word) ?? 1) / fr.total);
    if (ratio >= 10) FC_ENGLISH_LEANING.add(word);
    else if (ratio >= 1 && word.length > 2) FC_ENGLISH_COMMON.add(word); // (not "a")
  }
}

// Words that link the words of an English name or title: "Hall of Fame", "Wiley and Sons".
const FC_EN_LINK_WORDS = /^(the|of|and|to|from|for|with|in|at|by|is|are|my|your|our|its|vs)$/i;
// Particles of foreign names: "Alexander von Humboldt", "Copa del Rey", "Leônidas da Silva".
const FC_NAME_PARTICLES = /^(von|van|der|den|da|di|del|della|dello|degli|dos|das|do|zu|ter|ten|bin|ibn|el)$/;
// Abbreviations of references, unknown to the dictionary: "(dir.)", "préf.", "rééd.", "couv. ill.".
const FC_REFERENCE_ABBREVIATIONS = /^(dir|préf|rééd|réimpr|réimp|ill|illustr|couv|assoc|collab|suppl|fasc|augm|impr)$/;
// Abbreviations whose period ends no sentence: "(trad. de l’anglais)", "14e éd., 944 p.".
const FC_DOTTED_ABBREVIATIONS = /^(dir|préf|rééd|réimpr|ill|couv|assoc|trad|coll|éd|Éd|éds|cf|vol|chap|al|p|pp|t)$/;

// "le deep learning", "The ball is round", "Hall of Fame", "une data engineer": English
// words next to English words, or a link word between names, are a title or a borrowed
// phrase, not French misspellings. ("un the à la menthe" keeps "the" -> thé: nothing
// English around it.) Returns the start offsets of those words.
function englishWords(paragraph) {
  const words = [...paragraph.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)];
  const lower = words.map((w) => w[0].toLowerCase().replace(/'/g, "’"));
  const english = lower.map((w) => FC_ENGLISH_LEANING.has(w));
  // (Lowercase only: "en language Python" keeps language -> langage.)
  const common = lower.map((w, k) => english[k] || FC_ENGLISH_COMMON.has(w) && w === words[k][0]);
  const french = (k) => spellChecker.isValidToken(words[k][0]);
  const joined = (a, b) => /^[\s,&-]+$/.test(paragraph.slice(a.index + a[0].length, b.index));
  const out = new Set();
  const capital = (j) => j >= 0 && /^\p{Lu}/u.test(words[j][0]);
  // "the", "of", "and"…, which French never writes ("in", "for" are French words too).
  const englishLink = (j) => j >= 0 && english[j] && FC_EN_LINK_WORDS.test(words[j][0]) && !spellChecker.isValidToken(lower[j]);
  for (let k = 0; k < words.length; k++) {
    const prev = k > 0 && joined(words[k - 1], words[k]) ? k - 1 : -1;
    const next = k + 1 < words.length && joined(words[k], words[k + 1]) ? k + 1 : -1;
    if (english[k]
      ? english[prev] || english[next] || FC_EN_LINK_WORDS.test(words[k][0]) && (capital(prev) || capital(next)) ||
        // An English word French does not know, after or before a word as common in English
        // as in French: "data engineer", "business developer".
        !french(k) && (common[prev] || common[next])
      // A word that is neither French nor frequent in English right after or before "the",
      // "of"…: "The blue is our colour".
      : (englishLink(prev) || englishLink(next)) && !french(k)) out.add(words[k].index);
  }
  return out;
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
  let earlier = null;

  // Two errors that each disappear when the other is fixed are one mistake
  // with two possible fixes ("Ces problème" -> "Ce problème" or "Ces
  // problèmes"); only drop an error when the dependency goes one way.
  // Returns the earlier fix that this error's own fix would make useless.
  const fixesAnEarlierError = (start, m) => {
    const own = m.replacements[0];
    if (own === undefined) return null;
    const alt = paragraph.slice(0, start) + own + paragraph.slice(start + m.length);
    return fixes.find(
      (f) => fcHasErrorAt(paragraph, f.start, f.length) && !fcHasErrorAt(alt, f.start, f.length)
    ) ?? null;
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
      // Except after a homophone mix-up when this error's own fix is a much
      // rarer word: in "a fait sont travail", "sont travaux" would agree too,
      // but "son" is the word that was meant. ("commence à travaillé" keeps
      // "travailler", as common as the word typed.)
      // Any rule, when the alternative is a far rarer word: "dans le maisons"
      // -> "les maisons", not "le méson".
      (!(earlier = fixesAnEarlierError(start, m)) ||
        ((/conf_|^FC_/.test(earlier.ruleId) ? 1 : 2.5) < fcFrequency(m.word) - Math.max(0, ...m.replacements.map(fcFrequency))))
    ) {
      continue;
    }
    kept.push(m);
    lastEnd = start + m.length;
    // Our own rules know their fix: no re-ranking.
    if (!m.ruleId.startsWith("FC_") && ranked++ < MAX_RANKED_MATCHES) {
      // Grammar fixes after "être" ("sont finit" -> finît | finies): the
      // participle candidates, for the same preference as spelling ones.
      const participles = m.replacements.participles ??
        (/(?:^|\s)(suis|es|est|sommes|êtes|sont|étais|était|étaient|serai|sera|seront|été)\s+$/i.test(fixed.slice(Math.max(0, start + delta - 12), start + delta))
          ? m.replacements.filter((r) => spellChecker.getMorph(r).some((x) => /:Q/.test(x)))
          : null);
      const only = m.replacements.only;
      m.replacements = fcRankSuggestions(
        spellChecker, fixed, start + delta, m.length, m.replacements, m.category === "spelling", m.message
      );
      // Phonetic verb forms: the ranking only picks the person among them.
      if (only) m.replacements = [...m.replacements.filter((r) => only.includes(r)), ...only.filter((r) => !m.replacements.includes(r))];
      m.replacements = preferParticiple(m.replacements, participles);
      m.replacements = agreeWithSubject(fixed, start + delta, m.replacements);
      m.replacements = preferIndicative(fixed, start + delta, m.replacements);
      m.replacements = preferTu(fixed, start + delta, m.replacements);
      m.replacements = demoteImperfectSubjunctive(m.replacements);
      if (m.category === "spelling") m.replacements = keepEnding(m.word, m.replacements);
      // Participle agreement: the participle typed plus its ending ("commis" -> commises, not "commit").
      if (/ppas/.test(m.ruleId)) {
        const grown = m.replacements.filter((r) => r.toLowerCase().startsWith(m.word.toLowerCase()) && r.length > m.word.length);
        if (grown.length) m.replacements = [...grown, ...m.replacements.filter((r) => !grown.includes(r))];
      }
      // "Malgré que" -> "bien que" is the usual fix; "quoique" next.
      if (/malgré_que/.test(m.ruleId)) m.replacements = [...m.replacements].sort((x, y) => /^bien/i.test(y) - /^bien/i.test(x));
    }
    m.replacements = m.replacements.slice(0, MAX_SHOWN_SUGGESTIONS);
    const best = m.replacements[0];
    if (best !== undefined) {
      fixed = fixed.slice(0, start + delta) + best + fixed.slice(start + delta + m.length);
      delta += best.length - m.length;
      fixes.push({ start, length: m.length, ruleId: m.ruleId });
    }
  }
  return kept;
}

// Matches of one paragraph, with offsets relative to it. Cached, since a check
// runs after every pause in typing and usually only one paragraph changed.
function checkParagraph(paragraph) {
  const cached = paragraphCache.get(paragraph);
  if (cached) return cached;

  const spelling = [], ligatures = [];
  let suggested = 0;
  const english = englishWords(paragraph);
  for (const token of spellChecker.parseParagraph(paragraph)) {
    const word = token.sValue;
    // (A known misspelling with a capital is not a name: "Parmis les candidats".)
    if (fcLooksLikeProperNoun(paragraph, token.nStart, word) && !COMMON_MISSPELLINGS[word.toLowerCase()]) continue;
    // Only part of a word the tokenizer split on a foreign letter ("Nguy|ễn").
    if (/[\p{L}\p{M}]/u.test(paragraph[token.nEnd] ?? "") || /[\p{L}\p{M}]/u.test(paragraph[token.nStart - 1] ?? "")) continue;
    // "dispo", "resto", "mdr": informal on purpose.
    if (self.FC_INFORMAL_WORDS.has(word.toLowerCase())) continue;
    if (insideEnglishQuote(paragraph, token.nStart)) continue;
    // English among English words ("AI-driven technocracy": the last part decides for a
    // compound), and English words in -ing on their own ("le passing", "le dribbling").
    const last = word.lastIndexOf("-") + 1;
    if (english.has(token.nStart + last) ||
        /^\p{Ll}{2,}ing$/u.test(word) && FC_ENGLISH_LEANING.has(word)) continue;
    // "(de l’anglais mountains)", "en anglais : world models", "(feedforward en anglais)":
    // announced as English.
    if (/(^|[^\p{L}])(de\s+l['’]anglais|anglais\s*:)\s*$/iu.test(paragraph.slice(0, token.nStart)) ||
        /\(\s*$/.test(paragraph.slice(0, token.nStart)) && /^\s+en\s+anglais(?!\p{L})/u.test(paragraph.slice(token.nEnd))) continue;
    if (FC_NAME_PARTICLES.test(word) &&
        /\p{Lu}[\p{L}\p{M}.-]*\s+$/u.test(paragraph.slice(0, token.nStart)) && /^\s+\p{Lu}/u.test(paragraph.slice(token.nEnd))) continue;
    if (FC_REFERENCE_ABBREVIATIONS.test(word) && paragraph[token.nEnd] === ".") continue;
    // "la 1ere": the ordinal "1ʳᵉ" (Grammalecte only knows "1ère"), not "ere" -> erre.
    const first = /^ere(s?)$/i.exec(word);
    if (first && /(^|[^\p{N}])1$/u.test(paragraph.slice(0, token.nStart))) {
      spelling.push({
        offset: token.nStart - 1,
        length: token.nEnd - token.nStart + 1,
        word: "1" + word,
        message: "Nombre ordinal. Premier : 1ᵉʳ. Première : 1ʳᵉ. Premiers : 1ᵉʳˢ. Premières : 1ʳᵉˢ.",
        replacements: Object.assign([first[1] ? "1ʳᵉˢ" : "1ʳᵉ"], { only: [first[1] ? "1ʳᵉˢ" : "1ʳᵉ"] }),
        ruleId: "FC_ORDINAL",
        category: "typo",
        label: CATEGORY_LABEL.typo,
      });
      continue;
    }
    // (Reached at the start of a sentence too, where a capital is no sign of a name.)
    const brand = FC_BRANDS[word.toLowerCase()];
    if (brand === word) continue;
    if (brand) {
      spelling.push({
        offset: token.nStart,
        length: token.nEnd - token.nStart,
        word,
        message: `Nom de marque : « ${brand} ».`,
        replacements: Object.assign([brand], { only: [brand] }),
        ruleId: "SPELLING",
        category: "spelling",
        label: CATEGORY_LABEL.spelling,
      });
      continue;
    }
    // "soeur", "coeur": most keyboards have no "œ"; a typographic nicety, offered as a
    // style hint (asked by a user). One message for every word (fcRuleKey).
    // ("ex aequo", "et caetera" keep their "ae" in usual spelling: accepted, no hint.)
    const ligature = word.replace(/oe/g, "œ").replace(/O[eE]/g, "Œ");
    const hasLigature = ligature !== word && spellChecker.isValidToken(ligature);
    if (!picky && (hasLigature || /ae/i.test(word) && spellChecker.isValidToken(word.replace(/ae/g, "æ")))) {
      if (hasLigature) ligatures.push({
        offset: token.nStart,
        length: token.nEnd - token.nStart,
        word,
        message: `Typographie : « ${ligature} » s’écrit avec la ligature (« ${word} » est accepté).`,
        replacements: [ligature],
        ruleId: "FC_LIGATURE",
        category: "style",
        label: CATEGORY_LABEL.style,
      });
      continue;
    }
    // Picky mode: "soeur" is "sœur", not "sueur" (the ranking keeps only it).
    const replacements = hasLigature ? Object.assign([ligature], { only: [ligature] })
      : suggested++ < MAX_SUGGESTED_WORDS ? spellSuggestions(word, paragraph.slice(Math.max(0, token.nStart - 12), token.nStart)) : [];
    spelling.push({
      offset: token.nStart,
      length: token.nEnd - token.nStart,
      word,
      message: "Mot inconnu du dictionnaire.",
      replacements,
      ruleId: "SPELLING",
      category: "spelling",
      label: CATEGORY_LABEL.spelling,
    });
  }

  const grammar = [];
  const errors = [...gc_engine.parse(paragraph, "FR", false, null, false)];
  for (const err of errors) {
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
    // A space before "!", "?", ":", ";" is French typography: not after an English
    // title or a name ("Goal!", "Fair game in the 90's?", "Hello!").
    if (/^nbsp_/.test(m.ruleId)) {
      const before = paragraph.slice(0, err.nStart).match(/([\p{L}\p{M}'’-]+)[\s)\]]*$/u)?.[1];
      if (before && !spellChecker.isValidToken(before)) continue;
      if (/(^|[^\p{L}])(the|of|and)\s[^.!?«»]*$/iu.test(paragraph.slice(Math.max(0, err.nStart - 50), err.nStart))) continue;
    }
    // "ta toute première semaine": "toute" is the adverb before an adjective, not
    // "t'as toute la journée" (a determiner follows there).
    if (/conf_t_as_ta/.test(m.ruleId) && /^\s+toutes?\s+(?!(la|l['’]|les|une|ma|ta|sa|mes|tes|ses|nos|vos|leurs?|cette|ces|ce)\b)\p{L}/iu.test(paragraph.slice(err.nEnd))) continue;
    // "y'a plus de lait": the usual informal spelling of "il y a", like "t'es".
    if (/tu_y_attaché/.test(m.ruleId) && /^y['’]a$/i.test(m.word)) continue;
    // "Oh là là", "ah là là là": an interjection, not a doubled word.
    if (/doublon/.test(m.ruleId) && /^là(\s+là)+$/i.test(m.word)) continue;
    // Next to a word blanked as code or a name ("intervenir à VivaTech sur…" reads
    // "à      sur"): the rule judged a gap, not the sentence.
    if (/^(conf_|g2__conf_)/.test(m.ruleId) && (/^\s\s{3,}/.test(paragraph.slice(err.nEnd)) || /\s{3,}\s$/.test(paragraph.slice(0, err.nStart)))) continue;
    // "Bien arrivée à Marseille, il fait beau": the participle comes before the
    // "il" of the next clause and belongs to the writer, not to it.
    if (/ppas_adj_accord_il/.test(m.ruleId) && !/(^|[^\p{L}])ils?(?![\p{L}'’])/iu.test(paragraph.slice(0, err.nStart))) continue;
    // "en soit": our rule tells "en soi" from the verb ("ou en soit elle-même victime").
    if (/conf_soi_soit/.test(m.ruleId) && /^soit$/i.test(m.word) && /(^|[^\p{L}])en\s+$/iu.test(paragraph.slice(0, err.nStart))) continue;
    // "un thé à la menthe délicieux": the adjective agrees with the noun before
    // "à la menthe", "de la maison"…, as written. Also past an adjective of the second
    // noun or an adverb ("un rapport de la Commission européenne publié en 2020", "des
    // ouvrages pour la jeunesse plus anciens", "la réconciliation entre les peuples compatible").
    if (/__gn_/.test(m.ruleId)) {
      const head = /(\p{L}+)\s+(?:(?:à|de|en|pour|entre|sur|avec|sans|contre)\s+|d['’])(?:la\s+|le\s+|l['’]|les\s+)?\p{L}+\s+(?:(\p{L}+)\s+)?$/iu
        .exec(paragraph.slice(0, err.nStart).replace(/(^|\s)(plus|moins|très|si|aussi|trop|bien)\s+$/i, "$1"));
      const pairs = (word, kind) => spellChecker.getMorph(word.toLowerCase()).flatMap((x) => {
        const g = new RegExp(`:${kind}[^/]*?:([mfe]):([spi])`).exec(x);
        return g ? [[g[1], g[2]]] : [];
      });
      if (head && (!head[2] || spellChecker.getMorph(head[2].toLowerCase()).some((x) => /:A/.test(x)))) {
        const noun = pairs(head[1], "N"), adj = pairs(m.word, "[AQ]");
        if (noun.some(([g, n]) => adj.some(([h, p]) => (g === h || g === "e" || h === "e") && (n === p || n === "i" || p === "i")))) continue;
      }
    }
    // "pour ça n’a pas fonctionné": after "n’", "a" is the verb ("n’à" does not exist).
    if (/conf_à_a/.test(m.ruleId) && /^a$/i.test(m.word) && /(^|[^\p{L}])n['’]$/iu.test(paragraph.slice(0, err.nStart))) continue;
    // "j'ai deux extensions d'activées", "il y en a trois de cassés": the familiar "avoir
    // + noun + de + agreed participle", not "de" + infinitive ("elle vient de terminée").
    // Plural participles only, after a noun or a number: "ils ont fini de mangés" (a
    // participle before "de") and "j'ai envie de mangée" (a locution) stay underlined.
    if (/infi_de_verbe/.test(m.ruleId) &&
        spellChecker.getMorph(m.word.toLowerCase()).some((x) => /:Q(:A)?:.:p/.test(x))) {
      const lead = /(^|[^\p{L}])(ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient|aurai|auras|aura|aurons|aurez|auront|aurais|aurait|aurions|auriez|auraient|avoir)\s+[^.!?;:]*?([\p{L}\d]+)\s+d(e\s+|['’])$/iu
        .exec(paragraph.slice(Math.max(0, err.nStart - 80), err.nStart));
      if (lead && !/^(envie|besoin|peur|hâte|honte|horreur|raison|tort|intention|habitude|temps|droit|occasion|mal|soin|coutume)$/i.test(lead[3]) &&
          !spellChecker.getMorph(lead[3].toLowerCase()).some((x) => /:Q/.test(x))) continue;
    }
    // "Combien t'en veux ?": the informal "t'" of "tu" ("t'en penses quoi"), not the
    // object of "Pierre t'en veut", when nothing but a clause start comes before it.
    if (/peux_veux_vaux.*sans_sujet/.test(m.ruleId) && /^(peux|veux)$/i.test(m.word) &&
        /(^|[.!?…,;:«(]\s*|(^|[^\p{L}])(combien|si|que|quand|pourquoi|comment|où|mais|et|ou|alors|donc|puis|lorsque|puisque)\s+)t['’]\s*((en|y)\s+)?$/iu.test(paragraph.slice(0, err.nStart))) continue;
    // Holidays ("le 14 Juillet", "le 8 Mai") and titles ("Germinal") keep their capital, and
    // so do events named after their month ("la révolution de Février", "les massacres de
    // Septembre").
    if (/maj_mois/.test(m.ruleId) && (/^(vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor)$/i.test(m.word) ||
        /(^|\s)(14|1er|8|11|15)\s+$/.test(paragraph.slice(0, err.nStart)) ||
        /(^|[^\p{L}])(révolution|massacres|journées|insurrection|émeutes|événements|évènements)\s+(de\s+|d['’])$/iu.test(paragraph.slice(0, err.nStart)))) continue;
    // "les notes individuels": the adjective is the mistake, not the noun ("notés"),
    // when the same rule also flags the adjective after it. (Not "son robe" -> sa.)
    if (/gn_/.test(m.ruleId) && m.replacements.length &&
        spellChecker.getMorph(m.word.toLowerCase()).some((x) => /:N/.test(x)) &&
        m.replacements.every((r) => spellChecker.getMorph(r.toLowerCase()).every((x) => /:[AQV]/.test(x) && !/:N/.test(x))) &&
        errors.some((e) => e.nStart >= err.nEnd && e.sRuleId.replace(/_a\d+_\d+$/, "") === err.sRuleId.replace(/_a\d+_\d+$/, ""))) continue;
    // "les cheveux coupés court", "très court": an adverb, invariable.
    if (/^(court|ras|net|bas|haut)$/.test(m.word) && /gn_/.test(m.ruleId) &&
        /\b(coup\p{L}*|cheveux)\s+(\p{L}+\s+){0,2}$/u.test(paragraph.slice(Math.max(0, err.nStart - 40), err.nStart))) continue;
    // Borrowed words ("les ramen", "des tapas") keep their own plural.
    if (self.FC_INFORMAL_WORDS.has(m.word.toLowerCase())) continue;
    if (insideEnglishQuote(paragraph, err.nStart)) continue;
    // "The Family on Trial", "fandom in football": an English title, not French grammar.
    if (!/\s/.test(m.word) && english.has(err.nStart)) continue;
    const before = paragraph.slice(0, err.nStart);
    const sentenceStart = /(^|[.!?…:«"“(])$/.test(before.trimEnd());
    if (/__gn_|ppas_/.test(m.ruleId)) {
      // "la FA Cup", "la Football Association": the gender of a name is that of what it
      // names, not that of its first word (an acronym, or a name of several words
      // starting with a word French does not know or an English one).
      if (/^(le|la|les|l['’]|du|des|un|une|au|aux)$/i.test(m.word)) {
        const name = /^\s+(\p{Lu}[\p{L}\p{M}’'-]*)(?:\s+(\p{Lu}[\p{L}\p{M}’'-]*))?/u.exec(paragraph.slice(err.nEnd));
        const known = (w) => spellChecker.isValidToken(w) && !FC_ENGLISH_LEANING.has(w.toLowerCase());
        // (In English order the last noun gives the gender: "la Football Association".)
        const gender = /^(la|une)$/i.test(m.word) ? "f" : /^(le|un|du|au)$/i.test(m.word) ? "m" : "";
        const headAgrees = (w) => gender && spellChecker.getMorph(w.toLowerCase()).some((x) => new RegExp(`:N[^/]*:[${gender}e]:[si]`).test(x));
        if (name && (/^\p{Lu}{2,}$/u.test(name[1]) || name[2] && (/^\p{Lu}{2,}$/u.test(name[2]) || !known(name[1]) || !known(name[2]) || headAgrees(name[2])))) continue;
      }
      // "l’émission Secrets d’Histoire", "Robert Badinter, Libres et égaux", "les poires Belle
      // Angevine": a capital inside a sentence starts a title or a name, which agrees with
      // nothing around it. (Not a nationality, "des Américain" -> Américains, nor a word
      // right after its determiner, "les Président".)
      if (/^\p{Lu}\p{Ll}/u.test(m.word) && !/\s/.test(m.word) && !sentenceStart &&
          !/(^|[^\p{L}])(le|la|les|l['’]|un|une|des|du|de|d['’]|ce|cet|cette|ces|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|aux|au)\s*$/iu.test(before) &&
          !spellChecker.getMorph(m.word).some((x) => /#G/.test(x))) continue;
      // "un phénomène appelé « hallucination »", "des « football » locaux": a word quoted
      // alone is named, not used; it agrees with nothing.
      if (/[«“"]\s*$/.test(before) && /^\s*[»”"]/.test(paragraph.slice(err.nEnd))) continue;
      // "4 vol.", "3 t.": an abbreviation, not a noun to put in the plural.
      if (FC_DOTTED_ABBREVIATIONS.test(m.word) && paragraph[err.nEnd] === ".") continue;
    }
    // "les fédérations anglaise, française et allemande", "les sauces espagnole et béchamel",
    // "les premier et second cycles": one nationality or one rank for each thing named, so
    // each adjective stays singular.
    if (/__gn_|conj_/.test(m.ruleId) && !/\s/.test(m.word)) {
      // (#G: a nationality in the dictionary.)
      const distributive = (w) => /^(premier|première|second|seconde|dernier|dernière|\p{L}+ième)$/iu.test(w) ||
        spellChecker.getMorph(w.toLowerCase()).some((x) => /:A[^/]*:[mfe]:s/.test(x) && /#G/.test(x));
      const singular = (w) => spellChecker.getMorph(w.toLowerCase()).some((x) => /:[NA][^/]*:[mfe]:[si]/.test(x));
      const left = /(?:^|[^\p{L}])(\p{L}+)(?:\s*,\s*|\s+(?:et|ou)\s+)$/u.exec(before)?.[1];
      const right = /^(?:\s*,\s*|\s+(?:et|ou)\s+)(\p{L}+)/u.exec(paragraph.slice(err.nEnd))?.[1];
      if (distributive(m.word) && [left, right].some((w) => w && singular(w) && !/^(et|ou)$/i.test(w))) continue;
    }
    // "éd. Masson (trad. de l’anglais)", "et al. estiment": the period of an abbreviation
    // ends no sentence.
    if (/majuscule_après_point/.test(m.ruleId) && /(^|[\s(])(\p{L}+)\.\s*$/u.test(before) &&
        FC_DOTTED_ABBREVIATIONS.test(/(\p{L}+)\.\s*$/u.exec(before)[1])) continue;
    // "14e éd., 944 p.", "Robert Downey Jr., inspiré", "Res., vol. LXXV": a comma after the
    // period of an abbreviation (a word of the list, a capital and up to two letters, or a
    // word the dictionary does not know) is right.
    if (/virgule_après_point/.test(m.ruleId)) {
      const abbr = /(\p{L}+)$/u.exec(before)?.[1];
      if (abbr && (FC_DOTTED_ABBREVIATIONS.test(abbr) || /^\p{Lu}\p{Ll}{0,2}$/u.test(abbr) || !spellChecker.isValidToken(abbr))) continue;
    }
    // "L’entraîneur peut de plus cumuler", "on peut d’ailleurs": "de plus", "d’ailleurs"… are
    // adverbs after the verb, not "peu de".
    if (/conf_peut_peux_peu/.test(m.ruleId) && /^peu[tx]$/i.test(m.word) &&
        /^\s+(de\s+(plus|nouveau|même|surcroît|toute\s+(façon|manière|évidence)|temps\s+(en|à)\s+temps|suite|loin)|d['’](ailleurs|abord|emblée|autant\s+plus|ores\s+et\s+déjà|une\s+certaine\s+manière))(?!\p{L})/iu.test(paragraph.slice(err.nEnd))) continue;
    // "les journées des 31 mai et 2 juin", "décrets des 26 février et 12 août": "des" before
    // several dates, not "dès".
    if (/conf_dès_des/.test(m.ruleId) && /^des$/i.test(m.word) &&
        /^\s+\d{1,2}(er)?(\s+\p{L}+)?(\s*,\s*\d{1,2}(er)?(\s+\p{L}+)?)*\s+et\s+\d{1,2}(er)?(?!\d)/u.test(paragraph.slice(err.nEnd))) continue;
    // "Le groupe AI Watch note": an acronym starting a name, not a verb.
    if (/conj_/.test(m.ruleId) && /^\p{Lu}{2,}$/u.test(m.word) && /^\s+\p{Lu}\p{Ll}/u.test(paragraph.slice(err.nEnd)) && !sentenceStart) continue;
    // "DALL-E": a name in capitals, not inclusive writing.
    if (/^eepi_/.test(m.ruleId) && !/\p{Ll}/u.test(m.word)) continue;
    // "la Fédération Française de Football", "la Coupe des Clubs Champions Européens": a
    // capital inside a name; "à la nantaise": the manner, in lowercase.
    if (/maj_gentilés/.test(m.ruleId) &&
        (/^\p{Lu}/u.test(m.word) && /(^|[^\p{L}])\p{Lu}[\p{L}\p{M}-]*\s+$/u.test(before) && !/(^|[.!?…:«"“(])\s*\p{Lu}[\p{L}\p{M}-]*\s+$/u.test(before) ||
         /^\p{Ll}/u.test(m.word) && /(^|[^\p{L}])à\s+la\s+$/iu.test(before))) continue;
    // "ils en font partie": before a verb, "en" is the pronoun, not the preposition.
    if (/det_verbe_nom/.test(m.ruleId) && /(^|[^\p{L}])en\s+$/iu.test(paragraph.slice(Math.max(0, err.nStart - 4), err.nStart))) continue;
    // "Les volcans Somma en font partie": a capitalized name is not a verb to conjugate.
    if (/conj_/.test(m.ruleId) && /^\p{Lu}\p{Ll}/u.test(m.word) && !/(^|[.!?]\s*)$/.test(paragraph.slice(0, err.nStart).trimEnd())) continue;
    // "une cocote minute": a verb form after a determiner is mostly a misspelled noun
    // ("cocotte"), not a verb to put in the plural ("cocotes"): close nouns go first.
    if (/det_verbe_nom/.test(m.ruleId) && !/\s/.test(m.word)) {
      const lower = m.word.toLowerCase();
      // The word is valid, so the speller offers nothing: try a consonant doubled or
      // undoubled ("cocote" -> cocotte), then the speller's own neighbours.
      const variants = [];
      for (let k = 1; k < lower.length; k++) {
        if (!/[bcdfglmnprst]/.test(lower[k])) continue;
        variants.push(lower.slice(0, k + 1) + lower.slice(k));
        if (lower[k] === lower[k - 1]) variants.push(lower.slice(0, k) + lower.slice(k + 1));
      }
      const nouns = [...variants, ...fcSpellSuggestions(spellChecker, lower, 8)]
        .filter((s, n, all) => all.indexOf(s) === n && s !== lower && !s.includes(" ") && spellChecker.isValid(s) &&
          spellChecker.getMorph(s).some((x) => /:N/.test(x)));
      if (nouns.length) {
        m.replacements = nouns.slice(0, 2);
        m.replacements.only = [...m.replacements]; // the context ranking only orders these
      }
    }
    // "Les bolides miniatures sortent": a plural noun or adjective after the subject, not
    // a verb ("miniaturent"), when the real verb comes right after it.
    if (/conj_/.test(m.ruleId) && /[sx]$/i.test(m.word) &&
        spellChecker.getMorph(m.word.toLowerCase()).some((x) => /:[NA][^/]*:[pi]/.test(x))) {
      const verb = paragraph.slice(err.nEnd).match(/^\s+(\p{L}+)/u)?.[1]?.toLowerCase();
      const ms = verb ? spellChecker.getMorph(verb) : [];
      if (ms.some((x) => /:V[^/]*:(Ip|Iq|Is|If|K)(:\w+)*:3p/.test(x)) && !ms.some((x) => /:N/.test(x))) continue;
    }
    // "T’es en forme toi !": after "en", "la", "ta"…, "forme" is a noun, not "forme-toi".
    if (/imp_union/.test(m.ruleId) &&
        /(^|[^\p{L}])(en|de|la|le|les|une|un|ta|ma|sa|ton|mon|son|cette|ce|bonne|pleine|super|grande|belle)\s+$/iu.test(paragraph.slice(Math.max(0, err.nStart - 20), err.nStart))) continue;
    // "Mais vas-y fais rouler la voiture": "vas-y", "allez-y"… are an interjection before an imperative.
    if (/imp_verbe/.test(m.ruleId) &&
        /(^|[^\p{L}])(vas-y|allez-y|allons-y|va|allez|allons|viens|venez)[\s,]+$/iu.test(paragraph.slice(Math.max(0, err.nStart - 12), err.nStart)) &&
        spellChecker.getMorph(m.word.toLowerCase()).some((x) => /:E/.test(x))) continue;
    // "un ordre du jour pour la réunion de demain que j'ai rédigé": the rule weighs only the
    // last noun before "que"; an earlier one of the chain may be the object ("ordre").
    if (/ppas_det_(sing|plur)_COD_que/.test(m.ruleId)) {
      const que = [...paragraph.slice(0, err.nStart).matchAll(/(?<![\p{L}])qu(?:e(?![\p{L}])|['’])/giu)].pop();
      if (que && fcEarlierNounAgrees(spellChecker, paragraph.slice(0, que.index), m.word)) continue;
    }
    // "(alcool, vitesse, contrôle technique, ...)": a comma before the ellipsis of a list is
    // common, and only fine typography drops it. The fix keeps the dots ("technique...").
    if (/ponctuation_superflue|virgule_avant_points_suspension/.test(m.ruleId) && /^,\s*[.…]$/.test(m.word)) {
      if (!picky) continue;
      m.replacements = [m.word.slice(-1)];
      m.message = "Typographie : pas de virgule avant les points de suspension.";
    }
    // Picky repetitions: a quotation is someone else's words ("la fiche produit indique :
    // « Ce produit n’est plus disponible »"), so only the writer's own words count. And no
    // fix to offer: the ranking would otherwise make up verb forms ("produit" -> produis).
    if (/redondances/.test(m.ruleId)) {
      const own = paragraph.replace(/«[^»]*»|“[^”]*”|"[^"]*"/g, (q) => " ".repeat(q.length));
      if (own.slice(err.nStart, err.nEnd) !== m.word) continue;
      const word = m.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if ((own.match(new RegExp(`(?<![\\p{L}\\p{M}])${word}(?![\\p{L}\\p{M}])`, "giu")) ?? []).length < 2) continue;
      // One alert per repetition: the first word already says it.
      if (errors.some((e) => e.nStart < err.nStart && /redondances/.test(e.sRuleId) &&
          paragraph.slice(e.nStart, e.nEnd).toLowerCase() === m.word.toLowerCase())) continue;
      m.replacements = Object.assign([], { only: [] });
    }
    // "… » Peux tu m’en dire plus ?", "ou puis je l’acheter ?": an inversion without its hyphen,
    // read as subject + verb, so the infinitive gets conjugated ("dis", "achète"). The hyphen is
    // the mistake (Grammalecte finds it at the start of a sentence, not further in).
    if (/conj_/.test(m.ruleId) && spellChecker.getMorph(m.word.toLowerCase()).some((x) => /:V[^/]*:Y/.test(x))) {
      const inv = /(^|[^\p{L}’'-])(\p{L}+)\s+(je|tu|il|elle|on|nous|vous|ils|elles)\s+(?:(?:me|te|se|le|la|les|lui|leur|nous|vous|en|y)\s+|[mtsl]['’]\s*)*$/iu
        .exec(paragraph.slice(Math.max(0, err.nStart - 40), err.nStart));
      if (inv && spellChecker.getMorph(inv[2].toLowerCase()).some((x) => /:V[^/]*:(Ip|Iq|If|K)/.test(x))) {
        const start = Math.max(0, err.nStart - 40) + inv.index + inv[1].length;
        const end = start + inv[2].length + 1 + paragraph.slice(start + inv[2].length + 1).search(/\s/);
        if (errors.some((e) => e !== err && e.nStart < end && start < e.nEnd)) continue;
        const pronoun = inv[3];
        const joint = /^(il|elle|on)$/i.test(pronoun) && /[aeiou]$/i.test(inv[2]) ? "-t-" : "-";
        Object.assign(m, {
          offset: start,
          length: end - start,
          word: paragraph.slice(start, end),
          message: "Forme interrogative ? Mettez un trait d’union.",
          replacements: [`${inv[2]}${joint}${pronoun}`],
          ruleId: "gv2__inte_union_fc",
        });
      }
    }
    // "Ne vend pas ta voiture" -> vends, the imperative the message asks for, not "vendent".
    if (/imp_verbe/.test(m.ruleId) && m.replacements.length) m.replacements.only = [...m.replacements];
    // Optional commas ("passée chez toi, mais") are style, for picky mode.
    if (!picky && /virgules_manquantes/.test(m.ruleId)) continue;
    // "Elle s’est fait mal", "elle s’est fait opérer": "fait" stays invariable.
    if (m.word === "fait" && /ppas/.test(m.ruleId) &&
        /^\s+(mal|\p{L}+(er|ir|re))(?!\p{L})/u.test(paragraph.slice(err.nEnd))) continue;
    if (/neg_ne_manquant/.test(m.ruleId)) {
      // "il avance pas à pas": "pas" is a noun there.
      if (/^\s+pas\s+à\s+pas/.test(paragraph.slice(err.nEnd))) continue;
      // One rule whatever the pattern, so "turn off this rule" covers them all.
      m.ruleId = FC_NEG_RULE;
      // "Tu vas pas" -> "ne vas", not "n’vas" (elision only before a vowel).
      m.replacements = m.replacements.map((r) => r.replace(/^([nN])[’'](?![aeiouyhéèêâîôûœ])/u, "$1e "));
      // "C’est pas" -> "Ce n’est pas", not "CE N’".
      const letters = m.word.replace(/\P{L}/gu, "");
      if (letters.length < 2 || letters !== letters.toUpperCase()) {
        m.replacements = m.replacements.map((r) => {
          const low = r.toLowerCase();
          return m.word[0] === m.word[0].toUpperCase() ? low[0].toUpperCase() + low.slice(1) : low;
        });
      }
    }
    // "la 1ere", "le 2eme": the ordinal ("1ʳᵉ") is the fix, not the letters after the digit ("ere" -> erre).
    if (/typo_ordinaux/.test(m.ruleId)) {
      for (let k = spelling.length - 1; k >= 0; k--) if (overlaps(spelling[k], m)) spelling.splice(k, 1);
      grammar.push(m);
      continue;
    }
    // An unknown word is the more useful report; drop grammar noise on top of it.
    if (!spelling.some((s) => overlaps(s, m))) grammar.push(m);
  }

  // Like Grammalecte's, our missing-"ne" rule is for picky mode: "je sais pas" is fine in a chat.
  // So is the traditional spelling ("parait" -> "paraît"): the 1990 one is correct too.
  const custom = fcCustomRules(paragraph, spellChecker, [...spelling, ...grammar])
    .filter((m) => picky || !(/^FC_NE_(PAS|JAMAIS)$/.test(m.ruleId) || m.message.startsWith("Orthographe traditionnelle")));
  for (const m of custom) if (/^FC_NE_(PAS|JAMAIS)$/.test(m.ruleId)) m.ruleId = FC_NEG_RULE;
  // "mot de basse", "une dent de lit": a slip inside a set phrase.
  for (const s of self.fcCollocationSlips(paragraph, "fr")) {
    if (custom.some((m) => m.offset < s.end && s.start < m.offset + m.length)) continue;
    custom.push({
      override: true,
      offset: s.start,
      length: s.end - s.start,
      word: s.word,
      message: `Faute de frappe probable : « ${s.fix} » plutôt que « ${s.word} ».`,
      replacements: [s.fix],
      ruleId: "FC_COLLOCATION",
      category: "grammar",
      label: CATEGORY_LABEL.grammar,
    });
  }
  const urls = fcUrlRanges(paragraph);
  const overriding = custom.filter((m) => m.override);
  // "ce soir ont va" -> on: the participle Grammalecte wants after "ont" ("va" -> allé) goes too.
  const ontToOn = custom.filter((m) => m.ruleId === "FC_ON" && /^ont$/i.test(m.word));
  const afterOnt = (m) => /ppas|infi/.test(m.ruleId) &&
    ontToOn.some((o) => m.offset > o.offset && /^ont(\s+\S+)?\s+$/i.test(paragraph.slice(o.offset, m.offset)));
  // "ma posé" -> m’a: the agreement Grammalecte wants with "ma" ("posé" -> posée) goes too.
  const maToMa = custom.filter((m) => /^FC_M_AS?$/.test(m.ruleId) && /^ma$/i.test(m.word));
  const afterMa = (m) => /gn_ma_ta_sa/.test(m.ruleId) && maToMa.some((o) => /^ma\s+$/i.test(paragraph.slice(o.offset, m.offset)));
  const notOverridden = (m) => !overriding.some((o) => overlaps(o, m)) && !afterOnt(m) && !afterMa(m);
  const reports = [...spelling.filter(notOverridden), ...grammar.filter(notOverridden), ...custom];
  // The "œ" hints come last: any other report on the word wins.
  const found = [...reports, ...ligatures.filter((l) => !reports.some((m) => overlaps(m, l)))]
    .filter((m) => !urls.some(([a, b]) => m.offset < b && a < m.offset + m.length))
    .sort((a, b) => a.offset - b.offset);
  const result = rankParagraph(paragraph, 0, found);
  if (paragraphCache.size >= PARAGRAPH_CACHE_SIZE) paragraphCache.clear();
  paragraphCache.set(paragraph, result);
  return result;
}

function check(text) {
  init();
  // Tokens over 40 characters are hashes, keys or encoded data, never words:
  // blanked (same length, so offsets hold) instead of costing seconds.
  const original = text;
  // Code (`npm install`, config.json, fetchUser) is not French: blanked too.
  text = self.fcMaskCode(text).replace(/\S{41,}/g, (s) => " ".repeat(s.length));
  const matches = [];
  let paraStart = 0;
  let prevEnd = "";
  const paragraphs = text.split("\n");
  for (const [index, paragraph] of paragraphs.entries()) {
    if (paragraph.trim()) {
      // Copies: the sentence rules may adjust them, the cache must stay as is.
      const own = checkParagraph(paragraph).map((m) => ({ ...m, replacements: [...m.replacements] }));
      // Sentence rules depend on the previous paragraph (list items after ":").
      const all = [...own, ...fcSentenceRules(paragraph, own, spellChecker, prevEnd, "fr", fcNextStart(paragraphs, index), original.slice(paraStart, paraStart + paragraph.length))];
      for (const m of all.sort((a, b) => a.offset - b.offset)) {
        matches.push({ ...m, offset: paraStart + m.offset });
      }
      prevEnd = paragraph.trimEnd().slice(-1);
    }
    paraStart += paragraph.length + 1;
  }
  // "Bonjour Madame, … tu peux": the greeting and the slip may be paragraphs apart.
  const tuVous = fcTuVousMatches(text, spellChecker, matches);
  if (tuVous.length) {
    matches.push(...tuVous);
    matches.sort((a, b) => a.offset - b.offset);
  }
  // Nothing about the blanks themselves ("multiple spaces").
  const result = matches.filter((m) => original.slice(m.offset, m.offset + m.length) === m.word);
  for (const m of result) {
    const verb = conjugatedVerb(m);
    if (verb) m.verb = verb;
  }
  return result;
}

// Conjugation mistakes ("je peut", "ils mange", "sont mangé", "si j’aurais"):
// the infinitive of the verb, for the card's link to the conjugator. Only
// when the fix is a form of a single verb ("suis" may be "être" or "suivre":
// no link); our own rules, only on a typed verb ("je c’est" -> sais, not "ont" -> on).
const CONJUGATION_RULE = /__(conj|imp|inte|ppas|vmode)_/;

function verbsOf(words) {
  const lemmas = new Set();
  for (const w of words.toLowerCase().split(/[\s’'-]+/)) {
    for (const morph of w ? spellChecker.getMorph(w) : []) {
      const lemma = /^>([^/]+)\/:V/.exec(morph)?.[1];
      if (lemma && conj.isVerb(lemma)) lemmas.add(lemma);
    }
  }
  return lemmas;
}

function conjugatedVerb(m) {
  const fix = m.replacements[0];
  const ours = m.ruleId.startsWith("FC_");
  if (!fix || !(ours || CONJUGATION_RULE.test(m.ruleId))) return "";
  if (ours && !verbsOf(m.word).size) return "";
  // A compound form ("a mangé"): the verb, not its auxiliary.
  let verbs = [...verbsOf(fix)];
  if (/\s/.test(fix.trim())) verbs = verbs.filter((v) => v !== "avoir" && v !== "être");
  return verbs.length === 1 ? verbs[0] : "";
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
