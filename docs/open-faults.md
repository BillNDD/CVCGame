# Open faults — the list to work from

This document exists because a fault that lives only in a chat log is a fault this project
will lose, and has. Created on the owner's instruction, 2026-08-11.

Every entry is something known to be wrong, missing, or undecided **right now**. Nothing
speculative. Each says what it is, where it lives, what a child or a grown-up experiences
today, and what "done" means. When an entry is finished, delete it and record the result in
the document that owns the fact — `docs/settled.md` for anything a listener or a measurement
closed, `tools/voice-sounds.csv` or `tools/voice-words.csv` for a round, `SPEC.md` for a
ruling. This file holds only what is still open.

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

### B4. A sound with no text falls back to its own file name

- **Where** `voiceScript()`, `SOUND_TEXT[id.slice(2)] || id.slice(2)`.
- **Today** No consumer reads that text at run time, so nothing is spoken wrongly.
- **The fault** The family-pack recorder in SPEC section 5a would prompt an adult with
  `th_quiet`, and any renderer reading `text` would synthesise a file name. Latent exposure
  to safety rule S4, which forbids the app from ever speaking a letter name.
- **Done** Every sound in the inventory has human text, and a sound without one fails the
  voice gate rather than falling back.

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

## B10. Word-by-word highlighting is not trustworthy yet

Not part of the default-sounds group; filed here because it is the only other
thing in the tree that is written and does not work.

- **Where** `tools/align-sentence.py`, and the owner's request of 2026-08-11
  that the sentence reveal walk word by word as the voice reads.
- **What is needed** The start time of every word inside one whole recorded
  sentence. A recording does not carry them.
- **What was ruled out by measurement, so nobody repeats it** Silence does not
  find word boundaries. Four energy-island settings over twelve approved
  sentences matched the word count **zero times out of twelve**, because in
  connected speech the words run together with no gap between them.
- **What was built** A forced alignment out of the pack's own material: every
  word in a decodable sentence has an approved clip, so those clips are
  concatenated into a reference whose boundaries are known exactly, and dynamic
  time warping carries the boundaries across into the real recording. Two
  faults were found and fixed on the way — the pending clips are named
  `w-{word}.mp3`, and the reference runs about **2.01x** the length of the
  recording, because a word said alone is a citation form, so it must be scaled
  to the recording BEFORE the warp or the warp spends its whole budget on the
  squeeze and crushes whatever comes first.
- **Why it cannot ship** Its own control fails. Each recording is aligned
  against its own text and against a different sentence's text of the same
  length; the right text must fit better every time, and it **won only 2 of 3**.
  On "The cat sat on the mat." the WRONG text fit better — 0.381 against 0.393.
  So on at least one sentence the alignment is not finding the words, it is
  distributing them, and the plausible-looking timings it prints are arithmetic
  rather than measurement.
- **Why that matters more than it looks** A highlight one word out is worse
  than no highlight. It tells a child that this squiggle makes that sound, and
  it is wrong.
- **Done** The control wins every time, over the whole approved set and not a
  sample of ten. Three routes are open and none is chosen: anchor the warp on
  the content words and let the function words float; band-limit the warp so it
  cannot wander; or record sentences in a way that carries its own word
  timings, which removes the problem instead of solving it.
- **Not blocked by this** The sound-by-sound walk INSIDE a word has no such
  problem. Those timings come from the individual sound clips the player
  schedules itself, they are exact, and nothing is inferred.

## C. The audit trail

### C1. Sixty-four word rows carry no byte pin

- **Where** `tools/voice-words.csv`. 285 of 349 rows have a `byte_pin_sha256`; 64 do not,
  all from the earliest rounds, before pinning began: bad, cab, can, dab, dad, nap, pad,
  pal, pan, rag, ram, ran and others.
- **Today** No effect. All 349 clips ship, all 349 rows read `locked: yes` and
  `verdict: perfect`.
- **The fault** Those 64 cannot prove which bytes the owner approved. A silent re-render of
  any of them would pass every gate.
- **Done** Every row carries a pin, or the 64 are named in the file as deliberately unpinned
  with the reason.

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

`tests/safety.test.js` is 886 lines and `app/src/App.jsx` is 836, against a ceiling of 900.
The ceiling is not the kind of number that moves (E6). A file approaching one is split.

---

## E. Approved and unbuilt

Features the owner has ruled on that are not built are **not** in this file. They live in
SPEC section 12, "The road ahead", with their boundaries and their named prerequisites:
the level introduction, passages from real books, and the parent tutorial.

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

- **Where** G16 doc-truth covers seven rules; G17 covers which files may exist.
- **The fault** G16 checks a small number of specific claims — gate floors, a few timings,
  the recipe numbers. It cannot see a paragraph that describes an old behaviour, which is
  how SPEC section 5 came to describe the pre-reveal utterance until it was rewritten by
  hand on 2026-08-11.
- **Done** More of what the documents assert is derived from the code rather than typed
  beside it, so the gap cannot open silently.
