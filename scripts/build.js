// Builds one package per browser family from src/:
//
//   node scripts/build.js            -> dist/firefox, dist/chromium + zips
//   node scripts/build.js firefox    -> only Firefox
//
// firefox:  Firefox (desktop), uses the background page (background.js).
// chromium: Chrome, Edge, Opera, Brave, Vivaldi; service worker + offscreen
//           document (src/chromium/), PNG icons.
//
// No dependencies: the zip files are written with Node's zlib.

"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

const PNG_ICONS = {
  16: "icons/icon-16.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png",
};

const TARGETS = {
  firefox: {
    exclude: ["chromium"],
    manifest: (m) => m,
  },
  chromium: {
    exclude: ["background.js", "icons/icon.svg"],
    manifest: (m) => {
      const out = { ...m };
      delete out.browser_specific_settings;
      out.minimum_chrome_version = "116";
      out.background = { service_worker: "chromium/service-worker.js" };
      out.permissions = [...new Set([...(m.permissions ?? []), "offscreen"])];
      out.icons = PNG_ICONS;
      out.action = { ...m.action, default_icon: PNG_ICONS };
      return out;
    },
  },
};

function copyTree(from, to, exclude, rel = "") {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (exclude.includes(relPath)) continue;
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dst, exclude, relPath);
    else fs.copyFileSync(src, dst);
  }
}

function listFiles(dir, rel = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), relPath));
    else out.push(relPath);
  }
  return out.sort();
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Minimal zip writer (deflate, no zip64): enough for an extension package.
function writeZip(dir, zipPath) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const rel of listFiles(dir)) {
    const data = fs.readFileSync(path.join(dir, rel));
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const name = Buffer.from(rel, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(0, 10); // time/date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, packed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(0, 12);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += local.length + name.length + packed.length;
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length / 2, 8);
  end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  fs.writeFileSync(zipPath, Buffer.concat([...parts, ...central, end]));
}

function build(name) {
  const target = TARGETS[name];
  const out = path.join(DIST, name);
  fs.rmSync(out, { recursive: true, force: true });
  copyTree(SRC, out, target.exclude);
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));
  const final = target.manifest(manifest);
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(final, null, 2) + "\n");
  const zip = path.join(DIST, `freecorrector-${final.version}-${name}.zip`);
  writeZip(out, zip);
  const size = (fs.statSync(zip).size / 1024 / 1024).toFixed(1);
  console.log(`${name.padEnd(9)} dist/${name}/  ->  ${path.relative(ROOT, zip)} (${size} Mo)`);
}

const wanted = process.argv.slice(2);
for (const name of wanted.length ? wanted : Object.keys(TARGETS)) {
  if (!TARGETS[name]) {
    console.error(`Cible inconnue : ${name} (choix : ${Object.keys(TARGETS).join(", ")})`);
    process.exit(1);
  }
  build(name);
}
