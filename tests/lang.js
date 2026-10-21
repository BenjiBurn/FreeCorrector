// Language detection (engine/language.js) on short texts, with the frequency
// lists loaded as in the extension. node tests/lang.js
// Each case: [text, expected language of its single paragraph].

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.join(__dirname, "../src");
const ctx = { globalThis: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(SRC, "engine/language.js"), "utf8") +
  "\n;globalThis.api = { fcParagraphLanguages, fcSetLanguageLexicon };", ctx);
const { fcParagraphLanguages, fcSetLanguageLexicon } = ctx.globalThis.api;

const CASES = [
  // Reported by the user: bug titles and short English notes with no function word.
  ["Bodies list incoherent display", "en"],
  ["Fix login button alignment", "en"],
  ["Update dependencies", "en"],
  ["Remove unused imports", "en"],
  ["Add dark mode support", "en"],
  ["Broken link on homepage", "en"],
  ["Wrong total amount displayed", "en"],
  ["Crash when opening settings", "en"],
  ["Missing translation strings", "en"],
  ["Happy birthday!", "en"],
  ["Sounds great, thanks", "en"],
  ["Meeting moved to Thursday", "en"],
  ["Sorry, running late", "en"],
  // Short French, with accents or not, and French full of English words.
  ["Réunion décalée à demain", "fr"],
  ["Merci beaucoup", "fr"],
  ["Liste des corps incohérente", "fr"],
  ["Bonne journée", "fr"],
  ["Mise à jour des dépendances", "fr"],
  ["Le meeting est décalé, deadline vendredi", "fr"],
  ["On a un bug sur le build de la release.", "fr"],
  ["Rendez-vous chez le dentiste", "fr"],
  ["Envoyé depuis mon téléphone", "fr"],
  ["Super soirée hier soir", "fr"],
  ["Code promo valable jusqu'à dimanche", "fr"],
  ["Je te fais un point demain sur le planning", "fr"],
  ["Ok pour moi, on fait comme ça", "fr"],
  ["Nouvelle version disponible", "fr"],
  ["Petite question rapide", "fr"],
  ["Dernière chance d'en avoir une !", "fr"],
];

const [mode] = process.argv.slice(2);
if (mode !== "--no-lexicon") {
  fcSetLanguageLexicon(
    fs.readFileSync(path.join(SRC, "data/fr-freq.txt"), "utf8"),
    fs.readFileSync(path.join(SRC, "data/en-freq.txt"), "utf8"),
  );
}
let ok = 0;
for (const [text, want] of CASES) {
  const got = fcParagraphLanguages([text])[0];
  if (got === want) ok++;
  else console.log(`RATÉ  ${want} attendu, ${got} trouvé : ${text}`);
}
console.log(`${ok}/${CASES.length} bien détectés${mode === "--no-lexicon" ? " (sans les listes de fréquence)" : ""}`);
process.exitCode = ok === CASES.length ? 0 : 1;
