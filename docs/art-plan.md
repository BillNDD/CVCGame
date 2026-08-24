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
3. **Software engineering and programming expert, seated as the antagonist**
   (owner-ruled 2026-08-23: "Keep adversarial mandate but switch to a software engineering
   and programming expert") — the mandate is unchanged and adversarial, because in two
   steps it caught blocking faults nothing else did: a premise the whole brief rested on
   that the code did not support, a reset no guard covered, numbers quoted from a render
   set that no longer existed. What the seat brings to it is a practising engineer's
   reading: what each change breaks (E11), honesty (E3 to E5), drift (G16, G20, G23),
   the S6 install budget, whether a new gate measures what it claims, and the ordinary
   engineering questions a specialist asks — lifecycles and their edges, event ordering,
   error paths, resource release, the difference between a test that proves a behaviour
   and one that repeats the implementation. Seated from the step 3 before pass onward;
   step 2's passes were run under the older framing, which changed no rule.

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
- **A finding is verified before it is taken.** A chair can be wrong: the third judgement
  of Step 0 called Build-it's owner-ruled scaffold a dead state to be removed, the
  implementer wrote that into a step's brief without reading the code, and the fourth
  judgement caught it. "Taken" means the implementer read the file and line the finding
  names and agrees; a finding the implementer cannot confirm is declined with the reason,
  the same as one it disagrees with.
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

From the page "The construction order" (2026-08-22), on the 53-step measured-painting
method the owner brought:

- **The order:** the nine-stage condensed order, scaled by asset class, as a ruling in
  bible section 17 — 0 output conditions; 1 reference; 2 composition and notan; 3 geometry;
  4 value; 5 colour; 6 materials and edges; 7 detail, last and budgeted; 8 export. Scene,
  tiles, Glowseed and guide take all nine; icons take 0, 2, 4, 5, 7, 8. The garden's
  stages 0 to 3 are decided once and shared by all eleven states.
- **Five hard rules, as rulings:** one camera — one viewpoint, one ground plane, one
  light direction, one module, locked before garden state 0 is drawn and shared by all
  eleven states; notan with the word — every composition judged as 2 and 3 values with
  the teaching word and the controls drawn in, before any colour; a reference board —
  curated, each reference answers a named question, source and licence recorded in the
  provenance file, nothing copied closely; three audits — geometry (flipped, on the grid),
  value (greyscale with the word), final (on the census profiles and a real device) at the
  thumbnail, normal and close sizes; master plus derivatives — layered lossless masters
  kept outside the install, flattened exports only for delivery, a README per asset family
  in provenance.
- **Checkpoints:** two council checkpoints per asset family — after value, after detail —
  by the art director chair; the other two chairs at the step's after pass as the rules
  already say. The art director's read added a third, once, for the scene: the camera lock,
  after the garden's stage 3 and before any state-0 pixel (the bible's section 17 ruling).
- **Who writes it:** the art director chair gives one before-pass opinion on the
  condensed order, then it is written as ruled in the bible.

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
  snapped. That control was built in the after pass: the first draft fed `snapHold`
  hand-typed numbers and never ran the reader, while this paragraph's first text
  claimed "control forces a 300 px width on the 2.625 profile").
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
   learns on) — and Build-it's `ghost`, which is the owner-ruled scaffold of 2026-08-17
   (SPEC section 6; `tests/buildit.test.js` test 8): after the second miss the correct
   letter fades into its own slot at opacity .28 while its sound plays. Step 1's job is to
   keep it perceivable under ceramic tile styling — its rendered ratio on the slot's real
   ground stated at a literal value, and what the Larger / Higher-Contrast setting does to
   it — never to remove it. (The third judgement called it a setter-less dead state to be
   removed; the implementer took that without checking and the fourth judgement withdrew
   it: `setGhost` is called at lines 183 and 184.) 2. Glowseed tied to the real audio lifecycle. 3. The responsive reading
   surface and garden frame, out of flow — and bible 10.4's margins-before-font on the
   compact profiles: the stage spends 14 px a side before the principal word's glyphs
   shrink, so "something" fits at 56.1 px on 320 × 568 where the full width would give
   about 61.5 px; step 3's brief names what the word may reclaim and its per-profile cell
   records the fitted px before and after, the after at or above the before (the reading
   chair, the re-judgement of step 0). 4. The responsive grown-up zone. 5. Home and the
   original icon family (the second half of the icons ruling). 6. Garden state 0 and the
   milestone reveal screen, built once — **and `coralElectric`'s first job, owner-ruled
   2026-08-23** ("Agreed great idea"): the garden is the one surface in this plan that
   brings its own dark and mid ground, and coral is the palette's only warm electric, so a
   bloom-light there reads as different IN KIND from the cyan and purple every teaching
   signal uses. It cannot be an edge, a rim or any mark a child must find — at 1.56 / 1.52 /
   1.67:1 against the sky stops it would vanish; its contrast has to come from what sits
   beneath it. Step 6's brief must state where the light lands, what ground it lands on, its
   measured ratio against THAT ground, and its share of the electric budget (bible 9.1). 7 to 9. States 1 to 10, one reviewed milestone at a
   time, each a drop-in judged by the install gate, the frame gate and the census the day
   it arrives. 10. Quiet Display and reduced-motion coverage. 11. The full gauntlet and the
   council's final pass.

Each step is its own section here when it starts, in this shape.

### Step 1 — the ceramic tile family (opened 2026-08-22; built the same day under the before pass and the owner's four rulings; CLOSED 2026-08-23 at cc8abdd, all three chairs satisfied after seven judgements)

**What the child gets.** Every sound tile the game shows — the reveal's tiles under the
word, the sentence reveal's tiles, Build-it's tray and slots, Find-the-sound's tiles — looks
like glazed ceramic (bible 11): a warm matte face, a restrained bevel, a narrow darker edge,
a slight contact shadow, letters as live text. Each of the eleven states in 11's table has
its treatment, and the two rulings under it hold: the sounding outline and glow are drawn
with `outline` and `box-shadow`, never a border or a size change, so the row holds still;
Used and Disabled are real `disabled` controls. A multi-letter unit stays one visibly wider
tile (S8, the census's unit-width cell). This is the first visible art change the project
makes, and it is declared as one.

**How it is made — the construction order, for a CSS family.** No file ships: the tile is
tokens and stylesheet rules, so its byte share (524,288) is spent at 0 and stages 1 and 8
are empty (bible 8.1's row is amended to say the tile material is a CSS family, and why).
Stage 0: the logical grid is the tile's CSS box — measured, not quoted: Build-it's tile and
slot are 64 px (a multi-letter tile 64 + 26 per extra letter, so "sh" is 90; below 360 px
the compact build's 56, 20 and 6 px gaps, so "sh" is 76), a reveal tile
is its font clamp plus 10 px of padding, about 36 px tall at 390 × 664 and 47 × 42 for
"sh" on the iPhone 13 profile by the census's own read; output is CSS. Stage 2: the notan —
the reveal and Build-it screens as two and three values with the word and the controls
drawn in, on the 320 × 658 and 390 × 664 profiles. Stage 3: the 9-slice is the border radius
and the inset shadows, with the corner size in CSS px stated, so a width variant never
stretches the bevel. Stage 4 (**checkpoint, the art director**): greyscale renders of the
reveal, the sentence reveal and Build-it on the census profiles, with the word. Stage 5:
`tileFace`, `tileHighlight`, `tileEdge`, `cyanStructural`, `cyanElectric`, `slot`, `purple`
or `amber` for a different arrangement — tokens only; the ramp is face → highlight → edge.
Stage 6: the edge hierarchy — the tile's edge at 3.78:1 on its face, ink on the face at
8.64:1 (today's sun face is 8.28), and no tile detail finer than the word. Stage 7
(**checkpoint**): the states, one by one. The sounding state replaces today's 4 px ink
outline with the bible's 3–4 px `cyanStructural` outline (4.61–5.05:1 on the three stops)
plus an electric-cyan glow and an 8–12 % luminance lift, still `steps(1,end)` for the
measured clip length and still outside the box (the owner's 2026-08-11 choice of a hard
ring over a hop or a fade stands; the colour and the glow are the bible's). Four audits:
geometry (the row's boxes identical before and after, G7 and the phase walk), value (the
greyscale renders), originality (a ceramic tile is a material, not a character — the 18.2
combination test recorded in provenance), final (the eight profiles, and the QA script).

**The scaffold stays and must stay perceivable.** Build-it's `ghost` is the owner-ruled
cue of 2026-08-17 (SPEC section 6; `buildit.test.js` test 8): after the second miss the
answer letter fades into its own slot at opacity .28 while its sound plays. Measured today:
ink at .28 over the slot's ground is **1.65:1** on `slot` and 1.66:1 on paper-at-.55 — a
deliberately faint cue, below any contrast rule. Step 1 states, at literal values, what the
ghost renders at on the ceramic slot and what the Larger / Higher-Contrast setting (bible
15.3) raises it to; it never removes the ghost.

**Breaks (E11), named before the change — and corrected by the before pass.** G7
measures the tile row's boxes across the reveal and the sounding ring's stillness; G8 and
the census's contrast walker read the tile text on its face; the unit-width cell reads
tile widths; the phase walk and the widest-word cell read the row; `tests/tokens.test.js`
pins `tileEdge` on `tileFace` (3.78); the quality control refuses any hex outside C; the
monkey walks Build-it's tray; `tests/buildit.test.js` and `tests/models.test.js` drive the
tray's controls by name (the names do not change); the aria snapshot of home does not
change. What the antagonist's blast-radius run found that the first draft did not name:
`PreSessionScreen.jsx` renders a `.wq-tile` (the ear rung's revealed word) and goes
ceramic with the rest; `tests/models.test.js` asserted a used tile's inline `opacity ===
"0.22"` literally, and moved to the class and the `disabled` attribute; the reference's
own `.wq-tile` rule, bound to the app's by nothing, is now compared character for
character by a test. And a claim withdrawn: G7 holds no 56 px floor on Build-it's tiles —
its size check reads `.wq-cta` and `.wq-sbtn` only, and no gate opened Build-it at all —
so a census cell now deals "ship" through the dice and measures every tray tile and slot.
Counts moved: `census_novelty_cells` 68 → 84 (two cells on eight profiles),
`census_novelty_controls` 12 → 14 (15 at the fifth judgement), `census_cells` 664 → 682 (683), `g1_token_tests` 9 → 12,
`g10_buildit_tests` 13 → 26, `g16_doc_rules` 11 → 12, `g17_governing_files` 45 → 46,
`g23_declared` 53 → 54, `g20_tests_mapped` 403 → 412; `g5_source_mutants` 74 with 0
moved anchors, `g8_axe_violations_max` 0, the home snapshot unchanged.

**How checkpoint 2 was judged for a family that lands no file.** The scenery statistic
section 17 names is first built by the step that lands a PNG (the garden scene); the tile
family's checkpoint 2 was judged on tokens tests 8–10, the census's sounding-state cell,
and device pixels sampled on the renders: on the 0d887f3 set (`D:/CVCGame-ops/art/step1/0d887f3/`)
at 4.5 dpr, the column through a sounding "i" — band 26 + 1 blend above, ring 13, rim 4,
highlight 4, the lifted face #fbe59d, and 13 toward the next tile — first read on the
34355ed set at the fifth judgement and reproduced on the 0d887f3 set at the sixth (the
34355ed and 3c11232 sets were overwritten at the one path then in use; since the sixth
judgement every set lives in a folder named for its commit, and a judged set is never
overwritten); and on the
density renders made after the live-tile construction — a middle tile sounding at three,
six and eight tiles on the Galaxy and on a 390 × 500 short stage — the band toward either
neighbour at 13–14 / 4–5 / 0 / 3 device px (3 / 1 / 0 / 1 CSS px), the neighbour's rim whole
each time; pressed captured at the fifth judgement on the Galaxy and the iPhone 13 — the face
renders #edd07d, the arithmetic's #eed07d to one unit of the compositor's rounding, the
bevel gone and the rim kept) — stated here, in the bible's section 11 and in the provenance row, so the
section 17 sentence does not imply a measurement that did not happen.

**Ruled by the owner (2026-08-22, the ceramic-tiles page, each with the real render):**
the sounding tile keeps the structural ring AND the electric band (6 / 4 / 2 px by
density) — 9.1 settled by arithmetic, one tile sounds at a time (`popOverlap`), a band
covers about 0.5 % of a 320 × 658 screen; a different arrangement is a 3 px
`purpleStructural` ring round the filled slots during the playback (over a tint and over
none; `purple` 4.49 and `amber` 4.29 on the face lost to 4.86); the scaffold letter
renders at .60 (3.28:1 on the slot) over the .28 (1.65) that had sat unruled beside the
2026-08-17 ruling; and the open sentence word's ring moves to `cyanStructural` in this
step, closing open-faults AB (4.73 / 4.61 / 5.05).

**Done means.** Every tile the child meets renders the ceramic family's tokens and states;
the row holds still through the reveal (G7, the phase walk); every tile text and edge
measures at or above its literal ratio in `tests/tokens.test.js`; the ghost's ratios are
stated and held; the check and the novelties scope are green; the art director's two
checkpoints and the three-chair after pass are recorded here.

### Step 2 — the Glowseed tied to the real audio lifecycle (opened 2026-08-23; the before pass returned the same day and rewrote this section; the owner ruled all four questions the same day, each as the council recommended; CLOSED 2026-08-23 at 524e0ff after two judgement rounds, checkpoints 1 and 7 both PASS on measurement)

**What the child gets.** One small object in the child's field — inside the stage, out of
flow, in the same top corner on every screen it appears on (the word reveal, the sentence
reveal, the pre-ladder, Build-it; not home, not the done screen, not the corner; bible 13.1
says home "may", not must) — that is lit exactly while recorded teaching audio plays and dark
otherwise (bible 7). Three looks, all hard-edged, none animated: **idle**, a pale core
(`slot`) inside a stone rim, within one value step of its ground so it reads as scenery and
never as a fourth tile; **lit**, the core `cyanElectric`, the rim `purpleStructural`, a thin
`purpleElectric` light outside the rim (9.2's order: electric glow outside a darker
structural edge — purple, so a child never reads it as a tile's cyan band), steady, no pulse;
**muted** (sound off), the core gone and the rim empty and DASHED in the `muted` token —
`stone` until 2026-08-24, when the owner could not see it on a phone knowing where to look
(open fault AI) — beside the replay control now
`disabled` and a sentence on the strip's reserved marker line that a parent reads. Reduced
motion changes nothing, because nothing moves: the edge of the sound is the edge of the
light, as it is for the tiles' ring (owner, 2026-08-11). It never replaces the speaker
controls — "Hear the word again", "Hear it again", "Hear the word", "Hear the sound" keep
their names and their 44 px — and it is decoration to assistive technology: `aria-hidden`,
no role, no live region, no tab stop, `pointer-events:none`, never a second replay control.
The sounding tile keeps the child's eye: the object's rim is thinner than the tile's 3 px
ring and its dark-edge area is below the ring's (≈63 px² against ≈534 on the iPhone 13), and
during a sound-out the object stays lit across the whole utterance — one span across the
seams, the hum's own edges — while the pops mark the tiles. It says nothing about the word
(answer-clue: nothing about it varies with the word), shows no text, and is identical for a
correct, close and wrong reveal (3.4).

**The corrected premise.** The first draft said the players "already report when they
finish". They do not: `playClips` calls `onScheduled(ms)` once, at schedule time, with the
measured length; no audio node carries `onended`; every "end" the app uses today is a
`setTimeout` on that length (App.jsx `playBuildWord`, `playBuildSounds`, the advance timer),
and the replay, the done line and the pre-ladder prompt pass no callback at all. So "no
clock of its own" is honest only with real completion events, and bible 7's ruling
paragraph is corrected in this step to say so. Probed on 2026-08-23 under Playwright's
headless Chromium before the design was committed: `AudioBufferSourceNode.onended` fires at
a buffer's natural end, fires on `stop()`, and through a context suspended for 1,500 ms
mid-play arrives 1,500 ms late — which is what lets a cell tell an event from a timer.

**The wiring, which is the step whichever way the owner rules.** The event source lives in
`app/src/voicepacks.js` only: `onAudio(listener)` delivering `{ state: "start" | "end",
token }`. Start is emitted when the utterance's plan has been scheduled — the same moment
`onScheduled` fires and the hum starts, 50 ms before the first sample and the first clip's
lead (40–290 ms across the pack) before any voice — and is emitted outside `playPlan`'s
try, each listener in its own try, so a throwing listener can never leave clips scheduled
and call the system-speech fallback over them (a test plants one). End is emitted when
every scheduled node of the utterance, the hum's oscillators included, has fired `onended`,
counted to zero and keyed by the utterance's token so a stopped utterance's late `onended`
never darkens the next; `stopClips()` ends it too (its stop fires `onended`, so it needs no
hook). A silent pack never starts, so it never lights. A lost end — a context closed by
`reclaimOutput`, an iOS interruption that never resumes — is caught by a net the PLAYER
carries: a timer armed at the utterance's own measured length plus ten seconds, which emits
the end if the nodes never report. This paragraph named the turn's long backstop (B17's
10 s) until 2026-08-23, and that was WRONG — the turn's guard arms the advance control and
never touches the audio, so nothing caught a lost end and the object stayed lit over silence
until the child was moved on by hand. The council's engineering seat found it by reading the
backstop rather than the sentence. Keying the net to the measured length means it can never
fire during a real utterance however long the word is, and ten seconds of slack leaves the
1,500 ms suspend control still separating an event from a timer. It ends the LIGHT and stops
nothing. Guarded in the real module by voicepacks.test.js, whose control removes the net and
watches the test fail. The object subscribes and switches a
class; nothing else reads the events. The system-speech fallback (`speak` in the reference
build) stays **idle**: recorded audio only, as bible 7 scopes it, no engine change, and the
corner's B7 note gains "and the listening light stays dark" (the reading chair's (a); the
owner's page carries the alternative). Edges, stated: the light spans the files, not the
speech — on a replay of "sat" it is lit about 1,070 ms for 460 ms of voice (lead 120, tail
440) — the same clock as the hum and the advance control, so three indicators never
disagree.

**The order question, for the owner (one decision, a page).** Section 17's ruling locks
the camera — one viewpoint, one ground plane, one key-light direction, one module — at the
garden's stage 3, "before any state-0 pixel is placed, because the camera is the one
irreversible decision eleven states, the Glowseed and the guide share", and the chair's
standing refusal under it says no Glowseed pose is drawn before that lock is in provenance
and has passed its checkpoint. The owner-ruled order has the Glowseed at step 2 and the
garden at step 6. The council's before pass (all three chairs, 2026-08-23): **A** — bring
the garden's stages 0 to 3 into this step (a reference board, the eleven states' notans on
three crops with the word, the numeric lock, the camera-lock checkpoint), then draw the
Glowseed to it: about 5 to 7 working days before any wiring is judged, a camera decided
before the frame step has fixed where the bands are (the decision most likely to be
re-taken), and four file checks and a per-profile snap cell built for a 20 px bead;
**B** — this step is the wiring and the states, the object a CSS family from tokens, bible
8.1's row amended as the tile row was, a pixel Glowseed only if the garden's step finds the
CSS one wanting (the antagonist's choice: about 15 to 18 files, no file gates; its cost is
that a flat token disc becomes the permanent material unless "found wanting", which nobody
measures, and a pixel cradle round a vector seed is 17.1's inconsistent scale at the one
junction a child looks at when the voice speaks); **C** — a pixel Glowseed to a light of
its own, redrawn at step 6: refused by bible 17's standing rule, not costed as a way;
**D** — B's build declared as a placeholder under the owner's own "who draws" ruling
("state 0 with placeholder geometry"), 8.1's row untouched, the pixel seed drawn at step 6
to the locked camera as a drop-in paint on the same component, classes, position and cells
(the art director's choice; the reading chair's B-with-a-condition is the same build: the
place decided now and kept by the frame and the cradle). The council recommends **D**; a
placeholder needs the owner's approval and a named entry in the owning document (CLAUDE.md),
which the page asks for. Three more decisions ride on the same page: the scaffold, the
fallback and the sound-off sentence, below.

**Stage 0, measured.** The object's CSS box is at most 20 px — at most 60 % of the reveal
tile's measured height (39 / 46 / 38 / 42 CSS px on the Galaxy S9+, the Pixel 7, the iPhone
13 and the desktop; 28 on the short stage) — absolutely positioned inside the stage with
0 px of layout, so header, stage, rail and strip measure identical with it present and
planted away; in the stage's top corner, where the sky is free on every profile (the stage's
top sky above the "Read this word" label runs 46–181 CSS px on the Galaxy, 46–279 Pixel 7,
46–199 iPhone 13, 46–232 desktop, 46–167 short stage, 46–69 landscape phone; the tile rows
sit at 287–326 / 398–444 / 307–345 / 379–421 / 223–251 / 128–147), never between the word
and the tile row, never over a control's box, a text line or a tile, never in the strip;
left or right is the notan's to settle (the art director leans right, after the word in
reading order); absent where it cannot fit, the layout never moved. Byte share 524,288,
spent at 0 under B or D (a provenance row opened, declared a placeholder under D; at step 6
one sprite, three painted states × two scales = 6 indexed PNGs of a few hundred bytes —
about 2.3 KB measured on a synthetic seed — no crops, which are the garden's). The electric
figure per profile goes in the provenance row beside the band's 0.44 %. That row now holds a
MEASURED figure and this paragraph defers to it rather than repeating an estimate it has
outlived: 0.417 % on the iPhone 13 and 0.512 % on the Galaxy, counted on the checkpoint
renders, against an arithmetic guess of 0.51 / 0.62 made from a core that shipped at 7 px
rather than the 8 px the guess assumed. Both are under 9.1's 1–3 % with room — value weight,
not the budget, is the constraint.

**Stage 2, the notan, and checkpoint 1.** Greyscale renders with the word on the Galaxy and
the iPhone 13 at least, of the reveal with a tile sounding, the sentence reveal, Build-it
ready and prompting, and the pre-ladder's ear prompt (the one screen where the object is
not secondary to a tile — no tile is on the stage there, bible 13.2). Judged on: in two
values the lit object is one small dark-rimmed mark whose rim clears 3:1 on all three sky
stops and whose dark-edge area is below the sounding tile's ring; in three values the core
sits in the sky's value group, never the tile faces'; the idle object sits within one value
step of its ground (stone 1.28 / 1.24 / 1.36:1 on the stops, `slot` 1.23 / 1.26 / 1.15) and
does not read as a fourth tile at thumbnail size; the word stays the darkest, largest,
highest-contrast thing on the screen; the silhouette is not a circle with a centred core
(an eye, an LED, a bullseye — 17.1's face risk): an ovoid with the core offset toward the
cradle end and one asymmetric tip; the 18.2 verdict written into the row. The first draft's
criterion — "the lit core must be the second brightest thing after the word's ground" — is
deleted: measured from C, `cyanElectric` (0.683) is the seventh value on the screen and
1.06:1 against the idle core, invisible in greyscale. What carries the lit state in value is
the RIM: stone (0.443) to `purpleStructural` (0.106) is a 3.15:1 step, and the lit rim
measures 4.02 / 3.92 / 4.29:1 on the three stops.

**Stage 5, tokens.** Core `cyanElectric`; rim `purpleStructural`; light `purpleElectric`
outside the rim; idle core `slot`; idle rim stone, declared in tokens test 3b's company as a
decorative edge below 3:1 (8.3: scenery by value and hue, never an instructional boundary);
muted: the core gone, an empty rim (the `disabled` token, 0.440, is the same value as stone
and cannot carry it; shape does). The rim's three ratios and the idle-to-lit step are pinned
at literals in `tests/tokens.test.js`. Bible 9.3's use note and C's comment, which call
`purpleElectric` the "Glowseed rim", are amended in the same commit to "Glowseed light":
`purpleElectric` is 1.97 / 1.92 / 2.10:1 on the stops, and 9.1 says an electric hue is
never the sole boundary. Stages 1, 3, 6 and 8 are empty under B or D; under A they are the
garden's and the step must also build the four file checks bible 17 assigns to the step
that lands the first file (binary alpha, no gAMA or iCCP, pixel-equals-token, derivative
equality) and a per-profile snap cell — none of which exists today (`tools/art-budget.mjs`
sums bytes; `tools/provenance-check.mjs` reads shapes and tokens, never a file).

**Stage 7 and checkpoint 2.** Colour renders on the eight profiles, one per state and
screen: idle on the attempt; lit on the word playback; lit beside a sounding tile (band and
light in one budget figure); muted with the disabled control and the marker-line sentence;
the pre-ladder's ear prompt; Build-it's prompt and its arrangement playback (the slots'
`purpleStructural` ring and the object's rim on one screen, distinct by shape and size); a
reduced-motion render identical to the lit one. Judged on tokens sampled at their literals,
9.2's order on the pixels (light outside a darker rim, core inside, no blur, no gradient),
no transition or animation at any phase, the geometry audit (box and offset identical
across idle, lit and muted and across ready, reveal and next on every profile, a planted
1 px shift refused), the Glowseed cell green, the electric figure in the row, and the row
declaring the placeholder, the checkpoints, the originality field and a closing date.

**Four rulings, made by the owner on 2026-08-23 (the Glowseed page), each as the council
recommended and each as the build had already been made — so nothing changed on their
return, and what follows is the ruling with the question it answered.** (1) **The order: D**
— the wiring, the states and the cells now, with a token-drawn placeholder approved under
the "who draws" ruling; bible 8.1 keeps the Glowseed pixel-constructed; the pixel seed is
drawn at step 6 to the locked camera as a drop-in on the same component, place and cells.
(2) **The scaffold: (a)** the object stays idle during the scaffold — the slot's cue ring is
the one event there; the scaffold's timing is untouched. (3) **The fallback voice: (a)** the
object stays idle on every system-speech path (recorded audio only); the Grown-ups corner's
note gains "and the listening light stays dark". (4) **Sound off: "Parent: sound is off"**
on the strip's reserved marker line, with the replay controls disabled and the object muted.
The questions as they were put: (1) The order: A, B or D; C refused.
(2) The scaffold: after the second miss Build-it plays the answer's sounds one clip per
900 ms slot while the ghost letter fades in (owner-ruled 2026-08-17) — under the lifecycle
rule the object would blink once per sound on that metronome, in step with the cue ring,
which bible 7 forbids in plain words; either (a) the object stays idle during the scaffold,
the slot's cue ring being the one event there (the council's recommendation for this step),
or (b) the scaffold becomes one utterance — the answer's sounds with the sound-out's seam
between them — with the ghost timed from the schedule's own slots, one lit span and today's
guessed 900 and 700 ms clocks gone (bible 14's rule, which the scaffold breaks today; the
Build-it layout step's to take if not now). (3) The fallback voice: (a) the object idle on
every system-speech path, the corner's note saying so (recommended), or (b) the utterance
events wired in the engine's `speak` — an engine change, the parts bridged into one span so
the praise-then-word queue does not flicker, the `hush()` mutant re-anchored. (4) Sound
off: the replay control and the pre-ladder's control render `disabled`, the object muted,
and the marker line says "Parent: sound is off" (recommended wording; the page offers
others) — a visible change to SPEC section 5's replay rule, declared.

**Breaks (E11), named before the change, corrected by the before pass.** Five test files
mock `voicepacks.js` — `tests/buildit.test.js`, `models`, `names`, `reveal`, `sentence` — and
a missing export throws on access; `tests/safety.test.js` drives the real module's fallback
in jsdom and `tests/voicepacks.test.js`'s `FakeCtx` sources have no `onended` and a `stop()`
that only sets a flag, so the double gains `onended` on stop and on the oscillators, and the
real source is proved there and nowhere through a mock ("never present a mock as proof").
`tests/reveal.test.js` 3b's sound-off path and `tests/safety.test.js` 4 and 5 read the
replay control's disabled state; SPEC section 5's "the replay control operates only in the
feedback phase" gains "and only while sound is on", and S2's sentence in CLAUDE.md stays
true. The monkey's `SOUND_ONLY` reason text changes to "it speaks and lights the seed,
which the signature cannot read" (the signature is text length, element count and active
element; the object is one persistent element switching a class, never mounted or removed
— a mount would be a layout event and make the exemption silently false); its `dead-end`
rule is re-checked with the replay disabled under sound-off (the grade controls stay live).
The motion cell counts CSS transitions — `document.getAnimations()` returns them and
`motionHold` names any stranger `motion-during-reveal` — so the object has none, and a
planted transition on it is refused through the reader. `tests/tokens.test.js` test 10 and
doc-truth rule 12 name the app-only selectors: `.wq-glowseed` is declared app-only in both
or mirrored in the reference; `g1_token_tests` moves with the rim's pins. The census helper
`stage()` gains a sound-off option; the Glowseed cell adds one cell per profile and its
plants add controls (`census_novelty_cells` 84 → 92, `census_novelty_controls` 15 → 17 or
so, `census_cells` to follow); a new vitest file would need a gauntlet counter, a baseline
key and an effect-declarations entry, so the tests go into existing files
(`g10_reveal_tests`, `g13_engine_tests`) and `g20_tests_mapped` moves with them — the
gauntlet document quotes that count (412) and doc-truth holds the quote to the baseline.
`node tools/app-mutants.mjs --anchors`: the mutant anchored on the grade line `if
(!s.settings.sound) armAdvance(ADVANCE_GUARD_MS);` stays byte-identical; `node
tools/mutants.mjs --anchors`: the engine mutant anchored on `hush()`'s exact text is
untouched under fallback ruling (a). The object must not carry `.wq-sbtn` (the interface
gate measures every one at 44 px). `tools/provenance-check.mjs` gains a Glowseed lock
reader (the box, the rim and the light in CSS px read from the stylesheet), so the row is
read and not trusted. The aria snapshot of home does not change; the session's accessible
tree changes by nothing (the object is hidden). `tools/file-map.mjs`'s bulk globs cover a
new component under `app/src/` (`g23_declared` does not move for it). G11 reads the
marker-line sentence. `docs/effect-map.md` gains the object's effects. Two pre-existing dead
ends become visible under the muted state and are in this step's scope: the session
breather deals Build-it with sound off (the chooser refuses it) — the breather skips itself
when sound is off; and the pre-ladder with sound off plays no prompt — its marker line says
so.

**Built 2026-08-23, ahead of the owner's page, on its recommendations (D, a, a, "Parent:
sound is off") so the checkpoint renders would be real; the owner then ruled all four the
same way, so the build stands unchanged and the renders are the ruled build's.** The event source in `voicepacks.js` (`onAudio`: start at the schedule,
end when every node has fired `onended`, keyed by token; `stopClips()` ends it; each
listener in its own try), proved in `tests/voicepacks.test.js` in the real module; the
component (`app/src/components/Glowseed.jsx`, one persistent element switching a class,
`aria-hidden`), carried by `Zone.Stage seed` on the word reveal, the sentence reveal, the
pre-ladder and Build-it; the stylesheet's three looks with no transition, absent under a
400 px viewport - a max-height query, the window and not the stage; the sound-off state (the replay and pre-ladder controls disabled, the marker
line's sentence, the breather skipping itself); the scaffold's quiet rule; the corner's
note; tokens test 13; the census's Glowseed cell on every profile with the audio probe and
its control's three plants; the provenance row with its lock reader; SPEC section 5's
replay rule amended; doc-truth rule 12 reading section 7's table too. Counts moved:
`g13_engine_tests` 13 → 18, `g10_reveal_tests` 18 → 22, `g10_buildit_tests` 26 → 28,
`g1_token_tests` 12 → 13, `g20_tests_mapped` 412 → 423, `census_novelty_cells` 84 → 92,
`census_novelty_controls` 15 → 16, `census_cells` 683 → 692. Measured on the first renders
(`D:/CVCGame-ops/art/step2/`): the object at (290, 8) on the Galaxy and (360, 8) on the
iPhone 13 from the stage's corner, 24 × 30 since the owner's 1.5× ruling of 2026-08-24 (16 × 20 before it); every zone's height the same across idle, lit
and muted (62 / 346.5 / 70 / 179.5 on the Galaxy); lit by the real audio events in headless
Chromium; absent on the landscape phone.

**Done means.** Cells, on the eight profiles, each with a plant: **attempt** — idle at every
100 ms sample from stage to grade on the word and the sentence attempt; the pre-ladder's
ready-phase prompt is the named exception and lights it; a planted lit class on the attempt
refused. **Reveal** — observed against the audio itself: an init script wraps
`AudioContext.prototype.createBufferSource` to log every `start(t)` and `onended` on the
context's clock, and a MutationObserver timestamps the object's class changes; the object is
lit over every pop interval, never before the first `start()` call, dark within 100 ms of the
last `onended`, exactly two state changes per word reveal; plants: `lit-before-audio`,
`lit-after-audio`, and `dark-before-audio-ended` with the context suspended for a literal
1,500 ms mid-utterance — a timer of the audio's length darkens early, an event does not.
**Stop** — idle within one frame after a "skip" hold or `next()`, a light that survives
`stopClips()` refused. **Geometry** — box and offset identical (≤ 0.5 px) across idle, lit
and muted and across ready, reveal and next; header, stage, rail and strip heights and the
word's box identical with the object planted away, the 200 % arms and the landscape phone
included; the box intersects no control's, the word's, the tile row's or the message slot's.
**Sound off** — the replay and pre-ladder controls `disabled`, the object muted, the sentence
on the marker line, strip height and word box equal to sound-on's, G11 clean. **Non-colour**
— rim step idle to lit ≥ 3:1 (3.15 pinned), the lit rim on each stop ≥ 3:1, the muted shape
readable from computed style and visible in the greyscale render; in greyscale the object's
local contrast below the sounding tile's ring and the word. **Grades** — lit styles identical
for correct, close and wrong. **Motion** — no animation and no transition on the object at
any phase under both motion settings; the motion cell reports nothing new. **Build-it** —
the scaffold's state changes as the owner rules (zero under (a), at most two under (b)); a
tap's span ends with its sound; "Hear the word" and "Hear the sound" keep name and box.
**Assistive technology** — `aria-hidden`, no role, absent from `tappable()`, the four replay
names and their ≥ 44 × 44 boxes unchanged, axe 0. **Fallback** — never lit on a planted
pack refusal; the silent pack never lights. **Budget** — band plus core plus light ≤ 3 % on
320 × 658, the figure in provenance. The art director's two checkpoints and the three-chair
after pass recorded here; the provenance row closed with the placeholder declared (D) or the
8.1 amendment recorded (B).

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
- 2026-08-22 — Step 0 judged a third time, fresh: **all three chairs still not satisfactory**,
  two blocking findings, thirteen non-blocking; every one taken. **Blocking:** (1) the art
  director and the antagonist, independently: "every edge the game draws clears 3:1" was
  still an overclaim — `line`, the adult controls' edge, sits at 1.26:1 on paper and 1.07:1
  on chip — so the claim now names exactly what it measures, test 3b holds `line` at those
  literals below the rule, the 9.3 row says so, and `docs/open-faults.md` AA carries it for
  the grown-up-zone step, where darkening it is the declared change; (2) the reading chair:
  the monkey's covered-control rule dropped EVERY covered control from the walk, which would
  have hidden a stray layer over a child's button — now only a cover inside an `aria-modal`
  dialog takes a control out of the walk, any other cover stays in and is reported as
  `covered-control` naming the layer, and the control plants both shapes. **Taken besides:**
  `alpha()` once, exported through the engine and pinned to the literals it replaced; the
  slot's ground derived from the tokens and pinned, and "palest" corrected to "least
  luminous, lowest ratio" everywhere; the reference's two stale C comments; the 9.3 rows for
  amber, boundary and slot say what each paints on HEAD; the snap rule also refuses a 2×/3×
  file whose file pixels land unevenly (k = 5 on a 2× file refused, 4 and 6 pass); the
  theme colours in `index.html` and the manifest held to `skyBlue` by test; bible 10.3's
  three `dvh` rows say `svh`; the one-frame cost names the clipped frame; Build-it's
  `ghost` went to step 1's brief as a dead state — **mistakenly**: the fourth judgement
  found it is the owner-ruled scaffold (SPEC section 6, buildit test 8) with its setter in
  use, so the third judgement's finding was withdrawn and the brief corrected to "keep it
  perceivable", and the lesson is recorded in the rules above — a chair's finding is
  verified before it is taken. Judged a fourth time; the verdicts follow.
- 2026-08-22 — Step 0 judged a fourth time, fresh: **art director satisfactory**; the other
  two chairs not satisfactory, one blocking finding each, ten non-blocking; every one taken
  or, in one case, refused with the reason. **Blocking:** (1) the reading chair: the step 1
  brief written the round before called Build-it's ghost a dead state to be removed, and
  it is the owner-ruled scaffold with its setter in use — corrected, and the council rule
  above gained "a finding is verified before it is taken"; (2) the antagonist: the 3:1
  claim was still wider than its measurement — the open sentence word's `action` ring on
  the gradient measures 2.95, 2.88 and 3.15 on the three stops, a child-facing boundary
  below the rule on two of them — held at those literals by test 3c, named in the bible's
  section 9 sentence and the 9.3 `action` row, and carried in `docs/open-faults.md` AB for
  the reading-surface step; the gauntlet doc's residue ("every edge", "palest") corrected.
  **Taken besides:** the bible's 10.3 table rejoined; the two references to the deleted
  `colour.js` corrected; the monkey's dialog selector tightened to `aria-modal` only, with
  a role-only dialog planted and required to be reported; a covered control is reported
  when the walk LISTS it, not only when the rng picks it, with the control's walk seeded so
  it never picks the plant. **Named for later steps, as the rules allow:** the ghost's
  rendered contrast (step 1), the one-frame clipped word on a landscape-to-portrait turn
  (step 3), the file-pixel snap rule for art that is not an `<img>` (step 6), and the
  report's seed naming the parent commit when the scope runs before the commit (cadence).
  Judged a fifth time; the verdicts follow.
- 2026-08-22 — Step 0 judged a fifth time, fresh, by the two chairs that refused it at
  the fourth: **reading and accessibility satisfactory**; the antagonist not satisfied on
  one blocking finding, two more non-blocking; all taken. **Blocking:** the effect map —
  the generated document that says what each test guards — still declared the withdrawn
  claim "every edge or boundary token clears 3:1" for `tests/tokens.test.js`, and named one
  control where the test holds three; the declaration now says what the file measures and
  what it holds below the rule, and the map is regenerated. **Taken besides:** open-faults
  AA's list of where `line` is drawn gains the corner's legend swatches (1.03 to 1.07:1),
  after the chair's count of every border, outline and ring the app draws found no third
  sub-3:1 edge beyond AA and AB; and the effect map's title reader now closes on the quote
  that opened it, so a title with an apostrophe is read whole (71 rows of the map read
  their full sentence; a self-test fixture holds it). Judged a sixth time by the
  antagonist's chair; the verdict follows.
- 2026-08-22 — Step 0 judged a sixth time by the antagonist's chair, fresh: **satisfactory.**
  With the art director (fourth) and the reading chair (fifth), **Step 0 is closed by all
  three chairs.** Five non-blocking findings taken in the closing commit: the effect map's
  reader keeps a backslash-escaped quote inside a name (six rows read whole; a self-test
  fixture holds it); the tokens test's header names its three sub-3:1 controls; open-faults
  AA gives the strip's top edge its three ratios; SPEC section 9's "all text and control
  colors pass 4.5:1" now says what is measured and points at AA and AB; the 0d paragraph's
  garbled sentence reads whole. Six judgements, 2 + 4 + … findings: 20, 14, 15, 12, 3, 5 —
  every one taken or refused with its reason, one finding withdrawn as mistaken. The
  verdicts are recorded here and in the closing commit, as the rules ask. Step 1 opens.
- 2026-08-22 — The art director chair's before-pass read of the construction order: **write
  it with the amendments**, ten suggestions, all taken into the bible's section 17 ruling:
  (1) stage 3 as a numeric lock record, stage 5 as token-ended ramps with no dither, stage
  6 with binary alpha; (2) a third, once-only camera-lock checkpoint for the scene;
  (3) one key light, emitters per state that cast no shadow on an earlier form — the reveal
  and Quiet Display change emitters only; (4) icons take stage 3 as a keyline once per
  family, stage 0 decides PNG or SVG per icon (8.1 against 16.2 resolved), tiles take a
  9-slice, the guide's stage 0 includes its absence cell; (5) three things back in reduced
  form — sRGB PNG without gAMA/iCCP and pixel-equals-token, aerial perspective as a value
  rule, the basin's ellipse from the locked ground plane; (6) the final audit on all eight
  census profiles, naming the Pixel 7 at 2.625 and the Galaxy S9+ at 320 × 658 and 4.5 —
  the draft's "320 × 568" and "the Pixel 7 at 1×" were wrong; (7) a fourth audit,
  originality and answer-clue, with an `originality` field in the provenance row; (8) no
  README file — the family's entry in `provenance.json` is what the ruling called the
  README; (9) the 1× master tracked outside the install under `tools/art/masters/`, the
  layered master and the reference board outside the repository by path and hash, and a
  derivative-equality check with a planted off-by-one 2×; (10) checkpoint 2 judged on the
  census's scenery statistic, and the byte share as integers per family summing to
  12,582,912. The chair's three refusals stand in the ruling as rules. The checks the
  ruling names are built in the step that lands the first file each reads.
- 2026-08-22 — Step 1 before pass returned, 41 suggestions; every one answered. **Art
  director**, 15: (1) declare the CSS tile as an 8.1 amendment, zero-blur insets — taken;
  (2) the face, bevel, edge and contact shadow as tokens and px with the radii as the
  9-slice — taken as written; (3) a solid face and a token for the lift, never a gradient
  or a filter — taken, `tileFaceLit`; (4) both rings as box-shadow layers, offset 0, focus
  dashed — taken with the outline for the ring and the shadow for the band (the outline
  paints over the shadow, so the band shows only beyond the ring); (5) put the glow to the
  owner with two live options — taken, ruled B; (6) settle 9.1 by arithmetic — taken, in
  provenance; (7) the open word's ring to cyan now — put to the owner, ruled yes; (8)
  purpleStructural as a ring — put to the owner, ruled yes; (9) the tray's multi-letter
  width — taken; (10) Used as the slot face, letter at .6 — taken for the face, the letter
  kept at full ink (8.80) so a child sees which tile was spent (the reading chair's point);
  (11) the ghost stated honestly, the setting not invented — taken: open-faults AC, and
  the opacity put to the owner, ruled .60; (12) the silhouette pinned on the stops — taken;
  (13) what the checkpoints receive — taken, renders outside the repository; (14) the
  provenance entry's shape and a reader — taken, with the reader in the check; (15) the
  stage-0 numbers measured — taken. **Reading and accessibility**, 12: (1) letters on a
  flat face, the 9-slice corner stated — taken; (2) one outline event, the band never
  into a neighbour's letters — taken, the band narrows by density and the cell measures
  the reach; (3) focus distinct by shape — taken, dashed; (4) the ghost at .60 — put to the
  owner, ruled; (5) the slot rings while its sound plays — taken; (6) Used keeps a legible
  letter — taken; (7) the tray tile as wide as its slot, the cell extended — taken; (8) the
  arrangement as a fill, never an outline — put to the owner, who ruled the ring; (9) S7
  on every tile — taken, the Build-it cell; (10) what a screen reader hears unchanged —
  taken, the names tests pass unchanged; (11) the open word's ring — ruled cyan; (12)
  every ratio pinned — taken, tokens test 8. **Engineering antagonist**, 14: (1) the E11
  list corrected — taken, above; (2) the G7 claim withdrawn and a real measurement added
  — taken; (3) one keyframe set, no transition, no pseudo-element — taken, the motion
  cell names wqpop only; (4) edge and bevel in the paint, never the box — taken; (5) the
  ring's geometry in px, the band outside — taken; (6) the lift as relative luminance,
  never a filter — taken; (7) the rim on the stops pinned — taken; (8) the ghost's
  literal and the setting's absence — taken, AC; (9) a sibling class for the controls —
  taken, `.wq-tilebtn`; (10) doc-truth rule 12 — taken; (11) the tile-state cell with
  controls through the reader — taken; (12) provenance.json as DATA with a reader — taken;
  (13) the floors named — taken, above; (14) the states' animations listed — taken: none
  of the new states animates, reduced motion changes nothing about them. Declined: none.
- 2026-08-22 — Step 1 checkpoints and after pass. **Checkpoint 1 (value): pass** — "the
  ground is quiet and the word is the darkest, largest, highest-contrast thing on the
  screen"; the ring and band sampled at 13 / 27 device px on the Galaxy render, 3 and 6 CSS
  px exactly. **Checkpoint 2 (detail): fail**, on the capture and the record, not the tiles:
  the arrangement renders were shot inside the judging lock before the purple ring appears
  (the owner-page render shows it), and the provenance row's checkpoints and originality
  were empty. The 18.2 verdict given: "a material, not a character — passes". **After
  pass:** reading chair satisfactory; art director and antagonist not, three blocking
  findings in all (the two above, and a control whose title claimed a border-in-keyframe
  plant that did not exist). Every finding taken: the arrangement re-captured after the
  miss message; the control plants a real border on the sounding tile and requires
  `tile-moved`, its title naming what it plants; the provenance row filled at the re-
  judgement; a used tile wears the empty slot's dashed `boundary` rim (15.1: the slot face
  alone was invisible in greyscale); the cue slot's dashes go transparent so the ring is the
  one edge; the band narrowed to 5 px (withdrawn the next round: see below) and the short
  stage's band set to 4, with the --wqband literals pinned; one
  halo round the assembled word, drawn on the slot row, and every tray tile used on a win;
  the sentence render re-captured mid-pop; how checkpoint 2 was judged stated; bible 11's
  rule-12 sentence names the two app-only selectors and tokens test 10 names the twelve
  blocks it compares, with its drift control through the reader; the provenance lock read
  from the stylesheet and the screen by `lockFromSources` with a planted band refused;
  `seedGraduated` reads its save back and throws on a lost race; the plan's counts
  corrected; the open sentence word's keyboard focus recorded as open-faults AD for the
  reading-surface step. Re-judged by the art director (checkpoint 2 and the after pass)
  and the antagonist, fresh; their verdicts follow.
- 2026-08-22 — Step 1 re-judged: **checkpoint 2 fail** on two points, both the record's;
  the art director and the antagonist not satisfied on the same two, seven more taken.
  (1) The previous round's "one CSS px of sky between the band and the next rim" — and the
  5 px band made for it — was arithmetic no pixel supported: toward a neighbour the band
  shows gap minus ring (3 / 1 / 0 / 1 CSS px by density) whatever its width, and lies under
  the neighbour's box for the rest; the round-1 finding's own "done means" (band 5 for one
  pixel of sky) rested on the same mistake. Taken the honest way: the band is the owner's
  ruled 6 again, and the stylesheet comment, bible 11, this plan and the provenance row say
  exactly what renders. (2) The provenance row's checkpoints and originality filled from
  the verdicts — checkpoint 1 pass (value, greyscale), the 18.2 verdict "a material, not a
  character — passes", checkpoint 2's verdict recorded as given and re-judged on the final
  set — and the family closes with a date, so the reader's refusals bind it. Also taken:
  the halo sits 4 px off the rims (a padding on the slot row, derived into the lock by
  `lockFromSources`); the lock self-test holds every band and radius at its literal and the
  refused band names both numbers; a closed family with an empty checkpoints array is
  refused; the electric-area figure states its tile and profile; tokens test 10's title
  says twelve; buildit test 24's title says where the halo is; doc-truth's rule-12 comment
  names both app-only selectors; the next capture round adds a focus render. Re-judged by
  the art director (checkpoint 2 on the final set, and the step) and the antagonist.
- 2026-08-22 — Step 1, third judgement: **checkpoint 2 pass** on the final set of 64
  renders ("every row of bible 11's table as amended renders as written"); the **art
  director satisfactory**; the antagonist not satisfied on one blocking finding, four
  more, all taken. The blocking one: the band's record described the next-tile side only
  — toward the previous tile the band painted over that tile's rim by spread minus gap,
  since a later sibling paints over an earlier one's shadow. Taken by construction rather
  than by recording the asymmetry: the row isolates its stacking and the tile sounding now
  (`wq-live`, set by the player as each pop lands — only the live one, since the pop class
  stays on a tile after its pop) paints beneath its siblings, so the band is occluded
  symmetrically and no rim is ever buried; measured on the Galaxy with "i" sounding: sh's
  rim 4 device px intact, 14 of band, the ring 13. Also taken: the rim listed first in the
  shadow stack so it closes all four sides, the highlight inside it (the art director's
  finding: the top row had been the highlight at 1.4:1 on the stops); the census's
  sounding cell refuses a zero-spread band and holds the spread to ring plus the ruled band
  for the row's density, with a planted zero spread; the lock reader's halo inset requires
  a single-value padding, with a planted two-value one refused; the plan's device-pixel
  figure says 13–14; pressed is recorded as uncaptured; the provenance row carries
  checkpoint 2 and the family closes. The antagonist judges the construction once more.
- 2026-08-22 — Step 1, fourth judgement: the art director and the antagonist each not
  satisfied on one blocking finding, both guards rather than pixels; six more, all taken.
  The antagonist: the records attributed "toward either neighbour" to the checkpoint renders,
  which only ever show a first tile sounding, and quoted 1 / 0 / 1 for the other densities as
  if rendered — so every density was rendered with a MIDDLE tile sounding and the runs read
  on both sides (3 / 1 / 0 / 1 CSS px; the rim whole every time), and the records say what
  was measured where. The art director: the live construction had no guard — the census's
  sounding cell now reads the live mark, the tile's z-index and the row's isolation and
  refuses `live-not-beneath`, with a planted `z-index:auto` through the reader; the reader
  also takes the band from the tile's resolved `--wqband` rather than guessing the density
  from classes and heights (the antagonist's cascade point). Also taken: the rim-first order
  pinned in tokens test 10 with a swapped copy refused; the lock reads the rim and the
  highlight inset from the stylesheet, with a planted 2 px rim refused; the bible states the
  highlight as a 2 px inset of which 1 shows; the contact-shadow tint named. Judged again by
  both chairs.
- 2026-08-22 — Found by the monkey on the novelties run after the fifth round, on the
  narrow-extreme profile: three tiles of a ten-tile tray under the grown-up strip, out of a
  finger's reach. A real fault, older than the step (the arithmetic overflowed the 519 px
  stage at 64 px boxes for "breakfast") and made worse by the step (wider multi-letter
  tiles, a fourth tray row). Fixed in the step: below 360 px Build-it's boxes are S7's floor
  of 56, the letter step 20 and the gaps 6, so the largest tray fits above the strip; the
  census's Build-it cell now also deals "breakfast" on every profile and refuses a control
  a finger cannot reach (under anything, or off the screen), with a planted lid and a
  planted sunk tile through the reader; the compact sizes are in the provenance lock and
  read from the screen.
- 2026-08-22 — The Build-it cell's largest tray found a second, older fault on the
  phone-landscape profile: the whole tray below the fold. Not the tile material's: recorded
  as open-faults AE for the Build-it layout step, and the cell holds exactly that shape on
  the landscape phone and zero unreachable controls everywhere else. (This line first said
  "a 268 px stage" and "three tray rows" — recalled; the profile's page is 750 × 342 with a
  245 px stage and the tray's two rows of five start at y = 338, measured at the fifth
  judgement after the antagonist refused the numbers.)
- 2026-08-22 — Step 1, fifth judgement: the art director **checkpoint 2 PASS on the 3c11232
  set** ("every row of bible 11's amended state table measured ... at 1, 2.625, 3 and 4.5 dpr,
  with the live tile beneath its siblings and both neighbours' rims whole on every density
  render") and **the step SATISFIED**, the compact 56 px variant included ("the ruled ceramic
  at 56 and 64 px, a multi-letter unit one wider tile at 76 as at 90"); two SHOULDs and three
  notes. The antagonist **not satisfied** on two blocking findings, both guards and records
  rather than pixels, with two SHOULDs and five notes. Taken, each verified first: (1) the
  descender — the art director deduced from pixel rows that the band's 9 px reach exceeds
  the clearance to a descender's tail; "pig" was rendered with the p tile sounding on six
  profiles and attempt-phase ink read against the sounding render: the band hid 4.2 / 9.1 /
  4.3 / 7.3 / 4.3 CSS px of the tail (the Galaxy, the Pixel 7, the iPhone 13, the short
  stage, the landscape phone; the desktop's p misses its tile's columns). (Those were the
  first read's numbers, a loose colour match on a set since overwritten; the tight read on
  the surviving 0d887f3 set says 4.4 / 9.1 / 4.7 / 0 / 7.7 / 4.7 for the p and 4.9 / 9.5 /
  5.0 / 12 / 8.0 / 5.0 for the g, the desktop's g included — the sixth and seventh
  judgements.) The word now
  paints above the row (`.wq-word{position:relative;z-index:1}`, read by the sounding cell
  as `word-not-above`, with a plant), so no ink is hidden; the clearance itself is the
  reading surface's and is open-faults AF with the measurements. (2) The landscape record:
  AE, the cell's comment and this log said "844 × 390" and "a 268 px stage" — the device, not
  the page, and a fit arithmetic no size in the code produces; measured on the profile
  (750 × 342, a 245 px stage, the tray's first row at y = 338) and rewritten, the cell now
  reporting the page's own numbers, pinning the ten tray tiles by name and requiring AE to
  be open. (3) The live reset: the sounding cell reads the second pop too (the subject taken
  from the running `wqpop` animation, the mark handed on, exactly one live tile —
  `live-not-one`), reveal test 9 asserts the live mark at every pop, and a second mark is
  planted as a class through the reader. (4) The densities: the cell stages "animal" and
  "breakfast" and reads the band at 7 and 5 (9 on the reveal, 7 on a short stage) on every
  profile; the isolation, ink and lift controls are plants through the reader. (5) The
  provenance row's checkpoint 2 names the 3c11232 set (85 renders plus the 16-render
  descender supplement) and records that the 34355ed set it was first given on was
  overwritten by that capture; pressed captured on the Galaxy and the iPhone 13 (the face
  renders #edd07d — the arithmetic's #eed07d to one unit of the compositor's rounding — the
  bevel gone, the rim kept). (6) `docs/testing-gauntlet.md` describes what the cells and the
  reader now measure and plant; G14c says eleven controls and names the lock reader.
  (7) Tokens test 8 pins #fbe59d literally; test 10's swap is described as the demonstration
  it is; `TILE` is gone from Build-it and the lock reads `SLOT`; the slot row's compact gap
  comes from `gap()`; the Stage 0 paragraph states the compact exception; the compact
  arrangement rings meeting edge to edge are recorded in bible 11; the sentence-with-a-
  descender render goes to AF's round, since no deal produced one. Judged again by both
  chairs.
- 2026-08-22 — Step 1, sixth judgement: the art director **checkpoint 2 PASS on the
  0d887f3 set** (every hashed render matching its hash, the seven run-notes found verbatim in
  their PNGs; the letter whole in the descender junctions) and **the step SATISFIED** ("word above, clearance later" is
  the right order of paint: the thing being taught is never covered by its cue; pressed reads
  as pressed), with three SHOULDs and three notes; the antagonist **not satisfied** on one
  blocking finding, with four SHOULDs and five notes. Taken, each verified first: (1) the
  descender records said band only — the set shows the tail crossing the RING's top edge on
  the Pixel 7, the short stage, the desktop and the landscape phone, and the g, the lowest
  descender, was in no record; both descenders were read on six profiles with a tight
  colour match (the band's first row under the tile's columns against attempt-phase ink) and
  the pre-fix hiding reproduced on the same set with the word's layer planted away, so every
  number now names a surviving set and a method: AF carries both letters, the ring rows
  covered, the desktop's g (3 px into its own tile), the box-to-tile clearances and the
  shortfalls, and the stylesheet, bible 11 and the provenance row state the trade. (2) The
  reader also reads the ROW's layer, so a positioned row above the word is refused, with a
  plant. (3) Render sets live in one folder per commit from now on (`D:/CVCGame-ops/art/step1/
  0d887f3/`), the provenance row names that set and the overwrites before it, the close
  crops are cut from the hashed renders' own bytes, and the ops ledger's stale pressed note
  and first-pass junction reads are gone. (4) AE's fit arithmetic corrected to the engine's
  deal (510 for one row of breakfast's slots; a tray of 634 to 674 by the distractors), "below
  the stage's 307 px edge", the measured 334 px span; the landscape pin also requires every
  tray tile under nothing, and the "still open" check reads the heading and refuses CLOSED or
  FIXED, with fixture controls. (5) "The ring stays" corrected to "the class stays" in the
  reader, the cell and the gauntlet. Judged again by the antagonist; the art director's
  verdict stands on the construction, the records being what changed.
- 2026-08-23 — Step 1, seventh judgement: the antagonist **satisfied** ("the sixth
  judgement's blocking finding is closed in substance … what remains is record precision
  and guard coverage, none of it changing what renders"), six SHOULDs and five notes, all
  taken: the g's band top is taken from the layer-removed read and the records say so,
  naming the two cells where the kept-layer read differs; "980 of 980 … 11 left" became
  "969 of 980, a wedge at the band's corner" and "whole" was dropped for the Pixel 7; "about
  25 of 44 px" became the measured coverage (the ring's and the rim's whole top runs, the
  bowl about 30 px wide at the rim row — re-read on the hashed render before it was
  written); `faultOpen` took the positive form (a heading that ends at its opening date;
  BUILT, GATED and the wrapped "## CLOSED" now close it, with fixtures); the stage-4 and
  originality rows say their set does not survive and the stage-7 row counts the surviving
  one; the landscape pin's "under nothing" went (a cover cannot be read off the screen); the
  row-layer rule reads a static row's z-index too; the attempt-phase renders are written and
  hashed; the "only pixels differing from the 3c11232 set" claim went, the set being gone.
  The reading chair **satisfied** at its final pass ("every state of the ceramic family
  reads as what it is to a pre-reader, the word is never covered by its cue"; the descender
  trade "the right trade for a child reading" — before the fix the g's loop was sliced flat
  into a 9-like shape at the moment the child heard that sound; the ghost at .60 right; the
  compact build usable, 56 px being 12 mm on the Galaxy), with two SHOULDs on the landscape
  phone's older composition, both taken as records and gates: (1) the reveal's tile row is
  cut at the stage's clip edge there and the sentence lies out of view — and the full
  census's close and wrong reveal cells have been red on that profile since real devices
  were adopted, which nothing recorded (the gauntlet does not call the census, so no release
  was blocked) — open-faults AG for the reading surface step, the sounding cell reading the
  row and the message against the stage's edge (`row-clipped`, `message-clipped`) and pinning
  exactly that shape on the landscape phone, refusing it elsewhere, with a planted 110 px
  stage; (2) every Build-it tray on that phone sits 21 px under the strip with its box and
  centre in reach, 43 px showing of 56 — the Build-it reader now reads the visible part of
  each control inside the stage's edge (`control-clipped`), AE carries the short-word shape
  and its done means every word's tray above the strip, the cell pins "ship"'s five clipped
  tiles there, and a control brings the stage's edge to 43 px below a tile's top through
  the reader. Also recorded: the completed halo's and the arrangement ring's colour-free
  carriers in bible 11 (the halo all but vanishes in greyscale; the two rings share a
  shape). Noted for the layout step, not the material's: no per-slot mark shows which slot
  is sounding during the arrangement playback. **Step 1 closes** with all three chairs
  satisfied; the closing commit records it.
- 2026-08-23 — Step 2 opened: the section above written from bible 7, 8.1, 14 and 16 and
  the E11 lookups (`--symbol playClips`, `--symbol stopClips`, `--text "data-wq-art"`);
  the before pass requested from all three chairs, the camera-lock order question first,
  so the owner's page can carry the council's costed opinion.
- 2026-08-23 — Step 2 before pass returned, all three chairs, and the section rewritten.
  **Art director: order D** (the wiring, the states and the cells now with a token-only
  placeholder under the owner's "who draws" ruling; the pixel seed at step 6 to the locked
  camera; A about 5–7 working days before any wiring is judged and a camera decided before
  the frame; C refused by bible 17's standing rule); three blocking: the place ("beside the
  speaker control" is the grown-up strip, a wrapping one, on two screens and a full-width CTA
  on the third — out of flow in the stage's top corner instead, the free sky measured per
  profile), the notan criterion ("second brightest" is false: cyanElectric is the seventh
  value on the screen; the rim's 3.15:1 step carries the lit state), no transition (the
  motion cell counts CSSTransitions). **Reading chair: B with the place decided now and
  kept** (the same build as D); three blocking: the place, the "audio unavailable" state that
  does not exist (with sound off the replay control is live and silent — `canReplay` never
  reads `settings.sound`), and the scaffold's one-clip-per-900-ms plays that would blink the
  object. **Antagonist: B**; six blocking: the premise — the players report no completion
  (`onScheduled` once, with a length; no `onended`; every end a `setTimeout`), so "no clock
  of its own" needs real events or an honest timer; the planted-clock control unprovable by
  timing alone — the detector must watch the AudioContext (a wrapped `createBufferSource`, a
  MutationObserver, a 1,500 ms suspend as the timer/event separator); the transition; the
  unavailable state; the place; the derivative check that nobody built. Every finding
  verified against the code and taken; `onended` probed under headless Chromium before the
  design was committed (natural end, stop, and a 1,500 ms suspension delaying it by 1,500 ms).
  The section now carries the corrected premise, the event source, stage 0 measured, the
  notan criterion, the tokens with 9.3's note amended, the four rulings for the owner's page
  (the order; the scaffold (a)/(b); the fallback (a)/(b); the sound-off sentence), the E11
  list with five mocks and the gates the first draft missed, and the cells of done means.
- 2026-08-23 — Step 2 built ahead of the page on the council's recommendations (the section
  records what and the counts). The event source, the component, the three looks, the
  sound-off state, the scaffold's quiet rule, the cell with the audio probe and its three
  separating plants, the provenance row and its lock reader, tokens test 13, the records.
  Checkpoint 1 (the greyscale notan with the word) and the after pass requested next; the
  owner's page may change the scaffold, the fallback or the sentence, each a small change
  on a green build.
- 2026-08-23 — The owner ruled all four of step 2's questions, each as the council
  recommended and each as the build had already been made: **order D** (the placeholder
  approved, the pixel seed at step 6), **the scaffold quiet**, **the device voice dark**,
  **"Parent: sound is off"**. Nothing changed in the code on their return; the rulings are
  recorded in this section, in bible 7, in the provenance row (whose placeholder is now
  owner-approved rather than pending) and in the comments that cited the page.
- 2026-08-23 — Owner-ruled, the council's third seat: "Keep adversarial mandate but switch
  to a software engineering and programming expert". The mandate does not change - it has
  earned itself, catching in two steps a false premise the whole step 2 brief rested on, a
  reset no guard covered, and numbers quoted from a render set that no longer existed - and
  the seat is now a practising engineer's, with the ordinary specialist questions (lifecycle
  edges, event ordering, error paths, resource release, a test that proves a behaviour
  against one that repeats it) added to what it already asked. Seated from step 3's before
  pass; step 2's passes ran under the older framing and no rule moved.
- 2026-08-23 — **Step 2's first after pass** (the three chairs on the built object, before
  any owner ruling). Verdicts: art director NOT SATISFIED, reading chair NOT SATISFIED,
  antagonist NOT SATISFIED. Seven fixes were taken, each verified before it was taken: the
  silhouette went off-axis in both directions and into the provenance lock as `radius` plus
  `coreOffset`, with a control that refuses it by name when the core returns to an axis; the
  scaffold's quiet stopped ending on a clock and started ending on the last slot's own
  report; a win landing mid-scaffold lifted the quiet, so the celebration is not spoken over
  a dark object; a child on the first rungs with sound off is refused a session they cannot
  answer, in the chooser's own voice; the census graded the replay control AFTER the grade
  rather than before; `glowseedHold` sliced all three logs; and doc-truth's state-table rule
  became per-table with a control that deletes the Glowseed's own table. Two findings were
  verified FALSE and NOT taken — an audit that claimed the word bank had never been screened
  since the 461→1,123 cutover (SPEC records a dated whole-bank screen on 2026-08-20, all
  1,123 read, and the bank has not changed a word since), and a chair calling a live Build-it
  state dead.
- 2026-08-23 — **Step 2's re-judgement**, the three chairs on the fixed build with 72 renders
  shot from it, then two independent verification lenses over all 29 findings. The lenses
  agreed on every one but two severities, and **withdrew one**. Verdicts: all three chairs
  NOT SATISFIED, and on one theme — the code fixes were real and three of them were guarded
  by tests that passed identically on the broken build. Taken and closed: buildit 26c holds
  the scaffold's last slot's report and stands past the old clock (it fails on the reverted
  build, measured); 26d wins mid-scaffold and reads the object; three Glowseed app mutants
  were added, the family having had none, each applied by hand and watched to fail its named
  test; the refusal sentence moved from `ink2` (3.91 / 3.81 / 4.17 on the sky stops, under
  the 4.5 floor at 12.5 px) to `strip` (4.75 / 4.63 / 5.07) and is now named by the control
  it explains, with reveal 15f asserting both; and the lost audio end, which this plan
  claimed the turn's 10 s guard caught and it did not, is caught by a net the player carries,
  guarded in the real module with a control that removes it. Still open at the time of
  writing: **checkpoint 2's missing render** — Build-it's arrangement playback, the one
  screen where the object's lit rim and the slots' arrangement ring are the same token — put
  to the owner as a decision.
- 2026-08-23 — **Step 2 CLOSED.** The owner ruled the one open decision — the collision at
  Build-it's arrangement playback — with "shoot it and judge". It was shot on three phones,
  colour and greyscale, and the collision does not occur. The two marks share
  `purpleStructural` and nothing else, and the sharing is thin at both ends: the object's rim
  owns 1.7–2.2 % of the screen's purpleStructural, the three rings carrying 44–59× it, and
  that token is only 20–22 % of the object's own lit ink. `purpleElectric` and `cyanElectric`
  occur ONLY inside the object's 20 × 24 footprint — measured twice by different instruments,
  the art director's pixel census over the frame and an independent CSSOM sweep across every
  element and pseudo-element, which found each token on exactly one node. The marks sit
  201–288 CSS px apart in different zones, and the object's total lit ink (176–196 CSS px²)
  never approaches the miss sentence's (713–917) or the rings' (1,902–2,237). Checkpoint 2
  PASSES; no token change was required.
  **One measurement went against the design and is recorded rather than buried:** in
  greyscale the two marks are the SAME VALUE, 80 against 80. Value does not tell them apart —
  shape, size, internal structure and position do, checked by eye at 12× on the grey render.
  A later claim that greyscale separates them by tone would be false, and is measured false.
  **The reduced-motion render, the last open deliverable, was shot** rather than retired: on
  two phones it is BYTE-IDENTICAL to the lit render, in colour and in greyscale, so stage 7's
  criterion is proved rather than argued from the absence of motion properties.
  Coverage limit, stated rather than estimated: arrangement playback exists on three phone
  profiles only. Desktop and the short iPhone have no Build-it renders in any set — the same
  coverage checkpoint 1 accepted — and on the landscape phone the object is `display:none`
  under the 400 px rule, so no collision is possible there.
- 2026-08-23 — Owner-ruled, the Glowseed's lit rim: **keep `purpleStructural`**. Offered the
  alternative of another approved neon, the owner asked what it would cost and the
  measurement answered: the value collision the art director recorded is ARITHMETIC, not a
  choice — a rim dark enough to read on the pale sky must be near luma 80, and the
  arrangement ring is near luma 80 for the same reason, so no approved neon escapes it.
  `coralElectric` is the only one nothing else uses and it is 1.56:1 against the sky, which
  would make the rim nearly invisible; `amber` is the only viable swap and is both slightly
  lower contrast than today and already the "now" segment's marker. Keeping it costs nothing
  a child can see, and the separation the chair measured — 44–59× the ink, 201–288 CSS px
  apart, in different zones, with two tokens exclusive to the object — does the work.
  The owner added a standing wish with it: **"I want to find a use for that unused neon
  too sometime."** Recorded in bible 9 beside coral's own row, with what it can and cannot
  be, so a later step reaches for it rather than a later tidy-up deleting it.
- 2026-08-24 — **The owner's device check found three faults the whole apparatus could not**,
  and the third is the one worth keeping. Beta 27 shipped green on everything: gauntlet 29/29,
  census 108/108, `npm run check`, a five-lens adversarial sweep with two verifiers a finding,
  three council chairs, two engineering passes. He then held the phone for five minutes.
  (1) A pre-level item never played its own question — the screen asked "What word do the
  sounds make?", showed an ear, and was silent, because nothing ever called the prompt on
  arrival. usePre.js had SAID it did since the ladder shipped. (2) Skip could never be used
  while a sentence was read. (3) **The muted Glowseed was invisible.** Every gate passed and
  every one of them was measuring the right thing: the census read the DOM state, provenance
  derived the lock, and the art director measured 434 rim pixels against idle's 826 and was
  CORRECT that they differ. What none of them asked — what none of them CAN ask — is whether a
  person can see it. That is the boundary of this apparatus, found by a parent's eye in five
  minutes, and it is why the QA script on a real device is a gate and not a courtesy.
  All three ruled by the owner the same day and fixed under a before pass that named, in
  advance, the two crashes and the live-no-op control the naive fixes would have shipped.
