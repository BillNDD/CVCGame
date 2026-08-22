/* Word Quest — fault-injection suite (gate G9, docs/testing-gauntlet.md).
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
/* Since the pre-level ladder (2026-08-15) a FRESH install begins at Pre 1,
   so a fresh-boot fault test grades the ladder's first item — that IS the
   first thing a real fresh install grades. The adult strip is the same one. */
const gradeFirstWord = async () => {
  fireEvent.click(screen.getByLabelText("Begin Session"));
  await flush(0);
  const gotIt = screen.getByRole("button", { name: "got it" });
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
    expect(screen.getByText(/Pre 1/)).toBeTruthy();   // fresh means the ladder now
    expect(screen.getByText("Saved progress was damaged. A copy was kept; starting fresh.")).toBeTruthy();
    // 1b — control for the zero-writes spy: a writable visit MUST record writes
    await gradeFirstWord();
    expect(mockSave.mock.calls.length).toBeGreaterThan(0);
  });

  it("2: a storage timeout starts fresh, warns, and writes nothing for the visit", async () => {
    mockLoad.mockImplementation(() => new Promise(() => {}));   // never answers
    await boot(3000);
    expect(screen.getByText(/Pre 1/)).toBeTruthy();
    expect(screen.getByText("Couldn’t read saved progress. Nothing will be saved this visit.")).toBeTruthy();
    expect(screen.getByText(/could not be read/)).toBeTruthy();
    await gradeFirstWord();
    expect(screen.getAllByText(/Great job!/).length).toBeGreaterThan(0); // grading worked (the ladder speaks the same praise)
    expect(mockSave.mock.calls.length).toBe(0);                          // but nothing was written
  });

  it("3: late data never renders and is never written over", async () => {
    mockLoad.mockImplementation(() => new Promise((res) =>
      setTimeout(() => res({ ...newState(), preLevel: 0, level: 5, sessionsCompleted: 9 }), 3500)));
    await boot(3000);
    expect(screen.getByText(/Pre 1/)).toBeTruthy();          // fresh state rendered
    await flush(600);                                        // the late answer arrives
    expect(screen.queryByText(/Zig Zap/)).toBeNull();        // level 5 never renders
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
    expect(screen.getAllByText(/Great job!/).length).toBeGreaterThan(0);   // the exact pre feedback line, pinned
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
      const rq = indexedDB.open("word-quest", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
      rq.onsuccess = () => {
        const tx = rq.result.transaction("kv", "readwrite");
        tx.objectStore("kv").put(value, key);
        tx.oncomplete = () => { rq.result.close(); res(); };
        tx.onerror = () => rej(tx.error);
      };
    });
    const get = (key) => new Promise((res) => {
      const rq = indexedDB.open("word-quest", 1);
      rq.onsuccess = () => {
        const tx = rq.result.transaction("kv", "readonly");
        const g = tx.objectStore("kv").get(key);
        g.onsuccess = () => { rq.result.close(); res(g.result); };
      };
    });
    await put("wordquest:progress:v2", "{not json at all");
    expect(await real.loadState()).toEqual({ __corrupt: true });
    expect(await get("wordquest:progress:v2:corrupt")).toBe("{not json at all");
    expect(await get("wordquest:progress:v2")).toBe("{not json at all"); // untouched
  });

  it("2a: a broken storage backend reports SILENCE, not absence", async () => {
    /* Rewritten after the audit of 2026-07-27. This test used to assert that
       an unreadable backend "reads as no save". That was the defect: boot
       believed the save was absent, built a fresh state, and wrote it over a
       save it had merely failed to read. Absence and silence must differ. */
    const real = await vi.importActual("../app/src/storage.js");
    const saved = globalThis.indexedDB;
    vi.stubGlobal("indexedDB", undefined);
    expect(await real.loadState()).toEqual({ __unreadable: true });
    expect(await real.saveState({ version: 3 })).toBe(false);
    vi.stubGlobal("indexedDB", saved);
  });
});

describe("G9 faults — an unreadable save, and backups that must look like one", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("2b: an unreadable save is never overwritten, and the visit stays read-only", async () => {
    mockLoad.mockResolvedValueOnce({ __unreadable: true });
    render(createElement(App));
    await flush(0);
    expect(screen.getByText(/Couldn’t read saved progress/)).toBeTruthy();
    expect(mockSave.mock.calls.length).toBe(0);          // the old save is left alone
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });
    await flush(500);
    expect(mockSave.mock.calls.length).toBe(0);          // and playing writes nothing either
  });

  it("2c (control): a genuinely absent save DOES initialise and write", async () => {
    /* Proves 2b tests the unreadable case specifically, not a dead spy. */
    mockLoad.mockResolvedValueOnce(null);
    render(createElement(App));
    await flush(0);
    expect(mockSave.mock.calls.length).toBeGreaterThan(0);
  });

  const importFile = async (text) => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    const input = document.querySelector('input[type="file"]');
    const file = new File([text], "b.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => text });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    await flush(0);
  };

  /* The marker is a signal, not a password. A file carrying it and nothing
     else used to be accepted, and the app reported "Backup loaded." while
     replacing every word record, the log, the level and the child's name with
     an empty state. Found by an audit of the running build, 2026-07-29. */
  for (const [label, text] of [
    ["an empty object", "{}"],
    ["an array", "[]"],
    ["a bare null", "null"],
    ["unrelated JSON", '{"hello":"world"}'],
    ["not JSON at all", "<html>"],
    ["the marker and nothing else", '{"application":"word-quest-backup"}'],
    ["the marker with a wrong-typed level", '{"application":"word-quest-backup","level":"seven","words":"oops","settings":null}'],
    ["the marker with no words map", '{"application":"word-quest-backup","version":3,"level":5}'],
    /* One clause at a time. Every case above is refused by SEVERAL of the
       validator's clauses at once, so removing any single clause changed
       nothing and the app-mutation gate reported three survivors on
       2026-08-10. Each file below is a valid save in every respect but one,
       so it can only be refused by the clause it targets. */
    ["a save with no words map at all", '{"version":3,"level":5,"settings":{"mode":"parent"}}'],
    ["a save whose words map is an array", '{"version":3,"level":5,"words":[],"settings":{"mode":"parent"}}'],
    ["a save with no settings", '{"version":3,"level":5,"words":{}}'],
    ["a save whose settings are an array", '{"version":3,"level":5,"words":{},"settings":[]}'],
    ["a save whose level is missing", '{"version":3,"words":{},"settings":{"mode":"parent"}}'],
    ["a save whose level is not finite", '{"version":3,"level":null,"words":{},"settings":{"mode":"parent"}}'],
    ["an array carrying every field a save has", '[{"version":3,"level":5,"words":{},"settings":{}}]'],
  ]) {
    it(`7: ${label} is refused, and nothing is written`, async () => {
      mockLoad.mockResolvedValueOnce({ ...newState(), preLevel: 0, level: 5 });
      await importFile(text);
      expect(screen.getByText("That file is not a Word Quest backup.")).toBeTruthy();
      const wrote = mockSave.mock.calls.some((c) => c[0].level !== 5);
      expect(wrote).toBe(false);                        // the real progress survives
    });
  }

  /* The Array clause, tested where it can be reached. Through the file input
     the clause is redundant — a JSON array carries no named properties, so
     the level check refuses it first — but an array WITH properties is one
     line of JavaScript, and the predicate is the thing that decides whether a
     family's history is replaced. Tested directly so the guard is real rather
     than assumed. */
  it("7b: a save-shaped ARRAY is not a backup", async () => {
    const { isBackup } = await import("../app/src/App.jsx");
    const shaped = Object.assign([], { version: 3, level: 5, words: {}, settings: { mode: "parent" } });
    expect(isBackup(shaped)).toBe(false);
    expect(isBackup({ version: 3, level: 5, words: {}, settings: { mode: "parent" } })).toBe(true); // control
  });

  it("7a (control): a genuine backup still restores", async () => {
    mockLoad.mockResolvedValueOnce({ ...newState(), preLevel: 0 });
    /* A version 4 backup: its level is trusted (and clamped), where a pre-v4
       one would recompute from the words — that path has its own tests. */
    const backup = JSON.stringify({ ...newState(), level: 4, version: 4 });
    await importFile(backup);
    expect(screen.getByText("Backup loaded.")).toBeTruthy();
    expect(mockSave.mock.calls.at(-1)[0].level).toBe(4);
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
      expect(m.level).toBeLessThanOrEqual(20);
      expect(() => buildSession(m)).not.toThrow();
      expect(() => buildMarkdown(m)).not.toThrow();
    }
  });
});

describe("G9 faults — the corner's own actions survive their edges", () => {
  /* Three adult actions the coverage rehearsal (2026-08-21) found no test
     had ever pressed: the name commit with its surrogate-pair rule, the log
     copy on BOTH clipboard outcomes, and the two-stage reset. Each is a
     screen a real parent uses; a throw in any of them is a fault. */
  const seed = () => ({ version: 6, level: 1, preLevel: 0, prePerfectStreak: 0,
    sessionsCompleted: 0, perfectStreak: 0, words: {}, log: [], pre: {},
    settings: { sound: true, childName: "", lang: "en-US" } });
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); cleanup(); });
  const openCorner = async () => {
    mockLoad.mockResolvedValueOnce(seed());
    await boot(0);
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
  };
  it("commits a trimmed, 20-glyph name without bisecting a surrogate pair", async () => {
    await openCorner();
    const input = document.getElementById("wq-name");
    /* 21 astronaut emoji: a byte-wise slice(0, 20) would cut one in half. */
    fireEvent.change(input, { target: { value: "  " + "🧑‍🚀".repeat(21) + "  " } });
    fireEvent.blur(input);
    await flush(0);
    const committed = mockSave.mock.calls.at(-1)[0].settings.childName;
    expect(Array.from(committed).length).toBe(20);
    expect(committed.endsWith("�")).toBe(false);
  });
  it("copies the log when the clipboard allows, and shows the box when it refuses", async () => {
    await openCorner();
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });
    fireEvent.click(screen.getByLabelText("Copy log (Markdown)"));
    await flush(0);
    expect(screen.getByText(/Log copied/)).toBeTruthy();
    navigator.clipboard.writeText = vi.fn(async () => { throw new Error("denied"); });
    fireEvent.click(screen.getByLabelText("Copy log (Markdown)"));
    await flush(0);
    /* The fallback the owner met on his own phone the same morning: the
       markdown lands in a select-all box instead of vanishing. */
    expect(document.querySelector("textarea.wq-input").value).toContain("0/1123");
  });
  it("saves a backup through the blob path without a throw", async () => {
    await openCorner();
    /* jsdom has no object URLs; the stubs stand in for the browser and the
       assertions hold the CONTRACT: one URL made, one revoked, the download
       carries the marker the import path will demand back. */
    let made = null;
    URL.createObjectURL = vi.fn((blob) => { made = blob; return "blob:wq-test"; });
    URL.revokeObjectURL = vi.fn();
    fireEvent.click(screen.getByLabelText("Save backup file"));
    await flush(1200);
    expect(screen.getByText("Backup file saved.")).toBeTruthy();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:wq-test");
    expect(await made.text()).toContain('"application": "word-quest-backup"');
  });
  it("jumping to a word level steps the child off the pre-ladder", async () => {
    /* The owner set P3, then tapped level 26, and the ladder kept winning
       (2026-08-21): preLevel > 0 governs every session. A tapped word level
       now clears it, and the toast says so. */
    mockLoad.mockResolvedValueOnce({ ...seed(), preLevel: 3 });
    await boot(0);
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    fireEvent.click(screen.getByText("26"));
    await flush(0);
    const saved = mockSave.mock.calls.at(-1)[0];
    expect(saved.level).toBe(26);
    expect(saved.preLevel).toBe(0);
    expect(screen.getByText(/Level set to 26 .* sessions serve words/)).toBeTruthy();
  });
  it("resets only through the second press, and the first can back out", async () => {
    await openCorner();
    fireEvent.click(screen.getByLabelText("Reset all progress"));
    await flush(0);
    fireEvent.click(screen.getByText("Keep my progress"));
    await flush(0);
    expect(screen.getByLabelText("Reset all progress")).toBeTruthy();   // backed out whole
    fireEvent.click(screen.getByLabelText("Reset all progress"));
    await flush(0);
    fireEvent.click(screen.getByText("Yes, erase everything"));
    await flush(0);
    expect(screen.getByText("All progress cleared.")).toBeTruthy();
    const saved = mockSave.mock.calls.at(-1)[0];
    expect(saved.words).toEqual({});
    expect(saved.log).toEqual([]);
  });
});

describe("G9 faults — the error ring records on the device and never sends", () => {
  /* Owner-ruled 2026-08-22 (bug-hunt page, errors: A, with the condition
     that outranks it: "I don't want the bug report to be sent automatically.
     I want the parent to choose"). These prove the ring, the scrub, the
     boundary, and the separation from the session log. */
  const seed = () => ({ version: 6, level: 1, preLevel: 0, prePerfectStreak: 0,
    sessionsCompleted: 0, perfectStreak: 0, words: {}, log: [], pre: {},
    settings: { sound: true, childName: "", lang: "en-US" } });
  beforeEach(() => { vi.useFakeTimers(); localStorage.removeItem("wq-errors"); });
  afterEach(() => { vi.useRealTimers(); cleanup(); localStorage.removeItem("wq-errors"); });

  it("scrubs every URL to its file name, caps the message, and keeps the last 20", async () => {
    const { scrub, record, readErrors, CAP, MAX_MESSAGE } = await import("../app/src/errors.js");
    expect(scrub("failed at https://family.example/word-quest/assets/App-3f2a.js?x=1#y then http://10.0.0.2/sw.js"))
      .toBe("failed at App-3f2a.js then sw.js");
    expect(scrub("x".repeat(500)).length).toBe(MAX_MESSAGE);
    for (let i = 0; i < 25; i++) record({ kind: "error", message: "e" + i, where: "", screen: "home", version: "t" });
    const list = readErrors();
    expect(list.length).toBe(CAP);
    expect(list[0].message).toBe("e5");
    expect(list.at(-1).message).toBe("e24");
    /* A storage that holds rubbish reads as empty, never as a throw. */
    localStorage.setItem("wq-errors", "{not json");
    expect(readErrors()).toEqual([]);
  });

  it("the browser's two catch-alls land in the ring with the screen name, and no origin", async () => {
    const { install, readErrors } = await import("../app/src/errors.js");
    const remove = install(window, { screen: () => "session", version: "1.0.0-test" });
    const err = new Error("boom at https://host.example/app/src/App.jsx");
    err.stack = "Error: boom\n    at tapSentenceWord (https://host.example/assets/App-abc.js:12:3)";
    window.dispatchEvent(Object.assign(new Event("error"), { message: err.message, error: err, filename: "https://host.example/assets/App-abc.js", lineno: 12 }));
    window.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: new Error("no clip") }));
    remove();
    const list = readErrors();
    expect(list.map((e) => [e.kind, e.screen, e.v])).toEqual([["error", "session", "1.0.0-test"], ["rejection", "session", "1.0.0-test"]]);
    expect(list[0].message).toBe("boom at App.jsx");
    expect(list[0].where).toContain("App-abc.js:12:3");
    expect(JSON.stringify(list)).not.toMatch(/https?:/);
  });

  it("a render crash shows a way back to the start, not a blank page, and is recorded", async () => {
    const { default: ErrorBoundary } = await import("../app/src/components/ErrorBoundary.jsx");
    const { readErrors } = await import("../app/src/errors.js");
    let explode = true;
    function throwingChild() { if (explode) throw new Error("render boom"); return createElement("p", null, "alive again"); }
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    render(createElement(ErrorBoundary, { screen: () => "build", version: "t" }, createElement(throwingChild)));
    const back = screen.getByLabelText("Back to the start");
    expect(back.className).toContain("wq-cta");                       // a child's control, 56 px by class (S7)
    expect(readErrors().map((e) => [e.kind, e.screen, e.message])).toEqual([["render", "build", "render boom"]]);
    explode = false;
    fireEvent.click(back);
    expect(screen.getByText("alive again")).toBeTruthy();
    quiet.mockRestore();
  });

  it("the corner copies the report only on a grown-up's press, apart from the log, and can clear it", async () => {
    const { record } = await import("../app/src/errors.js");
    record({ kind: "error", message: "ring-one", where: "A.js:1", screen: "home", version: "t" });
    record({ kind: "rejection", message: "second", where: "", screen: "session", version: "t" });
    mockLoad.mockResolvedValueOnce(seed());
    await boot(0);
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    expect(screen.getByText(/2 problems recorded on this device/)).toBeTruthy();
    const written = [];
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async (t) => { written.push(t); }) } });
    /* The session log is its own copy and carries none of it: a family that
       shares the log for any other reason shares no error text. */
    fireEvent.click(screen.getByLabelText("Copy log (Markdown)"));
    await flush(0);
    expect(written[0]).not.toContain("bug report");
    expect(written[0]).not.toContain("ring-one");
    fireEvent.click(screen.getByLabelText("Copy bug report"));
    await flush(0);
    expect(written[1]).toContain("# Word Quest bug report");
    expect(written[1]).toContain("Nothing in this report was sent anywhere");
    expect(written[1]).toContain("1. ");
    expect(written[1]).toContain("home · error: ring-one");
    expect(written[1]).toContain("at A.js:1");
    expect(written[1]).toContain("session · rejection: second");
    fireEvent.click(screen.getByText("Clear"));
    await flush(0);
    expect(screen.getByText(/No problems recorded on this device/)).toBeTruthy();
    expect(screen.getByLabelText("Copy bug report").disabled).toBe(true);
  });
});
