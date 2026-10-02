// Everyday informal words and abbreviations that the dictionaries do not
// know but that people write on purpose: never reported as misspelled.
// Loaded by both workers (classic script and ES module): exposes a global.

self.FC_INFORMAL_WORDS = new Set([
  // French
  "ok", "dispo", "dispos", "ciné", "cinés", "resto", "restos", "appart", "apparts", "perso", "persos",
  "info", "infos", "ado", "ados", "sympa", "sympas", "apéro", "apéros", "déj", "petit-déj", "aprèm",
  "aprem", "coloc", "colocs", "prof", "profs", "exam", "exams", "bac", "fac", "manif", "dico", "pub",
  "mdr", "ptdr", "lol", "stp", "svp", "bcp", "tkt", "jsp", "pk", "pq", "bisous", "bisou", "biz", "wesh",
  "ouf", "bof", "ouais", "nan", "boulot", "bouffe", "pote", "potes", "taf", "dodo", "frigo", "ordi",
  "ordis", "télé", "vélo", "promo", "promos", "récap", "dispo.", "covoit", "covid", "visio", "visios",
  "wifi", "selfie", "selfies", "spoiler", "week-end", "week-ends", "replay", "smiley", "emoji", "emojis",
  // English
  "lol", "omg", "btw", "idk", "tbh", "lmao", "brb", "asap", "fyi", "thx", "pls", "plz", "okay", "imo",
  "imho", "afaik", "irl", "dm", "dms", "gonna", "wanna", "gotta", "kinda", "sorta", "yeah", "yep",
  "nope", "haha", "hahaha", "hehe", "xoxo", "bday", "congrats", "convo", "info", "app", "apps", "emoji",
]);
