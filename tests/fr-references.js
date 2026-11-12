// False alarms found on Wikipedia articles (2026-11-11): bibliographies (initials,
// "dir.", "éd."), English titles and borrowed phrases, names inside parentheses, names
// whose gender is not that of their first word, titles starting with a capital, words
// quoted alone, nationalities shared out. Correct sentences first, then the mistakes
// close to them that must stay underlined.

module.exports = [
  // initials and abbreviations
  ["Peter J. Seddon et Nils J. Nilsson ont écrit sur le sujet.", null, null],
  ["Le livre de J.-P. Amat est paru chez Bréal, puis réédité, éd. Masson.", null, null],
  ["Michel Delon (dir.), Dictionnaire européen des Lumières, préf. de Jean Ehrard, rééd. 2007.", null, null],
  ["Stuart Russell et Peter Norvig (trad. de l'anglais), Intelligence artificielle, 3e éd., 1198 p.", null, null],
  ["En 2021, Emily Bender et al. estiment que ces modèles ne comprennent pas ce qu'ils écrivent.", null, null],
  ["Charles Dédéyan, Victor Hugo et l'Allemagne, 4 vol., Paris, Lettres modernes, 1964.", null, null],
  ["Le film, avec Robert Downey Jr., a été un grand succès.", null, null],
  // English titles and phrases
  ["Le Hall of Fame du football anglais a été créé en 2002.", null, null],
  ["Il cite All Manners of Food, publié chez John Wiley and Sons.", null, null],
  ["L'apprentissage profond (deep learning en anglais) utilise plusieurs couches de neurones.", null, null],
  ["Le passage du dribbling au passing game a changé le football.", null, null],
  ["Ces fake news circulent vite sur les réseaux sociaux.", null, null],
  ["Elle travaille comme data engineer depuis deux ans.", null, null],
  ["Le terme vient de l'anglais mountains, qui désigne une chaîne.", null, null],
  ["Il est fan du manga Ghost in the Shell depuis des années.", null, null],
  ["Alexander von Humboldt a exploré la cordillère des Andes.", null, null],
  ["Le match de la Copa del Rey a eu lieu hier soir.", null, null],
  // names inside a sentence, gender of names, titles
  ["Plusieurs pièces sont jouées de nouveau (Ruy Blas en 1872, puis Marie Tudor).", null, null],
  ["Le premier joueur noir de la sélection (Donato Gama da Silva) arrive en 1994.", null, null],
  ["La FA Cup est la plus ancienne compétition de football.", null, null],
  ["Le club quitte alors la FA, puis y revient en 1867.", null, null],
  ["Sur le modèle de la Football Association, des fédérations naissent partout.", null, null],
  ["Un documentaire lui a été consacré dans l'émission Secrets d'Histoire.", null, null],
  ["Robert Badinter, Libres et égaux, Paris, Fayard, 1989.", null, null],
  ["Il voulait les poires Belle Angevine pour le dessert.", null, null],
  ["La Fédération Française de Football a été fondée en 1919.", null, null],
  ["Il a joué à la nantaise pendant toute la saison.", null, null],
  ["La révolution de Février a renversé la monarchie de Juillet.", null, null],
  ["Les massacres de Septembre ont marqué l'année 1792.", null, null],
  ["Le groupe AI Watch publie un rapport chaque année.", null, null],
  ["Il a créé DALL-E et d'autres outils.", null, null],
  // words quoted alone, shared-out adjectives, distant agreement
  ["Le modèle produit parfois un phénomène appelé « hallucination ».", null, null],
  ["Les fédérations anglaise, française et allemande ont reconnu le football féminin.", null, null],
  ["Les sauces espagnole et béchamel sont peu à peu abandonnées.", null, null],
  ["Ce manuel couvre les premier et second cycles universitaires.", null, null],
  ["Un rapport de la Commission européenne publié en 2020 présente cette taxonomie.", null, null],
  ["Il lisait des ouvrages pour la jeunesse plus anciens.", null, null],
  ["Les journées des 31 mai et 2 juin 1793 ont vu l'arrestation des Girondins.", null, null],
  ["L'entraîneur peut de plus cumuler plusieurs fonctions.", null, null],
  // still mistakes
  ["Je bois un the à la menthe tous les soirs.", "the", "thé"],
  ["Il fait come ça depuis toujours.", "come", "comme"],
  ["Les Président sont arrivés en retard.", "Président", "Présidents"],
  ["Des Américain sont venus nous voir.", "Américain", "Américains"],
  ["Il y a peut de monde ce soir.", "peut", "peu"],
  ["Je progresse en language Python depuis un an.", "language", "langage"],
  ["Il a écrit au mois de Septembre.", "Septembre", "septembre"],
  ["Ils ont mangé des crepes de froment.", "crepes", "crêpes"],
  ["J'ai lu le livre de J. Dupont. Il était vraimant bien.", "vraimant", "vraiment"],
  ["Il parle language des signes.", "language", "langage"],
  // Found in Google Docs (2026-11-12): a time word before "avec ses …" hid the agreement,
  // and "Je vois ses amis" (his friends) was taken for "ces".
  ["Il est allé à la plage hier soir avec ses ami.", "ami", "amis"],
  ["Il joue dimanche avec ses ami.", "ami", "amis"],
  ["Je vois ses amis ce soir.", null, null],
  ["Vous voyez ses parents demain ?", null, null],
];
