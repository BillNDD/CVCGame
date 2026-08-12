/* Voice packs (SPEC section 5a). One utterance resolves to ONE source: the
   family pack (adult recordings in IndexedDB), the shipped default pack, or
   system speech. Playback goes through one Web Audio context that a first
   real tap unlocks — never through media elements — so iOS autoplay rules
   cannot silence the middle of a chain and the service worker's cached
   responses play fine. Clips decode fully BEFORE any sound: if anything
   cannot decode, the whole utterance falls back to system speech, so the
   child never hears praise without its word. stopClips() silences the chain
   the moment the next attempt starts: S2 applies to clips exactly as to
   speech. */
import { clipPlan, isSeam, seamMs, resolvePack, tileSlots, hush } from "@engine";

const DB_NAME = "word-quest-voice";
const DB_STORE = "clips";
const BUFFER_CAP = 64;             // decoded-clip cache; praise and stems stay hot

let defaultManifest = null;        // { id: { file, ms } }; {} when the pack is absent
let familyIds = new Set();
/* id -> {lead, tail, ms} for the family pack, or null where a clip predates
   the measuring or could not be decoded. Never defaulted to zero: an
   unmeasured clip is a clip the sound-out must not pretend to know. */
const familyEdges = new Map();
let ctx = null;                    // AudioContext, created and resumed by unlockVoice()
let micUsed = false;               // the microphone has taken the audio session since the last reveal
let token = 0;
let live = [];
const buffers = new Map();         // "tier:id" -> AudioBuffer

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbAll() {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const rq = tx.objectStore(DB_STORE).getAllKeys();
    rq.onsuccess = () => resolve(rq.result || []);
    rq.onerror = () => reject(rq.error);
    tx.oncomplete = () => db.close();
  }));
}

function idbGet(key) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const rq = tx.objectStore(DB_STORE).get(key);
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
    tx.oncomplete = () => db.close();
  }));
}

/* Where the speech starts and stops inside a clip, in milliseconds either
   side. This is the SAME method the shipped pack was measured with —
   tools/voice-edges.py: 10 ms frames, RMS in dB against the clip's own peak,
   and anything quieter than -45 dB is not speech. It has to be the same
   method, because the two numbers meet in one calculation: the sound-out pulls
   each entry back over the previous clip's tail and its own lead so that what
   a child hears between two sounds is the 500 ms the owner approved. Two
   different definitions of "where the speech starts" would give two different
   rhythms and nothing would say which was which. */
const EDGE_FLOOR_DB = -45;
const EDGE_FRAME_MS = 10;
export function measureEdges(buf) {
  const a = buf.getChannelData(0), sr = buf.sampleRate;
  const n = Math.max(1, Math.round(sr * EDGE_FRAME_MS / 1000));
  const rms = [];
  for (let i = 0; i + n <= a.length; i += n) {
    let sum = 0;
    for (let j = i; j < i + n; j++) sum += a[j] * a[j];
    rms.push(Math.sqrt(sum / n));
  }
  const peak = Math.max(...rms, 1e-9);
  let first = -1, last = -1;
  for (let k = 0; k < rms.length; k++) {
    if (20 * Math.log10(Math.max(rms[k], 1e-9) / peak) > EDGE_FLOOR_DB) {
      if (first < 0) first = k;
      last = k;
    }
  }
  const ms = Math.round(buf.duration * 1000);
  if (first < 0) return { lead: 0, tail: 0, ms };          // silence: no speech to find
  const lead = Math.round(first * n / sr * 1000);
  const end = Math.round((last + 1) * n / sr * 1000);
  return { lead, tail: Math.max(0, ms - end), ms };
}

/* A family clip is stored WITH its measurements, taken on the way in. It used
   to go in as a bare blob, and `edge()` answered 0 for anything that was not
   the default pack — so a parent's own recordings would have played with the
   old file-to-file rhythm, gaps from 540 ms to over a second, with nothing
   anywhere saying they had. That is B6, and the fix is to measure rather than
   to guess or to decline. A clip that cannot be decoded is stored with no
   measurements and is treated as unmeasured, never as zero-edged. */
export async function idbPutClip(key, blob) {
  let edges = null;
  try {
    const bytes = typeof blob.arrayBuffer === "function" ? await blob.arrayBuffer() : blob;
    /* decodeAudioData consumes the buffer, so measure from a copy. */
    const probe = ctx || new (window.AudioContext || window.webkitAudioContext)();
    edges = measureEdges(await probe.decodeAudioData(bytes.slice(0)));
  } catch { edges = null; }
  const record = { blob, ...(edges || {}) };
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(record, key);
    tx.oncomplete = () => {
      db.close(); familyIds.add(key); buffers.delete("family:" + key);
      familyEdges.set(key, edges); resolve(true);
    };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

/* Test-only reader: the stored RECORD, not the decoded buffer, so a test can
   see whether a clip went in measured. Nothing in the app calls it. */
export function __readClip(key) { return idbGet(key); }

export function idbDeleteClip(key) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => { db.close(); familyIds.delete(key); buffers.delete("family:" + key); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

/* Boot: learn what each pack can say. Failures degrade to system speech. */
export async function initVoicePacks() {
  try {
    const r = await fetch("voice/manifest.json");
    defaultManifest = r.ok ? await r.json() : {};
  } catch { defaultManifest = {}; }
  try { familyIds = new Set(await idbAll()); } catch { familyIds = new Set(); }
}

export function familyClipIds() { return new Set(familyIds); }

/* Call from real tap handlers (begin, record, grade, replay). iOS allows an
   unlocked context to play at any later time, with or without a gesture. */
export function unlockVoice() {
  try {
    /* Declare a PLAYBACK session before anything sounds. Left alone, Safari
       treats Web Audio as an "ambient" session, which the ring/silent switch
       silences — while a plain media element is not silenced. A tablet on
       silent would show the game working, count the words, and say nothing.
       Found on a phone: a page playing the same clip both ways was audible
       through the media element and silent through Web Audio. */
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch { /* not supported: nothing to declare */ }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    /* Safari can leave the context "interrupted" after microphone capture,
       not just "suspended" — resume from any non-running state. */
    if (ctx.state !== "running") ctx.resume().catch(() => {});
  } catch { /* stays locked; system speech covers it */ }
}

/* iOS moves the whole audio session to "play and record" the moment the
   microphone opens, and playback drops to the narrow, tinny route meant for
   a phone call. It stays there after listening ends, so on an iPhone every
   word after the child's first recording sounded wrong, while the same clip
   on a laptop was fine. Reported from a device, and it explains the
   "fuzziness" heard on iOS earlier the same day.
   Two remedies, applied together because they cover different versions:
   Safari 17 and later take navigator.audioSession.type, and older versions
   only move the route back when the audio context is rebuilt. The rebuild
   drops the decoded-clip cache with it — an AudioBuffer belongs to the
   context that decoded it. */
export function microphoneUsed() { micUsed = true; }

function reclaimOutput() {
  if (!micUsed) return;
  micUsed = false;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* not supported */ }
  const old = ctx;
  ctx = null;
  buffers.clear();
  try { if (old) old.close(); } catch { /* already closed */ }
  unlockVoice();
}

export function stopClips() {
  token += 1;
  for (const s of live) { try { s.stop(); } catch { /* not started yet */ } }
  live = [];
}

async function bufferFor(tier, id) {
  const key = tier + ":" + id;
  if (buffers.has(key)) return buffers.get(key);
  let bytes;
  if (tier === "default") {
    const r = await fetch("voice/" + defaultManifest[id].file);
    if (!r.ok) throw new Error("clip fetch failed: " + id);
    bytes = await r.arrayBuffer();
  } else {
    const rec = await idbGet(id);
    if (!rec) throw new Error("family clip missing: " + id);
    /* Two shapes: {blob, lead, tail, ms} written since 2026-08-12, and a bare
       blob from before that. The old shape stays playable and stays
       UNMEASURED — it is not given zeros it never earned. */
    const blob = rec && rec.blob ? rec.blob : rec;
    if (rec && typeof rec.lead === "number") familyEdges.set(id, { lead: rec.lead, tail: rec.tail, ms: rec.ms });
    bytes = typeof blob.arrayBuffer === "function" ? await blob.arrayBuffer() : blob;
  }
  const buf = await ctx.decodeAudioData(bytes);
  if (buffers.size >= BUFFER_CAP) buffers.delete(buffers.keys().next().value);
  buffers.set(key, buf);
  return buf;
}

/* The hum under the sound-out (owner-ruled 2026-08-11, chosen against silence
   in the same sitting as the 500 ms seam). Half a second of dead air between
   two sounds reads as the app having stopped; a warm drone says it is still
   speaking. A fundamental, its fifth and its octave, detuned by a slow
   breath — never a bare mains sine, which reads as broken equipment. It is
   quiet on purpose: -42 dBFS, far under the voice, and it fades at both ends
   so it never starts or stops with a click. */
const HUM_PEAK = 0.00794;            // -42 dBFS
const HUM_PARTIALS = [[110, 1], [165, 0.5], [220, 0.25]];
const HUM_FADE_S = 0.25;
const HUM_DRIFT_HZ = 0.7;
const HUM_DRIFT = 0.004;

function startHum(from, until) {
  const bus = ctx.createGain();
  const sum = HUM_PARTIALS.reduce((t, [, a]) => t + a, 0);
  bus.gain.setValueAtTime(0, from);
  bus.gain.linearRampToValueAtTime(HUM_PEAK / sum, from + HUM_FADE_S);
  bus.gain.setValueAtTime(HUM_PEAK / sum, Math.max(from + HUM_FADE_S, until - HUM_FADE_S));
  bus.gain.linearRampToValueAtTime(0, until);
  bus.connect(ctx.destination);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = HUM_DRIFT_HZ;
  for (const [hz, amp] of HUM_PARTIALS) {
    const o = ctx.createOscillator();
    o.frequency.value = hz;
    const depth = ctx.createGain();
    depth.gain.value = hz * HUM_DRIFT;
    lfo.connect(depth); depth.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.value = amp;
    o.connect(g); g.connect(bus);
    o.start(from); o.stop(until);
    live.push(o);
  }
  lfo.start(from); lfo.stop(until);
  live.push(lfo);
}

/* How much silence a clip carries at one end, in milliseconds. The default
   pack measures it and records it (tools/voice-edges.py). A family recording
   has never been measured, so it reports none and its utterance keeps the
   plain file-to-file spacing — the rhythm the packs had before the sound-out,
   rather than a compensation applied against a number nobody has. */
function clipMeta(tier, id) {
  if (tier === "default") return defaultManifest[id] || null;
  return familyEdges.get(id) || null;
}
/* 0 means "no silence to compensate for", and that is only true when a
   measurement says so. An UNMEASURED clip returns 0 here as well — there is
   nothing else to return — which is why nothing downstream may treat 0 as
   proof of a measurement. `measured()` is that proof, and the ring and the
   spacing both ask it rather than inferring from a zero. */
function edge(tier, id, which) {
  const m = clipMeta(tier, id);
  return m && typeof m[which] === "number" ? m[which] : 0;
}
const measured = (tier, id) => {
  const m = clipMeta(tier, id);
  return !!m && typeof m.lead === "number" && typeof m.tail === "number" && typeof m.ms === "number";
};

async function playPlan(plan, tier, my, fallback, onScheduled) {
  try {
    const decoded = await Promise.all(plan.map((id) => (isSeam(id) ? null : bufferFor(tier, id))));
    if (my !== token) return;                    // a newer utterance took over
    /* A context rebuilt a moment ago may still be starting. Decoding gave it
       time; if it is still not running, nothing would be heard, so hand the
       utterance to system speech instead of playing into silence.
       B7 closed on 2026-08-12 claiming every fallback path names its reason.
       There were FIVE paths and the claim was written against four: this one
       called fallback() with nothing, so the single most likely fallback on an
       iPhone or iPad — where the browser suspends the audio context and only a
       fresh touch resumes it — left no trace at all. What a grown-up got was a
       shorter spoken sentence, no tile rings, and nothing anywhere saying why.
       Reopened and fixed the same day, from the owner's report of exactly that
       on a real device. */
    if (ctx.state !== "running") {
      fallback(`the audio player was ${ctx.state} when the words were due, so this device did not play the recorded voice`);
      return;
    }
    const now = ctx.currentTime;
    const start = now + 0.05;
    let at = start;
    const startedAt = [];                        // absolute start time of every entry
    plan.forEach((id, i) => {
      startedAt[i] = at;
      if (isSeam(id)) { at += seamMs(id) / 1000; return; }
      const s = ctx.createBufferSource();
      s.buffer = decoded[i];
      s.connect(ctx.destination);
      s.start(at);
      at += decoded[i].duration;
      live.push(s);
      /* The sound-out's seam is a gap between SOUNDS, not between files.
         Every clip carries its own silence and no two carry the same amount —
         across the pack the lead runs 40 to 290 ms and the tail 0 to 608 ms —
         so waiting 500 ms after a file ends gives gaps from 540 ms to over a
         second. The owner chose 500 ms on 2026-08-11 from a demo that trimmed
         every clip first, which is the rhythm this restores: pull the next
         entry back over this clip's trailing silence and the next one's
         leading silence, so what the child hears between two sounds is the
         500 ms that was approved. The edges are measured from the audio and
         re-checked by tools/voice-edges.py, never guessed.
         The long seam is deliberately left alone: 700 ms was set against the
         pack as it plays today, and the owner has approved how that sounds. */
      if (plan[i + 1] === "seam2") {
        at -= (edge(tier, id, "tail") + edge(tier, plan[i + 2], "lead")) / 1000;
        /* A wrong edge must never schedule a clip into the past, where it
           would play at once and land on top of the one before it. */
        at = Math.max(at, startedAt[i] + 0.02);
      }
    });
    /* A tile lights the moment ITS OWN sound begins. The times come from the
       clips' real decoded lengths, on the same clock that schedules them —
       never a guessed delay, which would drift apart from the sound as the
       word grows a tile. */
    const slots = tileSlots(plan);
    if (slots.length) startHum(start, at);
    /* The caller needs to know how long the child will be listening: the
       advance control waits for the word rather than cutting it off. This is
       the scheduled length, measured from the clips themselves. */
    /* Each tile gets the moment its sound starts and how long that sound
       lasts, so the ring is the length of the thing it marks. The clip's own
       leading silence is added to the moment, so the ring appears with the
       SOUND and not with the file: /sh/ carries 200 ms of silence in front of
       it, which is a fifth of a second of a tile marked before anything is
       audible. The length is the SPEECH, not the file, for the same reason —
       /sh/ is a 792 ms file holding 170 ms of sound. */
    onScheduled(Math.round((at - now) * 1000), slots.map((s) => {
      const id = plan[s.index];
      /* A ring's length is the SPEECH, and only a measured clip has one. An
         unmeasured clip reports 0, the component declines to ring at all, and
         the child sees the reveal without rings rather than rings against the
         wrong sound (B5). */
      const lead = edge(tier, id, "lead");
      const m = clipMeta(tier, id);
      return {
        at: Math.round((startedAt[s.index] - now) * 1000) + lead,
        ms: measured(tier, id) ? m.ms - lead - edge(tier, id, "tail") : 0,
      };
    }));
  } catch (e) {
    // nothing has played yet: speech instead, and say why (B7)
    if (my === token) fallback("the recorded voice failed to play: " + (e && e.message ? e.message : e));
  }
}

/* Speak one utterance through the packs, or hand it to `fallback` (system
   speech) when the packs cannot cover it or cannot play it. Always silences
   whatever was playing first, on every path. `onScheduled` reports the length
   of the utterance in milliseconds once the clips are scheduled, and the
   millisecond each tile's sound starts; it never runs on a path that falls
   back, where no length and no tile time can be known — so a fallback reveal
   shows no pops rather than pops against the wrong sound. */
export function speakVoice(kind, word, praiseIdx, enabled, fallback, onScheduled = () => {}) {
  stopClips();
  hush();
  if (!enabled) return;
  /* Take the audio session back from the microphone before the reveal. This
     runs inside the grown-up's tap or keypress, which is when a browser will
     let an audio context start. */
  reclaimOutput();
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
  /* B7 — every fallback says WHY. Falling through to system speech is correct
     behaviour and used to leave no trace anywhere: a pack that quietly stopped
     resolving looked like a design choice, because what a grown-up sees is a
     shorter spoken sentence and no tile rings, with nothing saying the recorded
     voice was unavailable. The reason is handed to the caller, which records it
     for the Grown-ups corner. The child's experience is unchanged — the sentence
     is still spoken, and nothing on the child's screen mentions it. */
  if (!ctx) { fallback("this device would not start an audio player"); return; }
  if (defaultManifest === null) { fallback("the recorded voice pack did not load"); return; }
  const plan = clipPlan(kind, word, praiseIdx);
  const tier = resolvePack(plan, (t, id) => (t === "family" ? familyIds.has(id) : !!defaultManifest[id]));
  if (!tier) {
    const missing = plan.filter((id) => !isSeam(id) && !defaultManifest[id]);
    fallback(`the recorded voice has no clip for ${missing.join(", ") || "this utterance"}`);
    return;
  }
  playPlan(plan, tier, token, fallback, onScheduled);
}
