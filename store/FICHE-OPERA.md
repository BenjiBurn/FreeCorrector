# Fiche Opera Add-ons — FreeCorrector 1.1.0

Chaque texte est dans un bloc : copier le contenu du bloc tel quel dans le champ indiqué.
Opera utilise le même paquet que Chrome et Edge (format Chromium).

## 1. Fichier à envoyer

`dist/freecorrector-1.1.0-chromium.zip`

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
• Dictionnaire personnel (« Ajouter au dictionnaire »).
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
