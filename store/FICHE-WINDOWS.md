# Fiche Microsoft Store — FreeCorrector pour Windows 0.1.0

Partner Center : https://partner.microsoft.com/dashboard/apps-and-games/overview › FreeCorrector
(Store ID `9P3GM2HR6BZB`). « Démarrer votre soumission », puis chaque section ci-dessous.
Chaque texte est dans un bloc : copier le contenu du bloc tel quel dans le champ indiqué.

Cette première soumission se fait à la main. Les suivantes partent avec
`node windows/publish-store.js` (voir l'en-tête du script) ; elles reprennent tout ce qui est
saisi ici et ne changent que le paquet et les notes de version.

## 1. Tarification et disponibilité

| Champ | Valeur |
|---|---|
| Marchés | Tous les marchés |
| Visibilité | Public (visible et téléchargeable dans le Store) |
| Calendrier | Publier dès la certification |
| Tarification | Gratuit |
| Familles d'appareils | Windows 10/11 Desktop seulement |

## 2. Propriétés

| Champ | Valeur |
|---|---|
| Catégorie | Productivité (pas de sous-catégorie) |
| URL de politique de confidentialité | https://lapigeonnerie.fr/freecorrector-confidentialite |
| Site web | https://lapigeonnerie.fr/freecorrector |
| Coordonnées du support | https://github.com/BenjiBurn/FreeCorrector/issues |
| Configuration système | Clavier : recommandé ; Souris : recommandé ; le reste : rien |
| Déclarations du produit | Ne rien cocher, sauf « Cette app peut être installée sur un autre lecteur… » si c'est coché par défaut |

« Cette app accède-t-elle à des informations personnelles, les collecte ou les transmet ? » : **Oui**
(elle lit le texte des champs pour le corriger, en local). C'est pour ça que l'URL de confidentialité
est obligatoire ; la page explique que rien n'est enregistré ni envoyé.

## 3. Classifications par âge

Questionnaire IARC. Catégorie : **« Utilitaire, productivité, communication ou autre »**
(pas jeu, pas réseau social). Répondre **Non** à toutes les questions : pas de contenu violent ou
sexuel, pas d'échange entre utilisateurs, pas de partage de position, pas d'achats, pas d'accès
libre à Internet (ce n'est pas un navigateur). Résultat attendu : 3+ / Tout public.

## 4. Paquets

Fichier à envoyer : `dist/freecorrector-0.1.0-windows-x64.msix` (construit par `windows/package.ps1`).
Familles d'appareils : cocher **Windows 10/11 Desktop** seulement.

Le Store demande pourquoi l'app utilise la fonctionnalité restreinte **runFullTrust**. Champ
« Pourquoi avez-vous besoin de la fonctionnalité runFullTrust ? » :

```text
FreeCorrector is a spelling and grammar checker that works in any application. It is a desktop (WPF) app: it uses the Windows UI Automation API to read the text of the focused editable field in other applications (Outlook, Word, WordPad, Notepad...), draws click-through underlines over the mistakes and, when the user picks a suggestion, replaces the word by selecting it and typing the correction. It never reads password or read-only fields. All checking runs locally, in a WebView2 page bundled with the app; the app makes no network connection and collects no data. Source code: https://github.com/BenjiBurn/FreeCorrector
```

## 5. Descriptions dans le Store

Ajouter deux langues : **Français (France)** et **Anglais (États-Unis)**.

| Champ | Fichier |
|---|---|
| Captures d'écran (Bureau), français | `store/windows/capture-1-wordpad-fr.png`, `capture-2-outlook-fr.png` |
| Captures d'écran (Bureau), anglais | `store/windows/capture-3-wordpad-en.png`, puis `capture-2-outlook-fr.png` |
| Logos du Store, 1:1 300×300 (facultatif) | `store/edge/logo-300.png` |

Légendes des captures (champ sous chaque image) :

| Capture | Français | English |
|---|---|---|
| capture-1 | Les fautes soulignées dans WordPad, et la correction en un clic | Mistakes underlined in WordPad, fixed in one click |
| capture-2 | Dans Outlook aussi, pendant que vous écrivez | In Outlook too, as you type |
| capture-3 | Les fautes soulignées en français et en anglais | French and English mistakes underlined |

### Français

**Description** :

```text
FreeCorrector corrige vos fautes dans toutes vos applications : Outlook, Word, WordPad, le Bloc-notes et bien d'autres. Gratuit, sans compte, sans abonnement, sans publicité.

Comment ça marche
• Les fautes sont soulignées pendant que vous tapez : rouge pour l'orthographe, orange pour la grammaire, bleu pour la typographie.
• Passez la souris sur un mot souligné : la correction s'affiche, un clic la met à la place du mot.
• « Ignorer », « Ajouter au dictionnaire » et « Désactiver cette règle » sont dans la même bulle.
• Une icône près de l'horloge permet de couper la correction, de passer en mode exigeant ou d'ouvrir les réglages.

Français et anglais
La langue est détectée automatiquement, phrase par phrase. Accords, conjugaison, homophones (a/à, et/est, ça/sa, ou/où, ces/ses…), participes passés, accents, majuscules, ponctuation, fautes de frappe. En anglais : your/you're, its/it's, their/there/they're, accords sujet-verbe, articles, temps, fautes de frappe.

Vos textes restent chez vous
L'analyse se fait entièrement sur votre ordinateur. FreeCorrector n'envoie rien sur Internet et ne collecte aucune donnée ; il fonctionne même hors connexion. Les champs de mot de passe ne sont jamais lus.

Logiciel libre
FreeCorrector est un logiciel libre (licence GPL v3), aussi disponible en extension pour Firefox, Chrome, Edge, Opera et Thunderbird. Il s'appuie sur deux moteurs libres : Grammalecte pour le français et Harper pour l'anglais, auxquels il ajoute ses propres règles. Code source : https://github.com/BenjiBurn/FreeCorrector

Créé par BenjiBurn.
```

**Fonctionnalités du produit** (une par case) :

```text
Corrige l'orthographe et la grammaire dans toutes vos applications
Français et anglais, langue détectée phrase par phrase
Correction en un clic, au survol du mot souligné
Dictionnaire personnel et règles désactivables
Tout est analysé sur votre ordinateur : rien n'est envoyé sur Internet
Gratuit, libre et sans publicité
```

**Description courte** :

```text
Correcteur d'orthographe et de grammaire français et anglais pour toutes vos applications, gratuit et libre. Tout est analysé sur votre ordinateur.
```

**Termes de recherche** (7 au maximum) :

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
FreeCorrector fixes your mistakes in all your applications: Outlook, Word, WordPad, Notepad and many more. Free, no account, no subscription, no ads.

How it works
• Mistakes are underlined as you type: red for spelling, orange for grammar, blue for typography.
• Hover an underlined word to see the fix; one click puts it in place.
• "Ignore", "Add to dictionary" and "Turn off this rule" are in the same bubble.
• An icon next to the clock turns checking off, switches to picky mode or opens the settings.

French and English
The language is detected automatically, sentence by sentence. In English: your/you're, its/it's, their/there/they're, subject-verb agreement, articles, verb tenses and typos. In French: agreement, conjugation, homophones (a/à, et/est, ça/sa, ou/où…), past participles, accents, capitals, punctuation.

Your texts stay with you
Everything is analyzed on your computer. FreeCorrector sends nothing over the Internet and collects no data; it even works offline. Password fields are never read.

Free software
FreeCorrector is free software (GPL v3), also available as an extension for Firefox, Chrome, Edge, Opera and Thunderbird. It builds on two free engines, Grammalecte for French and Harper for English, and adds its own rules. Source code: https://github.com/BenjiBurn/FreeCorrector

Created by BenjiBurn.
```

**Product features** :

```text
Checks spelling and grammar in all your applications
French and English, language detected sentence by sentence
One-click fixes when you hover an underlined word
Personal dictionary and rules you can turn off
Everything is analyzed on your computer: nothing is sent to the Internet
Free, open source and ad-free
```

**Short description** :

```text
Free, open-source French and English spelling and grammar checker for all your applications. Everything is analyzed on your computer.
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

### Champs communs aux deux langues

| Champ | Valeur |
|---|---|
| Copyright et marque | © 2026 BenjiBurn |
| Termes de licence supplémentaires | GNU GPL v3 : https://github.com/BenjiBurn/FreeCorrector/blob/main/LICENSE |
| Développé par | BenjiBurn |

## 6. Options de soumission › Notes pour la certification

```text
No account or login is needed. After installation, FreeCorrector starts and shows an icon in the notification area (next to the clock); it starts again with Windows unless turned off in that icon's menu. To test: open WordPad or Notepad and type "Je suis aller au marché" or "Thanks for you're help": the mistakes are underlined after a short pause; hover an underlined word and click a suggestion to replace it. Settings: double-click the tray icon. Everything runs locally (the checking engines run in a bundled WebView2 page, every other host is blocked): no network requests, no data collected. runFullTrust is needed for the UI Automation API, which reads the focused text field of other applications. Source code: https://github.com/BenjiBurn/FreeCorrector (windows/ folder; windows/package.ps1 builds the package).
```
