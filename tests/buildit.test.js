/* BUILD-IT (SPEC section 12). The app speaks a word the child already knows and
   the child assembles it from sound tiles.

   Two things are proved here, and the first is the reason the mode is safe.

   1. IT WRITES NOTHING. Build-it speaks the target word FIRST, which in a graded
      reading attempt would be an S2 breach — the app must never say the word
      before the attempt ends. It is not a breach here because there is no
      attempt: nothing a child does in this mode reaches the record. That is a
      property of the code, not an intention, so it is checked as one, with
      fixture controls that must fire (E5). Owner-ruled Q1, 2026-08-17.

   2. THE LOOP WORKS. A child places tiles, hears each one, gets a miss they can
      hear, and after the second miss is shown where each sound goes. "Every
      attempt ends in success" is the whole reason the mode may be practice, so
      it is walked rather than assumed.

   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { buildTray, buildSoundTray, preLetters, chunkWord } from "../src/engine.js";

/* The pack is replaced so the loop can be walked without an audio device, and
   so a completion callback fires at once rather than after a real clip. */
const played = [];
const audioListeners = new Set();
const emitAudio = (e) => { for (const fn of [...audioListeners]) fn(e); };
vi.mock("../app/src/voicepacks.js", () => ({
  initVoicePacks: async () => {},
  unlockVoice: () => {},
  stopClips: () => {},
  microphoneUsed: () => {},
  familyClipIds: () => new Set(),
  /* the Glowseed subscribes to the lifecycle; the double keeps the listeners
     so a test can hand them a start by hand (the real source is proved in
     voicepacks.test.js, never through this double) */
  onAudio: (fn) => { audioListeners.add(fn); return () => audioListeners.delete(fn); },
  speakVoice: (kind, word) => { played.push("word:" + word); },
  playClips: (plan, enabled, fallback, onScheduled = () => {}) => {
    played.push("clips:" + plan.join(","));
    onScheduled(0, []);
  },
}));
vi.mock("../app/src/storage.js", () => ({
  loadState: () => stored,
  saveState: (s) => { saves.push(s); },
}));

let stored, saves;
const BuildItScreen = (await import("../app/src/screens/BuildItScreen.jsx")).default;
const { newState } = await import("../src/engine.js");
const engine = await import("../src/engine.js");

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  played.length = 0;
  saves = [];
  stored = { ...newState(), preLevel: 0 };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

/* A tray with a held rand, so the tiles are known and the walk is not a guess. */
const trayFor = (word, level = 2) => buildTray(word, level, () => 0.3);

/* THE DOUBLE THAT CAN FAIL (the council's after pass, 2026-08-23). The
   synchronous double below reports a sound finished the instant it starts, so
   a screen that lifts its quiet on the sound's own report and a screen that
   lifts it on a 900 ms clock behave IDENTICALLY under it - and test 26 passed
   byte-identical on both. `deferred` holds each report instead, so a test can
   stand inside the gap where a real clip is still playing. */
const heldReports = [];
let deferring = false;
/* A SWITCH RATHER THAN A MOUNT OPTION, and the first attempt taught why: a
   TILE TAP plays one sound and waits for its report before it will take the
   next tap, so holding every one-sound report from the start meant the child
   never placed a second tile, never missed twice, and never reached the
   scaffold - the test then measured a screen that had not started. It is
   turned on once the misses are done. */
function holdSounds(on) { deferring = on; if (on) heldReports.length = 0; }
function fireDeferred() { const t = heldReports.shift(); if (t) t(); return !!t; }
function mount(word, level = 2, onDone = () => {}, opts = {}) {
  const tray = trayFor(word, level);
  deferring = false;
  heldReports.length = 0;
  const report = (then, single) => { if (!then) return; if (deferring && single) heldReports.push(then); else then(); };
  render(createElement(BuildItScreen, {
    tray,
    /* playWord is NEVER deferred: the prompt's own report is what starts the
       scaffold, so holding it would mean testing a screen that never got
       there - which is exactly what it did on the first attempt. */
    playWord: (w, then) => { played.push("word:" + w); if (then) then(); },
    /* and only a SINGLE-sound call is held: that is what a scaffold slot
       plays. A tile tap and the built-word playback report normally, or the
       build itself would stall and the test would be measuring nothing. */
    playSounds: (ids, then) => { played.push("sounds:" + ids.join(",")); report(then, ids.length === 1); },
    soundIdsOf: (w) => chunkWord(w).map((c) => "d:" + c),
    onDone, onExit: onDone, ...(opts.props || {}),
  }));
  return tray;
}

const tiles = () => screen.getAllByLabelText(/^Tile /);
const slots = () => screen.getAllByLabelText(/^(Take back|Empty space)/);
const tileFor = (t) => tiles().filter((b) => b.textContent === t);

describe("Build-it writes nothing to the record", () => {
  it("1: source tripwire — the screen touches no state that is saved", () => {
    const src = readFileSync("app/src/screens/BuildItScreen.jsx", "utf8");
    /* The names that reach the record in this app. A screen that holds none of
       them cannot write to it, whatever it does with its own useState. */
    /* No trailing \b after a bracket: it only matches when a word character
       follows, so "setState(" and "mutate(" would have been missed on every
       real call — setState((prev) => …) has a bracket next. The fixture
       controls happened to pick the one spelling that worked. */
    const WRITERS = /\b(persist|saveState|applyResult|checkPromotion|localStorage)\b|\b(setState|mutate)\s*\(/g;
    const offenders = (text) => [...text.matchAll(WRITERS)].map((m) => m[0]);
    expect(offenders(src)).toEqual([]);
    /* Fixture controls: the scan must fire on each kind of write, or an empty
       result proves only that the scan is broken. */
    expect(offenders("persist(s);")).toEqual(["persist"]);
    expect(offenders("saveState(next);")).toEqual(["saveState"]);
    expect(offenders("setState(s => s);")).toEqual(["setState("]);
    expect(offenders("setState((prev) => prev);")).toEqual(["setState("]);
    expect(offenders("mutate( s => s );")).toEqual(["mutate("]);
    expect(offenders("localStorage.setItem('x', 1);")).toEqual(["localStorage"]);
    /* And the strongest form: the REAL source with one line added must fail.
       A scan proved only against hand-written fixtures can still be looking at
       the wrong file. */
    expect(offenders(src + "\n  persist(stateRef.current);\n")).toEqual(["persist"]);
  });

  it("2: a completed build saves nothing — and the probe can see a save", async () => {
    const tray = mount("cat");
    for (const t of tray.answer) fireEvent.click(tileFor(t)[0]);
    await flush(50);
    expect(saves).toEqual([]);
    expect(screen.getByText(/You built cat/)).toBeTruthy();
    /* THE CONTROL. The screen cannot reach storage.js from its own import tree,
       so an empty `saves` would be empty however the screen behaved — the
       assertion above proves nothing by itself. Firing the mocked saver proves
       the probe is wired and CAN report a write. Without this the test is a
       mock presented as proof the real feature works, which CLAUDE.md refuses
       by name. */
    const { saveState } = await import("../app/src/storage.js");
    saveState({ marker: 1 });
    expect(saves).toEqual([{ marker: 1 }]);
  });

  it("3: no adult mark exists anywhere on the screen (D4)", () => {
    mount("cat");
    expect(screen.queryByLabelText("got it")).toBeNull();
    expect(screen.queryByLabelText("not yet")).toBeNull();
    expect(screen.queryByLabelText(/close/i)).toBeNull();
  });
});

describe("Build-it's loop", () => {
  it("4: the word is spoken first, and the tiles are not", () => {
    mount("cat");
    expect(played[0]).toBe("word:cat");
    expect(played.some((p) => p.startsWith("sounds:"))).toBe(false);
  });

  it("5: a tile plays the sound it makes IN THIS WORD, not the letter's default", () => {
    /* his bends s to /z/. The tile must say /z/ - the screen once derived the
       sound from the letter, so the s tile said /s/ while the word said /z/,
       and the four units with no default were silent altogether. */
    const tray = mount("his", 8);
    const sTile = tray.tiles.indexOf("s");
    expect(tray.sounds[sTile]).toBe("d:z");
    fireEvent.click(tiles()[sTile]);
    expect(played).toContain("sounds:d:z");
  });

  it("5b: no tray tile is ever silent", async () => {
    const { bankWords, buildable, WORD_LEVEL, buildTray: bt } = await import("../src/engine.js");
    const shipped = new Set(Object.keys(JSON.parse(readFileSync("app/public/voice/manifest.json", "utf8"))));
    let silent = 0, checked = 0;
    for (const w of bankWords()) {
      if (!buildable(w)) continue;
      for (const r of [0.1, 0.5, 0.9]) {
        const t = bt(w, WORD_LEVEL[w] || 1, () => r);
        checked += 1;
        if (t.sounds.some((id) => !shipped.has(id))) silent += 1;
      }
    }
    expect(checked).toBeGreaterThan(1400);
    expect(silent).toBe(0);
    /* the control: an id the pack does not hold must be seen as silent */
    expect(shipped.has("d:ou")).toBe(false);
    /* The magic-e words (2026-08-20): their silent e is a tile that plays
       nothing, so buildable() refuses them until the owner rules Build-it's
       silent-e treatment - asserted here so the refusal is a stated fact and
       the loop above cannot pass by silently skipping them. */
    expect(buildable("come")).toBe(false);
    expect(buildable("some")).toBe(false);
    expect(buildable("love")).toBe(true);   // its ve absorbs the e - no silent tile, builds fine
    expect(buildable("have")).toBe(true);
  });

  it("6: a word whose sound repeats can still be built", async () => {
    /* dad is d-a-d. When a slot held the LETTER rather than the tray position,
       the second d could never be placed and the word could not be built at
       all - eleven bank words, one of them at Level 2. */
    const tray = mount("dad");
    expect(tray.answer).toEqual(["d", "a", "d"]);
    const ds = tiles().filter((b) => b.textContent === "d");
    expect(ds.length).toBe(2);
    fireEvent.click(ds[0]);
    fireEvent.click(tileFor("a")[0]);
    fireEvent.click(ds[1]);
    await flush(50);
    expect(slots().map((s) => s.textContent).join("")).toBe("dad");
    expect(screen.getByText(/You built dad/)).toBeTruthy();
  });

  it("7: a miss says what the child actually built, and the tray is not locked", async () => {
    const tray = mount("cat", 8);          // level 8 brings a distractor along
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    expect(wrong).toBeTruthy();
    fireEvent.click(wrong);
    for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
    await flush(50);
    expect(screen.getByText(/listen again/)).toBeTruthy();
    /* and the child can take a tile back and try again: unlimited tries (D5) */
    fireEvent.click(slots()[0]);
    expect(slots()[0].textContent).toBe("");
  });

  it("8: after the second miss, the letter is shown in its own slot", async () => {
    const tray = mount("cat", 8);
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    for (let go = 0; go < 2; go += 1) {
      fireEvent.click(wrong);
      for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
      await flush(60);
      if (go === 0) slots().forEach((s) => fireEvent.click(s));
    }
    await flush(1000);
    expect(screen.getByText(/Watch where each sound goes/)).toBeTruthy();
    /* the ghost is the answer's own letter, in the slot it belongs to */
    expect(slots()[0].textContent).toBe(tray.answer[0]);
  });
});

/* THE CERAMIC STATES (art step 1, bible 11, owner-ruled 2026-08-22 on the
   ceramic-tiles page). Each state is a class the stylesheet paints; what a
   screen reader hears does not change. */
describe("the ceramic tile states", () => {
  it("20: a used tray tile keeps its letter, is a real disabled control, and is not dimmed", async () => {
    const tray = mount("cat", 8);
    const first = tileFor(tray.answer[0])[0];
    fireEvent.click(first);
    expect(first.classList.contains("wq-used")).toBe(true);
    expect(first.disabled).toBe(true);
    expect(first.style.opacity).toBe("");
    expect(first.textContent).toBe(tray.answer[0]);
    /* the slot that took it is a filled ceramic slot, named the same as before */
    expect(screen.getByLabelText("Take back " + tray.answer[0]).classList.contains("wq-empty")).toBe(false);
    expect(screen.getAllByLabelText("Empty space").every((b) => b.classList.contains("wq-empty") && b.disabled)).toBe(true);
  });

  it("21: a multi-letter tray tile is as wide as its slot - sh is 90 px where s is 64", () => {
    const tray = mount("ship", 8);
    const sh = tileFor("sh")[0], i = tileFor("i")[0];
    expect(sh.style.width).toBe("90px");
    expect(i.style.width).toBe("64px");
    expect(sh.style.height).toBe("64px");
    expect(screen.getByLabelText("Tile sh")).toBe(sh);
    expect(tray.answer[0]).toBe("sh");
  });

  it("22: after a miss the filled slots wear the arrangement ring while the built sounds play, and lose it when the tray is handed back", async () => {
    /* a player that HOLDS its callback, so the playback has a duration */
    const held = [];
    const tray = trayFor("cat", 8);
    render(createElement(BuildItScreen, {
      tray, playWord: (w, then) => { if (then) then(); },
      playSounds: (ids, then) => { if (then) held.push(then); },
      soundIdsOf: (w) => chunkWord(w).map((c) => "d:" + c), onDone: () => {}, onExit: () => {},
    }));
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    fireEvent.click(wrong);
    for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
    /* the last tile's own sound finishes: the build is judged, a miss */
    await act(async () => { held.pop()(); });
    await flush(10);
    expect(screen.getByText(/listen again/)).toBeTruthy();
    const filled = screen.getAllByLabelText(/^Take back/);
    expect(filled.length).toBe(3);
    expect(filled.every((b) => b.classList.contains("wq-arr"))).toBe(true);
    expect(filled.some((b) => b.classList.contains("wq-won"))).toBe(false);
    /* the built sounds finish: the tray is handed back and the ring goes */
    await act(async () => { held.pop()(); });
    await flush(10);
    expect(screen.getAllByLabelText("Empty space").length).toBe(3);
    expect(document.querySelectorAll(".wq-arr").length).toBe(0);
  });

  it("23: the scaffold rings one slot at a time, in sound order, with the letter at .6 inside it", async () => {
    const tray = mount("cat", 8);
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    for (let go = 0; go < 2; go += 1) {
      fireEvent.click(wrong);
      for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
      await flush(60);
      if (go === 0) slots().forEach((s) => fireEvent.click(s));
    }
    await flush(1000);
    const cued = () => [...document.querySelectorAll(".wq-tilebtn.wq-cue")];
    expect(cued().length).toBe(1);
    expect(cued()[0]).toBe(slots()[0]);
    expect(cued()[0].querySelector(".wq-ghost").textContent).toBe(tray.answer[0]);
    await flush(900);
    expect(cued().length).toBe(1);
    expect(cued()[0]).toBe(slots()[1]);
    expect(cued()[0].querySelector(".wq-ghost").textContent).toBe(tray.answer[1]);
    await flush(2000);
    expect(cued().length).toBe(0);
    expect(document.querySelectorAll(".wq-ghost").length).toBe(0);
  });

  it("26: the Glowseed stays idle through the scaffold's one-clip-per-slot plays, lights for a play after it, and wears the muted look when the screen is muted", async () => {
    /* art step 2, the owner's page ruling 2 (a): the scaffold's sounds would
       blink the object once per 900 ms slot - the repeated pulse bible 7
       forbids - so the stage asks it to stay quiet until the last ghost
       clears; the slot's cue ring is the one event there. */
    const tray = mount("cat", 8);
    const seed = () => document.querySelector(".wq-glowseed");
    expect(seed().getAttribute("data-wq-glowseed")).toBe("idle");
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    for (let go = 0; go < 2; go += 1) {
      fireEvent.click(wrong);
      for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
      await flush(60);
      if (go === 0) slots().forEach((s) => fireEvent.click(s));
    }
    await flush(1000);                                   // the scaffold is on its first slot
    expect(document.querySelectorAll(".wq-tilebtn.wq-cue").length).toBe(1);
    await act(async () => { emitAudio({ state: "start", token: 3, ms: 300 }); });
    expect(seed().getAttribute("data-wq-glowseed")).toBe("idle");   // quiet: lit underneath, idle to the child
    await act(async () => { emitAudio({ state: "end", token: 3 }); });
    await flush(900);
    await act(async () => { emitAudio({ state: "start", token: 4, ms: 300 }); });
    expect(seed().getAttribute("data-wq-glowseed")).toBe("idle");
    await act(async () => { emitAudio({ state: "end", token: 4 }); });
    await flush(2000);                                   // the scaffold is over, the ghost gone
    expect(document.querySelectorAll(".wq-ghost").length).toBe(0);
    await act(async () => { emitAudio({ state: "start", token: 5, ms: 300 }); });
    expect(seed().getAttribute("data-wq-glowseed")).toBe("lit");
    await act(async () => { emitAudio({ state: "end", token: 5 }); });
    expect(seed().getAttribute("data-wq-glowseed")).toBe("idle");
    expect(seed().getAttribute("aria-hidden")).toBe("true");
  });
  it("26b: a muted build (sound off) wears the muted look whatever plays", async () => {
    const tray = trayFor("cat", 2);
    render(createElement(BuildItScreen, { tray, playWord: () => {}, playSounds: () => {}, soundIdsOf: (w) => chunkWord(w).map((c) => "d:" + c), onDone: () => {}, onExit: () => {}, muted: true }));
    const seed = document.querySelector(".wq-glowseed");
    expect(seed.getAttribute("data-wq-glowseed")).toBe("muted");
    await act(async () => { emitAudio({ state: "start", token: 9, ms: 300 }); });
    expect(seed.getAttribute("data-wq-glowseed")).toBe("muted");
  });

  it("26f: a miss landing inside the scaffold lifts the quiet, so the playback is never spoken over a dark object", async () => {
    /* THE GAP (the release sweep, 2026-08-23): the tray's tiles stay enabled
       while the scaffold runs, so a child can fill the slots during it. The
       miss branch raised the arrangement ring and played the built word back
       WITHOUT lowering the scaffold's quiet, so the object stayed dark through
       a playback - dark while the game is speaking, the one state it must
       never be in - and the scaffold's queued ghosts landed over the
       handed-back tray. The win branch had cleared both since the checkpoint
       renders; the miss branch had not. */
    const tray = mount("cat", 8);
    const seed = () => document.querySelector(".wq-glowseed");
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    for (let go = 0; go < 2; go += 1) {
      fireEvent.click(wrong);
      for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
      await flush(60);
      if (go === 0) slots().forEach((s) => fireEvent.click(s));
    }
    await flush(1000);
    expect(document.querySelectorAll(".wq-tilebtn.wq-cue").length, "the scaffold is running").toBe(1);
    await act(async () => { emitAudio({ state: "start", token: 51, ms: 300 }); });
    expect(seed().getAttribute("data-wq-glowseed"), "quiet, because the scaffold is speaking").toBe("idle");
    await act(async () => { emitAudio({ state: "end", token: 51 }); });
    /* the child fills the slots DURING the scaffold and misses again */
    fireEvent.click(wrong);
    for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
    await flush(60);
    expect(document.querySelectorAll(".wq-ghost").length, "the scaffold's queued ghosts are cleared").toBe(0);
    await act(async () => { emitAudio({ state: "start", token: 52, ms: 300 }); });
    expect(seed().getAttribute("data-wq-glowseed"), "the miss is being played back, so the object is lit").toBe("lit");
  });

  it("26e: the sound backstop cannot beat a real clip, so a slot's report always arrives first", async () => {
    /* THE FAULT (the council's reading chair, 2026-08-23): playBuildSounds
       backstopped at 400 per sound plus 700, so ONE sound had 1,100 ms while
       its own report lands at the clip plus 140 - and five of the fifty-one
       sound clips are longer than the 960 ms that leaves. For those five the
       backstop won, the screen was told the sound had finished while it was
       still playing, and the scaffold lifted its quiet up to 120 ms early: a
       blink of the object at the tail of the word. The formula is READ from
       the source rather than repeated here, so lowering it fails this test
       instead of passing it twice. */
    const manifest = JSON.parse(readFileSync("app/public/voice/manifest.json", "utf8"));
    const sounds = Object.entries(manifest).filter(([k]) => k.startsWith("d:"));
    expect(sounds.length, "the sound tier is present").toBeGreaterThan(40);
    const longest = Math.max(...sounds.map(([, v]) => (v && v.ms) || 0));
    expect(longest, "d:long_o, the longest single sound, measured from the manifest").toBe(1080);
    const src = readFileSync("app/src/App.jsx", "utf8");
    const m = /once\(0\), soundOn \? (\d+) \* ids\.length \+ (\d+) : 0\)/.exec(src);
    expect(m, "playBuildSounds still backstops on a sound-guarded budget").toBeTruthy();
    const budget = Number(m[1]) * 1 + Number(m[2]);
    /* the report fires at the clip's scheduled length plus the 140 ms lead */
    expect(budget, `a one-sound backstop of ${budget} ms must outlast ${longest} + 140`).toBeGreaterThan(longest + 140);
    /* and with sound off there is nothing to wait for */
    expect(src).toContain("soundOn ? ");
  });

  it("26c: the scaffold's quiet ends on the last slot's own report, never on a clock", async () => {
    /* THIS IS THE TEST 26 COULD NOT BE. Its double reports every sound
       finished the instant it starts, so the fixed screen and the
       (n-1)*900+700 screen it replaced are indistinguishable under it -
       measured: reverting the implementation leaves 26 green. Here the
       scaffold's last slot is HELD, so the clock's moment passes while the
       sound is still playing. "cat" is three slots: the scaffold is queued
       900 ms after the second miss and plays a slot every 900 ms, so the last
       one starts 2,700 ms after the miss and the old clock lifted the quiet
       at 2,500. Standing at 4,000 is past that clock and still inside the
       held clip. */
    const tray = mount("cat", 8);
    const seed = () => document.querySelector(".wq-glowseed");
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    for (let go = 0; go < 2; go += 1) {
      fireEvent.click(wrong);
      for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
      await flush(60);
      if (go === 0) slots().forEach((s) => fireEvent.click(s));
    }
    holdSounds(true);                    // from here a slot's report is held
    await flush(4000);
    expect(heldReports.length, "a scaffold slot's report is being held, so the screen is inside a clip").toBeGreaterThan(0);
    expect(document.querySelectorAll(".wq-ghost").length, "the scaffold has run").toBe(0);
    await act(async () => { emitAudio({ state: "start", token: 31, ms: 300 }); });
    expect(seed().getAttribute("data-wq-glowseed"), "the clip has not reported, so the quiet must still hold").toBe("idle");
    await act(async () => { emitAudio({ state: "end", token: 31 }); });
    await act(async () => { while (fireDeferred()) { /* the slot reports in */ } });
    await flush(60);
    holdSounds(false);
    await act(async () => { emitAudio({ state: "start", token: 32, ms: 300 }); });
    expect(seed().getAttribute("data-wq-glowseed"), "the scaffold has reported in, so a later play lights it").toBe("lit");
  });

  it("26d: a win during the scaffold lets the celebration light the object", async () => {
    /* The win path clears the scaffold's quiet as well as its timers. Without
       that line the child wins mid-scaffold and the celebration speaks over a
       dark object, which is the one thing the object must never do: be dark
       while the game is talking. Test 25 walks this path and reads only the
       cue ring, so the line could be deleted with every test green. */
    const tray = mount("cat", 8);
    const seed = () => document.querySelector(".wq-glowseed");
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    for (let go = 0; go < 2; go += 1) {
      fireEvent.click(wrong);
      for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
      await flush(60);
      if (go === 0) slots().forEach((s) => fireEvent.click(s));
    }
    await flush(1000);
    expect(document.querySelectorAll(".wq-tilebtn.wq-cue").length, "the scaffold is running").toBe(1);
    await act(async () => { emitAudio({ state: "start", token: 41, ms: 300 }); });
    expect(seed().getAttribute("data-wq-glowseed"), "quiet, because the scaffold is speaking").toBe("idle");
    await act(async () => { emitAudio({ state: "end", token: 41 }); });
    for (const t of tray.answer) fireEvent.click(tileFor(t)[0]);
    await flush(50);
    expect(screen.getByText(/You built/), "the child won mid-scaffold").toBeTruthy();
    await act(async () => { emitAudio({ state: "start", token: 42, ms: 300 }); });
    expect(seed().getAttribute("data-wq-glowseed"), "the celebration is speaking, so the object is lit").toBe("lit");
  });

  it("27: the tray's sizes follow the phone, not the render that drew them - a rotation resizes the tiles with no tap in between", async () => {
    /* The fault, measured on a real browser before the fix (2026-08-23): at
       740 px wide the tiles are 90 x 64, and after rotating to 320 they were
       STILL 90 x 64 - the compact build was read once at render and nothing
       was subscribed. Here the media query is driven directly, so the test
       fails if the subscription is ever dropped. */
    const listeners = new Set();
    const query = { matches: true, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
    const real = window.matchMedia;
    window.matchMedia = (q) => { query.query = q; return query; };
    try {
      const tray = mount("cat");
      expect(query.query, "the boundary is asked as a min-width, so it is the same CSS pixel the old innerWidth read used").toBe("(min-width: 360px)");
      const slotBox = () => { const r = slots()[0].getAttribute("style") || ""; return r.replace(/\s/g, ""); };
      expect(slotBox()).toContain("width:64px");
      expect(slotBox()).toContain("height:64px");
      /* the phone turns: the query changes, nothing is tapped */
      query.matches = false;
      await act(async () => { for (const fn of [...listeners]) fn(); });
      expect(slotBox(), "no tap in between").toContain("width:56px");
      expect(slotBox()).toContain("height:56px");
      /* a multi-letter tile follows the smaller letter step too */
      const wide = tiles().find((b) => b.textContent.length > 1);
      if (wide) expect(wide.getAttribute("style").replace(/\s/g, "")).toContain("width:76px");
      /* and back */
      query.matches = true;
      await act(async () => { for (const fn of [...listeners]) fn(); });
      expect(slotBox()).toContain("width:64px");
      expect(tray.answer.length).toBe(3);
    } finally { window.matchMedia = real; }
  });
  it("27b: with no matchMedia at all - jsdom, and any browser too old for it - the tray still sizes itself from the width", async () => {
    const real = window.matchMedia;
    delete window.matchMedia;
    try {
      mount("cat");
      const style = (slots()[0].getAttribute("style") || "").replace(/\s/g, "");
      expect(style, "jsdom reports 1024 px, so the full-size build").toContain("width:64px");
      expect(window.innerWidth).toBeGreaterThanOrEqual(360);
    } finally { window.matchMedia = real; }
  });

  it("24: a completed word wears one halo on the slot row round the assembled word, and every tray tile is disabled and used", async () => {
    const tray = mount("cat");
    for (const t of tray.answer) fireEvent.click(tileFor(t)[0]);
    await flush(50);
    const filled = screen.getAllByLabelText(/^Take back/);
    expect(filled.length).toBe(3);
    expect(filled.every((b) => b.disabled)).toBe(true);
    /* one halo round the assembled word - on the slot row, not per slot */
    expect(document.querySelectorAll(".wq-slotrow.wq-won").length).toBe(1);
    expect(document.querySelector(".wq-slotrow.wq-won").querySelectorAll(".wq-tilebtn").length).toBe(3);
    /* and every tray tile, spent or not, is a disabled control that LOOKS
       disabled: the used face under the dashed rim (the checkpoint found the
       unspent ones wearing the available ceramic) */
    expect(tiles().every((b) => b.disabled && b.classList.contains("wq-used"))).toBe(true);
  });

  it("25: a win during the scaffold takes the cue ring off the slot it was on", async () => {
    /* the checkpoint renders caught a won slot still ringed: the win cleared
       the timer that would have cleared the cue */
    const tray = mount("cat", 8);
    const wrong = tiles().find((b) => !tray.answer.includes(b.textContent));
    for (let go = 0; go < 2; go += 1) {
      fireEvent.click(wrong);
      for (const t of tray.answer.slice(0, 2)) fireEvent.click(tileFor(t)[0]);
      await flush(60);
      if (go === 0) slots().forEach((s) => fireEvent.click(s));
    }
    await flush(1000);
    expect(document.querySelectorAll(".wq-tilebtn.wq-cue").length).toBe(1);
    for (const t of tray.answer) fireEvent.click(tileFor(t)[0]);
    await flush(50);
    expect(screen.getByText(/You built/)).toBeTruthy();
    expect(document.querySelectorAll(".wq-tilebtn.wq-cue").length).toBe(0);
    expect(document.querySelectorAll(".wq-slotrow.wq-won").length).toBe(1);
  });
});

/* BUILD-A-SOUND (open-faults Q6, owner-ruled 2026-08-17). The ladder's version:
   one slot, a spoken sound for a prompt, and a tray of the letters the child
   has been taught. */
describe("Build-a-sound, for a child still on the ladder", () => {
  it("9: Pre 1 gets no tray at all — it has met no letters", () => {
    expect(buildSoundTray(1, () => 0.3)).toBeNull();
    expect(preLetters(1)).toEqual([]);
  });

  it("10: the tray is exactly what the rung has taught, and grows with it", () => {
    /* The three-rung ladder of the cutover: the ear, s-a-t-p, i-n. */
    expect(preLetters(2)).toEqual(["s", "a", "t", "p"]);
    expect(preLetters(3)).toEqual(["s", "a", "t", "p", "i", "n"]);
    expect(preLetters(3).length).toBe(6);
    for (const [rung, size] of [[2, 4], [3, 6]]) {
      const t = buildSoundTray(rung, () => 0.3);
      expect(t.tiles.length).toBe(size);
      expect(t.slots).toBe(1);
      expect(t.tiles).toContain(t.target);
    }
  });

  it("11: no tile is silent, and none is a letter the rung has not reached", () => {
    const shipped = new Set(Object.keys(JSON.parse(readFileSync("app/public/voice/manifest.json", "utf8"))));
    for (const rung of [2, 3]) {
      const t = buildSoundTray(rung, () => 0.5);
      expect(t.sounds.every((id) => shipped.has(id))).toBe(true);
      expect(t.tiles.every((c) => preLetters(rung).includes(c))).toBe(true);
    }
    /* the control: a sound id the pack does not hold is seen as missing */
    expect(shipped.has("d:zzz")).toBe(false);
  });

  it("12: finding the sound wins, and a wrong tile invites another try", async () => {
    const tray = buildSoundTray(3, () => 0.3);
    render(createElement(BuildItScreen, {
      tray,
      playWord: (w, then) => { played.push("word:" + w); if (then) then(); },
      playSounds: (ids, then) => { played.push("sounds:" + ids.join(",")); if (then) then(); },
      soundIdsOf: (w) => chunkWord(w).map((c) => "d:" + c),
      onDone: () => {}, onExit: () => {},
    }));
    /* the prompt is the SOUND, spoken first and never assembled from tiles */
    expect(played[0]).toBe("sounds:" + tray.prompt);
    const wrong = tiles().find((b) => b.textContent !== tray.target);
    fireEvent.click(wrong);
    await flush(50);
    expect(screen.getByText(/different sound/)).toBeTruthy();
    fireEvent.click(slots()[0]);                       // take it back
    fireEvent.click(tiles().find((b) => b.textContent === tray.target));
    await flush(50);
    expect(screen.getByText(/You found it/)).toBeTruthy();
  });
  it("13: a miss hands the tray back by itself - the wrong tile does not sit in the slot", async () => {
    /* The owner, 2026-08-21: "once you pick a sound, if you make a wrong
       choice, there is no way to choose a different sound." Beta 22 left the
       wrong tile in the single slot and the only way on was a tap nothing
       explained. After the miss is heard, the slot is empty again with no
       tap at all, and the next tile goes straight in. */
    const tray = buildSoundTray(3, () => 0.3);
    render(createElement(BuildItScreen, {
      tray,
      playWord: (w, then) => { played.push("word:" + w); if (then) then(); },
      playSounds: (ids, then) => { played.push("sounds:" + ids.join(",")); if (then) then(); },
      soundIdsOf: (w) => chunkWord(w).map((c) => "d:" + c),
      onDone: () => {}, onExit: () => {},
    }));
    const wrong = tiles().find((b) => b.textContent !== tray.target);
    fireEvent.click(wrong);
    await flush(50);
    expect(screen.getByText(/different sound/)).toBeTruthy();
    expect(slots()[0].textContent).toBe("");                  // handed back, untouched
    fireEvent.click(tiles().find((b) => b.textContent === tray.target));   // straight in
    await flush(50);
    expect(screen.getByText(/You found it/)).toBeTruthy();
  });
});

describe("free play builds go on until Done", () => {
  /* The owner, 2026-08-21: Find-the-sound "only lets you pick one sound then
     kicks you out". Free play is endless by design; a finished build deals
     the next one, and only the Done control leaves. Driven through the real
     App on a pre-ladder save, tiles tried in order until the right one -
     misses are unlimited and the slot clears itself (test 13). */
  it("19: a child at level 1 and at level 2 gets a build, not an error", async () => {
    /* The owner's worry, answered by driving it rather than by reasoning
       (2026-08-21): "present level and two below" has no two below at levels
       1 and 2. Nothing throws - the window clamps to level 1 - and a word
       from what the child has met is spoken. The page errors are captured,
       because a thrown render leaves a screen that merely LOOKS empty. */
    const App = (await import("../app/src/App.jsx")).default;
    const { LEVELS } = engine;
    for (const level of [1, 2]) {
      const thrown = [];
      const catcher = (e) => { thrown.push(String(e.error || e.message)); e.preventDefault(); };
      window.addEventListener("error", catcher);
      try {
        played.length = 0;
        stored = { ...newState(), preLevel: 0, level };
        render(createElement(App));
        await flush(0);
        fireEvent.click(screen.getByLabelText("Free play"));
        await flush(0);
        fireEvent.click(screen.getByLabelText(`Build a level ${level} word`));
        await flush(0);
        expect(thrown).toEqual([]);
        expect(screen.getByText(/Build a word/)).toBeTruthy();
        const spoken = played.find((x) => x.startsWith("word:"));
        expect(spoken).toBeTruthy();
        const met = LEVELS.slice(0, level).flatMap((l) => l.words);
        expect(met.includes(spoken.slice(5))).toBe(true);   // only words the child has met
      } finally {
        window.removeEventListener("error", catcher);
        cleanup();
      }
    }
  });

  it("18: every level's build window holds words, the first two included", () => {
    /* The owner's question when the window landed (2026-08-21): levels 1 and
       2 have no two levels below them. The window clamps at 1, and this
       proves the clamp leaves words on the shelf - for EVERY level, not just
       those two. The constant is read from the app rather than re-typed, so
       widening or narrowing the window brings its own arithmetic here. */
    const src = readFileSync("app/src/App.jsx", "utf8");
    const W = Number(/const BUILD_WINDOW = (\d+);/.exec(src)[1]);
    expect(W).toBe(3);
    const { LEVELS, buildable } = engine;
    const windowOf = (L) => LEVELS.slice(Math.max(1, L - (W - 1)) - 1, L).flatMap((l) => l.words).filter(buildable);
    const counts = LEVELS.map((l) => windowOf(l.n).length);
    expect(Math.min(...counts)).toBe(4);            // level 45, the thinnest shelf in the bank
    expect(counts.filter((n) => n === 0).length).toBe(0);
    /* The two levels the question was about, measured: level 1 stands on its
       own ten words, level 2 on twenty. */
    expect(windowOf(1).length).toBe(10);
    expect(windowOf(2).length).toBe(20);
    expect(windowOf(1).every((w) => LEVELS[0].words.includes(w))).toBe(true);
  });

  it("17: a long word's celebration is never cut off - the turn ends when the sound does", async () => {
    /* The owner on "biting" (2026-08-21): the sound-out reached b-i-t-i and
       stopped, because the turn ended on a fixed 2,600 ms while a five-tile
       word's celebration runs longer. The screen now waits for the players
       to report they have finished. Driven with SLOW players - each hands
       back after 3 s - and the turn must not end before they do. */
    const tray = trayFor("biting", 73);
    let ended = 0;
    const pending = [];
    render(createElement(BuildItScreen, {
      tray,
      playWord: (w, then) => { played.push("word:" + w); if (then) pending.push([then, 3000]); },
      playSounds: (ids, then) => { played.push("sounds:" + ids.join(",")); if (then) pending.push([then, 3000]); },
      soundIdsOf: (w) => chunkWord(w).map((c) => "d:" + c),
      onDone: () => { ended += 1; }, onExit: () => {},
    }));
    const run = async (ms) => { const q = pending.splice(0); for (const [fn] of q) fn(); await flush(ms); };
    /* "biting" needs the i tile twice and the tray carries two of them, so
       each slot takes the next UNUSED tile of that letter - clicking the
       same one twice places nothing (test 6's lesson, met again). */
    const used = new Set();
    for (const t2 of tray.answer) {
      const i = tray.tiles.findIndex((x, k) => x === t2 && !used.has(k));
      used.add(i);
      fireEvent.click(tiles()[i]);
    }
    await flush(0);
    await run(0);                                   // the last tile's own sound lands, and the check runs
    expect(screen.getByText(/You built biting/)).toBeTruthy();
    await flush(2600);
    expect(ended).toBe(0);                          // the old fixed timer would have ended it here
    await run(0);                                   // the sound-out finishes -> the word speaks
    /* Twice in all: once as the prompt at the start of the turn, once to
       close the celebration. */
    expect(played.filter((x) => x === "word:biting").length).toBe(2);
    expect(played.at(-1)).toBe("word:biting");
    expect(ended).toBe(0);                          // still celebrating: the word is speaking
    await run(950);                                 // the word finishes, then the 900 ms beat
    expect(ended).toBe(1);
  });

  it("15: 'Build a level word' deals the level's own word, mastery elsewhere notwithstanding", async () => {
    /* The owner at level 75 was handed "is" and "an" (2026-08-21): the old
       row served mastered words from any level first. The cell promises the
       level, so the word spoken is one of level 75's, even with early words
       mastered on the save. */
    const App = (await import("../app/src/App.jsx")).default;
    const early = { ...newState(), preLevel: 0, level: 75 };
    for (const w of ["is", "an", "at", "in", "it"]) early.words[w] = { box: 5, attempts: 4, correct: 4, close: 0, wrong: 0, dueAt: 99, lastSession: 1 };
    stored = early;
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Free play"));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Build a level 75 word"));   // the cell names the level (2026-08-21)
    await flush(0);
    expect(screen.getByText(/Build a word/)).toBeTruthy();
    const spoken = played.find((x) => x.startsWith("word:"));
    expect(spoken).toBeTruthy();
    const { LEVELS } = await import("../src/engine.js");
    /* The window is the level and the two below (73, 74, 75), so the mode
       still has words where a level holds few buildable ones - and never
       reaches the earliest levels the owner was handed. */
    const window = [73, 74, 75].flatMap((n) => LEVELS[n - 1].words);
    expect(window.includes(spoken.slice(5))).toBe(true);
    expect(["is", "an", "at", "in", "it"].includes(spoken.slice(5))).toBe(false);
  });
  it("16: 'Build any word' opens a build at all", async () => {
    /* Dead on the owner's phone in beta 23: the cell's draw called a bank
       lookup the app had never imported. */
    const App = (await import("../app/src/App.jsx")).default;
    stored = { ...newState(), preLevel: 0, level: 1 };
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Free play"));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Build any word"));
    await flush(0);
    expect(screen.getByText(/Build a word/)).toBeTruthy();
    expect(played.find((x) => x.startsWith("word:"))).toBeTruthy();
  });
  it("14: a found sound is followed by another sound, and Done goes home", async () => {
    const App = (await import("../app/src/App.jsx")).default;
    stored = { ...newState(), preLevel: 3 };
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Free play"));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Find a Pre 3 sound"));
    await flush(0);
    expect(screen.getByText(/Find the sound/)).toBeTruthy();
    const findIt = async () => {
      const n = tiles().length;
      for (let i = 0; i < n; i += 1) {
        fireEvent.click(tiles()[i]);   // re-queried: the tray re-renders after every tap
        await flush(400);              // the App's playSounds hands back 140 ms after scheduling; a miss then re-says the prompt
        if (screen.queryByText(/You found it/)) return true;
      }
      return false;
    };
    expect(await findIt()).toBe(true);
    /* The win must STAY won while it is being celebrated: the scaffolds
       queued by the misses on the way (900 ms out, one per miss past the
       second) may not stamp over it. Re-derived 2026-08-21 when the turn
       stopped ending on a fixed 2,600 ms and started ending when the
       celebration ends - so the window checked here is inside the
       celebration, not past it. */
    await flush(300);
    expect(screen.getByText(/You found it/)).toBeTruthy();
    await flush(2700);                                         // the win's pause, then the NEXT sound
    expect(screen.queryByLabelText("Begin Session")).toBeNull();   // not home
    expect(screen.getByText(/Find the sound/)).toBeTruthy();  // another round
    expect(slots()[0].textContent).toBe("");                     // fresh slot
    fireEvent.click(screen.getByLabelText(/leave building/i));    // Done
    await flush(0);
    expect(screen.getByLabelText("Begin Session")).toBeTruthy();   // now home
    expect(saves.filter((s) => s && s.words && Object.keys(s.words).length)).toEqual([]);   // practice only, still
  });
});
