# Fiche Opera Add-ons — FreeCorrector 1.2.1

Chaque texte est dans un bloc : copier le contenu du bloc tel quel dans le champ indiqué.
Opera utilise le même paquet que Chrome et Edge (format Chromium).

## 1. Fichier à envoyer

`dist/freecorrector-1.2.1-chromium.zip`

## 2. Fiche

**Nom** :

```text
FreeCorrector
```

**Résumé** :

```text
Correcteur d’orthographe et de grammaire français et anglais, gratuit et libre. Tout est analysé dans le navigateur : rien n’est envoyé sur Internet.
```

**Description** :

```text
FreeCorrector corrige vos fautes partout où vous écrivez : e-mails, réseaux sociaux, formulaires, messageries, documents en ligne… Gratuit, sans compte, sans abonnement, sans publicité.

Comment ça marche
• Les fautes sont soulignées pendant que vous tapez : rouge pour l’orthographe, orange pour la grammaire, bleu pour la typographie.
• Un clic sur le mot souligné affiche la correction recommandée, et les autres suggestions juste en dessous.
• Un compteur en bas à droite du champ indique le nombre de fautes. Un clic dessus ouvre la liste complète.
• La page « Correcteur » (bouton du menu) permet de coller un long texte, de voir toutes les fautes et de tout corriger en un clic.

Français et anglais
La langue est détectée automatiquement, phrase par phrase : un e-mail en français avec une citation en anglais est corrigé dans les deux langues. Accords, conjugaison, homophones (a/à, et/est, ça/sa, ou/où, ces/ses, leur/leurs…), participes passés, subjonctif, accents, majuscules, ponctuation, fautes de frappe qui donnent un autre mot (« mot de basse », « une dent de lit »)… En anglais : your/you’re, its/it’s, their/there/they’re, accords sujet-verbe, articles, temps, fautes de frappe.

Vos textes restent chez vous
L’analyse se fait entièrement dans votre navigateur. FreeCorrector n’envoie rien sur Internet, ne collecte aucune donnée et fonctionne même hors connexion. Le navigateur lui interdit d’ailleurs toute connexion réseau.

Et aussi
• Dictionnaire personnel (« Ajouter au dictionnaire »), à importer ou exporter en fichier texte.
• « Désactiver cette règle » pour ne plus voir un type de faute.
• Clic droit sur un texte sélectionné → « Corriger avec FreeCorrector ».
• Désactivation sur les sites de votre choix.
• Mode exigeant pour la typographie fine (espaces insécables, apostrophes typographiques…).
• Fonctionne aussi dans les zones de texte mises en forme (éditeurs riches des webmails, réseaux sociaux et outils en ligne).
• Le code, les adresses, les liens et les noms propres ne sont pas pris pour des fautes.
• Annulation avec Ctrl+Z après une correction.

Logiciel libre
FreeCorrector est un logiciel libre (licence GPL v3). Il s’appuie sur deux moteurs libres : Grammalecte pour le français et Harper pour l’anglais, auxquels il ajoute ses propres règles et un classement des suggestions selon le contexte. Code source : https://github.com/BenjiBurn/FreeCorrector

Créé par BenjiBurn.
```

| Champ | Valeur |
|---|---|
| Catégorie | Productivité |
| Langue | Français |
| Icône (64×64) | `store/opera/icone-64.png` |
| Image promotionnelle (300×188, facultative) | `store/opera/promo-300x188.png` |
| Captures d’écran (800×500) | `store/opera/capture-1-bulle-800x500.png`, `capture-2-correcteur-800x500.png`, `capture-3-anglais-800x500.png`, `capture-4-liste-800x500.png` |
| Licence | GPL-3.0 |
| Site | https://github.com/BenjiBurn/FreeCorrector |
| Assistance | https://github.com/BenjiBurn/FreeCorrector/issues |
| Règles de confidentialité | https://github.com/BenjiBurn/FreeCorrector/blob/main/PRIVACY.md |
| Code source (si demandé) | https://github.com/BenjiBurn/FreeCorrector |

## 3. Notes pour la revue (si un champ est proposé)

```text
No account or login is needed: the extension works on any page with a text field. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the two engines are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md in the repository). The "offscreen" permission hosts the checking Web Workers, which a service worker cannot start. Source: https://github.com/BenjiBurn/FreeCorrector. To test: type "je suis aller au marché" or "Their going tomorow" in any text field, or open the toolbar menu and click "Ouvrir le correcteur".
```

## 4. Notes de version 1.1.0

```text
• Beaucoup plus de fautes détectées en français et en anglais : accords du participe passé, verbes pronominaux, futur et conditionnel, pays (« en France », « au Japon »), accords sujet-verbe et articles en anglais.
• Nouveau : les fautes de frappe qui donnent un autre mot sont repérées dans les expressions courantes (« mot de basse » → « mot de passe »).
• Moins de fausses alertes : le code, les numéros de version, les #hashtags, les noms étrangers et les mots empruntés (« un call », « déjà vu ») ne sont plus soulignés.
• La langue est détectée phrase par phrase.
```

## 5. Version anglaise (obligatoire sur Opera : langue par défaut)

**Summary** :

```text
Free, open-source French and English spelling and grammar checker. Everything runs in your browser: nothing is sent to the Internet.
```

**Detailed description** :

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

## 6. Champs de la page de version

| Champ | Valeur |
|---|---|
| Service website URL | vide (l'extension ne se connecte à aucun service) |
| Extension support page URL | https://github.com/BenjiBurn/FreeCorrector/issues |
| Source code URL (public) | https://github.com/BenjiBurn/FreeCorrector |
| Source code URL (moderators) | https://github.com/BenjiBurn/FreeCorrector/tree/v1.2.1 (le tag de la version) |
| License URL | https://github.com/BenjiBurn/FreeCorrector/blob/main/LICENSE |
| Privacy policy URL | https://github.com/BenjiBurn/FreeCorrector/blob/main/PRIVACY.md |

**Build instructions** :

```text
Any OS (built on Windows 10). Node.js 18 or later; no npm install needed, the build has no dependencies.
1. Download the source: https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.1.zip and unzip it.
2. In the unzipped folder, run: node scripts/build.js chromium
3. The package is written to dist/freecorrector-1.2.1-chromium.zip (unpacked copy in dist/chromium/).
Our own code is not minified or bundled: the build only copies src/ and adapts manifest.json for Chromium. The two engines in src/vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (npm), see NOTE_FOR_REVIEWERS.md.
```
