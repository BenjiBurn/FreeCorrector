// Robustness: odd and extreme texts must neither crash the engines, nor
// produce misplaced underlines, nor take too long.
// Usage: node tests/stress.mjs

import { createRequire } from "module";

const require = createRequire(import.meta.url);
globalThis.self = globalThis;
const { loadWorker, patchFsForWindowsUrls } = require("./run.js");
patchFsForWindowsUrls();

const fr = loadWorker("engine/grammalecte-worker.js");
fr("init", { options: {} });
const en = await import("../src/engine/english.js");
await en.init({});
await en.check("Warm up."); // the first check compiles the WebAssembly engine

const sentencesFr = "Victor Hugo est né à Besançon en 1802. Il a écrit Les Misérables, un roman publié en 1862. ";
const sentencesEn = "Victor Hugo was born in Besançon in 1802. He wrote Les Misérables, a novel published in 1862. ";
const cases = [
  ["", 100], [" ", 100], ["\n\n\n", 100], ["a", 100], ["À", 100], ["'", 100], ["’’’", 100], ["--", 100],
  ["...", 100], ["!!!???", 100], ["😀😀 je suis aller 🎉 au parc", 500], ["x".repeat(5000), 500],
  ["https://exemple.fr/a?b=c&d=e jai vu", 500], ["const x = (a) => a + 1; // jai", 500],
  ["<b>Bonjour</b> je suis aller", 500], ["Ça va ? Oui !", 500], ["l'l'l'l' qu'qu'", 500],
  ["Iñtërnâtiônàlizætiøn", 500], ["𝔘𝔫𝔦𝔠𝔬𝔡𝔢 text", 500], ["\t\tje\tsuis\taller", 500],
  ["ß ẞ ǅ İ ı", 500], ["1234 5678,90 €", 500],
  ["Je suis aller ".repeat(2000), 8000], // one 28,000-character paragraph full of errors
  [`${sentencesFr}\n`.repeat(300), 8000], // a long French text
  [`${sentencesEn}\n`.repeat(300), 8000], // a long English text
];

let failures = 0;
for (const [text, budget] of cases) {
  for (const [name, run] of [["fr", (t) => fr("check", { text: t })], ["en", (t) => en.check(t)]]) {
    const label = `${name} ${JSON.stringify(text.slice(0, 30))}${text.length > 30 ? `… (${text.length})` : ""}`;
    const t0 = Date.now();
    try {
      const matches = await run(text);
      for (const m of matches) {
        if (!(m.offset >= 0 && m.offset + m.length <= text.length && text.slice(m.offset, m.offset + m.length) === m.word)) {
          throw new Error(`misplaced match ${JSON.stringify(m.word)} at ${m.offset}`);
        }
      }
    } catch (err) {
      failures++;
      console.log(`ÉCHEC   ${label}: ${String(err).slice(0, 200)}`);
      continue;
    }
    const ms = Date.now() - t0;
    if (ms > budget) {
      failures++;
      console.log(`LENT    ${label}: ${ms} ms (budget ${budget} ms)`);
    }
  }
}
console.log(failures ? `\n${failures} problème(s)` : `\nOK : ${cases.length * 2} textes extrêmes, aucun problème`);
process.exit(failures ? 1 : 0);
