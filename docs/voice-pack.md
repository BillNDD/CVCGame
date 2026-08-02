# The default voice pack

This document follows the Microsoft Writing Style Guide.

The app speaks through voice packs (SPEC section 5a). The default pack ships with the app in
`app/public/voice/`: one mp3 clip for every bank word, the carrier stems, the praise
sentences, the invitation leads, and the session-end lines, plus `manifest.json` with each
clip's file and duration. Gate G13 fails the build when the pack does not cover the engine's
clip inventory, so the bank can never grow past its voice.

## The word table — the file a person edits

**`tools/voice-words.csv` is the permanent repository of the voice.** One row
per bank word — all 300, so the empty verdict cells double as the listening
queue — and one column for every knob and decision that can apply to a word:
speed, voice, lead, tail, fade, explicit phoneme, period, onset trim, tail
trim, bright-head, head trim, carrier sentence, cut mode and its thresholds,
ASR pins with both guards, byte-pin sha, and the decision fields (locked,
verdict, ear notes, round, whether it was judged as a bare clip or in the app).
Every cell is explicit, so any row alone reproduces its clip.

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
- Two-letter words render from an explicit pronunciation, not from their spelling: the
  synthesiser read "am" as the letter M. Two words — cub and dish — have the end of their
  speech trimmed, because the synthesiser adds a small extra syllable after a final plosive.
  (hip carried the same trim until its keeper replaced it with a carrier cut.)
- One praise sentence renders from an explicit pronunciation for the same reason: "You read
  that word all by yourself!" was spoken with "read" as in "reed". G13 fails the build if a
  sentence containing a word with two pronunciations is left to the synthesiser.
- An explicit pronunciation only changes a recording where it differs from the one the
  phonemiser derives from the spelling. For every three-letter word tested it does not: the
  two renders are byte-identical. This was learned the expensive way, by shipping a "fix"
  for "tap" and "sip" that changed nothing.
- Which words render as a sentence, carry a trim, a brighten, an onset cut or a carrier is
  stated per word in `tools/voice-words.csv` (currently cup, had, jug and rub take the full
  stop; pop left that list for an ASR carrier in the keeper handoff). "tap" has whatever
  precedes its first burst removed, and "sip" ships plain — its 70 ms brighten ended with its
  keeper. Each value won a listening round against the build of the day.
- The clip list comes from the live engine, never from a hand-kept list.
- Three words — man, hop and hen — are spoken inside a carrier sentence and cut back out of it,
  at the per-word thresholds in `carrier_cut`. This is the isolation round 10 could not do; see
  below. The treatment is NOT general: the gap search settles differently for every word, and it
  could not be built at all for hat.
- Approved by a listener and NOT YET IN THE PACK: cup, alone. See "Approved and unshipped".
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

## Approved and unshipped: cup

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
Session, Start Recording, a result control, or replay). Clips load with `fetch` and decode
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
- The microphone takes the whole session and leaves playback on the narrow route kept for a
  phone call, so every word after a recording was thin.

Both are fixed in `app/src/voicepacks.js`, which declares a playback session before anything
sounds and takes the session back before each reveal. Neither is visible on a laptop, and
neither can be heard by any automatic check — only on a device.

## Licensing

Kokoro's weights are Apache-2.0 and its training data is permissively sourced, so the
rendered audio ships freely with this MIT-licensed game. The GPL phonemizer inside the
rendering stack runs only on the developer machine; no part of it ships.
