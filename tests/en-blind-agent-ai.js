// Twelfth blind English corpus (agent-written, 2026-11-14): Facebook comments under news articles and local-group posts, Twitter/X threads and replies, real-estate listings and tenant/landlord messages, pharmacy/vet/doctor portal messages, wedding toasts and retirement speeches, condolence messages and obituaries, dating-app profiles and messages, job ads and applicant replies, company customer-service replies, ride-share and Nextdoor posts, amateur sports clubs, gardening, DIY and classic-car forums, fan fiction and amateur fiction, eBay/Etsy listings; American and British writers (UK lines are marked).
// [sentence, wrong text, expected first suggestion]; null = must not be flagged.
module.exports = [
  // --- Facebook comments under news articles ---
  ["The council could of fixed the potholes on Mill Road before the winter.", "could of", "could have"], // UK
  ["This is exactly why nobody trusts the goverment anymore.", "goverment", "government"],
  ["Nobody knows how the new tax will effect small businesses like ours.", "effect", "affect"],
  ["There's three schools in our district that still don't have air conditioning.", "There's", "There are"],
  ["My husband and me drove past the fire last night and it was terrifying.", "me", "I"],
  ["The cops drug the car out of the lake this morning, according to my neighbor.", "drug", "dragged"],
  ["My cousin was there when the accident occured and said the other driver ran the red light.", "occured", "occurred"],
  ["Noone from the city has bothered to come out and look at the sinkhole.", "Noone", "No one"],
  ["Whoever wrote this headline clearly didn't read the article.", null, null],
  ["I'd rather pay a little more in taxes than lose the library.", null, null],

  // --- Facebook local-group posts ---
  ["Has anyone seen a grey cat with a white chest? She got out last night and hasn't came home.", "hasn't came", "hasn't come"], // UK
  ["Does anyone know a good plumber? Our kitchen tap has been leaking for a fortnight and the landlord keeps ignoring are calls.", "are", "our"], // UK
  ["The farmers' market is moving to the church parking lot untill the construction is done.", "untill", "until"],
  ["Lost a black wallet near the bakery yesterday. If anyone finds it, please let me know; their is a reward.", "their", "there"],
  ["The bakery has been open since the millenium, and this is the first time it's ever closed early.", "millenium", "millennium"],
  ["The potluck is at the Miller's house this Saturday at six.", "Miller's", "Millers'"],
  ["I can't bare the thought of moving away from this neighbourhood.", "bare", "bear"], // UK
  ["Whose dog has been barking on Maple Avenue since 6 a.m.?", null, null],
  ["Found a set of keys outside the Johnsons' house on Elm Street. Message me if they're yours.", null, null],

  // --- Twitter/X threads and replies ---
  ["Hot take: the sequel was better then the original.", "then", "than"],
  ["Your not wrong, but the timing of this announcement is very suspicious.", "Your", "You're"],
  ["Every single one of these replies are missing the point.", "are", "is"],
  ["I've went back and forth on this, but I think the refs got it right.", "I've went", "I've gone"],
  ["Honestly, the new update is so buggy I'm loosing my mind.", "loosing", "losing"],
  ["Who's idea was it to schedule the game at noon in July?", "Who's", "Whose"],
  ["I was so embarassed when my card got declined at the till.", "embarassed", "embarrassed"], // UK
  ["The storm is supposed to wreck havoc on the coast tonight.", "wreck", "wreak"],
  ["This is the wierdest weather we've had in years.", "wierdest", "weirdest"],
  ["Thread: ten things I wish I'd known before I started freelancing.", null, null],
  ["Absolutely gutted the match was called off after we'd travelled all the way from Leeds.", null, null], // UK

  // --- Real-estate listings and tenant/landlord messages ---
  ["Charming three-bedroom semi with a seperate dining room and a large rear garden.", "seperate", "separate"], // UK
  ["The house sits on a quite cul-de-sac just minutes from the elementary school.", "quite", "quiet"],
  ["Hi, just letting you know the heating has stopped working again and its freezing in the flat.", "its", "it's"], // UK
  ["The tenants before us left alot of rubbish in the garden, so we've put it by the bins.", "alot", "a lot"], // UK
  ["Please be advised that maintenance will be entering units on the third floor tommorow between 9 and 11 a.m.", "tommorow", "tomorrow"],
  ["The landlord said he would of fixed the boiler last week, but nobody has come round.", "would of", "would have"], // UK
  ["The property boasts stunning views of the lake and is perfect for entertaining guest's.", "guest's", "guests"],
  ["Pets are welcome, accept for dogs over 50 pounds.", "accept", "except"],
  ["We were suppose to close on the house last Friday, but the bank delayed the loan.", "suppose", "supposed"],
  ["I payed the full deposit on Monday and still haven't received a receipt.", "payed", "paid"],
  ["Guests will receive a complementary bottle of wine on arrival.", "complementary", "complimentary"],
  ["This stunning flat is a stone's throw from the high street and has plenty of natural light.", null, null], // UK

  // --- Pharmacy, vet and doctor portal messages ---
  ["Hi Dr Patel, I've been taking the new medication for a week and the side affects are getting worse.", "affects", "effects"], // UK
  ["The tablets make me so dizzy that I have to lay down for an hour after every dose.", "lay", "lie"],
  ["Bella has been scratching her ears constantly and their starting to smell.", "their", "they're"],
  ["Could you please advice whether I should keep giving him the antibiotics now that the rash has appeared?", "advice", "advise"],
  ["Since starting the inhaler, I can finally breath properly when I climb the stairs.", "breath", "breathe"],
  ["The vet recommended we feed him less treats because he's put on weight.", "less", "fewer"],
  ["Mum's been on the new tablets for a fortnight and the swelling in her ancles has gone down.", "ancles", "ankles"], // UK
  ["Our records show that Max is due for his rabies vaccine and annual checkup.", null, null],
  ["My GP has referred me to a specialist, but apparently the waiting list is six months long.", null, null], // UK

  // --- Wedding toasts and retirement speeches ---
  ["When Mark first introduced me to Sarah, I new straight away that she was the one for him.", "new", "knew"], // UK
  ["Between you and I, he practised this speech in the car for three weeks.", "I", "me"], // UK
  ["Lisa and Tom, we couldn't be more happier for you both.", "more happier", "happier"],
  ["Janet has been the heart and soul of this office, and we'll miss her more then words can say.", "then", "than"],
  ["Dave and me have been best mates since primary school, and he's like a brother to my family.", "me", "I"], // UK
  ["Carol, you've been a mentor to so many of us, and your going to leave a huge hole in this department.", "your", "you're"],
  ["It's been a honour to work alongside you for all these years.", "a honour", "an honour"], // UK
  ["We're so happy to be apart of your special day.", "apart", "a part"],
  ["Nothing ever seemed to phase him, not even the Christmas the whole server crashed.", "phase", "faze"],
  ["To the happy couple: may your love grow stronger with each passing year.", null, null],
  ["Could everyone please raise their glasses to the bride and groom, who've made today unforgettable?", null, null],

  // --- Condolence messages and obituaries ---
  ["Our deepest condolences to you and you're family during this difficult time.", "you're", "your"],
  ["She past away peacefully at home on November 3, surrounded by her loving family.", "past", "passed"],
  ["He will be dearly missed by all who's lives he touched.", "who's", "whose"],
  ["Visitation will be held from 4 to 7 p.m. Thursday at Miller Funeral Home, were friends may share memories.", "were", "where"],
  ["Our thoughts are with the Garcia's at this difficult time.", "Garcia's", "Garcias"],
  ["We are so greatful for all the cards and flowers we have received.", "greatful", "grateful"],
  ["Uncle Pete will be layed to rest on Friday at St John's Church, followed by a gathering at the Red Lion.", "layed", "laid"], // UK
  ["John is survived by his wife of 45 years, Margaret; his three children; and seven grandchildren.", null, null],
  ["Grandad was the kindest man I've ever known, and I'll never forget the summers we spent on his allotment.", null, null], // UK
  ["Mum was laid to rest beside Dad in the village churchyard, just as she had wished.", null, null], // UK
  ["She was preceded in death by her husband, Walter, and her brother, Eugene.", null, null],

  // --- Dating-app profiles and messages ---
  ["Looking for someone who can make me laugh and doesn't take themselves to seriously.", "to", "too"],
  ["I'm a nurse who works nights, so I definately appreciate someone who's patient.", "definately", "definitely"],
  ["I'm looking for someone discrete, since I work in a small town where everyone knows everyone.", "discrete", "discreet"],
  ["Dog mom, coffee addict, and amateur baker who's always up for an adventure.", null, null],
  ["Looking for someone to share Sunday roasts, long walks and terrible pub quiz answers with.", null, null], // UK
  ["Two truths and a lie: I've met Taylor Swift, I've never seen Star Wars, and I can't swim.", null, null],
  ["Your profile made me laugh, especially the bit about your cat's Instagram account.", null, null], // UK

  // --- Job ads and applicant replies ---
  ["Applicants must be able to lift 50 pounds and work independantly.", "independantly", "independently"],
  ["Please let me know if you did not recieve my portfolio.", "recieve", "receive"],
  ["I am very interested in this role and believe my skills compliment the needs of your department.", "compliment", "complement"],
  ["The successful candidate will report directly to the principle engineer.", "principle", "principal"],
  ["The position requires an university degree and at least two years of experience.", "an", "a"],
  ["The new pay structure will go into affect at the start of next quarter.", "affect", "effect"],
  ["We're a small, friendly team based in Manchester, and were looking for an organised, enthusiastic office manager.", "were", "we're"], // UK
  ["I have recently completed my NVQ and am keen to persue a career in childcare.", "persue", "pursue"], // UK

  // --- Company customer-service replies ---
  ["We apologize for the delay; your order has shipped and should arrive within 3–5 buisness days.", "buisness", "business"],
  ["Unfortunately, we are unable to except returns on items that have been worn or washed.", "except", "accept"],
  ["As a gesture of goodwill, we've applied a £10 credit to you account.", "you", "your"], // UK
  ["We sincerely apologise for the inconvience caused and have passed your feedback on to the store manager.", "inconvience", "inconvenience"], // UK
  ["We're sorry to hear that your parcel hasn't arrived; we've raised this with our courier and will be in touch shortly.", null, null], // UK

  // --- Ride-share and Nextdoor posts ---
  ["Whoever keeps letting there dog poop on our lawn, please pick it up.", "there", "their"],
  ["The bloke across the road has been parking his van in front of our drive everyday this week.", "everyday", "every day"], // UK
  ["Did anyone else here those loud bangs around midnight?", "here", "hear"],
  ["The driver waited at the wrong entrance, and than he cancelled the trip and charged me a fee.", "than", "then"], // UK
  ["Someone's package was delivered to our porch by mistake. Its addressed to 412 Cedar Court.", "Its", "It's"],
  ["Does anyone know why the police where on Main Street last night?", "where", "were"],
  ["I didn't see nothing on the doorbell camera, but the package was definitely gone.", "nothing", "anything"],
  ["By the time the deputies arrived, the suspect had ran into the woods behind the school.", "had ran", "had run"],
  ["I use to live on this street back in the nineties, and it's changed so much.", "use", "used"],
  ["The lightening knocked out power to the whole block last night.", "lightening", "lightning"],
  ["I seen a coyote near the elementary school this morning, so keep your pets inside.", "seen", "saw"],
  ["Honestly, the new mural in the town centre is a site for sore eyes.", "site", "sight"], // UK
  ["Our neighbors' kids are always so polite, which is refreshing these days.", null, null],
  ["Free to a good home: a couch, two lamps, and a kids' bike that just needs new tires.", null, null],

  // --- Amateur sports clubs ---
  ["The under-12s won they're first match of the season on Saturday!", "they're", "their"], // UK
  ["The list of players who are available for Sunday's match are on the noticeboard.", "are on", "is on"], // UK
  ["If your kid's are playing in the tournament, please make sure they bring water.", "kid's", "kids"],
  ["Big thanks to the parents who brung snacks for the team after the game.", "brung", "brought"],
  ["Our captain lead the team to its first championship in twenty years.", "lead", "led"],
  ["No dogs are aloud on the pitch during matches.", "aloud", "allowed"], // UK
  ["We waited with baited breath for the final whistle.", "baited", "bated"], // UK
  ["We need too more players for Sunday's game, or we'll have to forfeit.", "too", "two"],
  ["Practice is canceled tonight because the field is flooded.", null, null],
  ["Subs are due by the end of the month; please pay by bank transfer if you can.", null, null], // UK

  // --- Gardening forums ---
  ["The slugs have ate every one of my courgette seedlings again.", "have ate", "have eaten"], // UK
  ["Its best to plant garlic in the fall, about six weeks before the ground freezes.", "Its", "It's"],
  ["The hydrangeas changed colour after I added some ericaceous compost, which was a nice suprise.", "suprise", "surprise"], // UK
  ["Don't prune lavender to hard, or it may not grow back from the old wood.", "to", "too"],
  ["The bees seem to love the borage; there's always dozens of them on it.", "there's", "there are"],
  ["Does anyone know weather it's too late to plant tulip bulbs?", "weather", "whether"],
  ["Any advise on getting rid of aphids without using chemicals?", "advise", "advice"],
  ["Everytime I water the ferns, the tips of the fronds go brown.", "Everytime", "Every time"], // UK
  ["I lay a thick layer of mulch around the roses every autumn to protect the roots.", null, null], // UK

  // --- DIY forums ---
  ["I should of used a level before hanging the shelves, because now everything is crooked.", "should of", "should have"],
  ["If you don't prime bare timber first, the paint will start to peal within a year.", "peal", "peel"], // UK
  ["I've just fitted a new worktop in the kitchen, but the joint between the two pieces is really noticable.", "noticable", "noticeable"], // UK
  ["One of the shelf brackets came lose and everything fell on the floor.", "lose", "loose"],
  ["We should have went with the other contractor; this one never shows up on time.", "went", "gone"],

  // --- Classic-car forums ---
  ["The breaks on my old Beetle feel spongy even after I bled them twice.", "breaks", "brakes"],
  ["The previous owner had drove it without oil for who knows how long.", "had drove", "had driven"],
  ["I've been pouring over the wiring diagram for hours and I still can't find the short.", "pouring", "poring"],
  ["Him and his brother restored the whole car in his mum's garage.", "Him", "He"], // UK
  ["I finally got the '67 Mustang running after three years of restoration.", null, null],
  ["I'd rather lose a bit of power than ruin the originality of the engine.", null, null],
  ["My MGB has a slight oil leak from the rocker cover gasket, which seems to be a common problem.", null, null], // UK

  // --- Fan fiction and amateur fiction ---
  ["She lay the letter on the table and walked out without a word.", "lay", "laid"],
  ["\"Your late,\" she said, crossing her arms.", "Your", "You're"],
  ["Draco was laying on the bed, staring at the ceiling and refusing to speak.", "laying", "lying"],
  ["She took a deep breathe and pushed open the heavy oak door.", "breathe", "breath"],
  ["He reigned in his horse at the edge of the cliff.", "reigned", "reined"],
  ["Her and Ron had been rowing since breakfast.", "Her", "She"], // UK
  ["The strange noise peaked her curiosity, so she followed it into the woods.", "peaked", "piqued"],
  ["He was barely conscience when the paramedics arrived.", "conscience", "conscious"],
  ["He could feel his heart pounding as he snuck down the stairs.", null, null],
  ["The dragon let out a low growl, its eyes glowing in the darkness.", null, null],
  ["The knight's armour glinted in the morning sun as he rode towards the castle.", null, null], // UK
  ["Sherlock glanced at the clock and realised they had less than an hour.", null, null], // UK
  ["Neither of them noticed the figure watching from the shadows.", null, null],

  // --- eBay/Etsy listings ---
  ["Brand new with tags, never been warn.", "warn", "worn"],
  ["Each of these mugs are hand-thrown and glazed in my home studio.", "are", "is"],
  ["Personalised wooden chopping board, ideal for weddings, anniversary's and housewarmings.", "anniversary's", "anniversaries"], // UK
  ["Beautiful stationary set with matching envelopes and wax seals.", "stationary", "stationery"],
  ["High-waisted vintage jeans, waste measures 28 inches lying flat.", "waste", "waist"],
  ["Here's a sneak peak of the new collection dropping on Friday!", "peak", "peek"],
  ["Includes charger, manual, original box, ect.", "ect.", "etc."],
  ["Vintage leather jacket in excellent condition, only worn a handful of times.", null, null],
  ["Handmade soy candles, perfect for a cosy night in or as a gift for a friend.", null, null], // UK
];
