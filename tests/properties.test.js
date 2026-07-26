/* Word Quest — property tests (gate G2, docs/testing-gauntlet.md).
   Ten properties, 1000+ generated cases each, via fast-check.
   Every assertion uses literal expected values, never the constant under test. */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  LEVELS, WORD_LEVEL, chunkWord, freshWordState, applyResult,
  buildSession, migrate, newState, buildMarkdown,
} from "../src/engine.js";

const RUNS = { numRuns: 1000 };
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const ALL_WORDS = LEVELS.flatMap((l) => l.words);
/* The JSON round-trip is deliberate: saves go through JSON.stringify/parse, so
   idempotence must hold across a storage cycle, not only in memory. */
const clone = (x) => (x === null || typeof x !== "object" ? x : JSON.parse(JSON.stringify(x)));

const lowerWord = fc
  .array(fc.constantFrom(...LETTERS), { minLength: 1, maxLength: 12 })
  .map((a) => a.join(""));

const resultArb = fc.constantFrom("correct", "close", "wrong");

const wordStateArb = fc.record({
  box: fc.integer({ min: 0, max: 5 }),
  attempts: fc.integer({ min: 0, max: 50 }),
  correct: fc.integer({ min: 0, max: 50 }),
  close: fc.integer({ min: 0, max: 50 }),
  wrong: fc.integer({ min: 0, max: 50 }),
  dueAt: fc.integer({ min: 0, max: 120 }),
  lastSession: fc.integer({ min: 0, max: 60 }),
});

/* A structurally valid game state: any level, any progress, any subset of the
   real word bank with arbitrary (but well-typed) word states. */
const stateArb = fc
  .tuple(
    fc.integer({ min: 1, max: 7 }),
    fc.integer({ min: 0, max: 40 }),
    fc.array(fc.tuple(fc.constantFrom(...ALL_WORDS), wordStateArb), { maxLength: 90 })
  )
  .map(([level, done, pairs]) => {
    const s = newState();
    s.level = level;
    s.sessionsCompleted = done;
    for (const [w, st] of pairs) s.words[w] = { ...st };
    return s;
  });

describe("G2 properties", () => {
  it("P1: chunkWord round-trips every input", () => {
    for (const w of ALL_WORDS) expect(chunkWord(w).join("")).toBe(w);
    fc.assert(fc.property(lowerWord, (w) => chunkWord(w).join("") === w), RUNS);
  });

  it("P2: every chunk is one letter or one of the six digraphs", () => {
    const DIGRAPH_LITERALS = ["sh", "ch", "th", "wh", "ck", "ng"];
    fc.assert(
      fc.property(lowerWord, (w) =>
        chunkWord(w).every(
          (c) => c.length === 1 || (c.length === 2 && DIGRAPH_LITERALS.includes(c))
        )
      ),
      RUNS
    );
  });

  it("P3: box stays in 0..5 through any result sequence", () => {
    fc.assert(
      fc.property(
        wordStateArb,
        fc.array(resultArb, { minLength: 1, maxLength: 30 }),
        (start, seq) => {
          const ws = { ...start };
          for (const r of seq) {
            applyResult(ws, r, 1);
            if (ws.box < 0 || ws.box > 5) return false;
          }
          return true;
        }
      ),
      RUNS
    );
  });

  it("P4: dueAt is the session plus the ladder value for the new box, and is in the future", () => {
    const LADDER = [1, 1, 2, 4, 7, 12];
    fc.assert(
      fc.property(
        wordStateArb,
        resultArb,
        fc.integer({ min: 1, max: 99 }),
        (start, r, n) => {
          const ws = { ...start };
          applyResult(ws, r, n);
          return ws.dueAt === n + LADDER[ws.box] && ws.dueAt > n;
        }
      ),
      RUNS
    );
  });

  it("P5: attempts grows by exactly 1 per call and equals correct+close+wrong from fresh", () => {
    fc.assert(
      fc.property(fc.array(resultArb, { minLength: 1, maxLength: 40 }), (seq) => {
        const ws = freshWordState();
        for (let i = 0; i < seq.length; i++) {
          applyResult(ws, seq[i], i + 1);
          if (ws.attempts !== i + 1) return false;
        }
        return ws.correct + ws.close + ws.wrong === seq.length;
      }),
      RUNS
    );
  });

  it("P6: a first-ever correct always lands on box 3", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 1, max: 99 }),
        (box, n) => {
          const ws = { ...freshWordState(), box, attempts: 0 };
          applyResult(ws, "correct", n);
          return ws.box === 3;
        }
      ),
      RUNS
    );
  });

  it("P7: a session never repeats a word and never exceeds 20", () => {
    fc.assert(
      fc.property(stateArb, (s) => {
        const q = buildSession(s);
        return new Set(q).size === q.length && q.length <= 20;
      }),
      RUNS
    );
  });

  it("P8: never more than one level ahead, and peeking only when nothing fresh remains", () => {
    fc.assert(
      fc.property(stateArb, (s) => {
        const q = buildSession(s);
        if (!q.every((w) => WORD_LEVEL[w] <= s.level + 1)) return false;
        if (q.some((w) => WORD_LEVEL[w] === s.level + 1)) {
          const fresh = LEVELS[s.level - 1].words.filter(
            (w) => !s.words[w] || s.words[w].attempts === 0
          );
          return fresh.length === 0;
        }
        return true;
      }),
      RUNS
    );
  });

  it("P9: the session opens with the most secure word", () => {
    fc.assert(
      fc.property(stateArb, (s) => {
        const q = buildSession(s);
        if (q.length === 0) return true;
        const box = (w) => (s.words[w] ? s.words[w].box : 0);
        return box(q[0]) === Math.max(...q.map(box));
      }),
      RUNS
    );
  });

  it("P10: migrate is total and idempotent, and its output survives the engine", () => {
    /* Plain random JSON almost never hits the real keys, so mix in a shaped
       arbitrary that puts hostile values under the state's actual key names. */
    const hostile = fc.jsonValue({ maxDepth: 2 });
    const shapedArb = fc.record(
      {
        version: fc.oneof(fc.constant(3), fc.constant(2), hostile),
        level: hostile,
        sessionsCompleted: hostile,
        perfectStreak: hostile,
        settings: hostile,
        words: fc.oneof(hostile, fc.dictionary(fc.string(), hostile, { maxKeys: 6 })),
        log: fc.oneof(hostile, fc.array(hostile, { maxLength: 6 })),
      },
      { requiredKeys: [] }
    );
    fc.assert(
      fc.property(fc.oneof(fc.jsonValue({ maxDepth: 4 }), shapedArb), (x) => {
        const m1 = migrate(clone(x));
        const m2 = migrate(clone(m1));
        expect(m2).toEqual(m1);
        if (m1.level < 1 || m1.level > 7) return false;
        if (!Object.values(m1.words).every((ws) => ws.box >= 0 && ws.box <= 5)) return false;
        const q = buildSession(m1);
        if (q[0]) {
          if (!m1.words[q[0]]) m1.words[q[0]] = freshWordState();
          applyResult(m1.words[q[0]], "correct", 1);
        }
        buildMarkdown(m1);
        return true;
      }),
      RUNS
    );
  });
});
