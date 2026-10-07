# Notes de version à coller dans les stores

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
