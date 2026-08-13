# Changelog

This document follows the Microsoft Writing Style Guide.

## Version 6

Version 6 adds the standalone progressive web app. The reference build does not change.
The first app version is 1.0.0-beta.1. The app stays in beta until version 1.0 is ready.

- New: your child now reads whole SENTENCES, not only single words. A sentence arrives every
  five words in a session. The app reads it out, then invites you both to sound out one word
  of it — the word that level is teaching — and reads the sentence again to finish. After the
  first word, your child can tap any other word to see how it is built. A tapped word never
  speaks: seeing how a word is made is help, and hearing it said is the answer.
  You end the sentence whenever you like by pressing for the next word. Nothing has to
  finish first, and a sentence is never marked or scored.

- New: free play offers sentences too. Press "Free play", then "Sentences", and your child
  reads sentence after sentence for as long as they want. It serves every sentence up to
  their level and never runs out. As with all free play, nothing is saved.

- New: two more words your child learns by sight, "we" and "me". They are at Level 2 with
  the other sight words. Both say the letter e by its name, which is why they cannot be
  sounded out by the usual rules and are taught by sight instead. The word bank is now 440
  words.

- Fixed: touching the screen during a session could start a text selection instead of doing
  what you meant. On an iPhone the blue selection handles appeared over the grown-up strip,
  between "skip" and "got it". The cause was the app's own gesture: a grown-up holds a result
  control for 450 milliseconds, and a press that long on a touch screen is what the phone reads
  as "select this text". The child's screen no longer offers a selection. The boxes in the
  "Grown-ups corner" still do, because that is where you copy your backup out.
  Reported by a parent on a real iPhone 13; no automatic check had ever seen it, because they
  all drive a mouse and a mouse never asks for a selection by pressing.

- Known issue: two of the sounds in the sounding-out are not good enough yet. The buzzing
  "th" of "this" and the "h" sound were judged poor when they were heard next to the others,
  and they are being remade. They are the right sounds, made badly, not the wrong sounds. The
  "th" is in six words including "the", and the "h" is in twenty-five, including hat, ham, had
  and has.
- Known issue: if you open the game cold and mark the first word, the "Next word" button can
  come alive for about half a second while the word is still being sounded out. A tap in that
  moment skips the rest of the sounding-out. It happens only when the sounds are still
  loading — the first word after a cold start, or on a slow device — and it is fixed in the
  next release.
- Removed: microphone mode. A grown-up marks every result, and the game is played by a child
  and a grown-up together. Speech recognition could never judge a young child's reading
  fairly, and the app is smaller and quieter without it: no permission prompt, no listening
  state, and one less thing that can go wrong. Three separate checks now prove the microphone
  is absent from the source, from the built app, and from the app while it runs.
- New: nine heart words open Level 2 — the, and, to, do, you, said, my, of and a. A heart word
  is one a child is taught by sight, ahead of the code that would sound it out, because the
  commonest words in English do not follow the rules and a sentence cannot be written without
  them. Each one sounds out with the sounds it really makes: "to" and "do" say the oo of moon,
  "said" says the e of bed, "of" says the u of up and a /v/, and "a" says the lazy uh.
- New: the word "a" has a voice. Until now the only pronunciation available was the letter's
  name, which the app never says to a child learning that letters make sounds.
- Fixed: every sound in a sound-out is now one a person chose. Where a letter had no decided
  sound the app used to fall back to a general mapping, so a word could be sounded out with a
  sound nobody had approved for it. Twelve sounds that no word asks for were removed from the
  pack at the same time. Two more were on that list and came back the same day, because the
  heart words needed them: the long "i" of "my" and the "oo" of "moon".
- Fixed: the progress bar wraps onto a second or third row on a narrow phone instead of
  running off the screen. The rows stay even.
- Fixed: the reading log told a grown-up their child had failed a level they had simply not
  finished yet.
- Fixed: a label on the session screen rendered at four times its intended size on every
  screen, because of one invalid line in the stylesheet.
- New: the sound-out reveal. After every result the app says the praise or invitation line,
  the word, "Pronounced:", each of the word's sounds in turn, then the word again. As each
  sound plays, its own yellow tile takes an outline for exactly as long as that sound lasts.
  The pause between sounds is 500 ms and a low hum plays underneath, so a gap never reads as
  the app having stopped. The owner chose the spacing, the hum and the outline by ear and eye
  against the real audio.
- New: 33 sound clips in the voice pack, one for every sound the word bank's tiles can ask
  for, bringing it to 406 clips at that point. **The pack now holds 500 clips and 37 sounds**,
  after the heart words and the words added since. Every sound was approved in a listening round, and none of
  them is a recording of a family member's voice.
- Changed: a tricky word sounds out with the sounds it really makes, not its letters. "was" is
  /w/ + short o + /z/, "she" is /sh/ + long e, "push" and "bush" take the short oo of "book".
- Changed: "th" now says the right one of its two sounds. It is the buzzing th of "this" in
  this, that, then, them and the, and the quiet th of "thin" in thin, thick, thumb, thud,
  bath, math, path, moth and with. All fourteen used to play the quiet one.
- Fixed: the note on "was" said "wuz" while the game played "woz". The game now says "wuz"
  too. The app speaks with an American voice, so it uses American pronunciation throughout.
- Changed: the pause between clips is measured from the end of one sound to the start of the
  next. Each clip carries a different amount of its own silence, so a pause measured between
  files ran from half a second to over a second and the rhythm was uneven.
- Fixed, but not completely — see the known issue at the top of this section: the advance
  control could come alive in the middle of a reveal when the clips took longer than usual to
  load, and the first tap then cut the sounding-out short. The fix closed the long version of
  that window, where the control stayed live for the whole reveal. About half a second of it
  remains, and is fixed in the release after this one.
- Fixed: hearing the word again, or asking to finish early, now stops the reveal and clears
  the tile outlines. The outlines used to keep firing against sound that was no longer playing.
- New: a Vite, React, and Tailwind app in `app/`. The app imports the game logic from the
  generated module `src/engine.js`. The components do not copy the logic.
- New: a manifest, a service worker, and the icon set. The app operates offline after the first
  load. A user can install the app on a Windows desktop and on an iOS home screen.
- New: an IndexedDB storage adapter with the same one-object schema. The repair function runs
  before any other function reads the document. Damaged data goes to a separate key. A storage
  timeout stops all writes for that visit.
- New: JSON export and import of the full state, in the "Grown-ups corner".
- New: install documents for Windows and for iOS, in `docs/`.
- New: a GitHub Pages workflow. The app makes no network calls after the first load.
- Changed: four texts on the gradient background become darker for WCAG AA contrast. The
  greeting, the "Read this word" label, the adult-mode prompt, and the storage warning.
- Fixed: the grown-up strip reserves one line for its markers. The "second look" and "heard"
  notes no longer change the strip height, so the word never moves between phases.
- Changed: the display font is now the rounded system font instead of a children's-print
  font. The letter shapes match everyday book print, including the double-storey "a".
- Changed: after an attempt, the app speaks the word as its own slow, clear sentence:
  "The word was ...". The replay control uses the same slow rate. The word never sounds
  rushed. Advancing to the next word stops any speech that is still playing.
- Changed: a correct reading now gets one of ten praise sentences, chosen at random. Most
  point to the child's own effort. The exact list is in SPEC section 5.
- Fixed: the checks on GitHub failed on every push because the check runner could not read
  test counts from colored output. The tests themselves passed. The runner now strips the
  color codes, and the emails about failed runs stop.
- New: updates never interrupt play. The "Grown-ups corner" shows the installed version,
  a "Check for updates" control asks the app's own host for the latest version, and "Update
  now" applies it at once. A version the grown-up does not apply waits for the app's next
  fresh start, and an update never touches saved progress. Self-hosters get
  `docs/self-hosting.md`.
- Fixed: a microphone that never answers — in-app browser views above all — could leave the
  game stuck on "Listening…" forever, and any microphone problem silently switched the
  saved mode to grown-up grading, hiding the microphone button from then on. Listening now
  times out after 8 seconds and invites another try, the "Stop" control always works, and
  only an explicit permission denial changes the saved setting; any other failure switches
  to grown-up grading for that visit only.
- Fixed: the record control could fail without a word of feedback, and a correct reading
  could go unconfirmed. A recognizer that dies silently now leaves "Didn’t catch that —
  tap to try again." on screen until the next tap, and a second silent attempt switches to
  grown-up grading for that visit, with the reason on screen. A child who takes time to
  begin is no longer cut off at 8 seconds: the timer starts again whenever the engine
  hears sound, and a 2-second grace window accepts a result that arrives after a stop — so
  a reading confirmed late still counts. A "Stop" the child chooses now ends the attempt in
  silence and counts nothing against the microphone. A tardy event from an abandoned
  attempt can no longer wipe the feedback screen, strand the app on "Listening…", or record
  a word twice.
- Fixed: the saved answer mode belongs to the child, not to the browser. A visit that can't
  listen now shows grown-up grading without writing it to the save, so the microphone comes
  back on the next open in a browser that can. A device that an older version wrongly
  locked into grown-up grading heals back to the microphone one time.
- New: an installed app refreshes itself once when a new version takes control, so fixes
  arrive without a double relaunch. It waits for a safe moment: a refresh never happens
  during a session.
- Fixed: the app was teaching the wrong words. Every recorded word lost its first
  fraction of a second somewhere between the file and the speaker, so "cat" said "at",
  "duck" said "uck", "ship" said "ip", and the two-letter words lost their vowel entirely:
  "am" said "m" and "an" said "n". A phonics game modelling the very omission a child is
  learning to avoid is worse than no model at all. All 260 words were rebuilt: the twelve
  two-letter words now carry an explicit pronunciation instead of being read from spelling,
  every clip gets a moment of silence in front to protect its first sound, a slower and
  steadier pace, and a clean fade at each end. The recipe was chosen by ear over five
  rounds of listening, it now travels inside the voice pack, and the build refuses any pack
  whose recipe differs from the approved one. Three words — dish, cub and hip — are known
  to be imperfect and are queued for the same treatment.
- Fixed: the app said one praise sentence with the wrong word in it. "You read that word all
  by yourself!" was spoken with "read" as in "reed" — the present tense — to a child who had
  just read the word. A phonics game teaching the wrong sound for a word on the screen is
  the one fault that cannot wait, so this release exists for it. The sentence now carries its
  pronunciation explicitly, and the build refuses any pack that leaves a sentence with a
  two-pronunciation word to the synthesiser.
- Changed: while "Next word ➡️" waits for the reveal, its label is now dark ink instead of white.
  White on the waiting colour measured 2.14:1, and 2.88:1 where the progress fill had crossed it,
  which is hard to read at arm's length; the ink measures 5.57:1 and 4.14:1 in the same two
  places. The label turns white as the control comes alive, so the change of colour is itself a
  sign that the control is ready. The same applies to the inert "Save as a short session" in the
  early-exit dialog.
- Fixed: "hop" and "hen" are spoken properly at last. Both ended in an extra sound — "hop"
  arrived as "hop + uh" and "hen" carried a fuzz after the n — and both now come from a
  carrier sentence, cut back out of it, which is what gives a word's last consonant a proper
  release. A listener judged them "very good" and "almost perfect" against the build of the
  day, blind. "hop" had been rendered with a full stop after it since beta.7; offered as one
  of four unlabelled candidates it came back unacceptable, so that treatment is gone rather
  than added to. Trimming the fuzz off "hen" was tried and rejected: 60 ms made it worse and
  100 ms cut into the n itself, so it ships untrimmed. Two clips of 276 changed, and each is
  the same file, byte for byte, that the listener approved.
- New: free play. A second control on the home screen starts an endless practice mode for a
  child and a grown-up together: the same words a session would serve, the same microphone
  and grading and praise, but against a throwaway copy of the progress — rights and wrongs
  in free play never touch the boxes, the schedule, the log or the session count, and eight
  tests prove nothing is ever written. The header says "FREE PLAY" with a count of words
  read instead of a progress bar, blocks roll seamlessly into the next, nothing ever says
  "Finish!", and leaving needs no save-or-discard because there is nothing to save.
- New: the free-play chooser. The tap opens a question before any word is shown: truly
  random play — any word from all 300, every level in the draw, no repeats inside a block
  and never the same word twice in a row — or the child's level, the same mix a session
  would serve. In truly random play a dice mark replaces the level chip in the header,
  because a level number would claim a level the mode is not serving. A "Back" control
  starts nothing.
- Changed: "Check for updates" now sees every update, not only a version-number change.
  Each build carries a stamp (the short id of the commit it came from) in `version.json`
  and beside the version number in the strip and the corner. The check compares both, so a
  fix shipped between named versions is offered too — before this, the button answered
  "You have the latest version." while a newer build of the same beta sat on the host. A
  newer build of the same version is offered in plain words: "An update is ready — press
  and hold."
- New: a grown-up can skip the rest of a reveal. When a child reads several words correctly
  in a row, sitting through every full praise sentence gets slow for both of them — so a
  "⏭ skip" control now sits in the grown-up strip beside the replay control, active during
  the reveal. It takes the same 450 ms press-and-hold as the grading controls, because the
  wait exists so the child hears the word: a child's tap does nothing, a keyboard or a
  screen reader operates it directly, and the held press silences the reveal at once and
  moves to the next word. The slot is reserved in every phase, so no control moves under a
  finger.
- Changed: every one of the 349 words now carries the owner's "perfect" — the uplift pass.
  Working with the sound sidecar on 2026-08-06 and 07, the owner re-judged every word that
  had shipped below "perfect" in fresh blind rounds: 212 words won new verdicts, 209 of
  them with new audio, and three kept their shipped bytes with the verdict upgraded. The
  marginal tier is gone — no word ships below "perfect" — and the word table now pins 285
  of 349 words to the exact approved bytes, every shipped file verified against its pin at
  customs. The 137 words already "perfect" were untouched, byte for byte. The uplift
  recipes bake on the sidecar's own environment and do not reproduce byte-for-byte here,
  so the pinned owner-heard bytes are the authority, as the word-table document records.
- Changed: the "Check for updates" control moved from the bottom of the "Grown-ups corner"
  to the home screen's grown-up strip, beside the installed version number, so an adult
  finds it without hunting (owner-approved 2026-08-07). Both it and the "Update now" that
  appears when a newer version answers now take the same 450 ms press-and-hold as the
  adult grading controls — the strip sits on the child's first screen, and a child's tap
  must never touch the network or restart the app. A keyboard and assistive technology
  operate them directly. The corner keeps the version chip, the "Automatic update check"
  switch and its plain words, which now point at the first screen.
- New: seven more praise sentences, chosen by the owner from sixteen candidates - the pool
  grows from ten to seventeen, so a twenty-word session repeats itself far less. Every new
  sentence points at the child's own doing, and every word in them has a single
  pronunciation, the lesson the retired "read" line taught. The seven clips rendered on the
  approved recipe, went to the owner's ear, and all seven were approved on 2026-08-07 —
  the shipped files are the ones the owner heard.
- Changed: the listening sweep is COMPLETE. The final 40 words came home in rounds 35 to
  38: every one of the 349 bank words now carries a verdict from the owner's ear, locked in
  the word table with its full recipe and a byte pin verified against the exact file the
  owner heard. The shipped pack was checked file by file against those pins. The sound
  library for the coming sound-out reveal also advanced to 28 of 30: the five vowels, the
  continuous consonants, x and qu all accepted, their owner-heard masters preserved in the
  repository; only ch and the quiet th remain open.
- Changed: 216 more words are now individually heard and locked. A sidecar assistant ran
  twenty blind listening rounds with the owner in one day (rounds 15 to 34), tuning speed,
  carrier sentences, energy and ASR cuts per word, and returned every verdict as a complete
  recipe row plus the exact approved bytes, SHA-256 pinned. Customs upstream verified all
  189 pins, re-rendered the 27 recipe-only rows to byte identity, and found one row ("let")
  whose recipe does not reproduce its pin — the pinned bytes the owner heard govern, and
  the row says so. cup, approved on 28 July and lost to an ambiguous closing record, is
  finally shipped: the sidecar recovered the winning bytes from its archive. The listening
  ledger stands at 309 of 349 words individually approved; the 40 still unheard are named
  in the word table.
- New: Levels 8 and 9 — the bank grows from 300 to 349. Level 8, "Bells" 🔔, holds 27
  four-letter words: the doubled endings (bell, mess, huff, buzz and kin), the first qu
  words (quiz, quit, quip), and the first silent letters (knit, knob, knot, lamb). Level 9,
  "Chicks" 🐔, holds 22 five-letter words: digraph sandwiches (chick, shell, thick), qu at
  five letters (quick, quack, quill), and more silent letters (knock, wreck, wrong, thumb,
  wrap, wren, limb). The tile rule grows with them: qu, kn, wr, mb, ll, ss, ff and zz each
  show as one tile, and the length rule becomes four letters through Level 7, five at
  Levels 8 and 9. ph was considered and left out — no word obeys the bank's rules. Four
  same-sound entries keep the microphone fair (knot, knit, wrap, lamb). Stated plainly:
  the 49 new recordings ship on the approved default recipe and have not yet been heard
  one at a time; their rows in the word table say so.
- Changed: the praise sentence "You read that word all by yourself!" is retired, replaced by
  "You knew just what to do with that word!" — picked by the owner from candidates whose
  every word has a single reading. The old line's "read" was spoken as "reed" by the
  fallback voice, a fault that was remapped around but kept finding new paths; the word is
  now simply gone from the praise list, the guard (`ttsSafePraise`) stays for any future
  two-pronunciation line, and both the engine tests and the voice gate sweep sentences for
  ambiguous words. The replacement clip rendered on the approved recipe, and the owner
  listened the same day: "perfect". The shipped file is the one the owner heard, byte for
  byte.
- New: the app now notices new versions on its own. A page kept alive for weeks — a Safari
  tab that never closes, a home-screen app resumed from memory — never reloads, so it never
  discovered an update and could play an old build indefinitely; the fault was seen in the
  wild on a long-lived page. Now, each time the app returns to the foreground, it asks the
  browser to look for a newer service worker on the app's own host. The request carries no
  data, and a newer version still only installs and waits — it applies at "Update now" or
  the next fresh start, never over an open page. This is the second network call safety
  rule S6 permits, approved by the owner on 2026-08-03 on two conditions, both honored in
  the "Grown-ups corner": the check is described in plain words, and an "Automatic update
  check" switch turns it off — Off means zero requests, proven by a test that drives the
  real app.
- Changed: the word now sits at the visual centre of the stage. The stage centres its whole
  block, but the block carries two reserved rows below the word — the tiles and the sentence,
  116 px of them outside the feedback phase — so the word itself rode at 42 percent of the
  stage's height. The top spacer now carries that difference, putting the word's midline on
  the stage's midline on a phone (measured 49.9 percent) and degrading gracefully on very
  short screens. The word still never moves between phases. Chosen by the owner from four
  measured candidates.
- New: the word bank grows from 260 to 300 words. Levels 2 to 7 gain 40 new decodable
  words chosen inside the bank's own rules — at most 4 letters, 2 or 3 sound units, no
  blends, no vowel teams — with five new same-sound entries (dam, fax, nix, nun, sax) so
  the microphone stays fair. No new tricky words and no new two-letter words. The 40 new
  recordings ship on the approved default recipe and have not yet been heard one at a
  time; they join the listening sweep, and their rows in `tools/voice-words.csv` say so.
- Fixed: the fill on "Next word" ran backwards. The wait is set twice on every word — a short
  guard the moment the result is recorded, then the reveal's real length once its clips are
  scheduled — and the fill was given only the new length, so it restarted from zero. On screen
  it raced along at the fast rate, then snapped back to the start and crawled. SPEC says the
  fill lasts exactly as long as the wait it shows. It now carries on from where it is.
- Fixed: a passing message could cover the child's own control. The toast was placed a fixed
  112 px above the bottom of the screen, which is not the height of anything: on an iPhone it
  covered the record control by 27 px and hid its label, on iPad portrait by 3 px, and on a
  desktop it touched the edge. The rail and the strip are a different height on every screen,
  and the safe area moves them again. The shell now measures what is actually below the stage
  and the toast is placed against that, so it clears the control by the same margin everywhere.
- Fixed: "🗓️ 1 sessions" on the home screen, which is the first thing a child sees after their
  first session, on a screen that teaches reading. It now reads "1 session", counted the way the
  early-exit dialog already counts words.
- Changed: the note that says the microphone can't judge a word — "Parent: 'an' and 'n' are
  nearly indistinguishable" — no longer appears in sessions where the grown-up is grading every
  word anyway. It was telling them something they already knew, on the one line the stage
  reserves for adult text. It still appears in microphone sessions, where it is the reason the
  record control is missing for that word.
- Fixed: the dashed form in the feedback sentence could break across a line, so "sh-i-" sat on
  one row and "p, ship." on the next. The part of the sentence that shows a word split into its
  sounds is the part a child is meant to read, and split again it reads as two fragments. It now
  moves to the next line whole. The sentence itself is unchanged.
- Changed: the marker that tells a grown-up a word has come round again now says who it is for.
  It read "second look at this word", the one adult line in the app that did not name its reader
  — the microphone messages and the tricky-word notes all open with "Parent:". It sits in the
  "grown-up" strip, which a child can see, so a child who can read it read a verdict on the
  attempt they had just made. It now reads "Parent: second look", which keeps the grown-up's cue
  for why the word returned and is shorter on a line that has little room.
- Fixed: every microphone message was written twice at once — once in the message slot under
  the word, and once in a dark pill above the buttons — so a grown-up read the same sentence
  twice and looked for the difference, and a screen reader announced it twice over. Each message
  now has one home. Microphone messages use the slot, which keeps them until the next action
  instead of dropping them after three seconds, and the pill is left to grown-up confirmations
  that have nowhere else to go, such as "Backup file saved." A denied microphone keeps the
  standing explanation that says how to turn it back on.
- Fixed: the keyboard lost the session on every word. Recording a result was supposed to hand
  focus to "Next word ➡️", but that control is deliberately dead while the reveal plays, and
  focusing a dead control does nothing — so focus fell to the page, Enter did nothing, and a
  grown-up using VoiceOver had to hunt for the control again on every word. Focus now arrives the
  moment the control comes alive, which is also the moment a screen reader can usefully announce
  it. If the grown-up has moved to another control during the wait, or the early-exit dialog is
  open, nothing is taken from them.
- Fixed: "🏁 Finish!" did not always finish. A word missed on the last prompt goes back in the
  queue for a second look, but the control took its label from the queue as it stood, so it
  promised an ending and then served a thirteenth word. A child was told the session was over
  and it was not. The label now comes from what the press will actually do: "Next word ➡️"
  whenever another prompt follows, "🏁 Finish!" only when pressing it ends the session. The
  retry itself, and every count, are unchanged.
- Fixed: opening "Finish early?" left the microphone listening behind the dialog. The stage went
  on saying "Listening…", and a reading that arrived while the grown-up was deciding whether to
  stop was recorded — an attempt nobody was watching any more. That recording is also what moved
  the dialog: the Save control only appeared once something had been read, so it arrived mid-tap
  and pushed the other controls down about 53 px, and a tap meant for "Keep reading" discarded
  the session instead. Opening the dialog now ends the attempt, the same as every choice inside
  it does, and the dialog reserves a place for all three of its controls, so nothing can move
  under a finger. A dialog also no longer tries to give the keyboard to a control it has
  deliberately made inert.
- Changed: the wait before "Next word" now shows itself. The reveal runs about six seconds and
  the control stays inert until the child has heard the word, which is right — but it was a grey
  box with nothing happening in it, so nothing on screen said a wait was even under way, or how
  much of it was left. A fill now crosses the control at a steady rate and lands as the control
  comes alive, lasting exactly as long as the wait it shows. It carries no words: a child who is
  learning to read should not have to read anything to understand a pause. It keeps running when
  the device asks for reduced motion, because it is information rather than decoration.
- Fixed: a child who was finding a level hard was given the next level anyway. The app looked
  ahead once every word at the current level had been "seen", and a child who has read all 12
  starter words and got all 12 wrong satisfies that: from the second session they were served
  eight Level 2 words a session until all 39 were spent. A word served that way could then never
  come back, because review reached only the child's own level and below — so each of those 39
  words was read once and parked for good, and sessions shrank to 12 words permanently. The app
  now looks ahead only once 80 percent of the current level has been read correctly at least
  once, and a next-level word the app has graded comes back for review, two a session at most,
  so nothing the child has read is parked out of reach any more. A child
  who is struggling gets a full session of practice at their own level instead. A save that
  already holds parked words starts reviewing them. Nothing is ever served more than one level
  ahead, as before.
- Fixed: on a landscape tablet or laptop, the tiles that break a word into its sounds sat far to
  the left of the word they explain — measured at 191 px away — and the second column they made
  room for held nothing at all, because the controls it was meant to hold live in the rail and the
  "grown-up" strip instead. A child who reads "ship" has to see sh-i-p directly underneath it. A
  landscape screen now stacks the word, the tiles and the sentence in one centred column, exactly
  as a portrait screen does, and keeps the larger word the extra width allows.
- Fixed: ten rules in the stylesheet had never applied. Each ended with a `font:` shorthand
  naming `inherit` as the type family, which is not legal, so the browser discarded the whole
  declaration and every button label in the app rendered at the browser's own weight and size.
  The look never changed, because it was never applied — so the dead rules are gone rather
  than repaired, and the stylesheet now states what it does. The build refuses the same
  mistake if it returns.
- Fixed: a backup file could destroy a family's progress while reporting success. A file whose
  entire content was the marker `{"application":"word-quest-backup"}` was accepted, the app said
  "Backup loaded.", and the level, every word record, the whole log and the child's name were
  replaced with an empty state. The marker was treated as an alternative to checking the file's
  shape; it is now an extra signal on top of it, and a file must look like a save before
  anything is replaced.
- Fixed: the microphone could mark a word as read when nobody read it. A word found anywhere
  inside what the microphone heard counted as a reading, so "come on, you know this one, it is
  in" confirmed "in" — and eight of the twelve first-session words are among the commonest
  words in English, which makes a prompting grown-up enough to score a point the child never
  earned. A reading is now the word itself, or the word with one other word beside it: a
  repeat, or an "um". Anything longer goes to the grown-up, who can see who spoke.
- Fixed: at 200 percent text size the feedback sentence was rendered below the visible stage
  and cut off, and on a phone most of the word went with it. A grown-up who raises the text
  size for a child with low vision got a game that shows a word and never shows the sounds it
  breaks into. The stage now shrinks its word, tiles and sentence so the whole reveal fits, and
  centres content in a way that cannot push it out of reach.
- Fixed: with the ring switch on silent, an iPhone or iPad played no recorded voice at all,
  while the app carried on as though it had spoken. Safari treats a page's Web Audio as
  background sound unless the page says otherwise, and background sound is what the silent
  switch silences. The app now declares itself a playback session before anything sounds, so
  the words are heard whatever the switch says. Found on a phone: the same clip played
  through a plain player was audible and through the app's engine was silent.
- Fixed: any page other than the app itself, served from the app's own address, came up
  blank. The offline worker answered every page request in its folder with the app's own
  page, and the app addresses its files relative to the page, so from a different folder
  nothing loaded and nothing said why. The worker now answers for the app's page only, and
  lets every other page through. Found when a diagnostic page would not open on a phone.
- Fixed: on an iPhone or iPad, every word after the child's first recording sounded wrong.
  iOS hands the whole audio session to the microphone the moment it opens, and leaves
  playback on the narrow route it keeps for a phone call — so the recorded voice, judged
  word by word on a laptop, arrived thin and tinny on the device that matters most. The app
  now takes the session back before each reveal, both by telling Safari the session is for
  playback and by rebuilding its audio engine, which is what moves the route on older
  versions. This also explains the "fuzziness" reported on iOS earlier and never accounted
  for.
- Changed: seven words are spoken better, chosen in a blind listening round. Five of them —
  cup, rub, jug, pop and hop — ended in a small extra vowel or a burst of noise. A word
  rendered on its own gets no sentence shape, so the voice never properly finishes the last
  consonant; rendered as a sentence, with a full stop, it does. That beat the current build
  for all five, and beat a slower pace, a natural pace, and a long fade, none of which won
  anywhere. "tap" no longer starts with a stray "uh", and the s in "sip" no longer sounds
  like a z. The listener rates the five as better rather than right, so they stay on the
  list. "hen" is unchanged: nothing tried beat it.
- Correction to 1.0.0-beta.6, which claimed "tap" and "sip" were fixed: they were not. Giving
  a three-letter word its pronunciation directly turns out to produce a sample-for-sample
  identical recording, because the synthesiser derives the same pronunciation from the
  spelling anyway. The two candidates a listener compared were the same file. Eight words a
  listener has reported — tap, sip, cup, rub, jug, pop, hop and hen — remain imperfect and
  are the next round's work. Explicit pronunciation stays a real fix only where it differs
  from what the synthesiser would choose: the two-letter words, and the praise sentence
  above.
- Changed: "Next word" now waits until the child has heard the word. The reveal takes five to
  seven seconds — praise, a pause, "The word was", a pause, then the word — and advancing
  silences it, but the control came alive after 0.4 seconds. A child who tapped straight away
  never heard the word said properly, which is the one thing the reveal exists for. With sound
  off, or where the recorded voice cannot play, the short guard applies as before.
- Fixed: one attempt now records one result. Both result controls can be held at the same
  time — two fingers, or a palm across the strip — and a second hold that matured a moment
  after the first counted the word twice. Leaving a session early then offered to save
  "2 words" for one word the child had read.
- Fixed: a grown-up who uses a screen reader can now record results. The result controls
  listened for a finger and for a keyboard only, so VoiceOver's double-tap, Narrator and
  Voice Control all did nothing at all — and on a tablet there is no keyboard to fall back
  to, which left the app unusable. An activation from assistive technology now counts the
  way a keyboard press counts: it is just as deliberate, because the control has to be
  focused first. A stray touch still records nothing, and no gesture can grade a word twice.
- Fixed: the three words a listener reported as wrong after the last rebuild. "hip" ended
  with a small extra syllable — "hip-uh" — and so did "cub". Measured every 20 milliseconds,
  the fault was plain: after the p in "hip" the voice adds a tenth of a second of voiced
  sound, which is a syllable, not the release of a p. The end of the speech is now trimmed
  by the amount a listener approved, chosen as the smallest that works so the consonant
  stays safe. The sh in "dish" ran longer than any other and is now shorter. The pack also
  moves from 48 to 96 kbps: a fricative is noise across the whole frequency range, the
  hardest sound for a low bit rate to carry. The download grows from 2.4 MB to 4.6 MB, once.
- New: the build now refuses a document that has drifted from the pack. The specification
  claimed the voice pack was rendered at speed 0.7 for weeks after it moved to 0.85, and no
  gate could see it: a reader cannot hear a manifest, and the pack gate cannot read prose.
  The doc-truth gate now binds the voice, the speed, and the bit rate the documents name to
  the recipe inside the shipped pack.
- Fixed: a child's progress can no longer be destroyed by a storage hiccup or a stray file.
  A failed read of the saved progress was reported as "no save", after which the app built a
  fresh state and wrote it over the save it had merely failed to read. An unreadable save is
  now told apart from an absent one: the visit plays normally, writes nothing, and leaves the
  save on the device for next time. Separately, loading a backup accepted any JSON object at
  all — an empty file reported "Backup loaded." and replaced real progress with an empty
  Level 2. A file must now look like a Word Quest save before anything is replaced, and
  backups written from this version carry a marker. Older backup files still load.
- Fixed: a saved setting of the wrong type no longer crashes the "Grown-ups corner". A name
  stored as a number survived repair and broke the name field on first use; every setting is
  now repaired to the type the app expects.
- Fixed: when the microphone is missing, the app now says why, on the page, for as long as it
  stays missing. A browser that cannot listen — Firefox has never supported it — showed
  grown-up grading silently on every word, and the sentence explaining that was unreachable:
  it could only appear from a button that is never drawn in that browser. A permission denial
  explained itself for one word and was then wiped by advancing to the next. Both now hold
  their explanation, and the "Grown-ups corner" says why its microphone option is greyed out.
  An adult who chose grown-up mode is never nagged about it.
- New: five Level 1 words no longer offer the microphone, because speech recognition cannot
  judge them fairly. "am" sounds like the name of the letter M, and a child who reads it
  perfectly is transcribed as "m" — so the app used to answer a correct reading with "Nice
  try". Those words now go straight to the grown-up, with a note on screen explaining why:
  am, an, ax, if and us. Words a child might genuinely misread, like "pin" and "pen", keep
  the microphone: catching those is the point of the game.
- Changed: the app no longer stretches the word when it says it. Slowing a word distorts
  the very sound a child is learning — "was" suffered most. The clear pause before the
  reveal does the work instead, so the shape stays the same: praise, a pause, "The word
  was", another pause, then the word at a natural speed. The recorded voice pack was
  re-rendered, and the replay control and the system fallback voice now use the same calm
  rate as the praise.
- New: the app speaks with a warm recorded voice instead of the robotic system voice. A
  default voice pack ships with the app: one clip for every word and sentence, rendered
  from an open-source voice the owner chose by ear. Words play slowly with a clear pause
  after "The word was". The system voice remains the fallback, and everything still works
  offline with no network calls.
- New: a second path to level promotion. Two completed sessions in a row with every word
  read correctly move the child up one level. A session that stops early does not affect
  the streak. Any promotion, and a manual level change, resets the streak: it never
  carries across levels.
- New: the word bank grows from 132 words to 260. Levels 2 to 7 gain 128 new decodable
  words, seven new tricky words with notes (has, wash, push, bush, she, the, what), and
  fourteen new same-sound entries so the microphone stays fair. Level 1 keeps its gentle
  12 words.

## Version 5

Version 5 corrects four faults from the destructive test review. Version 5 also adds a test suite
and an icon set.

- Slow storage no longer causes data loss. If the storage does not answer in three seconds, the
  app starts fresh and stops all writes. Late data does not go on the screen and does not go to
  the storage.
- Damaged data is no longer lost. The app keeps a copy at a separate key and gives a message.
- Incomplete data no longer causes a crash. A repair function makes sure that the document has a
  usable shape before any other function reads it.
- A name with an emoji at the 20-character limit stays correct. The app counts characters, not
  bytes.
- New: a test suite with 42 tests (`npm test`).
- New: an icon set for the desktop, for iOS, and for the browser.

## Version 4

Version 4 adds a starter level and a data migration.

- New Level 1: "Hatchlings". The level has 12 two-sound VC words. All other levels move up by
  one number. The bank now has 132 words in seven levels.
- The word "is" has a tricky-word note. The s sounds like "z".
- Saved data migrates one time: the level and the log rows increase by 1. The word data does not
  change. Old exported logs keep the old level numbers.
- The mastered counter now shows a total of 132.
- New rule: next-level words appear only after the child has seen all current-level words. The
  first session has 12 words.
- Speech recognition is less accurate for two-sound words. The adult gives the result more
  frequently at Level 1. The app still never records a wrong result by itself.

## Version 3

Version 3 corrects 14 findings from the second design review.

Engine and data:

- The replay control operates only after feedback. The app never says the word before the
  child's attempt. (N-1)
- A session that stops early does not increase the session counter. The review schedule of the
  other words does not change. (N-2)
- The "discard" option restores the exact word data from the start of the session. (N-3)

Layout and input:

- The stage area can scroll when the user sets a very large text size. At standard text sizes,
  the stage does not scroll. (N-4)
- The "grown-up" strip has more space above the bottom edge of the screen. The controls stay
  clear of the iOS gesture area. (N-5)
- The adult controls have a minimum size of 44 px. (N-6)
- The two-column landscape layout operates only when the screen height is 420 px or more. (N-7)
- The adult controls operate on a hold gesture of 450 ms. A keyboard operates them directly.
  (Carried item 1)
- The "Stop" control always causes a visible change. (Carried item 2)

Feedback and accessibility:

- One channel gives each announcement. Speech output operates when sound is on. The screen-reader
  region operates when sound is off. (N-9)
- The dialog window holds keyboard focus, closes with the Escape key, and returns focus on close.
  (N-10)
- Vibration operates on a correct result only. (N-11)
- The "second look" marker appears in the "grown-up" strip, not on the child's screen. (N-12)
- One flag with three meanings is now two flags with one meaning each. (N-8)

## Version 2

Version 2 corrects the 28 findings from the first design review. The main changes are:

- A fixed three-zone layout, with no page scroll in a session.
- Adult controls in a separate strip.
- Color contrast at WCAG AA.
- A replay control.
- Honest exit options.
- Accessibility improvements.

## Version 1

First public build.
