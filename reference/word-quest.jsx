import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ============================================================
   WORD QUEST v2 — CVC spaced-repetition phonics game
   Three fixed zones · grown-up strip · AA contrast · no page scroll in session
   ============================================================ */

/* THE 10-AND-10 CURRICULUM (owner-approved 2026-08-15 in four listening
   rounds; docs/settled.md holds the record). Levels 1-12 carry ten decodable
   words each, in the teaching order the owner read and approved; heart words
   ride outside that count and sit where the owner ruled: the, a, and and i at
   Level 1, of at Level 7 ("Move of to 7", round three), the rest as offered.
   Hearts LEAD each level's array because a level's word order is its
   introduction order (owner-ruled 2026-08-12, kept from the old Level 2) —
   except Level 1, where the ten decodables lead: a child's first-ever act in
   this game is sounding out a clean two-sound word, not memorising a sight
   word, and the four hearts still arrive inside the same first session.
   "i" is the one word new to the bank (round four): it says the letter's own
   name, so it is a heart, and its clip is the exact render the owner approved.
   Levels 13-20 are the bank's remaining stages, identities and internal order
   unchanged; only their numbers moved — except the fifteen short-e and
   short-u words that moved down into Levels 11 and 12. The ten new names
   for Levels 3-12 were owner-approved on 2026-08-15 ("Sound great";
   open-faults R records the ruling). */
const LEVELS = [
  { n: 1, name: "Hatchlings", emoji: "🐣", focus: "two sounds (VC)",
    words: ["is","it","in","on","at","an","up","us","am","ax","the","a","and","i"] },
  { n: 2, name: "Sunny Start", emoji: "☀️", focus: "VC finishes; short a begins",
    words: ["my","we","if","ox","cat","sat","ran","can","man","dad","hat","mat","fat"] },
  { n: 3, name: "Jam Jar", emoji: "🍓", focus: "short a",
    words: ["me","to","had","bag","nap","map","cap","tag","jam","ham","pat","bat"] },
  { n: 4, name: "Van Pals", emoji: "🚐", focus: "short a",
    words: ["he","no","do","sad","mad","bad","rat","pan","fan","van","pal","pad","rag"] },
  { n: 5, name: "Zig Zap", emoji: "⚡", focus: "short a",
    words: ["go","so","you","tap","wag","lap","tan","zap","yam","cab","ram","dab","rap","out"] },
  { n: 6, name: "Dig Dog", emoji: "🐶", focus: "short a finishes; short i and o begin",
    words: ["be","said","has","dam","nag","sap","vat","yap","sit","dog","big","dig","his","they"] },
  { n: 7, name: "Mom and Pop", emoji: "🍲", focus: "short i and o open up",
    words: ["of","mom","pop","hot","pot","top","not","got","did","him","pig","for"] },
  { n: 8, name: "Six Pins", emoji: "🎳", focus: "short i builds",
    words: ["sip","dip","tip","pin","win","hit","six","fin","bin","lip"] },
  { n: 9, name: "Fox Box", emoji: "🦊", focus: "short o builds",
    words: ["box","fox","log","hop","cot","bit","fit","pit","wig","bib"] },
  { n: 10, name: "Fix It", emoji: "🔧", focus: "short i and o finish",
    words: ["fix","job","rip","hip","lot","nod","hog","tin","rig","mop"] },
  { n: 11, name: "Red Hen", emoji: "🍞", focus: "odds and ends; short e begins",
    words: ["rob","sob","mob","cop","dim","bed","red","hen","pen","ten"] },
  { n: 12, name: "Fun Run", emoji: "🏃", focus: "short e and u",
    words: ["net","leg","wet","jet","men","bus","cup","sun","run","fun","but"] },
  { n: 13, name: "Rocket Words", emoji: "🚀", focus: "short e & u",
    words: ["mud","bug","hug","nut","tub","pet","get","let","set","cut","pup","web","bun","rug","mug","vet","tug","jug","hum","rub",
      "dug","bud","peg","met","yet","bet","keg","hem","nun","pun","jut","gut","hub"] },
  { n: 14, name: "Explorer", emoji: "🧭", focus: "all five vowels",
    words: ["yes","zip","gum","gas","kid","cub","den","dot","fed","fig","fog","gap","hid","hut","jog","kit","lid","mix","wax","yak",
      "jig","jab","jot","lab","lad","led","lit","lug","nab","pep","pod","rib","rim","rod","rot","sag","sub","sum","tab","tot",
      "wed","wit","zig","zag","fax","nix","vex","sax","cod"] },
  { n: 15, name: "Super Sounds", emoji: "🦸", focus: "sh & ch",
    words: ["ship","shop","shut","fish","dish","wish","cash","chat","chip","chop","rich","much","such","chin","shed","shin","mash","rash","chug","chum",
      "dash","sash","hush","rush","mush","chap","wash","push","bush","she","bash","gash","gush","lash","lush","posh","sham","shun"] },
  { n: 16, name: "Word Wizard", emoji: "🧙", focus: "th, wh, ck, ng + tricky words",
    words: ["thin","this","that","then","them","bath","math","with","when","whip","duck","sock","kick","back","ring","sing","king","long","song","was",
      "buck","sung","gong","lung","puck","wick","rung","muck","pack","path","sack","tack","neck","luck","tuck","peck","deck","thud","rock","lock",
      "pick","lick","wing","tick","dock","moth","hang","sang","rang","sick","fang","what","whim","wham","bang","hung","ding","ping"] },
  { n: 17, name: "Bells", emoji: "🔔", focus: "ll, ss, ff, zz + qu + silent letters",
    words: ["bell","tell","well","fell","hill","mill","doll","mess","boss","kiss","miss","loss","fuss","huff","puff","cuff","buzz","fuzz","jazz","fizz","will",
      "quiz","quit","quip","knit","knob","knot","lamb"] },
  { n: 18, name: "Chicks", emoji: "🐔", focus: "five-letter words",
    words: ["chick","check","chuck","chess","chill","shack","shock","shell","thick","whack","which","whiff","whizz","quick","quack","quill","knock","wreck","wrong","thumb","wrap",
      "wren","limb"] },
  { n: 19, name: "Tent Camp", emoji: "⛺", focus: "blends at the end",
    words: ["ant","ask","band","belt","bend","best","bolt","bond","bump","camp","cost","damp","dent","desk","dusk","end","fast","fond","gift","gulf",
      "gulp","hand","help","hint","jump","just","kept","lamp","land","last","left","lend","lift","list","mask","melt","mend","milk","mint","must",
      "nest","pond","pump","raft","rest","risk","romp","sand","sift","silk","soft","task","tent","there","think","want","went","wilt"] },
  { n: 20, name: "Twin Drums", emoji: "🥁", focus: "blends at the start",
    words: ["brag","clap","drop","drum","flag","flat","glad","grab","grin","plan","plum","slam","sled","slid","slip","snap","snug","spin","spot","stem",
      "step","stop","swam","swim","trap","trim","trip","twig","twin","black","skip","from"] },
  { n: 21, name: "Cats and Dogs", emoji: "🐾", focus: "one becomes many",
    words: ["beds","bugs","cats","cups","dogs","hats","hens","kids","lids","maps","pens","pigs","pots","tops"] },
];

/* THE SENTENCES, one list per level (SPEC section 12).
   A level's sentences are practice for the level: every word in one is a word
   the child has been taught by that level, and at least one word is NEW at it.
   That is not a claim made here — `tools/decodable.mjs` is the arbiter and it
   computed every seat below. Nothing in this list was levelled by hand, and a
   test re-derives all of it, because a sentence placed one level early is a
   guessing exercise and guessing is the habit phonics exists to prevent.

   THE LIST IS KEYED BY THE LEVEL NUMBER `LEVELS` DEFINES, so there is exactly
   one place that says which level exists. A test refuses a key that is not a
   level and a level with no sentences.

   Every text below is audio the owner graded `perfect` by ear, and every id is
   the clip that carries it. Five approved sentences are NOT here and are named
   in `docs/open-faults.md`: four run past the eight-word ceiling a four-year-old
   can hold in one breath, and one leans on "nip", a word the bank never teaches.
   They were approved as recordings, which is a different question from whether
   a child can read them. */
const SENTENCES = {
  1: [
    { id: "s:mode-b3-s03", text: "It is an ax." }, { id: "s:mode-b3-s04", text: "Is it up?" },
    { id: "s:mode-b3-s05", text: "An ax is on it." }, { id: "s:cur-l1-01", text: "I am in!" },
    { id: "s:cur-l1-02", text: "I am it!" }, { id: "s:r5-01", text: "It is I!" },
  ],
  2: [
    { id: "s:mode-b3-s01", text: "Is it an ox?" }, { id: "s:mode-b3-s02", text: "An ox is up." },
    { id: "s:mode-s01", text: "The cat sat on the mat." }, { id: "s:mode-b3-s08", text: "A man and a cat ran." },
    { id: "s:mode-wm-wm01", text: "We sat on the mat." }, { id: "s:cur-l2-01", text: "Dad ran." },
    { id: "s:cur-l2-02", text: "We sat." }, { id: "s:cur-l2-03", text: "The cat sat." },
    { id: "s:cur-l2-04", text: "My cat ran." }, { id: "s:cur-l2-05", text: "The man ran." },
  ],
  3: [
    { id: "s:mode-s06", text: "Dad had ham and jam." }, { id: "s:mode-b3-s09", text: "Dad had a nap." },
    { id: "s:mode-wm-wm03", text: "We ran to my dad." }, { id: "s:mode-wm-wm04", text: "Can we tag the cat?" },
    { id: "s:mode-wm-wm12", text: "The cat sat on me." }, { id: "s:mode-wm-wm14", text: "Tag me!" },
    { id: "s:cur-l3-01", text: "We sat and had jam." }, { id: "s:cur-l3-02", text: "Dad and I had ham." },
    { id: "s:cur-l3-03", text: "The cat had a nap." }, { id: "s:r5-02", text: "The bat had a nap." },
  ],
  4: [
    { id: "s:mode-wm-wm19", text: "Can my pal tag me?" }, { id: "s:cur-l4-01", text: "He is sad." },
    { id: "s:cur-l4-02", text: "A rat is in the van!" }, { id: "s:cur-l4-04", text: "He ran to the van." },
    { id: "s:cur-l4-05", text: "Dad is mad at the rat." }, { id: "s:r5-03", text: "The fan is on." },
    { id: "s:r5-04", text: "My pal is sad." }, { id: "s:r5-05", text: "He had a bad nap." },
    { id: "s:r5-06", text: "The rag is on the van." }, { id: "s:r6-03", text: "A rat is in the pan!" },
  ],
  5: [
    { id: "s:mode-b3-s07", text: "The cat sat on my lap." }, { id: "s:mode-wm-wm21", text: "Zap me!" },
    { id: "s:mode-wm-wm22", text: "My pal can zap me!" }, { id: "s:cur-l5-01", text: "You can go." },
    { id: "s:cur-l5-02", text: "We go up." }, { id: "s:cur-l5-03", text: "We go in the cab." },
    { id: "s:r5-07", text: "You and I can go." }, { id: "s:r5-08", text: "So it is!" },
    { id: "s:r5-09", text: "We had a yam." }, { id: "s:r5-10", text: "I can rap." },
  ],
  6: [
    { id: "s:mode-b3-s06", text: "My dad has a map." }, { id: "s:mode-wm-wm11", text: "My dad said we can nap." },
    { id: "s:mode-wm-wm02", text: "We had a big nap." }, { id: "s:mode-wm-wm15", text: "The dog ran to me." },
    { id: "s:cur-l6-01", text: "The dog is big." }, { id: "s:cur-l6-02", text: "The dog can sit." },
    { id: "s:cur-l6-03", text: "He said we can dig." }, { id: "s:cur-l6-04", text: "A big dog sat." },
    { id: "s:cur-l6-05", text: "The big dog can dig." }, { id: "s:r5-11", text: "The dog has a nap." },
  ],
  7: [
    { id: "s:mode-b2-s04", text: "My mom said you can dig." }, { id: "s:mode-b2-s13", text: "My pal has my top hat." },
    { id: "s:mode-b3-s10", text: "The dog did not sit." }, { id: "s:mode-wm-wm06", text: "We did not sit." },
    { id: "s:cur-l7-01", text: "Mom got a big pot." }, { id: "s:cur-l7-02", text: "The pig is hot." },
    { id: "s:cur-l7-03", text: "Did the dog dig?" }, { id: "s:cur-l7-04", text: "He is not sad." },
    { id: "s:cur-l7-05", text: "I got it!" }, { id: "s:r5-12", text: "The pot is hot." },
  ],
  8: [
    { id: "s:mode-wm-wm09", text: "We win!" }, { id: "s:cur-l8-01", text: "A sip of pop!" },
    { id: "s:cur-l8-02", text: "I got six." }, { id: "s:cur-l8-03", text: "He hit the top." },
    { id: "s:cur-l8-04", text: "The pin is in the bin." }, { id: "s:cur-l8-05", text: "Dip it in the jam." },
    { id: "s:r5-13", text: "Did we win?" }, { id: "s:r5-14", text: "The top is in the bin." },
    { id: "s:r5-15", text: "I had a sip." }, { id: "s:r6-04", text: "Did you win a pin?" },
  ],
  9: [
    { id: "s:mode-s08", text: "You can hop to the top." }, { id: "s:mode-b3-s11", text: "A fox ran to the log." },
    { id: "s:mode-b3-s12", text: "My mom got a big box." }, { id: "s:mode-wm-wm10", text: "We can dig a big pit." },
    { id: "s:mode-wm-wm20", text: "The fox ran up to me." }, { id: "s:cur-l9-01", text: "A fox can hop." },
    { id: "s:cur-l9-02", text: "The wig is in the box." }, { id: "s:cur-l9-03", text: "The fox sat on a log." },
    { id: "s:cur-l9-04", text: "We fit in the box!" }, { id: "s:cur-l9-05", text: "The bib is on him." },
  ],
  10: [
    { id: "s:cur-l10-01", text: "Dad can fix it." }, { id: "s:cur-l10-02", text: "We did a big job." },
    { id: "s:cur-l10-03", text: "My cap got a rip." }, { id: "s:cur-l10-04", text: "The hog is in the pit." },
    { id: "s:cur-l10-05", text: "Mop it up!" }, { id: "s:r5-16", text: "I can mop a lot." },
    { id: "s:r5-17", text: "Did the hog nod?" }, { id: "s:r5-18", text: "Fix the rip in it." },
    { id: "s:r5-19", text: "The tin is in the bin." }, { id: "s:r5-20", text: "A big rig!" },
  ],
  11: [
    { id: "s:mode-s03", text: "The hen is in the pen." }, { id: "s:cur-l11-01", text: "I go to bed." },
    { id: "s:cur-l11-02", text: "The hen is red." }, { id: "s:cur-l11-03", text: "I am ten!" },
    { id: "s:cur-l11-04", text: "The red hen sat on my bed." }, { id: "s:cur-l11-05", text: "We go to bed at ten." },
    { id: "s:r5-21", text: "I am in bed." }, { id: "s:r5-22", text: "A cop has a job." },
    { id: "s:r5-23", text: "Ten in the bed!" }, { id: "s:r5-24", text: "The red pen is in the tin." },
  ],
  12: [
    { id: "s:mode-s02", text: "My dog can run." }, { id: "s:mode-s05", text: "The pig sat in the sun." },
    { id: "s:mode-s07", text: "The sun is hot." }, { id: "s:mode-wm-wm23", text: "Tag me and we can run." },
    { id: "s:cur-l12-01", text: "The sun is up." }, { id: "s:cur-l12-02", text: "We run in the sun." },
    { id: "s:cur-l12-03", text: "The bus is big and red." }, { id: "s:cur-l12-04", text: "Fun in the sun!" },
    { id: "s:cur-l12-05", text: "My leg is wet." }, { id: "s:cur-l12-06", text: "The men got on the bus." },
  ],
  13: [
    { id: "s:mode-s04", text: "You can dig in the mud." }, { id: "s:mode-s12", text: "Can you get the box?" },
    { id: "s:mode-b2-s02", text: "Can you get my red cap?" }, { id: "s:mode-b2-s07", text: "The bug ran up my leg." },
    { id: "s:mode-b2-s14", text: "The cat had the nap on my rug." }, { id: "s:mode-b2-s18", text: "The van is in the mud." },
    { id: "s:r5-25", text: "The pup dug in the mud." }, { id: "s:r5-26", text: "A bug is on the web." },
    { id: "s:r5-27", text: "I get a hug." }, { id: "s:r6-05", text: "I hum to my pup." },
  ],
  14: [
    { id: "s:mode-s10", text: "Mom said yes to you." }, { id: "s:mode-s16", text: "The kid can zip and run." },
    { id: "s:mode-b3-s13", text: "The kid fed a cub." }, { id: "s:mode-b3-s14", text: "My pal hid the lid." },
    { id: "s:mode-b3-s15", text: "My pal had gum and a fig." }, { id: "s:mode-wm-wm07", text: "We hid in the box." },
    { id: "s:mode-wm-wm08", text: "We got a fig and a yam." }, { id: "s:mode-wm-wm17", text: "My pal hid the map on me." },
    { id: "s:r5-28", text: "The cub is in the den." }, { id: "s:r5-29", text: "We jog in the fog." },
  ],
  15: [
    { id: "s:mode-s09", text: "The fish is in the net." }, { id: "s:mode-b2-s05", text: "The fish is in the big dish." },
    { id: "s:mode-b2-s10", text: "Dad has the job in the shop." }, { id: "s:mode-b3-s16", text: "My chum can wash the dish." },
    { id: "s:mode-b3-s17", text: "The shop had a red cap." }, { id: "s:r5-30", text: "The fish is on the dish." },
    { id: "s:r5-31", text: "I wish I had a ship." }, { id: "s:r5-32", text: "Hush! The pup is in bed." },
    { id: "s:r6-01", text: "We got fish at the shop." }, { id: "s:r6-06", text: "Mom can chop and mash." },
  ],
  16: [
    { id: "s:mode-s11", text: "The duck is wet." }, { id: "s:mode-s13", text: "The king can sing." },
    { id: "s:mode-s14", text: "This bug is big." }, { id: "s:mode-s15", text: "That cup is red." },
    { id: "s:mode-s17", text: "Dad can pack the bag." }, { id: "s:mode-s18", text: "The moth is on the rock." },
    { id: "s:mode-s19", text: "When can you nap?" }, { id: "s:mode-b2-s06", text: "That thin man has the long chin." },
    { id: "s:mode-b2-s11", text: "The wet duck sat on the rock." }, { id: "s:mode-b2-s12", text: "Can the kid pick up the box?" },
    { id: "s:mode-b2-s17", text: "You can wash the dish with my mom." }, { id: "s:mode-b2-s19", text: "What did you get in the bag?" },
  ],
  17: [
    { id: "s:mode-s20", text: "The doll is on the bed." }, { id: "s:mode-b2-s01", text: "The big dog ran up the hill." },
    { id: "s:mode-b2-s08", text: "You did not miss the bus." }, { id: "s:mode-b2-s09", text: "The king said yes to the quiz." },
    { id: "s:mode-b3-s18", text: "My doll fell on the hill." }, { id: "s:mode-b3-s19", text: "My pal can quiz us." },
    { id: "s:r5-33", text: "My doll fell in the mud." }, { id: "s:r5-34", text: "What a mess!" },
    { id: "s:r5-35", text: "A bug can buzz and hum." }, { id: "s:r6-02", text: "I can tell you a lot." },
  ],
  18: [
    { id: "s:mode-b2-s03", text: "The chick is in the shed." }, { id: "s:mode-b2-s20", text: "The moth is on the shell." },
    { id: "s:mode-b3-s20", text: "The chick is on my thumb." }, { id: "s:mode-b3-s21", text: "A duck can quack." },
    { id: "s:mode-b3-s22", text: "Check the thick shell." }, { id: "s:r5-36", text: "Quick! Get on the bus." },
    { id: "s:r5-37", text: "The shell is thick." }, { id: "s:r5-38", text: "Can you win at chess?" },
    { id: "s:r5-39", text: "I hid in the shack." }, { id: "s:r6-07", text: "We knock on the shed." },
  ],
  19: [
    { id: "s:mode-b3-s23", text: "The gift is in my hand." }, { id: "s:mode-b3-s24", text: "The tent is in the sand." },
    { id: "s:mode-b3-s25", text: "My milk is on the desk." }, { id: "s:mode-b3-s26", text: "Lift the lamp to the desk." },
    { id: "s:mode-b3-s27", text: "The best nest is soft." }, { id: "s:r5-40", text: "An ant is on my hand." },
    { id: "s:r5-41", text: "We set up camp at the pond." }, { id: "s:r5-42", text: "I can help you pack." },
    { id: "s:r5-43", text: "Jump in the sand!" }, { id: "s:r5-44", text: "The lamp is on the desk." },
  ],
  20: [
    { id: "s:mode-b3-s28", text: "My twin can swim fast." }, { id: "s:mode-b3-s29", text: "The sled is on the flat sand." },
    { id: "s:mode-b3-s30", text: "Stop and grab my hand." }, { id: "s:mode-b3-s31", text: "The pup is snug in my lap." },
    { id: "s:r5-45", text: "I am so glad!" }, { id: "s:r5-46", text: "Do not slip on the step." },
    { id: "s:r5-47", text: "The pig swam in the mud." }, { id: "s:r5-48", text: "Stop at the spot." },
    { id: "s:r5-49", text: "We drum and clap and spin." }, { id: "s:r6-08", text: "We grin and clap." },
  ],
  21: [
    { id: "s:r7-01", text: "The kids grab the cups." }, { id: "s:r7-02", text: "The dogs dig in the sand." },
    { id: "s:r7-03", text: "The kids get red hats." }, { id: "s:r7-04", text: "The lids fit on the pots." },
    { id: "s:r7-05", text: "Six hens sat in the mud." }, { id: "s:r7-06", text: "The bugs hop on the pots." },
    { id: "s:r7-07", text: "The pigs dig in the mud." }, { id: "s:r7-08", text: "The maps rest on the desk." },
    { id: "s:r7-09", text: "The dogs run to the pond to swim." }, { id: "s:r7-10", text: "The kids grab the cups and the pens." },
    { id: "s:r7-11", text: "The bugs hop on the pots and lids." }, { id: "s:r7-12", text: "Pigs and hens romp in the wet mud." },
  ],
};

const TRICKY = {
  was: "Tricky word! The a sounds like \u201Cuh\u201D \u2014 wuz.",
  is: "Tricky word! The s sounds like \u201Cz\u201D \u2014 iz.",
  has: "Tricky word! The s sounds like \u201Cz\u201D \u2014 haz.",
  wash: "Tricky word! The a sounds like \u201Co\u201D \u2014 wosh.",
  push: "Tricky word! The u sounds like \u201Coo\u201D \u2014 poosh.",
  bush: "Tricky word! The u sounds like \u201Coo\u201D \u2014 boosh.",
  she: "Tricky word! The e sounds like \u201Cee\u201D \u2014 shee.",
  the: "Tricky word! The e sounds like \u201Cuh\u201D \u2014 thuh.",
  what: "Tricky word! The a sounds like \u201Cuh\u201D \u2014 wut.",
  /* THE HEART-WORD NOTES (open-faults J1, owner-approved 2026-08-15). Ruled
     2026-08-13 after a parent's report \u2014 "the letter a is handled terribly":
     when a word bends a tile away from that letter's usual sound, the reveal
     says so in child-facing words. The nine notes above were the owner's own
     shipped pattern; these fourteen extend it to every heart word that bends.
     Two shapes inside one format, chosen by the owner from a decision page:
     long vowels say "says its name" \u2014 the kitchen-table phrase, and exactly
     true \u2014 and the rest keep the sounds-like respelling. "and" bends nothing
     and stays noteless; the five buzzy-th words stay out because th is a
     two-sound unit where the WORD decides (SPEC section 5), not a letter bent
     from its usual sound. Shown only: S4 governs speech and none of these is
     spoken \u2014 a spoken layer is a recorded idea, not a promise. */
  to: "Tricky word! The o sounds like \u201Coo\u201D \u2014 too.",
  do: "Tricky word! The o sounds like \u201Coo\u201D \u2014 doo.",
  you: "Tricky word! The ou sounds like \u201Coo\u201D \u2014 yoo.",
  they: "Tricky word! The ey sounds like “ay” — thay.",
  for: "Tricky word! The or says “or” — for.",
  out: "Tricky word! The ou shouts “ow” — owt.",
  there: "Tricky word! The ere sounds like “air” — thair.",
  said: "Tricky word! The ai sounds like \u201Ceh\u201D \u2014 sed.",
  my: "Tricky word! The y says a letter name \u2014 \u201Ceye\u201D.",
  of: "Tricky word! The o sounds like \u201Cuh\u201D and the f sounds like \u201Cv\u201D \u2014 uv.",
  a: "Tricky word! On its own, a says a lazy \u201Cuh\u201D.",
  we: "Tricky word! The e says its name \u2014 wee.",
  me: "Tricky word! The e says its name \u2014 mee.",
  he: "Tricky word! The e says its name \u2014 hee.",
  be: "Tricky word! The e says its name \u2014 bee.",
  go: "Tricky word! The o says its name \u2014 go.",
  no: "Tricky word! The o says its name \u2014 no.",
  so: "Tricky word! The o says its name \u2014 so.",
  /* The word i joined the bank in round four, 2026-08-15 \u2014 the first word
     added since the curriculum was approved. Same shape as the long vowels
     above; the word IS the letter's name, which is why it is a heart. */
  i: "Tricky word! The i says its name \u2014 I.",
};
/* One tile per unit (S8). Beyond the six spoken digraphs: qu says kw, the
   silent-letter pairs kn wr mb say their surviving letter, and the doubled
   endings ll ss ff zz say their single. Owner-approved 2026-08-04 with
   Levels 8 and 9; ph was considered and left out - no word obeys the bank's
   own rules. */
/* Safety rule S8: a multi-letter unit is ONE tile. "ai" and "ou" joined on
   2026-08-12, owner-approved by ear: they are what makes "said" and "you"
   readable as three tiles and two rather than four and three. The tiles have
   to tell the truth, and s-a-i-d says a word the child will never hear.
   Verified before the rule changed: NO word in the bank contains ai or ou, so
   nothing already shipped re-tiles underneath this. */
/* "ey" and "or" joined on 2026-08-17 by the same ruling shape — "Both units
   join S8, tiling only" — and "ere" rode in with there's seat description on
   the same page (th-ere was the tiling the owner approved the seat under).
   Without them they tiles t-h-e-y, for grows a phantom silent r, and there
   needs silent-tile machinery that does not exist. Verified again before the
   rule changed: across all 476 words, ey appears only in they, or only in
   for, and ere only in there — nothing re-tiles underneath. Like ai and ou,
   ey and ere have no ruled default sound — every word using one bends it per
   word, ai-style. or is different in kind: d:or ships as its true sound (the
   owner graded it in the sound rounds), and it says the same thing wherever
   it appears, so it carries a real default like sh or ch — still never
   TAUGHT as a code level, which is what the tiling-only ruling protects. */
/* THE EXTENDED CODE, 2026-08-19. Until today this list held nineteen units and
   the chunker could not see the rest of English: "see" tiled as s-e-e, "boat"
   as b-o-a-t, "night" as n-i-g-h-t. That is the redesign's own blocker
   (docs/redesign-plan.md) — a word whose vowel team is invisible is a word the
   ladder seats at the level of its first letter, and levels 57 to 100 teach
   nothing else.

   THE ROSTER IS NOT INVENTED HERE. Every unit below is read off
   tools/ladder/shape-v3.json — the `new` field of the 100-level pathway the
   owner ruled on 2026-08-17 (SPEC 12a). That file says which spellings this
   game teaches and at which level, so it is the authority on what a unit IS;
   guessing a roster from memory beside it would be a second, disagreeing map
   one directory from the right one, which is the fault F2 already records.
   Nothing in the shape is left out and nothing not in the shape is added: the
   nineteen units that were already here all appear in it.

   WHAT THIS DOES NOT DO. It does not change one tile a child sees today.
   Measured before the edit, over all 476 words a child can meet — the whole
   bank plus every word of every shipped sentence — ZERO re-tile. That is the
   same verification ai and ou were held to on 2026-08-12 and ey, or and ere on
   2026-08-17, and it is the reason this is an engine change and not an S8
   ruling: the wider roster is latent until the 100-level bank lands.

   SPLIT VOWELS (a_e i_e o_e u_e e_e) ARE DELIBERATELY ABSENT. They are
   discontinuous — the a of "cake" and its silent e are one grapheme with a k
   in between — and this chunker's output IS the tile row and IS the dashed
   text a child reads (S5). A discontinuous unit cannot round-trip (property
   P1), so emitting ["c","a_e","k"] would print "c-a_e-k" to a child and put
   the tiles in an order the printed word does not have. That is a child-facing
   change and S8 owns it, so it is the owner's ruling and not this file's.
   tools/ladder-fill.mjs already models split vowels for LEVEL arithmetic,
   where nothing has to round-trip, and that is where the ladder reads them. */
const TRIGRAPHS = ["ere","air","are","dge","ear","eer","igh","ore","tch","tle"];
const DIGRAPHS = ["sh","ch","th","wh","ck","ng","qu","kn","wr","mb","ll","ss","ff","zz","ai","ou","ey","or",
  "al","ar","au","aw","ay","bb","cc","ce","ci","dd","ea","ee","er","ew","ge","gg","gh","gn","ie","ir","le",
  "mm","nn","oa","oe","oi","oo","ow","oy","ph","pp","re","rr","se","ti","tt","tu","ue","ur","ve","ze"];
const QUADGRAPHS = ["augh","eigh","ough"];
/* WHERE A UNIT MAY MATCH, and every rule here is an orthographic fact rather
   than a preference. Greedy longest-match is the right instinct — it prefers
   ch to c+h — but a handful of the shape's units are syllable ENDINGS, and
   unconstrained they swallow the front of ordinary words. Measured against
   today's bank before the rules were written: "leg" reads le+g, "get" ge+t,
   "set" se+t, "vet" ve+t, "red" re+d, "tin" ti+n, "tub" tu+b and "pal" p+al.
   Eighteen live bank words, every one of them wrong, and the rules below take
   that to zero.

   These are lifted VERBATIM from tools/ladder-fill.mjs, which has carried them
   with controls since the fill pass. Two models of the same code that drift
   apart is a fault this project has already paid for twice (F2), so the rules
   are copied exactly rather than re-reasoned: mb says /m/ only at the end of a
   word, kn wr and gn only at the start, tu is /ch/ only in -ture, ti and ci
   are /sh/ only before the endings that make them so, and al is /aw/ only
   before l or k. Applying them to mb, kn and wr TIGHTENS three units that
   already shipped; measured, no bank word moves, because no bank word has a
   medial mb or a late kn. */
const FINAL_ONLY = ["ce","ge","se","ve","ze","le","tle","re","mb"];
const START_ONLY = ["kn","wr","gn"];
const TI_FOLLOWERS = ["on","ous","al","ent","en"];
function unitOk(g, w, p) {
  const end = p + g.length, rest = w.slice(end);
  if (FINAL_ONLY.includes(g)) return end === w.length;
  if (START_ONLY.includes(g)) return p === 0 || end === w.length;
  if (g === "tu") return rest === "re";
  if (g === "ti" || g === "ci") return TI_FOLLOWERS.some((t) => rest.startsWith(t));
  if (g === "al") return rest.startsWith("l") || rest.startsWith("k");
  return true;
}
/* The microphone is gone (owner-ruled 2026-08-11, safety; removed 2026-08-12), and
   three things went with it because it was the only reason each existed.
   HOMOPHONES was a 31-word near-miss table read by nothing but the transcript
   matcher. ADULT_JUDGED named five words a recogniser could not judge fairly,
   and adultNote() told a grown-up so. SPEC section 6 already ruled that the
   note 'belongs to microphone mode only' and is absent when the adult judges
   every word — which is now every word, always, so the SPEC's own rule deletes
   it. Kept only if a reason survived the recogniser; none did. */
const INTERVALS = [1, 1, 2, 4, 7, 12];
const SESSION_SIZE = 20;
const PROMPT_CAP = 26;
const ADVANCE_GUARD_MS = 400;   // P0-3
const SPLASH_TIMEOUT_MS = 3000; // P2-6
const STORE_KEY = "wordquest:progress:v2";

/* P0-5 — every value below measured against its background at ≥4.5:1 */
const C = {
  ink:     "#17356b",
  ink2:    "#3e5aa6",   // 6.53:1 on white
  muted:   "#5a6ba8",   // 5.12:1 on white
  strip:   "#455073",   // 7.93:1 on white
  action:  "#c9402f",   // 4.93:1 with white
  green:   "#0f7a4f",   // 5.36:1 with white
  amber:   "#8a5a00",   // amber text/fill, dark enough for white
  amberInk:"#6b4600",   // amber TEXT on the gradient: 4.9:1 on the worst stop
  red:     "#c8342f",   // 5.27:1 with white
  purple:  "#6b4bbf",   // 6.21:1 with white
  sun:     "#ffd166",   // navy on it = 8.28:1
  chip:    "#e8ecf7",
  line:    "#dfe5f3",
};

const LANGS = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-CA", label: "English (CA)" },
  { code: "en-AU", label: "English (AU)" },
];

const WORD_LEVEL = {};
LEVELS.forEach(L => L.words.forEach(w => { WORD_LEVEL[w] = L.n; }));

/* ---------- phonics ---------- */
/* Longest match first, and a unit that matches the LETTERS but fails its
   position rule falls through to the next length down rather than to a
   letter — so "leg" is l-e-g and not l+e+g by way of a refused le. */
function chunkWord(word) {
  const out = []; let i = 0;
  while (i < word.length) {
    const four = word.slice(i, i + 4);
    const three = word.slice(i, i + 3);
    const two = word.slice(i, i + 2);
    if (QUADGRAPHS.includes(four) && unitOk(four, word, i)) { out.push(four); i += 4; }
    else if (TRIGRAPHS.includes(three) && unitOk(three, word, i)) { out.push(three); i += 3; }
    else if (DIGRAPHS.includes(two) && unitOk(two, word, i)) { out.push(two); i += 2; }
    else { out.push(word[i]); i += 1; }
  }
  return out;
}
const dashed = (w) => chunkWord(w).join("-");

/* ---------- SRS ---------- */
const freshWordState = () => ({ box: 0, attempts: 0, correct: 0, close: 0, wrong: 0, dueAt: 1, lastSession: 0 });

function applyResult(ws, result, sessionNumber) {
  /* THE FIRST CORRECT, NOT THE FIRST ATTEMPT. This was ws.attempts === 0, so a
     single "close" on a word's first meeting burned the fast track for good:
     the child then needed FOUR correct readings to master that word instead of
     two, and a "wrong" cost five. A parent reported it on 2026-08-13 from real
     data - the child had read "am" and "us" correctly twice each and the mastery
     map still showed them as not learned - and SPEC section 5 has always said a
     close is an invitation to try again and never a failure. It cannot be a
     failure in the words and a two-reading penalty in the arithmetic. */
  const firstCorrect = ws.correct === 0;
  ws.attempts += 1; ws.lastSession = sessionNumber;
  if (result === "correct") { ws.correct += 1; ws.box = firstCorrect ? 3 : Math.min(5, ws.box + 1); }
  else if (result === "close") { ws.close += 1; ws.box = Math.max(1, ws.box); }
  else { ws.wrong += 1; ws.box = Math.max(0, ws.box - 2); }
  ws.dueAt = sessionNumber + INTERVALS[ws.box];
  return ws;
}

/* `rand` is a parameter with the old behaviour as its default: Build-it's tray
   must be reproducible in a test, and a shuffle that reaches for Math.random
   itself cannot be held still. Every existing caller is unchanged. */
function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function buildSession(state) {
  const sNum = state.sessionsCompleted + 1, level = state.level, picked = new Set();
  const take = (arr, k) => { const got = []; for (const w of arr) { if (got.length >= k) break; if (!picked.has(w)) { picked.add(w); got.push(w); } } return got; };
  const entries = Object.entries(state.words);
  const dueBelow = entries.filter(([w, ws]) => ws.attempts > 0 && ws.dueAt <= sNum && ws.box < 5 && WORD_LEVEL[w] < level)
    .sort((a, b) => a[1].box - b[1].box || a[1].dueAt - b[1].dueAt).map(([w]) => w);
  const confidence = shuffle(entries.filter(([w, ws]) => ws.box >= 4 && WORD_LEVEL[w] <= level).map(([w]) => w));
  const curDue = entries.filter(([w, ws]) => ws.attempts > 0 && ws.dueAt <= sNum && ws.box < 5 && WORD_LEVEL[w] === level)
    .sort((a, b) => a[1].box - b[1].box).map(([w]) => w);
  /* A3-002 — review is not capped by the child's level. A word the app has
     graded can come back whatever level it belongs to. A next-level word served
     by the peek below used to fall outside every selector here, so it was read
     once and then parked for good: a Level 1 child who read nothing correctly
     collected all 39 Level 2 words that way, and none of the 39 was ever served
     again. Two slots at most, so the child's own level still IS the session,
     and one level ahead at most, which the peek is the only source of: nothing
     further ahead is ever served, whatever a save happens to hold.
     Found by an audit of the running build, 2026-07-29. */
  const dueAbove = entries.filter(([w, ws]) => ws.attempts > 0 && ws.dueAt <= sNum && ws.box < 5 && WORD_LEVEL[w] === level + 1)
    .sort((a, b) => a[1].box - b[1].box || a[1].dueAt - b[1].dueAt).map(([w]) => w);
  const freshCur = LEVELS[level - 1].words.filter(w => !state.words[w] || state.words[w].attempts === 0);
  /* A3-002 — the peek needs evidence of learning, not evidence of exposure.
     A box of 2 or more means the word has been read correctly at least once
     and not since forgotten twice: the box only ever rises on a correct
     reading, and a first correct reading sets it to 3. The share matches the
     promotion rule, one box lower. */
  const curLevelWords = LEVELS[level - 1].words;
  const learned = curLevelWords.filter(w => state.words[w] && state.words[w].box >= 2).length / curLevelWords.length >= 0.8;
  const list = [];
  list.push(...take(dueBelow, 5));
  if (state.sessionsCompleted >= 2) list.push(...take(confidence, 2));
  list.push(...take(dueAbove, 2));
  list.push(...take(curDue, SESSION_SIZE - list.length));
  list.push(...take(freshCur, SESSION_SIZE - list.length));
  if (list.length < SESSION_SIZE) {
    /* The top-up lane draws from the CHILD'S OWN LEVEL only (narrowed
       2026-08-15): as `<= level` it was invisible beside fifty fresh words
       and became a hole beside ten — refilling past the five-review cap and
       through the confidence lane's monopoly on mastered words. A session
       with nothing eligible runs short, as the first session always has. */
    const anyCur = entries.filter(([w, ws]) => WORD_LEVEL[w] === level).sort((a, b) => a[1].box - b[1].box).map(([w]) => w);
    list.push(...take(anyCur, SESSION_SIZE - list.length));
  }
  if (list.length < SESSION_SIZE && level < LEVELS.length && freshCur.length === 0 && learned) {
    // D2: next-level peek only after every current-level word has been seen
    // A3-002: and only once 80 percent of this level has been read correctly
    const peek = LEVELS[level].words.filter(w => !state.words[w] || state.words[w].attempts === 0);
    list.push(...take(peek, SESSION_SIZE - list.length));
  }
  const q = shuffle(list);
  let best = 0;
  q.forEach((w, i) => {
    const b = state.words[w] ? state.words[w].box : 0, bb = state.words[q[best]] ? state.words[q[best]].box : 0;
    if (b > bb) best = i;
  });
  if (best > 0) { const [w] = q.splice(best, 1); q.unshift(w); }
  return q;
}

/* HOW OFTEN A SENTENCE ARRIVES. SPEC section 12 point 2 rules that a session
   mixes words and sentences THROUGHOUT — "not words first and sentences at the
   end" — so that a child who is tiring does not meet every sentence at once.
   It does not fix the interval; five items is this build's reading of "every
   few", which puts three sentences in a twenty-item session, and it is the one
   number here the owner may want to move. */
const SENTENCE_EVERY = 5;

/* WHERE THE SENTENCES FALL IN A SESSION, and WHICH ones.

   This returns a PLAN, not a queue. `buildSession` still returns words and
   nothing else, which is deliberate: a sentence is never scheduled, never
   enters a Leitner box and never gates promotion (SPEC section 12 points 3 and
   4), so putting one into the queue the boxes are computed from would be the
   fastest way to break all three of those rules at once. The plan says only
   "after the child finishes item N, show this sentence".

   `after` is a 1-based COUNT of words read, so `after: 5` means the sentence
   comes when five words are done. Nothing is planned after the last item: the
   session is over, and a sentence a child never reaches is worse than one that
   was never planned, because the log will say it was shown.

   No sentence repeats inside one session. A level with fewer sentences than
   slots gets fewer sentences, never the same one twice — Level 11 ships four
   and would otherwise show one of them twice in a twenty-item session. */
function sessionSentences(level, size = SESSION_SIZE) {
  const pool = SENTENCES[level] || [];
  const slots = [];
  for (let n = SENTENCE_EVERY; n < size; n += SENTENCE_EVERY) slots.push(n);
  return shuffle(pool).slice(0, slots.length).map((s, i) => ({ after: slots[i], ...s }));
}

/* Two paths to promotion (SPEC §"Promotion"): 80 percent of the level at
   box 3+, or a streak of two perfect completed sessions. `session` is
   { partial, perfect } from the session that just ended. Without a session
   the box rule alone decides — a stored streak never promotes on its own.
   A partial session never changes the streak; any promotion resets it; the
   stored streak caps at 2, so nothing banks up at the top level. */
/* THE PROMOTION THRESHOLD, as its own function so its BOUNDARY can be tested.
   The rule is "80 per cent or more", and the difference between that and "more
   than 80 per cent" only shows up when the ratio is EXACTLY 0.8 — which needs
   a level whose size is a multiple of five. Level 5 was the only one, at 50
   words, and it stopped being one on 2026-08-13 when the owner ruled "gob"
   out. The mutation gate caught it within the hour: with no test able to reach
   the boundary, ">=" could quietly become ">" and nothing in the suite would
   notice, and a child would be held at a level they had earned.

   Taking the comparison out of the bank's arithmetic makes the boundary
   reachable with synthetic numbers forever, whatever the levels grow into. */
const isSecure = (solid, total) => total > 0 && solid / total >= 0.8;

function checkPromotion(state, session) {
  const prior = typeof state.perfectStreak === "number" && isFinite(state.perfectStreak) && state.perfectStreak > 0
    ? Math.min(2, Math.round(state.perfectStreak)) : 0;
  if (session && session.partial) return false;
  if (session) state.perfectStreak = session.perfect ? Math.min(2, prior + 1) : 0;
  if (state.level >= LEVELS.length) return false;
  const words = LEVELS[state.level - 1].words;
  const secure = isSecure(words.filter(w => state.words[w] && state.words[w].box >= 3).length, words.length);
  if (secure || (session && state.perfectStreak >= 2)) { state.level += 1; state.perfectStreak = 0; return true; }
  return false;
}

/* ---------- storage ---------- */
const mem = {};
async function loadState() {
  try {
    if (typeof window !== "undefined" && window.storage) {
      const r = await window.storage.get(STORE_KEY);
      if (r && r.value) {
        try { return JSON.parse(r.value); }
        catch (e) {
          // F1 — keep the damaged blob for recovery instead of overwriting it
          try { await window.storage.set(STORE_KEY + ":corrupt", r.value); } catch (e2) {}
          return { __corrupt: true };
        }
      }
    }
  } catch (e) {}
  try { return mem[STORE_KEY] ? JSON.parse(mem[STORE_KEY]) : null; } catch (e) { return null; }
}
async function saveState(s) {
  const b = JSON.stringify(s); mem[STORE_KEY] = b;
  try { if (typeof window !== "undefined" && window.storage) { await window.storage.set(STORE_KEY, b); return true; } } catch (e) {}
  return false;
}
/* F7 — guarantee the document shape. Valid JSON is not a valid save. */
/* One healer for any box dictionary: words and pre-items carry the same
   shape, so they take the same repairs. */
function healBoxes(dict) {
  for (const [w, ws] of Object.entries(dict)) {
    if (!ws || typeof ws !== "object" || typeof ws.box !== "number" || !isFinite(ws.box)) { delete dict[w]; continue; }
    ws.box = Math.min(5, Math.max(0, Math.round(ws.box)));
    for (const k of ["attempts", "correct", "close", "wrong", "dueAt", "lastSession"])
      if (typeof ws[k] !== "number" || !isFinite(ws[k])) ws[k] = 0;
  }
}
function healWords(s) {
  if (!s.words || typeof s.words !== "object" || Array.isArray(s.words)) s.words = {};
  healBoxes(s.words);
  if (!s.pre || typeof s.pre !== "object" || Array.isArray(s.pre)) s.pre = {};
  healBoxes(s.pre);
  // a hostile or negative preLevel reads as absent; migrate recovers it
  if (typeof s.preLevel !== "number" || !isFinite(s.preLevel) || s.preLevel < 0) delete s.preLevel;
  else s.preLevel = Math.round(s.preLevel);
}
function healLog(s) {
  if (!Array.isArray(s.log)) s.log = [];
  // repair the rows too — a hostile log row must not crash migrate or the export
  s.log = s.log.filter(r => r && typeof r === "object" && !Array.isArray(r));
  for (const r of s.log) {
    r.items = Array.isArray(r.items) ? r.items.filter(i => i && typeof i === "object") : [];
    if (typeof r.level !== "number" || !isFinite(r.level)) r.level = 0;
  }
}
function healSettings(s) {
  if (!s.settings || typeof s.settings !== "object" || Array.isArray(s.settings)) s.settings = {};
  const d = newState().settings;
  for (const k of Object.keys(d)) if (s.settings[k] === undefined) s.settings[k] = d[k];
  /* Types, not just presence. A hostile document once carried a NUMBER as the
     child's name; it survived migrate and crashed the settings screen on the
     first .trim(). Every setting is healed to the type the app expects. */
  if (typeof s.settings.childName !== "string") s.settings.childName = String(s.settings.childName ?? "").slice(0, 20);
  if (typeof s.settings.sound !== "boolean") s.settings.sound = d.sound;
  if (typeof s.settings.lang !== "string" || !s.settings.lang) s.settings.lang = d.lang;
}
/* Both streaks take the same repair: absent, hostile or negative reads as
   zero, anything real rounds and caps at two. */
function healStreak(s, key) {
  const v = s[key];
  if (typeof v !== "number" || !isFinite(v) || v < 0) s[key] = 0;
  else s[key] = Math.min(2, Math.round(v));
}
function heal(s) {
  if (!s || typeof s !== "object") s = {};
  healWords(s); healLog(s); healSettings(s);
  if (typeof s.sessionsCompleted !== "number" || !isFinite(s.sessionsCompleted) || s.sessionsCompleted < 0) s.sessionsCompleted = 0;
  healStreak(s, "perfectStreak"); healStreak(s, "prePerfectStreak");
  // a non-numeric level reads as absent; a fractional one is rounded — migrate clamps the range
  if (typeof s.level !== "number" || !isFinite(s.level)) delete s.level; else s.level = Math.round(s.level);
  // a version that is not a number reads as absent — a hostile value must not crash the migration check
  if (typeof s.version !== "number" || !isFinite(s.version)) delete s.version;
  return s;
}

/* Save migrations, one block per version, each idempotent.
   v3: version-2 saves shift up one level (the VC level inserted at 1).
   v4: the 10-and-10 curriculum (owner-approved 2026-08-15) re-cut the levels,
   so a stored index points at a different place than the one the child earned.
   The owner's ruling for this exact case — decision 5 of the curriculum page —
   was "compute the new level from the child's own words", and the boxes are
   those words: the new level is the FIRST whose words are not yet secure,
   judged by the same isSecure rule promotion uses. The boxes carry only one
   of promotion's two paths, so the recompute is FLOORED by the stored level's
   mapped position (the block below says why); a child secure everywhere lands
   on the last level; a fresh save walks to Level 1 untouched. Log rows keep
   their old level numbers: the log is a record of what happened, and the
   number it recorded was true when it was written. */
/* Save migrations, one function per version so each stays under the G6
   complexity ceiling and reads alone. migrate() is the driver. */
function migrateV3(s) {
  if (!s.version || s.version < 3) {
    s.level = (s.level || 1) + 1;
    (s.log || []).forEach(r => { r.level += 1; });
    s.version = 3;
  }
}
function migrateV4(s) {
  if (s.version >= 4) return;
  let lvl = LEVELS.length;
  for (let i = 0; i < LEVELS.length; i++) {
    const ws = LEVELS[i].words;
    if (!isSecure(ws.filter(w => s.words[w] && s.words[w].box >= 3).length, ws.length)) { lvl = i + 1; break; }
  }
  /* THE FLOOR: promotion has TWO paths — boxes, or two perfect sessions —
     and a parent can set a level by hand. The box recompute alone sent
     both kinds back to 1 (build reviewer, 2026-08-15). A migration never
     seats a child below a level they held: the stored level maps to where
     its OLD stage now begins (old 3, short i/o, at new 6; old 4 at 11;
     old 5-11 whole as 14-20) and the child keeps whichever is higher. */
  const OLD_TO_NEW = [1, 2, 6, 11, 14, 15, 16, 17, 18, 19, 20];
  const stored = Math.min(Math.max(1, Math.round(s.level || 1)), OLD_TO_NEW.length);
  s.level = Math.max(lvl, OLD_TO_NEW[stored - 1]);
  /* open-faults J2: settings.mode carried "mic" in every save laid down
     before the microphone was removed (owner safety ruling, 2026-08-11).
     Nothing reads it; v4 is the door it leaves through. */
  if (s.settings && s.settings.mode !== undefined) delete s.settings.mode;
  s.version = 4;
}
function migrateV5(s) {
  if (s.version >= 5) return;
  /* v5, the pre-level ladder (owner-ruled 2026-08-15): a fresh save starts
     at Pre 1. Reading history is ANY of: a graded word, a completed session,
     a kept log row, or a level someone set above the start — each one proves
     the ladder's skill or a grown-up's intent, and none of them may be
     demoted into letter drills (the auditor asked what counts; this is the
     answer, and the tests pin each arm). */
  if (typeof s.preLevel !== "number")
    s.preLevel = (Object.keys(s.words).length > 0 || s.sessionsCompleted > 0
      || (s.log || []).length > 0 || (s.level || 1) > 1) ? 0 : 1;
  s.version = 5;
}
/* A corrupted preLevel on an already-v5 save fails TOWARD teaching, never
   past it (the auditor proved the old clamp graduated a mid-ladder child):
   ladder evidence in the boxes lands at the first unsecure rung — the same
   walk the v4 level recompute does — and only a save with no ladder marks
   falls back to the history rule. */
function recoverPreLevel(s) {
  /* READER EVIDENCE FIRST (the auditor's last find): a child moved to words
     by the grown-up's jump keeps their old ladder marks forever, and marks
     checked first would demote that reader to sound drills. Words, log rows
     and a raised level are things the ladder never writes, so they are the
     reader's proof; sessionsCompleted is NOT among them, because the ladder
     rides the same session clock. */
  if (Object.keys(s.words).length > 0 || (s.log || []).length > 0 || (s.level || 1) > 1) return 0;
  if (Object.keys(s.pre).length > 0) {
    for (const p of PRE_LEVELS) {
      const solid = p.items.filter((k) => s.pre[k] && s.pre[k].box >= 3).length;
      if (!isSecure(solid, p.items.length)) return p.n;
    }
    return 0;   // every rung secure: a finished ladder is the one safe graduation
  }
  return s.sessionsCompleted > 0 ? 0 : 1;
}
function migrate(s) {
  s = heal(s);
  migrateV3(s); migrateV4(s); migrateV5(s);
  if (typeof s.preLevel !== "number") s.preLevel = recoverPreLevel(s);
  s.level = Math.min(Math.max(1, s.level || 1), LEVELS.length);  // defensive clamp, always
  s.preLevel = Math.min(Math.max(0, s.preLevel || 0), PRE_LEVELS.length);
  return s;
}

const newState = () => ({
  version: 5, level: 1, preLevel: 1, sessionsCompleted: 0, perfectStreak: 0, prePerfectStreak: 0,
  settings: { sound: true, childName: "", lang: "en-US" },
  words: {}, log: [], pre: {},
});

/* ---------- speech ---------- */
/* speak takes one sentence or a list of { text, rate } parts. Parts queue as
   separate utterances, so a clear pause separates the praise from the reveal
   (SPEC §5). Every part speaks at one calm rate: stretching a word distorts
   the very sound the child is learning. */
function speak(input, enabled, lang) {
  if (!enabled) return;
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const parts = typeof input === "string" ? [{ text: input, rate: 0.9 }] : Array.isArray(input) ? input : [];
    for (const p of parts) {
      const u = new SpeechSynthesisUtterance(p.text);
      u.rate = p.rate; u.pitch = 1.1; if (lang) u.lang = lang;
      window.speechSynthesis.speak(u);
    }
  } catch (e) {}
}
/* S2 — the queued reveal must never bleed into the next attempt. */
function hush() { try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) {} }
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} } // P2-8

/* The display layer for the one word English writes uppercase: the key
   stays "i" (matching and ledgers keep one spelling), and every surface a
   child or parent reads — card, tiles, feedback, lists, export — shows I. */
const displayWord = (w) => (w === "i" ? "I" : w);
const displayChunk = (word, g) => (word === "i" ? "I" : g);
function feedbackParts(result, word) {
  const shown = displayWord(word);
  const d = word === "i" ? shown : dashed(word);
  if (result === "correct") return { lead: "Great job! That is ", d, word: shown, icon: "🎉" };
  if (result === "close") return { lead: "Good try! The correct pronunciation is ", d, word: shown, icon: "💪" };
  return { lead: "Let\u2019s try that again. The correct pronunciation is ", d, word: shown, icon: "🔁" };
}
/* Seventeen praise sentences for a correct reading (SPEC \u00a75). Most point to the
   child\u2019s own effort. The caller picks the index; 0 is the fallback. */
const PRAISE = [
  "Great job!",
  "You did it!",
  "You knew just what to do with that word!",
  "How do you feel about saying that word correctly?",
  "You worked that out on your own!",
  "Your reading is getting stronger every day!",
  "You should feel proud of that one!",
  "That was tricky, and you got it!",
  "You sounded that one out beautifully!",
  "What careful reading that was!",
  "Sound by sound, you built the whole word!",
  "You took your time and got it just right!",
  "That word had no chance against you!",
  "You stuck with it, and it paid off!",
  "You made that look easy!",
  "High five! You earned that one!",
  "Every sound in its place — wonderful!",
];
/* Praise lines the SYSTEM voice must never be given. "You read that word all
   by yourself!" was spoken by the fallback voice with "read" as "reed",
   present tense, to a child who had just read the word - the fault beta.6
   was published for, returning whenever the pack could not play. The owner
   replaced that line entirely on 2026-08-03, so the list is empty today; the
   mechanism stays, because the next two-pronunciation praise line would
   bring the fault straight back. If you add one, add its index here. The
   pack path keeps the index it was given; only the fallback is remapped,
   and praise is spoken never shown, so nothing on screen disagrees. */
const TTS_UNSAFE_PRAISE = [];
const ttsSafePraise = (i) => (TTS_UNSAFE_PRAISE.includes(i) ? 0 : i);
/* THE ONE WORD SYSTEM SPEECH MUST NOT BE GIVEN RAW. Every clip in this game is
   recorded, and the app only reaches system speech when the pack fails to
   load. For 444 of the 445 words that fallback is merely worse. For "a" it
   would break safety rule S4: handed the string "a", every system voice says
   the LETTER'S NAME, which is the one thing this app must never say to a child
   learning that letters make sounds. So the fallback says "uh" — the sound the
   word actually makes, and the sound the recorded clip carries.

   This is the same shape as ttsSafePraise above: the recorded path is the real
   one, and the fallback is written down rather than left to a synthesiser's
   judgement. The copy gate (rule 4) reads feedbackSpeech for every bank word
   and refuses a letter name, which is exactly how this was caught. */
/* Words the system voice must not receive as their bank spelling. "a"
   would be the letter's NAME (S4): the fallback says "uh", the word itself.
   "i" goes as the capital — the voice then says the word, and for this one
   word the name IS the word, which is no S4 breach. */
const TTS_UNSAFE_WORD = { a: "uh", i: "I" };
const ttsSafeWord = (w) => TTS_UNSAFE_WORD[w] || w;
/* The reveal is its own utterance, so the pause before it does the work that
   slowing the word used to do badly. */
const feedbackSpeech = (r, w, praise = 0) =>
  r === "correct" ? [{ text: PRAISE[praise] || PRAISE[0], rate: 0.9 }, { text: "The word was " + ttsSafeWord(w) + ".", rate: 0.9 }]
  : r === "close" ? [{ text: "Good try!", rate: 0.9 }, { text: "The word is " + ttsSafeWord(w) + ".", rate: 0.9 }]
  : [{ text: "Let\u2019s try again.", rate: 0.9 }, { text: "The word is " + ttsSafeWord(w) + ".", rate: 0.9 }];

/* ---------- voice packs (SPEC §5a) ---------- */
const SEAM_MS = 700;   // the pause between clips in one utterance, so words never crush together
/* The sound-out reveal has its own, shorter seam. The owner heard four
   spacings on 2026-08-11 and chose 500 ms: 700 was set for whole words in a
   sentence, and a sound-out is a different rhythm. At 700 the whole reveal
   runs 8.2 seconds, which is a long wait between words for a four-year-old. */
const SOUNDOUT_SEAM_MS = 500;
/* How long a tile keeps its ring. It must outlast the sound it marks — the
   longest approved single sound runs 620 ms — or the mark would leave the
   screen while the child is still hearing it. It must also not outlast the
   whole gap to the next tile, which is at minimum the shortest sound (85 ms)
   plus one seam: 585 ms. Those two demands cross, so a brief overlap of two
   rings is unavoidable on the fastest pair, and 700 ms takes the side of the
   sound being fully marked. */
const SOUNDOUT_POP_MS = 700;
/* Which SOUND each tile speaks. A tile is one unit (safety rule S8), so a
   digraph gets one sound and one pop: ck says /k/, wh says /w/, kn says /n/.
   Every id here is a clip the owner has approved, and none of them is a
   recording of the owner's voice (owner-ruled 2026-08-11). */
const TILE_SOUND = {
  a: "short_a", e: "short_e", i: "short_i", o: "short_o", u: "short_u",
  c: "k", ck: "k", ff: "f", ll: "l", ss: "s", zz: "z",
  kn: "n", wr: "r", mb: "m", th: "th_quiet", wh: "w",
};
const soundIdFor = (g) => "d:" + (TILE_SOUND[g] || g);
/* A tricky word is tricky because one of its letters is not saying what the
   letter usually says. The owner ruled on 2026-08-06 that the sound-out tells
   the truth about it anyway — "the bent letter plays its TRUE sound... No
   tricky-word exemption" — so these words override the letter's usual sound
   at the tile that bends. Keyed by word, then by tile position, because it is
   one tile of the word that lies and not the letter everywhere it appears.
   Every id here is a clip the owner has approved in a listening round. */
const WORD_SOUND = {
  she: { 1: "long_e" },                    // e says its name
  the: { 0: "th_this", 1: "schwa" },       // the buzzy th, then the lazy uh
  push: { 1: "oo_book" }, bush: { 1: "oo_book" },
  was: { 1: "short_u", 2: "z" },           // "wuz"
  /* "wut", owner-ruled 2026-08-12 — and this reverses a ruling the owner made
     the same morning, which is worth recording rather than tidying away. The
     first ruling was made from the WORD clip alone and kept short_o. The
     agreement check (tools/sound_agreement.py) then reported that every
     phonemisation says /wʌt/, including the carrier this very clip was cut
     from. Offered the whole sound-out both ways, the owner refused w-o-t and
     chose w-u-t. The lesson is the one the ten-sound review taught the same
     day: a clip judged ALONE is not the same question as the same clip judged
     in the company it will keep. */
  what: { 1: "short_u" },
  /* The heart words, owner-heard 2026-08-12, every one graded perfect in the
     sound-out round. Each is a word whose letters do not say what they usually
     say, which is why it is taught by sight — and the reveal still tells the
     truth about it, per the 2026-08-06 ruling. */
  to: { 1: "oo_moon" }, do: { 1: "oo_moon" },   // o says oo
  you: { 1: "oo_moon" },
  /* Seating pass two's hearts (owner-ruled 2026-08-17, "seat 7 of 7"): each
     bends its team tile to a sound the owner graded in the sound rounds,
     shipped from pending the same day. want rides the wash-bend. */
  they: { 0: "th_this", 1: "long_a" },
  out: { 0: "ow" },
  there: { 0: "th_this", 1: "air" },
  want: { 1: "short_o" },                        // y-ou: the ou says oo
  said: { 1: "short_e" },                       // s-ai-d: the ai says e
  my: { 1: "long_i" },                          // y says the letter I's sound
  /* "of" took three rounds, and both of its letters lie: o says the u of "up"
     and f says /v/. Round 1 was graded "iterate on this"; the fault was
     measured rather than guessed — the shipped v sat 6.2 dB louder and 400 Hz
     brighter than the vowel beside it, having been graded alone and never in
     company. Round 2 settled the v (quieter, rounder), round 3 settled the
     vowel, and the owner graded the pair perfect on 2026-08-12.

     THE SOFTENED v IS THIS WORD'S ALONE (owner-ruled 2026-08-12). It first
     replaced d:v everywhere, and measurement showed what that cost: 3.3 dB
     below the vowel here, which the owner passed, but 6.5 dB below short_e in
     "vet", 6.7 below the x in "vex" and 9.6 below the n in "van" — three words
     nobody had heard. van, vet, vat and vex keep d:v, graded perfect for them
     in SND16. A clip tuned for one word's company is not tuned for another's. */
  of: { 0: "short_u", 1: "v_soft" },
  /* "a" is the commonest word in English and was the last one missing, because
     the only pronunciation the voice offered was /eɪ/ — the letter's NAME,
     which S4 forbids the app to say. The owner solved it outside this repo and
     handed over a complete package: an af_heart schwa, 363 ms, with its recipe,
     its inputs and a hash for every file. Shipped as the exact bytes they
     graded, turned down 4.8 dB to sit at the level of the schwa already in the
     game (owner verdict, 2026-08-12, arm 2·3).

     It gets its OWN sound id rather than reusing `schwa`, on the owner's
     ruling that "the schwa with the the should remain as we already have in
     game". The two are different recordings — 360 ms against 150 — so pointing
     "a" at the shipped schwa would make the word clip and the sound clip
     disagree inside one reveal, which is fault B15 by another route. */
  a: { 0: "schwa_a" },
  /* "i" — one letter, one sound, and the sound is the letter's own NAME, which
     is why a plain render was safe here when it never was for "a" (settled,
     round four, 2026-08-15). On the "a" precedent it gets its OWN sound id and
     the id's bytes ARE the word clip the owner approved (arm C, whole word at
     sentence speed): one recording serving both, so the word clip and the
     sound clip cannot disagree inside a reveal — B15 has no route in. d:long_i
     (the y of "my") is a different approved recording and stays where it is. */
  i: { 0: "long_i_i" },
  /* "we" and "me", seated 2026-08-13 at the owner's ask, after nine sentences
     of batch 3 had to be bent around their absence. Both are open syllables:
     the e is not the e of "pen", it says its own name, so both bend to long_e —
     the same clip "she" already uses and the owner graded good. "go" was asked
     for at the same time and is NOT here: its o needs d:long_o, a sound nobody
     has ever heard, and seating it would put an unheard sound in a child's ear
     (docs/open-faults.md section K). */
  we: { 1: "long_e" }, me: { 1: "long_e" }, he: { 1: "long_e" }, be: { 1: "long_e" },
  /* The o that says its own name. "go", "no" and "so" were held out of the
     game for three days by a record that said `d:long_o` had never been heard;
     the owner had graded it PERFECT in sound round SND5 on 2026-08-10 and the
     clip had simply never been copied into the pack. Nothing was missing but
     a file. `tools/ledger-truth.mjs` is the gate that now refuses that
     confusion (docs/open-faults.md sections F2 and K). */
  go: { 1: "long_o" }, no: { 1: "long_o" }, so: { 1: "long_o" },
  wash: { 1: "short_o" },
  is: { 1: "z" }, has: { 2: "z" },
  /* The plural s that buzzes. After a voiced ending the plural s says /z/ —
     dogz, not dogss — which is Level 21's whole lesson (owner-ruled
     2026-08-16, SPEC section 12). These eight bend their last tile to the z
     of "is" and "has" above; the six voiceless plurals of the same level
     (cats, hats, pots, maps, cups, tops) keep the plain s and are absent
     here on purpose. */
  hens: { 3: "z" }, pigs: { 3: "z" }, bugs: { 3: "z" }, pens: { 3: "z" },
  kids: { 3: "z" }, dogs: { 3: "z" }, beds: { 3: "z" }, lids: { 3: "z" },
  /* The first seating pass (owner-ruled 2026-08-16, "seat 8 of 8"): his
     joins has and is on the buzzing ending. */
  his: { 2: "z" },
  /* THE VOICED th. "th" spells two different sounds, and until 2026-08-11 the
     tile map sent both of them to th_quiet — the VOICELESS th of "thin", a
     puff of air with no voice in it. These five take the buzzing one, /ð/, and
     were being sounded out wrongly: a child reading "the" heard "th(in)-uh".
     The other eight — thin, thick, thumb, thud, bath, math, path and moth —
     really are the quiet one and keep it.
     "with" is the one word where the two accents disagree: /wɪð/ in British
     English, /wɪθ/ in most American. It was reasoned onto the quiet th on
     2026-08-11, under the ruling for AMERICAN pronunciation. That reasoning
     was sound and the answer was wrong: the af_heart clip this game actually
     ships says /wɪð/, which tools/sound_agreement.py found by comparing the
     tiles against the voice, and the owner chose the buzzy th on 2026-08-12
     after hearing both. An accent argued from is not the accent in the file. */
  this: { 0: "th_this" }, that: { 0: "th_this" },
  then: { 0: "th_this" }, them: { 0: "th_this" }, with: { 2: "th_this" },
};
/* What each sound is, said as a person would say it. Used by the clip script,
   so anything that renders or records a pack is told the sound and not a file
   name or a letter (safety rule S4). */
const SOUND_TEXT = {
  b: "the sound at the start of bat", ch: "the sound at the start of chip",
  d: "the sound at the start of dog", f: "the sound at the start of fan",
  g: "the sound at the start of got", h: "the sound at the start of hat",
  j: "the sound at the start of jam", k: "the sound at the start of cat",
  l: "the sound at the start of leg", m: "the sound at the start of map",
  n: "the sound at the start of net", ng: "the sound at the end of ring",
  p: "the sound at the start of pig", qu: "the sound at the start of quick",
  r: "the sound at the start of run", s: "the sound at the start of sun",
  sh: "the sound at the start of ship", t: "the sound at the start of top",
  th_quiet: "the quiet sound at the start of thin",
  th_this: "the buzzy sound at the start of this", v: "the sound at the start of van",
  w: "the sound at the start of win", x: "the sound at the end of box",
  y: "the sound at the start of yes", z: "the sound at the start of zip",
  short_a: "the sound in the middle of cat", short_e: "the sound in the middle of hen",
  short_i: "the sound in the middle of pig", short_o: "the sound in the middle of hot",
  short_u: "the sound in the middle of cup", long_e: "the sound at the end of she",
  schwa: "the lazy sound in the middle of the", oo_book: "the short oo sound in book",
  /* Seating pass two's four (2026-08-17), each named by a word the child is
     taught, never a letter name (S4). */
  long_a: "the sound at the end of they", or: "the sound at the end of for",
  ow: "the sound at the start of out", air: "the sound at the end of there",
  /* Never "the letter A's name" (S4). This is the article: the uh of "a cat". */
  schwa_a: "the lazy uh sound of the word a",
  /* The same sound as v, made quieter and rounder for the one word that needed
     it. The text is what a person is asked to say when the clip is made, so it
     names the sound and not the treatment. */
  v_soft: "the sound at the start of van",
  oo_moon: "the long oo sound in moon",
  /* Never "the letter I's name": this text is what a person is asked to
     say when the clip is recorded or rendered, and S4 bans letter names
     from speech. It names the sound by a word that carries it. */
  long_i: "the sound at the end of my",
  /* Added 2026-08-13 with go, no and so. Without it the script would have
     offered whoever records this pack the string "long_o" — a file name, and
     the exact fault the rule above exists to stop. A test caught it in the
     same run as the seating. */
  long_o: "the sound at the end of go",
  /* The word i's own sound, bytes identical to its word clip (round four,
     2026-08-15). Named by a carrier word like every entry here — the S4 rule
     bans asking a recorder for "the letter I's name" even when, as here, that
     is what the sound happens to be. */
  long_i_i: "the sound at the start of ice",
  /* THE SEVEN APPROVED AND WAITING, written 2026-08-19 - the day the owner
     heard all fifty sounds in one sitting and passed every one. Without these
     lines voiceScript falls back to the id itself and hands a recorder the
     string "long_u" where a sentence belongs. Named by a carrier word like
     every entry above, because S4 bans asking for a letter's name. */
  ar: "the sound in the middle of car",
  aw: "the sound at the start of awful",
  ear: "the sound at the end of deer",
  er: "the sound at the end of her",
  long_u: "the sound at the start of use",
  oi: "the sound in the middle of coin",
  zh: "the buzzing sound in the middle of measure",
};
/* The sound each of a word's tiles speaks, in order. */
function soundIdsFor(word) {
  const bent = WORD_SOUND[word] || {};
  return chunkWord(word).map((g, i) => (bent[i] ? "d:" + bent[i] : soundIdFor(g)));
}
/* Every sound the bank's tiles can ask for, derived from the bank rather than
   listed by hand, so a new word can never outrun its sounds. */
/* EVERY word the app has an opinion about, not every word in a level. The
   inventory below and the render script both used to walk LEVELS, which was
   safe only by coincidence: every tricky word and every bent-sound word also
   happened to sit in a level. A word reachable any other way would have had no
   sound clip and no word clip, `resolvePack` would have returned null, and the
   whole reveal would have dropped to system speech — for that word only, which
   is the hardest kind of fault to notice. The heart-word roster in SPEC
   section 12 is the next thing that will test this, and it must not be the
   thing that finds it.

   TRICKY and WORD_SOUND are keyed BY WORD, so they are the other two places a
   word can be named, and both are folded in here. A test pins that: a word
   named in either and in no level still appears in the inventory. */
/* THE HEART ROSTER — words taught by sight, ahead of the code that would
   decode them. This is the ONE list; tools/decodable.mjs used to carry a
   second, longer one that treated all sixteen as Level 1, which is how two
   rosters drift apart and how a sentence gets levelled against a word the
   child has never met.

   A heart word still needs a SEAT in a level, because that is the only place
   buildSession draws new words from — a roster entry alone would make a word
   invisible to the game forever. So this list does not place words; it records
   which of the placed words are sight words, for the sentence leveller and for
   anyone reading the bank.

   The seats moved on 2026-08-15 with the 10-and-10 curriculum: the owner
   approved every seat by reading the level lists in rounds one to three —
   the, a, and and i at Level 1, my and we at 2, me and to at 3, he, no and do
   at 4, go, so and you at 5, be and said at 6, and of at 7 ("Move of to 7",
   in the owner's words). The 2026-08-12 principle survives the move: a heart
   word's level is where the CHILD MEETS it, never where its spelling falls.
   "a" joined on 2026-08-12 from a schwa package the owner made outside this
   repo; "i" joined on 2026-08-15 in round four, the first word the curriculum
   added — it says the letter's own name, which is exactly why it is here. */
const HEART = ["the", "and", "to", "do", "you", "said", "my", "of", "a",
  "we", "me", "he", "be", "go", "no", "so", "i"];

/* THE PRE-LEVEL LADDER (owner-ruled 2026-08-15: five levels, adult-graded
   say-it-back, the words' own boxes-and-80-percent rule, fresh saves only —
   SPEC section 12 item 8 carries the ruling). It teaches a child with no
   letter knowledge everything Level 1 assumes. Pre 1 is the EAR: the app
   plays a Level-1 word's sounds apart, the child says the word they make,
   the adult grades — no letters anywhere. Pre 2 to 5 put one letter on
   screen at a time: its approved sound is the PROMPT (S2 guards reading
   attempts, and nothing on this screen is read — an echo task has no answer
   to rob; SPEC section 12 item 8 states the distinction), the
   child says it back, the adult grades with the same strip words use. The
   ladder adds ZERO audio: every letter sound and every ear word already
   ships owner-approved. The ten letters are exactly the ten that Level 1's
   decodables spell, in the classic continuous-first s-a-t-p opening.
   Boxes live in state.pre, NEVER state.words — the letters "a" and "i"
   would collide with the words "a" and "i". The five rung names were
   owner-approved on 2026-08-15 ("Approve pre level names"). */
const PRE_LEVELS = [
  { n: 1, name: "Little Ears", emoji: "👂", focus: "hear two sounds, say the word", kind: "ear",
    items: ["am", "an", "in", "on", "at", "it", "up", "us", "is", "ax"] },
  { n: 2, name: "First Sounds", emoji: "✨", focus: "s, a, t and p", kind: "letter", items: ["s", "a", "t", "p"] },
  { n: 3, name: "New Sounds", emoji: "🌱", focus: "i and n", kind: "letter", items: ["i", "n"] },
  { n: 4, name: "More Sounds", emoji: "🌟", focus: "m and o", kind: "letter", items: ["m", "o"] },
  { n: 5, name: "Last Sounds", emoji: "🏁", focus: "u and x", kind: "letter", items: ["u", "x"] },
];
const preItems = (n) => (PRE_LEVELS.find((p) => p.n === n) || { items: [] }).items;

/* A pre-session: up to five due letter reviews from the levels already won,
   then this level's items — the fresh ones in taught order, the rest lowest
   box first. No shuffle: a beginner's first meetings keep the taught order,
   which is the pedagogy. Capped at twelve. */
function buildPreSession(state) {
  const pre = state.pre || {};
  const cur = preItems(state.preLevel);
  const sNum = state.sessionsCompleted + 1;
  const picked = new Set();
  const take = (arr, k) => { const got = []; for (const w of arr) { if (got.length >= k) break; if (!picked.has(w)) { picked.add(w); got.push(w); } } return got; };
  const dueEarlier = PRE_LEVELS.filter((p) => p.kind === "letter" && p.n < state.preLevel).flatMap((p) => p.items)
    .filter((k) => pre[k] && pre[k].attempts > 0 && pre[k].box < 5 && pre[k].dueAt <= sNum)
    .sort((a, b) => pre[a].box - pre[b].box);
  const list = [];
  list.push(...take(dueEarlier, 5));
  list.push(...take(cur.filter((k) => !pre[k] || pre[k].attempts === 0), 12 - list.length));
  list.push(...take([...cur].sort((a, b) => ((pre[a] && pre[a].box) || 0) - ((pre[b] && pre[b].box) || 0)), 12 - list.length));
  return list;
}

/* Winning a pre-level is the words' own rule, BOTH halves of it: 80 percent
   of the rung's items at box 3, or two perfect sessions in a row - the same
   pair checkPromotion runs. The second path matters more here than it ever
   did for words: the rungs are small (the auditor measured 80 percent of a
   two-letter rung as two of two), so the boxes alone would make a bar the
   verdict never described. On a rung a child cannot crack, the grown-up's
   jump control is the door. Passing Pre 5 leaves the ladder (preLevel 0)
   and Level 1 begins. */
function checkPrePromotion(state, session) {
  if (!state.preLevel) return false;
  const pre = state.pre || {};
  const prior = typeof state.prePerfectStreak === "number" && isFinite(state.prePerfectStreak) && state.prePerfectStreak > 0
    ? Math.min(2, Math.round(state.prePerfectStreak)) : 0;
  if (session) state.prePerfectStreak = session.perfect ? Math.min(2, prior + 1) : 0;
  const cur = preItems(state.preLevel);
  const solid = cur.filter((k) => pre[k] && pre[k].box >= 3).length;
  const secure = isSecure(solid, cur.length);
  if (!secure && !(session && state.prePerfectStreak >= 2)) return false;
  state.preLevel = state.preLevel >= PRE_LEVELS.length ? 0 : state.preLevel + 1;
  state.prePerfectStreak = 0;
  return true;
}

function bankWords() {
  const words = new Set();
  for (const l of LEVELS) for (const w of l.words) words.add(w);
  for (const w of Object.keys(TRICKY)) words.add(w);
  for (const w of Object.keys(WORD_SOUND)) words.add(w);
  return [...words].sort();
}
function soundInventory() {
  const ids = new Set();
  for (const w of bankWords()) for (const id of soundIdsFor(w)) ids.add(id);
  return [...ids].sort();
}
const VOICE_SENTENCES = {
  "s:was": "The word was",
  "s:is": "The word is",
  "l:close": "Good try!",
  "l:wrong": "Let’s try again.",
  "e:done": "All done! Great reading today!",
  "e:levelup": "Amazing! Level up!",
};
/* The invitation, spoken between the sentence and the one word the reveal
   sounds out (SPEC section 12, step 2). Three of them so a child who reads
   several sentences in a session is not told the same thing every time; the
   choice is random and none of them says anything the others do not.

   `soundout-1` is the one to leave alone. Its first take said "read" as in
   *reed* and the owner refused it in one listen — the fault SPEC section 9
   records from 2026-08-03. The shipped take carries explicit phonemes, and
   the renderer now refuses any line with a two-pronunciation word and no
   phonemes, so the gate lives where the audio is made. */
const REVEAL_LINES = ["s:soundout-1", "s:soundout-2", "s:soundout-3"];
const REVEAL_LINE_TEXT = {
  "s:soundout-1": "You read them all. Let’s sound out this one.",
  "s:soundout-2": "Let’s sound out one word together.",
  "s:soundout-3": "Here is one word to sound out.",
};
/* THE LEAD LINE OF A GRADED SENTENCE (owner-ruled 2026-08-14, from the
   decision page that gave the sentence its attempt phase). A sentence is
   GRADED with the same three controls as a word, and the grade decides only
   what the app SAYS — nothing is written to the save, nothing is scheduled,
   nothing returns (SPEC section 12 points 3 and 4 stand untouched).

   "correct" takes a praise clip, but only from the rows that never say the
   word "word": a child has just read a SENTENCE, and "You knew just what to
   do with that word!" would be the app mis-describing what they did. The
   four excluded rows are 2, 3, 10 and 12 (0-based) — measured, not chosen,
   and a test pins both halves so a praise edit cannot silently widen this.
   "close" and "wrong" take the same two lead clips a word's reveal uses:
   S3's exact sentences, already recorded, already approved. Zero new audio.

   The index is the CALLER's choice so this stays a pure function; an index
   outside the roster falls back to its first entry rather than praising a
   sentence with a word-shaped line. */
const SENTENCE_PRAISE = [0, 1, 4, 5, 6, 7, 8, 9, 11, 13, 14, 15, 16];
function sentenceLead(result, praiseIdx) {
  if (result === "close") return "l:close";
  if (result === "wrong") return "l:wrong";
  return "p:" + (SENTENCE_PRAISE.includes(praiseIdx) ? praiseIdx : SENTENCE_PRAISE[0]);
}
/* A sentence split into the words a child sees. Case and punctuation are the
   writer's problem, not the child's. An apostrophe is NOT stripped: "can't" is
   a different word from "can" and is not taught.

   `tools/decodable.mjs` imports this rather than keeping its own copy. Two
   tokenisers would be two answers to "how many words is this", and the
   eight-word ceiling would then mean two different things. */
const sentenceWords = (s) => s.toLowerCase().replace(/[.,!?;:"“”]/g, " ").split(/\s+/).filter(Boolean);
/* The word the reveal sounds out: the FIRST word of the sentence that the
   level itself introduces (SPEC section 12, step 2 — "the word the LEVEL
   TEACHES"). First, not random: a child meeting a sentence twice must be
   taught the same word by it both times, or the sentence stops being practice
   for anything in particular.

   Returns null when the level teaches no word in the sentence, which is a
   sentence that should never have been placed here. The caller shows the
   sentence and skips the sound-out rather than ringing an arbitrary tile —
   there is no honest guess to make, and B5's rule is the same one: where the
   answer is not known, show nothing rather than something wrong. */
function revealWord(text, level) {
  const own = new Set((LEVELS.find((l) => l.n === level) || {}).words || []);
  return sentenceWords(text).find((w) => own.has(w)) || null;
}
/* THE SAME QUESTION IN FREE PLAY, where there is no level word to use.
   Owner-ruled 2026-08-13, from four costed options: the LONGEST word, counted
   in sound tiles rather than letters, and the first one when two tie.

   Counted in TILES because that is the thing being taught: "ship" is four
   letters and three sounds, and a child taking it apart meets three pieces.
   Letters would call it longer than "cat" by one and it is longer by nothing
   that matters here.

   Stable, and that is the point of it. The same sentence teaches the same word
   every time a child meets it, which is the rule the session reveal already
   follows — a random pick was one of the four options and was refused for
   exactly that reason. */
function revealWordLongest(text) {
  let best = null, most = 0;
  for (const w of sentenceWords(text)) {
    const n = chunkWord(w).length;
    if (n > most) { most = n; best = w; }
  }
  return best;
}
/* Every sentence a child at this level can read, for free play (SPEC section
   12 point 7). Levels up to AND INCLUDING theirs: a sentence from an earlier
   level is practice a child has earned, and one from a later level is the
   guessing exercise the decodability rule exists to prevent. */
function sentencesUpTo(level) {
  const out = [];
  for (const l of LEVELS) if (l.n <= level) out.push(...(SENTENCES[l.n] || []));
  return out;
}
/* The canonical clip inventory: every id a pack must cover, with its text.
   Drives the renderer, the recorder, and the gate. Every clip is spoken at
   the voice's natural speed — a stretched word stops sounding like the word. */
function voiceScript() {
  const clips = [];
  for (const [id, text] of Object.entries(VOICE_SENTENCES)) clips.push({ id, text });
  PRAISE.forEach((text, i) => clips.push({ id: "p:" + i, text }));
  for (const w of bankWords()) clips.push({ id: "w:" + w, text: w });
  /* Every sentence the game can show, and the invitation lines that introduce
     the sound-out. A sentence is one whole recording and never a stitch of
     word clips: stitched, the same sentence ran 2.07x too long, and a child
     hearing eight separate words does not hear a sentence. */
  for (const l of LEVELS) for (const s of SENTENCES[l.n] || []) clips.push({ id: s.id, text: s.text });
  for (const id of REVEAL_LINES) clips.push({ id, text: REVEAL_LINE_TEXT[id] });
  clips.push({ id: "s:pronounced", text: "Pronounced:" });
  /* A sound clip's text says what the sound IS, in words a grown-up can act
     on — "the sound at the start of ship". It is never the id and never the
     letter: a script that read "th_quiet" back would prompt whoever renders
     or records it to say a file name, and one that read "s" would invite the
     letter name, which the app must never speak (safety rule S4). */
  for (const id of soundInventory()) clips.push({ id, text: SOUND_TEXT[id.slice(2)] || id.slice(2) });
  return clips;
}
/* The play order for one utterance. "seam" is a SEAM_MS pause, "seam2" the
   shorter sound-out one.

   THE SOUND-OUT REVEAL, owner-ruled 2026-08-04 and unbuilt until now: praise,
   the word, "Pronounced:", each sound on its own tile's moment, then the word
   again — on every reveal outcome. The tile animation is driven by where each
   sound falls in this plan, so the order here IS the choreography. */
function clipPlan(kind, word, praise) {
  const soundOut = (lead) => {
    const out = [lead, "seam2", "w:" + word, "seam2", "s:pronounced"];
    for (const id of soundIdsFor(word)) out.push("seam2", id);
    out.push("seam2", "w:" + word);
    return out;
  };
  if (kind === "correct") return soundOut("p:" + (PRAISE[praise] ? praise : 0));
  if (kind === "close") return soundOut("l:close");
  if (kind === "wrong") return soundOut("l:wrong");
  if (kind === "replay") return ["w:" + word];
  if (kind === "levelup") return ["e:levelup"];
  return ["e:done"];
}
/* THE SENTENCE REVEAL'S PLAY ORDER (SPEC section 12 point 6, approved
   2026-08-13). Its own function rather than another `kind` in `clipPlan`,
   because `clipPlan`'s third argument is a praise index and a sentence has no
   praise: overloading it would have put a sentence's clip id in a parameter
   named `praise`, and the next person to read it would be entitled to believe
   the name.

   The whole sentence, a pause, then the ordinary sound-out with the INVITATION
   in the place the praise line usually takes. That is deliberate: the reveal a
   child meets here is the reveal they already know from every word — the same
   seams, the same tile rings, the same order — so there is nothing new to
   learn about the format while learning the sentence.

   A sentence is ONE whole recording and never a stitch of word clips. Stitched,
   the same sentence ran 2.07 times too long, and a child hearing eight separate
   words does not hear a sentence.

   `word` may be null, for a sentence whose level teaches none of its words.
   Then there is nothing honest to sound out and the plan is the read alone —
   the same rule as B5's rings: where the answer is not known, show and say
   nothing rather than something wrong. */
function sentencePlan(sentenceId, word, lineId) {
  if (!word) return [sentenceId];
  const out = [sentenceId, "seam", lineId, "seam2", "w:" + word, "seam2", "s:pronounced"];
  for (const id of soundIdsFor(word)) out.push("seam2", id);
  out.push("seam2", "w:" + word);
  return out;
}
/* The closing read (point 5), on its own so a tap can interrupt it without
   stopping anything that came before it. */
const sentenceClosePlan = (sentenceId) => [sentenceId];
/* Which entries of a plan are tile sounds, and which tile each belongs to.
   The player reports the scheduled time of each, so a tile lights the moment
   ITS sound starts rather than on a guessed delay. */
function tileSlots(plan) {
  const slots = [];
  let t = 0;
  for (let i = 0; i < plan.length; i++) if (String(plan[i]).startsWith("d:")) slots.push({ index: i, tile: t++ });
  return slots;
}
/* ---------------- Build-a-sound: Build-it at the ladder's scale ------------
   Owner-ruled 2026-08-17 (open-faults Q6). A pre-ladder child was being offered
   the word version of Build-it before they had met a letter. The mode they get
   instead says a SOUND and asks them to find its tile among the letters they
   have been taught - the same idea at the ladder's scale.

   IT STARTS AT PRE 2, and that is the whole design constraint. Pre 1 is "Little
   Ears": listening only, no letters anywhere, deliberately. A tray needs tiles
   and the honest inventory at Pre 1 is empty, so the mode is not offered there
   rather than borrowing letters the ladder has not reached. Drawing on Pre 2's
   roster early would teach s, a, t and p ahead of the rung that introduces
   them, and that order is stated pedagogy.

   The tray is exactly what the child has been taught, nothing more: four tiles
   at Pre 2, six at Pre 3, eight at Pre 4, ten at Pre 5. Every one of those ten
   letters already has a shipped clip, so this mode adds no audio at all. */
const PRE_TRAY_FROM = 2;
function preLetters(preLevel) {
  return PRE_LEVELS.filter((p) => p.kind === "letter" && p.n >= PRE_TRAY_FROM && p.n <= preLevel)
    .flatMap((p) => p.items);
}
/* Null below Pre 2, so a caller cannot accidentally build a tray for a child
   who has met no letters - the check lives here rather than in every caller. */
function buildSoundTray(preLevel, rand = Math.random) {
  const pool = preLetters(preLevel);
  if (!pool.length) return null;
  const target = pool[Math.floor(rand() * pool.length)];
  const deck = shuffle(pool, rand);
  return { kind: "sound", target, slots: 1, answer: [target],
    prompt: soundIdFor(target), tiles: deck, sounds: deck.map(soundIdFor) };
}

/* ---------------- Build-it: the tray a child assembles a word from ----------
   SPEC section 12, owner-ruled 2026-08-17. The app speaks a word the child
   already knows and the child builds it from sound tiles. It speaks FIRST, so
   a turn can never be a graded reading attempt, and nothing here writes to any
   record: practice-only is load-bearing, not a preference.

   THE SLOTS ARE ALWAYS THE WORD'S TRUE SOUND COUNT. That alone teaches
   segmentation, so a tray never pads or hides a slot.

   A DISTRACTOR MUST STILL SAY A TRUE SOUND. A tile with no word behind it is
   still a tile a child will tap and hear, so the pool refuses any unit whose
   sound is decided per word rather than once: the four units with no ruled
   default (S8, 2026-08-12 and 2026-08-17) and every grapheme some word bends
   through WORD_SOUND. "his" bends s to /z/, so an s tile beside a word that
   does not bend it would teach two things at once. */
/* The four units with no ruled default sound (S8, 2026-08-12 and 2026-08-17).
   These are the only graphemes barred outright: alone they can say nothing
   true, because every word that uses them bends them. */
const NO_TRAY_UNITS = ["ai", "ou", "ey", "ere"];
/* Words a child must never be able to BUILD. SPEC section 12 owns this list -
   these are the words the owner ruled out for child-appropriateness, and gob,
   which was removed from every file on 2026-08-13 "so it cannot return by
   accident". A tray returns it by accident: building "dog" with a b distractor
   spells it, and the miss feedback then prints and SPEAKS what the child made.
   A doc-truth rule holds this list against SPEC's own sentence, so a word the
   owner rules out later cannot be ruled out in one place only.
   Found by an independent review of Build-it, 2026-08-17. */
const NEVER_BUILD = ["fist", "limp", "bone", "buns", "dump", "milt", "gob",
  "jugs", "crabs"];
/* Can these tiles, in some order, spell a word from that list? A tray is a
   multiset, so a tile is consumed once per slot: "dad" holds two d tiles and
   spells nothing with one. */
function traySpells(tiles, word, slots) {
  const want = chunkWord(word);
  /* The child fills SLOTS, not the whole tray, so a forbidden word is reachable
     when it is the right LENGTH for the slots and its tiles are available -
     never when it merely matches the tray's own size. Checking tray length was
     the first version's fault: it reported dog + b as safe, and dog + b is how
     a child spells gob. */
  if (want.length !== slots) return false;
  const left = tiles.slice();
  return want.every((c) => {
    const at = left.indexOf(c);
    if (at < 0) return false;
    left.splice(at, 1);
    return true;
  });
}
const trayForbidden = (tiles, slots) => NEVER_BUILD.some((w) => traySpells(tiles, w, slots));
/* A word whose OWN tiles spell a forbidden one cannot be made safe by choosing
   distractors, so it is not offered at all. Measured over the bank: exactly one,
   sift, which is an anagram of fist. */
const buildable = (word) => !trayForbidden(chunkWord(word), chunkWord(word).length);
/* Every grapheme a child has met at or below this level. Drawn from the bank
   itself, so a word added to a level brings its graphemes with it. */
function trayPool(level) {
  const out = new Set();
  for (const w of bankWords())
    if ((WORD_LEVEL[w] || 99) <= level)
      for (const c of chunkWord(w)) if (!NO_TRAY_UNITS.includes(c)) out.add(c);
  return [...out].sort();
}
/* How many extra tiles the tray offers: the ramp the owner ruled on
   2026-08-17. None while a child is new, one from Level 6, two past 14. */
const trayExtras = (level) => (level <= 5 ? 0 : level <= 14 ? 1 : 2);
/* THE GUARD, owner-ruled 2026-08-17 after the first version banned every
   vowel. A distractor is refused when its own sound is ALREADY spoken by one
   of this word's tiles, because two tiles that sound identical make a puzzle
   no ear can solve: ck beside cat's c, z beside his's s, o beside want's
   bent a. It is decided per WORD and after bends, which is why it catches
   those three while a per-grapheme ban did not.

   A grapheme that bends in some OTHER word is welcome here. A lone tile plays
   its default sound - the sound Level 2 teaches it says - and the bend in
   "want" is a fact about want, not about the letter a. */
const trayClash = (word, c) => soundIdsFor(word).includes(soundIdFor(c));
function buildTray(word, level, rand = Math.random) {
  const own = chunkWord(word);
  const pool = trayPool(level).filter((c) => !own.includes(c) && !trayClash(word, c)
    && !trayForbidden(own.concat([c]), own.length));
  /* Drawn by shuffling and taking, never by retrying until the picks differ:
     a retry loop cannot end when rand is held still, and a held rand is
     exactly what a test uses. This one hung the suite before it was caught. */
  const extras = shuffle(pool, rand).slice(0, Math.min(trayExtras(level), pool.length));
  /* EVERY TILE CARRIES ITS OWN SOUND, decided here and never re-derived from
     the letter later. A tile that belongs to the word plays the sound it makes
     IN THAT WORD - his's s says /z/ - and a distractor, which has no word
     behind it, plays its default.

     Deriving it from the letter at tap time was the fault: the screen played
     soundIdFor(letter) for a tile and soundIdsFor(word) for the celebration,
     two different maps in one turn. Five words then had a SILENT tile, because
     the four units with no ruled default have no default clip to play - tap
     the ou in "you" and nothing happened, in the mode whose whole feedback is
     that sound - and 42 more had a tile that said something the word does not.
     Found by a fresh-context debug agent, 2026-08-17. */
  const bent = soundIdsFor(word);
  const pairs = own.map((c, i) => ({ tile: c, sound: bent[i] }))
    .concat(extras.map((c) => ({ tile: c, sound: soundIdFor(c) })));
  const deck = shuffle(pairs, rand);
  return { word, slots: own.length, answer: own,
    tiles: deck.map((p) => p.tile), sounds: deck.map((p) => p.sound) };
}
/* A plan entry that is a pause rather than a clip. Both seams live here, so a
   pause can never be mistaken for a missing clip: reading "seam2" as a clip id
   made every sound-out reveal resolve to no pack at all and fall to system
   speech, silently, with the whole approved voice sitting unused on disk. */
const isSeam = (id) => id === "seam" || id === "seam2";
const seamMs = (id) => (id === "seam2" ? SOUNDOUT_SEAM_MS : SEAM_MS);
/* One source per utterance (SPEC §5a): family if it has every clip, else the
   default pack, else null and the caller uses system speech. */
function resolvePack(plan, has) {
  for (const tier of ["family", "default"]) {
    if (plan.every((id) => isSeam(id) || has(tier, id))) return tier;
  }
  return null;
}

/* ---------- export ---------- */
function buildMarkdown(state) {
  const today = new Date().toISOString().slice(0, 10);
  const total = Object.keys(WORD_LEVEL).length;
  const mastered = Object.values(state.words).filter(ws => ws.box >= 4).length;
  const who = state.settings.childName ? state.settings.childName + "\u2019s " : "";
  let md = "# " + who + "Word Quest \u2014 Reading Log\n\n";
  md += "_Exported " + today + "_ \u00B7 **Level " + state.level + " " + LEVELS[state.level - 1].emoji + "** \u00B7 Sessions: "
     + state.sessionsCompleted + " \u00B7 Mastered: " + mastered + "/" + total + "\n\n";
  md += "| # | Date | Level | \u2705 | \uD83D\uDFE1 | \uD83D\uDD01 | Accuracy | |\n|--:|---|--:|--:|--:|--:|--:|---|\n";
  state.log.forEach(s => {
    md += "| " + s.n + " | " + s.date + " | " + s.level + " | " + s.c + " | " + s.k + " | " + s.w + " | " + s.acc + "% | "
       + (s.partial ? "partial" : "") + " |\n";
  });
  const last = state.log[state.log.length - 1];
  if (last) {
    md += "\n## Latest session (#" + last.n + ", " + last.date + (last.partial ? ", ended early" : "") + ")\n\n";
    md += last.items.map(it => "- " + displayWord(it.w) + " " + (it.r === "correct" ? "\u2705" : it.r === "close" ? "\uD83D\uDFE1" : "\uD83D\uDD01")
       + (it.retries ? " (" + it.retries + " retry)" : "")).join("\n") + "\n";
  }
  md += "\n## Mastery snapshot\n\n_\u2705 mastered \u00B7 \uD83D\uDFE1 learning \u00B7 \u2B1C unseen_\n\n";
  LEVELS.forEach(L => {
    md += "**Level " + L.n + " " + L.emoji + " (" + L.focus + "):** " + L.words.map(w => {
      const ws = state.words[w];
      return displayWord(w) + " " + (!ws || ws.attempts === 0 ? "\u2B1C" : ws.box >= 4 ? "\u2705" : "\uD83D\uDFE1");
    }).join(" \u00B7 ") + "\n\n";
  });
  return md;
}

/* ============================================================ */

export default function WordQuest() {
  const [screen, setScreen] = useState("splash");
  const [state, setState] = useState(null);
  const [persistent, setPersistent] = useState(true);
  const [readOnly, setReadOnly] = useState(false);   // F3 — set when boot timed out; blocks all writes

  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [firstResults, setFirstResults] = useState({});
  const [order, setOrder] = useState([]);
  const [retries, setRetries] = useState({});
  const [seenTwice, setSeenTwice] = useState({});   // P2-11
  const [promptCount, setPromptCount] = useState(0);
  const [phase, setPhase] = useState("ready");
  const [lastGrade, setLastGrade] = useState(null);
  const [advanceReady, setAdvanceReady] = useState(true); // P0-3
  const [exitAsk, setExitAsk] = useState(false);          // P1-4
  const [doneStats, setDoneStats] = useState(null);
  const [toast, setToast] = useState("");
  const [copyBox, setCopyBox] = useState("");
  const [resetStage, setResetStage] = useState(0);
  const [openLevels, setOpenLevels] = useState({});       // P2-4
  const [nameDraft, setNameDraft] = useState("");

  const snapRef = useRef(null);            // N-3: word-state snapshot for lossless discard
  const liveRef = useRef(null);
  const advanceRef = useRef(null);
  const stateRef = useRef(null);
  stateRef.current = state;

  /* boot with timeout — P2-6 */
  useEffect(() => {
    let alive = true, settled = false;
    const finish = (s) => {
      if (!alive || settled) return; settled = true;
      if (!s.settings.lang) s.settings.lang = "en-US";
      if (s.settings.childName === undefined) s.settings.childName = "";
      setState(s); setNameDraft(s.settings.childName || ""); setScreen("home");
    };
    const timer = setTimeout(() => {
      setReadOnly(true);                       // F3 — never write over a save we could not read
      finish(newState());
      setToast("Couldn\u2019t read saved progress. Nothing will be saved this visit.");
    }, SPLASH_TIMEOUT_MS);
    (async () => {
      const d = await loadState();
      clearTimeout(timer);
      if (settled || !alive) {                 // F3 — late data must not render or write
        if (d && !d.__corrupt) setToast("Saved progress found. Reload to continue it.");
        return;
      }
      let s, changed = false;
      if (d && d.__corrupt) { s = newState(); setToast("Saved progress was damaged. A copy was kept; starting fresh."); }
      else if (d) { const before = d.version; s = migrate(d); changed = before !== s.version; }
      else s = newState();
      finish(s);
      if (!d || changed) setPersistent(await saveState(s));
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toast]);

  const persist = useCallback(async (s) => {
    if (readOnly) return;                     // F3 — a timed-out boot never overwrites
    setPersistent(await saveState(s));
  }, [readOnly]);

  /* ---------- session ---------- */
  function beginSession() {
    const s = structuredClone(state);
    const q = buildSession(s);
    setState(s); setQueue(q); setQi(0);
    setFirstResults({}); setOrder([]); setRetries({}); setSeenTwice({});
    setPromptCount(0); setPhase("ready"); setLastGrade(null);
    setAdvanceReady(true); setExitAsk(false);
    snapRef.current = structuredClone(s.words);   // N-3
    setScreen("session");
  }

  const currentWord = queue[qi];
  const answered = order.length;
  const totalQ = queue.length || SESSION_SIZE;  // P1-5

  function grade(result) {
    const s = structuredClone(stateRef.current);
    const word = queue[qi];
    const isRetry = firstResults[word] !== undefined;
    if (!isRetry) {
      if (!s.words[word]) s.words[word] = freshWordState();
      applyResult(s.words[word], result, s.sessionsCompleted + 1);
      setFirstResults(fr => ({ ...fr, [word]: result }));
      setOrder(o => [...o, word]);
    } else {
      setRetries(r => ({ ...r, [word]: (r[word] || 0) + 1 }));
      if (result === "correct" && s.words[word]) s.words[word].dueAt = s.sessionsCompleted + 2;
    }
    setState(s); persist(s);
    setLastGrade(result); setPhase("feedback");
    setAdvanceReady(false);
    setTimeout(() => setAdvanceReady(true), ADVANCE_GUARD_MS);   // P0-3
    if (result === "correct") buzz(28);           // N-11: no error rumble
    speak(feedbackSpeech(result, word, Math.floor(Math.random() * PRAISE.length)), s.settings.sound, s.settings.lang);
    requestAnimationFrame(() => { if (advanceRef.current) advanceRef.current.focus(); }); // P1-7
  }

  function next() {
    hush();                                          // S2 — silence the last reveal before the next attempt
    const word = queue[qi];
    let q = queue;
    const isFirstPass = (retries[word] || 0) === 0 && firstResults[word] !== undefined;
    if (lastGrade === "wrong" && isFirstPass && promptCount + (queue.length - qi) < PROMPT_CAP) {
      q = queue.slice();
      q.splice(Math.min(qi + 3, q.length), 0, word);
      setQueue(q);
      setSeenTwice(s => ({ ...s, [word]: true }));   // P2-11
    }
    const np = promptCount + 1;
    setPromptCount(np); setLastGrade(null);
    if (qi + 1 >= q.length || np >= PROMPT_CAP) finishSession(false);
    else { setQi(qi + 1); setPhase("ready"); }
  }

  /* P1-4 — explicit, honest exit semantics */
  function commitSession(partial) {
    const s = structuredClone(stateRef.current);
    if (!partial) s.sessionsCompleted += 1;           // N-2: only full sessions move the clock
    else order.forEach(w => { if (s.words[w]) s.words[w].dueAt -= 1; }); // re-anchor partial grades
    const items = order.map(w => ({ w, r: firstResults[w], retries: retries[w] || 0 }));
    const c = items.filter(i => i.r === "correct").length;
    const k = items.filter(i => i.r === "close").length;
    const w = items.filter(i => i.r === "wrong").length;
    const acc = items.length ? Math.round((c / items.length) * 100) : 0;
    const promoted = checkPromotion(s, { partial, perfect: items.length > 0 && w === 0 && k === 0 });
    s.log.push({ n: s.log.length + 1, date: new Date().toISOString().slice(0, 10),
      level: promoted ? s.level - 1 : s.level, c, k, w, acc, items, partial });
    setState(s); persist(s);
    return { c, k, w, acc, total: items.length, promoted, newLevel: s.level, partial };
  }

  function discardSession() {
    const s = structuredClone(stateRef.current);
    if (snapRef.current) s.words = structuredClone(snapRef.current);  // N-3: verbatim restore
    setState(s); persist(s);
  }

  function finishSession(partial) {
    const stats = commitSession(partial);
    setDoneStats(stats); setScreen("done"); setExitAsk(false);
    if (stats.promoted) buzz([30, 60, 30]);
    speak(stats.promoted ? "Amazing! Level up!" : "All done! Great reading today!", stateRef.current.settings.sound, stateRef.current.settings.lang);
  }

  function handleExit(choice) {
    if (choice === "save") { finishSession(true); return; }
    if (choice === "discard") { hush(); discardSession(); setExitAsk(false); setScreen("home"); return; }
    setExitAsk(false);
  }

  /* P1-1 + N-1 — replay exists only AFTER feedback; the word is never spoken pre-attempt */
  function replay() {
    if (phase !== "feedback") return;
    speak([{ text: ttsSafeWord(currentWord), rate: 0.9 }], stateRef.current.settings.sound, stateRef.current.settings.lang);
  }

  /* ---------- settings ---------- */
  const mutate = (fn) => { const s = structuredClone(stateRef.current); fn(s); setState(s); persist(s); };
  const setSound = (on) => mutate(s => { s.settings.sound = on; });
  const setLang = (code) => mutate(s => { s.settings.lang = code; });
  const jumpLevel = (n) => { mutate(s => { s.level = n; s.perfectStreak = 0; }); setToast("Level set to " + n + " " + LEVELS[n - 1].emoji); };
  function commitName() {
    const clean = Array.from(nameDraft.trim()).slice(0, 20).join("");   // P7 — never bisect a surrogate pair
    mutate(s => { s.settings.childName = clean; });
  }
  async function copyLog() {
    const md = buildMarkdown(state);
    try { await navigator.clipboard.writeText(md); setToast("Log copied \u2713"); } catch (e) { setCopyBox(md); }
  }
  function doReset() {
    const s = newState();
    setState(s); persist(s); setNameDraft(""); setResetStage(0); setToast("All progress cleared.");
  }

  const masteredCount = useMemo(() => state ? Object.values(state.words).filter(ws => ws.box >= 4).length : 0, [state]);

  /* ============================ RENDER ============================ */

  if (screen === "splash" || !state) {
    return <Frame><div className="wq-center"><div className="wq-float" style={{ fontSize: 56 }}>🚀</div>
      <p style={{ marginTop: 12, fontWeight: 800, color: C.ink }}>Loading Word Quest…</p></div></Frame>;
  }

  const L = LEVELS[state.level - 1];
  const kid = state.settings.childName;

  /* ---------------- HOME ---------------- */
  if (screen === "home") {
    return (
      <Frame>
        <Zone.Header>
          <span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>Word Quest</span>
          <button className="wq-btn-plain" onClick={() => setScreen("parent")} aria-label="Grown-ups corner">⚙️ Grown-ups</button>
        </Zone.Header>

        <Zone.Stage>
          <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
            <h1 className="wq-display" style={{ margin: 0, color: C.ink, fontSize: "clamp(2rem,7dvh,3rem)", lineHeight: 1.1 }}>
              Word Quest
            </h1>
            <p style={{ margin: "8px 0 0", color: C.ink, fontWeight: 700, fontSize: 16 }}>
              {kid ? "Hi " + kid + "! Ready to read? 📖" : "Ready to read? 📖"}
            </p>
            <div className="wq-card" style={{ marginTop: 18, padding: 16 }}>
              <div style={{ fontWeight: 800, color: C.ink, fontSize: 18 }}>Level {state.level} {L.emoji} {L.name}</div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 18, color: C.ink2, fontSize: 13.5, fontWeight: 700 }}>
                <span>🗓️ {state.sessionsCompleted} sessions</span><span>🌟 {masteredCount} mastered</span>
              </div>
            </div>
            {/* #96261d: warning red dark enough for 4.5:1 on the gradient */}
            {(!persistent || readOnly) && <p style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: "#96261d" }}>
              ⚠️ {readOnly ? "Saved progress could not be read. Nothing is being saved." : "Saving unavailable — progress lasts this visit only."}</p>}
          </div>
        </Zone.Stage>

        <Zone.Rail>
          <button className="wq-cta" onClick={beginSession}>▶️ Begin Session</button>
        </Zone.Rail>
        {/* P2-7 — parent-facing copy lives in the grown-up strip, not under the child's button */}
        <Zone.Strip>
          <span className="wq-striplabel">grown-up</span>
          <span style={{ fontSize: 12, color: C.strip }}>up to 20 words · about 5 minutes · you judge</span>
        </Zone.Strip>
        {toast && <Toast>{toast}</Toast>}
      </Frame>
    );
  }

  /* ---------------- SESSION ---------------- */
  if (screen === "session" && currentWord) {
    const fb = lastGrade ? feedbackParts(lastGrade, currentWord) : null;
    const canReplay = phase === "feedback";   // N-1
    return (
      <Frame>
        <Zone.Header>
          <button className="wq-btn-plain" onClick={() => setExitAsk(true)} aria-label="Leave session">🏠</button>
          <div style={{ flex: 1, minWidth: 0, padding: "0 10px" }}>
            <ProgressBar order={order} firstResults={firstResults} total={totalQ} />
          </div>
          {/* P2-9 — precise count, promoted into the header at tabular mono */}
          <span className="wq-mono" style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{answered}/{totalQ}</span>
          <span className="wq-chip" style={{ marginLeft: 8 }}>{state.level} {L.emoji}</span>
        </Zone.Header>

        <Zone.Stage>
          <div className="wq-stagegrid">
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 800, letterSpacing: ".14em",
                textTransform: "uppercase", color: C.ink }}>Read this word</p>
              {/* P0-2 — word baseline is fixed; everything else lives in reserved slots below */}
              <div className="wq-display wq-word" aria-live="off">{displayWord(currentWord)}</div>

              <div className="wq-slot-tiles" aria-hidden={phase !== "feedback"}>
                {phase === "feedback" && chunkWord(currentWord).map((g, i) => (
                  <span key={i} className="wq-display wq-tile">{displayChunk(currentWord, g)}</span>
                ))}
              </div>

              {/* N-9: one announcement channel — TTS when sound is on, live region when muted */}
              <div className="wq-slot-msg" ref={liveRef} aria-live={state.settings.sound ? "off" : "polite"} role={state.settings.sound ? undefined : "status"}>
                {phase === "feedback" && fb && (
                  <>
                    <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>
                      {fb.icon} {fb.lead}<strong>{fb.d}</strong>, {fb.word}.
                    </p>
                    {TRICKY[currentWord] && <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 800, color: C.amberInk }}>⭐ {TRICKY[currentWord]}</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        </Zone.Stage>

        <Zone.Rail>
          {phase === "feedback" ? (
            <button ref={advanceRef} className="wq-cta" onClick={next} disabled={!advanceReady}
              style={{ background: advanceReady ? C.green : "#9fb4c4" }}>
              {qi + 1 >= queue.length ? "🏁 Finish!" : "Next word ➡️"}
            </button>
          ) : (
            <div className="wq-prompt">{kid ? kid + ", say the word out loud! 📣" : "Say the word out loud! 📣"}</div>
          )}
        </Zone.Rail>

        {/* P0-4 / P1-2 / P2-10 — grown-up strip: muted, bottom edge, small */}
        <Zone.Strip>
          <span className="wq-striplabel">grown-up · hold to grade</span>
          <button className="wq-sbtn" onClick={replay} disabled={!canReplay} aria-label="Hear the word again">🔊</button>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <HoldButton onFire={() => grade("correct")} disabled={phase === "feedback"} color={C.green} label="✓ got it" />
            <HoldButton onFire={() => grade("close")} disabled={phase === "feedback"} color={C.amber} label="~ close" />
            <HoldButton onFire={() => grade("wrong")} disabled={phase === "feedback"} color={C.red} label="↻ not yet" />
          </div>
          {/* N-12 + P0-2: one reserved marker line, so the strip height never changes
              and the word never moves between phases */}
          <span className="wq-mark wq-mono">
            {seenTwice[currentWord] && phase !== "feedback" ? "second look at this word" : " "}
          </span>
        </Zone.Strip>

        {exitAsk && (
          <Modal title="Finish early?" onClose={() => handleExit("cancel")}>
            <p style={{ margin: "0 0 14px", fontSize: 14.5, color: C.ink2, lineHeight: 1.5 }}>
              {answered === 0
                ? "Nothing has been recorded yet."
                : answered + (answered === 1 ? " word has" : " words have") + " been read. Save them as a short session, or discard so the schedule stays clean?"}
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {answered > 0 && <button className="wq-cta" style={{ background: C.green }} onClick={() => handleExit("save")}>Save {answered} as a short session</button>}
              <button className="wq-cta" style={{ background: "#fff", color: C.red, border: "2px solid " + C.red }} onClick={() => handleExit("discard")}>Discard and go home</button>
              <button className="wq-btn-plain" onClick={() => handleExit("cancel")} style={{ justifySelf: "center" }}>Keep reading</button>
            </div>
          </Modal>
        )}
        {toast && <Toast>{toast}</Toast>}
      </Frame>
    );
  }

  /* ---------------- DONE ---------------- */
  if (screen === "done" && doneStats) {
    const promoted = doneStats.promoted;
    return (
      <Frame>
        <Zone.Header><span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>Session complete</span></Zone.Header>
        <Zone.Stage>
          <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
            {/* P2-12 — level-up folded into the trophy, not stacked beneath it */}
            <div className="wq-trophy" style={{ borderColor: promoted ? C.purple : "transparent" }}>
              <span style={{ fontSize: "clamp(2.5rem,8dvh,4rem)" }}>🏆</span>
            </div>
            <h2 className="wq-display" style={{ margin: "10px 0 0", color: promoted ? C.purple : C.ink, fontSize: "clamp(1.5rem,5dvh,2.2rem)" }}>
              {promoted ? "Level up!" : doneStats.partial ? "Good stop" : kid ? "All done, " + kid + "!" : "All done!"}
            </h2>
            {promoted && <p style={{ margin: "2px 0 0", fontWeight: 800, color: C.purple, fontSize: 14 }}>
              Welcome to Level {doneStats.newLevel} {LEVELS[doneStats.newLevel - 1].emoji}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
              <Stat n={doneStats.c} label="Got it" emoji="✅" />
              <Stat n={doneStats.k} label="So close" emoji="🟡" />
              <Stat n={doneStats.w} label="Practised" emoji="🔁" />
            </div>
            <p style={{ margin: "12px 0 0", fontWeight: 800, color: C.ink, fontSize: 15 }}>
              {doneStats.acc >= 90 ? "Superstar reading! 🌟" : doneStats.acc >= 70 ? "Great work today! 💪" : "Every try makes you stronger! 🌱"}
            </p>
          </div>
        </Zone.Stage>
        <Zone.Rail><button className="wq-cta" onClick={() => setScreen("home")}>🏠 Back home</button></Zone.Rail>
        <Zone.Strip>
          <span className="wq-striplabel">grown-up</span>
          <span style={{ fontSize: 12, color: C.strip }}>
            {doneStats.total} words · {doneStats.acc}% first-try{doneStats.partial ? " · saved as a short session" : ""}
          </span>
        </Zone.Strip>
        {toast && <Toast>{toast}</Toast>}
      </Frame>
    );
  }

  /* ---------------- GROWN-UPS ---------------- */
  return (
    <Frame>
      <Zone.Header>
        <button className="wq-btn-plain" onClick={() => { setResetStage(0); setCopyBox(""); setScreen("home"); }}>← Back</button>
        <span style={{ fontWeight: 800, color: C.ink, fontSize: 15, marginLeft: 8 }}>Grown-ups corner</span>
      </Zone.Header>

      <Zone.Stage scroll>
        <div style={{ width: "100%", maxWidth: 560, display: "grid", gap: 12, paddingBottom: 8 }}>

          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Settings</H3>
            <label htmlFor="wq-name" className="wq-lbl">Reader’s first name (optional)</label>
            {/* P2-13 — blur commits; no redundant Save button */}
            <input id="wq-name" type="text" value={nameDraft} maxLength={20}
              onChange={e => setNameDraft(e.target.value)} onBlur={commitName}
              placeholder="Leave blank to stay anonymous" className="wq-input" />
            <p className="wq-help">Saves when you tap away. Used only for greetings; stored on this device.</p>

            <div className="wq-fieldrow">
              <span className="wq-lbl">Sounds</span>
              <Seg options={[[true, "🔊 On"], [false, "🔇 Off"]]} value={state.settings.sound} onChange={setSound} />
            </div>

            {/* P2-5 — native select for locale */}
            <div className="wq-fieldrow">
              <label className="wq-lbl" htmlFor="wq-lang">Voice &amp; accent</label>
              <select id="wq-lang" className="wq-input" value={state.settings.lang} onChange={e => setLang(e.target.value)}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>

            {/* P2-5 — segmented level control; P2-14 — helper text */}
            <div className="wq-fieldrow">
              <span className="wq-lbl">Jump to level</span>
              <Seg options={LEVELS.map(l => [l.n, String(l.n)])} value={state.level} onChange={jumpLevel} />
            </div>
            <p className="wq-help">Changes only which words come up next. Mastery already earned is kept, and the engine still promotes on its own.</p>
          </section>

          {/* P2-4 — collapsed mastery map with summary rows */}
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Mastery map</H3>
            {LEVELS.map(l => {
              const done = l.words.filter(w => state.words[w] && state.words[w].box >= 4).length;
              const seen = l.words.filter(w => state.words[w] && state.words[w].attempts > 0).length;
              const isOpen = !!openLevels[l.n];
              return (
                <div key={l.n} style={{ borderTop: "1px solid " + C.line, paddingTop: 9, marginTop: 9 }}>
                  <button className="wq-rowbtn" onClick={() => setOpenLevels(o => ({ ...o, [l.n]: !isOpen }))} aria-expanded={isOpen}>
                    <span style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>Level {l.n} {l.emoji}</span>
                    <span className="wq-mono" style={{ fontSize: 12.5, color: C.muted, marginLeft: "auto" }}>{done}/{l.words.length} mastered</span>
                    <span style={{ color: C.ink2, marginLeft: 8, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  <div className="wq-meter"><div style={{ width: (done / l.words.length) * 100 + "%", background: C.green, height: "100%" }} />
                    <div style={{ width: ((seen - done) / l.words.length) * 100 + "%", background: C.sun, height: "100%" }} /></div>
                  {isOpen && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {l.words.map(w => {
                        const ws = state.words[w];
                        const bg = !ws || ws.attempts === 0 ? C.chip : ws.box >= 4 ? "#c6f2dd" : ws.box >= 2 ? "#ffe9b3" : "#ffd4d0";
                        return <span key={w} style={{ background: bg, color: C.ink, borderRadius: 6, padding: "3px 7px", fontSize: 12, fontWeight: 700 }}>{displayWord(w)}</span>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Session log</H3>
            {state.log.length === 0
              ? <p className="wq-help">No sessions yet.</p>
              : <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 13, color: C.ink, borderCollapse: "collapse" }}>
                    <thead><tr style={{ textAlign: "left" }}>
                      <th>#</th><th>Date</th><th>Lvl</th><th>✅</th><th>🟡</th><th>🔁</th><th>Acc</th></tr></thead>
                    <tbody>{state.log.slice().reverse().map(s => (
                      <tr key={s.n} style={{ borderTop: "1px solid " + C.line }}>
                        <td>{s.n}{s.partial ? "*" : ""}</td><td>{s.date}</td><td>{s.level}</td>
                        <td>{s.c}</td><td>{s.k}</td><td>{s.w}</td><td style={{ fontWeight: 700 }}>{s.acc}%</td>
                      </tr>))}</tbody>
                  </table>
                  {state.log.some(s => s.partial) && <p className="wq-help">* ended early</p>}
                </div>}
            <button className="wq-cta" style={{ marginTop: 12, background: C.ink, fontSize: 14, padding: "11px 14px" }} onClick={copyLog}>📋 Copy log (Markdown)</button>
            {/* P2-15 */}
            {copyBox && <>
              <p className="wq-lbl" style={{ marginTop: 10 }}>Clipboard blocked — select all and copy</p>
              <textarea readOnly value={copyBox} onFocus={e => e.target.select()} rows={6} className="wq-input wq-mono" style={{ fontSize: 11.5 }} />
            </>}
          </section>

          {/* P2-3 — confirm is a different, offset control; cancel is larger */}
          <section className="wq-card" style={{ padding: 16, textAlign: "left" }}>
            <H3>Danger zone</H3>
            {resetStage === 0
              ? <button className="wq-sbtn" style={{ borderColor: C.muted, color: C.muted }} onClick={() => setResetStage(1)}>🗑️ Reset all progress</button>
              : <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: 13.5, color: C.ink, fontWeight: 700 }}>Erase every session, word score and setting?</p>
                  <button className="wq-cta" style={{ background: C.ink2 }} onClick={() => setResetStage(0)}>Keep my progress</button>
                  <button className="wq-sbtn" style={{ borderColor: C.red, color: C.red, justifySelf: "start" }} onClick={doReset}>Yes, erase everything</button>
                </div>}
          </section>
        </div>
      </Zone.Stage>
      {toast && <Toast>{toast}</Toast>}
    </Frame>
  );
}

/* ============================ layout primitives ============================ */

function Frame({ children }) {
  return (
    <div className="wq-root">
      <style>{CSS}</style>
      <div className="wq-shell">{children}</div>
    </div>
  );
}

const Zone = {
  Header: ({ children }) => <header className="wq-header">{children}</header>,
  Stage: ({ children, scroll }) => <main className={"wq-stage" + (scroll ? " wq-scroll" : "")}>{children}</main>,
  Rail: ({ children }) => <div className="wq-rail">{children}</div>,
  Strip: ({ children }) => <div className="wq-strip">{children}</div>,
};

/* P1-6 — segmented progress: colour AND fill pattern */
function ProgressBar({ order, firstResults, total }) {
  return (
    <div className="wq-prog" role="img" aria-label={order.length + " of " + total + " words read"}>
      {Array.from({ length: total }).map((_, i) => {
        const w = order[i], r = w ? firstResults[w] : null;
        const cls = r === "correct" ? "ok" : r === "close" ? "mid" : r === "wrong" ? "bad" : "todo";
        return <span key={i} className={"wq-seg wq-seg-" + cls} />;
      })}
    </div>
  );
}

function Toast({ children }) { return <div className="wq-toast" role="status">{children}</div>; }

function Modal({ title, children, onClose }) {
  const boxRef = useRef(null);
  const returnRef = useRef(null);
  useEffect(() => {
    returnRef.current = document.activeElement;
    const box = boxRef.current;
    const focusables = () => box.querySelectorAll("button, [href], input, select, textarea");
    const first = focusables()[0];
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables(); if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const r = returnRef.current;
      if (r && r.focus) r.focus();
    };
  }, [onClose]);
  return (
    <div className="wq-modalwrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="wq-modal" ref={boxRef}>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: C.ink }}>{title}</h3>
        {children}
      </div>
      <button className="wq-scrim" onClick={onClose} aria-label="Close" tabIndex={-1} />
    </div>
  );
}

/* Carried-1 — deliberate adult gesture: pointer hold ~450ms; keyboard activates directly */
function HoldButton({ onFire, disabled, color, label }) {
  const [holding, setHolding] = useState(false);
  const tRef = useRef(null);
  const clear = () => { if (tRef.current) clearTimeout(tRef.current); tRef.current = null; setHolding(false); };
  const down = (e) => {
    if (disabled) return;
    e.preventDefault();
    setHolding(true);
    tRef.current = setTimeout(() => { clear(); onFire(); }, 450);
  };
  const key = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFire(); }
  };
  useEffect(() => clear, []);
  return (
    <button className={"wq-sbtn wq-hold" + (holding ? " holding" : "")} disabled={disabled}
      style={{ borderColor: color, color }}
      onPointerDown={down} onPointerUp={clear} onPointerLeave={clear} onPointerCancel={clear}
      onKeyDown={key} aria-label={label + " (hold)"}
    >
      <span className="wq-holdfill" style={{ background: color }} aria-hidden="true" />
      <span style={{ position: "relative" }}>{label}</span>
    </button>
  );
}

function Stat({ n, label, emoji }) {
  return <div className="wq-card" style={{ padding: 10 }}>
    <div style={{ fontSize: 20 }}>{emoji}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{n}</div>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink2 }}>{label}</div>
  </div>;
}

function H3({ children }) {
  return <h3 style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em",
    textTransform: "uppercase", color: C.muted }}>{children}</h3>;
}

function Seg({ options, value, onChange, disabled = [] }) {
  return (
    <div className="wq-seggroup" role="group">
      {options.map(([v, label]) => {
        const on = value === v, off = disabled.includes(v);
        return <button key={String(v)} onClick={() => !off && onChange(v)} disabled={off} aria-pressed={on}
          className={"wq-segbtn" + (on ? " on" : "")}>{label}</button>;
      })}
    </div>
  );
}

/* ============================ styles ============================ */

const CSS = `
.wq-root{
  height:100vh; height:100dvh; width:100%; overflow:hidden;
  background:linear-gradient(160deg,#8fd0fa 0%,#b9c3fb 55%,#d9c6fb 100%);
  font-family:ui-rounded,'SF Pro Rounded',system-ui,-apple-system,'Segoe UI',sans-serif;
  color:${C.ink};
}
.wq-shell{height:100%;max-width:640px;margin:0 auto;display:flex;flex-direction:column;min-height:0}
.wq-display{font-family:ui-rounded,'SF Pro Rounded',system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.02em}
.wq-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}

/* zones — P0-1 / P1-8: fixed three-zone shell, page never scrolls in a session */
.wq-header{flex:0 0 auto;min-height:52px;display:flex;align-items:center;gap:6px;padding:8px 12px}
/* N-4: overflow-y auto never engages at default text sizes, but gives 200% text a way out */
.wq-stage{flex:1 1 auto;min-height:0;display:flex;justify-content:center;padding:6px 14px;
  overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.wq-stage>*{margin:auto}
.wq-stage.wq-scroll>*{margin:10px auto}
.wq-rail{flex:0 0 auto;padding:8px 14px 6px}
/* N-5: extra bottom padding keeps controls out of the home-indicator swipe band */
.wq-strip{flex:0 0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  padding:8px 12px calc(18px + env(safe-area-inset-bottom));
  background:rgba(255,255,255,.72);border-top:1px solid ${C.line};backdrop-filter:blur(6px)}
.wq-center{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}

/* stage content: fixed slots so nothing shifts (P0-2) */
.wq-stagegrid{width:100%;max-width:440px}
.wq-word{font-size:clamp(2.25rem,11vh,5.5rem);font-size:clamp(2.25rem,11dvh,5.5rem);
  font-weight:700;line-height:1.05;color:${C.ink};margin:4px 0 0;word-break:break-word}
.wq-slot-tiles{min-height:52px;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px}
.wq-tile{background:${C.sun};color:${C.ink};border-radius:12px;padding:5px 12px;
  font-size:clamp(1.1rem,3.2dvh,1.6rem);font-weight:700;box-shadow:0 1px 3px rgba(23,53,107,.18)}
.wq-slot-msg{height:52px;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:4px}

/* controls */
.wq-cta{display:block;width:100%;border:0;border-radius:999px;background:${C.action};color:#fff;
  font:800 clamp(1rem,2.4dvh,1.25rem)/1.1 inherit;padding:16px 18px;cursor:pointer;
  box-shadow:0 3px 10px rgba(23,53,107,.18);min-height:56px}
.wq-cta:disabled{cursor:default;box-shadow:none}
.wq-prompt{text-align:center;font-weight:800;color:${C.ink};font-size:clamp(.95rem,2.2dvh,1.1rem);padding:16px 0;min-height:56px}
.wq-btn-plain{border:0;background:rgba(255,255,255,.85);color:${C.ink};font:700 13px/1 inherit;
  padding:11px 13px;border-radius:999px;cursor:pointer;min-height:40px}
.wq-chip{background:rgba(255,255,255,.85);color:${C.ink};font:800 12.5px/1 inherit;padding:7px 10px;border-radius:999px;display:inline-block}
.wq-striplabel{font:800 9.5px/1 inherit;letter-spacing:.12em;text-transform:uppercase;color:${C.strip};opacity:.85}
.wq-sbtn{background:#fff;border:1.5px solid ${C.line};border-radius:9px;color:${C.strip};
  font:700 12.5px/1 inherit;padding:0 12px;min-height:44px;min-width:44px;cursor:pointer} /* N-6 */
.wq-hold{position:relative;overflow:hidden;touch-action:none}
.wq-holdfill{position:absolute;inset:0;width:0;opacity:.22}
.wq-hold.holding .wq-holdfill{width:100%;transition:width .45s linear}
.wq-sbtn:disabled{opacity:.38;cursor:default}
.wq-mark{flex-basis:100%;font-size:11px;color:${C.strip};opacity:.9}

/* progress (P1-6: colour + pattern) */
.wq-prog{display:flex;gap:2px;width:100%}
.wq-seg{flex:1;height:9px;border-radius:2px;min-width:3px}
.wq-seg-todo{background:rgba(255,255,255,.55)}
.wq-seg-ok{background:${C.green}}
.wq-seg-mid{background:repeating-linear-gradient(135deg,${C.sun} 0 3px,#fff 3px 6px)}
.wq-seg-bad{background:repeating-linear-gradient(90deg,${C.red} 0 2px,#fff 2px 4px)}

/* cards / forms */
.wq-card{background:#fff;border-radius:18px;box-shadow:0 2px 10px rgba(23,53,107,.12);text-align:center}
.wq-lbl{display:block;font:800 11px/1.3 inherit;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};margin-bottom:5px}
.wq-help{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:${C.muted}}
.wq-input{width:100%;border:1.5px solid ${C.line};border-radius:10px;padding:11px 12px;
  font:600 15px/1.3 inherit;color:${C.ink};background:#fff;min-height:44px}
.wq-fieldrow{margin-top:14px}
.wq-seggroup{display:flex;gap:4px;background:${C.chip};border-radius:11px;padding:3px;flex-wrap:wrap}
.wq-segbtn{flex:1 1 auto;min-width:44px;min-height:40px;border:0;background:transparent;border-radius:8px;
  color:${C.strip};font:800 13px/1 inherit;cursor:pointer}
.wq-segbtn.on{background:#fff;color:${C.ink};box-shadow:0 1px 3px rgba(23,53,107,.2)}
.wq-segbtn:disabled{opacity:.4;cursor:default}
.wq-rowbtn{display:flex;align-items:center;width:100%;border:0;background:transparent;padding:4px 0;cursor:pointer;min-height:40px}
.wq-meter{display:flex;height:6px;border-radius:3px;background:${C.chip};overflow:hidden;margin-top:6px}
.wq-trophy{display:inline-flex;align-items:center;justify-content:center;border:4px solid transparent;
  border-radius:999px;padding:10px 18px}

/* overlays */
/* P2-2: toast sits above the action rail, never over the header */
.wq-toast{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(112px + env(safe-area-inset-bottom));
  background:${C.ink};color:#fff;padding:10px 16px;border-radius:999px;font:700 13px/1.3 inherit;
  max-width:88%;text-align:center;z-index:70}
.wq-modalwrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;z-index:80}
.wq-scrim{position:absolute;inset:0;background:rgba(23,53,107,.42);border:0;order:-1}
.wq-modal{position:relative;z-index:1;background:#fff;border-radius:18px;padding:18px;max-width:380px;width:100%;
  box-shadow:0 12px 40px rgba(23,53,107,.3)}

/* a11y + motion */
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid ${C.ink};outline-offset:2px}
.wq-float{animation:wqf 2s ease-in-out infinite}
@keyframes wqf{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

/* landscape: word left, controls right (P2-1) */
@media (orientation:landscape) and (min-width:640px) and (min-height:420px){ /* N-7 */
  .wq-shell{max-width:960px}
  .wq-stage{padding:6px 22px}
  .wq-stagegrid{max-width:820px;display:grid;grid-template-columns:1.1fr 1fr;gap:26px;align-items:center}
  .wq-stagegrid>div{text-align:left}
  .wq-word{font-size:clamp(3rem,17dvh,7rem)}
  .wq-slot-tiles,.wq-slot-msg{justify-content:flex-start;align-items:flex-start;text-align:left}
}
`;
