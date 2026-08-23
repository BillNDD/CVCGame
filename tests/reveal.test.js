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
import { chunkWord, newState } from "../src/engine.js";
import { markerLine } from "../app/src/screens/SessionScreen.jsx";

const REVEAL_MS = 5200;                       // a real reveal, measured from the pack
/* The shape the real player reports: one entry per tile of THIS word, each
   with the moment its own sound starts and how long that sound lasts. The
   lengths differ on purpose — a real /k/ is 70 ms and a real /r/ is 430 —
   because a fixed ring length was the fault this replaced. */
const tileAt = (i) => 2400 + i * 700;
const TILE_MS = [280, 190, 70, 430];
const tilesFor = (word) => chunkWord(word).map((g, i) => ({ at: tileAt(i), ms: TILE_MS[i % 4] }));
/* "pack" schedules clips and reports their length; "quick" schedules a reveal
   SHORTER than the guard, for the floor rule; "fallback" cannot play and
   hands the utterance to system speech; "silent" is the path that fires
   neither callback — a decode that hangs forever — which only the backstop
   can answer (B17). Sound OFF is not a mode here: the real module returns
   before any callback when it is disabled, and the CALLER knows the setting,
   so that test drives it through the stored save's own settings. */
let voiceMode = "pack";
/* The stored save, so a test can start with settings of its choosing. */
let stored = null;
/* "slow" is the reveal whose length arrives after the short guard has already
   run out — six cold clips to fetch and decode. The double holds the callback
   so a test can deliver the length whenever it likes. */
let pendingScheduled = null;
let lateWord = "";
const lateReveal = (ms) => { if (pendingScheduled) pendingScheduled(ms, tilesFor(lateWord)); };

vi.mock("../app/src/storage.js", () => ({
  loadState: vi.fn(async () => stored),
  saveState: vi.fn(async () => true),
}));
/* B7 — the real module hands the caller a REASON on every fallback path, so a
   pack that quietly stopped resolving cannot look like a design choice. The
   double carries one too, and the test below requires it to reach the
   Grown-ups corner. */
const FALLBACK_REASON = "the recorded voice has no clip for d:short_a";
const audioListeners = new Set();
const emitAudio = (e) => { for (const fn of [...audioListeners]) fn(e); };
vi.mock("../app/src/voicepacks.js", () => ({
  initVoicePacks: vi.fn(async () => {}),
  unlockVoice: vi.fn(),
  stopClips: vi.fn(),
  familyClipIds: () => new Set(),
  /* the Glowseed subscribes to the lifecycle; the double keeps the listeners
     so a test can hand them a start and an end by hand (the real source is
     proved in voicepacks.test.js, never through this double) */
  onAudio: (fn) => { audioListeners.add(fn); return () => audioListeners.delete(fn); },
  idbPutClip: vi.fn(async () => true),
  idbDeleteClip: vi.fn(async () => true),
  /* onScheduled is optional in the real module — the done and level-up lines
     have nothing to wait for — so the double must not insist on it. */
  /* The sound-out reports the tile times with the length, so the double does
     too: three tiles, each ringing as its own sound starts. The done and
     level-up lines have no tiles and report none, which is why the caller
     must survive being handed nothing. */
  /* The sentence reveal builds its own plan and plays it through this door
     (SPEC section 12 point 6). A mock without it does not fail loudly — the
     click handler throws, React logs, and the assertions above go on passing —
     so its absence was found by `npm run check` and not by a red test. */
  playClips: (plan, enabled, fallback, onScheduled) => { if (onScheduled) onScheduled(0, []); },
  speakVoice: (kind, word, praiseIdx, enabled, fallback, onScheduled) => {
    /* The real module returns before ANY callback when sound is off — the
       caller knows the setting and arms the guard itself. A double that fired
       onScheduled anyway handed the sound-off test a phantom reveal length
       and re-armed the control for 5.2 s nobody was waiting through. */
    if (!enabled) return;
    if (voiceMode === "slow") { pendingScheduled = onScheduled || null; lateWord = word; return; }
    if (voiceMode === "pack" || voiceMode === "quick") {
      if (!onScheduled) return;
      const tiles = kind === "correct" || kind === "close" || kind === "wrong"
        ? tilesFor(word) : undefined;
      onScheduled(voiceMode === "quick" ? 150 : REVEAL_MS, tiles);
    } else if (voiceMode === "fallback") fallback(FALLBACK_REASON);
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
/* Out of the session and back to the home screen, discarding rather than
   saving so the notice is the only thing under test. */
const goHome = async () => {
  fireEvent.click(screen.getByLabelText("Leave session"));
  await flush(0);
  fireEvent.click(screen.getByText("Discard and go home"));
  await flush(0);
};

const gradeOneWord = async () => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByLabelText("Begin Session"));
  await flush(0);
  fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });
  await flush(0);
};

/* Press for the next word — and when a SENTENCE takes the press, do what a
   grown-up now does (owner-ruled 2026-08-14, open-faults N): the sentence
   arrives silent with no advance control, the child reads, the grown-up MARKS
   it, and only the reveal has the always-live "Next word". Asserting the
   sentence appeared is what stops this from quietly absorbing its
   disappearance. */
const pressNext = async () => {
  fireEvent.click(advance());
  await flush(0);
  if (document.querySelector(".wq-sentence")) {
    fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });
    await flush(0);
    fireEvent.click(advance());
    await flush(0);
    return true;
  }
  return false;
};

/* A2-003 — the advance control's label. Walk a first session to its last slot,
   grading every word correct so no retry is queued on the way: ten words in
   the converted starter session (2026-08-20 cutover), so nine grades leave
   the tenth on screen. */
/* Build-it's breather (SPEC section 12, decision D2, owner-ruled 2026-08-17):
   one build turn after every seventh reading word. A walk leaves it the way a
   grown-up would. It is COUNTED by its callers, so a breather that stops
   appearing, or one that appears where it must not, fails a test rather than
   passing quietly. */
const leaveBuild = async () => {
  const out = screen.queryByLabelText(/leave building/i);
  if (!out) return false;
  fireEvent.click(out);
  await flush(0);
  return true;
};

const walkToLastSlot = async (expectedBreathers = 1) => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByLabelText("Begin Session"));
  await flush(0);
  let sentences = 0, breathers = 0;
  for (let i = 0; i < 9; i += 1) {
    if (await leaveBuild()) breathers += 1;
    fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    if (await pressNext()) sentences += 1;
  }
  if (await leaveBuild()) breathers += 1;
  /* One: after the seventh word. The tenth is the session's last, and the
     breather never takes the last word's press. Literal (E4). With sound off
     there is none at all (art step 2): the chooser refuses a build then, and
     a breather would hand the child "Hear the word" with nothing behind it. */
  expect(breathers).toBe(expectedBreathers);
  /* One sentence in nine grades - after the fifth; the after-ten slot is the
     last word itself, whose press ends the session. Literal (E4), so a walk
     that silently stops meeting it fails here. */
  expect(sentences).toBe(1);
  return document.querySelector(".wq-word").textContent;
};

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); voiceMode = "pack"; pendingScheduled = null; stored = { ...newState(), preLevel: 0 }; });   // graduated: word tests live past the ladder
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

  it("3 (control): a reveal that never reports still cannot trap the grown-up — the backstop", async () => {
    /* REWRITTEN WITH B17'S FIX, 2026-08-15, and the old expectation is the
       fault, recorded: this test used to demand the control alive at 450 ms
       on the neither-callback path — which is the starting gun by another
       name, arming before any length could be known. That gun is what sat
       live and green in the middle of a real sound-out for ~590 measured
       milliseconds on a cold start. The path this mode simulates — sound ON,
       clips hanging forever — is now answered by the backstop alone: longer
       than the longest legitimate reveal, so it can never fire into one that
       is merely slow. */
    voiceMode = "silent";                            // neither callback ever runs
    await gradeOneWord();
    await flush(9950);
    expect(advance().disabled).toBe(true);           // still waiting, still safe
    /* The backstop does not flip the control — it ARMS the guard, so the
       release is backstop plus guard: 10 s to notice the wedge, 400 ms of
       visible fill so the wake is never a surprise jump. */
    await flush(200);
    expect(advance().disabled).toBe(true);           // 10.15 s: the guard is sweeping
    await flush(300);
    expect(advance().disabled).toBe(false);          // 10.4 s: the wedged path releases
  });

  it("3b: with sound OFF there is no reveal to wait for, and the guard arms at once", async () => {
    stored = { ...newState(), preLevel: 0, settings: { ...newState().settings, sound: false } };
    await gradeOneWord();
    expect(advance().disabled).toBe(true);
    await flush(450);                                // literal (E4): the 400 ms guard
    expect(advance().disabled).toBe(false);
  });

  /* THE GLOWSEED (art step 2, bible 7): one object in the stage, decoration
     to assistive technology, lit by the player's start event and darkened by
     the end event of the SAME utterance - an end for another token is not
     its end - and muted, with the replay control disabled and the marker
     line saying so, when sound is off. */
  it("15: the Glowseed is in the stage, hidden from assistive technology, idle on the attempt, lit and darkened by the lifecycle's own events", async () => {
    await gradeOneWord();
    const seed = () => document.querySelector(".wq-glowseed");
    expect(seed()).not.toBeNull();
    expect(seed().closest("main.wq-stage")).not.toBeNull();
    expect(seed().getAttribute("aria-hidden")).toBe("true");
    expect(seed().getAttribute("role")).toBeNull();
    expect(seed().getAttribute("data-wq-glowseed")).toBe("idle");       // the mocked player reports nothing
    await act(async () => { emitAudio({ state: "start", token: 7, ms: 1200 }); });
    expect(seed().getAttribute("data-wq-glowseed")).toBe("lit");
    await act(async () => { emitAudio({ state: "end", token: 6 }); });   // a stopped earlier utterance's late end
    expect(seed().getAttribute("data-wq-glowseed")).toBe("lit");
    await act(async () => { emitAudio({ state: "end", token: 7 }); });
    expect(seed().getAttribute("data-wq-glowseed")).toBe("idle");
    expect(screen.getByRole("button", { name: "Hear the word again" }).disabled).toBe(false);
    expect(document.querySelector(".wq-mark").textContent).toBe(" ");
  });
  it("15d: with sound OFF a child on the ladder is never dealt a session they cannot answer - the control refuses and says why", async () => {
    /* Pre 1 is nothing but ear items: the sounds ARE the question and nothing
       is shown to read, so with sound off the session cannot be answered -
       and every grade the adult gave was still written to the child's ladder
       record. The council's after pass found it on 2026-08-23; the control now
       refuses in the chooser's own voice, for the chooser's own reason. */
    stored = { ...newState(), settings: { ...newState().settings, sound: false } };   // a fresh save: Pre 1
    render(createElement(App));
    await flush(0);
    const begin = screen.getByLabelText("Begin Session");
    expect(begin.disabled).toBe(true);
    expect(screen.getByText(/The first steps need sound/)).toBeTruthy();
    fireEvent.click(begin);
    await flush(0);
    expect(screen.getByLabelText("Begin Session"), "a disabled control deals nothing").toBeTruthy();
  });
  it("15g: with sound off AND a second look, the strip says both on one line", async () => {
    /* The joined line is the only behaviour its commit changed and nothing
       asserted it (the engineering seat's after pass, 2026-08-23): every
       .wq-mark assertion in the suite is either sound-on, or read in the
       feedback phase where the second-look arm is off by construction, so
       reverting markerLine to the old pick-one behaviour left the whole check
       green. The order and the separator are the thing: sound first, because
       it is the one an adult must act on, and the second marker drops its own
       "Parent:" so the line does not say it twice. */
    expect(markerLine(true, false)).toBe("\u00a0");
    expect(markerLine(false, false)).toBe("Parent: sound is off");
    expect(markerLine(true, true)).toBe("Parent: second look");
    expect(markerLine(false, true)).toBe("Parent: sound is off \u00b7 second look");
  });

  it("15f: the refusal's reason is reachable from the control it explains, and dark enough to read on the sky", async () => {
    /* The reason is the only thing telling an adult why the app just refused
       their child's session. It was `ink2`, which measures 3.81:1 against the
       middle sky stop at 12.5 px - under this project's own 4.5 floor - and it
       was not named by the button, so a screen reader reached the button, was
       told nothing, and had to sweep the page for a paragraph. Both closed by
       the council's re-judgement, 2026-08-23. */
    stored = { ...newState(), settings: { ...newState().settings, sound: false } };
    render(createElement(App));
    await flush(0);
    const begin = screen.getByLabelText("Begin Session");
    const id = begin.getAttribute("aria-describedby");
    expect(id, "the control names the reason it is refusing for").toBeTruthy();
    const reason = document.getElementById(id);
    expect(reason, "and that name resolves to an element on the page").toBeTruthy();
    expect(reason.textContent).toMatch(/The first steps need sound/);
    /* the literal the fix chose, written out rather than read from the
       constant under test (E4): #455073 is `strip`, which measures
       4.75 / 4.63 / 5.07 against the three sky stops */
    expect(reason.getAttribute("style")).toContain("color: rgb(69, 80, 115)");
  });

  it("15e: with sound ON the ladder deals as it always did, and its stage carries the Glowseed idle", async () => {
    stored = { ...newState() };   // a fresh save: Pre 1, sound on
    render(createElement(App));
    await flush(0);
    expect(screen.getByLabelText("Begin Session").disabled).toBe(false);
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    expect(screen.getByRole("button", { name: "Hear it again" }).disabled).toBe(false);
    const seed = document.querySelector(".wq-glowseed");
    expect(seed.getAttribute("data-wq-glowseed")).toBe("idle");
    expect(seed.closest("main.wq-stage")).not.toBeNull();
    expect(document.querySelector(".wq-mark").textContent).toBe(" ");
  });
  it("15c: with sound OFF the session takes no Build-it breather - the dead end the chooser already refuses", async () => {
    stored = { ...newState(), preLevel: 0, settings: { ...newState().settings, sound: false } };
    await walkToLastSlot(0);
  });
  it("15b: with sound OFF the replay control is disabled, the Glowseed is muted and the marker line tells the parent", async () => {
    stored = { ...newState(), preLevel: 0, settings: { ...newState().settings, sound: false } };
    await gradeOneWord();
    expect(screen.getByRole("button", { name: "Hear the word again" }).disabled).toBe(true);
    expect(document.querySelector(".wq-glowseed").getAttribute("data-wq-glowseed")).toBe("muted");
    expect(document.querySelector(".wq-mark").textContent).toBe("Parent: sound is off");
    await act(async () => { emitAudio({ state: "start", token: 9, ms: 500 }); });   // nothing plays with sound off; a start would be a fault upstream, and muted wins regardless
    expect(document.querySelector(".wq-glowseed").getAttribute("data-wq-glowseed")).toBe("muted");
  });

  it("14 (B17): a slow reveal never opens the mid-sound-out window", async () => {
    /* The measured fault, replayed: clips take 900 ms to fetch and decode, so
       the old 400 ms starting gun fired first and the control sat live in the
       middle of the sound-out until the real length "took it back". Now
       NOTHING arms before the length arrives: at +500 ms — inside what used
       to be the ~590 ms window — the control is dead, and there is no fill
       sweeping a length nobody has measured. */
    voiceMode = "slow";
    await gradeOneWord();
    await flush(500);
    expect(advance().disabled).toBe(true);           // the window does not exist
    expect(document.querySelector(".wq-ctafill")).toBeNull();
    await flush(400);                                // +900: the clips schedule
    lateReveal(REVEAL_MS);
    await flush(0);
    expect(advance().disabled).toBe(true);           // now waiting the REAL length
    expect(document.querySelector(".wq-ctafill")).toBeTruthy();
    await flush(REVEAL_MS - 100);
    expect(advance().disabled).toBe(true);           // the word is still to come
    await flush(200);
    expect(advance().disabled).toBe(false);          // and only now is it over
  });

  it("14b: the guard is a FLOOR — a reveal shorter than 400 ms still waits 400", async () => {
    voiceMode = "quick";                             // the clips report 150 ms
    await gradeOneWord();
    await flush(350);
    expect(advance().disabled).toBe(true);           // 150 ms passed; the floor holds
    await flush(100);
    expect(advance().disabled).toBe(false);          // 400 ms: the floor releases
  });

  /* A2-003 — the label describes the press. A miss on the last slot puts the
     word back, so the press is a next word, not a finish; a correct reading
     there really does end the session. The pair has to move together. */
  it("5: a miss on the last word says \"Next word\", and the second look follows", async () => {
    const word = await walkToLastSlot();
    fireEvent.keyDown(screen.getByLabelText("not yet"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    expect(advance().textContent).toBe("Next word ➡️");
    fireEvent.click(advance());
    await flush(0);
    expect(document.querySelector(".wq-word").textContent).toBe(word);
    expect(screen.getByText("Parent: second look")).toBeTruthy();
  });

  it("6 (pair): a correct last word says \"Finish!\", and the press ends the session", async () => {
    await walkToLastSlot();
    fireEvent.keyDown(screen.getByLabelText("got it"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    expect(advance().textContent).toBe("🏁 Finish!");
    fireEvent.click(advance());
    await flush(0);
    /* twelve correct readings promote, so the heading is "Level up!" here; the
       header says the same thing either way */
    expect(screen.getByText("Session complete")).toBeTruthy();
    expect(document.querySelector(".wq-word")).toBeNull();
  });

  /* The grown-up's skip (owner-approved 2026-08-07): the reveal can be ended
     early, but only by the adult gesture — the wait exists so the child hears
     the word, so the child's tap must stay dead. */
  it("7: a tap on the grown-up skip does nothing — the reveal keeps its wait", async () => {
    await gradeOneWord();
    const word = document.querySelector(".wq-word").textContent;
    await flush(1000);
    fireEvent.click(screen.getByLabelText("skip"), { detail: 1 });   // the child's tap
    await flush(600);
    expect(advance().disabled).toBe(true);            // still mid-reveal
    expect(document.querySelector(".wq-word").textContent).toBe(word);
  });

  it("8: the adult's skip advances early and silences the reveal at once", async () => {
    const { stopClips } = await import("../app/src/voicepacks.js");
    await gradeOneWord();
    const word = document.querySelector(".wq-word").textContent;
    await flush(1000);                                // the praise is still playing
    stopClips.mockClear();
    fireEvent.keyDown(screen.getByLabelText("skip"), { key: "Enter" });
    await flush(0);
    expect(stopClips).toHaveBeenCalled();             // the reveal falls silent (S2)
    expect(document.querySelector(".wq-word").textContent).not.toBe(word);
    expect(screen.queryByText(/Next word|Finish!/)).toBeNull();   // back in the ready phase
  });

  /* A1-004 — the wait says how long it is. The fill's length is the reveal's
     own scheduled length, not a guess, and it exists only while the control is
     inert. The literals here are the mocked reveal and the short guard. */
  /* The sound-out's teaching: each tile takes its ring as its OWN sound
     plays. A ring on the wrong tile, or at the wrong moment, attaches the
     sound to the wrong piece of the word, which is worse than no ring. */
  it("9: each tile takes its ring as its own sound plays, for as long as that sound lasts", async () => {
    await gradeOneWord();
    const tiles = () => [...document.querySelectorAll(".wq-tile")];
    const word = document.querySelector(".wq-word").textContent;
    const n = chunkWord(word).length;
    expect(tiles().length).toBe(n);
    expect(tiles().filter((t) => t.classList.contains("wq-pop")).length).toBe(0);

    for (let i = 0; i < n; i += 1) {
      await flush(i === 0 ? tileAt(0) : tileAt(i) - tileAt(i - 1));
      /* Every tile up to this one is ringed, and no tile beyond it: the
         sound-out marks the word left to right, one piece at a time. */
      expect(tiles().map((t) => t.classList.contains("wq-pop")))
        .toEqual(tiles().map((_, j) => j <= i));
      /* and exactly THIS tile is live - beneath its siblings - the mark
         handed on at every pop by schedulePops' reset: without it two tiles
         share the depth and bury each other's rims (art step 1, the fifth
         judgement, which found the reset guarded nowhere) */
      expect(tiles().map((t) => t.classList.contains("wq-live")))
        .toEqual(tiles().map((_, j) => j === i));
      expect(tiles()[i].style.getPropertyValue("--wqpop")).toBe(TILE_MS[i % 4] + "ms");
    }
  });

  it("10 (control): with no recorded reveal, no tile is ever ringed", async () => {
    voiceMode = "fallback";
    await gradeOneWord();
    const n = chunkWord(document.querySelector(".wq-word").textContent).length;
    await flush(REVEAL_MS + 50);
    expect(document.querySelectorAll(".wq-tile.wq-pop").length).toBe(0);
    expect(document.querySelectorAll(".wq-tile").length).toBe(n);   // the tiles are still shown
  });

  /* B7 — a fallback is correct behaviour and used to leave no trace anywhere.
     What a grown-up saw was a shorter spoken sentence and no tile rings, with
     nothing saying the recorded voice was unavailable, so a pack that had
     quietly stopped resolving looked like a design choice. The reason now
     reaches the Grown-ups corner. The two halves are asserted separately: it
     must appear when a fallback has happened, and it must NOT appear when the
     recorded pack played, or the notice becomes noise a parent learns to
     ignore. */
  it("10a: a fallback tells the grown-up, and says why", async () => {
    voiceMode = "fallback";
    await gradeOneWord();
    await flush(REVEAL_MS + 50);
    /* the notice is in the Grown-ups corner, which is reached from home */
    await goHome();
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    expect(screen.getByText("The recorded voice")).toBeTruthy();
    expect(document.body.textContent).toContain(FALLBACK_REASON);
  });

  it("10b (control): with the recorded pack, the grown-up is told nothing", async () => {
    voiceMode = "pack";
    await gradeOneWord();
    await flush(REVEAL_MS + 50);
    await goHome();
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    expect(screen.queryByText("The recorded voice")).toBeNull();
  });

  /* Replay silences the sound-out on its way in. The rings were scheduled
     against that sound, so they must go with it: without this the tiles kept
     lighting on a dead schedule while the child heard only the bare word. */
  it("11: replay clears the rings it silenced", async () => {
    await gradeOneWord();
    await flush(tileAt(0));
    expect(document.querySelectorAll(".wq-tile.wq-pop").length).toBe(1);
    fireEvent.click(screen.getByLabelText("Hear the word again"));
    await flush(0);
    expect(document.querySelectorAll(".wq-tile.wq-pop").length).toBe(0);
    await flush(REVEAL_MS);
    expect(document.querySelectorAll(".wq-tile.wq-pop").length).toBe(0);
  });

  /* A seven-second reveal playing on behind the exit dialog talks over the
     grown-up while they read their options. */
  it("12: asking to finish early stops the reveal and its rings", async () => {
    await gradeOneWord();
    await flush(tileAt(0));
    fireEvent.click(screen.getByLabelText("Leave session"));
    await flush(0);
    expect(screen.getByText("Finish early?")).toBeTruthy();
    await flush(REVEAL_MS);
    expect(document.querySelectorAll(".wq-tile.wq-pop").length).toBe(0);
  });

  /* REWRITTEN WITH B17'S FIX, 2026-08-15. This test used to assert the
     starting-gun sequence as CORRECT — "the guard woke it, as it must" —
     which is the ~590 ms window itself, pinned as intended behaviour by a
     test written before the fault was understood (its own comment still
     reasoned from microphone mode, gone since 2026-08-12). The scenario it
     protected — a length arriving after an earlier arm, without the fill
     jumping backwards — survives on the ONE path where a re-arm still
     exists: the wedged-reveal backstop fires first, and the truth arrives
     later still. */
  it("13: a length arriving after the backstop takes the control back, and the fill never runs backwards", async () => {
    voiceMode = "slow";
    await gradeOneWord();
    const fillAt = () => {
      const el = document.querySelector(".wq-ctafill");
      return el ? parseFloat(el.style.getPropertyValue("--wqfillfrom")) : null;
    };
    await flush(10200);                                // the backstop fired at 10 s and armed the guard
    const before = fillAt();
    expect(before).not.toBeNull();                     // its fill is sweeping
    expect(advance().disabled).toBe(true);             // and the guard has 200 ms to run
    act(() => { lateReveal(REVEAL_MS); });
    await flush(0);
    expect(advance().disabled).toBe(true);             // the truth takes over the wait
    /* A1-004 — and the bar does not jump backwards while it does. Redrawing
       it at the true wait's honest fraction sent it from 12 per cent to 4,
       and G7 caught that in the browser. */
    expect(fillAt()).toBeGreaterThanOrEqual(before);
    await flush(REVEAL_MS - 100);
    expect(advance().disabled).toBe(true);
    await flush(200);
    expect(advance().disabled).toBe(false);
  });

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
