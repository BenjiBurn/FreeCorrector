// The English verbs of the conjugator (src/conjugator/en-verbs.js): which
// words are verbs, most common first, and how their regular forms are spelt.
//
//   node scripts/en-verbs.js
//
// - Which words are verbs, and the spelling of their forms: Harper's dictionary
//   (harper-core/dictionary.dict, Apache-2.0), at a fixed commit, downloaded
//   once into dist/cache/. It marks verbs (V), the regular ones (d: -ed), and
//   lists the other forms with their dialect: "stopped", "travelled" (British),
//   "traveled" (American).
// - How common they are: src/data/en-freq.txt (FrequencyWords, CC BY-SA 4.0).
// - The irregular verbs and the spelling rules: src/conjugator/en-conj.js.
//
// Each verb is written "verb" or "verb:flags", flags as en-conj.js reads them:
// d doubles the last letter (stopped), g only in Britain (travelled), k adds a
// k (panicked), e -es in the 3rd person (vetoes), E keeps the e (singeing),
// i irregular through a prefix (outgrow: outgrew).

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const HARPER_COMMIT = "a498d472381ef73363d88363cce745ee67311bf4";
const HARPER_URL = `https://raw.githubusercontent.com/Automattic/harper/${HARPER_COMMIT}/harper-core/dictionary.dict`;
const CACHE = path.join(ROOT, "dist", "cache", `harper-${HARPER_COMMIT.slice(0, 7)}.dict`);
const OUT = path.join(ROOT, "src", "conjugator", "en-verbs.js");
const NOT_VERBS = new Set(["yes", "er", "um", "oh", "ah", "pres", "dis", "frig", "shag", "crap", "sod", "okay", "ok"]);

function download(url, file) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`${url}: HTTP ${res.statusCode}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.concat(chunks));
        resolve();
      });
    }).on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(CACHE)) {
    console.log(`Téléchargement du dictionnaire de Harper (${HARPER_COMMIT.slice(0, 7)})…`);
    await download(HARPER_URL, CACHE);
  }

  // The engine's rules and irregular verbs, with no verb list.
  const ctx = { globalThis: null };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "src", "conjugator", "en-conj.js"), "utf8"), ctx);
  const { sForm, pastForm, ingForm, irregular, PREFIXES, MODALS } = ctx.fcEnConj._rules;

  // ---------- Harper's dictionary ----------

  const entries = new Map(); // word -> flags
  for (const line of fs.readFileSync(CACHE, "utf8").split("\n")) {
    const text = line.replace(/#.*/, "").trim();
    if (!text) continue;
    const [word, flags = ""] = text.split("/");
    entries.set(word, (entries.get(word) ?? "") + flags);
  }
  // Words made by the dictionary's own suffixes -ed and -ing, with the dialect of their verb.
  const derived = new Map();
  const harperPast = (w) => (w.endsWith("e") ? `${w}d` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ied` : `${w}ed`);
  for (const [word, flags] of entries) {
    if (flags.includes("d")) derived.set(harperPast(word), flags);
    if (flags.includes("G")) derived.set(word.endsWith("e") ? `${word.slice(0, -1)}ing` : `${word}ing`, flags);
  }
  const known = (w) => entries.has(w) || derived.has(w);
  const dialectOf = (w) => {
    const flags = entries.get(w) ?? derived.get(w) ?? "";
    return flags.includes("<") ? "us" : flags.includes("!") ? "gb" : "";
  };

  // ---------- Frequencies ----------

  const freq = new Map();
  for (const line of fs.readFileSync(path.join(ROOT, "src", "data", "en-freq.txt"), "utf8").split("\n")) {
    const [w, n] = line.trim().split(" ");
    if (w) freq.set(w, Number(n));
  }
  const f = (w) => freq.get(w) ?? 0;

  // ---------- The verbs ----------

  // Forms of the irregular verbs: "went", "learnt" are not verbs of their own.
  const irregularForms = new Set(["am", "are", "is", "was", "were", "been", "being"]);
  for (const { past, pp } of irregular.values()) {
    for (const x of [...past, ...pp]) irregularForms.add(x.replace(/[<!]$/, ""));
  }

  const verbs = [];
  for (const [word, flags] of entries) {
    if (!/^[a-z]{2,}$/.test(word) || !flags.includes("V")) continue;
    // Swear words and slang stay out, and words the dictionary marks as verbs
    // that are not ones for a reader.
    if (/[x†]/.test(flags) || NOT_VERBS.has(word)) continue;
    // Forms (went, gone, says, going), not verbs, unless also a verb of their own (lay, found).
    if (/[tTh6j]/.test(flags) && !flags.includes("b") && !irregular.has(word)) continue;
    if (irregularForms.has(word) && !irregular.has(word) && !/[bdG]/.test(flags)) continue;
    if (MODALS[word]) continue;
    verbs.push(word);
  }
  for (const word of irregular.keys()) if (!verbs.includes(word)) verbs.push(word);

  const out = [];
  for (const verb of verbs) {
    const flags = entries.get(verb) ?? "";
    let code = "";
    let base = verb;
    let irr = irregular.has(verb);

    // Irregular through a prefix: outgrow, rebuild (not relay: the dictionary marks it regular).
    if (!irr && !flags.includes("d")) {
      for (const p of PREFIXES) {
        const rest = verb.slice(p.length);
        const forms = irregular.get(rest);
        if (!verb.startsWith(p) || !forms) continue;
        // Its irregular forms must be found somewhere ("rebuilt"; not "outbroke" for outbreak).
        const clean = (x) => p + x.replace(/[<!]$/, "");
        const seen = (w) => w !== verb && (known(w) || f(w) > 0);
        const past0 = clean(forms.past[0]);
        if (seen(past0) || seen(clean(forms.pp[0])) || (past0 === verb && seen(p + ingForm(rest, "", "us")))) {
          code += "i";
          irr = true;
          base = rest;
          break;
        }
      }
    }

    let attested = irr;
    // A form of this verb, not of the same verb with an e: "scared" is scare's, not scar's.
    const withE = entries.get(`${verb}e`) ?? "";
    const knownFor = (w) => known(w) && !(withE.includes("V") &&
      (w === pastForm(`${verb}e`, "", "us") || w === ingForm(`${verb}e`, "", "us")));
    if (!irr) {
      const p0 = pastForm(verb, "", "us");
      const pd = pastForm(verb, "d", "us");
      const pk = pastForm(verb, "k", "us");
      if (verb.endsWith("c") && knownFor(pk) && !knownFor(p0)) {
        code += "k";
      } else if (pd !== p0 && knownFor(pd)) {
        if (dialectOf(pd) === "gb" && knownFor(p0) && dialectOf(p0) !== "gb") code += "g";
        else if (!knownFor(p0) || f(pd) > f(p0)) code += "d";
      }
      // A verb only if the dictionary knows its past or its -ing form ("and", "why" are marked V too).
      attested = knownFor(pastForm(verb, code, "us")) || knownFor(pastForm(verb, code, "gb")) ||
        knownFor(ingForm(verb, code, "us")) || knownFor(ingForm(verb, code, "gb"));
    }
    // An irregular verb's -ing form doubles too: swimming, running, beginning.
    if (irr && base === verb && ingForm(verb, "d", "us") !== ingForm(verb, "", "us") &&
      knownFor(ingForm(verb, "d", "us")) && !knownFor(ingForm(verb, "", "us"))) code += "d";
    if (!attested) continue;
    if (!irr && verb.endsWith("o") && (entries.get(`${verb}es`) ?? "").includes("h")) code += "e";
    if (!irr && verb.endsWith("e") && !/(?:ee|oe|ye|ie)$/.test(verb) && known(`${verb}ing`) && !known(`${verb.slice(0, -1)}ing`)) code += "E";

    // How common: the verb and its forms (the irregular ones are counted with their verb).
    // Past and -ing forms only: an -s is often a plural ("guys").
    // The word alone counts at most four times its forms: "don" (from "don't") and
    // "time" are common words, rarely verbs.
    let forms = 0;
    if (irr) {
      const { past, pp } = irregular.get(base);
      const prefix = verb.slice(0, verb.length - base.length);
      const all = new Set([...past, ...pp].map((x) => prefix + x.replace(/[<!]$/, "")));
      all.add(ingForm(verb, code, "us"));
      all.delete(verb);
      for (const x of all) forms += f(x);
    } else {
      for (const x of new Set([pastForm(verb, code, "us"), pastForm(verb, code, "gb"), ingForm(verb, code, "us"), ingForm(verb, code, "gb")])) {
        if (x !== verb) forms += f(x);
      }
    }
    // (A little for the word alone: picnic, quiz are verbs the subtitles never conjugate.)
    const score = forms + Math.min(f(verb), 4 * forms) + f(verb) / 50;
    out.push({ verb, code, score });
  }
  out.sort((a, b) => b.score - a.score || a.verb.localeCompare(b.verb));

  // ---------- en-verbs.js ----------

  const words = out.map(({ verb, code }) => (code ? `${verb}:${code}` : verb));
  const lines = [];
  let line = "";
  for (const w of words) {
    if (line && line.length + w.length + 1 > 110) {
      lines.push(line);
      line = "";
    }
    line += (line ? " " : "") + w;
  }
  if (line) lines.push(line);
  fs.writeFileSync(OUT, [
    "// The English verbs of the conjugator, most common first, with how their",
    "// regular forms are spelt (see en-conj.js). Made by scripts/en-verbs.js from",
    `// Harper's dictionary (Apache-2.0, commit ${HARPER_COMMIT.slice(0, 7)}) and src/data/en-freq.txt: do not edit.`,
    "",
    "globalThis.FC_EN_VERBS = `",
    ...lines,
    "`;",
    "",
  ].join("\n"));
  const counts = {};
  for (const { code } of out) for (const c of code || "-") counts[c] = (counts[c] ?? 0) + 1;
  console.log(`${path.relative(ROOT, OUT)} : ${out.length} verbes`, counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
