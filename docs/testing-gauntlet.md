# Testing gauntlet — gate specification (G1–G27)

**This document owns** the gates: what each one proves, what it cannot prove, and the floor
or ceiling it holds in `.claude/gate-baseline.json`.
**It does not own** the behaviour under test — that is `SPEC.md` — nor the rules that say a
gate may never be weakened, which are `AGENTS.md` E3 to E6.

This document defines the quality gates for Word Quest. The owner reviews this document, not
every line of code. The gates are the contract. `npm run gauntlet` runs every automatic gate.
A change is complete only when the gauntlet is green.

This document follows the Microsoft Writing Style Guide.

## G26 - the waiting room is internally honest

`node tools/waiting-room.mjs`, with `--self-test` for its controls. Six rules
over `tools/pending-words/`, owner-approved 2026-08-19 before a line was
written:

1. Every row's sha256 matches the bytes of its clip on disk.
2. Rows and clips are one-to-one - no orphan clip, no row without bytes.
3. No two rows share the same bytes. This is the one that earned the gate: the
   arm-id collision found on 2026-08-18 was prevented only by a naming
   accident, and the same shape reappeared in sentence ids the next day.
4. A row carries the fields its kind needs - a word row `arm` or `file`, a
   sentence row `text`.
5. A row claiming a book credit has its text verbatim in a book pinned by
   sha256 in `tools/corpus/sources.json`. Born from a fabricated citation: five
   of sixteen passages in the first corpus run joined text from either side of
   a lesson heading and credited it to a real book.
6. Every verdict is `perfect` or `either-is-fine`. Two values, not one, because
   they mean different things: the owner chose, or the owner declined to choose
   and a tool broke the tie.

**What it cannot do.** It cannot prove the bytes are the ones the owner heard -
only `tools/record-takes.py` can, by refusing at the moment of writing. It
cannot catch an `either-is-fine` row collapsed to `perfect`, because that is a
legal value; the limit has its own control that asserts the miss rather than
hiding it. Sub-second over ~960 rows, so it runs in `npm run check`.

## G29 - the maintenance bands are in step with the books they come from

`node tools/word-bands.mjs --check`, with `--self-test` for its ten controls (floor `g29_controls`) and no flag for the
report a person reads. Owner-ruled 2026-08-31 (fault AQ): frequency-banded maintenance, ranked
from the fourteen public-domain books already pinned in `tools/corpus/sources.json`.

**What it protects.** A mastered word leaves every due lane, and the only way back is the
confidence lane's two slots a session. Drawn flat over 1,102 words that was a 551-session wait
for every word alike - the same budget spent on `ox` as on `the`. The bands decide how the
budget is spent instead. The gate makes sure the lists compiled into the engine still match the
books they were derived from: edit a corpus file, or hand-edit the literals, and this goes red.

**Why those books.** SUBTLEX-US covers more (~100 percent against 84.5) and its author permits
any use; Dolch 1936 is public domain outright. Both were costed on the decision page and both
need a new file, a new licence note and a new provenance argument. These books need none - they
are already owner-approved, byte-pinned and screened, and they are what a child reads in this
game. It is also what rung 1 of the dependency rule asks for: look in the repository first.

**The gap, stated rather than hidden.** 173 bank words appear in none of the books - `mom`,
`sip`, `pad`, `pigpen` and their kind, invented for phonics drill and rare in real prose. An
unranked word takes the MIDDLE band, never the rare one, so nothing disappears through a hole in
the data. Two controls hold that: one proves an unranked word is not rare, and one proves it
appears in neither emitted list, which is how it inherits the middle by default.

**Band sizes are fractions of the WHOLE bank, not of the ranked part,** and that distinction was
paid for. Sizing by rank put all 174 unranked words on top of a middle band already 30 percent
of the ranked list, swelling middle to 459 words and its wait to 656 sessions - worse than the
551 it exists to improve, and not the 481 the owner was shown when he ruled. Caught by measuring
the built bands instead of trusting the decision page's arithmetic. A control now pins it.

**The split is the engine's, not this tool's.** 50/35/15, written as an exact twenty-slot cycle
(ten common, seven middle, three rare) so the share is a fact a test asserts rather than an
average it samples. Measured by tallying the lane's ACTUAL picks over 400 sessions:
**49.9 / 35.1 / 15.1**. An earlier figure of 54.0/32.6/13.4 stood here and was wrong - it came
from a proxy that counted box-5 words below the child's level, which is biased because rare
words cluster at high levels and are excluded while the child is on them. The engineering seat
caught it on 2026-09-01 and measured the same 49.9/35.1/15.1 independently. The fall-through
still matters and has its own test: an empty band gives its slot on rather than wasting it.

## The QA build-out — definition of done (owner-ruled 2026-09-01, for beta 31)

The owner's words: "I also want to make qa part of gates or CLs or tests. I want to minimize
how much personal QA I need to do." Ruled the same day, together with the census build-out of
2026-08-12 ("all of it, and the other browsers first") which this absorbs. Every item below is
a measurable done; none is a wish.

**What is true at the start (2026-09-01).** `docs/qa-procedure.md` holds 48 numbered steps.
G12 checks that each carries an `Expected:` line and never runs one. The browser gates run on
Chromium only; WebKit 26.5 and Firefox 153 are now installed and launch. Of the 48 steps, about
30 can be proved by a machine today, about 9 need a real device by their nature (an install
container, an address bar, a screen reader), and about 9 need ears or eyes - and the record
already carries the boundary: beta 27 passed every gate and the owner found the invisible muted
Glowseed in five minutes on a phone.

### 1. Three engines, one census

- G7, G8 and G18 run on Chromium, WebKit and Firefox. WebKit is the engine of every iPhone
  and iPad, the devices the owner QAs on; until this lands no gate has ever run it.
- **Done means:** each of the three gates reports a per-engine count, the floors hold on every
  engine, and a control proves an engine-specific fault is caught (a `-webkit-` property with no
  standard fallback, planted, must fail on WebKit and pass on Chromium).
- The eleven capabilities of the 2026-08-12 ruling land here, each as a cell or a check with a
  control: `toHaveCSS` on font sizes; `toBeInViewport({ratio})` (this alone would have found the
  buried working-on list); `toMatchAriaSnapshot`; `page.clock`; the four unvisited states (the
  close reveal, the wrong reveal, the done screen, the update row); rectangle overlap beyond a
  control's centre; `setEmulatedVisionDeficiency` on the result controls; `emulateMedia` for
  forced colours, contrast and colour scheme; CPU throttling, network conditions and a routed
  delay for the loading-state class of fault; `@axe-core/playwright` on every cell; the device
  descriptors with their own `deviceScaleFactor`.

### 2. The monkey - what a four-year-old does to it

- `tests/ui/monkey.mjs`, promoted from the scratchpad draft: a seeded storm of random taps,
  double-taps, drags and key presses across the screens, on the two phone profiles, on all three
  engines.
- **Done means:** after the storm - no page error, no console error, the shell still present,
  `state.words` in IndexedDB byte-identical to the seed (S1: no random gesture is an adult holding
  a result control), and the session count unmoved. Seeded RNG so a failing storm replays. The
  negative control plants a programmatic `applyResult` and the same probe must fail.

### 3. Every QA step proves itself, or says why it cannot

- Each of the 48 steps gains a `Proof:` line, one of two shapes:
  `Proof: G7 check 63` - a named check in a gate, or
  `Proof: human - <why no machine can>` - the reason, in words.
- G12 grows three rules, each with a control: a step with no `Proof:` is refused; a `Proof:`
  naming a gate check that does not exist in `docs/effect-map.md` is refused (a step that claims
  a proof it does not have is a lie the script would otherwise keep); and a `human` reason must
  name a capability from a fixed list - install container, address bar, screen reader, ears,
  eyes - so "human" cannot become the easy default.
- The ~30 tier-A steps become rendered checks with controls, on all three engines, and their
  `Proof:` lines point at them. The script's step count does not fall - a proved step stays in
  the script as the record of WHAT is proved - but its human count does.

### 4. The owner's checklist, derived, never hand-kept

- `node tools/qa-check.mjs --human` prints the steps whose proof is `human`, with their reasons,
  as the release-day device pass. It is generated from the script every time, so it can neither
  drift from the script nor grow quietly: a step joins it only by carrying a `human` proof that
  names its capability, which is an owner-visible diff.
- **Done means:** the printed list is at or under **12 steps** at the beta-31 cut, every one
  naming its capability, and `docs/qa-procedure.md`'s header says the checklist is derived and
  how to print it. The number is a ceiling in the baseline (`g12_human_steps_max`), so the human
  share can only shrink without an owner-visible diff.

### What this cannot do, stated so nobody quotes it for more

The machines prove geometry, ratios, state, bytes, network and order. They cannot prove that a
person perceived something - the muted Glowseed is the standing example, and it is why the
derived checklist has a floor above zero and why the release still ends with a phone in a hand.
The build-out's job is to make that hand's list short and true, not to pretend it away.

**Floors that move (E6):** `g7_interface_checks`, `g8_checks`, `g18_checks` (per engine),
`g12_qa_steps` up, a new `g12_human_steps_max` ceiling, `g20_tests_mapped`, and the census cell
count. **Order:** engines first (the 2026-08-12 ruling), then the monkey, then the proofs; then
art step 3 is judged on the result; then beta 31.

## G28b - CLAUDE.md takes no new rules, and nobody may credit it with old ones

`node tools/claude-md-shape.mjs`, with `--self-test` for its twenty-one controls (floor `g28b_controls`). Owner-ruled
2026-08-31, twice: first "I want you to suggest some way for future agents, who go looking to
add rules to claude.md instead of agents.md, are always redirected", and then "I don't want to
do anything else until claude.md and agents.md is sorted out forever".

**What it protects.** AGENTS.md is the controller and CLAUDE.md owns the nine child-facing
safety rules and nothing else. That split is worth nothing if it decays, and prose is what
decayed last time: this repository ran for weeks with a CLAUDE.md that named AGENTS.md four
times and never once told anyone to open it.

**Half one - nothing new gets written INTO CLAUDE.md.** A section heading the file is not
declared to have, an E-numbered rule written there, a safety rule outside S1-S9 in either
direction (a tenth is the owner's to add; a DELETED one is caught too, so the file cannot
quietly shrink), and the pointer to the controller being removed **or softened** - "read it in
full" weakened to "may be of interest" is refused, because naming a file is not the same as
being told to read it.

**Half two - nobody CREDITS CLAUDE.md with a rule that moved.** This is the half that had no
gate and needed one. G23 refuses a document carrying a fact it does not own; prose naming the
WRONG owner is not that shape, which is fault F3, and on the day of the split it bit twenty-two
times - twice inside AGENTS.md's own opening paragraph. It became checkable only because the
split left CLAUDE.md owning exactly one thing: a line that credits CLAUDE.md with a rule must
be about a safety rule, and an E-number named beside it is stale with no verb needed.

**Why the window is three lines.** The first version read only the line and the one after it,
and its first four findings were all wrong - "Safety rule S8 in / CLAUDE.md owns the list of
those units" wraps so the verb lands below the word that makes it true. A gate whose opening
run cries wolf four times is a gate somebody switches off, so it reads a sentence's worth of
context in both directions. Both false-alarm shapes are now controls that must PASS.

**What it cannot do,** stated so nobody quotes it for more than it is: it cannot catch a
sentence crediting CLAUDE.md with a safety rule it does not actually have. That is still a
person's job - but there are nine rules, they fit on one screen, and this gate makes that the
only reading left to do. Scans 278 tracked text files in under a second, so it runs in
`npm run check`.

## G28 - how many new sounds one word may teach

`node tools/sound-load.mjs`, with `--self-test` for its twelve controls (floor `g28_controls`) and `--list` for the
report a person reads. Owner-asked 2026-08-31, on being shown the fault by hand: "shouldn't
we have some test or gauntlet that prevents this from ever happening, since we already know
what sounds go into what words".

**What it protects.** A word may introduce at most ONE grapheme-sound pair the child has not
met at an earlier level. Two at once teaches neither cleanly: a child who reads it wrong has
no way to know which half they missed, and a child who reads it right may have guessed. The
engine has always known every word's sounds, so this question never needed a person to
answer it - and yet on 2026-08-31 a person answered it, by hand, because no gate asked. That
is the hole this closes.

**How it works.** Every word is decomposed into pairs by joining `chunkWord` to
`soundIdsFor` - the tiles the child sees against the sounds they make, which are the same
length for every bank word. The pairs the pre-levels teach are counted first. Then the
ladder is walked, and a pair is new if no EARLIER level taught it.

**Counted against strictly earlier levels, never against the level's own words.** Within a
level the words are shuffled, so a child may meet "picture" before "adventure"; letting
level-mates cover for each other would credit a teaching order no child is promised. That
distinction is worth two words on its own: counting within-level order as help reports ten
words, and counting honestly reports nineteen. A control asserts all six of Level 96's
`-ture` words are flagged, not just the one the array happens to list first.

**A repeated pair is one pair.** "mom" spells m twice and teaches m once. Counting it twice
was a real artifact of the hand count that preceded this gate, and is now a control.

**The ledger, `tools/sound-load-ledger.json`,** declares the fifteen words that need two,
each with its reason. Seven are heart or tricky words the game already teaches by sight, and
they are listed rather than skipped so the exemption stays visible. Of the fifteen, only four
carry a sound the child has never met and one carries a single new sound - the other ten are
new SPELLINGS of sounds already known, which the gate now says on every line.

**It is checked in both directions.** An undeclared word is red; so is a declared word that
no longer needs its line, and so is a declared word whose pairs have moved. A ledger that
keeps entries after they stop being true decays into a blanket permission, which is how a
list of exceptions becomes a list of nothing.

**The sentence half was already guarded** and is asserted here anyway. `tools/decodable.mjs`
and two tests in `tests/engine.test.js` prove every sentence uses only words taught at or
before its level, in both directions - no sentence early, and none parked later than it needs
to be, with the thirteen review texts pinned by name rather than skipped. Since a word's
sounds arrive with the word, the sound-level claim follows today. G28 asserts it regardless,
because the two run off different engine data: the day the word list and the sound
decomposition stop agreeing, this is the check that says so instead of a child meeting the
difference.

**What it cannot do.** It cannot say whether a double is bad TEACHING - only that it exists
and was declared. Whether Level 96 should hand a child `tu`=ch and `re`=er together six
times over is the owner's question, and the gate's job is only to make sure nobody has to
find it by hand again. Sub-second over 100 levels and ~1,100 words, so it runs in
`npm run check`.

## G27 - the conversion rehearsal

`node tools/conversion-rehearsal.mjs --check`, with `--self-test` for its controls and no
flag at all for the report a person reads. Owner-ruled 2026-08-19: "Build a conversion
rehearsal, and gate it."

**What it protects.** Seven faults were found in one week, every one by a person going
looking and not one by a gate. They share a shape: code that is correct for a 21-level world
and wrong for a 100-level one, where nothing fails until the data changes. Every other gate
here measures the ladder that ships today, so all seven would have fired at once inside the
conversion release. This gate moves that discovery forward by however long the redesign takes.

**How it works.** The two data literals in `reference/word-quest.jsx`, `LEVELS` and
`SENTENCES`, are spliced out and replaced with the 100-level ladder
(`tools/ladder/ladder-v4.json`, `tools/ladder/shape-v3.json`, and the banked texts in
`tools/pending-words/pending-words.json`). The substituted reference goes through
`tools/extract-engine.mjs` — the real extractor, run as itself — and the module it produces
is imported. `app/src/App.jsx`'s truly-random block builder is sliced out at its own anchors
and re-exported against that module. Then the real functions run over every level:
`buildSession`, `trayPool`, `buildTray`, `chunkWord`, `soundIdFor`, `soundIdsFor`,
`sentencesUpTo`, `sentenceWords`, `revealWord`, `revealWordLongest`, `voiceScript`,
`bankWords` and `buildRandomBlock`.

**Why it is a splice and not a re-implementation.** A rehearsal that re-derived what the
engine does would pass while the engine failed. Only the data changes; the splice is proved
reversible byte-for-byte before it is used, and the substitution is checked after import.

**The finding classes** are `g27_classes` (17), each with a ceiling that only comes down
(E6). A count above its ceiling is red. A count below prints the number to lower the ceiling
to. A class with no ceiling at all is red — `count > undefined` is false, which is how a
ceiling silently stops existing. A finding class the ledger does not know is red, and that
is the clause that catches the eighth fault nobody has thought of yet.

| tier | class and ceiling | what it means |
|---|---|---|
| BREAKS | `g27_throws_max` (0) | a real function threw on what the ladder produces |
| BREAKS | `g27_no_value_max` (0) | a real function returned nothing where a value is required |
| BREAKS | `g27_sound_no_clip_max` (7) | a tile unit resolves to a sound id in no pack and no waiting room. Raised 14 to 15 by the owner (2026-08-20, pit-and-ow page) when the fail-loud fallback exposed unruled ow, then lowered to the measured 7 after the cutover shipped (E6, lower-when-better): the seven are exactly the deliberately default-less units - ea, ere, ey, ie, oo, ow and the one-use ugh - every occurrence of which is lexicon-bent, so no clip is owed. |
| BREAKS | `g27_tray_no_clip_max` (0). Raised 177 to 211 by the owner (2026-08-20, tray-ceiling page) for the same exposure as the sound ceiling, lowered to the measured 196 the same evening when the probe learned to honour buildable(), and collapsed to 0 when the cutover shipped every tray sound (E6) | Build-it would deal a tile whose sound has no clip |
| BREAKS | `g27_word_no_clip_max` (0) | a bank word has no word clip anywhere - REPORTS ONLY, held by the sum below; 0 since the cutover shipped the room |
| BREAKS | `g27_sentence_no_clip_max` (0) | a placed text has no clip anywhere |
| BREAKS | `g27_text_word_untaught_max` (0). Lowered 1 to 0 on 2026-08-20 when sentenceWords learned that a token with no letter is punctuation, closing the dash finding the ceiling of 1 had carried since the gate was born | a placed text uses a word the ladder does not teach by that level |
| BILL | `g27_clip_unshipped_max` (0) | approved, in the waiting room, not yet in the pack - REPORTS ONLY, held by the sum below; 0 since the cutover shipped the room |
| BREAKS | `g27_word_clips_missing_max` (0) | `word_no_clip` + `clip_unshipped` together. The two are one debt in two rooms, and approving a listening round moves a word from the first to the second - success, which under separate ceilings reddened the build while the total had not moved. Gating the sum cannot be satisfied by shuffling. Born at the measured 917, lowered to 913 when the gate learned to sum, lowered again to 909 when the move-bill repairs and round 15 landed, to 905 when the ough hearts shipped their four clips, to 902 when anchor, chorus and school shipped on their Greek-ch bends, to 898 when come, some, love and have shipped with the magic-e rule, and to 0 on 2026-08-20 when the cutover shipped the whole room in one motion - the debt the sum was born to hold is paid, and any word that ever reappears in either room reddens the build. E6, lower-when-better. 917 is what the gate's own nudge asked for: the owner first instructed 1050 for headroom and then withdrew it the same minute - "go with 917 don't delay the issue". A ceiling with slack in it is a ceiling that stops catching drift. |
| DEGRADED | `g27_empty_sentence_pool_max` (0) | a level whose free-play sentence pool is empty |
| DEGRADED | `g27_session_reveal_silent_max` (13) | the level teaches no word in its own text, so the sound-out is skipped |
| DEGRADED | `g27_unseated_bank_word_max` (0) | a bank word truly-random can never draw |
| DEGRADED | `g27_short_session_max` (98) | a first session shorter than `SESSION_SIZE` |
| DEGRADED | `g27_no_block_building_max` (100) | the level never exceeds `SESSION_SIZE`, so the block IS the level |
| DEGRADED | `g27_paragraph_reveal_max` (143) | a multi-sentence text gets one sound-out word for the whole paragraph |
| DEGRADED | `g27_stale_chooser_copy_max` (0) | the chooser states a bank size the bank does not have; 0 since the chooser derives its count from bankWords() |
| BREAKS | `g27_lexicon_fault_max` (0) | a row of `tools/lexicon.csv` is malformed, names an unknown sound, is undecided, or a tiled word has no row. The lexicon is the owner-ruled canonical word-sound truth (2026-08-20), audited row-by-row by a read-only phonics expert; this class is its reader and its gate, and it caught its first two real faults on the day it was born - the generator had dropped the shipped-bank words outside the ladder. |

**The seventh class earned itself on the day it was written.** Three owner-approved texts
became illegal in one afternoon because the ladder moved under them — `hustle` was removed,
`catfish` was removed, and `butterfly` moved from level 51 to 52. All three were verdict
`perfect`, all three passed every gate, and all three would have asked a child to read a word
they had not been taught. The `butterfly` shape is the one a membership test misses: the word
is still in the ladder, one level too late.

**Negative controls**, `g27_controls` (66). Every one is a PAIR: the fault is planted, the
real `rehearse()` runs and must go red on that class; without the fault, the same real run
must be silent on it. A detector that always cries wolf fails the green half and one that
never fires fails the red half. The fixture uses the real reference and the real app source —
only the data is small — so the code under test is the code that ships. The anchors have
controls of their own: a renamed `LEVELS` literal, a renamed `SENTENCES` literal and a moved
`buildRandomBlock` must each be refused rather than ignored. The control the whole file
stands on is a decoy extractor that ignores the source it is handed, which is the one way
a rehearsal could quietly re-test today's world and print a clean sheet.

**What it cannot do.** It cannot call anything inside the React component: `beginFreePlay`,
`showSentence` and the endless deal are closures over component state and need a renderer, so
where a consequence lives there the tool reports the driven cause and names the rest in prose.
It cannot say whether the ladder is right — `tools/ladder-status.mjs` measures what the ladder
holds and the literacy seat judges whether it teaches. About three seconds for the gate and
ten for its controls, so both run in `npm run check`.

## Method

- This project uses constraint-based development. The gates prove behavior. Code review is
  secondary.
- The gates test the engine (`src/engine.js`, generated from `reference/word-quest.jsx`) and the
  standalone app (`app/`).
- The gates never change game behavior, the word bank, the feedback text, or the layout.
- The gates add no PWA work. G7 tests the offline capability that already exists; it does not
  build it.

## Non-negotiable rules

1. Every assertion uses literal expected values. A test never reads the constant that it checks.
2. Every detector has a negative control. The control proves that the detector fails on the
   fault that it targets.
3. Never delete a test. Never delete a mutant. Never lower a threshold. Never add a skip to make
   a build pass.
4. `.claude/gate-baseline.json` holds the limit for each metric. Keys without a suffix are
   floors: raise one when its count grows; never lower it. Keys that end in `_max` are
   ceilings: lower one when quality improves; never raise it.
5. If a gate fails, fix the code. If the gate itself looks wrong, stop and tell the owner.
6. Do not edit generated files by hand. This applies to `src/engine.js` and to every file in
   `tests/generated/`.


## When the gates run

`npm run check` runs before every push: the quality lint (`npm run lint:quality` — ESLint
with the G6 complexity and file-length ceilings, the dependency-cycle scan, and the quality
controls), the whole Vitest suite, and the sub-minute gates (G11 copy, G16 doc-truth, G12 QA
count, G13 voice pack, G17 governing files, G20 effect map), each with its negative controls.
It also runs the controls of `tools/blast-radius.mjs`, the E11 lookup — a lookup that has
quietly stopped finding things is worse than none. The lookup itself never fails a build; its
controls, being in the check, can. The faults planted against those controls run in the
gauntlet rather than the check, because they take half a minute: see "E11 lookup-mutants"
below.
The quality lint was gauntlet-only until 2026-08-12. It cost two defects in one day: a
`font:` shorthand ending in `inherit`, which its own controls have refused since 2026-07-29,
shipped a label at four times its intended size; and a file went one over the complexity
ceiling and was pushed. Both were invisible to the check and would have waited for a release
to be found. The owner ruled it in on the measured cost — about six seconds. It also runs the word-gate island control
(`python3 tools/verify.py --self-test`), which needs Python and NumPy — the voice
toolchain's own requirements. That control is deliberately NOT in the gauntlet: putting it
there would make the release gate depend on a Python runtime in CI, and a new dependency is
the owner's call. Until the owner rules, it is proven at every push and not at release.
The full gauntlet — mutants, coverage, the build, and the browser gates — runs at release
time only: locally when the owner asks for a beta or a version release, and on CI when the
release's v* tag is published, as a recorded second opinion on the exact released commit.
A release is cut only from a green full gauntlet, and since 2026-08-23 the release CARRIES
the bytes that gauntlet proved: `tools/release.mjs` attaches a tarball of the proved
`app/dist` and the `.gauntlet-evidence.json` beside the tag, in the same call, and
`.github/workflows/pages.yml` publishes those exact bytes — it downloads both, recomputes
the payload hash from the extracted files with `tools/payload-hash.mjs`, and refuses to
publish anything that differs. It used to build the app a second time on the runner and
ship whatever came out, which was the one artefact in the chain that nothing had measured.
The website therefore updates at releases only (owner-ruled 2026-08-23): between releases a
push is covered by `npm run check` and nothing else, and nothing a family can see changes —
that is the owner's chosen trade, dated 2026-08-02 and narrowed here. Measured before it
shipped: the same commit built twice on one machine hashes identically, and the tarball
extracted to `app/dist` reproduces the proved hash while the same tarball extracted one
directory higher does not — which is why the extract step pins its path. The gates
themselves never weaken (E3), only the moment the expensive ones fire.

## G1. Unit tests

- Location: `tests/engine.test.js`. Tool: Vitest. Command: `npm test`.
- The floor lives in the baseline file (key `g1_unit_tests`); it started at 42 tests.
- These tests exist. Extend them; do not rebuild them.
- `tests/scheduler.test.js` holds the session builder's two level rules, with its own floor
  (key `g1_scheduler_tests`). It keeps the session-builder rules together and keeps
  `tests/engine.test.js` clear of the G6 file-length ceiling. Both files count, and neither
  floor may fall.

## G2. Property tests

- Location: `tests/properties.test.js`. Tool: Vitest with `fast-check`.
- Each property runs 1000 or more generated cases. Keys: `g2_properties` (floor 10) and
  `g2_cases_per_property` (floor 1000).
- Command: `npm test` (the file is part of the Vitest run).
- A valid word state means: `box` 0 to 5, and every counter a finite number. This is the shape
  the repair function guarantees.

The ten initial properties:

| # | Property |
|---|---|
| P1 | For every bank word and every lowercase a–z string: `chunkWord(w).join("")` equals `w`. |
| P2 | For the same domain as P1: every chunk is one letter, or one of the seventy-two multi-letter units the property writes out by hand — 59 digraphs, 10 trigraphs and the 3 four-letter units `augh`, `eigh` and `ough`. A chunk is one to four letters and never another length. It was nineteen units and three letters until 2026-08-19, when the chunker was extended to the whole code the 100-level ladder teaches; `tests/chunker.test.js` owns the roster and its position rules. |
| P3 | For any valid word state and any result sequence: `box` stays in the range 0 to 5 after every step. |
| P4 | After any single `applyResult` on a valid word state at session `n`: `dueAt` equals `n` plus the interval for the new box, and `dueAt > n`. |
| P5 | Starting from a fresh word state: `attempts` grows by exactly 1 per call, and `correct + close + wrong` equals `attempts` after every call. |
| P6 | A first-ever correct result always sets `box` to exactly 3, from any starting state with `attempts` 0. |
| P7 | For any valid state: `buildSession` returns no duplicate words, and 20 words or fewer. |
| P8 | `buildSession` never serves a word more than one level above the current level. A next-level word the child has never attempted implies that no fresh current-level word remains and that 80 percent of the current level sits in box 2 or more. Next-level words the child has already read may come back for review, at most 2 in a session. The converse is not required. |
| P9 | For any valid state with a non-empty queue: the first word's box is the maximum box in the queue. A word with no stored state counts as box 0. |
| P10 | For arbitrary JSON-shaped input, including hostile values under the real key names: `migrate` never throws, is idempotent, and its output survives `buildSession`, `applyResult`, and `buildMarkdown` without a throw. Every healed box is 0 to 5; the level is 1 to 11. |

The level range is 1 to 11. It was 1 to 7 until the bank grew to nine levels, and 1 to 9 until
Levels 10 and 11 (the blends) were built on 2026-08-12. The engine never carries the number:
every bound reads `LEVELS.length`, which is why adding a level needed no engine change.

## G3. Acceptance scenarios (Gherkin)

- Feature files: `features/*.feature`, written in domain language. The owner approves the feature
  files before any pipeline work starts.
- Pipeline: `tools/gherkin-parse.mjs` reads the feature files and writes the JSON IR to
  `tests/generated/acceptance-ir.json`. `tools/gen-acceptance.mjs` reads the IR and writes
  `tests/generated/acceptance.test.js`. Vitest runs the generated file.
- No person writes the executable tests by hand. The generator writes them from the IR.
- The gauntlet regenerates the IR and the tests, and fails if the output differs from the
  committed files, or if a committed generated file was deleted (the regenerated file would
  arrive untracked). Keys: `g3_scenarios`, `g3_generated_tests`.
- The generator output is deterministic: stable ordering, LF line endings, no timestamps, and
  no absolute paths. A `.gitattributes` file pins the line endings.

## G4. Acceptance mutation

- Tool: `tools/acceptance-mutants.mjs`. Command: `npm run test:acceptance-mutants`.
- The tool changes one expected value in the IR, regenerates the tests, and runs them. The run
  must fail. A scenario that still passes does not read that value: it is a survivor.
- Scope: every number and quoted string in a Then step, and every Examples cell that a Then
  step reads. Setup values in Given and When feed the assertions and are checked through them.
- Operators: numbers step up by one. Bounded checks ("at most", "above") step down by one, so
  the change always tightens. Strings gain one letter.
- Negative control: `node tools/acceptance-mutants.mjs --self-test` applies one mutant without
  regeneration. The stale test passes, and the gate must report that survivor.
- Floor: 0 survivors. Keys: `g4_acceptance_mutants`, `g4_survivors_max`.

## G5. Source mutation

- Tool: `tools/mutants.mjs`. Command: `npm run test:mutants`.
- The floor lives in the baseline file (key `g5_source_mutants`); it started at 28 mutants.
  Ceiling: 0 survivors (`g5_survivors_max`).
- Runner control: before any mutant runs, the pristine suite must pass. A broken test
  environment therefore fails loudly instead of reading as "every mutant killed".
- A mutant is KILLED only when a TEST FAILED, and the count of failing tests is printed
  beside it. A non-zero exit alone is not proof: a mutant that crashes the runner or breaks
  the environment exits non-zero too, and scoring that as a kill claims protection the suite
  never demonstrated. There are three outcomes — killed, survived, and ERRORED — and an
  errored mutant fails the gate rather than passing as a kill. G19 works the same way.
- This gate exists. Add mutants for new invariants; re-point moved anchors; never delete one.
- Every mutant run carries `--bail 1` (P1 of the speed plan, 2026-08-22): a mutant is
  killed by ONE failing test, so the suite stops at the first. The "Tests N failed" row the
  runner reads still prints, the verdict is unchanged, and the pristine control still runs
  WITHOUT bail, because a clean suite has nothing to stop at and must prove every file
  green. Measured on the owner's machine, same tree, back to back: 34 min 18 s without
  bail, 7 min 6 s with it, 73 of 73 killed both times.
- Run G4 and G5 one after the other, never at the same time. Each rewrites files the other
  reads — G4 regenerates `tests/generated`, G5 regenerates `src/engine.js` — so a parallel run
  reports a broken environment instead of a result. The gauntlet runs every gate in sequence.

## G6. Coverage and quality metrics

- Tool: Vitest coverage (v8 provider). Command: `npm run test:coverage`. In the gauntlet the
  coverage numbers are read from G1's own run, which carries `--coverage` (P1, 2026-08-22):
  one full-suite run fewer, identical counts, both gates still named in the evidence.
- Floors on `src/engine.js`: 95 percent lines, 90 percent branches. Coverage is a floor, not a
  goal. Keys: `g6_lines_min`, `g6_branches_min`.
- Floors on `app/src/**`: 82 percent lines, 84 percent branches, enforced in BOTH places on the
  same pair of numbers — by Vitest itself through `vitest.config.mjs`, and by the gauntlet
  against `g6_app_lines_min` and `g6_app_branches_min`, read from the `app/src` row of the
  coverage table. That row is the top-level files of `app/src`, not the whole tree: the
  screens sit in their own `app/src/screens` row and are floored by Vitest's `app/src/**`
  threshold rather than by the gauntlet's parse. `App.jsx` is pinned separately
  (`g6_appjsx_lines_min`, `g6_appjsx_branches_min`). The app was measured only after beta.2,
  where every microphone fault lived in an app file no floor watched. Those faults and their
  code went on 2026-08-12; the floors they justified stay, because the reason they were set
  applies to whatever lives in those files next.
  - Until 2026-08-10 those two baseline keys were read by NO tool while sitting in the
    baseline file reading as protection, and they disagreed with the 81/82 the config
    actually enforced — which is how an audit came to believe the app floors were in
    conflict. A floor that guards nothing is worse than no floor. They are wired now, and
    both places carry one pair of numbers.
- Calibration (rule E5): `node tools/coverage-control.mjs`, a gate of its own in the run.
  Every other detector here ships a control that proves it catches its target fault; coverage
  was the exception, reporting a number that the floors compared with nothing proving the
  meter measured at all. A drifted include glob, a stale generated engine, or a provider that
  quietly stopped instrumenting would still print a healthy table and still clear every
  floor. So the meter is checked against fixtures whose true coverage is known by
  construction, the way a scale is checked with a known weight: a fully exercised file must
  report 100 percent lines and branches, a file with one untaken branch must report below 100
  and above 0, and a file no test touches must report 0. The fixtures live in a throwaway
  `.cov-control` directory, gitignored, deleted on the way out, and scoped by their own config
  so they can never reach the real run's numbers.
- ONE file is excluded, named in `vitest.config.mjs`: `main.jsx`, entry wiring whose decision
  now lives in the measured `swrefresh.js`. `pronunciation.js` was the second until
  2026-08-12, when the owner ruled the cloud scoring stub deleted with the microphone; an
  excluded file is a file nothing measures, so the list getting shorter is the gate getting
  stronger. Nothing else may be excluded.
- Coverage proves a line ran, not that anyone checked its result. The mutation gates (G4, G5)
  are the teeth; this is the floor that shows where no test has ever looked.
- Quality checks, command `npm run lint:quality`. Keys: `g6_complexity_max`,
  `g6_file_lines_max`, `g6_dependency_cycles_max`.
  - Cyclomatic complexity per function: 15 or less, in `src/engine.js` and `app/src/**`. The
    counter is the ESLint `complexity` rule with its default counting.
  - File length: 1200 lines or less for every source file. `reference/word-quest.jsx` is exempt.
    That file must stay one file, so it can run as a chat artifact. The ceiling was 600 lines
    until 2026-07-29, when the owner raised it to 900, and 900 until 2026-08-12, when the owner
    raised it to 1200. It is still a ceiling: only the owner may move it, no change may raise
    it, and a file near it should be split rather than allowed to grow.
  - Dependency cycles in `app/src` and `src`: exactly 0. The checker must resolve the `@engine`
    alias, or the check is empty for those edges.
  - Tools: `eslint.config.mjs` at the root, `tools/dep-cycles.mjs` for cycles, and
    `tools/quality-control.mjs` for the negative controls.

## G7. Interface measurements

- Tool: Playwright against the built app (`vite preview`). Command: `npm run test:ui`.
- Assert measurements and numbers. Never assert a screenshot. Key: `g7_interface_checks` (66).
- **Every viewport here is a PAGE size, not a device size, since 2026-08-13.** An iPhone 13 is
  390x844 as a device; a page gets 390x664, because the browser keeps the rest. Six checks and
  three progress-track rows ran with 180 pixels of slack no child has ever had, and four rows
  wore phone names over sizes no browser gives. Correcting them is what found the centring
  drift the owner then ruled on (`docs/open-faults.md` G3c-1).
- **A 450 ms hold must not select text (checks 24 to 26).** Reported by the owner from a real
  iPhone 13, with a screenshot: a touch between "skip" and "got it" started an iOS text
  selection across the grown-up strip. The cause is the app's own core gesture — S5 requires a
  450 ms pointer hold on every adult result control, and a 450 ms press on a touch screen is
  what iOS reads as "select this text". No gate had seen it because **every browser check in
  this project drives a mouse, and a mouse never asks for a selection by pressing.** That is the
  lesson worth more than the fix. The check asserts the child's surface is locked, that a
  grown-up's inputs are not, and carries a control that removes the rule in the live page and
  requires the elements to EXIST and to have changed — its first version ran after navigating
  away and passed on "missing", which is a control passing because its subject was absent.
- Required checks, each with literal values:
  - No page scroll in a session at viewport heights 430, 555, 720, and 950 px:
    `scrollHeight <= clientHeight` on the document at default text size.
  - An eight-tile reveal holds ONE row inside a 320 px viewport (added 2026-08-20 with the
    cutover's shrink ruling: the four-tile cap the old assertion measured is gone, so the
    check walks a level-69 session to "breakfast", the widest word the bank holds, and
    measures the tiles a child actually sees - count, rows, span, and a 10 px font floor).
  - The word's bounding box is identical across the ready, feedback, and retry phases.
  - The advance control rejects activation for 400 ms after feedback starts, then accepts it.
  - An adult result control does not fire at a 150 ms hold. It fires at a 700 ms hold. The wide
    margins absorb CI timing jitter in the safe direction.
  - The Enter key and the Space key fire an adult control directly, with no hold.
  - The exported `ADVANCE_GUARD_MS` equals the number 400. The `HoldButton` source contains the
    literal hold delay 450. Both are literal checks; neither reads a constant as its own
    expected value.
  - The app serves a session offline after one online load. This tests the offline capability
    that already exists.
  - Every rendered control meets its S7 floor, MEASURED with `boundingBox()` — child
    controls (`.wq-cta`) 56 px tall and adult controls (`.wq-sbtn`) 44 px in both directions —
    across the home, ready and feedback screens at 390x844, 768x1024 and 1280x800. Child
    controls are full-width buttons, so only their height can be short; adult controls are
    small in both directions and are measured both ways. The counts are checked PER CLASS,
    because a single total let eleven adult controls satisfy a guard while the 56 px child
    floor measured nothing at all. The
    stylesheet check in G10 is a pre-filter for the fast suite: a control can carry
    `min-height:56px` and still render shorter inside a shrinking flex parent, under a
    transform, or below a later rule that wins. Negative control: injected rules that
    shrink both classes must make the same probe report controls under the floor.
  - Tablet portrait, 768x1024: one centred column with the tiles and the feedback sentence
    on the word's centre, no page scroll, no sideways overflow, and the word's box
    unmoved between phases. This shape sits between the 390-wide phone checks and the
    1280/1080 landscape checks, and nothing measured it before.
  - The session path fits every screen a family owns, at ten widths from 300 to 1280 px:
    300 (narrower than any supported phone), 320, 375, 390, 430, 479, 480, 768, 810, 1280.
    The save is seeded to Level 20 first, because the worst case is a full twenty-word
    session and a fresh Level 1 holds fourteen words. At each width: no sideways overflow, no
    page scroll, all twenty dots inside the viewport, the row count and the dots per row
    equal to literal expected values, "read so far" at 9 px, on the first line, and ending
    left of the first dot. 479 and 480 are a pair on either side of the stated breakpoint,
    so a moved rule shows up as one reporting the other's shape. Negative control: the phone
    rule is overridden back to twenty columns and the same probe must report the dots off
    the screen — the fault the owner photographed on 2026-08-12.

## G8. Accessibility

- Tool: Playwright with `axe-core`. Command: `npm run test:a11y`. Key: `g8_checks`.
- Zero axe violations on the home, session, feedback, done, and grown-ups screens. Key:
  `g8_axe_violations_max`, ceiling 0.
- Contrast: compute the ratio from the rendered colors. Every text node is 4.5:1 or more against
  its background. Do not eyeball colors.
- At 200 percent text size: the grown-ups stage scrolls, its last element is reachable, and no
  horizontal scroll appears; the session stage stays scrollable with no horizontal cut.
- With reduced motion emulated: zero running animations and zero transitions on every screen, with
  one named exception that is asserted both ways — the fill on the advance control must still run,
  because it is the only thing that says how much of the reveal is left, and nothing else may.

## G9. Fault injection

- Location: `tests/faults.test.js`. Tool: Vitest with `fake-indexeddb`, fake timers, and a
  scripted storage double. Key: `g9_fault_tests`.
- Permanent destructive scenarios:
  1. Damaged save: a non-JSON value at the store key. The app keeps a copy at the `:corrupt`
     key, starts fresh, and shows the damage message.
  2. Storage timeout: no answer for 3000 ms. The app starts fresh, sets read-only, and performs
     zero writes for that visit.
  3. Late storage response: data arrives after the timeout. The late data never renders and is
     never written over.
  4. Wrong-shape JSON: arrays, numbers, nulls, and hostile objects. `migrate` heals them; no
     function throws.
  5. Throwing speech service: `speechSynthesis` that throws. Grading still completes.
  6. Backward clock: a system date earlier than `lastSession`. No function throws; the log row
     still gets an ISO date.

## G10. Safety gates

- Location: `tests/safety.test.js`, `tests/safety-splash.test.js`, `tests/adult-controls.test.js`,
  and Playwright checks inside `npm run test:ui`.
- Each rule in `CLAUDE.md` becomes at least one failing-by-default test. Keys:
  `g10_safety_tests` (the SUM of `safety.test.js` and `safety-splash.test.js`, so a test
  cannot vanish from either file; the gauntlet's summed counter refuses a missing file
  outright) and `g10_adult_control_tests`. The safety floor reads 29, and its history is
  a lesson: on 2026-08-17 three raises (37, 38, 42) landed on this key while the tests
  they counted went to `chunker.test.js` and `buildit.test.js` - files that had NO
  counter - and the same day's stray step arguments kept the gauntlet from ever running
  the numbers. The 2026-08-21 rehearsal found it; beta.21's own released tree was
  re-run in a worktree and measured 29, so 29 is the last CI-validated truth, the
  mis-keyed raises were reverted rather than "lowered" (their tests were never here),
  and every vitest file now carries its own counter (`g1_chunker_tests`,
  `g10_buildit_tests`, `g1_pre_tests`) so a raise always has a right key to land on.
- `tests/names.test.js` (art project step 0a, 2026-08-22): every button on the real screens
  - home, the chooser, the corner, a session, a build, the done screens, the pre-ladder,
  the crash screen - is named in plain words: an aria-label with no pictograph, no symbol,
  no "(hold)", containing its visible words; a button with no aria-label carries no
  pictograph in its text. A planted old-style hold name and a bare emoji button are
  refused. Key: `g10_name_tests` (3). Its companion in the check is
  `tools/locator-scan.mjs`: every test and census tool is read and any locator whose string
  names a pictograph is refused (9 controls), so the coming icon swap cannot break a locator
  it never knew about. What a screen reader hears changed with this step (bible 15.2):
  "Begin Session", "got it", "Check for updates" - the words, nothing else - and the home
  screen's pinned accessible tree was regenerated, names only.
- `tests/garden.test.js` (art project step 0e, 2026-08-22): the two derived facts SPEC
  section 7 states — the ladder complete only when level 100's words are secure, the
  garden state the tenth of the levels completed — at literal values over the measured word
  counts, including the line that the two-perfect-sessions path never ends the ladder. Key:
  `g1_garden_tests` (5). G5 gained "the ladder completes without its words being secure"
  (73 to 74).
- `tests/tokens.test.js` (art project step 0b as the council amended it, built after the
  after pass on step 0 found it missing, 2026-08-22): the thirteen keys the game had before
  the bible pinned to their literal values — doc-truth rule 11 only asks that C and the
  bible's table agree, which a change to both would satisfy, and E4 asks for the literal —
  the key count (46), and the bible's 3:1 edge rule asserted with the file's own WCAG
  arithmetic at literal ratios for the bible's four structural edges, the empty slot's
  edge and the progress ring (tileEdge on tileFace 3.78, boundary on surfacePanel 4.68,
  cyanStructural and purpleStructural on surfaceReading 7.51 and 6.39, boundary on paper
  4.77 and on the empty slot's lowest-ratio ground - paper at .55 over the lavender stop,
  the least luminous of the three, derived from the tokens and pinned - 3.79, amber on sun
  4.11, ink on surfaceReading 11.36), with the admitted sub-3:1 pair (disabled on
  surfacePanel, 2.10) and the two withdrawn edges (1.94, 1.44) as controls, and a sixth
  test that walks every `C.<key>` read in the app and the reference against C's keys with
  a planted one — `C.blue`, a key C never had, was read on the pre-done screen for weeks.
  Tests 3b and 3c hold the two edges still below the rule at their literals and require
  `docs/open-faults.md` to carry each: `line`, the adult controls', 1.26:1 on paper and
  1.07:1 on chip (entry AA, the grown-up-zone step's change), and the open sentence word's
  `action` ring on the gradient, 2.95, 2.88 and 3.15 on the three stops (entry AB, the
  reading-surface step's change, found by the fourth judgement); test 7 pins `alpha()` to
  the literals it replaced and holds the two theme colours the build cannot derive
  (`index.html`, the manifest) to `skyBlue`. Art step 1 (2026-08-22) added tests 8 to 10:
  every face, edge, ring and state of the ceramic tile family at its literal ratio on the
  surface it sits on (ink on tileFace 8.64, tileEdge on the three gradient stops 3.13 /
  3.06 / 3.35 — the rim is the only boundary between a tile and the sky, since the face
  measures 1.13–1.26 against it — cyanStructural on the face 5.71, the lifted face at
  1.114 of the resting luminance inside bible 11's 8–12 %, the pressed composite, the slot's
  edges, purpleStructural on the face and the stops, with cyanElectric on the face at 1.04
  held below 3 as a glow that is never a boundary), the scaffold letter at .60 (3.28 on the
  slot, owner-ruled) with .28 (1.65) as the withdrawn control, and the app's and the
  reference's tile rules compared character for character with a planted drift; test 3c
  now holds the open sentence word's cyan ring at 4.73 / 4.61 / 5.05 (open-faults AB
  closed) with the action figures as its control. Key: `g1_token_tests` (13). Its companion in the check is the quality control that
  refuses a hex, rgb(), rgba() or hsl() literal in any app source (`.js`, `.jsx`, `.mjs`,
  `.css`) and in the reference outside its `C` block, with fixtures for each and for the
  `alpha()` helper it must not catch: the after pass found fourteen hex literals in the
  screens and the stylesheet's gradient typed beside the tokens it emits, and the
  re-judgement found seven shadows restating ink in decimal; five tokens entered C for
  them (paper, warningDeep, chipGreen, chipAmber, chipRed), every alpha now derives from a
  token through `alpha()` in the reference, exported by the engine, and two edges first
  typed as tokens were withdrawn
  the same day because they failed the bible's own rule — the empty slot's dashed border
  now reads `boundary` (#94a8c0 to #5f7493) and the progress ring `amber` (#e0ac2b to
  #8a5a00), both declared as the visible darkenings they are. Two other values moved to
  the bible's own in the sweep and are declared: Build-it's "won" message from #15803d to
  `success` #18794e, and the crash screen's ground from #fdfcfa to `surfacePanel` #fffdf5.
- `tests/models.test.js` (owner-ruled 2026-08-22, the bug-hunt page): fast-check drives
  the REAL Build-it and Find-the-sound screens through 200 random tap sequences each,
  over the whole bank, and after every tap compares the screen with a model of slots,
  misses, won and done; the free-play chooser is opened on random saves and every live
  cell is opened and left. Each run must reach a win, a miss, the help, the end and the
  exit, or it fails as vacuous - and it did, on its first run: 200 sequences of random
  taps reached zero wins, which is why the command set carries a "solve" and a "build it
  wrong" a real child would make. Key: `g10_model_tests` (5).
- The splash update controls (SPEC section 7a) have their own file because the safety file
  reached the file-length ceiling, 900 lines at the time, on 2026-08-07:
  `safety-splash.test.js` proves a
  child's tap never reaches the network and only the adult hold applies an update.
- S5 has its own file because the safety file reached the file-length ceiling, 600 lines at the
  time (G6). It holds one
  subject: a result reaches the save only through a deliberate adult act, and every grown-up
  has a way to perform one — a 450 ms hold, a keypress, or an activation from assistive
  technology, which the control could not see at all until an audit found it. One act records
  one result: two controls held at once count the word once, not twice.
- The two critical rules:
  1. No code path records a wrong or close result without an adult action. A transcript that
     does not match the target changes no word state.
  2. The app never speaks the target word before the attempt ends. The replay control is inert
     outside the feedback phase.
- Negative controls: each safety test has a fixture or a mutant that breaks the rule, and the
  test must fail on it.

## G11. Copy gate

- Tool: `tools/copy-lint.mjs`. Command: `npm run lint:copy`. Key: `g11_copy_rules`.
- This gate is new in this repository. The task brief listed it as present; it was not.
- The gate reads the child-facing strings from the generated engine and the app screens:
  1. The three feedback sentences equal the SPEC section 5 text, character for character.
  2. Child-facing copy never contains: wrong, bad, fail, failure, incorrect, error, oops, try
     harder. Adult-facing strip and settings copy is out of scope.
  3. The two tricky-word notes are present and exact. The canonical strings are:
     `Tricky word! The a sounds like “uh” — wuz.` and `Tricky word! The s sounds like “z” — iz.`
  4. Speech strings never spell letter names and never contain single-letter tokens.
  5. No tracked file contains an email address, and the default child name is empty (safety
     rule S9). Lockfiles are exempt: they carry npm authors' public emails, not personal data.
  6. The ladder's refusal sentence in the app is SPEC section 6's, word for word — the only
     thing telling an adult why a session was refused, and until 2026-08-23 no gate pinned
     it. The rule READS the words from SPEC rather than typing them, so the document stays
     the source, and a control removes SPEC's quotation to prove the rule can go blind.
- The JSX corpus reads a text run ACROSS line ends (2026-08-23). It stopped at a newline
  until then, so any sentence wrapped for readability was invisible to every rule in this
  gate: the ladder's refusal was written on its own line and rule 6 could not see it. Widening
  it took the corpus from 176 strings to 189 — thirteen sentences a child or an adult can read
  that no rule had ever checked.
- The reported rule count is computed from the rule families that actually ran, so a deleted
  rule cannot keep reporting itself.
- Negative control: `node tools/copy-lint.mjs --self-test` injects one banned word and one
  changed sentence into a memory copy, and must report both.

## G12. Manual QA procedure

- Location: `docs/qa-procedure.md`. A numbered manual script for a person with a device.
- Each step has an action and an "Expected:" line. The gauntlet checks the structure: 20 steps
  or more, every step with an expected result. Key: `g12_qa_steps`.
- The script covers this device matrix:

| Device | Test |
|---|---|
| iPad Safari, iPadOS 15.4 or later | Install, offline start, no permission prompt, hold gesture |
| iPhone Safari | Layout in portrait and landscape, home-indicator area |
| Windows Chrome or Edge | Install to desktop, icon quality, own window |
| Any browser, 200 percent text | The stage scrolls. No content is cut off |
| Any browser, reduced motion | No animation except the fill on the advance control |

## G13. Voice pack

The shipped default voice pack must cover the engine's whole clip inventory (SPEC section
5a): one clip for every bank word and fixed sentence, from `voiceScript()` in the live
engine, never a hand-kept list.

- `tools/voice-check.mjs` verifies: every inventory id has a manifest entry and a file; no
  orphan clips; every declared duration is inside 400–8,000 ms (the shortest real clip is
  448 ms, so anything shorter is a truncation, and a WORD clip may not exceed 1,500 ms — the
  longest word in the pack runs 1,340 ms, and a word clip beyond that is carrying something
  which is not the word, as one did when an attempt to give six words the prosody of a
  sentence produced clips holding the whole sentence); the file size matches the declared duration at
  the pack's 96 kbps bit rate (10–15 bytes per millisecond), so a manifest cannot lie about a
  truncated or wrong clip; and the recipe inside the pack matches the approved values, down to
  the trim applied to each of the three words that needed one.
- The clip engine has its own Vitest suite (`tests/voicepacks.test.js`): scheduling order,
  literal 700 ms seams, stop-on-advance, all-or-nothing fallback to system speech, and
  family-pack preference.
- The gate also refuses a pack that leaves a sentence to spelling when the sentence contains a
  word with two pronunciations. It comes from a real fault: the praise sentence "You read that
  word all by yourself!" was spoken with "read" as in "reed", which teaches the wrong sound.
  That line was replaced on 2026-08-03, so no current sentence trips the rule — the self-test
  plants an ambiguous sentence to prove the detector still fires. The word list is checked
  against the sentences in the live engine, so a new sentence is covered from the moment it
  is written.
- The gate pins the result of every listening round, not just the global settings, and it
  verifies the whole chain of record: `tools/voice-words.csv` (the file a person edits) must
  cover every bank word, the derived `keepers-treatments.json` and `keeper-bytes.json` must
  match a fresh derivation from the CSV, the shipped `__recipe` — including each ASR cut's
  lead/tail guard — must match the approved values, byte-pinned words must carry exactly
  their accepted sha256, `tools/voice-lock.json` must agree with all of it, and an UNLOCKED
  row may not deviate from the bank defaults. A pack that quietly widens a treatment to a
  word nobody heard fails.
- Negative control: `--self-test` removes a word clip, plants an orphan, doubles one declared
  duration, drifts the recipe, leaves a two-letter word to its spelling, strips the recipe
  altogether, trims a word nobody heard, puts the "read" sentence back to spelling, changes a
  listening round's result, re-cuts an approved carrier and an ASR pin at values nobody
  heard, alters a guard and grants one to an unheard word, drifts the lock file and deletes a
  word from it, deletes a word-table row, and quietly tunes an unlocked word; the detector
  must report every one.

## The UX census — not a gate, and deliberately so

`npm run census` renders every layout-risk class in the bank on eight device profiles, in
the prompt state and the reveal state, and reports every defect a measurement can see.
`npm run census:novelties` runs the every-beta five alone (below), judged in their own
scope. It is an INVESTIGATION, not a gate: it never runs in `npm run check` and it is not
one of the gauntlet's gates. Vitest is told to leave `tests/census/` alone, because collecting a Playwright
spec turns the fast check red for a reason that has nothing to do with the game.

### The beta-cadence novelties (owner-ruled 2026-08-20, built 2026-08-21)

The UXSWEEP review offered a stack of new checks; the owner kept "the genuine novelties as
part of gates ... we check with every beta and ignore rest". Five detector families now ride
the census, helpers in `tools/census-novelties.mjs`, cells in
`tests/census/novelties.spec.mjs` (three cells on every device profile) and
`tests/census/novelties-once.spec.mjs` (its own testMatch-bound project: two singleton cells
plus the negative controls - every detector proven against its own planted fault, E5, and
the offline comparator's control caught its first real bug before the live cell ever lied):

- **phase walk** - the screen holds still while a word moves through its phases, on every
  profile. G7 check 5 pins one word at one viewport; the class is live - the night of the
  cutover it caught the ten-word Level 1 dropping the word 8 px on a retried word's dot.
- **home furniture** - the child's two big buttons sit where they sat after a visit.
- **hit-test** - every live control owns its own centre, asked at ready AND mid-reveal,
  the phase the census's static screens never hold.
- **update-stay** - a foreground poke never replaces the open page (S6: an update installs
  and waits).
- **the monkey** (owner-ruled 2026-08-22, the bug-hunt page) - 300 seeded random taps as a
  child on every profile, `tests/census/monkey.spec.mjs`, detector `monkey` in the
  novelties library. Never a hold (S5) and never the corner; after every tap: no console
  or page error, an enabled control of 44 px or more still on screen and the page not
  blank, the principal word unmoved when it is the same word, and the tap did something
  within 3 s unless the control only makes sound (five, named with reasons) - a control
  that changes nothing three times is reported dead. The seed is the commit per profile,
  `CENSUS_MONKEY_SEED` replays a walk, and both are written into the cell's annotations.
  Its first three walks found three things: the modal's full-screen scrim reported dead
  (its centre is the box; backdrops are now left out by shape), and Build-it's empty slots
  and used tiles were enabled buttons that did nothing - both are now disabled, and the
  tray says `aria-busy` while a build is judged instead of silently ignoring taps. Its
  control plants a dead 64 px control and a page error and requires both to be named. A
  control whose centre is covered by something else is not a target (2026-08-22): the home
  screen's "Free play" stays in the DOM under the chooser it opens, and a seeded walk that
  tapped its centre three times through the chooser's box called it dead - a child's
  finger lands on what is on top, so `tappable` asks `elementFromPoint`. Only a cover
  inside an element that says `aria-modal="true"` takes a control out of the walk - a
  `role="dialog"` without it is a non-modal dialog, behind which content is meant to stay
  reachable, so it does not (the fourth judgement tightened the selector); any other cover
  - a toast, a stray layer, a non-modal dialog - leaves it in and the walk reports
  `covered-control` naming the layer the moment it LISTS the control, not only when the
  dice pick it, the fault the monkey exists to find (the third judgement: the first draft
  dropped every covered control, which would have hidden a stray layer over a child's
  button). The control plants three shapes: a bare transparent layer, under which the
  planted button is reported by a walk seeded never to pick it; the same layer inside a
  `role="dialog"` without `aria-modal`, under which it is still reported; and inside an
  `aria-modal` element, under which it leaves the list.
- **offline equality** - the offline app is the same app, measured: geometry offline equals
  geometry online. This is the one cell that allows the service worker; every other census
  cell now BLOCKS it (2026-08-21), because ten cells each starting a 1,500-file precache
  against one single-threaded preview crashed the shared browser and made green-alone cells
  fail in file order.
- **the ceramic tile family, as measurements** (art step 1, 2026-08-22). On every
  profile: **the sounding tile** — with motion allowed, the reveal of "ship" read from
  computed style and rects, the subject being the tile whose `wqpop` animation is running:
  a 3–4 px solid `cyanStructural` ring at offset 0, a box-shadow naming `cyanElectric`
  whose spread equals the `--wqband` the stylesheet resolved for the tile (9, 7 or 5 —
  read after the cascade, never guessed from classes; 9 on the reveal, 7 on a short stage),
  the face lifted 8–12 % over a resting tile's, resting faces `tileFace` and letters `ink`,
  every tile's box within 0.5 px of its resting box, ring plus band reaching into no
  neighbour's letters (the content box inside its padding), the sounding tile marked live
  at z-index −1 in a row that isolates its stacking (`live-not-beneath`), exactly one tile
  live (`live-not-one`), the word in its own layer above the row, the row not lifted
  above it (`word-not-above`), and the row and the message inside the stage's clip edge
  (`row-clipped`, `message-clipped` — on the landscape phone the cell pins exactly those
  two, with the page's numbers, on every read: open-faults AG); then the SECOND pop, where
  the mark must have moved to "i" with two tiles carrying the class and one ring showing;
  then
  "animal" and "breakfast", whose bands must resolve to 7 and 5. And **Build-it** — "ship"
  dealt through the dice (`stageBuild`, the buildable bank's die), every tray tile and
  slot a 56 px control on both axes, every multi-letter tray tile wider than every
  single-letter one, every control owning its centre and on the screen
  (`control-unreachable`) and showing at least the floor of itself inside the stage's edge
  (`control-clipped`), then "breakfast", the largest tray, held the same — except on the
  landscape phone, where every tray sits partly under the strip and the long word's below
  the fold (open-faults AE) and the cell pins exactly those shapes: "ship"'s five tray
  tiles clipped with the visible height in the report, "breakfast"'s ten off the screen by
  name (where a cover cannot be read), nothing else, the page's own numbers, and the AE
  heading still ending at its opening date — read by `faultOpen`, whose positive form
  refuses every suffix this file closes an entry with, with fixture controls. The screen
  no G7 check had ever
  opened. Controls, once: the hold's fixtures for every finding kind, then the READER
  against real plants in the page — the ink ring the app drew until this step (as an
  `!important` rule, since a later `@keyframes` of the same name does not replace a running
  animation), a `sun` face, a border (the box moves), a zero-spread band, the live tile at
  `z-index:auto`, a row at `isolation:auto`, `sun` letters, a `tileHighlight` face (a lift
  off the band), the word at `z-index:auto`, the row lifted to `z-index:2`, the stage
  shrunk to 110 px (the row and the message past its edge), and a second live mark added
  as a class once
  the second pop has landed; and for Build-it a tray tile shrunk to 48 px, every tray tile
  forced to one width, a lid over a tile, a tile sunk below the screen and the stage's
  edge brought to 43 px below a tray tile's top (the landscape phone's shape, through the
  reader). `seedGraduated` now writes
  the save from `/version.json`, a page that is not the app, because a put that landed
  before the app's own first-boot write was overwritten by it once in three runs and the
  reload showed Pre 1.
- **the Glowseed against the audio itself** (art step 2, 2026-08-23). On every profile: a
  probe installed before the page loads (`GLOWSEED_PROBE`) wraps the page's own
  `AudioContext` — every node's `start()` call and every node's `ended` event, stamped on
  the page clock — and a MutationObserver stamps the object's every change of look; the
  attempt is idle at five samples over a second; with the object planted away every zone's
  height and the word's box are unchanged (0 px of layout); the reveal lights it no earlier
  than the first node's `start()`, darkens it within 100 ms of the last node's `ended` and
  never before it, exactly two changes of look, the box unmoved; with sound off the object
  is muted, the replay control disabled and the marker line says "Parent: sound is off";
  on the landscape phone the object is absent (display none) and that is the whole read.
  Controls, once: the three plants that separate an event from a timer, through the probe
  and the reader on the live page — a look set lit before the grade (`lit-before-audio`), a
  look set lit again after the last end (`lit-after-audio`), and a clock that darkens the
  object 1,000 ms after the context is suspended for a literal 1,500 ms mid-utterance
  (`dark-before-audio-ended`; the real object, lit underneath, is shown to wait for the
  delayed end) — then a transition, `pointer-events:auto`, a tab stop, the object moved onto
  the word and the object put back into the flow (the word moves), and fixtures for every
  finding kind. The unit side: `tests/voicepacks.test.js` proves the event source in the
  real module (start once scheduled with the length; end only when every node has ended;
  `stopClips()` ends once; no start on the fallback, with sound off or on a decode failure;
  a throwing listener neither breaks the schedule nor calls the fallback), since the five
  suites that mock `voicepacks.js` can prove nothing about it; `tests/reveal.test.js` proves
  the component's keying by token, the sound-off state on the session and the pre-ladder,
  and the breather skipping itself with sound off; `tests/buildit.test.js` proves the
  scaffold's quiet rule and the muted build; `tests/tokens.test.js` 13 pins the rim's ratios.
- **the art bible's claims, as measurements** (art project step 0d, owner-ruled
  2026-08-22, the council's before pass; detectors in the novelties library, every one
  refusing a screen with no subject). On every profile: **frame** - the header, stage and
  rail heights sum to the shell's within a pixel, so a frame that takes layout is a gap;
  **unit width** - in the reveal of "ship" the multi-letter tile is wider than every
  single-letter tile; **one event at a time** - the only cells that run WITHOUT reduced
  motion: zero running animations during the attempt, and during the reveal at most one
  sounding tile beside the advance control's fill, with the sounding tile required to
  have been seen. Once, at 320 x 568: **200%** - the widest bank word by rendered width,
  probed in em over the whole bank (`widestWord`; "something", 5.19 em), staged for real
  and held to one line box, inside the viewport, 36 px or larger, on three arms - 100%,
  rem scaling at 200% (a phone's text setting) and CSS zoom at 2 on 640 x 1136 (the
  desktop's, as G8 applies it; 320 zoomed would be a 160 px screen no device has). The
  zoom arm measures the word's WIDTH under zoom and nothing about the shell: CSS zoom does
  not scale `svh` - measured 2026-08-22, a `100svh` root under `html{zoom:2}` is 2,272 px
  tall on a 1,136 px screen and the clamp still computes 88 px - and the cell's first
  comment claimed more (the engineering chair's finding). Its first draft measured the
  element's box instead of the text's and read 292 px for every word; the corrected probe
  found that the principal word, sized by height alone (`11svh`), already broke into two
  fragments at 100%: seven bank words on 320 px, thirty-four on a 390 x 844 phone
  ("swimmin" over "g"). The fix is `app/src/components/Word.jsx` and its mirror in the
  reference: the stylesheet's size stays on `.wq-word`, whose line box is therefore the
  same height for every word, and the fitted size goes on an inner span whose smaller
  glyphs sit on the outer line's baseline - so the box and the baseline are constant
  across words and only the glyphs of a word wider than its line shrink (P0-2, bible 3.2),
  measured after layout under a ResizeObserver and `document.fonts.ready`, with the fit
  scheduled for the next frame and never run inside the observer's delivery. The first
  draft set the size on the observed element itself, which moved the box between words
  and raised "ResizeObserver loop completed with undelivered notifications" on every
  refit - a window error the app's error ring recorded as a phantom bug in the grown-up's
  report (the reading chair, measured on the built app). `.wq-word` is
  `white-space:nowrap` so the overflow is measurable. "something" renders at 56.1 px on
  320 and 69.5 px on 390, "sat" keeps the 88 px cap. Also on every profile since the after
  pass: **the widest word** - the probe's word staged on THIS profile, one line at 36 px
  or more, and its box (0.5 px), glyph size (0.01 px) and text bottom (0.5 px) identical
  between ready and reveal (`wordGeometry`, `wordHold`; control plants a mid-word shrink
  and a 9 px shift); the motion cell also records every sampled pop as an interval on the
  document's timeline and refuses two that intersect, and its title says sampled, because
  a pop shorter than a sample can still be missed. Once: **the fit across a rotation** -
  the widest word through 390 x 844, 320 x 568, 844 x 390 and back, refitting each time
  with the error ring still empty - and a control that dispatches a window error in the
  built page and reads it back from that ring, so a null there means no error and not no
  ring. The controls: the combined one plants a 40 px frame, a
  guide on the stage, a looping animation IN THE PAGE read back through the browser, two
  sounding tiles, equal tile widths, a word that overflows the screen and a word that
  wraps, and the snap's arithmetic on fixtures (k = 2.019 over 512 art pixels, 1,033.7
  device px against 1,024, which a ratio tolerance passed; a height stretched alone);
  the word-geometry control; and the snap reader's own control, a real 64 x 64 PNG planted
  on a real Pixel 7 context (2.625) at 300 CSS px with the browser's smoothing, refused
  on all three counts, then resized to eight device pixels per art pixel at an integer
  device offset, pixelated, and passed - with the offset tolerance set to the browser's
  own 1/64 CSS px layout grid (dpr/64 device px), which the plant measured: 262 device px
  asked for, 261.967 laid out. Two detectors ship with controls and no live cell yet,
  because their subjects do not exist: the **guide** allow-list (home, done and milestone
  screens only, never over the stage, never animating while a clip plays) and the
  **device-pixel snap** of every `data-wq-art` element (whole device pixels per art pixel
  on both axes - and per FILE pixel too, since a 2× or 3× file drawn at k device px per
  logical px must land each file pixel whole (k = 5 on a 2× file is refused, 4 and 6 pass)
  - integer offsets, nearest-neighbour). Counts by a run on 2026-08-22:
  `census_novelty_cells` 34 to 68, `census_novelty_controls` 8 to 12, `census_cells` 626
  to 664 (the first 0d commit wrote 651 for a count of 652; E6 says the count). The
  interval rule `popOverlap` has its own fixtures in the combined control - two pops that
  cross, two that touch, one sampled twice, none - after the re-judgement found it shipped
  without one. The
  report's staleness scan now watches `tools/census-novelties.mjs`, with its self-test
  line.

Two Windows lessons from the first run on the owner's machine: vite is spawned through
node itself (the .bin shim is a POSIX script, the same fault G7 and the mutant runners met
on 2026-08-15), and the npm scripts' `${CENSUS_PORT:-4187}`, `rm -f` and `{ ...; }` were
POSIX-only, so `npm run census` had never started here - since 2026-08-22 the judge's
`--run` path spawns the runner itself and `tools/free-port.mjs` defaults its own port, and
both entry points start on either platform.

### The speed plan — measured 2026-08-21, ruled the same day, P0 and P1 built 2026-08-22

Three read-only audits and one stamped gauntlet run (run 7, 32 min 16 s on the owner's
machine, 28 gates green) measured where the time goes before anything was proposed.

**Ruled 2026-08-21, on the speed-plan page, all four the recommendation:** the gauntlet -
"Instrument, then do less, then lanes only if they earn 20%"; the census key - "Key by
grapheme length; keep all 8 profiles"; the census sound - "Keep the sound on; take the time
back through Decision 2 and workers"; where it runs - "Both: a dispatch workflow on a
runner, and a measured worker count here".

**What shipped on 2026-08-22, and what it measured.** P0: every evidence result carries
`durationMs` and the summary prints seconds beside each gate; the payload hash is a Node
walk (it had been null on Windows since the evidence was born - POSIX `find | sort`); the
suite versions are read in-process (also null on Windows before); `--canonical` prints the
evidence with timing and order stripped, with a planted-divergence control. P1: `--bail 1`
on the G5 and G19 mutant loops, never on their pristine controls - G5 34 min 18 s to
7 min 6 s, G19 3 min 35 s to 3:37 (no gain - its time is the transform cache, not the
tests), verdicts identical, measured back to back on the same
tree on the owner's machine (a full-suite run took ~28 s that night with a browser pane
and a preview server open, so the ratio is the honest number and the absolutes are that
night's); and G6
reads its coverage numbers from G1's run, which now carries `--coverage`. G4's generator
stays a spawn: measured at 115 ms a launch, 102 launches are ~12 s of a gate whose
time is its 102 vitest runs. P2, the lanes, is built behind `--workers 2` (or
`GAUNTLET_WORKERS=2`), default 1: `tools/gauntlet-lane.mjs` is a child the parent spawns
as G5 starts, running the twelve read-only gates (E11, G21, G16, G16b, G12, both G13s, G20,
G17, G23, G24, G25) one after another beside G5 and nowhere else - the parent waits for
the lane before G19, the next tracked-file mutator, and a guard with its own control
refuses any mutator, the build or a browser gate in the lane list. The parent stays the
sole reader of the baseline and sole writer of the evidence: it parses the lane's stored
output through the same step() in its own order, so a laned run and a serial run are the
same proof exactly when `--canonical` says so. Adoption is the owner's rule: 2 becomes the
default only if it cuts wall time by 20 per cent against the serial post-P1 run with
byte-identical canonical evidence. MEASURED 2026-08-22 on one commit, b671dab, back to
back on the owner's machine: run 16 serial 26 min 13 s, run 17 `--workers 2` 22 min 49 s,
both 28 of 28 green, `--canonical` forms byte-identical - a 13 per cent saving, under the
bar. The reason is in the per-gate numbers: beside G5, E11 went from 7:23 to 11:29 and G5
itself from 6:39 to 7:54, because every vitest run already uses every core and the lane
only adds contention; the lane (12:52 under contention) outlasted G5 by five minutes and
the parent waited. So serial stays the default, the flag stays set by nobody, and the
honest summary of P2 is: built, proved identical, not worth its minutes on this machine.
A runner with idle cores may measure differently; the same two runs decide it there.

**The census, as ruled.** The class key's third term is the widest unit's LENGTH
(`tools/ux-census.mjs`, `signature`); `census_cells` rises from 416 to 616, counted with
`playwright test --list` (584 word, screen and state cells, 24 novelty cells, 8
singletons), then to 625 with the monkey (below); the judge gained a `--novelties` scope
with its own floors (`census_novelty_controls` 8, `census_novelty_cells` 34, eight controls) and a `--run` path
that spawns Playwright through Node with no shell, so `npm run census` and the new
`npm run census:novelties` start on Windows - the old script's `rm -f`, `{ ...; }` and
`${CENSUS_PORT:-4187}` never had; and `.github/workflows/census.yml` runs either scope on
a runner by hand from the Actions tab, uploading the report and every failing trace
whatever the verdict. The worker count was measured, not assumed: nine runs of the 32-cell
novelties scope on the owner's machine, three each at 1, 2 and 4 workers, 288 cells, zero
failures and zero retries - 2:22/2:19/2:23, 1:26/1:25/1:23, 1:03/1:02/1:02 - so the config
now defaults to 4 here, the highest count that never churned, with `CENSUS_WORKERS` still
overriding and the runner workflow passing its own. The next full body confirms it at 616
cells or lowers it.

**Where the gauntlet's minutes are.** The mutation block is about 72 per cent of the
wall: G4 + G5 inside the first 12:54 (with the fast gates), E11 5:12, G19 6:36. Browser
gates 4:09 (G7 alone 3:38). Everything else about five minutes. Inside the mutation
block: 191 vitest launches per run, 87 of them the full 17-file suite (G1, G5's control
and 72 mutants, G19's control and 11, G6's coverage pass) - a clean unmutated suite is
proved four separate times, `src/engine.js` is regenerated 77 times with identical bytes,
and no mutant run carries `--bail`: a killed mutant runs all 378 tests when one failure
would do. G19's full runs cost ~33 s each (rewriting `app/src` invalidates the transform
cache); G5's are far cheaper (one module). vitest's default forks pool already spreads
each run across every core, so stacking concurrent mutants on one machine mostly
oversubscribes the same CPUs - concurrency is not the first lever here; doing less is.

**What may overlap, and what never may.** Hard serial core: G3, G4 and G19 mutate
TRACKED files in place (open-faults C2), G5 rewrites the shared untracked engine, the
build produces `app/dist` for G7/G8/G18. Independent of all of it by construction: E11
(a tmpdir sandbox that asserts the tree untouched), G21 (no port, tmpdir), and the eleven
read-only document and pack gates - EXCEPT that G23 and G24 scan every tracked file's
content and so may not overlap a tracked-file mutator (G3/G4/G19); they may overlap G5.
G7/G8/G18 hold distinct ports (4183/4/5) but each asserts rendered geometry and 400 ms
guard windows - three chromiums plus a mutation loop on one box is the realistic failure
mode, so they stay serial. The evidence writer couples to serial order in five places
(module-level `failures`/`results`, G18's stdout reused 178 lines later, one end-of-run
`dirty` sample, per-child restore-on-exit, the lock in the parent's cwd), and on Windows
it writes `payload.hash: null` and null suite versions (POSIX `find`/`sort`) - so "serial
and parallel evidence are identical" cannot be proved until the evidence is first made
honest on this platform.

**The plan, in the order the measurements dictate.**
- P0, instrument and make evidence honest: `durationMs` per step in the evidence and the
  summary line; the payload hash by a Node directory walk, suite versions by
  `createRequire`; a `--canonical` form (results sorted by gate, timing and platform
  stripped) with a planted-divergence control.
- P1, do less, still serial (no concurrency risk): `--bail 1` on G5 and G19 mutant runs
  (a kill is still "at least one failure"; the parser is unchanged; verify the summary
  row still prints under bail); one `--coverage` run feeding both G1's and G6's counters;
  G4's generator in-process instead of 102 spawns. Measure each against run 7.
- P2, bounded lanes, `--workers 2`, default 1: one Node parent, children via
  `child_process` under a semaphore, the parent the sole writer; lane B (E11, G21, the
  eleven read-only gates) overlaps G5 only - never a tracked-file mutator, never the
  build; `dirty` sampled only while no mutator is live. The ceiling is the ~7 minutes
  lane B can hide behind G5, about 22 per cent of run 7 - at the bar, before contention.
  Adopted only if it cuts wall time by 20 per cent or more against the POST-P1 baseline,
  with byte-identical canonical evidence and no new failures; otherwise it stays a flag
  nobody sets.
- Not proposed: sandboxed concurrent mutants. vitest already uses all cores per run, and
  the sandbox needs two `node_modules` junction-linked per mutant on Windows - the
  load-bearing unknown. The sandbox IS wanted for a different reason (C2: G4 and G19
  mutate tracked files) and belongs to the hardening programme below, not to speed.
- GitHub runners: lanes become separate jobs there (true isolation) with a merge step
  producing the one evidence file; the census, which runs on no runner today, gets its
  own dispatch workflow at `ubuntu-latest`'s four cores.

**The census.** 2,809 cells at 11.4 s ≈ 8.7 h at one worker. Three levers, each measured:
the reveal wait (~8 s of every grading cell is the voice clip playing out; muting recovers
~6 h but moves the measurement onto the 400 ms arming branch a child does not meet -
open-faults B17 - so it is the owner's call); `workers` (the 1 was a verdict on the Linux
container; no Windows measurement exists - the plan measures 2 and 4 on the controls and
novelties subset, three runs each, and adopts the highest churn-free count); and the
class key, whose third term is the grapheme's STRING (66 values) and is the whole
explosion - by grapheme LENGTH it is 37 classes: 521 cells on eight profiles, 226 on
three (320/390/1280). Two mandatory fixes ride with any ruling: `census_cells` 416 →
2,809 (E6, six times stale), and a `census:novelties` entry point so the every-beta
ruling is runnable without the every-other-beta body.

### The release command (hardening decision 1, owner-ruled 2026-08-22)

`npm run release` (`tools/release.mjs --go`; `npm run release:dry` prints the checks and
stops) is the only way a release is cut. It gathers facts - branch, porcelain, the
evidence file, a fresh build's payload hash through `tools/payload-hash.mjs` (the same
function the gauntlet writes with, so the two cannot drift), the app version, the family
changelog's entry for it, the tags local and remote, and whether origin/main is an
ancestor of HEAD - and a pure `judge` refuses on any of thirteen grounds, each proved by a
planted fact in `--self-test` (15 controls). The one that earned it: evidence for a commit
that is not HEAD, the beta 24 and beta 25 shape. With `--go` it pushes main, creates the
tag and the GitHub release at HEAD's full sha with the changelog entry as notes, reads
the remote back and refuses after the fact if the tag is not at HEAD. Its first dry run,
on the tree that had just released beta 26 by hand, refused on three true grounds (a
dirty tree, the tag existing locally and remotely) and accepted the evidence, the commit
and the rebuilt bytes.

### Owner-queued: harden and deflake the gates (2026-08-21, after beta 22)

The owner queued a twelve-point programme the same day - one schema-validated gate
policy as sole authority; per family a stable id, exact claim, proof method, limits,
paths, non-run behaviour and an executable negative control; one representative defect
run against every gate; fail closed on errors, timeouts, cancellation, skips, missing
artifacts, duplicate results and stale revision identity; expected-versus-received
reporting that never calls inventory a pass; zero automatic retries with the first
failure preserved; evidence bound to candidate bytes, commit, tool identity and
environment; calibrated coverage, mutation and browser evidence; fast checks on pull
requests, the full audit on one dispatched frozen candidate; independent verification of
remote enforcement including tag protection; regression tests that mutate the policy and
aggregation and must be rejected; an independent read-only review of the exact revision.
The deflaking rule: never retry until green, never widen a timeout without a measurement,
never weaken an assertion, never treat missing evidence as success. The day's rehearsals
found exactly its class - G25's counters blind since birth, three floor raises on the
wrong key, stray step arguments, a null payload hash - and the recommendation, costed
against that record, is owed after the beta push and after the speed plan above.

### The type checker (owner-ruled 2026-08-22, the bug-hunt page)

`tools/type-check.mjs` runs in `npm run check`: TypeScript's `checkJs` over the plain
JavaScript, no conversion, through `app/jsconfig.json` (the app, DOM types, the build's
globals declared once in `app/src/globals.d.ts`) and `jsconfig.json` (the tools, Node
types). The fault class it refuses at authoring time is the 2026-08-17 one - a call with its
arguments shifted one place - and its control plants exactly that and requires the count.
Zero on both sides: `tsc_app_errors_max` and `tsc_tools_errors_max` are 0, ceilings under
E6 so they stay there. On arrival the app had 36 findings (build globals, CSS custom
properties, vendor audio APIs, and Zone's optional props, which JS destructuring had left
reading as required) and the tools 153, of which 113 were `window` and `document` inside
`page.evaluate` - the DOM lib - and the rest fixture unions, browser probes and one reader
parameter; all were fixed the same hour. A first draft gave the tools side a ceiling of 27
and the owner refused it in one line - "this sounds like test faking" - which it was: a
checker allowed to pass with findings in it. About six seconds, both configs.

### Never run `npm run check` while a gauntlet is running

Enforced since 2026-08-22 (hardening decision 3, owner-ruled): `tools/lock-guard.mjs` is
the first line of `npm run check` and the whole of the pre-commit hook in `tools/hooks/`
(installed once with `git config core.hooksPath tools/hooks`). While `.gauntlet.lock`
exists both refuse, naming the gate that holds the lock and since when - the gauntlet
writes that into the lock as each step starts. Ten controls. G4 now restores its
planted mutants on every exit signal, as G19 already did. The paragraph below is why.

**And the gauntlet is no longer the only thing that creates it** (2026-08-23). The three
mutant runners are exposed directly as npm scripts - `test:mutants`, `test:app-mutants` and
`test:acceptance-mutants` - and each rewrites files while it runs, so each takes the lock
itself. **G4 is the one that matters most**: its two files, `tests/generated/acceptance-ir.json`
and `tests/generated/acceptance.test.js`, are TRACKED, so a concurrent commit sweeps a
planted mutant into the repository. G5's two files are gitignored, so it cannot leave one
there, but a concurrent check would still read a mutated engine. The gauntlet marks the lock
as held through the environment and its own steps do not take it again; only the exact token
`WQ_GAUNTLET_LOCK=held` bypasses, because that direction fails OPEN and so has its own
controls. A direct mutant run therefore prints "a gauntlet is running - G4 acceptance-mutants
since HH:MM" to anyone who tries to commit, which is accurate about the danger if loose about
the word "gauntlet".

Owner-facing consequence: nothing. Agent-facing consequence: a false result, in both
directions, and it is new as of 2026-08-12.

`npm run check` now begins with `check:acceptance`, which REGENERATES `tests/generated`. The
gauntlet's acceptance-mutation gate works by planting mutants in those same tracked files. Run
the check mid-gauntlet and it erases a planted mutant, so G4 reports a survivor that was never
alive — or, if the timing falls the other way, the check reads a planted mutant as a real diff
and goes red for a fault that does not exist.

The same window is why a mutant reached the repository at 22:44 that day: `git add -A` while
the gate held a file mutated. `.gauntlet.lock/` exists for the whole run and is the signal —
if it is there, do not commit and do not run the check.

**The real fix, not yet built:** the mutation gates should mutate an UNTRACKED copy, so the
window never opens. `tools/app-mutants.mjs` has the same shape — it edits tracked files under
`app/src` in place — and is only survivable because the ordinary suite kills its mutants fast.
Until that is done, the lock is the rule.

### The next census — the build spec, owner-ruled 2026-08-12

Every item was verified present in this environment before it was written down. Each line says
the exact Playwright API and what it catches that the census cannot catch today.

**1. Three engines, and this is the largest item.** `projects` gains `firefox` and `webkit`
beside `chromium`. The install guide tells a parent to put this game on an **iOS home screen**,
and iOS is WebKit in every browser, always — so until this lands, every browser check this
project has ever run has run on an engine an iPad user never touches. WebKit on Linux is the
same engine core as iOS Safari, not the same build; the report must say so, or a green run gets
read as "verified on iOS", which it is not. This machine cannot download browsers, so the run
happens on a runner that can.

**2. Real devices instead of hand-written boxes. BUILT 2026-08-13.** `devices` ships **207
descriptors** with the right user agent, device scale factor, touch and viewport. The seven
hand-written viewports are now eight named profiles drawn from those, keeping the 320 px
extreme — as a real device rather than a box — with fractional scale factors so
fractional-pixel layout is exercised.

| profile | device | page gets | scale |
|---|---|---|---|
| phone-portrait | iPhone 13 | 390x664 | 3 |
| phone-landscape | iPhone 13 landscape | 750x342 | 3 |
| phone-android | Pixel 7 | 412x839 | **2.625** |
| tablet-portrait | iPad Mini | 768x1024 | 2 |
| tablet-landscape | iPad Mini landscape | 1024x768 | 2 |
| tablet-large | iPad Pro 11 | 834x1194 | 2 |
| desktop | Desktop Chrome | 1280x720 | 1 |
| narrow-extreme | Galaxy S9+ | 320x658 | **4.5** |

**What it corrected on the day it landed.** The hand-written boxes were DEVICE dimensions, not
page dimensions. This census called an iPhone 13 390x844 and asserted that nothing fell below
the fold there; the page really gets 390x664. Every "nothing is below the fold" it had ever
reported for a phone was reported with 180 pixels of slack in it. The screens were re-run at
the honest sizes and still pass, so nothing was hiding behind the slack — but nothing had been
proving that either. The config also pinned `deviceScaleFactor: 1` for every project, which
overrode each profile back to whole-number scaling; that line is gone.

**And the engine is now a parameter.** Every iPhone and iPad descriptor carries
`defaultBrowserType: "webkit"`, so adopting real devices without stating `browserName` would
make the whole census try to launch an engine this machine does not have. `CENSUS_ENGINE`
selects it, Chromium is the default, and the report states which one actually ran (item 1).

**3. The states a word never reaches. BUILT 2026-08-13, in part.** The census saw the prompt
and the correct reveal and nothing else. It now also sees the **close reveal** and the **wrong
reveal** — S3's invitation text, the longest child-facing sentence in the game and the one most
likely to wrap under a control — the **done screen**, and the **update row** in both of its
states. Four cells per profile, 32 in all.

The two reveals are staged on `chat`, a four-tile word with a digraph: the widest tile row the
bank can produce, so a reveal that wraps anywhere wraps there. The done screen needs a REAL
session, because free play never ends — it grades one word, opens "Finish early", and saves a
short session; it is therefore the only cell in the file that is meant to write, and the only
one that does not assert the saved progress is unchanged. The update row is reached by
intercepting the app's own same-origin `version.json`, so "⬆️ Update now" — a control that
restarts the app, and which no census had ever seen rendered — is measured without anything
being published anywhere.

Each cell was proved by planting the fault it exists to catch and watching it go red: every
child control shrunk below its 56 px floor, the done screen's way home deleted, the update
check made never to offer the update it found, the miss sentence emptied, and the miss sentence
pushed off the screen. Five plants, five kills. The first version of the sentence check
measured the whole stage against a length I had guessed at, and the emptied-sentence plant
sailed through it — the word and its tiles are text too. It reads `.wq-slot-msg` now.

**Still unbuilt from this item:** the **progress track** at 7, 10 and 20 columns and the
**level strip**, both of which need seeded state per level rather than a route through the
app.

**4. Checks that close what the census currently only measures.**

| check | API | the fault it catches |
|---|---|---|
| font floors | `expect(el).toHaveCSS("font-size", …)` | the label that rendered at four times its size — measured today, never asserted |
| on-screen | `expect(el).toBeInViewport({ratio})` | below-the-fold, with a ratio rather than a hand-rolled box test |
| accessible tree | `expect(page).toMatchAriaSnapshot()` | what a screen reader is told, pinned as a readable file in git |
| overlap | rectangle intersection over every visible element | the home-screen images that overlapped — point-sampling a control's centre misses it |
| a11y sweep | axe-core, injected | contrast, names, roles, focus order, on every cell instead of three screens |

**4 is BUILT as of 2026-08-13**, apart from the screenshot half of it. Font floors and ceilings
were the first thing the rebuild landed. `toBeInViewport({ratio: 0.9})` now asserts that the
miss sentence is on the screen a child is looking at, where an assertion belongs — `inspect()`
keeps its own box comparison for the things it merely reports. Overlap is rebuilt twice over
(see the audit rounds above). `toMatchAriaSnapshot` pins the home screen's accessible tree as a
readable file in git, in the controls project rather than in the census: a tree pinned eight
times over eight device profiles is eight files that drift apart, and the accessible tree is
not a property of the viewport. Its generated form had to be edited once, because Playwright
wrote the build stamp into it literally and it would have broken on every commit.

**The accessibility sweep uses the axe-core already in the tree**, not
`@axe-core/playwright` — no new dependency, and nothing fetched over the network, which the
census owes S6 as much as the app does. It runs the SAME four WCAG tag sets as G8, deliberately:
two accessibility checks in one repository answering to different rule sets would let a state
pass in one and fail in the other with nobody able to say which was right. G8 remains the gate
over five screens; the census asks the same questions of every state it visits, including the
four G8 has never seen. **Its first run found zero violations across all of them** — a good
result, and also exactly what a sweep that is not running looks like, so it ships with a planted
unlabelled button and a clean-page control on either side of it.

**5. Conditions, not just screens.** A fault that only exists while things are loading is
invisible to a warm run, which is how B17 survived. Each of these is a project:

| condition | API |
|---|---|
| colour blindness | CDP `Emulation.setEmulatedVisionDeficiency` — deuteranopia, protanopia, tritanopia, achromatopsia, blurred vision |
| Windows High Contrast | `emulateMedia({ forcedColors: "active" })` |
| `prefers-contrast` | `emulateMedia({ contrast: "more" })` |
| dark mode | `emulateMedia({ colorScheme: "dark" })` |
| a slow processor | CDP `Emulation.setCPUThrottlingRate(4)` |
| a slow network | CDP `Network.emulateNetworkConditions` |
| slow voice clips | `page.route("**/voice/**", …)` with a delay |
| time itself | `page.clock` — `install`, `pauseAt`, `fastForward`, `runFor` |

The colour-blindness and high-contrast runs produce **screenshots for the owner to judge**.
A measurement cannot say whether a palette is usable; that is the same shape as a listening
round, and it is theirs to rule on.

**6. B17's test, and the pattern for its whole class.** The tap window is reproduced with the
voice clips delayed and the processor throttled, and `page.clock` makes it deterministic: the
advance control must be disabled for the entire sound-out, with a control proving the test
fails when the window is open.

**7. Shards that add up.** The `blob` reporter plus `playwright merge-reports` turns a
two-shard run into one report. Sharding without it produces two half-answers.

**8. Screenshot baselines, narrowly.** `toHaveScreenshot` scoped to the tile row, masked, with
`maxDiffPixelRatio`. Baselines are stored per browser and per runner, because a baseline made
on one machine is a statement about that machine — a mismatch anywhere else is not a finding.

**What none of it can settle**, stated here so no report implies otherwise: whether the voice
is right, whether a child understands the screen, whether a colour is pleasant, and whether the
game works on a real iPad in a real kitchen. The QA script and a person own those.

**Two things about running it, both found the hard way on 2026-08-13.**

The preview server was started through `npx`, which puts a shim process between Playwright and
the server it believes it is managing — so Playwright's handle was the shim's. A run would
serve its first cell and then answer `ERR_CONNECTION_REFUSED` for every cell after it: the
server gone, the runner none the wiser, and the whole thing reading like a flaky app rather
than a dead process. The same page loaded fine on the same device against a hand-started
preview, which is what ruled the app out. It runs `node_modules/.bin/vite` directly now, and
the case that failed 3 of 4 reproducibly passes 4 of 4.

The port is a parameter (`CENSUS_PORT`) and `npm run census` clears it first with
`tools/free-port.mjs`. `reuseExistingServer: false` is deliberate and stays — attaching to
someone else's server means measuring an app nobody built for this run, which cost an hour
once — but its price is a zombie: an interrupted run leaves its preview holding the port, and
the next run either refuses to start or is torn down mid-flight. Two census runs on one
machine collide the same way, which is exactly what happened between this repository and an
auditor's clone of it.

**What is still not settled:** whether the census repeats its own answer under load. At two
workers this box fails cells wildly (20 of 24, then 2 of 24, on the same 24 cells), which the
config already assumes; but the 1-worker runs above were taken while an auditor was running a
second Playwright on the same container, at load average 4, so they measure the machine rather
than the census. That measurement is owed on a quiet box before any full run is quoted.

**Cadence: every other beta** (owner-ruled 2026-08-12). Its own negative controls —
`npm run census:controls` — are the part that can be trusted at any time: 41 cells in about
thirty-seven seconds. Their make-up is asserted by the file's own last cell rather than typed
here: 16 plant a defect from the CSS table, 10 plant one built in the page where a stylesheet
cannot reach, 3 prove a clean page reports none of them, 8 hold the census's own rules against
the app, and 4 cover the toast report, the staging refusal, the home screen's pinned accessible
tree and that count itself. The
arithmetic in this paragraph was wrong by two on each of the two days it was written — which
is why the file now counts itself, and counts the breakdown rather than only the total.

**The report gate is no longer optional.** `npm run census` deletes the previous
`.census/report.json`, builds, runs the cells, and then runs `tools/census-report.mjs`
whatever the runner's exit code was — so a run that produces no report, or a report from
some other config, is refused rather than read. The floors it enforces are
`census_controls` (41) and `census_cells` (692) in `.claude/gate-baseline.json`, under E6
like every other floor. The gauntlet still does not call the census, and that stays
deliberate: a flaky cell must inform a release, never block one.

- Baseline floors: `g13_clips` (760) and `g13_engine_tests` (18).
- To re-render the pack after the bank grows: `docs/voice-pack.md`.

## G14c. The provenance reader (art step 1, 2026-08-22)

`tools/art/provenance.json` is the art project's record — one entry per asset family:
its kind, step, sources, byte share (the shares table's integers sum to at most the 16.2
ceiling), what it spent, its lock, ramps and states by token name, its pinned ratios with
the test that pins each, its checkpoints and its originality verdict (bible 17's ruling).
Data nobody reads is the drift G23 refuses, so `tools/provenance-check.mjs` runs in
`npm run check`: every family's shape, every token name against `C`, spent inside the
share, and a closed family refused without both checkpoints and an originality verdict.
Its lock reader `lockFromSources` derives the ring, its offset, the band per density, the
radii, the rim, the highlight inset, Build-it's box and letter step, the halo inset and the
compact build's sizes from `app/src/wq-css.js` and `app/src/screens/BuildItScreen.jsx`, so
a number changed in the source and not in the record is refused. Since art step 2 a second
reader, `glowseedLockFromSources`, derives the Glowseed's box, corner, rim, light, core and
absent-below height the same way and refuses a transition on it, and a Glowseed row must
declare its placeholder. Eighteen controls, among them a planted 2 px rim, a two-value
padding, a 7 px reveal band, a 3 px light and a transition. Declared DATA in the
file map; the reader is its reader. No README file per family exists or may: the entry is
what the ruling calls the README.

## G14a2. The website's two refusals (2026-08-23)

- Tool: `tools/verify-published.mjs`. In `npm run check` as `--self-test` (13 controls).
  It holds the two judgements the website's deploy makes: whether the downloaded artefact is
  the one the gauntlet proved (the evidence says PASS, carries a hash, and that hash equals
  the one recomputed from the extracted files), and whether what a family can then download
  is what was released (the live `version.json` reports the proved commit and the tag's
  version). Both were inline JavaScript inside `.github/workflows/pages.yml` until
  2026-08-23, with no control and no run behind them — the release sweep found the whole
  chain had never executed once. They are pure functions over plain data now, and the
  workflow calls this file rather than thinking for itself. The controls plant each fault:
  a FAIL evidence, a missing hash, a hash mismatch, a site still serving the previous build,
  a site serving another version, and a deploy that cannot say what it published.

## G14b. The art budget (art project step 0c, owner-ruled 2026-08-22)

- Tool: `tools/art-budget.mjs`. In `npm run check`: the tracked bytes under `app/public/art/`
  against `art_bytes_max` (12,582,912 — "12 MB for all art"), deterministic and identical
  on the runner and here, no build needed. In the gauntlet as "G14 art-budget", after
  `app build`, with `--dist`: the service worker's precache count against
  `precache_files_max` (1,650; 1,488 today, and the census crashed a browser at a 1,500-file
  precache), and every tracked art file byte-identical in `app/dist` to its source, so the
  bytes the check measured are the bytes the worker installs. Ceilings under E6: never
  raised casually. The ceiling is over the ART, never the whole build — the engineering
  chair's finding: a whole-dist ceiling would be spent by the voice pack (39 of 40 MB,
  growing with every listening round).
- Controls (7): a 13 MB file planted in a scratch directory is refused; a precache list one
  over the ceiling is refused and one at it passes; a built file whose bytes differ from its
  source is refused; the real tree passes; the precache reader finds the worker's list.

## G19. App mutation

- Tool: `tools/app-mutants.mjs`. Command: `npm run test:app-mutants`. Requirement: 0
  survivors. Keys: `g19_app_mutants` (18), `g19_survivors_max` (0). Three joined on
  2026-08-22 for the bug-report ring: a ring that never writes, a ring that keeps one entry,
  and a render boundary that shows the way home without recording the crash. Three more on
  2026-08-23 for the Glowseed, which had none at all until the art council's re-judgement
  found three of its fixes guarded by tests that passed identically on the broken build: the
  scaffold's last slot never reporting in, a win mid-scaffold leaving the object dark through
  the celebration, and the object ignoring a screen's request to stay quiet. Each was applied
  by hand and watched to fail its named test before it was written down.
- G5 mutates the engine. Nothing mutated the half of the product the child actually
  touches, so the app's tests were known to PASS and not known to BITE. G19 breaks one
  rule at a time in the files the engine never sees: the grade-once rule (that nothing
  records a result without an adult), the 450 ms adult hold, the update comparison's build stamp,
  the backup validator's shape checks, and free play's promise to write nothing.
- Runner control: the pristine suite must pass before any mutant runs, so a broken
  environment fails loudly instead of reading as "every mutant killed". Since 2026-08-21 it
  names what failed and tells a failing suite from a runner that crashed.
- `--bail 1` on every mutant run, as G5 (2026-08-22), kept for consistency and measured as
  buying NOTHING here: 3 min 35 s without bail, 3:37 with it, 11 of 11 killed both times.
  G19's cost is the transform cache rebuilding after every rewrite of `app/src`, not the
  tests that follow.
- What it caught on the day it was written (2026-08-10): three survivors in the backup
  validator. Every existing malformed-backup case was refused by several clauses at once,
  so removing any single clause changed nothing. `tests/faults.test.js` gained seven files
  that are valid saves in every respect but one, and a direct test of the predicate for
  the array clause — which the file input cannot reach, because a JSON array carries no
  named properties. The mutants were kept and the tests were strengthened, never the
  reverse.

**`--anchors` (2026-08-22).** `node tools/app-mutants.mjs --anchors` checks every anchor
against its file and mutates nothing, the lookup `tools/mutants.mjs` has had since
2026-08-12. It was added the evening the lookup was asked of this tool, which ran the
whole gate instead; the caller's two-minute timeout killed it mid-mutant and left
`return { state: "current" }` in `app/src/updates.js` for the next commit to sweep up.
The working tree was compared against HEAD before that commit, which is the only reason
it was seen.

## G18. Network audit

- Safety rule S6 promises no network calls after load, with two exceptions to the app's
  own host. G10 proves that by READING the source: a scan for `fetch`, `XMLHttpRequest`,
  `WebSocket`, `sendBeacon` and `analytics` across every shipped file. That scan is
  instant and has its own controls, but it can only see the code it is pointed at — never
  a request from a dependency, an `<img src>`, a stylesheet `url()`, or a path its
  allowlist strips before scanning. G18 watches the browser instead.
- Playwright drives the built app and records every request from every page, worker and
  WebSocket: one word graded and its WHOLE reveal waited out (until the advance control
  comes alive, not a fixed sleep), then the Grown-ups corner — which owns the backup
  export, the reset flow and the update switch — then the grown-up strip's update check,
  then a return to the foreground. It does NOT reach the done screen: a session is about
  twenty words, and grading them all would add minutes for a screen with no network path
  of its own. Requests are judged by comparing ORIGINS, not string prefixes, so a
  different port or a userinfo host cannot read as same-origin. The allowlist is the whole of S6 and has no exceptions: same-origin only.
  `version.json` is same-origin too, so the approved update check needs no special case —
  a rule with no exceptions cannot be quietly widened.
- Negative control: a cross-origin `fetch` and a cross-origin `<img src>` are planted in
  the live page and the recorder must catch both. Without it, a recorder that saw nothing
  would look exactly like an app that asked for nothing.
- Baseline floor: `g18_network_checks` (4).
- Run: `npm run test:network`

## G17. Governing files

- "What counts as finished work" (AGENTS.md) bans new status files, progress logs and
  session summaries: every fact has one owning document. This gate makes the ban
  mechanical: every tracked `.md`, `.json` and `.csv` must be a named governing file or
  product machinery matched by an allowed pattern; anything else fails the build until the
  owner approves it into the owned set — an owner-visible diff, the same shape as the
  dependency rule.
- Negative control: `--self-test` plants a `PROGRESS.md` and a stray `status.json`; the
  detector must report both and still accept the real tree.
- Baseline floor: `g17_governing_files` (47). It moved from 23 on 2026-08-11, when the
  owner approved `docs/open-faults.md` into the owned set — the list of what is still
  wrong, so that a fault cannot be lost to a context compaction — from 24 on 2026-08-15
  for `docs/file-map.md`, the generated ownership map (G23), and to 28 the same day for
  G24's three open ammunition files: the known vocabulary, the public common-names
  registry, and the census surnames for the pair rule. That is the approval path this gate exists to force, working as intended.
- Run: `node tools/check-governing.mjs`

## G23. The file map with teeth

Owner-ruled 2026-08-15: "end drift and orphanage — any change to any file can't result in
drift, because information ownership is well established and the map is known by all."
Design: open-faults section M (2026-08-14), built with the one-fact-one-owner rule from the
same day's refactor review. The map is the detector's own configuration — the fact table and
the file declarations live inside `tools/file-map.mjs`, and `docs/file-map.md` is generated
from them, so the map and the enforcement are one object and cannot disagree. A hand-written
map of owners would rot exactly as a hand-written count does; a separate data file beside
the tool would be fault F2 re-committed.

- **The refusals.** An owned fact stated as a literal in a governing document that does not
  own it; a tracked file declared nowhere; a G17-approved file with no declaration here
  (without that coupling a future top-level document would slip through a bulk glob and
  never be scanned — reviewer-found the day the gate was built); a DATA file no code reads
  (registries, prose and JSON comments do not count as readers — `voice-review.csv` sat
  named in a registry while read by nothing); a GENERATED file whose regen tool never names
  it; two claims to one fact, including a fact's forbidden shape appearing inside a
  different fact's owner; a HISTORY count over its ceiling — or a ceiling KEY missing from
  the baseline, because `history > undefined` is false and that is a ceiling that silently
  stopped existing; and a TOMBSTONE path that exists at all, tracked or not — the deleted
  review sheet's writer built its path from pieces no grep for the name could find, and
  would have resurrected it into the precache on the next render.
- **Born red on the real thing.** The fact rules were run against HEAD before the
  2026-08-15 pointer fixes and produced seven true hits: README's bank paragraph (twice —
  both shapes), README's privacy absolute (twice), README's claim that a red gauntlet is
  what blocks a change, AGENTS' E7 paraphrase, and AGENTS' stale gate count. The same proof
  shape as `tools/mic-absence.mjs`: the detector was seen red on real data before its
  fixtures existed. This bullet first QUOTED the gauntlet-blocks phrase verbatim, and the
  gate's first live catch was its own specification — refused in `npm run check` until the
  quote became a description, which is the rule working on the person who wrote it.
- **Exemptions are declared, argued and controlled**, never implied: logs keep their dated
  numbers (owner-ruled 2026-08-14), and `docs/open-faults.md` quotes wrong sentences
  because quoting faults is its job. A control proves each exemption stays exempt and a
  control proves the exemption is not wider than declared.
- **What it cannot see, stated plainly:** a paragraph describing old behaviour in fresh
  words. That is fault F3, which stays open. The fact families grow one bite at a time, the
  way doc-truth's rules did, each carrying the incident that earned it.
- **HISTORY is a ceiling, not a floor.** The only declaration that legitimises a file with
  no reader is HISTORY with a written reason, and its count is capped by
  `filemap_history_max` (1) — a ceiling only the owner moves (E6). Today's one:
  `docs/voice-goldens-packs1-3.json`, whose 11-of-57 recipe disagreements make it a trap if
  read as live.
- Keys: `g23_declared` (60), `g23_facts` (4), `g23_controls` (40), problems capped at 0,
  ceiling `filemap_history_max` (1).
- Run: `node tools/file-map.mjs --check` and `--self-test`; both are in `npm run check`.

## G11b. The derived source lists — a scan cannot lose a file

Built 2026-08-17, owner-ruled ("also C for rot protection"). Three gates each kept a
hand-written list of app files to scan — the copy gate, the S6 no-network scan in
`tests/safety.test.js`, and doc-truth — and all three had drifted the same way: a screen
was added and none of them learned about it. `BuildItScreen.jsx` was missing from all
three, and `SentenceStage.jsx` had been missing from the copy gate since the sentence stage
shipped. The same omission three times says the list is the fault, not the people keeping
it.

The lists are now DERIVED from the tree by `tools/app-sources.mjs`. A new file under
`app/src` is scanned from the moment it exists; staying out takes a written exclusion with
a reason, which is an owner-visible diff. The S6 scan excludes nothing at all — it asks
whether ANY file reaches the network, so no file may sit outside it, and the two files
entitled to a request keep their scoped allowance at the call site. Adding the derivation
took the network scan from 11 files to 26, with no violations found.

- Tool: `tools/app-sources.mjs`. Command: `node tools/app-sources.mjs && node tools/app-sources.mjs --self-test`.
- Key: `g11_source_controls` (7).
- Controls: seven, and two matter most — a new file must be in by default, which is the
  fault this replaces, and an exclusion naming a file that no longer exists must be
  reported, because a stale exclusion tells a reader something deliberate is happening
  when nothing is. The set carries an anti-vacuity control: a stub that filters nothing
  must FAIL the exclusion case.
- Limit: it knows which files exist, never whether a scan is the right scan for them. An
  exclusion with a bad reason still excludes.

## G25. Safety cover — which rule has no executable proof

Built 2026-08-17, owner-approved. Until it existed, no command could answer the question
this gate is named for. Safety rules S1 to S9 were enforced by tests spread over eleven
files plus careful human reading, and open-faults L records what that costs: S9 lived
without a gate until somebody happened to notice, and the noticing was luck rather than a
system.

**The relation lives in one place.** `tools/effect-declarations.mjs` already said, in
prose, what every test file protects — "Safety rules S1-S7", "SPEC section 5 and S5". A
range cannot be computed, so each declaration now also carries a machine-readable field
naming the rule and how it is proved: `unit` runs the code that implements the fact,
`source` reads source text, `observed` watches a real browser. The gate reads that field.
A second table of what proves each rule would drift from the first within a week, which is
the fault `tools/file-map.mjs` names in its own header.

**What it refuses.** A rule with no proof at all — the fault-L detector, which makes a
tenth safety rule unaddable without something that proves it. A proof naming a file that
does not exist, because a renamed test silently stops proving anything. A proof running
under a gate no scheduled step runs, read from the gauntlet's own `REQUIRED_GATES`: that is
the G22 shape from open-faults C4, where a detector nobody runs looks exactly like
protection. And a run that parses fewer rules than its floor, because a gate whose anchor
has moved reports "0 of 0 uncovered" and passes — doc-truth learned that on 2026-08-15.

**What it reports under a ceiling instead.** Two debts, each at today's honest number so
neither can grow quietly. `g25_source_only_max (1)` counts rules whose every proof reads
source: today that is S9 alone, and for S9 a source scan IS the real proof, which is why
this reports rather than refuses. `g25_unobserved_max (6)` counts rules no browser has ever
seen: today S1, S2, S3, S4, S8 and S9. S8 is the sharpest of them — "multi-letter units
always show as one tile" is a claim about a rendered screen, and every proof of it is
engine-level. A ceiling only falls.

**What it cannot do.** It reads declarations, not behaviour. It proves that something
claims to prove a rule, never that the claim is true — the test itself does that, and only
a person can say the rule is the right rule. A proof nobody declared is invisible to it,
which is why every number here is a floor rather than an equality.

- Tool: `tools/safety-cover.mjs`. Command: `node tools/safety-cover.mjs && node tools/safety-cover.mjs --self-test`.
- Keys: `g25_rules (9)`, `g25_proofs (33)`, `g25_controls (12)`, `g25_source_only_max (1)`, `g25_unobserved_max (6)`.
- Controls: twelve, and the important one is that the six planted faults run through a
  parameterised detector, so the same cases can be put to a stub that always reports
  nothing. It must answer none of them. Two controls in this repository once passed with
  their detector removed; this is the shape that catches that.

## G24. The S9 gate — no tracked file contains a personal name

Built 2026-08-15 from open-faults L. S9 was the one safety rule with no gate, and the cost
is on the record: a child's name entered four tracked files in six places — one of them a
TEST NAME that printed it into every CI log — the repository is public, and every gate
stayed green for a day. It was found by a review auditing something else, because a human
happened to read the output.

- **The list lives OUTSIDE the repository, and that is the rule's own logic**: a public
  repo holding the list of names that must never be public would BE the leak. Names come
  from `private/s9-names.txt` (one per line; `private/` has been gitignored since the
  repository's first day) merged with the `S9_NAMES` environment variable. The gate
  reports how many names it loaded, never what they are; a name appears only in the
  failure line on the screen of whoever ran the scan, where it must, or nothing can be
  fixed.
- **A run without a list says so instead of implying protection.** On CI, where the list
  cannot exist, only the structural controls run and the summary reads "0 names loaded";
  the live scan runs where the owner keeps the list. Claiming otherwise would be the C3
  fault — safety resting on a check that does not run where the claim is read.
- **Matching**: whole words, case-insensitive, across every tracked text file including
  the generated ones. A camel-glued identifier (`nameScore`) is a hit — an identifier was
  one of the incident's six landings — while "cannot" and "skimming" are not hits for the
  short names inside them, and a name under three characters is refused as configuration
  rather than matched into noise. The regex deliberately carries no `/i` flag: `/i` makes
  character classes case-insensitive too, which silently killed the camel-glue catch in
  the first version and was caught by its own control.
- **Fixtures hold no real name** — every control plants "Placeholderkid" or draws a name
  from the committed public list AT RUN TIME, because a scanner whose own fixture is a
  child's name is the fault it guards against (open-faults L, verbatim), and because this
  tool is itself tracked and scanned: a literal stranger in a fixture fails the very gate
  it tests, which its first version proved five times over.
- **The VOCABULARY layer (owner-ruled 2026-08-15: "no name ever appears", with no list of
  names).** Deny by default: every capitalized token whose lowercase form the tree does
  not know must be in `tools/s9-vocab.json` — the known vocabulary, seeded from the
  scrub-verified tree — or the build fails. A personal name nobody thought to list is
  exactly such a stranger. Growing the vocabulary is an owner-visible diff, G17's shape.
  Stated limit, pinned by a control: a name written all-lowercase slips this layer.
- **The COMMON-NAMES layer (owner-proposed the same day).** The US registry's top names of the last century PLUS the top 200 of each sex for
  every decade from the 1970s through the 2020s, uniques kept (owner-refined the same
  day) — the child's generation and the parents' — committed openly — public data names no real person — and
  scanned like a denylist: whole-word, case-insensitive, camel-glued identifiers, so a
  common name written in LOWERCASE is caught, which is the vocabulary layer's pinned
  blind spot. Names colliding with repository language are excluded in the file itself,
  with reasons, or the gate would cry wolf on the bank's own words. Machinery (lockfiles)
  is outside this layer: integrity hashes spell every three-letter name eventually, and
  one did on the first live run.
- **The adoption report caught a real leak before the layer was even wired**: filtering
  the registry against repository language surfaced the owner's own given name, sitting
  in a fault entry's literal machine path — public for a day, written by the same agent
  that built the gate. The tree is redacted; the history side is folded into the pending
  section-O rewrite. A gate finding its own author is the system working.
- **The PAIR rule (owner-proposed 2026-08-15, refined the same hour).** The census
  top-1000 surnames, committed openly and never scanned alone: a common FIRST name
  immediately beside one — either order, comma tolerated, same line — is a full person's
  name and fails the build. It resurrects the first names excluded as repository
  language: a language-word first passes alone and fails beside a surname. Its first live
  sweep taught it the precision cut its controls now pin: the bank's own Level 7 list
  runs "king" beside "long" and ordinary prose keeps "a short grace window" — both
  halves repository language is the tree talking, one stranger half is a person. The
  stated residue: someone named entirely in repository words is skipped here, exactly as
  each half already was by the single-word layers.
- Keys: `g24_files` (266), `g24_controls` (47), `g24_vocab` (210), `g24_common` (888),
  `g24_common` moved 889 to 888 on 2026-08-19, owner-ruled on the `Hope` precedent of
  2026-08-16: **Joy** is an ordinary English word that is also a given name, and it
  appears in a listening round's carrier phrase. The alternative was rewording a record
  of what was actually offered, which would falsify it. Only the owner moves a floor
  downward (E6), and both times it has moved it was this same collision.
  `g24_surnames` (1000), problems capped at 0.
- Run: `node tools/s9-names.mjs` and `--self-test`; both are in `npm run check`.

## G14. Update system

The app must never change itself while a child is playing, and must never keep running a
version it has already replaced (SPEC section 7a).

- `tests/updates.test.js` drives the real update module against a scripted service-worker
  registration: the version check makes exactly one same-origin, cache-bypassing request and
  reports honest states; applying activates only a WAITING worker, and only through the
  consent message; a late state change after the answer can never activate anything; and the
  module can never touch saved progress.
- Source tripwires pin the generated worker: no `skipWaiting` at install, the consent
  message only, and the version file excluded from the precache and never intercepted.
- `tests/serviceworker.test.js` drives the worker itself. Its source is `app/sw-template.js`;
  the build fills in the cache name and the precache list and writes `dist/sw.js`, so the
  shipped worker is a file a test can load. The tests install doubles for `caches` and
  `fetch` and dispatch real fetch events: the app's own page comes from the cache and opens
  offline, any OTHER page in the same folder goes to the network and is never given the app's
  page, that page falls back offline to its own cached copy, clips are served from the cache
  with a miss going to the network, and the version check is never intercepted.
- The second of those comes from a reported fault: a diagnostic page served from the app's
  folder came up blank on a phone, because the worker answered every navigation in its scope
  with the app's `index.html`, whose assets are addressed relative to the page.
- Negative control: each tripwire is asserted against a fixture carrying the fault, and
  removing the scope check makes the navigation tests fail.
- Baseline floors: `g14_update_tests` (18) and `g14_worker_tests` (5).

## G15. RETIRED 2026-08-12 — recognizer contract

The gate was the speech recogniser's contract: every event a browser can emit fired at a live
attempt, and the whole alphabet fired again at an abandoned one. 51 tests in
`tests/recognizer.test.js`. It went with the child-facing microphone, removed on the owner's
safety ruling of 2026-08-11 because recognition sends a child's voice to a third party.

The floor `g15_recognizer_tests` (51) moved to the `_retired` block of
`.claude/gate-baseline.json` rather than being deleted, with its last value, the date and the
reason, so nobody can later mistake a retirement for a floor lowered to pass a build. The
counter in `tools/gauntlet.mjs` went in the same commit; leaving it would have made the
gauntlet look for a file that is not there.

One thing retired with it and should be said plainly: G15's own negative control — a fired
event with no handler must leave the screen identical — cannot be ported anywhere. It needed
a recogniser to fire at. E5's guarantee for this gate ends here rather than moving.

Replacing it, in `tests/safety.test.js` and `tools/mic-absence.mjs`: S1's adult-only rule was
one clause of two and is now absolute — no automatic path records anything at all — and a
three-part detector proves the microphone is absent from the source, from the built bundle,
and from a real browser driven through a whole session.

## G22. Microphone absence

- Tool: `tools/mic-absence.mjs`. Command: `node tools/mic-absence.mjs`. Three checks, and the
  strongest is last: the terms appear in no tracked source file; they appear in nothing the
  build ships; and a real Chromium, driven through a whole graded session and the Grown-ups
  corner, never reaches a recogniser constructor or `getUserMedia`.
- The runtime check does not read source. It replaces the browser's own constructors through
  `addInitScript` before any app script runs, and reports what the app touched. Source can lie
  by indirection — `window["Speech" + "Recognition"]` defeats every grep and cannot defeat
  the trap.
- Negative control, and the reason this tool was written BEFORE the deletion rather than
  after: run at commit `6699d22`, the last commit with the microphone still in, all three
  checks report RED — 29 source hits, 6 bundle hits including a diagnostic page under
  `app/public` that a scan of `app/src` would never have seen, and the running app reaching
  `SpeechRecognition` during a graded word. That commit is the control, it exists exactly
  once, and a detector written after its subject is gone has never been shown to look at
  anything. The tool also carries `--self-test`: a planted recogniser is caught, a capture
  device open is caught, and the render-time ASR and the G21 listening page are proven NOT to
  be its subject.
- The summary line names only the checks that actually ran. A `--runtime`-only pass that said
  "nothing shipped" would be a detector lying about its own coverage.
- The allowlist is empty and prints on every run. The family voice-pack recorder will open a
  capture device legitimately when it ships; its files go in the allowlist by name, with a
  date and a reason, because an allowlist that grows quietly is how a detector stops
  detecting.

## G16. Doc truth

A document that promises behaviour the code does not have is a defect. QA step 32 once
promised a fallback the code never performed; G12 counted the step and saw nothing wrong.

- `tools/doc-truth.mjs` binds words to code. Five of its nine rules: every child-facing sentence
  quoted in SPEC section 8 exists verbatim in the app; every quoted sentence in the manual QA
  script exists verbatim in the app or the engine; the timings the documents name in words
  match the constants (the 8-second watchdog, the 2-second grace, and the "about 10 seconds"
  a tester is told to expect); the hold gesture the documents name matches the control's
  timer; and the voice-pack recipe SPEC names — the voice, the word speed, and the bit rate —
  matches the recipe inside the shipped pack.
- That recipe rule comes from a real drift: SPEC named speed 0.7 for weeks after the pack moved
  to 0.85. A reader cannot hear a manifest, and G13 cannot read prose.
- Expected values are read out of the documents, never hard-coded here, so a sentence added
  to SPEC is checked from the moment it is written.
- The ninth rule is the orphan rule, owner-ruled 2026-08-13: every tool a governing document
  tells an agent to run must still be named in every document that names it, and must still be
  wired into the command that runs its controls. It exists because an agent resuming after a
  context compaction knows only what the governing documents say. A tool dropped from
  `AGENTS.md` by a later tidy-up has stopped existing for every agent after that, however
  green its own controls are; and a tool dropped from `npm run check` can go wrong and stay
  green. `tools/blast-radius.mjs` and `tools/mutants.mjs` are covered today. The rule found a
  real gap the moment it was written: `README.md` did not name the lookup at all.
- Negative control: `--self-test` rewords a SPEC sentence, rewords a QA promise, changes a
  timing, changes the hold constant, leaves a stale speed in SPEC, takes the lookup's name out
  of `AGENTS.md`, and takes its controls out of `npm run check`; every detector must fire.
- Baseline floor: `g16_doc_rules` (12). Rule 12 (art step 1, 2026-08-22) binds the art
  bible's section 11 state table — `| state | selector | tokens |` — to the stylesheet:
  every selector must exist in `app/src/wq-css.js` and in the reference build's copy
  (the sentence-word rule and the sound-out keyframes are app-only, and the rule says
  which), and each block must name every token its row lists as `${C.token}` or
  `${alpha(C.token, …)}`; the block reader is brace-aware, since `${C.ink}` carries a
  brace of its own. Fewer than 8 rows is a moved anchor. Prose cells are not bound. Four
  plants: a token the block lacks, a selector the sheet lacks, a moved anchor, a reference
  copy that drifted from the app's.

### E11 lookup-mutants — the controls of the lookup, not a gate

- `tools/blast-radius-mutants.mjs` plants faults in a scratch COPY of
  `tools/blast-radius.mjs` and requires the lookup's own controls to catch every one. It
  carries no G number deliberately: G22 is this repository's cautionary tale about a number
  written into a document before the gate existed.
- It is here rather than in `npm run check` because of its cost: "about thirty seconds" when
  this line was written, 14 min 4 s in run 15 on 2026-08-22 (41 per cent of the gauntlet -
  the first instrumented run's first finding). Each of its 65 self-test passes (the baseline
  and 64 faults) re-runs itself once nested for the git-hook control, 9 s a pass against 3.9
  without. So the fault loop runs the self-test with `--bail` - stop after the first control
  group with a failure, which for a caught fault skips the nested re-run - and the baseline
  runs whole, as does `npm run check`. A bailed run names itself in its summary line. The
  first fault is run both ways as the flag's own control: the verdicts must agree and the
  whole run must be the slower, or the gate fails. Measured standalone on 2026-08-22, same tree, back to back: 13 min 30 s whole, 6 min 1 s bailed, 63 killed and 1 equivalent both times; three planted hook faults recurse to their timeout either way and set the floor.
- Baseline floors: `e11_lookup_controls` (97), `e11_lookup_mutants` (64). Ceilings:
  `e11_lookup_survivors_max` (0), `e11_lookup_anchors_max` (0), `e11_lookup_equivalent_max` (1). A survivor means some part of
  the lookup can be wrong while every control stays green. A moved anchor means a planted
  fault no longer applies to the code and has been proving nothing.
- It runs a baseline first and refuses to report anything if the unmutated lookup does not
  pass its own controls — otherwise every fault would "die" against an already-red test. That
  baseline runs under a deliberately hostile global gitignore (one that hides `.claude/` and
  `*.mp3`, as a developer's own commonly does), because the sandbox has to force those paths
  in and a control that only fails on somebody else's machine is a control nobody has.
- Why the faults look the way they do: the first harness, written on 2026-08-13, planted
  fifteen faults that were the one-for-one inverse of the fix list written the same hour, all
  of them total breakage. All fifteen died, which proved the controls were wired and said
  nothing about whether they were sensitive. An auditor then planted thirty-two of its own —
  partial, off-by-one, wrong-but-plausible — and twenty-four survived. The faults here are
  that second kind, and several are that auditor's. A second confirm round planted fifteen
  more against the newly added layer and eleven survived; those eleven are here too.
- A fault that CANNOT be killed, because the code it changes makes no observable difference,
  is reported as `EQUIVALENT` with the reason written beside it, and is never deleted (E3).
  One exists today: the sandbox subprocess helper scrubs git's environment variables a second
  time, which nothing can detect while every sandbox is still built through the scrubbing
  helper. It is defence in depth and stops being equivalent the moment that stops being true.
  The `e11_lookup_equivalent_max` ceiling is what stops this becoming a way to retire an
  inconvenient fault: raising it needs the owner, like any ceiling (E6). The gauntlet step also
  requires that fault's reason string by name, so the single slot cannot be moved to a
  different fault with every count unchanged.
- What "0 survived" means, exactly: no KNOWN fault survives. It is not a completeness claim,
  and every round of auditing so far has found faults the previous round's harness did not
  contain.
- It never writes to the working tree, and says so at the end of every run. The first harness
  mutated the live file forty-two times; kill it between two writes and a mutant is left in
  the repository, which has happened three times here by other routes (open-faults C2).

## G16b. Ledger truth

G16 asks whether the documents match the CODE. This asks whether they match what a PERSON
approved, and until 2026-08-13 nothing did.

`tools/doc-truth.mjs` reads twelve files. `tools/pending-sounds/pending-sounds.json` is not
one of them, so a document could say a sound had never been heard while the owner's verdict
for that exact sound sat in a ledger, and no gate anywhere would notice. Three documents did
exactly that about `d:long_o`, which the owner graded **perfect** in sound round SND5 on
2026-08-10. Three approved words — `go`, `no`, `so` — were called blocked on a listening
round that had already happened, and the claim reached a published release note. The owner
found it by remembering, which is the mechanism these gates exist to replace.

- **The direction is the point.** A sound shipping that nobody approved is the loud fault
  every gate already watches for, and it has never happened — all 37 shipping sounds carry a
  verdict. This is the quiet one: an approval that exists and is not believed. Nothing goes
  red, no child hears anything wrong, and the work simply never gets done.
- **Five rules.** No document calls a sound unheard when a ledger heard it; every shipping
  sound carries an approval; the two sound ledgers do not contradict each other; a sound
  called parked must genuinely not ship; and — added 2026-08-14 — a shipping sound may not
  rest on the ARCHIVE ledger alone.
- **Rule 5, and why the two ledgers are not peers.** `tools/voice-sounds.csv` is not a second
  ledger of the shipping voice. Measured on 2026-08-14: 26 of its 38 rows are sourced
  `superseded_by_synthesis` and record cuts from recordings of the owner's own voice, which
  the owner ruled on 2026-08-11 would never ship and whose source files left the repository.
  Of the 32 sounds both files name, exactly **one** shares a sha256. It is an archive beside
  a live ledger. Because rule 2 accepts an approval from EITHER, a clip could otherwise ship
  carrying only the blessing of a row describing audio that is not the audio playing — the
  trap `docs/settled.md` records a reviewer already falling into. True for all 38 shipping
  sounds today, so rule 5 guards a regression rather than reporting a fault.
- **The claim-detecting phrases are deliberately narrow.** A wide list catches "`long_o` did
  not come back, because nothing needed it" — a true sentence about SHIPPING, not about
  hearing — and a gate that cries wolf is a gate somebody switches off.
- **A short sound name must be written unambiguously.** Ten sounds are named by one or two
  letters. The gate's own first run reported that the word "or" in "rendered OR heard by
  anyone" named the sound `or`, and that the article "a" named the schwa. A name of three
  characters or fewer now counts only as `d:a`, `d-a.mp3`, or in backticks. Both false
  positives are controls.
- **Its CSV parser was wrong and its own run caught it.** A naive split on commas shifted
  every column after `oo_moon`'s `"moon, food, boot"` cell, so the gate read the wrong cell as
  a verdict and reported a contradiction that did not exist. A gate that mis-parses its
  evidence lies confidently. That row is now a control.
- Keys: `g16b_sounds` (58) and `g16b_controls` (33), problems capped at 0.

## Aggregation

- `npm run gauntlet` first regenerates `src/engine.js` with the extractor. Every new script
  that needs the engine chains the extractor itself; the npm `pretest` hook covers `npm test`
  only.
- It then runs, in order: G11, G1+G2+G9+G10+G14+G15 (one Vitest run), G3 regeneration check,
  G4, G5, G19 app mutation, G6 coverage and quality, build, G7, G8, G18 network, G21
  listening page, G16 doc
  truth, G12 structure check, G13 voice pack, G20 effect map, G17 governing files, and the
  baseline comparison.
- The runner is `tools/gauntlet.mjs`. Run `npm run gauntlet`. The runner takes a lock, so two
  gauntlets cannot race each other over the generated files.
- CI: `.github/workflows/gauntlet.yml` runs the same command when a release's `v*` tag is
  pushed, and on demand from the Actions tab. It does not run on ordinary pushes or on pull
  requests: the owner's 2026-08-02 cadence is the local `npm run check` between releases and
  the full gauntlet at one.
- The gauntlet prints one line per gate: name, command, pass or fail, and the counts.
- Bootstrap: the floor for a gate that is not built yet starts at 0. Raise it in the same
  commit that lands the gate. A landed gate never keeps a 0 floor.

### Named checks, and the gates that must run

- The floors COUNT results. A count cannot tell a deletion from a swap: remove one check,
  add an easier one, and the total is unchanged while the protection is gone. So a gate may
  also declare the checks it must produce BY NAME, and a name that stops appearing fails the
  build even when every number still passes. G7, G18 and G19 carry named lists today.
- `REQUIRED_GATES` in the runner is the same idea one level up: every gate that must have
  run. A gauntlet that skipped one reports INCOMPLETE instead of a smaller, greener total.
- Both mechanisms carry inline controls: a missing name must be caught and a present one
  must pass; the required-gate list must notice an absent gate.

### Release evidence

- The gauntlet writes `.gauntlet-evidence.json` (untracked — it is evidence of one run, not
  a source file). It records the commit, whether the working tree was dirty when the gates
  ran, a hash over the built payload in `app/dist`, the node and browser identity, every
  gate with its counts and bounds, the gates that did not run, and an overall status of
  PASS, FAIL or INCOMPLETE.
- Why: a printed summary is read once and then gone, so "publish only what was certified"
  rested on memory. The payload hash and commit bind a green result to the exact bytes it
  certified; `dirty: true` marks a run whose tree did not match its commit, which certifies
  nothing. A change to production code, content or the built payload after a green run
  invalidates it — cut a fresh one.
- The file also carries the residual risks no gate can close: device proof and spoken-word
  quality are human (G12, G13).

## G13b. Voice-pack speech edges

### What it protects

The sound-out reveal's 500 ms pause is a gap between one SOUND and the next, not between two
files. Every clip carries a different amount of its own silence — the shipped pack runs 40 to
290 ms in front and 0 to 608 ms behind — so a pause measured file to file would give gaps from
540 ms to over a second, and the rhythm a child hears would not be the one the owner approved.
The player therefore reads each clip's speech edges out of the manifest, and outlines each tile
at the instant its sound starts rather than when its file starts.

A manifest can state those edges wrongly and nothing else would notice: every file is present,
the right size, and the right length. The reveal would simply play to a rhythm nobody chose.

### How it works

- Tool: `tools/voice-edges.py`. `--write` measures every clip in the pack and records the
  result; `--check` re-measures from the audio and fails on any disagreement beyond one frame.
- The measurement is the same one the demo used: the silence before and after the run of audio
  louder than -45 dB relative to the clip's own peak, on 10 ms frames.
- It also refuses edges that leave no speech between them, which is how a clip of pure silence
  would otherwise satisfy every arithmetic check.
- Baseline floors: `g13_clips` and `g13_edge_controls` (5).

### Negative control

`--self-test` plants four faults into a copy of the manifest — a lead 200 ms longer than the
audio, a tail 200 ms shorter, a clip with no edges declared at all, and edges that leave no
speech between them — and the check must report every one. A fifth case is the control in the
other direction: the real pack, unchanged, must pass.

## G20. Effect map

- Tool: `tools/effect-map.mjs`. Writes `docs/effect-map.md`. Keys: `g20_tests_mapped` (449).
- One row per `it()` SITE — its file, suite, and the test's own sentence, which in this
  project IS the Given/When/Then effect, because tests are named as behaviour. A site inside
  a loop or a table runs many times, so the map's 310 rows describe the 324 tests Vitest executes;
  the map counts the places behaviour is asserted, not the executions. `--check` reconciles
  the rows against the `it()` sites in each file, so a call the parser cannot read fails the
  build instead of silently going unmapped.
  Per FILE it records the requirement protected, the independent oracle, the platform, the
  mutant family that attacks it, the evidence produced, and the known limits: what these
  tests do NOT prove.
- It is GENERATED, never hand-kept. A hand-written map of 284 tests starts lying the first
  time a test is renamed, and a document that lies is worse than none — "What counts as
  finished work" bans paperwork that guards nothing. The generator reads the real test
  files; `--check` fails when the committed map and the tree disagree, so a test with no row
  or a row for a test that no longer exists blocks the build.
- Negative control: `--self-test` proves an undeclared test file is reported and that the
  rendered map contains only real tests.
- The owner ruled for the full map on 2026-08-10, over a recommendation for a leaner
  version; generating it is how it stays true.
- Run: `node tools/effect-map.mjs` (write), `--check` (verify), `--self-test` (control).

## G21. Listening page

- Tool: `tests/ui/listening-page.mjs`. Keys: `g21_listening_checks` (5), failures max 0.
- Every listening verdict this project owns reached it through a round page, and on
  2026-08-11 a page threw one away: the owner marked all seventeen words of batch 12,
  pressed "Copy all answers", and lost the lot. `navigator.clipboard` is blocked inside an
  embedded viewer so the write rejected, and the fallback revealed a textarea parked at the
  bottom of a 2400 KB document — below the fold, invisible from the sticky footer. Nothing
  in the gauntlet noticed, because nothing drove the page.
- This gate builds a real page from a real batch with `tools/build_page.py`, drives it in
  Chromium with the clipboard DENIED and `alert()` made to throw, and proves the answers
  come back anyway: shown ON SCREEN where the reader is standing (measured against the
  viewport, not merely `display: block`), carrying the verdict, the chosen arm and the
  comment, for a word card and a sentence card alike — and still there after the tab is
  reloaded.
- Negative controls (E5): one page has its export box parked off screen and must be caught
  by the viewport check; another has saving removed and must be caught by the reload check.
  Without them a gate that only ever meets the fixed page proves nothing.
- What it does NOT prove: that the audio sounds right, or that a candidate is the word.
  That is G13 and the owner's ear. This gate only promises that what the ear decides
  survives the trip back.
- Run: `npm run test:listening`.
