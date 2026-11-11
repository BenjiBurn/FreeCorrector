// Writes the pages of the app's windows into obj/settings/, from the
// extension's pages with the web stand-ins for the extension APIs, the way
// scripts/build.js makes the online proofreader's page. Run by windows/build.ps1.
//
//   settings.html   (served as engine/options/settings.html): the options page, settings window
//   conjugator.html (served as engine/conjugator/conjugator.html): the conjugator window

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "..");
const anchor = '<script src="../lib/settings.js"></script>';

function page(source, out, extra = []) {
  const html = fs.readFileSync(path.join(ROOT, "src", source), "utf8");
  if (!html.includes(anchor)) throw new Error(`${source}: ${anchor} introuvable`);
  const file = path.join(__dirname, "..", "obj", "settings", out);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html.replace(anchor, [
    '<script src="../web/messages.js"></script>',
    // web/fc-web.js takes the interface language from the page.
    '<script>document.documentElement.lang = new URLSearchParams(location.search).get("lang") || "fr";</script>',
    '<script src="../web/fc-web.js"></script>',
    ...extra,
    anchor,
  ].join("\n  ")));
  console.log(`settings  ${path.relative(ROOT, file)}`);
}

page(path.join("options", "options.html"), "settings.html", ['<script src="../options-app.js"></script>']);
page(path.join("conjugator", "conjugator.html"), "conjugator.html");
