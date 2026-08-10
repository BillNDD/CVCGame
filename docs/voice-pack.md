# The default voice pack

This document follows the Microsoft Writing Style Guide.

The app speaks through voice packs (SPEC section 5a). The default pack ships with the app in
`app/public/voice/`: one mp3 clip for every bank word, the carrier stems, the praise
sentences, the invitation leads, and the session-end lines, plus `manifest.json` with each
clip's file and duration. Gate G13 fails the build when the pack does not cover the engine's
clip inventory, so the bank can never grow past its voice.

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

## Approved and unshipped: 13 words with no level yet (2026-08-07)

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

The owner's ear is final, and the page is only the way the ear is asked. A
winner becomes a row in `tools/voice-words.csv` — with its family, round and
byte pin — only after the answer comes back.

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
