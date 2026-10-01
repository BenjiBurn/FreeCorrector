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
const LETS_VERBS = /^(go|do|see|try|start|make|get|talk|meet|eat|have|take|be|move|play|watch|find|keep|call|check|discuss|hope|work|think|look|wait|plan|celebrate|grab|head|catch|leave|stay|begin|focus|keep)$/;
const IRREGULAR_PLURALS = /^(children|people|men|women|feet|teeth|mice|geese|police)$/;
const YOUR_NOUNS = /^(help|time|message|email|e-mail|support|patience|answer|reply|feedback|response|understanding|attention|kindness|advice|work|effort|efforts|order|question|questions|interest|call|letter|gift|hospitality|cooperation|consideration|trust|comments|input|invitation|offer|application)$/;
// Nouns typed where the verb was meant, after "to" or a modal.
const VERB_FOR_NOUN = { discus: "discuss", breath: "breathe", advice: "advise", loose: "lose", belief: "believe", proof: "prove", choise: "choose", chose: "choose" };
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

    // "Lets go" -> "Let's go" (only before a verb, at the start of a clause)
    if (clauseStart && t.lower === "lets" && next && LETS_VERBS.test(next.lower)) {
      add(t.start, t.end, "let's", "Did you mean “let's” (let us)?");
    }

    // "the children is" -> "are" (irregular plurals)
    if (IRREGULAR_PLURALS.test(t.lower) && next && /^(is|was|has)$/.test(next.lower) &&
        !(prev && /^(a|an|one|this|that)$/.test(prev.lower))) {
      const fix = { is: "are", was: "were", has: "have" }[next.lower];
      add(next.start, next.end, fix, `“${t.lower}” is plural: use “${fix}”.`);
    }

    // "thanks for you help" -> "your"
    if (t.lower === "you" && prev && /^(for|of|with|in|on|about|to)$/.test(prev.lower) && next && YOUR_NOUNS.test(next.lower)) {
      add(t.start, t.end, "your", "Did you mean the possessive “your”?");
    }

    // "really exited about" -> "excited"
    if (t.lower === "exited" && next && /^(about|for|to|that)$/.test(next.lower)) {
      add(t.start, t.end, "excited", "Did you mean “excited” (eager)? “Exited” means “went out”.");
    }

    // "need to discus", "to breath" -> the verb
    if (prev && /^(to|will|can|could|would|should|must|might|may|please|let's|lets)$/.test(prev.lower) && VERB_FOR_NOUN[t.lower]) {
      add(t.start, t.end, VERB_FOR_NOUN[t.lower], `After “${prev.lower}”, use the verb “${VERB_FOR_NOUN[t.lower]}”.`);
    }

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
// `prevWord` picks the right agreement: "she dont" -> "doesn't".
export function contractionFor(word, prevWord = "") {
  const lower = word.toLowerCase();
  if (lower === "dont" && /^(he|she|it|this|that|everyone|nobody|somebody|someone)$/i.test(prevWord)) return "doesn't";
  return CONTRACTIONS.get(lower) ?? null;
}
