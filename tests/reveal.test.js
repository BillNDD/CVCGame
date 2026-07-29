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
  speakVoice: (kind, word, praiseIdx, enabled, fallback, onScheduled) => {
    if (voiceMode === "pack") onScheduled(REVEAL_MS);
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
