/* Voice-pack clip engine (SPEC section 5a). Drives the real adapter in jsdom
   with a Web Audio double and fake-indexeddb. The double records the exact
   schedule, so the 700 ms seams are asserted as literals with no waiting.
   The safety property under test: stopClips() halts a chain, and any failure
   BEFORE sound falls back to system speech — never praise without its word.
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import "fake-indexeddb/auto";

const scheduled = [];   // { start, stopped } per created source, in creation order
let decodeFail = false;
class FakeCtx {
  constructor() { this.state = "suspended"; this.currentTime = 100; this.destination = {}; }
  resume() { this.state = "running"; }
  async decodeAudioData() {
    if (decodeFail) throw new Error("bad bytes");
    return { duration: 1 };                    // every clip decodes to exactly 1 s
  }
  createBufferSource() {
    const s = { buffer: null, connect() {}, start(t) { s.start_at = t; scheduled.push(s); }, stop() { s.stopped = true; } };
    return s;
  }
}
vi.stubGlobal("AudioContext", FakeCtx);

const fetchCalls = [];
vi.stubGlobal("fetch", vi.fn(async (url) => {
  fetchCalls.push(url);
  if (url.endsWith("manifest.json")) return { ok: true, json: async () => ({
    "p:0": { file: "p-0.mp3", ms: 700 },
    "s:was": { file: "s-was.mp3", ms: 900 },
    "s:is": { file: "s-is.mp3", ms: 880 },
    "l:close": { file: "l-close.mp3", ms: 700 },
    "l:wrong": { file: "l-wrong.mp3", ms: 900 },
    "e:done": { file: "e-done.mp3", ms: 1400 },
    "e:levelup": { file: "e-levelup.mp3", ms: 1100 },
    "w:cat": { file: "w-cat.mp3", ms: 800 },
  }) };
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
}));
const pack = await import("../app/src/voicepacks.js");
const { initVoicePacks, speakVoice, stopClips, unlockVoice, idbPutClip, idbDeleteClip } = pack;

const settle = () => new Promise((r) => setTimeout(r, 0));
const fb = vi.fn();

beforeEach(async () => {
  scheduled.length = 0;
  fetchCalls.length = 0;
  decodeFail = false;
  fb.mockClear();
  unlockVoice();
  await initVoicePacks();
});

describe("voice-pack clip engine", () => {
  it("schedules the reveal in order with literal 700 ms seams, and never calls the fallback", async () => {
    speakVoice("correct", "cat", 0, true, fb);
    await settle(); await settle();
    expect(scheduled.length).toBe(3);
    const [praise, stem, word] = scheduled.map((s) => s.start_at);
    expect(stem - praise).toBeCloseTo(1 + 0.7, 5);       // clip length + one seam
    expect(word - stem).toBeCloseTo(1 + 0.7, 5);
    expect(fb).not.toHaveBeenCalled();
  });

  it("falls back to system speech when the pack lacks a clip, and stays silent with sound off", async () => {
    speakVoice("correct", "zap", 0, true, fb);           // w:zap is not in the manifest
    expect(fb).toHaveBeenCalledTimes(1);
    speakVoice("correct", "cat", 0, false, fb);          // sound off: no clips, no speech
    await settle();
    expect(fb).toHaveBeenCalledTimes(1);
    expect(scheduled.length).toBe(0);
  });

  it("falls back before any sound when a clip fails to decode", async () => {
    decodeFail = true;
    speakVoice("wrong", "cat", 0, true, fb);
    await settle(); await settle();
    expect(scheduled.length).toBe(0);                    // all-or-nothing: nothing played
    expect(fb).toHaveBeenCalledTimes(1);
  });

  it("stopClips() halts a scheduled chain, and a new utterance silences the old one", async () => {
    speakVoice("wrong", "cat", 0, true, fb);
    await settle(); await settle();
    expect(scheduled.length).toBe(3);
    stopClips();
    expect(scheduled.every((s) => s.stopped)).toBe(true);
    speakVoice("replay", "cat", 0, true, fb);
    await settle(); await settle();
    expect(scheduled.length).toBe(4);                    // the replay clip joined
    expect(fb).not.toHaveBeenCalled();
  });

  it("prefers a complete family pack: family clips come from the device, not from fetch", async () => {
    for (const id of ["p:0", "s:was", "w:cat"]) await idbPutClip(id, new ArrayBuffer(8));
    fetchCalls.length = 0;
    try {
      speakVoice("correct", "cat", 0, true, fb);
      await new Promise((r) => setTimeout(r, 100));      // IndexedDB reads take macrotasks
      expect(scheduled.length).toBe(3);
      expect(fetchCalls.length).toBe(0);                 // no default-pack file was fetched
      expect(fb).not.toHaveBeenCalled();
    } finally {
      stopClips();
      for (const id of ["p:0", "s:was", "w:cat"]) await idbDeleteClip(id);
    }
  });

  it("App.jsx wires the packs at every speech site (source tripwire with control)", () => {
    const app = readFileSync("app/src/App.jsx", "utf8");
    expect((app.match(/speakVoice\(/g) || []).length).toBe(3);   // grade, session end, replay
    expect((app.match(/unlockVoice\(\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect("speak(feedbackSpeech(result, word, praiseIdx))".includes("speakVoice(")).toBe(false);
  });
});
