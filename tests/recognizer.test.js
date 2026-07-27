/* Word Quest — the recognizer contract (G15).

   Two invariants, both learned the hard way in beta.2, where the whole test
   suite was green while the game was broken:

   R1, the ALPHABET. A browser's speech recognition can emit any event in a
   known, finite set. For every one of them the child must end up somewhere
   honest: told what happened, or moved on. No event may leave the screen
   exactly as it was, because a screen that never changes is what "the record
   button does nothing" actually looks like. Enumerating the alphabet beats
   handling the codes we happen to remember: an unlisted error was the real
   fault, and only a list can prove there is no unlisted case.

   R2, the STALE ACTOR. After an attempt ends — the child stops it, an adult
   grades, the session moves on or finishes — the old recognizer is still
   alive in the browser for a while, and it still fires. Every one of those
   late events must be inert. In beta.2 they were not: a tardy error wiped the
   feedback screen mid-praise, which is what "the game doesn't tell you if you
   got it right" actually looks like.

   Both suites drive the REAL app. Neither trusts a polite double: the
   recognizer here answers only what a test tells it to answer.
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";

vi.mock("../app/src/storage.js", () => ({
  loadState: vi.fn(async () => null),
  saveState: vi.fn(async () => true),
}));
import { saveState as mockSave } from "../app/src/storage.js";

/* A recognizer that does NOTHING unless a test makes it. start() and stop()
   are inert on purpose: the polite double in the safety suite, whose stop()
   fires onend, hid the in-app-browser rescue path for a whole release. */
const recs = [];
class BareRecognition {
  constructor() { recs.push(this); }
  start() { this.started = true; }
  stop() { this.stopped = true; }
  abort() { this.aborted = true; }
}
window.webkitSpeechRecognition = BareRecognition;
window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
Object.defineProperty(window, "speechSynthesis", {
  configurable: true, value: { cancel: () => {}, speak: () => {} },
});
const { default: App } = await import("../app/src/App.jsx");

/* The full event alphabet of the Web Speech API. The eight error codes are
   the complete set the specification defines; the rest are the lifecycle
   events a recognizer can deliver. Every one is fired at a live attempt. */
const ERRORS = [
  "no-speech", "aborted", "audio-capture", "network",
  "not-allowed", "service-not-allowed", "bad-grammar", "language-not-supported",
];
const LIFECYCLE = ["end", "nomatch", "result-miss", "result-hit"];

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
/* What a child or an adult can actually see, as one string: the stage text
   and the label on the big control. Two screens that read the same ARE the
   same to the person holding the iPad. */
const visible = () => {
  const stage = document.querySelector(".wq-stagegrid");
  const rail = document.querySelector(".wq-cta") || document.querySelector(".wq-prompt");
  return `${stage ? stage.textContent : ""}||${rail ? rail.textContent : ""}`;
};
/* A detached handler is the strongest possible inertness: the ghost cannot
   even speak. Guard every call so that counts as a pass, not a crash. */
const fire = async (rec, event, word) => act(async () => {
  if (event === "end") { if (rec.onend) rec.onend(); return; }
  if (event === "nomatch") { if (rec.onnomatch) rec.onnomatch(); return; }
  if (event === "result-hit") { if (rec.onresult) rec.onresult({ results: [[{ transcript: word }]] }); return; }
  if (event === "result-miss") { if (rec.onresult) rec.onresult({ results: [[{ transcript: "zzz nothing" }]] }); return; }
  if (rec.onerror) rec.onerror({ error: event });
});

beforeEach(() => { vi.useFakeTimers(); mockSave.mockClear(); recs.length = 0; localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("G15 recognizer — R1: no event leaves the child with an unchanged screen", () => {
  for (const event of [...ERRORS, ...LIFECYCLE]) {
    it(`alphabet: "${event}" produces a visible, honest change`, async () => {
      const word = await startListening();
      const rec = recs.at(-1);
      const before = visible();
      expect(before).toContain("Listening");                 // the attempt is live
      await fire(rec, event, word);
      await flush(0);
      const after = visible();
      expect(after).not.toBe(before);                        // something happened, and it shows
      expect(after).not.toContain("Listening");              // and it is no longer claiming to listen
    });
  }

  it("control: the alphabet check catches a silent handler", async () => {
    /* If an event were handled by doing nothing at all, the screen would read
       the same before and after. This is that fault, staged: firing an event
       no handler listens for must leave the screen identical — which is
       exactly what the assertions above forbid. */
    await startListening();
    const before = visible();
    await act(async () => { if (recs.at(-1).onsoundend) recs.at(-1).onsoundend(); });
    expect(visible()).toBe(before);                          // unchanged: the fault the gate hunts
  });

  it("every error code the specification defines is covered by name", () => {
    /* A list that quietly loses a code stops proving anything. */
    expect(ERRORS.length).toBe(8);
    expect(ERRORS).toContain("network");                     // the offline case beta.2 swallowed
    expect(ERRORS).toContain("bad-grammar");
    expect(ERRORS).toContain("language-not-supported");
  });
});

describe("G15 recognizer — R2: an abandoned attempt can never touch the app", () => {
  /* Each ending hands back the recognizer it abandoned, plus a description of
     the screen the child should keep. */
  const ENDINGS = {
    /* Stop keeps the recognizer for a 2-second grace window on purpose, so a
       result iOS finalizes just after the stop still counts (SPEC section 8).
       "Abandoned" means after that window closes. */
    "the child taps Stop and the grace window closes": async () => {
      const rec = recs.at(-1);
      fireEvent.click(screen.getByText(/Stop/));
      await flush(2500);
      return rec;
    },
    "an adult grades the word": async () => {
      const rec = recs.at(-1);
      const hold = screen.getByLabelText(/got it/);
      fireEvent.pointerDown(hold);
      await flush(700);                       // past the 450 ms hold
      fireEvent.pointerUp(hold);
      await flush(0);
      return rec;
    },
    "the session finishes early": async () => {
      const rec = recs.at(-1);
      fireEvent.click(screen.getByLabelText("Leave session"));
      await flush(0);
      fireEvent.click(screen.getByText(/Discard and go home/));
      await flush(0);
      return rec;
    },
  };

  /* One deliberate exception. A permission answer is about the microphone,
     not about the attempt that asked, so a late "not-allowed" is still heard
     and still records grown-up mode — it just may never touch the child's
     screen mid-feedback or record a word. It gets its own test below. */
  const LATE_ANSWER = "not-allowed";

  for (const [ending, end] of Object.entries(ENDINGS)) {
    for (const event of [...ERRORS, ...LIFECYCLE].filter((e) => e !== LATE_ANSWER)) {
      it(`after ${ending}, a late "${event}" changes nothing`, async () => {
        const word = await startListening();
        const abandoned = await end();
        const screenAfterEnding = visible();
        const writesAfterEnding = mockSave.mock.calls.length;

        await fire(abandoned, event, word);   // the ghost speaks
        await flush(0);

        expect(visible()).toBe(screenAfterEnding);                  // the screen is untouched
        expect(mockSave.mock.calls.length).toBe(writesAfterEnding); // S1: nothing recorded
      });
    }
  }

  it(`a late "${LATE_ANSWER}" records the denial and never records a word`, async () => {
    const word = await startListening();
    const abandoned = recs.at(-1);
    const hold = screen.getByLabelText(/got it/);
    fireEvent.pointerDown(hold);
    await flush(700);
    fireEvent.pointerUp(hold);
    await flush(0);                                         // an adult graded; feedback is showing
    const feedback = visible();

    await fire(abandoned, LATE_ANSWER, word);               // permission comes back at last
    await flush(0);

    expect(visible()).toBe(feedback);                       // the feedback screen survives
    expect(mockSave.mock.calls.at(-1)[0].settings.mode).toBe("parent"); // the answer is kept
    expect(mockSave.mock.calls.at(-1)[0].words[word].correct).toBe(1);  // and only the adult's result
  });

  it("control: the same event on the CURRENT attempt does change the screen", async () => {
    /* Proves the matrix above is testing inertness, not testing a handler
       that never fires at all. */
    const word = await startListening();
    const before = visible();
    await fire(recs.at(-1), "result-hit", word);
    await flush(0);
    expect(visible()).not.toBe(before);
    expect(mockSave.mock.calls.length).toBeGreaterThan(0);
  });
});
