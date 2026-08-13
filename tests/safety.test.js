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

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
/* Every word is now the adult's to judge, so a session is entered the same
   way for every test: begin, and the first word is on screen. There used to be
   a startListening() here that tapped the child's record control, and a
   skipAdultJudgedWords() that walked past the five words recognition could not
   judge. Both went with the microphone on 2026-08-12. */
const startWord = async () => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByText("▶️ Begin Session"));
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
  it("1: a whole session with no adult action records nothing", async () => {
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
  });

  it("2 (control): the adult's action DOES record, so test 1 can fail", async () => {
    const word = await startWord();
    await adultGrades("✓ got it (hold)");
    expect(screen.getAllByText(/Great job! That is/).length).toBeGreaterThan(0);
    const saved = mockSave.mock.calls.at(-1)[0].words[word];
    expect(saved.correct).toBe(1);
    expect(saved.close).toBe(0);
    expect(saved.wrong).toBe(0);
  });

  it("2a: a wrong result also needs the adult, and records exactly one", async () => {
    const word = await startWord();
    await adultGrades("↻ not yet (hold)");
    const saved = mockSave.mock.calls.at(-1)[0].words[word];
    expect(saved.wrong).toBe(1);
    expect(saved.correct).toBe(0);
    expect(saved.close).toBe(0);
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
  it("4: nothing is spoken in the ready phase, and replay is inert", async () => {
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
  });

  /* These three used to enter through the child's record control and end the
     attempt with a scripted transcript. Their subject was never the
     microphone — it is S2, which survives in full — so they were rewritten to
     enter and end through the adult's grade rather than deleted with the mode. */
  it("4b: advancing to the next word silences any queued reveal", async () => {
    await startWord();
    const draw = vi.spyOn(Math, "random").mockReturnValue(0);
    try { await adultGrades("✓ got it (hold)"); } finally { draw.mockRestore(); } // attempt ends; reveal is queued
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
    const word = await startWord();
    /* Pin the praise draw: 0.95 -> index 9, so the assertion stays literal. */
    const draw = vi.spyOn(Math, "random").mockReturnValue(0.95);
    try { await adultGrades("✓ got it (hold)"); } finally { draw.mockRestore(); } // attempt ends, correct
    expect(utterances.at(-2)).toBe("Every sound in its place — wonderful!"); // praise, after the attempt
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
  it("17: all three controls are present on the first word, and Save is reserved and inert", async () => {
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
  });

  it("18: the dialog's geometry does not move once a word has been read", async () => {
    await startWord();
    await adultGrades("✓ got it (hold)");
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

  it("19 (control): 'Keep reading' returns to the same word and records nothing", async () => {
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
    const files = [
      "app/src/App.jsx", "app/src/main.jsx", "app/src/storage.js", "app/src/wq-css.js",
      "app/src/screens/HomeScreen.jsx", "app/src/screens/SessionScreen.jsx",
      "app/src/screens/DoneScreen.jsx", "app/src/screens/ParentScreen.jsx",
      "app/src/voicepacks.js", "app/src/updates.js", "app/src/components/UpdateRow.jsx",
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
       the first word served is the bank's LAST word - "twin", deep in
       Level 11. A fresh Level 1 save can never see it in a session or in
       level free play: buildSession serves Level 1 plus review only. The
       expected word is a literal on purpose (E4); if the bank ever gains a
       new last word, this is the line to update. */
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.9999999);
    try {
      await enterFreePlay("🎲 Truly random");
      expect(document.querySelector(".wq-word").textContent).toBe("twin");
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
       words in reverse - "twin" first, "plan" last - with no repeats, since
       a repeat inside a block would collide with its own first result and be
       graded as a retry.

       At the boundary the pin moves to 0.955, and that number is chosen, not
       inherited. "plan" sits at index 419 of the 439-word bank, so a pin
       anywhere in [0.954442, 0.956720) makes the UNGUARDED draw land exactly
       on the word the child just read. Only a pin in that window can tell the
       guard apart from luck: the pin of 0.935 was in the window for the
       349-word bank and fell out of it when the bank grew, at which point the
       test would still have passed while proving nothing. Both literals below
       are derived from the algorithm, never read back from a run:
         - the guard drops "plan" from the pool, so 439 words are left and
           floor(0.955 x 439) = 419 opens the block on "grin", not "plan";
         - "plan" is then pushed to the BACK of the refilled pool, so index
           floor(0.955 x 440) = 420 of that pool is "plum" — the word that
           sat one place after "plan" before it moved. Without the push-back
           the same index would land on "plan" itself, so this line is what
           proves the word returns to the game rather than leaving it. All
           literals (E4), for the 440-word bank.

       RE-DERIVED FIVE TIMES NOW, and the last two are the lesson.
       The bank went 432 -> 436 when four heart words joined, 436 -> 438 with
       "my" and "of", and 438 -> 439 when "a" shipped. The first two were
       written down. The third was not: the commit that added "a" claimed in
       its own message to have "re-derived for 439", and every number in this
       paragraph stayed at 438 — a stale derivation inside the sentence that
       exists to prevent stale derivations, one bullet below an invocation of
       the cup lesson. An auditor found it.

       The FOURTH move was never written down either. Removing "gob" took the
       bank 439 -> 438, and this paragraph kept saying 439. So the warning
       below was written, the fault it warns about happened again on the very
       next move of the bank, and nothing went red — because 0.955 sits inside
       the true window either way. Corrected on 2026-08-13, at the fifth move
       (438 -> 440, seating "we" and "me"), and this time all three numbers
       were COMPUTED from the shipped LEVELS rather than reasoned about:
       439 -> index 419 -> "grin", 440 -> index 420 -> "plum".

       That the assertions never failed is the danger, not the comfort:
       nothing goes red while the reasoning quietly stops matching the code.
       Recompute all three numbers every time the bank moves, run them, and
       never take the previous paragraph's word for it. */
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.9999999);
    try {
      await enterFreePlay("🎲 Truly random");
      const seen = [];
      for (let i = 0; i < 19; i++) {
        seen.push(document.querySelector(".wq-word").textContent);
        await gradeOne("✓ got it (hold)");
      }
      seen.push(document.querySelector(".wq-word").textContent);
      expect(seen[0]).toBe("twin");
      expect(seen[19]).toBe("plan");
      expect(new Set(seen).size).toBe(20);
      spy.mockReturnValue(0.955);
      await gradeOne("✓ got it (hold)");
      expect(screen.getByText("20 words")).toBeTruthy();
      expect(document.querySelector(".wq-word").textContent).toBe("grin");
      await gradeOne("✓ got it (hold)");
      expect(document.querySelector(".wq-word").textContent).toBe("plum");
    } finally { spy.mockRestore(); }
  });
});

/* S6's second network call (SPEC section 7a), owner-approved 2026-08-03 on
   two conditions: plain words in the corner, and an Off that means ZERO
   requests. The test drives the real app, not the module. */
/* The splash update controls (SPEC section 7a) live in
   tests/safety-splash.test.js — split out at the G6 file-length ceiling, the
   same door S5's file left by. The gauntlet sums both files into the one
   safety floor. */

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
