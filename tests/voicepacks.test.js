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
const oscillators = []; // the hum's own nodes, kept apart from the spoken clips
let decodeFail = false;
const contexts = [];    // every AudioContext ever built, in order
class FakeCtx {
  constructor() { this.state = "suspended"; this.currentTime = 100; this.destination = {}; contexts.push(this); }
  resume() { this.state = "running"; }
  close() { this.closed = true; this.state = "closed"; }
  async decodeAudioData(bytes) {
    if (decodeFail) throw new Error("bad bytes");
    /* A caller can ask for real samples by handing in a Float32Array's buffer;
       everything else gets the plain 1-second stub the older tests expect. */
    if (bytes && bytes.byteLength > 64) {
      const a = new Float32Array(bytes);
      return { duration: a.length / 8000, sampleRate: 8000, getChannelData: () => a };
    }
    return { duration: 1 };                    // every clip decodes to exactly 1 s
  }
  createBufferSource() {
    const s = { buffer: null, connect() {}, start(t) { s.start_at = t; scheduled.push(s); }, stop() { s.stopped = true; } };
    return s;
  }
  /* The sound-out lays a hum under the whole utterance. It is built from
     oscillators rather than a clip, so it never appears in `scheduled` —
     which counts spoken clips — but it must be stoppable like everything
     else, or a silenced reveal would leave a drone playing under the next
     word. */
  createOscillator() {
    const o = { frequency: { value: 0 }, connect() {}, start(t) { o.start_at = t; oscillators.push(o); },
      stop(t) { o.stop_at = t; o.stopped = true; } };
    return o;
  }
  createGain() {
    return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} };
  }
}
vi.stubGlobal("AudioContext", FakeCtx);

const fetchCalls = [];
vi.stubGlobal("fetch", vi.fn(async (url) => {
  fetchCalls.push(url);
  /* Every clip declares the silence it carries at each end, because the
     sound-out places SPEECH 500 ms apart rather than files. The values here
     are round numbers chosen so the schedule can be worked out by hand and
     asserted as literals (rule E4); the real pack measures its own. */
  if (url.endsWith("manifest.json")) return { ok: true, json: async () => ({
    "p:0": { file: "p-0.mp3", ms: 700, lead: 100, tail: 300 },
    "s:was": { file: "s-was.mp3", ms: 900, lead: 100, tail: 300 },
    "s:is": { file: "s-is.mp3", ms: 880, lead: 100, tail: 300 },
    "s:pronounced": { file: "s-pronounced.mp3", ms: 900, lead: 100, tail: 350 },
    "l:close": { file: "l-close.mp3", ms: 700, lead: 100, tail: 300 },
    "l:wrong": { file: "l-wrong.mp3", ms: 900, lead: 100, tail: 300 },
    "e:done": { file: "e-done.mp3", ms: 1400, lead: 100, tail: 300 },
    "e:levelup": { file: "e-levelup.mp3", ms: 1100, lead: 100, tail: 300 },
    "w:cat": { file: "w-cat.mp3", ms: 800, lead: 120, tail: 320 },
    "d:k": { file: "d-k.mp3", ms: 200, lead: 50, tail: 50 },
    "d:short_a": { file: "d-short_a.mp3", ms: 300, lead: 90, tail: 90 },
    "d:t": { file: "d-t.mp3", ms: 200, lead: 60, tail: 40 },
  }) };
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
}));
const pack = await import("../app/src/voicepacks.js");
const { initVoicePacks, speakVoice, stopClips, unlockVoice, idbPutClip, idbDeleteClip, microphoneUsed, measureEdges } = pack;

const settle = () => new Promise((r) => setTimeout(r, 0));
const fb = vi.fn();

beforeEach(async () => {
  scheduled.length = 0;
  oscillators.length = 0;
  fetchCalls.length = 0;
  decodeFail = false;
  fb.mockClear();
  unlockVoice();
  await initVoicePacks();
});

describe("voice-pack clip engine", () => {
  /* The sound-out reveal (owner-ruled 2026-08-04, built 2026-08-11): praise,
     the word, "Pronounced:", each sound on its tile's moment, the word again.
     Seven clips for a three-tile word, and every gap between them measured
     SPEECH to SPEECH.

     The double decodes every clip to exactly 1 s, and the fixture declares
     the silence each one carries, so the whole schedule can be worked out by
     hand. p:0 ends its speech at 0.05 + 1 - 0.300 = 0.750; w:cat's speech
     must start at 1.250, so its FILE starts at 1.250 - 0.120 = 1.130. */
  it("places speech 500 ms apart through the sound-out, whatever silence the files carry", async () => {
    let ms = null, tiles = null;
    speakVoice("correct", "cat", 0, true, fb, (m, t) => { ms = m; tiles = t; });
    await settle(); await settle();
    expect(scheduled.length).toBe(7);                    // praise, word, "Pronounced:", 3 sounds, word
    const at = scheduled.map((s) => s.start_at - 100);   // the fake clock starts at 100
    expect(at.map((n) => Math.round(n * 1000)))
      .toEqual([50, 1130, 2210, 3310, 4670, 6020, 7360]);

    /* The gap the child actually hears, between the END of one sound and the
       START of the next. Every one of them is the approved 500 ms. */
    const M = { "p:0": [100, 300], "w:cat": [120, 320], "s:pronounced": [100, 350],
      "d:k": [50, 50], "d:short_a": [90, 90], "d:t": [60, 40] };
    const ids = ["p:0", "w:cat", "s:pronounced", "d:k", "d:short_a", "d:t", "w:cat"];
    for (let i = 1; i < ids.length; i++) {
      const endsAt = at[i - 1] + 1 - M[ids[i - 1]][1] / 1000;
      const startsAt = at[i] + M[ids[i]][0] / 1000;
      expect(Math.round((startsAt - endsAt) * 1000)).toBe(500);
    }

    /* Each tile is told when its own sound starts — the file's start plus the
       silence in front of it — and how long that sound lasts, so the ring is
       the length of the thing it marks. */
    expect(tiles).toEqual([
      { at: 3360, ms: 100 },      // d:k        file at 3310 + 50 ms lead; 200 - 50 - 50 of speech
      { at: 4760, ms: 120 },      // d:short_a  file at 4670 + 90 ms lead; 300 - 90 - 90
      { at: 6080, ms: 100 },      // d:t        file at 6020 + 60 ms lead; 200 - 60 - 40
    ]);
    expect(ms).toBe(8360);
    expect(fb).not.toHaveBeenCalled();
  });

  /* The hum under the sound-out (owner-ruled 2026-08-11, chosen against
     silence): half a second of dead air between two sounds reads as the app
     having stopped. Three partials and one slow detune, under the whole
     utterance and stoppable with it. A plan with no sound-out gets none. */
  it("lays a hum under the sound-out only, and stops it with everything else", async () => {
    speakVoice("correct", "cat", 0, true, fb);
    await settle(); await settle();
    expect(oscillators.length).toBe(4);                  // 110 Hz, its fifth, its octave, and the drift
    expect(oscillators.map((o) => o.frequency.value).sort((a, b) => a - b)).toEqual([0.7, 110, 165, 220]);
    expect(oscillators.every((o) => o.start_at === 100.05)).toBe(true);
    expect(oscillators.every((o) => Math.round((o.stop_at - 100) * 1000) === 8360)).toBe(true);
    stopClips();
    expect(oscillators.every((o) => o.stopped)).toBe(true);

    oscillators.length = 0;
    speakVoice("replay", "cat", 0, true, fb);            // one word, no sound-out
    await settle(); await settle();
    expect(scheduled.length).toBe(8);
    expect(oscillators.length).toBe(0);
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
    expect(oscillators.length).toBe(0);                  // and no hum left playing alone
    expect(fb).toHaveBeenCalledTimes(1);
  });

  it("stopClips() halts a scheduled chain, and a new utterance silences the old one", async () => {
    speakVoice("wrong", "cat", 0, true, fb);
    await settle(); await settle();
    expect(scheduled.length).toBe(7);
    stopClips();
    expect(scheduled.every((s) => s.stopped)).toBe(true);
    speakVoice("replay", "cat", 0, true, fb);
    await settle(); await settle();
    expect(scheduled.length).toBe(8);                    // the replay clip joined
    expect(fb).not.toHaveBeenCalled();
  });

  /* B6 — a family clip is MEASURED on the way in, with the same method the
     shipped pack was measured with (tools/voice-edges.py: 10 ms frames, RMS in
     dB against the clip's own peak, -45 dB floor). Before 2026-08-12 `edge()`
     answered 0 for anything that was not the default pack, so a parent's own
     recordings would have played the old file-to-file rhythm — gaps from
     540 ms to over a second — with nothing anywhere saying they had. */
  it("measures where the speech sits inside a clip, in the shipped pack's own terms", () => {
    /* 8 kHz, one second: 200 ms of silence, 300 ms of tone, 500 ms of silence.
       The expected numbers are the literal boundaries of that fixture, never
       read back from the function under test. */
    const sr = 8000, a = new Float32Array(sr);
    for (let i = Math.round(sr * 0.2); i < Math.round(sr * 0.5); i++) a[i] = Math.sin(i * 0.5);
    const buf = { duration: 1, sampleRate: sr, getChannelData: () => a };
    const m = measureEdges(buf);
    expect(m.ms).toBe(1000);
    expect(m.lead).toBe(200);
    expect(m.tail).toBe(500);
    // a clip that is silence all through has no speech to find, and says so
    const quiet = measureEdges({ duration: 0.5, sampleRate: sr, getChannelData: () => new Float32Array(sr / 2) });
    expect(quiet).toEqual({ lead: 0, tail: 0, ms: 500 });
    /* Control: tone from the very first sample must NOT report a lead. Without
       this, a function that always answered 200 would pass the case above. */
    const full = new Float32Array(sr);
    for (let i = 0; i < sr; i++) full[i] = Math.sin(i * 0.5);
    const m2 = measureEdges({ duration: 1, sampleRate: sr, getChannelData: () => full });
    expect(m2.lead).toBe(0);
    expect(m2.tail).toBe(0);
  });

  it("a stored family clip carries its measurements, and an undecodable one carries none", async () => {
    const sr = 8000, a = new Float32Array(sr);
    for (let i = Math.round(sr * 0.1); i < Math.round(sr * 0.6); i++) a[i] = Math.sin(i * 0.5);
    await idbPutClip("w:cat", a.buffer);
    try {
      const rec = await pack.__readClip("w:cat");
      expect(rec.lead).toBe(100);
      expect(rec.tail).toBe(400);
      expect(rec.ms).toBe(1000);
    } finally { await idbDeleteClip("w:cat"); }

    /* Control: a clip the browser cannot decode is stored PLAYABLE but
       UNMEASURED — never with zeros it did not earn, which is the whole fault
       B6 names. */
    decodeFail = true;
    try {
      await idbPutClip("w:cat", new ArrayBuffer(8));
      const rec = await pack.__readClip("w:cat");
      expect(rec.blob).toBeTruthy();
      expect(rec.lead).toBeUndefined();
      expect(rec.tail).toBeUndefined();
    } finally { decodeFail = false; await idbDeleteClip("w:cat"); }
  });

  it("prefers a complete family pack: family clips come from the device, not from fetch", async () => {
    const ids = ["p:0", "w:cat", "s:pronounced", "d:k", "d:short_a", "d:t"];
    for (const id of ids) await idbPutClip(id, new ArrayBuffer(8));
    fetchCalls.length = 0;
    try {
      speakVoice("correct", "cat", 0, true, fb);
      await new Promise((r) => setTimeout(r, 100));      // IndexedDB reads take macrotasks
      expect(scheduled.length).toBe(7);
      expect(fetchCalls.length).toBe(0);                 // no default-pack file was fetched
      expect(fb).not.toHaveBeenCalled();
    } finally {
      stopClips();
      for (const id of ids) await idbDeleteClip(id);
    }
  });

  /* Reported from an iPhone: words that sounded right on a laptop sounded
     terrible after the child tapped Record. iOS moves the audio session to
     "play and record" when the microphone opens and leaves playback on the
     narrow route it wants for a call. The playback side must take the session
     back before the reveal — by telling Safari the session is playback again,
     and by rebuilding the audio context, which is what moves the route on
     versions with no such setting. */
  it("takes the audio session back from the microphone before the next reveal", async () => {
    const session = {};
    Object.defineProperty(navigator, "audioSession", { configurable: true, get: () => session });
    try {
      const before = contexts.at(-1);
      microphoneUsed();
      speakVoice("correct", "cat", 0, true, fb);
      await settle(); await settle();
      expect(session.type).toBe("playback");             // Safari 17 and later
      expect(before.closed).toBe(true);                  // and the route moves on older ones
      expect(contexts.at(-1)).not.toBe(before);
      expect(scheduled.length).toBe(7);                  // the reveal still plays, in full
      expect(fb).not.toHaveBeenCalled();
    } finally {
      delete navigator.audioSession;
      stopClips();
    }
  });

  /* The ring/silent switch: Safari silences an "ambient" Web Audio session and
     leaves a media element alone, so a tablet on silent played nothing while
     appearing to work. The app declares a playback session before it ever
     sounds. */
  it("declares a playback session before anything sounds, so the silent switch cannot mute the words", async () => {
    const session = {};
    Object.defineProperty(navigator, "audioSession", { configurable: true, get: () => session });
    try {
      unlockVoice();
      expect(session.type).toBe("playback");
    } finally { delete navigator.audioSession; }
  });

  it("(control): with no microphone use the context is left alone", async () => {
    const before = contexts.at(-1);
    speakVoice("correct", "cat", 0, true, fb);
    await settle(); await settle();
    expect(before.closed).toBeUndefined();
    expect(contexts.at(-1)).toBe(before);
    expect(scheduled.length).toBe(7);
    stopClips();
  });

  it("App.jsx wires the packs at every speech site (source tripwire with control)", () => {
    const app = readFileSync("app/src/App.jsx", "utf8");
    /* Four since Build-it (2026-08-17): grade, session end, replay, and the
       word Build-it speaks before the child assembles it. The count is the
       point of this tripwire - a speech site added without the pack wiring
       must move it - so it rises with a named reason and never quietly. */
    expect((app.match(/speakVoice\(/g) || []).length).toBe(4);
    expect((app.match(/unlockVoice\(\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect("speak(feedbackSpeech(result, word, praiseIdx))".includes("speakVoice(")).toBe(false);
  });

  /* This line used to pin microphoneUsed() to exactly one call site in
     App.jsx. On 2026-08-12 the child's microphone was removed and that count
     became 0, so the assertion failed. The wrong fix — the easy one — is to
     delete the function it guards. It must NOT be deleted: iOS moves the whole
     audio session to "play and record" when ANY capture opens, and the family
     voice-pack recorder, which the owner is keeping, opens one. The route
     fault it repairs is a real fault reported from a real iPhone; it is now
     simply waiting for its next caller.
     So the tripwire is re-pointed, not dropped: the mechanism must still
     EXIST and still WORK, and the two tests above prove the working part with
     a live control. What is gone is only the claim about where it is called
     from, which is a claim about a caller that no longer exists. */
  it("the audio-route repair survives with no caller, ready for the family recorder", () => {
    const src = readFileSync("app/src/voicepacks.js", "utf8");
    expect(src.includes("export function microphoneUsed()")).toBe(true);
    expect(src.includes("function reclaimOutput()")).toBe(true);
    expect(src.includes("reclaimOutput();")).toBe(true);        // still called before a reveal
    expect(typeof microphoneUsed).toBe("function");             // and still exported
    // fixture control: the scan must notice if the mechanism is ripped out
    expect("const micUsed = false;".includes("export function microphoneUsed()")).toBe(false);
  });
});
