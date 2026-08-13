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
import { chunkWord } from "../src/engine.js";

const REVEAL_MS = 5200;                       // a real reveal, measured from the pack
/* The shape the real player reports: one entry per tile of THIS word, each
   with the moment its own sound starts and how long that sound lasts. The
   lengths differ on purpose — a real /k/ is 70 ms and a real /r/ is 430 —
   because a fixed ring length was the fault this replaced. */
const tileAt = (i) => 2400 + i * 700;
const TILE_MS = [280, 190, 70, 430];
const tilesFor = (word) => chunkWord(word).map((g, i) => ({ at: tileAt(i), ms: TILE_MS[i % 4] }));
/* "pack" schedules clips and reports their length; "fallback" cannot play and
   hands the utterance to system speech; "silent" is sound turned off, where
   the module returns without a word to either side. */
let voiceMode = "pack";
/* "slow" is the reveal whose length arrives after the short guard has already
   run out — six cold clips to fetch and decode. The double holds the callback
   so a test can deliver the length whenever it likes. */
let pendingScheduled = null;
let lateWord = "";
const lateReveal = (ms) => { if (pendingScheduled) pendingScheduled(ms, tilesFor(lateWord)); };

vi.mock("../app/src/storage.js", () => ({
  loadState: vi.fn(async () => null),
  saveState: vi.fn(async () => true),
}));
/* B7 — the real module hands the caller a REASON on every fallback path, so a
   pack that quietly stopped resolving cannot look like a design choice. The
   double carries one too, and the test below requires it to reach the
   Grown-ups corner. */
const FALLBACK_REASON = "the recorded voice has no clip for d:short_a";
vi.mock("../app/src/voicepacks.js", () => ({
  initVoicePacks: vi.fn(async () => {}),
  unlockVoice: vi.fn(),
  stopClips: vi.fn(),
  familyClipIds: () => new Set(),
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
    if (voiceMode === "slow") { pendingScheduled = onScheduled || null; lateWord = word; return; }
    if (voiceMode === "pack") {
      if (!onScheduled) return;
      const tiles = kind === "correct" || kind === "close" || kind === "wrong"
        ? tilesFor(word) : undefined;
      onScheduled(REVEAL_MS, tiles);
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
  fireEvent.click(screen.getByText("▶️ Begin Session"));
  await flush(0);
  fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
  await flush(0);
};

/* Press for the next word, and press again if a SENTENCE takes the press.
   A sentence arrives every five words (SPEC section 12 point 2) and its own
   control is the same "Next word", so a walk through a session meets one — the
   same way a grown-up does. Asserting the sentence appeared is what stops this
   from quietly absorbing its disappearance. */
const pressNext = async () => {
  fireEvent.click(advance());
  await flush(0);
  if (document.querySelector(".wq-sentence")) {
    fireEvent.click(advance());
    await flush(0);
    return true;
  }
  return false;
};

/* A2-003 — the advance control's label. Walk a first session to its last slot,
   grading every word correct so no retry is queued on the way: 12 words, so
   eleven grades leave the twelfth on screen. */
const walkToLastSlot = async () => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByText("▶️ Begin Session"));
  await flush(0);
  let sentences = 0;
  for (let i = 0; i < 11; i += 1) {
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    if (await pressNext()) sentences += 1;
  }
  /* Two sentences in eleven words, after the fifth and the tenth. Literal
     (E4), so a walk that silently stops meeting them fails here. */
  expect(sentences).toBe(2);
  return document.querySelector(".wq-word").textContent;
};

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); voiceMode = "pack"; pendingScheduled = null; });
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
    expect(screen.getByText("Parent: second look")).toBeTruthy();
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

  /* The grown-up's skip (owner-approved 2026-08-07): the reveal can be ended
     early, but only by the adult gesture — the wait exists so the child hears
     the word, so the child's tap must stay dead. */
  it("7: a tap on the grown-up skip does nothing — the reveal keeps its wait", async () => {
    await gradeOneWord();
    const word = document.querySelector(".wq-word").textContent;
    await flush(1000);
    fireEvent.click(screen.getByLabelText("⏭ skip (hold)"), { detail: 1 });   // the child's tap
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
    fireEvent.keyDown(screen.getByLabelText("⏭ skip (hold)"), { key: "Enter" });
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

  /* The reveal's real length always wins over the 400 ms guard. Six clips
     have to be fetched and decoded before a length is known, and in
     microphone mode the decoded-clip cache is dropped before every reveal, so
     the guard reaching its end first is an ordinary event, not a rare one. A
     control left live for the rest of the reveal loses the child the word. */
  it("13: a reveal length that arrives late still holds the control", async () => {
    voiceMode = "slow";
    await gradeOneWord();
    /* The bar is only drawn while the control is held, so its last visible
       position is read before the guard runs out. */
    const fillAt = () => {
      const el = document.querySelector(".wq-ctafill");
      return el ? parseFloat(el.style.getPropertyValue("--wqfillfrom")) : null;
    };
    await flush(300);
    const before = fillAt();
    expect(before).not.toBeNull();
    await flush(300);                                  // past the 400 ms guard
    expect(advance().disabled).toBe(false);            // the guard woke it, as it must
    act(() => { lateReveal(REVEAL_MS); });
    await flush(0);
    expect(advance().disabled).toBe(true);             // and the truth takes it back
    /* A1-004 — and the bar does not jump backwards while it does. Redrawing
       it at the true wait's honest fraction sent it from 12 per cent to 4,
       and G7 caught that in the browser. */
    expect(fillAt()).toBeGreaterThanOrEqual(before);
    await flush(REVEAL_MS - 600);
    expect(advance().disabled).toBe(true);
    await flush(700);
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
