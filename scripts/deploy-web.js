// Puts the online proofreader of this version on a website:
//
//   node scripts/deploy-web.js <app folder>
//
// Builds dist/web (node scripts/build.js web), copies it into
// <app folder>/<version>/ (version from src/manifest.json), then removes the
// other version folders. The site's page loads the newest version folder: one
// folder per version, so browsers never mix cached files of two versions.
// index.html (the standalone test page) is not copied: the site has its own page.

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const dest = process.argv[2];
if (!dest) {
  console.error("Usage : node scripts/deploy-web.js <dossier app du site>");
  process.exit(1);
}
if (!fs.existsSync(dest)) {
  console.error(`Dossier introuvable : ${dest}`);
  process.exit(1);
}

const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "src/manifest.json"), "utf8"));
execFileSync(process.execPath, [path.join(__dirname, "build.js"), "web"], { stdio: "inherit" });

const web = path.join(ROOT, "dist/web");
const target = path.join(dest, version);
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(web, target, { recursive: true, filter: (src) => src !== path.join(web, "index.html") });

// Every file of the build must be there before the old version goes.
const missing = [];
const walk = (dir, rel = "") => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(path.join(dir, entry.name), r);
    else if (r !== "index.html" && !fs.existsSync(path.join(target, r))) missing.push(r);
  }
};
walk(web);
if (missing.length) {
  console.error(`Copie incomplète, rien n'a été supprimé : ${missing.join(", ")}`);
  process.exit(1);
}

const removed = [];
for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
  if (entry.isDirectory() && /^\d+\.\d+\.\d+$/.test(entry.name) && entry.name !== version) {
    fs.rmSync(path.join(dest, entry.name), { recursive: true, force: true });
    removed.push(entry.name);
  }
}
console.log(`web       ${version} -> ${target}${removed.length ? ` (supprimé : ${removed.join(", ")})` : ""}`);
