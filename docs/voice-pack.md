# The default voice pack

**This document owns** the voice pack as SHIPPED: what is in it, what is approved and
waiting for a level, and the history of the rounds that produced it.
**It does not own** the per-word recipe or byte pin — those are `tools/voice-words.csv`
and the files generated from it — nor the per-sound verdict, which is
`tools/pending-sounds/pending-sounds.json`. Where this document and a ledger disagree, the
ledger is right and gate G16b says so.
**This is a log**, searched rather than read. It records every listening round in order and
will keep growing for as long as the voice does — owner-ruled 2026-08-14, the same way a
JSON ledger grows. Its length is not a fault.

This document follows the Microsoft Writing Style Guide.

The app speaks through voice packs (SPEC section 5a). The default pack ships with the app in
`app/public/voice/`: one mp3 clip for every bank word, the carrier stems, the praise
sentences, the invitation leads, and the session-end lines, plus `manifest.json` with each
clip's file and duration. Gate G13 fails the build when the pack does not cover the engine's
clip inventory, so the bank can never grow past its voice.

## "a" ships, from the owner's own schwa package (2026-08-12)

`w:a` and `d:schwa_a` are the same 743 ms file: 363 ms of af_heart schwa with the pack's
80/300 ms padding, turned down 4.8 dB to the level of the schwa already in the game, encoded
at 96 kbps. Hash `d3fc66cc`. The owner graded those exact bytes on the listening page
(arm 2·3), and the reveal shape — word, "Pronounced:", the sound, the word again, all the
same recording — beside "to" as a reference.

It is the only word in the bank with ONE tile, and the only one whose system-speech fallback
is not the word itself: `TTS_UNSAFE_WORD` sends "uh" instead, because a synthesiser handed
"a" says the letter's name and S4 forbids that. `d:schwa` is untouched; the owner ruled that
the schwa inside "the" stays as it is.

## The `v` was re-cut, and every /v/ word changed with it (2026-08-12)

**Corrected the same evening: the softened v is “of”'s alone.** The paragraph below described
a bank-wide replacement, which is what shipped for about an hour. `d:v` is back to SND16's
clip for van, vet, vat and vex — where it was graded perfect and sits within 0.7 dB of its
neighbours — and the softened clip ships as `d:v_soft`, which only "of" asks for. What follows
is the story of the round, which is unchanged.

`of` ended a three-round chase, and what it changed was not only `of`. The shipped `d:v` —
SND16's clip, graded **perfect (owner)** on 2026-08-11 but graded ALONE — measured
**6.2 dB louder and 400 Hz brighter** than the vowel standing next to it in "of". The owner
heard that as shouting before any of it was measured. (An earlier version of this paragraph
said the clip was "pitched up six semitones, graded ok": that describes the owner's own
recording, superseded and deleted on 2026-08-11, not the clip that shipped. Corrected the
same day.)

The clip now in the pack is that same clip made quieter and rounder by measured amounts:
gain −7 dB, one-pole low-pass at 1800 Hz, re-peaked to −3.5 dBFS, 40 ms fades, then the
pack's own 80/300 ms padding. Its hash is `0489d6c0`; `tools/build_of_round.py --ship`
reproduces it and refuses to write anything unless the source and the result both hash to
the values recorded there. A rebuild needs the old clip **and its manifest edges** restored
from `403b237`, because the recipe cuts the body at the edges the manifest declares. **Only "of" takes the new clip.** It went bank-wide for about an hour on
2026-08-12 and the owner ruled it back the same evening: van, vet, vat and vex keep `d:v`,
where it was graded perfect and sits within 0.7 dB of its neighbours, and the softened clip
ships as `d:v_soft` for the one word whose company it was tuned for.

## The 32 sounds are in the pack (2026-08-11)

`tools/ship-sounds.py` puts the approved sounds into `app/public/voice/`. The engine decides
which ones exist: `soundInventory()` walks the whole word bank, applies the tile map and the
tricky-word overrides, and returns exactly the ids the sound-out can ask for. A sound the
engine asks for and `tools/pending-sounds/` does not have is an error, never a silent
omission — a missing sound drops the whole reveal to system speech with nothing on screen to
say so.

Nothing is re-encoded. The file that ships is byte-for-byte the file the owner listened to,
checked against the sha in `tools/pending-sounds/pending-sounds.json` on every run, which is
what makes that sha mean anything. The pack now holds 405 clips: 349 words, 17 praise lines,
6 fixed sentences, "Pronounced:", and 32 sounds.

Three of the 32 are there because of the tricky-word ruling of 2026-08-06 and nothing else:
long e (she), schwa (the), and the book-oo (push, bush). The short o and the z-sound were
already in the pack and are reused, exactly as that ruling said they would be.

**Sound round 22 — judged 2026-08-11: the voiced th CLOSED, and the sound
inventory with it.** `this, that, then, them, the` — and `with`, under the
British-speech ruling of the same day — take /ð/, and the only th clip in the
pack was `th_quiet`, the voiceless /θ/ of "thin". Those six were being sounded
out with the wrong sound, and nothing failed, because `th_quiet` is a clip that
exists. Found by an audit of the reveal, not by a gate.

The round offered ten arms over three methods, round-robin by method so that
sorting by likeness to one reference could not hand every slot to a single
family — the mistake that wasted arms in rounds 12 and 13. The methods: cut
from the approved word clips (this, that, then, them, the), the tripled carrier
sentence, and the θ-against-ð contrast that closed /v/ against /f/.

The owner accepted **th_this_2, "perfect"** — the carrier-citation family,
210 ms of sound, sha `35abc474…`. The pack now holds 406 clips and 33 sounds,
and the sound inventory is complete again.

## The word table — the file a person edits

**`tools/voice-words.csv` is the permanent repository of the voice.** One row
per bank word — all 349, every one carrying a human verdict since 2026-08-05,
when the last 40 rows came home — and one column for every knob and decision that can apply to a word:
speed, voice, lead, tail, fade, explicit phoneme, period, onset trim, tail
trim, bright-head, head trim, carrier sentence, cut mode and its thresholds,
ASR pins with both guards, byte-pin sha, and the decision fields (locked,
verdict, ear notes, round, whether it was judged as a bare clip or in the app).
Every cell is explicit. For a row with no byte pin, the row alone reproduces
its clip through this repository's renderer. For a pinned row the pin is the
authority: the uplift rows (see below) were baked on the sidecar's own
environment and do not reproduce byte-for-byte here, so the pinned bytes the
owner heard are what ships, and G13 verifies each file against its pin.

After a listening round, edit the row and run `node tools/gen-voice-lock.mjs`.
That derives `keepers-treatments.json` (what the renderer and G13 read),
`keeper-bytes.json`, and `tools/voice-lock.json` — the machine-readable
aggregate that also carries the phoneme strings, encoder settings and
environment. G13 re-derives from the CSV on every run and fails the build on a
missing row, a derived file that was not regenerated, a shipped pack that
disagrees, or an unlocked word whose knobs deviate from the defaults — a
deviation nobody approved is exactly what this system exists to refuse.

The shipped pack also declares its own full recipe in `manifest.json`
(`__recipe`), including the per-word ASR guards whose absence from the keeper
handoff once cost a brute-force sweep, and the renderer refuses to overwrite a
byte-pinned word rather than replacing accepted audio with a render.

## The uplift pass (2026-08-06 to 2026-08-07) — every word now owner-perfect

- The owner and the sound sidecar re-ran blind listening rounds against every
  word that had shipped below "perfect": 212 words across five round families
  (UPLIFT-SWEEP 114, UPLIFT-EXPERIMENT 46, UPLIFT-HARD 35, UPLIFT-TONE 14,
  CARRIER-SPELL-PHASE 3), the owner's ear final on every one, and a word
  superseded only on a "perfect" verdict. All 349 words now carry "perfect".
- 209 words shipped new bytes. Three — check, limb and rich — kept their
  shipped bytes with the verdict upgraded on a fresh listen. 54 words gained
  their first byte pin; the table now pins 285 of 349.
- Customs, 2026-08-07: all 283 winner files in the handoff verified sha256
  against their rows' pins; the 87 winners shipped for untouched rows were
  byte-identical to the pack already shipped; sad and sat (pinned, no file in
  the handoff) matched the pack; every one of the 212 new winners decodes
  cleanly at word-scale durations (744 to 1488 ms). The 137 words already
  "perfect" were untouched, byte for byte.
- The uplift recipes do NOT rebake byte-for-byte through this repository's
  renderer: 0 of 212 reproduced. Probed words rebake to the same duration to
  the millisecond, so the drift is encoder- and runtime-level on the sidecar's
  bake environment, not different audio — and some winners' full recipes carry
  knobs (for example second_island) that exist only in the sidecar's recipe
  sidecars, not in the CSV columns. As with "let" before the uplift: the
  pinned bytes the owner heard govern, G13 verifies each file against its pin,
  and the CSV rows document provenance — verdict, round, family, date — not a
  build this repository can reproduce. The full sidecar recipes live in the
  sidecar workspace archive on the owner's PC
  (handoff `word-quest-uplift-handoff-2026-08-07T1438Z`).

## Approved and unshipped: 10 items with no level yet (through 2026-08-16)

Ten items are closed by the owner's ear and wait in `tools/pending-words/`
for the levels and the code that will hold them: **four words** — cans (flagged
to the waiting room by the owner's own roster ruling of 2026-08-16, the jugs
precedent) and the three two-syllable compounds (sunset, laptop, catnip),
which wait on the five-tile display ruling — and **six sentences**, named
below with the reason each is waiting. Every one is graded `perfect`; the
ledger names each with its round.

**Fifteen words left this list on 2026-08-16**: the fourteen plurals of
Level 21, Cats and Dogs, and romp into Level 19 — shipped by
`tools/ship-words.py` as the exact bytes of batches 6, 11, 12 and 14,
sha256-checked against the ledger pins before and after every copy. Twelve
Level 21 sentences shipped the same day from listening round 7, every one
graded perfect within hours of being rendered.

**The 2026-08-15 batch shipped the night it was heard.** The 10-and-10
curriculum's four listening rounds closed 55 winning sentences and the first
clip of the word **i** (arm C at sentence speed; its sound-out is the same
recording, one letter being one sound, on the word-"a" precedent). Fifty-three
sentences, the word clip and its sound `d:long_i_i` ship in the pack as the
exact bytes the owner heard, hash-verified against the ledger's pins. Two
renders never ship and their rows say so: each duplicated a sentence text
already shipped and screened under an older id, and the accepted clip is the
authority — the ledger marks both `superseded_by` with the shipped twin.
`docs/settled.md` holds the four rounds' full record.

**The last five heart words shipped on 2026-08-13**: `he`, `be`, `go`, `no` and
`so`, seated at Level 2 with the other eleven. The open-syllable roster is now
complete and `HEART_WAITING` in `tools/decodable.mjs` is empty for the first
time. `d:long_o` shipped with them — approved in sound round SND5 on 2026-08-10
and never copied into the pack until a word needed it. **Nothing here was
re-rendered and no verdict was revisited**; every clip went in as the exact
bytes the owner graded, sha256 checked before and after each copy.

**What is left is nineteen words that need a LEVEL that does not exist.** The
plural-s words want Level 12 and the compounds want Level 13, both unbuilt and
both owner-ruled roadmap items in SPEC section 12. They are not blocked on a
sound, an ear or a file — they are waiting on a level, which is a different
kind of waiting and is why they are named separately here.

**Eighty-eight sentences and the three invitation lines SHIPPED on 2026-08-13**,
into the eleven level lists in the engine. Every seat was computed by
`tools/decodable.mjs` and none was chosen by hand; every clip went in as the
exact bytes the owner graded, sha256 matched before and after the copy. The pack
went 501 clips to 592.

**The six that did not ship, and why.** Four run past the eight-word ceiling a
four-year-old can hold in one breath — `s:mode-b2-s15` and `s:mode-b2-s16` at
nine words, `s:mode-wm-wm05` at ten, `s:mode-wm-wm16` at nine. One,
`s:mode-wm-wm18`, is eleven words AND leans on "nip", which the bank never
teaches. They were approved as RECORDINGS, which is a different question from
whether a child can read them, and the eight-word rule is the one the shipped
batches settled on. The sixth is `s:sound-it-out` ("Let's sound it out."), the
reveal lead-in from batch 6: the reveal says "Pronounced:" today, and swapping
that line is a change to the word reveal, not the sentence one.

**"we" and "me" left this list on 2026-08-13**, seated at Level 2 with the other
heart words and shipped into the pack as the exact bytes the owner graded
`perfect` in batches 12 and 13. **"go" did not**, and the reason is a sound: its
`o` needs `d:long_o`, which does not ship. It is APPROVED — the owner graded it
`perfect` in sound round SND5 on 2026-08-10 — and it has simply never been copied
into the pack, because until `go` no word needed it. An earlier version of this
paragraph said nobody had ever heard it, which was wrong and cost `go`, `no` and
`so` three days each (`docs/open-faults.md` section K).

**Sentence batch 3 and the invitation lines, 2026-08-13.** Thirty-one sentences
across Levels 1 to 11, closing the per-level gaps batches 1 and 2 left, plus the
three lines the game says before it sounds out one word of a sentence
(SPEC section 12). Every one graded `perfect` by the owner the same evening,
and every sha256 in their verdicts matched the audio actually served, byte for
byte, before anything was written down.

Two things this round is worth remembering for:

`soundout-1` was rendered twice. The first take said "read" as in *reed* and the
owner marked it **no good** in one listen. That is the fault SPEC section 9
records from 2026-08-03, when the praise line "You read that word all by
yourself!" was replaced for exactly it, and `tools/voice-check.mjs` has refused
it ever since — but the render script went around the gate. The guard now lives
where the audio is made: a line containing a two-pronunciation word and no
explicit phonemes cannot be rendered at all. The second take carries
`juː ɹˈɛd`, and the phonemiser settled which pronunciation was which before a
person had to.

The decodability checker refused **nine of the thirty-two** drafts, and one word
explained six: **"we" is taught nowhere in the bank**, and neither are "go" or
"me" — though all three have approved audio waiting in this very list, which
makes them words with no level rather than words with no clip. Level 1 refused
three more, because it is twelve VC words with no function words at all. The
nine were rewritten from each level's own taught words, with the checker as the
arbiter rather than anyone's judgement.

**One sentence is not in this count.** `s32`, "Grab the twig and grin.", was
served and left unmarked, so it is not recorded, not shipped, and not approved.
It waits for an ear.

**Six heart words left this list on 2026-08-12**, and `the` and `and` moved
with them: every heart word now sits at **Level 2**, where sentence practice
begins, because the owner ruled that a heart word's level is where the CHILD
MEETS it rather than where its spelling would fall. `to`, `do`, `you`, `said`,
`my` and `of` shipped byte for byte by `tools/ship-words.py`. What had blocked them was never the owner's ear — every
clip had been graded `perfect` since 2026-08-07 — but the sound-out: left to
the general mapping, "to" and "do" would have taught a short o and "said" would
have taught four sounds. The owner heard each breakdown and passed it. `of`
took three more rounds of its own, because its `v` was measurably shouting;
see `docs/settled.md`.
Each is stored as the exact bytes the owner heard, with its family and hash, so
the day a word joins the bank it ships that clip and not a re-render.

The backlog stood at 156 on the morning of 2026-08-12 and this heading said
"60" — a number written once and never moved while the owner went on approving,
which made fourteen listening rounds of their own time read as five. It is now
bound to the ledger by the doc-truth gate (G16 rule 8) and cannot drift again.
**Eighty-three of those items shipped the same day**, when Levels 10 and 11 were
built to hold them: 54 final-blend words and 29 initial-blend words, each copied
byte for byte from `tools/pending-words/` by `tools/ship-words.py`, which
refuses any file that does not hash to the value recorded when the owner
approved it.

What is left is waiting on the levels and the mode that do not exist yet, not
on the owner: the plural-s words need Level 12, the compounds Level 13, the open
syllables Level 14, the heart words a place in the engine for a word taught by
sight, and the 41 sentences need sentence mode.

The sentence recordings are **one natural recording per sentence**, owner-ruled
2026-08-12 — not the sentence's word clips stitched together. A word said on its
own is a citation form, so a stitched sentence reads like a list. The cost of the
ruling is that every new sentence needs its own round and its own pin, exactly
as a word does.

**Confirmed by ear the same day, 8 of 8.** The ruling was first made from a
measurement, and the owner asked to hear it rather than read it — a ratio is not
a rhythm. `tools/compare_sentences.py` built both versions of eight sentences
from what the repository actually holds, and every one came back `natural`. The
stitch was given the best case it could have: each word cut back to its own
speech and butted straight together with no gap added, both sides carrying the
pack's standard 80 ms lead and 300 ms tail. It still lost every time.

The measured figure is **1.43 to 1.74 times the natural recording, median 1.72**.
An earlier note in this project said "about twice as long", which overstated it;
the direction was right and the number was not.

What the first batches taught, in order: a new word is always cut from a
carrier, never rendered plain; the crackle at the end is utterance-final creak
and is cured by position or by trimming the tail; a cut must be LOCATED by
template match, never guessed from a silence threshold; a candidate's CONTENT
must be verified before a person is asked to listen to it; and the front-trim
matters more than expected — all four of batch 4's winners were front-trimmed
clips. The register is a teacher's, addressing a class.

## The first thirteen (batch 1, historical)

Batch 1 of the new-word rounds went to the owner on 2026-08-07 and closed
thirteen words: **you, and, hand, land, sand, band, bend, pond, jump, lamp,
camp, bump, belt** — every one "perfect". They are unshipped for one reason
only: their levels do not exist yet (SPEC section 12). The exact bytes the
owner heard, their families and their hashes are in `tools/pending-words/`,
so the day each word joins the bank it ships the clip that was approved, not
a re-render. This entry exists because an approved result that lives nowhere
is a result this project loses — cup was lost that way for two days.

What the round also settled about the method: every one of the thirteen came
from a **carrier sentence**, none from a plain render, and the winners split
between the "Listen—{word}." and "The printed word is {word}." families at
both speeds. Seven words did not settle (of, to, do, said, my, milk, melt)
and went to a second round.

## Two more words settled, and the cutter rebuilt (batch 2 and 3, 2026-08-07)

Batch 2 closed **to** and **do** — "to" on the end-carrier at speed 1.0, "do"
on the same carrier with its creaky tail trimmed by 90 ms, which is the creak
repair below, chosen by ear. Both wait in `tools/pending-words/`.

Batch 2 also failed, usefully. The owner rejected the rest for two reasons,
and both are now rules. The cuts were wrong — "I can hear 'of red'" — because
a silence search cannot know where a word ends; `tools/wordcut.py` replaces it
with a template match (render the word alone, slide it over the carrier on
log-mel features, then walk at most 40 ms to a quiet edge) and every cut is
length-checked against the solo render. And the register was wrong: the owner
asked for a word spoken "in the style of a school teacher educating a
classroom", so every frame now addresses a class — which also keeps the word
away from the phrase-final position where the creak lives.

## The crackle at the end of a word — diagnosed 2026-08-07

The owner rejected several round-1 candidates for "crackling at the end", a
"zzzz" at the end, "a small crackle at the end". Measured against the clips
the same ear called perfect, the rejected ones carry irregular, widely spaced
glottal pulses in their last 120 ms. That is **utterance-final creak**: at the
end of a breath group the subglottal pressure falls and phonation turns
creaky. It is in the human speech the model was trained on, so the model
reproduces it — and every round-1 carrier put the target word LAST, so every
candidate inherited it. The repair is positional: a bracketed frame
("up—{word}—up.") leaves the word mid-phrase, where phonation stays modal,
and a throwaway word takes the creak. Trimming the creaky tail off a
known-good end-carrier clip is the second repair. Round 2 offers both.

A creak SCREEN was written and withdrawn the same hour: measured on round 1's
own results it would have refused sand_3 and and_6, which the owner called
perfect. That is this project's oldest lesson in its third form — duration
failed as a proxy twice, and irregularity fails as a third. Measurement may
refuse a clip that is inaudible or that is really a phrase; nothing else.
Listening is the only detector.

## How a listening round is presented — the standard (2026-08-07)

Every round, for a word, a sentence or a sound, goes to the owner as one
self-contained HTML page with the audio embedded, so it works offline and from
any folder. The tools are `render_batch.py` and `build_page.py` in the round
workspace; the page is the only thing the owner ever has to open.

- **Twenty items to a batch.** More than that and a round stops being a
  sitting. The batch is named in the page's heading and repeated in the export,
  so an answer can never be filed against the wrong round.
- **A word gets several candidates, a sentence gets one clip.** Words are the
  hard problem, so each is offered as up to eight arms — the plain render at
  both speeds and the carrier-cut families the bank actually won on — with
  blind labels (`hand_1`, `hand_2`), one click to a play. Sentences are usually
  right, so each gets a single play and a **perfect / needs work** pair.
- **Every card takes exactly one verdict**, and the page shows what it recorded
  under each card: for a word, **accept, perfect** on one arm, or **closest,
  but not right** on the nearest arm (which seeds the next round), or **none
  are right**; for a sentence, **perfect** or **needs work**. Every card has an
  optional comment box for what is wrong in the owner's own words.
- **A copy-all button at the foot** writes one line per item —
  `item | verdict | arm | comment` — to the clipboard and to a visible box as a
  fallback, so the whole round comes back as one paste.
- **A SOUND card states its criteria before its options.** Every sound in a
  round shows, above the arms, how it should sound and what disqualifies a
  candidate ("Should sound like: a t-click snapping into shush, one sound" /
  "Reject if: it splits into t + sh, a letter name, an uh-tail"). A listener
  must not have to hold the standard in their head while judging twelve clips
  against it. The wording comes from the sound's own recipe where one exists.
- **The audio rules are settled ones, not preferences.** Clips play through one
  shared WebAudio context with pre-decoded buffers, because a per-tap `Audio`
  element is throttled in embedded viewers — that cost this project two rounds.
  Sub-second clips are padded and peak-lifted. And the renderer refuses to
  build a round at all if any clip measures under 250 ms or too quiet to judge:
  no round ships without that audit.
- **A carrier candidate that keeps more than 60 percent of its carrier is
  dropped before the owner sees it**, because it is a phrase, not a word. Round
  8 offered a listener two identical files and round 10 offered whole
  sentences; neither may recur.

- **Every delivery carries the running tally** (owner's instruction,
  2026-08-10): when a batch goes to the owner, state done and left-to-do as
  plain numbers for sounds, words, and sentences, so one glance shows how far
  the campaign is. The owning files are the source — `tools/voice-sounds.csv`
  plus `tools/pending-sounds/` for sounds, `tools/voice-words.csv` plus
  `tools/pending-words/` for words and sentences.

The owner's ear is final, and the page is only the way the ear is asked. A
winner becomes a row in `tools/voice-words.csv` — with its family, round and
byte pin — only after the answer comes back.

## Batch 8 — judged 2026-08-10, and the blob it exposed

One verdict landed: **"Pronounced:" is perfect** (arm `s:pronounced_10`,
family in_sentence2 — the word inside a natural sentence, cut out; eleven
styled ideas lost to it). Its exact bytes wait in `tools/pending-words/`.
Everything else failed one way: "every single version of silk has a big
sound or a word in front", and the owner stopped marking. The diagnosis and
its fix are in `docs/settled.md` — af_heart opens every isolated render with
an 85–115 ms voiced blob, which poisoned the canonical template and through
it the cutter and the gate. mend and silk stay open; the 17 initial blends
were never really judged. All 19 went back out as batch 9, rebuilt on
cleaned templates with the onset check, with warmth as the declared goal
("none have any human warmth" — slip's field): natural-sentence families
beside the teacher frames, an unhurried 0.8, and a breathy WORLD variant.

## Sentence batch 1 — judged 2026-08-11: twenty of twenty perfect

Sentence mode's audio path is solved on its first round. Every one of the twenty decodable
sentences came back perfect, rendered whole at the pack's sentence speed with no cutting
involved — which is the lesson: a sentence is spoken, not assembled, so none of the
machinery that makes single words hard applies to it. Every word was machine-validated
against the shipped bank plus the approved heart words before the batch was built, and the
generator refuses to render a sentence containing an untaught word. The bytes wait in
`tools/pending-words/` as `s-mode-s01.mp3` through `s-mode-s20.mp3`.

## Sentence batch 2 — judged 2026-08-11: twenty of twenty perfect, again

Forty sentences over two batches, forty accepted, no round spent on a repair. Sentence
mode's audio path is closed: a sentence is spoken whole at speed 1.0 and never cut, and
none of the machinery that makes single words hard applies to it. What batch 2 added over
batch 1 was longer lines, two questions, and the digraph and blend words the later levels
teach — none of it cost anything. The bytes wait in `tools/pending-words/` as
`s-mode-b2-s01.mp3` through `s-mode-b2-s20.mp3`.

The remaining risk in sentence mode is no longer the voice. It is the WRITING, and the
gap below is the first evidence of that.

Writing it found a gap for the owner to rule on: **the article "a" is not taught and is
not on the approved heart roster**, so no sentence may use it. Six drafts had to be bent
into "the" or "my" — "Dad has the job in the shop" instead of "a job". Natural English for
a five-year-old needs "a", and it is one letter carrying a schwa. Adding it is a word-bank
decision, so it stays out until ruled.

## Batch 10 — judged 2026-08-11: the frame is the whole story

Nine of eighteen perfect (trip, trim, twig, grab, drum, plum, spot, stem, brag), snug
closest, and the eight failures split into two causes worth separating.

**Every winner came from one frame.** Across batches 9 and 10, 25 of 27 winners are
`listen` — "Listen—{word}." — and 2 are `say`. Not one came from `everybody` or from a
natural sentence. The words that failed for sounding "inhuman and robotic" are exactly the
words whose `listen` arms never reached the page: flag and slid were offered three
`everybody` arms each, he only `natural`, we only `say` and `natural`. The pipeline spread
its candidates evenly across frames while only one frame has ever won, so a word whose
`listen` cuts were refused went to the owner carrying nothing but families the ear had
already rejected twenty-seven times. The fix is not more variety; it is more of the one
thing that works, and recovering a refused `listen` cut by trimming it to its own onset
rather than discarding it. Measured afterwards: `listen` at speed 0.85 verifies clean for
both flag and slid, so the arm the owner needed existed and never made the page.

**Two-letter words need a different mechanism.** he, we, me, go, no and so all failed, and
"we" failed hardest: its clips said "body" and "song", because a two-letter template matches
almost anywhere — "-body" inside "everybody" scores as well as the word does. "he" kept its
neighbours: "and he ran". SPEC already knows two-letter words need explicit phonemes because
the phonemiser misreads them; the same shortness makes them unlocatable by template match.
They move to the recipe that closed the vowel SOUNDS — the word in a repeat frame, cut only
where the source shows measured silence on both flanks.

## Sound round 8 — judged 2026-08-11: forty options, all refused, and why

"All the options here for both sounds are truly outlandish and unreasonable." The verdict
is right and the reason is legible. Round 8 ran six mechanisms and five of them PROCESSED
the audio — time-stretching, formant warping, cross-faded loops, a medoid of a synthetic
field, a second voice. Every one moved further from a person saying a sound. Cleverness was
the fault, not the sound.

One idea from it survives on its merits and is worth keeping: a stop consonant's closure IS
silence, so the /U/ in "book" is bracketed by real silence from the /b/ and /k/ closures.
The silence-flank recipe that closed every other vowel had only ever been read as "silence
between WORDS", which is why it never reached these two — they have no pure word. It works
one level down, inside a word. That is a true finding even though the round it rode in on
was refused.

## Sound round 9 — judged 2026-08-11: schwa CLOSED, on its seventh round

The record already holds the recipe that works, and it was not being used. long_e closed as
family `pack_she_45`, and ch as `pack_such_tail150`. Those names mean the sound was cut out
of an ALREADY-SHIPPED word clip — one of the 349 the owner has heard and called perfect —
not out of a fresh render. A sound cut from an approved clip starts with the warmth the
owner already accepted.

Round 9 does only that, and nothing else. No stretching, no warping, no loops, no medoid,
no second voice. There are just four source clips in the whole bank: **the** and **was**
for schwa, **push** and **bush** for oo (book). Each is cut at many positions and hold
lengths, and each cut is offered twice — once bare and once with a natural envelope, a
quick rise and a slower fall, because a vowel excised from mid-word begins and ends at full
amplitude, its own rise and fall belonging to the consonants either side. Played alone that
reads as a blip rather than a voice, which is a fair description of "outlandish".

**schwa is closed.** `schwa_6` = `pack-the-40-150-shaped`: the vowel taken 40% into the
shipped clip for "the", held 150 ms, with the natural rise and fall. Six rounds of
invention failed and the seventh succeeded by copying what the record already knew. The
envelope earned its place too — the winner is a shaped arm.

**oo (book) came back CLOSEST** on `oo_book_3` = `pack-bush-25-130-shaped`, with one named
fault: "not rounded enough". That is an acoustic direction rather than a vague one — lip
rounding is a lowered second formant — and round 10 answers it.

The scarcity was the test, and it passed for schwa: the sound WAS there in the clips that
carry it, and the earlier rounds had simply never looked. The recommendation to record
these two, standing since round 5, is withdrawn for schwa and now rests on oo alone.

## The sound inventory is COMPLETE — 47 of 47, 2026-08-11

Every sound the game teaches now has a clip the owner has heard and approved. The last two
took eleven rounds between them and closed on the same principle from opposite directions:
stop inventing, and go and measure.

- **schwa** (round 9) closed by copying the recipe already in the record — cut from an
  already-shipped, owner-approved word clip, the way long_e and ch had closed months of
  work earlier. Six rounds of invention had failed first.
- **oo (book)** (round 11) closed by turning the owner's ear-verdict into numbers. The
  owner supplied a recording of a person saying the sound; LPC formant tracking gave the
  target, and the cut was warped to hit it.

## Sound round 11 — judged 2026-08-11: oo (book) CLOSED, and round 10 explained

`oo_book_7` = `warp_bush20-most`: the vowel cut from the shipped "bush" clip, then bent
toward the measured human target. Its shipped bytes measure F1 625, F2 1117.

**The measurement settled what three rounds had guessed at.** Her /U/ measures F1 ~520,
F2 ~1140, F3 ~2400; af_heart's cut measured F1 771, F2 1220. The error was the FIRST
formant — about 250 Hz too high, a jaw too open, the vowel drifting toward /A/ — while F2
was already close.

**That is exactly why round 10 failed.** "Not rounded enough" reads as a lowered second
formant, so round 10 lowered every formant uniformly at 0.97, 0.94 and 0.91. A scalar ratio
cannot lower one formant while holding another, so it dragged an already-correct F2 down
and barely moved the F1 that was wrong. All twenty were refused, correctly.

The fix is a monotonic piecewise warp on frequency — 0, F1, F2, F3, Nyquist — applied to
WORLD's spectral envelope, which pins each formant independently. Every arm was re-measured
AFTER encoding, because a warp that survives analysis but not the encoder is not a warp the
owner will hear, and each arm carried its achieved F1 and F2 in its own name. The round
could therefore be checked rather than believed.

## Sound round 10 — judged 2026-08-11: all twenty refused, and rightly

All twenty refused. The four families were reasonable and the target was wrong: see round
11 above. Twenty options, all iterating round 9's recipe rather than replacing it, in four
equal families. **Cuts taken earlier** (8-24% into the word, where the lips have just parted from
the /b/ or /p/ and rounding is at its strongest; round 9 swept 20-60% and never reached
here). **Blends toward the already-approved oo (moon)**, a fully rounded vowel, at a
quarter, a half and three quarters — the technique a, e, i, o, u, l, m, n, r, v and ng all
ship with. **The formant lowered directly** by a small named amount, the one processing
family, present because the owner asked for one specific quality rather than "better".
And **the closest arm's own siblings**, unprocessed, so the field is not all treatment.

## Batch 14 — judged 2026-08-11: both perfect, on material never offered before

lids (`lids_4`, `stop_sp0.6`) and be (`be_2`, `listen_sp0.65`), both perfect. These
supersede the batch 13 entries, which were bytes the owner had already marked closest in
batch 12 — the round that made the hash guard necessary. Every one of batch 14's 18 arms
was checked against all 1883 arms of the 23 earlier rounds before it could be offered, the
guard blocked 8 repeats, and the result was verified independently afterwards. Both words
now rest on fresh material judged on its own, so the "closest, then perfect on the same
bytes" question that hung over batch 13 is closed rather than argued.

**The closure frame works for whole words, not only two-letter ones.** lids won on
`stop_sp0.6` — "Stop. Lids. Stop." — a full word set mid-phrase between real neighbours
with measured silence on both flanks. That treatment was built for the two-letter words and
had never been applied to a word before this round. It belongs in every future field.

The word backlog is now zero: 349 shipped and 115 approved and waiting, nothing in flight.

## Sound round 7 — judged 2026-08-11: synthesis is exhausted for the last two

**schwa and oo (book): none, again.** That is schwa's sixth failed round and oo (book)'s
third, and round 7 was not a repeat of anything: it tried four mechanisms never used on
them — the vowel lifted by voiced-run extraction out of the owner's OWN approved cup, cut,
push and bush clips; the natural word-final schwa of sofa, pasta and papa; phoneme
sandwiches between unvoiced consonants; and the accepted oo (moon) shortened and laxed.
Twelve options each, every one located and content-verified.

Every other sound in the inventory is closed — 45 of 47 — so the failure is specific rather
than general, and it is now well characterised. A lazy uh and a short book-oo are the two
sounds this voice will not produce in isolation: unstressed by definition, they lose their
identity the moment they are separated from a word. The recommendation is unchanged and now
exhausted of alternatives: **the owner records these two**, exactly as the nine stop sounds
were recorded on 2026-08-04, and the same blind cut round follows.

## Batch 12 — judged 2026-08-11: fourteen of seventeen, and every earlier refusal solved

Fourteen perfect — flag, slid, dogs, beds, tops, swam, snug, sunset, laptop, he, we, go,
no, so — two closest (lids, be) and one none (me). Every word batch 10 and batch 11 had
refused is now closed. Levels 11, 12 and 13 have their words; Level 14 has five of seven.

**The frame rule is now a strong tendency, not a law.** Across batches 9 to 12 the count is
47 winners from `listen`, 4 from `say`, and 2 from the new `sit` frame — and the exception
is instructive. `dogs` won on `say_sp0.8`, the very family whose arms the owner had called
"all sound robotic" in batch 11. Nothing about `say` changed; what changed is that dogs was
finally offered a full field instead of three treatments of one cut. The lesson is not
"prefer listen" but "offer the whole field and let the ear choose" — a thin field is the
fault, whatever family it is drawn from. `sunset` also won on `say`, and `we` and `so` on
`sit_sp0.6`, the frame introduced for the two-letter words.

**What is left is one fault, named precisely.** me: "all have weird crackling at end of e".
be: "weird trilling at end of e" (closest, `be_7`). Both are the long /iː/ tail, and both
were accepted-adjacent, so this is a tail treatment problem and not a location problem —
the cutting recipe is sound. lids came back closest (`lids_1`) with no comment.

Building the batch found two faults in this project's own machinery, both of which had been
shaping what the owner was offered.

- **The word gate counted a word's own inside dip as a second word.** "dogs" is a vowel
  and then a /z/, "beds" a vowel and then /dz/, and a plain loud-frame count reads each as
  two islands — so every located `listen` cut of dogs, beds and lids was refused, and the
  owner was offered only the leftover `say` and `everybody` families that the frame rule
  says never win. That is the whole of batch 11's first failure group, and it was the gate
  doing it, not the cutter. `word_islands()` merges dips shorter than 90 ms.
  Calibrated against the owner's own verdicts: batch 8's refused silk and slip arms stay
  refused, 8 of 8 and 8 of 8, while dog and bell go from refused to accepted. All three
  words now offer nine arms each.
- **A two-letter word cannot be located by template match.** A solo "he" is 530 ms of
  speech; the same word inside a fast frame is about half that, so every matched window
  overran into its neighbour — the first build refused all seven words with "flanks
  0/120", and batch 10's verdict on he was "they all said 'and he ran'". Cutting between
  the carrier's own measured silences took the seven from 0-3 arms to 7-9.

`tops` starts its cut inside the /t/ closure now, which is the repair its verdict named.
Both fixes carry controls: `python3 tools/verify.py --self-test` runs in `npm run check`
and four planted mutants each turn it red.

**Recovered 2026-08-16: the four missing arm ids.** The ledger entries for dogs, beds,
tops and lids recorded family and byte pin but never the winning arm's id. The owner asked
to settle it by ear; it settled by bytes instead: the original round pages still exist as
artifacts, so every surviving arm was decoded and hashed against the ledger pins. Exact
matches — dogs `dogs_7`, beds `beds_1`, tops `tops_2` on this batch's page, and lids
`lids_4` on batch 14's. Two were already corroborated in prose (dogs on `say_sp0.8`
above; lids on `stop_sp0.6` in batch 14), and the recorded families for beds and tops
(`listen_sp0.8`) are consistent with their arm positions under this batch's build order.
No re-render and no new listening was needed; a byte-identical match outranks both.

## Batch 11 — judged 2026-08-11: the frame finding, confirmed

Twelve of eighteen perfect — cats, hats, pots, maps, cups, hens, pigs, bugs, pens, cans,
kids, catnip — and **all twelve came from `listen`**. Across batches 9, 10 and 11 that is
37 winners of 39 from one frame. The finding is no longer a pattern; it is the rule.

The six failures split three ways, and only the first is the frame bias:

- **dogs, beds, lids** were offered no `listen` arm at all — `say` and `everybody` only,
  and in two cases three treatments of a single cut. Exactly the flag and slid case.
- **tops** carries a content fault the ear named precisely: "the first letter sounds like
  an h instead of a t". That is a clipped stop burst. A /t/ begins with a silent closure
  and a sharp release; cut a little late and the release is gone, leaving only the
  aspiration that follows it — which is what /h/ is. The repair is to start the cut
  EARLIER, inside the silent closure, where extra lead costs nothing.
- **sunset and laptop** had `listen` arms and still failed for warmth. They are the first
  two-syllable words offered, and the frame that carries a single syllable does not carry
  a compound. Compounds need their own treatment rather than the blend recipe.

## Batch 9 — judged 2026-08-10: the blob fix held

Eighteen of nineteen words perfect in one round — slip, slam, sled, snap,
swim, spin, stop, step, flat, plan, glad, grin, drop, trap, twin, clap,
silk, mend — after three rounds in which the same words could not win at
all. The clean-template cutter and onset gate did exactly what the
calibration promised. Every winner's bytes are in `tools/pending-words/`
(77 words + 2 sentences now wait). **flag** returned none (its field was
three arms of one family) and rides again in batch 10 with a full field.
The owner's verdict on direction: "words batches feels like we are in the
right direction with last batch."

## Sound round 6 — judged 2026-08-10: three perfect, two sounds left

**ow, air and ear all closed in one round.** ow's winner is `ow_2` — the
WORLD-warmed treatment of the owner's own round-5 "closest", which is the
iterate loop working as designed: closest, warmed, perfect. air and ear —
the r-controlled pair added on the owner's fill-in instruction — closed on
their FIRST round, both by the silence-flank recipe. Bytes preserved in
`tools/pending-sounds/`; the ledger's revisit list is now scoped to the
only two open sounds. **The synthesis campaign is complete: every sound
with an honest synthesis path is closed.** What remains is **schwa** (five
failed rounds) and **oo (book)** (no pure word) — both standing on the
recommendation for the owner's own voice, the nine-sound precedent, and a
blind cut round like the stops got. Sound tally: **45 of 47 closed**
(43 of the original 45, plus air and ear).

## Sound round 5 — judged 2026-08-10: the silence-flank recipe wins

Three closed in one round: **long_i** (perfect), **long_o** (perfect),
**oi** (perfect) — every winner a cut of the sound's own pure word (eye,
oh, oy) from a 0.7-speed repeat frame, kept only because its source showed
measured silence on both flanks. Slow plus silence-flanked is the recipe.
Bytes preserved in `tools/pending-sounds/`. **ow** came back closest
(`ow_1`, the iterate seed for round 6). **schwa: none — its fifth failed
round.** The recommendation to the owner is now their own voice for schwa
AND oo (book), the nine-sound precedent. Round 6 carries the ow iteration
plus the owner-requested backfill: **air** and **ear**, the next
r-controlled sounds, each its own pure word. Sound tally: **42 of 45
closed**; open: ow, schwa, oo_book (+ air and ear newly under test).

## Sound rounds 4 and 5 — 2026-08-10

Round 4 closed the hardest sound: **th (quiet) is DONE.** The winner is the
moth frication run SHAPED — cut to 110 ms, 15 ms attack, 45 ms decay, peak
−9 dBFS. Held flat frication reads as a hissing snake at any level; the
shaping is what won. Bytes preserved in `tools/pending-sounds/`.

Round 4's vowel cards all failed the same way — "you failed to isolate the
sound itself again. Every option." — and the failure named a blind spot now
recorded in `docs/settled.md`: a voiced vowel flanked by voiced speech
fuses seamlessly, and no voicing or island measure can see the join. The
gate passed arms the ear correctly refused.

Round 5 is built on the cure: only cuts whose SOURCE shows measured silence
on both flanks (40 ms+ under −32 dB) may become arms — a cut flanked by
silence cannot contain a neighbour. The sounds ride in their own pure
words (eye, oh, ow, oy, uh) in repeat and sandwich frames. **oo (book)**
has no pure word, so no synthesis cut of it can be proven isolated: the
recommendation to the owner is their own recording, the nine-sound
precedent. Sound tally: **39 of 45 closed**, 6 open — long_i, long_o,
schwa, oo_book, oi, ow (five of them in round 5).

## Sound round 3 — judged 2026-08-10

The first fully gated sound round (every arm located and content-verified,
the build self-refusing until every shipped arm passed). Verdicts:

- **long_a and aw: CLOSED.** Offered beside their own iterate fields (trims,
  colour), the accepted P45 clips won outright — "perfect" on both. The
  round-2 "iterate" ruling is answered: nothing beat the original.
- **long_u: CLOSED.** `long_u_1` — the core of the owner-accepted pending
  word "you", where the word IS the sound — perfect. Bytes preserved in
  `tools/pending-sounds/`.
- **ow: closest = `ow_4`** (the plain phoneme render): "the 'right' sound,
  but no human would say it this way" — the humanising seed for round 4.
- **th_quiet: none.** "All are full of static and sound like a hissing
  snake" — even at −6 to −12 dB. An isolated frication clip reads as hiss at
  any level; round 4 offers shaped short puffs, and the owner-records-it
  fallback (the nine-sound precedent) is formally on the table.
- **long_i, long_o, schwa, oo_book, oi: none**, with the theme named on
  long_o: "none sound human or have any warmth." Clean is not enough.
  Round 4's design: cut the vowel sounds from real interjection WORDS that
  consist of the sound alone — eye (long i), oh (long o), uh (schwa),
  oy/boy (oi), ow (ow) — spoken mid-phrase in a natural sentence, so the
  model gives them human prosody, plus warmth treatments (WORLD colour,
  breathiness) on the best cuts.

Sound tally after this round: **38 of 45 closed**, 7 open — th_quiet,
long_i, long_o, schwa, oo_book, oi, ow.

## Sound round 2 — judged 2026-08-10

The sidecar's P45 ship review closed 22 sounds; those exact bytes sit in
`tools/pending-sounds/` and ride as option 1 in any round for their sound
(owner's instruction, 2026-08-10), with iteration welcome beside them. Round
2 was the first marked sound round. Its verdicts:

- **ch** and **long e** have new winners: `ch_8` (the tail of the approved
  pack word "such") and `long_e_2` (the back of the approved "she") each beat
  the P45 clip in a blind field. The ledger now holds the new bytes and names
  the superseded hashes.
- **ar, or, er, zh**: the P45 clips re-confirmed perfect blind.
- **long a** and **aw**: the P45 clips were the closest in their fields; the
  owner ruled iterate on those clips — colour and trim variants of the
  accepted bytes, not a fresh hunt.
- **th (quiet)**: none, and the best candidates "contained a lot of static."
  The suspect is the round's own polish: every clip is peak-lifted to
  −3 dBFS, and /θ/ is quiet frication by nature, so the lift turns it into
  loud hiss. The next round offers gentler levels and band-limited variants.
- **long i, long o, long u, schwa, oo (book)**: none — but these fields were
  cut by the ungated generator that kept long stretches of whole sentences
  (`docs/settled.md`, "the content gate applies to EVERY round type"), so the
  verdicts condemn the round, not the sounds.
- **oi, ow, oo (moon)** came back unmarked: the owner stopped marking when the
  clipping fault kept repeating. oo (moon) keeps its P45 acceptance; oi and ow
  are re-offered, not counted.

Sound tally after this round: **35 of 45 closed** (28 in
`tools/voice-sounds.csv`, 7 by P45 plus this round), **10 open** — th_quiet,
long_a, aw, long_i, long_o, long_u, schwa, oo_book, oi, ow — exactly the
round 3 card list. The generator that built round 2 is retired; round 3 comes
from a gated generator that must pass known-good and known-bad controls
before it renders a single candidate.

## How the pack was made

The clips are rendered by a build tool on a developer machine. The model never ships; the
app carries only the audio files.

- Model: Kokoro-82M (Apache-2.0 weights), full-precision ONNX, voice `af_heart`.
- The global defaults live at the top of `tools/render-voice-pack.py`, with the reason for
  every number; every per-word value flows in from `tools/voice-words.csv`. Sentences render at speed 1.0 and words at 0.85, each clip gets 80 ms of silence
  in front and 300 ms behind, and the mp3s are 96 kbps. Every value was set by a person
  listening, over seven rounds on 26 and 27 July 2026.
- The recipe travels inside `manifest.json`, and gate G13 compares it with the approved
  values. A pack rendered with different settings fails the build, because nothing automatic
  can hear whether a word is right.
- A two-letter word never renders from its spelling: the synthesiser read "am" as the
  letter M. They rendered from explicit pronunciations until the uplift pass; all twelve
  now ship as owner-heard carrier cuts or pinned bytes, and G13 refuses any future
  two-letter word with neither a pronunciation, a carrier, nor a pin. The end trims cub
  and dish once carried (an extra syllable after a final plosive; hip had it too) retired
  with the uplift — no word carries a trim today.
- No current sentence needs an explicit pronunciation. One used to: "You read that word all
  by yourself!" was spoken with "read" as in "reed" and carried a past-tense pronunciation
  until 2026-08-03, when the owner replaced the line with "You knew just what to do with
  that word!" — chosen from candidates precisely because every word has a single reading.
  The new clip (p:2, 2342 ms, sha256 a5d647683557650b6911ad7c2693af984c0eaf4598f544acc2b97
  ac3c725c381) rendered on the approved recipe and the owner listened the same day:
  "perfect" (2026-08-03). The shipped file is the one the owner heard, byte for byte. G13
  still fails the build if a sentence containing a word with two pronunciations is left to
  the synthesiser.
- The seven praise sentences added 2026-08-06 (p:10 to p:16, "Sound by sound, you built
  the whole word!" through "Every sound in its place — wonderful!") rendered on the
  approved sentence recipe and the owner listened to all seven on 2026-08-07: approved,
  no line sent to a round. The shipped files are the ones the owner heard, byte for byte —
  sha256 p-10 37a66fb7b34356b8505a37d8fcfefa48e090585024fbc836c98db38949e74f3d,
  p-11 01afb24a3b0f764d1793cf35cd7ecb5a786b96e27c6048f464a4cd43d88c8b73,
  p-12 5f2a42d277d3c0e0ca9f1dae81e5505c1b5697f81cbd39bb24c1586e26ecf0d4,
  p-13 007ff921de25b1c6548a7c6ee755490f63b584b8f50ae82dcd0918433db961a0,
  p-14 4c57a6ea2e1ae1f8f5ddf65d7197fd7fc24fef612575adac75ac705e90758a67,
  p-15 332a8a4c1175ed53851c3af6603333cbbed2e593f5e055c9335e517ea3d536db,
  p-16 c5f056c3f82b3e6b7b0f0fcd33491c75491f709a391aec4c1c760a7fb282a211.
  Do not re-render one without a new listen.
- An explicit pronunciation only changes a recording where it differs from the one the
  phonemiser derives from the spelling. For every three-letter word tested it does not: the
  two renders are byte-identical. This was learned the expensive way, by shipping a "fix"
  for "tap" and "sip" that changed nothing.
- Which words render as a sentence, carry a brighten, or come from a carrier is stated per
  word in `tools/voice-words.csv`. After the uplift only rich takes the full stop and only
  rat keeps a brighten; the trims and onset cuts of earlier rounds all retired as their
  words won cleaner uplift renders. Each value won a listening round against the build of
  the day.
- The clip list comes from the live engine, never from a hand-kept list.
- Most words are now spoken inside a carrier sentence and cut back out of it — 239 energy
  cuts and 89 ASR cuts after the uplift pass, at the per-word values in the word table.
  The treatment became this general only through per-word rounds on the sidecar: the gap
  search still settles differently for every word (it began as three words — man, hop and
  hen — and could not be built at all for hat until hat's own keeper round).
- Nothing stands approved-and-unshipped. cup, the last such entry, shipped on 2026-08-04:
  the sidecar recovered the round 8-9 winning bytes from its archive and pinned them; the
  shipped file verifies against the pin.
  (pop was in the same position until the keeper handoff shipped it, "perfect", 2026-08-01.)
  That entry exists because the result was lost once already: it was won on 28 July, held
  back while an audit ran, and never picked back up — beta.9 shipped the rendering it was
  meant to replace.

## Listening sweep, pack 1 of 10 — judged 2026-07-30

25 Level 2 words, named not blind, as they ship. All 25 judged.

| Verdict | Words |
|---|---|
| perfect | bad, cab, dab, dad, nap, pad, pan, rag |
| very good | fan, has, map |
| good / good enough | bag, cap, lap, mad, mat |
| marginal pass | bat, cat — both "a little metallic" |
| **unacceptable** | **can, had, ham, hat, jam, man, pal** |

**Seven of twenty-five failed — 28 percent.** The pack was expected to be mostly
clean, on the theory that the faults found so far were specific to the words
already treated. It is not, and the failures are not spread at random.

**Most failures are at the START of the word, not the end.** This reverses what
every earlier round found.

| Word | What the listener heard |
|---|---|
| man | "almost sounds like an" — the m is not there |
| ham | too much static at the front |
| jam | an "uh" before the j |
| can | the c is rushed |

Four of the seven. "man" is the serious one: a word whose first sound is missing
is not a word the child is being asked to read, and it is the same class of
fault as beta.5's "am" that said "m" — a boundary phoneme the synthesiser drops.
Only three failures are at the end: had "too quick", hat and pal "static at end".

**One class holds up; one does not.**

- **h- initial: 3 of 4 suspect.** had, ham and hat all unacceptable; only has
  passed, and it is the only one of the four ending in a fricative. The bank
  holds 17 words starting with h-.
- **-t final: 3 of 4 suspect** — bat and cat marginal, hat unacceptable, but mat
  "good enough". Weaker than it first looked, and hat is also an h- word, so
  these two classes cannot be separated on this evidence. The bank holds 43
  words ending in -t.
- **m- initial is NOT a class**: mad, map and mat are all fine. man is alone.

**"Metallic" and "static" are a new fault class.** Everything found before this
pack was an extra SOUND — a vowel, a burst, a fuzz — that a trim or a carrier
could remove. These are timbre and missing energy, so no treatment now in the
recipe would address them. Bitrate was ruled out for other words by a device
test on 2026-07-28, so that is not the first place to look.

**Duration predicts nothing.** Against all 25 verdicts, failures and passes
occupy the same range with the same median. That is the second measurable
stand-in for listening to be tried and fail.

## The 57 keepers, applied 2026-08-01

A maintainer handoff supplied 57 human-accepted clips for packs 1-3, each with a
recipe, ASR pins and ear notes. 56 were applied; `man` was not (below). The full
catalog — per-word verdicts, ear notes, recipes and labels — is committed at
`docs/voice-goldens-packs1-3.json`, so the decisions survive this container.

After the apply, the owner re-listened to a five-word sample pulled from the
LIVE pack — can, sad, hop, lip, had, every one byte-identical to its golden —
and re-approved all five the same day.

**54 of the 56 are reproduced by this renderer byte for byte.** They are not
opaque audio: the pins in `tools/keepers-treatments.json` regenerate them, and
G13 checks the recipe as it does for every other treatment.

Getting there needed two fixes, and both are worth knowing before anyone
re-derives this work.

- **The handoff does not record the ASR guard.** `carrier_cut_asr_pinned` takes a
  `guard_ms` either side of the pinned word, defaulting to 60, and the bake did
  not use 60 for everything. All 31 ASR clips re-rendered one or two mp3 frames
  off the approved audio. The value was recovered per word by sweeping until the
  re-render matched the golden exactly: **40 ms for most, 80 ms for sip and
  six**. It now lives in `asr_guard_ms` in the treatments file.
- **A treatment is the whole truth for its word.** The drop-in loader only ADDED
  to the baseline maps, so sip kept a 70 ms brighten, tap an onset trim and hip a
  130 ms trim from earlier rounds, none of which their keepers ask for. Both the
  renderer and G13 now remove what a treatment does not ask for.

### sad and sat — a wrong diagnosis, corrected

An earlier version of this file said their carrier sentence was missing from
the handoff. **That was wrong**, and the correction matters because it points
at the real hazard.

`asr_carrier_1` is a search INDEX, not a mystery carrier: index 1 is exactly
`Say {w}.`, which is what the treatments already recorded and what this
renderer was already using. The audio differed for a different reason — the
guard around the pinned times is ASYMMETRIC. sad and sat keep 80 ms before the
pinned start and 40 ms after the pinned end, and the original
`carrier_cut_asr_pinned` derived both sides from a single `guard_ms`
(`lead_g = min(0.08, g)`), so no value of one guard could ever express 80/40.
Sweeping one number found nothing; holding the carrier render fixed and
sweeping both edges independently found it at once.

The guard is now a lead/tail pair per word, and **all 56 keepers re-render
byte for byte**. Nothing in the pack is opaque audio. The sha256 pins in
`tools/keeper-bytes.json` stay as a second lock: they cost nothing and they
guarantee the exact accepted audio even if the renderer changes.

### Two owner overrides: man and hop

**man.** The handoff grades its own man "marginal pass, accept if best of 6".
The clip shipped from round 14 was heard the same day as "almost perfect", so
it stands and man is excluded from the keeper treatments.

**hop.** The keeper was graded "perfect" and shipped byte-identical to the
golden — and on hearing it in the pack the owner said it sounds like "op". It
does: the recipe removes the word's own /h/. hop's ASR cut already begins
exactly at speech onset, and `head_trim 40` then takes the first 40 ms OF THE
WORD. Measured, that slice is 0.39x the rms of the 60 ms after it — the
profile of an /h/. The kit's note says the trim "cleared uh/static", but with
the cut already on the onset there is no leading uh left to clear.

The owner chose the same recipe with `head_trim` removed. hop therefore does
NOT match the keeper golden, deliberately.

**This is the fault a byte-only handoff could not have fixed.** The bytes were
approved and were still wrong; only the recipe made the cause visible and the
repair possible in minutes.

**Watch for it elsewhere.** Any keeper whose ASR cut lands on the onset AND
carries a head_trim is exposed to the same thing. In this set that is hop
(fixed), lip (80 ms, re-approved by ear) and van (40 ms, unheard since the
apply).

### What this closed

Every one of the six failures from the pack-1 sweep is now answered: can and pal
"absolutely perfect", had, hat and ham "very good", jam "near perfect". **hat in
particular** had no live candidate and was recorded here as needing a new
mechanism — the keeper found one, `carrier@0.82`, and its note explains that
period+lead150 at a slower speed fails with "uh-hat".

## Round 14, diagnostic, judged 2026-07-31

Six candidates, blind. Built to ask WHY a word loses its first sound, not which
version is prettiest.

| Candidate | Verdict |
|---|---|
| man, comma carrier 150 ms | **"almost perfect" — now shipping** |
| man, as it shipped | "horrible, sounds like uh an" |
| man, comma carrier 250 ms | "unusable, says word man" |
| man, word speed 1.0 | "sounds like an" |
| hat, as it shipped | "a little better" |
| hat, word speed 1.0 | "metallic, a is too quick" |

**man is fixed** at the same margin that fixed hop. `w-man.mp3` is byte-identical
to the approved candidate; 1 clip of 276 changed.

**A margin of 250 ms is not a bigger version of 150 ms.** It reaches back past
the comma into the carrier, and the listener heard "word man". The 60%-of-carrier
validation passed that candidate: the check is necessary and not sufficient.

**hat remains unsolved.** Speed is ruled out — 1.0 is worse than what ships —
and every carrier candidate for it failed validation. "Metallic" is not an extra
sound that a trim or a cut can remove, so no treatment in this recipe addresses
it. It needs a new idea, not another round.

## Round 13, judged 2026-07-30

hop and hen are now in the pack, as the exact files the listener approved: a re-render
reproduces `hop__1` and `hen__2` byte for byte, and 2 clips of 276 changed.

| Word | Verdict | Treatment now shipping |
|---|---|---|
| hop | "very good" | carrier `Here is the word, hop.` — 150 ms lead, gap 20 ms at −20 dB |
| hen | "almost perfect" | carrier `hen, hen.` — 150 ms lead, floor −30 dB, gap 40 ms, no trim |

Two findings that constrain any further work on these words:

- **The full-stop rendering of "hop" was unacceptable.** It was offered blind as one of four
  candidates and came back "unacceptable, still saying hop + uh". So hop LEFT `period_words`
  rather than gaining a second treatment, and beta.9 and every build before it shipped a hop
  a listener has now failed outright.
- **Trimming hen's tail takes something real.** The approved clip trimmed by 60 ms fell to
  "marginally acceptable" and by 100 ms to "clipped at the end, too quick". The fuzz at the
  end of hen is not separable from the n by a tail trim. Do not spend another round on it.

## Approved and unshipped: cup — RESOLVED 2026-08-04 (recovered and pinned by the sidecar; the section below is the historical record)

cup and pop both won the comma carrier in round 12 — "perfect" and "very good". pop has
since shipped through the keeper handoff (an ASR carrier, "perfect", 2026-08-01), so only
cup still waits. It is not shipped because the round-12 record does not say WHICH MARGIN
WENT WITH WHICH WORD.
Two contemporaneous notes say only "the comma carrier at 150 and 100 ms came back 'perfect'
and 'very good'". Reading the two lists in parallel gives cup 150 and pop 100, and that is a
guess about audio, which this file exists to forbid. A two-word round settles it.

Applying them needs the renderer, and a re-render must be checked byte for byte against the
approved candidate before it ships (see the rule above, and round 9).

## A result that could not be used, 2026-07-28

Round 10 offered each of six words as "cut out of a whole sentence", and the listener
preferred it for all six — the first thing ever to improve "hen". It could not be used: the
cut never cut. "Here is the word cup." contains no silence — the quietest moment between its
words is -26 dB and the cut looked for -35 dB — so every candidate was the whole sentence,
and the listener was judging the word inside it. Their notes said exactly that: "almost
perfect when in a sentence".

Two things came out of it. The finding is real and worth pursuing: a word carries a proper
ending when it is spoken as part of a sentence. And a candidate must be checked for length
before a person is asked to judge it — a word of this bank runs 350 to 700 ms of speech, so
anything outside that band is a fragment or a carrier and is never offered.

## How to run a listening round

1. Build the candidates so that no two are the same file. A round that offers a listener two
   identical recordings can only produce a false result, and it has: in round 8, three of the
   pairs were byte-identical, and the same audio came back marked "unacceptable" as A and
   "perfect" as B.
2. Blind the labels. Name the candidates 1 to N in a shuffled order and keep the key out of
   the folder, so a listener cannot tell which one is the current build.
3. Include the current build as one of the numbered candidates, so "no better than today" is
   a result the round can produce.
4. Build every candidate through the same code the pack uses. In round 9 the candidate
   builder faded out over a different curve, so the winning candidates could not be
   reproduced byte for byte by the renderer. The difference was 10 ms long and almost
   certainly inaudible, which is the problem: nobody can tell by listening whether what ships
   is what was approved. Check it instead — a candidate built from today's recipe must be
   byte-identical to the file in the pack.
5. Check the length of every candidate. A word clip that runs longer than a word is carrying
   the carrier; one that runs shorter is a fragment. Both waste a listening round, and both
   have been produced by a cut in this session.
6. Report back by number. Only then match the numbers to the recipe.

## To re-render (after the word bank grows)

```
python3 -m venv kokoro-env && kokoro-env/bin/pip install kokoro-onnx lameenc
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
node tools/extract-engine.mjs
node -e "import('./src/engine.js').then(m => console.log(JSON.stringify(m.voiceScript())))" > script.json
kokoro-env/bin/python tools/render-voice-pack.py script.json kokoro-v1.0.onnx voices-v1.0.bin app/public/voice
```

The renderer writes a review sheet (`app/public/voice-review.csv`) and flags any clip with a
suspicious duration. Listen to flagged clips before committing. Run `npm run gauntlet` — G13
verifies the result.

## How playback works

The app plays clips through one Web Audio context that the first real tap unlocks (Begin
Session, a result control, or replay). Clips load with `fetch` and decode
before any sound: if any part of an utterance cannot decode or play, the whole utterance
falls back to system speech, so the child never hears praise without its word. Media
elements are never used, which keeps iPadOS autoplay rules and service-worker caching out
of the picture.

## What a device test settled, 2026-07-27

Words judged right on a laptop sounded wrong on an iPhone, which raised the question of
whether the pack needs a second format for Apple devices. A page at `/audio-test/` played the
same words as they ship (24 kHz mono, 96 kbps), at double the bitrate, uncompressed, and
through a plain media element instead of Web Audio.

All four sounded the same. **The format is not the problem and one pack serves every device.**
Keeping a second pack per platform would double what a listener has to approve and it would
buy nothing.

What was wrong was the audio session, twice:

- Safari treats a page's Web Audio as background sound, which the ring/silent switch mutes,
  while a media element is never muted. A tablet on silent played nothing at all.
- A capture device takes the whole session and leaves playback on the narrow route kept for a
  phone call, so every word after a recording was thin.

Both are fixed in `app/src/voicepacks.js`, which declares a playback session before anything
sounds and takes the session back before each reveal. Neither is visible on a laptop, and
neither can be heard by any automatic check — only on a device.

## Where the sounds are: ask the model, never the audio

Added 2026-08-12, and it retires a great deal of earlier work.

Kokoro is a duration-predictor model. Before it renders a single sample it
decides how many decoder frames each phoneme will occupy, and that tensor is
inside the ONNX file this project already has:
`/encoder/predictor/duration_proj/linear_layer/Add_output_0`, shaped
(tokens, 50). A token lasts `round(sigmoid(logits).sum() / speed) * 25 ms`, one
frame being 600 samples at 24 kHz. `tools/phoneme_timings.py` owns it.

It is exact. Summed over an utterance the prediction equals the rendered audio
to the millisecond — twelve times out of twelve, over four sentences at three
speeds. The ordering matters and is easy to get backwards: divide by the speed
BEFORE rounding to whole frames. Rounding first is wrong by up to 111 ms on a
two-second sentence, which looks close and is useless for cutting a 50 ms sound.

What this replaces, for any clip rendered here:

| Method | What it achieved |
|---|---|
| Energy thresholds | shipped "of red" to the owner |
| Silence gaps | found word boundaries 0 times out of 12 sentences |
| DTW alignment | 33 of 34, and all three proposed fixes failed |
| Template matching | cannot locate a bare vowel; scores a carrier with no "a" in it at 0.804 against 0.717 for one that has it |

None of it was necessary. The rule now sits in the AGENTS.md reading order:
never hunt for a boundary in audio this project rendered.

It also settled what was wrong with the word "a". Located exactly, the article
lasts **25 to 75 ms** in every frame tried. The approved schwa SOUND the game
teaches lasts 150 ms. Every arm of round 2 ran 290 to 410 ms — four to eight
times too long, carrying its neighbours along. The owner heard that as
"inhuman" and was describing a real defect, not a preference.

The limit: this works only on audio rendered here, where the model's own
durations are available. A recording of a person carries no such tensor, and
for that the earlier measurements still stand.

## Licensing

Kokoro's weights are Apache-2.0 and its training data is permissively sourced, so the
rendered audio ships freely with this MIT-licensed game. The GPL phonemizer inside the
rendering stack runs only on the developer machine; no part of it ships.
