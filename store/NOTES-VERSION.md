# Notes de version à coller dans les stores

## 1.5.0 (prochaine version, pas encore publiée)

Brouillon. 1.5.0 : nouveauté visible (le thème).

- Nouveau : un réglage « Thème » (Automatique, Clair, Sombre) pour la bulle et les pages de FreeCorrector. En automatique, comme avant, il suit le thème du navigateur ; « Sombre » le force même quand le navigateur est en clair. Demandé par l’auteur (Windows en mode sombre, applications en mode clair).
- « « La Suède stupéfaite » Peux tu m’en dire plus ? » : le trait d’union manquant est signalé même après un titre entre guillemets français (il ne l’était qu’avec des guillemets droits), et la suggestion n’est plus en majuscules (« PEUX-TU ») après une citation ; repéré par la tâche des signalements (#34).

## 1.4.0

1.4.0 et non 1.3.1 : deux nouveautés visibles, Google Docs et le conjugueur. Nouveau nom dans les stores : « FreeCorrector – Correcteur orthographique gratuit » / « FreeCorrector – French & English Grammar Checker » (mêmes modules, mêmes identifiants).

**Français** (Firefox : « Notes de version » ; Thunderbird : « Notes de version », sans la ligne Google Docs ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• Nouveau : FreeCorrector corrige aussi dans Google Docs : fautes soulignées dans le document, correction en un clic, « Tout corriger » (Ctrl+Maj+F), et Ctrl+Z pour annuler.
• Nouveau : un conjugueur. Tous les temps de n’importe quel verbe français, avec négation, forme pronominale, temps composés, question et féminin. On l’ouvre depuis le menu de l’icône (« Conjuguer un verbe ») ou depuis la bulle d’une faute de conjugaison (« Voir la conjugaison de… »).
• Beaucoup moins de fausses alertes dans les textes soignés, en français comme en anglais, et la bonne correction proposée plus souvent en premier.
• « parait », « boite », « entrainer » (orthographe rectifiée de 1990, correcte) ne sont plus soulignés, sauf en mode exigeant.
• De nombreuses corrections suite à vos signalements : « la 1ere » → 1ʳᵉ, « Peux tu » → Peux-tu, « hier soir avec ses ami » → amis… Merci à vous !
```

**English** (Opera "Changelog", Firefox and Thunderbird if an English field is offered):

```text
• New: FreeCorrector now checks Google Docs too: mistakes underlined in the document, one-click fixes, "Fix all" (Ctrl+Shift+F), and Ctrl+Z to undo.
• New: a French verb conjugator: every tense of any French verb, with negative, pronominal, compound tenses, questions and feminine forms. Open it from the toolbar menu ("Conjugate a verb") or from the bubble of a conjugation mistake.
• Far fewer false alarms on carefully written text, in English and in French, and the right fix shown first more often.
• Many fixes thanks to your reports. Thank you!
```

**Notes aux testeurs** (Firefox et Thunderbird, en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

1.4.0 adds two things, with no new permission. Google Docs: content/docs-annotate.js is a one-line script in the page's world (world "MAIN", document_start, https://docs.google.com/document/* only) that sets window._docs_annotate_canvas_by_ext, so that Docs adds its invisible, accessible copy of the text; content/docs-field.js (isolated world, like the other content scripts) reads it, draws the underlines and applies fixes as simulated clicks and key events. A conjugator page (src/conjugator/) that runs Grammalecte's unmodified conj.js in a Web Worker of its own. The extension's name and summary now say what it does.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.4.0.zip, run "node scripts/build.js firefox" (or "thunderbird"; Node.js 18+, no dependencies), output in dist/freecorrector-1.4.0-firefox.zip (or -thunderbird.zip).

To test: type "Ils peut venir demain." in any text field (in Thunderbird: in the body of a new message). Click "peut": the bubble offers "peuvent" and "Voir la conjugaison de « pouvoir »", which opens the conjugator. The same works in any Google Docs document you can edit.
```

**Détail des changements** (pour nous) :

- Nouveau : FreeCorrector corrige aussi dans Google Docs (Chrome, Edge, Brave, Firefox) : fautes soulignées dans le document, suggestions au clic, liste des fautes et « Tout corriger » (Ctrl+Maj+F). Docs dessine son texte dans un canvas : l’extension le lit dans la copie invisible que Docs ajoute pour les correcteurs, et tape les corrections comme au clavier (Ctrl+Z les annule).
- Nouveau : un conjugueur. Tous les temps de n’importe quel verbe français, avec négation, forme pronominale, temps composés, question et féminin. On l’ouvre depuis le menu (« Conjuguer un verbe »), l’onglet de la page Correcteur, ou le lien « Voir la conjugaison de… » dans la bulle d’une faute de conjugaison.
- « hier soir avec ses ami », « dimanche avec ses ami » : l’accord est de nouveau souligné (un de nos filtres prenait « ses » pour un nom) ; et « Je vois ses amis » n’est plus pris pour « ces ».
- Firefox et Thunderbird : le bouton « Page de test », réservé au développement, n’apparaît plus dans la fenêtre de l’icône.
- Thunderbird : le lien « Voir la conjugaison » réutilise la fenêtre du conjugueur déjà ouverte au lieu d’en ouvrir une nouvelle à chaque fois.
- « la 1ere », « mes 1eres », « la 2eme » : le nombre ordinal est souligné en entier et corrigé en « 1ʳᵉ », « 1ʳᵉˢ », « 2ᵉ » (au lieu de proposer « erre » pour « ere ») ; signalé par un utilisateur.
- « … » Peux tu m’en dire plus ? », « ou puis je l’acheter ? » : au milieu d’une phrase, l’inversion sans trait d’union est soulignée (→ « Peux-tu », « puis-je ») au lieu de conjuguer l’infinitif (« dis », « achète ») ; signalé deux fois.
- Mode exigeant : un mot répété dans une citation entre guillemets n’est plus signalé, et l’alerte de répétition ne propose plus de mot sans rapport (« produit » → « produis ») ; signalé par un utilisateur.
- « (alcool, vitesse, contrôle technique, ...) » : la virgule avant les points de suspension n’est plus signalée qu’en mode exigeant, avec la bonne correction ; signalé par un utilisateur.
- « parait », « entrainer », « boite » (orthographe rectifiée de 1990, correcte) : la suggestion de l’orthographe traditionnelle (« paraît »…) n’apparaît plus qu’en mode exigeant ; décision de l’auteur.
- Français : beaucoup moins de fausses alertes dans les textes soignés (803 → 455 sur notre corpus Wikipédia) : expressions et titres en anglais (« deep learning », « Hall of Fame »), bibliographies (« J.-P. Amat », « (dir.) », « éd. », « et al. »), noms entre parenthèses, noms d’organisations (« la FA Cup »), titres d’œuvres à majuscule, nationalités partagées (« les fédérations anglaise et française »).
- Meilleures suggestions : la bonne correction sort plus souvent en premier : mots écrits comme ils se prononcent (« magnifik » → magnifique, « otel » → hôtel, « resonnable » → raisonnable), noms de pays en minuscule (« en espagne » → Espagne), participe accordé avec son sujet (« la literie mériterait d’être changer » → changée), forme demandée par la règle (« Les pneus que tu m’as conseillés tient » → tiennent), impératif (« Rappele toi » → Rappelle) ; en anglais « studys » → studies, « delayd » → delayed.
- Anglais : beaucoup moins de fausses alertes sur les textes rédigés (216 → 75 sur notre corpus Wikipédia : initiales, sigles, « von Neumann », citations en langue étrangère, mots savants, variantes britanniques), et plus de fautes courantes détectées : « I’m not agree », « three year », « one of my colleague is », « I am interesting in », « send me you’re address », « a very good news », faux amis (« assisted to a conference », « can you precise »).

## 1.3.0

1.3.0 et non 1.2.10 : l’icône grise est une nouveauté visible.

**Français** (Firefox : « Notes de version » ; Thunderbird : « Notes de version » ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• Nouveau : l’icône de FreeCorrector devient grise sur une page où la correction est coupée (site désactivé, correction coupée partout ou raccourci Ctrl+Maj+1). Une idée d’un utilisateur.
• Encore plus léger : le moteur français et le moteur anglais libèrent chacun leur mémoire dès qu’ils ne servent plus, même si l’autre continue de travailler.
• De nombreuses corrections suite à vos signalements : « vas-y fais rouler », « une idée à la con », « Il faudrait que vous nous confirmer », « le reste des photos que j’ai pris », « etre » → être, « un excel » → Excel, « lé gens » → les ; en anglais « I think it's time », « profils » → profiles… Merci à vous !
```

**English** (Opera "Changelog", Firefox and Thunderbird if an English field is offered):

```text
• New: the FreeCorrector icon turns grey on a page where checking is off (site turned off, checking turned off everywhere, or the Ctrl+Shift+1 shortcut). An idea from a user.
• Even lighter: the French and English engines each give their memory back as soon as they are not needed, even while the other one keeps working.
• Many fixes thanks to your reports, in French and in English ("I think it's time" is no longer flagged, "profils" suggests "profiles", "excel" suggests "Excel"…). Thank you!
```

**Notes aux testeurs** (Firefox et Thunderbird, en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

1.3.0 turns the toolbar icon grey, per tab, when checking is off on the page (src/lib/action-icon.js: the top frame's content script reports its state, the background calls action.setIcon with the tab id; grey icons in src/icons/icon-off*). src/engine/host.js now also stops each engine's Web Worker on its own after 3 minutes without use. Otherwise checking rules (src/engine/). No new permission.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.3.0.zip, run "node scripts/build.js firefox" (or "thunderbird"; Node.js 18+, no dependencies), output in dist/freecorrector-1.3.0-firefox.zip (or -thunderbird.zip).

To test: type "je suis aller au marché" or "The ending was to sad." in any text field (in Thunderbird: in the body of a new message). Then press Ctrl+Shift+1: the toolbar icon turns grey and the underlines go away.
```

**Détail des changements** (pour nous) :

- L’icône de FreeCorrector devient grise sur une page où la correction est coupée (site désactivé, correction coupée partout ou raccourci Ctrl+Maj+1) ; idée d’un utilisateur.
- Chaque moteur (français, anglais) s’arrête après 3 minutes sans servir, même si l’autre travaille encore : un paragraphe anglais ne garde plus Harper (~200 Mo) chargé toute la journée.
- « le reste des photos que j’ai pris », « le genre de filles que j’ai vu », « une part de la tarte que j’ai fait » : l’accord du participe avec « que » est de nouveau souligné (suite du signalement #22).

- « mais vas-y fais rouler » : l’impératif après « vas-y », « allez-y », « viens »… n’est plus souligné (« fait ») ; signalé par un utilisateur.
- « une idée à la con », « à la papa » : le « la » de ces locutions n’est plus souligné (« le ») ; signalé par un utilisateur.
- « un ordre du jour pour la réunion de demain que j’ai rédigé » : le participe n’est plus accordé d’office avec le dernier nom (« rédigée ») quand un nom plus haut s’accorde déjà avec lui ; signalé par un utilisateur.
- « Il faudrait que vous nous confirmer » : l’infinitif après « il faut que vous » est souligné (→ « confirmiez ») ; signalé par un utilisateur.
- Anglais : « profils » propose « profiles » avant « profits » (orthographe française de « -ile ») ; signalé par un utilisateur.
- Anglais : « I think it's time », « Now it's time for lunch », « Maybe it's fate » : « it's » n’est plus souligné (→ « its ») ; signalé par un utilisateur.
- « etre » propose « être » en premier, même quand une autre faute suit (« pour etre accepter ») ; signalé par un utilisateur.
- Les logiciels écrits en minuscules (« un excel », « le powerpoint », « youtube », « iphone »…) proposent leur nom (« Excel », « PowerPoint »…) au lieu de mots sans rapport ; signalé par un utilisateur.
- « Coucou lé gens », « mé amis », « cé gens » : le déterminant écrit comme il se prononce est souligné (→ « les », « mes », « ces ») ; signalé par un utilisateur.

## 1.2.9

**Français** (Firefox : « Notes de version » ; Thunderbird : « Notes de version » ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• Plus léger : après 3 minutes sans écrire, FreeCorrector libère sa mémoire (environ 45 Mo au repos au lieu de 300) et ne charge plus que le moteur de la langue de la page.
• Bien plus de fautes trouvées dans les textes soignés (devoirs, lettres de motivation, courriers, critiques, recettes) : « ma permis », « il serait dont », « ils ont demandés que », « laisser mijotez »…, et en anglais (« to sad », « was build », « assist to the meeting »…).
• La pastille ne cache plus le texte et ne se pose plus sur le bouton des barres de recherche ; les zones qui défilent (ChatGPT) et les messages privés de X sont mieux gérés.
• Nouveau raccourci Ctrl+Maj+1 : activer ou couper FreeCorrector sur la page ouverte.
• De nombreuses corrections suite à vos signalements, merci à vous !
```

**English** (Opera "Changelog", Firefox and Thunderbird if an English field is offered):

```text
• Lighter: after 3 minutes without typing, FreeCorrector frees its memory (about 45 MB at rest instead of 300) and only loads the engine for the page's language.
• Many more mistakes found in careful writing (essays, cover letters, letters, reviews, recipes) in English ("to sad", "was build", "assist to the meeting"…) and in French.
• The badge no longer covers the text or a search bar's button; scrolling boxes (ChatGPT) and X direct messages work better.
• New shortcut Ctrl+Shift+1: turn FreeCorrector on or off for the open page.
• Many fixes thanks to your reports. Thank you!
```

**Notes aux testeurs** (Firefox et Thunderbird, en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

1.2.9 stops the checking Web Workers after 3 minutes without a check to give their memory back (src/engine/host.js), adds a "toggle-page" keyboard command (Ctrl+Shift+1, manifest "commands"), and otherwise changes checking rules (src/engine/) and the content script's badge placement; no new permission.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.9.zip, run "node scripts/build.js firefox" (or "thunderbird"; Node.js 18+, no dependencies), output in dist/freecorrector-1.2.9-firefox.zip (or -thunderbird.zip).

To test: type "je suis aller au marché" or "The ending was to sad." in any text field (in Thunderbird: in the body of a new message).
```

**Détail des changements** (pour nous) :

- « ça n’a pas fonctionné » : le « a » après « n’ » n’est plus souligné (« à ») ; signalé par un utilisateur.
- « les notes individuels » : seul « individuels » est souligné (→ « individuelles »), plus « notes » → « notés » ; signalé par un utilisateur.
- Impératif sans « s » (« Ne vend pas ta voiture ») : « vends » est proposé, plus « vendent » en premier ; vu grâce à un signalement.
- « on comprend pour ça n’a pas marché » → « pourquoi » (question indirecte après comprendre, savoir, se demander…) ; signalé par un utilisateur.
- La pastille ne cache plus le texte : quand on écrit jusqu’au bord (X, petits champs), elle se pousse à droite du champ, sur son coin ou en dessous, là où la page n’a rien à cliquer ; signalé par un utilisateur.
- Zones de saisie qui défilent (ChatGPT…) : les soulignements des lignes cachées ne débordent plus hors de la zone, la pastille reste dans la partie visible, et une zone défilée n’est plus prise pour cachée ; signalé par un utilisateur.
- Champs qui ne deviennent modifiables qu’après avoir reçu le focus (messages privés de X) : la vérification démarre dès la première frappe ; signalé par un utilisateur.
- Nouveau raccourci Ctrl+Maj+1 : active ou coupe la vérification sur la page ouverte, jusqu’à ce qu’on la quitte, même sur un site exclu (affiché dans les options, modifiable dans le navigateur) ; demandé par un utilisateur.
- Barres de recherche (leboncoin…) : la pastille ne se pose plus sur le bouton du site, elle se place juste avant ; les barres de recherche sont mieux reconnues et n’y demandent plus de majuscule (« ford capri ») ; signalé par un utilisateur.
- « coeur », « soeur », « oeuf » : « œ » est proposé en suggestion de style (bleu), « oe » reste accepté ; en mode exigeant, la ligature est la seule suggestion (plus « sueur » pour « soeur ») ; signalé par un utilisateur.
- « Combien t’en veux ? », « T’en peux plus ? » (« t’ » familier pour « tu ») ne proposent plus « veut », « peut » ; « Pierre t’en veux » reste souligné ; signalé par un utilisateur.
- « spotter », « spotté », « spottées » (repérer, dans les jeux ou la photo d’avions) ne sont plus soulignés ; signalé par un utilisateur.
- « J’ai deux extensions d’activées », « il y en a trois de cassés » (tournure familière) ne proposent plus l’infinitif (« d’activer ») ; « elle vient de terminée » reste souligné ; signalé par un utilisateur.
- Anglais : un prénom seul sur sa ligne à côté d’un @pseudo (« Yann @Helpdesk ») n’est plus souligné comme une faute ; signalé par un utilisateur.
- Dixième ronde à l’aveugle (devoirs, lettres de motivation, comptes rendus, courriers administratifs, critiques, recettes, cartes de vœux, questions à un chatbot) : français 80 → 96 % de fautes trouvées (« ma permis » → « m’a permis », « il serait dont » → « donc », « ont demandés que », « laisser mijotez », « un moule à manqué », « les entraînements son », « plus meilleurs »…), anglais 73 → 99 % (« there need », « looses its », « to sad », « along with … travel », « was build », « healing good », « assist to the meeting », « remember me to »…) ; moins de fausses alertes sur les noms de fichiers (rapport_v2.docx), les formules de tableur, les numéros de dossier et « un thé à la menthe délicieux ».
- Mémoire : après 3 minutes sans vérification, les moteurs s’arrêtent et rendent leur mémoire (dans Edge, l’extension passe d’environ 290 Mo à 45 Mo au repos) ; ils redémarrent au clic suivant dans un champ. En mode automatique, seul le moteur de la langue de la page est préchargé (environ 140 Mo au lieu de 350 pour un texte en français) ; signalé par un utilisateur.

## 1.2.8

**Français** (Firefox : « Notes de version » ; Thunderbird : « Notes de version » ; Chrome : rien à saisir ; Opera : « Changelog ») :

```text
• Nouveau : FreeCorrector n’a rien souligné alors qu’il y avait une faute ? Sélectionnez la phrase, clic droit, « Signaler une faute non détectée ».
• Bien mieux adapté aux messages du quotidien (SMS, Discord, forums, annonces, avis) : beaucoup moins de fausses alertes sur le langage familier (rdv, y’a, stream…) et plus de fautes trouvées.
• L’orthographe traditionnelle est proposée en suggestion de style pour les formes rectifiées de 1990 (« parait » → « paraît », « boite » → « boîte ») ; désactivable d’un clic.
• Anglais : bien plus de fautes typiques des francophones trouvées (« he can goes », « I did a mistake », « too much bugs »…), et les noms écrits sans majuscule (« greek » → « Greek »).
• Plusieurs corrections suite à vos signalements, merci à vous !
```

**English** (Opera "Changelog", Firefox and Thunderbird if an English field is offered):

```text
• New: FreeCorrector underlined nothing, yet there was a mistake? Select the sentence, right-click, "Report a missed mistake".
• Much better with everyday messages (texts, Discord, forums, ads, reviews): far fewer false alarms on informal language and more mistakes found.
• French: the traditional spelling is offered as a style hint for the 1990 reformed forms ("parait" → "paraît"); one click turns it off.
• English: many more mistakes typical of non-native writers found ("he can goes", "I did a mistake", "too much bugs"…), and names typed in lowercase ("greek" → "Greek").
• Several fixes thanks to your reports. Thank you!
```

**Notes aux testeurs** (Firefox et Thunderbird, en anglais) :

```text
No account or login is needed. Everything runs locally (CSP connect-src 'self'): no network requests, no data collected, no remote code. Our own code is neither minified nor bundled; the engines in vendor/ are unmodified copies of Grammalecte 2.3.0 and harper.js 2.10.0 (see NOTE_FOR_REVIEWERS.md).

1.2.8 adds a second right-click entry on selected text, "Report a missed mistake" (lib/menus.js): it opens the same report page of the author's website as the bubble's "Report" button, with the selection in the URL fragment (sent only if the user clicks Send there; see NOTE_FOR_REVIEWERS.md). The rest is checking rules (src/engine/); no new permission.

Build: download https://github.com/BenjiBurn/FreeCorrector/archive/refs/tags/v1.2.8.zip, run "node scripts/build.js firefox" (or "thunderbird"; Node.js 18+, no dependencies), output in dist/freecorrector-1.2.8-firefox.zip (or -thunderbird.zip).

To test: type "je suis aller au marché" or "He can goes to the meeting." in any text field (in Thunderbird: in the body of a new message). Select some text and right-click to see both entries.
```

**Détail des changements** (pour nous) :

- « en soit » → « en soi » (premier signalement reçu par le bouton « Signaler ») ; « ou en soit victime » n’est plus souligné.
- Anglais : un nom écrit sans majuscule (« greek », « paris », « tokyo ») propose la majuscule (« Greek ») au lieu d’un autre mot (« geek ») ; signalé par un utilisateur.
- Anglais : un passé avec un -s en trop (« it tooks », « they wents ») propose « took », « went » au lieu d’un autre mot (« tools ») ; signalé par un utilisateur.
- Un impératif sans accent suivi de « toi », « moi »… (« achete toi ») propose « achète » au lieu de « acheté » ; signalé par un utilisateur. En début de phrase, « Leve » propose « Lève » et plus « L’Eve ».
- Messages familiers (SMS, Discord, forums, annonces, avis) : beaucoup moins de fausses alertes (rdv, ptn, stream, game, y’a…, et plus de point final réclamé dans un message de deux phrases) et plus de fautes trouvées (« je suis grave fatiguer », « il est ou ? », « ma posé », « c’est fait vacciner »…).
- Nouveau : clic droit sur une sélection → « Signaler une faute non détectée », quand FreeCorrector n’a rien souligné alors qu’il y avait une faute.
- Orthographe traditionnelle proposée en bleu pour les formes rectifiées de 1990 (« parait » → « paraît », « boite » → « boîte », « connait », « maitre »…) : les deux sont correctes, la suggestion se désactive d’un clic ; demandé par un utilisateur.
- « faire quoique ce soit » propose « quoi que ce soit » au lieu de « soir » et « se » ; « quoique ce soit difficile » n’est plus souligné ; signalé par un utilisateur.
- « rebadgé », « rebadgée » (voiture vendue sous une autre marque) ne sont plus soulignés ; signalé par un utilisateur.
- Anglais écrit par des non-natifs : « he can goes », « does anyone knows », « I did a mistake », « too much bugs », « its still crashing », « can’t loose »…

## 1.2.7

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
