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
  Do not spend an arm on a bare render again.
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
## British speech is the preference (2026-08-11) — closed for the th, open elsewhere

- The owner ruled: **prefer British speech**. Asked in the narrow case of
  `with`, whose final th is /ð/ in British English and /θ/ in much of
  American, so `with` joins this, that, then, them and the — **six** words
  take the voiced th, not five.
- The same ruling settles a contradiction the reveal exposed. `was` was told
  to the child as "wuz" on screen while the sound-out played "woz": the owner
  had ruled on 2026-08-06 that was, what and wash take the o-sound, the reveal
  plays short_o accordingly, and the sibling notes already read "wot" and
  "wosh". Only the `was` line still carried the American vowel. It now reads
  "woz". The screen and the sound say the same thing.
- **What this ruling does NOT reach, and must not be assumed to:**
  - **The voice is American.** af_heart is an American voice and every one of
    the 405 shipped clips is in it, each listened to and accepted. Changing
    the voice would throw all of them away. The preference is about which
    sound a letter makes, not about re-recording the pack.
  - **`math` and `mom` are American forms.** British is "maths" and "mum". Both
    are in the bank. Not changed, because swapping a bank word is the owner's
    call and touches the levels, the clips and the word table.
  - **bath, math, path split WITHIN Britain.** Southern British says /ɑː/, the
    long "ah" of father; northern British, Scottish and Irish say /æ/, the same
    short a as cat. "Prefer British" does not choose between them, no clip
    exists for the long one, and the bank ships short_a. Left alone.
  - **dog, log, fog, long, song, moth, boss, loss** were raised as the CLOTH
    set, where some American speakers say the "aw" of saw. British says /ɒ/,
    which IS short_o. The ruling makes the shipped sound correct. No change.

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

- **OPEN, and the one part not built: the voiced th.** `this, that, then,
  them, the` (and `with`, depending on accent) take /ð/, and the only th clip
  in the approved set is `th_quiet`, which is the voiceless /θ/ of "thin".
  Those words are currently sounded out with the wrong th. `with` joins them
  under the British-speech ruling of 2026-08-11, so the count is six. `tools/voice-sounds.csv`
  carries a `th_this` row from round S7 but no synthesised clip exists. This
  needs one listening round before it can be called finished.

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
