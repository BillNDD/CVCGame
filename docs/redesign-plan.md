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

Measured again on 2026-08-19, after `tools/ladder-fill.mjs` seated the 162
target words the generator had placed at no level at all: 100 levels, **887
words placed, 3 empty levels, 22 under six words**. The other four numbers did
not move. The fill ADDS ONLY - the owner ruled "Keep them" of the 214
generator-invented words on 2026-08-19, and no word was evicted, reordered or
dropped; every level's existing list survives unchanged as the head of its new
one, and each level's `filled` array names exactly what arrived.

Why the counts moved the way they did. Empty levels fell from 8 to 3 because
five of them - 23, 24, 62, 65 and 74 - had on-topic target words waiting and
nothing had ever offered them a seat. The three that remain are 32 (coda3), 72
(the open-syllable long a) and 94 (ch saying k and sh): no word in the target
vocabulary is on topic for those, so they are a word bill for the owner rather
than a level to pad. "Under six" reads 22 both times and that is a coincidence
worth spelling out, not a sign nothing happened: three levels left the list by
being filled past six (59, 63, 84) and three entered it (23, 24, 65), every one
of those three by rising out of empty rather than by losing anything. Counted honestly - levels under six INCLUDING the empty ones - the
number went from 30 to 25.

Measured a third time on 2026-08-19, after the owner ruled "L53 teaches y-to-i
AND -ly" and four words moved down the ladder: 100 levels, **887 words placed, 3
empty levels, 21 under six words**. Counted with the empty ones, 25 became 24.
Nothing was added and nothing was removed - 887 is the same 887 - so every
movement here is one level's loss and another's gain. Level 53 went from 5 words
to 8 and level 68 from 5 to 6, which took both off the under-six list; level 98
gave up four and fell from 7 to 3, which put it on. Three words at 98 is a word
bill for the owner in exactly the sense levels 23 and 24 already are, and it was
NOT padded. The target vocabulary does hold three more -ful words, and every one
of them is seated earlier - thankful at 24, wonderful at 54, careful at 85 - so
filling 98 would mean dragging a word back up the ladder past the level that
made it readable. That is padding under another name.
Measured a fourth time on 2026-08-19, after the owner ruled on a 107-word bill
for the levels that could not teach their own subject: 100 levels, **990 words
placed, ZERO empty levels, 12 under six**. He accepted every word offered and
refused none. The bill was not padding: each candidate had to exercise its own
level's subject, and each was checked for the SOUND it needs rather than only
its letters - the check that open-faults section U exists for. Nine levels that
could not demonstrate their own rule now can, and level 35 is the clearest: its
only remaining word was `blind`, which a child at 35 reads to rhyme with
`grinned`, so the level taught "start and end together" through none of its own
words. It now holds ten blends whose vowels all stay short.

The 107 joined `tools/target-vocab.txt` the same day, taking it from 715 lines
to 822, on the precedent of the 295-word bill the owner ruled on 2026-08-18.

`tools/ladder/README.md` carries the thin level beside 23 and 24. SPEC section
12 owns the ruling itself, and `docs/open-faults.md` section V carries what
those three earlier -ful words mean: -ful now has the fault -ly just lost.

## Where the work stands - 2026-08-20 evening, written for the context handoff

Every thread below is in flight this minute. A successor picks up HERE.

**1. The move bill (owner-ruled: hybrid).** DONE and committed (fd1c239): into,
find, old, hold seated-marked-bent-shipped; comes deferred to the silent-e
batch. REMAINING, and these land as ONE commit so the every-text-after-its-words
invariant never breaks between commits: (a) the ladder moves cold/gold/fold to
68, over/tiger/tigers to 72, wallet to 55, and chef LEAVES level 94 entirely
(owner: "You can leave chef out"); (b) the eleven repaired texts below replace
their rows in tools/pending-words/pending-words.json, re-rendered and
owner-approved by ear first (renders were running in the session scratchpad as
sbatch18; if lost, re-render from these texts with tools/render_sbatch18.py);
(c) a read-only literacy reviewer was checking these eleven for the drafting
blind spots the owner keeps catching. ITS VERDICT IS IN and is folded into the list below:
five of the lead's drafts were reworded (13-01 was word salad, 46-02 had a
snapped causal spine, 67-01 used an adult idiom, 48-01 stuttered, 71-01's
goats collided with the approved baby-goat text one level up - sheep now -
and 94-02's fix above). RESOLVED 2026-08-20 evening: all eleven re-rendered
and put to the owner on the sound14+eleven page, all eleven "perfect" by
read and by ear; the moves, the repairs and the re-reads landed as the one
commit this thread demanded. The level-94 hole the reviewer surfaced was
ruled the same evening: the owner chose to BANK MACHINE to carry ch=/sh/ -
against the narrow-to-/k/ recommendation, and his word outranks. machine is
seated at 94; round 15 gave it its clip the same evening (machine_5,
listen_sp0.75, "perfect"), and its bends (a schwa, ch=/sh/, i_e saying
long e - machine is an exception to the magic-e rule the owner named) can
now land on the seated-marked-bent-shipped pattern. Round 15 also paid
mechanic's comeback debt (accepted on word_sp0.75, a family its refused
round never offered) and took apron's first clip - the recording debt is
ZERO again.

The eleven, validated against the POST-move ladder (id, level, full text):
- s:v3-l13-01 (13): Dad left the lid on the pot.
- s:v3-l13-02 (13): Mom let me get the map.
- s:v3-l46-02 (46): I am swimming at the pond. Dad is sitting on the bank. The sun went in, so I stopped. Mom got me a hot cup of milk. I am so glad!
- s:v3-l52-02 (52): Mom hung the wet socks up to dry in the sun. Then the sky went black. I said, why not get them in? We did try, and we got every sock in fast. Mom said I was quick, and my socks are dry.
- s:v3-l67-01 (67): Mom set a hot pie on the step. The sun was bright and high, and the pie was hot all day. Then the flies came, as they wanted the pie as well. I sat by the step and did my best to help. But every fly that went up came back. So Dad got a net and set it on top of the pie. The flies had to go, and we had the pie at sunset. (An earlier entry here read "hot for a long time" - withdrawn the same evening: "for" is taught at L81, the rehearsal caught it, and the owner ruled this wording perfect in round 15.)
- s:v3-l41-01 (41): I am having a muffin. A bit fell on the mat. The cat ran up. She got it fast!
- s:v3-l48-01 (48): I wash the dish. A little bubble went up. It got to the middle of the den! Then - pop! Simple fun.
- s:v3-l71-01 (71): It was a holiday, so we went to see the sheep. Every sheep was sleeping in the sun, and we needed them to get up. We sat on the grass and had an apple. Then a man came with a sack of dinner. The sheep got up so fast that my apple went in the mud. Mom said that was the best bit of the holiday. When we got home, I painted a sheep and we hung it up.
- s:v3-l42-02 (42): Dad did not have his jacket at the shop. We went back to the van to find it. It was not in the van! Then Mom got it from the backpack, and Dad was so glad.
- s:v3-l94-01 (94): unchanged except "the school chef had a long table" becomes "there was a long table".
- s:v3-l94-02 (94): unchanged except "The chef gave me" becomes "The men gave me" - the six who raised the anchor; the reviewer refused "a kind man", an unnamed adult offering an unwell child food being stranger-danger phrasing verbatim, the "My dad can pat me." shape.

**2. The uf and off cluster sounds (owner-ruled: record them, the x/qu
precedent).** They are the /uf/ of rough-tough-enough and the /off/ of cough,
one tile carrying two sounds. Bake method is tools/render_sounds13.py's,
verbatim: phoneme carriers at speed 1.0, is_phonemes true, target LAST, cut by
last energy island, the bake's polish. The four arms per sound - citation, citation at speed 0.85, trio with the target last, and
continuation; the exact phoneme strings live in the session script
render_sounds14.py, and the method note above re-derives them. HEARD AND
SHIPPED 2026-08-20 evening: the CONTINUATION arm won for both sounds
("perfect"; citation arms "good", trios "no good" - logged in
round-verdicts.json), d:uf and d:off shipped, rough/tough/enough bent their
ough tile to uf and cough to off, and all four joined level 92's heart list
beside dough/though/through - the seven hearts the ough ruling named, DONE.

**3. Rulings enacted but not finished.** The ch ruling (Greek six stay and
TEACH the exception, chef out) is HALF PAID, and the half is a measured
tile-count fact, not a choice: a WORD_SOUND bend pulls its word into
bankWords() today, and the tile-row law still caps the shipped bank at four
tiles (SPEC section 4). anchor, chorus and school tile at four - they are
bent, banked and SHIPPED (2026-08-20 evening: anchor n=/ng/ ch=/k/ or=/er/;
chorus ch=/k/; school ch=/k/ oo=moon, which its seat cannot determine and
the bare-oo fallback id would silently miss). stomach (6 tiles), mechanic
(7), orchestra (7) and machine (6) CANNOT enter today's bank without
breaking that law - their bends land at conversion, when the four-tile law
is re-derived against a ladder full of long words. come/love/some/live/comes
await the SILENT-E mechanism - the one engineering piece that also unlocks
every magic-e word's audio (cake, kite, bite, line; the owner's own rule:
the vowel says its name and the e is silent).

**4. The beta path from here, in order:** (a) land the move+repair commit;
(b) uf/off round to the owner, ship, bend; (c) the Greek five's vowel bends;
(d) the FAIL-LOUD fallback in soundIdFor - reviewer and lead already agree -
which turns every unmapped tile from a wrong guess into a loud gate finding;
(e) the silent-e mechanism with controls; (f) build --write in
tools/convert-ladder.mjs (the splice/reversibility machinery to reuse is in
tools/conversion-rehearsal.mjs); (g) re-derive the test literals by hand;
(h) G27 to zero BREAKS; (i) the full gauntlet, then beta. The drift refactor
(section 7b) runs after green, before that beta.

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

## THE BLOCKER — LIFTED 2026-08-19, with one half left and it is the owner's

**The chunker sees the whole contiguous code.** Nineteen multi-letter units became
seventy-two, read off the `new` fields of `tools/ladder/shape-v3.json` rather than from
memory, with the position rules that keep a syllable ending off the front of an ordinary
word. `see` is s-ee, `boat` is b-oa-t, `night` is n-igh-t, `caught` is c-augh-t.
`tests/chunker.test.js` owns the roster, and every position rule is proved by a bank word
that would break without it — `leg`, `get`, `set`, `vet`, `red`, `tin`, `tub`, `pal`.

**It moved nothing a child can see, and that was measured rather than hoped.** Across all
476 words a child can meet today — the whole bank plus every word of every shipped
sentence — **zero re-tile**. The tile-row histogram is unchanged and pinned as a literal.
That is the same verification `ai` and `ou` were held to on 2026-08-12.

**The half that is left is the owner's, not an engineer's.** Split vowels (`a_e i_e o_e
u_e e_e`) are NOT in the chunker. They are discontinuous, and this chunker's output IS the
tile row and IS the dashed text a child reads: emitting `c-a_e-k` for "cake" breaks
property P1 and prints tiles in an order the word does not have. S8 owns what shows as one
tile and every entry in its list carries an owner ruling, so this one does too. Nothing is
blocked by it today — `tools/ladder-fill.mjs` already models split vowels for LEVEL
arithmetic, where nothing has to round-trip, and that is where the ladder reads them.

**The second-order effect this section warned about does not exist any more, and the
warning was right when it was written.** It said the generator's grapheme accumulator would
make the new units available twenty levels early the day they joined `DIGRAPHS`. That
generator is gone — this document's own note records that it lived in a session scratchpad.
Its successor, `tools/ladder-fill.mjs`, imports only `node:fs` and `node:url`, builds its
inventory from `shape-v3.json`, and never reads the engine. Verified before the change and
again after: the coupling is severed, so extending the chunker could not and did not move
the ladder's decodability check.

**What DOES still wait, and it is the next thing.** No new unit has a `TILE_SOUND` row, so
at the cutover each will fall through to `"d:" + spelling` — ids no clip exists for. That
is open-faults section B's fault shape, fifty-two times over. The rule is already written
by the shape itself: a spelling it teaches with exactly ONE sound takes that sound; the
thirteen it teaches with two defer and must bend per word, exactly as `ai` and `ou` do. It
was deliberately not done in the same change, because seven of the sounds it names are
approved and unshipped, and the roster test in `tests/engine.test.js` already fails loudly
at the cutover and forces the decision then.

### What it was, kept because the diagnosis was right

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

### 1. Extend the chunker to the whole code — DONE 2026-08-19, except split vowels
Seventy-two contiguous units are in `reference/word-quest.jsx` with their position rules;
`src/engine.js` is regenerated by `tools/extract-engine.mjs`, never by hand (E1). Split
vowels are the owner's ruling and are described in the blocker section above.

**What it actually broke, against what this line predicted.** The prediction was that the
grapheme count (44), the fallback list and the roster in `tests/engine.test.js` would all
have to be re-derived. **None of them moved**, because no bank word re-tiles: that test
measures what the BANK produces, not what the chunker CAN produce, and today's bank
contains no vowel team at all. What did move: the `DIGRAPHS` literal, P2 in
`tests/properties.test.js` (nineteen units to seventy-two, three letters to four), and the
G6 file-length ceiling — `tests/engine.test.js` went to 1452 lines against a limit of 1400,
so the new tests live in `tests/chunker.test.js`. It could NOT be fixed by moving the old
tests out, because the `g1_unit_tests` floor is read from that file's own name and moving
them would have lowered a floor (E6). The tile-row law was re-measured and is unchanged:
the bank is {1:2, 2:30, 3:344, 4:100} tiles, capping at four, before and after.

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

**The four conversion rulings landed 2026-08-19**, owner-clicked on the
decades-and-rulings page, and the converter (`tools/convert-ladder.mjs`) is
built and dry-running green against them:

- **Decade names.** "Numbered levels and names for each decade" - ten names,
  all approved as drafted, in `tools/ladder/decade-names.json`. A level's name
  and emoji are its decade's; its focus line is the shape's own `teaches` text.
- **Sessions at small levels: accept shorter early sessions.** A session is
  the level's words plus the review that is genuinely due; when that runs out
  it ends. The home copy's own "up to 20 words" already says so. SPEC's
  "serves 20 words at a time" sentence gains this ruling at conversion.
- **Paragraph sound-out: the level's own taught word, else the longest.**
  Extends the 2026-08-13 longest-word ruling, which answered sentences and
  was silent on paragraphs. G27 measures 20 texts where no level word appears
  and the longest-word fallback carries those.
- **Chooser copy derives its bank count at build time.** "All 476" went stale
  once before (SPEC records it); after this it cannot lie again.
- **Heart words seat inline** - not a new ruling but the game's own precedent
  (shipped level 1 carries the, a, and, i in its words array), followed.

The ai/ou ruling from the same page is recorded in `docs/settled.md` and
CLAUDE.md S8, because it supersedes a prior ruling rather than filling a gap.

What --write still waits for, and it is one thing: **the 95 bill words'
listening verdicts.** The voice-pack gate requires a clip for every word the
engine names, so the converted engine goes red until those clips are approved
and shipped. The rounds are rendered and in the owner's hands.
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

### 7b. The drift refactor - owner-briefed 2026-08-20, runs after green, before beta

The owner's instruction, corrected in his own words when the first reading got
it backwards: drift-related files are "meant to be by and for the agents", and
he wants them "restructured for maximum machine comprehensibility and
legibility without giving any consideration to human readability."

Three rulings, given one page at a time on 2026-08-20, form the brief:

1. **Full grant.** The derived prose views retire - file-map.md and
   effect-map.md become schema'd JSON, G16 and G23 are rewired to read the
   JSON with the SAME cross-checks, every retired path gets a tombstone in the
   map, and the owned set is amended accordingly. Every floor, ceiling,
   control and cross-check survives; only formats change.
2. **One computed entrypoint.** A `drift --state` command composes the whole
   drift picture - every owned fact, owner, floor, ceiling, effect mapping,
   blast index - into one schema'd JSON with stable ids and per-section
   provenance (input hashes and generation stamps). It is computed live and
   NEVER COMMITTED, so no fact ever exists in two places on disk and the
   no-copied-facts rule is never in tension. The existing tools remain the
   computers; the entrypoint composes them.
3a. **Rationale is a REQUIRED field on every rule, threshold and check**
   (owner-endorsed 2026-08-20, from a sidecar's argument the lead reviewed and
   agreed with). The agent reading these documents is a reasoner, not a
   parser: structure buys unambiguity, rationale buys correct behaviour in
   the cases no rule set anticipates. Mechanics, all four adopted: LOCALITY -
   the rationale sits on the same object as the rule it explains, never in a
   distant section; CONTENT - why the check exists, which false pass it
   prevents, what the miss costs a real child, and if deleting the rule
   would not let a competent agent re-derive it from the rationale alone,
   the rationale is noise and goes; PRECEDENCE - rationale is non-normative
   and the threshold governs on conflict, with ONE exception: a rationale
   naming a specific false-pass mode makes avoiding that mode part of the
   check (the E5 philosophy as data); SCHEMA - rationale is required by the
   validator, so an unjustified rule is a lint failure. Two refinements of
   the lead's: normative numbers never appear in rationale but INCIDENT
   numbers do ("7,680 CRLF pairs, 2026-08-19" is the strongest
   anti-rationalization device this repository owns), and every rationale
   that rests on an owner ruling carries `ruling:` and `date:` fields with
   his words verbatim, machine-findable.

3. **settled.md and open-faults.md convert fully** to structured entries,
   machine-first throughout, with the owner's quoted words as fields. Chosen
   over the recommended index-over-prose, on his authority. The one safeguard
   that stays: the migration must prove every quoted ruling byte-identical to
   the source prose before that prose retires, and it produces old-vs-new
   diff pages for the owner's spot-check - roughly sixty settled entries and
   every open fault - because a nuance lost in translating HIS rulings is the
   one unrecoverable failure this refactor could have.

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
