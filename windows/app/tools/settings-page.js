// Writes the settings window's page, obj/settings/settings.html (served as
// engine/options/settings.html): the extension's options page with the web
// stand-ins for the extension APIs, the way scripts/build.js makes the online
// proofreader's page. Run by windows/build.ps1.

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "..");
const source = fs.readFileSync(path.join(ROOT, "src", "options", "options.html"), "utf8");
const anchor = '<script src="../lib/settings.js"></script>';
if (!source.includes(anchor)) throw new Error(`options.html: ${anchor} introuvable`);
const html = source.replace(anchor, [
  '<script src="../web/messages.js"></script>',
  // web/fc-web.js takes the interface language from the page.
  '<script>document.documentElement.lang = new URLSearchParams(location.search).get("lang") || "fr";</script>',
  '<script src="../web/fc-web.js"></script>',
  '<script src="../options-app.js"></script>',
  anchor,
].join("\n  "));
const out = path.join(__dirname, "..", "obj", "settings", "settings.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`settings  ${path.relative(ROOT, out)}`);
