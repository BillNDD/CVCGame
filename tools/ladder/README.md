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
| `ladder-v4.json` | The words placed at each level, from the rebuilt generator after all sixteen audited faults were closed and the silent fill deleted. |
| `word-bill.json` | The candidate words for levels the approved sources could not serve. The owner ruled on these: 295 offered, four refused, 277 added to `tools/target-vocab.txt`. |
| `corpus-harvest.json` | What the public-domain pipeline found: single sentences and contiguous passages, each with its book credit and its index in the source. |

## How far to trust them

**These are DRAFTS, not the game.** The engine's levels are still the 21 in
`src/engine.js`; nothing here has been converted to code, and the conversion is
the largest gate movement this project will make.

Known faults at the time of committing, all recorded in `docs/redesign-plan.md`:

- Eight levels in `shape-v3.json` seat zero words: 23, 24, 32, 62, 65, 72, 74, 94.
- Level 23 teaches `ch` and no `ch` word exists in the ladder until level 88.
- Level 24 teaches the quiet `th` and no quiet-`th` word exists anywhere - and
  it is the child's first paragraph.
- The shape and the ladder disagree about what level 49 teaches.
- `corpus-harvest.json` is the output of a pipeline that produced fabricated
  citations three times before its faults were found. The passages in this file
  were verified contiguous; **a person still reads every text before it ships**,
  because public domain is not a screen (`docs/settled.md`).

A future reader who needs to know how a number here was arrived at should read
`docs/redesign-plan.md` first and `docs/settled.md` second.
