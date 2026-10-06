# Fiche Microsoft Edge Add-ons — FreeCorrector 1.2.0

Inscription gratuite : https://partner.microsoft.com/dashboard/microsoftedge/overview
(compte Microsoft, programme « Microsoft Edge » du Partner Center).
Chaque texte est dans un bloc : copier le contenu du bloc tel quel dans le champ indiqué.
Edge utilise le même paquet que Chrome et Opera (format Chromium).

## 1. Packages

Fichier à envoyer : `dist/freecorrector-1.2.0-chromium.zip`

## 2. Availability

| Champ | Valeur |
|---|---|
| Visibility | Public |
| Markets | Tous les marchés |

## 3. Properties

| Champ | Valeur |
|---|---|
| Category | Productivity |
| Does your extension access, collect or transmit personal information? | No |
| Privacy policy URL | https://github.com/BenjiBurn/FreeCorrector/blob/main/PRIVACY.md |
| Website URL | https://lapigeonnerie.fr/freecorrector |
| Support contact details | https://github.com/BenjiBurn/FreeCorrector/issues |
| Mature content | No |

## 4. Store listings

Ajouter deux langues : **French** et **English**. Les images sont les mêmes pour les deux.

| Champ | Fichier |
|---|---|
| Extension Store logo (300×300, obligatoire) | `store/edge/logo-300.png` |
| Small promotional tile (440×280) | `store/promo-440x280.png` |
| Large promotional tile (1400×560) | `store/banniere-1400x560.png` |
| Screenshots (1280×800) | `store/capture-1-bulle.png`, `capture-2-correcteur.png`, `capture-3-anglais.png`, `capture-4-liste.png` |

### French

**Description** :

```text
FreeCorrector corrige vos fautes partout où vous écrivez : e-mails, réseaux sociaux, formulaires, messageries, documents en ligne… Gratuit, sans compte, sans abonnement, sans publicité.

Comment ça marche
• Les fautes sont soulignées pendant que vous tapez : rouge pour l’orthographe, orange pour la grammaire, bleu pour la typographie.
• Un clic sur le mot souligné affiche la correction recommandée, et les autres suggestions juste en dessous.
• Un compteur en bas à droite du champ indique le nombre de fautes. Un clic dessus ouvre la liste complète.
• La page « Correcteur » (bouton du menu) permet de coller un long texte, de voir toutes les fautes et de tout corriger en un clic.

Français et anglais
La langue est détectée automatiquement, phrase par phrase : un e-mail en français avec une citation en anglais est corrigé dans les deux langues. Accords, conjugaison, homophones (a/à, et/est, ça/sa, ou/où, ces/ses, leur/leurs…), participes passés, subjonctif, accents, majuscules, ponctuation, fautes de frappe qui donnent un autre mot (« mot de basse »)… En anglais : your/you’re, its/it’s, their/there/they’re, accords sujet-verbe, articles, temps, fautes de frappe.

Vos textes restent chez vous
L’analyse se fait entièrement dans votre navigateur. FreeCorrector n’envoie rien sur Internet, ne collecte aucune donnée et fonctionne même hors connexion. Le navigateur lui interdit d’ailleurs toute connexion réseau.

Et aussi
• Dictionnaire personnel (« Ajouter au dictionnaire »), à importer ou exporter en fichier texte.
• « Désactiver cette règle » pour ne plus voir un type de faute.
• Clic droit sur un texte sélectionné → « Corriger avec FreeCorrector ».
• Désactivation sur les sites de votre choix.
• Mode exigeant pour la typographie fine.
• Fonctionne aussi dans les zones de texte mises en forme (éditeurs riches des webmails, réseaux sociaux et outils en ligne).
• Le code, les adresses, les liens et les noms propres ne sont pas pris pour des fautes.
• Annulation avec Ctrl+Z après une correction.

Logiciel libre
FreeCorrector est un logiciel libre (licence GPL v3). Il s’appuie sur deux moteurs libres : Grammalecte pour le français et Harper pour l’anglais, auxquels il ajoute ses propres règles et un classement des suggestions selon le contexte. Code source : https://github.com/BenjiBurn/FreeCorrector

Créé par BenjiBurn.
```

**Short description** (si le champ est demandé) :

```text
Correcteur d’orthographe et de grammaire français et anglais, gratuit et libre. Tout est analysé dans le navigateur : rien n’est envoyé sur Internet.
```

**Search terms** (un par case, 7 au maximum) :

```text
correcteur orthographe
correcteur grammaire
conjugaison
orthographe
grammaire
correcteur gratuit
français
```

### English

**Description** :

```text
FreeCorrector fixes your mistakes wherever you write: email, social networks, forms, chat apps, online documents… Free, no account, no subscription, no ads.

How it works
• Mistakes are underlined as you type: red for spelling, orange for grammar, blue for typography.
• Click an underlined word to see the recommended fix, with the other suggestions right below it.
• A counter at the bottom right of the field shows how many mistakes there are. Click it to open the full list.
• The proofreader page (toolbar menu) lets you paste a long text, see every mistake and fix them all in one click. Or select text on any page and right-click "Check with FreeCorrector".

French and English
The language is detected automatically, sentence by sentence: a French email quoting an English sentence is checked in both languages. In English: your/you're, its/it's, their/there/they're, subject-verb agreement, articles, verb tenses, words typed for others (then/than, lose/loose, form/from…) and typos. In French: agreement, conjugation, homophones (a/à, et/est, ça/sa, ou/où…), past participles, subjunctive, accents, capitals, punctuation.

Your texts stay with you
Everything is analyzed inside your browser. FreeCorrector sends nothing over the Internet, collects no data and even works offline. The browser itself forbids it any network connection.

Also
• Personal dictionary ("Add to dictionary"), with import and export as a text file.
• "Turn off this rule" to stop seeing a kind of mistake.
• Turn it off on the sites you choose.
• Picky mode for fine typography.
• Works in rich text editors too (webmail, social networks, online tools).
• Code, addresses, links and names are not taken for mistakes.
• Undo with Ctrl+Z after a correction.

Free software
FreeCorrector is free software (GPL v3). It builds on two free engines, Grammalecte for French and Harper for English, and adds its own rules and context-aware ranking of suggestions. Source code: https://github.com/BenjiBurn/FreeCorrector

Created by BenjiBurn.
```

**Short description** :

```text
Free, open-source French and English spelling and grammar checker. Everything runs in your browser: nothing is sent to the Internet.
```

**Search terms** :

```text
spell checker
grammar checker
french grammar
spelling
grammar
proofreading
free
```

## 5. Notes for certification (au moment de « Publish »)

```text
No account or login is needed: the extension works on any page with a text field. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the two engines are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md). The "offscreen" permission hosts the checking Web Workers, which a service worker cannot start. Source and build instructions: https://github.com/BenjiBurn/FreeCorrector/tree/v1.2.0 (node scripts/build.js chromium). To test: type "je suis aller au marché" or "Their going tomorow" in any text field, or open the toolbar menu and click "Ouvrir le correcteur".
```
