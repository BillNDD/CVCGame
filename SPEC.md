# Word Quest — product and build specification

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

1. The app never records a wrong result by itself. Speech recognition is not reliable for young
   voices. The app can only confirm a correct reading. The adult gives all other results.
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
- Microphone mode: the child taps "Start Recording", says the word, and taps "Stop". The app
  examines the attempt.
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

The bank has 349 words in nine levels. The word order in a level is the introduction order.
Every word has 2 or 3 sound units. Words have at most 4 letters through Level 7; Levels 8
and 9 may reach 5. The bank holds no consonant blends and no vowel teams: outside the
multi-letter units, every letter is one sound. The units are the six spoken digraphs (sh,
ch, th, wh, ck, ng), qu (one tile, says "kw"), the silent-letter pairs kn, wr and mb (each
says its surviving letter), and the doubled endings ll, ss, ff and zz (each says its
single) — adopted with Levels 8 and 9 on 2026-08-04; ph was considered and left out
because no word obeys the bank's rules. The nine words in `TRICKY` are the only
exceptions, each with a note.

| Level | Name | Focus | Words |
|------:|------|-------|-------|
| 1 | Hatchlings | two sounds (VC) | at an am ax in it if is on ox up us |
| 2 | Sunny Start | short a | cat hat mat sat man can ran bat cap map tap nap bag dad jam pan rat sad wag van fan ham lap tag had tan pad rag zap yam pal cab ram dab yap mad bad rap has pat dam nag sap vat |
| 3 | Busy Bees | short i and o | sit pig big dig win lip hit six fin bin dog hot top pot mop log box fox hop cot mom pop not got did him pin tip sip dip hip rip bit fit pit bib wig fix job lot nod hog tin rig rob sob mob cop dim |
| 4 | Rocket Words | short e and u | bed red hen pen ten net leg wet jet men bus cup sun run fun mud bug hug nut tub pet get let set cut pup web bun rug mug vet tug jug hum rub dug bud peg met yet bet keg hem nun pun jut gut hub |
| 5 | Explorer | all five vowels | yes zip gum gas kid cub den dot fed fig fog gap hid hut jog kit lid mix wax yak jig jab jot lab lad led lit lug nab pep pod rib rim rod rot sag sub sum tab tot wed wit zig zag fax nix vex sax cod gob |
| 6 | Super Sounds | sh and ch | ship shop shut fish dish wish cash chat chip chop rich much such chin shed shin mash rash chug chum dash sash hush rush mush chap wash push bush she bash gash gush lash lush posh sham shun |
| 7 | Word Wizard | th, wh, ck, ng, tricky | thin this that then them bath math with when whip duck sock kick back ring sing king long song was buck sung gong lung puck wick rung muck pack path sack tack neck luck tuck peck deck thud rock lock pick lick wing tick dock moth hang sang rang sick fang the what whim wham bang hung ding ping |
| 8 | Bells | ll ss ff zz, qu, silent letters | bell tell well fell hill mill doll mess boss kiss miss loss fuss huff puff cuff buzz fuzz jazz fizz quiz quit quip knit knob knot lamb |
| 9 | Chicks | five-letter words | chick check chuck chess chill shack shock shell thick whack whiff whizz quick quack quill knock wreck wrong thumb wrap wren limb |

Level word counts: 12, 44, 49, 48, 50, 38, 59, 27, 22.

Constants:

```
DIGRAPHS   = ["sh","ch","th","wh","ck","ng","qu","kn","wr","mb","ll","ss","ff","zz"]   // two-character scan, left to right
TRICKY     = { was, is, has, wash, push, bush, she, the, what }   // exact notes in the reference
HOMOPHONES = { sun:["son"], red:["read"], mat:["matt"], in:["inn"], an:["ann","anne"], ax:["axe"],
               not:["knot"], him:["hymn"], rap:["wrap"], dug:["doug"], fin:["finn"], bin:["been"],
               cot:["caught"], ring:["wring"], rung:["wrung"], sack:["sac"], pick:["pic"],
               tick:["tic"], dock:["doc"], what:["watt"],
               dam:["damn"], fax:["facts"], nix:["nicks"], nun:["none"], sax:["sacks"],
               knot:["not"], knit:["nit"], wrap:["rap"], lamb:["lam"] }
SESSION_SIZE = 20
PROMPT_CAP   = 26
INTERVALS    = [1,1,2,4,7,12]   // sessions until due, by box 0..5
```

`chunkWord("ship")` gives `["sh","i","p"]`. The dashed form is `sh-i-p`.

Some words cannot be judged fairly by speech recognition. A two-sound word whose consonant
carries a letter name that sounds like the whole word is one: a child who reads "am" correctly
is transcribed as "m", the name of the letter M. The app never offers the microphone for these
words, so a correct reading can never be reported as a miss. `ADULT_JUDGED` names them and the
sound each one collides with:

```
ADULT_JUDGED = { am: "m", an: "n", ax: "x", if: "f", us: "s" }
```

A word joins this list only when the microphone cannot represent it, never when the child might
say it wrongly. Vowel pairs like "pin" and "pen" stay on the microphone: a recogniser that
returns "pen" may be reporting exactly what the child said, and catching that is the purpose of
the game.

To extend the bank, add words to a level's list or add a level object:
`{ n, name, emoji, focus, words }`. Level sizes can differ; the session builder serves 20
words at a time regardless. Level 1 stays at 12 words — English has only a small set of clean
short-vowel VC words. Words with consonant blends (like "stop" or "hand") need a fourth sound
tile, which the layout does not carry yet; they belong to a future level, not to this bank.

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

A session can have fewer than 20 words. Example: the first session has the 12 Level 1 words.

Promotion. Do this check at the end of a full session. Count the current-level words that have
box 3 or more. If the count is 80 percent or more, increase the level by 1. Example: Level 1 has 12 words, so
the threshold is 10 words. The maximum level is 7. The adult can also set the level
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
does: the microphone stops, and the stage no longer says the app is listening. Nothing can be
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

The app takes the audio session back from the microphone before every reveal. A device that
gives the microphone the whole session — iOS does — leaves playback on a narrow route meant
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
phase. The app never says the word before the attempt.

## 6. Screens and modes

The screens are: home, session, done, and "Grown-ups corner".

For a word in `ADULT_JUDGED`, a session in microphone mode shows the prompt used in grown-up
mode instead of the record control, and the message slot carries one note for the adult:

```
Parent: "am" and "m" are nearly indistinguishable, please act as judge here
```

The note names the word and the sound it collides with. It appears at 11.5 px, so the longest
note stays inside the fixed message slot and the word above never moves. The app never speaks
this note: design rule 8 keeps letter names out of speech.

The note belongs to microphone mode only. It exists to say that recognition cannot judge this
one word, so it has nothing to tell an adult who is already judging every word — whether they
chose grown-up grading in the corner or this visit cannot listen. In those sessions the slot
carries no per-word note. A device-wide reason, such as a browser that cannot listen at all, is
a different message and still appears.

Layout. Each screen has three fixed zones in a `100dvh` shell: a header, a stage, and an action
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

Session, microphone mode:

- The child taps "Start Recording". The app listens. The child taps "Stop".
- Configuration: the locale from the settings, `interimResults: false`, `maxAlternatives: 5`.
- If one alternative is equal to the target word, the app records a correct result. The match
  test removes non-letters, accepts the homophones, and compares the whole transcript. A
  transcript of two words or fewer also matches on either word, which allows a repeat or one
  word of filler beside the reading. A longer transcript never matches, whichever words it
  contains: a microphone hears the room, and a word found inside a sentence is not evidence
  that the child read it. The adult judges those.
- If the app does not identify the word, the stage shows a neutral message. The transcript shows
  only in the strip, in small text. The adult gives the result.
- If the app hears no speech, the app shows a short message and goes back to the ready state.
- If the microphone is not available, the app changes to adult mode and keeps that setting.

Session, adult mode. The stage asks the child to say the word aloud. The adult gives the result
with the strip controls.

Session, free play. Entered from the second control on the home screen ("Free play", a full
child-size control styled quieter than "Begin Session"). The tap opens a chooser before any
word is shown, addressed to the grown-up, with two full child-size choices and a "Back"
control that starts nothing: "Truly random", any word from the whole bank, and the child's
level, the same mix a session would serve. The loop in both is the session loop — the same
phases, microphone rules, feedback sentences, praise, reveal and wait — but it runs against
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

The strip marker line. The strip keeps one line below its controls, whether or not there is
anything to show, so the strip height never changes and the word never moves between phases.
The line shows what the microphone heard during the heard phase. Outside the feedback phase, a
word the child is seeing again shows "Parent: second look". Every marker on this line names the
adult as its reader, the same as the microphone messages and the tricky-word notes. A child can
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
the replay control, active only in the feedback phase, and takes the same 450 ms pointer hold
as the grading controls; a keyboard or assistive technology operates it directly. The wait
exists so the child hears the word, so a child's tap on the skip does nothing. The held press
does exactly what the advance control does when it comes alive: the reveal falls silent at
once and the next word — or the session end — follows. The slot is reserved in every phase,
disabled outside feedback, so no control moves under a finger.

Done. This screen shows a trophy, the three counters, and the accuracy. A praise line has three
steps: 90 percent or more, 70 percent or more, and below 70 percent. A level-up shows in the trophy zone, not as an
extra row.

Grown-ups corner. This screen shows these items:

- The name field. The field saves on blur.
- The mode control and the sound control.
- The locale list.
- The level control, with a help line.
- The mastery map. Each level has one summary row and an expand control.
- The session log and the export control.
- The reset control. The reset asks a
question. The confirm control and the cancel control are in different positions. The cancel
control is larger.

## 7. Data and export

One state object:

```
{ version, level: 1..7, sessionsCompleted, perfectStreak,
  settings: { mode: "mic"|"parent", sound, childName, lang },
  words: Record<string, WordState>,
  log: [ { n, date, level, c, k, w, acc, items:[{ w, r, retries }], partial } ] }
```

Write the state after each result and at the end of a session. A page refresh in a session must
not remove results. The log number `n` is the log row count. `sessionsCompleted` counts full
sessions only.

The state version is 3. If the app loads a version 2 state, the app does a one-time migration:

- Increase `level` by 1.
- Increase the `level` value in each log row by 1.
- Set the version to 3.

The migration does not change the word data. The migration runs one time only. The app always
limits `level` to the range 1 to 7.

Before the migration, the app repairs the document. The repair function makes sure that `words`,
`log`, and `settings` are present and have the correct type. The repair function limits each word
box to the range 0 to 5.

If the stored data is not valid JSON, the app keeps a copy at the key `{KEY}:corrupt`. The app
then starts fresh and gives a message.

If the storage does not answer in three seconds, the app starts fresh and stops all writes. This
prevents damage to a saved file that the app cannot read.

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
2. Microphone: use the standard permission flow. Use `webkitSpeechRecognition` where necessary.
   If speech recognition is not available, use adult mode. Design rule 1 stays in all modes.
   Listening never traps the child, and a failure is never silent. A recognizer that shows
   no sign of life for 8 seconds is stopped; each time the engine reports sound or speech
   the timer starts again, so a child who takes time to begin is not cut off. After any
   stop, a 2-second grace window still accepts the finalized result — iOS often delivers it
   only after the stop — so a reading confirmed late still counts. An event from an
   abandoned attempt never reaches the screen: the feedback phase cannot be torn down by a
   tardy error, and one reading can never record twice. A failure leaves its message in the
   message slot until the next action. It is written once: the slot is its home, never the
   slot and a passing toast at the same time. A toast carries a grown-up confirmation that
   has no slot of its own, such as "Backup file saved." These are the exact sentences:

   ```
   retry     "Didn’t catch that — tap to try again."
   no mic    "The microphone isn’t available here — grown-up grading for this visit."
   offline   "Can’t listen without the internet — a grown-up can check instead."
   denied    "Microphone permission is off — switched to grown-up mode."
   ```

   A microphone that is absent says why, on the page, for as long as it stays absent. An
   adult who chose grown-up mode sees none of these: that is a choice, not a fault. A denial
   shows the standing sentence below, which lasts as long as the denial does and says how to
   undo it, so the momentary sentence above appears only where the standing one cannot: a
   device that refuses to store the marker, such as a browser in private mode. The
   device-wide reason wins over the per-word one, because it is true of every word:

   ```
   no speech "Parent: this browser can’t listen. Chrome, Edge or Safari can use the microphone."
   denied standing "Parent: microphone permission is off. Allow it, then choose the microphone in the Grown-ups corner."
   corner    "This browser can’t listen. Chrome, Edge or Safari can use the microphone."
   ```

   Only an attempt that produces no event at all counts against the microphone: one invites
   a retry, a second switches to grown-up grading for that visit only. A "Stop" the child
   chooses ends the attempt in silence and counts nothing. The "Stop" control always works,
   even when the recognizer is dead. A missing or unavailable microphone switches to
   grown-up grading for the visit at once.

   The saved answer mode belongs to the child, not to the browser. Only an explicit
   permission denial or an adult's choice in the "Grown-ups corner" changes it. A visit that
   cannot listen shows grown-up grading without writing anything, so the microphone returns
   on the next open in a browser that can listen. A mode saved as grown-up by an app version
   that predates this rule heals back to microphone one time. Those versions did not record
   who chose the mode, so this one-time heal can also undo a grown-up's own earlier choice;
   the corner toggle sets it back, and every choice from this version on is remembered.
3. Storage: change the storage adapter to IndexedDB with the same one-object schema. Add JSON
   export and import of the full state.
4. Optional, later: a cloud pronunciation-score API behind a small server proxy. Keep the API key
   on the server only. Interface:

   ```
   assessPronunciation(audio: Blob, target: string)
     -> { accuracyScore: 0..100, phonemes: PhonemeScore[] }
   // 80 or more: correct. 60 to 79: suggest "close". Below 60: give to the adult.
   // The app still never records a wrong result by itself.
   ```

   Make this function opt-in. Do not transmit audio without an explicit adult choice.

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

- Background: `linear-gradient(160deg, #8fd0fa, #b9c3fb, #d9c6fb)`.
- Ink: navy `#17356b`. Secondary `#3e5aa6`. Muted `#5a6ba8`. Strip text `#455073`.
- Action `#c9402f`. Green `#0f7a4f`. Red `#c8342f`. Purple `#6b4bbf`. Sun tiles `#ffd166` with
  navy text.
- All text and control colors pass WCAG AA at 4.5:1 or more against their backgrounds.
- Word and interface font: `ui-rounded / system-ui` (SF Pro Rounded on Apple devices). The
  rounded forms stay friendly for children, and the letter shapes match everyday print,
  including the double-storey "a" that children see in books.
- White cards, large corner radius, soft shadows. Small motion only. The app obeys the
  reduced-motion setting.

## 10. Acceptance criteria

- [ ] First start: the first session gives the 12 Level 1 words and no other words.
- [ ] A version 2 save at level N opens at level N+1. The word data does not change.
- [ ] Next-level words appear only after the child has seen all current-level words.
- [ ] Microphone mode: a correct word gives an automatic correct result. All other attempts go to
      the adult. A microphone refusal changes the app to adult mode without an error.
- [ ] The page does not scroll in a session at standard text sizes. At 200 percent text size, the
      stage can scroll. No content is cut off.
- [ ] The word position does not move between phases.
- [ ] A first-attempt miss comes back approximately three words later, one time. The prompt count
      never goes above 26.
- [ ] The feedback text is equal to section 5, character for character. "ship" shows as sh-i-p.
      "was" shows the tricky-word note. Speech output never says letter names.
- [ ] The replay control operates only in the feedback phase.
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
> (section 8, item 3). Use the standard microphone permission flow (section 8, item 2) with
> design rule 1. Then check each item in section 10. Do not build section 8, item 4. Make the
> interface stub only.

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
3. Level 12, plural and ending -s, a small level of its own (cats, hens, cups). The s says
   /s/ after a quiet ending and /z/ after a voiced one; both clips exist.
4. Level 13, compound words (CVC+CVC: sunset, catnip, laptop) — the first two-syllable
   step, each half a word the child owns. Needs a ruling on how a word past five letters
   displays; the current tile row caps at five.
5. Level 14, open syllables, a seven-word mini-level (he, we, me, be, go, no, so) — the
   vowel says its name because nothing closes it.
6. Level 15, magic-e (CVCe: cake, dime, home, cube). The five letter-name vowel sounds are
   already in the sound library against this day. Vowel teams stay OUT of this level:
   teaching both at once confuses children.
7. Beyond, unscheduled: r-controlled vowels (ar and or first, then er/ir/ur), then vowel
   teams. The eight sounds these need (ar, or, er, moon-oo, aw, oi, ow, zh) are in the
   voice actor's recording script so no second studio session is needed.

Modes, each designed for the owner's pick before any build:

- Sentence mode — decodable sentences built only from taught words plus the tricky roster;
  the owner ruled its design comes next, alongside the blend levels, because its audio
  path (whole recorded sentences) must be solved early. Its late stage is passages from
  real books; see "Passages from real books" below. **It is not a mode of its own — see
  "Sentences live inside levels" below, which supersedes the word "mode" here.**
- Build-it — encoding: the app speaks a word and the child assembles it from sound tiles.
  Practice-only, like free play: nothing is ever written to the record, so design rule 1
  and safety rule S1 stand untouched.
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
3. **A sentence is never scheduled.** The grown-up marks it and the result is recorded, but
   a sentence does not enter the spaced-repetition boxes. Re-reading one sentence teaches
   that sentence; the words inside it are already being scheduled individually, which is
   where the learning belongs. This costs no new field in the saved document, so no version
   bump and no migration.
4. **Words alone decide promotion.** The existing rule is untouched: 80 per cent of the
   level's words at box 3 or higher, or two perfect sessions. A sentence is practice and
   celebration, never a gate, and no child is held at a level by one sentence.
5. **The presentation is undecided and is the owner's next call.** Four were built and shown
   on 2026-08-11: tap a word to open its sound tiles silently; every word pre-split; one
   word lit at a time; and a plain sentence whose sounds appear only in the reveal. Design
   rule 2 is what separates them — a word may be shown split during an attempt, because that
   is a scaffold, but it may not be SPOKEN, because that is the answer. Tap-to-hear stays
   ruled for the passages stage alone, where the words are untaught on purpose.

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
- **A grapheme-to-sound map in app code.** `chunkWord` splits a word into GRAPHEMES, not
  sounds: c, k and ck all say /k/, and s says /s/ or /z/. The map from grapheme to sound
  exists only in `tools/voice-sounds.csv`, which the app never imports. It must be generated
  into the app the way `voice-lock.json` is, so the two can never drift.
- **A per-level sound inventory.** A level object carries `{ n, name, emoji, focus, words }`
  and `focus` is a prose label for a person, not a list a screen can iterate.
- **A place to remember it was shown.** The saved document has no field for it; adding one
  is a version bump and a migration.
- **A screen beyond the four in section 6, and its gates.** Section 10 has no acceptance
  criterion for a screen between the home screen and the first word, and the gauntlet's
  floors grow rather than shrink (E6).

The heart-word roster grows now, ahead of sentence mode: of, to, do, you, said join
Levels 6 and 7 beside the existing tricky words, and my joins the open-syllable level,
each with a tricky note and an owner-heard clip. "I" waits for a capitalization ruling —
the bank is lowercase everywhere. Words ruled out for child-appropriateness (2026-08-07): hunt, fist, limp, bone, buns,
dump, and milt; catfish swapped out; and the plurals of jug and crab may never join
Level 12. "milt" is the reason CLAUDE.md now requires the WHOLE bank to be re-screened
before every beta: the first draft lists were screened, a later backfill was not, and the
word reached a listening round before the owner caught it. Ruled FINE by the owner on the
same day, so a later screen does not raise them again: **knob** and **pot** — ordinary
words (a door knob, a cooking pot) that carry adult slang in some dialects, and standard
in phonics word lists. Ruled FINE on 2026-08-11, on the same principle and by the same
route — the pre-beta screen of the whole bank raised them, and the owner ruled: **gash,
bush, bang, whack, hung, rod** and **puff**. A later screen does not raise these again.
That screen covered all 349 bank words and the 115 approved words waiting for a level,
and it found nothing else. Confirmed absent from both lists: shag, tit, muff, suck, bum,
spunk, slag, and all seven words already ruled out above.

Ruled out for good, with reasons on the record: nonsense words (better for assessment
than instruction, and they rob the child of set-for-variability practice); ph (no word
obeys the bank's rules, S8); vowel teams taught alongside magic-e.

### Passages from real books — approved 2026-08-11, unbuilt

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
   the app never marks a passage read by itself, and speech recognition may still only
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

### The parent tutorial — approved 2026-08-11, unbuilt, FOR THE NEXT BETA

A grown-up opening Word Quest for the first time is handed a game with no instructions.
The controls are deliberately unusual — every result takes a 450 ms hold, the advance
control refuses to work for seven seconds, and the app will not mark a word wrong by itself
— and each of those is a safety rule doing its job. To a parent who has not been told, they
read as the app being broken. So the game explains itself, to the grown-up, from the home
screen.

The owner ruled the shape on 2026-08-11.

1. **It teaches both the controls and the phonics.** How to hold to grade, when to choose
   the microphone and when to judge by ear, what replay and skip do, where backups live —
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
