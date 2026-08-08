/* The update system (SPEC section 7a). An update never applies while the
   app is open. checkForUpdate makes one of the TWO network calls safety
   rule S6 permits after load - an adult-initiated fetch of the app's own
   version.json, carrying no data. applyUpdate activates a downloaded,
   waiting version at the adult's tap and resolves true when the new version
   has taken control; the caller reloads. A version the adult does not apply
   waits, and applies only when the app next starts fresh. Neither function
   touches saved progress: updates swap code and caches, never IndexedDB. */

export async function checkForUpdate(current, currentBuild) {
  try {
    const r = await fetch("version.json", { cache: "no-store" });
    if (!r.ok) return { state: "error" };
    const data = await r.json();
    if (!data || typeof data.version !== "string" || !data.version) return { state: "error" };
    /* The build stamp (owner-approved 2026-08-07): a fix shipped between
       named versions changes the stamp but not the version, and the check
       used to answer "You have the latest version." over it. Both sides must
       carry a stamp for it to count - a host built before stamps existed
       says nothing either way, so only the version speaks there. */
    const sameBuild = typeof data.build !== "string" || !currentBuild || data.build === currentBuild;
    return {
      state: data.version === current && sameBuild ? "current" : "available",
      latest: data.version,
      latestBuild: typeof data.build === "string" ? data.build : "",
    };
  } catch {
    return { state: "offline" };
  }
}

/* The foreground check (SPEC section 7a) - S6's second permitted call,
   approved by the owner on 2026-08-03. A page that lives for months without
   a reload never discovers a new version by itself: the browser only looks
   on navigations, and this app never navigates. So when the app returns to
   the foreground, ask the browser to look for a newer service worker. The
   request goes to the app's own host and carries no data; a newer version
   still only installs and WAITS - it applies at the adult's "Update now" or
   the app's next fresh start, never over an open page. The grown-up can
   switch this off in the corner: isOn is read at each event, so the choice
   takes effect at once, and off means zero requests. Returns the remover. */
export function installForegroundCheck({ doc, getRegistration, isOn }) {
  const onVisible = () => {
    if (doc.visibilityState !== "visible" || !isOn()) return;
    getRegistration()
      .then((reg) => { if (reg) reg.update().catch(() => { /* offline: next return tries again */ }); })
      .catch(() => { /* no registration surface: nothing to do */ });
  };
  doc.addEventListener("visibilitychange", onVisible);
  return () => doc.removeEventListener("visibilitychange", onVisible);
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
