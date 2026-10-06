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
  shrinked: "shrank", blowed: "blew", bited: "bit", leaded: "led", seeked: "sought", digged: "dug",
  deers: "deer", sheeps: "sheep", photoes: "photos", pianoes: "pianos", loafs: "loaves", boxs: "boxes", busses: "buses",
  traffics: "traffic", rusts: "rust", luggages: "luggage", furnitures: "furniture", researches: "research",
  wendesday: "wednesday", pronounciation: "pronunciation", exeptional: "exceptional", exeptionally: "exceptionally",
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
    // ("Seldom have I seen", "Had they done": an inverted auxiliary before the subject.)
    if (prev && /^(i|you|we|they|he|she)$/.test(prev.lower) && (t.lower === "seen" || t.lower === "done") &&
        !/^(have|has|had|haven't|hasn't|hadn't)$/.test(toks[i - 2]?.lower ?? "")) {
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

    roundThreeRules(toks, i, paragraph, add, frequency);
    roundFourRules(toks, i, paragraph, add, frequency);
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
  [/(^|[^\p{L}])(explain|explains|explained|explaining) (me|him|her|us|them)\b/giu, (w) => w.replace(/ (\p{L}+)$/u, " to $1"), "One explains something to someone: “explain to me”."],
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

// ---------- Subject–verb agreement ----------

// Verbs whose base form is not also a past form ("cut", "put", "read" are left out).
const EN_VERBS = new Set(("say know seem explain forget make need want think believe understand go come take give eat drink " +
  "arrive leave teach speak bark love hate prefer enjoy agree remember live become bring buy sell send write tell ask try " +
  "sing swim wait appear belong contain depend deserve exist include involve mean own require suppose wish wonder feel " +
  "sound taste smell help keep hold lose win pay meet grow happen decide cause allow expect remain suggest consider " +
  "provide create build continue learn follow drive ride wash wear carry fix miss reach sleep start begin finish work " +
  "play cook look see get do have watch call talk walk run stop open close use find sit stand fly cry study worry hurry " +
  "apply reply deny annoy destroy stay pray travel visit listen answer notice realize recognize manage change move smile " +
  "laugh complain argue apologize promise refuse accept imagine admire attend avoid borrow lend check choose collect " +
  "compare count cover cross dance deliver describe design develop discover dream drop earn enter fail fill guess hope " +
  "improve invite join jump kiss knock like mention mind mix offer order organize paint pass plan plant point practice " +
  "prepare press prevent print produce protect pull push raise receive relax remove repeat rent repair rest return ring " +
  "rush save search serve share shout show sign smoke solve spell spend steal suffer support survive tend test thank " +
  "touch train translate trust turn type vote wake warn waste weigh whisper yell snore bite shine rain snow " +
  "fit cancel sign submit postpone rewrite reply review approve confirm update upload download install delete edit print " +
  "schedule book order deliver ship pack unpack charge pay invite attend join host email text call message share post " +
  "publish launch release test fix solve handle manage lead own run speak sell buy rent lend borrow owe earn spend save " +
  "invest hire fire promote train coach mentor support assist serve cook bake fry boil grill clean wash dry iron fold " +
  "sweep mop vacuum tidy repair paint build design plan organize arrange prepare decide choose agree refuse accept " +
  "reject deny admit confess explain describe discuss mention suggest recommend propose require request demand ask " +
  "answer respond complain argue apologize thank greet hug kiss smile laugh cry shout scream whisper sing dance play " +
  "watch listen read write draw paint study learn teach remember forget know understand believe doubt hope wish want " +
  "need prefer love like hate enjoy miss lose win beat finish start begin continue stop quit stay leave arrive return " +
  "travel drive ride walk run swim fly climb jump fall sit stand lie sleep wake rest relax worry care matter belong " +
  "seem appear look sound smell taste feel cost weigh measure contain include involve depend rely trust affect").split(" "));
// Also frequent nouns: the verb reading needs a verb-like word after it.
const EN_NOUN_VERBS = /^(work|play|cook|look|call|talk|walk|run|stop|open|close|use|change|smile|laugh|plan|hope|rest|return|report|order|offer|dream|dance|drink|help|sleep|start|finish|wish|need|love|watch|visit|show|sign|point|press|print|ring|rush|save|search|share|shout|smoke|spell|support|test|touch|train|trust|turn|type|vote|warn|waste|cover|cross|drop|fill|fix|guess|jump|kiss|knock|mix|paint|pass|plant|practice|repair|rent|study|travel|answer|notice|change|promise|design|dream|fly|cry|ride|drive|walk|swim|sing|wait|stand|rain|snow|bite|shine|taste|smell|sound|feel)$/;
const EN_AFTER_VERB = /^(a|an|the|my|your|his|her|our|their|its|this|that|these|those|some|any|all|every|me|you|him|us|them|it|to|at|in|on|for|with|about|from|into|like|so|very|really|too|well|hard|a|lot|much|more|here|there|home|back|out|up|down|off|over|away|late|early|fast|slowly|quickly|clearly|everything|something|anything|nothing|everyone|what|how|when|where|why|if|whether|money|time|people|good|bad|great|strange|weird|nice|tired|happy|sad|all|night|day|long|loudly|properly|perfectly|twice|once|again|together|alone|by|around|through|during|until|after|before|every)$/;
const EN_ADV = /^(always|never|often|usually|sometimes|really|still|just|also|only|rarely|seldom|generally|normally|actually|even|already|hardly|barely|truly|clearly|certainly|probably|definitely|typically|mostly|constantly|frequently|occasionally)$/;
const EN_INDEF = /^(everyone|everybody|nobody|someone|somebody|anyone|anybody|everything|nothing|something|anything)$/;
const EN_DET_SG = /^(a|an|this|that|every|each|one|another)$/;
const EN_DET_PL = /^(these|those|many|several|both|few|two|three|four|five|six|seven|eight|nine|ten)$/;
const EN_DET_ANY = /^(the|my|your|his|her|our|their|its)$/;
const EN_IRREG_PL = /^(people|children|men|women|police|feet|teeth|mice|geese|cattle|scissors|glasses|pants|jeans|trousers|shorts|clothes|goods|belongings|earnings|savings|stairs|headphones|earphones|pajamas|pyjamas|tongs|binoculars)$/;
// Collective or Latin nouns: both agreements are in use.
const EN_EITHER_NUMBER = /^(data|media|criteria|phenomena|bacteria|staff|crew|team|family|audience|committee|government|jury|couple|faculty|class|band|group|public|army|majority|minority|pair|series|species|means|headquarters|politics|statistics|percent|percentage|total|half|rest|none|all|most|some|any|kind|type|sort|variety|range|lot|lots|number|part|portion|third|quarter|handful|dozen|bit|amount|plenty|bunch|set)$/;
const EN_SUBJ_STOP = /^(to|i|you|he|she|it|we|they|who|which|whose|and|or|but|is|are|was|were|be|been|being|am|has|have|had|do|does|did|will|would|can|could|should|shall|may|might|must|not|there|here|than|as|if|when|because|so|then|me|him|us|them|what|where|how|why)$/;
const EN_PREP = /^(of|in|on|at|from|for|with|near|behind|inside|outside|under|about|between|among|without|across|around|into|over|after|before|during|through|throughout|within|against|towards|toward|via|per|like|including|than|beyond|below|above|along|beside|to)$/;
// Verbs whose past is the same word: "she read", "it cost", "he put" are past, not missing an -s.
const EN_SAME_PAST = /^(read|cut|put|set|hit|let|cost|hurt|quit|shut|spread|beat|bet|cast|burst|fit|split|upset|bid|broadcast|forecast|rid|shed|spit|thrust|wed)$/;
const EN_CLAUSE_OPENER = /^(because|if|when|while|although|though|since|so|but|that|think|thinks|thought|know|knew|said|says|hope|guess|believe|maybe|then|unless|until|once|whether|after|before|and)$/;
const EN_SUBJUNCTIVE = /^(suggest|suggests|suggested|recommend|recommends|recommended|insist|insists|insisted|demand|demands|demanded|require|requires|required|request|requests|requested|essential|important|necessary|vital|crucial|imperative|propose|proposed|proposes|urge|urged|ask|asked|lest)$/;

const isBoundary = (t) => !t || !/[\p{L}\p{N}]/u.test(t.text);

function enThirdPerson(v) {
  if (v === "have") return "has";
  if (/(s|sh|ch|x|z|o)$/.test(v)) return `${v}es`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`;
  return `${v}s`;
}
function enBaseOfThird(w) {
  if (w === "has") return "have";
  const tries = [w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, "")];
  return tries.find((b) => b !== w && EN_VERBS.has(b) && enThirdPerson(b) === w) ?? null;
}

// "sg", "pl" or null for a noun token.
function enNounNumber(tok, frequency) {
  const w = tok.lower;
  if (EN_EITHER_NUMBER.test(w)) return null;
  if (EN_IRREG_PL.test(w)) return "pl";
  if (NOT_PLURAL.test(w) || /(ss|us|is|ics|news)$/.test(w)) return "sg";
  if (/s$/.test(w)) {
    const sing = /ies$/.test(w) ? `${w.slice(0, -3)}y` : /(sh|ch|x|z|ss)es$/.test(w) ? w.slice(0, -2) : w.slice(0, -1);
    return frequency(sing) >= 3 ? "pl" : null;
  }
  return frequency(w) >= 2.5 && !/(ing|ed|ly)$/.test(w) ? "sg" : null;
}

// The subject before the verb at `vi`: { num: "sg" | "pl" | "i" } or null.
// Pronouns, "everyone", or a determiner + noun at the start of a clause, with
// prepositional phrases after the noun ("the price of these shoes").
function enSubject(toks, vi, frequency) {
  let e = vi - 1;
  while (e >= 0 && EN_ADV.test(toks[e].lower)) e--;
  if (e < 0) return null;
  const opens = (s, allowAnd) => {
    const p = toks[s - 1];
    if (toks.slice(Math.max(0, s - 4), s).some((x) => EN_SUBJUNCTIVE.test(x.lower))) return false;
    return isBoundary(p) || (EN_CLAUSE_OPENER.test(p.lower) && (allowAnd || !/^(and|that)$/.test(p.lower)));
  };
  const p = toks[e];
  if (/^(he|she|it)$/.test(p.lower)) return opens(e, p.lower !== "it") ? { num: "sg" } : null;
  if (/^(they|we)$/.test(p.lower)) return opens(e, true) ? { num: "pl" } : null;
  if (p.text === "I") return opens(e, true) ? { num: "i" } : null;
  for (let s = e; s >= Math.max(0, e - 9); s--) {
    const w = toks[s];
    if (!/^[\p{L}-]+$/u.test(w.text)) return null;
    const isDet = EN_DET_SG.test(w.lower) || EN_DET_PL.test(w.lower) || EN_DET_ANY.test(w.lower) || EN_INDEF.test(w.lower);
    if (isDet && opens(s, false)) {
      const words = toks.slice(s + 1, e + 1);
      // Lowercase words only: no names or titles ("The New York office").
      if (words.some((x) => !/^[\p{Ll}-]+$/u.test(x.text) || EN_SUBJ_STOP.test(x.lower))) return null;
      if (EN_INDEF.test(w.lower)) return !words.length || EN_PREP.test(words[0].lower) ? { num: "sg" } : null;
      const firstPrep = words.findIndex((x) => EN_PREP.test(x.lower));
      const nounPart = firstPrep < 0 ? words : words.slice(0, firstPrep);
      const head = nounPart[nounPart.length - 1];
      // "One of my coworkers", "Each of the students": the pronoun is the subject.
      if (!head && /^(one|each|either|neither|every)$/.test(w.lower) && words[0]?.lower === "of") return { num: "sg" };
      if (!head || /(ing|ed|ly)$/.test(head.lower)) return null;
      // A noun phrase: no second determiner, no verb ("the method returns a").
      if (nounPart.some((x, k) => EN_DET_SG.test(x.lower) || EN_DET_ANY.test(x.lower) || EN_DET_PL.test(x.lower) || /(ed|ing|ly)$/.test(x.lower) ||
          /^(below|above|alone|together|again|too|also|first|last|next|here|there|now|today|yesterday|tomorrow|then|ago|later|earlier|before|after)$/.test(x.lower) ||
          (k < nounPart.length - 1 && enBaseOfThird(x.lower)))) return null;
      // The verb follows a noun, not a preposition or a determiner ("a drift in the point").
      if (EN_PREP.test(words.at(-1).lower) || EN_DET_ANY.test(words.at(-1).lower) || EN_DET_SG.test(words.at(-1).lower)) return null;
      // "Ten dollars is too much": an amount is singular.
      if (/^(dollars|euros|pounds|cents|years|hours|minutes|seconds|miles|kilometers|kilometres|percent|days|weeks|months|meters|metres|feet|inches|grams|kilos|liters|litres|gallons)$/.test(head.lower)) return null;
      let num = enNounNumber(head, frequency);
      // "A lot of people", "the majority of students": the noun after "of" decides.
      if (/^(lot|lots|majority|bunch|plenty|half|rest|none|most|some|all|any)$/.test(head.lower) && words[firstPrep]?.lower === "of") {
        const after = words.slice(firstPrep + 1);
        const nextPrep = after.findIndex((x) => EN_PREP.test(x.lower));
        const inner = (nextPrep < 0 ? after : after.slice(0, nextPrep)).at(-1);
        num = inner ? enNounNumber(inner, frequency) : null;
      }
      if (!num) return null;
      if (EN_DET_SG.test(w.lower) && num === "pl" && /^(this|that)$/.test(w.lower)) return null;
      if (EN_DET_PL.test(w.lower) && num === "sg") return null;
      return { num };
    }
    if (EN_SUBJ_STOP.test(w.lower)) return null;
  }
  return null;
}

const EN_PROFESSIONS = /^(engineer|doctor|teacher|nurse|lawyer|architect|student|developer|designer|accountant|artist|actor|actress|writer|journalist|programmer|dentist|pharmacist|scientist|chef|waiter|waitress|consultant|translator|photographer|musician|pilot|mechanic|electrician|plumber|farmer|firefighter|secretary|receptionist|cashier|analyst|researcher|professor|surgeon|veterinarian|psychologist|therapist|economist|entrepreneur|freelancer|intern|banker|baker|butcher|carpenter|lecturer|manager|director|officer|soldier|policeman|salesman|editor|programmer|tutor|volunteer)$/;
const EN_UNCOUNT_STRICT = /^(news|advice|weather|information|furniture|homework|luggage|baggage|equipment|feedback|traffic|knowledge|evidence|machinery|garbage|rubbish|scenery|vocabulary|fun|progress|research|software|jewelry|jewellery|mail|rice|money)$/;
const EN_GERUND_VERBS = /^(enjoy|enjoys|enjoyed|enjoying|avoid|avoids|avoided|avoiding|finish|finished|finishes|consider|considered|considering|considers|mind|minds|minded|keep|keeps|kept|suggest|suggested|suggests|recommend|recommended|recommends|practice|practiced|practise|quit|quits|deny|denied|denies|risk|risked|miss|missed|misses|imagine|imagined|admit|admitted|admits|postpone|postponed|delay|delayed|dislike|disliked|resent|appreciate|appreciated)$/;
const EN_INFINITIVE_VERBS = /^(decide|decided|decides|refuse|refused|refuses|afford|agree|agreed|agrees|promise|promised|promises|expect|expected|manage|managed|manages|fail|failed|fails|offer|offered|offers|threaten|threatened|choose|chose|chosen|intend|intended|pretend|pretended|deserve|deserved|hope|hoped|hopes|plan|planned|plans|want|wanted|wants|wish|wished|learn|learned|learnt|seem|seemed|seems|tend|tended|tends|attempt|attempted|arrange|arranged|demand|demanded|prepare|prepared|struggle|struggled|hesitate|hesitated)$/;
const EN_PAST_TO_BASE = { led: "lead", sent: "send", went: "go", came: "come", saw: "see", gave: "give", took: "take", made: "make", bought: "buy", told: "tell", ate: "eat", wrote: "write", met: "meet", chose: "choose", brought: "bring", thought: "think", found: "find", left: "leave", spoke: "speak", drove: "drive", knew: "know", forgot: "forget", sat: "sit", stood: "stand", paid: "pay", sold: "sell", taught: "teach", caught: "catch", began: "begin", ran: "run", won: "win", lost: "lose", spent: "spend", heard: "hear", felt: "feel", kept: "keep", slept: "sleep", fell: "fall", flew: "fly", grew: "grow", drew: "draw", broke: "break", woke: "wake", wore: "wear", sang: "sing", swam: "swim", did: "do" };
const EN_BASE_TO_PAST = Object.fromEntries(Object.entries(EN_PAST_TO_BASE).map(([p, b]) => [b, p]));
const EN_PAST_MARK = /^(yesterday|ago)$/;
const EN_PROPER_NO_THE = /^(United|Netherlands|Philippines|Bahamas|Maldives|Czech|Dominican|UK|USA|US|EU|UAE)$/;

function enPastOf(v, frequency) {
  if (EN_BASE_TO_PAST[v]) return EN_BASE_TO_PAST[v];
  const regular = /e$/.test(v) ? `${v}d` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ied` : /^[^aeiou]*[aeiou][bdgmnprt]$/.test(v) && v.length <= 4 ? `${v}${v.slice(-1)}ed` : `${v}ed`;
  return EN_VERBS.has(v) && frequency(regular) >= 2.5 ? regular : null;
}

function roundThreeRules(toks, i, paragraph, add, frequency) {
  const t = toks[i];
  const prev = toks[i - 1], next = toks[i + 1], next2 = toks[i + 2];
  const L1 = prev?.lower ?? "", L2 = toks[i - 2]?.lower ?? "", R1 = next?.lower ?? "", R2 = next2?.lower ?? "";
  const atEnd = !next || isPunct(next);
  const fix = (replacement, message, start = t.start, end = t.end, keepCase = false) => add(start, end, replacement, message, { override: true, keepCase });
  const sentence = (() => {
    let s = i, e = i;
    while (s > 0 && s > i - 40 && !/^[.!?]$/.test(toks[s - 1].text)) s--;
    while (e < toks.length - 1 && e < i + 40 && !/^[.!?]$/.test(toks[e + 1].text)) e++;
    return toks.slice(s, e + 1);
  })();
  const inSentence = (re) => sentence.some((x) => re.test(x.lower));
  const clauseStart = isBoundary(prev) || /^(and|but|so|because|if|when|then)$/.test(L1);

  // ---------- Agreement ----------
  if (/^[\p{Ll}']+$/u.test(t.text)) {
    const subject = (/^(is|was|are|were|has|have|do|does|don't|doesn't|isn't|aren't|wasn't|weren't|hasn't|haven't)$/.test(t.lower) ||
      EN_VERBS.has(t.lower) || enBaseOfThird(t.lower)) ? enSubject(toks, i, frequency) : null;
    if (subject) {
      const toSg = { are: "is", were: "was", have: "has", do: "does", "don't": "doesn't", "aren't": "isn't", "weren't": "wasn't", "haven't": "hasn't" };
      const toPl = Object.fromEntries(Object.entries(toSg).map(([a, b]) => [b, a]));
      const verbLike = (atEnd && !EN_NOUN_VERBS.test(t.lower)) || EN_AFTER_VERB.test(R1) || /^\d/.test(R1) || /^\p{Ll}+ing$/u.test(next?.text ?? "");
      // "if he were to win", "I wish she were here": the subjunctive.
      const subjunctive = t.lower === "were" && toks.slice(Math.max(0, i - 4), i).some((x) => /^(if|wish|wished|though|whether|suppose|imagine)$/.test(x.lower));
      if (subject.num === "sg" && toSg[t.lower] && !(t.lower === "do" && !verbLike) && !subjunctive) {
        fix(toSg[t.lower], "The subject is singular: use a singular verb.");
      } else if (subject.num === "pl" && toPl[t.lower]) {
        fix(toPl[t.lower], "The subject is plural: use a plural verb.");
      } else if (subject.num === "i" && /^(is|are)$/.test(t.lower)) {
        fix("am", "With “I”, use “am”.");
      } else if (subject.num === "sg" && EN_VERBS.has(t.lower) && !/^(be|do|have)$/.test(t.lower) && !EN_SAME_PAST.test(t.lower) && verbLike && R1 !== "to" &&
          !(t.lower === "like" && !/^(it|this|that|him|her|them|me|you|us|to|my|your|his|our|their)$/.test(R1)) || subject.num === "sg" && t.lower === "use" && R1 !== "to" && verbLike) {
        const third = enThirdPerson(t.lower);
        if (frequency(third) >= 2.5) fix(third, `The subject is singular: “${third}”.`);
      } else if (subject.num === "pl") {
        const base = enBaseOfThird(t.lower);
        if (base && base !== "have" && (atEnd || EN_AFTER_VERB.test(R1))) fix(base, `The subject is plural: “${base}”.`);
      }
    }
  }
  // "Mathematics are", "Your advice were", "The news were" -> singular
  if (/^(are|were|have)$/.test(t.lower) && /^(mathematics|physics|economics|advice|information|furniture|equipment|homework|luggage|knowledge|feedback|research|traffic|weather)$/.test(L1) &&
      (isBoundary(toks[i - 2]) || /^(the|your|my|his|her|our|their|this|that|some|any|no)$/.test(L2))) {
    fix({ are: "is", were: "was", have: "has" }[t.lower], `“${L1}” is singular.`);
  }
  // "The manager, along with his assistants, are" -> is
  if (/^(are|were|have)$/.test(t.lower) && L1 === ",") {
    const open = toks.slice(Math.max(0, i - 10), i).findIndex((x, k, arr) => x.lower === "," && /^(along|together|as|including|accompanied|in)$/.test(arr[k + 1]?.lower ?? ""));
    const base = Math.max(0, i - 10);
    if (open >= 0) {
      const head = toks[base + open - 1];
      const det = toks[base + open - 2];
      if (head && det && EN_DET_ANY.test(det.lower) && isBoundary(toks[base + open - 3]) && enNounNumber(head, frequency) === "sg") {
        fix({ are: "is", were: "was", have: "has" }[t.lower], `The subject is “${head.lower}”: singular verb.`);
      }
    }
  }
  // "Every student and teacher were" -> was
  if (/^(are|were|have)$/.test(t.lower) && toks[i - 4] && /^(every|each)$/.test(toks[i - 4].lower) && L2 === "and" && isBoundary(toks[i - 5])) {
    fix({ are: "is", were: "was", have: "has" }[t.lower], "“Every … and …” takes a singular verb.");
  }
  // "Where is my glasses?", "Has the guests arrived?", "Does your parents know?"
  if (/^(is|was|has|does|doesn't|isn't|wasn't|hasn't)$/.test(t.lower) && (isBoundary(prev) || /^(where|what|how|why|when|who)$/.test(L1)) &&
      next && /^(the|my|your|his|her|our|their|these|those)$/.test(R1) && next2 && enNounNumber(next2, frequency) === "pl" &&
      !(toks[i + 3] && /^(of|in|on|at)$/.test(toks[i + 3].lower))) {
    fix({ is: "are", was: "were", has: "have", does: "do", "doesn't": "don't", "isn't": "aren't", "wasn't": "weren't", "hasn't": "haven't" }[t.lower], "The noun is plural: plural verb.");
  }
  // "Do she want?" -> Does ; "Why does they" -> do
  if (/^(do|don't)$/.test(t.lower) && /^(he|she)$/.test(R1) && (isBoundary(prev) || /^(where|what|how|why|when|who)$/.test(L1)) && next2 && /^\p{Ll}+$/u.test(next2.text)) {
    fix(t.lower === "do" ? "does" : "doesn't", "With “he” or “she”: “does”.");
  }
  if (/^(does|doesn't)$/.test(t.lower) && /^(they|we|you|i)$/.test(R1) && (isBoundary(prev) || /^(where|what|how|why|when|who)$/.test(L1))) {
    fix(t.lower === "does" ? "do" : "don't", `With “${R1}”: “do”.`);
  }
  // "There's many reasons" -> There are ; "Here's the documents" -> Here are
  if (t.lower === "there's" && /^(many|several|few|lots|plenty|two|three|four|five|numerous|various|some)$/.test(R1) && (R1 !== "some" || enNounNumber(next2 ?? { lower: "" }, frequency) === "pl")) {
    fix("there are", "The noun is plural: “there are”.");
  }
  if (t.lower === "here's" && next && /^(the|my|your|some|these|those|all|our|his|her|their)$/.test(R1) && next2 && enNounNumber(next2, frequency) === "pl" &&
      !(toks[i + 3] && /^(of|for)$/.test(toks[i + 3].lower))) {
    fix("here are", "The noun is plural: “here are”.");
  }
  // "I is" -> am
  if (t.lower === "is" && prev?.text === "I") fix("am", "With “I”, use “am”.");

  // ---------- Articles ----------
  // "I am engineer" -> an engineer
  if (EN_PROFESSIONS.test(t.lower) && /^(am|'m|i'm|is|was|be|become|became|becomes|as)$/.test(L1) && (atEnd || /^(at|in|for|and|with|from|who|of|by|working|since)$/.test(R1)) &&
      !(L1 === "as" && /^(such|well|same)$/.test(L2))) {
    fix(`${/^[aeio]/.test(t.lower) ? "an" : "a"} ${t.text}`, "A job takes an article: “a doctor”, “an engineer”.", t.start, t.end, true);
  }
  // "The life is beautiful" -> Life
  if (isBoundary(prev) && t.lower === "the" && /^(life|love|happiness|nature|humanity|society|friendship|honesty|patience|courage|freedom)$/.test(R1) && /^(is|was|can|isn't|will|makes|gives)$/.test(R2)) {
    fix(next.text[0].toUpperCase() + next.text.slice(1), "In general statements, no “the”: “Life is beautiful”.", t.start, next.end, true);
  }
  // "a good news", "a great advice" -> good news
  if (/^(a|an)$/.test(t.lower) && next) {
    const adj = next && !EN_UNCOUNT_STRICT.test(R1) && /^\p{Ll}+$/u.test(next.text) && frequency(R1) >= 3 && !/^(lot|bit|piece|little|few|great deal)$/.test(R1);
    const noun = EN_UNCOUNT_STRICT.test(R1) ? next : adj && EN_UNCOUNT_STRICT.test(R2) && !/^(piece|bit|lot|word|slice)$/.test(R1) ? next2 : null;
    const after = noun && toks[toks.indexOf(noun) + 1];
    if (noun && (isBoundary(after) || /^(for|from|about|on|in|at|to|during|today|yesterday|tonight|this|and|but|or|so|that|which|i|we|you|he|she|they|it|my|your|is|was|were|are|will|can|could|should|would|has|have|had|with|by)$/.test(after.lower))) {
      fix(paragraph.slice(next.start, noun.end), `“${noun.lower}” is uncountable: no “a”.`, t.start, noun.end, true);
    }
  }
  // "plays the tennis" -> plays tennis
  if (t.lower === "the" && /^(play|plays|played|playing|like|likes|love|loves|watch|watches|watched)$/.test(L1) &&
      /^(tennis|football|soccer|basketball|golf|chess|volleyball|baseball|hockey|rugby|cricket|badminton|poker|handball)$/.test(R1)) {
    fix(next.text, "Sports and games take no article: “play tennis”.", t.start, next.end, true);
  }
  // "been to United States" -> the United States
  if (EN_PROPER_NO_THE.test(t.text) && (t.text !== "United" || /^(States|Kingdom|Nations|Arab)$/.test(next?.text ?? "")) && t.text.length > 3 &&
      /^(to|in|from|visit|visited|visiting|across|of|about|for|left|leave|around|throughout)$/.test(L1)) {
    const end = t.text === "United" ? next.end : t.end;
    fix(`the ${paragraph.slice(t.start, end)}`, "This country name takes “the”.", t.start, end, true);
  }
  // "Moon was very bright" -> The moon
  if (isBoundary(prev) && /^(Moon|Sun|Sky|Internet)$/.test(t.text) && /^(is|was|rises|rose|sets|set|shines|shone|came|comes|looks|looked|will|has|had)$/.test(R1)) {
    fix(`The ${t.lower}`, "“The moon”, “the sun”: they take “the”.", t.start, t.end, true);
  }
  // "He is best player" -> the best
  if (/^(best|worst|biggest|smallest|tallest|oldest|youngest|fastest|strongest|greatest|highest|lowest|richest|smartest|nicest|largest|longest|shortest)$/.test(t.lower) &&
      /^(is|was|are|were|'s|be|become|became|it's|he's|she's|that's)$/.test(L1) && next && /^\p{Ll}+$/u.test(next.text) && frequency(R1) >= 3 &&
      !/(ed|ly)$/.test(R1) && !/^(for|when|to|if|in|at|on|of|and|but|or|with|by|as|than|so|because|left|known|kept|done|used|served|avoided|described|seen|eaten|enjoyed|friends|buds)$/.test(R1) &&
      next2 && /^(on|in|at|of|i|we|you|ever|that|for|this|team|class|school|ever)$/.test(R2)) {
    fix(`the ${t.lower}`, "A superlative takes “the”: “the best player”.", t.start, t.end, true);
  }

  // ---------- Verb forms ----------
  // "I enjoy to swim" -> swimming
  if (t.lower === "to" && EN_GERUND_VERBS.test(L1) && !/^(the|a|an|my|your|his|her|its|our|their|of|this|that)$/.test(L2) && next && /^\p{Ll}+$/u.test(next.text) && EN_VERBS.has(R1) && !/^(the|a|my|your|it|him|her|them|me|us)$/.test(R1)) {
    fix(ingForm(R1), `After “${L1}”, use the -ing form: “${ingForm(R1)}”.`, t.start, next.end);
  }
  // "We decided going" -> to go
  if (EN_INFINITIVE_VERBS.test(L1) && /^\p{Ll}+ing$/u.test(t.text) && !/^(something|nothing|anything|everything|thing|morning|evening|meeting|building|wedding|ceiling|king|ring|spring|string|thing)$/.test(t.lower)) {
    const base = [t.lower.replace(/ing$/, ""), t.lower.replace(/ing$/, "e"), t.lower.replace(/(.)\1ing$/, "$1"), t.lower.replace(/ying$/, "ie")].find((b) => EN_VERBS.has(b) && ingForm(b) === t.lower);
    if (base) fix(`to ${base}`, `After “${L1}”, use “to” + verb: “to ${base}”.`);
  }
  // "made me to clean", "let me to explain" -> made me clean
  if (t.lower === "to" && /^(me|him|her|us|them|you)$/.test(L1) && /^(make|makes|made|making|let|lets|letting|have|had|help|helps|helped|watch|watched|saw|see|heard|hear)$/.test(L2) &&
      next && EN_VERBS.has(R1) && L2 !== "help") {
    fix(next.text, `After “${L2} ${L1}”, no “to”: “${L2} ${L1} ${R1}”.`, t.start, next.end, true);
  }
  // "You must to submit" -> must submit
  if (t.lower === "to" && /^(must|can|could|should|will|would|might|may|shall|cannot|can't|mustn't|shouldn't|won't|wouldn't|couldn't)$/.test(L1) && next && /^\p{Ll}+$/u.test(next.text) && (EN_VERBS.has(R1) || R1 === "be")) {
    fix(next.text, `After “${L1}”, no “to”.`, t.start, next.end, true);
  }
  // "When I was a child, I use to play" -> used to
  if (t.lower === "use" && R1 === "to" && /^(i|we|they|you|he|she)$/.test(L1) && next2 && EN_VERBS.has(R2) && !/^(did|didn't|does|do)$/.test(L2)) {
    fix("used", "The habit in the past is “used to”.");
  }
  // "I'm used to wake up" -> waking
  if (prev?.lower === "to" && L2 === "used" && /^(i'm|we're|you're|they're|he's|she's|am|get|got|getting)$/.test(toks[i - 3]?.lower ?? "") &&
      !/^(is)$/.test(toks[i - 3]?.lower ?? "") && EN_VERBS.has(t.lower) && !/^(be)$/.test(t.lower)) {
    fix(ingForm(t.lower), "“Be used to” is followed by the -ing form.");
  }
  // "I am here since 2019" -> have been ; "I know him since" -> have known
  const sinceAt = toks.slice(i + 1, i + 6).findIndex((x) => x.lower === "since");
  const since = sinceAt >= 0 && toks[i + 1 + sinceAt + 1] && /^(\d{4}|last|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|childhood|then|we|i|he|she|they|high|school|college|the|my|our|this|early|birth)$/.test(toks[i + 1 + sinceAt + 1].lower) &&
    !toks.slice(i + 1, i + 1 + sinceAt).some((x) => isBoundary(x) || /^(been|ever)$/.test(x.lower));
  if (since && /^(am|is|are|'m|'re|i'm|we're|they're|you're|he's|she's)$/.test(t.lower) && (/^(am|is|are)$/.test(t.lower) ? /^(i|we|they|you|he|she)$/.test(L1) : true)) {
    const third = /^(is|he's|she's)$/.test(t.lower);
    const subj = /^(i'm|we're|they're|you're|he's|she's)$/.test(t.lower) ? `${t.text.replace(/'.*$/, "")} ` : "";
    const ing = next && /ing$/.test(R1) ? next : null;
    fix(`${subj}${third ? "has" : "have"} been${ing ? ` ${ing.text}` : ""}`, "With “since”, use the present perfect: “have been”.", t.start, ing ? ing.end : t.end);
  }
  if (since && /^(i|we|they|you)$/.test(L1) && /^(know|live|work|have|love|study|teach|play|own)$/.test(t.lower) && isBoundary(toks[i - 2]) !== false) {
    const pp = { know: "known", live: "lived", work: "worked", have: "had", love: "loved", study: "studied", teach: "taught", play: "played", own: "owned" }[t.lower];
    fix(`have ${pp}`, "With “since”, use the present perfect.");
  }
  // "I am working here for five years" -> have been working
  if (/^(am|are|'m|'re|i'm|we're|they're)$/.test(t.lower) && next && /^(working|living|studying|learning|teaching|waiting|playing)$/.test(R1)) {
    const k = toks.slice(i + 2, i + 6).findIndex((x) => x.lower === "for");
    const after = k >= 0 ? toks.slice(i + 3 + k, i + 6 + k).map((x) => x.lower) : [];
    if (k >= 0 && /^(\d+|two|three|four|five|six|seven|eight|nine|ten|many|several|a|over|almost|nearly)$/.test(after[0] ?? "") && after.some((x) => /^(years|months|year|month|decades)$/.test(x)) &&
        !inSentence(/^(next|will|going|until|tomorrow)$/)) {
      const subj = /^(i'm|we're|they're)$/.test(t.lower) ? `${t.text.replace(/'.*$/, "")} ` : "";
      fix(`${subj}have been ${next.text}`, "For a duration up to now, use “have been …ing”.", t.start, next.end);
    }
  }
  // "If I would have known" -> had known
  if (t.lower === "would" && R1 === "have" && next2 && /(ed|en|wn|ne|ght|ung|ade|aid|ept|ent|ost|old|ound|ood|eard|ew)$/.test(R2) &&
      toks.slice(Math.max(0, i - 3), i).some((x, k, arr) => x.lower === "if" && /^(i|you|we|they|he|she|it)$/.test(arr[k + 1]?.lower ?? ""))) {
    fix(`had ${next2.text}`, "After “if”, use the past perfect: “if I had known”.", t.start, next2.end, true);
  }
  // "If it will rain tomorrow" -> rains
  if (t.lower === "will" && /^(it|he|she|they|we|you|i)$/.test(L1) && L2 === "if" && next && EN_VERBS.has(R1) && R1 !== "be") {
    const verb = /^(it|he|she)$/.test(L1) ? enThirdPerson(R1) : R1;
    fix(verb, "After “if”, use the present, not “will”.", t.start, next.end, true);
  }
  // "Last summer we travel to Portugal", "I send you the file yesterday" -> past
  if (/^(i|we|they|you|he|she)$/.test(L1) && (isBoundary(toks[i - 2]) || /^(summer|year|week|month|night|weekend|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|time|ago|then)$/.test(L2)) &&
      /^\p{Ll}+$/u.test(t.text) && (EN_VERBS.has(t.lower)) && (inSentence(EN_PAST_MARK) || sentence.some((x, k) => x.lower === "last" && /^(summer|year|week|month|night|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|time|winter|spring|autumn|fall)$/.test(sentence[k + 1]?.lower ?? ""))) &&
      !inSentence(/^(will|would|can|could|usually|always|often|every|tomorrow|next|since|ago,|should|must)$/)) {
    const past = enPastOf(t.lower, frequency);
    if (past) fix(past, `A past event: the simple past “${past}”.`);
  }
  // "Can you sent me", "Let's met", "to chose" -> base form
  if (EN_PAST_TO_BASE[t.lower] && t.lower !== "did" && ((/^(you|i|we|they|he|she)$/.test(L1) && /^(can|could|will|would|should|shall|may|might|must|did|didn't|do|does|don't|doesn't)$/.test(L2) && isBoundary(toks[i - 3])) ||
      /^(let's|to|can't|cannot|couldn't|won't|wouldn't|shouldn't|didn't|don't|doesn't)$/.test(L1)) &&
      !(L1 === "to" && /^(used|go|went|back|come|came|close|next|due|according)$/.test(L2)) && !/^(left|found|felt|lost|spent|kept)$/.test(t.lower)) {
    fix(EN_PAST_TO_BASE[t.lower], `After “${L1}”, the base form: “${EN_PAST_TO_BASE[t.lower]}”.`);
  }
  // "I have 25 years old" -> am
  if (/^(have|has|'ve)$/.test(t.lower) && next && /^(\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)$/.test(R1) &&
      R2 === "years" && toks[i + 3]?.lower === "old") {
    fix({ i: "am", he: "is", she: "is", it: "is" }[L1] ?? "are", "Age uses “be”: “I am 25 years old”.");
  }
  // "He said me" -> told me
  if (/^(said|say|says|saying)$/.test(t.lower) && /^(me|him|her|us|them)$/.test(R1) && next2 && (/^(that|he|she|i|we|they|it|you|the|to|about|this|what|how)$/.test(R2) || isBoundary(next2))) {
    const tell = { said: "told", say: "tell", says: "tells", saying: "telling" }[t.lower];
    fix(`${tell} ${next.text}`, `One “says” something, but “tells” someone: “${tell} ${R1}”.`, t.start, next.end, true);
  }
  // "enough good" -> good enough
  if (t.lower === "enough" && next && /^(good|big|old|fast|strong|tall|smart|warm|cold|high|long|clear|close|safe|clean|cheap|large|small|serious|quick|loud|ready|rich|wide|deep|hot|early|late|mature|experienced|qualified)$/.test(R1) &&
      (atEnd || isBoundary(next2) || /^(to|for)$/.test(R2))) {
    fix(`${next.text} enough`, "“Enough” comes after the adjective: “good enough”.", t.start, next.end, true);
  }
  // "It's the more beautiful city I've seen" -> most
  if (t.lower === "more" && L1 === "the" && next && /^\p{Ll}+$/u.test(next.text) && next2 && /^\p{Ll}+$/u.test(next2.text) &&
      toks[i + 3] && (/^(i|i've|we've|you've|ever|we|you)$/.test(toks[i + 3].lower) || toks[i + 3].lower === "in" && toks[i + 4]?.lower === "the" && /^(world|country|city|town|class|team|family|school|universe)$/.test(toks[i + 5]?.lower ?? "")) && !/^(the|than|you|i|we|he|she|they)$/.test(R1) && R2 !== "the") {
    fix("most", "Among all: the superlative “the most”.");
  }
  // "How long time" -> How long
  if (t.lower === "how" && R1 === "long" && R2 === "time" && !/^(ago)$/.test(toks[i + 3]?.lower ?? "")) {
    fix(paragraph.slice(t.start, next.end), "“How long” already means “how much time”.", t.start, next2.end, true);
  }
  // "a lot of works to do" -> work
  if (t.lower === "works" && /^(of|much)$/.test(L1) && R1 === "to" && R2 === "do") fix("work", "“Work” (tasks) is uncountable.");
  // "going to the home" -> going home
  if (t.lower === "the" && R1 === "home" && /^(to)$/.test(L1) && /^(go|going|went|goes|come|coming|came|get|got|getting|drive|walk|run|head|heading|back|return|returned)$/.test(L2) && (!next2 || isPunct(next2) || /^(now|tonight|soon|early|late|after|before|and)$/.test(R2))) {
    fix("home", "“Go home”: no “to the”.", toks[i - 1].start, next.end);
  }
  // "First we eat, than we watch", "and than watched" -> then
  if (t.lower === "than" && (L1 === "," || L1 === "and" || isBoundary(prev)) &&
      !toks.slice(Math.max(0, i - 6), i).some((x) => /^(more|less|rather|other|better|worse|fewer|different)$/.test(x.lower) || /er$/.test(x.lower) && frequency(x.lower) >= 3 && /^(bigger|smaller|older|younger|faster|slower|higher|lower|longer|shorter|easier|harder|cheaper|larger|greater|later|earlier|sooner)$/.test(x.lower)) &&
      next && /^(we|i|you|they|he|she|it|the|go|went|watched|ate|left|came|come|start|started|after|later)$/.test(R1)) {
    fix("then", "In a sequence of events: “then”.");
  }
  // "new close for work" -> clothes
  if (t.lower === "close" && /^(new|buy|bought|wash|washing|washed|clean|dirty|wear|wearing|winter|summer|baby|warm|old|my|your|his|her|their|our)$/.test(L1) &&
      (atEnd || /^(for|to|and|on|in|at|from|are|were|off)$/.test(R1)) && !(L1 === "my" && /^(to)$/.test(R1)) && !/^(my|your|his|her|their|our)$/.test(L1)) {
    fix("clothes", "Things you wear are “clothes”.");
  }
  // "I'll except your offer", "I didn't except him to call"
  if (t.lower === "except" && /^(i'll|we'll|you'll|they'll|he'll|she'll|i'd|we'd|happy|glad|pleased)$/.test(L1) && next && /^(your|the|this|that|his|her|their|our|it|my)$/.test(R1)) {
    fix("accept", "Did you mean the verb “accept” (to agree to take)?");
  }
  if (t.lower === "except" && /^(i|you|we|they|didn't|don't|doesn't|never|not|wouldn't)$/.test(L1) && /^(him|her|them|you|me|it|us|that|this|the)$/.test(R1) && next2 && (R2 === "to" || /^(that|this)$/.test(R1))) {
    fix("expect", "Did you mean “expect” (think it will happen)?");
  }
  // ", expect in August" -> except
  if (t.lower === "expect" && L1 === "," && /^(in|on|at|during|for|when|maybe|perhaps|weekends|sundays|mondays|holidays)$/.test(R1)) fix("except", "Did you mean “except” (apart from)?");
  // "He's knew to the team" -> new
  if (t.lower === "knew" && /^(he's|she's|it's|i'm|you're|we're|they're|is|am|are|was|were|be|brand|something|completely|totally|relatively|fairly|very|so)$/.test(L1)) fix("new", "Did you mean “new” (not old)?");
  // "I'd rather stay hear." -> here
  if (t.lower === "hear" && /^(stay|live|wait|sit|stand|work|stop|stays|lives|waiting|here|be|been|come|came|right|over)$/.test(L1) && (atEnd || /^(and|for|with|until|tonight|today|now|alone|forever)$/.test(R1))) {
    fix("here", "Did you mean “here” (this place)?");
  }
  // "a long weak at work" -> week
  if (t.lower === "weak" && (/^(long|busy|whole|entire|hard|crazy|great|good|bad|tough|rough|short)$/.test(L1) && /^(at|of|and|for|in|but|so|i|we)$/.test(R1) || atEnd && /^(long|busy|crazy|tough|rough)$/.test(L1))) {
    fix("week", "Seven days make a “week”.");
  }
  // "I'm going to sea a movie" -> see
  if (t.lower === "sea" && /^(to|will|can|could|i|we|you|they|let's|go|come|gonna|wanna|would|should|must|didn't|don't|can't)$/.test(L1) &&
      next && /^(a|the|you|him|her|it|them|what|if|how|me|us|your|my|that|this|why|who|where)$/.test(R1) && !(L1 === "to" && /^(go|went|going|sail|sailed|swim|out|back|fall|fell|head|headed)$/.test(L2))) {
    fix("see", "Did you mean the verb “see”?");
  }
  // "a grate party", "That's grate!" -> great
  if (t.lower === "grate" && ((/^(a|so|very|really|such|pretty|quite|was|is|it's|that's|sounds|looks|feel|feels|felt|had|have)$/.test(L1) && (atEnd || /^(party|idea|time|job|day|place|movie|team|game|news|show|book|trip|night|weekend|food|friend|deal|opportunity|choice|view|question|work|way|and|to|for|!)$/.test(R1))) &&
      !/^(cheese|it|the|carrots|onions)$/.test(R1) && !/^(fire|iron|metal)$/.test(L1))) {
    fix("great", "Did you mean “great”?");
  }
  // "text you latter" -> later
  if (t.lower === "latter" && !/^(the|this|these|in|of|a)$/.test(L1) && (atEnd || /^(today|tonight|on|this|in|than|when|and|then|after)$/.test(R1))) {
    fix("later", "Did you mean “later” (afterwards)? “The latter” means the second one.");
  }
  // "witch is annoying", "witch one" -> which
  if (t.lower === "witch" && !/^(a|the|wicked|good|bad|old|evil|her|his|my|your|white|sea|green|little|young)$/.test(L1) &&
      (L1 === "," || /^(one|is|was|of|i|we|you|they|he|she|means|makes|made|has|have|would|will|can|could|should|it|way|ones|to|car|book|color|colour)$/.test(R1))) {
    fix("which", "Did you mean “which”?");
  }
  // "barley awake" -> barely
  if (t.lower === "barley" && (/^(was|is|were|are|am|be|i|could|can|he|she|they|we|you|had|have|'m|still|just|i'm|it's|it|we're|they're)$/.test(L1) ||
      /^(awake|alive|know|knew|slept|sleep|eat|ate|enough|there|able|any|touched|made|hear|heard|see|saw|noticed|passed|managed|recognized|visible|audible|speak|spoke|moved|move|breathing|standing|walk|remember|remembered|survived|finished|started|begun|legal|recognizable|keep|kept)$/.test(R1))) {
    fix("barely", "Did you mean “barely” (hardly)?");
  }
  // "a loyal costumer" -> customer
  if (/^costumers?$/.test(t.lower) && (/^(loyal|regular|new|happy|satisfied|valued|potential|repeat|unhappy|angry|existing|our|every|each|dear)$/.test(L1) || /^(service|support|satisfaction|care|feedback|reviews?|base|experience)$/.test(R1))) {
    fix(t.lower.endsWith("s") ? "customers" : "customer", "A buyer is a “customer”.");
  }
  // "as a manger" -> manager
  if (/^mangers?$/.test(t.lower) && !inSentence(/^(jesus|baby|christmas|nativity|hay|stable|ox|donkey|cattle|lying|lay)$/) &&
      (/^(as|store|project|general|sales|account|office|hiring|marketing|product|team|new|regional|branch|assistant|operations|our|my|your|his|her|their)$/.test(L1) || inSentence(/^(department|team|office|company|work|job|meeting|boss|project|staff|employees|hired|promoted)$/))) {
    fix(t.lower.endsWith("s") ? "managers" : "manager", "Did you mean “manager”?");
  }
  // "the bets pizza in town" -> best
  if (t.lower === "bets" && /^(the|my|your|our|their|his|her)$/.test(L1) && next && /^\p{Ll}+$/u.test(next.text) && frequency(R1) >= 3 &&
      !/^(on|are|were|is|was|placed|and|of|for|have|had|off|were|will|made|from|i|we|you)$/.test(R1) && !/(ed|ing)$/.test(R1)) {
    fix("best", "Did you mean “best”?");
  }
  // "Can you sent me", handled above; "I send you the file yesterday" by the past rule.
  // "The were very happy" -> They
  if (t.lower === "the" && isBoundary(prev) && /^(were|are|have|had|will|would|can|could|should|did|do|don't|didn't|weren't|aren't|haven't|said|told)$/.test(R1)) {
    fix("they", "Did you mean “they”?");
  }
  // "I think hat we should" -> that
  if (t.lower === "hat" && /^(think|thought|say|said|know|knew|hope|believe|sure|so|mean|feel|felt|realize|realized|guess|assume|is|was|seems|glad|sad|happy|sorry|remember|forgot|told|tell|me|you|him|her|us|them|now|fact)$/.test(L1) &&
      /^(we|i|you|he|she|they|it|the|this|there|my|your|our|his|her|their|everyone|nobody|someone)$/.test(R1)) {
    fix("that", "Did you mean “that”?");
  }
  // "Where were you went I called" -> when
  if (t.lower === "went" && /^(i|you|he|she|we|they)$/.test(R1) && next2 && (/ed$/.test(R2) || EN_PAST_TO_BASE[R2] || /^(was|were|got|came|left|arrived)$/.test(R2)) &&
      (!/^(i|you|he|she|we|they|it)$/.test(L1) || /^(were|was|are|is)$/.test(L2))) {
    fix("when", "Did you mean “when”?");
  }
  // "a nice women" -> woman ; "Three woman" -> women
  if (t.lower === "women" && /^(a|an|one|this|that|every|each|another)$/.test(L1) || t.lower === "women" && /^(a|an|one|this|that|every|each|another)$/.test(L2) && /^\p{Ll}+$/u.test(prev?.text ?? "") && frequency(L1) >= 3 && !/^(of|men|young)$/.test(L1)) {
    if (!/^'?s$/.test(R1)) fix("woman", "One person: “woman”.");
  }
  if (t.lower === "woman" && /^(two|three|four|five|six|seven|eight|nine|ten|many|several|few|these|those|some|other|both|\d+)$/.test(L1) && !/^('s|s)$/.test(R1)) {
    fix("women", "More than one: “women”.");
  }
  if (t.lower === "men" && /^(a|an|one|this|every|each|another)$/.test(L1) && !/^('s|s)$/.test(R1)) fix("man", "One person: “man”.");
  // "upset abut it" -> about
  if (t.lower === "abut" && (/^(upset|worried|happy|sad|sorry|excited|nervous|talk|talking|talked|think|thinking|thought|know|knew|care|cares|cared|forget|forgot|asked|ask|told|tell|said|heard|hear|read|learn|learned|nothing|something|all|more|anything|everything|curious|serious|wrong|right|sure|complain|complained|mad|angry|crazy|concerned|thinking|dream|dreamed|feel|felt|joke|joking|story|questions|question|is|was|it's|what's)$/.test(L1) ||
      /^(it|this|that|the|my|your|his|her|them|me|you|what|how|us|our|their|an|a)$/.test(R1) && /^(talk|think|care|know|worry|forget|ask|tell|hear|read|learn|is|was)/.test(L1))) {
    fix("about", "Did you mean “about”?");
  }
  // "Please let me now", "I don't now what" -> know ; "I know have three kids" -> now
  if (t.lower === "now" && ((/^(me|us)$/.test(L1) && /^(let|lets)$/.test(L2)) || /^(don't|didn't|doesn't|do|to|you|i|we|they|dont|didnt)$/.test(L1) && !/^(by|on|until|for|and|is|was|that's|it's|right)$/.test(R1)) &&
      next && /^(what|how|if|why|where|who|that|the|anything|about|whether|when|which|you|him|her|them|it|this|everything|something)$/.test(R1)) {
    fix("know", "Did you mean “know” (be aware)?");
  }
  if (t.lower === "know" && /^(i|we|they|you|he|she)$/.test(L1) && /^(have|has|am|is|are|live|lives|work|works|own|owns|go|need)$/.test(R1) && isBoundary(toks[i - 2])) {
    fix("now", "Did you mean “now” (at this time)?");
  }
  // "I'm doing find" -> fine ; "Did you fine your keys?" -> find
  if (t.lower === "find" && /^(doing|feel|feeling|feels|felt|look|looks|looked|be|is|am|'m|it's|that's|i'm|everything's|all|perfectly|totally|just|seems|sounds)$/.test(L1) && (atEnd || /^(thanks|thank|now|today|and|but|with)$/.test(R1))) {
    fix("fine", "Did you mean “fine”?");
  }
  if (t.lower === "fine" && /^(did|didn't|can't|cannot|couldn't|can|could|you|we|i|to)$/.test(L1) && next && /^(your|my|his|her|out|it|them|anything|something|our|their|any|a|the)$/.test(R1) &&
      !(L1 === "to" && !/^(your|my|out|it|anything|something)$/.test(R1)) && !/^(they)$/.test(L1) && (L1 !== "you" || /^(did|can|could|didn't|can't|will|would|to)$/.test(L2))) {
    fix("find", "Did you mean “find”?");
  }
  // "Where you at the party last night?" -> Were
  if (t.lower === "where" && isBoundary(prev) && /^(you|they|we)$/.test(R1) && /^(at|in|there|here|home|ready|sure|able|happy|late|asleep|awake|busy|ok|okay|alone|really|still|also|both|all|going|coming|planning|trying|thinking|talking|aware|serious|out|the)$/.test(R2) &&
      !(R2 === "at" && (isPunct(toks[i + 3]) || !toks[i + 3]))) {
    fix("were", "Did you mean “were”?");
  }
  // "wash my cloths" -> clothes
  if (t.lower === "cloths" && /^(my|your|his|her|our|their|new|dirty|wear|wearing|fold|iron|wash|washed|winter|summer|baby|warm|clean)$/.test(L1) && !/^(and)$/.test(R1)) fix("clothes", "Things you wear are “clothes”.");
  // "We had diner at" -> dinner
  if (/^diner$/.test(t.lower) && /^(had|have|having|for|after|before|during|eat|ate|make|cook|cooking|skip|skipped|over|serve|served|made|tonight's|our|until|at)$/.test(L1) && !(L1 === "at" && R1 === "on")) {
    fix("dinner", "The evening meal is “dinner”.");
  }
  // "an even batter dancer" -> better
  if (t.lower === "batter" && (R1 === "than" || /^(even|much|far|way|no|any|lot|getting|get|feel|feeling|feels|felt|sound|sounds|looks|look|is|was|it's|that's|much|so)$/.test(L1) && !/^(for|of|is|mix|mixture)$/.test(R1) && L1 !== "the")) {
    fix("better", "Did you mean “better”?");
  }
  // "on the tale" -> table
  if (t.lower === "tale" && L1 === "the" && /^(on|under|at|off|from|around|across|onto)$/.test(L2)) fix("table", "Did you mean “table”?");
  // "He quite his job" -> quit
  if (t.lower === "quite" && /^(i|he|she|we|they|you|to|will|just|finally|eventually|never)$/.test(L1) && /^(his|her|my|their|our|your|smoking|drinking|school|work|job|it|college)$/.test(R1)) {
    fix("quit", "Did you mean “quit” (stop, leave)?");
  }
  // "I hope you a feeling better" -> are
  if (t.lower === "a" && /^(you|we|they)$/.test(L1) && next && /^\p{Ll}+ing$/u.test(next.text) && !/^(thing|king|ring|wing|building|wedding|meeting|feeling|morning|evening|painting|clothing|ceiling|darling|sibling|string|spring|swing|sting|thing)$/.test(R1) || t.lower === "a" && /^(you|we|they)$/.test(L1) && R1 === "feeling" && /^(better|good|ok|okay|well|great|fine|sick|tired)$/.test(R2)) {
    fix("are", "Did you mean “are”?");
  }
  // "I'd love", "Ill call you back" -> I'd, I'll
  if (t.text === "Id" && /^(love|like|rather|be|say|have|go|prefer|better|recommend|appreciate|suggest|never|probably|been|really|also|just|do|need)$/.test(R1)) fix("I'd", "Apostrophe missing: “I'd”.", t.start, t.end, true);
  if ((t.text === "Ill" || t.text === "ill" && clauseStart && isBoundary(prev)) && /^(call|be|see|send|get|do|let|text|try|have|take|go|check|bring|make|come|tell|talk|help|pick|meet|need|ask|look|wait|never|probably|just|definitely|email|write|buy|pay|give|keep|think)$/.test(R1)) {
    fix("I'll", "Apostrophe missing: “I'll”.", t.start, t.end, true);
  }
  // "Let's meetup" -> meet up ; "any thing" -> anything
  if (t.lower === "meetup" && /^(let's|lets|to|can|could|we|should|will|i|you|they|must)$/.test(L1)) fix("meet up", "The verb is two words: “meet up”.");
  if (t.lower === "any" && R1 === "thing" && (isBoundary(next2) || /^(else|you|i|we|for|to|about|that|from)$/.test(R2))) fix("anything", "One word: “anything”.", t.start, next.end);
  // "on Monday Morning", "to the Beach", "My Sister" -> lowercase
  if (/^\p{Lu}\p{Ll}+$/u.test(t.text) && /^(morning|afternoon|evening|night|beach|park|sister|brother|friend|school|university|college|office|hospital|church|city|country|summer|winter|spring|autumn|weekend|birthday|dinner|lunch|breakfast|movie|family|house|home|car|dog|cat|teacher|boss|team|company|store|restaurant|gym|pool|lake|river|mountain|ocean|airport|station|hotel|street|town|village|garden|kitchen|cousin|uncle|aunt|neighbor|neighbour|wife|husband|son|daughter|baby|kids|children|weather|homework|exam|test|class|meeting|party|vacation|holiday|trip|money|job|work|food|coffee|tea|beer|wine)$/.test(t.lower) &&
      prev && !isBoundary(prev) && !/^\p{Lu}/u.test(next?.text ?? "") && !/^(of|de)$/.test(R1) &&
      !toks.slice(Math.max(0, i - 3), i - 1).some((x, k, arr) => /^\p{Lu}/u.test(x.text) && !isBoundary(toks[Math.max(0, i - 3) + k - 1]) && !/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(x.lower)) && !/["“'‘]\s*$/.test(paragraph.slice(Math.max(0, t.start - 2), t.start))) {
    // Lowercase word before it ("to the Beach"), or a day ("Monday Morning"),
    // or the sentence's first word ("My Sister"): not part of a name.
    const dayBefore = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(L1);
    const firstWord = isBoundary(toks[i - 2]) && /^(my|your|our|his|her|their|the|a|this|next|last|every)$/.test(L1);
    if (/^\p{Ll}/u.test(prev.text) && /^(to|at|in|on|from|my|your|our|his|her|their|this|next|last|every|a|the|and|with|for)$/.test(L1) || dayBefore || firstWord) {
      fix(t.lower, "A common noun takes no capital letter here.", t.start, t.end, true);
    }
  }
  // "layed on the beach" -> lay ; "She payed" -> paid ; "He brang" -> brought
  if (t.lower === "layed") fix(/^(on|in|down|there|back|around|awake|still|low|flat)$/.test(R1) ? "lay" : "laid", "The past of “lie” is “lay”; of “lay”, “laid”.");
  if (t.lower === "payed" && R1 !== "out") fix("paid", "The past of “pay” is “paid”.");
  if (t.lower === "brang" || t.lower === "brung") fix("brought", "The past of “bring” is “brought”.");
  if (/^(wendesday|wenesday|wedensday|wedsday)$/.test(t.lower)) fix("Wednesday", "Did you mean “Wednesday”?", t.start, t.end, true);

  // ---------- Words confused with a neighbour ----------
  if (t.lower === "principle" && R1 === "of" && /^(the|our|my|your|this|a)$/.test(R2) && /^(school|college|academy|high|university)$/.test(toks[i + 3]?.lower ?? "")) fix("principal", "The head of a school is the “principal”.");
  if (t.lower === "principal" && (L1 === "in" && isBoundary(toks[i - 2]) || L1 === "of" && /^(matter|question)$/.test(toks[i - 2]?.lower ?? ""))) fix("principle", "A rule or belief is a “principle”.");
  if (t.lower === "stationery" && /^(remain|remained|remains|stay|stayed|stays|completely|perfectly|is|was|be|kept|keep|remaining|staying)$/.test(L1) && !/^(store|shop|supplies|set|items|section|cupboard)$/.test(R1)) {
    fix("stationary", "Not moving: “stationary”. Paper and pens are “stationery”.");
  }
  if (/^compliments?$/.test(t.lower) && /^(perfect|ideal|natural|nice|great|good|excellent|wonderful|lovely)$/.test(L1) && R1 === "to" && /^(the|a|any|your|each|this|our|my|its)$/.test(R2) &&
      !/^(chef|cook|you|your|my|her|his|staff|team|host)$/.test(toks[i + 3]?.lower ?? "") && L1 !== "nice") {
    fix(t.lower.endsWith("s") ? "complements" : "complement", "Something that goes well with another is a “complement”.");
  }
  if (t.lower === "passed" && /^(rode|ran|walked|drove|go|walk|run|drive|ride|flew|biked|sped|raced|hurried|rushed|went|cycled|jogged|strolled|sailed|swam)$/.test(L1) && /^(the|it|him|her|me|us|them|my|your|our|a|an|this|that)$/.test(R1)) {
    fix("past", "Moving beyond: “past”.");
  }
  if (t.lower === "all" && R1 === "ready" && (/^(have|has|had|'ve|i've|we've|you've|they've|he's|she's)$/.test(L1) || next2 && /^\p{Ll}+(ed|en)$/u.test(next2.text))) {
    fix("already", "Before this moment: “already”.", t.start, next.end);
  }
  if (t.lower === "sight" && /^(to|will|can|must|should|please|always|properly|correctly)$/.test(L1) &&
      (/^(sources|source|references|reference|examples|studies|evidence|papers|articles|quotes|authors|three|two|four|five|several|your|all)$/.test(R1) || /^(the|a)$/.test(R1) && /^(source|sources|study|article|paper|author|reference)$/.test(R2))) {
    fix("cite", "To quote a source is to “cite” it.");
  }
  if (t.lower === "complementary" && /^(breakfast|drinks|drink|coffee|tickets|ticket|wifi|wi-fi|parking|shuttle|access|meal|meals|upgrade|snacks|copy|samples|champagne|dessert|room|bottle|beverages|water|tea)$/.test(R1)) {
    fix("complimentary", "Free of charge: “complimentary”.");
  }
  if (t.lower === "board" && /^(so|was|were|am|'m|get|got|getting|feel|feeling|bit|really|very|too|i'm|being|totally|completely|extremely|super|kinda|already|become|became)$/.test(L1) &&
      (atEnd || /^(during|with|in|at|by|and|that|because|so|out|stiff)$/.test(R1))) {
    fix("bored", "Did you mean “bored” (not interested)?");
  }
  if (t.lower === "break" && /^(pedal|pedals|pads|pad|fluid|lights|light|system|line|lever|discs|disc|cable|cables|caliper)$/.test(R1) && !/^(lunch|coffee|a)$/.test(L1)) {
    fix("brake", "The pedal that slows a car is the “brake”.");
  }
  if (t.lower === "dessert" && (/^(crossed|crossing|cross|across|through|sahara|sandy|vast|arid|scorching|gobi|mojave|hot)$/.test(L1) || L1 === "the" && /^(crossed|crossing|cross|across|through|into|in)$/.test(L2) && /^(by|on|in|for|at)$/.test(R1))) {
    fix("desert", "Sand and dunes: a “desert”.");
  }
  if (t.lower === "patients" && (/^(lose|lost|losing|test|testing|tried|try|trying|of|no|little|more|much|enough|great|infinite|endless|requires|require|needs|need|takes|take|have|has|had|show|shows|showed)$/.test(L1) && /^(with|for|and|to)$/.test(R1) && /^(her|his|my|your|their|our|me|him|them|us|you|kids|children|the|it|this)$/.test(R2) || L1 === "of" && L2 === "lot" && /^(with|for)$/.test(R1) && /^(her|his|my|your|their|our|me|him|them|us|you|kids|children)$/.test(R2))) {
    fix("patience", "Calm waiting is “patience”.");
  }
  if (t.lower === "waste" && /^(her|his|my|your|their|the)$/.test(L1) && /^(around|round|at|on|to|her|his)$/.test(L2) && inSentence(/^(belt|dress|pants|trousers|apron|tied|wrapped|skirt|jeans|hips|tight)$/)) fix("waist", "The middle of the body is the “waist”.");
  if (t.lower === "thrown" && L1 === "the" && (atEnd || /^(of|and|in|room|for)$/.test(R1)) && toks.slice(Math.max(0, i - 4), i).some((x) => /^(heir|ascend|ascended|claim|claimed|to|on|sat|king|queen|throne)$/.test(x.lower))) {
    fix("throne", "A king's seat is a “throne”.");
  }
  if (t.lower === "capitol" && t.text === "capitol" && R1 === "of" && /^\p{Lu}/u.test(next2?.text ?? "")) fix("capital", "The main city of a country is its “capital”.");
  if (t.lower === "angle" && /^(guardian|little|fallen|snow|like)$/.test(L1)) fix("angel", "A heavenly being is an “angel”.");
  if (t.lower === "angle" && L1 === "an" && L2 === "like") fix("angel", "A heavenly being is an “angel”.");
  if (t.lower === "angel" && (/^(right|acute|obtuse|wide|different|steep|sharp|camera|measure|measured|the)$/.test(L1) && R1 === "of" && /^(the|a|this|that|each|incidence|elevation)$/.test(R2) || /^(right|acute|obtuse|wide|camera)$/.test(L1))) {
    fix("angle", "Geometry: an “angle”.");
  }
  if (t.lower === "costume" && /^(loyal|regular|valued|satisfied)$/.test(L1)) fix("customer", "A buyer is a “customer”.");
}

// ---------- Round 4 ----------

// Adjectives that a "be" + base-verb check must not take for verbs ("was open").
const EN_ADJ_VERBS = /^(open|close|clean|free|clear|complete|correct|perfect|separate|live|right|wrong|dry|empty|slow|fast|warm|cool|calm|quiet|ready|smooth|light|dark|busy|like|worth|due|present|fit|content|sound|still|well|level|own|even|lower|double|mean|secure|direct|equal|total|round|fine|last|close|cut|set|put|hit|let|shut|cost|hurt|quit|read|spread|bet|cast|burst|split|upset|broadcast|forecast|lead|run|come|become|overcome)$/;
const EN_TIME_CLAUSE = /^(when|before|after|until|once|as soon as|while|if)$/;

function enParticipleOf(v, frequency) {
  if (EN_PAST_TO_PARTICIPLE[EN_BASE_TO_PAST[v]]) return EN_PAST_TO_PARTICIPLE[EN_BASE_TO_PAST[v]];
  const past = enPastOf(v, frequency);
  return past && /ed$/.test(past) ? past : null;
}

function roundFourRules(toks, i, paragraph, add, frequency) {
  const t = toks[i];
  const prev = toks[i - 1], next = toks[i + 1], next2 = toks[i + 2];
  const L1 = prev?.lower ?? "", L2 = toks[i - 2]?.lower ?? "", R1 = next?.lower ?? "", R2 = next2?.lower ?? "";
  const atEnd = !next || isPunct(next);
  const fix = (replacement, message, start = t.start, end = t.end, keepCase = false) => add(start, end, replacement, message, { override: true, keepCase });
  const lowerWord = (x) => !!x && /^\p{Ll}+$/u.test(x.text);

  // "My laptop and my phone needs charging", "My sister and her husband owns" -> plural
  if (prev && toks[i - 2] && toks[i - 3] && toks[i - 4] && toks[i - 5] && /^(my|your|his|her|our|their|the)$/.test(toks[i - 5].lower) &&
      lowerWord(toks[i - 4]) && toks[i - 3].lower === "and" && /^(my|your|his|her|our|their|the)$/.test(L2) && lowerWord(prev) &&
      (!toks[i - 6] || isBoundary(toks[i - 6])) && /^\p{Ll}+s$/u.test(t.text)) {
    const base = t.lower === "has" ? "have" : t.lower === "is" ? "are" : t.lower === "was" ? "were" : t.lower === "does" ? "do" : enBaseOfThird(t.lower);
    if (base && enNounNumber(prev, frequency) === "sg" && enNounNumber(toks[i - 4], frequency) === "sg") fix(base, "Two subjects joined by “and”: plural verb.");
  }
  // "Neither the printer nor the scanner work" -> works ; "Either the manager or her assistants is" -> are
  if (prev && toks[i - 2] && /^(nor|or)$/.test(toks[i - 3]?.lower ?? "") && /^(the|my|your|his|her|our|their|a|an)$/.test(L2) && lowerWord(prev) &&
      toks.slice(Math.max(0, i - 8), i - 3).some((x) => /^(neither|either)$/.test(x.lower))) {
    const num = enNounNumber(prev, frequency);
    if (num === "sg" && EN_VERBS.has(t.lower) && !/^(be|do|have)$/.test(t.lower)) fix(enThirdPerson(t.lower), "With “neither … nor”, the verb agrees with the nearest subject.");
    if (num === "pl" && /^(is|was|has|does)$/.test(t.lower)) fix({ is: "are", was: "were", has: "have", does: "do" }[t.lower], "With “either … or”, the verb agrees with the nearest subject.");
  }
  // "What time do the store open?" -> does
  if (t.lower === "do" && /^(what|when|where|why|how|time)$/.test(L1) && /^(the|my|your|his|her|our|this|that)$/.test(R1) && next2 && enNounNumber(next2, frequency) === "sg" &&
      toks[i + 3] && EN_VERBS.has(toks[i + 3].lower)) {
    fix("does", "The subject is singular: “does”.");
  }
  // "Here are the report" -> Here is
  if (/^(here|there)$/.test(L1) && t.lower === "are" && /^(the|my|your|this|that|a|an|our|his|her)$/.test(R1) && next2 && enNounNumber(next2, frequency) === "sg" &&
      !(toks[i + 3] && /^(and|of)$/.test(toks[i + 3].lower))) {
    fix("is", "The noun is singular: “is”.");
  }
  // "The package was deliver yesterday", "The meeting was cancel" -> participle
  if (/^(was|were|is|are|been|be|being|get|got)$/.test(L1) && EN_VERBS.has(t.lower) && !EN_ADJ_VERBS.test(t.lower) && !/^(able|going|about|supposed)$/.test(t.lower) &&
      (atEnd || /^(by|yesterday|today|last|because|on|at|in|for|and|before|after|twice|again|this|early|late)$/.test(R1)) && !/^(to)$/.test(R1)) {
    const pp = enParticipleOf(t.lower, frequency);
    if (pp && frequency(pp) >= 2.5) fix(pp, `Passive voice: the past participle “${pp}”.`);
  }
  // "We should finished the draft" -> finish
  if (/^(should|could|would|will|can|must|might|may|shall|cannot|can't|won't|wouldn't|shouldn't|couldn't|mustn't|didn't|don't|doesn't|to)$/.test(L1) &&
      /^\p{Ll}+ed$/u.test(t.text) && !(L1 === "to" && /^(used|look|looking|forward|according|due|related|compared|exposed|devoted|committed|opposed|attached|addicted|dedicated)$/.test(L2))) {
    const base = [t.lower.slice(0, -2), t.lower.slice(0, -1), t.lower.replace(/ied$/, "y"), t.lower.replace(/(.)\1ed$/, "$1")].find((b) => EN_VERBS.has(b) && enPastOf(b, frequency) === t.lower);
    if (base && !(L1 === "to" && R1 === "by")) fix(base, `After “${L1}”, the base form: “${base}”.`);
  }
  // "when I will arrive" -> arrive
  if (t.lower === "will" && /^(i|you|we|they|he|she|it)$/.test(L1) && EN_TIME_CLAUSE.test(L2) && next && EN_VERBS.has(R1) && R1 !== "be" &&
      toks.slice(0, i - 2).some((x) => /^(will|'ll|i'll|we'll|you'll|they'll|he'll|she'll|going)$/.test(x.lower))) {
    fix(/^(he|she|it)$/.test(L1) ? enThirdPerson(R1) : R1, "In a time clause (“when …”), use the present, not “will”.", t.start, next.end, true);
  }
  // "He has been work here" -> working
  if (L1 === "been" && /^(has|have|had|'ve|i've|we've|you've|they've|he's|she's)$/.test(L2) && EN_VERBS.has(t.lower) && !EN_ADJ_VERBS.test(t.lower) &&
      /^(here|there|for|since|on|at|in|all|hard|from|with|together|really|so|very)$/.test(R1)) {
    fix(ingForm(t.lower), "Present perfect continuous: “has been working”.");
  }
  // "She would rather to work" -> would rather work
  if (t.lower === "to" && L1 === "rather" && /^(would|'d|i'd|you'd|we'd|they'd|he'd|she'd)$/.test(L2) && lowerWord(next)) fix(next.text, "After “would rather”, no “to”.", t.start, next.end, true);
  // "made us to rewrite" (any verb), "must to submit"
  if (t.lower === "to" && /^(me|him|her|us|them|you)$/.test(L1) && /^(make|makes|made|making|let|lets|letting|had|watch|watched|saw|heard)$/.test(L2) &&
      lowerWord(next) && frequency(R1) >= 3 && !/^(the|a|an|my|your|his|her|our|their|this|that|it|be)$/.test(R1)) {
    fix(next.text, `After “${L2} ${L1}”, no “to”.`, t.start, next.end, true);
  }
  if (t.lower === "to" && /^(must|can|could|should|will|would|might|may|shall|cannot|can't|mustn't|shouldn't|won't|wouldn't|couldn't)$/.test(L1) && lowerWord(next) && frequency(R1) >= 3 &&
      !/^(the|a|an|my|your|his|her|our|their|this|that|it)$/.test(R1)) {
    fix(next.text, `After “${L1}”, no “to”.`, t.start, next.end, true);
  }
  // "He suggested to postpone" (any verb)
  if (t.lower === "to" && EN_GERUND_VERBS.test(L1) && !/^(the|a|an|my|your|his|her|its|our|their|of|this|that)$/.test(L2) && lowerWord(next) &&
      frequency(ingForm(R1)) >= 2.5 && !/^(the|a|an|my|your|it|him|her|them|me|us|be)$/.test(R1)) {
    fix(ingForm(R1), `After “${L1}”, use the -ing form: “${ingForm(R1)}”.`, t.start, next.end);
  }
  // "its making a noise" -> it's
  // (Only before a word that follows a verb: "its supporting columns" is an adjective.)
  if (t.lower === "its" && next && /^\p{Ll}+ing$/u.test(next.text) && (EN_VERBS.has(R1.replace(/ing$/, "")) || EN_VERBS.has(R1.replace(/ing$/, "e"))) &&
      (!next2 || isPunct(next2) || /^(a|an|the|my|your|his|her|our|their|me|you|him|us|them|it|to|up|down|out|on|in|at|for|so|really|very|too|again|now|well|badly|fine|fun|hard|everything|something|nothing)$/.test(R2))) {
    if (!/^(building|meeting|ending|opening|beginning|feeling|setting|ceiling|painting|clothing|wedding|morning|evening|training|marketing|funding|housing|lighting|parking|pricing|rating|ranking|recording|reading|rating|spending|timing|warning|landing|filling|lining|being)$/.test(R1)) {
      fix("it's", "Did you mean “it's” (it is)? “Its” is the possessive.");
    }
  }
  // "Let me know when your back" -> you're
  if (t.lower === "your" && /^(back|home|here|there|ready|free|available|finished|done|right|welcome|sure|late|online|outside|inside|awake|asleep|away|busy|almost)$/.test(R1) &&
      (atEnd || isPunct(next2) || !next2 || /^(from|and|so|with|to|at|in|on|now|yet|or|then|already|because)$/.test(R2)) &&
      !(R1 === "back" && next2 && /^(pain|door|yard|seat|pocket|garden|teeth)$/.test(R2))) {
    fix("you're", "Did you mean “you're” (you are)?", t.start, t.end);
  }
  // "The soup was to salty" -> too
  if (t.lower === "to" && /^(is|was|are|were|be|been|it's|that's|feel|feels|felt|seem|seems|seemed|looks|looked|sounds|sounded|getting|got|became)$/.test(L1) &&
      lowerWord(next) && !EN_VERBS.has(R1) && frequency(R1) >= 3 && /(y|ful|ous|ive|ic|al|ble|ent|ant|ish|less|ed|ing|big|hot|cold|late|early|fast|slow|long|short|much|many|old|young|small|tight|loose|loud|soft|hard|high|low)$/.test(R1) &&
      (atEnd || !next2 || isPunct(next2) || /^(for|to|and|but|so|now|today|in|on|at)$/.test(R2)) && !/^(the|a|an|my|your|his|her|our|their|this|that|be|me|him|us|them)$/.test(R1)) {
    fix("too", "Did you mean “too” (excessively)?");
  }
  // "I'm not sure weather the train will run" -> whether
  if (t.lower === "weather" && /^(sure|know|knew|wonder|wondering|wondered|decide|decided|ask|asked|check|see|doubt|unsure|idea|tell|whether)$/.test(L1) && next && !/^(is|was|forecast|report|conditions|today|outside)$/.test(R1)) {
    fix("whether", "Did you mean “whether” (if)?");
  }
  // complement / compliment
  if (/^complement(ed|s|ing)?$/.test(t.lower) && /^(the|him|her|them|me|us|you|my|his|our)$/.test(R1) && toks.slice(i + 1, i + 6).some((x) => /^(on|for)$/.test(x.lower))) {
    fix(t.lower.replace("complement", "compliment"), "To praise someone is to “compliment” them.");
  }
  if (/^compliment(s|ed|ing)?$/.test(t.lower) && L1 === "to" && /^(the|a|its|their|your)$/.test(R1) &&
      toks.slice(i + 1, i + 5).some((x) => /^(dish|wine|meal|lamb|beef|fish|cheese|flavor|flavors|flavour|food|color|colors|colour|decor|outfit|design|style|dessert|sauce|taste|room)$/.test(x.lower))) {
    fix(t.lower.replace("compliment", "complement"), "What goes well with something “complements” it.");
  }
  // "will site several reasons" -> cite
  if (/^(site|sites|sited|siting)$/.test(t.lower) && /^(to|will|would|can|could|should|must|may|might|please|always|often|did|didn't|i|we|they|you)$/.test(L1) &&
      /^(several|many|the|a|an|this|that|these|those|reasons|sources|examples|studies|statistics|evidence|figures|cases|his|her|their|our|your|my|two|three|some)$/.test(R1) &&
      toks.slice(i + 1, i + 5).some((x) => /^(reasons|sources|examples|studies|statistics|evidence|figures|cases|reason|source|study|article|articles|paper|papers|authors|report|data)$/.test(x.lower))) {
    fix(t.lower.replace("site", "cite").replace("citing", "citing"), "To quote a source is to “cite” it.");
  }
  // strait / straight
  if (t.lower === "strait" && /^(to|home|ahead|away|back|into|up|down|over|for|in|out|on|through|line|face|answer)$/.test(R1)) fix("straight", "Did you mean “straight” (directly)?");
  // peek / peak
  if (t.lower === "peek" && L1 === "the" && toks.slice(Math.max(0, i - 4), i).some((x) => /^(reached|reach|climbed|climb|summit|top|at|hit|reaching)$/.test(x.lower))) fix("peak", "The top of a mountain is the “peak”.");
  // moral / morale
  if (t.lower === "moral" && (/^(low|high|boost|boosted|team|staff|employee|employees|troop|troops|good|poor)$/.test(L1) && (atEnd || /^(among|is|was|has|and|in|of|on)$/.test(R1)))) fix("morale", "Team spirit is “morale”.");
  // mouse / mousse
  if (t.lower === "mouse" && /^(chocolate|salmon|lemon|strawberry|raspberry|mango|hair)$/.test(L1)) fix("mousse", "The dessert is a “mousse”.");
  // bred / bread
  if (t.lower === "bred" && (/^(fresh|of|some|the|white|brown|whole|sliced|garlic|homemade|no)$/.test(L1) && (atEnd || /^(and|every|for|with|from|in|is|was|on)$/.test(R1)) && !/^(well|true|pure|selectively)$/.test(L1))) {
    fix("bread", "Did you mean “bread”?");
  }
  // herd / heard
  if (t.lower === "herd" && /^(i|you|we|they|he|she|have|has|had|never|just|already|not)$/.test(L1) && next && /^(the|a|that|it|about|from|you|him|her|them|this|of|what|nothing|something|anything)$/.test(R1)) {
    fix("heard", "Past of “hear”: “heard”.");
  }
  // discrete / discreet
  if (t.lower === "discrete" && /^(be|very|so|stay|remain|more|is|was|being|quite)$/.test(L1) && (atEnd || /^(about|with|and|when|please|regarding)$/.test(R1))) {
    fix("discreet", "Careful not to tell: “discreet”.");
  }
  // "The Mount Everest", "the Lake Tahoe" -> no "the"
  if (t.lower === "the" && /^(Mount|Lake|Mt)$/.test(next?.text ?? "") && /^\p{Lu}/u.test(next2?.text ?? "")) {
    fix(paragraph.slice(next.start, next2.end), "Names of mountains and lakes take no “the”.", t.start, next2.end, true);
  }
  // "The sun rises in east" -> in the east
  if (/^(in|from|to)$/.test(t.lower) && /^(east|west|north|south)$/.test(next?.text ?? "") && (!next2 || isPunct(next2) || /^(and|of)$/.test(R2)) &&
      !/^(far|back|out|up|down|further)$/.test(L1)) {
    fix(`${t.lower} the ${R1}`, "Directions take “the”: “in the east”.", t.start, next.end);
  }
  // "out of the office form Monday" -> from
  if (t.lower === "form" && next && !/^(the|a|an|this|that|application|order|tax|consent|registration|contact|online|paper|claim|entry|booking|web|feedback|sign-up|signup)$/.test(L1) &&
      (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|now|\d+)$/i.test(R1) ||
       /^(email|message|letter|call|text|note|gift|package|parcel|reply|answer|news|update|invoice)$/.test(L1))) {
    fix("from", "Did you mean “from”?");
  }
  // "Please sing the attached form" -> sign
  if (/^(sing|sings|singing|sang)$/.test(t.lower) && /^(the|this|your|my|our|here|both|it)$/.test(R1) &&
      toks.slice(i + 1, i + 5).some((x) => /^(form|contract|document|documents|papers|agreement|lease|petition|forms|here|nda|waiver|copy|attached|below)$/.test(x.lower))) {
    fix({ sing: "sign", sings: "signs", singing: "signing", sang: "signed" }[t.lower], "Did you mean “sign” (write your name)?");
  }
  // "Please let me known" -> know
  if (t.lower === "known" && /^(me|us)$/.test(L1) && /^(let|lets)$/.test(L2)) fix("know", "“Let me know”.");
  // "She works at a hospital ad a nurse" -> as
  if (t.lower === "ad" && /^(a|an)$/.test(R1) && toks.slice(Math.max(0, i - 6), i).some((x) => /^(work|works|worked|working|job|employed|serve|serves|served|hired|started)$/.test(x.lower))) fix("as", "Did you mean “as”?");
  // "I herd", "who cam to" -> came
  if (t.lower === "cam" && /^(who|i|he|she|we|they|you|it|that|then|finally|everyone)$/.test(L1) && /^(to|back|home|in|over|out|up|down|with|from|here|by)$/.test(R1)) fix("came", "Did you mean “came”?");
  // Learner prepositions ("interested for", "at Monday", "listen music")
  if (t.lower === "for" && L1 === "interested") fix("in", "One is “interested in” something.");
  if (t.lower === "at" && /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(R1) && !/^(arrive|arrived|look|looked)$/.test(L1)) fix("on", "Days take “on”: “on Monday”.");
  if (t.lower === "in" && /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i.test(R1) && /^([1-9]|[12]\d|3[01])(st|nd|rd|th)?$/.test(R2)) fix("on", "A date takes “on”: “on May 5”.");
  if (t.lower === "on" && R1 === "the" && /^(morning|afternoon|evening)$/.test(R2) && (!toks[i + 3] || isPunct(toks[i + 3])) && !/^(of)$/.test(toks[i + 3]?.lower ?? "")) fix("in", "“In the morning”.");
  if (t.lower === "in" && R1 === "the" && R2 === "weekend") fix("on", "“On the weekend” (or “at the weekend” in British English).");
  if (t.lower === "for" && /^congratulations$/.test(L1)) fix("on", "“Congratulations on …”.");
  if (t.lower === "in" && /^(consists|consist|consisted|consisting)$/.test(L1)) fix("of", "“Consist of”.");
  if (/^(listen|listens|listened|listening)$/.test(t.lower) && /^(music|the|a|my|your|his|her|this|that|podcasts|songs|radio)$/.test(R1) && R1 !== "to") {
    fix(`${t.text} to`, "One listens “to” something.", t.start, t.end, true);
  }
  if (t.lower === "on" && /^(proud)$/.test(L1)) fix("of", "“Proud of”.");
  if (t.lower === "of" && /^(surprised|amazed|shocked)$/.test(L1) && /^(the|a|an|his|her|their|my|your|our|this|that|how)$/.test(R1)) fix("by", `“${L1} by”.`);
  if (t.lower === "at" && /^(go|went|going|goes|come|came|coming)$/.test(L1) && R1 === "the" && /^(beach|park|cinema|movies|gym|store|mall|office|station|airport|hospital|museum|zoo|library|bank|market|supermarket)$/.test(R2)) fix("to", "Movement: “go to the beach”.");
  if (/^(apologized|apologised|apologize|apologise|apologizes)$/.test(t.lower) && /^(me|him|her|us|them|you)$/.test(R1)) fix(`${t.text} to`, "One apologizes “to” someone.", t.start, t.end, true);
  if (t.lower === "with" && L1 === "used" && /^(the|a|it|this|that|my|cold|hot|working|living|being|people|them|him|her)$/.test(R1) && /^(not|i'm|am|are|is|get|got|getting|be|been)$/.test(L2)) fix("to", "“Be used to”.");
  if (t.lower === "with" && /^(similar|identical|equivalent)$/.test(L1)) fix("to", `“${L1} to”.`);
  if (t.lower === "in" && /^(arrived|arrive|arrives|arriving)$/.test(L1) && R1 === "the" && /^(hotel|airport|station|office|restaurant|party|meeting|venue|stadium)$/.test(R2)) fix("at", "Arrive “at” a building.");
  if (t.lower === "in" && L1 === "full" && /^(people|the|water|tourists|of)$/.test(R1) === true && R1 !== "of") fix("of", "“Full of”.");
  if (t.lower === "to" && /^(remind|reminds|reminded|reminding)$/.test(L2) && /^(me|him|her|us|them|you)$/.test(L1) && /^(my|your|his|her|our|their|the|a)$/.test(R1)) fix("of", "“Remind someone of …”.");
  if (/^(discuss|discussed|discussing|discusses)$/.test(t.lower) && R1 === "on") fix(t.text, "“Discuss” takes no preposition.", t.start, next.end, true);
  if (t.lower === "on" && L1 === "angry" && /^(me|him|her|us|them|you|my|his)$/.test(R1)) fix("with", "“Angry with” someone.");
  if (t.lower === "of" && L1 === "regard" && L2 === "in") fix("to", "“In regard to”.");
  if (t.lower === "home" && L1 === "in" && /^(stay|stayed|staying|stays|be|was|were|am|is|are|work|worked|working)$/.test(L2)) fix("at home", "“At home”.", prev.start, t.end);
  if (/^(entered|enter|enters|entering)$/.test(t.lower) && R1 === "into" && /^(the|a|my|his|her|their|our)$/.test(R2) && /^(room|house|building|office|kitchen|classroom|car|shop|store)$/.test(toks[i + 3]?.lower ?? "")) {
    fix(t.text, "“Enter” takes no “into”: “entered the room”.", t.start, next.end, true);
  }
  if (t.lower === "to" && /^(capable)$/.test(L1) && lowerWord(next) && frequency(ingForm(R1)) >= 2.5) fix(`of ${ingForm(R1)}`, "“Capable of doing”.", t.start, next.end);
  if (t.lower === "to" && /^(thank|thanks)$/.test(L2) && L1 === "you" && lowerWord(next) && EN_VERBS.has(R1)) fix(`for ${ingForm(R1)}`, "“Thank you for doing”.", t.start, next.end);
}

// The apostrophe form of a contraction typed without it, or null.
// `prevWord` picks the right agreement: "she dont" -> "doesn't".
export function contractionFor(word, prevWord = "") {
  const lower = word.toLowerCase();
  if (lower === "dont" && /^(he|she|it|this|that|everyone|nobody|somebody|someone)$/i.test(prevWord)) return "doesn't";
  return CONTRACTIONS.get(lower) ?? null;
}
