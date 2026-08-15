/* Word Quest — the session builder's two level rules (gate G1, key
   g1_scheduler_tests). Run: npm test  (vitest).
   These tests live apart from tests/engine.test.js only because that file sits
   on the 600-line ceiling. Every assertion uses literal expected values, never
   the constant under test.
   Both rules come from an audit of the running build, 2026-07-29 (A3-002):
     - the next level opens on evidence of learning, not on evidence of
       exposure;
     - a next-level word the app has already graded comes back for review
       instead of being read once and parked until promotion. */
import { describe, it, expect } from "vitest";
import {
  LEVELS, WORD_LEVEL, freshWordState, applyResult, buildSession, newState,
} from "../src/engine.js";

describe("buildSession and the next level", () => {
  /* The peek used to open on exposure: "every word has been seen", which a
     child who has read all 14 and got all 14 wrong satisfies. Ten sessions of
     wrong answers handed such a child the whole of Level 2, eight words a
     session, and parked every one of them for good. */
  it("never hands the next level to a child who has read nothing correctly", () => {
    const s = newState();
    const served = [];
    for (let n = 0; n < 10; n += 1) {
      const q = buildSession(s);
      served.push(q);
      q.forEach(w => {
        if (!s.words[w]) s.words[w] = freshWordState();
        applyResult(s.words[w], "wrong", s.sessionsCompleted + 1);
      });
      s.sessionsCompleted += 1;
    }
    expect(served.length).toBe(10);
    expect(served.map(q => q.length)).toEqual([14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
    expect(served.flat().filter(w => WORD_LEVEL[w] > 1).length).toBe(0);
    expect(Object.keys(s.words).length).toBe(14);
  });
  it("does not count a close reading as learning the word", () => {
    const s = newState(); s.sessionsCompleted = 3;
    LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 1, attempts: 2, dueAt: 1 }; });
    s.words[LEVELS[0].words[0]] = { ...freshWordState(), box: 3, attempts: 2, dueAt: 1 };
    const q = buildSession(s);
    expect(q.length).toBe(14);
    expect(q.filter(w => WORD_LEVEL[w] === 2).length).toBe(0);
  });
  it("opens the next level at 12 of the 14 words, not at 11", () => {
    const mk = (learned, box) => {
      const s = newState(); s.sessionsCompleted = 3;
      LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 0, attempts: 2, dueAt: 1 }; });
      LEVELS[0].words.slice(0, learned).forEach(w => { s.words[w] = { ...freshWordState(), box, attempts: 2, dueAt: 1 }; });
      return s;
    };
    expect(LEVELS[0].words.length).toBe(14);
    expect(buildSession(mk(11, 3)).filter(w => WORD_LEVEL[w] === 2).length).toBe(0);
    expect(buildSession(mk(12, 3)).filter(w => WORD_LEVEL[w] === 2).length).toBe(6);
    // box 2 is a word read correctly twice and then missed: still learned
    expect(buildSession(mk(12, 2)).filter(w => WORD_LEVEL[w] === 2).length).toBe(6);
  });
  it("brings a graded next-level word back for review", () => {
    const s = newState(); s.sessionsCompleted = 6;
    LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 0, attempts: 2, dueAt: 1 }; });
    s.words.cat = { ...freshWordState(), box: 0, attempts: 1, dueAt: 1 };
    expect(WORD_LEVEL.cat).toBe(2);
    const q = buildSession(s);
    expect(q).toContain("cat");
    expect(q.length).toBe(15);
  });
  it("caps above-level review at 2 words a session", () => {
    const s = newState(); s.sessionsCompleted = 6;
    LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 0, attempts: 2, dueAt: 1 }; });
    LEVELS[1].words.slice(0, 5).forEach(w => { s.words[w] = { ...freshWordState(), box: 0, attempts: 1, dueAt: 1 }; });
    const q = buildSession(s);
    expect(q.filter(w => WORD_LEVEL[w] === 2).length).toBe(2);
    expect(q.length).toBe(16);
  });
});
