/* The update system (SPEC section 7a). An update never applies while the
   app is open. checkForUpdate makes the ONE network call safety rule S6
   permits after load - an adult-initiated fetch of the app's own
   version.json, carrying no data. applyUpdate activates a downloaded,
   waiting version at the adult's tap and resolves true when the new version
   has taken control; the caller reloads. A version the adult does not apply
   waits, and applies only when the app next starts fresh. Neither function
   touches saved progress: updates swap code and caches, never IndexedDB. */

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
    let timer = 0;
    const onControl = () => finish(true);
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", onControl);
      resolve(ok);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControl);
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (!reg) { finish(false); return; }
      try { await reg.update(); } catch { /* offline: a waiting worker may still exist */ }
      /* Once the answer is out - above all after the timeout says false - a
         late statechange must never activate the new worker mid-session. */
      const activate = () => {
        if (done) return true;
        if (!reg.waiting) return false;
        reg.waiting.postMessage("wq-activate");
        return true;
      };
      if (activate()) return;
      const installing = reg.installing;
      if (!installing) { finish(false); return; }
      const onState = () => { if (activate()) installing.removeEventListener("statechange", onState); };
      installing.addEventListener("statechange", onState);
    }).catch(() => finish(false));
    timer = setTimeout(() => finish(false), 15000);
  });
}
