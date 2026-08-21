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
     child who has read all ten and got all ten wrong satisfies. Ten sessions
     of wrong answers handed such a child the whole of Level 2 and parked
     every word for good. Re-derived at the 2026-08-20 cutover: the converted
     starter level holds 10 words (an ant as at in it sat sit nap pan). */
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
    expect(served.map(q => q.length)).toEqual([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    expect(served.flat().filter(w => WORD_LEVEL[w] > 1).length).toBe(0);
    expect(Object.keys(s.words).length).toBe(10);
  });
  it("does not count a close reading as learning the word", () => {
    const s = newState(); s.sessionsCompleted = 3;
    LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 1, attempts: 2, dueAt: 1 }; });
    s.words[LEVELS[0].words[0]] = { ...freshWordState(), box: 3, attempts: 2, dueAt: 1 };
    const q = buildSession(s);
    expect(q.length).toBe(10);
    expect(q.filter(w => WORD_LEVEL[w] === 2).length).toBe(0);
  });
  it("opens the next level at 8 of the 10 words, not at 7", () => {
    const mk = (learned, box) => {
      const s = newState(); s.sessionsCompleted = 3;
      LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 0, attempts: 2, dueAt: 1 }; });
      LEVELS[0].words.slice(0, learned).forEach(w => { s.words[w] = { ...freshWordState(), box, attempts: 2, dueAt: 1 }; });
      return s;
    };
    expect(LEVELS[0].words.length).toBe(10);
    expect(buildSession(mk(7, 3)).filter(w => WORD_LEVEL[w] === 2).length).toBe(0);
    /* 10 own words due, so the peek fills the 20-word target: 10 from L2. */
    expect(buildSession(mk(8, 3)).filter(w => WORD_LEVEL[w] === 2).length).toBe(10);
    // box 2 is a word read correctly twice and then missed: still learned
    expect(buildSession(mk(8, 2)).filter(w => WORD_LEVEL[w] === 2).length).toBe(10);
  });
  it("holds the peek at 80 per cent, not 75 - the boundary only a 16-word level can see", () => {
    /* At the 10-word starter no whole count lands between 0.75 and 0.8, so
       the 8-of-10 test above cannot tell the two shares apart and a mutant
       trading 0.8 for 0.75 survived the 2026-08-21 gauntlet rehearsal.
       Level 8 holds 16 words: 12 of 16 is exactly 0.75 - learned to the
       weaker rule, not learned to the real one - and 13 of 16 is 0.8125.
       Counts re-derived at the cutover; the level's own words are due, so a
       peek that opens must reach level 9 for its fill. */
    const mk16 = (learned) => {
      const s = { ...newState(), preLevel: 0, level: 8, sessionsCompleted: 3 };
      LEVELS[7].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 0, attempts: 2, dueAt: 1 }; });
      LEVELS[7].words.slice(0, learned).forEach(w => { s.words[w] = { ...freshWordState(), box: 3, attempts: 2, dueAt: 1 }; });
      return s;
    };
    expect(LEVELS[7].words.length).toBe(16);
    expect(buildSession(mk16(12)).filter(w => WORD_LEVEL[w] === 9).length).toBe(0);
    expect(buildSession(mk16(13)).filter(w => WORD_LEVEL[w] === 9).length).toBe(4);
  });
  it("brings a graded next-level word back for review", () => {
    const s = newState(); s.sessionsCompleted = 6;
    LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 0, attempts: 2, dueAt: 1 }; });
    /* cat moved to Level 4 at the cutover; tin is Level 2's own. */
    s.words.tin = { ...freshWordState(), box: 0, attempts: 1, dueAt: 1 };
    expect(WORD_LEVEL.tin).toBe(2);
    const q = buildSession(s);
    expect(q).toContain("tin");
    expect(q.length).toBe(11);
  });
  it("caps above-level review at 2 words a session", () => {
    const s = newState(); s.sessionsCompleted = 6;
    LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 0, attempts: 2, dueAt: 1 }; });
    LEVELS[1].words.slice(0, 5).forEach(w => { s.words[w] = { ...freshWordState(), box: 0, attempts: 1, dueAt: 1 }; });
    const q = buildSession(s);
    expect(q.filter(w => WORD_LEVEL[w] === 2).length).toBe(2);
    expect(q.length).toBe(12);
  });
});
