// Code inside prose is not language: `npm install`, config.json, fetchUser(),
// access_token, --watch, macOS. Blanked out before checking (same length, so
// offsets hold); matches touching the blanks are dropped afterwards.
// Loaded by both workers (classic script and ES module): exposes a global.

// Short consonant-only words that are real abbreviations, not commands.
const FC_KEPT_ABBREVIATIONS = /^(st|nd|rd|th|mr|mrs|ms|dr|pp|cf|pm|km|cm|mm|kg|mg|ml|bcp|pk|pq|mdr|ptdr|stp|svp|tkt|jsp|rdv|slt|bjr|bsr|dsl|mtn|cqfd|tv|pc|cv|sms|mms|hlm|bd|cd|dvd|sncf|rh|pdg|ps|nb|ttc|ht|tva|qqn|qqch|pcq|tjs|tjr|tjrs|mrc|pr|nvx|ds|ns|vs|ss|lb|lbs|hr|hrs|wk|xx|xxx|ty|thx|pls|plz|brb|btw|fyi|idk|dm|dms|ppl|msg|mph|gps)$/i;

self.fcMaskCode = (text) => {
  const blank = (s) => s.replace(/[^\n]/g, " ");
  return text
    // `inline code`
    .replace(/`[^`\n]*`/g, blank)
    // e-mail addresses
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, blank)
    // domain names and URLs without "http": fr.fifa.com, www.gutenberg.org/ebooks
    .replace(/(?<![\p{L}\p{N}_@])(?:[\w-]+\.)+(?:com|fr|org|net|io|eu|be|ch|ca|uk|de|es|it|gov|edu|info|dev|app|co|ly|me|tv|ai|us)(?:\/[^\s]*)?(?![\p{L}\p{N}_])/giu, blank)
    // file names and paths: config.json, docker-compose.yml, src/app.js, .env.example
    .replace(/(?<![\p{L}\p{N}_])((?:[\w.-]+\/)*[\w-]*\.(?:json|js|mjs|cjs|ts|tsx|jsx|yaml|yml|md|txt|env|example|html|css|scss|py|sh|toml|ini|xml|csv|lock|cfg|conf|log|sql|rs|java|kt|rb|php|cpp|vue|svelte|zip|tar|gz|exe|dll|dmg|apk)(?:\.[\w]+)*)(?![\p{L}\p{N}_])/giu, blank)
    // identifiers: camelCase ("fetchUser", "macOS"), snake_case, calls "parse()"
    .replace(/(?<![\p{L}\p{N}_])(\p{Ll}+\p{Lu}[\p{L}\p{N}]*|[\p{L}\p{N}]+_[\p{L}\p{N}_]+|[\p{L}\p{N}_.]+\(\w*\))(?![\p{L}\p{N}_])/gu, blank)
    // command-line options: --watch, -v, -d
    .replace(/(?<=^|\s)(--[a-z][\w-]*|-[a-zA-Z]{1,2})(?=\s|$|[.,;)])/gm, blank)
    // all-consonant lowercase commands: npm, nvm, pnpm (not "bcp", "mdr", "km")
    .replace(/(?<![\p{L}\p{N}_])[bcdfghjklmnpqrstvwxz]{2,5}(?![\p{L}\p{N}_])/gu, (m) => (FC_KEPT_ABBREVIATIONS.test(m) ? m : blank(m)));
};
