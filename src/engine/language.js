// Guesses the language (French or English) of each paragraph, from function
// words and accented letters. Plain JavaScript: it runs in the Firefox
// background page and in the Chromium offscreen document alike.

/* global fcApi */
/* exported fcParagraphLanguages, fcSplitQuotes, fcSetLanguageLexicon, fcLexiconReady, FC_LANGUAGES */

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
     "us am i i'm don't it's can't won't isn't doesn't didn't that's what's there's let's i've i'll " +
     "i'd you're we're they're you've you'll he's she's wasn't aren't haven't hasn't couldn't " +
     "wouldn't shouldn't " +
     // "me", "an", "as", "on", "son", "plus" are French words too: not listed.
     "in for to best new good great near how cheap buy free online get make know think want need " +
     "see go going like love work help today tomorrow yesterday now here well more most one two " +
     "first last other many much after before never always still even back if so no your " +
     "way time day people should something nothing everything thing things why").split(" ")
  ),
};

const FC_FRENCH_LETTERS = /[éèêëàâîïôûùçœ]/giu;
const FC_ELISION = /(^|[\s(«"])(j|l|d|n|s|c|m|t|qu)['’][\p{L}]/giu;

// Other words that are at least ten times more frequent in one language than
// in the other (data/*-freq.txt): "display", "incoherent", "list" lean to
// English, "réunion", "merci" to French; "table", "cool", "important" lean to
// neither. They decide a text without function words ("Bodies list
// incoherent display"), at half the weight of a function word, so that an
// e-mail in French full of "meeting" and "deadline" stays French.
// Word -> "fr" | "en". Empty until the lists are loaded (fcLexiconReady).
const FC_LEXICON = new Map();
const FC_LEXICON_WEIGHT = 0.5;
const FC_LEXICON_RATIO = 10;

// Fills FC_LEXICON from the two frequency lists ("word count" per line).
function fcSetLanguageLexicon(frList, enList) {
  const parse = (list) => {
    const counts = new Map();
    let total = 0;
    for (const line of list.split("\n")) {
      const space = line.lastIndexOf(" ");
      const count = Number(line.slice(space + 1));
      if (space > 0 && count > 0) {
        counts.set(line.slice(0, space), count);
        total += count;
      }
    }
    return { counts, total };
  };
  const fr = parse(frList);
  const en = parse(enList);
  FC_LEXICON.clear();
  for (const [lang, own, other] of [["fr", fr, en], ["en", en, fr]]) {
    for (const [word, count] of own.counts) {
      if (word.length < 3 || /\d/.test(word) || FC_LANG_WORDS.fr.has(word) || FC_LANG_WORDS.en.has(word)) continue;
      // A word missing from the other list counts once there.
      const share = count / own.total;
      const otherShare = (other.counts.get(word) ?? 1) / other.total;
      if (share >= FC_LEXICON_RATIO * otherShare) FC_LEXICON.set(word, lang);
    }
  }
}

// Loads the lists of the extension (or of the web page) once; without them
// (tests, a failed load) only function words and accents decide.
const fcLexiconReady = (async () => {
  try {
    // fcApi (lib/settings.js) is a global "const", not a property of globalThis.
    const api = typeof fcApi === "undefined" ? null : fcApi;
    if (!api?.runtime?.getURL) return;
    const read = (lang) => fetch(api.runtime.getURL(`data/${lang}-freq.txt`)).then((r) => (r.ok ? r.text() : Promise.reject(r.status)));
    const [fr, en] = await Promise.all([read("fr"), read("en")]);
    fcSetLanguageLexicon(fr, en);
  } catch {
    // Function words only.
  }
})();

function fcLanguageScores(paragraph) {
  const scores = { fr: 0, en: 0 };
  for (const word of paragraph.toLowerCase().match(/[\p{L}'’]+/gu) ?? []) {
    const w = word.replace(/’/g, "'");
    const fr = FC_LANG_WORDS.fr.has(w);
    const en = FC_LANG_WORDS.en.has(w);
    if (fr) scores.fr += 1;
    if (en) scores.en += 1;
    const lean = fr || en ? null : FC_LEXICON.get(w);
    if (lean) scores[lean] += FC_LEXICON_WEIGHT;
  }
  scores.fr += 0.5 * (paragraph.match(FC_FRENCH_LETTERS)?.length ?? 0);
  scores.fr += 1 * (paragraph.match(FC_ELISION)?.length ?? 0);
  return scores;
}

// The clear language of a piece of text, or null when it is too short or mixed.
function fcDecidedLanguage(text) {
  const s = fcLanguageScores(text);
  if (s.en >= 2 && s.en > 1.5 * s.fr) return "en";
  if (s.fr >= 2 && s.fr > 1.5 * s.en) return "fr";
  return null;
}

const FC_QUOTE = /“([^”]{8,})”|«([^»]{8,})»|"([^"\n]{8,})"/gu;

// A quotation in another language inside a paragraph: « Nos partenaires
// nous ont écrit : "We are very excited to start." » Returns the paragraph's
// own language and the quotes (quote marks included) written in the other
// one, as [start, end, lang]; no quotes when there is nothing to split.
// Also whole sentences: "Le train est en retard. Nice to meet you." Spans are
// [start, end, lang, marks]: `marks` when the span starts and ends with quote
// marks (they belong to neither language).
function fcSplitQuotes(paragraph, paragraphLang) {
  const spans = [];
  for (const m of paragraph.matchAll(FC_QUOTE)) {
    const lang = fcDecidedLanguage(m[1] ?? m[2] ?? m[3]);
    if (lang) spans.push([m.index, m.index + m[0].length, lang, true]);
  }
  const inSpan = (a, b) => spans.some(([x, y]) => a < y && x < b);
  // Sentences of at least four words, outside quotes.
  for (const m of paragraph.matchAll(/[^.!?…]+[.!?…]*/g)) {
    const start = m.index + (m[0].length - m[0].trimStart().length);
    const end = m.index + m[0].trimEnd().length;
    if (end - start < 12 || inSpan(start, end) || (m[0].match(/\p{L}+/gu) ?? []).length < 4) continue;
    const lang = fcDecidedLanguage(m[0]);
    if (lang) spans.push([start, end, lang, false]);
  }
  if (!spans.length) return { lang: paragraphLang, quotes: [] };
  let rest = paragraph;
  for (const [a, b] of spans) rest = rest.slice(0, a) + " ".repeat(b - a) + rest.slice(b);
  const own = fcDecidedLanguage(rest) ?? (rest.trim() ? paragraphLang : spans[0][2]);
  return { lang: own, quotes: spans.filter(([, , lang]) => lang !== own).sort((x, y) => x[0] - y[0]) };
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
