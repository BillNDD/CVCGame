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
  loadState: vi.fn(async () => null),
  saveState: vi.fn(async () => true),
}));

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
