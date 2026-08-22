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
  body text identical before and after on every census state, with one declared adult-side
  exception - the corner's mastery rows, "0/10 read · 0 green" to "0 of 10 read, 0 green",
  so their accessible name is their visible words; zero emoji in locators. Measured after
  the after pass (2026-08-22), ab5155c against f85ed6b, body `innerText` per screen: home
  and the chooser differ only in the commit stamp, session ready and reveal are identical,
  and the corner differs in exactly those rows.
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
  tile in the reveal (control plants equal widths); the 200% cell (three arms — 100%, rem
  scaling, and CSS zoom on 640 × 1136, which is 320 CSS px by the desktop's mechanism — on
  the bank word of greatest rendered width, probed in em over the whole bank, one line box,
  inside the viewport, font-size at or above a literal floor; control plants an overflow
  and a wrap in the word's place. Built 2026-08-22, it found the word already breaking at
  100%, and `app/src/components/Word.jsx` is the fix — see the log); the contrast walker reports "unknown background" under a raster or a painted
  non-ancestor layer (control plants a fixed dark div under the strip). Detectors with
  controls now, live cells when their subjects exist: the guide allow-list (absent unless
  the screen is home, done or milestone; never over the stage; no running animation while
  a clip plays; a positive control finds it on home, else the cell is vacuous) and the
  device-pixel snap (every art element's width × dpr ÷ naturalWidth an integer, offsets on
  device pixels on both axes, `image-rendering: pixelated`; control plants a real 64 x 64
  PNG on a real Pixel 7 context at a 300 px width and the browser's smoothing, and then
  snapped - built in the after pass, the first draft fed the hold hand-typed numbers;
  the first text here said "control forces a 300 px width on the 2.625
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

**Ruled by the owner (2026-08-22, the two-rulings page; recorded in the bible, 16.2
and 15):**

1. The export ships **as the budget ruling was written — 2× and 3× files for every state
   and crop, picked by device pixel ratio and scaled** — over the art director's and the
   implementer's recommendation of 1× masters snapped in code. The owner was shown the
   measurements (pixel-identical at k = 2 and k = 3; 3.1× the bytes) and chose B. The
   8.2 snap stands beside it, so the screen shows the same pixels either way; the cost is
   bytes, inside the 12 MB.
2. A Build-it tile's accessible name stays its **grapheme, "Tile sh"**. S4 binds the
   app's voice, not the assistive technology; a positional name was refused.

### Steps 1 to 11 — the bible's migration order, amended

1. Ceramic tile styling (the bible's step 5, moved up: tiles are on every screen a child
   learns on). 2. Glowseed tied to the real audio lifecycle. 3. The responsive reading
   surface and garden frame, out of flow — and bible 10.4's margins-before-font on the
   compact profiles: the stage spends 14 px a side before the principal word's glyphs
   shrink, so "something" fits at 56.1 px on 320 × 568 where the full width would give
   about 61.5 px; step 3's brief names what the word may reclaim and its per-profile cell
   records the fitted px before and after, the after at or above the before (the reading
   chair, the re-judgement of step 0). 4. The responsive grown-up zone. 5. Home and the
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
- 2026-08-22 — Step 0d built. The 200% cell's first draft measured the element's box and
  called every word 292 px; corrected to the text's own line boxes, the probe found a fault
  older than the art project: the principal word is sized by HEIGHT alone (`11svh`), so at
  100% text size seven bank words split into two fragments on the 320 px profile and
  thirty-four on a 390 × 844 phone ("swimmin" over "g", "somethin" over "g"). The width
  floor first tried (`min(2.25rem,19vw)`) was computed from the box, not the text, and fixed
  nothing. The fix is a measured fit, not a stylesheet guess — a word's width is its
  glyphs', not its letter count's: `Word.jsx` (mirrored in the reference) measures the
  rendered word after layout and shrinks it in proportion only when it is wider than its
  line, under a ResizeObserver and `document.fonts.ready`; `.wq-word` is `white-space:
  nowrap` so the overflow is measurable; the stylesheet's clamp is the ceiling and nothing
  that fitted before changes size. Measured: "something" 56.1 px on 320 × 568, 69.5 px on
  390 × 844, 581 px of text under zoom 2 on 640; "sat" keeps the 88 px cap. The cell's zoom
  arm moved from 320 × 568 to 640 × 1136 because CSS zoom halves a screen's CSS pixels and
  320 zoomed is a 160 px screen no device owns - and the zoom arm measures the word's
  width only, since CSS zoom does not scale svh (the engineering chair, measured). Counts
  by a run at that commit: novelties scope 68 cells
  (59 + 9 controls), all green on chromium. Bible 10's ruling amended to match.
- 2026-08-22 — The two open items ruled by the owner on the two-rulings page: export B (2×
  and 3× files as written, over the recommendation of 1× masters; measurements shown) and
  tile name A (the grapheme). Recorded in the bible, sections 16.2 and 15, and above.
- 2026-08-22 — Step 0 after pass returned: **all three chairs not satisfactory**, six
  blocking findings, fourteen non-blocking, every one taken. **Art director** (3 blocking):
  (1) 0b's hex sweep, its quality control and the literal contrast tests were logged as
  taken and never built — built: seven tokens enter `C` for the literals the screens still
  typed, the stylesheet's gradient reads the tokens it emits, the quality control refuses a
  hex literal in any app source with a fixture, `tests/tokens.test.js` pins the thirteen
  original keys and the 3:1 rule at literal ratios with the admitted sub-3:1 pair as its
  control, and SPEC 9's sentence is now true by that control; (2) the snap reader had no
  control, one axis and a ratio tolerance — both axes, device-pixel tolerance, a fixture at
  k = 2.019 over 512, and a real PNG planted on a real Pixel 7 context; (3) the fitted
  word's geometry was never measured across phases — `Word.jsx` now keeps the stylesheet's
  size on the box and fits an inner span, so the box and the baseline are constant across
  words by construction, and a per-profile cell holds the widest word's box, glyph size and
  text bottom between ready and reveal with a control; (4) `dvh` in DoneScreen — fixed, the
  control reads every app source; (5) art-budget's reader had no positive control and
  failed open — it throws, and four controls read a real tracked directory and a real built
  file; (6) 0a's done line was not measured — measured and amended above. **Reading and
  accessibility** (1 blocking): (1) every refit raised a ResizeObserver loop error that the
  error ring recorded as a phantom bug — fixed twice over (the fit is scheduled for the
  next frame, and the observed box no longer changes), with a rotation cell that reads the
  ring and every 200% arm reading it too; (2) "⬆️ Load backup file" was a label round a
  hidden input, unreachable by keyboard and unseen by the names walker — a named button
  now, the walker reads labels round inputs, the control plants one; (3) the motion cell
  sampled — it also records pops as intervals and its title says sampled; (4) the fit was
  held to one line only once — now on every profile; (5) 3.2 for a refitting word — the
  per-profile cell. **Engineering antagonist** (2 blocking): (1) the hex sweep — as above;
  (2) art-budget fails open — as above; (3) `census_cells` 651 for a count of 652, stale
  self-test labels — 663 now, counted, labels true; (4) DoneScreen dvh — as above; (5) the
  motion control planted nothing in the page — a looping animation is planted and read
  back; (6) the zoom arm's premise — CSS zoom does not scale svh; the comment, this
  document and the gauntlet doc say so; (7) evidence predating the detector file —
  `tools/census-novelties.mjs` joins the staleness scan with a self-test line, and the
  scope is re-run on the committed files; (8) floors not raised — `g20_tests_mapped` 398,
  `g23_declared` 53, `g17_governing_files` 45, each the gate's printed count; (9)
  `widestWord` wrote into React's live element — it probes a detached clone. Re-judged
  fresh by all three chairs after the fixes; their verdicts follow.
- 2026-08-22 — Step 0 re-judged, fresh: **all three chairs still not satisfactory**, two
  blocking findings, twelve non-blocking; every one taken. **Blocking:** (1) the art
  director and the antagonist, independently: two edge tokens entered C below the 3:1 rule
  the same commit's test claimed for every edge — slotEdge 1.94:1 on its ground, sunEdge
  1.44:1 on sun — withdrawn; the slot reads `boundary`, the ring reads `amber`, both
  darkenings declared as the visible changes they are, the test asserts every edge the game
  draws at literal ratios and holds the withdrawn values below 3:1 as controls; (2) the
  reading chair: the new interval detector `popOverlap` shipped with no control — fixtures
  for two pops that cross, two that touch, one sampled twice, and none. **Taken besides:**
  the quality control now reads `.css` sources, the reference outside its `C` block, and
  refuses rgb()/rgba()/hsl() literals — seven shadows and scrims restated ink in decimal —
  with `alpha()` deriving every alpha from a token, and SPEC 9 says exactly what is
  guarded, naming the two files that retype skyBlue; the reference's corner chips read the
  tokens; `C.blue`, a key C never had, read for weeks on the pre-done screen — now
  `C.action`, which is what it always showed, and a test walks every `C.<key>` read in the
  app and the reference against C's keys with a planted one; the 9.3 table no longer names
  cards under two tokens and the skyBlue row names its two retypings; the names walker
  judges a label by its text whatever aria-label it carries, with a planted dressed label;
  a test presses "Load backup file" from the keyboard and counts one click on the input; a
  census control dispatches a window error in the built page and reads it back from the
  ring the 200% and rotation cells check; the one-frame cost of the next-frame fit is
  stated in Word.jsx — the synchronous fit the chair proposed was tried and the rotation
  cell measured the loop error back at 320 × 568, so the frame stays; and bible 10.4's
  margins-before-font goes to step 3's brief, above. Re-judged fresh by all three chairs
  again; their verdicts follow.
