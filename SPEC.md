# Word Quest — product and build specification

**This document owns** what the game DOES: every rule of behaviour, the levels and
their words, the sentences a child meets, the copy the app speaks and shows, and the
road the owner has ruled for what is not built yet.
**It does not own** how any of it is proved — that is `docs/testing-gauntlet.md` — nor
which rounds an ear has closed, which is `docs/settled.md`, nor what is currently wrong,
which is `docs/open-faults.md`.

This document is the full specification for Word Quest, an open-source phonics game with spaced
repetition for early readers. The document describes the reference build: `reference/word-quest.jsx`, version 3. The document
gives a developer or an AI coding agent all the data necessary to build, extend, or port the
game.

This document follows the Microsoft Writing Style Guide. Code, constants, and quoted
interface text stay in their exact form.

## 0. Description

Word Quest is a daily phonics game for children of approximately 4 to 6 years. One session has a
target of 20 words and takes approximately 5 to 8 minutes. An adult stays with the child. The app
shows one word. The child reads the word aloud. The app or the adult gives the result. The app
gives positive feedback. A schedule engine selects the words for the next session.

The game gives practice and review. The game is not a curriculum. Use the game together with a
structured phonics program.

The owner's goal (stated 2026-08-07): grow Word Quest slowly into a full phonics training
game. The bank starts at CVC words and expands level by level along the sequence the field's
scope-and-sequences agree on, at the pace the voice pipeline allows — every new word and
sound goes through the same listening rounds as the first 349, and every new mode obeys the
same safety rules. Section 12 records the approved road.

The reference build is the master source for interface text, layout, and colors. This document is
the master source for behavior, data, and the build steps.

## 1. Design rules

These rules are mandatory.

1. The app never records a wrong result by itself. Only an adult's action records any result at
   all. Until 2026-08-12 there was one exception — speech recognition could confirm a correct
   reading — and it was removed on safety grounds: recognition sends a child's voice to a
   third party, which section 8's storage promise does not permit. The rule is now absolute.
2. Feedback is positive. Feedback uses the exact text in section 5. A miss is an invitation to
   try again. A miss is not a failure message.
3. The child reads first. The word appears with no help. The sound tiles appear only after the
   attempt, in the feedback phase.
4. Multi-letter units are one tile. The spoken digraphs sh, ch, th, wh, ck, and ng, the
   unit qu, the silent-letter pairs kn, wr, and mb, and the doubled endings ll, ss, ff,
   and zz always show as one tile. Example: "ship" shows as sh-i-p; "knock" as kn-o-ck.
5. Sessions are short. One session has a target of 20 words and a maximum of 26 prompts.
6. Known words move fast. If the child reads a new word correctly at first sight, the engine sets
   the word to a high box. A child who knows the easy levels completes them in one or two
   sessions.
7. Controls are large. Child controls have a minimum size of 56 px. Adult controls have a minimum
   size of 44 px. The app obeys the reduced-motion setting.
8. Speech output says full words, and the single sounds of the approved sound library. Speech
   output never says letter names. The dashed spelling on the screen is for the adult. The
   sounds were added by the owner on 2026-08-10, for the level introduction of section 12 and
   the sound-it-out reveal: a sound is what this game teaches, and a letter name is what
   confuses a beginner, so the ban stays exactly where it always meant to be. During a reading
   attempt nothing is spoken at all (rule 3 and rule 9), so this permission reaches only the
   teaching screens.
9. Privacy is built in. The app has no accounts and no analytics, and after load it makes
   only the two update requests section 7a describes, both to the app's own host, both
   carrying no data, one of them switchable off. All data stays on the device. The name
   field is optional.
10. Adult controls need a deliberate gesture. A pointer must hold an adult result control for
    450 ms. A keyboard operates the control directly, and so does an activation from assistive
    technology, such as a screen reader's double-tap. Focusing a control and then activating it
    is as deliberate as a hold, and for some grown-ups it is the only way to answer at all.

## 2. Core requirements

- Show one word at a time. Start with easy words. Increase the difficulty step by step.
- Show the word in large, clear letters. The child reads the word aloud.
- Give feedback with the three fixed sentences in section 5.
- Keep a log: the date, the words, the results, and the level.
- Use a spaced-repetition engine. Mix current-level words, due reviews, and known words. Add
  digraph words step by step.
- Start a session only with the "Begin Session" control.
- Free play: an endless practice mode a parent can start from the home screen. The tap opens
  a chooser first: truly random play, which serves any word from the whole bank with every
  level in the draw, or the child's level, which serves the same mix a session would. Both
  run against a throwaway copy of the child's progress and write nothing: no boxes, no
  schedule, no log, no session count. Promotion never fires in free play, and no level-up is
  ever celebrated there, because a level-up that is not real must not be shown.

## 3. Word bank

The bank has 446 words in twenty levels. The word order in a level is the introduction order.
Words have 2 or 3 sound units through Level 9, and 3 or 4 at Levels 10 and 11, where a
consonant blend adds a unit. Words have at most 4 letters through Level 7 and at Levels 10
and 11; Levels 8 and 9 may reach 5. Four sound units is the ceiling, and it is a real one:
the feedback tile row does not wrap, so a fifth unit would push the word off a small screen.
Outside the multi-letter units, every letter is one sound. Levels 10 and 11 hold consonant
blends, which are NOT multi-letter units: a blend is two sounds run together, so "band" is
b-a-n-d on four tiles and "step" is s-t-e-p. The units are the six spoken digraphs (sh,
ch, th, wh, ck, ng), qu (one tile, says "kw"), the silent-letter pairs kn, wr and mb (each
says its surviving letter), the doubled endings ll, ss, ff and zz (each says its
single) — adopted with Levels 8 and 9 on 2026-08-04; ph was considered and left out
because no word obeys the bank's rules — and, since 2026-08-12, the two vowel teams ai
and ou.

This document said "the bank holds no vowel teams" until that day, and the sentence was
true when written. It stopped being true when "said" and "you" joined the heart roster.
The distinction to hold on to is that ai and ou are units for TILING, not vowel teams
TAUGHT as code: a heart word is learned by sight, and the tiles exist so the reveal can
tell the truth about it — s-ai-d, not s-a-i-d, which spells a word no child will ever
hear. Teaching vowel teams as decodable code stays ruled out (section 12), and neither
unit has a ruled default sound, so every word that uses one must bend it per word. A test
enforces that, with a control. `TRICKY` holds the note a grown-up reads when a word bends
a sound — twenty-three words carry one since 2026-08-15, when the fourteen heart-word
notes joined the owner's original nine (open-faults J1: a bent tile the reveal never
explained). "and" is the one heart word without a note, because it bends nothing, and a
test pins that absence as a decision.

| Level | Name | Focus | Words |
|------:|------|-------|-------|
| 1 | First Sounds | the first six sounds | an ant as at in it sat sit nap pan |
| 2 | First Sounds | swapping one sound | i pin pit sip tin pat sap tan tap tip |
| 3 | First Sounds | the short o | the into not on pot stop top pop spot tot |
| 4 | First Sounds | the c sound | a can cat cop cap cot cost catnip |
| 5 | First Sounds | the m sound | is am man mom mop map mat camp mint mist |
| 6 | First Sounds | plural -s, and the s that buzzes | to cops pots spots tops maps cats |
| 7 | First Sounds | the e sound | he comes men pet ten net pen set nest step tent pep |
| 8 | First Sounds | the d sound | we and did end mad nod sad sand dad den dip damp dent mend pad pod |
| 9 | First Sounds | the g sound | me gas gets got get gap pigpen dog dogs pig dig nag peg pigs sag tag |
| 10 | First Sounds | MILESTONE - First Sounds | be had ham hand has hat hats hid him his hit hint hog |
| 11 | Letter Land | the f sound | she fan fast fat fin find fit if fed gift soft fog fig fond sift |
| 12 | Letter Land | the b sound | you bad bed bit bat bib bin cab best bet dab bag big beds bond nab sob tab |
| 13 | Letter Land | the l sound | of land led left let lid lot lots animal leg flag last lend list melt |
| 14 | Letter Land | the u sound | was but dust fun hunt mud must nut sun tub up bug bugs bump gulf gulp lug mug nun |
| 15 | Letter Land | the r sound | said from her ram ran rat red rid rod rub run frog rag brag raft rib rig rim rob |
| 16 | Letter Land | the v and k sounds | are ever lived kid van desk kids milk ask kit vat dusk keg kept mask risk silk task vet |
| 17 | Letter Land | the j and w sounds | have jump jumps just swam swim want went wet win jig jog jug twig wag wed wig wilt wit |
| 18 | Letter Land | the z and x sounds | they ax ox box fix fox six zap zip fax mix nix sax vex zag zig |
| 19 | Letter Land | the y sound | my yes yam yak yap yet |
| 20 | Letter Land | MILESTONE - All The Letters | do held hits hold hop hot old us laptop sunset bus log logs pump pun snug sub sum tug |
| 21 | Letter Teams | doubled endings | go bill fell fill grass hill kiss smell tell buzz doll umbrella puff |
| 22 | Letter Teams | the sh sound | no brush dish fish ship shop shot wish wash hush mash shrub posh push rash rush sash sham shin shun |
| 23 | Letter Teams | the ch sound | so benches branches chop rich chin chip chat chest much such chill lunch bench munch chap chess |
| 24 | Letter Teams | the quiet th | bathtub thank thankful thin think bath path moth thud thump cloth month math |
| 25 | Letter Teams | the buzzy th | there that them then this with than brother other |
| 26 | Letter Teams | the ck spelling | back black duck kick lick lock luck pick rack rock chick chicks check chuck neck peck puck shock |
| 27 | Letter Teams | the wh sound | when what whack wham whiff whim whip whizz which |
| 28 | Letter Teams | the ng sound | sing king long bang fang gong hang hung lung bring something ding ping rang ring rung sang song |
| 29 | Letter Teams | the qu spelling | quick quit quack quiz quill quip squash |
| 30 | Letter Teams | MILESTONE - Every First Spelling | rocks sack sacks shack sick sock socks well dug hug chug chum rot shut tack thick trim trip |
| 31 | Busy Blends | one more sound at the end | help lamp lift pond rest romp band bank belt bend |
| 32 | Busy Blends | more sounds at the end | hands tents nests belts lamps desks gifts next |
| 33 | Busy Blends | two at the start: s- | sled slip spin skip slam slid snap stem swan swap |
| 34 | Busy Blends | two at the start: l- and r- | clap drum flat glad grab grin drop plan plum trap |
| 35 | Busy Blends | start and end together | blind stand stamp stomp plant drink trunk skunk print blend crust |
| 36 | Busy Blends | three at the start | spring scrap scrub splash split strap string strip strong |
| 37 | Busy Blends | the -ing ending | brushing fishing hunting singing yelling |
| 38 | Busy Blends | the -er ending, the doer | helper jumper singer another mother |
| 39 | Busy Blends | compounds | backpack dustbin hilltop sandbox |
| 40 | Busy Blends | MILESTONE - Longer Words | will yell cub cup gum hen hum jam job lap rug undo sung tick tuck wick wing |
| 41 | Word Builders | two beats | having never buses cobweb glasses illness muffin |
| 42 | Word Builders | two beats with a digraph | windmill rocket pocket bucket jacket sandwich chicken thunder chipmunk whisper |
| 43 | Word Builders | the -ed ending saying /t/ | jumped licked picked asked helped kicked mixed packed dressed brushed |
| 44 | Word Builders | the -ed ending saying /d/ | filled yelled spilled spelled smelled buzzed drilled chilled grilled |
| 45 | Word Builders | the -ed ending saying /id/ | ended landed lifted wanted |
| 46 | Word Builders | two letters, one sound | getting quitting sitting stopped stopping swimming butter hammer ladder pepper biggest digging rabbit |
| 47 | Word Builders | the -es ending | boxes brushes foxes wishes |
| 48 | Word Builders | the -le ending | little apple candle handle middle simple waffle bubble |
| 49 | Word Builders | the e at the end with a job | kitten dinner mitten puppet |
| 50 | Word Builders | MILESTONE - Word Builder | mitt mess miss pack pal pup rap rip shed shell thing unlock |
| 51 | Magic Letters | the -y that says the long e | finally very funny happy jelly lucky penny puppy sandy silly every |
| 52 | Magic Letters | the -y that says the long i | fly by cry dry shy sky sly spy try why butterfly |
| 53 | Magic Letters | y turns into i, and the -ly ending | cried dried happier spied tried gladly quickly softly |
| 54 | Magic Letters | three beats | besides banana wonderful |
| 55 | Magic Letters | a after w | wax wand water wallet |
| 56 | Magic Letters | review: everything so far | web cups hens lids pens twin all bash bell boss sunny things |
| 57 | Magic Letters | long a: a_e | ate cake cakes came game gate gates lake same save gave made waves |
| 58 | Magic Letters | long a: ai and ay | day lay pail pain paint play rain say stay tail player way |
| 59 | Magic Letters | long a: two more spellings | eight freight sleigh weigh weight grey hey obey |
| 60 | Magic Letters | MILESTONE - The Long A | hate late make makes take tame buck bud bun bush unhappy windy |
| 61 | Vowel Voyage | long e: ee | see deep feed feel feet green meet meets need seed seem seen |
| 62 | Vowel Voyage | long e: ea | deal each eagle eagles eat eating leaf leave mean meat reader seat teaching |
| 63 | Vowel Voyage | long e: three more spellings | these honey money monkey valley babies brief chief field niece pennies piece ponies |
| 64 | Vowel Voyage | long o: o_e and oa | coat coats goat holes notes road broke hole home hope come love nose note some those |
| 65 | Vowel Voyage | long o: ow and oe | slowly throw snow show grow slow toe goes window yellow pillow rainbow |
| 66 | Vowel Voyage | long i: i_e | likes bite dime dive fine five hide inside like line mile nine shine side smile time white live |
| 67 | Vowel Voyage | long i: igh and ie | bright flies high light might pie tie night right sight |
| 68 | Vowel Voyage | long i before two sounds | kind mild mind wild child kindly behind cold gold fold sold told bolt |
| 69 | Vowel Voyage | the same spelling, another job | read head bread ready heavy feather weather breakfast spread thread |
| 70 | Vowel Voyage | MILESTONE - All Five Long Sounds | goats cash cod cuff cut dam dash deck dim dock sheep yesterday |
| 71 | Sound Safari | the lazy vowel | sleeping holiday needed painted painter planted printed printer redo |
| 72 | Sound Safari | open syllables in longer words | baby lady paper lazy bacon maple gravy later apron table over tiger tigers |
| 73 | Sound Safari | dropping the e before an ending | liked noses saved biting smiled |
| 74 | Sound Safari | the oo of moon | moon pool room soon too tooth zoom |
| 75 | Sound Safari | the oo of book | good book look looked took put cube |
| 76 | Sound Safari | long u: u_e, ew and ue | blue clue cute dew few glue mule new true use |
| 77 | Sound Safari | the ou sound: ou and ow | found now out young could flowers cow down how loud house mouse our outside proud shouted sound sounds town wow |
| 78 | Sound Safari | the oi sound: oi and oy | boy going toy boil coin enjoy join loyal point royal noise soil spoil |
| 79 | Sound Safari | the ar sound | arm around barn car card cars dark far farm farms charm farmer hard park part start started tar yard |
| 80 | Sound Safari | MILESTONE - Every Vowel | dot fall fizz fuss fuzz gash gush gut hem hip sleep teeth |
| 81 | Secret Letters | the or sound: or and ore | for born corn more or shore sore store story tore horse torn worker |
| 82 | Secret Letters | the aw sound: aw, au and augh | away caught claw crawl dinosaur draw haul jaw laugh lawn paw sauce saw straw yawn |
| 83 | Secret Letters | the er sound: two more spellings | were birds girl bird burn curl dirt first purple shirt turn church nurse survey third |
| 84 | Secret Letters | the ear sound | deer ear ears hear here near year |
| 85 | Secret Letters | the air sound | where careful careless unfair |
| 86 | Secret Letters | the all and alk family | talk talked talking talks walk walked walking magic |
| 87 | Secret Letters | soft c and soft g | generous huge cities city cent pencil circle circus ginger princess gem germ |
| 88 | Secret Letters | the -tch and -dge endings | catch badge bridge edge fetch fudge judge match matches pitch scratch watch |
| 89 | Secret Letters | letters that stay quiet | knock knit knob knot lamb limb wrap wreck wren wrong climb thumb |
| 90 | Secret Letters | MILESTONE - Every Sound | hub huff hut jab jazz jet jot jut lab lad tree trees |
| 91 | Story Summit | the f sound: ph and gh | alphabet dolphin elephant graph phone photo |
| 92 | Story Summit | the ough family | dough though through rough tough enough cough bought brought fought ought thought |
| 93 | Story Summit | the -stle ending | bustle castle nestle rustle whistle wrestle thistle |
| 94 | Story Summit | ch does another job | school anchor stomach chorus mechanic orchestra machine |
| 95 | Story Summit | the sh sound in longer words | action ancient motion nation social special station |
| 96 | Story Summit | the ch sound in longer words | adventure capture future mixture nature picture |
| 97 | Story Summit | prefixes | under disagree dishes dislike precious remember rested retell return uncle |
| 98 | Story Summit | the -ful ending | helpful playful useful handful cheerful joyful painful powerful awful spoonful mouthful peaceful |
| 99 | Story Summit | the -less and -ness endings | darkness endless helpless hopeless kindness sadness |
| 100 | Story Summit | MILESTONE - Reader | lash lip lit loss lush met mill mob muck mush teach teacher |

The table above is the one owner of the level word lists, and gate G16 holds it to the
engine's `LEVELS`. A summary line of per-level counts stood here until 2026-08-15 and is
gone on purpose: it was a second copy of the table inside the same document, nothing bound
it, and it drifted — still saying 53 for Level 2 after the heart words took it to 60, so
the line summed to 438 against a bank of 445. Count from the table.

Levels 10 and 11 introduce NO new grapheme. Every letter in them is one the child already
knows; what is new is running two consonants together without a vowel between. Letters and
Sounds treats this as a fluency step rather than a new phase, which is why these levels
needed new words and no new sound. Built 2026-08-12 from words the owner approved by ear
between 2026-08-07 and 2026-08-11; the clips shipped are the exact bytes of those rounds.
"romp" was approved by ear and is NOT in the bank: the whole-bank appropriateness screen
refused it for its adult tabloid meaning.

Constants:

(A `HOMOPHONES` near-miss table lived here. Its only reader was the transcript matcher,
so it retired with the microphone on 2026-08-12.)


`chunkWord("ship")` gives `["sh","i","p"]`. The dashed form is `sh-i-p`.

An `ADULT_JUDGED` list lived here: five words whose sound is the name of the letter beside
them, so a child reading "am" perfectly was transcribed as "m". The app withheld the
microphone for those five and told the adult why. Both halves retired on 2026-08-12 with the
microphone itself — there is nothing to withhold, and section 6 had already ruled the note
absent wherever the adult judges every word, which is now every word.

To extend the bank, add words to a level's list or add a level object:
`{ n, name, emoji, focus, words }`. Level sizes can differ; the session builder serves 20
words at a time regardless. The hundred levels are generated from `tools/ladder/ladder-v4.json` by
`tools/convert-ladder.mjs --write` (the 2026-08-20 cutover); a level's name and emoji are its
decade's (`tools/ladder/decade-names.json`, owner-approved) and its focus line is the shape's
own teaching description. Extending the bank means extending the ladder and re-running the
writer, never hand-editing the generated literal.

## 4. Schedule engine

Data for each word:

```
{ box: 0..5, attempts, correct, close, wrong, dueAt: sessionNumber, lastSession }
```

Result rules. Apply a result only to the first attempt of a word in a session:

- correct, first attempt ever: set box to 3.
- correct, other cases: increase box by 1. The maximum is 5.
- close: keep the box. The minimum is 1.
- wrong: decrease box by 2. The minimum is 0.
- Always: set `dueAt = currentSessionNumber + INTERVALS[box]`.

Retry rule. A first-attempt wrong puts the same word back in the queue, three positions later,
one time. A retry does not change the box. A correct retry sets `dueAt` to the next session.
A close result does not get a retry, because the app already gave the correct pronunciation.
A retry is decided when the result is recorded, not when the adult advances, so the advance
control can name what its press will do. The control reads "Finish!" only when the press ends
the session, and "Next word" whenever another prompt follows, a second look included.

Session builder. Target 20 words, no duplicates, in this priority order:

1. Due words from lower levels, lowest box first, maximum 5.
2. Known words with box 4 or more, maximum 2, only after two completed sessions.
3. Due words from the next level, lowest box first, maximum 2.
4. Due words at the current level, lowest box first.
5. New current-level words, in list order.
6. If short: other eligible words at or below the current level, lowest box first.
7. If short, the current level has no new words, and the current level is learned: new words from
   the next level.

The current level is learned when 80 percent or more of its words are in box 2 or more. A box of 2
or more means the child has read the word correctly at least once and has not since forgotten it
twice: the box rises only on a correct reading, and a first correct reading sets it to 3. Rule 7
tests learning, not exposure. A child who has read every word at the level and got every one of
them wrong stays at that level and gets more practice there.

Rule 3 makes review reach the words rule 7 served. A next-level word the app has graded comes back
for review instead of being read once and then parked until promotion. The maximum of 2 keeps the
child's own level as the body of the session. No rule ever serves a word more than one level above
the current one.

Mix the list. Move the word with the highest box to position 1. Each session starts with a
probable success.

A session can have fewer than 20 words. Example: the first session has the 10 Level 1 words.

Promotion. Do this check at the end of a full session. Count the current-level words that have
box 3 or more. If the count is 80 percent or more, increase the level by 1. Example: Level 1 has 10 words, so
the threshold is 8 words. The maximum level is 100. The adult can also set the level
in the "Grown-ups corner".

A second path to promotion: two perfect sessions in a row. A completed session is perfect when
every word in it was read correctly. The state keeps a `perfectStreak` counter: a perfect
completed session adds 1, any other completed session resets it to 0, and a session that stops
early does not change it. When the streak reaches 2 on the session that just ended, the player
is promoted. Any promotion — on either path — resets the streak to 0, and a manual level
change in the "Grown-ups corner" also resets it: the streak is evidence at the level being
played, and it never carries across levels. The stored streak never exceeds 2, and a stored
streak alone never promotes outside a completed session. This path exists so a child who is
clearly ready does not wait for the box schedule on a large level. The maximum level stays 7.

Early exit. Opening the dialog ends the attempt in progress, exactly as each choice inside it
does. Nothing can be
recorded while the dialog is on screen.

The dialog reserves a place for each of its three controls, so no control ever moves while the
dialog is open. With nothing read yet, the Save control is present but inert.

If the adult stops a session early, the app shows two options:

- Save: the app writes a log row with a "partial" mark. The session counter does not increase.
  The app decreases `dueAt` by 1 for each graded word. The schedule of all other words does not
  change.
- Discard: the app restores the exact word data from the start of the session. The app takes a
  copy of the word data when a session starts.

## 5. Feedback text

`d` is the dashed form of the word. Example: `c-a-t` or `sh-i-p`.

- correct: `Great job! That is **{d}**, {word}.`
- close: `Good try! The correct pronunciation is **{d}**, {word}.`
- wrong: `Let’s try that again. The correct pronunciation is **{d}**, {word}.`

A PRE-LEVEL item (section 12 item 8) has no `{d}` and no `{word}` — a sound is not spelled
— so its feedback keeps each sentence's opening and stops where the word would begin:
`🎉 Great job!`, `💪 Good try!`, `🔁 Let’s try that again.` Same three grades, same order,
same warmth; the copy gate pins these exactly as it pins the three above.

The feedback shows below a row of yellow sound tiles, one tile for each unit. If the word is in
`TRICKY`, add the note on a second line.

Speech output, when sound is on, is the SOUND-OUT REVEAL. Owner-ruled 2026-08-04 and built
2026-08-11. The same shape follows every outcome, because a child who missed a word needs the
sounding-out at least as much as a child who read it:

1. the praise sentence (correct), `"Good try!"` (close) or `"Let’s try again."` (wrong)
2. the word
3. `"Pronounced:"`
4. each of the word's sounds in order, one per tile — as each sound plays, its own tile takes
   a hard outline for exactly as long as that sound lasts
5. the word again

The pause between any two of these is 500 ms, measured from the end of one SOUND to the start
of the next rather than between files, and a low hum plays under the whole reveal. A tricky
word sounds out with its TRUE sounds, never its letters: `she` is /sh/ + long e, `was` is
/w/ + short o + /z/ (ruled 2026-08-06). A multi-letter unit is one tile, one sound and one
outline (safety rule S8) — and where one unit spells two sounds, the word decides which:
`th` is the buzzing /ð/ in this, that, then, them and the, and the quiet /θ/ in thin, thick,
thumb, thud, bath, math, path, moth and with. `with` is the one word where the accents
disagree, and it takes the quiet one because the owner ruled for American pronunciation on
2026-08-11 — the voice is American, so the game agrees with the voice that speaks it.

Where the recorded pack cannot play, system speech says the short form instead — the praise
or invitation line, then `"The word was {word}."` (correct) or `"The word is {word}."` (close
and wrong) — and no tile is outlined, because nothing knows when each sound would fall.

The seventeen praise sentences. Each one is exact. Most point to the child’s own effort:

1. `"Great job!"`
2. `"You did it!"`
3. `"You knew just what to do with that word!"`
4. `"How do you feel about saying that word correctly?"`
5. `"You worked that out on your own!"`
6. `"Your reading is getting stronger every day!"`
7. `"You should feel proud of that one!"`
8. `"That was tricky, and you got it!"`
9. `"You sounded that one out beautifully!"`
10. `"What careful reading that was!"`
11. `"Sound by sound, you built the whole word!"`
12. `"You took your time and got it just right!"`
13. `"That word had no chance against you!"`
14. `"You stuck with it, and it paid off!"`
15. `"You made that look easy!"`
16. `"High five! You earned that one!"`
17. `"Every sound in its place — wonderful!"`

Sentence 4 is a question by design, reviewed and kept by the owner: it invites the child to
reflect aloud to the adult beside them. The app does not need to hear the answer — an adult
stays with the child in every session.

The lead and the word reveal are two utterances. The pause between them, not a slower rate, is
what keeps the word clear: a stretched word stops sounding like the word the child is learning.
Every utterance uses one calm rate, approximately 0.9, including the replay control. Pitch
approximately 1.1. Stop the previous utterance first. Use the locale from the settings.

When the next attempt starts, or a session ends without finishing, the app stops any speech
that is still playing. The reveal of one word never plays into the attempt on the next word.

### Voice packs

The app speaks through voice packs of recorded clips. For every utterance, the app plays the
first available source:

1. The family pack — recordings made in this app by an adult in the "Grown-ups corner".
2. The default pack — clips that ship with the app.
3. System speech — the Web Speech behavior above, unchanged, for any utterance a pack cannot
   cover or cannot play. A first tap unlocks the audio engine; every failure before sound
   falls back to system speech, so the child never hears a truncated utterance.

A whole utterance comes from one source. Voices never mix inside a sentence.

The app takes the audio session back before every reveal. A device that gives a capture
device the whole session — iOS does — leaves playback on a narrow route meant
for a phone call, and every word after the child's first recording sounds thin. The app
declares the session to be for playback and rebuilds its audio engine, which is what moves
the route on versions that have no such setting. If the engine cannot be running in time,
system speech covers the utterance, as it does for any other playback failure.

Recorded words are rendered from an approved recipe, not from whatever a synthesiser makes of
the spelling. Every clip carries a moment of silence before the word, because a clip that
begins on its first sound loses that sound between the file and the speaker: "cat" became
"at" and "an" became "n". Two-letter words carry an explicit pronunciation, since a
synthesiser reads them wrongly from spelling. A few words carry an approved trim of their
ending, because the synthesiser adds a small extra syllable after a final plosive: "hip"
became "hip-uh". A sentence must carry an explicit pronunciation when its spelling allows
two: "You read that word all by yourself!" was spoken with "read" as in "reed", which
teaches the wrong sound to a child who has just read the word. That line was replaced on
2026-08-03 with "You knew just what to do with that word!", so no current sentence needs a
pronunciation — but the build gate still refuses any sentence that leaves a
two-pronunciation word to spelling. The recipe ships inside the pack and the
build gate compares it with the approved values; a pack rendered with different settings
fails the build, because no automatic check can hear whether a word is right. Only a person
can approve new audio.

A pack holds one clip for each bank word (spoken at the voice's natural speed), the two carrier stems
("The word was" and "The word is"), the ten praise sentences, the two invitation leads
("Good try!" and "Let’s try again."), the two session-end lines, `"Pronounced:"`, and one clip
for every SOUND the word bank's tiles can ask for. The reveal is the sound-out described in
section 5, with a 500 ms pause between one sound and the next. The replay control plays the
word clip alone. Advancing to the next word, leaving a session, opening the finish-early
question, or asking to hear the word again stops any clip that is still playing and clears
any tile outline it had scheduled: safety rule S2 applies to clips exactly as it applies to
speech.

Every clip in the manifest declares where its own speech starts and ends, because the 500 ms
is a gap between sounds and not between files: the clips carry between 40 and 290 ms of
silence in front and up to 608 ms behind, so a pause measured file-to-file would run from
540 ms to over a second and the rhythm would be one nobody approved. `tools/voice-edges.py`
measures those edges from the audio and re-checks them; the player uses them to place speech,
and to outline each tile at the instant its sound starts rather than when its file starts.

The hum under the reveal (owner-ruled 2026-08-11) is generated by the app, not a clip: a
110 Hz fundamental with its fifth and octave, detuned by a slow breath, at -42 dBFS, fading in
and out over 250 ms. Half a second of dead air between two sounds reads to a child as the app
having stopped. It plays only under a sound-out, never under the replay or the session-end
lines, and it stops with the clips.

The default pack is rendered at build time from the open-source Kokoro model (Apache-2.0
weights), voice `af_heart`, with word clips at speed 0.85 and sentence clips at 1.0, encoded
at 96 kbps because a lower bitrate slurred the fricatives. The
model is a build tool. The app ships only ordinary audio files and a manifest. A gate fails
the build if any bank word or sentence lacks a clip, so the bank can never grow past its
voice.

The family pack is recorded inside the installed app behind the adult gate, in level-sized
chunks with pause and resume, with listen-back and re-record for every clip. Recordings stay
on the device. An adult can export the family pack as a backup file and restore it on any
device, like the progress backup. A partial family pack is fine: an utterance the family
pack cannot fully cover falls back to the default pack. When the word bank grows, the
"Grown-ups corner" offers a short top-up session. The app never records the child, and no
pack contains personal data beyond the recorded voice itself.

The replay control (a speaker symbol in the "grown-up" strip) operates only in the feedback
phase, and only while sound is on: with sound off it is disabled, the Glowseed (the listening
light in the stage's corner, art step 2) wears its muted look, and the strip's marker line
says "Parent: sound is off" (2026-08-23; before that the control was live and silent), which
it shares with a second look rather than replacing it — section 6 owns the order. The
app never says the word before the attempt.

## 6. Screens and modes

The screens are: home, session, done, and "Grown-ups corner".

A per-word adult note lived here, for the five words recognition could not judge. It was
ruled to belong to microphone mode only and to be absent wherever the adult judges every
word; on 2026-08-12 that became every word, and the note retired with the microphone.

Layout. Each screen has three fixed zones in a `100svh` shell: a header, a stage, and an action
rail with the "grown-up" strip below it. The word position in the stage does not move, and
the word sits at the visual centre of the stage: the stage's top spacer carries the reserved
rows' worth of extra basis, so the word's midline meets the stage's midline on a phone and
degrades gracefully on very short screens. The tile
row and the message row have reserved space. The stage can scroll only when the user sets a very
large text size. The strip has extra bottom padding. This keeps the controls out of the iOS
gesture area. A toast never covers the child's own control. The gap it must leave is measured
from the rail and the strip as they are rendered, because that height differs from screen to
screen and moves with the device's safe area; it is never a fixed number of pixels. A landscape screen 640 px or more wide and 420 px or more high shows the same
single centred column as a portrait screen, with a larger word. The tile row and the message row
stay directly under the word, because they explain it.

Home. The title, an optional greeting with the name, the level, the counters, and the "Begin
Session" control. Adult text shows in the strip, not below the child's control.

Session, microphone mode: removed 2026-08-12. Every session is now the one below, and the
word "adult mode" is kept only where it distinguishes the past from the present — there is
one mode and it needs no name.

Session, adult mode. The stage asks the child to say the word aloud. The adult gives the result
with the strip controls.

Session, free play. Entered from the second control on the home screen ("Free play", a full
child-size control styled quieter than "Begin Session"). The tap opens a chooser before any
word is shown, addressed to the grown-up, laid out as a GRID (owner-ruled 2026-08-21 from a
mock he called perfect): one row per activity — Words, Sentences, and Build (or Sounds while
the child is on the pre-letter ladder) — and two full child-size cells per row, the LEFT the
child's own level and the RIGHT anything in the whole game, plus a "Back" control that
starts nothing. For words that is "Level N words", the same mix a session would serve, and
"Any word", a uniform draw over the whole bank. For sentences, this level's texts and every
text in the game. For Build, a level word and any buildable word, dealt at that word's own
level. The Sounds row has its level cell only: "any sound" would offer letters the rung has
not taught, which the 2026-08-17 Build-a-sound ruling forbids, and it waits on the owner.
Until that day the chooser was a single "Truly random" row over three activity rows, which
meant random WORDS only; a Level 1 save met its one sentence over and over. The loop in both
columns is the session loop — the same
phases, feedback sentences, praise, reveal and wait — but it runs against
a throwaway copy of the progress and never writes. The header shows a "FREE PLAY" label and
a count of words read instead of the progress bar and the x-of-20 count, both of which
promise an ending this mode does not have. In level play the level chip stays; in truly
random play a dice mark replaces it, because a level number would claim a level the mode is
not serving. When a block of words runs out the next is built: in level play from the copy,
so a word read well recedes and a missed word returns; in truly random play as a fresh
uniform draw from all levels at once, without repeats inside the block and never opening on
the word just read. The advance control never reads "Finish!". The home control leaves at
once — no save-or-discard dialog, because there is nothing to save — and the copy is thrown
away.

The strip controls. Three result controls: got it, close, not yet. A pointer must hold a control
for 450 ms. A fill shows the hold progress. A keyboard operates the controls directly, and so
does a screen reader or any other assistive technology: an activation that carries no pointer
behind it counts as a keyboard press, never as a touch. The controls are muted in color and
small in appearance, with a minimum target of 44 px.

The ladder refuses a session it cannot ask (2026-08-23; re-derived 2026-08-29 for the chunk
ladder, under the owner's 2026-08-24 ruling that the refusal lifts for reading rungs and stays for any
rung that asks with a sound). Every rung is now MIXED: its letter items ask with a SOUND —
the letter shown, not read, the approved sound as the prompt, the child saying it back — and
its chunk items are READ, printed on a silent screen, answerable without sound. A rung needs
sound exactly when it carries a letter item, and both rungs do, so the blanket refusal keyed
on being anywhere on the ladder remains TRUE of every rung a child can hold — but the reason
is now per-item, and a test derives it from the items themselves rather than trusting this
sentence: a future all-chunk rung would fail the derivation rather than a reading child
being silently refused. The alongside chunk drills a graduate meets inside word sessions are
pure reading and are never refused for sound. (An earlier draft of the 2026-08-23 paragraph
claimed the rungs deal a Build-a-sound tray with nothing printed; that was wrong —
`PRE_TRAY_FROM` governs free play's Find-the-sound mode, never a session. Corrected
2026-08-23 by the release sweep.) With sound off a letter item cannot be answered, and every
grade the adult gave was still written to the child's ladder record. So "Begin Session" is
refused while the child is on the ladder and
sound is off, and the chooser says why in its own voice, in exactly these words:

> The first steps need sound. Turn sound on in the Grown-ups corner.

The sentence is named by the control it explains, so a screen reader reaches it from the
button rather than by sweeping the page, and it is dark enough to read on the sky at every
gradient stop. Free play and every printed word are untouched: a child past the ladder reads
print, so words are unaffected, and nothing about this refusal writes to a record.

The strip marker line. The strip keeps one line below its controls, whether or not there is
anything to show, so the strip height never changes and the word never moves between phases.
The line is reserved in every phase so the strip height never changes. Outside the feedback phase, a
word the child is seeing again shows "Parent: second look". When sound is off as well, the line
carries both, sound first: "Parent: sound is off · second look" — the second marker drops its
own "Parent:" rather than repeating it. Sound-off used to replace the second look outright,
which meant that in a silent session the adult was never told a word was a repeat: of the two
it is the one available nowhere else, while sound-off is a standing state the speaker control,
the listening light and the Grown-ups corner all show at the same instant (2026-08-23). The
line stays one line at every supported width, because a second line grows the strip and moves
the word. The pre-ladder's strip carries the sound-off marker only; it has no repeat to report.
Every marker on this line names the
adult as its reader, the same as the tricky-word notes. A child can
see this line, so a marker that reads as a verdict on the child's own attempt does not belong
here: the words say who they are for.

Feedback phase. The tiles and the feedback sentence appear in their reserved rows. The advance
control ("Next word" or "Finish!") waits for the reveal to finish speaking, because advancing
silences it and the word itself is the last thing the child hears. Where there is no recorded
reveal to wait for — sound off, or a pack that cannot play — the control is not active for the
first 400 ms. The advance control is the only control in the action rail.

While the control waits, a fill crosses it at a steady rate and reaches the far edge as the
control becomes active. The fill lasts exactly as long as the wait it shows, whether that is the
reveal or the 400 ms guard. It carries no text, because a child who is learning to read must not
have to read anything to understand a wait. The fill is information, not decoration, so it still
runs when the device asks for reduced motion. The wait is set twice on every word — a short
guard when the result is recorded, then the reveal's real length once its clips are scheduled —
and the fill carries on from where it is rather than restarting, because a bar that jumps
backwards is not information. While the control waits, its label is the app's
ink, not white: white on the waiting colour measures 2.14:1, and the ink 5.57:1. An inactive
control has no contrast duty under WCAG, but this one waits about seven seconds on every word.
The label turns white as the control comes alive, which is one more sign that it is ready.

The advance control takes the keyboard when it becomes active, not when the result is recorded,
because a disabled control cannot hold focus. So the next key press moves the session on, and a
screen reader announces the control as soon as it can be used. If the grown-up has moved to
another control while the wait ran, or the early-exit dialog is open, their choice stands.

The grown-up can end the reveal early. A "⏭ skip" control sits in the grown-up strip beside
the replay control, active in a REVEAL of either kind — a word's feedback phase, or a
sentence's reveal — and takes the same 450 ms pointer hold as the grading controls; a
keyboard or assistive technology operates it directly. The wait exists so the child hears the
word, so a child's tap on the skip does nothing. The held press does exactly what the advance
control does when it comes alive: the reveal falls silent at once and the next word — or the
session end — follows. On a sentence it does what the green control does, ending the sentence
and paying back the turn it took, and never merely advancing the word queue underneath a
sentence still on the screen. The slot is reserved in every phase, disabled in either
ATTEMPT, so no control moves under a finger and no child is cut off before their turn.

The sentence half was owner-ruled 2026-08-24, on open fault AJ. Until then the control was
tied to the word's feedback phase alone, and a sentence sets the phase to its own value, so
the control was dark for that whole mode — found by the owner on a real phone: "when a
paragraph is read you can't skip". Nobody was trapped, since the green control always ended
the sentence; it was a control that could never be used, with nothing to say that was
meant.

Done. This screen shows a trophy, the three counters, and the accuracy. A praise line has three
steps: 90 percent or more, 70 percent or more, and below 70 percent. A level-up shows in the trophy zone, not as an
extra row.

Grown-ups corner. This screen shows these items:

- The name field. The field saves on blur.
- The mode control and the sound control.
- The pre-level control, ABOVE the level control (owner-ruled 2026-08-24, built 2026-08-29:
  "the ladder comes before the levels in a child's journey, so it comes before them on the
  page" — the order a parent reads is the order a child travels).
- The level control, with a help line.
- The mastery map. Each level has one summary row and an expand control.
- The word list a parent can consult (owner-ruled 2026-08-24, built 2026-08-29: "a list of
  every pre level and real level, and what words they introduce at that level to children,
  so parents can consult it whenever they want"). DERIVED from the engine's levels at the
  moment it is shown — a typed copy would be wrong the first time a word moved. Collapsed
  by decade, each header carrying its range and its count of new words, because a hundred
  levels is a long scroll on a phone and the ladder already thinks in tens; a "See it all"
  control opens every decade at once, the escape hatch ruled the same day. The pre-level
  rungs come first as their own short group — they teach letter sounds and reading chunks,
  not words, so the decade shape would misdescribe them — and the reader's current place is
  marked, so "where are we" is answerable at a glance. A level shows the words it
  INTRODUCES, which is the question a parent is asking. Adult-facing; reads nothing aloud;
  no S2 concern.
- The session log and the export control.
- The bug report (owner-ruled 2026-08-22). The app keeps the last 20 problems it met - an
  uncaught error, a rejected promise, a render crash - on the device, with the time, the
  version, the screen, the message and one stack line; every web address is cut to its file
  name and no name is ever written. It is NOT part of the session log. The corner shows
  only the count, says in plain words that nothing is sent by itself, and offers "Copy bug
  report" and "Clear". A grown-up copies it and chooses whether to send it anywhere (S6:
  the app itself makes no request). A render crash shows the child one sentence and one
  56 px control back to the start, never a blank page.
- The "Voice & accent" list stood among these items until 2026-08-29 and was REMOVED,
  owner-ruled 2026-08-24: "there shouldn't be a drop down 'choose your desired accent',
  since at present we have no choice, we only have the af_heart we have build." It was not
  merely useless but misleading — `settings.lang` is read on one path only, the system-
  speech fallback used when a recorded clip cannot play, so the list named the game's voice
  and changed something else. The fallback still needs a language and one is kept without
  being asked about: the stored default, en-US. If a second recorded voice is ever built,
  the choice returns, naming voices that actually exist and changing the one a child hears.
- The reset control. The reset asks a
question. The confirm control and the cancel control are in different positions. The cancel
control is larger.

## 7. Data and export

One state object:

```
{ version, level: 1..7, sessionsCompleted, perfectStreak,
  settings: { sound, childName, lang },     // `mode` retired 2026-08-12 with the microphone
  words: Record<string, WordState>,
  log: [ { n, date, level, c, k, w, acc, items:[{ w, r, retries }], partial } ] }
```

The bug report ring is separate from the state: localStorage key `wq-errors`, at most 20
entries, never exported with the log or the backup, cleared only by the corner's control.

Two facts are derived from the state and never stored (art project, owner-ruled
2026-08-22). The ladder is complete when the child is at level 100 and that level's words
are secure by the same rule promotion uses between levels (`isSecure`: at least 80 percent
of the level's words at box 3 or above) — and only that: the two-perfect-sessions path
promotes between levels and never ends the ladder. The garden state, which the art bible's
section 6 draws, is the tenth of the levels completed — `floor((level − 1) / 10)`, so 0
through level 10 and 9 through level 100 — and 10 when the ladder is complete.

Write the state after each result and at the end of a session. A page refresh in a session must
not remove results. The log number `n` is the log row count. `sessionsCompleted` counts full
sessions only.

The state version is 3. If the app loads a version 2 state, the app does a one-time migration:

- Increase `level` by 1.
- Increase the `level` value in each log row by 1.
- Set the version to 3.

The migration does not change the word data. The migration runs one time only. The app always
limits `level` to the range 1 to the number of levels in the bank, which is 11.

Before the migration, the app repairs the document. The repair function makes sure that `words`,
`log`, and `settings` are present and have the correct type. The repair function limits each word
box to the range 0 to 5.

If the stored data is not valid JSON, the app keeps a copy at the key `{KEY}:corrupt`. The app
then starts fresh and gives a message.

If the storage does not answer in three seconds, the app shows a fresh start and stops all
writes. This prevents damage to a saved file that the app cannot read. If the storage then
answers before anything has been written and before the child leaves the home screen, the app
adopts the answer silently - the saved progress, or a fresh start that may now be saved - and
writes resume. Once something has been written or the child has left home, a late answer is
only announced: "Saved progress found. Reload to continue it." (Owner-ruled 2026-09-01.)

The name is optional, with a maximum of 20 characters. The name never leaves the device.

The Markdown export has four parts:

- A header, with the date, the level, the session count, and the mastery count.
- A session table. A "partial" mark shows where applicable.
- The last session, in detail.
- A mastery list for each level.

## 7a. Updates

An update never interrupts play. The home screen's grown-up strip shows the installed
version beside a "Check for updates" control, and the "Grown-ups corner" shows the version
too (the manual controls moved from the corner to the strip, owner-approved 2026-08-07).
Both update controls take the same 450 ms pointer hold as the adult result controls,
because they sit on the child's first screen: a child's tap does nothing, and a keyboard
or assistive technology operates them directly. "Check for updates" asks the app's own
host for the latest version number and shows the result in the strip: "You have the
latest version.", or that the newer version is ready, with an "Update
now" control. Updating swaps in the new version and reloads the app. The child's progress
and any family recordings live in on-device storage that an update never touches. A
downloaded newer version never applies while the app is open: the adult applies it at once
with "Update now", or it applies the next time the app starts fresh. The version check is
one of the two network requests safety rule S6 permits after load: adult-initiated, same
host, no data carried. When the check cannot reach the host, the app says so and changes
nothing.

`version.json` carries the version and a build stamp — the short id of the commit the build
came from — and the check compares both, so a fix shipped between named versions is offered
as an update too (owner-approved 2026-08-07, after "You have the latest version." stood over
a newer build of the same beta). A `version.json` without a stamp, such as an older
self-host, speaks only to the version. A newer build of the same version is offered in
plain words ("An update is ready"), and the strip and the corner show the stamp beside the
version number.

The foreground check is the second S6-permitted request, approved by the owner on
2026-08-03. A page that lives for a long time without a reload — a Safari tab kept open, a
home-screen app resumed from memory — never discovers a new version on its own, because
the browser only looks on page loads and this app never navigates. So each time the app
returns to the foreground, it asks the browser to look for a newer service worker on the
app's own host. The request carries no data, and a newer version found this way still only
installs and waits. The "Grown-ups corner" states this in plain words beside an "Automatic
update check" switch; Off means the app makes zero requests on its own and only checks
when the adult presses and holds "Check for updates" on the home screen. The setting is on
by default, saved with the other settings, and an update never changes it.

Self-hosters who run the game from a clone of the repository update with `git pull` and a
rebuild; `docs/self-hosting.md` gives the steps. The in-app check works for them too, against
their own host.

## 8. Build steps for a standalone app

The reference build runs in a chat host. A standalone build changes four items:

1. Scaffold: Vite, React, and Tailwind. Make a PWA with a manifest, icons, and a service worker.
   The app must operate offline. The primary target is iPad Safari. Also test desktop Chrome.
   An installed app never keeps running a superseded version: when a new version takes
   control, the app refreshes itself once. It waits for a safe moment to do so. A refresh
   never happens during a session, because it would take the screen away from the child and
   drop the words already read from that session's total.
2. Recorded voice: the app speaks with its own recorded pack, and falls back to the device's
   own speech when it cannot. The microphone that lived in this item until 2026-08-12 is
   gone; what replaced it here is the thing this item's fenced block always existed for — a
   set of sentences the app must say, word for word, pinned in the document and checked
   against the code.

   A whole utterance comes from one source (section 5a). If the pack is missing any clip the
   utterance needs, or the player will not run, the app uses the device's own speech instead.
   The child's experience is unchanged: the words are still spoken and the results are still
   saved. What is lost is the sound-out lighting up letter by letter, and the grown-up is
   told so — in the "Grown-ups corner", never on the child's screen, and only after it has
   actually happened. These are the exact sentences:

   ```
   heading   "The recorded voice"
   what      "The game is using your device's own voice at the moment, not its recorded one."
   cost      "but the sound-out will not light up letter by letter, and the listening light stays dark."
   ```

   Every fallback names its own reason and the reason is shown with those sentences. There
   are five and each has its own words: no audio player on this device, the pack did not
   load, the pack has no clip for a named id, the player was not running when the words were
   due, or playback threw. A fallback that leaves no trace is the fault this rule exists to
   prevent: a pack that quietly stops resolving looks exactly like a design choice.

3. Storage: change the storage adapter to IndexedDB with the same one-object schema. Add JSON
   export and import of the full state.
4. REMOVED 2026-08-12, owner-ruled. This item proposed a cloud pronunciation-score API
   behind a server proxy, with an `assessPronunciation(audio: Blob, target)` stub that shipped
   unused for months. It goes for the same reason the microphone went, one day earlier: its
   only possible input is a recording of the child, and sending that off the device is not one
   of the two requests safety rule S6 permits. "Opt-in" was the guard the original item
   offered, and the microphone had one too — a toggle in the Grown-ups corner — which is
   exactly why the owner ruled that a feature merely turned off is a feature somebody turns
   back on. There is no cloud scoring in this app, and adding one is a new ruling, not a
   revival of this item.

The repository has a test suite. Run `npm test`. The command first extracts the engine to
`src/engine.js` with `tools/extract-engine.mjs`, then runs Vitest. `docs/testing-gauntlet.md` defines the full gate set. All
values in the tests are literal values. A test never reads the constant that it checks.

Tests (Vitest), minimum list:

- `chunkWord`, with digraphs. Examples: duck gives [d,u,ck]; sing gives [s,i,ng].
- The result rules, with the first-sight rule.
- The session builder: the mix and the no-duplicate rule.
- Promotion at exactly 80 percent.
- The retry rule and the 26-prompt maximum.
- Early exit: save does not increase the session counter; discard restores the exact word data.
- The Markdown export format.
- Data repair: an incomplete document gets a usable shape before any other function reads it.
- Name truncation: a 20-character limit does not break an emoji character.

The minimum platform is iPadOS 15.4 or later, or an equivalent browser. The app uses
`structuredClone`, which is not available in earlier versions.

## 9. Visual identity

- The palette is the object `C` in the reference build, and its one statement in prose is
  the token table in `docs/art-bible.md` section 9.3, which doc-truth binds to `C` by name
  and value (art project, 2026-08-22). No app source and no line of the reference outside
  `C` types a colour as a hex, rgb() or hsl() literal — the quality control refuses one,
  and shadows, scrims and frosted fills derive their alpha from a token through
  `alpha()` — with two declared exceptions that cannot import `C`: `app/index.html` and
  the web manifest retype `skyBlue` as the theme colour. (The first sentence here said
  "nothing else restates a colour" before any control held it; the council found fourteen
  hex literals and seven decimal restatements of ink on 2026-08-22, and the control now
  covers both.) The background is the gradient of `skyBlue`, `skyLavender` and
  `skyPurpleMist`; teaching ink is `ink`.
- Text and fills pass WCAG AA at 4.5:1 or more against their backgrounds, measured by
  G7's contrast walker; a control's edge is measured by `tests/tokens.test.js` at the
  named pairs, and one edge is below the 3:1 the art bible's section 15 asks until the
  step that owns it darkens it — `docs/open-faults.md` AA (the adult controls' `line`,
  step 4); AB (the open sentence word's ring) closed the same day it opened, when art
  step 1 moved the ring to `cyanStructural`. This sentence said "all text and control
  colors" before either was measured (corrected 2026-08-22).
- Word and interface font: `ui-rounded / system-ui` (SF Pro Rounded on Apple devices). The
  rounded forms stay friendly for children, and the letter shapes match everyday print,
  including the double-storey "a" that children see in books.
- White cards, large corner radius, soft shadows. Small motion only. The app obeys the
  reduced-motion setting.

## 10. Acceptance criteria

- [ ] First start: the first session gives the 12 Level 1 words and no other words.
- [ ] A version 2 save at level N opens at level N+1. The word data does not change.
- [ ] Next-level words appear only after the child has seen all current-level words.
- [ ] No result of any kind is recorded without an adult's action. A whole session left alone
      records nothing, and the app reaches no recogniser and no capture device at any point.
- [ ] The page does not scroll in a session at standard text sizes. At 200 percent text size, the
      stage can scroll. No content is cut off.
- [ ] The word position does not move between phases.
- [ ] A first-attempt miss comes back approximately three words later, one time. The prompt count
      never goes above 26.
- [ ] The feedback text is equal to section 5, character for character. "ship" shows as sh-i-p.
      "was" shows the tricky-word note. Speech output never says letter names.
- [ ] The replay control operates only in the feedback phase, and only while sound is on.
- [ ] A perfect first session gives Level 2.
- [ ] Early exit: save keeps the session counter constant and adds a "partial" log row; discard
      restores the exact word data.
- [ ] Stop the app in a session. Start the app again. No result is lost.
- [ ] The adult result controls need a 450 ms hold with a pointer. A keyboard operates them
      directly, and so does a screen reader: with VoiceOver on, a double-tap records the
      result. Two controls held at once record one result, not two.
- [ ] The dialog window holds keyboard focus and closes with the Escape key.
- [ ] With no name set, no personal data shows in the interface or in the export.
- [ ] Damaged data: the app keeps a copy, gives a message, and starts fresh.
- [ ] Slow storage: after a timeout, the app writes nothing.
- [ ] A name with an emoji at character 20 stays correct in the interface and in the export.
- [ ] The app operates offline after the first load. The app obeys the reduced-motion setting.
      Child controls are 56 px or more. Adult controls are 44 px or more.

## 11. Prompt for an AI coding agent

> Read `SPEC.md` and the reference build `reference/word-quest.jsx`. Make a Vite + React +
> Tailwind PWA that obeys the specification exactly. First move the engine functions
> (`chunkWord`, the result rules, `buildSession`, promotion, the early-exit rules) into pure
> modules with Vitest tests. Then build the interface. Change the storage adapter to IndexedDB
> (section 8, item 3). Follow the recorded-voice rules (section 8, item 2) with
> design rule 1. Then check each item in section 10. Do not build section 8, item 4. Make the
> interface stub only.

## 12a. THE TEACHING PATHWAY — owner-ruled 2026-08-17

**This section owns what the game teaches and in what order.** Everything else in this
document describes how a level behaves; this says what the levels ARE. It replaces the
21-level ladder that grew by accretion, and the replacement was chosen deliberately and
early, on the owner's reasoning: better now than in two months.

**The ruling: the Sound Ladder, with three grafts.** An independent specialist in early
reading wrote four complete pathways — organised by spelling (the UFLI shape), by sound
(linguistic phonics), by meaning unit, and by text yield — and the owner chose the sound
ladder and all three grafts offered with it.

**Why the sound ladder.** English writing is a code for the sounds of speech, and the code
has three facts a child must own from the first week: a sound can be written more than one
way, a spelling can have more than one job, and a spelling can be one to four letters long.
Teach those and nothing ever has to be unlearned — no magic e that breaks on "have", no
silent letters that are not silent. The decisive argument was fit: this game already puts
multi-letter graphemes on ONE TILE, already refuses to say letter names, and already binds
a sound to a spelling PER WORD. That is linguistic phonics, built before the pathway was
chosen. The other pathways need the app to express rules — magic e, bossy r, the floss rule
— that a tile-and-sound screen has no vocabulary for.

**The three grafts, and what each fixes:**

1. **From the grapheme ladder: the complete inventory, written out at the end.** ph, gh,
   eigh, -ough, gn, -stle, ci/ti, ch as /k/ and /sh/. The sound-first tradition tends to
   leave that tail to incidental exposure; completeness costs nothing and this ladder states
   it.
2. **From the meaning ladder: the suffixes, twenty levels earlier.** -s inside the initial
   code, -ing and agent -er on stems that need no doubling, -ed in all three of its sounds
   early. This is the single strongest research finding in the specialist's report —
   morphological instruction helps YOUNGER children more than older ones, (Bowers,
   Kirby and Deacon, 2010, a systematic review of twenty-two studies in the Review of
   Educational Research, where the effect was larger for less able readers too). It argues directly against saving -ing and -ed for the top of the
   ladder, where every real book puts them on page one. **Suffixes get their own Build-it
   tiles**, so a child assembles jump + ed as two pieces rather than seven letters.

   **The graft reached -ly last. The owner ruled on 2026-08-19: "L53 teaches y-to-i AND
   -ly."** Every other suffix already obeyed the argument above — -s at level 6, -ing at 37,
   agent -er at 38, -ed at 43, -es at 47 — and -ly alone sat at level 98 of 100, which is
   the top of the ladder this graft exists to argue against. The ladder had already
   convicted itself: it seated *finally* at level 51 and *slowly* at 65, teaching -ly words
   thirty-three and forty-seven levels before it taught -ly. Level 53 is where it belongs
   because that level already teaches the other half of the same fact — y turning into i
   when an ending arrives — and because *gladly*, *quickly* and *softly* need no sound a
   child has not met by level 51. *kindly* went to level 68 instead, where the long i
   before two consonants is taught: read at 53 a child gives it the short i of *kid* and
   says the first syllable of *kindle*. That is the same reasoning that moved *child* from
   level 23 to 68 on the same day. Level 98 keeps -ful, and falls to three words — a word
   bill for the owner, never a level to pad.
3. **From the text ladder: about twenty heart words front-loaded**, so a real sentence
   exists in the child's second week rather than their sixth. The sound ladder permits this
   on its own terms: a word may be introduced ahead of the code that explains it, provided
   the child is told which part is doing a job they have not met yet.

**The shape, in one line:** sounds-first architecture, complete grapheme inventory,
morphology braided in from the middle of the initial code, and twenty heart words up front.

**The arithmetic, and the owner's ruling on it.** 100 levels of 6 to 10 words is at most 800
words of explicit teaching; the full code plus multisyllabic work and suffixes needs roughly
1,200 to 1,500 exposures. The owner ruled on 2026-08-17 that **the pathway must reach 1,200
to 1,500** rather than settle for what the level word-sets can hold. The surplus rides on the
two strands that already exist: **a level TEACHES its words and PRACTISES many more**,
through the sentences that appear in every level after the earliest sounds and through the
spaced review that brings earlier words back. A word met only in a sentence is still a word
met, and the review queue is what turns meeting into knowing.

**The parameters the owner fixed with the ruling:** the pathway ends where a child can read
an early chapter book, which is roughly the end of Grade 2 — all the single-syllable code
plus multisyllabic words and the common suffixes. It is aligned to US science-of-reading
practice, because the voice pack is US English and a British sequence would teach vowel
distinctions this voice does not make. Encoding is a first-class strand: every level says
what a child should be able to BUILD as well as read, and it stays ungraded, so S1 and the
practice-only property are untouched. Levels hold 6 to 10 words and the ladder may run to
100. Sentences appear in every level after the earliest sounds and grow to paragraphs, from
public-domain sources as before. Level names are numbers; only the decade levels are named.

**What this pathway does NOT do, recorded because a green ladder invites more confidence
than it has earned.** It does not teach fluency, and fluency is the real gate to a chapter
book: that comes from volume of reading a grown-up supplies, not from five minutes of word
work. It does not teach language comprehension, and reading is decoding multiplied by
language — a child can finish level 100 and still not understand a chapter book if nobody
has been talking to them and reading to them. Both belong in the "Grown-ups corner" in plain
words.

## 12. The road ahead — approved and unbuilt

The owner's goal is a full phonics training game, grown slowly. Everything in this section
was researched against the field's scope-and-sequences and ruled by the owner on
2026-08-07. Nothing here is built, and nothing here is behavior yet: each item ships only
after its word list is culled by the owner, every new word and sound passes the same
listening rounds as the shipped bank, and every gate grows to cover it. An item leaves
this section for the body of the specification when it ships.

Levels, in order:

1. Level 10, final blends (CVCC: hand, jump, milk). Research: final blends are easier than
   initial ones, so they come first.
2. Level 11, initial blends (CCVC: stop, flag, swim).
3. **SHIPPED 2026-08-16 as Level 21, Cats and Dogs** — the plural-s level, built in
   the small hours and morning after beta.20 (the commit clock, not the narrative,
   dates it). The owner culled the roster to fourteen on a decision page
   (cans waits in the ledger on the jugs precedent), romp took its seat in Level 19,
   and twelve sentences passed the owner's read and listening round 7 the same day.
   The s says /s/ after a quiet ending (cats, hats, pots, maps, cups, tops) and /z/
   after a voiced one (hens, pigs, bugs, pens, kids, dogs, beds, lids) — the engine's
   WORD_SOUND bends the eight voiced plurals to the z of "is". The ruled exclusions
   stand: jug, bun, nut and crab have plurals that stay out. Of the nineteen waiting
   words, the three compounds still wait on Level 13's display ruling below.
4. Level 13, compound words (CVC+CVC: sunset, catnip, laptop) — the first two-syllable
   step, each half a word the child owns. Needs a ruling on how a word past five letters
   displays; the current tile row caps at five.
5. Level 14, open syllables, a seven-word mini-level (he, we, me, be, go, no, so) — the
   vowel says its name because nothing closes it.
6. Level 15, magic-e (CVCe: cake, dime, home, cube). The five letter-name vowel sounds are
   already in the sound library against this day. Vowel teams stay OUT of this level:
   teaching both at once confuses children.
7. Beyond, unscheduled: r-controlled vowels (ar and or first, then er/ir/ur), then vowel
   teams. **Every sound these levels need is already approved and waiting**, counted
   2026-08-14: `ar`, `or`, `er`, `aw`, `oi`, `ow`, `air`, `ear`, `zh`, plus `long_a` and
   `long_u` for magic-e — eleven in all, each graded by the owner and sitting in
   `tools/pending-sounds/`. Shipping one is a file copy by `tools/ship-sounds.py`, not a
   listening round. `d:long_o` proved that on 2026-08-13, having been called unheard for
   three days while its `perfect` verdict sat in the ledger.

   **THE TARGET VOCABULARY, owner-ruled 2026-08-16.** The road now has a
   destination: "I would like for the game to cover at least these words by
   the time we call it done" — the word index of the owner's phonics primer,
   lessons 10 to 100, photographed and transcribed the same day. Of its 434
   distinct words the owner refused fifteen on a decision page: thirteen
   book-artifacts and character names (blap, ruck, ding, blam, biff, beagle,
   boo, zzzz, ho, sam, let's, eagle's, don't — sam is also a given name the
   S9 gate refuses), and gun, by the appropriateness screen. shot was
   admitted by the owner's amendment — "Also shot is fine in the right
   sentence" — the word may be taught; the sentence screen judges each use.
   **The target was 420 words on 2026-08-16 and is 697 since 2026-08-18**, when
   the curriculum redesign found that thirty of the new hundred levels had fewer
   than six on-topic words in any approved source and fifteen had none at all.
   The owner ruled on 295 candidates and refused four: fight, hustle and grind on
   appropriateness, and neighbor turned down for the long-a level. Twelve were
   already on the first list, so 277 joined it. Two of the approved words are
   claimed by two levels each - purple by the -le level and the ur level,
   elephant by the three-beat level and the ph level - and each belongs at the
   LATER of the two, because a word cannot be read before every grapheme in it
   has been taught. **147 of the original 420 were covered by the 461-word bank
   as of Level 21.** The uncovered words map onto the road above: vowel teams,
   magic-e, r-controlled vowels, -ing forms, and the two-syllable stage. The
   list lives at `tools/target-vocab.txt`. One word collided on arrival:
   hope is both a target word and was an entry in the S9 gate's given-names
   list, and the owner resolved it the same day — "Hope stays in word list
   remove from given name list on my authority" (2026-08-16). The name moved
   to the list's excluded-with-reasons section, the g24_common floor moved
   890 to 889 on that authority, and the pair rule still refuses Hope beside
   any surname.

8. **EXPANDING DOWN — the pre-level ladder. Owner-asked 2026-08-14; RULED and BUILT
   2026-08-15** (four verdicts on a decision page; `docs/settled.md` holds them). Five
   pre-levels sit before Level 1, lettered "Pre 1" to "Pre 5" — never renumbering the word
   levels, exactly as the trap paragraph below demanded. Pre 1 is the EAR: the app plays a
   Level 1 word's approved sounds apart, the child blends them aloud, the adult grades with
   the same three hold controls, and the whole word's clip confirms in feedback. Pre 2 to 5
   teach the ten letters Level 1's decodables spell — s a t p, then i n, then m o, then
   u x — one letter filling the screen while its approved sound plays as the PROMPT. The
   child says it back; nothing on a pre-level screen is ever read, which is why S2 is not
   in play: S2 guards a reading attempt's answer, and an echo task has no answer to rob.
   The prompt may replay at any moment for the same reason. S1 is unchanged (only the
   adult's hold records), S4 is unchanged (approved sounds and whole words only — the
   ladder adds zero audio), and results live in their own boxes (`state.pre`), never the
   word boxes, promoted by the words' own two-path rule at each rung. A fresh save starts
   at Pre 1; any save with reading history — a graded word, a session, a log row, or a
   level set above the start — begins past the ladder, and the grown-ups corner can walk
   in or out at will. The questions below were this item's open design notes and are kept
   because they show why each ruling landed where it did; the original ask follows.**
   Everything above grows the game upward. This grows it
   downward, and it may matter more: Level 1 opens with ten two-sound words, which
   assumes a child already knows what a letter says. A child who does not cannot start at
   all. The game currently teaches reading to a child who has already been taught sounds,
   and it does not say so anywhere.

   Nothing here is designed. These are the questions a design must answer, written down so
   the next person does not have to rediscover them:

   - **Which sounds, and in what order.** The field's usual first set is s, a, t, p, i, n,
     chosen because those six alone make more real words than any other six. Whether to
     follow it is the owner's call and wants the same research the levels above had.
   - **How a sound is taught without a word.** The machinery exists: S4 already permits the
     app to speak the single sounds of the approved library, and the sound-out reveal
     already shows a tile and plays its sound. What is missing is the teaching order and
     the screen, not the audio.
   - **How a child is graded on a sound.** A grown-up shows a tile, the child says the
     sound, the grown-up marks it — the same three controls, on a sound instead of a word.
     Whether that result enters the Leitner boxes is a decision: it is a different kind of
     knowing from reading a word.
   - **HOW THE LEVELS ARE NUMBERED, and this one is an engineering trap.** Renumbering so
     the new levels become 1 and 2 would move every existing level by two, and level
     numbers are load-bearing in `WORD_LEVEL`, the promotion arithmetic, every sentence
     seat, three feature files and every saved game on a family's device. Numbering the new
     ones 0 and -1, or lettering them, costs nothing and breaks nothing. A migration that
     renumbers a child's saved progress is the expensive answer and should be chosen on
     purpose if at all.
   - **What the sounds are called to a child.** S4 forbids letter names, so a sound level
     cannot say "this is the letter S". It must say what the sound IS, which is the same
     problem `SOUND_TEXT` already solves for grown-ups and has never had to solve for a
     child on screen.

   **What it does NOT need:** new audio. All 38 shipping sounds are approved, and the
   eleven still in `tools/pending-sounds/` are approved too. This is a teaching-design and
   screen job, not a voice job.

Modes, each designed for the owner's pick before any build:

- Sentence mode — decodable sentences built only from taught words plus the tricky roster;
  the owner ruled its design comes next, alongside the blend levels, because its audio
  path (whole recorded sentences) must be solved early. Its late stage is passages from
  real books; see "Passages from real books" below. **It is not a mode of its own — see
  "Sentences live inside levels" below, which supersedes the word "mode" here.**
- Build-it — encoding: the app speaks a word and the child assembles it from sound tiles.
  Practice-only, like free play: nothing is ever written to the record, so design rule 1
  and safety rule S1 stand untouched. **Flagged by the owner for strong consideration,
  2026-08-17 (H-2), with the safety reasoning recorded here so the build inherits it:**
  the app speaks FIRST by design, so a Build-it turn can never be a graded reading
  attempt — S2 guards a reading attempt's answer, and here there is no answer to rob;
  that holds only while Build-it stays practice, so practice-only is a load-bearing
  property, not a preference. The same three adult marks may be offered or none at all,
  because S1 is untouched only while nothing is recorded. Tiles are sounds, never letter
  names (S4). Reading and spelling teach each other — encoding is decoding run backward,
  and the tile inventory, the adult-hold controls and the sound clips it needs all ship
  today, which makes this one of the smallest builds on the road. **Fit ruled by the
  owner on 2026-08-17, five verdicts on the costed page, and BUILT the same day (D1,
  D2, D3 and D5; D4 is the absence of a control):** free play
  gains a fourth chooser row (Build a word), serving mastered words first and the
  child's level roster when few are mastered; sessions gain a breather — one Build-it
  turn after every seventh reading word, chosen knowing it sits beside the review
  queue's ordering, so the build must leave that ordering untouched; the tray ramps —
  the word's own tiles shuffled through Level 5, one distractor from Level 6, two past
  Level 14. **The distractor rule was narrowed the same day, on a measurement:** the
  first draft barred every grapheme that bends in any word, which took all five vowels
  out — 343 of the bank's words are three tiles with exactly one vowel, so the middle
  slot answered itself without listening — while still allowing ck beside cat, where
  both tiles say /k/. Only the four units with no ruled default are barred outright
  now, and a per-word guard refuses any distractor whose sound one of that word's own
  tiles already says; no
  adult marks in any mode — the app's own match feedback is the whole loop, so free
  play stays usable by a child alone; misses are unlimited, the app sounds out what
  the child actually built, and after two misses the correct letter fades into its own
  slot while its sound plays — the form the owner chose on 2026-08-17 from three live
  options, over marking the tile in the tray, because where a sound goes is the thing
  being taught — so every attempt ends in success. A slot is WIDER when its sound is
  written with more than one letter, chosen the same way, so the shape of the word is a
  clue before a sound plays. **A child still on the pre-letter ladder gets
  Build-a-sound instead (owner-ruled 2026-08-17):** the app says a single sound
  and the child finds its tile among the letters that rung has taught — four
  tiles at Pre 2, six at Pre 3, eight at Pre 4, ten at Pre 5. It is not offered
  at Pre 1 at all, because "Little Ears" teaches listening with no letters
  anywhere and a tray there would have nothing honest to hold; borrowing Pre 2's
  roster early would teach s, a, t and p ahead of the rung that introduces them.
  Every ladder letter already has a shipped clip, so the mode adds no audio. A word qualifies only when every
  tile's sound-in-that-word has a shipped clip, which excludes "one" by itself until
  its own ruling. Every sentence Build-it speaks needs owner approval before it ships.
  **Its look was ruled the same day, from three live options each:** a slot is WIDER
  when its sound is written with more than one letter, so the shape of the word is a
  clue before a sound plays; and the help after two misses is the letter fading into
  ITS OWN SLOT while its sound plays, chosen over marking the tile in the tray,
  because where a sound goes is the thing a child is being taught. **The distractor
  rule was narrowed the same day too**: only the four units with no ruled default are
  barred outright, and a per-word guard refuses any distractor whose sound one of that
  word's own tiles already says. The first draft barred every grapheme that bends
  anywhere, which removed all five vowels while still allowing ck beside cat.
- Speedy words — a third free-play choice: short timed re-reads over mastered words only
  (box 4 and up), racing the child's own best, nothing recorded. Its copy must obey S3:
  a slow run is never a failure.

### Sentences live inside levels — approved 2026-08-11, unbuilt

The owner ruled: a level teaches its new words, its sentences, and — from the levels that
have them — its new sounds, all together. There is no sentence-only level and no separate
sentence mode. A child at any level meets words and sentences in the same session, and the
sentences are made of the words that level teaches.

1. **Three function words join the heart roster, available from Level 1: `the`, `and`,
   and `a`.** Without them a sentence in English cannot be written. `the` alone was gating
   22 of the 40 approved sentences to Level 7, and `and` — a final blend, so otherwise a
   Level 10 word — was holding "Dad had ham and jam." back to Level 10. With all three on
   the roster the same 40 sentences spread across Levels 2 to 9 instead of piling up at 7,
   and sentence practice can begin at Level 2. This is what the field does and why: the
   highest-frequency function words are taught by sight early, ahead of the code that would
   decode them, precisely so that reading a sentence is possible at all. `a` is taught
   nowhere in the game today and is a genuine gap; it says the schwa, and that clip exists.
2. **A session mixes words and sentences throughout.** Not words first and sentences at the
   end. A sentence arrives every few items, so a child who is tiring does not meet every
   sentence at once, and the level's teaching and its payoff are interleaved.
3. **A sentence is never scheduled.** The grown-up marks it, and the mark decides ONLY what
   the app says next — it is recorded nowhere (owner-ruled 2026-08-14, from the decision
   page that gave the sentence its attempt phase). A sentence does not enter the
   spaced-repetition boxes and never returns. Re-reading one sentence teaches that
   sentence; the words inside it are already being scheduled individually, which is where
   the learning belongs. This costs no new field in the saved document, so no version bump
   and no migration — an earlier draft of this point said the result "is recorded", which
   could not be true alongside "no new field", and building from that unresolved pair is
   part of how the attempt phase went unbuilt (open-faults N).
4. **Words alone decide promotion.** The existing rule is untouched: 80 per cent of the
   level's words at box 3 or higher, or two perfect sessions. A sentence is practice and
   celebration, never a gate, and no child is held at a level by one sentence.
5. **What happens after "got it" is decided: ONE word is sounded out, and the voice says
   why.** Owner-ruled 2026-08-12 after hearing all three shapes built from approved clips at
   the app's own seams. Sounding out every word of a nine-word sentence runs **65.5 seconds**;
   one word runs **13.4**; no sound-out at all runs 6.5. The middle one won — the sentence,
   then the reveal for the one word the sentence is teaching, then the sentence again.

   The line that explains it is **"You read them all. Let's sound out this one."**, chosen
   from four because it is the only candidate that is TRUE whichever word is chosen and
   however many times the child has met it: it states a fact about the child, not a claim
   about the word. "Here is the new word" was refused for exactly that reason — it would put
   the game under a promise it must then keep.

   **Three lines take turns**, owner-ruled the same evening, in the shape the seventeen praise
   clips already use. Chosen from eight on 2026-08-12:

   1. "You read them all. Let's sound out this one."
   2. "Let's sound out one word together."
   3. "Here is one word to sound out."

   The three are deliberately different jobs: the first gives the reason, the second names the
   grown-up — this game is a parent and a child side by side — and the third simply announces.
   Every one is true whichever word the app chooses and however many times the child has met
   it, which is the rule that decided the set: the app picks the word, so a line calling it
   new, or hard, or the tricky one would put the game under a promise it must then keep.
   Nothing here is built, and **no line has been recorded or heard**.
6. **The presentation — RULED 2026-08-13, and the ATTEMPT PHASE ruled 2026-08-14.** Four
   designs were built and shown on 2026-08-11: tap a word to open its sound tiles silently;
   every word pre-split; one word lit at a time; and a plain sentence whose sounds appear
   only in the reveal. The owner chose none of them and described a fifth. That fifth was
   built as written and shipped in beta 19 — and the owner found within a day that it began
   with the app reading the sentence aloud: "the child never gets a chance to be graded or
   do anything." The description opened with what the app DOES ("The sentence is read
   whole") and nobody had written down what happens BEFORE that, so what was built had the
   child's turn missing (open-faults N). The three rulings of 2026-08-14, from a decision
   page, complete it:

   **Before the reveal — the child's turn.** The sentence arrives SILENT, with the stage
   label "Read this sentence" and the rail prompt "Read the sentence out loud! 📣" (the
   child's name in front when one is set) — the word prompt's exact shape. The child reads
   it aloud. The three grade controls are live and are the ONLY way forward: no advance
   control exists during the attempt and there is no separate skip THERE — the skip is dark
   for the whole attempt, and comes alive only in the reveal that follows (section 6, ruled
   2026-08-24); during the attempt the mark is the path,
   exactly as "not yet" is for a stuck child on a word. The words are plain text during the
   attempt: no tap targets and no tiles, because a scaffold offered mid-attempt would be
   the app helping before the child has tried. S2 extends from the word to the sentence:
   the app speaks nothing until the attempt ends.

   **The mark.** Graded with the same three controls a word gets, and the grade decides
   only what the app SAYS (point 3): "got it" leads with a praise clip drawn only from the
   rows that never say the word "word" — the engine pins that roster in both halves —
   while "close" and "not yet" lead with the same recorded "Good try!" / "Let's try
   again." a word's reveal uses. Zero new audio. Every mark reaches the same reveal, so a
   stuck child hears the sentence read to them — S3's invitation, kept.

   **Then the reveal the owner approved, unchanged:**

   1. The sentence is read whole.
   2. An invitation line plays, and **the word the level teaches** takes the tile ring: its
      pieces appear, and the voice says the sounds, then the word.
   3. After that it is the child's. Tapping any other word shows that word's pieces
      **silently** — no sound is spoken for a tapped word, ever. Only the first, automatic
      word is spoken.
   4. **Exactly one word is ever open.** Opening another closes the last.
      When the open word carries a `TRICKY` note — sounded out by the app or
      tapped open by the child — the note shows under its tiles, in the same
      amber words the word reveal uses ("sentences too", owner-ruled
      2026-08-15, open-faults J1). The slot is reserved either way, so the
      sentence never moves; the note never shows during the attempt.
   5. The sentence reads again to close, and **a tap interrupts that read.**

   The ring is the existing `.wq-tile.wq-pop` outline, not a new shape. Design rule 2 is
   untouched and is what makes the silence in point 3 correct: a word may be shown split,
   because that is a scaffold, but it may not be SPOKEN, because that is the answer.
   Tap-to-hear stays ruled for the passages stage alone, where the words are untaught on
   purpose.

   **This ruling was given once before and lost.** The owner recorded it on 2026-08-13 with
   "I already decided on this, it may have been lost in a context compaction" — and a search
   of `docs/settled.md`, this file, `docs/voice-pack.md` and `docs/open-faults.md` found
   nothing. It is written here now because a decision that lives only in a chat log is a
   decision this project loses, which is the whole reason those documents exist.

   **What ends the item: the grown-up presses for the next word** — owner-ruled 2026-08-13,
   closing the last open question in this design. Nothing has to finish first. The closing
   read and any tapping the child is doing both stop when the control is pressed, which is the
   same rule the word items already follow and means a grown-up never has to wait out a
   sentence to move on.

   **Approved 2026-08-13**, from a working prototype built to this design and using only
   approved audio: the sentence graded perfect in batch 1, the invitation graded perfect the
   same day, and the shipped pack's own sound and word clips.

7. **Free play offers sentences too — owner-ruled 2026-08-13.** The chooser today asks
   "which words?" and gives two answers: truly random from the whole bank, or this level's
   words (the chooser's copy owns the number; a copy of it here went stale once).
   It must also offer SENTENCES, so a child can practise reading them without a session.
   Free play's own promise is untouched and is what makes this safe: nothing is written to
   the record in free play, ever (design rule 1 and S1), so a sentence read there teaches
   and celebrates and schedules nothing — which is what a sentence does inside a session
   anyway, by point 3 above.

   **The one thing this needs that a session does not — RULED 2026-08-13.** Inside a
   session the word that gets the automatic sound-out is *the word the level teaches*. A
   free-play sentence has no such word, so the app must choose one. Four were costed and
   put to the owner: the longest word, none at all with every word left to the child's tap,
   a random content word, and the child's own level word. The owner chose **the longest
   word, counted in SOUND TILES rather than letters**, and the first one when two tie.

   Tiles rather than letters because tiles are the thing being taught: "ship" is four
   letters and three sounds, and a child taking it apart meets three pieces. And it is
   STABLE — the same sentence teaches the same word every time a child meets it, which is
   the rule the session reveal already follows, and the reason the random option was
   refused.

   **Built 2026-08-13.** The chooser's third control, "📖 Sentences", serves every sentence
   up to and including the child's level, endlessly, with the same reveal a session gives.
   One earlier is practice they have earned; one later is the guessing exercise the
   decodability rule exists to prevent. **Nothing is ever recorded** — that half of the
   2026-08-13 ruling is iron and unchanged.

   **The attempt phase applies here too — owner-ruled 2026-08-15, from their own phone.**
   The 2026-08-13 ruling also said no grade control is live in sentence free play, and it
   was made before the attempt phase existed, when every sentence read itself on arrival.
   Within a day of the attempt phase shipping the owner met the old shape in free play and
   named it: the reveal "plays without providing the child a chance to figure it out." So
   a free-play sentence now arrives silent like a session's, the three controls are live,
   and the mark starts the reveal — exactly as free-play WORDS have always been graded
   against a throwaway state. The mark decides only what the app says, there as here. The
   advance under a free-play sentence reveal says **"Next sentence ➡️"**, because the next
   item is one, and a label that misnames the next thing teaches a child to ignore labels.

What this costs, and none of it is done: `a` needs a listening round, being a word the game
has never spoken. `the` and `and` have approved clips already. Every level object grows a
sentence list, which the level introduction and the session builder both read. And the 40
approved sentences need re-checking against their new levels before they ship, by
`tools/decodable.mjs`, which is the arbiter.

### The level introduction — approved 2026-08-10, unbuilt

A child meets a level's new sounds before meeting them inside words, and is reminded of the
sounds they have been missing. The owner ruled the four open questions on 2026-08-10:

1. **Speech.** Design rule 8 is amended, above: the app may speak the single sounds of the
   approved sound library, and still never a letter name.
2. **Cadence.** The new-sound introduction plays on the FIRST session at a level. The
   trouble-sound review runs before every session, short, and a skip in the grown-up strip
   ends it on the same 450 ms hold as the reveal's skip. Level 1 has no review part, and no
   level shows the introduction twice.
3. **The review list.** A sound is "one this child has trouble with" when the grown-up
   marked words containing it "close" or "try again". Only an adult judgement feeds it, so
   safety rule S1 is untouched, and the list is empty rather than guessed when no adult has
   marked anything. At most three sounds, most-missed first.
4. **Interaction.** Each sound plays once in turn with its tile lit, then every tile stays
   tappable so the child can hear one again, and one child-sized control starts the session.

The introduction never appears in free play, because free play shows no level moment
(section 4). It is a teaching screen, not help with a word: rule 3 keeps the sound tiles of
the WORD IN FRONT OF THE CHILD out of sight until the attempt ends, and that rule is
untouched — the introduction is over before the first word appears.

What this needs before it can be built, each item real work and none of it done:

- **The sound clips must ship.** The pack ships bank words, praise, the two invitation leads
  and the two session-end lines, and no individual sounds. Every sound the levels teach is
  owner-approved but waits in `tools/pending-sounds/` or the sidecar's bake package.
- **A grapheme-to-sound map in app code — MET on 2026-08-11, and this bullet said otherwise
  until 2026-08-14.** `chunkWord` splits a word into GRAPHEMES, not sounds: c, k and ck all
  say /k/, and s says /s/ or /z/. The map is `TILE_SOUND`, with the per-word `WORD_SOUND`
  overrides for a word that bends a letter away from its usual sound, and both ship inside
  the engine: `soundIdFor` reads them for every sound-out the game already plays. This bullet
  asked for exactly that and went on claiming the map "exists only in
  `tools/voice-sounds.csv`, which the app never imports" for three days after the thing it
  asked for had shipped.

  **The `graphemes` column in `tools/voice-sounds.csv` is NOT that map and must not be used
  as one.** Put to two independent reviewers on 2026-08-14 (`docs/open-faults.md` F2): it is
  older, it has no row for `ff`, `ll`, `ss`, `zz`, `kn`, `wr` or `mb`, and it keys its vowels
  to ids that no longer ship. Copying it into the app would install a second, incomplete,
  wrongly-keyed map one directory from the right one.
- **A per-level sound inventory.** A level object carries `{ n, name, emoji, focus, words }`
  and `focus` is a prose label for a person, not a list a screen can iterate.
- **A place to remember it was shown.** The saved document has no field for it; adding one
  is a version bump and a migration.
- **A screen beyond the four in section 6, and its gates.** Section 10 has no acceptance
  criterion for a screen between the home screen and the first word, and the gauntlet's
  floors grow rather than shrink (E6).

The heart-word roster grows now, ahead of sentence mode: of, to, do, you, said and my were
to join Levels 6 and 7, with my in the open-syllable level. **That placement was superseded
on 2026-08-12**: the owner ruled that a heart word's level is where the CHILD MEETS it, not
where its spelling would fall. The PRINCIPLE stands; the seats moved on 2026-08-15 with the
10-and-10 curriculum, every one approved by the owner's read of the level lists: the, a,
and and i open Level 1, my and we Level 2, me and to Level 3, he, no and do Level 4, go, so
and you Level 5, be and said Level 6, and of Level 7 — "Move of to 7", in the owner's
words. Hearts lead each level's list because a level's word order is its introduction
order; Level 1 alone leads with its ten decodables, so a child's very first act is sounding
out a clean two-sound word. of's sound-out survived from its three 2026-08-12 listening
rounds unchanged: o says the u of "up" and f says /v/ (`docs/settled.md`). "i" waited for a
capitalization ruling and got it in round four, 2026-08-15: the bank key stays lowercase,
and everywhere a child sees the word — card, tile, feedback, parent lists — it shows as
"I", by the engine's one display layer. Words ruled out for child-appropriateness (2026-08-07): fist, limp, bone, buns,
dump, and milt; **hunt was on that list and came off it on 2026-08-17** — the owner ruled "hunting is not out and neither should hunt be", so both the word and its -ing form may be taught; **gob, owner-ruled out on 2026-08-13** — mild crude slang for the mouth,
raised by the pre-beta screen and removed from Level 5, from the pack, from the word table and
from the waiting room, so it cannot return by accident; catfish swapped out; and the plurals of jug and crab may never join
Level 12. "milt" is the reason AGENTS.md now requires the WHOLE bank to be re-screened
before every beta: the first draft lists were screened, a later backfill was not, and the
word reached a listening round before the owner caught it. Ruled FINE by the owner on the
same day, so a later screen does not raise them again: **knob** and **pot** — ordinary
words (a door knob, a cooking pot) that carry adult slang in some dialects, and standard
in phonics word lists. Ruled FINE on 2026-08-11, on the same principle and by the same
route — the pre-beta screen of the whole bank raised them, and the owner ruled: **gash,
bush, bang, whack, hung, rod** and **puff**. A later screen does not raise these again. Ruled FINE
on 2026-08-18 by the same route, when the redesign's screen raised it: **lay**.

Refused by the owner on 2026-08-18, from the 295-word bill the curriculum redesign needed:
**fight** (violence), **hustle** and **grind** (adult slang, raised by the screen and refused
rather than kept, unlike lay on the same day - the owner draws the line word by word and the
screen's job is to put each one in front of him), and **neighbor**, which is not an
appropriateness refusal at all: the word was offered for the long-a `eigh` level and simply
turned down. A later screen does not raise these four again. The screen also removed
**catfish** before the owner saw it, because this document already records it as swapped out,
and corrected the British "neighbour" to "neighbor" before offering it, because SPEC section
12a rules General American.

**Taught despite the refusal, owner-ruled 2026-08-23: ding.** The 2026-08-16 refusal was
of the primer's comic-book sound effect, not of the English word; Level 28 teaches the
ordinary word (a ding in a car door, ding-dong), its clip was approved in listening round
33, and it needs no build guard. This is the only word on any refusal list that the engine
may teach, and `tools/doc-truth.mjs` reads this sentence rather than being told a word to
ignore.

**Build-guarded (a tray must never let a child spell these), as of 2026-08-23:** fist,
limp, bone, buns, dump, milt, gob, jugs, crabs, ho, gun, fight, hustle, grind, nuts,
cans.

**Build-guarded plurals, owner-ruled 2026-08-23:** jugs, crabs, nuts and cans are
build-guarded although jug, nut and can are ordinary taught words — the plural carries an
adult meaning the singular does not, so a tray must never let a child spell one. jugs and
crabs were guarded from the start; nuts and cans were ruled out of the BANK and never added
to the TRAY guard, which are two different rules, and only the second one has a gate. Put to
the owner on a decision page with the measurement and ruled "guard both". The measurement
first shown was a SAMPLE — 41,680 seeded deals, in which nuts surfaced from seven target
words and cans from five — and it was written into this paragraph as though it were the
total; the after pass caught that and the exhaustive figures are these. Enumerating every
distractor combination the shipped `buildTray` can deal — the pool filtered as the code
filters it, which means `trayClash` as well as the guard, since a tile whose sound the word
already says is never dealt — a child could lay out **nuts from 42 target words and cans
from 24** when each word is served at its own level, and **64 and 34** when a review serves
a word at the top level, where the tray pool is at its largest (84 units, two extras).
"cats" reaches both. (The first correction of this paragraph left `trayClash` out of the
model and so counted trays the code cannot deal — 44, 31, 66 and 41. The after pass caught
that too, and named the filter, which is why it is named here.) The game would then
print what the child built and speak it back. Guarding both makes no bank word unbuildable
and starves no tray — measured after the ruling: 1,042 words buildable, exactly as before,
and no tray at any level short of the distractors its level asks for.

This is the
list `NEVER_BUILD` must equal, in both directions: a word here that the engine does not
guard is a hole, and a word the engine guards that is not here is a guard nobody ruled.
The 2026-08-07 sentence, gob, gun and the 2026-08-18 three are here because they are
appropriateness refusals; **ho** is here because it carries adult slang, and **sam is NOT**
— owner-ruled 2026-08-23, "Ho I want out. Sam is fine.": sam was refused on 2026-08-16 as
a book character's name, a candidate turned down rather than a word a child must never
spell, so it is not taught and needs no tray guard. Book artifacts (blap, ruck, blam,
biff, beagle, boo, zzzz, let's, eagle's, don't) are refused the same way and are guarded
the same way: not at all. A child spelling "blap" is no safety matter, and guarding it
would take buildable words off the board for nothing.

Ruled FINE by the owner on 2026-08-19, when the redesign's screen raised them from the
hundred-level ladder: **bet, gut, jab, lash, loss, mob, muck, mush** and **whip**. The
owner's words were "keep them", given on a decision page that costed the alternative in
plain terms — that a child finishing all one hundred levels meets lash, loss, mob and muck
at the summit, and is taught whip at Level 27. He read that cost and ruled anyway, so these
nine join the ruled-fine list and a later screen does not raise them again.

Two things about that screen are worth recording, because both are faults in it rather than
in the words. **It re-raised gash, which this document had already ruled FINE on
2026-08-11** — the screen consulted its own hazard patterns and never consulted the
ruled-fine list six paragraphs above it, which is precisely the waste the "does not raise
these again" sentence exists to prevent. And the nine words above were never on the owner's
target vocabulary at all: they are among 214 words, 30% of the ladder, that the lost
generator invented and seated in alphabetical runs while leaving 162 of the owner's own
words placed nowhere. The appropriateness question and the vocabulary question arrived
together and are separate. The owner settled the first here; the second was settled the
same day by `tools/ladder-fill.mjs`, which adds the 162 and evicts nothing.

The lay ruling in full: the screen
offered a free removal — level 59 teaches `ay` and eight substitutes existed — and the owner
kept the word, ruling with the knob/pot/bush line rather than against it. A later screen does
not raise it again.
That screen covered all 349 bank words and the 115 approved words waiting for a level,
and it found nothing else.

**Re-screened 2026-08-13 before beta.18, over the whole bank and the whole waiting room.**
Counted at the time, not recalled: **438 bank words** after gob was removed, and **116 entries
in the waiting room, of which 90 have already shipped into the bank and 26 are still waiting**.
The ruled-out words and catfish are absent; the **seven** words confirmed absent in the
2026-08-11 screen are still absent; the nine words the owner ruled FINE that day are all still
present and are not raised again. Two words were new since the last screen — **of** and **a** —
and both are function words with no adult sense. Three bank words have a plural that is ruled
out: **jug, bun, nut**. The game never pluralises, so none can appear today; the plural-s level
(12, unbuilt) must exclude them, as SPEC already requires for jug and crab.

**Re-screened 2026-08-13 before beta.19, over the whole bank, the whole waiting room and —
for the first time — every SENTENCE.** Counted at the time: **440 bank words** after "we"
and "me" were seated, and **30 entries still waiting**. The two new words are function
words with no adult sense, and neither has a plural a child could produce. Nothing else in
the bank moved, so the 2026-08-11 and 2026-08-13 findings above stand unchanged and are
not raised again.

**Re-screened 2026-08-15 before beta.20, over the whole bank and every sentence.** The
bank counted **446 words** — one new since the last screen, the word "i", which has no
adult sense and no plural a child could produce. Every word was re-read against this
rule with the 10-and-10 curriculum's re-cut lists in hand; the 2026-08-13 rulings all
stand (keg, knob, pot, gash, bush, bang, whack, dam and puck stay; gob stays out), the
words confirmed absent then were confirmed absent again, and nothing new was raised.

**Re-screened 2026-08-16 before beta.21.** The bank counted **461 words** — fifteen new
since the day-old whole-bank pass above: the fourteen plurals and romp, each read by the
owner on the Cats and Dogs decision page, where the screen's one flag (cans, the jugs
precedent) was upheld and the word held back. The ruled plural exclusions — jugs, buns,
nuts, crabs — were re-verified absent by measurement, and every one of the 210 sentences
carries a person's dated read, the twelve new ones from that same page and its listening
round. Nothing else was raised.

**Re-screened 2026-08-20 at the hundred-level cutover, over the whole converted bank.**
The bank counted **1,123 words** — every level's list read in full by the cutover's
child-safety audit seat, not sampled, with this document's rulings in hand. Verified by
measurement: every ruled-out word absent (jugs, buns, nuts, crabs, cans, gob, milt and
the rest), every ruled-fine word standing unraised, no duplicate seats. Raised for the
owner, none yet ruled: **chicks** (seated at 26 beside chick — the jug/jugs shape,
shipped), **rack** (26), **sack** and **sacks** (30, sacks in s:v3-l59-01), **whizz**
(27), **rim** (15), **clap** (34), **strip** (36), **lush** (100). The drug-slang
second-sense cluster (bud, grass, tab, snow, trip, high, lit, line, fix, chug, buzzed)
was considered and NOT raised, following the pot precedent — ordinary words whose adult
sense needs adult knowledge to see. The owner ruled on the morning
decision page of 2026-08-21: **keep all nine** - chicks, rack, sack, sacks, whizz, rim,
clap, strip and lush all join the ruled-fine list with that date, the screen's chicks
flag recorded as overruled the way the cans flag was once recorded as upheld. This
paragraph is the screen's record and the bank's screening date, and a later screen does
not re-raise what it lists.
Every one of the **210 sentences** and the three invitation lines carries a person's
dated read — 91 on 2026-08-13, the next batch on the 2026-08-15 round pages, and
Level 21's twelve on the 2026-08-16 Cats and Dogs pages (one of them written by the
owner, which outranks a read) — and the mechanical screen (shape, banned pairings,
ledger) runs green over all of them.

**The sentences are now inside this rule, and that is new.** All 88 shipped sentences and
the three invitation lines were read one by one against the same test the words take:
nothing with a sexual, crude, violent or otherwise adult meaning, and nothing whose SHAPE
teaches a child something they should not be taught. `tools/sentence-screen.mjs` is the
gate. It holds the screened ledger — being named there means a person read that sentence
on that date — and it refuses the shape the owner refused on 2026-08-13, when they turned
down "My dad can pat me." with two words: *not appropriate*. Every mechanical gate had
passed it, because `tools/decodable.mjs` asks whether a child CAN read a sentence and
nothing asked whether they SHOULD meet it. That sentence is not in the game and is the
gate's control. The gate also refuses whole phrases the owner has banned by name — two
euphemisms caught in the 2026-08-15 listening round, listed only in the tool itself —
because a sentence can be innocent word by word and still carry an adult meaning as a
pair, in a shape with no adult and no child in it for the shape check to see.

Two shipped sentences were looked at twice and KEPT, and recording which is part of the
screen: **"My pal can zap me!"** and **"Can my pal tag me?"** both put a contact verb on
the child. Both stay because the subject is a peer in a game, which is the same reason
"The cat sat on me." is fine. If either ever reads wrongly to the owner it comes out;
that is a verdict, not a calculation.

The screen raised **two** words in the same class as knob and pot, and the owner ruled on both
the same day: **gob is OUT** and is gone from every file that named it; **keg is FINE** and
stays. A keg is a small barrel, the word is standard in phonics word lists, and it sits with
knob, pot, gash, bush, bang, whack, hung, rod and puff — ordinary words that carry an adult
sense in some dialects. A later screen does not raise keg again.

An earlier version of this paragraph said "the eight words confirmed absent" and "the 115 words
still waiting". Both were recalled rather than counted, in a paragraph whose whole claim is
that it counted — found by an auditor the same day. Confirmed absent from both lists: shag, tit, muff, suck, bum,
spunk, slag, and all seven words already ruled out above.

Ruled out for good, with reasons on the record: nonsense words (better for assessment
than instruction, and they rob the child of set-for-variability practice); ph (no word
obeys the bank's rules, S8); vowel teams taught alongside magic-e.

### Passages from real books — approved 2026-08-11, unbuilt

**The paragraph presentation is ruled — 2026-08-16, on a page of tappable mockups.** A
small paragraph (two or three sentences, growing over time) presents as the WHISPER: the
current sentence in full child-size type, centered in its space; the NEXT sentence waiting
below it at roughly 65 percent size and 30 percent ink; on advance the whisper inflates up
into the active spot, and read sentences settle small and dim above. The owner picked it
from four working mockups (a pip filmstrip, the plain growing page, a history-as-chip
variant, and a full fade-with-distance ladder), and it began as their own blend of two:
"the child appropriate [type] ... but below that is like spotlight the 'next line' in a
smaller slightly see through colouring". Grading stays ONE HOLD PER SENTENCE, exactly as
today — a paragraph is a presentation of sentences, not a new unit of record, so S1's
machinery and the schedule's boxes are untouched. Two things stay deliberately open: the
exact whisper ink level (to be settled by watching a real child, not by taste), and the
very-late-game multi-paragraph form, which is its own design for later. Paragraph CONTENT
walks the same pipeline as every sentence: written, person-read, rendered, and heard.

Character names inside verbatim passage text are S9's second exception (owner-approved
2026-08-16): each enters `tools/s9-passage-names.json` at its passage's screening round,
an owner-visible diff crediting the source, and passes only inside the content files.

As the child's confidence grows, sentence mode grows with it: one sentence, then several,
then a paragraph. Its final stage is not written for the game at all. It is a passage from
a real book, and when the grown-up marks it read, part of the congratulations tells the
child what book it came from — "That was from The Tale of Peter Rabbit, by Beatrix Potter."
The owner's purpose is plain: a child who has just read Beatrix Potter should be told they
have just read Beatrix Potter.

The owner ruled the boundaries on 2026-08-11.

1. **The text is verbatim, and the stage unlocks late.** A passage is the author's own
   words, never rewritten or simplified. That is only honest if the child can mostly read
   it, so this stage unlocks well after Level 15 — once vowel teams are taught and the bank
   is large enough that a passage carries only a few unknown words. Any word may be tapped
   to hear it read, which is the reveal machinery the game already has. An adapted or
   simplified text was considered and refused: the credit is the point, and a credit for
   words the author did not write is not a credit.
2. **It is sentence mode, not a new mode.** The same mode carries the whole ramp, so a
   child moves from a sentence to a paragraph without changing screens. This bends sentence
   mode's own all-decodable rule, and the bend is deliberate and bounded: the strict rule
   governs every generated sentence, and only the passage stage may carry untaught words,
   only from a real source, only with tap-to-hear available.
3. **A result is recorded, and only an adult can record it.** The grown-up marks the
   passage read on the same 450 ms hold as every other result. Safety rule S1 is untouched:
   the app never marks a passage read by itself, and only an adult's action may
   confirm, never refuse.
4. **The credit names the book and the author, spoken.** Safety rule S9 is amended for
   this and nothing else: the name of a published author may appear in the repository and
   be spoken. S9 exists to keep a real child's and family's data off the device and out of
   the repository, and a book's author is neither. No other personal name is permitted, the
   child's name stays a device-local setting, and the copy gate's ban on email addresses
   and a non-empty default child name is unchanged.
5. **The whole work must be sound, not only the extract.** A clean passage from a book the
   owner would not hand a child is refused. Children's classics carry racist caricature,
   cruelty and period attitudes, often far from an otherwise lovely page, and the credit
   actively invites a parent to go and find the book. A source that would embarrass that
   parent at the library has failed, whatever the extract says. This sits on top of the
   existing rule that every word a child can meet is screened for child-appropriateness
   before a beta, and does not replace it.

Before this stage can be built, three things must be settled and are not: how a passage's
public-domain status is established and recorded per source, including the jurisdiction it
is claimed under; how a passage is voiced, given the pack's clips are per word and per
sentence; and how the tap-to-hear reading of an untaught word is spoken without breaking
design rule 8, which permits full words and the approved single sounds and never letter
names. None of these is blocked by the ruling above; none may be assumed.

### The chunk ladder — approved 2026-08-25, engine built 2026-08-29, FOR BETA 29

The pre-levels stop being a listening ladder and become a **reading ladder on two-letter
phonics chunks**. A chunk is shown in print, the screen is silent, the child reads it aloud,
the grown-up grades on the usual hold strip, and the reveal says praise, then
*"That is a-t, at. Like in cat."* — the tiles walking one at a time, and the **anchor word
GROWN in front of the child**: the chunk stands, the missing letters slide in, and the word
completes as it is spoken. Owner-ruled 2026-08-29, replacing the lit-inside form ruled on 2026-08-24: growing trains left-to-right, which is Blend Phonics' whole method — the chunk lives
for one beat and is finished into the word. A chunk is never presented as a word: the
owner's words on 2026-08-24 were "all reasonable CV and VC combos, which are explained as
phonics building blocks not words". The ear rung goes; the speaker instead plays the chunk's
sounds SEPARATED and never the blended answer, so the oral blend survives as help on demand.
Each rung opens with its new letters alone, then the chunks built from them.

**The roster: twenty-six word families and fifty-three consonant-vowel chunks.** Two
refusals shaped it. The first draft was generated mechanically — every consonant against
every vowel, both orders — and produced 161 chunks including *je*, *vu*, *wu* and *ze*; the
owner refused it on 2026-08-25 ("unrealistically too long... reduce the CV and VC list down
to what is reasonable and expected") and the VC side became the classic word families,
trimmed by their own anchor rule to twenty-six. The early-literacy seat then recommended no
CV at all, and the owner overruled it on 2026-08-29 — "Shouldn't the roster also include CV
and teach those in the same way?" — with three guards that answer the seat's objections
rather than ignoring them. **A CV chunk may not itself be a word**, which excludes *be do go
he me no so to we* — the entire collision set the seat found, where the chunk sound and the
word sound disagree. **Every anchor is sound-verified by the engine, not by spelling**: a
word anchors a chunk only if its own tile walk starts with the chunk's two letters as two
tiles and its own second sound is the short vowel — the check that refused *side* for si,
*tiger* for ti and *walk* for wa, which a third-letter-consonant rule had let through.
**A chunk with fewer than three such anchors is dropped**, the same discipline that trimmed
the thirty. For the seven VC chunks that ARE words — an, at, in, it, am, ox, us — the owner
ruled the overlap deliberate: chunk sound and word sound agree, so the child meets the block
first and discovers the word later, "a gift, not a leak". Their clips are reused, not
re-recorded — the bytes were already heard and approved — with a test asserting every
servable chunk's plan resolves in the manifest, so a bank-word removal cannot silently
orphan a chunk (the gob lesson).

| | units | grouped by vowel |
| --- | --- | --- |
| VC, 26 | 19 new clips | a: ad ag am an ap at &middot; e: ed en et &middot; i: id ig im in ip it &middot; o: ob og op ot ox &middot; u: ub ug um un us ut |
| CV, 53 | 53 new clips | a: ba ca da fa ga ha ja la ma na pa ra sa ta ya &middot; e: de fe le ne re te ye &middot; i: bi di fi hi ki li mi pi ri si ti wi &middot; o: bo co fo jo lo mo ro &middot; u: bu cu du fu gu hu ju lu mu ru su tu |

Seventy-nine chunks, **seventy-two new clips** (nineteen VC, fifty-three CV; the seven
word-chunks reuse their approved bytes), each needing the owner's ear before it
reaches a child. Refused and staying refused: *pu pe po ho* (2026-08-24), the soft spellings
*ce ci ge gi* (English reads those soft), and everything with fewer than three sound-verified
anchors — se, nu, ke, va, ve, ji, wa, ni, za, zi, je and their kind.

**Where each one is taught is derived, never typed.** A chunk whose letters all belong to
the pre-rungs' own set (s a t p i n) sits in the pre-ladder, on the rung that completes its
letters — that clause, not the level rule, is what seats *ip* before Level 1, since no
Level-1 word contains it and *sip* waits at Level 2. Every other chunk seats at the earliest
level whose own roster contains a sound-verified word holding it. Two rules bound the level
seats: not before its letters are known, and — owner-ruled 2026-08-25 — **never after the
child already reads a word containing it**: "if a child reads up at level 14 there is no need to reintroduce the
sound as something new at level 40." That rule pulled *in* to level 1 and *up* back to level
14. **Six chunks sit before Level 1** — an, ap, at, in, it, ip — needing **two new clips**,
*ap* and *ip*; the pre-ladder ships long before the rest of the audio exists. The other
seventy-three ride alongside levels 2 through 40. Where a level's arrivals outnumber
McGuffey's six-a-lesson benchmark — level 14's short-u wave brings fifteen — the load rule is
that a level spans many SESSIONS and the session builder caps chunk drills per sitting, so
the benchmark binds the sitting, never the level.

**The rung names are ruled** (2026-08-29): the two pre-level rungs keep *First Sounds* and
*New Sounds*, and *Little Ears* retires with the ear. **The CV question is closed by the
overrule above**, and the seat's contrary findings stay recorded in `docs/settled.md` with
the ruling that answered them. **Fault AN's fix is ruled 2026-08-29** — an interrupted
reveal restarts whole when the app returns to the foreground — and lives in
`docs/open-faults.md` until built and device-verified.

**Beta 29's scope is ruled** (2026-08-29, the three-calls page): the chunk ladder, the AN
fix, and the three Grown-ups-corner items already ruled on 2026-08-24 — the word list by
decade, pre-levels above Jump to level, and the removal of the "Voice & accent" list. Art
step 3, the responsive reading surface, goes to beta 30 with its own device check. **The
four printed sentences the build added are approved** — "What does it say?", "Your turn…
read it out loud! 📣", the rider chip "chunks 🧱", and the P-jump helper line — **with one
condition in the owner's words: "make sure read is pronounced like reed not red."** The
rail line is print-only and nothing spoken in the chunk work contains the word "read"; for
anything rendered, the renderer's own gate already refuses a line carrying a
two-pronunciation word without explicit phonemes (the soundout-1 lesson, SPEC section 9),
so the condition is enforced where the audio is made, not remembered. **The listening
round is confirmed as one sitting of about 75 arms** — the 72 chunk clips plus the three
carrier phrases, each chunk's anchor word heard inside its own "Like in…" clip.

**One finding kept because it is true and cuts against the instruction that produced the
roster:** the public-domain books are LONGER, not shorter — Webster and the New England
Primer carry the full nineteen-by-five matrix, and Webster's CV tables are LONG-vowel (his
*ba* says "bay", marked with a macron), a different artefact from these chunks. The cut
rests on the sound collisions and modern practice, not on the books' page count, and the
record should not pretend otherwise. And **`ed` stays, on the owner's word alone** —
"Ed -keep it", ruled 2026-08-29. His word was needed because Ed is a name and S9's machinery
is mechanically blind to two-letter names, so no gate stands behind this chunk either way;
it is the *ed* of *bed*, *fed* and *red*, lowercase everywhere it appears.

### The parent tutorial — approved 2026-08-11, unbuilt, FOR THE NEXT BETA

A grown-up opening Word Quest for the first time is handed a game with no instructions.
The controls are deliberately unusual — every result takes a 450 ms hold, the advance
control refuses to work for seven seconds, and the app will not mark a word wrong by itself
— and each of those is a safety rule doing its job. To a parent who has not been told, they
read as the app being broken. So the game explains itself, to the grown-up, from the home
screen.

The owner ruled the shape on 2026-08-11.

1. **It teaches both the controls and the phonics.** How to hold to grade, when to choose
   to grade and when to invite another try, what replay and skip do, where backups live —
   and the teaching behind them: what a sound-out is, why the app never says a letter name,
   what a tricky word is, and why the app waits before it will let anyone move on. A parent
   who knows only the buttons cannot tell a good session from a bad one.
2. **It is a guided walkthrough of the real game, not a slideshow.** It drives the actual
   screens and marks the control it is talking about, so the grown-up learns the app by
   using it. This is the expensive choice and was made with that understood: a walkthrough
   that points at real controls breaks whenever a control moves, so it ships with a browser
   gate that fails when a step's target is missing, exactly as gate G7 already fails when a
   control is the wrong size.
3. **It opens from the home screen's grown-up strip, behind the 450 ms hold.** Beside
   "Check for updates", on the same rule and for the same reason: it is adult-facing, and a
   child's wandering tap must not open it. Design rule 7's 44 px minimum applies.
4. **It appears once by itself, and can always be re-opened.** The first time the app is
   opened on a device, the walkthrough offers itself and can be dismissed in one tap. The
   marker that it has been shown is device-local, in the same place as the other adult
   markers — never in the saved document, so this costs no version bump and no migration.

Two safety rules bind the walkthrough and neither may be bent. Design rule 1: a walkthrough
that demonstrates the grading holds must not record a result. Design rule 2: it must never
speak a word before an attempt ends. A tutorial that changes a child's schedule, or that
says the word first, has broken the two rules the whole design exists to protect.

Before it can be built, three things must be settled and are not: what the walkthrough runs
ON, given that a demonstration must record nothing and free play's throwaway clone still
evolves as it is played; whether the grown-up performs the 450 ms hold themselves during
the walkthrough, which teaches the feel of it but must then record nothing, or only watches
it demonstrated, which teaches less; and how a step marks its control for a grown-up who
has asked for reduced motion, where the answer will be a motionless one, as the sound-out's
outline ring already is. None of these is blocked by the ruling above; none may be assumed.
