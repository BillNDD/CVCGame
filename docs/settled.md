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

## Closed by a listener — do not re-offer

- **hen ships untrimmed.** Trimming its tail by 60 ms made it worse, 100 ms cut
  into the n. The fuzz is not separable from the n by a trim.
- **The full-stop rendering of hop was rejected outright** — "unacceptable,
  still saying hop + uh". hop left `period_words` for the carrier cut.
- **Word speed 1.0 does not fix a weak onset.** "man" at 1.0 still sounds like
  "an", and "hat" at 1.0 is worse than what ships. Speed is closed for both.
- **"man" is solved** by the comma carrier at 150 ms — "almost perfect", shipped
  2026-07-31. Do not re-open it.
- **"hat" is not solved and has no live candidate.** Speed is ruled out, every
  carrier candidate failed validation, and "metallic" is not an extra sound that
  a trim removes. Anything offered for hat must be a new mechanism, not another
  margin.

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
  recorded clip is correct; the FALLBACK was not. Whenever the pack cannot play,
  the app used to give the system voice "You read that word all by yourself!",
  which it says as "reed". G13 watches the pack and could not see this. The rule
  now lives in the engine as `ttsSafePraise`, with three tests. If you add a
  praise line containing a word with two pronunciations, add its index to
  `TTS_UNSAFE_PRAISE` in `reference/word-quest.jsx`.

## The 57 keepers (2026-08-01) — closed, do not re-open

- **hat is solved**: `carrier@0.82`, "very good". This file previously said hat
  had no live candidate and needed a new mechanism. It has one.
- **can, pal, had, ham, jam are solved** — the rest of the pack-1 failures.
- **man is NOT superseded.** The handoff's own man is graded "marginal"; round
  14's is "almost perfect". Round 14 stands.
- **The ASR guard is not in the handoff.** It is 40 ms for most keepers and
  80 ms for sip and six, recovered by sweeping for a byte-identical re-render.
  It is now pinned in `tools/keepers-treatments.json`. Anyone re-deriving these
  clips without it will be one or two mp3 frames off and will not know why.
- **sad and sat cannot be re-rendered at all.** Their carrier family
  (`asr_carrier_1`) is not recorded anywhere in the handoff. They ship as bytes,
  pinned by hash. Do not attempt to "fix" them by re-rendering.

## The trap this project keeps falling into

A fix that is approved but not applied is worse than no fix: it reads as done.
cup and pop won a treatment on 28 July, were held back while an audit ran, and
were still unshipped two days later while the release notes implied otherwise.
Anything a listener approves goes into the pack or into "Approved and unshipped"
in `docs/voice-pack.md` the same day, with the reason it is waiting.
