// Sentence-level rules Grammalecte does not apply on its own: a capital
// letter on the first word of a paragraph, and punctuation at its end.
// (Grammalecte only checks the first capital once the sentence ends with a
// period, and its final-punctuation rule almost never fires.)

/* exported fcSentenceRules, FC_RULE_CAPITAL, FC_RULE_FINAL_PUNCT */

const FC_RULE_CAPITAL = "FC_CAPITAL_START";
const FC_RULE_FINAL_PUNCT = "FC_FINAL_PUNCT";
const FC_MIN_WORDS_FOR_PUNCT = 3;

const FC_FIRST_WORD = /^\s*(\p{Ll}[\p{L}\p{M}'’-]*)/u;
const FC_LAST_WORD = /([\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*)\s*$/u;
const FC_QUESTION_START =
  /^\s*(pourquoi|comment|quand|où|qui|quoi|que|qu['’]|quel|quelle|quels|quelles|combien|lequel|laquelle|lesquels|lesquelles|est-ce)\b/iu;
const FC_ET_TOI = /^\s*et (toi|vous|lui|elle|eux|elles)\b/iu;
const FC_INVERSION = /-(t-)?(je|tu|il|elle|on|nous|vous|ils|elles)\b/iu;

// Looks at the last sentence only: "Je vais bien ! Et toi" is a question.
function fcIsQuestion(paragraph) {
  const sentence = paragraph.split(/[.!?…]/).pop();
  return FC_QUESTION_START.test(sentence) || FC_ET_TOI.test(sentence) || FC_INVERSION.test(sentence);
}

// `existing` are the matches already found in the paragraph: we never stack
// a sentence rule on top of another error.
function fcSentenceRules(paragraph, existing) {
  const out = [];
  const free = (start, end) => !existing.some((m) => m.offset < end && start < m.offset + m.length);

  const first = FC_FIRST_WORD.exec(paragraph);
  if (first) {
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
        message: "Majuscule en début de phrase.",
        replacements: [word[0].toUpperCase() + word.slice(1)],
        ruleId: FC_RULE_CAPITAL,
        category: "typo",
        label: "Majuscule",
      });
    }
  }

  const words = paragraph.match(/[\p{L}\p{N}]+/gu) ?? [];
  const last = FC_LAST_WORD.exec(paragraph);
  if (last && words.length >= FC_MIN_WORDS_FOR_PUNCT) {
    const word = last[1];
    const start = last.index;
    if (free(start, start + word.length)) {
      const marks = fcIsQuestion(paragraph) ? [" ?", ".", " !"] : [".", " !", " ?"];
      out.push({
        offset: start,
        length: word.length,
        word,
        message: "Il manque la ponctuation à la fin de la phrase.",
        replacements: marks.map((p) => word + p),
        ruleId: FC_RULE_FINAL_PUNCT,
        category: "typo",
        label: "Ponctuation",
      });
    }
  }
  return out;
}
