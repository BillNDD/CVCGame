# The art project — the council, the plan, and where it stands

**This document owns** the art project: how its council of three works, the owner's
rulings that shape it, every step in order with what each breaks and what "done" means,
and the council's verdict on each step as it lands.
**It does not own** the visual rules themselves (`docs/art-bible.md`, and SPEC.md once a
rule becomes behaviour), the safety rules (CLAUDE.md), the
gates (`docs/testing-gauntlet.md`), or any asset's provenance once the ledger exists
(`tools/art/provenance.json`). It is a work plan, kept for the duration of the project so
that a context loss loses nothing, and deleted when the project lands.

Created 2026-08-22 at the owner's instruction, after the art bible was read against the
repository and ruled on the same day.

This document follows the Microsoft Writing Style Guide.

## How the council works (owner-ruled 2026-08-22)

The owner's words: "a council of three read only context independent agents who work with
you through the project and act in expert roles you suggest (one being digital art
expert). For every step of the art design and implementation process they do a before
pass and give you suggestions and they do an after pass you do your work to judge if your
work is satisfactory." Confirmed the same day: the council also judges and rules after
each step.

The three chairs:

1. **Digital art director** — pixel construction, palette and material, responsive art
   pipelines, export, the bible's originality gate and provenance.
2. **Early-reading and accessibility specialist** — synthetic phonics and what a
   four-to-seven-year-old attends to; the child reads first; no answer in the art; fixed
   word geometry; contrast, reduced motion, target sizes, screen readers.
3. **Engineering antagonist** — what each change breaks (E11), honesty (E3 to E5), drift
   (G16, G20, G23), the S6 install budget, and whether a new gate measures what it claims.

The rules:

- **Read only, context independent.** Every pass is a fresh agent with no memory of an
  earlier one (E9). It gets the bible, the rulings, this document, the step's brief and —
  for an after pass — the diff. It reads the repository and never edits it.
- **Before pass.** Each chair returns numbered suggestions, each with what, why (a file
  and line or a bible section) and a measurable "done", and names the three things it
  would refuse to let ship. The implementer answers every suggestion in the step's commit
  message: taken, or declined with the reason. Silence is not an answer.
- **After pass.** Each chair receives the diff and the commit and returns a verdict:
  *satisfactory* or *not satisfactory*, with findings. **Any chair's "not satisfactory"
  with a named finding blocks the next step** until the finding is fixed and that chair,
  fresh, judges again — or the owner overrules in writing. The verdicts are recorded in
  the log below and in the commit that closes the step.
- **No chair writes code, tests, or documents.** A chair's suggestion becomes the
  implementer's change, judged by the gates like any other, and then by the council.
- **The gauntlet outranks the council.** A step the council calls satisfactory still ships
  only on a green check, and a beta only on a green gauntlet (E7). A step the council
  refuses does not ship on a green gauntlet either.

## The rulings that shape the work (owner, 2026-08-22)

From the review page, "The art bible, read against the game":

- **Visual proof:** geometry and invariant cells in the census (frame height, word
  position, a contrast-and-edge statistic, the guide absent); screenshot baselines only
  as a same-machine opt-in investigation, never a gate.
- **Install budget:** 12 MB for all art, 2× and 3× assets for every state and crop; a
  ceiling in the baseline that a gate enforces. Measured start: `app/dist` is 40 MB in
  1,490 files, 39 MB of it the voice pack.
- **Icons:** two steps — every control gets an aria-label without emoji and every
  locator moves to it, no visible change; then original icons screen by screen, text
  labels kept beside them. Measured: 35 distinct emoji, 77 uses in `app/src`; their labels
  are named in 104 places across 22 test, tool and document files.
- **State 10:** a new engine fact — the ladder is complete when the child is at level 100
  and its words are secure by the promotion rule; garden state is `floor((level − 1) / 10)`,
  10 when complete; in the reference build (E1) with tests and a mutant; SPEC section 7
  gains the line.
- **Who draws:** the implementer builds the gates, tokens, tiles, the Glowseed's wiring,
  the reveal screen and state 0 with placeholder geometry; art lands state by state as
  reviewed milestones; provenance is recorded per asset.

Amendments accepted with the review (the bible is followed except here): pixel-diff
baselines are not a gate; a stated byte budget replaces an unstated one; pixel art is
device-pixel-snapped on fractional-scale screens rather than "integer scales only"; the
principal word's `dvh` becomes `svh`; three bible tokens that fail the bible's own 3:1
boundary rule (tileEdge 2.40:1, line 2.47:1, disabled 2.10:1) are darkened before they are
typed into any file; the palette's one source stays `C` in the reference build.

## The steps, in order

Each step: what it changes, what it breaks (E11, named before the change), what done
means, then the council's before pass and after pass.

### Step 0 — gates and tokens, before any art (amended by the council, 2026-08-22)

The council's before pass returned 35 findings; the step below is the plan after them.
Each chair's findings and the answer to each are in the log at the end of this document.

- **0a Locators and names.** Every child control (`.wq-cta`, child `.wq-sbtn`,
  `.wq-btn-plain`) gets an aria-label equal to its visible text with the emoji removed; the
  adult hold controls lose the "(hold)" suffix from their accessible name (the keyboard and
  assistive technology never hold, S5 — the name was lying to the one user who hears it).
  Every locator in tests and tools moves to the label; a scan in `npm run check` refuses
  any emoji inside a locator string, with a planted control; the label-keyed detectors in
  the census (`GRADE`, `SOUND_ONLY`, the hold filter, the chooser's text) move with the sweep
  and a novelties-once control proves each key still resolves to exactly one control. The
  aria snapshot is regenerated and its diff must be names only. Breaks: `controls.spec`'s
  aria snapshot, `safety-splash` test 42, G7 and G8 name locators, the census. What a
  screen reader hears changes (bible 15.2): "Begin Session", not "▶️ Begin Session". Done:
  body text identical before and after on every census state; zero emoji in locators.
- **0b Tokens.** `C` in `reference/word-quest.jsx` gains the bible's tokens as ADDITIONS:
  the three names that already exist at other values (`action`, `line`, `amber`) enter as
  `actionBlue`, `boundary`, `amberFill`; a test pins the thirteen existing keys' literal
  values. The three tokens that failed the bible's own 3:1 are darkened first (`tileEdge`
  #8F6420 at 3.78:1 on tileFace, `boundary` #5F7493 at 4.68:1 on surfacePanel; `disabled`
  admitted as a fill under ink only, never an edge) and a literal test asserts every edge
  or boundary token at 3:1 or better. The CSS custom properties are emitted from
  `Object.entries(C)` inside `wq-css.js` (no new file; the sheet is already built from `C`),
  and the hex literals in the screens move to tokens with a quality control that refuses a
  new one. One prose owner of the token table: the bible's section 9 ruling, which
  doc-truth rule 11 binds to `C` by name and value, both directions, case-insensitive, at
  least 29 rows, with three planted faults; SPEC section 9 points to it instead of
  restating values. `dvh` becomes `svh` in the word AND the tiles AND the shell, in both
  copies of the stylesheet; a quality control refuses `dvh` in any font-size; the QA script
  gains the address-bar step on a real phone, because headless cannot tell svh from dvh.
- **0c Art budget.** `art_bytes_max` 12,582,912 over the tracked `app/public/art/**`
  (deterministic, identical on the runner and here, measurable in the check without a
  build) and `precache_files_max` 1,650 over the service worker's list (1,490 today; the
  census crashed a browser at a 1,500-file precache) — never a whole-dist ceiling, which
  the growing voice pack would spend. A gauntlet control after `app build` requires the
  built art to equal the source art byte for byte. Control: 13 MB planted in a scratch
  directory, never in `app/dist`.
- **0d Census cells.** Every cell refuses zero subjects. Real today, with their subjects:
  the frame cell in its first form (header + stage + rail heights equal the shell's on all
  eight profiles; control plants a 40 px static div); a non-reduced-motion cell (zero
  animations during an attempt; at most one sounding tile and one fill during a reveal;
  control plants a looping animation); the multi-letter tile wider than every single-letter
  tile in the reveal (control plants equal widths); the 200% cell (rem scaling AND zoom, at
  320 × 568, on the bank word of greatest rendered width, one line box, inside the viewport,
  font-size at or above a literal floor; control plants a letter-spacing that forces a
  wrap); the contrast walker reports "unknown background" under a raster or a painted
  non-ancestor layer (control plants a fixed dark div under the strip). Detectors with
  controls now, live cells when their subjects exist: the guide allow-list (absent unless
  the screen is home, done or milestone; never over the stage; no running animation while
  a clip plays; a positive control finds it on home, else the cell is vacuous) and the
  device-pixel snap (every art element's width × dpr ÷ naturalWidth an integer, offsets on
  device pixels, `image-rendering: pixelated`; control forces a 300 px width on the 2.625
  profile).
- **0e Engine fact.** `ladderComplete(state)` — at level 100 and its words secure by
  `isSecure`, and ONLY that: SPEC section 7 states that the two-perfect-sessions path
  promotes between levels and never ends the ladder, pinned by a literal test (level 100,
  9 of 12 at box 3, streak 2: false). `gardenState(state)` = `floor((level − 1) / 10)`, 10
  when complete; no `Math.min` cap, because the level is already clamped and a cap's
  mutant would be equivalent. Both placed after `checkPromotion` so no existing anchor
  moves (`node tools/mutants.mjs --anchors` stays 0); one G5 mutant drops the `isSecure`
  clause and must die on a named test. Breaks: `g5_source_mutants` 73 to 74, the unit
  floor, the engine line count, SPEC section 7.
- **Floors that move (E11), named before the change:** `g1_unit_tests`, `g20_tests_mapped`,
  `census_cells`, `census_novelty_cells`, `census_novelty_controls`, `g5_source_mutants`,
  `g16_doc_rules` 10 to 11, `g24_vocab`, the engine's 2400-line ceiling (2,167 today), and
  `docs/file-map.md`'s gate count.

**Open for the owner (council findings that contradict or need a ruling):**

1. The budget ruling said 2× and 3× files for every state and crop. The art director:
   shipping scaled files is the wrong mechanism — on the Pixel 7 (2.625) a 3× file scales by
   8/3, the uneven-pixel artefact the bible rejects; ship 1× masters and let the code snap
   each art pixel to a whole number of device pixels, which the census then measures. The
   snapping is built either way; the export question waits on the owner.
2. What a screen reader calls a Build-it tile. Today "Tile sh", which a screen reader
   spells as letter names. The reading chair asks for a ruling: the grapheme as today, a
   positional name ("sound tile 2"), or deferred to the icon step.

### Steps 1 to 11 — the bible's migration order, amended

1. Ceramic tile styling (the bible's step 5, moved up: tiles are on every screen a child
   learns on). 2. Glowseed tied to the real audio lifecycle. 3. The responsive reading
   surface and garden frame, out of flow. 4. The responsive grown-up zone. 5. Home and the
   original icon family (the second half of the icons ruling). 6. Garden state 0 and the
   milestone reveal screen, built once. 7 to 9. States 1 to 10, one reviewed milestone at a
   time, each a drop-in judged by the install gate, the frame gate and the census the day
   it arrives. 10. Quiet Display and reduced-motion coverage. 11. The full gauntlet and the
   council's final pass.

Each step is its own section here when it starts, in this shape.

## The log — every pass, every verdict

Newest last. A verdict names the chair, the step, the word, and the findings.

- 2026-08-22 — Step 0 before pass requested from all three chairs; implementation held
  until their suggestions are in.
- 2026-08-22 — Step 0 before pass returned. **Art director**, 11 findings: (1) token names
  collide with `C` — taken, distinct keys; (2) darken tileEdge and boundary, `disabled` a
  fill only — taken; (3) emit `:root` from `C` in wq-css.js, sweep hex literals, quality
  control — taken; (4) doc-truth cannot read a PDF; SPEC section 9 is a second palette —
  taken in the antagonist's shape (one owner, the bible's section 9 ruling; SPEC points);
  (5) svh for every teaching clamp — taken; (6) the ceiling must exclude the voice — taken;
  (7) 12 MB arithmetic: indexed PNG, glow in CSS never baked, an IHDR check — taken for the
  asset step; (8) 2×/3× means integer device pixels per art pixel, ship 1× masters — the
  snapping taken, the export question put to the owner; (9) the contrast walker is blind
  under raster backgrounds — taken now; (10) layered states, not 33 scenes — taken for the
  asset step; (11) aria-label equals the visible label, decade emoji count as icons —
  taken. **Reading and accessibility**, 9 findings: (1) drop "(hold)" from accessible
  names, ban symbols, label-in-name test — taken; (2) label-keyed detectors move with the
  sweep, with a control — taken; (3) what a sound tile is called — put to the owner;
  (4) prove nothing seen or heard changed — taken; (5) svh everywhere, a control against
  dvh, a real-phone QA step — taken; (6) the 200% cell must refuse a wrap and use the
  widest word by measured width — taken; (7) the guide as a fail-closed allow-list with a
  positive control — taken, detector now, cell with its subject; (8) the frame cell's
  extra conditions — taken for the frame step; (9) unmeasured bible rules: motion during
  attempt and reveal — taken now; scenery contrast statistic — asset step; 7:1 on the
  lavender stop measures 6.99 today — scheduled with the reading-surface step; frame source
  a pure function of state — step 6; multi-letter tile wider — taken now. **Engineering
  antagonist**, 13 findings: (1) aria-label changes what is heard; regenerate the snapshot
  — taken; (2) "every locator moved" needs a scan with a plant — taken; (3) scope by class
  with an adult allowlist — taken; (4) key collisions repaint the game — taken; (5) 0b
  contradicted itself; one owner for the corrected table — taken; (6) no generated CSS
  file; the brace trap in controls.spec:209 — taken; (7) svh fixes size not position;
  change the shell, both copies, pin it — taken; (8) art-scoped ceiling over tracked bytes,
  a gauntlet control that dist art equals source art, precache_files_max — taken; (9) cells
  with no subject are vacuous; the frame height cell is real today — taken; (10) 200%
  specifics — taken; (11) ladderComplete is a third promotion rule unless SPEC says the
  streak path never ends the ladder — taken; (12) the cap's mutant is equivalent; mutate
  the isSecure clause instead; place the functions after checkPromotion — taken;
  (13) the floors that move — named above.
