# The curriculum redesign's design artefacts

**This document owns** what each file in `tools/ladder/` is, where it came
from, and how far it can be trusted.

**It does not own** the pathway ruling behind them (`SPEC.md` section 12a), the
plan that produced them (`docs/redesign-plan.md`), or the words and clips they
describe (`tools/target-vocab.txt` and `tools/pending-words/`).

## Why these are committed

They were built during the redesign and lived only in a session scratchpad -
a temporary folder outside the repository. The words and clips were safe; the
LADDER was not. Losing the folder would have lost the 100-level design and left
459 approved clips with nothing to seat them in.

Committed 2026-08-19 at the owner's word, as insurance. 68 KB.

## The files

| file | what it is |
|---|---|
| `shape-v3.json` | The 100-level shape: what each level teaches, its graphemes as `grapheme=sound_id`, its rule, its heart words, and how much text it demands. Written by a fresh-context early-literacy specialist and adversarially reviewed. |
| `ladder-v4.json` | The words placed at each level, from the rebuilt generator after all sixteen audited faults were closed and the silent fill deleted, plus the words `tools/ladder-fill.mjs` seated on 2026-08-19. A level's `words` is the whole answer to what it teaches; its `filled` array names the subset the fill added, so provenance survives without git archaeology, and `pool` and `cands` are left as the generator wrote them because they are the evidence for what it did. |
| `word-bill.json` | The candidate words for levels the approved sources could not serve. The owner ruled on these: 295 offered, four refused, 277 added to `tools/target-vocab.txt`. |
| `corpus-harvest.json` | What the public-domain pipeline found: single sentences and contiguous passages, each with its book credit and its index in the source. |

## How far to trust them

**These are DRAFTS, not the game.** The engine's levels are still the 21 in
`src/engine.js`; nothing here has been converted to code, and the conversion is
the largest gate movement this project will make.

Known faults at the time of committing, all recorded in `docs/redesign-plan.md`:

- ~~Eight levels seat zero words: 23, 24, 32, 62, 65, 72, 74, 94.~~ **Three do,
  since 2026-08-19: 32, 72 and 94.** The generator had left 162 of the owner's
  697 target words at no level at all, and five of the empty eight had on-topic
  words among them waiting. `tools/ladder-fill.mjs` seated all 162 and took the
  ladder from 725 words to 887. The three that remain are 32 (coda3), 72 (the
  open-syllable long a) and 94 (`ch` saying k and sh): no target word is on
  topic for them, so they are a word bill for the owner and not a level to pad.
- ~~Level 23 teaches `ch` and no `ch` word exists in the ladder until level 88.~~
  **Closed 2026-08-19.** Level 23 now seats *benches branches chop rich* - four,
  two short of the owner's floor of six, and that shortfall is the word bill
  above rather than a reason to add a word that teaches nothing about `ch`.
  It seated *child* too until the same day, when the literacy seat found that a
  child reading it at level 23 says it to rhyme with "filled": `i` is taught as
  the short i and nothing else until level 68. The word moved there. That is the
  fault in section U below, and it is why this bullet says four and not five.
- ~~Level 24 teaches the quiet `th` and no quiet-`th` word exists anywhere.~~
  **Closed 2026-08-19.** Level 24 now seats *bathtub thank thankful* - three,
  also under six, and it is still the child's first paragraph.
- **Level 98 seats three words, and that is the price of a ruling, not a
  regression.** The owner ruled on 2026-08-19 that "L53 teaches y-to-i AND -ly",
  so *gladly*, *quickly* and *softly* moved to 53 and *kindly* to 68, where the
  long i it needs is taught. Level 98 keeps *helpful playful useful* and teaches
  -ful alone. It is the same word bill as 23 and 24 above: the other three -ful
  words in the target vocabulary are already seated EARLIER - *thankful* at 24,
  *wonderful* at 54, *careful* at 85 - so the only way to reach six here is to
  drag a word backwards past the level that made it readable. SPEC section 12
  owns the ruling; `docs/open-faults.md` section V owns what those three earlier
  words mean for -ful.
- The shape and the ladder disagree about what THREE levels teach - 46, 49 and
  94, measured 2026-08-19. This bullet named only 49 and 94 until then.
  At 46 the shape says "two letters, one sound" and rule `double` where the
  ladder says "doubling before an ending" and `double_suffix`. At 49 the shape
  says "the e at the end with a job", rule `silent_e_jobs`, graphemes
  `ce=s ge=j se=s ve=v ze=z`, and the ladder says "a doubled letter in the
  middle", rule `double_medial`, no graphemes at all. Those two look like one
  drift rather than two, since the ladder's 49 carries a doubling subject that
  belongs beside 46. At 94 the ladder says `ch=k ch=sh` where the shape says
  `ch=k`. **Nothing else disagrees about a subject.** The other 33 levels whose
  `new` fields differ are the same graphemes with the sound half missing from
  the ladder's copy, which is the "graphemes written without their sound" count
  `tools/ladder-status.mjs` already reports - not a second opinion about what
  the level teaches.
- `corpus-harvest.json` is the output of a pipeline that produced fabricated
  citations three times before its faults were found. The passages in this file
  were verified contiguous; **a person still reads every text before it ships**,
  because public domain is not a screen (`docs/settled.md`).

A future reader who needs to know how a number here was arrived at should read
`docs/redesign-plan.md` first and `docs/settled.md` second.
