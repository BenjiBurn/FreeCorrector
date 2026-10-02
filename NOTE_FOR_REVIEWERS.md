# Note for reviewers — FreeCorrector 1.0.0

FreeCorrector is a free, open-source (GPL-3.0) spelling and grammar checker for French and
English. All checking happens locally in the browser: the extension makes **no network
requests at all** (the CSP sets `connect-src 'self'`), collects no data and has no account,
no analytics and no remote code.

Source repository: https://github.com/BenjiBurn/FreeCorrector

## How the package is built

There is no transpiling, minifying or bundling of our own code. `scripts/build.js` only copies
`src/` into `dist/firefox/` (leaving out the Chromium-only folder `src/chromium/` and the
development test page `src/demo/`) and zips it.

To rebuild from the source archive (Node.js 18 or later, no dependencies to install):

```sh
node scripts/build.js firefox
# -> dist/firefox/ and dist/freecorrector-1.0.0-firefox.zip
```

## Third-party code (unmodified copies)

| Folder | Library | Version | Origin | License |
|---|---|---|---|---|
| `vendor/grammalecte/` | Grammalecte (French grammar checker) | 2.3.0 | the `grammalecte/` folder of the official Grammalecte add-on, `French-GC@grammalecte.net`, published on addons.mozilla.org | GPL-3.0 |
| `vendor/harper/` | harper.js (English grammar checker) | 2.10.0 | `dist/` of the npm package `harper.js@2.10.0` | Apache-2.0 |

All of these files are byte-for-byte identical to their origin, so they can be checked against
it:

- **Grammalecte:** compare `vendor/grammalecte/` with the `grammalecte/` folder of the
  Grammalecte 2.3.0 add-on. Upstream source: https://grammalecte.net
- **Harper:** run `npm pack harper.js@2.10.0` and compare `index.js`,
  `BinaryModule-BmeyZWwZ.js`, `slimBinary.js` and `harper_wasm_slim_bg.wasm` with
  `package/dist/`.
  - `harper_wasm_slim_bg.wasm` is Harper's WebAssembly build, compiled from the Rust sources at
    https://github.com/Automattic/harper (tag `v2.10.0`).
  - `index.js` contains Harper's own worker code as a string. Harper can start that worker for
    itself, but FreeCorrector only uses `LocalLinter`, which runs in our own module worker
    (`engine/english-worker.js`).

`'wasm-unsafe-eval'` in the CSP is only there to instantiate that WebAssembly module. There is no
`eval` and no remote script anywhere.

## Our own code

- `content/`: content scripts that draw underlines over text fields. The UI lives in a closed
  shadow root, and text is edited through `execCommand("insertText")` so that undo works.
- `engine/`: the checking engines, run in Web Workers started by the background page.
  - `host.js`: routes each paragraph to the French or English engine.
  - `rules.js`, `english-rules.js`, `suggestions.js`, `sentence-rules.js`: our own rules and the
    ranking of suggestions.
- `data/fr-freq.txt`, `data/en-freq.txt`: word frequency lists from the FrequencyWords project
  (CC BY-SA 4.0, https://github.com/hermitdave/FrequencyWords). They are used to rank
  suggestions.
- `editor/`: an extension page where users can paste and check a longer text.

## Permissions

- `storage`: settings, personal dictionary and the editor page's draft (`storage.local` only).
- `activeTab`: the popup reads the current tab's host name to let the user turn checking off for
  that site.
- The content script matches `<all_urls>` because checking must work in any text field. It reads
  text only from the field the user is typing in, and sends it to the extension's own background
  page through `runtime.sendMessage`.

## Testing

Open any page with a text field, or the extension's own editor page (toolbar button → "Ouvrir le
correcteur"), and type for example `je suis aller au marché` or `Their going tomorow`: the mistakes get underlined
and a counter shows at the bottom right of the field. Clicking an underlined word opens the
suggestions.
