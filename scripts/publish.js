// Sends this version to the stores through their APIs:
//
//   node scripts/publish.js [firefox] [thunderbird] [chrome] [--dry-run]
//   node scripts/publish.js setup          -> creates .store-credentials.json to fill in
//   node scripts/publish.js chrome-login   -> gets the Chrome refresh token (once)
//
// With no store named, all three. The version is the one of src/manifest.json;
// its tag (v<version>) must exist, and the packages of dist/ must be the ones
// built from that tag: they are rebuilt from the tag in a separate work tree
// and compared byte for byte before anything is sent. A store that already
// has the version is skipped. --dry-run checks the keys and shows what would
// be sent, without sending anything.
//
// - Firefox (addons.mozilla.org, submission API v5): the package, the release
//   notes in French and English, the notes for reviewers and the source
//   archive, for Firefox and Firefox for Android.
// - Thunderbird (addons.thunderbird.net, signing API v4): the package only.
//   Its API takes neither release notes nor source archive: add them on the
//   version's page of the Developer Hub afterwards. Its server often answers
//   502: the upload is retried.
// - Chrome Web Store (API v2): the package, then submitted for review.
//
// Release notes come from store/NOTES-VERSION.md (section "## <version>").
// Keys: .store-credentials.json at the root of the repository, which git
// ignores. Never commit it, never print it.

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const CREDENTIALS = path.join(ROOT, ".store-credentials.json");
const CHROME_ITEM = "pbojifdopikeihflcjikofbpfgebahdi";
const CHROME_SCOPE = "https://www.googleapis.com/auth/chromewebstore";
const STORES = ["firefox", "thunderbird", "chrome"];

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/manifest.json"), "utf8"));
const VERSION = manifest.version;
const GUID = manifest.browser_specific_settings.gecko.id;
const zipOf = (name) => path.join(DIST, `freecorrector-${VERSION}-${name}.zip`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (store, text) => console.log(`${store.padEnd(11)} ${text}`);

// ---------- Keys ----------

const TEMPLATE = {
  firefox: { issuer: "", secret: "" },
  thunderbird: { issuer: "", secret: "" },
  chrome: { publisherId: "", clientId: "", clientSecret: "", refreshToken: "" },
};

function readCredentials() {
  if (!fs.existsSync(CREDENTIALS)) return {};
  return JSON.parse(fs.readFileSync(CREDENTIALS, "utf8"));
}

function hasKeys(store, creds) {
  const c = creds[store] ?? {};
  return Object.keys(TEMPLATE[store]).every((k) => String(c[k] ?? "").trim());
}

// The JWT the Mozilla add-ons sites expect: HS256, a few minutes, a new jti.
function mozillaToken({ issuer, secret }) {
  const b64 = (data) => Buffer.from(data).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ iss: issuer, jti: crypto.randomUUID(), iat: now, exp: now + 240 }));
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `JWT ${head}.${body}.${sig}`;
}

async function readBody(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { text: text.replace(/\s+/g, " ").slice(0, 200) };
  }
}

// A request, tried again while the server answers 5xx (or the network fails).
async function request(url, options, { tries = 1, wait = 20000, store = "" } = {}) {
  for (let i = 1; ; i++) {
    let res;
    try {
      res = await fetch(url, typeof options === "function" ? options() : options);
    } catch (err) {
      if (i >= tries) throw err;
      say(store, `réseau (${err.message}), nouvel essai ${i + 1}/${tries} dans ${wait / 1000} s`);
      await sleep(wait);
      continue;
    }
    if (res.status < 500 || i >= tries) return res;
    say(store, `le serveur répond ${res.status}, nouvel essai ${i + 1}/${tries} dans ${wait / 1000} s`);
    await sleep(wait);
  }
}

// ---------- Release notes ----------

function releaseNotes() {
  const text = fs.readFileSync(path.join(ROOT, "store/NOTES-VERSION.md"), "utf8");
  const start = text.indexOf(`\n## ${VERSION}\n`);
  if (start < 0) throw new Error(`pas de section « ## ${VERSION} » dans store/NOTES-VERSION.md`);
  const next = text.indexOf("\n## ", start + 1);
  const section = text.slice(start, next < 0 ? undefined : next);
  const block = (title) => {
    const m = section.match(new RegExp(String.raw`\*\*${title}[^\n]*\n+` + "```text\\n([\\s\\S]*?)```"));
    return m ? m[1].trim() : "";
  };
  const notes = { fr: block("Français"), en: block("English"), reviewers: block("Notes aux testeurs") };
  if (!notes.fr || !notes.en) throw new Error(`notes française ou anglaise introuvables pour ${VERSION}`);
  return notes;
}

// ---------- Packages built from the tag ----------

function checkPackages() {
  const tag = `v${VERSION}`;
  try {
    execFileSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { cwd: ROOT, stdio: "ignore" });
  } catch {
    throw new Error(`le tag ${tag} n'existe pas : créer le tag de la version d'abord`);
  }
  const tree = fs.mkdtempSync(path.join(os.tmpdir(), "fc-publish-"));
  try {
    execFileSync("git", ["worktree", "add", "--detach", "--force", tree, tag], { cwd: ROOT, stdio: "ignore" });
    execFileSync(process.execPath, [path.join(tree, "scripts/build.js"), "firefox", "thunderbird", "chromium"], { cwd: tree, stdio: "ignore" });
    execFileSync("git", ["archive", "--format=zip", `--prefix=FreeCorrector-${VERSION}/`, "-o", path.join(tree, "dist", "source.zip"), tag], { cwd: ROOT });
    const pairs = [
      ["firefox", path.join(tree, "dist", `freecorrector-${VERSION}-firefox.zip`)],
      ["thunderbird", path.join(tree, "dist", `freecorrector-${VERSION}-thunderbird.zip`)],
      ["chromium", path.join(tree, "dist", `freecorrector-${VERSION}-chromium.zip`)],
      ["source", path.join(tree, "dist", "source.zip")],
    ];
    for (const [name, built] of pairs) {
      const mine = zipOf(name);
      if (!fs.existsSync(mine)) throw new Error(`${path.relative(ROOT, mine)} manque (construire les paquets depuis le tag)`);
      if (!fs.readFileSync(mine).equals(fs.readFileSync(built))) {
        throw new Error(`${path.relative(ROOT, mine)} n'est pas le paquet du tag ${tag} : le reconstruire depuis le tag`);
      }
    }
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", tree], { cwd: ROOT, stdio: "ignore" });
    } catch {
      fs.rmSync(tree, { recursive: true, force: true });
    }
  }
  console.log(`paquets   dist/ = paquets du tag v${VERSION} (vérifiés octet par octet)`);
}

// ---------- Firefox ----------

async function firefox(key, notes, dry) {
  const api = "https://addons.mozilla.org/api/v5/addons";
  const auth = () => ({ authorization: mozillaToken(key) });
  const list = await request(`${api}/addon/${encodeURIComponent(GUID)}/versions/?filter=all_with_unlisted&page_size=50`, () => ({ headers: auth() }), { tries: 3, store: "firefox" });
  const versions = await readBody(list);
  if (!list.ok) throw new Error(`clé refusée ou fiche introuvable (${list.status}) : ${JSON.stringify(versions)}`);
  if ((versions.results ?? []).some((v) => v.version === VERSION)) return "déjà présente, rien à envoyer";
  if (dry) return `clé valide ; enverrait ${path.basename(zipOf("firefox"))}, la source, les notes FR/EN (${notes.fr.length}/${notes.en.length} caractères) et les notes aux relecteurs`;

  const form = new FormData();
  form.append("upload", new Blob([fs.readFileSync(zipOf("firefox"))], { type: "application/zip" }), path.basename(zipOf("firefox")));
  form.append("channel", "listed");
  const up = await request(`${api}/upload/`, () => ({ method: "POST", headers: auth(), body: form }), { tries: 3, store: "firefox" });
  let upload = await readBody(up);
  if (!up.ok) throw new Error(`envoi refusé (${up.status}) : ${JSON.stringify(upload)}`);
  say("firefox", "paquet envoyé, validation…");
  for (let i = 0; !upload.processed && i < 120; i++) {
    await sleep(5000);
    upload = await readBody(await request(`${api}/upload/${upload.uuid}/`, () => ({ headers: auth() }), { tries: 3, store: "firefox" }));
  }
  if (!upload.processed) throw new Error("validation pas terminée au bout de 10 minutes");
  if (!upload.valid) {
    const errors = (upload.validation?.messages ?? []).filter((m) => m.type === "error").map((m) => m.message);
    throw new Error(`validation échouée : ${errors.join(" | ") || JSON.stringify(upload.validation).slice(0, 300)}`);
  }

  const created = await request(`${api}/addon/${encodeURIComponent(GUID)}/versions/`, () => ({
    method: "POST",
    headers: { ...auth(), "content-type": "application/json" },
    body: JSON.stringify({
      upload: upload.uuid,
      compatibility: ["firefox", "android"],
      release_notes: { "en-US": notes.en, fr: notes.fr },
      ...(notes.reviewers ? { approval_notes: notes.reviewers } : {}),
    }),
  }), { tries: 2, store: "firefox" });
  const version = await readBody(created);
  if (!created.ok) throw new Error(`version refusée (${created.status}) : ${JSON.stringify(version)}`);

  const source = new FormData();
  source.append("source", new Blob([fs.readFileSync(zipOf("source"))], { type: "application/zip" }), path.basename(zipOf("source")));
  const patched = await request(`${api}/addon/${encodeURIComponent(GUID)}/versions/${version.id}/`, () => ({ method: "PATCH", headers: auth(), body: source }), { tries: 3, store: "firefox" });
  if (!patched.ok) return `version ${VERSION} créée et en vérification, MAIS la source n'est pas passée (${patched.status}) : l'ajouter sur la page de la version`;
  return `version ${VERSION} envoyée en vérification (notes et source comprises)`;
}

// ---------- Thunderbird ----------

async function thunderbird(key, dry) {
  const url = `https://addons.thunderbird.net/api/v4/addons/${encodeURIComponent(GUID)}/versions/${VERSION}/`;
  const auth = () => ({ authorization: mozillaToken(key) });
  const check = await request(url, () => ({ headers: auth() }), { tries: 3, store: "thunderbird" });
  if (check.status === 200) return "déjà présente, rien à envoyer";
  if (check.status !== 404) throw new Error(`clé refusée ou serveur indisponible (${check.status}) : ${JSON.stringify(await readBody(check))}`);
  if (dry) return `clé valide ; enverrait ${path.basename(zipOf("thunderbird"))}`;

  const body = () => {
    const form = new FormData();
    form.append("upload", new Blob([fs.readFileSync(zipOf("thunderbird"))], { type: "application/zip" }), path.basename(zipOf("thunderbird")));
    form.append("channel", "listed");
    return { method: "PUT", headers: auth(), body: form };
  };
  const res = await request(url, body, { tries: 8, wait: 30000, store: "thunderbird" });
  let status = await readBody(res);
  if (res.status === 409) return "déjà présente, rien à envoyer";
  if (res.status !== 201 && res.status !== 202) throw new Error(`envoi refusé (${res.status}) : ${JSON.stringify(status)}`);
  say("thunderbird", "paquet envoyé, validation…");
  for (let i = 0; !status.processed && i < 60; i++) {
    await sleep(10000);
    const poll = await request(status.url || url, () => ({ headers: auth() }), { tries: 3, store: "thunderbird" });
    status = await readBody(poll);
    if (!poll.ok) throw new Error(`suivi impossible (${poll.status})`);
  }
  if (!status.processed) throw new Error("validation pas terminée au bout de 10 minutes");
  if (!status.valid) throw new Error(`validation échouée : ${status.validation_url ?? JSON.stringify(status.validation_results).slice(0, 300)}`);
  return `version ${VERSION} envoyée en vérification ; ajouter les notes de version sur https://addons.thunderbird.net/developers/addon/freecorrector/versions`;
}

// ---------- Chrome ----------

async function chromeToken(c) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken, grant_type: "refresh_token" }),
  });
  const body = await readBody(res);
  if (!res.ok || !body.access_token) throw new Error(`connexion Google refusée (${res.status}, ${body.error ?? "?"}) : relancer « node scripts/publish.js chrome-login »`);
  return body.access_token;
}

async function chrome(c, dry) {
  const token = await chromeToken(c);
  const auth = { authorization: `Bearer ${token}` };
  const item = `publishers/${encodeURIComponent(c.publisherId)}/items/${CHROME_ITEM}`;
  const statusRes = await request(`https://chromewebstore.googleapis.com/v2/${item}:fetchStatus`, { headers: auth }, { tries: 3, store: "chrome" });
  const status = await readBody(statusRes);
  if (!statusRes.ok) throw new Error(`fiche introuvable ou accès refusé (${statusRes.status}) : ${JSON.stringify(status).slice(0, 300)}`);
  const versionsOf = (rev) => (rev?.distributionChannels ?? []).map((d) => d.crxVersion);
  if (versionsOf(status.publishedItemRevisionStatus).includes(VERSION)) return "déjà publiée, rien à envoyer";
  if (versionsOf(status.submittedItemRevisionStatus).includes(VERSION)) return `déjà soumise (${status.submittedItemRevisionStatus.state}), rien à envoyer`;
  if (dry) return `accès valide (publiée : ${versionsOf(status.publishedItemRevisionStatus).join(", ") || "?"}) ; enverrait ${path.basename(zipOf("chromium"))} puis la soumettrait`;

  const up = await request(`https://chromewebstore.googleapis.com/upload/v2/${item}:upload`, () => ({
    method: "POST",
    headers: { ...auth, "content-type": "application/zip" },
    body: fs.readFileSync(zipOf("chromium")),
  }), { tries: 3, store: "chrome" });
  let upload = await readBody(up);
  if (!up.ok) throw new Error(`envoi refusé (${up.status}) : ${JSON.stringify(upload).slice(0, 300)}`);
  for (let i = 0; upload.uploadState === "IN_PROGRESS" && i < 60; i++) {
    await sleep(5000);
    const s = await readBody(await fetch(`https://chromewebstore.googleapis.com/v2/${item}:fetchStatus`, { headers: auth }));
    upload = { uploadState: s.lastAsyncUploadState };
  }
  if (upload.uploadState !== "SUCCEEDED") throw new Error(`paquet refusé (${upload.uploadState}) : voir le tableau de bord du Chrome Web Store`);
  say("chrome", "paquet envoyé, soumission…");
  const pub = await request(`https://chromewebstore.googleapis.com/v2/${item}:publish`, {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
  }, { tries: 2, store: "chrome" });
  const result = await readBody(pub);
  if (!pub.ok) throw new Error(`soumission refusée (${pub.status}) : ${JSON.stringify(result).slice(0, 300)}`);
  return `version ${VERSION} soumise (${result.state ?? "?"})`;
}

// One-time: the refresh token of the Chrome Web Store API, through Google's
// sign-in in the browser (OAuth client of type "Desktop app"). Written into
// .store-credentials.json, never printed.
//   node scripts/publish.js chrome-login          -> prints the address to open
//   node scripts/publish.js chrome-login "<url>"  -> finishes with the address the
//     browser was sent to (http://127.0.0.1:…/?code=…) if this script had stopped
async function chromeLogin(finalUrl) {
  const creds = readCredentials();
  const c = creds.chrome ?? {};
  if (!c.clientId || !c.clientSecret) throw new Error("remplir d'abord chrome.clientId et chrome.clientSecret dans .store-credentials.json");
  let code;
  let redirect;
  if (finalUrl) {
    const u = new URL(finalUrl);
    code = u.searchParams.get("code");
    redirect = u.origin;
    if (!code) throw new Error("pas de « code= » dans cette adresse");
  } else {
    const server = http.createServer();
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    redirect = `http://127.0.0.1:${server.address().port}`;
    const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
      client_id: c.clientId, redirect_uri: redirect, response_type: "code", scope: CHROME_SCOPE, access_type: "offline", prompt: "consent",
    });
    console.log("Ouvrir cette adresse dans le navigateur et accepter (elle reste valable 30 minutes) :\n");
    console.log(url + "\n");
    code = await new Promise((resolve, reject) => {
      server.on("request", (req, res) => {
        const q = new URL(req.url, redirect).searchParams;
        res.setHeader("content-type", "text/html; charset=utf-8");
        if (q.get("code")) {
          res.end("<p>C'est bon, vous pouvez fermer cet onglet.</p>");
          resolve(q.get("code"));
        } else {
          // Refused (app still in testing…): keep waiting, the user can fix it and try again.
          res.end(`<p>Google a refusé (${q.get("error") ?? "?"}). Corriger le réglage, puis rouvrir l'adresse donnée par le script.</p>`);
          console.log(`Google a refusé (${q.get("error") ?? "?"}) : en attente d'un nouvel essai…`);
        }
      });
      setTimeout(() => reject(new Error("pas de réponse au bout de 30 minutes")), 1800000);
    }).finally(() => server.close());
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: redirect, grant_type: "authorization_code" }),
  });
  const body = await readBody(res);
  if (!body.refresh_token) throw new Error(`pas de jeton (${res.status}, ${body.error ?? "?"})`);
  creds.chrome = { ...c, refreshToken: body.refresh_token };
  fs.writeFileSync(CREDENTIALS, JSON.stringify(creds, null, 2) + "\n");
  console.log("Jeton Chrome enregistré dans .store-credentials.json.");
}

// ---------- Main ----------

(async () => {
  const args = process.argv.slice(2);
  if (args[0] === "setup") {
    if (fs.existsSync(CREDENTIALS)) {
      console.log(".store-credentials.json existe déjà : rien à faire.");
    } else {
      fs.writeFileSync(CREDENTIALS, JSON.stringify(TEMPLATE, null, 2) + "\n");
      console.log("Créé : .store-credentials.json (ignoré par git), à remplir.");
    }
    return;
  }
  if (args[0] === "chrome-login") return chromeLogin(args[1]);

  const dry = args.includes("--dry-run");
  const wanted = args.filter((a) => !a.startsWith("--"));
  for (const w of wanted) if (!STORES.includes(w)) throw new Error(`store inconnue : ${w} (${STORES.join(", ")})`);
  const stores = wanted.length ? wanted : STORES;

  console.log(`FreeCorrector ${VERSION}${dry ? " — essai à blanc, rien n'est envoyé" : ""}`);
  const notes = releaseNotes();
  checkPackages();
  const creds = readCredentials();
  const results = {};
  for (const store of stores) {
    if (!hasKeys(store, creds)) {
      results[store] = "IGNORÉE : clés manquantes dans .store-credentials.json";
      say(store, results[store]);
      continue;
    }
    try {
      results[store] = store === "firefox" ? await firefox(creds.firefox, notes, dry)
        : store === "thunderbird" ? await thunderbird(creds.thunderbird, dry)
        : await chrome(creds.chrome, dry);
    } catch (err) {
      results[store] = `ÉCHEC : ${err.message}`;
      process.exitCode = 1;
    }
    say(store, results[store]);
  }
})().catch((err) => {
  console.error(`Erreur : ${err.message}`);
  process.exit(1);
});
