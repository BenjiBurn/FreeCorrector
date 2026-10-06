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

const SUBJECT_FOR = { me: "I", him: "he", her: "she", them: "they", us: "we", you: "you" };
// Words that can follow "you're" (adjectives, adverbs…): not nouns.
const YOURE_FOLLOWERS = /^(right|wrong|welcome|sure|late|early|kidding|joking|here|there|done|ready|fine|ok|okay|good|great|crazy|beautiful|amazing|awesome|funny|smart|nice|lucky|safe|free|busy|tired|sick|alone|home|back|away|next|up|out|in|on|off|so|too|not|very|really|always|never|just|still|already|all|both|the|a|an|my|our|his|her|their|going|gonna|being|getting|asking|correct|cute|sweet|brilliant|perfect|special|best|worst|first|last|only|right|mad|angry|sad|happy|cool|hot|cold|young|old|new|late|right|amazing|incredible|wonderful|terrible|stupid|silly|clever|kind|rude|mean|weird|strange|different|important|responsible|invited|allowed|supposed|able|unable|right|gone|over|through|about|almost|probably|definitely|absolutely|totally|literally|actually|also|still|such|like|worth|wise|welcome)$/;
const LETS_VERBS = /^(go|do|see|try|start|make|get|talk|meet|eat|have|take|be|move|play|watch|find|keep|call|check|discuss|hope|work|think|look|wait|plan|celebrate|grab|head|catch|leave|stay|begin|focus|keep)$/;
const IRREGULAR_PLURALS = /^(children|people|men|women|feet|teeth|mice|geese|police)$/;
const YOUR_NOUNS = /^(help|time|message|email|e-mail|support|patience|answer|reply|feedback|response|understanding|attention|kindness|advice|work|effort|efforts|order|question|questions|interest|call|letter|gift|hospitality|cooperation|consideration|trust|comments|input|invitation|offer|application)$/;
// Nouns typed where the verb was meant, after "to" or a modal.
const VERB_FOR_NOUN = { discus: "discuss", breath: "breathe", advice: "advise", loose: "lose", belief: "believe", proof: "prove", choise: "choose", chose: "choose" };
// Misspellings with a known fix, and irregular verbs or plurals given a
// regular ending ("teached", "womans"): Harper's nearest words miss them.
const EN_MISSPELLINGS = {
  febuary: "february", wensday: "wednesday", wendsday: "wednesday", wednsday: "wednesday", tuesay: "tuesday", thrusday: "thursday",
  neice: "niece", yatch: "yacht", colleage: "colleague", colleages: "colleagues", sence: "sense", consequenses: "consequences", wich: "which", whitch: "which", collegue: "colleague", collegues: "colleagues",
  mispell: "misspell", mispelled: "misspelled", supercede: "supersede", tounge: "tongue", definately: "definitely",
  definatly: "definitely", definitly: "definitely", seperate: "separate", seperately: "separately", occured: "occurred",
  occurence: "occurrence", accomodate: "accommodate", accomodation: "accommodation", untill: "until", beleive: "believe",
  recieve: "receive", recieved: "received", acheive: "achieve", acheived: "achieved", begining: "beginning", calender: "calendar",
  concious: "conscious", foriegn: "foreign", grammer: "grammar", harrass: "harass", millenium: "millennium",
  noticable: "noticeable", persue: "pursue", posession: "possession", prefered: "preferred", reccomend: "recommend",
  recomend: "recommend", refered: "referred", sieze: "seize", succesful: "successful", successfull: "successful",
  threshhold: "threshold", vaccuum: "vacuum", wierd: "weird", truely: "truly", tommorow: "tomorrow", tommorrow: "tomorrow",
  tomorow: "tomorrow", neccessary: "necessary", necesary: "necessary", goverment: "government", enviroment: "environment",
  embarass: "embarrass", embarassed: "embarrassed", existance: "existence", independant: "independent", publically: "publicly",
  arguement: "argument", basicly: "basically", buisness: "business", carribean: "caribbean", cemetary: "cemetery",
  completly: "completely", curiousity: "curiosity", dilemna: "dilemma", embarassing: "embarrassing", experiance: "experience",
  familar: "familiar", finaly: "finally", florescent: "fluorescent", freind: "friend", gaurd: "guard", happend: "happened",
  immediatly: "immediately", knowlege: "knowledge", liason: "liaison", libary: "library", lisence: "license",
  maintainance: "maintenance", mischevious: "mischievous", neighbour: "neighbour", occassion: "occasion", oppurtunity: "opportunity",
  peice: "piece", posible: "possible", priviledge: "privilege", probaly: "probably", realy: "really", rember: "remember",
  restaraunt: "restaurant", rythm: "rhythm", sargent: "sergeant", similiar: "similar", sincerly: "sincerely", speach: "speech",
  stregth: "strength", suprise: "surprise", suprised: "surprised", temperture: "temperature", thier: "their", tought: "taught",
  truley: "truly", unfortunatly: "unfortunately", usualy: "usually", wonderfull: "wonderful", writting: "writing",
  wether: "whether", adress: "address", alot: "a lot", alright: "alright",
  // regularized irregular verbs and plurals
  teached: "taught", buyed: "bought", thinked: "thought", goed: "went", runned: "ran", catched: "caught", bringed: "brought",
  eated: "ate", drinked: "drank", writed: "wrote", speaked: "spoke", falled: "fell", feeled: "felt", keeped: "kept",
  sleeped: "slept", swimmed: "swam", telled: "told", winned: "won", knowed: "knew", growed: "grew", throwed: "threw",
  drawed: "drew", freezed: "froze", hided: "hid", maked: "made", sayed: "said", standed: "stood", understanded: "understood",
  gived: "gave", taked: "took", comed: "came", becomed: "became", beginned: "began", breaked: "broke", choosed: "chose",
  drived: "drove", fighted: "fought", finded: "found", forgetted: "forgot", getted: "got", holded: "held", losed: "lost",
  meaned: "meant", meeted: "met", readed: "read", rided: "rode", sended: "sent", shaked: "shook", shooted: "shot",
  sitted: "sat", spended: "spent", stealed: "stole", sticked: "stuck", striked: "struck", sweared: "swore", weared: "wore",
  leaved: "left", selled: "sold", seeked: "sought", flied: "flew", hurted: "hurt", hitted: "hit", costed: "cost",
  womans: "women", mans: "men", childs: "children", mouses: "mice", foots: "feet", tooths: "teeth", gooses: "geese",
  persons: "persons", sheeps: "sheep", fishs: "fish", knifes: "knives", wifes: "wives", lifes: "lives", leafs: "leaves",
  wolfs: "wolves", thiefs: "thieves", halfs: "halves", shelfs: "shelves", potatos: "potatoes", tomatos: "tomatoes",
};
delete EN_MISSPELLINGS.persons;
delete EN_MISSPELLINGS.neighbour;
delete EN_MISSPELLINGS.alright;

// Simple past typed where the participle goes ("I have ate").
const EN_PAST_TO_PARTICIPLE = {
  ate: "eaten", went: "gone", saw: "seen", did: "done", wrote: "written", took: "taken", gave: "given", spoke: "spoken",
  drank: "drunk", ran: "run", came: "come", began: "begun", broke: "broken", chose: "chosen", drove: "driven", forgot: "forgotten",
  knew: "known", rode: "ridden", rang: "rung", sang: "sung", swam: "swum", threw: "thrown", wore: "worn", grew: "grown",
  flew: "flown", drew: "drawn", fell: "fallen", stole: "stolen", hid: "hidden", shook: "shaken", tore: "torn", woke: "woken",
  bit: "bitten", froze: "frozen", sank: "sunk", shrank: "shrunk", stank: "stunk", mistook: "mistaken", forgave: "forgiven",
};

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
    // ("I loose my keys", "they loose weight": a subject before it, or an object after it.)
    if (t.lower === "loose" && prev && (/^(will|to|not|don't|can|could|would|might|may|should|never|gonna|cannot|won't|didn't|must|i|you|we|they|always|often|sometimes|usually)$/.test(prev.lower) ||
        (next && /^(my|your|his|her|our|their|it|them|weight|control|money|time|track|interest|hope|sleep|everything|anything|focus)$/.test(next.lower) && !/^(a|the|too|so|very|come|comes|came|break|broke|let|cut|hang|set)$/.test(prev.lower)))) {
      add(t.start, t.end, "lose", "Did you mean the verb “lose” (to misplace, to be defeated)?");
    }

    // "to many people", "I'm coming to." -> "too"
    if (t.lower === "to" && prev) {
      const atEnd = !next || isPunct(next);
      const beforeAdverb = next && TOO_WORDS.test(next.lower) &&
        (!next2 || isPunct(next2) || /^(people|things|times|of|to|for|and|now|today|tonight|outside|inside|here|there|lately|right|yet|but|so|in|at|on)$/.test(next2.lower));
      // "I want to come to." -> the verb already had its "to": this one is "too".
      // Same for "I'm going to the store to." ; but "I don't want to have to." is fine.
      // (Only after a place or "come"/"go": "time to adjust to" is a stranded preposition.)
      const secondTo = atEnd && toks.slice(Math.max(0, i - 5), i - 1).some((x) => x.lower === "to") &&
        /^(come|go|store|shop|park|beach|party|house|office|school|there|it|this|that|one|place|movies|cinema|gym|meeting|concert|show|game|class|work|home|mall|restaurant|bar|club|wedding|event)$/.test(prev.lower) &&
        !/^(have|has|had|want|wants|need|needs|going|got|ought|used|like|love|try|able|plan|hope|mean|meant|supposed|allowed)$/.test(prev.lower);
      if ((atEnd && /^(me|you|him|her|us|them|it|this|that|one|i|we|they|he|she)$/.test(prev.lower)) || beforeAdverb || secondTo) {
        add(t.start, t.end, "too", "Did you mean “too” (also, excessively)?");
      }
      // "I have to cats" -> two (a plural noun, not a verb, follows)
      if (next && /^(have|has|had|got|need|needs|bought|buy|want|wants|with|only|about|for|ate|saw)$/.test(prev.lower) &&
          /^\p{Ll}+s$/u.test(next.text) && !/(ss|us|is)$/.test(next.lower) && (!next2 || isPunct(next2) || /^(and|or|at|in|on|but)$/.test(next2.lower)) &&
          frequency(next.lower.slice(0, -1)) >= 3.5) {
        add(t.start, t.end, "two", "Did you mean the number “two”?");
      }
    }

    // "I'd rather walk then drive", "more then ten" -> than
    // (The comparison word must be in the same phrase: not "rather, and then".)
    let comparison = false;
    for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
      if (isPunct(toks[k]) || /^(and|or|but|so|team's)$/.test(toks[k].lower)) break;
      if (/^(rather|more|less|better|worse|different|fewer|bigger|smaller|older|younger|faster|slower|higher|lower|longer|shorter|easier|harder|cheaper|larger)$/.test(toks[k].lower)) comparison = true;
    }
    if (t.lower === "then" && comparison) {
      add(t.start, t.end, "than", "Comparisons take “than”, not “then”.");
    }

    // "I except your apology" -> accept
    if (t.lower === "except" && prev && /^(i|you|we|they|will|to|can|could|would|should|please|must|not|don't|didn't|can't|cannot|won't|couldn't|wouldn't|shouldn't|gladly|happily)$/.test(prev.lower)) {
      add(t.start, t.end, "accept", "Did you mean the verb “accept” (to agree to take)?");
    }

    // "I don't know weather he's coming" -> whether
    if (t.lower === "weather" && prev && !/^(the|this|that|bad|good|nice|cold|hot|warm|some|any|of|in|great|lovely|terrible|our|your|my|their|what)$/.test(prev.lower) &&
        next && /^(or|he|she|it|they|we|you|i|he's|she's|it's|they're|we're|you're|i'm|to|not|there|this|that)$/.test(next.lower)) {
      add(t.start, t.end, "whether", "Did you mean “whether” (if)?");
    }

    // "Were are you going?" -> Where ; "Where going to the beach" -> We're
    if (clauseStart && t.lower === "were" && next && /^(are|is|do|does|did|was|were|can|will|should|have|has)$/.test(next.lower)) {
      add(t.start, t.end, "where", "Did you mean “where” (which place)?");
    }
    if (clauseStart && t.lower === "where" && next && /^(going|coming|leaving|having|trying|planning|getting|doing|staying|waiting|looking|moving|working|late|here|done|ready|sorry|fine|not|so|all|happy|back|almost|still|always|never|on|off|out|lost|good|okay|ok)$/.test(next.lower)) {
      add(t.start, t.end, "we're", "Did you mean “we're” (we are)?");
    }

    // "There coming tomorrow" -> They're
    if (clauseStart && t.lower === "there" && next && /^(coming|going|leaving|doing|trying|getting|having|making|saying|looking|waiting|playing|working|planning|not|so|always|never|really)$/.test(next.lower) &&
        !(next2 && /^(to|be|is)$/.test(next2.lower) && /^(not|so|always|never|really)$/.test(next.lower))) {
      add(t.start, t.end, "they're", "Did you mean “they're” (they are)?");
    }

    // "Whose coming tonight?" -> Who's
    if (t.lower === "whose" && next && /^(\p{Ll}+ing|been|got|there|that|this|not|gonna)$/u.test(next.lower) && !/^(thing|king|ring|wing|building|wedding|meeting|feeling|morning|evening|painting|clothing|ceiling|darling|sibling|everything|something|nothing|anything)$/.test(next.lower)) {
      add(t.start, t.end, "who's", "Did you mean “who's” (who is)?");
    }

    // "Is this you're bag?" -> your (a noun follows, then the sentence ends)
    if (t.lower === "you're" && next && /^\p{Ll}+$/u.test(next.text) && !/(ing|ed|ly)$/.test(next.lower) &&
        // A question ("Is this you're bag?") or a verb after the noun ("you're car is red").
        !YOURE_FOLLOWERS.test(next.lower) && next2 && (next2.text === "?" || /^(is|was|are|were|has|looks)$/.test(next2.lower)) &&
        frequency(next.lower) >= 3) {
      add(t.start, t.end, "your", "Did you mean the possessive “your”?", { override: true });
    }

    // "Don't brake it" -> break (a car brakes; you break things)
    if (/^(brake|brakes|braking)$/.test(t.lower) && next && /^(it|this|that|them|my|your|his|her|our|their|anything|something|everything|up|down|apart|free|out|into|the|a|an|me|him|us|news|records?)$/.test(next.lower) &&
        !(next2 && /^(pedal|pedals|pads?|lights?|fluid|system|discs?|line)$/.test(next2.lower))) {
      const fix = { brake: "break", brakes: "breaks", braking: "breaking" }[t.lower];
      add(t.start, t.end, fix, `Did you mean “${fix}” (to smash, to split)? “${t.lower}” is about slowing a vehicle.`);
    }

    // "some advise" -> advice (the noun)
    if (t.lower === "advise" && prev && /^(some|any|your|my|good|great|the|of|for|piece|his|her|their|our|bad|no|expert|legal|medical)$/.test(prev.lower)) {
      add(t.start, t.end, "advice", "The noun is “advice”; “advise” is the verb.");
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
      const afterAdj = !next2 || isPunct(next2) || /^(to|that|for|when|if|because|outside|inside|today|tonight|here|now|again|in|out|and|but|so|at|right)$/.test(next2.lower);
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

    // ---------- Known misspellings and regularized irregular forms ----------

    // "Febuary", "wich", "teached", "womans": the fix is known. Also catches
    // capitalized ones Harper skips as names ("Wensday").
    const known = EN_MISSPELLINGS[t.lower];
    if (known && /^[\p{L}]+$/u.test(t.text)) {
      const fix = /^\p{Lu}/u.test(t.text) ? known[0].toUpperCase() + known.slice(1) : known;
      add(t.start, t.end, fix, `Did you mean “${fix}”?`, { override: true, category: "spelling", keepCase: true });
    }

    // ---------- Real-word confusions ----------

    const L1 = prev?.lower ?? "", R1 = next?.lower ?? "", R2 = next2?.lower ?? "";
    const atEnd = !next || isPunct(next);
    const confuse = (fix, message) => add(t.start, t.end, fix, message ?? `Did you mean “${fix}”?`, { override: true });

    // "I left my keys over their." -> there ; "They're car" -> Their ; "They're is" -> There
    if (t.lower === "their" && atEnd) confuse("there", "“Their” needs a noun after it: did you mean “there”?");
    if (t.lower === "they're" && next && /^(is|are|was|were|isn't|aren't|wasn't|weren't)$/.test(R1)) confuse("there");
    if (t.lower === "they're" && next && /^\p{Ll}+$/u.test(next.text) && !/(ing|ed|ly)$/.test(R1) && !YOURE_FOLLOWERS.test(R1) &&
        next2 && /^(is|was|are|were|has|have|looks|seems|broke|needs)$/.test(R2) && frequency(R1) >= 3) {
      confuse("their", "Did you mean the possessive “their”?");
    }
    // "I think there going to be late" -> they're
    if (t.lower === "there" && next && /^(going|coming|leaving|doing|trying|getting|having|making|saying|looking|waiting|playing|working|planning|not|so|always|never|really|late|right|wrong|here|done|ready|busy|sure)$/.test(R1) &&
        prev && /^(think|thought|hope|guess|know|knew|sure|say|said|that|because|if|when|but|and|so|maybe|probably)$/.test(L1) &&
        !(next2 && /^(to|be|is)$/.test(R2) && /^(not|so|always|never|really)$/.test(R1))) {
      confuse("they're", "Did you mean “they're” (they are)?");
    }
    // "We have too cats" -> two
    if (t.lower === "too" && prev && /^(have|has|had|got|need|bought|buy|want|with|only|about|for|ate|saw|the|these|those|my|our)$/.test(L1) &&
        next && /^\p{Ll}+s$/u.test(next.text) && !/(ss|us|is)$/.test(R1) && (!next2 || isPunct(next2) || /^(and|or|at|in|on|but|of)$/.test(R2)) &&
        frequency(R1.slice(0, -1)) >= 3.5) {
      confuse("two", "Did you mean the number “two”?");
    }
    // "Everyone came accept Tom" -> except
    if (t.lower === "accept" && prev && (/^(came|went|arrived|left|everyone|everybody|all|everything|nobody|anyone|anything|everywhere|always|nothing|ate|finished|liked|loved|attended)$/.test(L1) ||
        (/ed$/.test(L1) && next && /^\p{Lu}/u.test(next.text)))) {
      confuse("except", "Did you mean “except” (but, apart from)?");
    }
    // "These trousers are too lose" -> loose
    if (t.lower === "lose" && prev && /^(too|so|very|quite|bit|come|came|comes|break|broke|let|cut|hang|set|is|are|was|were|feel|feels|felt|run|ran|got|get|getting)$/.test(L1) && atEnd) {
      confuse("loose", "Did you mean “loose” (not tight)? “Lose” means to misplace.");
    }
    // quiet / quite
    if (t.lower === "quite" && prev && /^(be|is|was|keep|stay|very|so|too|stayed|remain|completely|been|being|totally|kept)$/.test(L1) &&
        (atEnd || /^(during|please|in|at|and|for|now|while|until|here|there)$/.test(R1))) {
      confuse("quiet", "Did you mean “quiet” (silent)?");
    }
    if (t.lower === "quiet" && next && /^(good|nice|well|sure|right|a|an|interesting|big|small|hard|easy|fast|often|late|early|bad|long|far|close|simple|different|old|new|expensive|cheap|funny|tired|busy|happy|sad|lot|clear|possible|likely|cold|hot|strong|true)$/.test(R1) &&
        !(prev && /^(a|the|very|so|too|be|keep|stay|it|this|that|and)$/.test(L1))) {
      confuse("quite", "Did you mean “quite” (fairly, very)?");
    }
    // principal / principle
    if (t.lower === "principle" && prev && /^(school|vice|assistant|head|deputy|the school)$/.test(L1)) confuse("principal", "The head of a school is the “principal”.");
    if (t.lower === "principal" && prev && /^(of|in|on)$/.test(L1) && atEnd) confuse("principle", "A rule or belief is a “principle”.");
    // stationary / stationery
    if (t.lower === "stationary" && ((prev && /^(office|writing|school|some|new|buy|bought|of)$/.test(L1)) || /^(for|supplies|shop|store|items)$/.test(R1)) &&
        !/^(bike|bicycle|car|vehicle|object|position|front|wave|point|state|engine)$/.test(R1)) {
      confuse("stationery", "Paper and pens are “stationery”; “stationary” means not moving.");
    }
    // complement / compliment
    if (/^complement(s)?$/.test(t.lower) && (toks.slice(Math.max(0, i - 3), i).some((x) => /^(nice|kind|lovely|sweet|thanks|thank|nicest|best|great|big|many|huge)$/.test(x.lower)) ||
        (/^on$/.test(R1) && /^(my|your|his|her|their|the|our)$/.test(R2))) && !/^(to|of|for)$/.test(R1)) {
      confuse(t.lower.endsWith("s") ? "compliments" : "compliment", "Praise is a “compliment”.");
    }
    // desert / dessert
    if (t.lower === "desert" && ((prev && /^(for|eat|ate|had|order|ordered|some|delicious|favorite|favourite|chocolate|the)$/.test(L1) && (atEnd || /^(menu|spoon|wine|fork|plate|was|is|and)$/.test(R1)) &&
        !/^(the|a)$/.test(L1)) || /^(menu|spoon|wine|fork|plate)$/.test(R1))) {
      confuse("dessert", "The sweet course is “dessert”.");
    }
    // "She lead the team last year" -> led
    if (t.lower === "lead" && prev && /^(he|she|it)$/.test(L1) && next && !/^(to)$/.test(R1)) confuse("led", "Past tense of “lead”: “led”.");
    // "We past the museum" -> passed
    if (t.lower === "past" && prev && /^(i|we|they|you|he|she|it|just|already|finally)$/.test(L1) && next && /^(the|a|an|my|by|it|him|her|them|away|out|our|your|his|their|me|us)$/.test(R1)) {
      confuse("passed", "The verb is “passed”.");
    }
    // piece / peace
    if (t.lower === "piece" && next?.lower === "and" && /^(quiet|love)$/.test(R2)) confuse("peace");
    if (t.lower === "peace" && R1 === "of" && /^(cake|pie|pizza|paper|bread|wood|furniture|art|music|cheese|chocolate|land|evidence|information|advice|equipment|jewelry|the|my|your|it|that|this|toast|meat|fruit|work|news|software)$/.test(R2)) {
      confuse("piece", "A part of something is a “piece”.");
    }
    // "take a brake" -> break
    if (t.lower === "brake" && ((prev && /^(lunch|coffee|summer|spring|winter|christmas|tea|easter)$/.test(L1)) ||
        (L1 === "a" && toks[i - 2] && /^(take|took|taking|takes|need|needs|have|having|had|deserve|short|quick|little)$/.test(toks[i - 2].lower)))) {
      confuse("break", "A pause is a “break”.");
    }
    // hear / here
    if (t.lower === "hear" && prev && /^(over|come|right|in|out|from|near)$/.test(L1) && (atEnd || /^(and|now|to|please|quickly|for|with|then)$/.test(R1))) confuse("here", "Did you mean “here” (this place)?");
    if (t.lower === "here" && prev && /^(didn't|can't|can|couldn't|could|to|will|won't|cannot|i|you|we|they|did|don't|doesn't)$/.test(L1) &&
        next && /^(you|me|him|her|them|it|that|the|anything|what|about|from|a|an|this|those|these|everything|nothing|something)$/.test(R1)) {
      confuse("hear", "Did you mean “hear” (with your ears)?");
    }
    // "I no the answer" -> know
    if (t.lower === "no" && prev && /^(i|you|we|they|don't|didn't|doesn't|to|not)$/.test(L1) &&
        next && /^(the|that|what|how|why|where|when|who|it|him|her|them|you|about|if|whether|anything|everything|this)$/.test(R1)) {
      confuse("know", "Did you mean “know” (be aware)?");
    }
    // "What should I where to the wedding?" -> wear
    if (t.lower === "where" && prev && toks[i - 2] && /^(should|could|would|will|can|shall|might|must|to|i'll|gonna)$/.test(toks[i - 2].lower) && /^(i|you|we|they|he|she)$/.test(L1) &&
        next && /^(a|my|your|his|her|the|it|that|this|to|something|anything|on|tonight|today|tomorrow|for)$/.test(R1)) {
      confuse("wear", "Clothes: “wear”.");
    }
    // "Please right your name" -> write
    if (t.lower === "right" && prev && /^(please|to|will|can|should|must|i'll|could|would|don't|didn't|i|you|we|they|and)$/.test(L1) &&
        next && /^(your|my|a|the|down|it|me|him|her|them|back|an|this|that|something|an|letters|emails)$/.test(R1) &&
        !(next2 && /^(wrong|wrongs|ship|thing|answer|way|side|place|time|now|away|choice|person|one)$/.test(R2)) && !/^(is|are|was|be)$/.test(L1)) {
      confuse("write", "Did you mean “write” (with a pen)?");
    }
    // "I need to by some milk" -> buy
    if (t.lower === "by" && prev && /^(to|will|can|could|should|must|i'll|didn't|don't|gonna|wanna|let's)$/.test(L1) &&
        next && /^(some|a|an|the|me|it|them|new|more|one|two|tickets|food|milk|groceries|something|anything|her|him|us|you|my|your|his|our|their|this|that|these|those)$/.test(R1) &&
        toks[i - 2] && /^(need|needs|want|wants|going|have|has|had|forgot|went|go|plan|planning|like|wanted|needed|i|we|you|they|he|she|let's|time)$/.test(toks[i - 2].lower)) {
      confuse("buy", "Did you mean “buy” (purchase)?");
    }
    // "construction cite" -> site
    if (/^cites?$/.test(t.lower) && prev && /^(construction|web|building|camp|work|job|camping|archaeological|heritage|the|a|this|our|their|test)$/.test(L1) && !/^(the|a)$/.test(L1) || (/^cites?$/.test(t.lower) && /^(web)$/.test(L1))) {
      confuse(t.lower.endsWith("s") ? "sites" : "site", "A place is a “site”.");
    }
    // "Dogs are not aloud" -> allowed
    if (t.lower === "aloud" && prev && /^(not|are|is|be|been|were|was|isn't|aren't|wasn't|weren't|never|n't)$/.test(L1)) confuse("allowed", "Did you mean “allowed” (permitted)?");
    // through / threw
    // ("kicked it through the posts": "it" is an object there, not the subject.)
    if (t.lower === "through" && prev && /^(he|she|i|we|they|you)$/.test(L1) && (!toks[i - 2] || isPunct(toks[i - 2]) || /^(and|but|then|so|when|because)$/.test(toks[i - 2].lower)) && next && /^(the|a|it|his|her|my|away|up|out|them|him|me|our|their|your|stones|rocks)$/.test(R1)) {
      confuse("threw", "Past of “throw”: “threw”.");
    }
    if (t.lower === "threw" && prev && !/^(he|she|i|we|they|you|it|who|and|that)$/.test(L1) &&
        (/(ed|ing)$/.test(L1) || /^(went|ran|go|walk|run|drive|drove|fly|flew|get|got|come|came|pass|look|read|sailed|all|halfway|straight|right)$/.test(L1)) &&
        next && /^(the|a|an|it|my|your|our|their|this|that|town|traffic|security)$/.test(R1)) {
      confuse("through", "Did you mean “through” (from one side to the other)?");
    }
    // "can't bare the noise" -> bear
    if (t.lower === "bare" && prev && /^(can't|cannot|couldn't|to|can|could|won't|i|not)$/.test(L1) && next && /^(the|it|this|that|to|with|him|her|them|any|you|me|being|seeing|hearing)$/.test(R1)) {
      confuse("bear", "To tolerate is to “bear”.");
    }
    // "bus fair" -> fare
    if (t.lower === "fair" && prev && /^(bus|taxi|train|cab|subway|metro|airline|plane|return|single|tram|ferry|air)$/.test(L1)) confuse("fare", "The price of a ticket is the “fare”.");
    // "Our plain landed" -> plane
    if (t.lower === "plain" && next && /^(landed|took|takes|crashed|tickets|ticket|ride|flight|leaves|left|departs|lands|was|is|seat|journey)$/.test(R1) &&
        prev && /^(the|our|my|a|their|his|her|your)$/.test(L1) && !/^(text|english|white|yogurt|truth|sight)$/.test(R1)) {
      if (/^(landed|took|takes|crashed|tickets|ticket|ride|flight|leaves|left|departs|lands|seat|journey)$/.test(R1) || /(airport|flight|landed|pilot|takeoff|delayed)/.test(paragraph.toLowerCase())) confuse("plane", "An aircraft is a “plane”.");
    }
    // "lead roll" -> role
    if (t.lower === "roll" && ((prev && /^(lead|leading|main|key|important|major|starring|supporting|title)$/.test(L1)) || R1 === "model")) confuse("role", "A part in a play is a “role”.");
    // "heart and sole" -> soul
    if (t.lower === "sole" && ((L1 === "and" && toks[i - 2]?.lower === "heart") || /^(mate|mates|music|food|searching)$/.test(R1))) confuse("soul");
    // "Don't waist your money" -> waste
    if (t.lower === "waist" && ((next && /^(your|my|our|their|his|her|time|money|of|it|food|energy|away|any|no)$/.test(R1)) || (prev && /^(don't|to|a|such|will|won't|never|total|complete)$/.test(L1) && !/^(a|her|his|my|your)$/.test(L1)))) {
      confuse("waste", "Did you mean “waste” (use badly)?");
    }
    // "next weak" -> week
    if (t.lower === "weak" && prev && /^(next|last|this|per|every|each|a|one|two|three|that)$/.test(L1) && (atEnd || /^(ago|and|or|for|at|on|in|to|i|we|you)$/.test(R1)) && !/^(a)$/.test(L1)) {
      confuse("week", "Seven days make a “week”.");
    }
    if (t.lower === "weak" && L1 === "a" && /^(ago|later|from)$/.test(R1)) confuse("week", "Seven days make a “week”.");

    // ---------- Agreement ----------

    // "The list of items are" -> is ; "Neither of them are" -> is ; "Each of the students have" -> has
    if (/^(are|have|were|do)$/.test(t.lower)) {
      const fix = { are: "is", have: "has", were: "was", do: "does" }[t.lower];
      // "neither/either/each/one of (the) X are"
      let k = i - 1;
      while (k > i - 5 && k >= 0 && toks[k].lower !== "of") k--;
      const head = toks[k - 1];
      if (k >= 1 && toks[k].lower === "of" && head && /^(neither|either|each|one|list|set|box|bag|collection|pile|stack|group|series)$/.test(head.lower) &&
          (head.lower !== "group" && head.lower !== "series" || toks[k - 2]?.lower === "the") &&
          // ("a set of rules – were those of Eton": a dash or comma breaks the phrase.)
          !toks.slice(k + 1, i).some((x) => /^(who|that|which)$/.test(x.lower) || !/[\p{L}\p{N}]/u.test(x.text))) {
        add(t.start, t.end, fix, `The subject is “${head.lower}”: singular verb.`, { override: true });
      }
    }
    // "There is many reasons" -> are
    if (/^(is|was)$/.test(t.lower) && L1 === "there" && next && /^(many|several|few|two|three|four|five|numerous|various|lots|plenty|loads|dozens|hundreds|thousands)$/.test(R1)) {
      add(t.start, t.end, t.lower === "is" ? "are" : "were", "The noun is plural: “there are”.", { override: true });
    }
    // "I have never ate sushi" -> eaten
    if (EN_PAST_TO_PARTICIPLE[t.lower] && prev && (/^(have|has|had|'ve|i've|we've|you've|they've|he's|she's|haven't|hasn't|hadn't)$/.test(L1) ||
        (/^(never|already|just|ever|not|always|recently|finally)$/.test(L1) && toks[i - 2] && /^(have|has|had|'ve|i've|we've|you've|they've|haven't|hasn't|hadn't)$/.test(toks[i - 2].lower)))) {
      add(t.start, t.end, EN_PAST_TO_PARTICIPLE[t.lower], `After “have”, use the past participle: “${EN_PAST_TO_PARTICIPLE[t.lower]}”.`, { override: true });
    }
    // "between you and I" -> you and me
    if (t.lower === "you" && next?.lower === "and" && toks[i + 2]?.text === "I" && prev && /^(between|for|with|to|from|like|than|about|of|at|behind|against|without)$/.test(L1)) {
      add(t.start, toks[i + 2].end, "you and me", "After a preposition, use “me”: “between you and me”.", { override: true, keepCase: true });
    }
    // "Myself and Sarah will" -> "Sarah and I"
    if (clauseStart && t.lower === "myself" && next?.lower === "and" && next2 && toks[i + 3] && !isPunct(toks[i + 3])) {
      add(t.start, next2.end, `${next2.text} and I`, "As a subject, use “I”, and put yourself last: “Sarah and I”.", { override: true, keepCase: true });
    }
    // "less people" -> fewer
    if (t.lower === "less" && next && (R1 === "people" || (/^\p{Ll}+s$/u.test(next.text) && !/(ss|us|is|ics|news)$/.test(R1) && frequency(R1.slice(0, -1)) >= 3.5 && !/^(than|and|of)$/.test(R1))) &&
        !NOT_PLURAL.test(R1)) {
      add(t.start, t.end, /^\p{Lu}/u.test(t.text) ? "Fewer" : "fewer", "With countable plurals, use “fewer”.", { override: true, keepCase: true });
    }
    // "I don't know nothing" -> anything
    if (/^(nothing|nobody|nowhere|no one)$/.test(t.lower) && toks.slice(Math.max(0, i - 3), i).some((x) => /^(don't|didn't|doesn't|can't|won't|isn't|aren't|wasn't|weren't|haven't|hasn't|couldn't|wouldn't|shouldn't|never|not)$/.test(x.lower))) {
      const fix = { nothing: "anything", nobody: "anybody", nowhere: "anywhere", "no one": "anyone" }[t.lower];
      add(t.start, t.end, fix, "Double negative: use “anything” after a negative verb.", { override: true });
    }
    // "I can't hardly hear you" -> can hardly
    if (/^(can't|couldn't|don't|didn't|won't|wouldn't|cannot)$/.test(t.lower) && next?.lower === "hardly") {
      const fix = { "can't": "can", cannot: "can", "couldn't": "could", "don't": "do", "didn't": "did", "won't": "will", "wouldn't": "would" }[t.lower];
      add(t.start, next.end, `${fix} hardly`, "“Hardly” is already negative.", { override: true });
    }

    // "I seen", "they done" -> "saw", "did"
    if (prev && /^(i|you|we|they|he|she)$/.test(prev.lower) && (t.lower === "seen" || t.lower === "done")) {
      add(t.start, t.end, t.lower === "seen" ? "saw" : "did", `“${t.lower}” needs an auxiliary (“have ${t.lower}”); the simple past is “${t.lower === "seen" ? "saw" : "did"}”.`);
    }

    // ---------- More real-word confusions ----------

    const R3 = toks[i + 3]?.lower ?? "";
    const swap = (fix, message) => add(t.start, t.end, fix, message ?? `Did you mean “${fix}”?`, { override: true });
    if (t.lower === "sight" && /^(construction|building|camp|camping|web|work|job|archaeological|heritage|test)$/.test(L1)) swap("site", "A place is a “site”.");
    if (t.lower === "soul" && /^(owner|purpose|survivor|reason|responsibility|heir|provider|aim|source|exception|author|occupant)$/.test(R1)) swap("sole", "“Sole” means only, single.");
    if (t.lower === "weak" && /^(all|whole|entire|this|last|next)$/.test(L1) && (atEnd || /^(long|and|but|so|at|in|i|we)$/.test(R1))) swap("week", "Seven days make a “week”.");
    if (t.lower === "see" && /^(the|a|open)$/.test(L1) && (atEnd || /^(this|next|in|on|at|and|for|is|was|level|shore|breeze|water|view|side)$/.test(R1))) {
      swap("sea", "The ocean is the “sea”.");
    }
    if (t.lower === "meat" && ((L1 === "to" && /^(you|him|her|them|us|me|up|everyone|the|my|your)$/.test(R1)) || (/^(nice|pleased|glad|happy|great)$/.test(toks[i - 2]?.lower ?? "") && L1 === "to") || (R1 === "up"))) {
      swap("meet", "To see someone is to “meet”.");
    }
    if (/^flowers?$/.test(t.lower) && (/^(of|plain|wheat|corn|rice|almond|self-raising|all-purpose)$/.test(L1) && /(cups?|grams?|tablespoons?|g|kg|pound|ounces?|bag|plain|wheat|corn|rice|almond|self-raising|all-purpose)\s+(of\s+)?$/.test(paragraph.slice(0, t.start).toLowerCase()) ||
        /\b(bake|baking|dough|cake|bread|sugar|butter|eggs?|whisk|oven|bowl|recipe)\b/.test(paragraph.toLowerCase()) && /^(of|the|some|and|with)$/.test(L1) && !/\b(garden|bouquet|vase|pot|bloom|petals?)\b/.test(paragraph.toLowerCase()))) {
      swap(t.lower.endsWith("s") ? "flours" : "flour", "For baking, it is “flour”.");
    }
    if (t.lower === "male" && ((/^(the|my|your|e|e-|junk|voice|check|checked|by|in|post)$/.test(L1) && /^(arrive|arrived|came|come|is|was|yet|today|box|man|carrier|delivery)$/.test(R1)) || /^(box|carrier|man|delivery)$/.test(R1) && L1 !== "a")) {
      swap("mail", "Letters and parcels are “mail”.");
    }
    if (t.lower === "sweet" && /^(a|the|our|their|honeymoon|presidential|hotel|junior|executive|bridal)$/.test(L1) && (/hotel|room|booked|book|reserved|stay/.test(paragraph.toLowerCase())) && (atEnd || /^(at|in|for|with|on|was|is)$/.test(R1))) {
      swap("suite", "A set of hotel rooms is a “suite”.");
    }
    if (t.lower === "hole" && /^(the|a)$/.test(L1) && next && /^(pizza|cake|day|week|thing|time|world|family|team|class|night|weekend|book|bottle|story|year|month|life|place|house|city|country|point|morning|afternoon|evening|town|bag|box|meal)$/.test(R1)) {
      swap("whole", "Entire: “whole”.");
    }
    if (t.lower === "our" && ((/^(an|half|per|every|each|one)$/.test(L1) && (atEnd || /^(ago|later|or|and|of|to|before|after|in|from|long|away)$/.test(R1))) || (/^(\d+|two|three|four|five|24)$/.test(L1) && R1 === "ago"))) {
      swap("hour", "Sixty minutes make an “hour”.");
    }
    if (t.lower === "wood" && ((/^(i|you|we|they|he|she|it)$/.test(L1) && /^(like|love|be|have|go|not|never|rather|you|it|really|prefer|say|think|help)$/.test(R1)) || (clauseStart && /^(you|it|that|he|she|they)$/.test(R1) && /^(like|be|mind|have|help)$/.test(R2)))) {
      swap("would", "Did you mean “would”?");
    }
    if (t.lower === "worse" && /^(the)$/.test(L1) && next && toks.slice(i + 1, i + 5).some((x) => /^(ever|i've|i|we've|you've|of|in|possible)$/.test(x.lower))) {
      swap("worst", "The superlative is “the worst”.");
    }
    if (t.lower === "everyday" && (atEnd || /^(at|in|for|and|but|after|before|so|of|i|we|to)$/.test(R1)) && prev && !/^(an|the|my|your|our|their|his|her|its|this|that)$/.test(L1)) {
      swap("every day", "As an adverb (each day), write “every day”.");
    }
    if (t.lower === "were" && /^(sure|know|knew|wonder|wondering|ask|asked|remember|forgot|see|tell|idea|decide|is|that's)$/.test(L1) && next && /^(the|my|your|his|her|our|their|it|he|she|they|you|we|i|this|that|to)$/.test(R1) &&
        toks[i + 2] && /^(is|are|was|were|meeting|party|keys?|station|car|went|go|live|lives|stay)$/.test(R2)) {
      swap("where", "A place: “where”.");
    }
    if (t.lower === "steel" && ((L1 === "to" && /^(a|the|my|your|his|her|money|cars?|bikes?|it|them)$/.test(R1)) || /^(didn't|don't|won't|will|would|can)$/.test(L1))) swap("steal", "To take what is not yours: “steal”.");
    if (t.lower === "tail" && L1 === "fairy") swap("tale", "A story is a “tale”.");
    if (t.lower === "tails" && L1 === "fairy") swap("tales", "Stories are “tales”.");
    if (t.lower === "son" && /^(the)$/.test(L1) && /^(is|was)$/.test(R1) && /^(shining|out|hot|setting|rising|bright|up|down)$/.test(R2)) swap("sun", "The star is the “sun”.");
    if (t.lower === "son" && /^(the)$/.test(L1) && /^(shines|shone|rises|rose|sets|set|came|comes)$/.test(R1)) swap("sun", "The star is the “sun”.");

    // ---------- More agreement ----------

    // "The number of complaints have increased" -> has
    if (/^(have|are|were)$/.test(t.lower) && toks.slice(Math.max(0, i - 5), i).some((x, k, arr) => x.lower === "number" && arr[k - 1]?.lower === "the" && arr[k + 1]?.lower === "of")) {
      add(t.start, t.end, { have: "has", are: "is", were: "was" }[t.lower], "“The number of …” is singular.", { override: true });
    }
    // "Neither Tom nor Anna know" -> knows (the verb agrees with the nearest subject)
    if (prev && toks[i - 2]?.lower === "nor" && toks.slice(Math.max(0, i - 5), i - 2).some((x) => x.lower === "neither") &&
        /^\p{Lu}/u.test(prev.text) && /^[a-z]+$/.test(t.text) && !/s$/.test(t.lower) && frequency(`${t.lower}s`) >= 3 && !/^(will|can|could|should|would|must|might|may|did)$/.test(t.lower)) {
      add(t.start, t.end, /(ch|sh|x|o)$/.test(t.lower) ? `${t.lower}es` : `${t.lower}s`, "With “neither … nor”, the verb agrees with the nearest subject.", { override: true });
    }
    // "Her and I went" -> She and I
    if (clauseStart && /^(her|him)$/.test(t.lower) && next?.lower === "and" && /^(i|me)$/.test(R2) && toks[i + 3] && !isPunct(toks[i + 3])) {
      add(t.start, toks[i + 2].end, `${t.lower === "her" ? "She" : "He"} and I`, "Subject pronouns before a verb: “She and I”.", { override: true, keepCase: true });
    }
    // "badder" -> worse
    if (t.lower === "badder") swap("worse", "The comparative of “bad” is “worse”.");
    if (t.lower === "baddest") swap("worst", "The superlative of “bad” is “worst”.");
    if (t.lower === "gooder") swap("better", "The comparative of “good” is “better”.");
    // "Have you ate yet?" -> eaten
    if (EN_PAST_TO_PARTICIPLE[t.lower] && toks[i - 2] && /^(have|has|had|haven't|hasn't)$/.test(toks[i - 2].lower) && /^(you|we|they|i|he|she|it)$/.test(L1)) {
      add(t.start, t.end, EN_PAST_TO_PARTICIPLE[t.lower], `After “have”, use the past participle: “${EN_PAST_TO_PARTICIPLE[t.lower]}”.`, { override: true });
    }
    // "My brother and sister lives in Paris" -> live
    if (/^(my|our|your|his|her|their|the)$/.test(toks[i - 4]?.lower ?? "") && toks[i - 2]?.lower === "and" && fcIsNounLike(toks[i - 3], frequency) && fcIsNounLike(prev, frequency) &&
        (!toks[i - 5] || isPunct(toks[i - 5])) && /^(lives|works|is|was|has|likes|loves|wants|needs|plays|goes|does|comes|says|knows|thinks|lives)$/.test(t.lower)) {
      const plural = { is: "are", was: "were", has: "have", goes: "go", does: "do" }[t.lower] ?? t.lower.replace(/s$/, "");
      add(t.start, t.end, plural, "Two subjects joined by “and”: plural verb.", { override: true });
    }
    // "The news are bad" -> is
    if (/^(are|were|have)$/.test(t.lower) && L1 === "news" && /^(the|this|that|bad|good|latest|great)$/.test(toks[i - 2]?.lower ?? "")) {
      add(t.start, t.end, { are: "is", were: "was", have: "has" }[t.lower], "“News” is singular.", { override: true });
    }
    // "Yesterday we go to the zoo" -> went
    if (/^(yesterday|last)$/.test(toks.find((x, k) => k < i - 1 && k >= Math.max(0, i - 4))?.lower ?? "") && /^(i|we|they|you|he|she)$/.test(L1) &&
        EN_PRESENT_TO_PAST[t.lower]) {
      add(t.start, t.end, EN_PRESENT_TO_PAST[t.lower], "A past event (“yesterday”): the simple past.", { override: true });
    }
    // "I'm agree" -> I agree
    if (t.lower === "i'm" && /^(agree|disagree)$/.test(R1)) add(t.start, next.end, `I ${R1}`, "“Agree” is a verb: no “am” before it.", { override: true, keepCase: true });
  }

  // ---------- Phrases borrowed from other languages ----------
  for (const [re, fix, message] of EN_PHRASES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(paragraph))) {
      const start = m.index + (m[1]?.length ?? 0);
      const text = m[0].slice(m[1]?.length ?? 0);
      const replacement = typeof fix === "function" ? fix(text) : fix;
      add(start, start + text.length, replacement, message, { override: true, keepCase: !/^\p{Lu}/u.test(text) });
    }
  }
  return out;
}

function fcIsNounLike(tok, frequency) {
  return !!tok && /^\p{Ll}+$/u.test(tok.text) && !/(ly|ing)$/.test(tok.lower) && frequency(tok.lower) >= 2.5;
}

const EN_PRESENT_TO_PAST = {
  go: "went", come: "came", see: "saw", eat: "ate", buy: "bought", have: "had", get: "got", take: "took", make: "made",
  meet: "met", visit: "visited", play: "played", watch: "watched", walk: "walked", stay: "stayed", find: "found", leave: "left",
};

// [regex (group 1 = text kept before the error), fix, message]
const EN_PHRASES = [
  [/(^|[^\p{L}])explain me\b/giu, "explain to me", "One explains something to someone: “explain to me”."],
  [/(^|[^\p{L}])(?=(make|makes|made|making) (a|some) (photo|photos|picture|pictures)\b)(make|makes|made|making)/giu, (w) => ({ make: "take", makes: "takes", made: "took", making: "taking" })[w.toLowerCase()], "In English, you “take” a photo."],
  [/(^|[^\p{L}])married with\b/giu, "married to", "One is “married to” someone."],
  [/(^|[^\p{L}])(depends|depend|depending|depended) of\b/giu, (w) => w.replace(/ of$/i, " on"), "“Depend on”, not “depend of”."],
  [/(^|[^\p{L}])(borrow|borrows|borrowed)(?= (me|him|her|us|them|you)\b)/giu, (w) => ({ borrow: "lend", borrows: "lends", borrowed: "lent" })[w.toLowerCase()], "To give for a while is to “lend”; to “borrow” is to take."],
  [/(^|[^\p{L}])afraid from\b/giu, "afraid of", "One is “afraid of” something."],
  [/(^|[^\p{L}])responsible of\b/giu, "responsible for", "One is “responsible for” something."],
  [/(^|[^\p{L}])(waiting|wait|waited|waits)(?= (you|me|him|her|us|them)\b)/giu, (w) => `${w} for`, "One waits “for” someone."],
  [/(^|[^\p{L}])return back\b/giu, "return", "“Return” already means go back."],
  [/(^|[^\p{L}])insisted to (\p{L}+)/giu, (w) => { const verb = w.split(" ")[2]; return `insisted on ${verb.replace(/e$/, "")}ing`; }, "“Insist on doing”, not “insist to do”."],
  [/(^|[^\p{L}])(reached|reach|reaches) to (?=the|a|our|their|his|her|my)/giu, (w) => w.replace(/ to $/i, ""), "“Reach” takes no “to”."],
  [/(^|[^\p{L}])(discuss|discussed|discussing) about\b/giu, (w) => w.replace(/ about$/i, ""), "“Discuss” takes no “about”."],
  [/(^|[^\p{L}])(suggested|suggest|suggests) (him|her|them|me|us) to\b/giu, (w) => w.replace(/ (him|her|them|me|us) to$/i, (_, p) => ` ${p === "me" ? "I" : p === "us" ? "we" : p === "him" ? "he" : p === "her" ? "she" : "they"}`), "“Suggest that he…”, not “suggest him to”."],
];

// The apostrophe form of a contraction typed without it, or null.
// `prevWord` picks the right agreement: "she dont" -> "doesn't".
export function contractionFor(word, prevWord = "") {
  const lower = word.toLowerCase();
  if (lower === "dont" && /^(he|she|it|this|that|everyone|nobody|somebody|someone)$/i.test(prevWord)) return "doesn't";
  return CONTRACTIONS.get(lower) ?? null;
}
