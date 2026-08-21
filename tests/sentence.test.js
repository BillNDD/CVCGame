/* Word Quest — the sentence inside a session (SPEC section 12, approved
   2026-08-13; the ATTEMPT PHASE owner-ruled 2026-08-14, fixing open-faults N:
   "the child never gets a chance to be graded or do anything"). The sentence
   now arrives SILENT with the child's turn first, and the reveal — the fifth
   design the owner described — begins only at the grown-up's mark:

     0. the sentence arrives silent; the child reads it; the grown-up marks it
        with the same three controls a word gets, and the mark decides only
        what the app SAYS — a praise line that never says "word", or the same
        "Good try!" / "Let's try again." a word's reveal leads with. Nothing
        is recorded, and there is no separate skip: the mark is the path.
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
import { LEVELS, REVEAL_LINES, SENTENCES, SENTENCE_PRAISE, PRAISE, chunkWord, revealWordLongest, sentencePlan, newState } from "../src/engine.js";

const REVEAL_MS = 5200;
/* Every plan the app asked to be played, in order, so a test can assert the
   sequence rather than a screenshot of it. */
let played = [];
let scheduled = null;

/* A LEVEL WITH NO SENTENCES — which no level is today, and which the
   redesigned ladder's first level is. `sentencesUpTo` is the single function
   both the chooser's offer and free play's deal read, so emptying it is the
   whole fixture: nothing else about the app is stood in for, and the real
   beginFreePlay, showSentence and revealWordLongest all run. False means "ask
   the real engine", so every other test in this file is untouched by it. */
let noSentences = false;
vi.mock("@engine", async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, sentencesUpTo: (level) => (noSentences ? [] : real.sentencesUpTo(level)) };
});

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
/* The mocked save, so a test can assert the sentence NEVER reaches it: the
   mark decides what the app says and is recorded nowhere (owner-ruled
   2026-08-14). */
const { saveState } = await import("../app/src/storage.js");

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const advance = () => screen.getByText(/Next word|Next sentence|Finish!/);
const sentenceEl = () => document.querySelector(".wq-sentence");
const swords = () => [...document.querySelectorAll(".wq-sword")];
const openSword = () => document.querySelector(".wq-sword-open");
const tiles = () => [...document.querySelectorAll(".wq-sentence-tiles .wq-tile")].map((t) => t.textContent);

/* Grade N words correct and press through, stopping the moment a sentence
   appears. Level 1 is twelve words and the plan puts a sentence after the
   fifth, so five grades reach one. The walk now ends at the ATTEMPT: the
   sentence on screen, silent, waiting for the child. */
/* Build-it's breather (SPEC section 12, D2) can take a press inside a walk;
   a walk leaves it the way a grown-up would. */
const leaveBuild = async () => {
  const out = screen.queryByLabelText("Leave building");
  if (!out) return false;
  fireEvent.click(out);
  await flush(0);
  return true;
};

const walkToSentence = async () => {
  render(createElement(App));
  await flush(0);
  fireEvent.click(screen.getByText("▶️ Begin Session"));
  await flush(0);
  for (let i = 0; i < 5; i += 1) {
    await leaveBuild();
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    fireEvent.click(advance());
    await flush(0);
  }
};
/* The grown-up's mark on the sentence — a keyboard press, because S5 gives a
   keyboard direct operation of the adult controls. */
const markSentence = async (label = "✓ got it (hold)") => {
  fireEvent.keyDown(screen.getByLabelText(label), { key: "Enter" });
  await flush(0);
};

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); played = []; scheduled = null; noSentences = false; stored = { ...newState(), preLevel: 0 }; });   // graduated: word tests live past the ladder
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("the sentence reveal's clip plan", () => {
  it("sounds the open word out seam by seam, every id literal (E4)", () => {
    /* The plan IS the audio a child hears: text, line, the word, the
       pronounce stem, then every sound with a seam2 breath BETWEEN sounds -
       drop the seams and the sound-out becomes one smear. A mutant doing
       exactly that survived the 2026-08-21 rehearsal because no test pinned
       this sequence; clipPlan's pin covers the WORD reveal, not this one. */
    expect(sentencePlan("s:v3-l04-01", "cat", "r:2")).toEqual(
      ["s:v3-l04-01", "seam", "r:2", "seam2", "w:cat", "seam2", "s:pronounced",
       "seam2", "d:k", "seam2", "d:short_a", "seam2", "d:t", "seam2", "w:cat"]);
    /* No word: the reveal is honestly the read alone. */
    expect(sentencePlan("s:v3-l06-01", null, "r:1")).toEqual(["s:v3-l06-01"]);
  });
});

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

  it("0: arrives SILENT with the child's turn first — prompt up, controls live, no way past but the mark", async () => {
    await walkToSentence();
    /* S2, extended from the word to the sentence: the app has spoken NOTHING.
       Every clip ever played would be in `played`, and there are none. */
    expect(played.length).toBe(0);
    /* The prompt is the word prompt's exact shape, with the ruled words. */
    expect(screen.getByText("Read the sentence out loud! 📣")).toBeTruthy();
    expect(screen.getByText("Read this sentence")).toBeTruthy();
    /* The three grade controls are LIVE — this is the turn the owner said the
       child never got. And there is no advance control at all: the mark is
       the only way forward, exactly as it is for a word. No separate skip
       (owner-ruled 2026-08-14). */
    for (const label of ["✓ got it (hold)", "~ close (hold)", "↻ not yet (hold)"]) {
      expect(screen.getByLabelText(label).disabled).toBe(false);
    }
    expect(screen.queryByText(/Next word|Next sentence|Finish!/)).toBeNull();
    /* The attempt offers no scaffold: no tap targets, no tiles, no hint. The
       words are plain text — a child reading, not a child exploring. */
    expect(document.querySelectorAll("button.wq-sword").length).toBe(0);
    expect(tiles().length).toBe(0);
  });

  it("0b: the mark decides only what the app says — praise that never says \"word\", or the word-reveal leads", async () => {
    /* Around EVERY mark: the save-call count may not move. The five word
       grades of each walk legitimately persist — that is what a word's grade
       is FOR — so the window measured is the mark alone. */
    const unrecorded = async (label) => {
      const before = saveState.mock.calls.length;
      await markSentence(label);
      expect(saveState.mock.calls.length).toBe(before);
    };
    await walkToSentence();
    await unrecorded("✓ got it (hold)");
    /* The lead is a praise clip drawn ONLY from the rows that never say the
       word "word" — the child read a sentence, and the app must not
       mis-describe what they did. */
    const lead = played[0][0];
    expect(lead.startsWith("p:")).toBe(true);
    const idx = Number(lead.slice(2));
    expect(SENTENCE_PRAISE.includes(idx)).toBe(true);
    expect(/\bword\b/i.test(PRAISE[idx])).toBe(false);
    expect(played[0][1]).toBe("seam");
    /* A close and a wrong mark lead with S3's exact recorded sentences — the
       same clips a word's reveal uses, so zero new audio. The closing-read
       timer is flushed before each teardown: left armed, it fires into the
       NEXT block's walk and its sentence clip lands at played[0] — which is
       exactly what happened to the first version of this test. */
    await flush(REVEAL_MS + 800);
    cleanup(); played = [];
    await walkToSentence();
    await unrecorded("~ close (hold)");
    expect(played[0][0]).toBe("l:close");
    await flush(REVEAL_MS + 800);
    cleanup(); played = [];
    await walkToSentence();
    await unrecorded("↻ not yet (hold)");
    expect(played[0][0]).toBe("l:wrong");
    /* Every mark reaches the SAME reveal — a stuck child hears the sentence
       read to them, which is S3's invitation kept. */
    expect(/^s:v3-/.test(played[0][2])).toBe(true);
  });

  it("0c: one attempt, one result — a second mark in the same window changes nothing", async () => {
    await walkToSentence();
    await markSentence("✓ got it (hold)");
    expect(played.length).toBe(1);
    /* Both holds maturing in one commit window was the double-count fault the
       words already guard against; the sentence takes the same guard. */
    await markSentence("~ close (hold)");
    await markSentence("↻ not yet (hold)");
    expect(played.length).toBe(1);
    /* After the mark the controls are dead — the reveal is not a second
       chance to grade, for the sentence or the word behind it. */
    for (const label of ["✓ got it (hold)", "~ close (hold)", "↻ not yet (hold)"]) {
      expect(screen.getByLabelText(label).disabled).toBe(true);
    }
  });

  it("2: the mark starts the reveal: the whole sentence, the invitation, then the level's word", async () => {
    await walkToSentence();
    await markSentence();
    expect(played.length).toBe(1);
    const plan = played[0];
    /* The lead first (point 0), then point 1: the WHOLE sentence, one clip.
       Never a stitch of word clips — stitched, the same sentence ran 2.07x
       too long. */
    expect(plan[0].startsWith("p:")).toBe(true);
    expect(plan[1]).toBe("seam");
    expect(/^s:v3-/.test(plan[2])).toBe(true);
    expect(plan[3]).toBe("seam");
    /* Point 2: the invitation takes the place the praise line usually holds,
       so the reveal a child meets here is the reveal they already know. */
    expect(REVEAL_LINES.includes(plan[4])).toBe(true);
    /* Then the ordinary sound-out: the word, "Pronounced:", its sounds, the
       word again. */
    expect(plan[5]).toBe("seam2");
    expect(plan[6].startsWith("w:")).toBe(true);
    expect(plan[8]).toBe("s:pronounced");
    expect(plan[plan.length - 1]).toBe(plan[6]);
    /* The word is one the LEVEL teaches, not any word of the sentence. */
    const word = plan[6].slice(2);
    expect(LEVELS[0].words.includes(word)).toBe(true);
    /* Its pieces are on the screen, and they are that word's pieces. */
    expect(tiles().join("")).toBe(word === "i" ? "I" : word);   // the one word the screen uppercases
    expect(openSword().textContent.toLowerCase().replace(/[.!?]$/, "")).toBe(word);
  });

  it("3: a tapped word shows its pieces and says NOTHING", async () => {
    await walkToSentence();
    await markSentence();
    const spoken = played.length;
    const other = swords().find((b) => b.getAttribute("aria-pressed") === "false");
    fireEvent.click(other);
    await flush(0);
    /* Design rule 2: a word may be SHOWN split, because that is a scaffold,
       but never SPOKEN, because that is the answer. Nothing new was played. */
    expect(played.length).toBe(spoken);
    const w = other.textContent.toLowerCase().replace(/[.,!?]$/, "");
    expect(tiles().join("")).toBe(w === "i" ? "I" : w);   // the one word the screen uppercases
  });

  it("4: exactly one word is ever open, and tapping the open one closes it", async () => {
    await walkToSentence();
    await markSentence();
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
    await markSentence();
    const sentenceId = played[0][2];          // after the lead and its seam
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
    await markSentence();
    fireEvent.click(swords()[swords().length - 1]);
    await flush(REVEAL_MS + 800);
    expect(played.length).toBe(1);            // the closing read never started
  });

  it("6: after the mark the grown-up ends it, nothing has to finish first, and no result is recorded", async () => {
    await walkToSentence();
    await markSentence();
    /* In the REVEAL the advance is live at once — no wait, no fill. Every
       word reveal makes the grown-up wait for the child to hear the word; a
       sentence must not, because the ruling of 2026-08-13 stands: nothing has
       to finish first. */
    expect(advance().disabled).toBe(false);
    expect(document.querySelector(".wq-ctafill")).toBeNull();
    /* Point 3: a sentence is never scheduled — the mark decided what the app
       SAYS and nothing else. The session count is untouched, so the reveal's
       controls are dead: the word behind the sentence can never be graded a
       second time. */
    for (const label of ["✓ got it (hold)", "~ close (hold)", "↻ not yet (hold)"]) {
      expect(screen.getByLabelText(label).disabled).toBe(true);
    }
    const before = screen.getByText("5/10").textContent;
    fireEvent.click(advance());
    await flush(0);
    expect(sentenceEl()).toBeNull();
    /* The count did not move: the sentence read no word and graded none. */
    expect(screen.getByText("5/10").textContent).toBe(before);
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
    if (level !== 1) stored = { ...newState(), preLevel: 0, level };
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("🎈 Free play"));
    await flush(0);
    fireEvent.click(screen.getByText(`📖 Level ${level} sentences`));   // the grid's left cell names the level
    await flush(0);
  };

  it("8 (free play): opens on a sentence IN THE ATTEMPT, counts sentences, and its advance names one", async () => {
    await openSentenceFreePlay();
    expect(sentenceEl()).toBeTruthy();
    expect(document.querySelector(".wq-word")).toBeNull();
    /* The attempt came to free play on 2026-08-15, owner-ruled from a real
       phone: the reveal used to "play without providing the child a chance
       to figure it out". Silent arrival, prompt up, no advance anywhere. */
    expect(played.length).toBe(0);
    expect(screen.getByText("Read the sentence out loud! 📣")).toBeTruthy();
    expect(screen.queryByText(/Next word|Next sentence|Finish!/)).toBeNull();
    /* "0 sentences", never "0 words": a child who has read four sentences
       being told "4 words" is being told something untrue about their own
       reading. */
    expect(screen.getByText("0 sentences")).toBeTruthy();
    await markSentence();
    /* The reveal's advance says what the press brings: the next item IS a
       sentence here, and the owner read "Next word" off a real phone. */
    expect(screen.getByText("Next sentence ➡️")).toBeTruthy();
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
      await markSentence();                      // the attempt ends at the mark, here too
      const plan = played[played.length - 1];
      const shown = swords().map((b) => b.textContent).join(" ");
      const want = revealWordLongest(shown);
      /* plan[0] is the lead, plan[2] the sentence, plan[6] the word (the mark
         prepends a lead and its seam, exactly as in a session). */
      expect({ shown, id: plan[2], word: plan[6] }).toEqual({ shown, id: plan[2], word: "w:" + want });
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

  it("10 (free play): the controls are live for the SENTENCE, and no mark records anything", async () => {
    await openSentenceFreePlay();
    /* Baselines AFTER entry: the app persists once on mount (the healed
       load), and that save belongs to loading, not to any mark below. */
    const before = localStorage.length;
    const saves = saveState.mock.calls.length;
    /* The attempt came to free play on 2026-08-15, so the controls are LIVE —
       and free play's promise did not move an inch: nothing is written, ever
       (design rule 1 and S1). Six sentences, each marked with a different
       grade, and the record is exactly as it was. */
    for (const label of ["✓ got it (hold)", "~ close (hold)", "↻ not yet (hold)"]) {
      expect(screen.getByLabelText(label).disabled).toBe(false);
    }
    const grades = ["✓ got it (hold)", "~ close (hold)", "↻ not yet (hold)"];
    for (let i = 0; i < 6; i += 1) {
      await markSentence(grades[i % 3]);
      fireEvent.click(advance());
      await flush(0);
    }
    expect(localStorage.length).toBe(before);
    expect(saveState.mock.calls.length).toBe(saves);
  });

  it("11 (free play): never runs out — the pool is dealt again from the top", async () => {
    await openSentenceFreePlay(2);
    /* Free play pools CUMULATIVELY: level 2 owns three texts in the
       converted world (one at level 1, two at 2), so the fourth press must
       come back round rather than ending the session or showing an empty
       stage. Re-derived at the cutover. */
    const seen = [];
    for (let i = 0; i < 5; i += 1) {
      seen.push(swords().map((b) => b.textContent).join(" "));
      await markSentence();
      fireEvent.click(advance());
      await flush(0);
      expect(sentenceEl()).toBeTruthy();
    }
    expect(new Set(seen.slice(0, 3)).size).toBe(3);      // all three, no repeat
    expect(seen[3]).toBe(seen[0]);                        // then round again, in the same order
    expect(screen.queryByText("Session complete")).toBeNull();
  });

  /* THE BENT-SOUND NOTE IN A SENTENCE (open-faults J1, "sentences too"
     owner-ruled 2026-08-15). The stage is rendered directly: which sentence a
     session deals is random, and a test that only sometimes meets a bent word
     is a test that only sometimes tests. Literal fixtures (E4). */
  it("12: the open word's bent-sound note shows in the reveal — and only there", async () => {
    const { default: SentenceStage } = await import("../app/src/components/SentenceStage.jsx");
    const fixture = { id: "s:mode-wm-wm01", text: "We sat on the mat." };
    const note = () => document.querySelector(".wq-sentence .wq-slot-msg")?.textContent ?? "";
    /* The sounded-out word is bent: its note, word for word. */
    render(createElement(SentenceStage, { sentence: fixture, openWord: "we", onTapWord: () => {} }));
    expect(note()).toBe("⭐ Tricky word! The e says its name — wee.");
    cleanup();
    /* A plain word open: the slot stays, one line high, empty — nothing moves. */
    render(createElement(SentenceStage, { sentence: fixture, openWord: "sat", onTapWord: () => {} }));
    expect(note().trim()).toBe("");
    cleanup();
    /* A tapped bent word gets the same note: "the" is tappable in any
       sentence that contains it, and its pieces without its note would be
       half the truth. */
    render(createElement(SentenceStage, { sentence: fixture, openWord: "the", onTapWord: () => {} }));
    expect(note()).toBe("⭐ Tricky word! The e sounds like “uh” — thuh.");
    cleanup();
    /* Never during the attempt: the child is reading, and the note belongs
       to the reveal's teaching, not to a hint before the try. */
    render(createElement(SentenceStage, { sentence: fixture, openWord: "we", attempt: true, onTapWord: () => {} }));
    expect(note().trim()).toBe("");
  });

  /* Q4, owner-ruled 2026-08-17. An interruption takes the press that would
     have advanced the word, and both interruptions cleared the grade on the
     way in - so a word graded "not yet" just before one never came back for
     the second look SPEC section 4 promises. The sentence stage has had this
     since it shipped; Build-it's breather doubled it.

     The proof is the session's own progress dots: one dot per queued word, so
     a queue that grew by one after the sentence IS the retry, whatever the
     session's length or which word the draw picked. */
  it("7b: a miss just before a sentence still earns the second look", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    for (let i = 0; i < 4; i += 1) {
      fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
      await flush(REVEAL_MS + 50);
      fireEvent.click(advance());
      await flush(0);
    }
    expect(sentenceEl()).toBeNull();                     // still on a word, as planned
    const dots = () => document.querySelectorAll(".wq-seg").length;
    const before = dots();
    expect(before).toBeGreaterThan(5);
    const missed = document.querySelector(".wq-word").textContent;
    fireEvent.keyDown(screen.getByLabelText("↻ not yet (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    fireEvent.click(advance());
    await flush(0);
    expect(sentenceEl()).toBeTruthy();                   // the sentence took the press
    await markSentence();
    fireEvent.click(advance());
    await flush(0);
    /* Two facts, split apart on 2026-08-20. The dot count used to serve as a
       proxy for the re-queue and GREW - which at a ten-word level wrapped
       the track and dropped the word 8 px mid-session, the move P0-2
       forbids. The track now holds one dot per WORD, so the count stays
       put... */
    expect(dots()).toBe(before);
    /* ...and the second look is asserted on the thing itself: the missed
       word is served again before the session ends. */
    let met = false;
    for (let hop = 0; hop < 8 && !met; hop += 1) {
      await leaveBuild();                                // D2 may hold a breather here
      if (document.querySelector(".wq-word")?.textContent === missed) { met = true; break; }
      fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
      await flush(REVEAL_MS + 50);
      fireEvent.click(advance());
      await flush(0);
      if (sentenceEl()) { await markSentence(); fireEvent.click(advance()); await flush(0); }
    }
    expect(met).toBe(true);
    /* And the second look is GRADED, because the retry path's own bookkeeping
       (the near-due re-schedule for a word won on its second try) had never
       run under a test until the 2026-08-21 coverage rehearsal looked. */
    fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    expect(document.querySelector(".wq-word").textContent).toBe(missed);   // still the retried word, in its reveal
  });

  /* The control for the test above: the SAME miss with no interruption also
     grows the queue by one. Without it, "+1" could be something the sentence
     does rather than something the retry does. */
  it("7c (control): a miss with no sentence in the way earns the same second look", async () => {
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    const dots = () => document.querySelectorAll(".wq-seg").length;
    const before = dots();
    const missed = document.querySelector(".wq-word").textContent;
    fireEvent.keyDown(screen.getByLabelText("↻ not yet (hold)"), { key: "Enter" });
    await flush(REVEAL_MS + 50);
    fireEvent.click(advance());
    await flush(0);
    expect(sentenceEl()).toBeNull();                     // no interruption on the first word
    /* Same split as 7b: the count holds (one dot per word, P0-2) and the
       second look is proven by meeting the word again. */
    expect(dots()).toBe(before);
    let met = false;
    for (let hop = 0; hop < 8 && !met; hop += 1) {
      await leaveBuild();                                // D2 may hold a breather here
      if (document.querySelector(".wq-word")?.textContent === missed) { met = true; break; }
      fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
      await flush(REVEAL_MS + 50);
      fireEvent.click(advance());
      await flush(0);
      if (sentenceEl()) { await markSentence(); fireEvent.click(advance()); await flush(0); }
    }
    expect(met).toBe(true);
  });

  it("7: no sentence repeats inside one session", async () => {
    /* Re-derived at the cutover, twice. A Level-1 session is ten words and
       meets ONE sentence, too few to prove non-repetition. The first re-walk
       used level 22 and measured 2 sentences against 3 planned slots - which
       opened a fault (docs/open-faults.md W) that closed the same night: the
       plan was honest all along, level 22 owns only TWO texts, and
       sessionSentences gives fewer sentences than slots by design. The walk
       now runs at level 77, MEASURED as the full shape: a 20-word queue,
       seven texts, slots after the 5th, 10th and 15th words, breathers after
       the seventh and fourteenth - so the third slot is finally exercised. */
    stored = { ...newState(), preLevel: 0, level: 77 };
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("▶️ Begin Session"));
    await flush(0);
    const seen = [];
    let breathers = 0;
    for (let i = 0; i < 19; i += 1) {
      /* Build-it's breather (D2) takes one press after every seventh word and
         hands the advance back when it ends; the walk leaves it as a grown-up
         would and counts it, so it cannot silently stop happening. */
      if (await leaveBuild()) breathers += 1;
      fireEvent.keyDown(screen.getByLabelText("✓ got it (hold)"), { key: "Enter" });
      await flush(REVEAL_MS + 50);
      fireEvent.click(advance());
      await flush(0);
      if (sentenceEl()) {
        seen.push(swords().map((b) => b.textContent).join(" "));
        await markSentence();                  // the attempt ends at the mark
        fireEvent.click(advance());
        await flush(0);
      }
    }
    expect(seen.length).toBe(3);                       // after the fifth, tenth and fifteenth - all three slots serve
    expect(new Set(seen).size).toBe(seen.length);
    expect(breathers).toBe(2);                         // build turns after the seventh and fourteenth
  });
});

/* THE EMPTY POOL. Free play deals from data, and every level's data can be
   empty — a level whose text has not been written yet has no sentences, the
   same way a level whose words are not chosen yet has no words. Nothing in
   the app asked. `pool[0]` on an empty array is undefined, the reveal asked
   that undefined for its longest word, and it threw out of a click handler:
   a white screen on the first choice the first screen offers. Not live while
   every level has sentences; armed the day one does not.

   Two halves, and the first is the one that matters. The GUARD must hold
   whatever the chooser decides — a hidden control is not a guard — and the
   chooser must not offer a mode it cannot serve. */
describe("free play deals from data that can be empty", () => {
  it("13: an empty pool turns the tap back rather than breaking the app", async () => {
    /* The row is drawn while there ARE sentences and the pool is empty by the
       time it is tapped, which is the only way this is reachable now that the
       chooser hides the row: the offer and the deal disagreeing. That is
       exactly what the guard is for. Without it, the click below throws
       inside React and none of these four assertions is ever reached. */
    const thrown = [];
    const catcher = (e) => { thrown.push(String(e.error || e.message)); e.preventDefault(); };
    window.addEventListener("error", catcher);
    try {
      render(createElement(App));
      await flush(0);
      fireEvent.click(screen.getByText("🎈 Free play"));
      await flush(0);
      const row = screen.getByText("📖 Level 1 sentences");
      noSentences = true;
      fireEvent.click(row);
      await flush(0);
      expect(thrown).toEqual([]);
      expect(sentenceEl()).toBeNull();                             // no stage was entered
      expect(screen.getByText("▶️ Begin Session")).toBeTruthy();   // still home
      expect(screen.getByText("Nothing to read there yet. Pick another free play choice.")).toBeTruthy();
      expect(screen.queryByText("🎲 Any word")).toBeNull();    // and the chooser closed
    } finally {
      window.removeEventListener("error", catcher);
    }
  });

  it("14: the chooser drops the sentence row where there is nothing to serve — and keeps it where there is", async () => {
    noSentences = true;
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("🎈 Free play"));
    await flush(0);
    expect(screen.queryByText("📖 Level 1 sentences")).toBeNull();
    /* Re-derived for the 2026-08-21 grid: only the LEVEL cell goes. The
       right column's "Any sentence" serves the whole game's texts and stays,
       and the lede no longer lists activities, so it no longer has to change
       with them. A chooser that empties itself is not a fix: the other
       cells serve words, which this level has. */
    expect(screen.getByText("🎲 Any sentence")).toBeTruthy();
    expect(screen.getByText("🎲 Any word")).toBeTruthy();
    expect(screen.getByText("🧱 Build a level word")).toBeTruthy();
    cleanup();
    /* THE CONTROL (E5): the same walk with sentences to serve keeps the row.
       A hider that hides in every world hides nothing. */
    noSentences = false;
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByText("🎈 Free play"));
    await flush(0);
    expect(screen.getByText("📖 Level 1 sentences")).toBeTruthy();
  });
});
