# Fiche addons.thunderbird.net — FreeCorrector pour Thunderbird

Textes prêts à copier-coller dans le formulaire de soumission (https://addons.thunderbird.net,
« Developer Hub », « Submit a New Add-on »). Français en langue par défaut, anglais en traduction.

Le site des modules Thunderbird est indépendant de addons.mozilla.org : il faut s’y connecter et
y créer la fiche, même si l’ID du module (`freecorrector@lapigeonnerie.fr`) est le même que pour
Firefox.

**Publiée** depuis le 20 octobre 2026 : https://addons.thunderbird.net/fr/thunderbird/addon/freecorrector/
(version 1.2.5, construite au commit `83082b6`). Les versions suivantes s’envoient comme mises à
jour de cette fiche (« Upload New Version »), avec les notes de `store/NOTES-VERSION.md`.

## Réglages de la soumission

| Champ | Valeur |
|---|---|
| Distribution | Sur ce site (listée sur addons.thunderbird.net) |
| Fichier | `dist/freecorrector-<version>-thunderbird.zip` |
| Application | Thunderbird 140 ou plus récent (lu dans le manifest) |
| Code source demandé ? | **Oui**, envoyer `dist/freecorrector-<version>-source.zip` (binaire WebAssembly de Harper) |
| Notes pour les relecteurs | Contenu de `NOTE_FOR_REVIEWERS.md` (section « Thunderbird » en particulier) |
| Catégories | Rédaction des messages ; Langue (selon les catégories proposées) |
| Licence | GNU General Public License v3.0 |
| Politique de confidentialité | https://lapigeonnerie.fr/freecorrector-confidentialite |
| Page d’accueil | https://lapigeonnerie.fr/freecorrector |
| Site d’assistance | https://github.com/BenjiBurn/FreeCorrector/issues |
| Étiquettes | orthographe, grammaire, correcteur, français, anglais, spell checker, grammar |

---

## Français (langue par défaut)

**Nom :** FreeCorrector

**Résumé** (250 caractères max.) :

```text
Correcteur d’orthographe et de grammaire gratuit et libre pour vos e-mails, en français et en anglais. Souligne vos fautes pendant que vous écrivez, avec la bonne correction en un clic. 100 % local : vos messages ne quittent jamais votre ordinateur.
```

**Description :**

```text
FreeCorrector corrige vos e-mails pendant que vous les écrivez, directement dans la fenêtre de rédaction de Thunderbird. Gratuit, sans compte, sans abonnement, sans publicité.

Comment ça marche
• Les fautes sont soulignées pendant que vous tapez : rouge pour l’orthographe, orange pour la grammaire, bleu pour la typographie.
• Un clic sur le mot souligné affiche la correction recommandée, et les autres suggestions juste en dessous.
• Un compteur en bas à droite du message indique le nombre de fautes. Un clic dessus ouvre la liste complète.
• Fonctionne en HTML comme en texte brut, pour un nouveau message, une réponse ou un transfert.

Seulement ce que vous écrivez
Dans une réponse, le message cité, la ligne « X a écrit : » et votre signature ne sont pas corrigés : seul votre texte est vérifié. Le message envoyé contient exactement ce que vous avez écrit, sans rien d’ajouté.

Français et anglais
La langue est détectée automatiquement, paragraphe par paragraphe : un e-mail en français avec un passage en anglais est corrigé dans les deux langues. Accords, conjugaison, homophones (a/à, et/est, ça/sa, ou/où, ces/ses, leur/leurs…), participes passés, subjonctif, accents, majuscules, ponctuation, mélange du tutoiement et du vouvoiement… En anglais : your/you’re, its/it’s, their/there/they’re, accords sujet-verbe, temps, fautes de frappe.

Vos messages restent chez vous
L’analyse se fait entièrement dans Thunderbird. FreeCorrector n’envoie rien sur Internet, ne collecte aucune donnée et fonctionne même hors connexion. Thunderbird lui interdit d’ailleurs toute connexion réseau.

Et aussi
• Dictionnaire personnel (« Ajouter au dictionnaire »), importable et exportable.
• Mode exigeant pour la typographie fine (espaces insécables, apostrophes typographiques…).
• Page « Correcteur » (bouton FreeCorrector) pour vérifier un long texte.
• Annulation avec Ctrl+Z après une correction.

Conseil : pour éviter un double soulignement, vous pouvez désactiver la vérification orthographique pendant la saisie de Thunderbird (Paramètres, rubrique Rédaction).

Logiciel libre
FreeCorrector est un logiciel libre (licence GPL v3). Il s’appuie sur deux moteurs libres : Grammalecte pour le français et Harper pour l’anglais, auxquels il ajoute ses propres règles et un classement des suggestions selon le contexte. Aussi disponible pour Firefox et Chrome. Code source : https://github.com/BenjiBurn/FreeCorrector

Créé par BenjiBurn.
```

---

## English (translation)

**Name:** FreeCorrector

**Summary** (250 characters max.):

```text
Free, open-source spelling and grammar checker for your emails, in English and French. Underlines your mistakes as you write and fixes them in one click. 100% local: your messages never leave your computer.
```

**Description:**

```text
FreeCorrector checks your emails as you write them, right in Thunderbird’s compose window. Free, with no account, no subscription and no ads.

How it works
• Mistakes are underlined as you type: red for spelling, orange for grammar, blue for typography.
• Click an underlined word to see the recommended fix, with the other suggestions right below.
• A counter at the bottom right of the message shows how many mistakes there are. Click it for the full list.
• Works in HTML and plain text, for new messages, replies and forwards.

Only what you write
In a reply, the quoted message, the "X wrote:" line and your signature are left alone: only your own text is checked. The message you send contains exactly what you wrote, with nothing added.

English and French
The language is detected automatically for each paragraph, so an email mixing both languages is checked in both. English: your/you’re, its/it’s, their/there/they’re, subject-verb agreement, tenses, “should of”, typos and more. French: agreement, conjugation, homophones, past participles, subjunctive, accents, capitals and punctuation.

Your messages stay yours
Everything is checked inside Thunderbird. FreeCorrector sends nothing over the Internet, collects no data and even works offline. Thunderbird itself blocks any network connection from the add-on.

Also
• Personal dictionary, with import and export.
• Picky mode for fine typography.
• A proofreader page (FreeCorrector button) to check a long text.
• Undo with Ctrl+Z after a fix.

Tip: to avoid double underlines, you can turn off Thunderbird’s own spell check as you type (Settings, Composition).

Open source
FreeCorrector is free software (GPL v3). It builds on two open-source engines, Harper for English and Grammalecte for French, and adds its own rules and context-aware ranking of suggestions. Also available for Firefox and Chrome. Source code: https://github.com/BenjiBurn/FreeCorrector

Made by BenjiBurn.
```

---

## Captures d’écran (dossier `store/thunderbird/`)

| Fichier | Légende (FR) | Caption (EN) |
|---|---|---|
| `capture-1-bulle.png` | Cliquez sur un mot souligné : la correction en un clic. | Click an underlined word: the fix in one click. |
| `capture-2-reponse.png` | Dans une réponse, seul votre texte est corrigé, pas le message cité. | In a reply, only your own text is checked, not the quoted message. |
| `capture-3-anglais.png` | Français et anglais, détectés automatiquement. | English and French, detected automatically. |

Icône de la fiche, si elle est demandée : `store/icone-128.png` (128×128).
