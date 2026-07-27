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
import { SEAM_MS, clipPlan, resolvePack, hush } from "@engine";

const DB_NAME = "word-quest-voice";
const DB_STORE = "clips";
const BUFFER_CAP = 64;             // decoded-clip cache; praise and stems stay hot

let defaultManifest = null;        // { id: { file, ms } }; {} when the pack is absent
let familyIds = new Set();
let ctx = null;                    // AudioContext, created and resumed by unlockVoice()
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

export function idbPutClip(key, blob) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, key);
    tx.oncomplete = () => { db.close(); familyIds.add(key); buffers.delete("family:" + key); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

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
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    /* Safari can leave the context "interrupted" after microphone capture,
       not just "suspended" — resume from any non-running state. */
    if (ctx.state !== "running") ctx.resume().catch(() => {});
  } catch { /* stays locked; system speech covers it */ }
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
    const blob = await idbGet(id);
    if (!blob) throw new Error("family clip missing: " + id);
    bytes = typeof blob.arrayBuffer === "function" ? await blob.arrayBuffer() : blob;
  }
  const buf = await ctx.decodeAudioData(bytes);
  if (buffers.size >= BUFFER_CAP) buffers.delete(buffers.keys().next().value);
  buffers.set(key, buf);
  return buf;
}

async function playPlan(plan, tier, my, fallback, onScheduled) {
  try {
    const decoded = await Promise.all(plan.map((id) => (id === "seam" ? null : bufferFor(tier, id))));
    if (my !== token) return;                    // a newer utterance took over
    const start = ctx.currentTime + 0.05;
    let at = start;
    plan.forEach((id, i) => {
      if (id === "seam") { at += SEAM_MS / 1000; return; }
      const s = ctx.createBufferSource();
      s.buffer = decoded[i];
      s.connect(ctx.destination);
      s.start(at);
      at += decoded[i].duration;
      live.push(s);
    });
    /* The caller needs to know how long the child will be listening: the
       advance control waits for the word rather than cutting it off. This is
       the scheduled length, measured from the clips themselves. */
    onScheduled(Math.round((at - ctx.currentTime) * 1000));
  } catch {
    if (my === token) fallback();                // nothing has played yet: speech instead
  }
}

/* Speak one utterance through the packs, or hand it to `fallback` (system
   speech) when the packs cannot cover it or cannot play it. Always silences
   whatever was playing first, on every path. `onScheduled` reports the length
   of the utterance in milliseconds once the clips are scheduled; it never
   runs on a path that falls back, where no length can be known. */
export function speakVoice(kind, word, praiseIdx, enabled, fallback, onScheduled = () => {}) {
  stopClips();
  hush();
  if (!enabled) return;
  if (!ctx || ctx.state !== "running" || defaultManifest === null) { fallback(); return; }
  const plan = clipPlan(kind, word, praiseIdx);
  const tier = resolvePack(plan, (t, id) => (t === "family" ? familyIds.has(id) : !!defaultManifest[id]));
  if (!tier) { fallback(); return; }
  playPlan(plan, tier, token, fallback, onScheduled);
}
