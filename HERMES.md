# Hermes project-lead notes

**This document owns** the handover record for the AI project lead: who holds it, what was asked, what was refused and ruled, and pointers to where each fact lives — pointers only, never restated.
**It does not own** behaviour (SPEC.md), the child-facing safety rules (CLAUDE.md S1 to S9), the gates (docs/testing-gauntlet.md), or any count, threshold or rule text — those live in their owners and are named here, never copied.

## Lead

Hermes Agent holds the project lead from 2026-09-15, transferred from Claude at the owner's direction. AGENTS.md is the controller; the read order and the cadence it records stand unchanged.

## Rulings

- 2026-09-15: renaming CLAUDE.md to a Hermes-owned file was asked and refused. The safety rules live there because only that file is auto-loaded and re-loaded after a context compaction (owner-ruled 2026-08-31); four tools read it by path, so a rename crashes them rather than moving anything. What shipped instead, owner-approved the same day: this file points at owners and quotes none of them.
- 2026-09-15: IDEA.md is tracked, at the owner's direction.

## Review

DeepSeek V4 Pro 0813 via OpenRouter at ultra effort sits as second set of eyes for the transition. Verdict on the refusal: AGREE (session 20260915_100715_61f166). One correction owned by the lead: tests/safety.test.js carries only a comment naming CLAUDE.md and reads nothing at runtime, so it was wrongly listed among the breakage; the refusal stands on the four tools that read the file by path.

## Pointers

Controller: AGENTS.md. Safety rules: CLAUDE.md S1 to S9. Behaviour: SPEC.md. Gates: docs/testing-gauntlet.md. Map: docs/file-map.md. Open faults: docs/open-faults.md. Closed questions: docs/settled.md.

## Review rule

Every coding change is reviewed read-only by DeepSeek V4.1 Flash at best effort via OpenRouter and by qwen-check, as bug-check second and third opinions (owner-directed 2026-09-15).

## Privacy

No commit ships until its staged diff is swept for personal identifying information — names through G24, contact details and secrets by direct read — and the result is reported. Owner-directed 2026-09-15.

## Open

The App.jsx visit-commit deletion present in the working tree on 2026-09-15 predates this lead's first commit and rode in none of mine.
