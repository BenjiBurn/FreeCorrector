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
    const at = text.indexOf(wrong);
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
    const rank = repl.indexOf(norm(expected));
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

module.exports = { loadWorker, score };

// The English engine is an ES module: import it with a worker-like global.
async function loadEnglish() {
  globalThis.self = globalThis;
  const english = await import(pathToFileURL(path.join(SRC, "engine", "english.js")).href);
  await english.init({ dialect: "us" });
  return (_type, { text }) => english.check(text);
}

if (require.main === module) {
  (async () => {
    const verbose = process.argv.includes("--all");
    const only = process.argv.find((a) => a === "fr" || a === "en");
    if (only !== "en") {
      const call = loadWorker("engine/grammalecte-worker.js");
      call("init", { options: { apos: false, num: false } });
      for (const corpus of ["./fr-corpus.js", "./fr-holdout.js", "./fr-blind.js", "./fr-blind2.js"]) {
        if (!fs.existsSync(path.join(__dirname, corpus))) continue;
        console.log(`\n=== ${corpus}`);
        await score(call, require(corpus), verbose);
      }
    }
    if (only !== "fr") {
      const call = await loadEnglish();
      for (const corpus of ["./en-corpus.js", "./en-holdout.js", "./en-blind2.js"]) {
        console.log(`\n=== ${corpus}`);
        await score(call, require(corpus), verbose);
      }
    }
  })();
}
