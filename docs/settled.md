# Settled questions

**This document owns** the questions a listener or a measurement has already CLOSED, so a
round is never spent re-opening one. Read it before any voice, audio or word-bank work.
**It does not own** what is still open — that is `docs/open-faults.md` — nor the per-word
record of which family won and in which round, which is `tools/voice-words.csv`.
**This is a log**, searched rather than read. A closed question is never re-opened, so this
record only ever grows — owner-ruled 2026-08-14. Its length is not a fault.

This document follows the Microsoft Writing Style Guide.

Read this before proposing any change to the voice, the audio pipeline, or the
words. Every line is something a person already spent a listening round on, or
a measurement already closed. Re-opening one costs a round that could have gone
to a word nobody has heard yet.

Rule E10 in CLAUDE.md requires this file to be read before voice work and
updated whenever a round lands.

## Closed by measurement — do not spend a listening round

- **"what" teaches SHORT U, and "with" takes the BUZZY th** (owner, 2026-08-12).
  Both are the tiles moving to meet the voice that actually ships.
  "what" REVERSES a ruling the owner made the same morning, and the reversal is
  the more useful record. The first ruling was made from the WORD clip alone and
  kept short_o. `tools/sound_agreement.py` then reported that every phonemisation
  says /wʌt/, including the carrier that very clip was cut from. Offered the
  whole SOUND-OUT both ways, the owner refused w-o-t and chose w-u-t. The lesson
  is the ten-sound review's, on the same day and in a second place: **a clip
  judged alone is not the same question as the same clip judged in the company it
  will keep.** The tricky note moved with it — "The a sounds like 'uh' — wut" —
  because the screen and the sound-out saying different vowels is the fault the
  copy gate exists to refuse.
  "with" was reasoned onto the quiet th on 2026-08-11 under the ruling for
  American pronunciation. The reasoning was sound and the answer was wrong: the
  af_heart clip this game ships says /wɪð/. **An accent argued from is not the
  accent in the file.** Six words now take the buzzy th, not five.
  Both were found by a machine and settled by an ear, which is the division of
  labour this project should keep: the check says where the screen and the voice
  disagree, and a person says which one moves.
- **The 83 words of Levels 10 and 11 are clean as a set, heard together**
  (owner ship review, 2026-08-12). Every one had been approved ALONE inside a
  batch, across fourteen batches between 7 and 11 August, and none had been
  heard beside the others. Played in level order, one verdict each: **83 fine,
  0 needing work, none unmarked.** Do not re-round these words.
  The comparison that makes it worth recording: the same owner, on the same
  day, by the same side-by-side method, called **two of ten shipped SOUNDS
  poor** — th_this and h, both previously graded "perfect" alone. The word
  pipeline and the sound pipeline are not equally reliable, and the difference
  is not the listener. Words are cut from a carrier render of that word, judged
  one word at a time against a dozen candidates, and byte-pinned; sounds are
  built by a chain of treatments and were, until now, never heard in company.
  Effort belongs on the sound pipeline.

- **A sentence ships as ONE natural recording, never as its words stitched
  together.** Owner-ruled 2026-08-12. A word said on its own is a citation form:
  the pack's word clips run about twice the length of the same words inside a
  read sentence. Measured 2026-08-12 over 40 of the 41 approved sentences
  (the forty-first uses a word with no clip): the concatenated word clips run
  **1.79× to 2.46× the recording, median 2.07×**. Stitching them makes a list,
  not a sentence. The cost of the ruling is accepted — every
  new sentence needs its own listening round and its own byte pin, exactly as a
  word does — and it is why `tools/pending-words/` holds 41 whole-sentence
  recordings rather than a recipe for assembling them.
- **Nothing highlights during the sentence read, and no aligner is needed.**
  Owner-ruled 2026-08-12, twice over: first "highlight nothing during the
  sentence read; keep the walk for the sound-out", then the reveal was made to
  walk EVERY word rather than only the level's word. Both rulings replace
  inference with clips the player schedules itself, so no word's start time has
  to be recovered from a recording. Do not install a forced aligner
  (Montreal Forced Aligner or any other) for this: the dependency was weighed on
  2026-08-12 and refused, because the feature it would serve no longer exists.
  What the attempt closed by measurement, so nobody repeats it: silence does not
  find word boundaries in connected speech (four energy-island settings over
  twelve approved sentences matched the word count **zero times out of twelve**),
  and DTW alignment against concatenated word clips reaches **33 of 34** on its
  own control — one sentence in thirty-four would light the wrong word. Three
  fixes were tried and all failed: content-word anchoring scored worse (32/34),
  band-limiting scored the same (33/34), and rendering with gaps scored 0 of 6
  because the synthesiser merges across commas. `tools/align-sentence.py` stays
  in the tree as that record and has no consumer.
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
- **Tail jitter and harmonic-to-noise ratio do not predict a verdict either.**
  The third failed proxy, measured 2026-08-11 against batch 12's two-letter
  field, after the owner named "weird crackling at end of e" (me) and "weird
  trilling at end of e" (be) — a fault that sounds like it should be
  measurable. It is not: `me_2` and `me_5` carry the LOWEST tail jitter of the
  whole set (0.046, 0.044) and both were refused, while accepted arms ran
  0.096 to 0.169. Do not build a creak detector; it has now been tried. Offer
  a wider field and let the ear decide.
- **A word's own inside dip is not a second word.** Counting loud frames reads
  "dog" as two islands (the vowel, then the /g/ release) and "bell" as two (the
  vowel, then the held /l/), so the word gate refused every located cut of them
  and the owner was offered only the leftovers — which is why dogs, beds and
  lids all came back "robotic" in batch 11. `word_islands()` in
  `tools/verify.py` merges dips shorter than 90 ms and ignores runs shorter
  than 80 ms. Measured 2026-08-11 against the owner's own verdicts: the refused
  silk and slip arms of batch 8 stay refused, 8 of 8 and 8 of 8, and dog and
  bell go from refused to accepted. A word's internal dip runs 20-60 ms; a
  neighbouring word is separated by 150 ms or more. That margin is the rule.
  `python3 tools/verify.py --self-test` holds it, and four planted mutants
  (no merging, a 5 ms minimum run, a -60 dB loudness floor, a 400 ms merge)
  each turn it red.
- **A padded pack clip cannot be compared against a bare template.** A shipped
  file carries `shape()`'s 80 ms lead and 300 ms tail; a located cut carries
  neither. Comparing the two measures the padding — every word reads "too long
  (about 2x)". Take the clip's `speech_span` first. This wasted an evening on
  2026-08-11 chasing a length failure on "bed" that was never in the audio.

## The new-word rounds (2026-08-07) — closed, do not re-offer

- **Thirteen new words are approved: you, and, hand, land, sand, band, bend,
  pond, jump, lamp, camp, bump, belt.** Every one "perfect" on the owner's
  ear. Their approved bytes wait in `tools/pending-words/` until their levels
  exist; do not re-render one. Named in "Approved and unshipped" in
  `docs/voice-pack.md`.
- **A new word is cut from a carrier, never rendered plain.** All thirteen
  winners came from a carrier sentence; not one plain render was accepted.
  Do not spend an arm on a bare render again. **Re-confirmed the hard way on
  2026-08-12**: round 1 for the word "a" was built entirely of plain phoneme
  renders, five of them, and came back "none — these are all inhuman, full of
  static, jarring intro and outro without rounding". That is the same verdict
  as batch 2's "terribly robotic", and this file already said so. The round was
  spent because nobody read this file before designing it, which is the exact
  cost E10 exists to prevent.
- **An isolated English article IS the letter name, so "a" can never be cut
  from the end of a carrier** (2026-08-12). The phonemiser settles it without
  an ear: `"a"`, `"a."`, `"Listen—a."`, `"The printed word is “a”."` and
  `"Say a."` all render `eɪ` — "ay" — which S4 forbids the app from ever
  saying. Only a non-final position gives the schwa — but WHICH carrier gives it
  was recorded backwards here on 2026-08-12 and is corrected on the same day by
  an independent reviewer who checked with the repository's own tokenizer:
  `"a. a. a."` is **`ˈeɪ. ˈeɪ. ˈeɪ.` — all three are the letter name**, because
  a full stop makes every one of them utterance-final. It is `"a a a."` and
  `"a - a - a."`, with no stops, that give `ɐ ɐ ˈeɪ`. A round designed from the
  wrong version would have rendered three "ay"s and been refused without anyone
  knowing why. Taken with the entry below — that those two unstopped carriers do
  not separate into islands at any setting tried — the text-carrier route is
  closed completely: the carriers that separate say the letter name, and the
  carriers that say the word do not separate. Any future round for
  "a", "I", or any other word that is also a letter name must check the
  phonemisation before rendering.
- **Boundaries come from the MODEL, not from the audio** (2026-08-12). Kokoro is
  a duration-predictor model: before it renders a sample it decides how many
  frames each phoneme occupies, and that tensor is inside the ONNX file this
  project already has —
  `/encoder/predictor/duration_proj/linear_layer/Add_output_0`, shaped
  (tokens, 50). A token lasts `round(sigmoid(logits).sum() / speed) * 25 ms`,
  one decoder frame being 600 samples at 24 kHz. Summed over an utterance it
  matches the rendered audio **to the millisecond, 12 times out of 12** across
  four sentences at three speeds. `tools/phoneme_timings.py` owns it, with
  fifteen controls.
  The ordering is load-bearing: dividing by speed BEFORE rounding is exact,
  rounding first and dividing second is wrong by up to 111 ms on a two-second
  sentence — close enough to look right, useless for cutting a 50 ms sound.
  This supersedes every attempt to recover a boundary from the waveform. Energy
  thresholds shipped "of red"; the sentence aligner reached 33 of 34; template
  matching cannot locate a bare vowel at all; silence found word boundaries
  zero times out of twelve. None of it was necessary, and none of it should be
  attempted again while a clip is one this project rendered. Nothing new ships:
  `onnx` adds an output to a graph in memory on the developer machine, in the
  same class as the GPL phonemiser.
- **The word "a" has no automatic isolation path — SUPERSEDED the same day by
  the entry above, which locates it exactly at 725–775 ms of "It is a cat.".
  The four failures below are kept because they are still true of the methods
  they name, and because they are what sent the search to the model in the end**
  (2026-08-12). This supersedes the narrower entry below, which blamed
  cliticisation; the real reason is that a single unstressed vowel has no
  consonant structure for any locator to hold on to, and every other word in
  this pack has some.
  1. A plain render — closed twice here and refused by the owner as "inhuman,
     full of static".
  2. A threshold cut — forbidden by the LOCATED-not-guessed rule below, and it
     produced phrases of 670 to 1110 ms against 150 ms for the approved schwa.
  3. A template match, the required method — it CANNOT locate a bare vowel.
     The schwa template scores `"The dog ran."`, a carrier with no "a" in it at
     all, at **0.804**, against **0.717** for `"It is a cat."`, and in
     `"A cat is here."` it puts the match at the end. The score is a floor, not
     a proof, and here it is confidently wrong.
  4. `wordcut.first_instance()`, built for repeat frames — it returns 420 to
     1080 ms from `"a. a. a."` and its variants: several instances, not one.
  Do not build a fifth field for this word without a new mechanism. The game
  already holds an approved clip of the same sound — `d:schwa`, closed on its
  seventh round, 150 ms of speech — and whether the WORD may use the SOUND's
  clip is a ruling, not a round.
- **"a" cannot be cut from in front of a noun.** Six arms were built from the
  front of `"a cat"`, `"a bag"` and `"a big red cat"` and every one was a
  PHRASE: 670, 640, 900 and 1110 ms of speech against 330 ms for the sound
  itself. An article cliticises onto the noun after it, so there is no gap to
  cut at, and the island count cannot see it because the merge that stops a
  word's own inside dip reading as two words also joins the article to its
  noun. A full stop between repeats is what separates them: `"a. a. a."`
  breaks into 280, 190 and 280 ms at a -25 dB floor with a 20 ms merge, while
  `"a a a."`, `"a - a - a."` and `"a, a, a."` do not separate at any setting
  tried.
- **Island count and phoneme count agreeing does not prove the islands are the
  right words** (2026-08-12). Requiring them to be equal is a real and useful
  refusal — it threw out eight of twelve arms that had already passed both the
  island check and the length guard — but `"Class, a. a. a."` passes it with
  four islands for four sounds while the first island is a 40 ms /k/ burst and
  the second is "lass". Equal counts, wrong alignment. Use the check to
  REFUSE, never to conclude that a cut is right.
- **The "crackle at the end" is utterance-final creak, and it is positional.**
  A word taken from the END of a carrier inherits the creaky phonation a
  breath group ends with. Cut the word from MID-phrase instead, or trim the
  creaky tail. Full diagnosis in `docs/voice-pack.md`.
- **Irregularity fails as a quality proxy, like duration before it.** A creak
  screen would have refused two clips the owner called perfect. Measurement
  may refuse an inaudible clip or a phrase-masquerading-as-a-word. Nothing
  else. This is the third failed proxy; do not look for a fourth.
- **A voiced sound flanked by voiced speech cannot be proven isolated**
  (2026-08-10, sound round 4). A vowel fuses seamlessly into a voiced
  neighbour: no island, voicing, or DTW measure can see the join, so the
  gate passed every arm and the owner heard neighbour material in all of
  them. The only verifiable isolation is positional: a cut whose SOURCE
  carrier shows measured silence on both flanks (40 ms+ under −32 dB)
  cannot contain a neighbour. Sound round 5 ships nothing without that
  measurement, and a sound with no pure word to put between pauses
  (oo as in book) has no honest synthesis path — it goes to the owner's
  voice, the nine-sound precedent.
- **Flat held frication reads as hiss; a shaped puff reads as th**
  (2026-08-10, sound round 4). The th that won is the moth frication run
  cut to 110 ms with a 15 ms attack, 45 ms decay, and a −9 dBFS peak, after
  three rounds of "static" and "hissing snake" verdicts on longer, louder,
  flatter cuts. Level was never the whole problem; shape was.
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
- **af_heart opens every ISOLATED word render with an 85–115 ms voiced blob**
  (measured 2026-08-10 across silk, slip, sit, snap, stop — even words whose
  accepted pack clips start clean, 0–30 ms). It is an utterance-initial
  artifact, the same phenomenon in a fourth position: initial blob, final
  creak. Everything the pipeline derives from a solo render inherits it: a
  template built from one aligns its blob onto the preceding carrier word and
  drags "a big sound or a word in front" into every located cut (batch 8).
  `verify.clean_onset()` strips it from the canonical before it locates or
  judges anything, and `verify.lead_voiced_ms()` refuses a candidate carrying
  more than 40 ms of voiced material before an unvoiced-initial word's onset.
  Kokoro also cannot render a lone UNVOICED phoneme at all — its θ is a
  voiced "thuh" (raw low-band 0.80 vs 0.02–0.12 for real frication) — so
  unvoiced sound templates and arms are pulled from context renders with
  `soundgate.unvoiced_run()`.

## What makes a cut word sound human — the standing knowledge

Kept here because the owner has had to re-teach this twice after context
loss. These are the knobs, each with its evidence. Published perception
research agrees with what the owner's ear found: synthetic speech reads as
robotic when it lacks lexical-stress contrast, pitch movement, natural
pauses, and warm spectral tilt (attenuated low harmonics read as cold).

- **Position in phrase is the master knob.** A word rendered alone gets the
  initial blob; a word rendered phrase-final gets creak. The human-sounding
  render of a word is MID-PHRASE, where the model gives it a real accent, a
  live pitch contour, and clean modal phonation at both edges. Every winner
  in `tools/pending-words/` is a carrier cut; zero are plain renders.
- **The carrier's register shapes the word.** Teacher frames ("{Word},
  everybody.") won 59 items. A natural sentence frame won "Pronounced:"
  (in_sentence2, batch 8) after eleven teacher-style ideas failed — when a
  clip keeps sounding inhuman, move it into an utterance a person would
  actually say, and cut from there.
- **The front matters more than the tail.** All four batch-4 winners were
  front-trimmed; the "uh" at the front of every rejected "soft" and the blob
  above are the same lesson. After the cut, the onset must start ON the
  word.
- **Speed: 0.85 for words is the shipped default; 1.0 fixes nothing** (hen,
  man, hat — closed above). "Slightly too quick" was a real complaint at
  0.95+ for a sentence-styled item; unhurried 0.8 belongs in a field.
- **WORLD colour is the fine knob**: f0 ×0.94–1.06, formant warp 0.97–1.03.
  "Warm" (f0 0.97, formants 1.03) matches what the research calls warm
  spectral tilt. Raised aperiodicity (breathiness ×1.25) is the newest knob,
  first fielded in batch 9. Arrays passed to pyworld must be
  np.ascontiguousarray — a silent except around WORLD once ate a word's best
  options twice.
- **A sound is cut from an approved WORD CLIP, not from a fresh render.**
  long_e closed as family `pack_she_45` and ch as `pack_such_tail150`: both
  were cut out of an already-shipped clip the owner had heard and called
  perfect. A sound taken from approved audio starts with the warmth that was
  already accepted; a sound built out of a fresh render has to earn it from
  nothing. This was in the record the whole time and went unused for seven
  sound rounds. Look at the pack first, always.
- **Processing moves a sound away from a person, not toward one.** Round 8
  offered forty options across six mechanisms, five of which processed the
  audio — time-stretch, formant warp, cross-faded loop, medoid of a synthetic
  field, a second voice. The owner's verdict on all forty: "truly outlandish
  and unreasonable." Warmth is not a transform. When a sound is wrong, change
  where it was CUT FROM, not what was done to it afterwards. The one honest
  exception is a natural amplitude envelope: a vowel excised from mid-word
  begins and ends at full amplitude, because its own rise and fall belong to
  the consonants either side, and giving it back a quick rise and a slower
  fall restores the shape a spoken sound has rather than adding anything.
- **Formants are POSITIONS; brightness is BALANCE, and they are different
  measurements.** The owner recorded themselves clicking the reference and then
  each option in one take, through one playback chain, which removed every
  variable between us. It measured the fault in one pass: the reference /h/
  sits at a spectral centroid of ~1470 Hz with 0.12-0.18 of its energy in
  2-6 kHz; every option this project had built sat at ~1960 Hz with 0.48-0.59.
  Three to four times too bright - the "bright snake-hiss character" the bake's
  own /h/ recipe names as rejected. Formant tracking cannot see this: two
  sounds can put F1, F2 and F3 in the same places and differ completely in
  tilt and in the energy BETWEEN the peaks. The fix is a long-term average
  spectrum match, which makes balance follow by construction rather than by
  luck (`match_ltas()` in `tools/render_sounds21.py`).
- **A recording of the owner's own playback is the best diagnostic this
  project has.** Both sounds through one chain, in one file, so nothing about
  encoding, level or speakers can be blamed or hidden. When a sound is refused
  and the reason is not obvious, ask for that rather than guessing.
- **Measure a formant as a frame-by-frame MEDIAN, never from one window.**
  Every formant target this project set came from the single "steadiest" 60 ms
  window of a reference, and for a glide that window is not the sound.
  Measured properly across the whole span, the owner's /w/ has F3 1830, not
  the 3161 a single window reported — so the pipeline was warping F3 UP by a
  factor of 1.7 and F1 up by 200 Hz. Raising formants while holding pitch is
  the textbook recipe for a chipmunk, and "sounds like a chipmunk speaking not
  a human" is exactly what the owner heard (2026-08-11). The transform was
  faithfully executing a wrong number. `formant_median()` in
  `tools/render_sounds19.py` is the correct measurement.
- **Sweep kokoro's own knobs before post-processing anything.** Until round 19
  every candidate was one af_heart cut with treatments applied by hand. The
  owner's instruction — "turn every knob in kokoro until you match it" — is
  the better order: render across phoneme spellings, carrier frames and
  speeds, score each against the reference by an objective distance, and only
  then treat the best of them. For /w/ that search produced 151 gated
  candidates and a best distance of 0.104, against 0.313 for /h/ — and the
  numbers say plainly which sound is close and which is not.
- **Match DURATION and F0, not just formants.** Round 17's verdict on w was
  "much more high pitched, and sound like they have been sped up", and "sped
  up" was literal: the reference runs 330 ms and every arm ran 140 ms, because
  the formant warp does not touch length. Measured 2026-08-11. A three-axis
  match - duration, median f0, and the piecewise formant map together - lands
  a candidate at 340 ms and 216 Hz against a reference of 320 ms and 220 Hz.
  Matching one axis and leaving the others is how a clip ends up right in
  timbre and wrong in every other way.
- **When the owner supplies the target, the target is the gate's template.**
  The content check had been comparing candidates against kokoro's isolated
  phoneme render, a reference this file already calls unreliable, and it
  refused a correctly devoiced /h/ at dtw 0.32. With the owner's own reference
  as the template the same thresholds mean something. Nothing is loosened;
  the reference is simply better.
- **A demonstration /h/ and a prevocalic /h/ are different sounds.** Measured
  2026-08-11 against a human recording the owner supplied: a /h/ said on its
  own runs 0.13 voiced with a spectral centroid of 1426 Hz — nearly pure
  breath, and bright. Prevocalic /h/, taken from hat, hum, hen or hop, runs
  0.74 to 1.00 voiced. Every source this project used for two rounds was the
  prevocalic one, so no amount of edge or length work could ever have produced
  what the owner was asking for. The demonstration form is reached by
  DEVOICING: WORLD resynthesis with the periodic component removed.
- **English /h/ before a vowel is breathy-VOICED, not frication.** Measured
  2026-08-11 across hat, hum, hen and hop in the shipped pack: every /h/ runs
  a voiced-frame ratio of 0.74 to 1.00 and a low-band fraction of 0.20 to
  0.22, against unvoiced ceilings of 0.35 and 0.19. Classifying it "unvoiced"
  in the gate was a category error that no audio could ever pass, whatever it
  sounded like, and it cost h every arm in two rounds. It is judged as voiced.
- **Ten treatments of one clip is not a field.** Round 14 offered ten edge
  treatments of a single base per sound, and the owner's verdict was "all
  these options in all letters didn't have much variety between the ten
  options". Correct, and it was the design. A field needs different
  MECHANISMS, chosen for the fault that was named; shades of one thing read as
  one thing. This is the thin-field fault again, in its fifth disguise.
- **A sound is spoken in a PHONEME CARRIER SENTENCE, and lifted out of its
  last energy island.** Found 2026-08-11 in the P45 bake the owner supplied:
  not one of its 22 approved sounds is a bare render or a cut from a word
  clip. Every winner is a carrier — "hˈɪɹ ɪz ðə sˈaʊnd: ˈɔ." (citation),
  "spˈɛl ɪt: … ðə sˈaʊnd ɪz ʧ." (spelling), "vvv? nˈoʊ. fff."
  (contrastive), "bin, pin, tin." (minimal pair, which is how the bake got
  its STOP), "The letter sound E." in plain English (instructional) — rendered
  at speed 1.0 with is_phonemes true and cut by `energy_island_last`, then
  polished at a 12 ms fade and -3 dB. Try these before anything invented.
- **A lone consonant renders if you ask for it THREE TIMES.** `fff`, `sss`,
  `ɹɹɹ`, and by extension `nnn`, `zzz`, `ʃʃʃ`, `ŋŋŋ`. This project had
  recorded that kokoro cannot render a lone consonant phoneme — true of a
  single one, false of a tripled one, which comes out as real sustained
  frication or hum. That one trick reopened every continuant that had been
  waiting on the owner's voice.
- **A citation sound is not measured against an in-word reference.** A sound
  said on its own runs two to five times longer than the same sound inside a
  word, so `verify_sound`'s length RATIO refused the bake's own method at dtw
  0.11 to 0.16 — the content matched almost perfectly and the gate threw it
  away on length. The ratio is replaced for citation candidates, never
  removed, by an absolute 110-620 ms band, which is tighter than the 60-800 ms
  every candidate already faces and does not lean on a reference this file
  already calls unreliable. `form="citation"` in `tools/soundgate.py`; every
  other check is untouched, and controls prove the band still refuses 80 ms
  and 700 ms while `in_word` still refuses a 3.3x stretch.
- **DONE, 2026-08-11: no recording of the owner's voice is in this repository
  at all.** All fourteen sounds that stood on one were replaced by synthesis
  across rounds 12 to 19, `app/public/sounds/` and its nineteen WAVs are
  deleted, and the 26 `owner_recording` rows in `tools/voice-sounds.csv` are
  marked `superseded_by_synthesis` with the reason. Nothing referenced the
  deleted directory. The original ruling follows.
- **No recording of the owner's own voice ships in the game** (owner-ruled
  2026-08-11). Nineteen owner-recorded WAVs sat in `app/public/sounds/`, used
  by nothing, and 26 rows of `tools/voice-sounds.csv` were sourced
  `owner_recording`. The 349-word bank needs 29 sounds; 15 already had an
  approved synthesised clip, and the other fourteen — b d e g h j n ng sh u v
  w y z — went to sound round 12, cut from the owner's approved WORD clips by
  the recipe that closed schwa and oo. The WAVs come out of the repository
  once those fourteen are approved. Any future sound is synthesised.
- **The sound inventory is complete: 47 of 47, closed 2026-08-11.** No sound
  is open, and `tools/pending-sounds/` holds every approved clip. Do not open
  a sound round without a new sound to close. AMENDED the same day: the
  inventory is complete in the sense that every sound has an approved clip,
  but fourteen of them were the owner's own recordings, which the owner then
  ruled must not ship — see the entry above. The last two took eleven rounds
  and both closed on the same principle from opposite directions: stop
  inventing and go and measure. schwa came from copying the recipe already in
  the record; oo (book) came from turning the owner's ear-verdict into numbers.
- **When the owner names an acoustic quality, MEASURE it before changing
  anything.** The owner refused oo (book) twice for "not rounded enough".
  Rounding reads as a lowered second formant, so round 10 lowered every formant
  uniformly and all twenty options were refused. The owner then supplied a
  recording of a person saying the sound, and LPC formant tracking settled it
  in one pass: her /U/ is F1 ~520, F2 ~1140; af_heart's cut is F1 771, F2 1220.
  The error was the FIRST formant, about 250 Hz too high — a jaw too open, the
  vowel drifting toward /A/ — while F2 was already close. A uniform shift moves
  the formant that was right and barely touches the one that was wrong. The
  target numbers are in `tools/render_sounds11.py`; the fix is a monotonic
  piecewise warp that pins each formant independently, and the shipped bytes of
  the best arm re-measure at F1 528, F2 1114.
- **A hash guard must never read its own output directory.** Re-running a
  generator into the same directory made the previous run's arms read as
  "already offered", and the best-matching options — which the owner had never
  seen — were dropped. Found and fixed 2026-08-11 in
  `tools/render_sounds11.py`. Any generator carrying the guard needs the same
  exclusion.
- **The closure frame belongs in every field, for whole words too.** "Stop.
  {Word}. Stop." sets a full word mid-phrase between real neighbours with
  measured silence on both flanks. Built for the two-letter words, it won
  `lids` in batch 14 on `stop_sp0.6` after three rounds in which lids could
  not win at all — the first time the treatment was offered for a word rather
  than a two-letter item. It costs one extra render per speed. Offer it.
- **A short word is located by the carrier's silence, never by template match.**
  A solo "he" is 530 ms of speech because the render trails a long creak, but
  the same word inside a frame runs about half that, so a matched window always
  overran into the neighbour: batch 12's first build refused all seven
  two-letter words with "flanks 0/120", and batch 10's verdict on he was "they
  all said 'and he ran'". Cutting between measured silences cannot have that
  fault — the boundaries ARE the gaps — and it took the seven words from 0-3
  arms to 7-9. The template's only remaining job is the content check. Two
  rules come with it: never offer the FIRST island of an utterance (it carries
  af_heart's 85-115 ms blob), and require 60 ms of silence on both flanks.
- **Never order a candidate field by distance to the solo template.** The dtw
  distance a cut scores is its similarity to the word rendered ALONE — and the
  lone render is the creaky, phrase-final, blob-fronted thing the owner has
  refused in every round since batch 3. Sorting a field by it therefore puts
  the arms most like the bad reference at the top, and any per-family cap then
  starves the families that actually win. Measured 2026-08-11: in batch 12,
  `me` and `be` were never offered a `sit` arm at all, and `sit` is the family
  that won `we` and `so` in that same batch. Order a field round-robin across
  families — best of each, then second of each. Distance may order WITHIN a
  family, where it means what it should. This is the thin-field fault in a new
  disguise, and it is the fourth time a thin field has cost a round.
- **A thin field is the fault, whatever family it is drawn from.** `dogs` won
  on `say_sp0.8` in batch 12 — the very family whose arms the owner had called
  "all sound robotic" one batch earlier. Nothing about `say` changed; dogs was
  finally offered a full field instead of three treatments of one cut. The
  frame rule (47 winners `listen`, 4 `say`, 2 `sit` across batches 9 to 12) is
  a strong tendency for what to offer MORE of, never a reason to offer less.
- **What does NOT work**: phoneme renders for naturalness (settled above);
  alternate spellings (read as letter names); speed changes as a repair;
  any measurement as a quality judge beyond audibility and
  phrase-masquerade. The ear is the only judge of warmth.

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

- **Never re-offer bytes a listener has already judged without saying so**
  (2026-08-11, batches 12 and 13). Batch 13 was sent as "a wide field" for
  lids. All six of its lids arms were byte-identical to batch 12's six, and
  `lids_2` WAS `lids_1` — the arm the owner had marked "closest". `be_1` was
  likewise `be_7`, the arm marked "closest, weird trilling at end of e". The
  cause was narrow and worth naming: the round's new mechanisms (stop-closure
  frames, tail trims) were added to the two-letter code path only, and lids
  goes through the word path, which is deterministic — same seeds, same
  speeds, same output. Only the labels changed, because the field had been
  reordered. This is the round-8 fault (two identical files offered as
  different candidates) in a cross-round form, and CLAUDE.md bans it.
  Two rules follow. A generator must compare its arms against the previous
  round's hashes and either drop a repeat or label it as a re-hearing. And the
  fact that the SAME audio drew "closest" and then "perfect" from the same
  listener, purely from where it sat in the field, is itself the finding: blind
  position moves a verdict. Both rows carry a note saying the bytes are
  unchanged, so neither is ever read as a repair that worked.
- **A blind label may hide the method, never the fact that an arm cannot
  ship** (2026-08-11, sound round 16). Four cards carried a REFERENCE arm — a
  cut of the owner's OWN recording, included only so they could confirm the
  right piece had been found — and the owner chose it for two of them, w and
  h, because the button just said `w_2`. The owner has ruled that no recording
  of their voice ships, so neither was stored, and both rounds' work on those
  two was spent. `tools/build_page.py` now prints "— REFERENCE, not a
  candidate" on the button itself. The hash guard also exempts a reference,
  because a reference is the TARGET and hearing it beside the attempts is the
  point of a matching round.
- **A round page must never be able to lose a listener's marks** (2026-08-11,
  batch 12). The owner listened to all seventeen words, pressed "Copy all
  answers", and lost every one. Two faults compounded: `navigator.clipboard`
  is blocked inside an embedded viewer, so the write rejected; and the fallback
  revealed a textarea that lived at the very BOTTOM of a 2400 KB document,
  below the fold and invisible from the sticky footer the reader was standing
  on. The button looked dead. The listening was the expensive part and it was
  the part that was thrown away. Three rules now, all gated by G21
  (`npm run test:listening`, which drives a real page in a real browser with
  the clipboard denied): every mark is written to storage the instant it is
  made and restored on load; the export box lives INSIDE the sticky footer and
  is never hidden behind a control that can fail; and `alert()` is never used
  — it steals the selection it just told the reader to copy, and a blocked
  alert is indistinguishable from a dead button. The wider lesson is the one
  this file keeps repeating in other forms: an evening of the owner's ear is
  the scarcest thing this project spends, and the machinery around it must be
  proven, not assumed.
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
- **A canonical reference must itself be proven clean before it judges
  anything** (2026-08-10, batch 8). The word gate compared every candidate to
  the word's solo render — but af_heart pollutes solo renders with an
  initial voiced blob, so the template aligned its blob onto the preceding
  carrier word, every cut carried "a big sound or a word in front", and
  verify() passed them all at dtw 0.04 because reference and candidate
  shared the same junk. Nineteen words wasted a round; the owner stopped
  marking at card three. A reference is not canonical because of where it
  came from; it is canonical when its own cleanliness has been measured
  (`verify.clean_onset`, calibrated against the refused silk/slip arms and
  the accepted pack words).
- **The content gate applies to EVERY round type, not the round type it was
  written for** (2026-08-10, sound round 2). The word rounds verified every
  cut; the sound-round tool was written beside them WITHOUT the gate and cut
  donor sentences at blind fractions — so the owner got "the sound + a long
  piece of a sentence" on card after card and gave up marking. The same
  mistake in its fourth form, committed while its settled entry sat two
  bullets above. A new round tool must not render its first candidate until
  it can verify one; the check is part of the round, not a feature of one
  script.
- **A red gate blocks the push, even mid-campaign** (2026-08-10). Four pushes
  went out during the listening rounds while the governing-files gate (G17)
  was red: the two pending ledgers were tracked before they were named in the
  owned set. The ledgers themselves are legitimate — they are E10's "Approved
  and unshipped" mechanism, created on the owner's instructions — but the red
  check was the system asking for exactly this owner-visible entry, and it
  was not consulted. E7 has no fast-lane exception.
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
- **SUPERSEDED on 2026-08-11 for the motion, not the shape.** See "The
  sound-out reveal, as built" below. The spoken shape above stands exactly as
  ruled and is what shipped. The motion does not: at build time the owner
  viewed four treatments running against the real approved audio in a browser
  — bounce-and-shine, bounce-and-shine plus the silver lining and glint,
  lift-and-glow, and the outline ring alone at full size — and ruled: "I like
  outline ring only best. Make that the choice." The spring hop, the white
  flash, the outward ring, the silver lining and the glint are all out. The
  2026-08-04 ruling was made on videos of a mock-up; this one was made on the
  thing itself, which is why it wins.

## The sound-out reveal, as built (2026-08-11) — closed

- **The motion is the outline ring, alone.** Each tile takes a 4 px ink
  outline, 3 px clear of the box, appearing and disappearing whole rather than
  fading. No movement of any kind. Chosen by the owner from four treatments
  played against the real audio. Because it is motionless it is also the
  reduced-motion form, so there is no second variant to design: the
  reduced-motion block re-enables it by name, on the same reasoning as the
  advance control's fill — it is the teaching, not decoration, and a child who
  asked for less motion still has to know which piece of the word is speaking.
- **A ring lasts exactly as long as its own sound.** Not a fixed length. A
  fixed 700 ms was wrong in both directions and was caught before it shipped:
  it outlived the four short plosives, leaving two tiles ringed at once, and it
  ran out 236 ms before /w/ finished in "win". The player hands each tile its
  sound's measured speech length.
- **The seam is 500 ms, measured sound to sound.** The owner heard four
  spacings against the real clips and chose 500. It is not 700: that was set
  for whole words in a sentence, and a sound-out is a different rhythm. The
  measurement matters as much as the number — the demo the owner judged had
  trimmed every clip first, so 500 ms was the gap between one SOUND and the
  next. The shipped clips carry 40 to 290 ms of silence in front and up to
  608 ms behind, so the same plan played file-to-file gives gaps from 540 ms to
  over a second. The player therefore places speech, using edges measured from
  the audio by `tools/voice-edges.py` and recorded in the manifest. Do not
  "simplify" this back to a wait after each file.
- **A low hum plays under the whole reveal, at -42 dBFS.** Offered against
  silence in the same sitting and chosen. Half a second of dead air between two
  sounds reads to a child as the app having stopped. It is generated by the app
  — 110 Hz with its fifth and octave, detuned by a 0.7 Hz breath, 250 ms fades
  — not a clip, so it is outside the voice gate; the test doubles assert its
  frequencies and that it stops with the clips.
- **The tricky-word ruling of 2026-08-06 is now applied, not just approved.**
  `WORD_SOUND` in `reference/word-quest.jsx` overrides the bent tile per word:
  she long e, the schwa, push and bush book-oo, was/what/wash short o, is/has
  and was the z-sound. Left unapplied it read as done — a first build spelled
  "was" as /w/ /a/ /s/ while the screen beside it said "wuz". That is the trap
  this file exists to stop, and it was caught by an audit rather than by a
  gate, so `tools/mutants.mjs` now carries "tricky words lose their true
  sound".
## American speech is the preference (2026-08-11) — closed. It reverses a ruling made hours earlier

- The owner first ruled **British**, then reversed it the same evening to
  **American**, with the reason: the voice is af_heart, an American voice, and
  all 406 shipped clips are in it. The game should agree with the voice that
  speaks it. Both rulings are recorded because the reversal is the useful part:
  an accent preference cannot be settled without asking which voice is
  speaking, and the answer was already on disk.
- **What it decides, and it is a short list.** Only two things in the whole
  bank turn on the accent:
  - **`with`** ends /wɪð/ in British and /wɪθ/ in most American, so it keeps
    the QUIET th. Five words take the voiced th — this, that, then, them, the
    — not six.
  - **`was`** is "woz" in British and "wuz" in American. The screen has always
    said "wuz"; the sound-out played short_o, "woz". They now agree on
    **short_u**, the American vowel. `what` and `wash` keep the o-sound and
    their notes "wot" and "wosh", which is standard American for both.
- **Not settled by measurement, and it must not be claimed as such.** Two
  attempts to settle `was` acoustically both FAILED THEIR OWN CONTROLS:
  frame-median formants put "hot" at F2 1750 and "cat" at 1430, which is
  backwards, and DTW on log-mel against the shipped vowel clips matched both
  "hot" and "dog" — unambiguously short_o words — to short_u. An instrument
  that cannot tell hot from dog cannot rule on was. The vowel was chosen by the
  ruling and by making the screen and the sound agree, not by a number.
- **What the ruling does NOT reach**, unchanged from the first version of this
  entry: `math` and `mom` are American forms and stay (they now agree with the
  ruling rather than sitting against it); bath, math and path keep short_a,
  which is American as well as northern British; the CLOTH words dog, log, fog,
  long, song, moth, boss and loss keep short_o, standard in both.

## Canadian pronunciation: not a voice, but already the pronunciation (2026-08-11) — closed

- The owner said they would prefer Canadian, and assumed it was not on offer.
  Half right, and the useful half is the other one.
- **There is no Canadian voice.** The model carries 54, checked rather than
  recalled: eleven American female, nine American male, four British female,
  four British male, and the rest Spanish, French, Hindi, Italian, Japanese,
  Portuguese and Chinese. Nothing Canadian. Of what exists, the American voices
  are the closest to Canadian by a wide margin, so af_heart is already the best
  available answer to the owner's preference.
- **But the pronunciation is already Canadian**, because a phonics game only
  expresses which SOUND a letter makes, and for this bank every point where
  Canadian and American diverge is either unreachable or already matches.
  Checked word by word against all 349:
  - Canadian raising of /aɪ/ and /aʊ/ before a voiceless consonant — the bank
    is all short vowels, so no word can reach it.
  - The cot-caught merger — Canadian is fully merged, which is short_o. That is
    what hot, dog, long, song, fog, boss and loss already ship.
  - `was` is /wʌz/ in Canadian, "wuz". The ruling of this evening.
  - `with` is /wɪθ/ in Canadian, the quiet th. The ruling of this evening.
  - sorry/borrow, pasta/drama, the -ile words, roof/root: no bank word reaches
    any of them.
  - **`math` and `mom` are Canadian forms**, not merely American. The flag
    raised against them earlier today is withdrawn: Canadian says math and mom,
    and only British says maths and mum. Nothing to change.
  - The one difference everybody names — **"zed" against "zee"** — cannot arise
    at all. Safety rule S4 forbids the app from ever speaking a letter name.
    The z tile says the SOUND, /z/ as in zip, which is the same in both.
- **What is irreducibly American is the accent colour of the voice**, and only
  that. Changing it means a different voice and 406 clips that no one has
  listened to. Not proposed, and not a small thing to propose.

## Every other grapheme was swept, and th is the only wrong sound (2026-08-11) — closed

- Four independent sweeps went through the whole tile map against all 349 bank
  words — the single consonants, the multi-letter units, the vowels, and a
  word-by-word pass from the other direction — and every claim was then given
  to an adversarial verifier told to refuse it. Do not re-run this sweep
  without a reason: it is a day's compute and it came back clean.
- **One wrong phoneme survived: the voiced th.** Everything else was either
  refuted or is accent-dependent and correct for British speech (see above).
- Specifically CLEARED, so none of these costs a round: `s` (the z-sound in is,
  has and was is already handled by WORD_SOUND, and no other bank word needs
  it), `c`, `g`, `x`, `y`, `ch`, `wh`, `ng`, `ss`, `ll`, `ff`, `zz`, `qu`, the
  silent-letter pairs kn/wr/mb, and all five short vowels outside the nine
  tricky words the owner has already ruled on.

- **CLOSED 2026-08-11, sound round 22: the voiced th.** Ten arms over three
  methods — cut from the approved word clips this/that/then/them/the, the
  tripled carrier sentence, and the θ-against-ð contrast — offered round-robin
  by method so no method could take every slot. The owner accepted
  **th_this_2, "perfect"**: the carrier-citation family, kokoro af_heart on
  "hˈɪɹ ɪz ðə sˈaʊnd: ðððð." cut at its last energy island, 210 ms of sound.
  Pinned in `tools/voice-sounds.csv` and `tools/pending-sounds/`. Do not
  re-render it without a new listen.
  Five bank words take it — this, that, then, them, the — and the other nine
  th words (thin, thick, thumb, thud, bath, math, path, moth, with) keep
  th_quiet; `with` is quiet under the American ruling of the same evening. The map is per word, not per grapheme, so a th word added later
  gets whichever is right rather than inheriting one silently; a test asserts
  all fourteen and two mutants guard the split.

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

## A report from a stale build cost most of a day (2026-08-12) — closed

The owner reported, from a screen recording of the running game, that the reveal was not
saying the phonics sounds after the word and that no tile was ringing as each sound played.
Later the same day, after updating the app, they play-tested and reported it working: "The
reading then phonics pronunciation with boxes around phonics letters thing is working again."
Nothing in this repository changed in between. **The device was running an old build.**

The same thing happened twice in one hour. A separate report — things on screen sitting
behind one another — was also reported gone after the same update. Two faults, one cause,
neither of them in the code.

**What this cost, honestly.** I filed the sound report as B16 and named a "strongest
candidate": the audio player not running when the words are due, which falls the whole
utterance through to system speech and produces exactly those two symptoms together. It was a
good hypothesis and it was wrong. I also aimed it at iPhone and iPad, and the owner was on a
desktop. What was NOT wasted: chasing it found a real, separate fault — B7 had been closed
that morning claiming every fallback path names its reason, and one of the five named none,
which is fixed and stays fixed. But the fix did not cause this recovery and must never be
recorded as though it did.

**The rule this leaves.** Establish the running version BEFORE diagnosing anything reported
from a device. This is a PWA: a newer version installs and waits rather than applying itself
under an open page, which is correct and is exactly why a report can describe a build nobody
is working on. The app shows its version and build stamp in the home screen's grown-up strip;
that is one line of a report and it settles the question before a round is spent. Two things
also worth remembering from the attempt: no screenshot or recording tells you the build, and
a green desktop reproduction does not clear a fault reported on a real device — but neither
does it convict the code.

## The heart-word sound-out round (2026-08-12) — closed

Eight items, one page, one evening. The owner heard two sounds alone and six whole
sound-outs assembled from the real clips at the app's own 500 ms spacing.

| item | verdict |
|---|---|
| `oo_moon` alone | perfect |
| `long_i` alone | perfect |
| `to` — t, o→oo | perfect |
| `do` — d, o→oo | perfect |
| `my` — m, y→eye | perfect |
| `you` — y, ou→oo | perfect |
| `said` — s, ai→e, d | perfect |
| `of` — o→u, f→v | **iterate on this** |

**What the round was actually for.** All six word clips had been graded `perfect` since
2026-08-07 and byte-pinned in `tools/pending-words/`. The ear was never the blocker. The
blocker was the SOUND-OUT: left to the general mapping, measured against the model's own
phoneme string, "of" would have taught /ɒ/ /f/ for a word that says /ʌv/, "to" and "do" a
short o where they say /u/, "said" four sounds where it has three, and "you" three where it
has two. Every id resolved, every clip existed, and no gate objected — the "default sound"
fault of open-faults section B, which had just been closed as a class that morning.

**What shipped.** `to` and `do` to Level 6, `you` and `said` to Level 7. `oo_moon` shipped;
it had no row in `tools/voice-sounds.csv` at all before that day. Safety rule S8 gained
`ai` and `ou` as tiling units, verified first against every bank word so nothing already
shipped re-tiled underneath it.

**What did NOT ship, and why — none of it about the audio.**
- `my` and `long_i`: both perfect. SPEC seated `my` in the open-syllable level, which is not
  built, so `long_i` was shipped and then un-shipped as an orphan clip. **The blocker was a
  seat, not a sound** — and the owner gave it one the same evening: `my` sits at Level 2 and
  `d:long_i` ships. This paragraph described the state for about two hours; it is corrected
  rather than deleted because the reasoning is the record.
- `of`: the only iterate. Do not reach for `o→schwa` as the next arm without measuring
  first — B12 records `d:schwa` and `d:short_u` as the SAME vowel by formant (/ʌ/ and /ə/
  differ by stress, not quality), so offering both risks the round-8 mistake of two arms a
  listener cannot tell apart. The likelier axis is `d:v`: a formant-bent synthetic graded
  perfect ALONE and never heard in company, which is exactly what B11 says produced the two
  poor sounds. Measure its envelope and its voiced release before spending an ear.

**A counting error of mine is on the record too.** I told the owner `my` needed a new tile
unit. It did not: `tools/sound_agreement.py` splits a phoneme string into CHARACTERS, so
the diphthong /aɪ/ came back as two entries against two tiles and I read it as a mismatch.
The same error made `a` look like one. Only `you` and `said` were real mismatches. If that
tool is used to judge a tile count again, count phonemes, not characters.

## Natural sentence or stitched words (2026-08-12) — closed, 8 of 8

Ruled once from a measurement, then confirmed by ear the same day because the owner asked
to hear it rather than read it. Eight sentences, each one offered both ways back to back:

| | verdict |
|---|---|
| The cat sat on the mat. | natural |
| My dog can run. | natural |
| The hen is in the pen. | natural |
| You can dig in the mud. | natural |
| The pig sat in the sun. | natural |
| Dad had ham and jam. | natural |
| The sun is hot. | natural |
| You can hop to the top. | natural |

**The stitch was given its best case and still lost every time.** Each word was cut back to
its own speech using the lead and tail the pack declares, and the words were butted straight
together with NO gap added; both sides carried the standard 80 ms lead and 300 ms tail. Any
real gap would only have made it longer and more mechanical. So this is not a question to
re-open by adding a smarter stitcher: the losing version was already the flattering one.

**The number, corrected.** Stitched runs **1.43 to 1.74 times** the natural recording,
median **1.72**. This project has said "about twice as long" in more than one place; the
direction was right and the figure was not. Do not quote 2x again.

**What it costs, and it is the reason to keep this written down.** Every new sentence needs
its own listening round and its own byte pin, exactly as a word does — there is no way to
manufacture a sentence from words already approved. Anyone tempted to save rounds by
stitching should read this entry first: it has been tried, heard, and refused unanimously.

## Four rulings on the evening of 2026-08-12 — closed

Given one at a time on a clickable page, which is itself now the rule (AGENTS.md).

| question | ruling |
|---|---|
| the softened `v` | **split it** — `d:v` for van/vet/vat/vex, `d:v_soft` for "of" alone |
| `th_this` and `h`, the two sounds graded poor | **after the beta**, as their own round |
| the sentence lead-in line | **three lines that take turns**, not one fixed line |
| the beta | **fix the census flake, run the census, act on what it finds, then cut** |
| what the census is for afterwards | **run it every other beta** — the owner's own words |

**"Three that take turns" is a commitment to three ROUNDS, not one.** Each line must be
equally true for every word the sentence could be teaching, which is the constraint that
killed "Here is the new word": a rotation is only as honest as its weakest line.

**The three, chosen from eight later the same evening:** "You read them all. Let's sound out
this one." / "Let's sound out one word together." / "Here is one word to sound out." They do
three different jobs — the reason, the grown-up beside the child, the plain announcement — and
the owner refused both praise-shaped candidates for the same reason: praise plays immediately
before this line, and two celebrations in a row is one too many. None is recorded yet, and
they are named in SPEC section 12.

**"Every other beta" is a cadence, and cadence is the owner's to set (2026-08-02).** It also
answers the question the census raised about itself: it is too slow for `npm run check` and
too noisy for a release gate, so it sits between them — a survey run often enough to catch
drift and rarely enough to be read.

## The word "a" (2026-08-12) — closed, and it came from outside this repository

The commonest word in English, missing from the game since the start, and missing for a
safety reason rather than a technical one: handed the string "a", every voice this project
has tried says the LETTER'S NAME, and S4 forbids the app to say a letter name to a child
being taught that letters make sounds.

The owner solved it outside the repo and handed over a complete package — an af_heart schwa,
363 ms, option D, with its recipe, its inputs, and a SHA-256 for every file. All seven hashes
verified on arrival.

**Nothing was re-baked, and the package says why.** Praat's overlap-add produced
sample-level differences between runs of the same recipe, so the accepted WAV is the
authority and a rebake is not. That matches this project's own rule from the other side: a
re-render is a different file, and a different file is one no person heard.

**What still needed an ear, and it was not the sound.** Three things differed between what
the owner accepted and what a child would get:

| | measured | verdict |
|---|---|---|
| level | −18.0 dBFS against short_u's −20.5 and the shipped schwa's −22.8 | **arm 2·3** — matched to today's schwa, −4.8 dB |
| format | accepted as lossless WAV; the pack is 96 kbps MP3 | judged in the shipping format |
| shape | one letter, one sound: word and sound are the SAME recording, played three times | **full reveal**, graded perfect beside "to" |

**Two schwas ship, on the owner's ruling.** "the schwa with the the should remain as we
already have in game" — so `d:schwa` (150 ms) is untouched and `d:schwa_a` (360 ms) is new.
Pointing "a" at the existing schwa would have made the word clip and the sound clip disagree
inside one reveal, which is fault B15 by another route.

**The one thing the round did not cover, and the gate caught it.** With "a" in the bank, the
copy gate refused the build: system speech, which the app reaches only when the pack fails to
load, would say "The word was a" — the letter name, S4 broken. The fallback now says "uh".
That is `TTS_UNSAFE_WORD`, the same shape as `ttsSafePraise`, and it is pinned by a test with
a control proving the substitution is for that word alone.

**The human reference recording in the package is not in this repository and never will be.**
The owner ruled on 2026-08-11 that no recording of their voice ships; the handoff's recipe
confirms it was an amplitude-envelope target only, with no human samples in the output.

## "of", in three rounds (2026-08-12) — closed, and the `v` changed for every word

The last heart word, and the only one that took more than one evening. It ends with
`of` in the game at Level 2, sounded out **o → the u of "up", f → /v/**, graded
`perfect`.

| round | arms | verdict |
|---|---|---|
| 1 | what ships · v cut from "van" · a held v · o→schwa | **iterate on this** — "the v part sounds like it is shouting. Needs more rounding and quieter" |
| 2 | the same vowel, four v treatments | **D** — "the v sound is now perfect, I just want to bring back the o sound from the original rounds" |
| 3 | the winning v with `short_u` · the same v with `schwa` | **A, perfect** |

**"Shouting" was measurable, and that is the lesson worth keeping.** The complaint sounded
like taste. It was not: the shipped `d:v` sat **6.2 dB louder** (−16.6 against −22.8) and
**400 Hz brighter** (1817 Hz against 1413) than the vowel standing next to it. B11's story
exactly — a clip graded alone, never heard in company. When a listener says a sound is wrong
beside another sound, measure the pair before offering new arms.

**A correction, because this entry got its own cause wrong first.** The first version of this
record said the old `d:v` was "a synthetic pitched up six semitones, graded `ok` alone in
round S1". That is the row for the owner's own RECORDING, marked `superseded_by_synthesis` in
`tools/voice-sounds.csv` and deleted from the repository on 2026-08-11. The clip that actually
shipped is the af_heart one in `tools/pending-sounds/`: family `match-vex260-most1`, round
**SND16, 2026-08-11**, verdict **"perfect (owner)"**, made by warping the formant envelope of
the first 260 ms of the approved word "vex" at its **original pitch** — no pitch shift at all.
Two rows describe one sound id, and reading the wrong one turned a clip the owner had passed
into a clip the owner had merely tolerated. An independent reviewer caught it the same day.
When a sound has a superseded row, read the LEDGER for what ships and the CSV only for what
it says it is.

**The recipe that won**, from the shipped clip's own body: gain −7 dB, one-pole low-pass at
1800 Hz, re-peaked to −3.5 dBFS, 40 ms fades, then the pack's 80/300 ms padding. Rebuild it
with `kokoro-env/bin/python3 tools/build_of_round.py --ship`, which refuses unless the source
hashes to the clip the round was built from AND the result hashes to the bytes the owner
graded (`0489d6c0`). To rebuild from scratch, restore **both** `app/public/voice/d-v.mp3` and
its manifest entry (lead 190, ms 864, tail 424) from commit `403b237` first: the recipe cuts
the body using the edges the manifest declares, so restoring the file alone produces a
different body and the result-hash guard refuses — correctly, and confusingly if you have not
read this line.

**Every /v/ in the bank took the new clip at first, and that was wrong.** The change was
argued from the false record above — "the old clip was never graded better than ok" — and the
truth is that it was graded **perfect** in SND16. Measured afterwards, the new v sits −23.8
dBFS: 3.3 dB below the vowel in "of", which the owner heard and passed, but **6.5 dB below
short_e in "vet" and "vex" and 9.6 dB below the n in "van"** — the same size of gap as the one
the owner called shouting, in the other direction, in three words nobody had heard. The old v
sat within 0.7 dB of its neighbours in exactly those words. A clip tuned for one word's company
is not tuned for another's.

**So the sound was SPLIT, owner-ruled the same evening.** `d:v` is SND16's clip, untouched,
and van, vet, vat and vex keep it. `d:v_soft` is the round-3 clip, and **"of" is the only word
that takes it**. Every word now carries audio a person approved for that word. The cost is one
extra clip in the pack and this paragraph; the alternative was either changing three words
nobody had heard, or spending a listening round to re-approve a sound that was already
approved. The general rule that came out of it: **a per-word sound override is cheaper than a
listening round, and honest, whenever a treatment was judged in one word's company.**

**What round 3 was really for.** The owner's round-2 words could be read two ways, and one
reading was mine rather than theirs. So arm B was round 2's arm D **unchanged** — the same
v, byte for byte, with the vowel they had already chosen. If my reading had been wrong, B
would have won and nothing would have been lost. Offer the unchanged option whenever a
verdict has to be interpreted; it costs one arm and it settles the question.

## What a heart word's LEVEL means (2026-08-12) — closed

Two files answered this differently, so both were true at once and the sentence leveller was
confused. The owner ruled: **a heart word's level is where the CHILD MEETS it, not where its
spelling would fall.**

Every heart word now opens Level 2 — the, and, to, do, you, said, my, of, a, in that order, FIRST
in the list, because a level's word order is its introduction order and appending would have
made a word that exists to be met early the last thing a child meets.

**What it fixed, measured before and after:**

| | before | after |
|---|---|---|
| approved sentences that can be levelled | 32 of 40 | **40 of 40** |
| blocked entirely | 8 (all by `my`) | **0** |
| claimed BELOW where the child meets the words | 12 | **0** |

`tools/decodable.mjs` got simpler rather than cleverer: `vocabularyUpTo()` used to add every
heart word on top of the levels, treating them all as available from Level 1 while the
engine seated them at 6 and 7. It now reads the same seats every other part of the game
reads, so the two answers cannot drift apart because there is only one of them. A guard
throws if a heart word has no seat, or a seat later than Level 2.

**What it costs, and the owner took it deliberately.** A Level 2 child meets eight words
they cannot sound out from the code they have been taught. That is what a heart word is, and
it is standard in the field — the highest-frequency words are taught by sight ahead of the
code, precisely so that reading a sentence is possible at all. **Level 1 is untouched**: a
child's very first session is still the same twelve clean two-sound words. (Superseded
2026-08-15: the 10-and-10 curriculum re-cut Level 1 to fourteen — ten decodables and four
hearts — and the pre-level ladder now sits before it.)

SPEC section 12's earlier placement — of/to/do/you/said at Levels 6 and 7, my in the
open-syllable level — is superseded and says so. That placement was written when these were
thought of as phonics words that happened to be common; the ruling reframes them as sight
words that happen to be spelled awkwardly.

## Sentence round one for the new curriculum (2026-08-15) — partly closed

The first listening round for the 10-and-10 curriculum (ten words, growing sentences,
Levels 1–6 first) put 24 new whole-sentence renders — af_heart, speed 1.0, the recipe every
shipped sentence uses — to the owner's ear and eye in one page. Closed by that round:

- **15 sentences approved "perfect"**, by ear and by read, on 2026-08-15. They enter the
  screened ledger when the curriculum lands, citing this round: "Dad ran." "We sat."
  "The cat sat." "My cat ran." "The man ran." "The cat had a nap." "He is sad."
  "Dad had a nap." "He ran to the van." "You can go." "We go up." "The dog is big."
  "The dog can sit." "He said we can dig." "A big dog sat."
- **Two phrases banned by name as euphemisms in American English**, owner-ruled the same
  night. `tools/sentence-screen.mjs` now refuses both mechanically — the pairing in any
  order at any distance for one, the adjacent pair for the other, plurals covered — with
  controls proving the innocent neighbours ("The cat sat.", drumming taps) survive. The
  banned pairings are listed only in that tool. Neither banned sentence ever shipped; both
  died in the round, which is the round doing its job.
- **The renders themselves needed no re-recipe**: every verdict was about the words, none
  about the voice. The sentence recipe stays settled.

Not closed, carried into round two: six "iterate" sentences, three "no good option" slots,
and the owner's word-list verdict, which round one never received — the question sat at the
bottom of the page and the owner never saw it. A decision the owner cannot see is a
decision not asked: round two leads with it.

## Sentence round two — Levels 1–6 verdict-complete (2026-08-15) — closed

Round two led with the word lists and closed everything round one left open.

**The six word lists are approved, exactly as offered, with one change of the round's own
finding: the word "I" is seated at Level 1.** Ten decodables per level in teaching order,
hearts riding outside the count:

| level | ten decodables, in teaching order | hearts seated |
|---|---|---|
| 1 | is it in on at an up us am ax | the · a · and · I |
| 2 | if ox cat sat ran can man dad hat mat | my · we |
| 3 | had bag nap map cap tag jam ham pat bat | me · to |
| 4 | sad mad bad rat pan fan van pal pad rag | he · no · do |
| 5 | tap wag lap tan zap yam cab ram dab rap | go · so · you |
| 6 | has dam nag sap vat yap sit dog big dig | be · said |

**All nine open slots filled, each winner heard and read by the owner on 2026-08-15:**
"I am in!" (L1) · "I am it!" (L1) · "We sat and had jam." (L3) · "Dad and I had ham." (L3) ·
"We sat on the mat." (L3) · "A rat is in the van!" (L4) · "Dad is mad at the rat." (L4) ·
"We go in the cab." (L5) · "The big dog can dig." (L6). Two slots came back "either is
fine"; under that delegation the round-runner picked "We sat and had jam." over its ham
twin (variety) and "Dad and I had ham." (it reinforces the newly seated I). Both were
heard by the owner; only the choice between two approved renders was delegated.

**A correction, written the same hour the error was found.** The round page and an earlier
version of this entry called "I" the bank's sixteenth heart word, never seated. That was
recalled, not counted, and it was wrong twice: **"I" has never been in the bank at all** —
no word, no clip, no voice-words row, no tricky note — and the bank's real sixteenth heart
is **"of"**, which the six approved lists leave unseated. Both facts were then read from
the engine, not remembered. What follows from each: seating "I" means **adding a new word
to the bank** — its word clip needs its own listening verdict before the build ships
(E10 says the round for it is designed only after re-reading how the word "a" was won,
because a bare render of a tiny word is the exact shape that entry closed), and "I says
its name" needs a tricky note; **"of" seats in Level 7 or later**, offered to the owner
with the next stretch of lists. The owner's approval of the six lists and the nine
sentences stands — the sentences carrying "I" were heard whole and approved whole.

**Levels 1–6 of the 10-and-10 curriculum are now verdict-complete and awaiting the build**:
31 sentences a child can meet (7 already shipped and screened, 24 approved in these two
rounds), every one heard whole at the settled sentence recipe and read by the owner against
the sentence screen's question. The build — engine levels, sentence bank, save migration
computing each child's level from their own words, the new word "I" with its own heard
clip, floors and scenarios — is the next large change, and none of these verdicts ship
until it lands.

## Sentence round three — Levels 7–12 all but closed (2026-08-15) — closed

The same night as rounds one and two, the next six lists went to the owner with 31 new
sentences: the old short i and o stage reordered for sentence power, short e and u
beginning, and the heart word "of" offered a seat. **The lists are approved with one
adjustment in the owner's words — "Move of to 7" — so "of" seats at Level 7, not 8.**
No approved sentence used "of" before Level 8, so nothing moved with it.

**Thirty of thirty-one sentences came back perfect on first listen** — the verdicts live
with the levels in the curriculum draft, every one dated 2026-08-15. One iterates: the
hen-and-pen sentence at Level 11, carried to round four. "We win!" was already shipped
and screened, shown for context only.

**The six approved lists, recorded here because a verdict that lives only in an
untracked page is a verdict this project will lose** (the build reviewer caught the round
pages living in a gitignored folder; the engine's LEVELS now owns these, and this table is
the round's record of what the owner approved, with the of adjustment applied):

| level | ten decodables, in teaching order | hearts seated |
|---|---|---|
| 7 | mom pop hot pot top not got did him pig | of |
| 8 | sip dip tip pin win hit six fin bin lip | — |
| 9 | box fox log hop cot bit fit pit wig bib | — |
| 10 | fix job rip hip lot nod hog tin rig mop | — |
| 11 | rob sob mob cop dim bed red hen pen ten | — |
| 12 | net leg wet jet men bus cup sun run fun | — |

Three rounds in one evening closed 54 new sentences, two banned phrases, twelve word
lists, and two heart seats. The renders needed no re-recipe at any point: whole-sentence,
af_heart, speed 1.0 — the settled sentence recipe held through all of it.

## Round four, and the night is closed (2026-08-15) — closed

Two questions ended the evening. The hen sentence came back "either is fine"; under that
delegation the runner shipped "The red hen sat on my bed." — it gives red its only sentence
appearance, puts three Level 11 words in one line, and the pen oddity that started the
iteration is gone entirely. And the word **i** has its first clip: **arm C, the whole word
at sentence speed 1.0**, chosen over 0.9 and 0.85. Like the word "a", its sound-out is the
same recording, because one letter is one sound; unlike "a", the word says the letter's own
name, so the render family the "a" round closed was never on the table.

Every winner's exact heard bytes now sit in `tools/pending-words/` with round, verdict and
SHA-256 — 55 sentences keyed `s:cur-l<level>-<n>` and the word under `i` — and
`docs/voice-pack.md` names the batch under Approved and unshipped. The build ships those
bytes hash-verified or returns the item to a round; nothing is re-rendered on trust.

The night's tally: **55 sentences, twelve word lists, three heart-seat rulings (I at
Level 1, of at Level 7, all others as offered), two banned phrases now gate-enforced, and
one new word.** Levels 1–12 of the 10-and-10 curriculum are verdict-complete. What remains
before a child sees any of it is the build, and the build alone.

## Three rulings on the evening of 2026-08-15 — closed

All three arrived in chat after the 10-and-10 build shipped, two of them from a decision
page whose numbers were computed from the engine.

**The ten new level names are approved as offered** — "Sound great", the owner's words on
Jam Jar, Van Pals, Zig Zap, Dig Dog, Mom and Pop, Six Pins, Fox Box, Fix It, Red Hen and
Fun Run. Open-faults R holds the fuller record.

**Heart words count toward winning a level.** The build had continued the old Level 2's
arithmetic by default and the reviewer rightly flagged that nobody had ruled it; now the
owner has, accepting the recommendation: promotion certifies readiness for the next
level's sentences, and sentences lean on the hearts more than on any decodable, so the
child who cannot yet read them is not ready, whichever ten decodables they know. Level 1
promotes at 12 of its 14; the decodables-only alternative (8 of 10 everywhere) and a
weighted middle bar were both offered and declined.

**Level 1's sentence pool caps where honesty caps it.** Ten meaningful sentences do not
exist in ten VC words plus four hearts, and the owner's own curriculum rule is "target
ten, never padded" — so Level 1 tops out around eight, and the target stays ten only
where ten is honest. The two levers that could widen the space — seating another heart at
Level 1, or ruling chants a legitimate Level 1 shape — were offered and not taken; the
chant question may return with round five's own chant candidate.

## Sentence round five — the pools grow toward ten, and the chant shape dies (2026-08-15) — closed

Fifty-nine candidates went to the owner's ear to grow every thin level toward the
ten-per-level target. **Forty-eight came back perfect and one good — 49 shipped the same
day** as ids `s:r5-01` through `s:r5-49` (level-free ids, on the build reviewer's advice
that a seat is the arbiter's fact, not an id's). Most levels now hold ten sentences;
`tools/pending-words/` holds every winner's exact bytes with its verdict and hash.

**The chant shape is refused by ear, five of five**: "Up, up, up!", "A rat! A rat!",
"A fin! A fin!", "Knock, knock!" and "Clap, clap, clap!" all came back "no good option" in
one round. A repeated-word exclamation is not a sentence this owner wants a child to meet,
whatever level it sits at. Do not offer the shape again — this closes the chant lever that
the Level 1 decision page had left open.

Also refused: "Let us hum." and "She can chop and mash." One iterates: "Am I up?" (L1).
Two came back with no verdict at all — "We got fish at the shop." and "I can tell you a
lot." — and a skipped card is a question not yet asked, never a refusal: both re-offer in
round six unchanged.

Level 1 rests at six sentences: its space is nearly spent, the chant lever is gone, and
the owner's "never padded" rule holds. The ten-per-level target stays open only where ten
honest sentences exist.

## Round six closes the sentence banks (2026-08-15) — closed

Ten cards ended the project the owner opened that morning with "I want to greatly expand
the use of sentences per level." All eight straight candidates came back perfect and
shipped the same hour as `s:r6-01` through `s:r6-08` — the two round-five skips confirmed
on their second asking, and all six chant-slot replacements. The Level 1 either-or came
back "neither works", and with the chant lever already dead and the space honestly spent,
**Level 1 is finished at six sentences** — the one level below ten, by three rulings that
all say the same thing: never padded.

**The banks stand complete: 198 sentences, ten per level everywhere but Level 1 (six) and
Level 16 (twelve, grandfathered over the target).** Every one heard whole at the settled
recipe, read by the owner on a dated round page, screened, hash-pinned, and seated by the
arbiter. Six rounds, one day.

## The pre-level ladder is ruled and built (2026-08-15) — closed

The owner asked to "expand the game now back to the origins of early reading", weighed a
sidecar AI's eight-level draft against a critical read (adopt the oral-first core and the
skill gating; alter the letter sets to feed OUR Level 1 and the numbering to a separate
ladder; abandon its CVC levels wholesale as duplicates of Levels 1–8), accepted that
shape, and then ruled all four design decisions on a decision page, each the
recommendation: **five pre-levels** (ears, then s-a-t-p, i-n, m-o, u-x — the ten letters
Level 1's decodables spell, every sound clip already owner-approved); **adult-graded
say-it-back** (S1 untouched, zero new audio, the tile-tap variant declined for version
one); **the words' own promotion rule** — both paths of it, boxes at 80 percent or two
perfect sessions, after the auditor measured that boxes alone make a two-letter rung a
100 percent bar; and **fresh saves only** (any reading history — a graded word, a
session, a log row, a level set above the start — begins past the ladder). SPEC section
12 item 8 carries the full ruling; the rung names (Little Ears, First Sounds, New Sounds,
More Sounds, Last Sounds) were approved the same evening — "Approve pre level names", the
owner's words — so nothing in the ladder ships unruled. The same evening the owner raised the G6 file-length ceiling to 1400 in
their own words — "Increase it to 1400 on my authority" — recorded in CLAUDE.md E6, and a
comment-stripping workaround written before that ruling was reverted; the auditor's
autopsy of that stripper (two silent desync triggers) stands in the session record as the
reason such a strip must never return casually.

## CV syllable drills — asked, measured, and skipped (2026-08-16) — closed

The owner asked whether the pack holds accepted recordings for consonant-vowel blends —
sa, ba, ta, de and their family — suspecting it does not. Measured: it does not. The only
CV-shaped clips anywhere are the real words "no" and "so". The ladder needs none by
construction: Pre 1 teaches blending by ear on real Level 1 words whose sounds and whole
clips are all accepted (a test pins every ladder item to the shipped inventory), and
blending with print is Level 1's own opening job, demonstrated by every reveal.

Offered the addition with its three costs — an S4 extension (a blended syllable is
neither a full word nor an approved single sound), fresh renders through listening rounds
(nonsense syllables are where a renderer mispronounces), and a new item kind — the owner
ruled: **"Yeah let's skip them."** Real-word blending with meaning attached stands as the
ladder's method. Do not re-open without a new ruling; this entry is what the round would
cost and why it was declined.

## Level 21, the plural level — five verdicts on one page (2026-08-16) — closed

The road's next stop was ruled on a browser-verified decision page the evening after
beta.20 shipped. The five verdicts, in the owner's words where quoted:

1. **The roster is 14 words**: cats hats pots maps cups hens pigs bugs pens kids dogs
   beds tops lids — "Ship 14 - cans waits for a future ruling". **cans** is flagged, not
   refused: my screen matched it to the jugs precedent (2026-08-07) and the owner left it
   in the waiting room, verdict intact. Six words say /s/, eight say /z/; d:s and d:z
   both ship already, so the level adds zero new audio.
2. **romp is seated in Level 19, Tent Camp**, with the other final blends — the 19th
   waiting word finally has its home. Its perfect verdict and pinned bytes ride along.
3. **The level's name is Cats and Dogs 🐾** — one /s/ plural and one /z/ plural, the
   level's whole lesson in its own name.
4. **Sentences: 7 of the 13 drafts survived the owner's read**, and the cut pattern
   taught something: every cut was a static scene (sit on beds, nap on beds, sit on
   desk, the chant-shaped "spin and spin"), every keep an action (grab, dig, get, fit,
   sat in mud, hop). The owner also wrote one of their own — "The maps rest on the
   desk." — and asked for eight-word options that reuse earlier levels' words. Drafting
   to that brief is the standing instruction for this level's remaining sentence work.
5. **The book-list target stands at 420 words.** The owner's 100-lessons index
   (photographed 2026-08-16, "I would like for the game to cover at least these words by
   the time we call it done") holds 434 distinct words. Thirteen book-artifacts are
   refused (blap, ruck, ding, blam, biff, beagle, boo, zzzz, ho, sam, let's, eagle's,
   don't — sam is also a person's name the S9 gate would refuse). **gun is refused** by
   the appropriateness screen. **shot is admitted** on the owner's amendment — "Also
   shot is fine in the right sentence" — meaning the word may be taught and the sentence
   screen judges each use. SPEC section 12 takes the ruled list when it lands in the
   repository; until then the transcription lives in the session scratchpad.

## The paragraph stage's presentation — ruled on mockups (2026-08-16) — closed

How a two-to-three sentence paragraph presents was settled on a page of four working
phone mockups the owner could tap through, after a first round of four and the owner's
own blend note. The verdicts, verbatim: "Whisper - big line centered, next line faint
below" and "One hold per sentence, as today". SPEC section 12's passage item owns the
full design. What this closes: the filmstrip, the plain growing page, the history chip
and the full ladder are refused for this stage; per-paragraph grading is refused. What
it deliberately leaves open, named there: the whisper's exact ink level (watch a real
child), and the late-game multi-paragraph form. Do not re-open the presentation without
a new ruling; iterate the ink level freely — that is tuning, not re-opening.

## The trap this project keeps falling into

A fix that is approved but not applied is worse than no fix: it reads as done.
cup and pop won a treatment on 28 July, were held back while an audit ran, and
were still unshipped two days later while the release notes implied otherwise.
Anything a listener approves goes into the pack or into "Approved and unshipped"
in `docs/voice-pack.md` the same day, with the reason it is waiting.
