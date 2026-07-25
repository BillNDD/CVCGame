/* Word Quest — safety gate (G10). Every rule here is a CLAUDE.md safety rule.
   The two critical ones:
   S1 — no code path records a wrong or close result without an adult action;
        speech recognition can only confirm a correct reading.
   S2 — the app never speaks the target word before the attempt ends.
   Runtime tests drive the real app with a scripted recognition double and a
   speech spy. Source tripwires pin the call sites, each with a fixture
   control proving the tripwire fires on the fault it targets.
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { createElement } from "react";

vi.mock("../app/src/storage.js", () => ({
  loadState: vi.fn(async () => null),
  saveState: vi.fn(async () => true),
}));
import { saveState as mockSave } from "../app/src/storage.js";

/* The recognition double must exist BEFORE the engine module loads, because
   the engine binds SR once at import time. */
const recInstances = [];
class FakeRecognition {
  constructor() { recInstances.push(this); }
  start() { this.started = true; }
  stop() { if (this.onend) this.onend(); }
}
window.webkitSpeechRecognition = FakeRecognition;
const utterances = [];
window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
Object.defineProperty(window, "speechSynthesis", {
  configurable: true,
  value: { cancel: () => {}, speak: (u) => utterances.push(u.text) },
});
const { default: App } = await import("../app/src/App.jsx");

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const startListening = async () => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByText("▶️ Begin Session"));
  await flush(0);
  fireEvent.click(screen.getByText(/Start Recording/));
  await flush(0);
  return document.querySelector(".wq-word").textContent;
};
const hear = async (transcript) => {
  const rec = recInstances.at(-1);
  await act(async () => { rec.onresult({ results: [[{ transcript }]] }); });
};

beforeEach(() => {
  vi.useFakeTimers();
  mockSave.mockClear();
  utterances.length = 0;
  recInstances.length = 0;
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("G10 safety — S1: only an adult can record a miss", () => {
  it("1: a transcript that does not match records nothing and asks the adult", async () => {
    await startListening();
    const writesAfterBoot = mockSave.mock.calls.length; // the fresh-install boot write only
    await hear("completely different words");
    expect(screen.getByText("Nice try! Grown-up will check. 👇")).toBeTruthy();
    expect(document.querySelectorAll(".wq-tile").length).toBe(0);    // no feedback phase
    expect(mockSave.mock.calls.length).toBe(writesAfterBoot);        // no result recorded
  });

  it("2 (control): a matching transcript auto-confirms CORRECT, and only correct", async () => {
    const word = await startListening();
    await hear(word);
    expect(screen.getAllByText(/Great job! That is/).length).toBeGreaterThan(0);
    expect(mockSave.mock.calls.length).toBeGreaterThan(0);
    const savedWord = mockSave.mock.calls.at(-1)[0].words[word];
    expect(savedWord.correct).toBe(1);
    expect(savedWord.close).toBe(0);
    expect(savedWord.wrong).toBe(0);
  });

  it("3: source tripwire — wrong and close fire only from the adult hold controls", () => {
    const app = readFileSync("app/src/App.jsx", "utf8");
    const sessionScreen = readFileSync("app/src/screens/SessionScreen.jsx", "utf8");
    const offenders = (src) =>
      [...src.matchAll(/grade\("(wrong|close)"\)/g)].filter((m) => {
        const line = src.slice(src.lastIndexOf("\n", m.index) + 1, src.indexOf("\n", m.index));
        return !line.includes("HoldButton onFire={() => grade(") && !line.includes("onFire={() => grade(");
      });
    expect(offenders(app).length).toBe(0);
    expect(offenders(sessionScreen).length).toBe(0);
    // the transcript handler can only ever grade "correct"
    const handler = app.slice(app.indexOf("function handleTranscripts"), app.indexOf("function replay"));
    expect(handler.includes('grade("correct")')).toBe(true);
    expect(handler.includes('grade("wrong")')).toBe(false);
    expect(handler.includes('grade("close")')).toBe(false);
    // fixture control: the tripwire must fire on a bad call site
    expect(offenders('if (timeout) grade("wrong");').length).toBe(1);
  });
});

describe("G10 safety — S2: the word is never spoken before the attempt ends", () => {
  it("4: nothing is spoken in the ready or listening phase, and replay is inert", async () => {
    const word = await startListening();
    expect(utterances.length).toBe(0);                                    // listening: silent
    const replay = screen.getByRole("button", { name: "Hear the word again" });
    expect(replay.disabled).toBe(true);                                   // replay inert
    fireEvent.click(replay);
    expect(utterances.filter((t) => t.includes(word)).length).toBe(0);
    // source tripwire for the guard, with its fixture control
    const app = readFileSync("app/src/App.jsx", "utf8");
    expect(app.includes('if (phase !== "feedback") return;')).toBe(true);
    expect('function replay() { speak(currentWord); }'.includes('if (phase !== "feedback") return;')).toBe(false);
  });

  it("5 (control): after the attempt, speech says the full word and replay works", async () => {
    const word = await startListening();
    await hear(word);                                       // attempt ends, correct
    expect(utterances.at(-1)).toBe(`Great job! ${word}!`);  // full word, after the attempt
    await flush(500);
    const replay = screen.getByRole("button", { name: "Hear the word again" });
    expect(replay.disabled).toBe(false);
    fireEvent.click(replay);
    expect(utterances.at(-1)).toBe(word);                   // replay says the whole word
    for (const t of utterances) expect(/(^| )[a-z]([ .!]|$)/.test(t)).toBe(false); // no letter names
  });
});

describe("G10 safety — S6 and S7: no network, big controls", () => {
  it("6: no app source makes a network call", () => {
    const files = [
      "app/src/App.jsx", "app/src/main.jsx", "app/src/storage.js", "app/src/wq-css.js",
      "app/src/screens/HomeScreen.jsx", "app/src/screens/SessionScreen.jsx",
      "app/src/screens/DoneScreen.jsx", "app/src/screens/ParentScreen.jsx",
    ];
    const NET = /\bfetch\s*\(|XMLHttpRequest|new WebSocket|sendBeacon|gtag\(|analytics/;
    for (const f of files) expect(NET.test(readFileSync(f, "utf8"))).toBe(false);
    expect(NET.test('const r = await fetch("https://api.example.com");')).toBe(true); // control
  });

  it("7: the stylesheet keeps child controls at 56 px and adult controls at 44 px", () => {
    const css = readFileSync("app/src/wq-css.js", "utf8");
    expect(css.includes("min-height:56px")).toBe(true);                       // .wq-cta
    expect(css.includes("min-height:44px;min-width:44px")).toBe(true);        // .wq-sbtn
    expect((css.match(/min-height:44px/g) || []).length).toBeGreaterThanOrEqual(4);
  });
});
