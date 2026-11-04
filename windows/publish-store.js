// Sends the Windows app to the Microsoft Store through the submission API:
//
//   node windows/publish-store.js [--dry-run]
//   node windows/publish-store.js setup   -> adds the "microsoft" entry to .store-credentials.json
//
// The version is the one of windows/app/FreeCorrector.csproj. Its package,
// dist/freecorrector-<version>-windows-x64.msix, is built by windows/package.ps1
// and must carry the Store identity of windows/msix/identity.json. The
// release notes come from windows/NOTES-VERSION.md (section "## <version>").
//
// The API makes the new submission as a copy of the last published one
// (listing, price, age rating…); the script replaces its package and its
// release notes, uploads the package and commits the submission. Microsoft's
// certification follows, then the publication. The very first submission is
// made by hand in Partner Center: the API refuses an app without one.
// --dry-run checks the package, the keys and the app's state, without
// sending anything.
//
// Keys: .store-credentials.json, "microsoft": tenantId, clientId and
// clientSecret of the Microsoft Entra application added in Partner Center
// (Account settings > Users > Microsoft Entra applications, Manager role).
// Never commit it, never print it.

"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const CREDENTIALS = path.join(ROOT, ".store-credentials.json");
const APP_ID = "9P3GM2HR6BZB";
const API = `https://manage.devcenter.microsoft.com/v1.0/my/applications/${APP_ID}`;
const KEYS = ["tenantId", "clientId", "clientSecret"];

const csproj = fs.readFileSync(path.join(__dirname, "app/FreeCorrector.csproj"), "utf8");
const VERSION = csproj.match(/<Version>([^<]+)<\/Version>/)[1];
const PACKAGE = path.join(ROOT, "dist", `freecorrector-${VERSION}-windows-x64.msix`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (text) => console.log(`microsoft  ${text}`);

async function readBody(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { text: text.replace(/\s+/g, " ").slice(0, 200) };
  }
}

// ---------- Release notes ----------

function releaseNotes() {
  const text = fs.readFileSync(path.join(__dirname, "NOTES-VERSION.md"), "utf8");
  const start = text.indexOf(`\n## ${VERSION}\n`);
  if (start < 0) throw new Error(`pas de section « ## ${VERSION} » dans windows/NOTES-VERSION.md`);
  const next = text.indexOf("\n## ", start + 1);
  const section = text.slice(start, next < 0 ? undefined : next);
  const block = (title) => {
    const m = section.match(new RegExp(String.raw`\*\*${title}[^\n]*\n+` + "```text\\n([\\s\\S]*?)```"));
    return m ? m[1].trim() : "";
  };
  const notes = { fr: block("Français"), en: block("English") };
  if (!notes.fr || !notes.en) throw new Error(`notes française ou anglaise introuvables pour ${VERSION}`);
  for (const [lang, note] of Object.entries(notes)) {
    if (note.length > 1500) throw new Error(`notes ${lang} trop longues pour le Store (${note.length} caractères sur 1500)`);
  }
  return notes;
}

// ---------- Package ----------

// The package windows/package.ps1 built last, from its layout's manifest.
function checkPackage() {
  if (!fs.existsSync(PACKAGE)) throw new Error(`${path.relative(ROOT, PACKAGE)} manque : lancer windows/package.ps1`);
  const layout = path.join(ROOT, "dist/windows/layout/AppxManifest.xml");
  if (!fs.existsSync(layout) || fs.statSync(layout).mtimeMs > fs.statSync(PACKAGE).mtimeMs) {
    throw new Error("le paquet ne vient pas du dernier windows/package.ps1 : le relancer");
  }
  const manifest = fs.readFileSync(layout, "utf8");
  const identity = JSON.parse(fs.readFileSync(path.join(__dirname, "msix/identity.json"), "utf8"));
  const attr = (name) => manifest.match(new RegExp(`<Identity [^>]*${name}="([^"]*)"`))?.[1];
  if (attr("Name") !== identity.name || attr("Publisher") !== identity.publisher) {
    throw new Error("l'identité du paquet n'est pas celle de windows/msix/identity.json : relancer windows/package.ps1");
  }
  if (attr("Version") !== `${VERSION}.0`) throw new Error(`le paquet est en ${attr("Version")}, pas en ${VERSION}.0 : relancer windows/package.ps1`);
  console.log(`paquet     ${path.relative(ROOT, PACKAGE)} (${(fs.statSync(PACKAGE).size / 1048576).toFixed(1)} Mo)`);
}

// The submission takes a ZIP archive of its files: one file, stored as is
// (an MSIX is already compressed).
function storedZip(name, data) {
  const fileName = Buffer.from(name, "utf8");
  const crc = zlib.crc32(data);
  const dosDate = (1 << 5) | 1; // 1980-01-01
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(dosDate, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(fileName.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(dosDate, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(fileName.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + fileName.length, 12);
  end.writeUInt32LE(local.length + fileName.length + data.length, 16);
  return Buffer.concat([local, fileName, data, central, fileName, end]);
}

// Into the submission's Azure blob (its SAS address), in blocks of 4 MB.
async function uploadBlob(sas, data) {
  const size = 4 * 1048576;
  const ids = [];
  for (let offset = 0; offset < data.length; offset += size) {
    const id = Buffer.from(String(ids.length).padStart(6, "0")).toString("base64");
    for (let tries = 1; ; tries++) {
      const res = await fetch(`${sas}&comp=block&blockid=${encodeURIComponent(id)}`, { method: "PUT", body: data.subarray(offset, offset + size) }).catch((err) => ({ status: 0, err }));
      if (res.status === 201) break;
      if (tries >= 3) throw new Error(`envoi du paquet interrompu (${res.status || res.err.message})`);
      await sleep(5000);
    }
    ids.push(id);
  }
  const list = `<?xml version="1.0" encoding="utf-8"?><BlockList>${ids.map((id) => `<Latest>${id}</Latest>`).join("")}</BlockList>`;
  const res = await fetch(`${sas}&comp=blocklist`, { method: "PUT", body: list });
  if (res.status !== 201) throw new Error(`envoi du paquet pas finalisé (${res.status})`);
}

// ---------- Store ----------

async function token(c) {
  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(c.tenantId)}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: c.clientId, client_secret: c.clientSecret, resource: "https://manage.devcenter.microsoft.com" }),
  });
  const body = await readBody(res);
  if (!res.ok || !body.access_token) throw new Error(`connexion Microsoft refusée (${res.status}, ${body.error ?? "?"}) : vérifier les clés « microsoft »`);
  return body.access_token;
}

function client(accessToken) {
  return async (method, url, body) => {
    const res = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${accessToken}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = res.status === 204 ? {} : await readBody(res);
    if (!res.ok) throw new Error(`${method} ${url.replace(API, "") || "/"} : ${res.status} ${JSON.stringify(data).slice(0, 400)}`);
    return data;
  };
}

async function publish(keys, notes, dry) {
  const api = client(await token(keys));
  const app = await api("GET", API);
  if (app.pendingApplicationSubmission?.id) {
    throw new Error(`une soumission est déjà en cours (${app.pendingApplicationSubmission.id}) : attendre sa publication, ou la supprimer dans le Partner Center`);
  }
  if (!app.lastPublishedApplicationSubmission?.id) throw new Error("aucune version publiée : la première soumission se fait à la main dans le Partner Center");
  const last = await api("GET", `${API}/submissions/${app.lastPublishedApplicationSubmission.id}`);
  const published = (last.applicationPackages ?? []).map((p) => p.version).filter(Boolean);
  if (published.includes(`${VERSION}.0`)) return "déjà publiée, rien à envoyer";
  if (dry) return `accès valide (publiée : ${published.join(", ") || "?"}) ; enverrait ${path.basename(PACKAGE)} et les notes FR/EN (${notes.fr.length}/${notes.en.length} caractères)`;

  const submission = await api("POST", `${API}/submissions`);
  say(`soumission ${submission.id} créée, envoi du paquet…`);
  try {
    for (const p of submission.applicationPackages ?? []) p.fileStatus = "PendingDelete";
    (submission.applicationPackages ??= []).push({
      fileName: path.basename(PACKAGE),
      fileStatus: "PendingUpload",
      minimumDirectXVersion: "None",
      minimumSystemRam: "None",
    });
    for (const [lang, listing] of Object.entries(submission.listings ?? {})) {
      if (listing.baseListing) listing.baseListing.releaseNotes = lang.toLowerCase().startsWith("fr") ? notes.fr : notes.en;
    }
    await api("PUT", `${API}/submissions/${submission.id}`, submission);
    await uploadBlob(submission.fileUploadUrl, storedZip(path.basename(PACKAGE), fs.readFileSync(PACKAGE)));
    say("paquet envoyé, validation de la soumission…");
    let status = await api("POST", `${API}/submissions/${submission.id}/commit`);
    for (let i = 0; status.status === "CommitStarted" && i < 60; i++) {
      await sleep(10000);
      status = await api("GET", `${API}/submissions/${submission.id}/status`);
    }
    if (status.status === "CommitStarted") return `soumission ${submission.id} toujours en validation au bout de 10 minutes : suivre dans le Partner Center`;
    if (status.status === "CommitFailed") {
      const errors = (status.statusDetails?.errors ?? []).map((e) => `${e.code} ${e.details}`).join(" | ");
      throw new Error(`soumission refusée : ${errors || JSON.stringify(status.statusDetails).slice(0, 400)}`);
    }
    return `version ${VERSION} envoyée en certification (${status.status})`;
  } catch (err) {
    // A submission left half done would block the next one.
    await api("DELETE", `${API}/submissions/${submission.id}`).catch(() => {});
    throw err;
  }
}

// ---------- Main ----------

(async () => {
  const args = process.argv.slice(2);
  const creds = fs.existsSync(CREDENTIALS) ? JSON.parse(fs.readFileSync(CREDENTIALS, "utf8")) : {};
  if (args[0] === "setup") {
    if (creds.microsoft) return console.log("« microsoft » est déjà dans .store-credentials.json : rien à faire.");
    creds.microsoft = Object.fromEntries(KEYS.map((k) => [k, ""]));
    fs.writeFileSync(CREDENTIALS, JSON.stringify(creds, null, 2) + "\n");
    return console.log("Ajouté : « microsoft » dans .store-credentials.json (ignoré par git), à remplir.");
  }
  const dry = args.includes("--dry-run");
  console.log(`FreeCorrector pour Windows ${VERSION}${dry ? " — essai à blanc, rien n'est envoyé" : ""}`);
  const notes = releaseNotes();
  checkPackage();
  const keys = creds.microsoft ?? {};
  if (!KEYS.every((k) => String(keys[k] ?? "").trim())) {
    say("IGNORÉE : clés « microsoft » manquantes dans .store-credentials.json (node windows/publish-store.js setup)");
    process.exitCode = 1;
    return;
  }
  try {
    say(await publish(keys, notes, dry));
  } catch (err) {
    say(`ÉCHEC : ${err.message}`);
    process.exitCode = 1;
  }
})().catch((err) => {
  console.error(`Erreur : ${err.message}`);
  process.exit(1);
});
