// FreeCorrector's own grammar rules, for frequent mistakes Grammalecte misses.
// Each rule looks at a word and its neighbours, using the dictionary's
// morphology (verb, participle, adjective…), and stays conservative: a missed
// error is better than a false alarm on correct text.

/* global conj, suggPlur, suggVerbPpas, suggVerbTense */
/* exported fcCustomRules, fcIsTypographicOnly, fcLooksLikeProperNoun, fcUrlRanges */

// Printer's typography: superscript ordinals, narrow spaces, true ellipsis,
// en dash, curly quotes. Fixes that only change these are hidden unless the
// user turns on the picky mode ("1er" -> "1ᵉʳ", "..." -> "…", "6 414").
const FC_TYPO_CHARS = new Map([
  ["ᵉ", "e"], ["ʳ", "r"], ["ᵈ", "d"], ["ˢ", "s"], ["ᵐ", "m"], ["ⁿ", "n"], ["ᵒ", "o"], ["ᵍ", "g"],
  ["…", "..."], ["–", "-"], ["—", "-"], ["−", "-"], ["‐", "-"], ["‑", "-"],
  [" ", " "], [" ", " "], [" ", " "], [" ", " "], [" ", " "],
  ["’", "'"], ["‘", "'"], ["‹", "'"], ["›", "'"], ["«", "\""], ["»", "\""], ["“", "\""], ["”", "\""],
]);

function fcPlainTypography(s) {
  let out = "";
  for (const ch of s) out += FC_TYPO_CHARS.get(ch) ?? ch;
  // Normal spaces count: " ," -> "," is a real fix, not printer's typography.
  return out;
}

function fcIsTypographicOnly(word, replacements) {
  const plain = fcPlainTypography(word);
  // Grammalecte lists variants ("“", "‘", "‹"): one plain match is enough.
  return replacements.some((r) => fcPlainTypography(r) === plain);
}

// Web addresses, e-mails and domain names ("victor-hugo.lu", "Last.fm") are
// not prose: no error inside them.
const FC_URL_LIKE =
  /(https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+(\.[\w-]+)+|[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)*\.(com|fr|org|net|io|lu|fm|be|ch|ca|eu|de|uk|info|dev|app|ai|co|me|tv|gouv|edu|html?|php|js|pdf|png|jpe?g)(?![\p{L}\p{N}])(\/\S*)?/giu;

function fcUrlRanges(paragraph) {
  const out = [];
  for (const m of paragraph.matchAll(FC_URL_LIKE)) out.push([m.index, m.index + m[0].length]);
  return out;
}

// Unknown capitalized words in the middle of a sentence are names (people,
// places, brands): flagging them is noise. Same for acronyms and codes.
// Letters French never uses: a word with one is a foreign name ("Łukasz").
const FC_FOREIGN_LETTERS = /[łøåßğşıčćžšőűăţșțđħŋþðæ]/i;
// Any accented letter outside the French alphabet: "Siobhán", "Björk", "Nguyễn".
const FC_NON_FRENCH_LETTER = /(?![éèêëàâîïôûùüÿçœæ])[^\p{ASCII}\p{N}\p{P}\p{S}\p{Z}]/iu;
const FC_HONORIFIC = /(^|[\s(])(M|Mme|Mlle|MM|Mmes|Dr|Pr|Me|Mr|Mrs|Ms|St|Ste|Sr)\.?\s*$/;

function fcLooksLikeProperNoun(paragraph, start, word) {
  if (/\d/.test(word)) return true;
  if (word.length > 1 && word === word.toUpperCase()) return true;
  // Not a French word at all ("phở", "smörgåsbord"): typos keep French letters.
  if (FC_NON_FRENCH_LETTER.test(word.normalize("NFC"))) return true;
  // @mentions and #hashtags
  if (/[@#][\w.-]*$/.test(paragraph.slice(Math.max(0, start - 30), start))) return true;
  if (word[0] === word[0].toLowerCase()) return false;
  const before = paragraph.slice(0, start).trimEnd();
  const sentenceStart = before === "" || /[.!?…:«"“(\n]$/.test(before);
  if (!sentenceStart) return true;
  // At the start of a sentence: "M. Benali", "Łukasz et Zoë", "Kenji m’a dit".
  if (FC_HONORIFIC.test(before)) return true;
  if (FC_FOREIGN_LETTERS.test(word) || FC_NON_FRENCH_LETTER.test(word.normalize("NFC"))) return true;
  // A run of capitalized words: "Sigur Rós", "Internal Server Error".
  if (/^\s+\p{Lu}[\p{L}’'-]*\s+\p{Lu}/u.test(paragraph.slice(start + word.length))) return true;
  // A first name the frequency list knows (it comes from film subtitles, full
  // of names), while typos are absent from it.
  // But not a word missing an accent or an apostrophe ("Ca", "Jai", "Etes"):
  // people write those too, so they are in the list as well.
  if (typeof fcFrequency === "function" && fcFrequency(word) >= 2) {
    const key = (w) => fcPlain(w).replace(/\s/g, "");
    let near = [];
    try {
      near = fcSpellSuggestions(spellChecker, word, 6);
    } catch {
      // No dictionary at hand.
    }
    return !near.some((s) => key(s) === key(word));
  }
  // Followed by "et" + another capitalized word: "Ahmed et Leïla".
  return /^\s+(et|ou|&)\s+\p{Lu}/u.test(paragraph.slice(start + word.length));
}

const FC_SUBJECTS = new Set(["je", "j’", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles", "ça", "cela", "qui"]);
const FC_CLAUSE_START = new Set(["", ".", ",", ";", ":", "!", "?", "et", "mais", "si", "quand", "que", "qu’", "comme", "car", "donc", "alors", "puis", "lorsque", "parce"]);
const FC_KNOW_VERBS = /^(sai[st]|savez|savons|savent|savoir|su|demande[sz]?|demandent|demander|dis|dit|dites|disent|dire|comprends?|comprenez|comprendre|ignore[sz]?|voi[st]|voyez|voir|regarde[sz]?|montre[sz]?|explique[sz]?|cherche[sz]?|devine[sz]?|oublié|rappelle[sz]?|imagine[sz]?)$/;
const FC_TIME_PLACE_NOUNS = /^(jour|moment|endroit|ville|pays|année|époque|instant|soir|matin|nuit|semaine|mois|heure|lieu|pièce|maison|rue|quartier|période|temps|là)$/;
const FC_DAYS = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|aujourd’hui|hier|matin|soir|midi|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)$/;

// Two words that make a hyphenated compound. `needDet`: only after these words
// ("ma belle mère" is the mother-in-law, "une belle mère" may not be).
const FC_HYPHEN_COMPOUNDS = {
  "belle mère": { fix: "belle-mère", needDet: /^(ma|ta|sa|la|notre|votre|leur|ma|future)$/ },
  "beau père": { fix: "beau-père", needDet: /^(mon|ton|son|le|notre|votre|leur|futur)$/ },
  "belle sœur": { fix: "belle-sœur", needDet: /^(ma|ta|sa|la|notre|votre|leur)$/ },
  "beau frère": { fix: "beau-frère", needDet: /^(mon|ton|son|le|notre|votre|leur)$/ },
  "belle fille": { fix: "belle-fille", needDet: /^(ma|ta|sa|la|notre|votre|leur)$/ },
  "beau fils": { fix: "beau-fils", needDet: /^(mon|ton|son|le|notre|votre|leur)$/ },
  "grand mère": { fix: "grand-mère" }, "grand père": { fix: "grand-père" }, "grands parents": { fix: "grands-parents" },
  "grand mères": { fix: "grands-mères" }, "arrière grand": { fix: "arrière-grand" }, "petit fils": { fix: "petit-fils", needDet: /^(mon|ton|son|le|notre|votre|leur)$/ },
  "petits enfants": { fix: "petits-enfants", needDet: /^(mes|tes|ses|nos|vos|leurs)$/ },
  "week end": { fix: "week-end" }, "week ends": { fix: "week-ends" }, "là bas": { fix: "là-bas" }, "là haut": { fix: "là-haut" },
  "au dessus": { fix: "au-dessus" }, "au dessous": { fix: "au-dessous" }, "au delà": { fix: "au-delà" },
  "c’est à": { fix: "c’est-à", needDet: /^$/ }, "vis à": { fix: "vis-à" }, "après midi": { fix: "après-midi" },
  "rendez vous": { fix: "rendez-vous" }, "porte monnaie": { fix: "porte-monnaie" }, "arc en": { fix: "arc-en" },
  "celui ci": { fix: "celui-ci" }, "celle ci": { fix: "celle-ci" }, "ceux ci": { fix: "ceux-ci" }, "celui là": { fix: "celui-là" },
  "celle là": { fix: "celle-là" }, "ceux là": { fix: "ceux-là" }, "peut être": { fix: "peut-être", needDet: /^(,|\.|$|oui|non|mais|et|ou|alors|donc|bien|est|sont|était|a|ont|avait)$/ },
  "t il": { fix: "t-il" }, "quatre vingt": { fix: "quatre-vingt" }, "quatre vingts": { fix: "quatre-vingts" }, "dix huit": { fix: "dix-huit" },
  "dix sept": { fix: "dix-sept" }, "dix neuf": { fix: "dix-neuf" }, "vingt deux": { fix: "vingt-deux" }, "trente trois": { fix: "trente-trois" },
};

// Texting abbreviations: offered as a style suggestion (blue), not an error.
const FC_ABBREVIATIONS = {
  pk: "pourquoi", pq: "pourquoi", bcp: "beaucoup", dsl: "désolé", slt: "salut", bjr: "bonjour", bsr: "bonsoir",
  mtn: "maintenant", qqn: "quelqu’un", qqch: "quelque chose", pcq: "parce que", tjs: "toujours",
  jsp: "je ne sais pas", cad: "c’est-à-dire", pr: "pour", mrc: "merci", tt: "tout", ns: "nous",
};

// Words written as they sound (texting), with their standard spelling.
// Deliberate abbreviations ("stp", "mdr", "bcp") are not here: they are
// accepted as they are (informal.js).
const FC_SMS_WORDS = {
  jsuis: "je suis", chui: "je suis", chuis: "je suis", jvais: "je vais", jsais: "je sais", jpeux: "je peux",
  jveux: "je veux", jpense: "je pense", jcrois: "je crois", jarrive: "j’arrive", jtaime: "je t’aime",
  jte: "je te", jme: "je me", jle: "je le", ya: "il y a", koi: "quoi", kwa: "quoi", kan: "quand", ke: "que",
  kel: "quel", kelle: "quelle", ki: "qui", sava: "ça va", cava: "ça va", quesque: "qu’est-ce que",
  keske: "qu’est-ce que", kesk: "qu’est-ce que", kesse: "qu’est-ce", biensur: "bien sûr", bisur: "bien sûr",
  dacc: "d’accord", dac: "d’accord", dak: "d’accord", daccord: "d’accord", tjr: "toujours", tjrs: "toujours",
  jamai: "jamais", aujourdhui: "aujourd’hui", parceque: "parce que", jé: "j’ai", tro: "trop", oci: "aussi",
  ossi: "aussi", mé: "mais", tt: "tout", ct: "c’était", cétait: "c’était", cété: "c’était", jétais: "j’étais",
  jetais: "j’étais", jaurais: "j’aurais", javais: "j’avais", jarrête: "j’arrête", tinquiète: "t’inquiète",
  tinquietes: "t’inquiète", bi1: "bien", "2main": "demain", "2m1": "demain", koi29: "quoi de neuf", jen: "j’en", jy: "j’y", koman: "comment", komen: "comment", kom: "comme", kelle: "quelle",
};

const FC_CA_VERBS = /^(va|vas|ira|irait|allait|suffit|suffira|dépend|arrive|change|commence|existe|sert|coûte|vaut|devient|reste|semble|ressemble|peut|pourrait|doit|devrait|fait|faisait|fera|ferait|marche|marchait|roule|craint|compte|presse|passe|tombe|tourne|plaît|plait|m’|t’|s’|n’|ne|me|te|nous|vous|lui|leur|y|en)$/;

// Words with their position: letters (with apostrophes and hyphens) or a single
// punctuation mark. Elided words keep their apostrophe: "j’", "qu’".
function fcTokens(text) {
  const out = [];
  const re = /[\p{L}\p{N}]+(?:[-][\p{L}\p{N}]+)*['’]?|[^\s\p{L}\p{N}]/gu;
  let m;
  while ((m = re.exec(text))) {
    out.push({ text: m[0], lower: m[0].toLowerCase().replace(/'/g, "’"), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function fcMorph(spellChecker, word) {
  try {
    return spellChecker.getMorph(word.toLowerCase().replace(/’$/, ""));
  } catch {
    return [];
  }
}

const fcHas = (morphs, re) => morphs.some((m) => re.test(m));

// The same verb, same tense, at another person: ("sont", "3s") -> "est".
// Null when the word is not a conjugated verb or already has that person.
function fcConjugateAs(spellChecker, word, person) {
  const morphs = fcMorph(spellChecker, word);
  if (morphs.some((m) => new RegExp(`:(Ip|Iq|If|K|Sp|Is)[^/]*:${person}`).test(m))) return null;
  for (const m of morphs) {
    const found = m.match(/^>([^/]+)\/:V[^/]*?:(Ip|Iq|If|K|Sp|Is)/);
    if (!found) continue;
    try {
      const form = conj.getConj(found[1], `:${found[2]}`, `:${person}`);
      if (form) return form;
    } catch {
      // Unknown conjugation.
    }
  }
  return null;
}

const FC_LANGUAGE_NAMES = /^(français|anglais|allemand|espagnol|italien|portugais|chinois|japonais|arabe|russe|néerlandais|coréen|grec|polonais|turc|hindi|latin|hébreu|suédois|norvégien|danois|breton|basque|catalan|corse|occitan|alsacien|créole|wolof|berbère|vietnamien|thaï|persan|roumain|hongrois|tchèque|ukrainien)$/;
const FC_PROFESSIONS = /^(coiffeur|coiffeuse|médecin|dentiste|docteur|boulanger|boulangère|garagiste|kiné|kinésithérapeute|pharmacien|pharmacienne|notaire|vétérinaire|véto|psy|opticien|boucher|bouchère|plombier|avocat|avocate|ophtalmo|gynéco|dermato|osteo|ostéo|ostéopathe|épicier|fleuriste|banquier|comptable|mécanicien)$/;

function fcCustomRules(paragraph, spellChecker, existing) {
  const tokens = fcTokens(paragraph);
  const out = [];
  const free = (t) => !existing.some((m) => m.offset < t.end && t.start < m.offset + m.length) &&
    !out.some((m) => m.offset < t.end && t.start < m.offset + m.length);
  const morph = (t) => (t ? fcMorph(spellChecker, t.text) : []);
  // Fixes use the apostrophe the user types.
  const straight = paragraph.includes("'") && !paragraph.includes("’");
  const apo = (s) => (straight ? s.replace(/’/g, "'") : s);
  // `override`: this rule knows better than Grammalecte's overlapping report,
  // which checkParagraph then drops ("je c’est" is "sais", not "s’est").
  // `replacement`: one fix, or several, best first.
  // `keepCase`: the fix is about the case itself ("Français" -> "français").
  const add = (t, replacement, message, override = false, keepCase = false) => {
    if (override ? out.some((m) => m.offset < t.end && t.start < m.offset + m.length) : !free(t)) return;
    const upper = !keepCase && t.text[0] === t.text[0].toUpperCase() && t.text[0] !== t.text[0].toLowerCase();
    const fixes = (Array.isArray(replacement) ? replacement : [replacement])
      .map((r) => (upper ? r[0].toUpperCase() + r.slice(1) : r));
    out.push({
      override,
      offset: t.start,
      length: t.end - t.start,
      word: t.text,
      message,
      replacements: fixes,
      ruleId: `FC_${fixes[0].toUpperCase().replace(/[^A-Z]/g, "_")}`,
      category: "grammar",
      label: "Grammaire",
    });
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    const prev2 = tokens[i - 2];
    const next = tokens[i + 1];
    const next2 = tokens[i + 2];
    const prevLower = prev?.lower ?? "";

    // "je ne sais pas ou il habite", "le jour ou il est venu" -> où
    if (t.lower === "ou" && next) {
      const verbBefore =
        FC_KNOW_VERBS.test(prevLower) ||
        (/^(pas|plus|bien|jamais|vraiment)$/.test(prevLower) && FC_KNOW_VERBS.test(prev2?.lower ?? ""));
      const nounBefore = FC_TIME_PLACE_NOUNS.test(prevLower);
      const subjectAfter = FC_SUBJECTS.has(next.lower) || /^(c’|j’|s’|n’|est|sont|se|en|y)$/.test(next.lower);
      if ((verbBefore || nounBefore) && subjectAfter) {
        add(t, "où", "Confusion probable : « où » (lieu, moment) plutôt que « ou » (choix).");
      }
    }

    // "pose-le la, sur la table" -> là (an article is never followed by punctuation)
    if (t.lower === "la" && (!next || /^[,.;:!?)]$/.test(next.text))) {
      if (!/^(do|ré|mi|fa|sol|si)$/.test(prevLower)) {
        add(t, "là", "Confusion probable : « là » (adverbe de lieu) plutôt que « la ».");
      }
    }

    // "elle sait trompée" -> s’est
    if (/^(sait|sais|ses|ces|cest|c’est)$/.test(t.lower) && next && FC_SUBJECTS.has(prevLower)) {
      // "fait", "passé" are nouns too: what counts is that they are participles.
      if (prevLower !== "je" && prevLower !== "tu" && fcHas(morph(next), /:V[^/]*:Q/) && !fcHas(morph(next), /:Y/)) {
        add(t, apo("s’est"), "Verbe pronominal au passé composé : « s’est » + participe passé.", true);
      }
    }

    // "Je cest pas" -> sais
    if (t.lower === "cest" && (/^(je|tu)$/.test(prevLower) || (/^(ne|n’)$/.test(prevLower) && /^(je|tu)$/.test(prev2?.lower ?? "")))) {
      add(t, "sais", "Confusion probable : « sais » (verbe savoir) après « je » ou « tu ».", true);
    }

    // "sa va", "si tu veux, sa marche." -> ça
    if (t.lower === "sa" && next) {
      const clauseStart = FC_CLAUSE_START.has(prevLower);
      // ("Sa marche pas", "sa marche bien": the clause ends after an adverb.)
      const clauseEnd = !next2 || /^[,.;:!?]$/.test(next2.text) ||
        (/^(pas|plus|bien|mal|jamais|trop|super|grave|nickel|toujours|encore|vraiment)$/.test(next2.lower) &&
         (!tokens[i + 3] || /^[,.;:!?]$/.test(tokens[i + 3].text)));
      const isNoun = fcHas(morph(next), /:N/);
      // Words that can only follow "ça": "sa va", "sa suffit", "sa me plaît".
      const onlyAfterCa = FC_CA_VERBS.test(next.lower) && !isNoun;
      // "sa marche" is also "his walk": only as a whole short clause, right
      // after punctuation ("Si tu veux, sa marche."), never after "et".
      const afterPunct = !prev || /^[,.;:!?]$/.test(prev.text);
      const verbClause = clauseStart && afterPunct && clauseEnd && fcHas(morph(next), /:V.*:3s/);
      if (onlyAfterCa || verbClause) {
        add(t, "ça", "Confusion probable : « ça » (cela) plutôt que « sa » (possessif).");
      }
    }

    // "il est grand est fort" -> et. Strict pattern: être (+ adverb) ADJ est ADJ.
    if (t.lower === "est" && prev && next) {
      const adverb = /^(très|si|trop|assez|plutôt|vraiment|tellement|aussi|plus|moins|bien)$/;
      const k = adverb.test(prev2?.lower ?? "") ? i - 3 : i - 2;
      const verb = tokens[k];
      if (verb && /^(est|sont|était|étaient|sera|semble|reste|devient|es|suis)$/.test(verb.lower) &&
          fcHas(morph(prev), /:A/) && !fcHas(morph(prev), /:V/) &&
          fcHas(morph(next), /:A/) && !fcHas(morph(next), /:(Q|V)/)) {
        add(t, "et", "Confusion probable : « et » (conjonction) plutôt que « est » (verbe être).");
      }
    }

    // "Vous parler trop vite" -> parlez ; "Nous manger" -> mangeons
    if ((t.lower === "vous" || t.lower === "nous") && (!prev || /^[.!?;:]$/.test(prev.text)) && next && /er$/.test(next.lower)) {
      const inf = morph(next).find((m) => /:Y/.test(m));
      if (inf) {
        const lemma = inf.slice(1, inf.indexOf("/"));
        const who = t.lower === "vous" ? ":2p" : ":1p";
        try {
          const form = conj.getConj(lemma, ":Ip", who);
          if (form && form !== next.lower) {
            add(next, form, `Après « ${t.lower} » sujet, le verbe se conjugue : « ${form} ».`);
          }
        } catch {
          // Unknown conjugation: leave it.
        }
      }
    }

    // "Elle à toujours raison" -> a ; "Merci a tous" -> à
    if (t.lower === "à" && /^(il|elle|on|y)$/.test(prevLower) && next &&
        !/^(qui|quoi|laquelle|lequel|lesquels|lesquelles|peine|part|cause|propos|moins|partir|travers|côté)$/.test(next.lower)) {
      add(t, "a", "Confusion probable : « a » (verbe avoir) plutôt que « à ».");
    }
    if (t.lower === "a" && next) {
      // After a greeting or a fixed phrase: "merci a tous", "grâce a toi".
      const afterPhrase = /^(merci|bienvenue|bravo|félicitations|grâce|face|quant|jusqu’|jusque|bonjour|bonsoir|salut)$/.test(prevLower);
      // "a bientôt", "a demain" with no subject before: "il a bientôt fini" is fine.
      const timeAfter = /^(bientôt|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|midi|minuit)$/.test(next.lower) &&
        !FC_SUBJECTS.has(prevLower) && !fcHas(morph(prev), /:(N|M)/);
      if (afterPhrase || timeAfter) {
        add(t, "à", "Confusion probable : « à » (préposition) plutôt que « a » (verbe avoir).");
      }
    }

    // "Elle leurs a parlé" -> leur (before a verb, "leur" is a pronoun: no "s")
    const auxiliary = next && /^(ai|as|a|avons|avez|ont|avait|avaient|aura|auront|suis|es|est|sont|était)$/.test(next.lower);
    if (t.lower === "leurs" && next && (auxiliary || (fcHas(morph(next), /:V[0-3].*:(Ip|Iq|Is|If|K|Sp|Sq|E)/) && !fcHas(morph(next), /:N/)))) {
      add(t, "leur", "Devant un verbe, « leur » est un pronom et ne prend jamais de « s ».");
    }

    // "C’est sur, il viendra" -> sûr (a preposition never ends a clause)
    // (Not before masked code or a link: "sur fr.fifa.com".)
    const maskedAfter = /^\s{2,}/.test(paragraph.slice(t.end, t.end + 3)) || (!next && /\s{2,}$/.test(paragraph.slice(t.end)));
    if (t.text === "sur" && !maskedAfter && (!next || /^[,.;:!?]$/.test(next.text) || (next.lower === "que" && /^(c’est|suis|es|est|sommes|êtes|sont|pas)$/.test(prevLower)))) {
      add(t, "sûr", "« Sûr » (certain) prend un accent circonflexe.");
    }

    // "Plusieurs personne" -> personnes
    if (/^(plusieurs|quelques|divers|diverses|différents|différentes|maints|maintes|nombreux|nombreuses)$/.test(prevLower) &&
        fcHas(morph(t), /:N:.:s/) && !fcHas(morph(t), /:N:.:[pi]/) && !fcHas(morph(t), /:V/)) {
      const plural = String(suggPlur(t.lower) || "").split("|").filter(Boolean)[0];
      if (plural) add(t, plural, `Après « ${prevLower} », le nom se met au pluriel.`);
    }

    // "Ma sœur et moi sommes allé" -> allés (not "êtes": polite "vous" is singular)
    if (/^(sommes|sont)$/.test(prevLower) && !/^(se|s’|nous|vous)$/.test(prev2?.lower ?? "") && fcHas(morph(t), /:Q:.:s/) && !fcHas(morph(t), /:Q:.:[pi]/)) {
      const fem = fcHas(morph(t), /:Q:f:s/) && !fcHas(morph(t), /:Q:m:s/);
      const plural = String(suggVerbPpas(t.lower, fem ? ":f:p" : ":m:p") || "").split("|").filter(Boolean)[0];
      if (plural && plural !== t.lower) add(t, plural, "Le participe passé s’accorde avec le sujet pluriel.");
    }

    // "Si j’aurai le temps" -> si j’ai (after "si", no future)
    // ("Je ne sais pas si je pourrai venir": an indirect question takes the future.)
    const indirect = tokens.slice(Math.max(0, i - 9), i - 2).some((x) => FC_KNOW_VERBS.test(x.lower) || /^(demande|demandes|demandais|demandait|demandez|savoir|voir|dis|dit|dire|dites|décider|vérifier|vérifiez|regarder|indiquer|indiquez|indique|préciser|précisez|confirmer|confirmez|signaler|signalez|ignore|ignorons|deviner|savez|sait|savoir|faites|demandons)$/.test(x.lower));
    if (!indirect && prev && FC_SUBJECTS.has(prevLower) && /^(si|s’)$/.test(prev2?.lower ?? "")) {
      const fut = morph(t).find((m) => /:If:/.test(m) || /:If$/.test(m) || /:If:\d/.test(m));
      const person = fut?.match(/:([123][sp])/)?.[1];
      if (fut && person) {
        const present = String(suggVerbTense(t.lower, ":Ip", `:${person}`) || "").split("|").filter(Boolean)[0];
        if (present) add(t, present, "Après « si », on n’emploie pas le futur : présent de l’indicatif.");
      }
    }

    // "Je suis fatigue" -> fatigué (être + conjugated 1st-group verb)
    if (/^(suis|es|est|sommes|êtes|sont)$/.test(prevLower) && prev2 && FC_SUBJECTS.has(prev2.lower) &&
        /e$|es$|ent$/.test(t.lower) && fcHas(morph(t), /:V1.*:Ip/) && !fcHas(morph(t), /:(A|Q|W|G)/)) {
      const ppas = String(suggVerbPpas(t.lower, ":m:s") || "").split("|").filter(Boolean)[0];
      if (ppas && ppas !== t.lower) add(t, ppas, "Après « être », il faut le participe passé.");
    }

    // "Voila ce que je voulais dire" -> Voilà (the verb "voiler" needs a subject)
    if (t.lower === "voila" && !FC_SUBJECTS.has(prevLower)) {
      add(t, "voilà", "« Voilà » s’écrit avec un accent grave.");
    }

    // "je ne sais pas sil viendra" -> s’il
    if ((t.lower === "sil" || t.lower === "sils") && !/^(le|du|un|ce|les|des)$/.test(prevLower)) {
      add(t, t.lower === "sil" ? "s’il" : "s’ils", "Apostrophe oubliée : « s’il » (si il).");
    }

    // "Tu veux manger a la maison" -> à (an infinitive is never followed by
    // the auxiliary "a" + determiner; "le manger a été" has a determiner before)
    if (t.lower === "a" && prev && next &&
        /^(la|le|l’|les|un|une|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|ce|cet|cette|ces|demain|midi|minuit|bientôt|quelle|quel|côté|cause|pied|vélo|moto|nouveau|partir|toi|moi|lui|eux|elle|elles|tous|toutes|chaque|plusieurs|deux|trois|nous|vous)$/.test(next.lower) &&
        /(er|ir|re)$/.test(prevLower) && fcHas(morph(prev), /:Y/) && !fcHas(morph(prev), /:(A|Q)/) &&
        !/^(le|la|l’|du|un|ce|son|mon|ton|leur|au)$/.test(prev2?.lower ?? "")) {
      add(t, "à", "Confusion probable : « à » (préposition) plutôt que « a » (verbe avoir).");
    }

    // "plein de monde a la fête" -> à (places and moments that follow "à la")
    if (t.lower === "a" && next && /^(la|l’)$/.test(next.lower) && next2 && !FC_SUBJECTS.has(prevLower) &&
        /^(fête|réunion|soirée|journée|conférence|séance|maison|plage|gare|mer|campagne|montagne|piscine|poste|banque|boulangerie|pharmacie|mairie|fac|cantine|messe|radio|télé|télévision|fin|place|main|mode|carte|rentrée|retraite|recherche|base|limite|suite|une|école|heure|hôpital|église|université|entrée|occasion|avance|ancienne|étranger|époque|aube)$/.test(next2.lower)) {
      add(t, "à", "Confusion probable : « à » (préposition) plutôt que « a » (verbe avoir).");
    }

    // "Elle travail dans une banque" -> travaille (a noun where the verb goes)
    if (prev && /^(je|tu|il|elle|on)$/.test(prevLower) && next && !/^[,.;:!?)]$/.test(next.text) &&
        fcHas(morph(t), /:N/) && !fcHas(morph(t), /:V/) && !(prev2 && /^(le|la|les|un|une|du|des|de|mon|ton|son)$/.test(prev2.lower))) {
      const person = { je: "1s", tu: "2s", il: "3s", elle: "3s", on: "3s" }[prevLower];
      const forms = person === "2s" ? [`${t.lower}les`, `${t.lower}es`, `${t.lower}s`] : [`${t.lower}le`, `${t.lower}e`, `${t.lower}t`];
      const verb = forms.find((f) => fcHas(fcMorph(spellChecker, f), new RegExp(`:V.*:Ip.*:${person}`)));
      if (verb) add(t, verb, `« ${t.text} » est un nom ; après « ${prevLower} », il faut le verbe : « ${verb} ».`);
    }

    // "Ces vraiment gentil", "Ses dommage" -> C’est (no noun follows)
    if (/^(ces|ses|cest|sait)$/.test(t.lower) && (!prev || /^[.!?:;,]$/.test(prev.text) || /^(mais|et|donc|alors|car)$/.test(prevLower)) && next) {
      const end = (tok) => !tok || /^[,.;:!?)]$/.test(tok.text) || /^(de|d’|que|qu’|pour|à|quand|si|comme)$/.test(tok.lower);
      const adj = (tok) => fcHas(morph(tok), /:A/);
      const adverb = /^(vraiment|très|trop|tellement|super|hyper|assez|plutôt|pas|bien|si|vachement|carrément|toujours|jamais|déjà|encore|plus|moins|aussi)$/.test(next.lower);
      const word = /^(dommage|normal|vrai|faux|possible|impossible|génial|nul|bon|bien|grave|incroyable|parti|fini|clair|sûr|ok|cool|top|parfait|pareil|mieux|pire|ça|moi|toi|lui|elle|nous|vous|eux|elles|promis|réglé|noté|compris|prévu|décidé|certain|sûr|juré|fait|tout|parti|gagné|perdu|mort|foutu|cuit|bon|pas)$/.test(next.lower);
      if ((word && end(next2)) || (adverb && next2 && (adj(next2) || /^(dommage|grave|normal|génial|nul|bon|bien|top|clair|sûr|pareil|mieux|pire|possible)$/.test(next2.lower)) && end(tokens[i + 3]))) {
        add(t, "c’est", "Confusion probable : « c’est » (cela est) ; aucun nom ne suit.", true);
      }
    }

    // "Je ne c’est pas", "tu c’est quoi ?" -> sais (after je/tu, "c’est" is the verb savoir)
    if (t.lower === "c’" && next?.lower === "est" &&
        (/^(je|j’|tu)$/.test(prevLower) || (/^(ne|n’)$/.test(prevLower) && /^(je|tu)$/.test(prev2?.lower ?? "")))) {
      add({ start: t.start, end: next.end, text: t.text + next.text }, "sais", "Confusion probable : « sais » (verbe savoir) après « je » ou « tu ».", true);
    }

    // "Il faut que tu fait attention" -> fasses (subjunctive after these "que")
    // Object pronouns may sit between the subject and the verb: "qu’on se voit".
    let subj = i - 1;
    while (subj > 0 && /^(se|s’|me|m’|te|t’|le|la|l’|les|lui|leur|en|y|ne|n’|nous|vous)$/.test(tokens[subj].lower) && subj > i - 4) subj--;
    if (subj !== i - 1 && /^(nous|vous)$/.test(tokens[subj + 1]?.lower) && !FC_SUBJECTS.has(tokens[subj].lower)) subj++;
    const subject = tokens[subj];
    if (subject && FC_SUBJECTS.has(subject.lower) && subject.lower !== "qui" && /^(que|qu’)$/.test(tokens[subj - 1]?.lower ?? "")) {
      const prevLower = subject.lower;
      const trigger = tokens[subj - 2]?.lower ?? "";
      if (/^(faut|faudrait|faudra|fallait|veux|veut|voulez|voudrais|voudrait|souhaite|souhaites|aimerais|aimerait|pour|avant|afin|sans|bien|attends|attend|préfère|préfères|préférerais|exige|demande|important|nécessaire|essentiel|normal|dommage|possible|peur)$/.test(trigger)) {
        const ind = morph(t).find((m) => /:V.*:Ip/.test(m) && !/:Sp/.test(m));
        const person = { je: "1s", "j’": "1s", tu: "2s", il: "3s", elle: "3s", on: "3s", nous: "1p", vous: "2p", ils: "3p", elles: "3p", ça: "3s", cela: "3s" }[prevLower];
        if (ind && person && !fcHas(morph(t), new RegExp(`:Sp.*:${person}|:${person}.*:Sp`))) {
          const lemma = ind.slice(1, ind.indexOf("/"));
          let form = "";
          try {
            form = conj.getConj(lemma, ":Sp", `:${person}`) || "";
          } catch {
            // Unknown conjugation.
          }
          if (form && form !== t.lower) add(t, form, `Après « ${trigger} que », le verbe se met au subjonctif : « ${form} ».`, true);
        }
      }
    }

    // "Je les ai vu" -> vus (direct object "les" before avoir: the participle agrees)
    if (prevLower.match(/^(ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient|aurais|aurait)$/) && prev2?.lower === "les" &&
        fcHas(morph(t), /:Q(:A)?:m:s/) && !fcHas(morph(t), /:Q(:A)?:.:[pi]/) && !(next && /^(les|la|le|l’|un|une|des|du|de|ces|mes|tes|ses)$/.test(next.lower))) {
      const plural = String(suggVerbPpas(t.lower, ":m:p") || "").split("|").filter(Boolean)[0];
      if (plural && plural !== t.lower) add(t, plural, "Le participe passé s’accorde avec « les », placé avant l’auxiliaire avoir.");
    }

    // "Je pense quel est partie" -> qu’elle
    // ("Je sais quel est le problème" has a determiner after "est": left alone.)
    if (t.lower === "quel" && /^(pense|penses|pensait|crois|croit|croyais|croyait|sais|sait|savais|savait|dit|dis|disait|espère|trouve|trouvais|sens|vois|pensais|ai|as|a|dirais|vu|entendu)$/.test(prevLower) &&
        next && /^(est|était|sera|serait|a|avait|aura|va|allait|vient|veut|peut|doit)$/.test(next.lower) &&
        next2 && !fcHas(morph(next2), /:D/) && /^\p{Ll}/u.test(next2.text)) {
      add(t, "qu’elle", "Confusion probable : « qu’elle » (que + elle) plutôt que « quel ».");
    }

    // "Je vous en pris" -> prie
    if (t.lower === "pris" && prevLower === "en" && prev2?.lower === "vous" && (!next || /^[.!,]$/.test(next.text))) {
      add(t, "prie", "Formule de politesse : « je vous en prie » (verbe prier).");
    }

    // "Elle a oublié c’est clés" -> ses (or ces): "c’est" before a plural noun
    // ("c’est dans…": "dans" is also a rare plural noun; grammatical words are left out.)
    if (t.lower === "c’" && next?.lower === "est" && next2 && fcHas(morph(next2), /:N:.:p/) &&
        !fcHas(morph(next2), /:(N:.:[si]|V|A|R|G|W|D|O)/)) {
      const clause = tokens.slice(Math.max(0, i - 6), i).map((x) => x.lower);
      const owner = clause.some((w) => /^(il|elle|on|ils|elles)$/.test(w));
      add({ start: t.start, end: next.end, text: t.text + next.text }, owner ? ["ses", "ces"] : ["ces", "ses"],
        "Devant un nom pluriel : « ses » (à lui, à elle) ou « ces » (ceux-là).", true);
    }

    // "Je vous pris d’agréer" -> prie (closing formula)
    if (t.lower === "pris" && prevLower === "vous" && /^(je|j’|nous)$/.test(prev2?.lower ?? "") && next &&
        /^(d’|de)$/.test(next.lower)) {
      add(t, prev2.lower === "nous" ? "prions" : "prie", "Formule de politesse : « je vous prie de… » (verbe prier).");
    }

    // "Ça c’est passé très vite", "ça c’est bien passé" -> s’est (pronominal verb after a subject)
    const adverbFirst = next2 && /^(bien|très|mal|vite|vraiment|super|trop|tellement|plutôt|assez)$/.test(next2.lower);
    const participle = adverbFirst ? tokens[i + 3] : next2;
    if (t.lower === "c’" && next?.lower === "est" && participle && /^(ça|cela|il|elle|on|tout|qui)$/.test(prevLower) &&
        !(prev2 && prev2.text === ",") && fcHas(morph(participle), /:V.*:Q/) &&
        (adverbFirst || (tokens[i + 3] && !/^[,.;:!?)]$/.test(tokens[i + 3].text)))) {
      add({ start: t.start, end: next.end, text: t.text + next.text }, "s’est", "Verbe pronominal : « s’est » (se + être), pas « c’est ».", true);
    }

    // "Il a eu sont permis" -> son (after a past participle of avoir)
    if (t.lower === "sont" && prev && fcHas(morph(prev), /:Q/) && prev2 && /^(ai|as|a|avons|avez|ont|avait|avais|avaient|aura)$/.test(prev2.lower) &&
        next && fcHas(morph(next), /:N:m/)) {
      add(t, "son", "Confusion probable : « son » (possessif) plutôt que « sont » (verbe être).");
    }

    // "Les photos que j’ai pris" -> prises ; "les fleurs que tu m’as offert" -> offertes
    // (the object "que" comes before avoir; an indirect pronoun may sit in between)
    let s = i - 2; // the subject, before avoir and any "m’", "lui"…
    const subjectAfterQue = (k) => tokens[k] && FC_SUBJECTS.has(tokens[k].lower) && /^(que|qu’)$/.test(tokens[k - 1]?.lower ?? "");
    if (!subjectAfterQue(s) && /^(m’|t’|me|te|lui|leur|nous|vous)$/.test(tokens[s]?.lower ?? "")) s--;
    if (prev && /^(ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient)$/.test(prevLower) && tokens[s] && FC_SUBJECTS.has(tokens[s].lower) &&
        /^(que|qu’)$/.test(tokens[s - 1]?.lower ?? "") && tokens[s - 2] && fcHas(morph(t), /:Q(:A)?:m:[si]/) &&
        (!next || /^[,.;:!?)]$/.test(next.text) || /^(sont|est|était|étaient|sera|seront|hier|ce|cette|la|le|l’|à|en|sur|pour|avant)$/.test(next.lower))) {
      const antecedent = tokens[s - 2];
      const noun = morph(antecedent).find((m) => /:N:[mfe]:[spi]/.test(m));
      const gender = noun?.match(/:N:([mfe]):([spi])/);
      if (gender && (gender[1] === "f" || gender[2] === "p")) {
        const want = `:${gender[1] === "f" ? "f" : "m"}:${gender[2] === "p" ? "p" : "s"}`;
        const form = String(suggVerbPpas(t.lower, want) || "").split("|").filter(Boolean)[0];
        if (form && form !== t.lower) add(t, form, `Le participe passé s’accorde avec « ${antecedent.text} », complément placé avant avoir.`);
      }
    }

    // "Nous allons vous envoyez" -> envoyer (infinitive after aller, pouvoir, devoir…)
    if (/ez$/.test(t.lower) && prev) {
      let k = i - 1;
      while (k > i - 3 && tokens[k] && /^(me|m’|te|t’|se|s’|nous|vous|le|la|l’|les|lui|leur|en|y)$/.test(tokens[k].lower)) k--;
      if (k < i - 1 && tokens[k] && /^(vais|vas|va|allons|vont|peux|peut|pouvons|peuvent|dois|doit|devons|doivent|veux|veut|voulons|veulent|faut|faudrait|aller|pouvoir|devoir)$/.test(tokens[k].lower)) {
        const inf = morph(t).find((m) => /:V.*:2p/.test(m));
        const lemma = inf?.slice(1, inf.indexOf("/"));
        if (lemma && lemma !== t.lower) add(t, lemma, "Après ce verbe, il faut l’infinitif.");
      }
    }

    // ---------- Subject-verb agreement Grammalecte misses ----------

    const agree = (verb, person, message) => {
      const form = verb && fcConjugateAs(spellChecker, verb.text.toLowerCase(), person);
      if (form) add(verb, form, message, true);
    };

    // "Tout le monde sont là" -> est
    if (t.lower === "monde" && prevLower === "le" && prev2?.lower === "tout" && next && fcHas(morph(next), /:V[^/]*:3p/)) {
      agree(next, "3s", "« Tout le monde » est singulier.");
    }

    // "Chacun de nous doivent" -> doit
    if (/^(chacun|chacune)$/.test(t.lower)) {
      let k = i + 1;
      if (/^(de|d’)$/.test(tokens[k]?.lower)) k += /^(entre)$/.test(tokens[k + 1]?.lower) ? 3 : 2;
      const verb = tokens[k];
      if (verb && fcHas(morph(verb), /:V[^/]*:(1p|2p|3p)/) && !fcHas(morph(verb), /:V[^/]*:3s/)) {
        agree(verb, "3s", `« ${t.text} » est singulier.`);
      }
    }

    // "Cette personne sont gentilles" -> est (singular determiner + singular noun + plural verb)
    // (Not after "et", "ou", "ni": "la vie et l’œuvre font" has a plural subject.)
    if ((!prev || /^[.!?;:,]$/.test(prev.text) || /^(mais|donc|car|alors|quand|si|que|qu’|comme|lorsque|puis)$/.test(prevLower)) &&
        /^(le|la|l’|ce|cet|cette|mon|ma|ton|ta|son|sa|un|une|notre|votre|leur)$/.test(t.lower) &&
        next && fcHas(morph(next), /:N:.:s/) && !fcHas(morph(next), /:N:.:[pi]/) && !/^(plupart|majorité|moitié|totalité|reste|tiers|quart)$/.test(next.lower) &&
        next2 && /^(sont|ont|font|vont|étaient|avaient|seront|auront|peuvent|doivent|veulent|savent)$/.test(next2.lower)) {
      agree(next2, "3s", `« ${t.text} ${next.text} » est singulier.`);
    }

    // "Mes amis et moi sont partis" -> sommes ; "Paul et toi sont" -> êtes
    if (/^(moi|toi)$/.test(t.lower) && prevLower === "et" && next && fcHas(morph(next), /:V[^/]*:3p/)) {
      agree(next, t.lower === "moi" ? "1p" : "2p", `Avec « et ${t.lower} », le verbe se met à la ${t.lower === "moi" ? "1re" : "2e"} personne du pluriel.`);
    }

    // "Ce sont eux qui a gagné" -> ont ; "c’est moi qui a" -> ai
    if (t.lower === "qui" && /^(moi|toi|nous|vous|eux|elles|lui)$/.test(prevLower) && next) {
      const person = { moi: "1s", toi: "2s", nous: "1p", vous: "2p", eux: "3p", elles: "3p", lui: "3s" }[prevLower];
      if (fcHas(morph(next), /:V[^/]*:(Ip|Iq|If|K|Sp|Is)/)) agree(next, person, `Après « ${prevLower} qui », le verbe s’accorde avec « ${prevLower} ».`);
    }

    // "Les gens qui son venus" -> sont
    if (t.lower === "son" && prevLower === "qui" && next && fcHas(morph(next), /:V[^/]*:Q/)) {
      add(t, "sont", "Confusion probable : « sont » (verbe être) plutôt que « son ».", true);
    }

    // ---------- Typos that make another real word ----------

    // "Elle et partie", "il et là" -> est ("il", "on", "ça" are never coordinated)
    if (t.lower === "et" && prev && next && ((/^(il|on|ça|cela|c’)$/.test(prevLower) && !/^(moi|toi|lui|elle|nous|vous|eux|elles)$/.test(next.lower)) ||
        (prevLower === "elle" && fcHas(morph(next), /:(V[^/]*:Q|A|W)/) && !/^(moi|toi|lui|elle|nous|vous|eux|elles|son|sa|ses|mon|ma|mes|ton|ta|tes|un|une|le|la|les|des|leur|leurs)$/.test(next.lower) && /^\p{Ll}/u.test(next.text)))) {
      add(t, "est", "Confusion probable : « est » (verbe être) plutôt que « et ».", true);
    }

    // "C’est du la bombe" -> de ("du" is already "de le")
    if (t.lower === "du" && next && /^(la|le|les|l’|un|une)$/.test(next.lower)) {
      add(t, "de", "« Du » contient déjà l’article : « de la », « de l’ ».", true);
    }

    // "Je suis ne en 1990" -> né
    if (t.lower === "ne" && /^(suis|es|est|sommes|êtes|sont|étais|était|étaient|être|été)$/.test(prevLower) &&
        next && /^(en|à|au|aux|le|la|dans|un|une|à|pendant|avant|après|il|chez|sous)$/.test(next.lower)) {
      add(t, "né", "Participe du verbe naître : « né ».", true);
    }

    // "Il fait chaux" -> chaud
    if (t.lower === "chaux" && /^(fait|faisait|fera|ferait|trop|très|si|plus|aussi|assez|super|tellement|vraiment)$/.test(prevLower)) {
      add(t, "chaud", "Confusion probable : « chaud » (température) plutôt que « chaux ».", true);
    }

    // "Tu viens avec mois ?" -> moi
    if (t.lower === "mois" && /^(avec|pour|sans|chez|contre|vers|derrière|devant|sauf|selon|comme|et|toi|que)$/.test(prevLower) &&
        (!next || /^[.!?,;:)]$/.test(next.text) || /^(et|aussi|non|même|seul)$/.test(next.lower))) {
      add(t, "moi", "Confusion probable : « moi » (pronom) plutôt que « mois ».", true);
    }

    // "De tout mont cœur" -> mon
    if (t.lower === "mont" && next && fcHas(morph(next), /:N/) && /^\p{Ll}/u.test(next.text) &&
        !/^(le|du|au|un|ce|des|les|aux|du)$/.test(prevLower)) {
      add(t, "mon", "Faute de frappe probable : « mon » (possessif) plutôt que « mont ».", true);
    }

    // "Il parle trop for" -> fort ("en mon for intérieur" is fine)
    if (t.lower === "for" && prev && /^(trop|très|si|plus|aussi|moins|assez|parle|parles|parlez|crie|cries|frappe|tape|joue|vraiment|super|tellement)$/.test(prevLower) &&
        !(next && next.lower === "intérieur")) {
      add(t, "fort", "Faute de frappe probable : « fort » plutôt que « for ».", true);
    }

    // "aujourd hui" -> aujourd’hui
    if (t.lower === "aujourd" && next?.lower === "hui") {
      add({ start: t.start, end: next.end, text: paragraph.slice(t.start, next.end) }, apo("aujourd’hui"),
        "« Aujourd’hui » s’écrit avec une apostrophe.", true);
    }

    // ---------- Real-word confusions (confusions.js) ----------

    const confusion = typeof fcRealWordConfusion === "function" ? fcRealWordConfusion(tokens, i, spellChecker, paragraph) : null;
    if (confusion && confusion !== t.lower) {
      add(t, confusion, `Confusion probable : « ${confusion} » plutôt que « ${t.text} ».`, true);
    }

    // "Cette robe-si", "celui-si" -> -ci
    if (/-si$/.test(t.lower) && t.lower.length > 3) {
      add({ start: t.end - 2, end: t.end, text: t.text.slice(-2) }, "ci", "Démonstratif : « -ci » (celui-ci, cette robe-ci).", true);
    }

    // "du pain est du fromage" -> et ; "du thé où du café" -> ou
    // Two parallel noun phrases: the same kind of article on both sides
    // ("du pain … du fromage"), not "Le chat est un mâle".
    // ("le football est le sport": only partitives, "du … est du …", for "est".)
    const sameArticle = prev2 && next && (/^(du|des)$/.test(prev2.lower) && /^(du|des)$/.test(next.lower) ||
      (t.lower === "où" && prev2.lower === next.lower));
    if (/^(est|où)$/.test(t.lower) && prev && next && fcHas(morph(prev), /:N/) && !fcHas(morph(prev), /:V/) && sameArticle &&
        next2 && fcHas(morph(next2), /:N/) &&
        (t.lower === "où" || !tokens.slice(Math.max(0, i - 4), i).some((x) => FC_SUBJECTS.has(x.lower) && x.lower !== "qui"))) {
      const fix = t.lower === "est" ? "et" : "ou";
      add(t, fix, `Confusion probable : « ${fix} » plutôt que « ${t.text} ».`, true);
    }

    // ---------- Homophones in more contexts ----------

    const isFinite = (x) => x && fcHas(morph(x), /:V[^/]*:(Ip|Iq|Is|If|K|Sp)/);
    const isPpas = (x) => x && fcHas(morph(x), /:V[^/]*:Q/);
    const isAdjOnly = (x) => x && fcHas(morph(x), /:A/) && !fcHas(morph(x), /:(N|V[^/]*:(Ip|Iq|Is|If|K|Sp|Y))/);
    // Nouns may be tagged ":N:A:m:p" (also adjectives); prepositions ("dans") are left out.
    const isPluralNoun = (x) => x && fcHas(morph(x), /:N(:A)?:[mfe]:p/) && !fcHas(morph(x), /:N(:A)?:[mfe]:[si]/) && !fcHas(morph(x), /:(R|G)/);
    const isAdj = (x) => x && fcHas(morph(x), /:A/) && !isFinite(x) && !fcHas(morph(x), /:(R|G|D)/);

    // "Mon frère et malade" -> est (a noun cannot be coordinated with an adjective)
    if (t.lower === "et" && prev && next && fcHas(morph(prev), /:N/) && !fcHas(morph(prev), /:A/) &&
        (isAdjOnly(next) || (isPpas(next) && !fcHas(morph(next), /:N/)) ||
         (isAdj(next) && (!next2 || /^[.!?,;:]$/.test(next2.text) || /^(depuis|aujourd’hui|hier|ce|cette|maintenant|en|très|trop|comme)$/.test(next2.lower)))) &&
        prev2 && fcHas(morph(prev2), /:D/) && !fcHas(morph(next), /:(R|G)/) &&
        // The noun phrase is the subject: it opens the sentence ("Mon frère et malade").
        (!tokens[i - 3] || /^[.!?;:]$/.test(tokens[i - 3].text))) {
      add(t, "est", "Confusion probable : « est » (verbe être) plutôt que « et ».", true);
    }

    // "Il fait froid est il pleut" -> et (a new clause with its subject starts)
    if (t.lower === "est" && prev && next && /^(il|elle|on|je|j’|tu|nous|vous|ils|elles)$/.test(next.lower) && isFinite(next2) &&
        !/^(où|quand|comment|pourquoi|que|qu’|qui|quel|quelle|ce|c’|n’|ne|[,.;:!?])$/.test(prevLower) && !FC_SUBJECTS.has(prevLower)) {
      add(t, "et", "Confusion probable : « et » (conjonction) plutôt que « est ».", true);
    }

    // "Tu viens samedi où dimanche ?" -> ou (a choice between two of a kind)
    if (t.lower === "où" && prev && next && (!next2 || /^[.!?,]$/.test(next2.text)) &&
        ((FC_DAYS.test(prevLower) && FC_DAYS.test(next.lower)) || (/^\d+$/.test(prev.text) && /^\d+$/.test(next.text)) ||
         (fcHas(morph(prev), /:N/) && fcHas(morph(next), /:N/) && !fcHas(morph(next), /:V/) && !fcHas(morph(prev), /:V/)))) {
      add(t, "ou", "Confusion probable : « ou » (choix) plutôt que « où » (lieu).", true);
    }

    // "Ou est-ce que tu as mis mes clés ?" -> Où (a question about a place)
    if (t.lower === "ou" && (!prev || /^[.!?]$/.test(prev.text)) && next &&
        /^(est|est-ce|est-il|est-elle|sont|sont-ils|sont-elles|vas|vas-tu|va|allez|allez-vous|es|es-tu|êtes|êtes-vous|habites|habites-tu|habitez|travailles|étais|était|as|avez|avais|se|ce|peut-on|on)$/.test(next.lower)) {
      add(t, "où", "Question sur un lieu : « où » (avec accent).", true);
    }

    // "Ses parents son très gentils", "Ce son mes amis" -> sont
    if (t.lower === "son" && prev && next &&
        (isPluralNoun(prev) || /^(ce|ces|qui|ils|elles|eux)$/.test(prevLower)) &&
        (/^(très|trop|bien|vraiment|pas|tous|toutes|toujours|jamais|déjà|encore|si|tellement|mes|tes|ses|nos|vos|leurs|des|les|ces|là|ici|partis|venus|allés|arrivés)$/.test(next.lower) || isAdjOnly(next) || (isPpas(next) && !fcHas(morph(next), /:N/)))) {
      add(t, "sont", "Confusion probable : « sont » (verbe être) plutôt que « son ».", true);
    }

    // "S’est vraiment dommage" -> C’est (no subject: this is "cela est")
    if (t.lower === "s’" && next?.lower === "est" && (!prev || /^[.!?]$/.test(prev.text) || /^(mais|ouais|oui|non)$/.test(prevLower)) &&
        next2 && !isPpas(next2)) {
      add({ start: t.start, end: next.end, text: t.text + next.text }, apo("c’est"), "Confusion probable : « c’est » (cela est).", true);
    }

    // "Il a perdu ça montre" -> sa (a feminine noun after a verb)
    if (t.lower === "ça" && prev && isFinite(prev) || (t.lower === "ça" && prev && isPpas(prev))) {
      // ("ça montre que…" is a verb: only when the noun ends the clause.)
      if (next && fcHas(morph(next), /:N:[fe]:[si]/) && (!fcHas(morph(next), /:V/) || !next2 || /^[.!?,;:]$/.test(next2.text)) && (!next2 || !isFinite(next2))) {
        add(t, "sa", "Confusion probable : « sa » (possessif) plutôt que « ça ».", true);
      }
    }

    // "Il là vu hier soir" -> l’a
    if (/^(là|la)$/.test(t.lower) && prev && /^(il|elle|on|qui|je|tu|j’)$/.test(prevLower) && next && isPpas(next) &&
        !fcHas(morph(next), /:V[^/]*:(Ip|Iq)/)) {
      const fix = { je: "l’ai", "j’": "l’ai", tu: "l’as" }[prevLower] ?? "l’a";
      add(t, apo(fix), `Pronom + avoir : « ${apo(fix)} ».`, true);
    }

    // "Mais amis sont venus" -> Mes
    if (t.lower === "mais" && (!prev || /^[.!?]$/.test(prev.text)) && next && isPluralNoun(next) && isFinite(next2)) {
      add(t, "mes", "Confusion probable : « mes » (possessif) plutôt que « mais ».", true);
    }

    // "Je n’ai ni faim n’y soif" -> ni
    if (t.lower === "n’" && next?.lower === "y" && next2 && fcHas(morph(next2), /:N/) && !isFinite(next2) &&
        tokens.slice(Math.max(0, i - 6), i).some((x) => x.lower === "ni")) {
      add({ start: t.start, end: next.end, text: paragraph.slice(t.start, next.end) }, "ni", "Dans « ni… ni… », pas d’apostrophe : « ni ».", true);
    }

    // "Il est parti s’en dire au revoir" -> sans
    if (t.lower === "s’" && next?.lower === "en" && next2 && fcHas(morph(next2), /:Y/) && prev && (isPpas(prev) || isAdjOnly(prev)) &&
        !/^(aller|souvenir|occuper|servir|rendre|sortir|passer|prendre|moquer|foutre|douter|apercevoir|excuser|aller|charger|méfier|tirer|remettre|sentir|vouloir|plaindre|remettre|débarrasser)$/.test(next2.lower)) {
      add({ start: t.start, end: next.end, text: paragraph.slice(t.start, next.end) }, "sans", "Confusion probable : « sans » (préposition).", true);
    }

    // "Je les ai tout vus" -> tous ; "Elle est tout contente" -> toute
    if (t.lower === "tout" && next) {
      if (/^(ai|as|a|avons|avez|ont|avais|avait|sont|sommes|êtes)$/.test(prevLower) && fcHas(morph(next), /:Q(:A)?:.:p/) && !fcHas(morph(next), /:Q(:A)?:.:[si]/)) {
        add(t, fcHas(morph(next), /:Q(:A)?:f:p/) ? "toutes" : "tous", "« Tous » / « toutes » : ils sont tous concernés.");
      } else if (/^[^aeiouyhéèêàâîïôûAEIOUYHÉ]/.test(next.lower) && fcHas(morph(next), /:A:f:[sp]/) && !fcHas(morph(next), /:A:(m|e)/) &&
          /^(est|était|suis|es|sera|semble|reste|devient|sont|étaient|sommes)$/.test(prevLower)) {
        add(t, fcHas(morph(next), /:A:f:p/) ? "toutes" : "toute", "Devant un adjectif féminin commençant par une consonne, « tout » s’accorde.");
      }
    }

    // "Il est plus tôt sympa" -> plutôt (rather)
    if (t.lower === "plus" && next?.lower === "tôt" && next2 && !FC_SUBJECTS.has(next2.lower) && !fcHas(morph(next2), /:V[^/]*:Q/) &&
        (isAdjOnly(next2) || /^(sympa|bien|bon|bonne|mal|cool|content|contente|beau|belle|fatigué|fatiguée|facile|difficile|grand|petit|calme)$/.test(next2.lower))) {
      add({ start: t.start, end: next.end, text: paragraph.slice(t.start, next.end) }, "plutôt", "« Plutôt » (assez, de préférence) s’écrit en un mot.", true);
    }

    // "Je suis presque près" -> prêt ; "Il habite prêt de la gare" -> près
    if (t.lower === "près" && /^(presque|enfin|fin|déjà|bientôt|pas)$/.test(prevLower) && (!next || /^[.!?,]$/.test(next.text))) {
      add(t, "prêt", "« Prêt » (préparé) plutôt que « près » (proche).", true);
    }
    if (t.lower === "prêt" && prev && !fcHas(morph(prev), /:D/) && next && /^(de|du|des|d’)$/.test(next.lower) && next2 &&
        (fcHas(morph(next2), /:D/) || /^(chez|moi|toi|lui|nous|vous|eux|ici|là)$/.test(next2.lower) || next.lower !== "de") && !fcHas(morph(next2), /:Y/)) {
      add(t, "près", "« Près de » (proche de) plutôt que « prêt ».", true);
    }

    // "Je vous ai envoyés le dossier" -> envoyé (the object comes after: no agreement)
    if (/^(ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient|aurai|aura)$/.test(prevLower) && isPpas(t) &&
        fcHas(morph(t), /:Q(:A)?:(m:p|f:[sp])/) && !fcHas(morph(t), /:Q(:A)?:m:[si]/) && next &&
        /^(le|la|l’|les|un|une|des|du|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|ce|cet|cette|ces)$/.test(next.lower) &&
        !tokens.slice(Math.max(0, i - 4), i - 1).some((x) => /^(les|la|l’|que|qu’|nous|vous|me|te|m’|t’)$/.test(x.lower) && x.lower !== "vous" && x.lower !== "nous")) {
      const form = String(suggVerbPpas(t.lower, ":m:s") || "").split("|").filter(Boolean)[0];
      if (form && form !== t.lower) add(t, form, "Le complément vient après le verbe : le participe reste invariable.");
    }

    // "Quand il était petit, il alla souvent…" -> allait (a habit: imperfect)
    if (/^(il|elle|on|ils|elles)$/.test(prevLower) && fcHas(morph(t), /:V[^/]*:Is:3[sp]/) && !fcHas(morph(t), /:(Ip|Iq|N|A|Q)/) && next && /^(souvent|toujours|régulièrement|parfois|habituellement)$/.test(next.lower)) {
      const person = morph(t).find((m) => /:Is:3[sp]/.test(m)).match(/:Is:(3[sp])/)[1];
      const form = String(suggVerbTense(t.lower, ":Iq", `:${person}`) || "").split("|").filter(Boolean)[0];
      if (form) add(t, form, "Une habitude passée se dit à l’imparfait.");
    }

    // "Je te promets que je serais à l’heure demain" -> serai (a promise about the future)
    if (fcHas(morph(t), /:V[^/]*:K:1s/) && prevLower === "je" &&
        tokens.slice(Math.max(0, i - 5), i).some((x) => /^(promets|promis|jure|juré|assure|garantis|parie)$/.test(x.lower)) &&
        !tokens.slice(0, i).some((x) => /^(si|s’)$/.test(x.lower))) {
      const form = String(suggVerbTense(t.lower, ":If", ":1s") || "").split("|").filter(Boolean)[0];
      if (form) add(t, form, "Une promesse pour l’avenir : le futur.");
    }

    // "Je voudrai un café" -> voudrais (a polite request: conditional)
    if (/^(voudrai|aimerai|souhaiterai|pourrai)$/.test(t.lower) && /^(je|j’)$/.test(prevLower) && next &&
        /^(un|une|des|du|de|d’|savoir|vous|te|lui|leur|bien|que|qu’|parler|réserver|commander|avoir|connaître|demander|juste|beaucoup)$/.test(next.lower) &&
        !tokens.slice(i).some((x) => /^(demain|bientôt|plus|quand|lorsque)$/.test(x.lower))) {
      add(t, `${t.lower}s`, "Pour une demande polie, le conditionnel : « je voudrais ».");
    }

    // "S’il serait là" -> était (no conditional after "si")
    if (fcHas(morph(t), /:V[^/]*:K:/) && prev && (/^(s’il|s’ils)$/.test(prevLower) ||
        ((/^(il|ils)$/.test(prevLower) && prev2?.lower === "s’") || (FC_SUBJECTS.has(prevLower) && /^(si)$/.test(prev2?.lower ?? ""))))) {
      const person = morph(t).find((m) => /:K:/.test(m)).match(/:K:([123][sp])/)?.[1];
      const form = person && String(suggVerbTense(t.lower, ":Iq", `:${person}`) || "").split("|").filter(Boolean)[0];
      // An indirect question: "Nous nous sommes demandé s’il viendrait".
      const indirect = tokens.slice(Math.max(0, i - 7), i - 1).some((x) => FC_KNOW_VERBS.test(x.lower) || /^(demand|interrog|ignor|vérifi|regard)/.test(x.lower));
      if (form && !indirect) add(t, form, "Après « si » (condition), pas de conditionnel : l’imparfait.");
    }

    // "Il répons toujours vite" -> répond
    if (t.lower === "répons" && /^(je|tu|il|elle|on)$/.test(prevLower)) {
      add(t, /^(il|elle|on)$/.test(prevLower) ? "répond" : "réponds", "Verbe répondre : « il répond », « je réponds ».", true);
    }

    // "Dans la boîte se trouve deux clés" -> trouvent (the subject comes after the verb)
    if (/^(trouve|reste|manque|existe|traîne|figure|apparaît|arrive|vient|suit|dort|attend)$/.test(t.lower) && next &&
        /^(deux|trois|quatre|cinq|six|sept|huit|neuf|dix|des|les|plusieurs|quelques|nos|mes|tes|ses|vos|leurs|ces|certains|certaines|beaucoup|différents|différentes)$/.test(next.lower) &&
        // ("y reste huit mois": a duration, not the subject)
        !(next2 && /^(mois|jours|ans|années|heures|minutes|semaines|fois|nuits|siècles|secondes)$/.test(next2.lower)) &&
        // Only the inverted constructions: "se trouve", "y reste", "où dort", "que suit".
        prev && /^(se|s’|y|où|que|qu’)$/.test(prevLower) &&
        !tokens.slice(Math.max(0, i - 4), i - 1).some((x) => (FC_SUBJECTS.has(x.lower) && x.lower !== "qui") || isPluralNoun(x))) {
      agree(t, "3p", "Le sujet, placé après le verbe, est pluriel.");
    }

    // "La plupart des élèves a réussi" -> ont
    if (t.lower === "plupart" && prevLower === "la" && next && /^(des|de|d’)$/.test(next.lower)) {
      let k = i + 2;
      // (Skip the nouns that are also verb forms, "élèves"; but "a" is the verb.)
      while (tokens[k] && (!isFinite(tokens[k]) || (fcHas(morph(tokens[k]), /:N/) && tokens[k].lower.length > 2)) && k < i + 5) k++;
      if (tokens[k] && fcHas(morph(tokens[k]), /:V[^/]*:3s/) && !fcHas(morph(tokens[k]), /:V[^/]*:3p/)) agree(tokens[k], "3p", "Après « la plupart des », le verbe est au pluriel.");
    }

    // "les personnes qui travaille ici" -> travaillent
    // (The article right before the noun: not "l’usage des mains qui donnera".)
    if (t.lower === "qui" && prev && isPluralNoun(prev) && /^\p{Ll}/u.test(prev.text) &&
        /^(les|mes|tes|ses|nos|vos|leurs|ces|plusieurs|certains|certaines|ces|deux|trois|quatre|cinq|quelques)$/.test(prev2?.lower ?? "") &&
        next && isFinite(next) && fcHas(morph(next), /:V[^/]*:3s/) && !fcHas(morph(next), /:V[^/]*:3p/)) {
      agree(next, "3p", `« Qui » reprend « ${prev.text} » : le verbe est au pluriel.`);
    }

    // "des questions important" -> importantes (the adjective agrees with the noun)
    if (prev && /^(des|les|mes|tes|ses|nos|vos|leurs|ces|plusieurs|quelques|deux|trois)$/.test(prev2?.lower ?? "") &&
        isPluralNoun(prev) && isAdj(t) && fcHas(morph(t), /:A:[me]:s|:A:m:[si]/) && !fcHas(morph(t), /:A:.:[pi]/) &&
        (!next || /^[.!?,;:]$/.test(next.text) || /^(mais|pour|dans|à|qui|que)$/.test(next.lower))) {
      const form = String(suggAgree(t.lower, prev.lower) || "").split("|").filter(Boolean)[0];
      if (form && form !== t.lower) add(t, form, `L’adjectif s’accorde avec « ${prev.text} ».`);
    }

    // "Où sont passé les clés ?" -> passées (the subject comes after)
    if (/^(sont|étaient|seront)$/.test(prevLower) && !/^(se|s’|nous|vous)$/.test(prev2?.lower ?? "") && isPpas(t) && fcHas(morph(t), /:Q(:A)?:m:s/) && !fcHas(morph(t), /:Q(:A)?:.:[pi]/) &&
        next && /^(les|des|mes|tes|ses|nos|vos|leurs|ces)$/.test(next.lower) && next2 && fcHas(morph(next2), /:N:[fme]:p/)) {
      const fem = fcHas(morph(next2), /:N:f:p/) && !fcHas(morph(next2), /:N:m/);
      const form = String(suggVerbPpas(t.lower, fem ? ":f:p" : ":m:p") || "").split("|").filter(Boolean)[0];
      if (form && form !== t.lower) add(t, form, `Le participe s’accorde avec « ${next.text} ${next2.text} », le sujet placé après.`);
    }

    // "Elles se sont parlées", "elle s’est lavée les mains" -> invariable participle
    if (/^(sont|est|suis|es|sommes|êtes|étaient|était|étions)$/.test(prevLower) && prev2 && /^(se|s’|me|m’|te|t’|nous|vous)$/.test(prev2.lower) &&
        isPpas(t) && !fcHas(morph(t), /:Q(:A)?:m:[si]/)) {
      const lemma = morph(t).find((m) => /:Q/.test(m))?.match(/^>([^/]+)\//)?.[1] ?? "";
      const indirect = /^(parler|téléphoner|sourire|succéder|plaire|déplaire|complaire|ressembler|mentir|nuire|suffire|écrire|dire|demander|répondre|parler|rire|convenir|survivre)$/.test(lemma);
      const objectAfter = next && /^(les|la|le|l’|un|une|des|ses|sa|son|leurs|leur)$/.test(next.lower) && next2 && fcHas(morph(next2), /:N/);
      if (indirect || objectAfter) {
        const form = String(suggVerbPpas(t.lower, ":m:s") || "").split("|").filter(Boolean)[0];
        if (form && form !== t.lower) add(t, form, indirect ? `« Se ${lemma} » : on parle à quelqu’un, le participe reste invariable.` : "Le complément d’objet vient après : le participe reste invariable.", true);
      }
    }

    // ---------- Round 2 ----------

    // "Le train et en retard" -> est (the subject opens the sentence)
    if (t.lower === "et" && prev && next && fcHas(morph(prev), /:N/) && !fcHas(morph(prev), /:A/) && prev2 && fcHas(morph(prev2), /:D/) &&
        (!tokens[i - 3] || /^[.!?;:]$/.test(tokens[i - 3].text)) &&
        /^(en|là|ici|déjà|toujours|encore|très|trop|pas|bien|mal|souvent|parfois|vraiment|tellement|si|plus|moins|fermé|fermée|ouvert|ouverte|parti|partie|terminé|terminée|fini|finie|prêt|prête|cassé|cassée|vide|plein|pleine)$/.test(next.lower) &&
        !(next.lower === "en" && next2 && fcHas(morph(next2), /:N/) && !/^(retard|avance|panne|vacances|grève|forme|colère|train|cours|ligne|route|marche|vente|danger|feu|pleine)$/.test(next2.lower))) {
      add(t, "est", "Confusion probable : « est » (verbe être) plutôt que « et ».", true);
    }

    // "Je pense quel viendra demain" -> qu’elle
    if (t.lower === "quel" && /^(pense|penses|pensait|crois|croit|crois|sais|sait|dit|dis|espère|trouve|sens|vois|savais|disait|croyais|pensais|dirais|suis|es|est)$/.test(prevLower) &&
        next && isFinite(next) && fcHas(morph(next), /:V[^/]*:3s/) && !fcHas(morph(next), /:N/) && /^\p{Ll}/u.test(next.text)) {
      add(t, apo("qu’elle"), "Confusion probable : « qu’elle » (que + elle) plutôt que « quel ».", true);
    }

    // "Elle s’est lavé avant de partir" -> lavée (reflexive, no object after)
    if (/^(est|sont|était|étaient)$/.test(prevLower) && /^(s’|se)$/.test(prev2?.lower ?? "") && /^(elle|elles|ils)$/.test(tokens[i - 3]?.lower ?? "") &&
        isPpas(t) && fcHas(morph(t), /:Q(:A)?:m:s/) && !fcHas(morph(t), /:Q(:A)?:.:[pi]/) &&
        (!next || /^[.!?,;:]$/.test(next.text) || /^(avant|après|ce|hier|tôt|tard|vite|à|au|en|dans|pour|et|puis|ensuite|tout|toute|seule|seul|ce|cette|chaque)$/.test(next.lower))) {
      const lemma = morph(t).find((m) => /:Q/.test(m))?.match(/^>([^/]+)\//)?.[1] ?? "";
      if (/^(laver|habiller|coiffer|maquiller|préparer|réveiller|lever|coucher|asseoir|endormir|blesser|tromper|perdre|perdu|cacher|arrêter|installer|inscrire|amuser|ennuyer|reposer|promener|baigner|doucher|changer|sauver|enfuir|évanouir|méfier|souvenir|rendre)$/.test(lemma)) {
        const who = tokens[i - 3].lower;
        const form = String(suggVerbPpas(t.lower, who === "elle" ? ":f:s" : who === "elles" ? ":f:p" : ":m:p") || "").split("|").filter(Boolean)[0];
        if (form && form !== t.lower) add(t, form, `Le participe s’accorde avec « ${who} ».`);
      }
    }

    // Imperative: "Achètes du pain", "vas te coucher" -> Achète, va
    // (At the start of a sentence, or after "et" following another order:
    // "…, chutes de pierres" in a list is a noun.)
    // (A title has no final punctuation: "Caricatures de Victor Hugo".)
    if ((!prev || /^[.!?]$/.test(prev.text) || (/^(et|puis)$/.test(prevLower) && t.lower === "vas")) && /[.!?]\s*$/.test(paragraph) &&
        next && !/^(tu|-tu)$/.test(next.lower) && !/-/.test(t.text) && !(next2 && /^\p{Lu}/u.test(next2.text)) &&
        !tokens.slice(Math.max(0, i - 4), i).some((x) => /^(tu|t’)$/.test(x.lower))) {
      if (t.lower === "vas" && !/^(y|-y)$/.test(next.lower)) {
        add(t, "va", "À l’impératif : « va » (sans s, sauf dans « vas-y »).", true);
      } else if (/es$/.test(t.lower) && fcHas(morph(t), /:V1[^/]*:Ip[^/]*:2s/) && !fcHas(morph(t), /:A/) &&
          /^(du|de|des|la|le|les|l’|un|une|ton|ta|tes|moi|lui|nous|leur|ça|bien|vite|attention|ce|cette|ces)$/.test(next.lower) &&
          // An ad's plural noun: "Visites le samedi matin", "Livraisons le lundi".
          !(fcHas(morph(t), /:N/) && next2 && /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|matin|soir|midi|week-end|weekend|lendemain|mois|jour)$/.test(next2.lower))) {
        add(t, t.text.slice(0, -1), "À l’impératif, les verbes en -er ne prennent pas de s : « achète ».", true);
      }
    }

    // "Les résultats de l’enquête montre" -> montrent (the head noun is plural)
    if (!prev || /^[.!?]$/.test(prev.text)) {
      if (/^(les|des|mes|tes|ses|nos|vos|leurs|ces|plusieurs)$/.test(t.lower) && next && isPluralNoun(next) && next2 && /^(de|du|des|d’)$/.test(next2.lower)) {
        let k = i + 3;
        // A word that is both noun and verb is a noun after an article ("l’enquête"),
        // the verb otherwise ("l’enquête montre").
        const article = (x) => x && /^(la|le|les|l’|un|une|du|des|de|d’|au|aux|cette|ce|ces|son|sa|ses)$/.test(x.lower);
        while (tokens[k] && (!isFinite(tokens[k]) || (fcHas(morph(tokens[k]), /:N/) && article(tokens[k - 1])) || fcHas(morph(tokens[k]), /:A/)) &&
          !/^[,;:.!?]$/.test(tokens[k].text) && k < i + 8) k++;
        const verb = tokens[k];
        // (A word right after an article is a noun, even when the dictionary
        // only knows it as a verb: "de la soule".)
        if (verb && isFinite(verb) && !/^(qui|que|qu’|dont|où|la|le|les|l’|un|une|du|des|de|d’|au|aux)$/.test(tokens[k - 1]?.lower ?? "") && fcHas(morph(verb), /:V[^/]*:3s/) && !fcHas(morph(verb), /:V[^/]*:3p/) &&
            !tokens.slice(i + 3, k).some((x) => /^(qui|que|qu’|dont|où|,)$/.test(x.lower))) {
          agree(verb, "3p", `Le sujet est « ${t.text} ${next.text} » (pluriel).`);
        }
      }
    }

    // "Je vous serez reconnaissant" -> serais (polite formula)
    if (/^(serez|serai|seras|sera)$/.test(t.lower) && prevLower === "vous" && prev2?.lower === "je" && next && /^(reconnaissant|reconnaissante|gré|obligé|obligée)$/.test(next.lower)) {
      add(t, "serais", "Formule de politesse : « je vous serais reconnaissant ».", true);
    }

    // "Demain, je serais au bureau" -> serai (a plain future fact)
    if (/^(serais|aurais)$/.test(t.lower) && prevLower === "je" && next &&
        /^(au|à|là|en|chez|dispo|disponible|absent|absente|présent|présente|de retour|joignable|libre|rentré|rentrée|parti|partie)$/.test(next.lower) &&
        tokens.slice(0, i).some((x) => /^(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|ce|bientôt|prochain|prochaine)$/.test(x.lower)) &&
        !tokens.some((x) => /^(si|s’|sans|aimerais|voudrais)$/.test(x.lower))) {
      add(t, t.lower === "serais" ? "serai" : "aurai", "Un fait à venir, sans condition : le futur.", true);
    }

    // "belle mère", "week end", "là bas" -> hyphenated compounds
    const compound = next && FC_HYPHEN_COMPOUNDS[`${t.lower} ${next.lower}`];
    if (compound && paragraph.slice(t.end, next.start) === " " && (compound.needDet === undefined || compound.needDet.test(prevLower))) {
      const text = paragraph.slice(t.start, next.end);
      const fix = /^\p{Lu}/u.test(text) ? compound.fix[0].toUpperCase() + compound.fix.slice(1) : compound.fix;
      add({ start: t.start, end: next.end, text }, fix, "Mot composé : avec un trait d’union.", true, true);
    }

    // "Elle parle couramment l’Espagnol" -> espagnol
    if (prevLower === "l’" && FC_LANGUAGE_NAMES.test(t.lower) && /^\p{Lu}/u.test(t.text) &&
        /^(parle|parles|parlons|parlez|parlent|parler|couramment|apprends|apprend|apprendre|étudie|étudier|comprends|comprend|comprendre|enseigne|maîtrise|maîtriser|pratique|aime)$/.test(prev2?.lower ?? "")) {
      add(t, t.lower, "Les noms de langues s’écrivent en minuscule.", true, true);
    }

    // "quoi que la baguette soit bonne" -> quoique (although)
    // ("Quoi qu’il en soit", "quoi que ce soit": set phrases, left alone.)
    if (t.lower === "quoi" && next && /^(que|qu’)$/.test(next.lower) && !(next2?.lower === "il" && tokens[i + 3]?.lower === "en") &&
        tokens.slice(i + 2, i + 6).some((x) => /^(soit|soient|ait|aient|fût|fussent)$/.test(x.lower)) &&
        !tokens.slice(i + 2, i + 6).some((x) => /^(arrive|arrivent|fasses|fasse|fassiez|dises|dise|disiez|pense|penses|décides|décide)$/.test(x.lower)) &&
        next2 && !/^(ce|ça|cela)$/.test(next2.lower)) {
      add({ start: t.start, end: next.end, text: paragraph.slice(t.start, next.end) }, next.lower === "que" ? "quoique" : apo("quoiqu’"),
        "« Quoique » (bien que) s’écrit en un mot.", true);
    }

    // ---------- Usage ----------

    // "Quelques fois, je vais au cinéma" -> Quelquefois (sometimes)
    if (t.lower === "quelques" && next?.lower === "fois" && FC_CLAUSE_START.has(prevLower) && next2 &&
        (next2.text === "," || FC_SUBJECTS.has(next2.lower))) {
      add({ start: t.start, end: next.end, text: paragraph.slice(t.start, next.end) }, "quelquefois",
        "« Quelquefois » (parfois) s’écrit en un mot.", true);
    }

    // "Je me rappelle de cette soirée" -> je me rappelle cette soirée
    if (/^rappel/.test(t.lower) && fcHas(morph(t), /^>rappeler\//) && /^(me|te|se|nous|vous|m’|t’|s’)$/.test(prevLower) &&
        next && /^(de|du|des|d’)$/.test(next.lower) && next2 && (fcHas(morph(next2), /:D/) || next.lower !== "de") && !fcHas(morph(next2), /:Y/)) {
      const article = { de: "", "d’": "", du: " le", des: " les" }[next.lower];
      add({ start: t.start, end: next.end, text: paragraph.slice(t.start, next.end) }, `${t.text}${article}`,
        "« Se rappeler » se construit sans « de » : on se rappelle quelque chose.");
    }

    // "Il a pallié à ce problème" -> pallié ce problème
    if (/^pall/.test(t.lower) && fcHas(morph(t), /^>pallier\//) && next && /^(à|au|aux)$/.test(next.lower)) {
      const article = { à: "", au: " le", aux: " les" }[next.lower];
      add({ start: t.start, end: next.end, text: paragraph.slice(t.start, next.end) }, `${t.text}${article}`,
        "« Pallier » se construit sans « à » : on pallie un problème.");
    }

    // "Voir même plus" -> Voire (even)
    if (t.lower === "voir" && next?.lower === "même" && (!prev || /^[,;(]$/.test(prev.text) || FC_CLAUSE_START.has(prevLower))) {
      add(t, "voire", "« Voire » (et même) s’écrit avec un « e ».");
    }

    // "Je vais au coiffeur" -> chez le coiffeur
    if (/^(au|à)$/.test(t.lower) && prev && /^(vais|vas|va|allons|allez|vont|aller|allé|allée|allés|allées|suis|es|est|passe|passer|passé|retourne|rends|rend)$/.test(prevLower) &&
        (t.lower === "au" ? next && FC_PROFESSIONS.test(next.lower) : next?.lower === "la" && next2 && FC_PROFESSIONS.test(next2.lower))) {
      const span = t.lower === "au" ? t : { start: t.start, end: next.end, text: paragraph.slice(t.start, next.end) };
      add(span, t.lower === "au" ? "chez le" : "chez la", "On va chez une personne, à un lieu : « chez le coiffeur ».");
    }

    // "Ci-joins le fichier" -> Ci-joint (invariable at the start)
    if (/^ci-joint?s?$|^ci-jointes?$|^ci-joins$/.test(t.lower) && t.lower !== "ci-joint" && FC_CLAUSE_START.has(prevLower)) {
      add(t, "ci-joint", "En tête de phrase, « ci-joint » est invariable.", true);
    }

    // "Vous dîtes vrai" -> dites (the passé simple is almost never meant)
    if (/^(dîtes|fîtes)$/.test(t.lower) && prevLower === "vous") {
      add(t, t.lower === "dîtes" ? "dites" : "faites", "Au présent : « vous dites », « vous faites » (sans accent).", true);
    }

    // "Il parle Français" -> français (languages take no capital)
    if (FC_LANGUAGE_NAMES.test(t.lower) && /^\p{Lu}/u.test(t.text) && prev &&
        /^(parle|parles|parlons|parlez|parlent|parler|apprends|apprend|apprenons|apprenez|apprennent|apprendre|étudie|étudies|étudier|comprends|comprend|comprendre|en|traduit|traduire|enseigne|cours)$/.test(prevLower)) {
      add(t, t.lower, "Les noms de langues s’écrivent en minuscule.", true, true);
    }

    // ---------- SMS and phonetic spellings ----------

    // "Jsuis", "Ya", "Koi", "Sava", "Quesque": whole words written as they sound.
    // "Kel heure" -> Quelle (agrees with the noun)
    const smsBase = FC_SMS_WORDS[t.lower];
    const sms = /^(kel|kelle)$/.test(t.lower) && next ? (fcHas(morph(next), /:N:f/) && !fcHas(morph(next), /:N:m/) ? "quelle" : "quel") : smsBase;
    // A capitalized one inside a sentence is a name ("Michael Chui").
    const sentenceStart = !prev || /^[.!?…]$/.test(prev.text);

    // "pk", "bcp", "dsl": deliberate abbreviations, offered in full as a style hint.
    const abbreviation = FC_ABBREVIATIONS[t.lower];
    if (abbreviation && (sentenceStart || /^\p{Ll}/u.test(t.text))) {
      add(t, apo(abbreviation), `Abréviation : « ${apo(abbreviation)} » en toutes lettres.`, true);
      const m = out[out.length - 1];
      if (m.word === t.text) {
        m.category = "style";
        m.label = "Style";
      }
    }
    if (sms && (sentenceStart || /^[\p{Ll}\d]/u.test(t.text)) &&
        !(t.lower === "ya" && prev && !/^[.!?,;:]$/.test(prev.text) && !FC_CLAUSE_START.has(prevLower))) {
      add(t, apo(sms), `Écriture phonétique : « ${apo(sms)} ».`, true);
    }

    // "G faim", "g vu le film" -> J’ai
    if (t.text.length === 1 && t.lower === "g" && (!prev || FC_CLAUSE_START.has(prevLower)) && next && /^\p{Ll}/u.test(next.text)) {
      add(t, apo("j’ai"), "Écriture phonétique : « j’ai ».", true);
    }

    // "Je c pas", "c pas grave" -> sais, c’est
    if (t.text.length === 1 && t.lower === "c" && next && !/^[’'.]/.test(paragraph[t.end] ?? "")) {
      if (/^(je|tu|j’)$/.test(prevLower) || (/^(ne|n’)$/.test(prevLower) && /^(je|tu)$/.test(prev2?.lower ?? ""))) {
        add(t, "sais", "Écriture phonétique : « sais » (verbe savoir).", true);
      } else if (!prev || FC_CLAUSE_START.has(prevLower) || /^(mais|et|donc|ouais|oui|non)$/.test(prevLower)) {
        add(t, apo("c’est"), "Écriture phonétique : « c’est ».", true);
      }
    }

    // "Ta vu le match ?", "Ta raison." -> T’as (tu as)
    if (t.lower === "ta" && (!prev || FC_CLAUSE_START.has(prevLower) || /^[.!?,;:]$/.test(prev.text)) && next &&
        ((fcHas(morph(next), /:V[^/]*:Q/) && !fcHas(morph(next), /:N:f/)) ||
         (/^(raison|tort)$/.test(next.lower) && (!next2 || /^[.!?,;:]$/.test(next2.text))))) {
      add(t, apo("t’as"), "Familier pour « tu as » : « t’as ».", true);
    }

    // "J’ais faim", "j’ait" -> j’ai
    if (t.lower === "j’" && next && /^(ais|ait|é|es)$/.test(next.lower)) {
      add({ start: t.start, end: next.end, text: t.text + next.text }, `${t.text}ai`, "Verbe avoir : « j’ai ».", true);
    }

    // ---------- Homophones ----------

    // "Sa fait longtemps": "sa" never introduces a masculine-only noun.
    if (t.lower === "sa" && next && FC_CLAUSE_START.has(prevLower) && fcHas(morph(next), /:V[^/]*:3s/) &&
        !fcHas(morph(next), /:[NA]:[fe]/)) {
      add(t, "ça", "Confusion probable : « ça » (cela) plutôt que « sa » (possessif).", true);
    }

    // "Les enfants on faim" -> ont (after a plural noun, before a noun or a participle)
    if (t.lower === "on" && prev && fcHas(morph(prev), /:N:.:p/) && !fcHas(morph(prev), /:N:.:s/) && next &&
        (fcHas(morph(next), /:V[^/]*:Q/) || (fcHas(morph(next), /:N/) && !fcHas(morph(next), /:V[^/]*:(Ip|Iq|If|K|Is):3s/)))) {
      add(t, "ont", "Confusion probable : « ont » (verbe avoir) plutôt que « on ».");
    }

    // "Tu vas ou ce soir ?" -> où
    if (t.lower === "ou" && prev && /^(vas|va|allez|vont|allons|aller|es|est|êtes|sont|habites|habite|habitez|travailles|travaille|pars|part|partez|étais|était|vis|vit|vivez)$/.test(prevLower) &&
        (!next || /^[.!?]$/.test(next.text) || /^(ce|demain|maintenant|exactement|alors|aujourd’hui|cet|cette|en)$/.test(next.lower))) {
      add(t, "où", "Confusion probable : « où » (lieu) plutôt que « ou » (choix).");
    }

    // "Tu viens quant ?" -> quand ("quant" only comes before "à", "au", "aux")
    if (t.lower === "quant" && !(next && /^(à|au|aux|a)$/.test(next.lower))) {
      add(t, "quand", "« Quant » s’emploie seulement dans « quant à » : ici, « quand ».", true);
    }

    // "Je ni suis pas allé" -> n’y
    if (t.lower === "ni" && prev && /^(je|j’|tu|il|elle|on|nous|vous|ils|elles|ça)$/.test(prevLower) && next && fcHas(morph(next), /:V/)) {
      add(t, apo("n’y"), "Confusion probable : « n’y » (ne + y) plutôt que « ni ».", true);
    }

    // "Il sans va", "il sans fout" -> s’en
    if (t.lower === "sans" && prev && next && fcHas(morph(next), /:V[^/]*:(Ip|Iq|If|K|Sp)/) && !fcHas(morph(next), /:N/)) {
      const fix = { je: "m’en", tu: "t’en", il: "s’en", elle: "s’en", on: "s’en", ils: "s’en", elles: "s’en" }[prevLower];
      if (fix) add(t, apo(fix), `Confusion probable : « ${apo(fix)} » plutôt que « sans ».`, true);
    }

    // "Il faut dans parler" -> d’en
    if (t.lower === "dans" && next && fcHas(morph(next), /:Y/) && /(er|ir|re)$/.test(next.lower)) {
      add(t, apo("d’en"), "Confusion probable : « d’en » (de + en) plutôt que « dans ».", true);
    }

    // "arrivé plutôt que prévu" -> plus tôt
    if (t.lower === "plutôt" && next?.lower === "que" && next2 && /^(prévu|prévue|prévus|prévues|d’habitude|d’|habituellement|d’ordinaire|hier|la|ce|cette|moi|toi|lui|nous|vous|eux)$/.test(next2.lower) &&
        prev && fcHas(morph(prev), /:V/)) {
      add(t, "plus tôt", "« Plus tôt » (avant) plutôt que « plutôt » (de préférence).");
    }

    // "Ma mer est malade" -> mère
    if (t.lower === "mer" && /^(ma|ta|sa)$/.test(prevLower) &&
        !(next && /^(préférée|favorite|natale|bleue|calme)$/.test(next.lower))) {
      add(t, "mère", "Confusion probable : « mère » (maman) plutôt que « mer ».");
    }

    // "Quoique tu fasses" -> Quoi que (whatever), not "quoique" (although)
    if (/^(quoique|quoiqu’)$/.test(t.lower) && next && FC_SUBJECTS.has(next.lower) && next2 &&
        /^(fasses|fasse|fassiez|fassions|fassent|dises|dise|disiez|disent|penses|pense|pensiez|arrive|arrivent|décides|décide|choisisses|choisisse|veuilles|veuille)$/.test(next2.lower)) {
      add(t, t.lower === "quoique" ? "quoi que" : apo("quoi qu’"), "« Quoi que » (quelle que soit la chose que) s’écrit en deux mots.", true);
    }

    // "Au faite, tu viens ?" -> au fait
    if (t.lower === "faite" && prevLower === "au" && (!next || /^[,.!?]$/.test(next.text))) {
      add(t, "fait", "« Au fait » (à propos) s’écrit sans « e ».", true);
    }

    // "Entrain de bosser" -> En train de
    if (t.lower === "entrain" && next && /^(de|d’)$/.test(next.lower)) {
      add(t, "en train", "« En train de » s’écrit en deux mots.", true);
    }

    // "Je l’ai vu partit", "il va sortit" -> infinitive
    if (prev && /^(vu|vue|vus|vues|entendu|entendue|laissé|laissée|fait|regardé|senti|voir|entendre|laisser|faire|vais|vas|va|allons|allez|vont|peux|peut|pouvons|pouvez|peuvent|dois|doit|devons|devez|doivent|veux|veut|voulons|voulez|veulent|faut)$/.test(prevLower) &&
        fcHas(morph(t), /:V[^/]*:Is:3s/) && !fcHas(morph(t), /:(N|A|Q|Y|Ip)/)) {
      const lemma = morph(t).find((m) => /:Is:3s/.test(m))?.match(/^>([^/]+)\//)?.[1];
      if (lemma && lemma !== t.lower) add(t, lemma, "Après ce verbe, il faut l’infinitif.");
    }

    // "J’ai tous compris" -> tout (a singular subject: "ils ont tous compris" is fine)
    if (t.lower === "tous" && /^(ai|as|a|avais|avait)$/.test(prevLower) && /^(j’|tu|il|elle|on)$/.test(prev2?.lower ?? "") &&
        next && fcHas(morph(next), /:V[^/]*:Q/)) {
      add(t, "tout", "« Tout » (toute chose) : invariable ici.");
    }

    // "Si tu viens, je serais content" -> serai (conditional after "si" + present)
    if (fcHas(morph(t), /:V[^/]*:K/) && !fcHas(morph(t), /:If/)) {
      let k = i - 1;
      while (k >= 0 && !/^[.!?]$/.test(tokens[k].text)) k--;
      const clause = tokens.slice(k + 1, i);
      // Strictly "si + subject + present, … conditional": "si tu viens, je serais".
      const si = clause.findIndex((x, j) => /^(si|s’)$/.test(x.lower) &&
        (FC_SUBJECTS.has(clause[j + 1]?.lower) || /^(il|ils)$/.test(clause[j + 1]?.lower)) &&
        fcHas(morph(clause[j + 2]), /:V[^/]*:Ip/) && !fcHas(morph(clause[j + 2]), /:V[^/]*:(Iq|K)/));
      const comma = clause.findIndex((x) => x.text === ",");
      const present = si >= 0 && comma > si + 2 && !clause.slice(si + 1, comma).some((x) => fcHas(morph(x), /:V[^/]*:(Iq|K)/));
      const person = morph(t).find((m) => /:K/.test(m))?.match(/:K:([123][sp])/)?.[1];
      if (present && person) {
        const lemma = morph(t).find((m) => /:K/.test(m)).match(/^>([^/]+)\//)[1];
        let form = "";
        try {
          form = conj.getConj(lemma, ":If", `:${person}`) || "";
        } catch {
          // Unknown conjugation.
        }
        if (form && form !== t.lower) add(t, form, "Après « si » + présent, le futur : « " + form + " ».");
      }
    }

    // "Si j’avais su, je serai venu" -> serais (future after a "si" + imperfect clause)
    if (fcHas(morph(t), /:V[^/]*:If/) && !fcHas(morph(t), /:K/)) {
      let k = i - 1;
      while (k >= 0 && !/^[.!?]$/.test(tokens[k].text)) k--;
      const clause = tokens.slice(k + 1, i);
      const si = clause.findIndex((x) => /^(si|s’)$/.test(x.lower));
      const imperfect = si >= 0 && clause.slice(si + 1, si + 4).some((x) => fcHas(morph(x), /:V[^/]*:Iq/));
      const person = morph(t).find((m) => /:If/.test(m))?.match(/:If:([123][sp])/)?.[1];
      if (imperfect && person) {
        const lemma = morph(t).find((m) => /:If/.test(m)).match(/^>([^/]+)\//)[1];
        let form = "";
        try {
          form = conj.getConj(lemma, ":K", `:${person}`) || "";
        } catch {
          // Unknown conjugation.
        }
        if (form && form !== t.lower) add(t, form, "Après « si » + imparfait, le conditionnel : « " + form + " ».");
      }
    }

    // "C’ait la bombe", "il s’ait trompé" -> c’est, s’est: forms that sound
    // like "est" are never elided after "c’" or "s’".
    if (/^(c’|s’)$/.test(t.lower) && next && /^(ait|ai|aie|aies|ais|es|et|é|e|haie|hait)$/.test(next.lower)) {
      const apostrophe = t.text.slice(-1);
      const fix = `${t.lower[0]}${apostrophe}est`;
      add({ start: t.start, end: next.end, text: t.text + next.text }, fix,
        `Confusion probable : « ${t.lower[0]}’est » (verbe être).`, true);
    }

    // "deux las bombe" -> la: "las" (tired) never comes before a noun, and
    // not after "être" ("je suis las de tout" is right).
    if (t.lower === "las" && next && !/^(de|d’|du|des|et|ou|,)$/.test(next.lower) && fcHas(morph(next), /:N/) &&
        /^\p{Ll}/u.test(next.text) && !/^(si|très|trop|bien|tout|un|le|plus|moins|assez|aussi)$/.test(prevLower) &&
        // ("un homme las marche lentement": "las" describes the noun before it.)
        !(prev && fcHas(morph(prev), /:N:[me]/) && !fcHas(morph(prev), /:(V|D|B)/))) {
      const nounMorph = morph(next).find((m) => /:N:[mfe]:[spi]/.test(m)) ?? "";
      const fix = /:N:.:p/.test(nounMorph) ? "les" : /:N:m:s/.test(nounMorph) ? "le" : "la";
      add(t, fix, `Faute de frappe probable : « ${fix} » (article) plutôt que « las » (fatigué).`);
    }

    // "C’est deux la bombe" -> de: a number is never followed by a singular
    // determiner ("nous étions deux la semaine dernière" excepted). "las" is a
    // typo for "la" here ("deux las bombe").
    if (t.lower === "deux" && next && (/^(la|le|l’|un|une|mon|ma|ton|ta|son|sa|ce|cet|cette|notre|votre|leur)$/.test(next.lower) ||
          (next.lower === "las" && next2 && fcHas(morph(next2), /:N:[fe]:s/))) &&
        !/^(étions|sommes|était|étaient|sont|serons|seront|êtes|étiez|étais|à|les|tous|toutes|nous|vous|eux|elles|ils|mes|tes|ses|ces|nos|vos|leurs|[,;:])$/.test(prevLower) &&
        // "il en a pris deux la semaine dernière": a time phrase follows.
        !(next2 && /^(semaine|veille|nuit|matinée|journée|soirée|année|mois|matin|soir|jour|week-end|fois|dernière|dernier|prochaine|prochain|même|suivante|suivant|précédente|précédent)$/.test(next2.lower))) {
      add(t, "de", "Confusion probable : « de » (préposition) plutôt que « deux » (nombre).");
    }

    // "Jaime ce film" -> J’aime (at the start, followed by a determiner)
    if (t.lower === "jaime" && (!prev || FC_CLAUSE_START.has(prevLower)) && next &&
        /^(le|la|les|l’|ce|cet|cette|ces|mon|ma|mes|ton|ta|tes|son|sa|ses|bien|beaucoup|trop|pas|vraiment|tellement|ça|te|vous|un|une|quand|que|qu’)$/.test(next.lower)) {
      add(t, "j’aime", "Apostrophe oubliée : « j’aime ».");
    }

    fcRoundThreeRules(tokens, i, { add, morph, apo, paragraph, spellChecker });
    fcRoundFourRules(tokens, i, { add, morph, apo, paragraph, spellChecker });
  }
  return out;
}

// ---------- Round 3: agreement, tenses, countries, small words ----------

const FC_PRONOMINAL_INVARIABLE = /^(parlé|plu|déplu|complu|succédé|souri|téléphoné|menti|nui|ressemblé|demandé|dit|écrit|rendu|permis|fait|laissé|donné|suffi|survécu|voulu|répondu|envoyé|offert|acheté|promis|juré|posé|imaginé|figuré|attiré|accordé|partagé)$/;
const FC_TIME_FUTURE = /^(demain|bientôt|promis|prochaine|prochain|tard|faute|ce soir|tout à l’heure)$/;
const FC_COUNTRIES_FEM = /^(France|Italie|Espagne|Allemagne|Belgique|Suisse|Chine|Inde|Russie|Angleterre|Irlande|Grèce|Pologne|Suède|Norvège|Turquie|Australie|Algérie|Tunisie|Égypte|Argentine|Colombie|Corée|Hongrie|Autriche|Roumanie|Croatie|Thaïlande|Finlande|Écosse|Afrique|Amérique|Europe|Asie|Bretagne|Normandie|Provence|Bulgarie|Ukraine|Indonésie|Malaisie|Jordanie|Syrie|Libye|Mauritanie|Côte d’Ivoire|Guinée|Islande|Lituanie|Lettonie|Estonie|Slovaquie|Slovénie|Serbie|Bolivie|Nouvelle-Zélande|Arabie|Géorgie|Arménie|Tanzanie|Éthiopie|Somalie|Zambie|Namibie)$/;
const FC_COUNTRIES_MASC = /^(Japon|Canada|Brésil|Maroc|Portugal|Mexique|Danemark|Pérou|Chili|Vietnam|Sénégal|Cameroun|Royaume-Uni|Liban|Pakistan|Nigeria|Kenya|Venezuela|Mali|Niger|Tchad|Gabon|Congo|Bénin|Togo|Burkina|Ghana|Laos|Cambodge|Népal|Bangladesh|Qatar|Yémen|Soudan|Zimbabwe|Mozambique|Paraguay|Honduras|Nicaragua|Costa Rica)$/;
const FC_COUNTRIES_MASC_VOWEL = /^(Iran|Irak|Afghanistan|Ouzbékistan|Équateur|Uruguay|Oman|Azerbaïdjan|Ouganda)$/;
const FC_COUNTRIES_PLURAL = /^(États-Unis|Pays-Bas|Philippines|Émirats|Comores|Seychelles|Maldives)$/;
const FC_MOVE_VERBS = /^(parti|partie|partis|parties|allé|allée|allés|allées|habite|habites|habitent|habitons|habitez|vis|vit|vivent|vivons|vivez|suis|est|sont|sommes|êtes|es|arrivé|arrivée|arrivés|retourné|retournée|rentré|rentrée|né|née|nés|travaille|travailles|travaillent|travaillons|va|vais|vas|vont|allons|allez|aller|partir|pars|part|partons|partez|reste|restes|restent|restons|déménagé|déménage|voyage|voyagé|étudie|étudié|étais|était|habitais|habitait)$/;
const FC_COMMON_NOUNS_CAPPED = /^(matin|soir|nuit|midi|semaine|fromage|pain|beurre|lait|café|thé|eau|vin|bière|maison|école|travail|bureau|voiture|train|plage|mer|montagne|ville|village|parc|jardin|cuisine|chambre|salon|frère|sœur|ami|amie|copain|copine|chien|chat|médecin|prof|patron|collègue|cinéma|restaurant|magasin|supermarché|marché|gare|aéroport|hôpital|anniversaire|vacances|dîner|déjeuner|repas|gâteau|fruits|légumes|viande|poisson|poulet|soupe|devoirs|cours|réunion|fête|week-end|été|hiver|printemps|automne|piscine|boulangerie|pharmacie)$/;

// The participle agreed with a gender ("f"/"m") and number ("s"/"p"), or null.
function fcAgreeParticiple(spellChecker, pp, gender, number) {
  const base = pp.toLowerCase();
  if (!/[éiust]$/.test(base)) return null;
  const want = base + (gender === "f" ? "e" : "") + (number === "p" && !/s$/.test(base) ? "s" : "");
  if (want === base) return null;
  try {
    return spellChecker.isValid(want) ? want : null;
  } catch {
    return null;
  }
}

// Gender and number of the nearest noun before index `k` in the sentence ("Les clés, je les ai…").
function fcNearestNoun(tokens, k, morph, wantNumber) {
  for (let j = k - 1; j >= Math.max(0, k - 12); j--) {
    if (/^[.!?]$/.test(tokens[j].text)) break;
    const ms = morph(tokens[j]).filter((m) => /:N/.test(m));
    if (!ms.length || /^(je|tu|il|elle|on|nous|vous|ils|elles)$/.test(tokens[j].lower)) continue;
    const number = ms.every((m) => /:p/.test(m)) ? "p" : ms.every((m) => /:s/.test(m)) ? "s" : null;
    if (wantNumber && number && number !== wantNumber) continue;
    const gender = ms.every((m) => /:f/.test(m)) ? "f" : ms.every((m) => /:m/.test(m)) ? "m" : null;
    return gender && number ? { gender, number } : null;
  }
  return null;
}

function fcRoundThreeRules(tokens, i, { add, morph, apo, paragraph, spellChecker }) {
  const t = tokens[i];
  const prev = tokens[i - 1], prev2 = tokens[i - 2], prev3 = tokens[i - 3], prev4 = tokens[i - 4];
  const next = tokens[i + 1], next2 = tokens[i + 2];
  const L1 = prev?.lower ?? "", L2 = prev2?.lower ?? "", L3 = prev3?.lower ?? "", R1 = next?.lower ?? "", R2 = next2?.lower ?? "";
  const span = (a, b) => ({ start: a.start, end: b.end, text: paragraph.slice(a.start, b.end) });
  const endOfClause = !next || /^[.,;:!?)»]$/.test(next.text);
  let s = i;
  while (s > 0 && s > i - 40 && !/^[.!?]$/.test(tokens[s - 1].text)) s--;
  let e = i;
  while (e < tokens.length - 1 && e < i + 40 && !/^[.!?]$/.test(tokens[e + 1].text)) e++;
  const sentence = tokens.slice(s, e + 1);
  const isPp = (x) => fcHas(morph(x), /:Q/);
  const msPp = (x) => morph(x).filter((m) => /:Q/.test(m));

  // "Elle s’est endormi" -> endormie ; "Les filles se sont amusé" -> amusées
  if (/^(est|sont|était|étaient|sera|seront)$/.test(L1) && /^(s’|se)$/.test(L2) && isPp(t) && !FC_PRONOMINAL_INVARIABLE.test(t.lower) &&
      msPp(t).every((m) => /:m:s|:e:s/.test(m)) && !(next && (/^(le|la|les|l’|un|une|des|du|mes|ses|leurs|compte|\p{L}+er|\p{L}+ir|\p{L}+re)$/u.test(R1) && !/^(hier|tard|tôt)$/.test(R1)))) {
    let agree = null;
    if (/^(elle|elles|ils)$/.test(L3)) agree = { gender: L3 === "ils" ? "m" : "f", number: L3 === "elle" ? "s" : "p" };
    else if (prev3 && prev4 && /^(la|les|une|des|ma|mes|ta|tes|sa|ses|nos|vos|leurs|ces|cette|mon|ton|son|notre|votre|leur|le|un|ce)$/.test(prev4.lower)) {
      agree = fcNearestNoun(tokens, i - 2, morph, null);
    }
    if (agree && (agree.gender === "f" || agree.number === "p")) {
      const fixed = fcAgreeParticiple(spellChecker, t.text, agree.gender, agree.number);
      if (fixed) add(t, fixed, `Accord du participe avec le sujet : « ${fixed} ».`, true);
    }
  }
  // "Les clés, je les ai posé" -> posées ; "Les tartes que ma grand-mère a préparé" -> préparées
  if (/^(ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient|aurai|aura)$/.test(L1) && isPp(t) && msPp(t).every((m) => /:m:s|:e:s/.test(m)) &&
      !(next && fcHas(morph(next), /:Y/)) && !/^(été|eu|fait|dû|pu|voulu|su|laissé)$/.test(t.lower)) {
    let agree = null;
    if (/^(les|la|l’)$/.test(L2)) {
      // Only a noun set apart before ("Les clés, je les ai…"): the pronoun surely stands for it.
      // The sentence must open on it ("Ça passe plus à la télé, on l’a oublié": not "la télé").
      const comma = tokens.slice(Math.max(s, i - 8), i - 2).findIndex((x) => x.text === ",");
      const head = tokens[s]?.lower ?? "";
      if (comma >= 0 && Math.max(s, i - 8) + comma - s <= 5 &&
          /^(les|la|le|l’|ces|cette|cet|ce|mes|tes|ses|nos|vos|leurs|ma|ta|sa|mon|ton|son|notre|votre|leur)$/.test(head)) {
        agree = fcNearestNoun(tokens, Math.max(s, i - 8) + comma, morph, L2 === "les" ? "p" : "s");
      }
    } else {
      const q = tokens.slice(Math.max(s, i - 6), i).map((x) => (x.lower === "qu’" ? "que" : x.lower)).lastIndexOf("que");
      const qi = q >= 0 ? Math.max(s, i - 6) + q : -1;
      const before = tokens[qi - 1];
      // "Les tartes que ma grand-mère a…": a determiner + noun right before "que", only a subject between.
      if (qi > 1 && before && fcHas(morph(before), /:N/) && !fcHas(morph(before), /:V/) && /^(les|la|le|l’|des|ces|mes|tes|ses|nos|vos|leurs|cette|ma|ta|sa|une|un|mon|ton|son)$/.test(tokens[qi - 2].lower) &&
          !tokens.slice(qi + 1, i - 1).some((x) => /^[,;:]$/.test(x.text) || fcHas(morph(x), /:V/) && !/^(nous|vous)$/.test(x.lower))) {
        agree = fcNearestNoun(tokens, qi, morph, null);
      }
    }
    if (agree && (agree.gender === "f" || agree.number === "p")) {
      const fixed = fcAgreeParticiple(spellChecker, t.text, agree.gender, agree.number);
      if (fixed) add(t, fixed, `Le complément est placé avant « avoir » : le participe s’accorde, « ${fixed} ».`, true);
    }
  }
  // "Demain, je te le dirais" -> dirai ; "Quand tu seras grand, tu comprendrais" -> comprendras
  if (/rais$/.test(t.lower) && fcHas(morph(t), /:K:[12]s/) && !/^(aimerais|voudrais|pourrais|devrais|souhaiterais|préférerais|saurais|serais|aurais)$/.test(t.lower) ||
      /^(serais|aurais)$/.test(t.lower) && fcHas(morph(t), /:K:1s/)) {
    const words = sentence.map((x) => x.lower).join(" ");
    const subj = tokens.slice(Math.max(s, i - 4), i).find((x) => /^(je|j’|tu)$/.test(x.lower));
    const future = /\b(demain|bientôt|promis|sans faute|la semaine prochaine|le mois prochain|tout à l’heure|ce soir|dans une heure|dans deux jours)\b/.test(words) ||
      /\b(quand|lorsque|dès que|une fois que)\b/.test(words) && sentence.some((x) => x !== t && fcHas(morph(x), /:If/));
    if (subj && future && !/\b(si|s’il|s’ils|sinon|à ta place|à votre place|j’aimerais|volontiers)\b/.test(words) &&
        !/^(heureux|heureuse|ravi|ravie|content|contente|curieux|curieuse|prêt|prête)$/.test(R1)) {
      add(t, t.text.replace(/s$/, ""), "Une action certaine dans le futur : le futur, pas le conditionnel.", true);
    }
  }
  // "Appeles-moi" -> Appelle-moi
  const imp = t.text.match(/^(\p{L}+)es-(moi|toi|nous|le|la|les|lui|leur|en|y)$/u);
  if (imp && fcHas(fcMorph(spellChecker, imp[1] + "es"), /:V1.*:Ip.*:2s/)) {
    const lemma = fcMorph(spellChecker, imp[1] + "es").map((m) => m.match(/^>([^/]+)/)?.[1]).find(Boolean);
    let form = null;
    try {
      form = lemma && conj.getConj(lemma, ":E", ":2s");
    } catch {
      form = null;
    }
    if (form) add(t, `${form}-${imp[2]}`, "Impératif des verbes en -er : pas de « s » (« appelle-moi »).", true);
  }
  // "Je vais lui demandé" -> demander
  if (/é$/.test(t.lower) && /^(lui|leur|le|la|les|me|te|nous|vous|y|en|l’|m’|t’|s’|se)$/.test(L1) &&
      /^(vais|vas|va|allons|allez|vont|aller|allait|allais|veux|veut|voulons|voulez|veulent|peux|peut|pouvons|pouvez|peuvent|dois|doit|devons|devez|doivent|faut|faudrait|pourrais|voudrais|devrais|pourrait|devrait)$/.test(L2) &&
      fcHas(morph(t), /:V1/)) {
    add(t, `${t.text.slice(0, -1)}er`, "Après « aller », « pouvoir », « devoir »… : l’infinitif.", true);
  }
  // "Regarde ses nuages" -> ces ; "Chacun range ces affaires" -> ses
  if (t.lower === "ses" && /^(regarde|regardez|regardons|vois|voyez|écoute|écoutez|sens|sentez|admire|admirez|vise|visez)$/.test(L1)) add(t, "ces", "Pour montrer : « ces » (ces nuages-là).", true);
  if (t.lower === "ces" && L2 === "chacun" && fcHas(morph(prev), /:V/)) add(t, "ses", "Ce qui lui appartient : « ses ».", true);
  // "Il s’est que tu as raison" -> sait
  if (t.lower === "s’" && R1 === "est" && /^(que|qu’|comment|pourquoi|où|si)$/.test(R2) && /^(il|elle|on|chacun|personne|qui)$/.test(L1)) {
    add(span(t, next), "sait", "Le verbe « savoir » : « il sait ».", true);
  }
  // "aucun davantage" -> avantage
  if (t.lower === "davantage" && /^(aucun|un|cet|l’|des|les|ses|gros|grand|petit|seul|véritable|énorme|net|léger|dernier|premier|cet|quel|son|leur|mon|ton|notre|votre)$/.test(L1)) {
    add(t, "avantage", "Le nom est « avantage » ; « davantage » veut dire « plus ».", true);
  }
  // "Cette été" -> Cet ; "cet voiture" -> cette
  if (/^(cette|cet)$/.test(t.lower) && next && /^\p{Ll}/u.test(next.text)) {
    const nouns = morph(next).filter((m) => /:N/.test(m));
    const masc = nouns.length && nouns.every((m) => /:m/.test(m)) && !fcHas(morph(next), /:A.*:[fe]/);
    const fem = nouns.length && nouns.every((m) => /:f/.test(m));
    if (t.lower === "cette" && masc && /^[aeiouyéèêâîôûœh]/.test(R1)) add(t, "cet", "Devant un nom masculin : « cet » (cet été).", true);
    if (t.lower === "cet" && fem) add(t, "cette", "Devant un nom féminin : « cette ».", true);
  }
  // "La musée" -> Le ; "le voiture" -> la
  if (/^(le|la|un|une)$/.test(t.lower) && next && /^\p{Ll}+$/u.test(next.text) && !(prev && /^(je|tu|il|elle|on|nous|vous|ils|elles|ne|n’)$/.test(L1))) {
    const all = morph(next);
    const nouns = all.filter((m) => /:N/.test(m));
    // A singular noun only: "le maisons" is a number mistake ("les"), not a gender one.
    if (nouns.length && nouns.length === all.length && !nouns.some((m) => /:p/.test(m))) {
      const masc = nouns.every((m) => /:m/.test(m)) && !nouns.some((m) => /:[fe]/.test(m));
      const fem = nouns.every((m) => /:f/.test(m)) && !nouns.some((m) => /:[me]/.test(m));
      const fix = { la: masc ? "le" : null, une: masc ? "un" : null, le: fem ? "la" : null, un: fem ? "une" : null }[t.lower];
      if (fix && !(fix === "le" && /^[aeiouyéèêâîôûœh]/.test(R1)) && !(fix === "la" && /^[aeiouyéèêâîôûœ]/.test(R1)) && !(next2 && fcHas(morph(next2), /:N/) && /^(de|d’)$/.test(R2) === false && false)) {
        add(t, fix, `« ${next.text} » est ${masc ? "masculin" : "féminin"} : « ${fix} ».`, true);
      }
    }
  }
  // Countries: "à France" -> en ; "à Japon" -> au ; "au Italie" -> en
  if (next && /^(à|a|au|aux|en)$/.test(t.lower) && (FC_COUNTRIES_FEM.test(next.text) || FC_COUNTRIES_MASC.test(next.text) || FC_COUNTRIES_MASC_VOWEL.test(next.text) || FC_COUNTRIES_PLURAL.test(next.text)) &&
      (t.lower !== "a" || FC_MOVE_VERBS.test(L1)) && !/^(la|le|les|l’)$/.test(L1)) {
    const want = FC_COUNTRIES_PLURAL.test(next.text) ? "aux" : FC_COUNTRIES_MASC.test(next.text) ? "au" : "en";
    const afterDe = /^(de|du|des|d’)$/.test(L1);
    if (want !== t.lower && !afterDe && !(t.lower === "en" && want === "au" && false)) add(t, want, `Devant « ${next.text} » : « ${want} ${next.text} ».`, true);
  }
  // "parti a Lyon" -> à
  if (t.lower === "a" && next && /^\p{Lu}\p{Ll}/u.test(next.text) && FC_MOVE_VERBS.test(L1) && !/^(il|elle|on)$/.test(L1)) add(t, "à", "Un lieu : « à » (avec accent).", true);
  // "la où" -> là où
  if (t.lower === "la" && R1 === "où") add(t, "là", "« Là où » prend un accent.", true);
  // "sens doute" -> sans ; "pas de sans" -> sens
  if (t.lower === "sens" && /^(doute|cesse|problème|faute|souci|hésiter|hésitation|arrêt|attendre|compter|parler|rien|aucun|aucune|moi|toi|lui|elle|eux|nous|vous)$/.test(R1) && !/^(le|les|un|du|de|bon|ce|son|mon|ton|en|tous)$/.test(L1)) {
    add(t, "sans", "La préposition : « sans ».", true);
  }
  if (t.lower === "sans" && /^(de|du|le|bon|ce|aucun)$/.test(L1) && endOfClause) add(t, "sens", "Le nom : « sens » (signification).", true);
  // "nuit, est je suis" -> et
  if (t.lower === "est" && /^(je|j’|tu|nous|vous)$/.test(R1) && !/^(c’|qu’|n’|ce|où|comment|que|il|elle|on|quel|quelle|qui)$/.test(L1) && !/-/.test(t.text)) {
    add(t, "et", "Pour relier : « et ».", true);
  }
  // "prés de mon travail" -> près
  if (t.lower === "prés" && /^(de|du|des|d’)$/.test(R1) && !/^(les|des|ces|nos|vos|aux|beaux|verts|grands|petits|mes|ses|leurs)$/.test(L1)) add(t, "près", "« Près de » (proche) prend un accent grave.", true);
  // "pieds nu" -> pieds nus ; "nus-pieds" -> nu-pieds
  if (t.lower === "nu" && L1 === "pieds") add(t, "nus", "Après le nom, « nu » s’accorde : « pieds nus ».", true);
  if (t.lower === "nus-pieds" || t.lower === "nues-pieds") add(t, "nu-pieds", "Avant le nom, « nu » reste invariable : « nu-pieds ».", true);
  // "Elle ma dit" -> m’a
  if (t.lower === "ma" && next && (/^(dit|fait|donné|appelé|envoyé|demandé|écrit|répondu|parlé|montré|offert|prêté|expliqué|raconté|promis|proposé|conseillé|appris|laissé|aidé|invité|attendu|vu|eu|pris|mis|rendu|dit)$/.test(R1)) &&
      /^(il|elle|on|qui|ça|cela|tu|personne)$/.test(L1)) {
    add(t, apo("m’a"), "« M’a » (me + a) : « elle m’a dit ».", true);
  }
  // "Je suis 20 ans" -> J’ai
  if (t.lower === "je" && R1 === "suis" && next2 && /^(\d+|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante)$/.test(R2) && tokens[i + 3]?.lower === "ans") {
    add(span(t, next), apo(/^J/.test(t.text) ? "J’ai" : "j’ai"), "L’âge se dit avec « avoir » : « j’ai 20 ans ».", true, true);
  }
  // "de les enfants" -> des ; "à le marché" -> au ; "de un pull" -> d’un
  if (/^(de|à)$/.test(t.lower) && /^(le|les|un|une)$/.test(R1) && next2 && fcHas(morph(next2), /:N/) && !fcHas(morph(next2), /:V/) && !/^[aeiouyéèêâîôûœh]/.test(R2) || /^(de|à)$/.test(t.lower) && /^(un|une)$/.test(R1) && next2 && fcHas(morph(next2), /:N/)) {
    const fix = { "de le": "du", "de les": "des", "à le": "au", "à les": "aux", "de un": apo("d’un"), "de une": apo("d’une") }[`${t.lower} ${R1}`];
    if (fix && !(fix.startsWith("d’") && /^(\d|à)/.test(R2))) add(span(t, next), fix, `« ${t.lower} ${R1} » se contracte : « ${fix} ».`, true);
  }
  // "avec tu" -> toi
  if (t.lower === "tu" && /^(avec|pour|chez|sans|comme|que|et|de|contre|derrière|devant|après|avant)$/.test(L1) && endOfClause && L1 !== "que") add(t, "toi", "Après une préposition : « toi ».", true);
  // "Ma sœur à deux enfants" -> a
  if (t.lower === "à" && prev && prev2 && /^(ma|mon|ta|ton|sa|son|notre|votre|leur)$/.test(L2) && fcHas(morph(prev), /:N/) && (!prev3 || /^[.!?,;:]$/.test(prev3.text)) &&
      /^(deux|trois|quatre|cinq|six|un|une|des|beaucoup|\d+|plusieurs|besoin|faim|soif|peur|raison|tort|mal|toujours|déjà|jamais|encore|perdu|fini|mangé|dit|fait|eu|été)$/.test(R1)) {
    add(t, "a", "Le verbe « avoir » : « a » sans accent.", true);
  }
  // ", mes un peu loin" -> mais
  if (t.lower === "mes" && /^[,]$/.test(prev?.text ?? "") && /^(un|il|je|on|ce|c’|pas|elle|nous|vous|ça|j’|tu|ils|elles|le|la|les|trop|plutôt|bon|bien|non|si|quand|comme)$/.test(R1)) {
    add(t, "mais", "Pour opposer : « mais ».", true);
  }
  // "Je je", "la la piscine" -> one word
  if (prev && t.lower === L1 && !(/^\p{Lu}/u.test(t.text) && /^\p{Ll}/u.test(prev.text)) && /^(je|tu|il|elle|on|le|la|les|un|une|des|de|du|à|et|en|pour|dans|sur|avec|mon|ma|mes|ton|ta|ce|cette|qui|que|pas|ne|au|aux|est|a)$/.test(t.lower) &&
      paragraph.slice(prev.end, t.start) === " " && !(tokens[i + 1]?.lower === t.lower)) {
    add(span(prev, t), prev.text, "Mot répété.", true, true);
  }
  // "ce Matin", "du Fromage" -> lowercase
  if (/^\p{Lu}\p{Ll}+$/u.test(t.text) && FC_COMMON_NOUNS_CAPPED.test(t.lower) && prev && /^\p{Ll}/u.test(prev.text) &&
      /^(ce|du|de|le|la|les|au|aux|un|une|des|mon|ma|mes|ton|ta|son|sa|ses|à|en|cette|chez|notre|votre)$/.test(L1) && !(next && /^\p{Lu}/u.test(next.text)) &&
      // "la Maison de Victor Hugo", "le Parc des Princes": a name.
      !/^(de|du|des|d’)$/.test(R1) && !/^(de|du|des|d’)$/.test(R2) &&
      !(prev2 && /^\p{Lu}/u.test(prev2.text) && !/^[.!?]$/.test(tokens[i - 3]?.text ?? ".")) && !/[«"“]\s*$/.test(paragraph.slice(0, t.start))) {
    add(t, t.lower, "Nom commun : pas de majuscule.", true, true);
  }
}

// ---------- Round 4: homophones in new contexts, compound subjects, spoken French ----------

const FC_NATIONALITIES = /^(français|française|françaises|anglais|anglaise|anglaises|italien|italienne|italiens|italiennes|espagnol|espagnole|espagnols|espagnoles|allemand|allemande|allemands|allemandes|belge|belges|suisse|suisses|américain|américaine|américains|américaines|canadien|canadienne|canadiens|canadiennes|japonais|japonaise|chinois|chinoise|portugais|portugaise|marocain|marocaine|algérien|algérienne|tunisien|tunisienne|grec|grecque|russe|russes|polonais|polonaise|turc|turque|brésilien|brésilienne|mexicain|mexicaine|irlandais|irlandaise|écossais|écossaise|néerlandais|néerlandaise|suédois|suédoise|norvégien|norvégienne|danois|danoise|vietnamien|vietnamienne|coréen|coréenne|indien|indienne|libanais|libanaise|sénégalais|sénégalaise|ivoirien|ivoirienne|camerounais|camerounaise|québécois|québécoise)$/;
const FC_FAMILY = /^(frère|sœur|soeur|père|mère|cousin|cousine|copain|copine|ami|amie|voisin|voisine|oncle|tante|fils|fille|mari|femme|grand-mère|grand-père|patron|patronne|collègue|chef|parents|grands-parents|enfants)$/;
const FC_SHOPS_FEM = /^(boulangerie|pharmacie|poste|banque|gare|mairie|piscine|plage|bibliothèque|boucherie|librairie|laverie|pâtisserie|fromagerie|poissonnerie|épicerie|station|salle|médiathèque|crèche|cantine|préfecture)$/;
const FC_SHOPS_MASC = /^(supermarché|marché|cinéma|garage|restaurant|bureau|stade|parc|musée|théâtre|lycée|collège|travail|centre|magasin|kiosque|pressing|tabac|bar|café)$/;
const FC_ADVERBS_BETWEEN = /^(très|bien|mal|vite|déjà|beaucoup|tous|toutes|toujours|encore|vraiment|rapidement|enfin|finalement|aussi|plutôt|assez|trop|si|peu|souvent|longtemps)$/;

function fcRoundFourRules(tokens, i, { add, morph, apo, paragraph, spellChecker }) {
  const t = tokens[i];
  const prev = tokens[i - 1], prev2 = tokens[i - 2], prev3 = tokens[i - 3], prev4 = tokens[i - 4];
  const next = tokens[i + 1], next2 = tokens[i + 2];
  const L1 = prev?.lower ?? "", L2 = prev2?.lower ?? "", L3 = prev3?.lower ?? "", R1 = next?.lower ?? "", R2 = next2?.lower ?? "";
  const span = (a, b) => ({ start: a.start, end: b.end, text: paragraph.slice(a.start, b.end) });
  const isBoundary = (x) => !x || /^[.!?;:,()«»"“”—–-]$/.test(x.text);
  const isPpOnly = (x) => !!x && fcHas(morph(x), /:Q/) && !fcHas(morph(x), /:N/);
  const nounOnly = (x) => !!x && morph(x).length > 0 && morph(x).every((m) => /:N/.test(m));
  let s = i;
  while (s > 0 && s > i - 40 && !/^[.!?]$/.test(tokens[s - 1].text)) s--;
  // The sentence around the word, bounded: a huge unpunctuated text must not cost n² per word.
  let e = i;
  while (e < tokens.length - 1 && e < i + 30 && !/^[.!?]$/.test(tokens[e + 1].text)) e++;
  const sentence = tokens.slice(s, e + 1);
  const words = sentence.map((x) => x.lower).join(" ");

  // "Mon voisin ce plaint" -> se (a conjugated verb, not a noun, after "ce")
  if (t.lower === "ce" && next && fcHas(morph(next), /:V[^/]*:(Ip|Iq|If|K|Sp):3[sp]/) && !fcHas(morph(next), /:N|:A|:D/) &&
      !/^(sont|est|fut|furent|sera|seront|serait|seraient|était|étaient|doit|doivent|devait|devrait|peut|peuvent|pouvait|pourrait|semble|semblait|sembla)$/.test(R1) &&
      !/^(de|à|par|pour|sur|dans|avec|sans|que|qu’)$/.test(L1)) {
    add(t, "se", "Devant un verbe pronominal : « se » (il se plaint).", true);
  }
  // "Le rendez-vous ces bien passé" -> s’est
  if (t.lower === "ces" && next && (isPpOnly(next) || FC_ADVERBS_BETWEEN.test(R1) && isPpOnly(next2))) {
    add(t, apo("s’est"), "« S’est » (se + est) : « il s’est bien passé ».", true);
  }
  // "Les voisins on refait" -> ont (a plural noun is the subject)
  if (t.lower === "on" && prev && prev2 && /^(les|des|mes|tes|ses|nos|vos|leurs|ces|plusieurs)$/.test(L2) && fcHas(morph(prev), /:N[^/]*:[pi]/) &&
      next && (isPpOnly(next) || fcHas(morph(next), /:Q/) && fcHas(morph(next), /:V/))) {
    add(t, "ont", "Le verbe « avoir » au pluriel : « ils ont ».", true);
  }
  // "elle sans est bien sortie" -> s’en
  if (t.lower === "sans" && /^(est|sont|était|étaient|sera|va|vont|allait|fiche|fichent|fout|foutent|souvient|souviennent|sort|sortent|occupe|occupent|charge|chargent|aperçoit|rend|rendent|moque|moquent|sert|servent|veut|veulent)$/.test(R1) &&
      /^(il|elle|on|ils|elles|qui|ça|cela|je|tu|nous|vous|ne)$/.test(L1)) {
    add(t, apo("s’en"), "« S’en » (se + en) : « elle s’en est sortie ».", true);
  }
  // "J’ai rangé mais affaires" -> mes
  if (t.lower === "mais" && prev && next && fcHas(morph(prev), /:V|:Q/) && !fcHas(morph(prev), /:N/) && nounOnly(next) && fcHas(morph(next), /:p/)) {
    add(t, "mes", "Le possessif : « mes » (mes affaires).", true);
  }
  // "Mon chef ma demandé" -> m’a
  if (t.lower === "ma" && /^(dit|fait|donné|appelé|envoyé|demandé|écrit|répondu|parlé|montré|offert|prêté|expliqué|raconté|promis|proposé|conseillé|appris|laissé|aidé|invité|attendu|vu|eu|pris|mis|rendu|confié|annoncé|prévenu|félicité|remercié|rappelé|averti|oublié|reconnu|déçu|surpris)$/.test(R1) &&
      !/^(de|à|par|pour|sur|dans|avec|sans|en)$/.test(L1)) {
    add(t, apo("m’a"), "« M’a » (me + a) : « il m’a demandé ».", true);
  }
  // "je ne sais pas quand penser" -> qu’en
  if (t.lower === "quand" && /^(penser|dire|faire|conclure)$/.test(R1)) add(t, apo("qu’en"), "« Qu’en » (que + en) : « qu’en penser ».", true);
  // "Je crois que Paul la pris" -> l’a
  if (t.lower === "la" && next && isPpOnly(next) && !fcHas(morph(next), /:A/) && prev &&
      (/^(il|elle|on|qui|ça|cela)$/.test(L1) || /^\p{Lu}/u.test(prev.text) && !isBoundary(prev2) && !/^(la|le|les|l’)$/.test(L2))) {
    add(t, apo("l’a"), "« L’a » (le + a) : « il l’a pris ».", true);
  }
  // "Le directeur et son adjoint viendra" -> viendront (two subjects)
  if (fcHas(morph(t), /:V[^/]*:(Ip|If|Iq|K):3s/) && !fcHas(morph(t), /:N/) && prev && prev2 && prev3 && prev4 && tokens[i - 5] &&
      fcHas(morph(prev), /:N[^/]*:s/) && /^(le|la|l’|son|sa|mon|ma|ton|ta|notre|votre|leur|un|une)$/.test(L2) && L3 === "et" &&
      fcHas(morph(prev4), /:N[^/]*:s/) && /^(le|la|l’|son|sa|mon|ma|ton|ta|notre|votre|leur|un|une)$/.test(tokens[i - 5].lower) && isBoundary(tokens[i - 6])) {
    const plural = fcConjugateAs(spellChecker, t.text, "3p");
    if (plural) add(t, plural.split("|")[0], "Deux sujets reliés par « et » : le verbe au pluriel.", true);
  }
  // "Chacun des participants recevront" -> recevra
  if (fcHas(morph(t), /:V[^/]*:(Ip|If|Iq|K):3p/) && !fcHas(morph(t), /:N/)) {
    const c = tokens.slice(Math.max(s, i - 6), i).findIndex((x) => /^(chacun|chacune)$/.test(x.lower));
    const between = c >= 0 ? tokens.slice(Math.max(s, i - 6) + c + 1, i) : [];
    if (c >= 0 && /^(des|de|d’entre)$/.test(between[0]?.lower ?? "") && !between.some((x) => fcHas(morph(x), /:V[^/]*:(Ip|If|Iq|K)/) && !fcHas(morph(x), /:N/))) {
      const single = fcConjugateAs(spellChecker, t.text, "3s");
      if (single) add(t, single.split("|")[0], "« Chacun » est singulier : le verbe aussi.", true);
    }
  }
  // "Ma grand-mère et ma tante sont venu" -> venues (two feminine subjects)
  if (/^(sont|étaient|seront|furent)$/.test(L1) && isPpOnly(t) && morph(t).filter((m) => /:Q/.test(m)).every((m) => /:m:s|:e:s/.test(m))) {
    const subject = tokens.slice(s, i - 1);
    const et = subject.findIndex((x) => x.lower === "et");
    const nouns = subject.filter((x) => nounOnly(x) || fcHas(morph(x), /:N/) && /-/.test(x.text));
    if (et > 0 && nouns.length === 2 && subject.length <= 7) {
      const fem = nouns.every((x) => morph(x).filter((m) => /:N/.test(m)).every((m) => /:f/.test(m)));
      const fixed = fcAgreeParticiple(spellChecker, t.text, fem ? "f" : "m", "p");
      if (fixed) add(t, fixed, `Deux sujets reliés par « et » : « ${fixed} ».`, true);
    }
  }
  // "Les vacances se sont très bien passé", "Les deux équipes se sont neutralisé"
  if (isPpOnly(t) && morph(t).filter((m) => /:Q/.test(m)).every((m) => /:m:s|:e:s/.test(m)) && !FC_PRONOMINAL_INVARIABLE.test(t.lower) &&
      !(next && /^(le|la|les|l’|un|une|des|du|compte)$/.test(R1))) {
    let k = i - 1;
    while (k > s && FC_ADVERBS_BETWEEN.test(tokens[k].lower)) k--;
    if (k < i - 1 && /^(est|sont|était|étaient)$/.test(tokens[k].lower) && /^(s’|se)$/.test(tokens[k - 1]?.lower ?? "")) {
      const subj = tokens[k - 2];
      let agree = null;
      if (/^(elle|elles|ils)$/.test(subj?.lower ?? "")) agree = { gender: subj.lower === "ils" ? "m" : "f", number: subj.lower === "elle" ? "s" : "p" };
      else if (subj && fcHas(morph(subj), /:N/)) agree = fcNearestNoun(tokens, k - 1, morph, null);
      if (agree && (agree.gender === "f" || agree.number === "p")) {
        const fixed = fcAgreeParticiple(spellChecker, t.text, agree.gender, agree.number);
        if (fixed) add(t, fixed, `Accord du participe avec le sujet : « ${fixed} ».`, true);
      }
    }
  }
  // "Quand j’étais petit, je courrais partout" -> courais (a past habit, not a condition)
  if (/^(courrais|courrait|courraient|mourrais|mourrait)$/.test(t.lower) &&
      /\b(quand j’étais|quand il était|quand elle était|quand on était|autrefois|avant|tous les|chaque|d’habitude|à l’époque)\b/.test(words) && !/\b(si|s’il)\b/.test(words)) {
    add(t, t.text.replace("rr", "r"), "Une habitude passée : l’imparfait (« je courais »).", true);
  }
  // "dès que j’ai finis la vidéo" -> fini (the object comes after: no agreement)
  if (/^(ai|as|a|avons|avez|ont|avais|avait)$/.test(L1) && /[is]s$/.test(t.lower) && fcHas(morph(t), /:Q[^/]*:m:p/) &&
      next && /^(la|le|les|l’|un|une|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|votre|leur|leurs|ce|cette|ces|du|des)$/.test(R1)) {
    add(t, t.text.slice(0, -1), "Le complément vient après « avoir » : le participe ne s’accorde pas.", true);
  }
  // "Il a résout le problème" -> résolu (a conjugated verb after "avoir")
  if (/^(ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient|aura|aurait)$/.test(L1) && prev2 && /^(j’|je|tu|il|elle|on|nous|vous|ils|elles|qui)$/.test(L2) &&
      fcHas(morph(t), /:V[^/]*:Ip/) && !fcHas(morph(t), /:Q|:N|:A|:Y/) && typeof suggVerbPpas === "function") {
    const pp = String(suggVerbPpas(t.lower) || "").split("|")[0];
    if (pp && pp !== t.lower) add(t, pp, "Après « avoir », le participe passé.", true);
  }
  // "Prend ton parapluie" -> Prends (the imperative of these verbs ends in -s)
  // (At the very start of a sentence only: "Charles Hugo, apprend la technique" has a subject.)
  if ((!prev || /^[.!?]$/.test(prev.text)) && /^\p{Lu}/u.test(t.text) && /[dt]$/.test(t.lower) && fcHas(morph(t), /:V3[^/]*:Ip[^/]*:3s/) && !fcHas(morph(t), /:N|:A/) &&
      /^(ton|ta|tes|le|la|les|un|une|ça|ce|cette|ces|du|de|des|soin|garde|vite|moi|tout)$/.test(R1) && /[.!]\s*$/.test(paragraph)) {
    add(t, `${t.text}s`, "Impératif : « prends », « mets », « attends » prennent un -s.", true);
  }
  // "Mon voisin est Italien" -> italien (an adjective after "être")
  if (/^\p{Lu}\p{Ll}+$/u.test(t.text) && FC_NATIONALITIES.test(t.lower) && /^(est|suis|es|sont|sommes|êtes|était|étais|devenu|devenue|né|née)$/.test(L1)) {
    add(t, t.lower, "Adjectif de nationalité : pas de majuscule (« il est italien »).", true, true);
  }
  // "Je lai croisé" -> l’ai
  if (t.lower === "lai" && /^(je|j’|tu|il|elle|on)$/.test(L1)) add(t, apo("l’ai"), "« L’ai » (le + ai) : « je l’ai vu ».", true);
  // "la voiture à mon frère" -> de (possession)
  if (t.lower === "à" && prev && prev2 && /^(le|la|les|l’|un|une)$/.test(L2) && nounOnly(prev) && /^(mon|ma|mes|ton|ta|tes|son|sa|ses|notre|votre|leur|nos|vos|leurs)$/.test(R1) && FC_FAMILY.test(R2)) {
    add(t, "de", "La possession : « la voiture de mon frère ».", true);
  }
  // "à cause qu’il pleuvait" -> parce qu’il
  if (t.lower === "à" && R1 === "cause" && /^(que|qu’)$/.test(R2)) add(span(t, next2), apo(R2 === "que" ? "parce que" : "parce qu’"), "« À cause de » + nom, mais « parce que » + verbe.", true);
  // "Je préfère le thé que le café" -> au café
  if (/^(que|qu’)$/.test(t.lower) && /^(le|la|les|l’)$/.test(R1) && tokens.slice(Math.max(s, i - 5), i).some((x) => /^préf[eéè]r/.test(x.lower)) && !tokens.slice(Math.max(s, i - 5), i).some((x) => /^(plutôt|mieux|plus)$/.test(x.lower))) {
    const fix = { le: "au", la: "à la", les: "aux", "l’": apo("à l’") }[R1];
    add(span(t, next), fix, "On préfère une chose « à » une autre.", true);
  }
  // "en face la mairie" -> en face de la mairie
  if (t.lower === "face" && L1 === "en" && /^(la|le|les|l’|mon|ma|mes|ton|ta|son|sa|chez)$/.test(R1)) add(span(prev, t), "en face de", "« En face de ».", true);
  // "Je suis été au cinéma" -> J’ai été
  if (t.lower === "je" && R1 === "suis" && R2 === "été" && !(tokens[i + 3] && fcHas(morph(tokens[i + 3]), /:Q/))) {
    add(span(t, next), apo(/^J/.test(t.text) ? "J’ai" : "j’ai"), "Avec « été », l’auxiliaire « avoir » : « j’ai été ».", true, true);
  }
  // "mal dans la tête" -> mal à la tête
  if (t.lower === "dans" && L1 === "mal" && /^(la|le)$/.test(R1) && /^(tête|gorge|dos|ventre|cou|bras|jambe|pied|pieds|genou|dent|dents|oreille|oreilles|cœur|coeur|poignet|épaule|cheville)$/.test(R2)) {
    add(span(t, next), R1 === "la" ? "à la" : "au", "On a mal « à » une partie du corps.", true);
  }
  // "le document que j’ai besoin" -> dont
  if (/^(que|qu’)$/.test(t.lower) && prev && nounOnly(prev) && (() => {
    let k = i + 1;
    if (/^(j’|je|tu|il|elle|on|nous|vous|ils|elles)$/.test(tokens[k]?.lower ?? "")) k++;
    if (!/^(ai|as|a|avons|avez|ont|avais|avait)$/.test(tokens[k]?.lower ?? "")) return false;
    const what = tokens[k + 1];
    return !!what && (/^(besoin|envie|peur|honte)$/.test(what.lower) || /^(parlé|discuté|rêvé)$/.test(what.lower) && (isBoundary(tokens[k + 2]) || /^(hier|avant|ce|tout|la|l’autre)$/.test(tokens[k + 2]?.lower ?? "")));
  })()) {
    add(t, "dont", "« Avoir besoin de », « parler de » : « dont ».", true);
  }
  // "le contrat de suite" -> tout de suite
  if (t.lower === "de" && R1 === "suite" && L1 !== "tout" && !/^(ainsi|fois|jours|heures|nuits|semaines|ans|années|mois|victoires|matchs|reprises|soirs|matins)$/.test(L1) && (isBoundary(next2) || !next2)) {
    add(span(t, next), "tout de suite", "« De suite » veut dire « à la suite » ; « immédiatement », c’est « tout de suite ».", true);
  }
  // "plus pire" -> pire ; "dedans le" -> dans le
  if (t.lower === "plus" && R1 === "pire") add(span(t, next), "pire", "« Pire » est déjà un comparatif.", true);
  if (t.lower === "dedans" && /^(le|la|les|l’|mon|ma|mes|ton|ta|son|sa|ses|un|une|ce|cette|notre|votre|leur)$/.test(R1)) add(t, "dans", "Devant un nom : « dans » (« dedans » s’emploie seul).", true);
  // "Je me demande qu’est-ce qu’il veut" -> ce qu’il
  if (/^(qu’est-ce|qu'est-ce)$/.test(t.lower) && /^(que|qu’|qui)$/.test(R1) &&
      tokens.slice(Math.max(s, i - 4), i).some((x) => /^(demande|demandes|demandais|demandait|sais|sait|savais|comprends|comprend|explique|expliquer|ignore|dis-moi|dites-moi|savoir|dire)$/.test(x.lower))) {
    add(span(t, next), apo(R1 === "qui" ? "ce qui" : R1 === "que" ? "ce que" : "ce qu’"), "Dans une question indirecte : « je me demande ce qu’il veut ».", true);
  }
  // "beaucoup des candidatures" -> beaucoup de
  if (t.lower === "des" && /^(beaucoup|peu|assez|trop|plein|énormément)$/.test(L1) && next && nounOnly(next) &&
      !tokens.slice(i + 2, i + 5).some((x) => /^(que|qu’|qui|de|d’|du|dont|des)$/.test(x.lower))) {
    add(t, "de", `Après « ${L1} » : « de » (${L1} de candidatures).`, true);
  }
  // "Je ne mange plus du gluten" -> de (a negation)
  if (/^(du|des)$/.test(t.lower) && /^(plus|pas|jamais)$/.test(L1) && prev2 && fcHas(morph(prev2), /:V/) && !fcHas(morph(prev2), /:V0e/) &&
      tokens.slice(Math.max(s, i - 4), i - 1).some((x) => /^(ne|n’)$/.test(x.lower)) && next && nounOnly(next) && !/^(tout)$/.test(R1)) {
    add(t, /^[aeiouyéèêâîôûœh]/.test(R1) ? apo("d’") : "de", "Après une négation : « de » (je ne mange plus de gluten).", true);
  }
  // "dommage de pas l’avoir fait", "pour jamais oublier" -> de ne pas (a negated infinitive)
  if (/^(pas|jamais)$/.test(t.lower) && /^(de|pour)$/.test(L1)) {
    let k = i + 1;
    while (tokens[k] && /^(l’|le|la|les|me|m’|te|t’|se|s’|y|en|lui|leur|nous|vous)$/.test(tokens[k].lower)) k++;
    if (tokens[k] && fcHas(morph(tokens[k]), /:Y/)) {
      add(t, `ne ${t.lower}`, "Il manque l’adverbe de négation « ne » (« de ne pas le faire »).", true);
    }
  }
  // "lu sur le journal" -> dans le journal
  if (t.lower === "sur" && /^(le|un|ce)$/.test(R1) && /^(journal|magazine|livre|roman|dictionnaire)$/.test(R2) && /^(lu|lire|lis|lit|vu|écrit|trouvé)$/.test(L1)) {
    add(t, "dans", "On lit quelque chose « dans » le journal.", true);
  }
  // "un grave faute", "un période" -> une (an adjective may come between)
  if (/^(un|une)$/.test(t.lower) && next && next2 && fcHas(morph(next), /:A/) && !fcHas(morph(next), /:N/) && nounOnly(next2) && !fcHas(morph(next2), /:p/)) {
    const nouns = morph(next2);
    // "une longue fil d’attente" is "file": a word of the other gender one letter away.
    const twin = (w) => fcMorph(spellChecker, w).some((m) => /:N/.test(m));
    const otherGender = twin(`${next2.lower}e`) || (/e$/.test(next2.lower) && twin(next2.lower.slice(0, -1)));
    const fem = !otherGender && nouns.every((m) => /:f/.test(m)) && !nouns.some((m) => /:[me]/.test(m));
    const masc = !otherGender && nouns.every((m) => /:m/.test(m)) && !nouns.some((m) => /:[fe]/.test(m));
    if (t.lower === "un" && fem) add(t, "une", `« ${next2.text} » est féminin : « une ».`, true);
    if (t.lower === "une" && masc) add(t, "un", `« ${next2.text} » est masculin : « un ».`, true);
  }
  // "toutes leurs pétales" -> tous
  if (t.lower === "toutes" && /^(les|leurs|mes|tes|ses|nos|vos|ces)$/.test(R1) && next2 && nounOnly(next2) && morph(next2).every((m) => /:m/.test(m)) && !morph(next2).some((m) => /:[fe]/.test(m))) {
    add(t, "tous", `« ${next2.text} » est masculin : « tous ».`, true);
  }
  // "chez la boulangerie" -> à la boulangerie (chez + a person, à + a place)
  if (t.lower === "chez" && /^(la|le)$/.test(R1) && (R1 === "la" ? FC_SHOPS_FEM : FC_SHOPS_MASC).test(R2)) {
    add(span(t, next), R1 === "la" ? "à la" : "au", "« Chez » s’emploie avec une personne ; pour un lieu : « à la boulangerie ».", true);
  }
}
