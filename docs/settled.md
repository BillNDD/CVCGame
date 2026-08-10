# Settled questions

This document follows the Microsoft Writing Style Guide.

Read this before proposing any change to the voice, the audio pipeline, or the
words. Every line is something a person already spent a listening round on, or
a measurement already closed. Re-opening one costs a round that could have gone
to a word nobody has heard yet.

Rule E10 in CLAUDE.md requires this file to be read before voice work and
updated whenever a round lands.

## Closed by measurement — do not spend a listening round

- **The 10 ms fade at the start of a clip does not eat the first sound.** Every
  word this synthesiser renders already begins with 24-48 ms of silence, so the
  fade ramps silence. Measured across nine words on 2026-07-30, failures and
  passes alike. It was the obvious suspect for "man" arriving as "an". It is not
  the cause.
- **An explicit pronunciation does nothing for a three-letter word.** For man,
  ham, jam, can and hat the phonemiser derives the same pronunciation from the
  spelling, and the render is byte-identical. The treatment that fixed "am" and
  "an" has nothing to offer these words. First learned by shipping a "fix" for
  tap and sip that changed nothing; re-confirmed 2026-07-30.
- **Duration does not predict whether a word sounds right.** With 20 words a
  listener had labelled, failures ran 768-960 ms of speech and passes 789-960 ms,
  both with a median of 832. Two attempts at a measurable proxy have now failed.
  Listening is the only detector this project has.

## The new-word rounds (2026-08-07) — closed, do not re-offer

- **Thirteen new words are approved: you, and, hand, land, sand, band, bend,
  pond, jump, lamp, camp, bump, belt.** Every one "perfect" on the owner's
  ear. Their approved bytes wait in `tools/pending-words/` until their levels
  exist; do not re-render one. Named in "Approved and unshipped" in
  `docs/voice-pack.md`.
- **A new word is cut from a carrier, never rendered plain.** All thirteen
  winners came from a carrier sentence; not one plain render was accepted.
  Do not spend an arm on a bare render again.
- **The "crackle at the end" is utterance-final creak, and it is positional.**
  A word taken from the END of a carrier inherits the creaky phonation a
  breath group ends with. Cut the word from MID-phrase instead, or trim the
  creaky tail. Full diagnosis in `docs/voice-pack.md`.
- **Irregularity fails as a quality proxy, like duration before it.** A creak
  screen would have refused two clips the owner called perfect. Measurement
  may refuse an inaudible clip or a phrase-masquerading-as-a-word. Nothing
  else. This is the third failed proxy; do not look for a fourth.
- **The creak repair works: to and do are settled** (batch 2, 2026-08-07).
  "to" won on the end-carrier at speed 1.0, "do" on the same carrier with the
  creaky tail trimmed by 90 ms — the direct repair, chosen by the ear.
- **A cut must be LOCATED, never guessed from silence.** The gap search only
  knows where sound dips, so it ran past the word and shipped "of red" to the
  owner. `tools/wordcut.py` renders the word alone and slides that template
  over the carrier on log-mel features to find where the word actually is,
  then walks at most 40 ms to a quiet frame so a neighbour can never be
  swallowed. Every cut is length-checked against the solo render. Do not go
  back to threshold cutting.
- **The register is a teacher's, not a narrator's** (owner, 2026-08-07): a
  word is spoken as a teacher speaks it to a class. The frames that carry it —
  "{Word}, everybody.", "Say {word}, everybody.", "Class, the word {word} is
  next." — also solve the creak, because in each one the word is followed by a
  comma and more speech and so is never phrase-final.
- **Phoneme renders are robotic and are not offered again.** The owner named
  the two phoneme arms as "terribly robotic" in batch 2. Explicit phonemes
  keep their one settled job — the two-letter words the phonemiser misreads —
  and are never a candidate family for naturalness.

## Closed by a listener — do not re-offer

- **hen ships untrimmed.** Trimming its tail by 60 ms made it worse, 100 ms cut
  into the n. The fuzz is not separable from the n by a trim.
- **The full-stop rendering of hop was rejected outright** — "unacceptable,
  still saying hop + uh". hop left `period_words` for the carrier cut.
- **Word speed 1.0 does not fix a weak onset.** "man" at 1.0 still sounds like
  "an", and "hat" at 1.0 is worse than what ships. Speed is closed for both.
- **"man" is solved** by the comma carrier at 150 ms — "almost perfect", shipped
  2026-07-31. (Superseded by the uplift pass, 2026-08-07 — see below.)
- **"hat" is not solved and has no live candidate.** Speed is ruled out, every
  carrier candidate failed validation, and "metallic" is not an extra sound that
  a trim removes. Anything offered for hat must be a new mechanism, not another
  margin.

## Mistakes this project has made, and must not repeat

- **Never offer a cut clip without verifying its CONTENT** (2026-08-07, batch
  3). Every candidate was checked for length and none for what it contained.
  A 600 ms window that starts 200 ms late is still 600 ms, so clips holding
  half of the next word passed the check and went to the owner, who had to sit
  through them: "every option contains other words, other sounds etc". Length,
  duration, energy and every other cheap measure say nothing about whether the
  audio is the word. `tools/verify.py` is the check that was missing — DTW
  distance to the word's own solo render, a syllable-island count, and a
  length ratio — and it is proven both ways before use: it passes 6 of 6 clips
  the owner called perfect and refuses 14 of 18 "of" arms from the round it
  was written for. Run it on every candidate. A round that skips it is a round
  that wastes the only listener this project has.
- **Do not send a round without checking it yourself first, by every means
  available.** The ear is the only judge of quality, but "is this even the
  right word" is a question a machine can answer, and answering it is not
  optional. Three rounds in one day cost the owner's patience because this
  step was skipped twice.
- **A validation that is not run against its own controls is not a
  validation.** Both the creak screen (withdrawn) and the content gate (kept)
  were tested against clips the owner had already judged. The first failed its
  controls and was deleted; the second passed and shipped. Never trust a new
  check that has not been shown to accept what a person accepted and refuse
  what a person refused.
- **Never feed the synthesiser a spelling that is not the word** (2026-08-07,
  batch 5). Alternate spellings of "of" — uv, ov, uhv — were offered as a way
  to get different renditions of the same sound. The model read them as
  LETTER NAMES, so most of that word's arms said "u v" to the owner. This is
  the same fault as "am" read as the letter M, which the two-letter
  pronunciations exist to prevent, re-introduced by hand. Explicit phonemes
  are the only safe way to ask for a sound that spelling does not give.
- **A gate must compare a candidate to the CANONICAL word, never to itself.**
  The content gate did not catch the "u v" clips because each variant was
  verified against its own render: it proved they were self-consistent, which
  they were, and never asked whether they were the word. `verify()` now
  documents that its template is the canonical render, always. A check that
  compares a thing to itself proves nothing.
- **The content gate applies to EVERY round type, not the round type it was
  written for** (2026-08-10, sound round 2). The word rounds verified every
  cut; the sound-round tool was written beside them WITHOUT the gate and cut
  donor sentences at blind fractions — so the owner got "the sound + a long
  piece of a sentence" on card after card and gave up marking. The same
  mistake in its fourth form, committed while its settled entry sat two
  bullets above. A new round tool must not render its first candidate until
  it can verify one; the check is part of the round, not a feature of one
  script.
- **The last card on a listening page must clear the sticky footer**
  (2026-08-07, batch 5). The one sentence in the batch was rendered behind the
  copy-all bar, so the owner never saw it and reported no sentences at all.
  Sentences are now placed FIRST on the page, marked as sentences, and the
  page reserves space below the last card. A round item a person cannot see is
  a round item that did not happen.

## Known broken, and why

- **The carrier cut is not general.** It is the treatment that fixed hop, hen
  and man, and it FAILS on other words: the gap search settles in a different
  place for every one. On 2026-07-30 four of six candidates kept 68-85% of the
  whole carrier sentence, so the "word" was a phrase. Never offer a carrier
  candidate to a listener without checking what fraction of the carrier it kept.
- **A margin of 250 ms reaches into the preceding word.** A listener heard
  "word man" from a candidate that passed a 60%-of-carrier check. That check is
  necessary and not sufficient; 150 ms is the only margin with a clean result.

## Watched by a gate, so it cannot regress

- **The system voice must never be handed a praise line containing "read".** The
  recorded clip was correct; the FALLBACK was not. Whenever the pack could not
  play, the app used to give the system voice "You read that word all by
  yourself!", which it says as "reed". G13 watches the pack and could not see
  this. On 2026-08-03 the owner removed the line entirely — it is now "You knew
  just what to do with that word!", every word single-pronunciation — so
  `TTS_UNSAFE_PRAISE` is empty today. The mechanism (`ttsSafePraise`) and its
  tests stay: if you ever add a praise line containing a word with two
  pronunciations, add its index to `TTS_UNSAFE_PRAISE` in
  `reference/word-quest.jsx`, or better, do not add such a line. G13 still
  refuses any SENTENCE with a two-pronunciation word left to spelling, and
  engine test 75 sweeps the praise list for the same roster of words.
  The replacement clip is settled: the owner listened to p:2 ("You knew just
  what to do with that word!") on 2026-08-03 and judged it "perfect". The
  shipped file is the one the owner heard. Do not re-render or re-open it
  without a new listen.
- **The seven praise clips added with the pool's growth to seventeen are
  settled.** The owner listened to all seven (p:10 to p:16) on 2026-08-07 and
  approved them; no line needed a round. Their hashes are in
  `docs/voice-pack.md`. Do not re-render one without a new listen.

## The sound-out reveal's visual treatment (2026-08-04) — closed

- For the coming sound-it-out reveal, the owner viewed three motion treatments
  as finished videos of "rat" with the real audio sequence — lift-and-glow,
  star-wipe, and bounce-and-shine — then an amended fourth. The ruling:
  **bounce-and-shine on the tile as each sound plays** (a spring hop with a
  white flash and an outward ring), **plus a thin shiny silver lining on the
  word's letters with a traveling glint at the word's first spoken pop**, is
  the standard for all words. Demo C2 is the reference recording of the
  approved look. The spoken shape is also settled: praise, the word,
  "Pronounced:", each sound with its tile's moment, the word again — on every
  reveal outcome, falling back to today's short sentence when the recorded
  pack cannot play. Reduced-motion users get a motionless highlight; that
  variant still needs its own design pass at build time.

## Tricky words sound out fully, and the letter-name vowels join (2026-08-06)

- The owner ruled: when the sound-out reveal reaches a tricky word, the bent
  letter plays its TRUE sound — long e in she, schwa in the, the book-oo in
  push and bush, the o-sound in was/what/wash (reusing the o clip), the
  z-sound in is/has (reusing z). No tricky-word exemption. The sound library
  grows by seven rows: the five letter-name vowels (against the day magic-e
  words arrive) and the two tricky sounds with no existing clip (schwa,
  book-oo). Three of the seven cut from already-approved word clips (she,
  the, push); the four unheard letter names render as candidates for the
  ear. `tools/voice-sounds.csv` carries all seven, open, awaiting rounds.

## The nine owner-recorded sounds (round 1, 2026-08-04) — closed, do not re-open

- For the coming sound-it-out reveal, the sounds a cut word cannot supply — the
  six stop bursts p b t d k g, the glides w y, and the breath h — were recorded
  by the owner and judged blind, each take offered as two or three unlabeled
  cuts, played twice, padded and peak-boosted for audibility. The owner
  accepted all nine: the full take for eight sounds, the 100 ms cut for p, no
  pitch alteration anywhere. `tools/voice-sounds.csv` holds every cut point,
  the source-file hashes, and the listening context; the owner keeps the
  original recordings. Do not re-cut, re-trim, or re-level an accepted sound
  without a new listen. Two lessons are settled with it: sub-second clips
  need padding and a peak lift to be judged at all (and will need the same in
  the shipped reveal), and no listening round ships again without a measured
  audit that its clips are audible.

## The uplift pass (2026-08-06 and 07) — 212 words superseded on fresh listens, closed

- Every word that shipped below "perfect" was re-offered to the owner in new
  blind rounds by the sound sidecar, and won: all 349 words now carry
  "perfect", each row in `tools/voice-words.csv` naming its round, family and
  date. A word was superseded only on a "perfect" verdict from the owner's
  ear; nothing was replaced on a measurement. 209 words shipped new bytes;
  check, limb and rich kept their bytes with the verdict upgraded.
- This supersedes the per-word rulings elsewhere in this file wherever a row
  now carries an UPLIFT round: man's comma carrier, hat's `carrier@0.82`,
  hen shipping untrimmed, the trims on cub and dish, hop's ASR cut, and the
  whole marginal tier are all replaced by newer owner-heard winners. The
  LESSONS stand unchanged: the carrier cut is still not general, a 250 ms
  margin still reaches into the preceding word, ASR + head_trim still eats a
  first sound, and listening is still the only detector this project has.
- The uplift winners do not rebake byte-identically through this repository's
  renderer (0 of 212; encoder-level drift, durations identical to the
  millisecond). The pinned owner-heard bytes govern, G13 verifies every file
  against its pin, and `docs/voice-pack.md` holds the full customs record.
  Do not re-render an uplift word without a new listen.

## The 57 keepers (2026-08-01) — closed, do not re-open

- **hat is solved**: `carrier@0.82`, "very good". This file previously said hat
  had no live candidate and needed a new mechanism. It has one.
  (Superseded by the uplift pass, 2026-08-07 — see above.)
- **can, pal, had, ham, jam are solved** — the rest of the pack-1 failures.
- **man is NOT superseded.** The handoff's own man is graded "marginal"; round
  14's is "almost perfect". Round 14 stands.
- **The ASR guard is not in the handoff, and it is ASYMMETRIC.** It is a
  lead/tail pair: 40/40 for most keepers, 80/80 for sip and six, and 80/40 for
  sad and sat. Recovered by holding the carrier render fixed and sweeping both
  edges to byte identity — sweeping a single symmetric guard finds nothing for
  the 80/40 words. Now pinned as `asr_guard_lead_ms` / `asr_guard_tail_ms` in each
  word's row of `tools/voice-words.csv`, from which `keepers-treatments.json`
  is generated. All 56 keepers re-render byte for byte.
- **`asr_carrier_N` is a search index, not a carrier name.** 0 is
  "Here is the word, {w}.", 1 is "Say {w}.", 2 is "{w}. {w}.", 3 is
  "The word is {w}.". An earlier note in this repo wrongly recorded index 1 as
  a missing sentence; it was never missing.
- **head_trim after an onset-landing ASR cut eats the word's first sound.**
  hop shipped as "op" from an approved golden because of this: the cut already
  began at speech onset and head_trim 40 removed the /h/. Do not combine the
  two without an ear. lip (80 ms) and van (40 ms) carry the same combination.

## The trap this project keeps falling into

A fix that is approved but not applied is worse than no fix: it reads as done.
cup and pop won a treatment on 28 July, were held back while an audit ran, and
were still unshipped two days later while the release notes implied otherwise.
Anything a listener approves goes into the pack or into "Approved and unshipped"
in `docs/voice-pack.md` the same day, with the reason it is waiting.
