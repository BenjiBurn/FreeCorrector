# FreeCorrector

Correcteur d’orthographe et de grammaire **libre, gratuit et 100 % local** pour le navigateur.

FreeCorrector souligne les fautes directement dans les champs de texte des sites web, comme le
font les correcteurs du commerce, mais sans abonnement, sans compte et sans envoyer une seule
ligne de vos textes sur Internet : toute l’analyse tourne dans votre navigateur.

- Soulignement des fautes dans les `<textarea>` et les champs texte
  - rouge : orthographe
  - orange : grammaire (accords, conjugaison, homophones…)
  - bleu : typographie et style
- Compteur de fautes en bas à droite du champ ; un clic ouvre la liste complète
- Clic sur un mot souligné : suggestions de correction, « Ignorer », « Ajouter au dictionnaire »
- Dictionnaire personnel, désactivation par site, mode exigeant
- Langue : français (d’autres langues sont prévues)

Le moteur de correction est [Grammalecte](https://grammalecte.net/), le correcteur grammatical
libre de référence pour le français.

## Installer (développement)

Firefox 128 ou plus récent :

1. Ouvrir `about:debugging#/runtime/this-firefox`
2. Cliquer sur **Charger un module complémentaire temporaire…**
3. Choisir le fichier `src/manifest.json`
4. Cliquer sur l’icône FreeCorrector puis **Page de test**, ou aller sur n’importe quel site et
   cliquer dans un champ de texte

Les fichiers locaux (`file://`) ne sont pas corrigés : Firefox n’y injecte pas les extensions.

Le module reste chargé jusqu’à la fermeture de Firefox. Après une modification du code, cliquer
sur **Recharger** dans `about:debugging`.

Avec Node.js, [`web-ext`](https://github.com/mozilla/web-ext) permet de lancer un Firefox
de test qui recharge l’extension automatiquement, et de valider le paquet :

```sh
npx web-ext run   --source-dir src
npx web-ext lint  --source-dir src
npx web-ext build --source-dir src
```

## Structure

```
src/
  manifest.json            Manifest V3 (Firefox)
  background.js            Pilote le moteur, cache, dictionnaire personnel
  engine/
    grammalecte-worker.js  Fait tourner Grammalecte dans un Web Worker
    suggestions.js         Reclasse les suggestions selon le contexte
    rules.js               Règles maison : homophones et accords que Grammalecte rate
    sentence-rules.js      Majuscule en début et ponctuation en fin de phrase
  data/fr-freq.txt         Fréquence des 50 000 mots français les plus courants
  content/                 Scripts injectés dans les pages
    field.js               Un vérificateur par champ : calque miroir, soulignements, compteur
    ui.js                  Shadow DOM : bulle de suggestions et panneau des fautes
    styles.js              CSS du shadow DOM
    main.js                Détection des champs, réglages
  popup/                   Menu de la barre d’outils
  options/                 Page d’options
  lib/                     Réglages et styles partagés
  demo/demo.html           Page de test avec des fautes (ouverte depuis le popup)
  vendor/grammalecte/      Moteur Grammalecte 2.3.0 (sous-ensemble non modifié)
tests/
  run.js                   Fait tourner le moteur sous Node et le note sur les corpus
  fr-corpus.js             Corpus de fautes courantes (homophones, accords, accents…)
  fr-holdout.js            Second corpus, pour vérifier que les réglages se généralisent
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

## Feuille de route

- [ ] Chrome, Edge, Opera, Brave (Manifest V3 avec document hors écran pour le worker)
- [ ] Champs `contenteditable` (Gmail, éditeurs riches, réseaux sociaux)
- [ ] Autres langues (anglais, espagnol, allemand…) via des moteurs libres
- [ ] Publication sur addons.mozilla.org, Chrome Web Store, Edge Add-ons
- [ ] Site web de présentation et d’installation

## Auteur

Créé par **BenjiBurn**.

## Licence

FreeCorrector est un logiciel libre distribué sous licence **GNU GPL v3** (voir [LICENSE](LICENSE)).

Il intègre Grammalecte © Olivier R., également sous GPL v3, sans modification
(`src/vendor/grammalecte/`), et la liste de fréquence
[FrequencyWords](https://github.com/hermitdave/FrequencyWords) de Hermit Dave, sous licence
CC BY-SA 4.0 (`src/data/`).
