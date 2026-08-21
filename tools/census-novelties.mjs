/* The census's beta-cadence novelties (owner-ruled 2026-08-20 on the UXSWEEP
   page: "make these genuine novelties part of gates ... we check with every
   beta and ignore rest"). Five detector families the existing census and G7
   do not carry, each built as a helper here so the matrix spec, the singleton
   spec and the negative controls all run the SAME code — a control that
   exercises a copy proves nothing about the original.

   What each one is FOR, in child terms:
   - phaseHold: the screen never jumps while a word moves through its phases.
     G7 pins this for one word at one viewport; this asks it across the
     device matrix. The class is live: the night this shipped, G7's one-word
     version caught a 10-word session dropping the word 8 px on a retry.
   - chromeHold: the furniture a child returns to (the home screen's two big
     buttons) sits exactly where it sat before the visit.
   - offlineHold: the offline app is the SAME app — geometry measured offline
     equals geometry measured online, because a child on a plane gets no
     lesser screen (S6 is the no-network rule; this is its visual half).
   - updateStay: a waiting update never takes the page over mid-session (S6:
     "installs and waits; it never applies over an open page").
   - revealHitTest: the controls that are live during the reveal are truly
     hittable — nothing the reveal draws (pops, rings, toasts) intercepts the
     point a finger lands on. The static-screen version lives in the census's
     control-obscured detector; this is the PHASE-scoped half.

   Every helper returns findings[], never throws on a finding, and ships a
   negative control in tests/census/novelties-once.spec.mjs (E5). */

/* One geometry snapshot of the stable session landmarks. Returns null when a
   landmark is absent so a caller can say WHICH screen it was on. */
export async function landmarks(page) {
  return page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
    };
    return { header: pick(".wq-header"), word: pick(".wq-word"), rail: pick(".wq-rail") };
  });
}

const same = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/* The phases, compared. `snaps` is [{ phase, marks }] from the caller's walk;
   the word and header must not move between any pair of phases where both
   exist. The rail holds the controls and may legitimately swap contents, but
   its BOX must hold too - the box is what a finger has learned. */
export function phaseHold(snaps) {
  const findings = [];
  const first = snaps[0];
  for (const s of snaps.slice(1)) {
    for (const key of ["header", "word", "rail"]) {
      const a = first.marks[key], b = s.marks[key];
      if (a === null || b === null) continue;   // a phase without the landmark judges nothing
      if (!same(a, b))
        findings.push({ kind: "phase-shift", detail:
          `${key} moved between ${first.phase} and ${s.phase}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}` });
    }
  }
  return findings;
}

/* The home screen's child furniture, before and after a visit. */
export async function homeFurniture(page) {
  return page.evaluate(() => {
    const byText = (t) => [...document.querySelectorAll("button")].find((b) => b.textContent.includes(t));
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
    };
    return { begin: box(byText("Begin Session")), play: box(byText("Free play")) };
  });
}

export function chromeHold(before, after) {
  const findings = [];
  for (const key of ["begin", "play"]) {
    if (!before[key] || !after[key]) {
      findings.push({ kind: "chrome-drift", detail: `home "${key}" control missing ${before[key] ? "after" : "before"} the visit` });
      continue;
    }
    if (!same(before[key], after[key]))
      findings.push({ kind: "chrome-drift", detail:
        `home "${key}" moved across a visit: ${JSON.stringify(before[key])} -> ${JSON.stringify(after[key])}` });
  }
  return findings;
}

/* Offline equality: two snapshots of the same screen, one taken with the
   network gone. Any difference is a finding - the offline app must be the
   same app. */
export function offlineHold(online, offline) {
  /* Walks to the LEAF boxes. The first version compared the container
     objects, whose .x is undefined on both sides - undefined === undefined -
     so it agreed with everything, and its own negative control caught it
     before the live cell ever lied (E5 earning its keep, 2026-08-21). */
  const findings = [];
  const isBox = (v) => v && typeof v === "object" && typeof v.x === "number";
  const walk = (a, b, path) => {
    if (a === null && b === null) return;
    if (isBox(a) || isBox(b)) {
      if (!same(a, b))
        findings.push({ kind: "offline-shift", detail:
          `${path} differs offline: ${JSON.stringify(a)} -> ${JSON.stringify(b)}` });
      return;
    }
    for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})]))
      walk(a?.[key] ?? null, b?.[key] ?? null, path ? `${path}.${key}` : key);
  };
  walk(online, offline, "");
  return findings;
}

/* The page must still be the page: the marker is set AFTER load (never in an
   init script), so any takeover - a reload, a service-worker swap that
   navigates, anything that re-runs the document - erases it. */
export async function markStay(page) {
  await page.evaluate(() => { window.__wqStayed = true; });
}
export async function assertStayed(page) {
  const findings = [];
  const stayed = await page.evaluate(() => window.__wqStayed === true);
  if (!stayed)
    findings.push({ kind: "update-takeover", detail:
      "the open page was replaced under the child - S6 says a new version installs and WAITS" });
  return findings;
}
/* The foreground moments an update could try to ride in on. */
export async function pokeForeground(page) {
  await page.evaluate(() => {
    for (const state of ["hidden", "visible"]) {
      Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }
    window.dispatchEvent(new Event("focus"));
  });
  await page.waitForTimeout(600);
}

/* Every control that is LIVE right now must own the point at its centre:
   elementFromPoint must land on the control or inside it. Anything else is
   an interceptor a finger would hit instead. */
export async function hitTest(page) {
  return page.evaluate(() => {
    const findings = [];
    const live = [...document.querySelectorAll("button")]
      .filter((b) => !b.disabled && b.getBoundingClientRect().width > 0);
    for (const b of live) {
      const r = b.getBoundingClientRect();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;   // off-screen is the census's own finding, not this one
      const at = document.elementFromPoint(cx, cy);
      if (!at) continue;
      if (b === at || b.contains(at) || at.contains(b)) continue;
      const label = (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 40);
      findings.push({ kind: "control-intercepted", detail:
        `"${label}" is covered at its centre by <${at.tagName.toLowerCase()} class="${at.className}">` });
    }
    return findings;
  });
}
