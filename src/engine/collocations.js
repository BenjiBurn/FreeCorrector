// Slips inside set phrases: a typo that gives another real word, caught
// because the words around it form a common phrase ("mot de basse" -> passe,
// "une dent de lit" -> lait, "the mane entrance" -> main). The typed word is
// one letter (or accents only) away from the phrase's word; everything else
// matches exactly.
//
// Phrase syntax: words separated by spaces, with
//   "#"      any number ("neuf heurts" -> heures),
//   "pren*"  any word starting with "pren" (prends, prenez, prendre…),
//   " $"     at the end: the phrase must end the clause, or be followed by a
//            small word ("il fait froid dehors", not "il fait droit à…").
//   " !"     at the end: a two-word phrase specific enough to stand alone.
// Phrases of two words need "$", "!" or "#": too many real pairs are one letter apart.
// Loaded by both workers (classic script and ES module): exposes a global.

const FC_COLLOCATIONS = {
  fr: [
    // time
    "ce matin $", "ce soir $", "hier soir $", "hier matin $", "demain matin !", "demain soir $",
    "tous les matins", "toute la journée", "toute la soirée", "toute la nuit",
    "la semaine prochaine", "la semaine dernière", "le mois prochain", "le mois dernier", "l’année prochaine",
    "l’année dernière", "fois par semaine", "fois par jour", "fois par mois", "fois par an",
    "il était une fois", "dans le four $", "à la fois", "la première fois", "la dernière fois", "heures du matin", "heures du soir",
    "# heures $", "# minutes $", "# secondes $", "# semaines $", "# euros $", "# kilomètres $",
    "heures et demie", "en fin de journée", "en fin de semaine", "en début de semaine", "le week-end prochain",
    "de temps en temps",
    // home and daily life
    "mot de passe", "mots de passe", "permis de conduire", "cour de récréation", "pomme de terre", "pommes de terre",
    "dent de lait", "dents de lait", "salle de bain", "salle de bains", "salle à manger", "salle de classe",
    "salle d’attente", "salle de sport", "salle de réunion", "chambre à coucher", "machine à laver", "fer à repasser",
    "brosse à dents", "sac à dos", "sac à main", "boîte aux lettres", "boîte de nuit", "lettre de motivation",
    "arrêt de bus", "carte bancaire !", "carte de crédit", "carte d’identité", "code postal $", "numéro de téléphone",
    "coup de fil", "coup de main", "coup de soleil", "coup d’œil", "coup de pouce", "petit déjeuner", "pause déjeuner",
    "liste des courses", "fai* les courses", "fai* des courses", "fai* la vaisselle", "fai* le ménage",
    "fai* une promenade", "fai* la queue", "fai* du sport", "fai* attention",
    "fai* la lessive", "fai* le lit", "fai* la sieste", "fai* la grasse matinée", "fai* mes devoirs", "fai* tes devoirs",
    "fai* ses devoirs", "fai* sa valise", "fai* ma valise", "fai* les magasins",
    "pren* une douche", "pren* un bain", "pren* le bus", "pren* le train", "pren* le métro", "pren* l’avion",
    "pren* rendez-vous", "pren* un café", "pren* un verre", "pren* le temps", "pren* une décision", "pren* froid",
    "pren* des nouvelles", "pren* soin de",
    "un verre d’eau", "un verre de vin", "un verre de lait", "mal à la tête", "mal à la gorge", "mal au ventre",
    "mal au dos", "mal aux dents", "mal au cœur", "mal aux pieds", "en panne $", "tomb* en panne",
    "il fait beau $", "il fait froid $", "il fait chaud $", "il fait nuit $", "il fait jour $", "il fait doux $",
    "le frigo est vide", "le réfrigérateur est vide", "désolé pour le retard", "désolée pour le retard",
    "désolé du retard", "désolée du retard", "laisser un message", "laissé un message", "un message vocal",
    "réserv* une table", "au four $", "four à micro-ondes", "le toit de la maison",
    "contre le mur", "garder la foi", "vers la sortie", "feu vert", "feu rouge", "passé au vert", "passé au rouge",
    "en vacances $", "part* en vacances", "jour férié", "tarte aux fraises", "tarte aux pommes", "tarte au citron",
    "confiture de fraises", "jus d’orange", "café au lait", "sans sucre ni lait", "château fort", "en forêt $",
    "au bord de la mer", "porte d’entrée", "point de vue", "tout à fait", "tout de suite",
    "à tout à l’heure", "en tout cas", "au fur et à mesure", "pas du tout", "quand même $", "à cause de", "grâce à",
    "au lieu de", "en face de", "à côté de", "à côté du", "à côté des", "à côté $", "au bout de", "à partir de",
    "par exemple", "avoir besoin de", "avoir envie de", "avoir peur de", "moyen de transport", "compte en banque",
    "compte bancaire", "fiche de paie", "arrêt maladie", "service client", "entretien d’embauche", "offre d’emploi",
    "contrat de travail", "période d’essai", "heures supplémentaires", "ordre du jour", "compte rendu",
    "chez le médecin", "chez le dentiste", "chez le coiffeur", "bonne nuit $", "bonne journée $", "bonne soirée $",
    "bon appétit $", "bon anniversaire $", "joyeux anniversaire $", "bonne année $", "meilleurs vœux",
    "merci pour ton aide", "merci pour votre aide", "merci de votre aide", "merci pour ton aide", "un roman policier",
    "film d’horreur", "batterie à plat", "pas de réseau", "mett* la table", "débarrass* la table", "ferm* la porte",
    "ouvr* la fenêtre", "ferm* la fenêtre", "étein* la lumière", "allum* la lumière", "sort* la poubelle",
    "sort* les poubelles", "sort* le chien", "promen* le chien", "arros* les plantes", "étend* le linge",
    "pass* l’aspirateur", "une bonne nouvelle", "une mauvaise nouvelle", "pos* une question", "bonne chance $",
    "à la maison $", "rentr* à la maison", "billet de train", "billet d’avion", "carte d’embarquement",
    "aller-retour", "plat du jour", "plats végétariens", "plat végétarien", "eau gazeuse", "salade de fruits",
    "pomme de terre crue", "œuf dur", "les heures de pointe", "à l’heure de pointe", "la liste des", "la sortie de secours",
    "rez-de-chaussée", "au rez-de-chaussée", "au premier étage", "au deuxième étage", "au dernier étage",
    "en bas de chez", "lav* les mains", "bross* les dents", "un mal de tête", "un mal de dos",
    "une ordonnance", "la pharmacie de garde", "les urgences $", "un rhume $", "de la fièvre", "la grippe $",
    "le code de la route", "le contrôle technique", "faire le plein", "fait le plein", "le plein d’essence",
    "la ceinture de sécurité", "le feu tricolore", "un accident de voiture", "une amende de", "un excès de vitesse",
    "un mot de passe", "le mot de passe", "votre mot de passe", "ton mot de passe", "mon mot de passe",
    "le bulletin de notes", "une bonne note", "une mauvaise note", "pren* des notes", "le tableau noir",
    "le cartable", "la trousse", "le cahier de texte", "les devoirs du soir",
    // round 4: everyday nouns a slip turns into another word
    "une pincée de sel", "pincée de sel", "sucre en poudre", "farine tamisée !", "préchauf* le four", "dans la salle",
    "la salle du", "rat* le bus", "rat* le train", "rat* mon train", "rat* mon bus", "code de l’interphone", "le code wifi",
    "porte du garage", "la porte du", "ma voiture est", "ta voiture est", "sa voiture est", "centimètres de neige",
    "envoy* le fichier", "envoy* un message", "envoy* le lien", "le livre que", "toute la classe", "en pièce jointe",
    "trouverez la facture", "votre facture", "un stage de", "un stage dans", "mon salaire a", "le salaire de",
    "meilleur joueur du", "meilleur joueur de", "la meilleure saison", "meilleure saison du", "quel temps de",
    "prends une chaise", "voir le film", "à votre équipe", "pour ma mère", "pour mon père", "avec mon frère",
    "avec ma sœur", "une petite fête", "le ballon de", "perdu le ballon", "le match de", "du salon", "le tapis du salon",
    "étal* la pâte", "la pâte sur", "coup de génie", "coup de théâtre", "fin du mois", "début du mois", "fin de la semaine",
    "ces derniers temps", "ces derniers jours", "par la fenêtre", "un cadeau pour", "rendez-vous chez", "en retard de",
    "au bout du fil", "de la pluie", "sous la neige", "le ciel est",
  ],
  en: [
    "main entrance !", "main course", "main road", "main street", "main reason", "main idea", "hard work $",
    "fourth floor !", "third floor !", "second floor !", "first floor", "ground floor", "top floor", "your reply $",
    "quick reply", "great idea $", "good idea $", "great job $", "good job $", "great party $", "great time $",
    "good news $", "the united states", "the united kingdom", "the united nations", "marketing department !",
    "sales department !", "loyal customer", "loyal customers", "customer service !", "the best pizza", "my clothes $",
    "new clothes", "had dinner", "for dinner $", "dinner party", "barely awake !", "wide awake", "business casual",
    "the dress code", "sole heir", "brake pedal !", "gas pedal", "complimentary breakfast !", "take a peek",
    "sneak peek", "perfect complement", "matter of principle", "school principal", "moot point !", "lose weight",
    "gain weight", "turn off the lights", "turn on the lights", "turn off the light", "turn off the tv",
    "turn off your phone", "one of my", "one of the", "one of our", "one of his", "one of her", "one of your",
    "one of their", "walked through the", "through the park", "a thorough job", "see you later $",
    "talk to you later $", "text you later $", "call you later $", "see a movie", "watch a movie", "a long week",
    "the kitchen table", "dining table", "fill out the form", "fill out this form",
    "application form", "sign the contract", "employment contract", "a nice woman", "a young woman",
    "an old woman", "two women", "three women", "four women", "many women", "my best friend", "best friends $",
    "upset about it", "excited about it", "thanks for asking $", "find my keys", "find your keys",
    "car keys", "for a long time", "long time no see", "in the meantime", "at the moment",
    "in a minute $", "wait a minute", "just a minute", "a few minutes", "an email from", "a message from",
    "a call from", "a letter from", "far from", "away from", "apart from", "from the bank", "bank account",
    "credit card !", "phone number !", "email address !", "the post office", "grocery store !", "gas station !",
    "train station !", "bus stop", "parking lot", "traffic jam", "rush hour", "this weekend $", "next weekend $",
    "have a nice day", "have a good day", "good morning $", "good night $", "good luck $", "happy birthday $",
    "merry christmas", "happy new year", "thank you so much", "thanks a lot", "as soon as possible", "in front of",
    "on purpose $", "by accident $", "make sure", "take care $", "take a break", "take a shower", "take a nap",
    "take notes", "take a photo", "take a picture", "meeting room", "conference room", "living room !",
    "dining room !", "in charge of", "in the morning", "in the afternoon", "in the evening",
    "tomorrow morning", "dark chocolate", "ice cream", "orange juice !", "apple pie", "hot chocolate",
    "cup of coffee", "cup of tea", "glass of water", "glass of wine", "piece of cake", "slice of pizza",
    "all day long", "every morning", "twice a week", "once a week", "times a week",
    "a lot of patience", "in spite of", "instead of", "because of", "out of order", "out of the office",
    "in the middle of", "on top of",
    "next door", "the day after tomorrow", "the day before yesterday", "a waste of time",
    "a waste of money", "around her waist", "around his waist", "around my waist", "the sole owner",
    "wedding dress", "wedding ring", "birthday party", "birthday cake", "job interview", "job offer",
    "cover letter", "the hiring manager", "the store manager", "as a manager", "a manager at", "make a reservation",
    "made a reservation", "book a table", "the main entrance", "the back door", "the front door",
    "the front desk", "room service", "boarding pass", "carry-on bag",
    "the weather forecast", "a sunny day", "a rainy day", "heavy rain", "high school", "middle school",
    "the school year", "summer vacation", "spring break", "the final exam", "a pop quiz", "homework assignment",
    "the grocery list", "shopping list", "to-do list", "the dishwasher", "the washing machine", "do the dishes",
    "do the laundry", "the laundry", "fold the laundry", "walk the dog", "feed the cat", "water the plants",
    "the light bulb", "the remote control", "the phone charger", "low battery", "the battery died",
    "dead battery", "flat tire", "the speed limit", "a parking ticket", "a speeding ticket", "seat belt",
    "the traffic light", "the green light", "the red light", "a fever $", "a headache $",
    "a sore throat", "a stomachache", "a doctor's appointment", "the dentist", "the pharmacy",
    // round 4: small words a slip turns into another word
    "thank you for", "thanks for the", "thanks for your", "working with you", "work with you", "speak with you",
    "one more time", "every time i", "every time we", "every time you", "next week !", "last week !", "this week $",
    "table for two", "table for four", "in our next", "our next meeting", "delayed by #", "at # pm",
    "at # am", "lands at #", "arrives at #", "on monday !", "on tuesday !", "on wednesday !", "on thursday !", "on friday !",
    "on saturday !", "on sunday !", "without her !", "had to come", "we had to", "so we had to", "where we can",
    "new pair of", "line of code", "meant by that", "meant by this", "door for me",
    "for me please", "went straight to", "went to bed", "go to bed", "who came to", "came to the party",
    "but i'm not sure", "but i'm not", "works as a", "worked as a", "work as a", "working as a",
    "when you get a chance", "if you get a chance", "within three business days", "three business days",
    "packed lunch !", "for lunch $", "his lunch to", "her lunch to", "a chocolate mousse", "chocolate mousse !",
    "fresh bread !", "loaf of bread", "slice of bread",
    "reached the peak", "the mountain peak", "at its peak", "be discreet !", "very discreet !",
  ],
};

// Small words: only these pairs of them count as slips ("of" / "off").
const FC_COLLOC_SMALL = {
  fr: /^(le|la|les|l|un|une|des|du|de|d|à|a|au|aux|en|et|est|es|ou|où|on|ont|son|sont|sa|ça|ce|se|ces|ses|mes|mais|ma|mon|ta|ton|tes|nous|vous|il|elle|ils|elles|je|j|tu|me|te|que|qui|qu|ne|n|pas|par|pour|sur|sûr|sous|dans|avec|si|ni|y|s|c|t|m|plus|peu|peut|très|tout|tous|chez|leur|leurs|lui|dont|donc|quand|quant|comme|bien)$/,
  en: /^(a|an|the|of|off|or|on|in|at|to|too|two|for|from|form|by|be|is|it|its|as|so|no|not|now|know|and|any|all|our|are|was|has|had|his|her|him|he|she|we|me|my|us|you|your|they|them|then|than|that|this|there|their|these|those|with|will|well|were|where|when|what|who|how|out|up|but|can|may|though|through|thorough|threw|i|do|did|does|one|won|own|new|knew)$/,
};
const FC_COLLOC_PAIRS = new Set([
  "of|off", "from|form", "for|fir", "for|fur", "for|fort", "with|wit", "on|ion", "her|hey", "but|bur", "but|bit", "at|art", "as|ad", "our|out", "by|buy", "by|my", "had|hat", "pour|pou", "avec|avez", "know|now", "though|through", "through|thorough", "though|thorough", "to|too", "were|where",
  "then|than", "a|à", "ou|où", "et|est", "son|sont", "on|ont", "ce|se", "ces|ses", "sa|ça", "la|là",
  "dont|donc", "peu|peut", "sur|sûr", "mais|mes", "du|dû",
].flatMap((p) => [p, p.split("|").reverse().join("|")]));
const FC_COLLOC_NUMBER = /^(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quarante|cinquante|soixante|cent|mille|quelques|plusieurs|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|few|several)$/;
const FC_COLLOC_TAIL = {
  fr: /^(et|mais|ou|donc|car|dehors|aujourd|ici|ce|cette|en|depuis|quand|alors|maintenant|demain|hier|là|non|oui|merci|ok|bisous|déjà|encore|aussi|vers|chez|avec|pour|pendant|avant|après|si|je|tu|il|elle|on|nous|vous|ils|elles|j)$/,
  en: /^(and|but|or|so|because|today|tonight|tomorrow|now|then|here|there|again|too|already|anyway|though|if|when|while|i|we|you|he|she|they|it|for|with|at|on|in|after|before|thanks|please|everyone|guys)$/,
};

// "au mois de juillet", not "au mois de": "au moins de la patience" is right.
for (const month of ["janvier", "février", "mars", "mai", "juin", "juillet", "septembre", "novembre", "décembre"]) {
  FC_COLLOCATIONS.fr.push(`au mois de ${month}`);
}
for (const month of ["avril", "août", "octobre"]) FC_COLLOCATIONS.fr.push(`au mois d’${month}`);

// Typed words never taken for a slip: "qui que ce soit." is not "ce soir".
const FC_COLLOC_NEVER = { fr: /^(soit)$/, en: /^(going|seen)$/ };

const fcCollocCompiled = {};
function fcCollocPhrases(lang) {
  if (!fcCollocCompiled[lang]) {
    fcCollocCompiled[lang] = [...new Set(FC_COLLOCATIONS[lang])].map((p) => {
      const tail = / \$$/.test(p);
      const trusted = / !$/.test(p);
      const words = p.replace(/ [$!]$/, "").toLowerCase().match(/[\p{L}\p{N}#*-]+/gu)
        .flatMap((w) => (w.includes("-") && !w.endsWith("*") ? w.split("-") : [w]));
      return { words, tail, trusted };
    }).filter(({ words, tail, trusted }) => words.length >= 3 || tail || trusted || words.includes("#"));
  }
  return fcCollocCompiled[lang];
}

const fcCollocPlain = (w) => w.normalize("NFD").replace(/[̀-ͯ]/g, "");

// At most one edit (substitution, insertion, deletion, swap of neighbours).
function fcOneEdit(a, b) {
  if (a === b) return false;
  if (a.length === b.length) {
    const diff = [];
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) diff.push(k);
    return diff.length === 1 || (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]);
  }
  if (Math.abs(a.length - b.length) !== 1) return false;
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  let k = 0;
  while (k < s.length && s[k] === l[k]) k++;
  return s.slice(k) === l.slice(k + 1);
}

// "posé"/"posés", "voisin"/"voisine": agreement, not a slip.
function fcInflectionOf(a, b) {
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return l.startsWith(s) && /^(s|x|e|es|d|ed|n|en|r|er|ly)$/.test(l.slice(s.length));
}

function fcIsSlip(typed, wanted, lang) {
  if (FC_COLLOC_NEVER[lang].test(typed)) return false;
  const small = FC_COLLOC_SMALL[lang];
  if (small.test(typed) || small.test(wanted)) return FC_COLLOC_PAIRS.has(`${typed}|${wanted}`);
  if (typed.length < 3 || wanted.length < 3 || fcInflectionOf(fcCollocPlain(typed), fcCollocPlain(wanted))) return false;
  const pt = fcCollocPlain(typed), pw = fcCollocPlain(wanted);
  return pt === pw || fcOneEdit(pt, pw) || fcOneEdit(typed, wanted);
}

function fcCollocWordMatches(pattern, word) {
  if (pattern === "#") return FC_COLLOC_NUMBER.test(word);
  if (pattern.endsWith("*")) return word.startsWith(pattern.slice(0, -1));
  return pattern === word;
}

// Where each phrase can start: one exact word must be in place (a phrase has
// one slip at most), or its wildcard when it has a single exact word.
const fcCollocIndexes = {};
function fcCollocIndex(lang) {
  if (!fcCollocIndexes[lang]) {
    const words = new Map();
    const prefixes = [];
    const numbers = [];
    for (const phrase of fcCollocPhrases(lang)) {
      const exact = phrase.words.filter((w) => !/[#*]/.test(w)).length;
      phrase.words.forEach((w, pos) => {
        if (w === "#") {
          if (exact < 2) numbers.push([phrase, pos]);
        } else if (w.endsWith("*")) {
          if (exact < 2) prefixes.push([w.slice(0, -1), phrase, pos]);
        } else {
          if (!words.has(w)) words.set(w, []);
          words.get(w).push([phrase, pos]);
        }
      });
    }
    fcCollocIndexes[lang] = { words, prefixes, numbers };
  }
  return fcCollocIndexes[lang];
}

// [{ start, end, word, fix }] for one paragraph.
self.fcCollocationSlips = (paragraph, lang) => {
  const toks = [];
  for (const m of paragraph.matchAll(/[\p{L}\p{N}]+/gu)) {
    toks.push({ text: m[0], lower: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  // Words are joined by spaces, apostrophes or hyphens only: no punctuation inside a phrase.
  const joinedNext = toks.map((t, k) => k + 1 < toks.length && /^[\s'’-]+$/.test(paragraph.slice(t.end, toks[k + 1].start)));
  const { words: index, prefixes, numbers } = fcCollocIndex(lang);
  const candidates = new Map();
  toks.forEach((t, k) => {
    const hits = [...(index.get(t.lower) ?? [])];
    if (FC_COLLOC_NUMBER.test(t.lower)) hits.push(...numbers);
    for (const [prefix, phrase, pos] of prefixes) if (t.lower.startsWith(prefix)) hits.push([phrase, pos]);
    for (const [phrase, pos] of hits) {
      const start = k - pos;
      if (start < 0 || start + phrase.words.length > toks.length) continue;
      if (!candidates.has(phrase)) candidates.set(phrase, new Set());
      candidates.get(phrase).add(start);
    }
  });
  const out = [];
  for (const [{ words, tail }, starts] of candidates) {
    const n = words.length;
    for (const i of starts) {
      let slip = -1;
      let ok = true;
      for (let j = 0; j < n && ok; j++) {
        if (j < n - 1 && !joinedNext[i + j]) ok = false;
        else if (!fcCollocWordMatches(words[j], toks[i + j].lower)) {
          if (slip >= 0 || /[#*]/.test(words[j]) || !fcIsSlip(toks[i + j].lower, words[j], lang)) ok = false;
          else slip = j;
        }
      }
      if (!ok || slip < 0) continue;
      const t = toks[i + slip];
      // A capitalized word inside a sentence is a name ("rue du Mur").
      const before = paragraph.slice(0, t.start).trimEnd();
      if (/^\p{Lu}/u.test(t.text) && before && !/[.!?…:«"“(\n]$/.test(before)) continue;
      if (tail) {
        const after = paragraph.slice(toks[i + n - 1].end);
        const nextWord = toks[i + n]?.lower;
        if (!/^\s*([.,;:!?…)»"”]|$)/.test(after) && !(nextWord && /^\s+$/.test(paragraph.slice(toks[i + n - 1].end, toks[i + n].start)) && FC_COLLOC_TAIL[lang].test(nextWord))) continue;
      }
      if (out.some((o) => o.start < t.end && t.start < o.end)) continue;
      let fix = words[slip];
      if (/^\p{Lu}/u.test(t.text)) fix = fix[0].toUpperCase() + fix.slice(1);
      out.push({ start: t.start, end: t.end, word: t.text, fix });
    }
  }
  return out;
};
