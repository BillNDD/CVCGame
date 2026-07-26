/* Phonics Game — fault-injection suite (gate G9, docs/testing-gauntlet.md).
   The six destructive scenarios, permanent:
     1  damaged save            -> copy kept at :corrupt, fresh start, message
     2  storage timeout (3 s)   -> fresh start, read-only, zero writes
     3  late storage response   -> never renders, never written over
     4  wrong-shape JSON        -> heals; no function throws
     5  throwing speech service -> grading still completes
     6  backward clock          -> no throw; the log row still gets an ISO date
   Paired controls (rule E5): the zero-writes spy of scenario 2 is proven live
   by scenario 1b, where the same spy MUST record a write; the throwing speech
   of scenario 5 pairs with the working speech path the unit suite covers.
   @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { migrate, buildSession, buildMarkdown, newState } from "../src/engine.js";

vi.mock("../app/src/storage.js", () => ({
  loadState: vi.fn(),
  saveState: vi.fn(async () => true),
}));
import { loadState as mockLoad, saveState as mockSave } from "../app/src/storage.js";
import { createElement } from "react";
import App from "../app/src/App.jsx";

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const boot = async (ms = 0) => { render(createElement(App)); await flush(ms); };
const gradeFirstWord = async () => {
  fireEvent.click(screen.getByText("▶️ Begin Session"));
  await flush(0);
  const gotIt = screen.getByRole("button", { name: "✓ got it (hold)" });
  fireEvent.keyDown(gotIt, { key: "Enter" });
  await flush(0);
};

beforeEach(() => {
  mockLoad.mockReset();
  mockSave.mockClear();
  mockSave.mockImplementation(async () => true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("G9 faults — the app boot", () => {
  /* Fake timers here only: fake-indexeddb needs the real clock. */
  beforeEach(() => vi.useFakeTimers());
  it("1: a damaged save reads as fresh, with the damage message, and stays writable", async () => {
    mockLoad.mockResolvedValue({ __corrupt: true });
    await boot();
    expect(screen.getByText(/Hatchlings/)).toBeTruthy();
    expect(screen.getByText("Saved progress was damaged. A copy was kept; starting fresh.")).toBeTruthy();
    // 1b — control for the zero-writes spy: a writable visit MUST record writes
    await gradeFirstWord();
    expect(mockSave.mock.calls.length).toBeGreaterThan(0);
  });

  it("2: a storage timeout starts fresh, warns, and writes nothing for the visit", async () => {
    mockLoad.mockImplementation(() => new Promise(() => {}));   // never answers
    await boot(3000);
    expect(screen.getByText(/Hatchlings/)).toBeTruthy();
    expect(screen.getByText("Couldn’t read saved progress. Nothing will be saved this visit.")).toBeTruthy();
    expect(screen.getByText(/could not be read/)).toBeTruthy();
    await gradeFirstWord();
    expect(screen.getAllByText(/Great job!/).length).toBeGreaterThan(0); // grading worked
    expect(mockSave.mock.calls.length).toBe(0);                          // but nothing was written
  });

  it("3: late data never renders and is never written over", async () => {
    mockLoad.mockImplementation(() => new Promise((res) =>
      setTimeout(() => res({ ...newState(), level: 5, sessionsCompleted: 9 }), 3500)));
    await boot(3000);
    expect(screen.getByText(/Hatchlings/)).toBeTruthy();     // fresh state rendered
    await flush(600);                                        // the late answer arrives
    expect(screen.queryByText(/Explorer/)).toBeNull();       // level 5 never renders
    expect(screen.getByText("Saved progress found. Reload to continue it.")).toBeTruthy();
    expect(mockSave.mock.calls.length).toBe(0);              // and is never written over
  });

  it("5: a throwing speech service does not stop grading", async () => {
    mockLoad.mockResolvedValue(null);
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(t) { this.text = t; } });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { cancel: () => { throw new Error("no voice"); }, speak: () => { throw new Error("no voice"); } },
    });
    await boot();
    await gradeFirstWord();
    expect(screen.getAllByText(/Great job! That is/).length).toBeGreaterThan(0);
    delete window.speechSynthesis;
  });

  it("6: a backward clock cannot crash a session, and the log date stays ISO", async () => {
    vi.setSystemTime(new Date("1999-12-31T12:00:00Z"));
    mockLoad.mockResolvedValue({
      version: 3, level: 1, sessionsCompleted: 5,
      settings: { mode: "parent", sound: false, childName: "", lang: "en-US" },
      words: { at: { box: 2, attempts: 3, correct: 2, close: 0, wrong: 1, dueAt: 1, lastSession: 999 } },
      log: [],
    });
    await boot();
    await gradeFirstWord();
    fireEvent.click(screen.getByRole("button", { name: "Leave session" }));
    fireEvent.click(screen.getByText("Save 1 as a short session"));
    await flush(0);
    expect(screen.getByText("Good stop")).toBeTruthy();
    const saved = mockSave.mock.calls.at(-1)[0];
    expect(saved.log[0].date).toBe("1999-12-31");
    expect(saved.log[0].partial).toBe(true);
  });
});

describe("G9 faults — the real IndexedDB adapter", () => {
  it("1a: a non-JSON value is copied to :corrupt and reported, never repaired in place", async () => {
    const real = await vi.importActual("../app/src/storage.js");
    const put = (key, value) => new Promise((res, rej) => {
      const rq = indexedDB.open("phonics-game", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
      rq.onsuccess = () => {
        const tx = rq.result.transaction("kv", "readwrite");
        tx.objectStore("kv").put(value, key);
        tx.oncomplete = () => { rq.result.close(); res(); };
        tx.onerror = () => rej(tx.error);
      };
    });
    const get = (key) => new Promise((res) => {
      const rq = indexedDB.open("phonics-game", 1);
      rq.onsuccess = () => {
        const tx = rq.result.transaction("kv", "readonly");
        const g = tx.objectStore("kv").get(key);
        g.onsuccess = () => { rq.result.close(); res(g.result); };
      };
    });
    await put("phonicsgame:progress:v1", "{not json at all");
    expect(await real.loadState()).toEqual({ __corrupt: true });
    expect(await get("phonicsgame:progress:v1:corrupt")).toBe("{not json at all");
    expect(await get("phonicsgame:progress:v1")).toBe("{not json at all"); // untouched
  });

  it("2a: a broken storage backend reads as no save, exactly like the reference", async () => {
    const real = await vi.importActual("../app/src/storage.js");
    const saved = globalThis.indexedDB;
    vi.stubGlobal("indexedDB", undefined);
    expect(await real.loadState()).toBe(null);
    expect(await real.saveState({ version: 3 })).toBe(false);
    vi.stubGlobal("indexedDB", saved);
  });
});

describe("G9 faults — wrong-shape JSON battery", () => {
  it("4: hostile shapes heal, and every engine function survives them", () => {
    const hostile = [
      [], 7, "text", null, true,
      { words: [] }, { words: 7 }, { log: {} }, { log: [null, 1, []] },
      { settings: 5 }, { level: "abc" }, { level: 99.9 }, { sessionsCompleted: -3 },
      { version: { toString: null } }, { version: "2", log: [{ items: null }] },
    ];
    for (const doc of hostile) {
      const m = migrate(typeof doc === "object" && doc !== null ? JSON.parse(JSON.stringify(doc)) : doc);
      expect(m.level).toBeGreaterThanOrEqual(1);
      expect(m.level).toBeLessThanOrEqual(7);
      expect(() => buildSession(m)).not.toThrow();
      expect(() => buildMarkdown(m)).not.toThrow();
    }
  });
});
