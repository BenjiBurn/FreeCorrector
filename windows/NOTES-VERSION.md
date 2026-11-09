# Notes de version de l'app Windows (Microsoft Store)

`node windows/publish-store.js` envoie la section de la version de `windows/app/FreeCorrector.csproj`
dans le champ « Nouveautés de cette version » de la fiche, en français et en anglais
(1500 caractères au maximum chacune).

## 0.3.0

Aussi la première version téléchargeable sur le site, sans le Store (`windows/setup.ps1`, page
lapigeonnerie.fr/freecorrector/windows). Celle-là seule recherche les mises à jour (`Updates.cs`) ;
celle du Store n'envoie toujours rien.

**Français** :

```text
- FreeCorrector pour Windows peut maintenant aussi s'installer sans le Microsoft Store, pour les PC où il est bloqué (souvent en entreprise) : lapigeonnerie.fr/freecorrector/windows
- L'application a maintenant sa propre icône partout dans Windows (Gestionnaire des tâches, etc.).
```

**English** :

```text
- FreeCorrector for Windows can now also be installed without the Microsoft Store, on PCs where it is blocked (often at work): lapigeonnerie.fr/freecorrector/en/windows
- The app now has its own icon everywhere in Windows (Task Manager, etc.).
```

## 0.2.0

**Français** :

```text
- Notepad++ : la correction marche maintenant dans Notepad++ (texte et Markdown ; le code n'est pas corrigé), ainsi que dans les autres éditeurs du même type (SciTE, Notepad2, Notepad3).
- Beaucoup moins de mémoire : seul le moteur de votre langue est chargé au démarrage, l'autre arrive à la première phrase écrite dans sa langue. Après quelques minutes sans écrire, FreeCorrector libère presque toute sa mémoire et repart dès que vous écrivez à nouveau.
```

**English** :

```text
- Notepad++: checking now works in Notepad++ (plain text and Markdown; code is left alone), and in the other editors of the same kind (SciTE, Notepad2, Notepad3).
- Much less memory: only the engine for your language is loaded at startup, the other one starts with the first sentence written in its language. After a few minutes without typing, FreeCorrector gives back almost all its memory and starts again as soon as you type.
```

## 0.1.0

**Français** :

```text
Première version de FreeCorrector pour Windows : la correction française et anglaise dans toutes vos applications (Outlook, Word, WordPad, Bloc-notes et bien d'autres), avec les mêmes moteurs que l'extension. Tout est analysé sur votre ordinateur : rien n'est envoyé sur Internet.
```

**English** :

```text
First release of FreeCorrector for Windows: French and English checking in all your applications (Outlook, Word, WordPad, Notepad and many more), with the same engines as the extension. Everything is analyzed on your computer: nothing is sent to the Internet.
```
