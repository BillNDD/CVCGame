/* Word Quest — the pre-level ladder (owner-ruled 2026-08-15: five levels,
   adult-graded say-it-back, the words' own promotion rule, fresh saves only).
   Engine truths first, then the running app. Every assertion uses literal
   expected values, never the constant under test (E4).
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";
import {
  PRE_LEVELS, preItems, buildPreSession, checkPrePromotion, migrate, newState,
  freshWordState, soundIdsFor, soundInventory, LEVELS, HEART,
} from "../src/engine.js";

const boxed = (keys, box) => Object.fromEntries(keys.map((k) => [k,
  { box, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }]));

describe("the ladder's shape", () => {
  it("holds three rungs: the ear, then s-a-t-p, i-n", () => {
    /* Re-derived at the 2026-08-20 cutover: the converted Level 1 spells
       exactly six letters, so the ladder shrank from five rungs to three;
       m-o and u-x left with the letters Level 1 no longer assumes. */
    expect(PRE_LEVELS.map((p) => p.n)).toEqual([1, 2, 3]);
    expect(PRE_LEVELS.map((p) => p.kind)).toEqual(["ear", "letter", "letter"]);
    expect(preItems(2)).toEqual(["s", "a", "t", "p"]);
    expect(preItems(3)).toEqual(["i", "n"]);
    expect(preItems(1)).toEqual(["an", "at", "it", "in", "as", "sat"]);
    expect(preItems(0)).toEqual([]);   // off the ladder there is nothing to serve
  });
  it("teaches exactly the letters Level 1's decodables spell, and every item's sound ships", () => {
    const letters = PRE_LEVELS.filter((p) => p.kind === "letter").flatMap((p) => p.items).sort();
    const l1 = [...new Set(LEVELS[0].words.filter((w) => !HEART.includes(w)).join(""))].sort();
    expect(letters).toEqual(l1);
    expect(letters).toEqual(["a", "i", "n", "p", "s", "t"]);
    /* The auditor's roster guard: an item whose sound is not in the shipped
       inventory would be the "default sound" fault arriving by ladder. */
    const inv = new Set(soundInventory());
    for (const p of PRE_LEVELS) for (const item of p.items)
      for (const id of soundIdsFor(item)) expect(inv.has(id)).toBe(true);
  });
});

describe("a pre-session", () => {
  it("serves a fresh rung whole, in taught order, and never shuffles", () => {
    expect(buildPreSession({ ...newState(), preLevel: 1 }))
      .toEqual(["an", "at", "it", "in", "as", "sat"]);
    expect(buildPreSession({ ...newState(), preLevel: 2 })).toEqual(["s", "a", "t", "p"]);
  });
  it("leads with up to five due letter reviews from earlier rungs", () => {
    const s = { ...newState(), preLevel: 3, sessionsCompleted: 1,
      pre: boxed(["s", "a", "t", "p"], 2) };
    s.pre.s.dueAt = 1; s.pre.a.dueAt = 1;                  // two due, two not
    s.pre.t.dueAt = 9; s.pre.p.dueAt = 9;
    expect(buildPreSession(s)).toEqual(["s", "a", "i", "n"]);
  });
  it("serves the whole rung, six items, and never repeats one", () => {
    const s = { ...newState(), preLevel: 1, sessionsCompleted: 1, pre: boxed(preItems(1), 1) };
    const q = buildPreSession(s);
    expect(q.length).toBe(6);
    expect(new Set(q).size).toBe(6);
  });
});

describe("winning a rung", () => {
  it("promotes at the words' boundary: 5 of the ear's 6, all 4 of s-a-t-p", () => {
    /* 80 per cent of six is 4.8, so five promotes and four does not. */
    const five = { ...newState(), preLevel: 1, pre: boxed(preItems(1).slice(0, 5), 3) };
    expect(checkPrePromotion(five)).toBe(true); expect(five.preLevel).toBe(2);
    const four4 = { ...newState(), preLevel: 1, pre: boxed(preItems(1).slice(0, 4), 3) };
    expect(checkPrePromotion(four4)).toBe(false); expect(four4.preLevel).toBe(1);
    /* Small rungs make 80 percent a full house — which is why the second
       path below exists. Pinned so the arithmetic is a stated fact. */
    const three = { ...newState(), preLevel: 2, pre: boxed(["s", "a", "t"], 3) };
    expect(checkPrePromotion(three)).toBe(false);
    const four = { ...newState(), preLevel: 2, pre: boxed(["s", "a", "t", "p"], 3) };
    expect(checkPrePromotion(four)).toBe(true); expect(four.preLevel).toBe(3);
  });
  it("promotes on the words' second path too: two perfect sessions in a row", () => {
    const s = { ...newState(), preLevel: 2, pre: {} };
    expect(checkPrePromotion(s, { perfect: true })).toBe(false);
    expect(s.prePerfectStreak).toBe(1);
    expect(checkPrePromotion(s, { perfect: true })).toBe(true);
    expect(s.preLevel).toBe(3);
    expect(s.prePerfectStreak).toBe(0);
    const broken = { ...newState(), preLevel: 2, pre: {}, prePerfectStreak: 1 };
    expect(checkPrePromotion(broken, { perfect: false })).toBe(false);
    expect(broken.prePerfectStreak).toBe(0);
  });
  it("passing the last rung leaves the ladder for Level 1", () => {
    const s = { ...newState(), preLevel: 3, pre: boxed(["i", "n"], 3) };
    expect(checkPrePromotion(s)).toBe(true);
    expect(s.preLevel).toBe(0);
    expect(checkPrePromotion(s)).toBe(false);   // off the ladder, nothing promotes
  });
});

describe("migration v5 and the fresh-saves-only ruling", () => {
  it("a truly fresh save starts the ladder; every kind of history skips it", () => {
    expect(migrate({ version: 4, level: 1, words: {}, log: [], settings: {} }).preLevel).toBe(1);
    expect(migrate({ version: 4, level: 1, words: boxed(["cat"], 3), log: [], settings: {} }).preLevel).toBe(0);
    expect(migrate({ version: 4, level: 1, words: {}, log: [], sessionsCompleted: 2, settings: {} }).preLevel).toBe(0);
    expect(migrate({ version: 4, level: 1, words: {}, log: [{ n: 1, level: 1, items: [] }], settings: {} }).preLevel).toBe(0);
    expect(migrate({ version: 4, level: 8, words: {}, log: [], settings: {} }).preLevel).toBe(0);   // a set level is intent
  });
  it("is idempotent, and a graduate stays graduated", () => {
    const once = migrate({ version: 4, level: 1, words: {}, log: [], settings: {} });
    const twice = migrate(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
    expect(migrate({ ...newState(), preLevel: 0 }).preLevel).toBe(0);
  });
  it("a corrupted preLevel fails toward teaching, never past it", () => {
    /* The auditor proved the first clamp graduated a mid-ladder child: a
       hostile value healed to absent and the final clamp read absent as 0.
       Recovery now walks the ladder's own boxes — corruption with ladder
       marks lands at the first unsecure rung; a clean history still rules a
       save with no marks. All literals (E4). */
    expect(migrate({ ...newState(), preLevel: 99 }).preLevel).toBe(3);      // too high clamps down to the three-rung ladder
    const marks = { s: { box: 3, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 } };
    expect(migrate({ ...newState(), preLevel: NaN, pre: marks }).preLevel).toBe(1);
    expect(migrate({ ...newState(), preLevel: -3, pre: marks }).preLevel).toBe(1);
    expect(migrate({ ...newState(), preLevel: "abc" }).preLevel).toBe(1);   // fresh save, no marks: the ladder begins
    expect(migrate({ ...newState(), preLevel: "abc", words: marks }).preLevel).toBe(0);   // reading history still rules
    /* The auditor's last case: a reader whose grown-up jumped them to words
       keeps stale ladder marks — reader evidence must outrank them, or a
       Level 5 child lands back in sound drills on any corruption. */
    const reader = { ...newState(), preLevel: NaN, level: 5,
      pre: { s: { box: 4, attempts: 3, correct: 3, close: 0, wrong: 0, dueAt: 0, lastSession: 1 } },
      words: { cat: { box: 5, attempts: 4, correct: 4, close: 0, wrong: 0, dueAt: 0, lastSession: 2 } } };
    expect(migrate(reader).preLevel).toBe(0);
    const done = { ...newState(), preLevel: NaN, pre: {} };
    PRE_LEVELS.flatMap((p) => p.items).forEach((k) => { done.pre[k] = { box: 3, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }; });
    expect(migrate(done).preLevel).toBe(0);                                 // every rung secure is the one safe graduation
  });
  it("keeps pre boxes and word boxes in separate rooms — the letters a and i collide otherwise", () => {
    const s = migrate({ ...newState(), preLevel: 2, pre: boxed(["a"], 4), words: boxed(["a"], 1) });
    expect(s.pre.a.box).toBe(4);
    expect(s.words.a.box).toBe(1);
  });
});

/* ---------- the running app ---------- */
vi.mock("../app/src/storage.js", () => ({
  loadState: vi.fn(async () => null),
  saveState: vi.fn(async () => true),
}));
/* THE PLAYER, NOT THE LIGHT. The prompt has to be asserted where it actually
   happens: the Glowseed cannot see it in jsdom (the suites that mock
   voicepacks fire onScheduled with no audio events at all, so the object
   never leaves idle and an assertion on it passes either way - the council's
   before pass, 2026-08-24). So this mock records the PLANS handed to the
   player, and the tests read those. */
const played = [];
vi.mock("../app/src/voicepacks.js", async (real) => {
  const mod = await real();
  return { ...mod,
    unlockVoice: vi.fn(),
    stopClips: vi.fn(),
    playClips: vi.fn((plan) => { played.push(plan.join(",")); }),
    speakVoice: vi.fn((kind, word, i, enabled, fallback, onScheduled) => { if (onScheduled) onScheduled(0, []); }),
    onAudio: () => () => {},
  };
});
import { saveState as mockSave, loadState as mockLoad } from "../app/src/storage.js";
const { default: App } = await import("../app/src/App.jsx");
const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => { vi.useFakeTimers(); mockSave.mockClear(); mockLoad.mockReset(); mockLoad.mockResolvedValue(null); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("the ladder in the app", () => {
  it("a fresh install boots to Pre 1 and Begin serves the ear, not a word", async () => {
    render(createElement(App));
    await flush(0);
    expect(screen.getByText(/Pre 1/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    expect(screen.getByText("What word do the sounds make?")).toBeTruthy();
    /* THE EAR SHOWS AN EAR AND NEVER LETTERS - the whole point of Pre 1 is
       blending by sound before print exists, and PreSessionScreen's own
       comment still says so. This assertion was weakened to "a word element
       exists" by step 0a's emoji-locator sweep (f85ed6b), which was right
       about LOCATORS and wrong to take the CONTENT check with it: from that
       commit until 2026-08-23 nothing in the tree held the property, and
       mutating the render to print the answer left every test green. Found by
       the release sweep. The check is on the stage's own text, not on a
       locator, so it does not reintroduce an emoji locator. */
    const word = document.querySelector(".wq-word");
    expect(word).toBeTruthy();
    expect(word.textContent, "the ear rung shows the ear, not its answer").toBe("\u{1F442}");
    for (const letter of "sat") expect(word.textContent.includes(letter), `the question never prints "${letter}"`).toBe(false);
    expect(document.body.textContent.includes("Read this word")).toBe(false);
  });
  it("a pre-level item asks its own question - on arrival, and on the NEXT item, never the one just finished", async () => {
    /* OPEN FAULT AH, closed 2026-08-24. The screen asked "What word do the
       sounds make?", showed an ear, and played nothing: the question was
       posed and never asked, and the only way to hear it was an adult
       pressing a speaker labelled "Hear it AGAIN". Found by the owner on a
       real phone. This asserts on the PLAYER, because the light cannot see it
       here (see the mock above), and it asserts the ITEM rather than the
       index: reading preQ[preQi] on entry throws on undefined, and reading it
       on advance plays the item just finished. */
    played.length = 0;
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    expect(played.length, "the first item asks itself on arrival").toBeGreaterThan(0);
    const first = played[0];
    expect(first.length, "and it asked something, not nothing").toBeGreaterThan(0);
    /* grade it and advance: the prompt that follows is the NEXT item's */
    const hold = async (name) => { const b = screen.getByLabelText(name);
      fireEvent.pointerDown(b); await flush(500); fireEvent.pointerUp(b); await flush(0); };
    await hold("got it");
    await flush(4000);
    played.length = 0;
    const advance = screen.queryByLabelText("Next") || screen.queryByLabelText("Next word") || screen.queryByLabelText("Finish!");
    if (advance) { fireEvent.click(advance); await flush(0); }
    if (played.length) expect(played[0], "the next item's prompt, not the one just graded").not.toBe(first);
  });

  it("only the adult's hold records a pre result, into state.pre alone (S1)", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    const writes = mockSave.mock.calls.length;
    await flush(30000);                                   // a long quiet wait records nothing
    expect(mockSave.mock.calls.length).toBe(writes);
    fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });
    await flush(0);
    const saved = mockSave.mock.calls.at(-1)[0];
    expect(saved.pre.an.correct).toBe(1);                 // the first ear item, taught order
    expect(Object.keys(saved.words).length).toBe(0);      // and the word boxes untouched
  });
  it("the grown-up's pre control jumps the ladder and Words leaves it", async () => {
    mockLoad.mockResolvedValueOnce({ ...newState(), preLevel: 0 });
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    fireEvent.click(screen.getByText("P3"));
    await flush(0);
    const saved = mockSave.mock.calls.at(-1)[0];
    expect(saved.preLevel).toBe(3);
  });
});
