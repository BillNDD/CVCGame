# Changelog

This document follows the Microsoft Writing Style Guide.

## Version 6

Version 6 adds the standalone progressive web app. The reference build does not change.
The first app version is 1.0.0-beta.1. The app stays in beta until version 1.0 is ready.

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
