// Guesses the language (French or English) of each paragraph, from function
// words and accented letters. Plain JavaScript: it runs in the Firefox
// background page and in the Chromium offscreen document alike.

/* exported fcParagraphLanguages, FC_LANGUAGES */

const FC_LANGUAGES = ["fr", "en"];

// Frequent words that exist in only one of the two languages.
const FC_LANG_WORDS = {
  fr: new Set(
    ("le la les un une de des du et est je tu il elle nous vous ils elles ne pas que qui dans pour " +
     "sur avec ce cette ces mais où au aux son sa ses mon ma mes ton ta tes leur leurs été être " +
     "avoir fait très plus bien aussi comme tout tous toute toutes alors donc car déjà encore " +
     "jamais toujours rien peu beaucoup merci bonjour oui non suis sont était avais avait peut " +
     "faut moi toi lui eux notre votre nos vos quand quoi pourquoi comment ça cela voici voilà " +
     "c'est j'ai n'est qu'il qu'elle d'un d'une l'on salut cordialement bisous " +
     "à en chez sans sous entre vers depuis puis après avant hier demain aujourd'hui meilleur " +
     "meilleure pourrais voudrais veux vais va avez avons ont fais faire dire voir").split(" ")
  ),
  en: new Set(
    ("the and is are was were you he she it we they not that which who with this these those " +
     "but or of at by from be been have has had do does did will would can could should my your " +
     "his her their our its there what when where why how about just some any all very also " +
     "than then because into out up down over again only yes thanks hello please him them " +
     "us am i i'm don't it's can't won't isn't doesn't didn't " +
     // "me", "an", "as", "on", "son", "plus" are French words too: not listed.
     "in for to best new good great near how cheap buy free online get make know think want need " +
     "see go going like love work help today tomorrow yesterday now here well more most one two " +
     "first last other many much after before never always still even back if so no your " +
     "way time day people should something nothing everything thing things why").split(" ")
  ),
};

const FC_FRENCH_LETTERS = /[éèêëàâîïôûùçœ]/giu;
const FC_ELISION = /(^|[\s(«"])(j|l|d|n|s|c|m|t|qu)['’][\p{L}]/giu;

function fcLanguageScores(paragraph) {
  const scores = { fr: 0, en: 0 };
  for (const word of paragraph.toLowerCase().match(/[\p{L}'’]+/gu) ?? []) {
    const w = word.replace(/’/g, "'");
    if (FC_LANG_WORDS.fr.has(w)) scores.fr += 1;
    if (FC_LANG_WORDS.en.has(w)) scores.en += 1;
  }
  scores.fr += 0.5 * (paragraph.match(FC_FRENCH_LETTERS)?.length ?? 0);
  scores.fr += 1 * (paragraph.match(FC_ELISION)?.length ?? 0);
  return scores;
}

// One language per paragraph ("fr" or "en"). Paragraphs too short to tell
// take the language of their neighbours, or of the whole text.
function fcParagraphLanguages(paragraphs, fallback = "fr") {
  const scored = paragraphs.map(fcLanguageScores);
  const total = scored.reduce((t, s) => ({ fr: t.fr + s.fr, en: t.en + s.en }), { fr: 0, en: 0 });
  const overall = total.en > total.fr ? "en" : total.fr > 0 ? "fr" : fallback;
  const langs = scored.map((s) => {
    if (s.fr + s.en < 1) return null;
    if (s.en > 1.5 * s.fr) return "en";
    if (s.fr > 1.5 * s.en) return "fr";
    return null;
  });
  // Fill the undecided ones from the closest decided paragraph before them,
  // then after them, then the overall language.
  let last = null;
  for (let i = 0; i < langs.length; i++) {
    if (langs[i]) last = langs[i];
    else if (last) langs[i] = last;
  }
  let next = null;
  for (let i = langs.length - 1; i >= 0; i--) {
    if (scored[i].fr + scored[i].en >= 1 && langs[i]) next = langs[i];
    if (!langs[i]) langs[i] = next ?? overall;
  }
  return langs;
}
