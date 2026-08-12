# Open faults — the list to work from

This document exists because a fault that lives only in a chat log is a fault this project
will lose, and has. Created on the owner's instruction, 2026-08-11.

Sections A to F are things known to be wrong, missing, or undecided **right now**, and
nothing speculative. Each says what it is, where it lives, what a child or a grown-up
experiences today, and what "done" means. Section G is the one exception and is marked as
such: ideas worth trying that nobody has tried yet, kept here on the owner's instruction
(2026-08-12) because an idea that lives only in a chat log is lost to the next context
compaction exactly as a fault is. An idea is never counted as work done, and it never
justifies calling anything finished.

When an entry is finished, delete it and record the result in the document that owns the
fact — `docs/settled.md` for anything a listener or a measurement closed,
`tools/voice-sounds.csv` or `tools/voice-words.csv` for a round, `SPEC.md` for a ruling.
This file holds only what is still open.

This document follows the Microsoft Writing Style Guide.

## State at the time of writing

Written against `v1.0.0-beta.17`, commit `fd7c894`. The full gauntlet passed on `c87ed44`
with a clean tree: 22 gates, 0 failed, 66 source mutants killed, 341 tests, 406 clips.
Section A is the exception to everything else here: it is wrong TODAY, it is child-facing,
and it is on by default. Everything after it is a missing guard, an undecided preference, or
a gap in the audit trail, and **nothing after section A makes a wrong sound play today.**

---

## A. Remove microphone mode — decided 2026-08-11, to be done first

**This is the most serious item in this file, and the only one that is wrong today rather
than unguarded.** The owner ruled on 2026-08-11: microphone mode is removed from the game
entirely. Their words: "I don't think it's safe or appropriate the more I think about it."

### A1. A child's voice is sent to a third party, on the default setting

- **Where** `app/src/App.jsx`, `startRec()` and the `SR` recogniser from
  `reference/word-quest.jsx`; the mode toggle in `app/src/screens/ParentScreen.jsx`; the
  four microphone messages in `App.jsx`; `tests/recognizer.test.js` (51 tests, 8 blocks).
- **What happens today** `newState()` sets `settings.mode` to `"mic"`, so every family that
  installs the app gets microphone mode unless a grown-up changes it. When the child taps
  "Start Recording", the browser's speech recogniser listens and, on the browsers this app
  supports, sends that audio away to be transcribed. The app's own code is the proof: it
  handles `ev.error === "network"` and shows "Can't listen without the internet." A thing
  that runs on the device does not need the internet.
- **Why it is a fault and not a trade-off** Safety rule S6 says the app makes no network
  calls after load and all data stays on the device, with exactly two exceptions, both
  requests to the app's own host carrying no data. A child's recorded voice going to a
  transcription service is neither of them. The rule and the shipped default contradict each
  other, and the rule is the one that is right.
- **What was NOT the reason** Speech recognition never records a wrong answer — safety rule
  S1 holds, and it only ever confirms a correct reading. The fault is not that it judges
  badly. It is where the audio goes.
- **Done** Microphone mode does not exist. A grown-up judges every word, and that is the
  only mode. The recogniser, the mode toggle, the four microphone messages and the
  recogniser tests are deleted rather than disabled — a feature that is only turned off is a
  feature someone turns back on. SPEC sections 5, 6 and 10 lose the mode, `ADULT_JUDGED` and
  the adult-note logic are re-read in a world with one mode, and the gate floors move down
  only where a whole gate has gone away, with the reason written beside each (E6 forbids
  lowering a floor to pass a build; it does not forbid retiring a gate whose subject was
  deleted, and that distinction must be argued in the commit, not assumed).
- **Not to be confused with the family voice pack.** The owner ruled the same evening that
  the parent voice-pack recorder STAYS. It records a grown-up reading the word list, into
  storage on their own device, and sends nothing anywhere. Different in kind. See D1.
- **Timing** The owner chose to do this tomorrow with the rest of the list rather than cut a
  release tonight, knowing that v1.0.0-beta.17 is public with the mode on by default. Until
  it ships, a grown-up can switch to "you judge" in the Grown-ups corner.

---

## B. The default sounds — the whole class of fault that let `th` ship wrong

The owner asked for this group to be put first, on 2026-08-11. Section A arrived later
the same evening and is child-facing, so it goes above it.

A default is not a decision. It is the absence of one that still produces audio: a grapheme
with no ruling still returns a valid clip id, `resolvePack` still resolves, the voice gate
still passes, and a child is still taught something. That is exactly how `th` played the
wrong sound for months without a single gate noticing.

### B1. The grapheme fallback returns a clip for a grapheme nobody ruled on

- **Where** `reference/word-quest.jsx`, `soundIdFor = (g) => "d:" + (TILE_SOUND[g] || g)`.
- **Scale** 16 of the bank's 39 graphemes are named in `TILE_SOUND`. The other 23 take the
  `|| g` fallback: b, ch, d, f, g, h, j, k, l, m, n, ng, p, qu, r, s, sh, t, v, w, x, y, z.
- **Today** All 23 are correct. They were swept against the whole bank on 2026-08-11 and
  every claim was put to an adversarial verifier.
- **The fault** Correct by luck of the naming, not by a recorded decision. A grapheme added
  later inherits a clip named after itself and nothing fails.
- **Done** Each of the 39 either appears in `TILE_SOUND` as a stated decision, or the
  fallback refuses rather than guesses. A new grapheme with no ruling must fail the build.

### B2. 336 words take the general mapping with no per-word check

- **Where** `WORD_SOUND` in `reference/word-quest.jsx` covers 13 words: she, the, push, bush,
  was, what, wash, is, has, this, that, then, them.
- **Today** The other 336 are ordinary words where the general rule is right — cat is
  /k/ /a/ /t/. Swept on 2026-08-11 and clean.
- **The fault** A sweep is a point in time. The next word that needs an exception — the next
  `was` — will take the general rule silently and be wrong, and no gate will see it.
- **Done** A gate, not another sweep. Adding a word that needs an exception must fail until
  someone rules on it.

### B3. `what` plays a vowel nobody chose

- **Where** `WORD_SOUND.what = { 1: "short_o" }`, inherited from the ruling of 2026-08-06,
  which was made before the accent was settled.
- **Today** Not wrong. Both *wut* and *wot* are ordinary American, the on-screen note says
  "wot", and screen and sound agree, so a child is not told two different things.
- **The fault** `was` moved to short_u under the American ruling of 2026-08-11 and `what`
  did not, because nobody ruled on it. It is a variant chosen by inheritance.
- **Done** The owner listens once and rules. One line either way.

### B5. The tile ring falls back to a fixed length

- **Where** `app/src/wq-css.js`, `animation: wqpop var(--wqpop, 700ms)`.
- **Today** Unreachable. The default pack declares every clip's speech length, so the ring
  always gets a real one.
- **The fault** A fixed 700 ms is the exact fault fixed on 2026-08-11 — it outlived the four
  short plosives and ran out 236 ms before /w/ finished in "win". Any tier that cannot report
  a length gets that fault back.
- **Done** A tier that cannot report a length shows no ring at all, rather than a wrong one.

### B6. A family pack gets no speech-to-speech spacing

- **Where** `app/src/voicepacks.js`, `edge()` returns 0 for any tier that is not `default`.
- **Today** Unreachable. No screen calls `idbPutClip`, so no family pack can exist.
- **The fault** A family pack would play the old file-to-file rhythm — gaps from 540 ms to
  over a second — with nothing to say it had.
- **Done** Family clips are measured on the way in, or the sound-out declines to use them.

### B7. Falling through to system speech leaves no trace

- **Where** `resolvePack` returns `null` and the caller uses system speech.
- **Today** Not active. Every reveal, across all three outcomes and every word tried,
  resolves the default pack.
- **The fault** Correct behaviour with no signal. A pack that quietly stopped resolving would
  look like a design choice: no tile rings, a short spoken sentence, and nothing anywhere
  saying the recorded voice was unavailable.
- **Done** The grown-up's side of the app can tell that the recorded voice did not play.

### B8. Fourteen approved sounds are parked, unchecked against the current bank

- **Where** `tools/pending-sounds/`: air, ar, aw, ear, er, long_a, long_i, long_o, long_u,
  oi, oo_moon, ow, or, zh. 47 approved, 33 shipped.
- **Today** Believed parked for Levels 10 to 15.
- **The fault** Not verified. If a current bank word should be using one of these instead of
  a default, it is being sounded out wrongly now.
- **Done** Each of the 14 is confirmed as future work, or shipped because a word needs it.

### B9. `soundInventory()` walks `LEVELS` only

- **Where** `reference/word-quest.jsx`, `soundInventory()`.
- **Today** Safe. Every tricky word is also in a level, so coverage is complete.
- **The fault** A word reachable outside `LEVELS` would have no sound, `resolvePack` would
  return null, and the whole reveal would drop to system speech with nothing on screen to
  say so. The heart-word roster in SPEC section 12 is the next thing likely to test this.
- **Done** The inventory is derived from every word the app can show, not from `LEVELS`.

---

## B11. Two shipped sounds are judged poor, and the best one has no recipe

Owner ship review, 2026-08-12: ten shipped sounds heard side by side rather than one at a time.
`short_a` best; `short_e`, `short_i`, `short_o`, `short_u`, `schwa`, `long_e`, `oo_book` good;
**`th_this` and `h` poor.** Both of those are in the game today.

- **Where** `app/public/voice/d-th_this.mp3` and `d-h.mp3`; their entries in
  `tools/pending-sounds/pending-sounds.json`.
- **What a child hears today** Every `th` in this, that, then, them, the and with — and every
  `h` in the bank — is sounded out with a clip the owner now calls poor. Not wrong, as
  `th_quiet` was wrong before round 22: the right sound, made badly.
- **What makes this more than a preference** Both were graded **"perfect (owner)"** in their own
  rounds, `h` on 2026-08-11 and `th_this` after twenty-two rounds on the same day. A verdict
  given to a clip heard ALONE did not survive hearing it beside its neighbours. That is a fault
  in how this project runs rounds, not only in two clips: a sound must be judged in the company
  it will keep.
- **What separates them, measured** The owner then graded the four other short vowels "almost
  perfect", which turns two tiers into a gradient, and the gradient separates cleanly. Against
  the top five — `short_a` best, `short_e`, `short_i`, `short_o`, `short_u` almost perfect:

  | | top five | "good" | poor |
  |---|---|---|---|
  | attack | 5–20 ms | 10–15 ms | **35–45 ms** |
  | peak position | 0.10–0.19 | 0.06–0.29 | **0.29–0.77** |
  | speech length | 240–300 ms | 130–290 ms | 210–220 ms |
  | timbre drift | 1.78–3.22 | 2.13–4.16 | 3.47–5.22 |

  Attack and peak position do not overlap at all between the top five and the poor two. `h`
  peaks at 0.77 — three-quarters of the way through a breath sound — with a tilt of
  −2.77 dB/oct against −8.99, the thin and bright end of everything shipped.

  **The envelope also predicts the owner's own ranking, which is what makes it worth trusting.**
  They placed `schwa` and `oo_book` at the bottom of the vowels with no numbers in front of
  them. Those two are the shortest clips shipped, 150 and 130 ms, and the two with the latest
  peaks among the vowels, 0.26 and 0.29 — failing the same rules the poor pair fail, by less.
  The measurement found the gradient rather than being fitted to it.

  Still a hypothesis from ten clips, and it is a REFUSAL filter, never a predictor of a verdict:
  the three failed proxies in `docs/settled.md` are what happens when that line is crossed.
- **The second fault, and the worse one** `short_a`, the clip the owner picked as the best made,
  records **no method at all**: its ledger entry is a sha, the round id `P45-B01` and
  "ok (owner ship review)". No family, no carrier, no duration, no treatment. The one sound most
  worth reproducing is the one this project cannot say how it made. Every other sound in that
  file carries its method.
- **Done** Both poor sounds are re-rounded and replaced, judged beside their neighbours rather
  than alone. `short_a`'s recipe is recovered from the round-45 render scripts, or its absence is
  recorded as permanent so nobody trusts a reproduction that never existed. Every future sound
  round is judged in company (see also G0: a rule with no gate is a rule that fails).

---

## B12. The formant metric cannot tell one vowel from another

Found by the independent speech-acoustics reviewer the owner instituted on 2026-08-12, checking
numbers I had already acted on. Four listening rounds were designed against this measurement.

- **Where** `tools/clip_compare.py`, `formants()` and the `--calibrate` path.
- **What is wrong, measured**
  - Ordinary analysis settings alone move the answer: sweeping sample rate, LPC order and window
    length over ONE fixed clip shifts F1/F2 by a median of **51 Hz and up to 133 Hz**. My
    acceptance threshold was 55 Hz — below the instrument's own noise.
  - It is also below the real contrasts it must respect: /ʌ/ against /ɒ/ (cut against cot) is
    **128 Hz**, while the spread WITHIN /ʌ/ across the pack is 137 Hz. With a cruder nucleus
    picker /æ/ and /ɛ/ land **17 Hz apart** — the metric cannot separate "bad" from "bed".
  - Four concrete faults: the 24 k to 12 k decimation has no anti-alias filter, so everything
    above 6 kHz folds into the formant band; pre-emphasis is applied AFTER the window instead of
    before; `F1` and `F2` are median-ed independently, so the reported pair can belong to no
    frame that exists; and one spurious low pole silently relabels F1 to F2. Corrected analysis
    puts d:schwa's F3 at ~2830 Hz where the tool reports 2020.
  - Raw-Hz Euclidean distance is perceptually wrong: 100 Hz at F1 is a different vowel, 100 Hz
    at F2 is nothing. Bark or log Hz is the right space.
  - **The 55 Hz calibration was a duplicate, not a contrast.** `d:short_u` (957/1531) and
    `d:schwa` (938/1583) are the same vowel — /ʌ/ and /ə/ differ by stress, not quality. The
    tightest bound in the calibration was the pack compared with itself. And `--calibrate`
    averaged over stops and fricatives, where "formants" are noise shape, which inflated the
    reported median of 375 Hz; over the seven real vowels it is ~218.
- **What this cost** Round 2's arms were read as "measurably a different vowel" at 274 Hz. They
  were not a different vowel. At 25 to 50 ms — one decoder frame — they were not a vowel at all.
  The right diagnosis was duration, and duration was measured and ignored.
- **Done** The formant path is repaired (filter before decimation, pre-emphasis before the
  window, paired medians, Bark spacing) or removed. Any tolerance is set from the p90 within-class
  spread, about 250-350 Hz-equivalent, never 55. Identity comes from writing the phoneme token
  and from a mel distance against approved clips of the same vowel — `mel_dist` and `env_corr`
  are already the sounder half of the tool.

## B13. `d:schwa`'s provenance in the record is not what shipped

Same review. `tools/voice-sounds.csv` row "schwa" records empty `cut_start_s` / `cut_end_s` and
`gain_db=0`. Measured by cross-correlation against `w-the.mp3` (corr 0.868), the shipped clip is
**114-264 ms of that word's speech, plus about 5 dB of gain**. It is the back half of an
utterance-final "the": f0 74 Hz at that point, which is the utterance-final creak `settled.md`
warns about; it ships at peak -3.5 dBFS, **louder than all 432 word clips**; and its pitch RISES
17.9 semitones where 99% of approved clips fall. The owner called it the sound "we did the least
well" before seeing any of this.

- **Done** The row records what actually produced the bytes, or says plainly that it cannot be
  reproduced and the pin is the only authority. And no future sound is cut from an
  utterance-final position without the creak being checked.

---

## C. The audit trail

### C1. Sixty-four word rows carried no byte pin — CLOSED 2026-08-12

All 432 rows now carry a `byte_pin_sha256`. The 64 that did not were the earliest rounds, from
before pinning began — bad, cab, can, dab, dad, nap, pad, pal, pan, rag, ram, ran and the rest —
and each is now pinned to the sha of the clip that actually ships, which is the audio the owner
graded perfect in the uplift pass. G13 re-derives the chain and passes: 432 rows, 432 locked,
432 treatments, 432 byte pins, 489 clips shipped, 0 problems. A silent re-render can no longer
replace approved audio for any word in the bank.

### C2. Staging during a gauntlet run has put a mutant into a commit twice

- **Where** Process, not code. Recorded in the commit message of `c87ed44`.
- **Today** Both incidents are cleaned up. `c87ed44` is verified mutant-free, and so is every
  commit of 2026-08-11.
- **The fault** The gauntlet rewrites `reference/word-quest.jsx`, `src/engine.js` and
  `tests/generated/` many times over a run, and for most of that time the tree holds a
  deliberate fault. `git add -A` during a run captured one. A killed run left another behind.
  The release-evidence file caught the first by recording the run as `INCOMPLETE, DIRTY`,
  which is what it was built for.
- **Done** The rule is written into the standing rules rather than only into a commit
  message, and ideally the gauntlet refuses to run against a tree with staged changes.

---

## D. Known limits, carried deliberately

These are not defects to fix on a schedule. They are written down so nobody rediscovers them
as if they were news.

### D1. A family pack cannot cover a reveal

The owner ruled on 2026-08-11 that the parent voice-pack recorder STAYS when microphone mode
goes (section A). It records a grown-up reading the word list, into storage on their own
device, and sends nothing anywhere — a different thing from a child's voice going to a
transcription service, and it should not be swept away with it.


`resolvePack` requires one tier to hold every clip in the plan, which now includes
`s:pronounced` and the per-tile sounds. No adult recording will have those, so a family that
recorded every word still hears the default voice for the whole reveal, and their own voice
only in the replay control. Latent while no recorder screen exists. It becomes real the day
one ships, and the family-pack design has to answer it.

### D2. The voice is American and stays that way

`af_heart` is an American voice and all 406 clips are in it, each listened to and accepted.
The owner ruled for American pronunciation on 2026-08-11 for exactly this reason. Canadian,
which the owner would prefer, is not among the model's 54 voices — and for this bank every
Canadian-American divergence is either unreachable or already matched, so the pronunciation
already is Canadian. See `docs/settled.md`.

### D3. Two files are close to the G6 length ceiling

`tests/safety.test.js` is 886 lines and `app/src/App.jsx` is 836. The owner raised the
ceiling from 900 to 1200 on 2026-08-12, so neither file is against it today — but the
guidance is unchanged and is the reason this entry stays open: a ceiling is headroom the
owner granted, not permission to grow into it. A file approaching one is split.

---

## E. Ruled by the owner and not built

Owner-instructed 2026-08-12. This section used to say the opposite — that an unbuilt ruling
belongs in SPEC section 12 and not in this file — and that sentence is why Levels 10 and 11
sat unbuilt for five days while 84 approved words waited for them. Nothing was blocking
them. Nobody was counting them either. The faults list caught faults; a decision of the
owner's that simply never got picked up had no list at all, and SPEC's "road ahead" reads
as a plan rather than a debt.

So it goes here now, with the same rule as every other entry: an item leaves only by being
built, and the result is recorded in whichever document owns the fact. SPEC section 12 keeps
the *design* — the boundaries, the prerequisites, what the feature is. This section keeps the
*debt* — the date it was ruled, and what a child does not have today because of it.

| Ruled | What | Status |
|---|---|---|
| 2026-08-07 | Levels 10 and 11: final and initial blends | **Built 2026-08-12.** 83 words shipped |
| 2026-08-07 | Levels 12 to 15: plural s, compounds, open syllables, magic e | Open. 32 approved words wait on 12, 13 and 14 |
| 2026-08-07 | Heart words grow now: said, of, you, to, do, my | Open. The engine has no notion of a word taught by sight; six approved clips wait on it, and 40 approved sentences cannot be levelled without it |
| 2026-08-07 | Sentence mode | Open. 41 sentences approved by ear, recorded, and unusable |
| 2026-08-07 | Build-it encoding mode, practice only | Open. Not started |
| 2026-08-07 | Speedy words fluency round in the free-play chooser | Open. Not started |
| 2026-08-10 | Level introduction: new sounds, and a review of trouble sounds | Open. Not started |
| 2026-08-11 | Parent tutorial from the home screen | Open. Blocked behind section B, the default sounds |
| 2026-08-11 | Remove microphone mode entirely | Open, and it is section A: the only item here that is wrong today rather than merely absent |

---

## F. The documents and data files themselves

Owner-instructed 2026-08-11. Fifteen tracked `.md` files and eleven `.json` files (excluding
lockfiles) have grown one decision at a time over three weeks. Nobody has ever read them as a
set and asked whether they are still the right set.

### F1. The prose documents overlap and nobody has drawn the boundaries

- **Where** `docs/voice-pack.md` (946 lines), `SPEC.md` (923), `docs/settled.md` (741),
  `docs/testing-gauntlet.md` (587), `CHANGELOG.md` (521), plus `AGENTS.md`, `CLAUDE.md`,
  `README.md`, `docs/qa-procedure.md`, `docs/self-hosting.md`, the two install guides,
  `docs/phonics-handoff-defects.md`, `docs/open-faults.md`, and the generated
  `docs/effect-map.md`.
- **The fault** Three of them are long enough that a reader cannot hold them, and the rule
  that every fact has ONE owning document is asserted but has never been checked. A round's
  result is currently written into `voice-pack.md`, `settled.md` and a CSV; whether that is
  three owners or one owner and two summaries has never been decided. `voice-pack.md` in
  particular reads as an accreted log of twenty-two rounds rather than a document.
- **Not a cosmetic job.** Duplication is how a fact drifts: the "was" note said one thing on
  screen and another in the sound for weeks, and the 2026-08-04 visual ruling sat in
  `settled.md` marked "closed" while the opposite shipped.
- **Done** Each document has one sentence at its head saying what it owns and what it does
  not. Anything duplicated is moved to its owner and replaced by a pointer. Anything that is
  a log rather than a document is split from the part that is standing truth. Nothing is
  deleted without the owner seeing what goes.

### F2. The data files have no stated shape and three of them overlap

- **Where** `tools/voice-lock.json` (5,664 lines), `tools/keepers-treatments.json` (6,982),
  `tools/keeper-bytes.json`, `tools/pending-sounds/pending-sounds.json`,
  `tools/pending-words/pending-words.json` (1,438), `docs/voice-goldens-packs1-3.json`
  (3,647), `app/public/voice/manifest.json` (5,401), `.claude/gate-baseline.json`.
- **The fault** Several are derived from `tools/voice-words.csv` or from each other, and
  which is source and which is derived is knowable only by reading the tools that write
  them. `voice-goldens-packs1-3.json` is named for packs that no longer exist as a concept.
  `pending-words.json` holds sentences under `s:` keys alongside words, which is two kinds
  of thing in one file.
- **Done** Each file states, in the file or in its writer, whether it is source or generated
  and from what. Anything generated is regenerable by a named command, and the check proves
  it. Anything genuinely dead is removed with the owner's sight of it.

### F3. Nothing gates a document going stale

- **Where** G16 doc-truth covers eight rules; G17 covers which files may exist. Rule 8, added
  2026-08-12, is the shape the rest should follow: it binds the "Approved and unshipped" count
  in `docs/voice-pack.md` to the pending ledger, after that heading said 60 while the ledger
  held 156 — fourteen listening rounds of the owner's own time, undercounted by a document
  nobody had reason to re-read.
- **The fault** G16 checks a small number of specific claims — gate floors, a few timings,
  the recipe numbers. It cannot see a paragraph that describes an old behaviour, which is
  how SPEC section 5 came to describe the pre-reveal utterance until it was rewritten by
  hand on 2026-08-11.
- **Done** More of what the documents assert is derived from the code rather than typed
  beside it, so the gap cannot open silently.

---

## G. Ideas worth trying that nobody has tried

Owner-instructed 2026-08-12. Unlike every section above, these are **not** faults and not
rulings: they are approaches that looked promising in conversation and would otherwise be
lost the next time a context is condensed. An idea leaves this section by being tried, and
the result goes wherever it belongs — `docs/settled.md` if a measurement closed it, a round's
row if an ear did. **Trying one is never a substitute for the game work it was meant to
serve, and nothing here may be counted as progress until it has been tried.**

### G0. Nothing enforces the reading of `docs/settled.md`

This is a fault, not an idea, and it sits at the head of this section because it is what
produced the idea below.

- **Where** Rule E10 in `CLAUDE.md`; the reading order in `AGENTS.md`, where `docs/settled.md`
  is item 3 with its reason attached.
- **The fault** Every other load-bearing rule in this project has a gate. E10 has none. It is
  the one rule that depends entirely on an agent choosing to comply, and on 2026-08-12 it
  failed exactly as designed to fail: round 1 for the word "a" was built from five plain
  phoneme renders and offered to the owner, while `docs/settled.md` already held **"Phoneme
  renders are robotic and are not offered again"** and **"A new word is cut from a carrier,
  never rendered plain. Do not spend an arm on a bare render again."** The file is not
  orphaned and was not hard to find. It was not read. A listening round was spent proving
  something the project had already proved, which is the precise cost E10 exists to prevent.
- **Why a checklist is not the answer** A rule that says "read the file" cannot be checked,
  and a declaration that a file was read is worth nothing.
- **Done** The mechanical parts of `docs/settled.md` become refusals in the code that builds
  a round, so a settled question cannot be re-opened by accident. The first three are ready
  to write and would each have stopped round 1 on its own:
  - an arm with no carrier is refused — "never rendered plain";
  - an arm cut from the END of its carrier is refused for a word that is also a letter name —
    the trap that put `eɪ` into four arms;
  - an arm whose family has already been refused for that word in an earlier round is
    refused, since the round history is in `tools/voice-words.csv` and can be read.
  The parts that are judgements, not rules, stay judgements and stay in prose.

### G1. Use the phonemiser to check a clip's CONTENT before anyone listens

This is the biggest idea in the list, it has now paid for itself twice in one day, and it is
still applied in only one place.

- **The idea** The rendering stack contains a grapheme-to-phoneme step, and it can be asked
  what a piece of text WILL say before a single sample is rendered. That turns a whole class
  of "we found out by listening" into "we knew before we asked". It costs milliseconds and no
  round.
- **What it caught on 2026-08-12, for the word "a"** Every carrier ending on the word — plain
  `"a"`, `"Listen—a."`, `"The printed word is “a”."`, `"Say a."` — phonemises to `eɪ`, which
  is the LETTER NAME, forbidden by S4. Four of six arms in the first field were saying "ay",
  and no amount of careful listening would have told anyone WHY. It also found the way out:
  `"a. a. a."` is `ɐ ɐ eɪ`, so a cut from the first two is the real word. The owner's
  suggestion and the phonemiser agreed, and the phonemiser is what proved it.
- **What it caught second** Comparing the island count of a carrier against its phoneme count
  refuses a cut whose instances have partly merged — which is the only way to tell one schwa
  from two schwas offered as one word. It refused eight of twelve arms that had already
  passed the island check and the length guard, and those eight would have gone to a listener.
- **Where it is used today** `tools/render_a.py` only.
- **What already exists, and what this would add.** The record of which bake choices worked
  is not missing and must not be duplicated. What worked lives in `tools/voice-words.csv`,
  one row per word with the winning family, its round and the owner's words — 56 distinct
  families across 432 rows — and in `docs/voice-goldens-packs1-3.json`, 57 human-accepted
  clips with their full recipes ("Ears win over scores"). What did NOT work lives in
  `docs/settled.md`, which is a list of closed approaches and failed proxies, and in the
  round-by-round story in `docs/voice-pack.md`. The phonemiser adds nothing to that record:
  it moves a class of fault EARLIER, from "a listener told us" to "the build refused it".
- **Worth trying next, in rough order of value:**
  - A pack-wide sweep: phonemise every word in the bank and compare against the sound the
    tiles will show. This is the same class of fault as `th` shipping the unvoiced sound for
    all fourteen th words, and B3's `what` playing a vowel nobody chose — but caught by a
    script in seconds rather than by a listening round.
  - Wire it into `tools/render_batch*.py` so a carrier that mis-says its own word can never
    be rendered, let alone offered.
  - A G13 rule: a shipped word clip whose recipe carries a carrier must have that carrier
    phonemise to the word, not to something else.
- **The catch, and why this is an idea rather than a task** The phonemiser is GPL and lives
  only in the developer environment; nothing about it ships (`docs/voice-pack.md`, Licensing).
  It is also only reachable after `kokoro_onnx` initialises, which sets up its library path —
  importing it first fails with "espeak not installed". Any check built on it therefore runs
  where the renderer runs, never in CI, and never as a gate a release depends on. That
  boundary needs the owner's ruling before it is built into anything.

### G2. Judge the stitched sentence against the natural one

- **The idea** The owner ruled on 2026-08-12 that a sentence ships as one natural recording,
  on the strength of a length measurement, and then asked to hear the alternative rather than
  read about it. `tools/compare_stitch.py` builds every batch-3 sentence both ways.
- **Status** Built, not judged. It waits behind the word "a", because twelve of the
  thirty-two sentences need it.
- **The honest caveat that must travel with any number it prints** Its ratios are whole
  encoded clips, both carrying the same 380 ms of padding, which FLATTERS the stitch. The
  2.07× in `docs/settled.md` is speech against speech. The two figures are not comparable and
  neither page nor report may present them as if they were.
