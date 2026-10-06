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
function fcLooksLikeProperNoun(paragraph, start, word) {
  if (/\d/.test(word)) return true;
  if (word.length > 1 && word === word.toUpperCase()) return true;
  if (word[0] === word[0].toLowerCase()) return false;
  const before = paragraph.slice(0, start).trimEnd();
  const sentenceStart = before === "" || /[.!?…:«"“(\n]$/.test(before);
  return !sentenceStart;
}

const FC_SUBJECTS = new Set(["je", "j’", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles", "ça", "cela", "qui"]);
const FC_CLAUSE_START = new Set(["", ".", ",", ";", ":", "!", "?", "et", "mais", "si", "quand", "que", "qu’", "comme", "car", "donc", "alors", "puis", "lorsque", "parce"]);
const FC_KNOW_VERBS = /^(sai[st]|savez|savons|savent|savoir|su|demande[sz]?|demandent|demander|dis|dit|dites|disent|dire|comprends?|comprenez|comprendre|ignore[sz]?|voi[st]|voyez|voir|regarde[sz]?|montre[sz]?|explique[sz]?|cherche[sz]?|devine[sz]?|oublié|rappelle[sz]?|imagine[sz]?)$/;
const FC_TIME_PLACE_NOUNS = /^(jour|moment|endroit|ville|pays|année|époque|instant|soir|matin|nuit|semaine|mois|heure|lieu|pièce|maison|rue|quartier|période|temps|là)$/;
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
  tinquietes: "t’inquiète",
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
    if ((t.lower === "vous" || t.lower === "nous") && FC_CLAUSE_START.has(prevLower) && next && /er$/.test(next.lower)) {
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
    if (t.text === "sur" && (!next || /^[,.;:!?]$/.test(next.text) || (next.lower === "que" && /^(c’est|suis|es|est|sommes|êtes|sont|pas)$/.test(prevLower)))) {
      add(t, "sûr", "« Sûr » (certain) prend un accent circonflexe.");
    }

    // "Plusieurs personne" -> personnes
    if (/^(plusieurs|quelques|divers|diverses|différents|différentes|maints|maintes|nombreux|nombreuses)$/.test(prevLower) &&
        fcHas(morph(t), /:N:.:s/) && !fcHas(morph(t), /:N:.:[pi]/) && !fcHas(morph(t), /:V/)) {
      const plural = String(suggPlur(t.lower) || "").split("|").filter(Boolean)[0];
      if (plural) add(t, plural, `Après « ${prevLower} », le nom se met au pluriel.`);
    }

    // "Ma sœur et moi sommes allé" -> allés (not "êtes": polite "vous" is singular)
    if (/^(sommes|sont)$/.test(prevLower) && fcHas(morph(t), /:Q:.:s/) && !fcHas(morph(t), /:Q:.:[pi]/)) {
      const fem = fcHas(morph(t), /:Q:f:s/) && !fcHas(morph(t), /:Q:m:s/);
      const plural = String(suggVerbPpas(t.lower, fem ? ":f:p" : ":m:p") || "").split("|").filter(Boolean)[0];
      if (plural && plural !== t.lower) add(t, plural, "Le participe passé s’accorde avec le sujet pluriel.");
    }

    // "Si j’aurai le temps" -> si j’ai (after "si", no future)
    if (prev && FC_SUBJECTS.has(prevLower) && /^(si|s’)$/.test(prev2?.lower ?? "")) {
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
      const word = /^(dommage|normal|vrai|faux|possible|impossible|génial|nul|bon|bien|grave|incroyable|parti|fini|clair|sûr|ok|cool|top|parfait|pareil|mieux|pire|ça|moi|toi|lui|elle|nous|vous|eux|elles)$/.test(next.lower);
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
    const sms = FC_SMS_WORDS[t.lower];
    // A capitalized one inside a sentence is a name ("Michael Chui").
    const sentenceStart = !prev || /^[.!?…]$/.test(prev.text);
    if (sms && (sentenceStart || /^\p{Ll}/u.test(t.text)) &&
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
    if (t.lower === "plutôt" && next?.lower === "que" && next2 && /^(prévu|prévue|prévus|prévues|d’habitude|habituellement|d’ordinaire|hier|la|ce|cette|moi|toi|lui|nous|vous|eux)$/.test(next2.lower) &&
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
  }
  return out;
}
