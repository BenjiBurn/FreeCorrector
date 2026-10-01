# Harper

Correcteur grammatical anglais [Harper](https://github.com/Automattic/harper) (paquet npm
`harper.js` 2.10.0), © Automattic et Elijah Potter, licence Apache 2.0 (voir `LICENSE`).

Fichiers repris de `dist/` : `index.js`, `BinaryModule-BmeyZWwZ.js`, `slimBinary.js` et le binaire
WebAssembly `harper_wasm_slim_bg.wasm` (compilé depuis le code Rust du dépôt ci-dessus).

Seule modification : dans `BinaryModule-BmeyZWwZ.js`, `fs.readFile(new URL(binary).pathname, …)`
devient `fs.readFile(new URL(binary), …)`, pour que les tests sous Node fonctionnent aussi sous
Windows. Ce chemin n’est jamais emprunté dans le navigateur.
