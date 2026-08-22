/* THE GARDEN'S TWO FACTS (art project step 0e, owner-ruled 2026-08-22).
   The art bible's garden has eleven states, the last "after level 100", and the
   engine had no such moment: promotion stops at the last level and nothing
   records that it was finished. `ladderComplete` is that moment - the last
   level's words secure by the same rule promotion uses between levels, and
   ONLY that - and `gardenState` is the tenth of the levels completed, 10 when
   the ladder is. Every expected value is a literal (E4); the word counts are
   the bank's own, measured: level 100 holds 12 words, so 10 secure is the
   floor, and level 99 holds 6. */
import { describe, it, expect } from "vitest";
import { LEVELS, ladderComplete, gardenState, checkPromotion, newState } from "../src/engine.js";

const at = (level, secureCount = 0) => {
  const s = newState();
  s.level = level;
  const words = LEVELS[level - 1].words;
  words.slice(0, secureCount).forEach((w) => { s.words[w] = { box: 3, attempts: 1, dueAt: 0, lastSession: 0 }; });
  return s;
};

describe("the garden", () => {
  it("1: the state is the tenth of the levels completed - 0 through level 10, 1 at level 11, 9 through level 100", () => {
    expect(gardenState(at(1))).toBe(0);
    expect(gardenState(at(10))).toBe(0);
    expect(gardenState(at(11))).toBe(1);
    expect(gardenState(at(50))).toBe(4);
    expect(gardenState(at(91))).toBe(9);
    expect(gardenState(at(100))).toBe(9);
  });
  it("2: the ladder is complete when level 100's words are secure, and then the garden is 10", () => {
    expect(LEVELS.length).toBe(100);
    expect(LEVELS[99].words.length).toBe(12);
    expect(ladderComplete(at(100, 9))).toBe(false);     // 9 of 12 is 75%, under the 80% rule
    expect(ladderComplete(at(100, 10))).toBe(true);     // 10 of 12 is 83%
    expect(gardenState(at(100, 10))).toBe(10);
  });
  it("3: the two-perfect-sessions path promotes between levels and never ends the ladder", () => {
    /* SPEC section 7. The engineering chair's finding: without this line,
       ladderComplete would be a third promotion rule. At level 100 with the
       streak at 2 and the words NOT secure, neither the promotion nor the
       garden moves. */
    const s = at(100, 9);
    s.perfectStreak = 2;
    expect(ladderComplete(s)).toBe(false);
    expect(checkPromotion(s, { perfect: true, partial: false })).toBe(false);
    expect(s.level).toBe(100);
    expect(gardenState(s)).toBe(9);
    /* And between levels the same streak DOES promote - the rule is not gone,
       it is bounded. Level 99 holds 6 words; none secure, streak 2. */
    const t = at(99, 0);
    t.perfectStreak = 1;
    expect(checkPromotion(t, { perfect: true, partial: false })).toBe(true);
    expect(t.level).toBe(100);
  });
  it("4: a secure level 99 is not the end of the ladder", () => {
    expect(ladderComplete(at(99, 6))).toBe(false);
    expect(gardenState(at(99, 6))).toBe(9);
  });
  it("5: a hostile or empty state reads as the start", () => {
    expect(gardenState(null)).toBe(0);
    expect(gardenState({})).toBe(0);
    expect(ladderComplete(null)).toBe(false);
    expect(ladderComplete({ level: 100 })).toBe(false);
  });
});
