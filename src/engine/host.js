// Hosts the checking engines (Web Workers) and answers check requests.
// Runs in the Firefox background page, and in an offscreen document on
// Chromium, where the background is a service worker that cannot start
// workers. It receives the settings with each request: offscreen documents
// have no access to extension storage.
//
// Engines: French = Grammalecte (grammalecte-worker.js, classic worker),
// English = Harper (english-worker.js, module worker with WebAssembly).
// With the "auto" language, each paragraph goes to the engine of its own
// language (language.js).

/* global fcApi, fcParagraphLanguages */
/* exported fcEngineCheck */

const FC_MAX_TEXT_LENGTH = 50000;
const FC_RESULT_CACHE_SIZE = 50;

// Extra Grammalecte rules turned on by the "picky" setting.
const FC_PICKY_OPTIONS = ["apos", "num", "esp", "nbsp", "unit", "poncfin", "neg", "redon1", "redon2"];

// A worker answering { id, type, ... } requests with { id, result | error }.
class FcWorkerClient {
  constructor(path, workerOptions) {
    this.path = path;
    this.workerOptions = workerOptions;
    this.worker = null;
    this.ready = null;
    this.options = null; // JSON of the options the worker was initialised with
    this.pending = new Map();
    this.nextId = 1;
  }

  call(type, payload) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, ...payload });
    });
  }

  start() {
    this.worker = new Worker(fcApi.runtime.getURL(this.path), this.workerOptions);
    this.worker.onmessage = ({ data }) => {
      const p = this.pending.get(data.id);
      if (!p) return;
      this.pending.delete(data.id);
      if (data.error) p.reject(new Error(data.error));
      else p.resolve(data.result);
    };
    this.worker.onerror = (event) => {
      console.error(`[FreeCorrector] ${this.path}:`, event.message);
      for (const p of this.pending.values()) p.reject(new Error(event.message || "worker error"));
      this.pending.clear();
      this.worker = null;
      this.ready = null;
    };
  }

  // Starts the worker if needed and (re)initialises it when options change.
  async ensure(options) {
    const json = JSON.stringify(options);
    if (!this.worker) {
      this.start();
      this.options = null;
    }
    if (this.options !== json) {
      this.options = json;
      this.ready = this.call("init", { options }).catch((err) => {
        // Start from scratch on the next check instead of failing forever.
        this.worker?.terminate();
        this.worker = null;
        this.ready = null;
        throw err;
      });
    }
    await this.ready;
  }

  async check(text, options) {
    await this.ensure(options);
    return this.call("check", { text });
  }
}

const fcEngines = {
  fr: new FcWorkerClient("engine/grammalecte-worker.js"),
  en: new FcWorkerClient("engine/english-worker.js", { type: "module" }),
};

const fcResultCache = new Map();

function fcEngineOptions(lang, settings) {
  if (lang === "en") return { dialect: settings.englishDialect ?? "us", picky: !!settings.picky };
  const picky = !!settings.picky;
  const options = { fcPicky: picky };
  for (const name of FC_PICKY_OPTIONS) options[name] = picky;
  return options;
}

async function fcCheckWith(lang, text, settings) {
  const options = fcEngineOptions(lang, settings);
  const key = `${lang}|${JSON.stringify(options)}|${text}`;
  let matches = fcResultCache.get(key);
  if (matches) {
    fcResultCache.delete(key);
  } else {
    matches = await fcEngines[lang].check(text, options);
  }
  fcResultCache.set(key, matches);
  if (fcResultCache.size > FC_RESULT_CACHE_SIZE) fcResultCache.delete(fcResultCache.keys().next().value);
  return matches.map((m) => ({ ...m, lang }));
}

function fcFilterDictionary(matches, dictionary) {
  if (!dictionary?.length) return matches;
  const words = new Set(dictionary.map((w) => w.toLowerCase()));
  return matches.filter((m) => m.category !== "spelling" || !words.has(m.word.toLowerCase()));
}

// `settings`: { language: "auto" | "fr" | "en", picky, dictionary, englishDialect }.
// Returns { matches } or { error }.
async function fcEngineCheck(text, settings) {
  if (text.length > FC_MAX_TEXT_LENGTH) return { error: "too-long" };
  const paragraphs = text.split("\n");
  const wanted = settings.language ?? "auto";
  const langs = wanted === "auto" ? fcParagraphLanguages(paragraphs) : paragraphs.map(() => wanted);

  // Each engine gets the whole text with the other language's paragraphs
  // blanked out: offsets stay the same, results just add up.
  const jobs = [];
  for (const lang of new Set(langs)) {
    if (!fcEngines[lang]) continue;
    const own = paragraphs.map((p, i) => (langs[i] === lang ? p : " ".repeat(p.length))).join("\n");
    if (own.trim()) jobs.push(fcCheckWith(lang, own, settings));
  }
  const matches = (await Promise.all(jobs)).flat().sort((a, b) => a.offset - b.offset);
  return { matches: fcFilterDictionary(matches, settings.dictionary) };
}
