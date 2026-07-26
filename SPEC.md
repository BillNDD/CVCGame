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
4. Digraphs are one sound. The units sh, ch, th, wh, ck, and ng always show as one tile.
   Example: "ship" shows as sh-i-p.
5. Sessions are short. One session has a target of 20 words and a maximum of 26 prompts.
6. Known words move fast. If the child reads a new word correctly at first sight, the engine sets
   the word to a high box. A child who knows the easy levels completes them in one or two
   sessions.
7. Controls are large. Child controls have a minimum size of 56 px. Adult controls have a minimum
   size of 44 px. The app obeys the reduced-motion setting.
8. Speech output says full words only. Speech output never says letter names. The dashed spelling
   on the screen is for the adult.
9. Privacy is built in. The app has no accounts, no analytics, and no network calls. All data
   stays on the device. The name field is optional.
10. Adult controls need a deliberate gesture. A pointer must hold an adult result control for
    450 ms. A keyboard operates the control directly.

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

## 3. Word bank

The bank has 260 words in seven levels. The word order in a level is the introduction order.
Every word has at most 4 letters and 2 or 3 sound units. The bank holds no consonant blends
and no vowel teams: outside the six digraphs, every letter is one sound. The nine words in
`TRICKY` are the only exceptions, each with a note.

| Level | Name | Focus | Words |
|------:|------|-------|-------|
| 1 | Hatchlings | two sounds (VC) | at an am ax in it if is on ox up us |
| 2 | Sunny Start | short a | cat hat mat sat man can ran bat cap map tap nap bag dad jam pan rat sad wag van fan ham lap tag had tan pad rag zap yam pal cab ram dab yap mad bad rap has |
| 3 | Busy Bees | short i and o | sit pig big dig win lip hit six fin bin dog hot top pot mop log box fox hop cot mom pop not got did him pin tip sip dip hip rip bit fit pit bib wig fix job lot nod hog |
| 4 | Rocket Words | short e and u | bed red hen pen ten net leg wet jet men bus cup sun run fun mud bug hug nut tub pet get let set cut pup web bun rug mug vet tug jug hum rub dug bud peg met yet |
| 5 | Explorer | all five vowels | yes zip gum gas kid cub den dot fed fig fog gap hid hut jog kit lid mix wax yak jig jab jot lab lad led lit lug nab pep pod rib rim rod rot sag sub sum tab tot wed wit zig zag |
| 6 | Super Sounds | sh and ch | ship shop shut fish dish wish cash chat chip chop rich much such chin shed shin mash rash chug chum dash sash hush rush mush chap wash push bush she |
| 7 | Word Wizard | th, wh, ck, ng, tricky | thin this that then them bath math with when whip duck sock kick back ring sing king long song was buck sung gong lung puck wick rung muck pack path sack tack neck luck tuck peck deck thud rock lock pick lick wing tick dock moth hang sang rang sick fang the what |

Level word counts: 12, 39, 42, 40, 44, 30, 53.

Constants:

```
DIGRAPHS   = ["sh","ch","th","wh","ck","ng"]      // two-character scan, left to right
TRICKY     = { was, is, has, wash, push, bush, she, the, what }   // exact notes in the reference
HOMOPHONES = { sun:["son"], red:["read"], mat:["matt"], in:["inn"], an:["ann","anne"], ax:["axe"],
               not:["knot"], him:["hymn"], rap:["wrap"], dug:["doug"], fin:["finn"], bin:["been"],
               cot:["caught"], ring:["wring"], rung:["wrung"], sack:["sac"], pick:["pic"],
               tick:["tic"], dock:["doc"], what:["watt"] }
SESSION_SIZE = 20
PROMPT_CAP   = 26
INTERVALS    = [1,1,2,4,7,12]   // sessions until due, by box 0..5
```

`chunkWord("ship")` gives `["sh","i","p"]`. The dashed form is `sh-i-p`.

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

Session builder. Target 20 words, no duplicates, in this priority order:

1. Due words from lower levels, lowest box first, maximum 5.
2. Known words with box 4 or more, maximum 2, only after two completed sessions.
3. Due words at the current level, lowest box first.
4. New current-level words, in list order.
5. If short: other eligible words, lowest box first.
6. If short, and the current level has no new words: new words from the next level.

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

Early exit. If the adult stops a session early, the app shows two options:

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

The ten praise sentences. Each one is exact. Most point to the child’s own effort:

1. `"Great job!"`
2. `"You did it!"`
3. `"You read that word all by yourself!"`
4. `"How do you feel about saying that word correctly?"`
5. `"You worked that out on your own!"`
6. `"Your reading is getting stronger every day!"`
7. `"You should feel proud of that one!"`
8. `"That was tricky, and you got it!"`
9. `"You sounded that one out beautifully!"`
10. `"What careful reading that was!"`

Sentence 4 is a question by design, reviewed and kept by the owner: it invites the child to
reflect aloud to the adult beside them. The app does not need to hear the answer — an adult
stays with the child in every session.

The lead and the word reveal are two utterances. The reveal sentence plays at a slower rate, so
the child hears the word slowly and clearly, never rushed. The replay control says the word at
the same slow rate. Lead rate approximately 0.9. Reveal rate approximately 0.7. Pitch
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

A pack holds one clip for each bank word (spoken slowly and clearly), the two carrier stems
("The word was" and "The word is"), the ten praise sentences, the two invitation leads
("Good try!" and "Let’s try again."), and the two session-end lines. The reveal plays as the
lead or praise clip, a 700 ms pause, the stem clip, a 700 ms pause, then the word clip. The
replay control plays the word clip alone. Advancing to the next word, or leaving a session,
stops any clip that is still playing: safety rule S2 applies to clips exactly as it applies
to speech.

The default pack is rendered at build time from the open-source Kokoro model (Apache-2.0
weights), voice `af_heart`, with word clips at speed 0.7 and sentence clips at 1.0. The
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

Layout. Each screen has three fixed zones in a `100dvh` shell: a header, a stage, and an action
rail with the "grown-up" strip below it. The word position in the stage does not move. The tile
row and the message row have reserved space. The stage can scroll only when the user sets a very
large text size. The strip has extra bottom padding. This keeps the controls out of the iOS
gesture area. The two-column landscape layout operates only at a width of 640 px or more and a
height of 420 px or more.

Home. The title, an optional greeting with the name, the level, the counters, and the "Begin
Session" control. Adult text shows in the strip, not below the child's control.

Session, microphone mode:

- The child taps "Start Recording". The app listens. The child taps "Stop".
- Configuration: the locale from the settings, `interimResults: false`, `maxAlternatives: 5`.
- If one alternative is equal to the target word, the app records a correct result. The match
  test removes non-letters, examines the full string and each token, and accepts the homophones.
- If the app does not identify the word, the stage shows a neutral message. The transcript shows
  only in the strip, in small text. The adult gives the result.
- If the app hears no speech, the app shows a short message and goes back to the ready state.
- If the microphone is not available, the app changes to adult mode and keeps that setting.

Session, adult mode. The stage asks the child to say the word aloud. The adult gives the result
with the strip controls.

The strip controls. Three result controls: got it, close, not yet. A pointer must hold a control
for 450 ms. A fill shows the hold progress. A keyboard operates the controls directly. The
controls are muted in color and small in appearance, with a minimum target of 44 px.

Feedback phase. The tiles and the feedback sentence appear in their reserved rows. The advance
control ("Next word" or "Finish!") is not active for the first 400 ms. The advance control is the
only control in the action rail.

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
   message slot until the next action, not only in a passing toast. These are the exact
   sentences:

   ```
   retry     "Didn’t catch that — tap to try again."
   no mic    "The microphone isn’t available here — grown-up grading for this visit."
   offline   "Can’t listen without the internet — a grown-up can check instead."
   denied    "Microphone permission is off — switched to grown-up mode."
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
      directly.
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
