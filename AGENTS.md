# For agents and humans working in this repository

This document follows the Microsoft Writing Style Guide.

Read these, in this order, before you change anything:

1. **`CLAUDE.md`** — the rules that bind every change, and "What counts as
   finished work", which defines what may be called done. S1-S9 are child-safety
   rules and are not negotiable. E1-E10 are engineering rules; E7 (run
   `npm run gauntlet` before every push) and E3 (never delete a test, never
   lower a floor) are the ones most often forgotten under time pressure.
2. **`SPEC.md`** — the master source for behaviour. If the code and SPEC
   disagree, that is a defect in one of them, and gate G16 will say so.
3. **`docs/settled.md`** — what a listener or a measurement has ALREADY closed.
   Read it before any voice, audio or word-bank work, and before designing a
   listening round. This file exists because this project has twice re-opened a
   settled question and once lost an approved fix for two days — three times as
   of 2026-08-12, when a round for the word "a" was built from plain phoneme
   renders this file had already closed twice over.
   **Consulting what does NOT work is a MUST before a round, not a courtesy
   afterwards** (owner-ruled 2026-08-12). `tools/round_guard.py` enforces the
   mechanical part: it reads this file and `tools/voice-words.csv`, refuses an
   arm they have already closed, and refuses to run at all if this file has
   stopped saying what one of its refusals claims. Reading it yourself is still
   required — the guard covers the rules, not the judgements.
4. **`docs/open-faults.md`** — everything KNOWN to be wrong, missing or
   undecided right now, with where it lives and what done means. Read it before
   you start, so you neither re-discover a fault that is already written down
   nor build on top of one. It is the counterpart to `docs/settled.md`: settled
   holds what is closed, open-faults holds what is not. An entry leaves it only
   by being fixed, and its result is then recorded in whichever document owns
   the fact. If you find a fault and do not fix it in the same change, it goes
   in here — a fault that lives only in a chat log is a fault this project will
   lose, and has.
5. **`docs/testing-gauntlet.md`** — the 16 gates and what each one is for.
6. **Never hunt for a boundary in audio this project rendered.** The
   synthesiser publishes the duration of every phoneme before it renders a
   sample, and `tools/phoneme_timings.py` reads it: a token lasts
   `round(sigmoid(logits).sum() / speed) * 25 ms`, and summed over an utterance
   it matches the rendered audio to the millisecond, twelve times out of twelve
   at three speeds. Energy thresholds shipped "of red" to the owner, silence
   found word boundaries zero times out of twelve, the DTW aligner reached 33 of
   34, and template matching cannot locate a bare vowel at all. All of that was
   work that never needed doing. Ask the model. `npm run check:timings` proves
   it still holds; it is out of `npm run check` for the same reason the word-gate
   control is out of the gauntlet — it needs the synthesiser environment, and a
   new dependency in CI is the owner's call.
7. **`tools/voice-words.csv`** — for voice work only: the permanent repository
   of the voice. One row per bank word, one column per knob and decision. It is
   the ONLY file a person edits after a listening round; everything else —
   `keepers-treatments.json`, `keeper-bytes.json`, `voice-lock.json` — is
   generated from it by `node tools/gen-voice-lock.mjs`, and G13 fails the
   build if the chain disagrees. Editing a derived file by hand is always
   wrong.

## Writing to the owner

Every message to the owner — chat replies, round-delivery notes, the
instructions on a listening page, reports — follows Zinsser's four principles
(owner-ruled 2026-08-10): **simplicity** (plain words, no jargon or clutter),
**brevity** (say it once, cut what the reader does not need), **clarity** (one
readable point at a time, numbers where numbers answer), and **humanity**
(write like a person, own mistakes plainly). This governs how agents write to
the owner. It says nothing about how the game speaks to children or parents —
SPEC owns that voice.

**Chat replies are scanned, not read** (owner-ruled 2026-08-11: "I can't read
so many paragraphs of detail"). In chat only — commit messages, `docs/`, SPEC
and listening-page copy keep the rule above unchanged, because those are the
durable record and must survive a context loss:

- **Bullets, tables and short lines.** Not paragraphs. Be technical: a number,
  a family name or a threshold beats a sentence describing it.
- **Length follows the content.** The owner ruled against a fixed budget —
  "whatever is reasonable given the context and the density of detail". A dense
  finding earns length; a routine delivery does not. Never pad, never truncate
  something the owner needs.
- **Emojis mark status and sections, never mid-sentence.** One leading emoji
  per line or heading: 🎧 a round, ✅ closed, ⚠️ needs the owner, 🐛 a fault
  found, 📊 the tally. Enough to find the relevant line at a glance; never
  decoration.
- **A round delivery carries, at least:** the link, the tally, what is NEW this
  round, why the last round failed if it did, and any fault found in this
  project's own tooling. The owner reads for whatever is relevant at the time,
  so lead with those and keep them findable rather than deciding for them.
- Brevity never buys silence about a mistake, a refusal, or a thing the owner
  must decide. Shorten the explanation, never drop the item.

## The two failures this repository is built around

**A machine cannot hear a word.** Every automated check passed while the pack
said "at" for "cat" and "n" for "an". Audio quality is settled by a person
listening, one word at a time, and by nothing else. Two attempts to find a
measurable proxy have failed and are recorded in `docs/settled.md`.

**A fix that is approved but not applied reads as done.** Record every verdict
the day it arrives, in this order: the word's row in `tools/voice-words.csv`
(then regenerate: `node tools/gen-voice-lock.mjs`), `docs/voice-pack.md` for
the story of what shipped, `docs/settled.md` for what is now closed, and
"Approved and unshipped" for anything waiting, with the reason. A verdict that
lives only in a chat log is one this project loses.

## Dependencies and custom code

- **Prefer the standard library and the project's existing dependencies.** When
  those fall short, prefer an established, well-maintained open-source library
  over a substantial custom implementation.
- **Always ask the owner before adding a new dependency or building a
  substantial custom solution**, and bring a brief justification with the ask.
- Small local glue is fine without asking, where a library would be
  disproportionate or a project convention requires hand-rolled code: the
  reference build stays one dependency-free file (E2), and anything the app
  ships must hold to S6 — no network calls after load and no analytics, no
  matter what the library offers.
- If a reasonable search finds no suitable open-source option, propose a custom
  approach and wait for approval; do not build the substantial version first.

## Before you push

- `npm run check` — the quality lint, the test suite and the sub-minute gates, about half a
  minute. A red check blocks the change (E7). The quality lint runs first, because it is the
  cheapest thing here and it is the one that refuses a file over the complexity or length
  ceiling; it joined the check on 2026-08-12 after two defects reached a push in one day
  behind the gap it left. It needs Python and NumPy for the word-gate island control; that
  is the voice toolchain's own requirement, and the control is not in the gauntlet. The full `npm run gauntlet` runs at release time only: locally
  when the owner asks for a beta or version release, and on CI when the release's v* tag
  lands. Fix a red release gauntlet before anything else moves.
- Raise the floors in `.claude/gate-baseline.json` when counts grow. Never
  lower one. Keys ending in `_max` are ceilings; never raise one (E6).
- `src/engine.js` and `tests/generated/` are generated. Edit
  `reference/word-quest.jsx` and run `node tools/extract-engine.mjs` (E1, E2).
- Every detector ships with a negative control that proves it catches its
  target fault (E5). Every assertion uses a literal expected value (E4).
