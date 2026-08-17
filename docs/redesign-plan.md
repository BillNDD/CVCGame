# The curriculum redesign — the plan, and where it stands

**This document owns** the plan for rebuilding the game's teaching ladder: every step
still to do, in order, with what each one breaks and what it is blocked on.

**It does not own** the pathway itself (SPEC section 12a owns that), the faults it will
fix (`docs/open-faults.md`), or anything already closed (`docs/settled.md`). It is a work
plan, and it is deleted when the redesign lands.

Written 2026-08-17 at the owner's instruction, so the work survives a context loss.

## Where this came from

The owner ruled the **Sound Ladder with three grafts** (SPEC 12a) on 2026-08-17 after an
independent specialist wrote four complete pathways. A review council of three fresh-context
seats was seated the same day — engineering, early literacy, and the grown-up's experience
(`.claude/skills/council-*/SKILL.md`). Both seats that have sat so far found real faults;
their findings drive most of this plan.

## The state today, measured

| | |
|---|---|
| Levels designed | 100, shape fixed (`scratchpad/ladder2-shape.json`) |
| Words placed | 749 + 22 heart = 771 |
| Words needing a new clip | 183 |
| Graphemes the ladder teaches | 97 — 47 shipped, 5 waiting, **45 unrecorded** |
| Sentences the ladder calls for | 542 — 210 exist, **332 to source and record** |
| Levels teaching nothing on their own subject | **25** |
| Levels with no words at all | **9** (92–100) |
| Committed to the repository | **nothing** — all work is in the scratchpad |

The owner is producing the 45 sound clips on a sidecar and will hand them over; that path
is not blocked on anything here.

## THE BLOCKER, and it is ahead of everything else

**`chunkWord` cannot see the extended code.** It knows the initial code and eighteen
digraphs; it has no `ee ea oa oo ay ar er ir ur aw oi ow` and no split vowels (`a_e`,
`i_e`, `o_e`, `u_e`, `e_e`). So `cake` chunks as `c-a-k-e` and is consumed at level 4 by
the `c` level, decades before `a_e` is taught, and levels 57–100 cannot be filled by any
generator however good its selectors. Fixing this is engine work that needs no recording
and no owner ruling, and **nothing else in the top half of the ladder can proceed until it
lands.**

Note the second-order effect the engineering seat found: the generator's grapheme
accumulator already collects `ea oo ow ar ay er ie oa oi` as available, harmlessly, only
because `chunkWord` cannot emit them. The day they join `DIGRAPHS` they become available
twenty levels early with no gate. **Extend the chunker and the ladder's decodability check
in the same change**, or the check silently stops being true.

## The steps, in order

### 1. Extend the chunker to the whole code — BLOCKING, no dependencies
Add the extended-code graphemes to `DIGRAPHS`/`TRIGRAPHS` in `reference/word-quest.jsx`,
including the split vowels, which need a different mechanism: `a_e` is a discontinuous
grapheme and the current chunker is a left-to-right longest-match. Regenerate `src/engine.js`
with `tools/extract-engine.mjs` (E1: never hand-edit the generated file).

**What it breaks:** `tests/engine.test.js` pins the digraph roster, the grapheme count (44),
the fallback list and P2 in `tests/properties.test.js` ("every chunk is one letter or one of
the nineteen units"). Every one of those is a literal that must be re-derived by hand from
the new roster, never from the constant under test (E4). The tile-row law in SPEC will need
re-measuring: more graphemes means fewer tiles per word, which is the good direction.

### 2. Fix the two remaining generator faults
- The rime cap treats every `-ing` word as one rime, so the `-ing` level caps at three and
  teaches `ping ring wing`. Exempt suffix levels from the cap.
- The doer `-er` level matches any word ending in `er`, so it teaches `another brother
  mother`. Require the stem to be a known verb.

### 3. Re-run the generator and re-review
Both seats, in the order they matter: the literacy seat for cumulative decodability across
all 749 placements (it found ten tile violations in the hand-written draft), then the
engineering seat for the selectors. Neither has seen a post-chunker run.

### 4. Fill levels 92–100
Nine levels are empty because neither the owner's target list nor the approved bank holds
words for `-ough`, `-stle`, `ch` as /k/, `-tion`, the spelling-change rules, prefixes or the
derivational suffixes. **This needs an owner decision** — see the questions below.

### 5. The sentence corpus
542 sentences are called for, 210 exist, 332 to go. The owner corrected an early error of
mine: public-domain sources DO have sentences short enough for early levels — rhymes,
fables, early readers — and the method is to screen real text against each level's
cumulative set rather than assume a band cannot be sourced. Every sentence passes
`tools/sentence-screen.mjs` and needs a human read recorded in its ledger. Where no sourced
sentence fits a level, a written one fills the gap and is labelled as written.

### 6. Convert to engine code
The output becomes `LEVELS` in `reference/word-quest.jsx`. The engineering seat enumerated
what breaks, and it is the largest gate movement in the project's history:

- `tests/engine.test.js` — "476 unique words across 21 levels", level 21 as the ceiling,
  `0/476` in the markdown export, `voiceScript` length 756, the SENTENCES keys pinned to
  `[1..21]` and their exact counts array.
- **The ai/ou no-default test and its own negative control**: the control is literally the
  word `rain` ("rain is not in the bank; if it were…"), and the v2 ladder puts `rain` in the
  bank. The test AND its control must be re-sourced, never weakened (E3, E5).
- `.claude/gate-baseline.json` — `g13_clips`, `g16b_sounds`, `g20_tests_mapped`, `g24_files`,
  `g23_declared` all rise. **`g6_engine_file_lines_max` (2400) will be exceeded** — the
  engine is 1474 lines with 21 levels; 100 levels plus 400 sentences will pass it, and only
  the owner may move a ceiling (E6).
- Tile rows: 85 words are 5+ tiles and ten are 7. With Build-it's two distractors that is
  nine tiles in a row against S7's 56 px floor. **A measured layout ruling, not a test edit.**
- Two forbidden-word lists disagree today: `NEVER_BUILD` in the engine lists `jugs, crabs`;
  the generator lists `gun, cans`. One list, one owner.
- `docs/file-map.md` and `docs/effect-map.md` regenerate; every new file needs its row in
  `tools/file-map.mjs` in the same commit (G23), and a governing file needs G17 too.

### 7. Free play
Needs no redesign. All five modes survive: truly random, level words, sentences, build a
word, find the sound. Only scale changes — the sentence pool grows to 542 and level sets
tighten to 6–10 words.

### 8. Before any "all green"
The owner's standing rule of 2026-08-17: the drift check must pass with 100% coverage and
zero drift, and **he is asked before it runs** — it is a milestone check, not a habit.

## Open questions for the owner

1. **Levels 92–100 have no words in any source.** Add the needed words to
   `tools/target-vocab.txt` (it is his list), let the generator reach outside the three
   sources for those levels only, or end the ladder at 91?
2. **`hunting` at level 80 while `hunt` is refused.** The appropriateness rule covers
   plurals and near-misspellings; is `hunting` out?
3. **`here`, `there`, `were`, `where` can never be taught** — all need the `ere` trigraph,
   which the shape never introduces, and `there` ships today. Which level takes them?
4. **Sentences: sourced first, or written first and swapped later?**
5. **The engine line ceiling (2400) will be exceeded.** Raise it, or split the engine?

## What is NOT in this plan

Fluency and language comprehension. The specialist raised both unasked and was right: a
child can finish level 100 and still not read a chapter book, because fluency comes from
volume of reading a grown-up supplies and comprehension comes from being talked to. Both
belong in the "Grown-ups corner" in plain words, and neither is a ladder problem.
