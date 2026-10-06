// Sentence-level rules the engines do not apply on their own: a capital
// letter on the first word of a paragraph, and punctuation at its end.
// (Grammalecte only checks the first capital once the sentence ends with a
// period, and its final-punctuation rule almost never fires.)
//
// Both rules skip what is not a plain sentence: list items, titles,
// references, signatures. Used by the French worker (classic script) and the
// English worker (ES module, through self.fcSentenceRules).

/* exported fcSentenceRules, FC_RULE_CAPITAL, FC_RULE_FINAL_PUNCT */

const FC_RULE_CAPITAL = "FC_CAPITAL_START";
const FC_RULE_FINAL_PUNCT = "FC_FINAL_PUNCT";
const FC_MIN_WORDS_FOR_PUNCT = 3;

const FC_FIRST_WORD = /^\s*(\p{Ll}[\p{L}\p{M}'’-]*)/u;
const FC_LAST_WORD = /(\p{L}[\p{L}\p{M}\p{N}'’-]*)\s*$/u;
const FC_LIST_MARKER = /^\s*([-*•–—>]|\d+[.)]|[a-z][.)])\s/u;
const FC_FINITE_VERB = /:(Ip|Iq|Is|If|K|Sp|Sq|E)/;
const FC_CHAT_START = /^\s*(lol|mdr|ptdr|omg|lmao|haha+|hihi|wow|yeah|yep|nope|ouais|bah|bof|ah|oh|oups|oops|ok|okay|ok\b|btw|jpp|tkt|wsh)(?![\p{L}])/u;

const FC_SENTENCE_LANG = {
  fr: {
    question: [
      /^\s*(pourquoi|comment|quand|où|qui|quoi|que|qu['’]|quel|quelle|quels|quelles|combien|lequel|laquelle|lesquels|lesquelles|est-ce)(?![\p{L}])/iu,
      /^\s*et (toi|vous|lui|elle|eux|elles)(?![\p{L}])/iu,
      /-(t-)?(je|tu|il|elle|on|nous|vous|ils|elles)(?![\p{L}])/iu,
    ],
    subject: /(^|[\s’'])(je|j['’]|tu|il|elle|on|nous|vous|ils|elles|c['’]est|ça|cela)(?![\p{L}])/iu,
  },
  en: {
    question: [
      /^\s*(what|why|how|when|where|who|whom|whose|which|do|does|did|is|are|was|were|am|can|could|would|will|shall|should|may|might|have|has|had|isn't|aren't|don't|doesn't|didn't|won't|can't|couldn't|wouldn't|shouldn't)(?![\p{L}'’])/iu,
      /^\s*(and|what about|how about) (you|him|her|them|us)(?![\p{L}])/iu,
    ],
    subject: /(^|\s)(i|i'm|i’m|you|he|she|it|it's|it’s|we|they|there|this|that|let's|let’s)(?![\p{L}])/iu,
  },
};

// Looks at the last sentence only: "Je vais bien ! Et toi" is a question.
function fcIsQuestion(paragraph, lang) {
  const sentence = paragraph.split(/[.!?…]/).pop();
  return FC_SENTENCE_LANG[lang].question.some((re) => re.test(sentence));
}

// A real sentence has a subject pronoun or a conjugated verb; titles,
// references and list items usually have neither.
function fcLooksLikeSentence(paragraph, spellChecker, lang) {
  if (FC_SENTENCE_LANG[lang].subject.test(paragraph)) return true;
  if (!spellChecker) return (paragraph.match(/\p{L}+/gu) ?? []).length >= 5;
  for (const word of paragraph.match(/\p{L}+/gu) ?? []) {
    if (word[0] !== word[0].toLowerCase()) continue; // names are not verbs
    try {
      if (spellChecker.getMorph(word).some((m) => FC_FINITE_VERB.test(m))) return true;
    } catch {
      // Not in the dictionary.
    }
  }
  return false;
}

// `existing` are the matches already found in the paragraph: we never stack
// a sentence rule on top of another error. `prevEnd` is the last visible
// character of the previous paragraph ("" at the start of the text).
// `spellChecker` (French only) helps tell sentences from titles. `nextStart` is
// the first visible character of the next paragraph.
function fcSentenceRules(paragraph, existing, spellChecker, prevEnd, lang = "fr", nextStart = "") {
  const out = [];
  const free = (start, end) => !existing.some((m) => m.offset < end && start < m.offset + m.length);
  // Chat style ("lol that's hilarious", "mdr t'es sérieux") is written that
  // way on purpose: no capital, no final period to ask for.
  if (FC_CHAT_START.test(paragraph)) return out;
  const listItem =
    FC_LIST_MARKER.test(paragraph) || /[:;,]/.test(prevEnd) || /[;,:]\s*$/.test(paragraph);
  // A sentence running over several lines (poems, wrapped text): the previous
  // line ends on a word, or the next one starts in lowercase.
  const continues = /[\p{L}\p{N}]/u.test(prevEnd);
  const continued = /\p{Ll}/u.test(nextStart);
  // A signature after a closing ("Bien à vous, Claire Martin") ends without a period.
  // "Bien à vous, Claire Martin", "À bientôt, Ahmed et Leïla", "… ! Bisous",
  // and posts ending with #hashtags or @mentions.
  const signature = /,\s*(\p{Lu}[\p{L}.'’-]*)(\s+(et|and|&)?\s*\p{Lu}[\p{L}.'’-]*){0,3}\s*$/u.test(paragraph) ||
    /[.!?…]\s*(bisous|bises|biz|gros bisous|cordialement|amicalement|merci|bonne journée|bonne soirée|cheers|thanks|best|love|xoxo|xx|regards)\s*$/iu.test(paragraph) ||
    /(^|\s)[#@][\p{L}\p{N}_.-]+\s*$/u.test(paragraph);

  const first = FC_FIRST_WORD.exec(paragraph);
  if (first && !listItem && !continues) {
    const word = first[1];
    const start = first.index + first[0].length - word.length;
    // Leave alone things like "iPhone", "eBay" or "x2".
    const plainWord = word.slice(1) === word.slice(1).toLowerCase();
    const onFirstWord = existing.find((m) => m.offset === start);
    if (onFirstWord) {
      // Another error on the first word ("jee suis") : capitalize its fixes.
      onFirstWord.replacements = onFirstWord.replacements.map(
        (r) => (r ? r[0].toUpperCase() + r.slice(1) : r)
      );
    } else if (plainWord && free(start, start + word.length)) {
      out.push({
        offset: start,
        length: word.length,
        word,
        message: lang === "en" ? "Capital letter at the start of a sentence." : "Majuscule en début de phrase.",
        replacements: [word[0].toUpperCase() + word.slice(1)],
        ruleId: FC_RULE_CAPITAL,
        category: "typo",
        label: "Majuscule",
        labelKey: "catCapital",
      });
    }
  }

  const words = paragraph.match(/[\p{L}\p{N}]+/gu) ?? [];
  const last = FC_LAST_WORD.exec(paragraph);
  if (last && !listItem && !signature && !continued && words.length >= FC_MIN_WORDS_FOR_PUNCT &&
      fcLooksLikeSentence(paragraph, spellChecker, lang)) {
    const word = last[1];
    const start = last.index;
    if (free(start, start + word.length)) {
      // French puts a space before "?" and "!", English does not.
      const sp = lang === "fr" ? " " : "";
      const marks = fcIsQuestion(paragraph, lang) ? [`${sp}?`, ".", `${sp}!`] : [".", `${sp}!`, `${sp}?`];
      out.push({
        offset: start,
        length: word.length,
        word,
        message: lang === "en" ? "The sentence ends without punctuation." : "Il manque la ponctuation à la fin de la phrase.",
        replacements: marks.map((p) => word + p),
        ruleId: FC_RULE_FINAL_PUNCT,
        category: "typo",
        label: "Ponctuation",
        labelKey: "catPunctuation",
      });
    }
  }
  return out;
}

// The first visible character of the next non-empty paragraph, or "".
function fcNextStart(paragraphs, index) {
  for (let k = index + 1; k < paragraphs.length; k++) {
    const start = paragraphs[k].trimStart();
    if (start) return start[0];
  }
  return "";
}

// Module workers have no shared global scope: expose the entry points.
self.fcSentenceRules = fcSentenceRules;
self.fcNextStart = fcNextStart;
