/* The update system (SPEC section 7a). Manual only: the app never changes
   itself without an adult's tap. checkForUpdate makes the ONE network call
   safety rule S6 permits after load - an adult-initiated fetch of the app's
   own version.json, carrying no data. applyUpdate activates a downloaded,
   waiting version and resolves true when the new version has taken control;
   the caller reloads. Neither function touches saved progress: updates swap
   code and caches, never IndexedDB. */

export async function checkForUpdate(current) {
  try {
    const r = await fetch("version.json", { cache: "no-store" });
    if (!r.ok) return { state: "error" };
    const data = await r.json();
    if (!data || typeof data.version !== "string" || !data.version) return { state: "error" };
    return { state: data.version === current ? "current" : "available", latest: data.version };
  } catch {
    return { state: "offline" };
  }
}

export function applyUpdate() {
  return new Promise((resolve) => {
    if (!("serviceWorker" in navigator)) { resolve(false); return; }
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
    navigator.serviceWorker.addEventListener("controllerchange", () => finish(true), { once: true });
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (!reg) { finish(false); return; }
      try { await reg.update(); } catch { /* offline: a waiting worker may still exist */ }
      const activate = () => { if (reg.waiting) { reg.waiting.postMessage("wq-activate"); return true; } return false; };
      if (activate()) return;
      const installing = reg.installing;
      if (installing) installing.addEventListener("statechange", () => activate());
      else finish(false);
    }).catch(() => finish(false));
    setTimeout(() => finish(false), 15000);
  });
}
