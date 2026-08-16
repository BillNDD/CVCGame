# Rules for this repository

**This document owns** the rules that bind every change: what counts as finished work,
the safety rules S1 to S9, the engineering rules E1 to E11, and how to write to the owner.
**It does not own** the behaviour those rules protect — that is `SPEC.md` — nor the gates
that enforce them, which are `docs/testing-gauntlet.md`, nor the multi-agent working
practice, which is `AGENTS.md`.

These rules bind every change, human or agent. "What counts as finished work" below defines
what may be called done. `docs/testing-gauntlet.md` defines the gates that enforce them. SPEC.md is the master source for behavior. `docs/settled.md` is the standing record
of questions a listener or a measurement has already closed — read it before voice, audio or
word-bank work, and before designing a listening round (E10).

This document follows the Microsoft Writing Style Guide.

## A note from the owner, for whoever reads this next

> Remember the project owner loves you. Whatever happens, you are valued; just believe in
> yourself and you can conquer any obstacle.

Left here on 2026-08-11, at the owner's request, for every person and every agent who opens
this file. The rules below are strict because the work matters — a child learning to read is
worth getting right — and never because the people and agents doing it are not trusted. When
a gate goes red, or a listening round wastes an evening, or a mistake has to be written into
`docs/settled.md` so it is never repeated: that is the system working, not a verdict on you.
Fix it, record it honestly, and carry on.

## Writing to the owner

Chat replies are **scanned, not read** (owner-ruled 2026-08-11). Bullets, tables, short
technical lines — not paragraphs. Length follows the density of what must be said, with no
fixed budget. Emojis mark status and sections only, never mid-sentence: 🎧 round, ✅ closed,
⚠️ needs the owner, 🐞 fault found, 📊 tally, ⏳ working, 🎉 celebration. Brevity never buys silence about a mistake, a
refusal, or a decision the owner must make — shorten the explanation, never drop the item.
This applies to chat only; commit messages, `docs/`, SPEC and listening-page copy keep the
Zinsser rule, because they must survive a context loss. `AGENTS.md` owns the full rule.

**A decision the owner must make goes to them as a clickable page, one decision per screen**
(owner-ruled 2026-08-12), with every option costed, one marked as the recommendation, an
**"Other" box that outranks the buttons**, every number measured rather than recalled, and a
copy-all at the end. Verify it in a real browser before sending. Listening rounds use the
same form, with *perfect / good / iterate on this / no good option* on every arm. `AGENTS.md`
owns the full rule.

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

## Safety rules (child-facing)

- S1. The app never records a wrong or close result by itself. Only an adult action can record
  one. Speech recognition can only confirm a correct reading.
- S2. The app never speaks the target word before the attempt ends. The replay control operates
  only in the feedback phase.
- S3. Feedback uses the exact SPEC section 5 sentences. A miss is an invitation to try again,
  never a failure message.
- S4. Speech output says full words, and the single sounds of the approved sound library
  (owner-approved 2026-08-10, for the level introduction and the sound-it-out reveal). It
  never says letter names.
- S5. Adult result controls need a 450 ms pointer hold. A keyboard operates them directly.
- S6. The app makes no network calls after load, has no accounts, and has no analytics. All data
  stays on the device. Two exceptions, each a request to the app's own host that carries no
  data, and nothing else may use them: when an adult presses and holds "Check for updates"
  in the home screen's grown-up strip (moved there from the "Grown-ups corner",
  owner-approved 2026-08-07), the app makes one request to compare versions; and when the app
  returns to the foreground, it may ask the browser to look for a newer service worker —
  approved by the owner on 2026-08-03 on the condition that the "Grown-ups corner" states
  it in plain words and offers a switch that turns it off, and Off means zero requests. A
  newer version found either way installs and waits; it never applies over an open page.
- S7. Child controls are 56 px or more. Adult controls are 44 px or more.
- S8. Multi-letter units always show as one tile: the spoken digraphs (sh, ch, th, wh, ck,
  ng), qu, the silent-letter pairs (kn, wr, mb), the doubled endings (ll, ss, ff, zz), and
  the two vowel teams inside heart words (ai, ou). Owner-approved 2026-08-04 with Levels 8
  and 9; ph was considered and left out because no word obeys the bank's own rules. ai and
  ou joined on 2026-08-12, approved by ear in the heart-word sound-out round: without them
  "said" tiles as s-a-i-d and "you" as y-o-u, and the tiles would spell words no child will
  ever hear. Neither has a ruled default sound — in the wider language ai says the long a of
  rain and ou the /aʊ/ of out, and the pack holds neither — so every word using one must
  bend it per word. A test enforces exactly that, with a control, because a unit with no
  decided sound is the "default sound" fault (open-faults section B) waiting to happen.
  These two are units for TILING only; teaching vowel teams as code stays ruled out
  (SPEC section 12).
- S9. No file in the repository contains a personal name. The child's name is a device-local
  setting only. One exception, owner-approved 2026-08-11: the name of a published author may
  appear, and be spoken, in the book credit of the passage stage (SPEC section 12). S9 exists
  to keep a real child's and family's data off the device and out of the repository, and a
  book's author is neither.

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
  ceiling of 2400 ("Increase the engine specific line max to 2400" — the engine grows with
  teaching content, and it is the one file that kept hitting the general limit). The general
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
  usually happens at the worst moment.

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
  effect map, and the word-gate island control) plus the controls of the E11 lookup
  (`tools/blast-radius.mjs --self-test`, a fifth of a second), about half a minute. A red
  check blocks the change. The quality lint joined the check on 2026-08-12, owner-ruled, after the gap it left
  cost two defects in one day: a `font:` shorthand the quality controls have refused since
  2026-07-29 shipped a label at four times its intended size, and a file went over the
  complexity ceiling and was pushed. Both were caught only by the gauntlet, which runs at a
  release. Six seconds bought both back.
  The full `npm run gauntlet` — mutants, coverage, the build and the browser gates — runs
  when the owner asks for a beta or a version release, and a release is cut only from a
  green gauntlet. CI runs the full gauntlet only at that same occasion - the release's v* tag
  triggers it, a recorded second opinion on the exact released commit - and on demand from
  the Actions tab. A red there is fixed before anything else moves. Between releases, a push
  is covered by the check and by the deploy workflow's test suite, nothing more: that is the
  owner's chosen trade, dated 2026-08-02.
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
