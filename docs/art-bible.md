# Word Quest — art and interaction design bible

**This document owns** the visual and interaction rules of Word Quest — the art bible,
v1.0 of 2026-08-21, brought into the repository — and every ruling made on those rules
since, recorded under the section it changes so each section and its rulings are read
together and stay consistent.
**It does not own** behaviour (SPEC.md), the safety rules (CLAUDE.md S1 to S9), the gates
that enforce any of this (`docs/testing-gauntlet.md`), the work plan and the council's
verdicts (`docs/art-plan.md`), or an asset's provenance (`tools/art/provenance.json`).

Converted from the owner's PDF "Word Quest Art Design Bible v1.0" (19 pages, IP-neutral
production specification, August 21, 2026) on 2026-08-22 at the owner's instruction:
"ongoing decisions on art and design should be captured permanently ... so they survive as
rulings within the design bible". The PDF remains the source of the six schematic figures;
the words are all here. Where this document and SPEC.md conflict, SPEC.md controls
(section 1 below says so itself).

One word is changed throughout: where v1.0 says the colour between blue and purple by
its usual name, this document says **purple**, because that usual name is also a family
name the private S9 list refuses in any file of this repository — in prose and inside a
token key alike. The three token keys are therefore `skyPurpleMist`, `purpleStructural` and
`purpleElectric` here and in `C`; the PDF's names for them are the only difference.

A **Rulings** block under a section is the owner's, dated. A rule without a Rulings block
stands as v1.0 wrote it.

This document follows the Microsoft Writing Style Guide.

## 1. Purpose and authority

This bible defines the visual and interaction language for Word Quest, an early-reading
phonics game for children aged 4–7. It is written for human artists, UI implementers, AI
coding agents, concept-generation tools, accessibility reviewers, and visual QA reviewers.

It does not replace the repository's behavioural, curriculum, safety, privacy, audio, or
testing specifications. Where this document conflicts with those sources, the repository's
governing functional specification controls. This bible governs visual expression, except
where visual behaviour is inseparable from instructional safety or accessibility.

**Visual north star.** A quiet, luminous garden reading nook rendered with modern
pixel-constructed scenery around a stable, high-clarity teaching field. The world is warm,
gently magical, and contemporary. Electric cyan, ultraviolet purple, and coral-orange appear
as controlled light rather than as constant decoration. Words, sentences, and sound units
remain live, conventionally rendered text in the already approved in-game teaching typeface.
During reading, the garden recedes and the letters govern the screen.

### 1.1 Settled experience decisions

- Audience: ages 4–7.
- Normal reading sessions always assume an adult is present.
- Emotional centre: quiet concentration, supported by cozy companionship and gentle wonder.
- The product is a reading tool inside a light game-world wrapper.
- One core style becomes slightly richer at later milestones.
- Phone, tablet, and desktop are equal first-class targets.
- The existing approved teaching-font character, size, clarity, and double-storey a are
  preserved.
- One garden changes cumulatively after every tenth level; there is no moving map.
- The Glowseed is the locked world-integrated audio indicator.
- Production language is IP-neutral and does not direct imitation of a named commercial work.

**Rulings (2026-08-22).** The project is run with a council of three read-only expert
reviewers — a digital art director, an early-reading and accessibility specialist, and an
engineering antagonist — who review before and judge after every step; `docs/art-plan.md`
owns how that works and what they ruled.

## 2. Governing priority order

1. Phonics and reading truth
2. Teaching-text clarity
3. Stable layout and predictable interaction
4. Accessibility and touch safety
5. Child–adult control separation
6. Emotional calm
7. Visual hierarchy
8. Garden continuity and progression
9. Colour, lighting, and material richness
10. Decorative detail

**Hard rule.** Decoration must yield before teaching text becomes smaller, less clear, more
crowded, or less stable.

## 3. Instructional safety

### 3.1 The child reads first

During an unassisted word or sentence attempt, no visual element may provide the answer
before the child tries to read it.

- No sound-unit segmentation or pronunciation audio.
- No picture, silhouette, prop, or scenery that depicts the answer.
- No permanent colour code for vowels, consonants, digraphs, or target sounds.
- No guide character mouthing or demonstrating a sound.
- No underline, glow, changed letterform, or motion that isolates the relevant unit.

### 3.2 Fixed word geometry

The principal word's baseline, horizontal centre, scale, weight, and letter spacing remain
unchanged from attempt through feedback. Reserve the tile and message slots before they are
populated.

### 3.3 One event at a time

During spoken feedback, the sounding tile is the principal visual event. The Glowseed is
secondary. Ambient animation pauses or becomes imperceptible; the guide is absent.

### 3.4 Informative correction

Different Build It arrangements receive neutral purple or amber grouping while audio explains
what the child built. Never use red flashes, shaking, sad faces, broken objects, defeat
language, or a failure buzzer.

*Figure 1 (PDF): schematic teaching sequence. Typography shown there is illustrative, not a
replacement-font approval.*

**Rulings (2026-08-22).** These four rules are already the repository's: S2 (the word is
never spoken before the attempt ends), the census's phase walk (the screen holds still
through ready, reveal and next), S3 and the copy gate's banned words. They are measured, not
restated, and the art project adds cells rather than prose — see section 19's rulings.

## 4. Visual identity

### 4.1 Character

- Carefully made rather than procedurally noisy.
- Colourful rather than sugary.
- Magical through light and material, not spectacle.
- Welcoming to a four-year-old without appearing babyish to a seven-year-old.
- Contemporary while retaining visible pixel construction.
- Quiet enough for repeated five-to-eight-minute sessions.

### 4.2 Exclusions

- 3D scenery reduced to pixels; video backgrounds; dense parallax.
- Combat, danger, urgency, or threat.
- Dark reading surfaces, scanlines, CRT distortion, glitch, or chromatic aberration.
- Universal black outlines or permanent particle fields.
- Decorative letters, faux runes, or answer-related props near teaching content.
- Platform emoji as the final prominent child-facing icon family.

### 4.3 Portfolio balance

| Contribution | Share | Purpose |
|---|---|---|
| Finely constructed illuminated pixel environments | 45% | Atmosphere, material, and milestone richness |
| Warm plain garden and domestic forms | 35% | Readability, comfort, and age-appropriateness |
| Contemporary electric accents | 20% | Precise playback, focus, and milestone light |

**Rulings (2026-08-22, icons).** The emoji-to-icons change is two steps: first every
control gets an aria-label without emoji and every locator in tests, tools and documents
moves to it, with no visible change; then original icons arrive screen by screen, and the
text label stays beside the icon. Measured at the ruling: 35 distinct emoji, 77 uses, named
in 104 places across 22 files. A single swap was refused.

## 5. Responsive composition

There is no primary device. Phone, tablet, and desktop compositions are all deliberate. The
extra space on larger screens belongs to garden framing and the grown-up zone, not to
excessively long lines of teaching text.

| Class | Reference | Purpose |
|---|---|---|
| Compact portrait | 320 × 568 | Minimum supported teaching viewport |
| Regular phone | 390 × 844 | Common portrait handset |
| Tablet portrait | 768 × 1024 | Wide portrait composition |
| Tablet landscape | 1024 × 768 | Teaching stage plus stable adult rail |
| Laptop | 1366 × 768 | Short desktop height |
| Desktop | 1440 × 900 | Full garden framing without expanding line length |

### 5.1 Content-first breakpoints

- Compact below 480 px: bottom grown-up strip; scenery restricted to corners and edge bands.
- Medium 480–767 px: bottom strip; modestly wider reading field.
- Wide 768–1199 px: stable right-side adult rail may be used; garden occupies side margins.
- Extra wide 1200 px and above: the shell expands but teaching line length remains bounded.
- Short below 620 px usable height: remove or simplify decoration before reducing type.

### 5.2 Preferred maxima

| Content | Preferred maximum |
|---|---|
| Word stage | 520 CSS px |
| Sentence stage | 640 CSS px; natural wrapping |
| Build It stage | 540 CSS px |
| Child target | 56 px minimum |
| Adult target | 44 px minimum |

*Figure 2 (PDF): responsive zoning. Garden detail reduces before teaching typography
changes.*

**Rulings (2026-08-22).** The census measures eight device profiles, not six: these six
plus a real 320 px device and a fractional-scale Android (Pixel 7); the two extras stay.
The garden frame is a fixed background layer that adds 0 px to the stage's layout height
on every profile — a census cell, because on 320 × 568 the session screen has already spent
its height and a frame in flow would push the rail off the screen.

## 6. Garden world and milestone states

The game uses one persistent garden reading area. It begins as a simple seed terrace and
becomes more complete after every tenth level. The reading field remains recognizably the
same place in every state. No scenery depicts the current word.

| State | After | Cumulative reveal | Teaching constraint |
|---|---|---|---|
| 0 | Start | Seed terrace, moss edge, young sapling, Glowseed cradle | Minimal peripheral detail |
| 1 | Level 10 | Three small warm/cyan blooms | Static during prompts |
| 2 | Level 20 | Narrow mosaic or ceramic border | Outside text field |
| 3 | Level 30 | Low vine trellis | Far edge only |
| 4 | Level 40 | Small still-water basin | No sparkle loop |
| 5 | Level 50 | Modest tree canopy | Upper edge only |
| 6 | Level 60 | Reading arch or pavilion edge | Behind the field |
| 7 | Level 70 | purple night blooms and luminous buds | No continuous pulse |
| 8 | Level 80 | Weatherproof story niche or ceramic panel | No readable microtext |
| 9 | Level 90 | Abstract star lattice | Must not resemble letters |
| 10 | Level 100 | Completed sanctuary illumination | Richest state; calm field |

*Figure 3 (PDF): schematic cumulative garden states. Production assets require compact,
portrait, and wide crops.*

### 6.1 Milestone reveal

- Complete the ordinary session before the reveal.
- Present a separate two-to-three-second scene.
- Reveal only the newly added feature.
- Use a short fade or restrained pixel dissolve.
- Return to the home screen with the new state already settled.
- Reduced Motion uses an immediate cut or short crossfade.

**Rulings (2026-08-22, state 10).** The engine had no "after level 100": promotion stops at
100 and nothing records that it was finished. The ladder is complete when the child is at
level 100 and its words are secure by the same promotion rule (`isSecure`) every earlier
level used; the garden state is `floor((level − 1) / 10)`, and 10 when the ladder is
complete. It is a pure function in the reference build with literal tests and a mutant,
and SPEC section 7 states it. Reached by a grown-up jumping the level in the corner as
honestly as by a child climbing.

## 7. Glowseed

The Glowseed is the locked world-integrated indicator for recorded teaching audio. It
remains secondary to the currently sounding tile and never replaces the accessible speaker
control.

| State | Appearance |
|---|---|
| Idle | Pale low-contrast core; muted stone rim; no glow |
| Word playback | Electric-cyan inner core; thin ultraviolet rim; steady illumination |
| Sound-unit playback | Same, but subordinate to the sounding tile |
| Audio unavailable | Muted object plus disabled speaker control and explanation |
| Reduced Motion | Immediate static illumination; no transition |

- No face, mouth, eyes, limbs, speaker grille, text, or character behaviour.
- No repeated pulse, bounce, rotation, or particles.
- Active state begins and ends with actual audio start and completion events.
- The Glowseed persists in all eleven garden states.

*Figure 4 (PDF): locked Glowseed anatomy and behavioural limits.*

**Rulings (2026-08-22).** The audio lifecycle it hangs off already exists: the players
report when they finish (`playSounds(ids, then)`), the pops land on measured clip edges,
and the turn ends when the sound does. The Glowseed reads those events and no clock of
its own; a silent pack's backstop ends it the way it ends the turn.

## 8. Pixel construction and rendering

### 8.1 Split rendering model

| Pixel-constructed | Live conventional rendering |
|---|---|
| Garden scenery | Words and sentences |
| Decorative frames | Grapheme text in tiles |
| Original icons | Child instructions and button labels |
| Milestone art | Adult data, settings, and reports |
| Glowseed; tile material as a CSS family since art step 1 (2026-08-22: a raster 9-slice cannot follow svh-sized boxes on the 2.625 and 4.5 profiles without the stretch 8.2 forbids; letters are live text either way) | Focus geometry and accessibility text |
| Optional guide | All teaching copy |

**Hard rule.** Never rasterize a teaching word into scene art and never apply a pixelation
filter to live text.

### 8.2 Logical pixel grid

- Author environmental assets on a fixed logical grid.
- Export logical pixels at integer physical scales, commonly 2× or 3×.
- Use nearest-neighbour scaling for pixel art.
- Avoid non-integer sprite scaling that creates uneven pixel widths.
- Use normal browser antialiasing for text and SVG interface symbols.

### 8.3 Edge and detail hierarchy

- Separate scenery mainly through value and hue.
- Use selective dark accents at contact boundaries and seams.
- Interactive tiles and controls receive clearer structural outlines.
- No decorative object has more local contrast or finer high-frequency detail than the
  teaching word.

**Rulings (2026-08-22, fractional screens).** Two census profiles have no integer scale:
the Pixel 7 renders at 2.625 and the Galaxy S9+ at 4.5. Pixel art is sized in code so
that every logical pixel lands on a whole number of device pixels (the CSS size snapped to
`k / devicePixelRatio`), and the census measures that it did on both profiles. Assets are
authored at 1× logical and exported at 2× and 3× (section 16's ruling); "integer scales
only" is a rule for the export, never for the screen.

## 9. Colour and lighting

| Role | Token | Value | Use |
|---|---|---|---|
| Principal ink | ink | #17356B | Teaching letters and high-priority text |
| Secondary ink | inkSecondary | #3C4F73 | Supporting text |
| Reading surface | surfaceReading | #FFF9E8 | Word and sentence field |
| Panel surface | surfacePanel | #FFFDF5 | Cards and controls |
| Sky blue | skyBlue | #8FD0FA | Existing outer gradient |
| lavender | skyLavender | #B9C3FB | Existing outer gradient |
| purple mist | skyPurpleMist | #D9C6FB | Existing outer gradient |
| Garden night | gardenNight | #1D2C50 | Deep framing |
| Garden teal | gardenTeal | #2E7D78 | Foliage shadow and water |
| Moss | gardenMoss | #5E8057 | Ground and foliage |
| Action | action | #2057C9 | Principal child action |
| Success | success | #18794E | Completion |
| Structural cyan | cyanStructural | #005A67 | Accessible edge beneath glow |
| Electric cyan | cyanElectric | #4EEBFF | Playback glow only |
| Structural purple | purpleStructural | #5B3FD6 | Accessible purple edge |
| ultraviolet | purpleElectric | #9B75FF | Rare milestone/Glowseed rim |
| Coral-orange | coralElectric | #FF775E | Warm decorative light |

### 9.1 Electric-colour budget

- Ordinary screen: approximately 1–3% of visible area.
- Feedback or ordinary completion: up to approximately 5%.
- Major milestone: briefly up to approximately 8%.
- Electric hues never serve as ordinary body text or the sole contrast boundary.

### 9.2 Lighting

The reading surface remains evenly lit warm ivory. Environmental twilight colour surrounds
it but never casts coloured shadows across teaching letters. Electric glow always sits
outside a darker structural edge.

**Rulings (2026-08-22, tokens).** The palette has one source: `C` in
`reference/word-quest.jsx`, the one-file reference build E2 protects, which the app
imports from the engine. The bible's tokens are added to `C` by name; the CSS custom
properties are generated from `C` at build and never typed a second time; doc-truth
cross-checks the values in appendix A below against `C`. Three tokens failed the bible's
own 3:1 boundary rule (section 15) when measured — tileEdge #B8832E on tileFace #F6D985 at
2.40:1, line #92A5BF on surfacePanel at 2.47:1, disabled #9FB4C4 on surfacePanel at 2.10:1
— and are darkened to clear 3:1 before they are typed into any file: section 9.3 below
carries the corrected values (tileEdge #8f6420 at 3.78:1, boundary #5f7493 at 4.68:1;
disabled kept as a fill under ink only). Measured and passing: ink on
surfaceReading 11.36:1, cyanStructural on surfaceReading 7.51:1, action with white 6.43:1.
The rule met its own sweep the same day (the re-judgement of step 0): two edges the game
already drew were typed into C as tokens without being measured — the empty slot's dashed
border #94a8c0, 1.94:1 on its ground, and the progress ring #e0ac2b, 1.44:1 on sun — and
were withdrawn; the slot reads `boundary` (4.77:1 on paper, 3.79:1 on its lowest-ratio ground, the lavender stop)
and the ring reads `amber` (4.11:1 on sun), a visible darkening of both, declared.
`tests/tokens.test.js` asserts the bible's four structural edges, the slot's edge and the
ring at their literal ratios and holds the two withdrawn values below 3:1 as controls. One
edge the game draws is still below the rule and is not hidden by that sentence: `line`,
the adult controls' edge, 1.26:1 on paper and 1.07:1 on chip (the third judgement of step
0, 2026-08-22; `docs/open-faults.md` AA, the grown-up-zone step's declared change), held
at its literals by the same test. The open sentence word's `action` ring (2.95, 2.88 and
3.15:1 on the stops; the fourth judgement, open-faults AB) was moved to `cyanStructural`
by art step 1 the same day, 4.73 / 4.61 / 5.05:1, and AB is closed.

### 9.3 The repository's tokens (ruled 2026-08-22)

The one statement of the palette in prose. `C` in `reference/word-quest.jsx` is the source;
this table is bound to it by doc-truth rule 11, by name and value, in both directions, so
the two cannot disagree. The thirteen keys the game already had come first, unchanged;
the bible's tokens follow as additions, under the repository's names where a bible name
collided or a value was darkened (section 9's ruling above). Appendix A keeps v1.0's names
and values as the record of what the PDF said.

| key | value | note |
|---|---|---|
| ink | #17356b | the game's own, unchanged |
| ink2 | #3e5aa6 | the game's own, unchanged |
| muted | #5a6ba8 | the game's own, unchanged |
| strip | #455073 | the game's own, unchanged |
| action | #c9402f | the game's own, unchanged; it drew the open sentence word's ring at 2.95, 2.88 and 3.15:1 on the gradient's stops until art step 1 moved that ring to cyanStructural (open-faults AB, closed 2026-08-22) |
| green | #0f7a4f | the game's own, unchanged |
| amber | #8a5a00 | the game's own, unchanged; and since 2026-08-22 the ring round the current progress segment (4.11:1 on sun) |
| amberInk | #6b4600 | the game's own, unchanged |
| red | #c8342f | the game's own, unchanged |
| purple | #6b4bbf | the game's own, unchanged |
| sun | #ffd166 | the game's own, unchanged |
| chip | #e8ecf7 | the game's own, unchanged |
| line | #dfe5f3 | the game's own, unchanged: the adult controls' edge - the corner's inputs and the strip's buttons on paper at 1.26:1, the to-do progress ring on chip at 1.07:1 - below the 3:1 rule, recorded in open-faults for the grown-up-zone step (step 4) to darken |
| inkSecondary | #3c4f73 | supporting text (bible 9) |
| surfaceReading | #fff9e8 | the word and sentence field |
| surfacePanel | #fffdf5 | the crash screen's ground today; cards and controls when the grown-up-zone step moves them off paper (the re-judgement of step 0, 2026-08-22: the table named cards under two tokens) |
| skyBlue | #8fd0fa | the outer gradient, first stop; retyped by value in `app/index.html` and `app/public/manifest.webmanifest` as the theme colour, the two files that cannot import C |
| skyLavender | #b9c3fb | the outer gradient, second stop |
| skyPurpleMist | #d9c6fb | the outer gradient, third stop |
| gardenNight | #1d2c50 | deep framing |
| gardenTeal | #2e7d78 | foliage shadow and water |
| gardenMoss | #5e8057 | ground and foliage |
| gardenLeaf | #7fa660 | leaf |
| stone | #b9b1a0 | stone |
| wood | #97684f | wood |
| actionBlue | #2057c9 | the bible's principal child action; C.action stays the CTA's red until a step changes the CTA |
| success | #18794e | completion |
| warning | #8a4b00 | warning text |
| danger | #a83737 | danger |
| boundary | #5f7493 | the bible's line #92A5BF darkened: 2.47:1 to 4.68:1 on surfacePanel; and since 2026-08-22 Build-it's empty-slot dashed edge (4.77:1 on paper, 3.79:1 on the slot's ground) |
| disabled | #9fb4c4 | a FILL under ink (5.57:1); never an edge - it is 2.10:1 on the panel |
| cyanStructural | #005a67 | the accessible edge beneath a glow, 7.51:1 on surfaceReading |
| cyanElectric | #4eebff | playback glow only, never a boundary |
| purpleStructural | #5b3fd6 | the accessible purple edge |
| purpleElectric | #9b75ff | rare milestone and Glowseed rim |
| coralElectric | #ff775e | warm decorative light |
| amberFill | #f4b942 | the bible's amber; C.amber stays the amber TEXT |
| tileFace | #f6d985 | the ceramic tile's face |
| tileHighlight | #fff1b5 | the tile's highlight |
| tileEdge | #8f6420 | the bible's #B8832E darkened: 2.40:1 to 3.78:1 on tileFace |
| slot | #e6dccb | the empty slot's fill and a used tile's face since art step 1 (2026-08-22); boundary on it 3.51:1, ink on it 8.80:1 |
| tileFaceLit | #fbe59d | the sounding tile's face: tileHighlight at .5 over tileFace, an 11.4 % lift in relative luminance (bible 11's 8-12 %), ink on it 9.55:1 (art step 1, 2026-08-22) |
| paper | #ffffff | white surfaces: cards, inputs, the modal, the CTA's text (entered 2026-08-22, the after pass on step 0) |
| warningDeep | #96261d | the home strip's storage warning, 4.5:1 on the gradient (2026-08-22) |
| chipGreen | #c6f2dd | the corner's mastery chip: read right twice (2026-08-22) |
| chipAmber | #ffe9b3 | read right once (2026-08-22) |
| chipRed | #ffd4d0 | not yet (2026-08-22) |

## 10. Teaching typography

### 10.1 Approved stack

`ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif`

Preserve the current approved teaching-font character, including the double-storey a. Do
not substitute a single-storey-a font. Do not bundle or redistribute proprietary system
fonts without permission. A narrower font may not be introduced merely to solve layout
pressure.

### 10.2 Font fingerprint

`a g l I 1 4 y q p b d m n r` · `cat ship little play yellow reading` · `The cat sat on
the mat.`

- Review the double-storey a and approved g form.
- Distinguish lowercase l, uppercase I, and numeral 1.
- Check open counters at small sizes.
- Check multi-letter tile spacing and punctuation attachment.
- Approve every supported platform with screenshot comparison.

### 10.3 Baseline sizes

| Use | Baseline |
|---|---|
| Principal word | clamp(2.25rem, 11svh, 5.5rem); ~700; line-height ~1.05 |
| Tappable sentence word | clamp(1.35rem, 5.2svh, 2.4rem); 56 px minimum target |
| Feedback tile | clamp(1.1rem, 3.2svh, 1.6rem) |
| Build It tile | Approximately 27 px in a 64 px-high control |
| Adult target | 44 px minimum |
| Child target | 56 px minimum |

The PDF's table said `dvh` in the three clamp rows; the ruling under 10.4 changed every
teaching clamp to `svh` on 2026-08-22, the quality control refuses `dvh` in any app source,
and the rows above say what the app says.

### 10.4 Sentence wrapping

- No fixed words-per-line target.
- Wrap only at natural word boundaries.
- Keep punctuation attached to its word.
- Do not justify or horizontally scroll teaching text.
- Keep wrapping stable within a prompt state.
- Reduce scenery and margins before reducing the approved font.

**Rulings (2026-08-22).** The stack and the principal word's clamp are the app's own
(`app/src/wq-css.js`), copied back by the bible. The clamp's `dvh` becomes `svh`: the
dynamic viewport height grows when a phone's address bar retracts, which would change the
word's size mid-attempt against section 3.2; the small viewport height does not move. At
200% text scaling the longest bank words (nine letters: something, butterfly, wonderful,
breakfast, yesterday) cannot fit 320 px at 11 rem, so the rule is stated measurably: at
200% the principal word may fall to the size that fits the longest word in the bank on the
smallest profile, never smaller, and the census measures it on "butterfly" at 320 × 568.

**Ruling amended the same day, by measurement (step 0d).** The clamp sizes the word by
height alone, and the census's corrected probe found it splitting at 100%: seven bank
words on 320 px, thirty-four on a 390 × 844 phone. The rule is now: the clamp is the
word's CEILING; the word is measured after layout and shrunk in proportion only when wider
than its line (`app/src/components/Word.jsx`), and it never wraps (`white-space: nowrap`).
The census measures the widest bank word by rendered width — probed in em over the whole
bank, "something" at 5.19 em, not "butterfly" — at 100%, under rem scaling at 200%, and
under CSS zoom at 2 on 640 × 1136, holding it to one line box inside the viewport at 36 px
or larger. Measured 2026-08-22: "something" 56.1 px on 320 × 568 and 69.5 px on 390 × 844;
"sat" keeps the 88 px cap. **And the geometry, stated in full** (the council's after pass,
the same day): the word's box and its baseline are the same for every word — the
stylesheet's size stays on the box, the fitted size goes on the glyphs inside it — so a
word that shrinks to fit sits where every other word sits; within a word nothing changes
between attempt and feedback (3.2, measured on every profile); between words only the
glyph size may differ. The zoom arm measures the word's width only: CSS zoom does not
scale `svh`.

## 11. Sound tiles

Sound tiles resemble glazed ceramic. The warm matte face, restrained bevel, narrow darker
edge, and slight contact shadow create material character without turning the tile into a
thick 3D block. Letters remain live text.

| State | Required treatment |
|---|---|
| Available | Warm ceramic face; principal ink; small contact shadow |
| Pressed | Shadow compresses; face darkens slightly; no bounce |
| Sounding | 3–4 px structural cyan outline + electric-cyan glow + 8–12% luminance lift |
| Placed | Settles in slot; full legibility |
| Used | Lower saturation and elevation |
| Removable | Stable placed state + small focus/hover affordance |
| Different arrangement | Neutral purple or amber; never failure red |
| Scaffold | Sequential cue in sound order |
| Completed | Brief warm halo around assembled word |
| Disabled | Lower saturation plus explanation or non-colour symbol |

Multi-letter sound units remain one tile and are visibly wider than one-letter units. Their
shape communicates that the letters belong together without introducing a permanent
phonics colour code.

*Figure 5 (PDF): schematic tile states. Letters remain live text in production.*

**Rulings (2026-08-22).** The sounding outline and glow are drawn with box-shadow and
outline, never with a border or a size change, so the tile row holds still (G7 measures
it). Build-it's "Used" and "Disabled" states are real `disabled` controls since beta 26,
not merely dimmed ones.

**Rulings (2026-08-22, art step 1 — the ceramic family as built).** The tile is a CSS
family (8.1's row is amended): a solid `tileFace`, a `tileHighlight` above and the
edge's shade below (2 px insets of which 1 px shows inside the rim), a one-pixel `tileEdge`
rim, a contact shadow — every inset at zero
blur, the rim and bevel in the padding ring and never under the letters, the 9-slice the
radius per density (12, 9, 7; 8 on the short stage; 14 in Build-it). **Sounding:** a 3 px
solid `cyanStructural` ring at offset 0, a `cyanElectric` band **outside** it of 6 px (4 at
six tiles, 2 at eight, 4 on the short stage — the owner's ruled numbers), and the face
lifted to `tileFaceLit` (+11.4 % luminance) — one `wqpop` keyframe set, `steps(1,end)`, the
measured clip length; owner-ruled on the ceramic-tiles page over the ring alone. What
renders, measured with a middle tile sounding at every density (the Galaxy S9+ at 4.5 and a
390 × 500 short stage at 3, the runs read through the ring on both sides, 2026-08-22): the
full band shows above, below and on a tile's open sides; toward either neighbour it shows
gap minus ring — 3 CSS px at three tiles (13–14 device px at 4.5, the neighbour's contact
shadow tinting the sliver), 1 at six tiles (4–5), 0 at eight tiles (the ring meets the rim),
1 on the short stage (3 at 3×) — and the rest lies beneath the neighbour's box, because the
tile sounding now paints beneath its siblings (the row isolates its stacking and the live
tile takes z-index −1; without that a later sibling paints over an earlier one's shadow,
and the band buried the previous tile's rim by spread minus gap — the antagonist's third
after pass); the neighbour's rim, 4 device px at 4.5, is whole on every render. The band is
a glow, never a boundary, and the ring is closed on all four sides at every density. The
rim is listed first in the shadow stack, so it closes all four sides; the highlight and
the lower shade are drawn as 2 px insets of which 1 px shows inside the 1 px rim. (A first record claimed one pixel of sky between the band and the next
rim, and a 5 px band to keep it; the pixels showed none and the arithmetic allows none
while ring plus band exceed the gap, so the band is the ruled 6 and the record says what
is there.) The same
cyan ring marks the open sentence word. **Pressed:** the edge at .08 under the rim, the
elevation dropped, no movement. **Used:** the `slot` face under the same dashed
`boundary` edge the empty slot wears — a non-colour mark (15.1), because the slot face
alone was invisible in greyscale at the checkpoint — no elevation, the letter still ink
(8.80:1), a real `disabled` control; every tray tile takes it on a win, since a disabled
tile must not look available. **Empty slot:** the `slot` fill under the dashed `boundary`
edge (3.51:1). **Scaffold:** the slot wears the structural ring while its sound plays, one
at a time, its dashes transparent so the ring is the one edge, with the letter inside at
opacity .60 (3.28:1, owner-ruled over the .28 that measured 1.65). **Different
arrangement:** a 3 px `purpleStructural` ring round the filled slots while the built sounds
play back, owner-ruled over a tint and over none. **Completed:** one static `amberFill`
halo round the assembled word, drawn on the slot row, 4 px off the tiles' rims. **Focus:** a dashed `cyanStructural` ring at
offset 2, so the keyboard's mark and the sounding mark differ by shape. None of the new
states animates; reduced motion changes nothing about them.

The table below is the repository's: doc-truth rule 12 reads it and requires every
selector to exist in `app/src/wq-css.js` and — except the two the reference build has no
screen for, `@keyframes wqpop` (no sound-out animation there) and `.wq-sword-open` (no
sentence stage) — in the reference's copy, naming every token the row lists as `${C.token}`;
a row whose tokens cell says `none` binds the selector's existence only. Prose cells are
not bound. For a family that lands no file, checkpoint 2 is judged on the pinned ratios,
the census's sounding-state cell and sampled device pixels; the scenery statistic section
17 names is first built by the step that lands a PNG, the garden scene.

| state | selector | tokens |
|---|---|---|
| available | `.wq-tile` | tileFace, ink, tileHighlight, tileEdge |
| sounding | `@keyframes wqpop` | cyanStructural, cyanElectric, tileFaceLit, tileHighlight, tileEdge |
| control | `.wq-tilebtn` | ink, tileFace, tileHighlight, tileEdge |
| pressed | `.wq-tilebtn:active:not(:disabled)` | tileEdge |
| used | `.wq-tilebtn.wq-used` | slot, boundary |
| empty slot | `.wq-tilebtn.wq-empty` | slot, boundary |
| scaffold | `.wq-tilebtn.wq-cue` | cyanStructural |
| scaffold, one edge | `.wq-tilebtn.wq-empty.wq-cue` | none |
| different arrangement | `.wq-tilebtn.wq-arr` | purpleStructural, tileHighlight, tileEdge |
| completed | `.wq-slotrow.wq-won` | amberFill |
| focus | `.wq-tilebtn:focus-visible` | cyanStructural |
| open sentence word | `.wq-sword-open` | cyanStructural |

## 12. Optional nonhuman guide

Use one small original nonhuman garden guide on home, instruction, and milestone screens
only. It is absent during the unassisted attempt and spoken feedback.

- Compact seedpod-inspired body with a leaf-shaped tail or fins.
- Muted moss and cream with one coral accent.
- No clothing, tools, weapons, speech bubbles, or mouth-synchronised audio.
- Eight to twelve poses: idle, welcome, point, listen, small celebration, large celebration,
  rest, and accessibility-neutral fallback.
- No pose or expression may indicate the answer.
- Final silhouette requires originality review and owner approval.

**Rulings (2026-08-22).** The guide is last in the order, and its absence from the session
screen during attempt and feedback is a census cell written before its first pose is
drawn. It has no name (S9).

## 13. Screen-by-screen specifications

### 13.1 Home

Use the full current garden state and an original title treatment. Keep the dashboard
sparse.

- Begin Session is the sole dominant action.
- Free Play is quieter.
- Show current level and cumulative garden state.
- Optional guide may appear.
- Glowseed may be visible but idle.

### 13.2 Pre-session and level introduction

State the level or new sound clearly without revealing an upcoming graded word.

- Use original iconography instead of prominent platform emoji.
- Audio demonstration uses the taught unit plus Glowseed.
- Keep animation sparse.

### 13.3 Word attempt

The reading field is warm, nearly empty, and stable.

- Word fixed at visual centre.
- Small title-case instruction.
- No tiles, guide, active Glowseed, segmentation, or answer image.
- Garden motion paused.

### 13.4 Word feedback

The word remains geometrically unchanged.

- Reserved tile and message slots become populated.
- One sounding tile at a time.
- Glowseed active only while audio is active.
- Ambient motion paused.

### 13.5 Sentence attempt

Use natural wrapping and the approved font.

- No fixed words-per-line target.
- Every tappable word retains a 56 px target.
- No horizontal scrolling or answer imagery.

### 13.6 Sentence reveal

One opened word receives a stable outline and subtle surface lift.

- Use the ordinary sound-tile system.
- Other words remain quiet.
- Only opened word and sounding tile receive strong emphasis.

### 13.7 Build It and Find the Sound

Use ceramic tiles and slots on a quiet garden-workshop surface.

- Tap-to-place remains primary.
- Multi-letter slots remain wider.
- Different arrangements remain neutral and are explained with audio.
- Scaffold cues appear sequentially and then clear.

### 13.8 Session completion

Use a calm summary and brief environmental lift.

- No full-screen confetti for an ordinary session.
- Keep progress information truthful and adult-readable.

### 13.9 Tenth-level milestone

Use a separate, richer cumulative garden reveal.

- Show only the newly added feature.
- Optional guide may react.
- Return to the settled state.

### 13.10 Adult screens and dialogs

Use the same palette with lower saturation, simpler backgrounds, and conventional
information hierarchy.

- No animation behind settings, privacy, reports, export, storage warnings, or updates.
- Adult controls remain at least 44 px.

### 13.11 Error and degraded states

Explain storage, update, or audio failures plainly and calmly.

- Do not depict a broken garden or distressed guide.
- Pair colour with icon and wording.
- Keep a usable path forward.

## 14. Motion and audio synchronization

| Element | Rule |
|---|---|
| Ordinary transition | 150–220 ms fade |
| Major garden reveal | 250–350 ms restrained dissolve or crossfade |
| Sounding tile | Exact measured audio duration |
| Glowseed | Exact audio lifecycle; steady state |
| Ambient motion | Home/milestone only; paused during teaching |
| Reduced Motion | Immediate static state changes |

- No bounce, elastic easing, camera shake, parallax sweep, or repeated pulse during reading.
- Synchronize only the sounding tile, Glowseed, and a conventional playback indicator.
- Do not synchronize the full garden, guide, word scale, or particles to speech.
- Unknown duration means no guessed timed animation.

## 15. Accessibility

| Requirement | Target |
|---|---|
| Teaching text contrast | At least 7:1 target |
| Ordinary interface text | At least 4.5:1 |
| Large non-teaching text | At least 3:1 |
| Focus and important boundaries | At least 3:1 |
| Text scaling | 200% on teaching screens |
| Child target | 56 px minimum |
| Adult target | 44 px minimum |

**Ruling (2026-08-22, the two-rulings page): a Build-it tile's accessible name is its
grapheme** — `Tile sh`, `Tile i`, `Tile p` — as it is today. The reading chair asked for a
ruling because a screen reader spells a string it has no word for, and S4 keeps letter
names out of the app's own voice; the owner ruled that S4 binds what the app says and not
the assistive technology, and that a grown-up driving the tray by ear needs to know which
tile is which. A positional name ("sound tile 2 of 4") was costed and refused: it says
nothing about the sound, so the word could not be built by ear at all.

### 15.1 Non-colour cues

Every instructional colour state also uses an outline, position, label, icon, timing,
surface elevation, or pattern. Neon glow does not count as the required structural contrast.

### 15.2 Focus and activation

- Keyboard focus uses the cyan family but remains distinct from playback, for example
  through a dashed or offset structural ring.
- Focus order follows visual order.
- Screen-reader names describe actions rather than decorative icons.
- Keyboard and assistive-technology activation do not require a pointer hold.

### 15.3 Sensory settings

- Reduced Motion follows the system preference by default.
- Quiet Display reduces glow, background detail, ambient motion, and celebration effects.
- Larger / Higher-Contrast Reading enlarges teaching text and strengthens boundaries.
- Audio and voice settings remain separate because they affect instruction.

## 16. Asset system and production scope

- One persistent garden with 11 cumulative states and three responsive crops per state.
- One reusable reading-frame system.
- One ceramic tile family with width variants and all states.
- One Glowseed with idle, active, unavailable, and reduced-motion states.
- 35–50 original icons.
- One optional guide with 8–12 poses.
- Four to six restrained celebration effects and reusable textures.
- App icon, maskable icon, splash, and title assets.
- No unique picture for every word.

### 16.1 Naming

`WQ_[SYSTEM]_[ASSET]_[STATE]_[SIZE]_[VERSION]` — for example
`WQ_GARDEN_STATE00_WIDE_v001.png`, `WQ_AUDIO_GLOWSEED_ACTIVE_2X_v002.png`,
`WQ_TILE_DIGRAPH_SOUNDING_3X_v004.png`, `WQ_ICON_BEGIN_SESSION_32_v001.svg`.

### 16.2 Export rules

- Keep layered lossless masters.
- Export pixel art as PNG and clean non-pixel icons as SVG.
- Store pivot, crop, safe-area, state, and scale metadata.
- Use nearest-neighbour scaling for pixel art and normal browser rendering for text and SVG.
- Never bake words, captions, or instructions into scenery.

**Rulings (2026-08-22, the install budget).** S6 puts every asset on the device at install
— a child who earns level 40 offline cannot fetch the basin — so the art has a byte budget:
12 MB for all of it, with 2× and 3× assets for every state and crop, as a ceiling in the
baseline that a gate after the build enforces. Measured at the ruling: the install is 40 MB
in 1,490 files, 39 MB of it the voice pack.

**Ruling (2026-08-22, the two-rulings page): the export ships as written.** The council's
art director asked that the install carry 1× masters only, snapped in code; the owner was
shown the measurements — the browser's nearest-neighbour render of a 1× master at k = 2
and k = 3 is pixel-identical to the 2× and 3× files, and the pair costs 3.1× the master's
bytes on a 64 × 64 test sprite — and chose the ruling as written: **2× and 3× files for
every state and crop, picked by device pixel ratio and scaled.** Section 8.2's snap stands
beside it: whichever file is picked, its CSS size is snapped so every logical pixel lands on
a whole number of device pixels, and a 2× or 3× file snapped that way renders the same
pixels as a snapped master would. What this ruling spends is bytes, inside the 12 MB; the
census's snap cell reads the logical width from `data-wq-art-w`, so it measures the same
thing whichever file is on the screen.

## 17. AI-assisted art workflow

AI may support concept exploration and rough environmental drafts. It does not generate
final teaching text, sound decomposition, interface copy, or production-critical geometry.

1. Prompt from objective requirements, not a named entertainment reference.
2. Generate scenery without text or letters.
3. Review answer-clue risk, originality, material, and responsive composition.
4. Redraw or correct on the approved pixel grid.
5. Separate layers and states deterministically.
6. Add live teaching text in code.
7. Test every reference viewport.
8. Record provenance and approval.

**Rulings (2026-08-22, the construction order).** The owner brought a 53-step
measured-cartoon method for photoreal painting of architecture and, on the page "The
construction order", ruled its discipline in and its mechanism out: structure before
surface, value before colour, detail last — scaled to pixel art at 64-px sprites and 32-px
icons, under the budget of 16.2 and the snap of 8.2. The art director chair read the draft
before it was written here (the plan's log, the same day) and its ten amendments are in.
Every pixel-constructed asset (8.1's left column) is made in this order; the eight steps
above are the AI-assisted path through the same stages.

| stage | what it produces | who takes it |
|---|---|---|
| 0 Output conditions | the logical grid size; for an icon, **PNG-pixel or SVG decided per icon** (8.1 lists icons as pixel-constructed and 16.2 exports clean icons as SVG — stage 0 resolves it, and the snap check and the 2×/3× export apply to the raster ones only); the three crops per state (16); the 2× and 3× export as ruled (16.2); the family's **byte share** from the table below; a provenance row opened; for the guide, the census absence cell the section 12 ruling requires before its first pose | all |
| 1 Reference | a curated board where each reference answers a named question (geometry, material, light, scale); source and licence recorded in `tools/art/provenance.json`; the board itself lives outside the repository (18.1: no third-party image in the package), recorded by path and hash; nothing copied closely (18) | scene, tiles, Glowseed, guide |
| 2 Composition and notan | thumbnails, then two- and three-value studies **with the teaching word and the controls drawn in** — the art is judged as a ground for the word before it has any colour | all |
| 3 Geometry | **the scene's numeric lock, decided once and shared by all eleven states:** the ground plane's elevation ratio (for example 2:1), the key light as the pixel offset of a cast shadow and the lit and shade sides of a module cube, the module in logical px, the ground-line y on each of the three crops — recorded in provenance, never a sentence. One **key-light** direction, locked; the light a state adds (the blooms of states 1 and 7, the lattice of 9, the sanctuary of 10, the Glowseed's core) is an **emitter**, added per state inside 9.1's budget, casting no shadow on an earlier form and never moving the shade side of one. Large forms, then secondary forms, then repeats from the module; a curve (the basin's ellipse, state 4) is constructed from the locked ground plane on the grid. For tiles: a 9-slice with the corner size in logical px, so a width variant never stretches the bevel (11). For icons: the keyline, once per family — the 32-px grid, stroke weight, corner radius, optical bounds — drawn with the text label beside it on the panel surface and on the gradient | scene, tiles, Glowseed, guide; icons once per family |
| 4 Value | monochrome value clusters; **aerial perspective as a value rule, never a painted layer:** a far element (the trellis's far edge, the canopy's upper edge) sits in a narrower value range than a near one (8.3); the value audit — greyscale, with the word on it | all · **checkpoint** |
| 5 Colour | tokens only (9.3), inside the electric budget (9.1); **every material is a ramp of three to five steps whose end colours are named tokens**, hue-shifted toward gardenTeal in shade and toward the electric family in light, recorded per family in provenance; **no dithering** (4.1); sky gradients are CSS, never pixels | all |
| 6 Materials and edges | 8.3's hierarchy: value and hue separate scenery, dark accents at contact boundaries only, no object with finer detail or more local contrast than the word; **scenery alpha is binary (0 or 255)** — a sprite sits on the CSS gradient, and a half-transparent edge is a different colour on each of the three stops, which defeats the edge ratios section 9's ruling measured | scene, tiles, Glowseed, guide |
| 7 Detail | last, and budgeted by the edge hierarchy; the first thing cut | all · **checkpoint** |
| 8 Export | indexed or 8-bit sRGB PNG with **no gAMA or iCCP chunk** (so the browser does not colour-manage a token pixel to a hex beside the CSS token it must match) and a sampled pixel equal to its token; binary alpha for scenery; the 2× and 3× files **pixel-identical to nearest-neighbour of the 1× master**, which is tracked outside the install (`tools/art/masters/`) so a check can regenerate and compare them; the file-pixel snap (k = 5 on a 2× file refused); the art budget gate (16.2); the provenance row closed with the approvals | all |

**Three checkpoints**, judged by the art director chair: the **camera lock**, once, for
the scene — after its stage 3 and before any state-0 pixel is placed, because the camera
is the one irreversible decision eleven states, the Glowseed and the guide share; then
**after stage 4** and **after stage 7**, per asset family. The other two chairs judge at
the step's after pass as the plan's rules say. Checkpoint 2 is judged on the census's
scenery statistic (19.3's promise: "no object with finer detail or more local contrast
than the word", measured on the greyscale at stage 4 and in colour at stage 7), not by eye.

**Four audits**, each before the checkpoint it feeds: **geometry** (flipped, on the grid,
against the locked camera; for every state 1 to 10, "the shade side of every earlier form
unchanged from state 0"); **value** (greyscale, with the word on it); **originality and
answer-clue** (17's step 3 and 18.2's combination test, at checkpoint 1 and again at the
final audit, the chair and date written into the provenance row's `originality` field);
**final**, on the census's eight profiles — the Pixel 7 (2.625) and the Galaxy S9+
(320 × 658, 4.5) among them — and on a real device by the QA script. "Thumbnail, normal,
close" means those sizes.

**Masters and derivatives.** The flat 1× master is tracked under `tools/art/masters/`,
outside the install; the layered master and the reference board live outside the
repository and are recorded in provenance by path and hash; the 2× and 3× files under
`app/public/art/` are the only art the install carries; the budget check regenerates each
derivative from its master and refuses one that differs, with a planted off-by-one-pixel
2× as its control. There is no README file per family: the family's entry in
`tools/art/provenance.json` — the camera lock, the ramps, the 9-slice, the master's path
and hash, the reference rows — is what the owner's ruling called the README, and a new
status file is what CLAUDE.md forbids.

**The byte share**, integers that sum to the 16.2 ceiling of 12,582,912: the garden
scene 8,388,608 (eleven states × three crops × two scales, 66 files); the guide 1,048,576;
the app icon, maskable icon, splash and title 1,048,576; the tile family 524,288; the
Glowseed 524,288; the icon family 524,288; effects and textures 524,288. A family that
needs more takes it from another in writing, here.

**What the method brought and this art does not take**, so nobody reaches for it: a lens
or camera model, perspective construction past the one locked viewpoint, ellipse and
cylinder construction beyond the grid-constructed curve above, 16-bit masters,
soft-proofing, resampling and output sharpening (the artefacts 8.2 forbids), glazing and
blend modes, texture projected in perspective, weathering, haze as a painted layer, and
the 2-D copying grid (18 forbids close copying). The sounding glow stays CSS (11's
ruling), never baked.

**The chair's refusals, as standing rules:** no state 1 to 10, and no Glowseed or guide
pose, is drawn before the scene's numeric camera lock is in provenance and has passed its
checkpoint; no 2× or 3× file ships that is not pixel-identical to nearest-neighbour of its
tracked master, and no scenery PNG ships with non-binary alpha, a gAMA or iCCP chunk, or a
sampled pixel that does not equal its token; no asset passes checkpoint 2 without the
scenery statistic measured against the word and the 18.2 combination test recorded in its
provenance row. The checks named here — alpha, chunks, pixel-equals-token, derivative
equality, the scenery statistic — are built in the step that lands the first file each
one reads, each with a planted fixture (E5), and named in the plan's step brief.

### 17.1 Automatic rejection

- Invented or misspelled text.
- Answer-related object or silhouette.
- Copied-looking character or UI silhouette.
- Inconsistent pixel scale or 3D-rendered lighting beneath a pixel filter.
- Illegible microdetail or neon-dominant composition.
- Glowseed with a face or character behaviour.
- Garden geometry that changes unpredictably between states.

## 18. Originality and IP guardrails

Production instructions use objective requirements and do not name commercial games,
creators, studios, characters, interfaces, or assets as targets for imitation.

### 18.1 Prohibited

- "In the style of" prompts.
- Third-party screenshots in the production package.
- Image-to-image use of copyrighted game screenshots.
- Tracing or copying logos, characters, maps, panels, icons, palettes, or distinctive
  compositions.
- Direct palette extraction from a commercial asset.
- Marketing language that invites confusion with a particular source.

### 18.2 Combination test

**Originality gate.** Reject an asset when its combined silhouette, composition, ornament,
colour placement, lighting, and animation make a specific third-party source readily
identifiable.

## 19. Visual QA and acceptance

### 19.1 Teaching clarity

- Word or sentence is the strongest focal point during an attempt.
- Approved font character and double-storey a are preserved.
- Teaching text remains live.
- Word does not shift between attempt and feedback.
- No artwork suggests the answer.
- Multi-letter units remain one tile.
- Sounding emphasis matches measured audio exactly.

### 19.2 Responsive and accessibility

- Pass all six reference viewports.
- Pass 200% text scaling.
- No horizontal scroll for teaching content.
- Pass contrast and target-size gates.
- Reduced Motion and Quiet Display remain valid compositions.
- Colour is never the only cue.

### 19.3 Provenance

- Record source and licence.
- Disclose AI involvement.
- Document human corrections.
- Obtain instructional, accessibility, visual, and originality approval.

**Rulings (2026-08-22, visual proof).** Proof is geometry and invariants measured by the
census, never a pixel diff: the frame adds 0 px to the stage; the word does not move; no
scenery has more local contrast or finer detail than the teaching word, as a measured
statistic; the guide is absent during attempt and feedback. Screenshot baselines may be
kept on one machine as an opt-in investigation a person looks at after an art change, and
are never a gate — the census's founding rule, because screenshots vary with operating
system, browser build and headless mode, and a red that means "something changed" invites
the retry the deflaking rule forbids.

## 20. Repository implementation boundaries

The redesign must not alter curriculum, grading, privacy, scheduling, audio content, or the
rule that the child reads before help appears.

- Run the repository blast-radius lookup before changing shared colours, dimensions,
  strings, or symbols.
- Capture baseline screenshots and font fingerprints.
- Introduce visual tokens without duplicating behavioural constants.
- Keep live teaching text in React/HTML.
- Derive garden state with a pure tested function capped from 0 to 10.
- Drive Glowseed from the same real audio lifecycle as tile timing.
- Preserve accessibility roles and activation alternatives.
- Add visual regression coverage for each reference viewport and garden state.

### 20.1 Migration order

1. Documentation and tokens only.
2. Baseline screenshots and font tests.
3. Responsive reading surface and garden frame.
4. Responsive grown-up zone.
5. Ceramic tile styling.
6. Glowseed tied to real audio.
7. Home and original icon family.
8. Garden state 0.
9. States 1–10, one reviewed milestone at a time.
10. Quiet Display and complete reduced-motion coverage.
11. Full repository quality gauntlet and independent review.

**Rulings (2026-08-22).** "Visual regression coverage" is read as section 19's ruling:
geometry cells, not pixel diffs. The order is amended in `docs/art-plan.md`: four gates
and the tokens come before step 1 (locators to aria-labels, tokens from `C`, the install
ceiling, the four census cells, the engine fact), ceramic tiles come before the reading
frame, and the reveal screen is built once at state 0 to 1.

## 21. Final production rule

**Governing sentence.** Word Quest succeeds visually only when the child can forget the
interface and attend to the letters. The garden provides belonging, the electric light
provides precise feedback, and every decorative decision remains subordinate to learning
to read.

## Appendix A — Core tokens (v1.0, as the PDF stated them; section 9.3 is the repository's table)

| Token | Value |
|---|---|
| ink | #17356B |
| inkSecondary | #3C4F73 |
| surfaceReading | #FFF9E8 |
| surfacePanel | #FFFDF5 |
| skyBlue | #8FD0FA |
| skyLavender | #B9C3FB |
| skyPurpleMist | #D9C6FB |
| gardenNight | #1D2C50 |
| gardenTeal | #2E7D78 |
| gardenMoss | #5E8057 |
| gardenLeaf | #7FA660 |
| stone | #B9B1A0 |
| wood | #97684F |
| action | #2057C9 |
| success | #18794E |
| warning | #8A4B00 |
| danger | #A83737 |
| line | #92A5BF |
| disabled | #9FB4C4 |
| cyanStructural | #005A67 |
| cyanElectric | #4EEBFF |
| purpleStructural | #5B3FD6 |
| purpleElectric | #9B75FF |
| coralElectric | #FF775E |
| amber | #F4B942 |
| tileFace | #F6D985 |
| tileHighlight | #FFF1B5 |
| tileEdge | #B8832E |
| slot | #E6DCCB |

## Appendix B — Reference assets in the PDF package

Cover concept and visual north star; responsive layout schematic; garden milestone-state
schematic; Glowseed anatomy schematic; sound-tile state schematic; core teaching-sequence
schematic. These are schematic design communication, not final production art and not
approval of a replacement teaching font.

## Appendix C — Package companions

Quick specification; screen composition specification; garden milestone-state table;
typography standard; tile and Glowseed state standard; JSON and CSS tokens; motion and
reduced-motion standard; accessibility and instructional-safety standard; AI concept
prompts and negative constraints; originality and IP guardrails; asset naming and export
rules; visual QA checklist; repo-agent implementation addendum; recommended migration
sequence; asset provenance ledger. Of these, the tokens live in `C` (section 9's ruling),
the migration sequence in `docs/art-plan.md`, and the provenance ledger in
`tools/art/provenance.json` once the first asset exists; the rest are this document.
