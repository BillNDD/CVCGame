# For agents and humans working in this repository

This document follows the Microsoft Writing Style Guide.

Read these four, in this order, before you change anything:

1. **`CLAUDE.md`** — the rules that bind every change. S1-S9 are child-safety
   rules and are not negotiable. E1-E10 are engineering rules; E7 (run
   `npm run gauntlet` before every push) and E3 (never delete a test, never
   lower a floor) are the ones most often forgotten under time pressure.
2. **`SPEC.md`** — the master source for behaviour. If the code and SPEC
   disagree, that is a defect in one of them, and gate G16 will say so.
3. **`docs/settled.md`** — what a listener or a measurement has ALREADY closed.
   Read it before any voice, audio or word-bank work, and before designing a
   listening round. This file exists because this project has twice re-opened a
   settled question and once lost an approved fix for two days.
4. **`docs/testing-gauntlet.md`** — the 15 gates and what each one is for.

## The two failures this repository is built around

**A machine cannot hear a word.** Every automated check passed while the pack
said "at" for "cat" and "n" for "an". Audio quality is settled by a person
listening, one word at a time, and by nothing else. Two attempts to find a
measurable proxy have failed and are recorded in `docs/settled.md`.

**A fix that is approved but not applied reads as done.** Record every verdict
the day it arrives: `docs/voice-pack.md` for what shipped, `docs/settled.md`
for what is now closed, and "Approved and unshipped" for anything waiting, with
the reason. A verdict that lives only in a chat log is one this project loses.

## Before you push

- `npm run gauntlet` — 15 gates. A red gauntlet blocks the change (E7).
- Raise the floors in `.claude/gate-baseline.json` when counts grow. Never
  lower one. Keys ending in `_max` are ceilings; never raise one (E6).
- `src/engine.js` and `tests/generated/` are generated. Edit
  `reference/word-quest.jsx` and run `node tools/extract-engine.mjs` (E1, E2).
- Every detector ships with a negative control that proves it catches its
  target fault (E5). Every assertion uses a literal expected value (E4).
