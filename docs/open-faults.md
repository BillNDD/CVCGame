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

## A. Remove microphone mode — CLOSED 2026-08-12

Ruled on 2026-08-11 — "I don't think it's safe or appropriate the more I think about it" —
and done the next day. A child's voice is no longer sent anywhere, because the app can no
longer capture one. Deleted, not disabled: a feature that is only turned off is a feature
somebody turns back on.

**What proves it, and why the proof was built first.** `tools/mic-absence.mjs` checks three
things: the terms appear in no tracked source file; they appear in nothing the build ships;
and a real browser, driven through a graded session and the Grown-ups corner, never reaches a
recogniser constructor or a capture device. It was written and run BEFORE a single line was
deleted, against commit `6699d22`, where all three went RED on real hits — 29 in source, 6 in
the built payload, and the running app reaching `SpeechRecognition` during a graded word.
That commit is the negative control and it existed exactly once: after the deletion there is
no tree left in which a broken detector would go red, so "the microphone is gone" would have
been unfalsifiable forever. It carries four self-test controls, including one proving the
allowlist suppresses exactly the file it names and nothing else.

**A2 caught two of my own faults before the owner saw them.** The runtime check originally
read its evidence AFTER a final navigation, and Playwright re-runs its init script on every
navigation — so the array was wiped and the whole session walk was erased, while the tool
printed "a whole session reached no recogniser". It had already been reported as proof. It
now reads before navigating and refuses a run that graded no word. The source scan walked the
filesystem and picked up `reference/.mutant.jsx`, a gitignored file the mutation gate leaves
behind on a killed run; it now asks git for tracked files, which is what its own header
always claimed.

**Floors.** Only `g15_recognizer_tests` (51) was a whole gate. It moved to the `_retired`
block of `.claude/gate-baseline.json` with its last value, the date and the reason, rather
than vanishing — a key that simply disappears cannot be told from a key deleted to pass a
build. Seven more moved and each is argued in the commit. `g13_engine_tests` ROSE, 10 to 11.
Every coverage floor held: App.jsx lines 93.76 against a floor of 93 and branches 93.4
against 80, so the fear that deleting the best-tested code would drop the percentages was
measured and did not happen.

**What was NOT the reason.** S1 held throughout: recognition never recorded a wrong answer,
only ever confirmed a correct reading. The fault was where the audio went, never how it
judged. S6 needed no edit either — removal is what made its existing words true.

**What was lost, plainly.** A child could tap Record and practise alone. They cannot now:
every word needs a grown-up's 450 ms hold. The owner accepted that on 2026-08-12 — "the game
is meant to be parent and child together anyway". A practise-alone mode that grades nothing
would restore it and is not part of this work.

**Two things kept on purpose.** `microphoneUsed()` and `reclaimOutput()` in `voicepacks.js`
have no caller now and must not be deleted: iOS moves the whole audio session to "play and
record" when ANY capture device opens, and the family voice-pack recorder — which stays, see
D1 — will open one. QA step 37 is parked for the same reason, with the reason written into
the step.

**The last loose end, ruled the same day.** `app/src/pronunciation.js` — the SPEC section 8
item 4 cloud scoring stub — took a Blob of the child's voice and had shipped unused for
months. It was deliberately NOT deleted with everything else, because the owner had ruled on
the diagnostic page and not on this, and reading a ruling wider than it was given is its own
kind of dishonesty. Put to the owner as its own question and ruled on 2026-08-12: delete it.
Gone, with SPEC item 4 and its coverage exclusion. `assessPronunciation` stays in the absence
tool's term list precisely because the code is gone — it is now the tripwire against the idea
returning without a fresh ruling.

## B. The default sounds — the whole class of fault that let `th` ship wrong

The owner asked for this group to be put first, on 2026-08-11. Section A arrived later
the same evening and is child-facing, so it went above it, and both are now closed.

**Every default in this section has been closed as of 2026-08-12** — B1, B2, B5, B6, B7, B8,
B9, B14 and B15. What remains below is not a default that nobody decided: B11, B12 and B13
are questions about the QUALITY of sounds a listener has already judged, and they need ears
rather than code.

A default is not a decision. It is the absence of one that still produces audio: a grapheme
with no ruling still returns a valid clip id, `resolvePack` still resolves, the voice gate
still passes, and a child is still taught something. That is exactly how `th` played the
wrong sound for months without a single gate noticing.

### B1. The grapheme fallback — CLOSED 2026-08-12, owner-ruled (option 2)

`soundIdFor` is still `"d:" + (TILE_SOUND[g] || g)`, and the 23 graphemes on the fallback are
still correct — swept against the whole bank on 2026-08-11 and put to an adversarial verifier.
What was missing was any way to notice GROWTH: a new grapheme inherited a clip named after
itself and nothing failed.

The roster is now pinned literally in `tests/engine.test.js`, in both halves: the 16 named in
`TILE_SOUND` as stated decisions, and the 23 that take the fallback. A count alone would not
have done it — swap one grapheme for another and the size is unchanged. Adding a grapheme now
fails the test until a person puts it in one list or the other, and that is the moment the
decision gets made.

### B2. 419 words take the general mapping — CLOSED 2026-08-12, owner-ruled (option 3)

Re-sweeping by ear costs days of the owner's listening, which is the wrong price for a guard.
`tools/sound_agreement.py` derives the expectation instead. The synthesiser publishes the
phoneme string it is about to speak, so for every word both sides of the comparison are
available without a listener: what the sound-out CLAIMS (the tiles a child sees) against what
the voice SAYS. A disagreement is a word where the screen and the sound teach different things —
exactly the `was` fault.

Three controls: a `was` restored to the general mapping is caught, the shipped `was` agrees, and
a plain word raises nothing. Run with `npm run check:sounds-agree`; it stays out of `npm run
check` because it needs the synthesiser environment, the same reason the word-gate island
control stays out of the gauntlet.

**Its limit, and it is load-bearing.** It compares the sound-out against what the SYNTHESISER
says, not against correct English, and it phonemises the word rather than reading the shipped
clip. If the model mispronounces a word consistently, both sides agree and both are wrong. It is
a refusal, not a proof. The sweep of 2026-08-12 raised two words — see B15.

### B5. The tile ring's fixed fallback length — CLOSED 2026-08-12

There is no fallback length any more. A ring is drawn only where the sound's own measured
length is known, and where it is not the reveal simply shows no rings — which is the reveal
as it always was before the sound-out, not a degraded one.

Two places carried the fault, and only one of them was the one this entry named. The known
one was `animation:wqpop var(--wqpop, 700ms)`: a source that could not report a length got
handed back the exact fault fixed on 2026-08-11, a fixed 700 ms that outlives the four short
plosives and runs out 236 ms before /w/ finishes in "win". The one nobody had noticed was the
reduced-motion rule, which hard-coded 700 ms with `!important` — so on every device with
reduced motion switched on, **every ring was already the wrong length**, measured pack or
not. That was live, not theoretical.

Both now take `var(--wqpop)` with no default, so a missing length makes the shorthand invalid
and nothing animates; and the component declines to add the class at all. Two locks on one
door, because a ring against the wrong sound teaches a child the wrong piece of the word.

### B6. A family pack's speech-to-speech spacing — CLOSED 2026-08-12

Family clips are now MEASURED on the way in, which is the first of the two options this entry
allowed and the better one: the alternative was for the sound-out to decline a parent's own
voice, which would have gutted the feature to protect it.

`measureEdges()` uses the same method the shipped pack was measured with — 10 ms frames, RMS
in dB against the clip's own peak, anything below -45 dB is not speech — because the two
numbers meet inside one calculation. The sound-out pulls each entry back over the previous
clip's tail and the next one's lead so that what a child hears between two sounds is the
500 ms the owner approved; two different definitions of "where the speech starts" would give
two different rhythms with nothing to say which was which.

`edge()` no longer asks which tier a clip belongs to. It asks whether the clip has a
measurement. A clip stored before today, or one the browser cannot decode, stays PLAYABLE and
stays UNMEASURED — it is never given zeros it did not earn, which is the whole fault here —
and an unmeasured clip gets no ring, by B5's rule.

### B7. Falling through to system speech left no trace — CLOSED, REOPENED, CLOSED AGAIN 2026-08-12

**Wrongly closed the first time, the same day, and here is how.** The record below said "there
were four and each carries its own words". There are **five**. The fifth, in `playPlan()` in
`app/src/voicepacks.js`, called `fallback()` with no argument — the path taken when the audio
context is not running at the moment the words are due. That is the most likely fallback of all
on an iPhone or iPad, where the browser suspends the context and only a fresh touch resumes it.
The one device family most likely to fall back was the one that recorded no reason for it.

I counted the call sites that already passed a reason and wrote that total down as if it were
the number of call sites. Found on 2026-08-12 while chasing the owner's report that the game
was not saying the sounds after the word and no tile was ringing — which is exactly what this
path produces. It now names the reason and the context's own state with it.

Every fallback path now says WHY, and the reason reaches the Grown-ups corner. There are five
and each carries its own words: no audio player on this device, the pack did not load, the pack
has no clip for a named id, the player was not running when the words were due, or playback
threw. The message a grown-up reads says what still
works — the words are spoken, results are saved — and what does not: the sound-out will not
light up letter by letter.

Two tests, because one would not have been enough. The notice must APPEAR after a fallback with
its reason in it, and it must be ABSENT when the recorded pack played — a notice that shows up
either way is noise a parent learns to ignore. Floor raised 13 to 15.

Nothing on the child's screen changed, and nothing about it is saved: it describes this device
right now, not the child's progress.

### B8. The fourteen parked sounds — CLOSED 2026-08-12

Checked rather than believed: **none** of air, ar, aw, ear, er, long_a, long_i, long_o,
long_u, oi, oo_moon, ow, or, zh is required by any of the 432 words in the bank today. All
fourteen are confirmed as future work for Levels 12 to 15.

The regression is guarded, and the guard was verified rather than assumed: `voiceScript()`
derives the required clip list from `soundInventory()`, and G13 fails on a required clip that
is not shipped. So the day a bank word starts needing one of the fourteen, the voice gate
goes red and names it. That guard is only as complete as the inventory, which is why B9 below
had to be fixed in the same change.

### B9. `soundInventory()` walked `LEVELS` only — CLOSED 2026-08-12

Both the inventory and the render script now walk `bankWords()`: every word the app NAMES,
which is the union of every level's words with the keys of `TRICKY` and `WORD_SOUND`, those
being the other two places a word can be named.

The count did not move — 432 words before and 432 after — and that is the finding, not a
disappointment. The old code was correct by coincidence: every tricky word and every
bent-sound word also happened to sit in a level. A word reachable any other way would have
had no sound clip and no word clip, `resolvePack` would have returned null, and that word
alone would have dropped to system speech — the hardest kind of fault to notice, because
every other word still worked.

The heart-word roster (SPEC section 12) is the next thing that will name words this way, and
it must not have been the thing that found it. A test pins the union with a negative control:
a fixture where a word is named only in a tricky note, which the old LEVELS-only derivation
misses and the new one does not.

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

### B14. The mastery map told a parent their child failed — CLOSED 2026-08-12

Reported by a user with a screenshot: "he clicked and held 'got it' for most of these words but
the game is tracking it as unmastered". Verified against the engine: nothing was broken and no
result was lost. A first correct reading reaches box 3, mastery is box 4, so **every amber word
was one the child read correctly.** The fault was that the screen could not be read correctly by
the person it is for — three colours with no key, and a single "2/12 mastered" that reads as a
verdict on the child.

Fixed, owner-ruled, both halves:
- **A legend**, naming all four colours in a grown-up's words: read right twice, read right once,
  not yet, not tried.
- **Two numbers instead of one**: every level row now reads "N/M read · N green", so what the
  child DID comes first. The word "mastered" is gone from the per-level row.
- **A line saying why green takes time**: two correct readings on different days, and the gap
  between them is the point.

Measured in the rendered page by G7 checks 36 and 37, not just in the source — a legend that
exists only in the code is a legend nobody sees. Floor raised 35 to 37.

Moving mastery to box 3 would also have made the screen look better and was deliberately NOT
done: one reading is not mastery, `buildSession`'s confidence pool is defined on box 4, and a
display fault is not a reason to change what the game teaches.

### B15. Two words where the tiles and the voice disagreed — CLOSED 2026-08-12

Both moved to meet the voice, ruled by the owner after hearing each sound-out both ways.

- **`with`** now takes the buzzy th. It had been reasoned onto the quiet one under the American
  ruling of 2026-08-11 — sound reasoning, wrong answer, because the af_heart clip that actually
  ships says /wɪð/. An accent argued from is not the accent in the file.
- **`what`** now teaches short u, reversing the owner's own ruling of the same morning. That
  first ruling was made from the word clip alone; offered the whole sound-out both ways they
  refused w-o-t. Its tricky note moved with it.

The sweep is now at **0 disagreements across 432 words**. 46 remain unalignable (tile count and
phoneme count differ) and are evidence of nothing either way.

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

### C3. A detector that exists, in a gate that does not run before a push

- **Where** `tools/quality-control.mjs`. It runs under `npm run lint:quality`, which is a
  gauntlet step. `npm run check` — the thing E7 requires before every push — does not call it.
- **Today** The dead-`font:` scan is now duplicated as safety test 8 in the fast suite, so that
  one fault cannot ship again. The other three refusals in the tool — the complexity ceiling,
  the dependency-cycle check and the config baseline — still run only in the gauntlet.
- **The fault** This cost a real defect on 2026-08-12. The tool has refused a `font:` shorthand
  ending in `inherit` since 2026-07-29, with the incident that motivated it written into the
  stylesheet's own header. A rule written that morning — `font:700 9px/1.45 inherit` on the
  session path's label — was invalid for exactly that reason, `npm run check` passed, and the
  label rendered at the inherited size: 127 px wide on a 320 px screen where it should have been
  78. A detector nobody runs before a push is not a detector, it is a record of a thing somebody
  once knew.
- **Done** Every refusal in `quality-control.mjs` either runs in `npm run check` or is written
  down here as deliberately gauntlet-only, with the reason. Moving the whole tool is not the
  answer: it takes 32 seconds, nearly all of it complexity analysis, and how long the check may
  take is the owner's budget (2026-08-02).

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
