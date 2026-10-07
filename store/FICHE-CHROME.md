# Fiche Chrome Web Store — FreeCorrector 1.2.0

Chaque texte est dans un bloc : copier le contenu du bloc tel quel dans le champ indiqué.
Tableau de bord : https://chrome.google.com/webstore/devconsole

## 0. Compte développeur (une seule fois)

1. Frais d’inscription (5 $) payés.
2. Onglet **Compte** (Account) :
   - Nom d’éditeur (Publisher name) : **BenjiBurn** ;
   - Adresse e-mail de contact : **benjiburn@gmail.com**, puis cliquer sur le lien de vérification
     reçu par e-mail (sans adresse vérifiée, la publication est bloquée) ;
   - Statut professionnel (trader / non-trader, Digital Services Act) : **non-trader** (particulier,
     projet non commercial).
   - Avant d’enregistrer, lire le texte à côté de chaque champ : si un champ (adresse, téléphone)
     indique qu’il sera **affiché publiquement**, ne pas y mettre son adresse personnelle et
     demander avant de continuer.

## 1. Créer l’élément et envoyer le paquet

1. Bouton **+ Nouvel élément** (New item).
2. Envoyer `dist/freecorrector-1.2.0-chromium.zip`.
3. Le tableau de bord ouvre la fiche du nouvel élément, avec des onglets à gauche. Remplir les
   onglets ci-dessous, en enregistrant (Save draft) à chaque fois.

## 2. Onglet « Fiche Play Store » (Store listing)

L’extension a l’anglais comme langue par défaut (`default_locale: en`) : la fiche **en anglais**
est la fiche principale. Le nom et le résumé viennent du paquet (rien à saisir).

**Description, anglais** (langue par défaut) :

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
• Picky mode, one click away in the toolbar menu: fine typography, the missing French "ne"…
• Works in rich text editors too (webmail, social networks, online tools).
• Code, addresses, links and names are not taken for mistakes.
• Undo with Ctrl+Z after a correction.

Free software
FreeCorrector is free software (GPL v3). It builds on two free engines, Grammalecte for French and Harper for English, and adds its own rules and context-aware ranking of suggestions. Source code: https://github.com/BenjiBurn/FreeCorrector

Created by BenjiBurn.
```

Puis ajouter la langue **Français** (sélecteur de langue en haut de la fiche → ajouter une
langue → Français) et y coller :

```text
FreeCorrector corrige vos fautes partout où vous écrivez : e-mails, réseaux sociaux, formulaires, messageries, documents en ligne… Gratuit, sans compte, sans abonnement, sans publicité.

Comment ça marche
• Les fautes sont soulignées pendant que vous tapez : rouge pour l’orthographe, orange pour la grammaire, bleu pour la typographie.
• Un clic sur le mot souligné affiche la correction recommandée, et les autres suggestions juste en dessous.
• Un compteur en bas à droite du champ indique le nombre de fautes. Un clic dessus ouvre la liste complète.
• La page « Correcteur » (bouton du menu) permet de coller un long texte, de voir toutes les fautes et de tout corriger en un clic. Ou sélectionnez un texte sur n’importe quelle page, clic droit → « Corriger avec FreeCorrector ».

Français et anglais
La langue est détectée automatiquement, phrase par phrase : un e-mail en français avec une citation en anglais est corrigé dans les deux langues. Accords, conjugaison, homophones (a/à, et/est, ça/sa, ou/où, ces/ses, leur/leurs…), participes passés, subjonctif, accents, majuscules, ponctuation, fautes de frappe qui donnent un autre mot (« mot de basse »)… En anglais : your/you’re, its/it’s, their/there/they’re, accords sujet-verbe, articles, temps, fautes de frappe.

Vos textes restent chez vous
L’analyse se fait entièrement dans votre navigateur. FreeCorrector n’envoie rien sur Internet, ne collecte aucune donnée et fonctionne même hors connexion. Le navigateur lui interdit d’ailleurs toute connexion réseau.

Et aussi
• Dictionnaire personnel (« Ajouter au dictionnaire »), à importer ou exporter en fichier texte.
• « Désactiver cette règle » pour ne plus voir un type de faute.
• Désactivation sur les sites de votre choix.
• Mode exigeant, à un clic dans le menu : typographie fine (espaces insécables, apostrophes typographiques…), « ne » oublié…
• Fonctionne aussi dans les zones de texte mises en forme (éditeurs riches des webmails, réseaux sociaux et outils en ligne).
• Le code, les adresses, les liens et les noms propres ne sont pas pris pour des fautes.
• Annulation avec Ctrl+Z après une correction.

Logiciel libre
FreeCorrector est un logiciel libre (licence GPL v3). Il s’appuie sur deux moteurs libres : Grammalecte pour le français et Harper pour l’anglais, auxquels il ajoute ses propres règles et un classement des suggestions selon le contexte. Code source : https://github.com/BenjiBurn/FreeCorrector

Créé par BenjiBurn.
```

Les images se renseignent une fois (elles valent pour toutes les langues) :

| Champ | Valeur |
|---|---|
| Catégorie | Productivité → Outils (Productivity → Tools) |
| Icône du store (128×128) | `store/icone-128.png` |
| Captures d’écran (1280×800, au moins 1) | `store/capture-1-bulle.png`, `capture-2-correcteur.png`, `capture-3-anglais.png`, `capture-4-liste.png` |
| Petite vignette promotionnelle (440×280, **obligatoire**) | `store/promo-440x280.png` |
| Bannière (1400×560, facultative) | `store/banniere-1400x560.png` |
| Vidéo YouTube | laisser vide |
| Site officiel (Official URL / Homepage) | https://lapigeonnerie.fr/freecorrector |
| URL d’assistance (Support URL) | https://github.com/BenjiBurn/FreeCorrector/issues |
| Contenu pour adultes (Mature content) | Non |

« Site officiel » peut demander un site vérifié dans la Search Console de Google : dans ce cas,
laisser le champ vide (le champ « Page d’accueil » suffit).

## 3. Onglet « Pratiques de confidentialité » (Privacy)

**Objectif unique** (Single purpose description) :

```text
Check the spelling and grammar (French and English) of the text the user writes in the text fields of web pages, entirely locally in the browser.
```

**Justification de « storage »** :

```text
Stores the user's settings, personal dictionary, turned-off rules and the draft of the proofreader page locally (storage.local). Nothing is sent to a server.
```

**Justification de « activeTab »** :

```text
The toolbar menu reads the domain name of the active tab so the user can turn checking off on that site.
```

**Justification de « contextMenus »** :

```text
Adds one right-click entry on selected text, "Check with FreeCorrector", which opens the extension's own proofreader page with that text. The text is passed through storage.local and never leaves the browser.
```

**Justification de « offscreen »** :

```text
The checker (Grammalecte and Harper) runs in Web Workers. A service worker cannot start a Web Worker, so the extension uses an offscreen document (reason WORKERS) to host them. Nothing is displayed in it.
```

**Justification de l’autorisation d’accès à l’hôte** (Host permission, scripts de contenu sur toutes
les URL) :

```text
Checking must work in the text fields of any website. The content script only reads the text of the field the user is typing in, sends it to the extension's own checker (runtime.sendMessage) and draws the underlines. No text leaves the browser: the content security policy (connect-src 'self') forbids any network connection.
```

**Code distant** (Remote code) : **« Non, je n’utilise pas de code distant »** (No, I am not using
remote code). Tout le code, y compris le module WebAssembly de Harper, est dans le paquet.

**Utilisation des données** (Data usage) : ne cocher **aucun** type de données collectées, puis
cocher les trois attestations :
- je ne vends ni ne transfère les données des utilisateurs à des tiers… ;
- je n’utilise ni ne transfère les données des utilisateurs à des fins sans rapport avec la
  fonctionnalité principale… ;
- je n’utilise ni ne transfère les données des utilisateurs pour déterminer leur solvabilité…

**URL des règles de confidentialité** (Privacy policy URL) :

```text
https://github.com/BenjiBurn/FreeCorrector/blob/main/PRIVACY.md
```

## 4. Onglet « Distribution »

| Champ | Valeur |
|---|---|
| Paiement | Sans frais (Free of charge) |
| Visibilité | Public |
| Régions | Toutes les régions |

## 5. Onglet « Instructions de test » (Test instructions), si présent

Aucun identifiant n’est nécessaire : laisser les champs de connexion vides et coller dans la
zone d’instructions :

```text
No account or login is needed: the extension works on any page with a text field. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Source: https://github.com/BenjiBurn/FreeCorrector. To test: type "je suis aller au marché" or "My brother work at a bank" in any text field, or open the toolbar menu and click "Open the proofreader". Select some text and right-click "Check with FreeCorrector".
```

## 6. Envoyer

1. Bouton **Envoyer pour examen** (Submit for review) en haut à droite. S’il est grisé, un onglet
   a un champ obligatoire vide (il est marqué en rouge).
2. Dans la fenêtre qui s’ouvre, laisser cochée la publication automatique après approbation
   (sinon il faudra cliquer sur « Publier » soi-même une fois l’examen passé).
3. L’examen prend en général de quelques jours à deux ou trois semaines pour un premier élément
   avec l’accès à toutes les URL. Google écrit à l’adresse du compte s’il faut corriger quelque
   chose.
4. Une fois en ligne : noter l’adresse de la fiche (chromewebstore.google.com/detail/…) et
   mettre à jour la page lapigeonnerie.fr/freecorrector (« Bientôt disponible » → lien Chrome).
