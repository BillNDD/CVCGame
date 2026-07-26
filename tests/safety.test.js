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
import { saveState as mockSave, loadState as mockLoad } from "../app/src/storage.js";

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
const { newState } = await import("../src/engine.js");
const { installRefresh } = await import("../app/src/swrefresh.js");
const GRACE_MS = 2000;                        // literal, per rule E4

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
  localStorage.clear();                       // W4b: device markers must not leak between tests
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
  it("8: a recognizer whose stop() answers with end strikes once with a lasting message, twice into visit-only grown-up grading", async () => {
    await startListening();                                  // the double never fires any event
    const writesAfterBoot = mockSave.mock.calls.length;
    await flush(8000);                                       // the watchdog window; stop() -> onend
    expect(screen.getByText(/Record again/)).toBeTruthy();     // back to ready, mic still offered
    expect(screen.getAllByText("Didn’t catch that — tap to try again.").length).toBeGreaterThan(0);
    await flush(4000);                                       // the toast expires at 3200 ms…
    expect(screen.getAllByText("Didn’t catch that — tap to try again.").length).toBeGreaterThan(0); // …the slot message stays
    fireEvent.click(screen.getByText(/Record again/));       // second silent attempt
    await flush(8000);
    expect(screen.queryByText(/Start Recording|Record again/)).toBeNull(); // grown-up grading this visit
    expect(screen.getAllByText(/grown-up grading for this visit/).length).toBeGreaterThan(0);
    expect(mockSave.mock.calls.length).toBe(writesAfterBoot);  // S1: nothing recorded
    for (const call of mockSave.mock.calls) expect(call[0].settings.mode).toBe("mic");
  });

  it("8b: the true in-app-browser trap — no event ever, and stop() does nothing — is rescued by the grace window", async () => {
    /* The original child-trapping freeze. The default double is too polite:
       its stop() fires onend, so test 8 never reaches the grace path that
       docs/qa-procedure.md step 32 promises. This recognizer answers
       nothing at all, which is what an in-app browser view really does. */
    await startListening();
    recInstances.at(-1).stop = () => {};                     // stop() cannot end it either
    await flush(8000);                                       // the watchdog fires and asks it to stop
    expect(screen.queryByText("Didn’t catch that — tap to try again.")).toBeNull(); // still judging
    await flush(GRACE_MS);                                   // the grace expires: nothing came
    expect(screen.getByText(/Record again/)).toBeTruthy();     // ~10 s: the child is free
    expect(screen.getAllByText("Didn’t catch that — tap to try again.").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText(/Record again/));
    await flush(0);
    recInstances.at(-1).stop = () => {};
    await flush(8000 + GRACE_MS);                            // a second dead attempt escalates
    expect(screen.queryByText(/Start Recording|Record again/)).toBeNull();
    expect(screen.getAllByText(/grown-up grading for this visit/).length).toBeGreaterThan(0);
  });

  it("8c: a dead recognizer whose stop() throws is rescued by the same grace window", async () => {
    await startListening();
    recInstances.at(-1).stop = () => { throw new Error("dead recognizer"); };
    await flush(8000 + GRACE_MS);
    expect(screen.getByText(/Record again/)).toBeTruthy();
    expect(screen.getAllByText("Didn’t catch that — tap to try again.").length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/grown-up grading for this visit/).length).toBeGreaterThan(0);
    // the saved setting never changes: no write may carry mode "parent"
    for (const call of mockSave.mock.calls) expect(call[0].settings.mode).toBe("mic");
  });

  it("11: an instant silent end is never a wordless no-op — message first, visit fallback second", async () => {
    await startListening();
    await act(async () => { recInstances.at(-1).onend(); }); // start -> end, no result, no error
    expect(screen.getByText(/Record again/)).toBeTruthy();
    expect(screen.getAllByText("Didn’t catch that — tap to try again.").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText(/Record again/));
    await flush(0);
    await act(async () => { recInstances.at(-1).onend(); }); // the environment is dead: escalate
    expect(screen.queryByText(/Start Recording|Record again/)).toBeNull();
    expect(screen.getAllByText(/grown-up grading for this visit/).length).toBeGreaterThan(0);
    for (const call of mockSave.mock.calls) expect(call[0].settings.mode).toBe("mic");
  });

  it("12: a result that arrives after Stop still confirms a correct reading (iOS delivers after stop)", async () => {
    const word = await startListening();
    const rec = recInstances.at(-1);
    rec.stop = () => {};                                     // iOS: stop() returns, the result follows
    fireEvent.click(screen.getByText(/Stop/));
    await flush(0);
    expect(screen.getByText(/Record again/)).toBeTruthy();   // N-8: Stop changed the screen at once
    await hear(word);                                        // the finalized result, inside the grace window
    expect(screen.getAllByText(/Great job! That is/).length).toBeGreaterThan(0);
    const saved = mockSave.mock.calls.at(-1)[0].words[word];
    expect(saved.correct).toBe(1);                           // S1: recognition confirmed correct, once
  });

  it("13: a tardy error from a stopped recognizer can never tear down the feedback phase", async () => {
    const word = await startListening();
    const rec = recInstances.at(-1);
    const lateError = rec.onerror;                           // keep the handler a real browser would fire
    await hear(word);                                        // attempt ends, feedback begins
    await act(async () => { lateError({ error: "no-speech" }); });
    expect(screen.getAllByText(/Great job! That is/).length).toBeGreaterThan(0); // feedback intact
    expect(screen.queryByText("Didn’t catch that — tap to try again.")).toBeNull();
    expect(screen.queryByText(/Record again|Start Recording/)).toBeNull();       // still in feedback
  });

  it("14: a pending result after a grade can never record the word twice", async () => {
    const word = await startListening();
    const lateResult = recInstances.at(-1).onresult;
    await hear(word);                                        // grades correct, once
    const writes = mockSave.mock.calls.length;
    await act(async () => { lateResult({ results: [[{ transcript: word }]] }); });
    expect(mockSave.mock.calls.length).toBe(writes);         // S1: no second record
  });

  it("15: the watchdog re-arms while the engine shows life, so a slow reader is never cut off", async () => {
    const word = await startListening();
    const rec = recInstances.at(-1);
    await flush(7000);                                       // the child is still thinking
    await act(async () => { rec.onaudiostart(); });          // the engine reports sound
    await flush(7000);                                       // 14 s total: past the fixed 8 s window
    expect(screen.getByText(/Stop/)).toBeTruthy();           // still listening — not cut off
    expect(screen.queryByText("Didn’t catch that — tap to try again.")).toBeNull();
    await hear(word);                                        // the slow, correct reading still lands
    expect(screen.getAllByText(/Great job! That is/).length).toBeGreaterThan(0);
  });

  it("15b: a Stop the child chose is never counted against the microphone", async () => {
    /* The default double's stop() fires onend — a healthy engine's shape.
       Two deliberate Stops must leave a healthy microphone on offer. */
    await startListening();
    fireEvent.click(screen.getByText(/Stop/));
    await flush(0);
    expect(screen.getByText(/Record again/)).toBeTruthy();
    expect(screen.queryByText("Didn’t catch that — tap to try again.")).toBeNull(); // not a fault
    fireEvent.click(screen.getByText(/Record again/));
    await flush(0);
    fireEvent.click(screen.getByText(/Stop/));
    await flush(0);
    expect(screen.getByText(/Record again/)).toBeTruthy();       // still offered, not blocked
    expect(screen.queryByText(/grown-up grading for this visit/)).toBeNull();
  });

  it("15c: tapping Record again over a live attempt starts cleanly, with no visit lockout", async () => {
    await startListening();
    fireEvent.click(screen.getByText(/Stop/));                   // inside the grace window
    await flush(0);
    fireEvent.click(screen.getByText(/Record again/));           // the natural double tap
    await flush(0);
    expect(screen.getByText(/Stop/)).toBeTruthy();               // listening again
    expect(screen.queryByText(/grown-up grading for this visit/)).toBeNull();
  });

  it("15d: 'Keep reading' after a mid-listen exit never leaves the screen claiming to listen", async () => {
    await startListening();
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    fireEvent.click(screen.getByText(/Keep reading/));
    await flush(0);
    expect(screen.queryByText("🎙️ Listening…")).toBeNull();     // honest state
    expect(screen.getByText(/Record again/)).toBeTruthy();
  });

  it("15e: a browser that cannot listen never writes grown-up mode into the save", async () => {
    /* The saved setting is the child's, not the browser's: a visit without
       speech recognition shows grown-up grading but stores nothing. */
    const realSR = window.webkitSpeechRecognition;
    try {
      window.webkitSpeechRecognition = undefined;
      vi.resetModules();
      const { default: NoSR } = await import("../app/src/App.jsx");
      render(createElement(NoSR));
      await flush(0);
      fireEvent.click(screen.getByText("▶️ Begin Session"));
      await flush(0);
      expect(screen.queryByText(/Start Recording|Record again/)).toBeNull(); // grown-up grading shown
      for (const call of mockSave.mock.calls) expect(call[0].settings.mode).toBe("mic");
    } finally { window.webkitSpeechRecognition = realSR; vi.resetModules(); }
  });

  it("16: a mode wrongly saved as grown-up by an old version heals back to microphone, one time", async () => {
    const poisoned = newState(); poisoned.settings.mode = "parent";
    mockLoad.mockResolvedValueOnce(structuredClone(poisoned));
    render(createElement(App));
    await flush(0);
    expect(screen.getByText(/microphone is switched back on/)).toBeTruthy();
    expect(mockSave.mock.calls.at(-1)[0].settings.mode).toBe("mic");
    cleanup();
    // control: an explicit adult choice is never overridden
    localStorage.clear(); localStorage.setItem("wq-mode-chosen", "1");
    mockLoad.mockResolvedValueOnce(structuredClone(poisoned));
    render(createElement(App));
    await flush(0);
    expect(screen.queryByText(/microphone is switched back on/)).toBeNull();
  });
});

describe("G10 safety — W4c: an update never reloads under a child", () => {
  /* A new version taking control must not take the screen away mid-session:
     the words already read would leave the session total, and the child
     would lose an attempt in progress. */
  function refreshDouble({ controller = {}, screen = "home" } = {}) {
    const out = { reloads: 0 };
    let fire = () => {}, tell = () => {};
    installRefresh({
      nav: {
        controller,
        addEventListener: (ev, fn) => { if (ev === "controllerchange") fire = fn; },
      },
      reload: () => { out.reloads += 1; },
      onScreen: (fn) => { tell = fn; fn(screen); },
    });
    out.takeover = () => fire();
    out.goTo = (s) => tell(s);
    return out;
  }

  it("17: a new version mid-session waits for the session to end, then refreshes once", async () => {
    const sw = refreshDouble({ screen: "session" });
    sw.takeover();
    expect(sw.reloads).toBe(0);              // the child keeps playing
    sw.goTo("done");
    expect(sw.reloads).toBe(1);              // safe moment: the new code takes over
    sw.goTo("home"); sw.takeover();
    expect(sw.reloads).toBe(1);              // and only ever once
  });

  it("18 (control): with no session running the refresh is immediate, and a first install never reloads", () => {
    const idle = refreshDouble({ screen: "home" });
    idle.takeover();
    expect(idle.reloads).toBe(1);
    const first = refreshDouble({ controller: null, screen: "home" });
    first.takeover();
    expect(first.reloads).toBe(0);           // nothing is stale on the first load
  });
});

describe("G10 safety — S6 and S7: no network, big controls", () => {
  it("6: no app source makes a network call", () => {
    const files = [
      "app/src/App.jsx", "app/src/main.jsx", "app/src/storage.js", "app/src/wq-css.js",
      "app/src/screens/HomeScreen.jsx", "app/src/screens/SessionScreen.jsx",
      "app/src/screens/DoneScreen.jsx", "app/src/screens/ParentScreen.jsx",
      "app/src/voicepacks.js",
    ];
    const NET = /\bfetch\s*\(|XMLHttpRequest|new WebSocket|sendBeacon|gtag\(|analytics/;
    for (const f of files) {
      // the voice-pack adapter may fetch its own same-origin clips, nothing else
      const src = readFileSync(f, "utf8").replaceAll('fetch("voice/', 'LOCAL_CLIP("voice/');
      expect(NET.test(src)).toBe(false);
    }
    expect(NET.test('const r = await fetch("https://api.example.com");')).toBe(true); // control
    expect(NET.test('fetch("voice/manifest.json")'.replaceAll('fetch("voice/', 'LOCAL_CLIP("voice/'))).toBe(false);
    expect(NET.test('fetch("https://x.test/voice/a.mp3")')).toBe(true); // a remote clip URL still trips
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
