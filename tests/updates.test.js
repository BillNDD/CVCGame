/* The update system (SPEC section 7a). Runs the real module in jsdom with a
   scripted service-worker registration. The properties under test: the check
   makes exactly one same-origin, cache-bypassing request and reports honest
   states; applying activates only a WAITING worker and only via the consent
   message; and the module can never touch saved progress.
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { checkForUpdate, applyUpdate } from "../app/src/updates.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => fetchMock.mockReset());

describe("checkForUpdate", () => {
  it("reports current when the host matches, bypassing every cache", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: "1.0.0" }) });
    expect(await checkForUpdate("1.0.0")).toEqual({ state: "current", latest: "1.0.0" });
    expect(fetchMock).toHaveBeenCalledWith("version.json", { cache: "no-store" });
  });
  it("reports available when the host is newer", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: "1.0.1" }) });
    expect(await checkForUpdate("1.0.0")).toEqual({ state: "available", latest: "1.0.1" });
  });
  it("reports offline when the request fails, and error on a bad answer", async () => {
    fetchMock.mockRejectedValue(new Error("no network"));
    expect((await checkForUpdate("1.0.0")).state).toBe("offline");
    fetchMock.mockResolvedValue({ ok: false });
    expect((await checkForUpdate("1.0.0")).state).toBe("error");
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: 7 }) });
    expect((await checkForUpdate("1.0.0")).state).toBe("error");
  });
});

describe("applyUpdate", () => {
  function swDouble(reg) {
    const listeners = {};
    const removed = [];
    vi.stubGlobal("navigator", { serviceWorker: {
      addEventListener: (ev, fn) => { listeners[ev] = fn; },
      removeEventListener: (ev, fn) => { removed.push(ev); if (listeners[ev] === fn) delete listeners[ev]; },
      getRegistration: async () => reg,
    } });
    return { removed, fireControllerChange: () => listeners.controllerchange && listeners.controllerchange() };
  }
  function installingDouble() {
    const d = { onState: null, removed: [] };
    d.worker = {
      addEventListener: (ev, fn) => { d.onState = fn; },
      removeEventListener: (ev) => { d.removed.push(ev); },
    };
    return d;
  }

  it("activates a waiting worker with the consent message, and resolves on takeover", async () => {
    const posted = [];
    const reg = { update: async () => {}, waiting: { postMessage: (m) => posted.push(m) }, installing: null };
    const sw = swDouble(reg);
    const p = applyUpdate();
    await new Promise((r) => setTimeout(r, 10));
    expect(posted).toEqual(["wq-activate"]);
    sw.fireControllerChange();
    expect(await p).toBe(true);
  });
  it("resolves false when nothing is waiting", async () => {
    swDouble({ update: async () => {}, waiting: null, installing: null });
    expect(await applyUpdate()).toBe(false);
  });
  it("resolves false without a registration", async () => {
    swDouble(null);
    expect(await applyUpdate()).toBe(false);
  });
  it("cleans up after itself: takeover removes the controllerchange listener", async () => {
    const reg = { update: async () => {}, waiting: { postMessage: () => {} }, installing: null };
    const sw = swDouble(reg);
    const p = applyUpdate();
    await new Promise((r) => setTimeout(r, 10));
    sw.fireControllerChange();
    expect(await p).toBe(true);
    expect(sw.removed).toEqual(["controllerchange"]);
  });
  it("an installing worker that reaches waiting gets the consent message, once", async () => {
    const posted = [];
    const ins = installingDouble();
    const reg = { update: async () => {}, waiting: null, installing: ins.worker };
    const sw = swDouble(reg);
    const p = applyUpdate();
    await new Promise((r) => setTimeout(r, 10));
    expect(posted).toEqual([]);                      // nothing waiting yet: no message
    reg.waiting = { postMessage: (m) => posted.push(m) };
    ins.onState();                                   // the worker just reached "waiting"
    expect(posted).toEqual(["wq-activate"]);
    expect(ins.removed).toEqual(["statechange"]);    // the listener retires with its job done
    sw.fireControllerChange();
    expect(await p).toBe(true);
  });
  it("a statechange after the timeout answers can never activate the worker", async () => {
    /* The blocker from the adversarial review: the adult hears "still
       downloading", walks away, a child plays on - and the download
       finishes. The late statechange must not swap the app mid-session.
       The test above is the control: before the answer, the same
       statechange does activate. */
    vi.useFakeTimers();
    try {
      const posted = [];
      const ins = installingDouble();
      const reg = { update: async () => {}, waiting: null, installing: ins.worker };
      swDouble(reg);
      const p = applyUpdate();
      await vi.advanceTimersByTimeAsync(15000);
      expect(await p).toBe(false);                   // the adult heard "still downloading"
      reg.waiting = { postMessage: (m) => posted.push(m) };
      ins.onState();                                 // the download finishes late
      expect(posted).toEqual([]);                    // no consent message: no mid-session swap
      expect(ins.removed).toEqual(["statechange"]);  // and the dead listener retires
    } finally { vi.useRealTimers(); }
  });
});

describe("update-system tripwires (source, with controls)", () => {
  const cfg = readFileSync("app/vite.config.js", "utf8");
  const mod = readFileSync("app/src/updates.js", "utf8");

  it("the service worker never activates itself: no skipWaiting at install, consent message only", () => {
    expect(cfg.includes(".then(() => self.skipWaiting())")).toBe(false);   // the old auto-update
    expect(cfg.includes('if (e.data === "wq-activate") self.skipWaiting();')).toBe(true);
    expect('.then(() => self.skipWaiting())'.includes("wq-activate")).toBe(false); // control
  });
  it("the version check bypasses the service worker and the precache", () => {
    expect(cfg.includes('url.pathname.endsWith("/version.json")')).toBe(true);
    expect(cfg.includes('f !== "sw.js" && f !== "version.json"')).toBe(true);
  });
  it("the update module can never touch saved progress", () => {
    expect(/indexedDB|localStorage|STORE_KEY|caches\./.test(mod)).toBe(false);
    expect(/indexedDB/.test('indexedDB.open("word-quest")')).toBe(true);   // control
  });
});
