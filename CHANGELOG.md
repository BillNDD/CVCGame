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
- Fixed: a microphone that never answers — in-app browser views above all — could leave the
  game stuck on "Listening…" forever, and any microphone problem silently switched the
  saved mode to grown-up grading, hiding the microphone button from then on. Listening now
  times out after 8 seconds and invites another try, the "Stop" control always works, and
  only an explicit permission denial changes the saved setting; any other failure switches
  to grown-up grading for that visit only.
- Fixed: the record control could fail without a word of feedback, and a correct reading
  could go unconfirmed. A recognizer that dies silently now leaves "Didn’t catch that —
  tap to try again." on screen until the next tap, and a second silent attempt switches to
  grown-up grading for that visit, with the reason on screen. A slow reader is no longer
  cut off at 8 seconds: the timer re-arms while the engine hears sound, and a 2-second
  grace window accepts a result that arrives after a stop — so a reading confirmed late
  still counts. A tardy event from an abandoned attempt can no longer wipe the feedback
  screen or record a word twice. A device that an older version wrongly locked into
  grown-up grading heals back to the microphone one time. An installed app now refreshes
  itself once when a new version takes control, so fixes arrive without a double relaunch.
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
