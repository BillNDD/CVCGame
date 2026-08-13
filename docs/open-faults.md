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
**As of the beta.18 release gauntlet on 2026-08-13, commit `a70406d`, that reads 23 gates,
67 source mutants, 273 tests and 499 clips**, with a clean tree and no gate skipped. The test
count fell from 341 because the microphone's 51 recognizer tests retired with the feature; the
clip count rose with the heart words and then fell by one when "gob" left the bank; and the
gate count rose by one for the E11 lookup's own planted faults. The line above is kept as the
state when this document was opened; a "state at the time of writing" that is quietly edited
stops being one.
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

Checked rather than believed, **as the bank stood that morning**: none of air, ar, aw, ear,
er, long_a, long_i, long_o, long_u, oi, oo_moon, ow, or, zh was required by any of the 432
words then in the bank. **Two of them came back the same day**: `long_i` for "my" and
`oo_moon` for "to", "do" and "you", when the heart words were seated and their sound-outs
heard. Both ship. The parking was right when it was done and the sentence needed the date
attached to stay true — a "checked rather than believed" claim with no date is a claim that
expires silently. All
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

## B17. The advance control goes live for half a second in the middle of a reveal

**THIS REOPENS A FIX THAT WAS CALLED DONE.** The changelog has carried "Fixed: the advance
control could come alive in the middle of a reveal when the clips took longer than usual to
load" since the reveal was built. That fix was real and it was incomplete: it closed the case
where the control stayed live for the WHOLE reveal, and left ~590 ms open between the guard
firing and the real length arriving. CLAUDE.md requires that a fix found to be incomplete is
reopened, with what is missing and how it came to be closed — this paragraph is that record,
written after an auditor found the changelog telling a parent the same fault was both fixed
and outstanding. The changelog bullet now says so too.

**Owner-ruled 2026-08-12: this ships in the next beta and is fixed in the one after.**
That release is beta.18, not beta.17: beta.17 had already been published on 2026-08-11 and
the version in `app/package.json` was never moved on, so a day of work called itself 17. It predates
every beta already installed, so shipping makes nothing worse, and the fix touches the arming
logic that produced a regression the last time it was changed in a hurry — the progress fill
ran backwards and G7 caught it. It is named in the beta's changelog as a known issue, because
a parent should hear it from us rather than meet it.


Found by an independent reviewer on 2026-08-12, through the UX census, and it is the first
child-facing fault the census has produced. It is a candidate: measured on this machine under
an induced delay, not yet seen by a person on a real device.

- **Where** `armAdvance()` in `app/src/App.jsx:296-329`, and the code already knows: its own
  comment says the guard's early arrival "would leave the control live for the whole
  seven-second reveal... The first tap then kills the sound-out, which is the one thing the
  wait exists to protect (CVC-UX-001)."
- **What happens** The control is armed TWICE. The 400 ms guard arms it, and when the
  reveal's real length is known the app takes it back and re-arms it for the true duration.
  Between those two moments the control is **enabled, green and tappable, in the middle of the
  sound-out**. A tap there calls `next()` and kills the reveal.
- **Measured**, with the voice clips delayed 900 ms so six of them miss the 400 ms guard:

  | moment | control | focus |
  |---|---|---|
  | +6 ms | disabled | body |
  | +192 ms | **live** | the button |
  | +779 ms | disabled again | body |
  | +8726 ms | live for good | the button |

  **~590 ms of open window**, in the middle of a reveal.
- **When a child would meet it** Whenever six clips take longer than 400 ms to fetch and
  decode: the first word after a cold load, a slow phone, a busy device. Never at idle on a
  warm cache, which is why no gate has seen it — every existing browser check runs warm.
- **Why it was nearly lost** The same double-arming made the census report `focus-lost`,
  because disabling a focused button drops focus to `<body>`. That was written off as machine
  churn and the census's worker count was lowered. The reviewer reproduced it deterministically
  instead. A finding explained away as flakiness is a finding lost.
- **Done** The control is never live during a reveal: the guard does not arm it until the
  reveal's real length is known, with the 400 ms as a floor rather than a starting gun — or an
  equivalent that closes the window rather than closing it late. Proved by a test that plants
  the slow-clip condition (delay `**/voice/**`) and asserts the control is disabled for the
  whole sound-out, with a control proving the test fails when the window is open.

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

## H. The heart words that did not ship on 2026-08-12 — ALL CLOSED 2026-08-12

Four shipped in the morning — to, do, you, said. The other three followed the same day:
`my` and the seat ruling took one decision each, and `of` took three listening rounds.

### H1. `my` — CLOSED 2026-08-12

Shipped to Level 2 with the other heart words, and `d:long_i` shipped with it. The
blocker was never the audio: the clip had been graded perfect since 2026-08-07 and the sound
was graded perfect the day it shipped. It was a seat, and the owner gave it one.

### H2. `of` — CLOSED 2026-08-12, in three rounds

Shipped to Level 2, sounded out **o → short_u, f → /v/**, graded `perfect` in round 3. The
fault was in the `v`, not the vowel: it sat 6.2 dB louder and 400 Hz brighter than the sound
beside it, having been graded perfect ALONE in SND16 and never in company — B11's story
again. It was
re-cut −7 dB with the top rolled off at 1800 Hz and 40 ms fades. **That clip went bank-wide for
about an hour and the owner ruled it back the same evening**: `d:v_soft` is "of"'s alone, and
van, vet, vat and vex keep `d:v`, which was graded perfect for them in SND16 and sits within
0.7 dB of its neighbours there. This paragraph said "every /v/ in the bank now takes that clip"
until an auditor read it — a closed entry describing a state the repository had already left. The full record, including the recipe and the two hash
refusals that guard it, is in `docs/settled.md`.

### H3. What a heart word's SEAT means — CLOSED 2026-08-12

Ruled: the level is where the CHILD MEETS the word. All nine heart words sit at Level 2,
`tools/decodable.mjs` now reads the same seats the engine does, and a guard throws if a heart
word is ever seated later than Level 2. Every one of the 40 approved sentences is now
levellable and none is claimed below where a child can read it — it was 32, 8 blocked and 12
mis-levelled. Recorded in `docs/settled.md`.

## C. The audit trail

### C1. Sixty-four word rows carried no byte pin — CLOSED 2026-08-12

All 432 rows now carry a `byte_pin_sha256`. The 64 that did not were the earliest rounds, from
before pinning began — bad, cab, can, dab, dad, nap, pad, pal, pan, rag, ram, ran and the rest —
and each is now pinned to the sha of the clip that actually ships, which is the audio the owner
graded perfect in the uplift pass. G13 re-derives the chain and passes: 432 rows, 432 locked,
432 treatments, 432 byte pins, 489 clips shipped, 0 problems. A silent re-render can no longer
replace approved audio for any word in the bank.

### C4. G22 is documented as a gauntlet gate and is not one

- **Where** `docs/testing-gauntlet.md` describes G22, the microphone-absence check. `tools/gauntlet.mjs`
  and `.claude/gate-baseline.json` contain **no reference to it** — 0 hits for "G22" or
  "mic-absence" in either. The 22 gates that run do not include it.
- **What that means** The headline safety claim of beta.17 — that the microphone is gone from
  the source, the bundle and the running app — rests on a hand run of `tools/mic-absence.mjs`
  by whoever remembered. It is a real tool with real controls, and nothing schedules it.
- **And the same document's allowlist warning is now stale**: it says the allowlist "is empty
  and prints on every run" in the paragraph explaining that "an allowlist that grows quietly is
  how a detector stops detecting". It has two entries, added 2026-08-12.
- **Found** by a release auditor on 2026-08-13, checking whether the release's own safety claim
  was backed by a gate.
- **Done** G22 is wired into `tools/gauntlet.mjs` with a floor in the baseline like every other
  gate, or the document stops calling it one. The first is right: a safety claim with no gate is
  the C3 fault, and C3 is the reason the quality lint now runs in the check.

---

### C2. Staging during a gauntlet run has put a mutant into a commit — THREE times now, and it finally has a gate

**2026-08-12, the third time, and mine.** At 22:44 I ran `git add -A` while a gauntlet was
running in the background. The acceptance-mutation gate had `tests/generated/acceptance.test.js`
mutated at that instant, and the commit captured it: the repository asserted that `dashed("ax")`
is **"a-xx"**, which is not what the game does and not what any listener approved. It went
unnoticed because every later run REGENERATES that file before using it — so the tests passed
locally while the repository held a lie. The gauntlet's own evidence caught it, by refusing to
say PASS on a dirty tree: **INCOMPLETE, commit 882ab9a DIRTY**.

**The mechanism, at last.** `npm run check` now begins with `check:acceptance` — regenerate,
then `git diff --exit-code -- tests/generated`. A committed mutant fails the very next check
rather than surviving to a release, which is what happened all three times. Two notes and a
rule did not stop this; a gate takes half a second and does.

**It is a net, not a cure, and it brought its own hazard.** Because `check:acceptance` WRITES
those files, running the check during a gauntlet erases a planted mutant and makes G4 report a
survivor that was never alive. That is recorded in `docs/testing-gauntlet.md`. **The cure is
for the mutation gates to mutate an UNTRACKED copy** so the window never opens at all —
`tools/mutants.mjs` writes a temporary reference file already, but `tools/acceptance-mutants.mjs`
and `tools/app-mutants.mjs` both edit tracked files in place. Until that is built, C2 stays
open with a net under it.



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

`af_heart` is an American voice and every clip in the pack is in it — 406 when this was written, 500 today — each listened to and accepted.
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
| 2026-08-07 | Heart words grow now: said, of, you, to, do, my | **Built 2026-08-12.** All nine heart words sit at Level 2 — the, and, to, do, you, said, my, of, a — with S8 gaining ai and ou and the engine gaining a HEART roster. `of` took three rounds of its own, `my` needed only a seat, and `a` shipped the same evening from the owner's own schwa package |
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

## J. From a real child's backup, 2026-08-13

A parent sent the child's export. Three things came out of it; one is fixed, two are open.

### J1. The letter "a" says two sounds and nothing says so — owner-ruled 2026-08-13, NOT BUILT

- **Where** `WORD_SOUND.a = { 0: "schwa_a" }` against `TILE_SOUND.a = "short_a"`.
- **What a child gets** The tile `a` says the lazy uh of the word "a", and the same single tile
  says the a of cat everywhere else. "a" is the only single-letter word in the bank, so it is
  the only place a child sees one tile alone and hears a sound that tile never makes elsewhere.
  The child met it in session 5 beside `and`, `bad`, `mad`, `rap`, `tag`, `bag`, `rag`, `yap`,
  `dab` — nine short-a words and one schwa, no signposting. The parent's words were "the letter
  a is handled terribly".
- **Ruled** When a word bends a tile away from that letter's usual sound, the reveal says so in
  child-facing words. It applies to every bent sound, not only "a".
- **Done** means the wording exists, the owner has approved it, and if it is spoken it has been
  through a listening round. Not started: the copy is the owner's to write and S3/S4 govern it.

### J2. `settings.mode: "mic"` survives a feature that no longer exists

- **Where** `migrate()` passes `settings` through; the microphone was deleted on 2026-08-12.
- **What happens today** Nothing: no code reads `settings.mode` any more. It is stale state that
  outlived its feature, carried by every player from before that date.
- **Done** means `migrate` drops settings whose feature is gone, with a control.

## G. Ideas worth trying that nobody has tried

Owner-instructed 2026-08-12. Unlike every section above, these are **not** faults and not
rulings: they are approaches that looked promising in conversation and would otherwise be
lost the next time a context is condensed. An idea leaves this section by being tried, and
the result goes wherever it belongs — `docs/settled.md` if a measurement closed it, a round's
row if an ear did. **Trying one is never a substitute for the game work it was meant to
serve, and nothing here may be counted as progress until it has been tried.**

### G3. A deep UX census — BUILT 2026-08-12, and not yet trustworthy

Owner-requested 2026-08-12, from the same investigation they are running on their maths game.
**Built the same day** on the Playwright test runner: `npm run census`, with the layout classes
in `tools/ux-census.mjs`, the cells in `tests/census/ux.spec.mjs`, the negative controls in
`tests/census/controls.spec.mjs`, and seven viewport projects in `playwright.config.mjs`.
`@playwright/test` joined the dependencies with the owner's approval.

**Owner-ruled 2026-08-12, after an investigation of what Playwright actually offers: EVERY
capability below is used in the NEXT census, before the next beta.** All of them were verified
present in this environment rather than recalled from documentation.

| capability | what it would catch that today's census cannot |
|---|---|
| `toHaveCSS` on font sizes | the 4x label fault this census was written for, which it measures and never asserts |
| `toBeInViewport({ratio})` | below-the-fold, properly, instead of a hand-rolled box comparison |
| `toMatchAriaSnapshot` | what a screen reader is told, pinned as a readable file in git |
| `page.clock` | timing faults without flakiness — freeze and advance instead of waiting |
| the four unvisited states | the close reveal, the wrong reveal, the done screen, the update row |
| overlap beyond a control's centre | the home-screen images that overlapped, which point-sampling misses |
| `setEmulatedVisionDeficiency` | the green and red result controls, as a colour-blind parent sees them |
| `emulateMedia` forcedColors / contrast / colorScheme | Windows High Contrast, `prefers-contrast`, dark mode |
| `setCPUThrottlingRate` + `emulateNetworkConditions` + `route` delay | B17's whole class: faults that exist only while things are still loading |
| `@axe-core/playwright` | contrast, names, roles and focus order on every cell instead of three screens |
| `devices` (207 descriptors) and `deviceScaleFactor` | real phone and tablet profiles, and retina fractional-pixel layout |
| `blob` reporter | merging shards, which is the missing half of a two-shard run |

**And the gap that matters most, found by reading the installed package rather than the API:
only Chromium is present.** Playwright ships WebKit and Firefox by default and this container
has neither. The install guide tells a parent to add this game to an **iOS home screen**, and
iOS is WebKit — always, in every browser. So every browser check this project has ever run,
including all 371 census cells, has run on an engine an iPad user never touches. This
environment is configured not to download browsers, so closing it needs a different machine:
a CI runner, or the owner's own. It is the single largest hole in this project's evidence.

**Owner-ruled 2026-08-12: all of it, and the other browsers first.** The census runs on
Chromium, Firefox and WebKit before the next beta. Lighthouse and element-scoped screenshot
baselines are in scope too, with the caveat that a baseline made on one machine is a statement
about that machine — so baselines are stored per browser and per runner, and a mismatch on a
different one is not a finding. What WebKit on Linux can and cannot stand in for is written
into the census's own report: it is the same engine core as iOS Safari, not the same build,
and it is much closer to an iPad than Chromium has ever been.

**The build spec lives in `docs/testing-gauntlet.md`**, under "The next census" — every
capability mapped to the exact Playwright API and the fault it catches, so the work can be
picked up by whoever opens the repository next without re-doing the investigation.

**Its cadence is ruled: every other beta** (owner, 2026-08-12, in their own words). Not in
`npm run check`, which is thirty seconds by the owner's own ruling and would be minutes with
this in it; and not in the gauntlet, where a flaky cell would block a release rather than
inform one. A survey run on every push stops being read, and one run only when somebody
remembers is one that never runs.

**FLAKINESS CLOSED 2026-08-12, and the census has now run in full**: 338 cells over 7
viewports, 0 failures, 0 flaky, 54.8 minutes, recorded in `.census/report.json`.

**WHAT THAT RUN PROVES, AND WHAT IT DOES NOT.** It proves the geometry findings — no overflow,
no element past the edge, no nested scroll, every control at or above its S7 floor, nothing
obscured, nothing required below the fold — plus the tile COUNT against the engine's own split,
no page or console errors, no request off the app's own host, and free play writing nothing.
**It does not prove that the accessibility tree names the tiles**, because the assertion that
claimed to check that could not fail: it matched letters inside the praise sentence. That was
found by an auditor after the run, and the replacement — the visible tiles compared with
chunkWord() in order — has been proved against a planted mutant but **has never run over a
full census**. Quote the run for the checks it made, not for the one it did not.

**A correction to how that was reported.** The commit that replaced the assertion says, in
capitals, that deleting the entire tile row still passed. That is true of the ASSERTION and
false of the CELL: the cell waits for a tile and compares the count, so it would have failed.
The assertion was decoration; the cell was not defenceless. An overstated confession is still
an unverified claim. The three
causes were two detector bugs of mine and Chromium churn at four workers. The paragraph below
described the state before that and is kept because it says what the run may be quoted FOR:
the checks that exist, not the ones the spec above adds.

**What was not done, and it is the part that mattered:** the run was FLAKY. A different handful
of cells fails each time, and a cell that fails in a full run passes when run alone. Until
that is settled the census cannot be quoted for anything — a census that gives a different
answer each time is not evidence, and worse, it can hide a real defect inside its own noise.
No benchmark, and no run on the other six viewports, until it is fixed.
The 50 interface checks (G7) prove that specific measurements hold on specific screens. They
do not prove that **every word in the bank renders correctly**, and no gate in this project
does. A word is content, and content is where layout breaks: a five-letter word with four
tiles, a heart word whose tile is two letters wide, a praise line that wraps to three rows on
a small phone.

**What brute force would cost, and why it is the wrong shape.** 438 words × 5 viewports ×
roughly 8 states is about 17,000 renders — hours of laptop time and a pile of evidence nobody
will read. The maths game's answer applies here: group the content into **equivalence
families**, take every unique family and every extreme, and render those.

**The families, measured from the bank rather than guessed:**

| family | population | why it can break differently |
|---|---|---|
| 2 tiles | 19 words | the shortest tile row — centring, and the reveal ring on a lone pair |
| 3 tiles | 340 words | the ordinary case, and the one every check already covers |
| 4 tiles | 79 words | the widest row; where a phone runs out of horizontal space first |
| multi-letter tiles | 16 units (`ai ch ck ff kn ll mb ng ou qu sh ss th wh wr zz`) | one tile twice as wide as its neighbours, S8's whole point |
| longest string | `check` (5 letters, 4 tiles) | the extreme case for tile width |
| 17 praise lines | longest is "How do you feel about saying that word correctly?" | the only child-facing text that wraps |
| 11 level names | longest is "Rocket Words" | the strip, beside the emoji and the counter |
| progress track | 7, 10 and 20 columns | already gated at 10 widths; the census re-checks it against every level length |

**The states, per family:** the word on screen, the correct reveal with its tile ring, the
close and the wrong reveals, the done screen, the home screen with the grown-up strip, the
"Grown-ups corner", and the update row in each of its states.

**Done means** a script that enumerates the families from the engine (never a hand-written
list, which is how a bank grows past its own coverage), renders each on the five governed
viewports, and reports every overflow, clipped tile, overlapping element and control under
its size floor — with a negative control proving it catches a planted overflow. It runs on
demand, not in the check: this is a census, not a gate.

**What it would have caught already.** Two faults this project shipped and found by eye: the
label rendered at four times its intended size by an invalid `font:` shorthand, and images on
the home screen falling behind one another. Both were content-and-layout faults on a screen
no measurement was watching.

### G3b. The census rebuild — the third audit round's findings, CLOSED 2026-08-13

Nine findings, all from planting in a clone, and a tenth found while fixing them. Every one
is closed, each with the fault planted again afterwards and the control watched to go red:
**18 plants, 18 killed.** The record of what was built is in `docs/testing-gauntlet.md`; what
follows is only what the faults were, because a fault fixed without its cause written down is
a fault that comes back.

- **The z-index control could not see the overlay it was written for.** Its rule-splitting
  regex could not cross a `${...}` template interpolation, and every colour in
  `app/src/wq-css.js` is one — so it reached 71% of the file and exactly one rule at or above
  the overlay threshold. The invisible one was `.wq-toast` at `z-index: 70`, the exact rule the
  control existed to catch. It passed because it matched nothing. Comments are now stripped
  before interpolations are blanked (the comment above `.wq-toast` was being read as part of
  its selector, which the first fix discovered by reporting the rule under six names, none of
  them `.wq-toast`), a second cell asserts that the parser reaches EVERY z-index the file
  declares before the verdict is trusted, and a third refuses a z-index in any other app source.
- **`test.fail()` turned a broken app into "1 passed", exit 0.** `judge()` compared status with
  `expectedStatus`, and `test.fail` sets the expectation to failure; `forbidOnly` has no
  equivalent. Any cell that expects to fail is now refused by name (E3).
- **A badge added as a control's own `::after` read "B NEW ssion" and nothing fired.**
  `elementFromPoint` returns the originating element for a pseudo-element, so the five-point
  sample scored zero, and `::after` is not in the DOM so the overlap scan could not see it.
  There is a third scan now, `pseudo-overlay`, which asks about paint rather than geometry
  because each engine resolves a pseudo-element's size differently and item 1 puts this census
  on three of them.
- **Naming `.wq-toast` as an overlay suppressed the class, not the false positives.** A toast
  burying the "Ready to read?" line and the whole level card was reported by nothing. There are
  two lists now: the modal boundary, which a toast is not on, and the overlay list, which it is.
  What a toast covers is reported into the run's attachments rather than asserted, because a
  toast floats over live content on purpose.
- **The census floors were outside E6 and their self-test was E4-illegal.** `FLOOR` was built
  into its own fixtures, so lowering it to `{controls: 2}` still passed 11 of 11. The floors are
  `census_controls` and `census_cells` in `.claude/gate-baseline.json` now, and the controls
  assert them against literals.
- **The report gate was opt-in and unbound.** `npm run census` now deletes the previous report,
  then runs the gate whatever the runner's exit code was; a report from another config is
  refused by name. The gauntlet still does not call it, and that stays deliberate.
- **Staleness watched the sources, not the bundle.** The census measures `app/dist` through
  `vite preview`, so editing a source without rebuilding left the gate silent. `app/dist`,
  `tools/ux-census.mjs`, `tests/census/` and `playwright.config.mjs` are watched now, and the
  walker takes a plain file as a root — three of the seven are files, and `readdirSync` throws
  on those, so the directory-only version would have watched nothing through them.
- **The iOS paragraph's control asserted the constant, not the output.** Deleting the line that
  printed it left 11 of 11 green. The whole report is rendered by one function now and the
  control reads what a person would see. `metadata.engine` has a producer, so the coverage
  statement states the engine instead of guessing from the project name.
- **Both census spec files misstated their own counts** — "SEVEN detectors" against 18 cells,
  with `missing` listed as uncovered a hundred lines above its own control. The last cell in
  the controls file counts the file.
- **The tenth, found while fixing the nine:** `tools/ux-census.mjs` documented four commands —
  `--benchmark`, `--run`, `--shard`, `--self-test` — and the file has no main path at all. None
  of them had ever existed. A header naming four commands nobody can run is a control that
  cannot fail, written in prose.

**Two of my own repairs failed their first planting, and both are worth keeping in view.** The
control for "the tool still prints the report it renders" searched the whole source for the
literal `console.log(render(` — which that very line contains, so it found itself and stayed
green while the real call site was replaced. That is the shape this whole section is about,
made once more in the act of fixing it. And every staleness fixture injected its own clock, so
the list of watched roots was never exercised: removing `app/dist` from it left all nineteen
controls green.

**Items 2 to 8 of the build spec remain unbuilt.** This entry was the foundation under them,
not the work itself.

### G3c. What the fourth audit round found, 2026-08-13 — twelve findings, ten closed

An independent auditor planted faults in a clone against commits `e1b3a95` and `2ac9dc7` and
confirmed twelve. Ten are closed in the same change, each with the auditor's own plant replayed
and the control watched to go red: **14 plants, 14 killed.** Two are recorded here because they
are not the census's to fix.

The ten, in one line each, because the code carries the detail:
the z-index scan could not read `var()` or `calc()` — and its own coverage cell shared the
regex, so two "independent derivations" had one blind spot; a **textless** opaque bar burying a
control's label was ink to nobody, because background-IMAGE counted and background-COLOUR did
not; the pseudo-element scan asked only about background, so a border, a box-shadow and an
outline each painted a control solid black in silence; three of that scan's four branches could
be deleted with all 25 controls green, because the one shipped plant took one path; S7's floors
could be set to 20 and 20 with everything green, since every plant sat far from the boundary it
tested; `word-too-small` and `word-too-big` had no control and appeared in NEITHER of the
header's two lists; the "no other app source" tripwire was evaded by a named constant, by
`setProperty`, by `.ts` and by `.mjs`; the counted-coverage sentences were themselves
miscounted, in both files, in the commit that added a cell to stop exactly that; the overlay
matcher waved through any selector containing `[role` and any class that is a substring of a
named one; and the toast report was dead in all 376 cells while the comment claimed it fired
from a screen the census inspects — a fix that had replaced an honest caveat with a false one.

**G3c-1. The 390x844 correction was applied to the census only — CLOSED 2026-08-13, owner-ruled.**

G7 measured its phone checks at `{ width: 390, height: 844 }` in six places, and the progress
track at three more device sizes. 844 is the DEVICE height of an iPhone 13; a page gets
390x664, because the browser keeps the rest. Every phone check this project ever ran carried
180 pixels of slack no child has ever had.

**What the correction revealed, measured on the built app at each real page height:**

| device | page | midline | off centre |
|---|---|---|---|
| iPhone 13 — what the test asserted | 390x844 | 49.9% | 0px |
| iPhone 13 — what a page really gets | 390x664 | 45.7% | 13px high |
| iPhone 13 mini | 375x629 | 39.2% | 28px high |
| iPhone 15 Pro | 393x659 | 44.9% | 15px high |
| iPhone 15 Pro Max | 430x739 | 49.9% | 0px |
| Pixel 7 | 412x839 | 49.9% | 0px |
| Galaxy S9+ (the 320px extreme) | 320x658 | 48.3% | 5px |
| iPad Mini portrait | 768x1024 | 49.9% | 0px |

The pattern is the stage HEIGHT, not the width: wherever the stage lands near 260-300px the
word drifts up, and that is where the common iPhones land.

**THE OWNER LOOKED AT THE REAL THING AND RULED IT, 2026-08-13.** They opened the live app on
their own iPhone 13 and sent a screenshot: *"I don't see what the issue is, all these slight
differences to a human being are trivial, they all look about centre. Nothing worth holding up
a beta for. Like the lowest tier bug."* That is the first real-device screenshot this project
has ever had, and it is the kind of judgement no measurement can make: the table says 13px, and
only a person can say whether 13px matters to a five-year-old. It does not.

Worth recording with it: the screenshot shows Safari with its toolbars, which is the SHORTER
case. Installed to the home screen as the install guide asks, the page is taller and the drift
is smaller — so the owner judged the worse of the two. That last sentence is reasoning from how
iOS treats a standalone page, not a measurement, and nobody has measured the installed case.

**What was done, and what was deliberately not.** Every device height in
`tests/ui/interface.mjs` is a page height now — nine of them — and four rows that wore phone
names over device sizes say what they actually are. The centring band moved from 48-52 to
42-58, which is what "about centre" means and still fails a word at 20% or 80%. G7 is 47 of 47
at the honest sizes. **No layout was changed**, because the owner ruled the layout fine.

**What is still owed, at the lowest tier.** A dead-centre word on a 260-300px stage. It is not
a blocker, it does not hold a release, and it is written here rather than in a chat log so it is
not rediscovered in three weeks as if it were news.

**G3c-3. Three smaller things from the same round that are not fixed.**
- `metadata.engine` reports the engine that was REQUESTED, not the one that ran.
  `CENSUS_ENGINE=webkit` on a machine with no WebKit prints `Engines: webkit` and suppresses
  "WebKit did not run at all in this report" — the one paragraph whose whole job is honest
  coverage, claiming an engine that never launched. Harmless today only because the gate refuses
  that run for other reasons. **Done** means it names what produced a passing cell.
- The staleness scan does not watch `app/index.html`, `app/vite.config.js`,
  `tools/census-report.mjs` or `.claude/gate-baseline.json`. The first two change the built app;
  `app/dist` catches the rebuild case, so the impact is small, but the list is short of what it
  claims.
- Whether the census repeats its own answer is still unmeasured. At two workers this container
  fails cells wildly — 20 of 24, then 2 of 24, on the same 24 cells — which the config already
  assumes. But the 1-worker runs of 2026-08-13 were taken while an auditor ran a second
  Playwright on the same container at load average 4, so they measure the machine rather than
  the census. **Until a repeat run on a quiet box, no full census may be quoted for anything.**

**G3c-2. The census cannot judge a screen a parent has scrolled.** Found by the new toast cell,
which had to click "Copy log" — and Playwright scrolls a control into view to click it. Measured
mid-scroll, the "Grown-ups corner" reports a level row whose centre has passed under the sticky
header, and the header overlapping the content behind it. Neither is a defect.
- **Where** `control-obscured` and `overlap` in `tools/ux-census.mjs`.
- **What it means** Every screen cell measures a screen at its top, and that is now written into
  the toast cell rather than assumed. The app has one sticky element and a long scrolling
  parent screen, so the question is real: content UNDER a sticky header is by design, content
  BURIED by one is a defect, and no rule here tells them apart.
- **Done** means the scans know a sticky or fixed ancestor from a collision, with a control for
  each direction — a row scrolled under the header must not fire, and a header sitting on top of
  a control that has not been scrolled must.

### G4. E11 is a rule with only one mechanical helper — BUILT 2026-08-13

- **Where** `CLAUDE.md` E11 asks for the gates a change will touch to be named before the edit.
  Until this was built, only one part of that was mechanical: `node tools/mutants.mjs
  --anchors`, which reports moved mutant anchors in milliseconds and found one nobody had
  predicted on the rule's first use.
- **The gap** Everything else — which counts move, which documents state the fact, which
  scenarios do arithmetic on a level's size, which floors follow — was a person remembering.
  On 2026-08-13 that memory failed four times in one session.
- **Built** `node tools/blast-radius.mjs --word gob` (also `--count`, `--symbol`, `--text`).
  It lists every tracked file that names the thing, classified by what the file IS, with the
  counts that move, the floors that follow, and — chased for you — the files doing arithmetic
  on the level size it just computed. That last step is the one that mattered: the founding
  incident's `features/promotion.feature` contains the number 49 and never the word, so a
  file list alone would have missed it. It is a lookup, not a gate: it never fails a build.
- **What its first version got wrong**, found by two independent audits the day it was
  written, all fixed and each now carrying a planted-fault control: it read `git ls-files`
  relative to the working directory, so running it from `app/` reported 2 files instead of 12
  with the counts still right; it never matched file NAMES, so a word's `.mp3` was invisible;
  it treated the level lists as the bank, mispredicting the counts for the 21 words keyed in
  `TRICKY` or `WORD_SOUND` as well — the dangerous direction, since it invited lowering a
  floor (E6) for a count that never moved; `--text` was exact-byte, so a straight apostrophe
  and a curly one returned two different, both-incomplete answers, and neither found a
  sentence a document had wrapped; `0.8` missed `0.80` and `-1` found `pack-1` instead of
  `= -1`; and its ten controls ran a private closure over a six-line array, so the whole
  search could be deleted and all ten still passed. Fifteen faults are now planted against the
  self-test and all fifteen are killed.
- **What it still cannot see** Case: `Cat` at the start of a sentence is not a dependency, and
  is not reported. Coincidence: two files can agree on a number by accident, and nothing can
  tell that apart from a dependency. Both are stated in the tool's own header.

---

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
