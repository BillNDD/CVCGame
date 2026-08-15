# Word Quest

**This document owns** the first thing a newcomer needs: what Word Quest is, how to run
it, and where to go next.
**It does not own** any detail it points at. Every number in it is a summary of a fact
owned elsewhere, and where they disagree the owning document is right.

Word Quest is a phonics game for children who learn to read their first words. The game shows one
word at a time. A session has approximately 20 words and takes approximately five minutes. An
adult stays with the child during each session. The goal is a full phonics training game, grown
slowly: the bank starts at CVC words and expands level by level, and every word ships with a
recorded voice a person approved by ear. SPEC section 12 records the approved road.

This document follows the Microsoft Writing Style Guide.

## What the game does

- The game shows one word in large letters. The child reads the word aloud without help.
- The adult gives every result. The adult holds one of three controls in the "grown-up" strip:
  got it, close, or not yet.
- The app never records any result by itself. It has no microphone: speech recognition was
  removed on 2026-08-12 because it sends a child's voice to a third party, and this app keeps
  every piece of a child's data on the device. The adult always has the final decision.
- After each attempt, the app shows the word in sound units. Example: "ship" shows as sh-i-p.
  The digraphs sh, ch, th, wh, ck, and ng always show as one unit.
- A schedule engine selects the words for the next session. The engine mixes new words, words
  that are due for review, and known words. If the child reads a new word correctly at first
  sight, the engine moves that word forward quickly.
- The app keeps a record for the adult: a mastery map, a session log, and an export function.

The word bank and its levels live in SPEC.md section 3, which is the one owner of both.
This file deliberately states no count: a copied number here was 185 words stale before
anyone noticed, and a pointer cannot rot.

## Privacy

The app has no accounts and no analytics, and all progress stays on the device. The full
privacy rule is safety rule S6 in CLAUDE.md — including the two narrow update checks it
allows: one that runs only when a grown-up presses and holds, and an automatic one a parent
can switch off. The "Grown-ups corner" in the app states all of it in plain words. The name
field is optional, device-local only (safety rule S9), and used only for greetings on the
screen.

## How to run the game

The standalone app is a progressive web app in `app/`. The app operates offline after the first
load. To install the app, read `docs/install-windows.md` or `docs/install-ios.md`.

The app is a beta build. Updates come regularly until version 1.0 is ready. The `main` branch is
the live version. Each push to `main` publishes the app again.

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

To understand the build, read `SPEC.md`, section 8. The recorded voice is governed by
`tools/voice-words.csv` — one row per word, every knob and verdict; see `docs/voice-pack.md`.
`docs/testing-gauntlet.md` defines the quality
gates.

## Repository structure

```
app/          the Vite project (the progressive web app)
src/          the generated engine module (do not edit)
tests/        the test suite
tools/        the extractor, the generators, and the gate runners
icons/        the icon set
docs/         the install, testing, and QA documents
reference/    the single-file artifact build
```

## Before you change anything

Run `node tools/blast-radius.mjs --word gob` — or `--count 49`, `--symbol SEAM_MS`, or
`--text "Let's try again."` — and read the answer before you edit. One fact in this
repository is usually written in eight places: the engine, a test with literal values, a
generated file, a gate floor, a mutant anchor, an acceptance scenario doing arithmetic on a
number, a document, and the copy a parent reads. The tool lists every tracked file that names
the thing, sorted by what each file is, with the counts that would move and the gate floors
that follow. It takes a fifth of a second, it is a lookup rather than a gate, and it never
fails a build. `CLAUDE.md` rule E11 explains why it exists, and it is not optional.

## How to test

Run `npm test` for the unit, property, acceptance, fault, and safety suites. Run
`npm run check` before every push — the quality lint, the tests, the sub-minute gates and the
controls of `tools/blast-radius.mjs`, about half a minute. When each check runs, and what a
red one blocks, is engineering rule E7 in CLAUDE.md, which owns that rule; the short form is
that a red check blocks a push, and the full `npm run gauntlet` runs at a release.
`docs/testing-gauntlet.md` defines each gate.

## Design rules

`SPEC.md`, section 1 gives the full list. The most important rules are:

1. The app never tells a child that the child is wrong.
2. Feedback always gives the correct pronunciation in a positive form.
3. The child reads the word first. Help appears only after the attempt.
4. Digraphs always show as one sound unit.
5. A session has a maximum of 26 prompts.
6. The adult controls are quiet, small in appearance, and operate on a hold gesture.
7. Speech output says full words, and the single sounds a level teaches. Speech output never
   says letter names.

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
