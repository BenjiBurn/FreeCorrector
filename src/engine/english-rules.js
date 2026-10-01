// FreeCorrector's own English rules, for frequent mistakes Harper misses.
// Conservative on purpose: a missed error is better than a false alarm.

// Contractions typed without their apostrophe. "cant" and "wont" exist as
// words but are rare enough; "ill", "id", "were", "well", "shell" are not
// listed: they are common words.
const CONTRACTIONS = new Map(Object.entries({
  dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", arent: "aren't",
  wasnt: "wasn't", werent: "weren't", havent: "haven't", hasnt: "hasn't", hadnt: "hadn't",
  couldnt: "couldn't", wouldnt: "wouldn't", shouldnt: "shouldn't", mustnt: "mustn't",
  wont: "won't", cant: "can't", im: "I'm", ive: "I've", youre: "you're", youve: "you've",
  youll: "you'll", theyre: "they're", theyve: "they've", theyll: "they'll", weve: "we've",
  thats: "that's", whats: "what's", theres: "there's", hes: "he's", shes: "she's",
  lets: null, // "lets" is a verb too: left alone
}));

const SUBJECT_FOR = { me: "I", him: "he", her: "she", them: "they", us: "we" };
const TOO_WORDS = /^(much|many|late|early|soon|bad|big|small|hard|far|long|often|fast|slow|expensive|cheap|hot|cold|tired|busy|young|old|good|difficult|easy|high|low|loud|quiet|close)$/;

function tokens(text) {
  const out = [];
  const re = /[\p{L}\p{N}]+(?:['’][\p{L}]+)?|[^\s\p{L}\p{N}]/gu;
  let m;
  while ((m = re.exec(text))) {
    out.push({ text: m[0], lower: m[0].toLowerCase().replace(/’/g, "'"), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

const isPunct = (t) => !!t && /^[.,;:!?)]$/.test(t.text);

export function englishRules(paragraph, existing) {
  const toks = tokens(paragraph);
  const out = [];
  const overlaps = (a, b, list) => list.some((m) => m.offset < b && a < m.offset + m.length);
  const add = (start, end, replacement, message) => {
    if (overlaps(start, end, existing) || overlaps(start, end, out)) return;
    const word = paragraph.slice(start, end);
    const fixed = /^\p{Lu}/u.test(word) && replacement !== "I" ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
    out.push({
      offset: start,
      length: end - start,
      word,
      message,
      replacements: [fixed],
      ruleId: `FC_EN_${replacement.toUpperCase().replace(/[^A-Z]/g, "_")}`,
      category: "grammar",
      label: "Grammaire",
    });
  };

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prev = toks[i - 1];
    const next = toks[i + 1];
    const next2 = toks[i + 2];
    const clauseStart = !prev || isPunct(prev) || /^(and|but|so|because|if|when|then)$/.test(prev.lower);

    // "dont", "isnt", "im" -> "don't", "isn't", "I'm"
    const contraction = CONTRACTIONS.get(t.lower);
    if (contraction) add(t.start, t.end, contraction, "Apostrophe missing in this contraction.");

    // "Your welcome", "your right" -> "you're"
    if (t.lower === "your" && next && /^(welcome|right|wrong|going|not|so|very|too|always|never|being|doing|getting|making|coming|the|a|an|kidding|joking|amazing|awesome|beautiful|crazy|lucky|sure|done|late|early)$/.test(next.lower) &&
        !(next.lower === "right" && next2 && /^(hand|side|arm|leg|eye|ear|foot|now)$/.test(next2.lower))) {
      add(t.start, t.end, "you're", "Did you mean “you're” (you are)?");
    }

    // "will loose", "to loose" -> "lose"
    if (t.lower === "loose" && prev && /^(will|to|not|don't|can|could|would|might|may|should|never|gonna|cannot|won't|didn't|must)$/.test(prev.lower)) {
      add(t.start, t.end, "lose", "Did you mean the verb “lose” (to misplace, to be defeated)?");
    }

    // "to many people", "I'm coming to." -> "too"
    if (t.lower === "to" && prev) {
      const atEnd = !next || isPunct(next);
      const beforeAdverb = next && TOO_WORDS.test(next.lower) && (!next2 || isPunct(next2) || /^(people|things|times|of|to|for|and|now)$/.test(next2.lower));
      if ((atEnd && /^(me|you|him|her|us|them|it|this|that|one|i|we|they|he|she)$/.test(prev.lower)) || beforeAdverb) {
        add(t.start, t.end, "too", "Did you mean “too” (also, excessively)?");
      }
    }

    // "This are" -> "These are" ; "These is" -> "This is"
    if (clauseStart && t.lower === "this" && next && /^(are|were)$/.test(next.lower)) {
      add(t.start, t.end, "these", "“This” is singular: use “these” with “are”.");
    }
    if (clauseStart && t.lower === "these" && next && /^(is|was)$/.test(next.lower)) {
      add(t.start, t.end, "this", "“These” is plural: use “this” with “is”.");
    }

    // "Me and him went" -> "He and I went"
    if (clauseStart && t.lower === "me" && next?.lower === "and" && next2 && SUBJECT_FOR[next2.lower] && toks[i + 3] && !isPunct(toks[i + 3])) {
      const other = SUBJECT_FOR[next2.lower];
      add(t.start, next2.end, `${other} and I`, "Use subject pronouns before a verb: “he and I”, “she and I”.");
    }

    // "I seen", "they done" -> "saw", "did"
    if (prev && /^(i|you|we|they|he|she)$/.test(prev.lower) && (t.lower === "seen" || t.lower === "done")) {
      add(t.start, t.end, t.lower === "seen" ? "saw" : "did", `“${t.lower}” needs an auxiliary (“have ${t.lower}”); the simple past is “${t.lower === "seen" ? "saw" : "did"}”.`);
    }
  }
  return out;
}

// The apostrophe form of a contraction typed without it, or null.
export function contractionFor(word) {
  return CONTRACTIONS.get(word.toLowerCase()) ?? null;
}
