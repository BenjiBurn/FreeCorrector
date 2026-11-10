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
  // Reported by the user (2026-10-07): no "que", so no subjunctive.
  ["Tu nous as gavé avec les SUV depuis 3 ans, et finalement tu prend une grosse berline.", "prend", "prends"],
  ["Je veux que demain tu prend le train.", "prend", "prennes"],
  // "t’" opening a clause is the familiar "tu".
  ["T’aurai pas été invitée de toute façon.", "aurai", "aurais"],
  ["Franchement, t’aurai adoré.", "aurai", "aurais"],
  ["Il t’aurai dit la vérité.", "aurai", "aurait"],
  ["T’as vu ça ?", null, null],
  // "l’" stands for a noun set apart at the start, not for any noun before a comma.
  ["Ça passe même plus à la télé, on l’a oublié !", null, null],
  ["Il pleuvait sur la ville, je l’ai quitté.", null, null],
  ["Ma voiture, je l’ai vendu hier.", "vendu", "vendue"],
  // URLs are never checked, whatever their ending (reported by a user, 2026-10-15).
  ["Le lieu est ici : maps.app.goo.gl/ZB1DBLmEhkhE8vqM6 à bientôt.", null, null],
  ["Va sur https://maps.app.goo.gl/ZB1DBLmEhkhE8vqM6 vite.", null, null],
  ["Regarde youtu.be/dQw4w9WgXcQ et t.co/abc123 aussi.", null, null],
  ["J’ai vu le film.Il était nul.", "Il", " Il"],
  // Reported by users (2026-10-12).
  ["Devant tous ces grilles pain déprimants.", "grilles pain", "grille-pain"],
  ["Devant tous ces grille-pain déprimant.", "déprimant", "déprimants"],
  ["T’es en forme toi !", null, null],
  ["Les petits bolides miniatures sortent de leur carcan !", null, null],
  ["Les filles chantes bien.", "chantes", "chantent"],
  ["Les gens marchant dans la rue.", null, null],
  ["Ces films déprimant leurs spectateurs sont nuls.", null, null],
  // "ont" for "on" before a conjugated verb (reported by the user).
  ["Nous les mecs ont aime bien balancer la purée.", "ont", "on"],
  ["Ce soir ont va au cinéma.", "ont", "on"],
  ["Les enfants ont mangé.", null, null],
  // "contant" is "conter" (to tell): after "être", it is "content" (reported by the user).
  ["Je suis trop contant.", "contant", "content"],
  ["Elle est vraiment contante de son travail.", "contante", "contente"],
  ["Il passait la soirée en contant des histoires.", null, null],
  // A missing accent: "trêve", not "crève" (reported by a user).
  ["La treve de Noël a commencé.", "treve", "trêve"],
  ["C’est la trève hivernale.", "trève", "trêve"],
  // The author's private joke: LA Renault Wind, LA Wind.
  ["J’ai garé le Wind devant chez moi.", "le", "la"],
  ["Je monte dans mon Renault Wind.", "mon", "ma"],
  ["J’adore la Wind.", null, null],
  ["Le Wind Festival commence demain.", null, null],
  // A past story: "eu" is missing (reported by the user).
  ["Il roulait sacrément plus vite que moi, mais j’ai juste le temps de voir une énorme masse.", "ai juste", "ai juste eu"],
  // No space before "!" (reported by the user); a normal space is fine outside picky mode.
  ["C'est triste quand même!", "!", " !"],
  ["C'est triste quand même !", null, null],
  ["Elle chantait « Wow! » en boucle.", null, null],
  // "toute" as an adverb after "ta" (reported by the user).
  ["Ta première mission : programmer ta toute première semaine. Ça se fait en quelques minutes, et ça lance tout le reste.", null, null],
  // Reported by the user: "au fur et à mesure" is not "au four", "il y a la carte" is the verb.
  ["Et puis au fur et à mesure on s'y fait.", null, null],
  ["Heureusement, il y a la carte en surimpression à la demande.", null, null],
  // "tu" in a message that says "vous".
  ["Bonjour Madame,\nMerci pour votre réponse. Est-ce que tu peux me rappeler demain ?\nCordialement", "tu peux", "vous pouvez"],
  ["Bonjour Monsieur, je te remercie pour votre aide.", "te", "vous"],
  ["Madame, je vous transmets ton dossier complet. Veuillez agréer mes salutations distinguées.", "ton", "votre"],
  ["Bonjour Monsieur, mon fils m’a dit « tu es nul » et je vous écris pour cela.", null, null],
  ["Madame, je vous prie de ne pas élever le ton. Il s’est tu ensuite.", null, null],
  ["Salut Paul, tu viens ce soir ? Vous êtes combien ?", null, null],
  // "sont" is the main verb after a relative clause.
  ["Les documents que tu m’as envoyés sont parfaits, merci !", null, null],
  ["Elle a pris sont sac.", "sont", "son"],
  // Reported by the user: a sentence that starts with a name in CamelCase, blanked as code.
  ["FreeCorrector est maintenant disponible en extension Thunderbird !", null, null],
  ["est-ce que tu viens demain ?", "est-ce", "Est-ce"],
  // "email" is common French, as written by the user.
  ["Vous pouvez corriger vos fautes directement dans vos emails.", null, null],
  // Reported by the user: "à" brings out another mistake further on ("commandable"), "as" hides it.
  ["Les derniers exemplaires sont a nouveau commandable sur le site.", "a", "à"],
  // Reported from the extension (1.2.7): "en soi", not "sois".
  ["Après je roule en Mondeo, donc en soit j'aime bien hein !", "soit", "soi"],
  ["En soit, ce n’est pas une mauvaise idée.", "soit", "soi"],
  ["Quoi qu’il en soit, nous partirons demain.", null, null],
  ["Qu’il en soit ainsi.", null, null],
  ["Je doute qu’il en soit capable.", null, null],
  ["Il arrive qu’une personne commette un crime ou en soit elle-même victime.", null, null],
  ["Le projet en soit est intéressant.", "soit", "soi"],
  // Signalé depuis l'extension (1.2.7) : impératif sans accent devant « toi », « achète », pas « acheté ».
  ["Ptn mais achete toi une boite auto si t'es pas cap de passer les vitesses.", "achete", "achète"],
  ["Il a achete du pain.", "achete", "acheté"],
  ["Achète-toi une voiture neuve.", null, null],
  ["Il s’est acheté une voiture neuve.", null, null],
  ["Tu l’as acheté toi-même ?", null, null],
  // Vu par la tâche quotidienne : « Leve » en début de phrase proposait « L’Eve » avant « Lève ».
  ["Leve toi vite, on part.", "Leve", "Lève"],
  ["Eve est arrivée hier soir.", null, null],
  // Demandé par un utilisateur : l'orthographe traditionnelle proposée (en bleu) pour les formes de 1990.
  ["Ça me parait normal.", "parait", "paraît"],
  ["J'ai acheté une boite de chocolats.", "boite", "boîte"],
  ["Il boite depuis sa chute.", null, null],
  ["Ce fut un plaisir de vous rencontrer.", null, null],
  ["La soule est un jeu de balle médiéval.", null, null],
  // Signalé depuis l'extension (1.2.7) : « quoique ce soit » proposait « soir » et « se », la faute est « quoi que ».
  ["Un C15 tant que ça roule t'as pas besoin de faire quoique ce soit", "quoique", "quoi que"],
  ["Sans dire quoique ce soit, il partit.", "quoique", "quoi que"],
  ["Quoique ce soit difficile, il viendra.", null, null],
  ["Il est parti, quoique ce soit tard.", null, null],
  ["Il a refusé, quoique ce soit de sa faute.", null, null],
  // Signalé depuis l'extension (1.2.7) : « rebadgée » (voiture vendue sous une autre marque) n'est pas une faute.
  ["Ça va finir avec une 208 rebadgée.", null, null],
  ["Ce modèle n’est qu’un utilitaire rebadgé.", null, null],
  ["Les constructeurs aiment rebadger leurs modèles.", null, null],
  ["Il a rebandé son arc.", null, null],
  // Signalé depuis l'extension (1.2.8) : « a » souligné (« à ») après « ça n’ », où c'est le verbe
  // et la vraie faute, « pour » -> « pourquoi ».
  ["Quand tu vois la gueule de la bande annonce, on comprend pour ça n’a pas fonctionné.", "pour", "pourquoi"],
  ["Je comprends pas pour il est parti si vite.", "pour", "pourquoi"],
  ["Je me demande pour elle a dit ça.", "pour", "pourquoi"],
  ["Je comprends pour ça, pas de souci.", null, null],
  ["Je me demande pour elle si c’est une bonne idée.", null, null],
  ["Il explique pour nous les règles du jeu.", null, null],
  ["Je vois pour ça demain avec lui.", null, null],
  ["Je sais pour ta mère, je suis désolé.", null, null],
  ["On comprend pourquoi ça n’a pas fonctionné.", null, null],
  ["Ça n’a aucun sens, on ne m’a rien dit.", null, null],
  ["Il pense a son avenir.", "a", "à"],
  // Signalé depuis l'extension (1.2.7) : « les notes individuels » soulignait aussi « notes » (-> « notés »).
  ["Valide que je puisse bien supprimer les notes individuels.", "individuels", "individuelles"],
  ["Les sorties prévus sont annulées.", "prévus", "prévues"],
  ["Je garde les notes individuelles.", null, null],
  ["Les notes prises hier sont claires.", null, null],
  // Signalé depuis l'extension (1.2.7) : « Ne prend pas… » proposait « prennent » avant l'impératif « prends »
  // (la phrase du signalement, sans sujet façon note de version, reste à trancher).
  ["Ne vend pas ta voiture.", "vend", "vends"],
  ["Ne répond pas au téléphone.", "répond", "réponds"],
  ["Il ne prend pas en compte les thèmes.", null, null],
  ["Prends ton manteau.", null, null],
  // Signalé depuis l'extension (1.2.8) : « coeur » non souligné ; « œ » proposé en suggestion de style.
  ["Ça fait mal au coeur.", "coeur", "cœur"],
  ["Un oeuf et deux boeufs.", "oeuf", "œuf"],
  ["Ils sont arrivés ex aequo.", null, null],
  ["Ça fait mal au cœur.", null, null],
  // Signalé depuis l'extension (1.2.8) : « Combien t'en veux ? » (t' = tu, familier) proposait « veut ».
  ["Combien t'en veux ?", null, null],
  ["T'en peux plus ?", null, null],
  ["Dis-moi si t’en veux.", null, null],
  ["Pierre t'en veux pas.", "veux", "veut"],
  // Signalé depuis l'extension (1.2.8) : « spottées » (repérées, jeux et photo d'avions) soulignait et proposait « spittées ».
  ["Félicitations à @filouty qui gagne avec 5 Wind spottées !", null, null],
  ["Il a spotté un A380 hier à Roissy.", null, null],
  ["On va spotter des trains ce week-end.", null, null],
  ["Les spotteurs étaient nombreux.", null, null],
  // Signalé depuis l'extension (1.2.8) : « j'ai Wanteeed et Adblock Plus d'activés » proposait « d'activer ».
  ["En extensions, j'ai Wanteeed et Adblock Plus d'activés.", null, null],
  ["J'ai deux extensions d'activées.", null, null],
  ["Il y en a trois de cassés.", null, null],
  ["Elle vient de terminée.", "terminée", "terminer"],
  ["Ils ont fini de mangés.", "mangés", "manger"],
  ["J'ai envie de mangée.", "mangée", "manger"],
  // Signalé depuis l'extension (1.2.8) : « mais vas-y fais rouler » proposait « fait » (« vas-y » sert d'interjection).
  ["Peut-être mais vas-y fais rouler la maison de @Nicorvette !", null, null],
  ["Bon vas-y fais voir.", null, null],
  ["Et allez-y prenez votre temps.", null, null],
  ["Allez, viens mange avec nous.", null, null],
  // Signalé depuis l'extension (1.2.8) : « à la con » (locution, « à la manière ») proposait « le ».
  ["Pas tous vos grille-pain à la con 🤢", null, null],
  ["C'est vraiment une idée à la con.", null, null],
  ["Il conduit à la papa sur l'autoroute.", null, null],
  // Signalé depuis l'extension (1.2.8) : « un ordre du jour pour la réunion de demain que j'ai rédigé » proposait « rédigée » (le COD est « ordre du jour »).
  ["Je me permets de vous transmettre un ordre du jour  pour la réunion de demain que j'ai rédigé.", null, null],
  ["Voici un ordre du jour pour la réunion que j'ai rédigé.", null, null],
  ["Voici le compte rendu de la réunion que j'ai rédigé.", null, null],
  ["Je vous envoie le plan de la maison que j'ai dessiné.", null, null],
  ["Voici les fiches de la séance que j'ai préparé.", "préparé", "préparée"],
  // Une quantité ou un genre avant « de » laisse l'accord au nom qui suit.
  ["Voici le reste des photos que j'ai pris.", "pris", "prises"],
  ["C'est le genre de filles que j'ai rencontré hier.", "rencontré", "rencontrées"],
  ["Voici un tas de lettres que j'ai reçu.", "reçu", "reçues"],
  ["C'est le type de questions que j'ai posé.", "posé", "posées"],
  ["Il a mangé une part de la tarte que j'ai fait.", "fait", "faite"],
  ["Voici le morceau de musique que j'ai composé.", null, null],
  ["C'est le compte rendu de la réunion que j'ai rédigé.", null, null],
  ["J'ai retrouvé le carnet de notes que j'ai rempli.", null, null],
  // Signalé depuis l'extension (1.2.9) : « Il faudrait que vous nous confirmer » n'était pas souligné (→ « confirmiez »).
  ["Il faudrait que vous nous confirmer la date exacte de la prochaine intervention.", "confirmer", "confirmiez"],
  ["Il faut que tu manger avant de partir.", "manger", "manges"],
  ["Il faudrait que vous nous confirmiez la date.", null, null],
  ["Je ne veux que vous aider.", null, null],
  ["Je ne demande que vous voir heureux.", null, null],
  // Signalé depuis l'extension (1.2.9) : « etre » proposait « êtres » avant « être » (la vraie faute « accepter » à côté).
  ["La Wind c'est trop spécial pour etre accepter ?", "etre", "être"],
  ["Il faut etre patient.", "etre", "être"],
  ["Il appele sa mère tous les jours.", "appele", "appelle"],
  // Signalé depuis l'extension (1.2.9) : « un excel » proposait « excès » (nom de logiciel en minuscule).
  ["On a un excel avec le temps estimé.", "excel", "Excel"],
  ["Envoie-moi le powerpoint.", "powerpoint", "PowerPoint"],
  ["Je l'ai vu sur youtube.", "youtube", "YouTube"],
  ["Excel plante encore.", null, null],
  ["Il excelle en maths.", null, null],
  // Signalé depuis l'extension (1.2.9) : « Coucou lé gens » n'était pas souligné (→ « les »).
  ["Coucou lé gens", "lé", "les"],
  ["J'ai vu mé amis hier.", "mé", "mes"],
  ["Cé gens sont gentils.", "Cé", "Ces"],
  ["On pose le lé de papier peint.", null, null],
  ["Il lance un dé.", null, null],
  ["Mé bon, on verra.", "Mé", "Mais"],
  // Signalé depuis l'extension (1.3.0) : « la 1ere » proposait « erre » pour « ere » (→ « 1ʳᵉ »).
  ["@leblogauto C'est quoi la 1ere qui ressemble à une 300SL ?", "1ere", "1ʳᵉ"],
  ["Ce sont mes 1eres vacances.", "1eres", "1ʳᵉˢ"],
  ["C'est la 2eme fois.", "2eme", "2ᵉ"],
  ["C'est la 1re fois.", null, null],
  ["Ce sont mes 1res vacances.", null, null],
  ["Une ère nouvelle commence.", null, null],
];
