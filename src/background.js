// Owns the grammar-checking engine. Content scripts send { type: "check", text }
// and get back { matches } or { error }. Everything runs locally: no text ever
// leaves the browser.

const MAX_TEXT_LENGTH = 50000;
const CACHE_SIZE = 50;

// Extra Grammalecte rules turned on by the "picky" setting.
const PICKY_OPTIONS = ["apos", "num", "esp", "nbsp", "unit", "poncfin", "neg", "redon1", "redon2"];

const cache = new Map();
let worker = null;
let workerReady = null;
let nextId = 1;
const pending = new Map();

function engineOptions(settings) {
  const options = {};
  for (const name of PICKY_OPTIONS) options[name] = settings.picky;
  options.fcPicky = settings.picky;
  return options;
}

function callWorker(type, payload) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, ...payload });
  });
}

function startWorker(settings) {
  worker = new Worker(fcApi.runtime.getURL("engine/grammalecte-worker.js"));
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    if (data.error) p.reject(new Error(data.error));
    else p.resolve(data.result);
  };
  worker.onerror = (event) => {
    console.error("[FreeCorrector] worker error", event.message);
    for (const p of pending.values()) p.reject(new Error(event.message || "worker error"));
    pending.clear();
    worker = null;
    workerReady = null;
  };
  workerReady = callWorker("init", { options: engineOptions(settings) }).catch((err) => {
    // Start from scratch on the next check instead of failing forever.
    worker?.terminate();
    worker = null;
    workerReady = null;
    throw err;
  });
  return workerReady;
}

async function ensureWorker(settings) {
  if (!worker) await startWorker(settings);
  else await workerReady;
}

function filterDictionary(matches, dictionary) {
  if (!dictionary.length) return matches;
  const words = new Set(dictionary.map((w) => w.toLowerCase()));
  return matches.filter((m) => m.category !== "spelling" || !words.has(m.word.toLowerCase()));
}

async function check(text) {
  if (text.length > MAX_TEXT_LENGTH) return { error: "too-long" };
  const settings = await fcGetSettings();

  const key = `${settings.picky}|${text}`;
  let matches = cache.get(key);
  if (matches) {
    cache.delete(key);
  } else {
    await ensureWorker(settings);
    matches = await callWorker("check", { text });
  }
  cache.set(key, matches);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);

  return { matches: filterDictionary(matches, settings.dictionary) };
}

fcApi.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !("picky" in changes)) return;
  cache.clear();
  if (worker) {
    fcGetSettings().then((s) => callWorker("init", { options: engineOptions(s) }));
  }
});

fcApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "check") return false;
  check(String(msg.text ?? "")).then(sendResponse, (err) => {
    console.error("[FreeCorrector]", err);
    sendResponse({ error: String(err?.message ?? err) });
  });
  return true;
});
