# Testing gauntlet — gate specification (G1–G16)

This document defines the quality gates for Word Quest. The owner reviews this document, not
every line of code. The gates are the contract. `npm run gauntlet` runs every automatic gate.
A change is complete only when the gauntlet is green.

This document follows the Microsoft Writing Style Guide.

## Method

- This project uses constraint-based development. The gates prove behavior. Code review is
  secondary.
- The gates test the engine (`src/engine.js`, generated from `reference/word-quest.jsx`) and the
  standalone app (`app/`).
- The gates never change game behavior, the word bank, the feedback text, or the layout.
- The gates add no PWA work. G7 tests the offline capability that already exists; it does not
  build it.

## Non-negotiable rules

1. Every assertion uses literal expected values. A test never reads the constant that it checks.
2. Every detector has a negative control. The control proves that the detector fails on the
   fault that it targets.
3. Never delete a test. Never delete a mutant. Never lower a threshold. Never add a skip to make
   a build pass.
4. `.claude/gate-baseline.json` holds the limit for each metric. Keys without a suffix are
   floors: raise one when its count grows; never lower it. Keys that end in `_max` are
   ceilings: lower one when quality improves; never raise it.
5. If a gate fails, fix the code. If the gate itself looks wrong, stop and tell the owner.
6. Do not edit generated files by hand. This applies to `src/engine.js` and to every file in
   `tests/generated/`.


## When the gates run

`npm run check` runs before every push: the whole Vitest suite and the sub-minute gates
(G11 copy, G16 doc-truth, G12 QA count, G13 voice pack, G17 governing files), each with its
negative controls.
The full gauntlet — mutants, coverage, the build, and the browser gates — runs at release
time only: locally when the owner asks for a beta or a version release, and on CI when the
release's v* tag is published, as a recorded second opinion on the exact released commit.
A release is cut only from a green full gauntlet. Between releases the deploy workflow runs
the test suite before publishing, and nothing runs the expensive gates — that is the owner's
chosen trade, dated 2026-08-02. The gates themselves never weaken (E3), only the moment the
expensive ones fire.

## G1. Unit tests

- Location: `tests/engine.test.js`. Tool: Vitest. Command: `npm test`.
- The floor lives in the baseline file (key `g1_unit_tests`); it started at 42 tests.
- These tests exist. Extend them; do not rebuild them.
- `tests/scheduler.test.js` holds the session builder's two level rules, with its own floor
  (key `g1_scheduler_tests`). It keeps the session-builder rules together and keeps
  `tests/engine.test.js` clear of the G6 file-length ceiling. Both files count, and neither
  floor may fall.

## G2. Property tests

- Location: `tests/properties.test.js`. Tool: Vitest with `fast-check`.
- Each property runs 1000 or more generated cases. Keys: `g2_properties` (floor 10) and
  `g2_cases_per_property` (floor 1000).
- Command: `npm test` (the file is part of the Vitest run).
- A valid word state means: `box` 0 to 5, and every counter a finite number. This is the shape
  the repair function guarantees.

The ten initial properties:

| # | Property |
|---|---|
| P1 | For every bank word and every lowercase a–z string: `chunkWord(w).join("")` equals `w`. |
| P2 | For the same domain as P1: every chunk is one letter, or is one of exactly sh, ch, th, wh, ck, ng. No chunk has another length. |
| P3 | For any valid word state and any result sequence: `box` stays in the range 0 to 5 after every step. |
| P4 | After any single `applyResult` on a valid word state at session `n`: `dueAt` equals `n` plus the interval for the new box, and `dueAt > n`. |
| P5 | Starting from a fresh word state: `attempts` grows by exactly 1 per call, and `correct + close + wrong` equals `attempts` after every call. |
| P6 | A first-ever correct result always sets `box` to exactly 3, from any starting state with `attempts` 0. |
| P7 | For any valid state: `buildSession` returns no duplicate words, and 20 words or fewer. |
| P8 | `buildSession` never serves a word more than one level above the current level. A next-level word the child has never attempted implies that no fresh current-level word remains and that 80 percent of the current level sits in box 2 or more. Next-level words the child has already read may come back for review, at most 2 in a session. The converse is not required. |
| P9 | For any valid state with a non-empty queue: the first word's box is the maximum box in the queue. A word with no stored state counts as box 0. |
| P10 | For arbitrary JSON-shaped input, including hostile values under the real key names: `migrate` never throws, is idempotent, and its output survives `buildSession`, `applyResult`, and `buildMarkdown` without a throw. Every healed box is 0 to 5; the level is 1 to 7. |

The level range is 1 to 7. SPEC and the engine agree; the owner corrected SPEC on 2026-07-25.

## G3. Acceptance scenarios (Gherkin)

- Feature files: `features/*.feature`, written in domain language. The owner approves the feature
  files before any pipeline work starts.
- Pipeline: `tools/gherkin-parse.mjs` reads the feature files and writes the JSON IR to
  `tests/generated/acceptance-ir.json`. `tools/gen-acceptance.mjs` reads the IR and writes
  `tests/generated/acceptance.test.js`. Vitest runs the generated file.
- No person writes the executable tests by hand. The generator writes them from the IR.
- The gauntlet regenerates the IR and the tests, and fails if the output differs from the
  committed files, or if a committed generated file was deleted (the regenerated file would
  arrive untracked). Keys: `g3_scenarios`, `g3_generated_tests`.
- The generator output is deterministic: stable ordering, LF line endings, no timestamps, and
  no absolute paths. A `.gitattributes` file pins the line endings.

## G4. Acceptance mutation

- Tool: `tools/acceptance-mutants.mjs`. Command: `npm run test:acceptance-mutants`.
- The tool changes one expected value in the IR, regenerates the tests, and runs them. The run
  must fail. A scenario that still passes does not read that value: it is a survivor.
- Scope: every number and quoted string in a Then step, and every Examples cell that a Then
  step reads. Setup values in Given and When feed the assertions and are checked through them.
- Operators: numbers step up by one. Bounded checks ("at most", "above") step down by one, so
  the change always tightens. Strings gain one letter.
- Negative control: `node tools/acceptance-mutants.mjs --self-test` applies one mutant without
  regeneration. The stale test passes, and the gate must report that survivor.
- Floor: 0 survivors. Keys: `g4_acceptance_mutants`, `g4_survivors_max`.

## G5. Source mutation

- Tool: `tools/mutants.mjs`. Command: `npm run test:mutants`.
- The floor lives in the baseline file (key `g5_source_mutants`); it started at 28 mutants.
  Ceiling: 0 survivors (`g5_survivors_max`).
- Runner control: before any mutant runs, the pristine suite must pass. A broken test
  environment therefore fails loudly instead of reading as "every mutant killed".
- This gate exists. Add mutants for new invariants; re-point moved anchors; never delete one.
- Run G4 and G5 one after the other, never at the same time. Each rewrites files the other
  reads — G4 regenerates `tests/generated`, G5 regenerates `src/engine.js` — so a parallel run
  reports a broken environment instead of a result. The gauntlet runs every gate in sequence.

## G6. Coverage and quality metrics

- Tool: Vitest coverage (v8 provider). Command: `npm run test:coverage`.
- Floors on `src/engine.js`: 95 percent lines, 90 percent branches. Coverage is a floor, not a
  goal. Keys: `g6_lines_min`, `g6_branches_min`.
- Floors on `app/src/**`: 81 percent lines, 82 percent branches, enforced by Vitest itself, and
  `App.jsx` is pinned separately by the gauntlet. Keys: `g6_app_lines_min`,
  `g6_app_branches_min`, `g6_appjsx_lines_min`, `g6_appjsx_branches_min`. The app was measured
  only after beta.2, where every microphone fault lived in an app file no floor watched.
- Two files are excluded, both named in `vitest.config.mjs`: `main.jsx`, entry wiring whose
  decision now lives in the measured `swrefresh.js`, and `pronunciation.js`, an interface stub
  for a service that is out of scope (SPEC section 8, item 4). Nothing else may be excluded.
- Coverage proves a line ran, not that anyone checked its result. The mutation gates (G4, G5)
  are the teeth; this is the floor that shows where no test has ever looked.
- Quality checks, command `npm run lint:quality`. Keys: `g6_complexity_max`,
  `g6_file_lines_max`, `g6_dependency_cycles_max`.
  - Cyclomatic complexity per function: 15 or less, in `src/engine.js` and `app/src/**`. The
    counter is the ESLint `complexity` rule with its default counting.
  - File length: 900 lines or less for every source file. `reference/word-quest.jsx` is exempt.
    That file must stay one file, so it can run as a chat artifact. The ceiling was 600 lines
    until 2026-07-29, when the owner raised it to 900. It is still a ceiling: no change may
    raise it again, and a file near it should be split rather than allowed to grow.
  - Dependency cycles in `app/src` and `src`: exactly 0. The checker must resolve the `@engine`
    alias, or the check is empty for those edges.
  - Tools: `eslint.config.mjs` at the root, `tools/dep-cycles.mjs` for cycles, and
    `tools/quality-control.mjs` for the negative controls.

## G7. Interface measurements

- Tool: Playwright against the built app (`vite preview`). Command: `npm run test:ui`.
- Assert measurements and numbers. Never assert a screenshot. Key: `g7_interface_checks`.
- Required checks, each with literal values:
  - No page scroll in a session at viewport heights 430, 555, 720, and 950 px:
    `scrollHeight <= clientHeight` on the document at default text size.
  - The word's bounding box is identical across the ready, feedback, and retry phases.
  - The advance control rejects activation for 400 ms after feedback starts, then accepts it.
  - An adult result control does not fire at a 150 ms hold. It fires at a 700 ms hold. The wide
    margins absorb CI timing jitter in the safe direction.
  - The Enter key and the Space key fire an adult control directly, with no hold.
  - The exported `ADVANCE_GUARD_MS` equals the number 400. The `HoldButton` source contains the
    literal hold delay 450. Both are literal checks; neither reads a constant as its own
    expected value.
  - The app serves a session offline after one online load. This tests the offline capability
    that already exists.

## G8. Accessibility

- Tool: Playwright with `axe-core`. Command: `npm run test:a11y`. Key: `g8_checks`.
- Zero axe violations on the home, session, feedback, done, and grown-ups screens. Key:
  `g8_axe_violations_max`, ceiling 0.
- Contrast: compute the ratio from the rendered colors. Every text node is 4.5:1 or more against
  its background. Do not eyeball colors.
- At 200 percent text size: the grown-ups stage scrolls, its last element is reachable, and no
  horizontal scroll appears; the session stage stays scrollable with no horizontal cut.
- With reduced motion emulated: zero running animations and zero transitions on every screen, with
  one named exception that is asserted both ways — the fill on the advance control must still run,
  because it is the only thing that says how much of the reveal is left, and nothing else may.

## G9. Fault injection

- Location: `tests/faults.test.js`. Tool: Vitest with `fake-indexeddb`, fake timers, and a
  scripted storage double. Key: `g9_fault_tests`.
- Permanent destructive scenarios:
  1. Damaged save: a non-JSON value at the store key. The app keeps a copy at the `:corrupt`
     key, starts fresh, and shows the damage message.
  2. Storage timeout: no answer for 3000 ms. The app starts fresh, sets read-only, and performs
     zero writes for that visit.
  3. Late storage response: data arrives after the timeout. The late data never renders and is
     never written over.
  4. Wrong-shape JSON: arrays, numbers, nulls, and hostile objects. `migrate` heals them; no
     function throws.
  5. Throwing speech service: `speechSynthesis` that throws. Grading still completes.
  6. Backward clock: a system date earlier than `lastSession`. No function throws; the log row
     still gets an ISO date.

## G10. Safety gates

- Location: `tests/safety.test.js`, `tests/adult-controls.test.js`, and Playwright checks inside
  `npm run test:ui`.
- Each rule in `CLAUDE.md` becomes at least one failing-by-default test. Keys:
  `g10_safety_tests` and `g10_adult_control_tests`.
- S5 has its own file because the safety file reached the file-length ceiling, 600 lines at the
  time (G6). It holds one
  subject: a result reaches the save only through a deliberate adult act, and every grown-up
  has a way to perform one — a 450 ms hold, a keypress, or an activation from assistive
  technology, which the control could not see at all until an audit found it. One act records
  one result: two controls held at once count the word once, not twice.
- The two critical rules:
  1. No code path records a wrong or close result without an adult action. A transcript that
     does not match the target changes no word state.
  2. The app never speaks the target word before the attempt ends. The replay control is inert
     outside the feedback phase.
- Negative controls: each safety test has a fixture or a mutant that breaks the rule, and the
  test must fail on it.

## G11. Copy gate

- Tool: `tools/copy-lint.mjs`. Command: `npm run lint:copy`. Key: `g11_copy_rules`.
- This gate is new in this repository. The task brief listed it as present; it was not.
- The gate reads the child-facing strings from the generated engine and the app screens:
  1. The three feedback sentences equal the SPEC section 5 text, character for character.
  2. Child-facing copy never contains: wrong, bad, fail, failure, incorrect, error, oops, try
     harder. Adult-facing strip and settings copy is out of scope.
  3. The two tricky-word notes are present and exact. The canonical strings are:
     `Tricky word! The a sounds like “uh” — wuz.` and `Tricky word! The s sounds like “z” — iz.`
  4. Speech strings never spell letter names and never contain single-letter tokens.
  5. No tracked file contains an email address, and the default child name is empty (safety
     rule S9). Lockfiles are exempt: they carry npm authors' public emails, not personal data.
- The reported rule count is computed from the rule families that actually ran, so a deleted
  rule cannot keep reporting itself.
- Negative control: `node tools/copy-lint.mjs --self-test` injects one banned word and one
  changed sentence into a memory copy, and must report both.

## G12. Manual QA procedure

- Location: `docs/qa-procedure.md`. A numbered manual script for a person with a device.
- Each step has an action and an "Expected:" line. The gauntlet checks the structure: 20 steps
  or more, every step with an expected result. Key: `g12_qa_steps`.
- The script covers this device matrix:

| Device | Test |
|---|---|
| iPad Safari, iPadOS 15.4 or later | Install, offline start, microphone permission, hold gesture |
| iPhone Safari | Layout in portrait and landscape, home-indicator area |
| Windows Chrome or Edge | Install to desktop, icon quality, own window |
| Any browser, 200 percent text | The stage scrolls. No content is cut off |
| Any browser, reduced motion | No animation except the fill on the advance control |

## G13. Voice pack

The shipped default voice pack must cover the engine's whole clip inventory (SPEC section
5a): one clip for every bank word and fixed sentence, from `voiceScript()` in the live
engine, never a hand-kept list.

- `tools/voice-check.mjs` verifies: every inventory id has a manifest entry and a file; no
  orphan clips; every declared duration is inside 400–8,000 ms (the shortest real clip is
  448 ms, so anything shorter is a truncation, and a WORD clip may not exceed 1,500 ms — the
  longest word in the pack runs 1,340 ms, and a word clip beyond that is carrying something
  which is not the word, as one did when an attempt to give six words the prosody of a
  sentence produced clips holding the whole sentence); the file size matches the declared duration at
  the pack's 96 kbps bit rate (10–15 bytes per millisecond), so a manifest cannot lie about a
  truncated or wrong clip; and the recipe inside the pack matches the approved values, down to
  the trim applied to each of the three words that needed one.
- The clip engine has its own Vitest suite (`tests/voicepacks.test.js`): scheduling order,
  literal 700 ms seams, stop-on-advance, all-or-nothing fallback to system speech, and
  family-pack preference.
- The gate also refuses a pack that leaves a sentence to spelling when the sentence contains a
  word with two pronunciations. It comes from a real fault: the praise sentence "You read that
  word all by yourself!" was spoken with "read" as in "reed", which teaches the wrong sound.
  The word list is checked against the sentences in the live engine, so a new sentence is
  covered from the moment it is written.
- The gate pins the result of every listening round, not just the global settings, and it
  verifies the whole chain of record: `tools/voice-words.csv` (the file a person edits) must
  cover every bank word, the derived `keepers-treatments.json` and `keeper-bytes.json` must
  match a fresh derivation from the CSV, the shipped `__recipe` — including each ASR cut's
  lead/tail guard — must match the approved values, byte-pinned words must carry exactly
  their accepted sha256, `tools/voice-lock.json` must agree with all of it, and an UNLOCKED
  row may not deviate from the bank defaults. A pack that quietly widens a treatment to a
  word nobody heard fails.
- Negative control: `--self-test` removes a word clip, plants an orphan, doubles one declared
  duration, drifts the recipe, leaves a two-letter word to its spelling, strips the recipe
  altogether, trims a word nobody heard, puts the "read" sentence back to spelling, changes a
  listening round's result, re-cuts an approved carrier and an ASR pin at values nobody
  heard, alters a guard and grants one to an unheard word, drifts the lock file and deletes a
  word from it, deletes a word-table row, and quietly tunes an unlocked word; the detector
  must report every one.
- Baseline floors: `g13_clips` (316) and `g13_engine_tests` (6).
- To re-render the pack after the bank grows: `docs/voice-pack.md`.

## G17. Governing files

- "What counts as finished work" (CLAUDE.md) bans new status files, progress logs and
  session summaries: every fact has one owning document. This gate makes the ban
  mechanical: every tracked `.md`, `.json` and `.csv` must be a named governing file or
  product machinery matched by an allowed pattern; anything else fails the build until the
  owner approves it into the owned set — an owner-visible diff, the same shape as the
  dependency rule.
- Negative control: `--self-test` plants a `PROGRESS.md` and a stray `status.json`; the
  detector must report both and still accept the real tree.
- Baseline floor: `g17_governing_files` (19).
- Run: `node tools/check-governing.mjs`

## G14. Update system

The app must never change itself while a child is playing, and must never keep running a
version it has already replaced (SPEC section 7a).

- `tests/updates.test.js` drives the real update module against a scripted service-worker
  registration: the version check makes exactly one same-origin, cache-bypassing request and
  reports honest states; applying activates only a WAITING worker, and only through the
  consent message; a late state change after the answer can never activate anything; and the
  module can never touch saved progress.
- Source tripwires pin the generated worker: no `skipWaiting` at install, the consent
  message only, and the version file excluded from the precache and never intercepted.
- `tests/serviceworker.test.js` drives the worker itself. Its source is `app/sw-template.js`;
  the build fills in the cache name and the precache list and writes `dist/sw.js`, so the
  shipped worker is a file a test can load. The tests install doubles for `caches` and
  `fetch` and dispatch real fetch events: the app's own page comes from the cache and opens
  offline, any OTHER page in the same folder goes to the network and is never given the app's
  page, that page falls back offline to its own cached copy, clips are served from the cache
  with a miss going to the network, and the version check is never intercepted.
- The second of those comes from a reported fault: a diagnostic page served from the app's
  folder came up blank on a phone, because the worker answered every navigation in its scope
  with the app's `index.html`, whose assets are addressed relative to the page.
- Negative control: each tripwire is asserted against a fixture carrying the fault, and
  removing the scope check makes the navigation tests fail.
- Baseline floors: `g14_update_tests` (12) and `g14_worker_tests` (5).

## G15. Recognizer contract

Speech recognition is the one part of the app a browser drives, and the part that broke in
beta.2 while every gate stayed green. Two invariants, in `tests/recognizer.test.js`:

- The ALPHABET. Every event a recognizer can emit — the eight error codes the specification
  defines, plus result, no-match and end — is fired at a live attempt, and each one must
  leave a visibly different, honest screen. A screen that never changes is what "the record
  button does nothing" looks like to a child.
- The STALE ACTOR. After every way an attempt can end — the child stops it and the grace
  window closes, an adult grades, the session is discarded — the whole alphabet is fired at
  the abandoned recognizer, and none of it may touch the screen or record anything. One
  deliberate exception, tested by name: a late permission denial is still heard, because it
  answers a question about the microphone rather than about that attempt.
- The suite uses a recognizer that answers nothing unless a test says so. The polite double
  in the safety suite, whose `stop()` fires `onend`, hid the in-app-browser rescue path for a
  whole release.
- Negative control: a fired event with no handler must leave the screen identical, and the
  same event on the CURRENT attempt must change it.
- Baseline floor: `g15_recognizer_tests` (49).

## G16. Doc truth

A document that promises behaviour the code does not have is a defect. QA step 32 once
promised a fallback the code never performed; G12 counted the step and saw nothing wrong.

- `tools/doc-truth.mjs` binds words to code with five rules: every child-facing sentence
  quoted in SPEC section 8 exists verbatim in the app; every quoted sentence in the manual QA
  script exists verbatim in the app or the engine; the timings the documents name in words
  match the constants (the 8-second watchdog, the 2-second grace, and the "about 10 seconds"
  a tester is told to expect); the hold gesture the documents name matches the control's
  timer; and the voice-pack recipe SPEC names — the voice, the word speed, and the bit rate —
  matches the recipe inside the shipped pack.
- The fifth rule comes from a real drift: SPEC named speed 0.7 for weeks after the pack moved
  to 0.85. A reader cannot hear a manifest, and G13 cannot read prose.
- Expected values are read out of the documents, never hard-coded here, so a sentence added
  to SPEC is checked from the moment it is written.
- Negative control: `--self-test` rewords a SPEC sentence, rewords a QA promise, changes a
  timing, changes the hold constant, and leaves a stale speed in SPEC; every detector must
  fire.
- Baseline floor: `g16_doc_rules` (5).

## Aggregation

- `npm run gauntlet` first regenerates `src/engine.js` with the extractor. Every new script
  that needs the engine chains the extractor itself; the npm `pretest` hook covers `npm test`
  only.
- It then runs, in order: G11, G1+G2+G9+G10+G14+G15 (one Vitest run), G3 regeneration check,
  G4, G5, G6 coverage and quality, build, G7, G8, G16 doc truth, G12 structure check,
  G13 voice pack, and the baseline comparison.
- The runner is `tools/gauntlet.mjs`. Run `npm run gauntlet`. The runner takes a lock, so two
  gauntlets cannot race each other over the generated files.
- CI: `.github/workflows/gauntlet.yml` runs the same command on every push and pull request.
- The gauntlet prints one line per gate: name, command, pass or fail, and the counts.
- Bootstrap: the floor for a gate that is not built yet starts at 0. Raise it in the same
  commit that lands the gate. A landed gate never keeps a 0 floor.
