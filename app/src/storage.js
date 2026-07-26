/* IndexedDB storage adapter (work item W3). Same one-object schema and the same
   contract as the reference adapter:
   - the stored value is one JSON string at STORE_KEY;
   - a value that is not valid JSON is copied to `${STORE_KEY}:corrupt` and the
     caller receives { __corrupt: true } — the damaged copy is never repaired
     in place;
   - the boot timeout and the write lock live in App.jsx, exactly as in the
     reference build. */
import { STORE_KEY } from "@engine";

const DB_NAME = "phonics-game";
const DB_STORE = "kv";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(key) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readonly");
        const rq = tx.objectStore(DB_STORE).get(key);
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => reject(rq.error);
        tx.oncomplete = () => db.close();
        tx.onabort = () => { db.close(); reject(tx.error); };
      })
  );
}

function idbSet(key, value) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put(value, key);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => { db.close(); reject(tx.error); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      })
  );
}

export async function loadState() {
  let raw;
  try {
    raw = await idbGet(STORE_KEY);
  } catch {
    /* A broken storage backend reads as "no save", exactly like the reference
       adapter: boot finishes fast with a fresh, writable state, and the softer
       "saving unavailable" warning appears when the first save fails. The
       read-only lock stays reserved for the boot timeout (SPEC §7). */
    return null;
  }
  if (raw === undefined || raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      await idbSet(STORE_KEY + ":corrupt", raw);
    } catch {
      /* keep going — the fresh start must not depend on this write */
    }
    return { __corrupt: true };
  }
}

export async function saveState(s) {
  try {
    await idbSet(STORE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
