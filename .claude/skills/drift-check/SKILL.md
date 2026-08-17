---
name: drift-check
description: Run the comprehensive drift check — every ownership, map, lookup and coverage gate at once, with a single verdict. Use when the owner asks whether the map, owners, blast radius or safety cover are driftless, before a beta or release, after a large or multi-file change, or when returning to the repository after other agents have worked in it.
---

# The comprehensive drift check

**This document owns** the procedure for the comprehensive drift check: which gates and
lookups to run, in what order, how to read their results, and what a green run does not mean.

**It does not own** any of the facts those gates hold — every count, floor and ownership
rule lives in the file that owns it, and this skill only tells you how to ask.
Owner-asked, 2026-08-17.

Answer one question, with evidence: **is every fact in this repository still owned by
exactly one file, and does every lookup, map and coverage claim still match the tree?**

Report a verdict the owner can scan. Never claim green without pasting the number that
proves it.

## What drift means here

Four different failures wear the same clothes, and the checks below separate them:

1. **Ownership drift** — a fact is stated in two files, so one of them is now wrong.
2. **Map drift** — a generated map (`docs/file-map.md`, `docs/effect-map.md`) no longer
   matches what it maps, so it describes a repository that has stopped existing.
3. **Lookup drift** — the E11 lookup itself has broken, so "nothing depends on this"
   becomes an answer nobody should trust.
4. **Coverage drift** — a rule, gate, or clip has lost the thing that proved it, while
   every count still adds up.

## Run these, in this order

Run from the repository root. Each line prints its own count; keep the numbers, they are
the evidence.

```bash
node tools/file-map.mjs --check && node tools/file-map.mjs --self-test
```
Owners (G23): one fact one owner, every file declared, no orphan, no resurrected
tombstone. Then its own controls.

```bash
node tools/blast-radius.mjs --self-test
```
The E11 lookup's controls. A lookup that has stopped finding things reports an empty
blast radius, which reads exactly like safety.

```bash
node tools/effect-map.mjs --check && node tools/effect-map.mjs --self-test
```
The effect map (G20): every executable test has a row saying what it protects, and the
committed map matches the tree.

```bash
node tools/safety-cover.mjs && node tools/safety-cover.mjs --self-test
```
Safety cover (G25): every safety rule S1-S9 has an executable proof, no proof names a
file that has vanished, and no proof runs under a gate nothing schedules. Its two
ceilings — rules proved only by reading source, and rules no browser has observed — are
debt that may only fall.

```bash
node tools/doc-truth.mjs && node tools/doc-truth.mjs --self-test
```
Document truth (G16): every count, floor and quoted constant in the documents against
the code that holds it.

```bash
node tools/check-governing.mjs && node tools/check-governing.mjs --self-test
```
Governing files (G17): no new status file has appeared unapproved, and every governing
file still carries its ownership header.

```bash
node tools/ledger-truth.mjs && node tools/ledger-truth.mjs --self-test
```
The ledgers against the bytes they pin.

```bash
node tools/target-coverage.mjs
```
Coverage of the target word list, and the "clips waiting for seats" line — approved
words that no child can reach yet.

```bash
node tools/mutants.mjs --anchors
```
Mutant anchors. An anchor that has moved means a planted fault now tests something
other than what its name says. This is a lookup, not a gate: read what it prints.

```bash
npm run check
```
Last, and only if the above are clean: the whole sub-minute gate set, which includes
several of them again plus the test suite. A green check here with a red check above
means one of the tools was not wired into it — say so, because that is itself drift.

## Reading the results

- **Any non-zero problem count is a stop.** Name the file and the fact, not just the gate.
- **A control suite that reports fewer controls than its floor is worse than a failure**,
  because it means a detector was removed rather than defeated.
- `--self-test` failing while the gate passes means the gate can no longer fail. Treat it
  as the most serious result on the page.
- If a tool prints "0 rules parsed", "0 files scanned" or any other zero where the
  repository plainly has some, that is an anchor that has moved. It is not a pass.

## What this check cannot see

Say this in the report every time, because a clean run invites more confidence than it
has earned:

- **A stale paragraph in fresh words.** Every one of these tools compares facts to facts.
  A page of prose that describes last week's behaviour in sentences that quote no number
  passes every check here. That is open fault F3 and it still needs a human reader.
- **A fact family nobody has declared.** The maps guard what they know about; a brand new
  kind of fact is unguarded until its row exists.
- **Whether a rule is the RIGHT rule.** These tools prove that something claims to prove
  a rule. Only the test proves the behaviour, and only the owner rules whether the
  behaviour is right.

## Report shape

Give the owner a scannable verdict — bullets and a table, never paragraphs:

```
📊 Drift check — <date>

| check | result |
|---|---|
| Owners (G23) | <declared> declared, <facts> owned facts, <tracked> tracked, <n> problems · <n>/<n> controls |
| Blast radius (E11) | <n>/<n> controls |
| Effect map (G20) | <n> tests over <n> files, <n> problems |
| Safety cover (G25) | <n> rules, <n> proofs, <n> problems · source-only <n> · unobserved <n> |
| Doc truth (G16) | <n> rules, <n> problems |
| Governing (G17) | <n> files, <n> strays |
| Ledgers | <n> problems |
| Target coverage | <n> words, clips waiting for seats: <n> |
| Mutant anchors | <n> moved |
| npm run check | exit <n> |

**Every cell is a placeholder on purpose.** A worked example in a document is a
copy of a fact, and this one would have been the first thing to drift — the
numbers written here when the skill was created were stale within the hour.
Fill each cell from the run in front of you, never from this page.

✅ or ⚠️ verdict in one line, then anything that needs the owner.
```

Then, if anything is red: what drifted, which file owns the fact, and what the fix is.
If everything is green, still name the two things the check cannot see, so the owner
knows exactly what the green means.
