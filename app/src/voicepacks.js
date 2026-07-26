/* Voice packs (SPEC section 5a). One utterance resolves to ONE source: the
   family pack (adult recordings in IndexedDB), the shipped default pack, or
   none - the caller then falls back to system speech. Clips chain with
   SEAM_MS pauses. stopClips() silences the chain the moment the next attempt
   starts: safety rule S2 applies to clips exactly as it applies to speech. */
import { SEAM_MS, clipPlan, resolvePack } from "@engine";

const DB_NAME = "word-quest-voice";
const DB_STORE = "clips";

let defaultManifest = null;    // { id: { file, ms } }; {} when the pack is absent
let familyIds = new Set();     // clip ids recorded by the family
let play = { token: 0, audio: null, timer: 0, url: "" };

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
    tx.oncomplete = () => { db.close(); familyIds.add(key); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

export function idbDeleteClip(key) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => { db.close(); familyIds.delete(key); resolve(true); };
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

function dropUrl() {
  if (play.url) { try { URL.revokeObjectURL(play.url); } catch { /* platform without object URLs */ } play.url = ""; }
}

export function stopClips() {
  play.token += 1;
  clearTimeout(play.timer);
  if (play.audio) { try { play.audio.pause(); } catch { /* already stopped */ } play.audio = null; }
  dropUrl();
}

async function clipSource(tier, id) {
  if (tier === "default") return "voice/" + defaultManifest[id].file;
  const blob = await idbGet(id);
  const url = URL.createObjectURL(blob);
  play.url = url;
  return url;
}

async function playPlan(plan, tier) {
  const token = play.token;
  for (const id of plan) {
    if (token !== play.token) return;
    if (id === "seam") {
      await new Promise((r) => { play.timer = setTimeout(r, SEAM_MS); });
      continue;
    }
    const src = await clipSource(tier, id);
    if (token !== play.token) return;
    await new Promise((resolve) => {
      const a = new Audio(src);
      play.audio = a;
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
    dropUrl();
  }
}

/* Speak through packs. Returns true when a pack covered the whole utterance;
   the caller uses system speech only on false. Always silences whatever was
   playing first, on both paths. */
export function trySpeakClips(kind, word, praiseIdx, enabled) {
  stopClips();
  if (!enabled || !defaultManifest) return false;
  const plan = clipPlan(kind, word, praiseIdx);
  const tier = resolvePack(plan, (t, id) => (t === "family" ? familyIds.has(id) : !!defaultManifest[id]));
  if (!tier) return false;
  playPlan(plan, tier);
  return true;
}
