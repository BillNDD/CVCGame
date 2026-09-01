import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";

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
 {"n":1,"name":"First Sounds","emoji":"🐣","focus":"the first six sounds","words":["an","ant","as","at","in","it","sat","sit","nap","pan"]},
 {"n":2,"name":"First Sounds","emoji":"🐣","focus":"swapping one sound","words":["i","pin","pit","sip","tin","pat","sap","tan","tap","tip"]},
 {"n":3,"name":"First Sounds","emoji":"🐣","focus":"the short o","words":["the","into","not","on","pot","stop","top","pop","spot","tot"]},
 {"n":4,"name":"First Sounds","emoji":"🐣","focus":"the c sound","words":["a","can","cat","cop","cap","cot","cost","catnip"]},
 {"n":5,"name":"First Sounds","emoji":"🐣","focus":"the m sound","words":["is","am","man","mom","mop","map","mat","camp","mint","mist"]},
 {"n":6,"name":"First Sounds","emoji":"🐣","focus":"plural -s, and the s that buzzes","words":["to","cops","pots","spots","tops","maps","cats"]},
 {"n":7,"name":"First Sounds","emoji":"🐣","focus":"the e sound","words":["he","comes","men","pet","ten","net","pen","set","nest","step","tent","pep"]},
 {"n":8,"name":"First Sounds","emoji":"🐣","focus":"the d sound","words":["we","and","did","end","mad","nod","sad","sand","dad","den","dip","damp","dent","mend","pad","pod"]},
 {"n":9,"name":"First Sounds","emoji":"🐣","focus":"the g sound","words":["me","gas","gets","got","get","gap","pigpen","dog","dogs","pig","dig","nag","peg","pigs","sag","tag"]},
 {"n":10,"name":"First Sounds","emoji":"🐣","focus":"MILESTONE - First Sounds","words":["be","had","ham","hand","has","hat","hats","hid","him","his","hit","hint","hog"]},
 {"n":11,"name":"Letter Land","emoji":"🔠","focus":"the f sound","words":["she","fan","fast","fat","fin","find","fit","if","fed","gift","soft","fog","fig","fond","sift"]},
 {"n":12,"name":"Letter Land","emoji":"🔠","focus":"the b sound","words":["you","bad","bed","bit","bat","bib","bin","cab","best","bet","dab","bag","big","beds","bond","nab","sob","tab"]},
 {"n":13,"name":"Letter Land","emoji":"🔠","focus":"the l sound","words":["of","land","led","left","let","lid","lot","lots","animal","leg","flag","last","lend","list","melt"]},
 {"n":14,"name":"Letter Land","emoji":"🔠","focus":"the u sound","words":["was","but","dust","fun","hunt","mud","must","nut","sun","tub","up","bug","bugs","bump","gulf","gulp","lug","mug","nun"]},
 {"n":15,"name":"Letter Land","emoji":"🔠","focus":"the r sound","words":["said","from","her","ram","ran","rat","red","rid","rod","rub","run","frog","rag","brag","raft","rib","rig","rim","rob"]},
 {"n":16,"name":"Letter Land","emoji":"🔠","focus":"the v and k sounds","words":["are","ever","lived","kid","van","desk","kids","milk","ask","kit","vat","dusk","keg","kept","mask","risk","silk","task","vet"]},
 {"n":17,"name":"Letter Land","emoji":"🔠","focus":"the j and w sounds","words":["have","jump","jumps","just","swam","swim","want","went","wet","win","jig","jog","jug","twig","wag","wed","wig","wilt","wit"]},
 {"n":18,"name":"Letter Land","emoji":"🔠","focus":"the z and x sounds","words":["they","ax","ox","box","fix","fox","six","zap","zip","fax","mix","nix","sax","vex","zag","zig"]},
 {"n":19,"name":"Letter Land","emoji":"🔠","focus":"the y sound","words":["my","yes","yam","yak","yap","yet"]},
 {"n":20,"name":"Letter Land","emoji":"🔠","focus":"MILESTONE - All The Letters","words":["do","held","hits","hold","hop","hot","old","us","laptop","sunset","bus","log","logs","pump","pun","snug","sub","sum","tug"]},
 {"n":21,"name":"Letter Teams","emoji":"🤝","focus":"doubled endings","words":["go","bill","fell","fill","grass","hill","kiss","smell","tell","buzz","doll","umbrella","puff"]},
 {"n":22,"name":"Letter Teams","emoji":"🤝","focus":"the sh sound","words":["no","brush","dish","fish","ship","shop","shot","wish","wash","hush","mash","shrub","posh","push","rash","rush","sash","sham","shin","shun"]},
 {"n":23,"name":"Letter Teams","emoji":"🤝","focus":"the ch sound","words":["so","benches","branches","chop","rich","chin","chip","chat","chest","much","such","chill","lunch","bench","munch","chap","chess"]},
 {"n":24,"name":"Letter Teams","emoji":"🤝","focus":"the quiet th","words":["bathtub","thank","thankful","thin","think","bath","path","moth","thud","thump","cloth","month","math"]},
 {"n":25,"name":"Letter Teams","emoji":"🤝","focus":"the buzzy th","words":["there","that","them","then","this","with","than","brother","other"]},
 {"n":26,"name":"Letter Teams","emoji":"🤝","focus":"the ck spelling","words":["back","black","duck","kick","lick","lock","luck","pick","rack","rock","chick","chicks","check","chuck","neck","peck","puck","shock"]},
 {"n":27,"name":"Letter Teams","emoji":"🤝","focus":"the wh sound","words":["when","what","whack","wham","whiff","whim","whip","whizz","which"]},
 {"n":28,"name":"Letter Teams","emoji":"🤝","focus":"the ng sound","words":["sing","king","long","bang","fang","gong","hang","hung","lung","bring","something","ding","ping","rang","ring","rung","sang","song"]},
 {"n":29,"name":"Letter Teams","emoji":"🤝","focus":"the qu spelling","words":["quick","quit","quack","quiz","quill","quip","squash"]},
 {"n":30,"name":"Letter Teams","emoji":"🤝","focus":"MILESTONE - Every First Spelling","words":["rocks","sack","sacks","shack","sick","sock","socks","well","dug","hug","chug","chum","rot","shut","tack","thick","trim","trip"]},
 {"n":31,"name":"Busy Blends","emoji":"🧩","focus":"one more sound at the end","words":["help","lamp","lift","pond","rest","romp","band","bank","belt","bend"]},
 {"n":32,"name":"Busy Blends","emoji":"🧩","focus":"more sounds at the end","words":["hands","tents","nests","belts","lamps","desks","gifts","next"]},
 {"n":33,"name":"Busy Blends","emoji":"🧩","focus":"two at the start: s-","words":["sled","slip","spin","skip","slam","slid","snap","stem","swan","swap"]},
 {"n":34,"name":"Busy Blends","emoji":"🧩","focus":"two at the start: l- and r-","words":["clap","drum","flat","glad","grab","grin","drop","plan","plum","trap"]},
 {"n":35,"name":"Busy Blends","emoji":"🧩","focus":"start and end together","words":["blind","stand","stamp","stomp","plant","drink","trunk","skunk","print","blend","crust"]},
 {"n":36,"name":"Busy Blends","emoji":"🧩","focus":"three at the start","words":["spring","scrap","scrub","splash","split","strap","string","strip","strong"]},
 {"n":37,"name":"Busy Blends","emoji":"🧩","focus":"the -ing ending","words":["brushing","fishing","hunting","singing","yelling"]},
 {"n":38,"name":"Busy Blends","emoji":"🧩","focus":"the -er ending, the doer","words":["helper","jumper","singer","another","mother"]},
 {"n":39,"name":"Busy Blends","emoji":"🧩","focus":"compounds","words":["backpack","dustbin","hilltop","sandbox"]},
 {"n":40,"name":"Busy Blends","emoji":"🧩","focus":"MILESTONE - Longer Words","words":["will","yell","cub","cup","gum","hen","hum","jam","job","lap","rug","undo","sung","tick","tuck","wick","wing"]},
 {"n":41,"name":"Word Builders","emoji":"🧱","focus":"two beats","words":["having","never","buses","cobweb","glasses","illness","muffin"]},
 {"n":42,"name":"Word Builders","emoji":"🧱","focus":"two beats with a digraph","words":["windmill","rocket","pocket","bucket","jacket","sandwich","chicken","thunder","chipmunk","whisper"]},
 {"n":43,"name":"Word Builders","emoji":"🧱","focus":"the -ed ending saying /t/","words":["jumped","licked","picked","asked","helped","kicked","mixed","packed","dressed","brushed"]},
 {"n":44,"name":"Word Builders","emoji":"🧱","focus":"the -ed ending saying /d/","words":["filled","yelled","spilled","spelled","smelled","buzzed","drilled","chilled","grilled"]},
 {"n":45,"name":"Word Builders","emoji":"🧱","focus":"the -ed ending saying /id/","words":["ended","landed","lifted","wanted"]},
 {"n":46,"name":"Word Builders","emoji":"🧱","focus":"two letters, one sound","words":["getting","quitting","sitting","stopped","stopping","swimming","butter","hammer","ladder","pepper","biggest","digging","rabbit"]},
 {"n":47,"name":"Word Builders","emoji":"🧱","focus":"the -es ending","words":["boxes","brushes","foxes","wishes"]},
 {"n":48,"name":"Word Builders","emoji":"🧱","focus":"the -le ending","words":["little","apple","candle","handle","middle","simple","waffle","bubble"]},
 {"n":49,"name":"Word Builders","emoji":"🧱","focus":"the e at the end with a job","words":["kitten","dinner","mitten","puppet"]},
 {"n":50,"name":"Word Builders","emoji":"🧱","focus":"MILESTONE - Word Builder","words":["mitt","mess","miss","pack","pal","pup","rap","rip","shed","shell","thing","unlock"]},
 {"n":51,"name":"Magic Letters","emoji":"✨","focus":"the -y that says the long e","words":["finally","very","funny","happy","jelly","lucky","penny","puppy","sandy","silly","every"]},
 {"n":52,"name":"Magic Letters","emoji":"✨","focus":"the -y that says the long i","words":["fly","by","cry","dry","shy","sky","sly","spy","try","why","butterfly"]},
 {"n":53,"name":"Magic Letters","emoji":"✨","focus":"y turns into i, and the -ly ending","words":["cried","dried","happier","spied","tried","gladly","quickly","softly"]},
 {"n":54,"name":"Magic Letters","emoji":"✨","focus":"three beats","words":["besides","banana","wonderful"]},
 {"n":55,"name":"Magic Letters","emoji":"✨","focus":"a after w","words":["wax","wand","water","wallet"]},
 {"n":56,"name":"Magic Letters","emoji":"✨","focus":"review: everything so far","words":["web","cups","hens","lids","pens","twin","all","bash","bell","boss","sunny","things"]},
 {"n":57,"name":"Magic Letters","emoji":"✨","focus":"long a: a_e","words":["ate","cake","cakes","came","game","gate","gates","lake","same","save","gave","made","waves"]},
 {"n":58,"name":"Magic Letters","emoji":"✨","focus":"long a: ai and ay","words":["day","lay","pail","pain","paint","play","rain","say","stay","tail","player","way"]},
 {"n":59,"name":"Magic Letters","emoji":"✨","focus":"long a: two more spellings","words":["eight","freight","sleigh","weigh","weight","grey","hey","obey"]},
 {"n":60,"name":"Magic Letters","emoji":"✨","focus":"MILESTONE - The Long A","words":["hate","late","make","makes","take","tame","buck","bud","bun","bush","unhappy","windy"]},
 {"n":61,"name":"Vowel Voyage","emoji":"⛵","focus":"long e: ee","words":["see","deep","feed","feel","feet","green","meet","meets","need","seed","seem","seen"]},
 {"n":62,"name":"Vowel Voyage","emoji":"⛵","focus":"long e: ea","words":["deal","each","eagle","eagles","eat","eating","leaf","leave","mean","meat","reader","seat","teaching"]},
 {"n":63,"name":"Vowel Voyage","emoji":"⛵","focus":"long e: three more spellings","words":["these","honey","money","monkey","valley","babies","brief","chief","field","niece","pennies","piece","ponies"]},
 {"n":64,"name":"Vowel Voyage","emoji":"⛵","focus":"long o: o_e and oa","words":["coat","coats","goat","holes","notes","road","broke","hole","home","hope","come","love","nose","note","some","those"]},
 {"n":65,"name":"Vowel Voyage","emoji":"⛵","focus":"long o: ow and oe","words":["slowly","throw","snow","show","grow","slow","toe","goes","window","yellow","pillow","rainbow"]},
 {"n":66,"name":"Vowel Voyage","emoji":"⛵","focus":"long i: i_e","words":["likes","bite","dime","dive","fine","five","hide","inside","like","line","mile","nine","shine","side","smile","time","white","live"]},
 {"n":67,"name":"Vowel Voyage","emoji":"⛵","focus":"long i: igh and ie","words":["bright","flies","high","light","might","pie","tie","night","right","sight"]},
 {"n":68,"name":"Vowel Voyage","emoji":"⛵","focus":"long i before two sounds","words":["kind","mild","mind","wild","child","kindly","behind","cold","gold","fold","sold","told","bolt"]},
 {"n":69,"name":"Vowel Voyage","emoji":"⛵","focus":"the same spelling, another job","words":["read","head","bread","ready","heavy","feather","weather","breakfast","spread","thread"]},
 {"n":70,"name":"Vowel Voyage","emoji":"⛵","focus":"MILESTONE - All Five Long Sounds","words":["goats","cash","cod","cuff","cut","dam","dash","deck","dim","dock","sheep","yesterday"]},
 {"n":71,"name":"Sound Safari","emoji":"🦁","focus":"the lazy vowel","words":["sleeping","holiday","needed","painted","painter","planted","printed","printer","redo"]},
 {"n":72,"name":"Sound Safari","emoji":"🦁","focus":"open syllables in longer words","words":["baby","lady","paper","lazy","bacon","maple","gravy","later","apron","table","over","tiger","tigers"]},
 {"n":73,"name":"Sound Safari","emoji":"🦁","focus":"dropping the e before an ending","words":["liked","noses","saved","biting","smiled"]},
 {"n":74,"name":"Sound Safari","emoji":"🦁","focus":"the oo of moon","words":["moon","pool","room","soon","too","tooth","zoom"]},
 {"n":75,"name":"Sound Safari","emoji":"🦁","focus":"the oo of book","words":["good","book","look","looked","took","put","cube"]},
 {"n":76,"name":"Sound Safari","emoji":"🦁","focus":"long u: u_e, ew and ue","words":["blue","clue","cute","dew","few","glue","mule","new","true","use"]},
 {"n":77,"name":"Sound Safari","emoji":"🦁","focus":"the ou sound: ou and ow","words":["found","now","out","young","could","flowers","cow","down","how","loud","house","mouse","our","outside","proud","shouted","sound","sounds","town","wow"]},
 {"n":78,"name":"Sound Safari","emoji":"🦁","focus":"the oi sound: oi and oy","words":["boy","going","toy","boil","coin","enjoy","join","loyal","point","royal","noise","soil","spoil"]},
 {"n":79,"name":"Sound Safari","emoji":"🦁","focus":"the ar sound","words":["arm","around","barn","car","card","cars","dark","far","farm","farms","charm","farmer","hard","park","part","start","started","tar","yard"]},
 {"n":80,"name":"Sound Safari","emoji":"🦁","focus":"MILESTONE - Every Vowel","words":["dot","fall","fizz","fuss","fuzz","gash","gush","gut","hem","hip","sleep","teeth"]},
 {"n":81,"name":"Secret Letters","emoji":"🕵","focus":"the or sound: or and ore","words":["for","born","corn","more","or","shore","sore","store","story","tore","horse","torn","worker"]},
 {"n":82,"name":"Secret Letters","emoji":"🕵","focus":"the aw sound: aw, au and augh","words":["away","caught","claw","crawl","dinosaur","draw","haul","jaw","laugh","lawn","paw","sauce","saw","straw","yawn"]},
 {"n":83,"name":"Secret Letters","emoji":"🕵","focus":"the er sound: two more spellings","words":["were","birds","girl","bird","burn","curl","dirt","first","purple","shirt","turn","church","nurse","survey","third"]},
 {"n":84,"name":"Secret Letters","emoji":"🕵","focus":"the ear sound","words":["deer","ear","ears","hear","here","near","year"]},
 {"n":85,"name":"Secret Letters","emoji":"🕵","focus":"the air sound","words":["where","careful","careless","unfair"]},
 {"n":86,"name":"Secret Letters","emoji":"🕵","focus":"the all and alk family","words":["talk","talked","talking","talks","walk","walked","walking","magic"]},
 {"n":87,"name":"Secret Letters","emoji":"🕵","focus":"soft c and soft g","words":["generous","huge","cities","city","cent","pencil","circle","circus","ginger","princess","gem","germ"]},
 {"n":88,"name":"Secret Letters","emoji":"🕵","focus":"the -tch and -dge endings","words":["catch","badge","bridge","edge","fetch","fudge","judge","match","matches","pitch","scratch","watch"]},
 {"n":89,"name":"Secret Letters","emoji":"🕵","focus":"letters that stay quiet","words":["knock","knit","knob","knot","lamb","limb","wrap","wreck","wren","wrong","climb","thumb"]},
 {"n":90,"name":"Secret Letters","emoji":"🕵","focus":"MILESTONE - Every Sound","words":["hub","huff","hut","jab","jazz","jet","jot","jut","lab","lad","tree","trees"]},
 {"n":91,"name":"Story Summit","emoji":"🏔","focus":"the f sound: ph and gh","words":["alphabet","dolphin","elephant","graph","phone","photo"]},
 {"n":92,"name":"Story Summit","emoji":"🏔","focus":"the ough family","words":["dough","though","through","rough","tough","enough","cough","bought","brought","fought","ought","thought"]},
 {"n":93,"name":"Story Summit","emoji":"🏔","focus":"the -stle ending","words":["bustle","castle","nestle","rustle","whistle","wrestle","thistle"]},
 {"n":94,"name":"Story Summit","emoji":"🏔","focus":"ch does another job","words":["school","anchor","stomach","chorus","mechanic","orchestra","machine"]},
 {"n":95,"name":"Story Summit","emoji":"🏔","focus":"the sh sound in longer words","words":["action","ancient","motion","nation","social","special","station"]},
 {"n":96,"name":"Story Summit","emoji":"🏔","focus":"the ch sound in longer words","words":["adventure","capture","future","mixture","nature","picture"]},
 {"n":97,"name":"Story Summit","emoji":"🏔","focus":"prefixes","words":["under","disagree","dishes","dislike","precious","remember","rested","retell","return","uncle"]},
 {"n":98,"name":"Story Summit","emoji":"🏔","focus":"the -ful ending","words":["helpful","playful","useful","handful","cheerful","joyful","painful","powerful","awful","spoonful","mouthful","peaceful"]},
 {"n":99,"name":"Story Summit","emoji":"🏔","focus":"the -less and -ness endings","words":["darkness","endless","helpless","hopeless","kindness","sadness"]},
 {"n":100,"name":"Story Summit","emoji":"🏔","focus":"MILESTONE - Reader","words":["lash","lip","lit","loss","lush","met","mill","mob","muck","mush","teach","teacher"]},
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
 "1": [{"id":"s:v3-l01-01","text":"An ant sat."}],
 "2": [{"id":"s:v3-l02-01","text":"I sip."},{"id":"s:v3-l02-02","text":"I tap."}],
 "3": [{"id":"s:v3-l03-01","text":"I spot an ant."},{"id":"s:v3-l03-02","text":"I stop at the top."}],
 "4": [{"id":"s:v3-l04-01","text":"I can nap."},{"id":"s:v3-l04-02","text":"I can pop the cap."}],
 "5": [{"id":"s:v3-l05-01","text":"Mom is at camp."},{"id":"s:v3-l05-02","text":"I can mop the mat."},{"id":"s:v3-l05-51","text":"The mat. Is the cat on the mat? The cat is on the mat."},{"id":"s:v3-l05-52","text":"The mat."},{"id":"s:v3-l05-53","text":"Is the cat on the mat?"},{"id":"s:v3-l05-54","text":"The cat is on the mat."}],
 "6": [{"id":"s:v3-l06-01","text":"I am in camp."},{"id":"s:v3-l06-02","text":"I can spot mom."},{"id":"s:v3-l06-03","text":"I can spot cats."},{"id":"s:v3-l06-04","text":"The cats sit on maps."}],
 "7": [{"id":"s:v3-l07-01","text":"He is in the tent."},{"id":"s:v3-l07-02","text":"Ten men set a tent."}],
 "8": [{"id":"s:v3-l08-01","text":"Dad and I sat in the sand."},{"id":"s:v3-l08-02","text":"We can nap in the den."}],
 "9": [{"id":"s:v3-l09-01","text":"Dad gets me a pet."},{"id":"s:v3-l09-02","text":"We got to the pigpen. A pig can nap in it."}],
 "10": [{"id":"s:v3-l10-01","text":"He hid his hat in the sand."},{"id":"s:v3-l10-02","text":"I had ham and a nap."},{"id":"s:v3-l10-51","text":"The man has a pen. Is the pen in his hand? It is in his hand."},{"id":"s:v3-l10-52","text":"The man has a pen."},{"id":"s:v3-l10-53","text":"Is the pen in his hand?"},{"id":"s:v3-l10-54","text":"It is in his hand."},{"id":"s:v3-l10-55","text":"He has a pen in his hand."},{"id":"s:v3-l10-56","text":"The man has a hat."}],
 "11": [{"id":"s:v3-l11-01","text":"She can find the gift."},{"id":"s:v3-l11-02","text":"The gift is soft."},{"id":"s:v3-l11-51","text":"She has the hat."}],
 "12": [{"id":"s:v3-l12-01","text":"You can nap in the bed."},{"id":"s:v3-l12-02","text":"A bat hid in the bin."}],
 "13": [{"id":"s:v3-l13-01","text":"Dad left the lid on the pot."},{"id":"s:v3-l13-02","text":"Mom let me get the map."},{"id":"s:v3-l13-51","text":"She has left the nest."}],
 "14": [{"id":"s:v3-l14-01","text":"I sat in the mud. Mom got the tub. It was fun!"},{"id":"s:v3-l14-02","text":"The sun is up. We sit in the sand and spot bugs. A big bug hid in the dust!"}],
 "15": [{"id":"s:v3-l15-01","text":"The ram ran from the pen. It ran to the red tent. Dad got it."},{"id":"s:v3-l15-02","text":"A frog sat on the step. I ran up to it. It hid from me!"}],
 "16": [{"id":"s:v3-l16-01","text":"Dad has a red van. The kids and I are in it. We can nap and sip milk in the van."},{"id":"s:v3-l16-02","text":"I ask Mom if I can sit at the desk. She said I can. I get a red pen."}],
 "17": [{"id":"s:v3-l17-02","text":"The dog went in the mud. It jumps up at me, and I get wet. It is just a bit of fun!"},{"id":"s:v3-l17-03","text":"I hid in the big tent. Dad just did not spot me. I win!"},{"id":"s:v3-l17-51","text":"She has just fed it."},{"id":"s:v3-l17-52","text":"Did you jump into the mud?"},{"id":"s:v3-l17-53","text":"I have a nut."}],
 "18": [{"id":"s:v3-l18-01","text":"A fox sat in the box. It did not want to get up. We let it nap."},{"id":"s:v3-l18-02","text":"The rat ran from the box."},{"id":"s:v3-l18-51","text":"The rat ran from the box."}],
 "19": [{"id":"s:v3-l19-01","text":"I want a yak. A fat yak can not fit in my bed. My yak must nap on the mat!"},{"id":"s:v3-l19-02","text":"Mom got a big yam. I had a bit of it. Yes, it is the best!"}],
 "20": [{"id":"s:v3-l20-01","text":"The man has a pen. Is the pen in his hand? It is in his hand."},{"id":"s:v3-l20-02","text":"The bus got us to camp. It was hot. We sat on a big log at sunset."},{"id":"s:v3-l20-51","text":"Let us run and jump."}],
 "21": [{"id":"s:v3-l21-01","text":"My doll fell on the hill. I ran up and got it. It gets a kiss!"},{"id":"s:v3-l21-02","text":"We go to sit on the grass. It is wet! I tell Mom, and she gets us a mat."}],
 "22": [{"id":"s:v3-l22-01","text":"We got a fish at the shop. It can swim fast! I wish I had six."},{"id":"s:v3-l22-02","text":"I had a big red ship. Dad and I set it in the tub. It did not tip!"}],
 "23": [{"id":"s:v3-l23-01","text":"The fish is so soft."},{"id":"s:v3-l23-02","text":"The ship is so fast."},{"id":"s:v3-l23-03","text":"The mat. Is the cat on the mat? The cat is on the mat."},{"id":"s:v3-l23-51","text":"But not so."}],
 "24": [{"id":"s:v3-l24-01","text":"We went up the hill. My hat fell in the grass!"},{"id":"s:v3-l24-02","text":"Mom got me a big red pot of mint. I thank Mom, and I set it in the sun!"}],
 "25": [{"id":"s:v3-l25-01","text":"My brother is fast. I run with him to the top."},{"id":"s:v3-l25-02","text":"This big ox is in the pen with the pig. We fed them, and then we went in."},{"id":"s:v3-l25-51","text":"It was not there."},{"id":"s:v3-l25-52","text":"There they go!"}],
 "26": [{"id":"s:v3-l26-01","text":"A duck is on the rock. We wish it luck."},{"id":"s:v3-l26-02","text":"The black chick ran to the back of the box. I pick it up, and it can nap in my hand."},{"id":"s:v3-l26-51","text":"This duck can swim."}],
 "27": [{"id":"s:v3-l27-01","text":"What is in the box? I pick it up. It is a black hat!"},{"id":"s:v3-l27-02","text":"When we got back, I got a whiff of hot ham. Mom had it in a big pan. We ran to sit!"},{"id":"s:v3-l27-51","text":"But what of that?"},{"id":"s:v3-l27-52","text":"But what is that?"},{"id":"s:v3-l27-53","text":"What has he in his hand?"}],
 "28": [{"id":"s:v3-l28-01","text":"The king can sing. Bang the gong! It went on so long."},{"id":"s:v3-l28-02","text":"Mom said to bring something red. I did bring my red hat. Then Mom hung it up on the hat rack!"}],
 "29": [{"id":"s:v3-l29-01","text":"The duck is quick. It quit the quiz! We run and run."},{"id":"s:v3-l29-02","text":"There is a black quill in the grass. I am quick to pick it up! Mom said I can hang it up in my den."}],
 "30": [{"id":"s:v3-l30-01","text":"My socks are in the sack. I fill it up with rocks. We can not hold it up!"},{"id":"s:v3-l30-02","text":"Dad and I dug a big pit in the sand. Mom said it is the best pit yet. We got a big hug!"}],
 "31": [{"id":"s:v3-l31-01","text":"We went to the pond. The duck is on the bank. We fed it, then had a rest."},{"id":"s:v3-l31-02","text":"The fat duck swam to the bank, and we fed her."},{"id":"s:v3-l31-51","text":"The fat duck swam to the bank, and we fed her."}],
 "32": [{"id":"s:v3-l32-01","text":"The lamp is on the desk. We lift it up. I help mom hold it."},{"id":"s:v3-l32-02","text":"Mom said we can go to the shop. I got my socks and my belt on, quick! Then we ran to the bus."}],
 "33": [{"id":"s:v3-l33-01","text":"Let us run, and skip, and jump on the bank."},{"id":"s:v3-l33-02","text":"We skip on the grass. I slip! I get up and skip on."},{"id":"s:v3-l33-51","text":"Let us run, and skip, and jump on the bank."}],
 "34": [{"id":"s:v3-l34-01","text":"I grab a plum. I drop it in the grass! I grin and grab it back."},{"id":"s:v3-l34-02","text":"I had a plan. Dad and I can be a band! He gets the drum, and I clap and sing."}],
 "35": [{"id":"s:v3-l35-01","text":"I can not find my hat. I hunt in the tent. I hunt in the grass. Yes! It is in the grass."},{"id":"s:v3-l35-02","text":"A frog sat on a flat rock. I did not step, and the frog did not hop. Then a bug fell in the grass. The frog got it with a snap!"}],
 "36": [{"id":"s:v3-l36-01","text":"It is spring! We skip to the pond. I splash and splash. My socks are wet, but it is fun!"},{"id":"s:v3-l36-02","text":"Six chicks sit in a nest. A chick got a bit of string in his bill. He ran with it, and the other chicks ran with him. Then the string split, and the chicks fell in the grass!"}],
 "37": [{"id":"s:v3-l37-01","text":"We went fishing at the pond. Dad was singing. I was yelling, a fish! We had fun in the sun."},{"id":"s:v3-l37-02","text":"I am brushing my dog on the mat. He did not want to sit. He was hunting a bug in the dust! The bug went up, he went up with it, and I was yelling, get it!"}],
 "38": [{"id":"s:v3-l38-01","text":"I am a helper. I help mom scrub the pots. My brother is a singer. We sing and clap!"},{"id":"s:v3-l38-02","text":"I am a jumper. I can jump from the step to the mat. Then I jump from the mat to another step. My mother is a jumper as well!"}],
 "39": [{"id":"s:v3-l39-01","text":"I fill my backpack. We went up to the hilltop. Then we run to the sandbox. We land in the sand!"},{"id":"s:v3-l39-02","text":"My pig ran from the pigpen. She went into the dustbin and got a bit of ham! Then she ran back with it. Dad and I had to fix the dustbin."}],
 "40": [{"id":"s:v3-l40-01","text":"The fat hen is on the box. The rat ran from the box. Can the hen run?"},{"id":"s:v3-l40-02","text":"The cub had jam on his hand."},{"id":"s:v3-l40-51","text":"The fat hen is on the box. The rat ran from the box. Can the hen run?"},{"id":"s:v3-l40-52","text":"She is a black hen. She has left the nest."},{"id":"s:v3-l40-53","text":"The fat hen is on the box."},{"id":"s:v3-l40-54","text":"Can the hen run?"},{"id":"s:v3-l40-55","text":"She is a black hen."},{"id":"s:v3-l40-56","text":"The fat hen has left the nest."},{"id":"s:v3-l40-57","text":"Has the black hen left the nest?"},{"id":"s:v3-l40-58","text":"The man has fed the black hen and the fat duck."},{"id":"s:v3-l40-59","text":"The hen has run to her nest."},{"id":"s:v3-l40-60","text":"I will tell you."}],
 "41": [{"id":"s:v3-l41-01","text":"I am having a muffin. A bit fell on the mat. The cat ran up. She got it fast!"},{"id":"s:v3-l41-02","text":"I went into the den to get my drum. A cobweb was on it! Mom got her glasses and did find a bug in the cobweb. So I got my drum and left the bug having his rest, and I never did brush that cobweb."}],
 "42": [{"id":"s:v3-l42-01","text":"The windmill is on the hilltop. We went up to it. It can spin so fast! Dad held my hand and we sat and had a plum."},{"id":"s:v3-l42-02","text":"Dad did not have his jacket at the shop. We went back to the van to find it. It was not in the van! Then Mom got it from the backpack, and Dad was so glad."}],
 "43": [{"id":"s:v3-l43-01","text":"We packed the backpack. Mom asked if I want milk. I picked milk. Dad helped us zip it up."},{"id":"s:v3-l43-02","text":"I got up and dressed. Mom asked me to help, so I picked up the pots and brushed the mat. Dad mixed a big pot of jam. When it was set, we had it on the step in the sun."}],
 "44": [{"id":"s:v3-l44-01","text":"Mom filled the tub. I got in with my duck. Then I did a splash. I yelled to mom, and she got wet! We had fun."},{"id":"s:v3-l44-02","text":"Dad filled the big tub with sand and set it in the grass. I filled my cup with sand and did tip it up into a hill. Then my brother ran up and did kick it! I yelled, and he sat and helped me fix it. We filled the tub up, and my hill was as big as the tub."}],
 "45": [{"id":"s:v3-l45-01","text":"I wanted to sled. Dad lifted me up on the hill. I slid so fast, and I landed on my back! We did it a lot. Then the fun ended and we went in."},{"id":"s:v3-l45-02","text":"I wanted a plum from the top of the shrub, but I am not big. Dad lifted a box and set it in the grass. I got up on the box and picked a plum! Then it slid from my hand and landed in the mud. I got back up and picked another, and the hunt ended well."}],
 "46": [{"id":"s:v3-l46-01","text":"The king stopped."},{"id":"s:v3-l46-02","text":"I am swimming at the pond. Dad is sitting on the bank. The sun went in, so I stopped. Mom got me a hot cup of milk. I am so glad!"},{"id":"s:v3-l46-51","text":"The king stopped."}],
 "47": [{"id":"s:v3-l47-01","text":"We fed the foxes. I filled six boxes with fish. We set the boxes in the grass. The foxes got the fish! Mom wishes we had six foxes."},{"id":"s:v3-l47-02","text":"The den had a lot of dust in it. Mom got the brushes, and we packed the old pots into boxes. Up on top I did find a bat, hung up and at rest. Mom said to let him be, so we did not brush that bit of the den. The bat has his spot, and my brother wishes that spot was his!"}],
 "48": [{"id":"s:v3-l48-01","text":"I wash the dish. A little bubble went up. It got to the middle of the den! Then - pop! Simple fun."},{"id":"s:v3-l48-02","text":"Mom has a little pot with a red handle. She let me hold the handle and tip the milk into my cup. I did it, and not a bit fell! Mom said, that was simple. Then we sat in the middle of the mat and had milk and an apple."}],
 "49": [{"id":"s:v3-l49-01","text":"My kitten is at dinner with us. She got my mitten! I tell her, that is not dinner. She let it drop. Then she hid in my lap."},{"id":"s:v3-l49-02","text":"Dad got me a puppet rabbit at the shop. I can get my hand in it, and then it can hop! At dinner I let it nod and grin at Mom. She said it is the best rabbit in the land. Then my puppet had a bit of my dinner."}],
 "50": [{"id":"s:v3-l50-01","text":"I went to the shed with my pup. He got in a mess! He had a mitt and a shell. The sack had a rip in it. My pal and I packed it up."},{"id":"s:v3-l50-02","text":"My pal has an old box in his shed. It has a lock on it, and we did rap on the lid to get it up. Then Dad got a pin and did unlock it! In it we did find a black rock and an old map. My pal said that map is the best thing he has, so we went to find the spot on it."}],
 "51": [{"id":"s:v3-l51-01","text":"I had jelly on my hand. A bug landed on it. It wanted the jelly! I was very happy. I did not want it to go."},{"id":"s:v3-l51-02","text":"I did find a penny in the sandy grass at the step. It was very old, and every bit of it was black. Mom said a penny as old as that is lucky. I did rub it with a rag, and finally it was not black. My lucky penny is in a little box, and I am so happy with it."}],
 "52": [{"id":"s:v3-l52-01","text":"My rabbit is shy. I try to spy on her. She is by the shed! She is very sly. Why is she so shy?"},{"id":"s:v3-l52-02","text":"Mom hung the wet socks up to dry in the sun. Then the sky went black. I said, why not get them in? We did try, and we got every sock in fast. Mom said I was quick, and my socks are dry."}],
 "53": [{"id":"s:v3-l53-01","text":"My puppy got wet in the pond. I spied him on the bank. I dried him with my hat. Then he tried to get back in! He was happier wet than dry."},{"id":"s:v3-l53-02","text":"My kitten had a nap in the sun on the mat. I went in softly, as I did not want to get her up. Then Dad did drop a pot, and she got up quickly and ran! I tried to find her, and finally I spied her in a box. She was happier in that box than on the mat, so I let her be."}],
 "54": [{"id":"s:v3-l54-01","text":"Mom had a banana in her backpack. She let me have it at the pond. It was wonderful. Besides the banana, she had a muffin. I had that as well."},{"id":"s:v3-l54-02","text":"It was wet, so Mom got the big umbrella. My brother and I got in with her, and we did not get a drop on us. We went to the shop and got a banana and a red apple. Then we ran back and had them on the step. Mom said the umbrella is a wonderful thing."}],
 "55": [{"id":"s:v3-l55-01","text":"I had a wand of wax. It fell in the tub. The water was hot, and the wax got soft. My wand was a mess! Mom said she will fix it."},{"id":"s:v3-l55-02","text":"The ram wanted water, and the sun was so hot. I got a big pot and filled it up at the tap. When I went to his pen, water went on my socks! I set the pot in, and he did lap it up fast. Mom said the ram and I did well."},{"id":"s:v3-l55-51","text":"It fell into the water."}],
 "56": [{"id":"s:v3-l56-01","text":"My twin and I have ten hens. The hens are in a pen. We fill six cups with water. We set the cups in the pen. The hens run to us! They have all the water."},{"id":"s:v3-l56-02","text":"It was sunny, so Mom got all the pots and lids from the shed. She set the things on the grass. My brother and I had to find the lid of every pot. A lot of lids did not fit, and we had to try and try. A web was on a big lid, and I did yell! Then all the pots had lids, and Mom said we can have dinner."},{"id":"s:v3-l56-51","text":"The men have all left the ship."}],
 "57": [{"id":"s:v3-l57-01","text":"We came to the lake. Mom had a cake in her backpack. She did save it as a gift. We ate the cake by the gate. Then we had a game on the grass. We ran to the gate and back."},{"id":"s:v3-l57-02","text":"My brother made up a game. We had to hop from the step to the gate and back, and every hop had to be the same. He went and did not drop a bit. Then I went, and I fell in the grass! We did it a lot, and finally I got to the gate and back. Mom came and gave us a plum."}],
 "58": [{"id":"s:v3-l58-01","text":"The rain did not stop all day. We had to stay in. Mom got the paint and a pail of water. I did paint a yak with a long tail. My twin did paint the rain. Then we lay on the mat to rest."},{"id":"s:v3-l58-02","text":"It was a sunny day, and Mom said we can stay in the grass all day. She gave me a pail and said, fill it at the tap. I did fill it to the top. On the way back I did slip, and all the water went in the grass! My brother helped me fill it up, and we got it back to Mom. She said it was the best way to end a sunny day."}],
 "59": [{"id":"s:v3-l59-01","text":"Eight sacks sat by the gate. I had to weigh them all. Every sack was the same weight. Then I set the freight in the sleigh. The yak went up the hill, step by step. At the top we had a rest in the sun."},{"id":"s:v3-l59-02","text":"The sleigh went so fast that the eight hens in it had to hold on."}],
 "60": [{"id":"s:v3-l60-01","text":"A tame buck comes to the bush by the shed every day. This day he is late. Mom makes a bun and I take it to the gate. Then the buck comes up the hill, fast. He gets the bun in a snap. He is never late when a bun is on the gate."},{"id":"s:v3-l60-02","text":"The ram is so tame that he will take a bun from my hand."},{"id":"s:v3-l60-51","text":"I will take you back."},{"id":"s:v3-l60-52","text":"Will you take dinner with us."}],
 "61": [{"id":"s:v3-l61-01","text":"I set a seed in a deep pit and fill it with mud. Every day I feed it water. I need to see a green stem. Then, on a hot day, I see it. The stem is little and green. I feel so happy that I run to tell Mom."},{"id":"s:v3-l61-02","text":"Every day the hens meet me at the gate. They can see the tin in my hand, and they need what is in it. When I feed them, they run in and I can feel them on my feet. The green hen is not fast, so she gets to the tin at the end. I hold a bit back and feed her from my hand. She is the best hen I have."},{"id":"s:v3-l61-03","text":"A swan meets me at the deep green pond every day, and she is never late."},{"id":"s:v3-l61-51","text":"See the duck on the pond!"},{"id":"s:v3-l61-52","text":"I can just see it."},{"id":"s:v3-l61-53","text":"Did you see him there?"}],
 "62": [{"id":"s:v3-l62-02","text":"Eagles have a nest up on the rocks by the lake. Dad and I sat on a seat and did see them. Each day they leave the nest to hunt, and each day they get back with meat. The little eagles can not fly yet, so they sit in the nest and eat. Dad said that by spring they will leave the nest as well. I want to be on that seat when they do."},{"id":"s:v3-l62-03","text":"We had dinner on the grass. Mom gave each of us a seat on the old mat. We had meat and a green apple, and there was a lot to eat. Then a leaf fell into my cup! Dad got it, and I did not leave a drop. It was the best dinner we have had."}],
 "63": [{"id":"s:v3-l63-01","text":"A monkey sat in the valley with six pots of honey. He had no money, but he did not need it. Then a fox came up the hill to see these pots. The monkey said yes when the fox asked to have a dip. The fox ran back and got a pot of jam to swap. Then the monkey had honey and jam, and a pal as well."},{"id":"s:v3-l63-02","text":"An ant got into the honey in the valley, and it did not want to go back."}],
 "64": [{"id":"s:v3-l64-01","text":"A goat got into the shed and ate my coat. It has six holes in it. I hope Mom can fix them. She held it up and said it can be a hen nest. We hung the coat on the gate by the road. Then six hens sat in the six holes, and every hen was happy."},{"id":"s:v3-l64-02","text":"The van broke on the road home, so Dad had to fix it in the rain."}],
 "65": [{"id":"s:v3-l65-02","text":"The old goat gets up the hill slowly at sunset. I sit on the gate and hold her pail of seed. When she gets to me, I throw the seed into her dish. She can eat it fast, as it is a long way up that hill. Then she has a rest by the gate, and I go home. Each day I sit and hold that pail, and each day she gets up the hill slowly to meet me."},{"id":"s:v3-l65-03","text":"My brother set a big pail in the grass. We had to throw an old sock into it from the step. He got it in, and I did not. So I went slowly up to the pail and did drop the sock in! He said that was not the game. Then he let me have a go from the step, and it went in!"}],
 "66": [{"id":"s:v3-l66-01","text":"A swan likes to dive in the deep pond by my home. I sat on a rock with a bun in my hand. When she came up, I let her have a bite. She got it and went to hide inside the green grass. Then five hens came and sat in a line on the bank. It was a fine day at the pond."},{"id":"s:v3-l66-02","text":"Five kids came to my home to play. I had to hide, and the best spot was inside the shed. I sat on a sack and did not let them see me. Then a hen came inside and sat on my hat. I had to jump up, and then they all ran in. It was a fine game, and the hen was the best of us all."},{"id":"s:v3-l66-03","text":"When it is hot, the rabbit likes to hide inside a hole in the bank."},{"id":"s:v3-l66-51","text":"They like grass, and will take it from his hand."}],
 "67": [{"id":"s:v3-l67-01","text":"Mom set a hot pie on the step. The sun was bright and high, and the pie was hot all day. Then the flies came, as they wanted the pie as well. I sat by the step and did my best to help. But every fly that went up came back. So Dad got a net and set it on top of the pie. The flies had to go, and we had the pie at sunset."},{"id":"s:v3-l67-02","text":"The cat got so high up that we might need a ladder."}],
 "68": [{"id":"s:v3-l68-01","text":"A wild rabbit lived in a hole behind the shed. The day was mild, so I sat on the grass with a bit of my bun. The rabbit came up, but he stopped by the gate. I did not mind, as a wild rabbit is not a pet. Every day I sat in the same spot with the same bun. Then, on a mild day in spring, he came and ate from my hand. Mom said he picked me, as I was kind and did not grab at him."},{"id":"s:v3-l68-02","text":"It is kind to let the wild duck have the pond, and I do not mind at all."}],
 "69": [{"id":"s:v3-l69-01","text":"Mom had to go to the shop, so she left notes on the desk. My brother read them to me at the desk. The notes said to feed the cat and fill her dish with water. Then we had to get the socks from the line and fold them. At the end, the notes said we can have a cake. We did every job, and then we had the cake. When Mom came back, my brother read the notes to her as well."},{"id":"s:v3-l69-02","text":"Dad read the map to me at the top of the hill, and then we went to the lake."}],
 "70": [{"id":"s:v3-l70-01","text":"We went to the dock at sunset, when the light was dim. Dad held the net and I held the rod. A fat cod came up and had a bite at my line. I had to dash to get the net, and my cuff got wet. We got the cod up on the deck, and it was as long as my hand. Dad said it was the best cod he had ever had on his rod. Then we let it go, and it went in with a splash."},{"id":"s:v3-l70-02","text":"The goats ate the grass on the dam, so Dad did not have to cut it."}],
 "71": [{"id":"s:v3-l71-01","text":"It was a holiday, so we went to see the sheep. Every sheep was sleeping in the sun, and we needed them to get up. We sat on the grass and had an apple. Then a man came with a sack of dinner. The sheep got up so fast that my apple went in the mud. Mom said that was the best bit of the holiday. When we got home, I painted a sheep and we hung it up."},{"id":"s:v3-l71-02","text":"The painter had to redo the gate, as the ram got red paint on his back."}],
 "72": [{"id":"s:v3-l72-01","text":"It was sunny, so we had breakfast at the table by the maple. Mom had on her apron, and the pan of bacon was hot. The smell of it got the baby up from her bed. My dog was very lazy and did not get up at all. The sun was bright on the baby, so I made her a hat from paper. The lady from the hill came by, and Mom gave her some bacon and gravy. Later we all sat in the grass, and my lazy dog came to sit with us."},{"id":"s:v3-l72-02","text":"The lady up the road has hens and a baby goat. On a windy day in spring she let me help. She gave me an apron, as the mud was deep by the gate. The baby goat was not lazy at all, and he ran up to get at my bucket. I fell back in the grass by the maple, and the hens went this way and that. Later she made me bacon, and there was gravy to dip my bread in. I went home with honey in a paper bag, and the baby goat came to the gate to see me go."}],
 "73": [{"id":"s:v3-l73-01","text":"Mom saved up and got me a pup. He liked biting every sock in the shed. My brother said the pup had to stop, as we had no socks left. So I got him an old mitt, and he liked that best of all. The mitt has six holes in it, and my socks have no holes at all. He licked the noses of all the cats as well, but they did not mind. Mom smiled and said the mitt was the best gift she had got me."},{"id":"s:v3-l73-02","text":"I saved up my cash and got a drum, and every cat in the shed ran when I hit it."}],
 "74": [{"id":"s:v3-l74-02","text":"It was late, and Mom let me stay up to see the moon. We sat on the step, and it was cold. The moon was big and white, and it was so bright that I did see every leaf on the shrub. Soon a fox went by, right in the light of it! Mom said hush, and the fox went on up the hill and did not see us. Then it got too cold to sit, and we went in. From my bed I can see the moon, and it is in my room as well."},{"id":"s:v3-l74-03","text":"It was a hot day, so Dad filled the little pool in the grass. My brother and I got in, and the water was so cold that we did yell! Soon the sun made it hot, and we did not want to get up. We had a game: we had to zoom from side to side and not stop. Then Dad got in with us, and a lot of the water went on the grass! We had to fill it up, and this time Dad sat on the step. It was the best hot day we have had."}],
 "75": [{"id":"s:v3-l75-01","text":"Mom took me to the shop to get a book. I looked at every book on the rack. The best had a red fox on it and a hen on the back. It was a good book, and it did not cost a lot. We took it home and I read it to Mom at sunset. Then she read it back to me, and we looked at every bit of it. It is my best book, and I hope we can go back to that shop."},{"id":"s:v3-l75-02","text":"My cat looked at the book and then sat on it."},{"id":"s:v3-l75-51","text":"Is this a good pen?"}],
 "76": [{"id":"s:v3-l76-01","text":"The dew on the grass was cold, but the mule did not mind."},{"id":"s:v3-l76-02","text":"My brother got a new pot of blue glue. He wanted to fix a little cube that broke. He set the cube on a mat and held it. A few spots of glue fell on his hand and dried. He said that was fine. It was not true, and he had to wash his hand a lot."},{"id":"s:v3-l76-51","text":"The sky is as blue as it can be."}],
 "77": [{"id":"s:v3-l77-01","text":"The young cow was so loud that the hens ran out of the shed."},{"id":"s:v3-l77-02","text":"Now the flowers by the pond lay flat. We could not find out how. Then we found a young cow down in the middle of them. She was loud when we came, and she did not want to get up. Mom said the cow liked flowers as well as we did."},{"id":"s:v3-l77-51","text":"It is not hot, now. Let us run and jump."},{"id":"s:v3-l77-52","text":"Now the duck will swim in the pond."},{"id":"s:v3-l77-53","text":"It is not hot, now."},{"id":"s:v3-l77-54","text":"It is not hot now."},{"id":"s:v3-l77-55","text":"How happy they are!"}],
 "78": [{"id":"s:v3-l78-01","text":"The boy did not enjoy going to bed, but the cat did."},{"id":"s:v3-l78-02","text":"The boy took his toy ship down to the pond. His dog ran to join him, and a swan came to see. The boy set the ship going, and it went this way and that. Then the ship came to a stop in the soil at the bank. The loyal dog went in and got it back! The boy held his wet toy up high, and the swan swam up and down. They all sat in the sun as the ship dried. It was a fine day, and the boy did enjoy it."}],
 "79": [{"id":"s:v3-l79-01","text":"It was dark in the barn, and the little goat did not want to go in far."},{"id":"s:v3-l79-02","text":"We went far out to the farm. It was dark when we got there. My brother led me around the barn to see the new goats. Every goat was sleeping in the grass, so we let them rest. Then we went back to the car and had a nap as well."}],
 "80": [{"id":"s:v3-l80-01","text":"Every hen on the farm fell in the mud, and now every hen has to get a wash."},{"id":"s:v3-l80-02","text":"A little rabbit had a home behind the shed. Every day it came out to sit in the sun, and every day the cat went to look at it. The cat did not want to run at it. She just sat down and looked. Now the rabbit will not run when the cat comes, and they rest in the sun."},{"id":"s:v3-l80-51","text":"I will not let it fall."},{"id":"s:v3-l80-52","text":"Did you see that boy fall down?"}],
 "81": [{"id":"s:v3-l81-01","text":"A little goat was born at the farm, and now the barn has a new bed in it."},{"id":"s:v3-l81-02","text":"Dad got a sack of corn at the store. On the road home the sack tore, and the corn went down the hill. We had to pick up every bit, and my arm got sore. Dad said we will tell that story for ever. He got a new sack, and he held it with his arm around it."},{"id":"s:v3-l81-51","text":"The man has fed the black hen and the fat duck. Now the duck will swim in the pond. The hen has run to her nest. Let us not stop at the pond now, for it is hot."},{"id":"s:v3-l81-52","text":"Let us not stop at the pond now, for it is hot."}],
 "82": [{"id":"s:v3-l82-01","text":"My little brother can draw a dinosaur, but the jaw is as long as the tail."},{"id":"s:v3-l82-02","text":"I did draw a dinosaur and cut it out. My brother took it away and set it down on the lawn. The kitten went to crawl up on it, and she caught the tail with a claw. Then she had to haul that dinosaur all around the lawn. Mom looked out and had to laugh."}],
 "83": [{"id":"s:v3-l83-01","text":"The birds were all on the gate, and the cat had to turn around and go home."},{"id":"s:v3-l83-02","text":"The girl planted her first seed in the dirt behind the shed. The sun was hot, and she did not want the seed to burn, so she set her purple shirt over it. Birds came to look, but they could not get in. When she went back, a green curl was up out of the dirt. She did a little turn in the grass, and her shirt had dirt on it all day."},{"id":"s:v3-l83-51","text":"A nest with young birds in it."},{"id":"s:v3-l83-52","text":"So she left the birds."}],
 "84": [{"id":"s:v3-l84-01","text":"A deer was at the gate when we got up, and it looked at us as if we got up late."},{"id":"s:v3-l84-02","text":"A deer came down to the farm when it was dark. It went around the barn and stopped at the corn. The goats looked at the deer, and the deer looked back at the goats. Then the deer took a bite of corn and ran up the hill. Now the goats look up at that hill every day, and every day they wish."}],
 "85": [{"id":"s:v3-l85-01","text":"Be careful where you step, or you will land in the mud."},{"id":"s:v3-l85-02","text":"I had to take a cup of water down the hill to the camp. Mom said to be careful, so I looked at where I set every step. Then I got to the flat grass and got careless. The cup slid out of my hand and landed in the dirt. Mom did not fuss. She got me a new cup and said to be careful to the end."},{"id":"s:v3-l85-51","text":"He could not see where the ship was going."},{"id":"s:v3-l85-52","text":"If the men do not stop, let us go with them and see where they go."},{"id":"s:v3-l85-53","text":"Where can it be?"}],
 "86": [{"id":"s:v3-l86-01","text":"We walked all around the pond, and my pal talked and talked."},{"id":"s:v3-l86-02","text":"Every day we walked the old mule down to the pond. He was not fast. He stopped to look at the grass, and he stopped to look at the birds, and then he just stopped. Dad talked to him as they walked. When we got back it was dark, and the mule had not talked back a bit."}],
 "87": [{"id":"s:v3-l87-01","text":"It was a huge cake, and my brother was generous with it."},{"id":"s:v3-l87-02","text":"My brother got a huge muffin at the shop. It was as huge as his hand. He looked at it and looked at it. Then he broke it and held out the best bit to me. Mom said that was generous, and my brother went red. It was the best muffin I have had."}],
 "88": [{"id":"s:v3-l88-01","text":"The puppy will fetch, but she will not let go."},{"id":"s:v3-l88-02","text":"At camp we had a jump match down by the bridge. The judge was my brother, and he sat on a rock at the edge of the grass. Every kid got to jump, and every kid got a bit of fudge at the end. I did not get the badge. My brother said the badge went to the best jump, and then he let me have his fudge as well."},{"id":"s:v3-l88-51","text":"Then the cat can not catch it."}],
 "89": [{"id":"s:v3-l89-01","text":"The wren did not knock, and now she has a nest in the shed."},{"id":"s:v3-l89-02","text":"Mom set out to knit a wrap for the little lamb that was born in the cold. The pup wanted to help, and that went wrong. He got the string in a huge knot and ran with it all around the desk. It took us all day to get every knot out. The lamb has the wrap now, and the pup has the rest of the string."}],
 "90": [{"id":"s:v3-l90-01","text":"We sat in the little hut and let the rain fall all around us."},{"id":"s:v3-l90-02","text":"A jet went over the farm, and the old ox looked up at it. The hens did not look up at all. They just went on with the corn. When the jet went away, the ox looked at us. We could not tell him how a jet gets up that high, so we got him more corn as well."}],
 "91": [{"id":"s:v3-l91-01","text":"The photo of the elephant was so funny that we had to laugh."},{"id":"s:v3-l91-02","text":"Dad had a photo of a dolphin on his phone. He held it up so we could all see. The dolphin was up out of the water, and it looked as if it had a huge grin. My brother wanted to look at it every day, so Dad printed it out and we hung it up over his bed. Now he will tell every kid at camp that he has a photo of a dolphin that can laugh."}],
 "92": [{"id":"s:v3-l92-01","text":"The dough was rough, though it did make a good muffin in the end."},{"id":"s:v3-l92-02","text":"My brother had a cough, so he had to rest in bed all day. Mom bought him a book, and I brought him a cup of water. He said that was not enough, so I brought him the cat as well. The cat got up on his bed and did not get down. It was a tough day, though it ended well."}],
 "93": [{"id":"s:v3-l93-01","text":"Dad let out a whistle, and the puppy ran to him from the far end of the farm."},{"id":"s:v3-l93-02","text":"At the shore my pal and I had a castle of wet sand. It took all day to get it up. Then the waves came in, and there was a bustle to save it. Dad had to whistle to us to get back up the shore. We sat in the grass and looked as the top of the castle went down in the waves. Dad said we can go back and get a new castle up."}],
 "94": [{"id":"s:v3-l94-01","text":"Our school has a big night in spring, and this year I was in the chorus. The school bus did not start, so a mechanic had to come and fix it. We got there late, and my stomach was in a knot. The orchestra went on first, and the drum was so loud that I had to grin. Then it was time for the chorus, and the knot in my stomach let go. We had to sing, and every note was right, up to the high note at the end. When it was over, there was a long table of cakes and jelly for us all. I ate so much that my stomach was sore. On the way home the bus went by the shore, and the moon was bright on the old anchor down on the sand."},{"id":"s:v3-l94-02","text":"Our school got to go out on an old ship for the day. It took six men to get the anchor up. A mechanic came with us, and he was down there in the dark all day, where it is very hot. When we got out on the water, the ship went up and down. My stomach did not like that at all, and I had to sit down. The men gave me dry bread and a cup of water, and it helped. Then our school orchestra got up on the deck to play. The chorus had to sing over the sound of the waves. When the anchor went down at the shore, we did not want to go home."}],
 "95": [{"id":"s:v3-l95-01","text":"That old station is so ancient that a wren has a nest over the gate."},{"id":"s:v3-l95-02","text":"We walked to the ancient station by the lake. It was a special day, and every kid at camp got a job. My brother got the old windmill in motion, and it went around and around. I had to fill the cups and hand them out. The action did not stop all day, and when the sun went down we all sat in the grass and had a rest."},{"id":"s:v3-l95-51","text":"There were no waves to set it in motion."}],
 "96": [{"id":"s:v3-l96-01","text":"We had a little adventure out in the grass, and I got a picture of a wren."},{"id":"s:v3-l96-02","text":"We had an adventure down by the pond. We got a mixture of mud and water in an old pot, and we painted a picture of the pond on a flat rock. My brother wanted to capture the swan in it, but the swan did not sit long enough. That is nature. So the picture has the pond, the grass, and a fat spot where the swan was. We set it up on the desk in the shed, and it will be there in the future."}],
 "97": [{"id":"s:v3-l97-01","text":"My uncle will retell that same story every day, and we let him."},{"id":"s:v3-l97-02","text":"My uncle came to the farm for the day. He and Dad disagree on all of it, and they can do it all day and never get mad. When dinner was over they did the dishes, and they went on with it over every cup. My brother and I dislike the dishes, so we sat under the desk and let them. Then my uncle rested a bit and got up to retell the story of the deer at the station. We can remember every bit of that story, but we let him tell it. When he had to return home, Dad went to the gate with him. Dad said a brother is precious, and that is true when he is wrong as well."},{"id":"s:v3-l97-51","text":"The duck has her nest under the rock. It is not hot now. Let us run, and skip, and jump on the bank."},{"id":"s:v3-l97-52","text":"See the duck on the pond! Her nest is up on the bank, under the rock."},{"id":"s:v3-l97-53","text":"Her nest is up on the bank, under the rock."},{"id":"s:v3-l97-54","text":"The duck has her nest under the rock."}],
 "98": [{"id":"s:v3-l98-01","text":"Mom softly said that we had helped enough, and we gladly sat down."},{"id":"s:v3-l98-02","text":"Mom had a lot of boxes to get up the hill, and I gladly went to help. The duck came as well. A duck is playful, and a playful duck is not helpful. He got in the middle of the boxes, and they all fell down. Mom kindly said that was fine, and we picked them up quickly. Then she softly told the duck to sit in the grass, and he did. He was more useful sitting down."}],
 "99": [{"id":"s:v3-l99-01","text":"The kindness of my brother is endless when there is fudge in it for him."},{"id":"s:v3-l99-02","text":"The goat comes to the gate every day. When I have corn, he jumps. Mom said my kindness is endless. But I said it is the corn that he likes, not me. Then we walked to the barn and back, and he stopped at every good bit of grass."}],
 "100": [{"id":"s:v3-l100-01","text":"Look how far you got, and look how fast you can read now."},{"id":"s:v3-l100-02","text":"We all met at the gate when the sun was up. The goat came, and the kitten came, and the swan was out on the pond. We walked down the lush grass and looked at the water. My brother got his feet in the muck and did not mind a bit. When it got dark, Dad lit the lamp and we all sat around it. Mom said we can go back every day, and we will."},{"id":"s:v3-l100-51","text":"I met him on the step. Did you jump into the mud? I have a nut. I met the man."},{"id":"s:v3-l100-52","text":"I met him on the step."},{"id":"s:v3-l100-53","text":"I met the man."}],
};

const TRICKY = {
  into: "Tricky word! The o sounds like “oo” — in-too.",
  find: "Tricky word! The i says its name — fynd.",
  old: "Tricky word! The o says its name — ohld.",
  hold: "Tricky word! The o says its name — hohld.",
  come: "Tricky word! The o sounds like “uh” — kum.",
  some: "Tricky word! The o sounds like “uh” — sum.",
  love: "Tricky word! The o sounds like “uh” — luv.",
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
  /* THE THREE SIGHT WORDS (fault AS, owner-ruled 2026-08-31). Each hands a
     child TWO sounds they have never met, in one word, and the bank holds no
     word teaching either of the two alone - so unlike the words fixed by
     moving a teacher a level earlier, no ordering rescues these. They are on
     every sight-word list ever printed, and naming a word tricky is what this
     game already does for `come`, `some` and `what`. Shown only, never spoken:
     S4 is untouched, exactly as the note above this one says. */
  comes: "Tricky word! The o sounds like \u201cuh\u201d \u2014 kumz.",
  could: "Tricky word! The l is quiet and ou sounds like \u201coo\u201d \u2014 kood.",
  machine: "Tricky word! The ch sounds like \u201csh\u201d \u2014 muh-sheen.",
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
  /* `al` belongs before a K and nowhere else (owner-ruled 2026-08-29, from a
     screenshot of the word "all" tiling as al-l). The rule used to admit a
     following L too, which made the -all family the ONE place a doubled
     ending is not a single tile: bell, will, doll, miss, off and buzz all
     show ll/ss/ff/zz whole, and "all" alone showed al + l. That is an S8
     breach, and the comment defending it - "a-ll would teach the short a it
     does not say" - rested on a premise the bend table disproves: the `a` in
     wallet already says short_o by bend, so the `a` in all and fall says aw
     the same way. Tile COUNT is unchanged by this (two tiles either way), so
     every existing per-word bend keeps its index. */
  if (g === "al") return rest.startsWith("k");
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

/* WHICH MASTERED WORDS COME BACK, AND HOW OFTEN (fault AQ, owner-ruled
   2026-08-31). A word at box 5 leaves every due lane, and the only way back is
   the confidence lane's two slots a session. Drawn as a flat lottery over 1,102
   mastered words that is a 551-session wait for every word alike - most of a
   year, and the same maintenance budget spent on `ox` as on `the`. Measured, not
   assumed: in a 200-session run, 69 percent of words went unseen for 50 sessions
   or more, median gap 85.

   Retirement is not a bug to delete. Keeping every word alive at the top
   interval needs about 93 review slots a session and the session has five, so it
   is a BUDGET, and the fault was that the budget was spent by lottery. The
   bands say how it is spent instead: everyday words earn more of it than words a
   child will hardly meet in a book.

   The two lists are GENERATED from the fourteen public-domain books this
   repository already pins - see tools/word-bands.mjs for why that source and
   not a frequency database. A word in neither list is MIDDLE, which is what
   makes the default safe: the 174 bank words no book ranks are phonics drill
   words, and they land in the middle band rather than falling into rare. */
/* GENERATED by tools/word-bands.mjs - do not edit by hand */
const BAND_COMMON = new Set("the and to a he of was in it i you his that said for she as so her had they with but at him on is all not be little this when there what then have were my out them by me do will up if old are now very man from see no could went we came down which time day go good an into did come well back like how king some just can over or thought long away way never where made house more saw must think get home asked mother last has am much other head put say girl than looked took here rabbit tell soon tree first found got make going too take told ever young through let us gave boy these water find look night such ran men every cried why big right yes set something another thing happy left lived next each side hand help white green kind bed might things sat dog far love room seen our fast monkey fell child bird end brought sun new land third story fine princess gold cat lady behind though hands trees under eat run tin red black castle near walked city hard ready try best horse lay tried bring reader having money want box fish light play five high enough feet birds glad mind wanted ask live rest".split(" "));
const BAND_RARE = new Set("cup fun liked proud spread waves silk talking fat spring frog helped throw miss nix outside funny leg seem climb fox hid rat string band bush thick kindness paw uncle blind chief ear plan trap useful hide paper pick sand teach doll fishing fond silly smile chin edge hush lifted makes start deer dry eating eight hunting leaf shouted simple teeth whistle bought butter cakes deal drop rocks teacher careful fetch fought mill pet precious bite line obey pain pit shell swim besides born charm church hunt kitten plant point pots sick thumb yesterday dried fill later likes smiled softly gates lake path rough sounds unhappy yard darkness lap nine pie powerful task wet barn buzz ding draw ladder lot bat dogs elephant gift join month painted pool sack swimming wren dishes fit game kiss lazy log meat pigs seed shed smell dish eagle fan feed nut pat sore thread tick weather awful bang biggest cats cheerful cloth fed grey hum whisper win bath chop duck helpful holes mile needed pen rob seat stopping swan tent weight bump handle hit lamp rid sung talked wishes chick dig ended gladly hut mat mend mist pail rang shot special store thin adventure candle clap finally gets hop landed lock loss nurse plum push rested royal shine sunset thump thunder tiger tore tub wilt careless dust farm feather flag flies hammer lend lit match mud note pillow pin raft sleeping tip torn trunk umbrella wing apron dug goat happier job knock lid mouthful nag pencil puff purple shop sold sunny teaching thistle tops valley wed ancient brushed chicken dime enjoy hey lucky lunch mad printed spin spoil alphabet ax bend bill cost curl damp digging hang lift logs nod pan peck ram rod slip swam tie beds belt chest crust deck dirt flat future goats hats hens huff jacket kicked lick mild motion nature peaceful sadness splash split boil bucket cars circle dew glasses lamb lots paint rap scratch snug spots tigers trip wag wand wit wow wrestle babies brush capture car cough dam dash farms gem hate helpless holiday hopeless illness joyful judge jumps licked matches meets nests noses picture pop pup quack quit rush soil stem stomach strip sum tame tap twig van web wreck bubble butterfly circus coats den desk dough endless fig fog gap gifts jig nap park planted rung sauce skip slow spied spilled talks thankful wallet weigh whack wig boxes brushing camp chat clue cups dusk fold gas glue gulf handful maple melt mixed ox pennies pepper rub sandy shirt shy sly strap toe tot tug wax action ant bacon bin biting bolt brushes bun card chap chicks chilled chorus claw cot crawl dim dock dot drum fin fix generous gong grin ham hem hog kick lawn lip list machine mixture moth muck mule net nun packed peg pens pep pump rag rainbow rim romp rug sacks sap scrub shin sled slid spelled spoonful spy sub tough trim tuck unlock wick windy yell badge bench bet bib brag bud bugs bustle buzzed cash check cities cobweb coin dip drilled eagles grab grilled haul hint hug jaw jog jug kid kit knit loyal mask mess muffin nation notes pack painful pal pitch playful pod print puppy rash risk rustle sandwich sash sham shock shrub singer slam smelled snap social station tack tar toy vex worker wrap yelled yelling zip".split(" "));
/* end generated bands */

/* 50/35/15, the owner's split, written as an exact twenty-slot cycle: ten
   common, seven middle, three rare. A cycle rather than a weighted coin so the
   share is a fact a test can assert rather than an average it has to sample.
   The choice WITHIN a band stays shuffled. He chose this over a sharper 60/30/10
   on the ground that nothing should fully retire - here rare words return about
   every 1,870 sessions rather than 2,805. */
const BAND_CYCLE = [0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 2, 1, 1];
const bandOf = (w) => (BAND_COMMON.has(w) ? 0 : BAND_RARE.has(w) ? 2 : 1);
/* THE AGING TERM (fault AP/AR, owner-ruled 2026-08-31 on the ox decision page).
   A word overdue by more than this many sessions outranks a word that is merely
   stuck. Without it, dueBelow sorts by box alone: INTERVALS[0] and INTERVALS[1]
   are both 1, so a word the child keeps missing is due EVERY session and sits at
   the front of the review lane for ever, while a word they read correctly can
   never outrank it. Measured on the shipped scheduler - a child who misses three
   words over forty sessions - the stuck word fell from 19 appearances to 3, from
   19 consecutive sessions to 2, and from 7.3 percent of every review slot to 1.0,
   and the share of words met exactly once fell from 44.5 percent to 32.7.
   Chosen over a leech threshold, which rests the word and needs a grown-up
   control to bring it back, and over a widening interval, which measured weaker.
   Nothing is recorded about the child and no word is ever abandoned (S1): this
   only reorders a queue. */
const OVERDUE_SESSIONS = 8;
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
  /* THE ART BIBLE'S TOKENS (docs/art-bible.md section 9.3, owner-ruled
     2026-08-22), ADDITIONS ONLY. The thirteen keys above keep their values:
     three bible names collided with them at other values (action, line,
     amber) and enter here as actionBlue, boundary and amberFill, because a
     renamed value would repaint the CTA and every border in a step that
     promises no visible change. Two bible values that failed its own 3:1
     boundary rule are darkened (tileEdge, boundary) and one is admitted as a
     fill only (disabled). The CSS custom properties --wq-<key> are emitted
     from this object in app/src/wq-css.js; no hex or rgb() literal lives
     outside this object (the quality control), and alphas derive from it. */
  inkSecondary:     "#3c4f73",   // supporting text (bible 9)
  surfaceReading:   "#fff9e8",   // the word and sentence field
  surfacePanel:     "#fffdf5",   // the crash screen's ground today; cards and controls when the grown-up-zone step moves them
  skyBlue:          "#8fd0fa",   // the outer gradient, first stop
  skyLavender:      "#b9c3fb",   // the outer gradient, second stop
  skyPurpleMist:    "#d9c6fb",   // the outer gradient, third stop
  gardenNight:      "#1d2c50",   // deep framing
  gardenTeal:       "#2e7d78",   // foliage shadow and water
  gardenMoss:       "#5e8057",   // ground and foliage
  gardenLeaf:       "#7fa660",   // leaf
  stone:            "#b9b1a0",   // stone
  wood:             "#97684f",   // wood
  actionBlue:       "#2057c9",   // the bible's principal child action; C.action stays the CTA's red until a step changes the CTA
  success:          "#18794e",   // completion
  warning:          "#8a4b00",   // warning text
  danger:           "#a83737",   // danger
  boundary:         "#5f7493",   // the bible's line #92A5BF darkened: 2.47:1 to 4.68:1 on surfacePanel
  disabled:         "#9fb4c4",   // a FILL under ink (5.57:1); never an edge - it is 2.10:1 on the panel
  cyanStructural:   "#005a67",   // the accessible edge beneath a glow, 7.51:1 on surfaceReading
  cyanElectric:     "#4eebff",   // playback glow only, never a boundary
  purpleStructural: "#5b3fd6",   // the accessible purple edge
  purpleElectric:   "#9b75ff",   // rare milestone and the Glowseed's light outside its rim (its rim is purpleStructural)
  coralElectric:    "#ff775e",   // warm decorative light
  amberFill:        "#f4b942",   // the bible's amber; C.amber stays the amber TEXT
  tileFace:         "#f6d985",   // the ceramic tile's face
  tileHighlight:    "#fff1b5",   // the tile's highlight
  tileEdge:         "#8f6420",   // the bible's #B8832E darkened: 2.40:1 to 3.78:1 on tileFace
  slot:             "#e6dccb",   // an empty slot
  /* The five below entered on 2026-08-22, the council's after pass on
     step 0: the hex literals the screens and the stylesheet still typed,
     each now a token so that no hex literal lives outside C. Two more were
     typed that day and withdrawn the same day by the re-judgement: the
     empty slot's dashed edge (#94a8c0, 1.94:1 on its ground) and the
     progress ring (#e0ac2b, 1.44:1 on sun) both failed the bible's 3:1 edge
     rule, so the slot reads boundary and the ring reads amber - a visible
     darkening of both, declared. */
  paper:            "#ffffff",   // white surfaces: cards, inputs, the modal, the CTA's text
  warningDeep:      "#96261d",   // the home strip's storage warning: 4.5:1 on the gradient
  chipGreen:        "#c6f2dd",   // the corner's mastery chip: read right twice
  chipAmber:        "#ffe9b3",   // read right once
  chipRed:          "#ffd4d0",   // not yet
  /* Art step 1 (2026-08-22): the sounding tile's face, tileHighlight at .5
     over tileFace - an 11.4% lift in relative luminance, inside bible 11's
     8-12%; ink on it 9.55:1. A token rather than a filter, because the
     contrast walker reads a background colour and cannot read a filter. */
  tileFaceLit:      "#fbe59d",
};

/* A token with an alpha, for shadows, scrims and frosted fills: the triple
   is derived from the token at run time, so ink's 23,53,107 is typed once.
   The quality control refuses rgb() and rgba() literals in an app source.
   Exported through the engine and imported by the app from there - one
   definition in the tree (the third judgement of step 0, 2026-08-22). */
function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

const LANGS = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-CA", label: "English (CA)" },
  { code: "en-AU", label: "English (AU)" },
];

const WORD_LEVEL = {};
LEVELS.forEach(L => L.words.forEach(w => { WORD_LEVEL[w] = L.n; }));

/* ---------- phonics ---------- */
/* Per-word tiling overrides, owner-ruled 2026-08-20: tools/lexicon.csv is
   the tiling authority, and a word whose true tiles the position rules
   cannot produce (going, ginger, away - each proven by the phonics audit)
   gets its row emitted here by the conversion writer. Empty until --write
   runs; the markers below are the writer's splice anchors, in the same
   style the rehearsal slices LEVELS. */
/* GENERATED: WORD_TILES begin (tools/convert-ladder.mjs --write) */
const WORD_TILES = {
 "away": ["a","w","ay"],
 "ginger": ["g","i","n","g","er"],
 "going": ["g","o","i","ng"],
 "laugh": ["l","a","ugh"],
};
/* GENERATED: WORD_TILES end */
/* Longest match first, and a unit that matches the LETTERS but fails its
   position rule falls through to the next length down rather than to a
   letter — so "leg" is l-e-g and not l+e+g by way of a refused le. */
/* The bendless tiling - the position rules with no per-word override - as
   its own exported function, so the conversion writer diffs the lexicon
   against the same model twice running and a second --write is idempotent
   (the first version diffed against chunkWord itself, saw its own overrides
   as agreement, and emitted an empty map). */
function ruleTilesFor(word) {
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
function chunkWord(word) {
  if (WORD_TILES[word]) return [...WORD_TILES[word]];
  return ruleTilesFor(word);
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
  /* 0 sorts first: a long-overdue word is served before the stuck ones. */
  const aged = (ws) => (sNum - ws.dueAt > OVERDUE_SESSIONS ? 0 : 1);
  const dueBelow = entries.filter(([w, ws]) => ws.attempts > 0 && ws.dueAt <= sNum && ws.box < 5 && WORD_LEVEL[w] < level)
    .sort((a, b) => aged(a[1]) - aged(b[1]) || a[1].box - b[1].box || a[1].dueAt - b[1].dueAt).map(([w]) => w);
  /* The confidence lane, banded (AQ). The pool is shuffled first, so the word
     picked inside a band is still arbitrary; the CYCLE then decides which band
     each slot comes from. If a band is empty the next one takes the slot, so a
     child with no rare mastered words loses nothing - the budget moves rather
     than the slot going unused.

     A `!picked` filter used to stand here, with a comment calling it
     load-bearing and citing a 55.5/33.4/11.1 drift without it. Both were wrong,
     and the engineering seat caught them on 2026-09-01: `picked` is empty at
     this line - the first `take` call is thirty lines below - so the filter
     excluded nothing, and the drift it claimed to fix was an artifact of the
     measurement that produced it, not of the lane. Tallying the lane's actual
     picks gives 49.9/35.1/15.1, and 49.9/35.0/15.1 with the filter applied for
     real. It is gone rather than left as a comfort that does nothing. */
  const pools = [[], [], []];
  for (const w of shuffle(entries.filter(([w2, ws]) => ws.box >= 4 && WORD_LEVEL[w2] <= level).map(([w2]) => w2))) pools[bandOf(w)].push(w);
  const confidence = [];
  for (let i = 0; pools[0].length || pools[1].length || pools[2].length; i += 1) {
    const want = BAND_CYCLE[((sNum - 1) * 2 + i) % BAND_CYCLE.length];
    for (let d = 0; d < 3; d += 1) {
      const pool = pools[(want + d) % 3];
      if (pool.length) { confidence.push(pool.shift()); break; }
    }
  }
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

/* ---------- the garden (art project step 0e, owner-ruled 2026-08-22) ----------
   The ladder is COMPLETE when the child is at the last level and its words are
   secure by the same rule promotion uses between levels - and only that. The
   two-perfect-sessions path promotes between levels and never ends the ladder
   (SPEC section 7): checkPromotion returns false at the last level before it
   would consult the streak, and so does this.
   The garden state is the tenth of the levels completed: floor((level - 1) / 10),
   and 10 when the ladder is complete. No cap on the division - the level is
   clamped to 1..100 everywhere it is written (migrate, jumpLevel), so a cap here
   would be code no test could reach and a mutant that could only survive. */
function ladderComplete(state) {
  if (!state || state.level !== LEVELS.length) return false;
  const words = LEVELS[LEVELS.length - 1].words;
  return isSecure(words.filter(w => state.words && state.words[w] && state.words[w].box >= 3).length, words.length);
}
function gardenState(state) {
  if (ladderComplete(state)) return 10;
  const level = state && Number.isFinite(state.level) ? state.level : 1;
  return Math.floor((level - 1) / 10);
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
/* v6, the 2026-08-20 cutover: the 21-level world became the 100-level
   ladder, organised by SOUND rather than difficulty, so an old level number
   has no faithful address in the new one - the old levels' words scatter
   across the whole ladder (measured: old 5 spans new 2-77). The migration is
   therefore the repo's own philosophy, twice over: the stored number stands
   as a FLOOR (never seat a child below ground they held - v4's rule), and
   the box recompute against the NEW ladder lifts a real reader to the first
   rung their own graded words leave unsecure - the same walk v4's recompute
   and the pre-ladder recovery both use. RULED 2026-08-21 on the cutover
   morning page: "Recompute the seat from the child's own graded words."
   The stored-number floor is gone - the first draft kept it, and the audit
   measured the recompute inert behind it (a finished old save kept the
   number 21 and skipped the 29 words the new ladder teaches below it).
   Now the walk alone seats a reader who has graded anything: level 6 for a
   finished beta.21 save (new level 6 seats cops and spots, which the old
   bank never taught), lower for most, and their carried boxes promote the
   known levels after one quick session each. A save with NO graded word
   keeps its stored number, clamped - a number a grown-up set by hand is
   the only evidence such a save holds. */
function migrateV6(s) {
  if (s.version >= 6) return;
  let lvl = LEVELS.length;
  for (let i = 0; i < LEVELS.length; i++) {
    const ws = LEVELS[i].words;
    if (!isSecure(ws.filter(w => s.words[w] && s.words[w].box >= 3).length, ws.length)) { lvl = i + 1; break; }
  }
  const graded = Object.values(s.words || {}).some(w => w && w.attempts > 0);
  s.level = graded ? lvl : Math.min(s.level || 1, LEVELS.length);
  s.version = 6;
}
/* v7, the chunk-ladder rebuild (owner-ruled 2026-08-24: "Place them based on
   their already accepted mastery"). The rungs changed underneath a beta-28
   child - the ear rung is gone and every rung now carries chunks - so an old
   rung NUMBER means something different on the new ladder, which is fault
   X's exact lesson (2026-08-21: "Recompute the seat from the child's own
   graded words"). Every save still ON the ladder is re-seated by the same
   box walk recovery uses: letter marks carry and lift the child past what
   they hold, orphaned ear marks match no item and count for nothing, and
   chunk boxes start empty because reading print is evidence no listening
   mark can stand in for. A graduate (preLevel 0) is never touched. */
function migrateV7(s) {
  if (s.version >= 7) return;
  if (typeof s.preLevel === "number" && s.preLevel > 0) s.preLevel = recoverPreLevel(s);
  s.version = 7;
}
function migrate(s) {
  s = heal(s);
  migrateV3(s); migrateV4(s); migrateV5(s); migrateV6(s);
  if (typeof s.preLevel !== "number") s.preLevel = recoverPreLevel(s);
  migrateV7(s);
  s.level = Math.min(Math.max(1, s.level || 1), LEVELS.length);  // defensive clamp, always
  s.preLevel = Math.min(Math.max(0, s.preLevel || 0), PRE_LEVELS.length);
  return s;
}

const newState = () => ({
  version: 7, level: 1, preLevel: 1, sessionsCompleted: 0, perfectStreak: 0, prePerfectStreak: 0,
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
  /* The doubled consonants, owner-ruled 2026-08-19: "aren't all the new
     chunker units just the same sounds as other sounds? like ll is just l".
     Yes. Every one of these already had a recorded clip; none needed a new
     one. They were missing rows until today, so each resolved to an id like
     "d:tt" that does not exist - latent, because no bank word reached them,
     and armed the moment a level-46 word entered the bank. */
  bb: "b", cc: "k", dd: "d", gg: "g", mm: "m",
  nn: "n", pp: "p", rr: "r", tt: "t",
  /* are, owner-ruled 2026-08-19 after hearing all three candidates: the
     GRAPHEME takes the air sound, because that is what it says inside care,
     share and square. His words: "are: air. But remember the word are alone
     shouldn't follow the air sound." The word itself is bent below. */
  are: "air",
  /* The extended code's single-sound units, owner-accepted 2026-08-19 (R9 of
     the forensic audit). Each mapping is read off tools/ladder/shape-v3.json,
     where the unit is taught with exactly ONE sound, and every target id has a
     shipped clip. ai and ou carry the sounds their levels teach - owner-ruled
     2026-08-19, "The levels' teaching becomes the default", superseding the
     2026-08-12 ruling that neither had one. That first ruling was made when no
     level taught either unit; level 58 now teaches ai as long a and level 77
     teaches ou as the /ow/ of out. The heart words that bend (said, you) keep
     their per-word bends, which win over these defaults exactly as before.
     The six spellings taught with TWO sounds (ea ey ie oo ear ere) stay
     absent - they bend per word. */
  ai: "long_a", ou: "ow",
  ay: "long_a", eigh: "long_a",
  ee: "long_e",
  igh: "long_i",
  oa: "long_o", oe: "long_o",
  ew: "oo_moon", ue: "oo_moon",
  ir: "er", ur: "er", re: "er",
  ore: "or",
  ce: "s", se: "s",
  ci: "sh", ti: "sh",
  dge: "j", ge: "j",
  tch: "ch", tu: "ch",
  le: "l", tle: "l",
  ph: "f", ve: "v",
  /* These five map onto the three approved-and-unshipped sounds (aw, ear, oi).
     The mapping is the shape's own single-sound teaching; the clips ship the
     moment the converted bank asks for them, the way ar and er shipped on
     2026-08-19 when `are` and `were` first asked. */
  al: "aw", au: "aw", augh: "aw",
  eer: "ear",
  oy: "oi",
  /* The identity rows, written 2026-08-20 when the fallback went loud. These
     24 graphemes spell their own sound id - b says d:b, ch says d:ch - and
     for three months they rode the bare fallback, correct by luck of the
     naming rather than by a recorded ruling (B1's own words). Each is now a
     stated decision, which is what lets the fallback below refuse instead of
     guess: after these rows, a grapheme with no row is a grapheme NOBODY has
     ruled on, and the one thing the engine must never do with it is hand back
     a plausible id. d:ow was the proof: the fallback id for an unruled ow IS
     a real shipped clip - the /ow/ cry of out - so "snow" would have played
     the wrong vowel confidently, with no gate able to see it. */
  b: "b", ch: "ch", d: "d", f: "f", g: "g", h: "h", j: "j", k: "k", l: "l",
  m: "m", n: "n", ng: "ng", or: "or", p: "p", qu: "qu", r: "r", s: "s",
  sh: "sh", t: "t", v: "v", w: "w", x: "x", y: "y", z: "z",
  /* Six more identity rows the loud fallback surfaced the moment it landed:
     the ladder's r-controlled and diphthong spellings whose bare fallback id
     was the RIGHT sound - ar in car, air in chair, aw in saw, ear in hear,
     er in her, oi in coin - correct by luck like the 24 above, now stated.
     What the sweep deliberately did NOT give rows: ea, oo, ow and ie, the
     twice-taught spellings whose sound depends on the word's seat level. ow
     is the proof the marker earns its keep - its old fallback id d:ow is a
     REAL shipped clip, the /ow/ cry of out, so "snow" reached the wrong
     vowel through a green gate. Now it reaches a marker and a red count. */
  ar: "ar", air: "air", aw: "aw", ear: "ear", er: "er", oi: "oi",
  /* Four more, 2026-08-20, from the conversion blueprint's sweep: the only
     rowless graphemes the shape teaches at exactly ONE level, so the level's
     own lesson is the default (the owner's levels-teach-the-default ruling).
     gh says f (laugh's family, level 82's own lesson), gn says n (sign, the
     kn pattern's sibling), ough says the aw of bought (level 92's five
     -ought words; the seven heart exceptions bend per word), ze says z (the
     e-absorbed final, sneeze). The six spellings taught at TWO levels - ea,
     ere, ey, ie, oo, ow - stay rowless on purpose: no single sound is the
     truth, the lexicon rules each word, and the loud fallback plus the
     NO_TRAY_UNITS list keep an unruled occurrence from ever guessing. */
  gh: "f", gn: "n", ough: "aw", ze: "z",
};
/* FAIL-LOUD, 2026-08-20 (beta path item d; the reviewer and the lead agreed
   the design). A grapheme without a TILE_SOUND row resolves to an id in the
   unmapped. namespace, which no pack will ever contain: resolvePack misses,
   the reveal degrades exactly as it does for any missing clip, and every gate
   that walks tiles sees the marker instead of a plausible guess. The old
   fallback ("d:" + g) is how th played the wrong sound for months and how an
   unruled ow would have played the wrong vowel with a REAL clip. */
const soundIdFor = (g) => "d:" + (TILE_SOUND[g] || "unmapped." + g);
/* A tricky word is tricky because one of its letters is not saying what the
   letter usually says. The owner ruled on 2026-08-06 that the sound-out tells
   the truth about it anyway — "the bent letter plays its TRUE sound... No
   tricky-word exemption" — so these words override the letter's usual sound
   at the tile that bends. Keyed by word, then by tile position, because it is
   one tile of the word that lies and not the letter everywhere it appears.
   Every id here is a clip the owner has approved in a listening round. */
const WORD_SOUND = {
  /* are, owner-ruled 2026-08-19. The grapheme says air (above); the WORD says
     ar, rhyming with car, and it is a heart word a child meets on nearly every
     page. The owner heard all three candidates and ruled the grapheme and the
     word separately in one breath. `ar` is a clip he approved on 2026-08-18. */
  are: { 0: "ar" },
  /* were, owner-ruled 2026-08-19 on a listening round. The chunker tiles it
     w + ere, and `ere` is one of the thirteen spellings the shape teaches
     TWICE - as `ear` and as `air` - so unbent the sound-out says "w-air".
     The owner heard that against the word he had approved and ruled "bend -
     use what I approved". The sound it needs is `er`, which he approved on
     2026-08-18 and which is waiting to ship. He ruled `are` differently the
     same day; that one is not here. */
  were: { 1: "er" },
  /* all and fall, owner-ruled 2026-08-29 with the tiling above. Their `a` is
     the /aw/ of walk, not the short a of pal, and with `ll` now whole the
     vowel carries the sound alone. finally, valley and wallet already bend
     this tile in LEX_BENDS and keep their indices unchanged. */
  all: { 0: "aw" },
  fall: { 1: "aw" },
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
  /* as, phonics-reviewed 2026-08-20: the s buzzes to /z/ exactly as it does
     in is, his and has, which were bent long ago while `as` - accepted into
     the bank 2026-08-18 after three rounds - never got the same row. Until
     this line its sound-out was short_a + /s/, which spells a word no child
     should be taught. Found by the read-only phonics review, certainty
     "certain", the only fault in all 478 shipped bank words. */
  as: { 1: "z" },
  /* The ough hearts, owner-ruled 2026-08-20: level 92's lesson keeps only the
     five -ought words that obey it; dough, though and through are taught by
     sight with true audio. Each bends its single ough tile to the sound the
     word actually says - long o, long o, and the oo of moon. rough, tough,
     enough and cough carry TWO sounds in one ough tile, which no single clip
     could play until the owner ruled the x/ks and qu/kw precedent onto them
     (the move bill, 2026-08-20): uf and off were recorded as cluster sounds,
     accepted by ear in sound round 14 the same evening (the continuation arm
     won for both), and the four bend to them here and join the level-92
     hearts. month, phonics-reviewed the same day: its o says the u
     of up, like come and some, and its four tiles carry four real sounds. */
  dough: { 1: "long_o" },
  though: { 0: "th_this", 1: "long_o" },   // the buzzy th - the report listed it and the first draft of this row missed it
  through: { 2: "oo_moon" },
  rough: { 1: "uf" },
  tough: { 1: "uf" },
  enough: { 2: "uf" },
  cough: { 1: "off" },
  month: { 1: "short_u" },
  /* The magic-e rule's four measured exceptions, 2026-08-20. come, some and
     love keep the short u the owner ruled ("come love some marked tricky" -
     their o says the u of up despite the e), and their tricky notes live in
     TRICKY. have keeps its short a - the bend states the sound it already
     had, and exists so the rule cannot reach it: h-a-ve is exactly the shape
     that fires, and unbent it would say "haiv". comes is NOT here: at five
     tiles it waits on the four-tile law with stomach and machine, exactly as
     the conversion plan records. A bend outranks the rule tile by tile, so
     come's e still goes silent by rule while its o bends. */
  come: { 1: "short_u" },
  some: { 1: "short_u" },
  love: { 1: "short_u" },
  have: { 1: "short_a" },
  /* Found by the lexicon audit's 93-row follow-up, 2026-08-20: bolt is in
     the SHIPPED bank and its sound-out said "bahlt" - a live wrong vowel,
     the same o-before-l-plus-consonant class as cold and gold. The lexicon
     row and this bend were corrected in the same commit. */
  bolt: { 1: "long_o" },
  /* The Greek ch words the owner ruled to stay and teach the exception
     (2026-08-20: "the ch acts as a k. Leave in and teach the exception").
     Only the three that tile at four or fewer bend TODAY: a bend pulls its
     word into the bank, and the tile-row law still caps the shipped bank at
     four (SPEC section 4). stomach, mechanic and orchestra tile at 6-7 and
     take their rows at conversion, when that law is re-derived; machine
     (6 tiles) waits with them. The vowels are the phonics review's list:
     anchor's n says /ng/ and its or says /er/; school's oo is the moon oo,
     which its seat level cannot determine and the bare-oo fallback id would
     silently miss. chorus needs only the k - its or and u defaults are
     already the word's own sounds. */
  /* anchor's n adjudicated 2026-08-20: it joins the ten spelling-faithful
     n-before-k words (bank, think, monkey...) rather than standing alone on
     the ng side - the owner's pick between the two policies both reviewers
     surfaced. The blend supplies the /ng/ colour naturally. */
  anchor: { 2: "k", 3: "er" },
  chorus: { 0: "k" },
  school: { 1: "k", 2: "oo_moon" },
  /* The hybrid ruling, owner 2026-08-20: of the eleven early-seated words,
     the five function words stay where children meet them constantly, marked
     tricky with true-sound bends, and the six content words move to their
     code levels instead. comes has no row here: its silent e blocks a
     per-tile bend, so it joins come, love, some and live in the silent-e
     batch and wears only the marking until that mechanism lands. */
  into: { 3: "oo_moon" },
  find: { 1: "long_i" },
  old: { 0: "long_o" },
  hold: { 1: "long_o" },
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
  /* The two cluster sounds of the ough hearts, owner-ruled 2026-08-20 on the
     move bill - the x/ks and qu/kw precedent - and accepted by ear in sound
     round 14 the same evening. One tile, two sounds, one clip each; named by
     the carrier words that hold them, as S4 requires. */
  uf: "the sound at the end of rough",
  off: "the sound at the end of cough",
};
/* THE MAGIC-E RULE, owner-stated 2026-08-20: "when a word ends in e and has a
   vowel before it, that vowel takes on its letter sound and the e is silent...
   spite. trite. kite... bite. line." Two shapes carry it. A word ending in a
   bare e tile after a consonant (c-a-k-e) sounds its vowel's name and the e
   goes SILENT - the tile keeps its slot (S8: one tile, one sound) and its
   sound is d:silent, which every audio consumer skips. A word ending in one
   of the e-absorbed consonant tiles ce ge se ve ze (g-a-ve, th-e-se) sounds
   its vowel's name with no silent tile at all, the e living inside the final
   consonant's own tile. Measured over all 49 candidate words in the ladder,
   the hearts and the bank: 45 read correctly by this rule alone; the four
   that do not - come, some, love, have - carry WORD_SOUND rows below, and a
   bend always outranks the rule, tile by tile. */
const VCE_VOWEL = { a: "long_a", e: "long_e", i: "long_i", o: "long_o", u: "long_u" };
const E_ABSORBED = ["ce", "ge", "se", "ve", "ze"];
function magicE(tiles) {
  const n = tiles.length;
  if (n >= 3 && tiles[n - 1] === "e" && !VCE_VOWEL[tiles[n - 2]] && VCE_VOWEL[tiles[n - 3]])
    return { vowelAt: n - 3, silentAt: n - 1 };
  if (n >= 2 && E_ABSORBED.includes(tiles[n - 1]) && VCE_VOWEL[tiles[n - 2]])
    return { vowelAt: n - 2, silentAt: -1 };
  return null;
}
/* Lexicon bends, owner-ruled 2026-08-20: the conversion writer emits here
   every tile position where tools/lexicon.csv differs from pure rule output
   (defaults + the magic-e rule) - and ONLY those, so the rules keep doing
   what the rules already do. Hand WORD_SOUND outranks these tile by tile
   and the writer refuses any overlap between the two maps. Empty until
   --write runs. */
/* GENERATED: LEX_BENDS begin (tools/convert-ladder.mjs --write) */
const LEX_BENDS = {
 "action": {"3":"schwa"},
 "aesop": {"0":"long_e","1":"silent"},
 "amused": {"2":"long_u","3":"z","4":"silent"},
 "ancient": {"0":"long_a"},
 "another": {"2":"short_u","3":"th_this"},
 "apron": {"0":"long_a","3":"schwa"},
 "around": {"0":"er"},
 "asked": {"3":"silent","4":"t"},
 "babies": {"1":"long_a","3":"long_e","4":"z"},
 "baby": {"1":"long_a","3":"long_e"},
 "bacon": {"1":"long_a","3":"schwa"},
 "behind": {"3":"long_i"},
 "benches": {"5":"z"},
 "besides": {"3":"long_i","5":"silent","6":"z"},
 "birds": {"3":"z"},
 "biting": {"1":"long_i"},
 "blind": {"2":"long_i"},
 "book": {"1":"oo_book"},
 "boxes": {"4":"z"},
 "branches": {"6":"z"},
 "bread": {"2":"short_e"},
 "breakfast": {"2":"short_e"},
 "brief": {"2":"long_e"},
 "brother": {"2":"short_u","3":"th_this"},
 "brushed": {"4":"silent","5":"t"},
 "brushes": {"5":"z"},
 "buses": {"4":"z"},
 "butterfly": {"6":"long_i"},
 "buzzed": {"3":"silent"},
 "by": {"1":"long_i"},
 "cakes": {"1":"long_a","3":"silent"},
 "cars": {"2":"z"},
 "cent": {"0":"s"},
 "chief": {"1":"long_e"},
 "child": {"1":"long_i"},
 "chilled": {"3":"silent"},
 "circle": {"0":"s"},
 "circus": {"0":"s"},
 "cities": {"0":"s","3":"long_e","4":"z"},
 "city": {"0":"s","3":"long_e"},
 "climb": {"2":"long_i"},
 "cold": {"1":"long_o"},
 "comes": {"1":"short_u","3":"silent","4":"z"},
 "could": {"1":"oo_book","2":"silent"},
 "cow": {"1":"ow"},
 "cried": {"2":"long_i"},
 "cry": {"2":"long_i"},
 "deal": {"1":"long_e"},
 "dinosaur": {"1":"long_i","3":"schwa"},
 "dishes": {"4":"z"},
 "down": {"1":"ow"},
 "dressed": {"4":"silent","5":"t"},
 "dried": {"2":"long_i"},
 "drilled": {"4":"silent"},
 "dry": {"2":"long_i"},
 "each": {"0":"long_e"},
 "eagle": {"0":"long_e"},
 "eagles": {"0":"long_e","3":"silent","4":"z"},
 "ears": {"1":"z"},
 "eat": {"0":"long_e"},
 "eating": {"0":"long_e"},
 "every": {"3":"long_e"},
 "farms": {"3":"z"},
 "feather": {"1":"short_e","2":"th_this"},
 "few": {"1":"long_u"},
 "field": {"1":"long_e"},
 "filled": {"3":"silent"},
 "finally": {"1":"long_i","3":"schwa","5":"long_e"},
 "flies": {"2":"long_i","3":"z"},
 "flowers": {"2":"ow","4":"z"},
 "fly": {"2":"long_i"},
 "fold": {"1":"long_o"},
 "foxes": {"4":"z"},
 "funny": {"3":"long_e"},
 "future": {"1":"long_u"},
 "gates": {"1":"long_a","3":"silent"},
 "gem": {"0":"j"},
 "generous": {"0":"j","4":"schwa"},
 "germ": {"0":"j"},
 "ginger": {"0":"j","3":"j"},
 "gladly": {"5":"long_e"},
 "glasses": {"5":"z"},
 "goes": {"2":"z"},
 "going": {"1":"long_o"},
 "gold": {"1":"long_o"},
 "good": {"1":"oo_book"},
 "goose": {"1":"oo_moon"},
 "gravy": {"2":"long_a","4":"long_e"},
 "grey": {"2":"long_a"},
 "grilled": {"4":"silent"},
 "grow": {"2":"long_o"},
 "hands": {"4":"z"},
 "happier": {"3":"long_e"},
 "happy": {"3":"long_e"},
 "head": {"1":"short_e"},
 "heavy": {"1":"short_e","3":"long_e"},
 "helped": {"4":"silent","5":"t"},
 "here": {"1":"ear"},
 "hey": {"1":"long_a"},
 "hole": {"1":"long_o"},
 "holes": {"1":"long_o","3":"silent","4":"z"},
 "honey": {"1":"short_u","3":"long_e"},
 "hopeless": {"1":"long_o","3":"silent"},
 "how": {"1":"ow"},
 "jelly": {"3":"long_e"},
 "jumped": {"4":"silent","5":"t"},
 "kicked": {"3":"silent","4":"t"},
 "kind": {"1":"long_i"},
 "kindly": {"1":"long_i","5":"long_e"},
 "kindness": {"1":"long_i"},
 "lady": {"1":"long_a","3":"long_e"},
 "later": {"1":"long_a"},
 "laugh": {"2":"f"},
 "lazy": {"1":"long_a","3":"long_e"},
 "leaf": {"1":"long_e"},
 "leave": {"1":"long_e"},
 "let's": {"3":"silent"},
 "licked": {"3":"silent","4":"t"},
 "liked": {"1":"long_i","3":"silent","4":"t"},
 "likes": {"1":"long_i","3":"silent"},
 "lion": {"1":"long_i","2":"schwa"},
 "lived": {"3":"silent"},
 "logs": {"3":"z"},
 "look": {"1":"oo_book"},
 "looked": {"1":"oo_book","3":"silent","4":"t"},
 "lucky": {"3":"long_e"},
 "machine": {"2":"sh","3":"long_e"},
 "magic": {"2":"j"},
 "makes": {"1":"long_a","3":"silent"},
 "maple": {"1":"long_a"},
 "matches": {"4":"z"},
 "mcguffey's": {"5":"long_e","6":"silent","7":"z"},
 "mean": {"1":"long_e"},
 "meat": {"1":"long_e"},
 "mechanic": {"2":"k"},
 "mild": {"1":"long_i"},
 "mile": {"1":"long_i"},
 "mind": {"1":"long_i"},
 "mixed": {"3":"silent","4":"t"},
 "money": {"1":"short_u","3":"long_e"},
 "monkey": {"1":"short_u","4":"long_e"},
 "moon": {"1":"oo_moon"},
 "mother": {"1":"short_u","2":"th_this"},
 "motion": {"1":"long_o","3":"schwa"},
 "mule": {"1":"long_u"},
 "nation": {"1":"long_a","3":"schwa"},
 "nature": {"1":"long_a"},
 "niece": {"1":"long_e"},
 "noise": {"2":"z"},
 "nose": {"2":"z"},
 "noses": {"1":"long_o","2":"z","4":"z"},
 "notes": {"1":"long_o","3":"silent"},
 "now": {"1":"ow"},
 "o": {"0":"long_o"},
 "obey": {"0":"long_o","2":"long_a"},
 "orchestra": {"1":"k"},
 "other": {"0":"short_u","1":"th_this"},
 "over": {"0":"long_o"},
 "packed": {"3":"silent","4":"t"},
 "paper": {"1":"long_a"},
 "peaceful": {"1":"long_e","2":"s","3":"silent"},
 "pencil": {"3":"s"},
 "pennies": {"3":"long_e","4":"z"},
 "penny": {"3":"long_e"},
 "photo": {"1":"long_o","3":"long_o"},
 "picked": {"3":"silent","4":"t"},
 "pie": {"1":"long_i"},
 "piece": {"1":"long_e"},
 "pillow": {"3":"long_o"},
 "ponies": {"1":"long_o","3":"long_e","4":"z"},
 "pool": {"1":"oo_moon"},
 "powerful": {"1":"ow"},
 "precious": {"4":"schwa"},
 "princess": {"4":"s"},
 "pronounced": {"6":"s","7":"silent","8":"t"},
 "puppy": {"3":"long_e"},
 "put": {"1":"oo_book"},
 "quickly": {"4":"long_e"},
 "rainbow": {"4":"long_o"},
 "read": {"1":"short_e"},
 "reader": {"1":"long_e"},
 "ready": {"1":"short_e","3":"long_e"},
 "redo": {"1":"long_e","3":"oo_moon"},
 "rhyme": {"1":"silent","2":"long_i","4":"silent"},
 "room": {"1":"oo_moon"},
 "sandy": {"4":"long_e"},
 "saved": {"1":"long_a","3":"silent"},
 "seat": {"1":"long_e"},
 "show": {"1":"long_o"},
 "shy": {"1":"long_i"},
 "silly": {"3":"long_e"},
 "sky": {"2":"long_i"},
 "slow": {"2":"long_o"},
 "slowly": {"2":"long_o","4":"long_e"},
 "sly": {"2":"long_i"},
 "smelled": {"4":"silent"},
 "smile": {"2":"long_i"},
 "smiled": {"2":"long_i","4":"silent"},
 "snow": {"2":"long_o"},
 "social": {"1":"long_o"},
 "softly": {"5":"long_e"},
 "sold": {"1":"long_o"},
 "something": {"1":"short_u","3":"silent"},
 "soon": {"1":"oo_moon"},
 "sounds": {"4":"z"},
 "spelled": {"4":"silent"},
 "spied": {"2":"long_i"},
 "spilled": {"4":"silent"},
 "spoonful": {"2":"oo_moon"},
 "spread": {"3":"short_e"},
 "spy": {"2":"long_i"},
 "squash": {"2":"short_o"},
 "station": {"2":"long_a","4":"schwa"},
 "stomach": {"2":"short_u","5":"k"},
 "stopped": {"4":"silent","5":"t"},
 "story": {"3":"long_e"},
 "sunny": {"3":"long_e"},
 "survey": {"3":"long_a"},
 "swan": {"2":"short_o"},
 "swap": {"2":"short_o"},
 "table": {"1":"long_a"},
 "talked": {"3":"silent","4":"t"},
 "teach": {"1":"long_e"},
 "teacher": {"1":"long_e"},
 "teaching": {"1":"long_e"},
 "than": {"0":"th_this"},
 "these": {"0":"th_this","2":"z"},
 "things": {"3":"z"},
 "those": {"0":"th_this","2":"z"},
 "thread": {"2":"short_e"},
 "throw": {"2":"long_o"},
 "tie": {"1":"long_i"},
 "tiger": {"1":"long_i"},
 "tigers": {"1":"long_i","4":"z"},
 "together": {"1":"short_u","4":"th_this"},
 "told": {"1":"long_o"},
 "too": {"1":"oo_moon"},
 "took": {"1":"oo_book"},
 "tooth": {"1":"oo_moon"},
 "town": {"1":"ow"},
 "trees": {"3":"z"},
 "tried": {"2":"long_i"},
 "try": {"2":"long_i"},
 "undo": {"3":"oo_moon"},
 "unhappy": {"5":"long_e"},
 "useful": {"0":"long_u","2":"silent"},
 "valley": {"3":"long_e"},
 "very": {"1":"air","2":"long_e"},
 "waffle": {"1":"short_o"},
 "walked": {"3":"silent","4":"t"},
 "wallet": {"1":"short_o"},
 "wand": {"1":"short_o"},
 "wanted": {"1":"short_o"},
 "watch": {"1":"short_o"},
 "water": {"1":"short_o"},
 "waves": {"1":"long_a","3":"silent","4":"z"},
 "weather": {"1":"short_e","2":"th_this"},
 "where": {"1":"air"},
 "why": {"1":"long_i"},
 "wild": {"1":"long_i"},
 "window": {"4":"long_o"},
 "windy": {"4":"long_e"},
 "wishes": {"4":"z"},
 "wonderful": {"1":"short_u"},
 "word": {"1":"er"},
 "worker": {"1":"er"},
 "wow": {"1":"ow"},
 "yelled": {"3":"silent"},
 "yellow": {"3":"long_o"},
 "you'll": {"1":"oo_moon","2":"silent"},
 "young": {"1":"short_u"},
 "zoom": {"1":"oo_moon"},
};
/* GENERATED: LEX_BENDS end */
/* The bendless rule output for a tile sequence - what the engine would say
   with no WORD_SOUND and no LEX_BENDS row: the magic-e rule over the tile
   defaults. Its own exported function because the conversion writer diffs
   the owner's lexicon against exactly this, emitting only what the rules
   cannot produce - one model, exported, never re-implemented (the
   blueprint's Q1). */
function ruleSoundsFor(tiles) {
  const m = magicE(tiles);
  return tiles.map((g, i) => {
    if (m && i === m.silentAt) return "d:silent";
    if (m && i === m.vowelAt) return "d:" + VCE_VOWEL[g];
    return soundIdFor(g);
  });
}
/* The sound each of a word's tiles speaks, in order: the rule output, with
   any bend outranking it tile by tile - LEX_BENDS under WORD_SOUND, so an
   owner ruling always wins over a generated row. */
function soundIdsFor(word) {
  const bent = { ...(LEX_BENDS[word] || {}), ...(WORD_SOUND[word] || {}) };
  const tiles = chunkWord(word);
  const base = ruleSoundsFor(tiles);
  return tiles.map((g, i) => (bent[i] ? "d:" + bent[i] : base[i]));
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
/* Re-derived at the 2026-08-20 cutover from the shape's own per-level
   heart arrays - the roster the conversion writer seats inline. Thirty-one:
   the by-sight function words through the ladder, plus the seven ough hearts
   of level 92 the owner's ough ruling named. "and" left the roster (its
   spelling decodes at its seat) and "is" joined at 5, both the shape's own
   word. */
const HEART = ["i", "the", "a", "is", "to", "he", "we", "me", "be", "she",
  "you", "of", "was", "said", "are", "have", "they", "my", "do", "go", "no",
  "so", "there", "were", "dough", "though", "through", "rough", "tough",
  "enough", "cough"];

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
/* THE CHUNK LADDER (owner-ruled across decision pages from 2026-08-24 to
   2026-08-29; SPEC section 12 carries the full design). The ear rung retired
   with the rebuild: teaching sound-awareness WITH letters is worth roughly
   twice teaching it by ear alone, and the oral blend survives as the
   speaker's separated-sounds help. Each rung opens with its new letters
   alone, then the two-letter CHUNKS built from them - phonics building
   blocks, never words. A chunk item wears the "c:" prefix so nothing ever
   again discriminates by LENGTH (the ear items and the chunks are both two
   letters, and length-reading is how a chunk would have rendered as an ear
   and sounded itself out on arrival). The prefix is also the state.pre key,
   which is what keeps a chunk's reading marks out of the old ear marks'
   room: a beta-28 child who blended "at" by EAR is not credited with
   READING it. The rung names survive from the 2026-08-15 ruling because
   each rung still opens with letter sounds; "Little Ears" retired with the
   ear (owner-ruled 2026-08-29). */
const PRE_LEVELS = [
  { n: 1, name: "First Sounds", emoji: "✨", focus: "s, a, t and p - and the first chunks", kind: "mixed",
    items: ["s", "a", "t", "p", "c:at", "c:ap"] },
  { n: 2, name: "New Sounds", emoji: "🌱", focus: "i and n - and their chunks", kind: "mixed",
    items: ["i", "n", "c:an", "c:in", "c:it", "c:ip"] },
];
const preItems = (n) => (PRE_LEVELS.find((p) => p.n === n) || { items: [] }).items;
/* A chunk item versus a letter item, decided by declaration and never by
   length. chunkText strips the marker for display, sounds and clip lookup. */
const isChunkItem = (it) => typeof it === "string" && it.startsWith("c:");
const chunkText = (it) => (isChunkItem(it) ? it.slice(2) : it);

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
  const dueEarlier = PRE_LEVELS.filter((p) => p.n < state.preLevel).flatMap((p) => p.items)
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
   jump control is the door. Passing the last rung leaves the ladder
   (preLevel 0) and Level 1 begins. */
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
  /* LEX_BENDS keys are deliberately NOT unioned (corrected at the cutover,
     the same evening the union was written): thirteen of its rows are
     text-only words - aesop, goose, you'll - whose bends serve the sentence
     stage's tapped-word tiles and nothing else. Bank membership is the
     app's demand for a WORD clip, and no sentence-only word may make that
     demand. A LEX_BENDS row for a word the app does name rides on the word
     already being seated, which the writer's verify loop proves per row. */
  return [...words].sort();
}
function soundInventory() {
  const ids = new Set();
  /* d:silent is the absence of a demand, never a clip to ship: a silent tile
     keeps its slot in soundIdsFor (S8) and every audio consumer skips it. */
  for (const w of bankWords()) for (const id of soundIdsFor(w)) if (id !== "d:silent") ids.add(id);
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
/* A token with no letter in it is punctuation, not a word: "Then - pop!"
   yields no "-" tile. 2026-08-20; this was G27's one standing
   text_word_untaught finding, carried at a ceiling of 1 since the gate was
   born, and the ceiling drops to zero with it. */
const sentenceWords = (s) => s.toLowerCase().replace(/[.,!?;:"“”]/g, " ").split(/\s+/)
  .filter((w) => /[a-z]/.test(w));
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
    /* A silent tile gets NO moment in the choreography: no seam, no clip.
       The reveal steps over the magic e the way a reader's voice does. */
    for (const id of soundIdsFor(word)) if (id !== "d:silent") out.push("seam2", id);
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
  for (const id of soundIdsFor(word)) if (id !== "d:silent") out.push("seam2", id);   // the silent tile has no clip, exactly as in clipPlan
  out.push("seam2", "w:" + word);
  return out;
}
/* The closing read (point 5), on its own so a tap can interrupt it without
   stopping anything that came before it. */
const sentenceClosePlan = (sentenceId) => [sentenceId];
/* Which entries of a plan are tile sounds, and which tile each belongs to.
   The player reports the scheduled time of each, so a tile lights the moment
   ITS sound starts rather than on a guessed delay. */
/* BETA 22 SHIPPED THIS WRONG, and three screenshots from the owner on
   2026-08-21 said how: the rings stepped by CLIP, and the plan carries no
   clip for a silent tile, so after the silent e of "useful" every ring landed
   one tile late and the last tile never lit - "e" ringed while /d/ played in
   "kicked". The sounds were right; the pointer was wrong. The caller now
   passes the word's tile sounds WITH their silents, and a slot's tile is
   its true position: the silent tile is stepped over, never counted. Without
   the list (an old caller, a replay, a sentence line) the plan's own order
   is the tile order, as before. */
function tileSlots(plan, tileSounds = null) {
  const slots = [];
  let t = 0;
  for (let i = 0; i < plan.length; i++) if (String(plan[i]).startsWith("d:")) {
    if (tileSounds) while (t < tileSounds.length && tileSounds[t] === "d:silent") t++;
    slots.push({ index: i, tile: t++ });
  }
  return slots;
}
/* ---------------- Build-a-sound: Build-it at the ladder's scale ------------
   Owner-ruled 2026-08-17 (open-faults Q6). A pre-ladder child was being offered
   the word version of Build-it before they had met a letter. The mode they get
   instead says a SOUND and asks them to find its tile among the letters they
   have been taught - the same idea at the ladder's scale.

   IT STARTS AT PRE 1 since the chunk rebuild: the first rung teaches letters
   now, so the honest inventory exists from the first session - four tiles at
   Pre 1, six at Pre 2. (Before 2026-08-29 it started at Pre 2, because the
   retired ear rung taught no letters at all.) The pool is the taught rungs'
   LETTER items alone - a chunk is read, never dealt as a tray tile, and the
   filter is by declaration, not length. Every letter already has a shipped
   clip, so this mode still adds no audio at all. */
const PRE_TRAY_FROM = 1;
function preLetters(preLevel) {
  return PRE_LEVELS.filter((p) => p.n >= PRE_TRAY_FROM && p.n <= preLevel)
    .flatMap((p) => p.items).filter((it) => !isChunkItem(it));
}
/* ------------------------- the chunk roster --------------------------------
   Owner-ruled 2026-08-25 and 2026-08-29 (SPEC section 12 carries the design
   and the decision pages behind it): 26 VC word families plus 53 CV chunks, taught
   as phonics building blocks and never as words. The LIST is curriculum and
   is typed; everything ABOUT a chunk - its seat, its dormancy - is derived,
   so it cannot drift. The guards that shaped the CV side: no chunk that is
   itself a word saying something else (be, do, go, he, me, no, so, to, we
   are excluded - the collision set), anchors sound-verified by the engine
   rather than by spelling, fewer than three verified anchors drops the
   chunk. Refused outright by the owner: pu, pe, po, ho (2026-08-24) and the
   soft spellings ce, ci, ge, gi. ed stays on the owner's word alone
   (2026-08-29, "Ed -keep it"). */
const CHUNK_ROSTER = [
  "ad", "ag", "am", "an", "ap", "at", "ed", "en", "et", "id", "ig", "im",
  "in", "ip", "it", "ob", "og", "op", "ot", "ox", "ub", "ug", "um", "un",
  "us", "ut",
  "ba", "ca", "da", "fa", "ga", "ha", "ja", "la", "ma", "na", "pa", "ra",
  "sa", "ta", "ya", "de", "fe", "le", "ne", "re", "te", "ye", "bo", "co",
  "fo", "jo", "lo", "mo", "ro", "bu", "cu", "du", "fu", "gu", "hu", "ju",
  "lu", "mu", "ru", "su", "tu",
];
/* THE I-ROW IS NOT HERE, and its absence is a ruling (owner, 2026-08-29):
   "maybe they shouldn't be taught as sounds like fi and bi then, just taught
   organically through words." bi di fi hi ki li mi pi ri si ti wi were
   offered across five rounds and roughly forty arms each - every carrier,
   every cut, every vowel substitution this pack has ever won with - and every
   one came back saying the letter name or the tense vowel: "all these options
   just say the letter b", "just say f + letter sound of e". The cause is the
   language, not the renderer: English has NO open syllable with a lax vowel,
   so /fɪ/ is not a possible English syllable, the voice was never trained on
   one, and it collapses to the nearest legal neighbour. A sound English does
   not make is not a building block a child should be drilled on. Short i is
   taught where the language puts it - the VC chunks id, ig, im, in, ip and
   it, all accepted - and then in whole words. settled.md carries the full
   record. Every other row survives because its vowel has no tense twin
   waiting in that position, which is why ba, ca, mo and ju were accepted from
   the first family tried. */
/* A word HOLDS a chunk when the chunk's two letters stand as two consecutive
   single tiles in the word's own walk and the word's own sound at the vowel
   tile is the SHORT vowel. The engine judges, never the spelling: a
   third-letter-consonant rule accepted "side" for si and "tiger" for ti,
   and soundIdsFor refuses both (settled.md 2026-08-29, "spelling cannot
   judge an anchor"). */
function wordHoldsChunk(word, chunk) {
  const tiles = chunkWord(word), ids = soundIdsFor(word);
  const vAt = "aeiou".includes(chunk[0]) ? 0 : 1;
  for (let i = 0; i + 1 < tiles.length; i++)
    if (tiles[i] === chunk[0] && tiles[i + 1] === chunk[1] && ids[i + vAt] === "d:short_" + chunk[vAt])
      return true;
  return false;
}
/* A chunk's seat. Two clauses, in ruling order. A chunk the RUNGS themselves
   carry sits in the pre-ladder (seat 0) - membership in the ruled rungs,
   never letter coverage, because a letters-based clause also caught sa, ta
   and five more CV chunks whose ruled seats are Levels 1 and 2, and a seat-0
   chunk outside the rungs is served nowhere at all. (This clause, not the
   level rule, is what seats ip before Level 1: no Level 1 word contains it.)
   Every other chunk seats at the earliest level whose own roster holds it -
   which is also the owner's deadline rule ("never after the child already
   reads a word containing it", 2026-08-25) folded into one walk, because
   the first holding word IS the deadline. */
const PRE_RUNG_CHUNKS = new Set(PRE_LEVELS.flatMap((p) => p.items).filter(isChunkItem).map(chunkText));
function chunkSeat(chunk) {
  if (PRE_RUNG_CHUNKS.has(chunk)) return 0;
  for (const l of LEVELS) if (l.words.some((w) => wordHoldsChunk(w, chunk))) return l.n;
  return null;
}
function chunkSeats() {
  const out = {};
  for (const c of CHUNK_ROSTER) out[c] = chunkSeat(c);
  return out;
}
/* Dormancy, DERIVED: a chunk without an approved whole-chunk clip is never
   served outside the pre-rungs and never demanded of the voice pack, so
   G13 stays symmetric while zero chunk clips exist (owner ruled the whole
   engine lands first, clips later in one round). Today the only approved
   chunk clips are the seven that are bank words, so bank membership IS the
   derivation; the commit that lands the u: clips replaces this with the
   round's own ledger. The pre-rungs still serve ap and ip - their reveal
   simply omits the whole-chunk clip until it exists, and nothing releases
   before it does. */
const chunkHasClip = (c) => bankWords().includes(c);
/* The alongside drills' picker: due chunks a child at this level has
   earned, seated at or below it, clip in hand, lowest box first, capped so
   the McGuffey six-a-sitting benchmark binds the sitting and never the
   level. Keys wear the item prefix - the same room the rungs write. */
function dueChunks(state, cap = 3) {
  const pre = state.pre || {}, sNum = state.sessionsCompleted + 1;
  return CHUNK_ROSTER
    .filter((c) => { const seat = chunkSeat(c); return seat !== null && seat > 0 && seat <= (state.level || 1); })
    .filter((c) => chunkHasClip(c))
    .filter((c) => { const b = pre["c:" + c]; return !b || (b.box < 5 && b.dueAt <= sNum); })
    .sort((a, b) => (((pre["c:" + a] || {}).box || 0) - ((pre["c:" + b] || {}).box || 0)) || chunkSeat(a) - chunkSeat(b))
    .slice(0, cap)
    .map((c) => "c:" + c);
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
/* Grown by ea, oo, ow and ie on 2026-08-20: all six twice-taught spellings
   are deliberately default-less, so a tray that dealt one as a distractor
   would deal a tile that plays nothing - the dead-control fault. */
const NO_TRAY_UNITS = ["ai", "ou", "ey", "ere", "ea", "oo", "ow", "ie", "ugh"];   // + ugh at the cutover: the one-use laugh tile has no default on purpose
/* Words a child must never be able to BUILD. SPEC section 12 owns this list -
   these are the words the owner ruled out for child-appropriateness, and gob,
   which was removed from every file on 2026-08-13 "so it cannot return by
   accident". A tray returns it by accident: building "dog" with a b distractor
   spells it, and the miss feedback then prints and SPEAKS what the child made.
   A doc-truth rule holds this list against SPEC's own sentence, so a word the
   owner rules out later cannot be ruled out in one place only.
   Found by an independent review of Build-it, 2026-08-17. */
/* The 2026-08-07 appropriateness list, plus gob and the two ruled-out
   plurals - and since 2026-08-23 the refusals from the 2026-08-16 target
   vocabulary that a TRAY could spell: "ho", which carries adult slang. The
   beta 27 readiness audit found it reachable - a two-slot build whose tray
   carries an h and an o spells it, and Build-it then prints and speaks what
   the child built. "gun" joins it: the owner refused it on 2026-08-16 by the
   appropriateness screen, and it was guarded nowhere. So do the three the
   owner refused on 2026-08-18 for the same reason - fight for violence,
   hustle and grind for adult slang. The list had held only the 2026-08-07
   words, because it was written that day and no refusal since had been
   added to it.

   TWO WORDS ARE DELIBERATELY NOT HERE, both owner-ruled 2026-08-23. "sam"
   was refused on 2026-08-16 as a book character's name - a candidate turned
   down, not a word a child must never spell - and the owner ruled "Ho I want
   out. Sam is fine.", so it is not taught and needs no tray guard. "ding" is
   a taught Level 28 word: the refusal was of the primer's comic-book sound
   effect, not of the English word.

   THIS LIST IS NOT THE AUTHORITY - SPEC section 12's dated "Build-guarded"
   sentence is, and doc-truth requires the two to be EQUAL in both
   directions: a word declared there and missing here is a hole, a word here
   and undeclared there is a guard nobody ruled. No word is typed into the
   gate itself any more; it reads the document that owns the fact. */
const NEVER_BUILD = ["fist", "limp", "bone", "buns", "dump", "milt", "gob",
  "jugs", "crabs", "ho", "gun", "fight", "hustle", "grind", "nuts", "cans"];
/* Can these tiles, in some order, spell a word from that list? A tray is a
   multiset, so a tile is consumed once per slot: "dad" holds two d tiles and
   spells nothing with one. */
function traySpells(tiles, word, slots) {
  /* The child fills SLOTS, not the whole tray, so a forbidden word is reachable
     when it is the right LENGTH for the slots and its tiles are available -
     never when it merely matches the tray's own size. Checking tray length was
     the first version's fault: it reported dog + b as safe, and dog + b is how
     a child spells gob.

     AND A WORD IS NOT ITS CHUNKING. The second version asked whether the tray
     held chunkWord(word) - the ONE split the game would use to TEACH that word.
     A child laying out tiles has never heard of that split. "fight" chunks
     f-igh-t, three units, so only three-slot builds were ever checked and every
     other size was invisible: a five-slot "gifts" tray carrying an h lays out
     f-i-g-h-t, and the game then says "That says f-i-g-h-t... listen again."
     Twenty-seven of five hundred dealt gifts trays carried that h. So the
     question asked here is the one the child can actually act on: can ANY split
     of this word into exactly `slots` pieces be taken from these tiles? The walk
     tries every prefix at each position and puts each tile back before trying
     the next, so a tray is a multiset - "dad" holds two d tiles and spells
     nothing with one. */
  const left = tiles.slice();
  const walk = (pos, used) => {
    if (pos === word.length) return used === slots;
    if (used === slots) return false;
    for (let n = 1; pos + n <= word.length; n += 1) {
      const at = left.indexOf(word.slice(pos, pos + n));
      if (at < 0) continue;
      const piece = left.splice(at, 1)[0];
      const spelt = walk(pos + n, used + 1);
      left.splice(at, 0, piece);
      if (spelt) return true;
    }
    return false;
  };
  return walk(0, 0);
}
const trayForbidden = (tiles, slots) => NEVER_BUILD.some((w) => traySpells(tiles, w, slots));
/* A word whose OWN tiles spell a forbidden one cannot be made safe by choosing
   distractors, so it is not offered at all. Measured over the bank: exactly one,
   sift, which is an anagram of fist. */
/* A word is buildable when its tray spells nothing forbidden AND every tile
   has a sound to tap. A magic-e word fails the second half: its silent e is a
   tile that plays nothing, and a control that looks live and does nothing is
   the dead-control fault Build-it must never deal (test 5b owns the proof).
   What Build-it SHOULD do with a silent e - tap its letter default, show it
   ghosted, link it to its vowel - is the owner's design call, recorded with
   his own magic-e-game idea for the next beta; until he rules, these words
   read and reveal but do not build. */
const buildable = (word) => !trayForbidden(chunkWord(word), chunkWord(word).length)
  && !soundIdsFor(word).includes("d:silent");
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
     exactly what a test uses. This one hung the suite before it was caught.

     AND TAKEN ONE AT A TIME, each checked against the tiles already taken
     (2026-08-23). The pool filter above asks whether the word's own tiles
     plus ONE candidate spell something forbidden - which is the dog + b
     shape it was written for - and it cannot see two distractors that
     complete a forbidden word between them. Measured over 62,520 simulated
     deals of the whole bank: 44 distinct (word -> forbidden) pairs were
     reachable that way, none of them through the word's own tiles - "ax"
     dealt a and x with h and o beside them, which is how a child spells
     "ho"; "slam" reached milt, "just" reached fist, "jump" reached jugs,
     "hop" reached gob. The accumulating check below closes it: a tile that
     would complete a forbidden word with what is already in the tray is
     skipped and the next one taken. One pass, so a held rand still ends. */
  const shuffled = shuffle(pool, rand);
  const extras = [];
  const room = Math.min(trayExtras(level), pool.length);
  for (const c of shuffled) {
    if (extras.length >= room) break;
    if (trayForbidden(own.concat(extras, [c]), own.length)) continue;
    extras.push(c);
  }
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
            <h1 className="wq-display" style={{ margin: 0, color: C.ink, fontSize: "clamp(2rem,7svh,3rem)", lineHeight: 1.1 }}>
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
            {/* C.warningDeep: warning red dark enough for 4.5:1 on the gradient */}
            {(!persistent || readOnly) && <p style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: C.warningDeep }}>
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
              <Word>{displayWord(currentWord)}</Word>

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
              style={{ background: advanceReady ? C.green : C.disabled }}>
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
              <button className="wq-cta" style={{ background: C.paper, color: C.red, border: "2px solid " + C.red }} onClick={() => handleExit("discard")}>Discard and go home</button>
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
              <span style={{ fontSize: "clamp(2.5rem,8svh,4rem)" }}>🏆</span>
            </div>
            <h2 className="wq-display" style={{ margin: "10px 0 0", color: promoted ? C.purple : C.ink, fontSize: "clamp(1.5rem,5svh,2.2rem)" }}>
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
                        const bg = !ws || ws.attempts === 0 ? C.chip : ws.box >= 4 ? C.chipGreen : ws.box >= 2 ? C.chipAmber : C.chipRed;
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

/* THE PRINCIPAL WORD FITS ITS LINE (art project step 0d, 2026-08-22). The
   stylesheet's size is a ceiling set by the screen's height; the word is
   measured after layout and shrunk in proportion only when it is wider than
   its line. app/src/components/Word.jsx carries the full account. */
function Word({ children, ...rest }) {
  const ref = useRef(null);
  const text = String(children);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const inner = el.firstElementChild;
    /* The stylesheet's size stays on .wq-word and the fitted size goes on the
       inner span, so the box and the baseline are the same for every word;
       app/src/components/Word.jsx carries the full account. */
    const fit = () => {
      inner.style.fontSize = "";
      /* both as client rects: under CSS zoom a rect is scaled and clientWidth
         is not, and a room in one unit against a need in the other halved the
         word for nothing (the zoom arm, 2026-08-22) */
      const room = el.getBoundingClientRect().width, need = inner.getBoundingClientRect().width;
      if (room > 0 && need > room) {
        inner.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * (room - 1) / need).toFixed(2) + "px";
      }
    };
    fit();
    let frame = 0;   // the fit lands next frame, never inside the delivery: see Word.jsx
    const ro = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); });
    ro.observe(el);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit, () => {});
    return () => { ro.disconnect(); cancelAnimationFrame(frame); };
  }, [text]);
  return <div ref={ref} className="wq-display wq-word" aria-live="off" {...rest}><span className="wq-word-text">{children}</span></div>;
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
  height:100vh; height:100svh; width:100%; overflow:hidden;
  background:linear-gradient(160deg,${C.skyBlue} 0%,${C.skyLavender} 55%,${C.skyPurpleMist} 100%);
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
  background:${alpha(C.paper, .72)};border-top:1px solid ${C.line};backdrop-filter:blur(6px)}
.wq-center{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}

/* stage content: fixed slots so nothing shifts (P0-2) */
.wq-stagegrid{width:100%;max-width:440px}
/* ONE LINE, NEVER A WRAP (art project step 0d, 2026-08-22). The size here is
   the CEILING, set by the screen's height; the width is fitted by the Word
   component, which measures the rendered word and shrinks it only when it is
   wider than its line. nowrap is what makes that measurable - with a wrap
   allowed, scrollWidth never exceeds the line and a word could split into
   "swimmin" over "g", which thirty-four bank words did on a 390 px phone. */
/* the word paints above the tile row (art step 1): a glow passes behind a letter, never over it */
.wq-word{font-size:clamp(2.25rem,11vh,5.5rem);font-size:clamp(2.25rem,11svh,5.5rem);
  font-weight:700;line-height:1.05;color:${C.ink};margin:4px 0 0;white-space:nowrap;position:relative;z-index:1}
.wq-slot-tiles{min-height:52px;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px}

/* BUILD-IT'S TILES AND SLOTS (art step 1): the same ceramic, as CONTROLS - a
   sibling class, so the reveal's .wq-tile readers (the census's tile count
   and empty-tile rule, popSpans, the density rules) never meet a slot.
   Sizes stay inline (64 px, S7's floor and then some; a multi-letter tile is
   as wide as its slot). The states of bible 11's table:
   available - the ceramic; pressed - the face darkens by the edge at .08
   under the rim and the elevation drops, no movement; used - the slot
   token's face, no elevation, the letter still ink so a child can see which
   tile they spent, and a real disabled control; the empty slot - the slot
   fill under a dashed boundary edge (3.51:1 on it), a real disabled
   control; cue - the scaffold's slot wears the structural ring while its
   sound plays, one at a time; arrangement - a purpleStructural ring round
   the filled slots while the built sounds play back, never red; won - a
   warm halo, static; focus - a DASHED ring at offset 2, so the keyboard's
   mark and the sounding mark differ by shape, not only colour (15.2). */
.wq-tilebtn{display:flex;align-items:center;justify-content:center;border:0;border-radius:14px;font-size:27px;font-weight:800;
  color:${C.ink};background:${C.tileFace};cursor:pointer;
  box-shadow:inset 0 0 0 1px ${C.tileEdge},inset 0 2px 0 ${C.tileHighlight},inset 0 -2px 0 ${alpha(C.tileEdge, .35)},0 1px 2px ${alpha(C.ink, .22)},0 1px 0 ${alpha(C.tileEdge, .5)}}
.wq-tilebtn:active:not(:disabled){box-shadow:inset 0 0 0 1px ${C.tileEdge},inset 0 0 0 99px ${alpha(C.tileEdge, .08)}}
.wq-tilebtn.wq-used{background:${C.slot};box-shadow:none;border:3px dashed ${C.boundary};cursor:default}
.wq-tilebtn.wq-empty{background:${C.slot};box-shadow:none;border:3px dashed ${C.boundary};cursor:default}
.wq-tilebtn.wq-cue{outline:3px solid ${C.cyanStructural};outline-offset:0}
.wq-tilebtn.wq-empty.wq-cue{border-color:transparent}
.wq-tilebtn.wq-arr{box-shadow:0 0 0 3px ${C.purpleStructural},inset 0 0 0 1px ${C.tileEdge},inset 0 2px 0 ${C.tileHighlight},inset 0 -2px 0 ${alpha(C.tileEdge, .35)}}
.wq-slotrow{display:inline-flex;gap:10px;justify-content:center;flex-wrap:wrap;border-radius:18px;padding:4px}
.wq-slotrow.wq-won{box-shadow:0 0 0 6px ${alpha(C.amberFill, .6)}}
.wq-tilebtn:focus-visible{outline:3px dashed ${C.cyanStructural};outline-offset:2px}
/* The scaffold letter at .60: 3.28:1 on the slot, owner-ruled 2026-08-22 on
   the ceramic-tiles page over the .28 (1.65:1) that had sat beside the
   2026-08-17 ruling unruled - the cue now clears the 3:1 boundary rule. */
.wq-ghost{opacity:.6}
/* THE CERAMIC TILE (art step 1, bible 11, 2026-08-22). A warm matte face, a
   one-pixel bevel (highlight above, the edge's shade below), a one-pixel rim
   in the edge token, and a contact shadow - all of it in box-shadow, none in
   the box, so the row's geometry is what it was (G7, the phase walk). The
   face is a solid colour, never a gradient or a filter, because the contrast
   walker reads a background colour and nothing else under the letter; the
   bevel and rim live in the padding ring, never under the glyphs. Every
   inset has a zero blur, as pixel construction does; only the contact
   shadow carries a blur. The 9-slice is the radius per variant: 12 here,
   9 on wq-many, 7 on wq-crowd, 8 on the short stage. */
.wq-tile{background:${C.tileFace};color:${C.ink};border-radius:12px;padding:5px 12px;
  font-size:clamp(1.1rem,3.2svh,1.6rem);font-weight:700;
  box-shadow:inset 0 0 0 1px ${C.tileEdge},inset 0 2px 0 ${C.tileHighlight},inset 0 -2px 0 ${alpha(C.tileEdge, .35)},0 1px 2px ${alpha(C.ink, .22)},0 1px 0 ${alpha(C.tileEdge, .5)};
  --wqband:9px}
.wq-slot-msg{height:52px;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:4px}

/* controls */
.wq-cta{display:block;width:100%;border:0;border-radius:999px;background:${C.action};color:${C.paper};
  font:800 clamp(1rem,2.4svh,1.25rem)/1.1 inherit;padding:16px 18px;cursor:pointer;
  box-shadow:0 3px 10px ${alpha(C.ink, .18)};min-height:56px}
.wq-cta:disabled{cursor:default;box-shadow:none}
.wq-prompt{text-align:center;font-weight:800;color:${C.ink};font-size:clamp(.95rem,2.2svh,1.1rem);padding:16px 0;min-height:56px}
.wq-btn-plain{border:0;background:${alpha(C.paper, .85)};color:${C.ink};font:700 13px/1 inherit;
  padding:11px 13px;border-radius:999px;cursor:pointer;min-height:40px}
.wq-chip{background:${alpha(C.paper, .85)};color:${C.ink};font:800 12.5px/1 inherit;padding:7px 10px;border-radius:999px;display:inline-block}
.wq-striplabel{font:800 9.5px/1 inherit;letter-spacing:.12em;text-transform:uppercase;color:${C.strip};opacity:.85}
.wq-sbtn{background:${C.paper};border:1.5px solid ${C.line};border-radius:9px;color:${C.strip};
  font:700 12.5px/1 inherit;padding:0 12px;min-height:44px;min-width:44px;cursor:pointer} /* N-6 */
.wq-hold{position:relative;overflow:hidden;touch-action:none}
.wq-holdfill{position:absolute;inset:0;width:0;opacity:.22}
.wq-hold.holding .wq-holdfill{width:100%;transition:width .45s linear}
.wq-sbtn:disabled{opacity:.38;cursor:default}
.wq-mark{flex-basis:100%;font-size:11px;color:${C.strip};opacity:.9}

/* progress (P1-6: colour + pattern) */
.wq-prog{display:flex;gap:2px;width:100%}
.wq-seg{flex:1;height:9px;border-radius:2px;min-width:3px}
.wq-seg-todo{background:${alpha(C.paper, .55)}}
.wq-seg-ok{background:${C.green}}
.wq-seg-mid{background:repeating-linear-gradient(135deg,${C.sun} 0 3px,${C.paper} 3px 6px)}
.wq-seg-bad{background:repeating-linear-gradient(90deg,${C.red} 0 2px,${C.paper} 2px 4px)}

/* cards / forms */
.wq-card{background:${C.paper};border-radius:18px;box-shadow:0 2px 10px ${alpha(C.ink, .12)};text-align:center}
.wq-lbl{display:block;font:800 11px/1.3 inherit;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};margin-bottom:5px}
.wq-help{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:${C.muted}}
.wq-input{width:100%;border:1.5px solid ${C.line};border-radius:10px;padding:11px 12px;
  font:600 15px/1.3 inherit;color:${C.ink};background:${C.paper};min-height:44px}
.wq-fieldrow{margin-top:14px}
.wq-seggroup{display:flex;gap:4px;background:${C.chip};border-radius:11px;padding:3px;flex-wrap:wrap}
.wq-segbtn{flex:1 1 auto;min-width:44px;min-height:40px;border:0;background:transparent;border-radius:8px;
  color:${C.strip};font:800 13px/1 inherit;cursor:pointer}
.wq-segbtn.on{background:${C.paper};color:${C.ink};box-shadow:0 1px 3px ${alpha(C.ink, .2)}}
.wq-segbtn:disabled{opacity:.4;cursor:default}
.wq-rowbtn{display:flex;align-items:center;width:100%;border:0;background:transparent;padding:4px 0;cursor:pointer;min-height:40px}
.wq-meter{display:flex;height:6px;border-radius:3px;background:${C.chip};overflow:hidden;margin-top:6px}
.wq-trophy{display:inline-flex;align-items:center;justify-content:center;border:4px solid transparent;
  border-radius:999px;padding:10px 18px}

/* overlays */
/* P2-2: toast sits above the action rail, never over the header */
.wq-toast{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(112px + env(safe-area-inset-bottom));
  background:${C.ink};color:${C.paper};padding:10px 16px;border-radius:999px;font:700 13px/1.3 inherit;
  max-width:88%;text-align:center;z-index:70}
.wq-modalwrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;z-index:80}
.wq-scrim{position:absolute;inset:0;background:${alpha(C.ink, .42)};border:0;order:-1}
.wq-modal{position:relative;z-index:1;background:${C.paper};border-radius:18px;padding:18px;max-width:380px;width:100%;
  box-shadow:0 12px 40px ${alpha(C.ink, .3)}}

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
  .wq-word{font-size:clamp(3rem,17svh,7rem)}
  .wq-slot-tiles,.wq-slot-msg{justify-content:flex-start;align-items:flex-start;text-align:left}
}
`;
