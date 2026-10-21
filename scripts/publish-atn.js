// Sends the Thunderbird package of this version to addons.thunderbird.net
// through its API, when the upload page of the site keeps failing (502):
//
//   node scripts/publish-atn.js
//
// Uploads dist/freecorrector-<version>-thunderbird.zip (version from
// src/manifest.json) as a new listed version, then waits for the site's
// validation. The release notes, and the source archive if the reviewers ask
// for it, are then added on the version's page of the Developer Hub.
//
// API key: Developer Hub of addons.thunderbird.net, "Manage API Keys"
// (https://addons.thunderbird.net/developers/addon/api/key/), in the
// environment (ATN_JWT_ISSUER, ATN_JWT_SECRET) or in .atn-credentials.json at
// the root of the repository ({ "issuer": "...", "secret": "..." }), which git
// ignores. Never commit the key.

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const API = "https://addons.thunderbird.net/api/v4";

function credentials() {
  if (process.env.ATN_JWT_ISSUER && process.env.ATN_JWT_SECRET) {
    return { issuer: process.env.ATN_JWT_ISSUER, secret: process.env.ATN_JWT_SECRET };
  }
  const file = path.join(ROOT, ".atn-credentials.json");
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  console.error("Clé API introuvable : ATN_JWT_ISSUER et ATN_JWT_SECRET, ou .atn-credentials.json.");
  process.exit(1);
}

// The JWT the add-ons sites expect: HS256, valid a few minutes, a new jti each time.
function token({ issuer, secret }) {
  const b64 = (data) => Buffer.from(data).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ iss: issuer, jti: crypto.randomUUID(), iat: now, exp: now + 240 }));
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `JWT ${head}.${body}.${sig}`;
}

async function body(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { text: text.slice(0, 300) };
  }
}

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/manifest.json"), "utf8"));
  const { version } = manifest;
  const id = manifest.browser_specific_settings.gecko.id;
  const zip = path.join(ROOT, "dist", `freecorrector-${version}-thunderbird.zip`);
  if (!fs.existsSync(zip)) {
    console.error(`Paquet introuvable : ${zip} (node scripts/build.js thunderbird, depuis le tag).`);
    process.exit(1);
  }
  const key = credentials();
  const url = `${API}/addons/${encodeURIComponent(id)}/versions/${version}/`;

  const form = new FormData();
  form.append("upload", new Blob([fs.readFileSync(zip)], { type: "application/zip" }), path.basename(zip));
  form.append("channel", "listed");
  console.log(`Envoi de ${path.basename(zip)} (version ${version})…`);
  const res = await fetch(url, { method: "PUT", headers: { authorization: token(key) }, body: form });
  let status = await body(res);
  if (res.status === 409) {
    console.log(`Le site a déjà la version ${version} : rien à envoyer.`);
    return;
  }
  if (res.status !== 201 && res.status !== 202) {
    console.error(`Envoi refusé (${res.status}) : ${JSON.stringify(status)}`);
    process.exit(1);
  }

  console.log("Envoyé. Validation en cours…");
  for (let i = 0; !status.processed && i < 60; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const poll = await fetch(status.url || url, { headers: { authorization: token(key) } });
    status = await body(poll);
    if (!poll.ok) {
      console.error(`Suivi impossible (${poll.status}) : ${JSON.stringify(status)}`);
      process.exit(1);
    }
  }
  if (!status.processed) {
    console.error(`Validation pas terminée au bout de 10 minutes : ${status.validation_url ?? status.url ?? url}`);
    process.exit(1);
  }
  if (!status.valid) {
    console.error(`Validation échouée : ${status.validation_url ?? JSON.stringify(status.validation_results)}`);
    process.exit(1);
  }
  console.log(`Version ${version} validée et envoyée en vérification.`);
  console.log(`Notes de version : https://addons.thunderbird.net/developers/addon/${encodeURIComponent(id)}/versions`);
})().catch((err) => {
  console.error(`Erreur : ${err.message}`);
  process.exit(1);
});
