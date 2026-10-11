# Notes de version à coller dans les stores

## 1.2.2

**Français** (Firefox : « Notes de version » ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• Nouveau : Ctrl+Maj+F corrige d’un coup toutes les fautes du champ où vous écrivez (raccourci modifiable dans les réglages du navigateur). Marche aussi dans la page Correcteur.
• Nouveau : dans un récit au passé, FreeCorrector suggère le « eu » oublié (« il roulait vite et j’ai juste le temps de… » → « j’ai juste eu le temps »).
• Meilleures suggestions : « t’aurai pas été invitée » → « t’aurais » ; un accent oublié ne propose plus de mots sans rapport (« treve » → « trêve », plus « crève »).
• Moins de fausses alertes sur l’accord du participe (« ça passe plus à la télé, on l’a oublié »).
• Un lien pour soutenir le projet par un don, en bas des options.
```

**English** (Opera "Changelog", Firefox if an English field is offered):

```text
• New: Ctrl+Shift+F fixes every mistake in the field you are typing in at once (shortcut can be changed in the browser's settings). Also works in the proofreader page.
• New: in a French story told in the past, FreeCorrector suggests the missing "eu".
• Better suggestions: familiar "t’" understood as "tu"; a missing accent no longer suggests unrelated words.
• Fewer false alarms on French past participle agreement.
• A link to support the project with a donation, at the bottom of the options.
```

**Notes aux testeurs Firefox** (en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

New in 1.2.2: a "commands" manifest entry (no new permission): one keyboard shortcut, Ctrl+Shift+F by default, that fixes every mistake in the focused field (lib/commands.js sends a message to the active tab's content script and to the extension's own proofreader page). The options page has a plain link to a PayPal donation page; the extension itself makes no request.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.2.zip, run "node scripts/build.js firefox" (Node.js 18+, no dependencies), output in dist/freecorrector-1.2.2-firefox.zip.

To test: type "je suis aller au marché et il faut que tu vien" in any text field, then press Ctrl+Shift+F.
```

## 1.2.1

**Français** (Firefox : « Notes de version » ; Opera : « Changelog ») :

```text
• L’interface est maintenant en français ou en anglais, selon la langue du navigateur.
• Nouveau : « Désactiver cette règle » dans la bulle, pour ne plus voir un type de faute. Les règles désactivées se réactivent dans les options.
• Nouveau : clic droit sur un texte sélectionné → « Corriger avec FreeCorrector » ouvre le correcteur avec ce texte.
• Nouveau : import et export du dictionnaire personnel dans un fichier texte.
• Nouveau : le mode exigeant s’active directement depuis le menu de l’extension. Il signale aussi le « ne » oublié (« je sais pas », « de pas le faire »).
• Plus de fautes détectées en français (accords avec deux sujets, verbes pronominaux, homophones, prépositions, noms propres écrits en minuscules) et en anglais (accord sujet-verbe, voix passive, prépositions, mots confondus).
• Moins de fausses alertes : listes numérotées, poèmes, plats étrangers, codes et abréviations.
• Corrigé : dans certains éditeurs de messageries et de réseaux sociaux, une correction pouvait s’ajouter devant le mot au lieu de le remplacer (« ÇaCa »).
```

**English** (Opera "Changelog", Firefox if an English field is offered):

```text
• The interface is now in French or English, depending on the browser's language.
• New: "Turn off this rule" in the bubble, to stop seeing a kind of mistake. Turned-off rules can be turned back on in the options.
• New: right-click on selected text → "Check with FreeCorrector" opens the proofreader with that text.
• New: import and export of the personal dictionary as a text file.
• New: picky mode can be switched on straight from the extension menu. It also flags the missing French “ne” (« je sais pas »).
• More mistakes caught in French and English (subject-verb agreement, passive voice, prepositions, confused words, names typed in lowercase).
• Fewer false alarms: numbered lists, poems, foreign dishes, codes and abbreviations.
• Fixed: in some chat and social media editors, a fix could be added in front of the word instead of replacing it.
```

**Notes aux testeurs Firefox** (en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

New in 1.2.1: the "contextMenus" permission, for a single right-click entry on selected text ("Check with FreeCorrector") that opens the extension's own editor page with that text (passed through storage.local). The interface is translated with _locales/ (default_locale "en").

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.1.zip, run "node scripts/build.js firefox" (Node.js 18+, no dependencies), output in dist/freecorrector-1.2.1-firefox.zip.

To test: type "je suis aller au marché" or "My brother work at a bank" in any text field; select some text and right-click "Check with FreeCorrector".
```
