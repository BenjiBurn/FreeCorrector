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

function fcCustomRules(paragraph, spellChecker, existing) {
  const tokens = fcTokens(paragraph);
  const out = [];
  const free = (t) => !existing.some((m) => m.offset < t.end && t.start < m.offset + m.length) &&
    !out.some((m) => m.offset < t.end && t.start < m.offset + m.length);
  const morph = (t) => (t ? fcMorph(spellChecker, t.text) : []);
  // `override`: this rule knows better than Grammalecte's overlapping report,
  // which checkParagraph then drops ("je c’est" is "sais", not "s’est").
  const add = (t, replacement, message, override = false) => {
    if (override ? out.some((m) => m.offset < t.end && t.start < m.offset + m.length) : !free(t)) return;
    const fixed = t.text[0] === t.text[0].toUpperCase() && t.text[0] !== t.text[0].toLowerCase()
      ? replacement[0].toUpperCase() + replacement.slice(1)
      : replacement;
    out.push({
      override,
      offset: t.start,
      length: t.end - t.start,
      word: t.text,
      message,
      replacements: [fixed],
      ruleId: `FC_${replacement.toUpperCase().replace(/[^A-Z]/g, "_")}`,
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
      if (prevLower !== "je" && prevLower !== "tu" && fcHas(morph(next), /:Q/) && !fcHas(morph(next), /:(N|Y)/)) {
        add(t, "s’est", "Verbe pronominal au passé composé : « s’est » + participe passé.");
      }
    }

    // "sa va", "si tu veux, sa marche." -> ça
    if (t.lower === "sa" && next) {
      const clauseStart = FC_CLAUSE_START.has(prevLower);
      const clauseEnd = !next2 || /^[,.;:!?]$/.test(next2.text);
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
    if (prev && FC_SUBJECTS.has(prevLower) && prevLower !== "qui" && /^(que|qu’)$/.test(prev2?.lower ?? "")) {
      const trigger = tokens[i - 3]?.lower ?? "";
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
    if (t.lower === "quel" && /^(pense|penses|pensait|crois|croit|sais|sait|dit|dis|espère|trouve|sens|vois|savais|disait|croyais|pensais|ai|as|a)$/.test(prevLower) &&
        next && /^(est|était|sera|serait|a|avait|aura|va|allait|vient|veut|peut|doit)$/.test(next.lower) &&
        next2 && (fcHas(morph(next2), /:Q/) || !fcHas(morph(next2), /:(N|D)/)) && /^\p{Ll}/u.test(next2.text)) {
      add(t, "qu’elle", "Confusion probable : « qu’elle » (que + elle) plutôt que « quel ».");
    }

    // "Jaime ce film" -> J’aime (at the start, followed by a determiner)
    if (t.lower === "jaime" && (!prev || FC_CLAUSE_START.has(prevLower)) && next &&
        /^(le|la|les|l’|ce|cet|cette|ces|mon|ma|mes|ton|ta|tes|son|sa|ses|bien|beaucoup|trop|pas|vraiment|tellement|ça|te|vous|un|une|quand|que|qu’)$/.test(next.lower)) {
      add(t, "j’aime", "Apostrophe oubliée : « j’aime ».");
    }
  }
  return out;
}
