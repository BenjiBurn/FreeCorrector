// Runs the real engine worker under Node and scores it on a corpus.
//
//   node tests/run.js            French corpus, failures only
//   node tests/run.js --all      print every case
//
// The worker is loaded in a VM context that mimics a DedicatedWorkerGlobalScope
// (importScripts, synchronous XHR on local files, postMessage).

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL, fileURLToPath } = require("url");

const SRC = path.join(__dirname, "..", "src");

function loadWorker(file) {
  const workerUrl = pathToFileURL(path.join(SRC, file)).href;
  const out = [];
  const ctx = {
    console: { ...console, log() {} },
    URL, Map, Set, WebAssembly, TextDecoder, TextEncoder,
    location: { href: workerUrl },
    postMessage: (m) => out.push(m),
    XMLHttpRequest: class {
      open(_method, url) { this.url = url; }
      overrideMimeType() {}
      send() { this.responseText = fs.readFileSync(fileURLToPath(this.url), "utf8"); }
    },
    importScripts: (...urls) => {
      for (const u of urls) {
        const file = fileURLToPath(new URL(u, workerUrl));
        vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
      }
    },
  };
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(fileURLToPath(workerUrl), "utf8"), ctx, { filename: file });
  let id = 0;
  const call = (type, payload) => {
    ctx.onmessage({ data: { id: ++id, type, ...payload } });
    const res = out.pop();
    if (res.error) throw new Error(res.error);
    return res.result;
  };
  return call;
}

const norm = (s) => (s ?? "").replace(/'/g, "’").replace(/[  ]/g, " ");

async function score(call, corpus, verbose) {
  const stats = { cases: 0, errors: 0, detected: 0, top1: 0, top3: 0, clean: 0, falsePos: 0 };
  const failures = [];
  const t0 = Date.now();

  for (const [text, wrong, expected] of corpus) {
    stats.cases++;
    const matches = await call("check", { text });
    const show = (m) => `${JSON.stringify(m.word)} -> ${m.replacements.slice(0, 4).join(" | ")}`;

    if (wrong === null) {
      stats.clean++;
      if (matches.length) {
        stats.falsePos++;
        failures.push(`FAUSSE ALERTE  ${text}\n                ${matches.map(show).join("\n                ")}`);
      } else if (verbose) console.log(`ok             ${text}`);
      continue;
    }

    stats.errors++;
    // The wrong text as a whole word ("a" in "à demain", not in "demain").
    let at = -1;
    for (let k = text.indexOf(wrong); k >= 0; k = text.indexOf(wrong, k + 1)) {
      const before = text[k - 1] ?? " ";
      const after = text[k + wrong.length] ?? " ";
      if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)) {
        at = k;
        break;
      }
    }
    if (at < 0) at = text.indexOf(wrong);
    const hit =
      matches.find((m) => norm(m.word) === norm(wrong)) ??
      matches.find((m) => m.offset < at + wrong.length && at < m.offset + m.length);
    if (!hit) {
      failures.push(`NON DÉTECTÉ    ${text}   [${wrong} → ${expected}]` +
        (matches.length ? `\n                autres : ${matches.map(show).join(" ; ")}` : ""));
      continue;
    }
    stats.detected++;
    const repl = hit.replacements.map(norm);
    // Same corrected sentence counts as the same fix ("an" -> "a" for "an university" -> "a university").
    const wanted = norm(text.slice(0, at) + expected + text.slice(at + wrong.length));
    const fixedWith = (r) => norm(text.slice(0, hit.offset) + r + text.slice(hit.offset + hit.length));
    let rank = repl.indexOf(norm(expected));
    if (rank !== 0 && wanted.length && fixedWith(hit.replacements[0] ?? "") === wanted) rank = 0;
    if (rank === 0) stats.top1++;
    if (rank >= 0 && rank < 3) stats.top3++;
    if (rank !== 0) {
      failures.push(`MAUVAIS RANG   ${text}   [${wrong} → ${expected}] rang ${rank < 0 ? "absent" : rank + 1}\n                ${show(hit)}`);
    } else if (verbose) console.log(`ok             ${text}`);
  }

  const ms = Date.now() - t0;
  const pct = (a, b) => `${((100 * a) / Math.max(b, 1)).toFixed(1)} %`;
  console.log(failures.join("\n"));
  console.log("\n" + "─".repeat(60));
  console.log(`Cas : ${stats.cases} (${stats.errors} fautes, ${stats.clean} phrases correctes) en ${ms} ms`);
  console.log(`Détectées          : ${stats.detected}/${stats.errors}  ${pct(stats.detected, stats.errors)}`);
  console.log(`Bonne suggestion #1: ${stats.top1}/${stats.errors}  ${pct(stats.top1, stats.errors)}`);
  console.log(`Dans le top 3      : ${stats.top3}/${stats.errors}  ${pct(stats.top3, stats.errors)}`);
  console.log(`Fausses alertes    : ${stats.falsePos}/${stats.clean}`);
  return stats;
}

module.exports = { loadWorker, score, patchFsForWindowsUrls };

// The English engine is an ES module: import it with a worker-like global.
// Harper reads its WebAssembly file under Node with
// fs.readFile(new URL(binary).pathname), which gives "/C:/…" on Windows.
// Fixed here, for the tests only: the browser never takes that path, and the
// vendored Harper files stay identical to the published package.
function patchFsForWindowsUrls() {
  const fsModule = require("fs");
  if (process.platform !== "win32" || fsModule.readFile.fcPatched) return;
  const original = fsModule.readFile;
  const readFile = (file, ...rest) =>
    original(typeof file === "string" && /^\/[A-Za-z]:\//.test(file) ? file.slice(1) : file, ...rest);
  readFile.fcPatched = true;
  fsModule.readFile = readFile;
  require("module").syncBuiltinESMExports();
}

async function loadEnglish() {
  patchFsForWindowsUrls();
  globalThis.self = globalThis;
  const english = await import(pathToFileURL(path.join(SRC, "engine", "english.js")).href);
  await english.init({ dialect: "us" });
  return (_type, { text }) => english.check(text);
}

if (require.main === module) {
  (async () => {
    const verbose = process.argv.includes("--all");
    const only = process.argv.find((a) => a === "fr" || a === "en");
    // Any other argument keeps only the corpora whose name contains it.
    const pick = process.argv.slice(2).filter((a) => !["fr", "en", "--all"].includes(a));
    const wanted = (corpus) => !pick.length || pick.some((p) => corpus.includes(p));
    if (only !== "en") {
      const call = loadWorker("engine/grammalecte-worker.js");
      call("init", { options: { apos: false, num: false } });
      for (const corpus of ["./fr-corpus.js", "./fr-holdout.js", "./fr-blind.js", "./fr-blind2.js", "./fr-blind3.js", "./fr-blind4.js", "./fr-dumb.js", "./fr-dumb2.js", "./fr-blind5.js", "./fr-blind-agent-a.js", "./fr-blind-agent-b.js", "./fr-blind-agent-e.js", "./fr-blind-agent-h.js", "./mix-blind-agent-k.js", "./fr-blind-agent-l.js", "./fr-tense-agent-o.js", "./clean-messages.js", "./clean-agent-d.js", "./clean-agent-g.js", "./clean-agent-j.js", "./clean-agent-n.js"]) {
        if (!wanted(corpus) || !fs.existsSync(path.join(__dirname, corpus))) continue;
        console.log(`\n=== ${corpus}`);
        await score(call, require(corpus).fr ?? require(corpus), verbose);
      }
      // The missing "ne" is only reported in picky mode.
      if (wanted("./fr-ne.js")) {
        const picky = loadWorker("engine/grammalecte-worker.js");
        picky("init", { options: { fcPicky: true, neg: true } });
        console.log("\n=== ./fr-ne.js (mode exigeant)");
        await score(picky, require("./fr-ne.js"), verbose);
      }
    }
    if (only !== "fr") {
      const call = await loadEnglish();
      for (const corpus of ["./en-corpus.js", "./en-holdout.js", "./en-blind2.js", "./en-blind3.js", "./en-blind4.js", "./en-dumb.js", "./en-dumb2.js", "./en-blind-agent-c.js", "./en-blind-agent-f.js", "./en-blind-agent-i.js", "./mix-blind-agent-k.js", "./en-blind-agent-m.js", "./clean-messages.js", "./clean-agent-d.js", "./clean-agent-g.js", "./clean-agent-j.js", "./clean-agent-n.js"]) {
        if (!wanted(corpus) || !fs.existsSync(path.join(__dirname, corpus))) continue;
        console.log(`\n=== ${corpus}`);
        await score(call, require(corpus).en ?? require(corpus), verbose);
      }
    }
  })();
}
