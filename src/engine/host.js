// Hosts the grammar-checking engine (a Web Worker) and answers check requests.
// Runs in the Firefox background page, and in an offscreen document on
// Chromium, where the background is a service worker that cannot start
// workers. It receives the settings with each request: offscreen documents
// have no access to extension storage.

/* global fcApi */
/* exported fcEngineCheck */

const FC_MAX_TEXT_LENGTH = 50000;
const FC_RESULT_CACHE_SIZE = 50;

// Extra Grammalecte rules turned on by the "picky" setting.
const FC_PICKY_OPTIONS = ["apos", "num", "esp", "nbsp", "unit", "poncfin", "neg", "redon1", "redon2"];

const fcResultCache = new Map();
const fcPending = new Map();
let fcWorker = null;
let fcWorkerReady = null;
let fcWorkerPicky = null; // the "picky" value the worker was initialised with
let fcNextId = 1;

function fcEngineOptions(picky) {
  const options = { fcPicky: picky };
  for (const name of FC_PICKY_OPTIONS) options[name] = picky;
  return options;
}

function fcCallWorker(type, payload) {
  const id = fcNextId++;
  return new Promise((resolve, reject) => {
    fcPending.set(id, { resolve, reject });
    fcWorker.postMessage({ id, type, ...payload });
  });
}

function fcStartWorker(picky) {
  fcWorker = new Worker(fcApi.runtime.getURL("engine/grammalecte-worker.js"));
  fcWorker.onmessage = ({ data }) => {
    const p = fcPending.get(data.id);
    if (!p) return;
    fcPending.delete(data.id);
    if (data.error) p.reject(new Error(data.error));
    else p.resolve(data.result);
  };
  fcWorker.onerror = (event) => {
    console.error("[FreeCorrector] worker error", event.message);
    for (const p of fcPending.values()) p.reject(new Error(event.message || "worker error"));
    fcPending.clear();
    fcWorker = null;
    fcWorkerReady = null;
  };
  fcWorkerPicky = picky;
  fcWorkerReady = fcCallWorker("init", { options: fcEngineOptions(picky) }).catch((err) => {
    // Start from scratch on the next check instead of failing forever.
    fcWorker?.terminate();
    fcWorker = null;
    fcWorkerReady = null;
    throw err;
  });
  return fcWorkerReady;
}

async function fcEnsureWorker(picky) {
  if (!fcWorker) {
    await fcStartWorker(picky);
    return;
  }
  await fcWorkerReady;
  if (fcWorkerPicky !== picky) {
    fcWorkerPicky = picky;
    fcResultCache.clear();
    fcWorkerReady = fcCallWorker("init", { options: fcEngineOptions(picky) });
    await fcWorkerReady;
  }
}

function fcFilterDictionary(matches, dictionary) {
  if (!dictionary?.length) return matches;
  const words = new Set(dictionary.map((w) => w.toLowerCase()));
  return matches.filter((m) => m.category !== "spelling" || !words.has(m.word.toLowerCase()));
}

// `settings`: { picky, dictionary }. Returns { matches } or { error }.
async function fcEngineCheck(text, settings) {
  if (text.length > FC_MAX_TEXT_LENGTH) return { error: "too-long" };
  const picky = !!settings.picky;
  await fcEnsureWorker(picky);

  const key = `${picky}|${text}`;
  let matches = fcResultCache.get(key);
  if (matches) {
    fcResultCache.delete(key);
  } else {
    matches = await fcCallWorker("check", { text });
  }
  fcResultCache.set(key, matches);
  if (fcResultCache.size > FC_RESULT_CACHE_SIZE) fcResultCache.delete(fcResultCache.keys().next().value);

  return { matches: fcFilterDictionary(matches, settings.dictionary) };
}
