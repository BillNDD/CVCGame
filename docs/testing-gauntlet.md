# Testing gauntlet — gate specification (G1–G12)

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

## G1. Unit tests

- Location: `tests/engine.test.js`. Tool: Vitest. Command: `npm test`.
- Floor: 42 tests, all green. Key: `g1_unit_tests`.
- These tests exist. Extend them; do not rebuild them.

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
| P8 | `buildSession` never serves a word more than one level above the current level. A next-level word in the session implies that no fresh current-level word remains. The converse is not required. |
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
  committed files. Key: `g3_scenarios`.
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
- Floor: 28 mutants, 0 survivors. Keys: `g5_source_mutants`, `g5_survivors_max`.
- This gate exists. Add mutants for new invariants; re-point moved anchors; never delete one.

## G6. Coverage and quality metrics

- Tool: Vitest coverage (v8 provider). Command: `npm run test:coverage`.
- Floors on `src/engine.js`: 95 percent lines, 90 percent branches. Coverage is a floor, not a
  goal. Keys: `g6_lines_min`, `g6_branches_min`.
- Quality checks, command `npm run lint:quality`. Keys: `g6_complexity_max`,
  `g6_file_lines_max`, `g6_dependency_cycles_max`.
  - Cyclomatic complexity per function: 15 or less, in `src/engine.js` and `app/src/**`. The
    counter is the ESLint `complexity` rule with its default counting.
  - File length: 600 lines or less for every source file. `reference/word-quest.jsx` is exempt.
    That file must stay one file, so it can run as a chat artifact.
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
- At 200 percent text size, the stage scrolls and no content is clipped: every element's visible
  box stays inside the viewport or inside a scroll container.
- With reduced motion emulated: zero running animations and zero transitions on every screen.

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

- Location: `tests/safety.test.js` and Playwright checks inside `npm run test:ui`.
- Each rule in `CLAUDE.md` becomes at least one failing-by-default test. Key: `g10_safety_tests`.
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
| Any browser, reduced motion | No animation |

## Aggregation

- `npm run gauntlet` first regenerates `src/engine.js` with the extractor. Every new script
  that needs the engine chains the extractor itself; the npm `pretest` hook covers `npm test`
  only.
- It then runs, in order: G11, G1+G2+G9+G10 (one Vitest run), G3 regeneration check,
  G4, G5, G6, build, G7, G8, G12 structure check, and the baseline comparison.
- The runner is `tools/gauntlet.mjs`. Run `npm run gauntlet`.
- CI: `.github/workflows/gauntlet.yml` runs the same command on every push and pull request.
- The gauntlet prints one line per gate: name, command, pass or fail, and the counts.
- Bootstrap: the floor for a gate that is not built yet starts at 0. Raise it in the same
  commit that lands the gate. A landed gate never keeps a 0 floor.
