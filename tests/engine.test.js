/* Word Quest — engine test suite.
   Run: npm test  (vitest). Regenerate the module first: node tools/extract-engine.mjs
   Every assertion uses literal expected values, never the constant under test. */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  LEVELS, TRICKY, INTERVALS, SESSION_SIZE, PROMPT_CAP, WORD_LEVEL,
  chunkWord, dashed, freshWordState, applyResult, buildSession, checkPromotion,
  heal, migrate, newState, buildMarkdown, loadState, saveState, speak, hush, buzz, feedbackSpeech, PRAISE,
  SEAM_MS, SOUNDOUT_SEAM_MS, voiceScript, clipPlan, resolvePack, TTS_UNSAFE_PRAISE, ttsSafePraise,
  SENTENCE_PRAISE, sentenceLead,
  soundInventory, bankWords, soundIdFor, soundIdsFor, tileSlots, isSeam, seamMs, WORD_SOUND, isSecure,
  buildTray, trayPool, trayExtras, trayClash, trayForbidden, buildable, NEVER_BUILD,
  SENTENCES, REVEAL_LINES, REVEAL_LINE_TEXT, sentenceWords, revealWord,
} from "../src/engine.js";
import { check as decodableCheck } from "../tools/decodable.mjs";

const clone = (o) => JSON.parse(JSON.stringify(o));
const seeded = (words, patch) => { const s = newState(); words.forEach(w => { s.words[w] = { ...freshWordState(), ...patch }; }); return s; };

/* ---------------- bank ---------------- */
describe("A stumble must not cost mastery (parent report, 2026-08-13)", () => {
  /* The child had read "am" and "us" correctly TWICE each and the mastery map still
     showed them as not learned. The cause: the fast track to box 3 keyed off
     the first ATTEMPT, so one "close" - which SPEC section 5 calls an
     invitation to try again, never a failure - cost two extra correct readings
     for good. Literal expected values throughout (E4). */
  it("a close then a correct lands on box 3, not box 2", () => {
    const ws = freshWordState();
    applyResult(ws, "close", 1);
    expect(ws.box).toBe(1);
    applyResult(ws, "correct", 2);
    expect(ws.box).toBe(3);
  });
  it("a wrong then a correct lands on box 3, not box 1", () => {
    const ws = freshWordState();
    applyResult(ws, "wrong", 1);
    expect(ws.box).toBe(0);
    applyResult(ws, "correct", 2);
    expect(ws.box).toBe(3);
  });
  it("the parent's own words: two correct readings after a stumble reach mastery", () => {
    for (const first of ["close", "wrong"]) {
      const ws = freshWordState();
      applyResult(ws, first, 1);
      applyResult(ws, "correct", 2);
      applyResult(ws, "correct", 3);
      expect(ws.box).toBe(4);
      expect(ws.correct).toBe(2);
    }
  });
  it("but the second correct still only steps one box, so the jump is not repeatable", () => {
    const ws = freshWordState();
    applyResult(ws, "correct", 1);
    expect(ws.box).toBe(3);
    applyResult(ws, "correct", 2);
    expect(ws.box).toBe(4);
    applyResult(ws, "correct", 3);
    expect(ws.box).toBe(5);
  });
});

describe("word bank", () => {
  it("has 476 unique words across 21 levels", () => {
    const all = LEVELS.flatMap(l => l.words);
    expect(all.length).toBe(476);
    expect(new Set(all).size).toBe(476);
    expect(LEVELS.map(l => l.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    expect(LEVELS.map(l => l.words.length)).toEqual([14, 13, 12, 13, 14, 14, 12, 10, 10, 10, 10, 11, 33, 49, 38, 58, 28, 23, 58, 32, 14]);
  });
  it("starts with the ten VC words, then Level 1's four seated hearts", () => {
    expect(LEVELS[0].words).toEqual(["is","it","in","on","at","an","up","us","am","ax","the","a","and","i"]);
  });
  it("maps every word to its level", () => {
    expect(Object.keys(WORD_LEVEL).length).toBe(476);
    expect(WORD_LEVEL.at).toBe(1); expect(WORD_LEVEL.cat).toBe(2); expect(WORD_LEVEL.was).toBe(16);
    expect(WORD_LEVEL.has).toBe(6); expect(WORD_LEVEL.she).toBe(15);
    /* Heart seats are the owner's 2026-08-15 rulings: a heart word's level is
       where the CHILD MEETS it, not where its spelling would fall. */
    expect(WORD_LEVEL.the).toBe(1); expect(WORD_LEVEL.and).toBe(1); expect(WORD_LEVEL.i).toBe(1);
    expect(WORD_LEVEL.my).toBe(2); expect(WORD_LEVEL.of).toBe(7);
    expect(WORD_LEVEL.bell).toBe(17); expect(WORD_LEVEL.chick).toBe(18);
  });
  it("flags the thirty-two tricky words — the originals, the heart notes, i, seating pass two's four, and the hybrid ruling's four", () => {
    /* into, find, old and hold joined 2026-08-20 under the owner's hybrid
       ruling: function words stay seated where children meet them, marked
       tricky with true-sound bends, instead of moving to their code levels
       and breaking 27 approved texts. Re-typed here by hand, as this pin
       demands of every arrival. */
    expect(Object.keys(TRICKY).sort()).toEqual([
      "a","be","bush","do","find","for","go","has","he","hold","i","into","is","me","my","no","of",
      "old","out","push","said","she","so","the","there","they","to","was","wash","we","what","you",
    ]);
    /* "and" is the one heart word with no note, because it bends nothing —
       pinned so a note cannot arrive for it without a person deciding, and
       so its absence is a stated fact rather than an oversight (J1). */
    expect(TRICKY.and).toBeUndefined();
  });
  it("keeps every word inside what the tile row can hold: 4 units at most, 5 letters at most", () => {
    /* Levels 1 to 18 break into one, two or three sound units. Levels 19 and
       20 are blends, and a blend is TWO sounds run together rather than one —
       "band" is b-a-n-d and "step" is s-t-e-p — so a fourth unit appears
       there. Four is the ceiling, and it is a real one: the feedback tile row
       is a flexbox that does not wrap, so a fifth unit would push the word
       off a small screen. That the four fit is measured on a 320 px viewport
       by the G7 interface gate, which an assertion here cannot see. */
    /* ONE tile is possible by exactly two words, each named here rather than
       allowed by a loosened floor, so a single-letter word arriving by
       accident still fails: the article "a" (2026-08-12) and the word "i"
       (round four, 2026-08-15). Both share the shape nothing else in the bank
       produces — the word, the sound and the word again are all the same
       recording — which is why the owner heard each before it shipped. */
    const single = LEVELS.flatMap((l) => l.words).filter((w) => chunkWord(w).length === 1);
    expect(single).toEqual(["a", "i"]);
    for (const l of LEVELS) {
      for (const w of l.words) {
        /* Letters: three through the CVC stages; "said" brings four to Level 6
           as a heart, the digraph stages run at four, Chicks (18) at five.
           Tiles: three everywhere until the blend stages — a blend is TWO
           sounds run together, so Levels 19 and 20 seat the first four-tile
           words, measured on a 320 px viewport by the G7 interface gate. */
        /* The first seating pass (2026-08-16) brought the first FIVE-letter
           blend words — black and think — so Levels 19 and up share Chicks'
           five-letter allowance; their four tiles at 320 px stay measured by
           the G7 interface gate, never assumed here. */
        expect(w.length).toBeLessThanOrEqual(l.n >= 18 ? 5 : l.n === 6 || l.n >= 15 ? 4 : 3);
        expect(chunkWord(w).length).toBeGreaterThanOrEqual(w === "a" || w === "i" ? 1 : 2);
        expect(chunkWord(w).length).toBeLessThanOrEqual(l.n >= 19 ? 4 : 3);
      }
    }
  });
});

/* ---------------- phonics (S5) ---------------- */
describe("chunkWord and dashed", () => {
  it("fuses every digraph", () => {
    expect(chunkWord("ship")).toEqual(["sh","i","p"]);
    expect(chunkWord("duck")).toEqual(["d","u","ck"]);
    expect(chunkWord("sing")).toEqual(["s","i","ng"]);
    expect(chunkWord("when")).toEqual(["wh","e","n"]);
    expect(chunkWord("this")).toEqual(["th","i","s"]);
    expect(chunkWord("chat")).toEqual(["ch","a","t"]);
    expect(chunkWord("quiz")).toEqual(["qu","i","z"]);
    expect(chunkWord("knock")).toEqual(["kn","o","ck"]);
    expect(chunkWord("wreck")).toEqual(["wr","e","ck"]);
    expect(chunkWord("thumb")).toEqual(["th","u","mb"]);
    expect(chunkWord("bell")).toEqual(["b","e","ll"]);
    expect(chunkWord("whizz")).toEqual(["wh","i","zz"]);
    /* The two units the heart words needed, owner-approved 2026-08-12. Pinned
       by the words that motivated them, not only by the list, so a unit that
       stopped fusing would fail here even if the list still named it. */
    expect(chunkWord("said")).toEqual(["s","ai","d"]);
    expect(chunkWord("you")).toEqual(["y","ou"]);
    /* Seating pass two's units, owner-approved 2026-08-17, pinned by their
       motivating words like ai and ou before them — and ere, the one
       trigraph, pinned the same way. */
    expect(chunkWord("they")).toEqual(["th","ey"]);
    expect(chunkWord("for")).toEqual(["f","or"]);
    expect(chunkWord("there")).toEqual(["th","ere"]);
    /* THE ROSTER ITSELF IS PINNED IN tests/chunker.test.js, which owns the
       extended code the 100-level ladder teaches (2026-08-19) and every
       position rule that keeps it off ordinary words. It is a separate file
       because this one is 1318 lines against a 1400 ceiling, and E6 says a
       file approaching a ceiling is split rather than grown into — and
       because the g1_unit_tests floor is counted from THIS file's name, so
       moving the tests that were already here would have LOWERED a floor,
       which E6 forbids outright. Both halves stay literal either way. */
  });

  it("splits VC and plain CVC words", () => {
    expect(chunkWord("ax")).toEqual(["a","x"]);
    expect(chunkWord("is")).toEqual(["i","s"]);
    expect(chunkWord("cat")).toEqual(["c","a","t"]);
  });
  it("renders hyphenated feedback text", () => {   // S5 — the text a child sees
    expect(dashed("cat")).toBe("c-a-t");
    expect(dashed("ship")).toBe("sh-i-p");
    expect(dashed("at")).toBe("a-t");
  });
  it("round-trips any input", () => {
    for (const w of LEVELS.flatMap(l => l.words)) expect(chunkWord(w).join("")).toBe(w);
  });
});

/* ---------------- grading table (S1, S2) ---------------- */
describe("applyResult", () => {
  it("fast-tracks a first-sight correct to box 3", () => {
    const ws = freshWordState(); applyResult(ws, "correct", 1);
    expect(ws.box).toBe(3); expect(ws.attempts).toBe(1); expect(ws.correct).toBe(1);
    expect(ws.dueAt).toBe(5);                       // literal: 1 + 4
  });
  it("increments a known word by exactly one box", () => {
    /* correct: 1, because the fast track now keys off the first CORRECT rather
       than the first attempt. A word at box 1 with two attempts and no correct
       reading is a state the app cannot reach: it would still be owed its jump
       to box 3. The fixture describes a real word - read right once, stumbled
       since - rather than an impossible one. */
    const ws = { ...freshWordState(), box: 1, attempts: 2, correct: 1 }; applyResult(ws, "correct", 10);
    expect(ws.box).toBe(2); expect(ws.dueAt).toBe(12);   // literal: 10 + 2
  });
  it("caps the box at 5", () => {
    /* correct: 5 for the same reason: box 5 is unreachable without correct
       readings, and the old fixture claimed nine attempts and none of them right. */
    const ws = { ...freshWordState(), box: 5, attempts: 9, correct: 5 }; applyResult(ws, "correct", 10);
    expect(ws.box).toBe(5); expect(ws.dueAt).toBe(22);   // literal: 10 + 12
  });
  it("never lets close demote below 1 and never promotes", () => {
    const low = { ...freshWordState(), box: 0, attempts: 1 }; applyResult(low, "close", 5);
    expect(low.box).toBe(1); expect(low.dueAt).toBe(6);  // literal: 5 + 1
    const high = { ...freshWordState(), box: 4, attempts: 4 }; applyResult(high, "close", 5);
    expect(high.box).toBe(4);
  });
  it("drops exactly two boxes on wrong, with a floor of 0", () => {
    const ws = { ...freshWordState(), box: 4, attempts: 3 }; applyResult(ws, "wrong", 7);
    expect(ws.box).toBe(2); expect(ws.dueAt).toBe(9);    // literal: 7 + 2
    const floor = { ...freshWordState(), box: 1, attempts: 3 }; applyResult(floor, "wrong", 7);
    expect(floor.box).toBe(0); expect(floor.dueAt).toBe(8);
  });
  it("counts one attempt per call and records the session", () => {
    const ws = freshWordState();
    applyResult(ws, "correct", 3); applyResult(ws, "wrong", 4); applyResult(ws, "close", 5);
    expect(ws.attempts).toBe(3);
    expect([ws.correct, ws.wrong, ws.close]).toEqual([1, 1, 1]);
    expect(ws.lastSession).toBe(5);
  });
  /* THE PROMOTION BOUNDARY, at exactly 80 per cent. The rule is "80 per cent or
     more", and the only inputs that tell that apart from "more than 80 per
     cent" are the ones that land exactly on it — which needs a total divisible
     by five. No level has one since "gob" was removed on 2026-08-13, so the
     mutation gate found ">= to >" surviving within the hour: the boundary had
     become unreachable and the rule could have drifted silently, holding a
     child at a level they had earned.

     These are synthetic totals on purpose. They stay exact whatever the bank
     grows into, which is the whole point of taking the comparison out of the
     bank's arithmetic. */
  it("promotes at exactly 80 percent, not only above it", () => {
    expect(isSecure(4, 5)).toBe(true);        // 0.80 exactly — kills ">= to >"
    expect(isSecure(8, 10)).toBe(true);       // 0.80 exactly, a second total
    expect(isSecure(40, 50)).toBe(true);      // 0.80 exactly, the old Level 5
    expect(isSecure(3, 5)).toBe(false);       // 0.60
    expect(isSecure(7, 10)).toBe(false);      // 0.70 — kills "0.8 to 0.75"
    expect(isSecure(39, 49)).toBe(false);     // 0.7959 — today's Level 5, just under
    expect(isSecure(40, 49)).toBe(true);      // 0.8163 — today's Level 5, just over
    /* An empty level can never promote, and dividing by zero must not read as
       secure: 0/0 is NaN, and NaN >= 0.8 is false, but that is a property of
       NaN rather than a decision. The guard says it out loud. */
    expect(isSecure(0, 0)).toBe(false);
  });
  it("uses the published interval ladder", () => {   // S2 — literals, not the constant
    expect(INTERVALS).toEqual([1, 1, 2, 4, 7, 12]);
    const due = [0,1,2,3,4,5].map(b => { const ws={...freshWordState(),box:b,attempts:2}; applyResult(ws,"close",100); return ws.dueAt; });
    expect(due).toEqual([101, 101, 102, 104, 107, 112]);
  });
});

/* ---------------- promotion (S3) ---------------- */
describe("checkPromotion", () => {
  it("promotes at exactly 80 percent on a ten-word level", () => {   // S3 — reachable boundary
    // 8/10 is EXACTLY 0.8 — the one case where >= and > differ, and the
    // 10-and-10 curriculum made it reachable through the real bank again
    // (Level 8 carries no hearts, so ten IS its denominator). A test that
    // sits off the boundary let the "promotion >= to >" mutant survive G5
    // on 2026-08-03; this one sits on it from both sides.
    const at8 = seeded(LEVELS[7].words.slice(0, 8), { box: 3, attempts: 1 }); at8.level = 8;
    expect(checkPromotion(at8)).toBe(true); expect(at8.level).toBe(9);
    const at7 = seeded(LEVELS[7].words.slice(0, 7), { box: 3, attempts: 1 }); at7.level = 8;
    expect(checkPromotion(at7)).toBe(false); expect(at7.level).toBe(8);
  });
  it("uses box 3 as the solid threshold, not box 2", () => {   // S3 — kills the >= 2 mutant
    const box2 = seeded(LEVELS[0].words, { box: 2, attempts: 2 });
    expect(checkPromotion(box2)).toBe(false);
    const box3 = seeded(LEVELS[0].words, { box: 3, attempts: 2 });
    expect(checkPromotion(box3)).toBe(true);
  });
  it("needs 12 of 14 on the starter level, hearts counted", () => {
    const eleven = seeded(LEVELS[0].words.slice(0, 11), { box: 3, attempts: 1 });
    expect(checkPromotion(eleven)).toBe(false);
    const twelve = seeded(LEVELS[0].words.slice(0, 12), { box: 3, attempts: 1 });
    expect(checkPromotion(twelve)).toBe(true); expect(twelve.level).toBe(2);
  });
  it("never promotes past the last level", () => {
    const top = seeded(LEVELS[20].words, { box: 5, attempts: 5 }); top.level = 21;
    expect(checkPromotion(top)).toBe(false); expect(top.level).toBe(21);
  });
  it("promotes after two perfect sessions; a partial session never moves the streak", () => {
    const s = newState(); s.level = 2;
    expect(checkPromotion(s, { partial: false, perfect: true })).toBe(false);
    expect(s.perfectStreak).toBe(1);
    expect(checkPromotion(s, { partial: true, perfect: true })).toBe(false);
    expect(s.perfectStreak).toBe(1);
    expect(checkPromotion(s, { partial: false, perfect: true })).toBe(true);
    expect(s.level).toBe(3);
    expect(s.perfectStreak).toBe(0);
  });
  it("an imperfect completed session resets the streak to zero", () => {
    const s = newState(); s.level = 2; s.perfectStreak = 1;
    expect(checkPromotion(s, { partial: false, perfect: false })).toBe(false);
    expect(s.perfectStreak).toBe(0);
  });
  it("the streak never promotes past the last level, and never banks above 2", () => {
    const s = newState(); s.level = 21; s.perfectStreak = 5;
    expect(checkPromotion(s, { partial: false, perfect: true })).toBe(false);
    expect(s.level).toBe(21);
    expect(s.perfectStreak).toBe(2);                        // capped, not 6
  });
  it("a partial session with a miss also leaves the streak unchanged", () => {
    const s = newState(); s.level = 2; s.perfectStreak = 1;
    expect(checkPromotion(s, { partial: true, perfect: false })).toBe(false);
    expect(s.perfectStreak).toBe(1);
  });
  it("a stored streak alone never promotes on a session-less check", () => {
    const s = newState(); s.level = 2; s.perfectStreak = 2;
    expect(checkPromotion(s)).toBe(false);
    expect(s.level).toBe(2);
  });
  it("a manual level change resets the streak (source tripwire)", () => {
    for (const f of ["reference/word-quest.jsx", "app/src/App.jsx"])
      expect(readFileSync(f, "utf8").includes("s.level = n; s.perfectStreak = 0;")).toBe(true);
    // fixture control: the tripwire fails on the bare setter
    expect("mutate(s => { s.level = n; })".includes("s.perfectStreak = 0;")).toBe(false);
  });
  it("heal repairs a hostile perfectStreak", () => {
    expect(heal({ perfectStreak: -4 }).perfectStreak).toBe(0);
    expect(heal({ perfectStreak: "abc" }).perfectStreak).toBe(0);
    expect(heal({ perfectStreak: 2.6 }).perfectStreak).toBe(2);   // rounded, then capped at 2
    expect(heal({ perfectStreak: 999 }).perfectStreak).toBe(2);
    expect(heal({}).perfectStreak).toBe(0);
  });
});

/* ---------------- session builder (S4) ---------------- */
describe("buildSession", () => {
  it("serves the 14 starter words - ten VC, four hearts - and nothing else on a fresh install", () => {
    const q = buildSession(newState());
    expect(q.length).toBe(14);
    expect(new Set(q)).toEqual(new Set(LEVELS[0].words));
  });
  it("targets 20 words on a full level", () => {
    /* Level 13 is the first with more fresh words than the target; an early
       ten-word level runs short instead, which "serves the whole starter
       level" above pins from the other side. */
    const s = newState(); s.level = 13;
    LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 5, attempts: 3, dueAt: 99 }; });
    expect(buildSession(s).length).toBe(20);
    expect(SESSION_SIZE).toBe(20);
  });
  it("never repeats a word", () => {
    const s = newState(); s.level = 4; s.sessionsCompleted = 12;
    LEVELS.slice(0, 4).flatMap(l => l.words).forEach(w => { s.words[w] = { ...freshWordState(), box: 2, attempts: 4, dueAt: 1 }; });
    const q = buildSession(s);
    expect(new Set(q).size).toBe(q.length);
  });
  it("caps lower-level reviews at 5", () => {                        // S4
    const s = newState(); s.level = 3; s.sessionsCompleted = 9;
    LEVELS[0].words.concat(LEVELS[1].words).forEach(w => { s.words[w] = { ...freshWordState(), box: 1, attempts: 4, dueAt: 1 }; });
    const q = buildSession(s);
    const below = q.filter(w => WORD_LEVEL[w] < 3 && s.words[w].box < 4);
    expect(below.length).toBeLessThanOrEqual(5);
    expect(below.length).toBe(5);
  });
  it("adds at most 2 confidence words, and none before session 3", () => {   // S4
    const mk = (done) => { const s = newState(); s.level = 3; s.sessionsCompleted = done;
      LEVELS[0].words.concat(LEVELS[1].words).forEach(w => { s.words[w] = { ...freshWordState(), box: 5, attempts: 6, dueAt: 999 }; });
      return s; };
    const early = mk(1), later = mk(5);
    const countMastered = (s, q) => q.filter(w => s.words[w] && s.words[w].box >= 4).length;
    expect(countMastered(early, buildSession(early))).toBe(0);
    expect(countMastered(later, buildSession(later))).toBe(2);
  });
  it("opens every session with the most secure word", () => {        // S4 — a design rule
    const s = newState(); s.level = 2; s.sessionsCompleted = 6;
    LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 1, attempts: 3, dueAt: 1 }; });
    s.words.at = { ...freshWordState(), box: 5, attempts: 9, dueAt: 1 };
    for (let i = 0; i < 12; i++) {
      const q = buildSession(s);
      const firstBox = s.words[q[0]] ? s.words[q[0]].box : 0;
      expect(firstBox).toBe(5);
    }
  });
  it("does not peek at the next level while fresh words remain", () => {
    const s = newState(); s.sessionsCompleted = 3;
    LEVELS[0].words.slice(0, 11).forEach(w => { s.words[w] = { ...freshWordState(), box: 5, attempts: 4, dueAt: 99 }; });
    expect(buildSession(s).every(w => WORD_LEVEL[w] === 1)).toBe(true);
  });
  it("peeks once the level has been fully seen", () => {
    const s = newState(); s.sessionsCompleted = 3;
    LEVELS[0].words.forEach(w => { s.words[w] = { ...freshWordState(), box: 5, attempts: 4, dueAt: 99 }; });
    expect(buildSession(s).some(w => WORD_LEVEL[w] === 2)).toBe(true);
  });
  it("never serves content more than one level ahead", () => {
    const s = newState(); s.level = 3; s.sessionsCompleted = 8;
    LEVELS.slice(0, 3).flatMap(l => l.words).forEach(w => { s.words[w] = { ...freshWordState(), box: 5, attempts: 4, dueAt: 999 }; });
    expect(buildSession(s).every(w => WORD_LEVEL[w] <= 4)).toBe(true);
  });
  it("publishes a prompt cap above the session size", () => {
    expect(PROMPT_CAP).toBe(26);
    expect(PROMPT_CAP).toBeGreaterThan(20);
  });
});

/* ---------------- heal + migrate ---------------- */
describe("heal", () => {
  it("gives an empty object a usable shape", () => {
    const s = heal({});
    expect(s.words).toEqual({}); expect(s.log).toEqual([]);
    expect(s.settings.lang).toBe("en-US"); expect(s.sessionsCompleted).toBe(0);
  });
  it("repairs wrong types and clamps word data", () => {
    const s = heal({ words: "nope", log: 5, settings: null, sessionsCompleted: -4 });
    expect(s.words).toEqual({}); expect(s.log).toEqual([]); expect(s.sessionsCompleted).toBe(0);
    const t = heal({ words: { cat: { box: 99, attempts: "x" }, bad: null } });
    expect(t.words.cat.box).toBe(5); expect(t.words.cat.attempts).toBe(0);
    expect(t.words.bad).toBeUndefined();
  });
  it("lets a healed document build a session", () => {
    expect(() => buildSession(migrate({ version: 3, level: 4 }))).not.toThrow();
  });
  it("drops hostile log rows and repairs their items and level", () => {
    const s = heal({ log: [null, 7, [], { n: 1 }, { items: null }] });
    expect(s.log.length).toBe(2);
    expect(s.log[0]).toEqual({ n: 1, items: [], level: 0 });
    expect(s.log[1]).toEqual({ items: [], level: 0 });
    const t = heal({ log: [{ items: [null, { w: "at", r: "correct" }, 5] }] });
    expect(t.log[0].items).toEqual([{ w: "at", r: "correct" }]);
    expect(heal({ log: [{ level: "9" }] }).log[0].level).toBe(0);
    expect(heal({ log: [{ level: 4 }] }).log[0].level).toBe(4);
    expect(() => migrate({ log: [null] })).not.toThrow();
  });
  it("repairs a hostile version so the migration check cannot crash", () => {
    expect(() => migrate({ version: { toString: null } })).not.toThrow();
    const m = migrate({ version: { toString: null }, level: 2 });
    expect(m.version).toBe(5);
    expect(m.level).toBe(6);   // healed to no version, bumped 2 to 3 by v3, floored at old 3's new ground
  });
  it("repairs a hostile or fractional level so the engine cannot crash", () => {
    /* heal's own guard, probed directly: the migrate clamp's `|| 1` would
       mask a deleted guard from every end-to-end path (a G5 mutant survived
       exactly that way on 2026-08-15), so the guard is pinned where it acts —
       a hostile level reads as absent, a fractional one rounds. */
    expect(heal({ level: "abc" }).level).toBeUndefined();
    expect(heal({ level: {} }).level).toBeUndefined();
    expect(heal({ level: 3.7 }).level).toBe(4);
    expect(migrate({ version: 3, level: "abc" }).level).toBe(1);
    expect(migrate({ version: 3, level: {} }).level).toBe(1);
    expect(migrate({ version: 3, level: 3.7 }).level).toBe(11);  // heal rounds 3.7 to 4, and old 4's stage begins at new 11
    expect(() => buildSession(migrate({ version: 3, level: 3.7 }))).not.toThrow();
    expect(() => buildMarkdown(migrate({ version: 3, level: "abc" }))).not.toThrow();
  });
});

describe("migrate", () => {
  const v2 = () => ({ version: 2, level: 3, sessionsCompleted: 9,
    settings: { mode: "parent", sound: true, childName: "", lang: "en-US" },
    words: { cat: { box: 5, attempts: 9, correct: 8, close: 1, wrong: 0, dueAt: 20, lastSession: 8 } },
    log: [{ n: 1, level: 1, c: 18, k: 1, w: 1, acc: 90, items: [], partial: false }] });

  it("runs the whole chain: the log shifts, the level recomputes from the words, mode leaves", () => {
    /* v3 bumps the level and the log; v4 (the 10-and-10 curriculum,
       2026-08-15) recomputes from the child's own words AND floors the result
       at the stored level's mapped ground — one mastered word secures no
       level, but this child already held old Level 4 (after the v3 bump),
       whose short-e-and-u stage begins at new Level 11. A migration never
       seats a child below a level they had earned (build reviewer's finding).
       The log keeps its bumped number: it recorded what was true when
       written. v4 also drops settings.mode, the microphone-era leftover (J2). */
    const m = migrate(v2());
    expect(m.version).toBe(5); expect(m.level).toBe(11); expect(m.log[0].level).toBe(2);
    expect(m.settings.mode).toBeUndefined();
  });
  it("leaves word data untouched", () => {
    const before = JSON.stringify(v2().words);
    expect(JSON.stringify(migrate(v2()).words)).toBe(before);
  });
  it("is idempotent", () => {
    const once = migrate(v2()); const twice = migrate(clone(once));
    expect(twice).toEqual(once);
  });
  it("recomputes any pre-v4 level from the words, and clamps a v4 one", () => {
    /* A stored pre-v4 index maps to where its old stage now begins and the
       child keeps the higher of that floor and the box recompute: old 6 (the
       v2 fixture's 6 becomes 7 after the v3 bump) opens at new 16; a wild 99
       clamps to old 11 first and lands at 20; -5 clamps to old 1. A v4
       save's own out-of-range value takes the plain clamp. */
    expect(migrate({ ...v2(), level: 6 }).level).toBe(16);
    expect(migrate({ version: 3, level: 99 }).level).toBe(20);
    expect(migrate({ version: 3, level: -5 }).level).toBe(1);
    expect(migrate({ version: 4, level: 99 }).level).toBe(21);
    /* The half-level save: heal() rounds any fractional level BEFORE the
       clamp ("a fractional one is rounded"), so 20.5 lands on 21 by design.
       Pinned the night property P10's own stale 20-bound flagged it and an
       agent nearly "fixed" the engine instead of the property (E4 literals). */
    expect(migrate({ version: 4, level: 20.5 }).level).toBe(21);
    expect(migrate({ version: 4, level: 20.4 }).level).toBe(20);
    expect(migrate({ version: 4, level: -5 }).level).toBe(1);
  });
  it("computes the v4 level at the same boundary promotion uses", () => {
    /* 12 of Level 1's 14 words secure it (80 per cent or more); 11 do not.
       Mastering the first two levels' words exactly answers 3. Literals (E4). */
    const eleven = { version: 3, words: {} };
    LEVELS[0].words.slice(0, 11).forEach((w) => { eleven.words[w] = { box: 3, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }; });
    expect(migrate(eleven).level).toBe(1);
    const twelve = { version: 3, words: {} };
    LEVELS[0].words.slice(0, 12).forEach((w) => { twelve.words[w] = { box: 3, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }; });
    expect(migrate(twelve).level).toBe(2);
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

/* ---------------- the sentences (SPEC section 12) ---------------- */
describe("sentences", () => {
  const all = () => Object.entries(SENTENCES).flatMap(([lvl, list]) => list.map((s) => ({ ...s, level: Number(lvl) })));

  it("gives all twenty-one levels a list, and names no level that does not exist", () => {
    expect(Object.keys(SENTENCES).map(Number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    expect(all().length).toBe(210);
    /* A level with no sentence is a level where the whole feature is invisible,
       and nothing else here would say so — every other assertion in this file
       is about the sentences that ARE listed. */
    for (const l of LEVELS) expect(SENTENCES[l.n].length).toBeGreaterThan(0);
    expect(Object.values(SENTENCES).map((v) => v.length)).toEqual([6, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 10, 10, 10, 10, 12]);
  });

  /* THE ARBITER, RE-RUN. The lists were generated by tools/decodable.mjs and
     this asserts the same tool still agrees with every seat — so a bank change
     that moves a word out from under a sentence goes red here rather than in
     front of a child. Never levelled by hand, and never checked by eye. */
  it("places every sentence where a child can actually read it", () => {
    for (const s of all()) {
      const r = decodableCheck(s.text, s.level);
      expect({ id: s.id, problems: r.problems }).toEqual({ id: s.id, problems: [] });
    }
  });

  it("places no sentence later than it needs to be", () => {
    /* The other half: decodable refuses a sentence that arrives EARLY, and
       nothing refuses one that arrives late. A Level 2 sentence parked at
       Level 9 passes every check above and is practice a child waited seven
       levels for. So each one must fail at the level below its own. */
    for (const s of all()) {
      if (s.level === 1) continue;
      expect({ id: s.id, ok: decodableCheck(s.text, s.level - 1).problems.length === 0 })
        .toEqual({ id: s.id, ok: false });
    }
  });

  it("gives every sentence a word the level teaches, for the reveal to sound out", () => {
    for (const s of all()) {
      const w = revealWord(s.text, s.level);
      expect({ id: s.id, hasWord: typeof w === "string" }).toEqual({ id: s.id, hasWord: true });
      expect({ id: s.id, taught: LEVELS[s.level - 1].words.includes(w) }).toEqual({ id: s.id, taught: true });
    }
    /* Literal, not derived (E4), and the FIRST such word rather than any:
       a child meeting a sentence twice must be taught the same word by it. */
    expect(revealWord("The cat sat on the mat.", 2)).toBe("cat");
    expect(revealWord("The king can sing.", 16)).toBe("king");
    expect(revealWord("My twin can swim fast.", 20)).toBe("twin");
    /* Control: a level that teaches nothing in the sentence gets null, not a
       guess. "The king can sing." holds no Level 8 word at all — "the" sits
       at 1, "can" at 2, "king" and "sing" at 16. */
    expect(revealWord("The king can sing.", 8)).toBe(null);
  });

  it("holds every sentence to one breath and one clip", () => {
    for (const s of all()) {
      expect({ id: s.id, words: sentenceWords(s.text).length <= 8 }).toEqual({ id: s.id, words: true });
      expect(s.id.startsWith("s:")).toBe(true);
    }
    const ids = all().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const script = voiceScript();
    for (const s of all()) {
      const clip = script.find((c) => c.id === s.id);
      expect({ id: s.id, inScript: Boolean(clip) }).toEqual({ id: s.id, inScript: true });
      expect(clip.text).toBe(s.text);
    }
  });

  it("counts the words a child sees, not the punctuation a writer left", () => {
    expect(sentenceWords("The cat sat on the mat.")).toEqual(["the", "cat", "sat", "on", "the", "mat"]);
    expect(sentenceWords("Is it an ox?")).toEqual(["is", "it", "an", "ox"]);
    expect(sentenceWords("Tag me!")).toEqual(["tag", "me"]);
    /* An apostrophe survives: "can't" is not "can" and is not taught. */
    expect(sentenceWords("The dog can't jump.")).toEqual(["the", "dog", "can't", "jump"]);
  });

  it("ships three invitation lines, each with a clip and its own words", () => {
    expect(REVEAL_LINES).toEqual(["s:soundout-1", "s:soundout-2", "s:soundout-3"]);
    const script = voiceScript();
    for (const id of REVEAL_LINES) {
      expect(typeof REVEAL_LINE_TEXT[id]).toBe("string");
      expect(script.find((c) => c.id === id).text).toBe(REVEAL_LINE_TEXT[id]);
    }
    expect(new Set(REVEAL_LINES.map((id) => REVEAL_LINE_TEXT[id])).size).toBe(3);
    /* S4: the invitation never says a letter name, and never reads the word
       the child is about to sound out. */
    for (const id of REVEAL_LINES) expect(REVEAL_LINE_TEXT[id]).toMatch(/^[A-Z][^]*[.!?]$/);
  });
});

/* ---------------- export ---------------- */
describe("buildMarkdown", () => {
  it("reports the 476-word denominator and twenty-one level rows", () => {
    const md = buildMarkdown(newState());
    expect(md).toContain("0/476");
    expect(md.match(/\*\*Level \d+ .+ \(/g).length).toBe(21);
  });
  it("counts a word as mastered only from box 4", () => {
    const three = seeded(["cat", "dog"], { box: 3, attempts: 2 });
    expect(buildMarkdown(three)).toContain("0/476");
    const four = seeded(["cat", "dog"], { box: 4, attempts: 2 });
    expect(buildMarkdown(four)).toContain("2/476");
  });
  it("keeps a grapheme-safe name intact in the header", () => {
    // lone surrogate = an unpaired HIGH surrogate, or a LOW surrogate with no high before it
    const LONE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    const raw = "N".repeat(19) + "\u{1F423}";
    // negative control: the old byte-wise truncation must trip the detector
    const naive = newState(); naive.settings.childName = raw.slice(0, 20);
    expect(LONE.test(buildMarkdown(naive))).toBe(true);
    // the shipped truncation must not
    const safe = newState(); safe.settings.childName = Array.from(raw).slice(0, 20).join("");
    expect(safe.settings.childName).toContain("\u{1F423}");
    expect(LONE.test(buildMarkdown(safe))).toBe(false);
  });
  it("marks a partial session", () => {
    const s = newState();
    s.log = [{ n: 1, date: "2026-07-25", level: 1, c: 5, k: 1, w: 0, acc: 83, items: [{ w: "at", r: "correct", retries: 0 }], partial: true }];
    expect(buildMarkdown(s)).toContain("partial");
  });
});

/* ---------------- voice packs (SPEC §5a) ---------------- */
describe("voice packs", () => {
  it("inventories one clip per word, the fixed sentences, and every sound a tile can ask for", () => {
    const script = voiceScript();
    /* 2026-08-19: both counts rose by two, and for two different reasons.
       WORDS 476 -> 478 because the owner ruled whole-word bends for `are`
       and `were`, and bankWords() names every word WORD_SOUND keys.
       SOUNDS 43 -> 45 because bending `were` to `er` and `are` to `ar`
       made the engine ASK for two sounds it had never asked for, which is
       what let ship-sounds.py move them out of the approved-and-unshipped
       backlog. Re-counted from the pack, never from voiceScript(). */
    expect(script.length).toBe(775);                       // 6 fixed + 17 praise + 491 words + 210 sentences + 3 invitations + "Pronounced:" + 47 sounds - 2026-08-20 evening: the four ough hearts (rough tough enough cough) joined the bank by their uf/off bends, and the engine asks for those two cluster sounds
    expect(script.filter((c) => c.id.startsWith("w:")).length).toBe(491);
    expect(script.filter((c) => c.id.startsWith("d:")).length).toBe(47);
    expect(new Set(script.map((c) => c.id)).size).toBe(775);
    expect(script.find((c) => c.id === "s:was").text).toBe("The word was");
    expect(script.find((c) => c.id === "l:wrong").text).toBe("Let’s try again.");
    expect(script.find((c) => c.id === "p:0").text).toBe("Great job!");
    expect(script.find((c) => c.id === "w:cat")).toEqual({ id: "w:cat", text: "cat" });
    expect(script.find((c) => c.id === "s:pronounced").text).toBe("Pronounced:");
    /* S4 — a sound's text says what the sound IS. Never a file name, and
       never the letter, which would invite the letter name. */
    expect(script.find((c) => c.id === "d:th_quiet").text).toBe("the quiet sound at the start of thin");
    expect(script.find((c) => c.id === "d:th_this").text).toBe("the buzzy sound at the start of this");
    expect(script.find((c) => c.id === "d:short_a").text).toBe("the sound in the middle of cat");
    expect(script.filter((c) => c.id.startsWith("d:") && !c.text.startsWith("the ")).length).toBe(0);
  });

  /* Every tile the bank can draw has a sound behind it. A grapheme with no
     clip does not fail loudly — resolvePack simply returns null and the whole
     reveal drops to system speech — so the inventory is asserted against the
     bank itself rather than against the map that feeds it. */
  it("covers every grapheme the whole bank can produce", () => {
    const graphemes = new Set();
    for (const l of LEVELS) for (const w of l.words) for (const g of chunkWord(w)) graphemes.add(g);
    expect(graphemes.size).toBe(44);
    /* B1, owner-ruled 2026-08-12: the ROSTER is pinned, not just its size.
       `soundIdFor` is `"d:" + (TILE_SOUND[g] || g)`, so a grapheme nobody has
       ruled on still returns a valid clip id, resolvePack still resolves, every
       gate still passes, and a child is still taught something. That is exactly
       how th played the wrong sound for months. A count alone does not catch it
       either: swap one grapheme for another and the size is unchanged.

       So both halves are literal. The sixteen in TILE_SOUND are decisions
       somebody made. The twenty-three on the fallback are correct — swept
       against the whole bank on 2026-08-11 and put to an adversarial verifier —
       but correct by luck of the naming rather than by a recorded ruling, and
       they are listed here so that ADDING a grapheme fails this test until a
       person puts it in one list or the other, which is the moment the decision
       gets made. */
    expect([...graphemes].sort()).toEqual(
      ["a", "ai", "b", "c", "ch", "ck", "d", "e", "ere", "ey", "f", "ff", "g", "h", "i", "j", "k", "kn", "l",
       "ll", "m", "mb", "n", "ng", "o", "or", "ou", "p", "qu", "r", "s", "sh", "ss", "t", "th", "u",
       "v", "w", "wh", "wr", "x", "y", "z", "zz"]);
    const named = [...graphemes].filter((g) => soundIdFor(g) !== "d:" + g).sort();
    const fallback = [...graphemes].filter((g) => soundIdFor(g) === "d:" + g).sort();
    /* "ai" and "ou" moved to the NAMED side on 2026-08-19: "The levels'
       teaching becomes the default" (owner, decades-and-rulings page). The
       2026-08-12 ruling that neither had a default was made when no level
       taught either; level 58 now teaches ai as long a and level 77 teaches
       ou as the /ow/ of out. said and you keep their per-word bends, proved
       below. Both literals re-derived by hand from the ruling, not read off
       TILE_SOUND (E4). */
    expect(named).toEqual(
      ["a", "ai", "c", "ck", "e", "ff", "i", "kn", "ll", "mb", "o", "ou", "ss", "th", "u", "wh", "wr", "zz"]);
    expect(fallback).toEqual(
      ["b", "ch", "d", "ere", "ey", "f", "g", "h", "j", "k", "l", "m", "n", "ng", "or", "p", "qu", "r", "s",
       "sh", "t", "v", "w", "x", "y", "z"]);
    const inv = new Set(soundInventory());
    /* Every grapheme's DEFAULT sound must exist — except the two that have no
       ruled default and are only ever used bent. Naming them here rather than
       loosening the loop keeps the exception countable, and the test above
       ("no word uses ai or ou without a decided sound") is what makes the
       exception safe: the moment a word uses one unbent, that test fails. */
    const NO_DEFAULT_YET = ["ey", "ere"];   // ai and ou ruled 2026-08-19; or ships its true default
    for (const g of graphemes) {
      if (NO_DEFAULT_YET.includes(g)) { expect(inv.has(soundIdFor(g))).toBe(false); continue; }
      expect(inv.has(soundIdFor(g))).toBe(true);
    }
    for (const w of bankWords()) {
      expect(soundIdsFor(w).length).toBe(chunkWord(w).length);   // S8 — one tile, one sound
      for (const id of soundIdsFor(w)) expect(inv.has(id)).toBe(true);
    }
  });
  it("the plural s splits by voicing: dogs buzzes, cats hisses (Level 21's lesson)", () => {
    /* All literals (E4). The eight voiced plurals bend their last tile to
       d:z; the six voiceless keep d:s. Without the bend a child sounding out
       "dogs" hears d-o-g-sss, a word nobody says. */
    expect(soundIdsFor("dogs")).toEqual(["d:d", "d:short_o", "d:g", "d:z"]);
    expect(soundIdsFor("hens")).toEqual(["d:h", "d:short_e", "d:n", "d:z"]);
    expect(soundIdsFor("beds")).toEqual(["d:b", "d:short_e", "d:d", "d:z"]);
    expect(soundIdsFor("cats")).toEqual(["d:k", "d:short_a", "d:t", "d:s"]);
    expect(soundIdsFor("cups")).toEqual(["d:k", "d:short_u", "d:p", "d:s"]);
    for (const w of ["hens", "pigs", "bugs", "pens", "kids", "dogs", "beds", "lids"])
      expect(soundIdsFor(w).at(-1)).toBe("d:z");
    for (const w of ["cats", "hats", "pots", "maps", "cups", "tops"])
      expect(soundIdsFor(w).at(-1)).toBe("d:s");
  });

  /* B9: the inventory is derived from every word the app NAMES, not from the
     levels alone. It walked LEVELS until 2026-08-12 and was correct only by
     coincidence — every tricky word and every bent-sound word also happened to
     sit in a level. A word named anywhere else would have had no sound clip
     and no word clip, and its reveal alone would have dropped to system
     speech. The heart-word roster (SPEC section 12) is the next thing that
     will name words this way and must not be the thing that finds it. */
  it("bankWords covers every word the app names, not only the levels", () => {
    const words = bankWords();
    /* 478, not 476: `are` and `were` are named ONLY in WORD_SOUND, never
       in a level. inLevels stays 476 below, and that gap is now the whole
       point of this test rather than a coincidence it records. */
    expect(words.length).toBe(491);
    expect([...new Set(words)].length).toBe(words.length);       // no duplicates
    expect([...words].sort()).toEqual(words);                    // stable order
    const inLevels = new Set();
    for (const l of LEVELS) for (const w of l.words) inLevels.add(w);
    for (const w of words) expect(typeof w).toBe("string");
    /* The three sources, each pinned. TRICKY and WORD_SOUND are keyed BY WORD,
       so they are the other two places a word can be named. */
    for (const w of Object.keys(TRICKY)) expect(words.includes(w)).toBe(true);
    for (const w of Object.keys(WORD_SOUND)) expect(words.includes(w)).toBe(true);
    for (const w of inLevels) expect(words.includes(w)).toBe(true);
    /* They no longer coincide, and THAT is the point. Until 2026-08-19 all
       three sets were identical, which is exactly what made the old
       LEVELS-only derivation look correct. `are` and `were` are the first
       two words the app names without seating them in a level. */
    expect(inLevels.size).toBe(476);
    expect(words.length - inLevels.size).toBe(15);  // are were as dough though through rough tough enough cough month into find old hold - named outside the levels

    /* Negative control. The old LEVELS-only derivation, run over a fixture
       where a word is named ONLY in a tricky note, must miss it — and the
       union must not. Without this the test above passes on any derivation
       that happens to cover today's data. */
    const fixtureLevels = [{ words: ["cat", "sun"] }];
    const fixtureTricky = { said: "Tricky word!" };
    const oldWay = new Set(fixtureLevels.flatMap((l) => l.words));
    const newWay = new Set([...oldWay, ...Object.keys(fixtureTricky)]);
    expect(oldWay.has("said")).toBe(false);                      // the fault
    expect(newWay.has("said")).toBe(true);                       // the fix
  });

  /* The two units on the fallback with no ruled sound of their own. Every word
     that uses one MUST bend it per-word, or the sound-out asks for d:ai or
     d:ou — ids no clip exists for — and the whole reveal drops to system
     speech for that word alone, silently. This is the same shape as B9 and the
     same shape as th: a default nobody decided, producing audio anyway.
     The guard exists because the roster test above records "ai" and "ou" as
     deferred rather than decided, and a deferral with no guard is just a hole. */
  it("ai and ou say what their levels teach, and the heart words still bend", () => {
    /* Owner-ruled 2026-08-19: "The levels' teaching becomes the default" -
       ai says the long a level 58 teaches, ou the /ow/ of out level 77
       teaches. This SUPERSEDES the 2026-08-12 no-default ruling this test
       used to enforce, which was made when no level taught either unit. What
       must stay true forever: the two heart words that bend keep winning
       over the defaults, or "said" reads as "sayed" and "you" as "yow". */
    const inv = new Set(soundInventory());
    expect(soundIdFor("ai")).toBe("d:long_a");
    expect(soundIdFor("ou")).toBe("d:ow");
    expect(inv.has("d:long_a")).toBe(true);
    expect(inv.has("d:ow")).toBe(true);
    /* the bends win: literal expected values, spoken sound by sound */
    expect(soundIdsFor("said")).toEqual(["d:s", "d:short_e", "d:d"]);
    expect(soundIdsFor("you")).toEqual(["d:y", "d:oo_moon"]);
    /* Control: a word with NO bend gets the level's default - "rain" is not
       in the bank, has no WORD_SOUND row, and must sound out r / long a / n.
       Under the old ruling this exact call produced d:ai with no clip; that
       fault shape is what the supersession retires. */
    expect(chunkWord("rain")).toEqual(["r", "ai", "n"]);
    expect(soundIdsFor("rain")).toEqual(["d:r", "d:long_a", "d:n"]);
    expect(soundIdsFor("rain").every((id) => inv.has(id))).toBe(true);
  });

  /* Owner-ruled 2026-08-06, docs/settled.md: "the bent letter plays its TRUE
     sound... No tricky-word exemption." A tricky word whose sound-out spells
     out the letters it does not say teaches the opposite of the note printed
     beside it. */
  it("gives every tricky word its true sounds, not its letters", () => {
    expect(soundIdsFor("she")).toEqual(["d:sh", "d:long_e"]);
    expect(soundIdsFor("the")).toEqual(["d:th_this", "d:schwa"]);
    expect(soundIdsFor("push")).toEqual(["d:p", "d:oo_book", "d:sh"]);
    expect(soundIdsFor("bush")).toEqual(["d:b", "d:oo_book", "d:sh"]);
    expect(soundIdsFor("was")).toEqual(["d:w", "d:short_u", "d:z"]);
    /* "wut", owner-ruled 2026-08-12, reversing their own ruling of the same
       morning. The first was made from the WORD clip alone; offered the whole
       sound-out both ways they refused w-o-t. tools/sound_agreement.py had
       flagged it: every phonemisation says /wʌt/, including the carrier this
       clip was cut from. */
    expect(soundIdsFor("what")).toEqual(["d:w", "d:short_u", "d:t"]);
    expect(soundIdsFor("wash")).toEqual(["d:w", "d:short_o", "d:sh"]);
    expect(soundIdsFor("is")).toEqual(["d:short_i", "d:z"]);
    expect(soundIdsFor("has")).toEqual(["d:h", "d:short_a", "d:z"]);
    /* Control: the override is per WORD, so the same letters elsewhere keep
       the sound they really make. */
    expect(soundIdsFor("cash")).toEqual(["d:k", "d:short_a", "d:sh"]);
    expect(soundIdsFor("hat")).toEqual(["d:h", "d:short_a", "d:t"]);
  });

  /* THE HEART WORDS, sound by sound. Eight words a child meets at Level 2 —
     seven of them because their letters lie, which is why they are taught by
     sight — and until now nothing in the suite said what any of them sounds
     out to. Every id below was heard and graded by the owner: the six on
     2026-08-12 in the heart-word round, and "of" in three rounds of its own the
     same day. Left to the general mapping these would teach a short o in "to"
     and "do", four sounds in "said", three in "you" and /ɒf/ in "of" — the
     "default sound" class of fault (open-faults section B), which passes every
     other gate because each wrong id is a clip that exists. */
  it("sounds out every heart word the way the owner heard it", () => {
    expect(soundIdsFor("to")).toEqual(["d:t", "d:oo_moon"]);
    expect(soundIdsFor("do")).toEqual(["d:d", "d:oo_moon"]);
    expect(soundIdsFor("you")).toEqual(["d:y", "d:oo_moon"]);
    expect(soundIdsFor("said")).toEqual(["d:s", "d:short_e", "d:d"]);
    expect(soundIdsFor("my")).toEqual(["d:m", "d:long_i"]);
    /* "of" alone takes the softened v (owner-ruled 2026-08-12). The other four
       /v/ words keep the clip graded perfect for them in SND16 — asserted here
       because the first ship replaced d:v for the whole bank and nothing in
       the suite would have noticed. */
    expect(soundIdsFor("of")).toEqual(["d:short_u", "d:v_soft"]);
    for (const w of ["van", "vet", "vat", "vex"]) expect(soundIdsFor(w)[0]).toBe("d:v");
    expect(soundIdsFor("the")).toEqual(["d:th_this", "d:schwa"]);
    expect(soundIdsFor("and")).toEqual(["d:short_a", "d:n", "d:d"]);
    /* One tile, one sound (S8): "you" is y + ou and "said" is s + ai + d, so
       the counts are two and three, not three and four. */
    expect(chunkWord("you")).toEqual(["y", "ou"]);
    expect(chunkWord("said")).toEqual(["s", "ai", "d"]);
    expect(chunkWord("of")).toEqual(["o", "f"]);
    /* Control: the bend is per WORD. The same letters elsewhere in the bank
       keep their ordinary sounds, so this test cannot pass by a mapping that
       simply bent o to oo or f to v everywhere. */
    expect(soundIdsFor("dog")).toEqual(["d:d", "d:short_o", "d:g"]);
    expect(soundIdsFor("fox")).toEqual(["d:f", "d:short_o", "d:x"]);
  });

  /* "th" spells TWO sounds, and until 2026-08-11 the tile map sent both to
     th_quiet — the voiceless th of "thin". Six bank words take the voiced one
     and were sounded out wrongly: a child reading "the" heard "th(in)-uh".
     Nothing failed, because th_quiet is a clip that exists, which is why this
     is asserted word by word over the WHOLE bank rather than spot-checked. */
  it("splits th into its two sounds, across every th word in the bank", () => {
    for (const w of ["this", "that", "then", "them", "the"])
      expect(soundIdsFor(w)[0]).toBe("d:th_this");
    /* "with" is the one word where the accents disagree — /wɪð/ in British,
       /wɪθ/ in most American. It was reasoned onto the quiet th on 2026-08-11
       under the ruling for AMERICAN pronunciation. The reasoning was sound and
       the answer was wrong: the af_heart clip this game actually ships says
       /wɪð/, and the owner chose the buzzy th on 2026-08-12 after hearing both
       sound-outs. An accent argued from is not the accent in the file. */
    expect(soundIdsFor("with")).toEqual(["d:w", "d:short_i", "d:th_this"]);

    for (const w of ["thin", "thick", "thumb", "thud"])
      expect(soundIdsFor(w)[0]).toBe("d:th_quiet");
    for (const w of ["bath", "math", "path", "moth"])
      expect(soundIdsFor(w).at(-1)).toBe("d:th_quiet");

    /* No th word in the bank is left unaccounted for, so a word added later
       cannot quietly inherit the wrong one. */
    const thWords = LEVELS.flatMap((l) => l.words).filter((w) => w.includes("th"));
    expect(thWords.length).toBe(17);
    const voiced = thWords.filter((w) => soundIdsFor(w).includes("d:th_this"));
    expect(voiced.sort()).toEqual(["that", "the", "them", "then", "there", "they", "this", "with"]);
    const quiet = thWords.filter((w) => soundIdsFor(w).includes("d:th_quiet"));
    expect(quiet.sort()).toEqual(["bath", "math", "moth", "path", "thick", "thin", "think", "thud", "thumb"]);
  });
  /* The sound-out reveal, owner-ruled 2026-08-04 and recorded in
     docs/settled.md: praise, the word, "Pronounced:", each sound on its own
     tile's moment, the word again — on EVERY reveal outcome. The order here
     is the choreography: tileSlots reads the tile pops straight off it. */
  it("plans the sound-out reveal on every outcome, at the literal 500 ms seam", () => {
    expect(SEAM_MS).toBe(700);
    expect(SOUNDOUT_SEAM_MS).toBe(500);
    expect(clipPlan("correct", "cat", 3)).toEqual(
      ["p:3", "seam2", "w:cat", "seam2", "s:pronounced",
        "seam2", "d:k", "seam2", "d:short_a", "seam2", "d:t", "seam2", "w:cat"]);
    expect(clipPlan("correct", "cat", 42)[0]).toBe("p:0");   // an index off the end falls to the first line
    expect(clipPlan("close", "ship")).toEqual(
      ["l:close", "seam2", "w:ship", "seam2", "s:pronounced",
        "seam2", "d:sh", "seam2", "d:short_i", "seam2", "d:p", "seam2", "w:ship"]);
    expect(clipPlan("wrong", "sun")).toEqual(
      ["l:wrong", "seam2", "w:sun", "seam2", "s:pronounced",
        "seam2", "d:s", "seam2", "d:short_u", "seam2", "d:n", "seam2", "w:sun"]);
    /* S8 — a digraph is one tile, so it takes one sound and one pop. */
    expect(clipPlan("correct", "rock", 0).filter((id) => id.startsWith("d:")))
      .toEqual(["d:r", "d:short_o", "d:k"]);
    expect(clipPlan("replay", "cat")).toEqual(["w:cat"]);
    expect(clipPlan("levelup")).toEqual(["e:levelup"]);
    expect(clipPlan("done")).toEqual(["e:done"]);
  });

  /* A seam is a pause, not a clip. Reading "seam2" as a clip id made every
     sound-out resolve to no pack at all and fall silently to system speech,
     with the whole approved voice sitting unused on disk. */
  it("knows a seam from a clip, and how long each one lasts", () => {
    expect(isSeam("seam")).toBe(true);
    expect(isSeam("seam2")).toBe(true);
    expect(isSeam("w:cat")).toBe(false);
    expect(isSeam("d:k")).toBe(false);
    expect(seamMs("seam")).toBe(700);
    expect(seamMs("seam2")).toBe(500);
    expect(resolvePack(clipPlan("correct", "cat", 0), () => true)).toBe("family");
  });

  /* Which entries of the plan are tile sounds, and which tile each belongs
     to. The player reports the scheduled time of each, so a tile lights the
     moment ITS sound starts rather than on a guessed delay. */
  it("maps each tile sound to its own tile, in order", () => {
    expect(tileSlots(clipPlan("correct", "cat", 0)))
      .toEqual([{ index: 6, tile: 0 }, { index: 8, tile: 1 }, { index: 10, tile: 2 }]);
    expect(tileSlots(clipPlan("correct", "rock", 0)))
      .toEqual([{ index: 6, tile: 0 }, { index: 8, tile: 1 }, { index: 10, tile: 2 }]);
    expect(tileSlots(clipPlan("correct", "she", 0)))
      .toEqual([{ index: 6, tile: 0 }, { index: 8, tile: 1 }]);
    expect(tileSlots(clipPlan("replay", "cat"))).toEqual([]);   // no sound-out, no pops
    expect(tileSlots(clipPlan("done"))).toEqual([]);
  });
  it("resolves one source per utterance: family, then default, then none", () => {
    const plan = ["l:close", "seam", "s:is", "seam", "w:ship"];
    expect(resolvePack(plan, () => true)).toBe("family");
    expect(resolvePack(plan, (t) => t === "default")).toBe("default");
    expect(resolvePack(plan, (t, id) => t === "default" || id !== "w:ship")).toBe("default"); // family lacks one clip
    expect(resolvePack(plan, () => false)).toBe(null);
  });
});

/* ---------------- speech output (S4) ---------------- */
describe("speech helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("says full words only, never letter names, and never stretches the reveal", () => {
    expect(feedbackSpeech("correct", "cat")).toEqual([
      { text: "Great job!", rate: 0.9 },
      { text: "The word was cat.", rate: 0.9 },
    ]);
    expect(feedbackSpeech("close", "ship")).toEqual([
      { text: "Good try!", rate: 0.9 },
      { text: "The word is ship.", rate: 0.9 },
    ]);
    expect(feedbackSpeech("wrong", "sun")).toEqual([
      { text: "Let’s try again.", rate: 0.9 },
      { text: "The word is sun.", rate: 0.9 },
    ]);
  });
  /* S4, on the one word where the fallback would break it. Every clip in this
     game is recorded; system speech is reached only when the pack fails to
     load. Handed the string "a", every system voice says the letter's NAME —
     the one thing this app must never say to a child being taught that letters
     make sounds. Caught by the copy gate the moment "a" entered the bank. */
  it("hands system speech the SOUND of “a”, never the letter's name", () => {
    expect(feedbackSpeech("correct", "a")).toEqual([
      { text: "Great job!", rate: 0.9 },
      { text: "The word was uh.", rate: 0.9 },
    ]);
    expect(feedbackSpeech("close", "a")[1].text).toBe("The word is uh.");
    expect(feedbackSpeech("wrong", "a")[1].text).toBe("The word is uh.");
    /* Control: the substitution is for this word alone. Every other word is
       spoken as itself, so this cannot pass by mangling the whole bank. */
    expect(feedbackSpeech("close", "cat")[1].text).toBe("The word is cat.");
    expect(feedbackSpeech("close", "at")[1].text).toBe("The word is at.");
    /* And the sweep the copy gate does, asserted here too: no bank word's
       spoken feedback contains a bare single letter, in any of the three
       results. */
    const bareLetter = /(^| )[a-z]([ .,!?]|$)/;
    for (const w of bankWords())
      for (const r of ["correct", "close", "wrong"])
        expect(bareLetter.test(feedbackSpeech(r, w).map((x) => x.text).join(" "))).toBe(false);
  });
  it("stays silent when sound is off or no engine exists", () => {
    expect(() => speak("cat", false, "en-US")).not.toThrow();
    vi.stubGlobal("window", {});
    expect(() => speak("cat", true, "en-US")).not.toThrow();
  });
  it("configures the utterance: rate 0.9, pitch 1.1, locale, cancel first", () => {
    const calls = [];
    const cancel = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { cancel, speak: (u) => calls.push(u) } });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(t) { this.text = t; } });
    speak("Great job! cat!", true, "en-GB");
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(calls.length).toBe(1);
    expect(calls[0].text).toBe("Great job! cat!");
    expect(calls[0].rate).toBe(0.9);
    expect(calls[0].pitch).toBe(1.1);
    expect(calls[0].lang).toBe("en-GB");
  });
  it("pins the seventeen praise sentences, character for character", () => {
    expect(PRAISE).toEqual([
      "Great job!",
      "You did it!",
      "You knew just what to do with that word!",
      "How do you feel about saying that word correctly?",
      "You worked that out on your own!",
      "Your reading is getting stronger every day!",
      "You should feel proud of that one!",
      "That was tricky, and you got it!",
      "You sounded that one out beautifully!",
      "What careful reading that was!",
      "Sound by sound, you built the whole word!",
      "You took your time and got it just right!",
      "That word had no chance against you!",
      "You stuck with it, and it paid off!",
      "You made that look easy!",
      "High five! You earned that one!",
      "Every sound in its place — wonderful!",
    ]);
  });
  it("selects the praise by index, and falls back to the first for a bad index", () => {
    expect(feedbackSpeech("correct", "cat", 3)[0].text).toBe("How do you feel about saying that word correctly?");
    expect(feedbackSpeech("correct", "cat", 9)[0].text).toBe("What careful reading that was!");
    expect(feedbackSpeech("correct", "cat", 42)[0].text).toBe("Great job!");
    expect(feedbackSpeech("correct", "cat")[0].text).toBe("Great job!");
  });
  it("queues reveal parts: one cancel, and both the lead and the word sentence at 0.9", () => {
    const calls = [];
    const cancel = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { cancel, speak: (u) => calls.push(u) } });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(t) { this.text = t; } });
    speak(feedbackSpeech("correct", "on"), true, "en-GB");
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(calls.length).toBe(2);
    expect(calls[0].text).toBe("Great job!");
    expect(calls[0].rate).toBe(0.9);
    expect(calls[1].text).toBe("The word was on.");
    expect(calls[1].rate).toBe(0.9);
    expect(calls[1].pitch).toBe(1.1);
    expect(calls[1].lang).toBe("en-GB");
  });
  it("survives a throwing speech service", () => {
    vi.stubGlobal("window", { speechSynthesis: { cancel: () => { throw new Error("boom"); }, speak: () => {} } });
    expect(() => speak("cat", true, "en-US")).not.toThrow();
    expect(() => hush()).not.toThrow();
  });
  it("hush stops speech, and survives a missing engine", () => {
    const cancel = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { cancel, speak: () => {} } });
    hush();
    expect(cancel).toHaveBeenCalledTimes(1);
    vi.stubGlobal("window", {});
    expect(() => hush()).not.toThrow();
    expect(() => speak(null, true, "en-US")).not.toThrow();
  });
  it("vibrates only when the device can, and never throws", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    buzz(28);
    expect(vibrate).toHaveBeenCalledWith(28);
    vi.stubGlobal("navigator", {});
    expect(() => buzz(28)).not.toThrow();
    vi.stubGlobal("navigator", { vibrate: () => { throw new Error("boom"); } });
    expect(() => buzz(28)).not.toThrow();
  });
});

/* ---------------- reference storage adapter ---------------- */
describe("reference storage adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads nothing when no storage exists at all", async () => {
    expect(await loadState()).toBe(null);
  });
  it("reads a saved document from the host storage", async () => {
    const get = vi.fn(async () => ({ value: '{"version":3,"level":2}' }));
    vi.stubGlobal("window", { storage: { get, set: vi.fn() } });
    expect(await loadState()).toEqual({ version: 3, level: 2 });
    expect(get).toHaveBeenCalledWith("wordquest:progress:v2");
  });
  it("keeps a copy of damaged data and reports it, even if the copy write fails", async () => {
    const set = vi.fn(async () => {});
    vi.stubGlobal("window", { storage: { get: async () => ({ value: "{broken" }), set } });
    expect(await loadState()).toEqual({ __corrupt: true });
    expect(set).toHaveBeenCalledWith("wordquest:progress:v2:corrupt", "{broken");
    vi.stubGlobal("window", { storage: { get: async () => ({ value: "{broken" }), set: async () => { throw new Error("full"); } } });
    expect(await loadState()).toEqual({ __corrupt: true });
  });
  it("saves to the host and answers from memory when the host disappears", async () => {
    const set = vi.fn(async () => {});
    vi.stubGlobal("window", { storage: { get: async () => null, set } });
    expect(await saveState({ version: 3, level: 4 })).toBe(true);
    expect(set).toHaveBeenCalledWith("wordquest:progress:v2", '{"version":3,"level":4}');
    expect(await loadState()).toEqual({ version: 3, level: 4 }); // host empty -> memory
    vi.unstubAllGlobals();
    expect(await loadState()).toEqual({ version: 3, level: 4 }); // no host -> memory
  });
  it("reports an unsaved visit when the host write fails", async () => {
    vi.stubGlobal("window", { storage: { get: async () => null, set: async () => { throw new Error("denied"); } } });
    expect(await saveState({ version: 3, level: 5 })).toBe(false);
  });
  it("falls back to memory when the host read throws", async () => {
    vi.stubGlobal("window", { storage: { get: async () => { throw new Error("locked"); }, set: async () => {} } });
    expect(await loadState()).toEqual({ version: 3, level: 5 }); // memory kept the last save
  });
});

/* ---------------- homophones ---------------- */
/* Two describes lived here and retired with the microphone on 2026-08-12.
   "ASR tolerance list" held HOMOPHONES, a 31-word near-miss table read by
   nothing but the transcript matcher. "ADULT_JUDGED" held the five words a
   recogniser could not judge fairly and the adult note that said so; SPEC
   section 6 had already ruled that note absent wherever the adult judges every
   word, which is now every word. Neither constant exists. */
describe("G1 — the system voice is never given a word it says wrongly", () => {
  it("75: no praise line contains a word with two pronunciations", () => {
    /* "You read that word all by yourself!" said "reed" through the fallback
       voice — the fault beta.6 was published for. The owner replaced the
       line on 2026-08-03; this pins its successor and sweeps the whole list,
       with the same ambiguous-word roster the voice gate uses, so the fault
       class cannot return unnoticed. */
    expect(PRAISE[2]).toBe("You knew just what to do with that word!");
    const AMBIGUOUS = ["read", "live", "wind", "tear", "lead", "bow", "row", "close"];
    for (const line of PRAISE)
      for (const a of AMBIGUOUS)
        expect(new RegExp("\\b" + a + "\\b", "i").test(line)).toBe(false);
  });

  it("76: with no unsafe line listed, every praise index reaches the system voice unchanged", () => {
    expect(TTS_UNSAFE_PRAISE).toEqual([]);
    for (let i = 0; i < 17; i++) expect(ttsSafePraise(i)).toBe(i);
    expect(feedbackSpeech("correct", "cat", ttsSafePraise(2)).map((p) => p.text).join(" "))
      .toBe("You knew just what to do with that word! The word was cat.");
  });

  it("77: the clip plan carries the new line to the pack", () => {
    /* The pack renders from voiceScript, so this is the text the recorded
       voice will actually say. If TTS_UNSAFE_PRAISE ever gains an entry
       again, test 76 fails and forces the guard's remap to be re-pinned
       against the new truth — the mechanism stays for exactly that day. */
    const p2 = voiceScript().find((c) => c.id === "p:2");
    expect(p2.text).toBe("You knew just what to do with that word!");
  });

  /* THE SENTENCE'S PRAISE ROSTER (owner-ruled 2026-08-14, open-faults N).
     Pinned in BOTH halves, the way the grapheme fallback roster is (B1): a
     count alone would stay green while one safe line was swapped for a
     word-shaped one. */
  it("78: the sentence praise roster is exactly the rows that never say \"word\", both halves pinned", () => {
    expect(SENTENCE_PRAISE).toEqual([0, 1, 4, 5, 6, 7, 8, 9, 11, 13, 14, 15, 16]);
    /* The four excluded rows each say "word" — that is WHY they are out, and
       if a praise edit ever changes one, this fails until a person re-decides
       the roster rather than letting it drift. */
    for (const i of [2, 3, 10, 12]) expect(/\bword\b/i.test(PRAISE[i])).toBe(true);
    for (const i of SENTENCE_PRAISE) expect(/\bword\b/i.test(PRAISE[i])).toBe(false);
    /* Union check: every praise row is in exactly one half. */
    expect([...SENTENCE_PRAISE, 2, 3, 10, 12].sort((a, b) => a - b))
      .toEqual(Array.from({ length: 17 }, (_, i) => i));
  });

  it("79: the sentence lead is the grade's exact clip, and an off-roster index cannot praise with a word-line", () => {
    expect(sentenceLead("close")).toBe("l:close");
    expect(sentenceLead("wrong")).toBe("l:wrong");
    expect(sentenceLead("correct", 5)).toBe("p:5");
    expect(sentenceLead("correct", 16)).toBe("p:16");
    /* A caller handing in an excluded or absent index gets the roster's first
       entry, never the word-shaped line it asked for. */
    expect(sentenceLead("correct", 2)).toBe("p:0");
    expect(sentenceLead("correct", 99)).toBe("p:0");
    expect(sentenceLead("correct")).toBe("p:0");
  });
});

/* ---------------- Build-it: the tray (SPEC section 12) ----------------
   Owner-ruled 2026-08-17. Practice-only: nothing here writes to a record, and
   these tests exist to keep the tray honest, not to grade anything. */
describe("Build-it tray", () => {
  /* A held rand, so a shuffle can be checked rather than hoped at. */
  const held = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

  it("gives the word its true number of slots, never a padded one", () => {
    expect(buildTray("ship", 2, held(0)).slots).toBe(3);
    expect(buildTray("cat", 2, held(0)).slots).toBe(3);
    expect(buildTray("black", 20, held(0)).slots).toBe(4);
    expect(buildTray("a", 1, held(0)).slots).toBe(1);
  });

  it("ramps the extra tiles: none, then one from Level 6, then two past 14", () => {
    expect(trayExtras(1)).toBe(0);
    expect(trayExtras(5)).toBe(0);
    expect(trayExtras(6)).toBe(1);
    expect(trayExtras(14)).toBe(1);
    expect(trayExtras(15)).toBe(2);
    expect(trayExtras(21)).toBe(2);
  });

  it("always offers every tile the answer needs", () => {
    for (const [w, l] of [["ship", 2], ["ship", 8], ["black", 20], ["think", 19]]) {
      const t = buildTray(w, l, held(0.1, 0.6, 0.3, 0.9));
      for (const c of t.answer) expect(t.tiles).toContain(c);
      expect(t.tiles.length).toBe(t.slots + trayExtras(l));
    }
  });

  it("never offers a distractor that is one of the word's own tiles", () => {
    for (let i = 0; i < 20; i++) {
      const t = buildTray("ship", 21, held((i % 9) / 10, ((i + 3) % 9) / 10, 0.5));
      const extra = t.tiles.filter((c) => !t.answer.includes(c));
      expect(extra.length).toBe(2);
      expect(new Set(extra).size).toBe(2);
    }
  });

  /* The safety of the pool. Only four units are barred outright - the ones
     with no ruled default sound, which alone can say nothing true. Everything
     else is admitted and then guarded per word, because the danger is not a
     grapheme that bends somewhere else; it is two tiles in ONE tray that say
     the same thing. Owner-ruled 2026-08-17, after the first version banned
     every vowel and still allowed ck beside cat. */
  it("keeps units with no ruled default out of the pool", () => {
    const pool = trayPool(21);
    for (const unit of ["ai", "ou", "ey", "ere"]) expect(pool).not.toContain(unit);
  });

  it("keeps the vowels, so a child can be offered i against a", () => {
    const pool = trayPool(21);
    for (const v of ["a", "e", "i", "o", "u"]) expect(pool).toContain(v);
    expect(pool).toContain("s");            // says /s/ alone; his bends it, his is not this word
    expect(pool).toContain("th");
    expect(pool.length).toBe(40);
  });

  it("refuses a distractor that would sound exactly like one of the word's own tiles", () => {
    expect(trayClash("cat", "ck")).toBe(true);    // ck and cat's c both say /k/
    expect(trayClash("his", "z")).toBe(true);     // his bends s to /z/
    expect(trayClash("want", "o")).toBe(true);    // want bends a to short o
    expect(trayClash("ship", "h")).toBe(false);   // /h/ is not in ship
    expect(trayClash("cat", "o")).toBe(false);
    for (let i = 0; i < 12; i++) {
      const t = buildTray("cat", 21, () => (i % 7) / 7);
      for (const c of t.tiles.filter((x) => !t.answer.includes(x)))
        expect(trayClash("cat", c)).toBe(false);
    }
  });

  it("only draws graphemes a child at that level has met", () => {
    expect(trayPool(2)).toEqual(["a", "c", "d", "e", "f", "h", "i", "m", "n", "o",
      "p", "r", "s", "t", "th", "u", "w", "x", "y"]);
    expect(trayPool(2).length).toBe(19);
  });

  /* The two visual rulings of 2026-08-17 have engine-visible consequences and
     are pinned here, so a redesign that quietly drops them fails a test rather
     than only looking different: the SHAPE of a slot comes from the answer
     tile's letter count, and the help after two misses names the slot each
     sound belongs to, which needs the answer in position order. */
  it("gives every answer tile in the order the word is built", () => {
    expect(buildTray("ship", 2, held(0)).answer).toEqual(["sh", "i", "p"]);
    expect(buildTray("there", 19, held(0)).answer).toEqual(["th", "ere"]);
    expect(buildTray("black", 20, held(0)).answer).toEqual(["b", "l", "a", "ck"]);
  });

  /* The eleven words whose sounds repeat. The tray must offer a tile for EVERY
     slot, counting duplicates: the screen once held a letter in each slot and
     deduped by letter, so dad's second d could never be placed and the word
     could not be built at all. Found by an independent review, 2026-08-17. */
  it("offers a tile for every slot, even when a sound repeats", () => {
    for (const w of ["bib", "dad", "did", "mom", "nun", "pep", "pop", "pump", "pup", "tent", "tot"]) {
      const t = buildTray(w, 2, held(0.3));
      expect(t.answer.length).toBe(chunkWord(w).length);
      const pool = t.tiles.slice();
      for (const need of t.answer) {
        const at = pool.indexOf(need);
        expect(at).toBeGreaterThanOrEqual(0);   // a tile is consumed per slot, not per letter
        pool.splice(at, 1);
      }
    }
  });

  /* No tray may let a child SPELL a word the owner ruled out. Building "dog"
     with a b distractor spells gob, which SPEC says was removed from every file
     "so it cannot return by accident" - and the miss feedback prints and speaks
     what the child built. Found by an independent review, 2026-08-17. */
  it("refuses a distractor that would let a child spell a ruled-out word", () => {
    expect(trayForbidden(["d", "o", "g", "b"], 3)).toBe(true);    // gob
    expect(trayForbidden(["d", "o", "g", "m"], 3)).toBe(false);
    expect(trayForbidden(["m", "i", "l", "t"], 4)).toBe(true);    // milt (hunt came off the list 2026-08-17)
    /* The length rule: a forbidden word must FIT the slots. Four tiles cannot
       spell a three-sound word when all four must be placed. */
    expect(trayForbidden(["g", "o", "b", "d"], 4)).toBe(false);
    for (const r of [0.05, 0.3, 0.6, 0.9])
      for (const w of ["dog", "log", "big", "job", "melt", "milk"]) {
        const t = buildTray(w, 21, () => r);
        expect(trayForbidden(t.tiles, t.slots)).toBe(false);
      }
  });

  it("never offers a word whose own tiles spell a ruled-out one", () => {
    expect(buildable("sift")).toBe(false);      // an anagram of fist
    expect(buildable("dog")).toBe(true);
    expect(NEVER_BUILD).toContain("gob");
    expect(NEVER_BUILD).toContain("milt");
    expect(NEVER_BUILD.length).toBe(9);   // hunt came off the list 2026-08-17
  });

  it("is reproducible: the same rand builds the same tray", () => {
    const a = buildTray("ship", 8, held(0.42));
    const b = buildTray("ship", 8, held(0.42));
    expect(a.tiles).toEqual(b.tiles);
  });
});
