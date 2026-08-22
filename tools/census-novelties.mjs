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

/* THE MONKEY (owner-ruled 2026-08-22, bug-hunt page, monkey: A): random taps
   on whatever is visible, with invariants checked after each, seeded so a
   failure replays. It finds dead controls and dead ends WITHOUT being told
   what a screen is for, which is the one thing the hand-written cells cannot
   do: "Any sentence" and "Build any word" did nothing in beta 23 and every
   cell that knew the chooser looked straight past them.

   It plays as a CHILD. It never holds (every adult result control is a 450 ms
   hold, S5, and a tap on one must do nothing - counting that as dead would be
   counting the safety rule as a fault), and it never opens the Grown-ups
   corner, whose controls are a parent's. Everything else a tap can reach, it
   taps.

   The four invariants, after every tap:
     - no console error and no page error;
     - something to do: at least one enabled control of 44 px or more on the
       screen, and the page is not blank;
     - the principal word, when it is the same word before and after the tap,
       has not moved (S7's "the word holds still", on every screen the tap
       reaches, not only the session's phases);
     - the tap did something: the screen changed within `settle` ms, or the
       control is one that only makes sound (named below, with the reason),
       or it is gone. A control that changes nothing three times is reported
       as dead.
   Seeded with a small PRNG so the same seed and build walk the same taps. */
const SOUND_ONLY = new Map([
  ["🔊", "the reveal's replay: it speaks, it shows nothing new"],
  ["Hear the word again", "the same replay, by its label"],
  ["Hear it again", "the pre-ladder's replay"],
  ["🔊 Hear the word", "Build-it's prompt: the word again, nothing to show"],
  ["🔊 Hear the sound", "Find-the-sound's prompt, the same"],
]);
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
async function snapshot(page) {
  return page.evaluate(() => {
    const word = document.querySelector(".wq-word");
    const r = word ? word.getBoundingClientRect() : null;
    return {
      sig: document.body.innerText.length + ":" + document.querySelectorAll("*").length + ":" + (document.activeElement ? document.activeElement.tagName : "") + ":" + document.body.innerText.slice(0, 400),
      text: document.body.innerText.trim().length,
      word: word ? { text: word.textContent, x: r.x, y: r.y, w: r.width } : null,
    };
  });
}
async function tappable(page) {
  return page.evaluate(() => [...document.querySelectorAll("button, [role=button]")]
    .filter((b) => !b.disabled && !b.classList.contains("wq-hold") && !/\(hold\)$/.test(b.getAttribute("aria-label") || ""))
    .map((b) => {
      const r = b.getBoundingClientRect();
      return { label: (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 40),
        x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height,
        scrim: b.classList.contains("wq-scrim") };
    })
    .filter((c) => c.w > 0 && c.h > 0 && c.x > 0 && c.y > 0 && c.x < innerWidth && c.y < innerHeight)
    /* The first walk's first finding (2026-08-22): the modal's scrim - a
       full-screen Close button BEHIND the box - "changed nothing 3 times",
       because its centre is the box. A child closes a dialog by tapping the
       space around it, never its middle, so a backdrop is not a control a
       tap aims at and is left out by shape, not by label. */
    .filter((c) => !c.scrim)
    .filter((c) => c.label !== "Grown-ups corner"));
}
export async function monkey(page, { taps = 300, seed = 1, settle = 3000 }) {
  const rng = mulberry32(seed);
  const findings = [];
  const errors = [];
  const noChange = new Map();
  const seen = new Set();
  const onError = (e) => errors.push("pageerror: " + String(e && e.message || e).slice(0, 160));
  const onConsole = (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); };
  page.on("pageerror", onError);
  page.on("console", onConsole);
  let n = 0;
  try {
    for (; n < taps; n++) {
      /* A screen that says it is busy (aria-busy: Build-it while a full
         build is judged) is waited for, as a child waits for the sound to
         finish; a tap into that window is ignored by design, not dead. */
      await page.waitForFunction(() => !document.querySelector("[aria-busy=\"true\"]"), null, { timeout: 8000 }).catch(() => {});
      const controls = await tappable(page);
      if (!controls.length) { findings.push({ kind: "dead-end", detail: `tap ${n}: nothing left to tap` }); break; }
      const pick = controls[Math.floor(rng() * controls.length)];
      seen.add(pick.label);
      const before = await snapshot(page);
      await page.mouse.click(pick.x, pick.y);
      const soundOnly = SOUND_ONLY.has(pick.label);
      const limit = soundOnly ? 300 : settle;
      const t0 = Date.now();
      let after = await snapshot(page);
      while (after.sig === before.sig && Date.now() - t0 < limit) {
        await page.waitForTimeout(150);
        after = await snapshot(page);
      }
      if (after.sig === before.sig && !soundOnly) noChange.set(pick.label, (noChange.get(pick.label) || 0) + 1);
      if (before.word && after.word && before.word.text === after.word.text
          && (Math.abs(before.word.x - after.word.x) > 0.5 || Math.abs(before.word.y - after.word.y) > 0.5))
        findings.push({ kind: "word-moved", detail: `tap ${n} on "${pick.label}" moved "${before.word.text}" by ${(after.word.x - before.word.x).toFixed(1)}, ${(after.word.y - before.word.y).toFixed(1)} px` });
      const way = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => { const r = b.getBoundingClientRect(); return !b.disabled && r.width > 0 && r.height >= 44; }));
      if (!way) findings.push({ kind: "dead-end", detail: `tap ${n} on "${pick.label}" left no enabled control of 44 px or more` });
      if (after.text === 0) findings.push({ kind: "blank-page", detail: `tap ${n} on "${pick.label}" left an empty page` });
    }
  } finally {
    page.off("pageerror", onError);
    page.off("console", onConsole);
  }
  for (const [label, k] of noChange)
    if (k >= 3) findings.push({ kind: "dead-control", detail: `"${label}" changed nothing ${k} times in ${n} taps` });
  for (const e of errors) findings.push({ kind: "console-error", detail: e });
  return { findings, taps: n, seen: [...seen], soundOnly: [...SOUND_ONLY.keys()] };
}
