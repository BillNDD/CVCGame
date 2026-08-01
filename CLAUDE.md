# Rules for this repository

These rules bind every change, human or agent. `docs/testing-gauntlet.md` defines the gates that
enforce them. SPEC.md is the master source for behavior. `docs/settled.md` is the standing record
of questions a listener or a measurement has already closed — read it before voice, audio or
word-bank work, and before designing a listening round (E10).

This document follows the Microsoft Writing Style Guide.

## Safety rules (child-facing)

- S1. The app never records a wrong or close result by itself. Only an adult action can record
  one. Speech recognition can only confirm a correct reading.
- S2. The app never speaks the target word before the attempt ends. The replay control operates
  only in the feedback phase.
- S3. Feedback uses the exact SPEC section 5 sentences. A miss is an invitation to try again,
  never a failure message.
- S4. Speech output says full words only. It never says letter names.
- S5. Adult result controls need a 450 ms pointer hold. A keyboard operates them directly.
- S6. The app makes no network calls after load, has no accounts, and has no analytics. All data
  stays on the device. One exception: when an adult taps "Check for updates" in the
  "Grown-ups corner", the app makes one request to its own host to compare versions. The
  request carries no data, and nothing else may use it.
- S7. Child controls are 56 px or more. Adult controls are 44 px or more.
- S8. Digraphs (sh, ch, th, wh, ck, ng) always show as one tile.
- S9. No file in the repository contains a personal name. The child's name is a device-local
  setting only.

## Engineering rules

- E1. Do not edit `src/engine.js` or any file in `tests/generated/` by hand. They are generated.
- E2. The reference build stays one file. The extractor makes the engine module from it.
- E3. Never delete a test or a mutant. Never lower a threshold or add a skip to pass a build.
- E4. Every assertion uses literal expected values, never the constant under test.
- E5. Every detector ships with a negative control that proves it catches its target fault.
- E6. Raise the floors in `.claude/gate-baseline.json` when counts grow; never lower a floor.
  Keys that end in `_max` are ceilings: never raise one. E6 governs the baseline file only;
  the file-length limit is one of the G6 ceilings the file protects, not the meaning of E6.
  That limit is 900 lines. The owner raised it from 600 on 2026-07-29; only the owner can move
  a ceiling, and a file approaching one should be split instead.
- E7. Run `npm run gauntlet` before every push. A red gauntlet blocks the change.
- E8. Do not change game behavior, the word bank, the feedback text, or the layout in a testing
  task. Do not add PWA work in a testing task.
- E10. Read `docs/settled.md` before any change to the voice, the audio pipeline, or the word
  bank, and before designing a listening round. It lists what a listener or a measurement has
  already closed, so a settled question is never re-opened at the cost of a round. When a round
  lands, record its result the same day — in `docs/voice-pack.md` for what shipped, and in
  `docs/settled.md` for what is now closed. An approved fix that is not applied must be named
  in "Approved and unshipped" with the reason it is waiting. A verdict that lives only in a
  chat log is a verdict this project will lose, and has.
- E9. Before launching a multi-agent workflow, agree the plan with the owner: how many agents
  and how many antagonists (adversarial checkers) the problem needs. Default to three of each
  or fewer. Verifiers work in batches: give each antagonist one lens and the whole finding
  list, never one agent per finding. Review agents only read; they never edit files.
