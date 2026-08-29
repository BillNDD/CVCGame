/* Word Quest — the chunk ladder (owner-ruled 2026-08-24 to 2026-08-29 across four
   decision pages; SPEC section 12 carries the design). Two mixed rungs of
   letters and reading chunks, adult-graded, the words' own promotion rule,
   place-by-mastery migration, and the derived seats of the alongside roster.
   Engine truths first, then the running app. Every assertion uses literal
   expected values, never the constant under test (E4).
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";
import {
  PRE_LEVELS, preItems, buildPreSession, checkPrePromotion, migrate, newState,
  freshWordState, soundIdsFor, soundInventory, LEVELS, HEART,
  isChunkItem, chunkText, CHUNK_ROSTER, chunkSeats, dueChunks, bankWords,
} from "../src/engine.js";

const boxed = (keys, box) => Object.fromEntries(keys.map((k) => [k,
  { box, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }]));

describe("the ladder's shape", () => {
  it("holds two mixed rungs: letters first, then their chunks", () => {
    /* The chunk rebuild (2026-08-29): the ear rung retired, each rung opens
       with its new letters alone and then the chunks built from them. */
    expect(PRE_LEVELS.map((p) => p.n)).toEqual([1, 2]);
    expect(PRE_LEVELS.map((p) => p.kind)).toEqual(["mixed", "mixed"]);
    expect(preItems(1)).toEqual(["s", "a", "t", "p", "c:at", "c:ap"]);
    expect(preItems(2)).toEqual(["i", "n", "c:an", "c:in", "c:it", "c:ip"]);
    expect(preItems(0)).toEqual([]);   // off the ladder there is nothing to serve
  });
  it("every item declares its kind - a letter or a c: chunk, decided by declaration and never by length", () => {
    /* The tripwire the antagonist left for exactly this rebuild, moved to
       the items themselves: an item that is neither shape is a rung nobody
       has decided how to ask. Both retired ear items and chunks are two
       letters, which is why length may never be the judge. */
    for (const p of PRE_LEVELS) for (const item of p.items) {
      const letter = item.length === 1 && !item.includes(":");
      const chunk = /^c:[a-z]{2}$/.test(item);
      expect(letter || chunk, `item "${item}" is neither a letter nor a c: chunk - decide how it asks before the ladder serves it`).toBe(true);
      expect(isChunkItem(item)).toBe(chunk);
    }
    expect(chunkText("c:at")).toBe("at");
    expect(chunkText("s")).toBe("s");
  });
  it("teaches exactly the letters Level 1's decodables spell, and every item's sounds ship", () => {
    const letters = PRE_LEVELS.flatMap((p) => p.items).filter((it) => !isChunkItem(it)).sort();
    const l1 = [...new Set(LEVELS[0].words.filter((w) => !HEART.includes(w)).join(""))].sort();
    expect(letters).toEqual(l1);
    expect(letters).toEqual(["a", "i", "n", "p", "s", "t"]);
    /* The auditor's roster guard, kind-aware: a chunk's sounds are its
       TEXT's sounds, and every one must be in the shipped inventory. */
    const inv = new Set(soundInventory());
    for (const p of PRE_LEVELS) for (const item of p.items)
      for (const id of soundIdsFor(chunkText(item))) expect(inv.has(id)).toBe(true);
    /* And every rung chunk is a roster member - the rungs may not invent. */
    for (const p of PRE_LEVELS) for (const item of p.items.filter(isChunkItem))
      expect(CHUNK_ROSTER.includes(chunkText(item))).toBe(true);
  });
});

describe("a pre-session", () => {
  it("serves a fresh rung whole, in taught order, and never shuffles", () => {
    expect(buildPreSession({ ...newState(), preLevel: 1 }))
      .toEqual(["s", "a", "t", "p", "c:at", "c:ap"]);
    expect(buildPreSession({ ...newState(), preLevel: 2 }))
      .toEqual(["i", "n", "c:an", "c:in", "c:it", "c:ip"]);
  });
  it("leads with due reviews from the earlier rung - letters and chunks both", () => {
    const s = { ...newState(), preLevel: 2, sessionsCompleted: 1,
      pre: boxed(["s", "a", "c:at", "c:ap"], 2) };
    s.pre.s.dueAt = 1; s.pre["c:at"].dueAt = 1;            // a letter and a chunk due
    s.pre.a.dueAt = 9; s.pre["c:ap"].dueAt = 9;            // two not
    expect(buildPreSession(s).slice(0, 2)).toEqual(["s", "c:at"]);
  });
  it("serves the whole rung, six items, and never repeats one", () => {
    const s = { ...newState(), preLevel: 1, sessionsCompleted: 1, pre: boxed(preItems(1), 1) };
    const q = buildPreSession(s);
    expect(q.length).toBe(6);
    expect(new Set(q).size).toBe(6);
  });
});

describe("winning a rung", () => {
  it("promotes at the words' boundary: five of a rung's six, never four", () => {
    /* 80 per cent of six is 4.8, so five promotes and four does not. */
    const five = { ...newState(), preLevel: 1, pre: boxed(preItems(1).slice(0, 5), 3) };
    expect(checkPrePromotion(five)).toBe(true); expect(five.preLevel).toBe(2);
    const four = { ...newState(), preLevel: 1, pre: boxed(preItems(1).slice(0, 4), 3) };
    expect(checkPrePromotion(four)).toBe(false); expect(four.preLevel).toBe(1);
  });
  it("promotes on the words' second path too: two perfect sessions in a row", () => {
    const s = { ...newState(), preLevel: 1, pre: {} };
    expect(checkPrePromotion(s, { perfect: true })).toBe(false);
    expect(s.prePerfectStreak).toBe(1);
    expect(checkPrePromotion(s, { perfect: true })).toBe(true);
    expect(s.preLevel).toBe(2);
    expect(s.prePerfectStreak).toBe(0);
    const broken = { ...newState(), preLevel: 1, pre: {}, prePerfectStreak: 1 };
    expect(checkPrePromotion(broken, { perfect: false })).toBe(false);
    expect(broken.prePerfectStreak).toBe(0);
  });
  it("passing the last rung leaves the ladder for Level 1", () => {
    const s = { ...newState(), preLevel: 2, pre: boxed(preItems(2), 3) };
    expect(checkPrePromotion(s)).toBe(true);
    expect(s.preLevel).toBe(0);
    expect(checkPrePromotion(s)).toBe(false);   // off the ladder, nothing promotes
  });
});

describe("the chunk roster and its derived seats", () => {
  it("seats every chunk, the pre six at zero and the riders where their words live", () => {
    const seats = chunkSeats();
    expect(CHUNK_ROSTER.length).toBe(79);
    for (const c of CHUNK_ROSTER) expect(seats[c], `chunk "${c}" has no seat`).not.toBe(null);
    /* The pre-ladder six, by rung membership and nothing else. */
    expect(Object.keys(seats).filter((c) => seats[c] === 0).sort())
      .toEqual(["an", "ap", "at", "in", "ip", "it"]);
    /* Spot literals from the ruled seating (E4): the deadline rule's own
       examples. up is not in the roster - it left with the 26 trim. */
    expect(seats.am).toBe(5);
    expect(seats.us).toBe(14);
    expect(seats.ox).toBe(18);
    expect(seats.sa).toBe(1);
    expect(seats.cu).toBe(40);
    expect(CHUNK_ROSTER.includes("up")).toBe(false);
    expect(CHUNK_ROSTER.includes("pu")).toBe(false);   // owner-refused 2026-08-24
    expect(CHUNK_ROSTER.includes("he")).toBe(false);   // the collision guard: never a word saying something else
  });
  it("the due picker serves only clipped chunks the child's level has earned, capped, keys prefixed", () => {
    const bank = new Set(bankWords());
    const s5 = { ...newState(), preLevel: 0, level: 5 };
    const due = dueChunks(s5);
    expect(due).toEqual(["c:am"]);   // the only clipped rider seated at or below 5
    for (const key of dueChunks({ ...newState(), preLevel: 0, level: 40 }, 3)) {
      expect(key.startsWith("c:")).toBe(true);
      expect(bank.has(key.slice(2)), `${key} served without an approved clip`).toBe(true);
    }
    expect(dueChunks({ ...newState(), preLevel: 0, level: 40 }, 3).length).toBeLessThanOrEqual(3);
    /* Dormancy is the rule that keeps the gates honest with zero chunk clips
       rendered: sa is seated at Level 1 but is not a bank word, so it is
       never served until its u: clip lands and is approved. */
    expect(dueChunks({ ...newState(), preLevel: 0, level: 1 })).toEqual([]);
  });
});

describe("migration and the fresh-saves-only ruling", () => {
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
  it("v7 re-seats a mid-ladder child by their accepted mastery, never by the old rung number", () => {
    /* Owner-ruled 2026-08-24 ("Place them based on their already accepted
       mastery"), the fault-X recompute precedent. A beta-28 child's letter
       marks carry; orphaned ear marks match no item and count for nothing;
       chunk boxes start empty because reading print is evidence no
       listening mark can stand in for. All literals (E4). */
    const letters = boxed(["s", "a", "t", "p"], 3);
    const old2 = migrate({ ...newState(), version: 6, preLevel: 2, pre: letters });
    expect(old2.preLevel).toBe(1);   // four letters solid is 4 of rung 1's 6 - the chunks are unread
    const old3 = migrate({ ...newState(), version: 6, preLevel: 3, pre: { ...letters, ...boxed(["i", "n"], 3) } });
    expect(old3.preLevel).toBe(1);   // the old last rung still lands where the reading starts
    const earOnly = migrate({ ...newState(), version: 6, preLevel: 2, pre: boxed(["an", "at", "sat"], 4) });
    expect(earOnly.preLevel).toBe(1);   // ear marks are orphans: heard is not read
    const rebuilt = migrate({ ...newState(), version: 6, preLevel: 1, pre: boxed(preItems(1), 3) });
    expect(rebuilt.preLevel).toBe(2);   // a secure rung 1 promotes the walk to rung 2
    expect(migrate({ ...newState(), version: 6, preLevel: 0, words: boxed(["cat"], 3) }).preLevel).toBe(0);   // a graduate is never touched
  });
  it("a corrupted preLevel fails toward teaching, never past it", () => {
    expect(migrate({ ...newState(), preLevel: 99 }).preLevel).toBe(2);      // too high clamps down to the two-rung ladder
    const marks = { s: { box: 3, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 } };
    expect(migrate({ ...newState(), preLevel: NaN, pre: marks }).preLevel).toBe(1);
    expect(migrate({ ...newState(), preLevel: -3, pre: marks }).preLevel).toBe(1);
    expect(migrate({ ...newState(), preLevel: "abc" }).preLevel).toBe(1);   // fresh save, no marks: the ladder begins
    expect(migrate({ ...newState(), preLevel: "abc", words: marks }).preLevel).toBe(0);   // reading history still rules
    /* A reader whose grown-up jumped them to words keeps stale ladder
       marks - reader evidence must outrank them. */
    const reader = { ...newState(), preLevel: NaN, level: 5,
      pre: { s: { box: 4, attempts: 3, correct: 3, close: 0, wrong: 0, dueAt: 0, lastSession: 1 } },
      words: { cat: { box: 5, attempts: 4, correct: 4, close: 0, wrong: 0, dueAt: 0, lastSession: 2 } } };
    expect(migrate(reader).preLevel).toBe(0);
    const done = { ...newState(), preLevel: NaN, pre: {} };
    PRE_LEVELS.flatMap((p) => p.items).forEach((k) => { done.pre[k] = { box: 3, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 0, lastSession: 0 }; });
    expect(migrate(done).preLevel).toBe(0);                                 // every rung secure is the one safe graduation
  });
  it("keeps pre boxes and word boxes in separate rooms - and a chunk's key is its own room too", () => {
    const s = migrate({ ...newState(), preLevel: 1, pre: { ...boxed(["a"], 4), ...boxed(["c:at"], 2) }, words: boxed(["a", "at"], 1) });
    expect(s.pre.a.box).toBe(4);
    expect(s.words.a.box).toBe(1);
    /* THE COLLISION THE PREFIX EXISTS FOR: "at" the ear mark, "at" the word
       box and "c:at" the reading chunk are three different facts. A child
       who blended "at" by EAR on beta 28 must not arrive at the reading
       rung already credited with reading it. */
    expect(s.pre["c:at"].box).toBe(2);
    expect(s.words.at.box).toBe(1);
    expect(s.pre.at).toBeUndefined();
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
  it("a fresh install boots to Pre 1 and Begin serves the first letter, sound first", async () => {
    played.length = 0;
    render(createElement(App));
    await flush(0);
    expect(screen.getByText(/Pre 1/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    /* A letter item asks itself on arrival (fault AH's fix, kept): the first
       item is "s" and the plan is its one approved sound, nothing more. */
    expect(screen.getByText("Say the sound")).toBeTruthy();
    expect(played.length, "the first item asks itself on arrival").toBeGreaterThan(0);
    expect(played[0]).toBe("d:s");
    const word = document.querySelector(".wq-word");
    expect(word.textContent).toBe("s");
    expect(document.body.textContent.includes("Read this word")).toBe(false);
  });
  it("a chunk arrives in SILENCE, printed, and its speaker plays the sounds apart - never the answer (S2)", async () => {
    /* Letters with attempts leave the chunks as the only fresh items, so the
       queue leads with c:at. The screen must print "at" and play NOTHING:
       speaking the chunk on arrival hands a reading child the answer, which
       is the exact fault the retired length test would have shipped. */
    mockLoad.mockResolvedValueOnce({ ...newState(),
      pre: Object.fromEntries(["s", "a", "t", "p"].map((k) => [k,
        { box: 2, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 9, lastSession: 0 }])) });
    played.length = 0;
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    expect(screen.getByText("What does it say?")).toBeTruthy();
    expect(document.querySelector(".wq-word").textContent).toBe("at");
    expect(played.length, "a chunk's arrival is silent").toBe(0);
    /* The 🔊 is the retired ear rung's oral blend on demand: the sounds
       SEPARATED, and never the blended chunk. */
    fireEvent.click(screen.getByLabelText("Hear it again"));
    await flush(0);
    expect(played.length).toBe(1);
    expect(played[0]).toBe("d:short_a,seam2,d:t");
    expect(played[0].includes("w:at"), "the speaker never says the answer").toBe(false);
  });
  it("grading a chunk writes to its own prefixed key and the reveal blends at last", async () => {
    mockLoad.mockResolvedValueOnce({ ...newState(),
      pre: Object.fromEntries(["s", "a", "t", "p"].map((k) => [k,
        { box: 2, attempts: 2, correct: 2, close: 0, wrong: 0, dueAt: 9, lastSession: 0 }])) });
    played.length = 0;
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });
    await flush(0);
    const saved = mockSave.mock.calls.at(-1)[0];
    expect(saved.pre["c:at"].correct).toBe(1);            // the chunk's own room
    expect(saved.pre.at).toBeUndefined();                 // never the bare key
    expect(Object.keys(saved.words).length).toBe(0);      // and the word boxes untouched
    /* The feedback plan: praise, the sounds apart, then the whole chunk -
       "at" has an approved clip because it is a bank word (the ruled reuse).
       The sound-out fires on every outcome; this is the correct arm. */
    const feedback = played.at(-1);
    expect(feedback.includes("d:short_a,seam2,d:t")).toBe(true);
    expect(feedback.endsWith("w:at")).toBe(true);
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
    expect(saved.pre.s.correct).toBe(1);                  // the first letter, taught order
    expect(Object.keys(saved.words).length).toBe(0);
  });
  it("the grown-up's pre control jumps the ladder and Words leaves it", async () => {
    mockLoad.mockResolvedValueOnce({ ...newState(), preLevel: 0 });
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    fireEvent.click(screen.getByText("P2"));
    await flush(0);
    const saved = mockSave.mock.calls.at(-1)[0];
    expect(saved.preLevel).toBe(2);
  });
});

describe("the rider chunks - a graduate's session opens with what their level has earned", () => {
  it("a level-5 graduate meets c:am first, the clock never ticks, and the words follow", async () => {
    /* dueChunks at level 5 serves exactly ["c:am"] - the only clipped rider
       seated at or below 5 (the engine half pins that literal). The walk is
       the session's OPENING, not a session: sessionsCompleted stays where it
       was, or every word's due date would silently compress. */
    /* Sound OFF, deliberately: the player double never fires the arming
       callback, and with sound off the advance arms at once - while every
       assertion here keeps its meaning, because a chunk's arrival silence
       is the PLAN never being issued, which the double records either way.
       (A rider session with sound off is legal: reading needs no sound.) */
    mockLoad.mockResolvedValueOnce({ ...newState(), preLevel: 0, level: 5, sessionsCompleted: 3,
      settings: { ...newState().settings, sound: false } });
    played.length = 0;
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    expect(screen.getByText("What does it say?")).toBeTruthy();
    expect(document.querySelector(".wq-word").textContent).toBe("am");
    expect(screen.getByText(/chunks/)).toBeTruthy();          // the honest chip: not a Pre rung
    expect(played.length, "a chunk arrives silent, rider or rung").toBe(0);
    fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });
    await flush(0);
    const afterGrade = mockSave.mock.calls.at(-1)[0];
    expect(afterGrade.pre["c:am"].correct).toBe(1);
    expect(afterGrade.sessionsCompleted, "grading a rider never ticks the clock").toBe(3);
    fireEvent.click(screen.getByText(/Finish/));
    await flush(0);
    expect(screen.queryByText("What does it say?"), "the riders are done").toBeNull();
    expect(screen.getByText(/Read this word/), "and the words begin").toBeTruthy();
    const last = mockSave.mock.calls.at(-1)[0];
    expect(last.sessionsCompleted, "the rider walk was an opening, not a session").toBe(3);
  });
  it("a graduate with nothing due goes straight to the words", async () => {
    mockLoad.mockResolvedValueOnce({ ...newState(), preLevel: 0, level: 1 });
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    expect(screen.queryByText("What does it say?")).toBeNull();
    expect(screen.getByText(/Read this word/)).toBeTruthy();
  });
});
