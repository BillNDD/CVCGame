# Decisions handoff — from Word Quest to Phonics Game

Phonics Game inherits the Word Quest code base whole: the engine, the reference build, the
thirteen-gate gauntlet, and the full git history. This document lists the decisions behind
that inheritance and the lessons that came at a price, so work here starts where Word Quest
left off instead of relearning it. The sibling document for a from-scratch build lives with
the owner. Reference: github.com/BillNDD/CVCGame stays live as its own game with its own
releases; fixes can move between the two repositories with `git cherry-pick` because they
share history.

This document follows the Microsoft Writing Style Guide.

## 1. Method

- **Constraint-based development.** The owner reviews specifications and trusts the gates,
  not the code. A change is complete only when `npm run gauntlet` is green: 13 gates, one
  command, floors in `.claude/gate-baseline.json` that only ratchet up.
- **SPEC.md is the master for behavior.** The single-file reference build
  (`reference/word-quest.jsx` — the file name is inherited plumbing; do not rename it
  casually, the extractor and a tripwire test point at it) is the master for interface
  text, layout, and colors. `tools/extract-engine.mjs` generates `src/engine.js`; the app
  and the tests import it. Nobody edits generated files, and no component copies engine
  logic.
- **Owner approval comes before**: any change to child-facing text, any visual change, any
  spec correction, and any plain-English scenario that feeds the test pipeline.
- **Rule E9**: before launching a multi-agent workflow, agree the plan with the owner —
  how many agents and how many antagonists (adversarial checkers) the problem needs.
  Default to three of each or fewer.
- **After each build phase, run an adversarial review.** Every review to date found real
  faults behind green gates: a layout shift in the retry phase, a speech-bleed safety
  breach, a self-test that had gone vacuous, and three streak edge cases. Budget for it.

## 2. What Phonics Game inherited on day one

- The birth commit ("Phonics Game begins") changed identity, not behavior: app name
  everywhere a person sees one, storage key `phonicsgame:progress:v1`, database
  `phonics-game`, offline cache prefix `pg-`, version 0.1.0, Pages workflow parked while
  private.
- **The storage divorce matters.** Both games will live under one origin
  (`billndd.github.io`), and IndexedDB and CacheStorage are origin-wide. The distinct key,
  database name, and cache prefix are what keep the two games from reading or deleting
  each other's saves. Never reuse a sibling's storage names.
- Gauntlet floors at inheritance: 68 unit tests, 10 properties at 1,000 cases, 44
  scenarios / 55 generated tests, 90 acceptance mutants and 45 source mutants with 0
  survivors, 97% branch / 100% line coverage on the engine, 12 interface checks, 15
  accessibility checks, 8 fault tests, 8 safety tests, 5 copy rules, 29 QA steps.
- The word bank: 260 words in seven levels (12, 39, 42, 40, 44, 30, 53), nine tricky
  words with exact notes, twenty homophone entries for the microphone.

## 3. Product rules in force (SPEC.md is authoritative)

- The app never records a wrong or close result by itself; speech recognition can only
  confirm a correct reading. Only an adult action records a miss.
- The app never speaks the target word before the attempt ends — including leftover
  speech: `hush()` silences the queue when the adult advances or discards, because a
  queued slow reveal otherwise bleeds into the next attempt. This was a confirmed safety
  breach found by review, not by gates.
- Feedback speech is two utterances: a praise lead at rate 0.9, then the reveal ("The
  word was {word}.") at rate 0.7 so the word is slow and clear. Replay uses the slow
  rate. Praise draws from ten exact sentences pinned by the copy gate; the owner approved
  each one and excluded "fat" from the bank on the same grounds.
- Promotion has two paths: 80 percent of the level at box 3+, or two perfect completed
  sessions in a row. Streak edges (all owner-decided): a shorter perfect session counts;
  an early stop changes nothing; any promotion resets the streak; a manual level change
  resets it; the stored streak caps at 2 and never promotes outside a completed session.
- Word bank rules: at most 4 letters, 2 or 3 sound units, only the six digraphs (sh, ch,
  th, wh, ck, ng), no consonant blends, no vowel teams, no digraph words before Level 6,
  no proper nouns, nothing violent or crude. Watch speech-recognition hazards: "dam" was
  rejected because transcripts print "damn" on a child's screen.
- Child controls 56 px or more; adult controls 44 px or more; adult result controls need
  a 450 ms hold; fixed-height reserved slots, never min-height (two real layout bugs).
- No accounts, no analytics, no network calls after load, no personal data in the repo —
  gate-enforced, including an email scan over tracked files.

## 4. Hard-won lessons (they all cost something)

1. **Check exit codes unmasked.** A pipe through `tail` pushed a red gauntlet twice.
2. **CI colorizes output.** GitHub Actions sets `CI=true`; test runners emit ANSI codes;
   count-parsing regexes silently read "?" on every count. The gauntlet sets `NO_COLOR=1`
   for gate commands and strips ANSI before parsing, with a negative control proving
   colored text defeats the raw regex. Six consecutive CI runs failed before this was
   understood — while every test inside them passed.
3. **Property-test the save-repair path with hostile SHAPED input** (real key names, not
   just random JSON). It found four crash bugs on day one and a fifth invariant gap later.
4. **Give every detector a negative control the day it is born (E5)** — and re-check the
   controls when detectors multiply. Adding a praise detector silently aliased the
   banned-word control's prefix match; a reviewer proved the old detector could be deleted
   with the self-test still green.
5. **Strengthen checks in the phase nobody visits** — retry, adult mode, the second
   viewing, the partial-with-a-miss session. Every one hid a real fault.
6. **A test's mock can hide the fault class.** The safety mock speaks synchronously, so
   no gate could see the asynchronous speech-bleed breach. Know what the mock cannot
   represent, and cover it in review or on-device QA.
7. **Names collide across a shared origin** (see the storage divorce) and stale local
   tags shadow remote ones — delete before re-fetching.
8. **Expect the platform to fight.** Pages needs a public repo (or a paid plan) and a
   one-time manual source setting; workflow tokens cannot always create the Pages site;
   tag pushes may be blocked by a proxy (publish releases in the UI); a session is bound
   to the repositories granted at its birth; renames beat delete-and-recreate.
9. **Regenerated artifacts need a porcelain check** — `git diff` alone cannot see a
   deleted generated file arriving back as untracked.
10. **Words are content with failure modes**: letter-name detectors need every
    punctuation boundary the copy actually uses (a comma and a question mark arrived with
    the praise list); homophones make the microphone unfair unless mapped; a lone "a" in
    copy is indistinguishable from a letter name to a scanner.

## 5. Where Phonics Game goes next (the reasons it forked)

Owner intent: a fuller "parent plays with kid" phonics tutorial, private until it is much
further along. Candidate directions, none started:

- Consonant blends ("stop", "hand") as a new level — needs a fourth sound tile, which the
  fixed layout does not carry yet. Measure before building (G7 owns the layout).
- Vowel teams and a broader sight-word track (the tricky-note machinery already scales).
- Parent-guided lesson structure: turn-taking, session scripts, a richer adult dashboard
  than the Grown-ups corner.
- Re-enable the Pages workflow (`.github/workflows/pages.yml.disabled`) only when the
  repository goes public; the beta channel and release ritual then work exactly as they
  do for Word Quest: merge to main deploys, releases are tagged `v*` pre-releases in the
  UI, one release per owner-visible batch.

## 6. Identity and process constants

- Commits are authored by the owner's GitHub account with the GitHub noreply email. No AI
  attribution in commits, titles, or bodies. No personal name, email, or child data
  anywhere in the repository — the copy gate enforces it.
- All technical documents follow the Microsoft Writing Style Guide. Game-facing text is
  exempt and pinned character-for-character by the copy gate.
- Keep a tidy home: root minimal, process documents in `docs/`, tool configuration in
  dotfolders, generated artifacts only in `tests/generated/`.
- Run the full gauntlet before every push. Update CHANGELOG.md for every owner-visible
  change. Raise floors in the same commit that grows a count.
