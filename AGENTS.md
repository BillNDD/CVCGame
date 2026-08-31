# For agents and humans working in this repository

**This document owns** how agents work here: the prose rules for what is written down,
the dependency rule, and the shape of a listening round or a decision page put to the owner.
**It does not own** the rules that bind the CHANGE itself — that is `CLAUDE.md`, which is
the stricter document and wins wherever the two touch.

This document follows the Microsoft Writing Style Guide.

Read these, in this order, before you change anything:

1. **`CLAUDE.md`** — the rules that bind every change, and "What counts as
   finished work", which defines what may be called done. S1-S9 are child-safety
   rules and are not negotiable and live in CLAUDE.md. E1-E11 are engineering rules; this
   document owns
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

## What counts as finished work

These rules apply to every change, whether made by a person or by one or more agents in a
session or in parallel. They sit on top of the checks this repository already runs. They
never replace or relax those checks. If this section and an existing gate disagree, follow
the stricter one and ask the owner before proceeding.

The product is the working game. Deliver a game a child can play, that teaches the right
thing correctly, and that keeps working offline with all data on the device. The only
network use is the kind a parent can see and understand: today that is the
"Check for updates" request and the switchable foreground look for a newer version,
both to the app's own host (S6). Any future exception must be
equally narrow, carry no child data, be shown to parents in plain words in the
"Grown-ups corner", and be approved by the owner before it ships. Tests, checklists, and
documents exist only to protect that game. They are never the goal by themselves.

Build the game and the checks that guard it — not paperwork about the work. Most work must
change something a child or grown-up can see, hear, or do: game behavior, teaching content,
engine logic, layout, sound, or a test that proves one of those is correct. Do not create
new status files, progress logs, roadmaps, session summaries, or "what I did" write-ups.
Update the single document that already owns the fact. The owned set is named and gated
(G17): SPEC.md, CLAUDE.md, AGENTS.md, README.md, CHANGELOG.md, the documents in `docs/`
including `docs/open-faults.md`,
`tools/voice-words.csv` and the files generated from it. A new governing or status file
needs the owner's approval, the same way a new dependency does. Do not add a test or
document that guards nothing real. Reorganizing paperwork, or choosing easy documentation
instead of the harder game work it was meant to support, does not count as progress. The
gauntlet, the check, the QA script, and listening rounds are load-bearing proof — not
optional paperwork. Cadence — when the expensive checks run — is the owner's decision
(2026-08-02); within the chosen cadence, nothing is skipped, shrunk, or weakened.

Honesty is absolute. Never do any of the following, and never let a check pass because of
them:

- edit a test, fixture, or threshold so a failing behavior looks like it passes (E3);
- present a mock, stub, sample, or hand-picked example as proof the real feature works —
  round 8 offered a listener two identical files as different candidates, and round 10
  offered whole sentences as words; each wasted a round and neither may recur;
- weaken or remove an assertion, add a skip, or hard-code an expected answer (E3, E4);
- call a work item done, or a build ready, while any part is unfinished, unverified, or
  only works in a way a real child could not use.

A fault you find and do not fix in the same change goes in `docs/open-faults.md`, with
where it lives, what a child or a grown-up experiences today, and what done means. Not in a
chat reply, not in a commit message alone, and not in a new file of its own. That document
is the counterpart to `docs/settled.md` — settled holds what is closed, open-faults holds
what is not — and it exists because a fault that lives only in a chat log is a fault this
project will lose, and has. An entry leaves it only by being fixed, and the result is then
recorded in whichever document owns the fact. Read it before you start.

If work was closed but was not actually finished, reopen it, state what is missing, and
record when and how it was wrongly closed. That is the cup lesson: a result approved on
28 July was lost for two days because the closing record never said which margin went with
which word. The gauntlet is this rule's enforcement arm — the E3, E4 and E5 checks, the
planted mutants, and every negative control. Do not build a second one.

Refusing a task is not delivering the feature. If work is too hard, unsafe, or unclear,
stop and say so clearly — that is better than faking it. A clear refusal, a plan, or a
safe placeholder is not a finished feature. Do not close or ship it on that basis. A
placeholder may exist only with owner approval and a named entry in the owning document —
"Approved and unshipped" in `docs/voice-pack.md` is the pattern. A feature is finished
only when the real behavior is implemented, tested against real expected values, and shown
to work. Anything short of that stays open and labeled unfinished, with the reason.

Prove what automated tests cannot settle alone. For spoken-word correctness (a listening
round, recorded in the word's row of `tools/voice-words.csv`), true offline behavior (the
QA script on a real device), and whether a pre-reader can use the screen (judged in the app
beside the printed word, never only as a bare clip), a green script is not enough.
Microphone fairness (`ADULT_JUDGED`) stood in this list until the microphone was removed on
2026-08-12; SPEC section 3 records the retirement, and the clause is kept here as one line
so a reader who meets the name in an old commit knows it was a rule and not a leftover. G13 is this rule's gate for the voice — it
refuses any recipe no person heard — and the QA script owns device proof. This game
teaches phonics reading — CVC today, growing slowly toward a full phonics training game
along the owner-ruled road in SPEC section 12 — and will never contain math; an earlier
draft of this rule mentioned "math grading" in error.

State the finish line when you start. Before implementing, write what done means for the
task — the real behavior the child gets, and the specific check or evidence that will
prove it — in the commit message or the task entry, never in a new file. Hold the task to
that definition.

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
every arm, and the copy-all at the end. **Every sound gets more than one
candidate, and every arm gets a comment box** (owner-ruled 2026-08-29, after
the chunk round offered one candidate per sound and no comment space: "Next
time give me more than one option per sound and give me a comment space for
each so I can tell you what is wrong"). A single-candidate arm wastes the
listen when it fails - the verdict says no without saying why, and the round
must be rebuilt blind.

## Before you change anything (owner-ruled 2026-08-13)

E11 below owns the rule. In practice it is four lines in your own notes before the
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

## The engineering seat, before and after every change (owner-ruled 2026-08-23)

The owner's words, given while ruling on a release fix: "have a read only context
independent agent in role of software engineering expert perform both BEFORE and AFTER
passes on everything you want to change (give advice on what to do, then check if what you
did breaks anything etc etc)."

This generalises the art council's third seat to every change, not only the art steps. The
seat is the same one the owner named the same day — a software engineering and programming
expert, adversarial mandate unchanged (`docs/art-plan.md`, "How the council works").

- **Read only, context independent.** A fresh agent each pass, with no memory of the last
  one. It reads the repository, `CLAUDE.md`, `SPEC.md`, the gauntlet document and the map,
  and it never edits, commits, pushes or tags. Give it the change you INTEND, not a diff
  you have already made.
- **The before pass advises.** For each change: what to do and why, what it breaks — gates,
  tests, floors, documents, by path, using the E11 lookups rather than memory — what would
  prove it, and what it would refuse to let ship. It also gives the ORDER, and says which
  changes it would not make now.
- **The after pass checks.** The same seat, fresh, receives the diff and the commit and
  asks whether what was done broke anything: a gate that now measures less than it claims,
  a count that moved without its floor, a document that still says yesterday's truth, a
  test that would pass with the behaviour broken.
- **A finding is verified before it is taken** (the council's rule, and it has earned
  itself twice: an audit called a live Build-it state dead, and another said the word bank
  had never been screened when SPEC carried the dated screen). Read the file and line the
  finding names. A finding you cannot confirm is declined with the reason, in the commit
  message, the same as one you disagree with.
- **Batch the work, not the seat.** One before pass over the batch of changes you are about
  to make, one after pass over what you made. Not one agent per change, and never one per
  finding (E9).

The gauntlet still outranks the seat: advice does not ship anything, a green check does.

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

- **First, look for it in this repository.** Before writing anything new, find
  out whether this project has already solved the problem, and read what it
  found. Owner-ruled 2026-08-31. This is the first rung because it is the one
  this project keeps falling off, and every fall cost real time: the
  synthesiser publishes every phoneme's duration and `tools/phoneme_timings.py`
  reads it, yet energy thresholds, silence detection, a DTW aligner and
  template matching were each built to hunt for boundaries that were never
  hidden - the read list above still carries that lesson as its own numbered
  item. The record's fix for the word-final release is a TRIM, and a FADE was
  used instead for twelve listening rounds, quietening the artifact and leaving
  it. On 2026-08-31 a sentence check was nearly rebuilt from scratch while
  `tools/decodable.mjs` and two tests in `tests/engine.test.js` had been
  proving the same thing, in both directions, for weeks. And when a tool does
  keep its own copy of what the engine already knows, it drifts: `decodable`
  once carried a second heart-word roster and levelled sentences against words
  no child had met. Faults F1 and F2 are the same shape - a hand-written map
  rots exactly like a hand-written count, and a second ledger over the same
  facts needs its own gate to stay in step. Ask the repository: `docs/file-map.md`
  names the owner of every guarded fact, `node tools/blast-radius.mjs` finds
  every file that mentions a thing, and `docs/settled.md` and
  `docs/open-faults.md` say what has already been closed and what has not.
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

## Engineering rules

- E1. Do not edit `src/engine.js` or any file in `tests/generated/` by hand. They are generated.
- E2. The reference build stays one file. The extractor makes the engine module from it.
- E3. Honesty ("What counts as finished work" owns the full rule): never delete a test or a
  mutant, never lower a threshold or add a skip to pass a build.
- E4. Honesty ("What counts as finished work" owns the full rule): every assertion uses
  literal expected values, never the constant under test.
- E5. Every detector ships with a negative control that proves it catches its target fault.
- E6. Raise the floors in `.claude/gate-baseline.json` when counts grow; never lower a floor.
  Keys that end in `_max` are ceilings: never raise one. E6 governs the baseline file only;
  the file-length limit is one of the G6 ceilings the file protects, not the meaning of E6.
  That limit is 1400 lines, and since 2026-08-16 the generated engine alone carries its own
  ceiling, 2400 then ("Increase the engine specific line max to 2400" — the engine grows with
  teaching content, and it is the one file that kept hitting the general limit), raised to
  2600 on 2026-08-29 ("Increase engine max length to 2600 lines") for the chunk-ladder
  roster. The general
  limit was raised from 600 to 900 on 2026-07-29, from 900 to
  1200 on 2026-08-12, and from 1200 to 1400 on 2026-08-15 ("Increase it to 1400 on my
  authority", when the pre-level ladder would not fit the generated engine); only the owner
  can move a ceiling, and a file approaching one should be split instead.
- E11. Name the change, then name what it breaks, BEFORE you touch a file. Owner-ruled
  2026-08-13, after a beta spent twelve hours failing the same way: a change is made, and only
  then does anything discover what depended on it. Write down what you intend to change, then
  walk the gates and say which will move — counts and floors (G1, G13, G20), mutant anchors
  (G5, G19), scenario arithmetic (G3), the documents that state the fact (G16), the copy a
  parent reads (G11), and the file lists (G17). Ask the repository rather than remembering:
  `node tools/blast-radius.mjs --word gob` (also `--count`, `--symbol`, `--text`) lists every
  tracked file that names the thing — by content and by file name, so a word's clip is not
  forgotten — classified by what each file IS, with the counts that move, the floors that
  follow, and the scenarios doing arithmetic on the level size it just computed. It is a
  lookup, not a gate: it never fails a build and it cannot tell you whether the change is
  right. `node tools/mutants.mjs --anchors` reports every mutant whose anchor has moved in
  milliseconds, where finding the same thing through a gauntlet costs twelve minutes and
  usually happens at the worst moment; `node tools/app-mutants.mjs --anchors` does the
  same for G19 (added 2026-08-22, after the lookup was asked of a tool that had no such
  mode and a killed run left a mutant in the tree).

  The third lookup is the map, owner-ruled 2026-08-15: before any change to any file — a
  fact altered, a fact invented, any `.md`, `.json` or `.csv` touched — consult
  `docs/file-map.md`. It names the one file that owns each guarded fact and the declared
  kind of every file. Change a fact only in its owner; declare any new file in
  `tools/file-map.mjs` in the same commit that creates it; never edit the map itself, which
  is generated. Gate G23 refuses what this paragraph asks you not to do — a copied fact, an
  undeclared file, an orphaned ledger, a resurrected tombstone — so forgetting the map is a
  red check, not a silent drift. Its honest limits are written in the tool's own header and
  in F3: a stale paragraph in fresh words still needs a human reader, and a brand-new fact
  family is unguarded until its row is added.

  A gate that goes red AFTER a change is a gate doing its
  job late; the same gate consulted first is a plan. This rule earned itself on its first use:
  it predicted five gates for one small change and the dry run then found a sixth nobody had
  thought of.

  Tonight's evidence for why it is a rule rather than advice, all from one session: removing a
  word left it living in five other files, found one gate at a time; the same removal put the
  promotion boundary out of reach of every test, so ">=" could have become ">" and a child
  would have been held at a level they had earned; a mutant reached the repository because a
  commit was made while a gate held a file mutated; and two mutants stopped meaning anything
  because their anchors moved under an unrelated edit.
- E7. Run `npm run check` before every push: the quality lint (ESLint with the complexity and
  file-length ceilings, the dependency-cycle scan, and the quality controls) plus the full test
  suite plus the sub-minute gates (copy, doc-truth, QA count, voice pack, governing files,
  effect map, the word-gate island control, and the coverage lookup with its
  clips-waiting-for-seats line, owner-ruled 2026-08-16) plus the controls of the E11 lookup
  (`tools/blast-radius.mjs --self-test`, a fifth of a second) plus the type checker
  (`tools/type-check.mjs`, owner-ruled 2026-08-22: TypeScript reads the plain JavaScript,
  both sides at zero) plus the art budget (`tools/art-budget.mjs`: the tracked art's bytes
  under the 12 MB the owner ruled on 2026-08-22) plus the provenance reader
  (`tools/provenance-check.mjs`: every art family's record in the shape the bible's
  section 17 ruling asks, its tokens against `C`) plus the release command's own controls
  and the deploy's (`tools/release.mjs --self-test` and
  `tools/verify-published.mjs --self-test`, added 2026-08-23 after a sweep found that the
  refusals standing between a bad artefact and a child's device ran in no gate at all and
  had never once executed), about half a minute. A red
  check blocks the change. The quality lint joined the check on 2026-08-12, owner-ruled, after the gap it left
  cost two defects in one day: a `font:` shorthand the quality controls have refused since
  2026-07-29 shipped a label at four times its intended size, and a file went over the
  complexity ceiling and was pushed. Both were caught only by the gauntlet, which runs at a
  release. Six seconds bought both back.
  The full `npm run gauntlet` — mutants, coverage, the build and the browser gates — runs
  when the owner asks for a beta or a version release, and a release is cut only from a
  green gauntlet — by `npm run release` (owner-ruled 2026-08-22, hardening decision 1),
  which refuses a dirty tree, evidence that is not PASS on HEAD, a rebuild whose bytes
  differ from the proved bytes, a version with no changelog entry, an existing tag, or a
  push that would not fast-forward, and otherwise pushes main and cuts the tag and the
  release at HEAD itself. Beta 24 and beta 25 were both tagged at a stale main by hand;
  that step no longer exists. The release also CARRIES the bytes it proved (owner-ruled
  2026-08-23): the same `gh release create` call attaches a tarball of the proved
  `app/dist` and the `.gauntlet-evidence.json` that proved it, and the website's deploy
  publishes those exact bytes rather than building the app a second time on a runner
  nothing measured - it downloads both assets, recomputes the payload hash from the
  extracted files and refuses to publish anything that differs. CI runs the full gauntlet
  only at that same occasion - the release's v* tag
  triggers it, a recorded second opinion on the exact released commit - and on demand from
  the Actions tab. A red there is fixed before anything else moves. Between releases, a push
  is covered by the check, nothing more: that is the owner's chosen trade, dated
  2026-08-02. **The website updates at releases only, owner-ruled 2026-08-23.** It used to
  deploy on every push to main, so a family installed mid-work commits - a half-finished art
  step reached real children the moment it was pushed - and publishing only proved bytes
  means publishing only when there are proved bytes. A push between releases changes
  nothing a family can see.
- E8. Do not change game behavior, the word bank, the feedback text, or the layout in a testing
  task. Do not add PWA work in a testing task.
- E10. Read `docs/settled.md` before any change to the voice, the audio pipeline, or the word
  bank, and before designing a listening round, and read `docs/open-faults.md` before any
  change at all, so a known fault is neither re-discovered nor built upon. Consulting what
  does NOT work is a MUST before a round, not a courtesy afterwards, and the same goes for
  `tools/voice-words.csv`, which holds for every bank word the family that actually won and
  the round it won in — read the word's row before offering that word anything.
  `tools/round_guard.py` enforces the mechanical part of both and refuses to run if
  `docs/settled.md` has stopped backing one of its refusals; it does not replace reading them.
  Owner-ruled 2026-08-12, after a round for the word "a" was built entirely from plain
  phoneme renders that both records had already closed. It lists what a listener or a measurement has
  already closed, so a settled question is never re-opened at the cost of a round. When a round
  lands, record its result the same day — in the word's row in `tools/voice-words.csv`
  (regenerate with `node tools/gen-voice-lock.mjs`), in `docs/voice-pack.md` for what
  shipped, and in `docs/settled.md` for what is now closed. An approved fix that is not applied must be named
  in "Approved and unshipped" with the reason it is waiting. A verdict that lives only in a
  chat log is a verdict this project will lose, and has.
- E9. Before launching a multi-agent workflow, agree the plan with the owner: how many agents
  and how many antagonists (adversarial checkers) the problem needs. Default to three of each
  or fewer. Verifiers work in batches: give each antagonist one lens and the whole finding
  list, never one agent per finding. Review agents only read; they never edit files.

## Before any beta is pushed

Re-check every **sentence** the child can meet, as well as every word. A sentence can pass
every mechanical gate and still be wrong: `tools/decodable.mjs` asks whether a child CAN
read one, and nothing asked whether a child SHOULD meet it until the owner refused
"My dad can pat me." on 2026-08-13 with two words — *not appropriate*. Every word in it was
taught, the level was right, the audio was clean. A sentence carries a meaning that none of
its words does. `tools/sentence-screen.mjs` is the gate: it refuses the shape the owner
refused (an adult subject, a verb of physical contact, the child as object) and it refuses
any sentence no person has read and named in its screened ledger. Being named there means
somebody read that sentence on that date. A new sentence is unshippable until they do.

Re-check every word the child can meet for child-appropriateness — the whole bank plus
every newly accepted word, not only the words added since the last check. A word is
refused if it carries a sexual, crude, violent or otherwise adult meaning or slang, and
the check covers plurals and near-misspellings a child could produce: "jug" is fine and
its plural is not, "crab" is fine and its plural is not. Owner-ruled 2026-08-07 after
"milt" reached a listening round: the first draft lists were screened, a later backfill
was not, and the owner caught it. Screening a list once is not screening the bank. The
exclusions are recorded in SPEC section 12.

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
- **READ-ONLY IS ABOUT EDITING, NOT ABOUT RUNNING, and that distinction costs something**
  (2026-08-24). A read-only agent still runs `npm run check`, `npx vitest`, the gauntlet's
  tools and the mutant runners to verify what it claims — which is exactly what makes its
  findings worth having. But two vitest runs share `node_modules/.vite`, two checks
  regenerate the same files, and the mutant runners rewrite tracked ones. Both of the random
  reds recorded in open fault AM happened while a council agent was running, and neither
  reproduced alone. So: **do not run `npm run check` or a gauntlet while an agent is
  working**, and do not launch an agent into a tree you are about to run one in. Wait for it,
  or accept that a red may be the collision rather than the code — which is the habit that
  makes a real red survivable, and the one this rule exists to prevent. The mutant runners
  already refuse each other through `.gauntlet.lock`; the check does not, and until it does
  this is a rule people keep rather than a gate that holds.
- **Verify the tree you commit, not the tree you checked.** If anything else
  can write, build the prospective commit as a tree object and run the check
  against that exact tree, the way the are/were shipping commit did. "The
  check was green when I ran it" is not the same claim as "the committed tree
  is green," and the gap between them shipped a red commit on 2026-08-19.
