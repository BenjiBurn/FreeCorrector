// False-alarm check on real, edited prose: a few Wikipedia articles in French and
// English. Every alert there is suspect; new rules must not add any.
// node tests/wiki.js [fr|en] [--show RULE_ID]
// The articles are downloaded once into tests/.wiki/ (git-ignored, CC BY-SA texts).
const fs = require("fs");
const path = require("path");
const https = require("https");
const run = require("./run.js");

const ARTICLES = {
  fr: ["Cuisine française", "Football", "Intelligence artificielle", "Montagne", "Révolution française", "Victor Hugo"],
  en: ["Albert Einstein", "Artificial intelligence", "Association football"],
};
const DIR = path.join(__dirname, ".wiki");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "FreeCorrector-tests/1.0 (https://github.com/BenjiBurn/FreeCorrector)" } }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (d) => (body += d));
      res.on("end", () => (res.statusCode === 200 ? resolve(body) : reject(new Error(`${res.statusCode} ${url}`))));
    }).on("error", reject);
  });
}

async function article(lang, title) {
  const file = path.join(DIR, `${lang}-${title.replace(/[^\p{L}\p{N}]+/gu, "_")}.txt`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=${encodeURIComponent(title)}`;
  const pages = JSON.parse(await get(url)).query.pages;
  const text = Object.values(pages)[0].extract
    // Section titles and reference lists are not prose.
    .split("\n").filter((l) => l.trim() && !/^=+ .* =+$/.test(l.trim())).join("\n");
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(file, text);
  return text;
}

(async () => {
  const args = process.argv.slice(2);
  const show = args.includes("--show") ? args[args.indexOf("--show") + 1] : null;
  const langs = args.find((a) => a === "fr" || a === "en") ? [args.find((a) => a === "fr" || a === "en")] : ["fr", "en"];
  for (const lang of langs) {
    let call;
    if (lang === "fr") {
      call = run.loadWorker("engine/grammalecte-worker.js");
      call("init", { options: { apos: false, num: false } });
    } else {
      run.patchFsForWindowsUrls();
      globalThis.self = globalThis;
      const english = await import(require("url").pathToFileURL(path.join(__dirname, "../src/engine/english.js")).href);
      await english.init({ dialect: "us" });
      call = (_type, { text }) => english.check(text);
    }
    const counts = new Map();
    let words = 0;
    for (const title of ARTICLES[lang]) {
      const text = await article(lang, title);
      for (const paragraph of text.split("\n")) {
        words += (paragraph.match(/\p{L}+/gu) ?? []).length;
        for (const m of await call("check", { text: paragraph })) {
          const id = m.ruleId.replace(/__b\d.*$/, "");
          counts.set(id, (counts.get(id) ?? 0) + 1);
          if (show && id === show) console.log(`   [${m.word} -> ${m.replacements[0]}] …${paragraph.slice(Math.max(0, m.offset - 40), m.offset + m.length + 40)}…`);
        }
      }
    }
    console.log(`\n=== ${lang} : ${words} mots, ${[...counts.values()].reduce((a, b) => a + b, 0)} alertes`);
    for (const [id, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(6)} ${id}`);
  }
})();
