/* Word Quest — the reveal and the advance control (G10, CVC-UX-001).
   The reveal is the teaching moment: praise, a pause, "The word was", a
   pause, then the word, five to seven seconds in all. Advancing silences it.
   The advance control used to come alive 400 ms in, so a child who tapped at
   once never heard the word said properly — the one thing the reveal exists
   for. It now waits for the word, and falls back to the short guard only
   where there is no recorded reveal to wait for.

   The voice pack is replaced here so the wait is exercised without an audio
   device: jsdom has no AudioContext, so the real module would always take
   the fallback path and the rule under test would never run.
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";

const REVEAL_MS = 5200;                       // a real reveal, measured from the pack
/* "pack" schedules clips and reports their length; "fallback" cannot play and
   hands the utterance to system speech; "silent" is sound turned off, where
   the module returns without a word to either side. */
let voiceMode = "pack";

vi.mock("../app/src/storage.js", () => ({
  loadState: vi.fn(async () => null),
  saveState: vi.fn(async () => true),
}));
vi.mock("../app/src/voicepacks.js", () => ({
  initVoicePacks: vi.fn(async () => {}),
  unlockVoice: vi.fn(),
  stopClips: vi.fn(),
  familyClipIds: () => new Set(),
  idbPutClip: vi.fn(async () => true),
  idbDeleteClip: vi.fn(async () => true),
  /* onScheduled is optional in the real module — the done and level-up lines
     have nothing to wait for — so the double must not insist on it. */
  speakVoice: (kind, word, praiseIdx, enabled, fallback, onScheduled) => {
    if (voiceMode === "pack") { if (onScheduled) onScheduled(REVEAL_MS); }
    else if (voiceMode === "fallback") fallback();
  },
}));

window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
Object.defineProperty(window, "speechSynthesis", {
  configurable: true,
  value: { cancel: () => {}, speak: () => {} },
});
const { default: App } = await import("../app/src/App.jsx");

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const advance = () => screen.getByText(/Next word|Finish!/);
const gradeOneWord = async () => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByText("▶️ Begin Session"));
  await flush(0);
  fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
  await flush(0);
};

/* A2-003 — the advance control's label. Walk a first session to its last slot,
   grading every word correct so no retry is queued on the way: 12 words, so
   eleven grades leave the twelfth on screen. */
const walkToLastSlot = async () => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByText("▶️ Begin Session"));
  await flush(0);
  for (let i = 0; i < 11; i += 1) {
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    fireEvent.click(advance());
    await flush(0);
  }
  return document.querySelector(".wq-word").textContent;
};

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); voiceMode = "pack"; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("G10 — the child hears the word before the app lets them move on", () => {
  it("1: with a recorded reveal, the advance control waits for the word", async () => {
    await gradeOneWord();
    await flush(1000);
    expect(advance().disabled).toBe(true);          // the praise is still playing
    await flush(3000);
    expect(advance().disabled).toBe(true);          // "The word was" — the word is still to come
    await flush(REVEAL_MS - 4000 + 50);
    expect(advance().disabled).toBe(false);         // the word has been said
  });

  it("2 (control): with no recorded reveal, the short guard still applies", async () => {
    voiceMode = "fallback";                          // system speech: no length to wait for
    await gradeOneWord();
    expect(advance().disabled).toBe(true);
    await flush(450);                                // literal, per rule E4: the 400 ms guard
    expect(advance().disabled).toBe(false);
  });

  it("3 (control): with sound off, nothing can leave the control dim for ever", async () => {
    voiceMode = "silent";                            // neither callback runs
    await gradeOneWord();
    await flush(450);
    expect(advance().disabled).toBe(false);
  });

  /* A2-003 — the label describes the press. A miss on the last slot puts the
     word back, so the press is a next word, not a finish; a correct reading
     there really does end the session. The pair has to move together. */
  it("5: a miss on the last word says \"Next word\", and the second look follows", async () => {
    const word = await walkToLastSlot();
    fireEvent.keyDown(screen.getByLabelText("↻ not yet (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    expect(advance().textContent).toBe("Next word ➡️");
    fireEvent.click(advance());
    await flush(0);
    expect(document.querySelector(".wq-word").textContent).toBe(word);
    expect(screen.getByText("second look at this word")).toBeTruthy();
  });

  it("6 (pair): a correct last word says \"Finish!\", and the press ends the session", async () => {
    await walkToLastSlot();
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    expect(advance().textContent).toBe("🏁 Finish!");
    fireEvent.click(advance());
    await flush(0);
    /* twelve correct readings promote, so the heading is "Level up!" here; the
       header says the same thing either way */
    expect(screen.getByText("Session complete")).toBeTruthy();
    expect(document.querySelector(".wq-word")).toBeNull();
  });

  /* A1-004 — the wait says how long it is. The fill's length is the reveal's
     own scheduled length, not a guess, and it exists only while the control is
     inert. The literals here are the mocked reveal and the short guard. */
  it("4: the wait carries a fill for exactly as long as the reveal", async () => {
    await gradeOneWord();
    const fill = () => advance().querySelector(".wq-ctafill");
    expect(fill()).not.toBeNull();
    expect(fill().style.getPropertyValue("--wqfill")).toBe("5200ms");
    await flush(REVEAL_MS + 50);
    expect(advance().disabled).toBe(false);
    expect(fill()).toBeNull();                       // nothing left over on a live control
  });
});
