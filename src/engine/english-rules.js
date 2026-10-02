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
// Real words that are usually a misspelled -ing form after "be".
const ING_TYPOS = { planing: "planning", stoping: "stopping", shoping: "shopping", geting: "getting", runing: "running", siting: "sitting", writting: "writing", comming: "coming" };
// Always capitalized; "may", "march", "august", "polish", "turkey" are left out.
const PROPER_WORDS = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "mondays", "tuesdays", "wednesdays", "thursdays", "fridays", "saturdays", "sundays",
  "january", "february", "april", "june", "july", "september", "october", "november", "december",
  "english", "french", "spanish", "german", "italian", "portuguese", "chinese", "japanese", "korean", "russian", "arabic", "dutch",
  "american", "british", "european", "african", "asian", "canadian", "australian", "mexican", "indian", "brazilian", "irish", "scottish",
  "christmas", "easter", "halloween", "thanksgiving",
]);
const UNCOUNTABLE = { informations: "information", advices: "advice", furnitures: "furniture", equipments: "equipment", knowledges: "knowledge", homeworks: "homework", luggages: "luggage", baggages: "baggage", feedbacks: "feedback", evidences: "evidence", softwares: "software", staffs: "staff" };
const NOT_PLURAL = /^(always|perhaps|sometimes|towards|afterwards|whereas|thus|yes|series|species|means|news|physics|mathematics|economics|politics|headquarters|lens|gas|bus|plus|chaos|minus|bonus|virus|campus|status|its|this|was|has|is|his|hers|ours|yours|theirs)$/;
const NUMBER_FOLLOWERS = /^(of|more|other|different|hundred|thousand|million|billion|dozen|times|new|good|great|best|big|small|main|major|last|next|first|extra|little|old|young|long|short|such|and|or|to|are|were|have|had|will|can|would|could|should|must|may|might|do|did|people|children|men|women|sheep|fish|deer|data|weeks|days|years|per|each|all|the|a|an|i|we|you|they|he|she|it|us|them)$/;

// Base verbs typed after "have" instead of the participle. Verbs that are
// also frequent nouns ("work", "call", "help", "change") are left out.
const PARTICIPLE_OF = {
  finish: "finished", decide: "decided", receive: "received", complete: "completed", arrive: "arrived",
  forget: "forgotten", eat: "eaten", see: "seen", go: "gone", write: "written", take: "taken", give: "given",
  speak: "spoken", ask: "asked", wait: "waited", try: "tried", buy: "bought", send: "sent",
  meet: "met", choose: "chosen", lose: "lost", forgive: "forgiven", begin: "begun",
  understand: "understood", become: "become", hear: "heard", tell: "told",
};

function ingForm(verb) {
  if (/ie$/.test(verb)) return `${verb.slice(0, -2)}ying`;
  if (/(ee|ye|oe)$/.test(verb)) return `${verb}ing`;
  if (/[^aeiou]e$/.test(verb)) return `${verb.slice(0, -1)}ing`;
  if (verb.length <= 4 && /^[^aeiou]*[aeiou][bdgmnprt]$/.test(verb)) return `${verb}${verb.slice(-1)}ing`;
  return `${verb}ing`;
}

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

// `frequency(word)`: log frequency, 0 for unknown words.
// A match with `override` replaces Harper's overlapping reports.
export function englishRules(paragraph, existing, frequency = () => 0) {
  const toks = tokens(paragraph);
  const out = [];
  const overlaps = (a, b, list) => list.some((m) => m.offset < b && a < m.offset + m.length);
  const add = (start, end, replacement, message, { override = false, category = "grammar", keepCase = false } = {}) => {
    if ((!override && overlaps(start, end, existing)) || overlaps(start, end, out)) return;
    const word = paragraph.slice(start, end);
    const fixed = !keepCase && /^\p{Lu}/u.test(word) && replacement !== "I" ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
    out.push({
      override,
      offset: start,
      length: end - start,
      word,
      message,
      replacements: [fixed],
      ruleId: `FC_EN_${replacement.toUpperCase().replace(/[^A-Z]/g, "_")}`,
      category,
      label: category === "spelling" ? "Orthographe" : "Grammaire",
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
      add(t.start, t.end, "you're", "Did you mean “you're” (you are)?", { override: /^(the|a|an)$/.test(next.lower) });
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
    // "Me and my friend went" -> "My friend and I went"
    const toks3 = toks[i + 3];
    if (clauseStart && t.lower === "me" && next?.lower === "and" && next2 && /^(my|his|her|our|their|the)$/.test(next2.lower) &&
        toks3 && /^\p{Ll}+$/u.test(toks3.text) && toks[i + 4] && /^(went|are|were|have|had|will|would|can|could|did|do|got|came|saw|made|took|left|met|played|decided|love|like)$/.test(toks[i + 4].lower)) {
      add(t.start, toks3.end, `${next2.lower} ${toks3.text} and I`, "Before a verb, put yourself last and use “I”: “my friend and I”.");
    }

    // "She can sings" -> sing (base form after a modal)
    if (prev && /^(can|could|will|would|should|must|might|may|shall|cannot|can't|won't|wouldn't|shouldn't|couldn't|mustn't|don't|doesn't|didn't)$/.test(prev.lower) &&
        /^\p{Ll}+s$/u.test(t.text) && !/(ss|us|is|ous)$/.test(t.lower) && !NOT_PLURAL.test(t.lower) &&
        !/^(always|sometimes|perhaps|towards|as|has|was|does|goes|less|unless|thus|plus|yes|news|this|its|his|hers|ours|yours|theirs|us)$/.test(t.lower)) {
      const bases = /ies$/.test(t.lower) ? [`${t.lower.slice(0, -3)}y`] :
        /(ch|sh|ss|x|o)es$/.test(t.lower) ? [t.lower.slice(0, -2)] : [t.lower.slice(0, -1)];
      const base = bases.find((b) => frequency(b) >= 3.5 && frequency(b) > frequency(t.lower));
      if (base) {
        add(t.start, t.end, base, `After “${prev.lower}”, use the base form of the verb: “${base}”.`);
      }
    }

    // "Where is you going?" -> are
    if (/^(is|was)$/.test(t.lower) && next?.lower === "you" && prev && /^(where|what|how|why|when|who)$/.test(prev.lower)) {
      add(t.start, t.end, t.lower === "is" ? "are" : "were", "With “you”, use “are” / “were”.");
    }

    // "three peoples" -> people
    if (t.lower === "peoples" && prev && /^(two|three|four|five|six|seven|eight|nine|ten|many|few|several|some|these|those|most|more|other|young|old|\d+)$/.test(prev.lower)) {
      add(t.start, t.end, "people", "“People” is already plural.", { override: true });
    }

    // "Every students" -> student
    if (prev && /^(every|each)$/.test(prev.lower) && /^\p{Ll}+s$/u.test(t.text) && !/(ss|us|is)$/.test(t.lower) && !NOT_PLURAL.test(t.lower)) {
      const single = /ies$/.test(t.lower) ? `${t.lower.slice(0, -3)}y` : t.lower.slice(0, -1);
      if (frequency(single) >= 3.5) add(t.start, t.end, single, `After “${prev.lower}”, the noun is singular.`);
    }

    // "I have finish my work" -> finished
    if (prev && /^(have|has|had|'ve|i've|we've|you've|they've)$/.test(prev.lower) && PARTICIPLE_OF[t.lower] &&
        (!toks[i - 2] || /^(i|you|we|they|he|she|it|already|just|never)$/.test(toks[i - 2].lower) || /'ve$/.test(prev.lower))) {
      add(t.start, t.end, PARTICIPLE_OF[t.lower], `After “${prev.lower}”, use the past participle: “${PARTICIPLE_OF[t.lower]}”.`);
    }

    // "I think its going to rain" -> it's (never a possessive before these)
    if (t.lower === "its" && next) {
      const afterAdj = !next2 || isPunct(next2) || /^(to|that|for|when|if|because)$/.test(next2.lower);
      if (/^(going|getting|raining|snowing|been|not|ok|okay|a|an|the|my|your|our|just|already|about|too)$/.test(next.lower) ||
          (afterAdj && /^(fine|important|possible|impossible|nice|great|cold|hot|late|early|true|hard|easy|good|bad|done|ready|free|normal|weird|funny|sad|amazing|awesome|ok|okay)$/.test(next.lower))) {
        add(t.start, t.end, "it's", "Did you mean “it's” (it is, it has)? “Its” is the possessive.");
      }
    }

    // "Who's book is this?" -> Whose (who's + noun + be)
    if ((t.lower === "who's") && next && next2 && /^(is|are|was|were)$/.test(next2.lower) &&
        /^\p{Ll}+$/u.test(next.text) && !/ing$/.test(next.lower) &&
        !/^(been|that|the|a|an|this|there|here|it|not|still|ready|in|on|at|now|really|also|always|never|next|first|last|online|available|responsible|right|wrong|going)$/.test(next.lower)) {
      add(t.start, t.end, "whose", "Did you mean the possessive “whose”? “Who's” means “who is”.");
    }

    // "monday", "english" -> capitalized (days, months, languages, holidays)
    if (/^\p{Ll}/u.test(t.text) && PROPER_WORDS.has(t.lower) && !(prev?.text === "-" || next?.text === "-")) {
      add(t.start, t.end, t.text[0].toUpperCase() + t.text.slice(1), "Days, months, languages and nationalities take a capital letter.", { override: true, category: "spelling", keepCase: true });
    }

    // "informations", "advices" -> uncountable nouns
    if (UNCOUNTABLE[t.lower]) {
      add(t.start, t.end, UNCOUNTABLE[t.lower], `“${UNCOUNTABLE[t.lower]}” is uncountable: it has no plural.`, { override: true });
    }

    // "I am agree" -> "I agree"
    if (/^(am|is|are|'m|'re)$/.test(t.lower) && next && /^(agree|disagree)$/.test(next.lower) && prev) {
      const subjectThird = /^(he|she|it|everyone|everybody|nobody|someone|this|that)$/.test(prev.lower);
      add(t.start, next.end, subjectThird ? `${next.lower}s` : next.lower, "“Agree” is a verb: no “be” before it.");
    }

    // "Everyone are welcome" -> is
    if (prev && /^(everyone|everybody|someone|somebody|nobody|anyone|anybody|everything|nothing|something|each)$/.test(prev.lower) &&
        /^(are|were|have)$/.test(t.lower) && !(toks[i - 2] && /^(of|for|to|with)$/.test(toks[i - 2].lower))) {
      const fix = { are: "is", were: "was", have: "has" }[t.lower];
      add(t.start, t.end, fix, `“${prev.lower}” is singular: use “${fix}”.`);
    }

    // "The documents was sent" -> were (determiner + regular plural noun + singular verb)
    if (prev && toks[i - 2] && /^(the|these|those|my|our|your|his|her|their|all|some|many|both|several)$/.test(toks[i - 2].lower) && (!toks[i - 3] || isPunct(toks[i - 3]) || /^(and|but|so|because|if|when|that)$/.test(toks[i - 3].lower)) &&
        /^(was|is|has)$/.test(t.lower) && /^\p{Ll}+s$/u.test(prev.text) && !/(ss|us|is|ics|ews|ies|ws)$/.test(prev.lower) &&
        !NOT_PLURAL.test(prev.lower) && frequency(prev.lower.slice(0, -1)) >= 3 && frequency(prev.lower) >= 2) {
      const fix = { was: "were", is: "are", has: "have" }[t.lower];
      add(t.start, t.end, fix, `“${prev.lower}” is plural: use “${fix}”.`);
    }

    // "I have three sister" -> sisters
    if (prev && /^(two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|several|many|few)$/.test(prev.lower) &&
        /^\p{Ll}+$/u.test(t.text) && !/s$/.test(t.lower) && !NUMBER_FOLLOWERS.test(t.lower) &&
        (!next || isPunct(next) || /^(in|at|on|from|who|that|to|of|is|are|was|were|with|for|ago|left|later)$/.test(next.lower))) {
      const plural = /[^aeiou]y$/.test(t.lower) ? `${t.lower.slice(0, -1)}ies` : /(ch|sh|x|s)$/.test(t.lower) ? `${t.lower}es` : `${t.lower}s`;
      if (frequency(plural) >= 3 && frequency(plural) > frequency(t.lower) - 2) {
        add(t.start, t.end, plural, `After “${prev.lower}”, the noun is plural.`);
      }
    }

    // "I look forward to hear from you" -> hearing
    if (prev?.lower === "to" && toks[i - 2]?.lower === "forward" && toks[i - 3] && /^(look|looking|looks|looked)$/.test(toks[i - 3].lower) &&
        /^\p{Ll}+$/u.test(t.text) && !/ing$/.test(t.lower) && !/^(the|a|an|my|your|our|his|her|their|this|that|it|you|seeing|meeting|working|it)$/.test(t.lower)) {
      add(t.start, t.end, ingForm(t.lower), "After “look forward to”, use the -ing form.");
    }

    // "We are planing a trip" -> planning ("planing" is gliding over water)
    if (prev && /^(am|is|are|was|were|be|been|being|i'm|we're|you're|they're|he's|she's|it's|not)$/.test(prev.lower) && ING_TYPOS[t.lower]) {
      add(t.start, t.end, ING_TYPOS[t.lower], `Did you mean “${ING_TYPOS[t.lower]}”?`);
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
