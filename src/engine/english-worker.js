// Module worker running the English engine (english.js, Harper).
// Same protocol as grammalecte-worker.js:
//   in:  { id, type: "init", options } | { id, type: "check", text }
//   out: { id, result } | { id, error }

import { init, check } from "./english.js";

self.onmessage = async (event) => {
  const { id, type } = event.data;
  try {
    let result;
    if (type === "init") result = await init(event.data.options);
    else if (type === "check") result = await check(String(event.data.text ?? ""));
    else throw new Error(`Unknown message type: ${type}`);
    self.postMessage({ id, result });
  } catch (err) {
    console.error("[FreeCorrector English worker]", err);
    self.postMessage({ id, error: String(err?.message ?? err) });
  }
};
