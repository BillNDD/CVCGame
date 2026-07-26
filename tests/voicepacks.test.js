/* Voice-pack clip engine (SPEC section 5a). Runs the real adapter in jsdom
   with a scripted Audio double and fake-indexeddb, and proves the safety
   property that matters: stopClips() silences a chain mid-utterance, so a
   reveal can never bleed into the next attempt (S2 for clips). Real timers
   with wide margins, like the interface gate: the seam must still be silent
   at 350 ms and must have fired by 800 ms.
   @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "fake-indexeddb/auto";

/* The Audio double records every construction and never finishes on its own;
   the test decides when a clip ends. */
const made = [];
class FakeAudio {
  constructor(src) { this.src = src; this.paused = false; made.push(this); }
  play() { return Promise.resolve(); }
  pause() { this.paused = true; }
  end() { if (this.onended) this.onended(); }
}
vi.stubGlobal("Audio", FakeAudio);
vi.stubGlobal("fetch", vi.fn(async () => ({
  ok: true,
  json: async () => ({
    "p:0": { file: "p-0.mp3", ms: 700 },
    "s:was": { file: "s-was.mp3", ms: 900 },
    "s:is": { file: "s-is.mp3", ms: 880 },
    "l:close": { file: "l-close.mp3", ms: 700 },
    "l:wrong": { file: "l-wrong.mp3", ms: 900 },
    "e:done": { file: "e-done.mp3", ms: 1400 },
    "e:levelup": { file: "e-levelup.mp3", ms: 1100 },
    "w:cat": { file: "w-cat.mp3", ms: 800 },
  }),
})));
const { initVoicePacks, trySpeakClips, stopClips, idbPutClip, idbDeleteClip } = await import("../app/src/voicepacks.js");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

beforeEach(async () => {
  made.length = 0;
  await initVoicePacks();
});

describe("voice-pack clip engine", () => {
  it("plays the default-pack reveal in order, holding the 700 ms seam", async () => {
    expect(trySpeakClips("correct", "cat", 0, true)).toBe(true);
    await wait(20);
    expect(made.length).toBe(1);
    expect(made[0].src).toBe("voice/p-0.mp3");
    made[0].end();
    await wait(350);
    expect(made.length).toBe(1);                 // mid-seam: still silent
    await wait(450);
    expect(made.length).toBe(2);                 // the seam has passed by 800 ms
    expect(made[1].src).toBe("voice/s-was.mp3");
    made[1].end();
    await wait(800);
    expect(made[2].src).toBe("voice/w-cat.mp3"); // the word comes last, after its own seam
  });

  it("falls back to system speech when a clip is missing, and when sound is off", async () => {
    expect(trySpeakClips("correct", "zap", 0, true)).toBe(false);   // w:zap not in the manifest
    expect(trySpeakClips("correct", "cat", 0, false)).toBe(false);  // sound off
    await wait(20);
    expect(made.length).toBe(0);
  });

  it("stopClips() mid-utterance halts the chain: no later clip ever starts", async () => {
    trySpeakClips("wrong", "cat", 0, true);
    await wait(20);
    expect(made.length).toBe(1);
    stopClips();                                  // the adult advanced (S2)
    expect(made[0].paused).toBe(true);
    made[0].end();
    await wait(900);
    expect(made.length).toBe(1);                 // the word clip never played
  });

  it("a new utterance silences the previous one", async () => {
    trySpeakClips("replay", "cat", 0, true);
    await wait(20);
    expect(made.length).toBe(1);
    trySpeakClips("replay", "cat", 0, true);
    await wait(20);
    expect(made[0].paused).toBe(true);
    expect(made.length).toBe(2);
  });

  it("prefers a complete family pack and reads its clips from the device", async () => {
    for (const id of ["p:0", "s:was", "w:cat"]) await idbPutClip(id, new Blob(["x"]));
    const orig = URL.createObjectURL;
    URL.createObjectURL = () => "blob:family";
    try {
      expect(trySpeakClips("correct", "cat", 0, true)).toBe(true);
      await wait(30);
      expect(made[0].src).toBe("blob:family");   // the family voice, not the default file
    } finally {
      URL.createObjectURL = orig;
      stopClips();
      for (const id of ["p:0", "s:was", "w:cat"]) await idbDeleteClip(id);
    }
  });
});
