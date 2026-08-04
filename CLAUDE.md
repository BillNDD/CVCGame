# Rules for this repository

These rules bind every change, human or agent. "What counts as finished work" below defines
what may be called done. `docs/testing-gauntlet.md` defines the gates that enforce them. SPEC.md is the master source for behavior. `docs/settled.md` is the standing record
of questions a listener or a measurement has already closed — read it before voice, audio or
word-bank work, and before designing a listening round (E10).

This document follows the Microsoft Writing Style Guide.

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
(G17): SPEC.md, CLAUDE.md, AGENTS.md, README.md, CHANGELOG.md, the documents in `docs/`,
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
round, recorded in the word's row of `tools/voice-words.csv`), microphone fairness
(`ADULT_JUDGED`), true offline behavior (the QA script on a real device), and whether a
pre-reader can use the screen (judged in the app beside the printed word, never only as a
bare clip), a green script is not enough. G13 is this rule's gate for the voice — it
refuses any recipe no person heard — and the QA script owns device proof. This game
teaches CVC reading and will never contain math; an earlier draft of this rule mentioned
"math grading" in error.

State the finish line when you start. Before implementing, write what done means for the
task — the real behavior the child gets, and the specific check or evidence that will
prove it — in the commit message or the task entry, never in a new file. Hold the task to
that definition.

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
  stays on the device. Two exceptions, each a request to the app's own host that carries no
  data, and nothing else may use them: when an adult taps "Check for updates" in the
  "Grown-ups corner", the app makes one request to compare versions; and when the app
  returns to the foreground, it may ask the browser to look for a newer service worker —
  approved by the owner on 2026-08-03 on the condition that the "Grown-ups corner" states
  it in plain words and offers a switch that turns it off, and Off means zero requests. A
  newer version found either way installs and waits; it never applies over an open page.
- S7. Child controls are 56 px or more. Adult controls are 44 px or more.
- S8. Multi-letter units always show as one tile: the spoken digraphs (sh, ch, th, wh, ck,
  ng), qu, the silent-letter pairs (kn, wr, mb), and the doubled endings (ll, ss, ff, zz).
  Owner-approved 2026-08-04 with Levels 8 and 9; ph was considered and left out because no
  word obeys the bank's own rules.
- S9. No file in the repository contains a personal name. The child's name is a device-local
  setting only.

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
  That limit is 900 lines. The owner raised it from 600 on 2026-07-29; only the owner can move
  a ceiling, and a file approaching one should be split instead.
- E7. Run `npm run check` before every push: the full test suite plus the sub-minute gates
  (copy, doc-truth, QA count, voice pack, governing files), about a minute. A red check blocks the change.
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
  bank, and before designing a listening round. It lists what a listener or a measurement has
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
