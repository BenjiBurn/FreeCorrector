// English conjugation: every tense of an English verb, for the conjugator
// (conj-worker.js), the Windows app's conjugator window and the website's
// tables (scripts/conjugations.js).
//
// The verbs, most common first, are in en-verbs.js (scripts/en-verbs.js makes
// it from Harper's dictionary): each with the spelling of its regular forms
// ("stop:d" doubles its last letter: stopped, stopping). The irregular verbs
// are written below, by hand.
//
//   fcEnConj.verbs()                       every verb, most common first
//   fcEnConj.lookup("went")                "go" (a verb, or one of its forms), or null
//   fcEnConj.table("go", { neg, int, contr, dialect })
//
// dialect: "us" (default) or "gb" (also used for Canada and Australia):
// travelled, learnt, got (instead of traveled, learned, gotten).

"use strict";

(() => {
  // "base past participle [3rd person]": several forms with commas, the first
  // one shown unless another is marked for the dialect: < American, ! British.
  const IRREGULAR = `
abide abided,abode abided,abode
arise arose arisen
awake awoke awoken
babysit babysat babysat
be was been is
bear bore borne
beat beat beaten
become became become
befall befell befallen
beget begot begotten
begin began begun
behold beheld beheld
bend bent bent
beset beset beset
bet bet bet
bid bid bid
bind bound bound
bite bit bitten
bleed bled bled
blow blew blown
break broke broken
breed bred bred
bring brought brought
broadcast broadcast broadcast
build built built
burn burned<,burnt! burned<,burnt!
burst burst burst
buy bought bought
cast cast cast
catch caught caught
choose chose chosen
cling clung clung
come came come
cost cost cost
creep crept crept
cut cut cut
deal dealt dealt
dig dug dug
dive dived,dove dived
do did done does
draw drew drawn
dream dreamed<,dreamt! dreamed<,dreamt!
drink drank drunk
drive drove driven
dwell dwelt,dwelled dwelt,dwelled
eat ate eaten
fall fell fallen
feed fed fed
feel felt felt
fight fought fought
find found found
fit fit<,fitted! fit<,fitted!
flee fled fled
fling flung flung
fly flew flown
forbid forbade forbidden
forecast forecast forecast
forego forewent foregone
foresee foresaw foreseen
foretell foretold foretold
forget forgot forgotten
forgive forgave forgiven
forgo forwent forgone
forsake forsook forsaken
freeze froze frozen
get got gotten<,got! gets
give gave given
go went gone goes
grind ground ground
grow grew grown
hang hung hung
have had had has
hear heard heard
hew hewed hewn,hewed
hide hid hidden
hit hit hit
hold held held
hurt hurt hurt
input input,inputted input,inputted
keep kept kept
kneel knelt,kneeled knelt,kneeled
knit knitted,knit knitted,knit
know knew known
lay laid laid
lead led led
lean leaned<,leant! leaned<,leant!
leap leaped<,leapt! leaped<,leapt!
learn learned<,learnt! learned<,learnt!
leave left left
lend lent lent
let let let
lie lay lain
light lit,lighted lit,lighted
lose lost lost
make made made
mean meant meant
meet met met
mislay mislaid mislaid
mislead misled misled
misread misread misread
misspell misspelled<,misspelt! misspelled<,misspelt!
mistake mistook mistaken
misunderstand misunderstood misunderstood
mow mowed mowed,mown
offset offset offset
overcome overcame overcome
overhear overheard overheard
overtake overtook overtaken
overthrow overthrew overthrown
partake partook partaken
pay paid paid
plead pleaded,pled pleaded,pled
proofread proofread proofread
prove proved proven,proved
put put put
quit quit quit
read read read
rid rid rid
ride rode ridden
ring rang rung
rise rose risen
run ran run
saw sawed sawed,sawn
say said said says
see saw seen
seek sought sought
sell sold sold
send sent sent
set set set
sew sewed sewn,sewed
shake shook shaken
shear sheared shorn,sheared
shed shed shed
shine shone shone
shoe shod shod
shoot shot shot
show showed shown,showed
shrink shrank shrunk
shut shut shut
sing sang sung
sink sank sunk
sit sat sat
slay slew slain
sleep slept slept
slide slid slid
sling slung slung
slink slunk slunk
slit slit slit
smell smelled<,smelt! smelled<,smelt!
smite smote smitten
sneak sneaked,snuck sneaked,snuck
sow sowed sown,sowed
speak spoke spoken
speed sped,speeded sped,speeded
spell spelled<,spelt! spelled<,spelt!
spend spent spent
spill spilled<,spilt! spilled<,spilt!
spin spun spun
spit spit<,spat! spit<,spat!
split split split
spoil spoiled<,spoilt! spoiled<,spoilt!
spread spread spread
spring sprang sprung
stand stood stood
steal stole stolen
stick stuck stuck
sting stung stung
stink stank stunk
strew strewed strewn,strewed
stride strode stridden
strike struck struck
string strung strung
strive strove,strived striven,strived
sublet sublet sublet
swear swore sworn
sweep swept swept
swell swelled swollen,swelled
swim swam swum
swing swung swung
take took taken
teach taught taught
tear tore torn
tell told told
think thought thought
thrive thrived,throve thrived,thriven
throw threw thrown
thrust thrust thrust
tread trod trodden
typeset typeset typeset
undergo underwent undergone
understand understood understood
undertake undertook undertaken
undo undid undone undoes
upset upset upset
wake woke woken
waylay waylaid waylaid
wear wore worn
weave wove woven
wed wed,wedded wed,wedded
weep wept wept
wet wet,wetted wet,wetted
win won won
wind wound wound
withdraw withdrew withdrawn
withhold withheld withheld
withstand withstood withstood
wring wrung wrung
write wrote written
`;

  // Verbs made of a prefix and an irregular verb are irregular like it
  // (outgrow, rebuild, overpay), when the verb list says so (en-verbs.js: "i").
  const PREFIXES = ["under", "over", "with", "fore", "out", "mis", "re", "un", "up", "inter"];

  // Modal verbs: no infinitive, no -s, no tenses of their own.
  const MODALS = {
    can: { past: "could", neg: "cannot", nt: "can’t" },
    may: { past: "might", neg: "may not", nt: null },
    must: { past: null, neg: "must not", nt: "mustn’t" },
    shall: { past: "should", neg: "shall not", nt: "shan’t" },
    will: { past: "would", neg: "will not", nt: "won’t" },
    ought: { past: null, neg: "ought not", nt: "oughtn’t", to: true },
  };
  const MODAL_OF = { could: "can", might: "may", should: "shall", would: "will" };

  // Two meanings, two conjugations: the page tells.
  const SENSES = { lie: "lie", hang: "hang", shine: "shine", bear: "bear" };

  const SUBJ = ["I", "you", "he/she/it", "we", "you", "they"];
  const BE_PRES = ["am", "are", "is", "are", "are", "are"];
  const BE_PAST = ["was", "were", "was", "were", "were", "were"];
  // Negative contractions; "am not" has none ("I’m not", "aren’t I?").
  const NT = {
    do: "don’t", does: "doesn’t", did: "didn’t", is: "isn’t", are: "aren’t", was: "wasn’t", were: "weren’t",
    have: "haven’t", has: "hasn’t", had: "hadn’t", will: "won’t", would: "wouldn’t", can: "can’t", could: "couldn’t",
    shall: "shan’t", should: "shouldn’t", must: "mustn’t", might: "mightn’t", ought: "oughtn’t",
  };
  // Contracted after the subject: "I’m", "they’ve", "she’ll".
  const SHORT = { am: "’m", are: "’re", is: "’s", have: "’ve", has: "’s", had: "’d", will: "’ll", would: "’d" };

  // ---------- The verbs ----------

  const irregular = new Map();
  for (const line of IRREGULAR.trim().split("\n")) {
    const [base, past, pp, s] = line.trim().split(/\s+/);
    irregular.set(base, { past: past.split(","), pp: pp.split(","), s });
  }

  const known = new Map(); // verb -> { rank, flags }
  const order = [];
  const raw = (globalThis.FC_EN_VERBS ?? "").trim();
  for (const entry of raw ? raw.split(/\s+/) : []) {
    const [verb, flags = ""] = entry.split(":");
    if (known.has(verb)) continue;
    known.set(verb, { rank: order.length, flags });
    order.push(verb);
  }
  for (const verb of [...Object.keys(MODALS), ...irregular.keys()]) {
    if (!known.has(verb)) {
      known.set(verb, { rank: order.length, flags: "" });
      order.push(verb);
    }
  }

  // The irregular verb a verb is built on: "outgrow" -> grow.
  function irregularOf(verb) {
    if (irregular.has(verb)) return { base: verb, prefix: "" };
    if (!known.get(verb)?.flags.includes("i")) return null;
    for (const p of PREFIXES) {
      const rest = verb.slice(p.length);
      if (verb.startsWith(p) && irregular.has(rest)) return { base: rest, prefix: p };
    }
    return null;
  }

  // ---------- Regular forms ----------

  // "stop:d" stopped, "panic:k" panicked, "travel:g" travelled in Britain
  // (traveled in America), "veto:e" vetoes, "singe:E" singeing.
  function doubled(verb, flags, dialect) {
    if (flags.includes("k")) return `${verb}k`;
    if (flags.includes("d") || (flags.includes("g") && dialect === "gb")) return verb + verb.at(-1);
    return verb;
  }

  function sForm(verb, flags) {
    if (flags.includes("d") && /[sz]$/.test(verb)) return `${verb + verb.at(-1)}es`;
    if (/(?:s|x|z|ch|sh)$/.test(verb) || flags.includes("e")) return `${verb}es`;
    if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
    return `${verb}s`;
  }

  function pastForm(verb, flags, dialect) {
    const stem = doubled(verb, flags, dialect);
    if (stem !== verb) return `${stem}ed`;
    if (verb.endsWith("e")) return `${verb}d`;
    if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ied`;
    return `${verb}ed`;
  }

  function ingForm(verb, flags, dialect) {
    const stem = doubled(verb, flags, dialect);
    if (stem !== verb) return `${stem}ing`;
    if (verb === "be") return "being";
    if (verb.endsWith("ie")) return `${verb.slice(0, -2)}ying`;
    if (verb.endsWith("e") && !/(?:ee|oe|ye)$/.test(verb) && !flags.includes("E")) return `${verb.slice(0, -1)}ing`;
    return `${verb}ing`;
  }

  // The form for the dialect among "learned<,learnt!": [shown, others].
  function pick(list, dialect) {
    const mark = dialect === "gb" ? "!" : "<";
    const shown = list.find((f) => f.endsWith(mark)) ?? list.find((f) => !/[<!]$/.test(f)) ?? list[0];
    const clean = (f) => f.replace(/[<!]$/, "");
    return [clean(shown), list.filter((f) => f !== shown).map((f) => ({ form: clean(f), dialect: f.endsWith("<") ? "us" : f.endsWith("!") ? "gb" : "" }))];
  }

  // The principal parts of a verb: { base, s, past, pp, ing, variants, irregular }.
  function parts(verb, dialect) {
    const flags = known.get(verb)?.flags ?? "";
    const irr = irregularOf(verb);
    const out = {
      base: verb,
      s: sForm(verb, flags),
      past: pastForm(verb, flags, dialect),
      pp: pastForm(verb, flags, dialect),
      ing: ingForm(verb, flags, dialect),
      variants: [],
      irregular: !!irr,
    };
    if (irr) {
      const { past, pp, s } = irregular.get(irr.base);
      const [p, pv] = pick(past, dialect);
      const [q, qv] = pick(pp, dialect);
      out.past = irr.prefix + p;
      out.pp = irr.prefix + q;
      if (s) out.s = irr.prefix + s;
      out.ing = irr.prefix + ingForm(irr.base, known.get(irr.base)?.flags ?? "", dialect);
      for (const v of pv) out.variants.push({ part: "past", form: irr.prefix + v.form, dialect: v.dialect });
      for (const v of qv) out.variants.push({ part: "pp", form: irr.prefix + v.form, dialect: v.dialect });
    } else if (flags.includes("g")) {
      // traveled / travelled: the other one.
      const other = dialect === "gb" ? "us" : "gb";
      const alt = pastForm(verb, flags, other);
      out.variants.push({ part: "past", form: alt, dialect: other }, { part: "pp", form: alt, dialect: other },
        { part: "ing", form: ingForm(verb, flags, other), dialect: other });
    }
    return out;
  }

  // ---------- Lookup ----------

  const plain = (s) => String(s ?? "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim().replace(/^to /, "");

  let reverse = null; // conjugated form -> verb (irregular forms and modal pasts)
  function reverseMap() {
    if (reverse) return reverse;
    reverse = new Map(Object.entries(MODAL_OF));
    for (const verb of order) {
      if (!irregularOf(verb) || verb.length > 14) continue;
      const p = parts(verb, "us");
      for (const f of [p.past, p.pp, p.s, ...p.variants.map((v) => v.form)]) {
        if (!known.has(f) && !reverse.has(f)) reverse.set(f, verb);
      }
    }
    return reverse;
  }

  // A verb from what the user typed: "to go", "Went", "stopped", "studies".
  function lookup(text) {
    const w = plain(text);
    if (!w) return null;
    if (known.has(w)) return w;
    const irr = reverseMap().get(w);
    if (irr) return irr;
    // A regular form: the verb it comes from, if it gives that form back.
    const stems = [];
    for (const [end, add] of [["ies", "y"], ["ied", "y"], ["es", ""], ["s", ""], ["ed", ""], ["ed", "e"], ["d", ""], ["ing", ""], ["ing", "e"], ["ying", "ie"]]) {
      if (w.endsWith(end)) stems.push(w.slice(0, -end.length) + add);
    }
    for (const end of ["ed", "ing"]) {
      if (w.endsWith(end) && w.length > end.length + 2) stems.push(w.slice(0, -end.length - 1)); // stopped -> stop
    }
    for (const stem of stems) {
      if (!known.has(stem) || MODALS[stem]) continue;
      for (const dialect of ["us", "gb"]) {
        const p = parts(stem, dialect);
        if ([p.s, p.past, p.pp, p.ing].includes(w)) return stem;
      }
    }
    return null;
  }

  // ---------- Tables ----------

  // A conjugated word cut for display: [stem, ending] (stop|ped, go|es, stud|ied),
  // or ["", word] for an irregular form (went, gone), or [word, ""].
  function cut(word, p, isIrregularPart) {
    if (word === p.base) return [word, ""];
    if (isIrregularPart) return ["", word];
    for (const stem of [p.base, p.base.slice(0, -1), p.base.slice(0, -2)]) {
      if (stem && word.startsWith(stem)) return [stem, word.slice(stem.length)];
    }
    return ["", word];
  }

  // One row: [before, ending, after] or plain text. `aux`: the auxiliaries,
  // the first one conjugated; `main`: [stem, ending] of the verb, or null.
  function row(subject, aux, main, o, doForm, base, tail = []) {
    let words;
    let verb = main;
    if ((o.neg || o.int) && !aux.length) {
      aux = [doForm];
      verb = [base, ""];
    }
    const [a0, ...rest] = aux;
    const not = (a) => (a === "can" ? ["cannot"] : [a, "not"]);
    if (o.int) {
      if (o.neg && o.contr && (NT[a0] || a0 === "am")) words = [a0 === "am" ? "aren’t" : NT[a0], subject, ...rest];
      else words = [a0, subject, ...(o.neg ? ["not"] : []), ...rest];
    } else if (o.neg) {
      if (o.contr && a0 === "am") words = [`${subject}’m`, "not", ...rest];
      else if (o.contr && NT[a0]) words = [subject, NT[a0], ...rest];
      else words = [subject, ...not(a0), ...rest];
    } else if (o.contr && SHORT[a0]) {
      words = [subject + SHORT[a0], ...rest];
    } else {
      words = [subject, ...aux];
    }
    words.push(...tail);
    const end = o.int ? "?" : "";
    if (!verb || !verb[1]) return [...words, ...(verb ? [verb[0]] : [])].join(" ") + end;
    return [`${[...words, ""].join(" ")}${verb[0]}`, verb[1], end];
  }

  // The French names of the moods and tenses, beside them (GLOSS_FR).
  function glossed(result) {
    for (const m of result.moods) {
      m.gloss = GLOSS_FR[m.title] ?? "";
      for (const c of m.cards) c.gloss = GLOSS_FR[c.title] ?? "";
    }
    return result;
  }

  function table(verb, opts = {}) {
    verb = lookup(verb);
    if (!verb) return null;
    const o = { neg: !!opts.neg, int: !!opts.int, contr: !!opts.contr };
    const dialect = opts.dialect === "gb" || opts.dialect === "ca" || opts.dialect === "au" ? "gb" : "us";
    const card = (key, title, rows) => ({ key, title, rows });

    if (MODALS[verb]) {
      const m = MODALS[verb];
      const tail = m.to ? ["to"] : [];
      const modal = (form) => SUBJ.map((s) => row(s, [form], null, o, form, form, tail));
      return glossed({
        verb, name: verb, kind: "modal", parts: null, variants: [], sense: "",
        moods: [{
          key: "modal",
          title: "Modal verb",
          cards: [card("mpre", "Present", modal(verb)), m.past ? card("mpast", "Past, conditional", modal(m.past)) : null].filter(Boolean),
        }],
      });
    }

    const p = parts(verb, dialect);
    const be = verb === "be";
    const irr = p.irregular;
    const base = [p.base, ""];
    const past = cut(p.past, p, irr && p.past !== pastForm(verb, "", dialect));
    const pp = cut(p.pp, p, irr && p.pp !== pastForm(verb, "", dialect));
    const ing = cut(p.ing, p, false);
    const s3 = cut(p.s, p, verb === "have" || be);
    const have = (i) => (i === 2 ? "has" : "have");

    // A tense: for each person, its auxiliaries and the verb.
    const tense = (key, title, make, doForms) => card(key, title, SUBJ.map((s, i) => {
      const [aux, main] = make(i);
      return row(s, aux, main, o, doForms?.[i], p.base);
    }));
    const DO = ["do", "do", "does", "do", "do", "do"];
    const DID = Array(6).fill("did");

    const moods = [
      {
        key: "present", title: "Present",
        cards: [
          be ? tense("pres", "Present simple", (i) => [[BE_PRES[i]], null])
            : tense("pres", "Present simple", (i) => [[], i === 2 ? s3 : base], DO),
          tense("presc", "Present continuous", (i) => [[BE_PRES[i]], ing]),
          tense("presp", "Present perfect", (i) => [[have(i)], pp]),
          tense("prespc", "Present perfect continuous", (i) => [[have(i), "been"], ing]),
        ],
      },
      {
        key: "past", title: "Past",
        cards: [
          be ? tense("past", "Past simple", (i) => [[BE_PAST[i]], null])
            : tense("past", "Past simple", () => [[], past], DID),
          tense("pastc", "Past continuous", (i) => [[BE_PAST[i]], ing]),
          tense("pastp", "Past perfect", () => [["had"], pp]),
          tense("pastpc", "Past perfect continuous", () => [["had", "been"], ing]),
        ],
      },
      {
        key: "future", title: "Future",
        cards: [
          tense("fut", "Future simple", () => [["will"], base]),
          tense("futc", "Future continuous", () => [["will", "be"], ing]),
          tense("futp", "Future perfect", () => [["will", "have"], pp]),
          tense("futpc", "Future perfect continuous", () => [["will", "have", "been"], ing]),
          tense("futg", "Future with going to", (i) => [[BE_PRES[i], "going", "to"], base]),
        ],
      },
      {
        key: "conditional", title: "Conditional",
        cards: [
          tense("cond", "Conditional", () => [["would"], base]),
          tense("condc", "Conditional continuous", () => [["would", "be"], ing]),
          tense("condp", "Conditional perfect", () => [["would", "have"], pp]),
          tense("condpc", "Conditional perfect continuous", () => [["would", "have", "been"], ing]),
        ],
      },
    ];

    // The forms without a subject.
    const neg = o.neg ? "not " : "";
    const join = (before, w) => (w[1] ? [before + w[0], w[1], ""] : before + w[0]);
    const imperative = o.neg
      ? [o.contr ? `don’t ${p.base}` : `do not ${p.base}`, `let’s not ${p.base}`]
      : [p.base, `let’s ${p.base}`];
    moods.push({
      key: "other", title: "Imperative, infinitive, participles",
      cards: [
        o.int ? null : card("impe", "Imperative", imperative),
        card("infi", "Infinitive", [`${neg}to ${p.base}`, join(`${neg}to have `, pp)]),
        card("ing", "Present participle, gerund", [join(neg, ing), join(`${neg}having `, pp)]),
        card("ppas", "Past participle", [join("", pp)]),
      ].filter(Boolean),
    });

    return glossed({
      verb,
      name: `to ${verb}`,
      kind: irr ? "irregular" : "regular",
      parts: { base: p.base, s: p.s, past: p.past, pp: p.pp, ing: p.ing },
      // Regular forms the irregular ones are mistaken for: "goed", "buyed".
      regular: irr ? { past: pastForm(verb, known.get(verb)?.flags ?? "", dialect), s: sForm(verb, "") } : null,
      variants: p.variants,
      sense: SENSES[verb] ?? "",
      moods,
    });
  }

  // French names of the tenses, beside the English ones for French speakers.
  const GLOSS_FR = {
    Present: "présent", Past: "passé", Future: "futur", Conditional: "conditionnel",
    "Imperative, infinitive, participles": "impératif, infinitif, participes", "Modal verb": "verbe modal",
    "Present simple": "présent simple", "Present continuous": "présent en be + -ing",
    "Present perfect": "present perfect", "Present perfect continuous": "present perfect en be + -ing",
    "Past simple": "prétérit", "Past continuous": "prétérit en be + -ing",
    "Past perfect": "pluperfect", "Past perfect continuous": "pluperfect en be + -ing",
    "Future simple": "futur avec will", "Future continuous": "futur en be + -ing",
    "Future perfect": "futur antérieur", "Future perfect continuous": "futur antérieur en be + -ing",
    "Future with going to": "futur proche",
    "Conditional perfect": "conditionnel passé", "Conditional continuous": "conditionnel en be + -ing",
    "Conditional perfect continuous": "conditionnel passé en be + -ing",
    Imperative: "impératif", Infinitive: "infinitif", "Present participle, gerund": "participe présent, gérondif",
    "Past participle": "participe passé", "Past, conditional": "passé, conditionnel",
  };

  globalThis.fcEnConj = {
    verbs: () => order.slice(),
    lookup,
    table,
    parts,
    rank: (verb) => known.get(verb)?.rank ?? Infinity,
    isModal: (verb) => !!MODALS[verb],
    GLOSS_FR,
    // For scripts/en-verbs.js: the spelling rules and the irregular verbs.
    _rules: { sForm, pastForm, ingForm, irregular, PREFIXES, MODALS },
  };
})();
