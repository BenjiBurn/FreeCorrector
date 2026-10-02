// Held-out French corpus: written separately from fr-corpus.js and NOT used
// to tune the engine, so its score is an honest estimate of real-world quality.
// Same format: [sentence, wrong text, expected first suggestion] (null = clean).

module.exports = [
  // ---- Homophones
  ["Elle à toujours raison.", "à", "a"],
  ["On se retrouve a la gare.", "a", "à"],
  ["Le café et chaud.", "et", "est"],
  ["Ils sont parti et ils son revenus.", "son", "sont"],
  ["Les enfants on fini leurs devoirs.", "on", "ont"],
  ["Il ce demande pourquoi.", "ce", "se"],
  ["Je t’ai donner mon numéro.", "donner", "donné"],
  ["Elle leurs a parlé hier.", "leurs", "leur"],
  ["Je ne sais pas ou aller.", "ou", "où"],
  ["Sa me fait plaisir de te voir.", "Sa", "Ça"],
  ["Il ne peu pas venir.", "peu", "peut"],
  ["Je pense quel est partie.", "quel", "qu’elle"],
  ["Ces la vie.", "Ces", "C’est"],
  ["Il c’est trompé de route.", "c’est", "s’est"],
  ["Merci a tous pour votre aide.", "a", "à"],
  ["Tu ma manqué.", "ma", "m’as"],
  ["Je n’ai pas pus venir.", "pus", "pu"],
  ["Il a du partir tôt.", "du", "dû"],
  ["C’est sur, il viendra.", "sur", "sûr"],
  ["Il faut que je le fasse moi même.", "moi même", "moi-même"],

  // ---- é / er / ez / ai
  ["Il faut mangé plus de légumes.", "mangé", "manger"],
  ["J’ai oublier mes clés.", "oublier", "oublié"],
  ["Nous avons décider de rester.", "décider", "décidé"],
  ["Tu dois arrêté de fumer.", "arrêté", "arrêter"],
  ["Je voudrais vous remercié.", "remercié", "remercier"],
  ["Elle a commencer hier.", "commencer", "commencé"],
  ["Vous pouvez m’appelé demain.", "appelé", "appeler"],
  ["Ils sont aller à la plage.", "aller", "allés"],
  ["Il est venu me chercher.", null, null],
  ["Je vous est envoyé le document.", "est", "ai"],

  // ---- Accords
  ["Les voitures rouge sont belles.", "rouge", "rouges"],
  ["Elle est tombé dans l’escalier.", "tombé", "tombée"],
  ["Nous sommes très content.", "content", "contents"],
  ["Plusieurs personne sont venues.", "personne", "personnes"],
  ["Les fleurs sont fané.", "fané", "fanées"],
  ["Ma sœur et moi sommes allé au cinéma.", "allé", "allés"],
  ["Les filles sont parties tôt.", null, null],
  ["Tout les élèves sont présents.", "Tout", "Tous"],
  ["Quel belle journée !", "Quel", "Quelle"],
  ["Ces deux maison sont à vendre.", "maison", "maisons"],

  // ---- Conjugaison
  ["Je peut t’aider.", "peut", "peux"],
  ["Tu veut un café ?", "veut", "veux"],
  ["Ils parle trop fort.", "parle", "parlent"],
  ["Nous avont faim.", "avont", "avons"],
  ["Je suis aller le voir.", "aller", "allé"],
  ["Vous êtes sur de vous ?", "sur", "sûr"],
  ["Si j’aurai le temps, je viendrai.", "aurai", "ai"],
  ["Il faut que vous venez.", "venez", "veniez"],
  ["Je croyais qu’il était là.", null, null],
  ["Tu sais ce qu’il veux ?", "veux", "veut"],

  // ---- Orthographe
  ["C’est un excelent travail.", "excelent", "excellent"],
  ["Je suis vraiment désolée du dérangement.", null, null],
  ["Je n’ai pas reçu ton méssage.", "méssage", "message"],
  ["Il y a beaucoup de monde aujourdui.", "aujourdui", "aujourd’hui"],
  ["C’est un rendez-vous important.", null, null],
  ["Il a un rendez vous demain.", "rendez vous", "rendez-vous"],
  ["Je te souhaite un joyeux aniversaire.", "aniversaire", "anniversaire"],
  ["Nous avons une réunion cette aprés-midi.", "aprés-midi", "après-midi"],
  ["C’est une question de principe.", null, null],
  ["Il est très intélligent.", "intélligent", "intelligent"],
  ["J’ai besoin d’un renseignement.", null, null],
  ["Il faut payer l’adition.", "adition", "addition"],
  ["Elle travaille dans une entreprize.", "entreprize", "entreprise"],
  ["Je vous envois le dossier.", "envois", "envoie"],
  ["Cordialement, à bientôt.", null, null],

  // ---- Accents et apostrophes oubliés
  ["Il est deja parti.", "deja", "déjà"],
  ["Je suis fatigue.", "fatigue", "fatigué"],
  ["Ca va bien merci.", "Ca", "Ça"],
  ["On se voit a quelle heure ?", "a", "à"],
  ["C’est tres important.", "tres", "très"],
  ["Lete dernier, il faisait chaud.", "Lete", "L’été"],
  ["Jarrive dans cinq minutes.", "Jarrive", "J’arrive"],
  ["Je nen sais rien.", "nen", "n’en"],
  ["Il ma appelé ce matin.", "ma", "m’a"],
  ["Quand est-ce quil arrive ?", "quil", "qu’il"],

  // ---- Ponctuation
  ["Bonjour Marie , comment vas-tu ?", " ,", ","],
  ["Il est parti.Je suis resté.", "Je", " Je"],
  ["Je viens je viens.", null, null],

  // ---- Phrases correctes
  ["Les résultats seront publiés la semaine prochaine.", null, null],
  ["Je me suis rendu compte de mon erreur.", null, null],
  ["Elles se sont parlé pendant des heures.", null, null],
  ["Il aurait fallu que tu me le dises plus tôt.", null, null],
  ["Ce sont des choses qui arrivent.", null, null],
  ["Quels que soient tes choix, je te soutiendrai.", null, null],
  ["Où que tu ailles, je serai là.", null, null],
  ["Ça fait longtemps qu’on ne s’est pas vus.", null, null],
  ["Nous nous sommes promenés au bord de la mer.", null, null],
  ["Voici les documents que tu m’as demandés.", null, null],
];
