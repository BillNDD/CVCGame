/* WHAT A SCREEN READER IS TOLD (art project step 0a, owner-ruled 2026-08-22,
   the reading and accessibility chair's first finding).
   Every control's accessible name is its visible words and nothing else: no
   pictograph, no symbol, no "(hold)" about a pointer that the keyboard and
   assistive technology never use (S5). A control with no aria-label must
   carry no pictograph in its text either, or the screen reader reads the
   emoji. Walked over the real screens - home, the chooser, the corner, a
   session, a build, the done screens, the pre-ladder, the error boundary -
   and proved against a planted "✓ got it (hold)" (E5).
   @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";
import { newState, buildTray } from "../src/engine.js";
import { plainLabel } from "../app/src/labels.js";

vi.mock("../app/src/voicepacks.js", () => ({
  initVoicePacks: async () => {}, unlockVoice: () => {}, stopClips: () => {}, microphoneUsed: () => {},
  familyClipIds: () => new Set(), onAudio: () => () => {}, speakVoice: () => {}, playClips: (plan, enabled, fallback, onScheduled = () => {}) => { onScheduled(0, []); },
}));
vi.mock("../app/src/storage.js", () => ({ loadState: () => stored, saveState: () => {} }));
let stored;
const App = (await import("../app/src/App.jsx")).default;
const DoneScreen = (await import("../app/src/screens/DoneScreen.jsx")).default;
const PreDoneScreen = (await import("../app/src/screens/PreDoneScreen.jsx")).default;
const BuildItScreen = (await import("../app/src/screens/BuildItScreen.jsx")).default;
const ErrorBoundary = (await import("../app/src/components/ErrorBoundary.jsx")).default;
const HoldButton = (await import("../app/src/components/HoldButton.jsx")).default;

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const PICTOGRAPH = /[←-⇿⌀-⏿■-➿⬀-⯿\u{1F000}-\u{1FAFF}]/u;
const PLAIN = /^[A-Za-z0-9 ,.'’!?()-]+$/;

/* The rule, over every button on the screen. Returns the offences. */
export function offences(root = document) {
  const out = [];
  /* buttons, and any label that wraps an input - the shape the corner's
     "Load backup file" had, which this walker could not see while it read
     buttons alone (the council's after pass on step 0, 2026-08-22) */
  const controls = [...root.querySelectorAll("button"), ...[...root.querySelectorAll("label")].filter((l) => l.querySelector("input"))];
  for (const b of controls) {
    /* a label's own aria-label does not name the input it wraps - the input
       is named from the label's text - so a label is judged by its text
       whatever it carries (the re-judgement of step 0, 2026-08-22) */
    const label = b.tagName === "LABEL" ? null : b.getAttribute("aria-label");
    const text = (b.textContent || "").trim();
    if (label !== null) {
      if (!PLAIN.test(label)) out.push(`"${label}" is not plain words`);
      if (/\(hold\)/.test(label)) out.push(`"${label}" tells a screen reader about a pointer hold`);
      const words = plainLabel(text);
      if (words && !label.includes(words)) out.push(`"${label}" does not contain its visible words "${words}"`);
    } else if (PICTOGRAPH.test(text)) {
      out.push(`"${text}" has a pictograph and no aria-label - the screen reader reads the emoji`);
    }
  }
  return out;
}

describe("every control is named in plain words", () => {
  afterEach(() => { vi.useRealTimers(); cleanup(); });

  it("1: home, the chooser, the corner, a session and a build", async () => {
    vi.useFakeTimers();
    stored = { ...newState(), level: 3, preLevel: 0 };
    render(createElement(App));
    await flush(0);
    expect(offences(), "home").toEqual([]);
    fireEvent.click(screen.getByLabelText("Free play"));
    await flush(0);
    expect(offences(), "chooser").toEqual([]);
    fireEvent.click(screen.getByLabelText("Build a level 3 word"));
    await flush(0);
    expect(offences(), "build").toEqual([]);
    fireEvent.click(screen.getByLabelText(/leave building/i));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Grown-ups corner"));
    await flush(0);
    expect(offences(), "corner").toEqual([]);
    fireEvent.click(screen.getByLabelText("Back"));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    expect(offences(), "session, ready").toEqual([]);
    expect(screen.getByLabelText("got it")).toBeTruthy();          // the adult hold, by its plain name
    expect(screen.queryByLabelText(/hold/)).toBeNull();
  });

  it("2: the done screens, the pre-ladder's first rung, and the way home from a crash", async () => {
    vi.useFakeTimers();
    render(createElement(DoneScreen, { doneStats: { c: 3, k: 1, w: 0, acc: 75, promoted: false, level: 3 }, kid: "", onHome: () => {}, toast: "" }));
    expect(offences(), "done").toEqual([]);
    cleanup();
    render(createElement(PreDoneScreen, { preDone: { c: 3, k: 0, w: 0, n: 3, level: 1 }, onHome: () => {} }));
    expect(offences(), "pre done").toEqual([]);
    cleanup();
    stored = { ...newState(), level: 1, preLevel: 1 };
    render(createElement(App));
    await flush(0);
    fireEvent.click(screen.getByLabelText("Begin Session"));
    await flush(0);
    expect(offences(), "pre session").toEqual([]);
    cleanup();
    const tray = buildTray("sat", 1, () => 0.3);
    render(createElement(BuildItScreen, { tray, playWord: () => {}, playSounds: () => {}, soundIdsOf: () => [], onDone: () => {}, onExit: () => {} }));
    expect(offences(), "build-it").toEqual([]);
    cleanup();
    let explode = true;
    function throwingChild() { if (explode) throw new Error("boom"); return null; }
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    render(createElement(ErrorBoundary, { screen: () => "home", version: "t" }, createElement(throwingChild)));
    expect(offences(), "crash screen").toEqual([]);
    explode = false;
    quiet.mockRestore();
  });

  it("3 (control): a hold named the old way, a bare emoji button, and a label round an input are each refused", () => {
    render(createElement(HoldButton, { onFire: () => {}, color: "#0f7a4f", label: "✓ got it" }));
    /* HoldButton now names itself plainly; the control plants the OLD name
       over it and a bare emoji button beside it. */
    const hold = document.querySelector("button");
    hold.setAttribute("aria-label", "✓ got it (hold)");
    const bare = document.createElement("button");
    bare.textContent = "▶️ Begin Session";
    document.body.appendChild(bare);
    const wrapped = document.createElement("label");
    wrapped.textContent = "⬆️ Load backup file";
    wrapped.appendChild(document.createElement("input"));
    document.body.appendChild(wrapped);
    const dressed = document.createElement("label");
    dressed.setAttribute("aria-label", "Load backup file");   // names the label, never its input
    dressed.textContent = "⬆️ Load backup file";
    dressed.appendChild(document.createElement("input"));
    document.body.appendChild(dressed);
    const found = offences();
    expect(found.some((o) => o.includes("not plain words"))).toBe(true);
    expect(found.some((o) => o.includes("pointer hold"))).toBe(true);
    expect(found.filter((o) => o.includes("reads the emoji")).length, "the bare button, the label round an input, and the label that thinks its aria-label names the input").toBe(3);
    bare.remove(); wrapped.remove(); dressed.remove();
  });
});
