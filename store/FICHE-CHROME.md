# Fiche Chrome Web Store — FreeCorrector 1.2.0

Chaque texte est dans un bloc : copier le contenu du bloc tel quel dans le champ indiqué.

## 0. Compte développeur (une seule fois)

1. Aller sur https://chrome.google.com/webstore/devconsole avec un compte Google (activer la
   validation en deux étapes du compte si Google la demande).
2. Accepter le contrat développeur et payer les frais d’inscription uniques (5 $).
3. Profil / Compte : nom d’éditeur **BenjiBurn**, adresse e-mail de contact vérifiée.
4. Statut professionnel (Digital Services Act) : choisir **non-trader** (particulier, projet non
   commercial). Avant de valider, lire le texte à côté de chaque champ : si un champ (adresse,
   téléphone) indique qu’il sera **affiché publiquement**, ne pas mettre son adresse personnelle.

## 1. Fichier à envoyer

`dist/freecorrector-1.2.0-chromium.zip`

## 2. Onglet « Fiche Play Store » (Store listing)

**Description** (le résumé court vient du manifest, rien à saisir) :

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
| Catégorie | Productivité (sous-catégorie « Outils » si elle est demandée) |
| Langue | Français |
| Icône du store (128×128) | `store/icone-128.png` |
| Captures d’écran (1280×800, jusqu’à 5) | `store/capture-1-bulle.png`, `capture-2-correcteur.png`, `capture-3-anglais.png`, `capture-4-liste.png` |
| Petite vignette promotionnelle (440×280, **obligatoire**) | `store/promo-440x280.png` |
| Grande bannière (1400×560, facultative) | `store/banniere-1400x560.png` |
| Site officiel | https://lapigeonnerie.fr/freecorrector |
| URL d’assistance | https://github.com/BenjiBurn/FreeCorrector/issues |

## 3. Onglet « Pratiques de confidentialité » (Privacy)

**Objectif unique** (Single purpose) :

```text
Corriger l’orthographe et la grammaire (français et anglais) du texte que l’utilisateur écrit dans les champs de texte des pages web, entièrement en local dans le navigateur.
```

**Justification de « storage »** :

```text
Enregistre localement (storage.local) les réglages de l’utilisateur, son dictionnaire personnel et le brouillon de la page « Correcteur ». Rien n’est envoyé à un serveur.
```

**Justification de « activeTab »** :

```text
Le menu de l’extension lit le nom de domaine de l’onglet actif pour permettre à l’utilisateur de désactiver la correction sur ce site.
```

**Justification de « offscreen »** :

```text
Le correcteur (Grammalecte et Harper) tourne dans des Web Workers. Un service worker ne pouvant pas lancer de Web Worker, l’extension utilise un document hors écran (raison WORKERS) pour les héberger. Aucun contenu n’y est affiché.
```

**Justification de l’autorisation d’accès à l’hôte** (scripts de contenu sur toutes les URL) :

```text
La correction doit fonctionner dans les champs de texte de n’importe quel site. Le script de contenu lit uniquement le texte du champ dans lequel l’utilisateur écrit, l’envoie au correcteur interne de l’extension (runtime.sendMessage) et affiche les soulignements. Aucun texte ne quitte le navigateur : la politique de sécurité (connect-src 'self') interdit toute connexion réseau.
```

**Code distant** : choisir **« Non, je n’utilise pas de code distant »**. Tout le code, y compris le
module WebAssembly de Harper, est inclus dans le paquet.

**Utilisation des données** : ne cocher **aucun** type de données collectées, puis cocher les trois
attestations :
- je ne vends ni ne transfère les données des utilisateurs à des tiers… ;
- je n’utilise ni ne transfère les données des utilisateurs à des fins sans rapport avec la
  fonctionnalité principale… ;
- je n’utilise ni ne transfère les données des utilisateurs pour déterminer leur solvabilité…

**URL des règles de confidentialité** :

```text
https://github.com/BenjiBurn/FreeCorrector/blob/main/PRIVACY.md
```

## 4. Onglet « Distribution »

| Champ | Valeur |
|---|---|
| Paiement | Sans frais |
| Visibilité | Public |
| Régions | Toutes les régions |

## 5. Notes pour la revue (si un champ est proposé)

```text
No account or login is needed: the extension works on any page with a text field. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Source: https://github.com/BenjiBurn/FreeCorrector. To test: type "je suis aller au marché" or "Their going tomorow" in any text field, or open the toolbar menu and click "Ouvrir le correcteur".
```
