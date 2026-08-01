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
  "an", and "hat" at 1.0 is worse than what ships.

## Known broken, and why

- **The carrier cut is not general.** It is the treatment that fixed hop, hen
  and man, and it FAILS on other words: the gap search settles in a different
  place for every one. On 2026-07-30 four of six candidates kept 68-85% of the
  whole carrier sentence, so the "word" was a phrase. Never offer a carrier
  candidate to a listener without checking what fraction of the carrier it kept.
- **A margin of 250 ms reaches into the preceding word.** A listener heard
  "word man" from a candidate that passed a 60%-of-carrier check. That check is
  necessary and not sufficient; 150 ms is the only margin with a clean result.

## The trap this project keeps falling into

A fix that is approved but not applied is worse than no fix: it reads as done.
cup and pop won a treatment on 28 July, were held back while an audit ran, and
were still unshipped two days later while the release notes implied otherwise.
Anything a listener approves goes into the pack or into "Approved and unshipped"
in `docs/voice-pack.md` the same day, with the reason it is waiting.
