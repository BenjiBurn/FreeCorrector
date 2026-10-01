// English regression corpus: common mistakes and the correction we expect.
// [sentence, wrong text, expected first suggestion]; null = must not be flagged.

module.exports = [
  // ---- Homophones and confusions
  ["Their going to the park tomorrow.", "Their", "They're"],
  ["I am going to there house later.", "there", "their"],
  ["Its a beautiful day.", "Its", "It's"],
  ["The dog wagged it's tail.", "it's", "its"],
  ["Your welcome to join us.", "Your", "You're"],
  ["Is this you're car?", "you're", "your"],
  ["I could of done better.", "could of", "could have"],
  ["We should of left earlier.", "should of", "should have"],
  ["She is taller then her brother.", "then", "than"],
  ["I will loose my keys again.", "loose", "lose"],
  ["The affect of the change was huge.", "affect", "effect"],
  ["Who's book is this?", "Who's", "Whose"],
  ["I'm going to the store to.", "to", "too"],
  ["There are to many people here.", "to", "too"],
  ["Alot of people came to the party.", "Alot", "A lot"],

  // ---- Agreement and grammar
  ["I has a question.", "has", "have"],
  ["She have a new car.", "have", "has"],
  ["They was happy to see us.", "was", "were"],
  ["He don't like coffee.", "don't", "doesn't"],
  ["I ate a apple.", "a", "an"],
  ["She is an teacher.", "an", "a"],
  ["The the cat is sleeping.", "The the", "The"],
  ["This are my friends.", "This", "These"],
  ["He go to school every day.", "go", "goes"],
  ["Me and him went to the store.", "Me and him", "He and I"],
  ["I seen that movie already.", "seen", "saw"],

  // ---- Spelling
  ["She definately wants to come.", "definately", "definitely"],
  ["I will recieve the package soon.", "recieve", "receive"],
  ["We will meet tomorow.", "tomorow", "tomorrow"],
  ["It was a wierd experience.", "wierd", "weird"],
  ["This is a seperate issue.", "seperate", "separate"],
  ["I need to buy some groceries untill Friday.", "untill", "until"],
  ["The goverment announced new rules.", "goverment", "government"],
  ["That was an embarassing moment.", "embarassing", "embarrassing"],
  ["I beleive you.", "beleive", "believe"],
  ["Thank you for your adress.", "adress", "address"],
  ["It is necesary to rest.", "necesary", "necessary"],
  ["We had a great occurence.", "occurence", "occurrence"],

  // ---- Contractions without apostrophe
  ["I dont know.", "dont", "don't"],
  ["It isnt working.", "isnt", "isn't"],
  ["She cant come today.", "cant", "can't"],
  ["They wont answer.", "wont", "won't"],
  ["Im tired.", "Im", "I'm"],

  // ---- Capitalization and punctuation
  ["i think this is great.", "i", "I"],
  ["Yesterday i went home.", "i", "I"],

  // ---- Correct sentences
  ["This is a sentence with no errors.", null, null],
  ["They're going to their friend's house over there.", null, null],
  ["It's important to know its limits.", null, null],
  ["Could you send me the report by Friday?", null, null],
  ["We have been working on this project for months.", null, null],
  ["The results were better than expected.", null, null],
  ["Please let me know if you have any questions.", null, null],
  ["She doesn't like spicy food.", null, null],
  ["I would have come if I had known.", null, null],
  ["Thanks for your help, see you tomorrow!", null, null],
];
