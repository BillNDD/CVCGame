/* BUILD-IT (SPEC section 12). The app speaks a word the child already knows and
   the child assembles it from sound tiles.

   Two things are proved here, and the first is the reason the mode is safe.

   1. IT WRITES NOTHING. Build-it speaks the target word FIRST, which in a graded
      reading attempt would be an S2 breach — the app must never say the word
      before the attempt ends. It is not a breach here because there is no
      attempt: nothing a child does in this mode reaches the record. That is a
      property of the code, not an intention, so it is checked as one, with
      fixture controls that must fire (E5). Owner-ruled Q1, 2026-08-17.

   2. THE LOOP WORKS. A child places tiles, hears each one, gets a miss they can
      hear, and after the second miss is shown where each sound goes. "Every
      attempt ends in success" is the whole reason the mode may be practice, so
      it is walked rather than assumed.

   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { buildTray, chunkWord } from "../src/engine.js";

/* The pack is replaced so the loop can be walked without an audio device, and
   so a completion callback fires at once rather than after a real clip. */
const played = [];
vi.mock("../app/src/voicepacks.js", () => ({
  initVoicePacks: async () => {},
  unlockVoice: () => {},
  stopClips: () => {},
  microphoneUsed: () => {},
  familyClipIds: () => new Set(),
  speakVoice: (kind, word) => { played.push("word:" + word); },
  playClips: (plan, enabled, fallback, onScheduled = () => {}) => {
    played.push("clips:" + plan.join(","));
    onScheduled(0, []);
  },
}));
vi.mock("../app/src/storage.js", () => ({
  loadState: () => stored,
  saveState: (s) => { saves.push(s); },
}));

let stored, saves;
const BuildItScreen = (await import("../app/src/screens/BuildItScreen.jsx")).default;
const { newState } = await import("../src/engine.js");

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  played.length = 0;
  saves = [];
  stored = { ...newState(), preLevel: 0 };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

/* A tray with a held rand, so the tiles are known and the walk is not a guess. */
const trayFor = (word, level = 2) => buildTray(word, level, () => 0.3);

function mount(word, level = 2, onDone = () => {}) {
  const tray = trayFor(word, level);
  render(createElement(BuildItScreen, {
    tray,
    playWord: (w) => played.push("word:" + w),
    playSounds: (ids, then) => { played.push("sounds:" + ids.join(",")); if (then) then(); },
    soundIdOf: (t) => "d:" + t,
    soundIdsOf: (w) => chunkWord(w).map((c) => "d:" + c),
    onDone, onExit: onDone,
  }));
  return tray;
}

const tiles = () => screen.getAllByLabelText(/^Tile /);
const slots = () => screen.getAllByLabelText(/^(Take back|Empty space)/);
const tileFor = (t) => tiles().filter((b) => b.textContent === t);

describe("Build-it writes nothing to the record", () => {
  it("1: source tripwire — the screen touches no state that is saved", () => {
    const src = readFileSync("app/src/screens/BuildItScreen.jsx", "utf8");
    /* The names that reach the record in this app. A screen that holds none of
       them cannot write to it, whatever it does with its own useState. */
    const WRITERS = /\b(persist|saveState|setState\(|mutate\(|applyResult|checkPromotion|localStorage)\b/g;
    const offenders = (text) => [...text.matchAll(WRITERS)].map((m) => m[0]);
    expect(offenders(src)).toEqual([]);
    /* Fixture controls: the scan must fire on each kind of write, or an empty
       result proves only that the scan is broken. */
    expect(offenders("persist(s);")).toEqual(["persist"]);
    expect(offenders("saveState(next);")).toEqual(["saveState"]);
    expect(offenders("setState(s => s);")).toEqual(["setState("]);
    expect(offenders("localStorage.setItem('x', 1);")).toEqual(["localStorage"]);
    /* And the strongest form: the REAL source with one line added must fail.
       A scan proved only against hand-written fixtures can still be looking at
       the wrong file. */
    expect(offenders(src + "\n  persist(stateRef.current);\n")).toEqual(["persist"]);
  });

  it("2: a completed build saves nothing", async () => {
    const tray = mount("cat");
    for (const t of tray.answer) fireEvent.click(tileFor(t)[0]);
    await flush(50);
    expect(saves).toEqual([]);
    expect(screen.getByText(/You built cat/)).toBeTruthy();
  });

  it("3: no adult mark exists anywhere on the screen (D4)", () => {
    mount("cat");
    expect(screen.queryByLabelText("✓ got it (hold)")).toBeNull();
    expect(screen.queryByLabelText("↻ not yet (hold)")).toBeNull();
    expect(screen.queryByLabelText(/close/i)).toBeNull();
  });
});

describe("Build-it's loop", () => {
  it("4: the word is spoken first, and the tiles are not", () => {
    mount("cat");
    expect(played[0]).toBe("word:cat");
    expect(played.some((p) => p.startsWith("sounds:"))).toBe(false);
  });

  it("5: a tile plays its own sound as it is placed", () => {
    const tray = mount("cat");
    fireEvent.click(tileFor(tray.answer[0])[0]);
    expect(played).toContain("sounds:d:" + tray.answer[0]);
  });

  it("6: a word whose sound repeats can still be built", async () => {
    /* dad is d-a-d. When a slot held the LETTER rather than the tray position,
       the second d could never be placed and the word could not be built at
       all - eleven bank words, one of them at Level 2. */
    const tray = mount("dad");
    expect(tray.answer).toEqual(["d", "a", "d"]);
    const ds = tiles().filter((b) => b.textContent === "d");
    expect(ds.length).toBe(2);
    fireEvent.click(ds[0]);
    fireEvent.click(tileFor("a")[0]);
    fireEvent.click(ds[1]);
    await flush(50);
    expect(slots().map((s) => s.textContent).join("")).toBe("dad");
    expect(screen.getByText(/You built dad/)).toBeTruthy();
  });

  it("7: a miss says what the child actually built, and the tray is not locked", async () => {
    const tray = mount("cat", 8);          // level 8 brings a distractor along
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    expect(wrong).toBeTruthy();
    fireEvent.click(wrong);
    for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
    await flush(50);
    expect(screen.getByText(/listen again/)).toBeTruthy();
    /* and the child can take a tile back and try again: unlimited tries (D5) */
    fireEvent.click(slots()[0]);
    expect(slots()[0].textContent).toBe("");
  });

  it("8: after the second miss, the letter is shown in its own slot", async () => {
    const tray = mount("cat", 8);
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    for (let go = 0; go < 2; go += 1) {
      fireEvent.click(wrong);
      for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
      await flush(60);
      if (go === 0) slots().forEach((s) => fireEvent.click(s));
    }
    await flush(1000);
    expect(screen.getByText(/Watch where each sound goes/)).toBeTruthy();
    /* the ghost is the answer's own letter, in the slot it belongs to */
    expect(slots()[0].textContent).toBe(tray.answer[0]);
  });
});
