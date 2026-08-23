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
   milestone reveal screen, built once. 7 to 9. States 1 to 10, one reviewed milestone at a
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

### Step 2 — the Glowseed tied to the real audio lifecycle (opened 2026-08-23; the council's before pass first, then the owner's page on the order)

**What the child gets.** One small object in the reading frame that is lit exactly while
recorded teaching audio plays and dark otherwise (bible 7): a pale low-contrast core with a
muted stone rim at rest; an electric-cyan core inside a thin ultraviolet rim while a word
plays, steady, no pulse; the same but subordinate to the sounding tile while single sounds
play; a muted object beside a disabled speaker control and a plain sentence when audio is
unavailable; an immediate static change under reduced motion. No face, mouth, eyes, limbs,
grille, text or character behaviour. It never replaces the speaker control ("Hear the word
again", "Hear it again", "Hear the word", "Hear the sound"), which keeps its accessible
name and its 44 px; it is secondary to the sounding tile, which keeps the child's eye.
Active begins and ends with the audio's own start and completion — the players already
report both (`speakVoice` and `playClips` call `onScheduled(ms)` once their clips are
scheduled; `stopClips` ends them; the silent pack's backstop ends the turn), and the
Glowseed reads those events and no clock of its own (7's ruling). On the system-speech
fallback, whose length nobody reports, it shows the steady active state from the
utterance's start event to its end event if the browser gives them, and otherwise stays
idle — "unknown duration means no guessed timed animation" (14).

**The question the before pass settles first, for the owner.** Section 17's ruling locks
the camera — one viewpoint, one ground plane, one key-light direction, one module — at the
garden's stage 3, "before any state-0 pixel is placed, because the camera is the one
irreversible decision eleven states, the Glowseed and the guide share". The owner-ruled
order puts the Glowseed at step 2 and the garden at step 6. A pixel Glowseed drawn now
would be drawn to a light that does not exist yet. Three ways, costed for the owner on a
page: **A** — bring the garden's stages 0 to 3 forward into this step (output conditions,
the reference board, the notan with the word, the numeric lock), take the camera-lock
checkpoint, then draw the Glowseed to it; **B** — this step is the wiring and the states,
with the object drawn as a CSS family from tokens (a core, a rim, a glow) like the tiles,
and a pixel Glowseed only if the garden's step finds the CSS one wanting — which amends
8.1's row the way the tile row was amended; **C** — a pixel Glowseed with a light of its
own, to be redrawn at step 6 (draws an asset twice and breaks "one key light" — not
recommended). The implementer's recommendation goes on the page with the measurements:
how many bytes and files each way, what the census can already measure (the snap cell's
first real subject under A or C, nothing new under B), and what each way leaves for the
garden's step.

**How it is made — the construction order.** Stage 0: the logical grid is the object's
box in CSS px on the three crops, measured in the frame beside the speaker control; the
byte share 524,288 (A or C: two states × three crops × two scales; B: spent at 0, as the
tiles'); a provenance row opened. Stage 1 (A or C): a reference board — a seed, a glass
bead, a pilot lamp — each reference answering a named question, source and licence in the
provenance row, nothing copied. Stage 2: the notan — the reveal, the sentence reveal and
Build-it as two and three values with the word, the tiles and the speaker control drawn
in, the Glowseed at rest and lit, on 320 × 658 and 390 × 664: the lit core must be the
second brightest thing after the word's ground and never the first. Stage 3 (A): the lock
— the key light's offset and the module, in provenance as numbers. Stage 4
(**checkpoint**): greyscale renders with the word. Stage 5: `cyanElectric` core,
`purpleStructural` rim (the "thin ultraviolet rim"; 9.2: electric glow always outside a
darker structural edge), `slot` and `boundary` or `disabled` for the muted states — tokens
only, a three-step ramp per material, inside 9.1's 1–3 % for an ordinary screen **with the
sounding tile's band counted in the same budget**, since both are lit during a sound-out.
Stage 6: binary alpha (A or C). Stage 7 (**checkpoint**): the states one by one, each a
render. Stage 8 (A or C): 1× master under `tools/art/masters/`, 2× and 3× under
`app/public/art/`, no gAMA or iCCP, pixel-equals-token, the derivative check's control.
Four audits: geometry (the box identical across states — an indicator that changes size
is a pulse), value, originality and answer-clue (a lit seed says nothing about the word),
final on the eight profiles.

**The wiring, which is the step whichever way the owner rules.** `voicepacks.js` gains
one small event source — `onAudio(listener)` reporting `{ state: "start" | "end",
kind }` — fed by the three places that already know: `playClips` when it schedules (start,
and end at the measured length it already reports), `stopClips` (end), and the callers'
backstops in `App.jsx` (`playBuildWord`, `playBuildSounds`, the reveal's once-with-a-
backstop) when they fire first. The Glowseed component subscribes and renders a state
class; nothing else changes. Reduced motion: the CSS transition is zero under
`prefers-reduced-motion`. The "audio unavailable" state follows the existing pack-missing
and sound-off paths (`noteFallback`, the settings' sound switch): the object muted, the
speaker control disabled with its existing explanation.

**Breaks (E11), named before the change.** Seven test files mock `voicepacks.js`
(`tests/buildit.test.js`, `models`, `names`, `reveal`, `safety`, `sentence`,
`voicepacks`): a new export must be in every mock or the component throws at render — the
lookup `node tools/blast-radius.mjs --symbol playClips` lists them. The monkey's
`SOUND_ONLY` exemption says the replay controls "show nothing new": with the Glowseed they
light it, which the monkey's signature (text length, element count, active element) does
not read — the reason text changes, the exemption stands. `tests/census/novelties.spec.mjs`'s
motion cell counts running animations during a clip: a CSS transition on the Glowseed is
not an animation, and the cell must say why it is allowed (14: synchronize only the
sounding tile, the Glowseed and a conventional indicator). The snap cell gets its first
real subject under A or C (`data-wq-art`, `data-wq-art-w/h`, `image-rendering:
pixelated`, the 2×/3× file picked by dpr and snapped in code). The electric-area figure in
provenance (0.44 % for the band alone) becomes band plus core. The aria snapshot of home
does not change (the Glowseed is not on home's chrome until the garden lands — to be
confirmed by the before pass against 13.1). G11's copy lint reads any new parent-facing
sentence ("Sound is off" beside the muted object). `docs/effect-map.md` gains the
Glowseed's effects. Counts that move: `census_novelty_cells` and `_controls` (a Glowseed
cell: lit exactly between the start and end events, with a planted clock-driven light and
a planted light-before-start refused; the reduced-motion cell), `g20_tests_mapped`,
`g17_governing_files` if a new file is declared, `g23_declared` for the masters and the
exports.

**Done means.** The object is lit from the audio's own start to its own end and never
otherwise, on the pack and on the fallback, with the silent-pack backstop ending it; the
four states render as bible 7's table as amended by the owner's ruling; the snap cell (A
or C) and the motion cell are green; the art budget and the derivative check are green;
the art director's two checkpoints (and, under A, the camera lock) and the three-chair
after pass are recorded here; the provenance row is closed.

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
