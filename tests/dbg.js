// Shows what the engine reports for a few sentences.
// node tests/dbg.js fr|en "sentence" ["sentence" …]   (fr: add --picky for picky mode)
const run = require("./run.js");

(async () => {
  const args = process.argv.slice(2);
  const picky = args.includes("--picky");
  const [lang, ...texts] = args.filter((a) => a !== "--picky");
  let call;
  if (lang === "fr") {
    call = run.loadWorker("engine/grammalecte-worker.js");
    call("init", { options: picky ? { fcPicky: true, neg: true } : { apos: false, num: false } });
  } else {
    run.patchFsForWindowsUrls();
    globalThis.self = globalThis;
    const english = await import(require("url").pathToFileURL(require("path").join(__dirname, "../src/engine/english.js")).href);
    await english.init({ dialect: "us" });
    call = (_type, { text }) => english.check(text);
  }
  for (const text of texts) {
    const matches = await call("check", { text });
    console.log(text);
    for (const m of matches) console.log(`   ${JSON.stringify(m.word)} [${m.ruleId}] -> ${m.replacements.slice(0, 4).join(" | ")}  // ${m.message}`);
  }
})();
