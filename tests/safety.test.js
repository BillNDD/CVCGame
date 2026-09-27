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
  loadState: vi.fn(async () => null),   // per-test boots override below
  saveState: vi.fn(async () => true),
}));
import { saveState as mockSave, loadState as mockLoad } from "../app/src/storage.js";

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
const { sourcesFor } = await import("../tools/app-sources.mjs");

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
/* Every word is now the adult's to judge, so a session is entered the same
   way for every test: begin, and the first word is on screen. There used to be
   a startListening() here that tapped the child's record control, and a
   skipAdultJudgedWords() that walked past the five words recognition could not
   judge. Both went with the microphone on 2026-08-12. */
/* Every word-session test boots a GRADUATED save: since the pre-level
   ladder (2026-08-15) a truly fresh install begins at Pre 1, and the word
   mechanics under test here live past the ladder. The ladder has its own
   suite in tests/pre.test.js. */
const graduated = () => ({ ...newState(), preLevel: 0 });
const startWord = async () => {
  mockLoad.mockResolvedValueOnce(graduated());
  render(createElement(App));
  await flush(2001); // owner-ruled 2s minimum splash: post-splash session behavior starts here.
  fireEvent.click(screen.getByLabelText("Begin Session"));
  await flush(0);
  /* Entering is setup, not subject: nothing spoken on the way in may count as
     speech during the attempt under test. */
  utterances.length = 0; rates.length = 0; cancels.n = 0;
  return document.querySelector(".wq-word").textContent;
};
/* The ONLY way an attempt can now end: an adult acts. The keyboard path is
   used because it needs no 450 ms hold and grades directly (S5). */
const adultGrades = async (label) => {
  fireEvent.keyDown(screen.getByLabelText(label), { key: "Enter" });
  await flush(0);
};

beforeEach(() => {
  vi.useFakeTimers();
  mockSave.mockClear();
  utterances.length = 0;
  rates.length = 0;
  cancels.n = 0;
  localStorage.clear();                       // W4b: device markers must not leak between tests
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("G10 safety — S1: only an adult can record a result", () => {
  /* S1 had two clauses and now has one. "Speech recognition can only confirm a
     correct reading" was a permission granted to a thing that no longer
     exists — the microphone went on 2026-08-12 — and the five tests that held
     it to the transcript rule went with it: a non-match records nothing, a
     match confirms only correct, and the three that fixed what counts as a
     reading rather than a room full of prompting.

     The RULE is stronger: no automatic path records anything at all, ever.
     The TESTS are fewer and they cover less, and those are two different
     sentences — an earlier draft of this note ran them together and claimed
     the whole thing got stronger, which review refused. What the five held
     were real decisions about ambiguous input: the two-word cap, one word of
     filler, a word buried in a sentence, contains-versus-equals, and a
     non-match recording nothing. None of those questions exists now. What is
     left is a smaller claim about a smaller product, and the floor moves
     52 -> 28 to say so out loud. */
  it("1/2/2a: silence records nothing - while the adult's correct and wrong each record exactly one", async () => {
    /* Merged 2026-09-26 from test 1, test 2 (control) and 2a (Tiers B+C); every line kept. */
    const word = await startWord();
    const writesAfterBoot = mockSave.mock.calls.length;  // the fresh-install boot write only
    /* What a child alone can reach in the ready phase is NOTHING — and that
       is the finding, not a shortcut. The rail holds a prompt, not a control
       (SessionScreen's .wq-prompt); the only child-sized .wq-cta elements
       belong to the feedback rail and the exit dialog, neither of which is
       mounted here. An earlier draft of this test looped over .wq-cta and read
       as coverage while iterating zero elements, which review caught.
       So the loop is asserted to be empty on purpose, and the passage of time
       does the rest of the work: a minute of it, twice over the whole reveal
       window, with nothing touched. The adult's strip controls are deliberately
       NOT pressed — a click there IS the assistive-technology grade path
       (HoldButton), so pressing one would be an adult action and would prove
       the opposite of this test. */
    expect(document.querySelectorAll(".wq-cta").length).toBe(0);
    expect(document.querySelectorAll(".wq-prompt").length).toBe(1);
    await flush(60000);
    expect(mockSave.mock.calls.length).toBe(writesAfterBoot);
    expect(document.querySelectorAll(".wq-tile").length).toBe(0);       // no feedback phase
    expect(document.querySelector(".wq-word").textContent).toBe(word);  // still the same word
    /* 2/2a: the adult's action records - a correct and a wrong each record exactly one.
       The stage is reset the way beforeEach does, so the second half enters
       exactly as its own test used to. */
    cleanup();
    mockSave.mockClear();
    utterances.length = 0; rates.length = 0; cancels.n = 0;
    localStorage.clear();
    const wordB = await startWord();
    await adultGrades("got it");
    expect(screen.getAllByText(/Great job! That is/).length).toBeGreaterThan(0);
    /* The card shows the DISPLAY form ("I"); the save keys the bank form
       ("i") — the one word where they differ, and a random first draw of it
       made this lookup flake until the key was normalised. */
    const saved = mockSave.mock.calls.at(-1)[0].words[wordB === "I" ? "i" : wordB];
    expect(saved.correct).toBe(1);
    expect(saved.close).toBe(0);
    expect(saved.wrong).toBe(0);
    /* 2a: a wrong result also needs the adult, and records exactly one.
       The stage is reset the way beforeEach does, so the second half enters
       exactly as its own test used to. */
    cleanup();
    mockSave.mockClear();
    utterances.length = 0; rates.length = 0; cancels.n = 0;
    localStorage.clear();
    const word2 = await startWord();
    await adultGrades("not yet");
    const saved2 = mockSave.mock.calls.at(-1)[0].words[word2 === "I" ? "i" : word2];
    expect(saved2.wrong).toBe(1);
    expect(saved2.correct).toBe(0);
    expect(saved2.close).toBe(0);
  });

  it("3: source tripwire — EVERY grade fires only from an adult hold control", () => {
    const app = readFileSync("app/src/App.jsx", "utf8");
    const sessionScreen = readFileSync("app/src/screens/SessionScreen.jsx", "utf8");
    /* Widened from wrong|close to all three. While recognition existed,
       grade("correct") had one legitimate automatic call site and had to be
       excluded; there is now no automatic call site of any kind, so the scan
       covers the whole rule instead of two thirds of it. */
    const offenders = (src) =>
      [...src.matchAll(/grade\("(wrong|close|correct)"\)/g)].filter((m) => {
        const line = src.slice(src.lastIndexOf("\n", m.index) + 1, src.indexOf("\n", m.index));
        return !line.includes("HoldButton onFire={() => grade(") && !line.includes("onFire={() => grade(");
      });
    expect(offenders(app).length).toBe(0);
    expect(offenders(sessionScreen).length).toBe(0);
    // fixture controls: the tripwire must fire on a bad call site of each kind
    expect(offenders('if (timeout) grade("wrong");').length).toBe(1);
    expect(offenders('if (heard === word) grade("correct");').length).toBe(1);
  });
});

describe("G10 safety — S2: the word is never spoken before the attempt ends", () => {
  it("4/4b: nothing spoken before the attempt ends, and advancing hushes any reveal", async () => {
    /* Merged 2026-09-26 from test 4 and 4b (Tier B); every line kept. */
    const word = await startWord();
    /* Let the ready phase actually RUN before asking whether it spoke.
       startWord() clears the array on its way out, so asserting emptiness with
       no time and no events between was asserting nothing. Review, 2026-08-12. */
    await flush(30000);
    expect(utterances.length).toBe(0);                                    // ready: silent
    const replay = screen.getByRole("button", { name: "Hear the word again" });
    expect(replay.disabled).toBe(true);                                   // replay inert
    fireEvent.click(replay);
    expect(utterances.filter((t) => t.includes(word)).length).toBe(0);
    // source tripwire for the guard, with its fixture control
    const app = readFileSync("app/src/App.jsx", "utf8");
    expect(app.includes('if (phase !== "feedback") return;')).toBe(true);
    expect('function replay() { speak(currentWord); }'.includes('if (phase !== "feedback") return;')).toBe(false);
    /* 4b: these three used to enter through the child's record control and end
       the attempt with a scripted transcript. Their subject was never the
       microphone — it is S2, which survives in full — so they were rewritten to
       enter and end through the adult's grade rather than deleted with the mode.
       The stage is reset the way beforeEach does, so the second half enters
       exactly as its own test used to. */
    cleanup();
    mockSave.mockClear();
    utterances.length = 0; rates.length = 0; cancels.n = 0;
    localStorage.clear();
    await startWord();
    const draw = vi.spyOn(Math, "random").mockReturnValue(0);
    try { await adultGrades("got it"); } finally { draw.mockRestore(); } // attempt ends; reveal is queued
    await flush(500);                                       // past the 400 ms advance guard
    const before = cancels.n;
    fireEvent.click(screen.getByText(/Next word|Finish!/));
    await flush(0);
    expect(cancels.n).toBeGreaterThan(before);              // hush() ran on advance
    // source tripwire for the call site, with its fixture control: advancing
    // must silence system speech AND any clip chain (S2 for clips)
    const app2 = readFileSync("app/src/App.jsx", "utf8");
    expect(app2.includes("function next() {\n    hush(); stopClips();")).toBe(true);
    expect("function next() {\n    hush();".includes("stopClips();")).toBe(false);
  });

  it("5 (control): after the attempt, speech says the full word and replay works", async () => {
    const word = await startWord();
    /* Pin the praise draw: 0.95 -> index 9, so the assertion stays literal. */
    const draw = vi.spyOn(Math, "random").mockReturnValue(0.95);
    try { await adultGrades("got it"); } finally { draw.mockRestore(); } // attempt ends, correct
    expect(utterances.at(-2)).toBe("Every sound in its place — wonderful!"); // praise, after the attempt
    /* The two words the fallback must not hand over raw: "a" would be the
       letter's name (S4), so it says "uh"; "i" goes as the capital, whose
       name IS the word. Any other first word speaks as itself. */
    const spoken = word === "a" ? "uh" : word === "i" ? "I" : word;
    expect(utterances.at(-1)).toBe(`The word was ${spoken}.`); // full word, its own sentence
    expect(rates.at(-1)).toBe(0.9);                         // the reveal is clear, never stretched
    await flush(500);
    const replay = screen.getByRole("button", { name: "Hear the word again" });
    expect(replay.disabled).toBe(false);
    fireEvent.click(replay);
    expect(utterances.at(-1)).toBe(spoken);                 // replay says the whole word, TTS-safe
    expect(rates.at(-1)).toBe(0.9);                         // the same rate as the reveal
    for (const t of utterances) expect(/(^| )[a-z]([ .,!?]|$)/.test(t)).toBe(false); // no letter names
  });
});

/* The W4b block lived here: 22 tests on a broken microphone that must never
   trap the child — dead recognisers, watchdogs, grace windows, permission
   denials, strike counts, and the six messages those raised. Every one retired
   with the microphone on 2026-08-12, because a fault that cannot happen needs
   no guard. They are not replaced: there is nothing left to replace them for.
   Two of the block's subjects were NOT the microphone, and a first draft of
   this note claimed both were already covered elsewhere. Only one was, and
   review caught it. Honestly:
     - a toast must never cover a child's control (15n) — TRUE, measured by
       G7 in tests/ui/interface.mjs at three device sizes;
     - the exit dialog must never change underneath a grown-up (15d, 15j, 15k,
       15l) — was NOT covered anywhere. Every one of those entered through the
       microphone, and retiring them left the reserved Save slot with no test,
       which is the fix for a real incident: a control appeared mid-dialog,
       pushed everything down about 53 px, and a tap meant for "Keep reading"
       discarded the session. Test 17 below now holds that promise without a
       recogniser. */

describe("A2-002: the exit dialog never changes underneath a grown-up", () => {
  /* This is the promise four retired W4b tests used to hold, and it kept its
     own incident: on the first word the Save control was rendered only when
     something had been read, a reading arrived while the dialog was open, the
     control appeared, everything below it moved down about 53 px, and a tap
     meant for "Keep reading" discarded the session instead. The reading came
     from the microphone, which is gone — but the promise is about the dialog,
     not about what changes the count, so it survives the mode that broke it. */
  it("17/19: on the first word all three controls are present with Save reserved - and 'Keep reading' returns to the same word recording nothing", async () => {
    /* Merged 2026-09-26 from test 17 and its control 19 (Tier C); every line kept. */
    await startWord();
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    const save = screen.getByText("Save as a short session");
    expect(save).toBeTruthy();
    expect(save.disabled).toBe(true);                      // nothing read yet
    expect(screen.getByText("Discard and go home")).toBeTruthy();
    expect(screen.getByText("Keep reading")).toBeTruthy();
    // the slot is RESERVED, not conditional: the control exists while inert
    expect(screen.queryAllByText(/Save .* as a short session/).length).toBe(0);
    /* 19 (control): 'Keep reading' returns to the same word and records nothing.
       The stage is reset the way beforeEach does. */
    cleanup();
    mockSave.mockClear();
    utterances.length = 0; rates.length = 0; cancels.n = 0;
    localStorage.clear();
    const word = await startWord();
    const writes = mockSave.mock.calls.length;
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    fireEvent.click(screen.getByText("Keep reading"));
    await flush(0);
    expect(document.querySelector(".wq-word").textContent).toBe(word);
    expect(document.querySelectorAll(".wq-modal").length).toBe(0);
    expect(mockSave.mock.calls.length).toBe(writes);
  });

  it("18: the dialog's geometry does not move once a word has been read", async () => {
    await startWord();
    await adultGrades("got it");
    await flush(500);
    fireEvent.click(screen.getByText(/Next word|Finish!/));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    const controls = [...document.querySelectorAll(".wq-modal .wq-cta, .wq-modal .wq-btn-plain")];
    expect(controls.length).toBe(3);                       // the same three, in the same order
    expect(controls[0].textContent).toBe("Save 1 as a short session");
    expect(controls[0].disabled).toBe(false);              // now live, same slot
    expect(controls[1].textContent).toBe("Discard and go home");
    expect(controls[2].textContent).toBe("Keep reading");
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

  /* Q5, owner-ruled 2026-08-17: a live session is three screens, not one. The
     pre-letter ladder and Build-it's breather are both moments a reload would
     take the screen away from a child mid-task, and "build" was added without
     this file learning about it - which is the fault, not the omission. */
  /* And the two Finish screens (the walk of 2026-09-01): the save is written
     by then, but "All done! Great reading today!" is still being said and a
     level-up is still buzzing. Nothing is lost by a reload there except the
     celebration, which is the child's. */
  it("17b: the pre-ladder, a build, and both Finish screens are live sessions too", async () => {
    for (const screen of ["pre", "build", "done", "predone"]) {
      const sw = refreshDouble({ screen });
      sw.takeover();
      expect(sw.reloads).toBe(0);            // never mid-task
      sw.goTo("home");
      expect(sw.reloads).toBe(1);            // and then, once
    }
    /* The control: a screen that is NOT live must refresh at once, or this
       test would pass with the guard stuck on. */
    const safe = refreshDouble({ screen: "parent" });
    safe.takeover();
    expect(safe.reloads).toBe(1);
  });

  it("17/18: a new version mid-session waits for the session to end - and with no session running the refresh is immediate", async () => {
    /* Merged 2026-09-26 from test 17 and its control 18 (Tier C); every line kept. */
    const sw = refreshDouble({ screen: "session" });
    sw.takeover();
    expect(sw.reloads).toBe(0);              // the child keeps playing
    sw.goTo("done");
    expect(sw.reloads).toBe(0);              // the Finish screen is still the child's (2026-09-01)
    sw.goTo("home");
    expect(sw.reloads).toBe(1);              // safe moment: the new code takes over
    sw.takeover();
    expect(sw.reloads).toBe(1);              // and only ever once
    /* 18 (control): with no session running the refresh is immediate, and a first install never reloads. */
    const idle = refreshDouble({ screen: "home" });
    idle.takeover();
    expect(idle.reloads).toBe(1);
    const first = refreshDouble({ controller: null, screen: "home" });
    first.takeover();
    expect(first.reloads).toBe(0);           // nothing is stale on the first load
  });
});

describe("G10 safety — S4: no letter name ever reaches speech", () => {
  /* Test 20 lived here: the five words recognition could not judge fairly
     offered no microphone and told the adult why. Both halves of that claim
     retired on 2026-08-12 — there is no microphone to withhold, and SPEC
     section 6 had already ruled the note "belongs to microphone mode only"
     and absent when the adult judges every word, which is now every word.

     Test 19 stays, and its subject was never the microphone. S4 bans letter
     names from speech outright. The note was only the most likely thing to
     break that, being the one string in the product that spelled a letter
     out; the ban outlives it. */
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

});

/* S6's source scan below is a PRE-FILTER too: G18 (tests/ui/network.mjs)
   records every request the built app actually makes in a real browser and
   fails on any host but its own, which is the only way to see a request made
   by a dependency, an <img src>, or a stylesheet url(). */
describe("G10 safety — S6 and S7: no network, big controls", () => {
  it("6: no app source makes a network call", () => {
    /* EVERY app source, derived (owner-ruled 2026-08-17). S6 asks whether ANY
       file reaches the network, so a hand-written list is the wrong shape for
       it - and this one had lost seven files, including the newest screen a
       child meets. Nothing is excluded from this scan; the two files entitled
       to a request carry a scoped allowance below instead. */
    const files = sourcesFor("network");
    expect(files.length).toBeGreaterThan(20);

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

  /* A PRE-FILTER, not the proof. This reads the stylesheet; G7 check 18-20
     measures what a thumb actually meets, with boundingBox() in a real
     browser at three viewport shapes, because a control can carry
     min-height:56px and still render shorter inside a shrinking flex parent,
     under a transform, or below a later rule that wins. Kept because it is
     instant and runs in the fast suite, where G7 does not. */
  it("7: the stylesheet keeps child controls at 56 px and adult controls at 44 px", () => {
    const sized = (css) =>
      css.includes("min-height:56px") &&
      css.includes("min-height:44px;min-width:44px") &&
      (css.match(/min-height:44px/g) || []).length >= 4;
    expect(sized(readFileSync("app/src/wq-css.js", "utf8"))).toBe(true);
    // fixture control: a stylesheet with shrunken controls must fail this check
    expect(sized(".wq-cta{min-height:40px}.wq-sbtn{min-height:40px;min-width:40px}")).toBe(false);
  });

  /* The same PRE-FILTER treatment for the dead `font:` shorthand. tools/
     quality-control.mjs has refused this since 2026-07-29, but that tool runs
     only in the full gauntlet, so a rule written on 2026-08-12 —
     `font:700 9px/1.45 inherit` on the session path's label — passed
     `npm run check` and shipped a label at the inherited size instead of 9 px,
     eating 127 px of a 320 px screen. The scan is textual and instant, so it
     belongs in the fast suite as well; the gauntlet keeps its own copy. */
  it("8: no `font:` shorthand ends in inherit, which would void the declaration", () => {
    const dead = (css) => /font\s*:[^;{}]*\binherit\b/.test(css.replace(/\/\*[\s\S]*?\*\//g, ""));
    expect(dead(readFileSync("app/src/wq-css.js", "utf8"))).toBe(false);
    // fixture control: the exact shape that shipped must be caught
    expect(dead(".wq-tracklbl{font:700 9px/1.45 inherit;color:#fff}")).toBe(true);
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
    await flush(2001); // owner-ruled 2s minimum splash: post-splash free-play behavior starts here.
    fireEvent.click(screen.getByLabelText("Free play"));
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

  it("40/41: free-play grades write nothing at all - while the same grades in a real session DO", async () => {
    /* Merged 2026-09-26 from test 40 and its control 41 (Tier C); every line kept. */
    await enterFreePlay();
    const before = mockSave.mock.calls.length;
    await gradeOne("got it");
    await gradeOne("not yet");
    await gradeOne("close");
    expect(mockSave.mock.calls.length).toBe(before);
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    expect(mockSave.mock.calls.length).toBe(before);
    /* straight home - no save/discard dialog, because there is nothing to save */
    expect(screen.getByLabelText("Begin Session")).toBeTruthy();
    expect(screen.queryByText("Finish early?")).toBeNull();
    /* 41 (control): the same grades in a real session DO reach the save.
       The stage is reset the way beforeEach does. */
    cleanup();
    mockSave.mockClear();
    utterances.length = 0; rates.length = 0; cancels.n = 0;
    localStorage.clear();
    render(createElement(App));
    await flush(2001); // owner-ruled 2s minimum splash: this post-splash control starts here.
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    const before41 = mockSave.mock.calls.length;
    fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });
    await flush(500);
    expect(mockSave.mock.calls.length).toBeGreaterThan(before41);
  });

  /* The free-play walks (42, 43, 45, 46, 47) were retired 2026-09-27 into E2b
     journeys (features/app-free-play.feature: 24 expects for 24 retired).
     43 rides 42's 12-grade walk (header stations at grades 0-1, rollover at
     grade 12); 46 rides 47's pinned 20-block walk (header/no-write stations
     first, boundary at the end, leave-home last); 45 keeps its pinned draw
     and its level-door control. The 0.9999999/0.955 pins and their
     re-derivation rule moved verbatim into the feature. Sentence 11 stays
     unit (sentences door, own walk); 40/41 (free-play-grades-write-nothing
     control) and 44 (chooser) stay below. */

  it("44: a chooser stands between the tap and the game, and Back starts nothing", async () => {
    render(createElement(App));
    await flush(2001); // owner-ruled 2s minimum splash: this post-splash control starts here.
    const before = mockSave.mock.calls.length;
    fireEvent.click(screen.getByLabelText("Free play"));
    await flush(0);
    /* no word yet - the grown-up's choice comes first */
    expect(document.querySelector(".wq-word")).toBeNull();
    expect(screen.getByLabelText("Any word")).toBeTruthy();
    /* the WORDS, not the icon: an icon swap must not break a locator. These
       two were REGEX locators, which that gate could not see until 2026-08-23,
       when the release sweep widened it and it found them at once. */
    expect(screen.getAllByText(/Level 1/).length, "the level chip is shown").toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Back"));
    await flush(0);
    expect(screen.getByLabelText("Begin Session")).toBeTruthy();
    expect(screen.queryByLabelText("Any word")).toBeNull();
    expect(document.querySelector(".wq-word")).toBeNull();
    expect(mockSave.mock.calls.length).toBe(before);
  });

});

/* S6's second network call (SPEC section 7a), owner-approved 2026-08-03 on
   two conditions: plain words in the corner, and an Off that means ZERO
   requests. The test drives the real app, not the module. */
/* The splash update controls (SPEC section 7a) were retired 2026-09-26 into
   E6 journeys (features/app-splash-update.feature), with safety 48 (the
   foreground check obeys the corner's switch) as E6d. Both expects live
   there; the switch comment ("the only bare Off") moved with them. */
