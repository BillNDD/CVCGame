# The curriculum redesign — the plan, and where it stands

**This document owns** the plan for rebuilding the game's teaching ladder: every step
still to do, in order, with what each one breaks and what it is blocked on.

**It does not own** the pathway itself (SPEC section 12a owns that), the faults it will
fix (`docs/open-faults.md`), or anything already closed (`docs/settled.md`). It is a work
plan, and it is deleted when the redesign lands.

Written 2026-08-17 at the owner's instruction, so the work survives a context loss.

## The design artefacts are in the repository now (2026-08-19)

They were built during this redesign and lived only in a session scratchpad -
a temporary folder outside the repository. The 459 approved word clips and the
55 sentence takes were safe in `tools/pending-words/`; the LADDER that would
seat them was not. Losing the folder would have lost the whole 100-level design.

Committed at the owner's word, 68 KB, as `tools/ladder/`: the shape, the placed
words, the word bill he ruled on, and the public-domain harvest. Each is
declared in the map and in the owned set, and `tools/ladder/README.md` states
what each one is and how far it can be trusted.

`tools/ladder-status.mjs` reads them and prints what the ladder holds. It is a
LOOKUP, like blast-radius: it never fails a build and it cannot say whether the
ladder is right. It exists because every number in this redesign has been
recomputed by hand and got quoted wrong at least three times - a sound bill five
times too large, an approved-and-unshipped count wrong twice, a passage total
inflated by sliding windows. Its controls run in `npm run check`.

Measured by it on the day it was committed: 100 levels, 725 words placed, 8
empty levels, 22 under six words, 35 graphemes still written without their
sound, 393 candidates in the bill across 38 levels, 87 corpus singles and 10
contiguous passages.

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
| Sounds the ladder needs | 48 — **40 shipped, 7 approved and waiting to ship, 0 unrecorded** |
| Sentences the ladder calls for | 542 — 210 exist, **332 to source and record** |
| Levels teaching nothing on their own subject | **25** |
| Levels with no words at all | **9** (92–100) |
| Committed to the repository | **nothing** — all work is in the scratchpad |

## THE SOUND WORK IS DONE — corrected 2026-08-17, and this correction matters

An earlier version of this document said **45 sounds were unrecorded** and that the owner's
sidecar would produce them. **That was wrong, twice over, and the true number is zero.**

**The first error: counting spellings instead of sounds.** The pack is keyed by SOUND. The
pathway the owner chose is built on one sound having many spellings — `ai`, `ay`, `a_e`,
`eigh` and `ey` all say long a, and `d:long_a` has shipped since early August. Walking the
ladder's graphemes and asking "is there a clip named for this spelling" produced a bill five
times too large, and it contradicted the very thesis of the ladder it was costing.

**The second error: reading file names instead of verdicts.** `tools/pending-sounds/pending-sounds.json`
carries a `verdict` field on every entry. Not one was opened. Every clip called "waiting"
already had the owner's approval recorded against it, two of them re-confirmed blind on
2026-08-10.

**The true state, measured:**

- **40 sounds shipped** — in the pack, in the game today.
- **7 approved and waiting only for `tools/ship-sounds.py`**: `long_u`, `oi`, `ar`, `er`,
  `ear`, `aw`, `zh`. These need a ship step, not a microphone and not an evening.
- **0 unrecorded.** Nothing the 100-level ladder needs is missing.
- The check reported `c` as having no clip; that is an artefact of the check, not a gap.
  English `c` says /k/ and `d:k` ships. There is no separate `c` sound to record.

**Settled 2026-08-18 — the paragraph below was wrong.** The phonics seat and a
re-reading of the ledger agree that `aw` is closed. Kept here because the error is
instructive: a verdict string that reads as a chronology was read as a contradiction.
The original note said `aw`'s ledger entry contains two records that
disagree: *"closest of its field — owner ruled iterate on this clip, better arms"* and a
later *ok*. One of them is wrong and the file cannot say which. **Play `aw` once and rule**,
rather than shipping on a contradiction.

**The remaining action is therefore small and specific:** run `ship-sounds.py` for the seven,
after the `aw` verdict is settled — noting that the tool is driven by the engine's sound
inventory, so it may not ship a sound the 21-level engine does not yet ask for. If so, these
seven ship with the ladder rather than before it, and that is a sequencing fact rather than
more work.

## What the phonics seat found, 2026-08-18

A fresh-context specialist walked the ladder against the code. Four findings
change the plan.

### The sound bill is zero

Item 7 is settled. **No new sound needs recording.** All 45 graphemes an earlier
count called missing, plus 18 more nobody had counted, resolve into the 50
approved sound ids. 23 are vowel spellings of sounds already shipped; 8 are
consonant spellings; 3 are doubled consonants needing a mapping row and no clip;
11 are not graphemes at all.

The `aw` ledger entry is NOT contradictory, and an earlier note in this document
saying so was wrong. Its verdict string is a chronology: round 2 asked for better
arms, round 3 heard them, the original clip won, closed. `long_a` carries the
byte-identical string and shipped on it.

### The damage is wider than "9 empty, 7 thin"

About **20 further levels teach nothing about their own subject** while holding a
full complement of filler words, so they appear in neither count. Level 57
teaches `a_e` and holds *pad, path, rang*. Level 48 teaches `-y` and holds no `y`
word at all. Levels 95 and 96 teach `ti` and `tu` and hold *tin, tick, tip* and
*tub, tuck, tug*.

A level full of wrong words is more dangerous than an empty one, because it
teaches confidently and wrongly, and nothing counts it.

One root cause: the generator strips `_e` before its grapheme accumulator runs,
so split vowels are invisible to it. The same blindness makes the chunker read
`house` as h-o-oo-s, and it fires the same way on *mouse, please, noise, cause,
cheese*. The fix is ordering — vowel teams matched before split vowels.

### Eighteen graphemes nobody counted

`a_e e_e i_e o_e u_e`, `ey`, `ere`, `al`, `augh`, `tle`, final `re`, `si`, `su`,
and `ce ge se ve ze`. All map to sounds already approved. Two of them, `ey` and
`ere`, are in the shipped engine today and taught at no level.

**`si` and `su` are the only spellings of `zh`.** Neither is in the ladder, so
shipping `zh` as things stand would orphan the clip — a sound with no word to
play on.

### Two ordering faults, cheap now and expensive later

Level 81 is thin by design rather than by scarcity: level 38 teaches the `-er`
suffix 43 rungs earlier and eats *ever, her, under, never, other*, leaving level
81 with two words. The /er/ sound is first met at 38, so level 81 must be
re-scoped rather than refilled.

Two levels teach a grapheme's rarest sound first. Level 60 teaches `ea` as
*great, break, steak* — three words — before level 62 teaches the long-e `ea` of
hundreds. Level 83 does the same to `ear`. Both are one-line shape edits.

### Sequencing, which the plan had wrong

Item 1 must land before items 2 and 3. Re-running the generator on the current
chunker reproduces all twenty off-topic levels and wastes both council reviews.

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


**Paragraphs are first-class, not shredded sentences (owner-checked 2026-08-18).**
Seventy-seven of the hundred levels demand a paragraph, from level 24 up, and the
paragraph presentation is already ruled and built (SPEC section 12, the WHISPER,
2026-08-16). The pipeline must therefore select CONTIGUOUS PASSAGES, not only
single sentences: consecutive sentences from one source, kept in their original
order, every one decodable at the same level, carrying one book credit for the
whole passage. Levelling a paragraph means levelling its hardest sentence - the
passage sits where its LAST-unlocked word sits. A pipeline that levels sentences
independently shreds every public-domain paragraph into scatter, and the
multi-line system the project already built would present nothing. Sourcing
order per the owner's standing preference: a real passage wherever one fits,
a written one only where none does, labelled as written.

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

**The timing is now ruled: it runs when Phase A closes** (owner, 2026-08-18, "after phase A
we will run /drift-check"). Phase A is content design and touches SPEC, the plan, the word
lists and the ledgers, so it is the point where ownership and the map are most likely to have
drifted, and the last point before code work builds on top of them.

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

## Four scope rulings, owner, 2026-08-17

1. **ONE CUTOVER.** The 21-level game stays as it is until all 100 levels are ready, then
   the ladder is replaced in a single release. No band-by-band shipping, no coexistence, no
   progress migration at each step — and no shippable game in between, which is the accepted
   cost.
2. **THE PRE-LADDER IS REDESIGNED** against the new pathway rather than kept: its rungs must
   introduce letters in the new order, and it may grow if the sound ladder wants more
   pre-print work. New clips follow.
3. **A HARD ENDING AT LEVEL 100.** A celebration, and the game says it is finished. Free
   play and the passage stage stay available afterwards forever.
4. **LEVELS 90-100 ARE DEVELOPED WITH A FRESH-CONTEXT PHONICS EXPERT**, not by me alone —
   and **public-domain literature is the source for sentences and paragraphs wherever it can
   be**, at every level, not only at the top.
