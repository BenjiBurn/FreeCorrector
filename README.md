# FreeCorrector

Correcteur d’orthographe et de grammaire **libre, gratuit et 100 % local** pour le navigateur.

FreeCorrector souligne les fautes directement dans les champs de texte des sites web, comme le
font les correcteurs du commerce, mais sans abonnement, sans compte et sans envoyer une seule
ligne de vos textes sur Internet : toute l’analyse tourne dans votre navigateur.

- Soulignement des fautes dans les `<textarea>`, les champs texte et les éditeurs riches
  (`contenteditable` : Gmail, Outlook, Discord, Notion…)
  - rouge : orthographe
  - orange : grammaire (accords, conjugaison, homophones…)
  - bleu : typographie et style
- Compteur de fautes en bas à droite du champ ; un clic ouvre la liste complète
- Clic sur un mot souligné : suggestions de correction, « Ignorer », « Ajouter au dictionnaire »
- Dictionnaire personnel, désactivation par site, mode exigeant
- Langues : français et anglais, détectées automatiquement paragraphe par paragraphe
- Page « Correcteur » (bouton du menu) : collez ou écrivez un texte, toutes les fautes sont
  listées avec la correction recommandée, « Tout corriger » et « Copier » en un clic
- Aucune connexion réseau : la politique de sécurité de l’extension (`connect-src 'self'`)
  interdit au navigateur toute requête vers Internet depuis l’extension

Les moteurs de correction sont [Grammalecte](https://grammalecte.net/), le correcteur grammatical
libre de référence pour le français, et [Harper](https://github.com/Automattic/harper) pour
l’anglais (WebAssembly). FreeCorrector ajoute par-dessus ses propres règles et son classement des
suggestions.

## Navigateurs pris en charge

| Navigateur | Paquet | Store |
|---|---|---|
| Firefox 140+ | `dist/freecorrector-<version>-firefox.zip` | addons.mozilla.org |
| Chrome, Brave, Vivaldi (116+) | `dist/freecorrector-<version>-chromium.zip` | Chrome Web Store |
| Edge | `dist/freecorrector-<version>-chromium.zip` | Edge Add-ons |
| Opera | `dist/freecorrector-<version>-chromium.zip` | Opera add-ons |
| Safari | à convertir sur macOS avec Xcode (`xcrun safari-web-extension-converter dist/chromium`) | App Store |

Les paquets se construisent avec Node.js (aucune dépendance) :

```sh
npm run build        # ou : node scripts/build.js [firefox|chromium]
```

Sous Chromium, l’arrière-plan d’une extension MV3 est un service worker, qui ne peut pas lancer
de Web Worker : le moteur y tourne dans un document hors écran (`src/chromium/`). Sous Firefox, il
tourne directement dans la page d’arrière-plan. Le reste du code est commun.

## Installer (développement)

**Firefox** (140 ou plus récent) :

1. Ouvrir `about:debugging#/runtime/this-firefox`
2. Cliquer sur **Charger un module complémentaire temporaire…**
3. Choisir le fichier `src/manifest.json` (ou `dist/firefox/manifest.json`)

Le module reste chargé jusqu’à la fermeture de Firefox. Après une modification du code, cliquer
sur **Recharger** dans `about:debugging`.

**Chrome, Edge, Brave, Opera, Vivaldi** :

1. Lancer `npm run build`
2. Ouvrir `chrome://extensions` (ou `edge://extensions`, `brave://extensions`…)
3. Activer le **mode développeur**
4. Cliquer sur **Charger l’extension non empaquetée** et choisir le dossier `dist/chromium`

Ensuite, cliquer sur l’icône FreeCorrector puis **Page de test**, ou aller sur n’importe quel
site et cliquer dans un champ de texte. Les fichiers locaux (`file://`) ne sont pas corrigés :
les navigateurs n’y injectent pas les extensions par défaut.

Avec Node.js, [`web-ext`](https://github.com/mozilla/web-ext) permet de lancer un Firefox de test
qui recharge l’extension automatiquement, et de valider le paquet Firefox :

```sh
npx web-ext run  --source-dir src
npx web-ext lint --source-dir dist/firefox
```

## Structure


```
src/
  manifest.json            Manifest V3 (base Firefox ; adapté pour Chromium au build)
  background.js            Arrière-plan Firefox
  chromium/                Arrière-plan Chromium : service worker + document hors écran
  engine/
    host.js                Pilote les moteurs (workers), répartit les paragraphes par langue
    language.js            Détection français / anglais par paragraphe
    english.js             Moteur anglais (Harper) : conversion, classement, règles
    english-rules.js       Règles maison anglaises (your/you're, loose/lose, contractions…)
    english-worker.js      Worker (module ES) du moteur anglais
    grammalecte-worker.js  Fait tourner Grammalecte dans un Web Worker
    suggestions.js         Reclasse les suggestions selon le contexte
    rules.js               Règles maison : homophones et accords que Grammalecte rate
    sentence-rules.js      Majuscule en début et ponctuation en fin de phrase
  data/                    Fréquence des 50 000 mots français et anglais les plus courants
  content/                 Scripts injectés dans les pages
    field.js               Base commune des champs + textarea/input (calque miroir)
    rich-field.js          Éditeurs riches contenteditable (soulignements par Range)
    ui.js                  Shadow DOM : bulle de suggestions et panneau des fautes
    styles.js              CSS du shadow DOM
    main.js                Détection des champs, réglages
  popup/                   Menu de la barre d’outils
  options/                 Page d’options
  lib/                     Réglages et styles partagés
  editor/                  Page « Correcteur » : grande zone de texte et liste des fautes
  demo/demo.html           Page de test avec des fautes (développement uniquement : absente des
                           paquets publiés, le bouton du menu n’apparaît qu’en développement)
  vendor/grammalecte/      Moteur Grammalecte 2.3.0 (sous-ensemble non modifié)
  vendor/harper/           Moteur Harper 2.10.0 (harper.js, binaire WebAssembly)
scripts/build.js           Construit dist/firefox et dist/chromium (+ zips pour les stores)
tests/
  run.js                   Fait tourner le moteur sous Node et le note sur les corpus
  fr-corpus.js             Corpus de fautes courantes (homophones, accords, accents…)
  fr-holdout.js            Second corpus, pour vérifier que les réglages se généralisent
  en-corpus.js             Corpus de fautes anglaises courantes
  fr-blind.js, en-holdout.js  Corpus écrits après les réglages, pour une mesure honnête
  fr-blind2-4.js, en-blind2-4.js  Corpus écrits avant chaque nouvelle passe de réglages
  clean-messages.js        Messages du quotidien corrects : aucune alerte ne doit sortir
  stress.mjs               Textes extrêmes : pas de plantage, pas de lenteur
```

### Fonctionnement

Le script de contenu s’attache à chaque champ texte que l’utilisateur sélectionne. Il superpose au
champ un « miroir » : une copie transparente du texte, avec la même police, les mêmes marges et le
même défilement, dans laquelle chaque faute est entourée d’un `<span>` souligné. Le texte du champ
reste intact, le miroir ne capte pas la souris. Tout vit dans un shadow DOM fermé, donc le CSS des
sites ne le touche pas.

Après une pause de frappe (600 ms), le texte est envoyé au script d’arrière-plan, qui le transmet à
Grammalecte dans un Web Worker. Les positions renvoyées (en indices UTF-16) correspondent
directement à la valeur du champ. Pendant la frappe, les soulignements existants sont décalés
plutôt qu’effacés, pour éviter le clignotement.

Les suggestions sont ensuite reclassées selon le contexte (`src/engine/suggestions.js`). Chaque
candidat est remis dans la phrase, où les fautes précédentes sont déjà corrigées, et la phrase
est revérifiée. Les candidats qui ne laissent plus de faute passent en tête, puis ceux qui se
prononcent comme le mot tapé. Pour les verbes, les formes homophones sont ajoutées aux
candidats : « je vien te parlé » donne « viens », puis « parler », et « il faut que tu vien »
donne « viennes ». Une faute qui n'existait qu'à cause d'une faute précédente n'est plus
signalée : dans « il ma dit », seul « ma » est souligné.

Deux règles de phrase complètent Grammalecte (`src/engine/sentence-rules.js`). La première
signale un paragraphe qui commence par une minuscule. La seconde signale un paragraphe d'au moins
trois mots sans ponctuation finale, et propose « . », « ! » ou « ? », avec « ? » en premier pour
une question. Le point manquant n'est pas signalé tant que le curseur est en fin de phrase,
pour ne pas gêner la frappe. Ces deux règles ne s'appliquent jamais aux champs de recherche, et
une option permet de les désactiver.

Les corrections passent par `document.execCommand("insertText")`, ce qui conserve l’historique
d’annulation (Ctrl+Z) et déclenche un vrai évènement `input`, compris par React, Vue, etc.

### Tests de qualité

`npm test` (ou `node tests/run.js`) fait tourner le vrai moteur sur les corpus et affiche le taux
de fautes détectées, le taux de bonnes suggestions en première position et les fausses alertes
sur des phrases correctes. À lancer après chaque modification du moteur.

`npm run stress` (ou `node tests/stress.mjs`) soumet aux deux moteurs des textes extrêmes (émojis,
code, URL, paragraphe de 28 000 caractères, mot de 5 000 lettres, Unicode exotique) et vérifie
qu'aucun ne plante, ne place mal un soulignement ou ne dépasse son budget de temps.

## Feuille de route

- [x] Chrome, Edge, Opera, Brave, Vivaldi (Manifest V3 avec document hors écran pour le worker)
- [ ] Safari (conversion Xcode sur macOS)
- [x] Champs `contenteditable` (Gmail, Outlook, Discord, Notion, éditeurs Quill, ProseMirror…)
- [x] Anglais (Harper)
- [ ] Autres langues (espagnol, allemand…) via des moteurs libres
- [ ] Publication sur addons.mozilla.org, Chrome Web Store, Edge Add-ons
- [ ] Site web de présentation et d’installation

## Auteur

Créé par **BenjiBurn**.

## Licence

FreeCorrector est un logiciel libre distribué sous licence **GNU GPL v3** (voir [LICENSE](LICENSE)).

Il intègre Grammalecte © Olivier R., également sous GPL v3, sans modification
(`src/vendor/grammalecte/`), Harper © Automattic sous licence Apache 2.0 (`src/vendor/harper/`),
et la liste de fréquence
[FrequencyWords](https://github.com/hermitdave/FrequencyWords) de Hermit Dave, sous licence
CC BY-SA 4.0 (`src/data/`).
