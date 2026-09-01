/* The migrate suite, split from tests/engine.test.js on 2026-08-21 when the
   recompute ruling's rails pushed that file past the 1,400-line ceiling (E6:
   a file approaching a ceiling is split, never the ceiling raised). The
   gauntlet counts the two files as ONE summed floor, the safety-split
   pattern, so no test can vanish from either. */
import { describe, it, expect } from "vitest";
import {
  LEVELS, freshWordState, buildSession, migrate, newState, buildMarkdown, bankWords, dueChunks, chunkSeat } from "../src/engine.js";

const clone = (o) => JSON.parse(JSON.stringify(o));

describe("migrate", () => {
  const v2 = () => ({ version: 2, level: 3, sessionsCompleted: 9,
    settings: { mode: "parent", sound: true, childName: "", lang: "en-US" },
    words: { cat: { box: 5, attempts: 9, correct: 8, close: 1, wrong: 0, dueAt: 20, lastSession: 8 } },
    log: [{ n: 1, level: 1, c: 18, k: 1, w: 1, acc: 90, items: [], partial: false }] });

  it("runs the whole chain: the log shifts, the level recomputes from the words, mode leaves", () => {
    /* v3 bumps the level and the log; v4 (the 10-and-10 curriculum,
       2026-08-15) recomputes from the child's own words. THE FLOOR IS GONE -
       owner-ruled 2026-08-21 on the cutover morning page ("Recompute the
       seat from the child's own graded words"): the old stored-number floor
       kept a finished save at a number that skips the new ladder's own
       teaching, so the walk alone seats any child who has graded anything.
       This fixture's one mastered word secures no level, and the child
       starts the hundred-level ladder at its first rung with that word's
       mastery intact. The log keeps its bumped number: it recorded what was
       true when written. v4 also drops settings.mode, the microphone-era
       leftover (J2). */
    const m = migrate(v2());
    expect(m.version).toBe(7);   // v7, the chunk-ladder rebuild (2026-08-29) expect(m.level).toBe(1); expect(m.log[0].level).toBe(2);
    expect(m.settings.mode).toBeUndefined();
  });
  it("leaves word data untouched", () => {
    const before = JSON.stringify(v2().words);
    expect(JSON.stringify(migrate(v2()).words)).toBe(before);
  });
  it("seats an updating child by the ruled recompute, and a hand-set save by its number", () => {
    /* The 2026-08-21 ruling's rails, each measured before being typed. The
       graduate fixture grades EVERY bank word except cops and spots - the
       two words new level 6 seats that the old 476-word game never taught -
       so however finished the old save was, the walk stops where the new
       teaching starts: 5 of level 6's 7 words is 71%, under the 80% gate. */
    const graduate = { ...newState(), version: 5, level: 21, preLevel: 0, words: {} };
    for (const w of bankWords()) if (w !== "cops" && w !== "spots")
      graduate.words[w] = { ...freshWordState(), box: 5, attempts: 6, dueAt: 99 };
    expect(migrate(graduate).level).toBe(6);
    const untouched = { ...newState(), version: 5, level: 15, preLevel: 0, words: {} };
    expect(migrate(untouched).level).toBe(15);         // no graded words: the number is the only evidence
    const one = { ...newState(), version: 5, level: 14, preLevel: 0, words: { cat: { ...freshWordState(), box: 5, attempts: 4, dueAt: 99 } } };
    expect(migrate(one).level).toBe(1);                // one graded word secures nothing: the walk starts at the start
  });
  it("clamps an impossible level even on a save that needs no version work", () => {
    /* The defensive clamp is its own line, AFTER the version migrations, and
       a version-6 save skips all of them - so only that line stands between
       a corrupted level and the session builder. A mutant removing it
       survived the 2026-08-21 rehearsal because every clamp test travelled
       through migrateV6, which clamps on its own. Both rails, as literals. */
    expect(migrate({ ...newState(), level: 999 }).level).toBe(100);
    expect(migrate({ ...newState(), level: -3 }).level).toBe(1);
  });
  it("is idempotent", () => {
    const once = migrate(v2()); const twice = migrate(clone(once));
    expect(twice).toEqual(once);
  });
  it("recomputes any pre-v4 level from the words, and clamps a v4 one", () => {
    /* Re-derived under the 2026-08-21 recompute ruling. A graded save takes
       the walk regardless of its stored number (the v2 fixture's one
       mastered word walks to level 1); a save with NO graded words keeps
       its stored number through the version bumps and clamps - the wild 99
       maps through OLD_TO_NEW's clamp to old 11 and lands at 20, -5 clamps
       to 1, and a v4 save's 99 is simply in range now. */
    expect(migrate({ ...v2(), level: 6 }).level).toBe(1);
    expect(migrate({ version: 3, level: 99 }).level).toBe(20);
    expect(migrate({ version: 3, level: -5 }).level).toBe(1);
    /* 99 stopped being out of range at the cutover; v6 keeps it. */
    expect(migrate({ version: 4, level: 99 }).level).toBe(99);
    /* The half-level save: heal() rounds any fractional level BEFORE the
       clamp ("a fractional one is rounded"), so 20.5 lands on 21 by design.
       Pinned the night property P10's own stale 20-bound flagged it and an
       agent nearly "fixed" the engine instead of the property (E4 literals). */
    expect(migrate({ version: 4, level: 20.5 }).level).toBe(21);
    expect(migrate({ version: 4, level: 20.4 }).level).toBe(20);
    expect(migrate({ version: 5, level: 999 }).level).toBe(100);   // the new top
    expect(migrate({ version: 4, level: -5 }).level).toBe(1);
  });
  it("computes the migrated level at the same boundary promotion uses", () => {
    /* 8 of the converted Level 1's 10 words secure it (80 per cent or more);
       7 do not. Mastering the first two levels' words exactly answers 3.
       Literals (E4), re-derived at the cutover. */
    const seven = { version: 3, words: {} };
    LEVELS[0].words.slice(0, 7).forEach((w) => { seven.words[w] = { box: 3, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }; });
    expect(migrate(seven).level).toBe(1);
    const eight = { version: 3, words: {} };
    LEVELS[0].words.slice(0, 8).forEach((w) => { eight.words[w] = { box: 3, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }; });
    expect(migrate(eight).level).toBe(2);
    const twoLevels = { version: 3, words: {} };
    LEVELS.slice(0, 2).flatMap((l) => l.words).forEach((w) => { twoLevels.words[w] = { box: 5, attempts: 4, correct: 4, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }; });
    expect(migrate(twoLevels).level).toBe(3);
  });
  it("never seats a migrated child below the ground they held", () => {
    /* Promotion's second path — two perfect sessions — leaves few boxes
       behind, and a parent can set a level by hand; both were real saves the
       recompute alone sent back to Level 1 (build reviewer, 2026-08-15).
       Old 5 was Explorer, which survives whole as new 14; old 8 was Bells,
       now 17. Literals (E4). */
    expect(migrate({ version: 3, level: 5, words: {} }).level).toBe(14);
    expect(migrate({ version: 3, level: 8, words: {} }).level).toBe(17);
    /* And the floor is a floor, not a ceiling: boxes that compute HIGHER than
       the stored ground win. Mastering the first six levels' words computes 7
       against old Level 2's floor of 2. */
    const rich = { version: 3, level: 2, words: {} };
    LEVELS.slice(0, 6).flatMap((l) => l.words).forEach((w) => { rich.words[w] = { box: 5, attempts: 4, correct: 4, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }; });
    expect(migrate(rich).level).toBe(7);
  });
  it("survives hostile documents", () => {
    for (const bad of [{}, null, undefined, { version: "2" }, { log: null }, { words: [] }])
      expect(() => migrate(clone(bad === undefined ? {} : bad) || {})).not.toThrow();
  });
});

describe("a returning player is not sent back to the chunk ladder (fault AW)", () => {
  /* Found by the release gauntlet, not by any unit test - three browser gates
     failed because the walk's level-77 save was served a CHUNK, which has no
     sound-out tiles. Measured before the fix: 3 riders a session against a
     67-chunk roster is about 23 sessions of drill before a level-100 reader
     reaches their own words. These tests are what would have caught it. */
  const save = (version, level, pre = {}) => ({
    version, level, preLevel: 0, prePerfectStreak: 0, sessionsCompleted: 100,
    perfectStreak: 0, words: {}, log: [], pre,
    settings: { sound: true, childName: "", lang: "en-US" },
  });

  it("credits a save written before the chunk ladder existed", () => {
    /* Version 6 is what beta 28 shipped - checked in the tag. Every save a real
       child owns is 6 or lower, so this is the case that reaches every player
       on update. */
    expect(dueChunks(migrate(save(6, 77))).length).toBe(0);
    expect(dueChunks(migrate(save(5, 77))).length).toBe(0);
  });

  it("control: a graduate on a LADDER build still gets the ladder", () => {
    /* The control that killed the first fix. A level-5 graduate with no chunk
       records is indistinguishable in the data from a pre-ladder save - only the
       version separates them, and this is the child the ladder is for. */
    expect(dueChunks(migrate(save(7, 5))).length).toBeGreaterThan(0);
  });

  it("control: a child still ON level 1 is not credited out of the ladder", () => {
    const justOut = migrate(save(6, 1));
    expect(Object.keys(justOut.pre).filter((k) => k.startsWith("c:")).length).toBe(0);
  });

  it("credits only chunks at or below the level the child had reached", () => {
    const m = migrate(save(6, 3));
    const seats = Object.keys(m.pre).filter((k) => k.startsWith("c:"));
    expect(seats.length).toBeGreaterThan(0);
    expect(seats.every((k) => chunkSeat(k.slice(2)) <= 3)).toBe(true);
  });
});
