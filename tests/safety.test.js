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
  stop() { this.stopped = true; if (this.onend) this.onend(); }
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
const { ADULT_JUDGED } = await import("../src/engine.js");
const GRACE_MS = 2000;                        // literal, per rule E4

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
/* SPEC section 3 flags five Level 1 words that offer no microphone, and the
   session order is shuffled. Any test about recording must first reach a word
   that actually offers the control. The adult's keyboard grade advances past
   a flagged word without touching recognition. */
const skipAdultJudgedWords = async () => {
  for (let i = 0; i < 12 && ADULT_JUDGED[document.querySelector(".wq-word").textContent]; i++) {
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(500);
    fireEvent.click(screen.getByText(/Next word|Finish!/));
    await flush(0);
  }
};
const startListening = async () => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByText("▶️ Begin Session"));
  await flush(0);
  await skipAdultJudgedWords();
  /* Skipping is setup, not subject: a grade spoken on the way must not count
     as speech during the attempt under test. */
  utterances.length = 0; rates.length = 0; cancels.n = 0;
  fireEvent.click(screen.getByText(/Start Recording|Record again/));
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

  /* A microphone hears the room, not only the child. The old rule accepted the
     attempt when ANY word inside the transcript matched, so an adult prompting
     aloud — "come on, you know this one, it is in" — marked the word read, and
     eight of the twelve first-session words are among the commonest words in
     English. A reading is the word, or the word with one piece of filler
     beside it. Found by an audit of the running build, 2026-07-29. */
  it("2a: a word buried in a sentence is NOT a reading, and records nothing", async () => {
    const word = await startListening();
    const writes = mockSave.mock.calls.length;
    await hear(`come on you know this one it is ${word}`);
    expect(screen.getByText("Nice try! Grown-up will check. 👇")).toBeTruthy();
    expect(mockSave.mock.calls.length).toBe(writes);
  });

  it("2b: a reading with one word of filler beside it still counts", async () => {
    const word = await startListening();
    await hear(`${word} mummy`);
    expect(screen.getAllByText(/Great job! That is/).length).toBeGreaterThan(0);
    expect(mockSave.mock.calls.at(-1)[0].words[word].correct).toBe(1);
  });

  it("2c: three words is a sentence, not a reading", async () => {
    const word = await startListening();
    const writes = mockSave.mock.calls.length;
    await hear(`is it ${word}`);
    expect(screen.getByText("Nice try! Grown-up will check. 👇")).toBeTruthy();
    expect(mockSave.mock.calls.length).toBe(writes);
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
    expect(rates.at(-1)).toBe(0.9);                         // the reveal is clear, never stretched
    await flush(500);
    const replay = screen.getByRole("button", { name: "Hear the word again" });
    expect(replay.disabled).toBe(false);
    fireEvent.click(replay);
    expect(utterances.at(-1)).toBe(word);                   // replay says the whole word
    expect(rates.at(-1)).toBe(0.9);                         // the same rate as the reveal
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

  /* A2-002 / A2-013 — the exit dialog is an ending, not a pause. It used to
     open over a live recognizer: the stage still claimed to listen, a reading
     that arrived behind it was recorded, and recording it made the dialog's
     own controls move. */
  it("15j: opening the exit dialog ends the attempt instead of listening behind it", async () => {
    await startListening();
    const rec = recInstances[recInstances.length - 1];
    expect(rec.started).toBe(true);
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    expect(screen.getByText("Finish early?")).toBeTruthy();       // the dialog is open
    expect(rec.stopped).toBe(true);                               // and the attempt is over
    expect(screen.queryByText("🎙️ Listening…")).toBeNull();
  });

  it("15k: a reading cannot reach the app once the exit dialog is open", async () => {
    await startListening();
    const rec = recInstances[recInstances.length - 1];
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    expect(rec.onresult).toBeNull();                              // detached, not merely ignored
    /* The dialog's own sentence counts what has been read, so an unchanged
       sentence across the whole grace window is an unchanged count. */
    const said = document.querySelector(".wq-modal p").textContent;
    await flush(GRACE_MS);
    expect(document.querySelector(".wq-modal p").textContent).toBe(said);
  });

  it("15l: the exit dialog's controls hold their places whether or not a word has been read", async () => {
    const labels = () => [...document.querySelectorAll(".wq-modal button")]
      .map(b => [b.textContent, b.disabled]);
    /* A fresh session, not startListening: skipping the words that offer no
       microphone grades them, and this test needs a session with nothing
       recorded yet whatever order the shuffle produced. */
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    expect(labels()).toEqual([
      ["Save as a short session", true],
      ["Discard and go home", false],
      ["Keep reading", false],
    ]);
    fireEvent.click(screen.getByText(/Keep reading/));
    await flush(0);
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(500);
    fireEvent.click(screen.getByText(/Next word|Finish!/));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    expect(labels()).toEqual([
      ["Save 1 as a short session", false],
      ["Discard and go home", false],
      ["Keep reading", false],
    ]);
  });

  /* A2-010 — one message, one home. Every microphone message used to be set as
     both a slot note and a toast, so it appeared twice at once and was
     announced twice: the slot is a live region when sound is off, the toast is
     one always. The slot keeps the message until the next action; the toast
     dropped it after 3200 ms. */
  it("15m: a microphone failure is written once, and does not fade", async () => {
    await startListening();
    const rec = recInstances.at(-1);
    await act(async () => { rec.onerror({ error: "no-speech" }); });
    expect(screen.getAllByText("Didn’t catch that — tap to try again.").length).toBe(1);
    expect(document.querySelector(".wq-toast")).toBeNull();
    await flush(4000);                            // past the 3200 ms a toast lived
    expect(screen.getAllByText("Didn’t catch that — tap to try again.").length).toBe(1);
  });

  it("15n (control): a grown-up confirmation with no slot of its own still toasts", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    const levels = screen.getByText("Jump to level").parentElement.querySelectorAll(".wq-segbtn");
    fireEvent.click(levels[1]);                   // level 2
    await flush(0);
    expect(document.querySelector(".wq-toast").textContent).toContain("Level set to 2");
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

  it("15f: a browser that cannot listen SAYS SO on the page, on every word", async () => {
    /* The fault this pins: the sentence existed, but only inside startRec —
       which runs from a button that is never rendered when the browser cannot
       listen. It was unreachable code, and a Firefox tester saw a game that
       had silently lost its microphone with no explanation anywhere. */
    const realSR = window.webkitSpeechRecognition;
    try {
      window.webkitSpeechRecognition = undefined;
      vi.resetModules();
      const { default: NoSR } = await import("../app/src/App.jsx");
      render(createElement(NoSR));
      await flush(0);
      fireEvent.click(screen.getByText("▶️ Begin Session"));
      await flush(0);
      expect(screen.getByText(
        "Parent: this browser can’t listen. Chrome, Edge or Safari can use the microphone."
      )).toBeTruthy();
      // and it survives advancing: it is true of the next word too
      fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
      await flush(500);
      fireEvent.click(screen.getByText(/Next word|Finish!/));
      await flush(0);
      expect(screen.getByText(
        "Parent: this browser can’t listen. Chrome, Edge or Safari can use the microphone."
      )).toBeTruthy();
    } finally { window.webkitSpeechRecognition = realSR; vi.resetModules(); }
  });

  it("15g: a permission denial explains itself for as long as it lasts", async () => {
    await startListening();
    const rec = recInstances.at(-1);
    await act(async () => { rec.onerror({ error: "not-allowed" }); });
    /* The reported fault: the reason appeared for one word and was wiped on
       the next, leaving a permanently changed app with no explanation. */
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(500);
    fireEvent.click(screen.getByText(/Next word|Finish!/));
    await flush(4000);                                    // past the 3200 ms toast
    expect(screen.getByText(
      "Parent: microphone permission is off. Allow it, then choose the microphone in the Grown-ups corner."
    )).toBeTruthy();
  });

  it("15h: an adult who CHOSE grown-up mode is never nagged about it", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    fireEvent.click(screen.getByText("👍 You judge"));
    await flush(0);
    fireEvent.click(screen.getByText("← Back"));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    expect(screen.queryByText(/this browser can’t listen|permission is off/)).toBeNull();
  });

  it("15i: the Grown-ups corner explains its own disabled microphone option", async () => {
    const realSR = window.webkitSpeechRecognition;
    try {
      window.webkitSpeechRecognition = undefined;
      vi.resetModules();
      const { default: NoSR } = await import("../app/src/App.jsx");
      render(createElement(NoSR));
      await flush(0);
      fireEvent.click(screen.getByLabelText("Grown-ups corner"));
      await flush(0);
      expect(screen.getByText(
        "This browser can’t listen. Chrome, Edge or Safari can use the microphone."
      )).toBeTruthy();
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

describe("G10 safety — S4: a word the microphone cannot judge fairly", () => {
  it("19: the note is never spoken — letter names must not reach speech", () => {
    const app = readFileSync("app/src/App.jsx", "utf8");
    const session = readFileSync("app/src/screens/SessionScreen.jsx", "utf8");
    const spoken = (src) =>
      [...src.matchAll(/^.*\b(speak|speakVoice)\s*\(.*$/gm)].filter((m) => m[0].includes("adultNote"));
    expect(spoken(app).length).toBe(0);
    expect(spoken(session).length).toBe(0);
    // fixture control: a call site that speaks the note must trip the scan
    expect(spoken('speak([{ text: adultNote(word) }], true, lang);').length).toBe(1);
  });

  it("20: such a word offers no microphone and tells the adult why", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    /* Level 1's first session serves all twelve words, five of them flagged.
       Walk until one arrives; every ordinary word on the way must still
       offer the microphone. */
    for (let i = 0; i < 12; i++) {
      const word = document.querySelector(".wq-word").textContent;
      if (ADULT_JUDGED[word]) {
        expect(screen.queryByText(/Start Recording|Record again/)).toBeNull();
        expect(screen.getByText(
          new RegExp(`^Parent: "${word}" and ".+" are nearly indistinguishable, please act as judge here$`)
        )).toBeTruthy();
        expect(screen.getByText(/say the word out loud/i)).toBeTruthy();  // the grown-up prompt
        return;
      }
      expect(screen.getByText(/Start Recording|Record again/)).toBeTruthy();
      fireEvent.click(screen.getByText(/Start Recording|Record again/));
      await flush(0);
      await hear(word);
      await flush(500);
      fireEvent.click(screen.getByText(/Next word|Finish!/));
      await flush(0);
    }
    throw new Error("no flagged word appeared in a Level 1 session");
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

/* Free play (SPEC section 6): the same loop, endless, against a throwaway
   clone - and NOTHING is ever written. This is the mode's whole promise to
   the parent, so it gets the same treatment as a safety rule: the tests
   below prove no grade, no exit, and no amount of play reaches the save,
   with a real session as the control proving the probe can see a write. */
describe("G10 — free play never touches the save", () => {
  /* The tap opens a chooser first (SPEC section 6): truly random, or the
     child's level. Tests that only care about free play itself enter through
     the level choice, matched by its emoji because the home card also says
     "Level 1". */
  const enterFreePlay = async (choice = /🎯 Level/) => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("🎈 Free play"));
    await flush(0);
    fireEvent.click(screen.getByText(choice));
    await flush(0);
  };
  const gradeOne = async (label) => {
    fireEvent.keyDown(screen.getByLabelText(label), { key: "Enter" });
    await flush(500);
    fireEvent.click(screen.getByText(/Next word/));
    await flush(0);
  };

  it("40: rights, wrongs and leaving write nothing at all", async () => {
    await enterFreePlay();
    const before = mockSave.mock.calls.length;
    await gradeOne("✓ got it (hold)");
    await gradeOne("↻ not yet (hold)");
    await gradeOne("~ close (hold)");
    expect(mockSave.mock.calls.length).toBe(before);
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    expect(mockSave.mock.calls.length).toBe(before);
    /* straight home - no save/discard dialog, because there is nothing to save */
    expect(screen.getByText("▶️ Begin Session")).toBeTruthy();
    expect(screen.queryByText("Finish early?")).toBeNull();
  });

  it("41 (control): the same grades in a real session DO reach the save", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    const before = mockSave.mock.calls.length;
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(500);
    expect(mockSave.mock.calls.length).toBeGreaterThan(before);
  });

  it("42: free play never says Finish and rolls into a new block", async () => {
    await enterFreePlay();
    /* a fresh save on Level 1 builds a 12-word block; walk it to the end */
    for (let i = 0; i < 11; i++) await gradeOne("✓ got it (hold)");
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(500);
    /* the last slot of the block still says Next word - free play has no end */
    expect(screen.getByText("Next word ➡️")).toBeTruthy();
    expect(screen.queryByText(/Finish!/)).toBeNull();
    fireEvent.click(screen.getByText("Next word ➡️"));
    await flush(0);
    /* a new block began seamlessly: still in the session, no Done screen */
    expect(document.querySelector(".wq-word")).toBeTruthy();
    expect(screen.queryByText(/Great reading today/)).toBeNull();
    expect(screen.getByText("12 words")).toBeTruthy();
  });

  it("43: the header says FREE PLAY with a count-up, never x of 20", async () => {
    await enterFreePlay();
    expect(screen.getByText("FREE PLAY")).toBeTruthy();
    expect(screen.getByText("0 words")).toBeTruthy();
    await gradeOne("✓ got it (hold)");
    expect(screen.getByText("1 word")).toBeTruthy();
    expect(screen.queryByText(/\/12|\/20/)).toBeNull();
  });

  it("44: a chooser stands between the tap and the game, and Back starts nothing", async () => {
    render(createElement(App));
    await flush(0);
    const before = mockSave.mock.calls.length;
    fireEvent.click(screen.getByText("🎈 Free play"));
    await flush(0);
    /* no word yet - the grown-up's choice comes first */
    expect(document.querySelector(".wq-word")).toBeNull();
    expect(screen.getByText("🎲 Truly random")).toBeTruthy();
    expect(screen.getByText(/🎯 Level 1/)).toBeTruthy();
    fireEvent.click(screen.getByText("Back"));
    await flush(0);
    expect(screen.getByText("▶️ Begin Session")).toBeTruthy();
    expect(screen.queryByText("🎲 Truly random")).toBeNull();
    expect(document.querySelector(".wq-word")).toBeNull();
    expect(mockSave.mock.calls.length).toBe(before);
  });

  it("45: truly random draws from the whole bank, not the child's level", async () => {
    /* Math.random pinned high makes every draw take the end of the pool, so
       the first word served is the bank's LAST word - "limb", deep in
       Level 9. A fresh Level 1 save can never see it in a session or in
       level free play: buildSession serves Level 1 plus review only. The
       expected word is a literal on purpose (E4); if the bank ever gains a
       new last word, this is the line to update. */
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.9999999);
    try {
      await enterFreePlay("🎲 Truly random");
      expect(document.querySelector(".wq-word").textContent).toBe("limb");
      /* control: the SAME pin through the level door serves a Level 1 word -
         the pin alone cannot conjure "ping"; only the random door can. */
      cleanup();
      await enterFreePlay();
      expect(["at", "an", "am", "ax", "in", "it", "if", "is", "on", "ox", "up", "us"])
        .toContain(document.querySelector(".wq-word").textContent);
    } finally { spy.mockRestore(); }
  });

  it("46: random play writes nothing and says what it is", async () => {
    await enterFreePlay("🎲 Truly random");
    expect(screen.getByText("FREE PLAY")).toBeTruthy();
    /* the dice chip: the level chip would claim a level this mode is not serving */
    expect(screen.getByText("🎲")).toBeTruthy();
    expect(screen.queryByText(/1 🐣/)).toBeNull();
    const before = mockSave.mock.calls.length;
    await gradeOne("✓ got it (hold)");
    await gradeOne("↻ not yet (hold)");
    expect(mockSave.mock.calls.length).toBe(before);
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    expect(mockSave.mock.calls.length).toBe(before);
    expect(screen.getByText("▶️ Begin Session")).toBeTruthy();
    expect(screen.queryByText("Finish early?")).toBeNull();
  });

  it("47: a spent random block rolls into a fresh draw that never repeats the boundary word", async () => {
    /* Pinned at the top of the pool, the first block is the bank's last 20
       words in reverse - "limb" first, "chuck" last - with no repeats, since
       a repeat inside a block would collide with its own first result and be
       graded as a retry. At the boundary the pin moves to 0.935: the guard
       keeps the word the child just read ("chuck") out of the next block's
       first slot, which opens on "knot"; "lamb" second proves "chuck" was
       pushed back into the pool - excluded from the first slot only, not
       from the game. All literals (E4), recomputed for the 349-word bank. */
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.9999999);
    try {
      await enterFreePlay("🎲 Truly random");
      const seen = [];
      for (let i = 0; i < 19; i++) {
        seen.push(document.querySelector(".wq-word").textContent);
        await gradeOne("✓ got it (hold)");
      }
      seen.push(document.querySelector(".wq-word").textContent);
      expect(seen[0]).toBe("limb");
      expect(seen[19]).toBe("chuck");
      expect(new Set(seen).size).toBe(20);
      spy.mockReturnValue(0.935);
      await gradeOne("✓ got it (hold)");
      expect(screen.getByText("20 words")).toBeTruthy();
      expect(document.querySelector(".wq-word").textContent).toBe("knot");
      await gradeOne("✓ got it (hold)");
      expect(document.querySelector(".wq-word").textContent).toBe("lamb");
    } finally { spy.mockRestore(); }
  });
});

/* S6's second network call (SPEC section 7a), owner-approved 2026-08-03 on
   two conditions: plain words in the corner, and an Off that means ZERO
   requests. The test drives the real app, not the module. */
describe("G10 safety — S6: the foreground check obeys the corner's switch", () => {
  it("48: the check asks on a return to the foreground, and Off silences it at once", async () => {
    const update = vi.fn(async () => {});
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: async () => ({ update }) },
    });
    try {
      render(createElement(App));
      await flush(0);
      document.dispatchEvent(new Event("visibilitychange"));
      await flush(0);
      expect(update).toHaveBeenCalledTimes(1);            // on by default: the return asks once
      fireEvent.click(screen.getByLabelText("Grown-ups corner"));
      await flush(0);
      fireEvent.click(screen.getByText("Off"));           // the update switch: the only bare "Off"
      await flush(0);
      document.dispatchEvent(new Event("visibilitychange"));
      await flush(0);
      expect(update).toHaveBeenCalledTimes(1);            // off means zero further requests
    } finally {
      delete navigator.serviceWorker;
    }
  });
});
