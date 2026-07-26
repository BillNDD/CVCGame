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
const rates = [];
const cancels = { n: 0 };
window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
Object.defineProperty(window, "speechSynthesis", {
  configurable: true,
  value: { cancel: () => { cancels.n += 1; }, speak: (u) => { utterances.push(u.text); rates.push(u.rate); } },
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
  rates.length = 0;
  cancels.n = 0;
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

  it("4b: advancing to the next word silences any queued reveal", async () => {
    const word = await startListening();
    const draw = vi.spyOn(Math, "random").mockReturnValue(0);
    try { await hear(word); } finally { draw.mockRestore(); } // attempt ends; reveal is queued
    await flush(500);                                       // past the 400 ms advance guard
    const before = cancels.n;
    fireEvent.click(screen.getByText(/Next word|Finish!/));
    await flush(0);
    expect(cancels.n).toBeGreaterThan(before);              // hush() ran on advance
    // source tripwire for the call site, with its fixture control: advancing
    // must silence system speech AND any clip chain (S2 for clips)
    const app = readFileSync("app/src/App.jsx", "utf8");
    expect(app.includes("function next() {\n    hush(); stopClips();")).toBe(true);
    expect("function next() {\n    hush();".includes("stopClips();")).toBe(false);
  });

  it("5 (control): after the attempt, speech says the full word and replay works", async () => {
    const word = await startListening();
    /* Pin the praise draw: 0.95 -> index 9, so the assertion stays literal. */
    const draw = vi.spyOn(Math, "random").mockReturnValue(0.95);
    try { await hear(word); } finally { draw.mockRestore(); } // attempt ends, correct
    expect(utterances.at(-2)).toBe("What careful reading that was!"); // praise, after the attempt
    expect(utterances.at(-1)).toBe(`The word was ${word}.`); // full word, its own sentence
    expect(rates.at(-1)).toBe(0.7);                         // the reveal is slow and clear
    await flush(500);
    const replay = screen.getByRole("button", { name: "Hear the word again" });
    expect(replay.disabled).toBe(false);
    fireEvent.click(replay);
    expect(utterances.at(-1)).toBe(word);                   // replay says the whole word
    expect(rates.at(-1)).toBe(0.7);                         // at the slow rate
    for (const t of utterances) expect(/(^| )[a-z]([ .,!?]|$)/.test(t)).toBe(false); // no letter names
  });
});

describe("G10 safety — W4b: a broken microphone never traps the child", () => {
  it("8: a recognizer that never answers times out to ready, records nothing, keeps mic mode", async () => {
    await startListening();                                  // the double never fires any event
    const writesAfterBoot = mockSave.mock.calls.length;
    await flush(8000);                                       // the watchdog window
    expect(screen.getByText(/Record again/)).toBeTruthy();     // back to ready, mic still offered
    expect(screen.getByText("Didn’t catch that — tap to try again.")).toBeTruthy();
    expect(mockSave.mock.calls.length).toBe(writesAfterBoot);  // S1: nothing recorded
    for (const call of mockSave.mock.calls) expect(call[0].settings.mode).toBe("mic");
  });

  it("9: the Stop control recovers even when the recognizer is dead", async () => {
    await startListening();
    const rec = recInstances.at(-1);
    rec.stop = () => { throw new Error("dead recognizer"); }; // stop() cannot help
    fireEvent.click(screen.getByText(/Stop/));
    await flush(0);
    expect(screen.getByText(/Record again/)).toBeTruthy();    // N-8: a visible change, always
  });

  it("10: a mic failure that is not a denial blocks the mic for this visit only", async () => {
    await startListening();
    const rec = recInstances.at(-1);
    await act(async () => { rec.onerror({ error: "service-not-allowed" }); });
    expect(screen.queryByText(/Start Recording|Record again/)).toBeNull(); // grown-up grading this visit
    expect(screen.getByText(/grown-up grading for this visit/)).toBeTruthy();
    // the saved setting never changes: no write may carry mode "parent"
    for (const call of mockSave.mock.calls) expect(call[0].settings.mode).toBe("mic");
  });
});

describe("G10 safety — S6 and S7: no network, big controls", () => {
  it("6: no app source makes a network call", () => {
    const files = [
      "app/src/App.jsx", "app/src/main.jsx", "app/src/storage.js", "app/src/wq-css.js",
      "app/src/screens/HomeScreen.jsx", "app/src/screens/SessionScreen.jsx",
      "app/src/screens/DoneScreen.jsx", "app/src/screens/ParentScreen.jsx",
      "app/src/voicepacks.js", "app/src/updates.js",
    ];
    const NET = /\bfetch\s*\(|XMLHttpRequest|new WebSocket|sendBeacon|gtag\(|analytics/;
    /* Each allowance is scoped to the ONE file entitled to it: the voice-pack
       adapter may fetch its own clips, and the update module may fetch the
       version check (the S6 exception, SPEC section 7a). The same string in
       any other file — a child screen above all — must trip the scan. */
    const ALLOWED = {
      "app/src/voicepacks.js": [['fetch("voice/', 'LOCAL_CLIP("voice/']],
      "app/src/updates.js": [['fetch("version.json"', 'LOCAL_UPDATE("version.json"']],
    };
    for (const f of files) {
      let src = readFileSync(f, "utf8");
      for (const [from, to] of ALLOWED[f] || []) src = src.replaceAll(from, to);
      expect(NET.test(src)).toBe(false);
    }
    expect(NET.test('const r = await fetch("https://api.example.com");')).toBe(true); // control
    expect(NET.test('fetch("voice/manifest.json")'.replaceAll('fetch("voice/', 'LOCAL_CLIP("voice/'))).toBe(false);
    expect(NET.test('fetch("https://x.test/voice/a.mp3")')).toBe(true); // a remote clip URL still trips
    // control replaying a real incident: an allowed-elsewhere fetch planted in
    // a child screen gets no strip there, so it must trip the scan
    const planted = 'fetch("version.json", { cache: "no-store" }).then((r) => r.json());';
    let strippedAsHomeScreen = planted;
    for (const [from, to] of ALLOWED["app/src/screens/HomeScreen.jsx"] || []) strippedAsHomeScreen = strippedAsHomeScreen.replaceAll(from, to);
    expect(NET.test(strippedAsHomeScreen)).toBe(true);
  });

  it("7: the stylesheet keeps child controls at 56 px and adult controls at 44 px", () => {
    const sized = (css) =>
      css.includes("min-height:56px") &&
      css.includes("min-height:44px;min-width:44px") &&
      (css.match(/min-height:44px/g) || []).length >= 4;
    expect(sized(readFileSync("app/src/wq-css.js", "utf8"))).toBe(true);
    // fixture control: a stylesheet with shrunken controls must fail this check
    expect(sized(".wq-cta{min-height:40px}.wq-sbtn{min-height:40px;min-width:40px}")).toBe(false);
  });
});
