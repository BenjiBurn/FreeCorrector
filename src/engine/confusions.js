// Real-word confusions: a typo or a homophone that gives another valid French
// word ("mal au fois", "le toi de la maison", "sang euros"). No dictionary sees
// them; only the words around can tell. Each entry: the word typed, the fix,
// and a test on the context. Tests are narrow on purpose: a missed confusion
// is better than a false alarm.
//
// The context `c` gives: l1, l2, l3 (previous words), r1, r2, r3 (next words),
// all lowercased with ’; left / right (the four words on each side, joined by
// spaces); sentence (the whole sentence, lowercased); end (true when the word
// ends the clause); and morph(word) for dictionary tags.

/* exported fcRealWordConfusion */

const FC_DET_SING = /^(le|la|l’|un|une|mon|ma|ton|ta|son|sa|ce|cet|cette|notre|votre|leur|du|au)$/;
const FC_DET_MASC = /^(le|un|mon|ton|son|ce|cet|du|au|notre|votre|leur)$/;
const FC_DET_FEM = /^(la|une|ma|ta|sa|cette)$/;
const FC_ADVERB = /^(très|trop|si|plus|moins|aussi|assez|vraiment|tellement|super|hyper|pas)$/;
const FC_ETRE = /^(est|sont|suis|es|était|étaient|sera|seront|semble|reste|paraît|devient)$/;
const FC_AVOIR = /^(ai|as|a|avons|avez|ont|avais|avait|avoir|aura|aurait|eu)$/;
const FC_NUMBER = /^(\d+|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quarante|cinquante|soixante|cent|mille|quelques|plusieurs)$/;
const FC_HAIR_ADJ = /^(longs|courts|blonds|bruns|roux|raides|frisés|bouclés|gras|châtains|mi-longs|lisses|teints|blancs|gris)$/;
const FC_WATER = /(rivière|lac|mer|poisson|truite|canne|hameçon|étang|pêcheur|saumon|ligne)/;

// [word typed, fix (string or function of the context), test]
const FC_REAL_WORD_CONFUSIONS = [
  // vert / verre / vers / ver
  ["verre", (c) => (c.l1 === "yeux" ? "verts" : "vert"), (c) => /^(foncé|clair|pomme|olive|bouteille|kaki|émeraude|fluo|pâle)$/.test(c.r1) || (/^(yeux|couleur)$/.test(c.l1))],
  ["verres", "verts", (c) => /^(yeux)$/.test(c.l1)],
  ["vert", "vers", (c) => /^(midi|minuit|\d+|le|la|les|l’|chez|moi|toi|lui|eux|elle|nous|vous|ici|là|où|quelle|quel|huit|neuf|dix|onze|sept|six|cinq|quatre|trois|deux)$/.test(c.r1) &&
    !/^(le|un|du|en|au|feu|très|tout|plus|est|sont|était)$/.test(c.l1)],
  ["vert", "ver", (c) => /^(de terre|à soie|luisant)/.test(c.right) || (/^(un|le|du)$/.test(c.l1) && /hameçon|pêche|terre/.test(c.sentence))],
  // foie / fois
  ["fois", "foie", (c) => /^(au|du)$/.test(c.l1) || c.r1 === "gras"],
  // toit / toi
  ["toi", "toit", (c) => FC_DET_SING.test(c.l1)],
  ["toit", "toi", (c) => /^(à|pour|avec|chez|de|contre|comme|que|et|moi)$/.test(c.l1) && c.end],
  // mer / mère / maire
  ["mère", "mer", (c) => (c.l1 === "la" && c.l2 === "à" && (c.end || /^(cet|ce|cette|en|demain|pendant|l’)$/.test(c.r1))) ||
    /(bord de la|eau de la|vue sur la|mal de|fruits de)$/.test(c.left)],
  // cou / coup / coût
  ["coup", "cou", (c) => /^(cassé|tordu|tordue|cassée)$/.test(c.l2) || /(mal au|autour du|tour de)$/.test(c.left) || (c.l1 === "le" && /^(en|tendu)$/.test(c.r1))],
  // fin / faim
  ["faim", "fin", (c) => (/(^| )(à la|la)$/.test(c.left) && /^(du|de|des|d’)$/.test(c.r1)) || (c.l1 === "la" && c.l2 === "à") || /^(de semaine|du mois|de l’année|de journée)/.test(c.right)],
  // sans / sang / cent
  ["cent", "sans", (c) => c.r1 && (c.morph(c.r1).some((m) => /:Y/.test(m)) || /^(rien|aucun|aucune|moi|toi|lui|eux|elle|doute|cesse|arrêt|problème|souci|sucre|faute|cesse)$/.test(c.r1)) && !FC_NUMBER.test(c.l1)],
  ["sans", "sang", (c) => c.end && /^(de|du|le|mon|son|ton|beaucoup|prise|don|perte|goutte)$/.test(c.l1)],
  ["sang", "cent", (c) => /^(euros|euro|dollars|ans|mètres|kilos|grammes|personnes|fois|pour|kilomètres|pages|élèves|mille|francs|centimes)$/.test(c.r1) && !/^(du|de|le|mon)$/.test(c.l1)],
  ["sang", "sans", (c) => /^(sucre|moi|toi|lui|eux|rien|doute|problème|souci|faire|dire|savoir|cesse|arrêt|lait|sel|gluten)$/.test(c.r1)],
  // don / dont
  ["dont", "don", (c) => /^(le|un|mon|ton|son|du|au|notre|votre|leur|petit|beau|gros)$/.test(c.l1)],
  // voix / voie / voir / vois
  ["voie", "voix", (c) => (/^(belle|douce|grave|aiguë|forte|cassée|rauque|grosse|petite|jolie|magnifique)$/.test(c.l1) && (/^(a|as|ai|une|sa|ta|ma)$/.test(c.l2) || (FC_ADVERB.test(c.l2) && /^(une|sa|ta|ma)$/.test(c.l3)))) ||
    /^(à|de)$/.test(c.l1) && /^(haute|basse)$/.test(c.r1) || /(élever|baisser|perdu|perdre|baisse|élève) la$/.test(c.left)],
  ["voix", "voie", (c) => /^(numéro|ferrée|rapide|express|publique|lactée|navigable)$/.test(c.r1) || (/^(la|une|en)$/.test(c.l1) && /^(de|d’)$/.test(c.r1) && /^(disparition|guérison|développement|extinction|construction)$/.test(c.r2)) || /(sur la|quai|train)/.test(c.left)],
  ["voix", "voir", (c) => /^(de|pour|à|te|me|le|la|les|vous|nous|lui|leur|aller|vais|vas|va|veux|peux|dois|faut|venir|viens)$/.test(c.l1) &&
    (c.end || /^(demain|bientôt|ce|cette|le|la|les|ça|si|comment|ce|un|une|des|mes|tes|ses|ton|ta)$/.test(c.r1)) && !/^(à|de)$/.test(c.l1) || (c.l1 === "de" && /^(te|vous|le|la|les)$/.test(c.l2))],
  // père / paire / pair / perd
  ["paire", "père", (c) => FC_DET_MASC.test(c.l1) && c.l1 !== "du"],
  // temps / tant
  ["tant", "temps", (c) => (FC_DET_SING.test(c.l1) || /^(beaucoup|peu|assez|trop|plus)$/.test(c.l1) && c.l2 !== "si") && c.r1 !== "soit" && c.r1 !== "que" && c.l1 !== "en" || /(de|en même) tant/.test(c.left + " tant")],
  // date / datte
  ["datte", "date", (c) => /^(de|du|d’|limite|butoir)$/.test(c.r1) || /^(quelle|cette|la|une|même)$/.test(c.l1) && /anniversaire|réunion|naissance|rendez|mariage|rentrée|limite|fixer|fixé/.test(c.sentence)],
  // poids / pois / poix
  ["pois", "poids", (c) => /(perdre|perdu|prendre|pris|prends|perds) du$/.test(c.left) || /^(du|de|le|son|mon|ton)$/.test(c.l1) && /kilo|régime|balance|surpoids|lourd/.test(c.sentence)],
  ["poids", "pois", (c) => /^(petits|petit)$/.test(c.l1) || /^(chiches|chiche|cassés|gourmands)$/.test(c.r1)],
  // point / poing
  ["poing", "point", (c) => /^(final|virgule|culminant|commun|faible|fort|noir)$/.test(c.r1) || /^(de vue|d’interrogation|d’exclamation|de départ|de rendez-vous|à la fin|de suspension)/.test(c.right) || /(à ce|au)$/.test(c.left) && c.r1 !== "levé"],
  // cher / chère / chair
  ["chair", (c) => (c.femNear ? "chère" : "cher"), (c) => FC_ADVERB.test(c.l1) || (c.l1 === "" && /^\p{Lu}/u.test(c.r1orig ?? "")) || /^(ami|amie|amis|Monsieur|Madame|collègue|client|cliente)$/i.test(c.r1)],
  // conte / compte / comte
  ["compte", "conte", (c) => /^(lisait|lit|lis|lire|raconte|racontait|raconter|écrit|écrire|un vieux)$/.test(c.l2) && c.l1 === "un" || /^(de fées|pour enfants|merveilleux|populaire)/.test(c.right)],
  ["compte", "comte", (c) => /^(et la comtesse|de monte)/.test(c.right) || /(monsieur le)$/.test(c.left)],
  // ancre / encre
  ["encre", "ancre", (c) => /(jeter|jeté|jette|lever|levé|lève|levons) l’$/.test(c.left)],
  ["ancre", "encre", (c) => /(plus d’|tache d’|bouteille d’|cartouche d’|stylo à|de l’)$/.test(c.left) || c.l1 === "d’" && /stylo|imprimante|cartouche|tache|écrire/.test(c.sentence)],
  // plein / plaine
  ["plaine", "pleine", (c) => (FC_ETRE.test(c.l1) || FC_ADVERB.test(c.l1) || /^(moitié|à moitié)$/.test(c.l1)) && (c.end || /^(de|d’|à)$/.test(c.r1)) || c.r1 === "lune"],
  ["pleine", "plaine", (c) => /^(la|une|grande|vaste)$/.test(c.l1) && c.end && c.l2 !== "en"],
  // sale / salle
  ["salles", "sales", (c) => /^(mains|vêtements|chaussures|assiettes|pieds|cheveux|draps|habits|chaussettes)$/.test(c.l1) || FC_ETRE.test(c.l1) || FC_ADVERB.test(c.l1)],
  ["salle", "sale", (c) => (FC_ETRE.test(c.l1) || FC_ADVERB.test(c.l1)) && c.end],
  // tâche / tache
  ["tache", "tâche", (c) => /^(difficile|ménagère|facile|ardue|immense|importante|quotidienne)$/.test(c.r1) || /(accomplir|effectuer|réaliser|confier|confiée|à la)/.test(c.sentence)],
  ["taches", "tâches", (c) => /^(ménagères|quotidiennes|difficiles|administratives)$/.test(c.r1)],
  // pêcher / pécher, pêche / pèche
  ["pécher", "pêcher", (c) => /^(aller|va|vais|vas|allons|allez|vont|aime|aimons|adore|pour)$/.test(c.l1) || FC_WATER.test(c.sentence)],
  ["pèche", "pêche", (c) => FC_WATER.test(c.sentence)],
  // boue / bout
  ["bout", "boue", (c) => /^(la|une)$/.test(c.l1) || /(de la)$/.test(c.left)],
  // fard / phare
  ["phare", "fard", (c) => /^(à paupières|à joues)/.test(c.right)],
  // vin / vain / vingt
  ["vain", "vin", (c) => /^(ce|du|un|le|mon|son|ton|bon)$/.test(c.l1) || /^(rouge|blanc|rosé|blanc|pétillant|chaud)$/.test(c.r1) || /(verre de|bouteille de)$/.test(c.left)],
  ["vin", "vingt", (c) => /^(ans|euros|minutes|heures|jours|mètres|kilos|personnes|fois|ou|et|deux|trois|quatre|cinq|six|sept|huit|neuf|mille)$/.test(c.r1) && !/^(du|de|le|un|ce|mon|son)$/.test(c.l1)],
  ["vin", "vain", (c) => c.l1 === "en" && c.end],
  // auteur / hauteur
  ["hauteur", "auteur", (c) => /^(préféré|favori|célèbre|du livre|du roman|de ce livre|de ce roman)/.test(c.right) || /^(mon|ton|son|notre|votre|leur)$/.test(c.l1) && /livre|roman|écrivain|lire|lu|poème|préféré/.test(c.sentence)],
  // sel / selle
  ["selle", "sel", (c) => /^(et le poivre|et poivre|de cuisine|de mer|fin)/.test(c.right) || /^(du|de|peu de|le)$/.test(c.l1) && /poivre|sal|cuisine|plat|soupe|pâtes/.test(c.sentence)],
  ["sel", "selle", (c) => FC_DET_FEM.test(c.l1) || /(cheval|vélo|cavalier)/.test(c.sentence) && /^(sa|la)$/.test(c.l1)],
  // cour / cours / court
  ["court", "cour", (c) => FC_DET_FEM.test(c.l1) && !/^(de tennis|de squash|de badminton)/.test(c.right)],
  ["court", "cours", (c) => (FC_DET_SING.test(c.l1) || c.l1 === "au") && /^(de|d’)$/.test(c.r1) && !/^(tennis|squash|badminton|basket)$/.test(c.r2) || /^(de piano|de maths|de danse|de français|d’anglais|de guitare|de musique|de chant|de dessin|de sport|de yoga)/.test(c.right)],
  ["cours", "court", (c) => (FC_ADVERB.test(c.l1) || FC_ETRE.test(c.l1)) && c.end],
  // mal / mâle
  ["mâle", "mal", (c) => (FC_AVOIR.test(c.l1) || /^(fait|fais|faire|j’ai)$/.test(c.l1)) && /^(au|aux|à|de|d’)$/.test(c.r1)],
  ["mal", "mâle", (c) => /femelle/.test(c.sentence) && /^(un|le|est)$/.test(c.l1)],
  // pain / pin
  ["pin", "pain", (c) => /^(du|un|le|mon|ton|son|de)$/.test(c.l1) && /(boulangerie|chocolat|mie|beurre|confiture|tranche|grillé|frais|baguette|mange|manger|acheter|achète|petit-déjeuner)/.test(c.sentence) && !/(bois|forêt|pomme)/.test(c.sentence)],
  ["pain", "pin", (c) => /^(pousse|parasol|maritime|sylvestre)$/.test(c.r1) || /(pomme de)$/.test(c.left)],
  ["pains", "pins", (c) => /^(poussent|parasols|maritimes)$/.test(c.r1) || /(forêt de)$/.test(c.left)],
  // dents / dans
  ["dans", "dents", (c) => /^(aux|mes|tes|ses|les|des|nos|vos|leurs)$/.test(c.l1) && c.end],
  ["dents", "dans", (c) => /^(la|le|les|l’|mon|ma|mes|un|une|ce|cette|son|sa|ton|ta|notre|votre)$/.test(c.r1) && !/^(les|des|mes|tes|ses|aux|ses|nos|vos)$/.test(c.l1)],
  // manteau / marteau
  ["marteau", "manteau", (c) => /^(mets|mettre|mis|enlève|enlever|porte|porter|ôte|prends|retire)$/.test(c.l2) && /^(ton|mon|son|un|le|votre|ta)$/.test(c.l1) || /(froid|hiver|neige|pluie|vent)/.test(c.sentence) && /^(ton|mon|son|votre)$/.test(c.l1)],
  ["manteau", "marteau", (c) => /(clou|clous|planter|taper|frapper|tournevis|scie)/.test(c.sentence)],
  // raison / raisin
  ["raisin", "raison", (c) => FC_AVOIR.test(c.l1) || /^(en|pour|sans)$/.test(c.l1) && /^(de|du|d’)$/.test(c.r1)],
  ["raison", "raisin", (c) => /^(du|de)$/.test(c.l1) && !/^(plus|trop|bonne)$/.test(c.l2) && !/^(de|d’|pour|à)$/.test(c.r1) || /(grappe de|jus de)$/.test(c.left) || /^(sec|secs|blanc|noir|muscat)$/.test(c.r1)],
  // tour / tout
  ["tout", "tour", (c) => /(fait|faire|faisons|fais|fera|ferai|ferons) le$/.test(c.left) && /^(du|de)$/.test(c.r1) || /^(de magie|de passe-passe|de france)/.test(c.right)],
  // bien / bain
  ["bain", "bien", (c) => FC_ADVERB.test(c.l1) || /^(sûr|joué|fait|vu|dit|entendu)$/.test(c.r1) || c.l1 === "eh"],
  ["bien", "bain", (c) => /^(un|le|du|mon|ton|son)$/.test(c.l1) && /^(chaud|froid|moussant|de soleil|de bouche|tiède)/.test(c.right)],
  // tout / tous
  // ("Les fleuves prennent tous leur source": after a verb, "tous" is the subject's.)
  ["tous", (c) => (/^(la|ma|ta|sa|cette)$/.test(c.r1) ? "toute" : "tout"), (c) => /^(le|la|l’|mon|ma|ton|ta|son|sa|ce|cet|cette|notre|votre)$/.test(c.r1) &&
    !(c.l1 && c.morph(c.l1).some((m) => /:V[^/]*:(Ip|Iq|Is|If|K)/.test(m)) && !/^(ai|as|a|avons|avez|ont)$/.test(c.l1))],
  // maux / mots / mot / mal
  ["mots", "maux", (c) => /^(de tête|de ventre|de dos|de gorge|de cœur|d’estomac|de dents)/.test(c.right)],
  ["maux", (c) => (/^(de tête|de ventre|de dos|de gorge|de cœur|de mer|de dents)/.test(c.right) ? "mal" : "mot"), (c) => /^(le|un|ce|mon|ton|son|du|au)$/.test(c.l1)],
  // mètre / maître / mettre
  ["maîtres", "mètres", (c) => FC_NUMBER.test(c.l1) || /^(carrés|cubes|de haut|de long|de large|de profondeur|plus loin)/.test(c.right)],
  ["maître", "mètre", (c) => /^(un|1)$/.test(c.l1) && /^(carré|cube|de haut|de long|de large|plus loin|quatre-vingts)/.test(c.right)],
  ["mettre", "maître", (c) => /^(le|un|mon|ton|son|notre|votre|leur|du|au|petit)$/.test(c.l1)],
  // cuire / cuir
  ["cuir", "cuire", (c) => /^(faire|fait|laisser|laisse|faut|pour|bien)$/.test(c.l1) || /^(les|le|la|des|du|pendant|à|au)$/.test(c.r1) && !/^(en|de|du|le|un|ce|mon|ton|son|veste|sac|canapé)$/.test(c.l1)],
  // air / aire / ère
  ["aire", "air", (c) => /(a|as|ai|avez|ont|avait|avoir|avais) l’$/.test(c.left) || /(plein|en plein|grand|prendre l’|courant d’|mal de l’)$/.test(c.left)],
  // pré / prêt
  ["prêt", "pré", (c) => /^(le|un|du|au)$/.test(c.l1) && c.end && /^(dans|au|sur|vers|traverse|par)$/.test(c.l2) || /(vache|mouton|herbe|brout|cheval|chevaux)/.test(c.sentence) && /^(le|un|du|au)$/.test(c.l1)],
  // tente / tante
  ["tante", "tente", (c) => /(sous la|dans la|planter la|monter la|démonter la|plier la|planté la|monté la)$/.test(c.left) || /^(de camping|de plage|igloo)/.test(c.right)],
  ["tente", "tante", (c) => /^(ma|ta|sa)$/.test(c.l1) && (/^(vient|viendra|arrive|habite|dîne|mange|appelle|travaille|parle|pense|aime|est venue|m’a|nous a|m’appelle|et mon oncle|et ton oncle)/.test(c.right) || /oncle|cousin|neveu|nièce/.test(c.sentence))],
  // patte / pâte
  ["pâte", "patte", (c) => /(chien|chat|cheval|oiseau|lapin|blessé|blessée|boite|souris|animal)/.test(c.sentence) && /^(la|sa|une|à la)$/.test(c.l1)],
  ["pâtes", "pattes", (c) => /(chien|chat|cheval|oiseau|lapin|araignée|insecte|quatre)/.test(c.sentence) && !/(cuire|manger|sauce|bolognaise|carbonara)/.test(c.sentence)],
  // poêle / poil
  ["poil", "poêle", (c) => FC_DET_FEM.test(c.l1) || /^(à frire)/.test(c.right)],
  // chêne / chaîne
  ["chaîne", "chêne", (c) => FC_DET_MASC.test(c.l1) || /^(vieux|grand|gros|beau|bel)$/.test(c.l1) || /^(pousse|centenaire|millénaire)$/.test(c.r1)],
  // champ / chant
  ["chant", "champ", (c) => /^(laboure|labourer|laboure son|cultive|cultiver)$/.test(c.l2) || /(dans le|au milieu du|dans son|dans un)$/.test(c.left) || /^(de blé|de maïs|de bataille|de tournesols|de fleurs|de colza|de pommes de terre|de vision)/.test(c.right)],
  ["champ", "chant", (c) => /^(des oiseaux|du coq|de noël|grégorien|choral|du rossignol|des baleines)/.test(c.right)],
  // seau / saut / sceau / sot
  ["saut", "seau", (c) => /^(d’eau|de sable|à champagne|de glace|en plastique)/.test(c.right) || /(rempli|remplir|vidé|vider|porter|porte|plein) le$/.test(c.left)],
  ["seau", "saut", (c) => /(fait|faire|fais|fera) un$/.test(c.left) || /^(en hauteur|en longueur|en parachute|périlleux|à la perche|de \d+)/.test(c.right)],
  // hôtel / autel
  ["autel", "hôtel", (c) => /(dormi|dormir|réservé|réserver|chambre|nuit|séjour|logé|loger|bel|grand|à l’|dans un)/.test(c.left) && !/(église|messe|prêtre|sacrifice)/.test(c.sentence)],
  // quart / car
  ["car", "quart", (c) => /(heure|heures) et$/.test(c.left) || /^(d’heure)/.test(c.right) || /^(un|trois)$/.test(c.l1) && c.r1 === "d’"],
  // mai / mais / mes
  // (A day of the month, not a year: "le 1er mai", not "août 2024 mais".)
  ["mais", "mai", (c) => (/^(en|de)$/.test(c.l1) && c.end) ||
    ((/^(1er|premier)$/.test(c.l1) || (/^\d{1,2}$/.test(c.l1) && Number(c.l1) <= 31)) && /^(le|au|du|depuis|jusqu’au|dès|dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)$/.test(c.l2))],
  ["mais", "mes", (c) => c.l1 && c.morph(c.l1).some((m) => /:V/.test(m)) && c.r1 && c.morph(c.r1).some((m) => /:N(:A)?:[mfe]:p/.test(m)) && !c.morph(c.r1).some((m) => /:V/.test(m))],
  // nez / né
  ["né", "nez", (c) => /^(le|mon|ton|son|un|du|au|gros|petit)$/.test(c.l1)],
  // pose / pause
  ["pause", "pose", (c) => c.l1 === "" && /^(le|la|les|ça|ton|ta|tes|ce|cette|ces|mon|ma|ici|là)$/.test(c.r1)],
  // balade / ballade
  ["ballade", "balade", (c) => /^(en|à|dans|au|sur|le long)$/.test(c.r1) || /(fait|faire|faisons|on fait|petite|belle) une$/.test(c.left) || /(faire|petite) une$/.test(c.left)],
  // sain / sein
  ["sein", "sain", (c) => /^(et sauf|d’esprit)/.test(c.right) || /^(esprit|corps|mode de vie)$/.test(c.l1)],
  // signe / cygne
  ["cygne", "signe", (c) => /(fait|faire|fais|faites) un$/.test(c.left) || /^(de la main|de tête|astrologique|du zodiaque|de vie)/.test(c.right)],
  // fête / faite
  ["faite", "fête", (c) => /^(la|une|bonne|de)$/.test(c.l1) && !FC_ETRE.test(c.l2) && !FC_AVOIR.test(c.l2) || /^(de la musique|des mères|des pères|foraine|d’anniversaire|nationale)/.test(c.right)],
  // joie / joue
  ["joue", "joie", (c) => c.l1 === "de" && /^(fou|folle|cris|larmes|sauter|pleurer|bondir|rempli|remplie|plein|pleine|crier|hurler)$/.test(c.l2) || /^(de vivre)/.test(c.right)],
  ["joies", "joues", (c) => /^(rouges|roses|creuses|pâles|rebondies|rondes)$/.test(c.r1) || /(sur les|sur ses|sur tes)$/.test(c.left)],
  // ci / si (demonstrative)
  // (handled on hyphenated words below)
  // désolé
  ["désole", "désolé", (c) => c.end || FC_ETRE.test(c.l1) || /^(vraiment|tellement|très|trop)$/.test(c.l1) || (c.l1 === "" && /^(pour|de|d’)$/.test(c.r1))],
  // sur / sûr
  ["sûr", "sur", (c) => /^(la|le|les|l’|un|une|mon|ma|mes|ton|ta|tes|son|sa|ses|ce|cette|ces|notre|votre|leur|leurs)$/.test(c.r1) && !/^(bien|pas|tout|sûr)$/.test(c.l1) && !FC_ETRE.test(c.l1)],
  // droite
  ["droit", "droite", (c) => c.l1 === "à" && (c.end || /^(au|à|puis|après|et|du|de|sur)$/.test(c.r1)) && !/(avoir|a|as|ai|ont)$/.test(c.l2)],
  // nuit / nui
  ["nui", "nuit", (c) => /^(la|une|cette|bonne|fait|toute|chaque|en|de)$/.test(c.l1)],
  // soir / soit / soif
  ["soit", "soir", (c) => /^(ce|demain|hier|chaque|un|le|du|bon|bonne|samedi|dimanche|lundi|mardi|mercredi|jeudi|vendredi)$/.test(c.l1) && !/^(que|qu’|quoi|soit|bien)$/.test(c.l2) &&
    (c.end || /^(à|vers|je|on|il|nous|vous|tu|et)$/.test(c.r1))],
  ["soif", "soir", (c) => /^(ce|demain|hier|chaque|samedi|dimanche|lundi|mardi|mercredi|jeudi|vendredi)$/.test(c.l1)],
  ["soit", "soif", (c) => /^(ai|as|a|avons|avez|ont|avais|avait|j’ai)$/.test(c.l1) && (c.end || c.r1 === "et")],
  // cheveux / chevaux / cheval / cheveu
  ["chevaux", "cheveux", (c) => FC_HAIR_ADJ.test(c.r1) && !/(ferme|écurie|course|galop|monte)/.test(c.sentence) || /(coupé les|coupe les|coiffé les|brosse les|lave les|lavé les|teint les) $/.test(c.left + " ") && /^(mes|tes|ses|les)$/.test(c.l1) && !/(écurie|ferme|selle)/.test(c.sentence)],
  ["cheveu", "cheval", (c) => c.l1 === "à" && c.r1 !== "près"],
  // laid / lait
  ["lait", "laid", (c) => (FC_ADVERB.test(c.l1) || FC_ETRE.test(c.l1)) && c.end],
];

// The fix for word t (index i) in tokens, or null.
function fcRealWordConfusion(tokens, i, spellChecker, paragraph) {
  const t = tokens[i];
  const entries = FC_REAL_WORD_CONFUSIONS.filter(([w]) => w === t.lower);
  if (!entries.length) return null;
  let s = i;
  while (s > 0 && !/^[.!?]$/.test(tokens[s - 1].text)) s--;
  let e = i;
  while (e < tokens.length - 1 && !/^[.!?]$/.test(tokens[e + 1].text)) e++;
  const word = (k) => (tokens[k] && k >= s && k <= e && !/^[,;:()«»"“”]$/.test(tokens[k].text) ? tokens[k].lower : "");
  const after = tokens[i + 1];
  const c = {
    l1: word(i - 1), l2: word(i - 2), l3: word(i - 3),
    r1: word(i + 1), r2: word(i + 2), r3: word(i + 3),
    r1orig: after && i + 1 <= e ? after.text : "",
    left: tokens.slice(Math.max(s, i - 4), i).map((x) => x.lower).join(" "),
    right: tokens.slice(i + 1, Math.min(e + 1, i + 5)).map((x) => x.lower).join(" "),
    sentence: tokens.slice(s, e + 1).map((x) => x.lower).join(" "),
    end: !after || /^[.!?,;:)]$/.test(after.text),
    morph: (w) => {
      try {
        return spellChecker.getMorph(w.replace(/’$/, ""));
      } catch {
        return [];
      }
    },
  };
  c.femNear = tokens.slice(Math.max(s, i - 6), i).some((x) => c.morph(x.lower).some((m) => /:N:f:s/.test(m)) && !c.morph(x.lower).some((m) => /:N:m/.test(m)));
  for (const [, fix, test] of entries) {
    let hit = false;
    try {
      hit = test(c);
    } catch {
      hit = false;
    }
    if (hit) return typeof fix === "function" ? fix(c) : fix;
  }
  return null;
}
