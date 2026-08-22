/* MODEL-BASED TESTS (owner-ruled 2026-08-22, bug-hunt page, model: A).
   Three of the ten bugs reported from the owner's phone between beta 22 and
   beta 25 were sequences of taps that led to a screen with no way out:
   Find-the-sound ended after one pick, a wrong pick left no way to pick again,
   and two chooser cells did nothing. None was a wrong number; each was a
   STATE the design forbids, reached by a sequence nobody had written down.

   A model-based test writes the rules of a screen in a few lines and lets
   fast-check drive the REAL component through random sequences of the taps a
   child can make, asking after every one whether the screen still agrees
   with the model. A broken rule fails with the shortest sequence that breaks
   it, and the seed that found it. The model is deliberately small: slots,
   misses, won, done - what a child sees, never how the screen computes it.

   Controls (E5): each model is also turned against a screen behaving the way
   the shipped bug behaved, and must refuse it.
   @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";
import fc from "fast-check";
import { buildTray, buildSoundTray, chunkWord, newState, LEVELS, sentencesUpTo } from "../src/engine.js";

const played = [];
vi.mock("../app/src/voicepacks.js", () => ({
  initVoicePacks: async () => {},
  unlockVoice: () => {},
  stopClips: () => {},
  microphoneUsed: () => {},
  familyClipIds: () => new Set(),
  speakVoice: (kind, word) => { played.push("word:" + word); },
  playClips: (plan, enabled, fallback, onScheduled = () => {}) => { onScheduled(0, []); },
}));
vi.mock("../app/src/storage.js", () => ({
  loadState: () => stored,
  saveState: () => {},
}));
let stored;
const BuildItScreen = (await import("../app/src/screens/BuildItScreen.jsx")).default;

const tick = (ms) => act(() => { vi.advanceTimersByTime(ms); });
const flushAsync = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

// ------------------------------------------------- Build-it and Find-the-sound
/* The screen, rendered with players that hand back AT ONCE, so the only
   clocks in a run are the screen's own: 900 ms to the help after the second
   miss, and 900 ms from the end of the celebration to onDone. */
function mount(tray) {
  const calls = { done: 0, exit: 0 };
  render(createElement(BuildItScreen, {
    tray,
    playWord: (w, then) => { if (then) then(); },
    playSounds: (ids, then) => { if (then) then(); },
    soundIdsOf: (w) => chunkWord(w).map((c) => "d:" + c),
    onDone: () => { calls.done += 1; },
    onExit: () => { calls.exit += 1; },
  }));
  return calls;
}
const tilesOnScreen = () => screen.getAllByLabelText(/^Tile /);
const slotsOnScreen = () => screen.getAllByLabelText(/^(Empty space|Take back )/);
const filledOnScreen = () => slotsOnScreen().filter((b) => b.getAttribute("aria-label").startsWith("Take back")).length;
const textOnScreen = () => document.body.textContent;

/* What the model remembers. `t` is the screen's clock; `scaffolds` are the
   moments the help after a miss will clear the slots; `doneAt` is when a win
   hands the turn back. */
/* What the runs actually reached, so a run that never won, never missed or
   never saw the help cannot pass as proof of those paths. Asserted after each
   model run; a vacuous pass is the control that cannot fail (E5). */
const reached = { wins: 0, misses: 0, scaffolds: 0, done: 0, left: 0 };
const freshModel = (tray) => ({ tray, slots: tray.answer.map(() => null), misses: 0, won: false, done: false,
  t: 0, scaffolds: [], doneAt: null });

/* The one sentence every command checks: the screen shows exactly the
   model's slots, no tile is dimmed that the model holds free, and the way
   out is always on screen. This is the sentence the shipped bugs broke. */
function agree(m) {
  expect(filledOnScreen()).toBe(m.slots.filter((x) => x !== null).length);
  const used = new Set(m.slots.filter((x) => x !== null));
  tilesOnScreen().forEach((b, i) => expect(b.style.opacity === "0.22").toBe(used.has(i)));
  expect(screen.getByLabelText("Leave building")).toBeTruthy();
  expect(screen.getByText(/Hear the (word|sound)/)).toBeTruthy();
}
function judge(m) {
  const built = m.slots.map((i) => m.tray.tiles[i]).join("");
  if (built === m.tray.answer.join("")) {
    m.won = true; m.doneAt = m.t + 900; m.scaffolds = [];    // a win cancels every help still queued
    reached.wins += 1;
    expect(textOnScreen()).toMatch(/You (found it|built)/);
    return;
  }
  m.misses += 1; reached.misses += 1;
  m.slots = m.tray.answer.map(() => null);                   // handed back, always
  if (m.misses >= 2) m.scaffolds.push(m.t + 900);
  expect(textOnScreen()).toMatch(/listen again/);
}
class Place {
  constructor(i) { this.i = i; }
  check(m) { return !m.done && this.i < m.tray.tiles.length; }
  run(m) {
    fireEvent.click(tilesOnScreen()[this.i]);
    const empty = m.slots.indexOf(null);
    if (!m.won && !m.slots.includes(this.i) && empty >= 0) {
      m.slots[empty] = this.i;
      if (m.slots.every((x) => x !== null)) judge(m);
    }
    agree(m);
  }
  toString() { return `place tile ${this.i}`; }
}
class Lift {
  constructor(k) { this.k = k; }
  check(m) { return !m.done && this.k < m.tray.answer.length; }
  run(m) {
    fireEvent.click(slotsOnScreen()[this.k]);
    if (!m.won && m.slots[this.k] !== null) m.slots[this.k] = null;
    agree(m);
  }
  toString() { return `lift slot ${this.k}`; }
}
class Hear {
  check(m) { return !m.done; }
  run(m) { fireEvent.click(screen.getByText(/Hear the (word|sound)/)); agree(m); }
  toString() { return "hear the prompt again"; }
}
class Wait {
  constructor(ms) { this.ms = ms; }
  check(m) { return !m.done; }
  run(m, real) {
    tick(this.ms);
    m.t += this.ms;
    const due = m.scaffolds.filter((at) => at <= m.t);
    m.scaffolds = m.scaffolds.filter((at) => at > m.t);
    if (due.length) {
      /* The help takes the slots over: whatever was placed since the miss is
         cleared and the answer is shown, one slot at a time. */
      m.slots = m.tray.answer.map(() => null); reached.scaffolds += 1;
      expect(textOnScreen()).toMatch(/Watch (where each sound goes|which tile it is)/);
    }
    if (m.doneAt !== null && m.t >= m.doneAt) { m.done = true; reached.done += 1; expect(real.done).toBe(1); return; }
    expect(real.done).toBe(0);
    agree(m);
  }
  toString() { return `wait ${this.ms} ms`; }
}
/* A child who knows the word: fills every empty slot with the next unused
   tile of the answer's letter, in order. Random taps almost never spell a
   word - 200 runs of them reached zero wins - so the win path needs a
   command that means to win. Through the same place() as any tap. */
class Solve {
  check(m) { return !m.done && !m.won; }
  run(m) {
    const before = m.misses;
    for (let k = m.slots.indexOf(null); k >= 0 && !m.won && m.misses === before; k = m.slots.indexOf(null)) {
      const want = m.tray.answer[k];
      const i = m.tray.tiles.findIndex((tile, idx) => tile === want && !m.slots.includes(idx));
      if (i < 0) break;                                       // a slot already holds the wrong tile; a tap cannot fix that
      new Place(i).run(m);
    }
  }
  toString() { return "solve"; }
}
/* A child who tries and gets it wrong: fills every empty slot, preferring a
   tile that is NOT the answer's letter for that slot, so the build is judged
   a miss. Two of these and a wait reach the help, which random taps on a
   five-slot word never did in 200 runs. */
class Miss {
  check(m) { return !m.done && !m.won; }
  run(m) {
    const before = m.misses;                                  // one judged build, then stop: a miss empties the slots again
    for (let k = m.slots.indexOf(null); k >= 0 && !m.won && m.misses === before; k = m.slots.indexOf(null)) {
      const free = (idx) => !m.slots.includes(idx);
      let i = m.tray.tiles.findIndex((tile, idx) => tile !== m.tray.answer[k] && free(idx));
      if (i < 0) i = m.tray.tiles.findIndex((tile, idx) => free(idx));
      if (i < 0) break;
      new Place(i).run(m);
    }
  }
  toString() { return "build it wrong"; }
}
class Leave {
  check(m) { return !m.done; }
  run(m, real) { fireEvent.click(screen.getByLabelText("Leave building")); m.done = true; reached.left += 1; expect(real.exit).toBe(1); }
  toString() { return "leave"; }
}
/* Indices are drawn up to a bound and filtered by check(): fast-check's
   commands are drawn independently of the tray, which is how the shrinker
   can cut a failing sequence down. */
const taps = fc.commands([fc.oneof(
  { arbitrary: fc.nat({ max: 11 }).map((i) => new Place(i)), weight: 10 },
  { arbitrary: fc.nat({ max: 6 }).map((k) => new Lift(k)), weight: 3 },
  { arbitrary: fc.constant(new Solve()), weight: 2 },
  { arbitrary: fc.constant(new Miss()), weight: 2 },
  { arbitrary: fc.constant(new Hear()), weight: 1 },
  { arbitrary: fc.constantFrom(100, 500, 900, 1000).map((ms) => new Wait(ms)), weight: 6 },
  { arbitrary: fc.constant(new Leave()), weight: 1 },
)], { maxCommands: 40 });

/* A FIXED seed. fast-check draws a fresh one each run by default, which
   makes the vacuity guard below a coin toss: the same suite passed four
   times and then failed once with "never reached: scaffolds", on a draw that
   happened not to wait after a second miss. A gate must give the same answer
   to the same tree. Change the seed on purpose to walk a different 200. */
const SEED = 20260822;
function runModel(trayArb, numRuns) {
  for (const k of Object.keys(reached)) reached[k] = 0;
  fc.assert(fc.property(trayArb, taps, (tray, cmds) => {
    vi.useFakeTimers();
    try {
      const real = mount(tray);
      const m = freshModel(tray);
      agree(m);
      fc.modelRun(() => ({ model: m, real }), cmds);
    } finally { cleanup(); vi.useRealTimers(); }
  }), { numRuns, seed: SEED });
  /* Every path the model knows was walked at least once, or the run proved
     less than it says. */
  for (const [k, n] of Object.entries(reached)) expect(n, `the runs never reached: ${k} (${JSON.stringify(reached)})`).toBeGreaterThan(0);
}

describe("model: Build-it and Find-the-sound never trap a child", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); played.length = 0; });

  const words = LEVELS.flatMap((l) => l.words.map((w) => [w, l.n])).filter(([w, n]) => buildTray(w, n, () => 0.3));
  const wordTray = fc.constantFrom(...words).map(([w, n]) => buildTray(w, n, () => 0.3));
  const soundTray = fc.integer({ min: 2, max: 5 }).map((p) => buildSoundTray(p)).filter(Boolean);

  it("1: Build-it - 200 random tap sequences over the whole bank keep the screen on the model", () => {
    runModel(wordTray, 200);
  });
  it("2: Find-the-sound - one slot, every sound stays pickable after a miss, Done always there", () => {
    runModel(soundTray, 200);
  });
  it("3 (control): a screen that kept the wrong tile after a miss is refused by the model", () => {
    /* The model turned against beta 22's behaviour. A real screen is driven
       to one miss; the model is then told what beta 22 showed - the wrong
       tile still sitting in the slot, dimmed in the tray - and agree() must
       throw, because the real screen handed the tray back. If agree() could
       not tell those two screens apart, tests 1 and 2 would prove nothing. */
    vi.useFakeTimers();
    const tray = buildSoundTray(3);
    mount(tray);
    const m = freshModel(tray);
    const wrong = tray.tiles.findIndex((t) => t !== tray.answer[0]);
    new Place(wrong).run(m);                                 // the real hand-back agrees with the model
    expect(m.misses).toBe(1);
    const beta22 = { ...m, slots: [wrong] };
    expect(() => agree(beta22)).toThrow();
  });
});

// ------------------------------------------------------------ free-play chooser
/* The chooser's model is the grid itself: which cells a save should see, and
   that every cell opens a screen a child can leave. Dead cells were two of
   the ten. */
describe("model: every free-play cell opens something, and every something can be left", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); played.length = 0; });
  const saveArb = fc.record({
    level: fc.integer({ min: 1, max: LEVELS.length }),
    preLevel: fc.integer({ min: 0, max: 5 }),
    sound: fc.boolean(),
  });
  const home = () => screen.queryByText("🎈 Free play") !== null;
  const cellsOnScreen = () => [...document.querySelectorAll(".wq-cta")].filter((b) => /Level \d+|Any word|Any sentence|Build|Find a Pre/.test(b.textContent));
  const opened = () => screen.queryByText(/Grown-up: pick what to practise/) === null && !home();

  it("4: on a random save, the grid shows the cells the rules say, each opens a screen, and each screen has a way home", async () => {
    const App = (await import("../app/src/App.jsx")).default;
    await fc.assert(fc.asyncProperty(saveArb, fc.nat({ max: 6 }), async (save, pick) => {
      vi.useFakeTimers();
      try {
        stored = { ...newState(), level: save.level, preLevel: save.preLevel };
        stored.settings.sound = save.sound;
        render(createElement(App));
        await flushAsync(0);
        expect(home()).toBe(true);
        fireEvent.click(screen.getByText("🎈 Free play"));
        await flushAsync(0);
        const cells = cellsOnScreen();
        /* The rules of the grid (SPEC section 6): a sentences cell only when
           the level has text; the Sounds row only on the pre-ladder; the
           Build row only off it; build cells dimmed without sound. */
        expect(cells.some((c) => /Level \d+ sentences/.test(c.textContent))).toBe(sentencesUpTo(save.level).length > 0);
        /* Pre 1 has met no letters, so there is nothing to find (open-faults
           Q6, owner-ruled 2026-08-17): the Sounds row starts at Pre 2. */
        expect(cells.some((c) => /Find a Pre/.test(c.textContent))).toBe(save.preLevel >= 2);
        expect(cells.some((c) => /Build a level/.test(c.textContent))).toBe(save.preLevel === 0);
        cells.filter((c) => /Build|Find a Pre/.test(c.textContent)).forEach((c) => expect(c.disabled).toBe(!save.sound));
        const live = cells.filter((c) => !c.disabled);
        expect(live.length).toBeGreaterThan(0);
        const cell = live[pick % live.length];
        const label = cell.textContent;
        fireEvent.click(cell);
        await flushAsync(0);
        expect(opened(), `"${label}" opened nothing`).toBe(true);
        const leave = screen.queryByLabelText("Leave building") || screen.queryByLabelText("Leave session");
        expect(leave, `no way home after "${label}"`).toBeTruthy();
        fireEvent.click(leave);
        await flushAsync(0);
        expect(home(), `"${label}" did not come home`).toBe(true);
      } finally { cleanup(); vi.useRealTimers(); }
    }), { numRuns: 60 });
  });
  it("5 (control): a cell that opens nothing is refused", async () => {
    /* Planted: a cell with its handler detached - the shape of beta 23's
       dead cells. The model's "opened" check must say no. */
    const App = (await import("../app/src/App.jsx")).default;
    vi.useFakeTimers();
    stored = { ...newState(), level: 1, preLevel: 0 };
    render(createElement(App));
    await flushAsync(0);
    fireEvent.click(screen.getByText("🎈 Free play"));
    await flushAsync(0);
    const cell = cellsOnScreen().find((c) => /Any word/.test(c.textContent));
    const dead = cell.cloneNode(true);                         // no React handler survives a clone
    cell.replaceWith(dead);
    fireEvent.click(dead);
    await flushAsync(0);
    expect(opened()).toBe(false);
  });
});
