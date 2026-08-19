# For agents and humans working in this repository

**This document owns** how agents work here: the prose rules for what is written down,
the dependency rule, and the shape of a listening round or a decision page put to the owner.
**It does not own** the rules that bind the CHANGE itself — that is `CLAUDE.md`, which is
the stricter document and wins wherever the two touch.

This document follows the Microsoft Writing Style Guide.

Read these, in this order, before you change anything:

1. **`CLAUDE.md`** — the rules that bind every change, and "What counts as
   finished work", which defines what may be called done. S1-S9 are child-safety
   rules and are not negotiable. E1-E11 are engineering rules; CLAUDE.md owns
   their exact text, and this list deliberately restates none of it — an earlier
   version of this sentence paraphrased E7 wrongly for days, naming the heavier
   release-time run as the step before every push, while the correct words sat
   one file away. Gate G23 now refuses that phrase anywhere outside its owner,
   which is why this sentence describes it instead of quoting it. E7 and E3 are
   the two most often forgotten under time pressure.
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
5. **`docs/testing-gauntlet.md`** — every gate and what each one is for. It owns
   the gate count; a number written here went stale once already.
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
  per line or heading: 🎧 a round, ✅ closed, ⚠️ needs the owner, 🐞 a fault
  found, 📊 the tally, ⏳ working and slow with nothing needed from the owner,
  🎉 a celebration for something that went particularly right (both
  owner-blessed 2026-08-16). Enough to find the relevant line at a glance;
  never decoration.
- **A round delivery carries, at least:** the link, the tally, what is NEW this
  round, why the last round failed if it did, and any fault found in this
  project's own tooling. The owner reads for whatever is relevant at the time,
  so lead with those and keep them findable rather than deciding for them.
- Brevity never buys silence about a mistake, a refusal, or a thing the owner
  must decide. Shorten the explanation, never drop the item.
- **Every word batch ends with a seating pass** (owner-ruled 2026-08-16: "Go
  ahead with this"). Words whose sound-outs are fully taught at an existing
  level are OFFERED for seating on a page in the same build that ships their
  clips — seated words reach free play, sessions and the schedule; unseated
  clips reach nobody. What stays waiting is a measured number: the coverage
  lookup's clips-waiting-for-seats line runs in every check, so the drawer
  can never grow quietly.

### Never write "approved" without saying approved of what (2026-08-18)

A word passes two separate approvals in this project, and they are months apart:

- **The list ruling** — may a child be taught this word at all? The owner reads it.
- **The clip verdict** — does this recording say the word correctly? The owner hears it.

On 2026-08-18 an agent reported 291 words "approved" after a list ruling. The owner read
that as 291 clips having reached the game unheard, and was right to be alarmed: it is the
exact shape of the failure every gate in this repository exists to prevent.

So the word "approved" is never used alone. Write **"ruled onto the list"** or **"heard and
accepted"**. A status line that says a word is done, when only half of it is, is a false
green - and a false green about a child's voice pack is the most expensive kind here.

### The concise style, beyond chat (owner-ruled 2026-08-18)

The owner asked for the Microsoft Writing Style Guide to govern the project,
with an amendment of his own: "concise paragraphs and statements please with
emojis for clarity."

From this date, the concise form is the default for chat **and for every new
document section**. Short paragraphs. Plain statements. Emojis under the rule
above, marking status and sections so a line can be found at a glance.

Three limits, so the ruling is not over-read:

- **Text the game shows or speaks is exempt.** SPEC owns that voice, and the
  owner named this exemption himself. The feedback sentences are pinned exactly
  by S3, so restyling them would break a safety rule rather than improve a
  document.
- **Existing documents are not rewritten.** The durable set measured 116,332
  words on the day of the ruling. Restyling it wholesale is prose work that
  changes nothing a child can see, and two of those files are ledgers whose
  exact wording IS the evidence: rewriting a record is how a record is lost.
  Four short parent-facing files were restyled the same day, because a parent
  reads those under pressure: README.md, and the iOS, Windows and self-hosting
  guides.
- **Concise is not thin.** A durable document still states why. Drop the
  reasoning and the next reader with no context repeats the mistake the
  document was written to prevent.

## Asking the owner to decide (owner-ruled 2026-08-12)

Every decision that is the owner's to make goes to them as a **page they can
click**, never as a wall of prose in chat and never as a question buried in a
status report. The form is fixed, and it is fixed because the alternative was
tried: a long chat message listing five open questions produced "you have
posted a really long wall of text and I dont even know where to start."

- **One decision per screen.** The page steps through them — 1 of 5, 2 of 5 —
  with Back and Next. Several questions on one page is the wall of text again
  with borders drawn on it.
- **Every option is a button**, and each one carries what it means and what it
  costs. An option with no cost written down is an option the owner cannot
  weigh.
- **One option is marked MY PICK**, with the reasoning. The owner asked for a
  recommendation every time; giving none is not neutrality, it is passing the
  work back.
- **Every question has an "Other" text box**, and what the owner writes there
  outranks any button. The four options are mine and the fifth is always
  theirs.
- **Every claim on the page is measured**, in the repository, at the time of
  writing — not recalled. Numbers go in a table, with the units.
- **A copy-all button** at the end, so the whole set of verdicts comes back in
  one paste rather than being retyped.
- **Verify the page in a real browser before sending it.** Every button, the
  free-text box, and the copy. A page whose copy button silently fails costs
  the owner an evening, and a page that offers two identical arms wastes a
  round — round 8 did exactly that.

The same form carries listening rounds, which are decisions about sound:
verdict buttons reading *perfect / good / iterate on this / no good option* on
every arm, and the copy-all at the end.

## Before you change anything (owner-ruled 2026-08-13)

`CLAUDE.md` E11 owns the rule. In practice it is four lines in your own notes before the
first edit:

1. **What am I changing?** One sentence, concrete — a word, a count, a constant, a line of copy.
2. **Who owns this fact?** Ask the map, not your memory: `docs/file-map.md` names the one
   file that owns each guarded fact and the declared kind of every file (owner-ruled
   2026-08-15). A fact changes only in its owner; a new file declares itself in
   `tools/file-map.mjs` in the same commit. Gate G23 refuses the alternatives.
3. **What depends on it?** Ask, do not remember. `node tools/blast-radius.mjs --word gob`
   lists every tracked file that names it, classified by what the file IS — engine source,
   generated, test with literal values, gate floor, mutant anchor, a document a parent reads —
   with the counts that move and the floors that follow. `node tools/mutants.mjs --anchors`
   catches mutants whose anchor your edit has moved: milliseconds, against twelve minutes to
   learn the same thing from a gauntlet. Read the output as a plan, not a grep.
4. **What proves I did it right?** The check or the observation, named before the work starts,
   not chosen afterwards from whatever passed.

The failure this prevents is not carelessness. It is the ordinary shape of a small change in a
system where one fact is written in eight places: the edit is right, and the eighth place is
still saying yesterday's truth.

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
  ships must hold to safety rule S6 exactly as CLAUDE.md states it, no matter
  what the library offers.
- If a reasonable search finds no suitable open-source option, propose a custom
  approach and wait for approval; do not build the substantial version first.

## Before you push

- `npm run check` — the quality lint, the test suite, the sub-minute gates and the E11
  lookup's own controls, about half a minute. A red check blocks the change (E7). The quality lint runs first, because it is the
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

### One pen on the tree (owner-accepted R8, 2026-08-19)

Five writers shared one working tree for a day, and every kind of trouble that
invites arrived on schedule: a commit went in red because the tree changed
between the check and the commit; an agent's commit swept another writer's
in-flight edits under its own message, which tripped a security review; two
document counts drifted mid-edit; and a `git add` raced a concurrent edit to
the baseline. No data was lost - every drift was caught by a gate - but the
reports stopped being believable, which costs more than the faults did.

The rule, accepted by the owner on the forensic audit of 2026-08-19:

- **One writer at a time on the shared tree.** The session lead holds the only
  pen on `git commit`.
- **Parallel agents get read-only briefs, or their own worktree.** A read-only
  agent reports; it never edits, stages or commits.
- **Verify the tree you commit, not the tree you checked.** If anything else
  can write, build the prospective commit as a tree object and run the check
  against that exact tree, the way the are/were shipping commit did. "The
  check was green when I ran it" is not the same claim as "the committed tree
  is green," and the gap between them shipped a red commit on 2026-08-19.
