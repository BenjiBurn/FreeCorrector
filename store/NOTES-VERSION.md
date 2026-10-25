# Notes de version à coller dans les stores

## 1.2.7 (prochaine version, pas encore publiée)

Brouillon, à compléter jusqu’à la sortie.

**Français** (Firefox : « Notes de version » ; Thunderbird : « Notes de version » ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• Nouveau : un bouton « Signaler » dans la bulle, pour nous dire quand une correction est fausse. Vous voyez et pouvez modifier ce qui est envoyé, rien ne part sans votre clic.
• Une page d’accueil à l’installation, avec un champ pour essayer et les réglages utiles (désactiver sur un site, dictionnaire, raccourci).
• Beaucoup plus de fautes trouvées en français et en anglais, et moins de fausses alertes : le point final n’est plus réclamé dans les messages de chat, les titres et les listes.
• La version de l’extension est affichée en bas des options ; boutons plus lisibles en mode sombre.
```

**English** (Opera "Changelog", Firefox and Thunderbird if an English field is offered):

```text
• New: a "Report" button in the bubble, to tell us when a correction is wrong. You see and can edit what is sent; nothing leaves without your click.
• A welcome page at install, with a field to try it and the useful settings (turn off on a site, dictionary, shortcut).
• Many more mistakes found in English and French, and fewer false alarms: no final period asked for in chat messages, titles and lists.
• The extension's version is shown at the bottom of the options; easier-to-read buttons in dark mode.
```

**Notes aux testeurs** (Firefox et Thunderbird, en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

1.2.7 adds a welcome page opened once at install (welcome/, lib/welcome.js), a "Report" button in the bubble that opens the author's website with the data in the URL fragment (sent only if the user clicks Send there; see NOTE_FOR_REVIEWERS.md), a review link in the popup after 100 fixes, and checking rules (src/engine/); no new permission.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.7.zip, run "node scripts/build.js firefox" (or "thunderbird"; Node.js 18+, no dependencies), output in dist/freecorrector-1.2.7-firefox.zip (or -thunderbird.zip).

To test: type "je suis aller au marché" or "Your going to love it, it's lid is great." in any text field (in Thunderbird: in the body of a new message).
```

## 1.2.6

Sur Thunderbird, la 1.2.5 publiée contient déjà le module Thunderbird (construit au commit
`83082b6`) : la 1.2.6 y est une simple mise à jour (« Upload New Version »).

**Français** (Firefox : « Notes de version » ; Thunderbird : « Notes de version » ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• FreeCorrector existe aussi pour Thunderbird : vos e-mails sont corrigés pendant que vous les écrivez.
• Dans la réponse à un e-mail (Gmail, Thunderbird), le message cité et la signature ne sont plus corrigés : seul votre texte l’est.
• Plus de pastille dans les formulaires de connexion : identifiant, e-mail, mot de passe et codes ne sont jamais corrigés.
• « Désactiver sur ce site » s’applique aussi aux cadres intégrés venus d’un autre site (fenêtres de connexion, widgets).
• Les textes anglais courts sont mieux reconnus (« Bodies list incoherent display » n’est plus corrigé comme du français).
• Moins de fausses alertes : « email » est accepté, plus de majuscule demandée après un nom comme « FreeCorrector » en début de phrase, « Les documents que tu m’as envoyés sont parfaits » ne propose plus « son ».
```

**English** (Opera "Changelog", Firefox and Thunderbird if an English field is offered):

```text
• FreeCorrector is also available for Thunderbird: your emails are checked as you write them.
• When you reply to an email (Gmail, Thunderbird), the quoted message and the signature are no longer checked: only your own text is.
• No more badge on sign-in forms: user names, email addresses, passwords and codes are never checked.
• "Turn off on this site" now also covers embedded frames from other sites (sign-in boxes, widgets).
• Short English texts are recognized better ("Bodies list incoherent display" is no longer checked as French).
• Fewer false alarms: no capital letter asked for after a name like "JavaScript" at the start of a sentence, and in French.
```

**Notes aux testeurs** (Firefox et Thunderbird, en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

1.2.6 changes the in-page UI (src/content/: the quoted message of a reply and sign-in fields are not checked; the per-site switch asks the background for the tab's host name with a { type: "siteHost" } message) and some checking rules and the language detection (src/engine/; language.js reads the bundled data/*-freq.txt lists); no new permission.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.6.zip, run "node scripts/build.js firefox" (or "thunderbird"; Node.js 18+, no dependencies), output in dist/freecorrector-1.2.6-firefox.zip (or -thunderbird.zip).

To test: type "je suis aller au marché" or "Your going to love it, it's lid is great." in any text field (in Thunderbird: in the body of a new message).
```

## 1.2.5

**Français** (Firefox : « Notes de version » ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• Disponible sur Firefox pour Android.
• Nouveau : dans un message qui vouvoie (« Bonjour Madame… »), un « tu » échappé est signalé avec sa forme en « vous ».
• « Ignorer » ne masque plus que la faute choisie ; « Ignorer partout » masque toutes les fautes identiques du texte.
• L’espace manquante avant « ! ? : ; » est signalée (« quand même! »).
• Beaucoup plus de fautes trouvées en français (subjonctif après « bien que », accord du participe, homophones) et en anglais américain (your/you’re, its/it’s, except, fewer/less, pronoms).
• Moins de fausses alertes : SMS et messages de chat sans point final, orthographe britannique, « au fur et à mesure », « il y a la carte », jargon (placo, npm install).
• Corrigé : sur X (Twitter), les soulignements restaient affichés quand la barre de recherche se cachait au défilement.
```

**English** (Opera "Changelog", Firefox if an English field is offered):

```text
• Now available on Firefox for Android.
• New: in a French message that says "vous" ("Bonjour Madame…"), a stray "tu" is flagged with its "vous" form.
• "Ignore" now hides only the chosen mistake; "Ignore all" hides every identical one in the text.
• Many more mistakes found in American English (your/you're, its/it's, except/accept, fewer/less, pronouns, plurals written with an apostrophe) and in French.
• Fewer false alarms: text messages and chats without a final period, British spellings (colour, practise, cheque).
• Fixed: on X (Twitter), underlines stayed on screen when the search bar hid on scroll.
```

**Notes aux testeurs Firefox** (en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

1.2.5 changes the checking rules (src/engine/) and the in-page UI (src/content/), and declares Firefox for Android (gecko_android); no new permission.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.5.zip, run "node scripts/build.js firefox" (Node.js 18+, no dependencies), output in dist/freecorrector-1.2.5-firefox.zip.

To test: type "Bonjour Madame, merci pour votre retour. Est-ce que tu peux me rappeler ?" or "Your going to love it, it's lid is great." in any text field, then press Ctrl+Shift+F.
```

## 1.2.4

**Français** (Firefox : « Notes de version » ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• Les adresses web ne sont plus jamais corrigées, quelle que soit leur extension (liens courts comme goo.gl, youtu.be, t.co…).
• Moins de fausses alertes, en français comme en anglais, sur des textes soignés (vérifiés sur des articles Wikipédia) : titres d’œuvres, noms de lieux, sujets inversés, citations, tournures passives.
• Meilleures suggestions : « une cocote » → « cocotte », « cocotte-minute ».
```

**English** (Opera "Changelog", Firefox if an English field is offered):

```text
• Web addresses are never checked anymore, whatever their ending (short links such as goo.gl, youtu.be, t.co…).
• Fewer false alarms in English and French on carefully written text (checked against Wikipedia articles): passive voice, "so many", titles, place names, quotations.
• Better suggestions for misspelled French nouns.
```

**Notes aux testeurs Firefox** (en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

1.2.4 changes only the checking rules (src/engine/); no new permission.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.4.zip, run "node scripts/build.js firefox" (Node.js 18+, no dependencies), output in dist/freecorrector-1.2.4-firefox.zip.

To test: type "je suis aller au marché et il faut que tu vien" or "Their expecting us tomorow" in any text field, then press Ctrl+Shift+F.
```

## 1.2.3

**Français** (Firefox : « Notes de version » ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• Beaucoup plus de fautes trouvées, en français comme en anglais, grâce à deux nouvelles séries de tests : homophones (« on/ont », « près/prêt », « voire/voir », « plutôt/plus tôt »), participes passés, mots composés (« grille-pain »), accords des adjectifs, apostrophes oubliées (« J ai »).
• En anglais : faux amis des francophones (assist/attend, sensible/sensitive, « I have 25 years »), comparatifs (« more easy »), questions (« Where you are going? »), they're/their/there, verbes irréguliers.
• Meilleures suggestions : la forme la plus probable passe en premier.
• Moins de fausses alertes : citations en anglais dans un texte français, hashtags en fin de message, « Manges-en », « T’es en forme toi ».
• Corrigé : le logo ne s’affichait pas sur Chrome, Edge, Brave et Opera.
```

**English** (Opera "Changelog", Firefox if an English field is offered):

```text
• Many more mistakes caught in English and French, thanks to two new rounds of tests: confused words (they're/their, accept/except, brake/break, then/than), irregular verbs, comparatives ("more easy"), questions ("Where you are going?"), the false friends French speakers use (assist/attend, sensible/sensitive, "I have 25 years").
• Better suggestions: the most likely fix comes first.
• Fewer false alarms: English quotes inside French text, hashtags at the end of a post, contractions such as "I'll".
• Fixed: the logo did not show on Chrome, Edge, Brave and Opera.
```

**Notes aux testeurs Firefox** (en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

1.2.3 changes only the checking rules (src/engine/) and the build script; no new permission.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.3.zip, run "node scripts/build.js firefox" (Node.js 18+, no dependencies), output in dist/freecorrector-1.2.3-firefox.zip.

To test: type "je suis aller au marché et il faut que tu vien" or "Their expecting us tomorow" in any text field, then press Ctrl+Shift+F.
```

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
