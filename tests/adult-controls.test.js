/* Word Quest — adult result controls (G10, safety rule S5).
   Part of the safety gate, in its own file because tests/safety.test.js is at
   the 600-line ceiling (G6). The subject is one rule: a result reaches the
   save only through a deliberate adult act, and every grown-up has a way to
   perform one.

   The fault this file was written from, reported by an external audit: the
   hold control listened for pointer and keyboard events only. A grown-up
   using VoiceOver, Narrator or Voice Control could not record anything at
   all, and on a tablet there is no keyboard to fall back to, so the app was
   unusable for them. An assistive activation is deliberate — the control must
   be focused, then activated — so it counts as the keyboard does. A stray
   finger still does not: that arrives as a click carrying a pointer's detail
   count.
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";

vi.mock("../app/src/storage.js", () => ({
  /* Graduated by default: these tests exercise the WORD session's adult
     controls, which live past the pre-level ladder (2026-08-15). */
  loadState: vi.fn(async () => ({ version: 5, level: 1, preLevel: 0, prePerfectStreak: 0, sessionsCompleted: 0, perfectStreak: 0, settings: { sound: true, childName: "", lang: "en-US" }, words: {}, log: [], pre: {} })),
  saveState: vi.fn(async () => true),
}));
import { loadState as mockLoad } from "../app/src/storage.js";

window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
Object.defineProperty(window, "speechSynthesis", {
  configurable: true,
  value: { cancel: () => {}, speak: () => {} },
});
const { default: App } = await import("../app/src/App.jsx");
const { default: HoldButton } = await import("../app/src/components/HoldButton.jsx");

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("G10 safety — S5: every grown-up can give a result, and only a grown-up can", () => {
  const openSession = async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    return screen.getByLabelText("✓ got it (hold)");
  };
  const spied = (props) => {
    const count = { n: 0 };
    render(createElement(HoldButton, { onFire: () => { count.n += 1; }, color: "#0f7a4f", label: "✓ got it", ...props }));
    return [screen.getByLabelText("✓ got it (hold)"), count];
  };

  it("20: a screen reader's activation records the result", async () => {
    const hold = await openSession();
    fireEvent.click(hold, { detail: 0 });         // VoiceOver's double-tap
    await flush(500);
    expect(screen.getByText(/Next word|Finish!/)).toBeTruthy();
  });

  it("21 (control): a stray touch, and a hold let go early, still record nothing", async () => {
    const hold = await openSession();
    fireEvent.click(hold, { detail: 1 });         // a finger or a mouse
    await flush(500);
    expect(screen.queryByText(/Next word|Finish!/)).toBeNull();
    fireEvent.pointerDown(hold);
    await flush(200);                             // short of the 450 ms hold
    fireEvent.pointerUp(hold);
    await flush(500);
    expect(screen.queryByText(/Next word|Finish!/)).toBeNull();
  });

  it("22: no gesture grades a word twice", async () => {
    const [btn, fired] = spied();
    fireEvent.pointerDown(btn);
    await flush(700);                             // past the 450 ms hold
    fireEvent.pointerUp(btn);
    fireEvent.click(btn, { detail: 0 });          // the click a platform may add after a tap
    expect(fired.n).toBe(1);
    fireEvent.keyDown(btn, { key: "Enter" });
    fireEvent.click(btn, { detail: 0 });          // and the click Enter can produce
    expect(fired.n).toBe(2);
    // control: once the guard window passes, a real second activation counts
    await flush(1500);
    fireEvent.click(btn, { detail: 0 });
    expect(fired.n).toBe(3);
  });

  it("23 (control): a disabled control answers to nothing at all", async () => {
    const [btn, fired] = spied({ disabled: true });
    fireEvent.click(btn, { detail: 0 });
    fireEvent.keyDown(btn, { key: "Enter" });
    fireEvent.pointerDown(btn);
    await flush(700);
    expect(fired.n).toBe(0);
  });
});

describe("G10 — P1-7: the keyboard keeps its place in the session", () => {
  /* A1-007 / A2-005 from the external audit. The grade handed focus to the
     advance control at once, but that control is disabled for the whole
     reveal, and focusing a disabled button does nothing: focus fell to the
     page body. Enter did nothing, and a grown-up using VoiceOver had to hunt
     for "Next word" again on every single word. */
  const gradeAndWait = async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(0);
    expect(document.activeElement).toBe(document.body);   // the control is not live yet
    await flush(500);                                     // the reveal wait passes
  };

  it("25: focus reaches the advance control the moment it comes alive", async () => {
    await gradeAndWait();
    const advance = screen.getByText(/Next word|Finish!/);
    expect(advance.disabled).toBe(false);
    expect(document.activeElement).toBe(advance);
    fireEvent.click(document.activeElement);               // what Enter does in a browser
    await flush(0);
    expect(screen.getByLabelText("✓ got it (hold)").disabled).toBe(false);  // the next word is ready
  });

  it("26 (control): a grown-up who moves focus during the wait keeps it", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(100);                                     // inside the wait
    const leave = screen.getByLabelText("Leave session");
    leave.focus();
    await flush(500);                                     // the control comes alive
    expect(screen.getByText(/Next word|Finish!/).disabled).toBe(false);
    expect(document.activeElement).toBe(leave);           // their choice stands
  });
});

describe("G10 safety — S5: one attempt, one result", () => {
  /* CVC-INPUT-001 from the external audit. Both result controls can be held
     at once — two fingers, or a palm across the strip. Each hold matures on
     its own timer, and the controls only become disabled when React commits
     the feedback phase, which happens after the first grade returns. A
     second grade arriving inside that window counted the word twice: the
     "words read" total ran ahead of the words the child had actually read,
     which is the number the grown-up is asked to save on an early exit. */
  it("24: two controls held at once record one result, not two", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    const yes = screen.getByLabelText("✓ got it (hold)");
    const no = screen.getByLabelText("↻ not yet (hold)");
    fireEvent.pointerDown(yes);
    await flush(10);                              // the second finger lands
    fireEvent.pointerDown(no);
    await flush(700);                             // both holds mature
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    expect(screen.getByText(/1 word has been read/)).toBeTruthy();
  });
});

/* A1-014 / A2-014 — text a grown-up reads over the child's shoulder still has
   to be right, because the child reads it too. "1 sessions" was the first
   thing a child saw after their first session, on a screen that teaches
   reading. Counted the way the exit dialog above counts words. */
describe("G10 — the text a grown-up reads on the child's screen", () => {
  const saved = (over) => ({
    version: 3, level: 1, sessionsCompleted: 0, perfectStreak: 0,
    settings: { mode: "mic", sound: true, childName: "", lang: "en-US" },
    words: {}, log: [], ...over,
  });
  const openHome = async (state) => {
    mockLoad.mockResolvedValueOnce(state);
    render(createElement(App));
    await flush(0);
  };

  it("27: one completed session counts as '1 session', not '1 sessions'", async () => {
    await openHome(saved({ sessionsCompleted: 1 }));
    expect(screen.getByText("🗓️ 1 session")).toBeTruthy();
    expect(screen.queryByText("🗓️ 1 sessions")).toBe(null);
  });

  it("28 (control): two sessions still count as '2 sessions'", async () => {
    await openHome(saved({ sessionsCompleted: 2 }));
    expect(screen.getByText("🗓️ 2 sessions")).toBeTruthy();
    expect(screen.queryByText("🗓️ 2 session")).toBe(null);
  });
});
