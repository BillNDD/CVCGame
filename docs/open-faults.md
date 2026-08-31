# Open faults — the list to work from

**This document owns** what is WRONG and not yet fixed: every open fault, what a child or
a grown-up experiences today, and what done would mean. An entry leaves only by being fixed.
**It does not own** anything closed. The moment a fault is fixed the result goes to whichever
document owns that fact — `docs/settled.md` if an ear closed it, `SPEC.md` if it changed
behaviour — and this document is its counterpart, never its archive.

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

**UPGRADED 2026-08-20, the fail-loud commit:** `soundIdFor` is now `"d:" + (TILE_SOUND[g] ||
"unmapped." + g)` — a grapheme with no row resolves into a namespace no pack will ever
contain, so it can no longer inherit a plausible clip. The fallback's old passengers (the
identity graphemes, plus ar/air/aw/ear/er/oi from the ladder) each became a stated
TILE_SOUND row. The change exposed unruled `ow` riding a REAL clip of the wrong sound —
held by two owner-ruled ceiling raises the same evening rather than hidden. The paragraph
below records the world before that commit.

`soundIdFor` was `"d:" + (TILE_SOUND[g] || g)`, and the 23 graphemes on the fallback were
correct — swept against the whole bank on 2026-08-11 and put to an adversarial verifier.
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

## B17. The advance control goes live mid-reveal — FIXED 2026-08-15

**Promised for the beta after 18, missed in 19, and delivered the beta after that promise
said.** That record stays: a fix promised in a release note is a debt, and this one was
paid late.

The starting gun is gone. Nothing arms at grade time; each path that learns the reveal's
length is the thing that arms — the scheduled clips (with the 400 ms guard as a FLOOR, so
a short reveal still waits), the five B7 fallback paths (the guard, once system speech is
underway), sound off (the guard at once), and a 10-second backstop for a reveal that is
genuinely wedged, sitting above the longest legitimate reveal ever measured so it can
never fire into one that is merely slow. The ~590 ms window is closed by never opening
it. The fill appears only once a length is known, so no bar ever sweeps a guess.

Proof, as this entry's Done demanded: reveal test 14 replays the measured fault — clips
at 900 ms, the control asserted dead at +500, inside what used to be the window — and
G19 gained the negative control, a mutant that restores the starting gun and dies to
three tests. Test 13, which had pinned the take-back sequence as intended behaviour
("the guard woke it, as it must" — the window, asserted as correct), was rewritten to
the fixed contract with its reason recorded in place. One prior contract changed with
the fix, deliberately: the neither-callback path used to demand the control alive at
450 ms — arming before any length could be known IS the gun — and now releases at the
backstop, with the old expectation quoted in the rewritten test.

Fixing it surfaced the fourth Windows gate fault (recorded in Q): both mutation runners
invoked vitest through "npx", which execFileSync cannot resolve on Windows, so G19 had
never run on this machine — the pristine-suite control refused it, doing exactly its
job. Through Node's own binary now; 11 mutants, 11 killed, first complete Windows run.

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
| 2026-08-07 | Build-it encoding mode, practice only | BUILT 2026-08-17 (SPEC section 12). Its screen has no test of its own yet, and the practice-only property has no tripwire: both open, below. |
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

**FIRST HALF DONE 2026-08-14, owner-asked.** All fourteen governing documents now open with
what they own and what they do not, and gate G17 refuses one that does not. Five of them had
opened with "This document follows the Microsoft Writing Style Guide" — true, and not an
answer to "where does this fact live?".

The boundaries were drawn where tonight's faults showed they were missing: `voice-pack.md`
now says that where it and a ledger disagree the LEDGER is right and G16b enforces it,
which is the fault that lost `d:long_o` for three days; `open-faults.md` says it owns only
what is open and never becomes an archive, which is what let section K keep a corrected
claim; and `settled.md` says the per-word record lives in `tools/voice-words.csv`, which E10
already required a reader to consult and no document named as the owner.

**THE LENGTH HALF OF THIS FAULT IS WITHDRAWN — owner-ruled 2026-08-14.** F1 said three
documents were "long enough that a reader cannot hold them" and named `voice-pack.md` as
reading like an accreted log rather than a document. The owner's ruling: *"docs like voice
pack could naturally expand to many thousands of lines and aren't meant to be covered by the
rule, much like a json"*.

That is a distinction this fault collapsed, and the collapse is the actual error. A DOCUMENT
is read whole and held in a reader's head, so length is a fault in it. A LOG is SEARCHED — it
records what happened, in order, and grows for as long as the project does. Calling
`voice-pack.md` too long is the same mistake as calling `tools/voice-lock.json` too long, and
"it reads as an accreted log" was a description of what it IS, mistaken for a criticism.

The kind is now DECLARED at the head of each file and counted by gate G17, so the mistake
cannot be made again from a cold read. Three are logs: `docs/voice-pack.md` (a round per
entry), `docs/settled.md` (a closed question is never re-opened, so it only grows), and
`CHANGELOG.md` (a section per release, kept forever). `docs/open-faults.md` is NOT one — its
own header says an entry leaves it by being fixed, so it is a document that should shrink,
and its length is a fair question for another day.

**THE DUPLICATION HALF CLOSED 2026-08-15, owner-ruled — twice, because the first closing
was wrong, and the record of that stays here.** The copies that were live and wrong —
README's bank paragraph (185 words stale), README's privacy absolute, README crediting the
gauntlet with blocking a change, AGENTS' E7 paraphrase and its stale gate count, SPEC's
counts line summing to 438 inside its own document — each became a pointer to its owner or
was deleted, and gate G23 now REFUSES an owned fact stated as a literal in a governing
document that does not own it. The gate was run against the pre-fix tree first and went
red on the five cross-document copies (seven pattern hits); SPEC's internal line was the
owner talking to itself, outside any gate's remit by design, and was deleted by hand.

The first version of this paragraph said "fully closed" while three S6 restatements were
still live in `docs/install-ios.md`, `docs/install-windows.md` and `AGENTS.md` — the two
install guides being the documents a parent actually reads — and the README rewrite that
closed one wrong privacy sentence had introduced another (it promised two switchable
requests; S6 ships one switch). An independent reviewer caught all four the same day.
The three restatements are pointers now, the README sentence matches S6, and the S6 fact
family gained a third forbidden shape with its own controls. What no gate can see — a
paragraph describing old behaviour in fresh words — is F3's, below, and stays open.

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

**PARTLY CLOSED 2026-08-13, and it cost three words to find.** The two SOUND ledgers were
the live case of this fault, not a hypothetical one. `tools/pending-sounds/pending-sounds.json`
says in its own header that its entries "become the row in `tools/voice-sounds.csv` when the
sound-out reveal is built". The reveal shipped on 2026-08-11. **The migration never finished**,
so a reader could open either file and get a different answer about whether the owner had
approved a sound — which is exactly how `d:long_o` was called unheard for three days while
its `perfect` verdict sat in the other file (section K).

Seven rows whose verdict cell was EMPTY now carry the owner's verdict, its round, and a note
saying it was migrated rather than newly given: `ch`, `long_a`, `long_e`, `long_o`, `long_u`,
`oo_book`, `schwa`. No verdict was changed and none was invented. `tools/ledger-truth.mjs`
(gate G16b) now refuses any future disagreement.

**What is NOT closed, and is deliberately not being guessed at:**

1. **Eight shipping sounds have no row in `voice-sounds.csv` at all** — `schwa_a`, `short_a`,
   `short_e`, `short_i`, `short_o`, `short_u`, `th_quiet`, `v_soft`. Every one carries a
   verdict in the JSON ledger, so nothing unapproved is reaching a child; what is missing is
   the recipe columns (cut points, gain, guard windows) that a row is FOR. Writing rows with
   invented numbers would be worse than no rows, so they stay absent and named here.
2. **Four shipping sounds have a row that says `locked=no`** — `ch`, `long_e`, `oo_book`,
   `schwa`. In `voice-words.csv` "locked" means byte-pinned, and what it governs for a sound
   has never been written down. Setting it without knowing is the kind of guess this section
   exists to stop.
3. **Whether `voice-sounds.csv` should exist at all** is the owner's call. It has 38 rows to
   the JSON's 49, is missing eight sounds that ship, and its verdict vocabulary is from an
   older review era ("accepted (half blend)") while the JSON uses "perfect (owner)". One
   ledger would end this class of fault; two will keep needing a gate to hold them together.

**PUT TO TWO INDEPENDENT REVIEWERS ON 2026-08-14, AND BOTH REFUSED THE PLAN.** The proposal
was: delete the CSV after moving its `ipa` and `graphemes` columns into the JSON. A software
engineer and a software architect reviewed it separately, neither told the other's answer,
and both agreed with the DIRECTION and rejected the PLAN. Their findings, verified:

- **"Nothing parses the CSV" was FALSE, and it was the premise the plan rested on.**
  `tools/ledger-truth.mjs:88` parses it, with a purpose-built quote-aware parser, and runs
  in `npm run check` and as gauntlet gate G16b. The claim came from listing eight files
  that mention the CSV, testing five of them for a real read, and generalising the result
  to all eight. The file skipped was the gate written three hours earlier to read it.
- **Deleting it lowers two or three E6 floors** — `g16b_sounds` 55 -> 49 (six sounds exist
  only in the CSV), `g17_governing_files` 24 -> 23, and `g16b_controls` 25 -> 19 if rule 3
  goes with it. E6 says never lower a floor. **That alone makes this the owner's decision.**
- **`graphemes` must NOT move.** The live map is `TILE_SOUND` plus the per-word
  `WORD_SOUND` overrides, which ship in the engine. The CSV column is older, has no row for
  `ff`, `ll`, `ss`, `zz`, `kn`, `wr` or `mb`, and keys its vowels to retired ids. Copying it
  would install a second, incomplete, wrongly-keyed map one directory from the right one.
- **`ipa` is not copyable as a column.** It covers 30 of 38 shipping sounds and is keyed to
  ids that no longer ship (`a`, not `short_a`). Moving it needs a key remap, which is an
  inference, not a record — the exact guess item 1 above refuses to make.
- **`family` is a NAME COLLISION.** In the CSV it is a phonetic class (`vowel`, `burst`,
  `affricate`); in the JSON it is a render recipe (`rep_sp0.8_q240-180`). Same key, opposite
  meaning. A naive merge would have clobbered one silently.
- **The honest argument for deletion is not any of the five that were given.** It is that
  `docs/settled.md` already records a reviewer misreading the CSV as if it described what
  ships — "reading the wrong one turned a clip the owner had passed into a clip the owner
  had merely tolerated". The file is a documented trap.

**What both reviewers agreed to do FIRST, whatever is decided about deletion: DONE
2026-08-14, owner-ruled.** Both corrections are made, and neither touched the game.

- **The SPEC claim is gone, and the bullet holding it turned out to be obsolete entirely.**
  It sat under "What this needs before it can be built" for the level introduction and asked
  for "a grapheme-to-sound map in app code" — a prerequisite that `TILE_SOUND` and
  `WORD_SOUND` MET on 2026-08-11. So the fault was not one false clause in a live
  requirement; it was a requirement that had been satisfied for three days while still
  listing itself as blocking work. It now records that it is met, and carries the reviewers'
  warning that the CSV's `graphemes` column is not that map and must not be copied in.
- **`pending-sounds.json`'s header no longer promises the abandoned migration.** It now says
  plainly that it IS the sound ledger, that verdicts live there, what the `family` collision
  means, and that G16b refuses any disagreement between the two files.

**Its own pointer had rotted, which is the fault in miniature.** This entry said
`SPEC.md:889`; the sentence was at 934 by the time anyone went to fix it, because the
document grew underneath the reference. A line number is a fact with no owner, and it was
wrong inside the entry whose subject is facts drifting between files. The reference is now
to the sentence rather than to a line.

**ITEMS 1, 2 AND 3 ARE CLOSED, 2026-08-14, owner-ruled — and the measurement changed the
question rather than answering it.** The file was read rather than reasoned about:

| measured | value |
|---|---|
| rows | 38 |
| rows sourced `superseded_by_synthesis`, saying SUPERSEDED in their own notes | **26** |
| sounds named by BOTH files | 32 |
| of those, sharing a `sha256` | **1** (`th_this`, and its row is sourced `synthesis`, not archived) |
| rows only in the CSV | `a, e, i, o, th_thin, u` — retired ids |

A row states it outright: *"SUPERSEDED 2026-08-11: the owner ruled that no recording of their
voice ships in the game… This row is kept as provenance for a recording that no longer ships
and is no longer in the repository."*

**So these were never two ledgers of one fact.** One is the live ledger of the synthesised
clips that ship. The other is an ARCHIVE of the owner's own voice recordings, retired when
the owner ruled they would not ship, whose byte pins name files that are not in the
repository and can never be verified. Thirty-one of thirty-two disagreeing is not drift
between peers; it is two pipelines, one of them closed.

- **Item 3 — it stays, and it is not renamed.** Deleting an archive lowers two or three E6
  floors and destroys the only record of how those clips were made, which is precisely what
  B11 already costs this project for one sound. **The rename was proposed, and the E11 lookup
  refused it**: 14 of its 20 references live in `docs/settled.md` and `docs/voice-pack.md`,
  both declared LOGS, and in render scripts whose header `tools/blast-radius.mjs` marks as
  history not to be rewritten. Renaming would either dangle those or edit a log to match
  today's naming, which is the "state at the time of writing, quietly edited" fault this
  document warns about in its own header.
- **What was actually missing was never the name.** Nothing STOPPED a reader treating an
  archive row as the record of what ships — the trap `docs/settled.md` already records
  somebody falling into. `tools/ledger-truth.mjs` gains **rule 5**: a shipping sound may not
  rest on an archive row alone. Rule 2 accepts an approval from either ledger, so without it
  a clip could ship carrying only the blessing of a row describing audio that is not the
  audio playing. True for all 38 shipping sounds today, so it guards a regression rather
  than reporting a fault. Controls 25 -> 33, floor raised to match.
- **Item 1 — the eight shipping sounds with no CSV row are CORRECT, not a gap.** `schwa_a`,
  `short_a`, `short_e`, `short_i`, `short_o`, `short_u`, `th_quiet` and `v_soft` were never
  recorded in the owner's voice; they are synthesis-only. There is nothing to backfill, and
  writing recipe numbers for them would have invented a recording that never existed.
- **Item 2 — `locked=no` on four rows belongs to the RECORDING pipeline's pinning**, and is
  moot for a row whose source file is gone. It is not a value anybody can now justify
  setting, and it does not govern anything that ships.

**Three of my own controls were vacuous and planting found all three**, which is the only
reason any of this is trustworthy. Rule 5's first four controls all supplied `csvSource` by
fixture, so deleting the line that READS it from the CSV left every one of them green — the
rule would have been dead against real data while its controls said it worked. The reader is
now its own function proved by a fixture. The identical shape had already been found twice
the same day in `tools/free-port.mjs`. Six faults planted against rule 5, six killed.

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
- **A SLICE closed 2026-08-15:** gate G23 now refuses an owned fact copied as a LITERAL
  into a governing document that does not own it — the phrase-shaped half of this fault,
  proven red against the real pre-fix tree. What remains open is exactly the half G23's own
  header disclaims: a stale paragraph in fresh words, which no pattern can see. This entry
  stays for that half.
- **Done** More of what the documents assert is derived from the code rather than typed
  beside it, so the gap cannot open silently.

### F4. The sentence-screen ledger binds a read to an id, not to the text that was read

- **Where** `tools/sentence-screen.mjs`, every SCREENED list. Found 2026-08-20 while landing
  the move-bill repairs: eleven texts were reworded under their existing ids, and the gate
  kept passing throughout, because being in the list means "this ID was read", while the rule
  the gate enforces means "this TEXT was read".
- **What a grown-up experiences today** Nothing yet — the eleven repaired wordings were read
  by the owner the same day on the approval page, and the ledger comment names that read. The
  fault is the silent path: any future edit to a screened text inherits the old read with no
  gate going red, which is exactly the shape of the cup lesson.
- **Done** A screened entry carries something derived from the text it vouches for (the drift
  refactor's structured entries are the planned vehicle), so that editing a text un-screens
  it mechanically. Until then, every text edit must re-read and re-date by hand, as the
  2026-08-20 repairs did.

---

## W (first use). The third sentence slot of a 20-word session - opened and
## CLOSED 2026-08-20, the same night

Opened when the driven walk at level 22 met two sentences against three
planned slots, with the D2 breather seam as the suspect. Closed by measuring
the right thing: **the plan was honest and the app ate nothing** - level 22
owns only TWO texts, and `sessionSentences` gives a level fewer sentences
than slots by design ("a level with fewer sentences than slots gets fewer,
never the same one twice"). The walk was re-derived at level 77, whose pool
holds seven texts over a 20-word queue, and it MEASURED all three slots
serving - after the 5th, 10th and 15th words, breathers at the 7th and 14th,
no repeats - so the pin now reads 3 and the third slot's path has finally run.
The letter W was reused by the 2026-08-19 free-play entry below; this one
keeps the (first use) suffix so a reader who meets either name in a commit can
tell them apart.

## J. From a real child's backup, 2026-08-13

A parent sent their child's export. Three things came out of it; one is fixed, two are open.

### J1. The letter "a" says two sounds and nothing says so — BUILT 2026-08-15, owner-ruled

The reveal now says so, for every bent heart word, in the owner's own shipped note
pattern: fourteen new `TRICKY` notes join the original nine, chosen by the owner from a
decision page (all fourteen approved as drafted; the long vowels say "says its name", the
rest keep the sounds-like respelling). The parent's word "a" carries "On its own, a says a
lazy “uh”." — the exact gap their report named. "and" stays noteless because it bends
nothing, and a test pins the absence as a decision. The sentence reveal shows the open
word's note too ("sentences too", owner-ruled the same day), in a reserved slot so the
approved layout never moves; never during the child's attempt. The five buzzy-th words
stay out by SPEC section 5's own rule — th is a two-sound unit where the word decides,
not a letter bent from its usual sound. SPEC sections 3 and 12 own the record; copy-lint
pins all twenty-three notes word for word. A SPOKEN layer was offered, and the owner
chose "shown now, spoken explored later" — recorded as idea G8, unpromised.


### J2. `settings.mode: "mic"` survives a feature that no longer exists — CLOSED 2026-08-15

- **Where** `migrate()` passed `settings` through; the microphone was deleted on 2026-08-12.
- **Closed by the v4 migration** of the 10-and-10 build: any pre-v4 save drops
  `settings.mode` on load, whatever its value, and the migrate test asserts the field is
  gone from a save that carried it. No code read it; now no save carries it either.

## K. Seating we, me and go — CLOSED 2026-08-13, and go was never blocked

**All three are in the game, and so are `he`, `be`, `no` and `so` with them.** Sixteen
heart words now sit at Level 2, the open-syllable roster is complete, and
`HEART_WAITING` is empty for the first time since it was written. The bank moved
438 -> 445, Level 2 53 -> 60, the pack 499 -> 598 clips.

**`go` was never blocked, and that is the part worth keeping.** This entry said its
sound had never been rendered or heard by anyone, so seating it needed a listening
round. `d:long_o` was graded **perfect** by the owner in sound round SND5 on
**2026-08-10** — three days before this entry claimed nobody had heard it. The clip
was on disk with a matching sha256 the whole time. It had simply never been COPIED
INTO THE PACK, because until `go` no word needed it. `no` and `so` were held out by
the same sentence.

The owner found it by asking "didn't I transfer something I called letter sound o?".
`tools/ledger-truth.mjs` (gate G16b) is the answer to that, so the next one is found
by a build rather than by a memory. The cause is written up in section F2: two sound
ledgers, a migration that stalled, and `doc-truth.mjs` never reading either of them.

Three faults were caught by existing guards while this was done, and each is worth a
line because each was a guard doing its job unprompted:

- `waitingIsHonest`, written hours earlier for `we` and `me`, refused the test run:
  *a heart word is waiting or it is in the game, never both*.
- The S4 rule in `engine.test.js` refused `d:long_o` for having no child-facing
  description, which would have offered whoever records this pack the string
  "long_o" — a file name.
- The free-play derivation in `safety.test.js` moved again, and the first correction
  reasoned its way to the wrong answer by indexing without splicing. Simulating the
  real function gave the right one.

**Still open from this entry:** J1, the bent-sound signposting, now covers sixteen
heart words rather than eleven. Every one of them bends a tile away from that
letter's usual sound, and nothing yet tells a child so.

The original entry follows, with its false sentence corrected in place.


**`we` and `me` are in the game.** Level 2, beside the other nine heart words, with
`WORD_SOUND` pointing each `e` at `long_e`, both listed in `HEART`, and the clips the
owner graded `perfect` in batches 12 and 13 shipped as the exact bytes they heard. The
count cascade E11 predicted all moved together: the bank 438 -> 440, Level 2 53 -> 55,
the cumulative lower-level total 65 -> 67, the pack 499 -> 501 clips and the G13 floor
with it. One thing E11's lookup did not predict and the work found: the derivation in
`tests/safety.test.js` that computes the free-play block boundary had gone stale a
SECOND time, at the removal of `gob`, inside the very paragraph that warns about it.
All three of its numbers are now computed from the shipped `LEVELS` rather than
reasoned about. **The 22 approved we/me sentences are unblocked.**

`go` is still out, and everything below stands for it.


The owner asked for `we`, `me` and `go` to be seated at appropriate levels, after nine
sentences of batch 3 had to be bent around their absence. Three things were checked before
any bank change, and the third stops one of the three words.

1. **All three have approved word clips already** — `we` and `go` from batch 12, `me` from
   batch 13, all graded `perfect` on 2026-08-11 and waiting in `tools/pending-words/`. They
   are words with no LEVEL, not words with no clip.
2. **They are heart words, so they belong at Level 2** with the other nine, by the seat
   ruling of 2026-08-12: the level is where the CHILD MEETS the word. None of the three can
   be decoded by the bank's own rules — `we` and `me` are open syllables saying long e,
   `go` is an open syllable saying long o — which is what a heart word is.
3. **`d-long_o.mp3` does not ship, and `go` cannot be sounded out until it does.** It is one
   of the fourteen sounds parked in section B8 on 2026-08-12; `long_i` and `oo_moon` came
   back the same day when `my`, `to`, `do` and `you` were seated, and `long_o` did not,
   because nothing needed it. `go` needs it.

   **CORRECTED 2026-08-13, by the owner, from memory.** The three sentences that stood here
   said the sound had never been rendered or heard by anyone and that seating `go` therefore
   needed a listening round. **That was false.** The owner graded `d:long_o` **perfect** in
   sound round SND5 on **2026-08-10**; the clip is `tools/pending-sounds/s-long_o.mp3` and
   its sha256 matches its record exactly. What is true is only that it has never been COPIED
   INTO THE PACK, because until `go` no word needed it. Not shipped and not approved are a
   file copy and a listening round apart, and this entry conflated them for three days,
   through two commits and into a published release note. `no` and `so` were described as
   blocked by the same sentence and are not blocked either.

   The cause is recorded rather than tidied away: B8 recorded these sounds as PARKED,
   meaning no bank word needs them, and somewhere that became UNHEARD. `tools/ledger-truth.mjs`
   now refuses the confusion mechanically — it reads the sound ledgers, which `doc-truth.mjs`
   never did. `we` and `me` needed only `d:long_e`, which ships and was graded good.

**And a dependency that applies to all three.** Every one bends a tile away from that
letter's usual sound: the `e` of `we` and `me` is not the `e` of `pen`, and the `o` of `go`
is not the `o` of `dog`. That is section J1 exactly — ruled on 2026-08-13 (when a word bends
a tile, the reveal says so in child-facing words) and NOT BUILT. Seating these three adds
three more words to the class J1 exists for, so it does not create the fault, but it does
make it three words larger and more likely to be met.

**A sentence can be decodable and still be wrong, and nothing here checks for it.**
On 2026-08-13 the owner refused "My dad can pat me." with two words: *not appropriate*.
Every mechanical gate passed it — every word taught, the level correct, the audio clean —
because `tools/decodable.mjs` asks whether a child CAN read a sentence and nothing asks
whether a child SHOULD meet it. CLAUDE.md already carries this rule for WORDS, under
"Before any beta is pushed": the whole bank is re-screened for sexual, crude or violent
meaning, and "milt" reaching a listening round is the incident that earned it. Sentences
were never brought under it, and a sentence can carry a meaning that none of its words
does. An adult subject with a physical verb and a child object is the shape to watch,
and it was written by me without noticing. **Done** means the pre-beta screen covers
sentences as well as words, and the sentence drafting rule says so where it can be read
before the next batch is written.

**Done** means: `we` and `me` seated at Level 2 with `WORD_SOUND` entries pointing the `e`
at `long_e`; a listening round for `d:long_o` before `go` is seated at all; the counts and
floors that follow raised (E11 — the bank moves 438 to 440 or 441, and the clip count with
it); and the new sentences the owner approves added by the same route as batch 3, with
`tools/decodable.mjs` as the arbiter.

## N. The sentence never lets a child TRY first — FIXED 2026-08-15, owner-ruled 2026-08-14

The child has their turn. A session sentence arrives SILENT with the ruled prompt, the
three grade controls live, and no way forward but the grown-up's mark; the mark leads the
reveal with a praise line that never says "word" (or the word-reveal's own "Good try!" /
"Let's try again."), decides nothing else, and is recorded nowhere. No separate skip. Free
play is untouched, as its own ruling requires. The full design lives where it belongs —
SPEC section 12 points 3 and 6 — with the three rulings of 2026-08-14 written into them,
and the cause (a description that began at "The sentence is read whole", built as written)
recorded there so the next incomplete description is recognised. Proof: the sentence suite
grew its attempt tests (silent arrival, lead-by-grade, one-mark-only, never persisted),
the engine pins the praise roster in both halves, G7's walk now marks a sentence the way a
grown-up does, and the QA script gained the on-device step. **And the proof no gate can
give: the owner ran that step on their own phone the same day — sessions, free play, the
notes and the labels — and reported it working, in their word, "perfected." The two
faults their first minute found (a mute ring switch, and free play still auto-playing)
were fixed the same hour, which is what a device minute is for.**

## L. The safety rule with no gate — S9, GATED 2026-08-15

Gate G24 exists, in `npm run check` and the gauntlet, and `docs/testing-gauntlet.md` owns
its record. The design is the entry's own Done, built as written: the name list lives
outside the repository (`private/s9-names.txt`, gitignored since day one, merged with
`S9_NAMES`), every tracked text file is scanned including the generated ones, a
camel-glued identifier is a hit because an identifier was one of the incident's six
landings, and every fixture plants "Placeholderkid" — never a real name, for the entry's
own reason. Where no list exists the summary says "0 names" rather than implying
protection; the live scan runs where the owner keeps the list, and that honesty is written
into the gate's section.

**The owner then ruled better, 2026-08-15: "I would prefer no name ever appear, not have
to list names."** So the gate grew two open layers that need no secret at all — the
known-vocabulary stranger rule (deny by default: a capitalized token the tree has never
known fails the build) and the public common-names registry, scanned even in lowercase.
The private list became OPTIONAL, a belt for the one residue no open layer can see: a
family name that is also an ordinary word. The vocabulary layer's adoption report caught
the owner's own given name in a fault entry's machine path on its first contact with real
data — written by the agent that built the gate, redacted the same hour, history folded
into section O's rewrite.

The removal history stays in this entry's original text below the fold of the git log
(2026-08-14): 31 commits rewritten, six branches and seventeen tags checked, and the
near-miss that taught the push-by-SHA rule.

## M. The file map — designed 2026-08-14, BUILT 2026-08-15, owner-ruled

Built as designed, with the ownership teeth the owner added when they ruled it: "end drift
and orphanage." The record of what it is lives where it belongs — gate G23 in
`docs/testing-gauntlet.md`, and the generated `docs/file-map.md` itself. This stub stays
only to say where the entry went; the design text moved into the tool's own header.

The two orphans the design review found were both dispositioned by the owner the same day,
from a decision page: `app/public/voice-review.csv` DELETED — proven first to hold nothing
accepted (372 rows, zero verdicts, every id but the removed word's in the shipped manifest,
227 clips behind the pack) — and `docs/voice-goldens-packs1-3.json` declared HISTORY, the
first entry against the `filemap_history_max` ceiling of 1.

**The deletion was wrongly called done the first time.** `tools/render-voice-pack.py`
still WROTE the file — its path is built as `out_dir + "-review.csv"`, so no grep for the
name could find the writer, and the next render would have put the sheet straight back
into the precache. An independent reviewer caught it hours after the "deletion" was
recorded here. The write is gone, the flags it carried now print to the person rendering,
and G23 keeps a TOMBSTONE for the path — it fails the build if the file exists at all,
tracked or not, so a future writer cannot resurrect it quietly.

## O. A session link is in 184 commit messages — owner-found 2026-08-14 — CLOSED 2026-08-16

**CLOSED.** The one history rewrite ran on 2026-08-16 and the remote now serves it whole.
The record of what was done, so the next reader trusts the proof rather than the claim:

- **The rewrite**: `git filter-repo` (invoked as `python -m git_filter_repo`), one pass —
  then a second identical pass when `ls-remote` surfaced a 26th ref the plan had missed:
  `cursor/grok-refactor-page-4be7`, the faulted agent's own branch, carrying ALL 184
  trailers and both name-bearing blobs, plus one real commit of its own, kept. The second
  pass left every already-clean ref byte-identical, which is the strongest single proof
  the pipeline is stable. Three redactions: every `Claude-Session:` trailer line dropped;
  the owner-name path and slug forms in this file's history replaced with `(redacted)`;
  the session id replaced with `(redacted)` everywhere including this entry's own quote.
- **The proof, run twice independently** (this session's battery, then the owner's Opus
  double-checker with its own commands): zero trailers across all refs; the given name in
  zero blobs outside the two deliberate SSA-dataset entries of `tools/s9-common-names.json`;
  session id and personal email in zero blobs; `git diff` old-head to new-head across the
  bundle boundary = exactly one redacted line in this file and nothing else; per-commit
  tree sampling 10 of 10 clean; all 25 then 26 refs mapped old-to-new by filter-repo's own
  commit map.
- **The push**: the owner ran every remote write by hand on 2026-08-16 — seven branches
  force-pushed by SHA with leases pinned to the recorded old values, 19 tags deleted and
  recut (the credential deleted them fine; the recorded "cannot delete tags" belief was
  wrong for tag DELETION via push). `ls-remote` verified after: 26 of 26 refs match the
  rewritten history, zero mismatches.
- **What remains, named rather than dropped**: GitHub still holds `refs/pull/2/head`
  pinning the old cursor-branch tip server-side, and any old commit stays fetchable by raw
  SHA until GitHub runs a server gc — the Support ticket asking for that purge plus removal
  of the PR ref is drafted and is the owner's to send, after which PR #2 can be closed. The
  pre-scrub backups (`pre-scrub-backup.bundle`, `pre-scrub-cursor-branch.bundle`) stay in
  the session scratchpad until the owner confirms end-to-end. The owner also holds the
  cheapest mitigation independent of GitHub: revoking the old session at claude.ai kills
  what the leaked pointer points at.

The original entry follows, kept as the record of what was found and why each job existed.

## O (original entry). A session link is in 184 commit messages — owner-found 2026-08-14

The owner opened the commit page for `f221d69` on GitHub and found a `Claude-Session:`
trailer at the foot of the message. Their words: the previous agent "started uploading every
conversation I had to the repo". **Measured the same hour, that is not what happened, and the
difference matters in both directions.**

- **Where** Commit messages only. The oldest carrying it is `62773c8`, 2026-08-03.
- **What is actually there, measured** 184 of the 319 commits on `main` carry the line
  `Claude-Session: https://claude.ai/code/session_(redacted)`. It is **one URL
  repeated 184 times**, not one per conversation.
- **What is NOT there, and it was checked rather than assumed** No conversation or transcript
  file is tracked, in any commit: 0 files by name, 0 tracked files containing a `claude.ai`
  link, 0 hits for the owner's email anywhere in history or in any author field. The git
  identities are `Claude <noreply@anthropic.com>` and the owner's GitHub `users.noreply`
  alias, which is the privacy-preserving one. **No conversation content was ever published.**
- **Why it is still a fault** The URL is a pointer to the owner's own session and opening it
  needs their account — but it is their identifier, sitting in a public repository, put there
  by a tool rather than by a person who chose it. The owner ruled on 2026-08-14: the repo
  stays **public**, and the trailers go.
- **What the removal breaks, and this is the expensive half.** Rewriting 184 messages moves
  every commit SHA from `62773c8` forward. **Eight tags then point at the old commits and keep
  them alive on GitHub** — `v1.0.0-beta.12` through `v1.0.0-beta.19`. That is exactly the trap
  the beta.19 scrub hit on 2026-08-13, when a deleted tag was what finally released the old
  history. Two branches also carry the trailer: `claude/work-items-w1-w7-hw3bp0` (179) and
  `probe-delete-me` (146). The repository credential can push branches but **cannot push or
  delete tags** — those eight are the owner's to delete in the GitHub UI, and until they are
  gone the scrub is not done however clean `main` looks.
- **A wider identity sweep ran with it and the working tree came back clean.** No username, no
  personal email, no phone number, no IP address, no key or token. The only email hit is an npm
  dependency's own deprecation notice inside `package-lock.json`, and the only absolute paths
  are the generic `/home/user/` of a render container. **2,883 text blobs across all history
  were enumerated and NOT yet scanned** — that is the unfinished half, and it is named here
  rather than quietly dropped.
- **A second identity fault, found by trying to push this entry, 2026-08-14.** The local git
  config on this machine held a real personal `@icloud.com` address as `user.email`, so the
  commit carrying this very section was authored with it. **GitHub refused the push** — "push
  declined due to email privacy restrictions" — which is the only reason it is not public now.
  The address appears in **0** commits on every remote ref, in 0 commit messages and in 0
  tracked files; the public history carries only `noreply` aliases. The config is now set to
  the GitHub `users.noreply` alias. It is recorded because it is machine state, not repository
  state: it will NOT follow the move to `D:` in section P, and a fresh clone or a new machine
  starts with whatever the global config says. A protection owned by a remote setting rather
  than by this repository is one that holds until somebody turns it off.
- **THE REWRITE GAINED A SECOND JOB, 2026-08-15.** The G24 vocabulary layer's adoption
  report found the owner's given name in `docs/open-faults.md` — inside section P's
  literal machine path, written there on 2026-08-14 by the same agent that later built the
  gate, public from commit `d50ba3b` onward. The working tree is redacted; the history is
  not, and those commits sit inside this rewrite's window anyway. So the rewrite is no
  longer messages-only: it must also rewrite the file content of the affected commits, and
  its proof changes with it — `git diff` old-to-new must be empty EXCEPT the redaction,
  stated per file, rather than empty outright.
- **Done** means: the sweep of the 2,883 historical blobs is finished FIRST, so history is
  rewritten once rather than twice; the trailer is gone from every commit on every ref; the
  proof is that `git diff` between the old and the new head is **empty**, which is what shows
  only messages changed and never a byte of the game; `main` and both tainted branches are
  pushed **by SHA, never by ref name** (S9's near miss, 2026-08-14); and the eight tags are
  deleted and recut by the owner. A rewrite that leaves the tags standing is this project's
  "fix called done" fault with a fresh date on it.

## P. The repository moves to `D:\OpenCVCGame` — owner-asked 2026-08-14, not started

- **Where** The working directory itself: today, the repository's folder under the user
  profile on `C:`. The literal path stood here until 2026-08-15, when the new G24
  vocabulary layer's own adoption report flagged it — it contained the owner's given name,
  in a public repository, written by the same agent that built the gate. The history side
  is folded into section O's pending rewrite.
- **What the owner asked for** The content of the folder migrates to `D:\OpenCVCGame`, and
  that becomes the working directory.
- **Why it is written here rather than done** It was asked at the end of a session with the
  token budget nearly spent, and a half-finished move of a git repository is worse than one
  not started.
- **What it will touch, so nobody discovers it one failure at a time (E11)** The absolute
  paths in this environment are not all inside the repository. The agent memory folder is
  keyed to the OLD path — a slug derived from the full C: folder path — so it does **not** follow the
  repo and must be moved deliberately or it is silently lost. `.claude/` settings, any hook or
  launch configuration holding an absolute path, and the Python voice toolchain's own paths
  are the other three places to check before the old folder is deleted.
- **Done** means: the repository is at `D:\OpenCVCGame` with `git rev-parse HEAD` matching
  `origin/main`, `npm run check` green from the new location, the voice toolchain proven to
  still render from there, the agent memory carried across, and only then the old folder
  removed. Not done while anything still reads the C: path.

## Q. `npm run check` cannot go fully green on Windows — found 2026-08-14

Found while adding sections O and P, by running the check the rule requires (E7). The repo
moved to a Windows machine (section P moves it again, to `D:`) and two of the check's steps
were written for Linux. **Neither is a fault in the game; both are faults in the gates that
protect it, and a gate that cannot run is a gate that is not protecting anything.**

- **Fixed in the same change** `tools/round_guard.py` called `read_text()` with no encoding,
  so Python used this machine's cp1252 locale on UTF-8 files and died with a
  `UnicodeDecodeError` before a single one of its refusals ran. Four call sites now name
  `encoding="utf-8"`. This is the E10 guard — the one that refuses a listening round the
  records have already closed — so it had been silently absent on this machine.
- **Fixed later the same day** (this paragraph said "NOT fixed" until 2026-08-15, which was
  true when written and stale within hours — the build reviewer caught the drift):
  `tools/free-port.mjs` grew a CannotTell state and a PowerShell path for Windows, its scan
  parser was extracted so the controls reach the real guard, and its 15 controls pass on
  this machine. `npm run check` has run fully green on Windows since commit `638c0ff`.
- **The GAUNTLET's own Windows faults surfaced on 2026-08-16, at the first gauntlet this
  machine ever ran (beta 20), and were fixed the same night**: the three browser gates and
  the coverage calibration all spawned `npx` or a `.bin` shell script, unspawnable under
  Windows (the same class the mutant runners had already cured — everything now runs
  through `process.execPath` and the real bin paths); and G3's untracked-files guard used
  the POSIX `test -z "$(...)"` idiom, which the Windows default shell fails on the idiom
  rather than the truth — `tools/generated-clean.mjs` is the portable replacement. The
  same first run also caught three checks whose choreography predated this session's own
  features (the sentence attempt phase, B17's arming, the 14-word starter level); each
  check now measures the path that actually runs instead of assuming the old one.
- **The wider fault behind both** About twenty `read_text()` / `write_text()` calls across
  `tools/*.py` still name no encoding — `align-sentence.py`, `build_a_round.py`,
  `build_of_round.py`, `build_page.py`, `build_soundout_page.py` and others. Every one is a
  `UnicodeDecodeError` waiting for the first non-ASCII byte, on Windows only. They did not fire
  today because the check does not run them; the voice toolchain does, and that is where they
  will surface.
- **What was shipped against a red check, stated plainly** This change was committed and
  pushed with the check red on those two free-port controls, because they pre-date it and it
  removes one red without adding any. That is a judgement, not a licence: it is recorded here
  so the next person sees that the check has been red since 2026-08-14 rather than discovering
  it and assuming it was always so.
- **A FOURTH Windows fault, found 2026-08-15 while fixing B17: no mutation gate had ever
  run on this machine.** `tools/mutants.mjs`, `tools/app-mutants.mjs` and
  `tools/acceptance-mutants.mjs` all invoked vitest through `"npx"` via `execFileSync`,
  which takes no shell — so Windows cannot resolve the `npx.cmd` shim and every run
  "failed". The pristine-suite control then refused each gate, which is that control doing
  precisely its job: refusing to call a broken environment "all mutants killed". All three
  now run vitest through Node's own binary and the vitest entry file, no shell, no shim.
  `tools/mic-absence.mjs` still spawns `"npx"` for its preview server and is left for its
  own entry (C4 — the gate is not wired anywhere yet).
- **A third Windows fault, found 2026-08-15 in the GAUNTLET's own tooling.**
  `tools/blast-radius-mutants.mjs` wrote its sandbox git config with a raw Windows temp
  path — and in a git config VALUE a backslash is an escape character, so the whole harness
  died at "bad config line 2" before planting a single fault. Proved pre-existing by
  stashing the day's edits. Fixed with forward slashes, which git accepts on every
  platform: the harness then ran 64 planted faults, 0 survived, 1 equivalent, 0 anchors
  moved — its first complete run on this machine.
- **Done** means `npm run check` is green on Windows: `free-port.mjs` finds a port holder on
  this platform or states in its own output that it cannot and skips honestly, and the
  encoding-less reads in `tools/*.py` name UTF-8. Section P's move to `D:` does not change
  any of this — the same machine, a different drive.

## R. Ten level names a child can see that no owner has ruled on — CLOSED 2026-08-15

- **Where** `reference/word-quest.jsx`, the `LEVELS` array: the 10-and-10 build re-cut
  Levels 1–12, and ten of the twelve needed names where before there were five. Level 1
  kept Hatchlings and Level 2 kept Sunny Start; the other ten — Jam Jar, Van Pals,
  Zig Zap, Dig Dog, Mom and Pop, Six Pins, Fox Box, Fix It, Red Hen, Fun Run — are the
  build's PROVISIONAL choices, each derived from the level's own words, plus an emoji
  apiece. Levels 13–20 keep their shipped names unchanged.
- **What a child experiences today** The provisional names, on the level chip and the
  level-up screen. Nothing is wrong with them except that no owner has read them, and a
  level's name is child-facing copy the same way feedback lines are.
- **Closed the same evening**: shown the ten names in chat, the owner ruled "Sound
  great" — all ten approved as offered. The engine's LEVELS comment no longer calls
  them provisional; this entry is the record of when and how they were ruled.

## S. The pre-level ladder has no mutant family — opened 2026-08-15

- **Where** `tools/mutants.mjs` (G5) and `tools/app-mutants.mjs` (G19): the ladder shipped
  with 15 tests but zero planted mutants, so nothing yet proves those tests can fail.
  The effect map names this entry as the follow-up.
- **What a child experiences today** Nothing wrong — the tests are real and green. The gap
  is proof-of-teeth: a quietly weakened pre test would not turn any gate red.
- **Done** means a G5 family over `checkPrePromotion` (the 80 percent bar, the streak cap,
  the graduation), a G19 family over `usePre.js` (the one-grade guard, the advance arming),
  floors `g5_source_mutants` and `g19_app_mutants` raised to match, and this entry closed.

## T. What the ladder fill found and did not fix — opened 2026-08-19

`tools/ladder-fill.mjs` seated the 162 target words the generator had left at no level at
all. Five faults surfaced while it was built. None of them is what the fill was for, so none
of them was fixed in that change, and each is written here rather than in a chat log.

### T1. Twenty-three of the generator's own placements sit before a child can read them

- **Where** `tools/ladder/ladder-v4.json`, among the 725 words the generator placed —
  not among the 162 the fill added, which are gated. `comes` at level 7 (readable at 64),
  `lived` at 16 (66), `waves` at 17 (57), `all` at 56 (86), `fall` at 80 (86), the whole
  y-to-i family at 53 (63), and seventeen more.
- **The cause** The generator scored a word by the letters it contains rather than by the
  units it is read in, so `comes` counted as readable the moment c, o, m, e and s had each
  been taught. A child meeting it there reads /k/-/o/-/m/-/e/-/s/.
- **What a child experiences today** Nothing: the ladder is a draft and no level of it has
  been converted to engine code. The moment it is, these are wrong-sound placements.
- **Why nothing catches it** `ladder-fill --check` reports the count as a LOOKUP and does
  not fail on it. Failing would leave the gate permanently red on a fault it was not built
  to fix, and a permanently red gate teaches everyone to skip it. `seatedEarly()` prints
  the number so it is on the page rather than in somebody's memory.
- **Done** means each of the 23 moved to a level that can read it, or ruled a deliberate
  exception with the reason, and the `--check` lookup then reading zero.

### T2. Three levels still seat no word, and two more sit under the owner's six

- **Where** `tools/ladder/ladder-v4.json`. Levels 32 (coda3), 72 (the open-syllable long a)
  and 94 (`ch` saying k and sh) seat zero. Levels 23 (`ch`, five words) and 24 (the quiet
  `th`, three) rose out of empty but stopped short of six.
- **The cause** No word in `tools/target-vocab.txt` is on topic for those five subjects.
  The fill refuses to pad a level with a word that teaches nothing about it — that is the
  silent fill this generator already had deleted once.
- **Done** means a word bill for the owner covering those five subjects, ruled the way the
  295-candidate bill was ruled, and the words seated.

### T3. The ladder generator is not in this repository

- **Where** Nowhere. No tracked `.mjs`, `.js` or `.py` writes `ladder-v4.json` or
  `shape-v3.json`; `tools/ladder/README.md` records that the ladder lived in a session
  scratchpad, and the scratchpad is gone.
- **What it means** The ladder cannot be regenerated, only edited. Every fault the
  generator baked in — the ten-word cap, the letter-coverage readiness model, T1 — is now
  a property of a data file that nothing can rebuild.
- **Done** is a decision, not a fix: either the generator is rewritten from
  `tools/ladder-fill.mjs`'s readiness model, which would let the ladder be rebuilt from the
  shape and the vocabulary, or the owner rules that `ladder-v4.json` is now hand-maintained
  and the fill's `--check` is the only guard it gets.

### T4. The shape and the ladder disagree about two levels, and only one was known

- **Where** `tools/ladder/shape-v3.json` against `tools/ladder/ladder-v4.json`. Level 49:
  the ladder's `new` is empty where the shape says `ce=s ge=j se=s ve=v ze=z`. Level 94:
  the ladder says `ch=k ch=sh` where the shape says `ch=k`. The 49 disagreement is named in
  `tools/ladder/README.md`; the 94 one was not named anywhere until now.
- **What it means** Two files answer "what does this level teach" differently, and nothing
  asks them to agree. Level 94 is also one of the three that seat no word (T2), so the
  disagreement and the emptiness may be the same fault seen twice.
- **Done** means a rule that the two files must agree on every level's `new` field, with a
  control that proves it catches a disagreement, and the two levels reconciled.

### T5. `docs/redesign-plan.md` contradicts itself about how many words the ladder holds

- **Where** `docs/redesign-plan.md`. The measured paragraph now reads 887 words placed and
  3 empty levels. Fifteen lines below, the "state today, measured" table says
  "Words placed | 749 + 22 heart = 771" and "Levels with no words at all | 9 (92–100)".
- **The cause** Pre-existing: the table was written against an earlier scratchpad ladder and
  never updated when `ladder-v4.json` was committed. The fill did not create this; it made
  it impossible to miss.
- **What a reader experiences today** Two numbers for the same fact in one document, which
  is exactly the drift `tools/ladder-status.mjs` was built to end.
- **Done** means the table's rows either recomputed from the files that own them or deleted
  in favour of a pointer to the lookup, and nothing in the document quoting a ladder count
  that a person typed.

## U. The readiness model knows spellings and not sounds — opened 2026-08-19

Five words were seated where a child sounding them out with the units they have
been taught produces the WRONG WORD. Found by the literacy seat reviewing the
fill's output, not by any gate. All five are now moved, but the model that put
them there is unchanged, so it will do it again.

- **`town` and `wow` at level 65.** That level teaches `ow` as the long o of
  *throw*. The `ow` of *out* is level 77. A child reads "tone" and "woe" — and
  those are the dangerous ones, because both are real words, so nothing signals
  the error and the child cannot self-correct.
- **`child` at level 23.** `i` is taught as the short i and nothing else until
  level 68. A child reads it to rhyme with "filled".
- **`dressed` at 21 and `brushed` at 22.** `-ed` is taught at 43, and it is the
  one suffix that is opaque: three pronunciations, two of which contradict the
  letters. Sounded out at 21 they give "dress-ed" and "brush-ed", two syllables
  where the word has one. This is the canonical early reading error, which is
  why the shape spends three whole levels (43, 44, 45) on `-ed` and one on `-es`.

**`ladder-fill --check` reports "none seated early" for all five, and is right
by its own definition.** `readyLevel()` asks whether every GRAPHEME of a word is
taught by that level. It never asks WHICH SOUND the word needs from a grapheme
that has more than one. Thirteen spellings in the shape are taught at two levels
— th, ch, ea, ie, ow, oo, ey, ear, ere, c, g, a, s — and the model resolves every
one of them to the earliest, which is the permissive direction.

This is the same blindness as section T's entry about the generator, but in the
fill's own output, and T does not cover it. It also caught the author of this
entry: a script written here to check which `-ly` words were ready reported level
19, because it read the final `y` as the consonant taught at level 23 rather than
the long e taught at level 51. Anyone re-deriving the model from its prose
re-derives the fault.

**What a child experiences today:** nothing, for these five. They are moved.

**Done** means `readyLevel()` takes a sound as well as a spelling — a word
declares which sound it needs from each multi-sound grapheme, or the model
declines to place any word using one until every sound of it is taught — with a
control per multi-sound spelling and a negative control that seats `town` at 65
and fails. Until then, every level teaching a second sound of an already-taught
spelling needs a human read of its word list before it ships.

**Two more of the same family were found 2026-08-20 by the move-bill commit's
audit — `sold` and `told` at level 30 — and CLOSED the same evening.** Both
need o saying its name before ld, a child at 30 would have sounded them with
the short o, and the blind model above is why the fill never flagged them.
The owner ruled: move both to level 68 beside cold/gold/fold. The move and
its one text repair (s:v3-l30-02, "told" became "said", read and heard
"perfect" on the pit-and-ow page) landed as one commit. They stand here only
as this entry's seventh and eighth pieces of evidence; the model that seated
them wrong is still the open fault.

## V. `-ful` now has the fault `-ly` just lost — opened 2026-08-19

The owner ruled on 2026-08-19 that "L53 teaches y-to-i AND -ly", and the suffix
graft of SPEC section 12 — the strongest research finding in the specialist's
report — finally reaches every suffix but one. `-ful` is the one. It is still
taught at level 98 of 100, and it is now the only suffix left at the top of the
ladder the graft exists to argue against.

- **Where** `tools/ladder/shape-v3.json` and `tools/ladder/ladder-v4.json`,
  level 98, rule `suffix_ful`.
- **The measurement**, taken the day the ruling landed. The target vocabulary
  holds six `-ful` words. Three are seated at 98 — *helpful*, *playful*,
  *useful*. The other three are seated EARLIER: *thankful* at 24, *wonderful*
  at 54, *careful* at 85. So a child meets a `-ful` word 74, 44 and 13 levels
  before anything explains the ending. That is the same arithmetic that
  convicted `-ly`, where *finally* sat at 51 and *slowly* at 65 against a
  teaching level of 98.
- **It is worse than it looks from the seats alone.** By the readiness model's
  own reckoning *helpful* and *useful* are readable at level 14 and were held
  at 98 regardless — 84 levels of waiting for words a child could already
  sound out.
- **What a child experiences today** As of the 2026-08-20 cutover this ladder
  IS the game, so the cost is now paid where a child can meet it: *thankful*,
  *wonderful* and *careful* arrive 74, 44 and 13 levels before level 98
  explains the `-ful` ending. Each carries its own audited sound row, so the
  word is taught truly when met - what is lost is the ending being NAMED
  before its early examples, not the words being wrong.
- **What was NOT done, and why** Level 98 was left at three words. Padding it
  is impossible without dragging *thankful*, *wonderful* or *careful* backwards
  past the level that made each readable, which is the fault the silent fill was
  deleted for. Three is an honest word bill, recorded in
  `tools/ladder/README.md` beside levels 23 and 24.
- **One residue on the `-ly` side, stated so it is not later called a surprise.**
  *finally* still sits at level 51, two levels before 53. It is one of the 23
  placements `ladder-fill --check` already reports as sitting before this model
  would read them, so it is counted, not hidden.
- **Done** means the owner rules on where `-ful` is taught, the same way he
  ruled on `-ly`, and the level moves with its words — or he rules that 98 is
  where it stays, and this entry closes with that ruling recorded in SPEC
  section 12. Either way it is a decision page, not an agent's judgement:
  the `-ly` ruling was, and this is the same question.

## G. Ideas worth trying that nobody has tried

- **A rules-and-exceptions practice game (owner, 2026-08-20, for the next
  beta).** His words: "we should also have these rules and exceptions as a
  game kids can play. Magic e. All those type of special cases so they can
  practice them." The day's phonics rulings are the natural syllabus: the
  magic-e pattern (spite, trite, kite, bite, line - his own examples), soft c
  and g by the letter that follows, ch's Greek /k/ words taught AS the
  exception, the -ought family, and the marked tricky words (come, love,
  some, month). The rulings and their word lists are already in the ladder
  and WORD_SOUND, so the game's content exists the day the mechanism does.

Owner-instructed 2026-08-12. Unlike every section above, these are **not** faults and not
rulings: they are approaches that looked promising in conversation and would otherwise be
lost the next time a context is condensed. An idea leaves this section by being tried, and
the result goes wherever it belongs — `docs/settled.md` if a measurement closed it, a round's
row if an ear did. **Trying one is never a substitute for the game work it was meant to
serve, and nothing here may be counted as progress until it has been tried.**

### G8. A SPOKEN bent-sound signpost — noted 2026-08-15, owner: "shown now, spoken explored later"

When J1's written notes shipped, the owner was offered a spoken layer — a rotating line
before the sound-out ("One sound is special here — listen:") followed by the bent sound's
own clip — and chose to explore it later rather than promise it. What it would take, so
the exploration starts honest: a render-capable session (this machine has no synthesiser —
measured 2026-08-15), ONE new recorded line through a full listening round (the
three-lines-take-turns pattern is the precedent), and S4 shapes the wording absolutely —
speech may never name a letter, so the spoken line can never say what the written notes
say ("The e says..."), only point ("listen:") and play the approved sound clip. The
written notes are complete without it; this is an idea, not a debt.

### G7. The voice-asset migrate ("Pass B") — noted 2026-08-15, not built, and read the critique first

The owner shared an externally-authored refactor brief whose second half designs a full
voice-asset migration: a JSON schema per asset, `assets/` and `pins/` trees, five new Python
tools, git-LFS decisions, a `legacy/` freeze of `tools/voice-words.csv`, release zips and CI
changes. Its first half (ownership and pointers) was reviewed, corrected, and built on
2026-08-15 as gate G23; the second half is recorded here so it is neither lost nor started.

**The critique that must travel with it, from the 2026-08-15 review:**
- **It never names the fault it closes.** Every fault it cites (two sound ledgers, stale
  counts) was already closed by other means. Before any of it is built, the question is:
  what goes wrong today that this fixes?
- **It rewrites E10 as a step inside a migration.** Freezing the one file a person edits
  after a listening round means rewriting a CLAUDE.md engineering rule — the owner's call,
  taken at the top, never a bullet in a plan.
- **The pin-storage branch is the real risk.** If LFS is not in use, audio in git inflates
  the repository permanently; the fallback (gitignore `pins/`, read bytes from a CI zip)
  puts the declared authority OUTSIDE the repo — fragile for a project whose safety story
  is byte-pinned audio in the tree.
- Its useful parts already landed: one-fact-one-owner (G23), the born-red proof shape, the
  log exemption, pointer-not-copy.

An idea leaves this section by being tried; trying this one starts with the owner naming
the fault it would fix.

### G6. An open-weights MUSIC model — noted 2026-08-14, and read the caveat first

The owner saw MiniMax-Music3 announced (open weights, on Hugging Face) and asked whether it
could make sounds or music for the game, or phonics sounds.

**NOT for phonics sounds, and this is the important half.** A music model is not a speech
model. Every sound and word in this pack is af_heart through kokoro, byte-pinned, and
graded by ear in a numbered round; the whole apparatus in `docs/settled.md` exists because
small differences in a single phoneme are audible to a listener and matter to a child
learning what a letter says. Pointing a music generator at `d:short_a` would be the wrong
tool, and G13 would refuse the result anyway because no round would have heard it. Anyone
who reaches this entry looking for a shortcut to rendering sounds should stop here.

**Where it could genuinely earn a place:** the game has NO music and no ambience at all
today. Nothing plays between words; the only audio is speech. Whether it should have any is
an unmade design question, not a technical one, and there is a real argument for keeping it
silent — the voice is the teaching, and anything under it competes with a four-year-old's
attention on a single sound. A celebration sting at a level-up, or a quiet arrival theme,
is the shape most likely to survive that argument.

**Three things to settle before any experiment:**
- **The licence.** "Open weights" is not the same as permissive. Check the actual terms
  before anything is downloaded — this project has an owner-approval rule for dependencies
  precisely so that question gets asked out loud.
- **S6 and offline.** Any audio must ship inside the pack and play with no network, like
  every other clip. Nothing may call out at runtime.
- **The owner's ear still decides.** Generated or not, anything a child hears goes through a
  round. That is not negotiable and is the same rule that governs the voice.

### G5. Let an agent actually HEAR the audio — suggested to the owner 2026-08-14

Every automatic check here is deaf. `voice-check.mjs` counts clips and checks pins;
`voice-edges.py` measures where speech sits; `sound_agreement.py` compares the tiles
against the phonemes the SYNTHESISER claims. Not one can tell whether a clip says the right
thing. That gap has cost real rounds: `soundout-1` said "read" as *reed* and reached the
owner's ear, and the only reason it was caught is that a person listened.

**The suggestion**, from another model: expose an audio-capable model to the agents through
a small local command-line or MCP utility. `Phi-4-multimodal-instruct` is MIT-licensed with
an MIT ONNX release, takes audio plus a written prompt and returns text, and names speech
recognition and audio understanding among its intended uses. The agents' problem is not
intelligence — the harness passes text and images and never passes raw audio to anything
that can hear.

**What it could do:** catch a clip that says the WRONG THING before it costs a round. A
word clip saying a different word. A sentence with the *reed* fault. A sound clip that is
silence, clipped, or the neighbouring phoneme. Each is a factual error a machine can find,
and each has reached the owner at least once.

**What it must NEVER do, and a future agent must not talk itself past this.** It cannot
decide whether a sound is GOOD. CLAUDE.md is explicit that spoken-word correctness is
proved by a listening round and nothing else, and G13 refuses any recipe no person heard.
The distinction is the one `sound_agreement.py` already records about itself: a REFUSAL,
not a proof. A machine saying "this clip says red" removes a wrong arm before it wastes an
evening. A machine saying "this clip sounds good" is worth nothing — the owner's ear is the
only thing that has ever settled that, and the ten-sound review of 2026-08-12 proved a clip
graded ALONE is a different question from the same clip in company.

**Cost to try:** a new dependency, so it needs the owner's approval under the AGENTS.md
rule before anything is installed. The honest first experiment is small: run it over the
598 clips already shipped and see whether it independently reports what each one says. If
it agrees on all 598, it has earned a place in front of the next round. If it disagrees
anywhere, that is either a bug in the tool or a fault nobody has found, and both are worth
the afternoon.

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

## Q. Build-it's own proofs, and two decisions it raises (2026-08-17)

Built the day it was ruled, and reviewed the same day by an agent with no memory of
building it. What that review found is fixed — slots that held a letter rather than a tray
position, so eleven words with a repeated sound could never be built; a tray that stayed
live while the last sound played; callbacks that outlived the screen; a breather that
never fired after the first session of a page load; a mode that says nothing at all with
sound switched off. What it found and is NOT fixed is here.

**Q1. FIXED 2026-08-17.** The screen has no test. `app/src/screens/BuildItScreen.jsx` is not named in any
suite. D1's chooser row, D4's absence of adult marks and all of D5 are unproved, and the
mode's load-bearing claim — that it writes nothing to the record — has no tripwire, while
the analogous free-play claim has one (`tests/safety.test.js`, a source scan with fixture
controls). The claim is true today; it was traced by hand and the screen touches only UI
state. Done means: a source tripwire in the repository's own idiom, plus a walk that
builds a word, misses twice, and reaches the scaffold. Gate G25 cannot see this gap — its
own header says it proves that something CLAIMS to prove a rule.

**Q2. FIXED 2026-08-17, and the class with it.** The new child-facing copy has never been through G11. `tools/copy-lint.mjs`'s
corpus lists App, Home, Session, Done, PreSession and PreDone, not BuildItScreen, so
"That says …", "Watch where each sound goes, then copy it.", "🎉 You built …" and the
grown-up line have not been checked against SPEC. Two source scans have the same omission:
the S6 network scan in `tests/safety.test.js` and the file list in `tools/doc-truth.mjs`.
Done means all three know the file — and, because the copy is new and child-facing, that
the owner has approved the sentences.

**Q3. FIXED 2026-08-17, owner-asked.** A child can build a word the owner ruled out. The tray's
distractors make other words reachable, and a miss prints and SPEAKS what the child
built: a Level 6 child building "dog" with a b distractor hears "That says g-o-b". gob was
removed from the bank on 2026-08-13 so it could not return by accident, and this returns
it. Every ruled-out word measured is reachable from some tray. The options, none of them
free: screen the built string before speaking it and stay silent on a hit; refuse
distractors that complete a ruled-out word, which shrinks the pool per word; or accept it,
on the grounds that the app never presents the string as a word and immediately corrects
it. This one is the owner's.

**Q4. FIXED 2026-08-17, both paths.** The breather drops a missed word's second look. When the breather takes the press
after a word graded "not yet", the retry is never queued: `lastGrade` is cleared before
the build starts, and the decision that re-queues the word reads it. The sentence stage
has the same shape and predates Build-it, so this is one fault in two places rather than a
new one, and it is a real loss to a child — the word they got wrong does not come back.

**Q5. FIXED 2026-08-17.** A service-worker refresh can take the screen away mid-build. `app/src/swrefresh.js`
treats "any screen except a live session" as a safe moment, and the breather is a live
session under a new screen name. The pre-letter ladder has the same hole and predates this.

**Q6. FIXED 2026-08-17 as Build-a-sound.** The pre-ladder child is offered Build-it. Free play offers "Build a word" to a
child who has not yet met a letter, which is a whole-word build before the ladder's first
step. Probably wrong; needs a ruling.

**Q7. FIXED 2026-08-17 — five words had a SILENT tile, and 42 had a lying one.**
Found by a fresh-context debug agent, outside the six it was given. The screen took a
tile's sound from the LETTER while taking the celebration's sounds from the WORD: two maps
in one turn. For out, said, there, they and you the letter's map has no clip at all — the
four units S8 says have no ruled default — so tapping the ou in "you" played nothing, in
the mode whose entire feedback is that sound, and a miss holding that tile silenced the
whole sound-out rather than one tile. For 42 more the tile contradicted the word: his's s
said /s/ while the word said /z/. Every tray tile now carries its own sound, decided when
the tray is built — the word's bent sound for a tile that belongs to it, the default for a
distractor, which has no word behind it. A test sweeps every buildable word at three draws
and requires no tile to be silent, with a control that the pack really does lack d:ou.

Two faults in the day's own new test file, also found there and also fixed: the
no-writes tripwire's regex ended in a word boundary after a bracket, so `setState(` and
`mutate(` would have been missed on every real call — the fixture controls happened to
pick the one spelling that matched; and the "a completed build saves nothing" test was
vacuous, because the screen cannot reach the storage module from its own import tree, so
the probe would have been empty however the screen behaved. It now fires the mocked saver
and requires the probe to report it.

## W. What the free-play empty-pool guard found and did not fix — opened 2026-08-19

The crash itself is closed: free play refused to deal an empty pool from the day the guard
landed, the chooser stopped offering a mode it cannot serve, and two tests hold it with
three planted mutants behind them. What follows was found in the same read and is NOT
fixed, so it lives here rather than in a chat log.

**W1. The screen switch has no default, and an unknown state lands a family in the
Grown-ups corner.** `renderScreen` in `app/src/App.jsx` tests each screen with the data it
needs — `screen === "session" && currentWord`, `screen === "pre" && preQ[preQi]`,
`screen === "done" && doneStats` — and every one of those guards falls through to the SAME
final `return`, which is `ParentScreen`. So a session whose queue is empty does not fail
loudly and does not show a blank stage: it silently opens the adult settings screen, mid
visit, with no tap to explain it. That is how the empty sentence pool behaved once its
throw was guarded and nothing else was — measured, not reasoned: a planted mutant with the
`beginFreePlay` guard removed and the `showSentence` guard kept put the test on the
Grown-ups corner, and the test caught it by looking for "▶️ Begin Session" and not finding
it.

Every route to that state that this change could find is now closed at its source, which is
why this is a latent gap and not a live fault. **Done** would be the switch ending in
something honest for a state nobody planned — the home screen, which is always renderable —
with ParentScreen reached only by asking for it. Not done here because the fall-through is
load-bearing for the `screen === "parent"` case and rewriting the switch is a bigger change
than a guard, and because it deserves a ruling: a family dropped into the settings screen is
a different kind of wrong from a family dropped home.

**W2. Free play offers sentences and level words to a child still on the pre-letter
ladder.** A child at Pre 1 to Pre 4 has met a handful of letters and no whole word. Their
save still carries `level: 1`, so the chooser offers them "🎯 Level 1 words" and
"📖 Sentences", and the sentence row serves a full CVC sentence to a child who has not yet
finished meeting the alphabet. The Build-it row is hidden for exactly this reason at Pre 1 —
"a tray would have nothing honest to hold" (Q6, owner-ruled 2026-08-17) — and the same
reasoning has never been applied to the two rows beside it.

This is not a crash and not a guess about the code; it is a teaching decision, and it
belongs to the owner and the literacy seat rather than to an engineering change (E8). **Done**
is a ruling on what free play offers a pre-ladder child, and the chooser matching it.

## X. An updating child keeps an old level NUMBER on a re-numbered ladder - opened 2026-08-20, CLOSED 2026-08-21 by the owner's recompute ruling

- **Where it lives** `migrateV6` and `OLD_TO_NEW` in `reference/word-quest.jsx`
  (extracted to `src/engine.js`).
- **What it is** The v6 migration takes the stored level as a floor and runs a
  box recompute against the new ladder as the lift. The 2026-08-20 fidelity
  audit MEASURED the lift inert: even a reader with all 476 old words at box 5
  recomputes to level 6, because new level 6 seats *cops* and *spots* and the
  old bank taught neither (5/7 = 71%, under the 80% gate). So for any save
  stored at 6 or above, migration reduces to `min(stored, 100)` - the NUMBER
  rides across, but old level 15 and new level 15 teach different code, so the
  child skips every new grapheme seated below their old number and is walked
  through review levels above it. `OLD_TO_NEW` (v2 saves) still maps to
  targets addressed to the dead 21-level ladder, the same fault one layer
  older.
- **What a child or grown-up experiences today** A child updating from
  beta.21 resumes at their old level number. Nothing breaks and no progress
  is lost - boxes, mastery and sessions all keep working, and every word they
  meet is fully taught when met - but graphemes the new ladder introduces
  below their seat (digraphs, teams, magic-e, whatever their number skips)
  are never introduced by their named teaching level.
- **What done means** The owner rules a seating policy, the migration
  implements it, and a test pins a graduate save to the ruled seat with
  literal expected values.
- **CLOSED 2026-08-21.** The owner ruled "Recompute the seat from the
  child's own graded words" on the cutover morning page. migrateV6 now seats
  any graded save by the walk alone (a graduate lands at 6, where cops and
  spots begin the teaching the old game never gave), and a save with no
  graded word keeps its stored, clamped number - the only evidence it
  holds. Pinned in tests/engine.test.js ("seats an updating child by the
  ruled recompute"), rails measured then re-typed. OLD_TO_NEW survives only
  for that no-graded fallback, where the number was a grown-up's hand-set
  choice in any world.

## Y. Cutover residue found by the audit seats (2026-08-20)

### Y1. An inflected "laugh" would re-tile as augh, against the one-use-ugh ruling

- **Where it lives** `ruleTilesFor` in `reference/word-quest.jsx`: the chunker
  knows `augh`, so `chunkWord("laughs")` gives l-augh-s while the owner's
  ruling tiles the base word l-a-ugh with ugh saying f.
- **What a child experiences today** Nothing, measured: no inflected form of
  laugh is in the bank or in any sentence (only "laugh." appears, in
  s:v3-l82-02, l91-01 and l91-02).
- **What done means** The moment any laughs/laughed/laughing is seated, its
  lexicon row is written l-a-ugh-(ending) to match the ruling, and the G27
  lexicon gate then holds it. This entry exists so that seat is planned, not
  discovered.

### Y2. Seven sentence texts ship twice under different ids

- **Where it lives** The v3 sentence set: e.g. "The rat ran from the box." is
  both s:v3-l18-02 and s:v3-l18-51; the l5/l23 mat text, the l10/l20 pen
  text, and the l31, l33, l40 and l46 pairs repeat the same way.
- **What a child experiences today** The no-repeat rule works by ID, so a
  session pool holding both ids can serve the identical text twice - dulling,
  not wrong. Each duplicate also carries its own clip, so the pack holds
  bytes it does not need.
- **What done means** One id per text: the ladder drops the duplicate ids,
  their clips retire by the amused pattern, and the sentence-count pins
  re-derive. An engineering change, deferred past the cutover commit so the
  audited tree ships exactly as audited.

## Z. A random property caught a stale bound, and the gate could not say so - opened and CLOSED 2026-08-21

- **Where it lives** `tools/app-mutants.mjs`, the pristine-suite control that
  runs before the mutant loop.
- **What happened** Gauntlet run 12 (beta 25, commit 5406c48) reported
  "Runner control FAILED: the pristine suite does not pass" and refused the
  gate. G6 ran the SAME full suite minutes later in the same gauntlet and
  passed, with 97.3 per cent app-line coverage. Afterwards the suite passed
  eleven times in a row (three interactive, eight back-to-back in a detached
  runner) and G19 alone killed all eleven of its mutants, exit 0.
- **What a child or grown-up experiences today** Nothing. No product code is
  implicated; the failure is in the gate's own runner, and the gate fails
  CLOSED, which is the safe direction.
- **What was learned, and fixed** The control could not say WHAT failed - it
  printed one sentence and exited - so a whole release run produced no
  diagnosable evidence. Both mutation gates now print every failing line and
  the tail, and they tell a failing SUITE from a crashed RUNNER: a non-zero
  exit with zero failing tests is now named as an environment error rather
  than as a suite that does not pass. That distinction is the mutant loop's
  own three-outcome rule (killed / survived / errored), which the control
  guarding it had never had.
- **CLOSED the same evening, and the environment hypothesis was WRONG.**
  Run 13 - the single re-run the deflaking rule allows after a correction -
  failed at G1 instead, and G1 prints its child's output: a property in
  `tests/properties.test.js` asserted `m1.level <= 21`, the PRE-CUTOVER
  ladder's size, which the 2026-08-20 conversion missed. The property draws
  hostile saves at random, so it fails only when a draw carries a level
  above 21 - plain JSON draws never do (measured: 4,000 of them reach level
  2 at most), and only the shaped hostile record with its own `level` field
  does. That is the whole shape of the incident: eleven clean runs, then two
  failures in one evening, in two different gates. G19's control was the
  first to meet it and could only say "the suite does not pass"; the naming
  it gained in this entry's fix is what let the second occurrence be read in
  seconds. The bound is now 100, a literal per E4, with the ladder's size
  named in the comment; five randomized runs of the property suite pass.
- **What the incident is kept for** A gate that cannot name its failure
  costs a release cycle - run 12 produced an hour of evidence pointing at
  nothing. Both mutation controls now print every failing line and tell a
  failing suite from a crashed runner. Neither run was retried until green.

## AA. The adult controls' edge is below the bible's 3:1 rule — opened 2026-08-22

- **Where it lives** `C.line` (#dfe5f3) in `reference/word-quest.jsx`, drawn as the border
  of the Grown-ups corner's text inputs (`.wq-input`), the strip's buttons (`.wq-sbtn`), the
  strip's top edge (on paper at .72 over the three stops: 1.10, 1.09 and 1.12:1), the
  corner's row dividers, the
  to-do ring of the progress segments (`.wq-seg-todo`, on `chip`), and the corner's mastery
  legend swatches (`ParentScreen.jsx`, `1px solid` line on chipGreen, chipAmber, chipRed and
  chip: 1.03, 1.06, 1.07 and 1.07:1 - the fifth judgement's count, so step 4 darkens every
  one of them and not five of six).
- **What a grown-up experiences today** Input fields and strip buttons whose edge measures
  1.26:1 on paper, and progress segments whose ring measures 1.07:1 on chip — faint
  boundaries, below the 3:1 the bible's section 15 asks of a control's edge. Nothing
  child-facing: the child's controls are the CTAs and the tiles, which carry their own fills
  and edges. Found by the council's third judgement of step 0, which refused the sentence
  "every edge the game draws clears 3:1" while this one did not.
- **What done means** `line` (or the edges that read it) at or above 3:1 on the surface each
  edges, measured in `tests/tokens.test.js` at literal ratios, declared as the visible
  change it is at the grown-up-zone step (art plan step 4), and this entry closed with the
  value. Until then test 3b holds the two ratios at 1.26 and 1.07 so the gap cannot drift
  silently, and the bible's 9.3 row for `line` says the same.

## AB. The open sentence word's ring is below 3:1 on two of the three gradient stops — opened 2026-08-22, CLOSED 2026-08-22 by art step 1

- **Where it lives** `.wq-sword-open{outline:3px solid ${C.action}}` in `app/src/wq-css.js`
  (and the reference's copy), drawn round the sentence word the child is on, on a
  transparent button over the root gradient (`SentenceStage.jsx`).
- **What a child experiences today** The "this one, now" ring round the current sentence
  word measures 2.95:1 on skyBlue, 2.88:1 on skyLavender and 3.15:1 on skyPurpleMist —
  below the 3:1 the bible's section 15 asks of an important boundary on two of the three
  stops. Found by the council's fourth judgement of step 0, which refused the sentence
  "one edge is still below the rule" while this one was too.
- **What done means** The ring at or above 3:1 on all three stops (a darker token, or a
  ring with its own ground), measured in `tests/tokens.test.js` at literal ratios,
  declared as the visible change it is, and this entry closed with the values.
- **CLOSED 2026-08-22, by art step 1 rather than step 3** (owner-ruled on the ceramic-tiles
  page): the ring reads `cyanStructural`, the same mark the sounding tile takes, and
  measures **4.73, 4.61 and 5.05:1** on skyBlue, skyLavender and skyPurpleMist. Test 3c
  holds those literals and keeps the action figures (2.95, 2.88) below 3 as its control.

## AC. No Larger / Higher-Contrast Reading setting exists, and the scaffold letter's raise under it is unstated — opened 2026-08-22

- **Where it lives** Bible 15.3 names a Larger / Higher-Contrast Reading setting that
  strengthens boundaries; `app/src` has no such setting (zero hits for it in the sources,
  counted by the council's before pass on art step 1). Art plan step 10 owns the sensory
  settings.
- **What a child experiences today** Nothing different from yesterday: the scaffold letter
  renders at opacity .60 (3.28:1 on the slot, owner-ruled 2026-08-22) for every child, and
  a child who needs more contrast has no control that gives it.
- **What done means** Step 10 builds the setting, states at a literal what it raises the
  scaffold letter to (opacity 1 is 8.80:1 on the slot) and what else it strengthens, with a
  test that reads the value under the setting; this entry closes with the values.

## AD. Keyboard focus on the open sentence word replaces its ring — opened 2026-08-22

- **Where it lives** `button:focus-visible{outline:3px solid ink;outline-offset:2px}` in
  `app/src/wq-css.js` against `.wq-sword-open{outline:3px solid cyanStructural;
  outline-offset:-3px}`: both write `outline`, and the focus rule wins on the focused
  open word.
- **What a child experiences today** A keyboard child sees the "this one, now" mark change
  shape and colour the moment the open word takes focus; a touch child sees nothing
  different. Pre-existing (the action ring lost to focus the same way); named by the
  reading chair at art step 1's after pass. The tile controls got their own dashed focus
  rule in step 1 and are fine.
- **What done means** The reading-surface step (art plan step 3) gives `.wq-sword:focus-
  visible` a dashed `cyanStructural` ring at a positive offset, drawn so the open mark and
  the focus mark coexist (a box-shadow for one of them), with a test that reads both; this
  entry closes with it.

## AE. A long word's Build-it tray is below the fold on a phone in landscape — opened 2026-08-22

- **Where it lives** `app/src/screens/BuildItScreen.jsx`: the slot rows and the tray stack
  vertically in a 420 px container inside the stage. On the phone-landscape profile (iPhone
  13 landscape — a **750 × 342** page, not the device's 844 × 390) the stage is **245 px**
  tall between the 62 px header and the 35 px strip (its lower edge at y = 307), and the
  640 px shell leaves 620 px of stage width after the short-stage padding. (The entry first
  said "844 × 390" and "a 268 px stage" — the device, and a number recalled rather than
  measured; the council's antagonist refused it on 2026-08-22 and these are the page's own
  numbers, read on the profile.)
- **What a child experiences today** Every tray, not only a long word's: with "ship" (three
  slots, five tiles) the tray's one row sits at y = 264 to 328 — the lower 21 px of every
  tile under the strip, since the stage's edge is at 307 — so 43 px of each 64 px tile can
  be seen and touched against S7's 56, and every letter is cut at its baseline (a p tile
  shows its bowl and no tail); the boxes and centres are in reach, which is why the
  Build-it cell passed it until it read the visible part (the reading chair, the seventh
  judgement). With "breakfast" (eight slots, ten tiles) the slots take
  two rows of five and three 64 px boxes from y = 142, and the tray's two rows of five begin
  at y = 338 and 412 — below the stage's 307 px edge, the first row straddling the page's
  342 px fold under the strip, the second wholly past it; from the first slot's top to the
  last tile's bottom is 334 px (142 → 476). The stage scrolls 171 px, but a child will not
  think to scroll and nothing says there is more. Measured by the census's Build-it cell on
  2026-08-22: all ten tray tiles with their bottoms past innerHeight (off the screen, where
  a cover cannot be read), every slot in reach. The cell holds exactly both shapes on the
  landscape phone — "ship"'s five tray tiles clipped at the stage's edge, with the visible
  height in its report, and "breakfast"'s ten tray tiles off the screen by name, with the
  page's own innerHeight, stage and lowest-control numbers, and this entry's heading still
  ending at its opening date — and zero findings on every other profile. Older than the ceramic step. The
  Galaxy S9+ needed the compact build (art step 1) to fit in portrait; the iPhone 13 and the
  Pixel 7 fitted at 64 px before it (lowest control 607 px against the strip at 613, and 715
  against 788).
- **What done means** The Build-it layout step (bible 13.7, the garden-workshop surface —
  art plan step 4 or the step the owner assigns) composes the screen for a 245 × 620 stage.
  What the code's own sizes say, for the deal the engine makes: "breakfast" chunks to
  b-r-ea-k-f-a-s-t, one multi-letter unit, so one row of its eight slots at 56 px is 510 px
  (7 × 56 + 76 + 7 × 6) — it could take one row only if the container widened past 420 —
  and a ten-tile tray is 634 to 674 px by the distractors dealt (634 with two single-letter
  ones, 674 with two multi-letter ones, as the Galaxy render's deal had), which no row of
  the 620 px stage holds; two tray rows of five at 56 are 118 px. Whether a 56 px slot row,
  two tray rows, the prompt and the message fit 245 px is the step's to measure, not this
  entry's to assume — or the stage gets a scroll affordance a child understands. Done is
  every word's tray wholly above the strip: the census's Build-it cell holding zero
  findings — no control unreachable, none clipped — on the landscape phone, at which point
  the landscape pins in that cell are removed with this entry.

## AF. The sounding band and ring reach into the word's descenders — opened 2026-08-22

- **Where it lives** `app/src/wq-css.js`: `.wq-slot-tiles{margin-top:8px;min-height:52px}`
  under `.wq-word{margin:4px 0 0;line-height:1.05}` (on the short stage, margin 3, min-height
  30, the word's margin 0); the band's reach above a tile is ring 3 + band 6 = 9 CSS px (7 on
  the short stage and at six tiles). The clearance from the word's box to the tile's box
  today — the margin plus the row's centring slack — is 13.2 / 9.8 / 13.1 / 11.7 / 3 / 5.7
  CSS px on the Galaxy S9+, the Pixel 7, the iPhone 13, the desktop, the 390 × 500 short
  stage and the landscape phone.
- **What a child experiences today** When the tile under a descender letter (p, g, j, q, y)
  sounds, its band and ring cross the bottom of the letter's tail. Measured 2026-08-22 on
  the set `D:/CVCGame-ops/art/step1/0d887f3/` (hashes.json, `junction` and
  `junctionLayerRemoved`), on "pig" with the p tile and then the g tile sounding: the
  word's lowest ink row in the tile's own columns read on the attempt phase (no tiles, the
  word not moving between phases; the `<profile>-attempt-pig.png` renders, hashed) against
  the band's first row under those columns — taken from the render with the word's layer
  planted away, where no ink hides it: with the layer kept the g's bowl covers the band's
  first rows on the Pixel 7 (the read lands 4 rows lower, 8.0 for 9.5) and the desktop
  (3 rows, 9 for 12), and nowhere else. The
  tails run below the word's box by 8.7 / 9.6 / 8.4 / — / 3.3 / 3.1 CSS px (p) and 9.1 /
  10.0 / 8.8 / 14.3 / 3.7 / 3.4 (g; the g is the lowest on every profile); the p crosses
  the band by 4.4 / 9.1 / 4.7 / 0 / 7.7 / 4.7 and the g by 4.9 / 9.5 / 5.0 / 12 / 8.0 / 5.0
  (on the desktop the 112 px word's p sits left of its tile's columns; its g does not, and
  its bowl runs 3 px into its own tile's box, 0.7 px on the short stage). Where the tail
  reaches the ring it crosses the whole 3 px ring on the Pixel 7 (p and g), the short stage (p and g) and the desktop (the g), entering the tile's box by 0.3 / 0.7 px on the short stage and 3 px on the desktop, where the g's bowl covers the ring's and the rim's whole top runs (the ring's 26–28 columns and the rim's 16 in the layer-removed render; the bowl about 30 px wide at the rim row); touches the ring on the landscape phone (0.7 / 1 px); reaches no ring on the Galaxy or the iPhone 13. Until the fifth judgement the band and ring painted
  OVER the tail and hid it — reproduced on the same set with the word's layer planted away
  (`.wq-word{z-index:auto}`; the `-layer-removed` renders): of the ink pixels in the rows
  from the band's first row to the tile's top, the p's 980 / 744 / 462 / — / 352 / 224 in
  the attempt phase and 11 / 91 / 11 / — / 0 / 0 surviving while the tile sounded (a wedge
  at the band's rounded corner), the g's 1766 / 1834 / 817 / 297 / 510 / 399 and 242 / 86 /
  106 / 11 / 0 / 20. Since then the word paints above the row
  (`.wq-word{position:relative;z-index:1}`, read by the census's sounding cell as
  `word-not-above`, the row's own layer included), so the glow passes behind the tail and
  hides no ink: in the kept-layer read's own rows the counts are equal in both phases to
  antialiasing — the p's 980 / 744 / 462 / — / 352 / 224 against 980 / 744 / 462 / — / 362
  / 226, the g's 1766 / 1471 / 817 / 198 / 510 / 399 against 1767 / 1478 / 818 / 199 / 520
  / 403 (the g's rows on the Pixel 7 and the desktop start lower in that read, so its counts
  there are smaller than the layer-removed run's) — **but the trade stands until the
  clearance lands: where a tail reaches the ring, the tail now paints over it** as above.
  The art director and the reading chair judged the trade on the set (the thing being
  taught is never covered by its cue; the silhouette stays whole where before the loop was
  sliced flat); the owner has not been asked, since the reading surface step removes it. Older than the ceramic step:
  the 7 px ink outline reached the same rows, ink over ink, invisible; the step made it
  cyan. Found by the council's art director from pixel rows, then rendered; the ring
  crossing named by the antagonist.
- **What done means** The reading surface step (art step 3, which owns the stage's vertical
  composition and bible 10.4's margins) gives the row a box-to-tile clearance of at least
  the g's overflow plus the band's reach on every profile — about 18 / 19 / 18 / 23 / 11 /
  11 CSS px against today's 13.2 / 9.8 / 13.1 / 11.7 / 3 / 5.7, so the row moves by about
  5 / 9 / 5 / 12 / 8 / 5 — with the stage spacer moved by the same amount so the word's
  midline holds (the owner's 2026-08-03 choice), G7 and the phase walk green. Proof: the
  same junction read on "pig" with the g tile sounding (the p too) on all six profiles
  showing the band's first row below the word's lowest ink row, the ring whole on all four
  sides again, and the word's layer kept as defence in depth. The same round shows a
  sentence whose open word carries a descender against the open word's ring at offset −3
  (the art director's note; no deal of "Any sentence" produced one in 14 tries on two
  profiles on 2026-08-22), the desktop first, where the slack under the line box is about
  7 px.

## AG. The landscape phone's reveal is cut at the stage's edge — opened 2026-08-23

- **Where it lives** `app/src/wq-css.js`: the three-zone shell (header, stage, rail and
  strip) with `.wq-stage{overflow-y:auto}` and the short-stage rules under
  `@media (max-height:520px)`. On the phone-landscape profile (iPhone 13 landscape, a
  750 × 342 page) the reveal's stage is about 85 px tall under the 62 px header and above
  the "Next word" rail and the two-row grown-up strip.
- **What a child experiences today** On the reveal the word fits, but the tile row's top
  sits at y = 128 and the stage's clip edge at about 147, so the tiles lose their bottom
  rim, the sounding tile its ring's bottom side and its band, a g tile three quarters of its
  loop — and the feedback sentence lies wholly below the edge, out of view, with nothing to
  say it is there (the stage scrolls; a child will not). Measured by the council's reading
  chair on `D:/CVCGame-ops/art/step1/0d887f3/phone-landscape-reveal-pig-sounding-g-tile2.png`
  (device rows 384 to 440 of tile, sky from 441, the rail's fill from 453; the sentence in
  no render) on 2026-08-23. The full census has been red there since real devices were
  adopted on 2026-08-21 — its close and wrong reveal cells report the sentence "not on the
  screen a child is looking at" and the tiles' boxes overlapping "Next word" (run on
  2026-08-23; the 2026-08-21 full-run log shows the same cells red) — and nothing recorded it:
  the gauntlet does not call the census, by the owner's 2026-08-02 trade, so no release
  was blocked and none will be by this. Older than the ceramic step (the short-stage tile
  rules are unchanged since the cutover); the step made the cut ring cyan. The census's
  sounding cell now pins exactly this shape on the landscape phone — the row's bottom and
  the message's bottom past the stage's clip edge, with the page's own numbers, on the
  first pop, the second and both densities — and refuses it on every other profile.
- **What done means** The reading surface step (art step 3, which owns the stage's
  vertical composition and the frame out of flow) composes the reveal for a 342 px page —
  the word, the row and the sentence inside the stage's edge, or a stage that takes the
  rail's and the strip's height back in landscape — and the census's sounding cell holds
  zero findings on the landscape phone, the full census's close and wrong reveal cells are
  green there, and the landscape pin in the sounding cell is removed with this entry.

## AH. A pre-level item never plays its own question — opened 2026-08-24, CLOSED 2026-08-24 in beta 28

**CLOSED** by the owner on the device that found it, checking beta 28: "ear now speaks its
sounds by itself. timing feels right". The question is asked out loud on arrival and on each
new item, `tests/pre.test.js` holds it by asserting on the PLAYER rather than the light (the
light cannot see it in jsdom), and removing the call turns that test red. The timing question
the entry left open — how long after the screen appears it should play — is answered by the
same check: as the screen arrives, and it reads right to a person.

## AH-history. A pre-level item never plays its own question — opened 2026-08-24

- **Where** `app/src/usePre.js` — `beginPre()` sets the screen and `nextPre()` advances the
  item, and neither calls `playPrePrompt()`. The function exists and is correct; it is wired
  only to the 🔊 in the grown-up strip (`app/src/screens/PreSessionScreen.jsx:68`,
  `aria-label="Hear it again"`).
- **What a child and a grown-up experience today** The screen asks
  "What word do the sounds make?", shows an ear, and the rail says
  "Listen… then say the word! 📣" — and nothing plays. On Pre 1 the sounds ARE the question,
  so a child is asked something they cannot hear, and nothing on the screen tells the adult
  that pressing the small speaker is what asks it. The button's own label says "Hear it
  AGAIN", which promises a first time that never happened. The same is true from rung 2
  onward, where the letter is shown and its sound is the prompt the child must echo: the
  letter appears in silence and there is nothing to say back.
- **Found by** the owner, on the first minute of the beta 27 device check (2026-08-24),
  reported as "this says what word do the sounds make but all you see is a picture of an ear".
  The EAR is correct and deliberate — nothing is ever printed to read on a pre-level screen
  (SPEC section 12's 2026-08-15 ruling), and `tests/pre.test.js` holds it. The SILENCE is
  the fault.
- **Not a beta 27 regression** `git log -S "playPrePrompt()"` finds no commit that ever
  called it on entry, and `git show v1.0.0-beta.26:app/src/usePre.js` has the same
  `beginPre`. It has been this way since the ladder shipped in `abd4268`, through every
  listening round and every gauntlet, because no gate asks whether a screen ASKS its
  question — the census measures what is drawn, and the QA script's ladder steps did not
  cover a fresh Pre 1 entry.
- **My own part in it** The step 2 render harness carries the comment "the prompt plays on
  the adult's press of 'Hear it again' (the prompt is the question; nothing plays on entry)".
  I observed exactly this while shooting the checkpoint renders on 2026-08-23, wrote it down
  as a fact about how to drive the screen, and never asked whether it should be true.
- **What done means** A pre-level item plays its own prompt when it appears and when the
  session advances to the next one — S2 is not in the way, since on an ear rung the prompt is
  the SOUNDS and never the target word, and on a letter rung it is that letter's own sound,
  which is the thing the child is asked to say back. The play must survive the browser's
  autoplay rule (the press of "Begin Session" is the gesture; `unlockVoice()` already runs).
  A test drives a fresh pre-session and asserts the prompt was played without any further
  press, and fails if it was not. The 🔊 keeps its "Hear it again" label, which becomes true.
  Whether the prompt should also repeat on a re-entry, and how long after the screen appears
  it should play, is the owner's to rule.

## AI. The sound-off light is invisible to a person looking for it — opened 2026-08-24, CLOSED 2026-08-24 in beta 28

**CLOSED, and only the owner could close it.** Its own "what done means" said so: not on a
measurement, but on the eye that could not see it before. Checking beta 28 on that phone:
"A visible now". Alongside it, the 1.5x size he ruled: "looks perfect".
The record of what it took: the rim went from `stone` (1.28 / 1.24 / 1.36:1 against the sky,
inherited and never declared) to `muted` (3.06 / 2.99 / 3.27:1), measured on the shipped
renders at 3.02:1 against the real local sky — 2.4x the contrast and 2.77x the luminance
energy, with the shape and all eleven dashes untouched. The art director confirmed it is
still unmistakably not lit and step 2 stayed closed. But the gate that mattered was a person
looking at a phone, which is the whole lesson of this entry.

## AI-history. The sound-off light is invisible to a person looking for it — opened 2026-08-24, owner-ruled the same day

- **Where** `app/src/wq-css.js` — `.wq-glowseed-muted{background:transparent;border-style:dashed}` over
  `.wq-glowseed{...border:1px solid ${C.stone}...}`. The muted rim is therefore `stone`,
  measured 1.28 / 1.24 / 1.36:1 against the three `.wq-root` sky stops.
- **What a grown-up experiences today** Nothing. With sound off the light is meant to show an
  off look — a dashed rim with no fill — and it cannot be seen. The owner found this on a real
  phone during the beta 27 device check, KNOWING the state existed, knowing where in the frame
  to look, and having been told what it would look like: "it is so faint a human eye wouldn't
  see it". A parent who does not know it exists has no chance at all.
- **Why the gates all passed** Every one of them measures the right things and none of them
  asks this question. The census reads `data-wq-glowseed="muted"` from the DOM and is satisfied;
  `tools/provenance-check.mjs` derives the lock from the stylesheet and is satisfied; the art
  director judged the three looks distinguishable and was right — 434 rim pixels against idle's
  826 IS a difference, measured. What nobody asked was whether a HUMAN can see it on a phone,
  and that is not a thing a machine can answer. It took the owner's eye, on the device, at the
  first attempt.
- **Owner-ruled 2026-08-24**, on a decision page with the alternatives costed: the muted rim
  becomes `C.muted` (#5a6ba8, measured 3.06 / 2.99 / 3.27:1) — 2.4x today's contrast, and still
  BELOW the lit rim's `purpleStructural` (4.02 / 3.92 / 4.29), so "off" stays quieter than
  "speaking", which is the hierarchy the art director approved. The dashes and the empty middle
  are kept: they are what stops it reading as lit.
- **What done means** The muted rim carries the ruled token; the provenance lock and bible 7's
  state table say so and `tools/provenance-check.mjs` refuses a drift from it; a token test pins
  the literal; the art director re-judges the three looks on a fresh render set and confirms
  muted is still unmistakably not lit; and the owner sees it on the phone that could not see it
  before. Until that last part, this is not closed — the whole fault is that a measurement said
  yes and a person said no.

## AJ. "Skip" can never be used while a sentence is read — opened 2026-08-24, CLOSED 2026-08-24 in beta 28

**CLOSED** in beta 28. Skip is live in a sentence's reveal and dark in its attempt, it ends
the sentence rather than merely advancing the word queue underneath it, and both halves are
mutation-proven: reverting the guard fails "this sentence ended and another began", reverting
the button fails "live once the reveal has started". SPEC section 6 and section 12 both say
what is true now.

## AJ-history. "Skip" can never be used while a sentence is read — opened 2026-08-24, owner-ruled the same day

- **Where** `app/src/screens/SessionScreen.jsx` — `<HoldButton onFire={skipReveal}
  disabled={phase !== "feedback"} ... label="⏭ skip" />`. During a sentence `app/src/App.jsx`
  sets `setPhase("sentence")`, so the condition is never true for the whole of a sentence,
  in its attempt or its reveal.
- **What a grown-up experiences today** A control that is visible in the strip and can never
  be used in this mode, with nothing to say that is intended. Found by the owner on the phone
  during the beta 27 device check: "when a paragraph is read you can't skip".
- **Not new** `git show v1.0.0-beta.26:app/src/screens/SessionScreen.jsx` carries the identical
  condition. It has been so since sentences were graded with these controls.
- **Nobody is stuck** During a sentence's reveal the green "Next sentence" / "Next word" control
  is present and ends the sentence, so the adult can always move on. This is a puzzle, not a trap.
- **Owner-ruled 2026-08-24:** make skip work during a sentence's REVEAL, and keep it dark during
  the attempt — the same shape as a word, where it is live only once the teaching moment has
  started and the child has had their turn.
- **What done means** Skip fires during a sentence's reveal and does what it does for a word:
  ends the audio and moves on cleanly, leaving no state behind. A test drives a sentence to its
  reveal, fires skip, and asserts both; another asserts it stays dark during the attempt; and
  the app-mutant family gains one that reverts the condition, so the guard can fail.

## AK. The render harness's notes disagree with its own renders — opened 2026-08-24

- **Where** `D:/CVCGame-ops/shots-glowseed.tmp.mjs` — the harness writes a DOM probe's reading
  (`seedRead`, which returns `data-wq-glowseed`) into `hashes.json`'s notes, and takes the
  screenshot in a separate step. The two are sampled at different moments.
- **What it costs** The note and the picture filed beside it can say different things, and the
  note is the thing a later reader quotes. Found by the art director on 2026-08-24 while
  judging the ef7f9c4 set: for `pixel7-buildit-prompting` the notes record `look=idle`, the
  render is BYTE-IDENTICAL to the previous set's, and its pixels show the seed unmistakably
  LIT — halo, purple rim, cyan core, 2,688 ink pixels at 3.01:1. The art is right and the note
  is wrong. The probe races the prompt: it reads after the audio has ended while the
  screenshot caught the moment it was playing, or the reverse.
- **Why it matters more than one stale line** A judgement that cites a note rather than a
  render is citing something that has now contradicted its own evidence. Twice this month a
  chair has been asked to trust these notes. This is exactly the shape of the faults this
  project keeps finding — a measurement that is true of something other than the thing it is
  filed against.
- **A second, related one from the same judgement** The `*-reveal-lit-tile-sounding` renders
  capture a DIFFERENT tile between runs (the diff is a clean ring around a different letter),
  so that shot is not a stable baseline and a real tile-ring regression could hide inside the
  noise. The harness does not pin which tile is sounding when it shoots.
- **What done means** The probe reads and the screenshot is taken at the SAME moment — one
  evaluate that returns the state and then shoots without an await between them, or the note
  is derived from the render rather than from the DOM. The sounding-tile shot pins its tile.
  And a note that cannot be tied to its render is not written at all, since a missing note is
  honest and a wrong one is not.

## AL. `C.muted` now carries two unrelated meanings — opened 2026-08-24

- **Where** `reference/word-quest.jsx`'s palette. `C.muted` is a TEXT token — the colour of
  `.wq-lbl` and `.wq-help`, the grown-up strip's own labels, warranted at 5.12:1 on white.
  Since 2026-08-24 it is also the Glowseed's sound-off rim, on the sky, at 3.02:1 measured.
- **What it costs** Two unrelated senses of one word share a token. If anyone later re-tunes
  `C.muted` for text legibility on the pale strip — an ordinary, reasonable thing to do — the
  sound-off rim moves with it silently, on a ground where it already sits at 3.02:1 and has
  only just stopped being invisible. Nothing would report it: the provenance lock records the
  token's NAME, not its value, so a changed hex passes.
- **Found by** the art director, judging the change that introduced it (2026-08-24), and named
  as "the same shape of fault that just cost a beta".
- **What done means** Either the rim gets its own token whose warrant is the sky rather than
  white, or the lock records the muted rim's VALUE as well as its name so a re-tune is refused
  by the gate that already reads it. The second is cheaper and closes the silent half.

## AM. A test timeout poisons React's act scope, and one red becomes seventy — opened 2026-08-24, cause found the same day

- **THE MECHANISM, reproduced on demand by the council's before pass.** A test that exceeds
  vitest's timeout is aborted **mid `act(async …)`**. React increments its act scope depth on
  entry and pops it only when the returned thenable settles, so an aborted async test leaves
  the depth non-zero — and from then on every `render` in that file takes React's synchronous
  act path, which flushes only when the depth is zero. **The work is queued and never
  committed.** The page stays empty, and the failure surfaces somewhere else entirely: in this
  case a `TypeError: Cannot read properties of null` from a `document.querySelector` three
  tests downstream, which is where the diagnosis went hunting.
  One timeout produced **70 failed tests across 5 files** in a loaded run, with React's own
  "You seem to have overlapping act() calls" on stderr in four of them. The amplification is
  the fault; the timeout is only the trigger.
- **THE REAL DEFECT IS A MARGIN.** `tests/names.test.js` test 1 runs 1,271 ms alone and
  **3,423 ms in the full suite unloaded** — against a 5,000 ms default. A guard at 1.46x on a
  twelve-core machine is a coin toss. Under contention it goes over.
- **FIXED** `vitest.config.mjs` sets `testTimeout: 60000`, with every measurement written into
  the comment beside it, because the deflaking rule's line is "never widen a timeout WITHOUT
  MEASUREMENT" and the measurements are the licence. Worst async test observed under eight-way
  load: 23,512 ms. It weakens no assertion and masks no hang.
- **AND THE REPORTER THAT HID IT IS FIXED TOO.** `tools/gauntlet.mjs` printed the last FIFTEEN
  lines of a failed step. A vitest failure block is twenty to forty, and on a `--coverage` run
  those fifteen lines are the coverage table. So the evidence file recorded `failed=3` while
  the visible tail showed one arbitrary fragment — and the fault was diagnosed from the
  fragment. It now prints vitest's own "Failed Tests" section when there is one, and an
  eighty-line window otherwise.
- **AND FOUR GUARDS THAT COULD NOT FAIL, found in passing.** `offences()` returns `[]` for a
  page with no controls, so "nothing is misnamed" and "nothing rendered" were the same answer
  — and four renders in `tests/names.test.js` had no other assertion. A `walked()` count now
  sits beside each; planting a render that commits nothing turns them red, which was proved
  before it was written down.
- **WHAT I GOT WRONG, recorded because the wrong answer was confident.** I attributed this to
  a full disk. A genuine `ENOSPC` DID kill a different gauntlet run that day — that stands,
  and the temp-directory fix stands with it — but it cannot explain this, which reproduces on
  demand with 2.9 TB free. I also guessed `--coverage` was the discriminator; it is not.
  Coverage merely doubles the wall time (64 s against 38 s) and pushes a 1.46x margin over the
  edge. Each wrong answer was a reasonable reading of a coincidence, and each was reached
  without running the experiment that would have settled it.
- **STILL OPEN, and why this entry is not closed.** The timeout enforces nothing on the
  suite's three heaviest tests: `models.test.js` test 1 (72 s under load) and
  `build-tray.test.js` (62 s) are synchronous after their imports, so vitest can never
  interrupt them at any timeout value. If either genuinely hangs, the run hangs for ever. And
  the same `document.querySelector`-on-an-assumed-element shape exists elsewhere —
  `tests/buildit.test.js:363` and `:538` among them — with 40 further `queryBy…toBeNull()`
  assertions across 8 files that also pass on an empty page.

## AM-original. The check goes red at random under load — opened 2026-08-24

- **What happens** `npm run check` reports a failure that does not reproduce. Twice in one
  session on 2026-08-24, in different places:
  - `tools/blast-radius.mjs --self-test` reported "96 passed, 1 failed" inside the check —
    the failing control being the one that runs the tool in a sandbox working directory,
    "and still passes its own controls there, rather than going red for the environment".
    Run directly, immediately afterwards, twice: 97 passed, 0 failed.
  - `tests/names.test.js` "1: home, the chooser, the corner, a session and a build" failed
    inside the check. Run alone: 3 passed. The whole vitest suite run on its own straight
    after: 22 files, exit 0.
- **What it costs, and why it is a fault rather than an annoyance** A gate that goes red at
  random teaches everyone who sees it — person or agent — to treat red as noise and re-run.
  That is precisely how a REAL red gets waved through, and this repository's whole method
  rests on a red check blocking a change (E7). It has already cost something concrete: on
  2026-08-24 a commit was made on a red check because the failure was assumed to be the flake
  it turned out to be. Assuming correctly is not the same as checking, and the habit is the
  damage.
- **WHAT HAS BEEN RULED OUT, by measurement (2026-08-24)** The first work was to reproduce
  each on purpose. It did not succeed, and what failed to reproduce is itself evidence:
  - *A timeout in the nested run.* The sandbox control spawns `blast-radius --self-test
    --nested` with a 120 s limit. Measured unloaded, three runs: 4.6 / 5.2 / 5.3 s, 93
    controls, 0 failed. A timeout would need a 23x slowdown.
  - *CPU contention.* Eight busy-loop processes on this machine: four runs at 8.2-10.1 s,
    every one 93 passed / 0 failed. Slower, never wrong.
  - *A concurrent regeneration of the generated engine.* `node tools/extract-engine.mjs` in a
    tight loop of forty while the self-test ran three times: 97 passed / 0 failed each time.
  So neither flake is explained by load or by the generated files moving underneath.
- **THE CAUSE, FOUND 2026-08-24, and much better than the first guess: the SMALL DRIVE was
  running out of room.** A full gauntlet came back with five failed gates whose numbers were
  either correct or unparseable, and the log carried the answer in plain words: `ENOSPC: no
  space left on device` from an ordinary writeFileSync. D: had 2.9 TB free at that moment and
  the repository lives on D: — but `os.tmpdir()` on this machine is the Temp folder inside the user profile on C:, and
  C: was down to about 5 GB. TEMP and TMP are per-USER settings on Windows, pointing inside
  the user profile, so they follow the account and not the working directory: moving the game
  to D: on 2026-08-22 moved the repository off the small drive and left every scratch file
  behind on it. The tooling leans on temp hard — the blast-radius sandbox control makes a temp
  git repo, the release command builds its tarball there, vitest caches there, Playwright
  writes artefacts there.
  **Both flakes in this entry are that shape.** The blast-radius control that failed makes a
  temp directory; the vitest run that failed caches into one. An intermittent failure to write is
  exactly what a nearly-full drive produces, and it is why neither reproduced alone minutes
  later.
  The earlier suspicion — concurrent council agents — is WITHDRAWN as the explanation. It was
  a fair reading of a coincidence and it was wrong. The measurements that ruled out timeouts,
  CPU load and a moving engine still stand, and are what left room for the real answer.
- **FIXED** `tools/run-with-tmp.mjs` sets TEMP, TMP and TMPDIR to `<repo>/.tmp` and runs the
  npm script it is given; every child process inherits the environment, which is what makes
  one wrapper enough for a chain of thirty tools rather than an edit in each. `check`,
  `gauntlet`, `census` and `census:novelties` go through it. Proved rather than assumed: a
  child reports the Temp folder inside the user profile on C: without the wrapper and `D:\\CVCGame\\.tmp` through it.
- **WHAT WAS DONE INSTEAD OF A GUESS** The sandbox control now PRINTS the nested run's own
  output when it fails - the last 25 lines, the count of nested FAIL lines, and, when there
  is no FAIL line at all, that it did not finish, which distinguishes a crash or a kill from
  a real failure. Nothing was retried and no assertion was weakened. The next occurrence will
  say what it was; today's could not, which is why today's is still open.
- **What done means** Each flake is reproduced ON PURPOSE — under the same contention, until
  it fails on demand — and then fixed at its cause rather than by a retry, since a retry
  around a flake is a gate that cannot fail. Until a cause is known, the check reports WHICH
  step failed in a form a reader cannot mistake for a real failure. The owner has a queued
  twelve-point deflake programme; this entry is the evidence for opening it.

## AN. A reveal interrupted by leaving the app never finishes — opened 2026-08-24, measured on the owner's device

- **What a child experiences** The grown-up grades a word, the game starts speaking, and the
  app goes to the background — a home press, a notification, a call. On coming back, **the
  rest of the message never plays**. What is lost is usually the sound-out: the part where the
  child hears the word broken into its sounds, which is the teaching moment the reveal exists
  for. Nothing says anything is missing. The grown-up can press the speaker in the strip to
  play it again, but nothing tells them to, and a parent who was not watching has no way to
  know the child heard half a lesson.
- **Found by the owner** on 2026-08-24 in beta 27, and MEASURED by him on beta 28 with the
  question put precisely: "after coming back from home button the sentence doesn't continue,
  but the seed is no longer lit."
- **That measurement is the decisive one, and it rules out the worse case.** The listening
  light goes DARK rather than staying lit over silence. So the player's lost-end net, added
  the day before for exactly this situation, is doing its job: the utterance is ended
  honestly rather than left glowing over a sound that will never come. The light is right;
  the sound is gone.
- **Not reproducible on this machine.** Chromium's page-freeze does not suspend the audio
  clock: measured across a four-second freeze, 5,501 ms of audio elapsed against 5,534 ms of
  wall time, the context stayed `running`, and every node reported its end. Whatever iOS does
  to a suspended audio context, no browser here does it. That is why this entry carries a
  measurement from a phone and not from a test.
- **The mechanism, from reading rather than from running.** The whole utterance is scheduled
  up front on the AudioContext clock; everything the app does afterwards runs on the wall
  clock. Nothing in `app/src` listens for the page becoming visible again — the only
  `visibilitychange` in the app is the S6 update check — so nothing resumes a suspended
  context. And the first thing that would resume it, `playClips`, begins with `stopClips()`,
  which discards the remainder by construction. Hence: silent, and honestly dark.
- **What done means, and the part that is the owner's** A child who comes back does not
  silently lose the sound-out. WHICH behaviour that is remains his to rule, because it is
  what a child meets: playing the remainder alone would give the tail of a word with no head,
  which for a sound-out is worse than nothing; starting the whole reveal again is kinder and
  simpler to reason about but speaks unasked to a child who may have moved on; and leaving it
  to the grown-up's replay is honest but asks a parent to notice an absence. A test drives an
  interruption and proves the child is not left in silence, and the fix is verified on the
  device that found it, since no browser here reproduces the interruption.
- **The behaviour is now ruled** (owner, 2026-08-29, from the roster-and-reveal decision
  page): **the whole reveal restarts when the app returns to the foreground.** Coming back
  is itself a deliberate act, the screen returned to is still the feedback screen, and a
  fresh start is kinder than a tail with no head. The build landed the same
  day: a visibilitychange listener marks the interruption at HIDDEN time - the only moment
  it can be known honestly, since after a freeze every timer fires late and lies - and
  coming back visible replays the same reveal from the top. Advancing, ending the sentence,
  or a fallback voice clears the record, so a replay can never speak into the next attempt
  (S2), and three tests in the reveal suite drive the interruption, the S2 guard, and the
  finished-reveal negative. What remains is the owner's device check on the phone that
  found it. The entry closes on that check, not before.

## AO. SPEC describes a five-rung pre-level ladder; the game has three — opened 2026-08-24

- **Where it lives.** `SPEC.md:1043` ("lettered \"Pre 1\" to \"Pre 5\"") and `SPEC.md:1138`
  ("four tiles at Pre 2, six at Pre 3, eight at Pre 4, ten at Pre 5"); the reference build's
  own prose at `reference/word-quest.jsx:1819` and `:2074`;
  `tools/effect-declarations.mjs:169` ("its five rungs"); `docs/effect-map.md:432`; and
  `docs/open-faults.md` itself, in fault S, which speaks of "a child at Pre 1 to Pre 4".
- **What is actually true.** `PRE_LEVELS` has three rungs — Little Ears, First Sounds
  (s a t p), New Sounds (i n). `tests/pre.test.js:22` pins exactly `[1, 2, 3]`. The engine,
  the reference build's code, and the tests all agree. **The code is right and the prose is
  stale.**
- **How it happened, and it was not a mistake at the time.** The 2026-08-20 hundred-level
  cutover re-derived Level 1 to spell exactly a, i, n, p, s and t, so the letter rungs
  correctly shrank from ten letters to six and from five rungs to three. The comment at
  `reference/word-quest.jsx:1780` explains the shrink in full. What did not happen was the
  sweep of the documents that stated the old number.
- **What a child or a grown-up experiences today.** Nothing. No child-facing behaviour is
  wrong; the three shipped rungs are the correct three. This is a documentation fault, and it
  is recorded because SPEC.md is the master source for behaviour and on this point it
  describes a game that does not exist — including a Build-a-sound tray specification for two
  rungs a child can never reach.
- **Why no gate caught it, which is the part worth keeping.** `tools/doc-truth.mjs` pins
  nothing about the ladder, so there was no check to go red. This is exactly the honest limit
  written into the file map's own header and into fault F3: a stale paragraph in fresh words
  still needs a human reader. It drifted for four days and was found only because the owner
  asked for a change "over five levels" and the number was checked before answering.
- **What done means.** Every site above states three rungs, or states the true number at the
  time it is written; and `tools/doc-truth.mjs` grows a pin that reads the rung count from the
  engine and refuses any document that disagrees, with a negative control that proves the pin
  catches a wrong number (E5). The pin is the part that matters: correcting six files without
  it leaves the next cutover free to do this again.

## AP. A word a child keeps missing is served for ever, and crowds the review lane — opened 2026-08-29

- **Where it lives.** `buildSession` in the reference build: `dueBelow` selects graded words
  from below the child's level, sorts them `box` ascending, and takes five. `INTERVALS` is
  `[1, 1, 2, 4, 7, 12]`, so a word at box 0 or 1 is due again the very next session — and a
  word read wrong never leaves box 0.
- **What a child and a grown-up experience today.** Measured, not guessed: a simulated child
  who misses three words across forty sessions meets each of them **18 times**, in **18
  consecutive sessions**, while a word they read correctly is served five times. The three
  stuck words take **19 percent of every review slot in the game**, and they follow the child
  up through every level — thirty levels, in the simulation. **Found by the owner from his own
  play**: "I notice ox is offered as a word at almost every level so much."
- **Why it is a fault and not spaced repetition working.** The interval schedule is correct
  and is not the fault. The fault is that nothing bounds a word that is never learned. Every
  spaced-repetition system that ships to real learners has a leech rule for exactly this
  case, because a card the learner cannot get, repeated for ever, is demoralising and — the
  measurable half — it eats the slots the rest of the material needs. Here the cost is
  concentrated: five review slots, and one stuck word takes one of them for ever.
- **It is worse for the child this game is for.** A four-year-old meeting the same word they
  cannot read, in nearly every session, for weeks, is the opposite of what S3's whole
  vocabulary is built to protect — every miss is meant to be an invitation to try again, and
  the invitation stops being kind when it is the same word for the fortieth time.
- **What done means, and the part that is the owner's.** A word that has been read wrong many
  times stops monopolising the lane, WITHOUT the app ever recording a judgement about the
  child (S1) and without the word being silently abandoned — a grown-up should be able to see
  what has happened and put it back. WHICH rule that is belongs to the owner, because it is
  what a child meets: a cap on consecutive appearances, a leech threshold that rests a word
  after N wrong readings and tells the grown-up in the corner, a cap on how many stuck words
  may hold review slots at once, or a widening interval that never fully stops. A test drives
  a child who misses a word forty times and proves the rule holds, with the measurement above
  as its control.
