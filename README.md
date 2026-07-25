# Word Quest

Word Quest is a phonics game for children who learn to read their first words. The game shows one
word at a time. A session has approximately 20 words and takes approximately five minutes. An
adult stays with the child during each session.

This document obeys ASD-STE100 Simplified Technical English.

## What the game does

- The game shows one word in large letters. The child reads the word aloud without help.
- Microphone mode: the child taps "Start Recording", says the word, and taps "Stop". If the app
  identifies the correct word, the app records a correct result.
- If the app does not identify the word, the adult gives the result. The adult holds one of three
  controls in the "grown-up" strip: got it, close, or not yet.
- The app never records a wrong result by itself. Speech recognition is not reliable for young
  voices. The adult always has the final decision.
- After each attempt, the app shows the word in sound units. Example: "ship" shows as sh-i-p.
  The digraphs sh, ch, th, wh, ck, and ng always show as one unit.
- A schedule engine selects the words for the next session. The engine mixes new words, words
  that are due for review, and known words. If the child reads a new word correctly at first
  sight, the engine moves that word forward quickly.
- The app keeps a record for the adult: a mastery map, a session log, and an export function.

The word bank has 132 words in seven levels:

- Two-sound VC words.
- Short a.
- Short i and o.
- Short e and u.
- Mixed vowels.
- Digraphs sh and ch.
- Digraphs th, wh, ck, and ng, with some tricky words.

## Privacy

The app has no accounts, no analytics, and no network calls. The app does not transmit data. All
progress stays on the device. The name field is optional. The app uses the name only for
greetings on the screen.

## How to run the game

The standalone app is a progressive web app in `app/`. The app operates offline after the first
load. To install the app, read `docs/install-windows.md` or `docs/install-ios.md`.

To start the app on your own computer:

```
npm --prefix app install
npm --prefix app run dev
```

To make a production build in `app/dist`:

```
npm --prefix app run build
```

The reference build is one React component: `reference/word-quest.jsx`. You can also use the
component as an artifact in a chat host that supplies a `window.storage` API. The tool
`tools/extract-engine.mjs` makes the shared engine module `src/engine.js` from the reference
build. The app and the test suite both use the generated module.

To understand the build, read `SPEC.md`, section 8, and `HANDOFF.md`.

## Repository structure

```
app/          the Vite project (the progressive web app)
src/          the generated engine module (do not edit)
tests/        the test suite
tools/        the extractor and the mutation gate
icons/        the icon set
docs/         the install documents
reference/    the single-file artifact build
```

## How to test

Run `npm test` for the 42-test suite. Run `npm run test:mutants` for the mutation gate. The gate
must show 0 survivors.

## Design rules

`SPEC.md`, section 1 gives the full list. The most important rules are:

1. The app never tells a child that the child is wrong.
2. Feedback always gives the correct pronunciation in a positive form.
3. The child reads the word first. Help appears only after the attempt.
4. Digraphs always show as one sound unit.
5. A session has a maximum of 26 prompts.
6. The adult controls are quiet, small in appearance, and operate on a hold gesture.
7. Speech output says full words only. Speech output never says letter names.

## How to contribute

The word bank is data. See the `LEVELS` constant in the component and `SPEC.md`, section 3. You
can add levels, other English varieties, and CVCC or CCVC words. Keep each level at approximately
20 words. Do not add a change that breaks design rule 1.

Add tests for each engine change. `SPEC.md`, section 8 gives the minimum test list.

## Scope

Word Quest gives practice and review. Word Quest is not a phonics curriculum. Use the game
together with a structured reading program. A person must teach each letter-sound pattern first.

## License

MIT. See `LICENSE`.
