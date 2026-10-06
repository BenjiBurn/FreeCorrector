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
  // Loanwords common in English cooking and daily life
  "al", "dente", "pancetta", "guanciale", "prosciutto", "bruschetta", "focaccia", "ciabatta", "gnocchi", "burrata",
  "chorizo", "tapas", "matcha", "boba", "ramen", "pho", "banh", "kimchi", "tteokbokki", "shakshuka", "tzatziki",
  "trattoria", "trattorias", "osteria", "gelateria", "aperitivo", "antipasti", "orecchiette", "pappardelle", "amatriciana",
  "arrabbiata", "limoncello", "vaporetto", "nonna", "boulangerie", "patisserie", "fromagerie", "crêperie", "brasserie",
  "taqueria", "horchata", "pozole", "izakaya", "onsen", "ryokan", "shinkansen", "onigiri", "tonkatsu", "gyoza", "bibimbap",
  "bulgogi", "hygge", "fika", "biergarten", "souvlaki", "shawarma", "biryani", "paneer",
  "injera", "mochi", "empanada", "empanadas", "gazpacho", "gaspacho", "gyoza", "gyozas", "churros", "churro", "tamales",
  "tamale", "arepa", "arepas", "pupusa", "pupusas", "ceviche", "pozole", "tteok", "tonkotsu", "katsu", "donburi",
  "okonomiyaki", "takoyaki", "yakitori", "udon", "soba", "edamame", "dashi", "miso", "baklava", "falafel", "hummus",
  "tabbouleh", "taboulé", "harissa", "tajine", "tagine", "pastilla", "mezze", "meze", "dolma", "dolmas", "börek", "pierogi",
  "pelmeni", "borscht", "goulash", "strudel", "spätzle", "pretzel", "currywurst", "risotto", "tiramisu", "panettone",
  "arancini", "cannoli", "gnocchi", "orzo", "polenta", "paella", "tortilla", "chorizo", "jamón", "pintxos", "sangria", "tapas",
  "baozi", "bao", "jiaozi", "congee", "laksa", "rendang", "satay", "sambal",
  "naan", "chapati", "dosa", "idli", "samosa", "samosas", "masala", "tikka", "korma", "vindaloo", "dal",
  "dhal", "lassi", "chai", "acai", "açaí", "quinoa", "kombucha", "sriracha", "wasabi", "teriyaki",
  // Tech and business words French writing keeps in English ("un call", "la roadmap")
  "call", "calls", "feedback", "feedbacks", "dashboard", "dashboards", "roadmap", "roadmaps", "timeout", "timeouts",
  "build", "builds", "deploy", "release", "releases", "sprint", "sprints", "backlog", "backlogs", "standup", "stand-up",
  "daily", "meeting", "meetings", "deadline", "deadlines", "workflow", "workflows", "onboarding", "offboarding",
  "benchmark", "benchmarks", "brainstorming", "debriefing", "freelance", "freelances", "startup", "startups", "start-up",
  "start-ups", "newsletter", "newsletters", "podcast", "podcasts", "story", "stories", "post", "posts", "like", "likes",
  "follower", "followers", "hashtag", "hashtags", "login", "logout", "password", "framework", "frameworks", "backend",
  "frontend", "back-end", "front-end", "fullstack", "full-stack", "devops", "cloud", "server", "servers", "cluster",
  "clusters", "container", "containers", "pipeline", "pipelines", "commit", "commits", "merge", "merges", "rebase",
  "branch", "branches", "push", "pull", "request", "requests", "review", "reviews", "reviewer", "reviewers", "repo",
  "repos", "issue", "issues", "debug", "hotfix", "hotfixes", "patch", "patches", "update", "updates", "upgrade",
  "upgrades", "rollback", "staging", "prod", "preprod", "run", "runs", "job", "jobs", "task", "tasks", "scrum", "kanban",
  "owner", "owners", "team", "teams", "checklist", "checklists", "feature", "features", "insight", "insights", "lead",
  "leads", "growth", "branding", "mockup", "mockups", "wireframe", "wireframes", "template", "templates", "slide", "slides",
  "deck", "decks", "follow-up", "kick-off", "kickoff", "workshop", "workshops", "afterwork", "afterworks", "open-space",
  "remote", "reporting", "forecast", "forecasts", "gameplay", "streamer", "streamers", "cosplay", "crush", "chill", "mood",
  "vibe", "vibes", "flex", "cringe", "random", "timeline", "feed", "reel", "reels", "thread", "threads", "tweet", "tweets",
  "laptop", "laptops", "desktop", "headset", "setup", "setups", "set-up", "gaming", "hardware", "software", "firmware",
  "plugin", "plugins", "add-on", "add-ons", "addon", "addons", "widget", "widgets", "token", "tokens", "endpoint",
  "endpoints", "payload", "payloads", "webhook", "webhooks", "middleware", "runtime", "debugger", "linter", "parser",
  "bundle", "bundler", "dataset", "datasets", "notebook", "notebooks", "prompt", "prompts", "chatbot", "chatbots",
  "localhost", "publickey", "stdout", "stderr", "stdin", "sudo", "async", "config", "configs",
  "rebook", "rebooked", "rebooking", "preorder", "preorders", "preordered", "prebook", "prebooked", "unsubscribe", "unsubscribed", "onboarded", "upskilling", "reskilling",
]);

// Phrases English borrows whole from French, Italian or Latin ("déjà vu",
// "café au lait", "raison d'être"): blanked in English text, their words
// are not English typos.
self.FC_LOAN_PHRASES = new RegExp(`(?<![\\p{L}'’-])(?:${[
  "café au lait", "au lait", "au pair", "au revoir", "au naturel", "au gratin", "au jus", "déjà vu", "deja vu",
  "raison d['’]être", "raison d['’]etre", "crème brûlée", "creme brulee", "crème de la crème", "crème fraîche", "creme fraiche",
  "joie de vivre", "je ne sais quoi", "c['’]est la vie", "bon appétit", "bon appetit", "bon voyage", "coup de grâce",
  "coup de grace", "coup d['’]état", "coup d['’]etat", "coup de foudre", "pièce de résistance", "piece de resistance",
  "esprit de corps", "fait accompli", "fin de siècle", "hors d['’]œuvres?", "hors d['’]oeuvres?", "laissez[- ]faire",
  "mise en place", "mise en scène", "nom de plume", "objet d['’]art", "pied-à-terre", "savoir[- ]faire", "tête-à-tête",
  "vis-à-vis", "femme fatale", "enfant terrible", "noblesse oblige", "nouveau riche", "petits? fours?", "prix fixe",
  "à la carte", "a la carte", "à la mode", "a la mode", "art nouveau", "belle époque", "bête noire", "carte blanche",
  "cause célèbre", "cordon bleu", "cri de cœur", "cri de coeur", "de rigueur", "double entendre", "entre nous",
  "faux pas", "idée fixe", "mot juste", "nouvelle cuisine", "par excellence", "plat du jour", "pot-au-feu", "sang-froid",
  "soupe du jour", "tour de force", "trompe[- ]l['’]œil", "trompe[- ]l['’]oeil", "bon mot", "ménage à trois",
  "s['’]il vous plaît", "merci beaucoup", "la dolce vita", "dolce vita", "dolce far niente", "prima donna",
  "al fresco", "panna cotta", "sotto voce", "dim sum", "pad thai", "tom yum", "nasi goreng", "pastéis de nata", "pastel de nata", "pho bo", "banh mi", "tarte tatin", "mi casa es su casa", "hasta la vista", "hasta luego", "persona non grata",
  "sine qua non", "quid pro quo", "terra incognita", "magnum opus", "modus operandi", "ad nauseam", "ad infinitum",
].join("|")})(?![\\p{L}'’-])`, "giu");
