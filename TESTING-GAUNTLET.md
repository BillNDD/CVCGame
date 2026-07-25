# Testing gauntlet — gate specification (G1–G12)

This document defines the quality gates for Word Quest. The owner reviews this document, not
every line of code. The gates are the contract. `npm run gauntlet` runs every automatic gate.
A change is complete only when the gauntlet is green.

This document obeys ASD-STE100 Simplified Technical English.

## Method

- This project uses constraint-based development. The gates prove behavior. Code review is
  secondary.
- The gates test the engine (`src/engine.js`, generated from `reference/word-quest.jsx`) and the
  standalone app (`app/`).
- The gates never change game behavior, the word bank, the feedback text, or the layout.

## Non-negotiable rules

1. Every assertion uses literal expected values. A test never reads the constant that it checks.
2. Every detector has a negative control. The control proves that the detector fails on the
   fault that it targets.
3. Never delete a test. Never delete a mutant. Never lower a threshold. Never add a skip to make
   a build pass.
4. `.claude/gate-baseline.json` holds the floor for each count. Raise a floor when a count
   grows. A gate fails if a count goes below its floor.
5. If a gate fails, fix the code. If the gate itself looks wrong, stop and tell the owner.
6. Do not edit generated files by hand. This applies to `src/engine.js` and to every file in
   `tests/generated/`.

## G1. Unit tests

- Location: `tests/engine.test.js`. Tool: Vitest. Command: `npm test`.
- Floor: 42 tests, all green. Key: `g1_unit_tests`.
- These tests exist. Extend them; do not rebuild them.

## G2. Property tests

- Location: `tests/properties.test.js`. Tool: Vitest with `fast-check`.
- Each property runs 1000 or more generated cases. Key: `g2_properties`, floor 10.
- Command: `npm test` (the file is part of the Vitest run).

The ten initial properties:

| # | Property |
|---|---|
| P1 | For every bank word and every lowercase a–z string: `chunkWord(w).join("")` equals `w`. |
| P2 | Every chunk is one letter, or is one of exactly: sh, ch, th, wh, ck, ng. No chunk has another length. |
| P3 | For any word state and any result sequence: `box` stays in the range 0 to 5 after every step. |
| P4 | After any single `applyResult` at session `n`: `dueAt` equals `n` plus the interval for the new box, and `dueAt > n`. |
| P5 | `attempts` grows by exactly 1 per call, and `correct + close + wrong` always equals `attempts`. |
| P6 | A first-ever correct result always sets `box` to exactly 3, from any starting state with `attempts` 0. |
| P7 | For any valid state: `buildSession` returns no duplicate words, and 20 words or fewer. |
| P8 | `buildSession` never serves a word more than one level above the current level. It serves next-level words only when no fresh current-level word remains. |
| P9 | For any valid state with a non-empty queue: the first word's box is the maximum box in the queue. |
| P10 | For arbitrary JSON-shaped input: `migrate` never throws, is idempotent, and its output survives `buildSession`, `applyResult`, and `buildMarkdown` without a throw. Every healed box is 0 to 5; the level is 1 to 7. |

## G3. Acceptance scenarios (Gherkin)

- Feature files: `features/*.feature`, written in domain language. The owner approves the feature
  files before any pipeline work starts.
- Pipeline: `tools/gherkin-parse.mjs` reads the feature files and writes the JSON IR to
  `tests/generated/acceptance-ir.json`. `tools/gen-acceptance.mjs` reads the IR and writes
  `tests/generated/acceptance.test.js`. Vitest runs the generated file.
- No person writes the executable tests by hand. The generator writes them from the IR.
- The gauntlet regenerates the IR and the tests, and fails if the output differs from the
  committed files. Key: `g3_scenarios`.

## G4. Acceptance mutation

- Tool: `tools/acceptance-mutants.mjs`. Command: `npm run test:acceptance-mutants`.
- The tool changes one example value in the IR, regenerates the tests, and runs them. The run
  must fail. A scenario that still passes does not read that value: it is a survivor.
- Floor: 0 survivors. Keys: `g4_acceptance_mutants`, `g4_survivors_max`.

## G5. Source mutation

- Tool: `tools/mutants.mjs`. Command: `npm run test:mutants`.
- Floor: 28 mutants, 0 survivors. Keys: `g5_source_mutants`, `g5_survivors_max`.
- This gate exists. Add mutants for new invariants; re-point moved anchors; never delete one.

## G6. Coverage and quality metrics

- Tool: Vitest coverage (v8 provider). Command: `npm run test:coverage`.
- Floors on `src/engine.js`: 95 percent lines, 90 percent branches. Coverage is a floor, not a
  goal. Keys: `g6_lines_min`, `g6_branches_min`.
- Quality checks, command `npm run lint:quality`:
  - Cyclomatic complexity per function: 15 or less, in `src/engine.js` and `app/src/**`.
  - File length: 600 lines or less for every source file. `reference/word-quest.jsx` is exempt.
    The handoff requires that file to stay one file.
  - Dependency cycles in `app/src` and `src`: exactly 0.

## G7. Interface measurements

- Tool: Playwright against the built app (`vite preview`). Command: `npm run test:ui`.
- Assert measurements and numbers. Never assert a screenshot. Key: `g7_interface_checks`.
- Required checks, each with literal values:
  - No page scroll in a session at viewport heights 430, 555, 720, and 950 px:
    `scrollHeight <= clientHeight` on the document at default text size.
  - The word's bounding box is identical across the ready, feedback, and retry phases.
  - The advance control rejects activation for 400 ms after feedback starts, then accepts it.
  - An adult result control does not fire at a 300 ms hold. It fires at a 550 ms hold.
  - The Enter key and the Space key fire an adult control directly, with no hold.
  - The exported timing constants equal 400 and 450 (literal values, checked as numbers).
  - The app serves a session offline after one online load.

## G8. Accessibility

- Tool: Playwright with `axe-core`. Command: `npm run test:a11y`. Key: `g8_checks`.
- Zero axe violations on the home, session, feedback, done, and grown-ups screens.
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
- The gate reads the child-facing strings from the generated engine and the app screens:
  1. The three feedback sentences equal the SPEC section 5 text, character for character.
  2. Child-facing copy never contains: wrong, bad, fail, failure, incorrect, error, oops, try
     harder. Adult-facing strip and settings copy is out of scope.
  3. The two tricky-word notes are present and exact.
  4. Speech strings never spell letter names and never contain single-letter tokens.
- Negative control: `node tools/copy-lint.mjs --self-test` injects one banned word and one
  changed sentence into a memory copy, and must report both.

## G12. Manual QA procedure

- Location: `docs/qa-procedure.md`. A numbered manual script for a person with a device.
- Each step has an action and an "Expected:" line. The gauntlet checks the structure: 20 steps
  or more, every step with an expected result. Key: `g12_qa_steps`.

## Aggregation

- `npm run gauntlet` runs, in order: G11, G1+G2+G9+G10 (one Vitest run), G3 regeneration check,
  G4, G5, G6, build, G7, G8, G12 structure check, and the baseline comparison.
- CI: `.github/workflows/gauntlet.yml` runs the same command on every push and pull request.
- The gauntlet prints one line per gate: name, command, pass or fail, and the counts.
