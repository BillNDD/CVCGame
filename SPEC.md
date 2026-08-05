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
8. Speech output says full words only. Speech output never says letter names. The dashed spelling
   on the screen is for the adult.
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

Speech output, when sound is on:

- correct: one praise sentence, chosen at random from the list below, then
  `"The word was {word}."`
- close: `"Good try!"` then `"The word is {word}."`
- wrong: `"Let’s try again."` then `"The word is {word}."`

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
("Good try!" and "Let’s try again."), and the two session-end lines. The reveal plays as the
lead or praise clip, a 700 ms pause, the stem clip, a 700 ms pause, then the word clip. The
replay control plays the word clip alone. Advancing to the next word, or leaving a session,
stops any clip that is still playing: safety rule S2 applies to clips exactly as it applies
to speech.

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
control has no contrast duty under WCAG, but this one waits about six seconds on every word.
The label turns white as the control comes alive, which is one more sign that it is ready.

The advance control takes the keyboard when it becomes active, not when the result is recorded,
because a disabled control cannot hold focus. So the next key press moves the session on, and a
screen reader announces the control as soon as it can be used. If the grown-up has moved to
another control while the wait ran, or the early-exit dialog is open, their choice stands.

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

An update never interrupts play. The "Grown-ups corner" shows the installed version. A
"Check for updates" control asks the app's own host for the latest version number and shows
the result: "You have the latest version." or "Version {n} is available.", with an "Update
now" control. Updating swaps in the new version and reloads the app. The child's progress
and any family recordings live in on-device storage that an update never touches. A
downloaded newer version never applies while the app is open: the adult applies it at once
with "Update now", or it applies the next time the app starts fresh. The version check is
one of the two network requests safety rule S6 permits after load: adult-initiated, same
host, no data carried. When the check cannot reach the host, the app says so and changes
nothing.

The foreground check is the second S6-permitted request, approved by the owner on
2026-08-03. A page that lives for a long time without a reload — a Safari tab kept open, a
home-screen app resumed from memory — never discovers a new version on its own, because
the browser only looks on page loads and this app never navigates. So each time the app
returns to the foreground, it asks the browser to look for a newer service worker on the
app's own host. The request carries no data, and a newer version found this way still only
installs and waits. The "Grown-ups corner" states this in plain words beside an "Automatic
update check" switch; Off means the app makes zero requests on its own and only checks
when the adult taps "Check for updates". The setting is on by default, saved with the
other settings, and an update never changes it.

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
