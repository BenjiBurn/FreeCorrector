// The conjugator's engines, in a worker of their own (the checker's worker is
// not needed for this page):
// - French: Grammalecte's conjugation tables. In a worker conj.js does not try
//   to load its data by itself (it does wherever `browser` or `chrome` exist,
//   with a path that is not ours), and the synchronous loading of
//   conj_data.json is acceptable.
// - English: en-conj.js and its verb list en-verbs.js.
// Each one is loaded the first time it is asked for.
//
// Messages in:  { id, type: "verbs", lang } | { id, type: "table", lang, verb, … options }
//   French options: pro, neg, tpsco, int, fem; English: neg, int, contr, dialect.
// Messages out: { id, result } | { id, error }

"use strict";

const VENDOR = "../vendor/grammalecte/";

/* global helpers, conj, Verb, fcEnConj */

let frenchReady = false;
function french() {
  if (!frenchReady) {
    importScripts(VENDOR + "graphspell/helpers.js", VENDOR + "fr/conj.js");
    conj.init(helpers.loadFile(new URL(VENDOR + "fr/conj_data.json", self.location.href).href));
    frenchReady = true;
  }
}

function english() {
  if (typeof fcEnConj === "undefined") importScripts("en-verbs.js", "en-conj.js");
  return fcEnConj;
}

// Every verb the tables know.
function verbs() {
  french();
  return Object.keys(conj._dVerb);
}

// "1ᵉʳ groupe · transitif (+ usage pronominal) impersonnel" -> the tags after
// the group: ["transitif", "+ usage pronominal", "impersonnel"].
function infoTags(sInfo) {
  const [, rest = ""] = sInfo.split(" · ");
  if (rest.startsWith("#")) return [];
  const tags = [];
  const kind = rest.replace(/\s*\(\+ usage pronominal\)/, "").replace(/\s*impersonnel$/, "").trim();
  if (kind) tags.push(kind);
  if (rest.includes("(+ usage pronominal)")) tags.push("+ usage pronominal");
  if (/impersonnel$/.test(rest)) tags.push("impersonnel");
  return tags;
}

// The table of one verb with the options of the page, or null for an unknown verb.
function table({ verb, pro = false, neg = false, tpsco = false, int = false, fem = false }) {
  french();
  verb = String(verb ?? "");
  if (!conj.isVerb(verb)) return null;
  let v;
  try {
    v = new Verb(verb);
  } catch {
    return null;
  }
  // "Pronominal" only on a verb that has a pronominal form.
  pro = !!pro && v.nPronominable >= 0;
  return {
    verb,
    // "se laver", "s’asseoir", "s’en aller": the name in the search field.
    name: v.infinitif(pro, false, false, false, false),
    group: v.cGroup,
    groupLabel: conj._dGroup.get(v.cGroup) ?? "",
    info: infoTags(v.sInfo),
    pronominable: v.nPronominable,
    pro,
    table: v.createConjTable(pro, !!neg, !!tpsco, !!int, !!fem),
  };
}

self.onmessage = (event) => {
  const { id, type, lang } = event.data;
  try {
    let result;
    const en = lang === "en";
    if (type === "verbs") result = en ? english().verbs() : verbs();
    else if (type === "table") result = en ? english().table(String(event.data.verb ?? ""), event.data) : table(event.data);
    else if (type === "lookup") result = english().lookup(String(event.data.verb ?? ""));
    else throw new Error(`Unknown message type: ${type}`);
    self.postMessage({ id, result });
  } catch (err) {
    console.error("[FreeCorrector conjugator]", err);
    self.postMessage({ id, error: String(err?.message ?? err) });
  }
};
