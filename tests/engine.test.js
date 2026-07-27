/* Word Quest — engine test suite.
   Run: npm test  (vitest). Regenerate the module first: node tools/extract-engine.mjs
   Every assertion uses literal expected values, never the constant under test. */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  LEVELS, DIGRAPHS, TRICKY, HOMOPHONES, INTERVALS, SESSION_SIZE, PROMPT_CAP, WORD_LEVEL,
  chunkWord, dashed, freshWordState, applyResult, buildSession, checkPromotion,
  heal, migrate, newState, buildMarkdown, loadState, saveState, speak, hush, buzz, feedbackSpeech, PRAISE,
  SEAM_MS, voiceScript, clipPlan, resolvePack,
  ADULT_JUDGED, adultNote,
} from "../src/engine.js";

const clone = (o) => JSON.parse(JSON.stringify(o));
const seeded = (words, patch) => { const s = newState(); words.forEach(w => { s.words[w] = { ...freshWordState(), ...patch }; }); return s; };

/* ---------------- bank ---------------- */
describe("word bank", () => {
  it("has 260 unique words across 7 levels", () => {
    const all = LEVELS.flatMap(l => l.words);
    expect(all.length).toBe(260);
    expect(new Set(all).size).toBe(260);
    expect(LEVELS.map(l => l.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(LEVELS.map(l => l.words.length)).toEqual([12, 39, 42, 40, 44, 30, 53]);
  });
  it("starts with the 12-word VC level", () => {
    expect(LEVELS[0].words).toEqual(["at","an","am","ax","in","it","if","is","on","ox","up","us"]);
  });
  it("maps every word to its level", () => {
    expect(Object.keys(WORD_LEVEL).length).toBe(260);
    expect(WORD_LEVEL.at).toBe(1); expect(WORD_LEVEL.cat).toBe(2); expect(WORD_LEVEL.was).toBe(7);
    expect(WORD_LEVEL.has).toBe(2); expect(WORD_LEVEL.she).toBe(6); expect(WORD_LEVEL.the).toBe(7);
  });
  it("flags the nine tricky words", () => {
    expect(Object.keys(TRICKY).sort()).toEqual(["bush","has","is","push","she","the","was","wash","what"]);
  });
  it("keeps every word at 2 or 3 sound units and at most 4 letters", () => {
    for (const w of LEVELS.flatMap(l => l.words)) {
      expect(w.length).toBeLessThanOrEqual(4);
      expect([2, 3]).toContain(chunkWord(w).length);
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
    expect(DIGRAPHS).toEqual(["sh","ch","th","wh","ck","ng"]);
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
    const ws = { ...freshWordState(), box: 1, attempts: 2 }; applyResult(ws, "correct", 10);
    expect(ws.box).toBe(2); expect(ws.dueAt).toBe(12);   // literal: 10 + 2
  });
  it("caps the box at 5", () => {
    const ws = { ...freshWordState(), box: 5, attempts: 9 }; applyResult(ws, "correct", 10);
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
  it("uses the published interval ladder", () => {   // S2 — literals, not the constant
    expect(INTERVALS).toEqual([1, 1, 2, 4, 7, 12]);
    const due = [0,1,2,3,4,5].map(b => { const ws={...freshWordState(),box:b,attempts:2}; applyResult(ws,"close",100); return ws.dueAt; });
    expect(due).toEqual([101, 101, 102, 104, 107, 112]);
  });
});

/* ---------------- promotion (S3) ---------------- */
describe("checkPromotion", () => {
  it("promotes at exactly 80 percent on the 40-word level", () => {   // S3 — reachable boundary
    const at32 = seeded(LEVELS[3].words.slice(0, 32), { box: 3, attempts: 1 }); at32.level = 4;
    expect(checkPromotion(at32)).toBe(true); expect(at32.level).toBe(5);
    const at31 = seeded(LEVELS[3].words.slice(0, 31), { box: 3, attempts: 1 }); at31.level = 4;
    expect(checkPromotion(at31)).toBe(false); expect(at31.level).toBe(4);
  });
  it("uses box 3 as the solid threshold, not box 2", () => {   // S3 — kills the >= 2 mutant
    const box2 = seeded(LEVELS[0].words, { box: 2, attempts: 2 });
    expect(checkPromotion(box2)).toBe(false);
    const box3 = seeded(LEVELS[0].words, { box: 3, attempts: 2 });
    expect(checkPromotion(box3)).toBe(true);
  });
  it("needs 10 of 12 on the VC level", () => {
    const nine = seeded(LEVELS[0].words.slice(0, 9), { box: 3, attempts: 1 });
    expect(checkPromotion(nine)).toBe(false);
    const ten = seeded(LEVELS[0].words.slice(0, 10), { box: 3, attempts: 1 });
    expect(checkPromotion(ten)).toBe(true); expect(ten.level).toBe(2);
  });
  it("never promotes past the last level", () => {
    const top = seeded(LEVELS[6].words, { box: 5, attempts: 5 }); top.level = 7;
    expect(checkPromotion(top)).toBe(false); expect(top.level).toBe(7);
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
    const s = newState(); s.level = 7; s.perfectStreak = 5;
    expect(checkPromotion(s, { partial: false, perfect: true })).toBe(false);
    expect(s.level).toBe(7);
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
  it("serves the 12 VC words and nothing else on a fresh install", () => {
    const q = buildSession(newState());
    expect(q.length).toBe(12);
    expect(new Set(q)).toEqual(new Set(LEVELS[0].words));
  });
  it("targets 20 words on a full level", () => {
    const s = newState(); s.level = 2;
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
    expect(m.version).toBe(3);
    expect(m.level).toBe(3);
  });
  it("repairs a hostile or fractional level so the engine cannot crash", () => {
    expect(migrate({ version: 3, level: "abc" }).level).toBe(1);
    expect(migrate({ version: 3, level: {} }).level).toBe(1);
    expect(migrate({ version: 3, level: 3.7 }).level).toBe(4);
    expect(() => buildSession(migrate({ version: 3, level: 3.7 }))).not.toThrow();
    expect(() => buildMarkdown(migrate({ version: 3, level: "abc" }))).not.toThrow();
  });
});

describe("migrate", () => {
  const v2 = () => ({ version: 2, level: 3, sessionsCompleted: 9,
    settings: { mode: "parent", sound: true, childName: "", lang: "en-US" },
    words: { cat: { box: 5, attempts: 9, correct: 8, close: 1, wrong: 0, dueAt: 20, lastSession: 8 } },
    log: [{ n: 1, level: 1, c: 18, k: 1, w: 1, acc: 90, items: [], partial: false }] });

  it("shifts the level and the log by one", () => {
    const m = migrate(v2());
    expect(m.version).toBe(3); expect(m.level).toBe(4); expect(m.log[0].level).toBe(2);
  });
  it("leaves word data untouched", () => {
    const before = JSON.stringify(v2().words);
    expect(JSON.stringify(migrate(v2()).words)).toBe(before);
  });
  it("is idempotent", () => {
    const once = migrate(v2()); const twice = migrate(clone(once));
    expect(twice).toEqual(once);
  });
  it("maps old level 6 to new level 7 and clamps out-of-range input", () => {
    expect(migrate({ ...v2(), level: 6 }).level).toBe(7);
    expect(migrate({ version: 3, level: 99 }).level).toBe(7);
    expect(migrate({ version: 3, level: -5 }).level).toBe(1);
  });
  it("survives hostile documents", () => {
    for (const bad of [{}, null, undefined, { version: "2" }, { log: null }, { words: [] }])
      expect(() => migrate(clone(bad === undefined ? {} : bad) || {})).not.toThrow();
  });
});

/* ---------------- export ---------------- */
describe("buildMarkdown", () => {
  it("reports the 260-word denominator and seven level rows", () => {
    const md = buildMarkdown(newState());
    expect(md).toContain("0/260");
    expect(md.match(/\*\*Level \d+ .+ \(/g).length).toBe(7);
  });
  it("counts a word as mastered only from box 4", () => {
    const three = seeded(["cat", "dog"], { box: 3, attempts: 2 });
    expect(buildMarkdown(three)).toContain("0/260");
    const four = seeded(["cat", "dog"], { box: 4, attempts: 2 });
    expect(buildMarkdown(four)).toContain("2/260");
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
  it("inventories one clip per word plus the fixed sentences", () => {
    const script = voiceScript();
    expect(script.length).toBe(276);                       // 6 sentences + 10 praise + 260 words
    expect(script.filter((c) => c.id.startsWith("w:")).length).toBe(260);
    expect(new Set(script.map((c) => c.id)).size).toBe(276);
    expect(script.find((c) => c.id === "s:was").text).toBe("The word was");
    expect(script.find((c) => c.id === "l:wrong").text).toBe("Let’s try again.");
    expect(script.find((c) => c.id === "p:0").text).toBe("Great job!");
    expect(script.find((c) => c.id === "w:cat")).toEqual({ id: "w:cat", text: "cat" });
  });
  it("plans each utterance with seams, at the literal 700 ms", () => {
    expect(SEAM_MS).toBe(700);
    expect(clipPlan("correct", "cat", 3)).toEqual(["p:3", "seam", "s:was", "seam", "w:cat"]);
    expect(clipPlan("correct", "cat", 42)).toEqual(["p:0", "seam", "s:was", "seam", "w:cat"]);
    expect(clipPlan("close", "ship")).toEqual(["l:close", "seam", "s:is", "seam", "w:ship"]);
    expect(clipPlan("wrong", "sun")).toEqual(["l:wrong", "seam", "s:is", "seam", "w:sun"]);
    expect(clipPlan("replay", "cat")).toEqual(["w:cat"]);
    expect(clipPlan("levelup")).toEqual(["e:levelup"]);
    expect(clipPlan("done")).toEqual(["e:done"]);
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
  it("pins the ten praise sentences, character for character", () => {
    expect(PRAISE).toEqual([
      "Great job!",
      "You did it!",
      "You read that word all by yourself!",
      "How do you feel about saying that word correctly?",
      "You worked that out on your own!",
      "Your reading is getting stronger every day!",
      "You should feel proud of that one!",
      "That was tricky, and you got it!",
      "You sounded that one out beautifully!",
      "What careful reading that was!",
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
describe("ASR tolerance list", () => {
  it("accepts the VC near-misses", () => {
    expect(HOMOPHONES.in).toContain("inn");
    expect(HOMOPHONES.ax).toContain("axe");
    expect(HOMOPHONES.an).toContain("ann");
  });
})

describe("ADULT_JUDGED — words recognition cannot judge fairly (SPEC section 3)", () => {
  it("names exactly the five letter-name collisions, and the sound each one clashes with", () => {
    expect(ADULT_JUDGED).toEqual({ am: "m", an: "n", ax: "x", if: "f", us: "s" });
  });

  it("composes the adult's note from one template, and nothing for any other word", () => {
    expect(adultNote("am")).toBe('Parent: "am" and "m" are nearly indistinguishable, please act as judge here');
    expect(adultNote("us")).toBe('Parent: "us" and "s" are nearly indistinguishable, please act as judge here');
    expect(adultNote("cat")).toBe("");
    expect(adultNote("")).toBe("");
  });

  it("every flagged word is a real bank word, and no vowel pair was flagged", () => {
    const bank = new Set(LEVELS.flatMap((l) => l.words));
    for (const w of Object.keys(ADULT_JUDGED)) expect(bank.has(w)).toBe(true);
    // a recogniser returning "pen" for "pin" may be reporting the child correctly:
    // that is a reading error to catch, never a reason to remove the microphone
    for (const w of ["pin", "pen", "bad", "bed", "cap", "cup"]) expect(ADULT_JUDGED[w]).toBe(undefined);
  });
});
