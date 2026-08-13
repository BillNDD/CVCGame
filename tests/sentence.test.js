/* Word Quest — the sentence inside a session (SPEC section 12, approved
   2026-08-13). The owner was shown four designs on 2026-08-11, chose none, and
   described a fifth. These are that fifth, point by point:

     1. the sentence is read whole
     2. an invitation plays and the word the LEVEL TEACHES is sounded out
     3. tapping any other word shows its pieces SILENTLY
     4. exactly one word is ever open
     5. the sentence reads again to close, and a tap interrupts it
     6. the grown-up ends the item, and nothing has to finish first

   The voice pack is doubled so the plans can be READ. What a child hears is
   the one thing no assertion can check, so this checks the order the app asks
   for — and the order is the whole design.
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";
import { LEVELS, REVEAL_LINES, SENTENCES, chunkWord, revealWordLongest, newState } from "../src/engine.js";

const REVEAL_MS = 5200;
/* Every plan the app asked to be played, in order, so a test can assert the
   sequence rather than a screenshot of it. */
let played = [];
let scheduled = null;

/* A stored save, so a test can put the child at a level of its choosing. At
   Level 1 the session rule and the free-play rule pick the SAME word — every
   Level 1 word is two tiles and every Level 1 sentence is made of them — so a
   free-play test run there proves nothing about which rule ran. That is not a
   guess: swapping revealWordLongest for revealWord left all eleven tests
   green, and this is the fixture that closed the hole. */
let stored = null;
vi.mock("../app/src/storage.js", () => ({
  loadState: vi.fn(async () => stored),
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
    if (onScheduled) onScheduled(REVEAL_MS, []);
  },
  playClips: (plan, enabled, fallback, onScheduled) => {
    played.push(plan);
    scheduled = onScheduled || null;
    if (onScheduled) onScheduled(REVEAL_MS, []);
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
const sentenceEl = () => document.querySelector(".wq-sentence");
const swords = () => [...document.querySelectorAll(".wq-sword")];
const openSword = () => document.querySelector(".wq-sword-open");
const tiles = () => [...document.querySelectorAll(".wq-sentence-tiles .wq-tile")].map((t) => t.textContent);

/* Grade N words correct and press through, stopping the moment a sentence
   appears. Level 1 is twelve words and the plan puts a sentence after the
   fifth, so five grades reach one. */
const walkToSentence = async () => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByText("▶️ Begin Session"));
  await flush(0);
  for (let i = 0; i < 5; i += 1) {
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    fireEvent.click(advance());
    await flush(0);
  }
};

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); played = []; scheduled = null; stored = null; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("the sentence inside a session", () => {
  it("1: arrives after the fifth word, and only after a word is finished", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    for (let i = 0; i < 4; i += 1) {
      expect(sentenceEl()).toBeNull();
      fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
      await flush(REVEAL_MS + 50);
      expect(sentenceEl()).toBeNull();        // never during a reveal
      fireEvent.click(advance());
      await flush(0);
    }
    expect(sentenceEl()).toBeNull();           // four words is not yet five
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    fireEvent.click(advance());
    await flush(0);
    expect(sentenceEl()).toBeTruthy();
    /* It is a Level 1 sentence, drawn from the list the level owns. */
    const shown = swords().map((b) => b.textContent).join(" ");
    expect(SENTENCES[1].map((s) => s.text.replace(/[.!?]$/, "")).some((t) => shown.startsWith(t.split(" ")[0])))
      .toBe(true);
  });

  it("2: reads the sentence whole, invites, then sounds out the word the level teaches", async () => {
    await walkToSentence();
    expect(played.length).toBe(1);
    const plan = played[0];
    /* Point 1: the WHOLE sentence, one clip, first. Never a stitch of word
       clips — stitched, the same sentence ran 2.07x too long. */
    expect(plan[0].startsWith("s:mode-")).toBe(true);
    expect(plan[1]).toBe("seam");
    /* Point 2: the invitation takes the place the praise line usually holds,
       so the reveal a child meets here is the reveal they already know. */
    expect(REVEAL_LINES.includes(plan[2])).toBe(true);
    /* Then the ordinary sound-out: the word, "Pronounced:", its sounds, the
       word again. */
    expect(plan[3]).toBe("seam2");
    expect(plan[4].startsWith("w:")).toBe(true);
    expect(plan[6]).toBe("s:pronounced");
    expect(plan[plan.length - 1]).toBe(plan[4]);
    /* The word is one the LEVEL teaches, not any word of the sentence. */
    const word = plan[4].slice(2);
    expect(LEVELS[0].words.includes(word)).toBe(true);
    /* Its pieces are on the screen, and they are that word's pieces. */
    expect(tiles().join("")).toBe(word);
    expect(openSword().textContent.toLowerCase().replace(/[.!?]$/, "")).toBe(word);
  });

  it("3: a tapped word shows its pieces and says NOTHING", async () => {
    await walkToSentence();
    const spoken = played.length;
    const other = swords().find((b) => b.getAttribute("aria-pressed") === "false");
    fireEvent.click(other);
    await flush(0);
    /* Design rule 2: a word may be SHOWN split, because that is a scaffold,
       but never SPOKEN, because that is the answer. Nothing new was played. */
    expect(played.length).toBe(spoken);
    const w = other.textContent.toLowerCase().replace(/[.,!?]$/, "");
    expect(tiles().join("")).toBe(w);
  });

  it("4: exactly one word is ever open, and tapping the open one closes it", async () => {
    await walkToSentence();
    expect(document.querySelectorAll(".wq-sword-open").length).toBe(1);
    const first = openSword();
    const other = swords().find((b) => b !== first);
    fireEvent.click(other);
    await flush(0);
    expect(document.querySelectorAll(".wq-sword-open").length).toBe(1);
    expect(openSword()).toBe(other);
    /* None open is a legal number: a child who taps the open word closes it,
       rather than finding the one word on the screen that does nothing. */
    fireEvent.click(other);
    await flush(0);
    expect(document.querySelectorAll(".wq-sword-open").length).toBe(0);
    expect(tiles().length).toBe(0);
  });

  it("5: the sentence reads again to close, and a tap interrupts that read", async () => {
    await walkToSentence();
    const sentenceId = played[0][0];
    expect(played.length).toBe(1);
    await flush(REVEAL_MS + 800);
    /* The closing read is the sentence alone — one clip, no invitation and no
       sound-out, because the child has already had those. */
    expect(played.length).toBe(2);
    expect(played[1]).toEqual([sentenceId]);

    /* And again, with a tap in the way. The tap must reach the timer before it
       fires, or nothing is being tested. */
    cleanup();
    played = [];
    await walkToSentence();
    fireEvent.click(swords()[swords().length - 1]);
    await flush(REVEAL_MS + 800);
    expect(played.length).toBe(1);            // the closing read never started
  });

  it("6: the grown-up ends it, nothing has to finish first, and no result is recorded", async () => {
    await walkToSentence();
    /* The advance is live at once — no wait, no fill. Every word reveal makes
       the grown-up wait for the child to hear the word; a sentence must not,
       because there is nothing here the child has to hear before moving on. */
    expect(advance().disabled).toBe(false);
    expect(document.querySelector(".wq-ctafill")).toBeNull();
    /* Point 3: a sentence is never scheduled, so the grade controls are dead
       while it shows. Live, they would let a grown-up record a second result
       for the word behind the sentence. */
    for (const label of ["✓ got it (hold)", "~ close (hold)", "↻ not yet (hold)"]) {
      expect(screen.getByLabelText(label).disabled).toBe(true);
    }
    const before = screen.getByText("5/12").textContent;
    fireEvent.click(advance());
    await flush(0);
    expect(sentenceEl()).toBeNull();
    /* The count did not move: the sentence read no word and graded none. */
    expect(screen.getByText("5/12").textContent).toBe(before);
    /* And the press paid back the word it took: the child is on the SIXTH
       word, not back on the fifth they already read. */
    expect(document.querySelector(".wq-word")).toBeTruthy();
    expect(screen.getByLabelText("✓ got it (hold)").disabled).toBe(false);
  });

  /* FREE PLAY (SPEC section 12 point 7, owner-ruled 2026-08-13). The same
     reveal, one difference: there is no "word the level teaches", so the
     LONGEST word is sounded out — counted in sound tiles, first one on a tie,
     and stable so the same sentence always teaches the same word. */
  const openSentenceFreePlay = async (level = 1) => {
    if (level !== 1) stored = { ...newState(), level };
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("🎈 Free play"));
    await flush(0);
    fireEvent.click(screen.getByText("📖 Sentences"));
    await flush(0);
  };

  it("8 (free play): opens on a sentence at once, and counts sentences not words", async () => {
    await openSentenceFreePlay();
    expect(sentenceEl()).toBeTruthy();
    expect(document.querySelector(".wq-word")).toBeNull();
    /* "0 sentences", never "0 words": a child who has read four sentences
       being told "4 words" is being told something untrue about their own
       reading. */
    expect(screen.getByText("0 sentences")).toBeTruthy();
    fireEvent.click(advance());
    await flush(0);
    expect(screen.getByText("1 sentence")).toBeTruthy();
    expect(sentenceEl()).toBeTruthy();
  });

  it("9 (free play): sounds out the LONGEST word, in tiles, and never the level's", async () => {
    /* A Level 11 child, deliberately, and TEN sentences rather than one. The
       pool then holds all 88, of which only four are Level 11 — so most of the
       ten are sentences whose level teaches none of their words, where the
       session rule returns null and sounds out NOTHING. Ten draws without
       repeats from a pool of 88 cannot all be Level 11, so this is certain
       rather than likely, and it is what kills the swap that survived before. */
    await openSentenceFreePlay(11);
    for (let i = 0; i < 10; i += 1) {
      const plan = played[played.length - 1];
      const shown = swords().map((b) => b.textContent).join(" ");
      const want = revealWordLongest(shown);
      expect({ shown, id: plan[0], word: plan[4] }).toEqual({ shown, id: plan[0], word: "w:" + want });
      /* Longest counted in TILES, not letters: "ship" is four letters and
         three sounds, and three is what a child takes apart. */
      const ws = swords().map((b) => b.textContent.toLowerCase().replace(/[.,!?]$/, ""));
      expect(chunkWord(want).length).toBe(Math.max(...ws.map((w) => chunkWord(w).length)));
      expect(openSword().textContent.toLowerCase().replace(/[.,!?]$/, "")).toBe(want);
      fireEvent.click(advance());
      await flush(0);
    }
  });

  it("9b: the longest word is a pure rule, and it is not the first word", () => {
    /* Literal (E4). Each of these is a sentence where "first word the level
       teaches" and "longest word" give DIFFERENT answers, which is the whole
       reason the owner had to rule on it. */
    expect(revealWordLongest("The cat sat on the mat.")).toBe("cat");
    expect(revealWordLongest("My twin can swim fast.")).toBe("twin");
    expect(revealWordLongest("The fish is in the net.")).toBe("fish");
    expect(revealWordLongest("A duck can quack.")).toBe("duck");
    /* A tie takes the first, so the answer never moves between two readings
       of the same sentence. Every word here is two tiles. */
    expect(revealWordLongest("Is it up?")).toBe("is");
  });

  it("10 (free play): records nothing, and offers no way to record anything", async () => {
    const before = localStorage.length;
    await openSentenceFreePlay();
    /* Free play writes nothing to the record, ever (design rule 1 and S1).
       There is no grade control to press at all here. */
    for (const label of ["✓ got it (hold)", "~ close (hold)", "↻ not yet (hold)"]) {
      expect(screen.getByLabelText(label).disabled).toBe(true);
    }
    for (let i = 0; i < 6; i += 1) { fireEvent.click(advance()); await flush(0); }
    expect(localStorage.length).toBe(before);
  });

  it("11 (free play): never runs out — the pool is dealt again from the top", async () => {
    await openSentenceFreePlay();
    /* Level 1 owns five sentences, so the sixth press must come back round
       rather than ending the session or showing an empty stage. */
    const seen = [];
    for (let i = 0; i < 7; i += 1) {
      seen.push(swords().map((b) => b.textContent).join(" "));
      fireEvent.click(advance());
      await flush(0);
      expect(sentenceEl()).toBeTruthy();
    }
    expect(new Set(seen.slice(0, 5)).size).toBe(5);      // all five, no repeat
    expect(seen[5]).toBe(seen[0]);                        // then round again, in the same order
    expect(screen.queryByText("Session complete")).toBeNull();
  });

  it("7: no sentence repeats inside one session", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    const seen = [];
    for (let i = 0; i < 11; i += 1) {
      fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
      await flush(REVEAL_MS + 50);
      fireEvent.click(advance());
      await flush(0);
      if (sentenceEl()) {
        seen.push(swords().map((b) => b.textContent).join(" "));
        fireEvent.click(advance());
        await flush(0);
      }
    }
    expect(seen.length).toBe(2);                       // after the fifth and the tenth
    expect(new Set(seen).size).toBe(seen.length);
  });
});
