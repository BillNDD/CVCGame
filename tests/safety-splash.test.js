/* Word Quest — safety gate (G10): the splash update controls (SPEC section
   7a, owner-approved 2026-08-07). Split from tests/safety.test.js when that
   file reached the G6 file-length ceiling — the same door S5's file left by.
   The gauntlet SUMS this file and tests/safety.test.js into the one
   `g10_safety_tests` floor, so a test lost from either is still a red build.
   The subject: the update controls sit in the grown-up strip of the child's
   first screen, so they take the same 450 ms hold as the adult result
   controls. S6's promise — the network is only ever touched by a deliberate
   adult act — has to survive any number of child taps, and "Update now"
   restarts the app, so it above all is never one tap away.
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { createElement } from "react";

vi.mock("../app/src/storage.js", () => ({
  loadState: vi.fn(async () => null),
  saveState: vi.fn(async () => true),
}));
window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
Object.defineProperty(window, "speechSynthesis", {
  configurable: true,
  value: { cancel: () => {}, speak: () => {} },
});
const { default: App } = await import("../app/src/App.jsx");

const flush = async (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("G10 safety — S6: the splash update controls are adult holds", () => {
  it("49: a child's tap asks nothing; the adult's activation asks once, the app's own host", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({ version: "0.0.0-test" }) }));
    vi.stubGlobal("fetch", fetchSpy);
    /* The boot's own local fetch of the voice-pack manifest is not the
       subject here: the property is that no VERSION request ever leaves
       without the adult hold. */
    const versionAsks = () => fetchSpy.mock.calls.filter(([url]) => url === "version.json").length;
    try {
      render(createElement(App));
      await flush(0);
      const btn = screen.getByLabelText("↻ Check for updates (hold)");
      fireEvent.click(btn, { detail: 1 });               // the child's tap
      await flush(600);
      fireEvent.pointerDown(btn);                        // a press that lets go too soon
      await flush(300);
      fireEvent.pointerUp(btn);
      await flush(600);
      expect(versionAsks()).toBe(0);
      fireEvent.keyDown(btn, { key: "Enter" });          // the keyboard operates it directly
      await flush(0);
      expect(versionAsks()).toBe(1);
      expect(fetchSpy).toHaveBeenCalledWith("version.json", { cache: "no-store" });
      screen.getByText("You have the latest version.");  // same version: current, nothing offered
      expect(screen.queryByLabelText("⬆️ Update now (hold)")).toBeNull();
    } finally { vi.unstubAllGlobals(); }
  });

  it("50: Update now appears only after a newer version answers, and only the adult hold sends the consent message", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({ version: "9.9.9" }) }));
    vi.stubGlobal("fetch", fetchSpy);
    const posted = [];
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        addEventListener: () => {}, removeEventListener: () => {},
        getRegistration: async () => ({ update: async () => {}, waiting: { postMessage: (m) => posted.push(m) }, installing: null }),
      },
    });
    try {
      render(createElement(App));
      await flush(0);
      expect(screen.queryByLabelText("⬆️ Update now (hold)")).toBeNull();  // never offered unasked
      fireEvent.keyDown(screen.getByLabelText("↻ Check for updates (hold)"), { key: "Enter" });
      await flush(0);
      screen.getByText("Version 9.9.9 is ready — press and hold.");
      const up = screen.getByLabelText("⬆️ Update now (hold)");
      fireEvent.click(up, { detail: 1 });                // the child's tap on the one control that restarts the app
      await flush(600);
      expect(posted).toEqual([]);
      fireEvent.keyDown(up, { key: "Enter" });           // the adult's activation
      await flush(0);
      expect(posted).toEqual(["wq-activate"]);           // the consent message, and nothing else
    } finally {
      vi.unstubAllGlobals();
      delete navigator.serviceWorker;
    }
  });
});
