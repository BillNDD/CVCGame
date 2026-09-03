/* THE DEVICE'S ANSWER TO THE PORTRAIT ASK — owner-ruled 2026-09-03.
 *
 * On a landscape phone the app asks to be turned upright (app/src/components/
 * TurnPrompt.jsx says why it is an ask and not a lock), and a grown-up's
 * 450 ms hold answers "read this way anyway". That answer is kept HERE, on
 * the device, beside the error ring and for the same reason: it is a property
 * of this phone and not of the child's progress. In the save it would need a
 * migration, and it would ride a backup onto a device that never asked for
 * it — a phone that has been answered once would answer for a tablet.
 *
 * Every read and write is wrapped. A browser with site data blocked throws on
 * the localStorage property itself, before any method is called, and a child
 * must still be able to read on such a device: the answer is then simply
 * never remembered, which asks a grown-up once per visit rather than never
 * letting them in.
 *
 * Nothing here reaches the network and nothing here is a name (S6, S9).
 */
const KEY = "wq-landscape-ok";
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export function readLandscapeOk(ls = store()) {
  try { return ls?.getItem(KEY) === "1"; } catch { return false; }
}

export function writeLandscapeOk(ls = store()) {
  try { ls?.setItem(KEY, "1"); return true; } catch { return false; }
}
