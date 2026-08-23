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
/* Keyed by the control's PLAIN accessible name (app/src/labels.js): since art
   project step 0a every control's aria-label is its words without the
   pictograph, and tappable() reads the aria-label first. A novelties-once
   control proves every key here still resolves to exactly one control in the
   built app, so a relabelled replay cannot quietly become a "dead" one. */
export const SOUND_ONLY = new Map([
  ["Hear the word again", "the reveal's replay: it speaks and lights the Glowseed, which the signature cannot read"],
  ["Hear it again", "the pre-ladder's replay"],
  ["Hear the word", "Build-it's prompt: the word again, nothing to show"],
  ["Hear the sound", "Find-the-sound's prompt, the same"],
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
export async function tappable(page) {
  return page.evaluate(() => [.../** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll("button, [role=button]"))]
    .filter((b) => !b.disabled && !b.classList.contains("wq-hold"))   // the class is the hold; the name no longer says so (step 0a)
    .map((b) => {
      const r = b.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      /* What is on top at the control's centre. A control under an open
         DIALOG is rightly out of reach - the home screen's "Free play" stays
         in the DOM under the chooser it opens, and a seeded walk that tapped
         its centre three times through the chooser's box called it dead
         (2026-08-22) - so a dialog's cover takes it out of the walk. A cover
         that is NOT a dialog is the fault the monkey exists to find, so that
         control stays in the walk and is reported as covered (the reading
         chair, the third judgement: the first draft dropped every covered
         control, which would have hidden a stray layer over a child's button). */
      const top = document.elementFromPoint(x, y);
      const own = !!top && b.contains(top);
      /* aria-modal only: a role="dialog" without it is a non-modal dialog, and
         content behind a non-modal dialog is meant to stay reachable */
      const inDialog = !!top && !!top.closest("[aria-modal=\"true\"]");
      const cover = top && !own ? top.tagName.toLowerCase() + (top.className ? "." + String(top.className).split(" ").filter(Boolean).join(".") : "") : "";
      return { label: (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 40),
        x, y, w: r.width, h: r.height, own, coveredByDialog: !own && inDialog, cover,
        scrim: b.classList.contains("wq-scrim") };
    })
    .filter((c) => c.w > 0 && c.h > 0 && c.x > 0 && c.y > 0 && c.x < innerWidth && c.y < innerHeight)
    .filter((c) => !c.coveredByDialog)
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
  const seen = new Set(), covered = new Set();
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
      /* every covered control the walk can SEE is reported, once by label,
         whether or not the dice ever pick it (the fourth judgement) */
      for (const c of controls) if (!c.own && !covered.has(c.label)) { covered.add(c.label); findings.push({ kind: "covered-control", detail: `tap ${n}: "${c.label}" is under ${c.cover || "something"}, which is not a modal dialog - a finger cannot reach it` }); }
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

/* ---------------------------------------------------------------- step 0d
   The art bible's claims, as measurements, before any art exists (art
   project step 0d, owner-ruled 2026-08-22, amended by the council: "every
   cell refuses zero subjects"). Each detector returns findings; each has a
   planted-fault control in novelties-once.spec.mjs. */

/* THE FRAME ADDS NOTHING. The shell is header + stage + rail, and on the
   compact profile the session screen has already spent its height: a frame
   that takes even one row of layout pushes the rail off the screen. Rule:
   the three zones' heights sum to the shell's, within a pixel. Anything a
   frame adds in flow shows up here as a gap. */
export async function zoneSum(page) {
  return page.evaluate(() => {
    const shell = document.querySelector(".wq-shell");
    if (!shell) return { findings: [{ kind: "no-subject", detail: "no .wq-shell on this screen" }] };
    const h = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().height : 0; };
    const zones = { header: h(".wq-header"), stage: h(".wq-stage"), rail: h(".wq-rail") + h(".wq-strip") };
    const sum = zones.header + zones.stage + zones.rail;
    const shellH = shell.getBoundingClientRect().height;
    const findings = [];
    if (Math.abs(sum - shellH) > 1) findings.push({ kind: "frame-in-flow", detail: "header " + zones.header.toFixed(1) + " + stage " + zones.stage.toFixed(1) + " + rail " + zones.rail.toFixed(1) + " = " + sum.toFixed(1) + ", shell is " + shellH.toFixed(1) + " - something else takes " + (shellH - sum).toFixed(1) + " px of layout" });
    return { findings, zones, shellH };
  });
}

/* ONE EVENT AT A TIME (bible 3.3, 13.3, 14). The census runs with reduced
   motion everywhere, which makes every other cell blind to ambient motion;
   this one runs with motion allowed and samples the document's running
   animations: none during an attempt, and during a reveal at most one
   sounding tile and the advance control's own fill. */
export async function runningAnimations(page) {
  return page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").map((a) => {
    /* a CSS animation's effect is a KeyframeEffect with a target, and the
       animation itself is a CSSAnimation with a name; a Web Animations API
       animation has neither, and names itself "anim" */
    const el = a.effect instanceof KeyframeEffect ? a.effect.target : null;
    const name = a instanceof CSSAnimation ? a.animationName : (a.id || "anim");
    return (el ? el.tagName.toLowerCase() + "." + String(el.className).split(" ").filter(Boolean).join(".") : "?") + ":" + name;
  }));
}
/* THE SOUNDING TILES AS INTERVALS. A sample every 100 ms sees what is running
   at that instant; two pops that overlapped for less than a sample would
   pass it. So each sampled pop is also recorded as an interval on the
   document's timeline - the tile, the animation's start time and its
   duration - and the cell asserts no two intervals intersect over the whole
   reveal. A pop shorter than a sample can still be missed entirely, which is
   why the cell's title says sampled (the council's after pass, 2026-08-22). */
export async function popSpans(page) {
  return page.evaluate(() => document.getAnimations().flatMap((a) => {
    if (!(a instanceof CSSAnimation) || a.animationName !== "wqpop" || !(a.effect instanceof KeyframeEffect) || !a.effect.target) return [];
    const tiles = [...document.querySelectorAll(".wq-tile")];
    const d = a.effect.getTiming().duration, start = typeof a.startTime === "number" ? a.startTime : null;
    return [{ tile: tiles.indexOf(a.effect.target), start, end: start === null || typeof d !== "number" ? null : start + d }];
  }));
}
export function popOverlap(spans) {
  const seen = new Map();
  for (const s of spans) if (s.start !== null && s.end !== null) seen.set(s.tile + "@" + s.start.toFixed(1), s);
  const list = [...seen.values()].sort((a, b) => a.start - b.start);
  const findings = [];
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    if (b.start < a.end - 0.5) findings.push({ kind: "two-sounding-tiles", detail: "tile " + a.tile + " sounds " + a.start.toFixed(0) + ".." + a.end.toFixed(0) + " ms and tile " + b.tile + " starts at " + b.start.toFixed(0) });
  }
  return { findings, pops: list.length };
}
export function motionHold(phase, names) {
  const findings = [];
  if (phase === "attempt" && names.length) findings.push({ kind: "motion-during-attempt", detail: names.length + " animation(s) running while the child reads: " + names.join(", ") });
  if (phase === "reveal") {
    const pops = names.filter((n) => n.includes("wqpop")).length;
    const others = names.filter((n) => !n.includes("wqpop") && !n.includes("wqfill"));
    if (pops > 1) findings.push({ kind: "two-sounding-tiles", detail: pops + " tiles sounding at once" });
    if (others.length) findings.push({ kind: "motion-during-reveal", detail: "besides the tile and the fill: " + others.join(", ") });
  }
  return findings;
}

/* A MULTI-LETTER UNIT IS VISIBLY WIDER (bible 11; S8's observed proof, which
   safety-cover records as missing). In a reveal with a digraph, every
   multi-letter tile is wider than every single-letter tile. */
export async function tileWidths(page) {
  return page.evaluate(() => [...document.querySelectorAll(".wq-tile")].map((t) => ({ text: t.textContent.trim(), w: t.getBoundingClientRect().width })));
}
/* THE SOUNDING TILE AS MEASUREMENTS (art step 1, bible 11, 9.2, 15.2). For
   the first tile carrying .wq-pop: the ring's colour, width, style and
   offset; the box-shadow's colours; the face's luminance lift over the
   resting face; the box of every tile in the row before and during the
   pop; and whether the ring plus the band reaches into a neighbour's
   content box. Read from computed style and rects, never from pixels. */
export async function soundingTile(page) {
  return page.evaluate(() => {
    const tiles = [...document.querySelectorAll(".wq-slot-tiles .wq-tile")];
    /* the tile SOUNDING NOW: the one whose wqpop animation is running. From
       the second pop on the earlier tiles still carry .wq-pop (the CLASS
       stays; the ring ends with the animation's last frame), so the first
       .wq-pop is the wrong subject; the last tile carrying the class is
       the fallback when no animation runs (a finished pop). */
    const running = document.getAnimations().filter((a) => /** @type {CSSAnimation} */ (a).animationName === "wqpop" && a.playState === "running").map((a) => /** @type {KeyframeEffect} */ (a.effect).target);
    const popped = tiles.filter((t) => t.classList.contains("wq-pop"));
    const pop = tiles.find((t) => running.includes(t)) || popped[popped.length - 1];
    if (!pop) return null;
    const lum = (rgb) => { const m = rgb.match(/\d+(\.\d+)?/g); if (!m) return null; const c = m.slice(0, 3).map((v) => { const s = Number(v) / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const cs = getComputedStyle(pop);
    const rest = tiles.find((t) => t !== pop) || pop;
    const restCs = getComputedStyle(rest);
    const r = pop.getBoundingClientRect();
    const ring = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset);
    const spread = (cs.boxShadow.match(/rgba?\([^)]*\) 0px 0px 0px (\d+(?:\.\d+)?)px/) || [])[1];
    const reach = ring + Math.max(0, (Number(spread) || 0) - ring);   // the band paints under the ring; what shows is beyond it
    const neighbours = tiles.filter((t) => t !== pop).map((t) => { const b = t.getBoundingClientRect(), s = getComputedStyle(t); return { text: t.textContent.trim(), content: { left: b.left + parseFloat(s.paddingLeft), right: b.right - parseFloat(s.paddingRight), top: b.top + parseFloat(s.paddingTop), bottom: b.bottom - parseFloat(s.paddingBottom) } }; });
    const outer = { left: r.left - reach, right: r.right + reach, top: r.top - reach, bottom: r.bottom + reach };
    const intrudes = neighbours.filter((n) => outer.left < n.content.right && outer.right > n.content.left && outer.top < n.content.bottom && outer.bottom > n.content.top).map((n) => n.text);
    const row = pop.closest(".wq-slot-tiles");
    const rowCs = row ? getComputedStyle(row) : null;
    /* the band the stylesheet RESOLVED for this tile (--wqband after the
       cascade), never a guess from classes and heights; and the live
       construction that puts the sounding tile beneath its siblings */
    const wqband = parseFloat(cs.getPropertyValue("--wqband")) || 0;
    const live = { marked: pop.classList.contains("wq-live"), count: tiles.filter((t) => t.classList.contains("wq-live")).length, zIndex: cs.zIndex, isolation: rowCs ? rowCs.isolation : "" };
    /* the word's own layer above the row, so a band never covers a
       descender - and the ROW's layer, since a positioned row at a higher
       z-index would put the band back over the word with the word's own
       numbers unchanged (the sixth judgement) */
    const wordEl = document.querySelector(".wq-word");
    const wordCs = wordEl ? getComputedStyle(wordEl) : null;
    const word = wordCs ? { position: wordCs.position, zIndex: wordCs.zIndex, rowPosition: rowCs ? rowCs.position : "", rowZIndex: rowCs ? rowCs.zIndex : "" } : null;
    /* the stage's clip edge against the row and the message: the stage
       scrolls, so what lies past its bottom is cut away with nothing to say
       it is there - on the landscape phone the tiles lose their bottom rim
       and the sentence is out of view (the reading chair, the seventh
       judgement; open-faults AG) */
    const stageEl = document.querySelector(".wq-stage");
    const msgEl = document.querySelector(".wq-slot-msg");
    const clip = stageEl && row ? { stageBottom: +stageEl.getBoundingClientRect().bottom.toFixed(1), rowBottom: +row.getBoundingClientRect().bottom.toFixed(1), msgBottom: msgEl ? +msgEl.getBoundingClientRect().bottom.toFixed(1) : null } : null;
    return { text: pop.textContent.trim(), popped: popped.length, wqband, gap: rowCs ? parseFloat(rowCs.columnGap || rowCs.gap) || 0 : 0, live, word, clip, outline: { color: cs.outlineColor, width: cs.outlineWidth, style: cs.outlineStyle, offset: cs.outlineOffset }, shadow: cs.boxShadow,
      face: cs.backgroundColor, restingFace: restCs.backgroundColor, ink: cs.color, lift: lum(cs.backgroundColor) / lum(restCs.backgroundColor), ringPx: ring, spreadPx: Number(spread) || 0, intrudes,
      boxes: tiles.map((t) => { const b = t.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => +v.toFixed(2)); }) };
  });
}
export const rgbOf = (hex) => "rgb(" + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ") + ")";
export function soundingHold(s, tokens, restingBoxes) {
  if (!s) return [{ kind: "no-subject", detail: "no sounding tile on the screen" }];
  const findings = [];
  if (s.outline.color !== rgbOf(tokens.cyanStructural) || s.outline.style !== "solid" || !["3px", "4px"].includes(s.outline.width) || s.outline.offset !== "0px")
    findings.push({ kind: "ring-not-structural", detail: "the sounding ring is " + s.outline.width + " " + s.outline.style + " " + s.outline.color + " at " + s.outline.offset + "; bible 11 asks 3-4 px solid cyanStructural at offset 0" });
  if (!s.shadow.includes(rgbOf(tokens.cyanElectric))) findings.push({ kind: "band-missing", detail: "the box-shadow names no cyanElectric: " + s.shadow.slice(0, 80) });
  if (s.spreadPx < s.ringPx) findings.push({ kind: "band-inside-ring", detail: "the band's spread " + s.spreadPx + " px is inside the ring " + s.ringPx + " px (9.2) - a zero spread is no band" });
  /* and the spread is exactly the --wqband the stylesheet resolved for this
     tile (9 / 7 / 5 / 7 by density, after the cascade), and that variable is
     one of the ruled values */
  if (![9, 7, 5].includes(s.wqband)) findings.push({ kind: "band-not-ruled", detail: "--wqband resolved to " + s.wqband + " px; the ruled values are 9, 7 and 5" });
  else if (s.spreadPx !== s.wqband) findings.push({ kind: "band-not-ruled", detail: "the spread is " + s.spreadPx + " px where --wqband resolved to " + s.wqband });
  /* the live construction: the sounding tile marked live, beneath its
     siblings in a row that isolates its stacking - without it the band
     buries the previous tile's rim (a8872ee) */
  if (!s.live || !s.live.marked || s.live.zIndex !== "-1" || s.live.isolation !== "isolate")
    findings.push({ kind: "live-not-beneath", detail: "the sounding tile is " + (s.live && s.live.marked ? "" : "not ") + "marked live, z-index " + (s.live ? s.live.zIndex : "?") + ", row isolation " + (s.live ? s.live.isolation : "?") + " - it must paint beneath its siblings" });
  /* exactly ONE tile is live: the mark is handed on at every pop (the reset
     in schedulePops); two at the same depth bury each other's rims */
  if (s.live && s.live.count !== 1)
    findings.push({ kind: "live-not-one", detail: s.live.count + " tiles are marked live; exactly one - the tile sounding now - may be" });
  /* the word's layer: above the row, or a band covers a descender - and the
     row not lifted above it by a layer of its own */
  if (!s.word || s.word.position === "static" || !(Number(s.word.zIndex) >= 1))
    findings.push({ kind: "word-not-above", detail: "the word is " + (s.word ? s.word.position + " with z-index " + s.word.zIndex : "missing") + " - it must paint above the tile row" });
  /* the row carries no z-index today; one at or above the word's is refused
     whatever its position, since a flex or grid parent would honour it on a
     static item too (the seventh judgement) */
  else if (s.word.rowZIndex !== "auto" && Number(s.word.rowZIndex) >= Number(s.word.zIndex))
    findings.push({ kind: "word-not-above", detail: "the tile row is " + s.word.rowPosition + " at z-index " + s.word.rowZIndex + ", at or above the word's " + s.word.zIndex + " - the band would paint over a descender again" });
  if (!(s.lift >= 1.08 && s.lift <= 1.12)) findings.push({ kind: "lift-off-band", detail: "the face lifts " + ((s.lift - 1) * 100).toFixed(1) + "%; bible 11 asks 8-12%" });
  /* the row and the message inside the stage's clip edge, or a child sees
     tiles without their bottom rim and no sentence at all */
  if (s.clip && s.clip.rowBottom > s.clip.stageBottom + 0.5) findings.push({ kind: "row-clipped", detail: "the tile row's bottom at " + s.clip.rowBottom + " px is past the stage's clip edge at " + s.clip.stageBottom });
  if (s.clip && s.clip.msgBottom !== null && s.clip.msgBottom > s.clip.stageBottom + 0.5) findings.push({ kind: "message-clipped", detail: "the message's bottom at " + s.clip.msgBottom + " px is past the stage's clip edge at " + s.clip.stageBottom });
  if (s.restingFace !== rgbOf(tokens.tileFace)) findings.push({ kind: "face-not-token", detail: "a resting tile's face is " + s.restingFace + ", not tileFace" });
  if (s.ink !== rgbOf(tokens.ink)) findings.push({ kind: "ink-not-token", detail: "the tile's letters are " + s.ink });
  if (s.intrudes.length) findings.push({ kind: "ring-into-neighbour", detail: "the ring and band reach into the letters of " + s.intrudes.join(", ") });
  if (restingBoxes) {
    const moved = s.boxes.map((b, i) => restingBoxes[i] ? Math.max(...b.map((v, k) => Math.abs(v - restingBoxes[i][k]))) : 0);
    if (moved.some((d) => d > 0.5)) findings.push({ kind: "tile-moved", detail: "a tile's box moved during the pop by " + Math.max(...moved).toFixed(2) + " px" });
  }
  return findings;
}
/* THE GLOWSEED AGAINST THE AUDIO ITSELF (art step 2, bible 7 and 14). The
   object must be lit exactly while recorded audio plays - "begins and ends
   with actual audio start and completion events" - and a class that changes
   when the code says so proves nothing about that: a timer of the audio's
   own length looks the same from the DOM. So the probe below, installed
   before the page loads, wraps the page's own AudioContext - every node's
   start() call and every node's ended event, stamped on the page clock -
   and a MutationObserver stamps the object's every change of look. The hold
   then reads lit against the first start() call, idle against the last
   ended event, and the controls plant the three ways a fake would differ:
   lit before any node started, lit past the last end, and dark before the
   end after the context was suspended for a literal 1,500 ms - a timer
   darkens at the measured length, an event waits (the antagonist's before
   pass; probed 2026-08-23). */
export const GLOWSEED_PROBE = `(() => {
  const log = window.__wqAudio = { starts: [], ends: [], looks: [], ctx: null };
  const AC = window.AudioContext; if (!AC) return;
  const wrap = (name) => {
    const orig = AC.prototype[name];
    AC.prototype[name] = function (...a) {
      const node = orig.apply(this, a); const ctx = this; log.ctx = ctx;
      const start = node.start.bind(node);
      node.start = (t) => { log.starts.push({ kind: name, at: performance.now(), when: t === undefined ? null : t, ctxNow: ctx.currentTime }); return start(t); };
      node.addEventListener("ended", () => log.ends.push({ kind: name, at: performance.now(), ctxNow: ctx.currentTime }));
      return node;
    };
  };
  wrap("createBufferSource"); wrap("createOscillator");
  const mo = new MutationObserver((ms) => { for (const m of ms) if (m.attributeName === "data-wq-glowseed") log.looks.push({ look: m.target.getAttribute("data-wq-glowseed"), at: performance.now() }); });
  const observe = () => mo.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["data-wq-glowseed"] });
  if (document.documentElement) observe(); else document.addEventListener("DOMContentLoaded", observe);
})();`;
export async function glowseedRead(page) {
  return page.evaluate(() => {
    const e = document.querySelector(".wq-glowseed");
    const stage = document.querySelector(".wq-stage");
    const zones = [...document.querySelectorAll(".wq-header,.wq-stage,.wq-rail,.wq-strip")].map((z) => +z.getBoundingClientRect().height.toFixed(2));
    if (!e) return { present: false, zones, log: window.__wqAudio || null };
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e), st = stage ? stage.getBoundingClientRect() : { left: 0, top: 0 };
    const rect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    const hits = (sel) => [...document.querySelectorAll(sel)].filter((o) => o !== e && !e.contains(o)).map((o) => o.getBoundingClientRect()).filter((b) => b.width > 0 && b.height > 0 && rect.left < b.right && rect.right > b.left && rect.top < b.bottom && rect.bottom > b.top).length;
    return {
      present: true, look: e.getAttribute("data-wq-glowseed"), hidden: e.getAttribute("aria-hidden"), role: e.getAttribute("role"), tabIndex: /** @type {HTMLElement} */ (e).tabIndex,
      display: cs.display, pointer: cs.pointerEvents, transition: cs.transitionDuration, animation: cs.animationName,
      box: [+(r.left - st.left).toFixed(2), +(r.top - st.top).toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)],
      overlaps: { controls: hits("button, a, input, [role=button]"), word: hits(".wq-word"), tiles: hits(".wq-slot-tiles, .wq-tile, .wq-tilebtn, .wq-slotrow"), message: hits(".wq-slot-msg"), text: hits(".wq-label, .wq-prompt, .wq-sentence, h1, h2, h3, p") },
      zones, log: window.__wqAudio || null,
    };
  });
}
/* `read` is glowseedRead's output after the reveal's audio has ended (or
   after an attempt, with phase "attempt"); `looks` in its log run from the
   page's load, so a cell passes the index where its own reveal began. */
/* `since` is an index into ALL THREE logs, not only the looks: a read that
   sliced the looks but took `firstStart` from the whole page's history made
   `lit-before-audio` vacuous for every reveal after the first (the after
   pass, 2026-08-23). A cell that watches its own reveal passes the counts it
   saw before it began. */
export function glowseedHold(read, { phase = "reveal", since = null, sinceLook = 0, endTolerance = 100 } = {}) {
  const from = since || { looks: sinceLook, starts: 0, ends: 0 };
  if (!read) return [{ kind: "no-subject", detail: "nothing read" }];
  const findings = [];
  if (!read.present) return [{ kind: "seed-missing", detail: "no .wq-glowseed on the screen" }];
  if (read.display === "none") return [{ kind: "seed-absent", detail: "the object is display:none on this stage (absent where it cannot fit)" }];
  if (read.hidden !== "true" || read.role !== null || read.tabIndex >= 0 || read.pointer !== "none")
    findings.push({ kind: "seed-reachable", detail: "aria-hidden " + read.hidden + ", role " + read.role + ", tabIndex " + read.tabIndex + ", pointer-events " + read.pointer + " - it must be decoration, never a control" });
  if (read.transition !== "0s" || read.animation !== "none")
    findings.push({ kind: "seed-animates", detail: "transition " + read.transition + ", animation " + read.animation + " - the edge of the sound is the edge of the light" });
  const o = read.overlaps;
  if (o.controls || o.word || o.tiles || o.message || o.text)
    findings.push({ kind: "seed-overlaps", detail: "the object's box meets " + JSON.stringify(o) + " - it sits in free sky or not at all" });
  if (phase === "attempt") {
    if (read.look !== "idle") findings.push({ kind: "seed-lit-on-attempt", detail: "the object is " + read.look + " on the attempt; nothing plays before the grade (bible 13.3)" });
    return findings;
  }
  const log = read.log;
  if (!log) return [...findings, { kind: "no-subject", detail: "the audio probe is not installed (page.addInitScript(GLOWSEED_PROBE) before the page loads)" }];
  const looks = log.looks.slice(from.looks || 0);
  const starts = log.starts.slice(from.starts || 0).map((s) => s.at), ends = log.ends.slice(from.ends || 0).map((s) => s.at);
  if (!starts.length) return [...findings, { kind: "no-subject", detail: "no audio node started - the reveal played nothing" }];
  const firstStart = Math.min(...starts), lastEnd = ends.length ? Math.max(...ends) : null;
  const lit = looks.filter((l) => l.look === "lit"), idle = looks.filter((l) => l.look === "idle");
  if (looks.length !== 2 || looks[0].look !== "lit" || looks[1].look !== "idle")
    findings.push({ kind: "state-changes", detail: "the object changed look " + looks.length + " times over the reveal (" + looks.map((l) => l.look).join(",") + "); exactly lit then idle" });
  if (lit.length && lit[0].at < firstStart - 5) findings.push({ kind: "lit-before-audio", detail: "lit " + (firstStart - lit[0].at).toFixed(0) + " ms before the first node started" });
  if (!lit.length) findings.push({ kind: "never-lit", detail: "audio played and the object never lit" });
  if (lastEnd === null) findings.push({ kind: "no-subject", detail: "no node reported its end - the read came too early" });
  else {
    /* the FIRST idle after the light went on is when the child saw it go
       dark; a later one (a re-render to the same look) is not */
    const litAt = lit.length ? lit[0].at : -Infinity;
    const dark = idle.find((l) => l.at > litAt);
    const last = dark ? dark.at : null;
    if (last === null) findings.push({ kind: "lit-after-audio", detail: "the object is still lit after the last node ended" });
    else if (last > lastEnd + endTolerance) findings.push({ kind: "lit-after-audio", detail: "idle " + (last - lastEnd).toFixed(0) + " ms after the last node ended (tolerance " + endTolerance + ")" });
    else if (last < lastEnd - 5) findings.push({ kind: "dark-before-audio-ended", detail: "idle " + (lastEnd - last).toFixed(0) + " ms before the last node ended - a clock, not the audio" });
  }
  return findings;
}

/* BUILD-IT'S CONTROLS (S7, S8, bible 11): every tray tile and slot at 56 px
   or more on both axes, and every multi-letter tray tile wider than every
   single-letter one. */
export async function buildControls(page) {
  return page.evaluate(() => [...document.querySelectorAll(".wq-tilebtn")].map((b) => {
    const r = b.getBoundingClientRect();
    /* what a finger lands on at the control's centre: the strip, the stage's
       edge, anything else, and the control is out of reach (the monkey found
       breakfast's last tray row under the strip on the 320 px profile) */
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const cover = top && !b.contains(top) ? top.tagName.toLowerCase() + (top.className ? "." + String(top.className).split(" ").filter(Boolean).join(".") : "") : "";
    /* what a finger can SEE of it: the control clipped by the stage's own
       edge (the stage scrolls, so a control past its bottom is cut there,
       under the strip) and by the viewport - on the landscape phone every
       tray sat 21 px under the strip with its box and centre in reach (the
       reading chair, the seventh judgement) */
    const stage = b.closest(".wq-stage") || document.querySelector(".wq-stage");
    const s = stage ? stage.getBoundingClientRect() : { top: 0, bottom: innerHeight, left: 0, right: innerWidth };
    const visible = { w: Math.max(0, Math.min(r.right, s.right, innerWidth) - Math.max(r.left, s.left, 0)), h: Math.max(0, Math.min(r.bottom, s.bottom, innerHeight) - Math.max(r.top, s.top, 0)) };
    return { text: b.textContent.trim(), label: b.getAttribute("aria-label") || "", w: r.width, h: r.height, slot: /^(Take back|Empty space)/.test(b.getAttribute("aria-label") || ""), cover, offscreen: r.bottom > innerHeight || r.top < 0, visible, stageBottom: s.bottom };
  }));
}
/* An open-faults entry is OPEN while its heading ENDS at its opening date -
   "... — opened 2026-08-22" and nothing after it. Closed entries keep their
   headings and close them in more than one vocabulary ("CLOSED 2026-08-22 by
   art step 1", "GATED 2026-08-15", "BUILT 2026-08-15", a wrapped "- opened
   and / ## CLOSED ..."), so the positive form is the only one that holds: any
   suffix closes it (the sixth and seventh judgements). */
export function faultOpen(md, id) {
  const line = md.split(/\r?\n/).find((l) => l.startsWith("## " + id + ". "));
  return !!line && /[—-] opened \d{4}-\d{2}-\d{2}\s*$/.test(line);
}
export function buildHold(controls, floor = 56) {
  if (!controls.length) return [{ kind: "no-subject", detail: "no tile or slot on the screen" }];
  const findings = [];
  for (const c of controls) if (c.w < floor || c.h < floor) findings.push({ kind: "control-too-small", detail: '"' + c.label + '" is ' + c.w.toFixed(1) + " x " + c.h.toFixed(1) + " px, floor " + floor });
  for (const c of controls) if (c.cover || c.offscreen) findings.push({ kind: "control-unreachable", detail: '"' + c.label + '" is ' + (c.offscreen ? "off the screen" : "under " + c.cover) + " - a finger cannot reach it" });
  /* on the screen and owning its centre, but cut by the stage's edge: what
     shows of it is below the floor */
  for (const c of controls) if (!c.cover && !c.offscreen && c.visible && (c.visible.h < c.h - 0.5 || c.visible.w < c.w - 0.5) && (c.visible.h < floor || c.visible.w < floor))
    findings.push({ kind: "control-clipped", detail: '"' + c.label + '" shows only ' + c.visible.w.toFixed(0) + " x " + c.visible.h.toFixed(0) + " px of its " + c.w.toFixed(0) + " x " + c.h.toFixed(0) + " on the stage (floor " + floor + ") - the rest is cut at the stage's edge" });
  const tray = controls.filter((c) => !c.slot);
  const multi = tray.filter((c) => c.text.length > 1), single = tray.filter((c) => c.text.length === 1);
  if (!multi.length || !single.length) findings.push({ kind: "no-subject", detail: "the tray needs a multi-letter and a single-letter tile; got " + JSON.stringify(tray.map((c) => c.text)) });
  else if (Math.min(...multi.map((c) => c.w)) <= Math.max(...single.map((c) => c.w))) findings.push({ kind: "unit-not-wider", detail: "a multi-letter tray tile is " + Math.min(...multi.map((c) => c.w)).toFixed(1) + " px wide and a single-letter one " + Math.max(...single.map((c) => c.w)).toFixed(1) });
  return findings;
}
export function unitWidthHold(tiles) {
  const multi = tiles.filter((t) => t.text.length > 1), single = tiles.filter((t) => t.text.length === 1);
  if (!multi.length || !single.length) return [{ kind: "no-subject", detail: "need a multi-letter and a single-letter tile; got " + JSON.stringify(tiles.map((t) => t.text)) }];
  const narrowest = Math.min(...multi.map((t) => t.w)), widest = Math.max(...single.map((t) => t.w));
  return narrowest > widest ? [] : [{ kind: "unit-not-wider", detail: "a multi-letter tile is " + narrowest.toFixed(1) + " px wide and a single-letter tile " + widest.toFixed(1) }];
}

/* 200% TEXT SCALING (bible 15, 19.2). The principal word must stay ONE line
   box, inside the viewport, at or above a floor - a wrap is the failure the
   reading chair named ("butter/fly" is two fragments, worse than shrinking).
   `lines` counts the text's own line boxes and `textPx` sums their widths:
   the element's box is the line's width whatever the text does inside it,
   which is how a first draft of this detector called every word 292 px wide
   and "something", split in two, the widest by a tie. */
export async function wordBox(page) {
  return page.evaluate(() => {
    const w = document.querySelector(".wq-word");
    if (!w) return null;
    /* the glyphs' own size is the inner span's (Word.jsx); the box keeps the
       stylesheet's. The range is over the span's contents - over the outer
       element it would list the span's box and its text as two rects. */
    const t = w.querySelector(".wq-word-text") || w;
    const range = document.createRange(); range.selectNodeContents(t);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    /* left and right are the TEXT's extent, not the element's: a word that
       overflows its box is off the screen however well its box sits. */
    const left = Math.min(...rects.map((r) => r.left)), right = Math.max(...rects.map((r) => r.right));
    return { text: w.textContent.trim(), lines: rects.length, textPx: rects.reduce((a, r) => a + r.width, 0),
      left, right, fontPx: parseFloat(getComputedStyle(t).fontSize), vw: innerWidth };
  });
}
/* THE WORD'S GEOMETRY WITHIN A WORD (bible 3.2, P0-2): the box, the glyph
   size and the text's first line box, read in one phase to be compared with
   another phase of the SAME word. Between words the box and the baseline are
   constant by construction and the glyph size may differ (Word.jsx). */
export async function wordGeometry(page) {
  return page.evaluate(() => {
    const w = document.querySelector(".wq-word");
    if (!w) return null;
    const t = w.querySelector(".wq-word-text") || w;
    const r = w.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(t);
    const first = [...range.getClientRects()].find((x) => x.width > 0);
    return { text: w.textContent.trim(), box: { x: r.x, y: r.y, w: r.width, h: r.height },
      fontPx: parseFloat(getComputedStyle(t).fontSize), textBottom: first ? first.bottom : null };
  });
}
export function wordHold(a, b, phases = "the two phases") {
  if (!a || !b) return [{ kind: "no-subject", detail: "no principal word in one of " + phases }];
  const findings = [];
  if (a.text !== b.text) return [{ kind: "no-subject", detail: "different words in " + phases + ': "' + a.text + '" and "' + b.text + '"' }];
  const moved = ["x", "y", "w", "h"].filter((k) => Math.abs(a.box[k] - b.box[k]) > 0.5);
  if (moved.length) findings.push({ kind: "word-moved", detail: '"' + a.text + '" box differs between ' + phases + " in " + moved.join(",") + ": " + JSON.stringify(a.box) + " -> " + JSON.stringify(b.box) });
  if (Math.abs(a.fontPx - b.fontPx) > 0.01) findings.push({ kind: "word-resized", detail: '"' + a.text + '" is ' + a.fontPx + " px then " + b.fontPx + " px between " + phases });
  if (a.textBottom !== null && b.textBottom !== null && Math.abs(a.textBottom - b.textBottom) > 0.5) findings.push({ kind: "baseline-moved", detail: '"' + a.text + '" text bottom ' + a.textBottom.toFixed(2) + " -> " + b.textBottom.toFixed(2) + " between " + phases });
  return findings;
}
/* The widest word by RENDERED width, in em so the fit cannot hide it: each
   candidate is written into the live word element in turn and its line boxes
   summed, then the staged word is put back. A probe, not a render - the cell
   then stages the winner for real and measures that. */
export async function widestWord(page, words) {
  return page.evaluate((list) => {
    const w = /** @type {HTMLElement | null} */ (document.querySelector(".wq-word"));
    if (!w) return null;
    /* A DETACHED CLONE, never the live element: writing textContent into
       React's own node replaces the text node React holds, and its next
       render would land on a detached one (the council's after pass on step
       0). The clone sits beside the word with the same computed style,
       invisible, and is removed before this returns. */
    const probe = /** @type {HTMLElement} */ (w.cloneNode(true));
    probe.removeAttribute("aria-live"); probe.setAttribute("aria-hidden", "true");
    probe.style.position = "absolute"; probe.style.visibility = "hidden"; probe.style.left = "0"; probe.style.width = w.clientWidth + "px";
    w.parentElement.appendChild(probe);
    const t = /** @type {HTMLElement} */ (probe.querySelector(".wq-word-text") || probe);
    t.style.fontSize = "";
    const em = parseFloat(getComputedStyle(probe).fontSize);
    let best = null, bestEm = 0;
    for (const word of list) {
      t.textContent = word;
      const range = document.createRange(); range.selectNodeContents(t);
      const px = [...range.getClientRects()].reduce((a, r) => a + r.width, 0) / em;
      if (px > bestEm) { bestEm = px; best = word; }
    }
    probe.remove();
    return { word: best, em: bestEm };
  }, words);
}
export function wordFits(box, floorPx) {
  if (!box) return [{ kind: "no-subject", detail: "no principal word on the screen" }];
  const findings = [];
  if (box.lines !== 1) findings.push({ kind: "word-wrapped", detail: '"' + box.text + '" renders as ' + box.lines + " line boxes" });
  if (box.left < 0 || box.right > box.vw) findings.push({ kind: "word-off-screen", detail: '"' + box.text + '" spans ' + box.left.toFixed(1) + ".." + box.right.toFixed(1) + " in a " + box.vw + " px viewport" });
  if (box.fontPx < floorPx) findings.push({ kind: "word-too-small", detail: '"' + box.text + '" is ' + box.fontPx.toFixed(1) + " px, floor " + floorPx });
  return findings;
}

/* THE GUIDE, fail closed (bible 12, 13.3): it may appear only on home, done
   and milestone screens, never over the stage, never animating while a clip
   plays. No guide exists yet; the detector ships with its controls and the
   live cell lands with its subject. A screen with no guide reports
   "no-subject" so a vacuous pass cannot be mistaken for a proof. */
export const GUIDE = ".wq-guide";
export const GUIDE_SCREENS = ["home", "done", "milestone"];
export async function guideState(page) {
  return page.evaluate(([sel, allowed]) => {
    const guides = [...document.querySelectorAll(sel)];
    const screen = document.documentElement.getAttribute("data-wq-screen") || document.body.getAttribute("data-wq-screen") || "";
    const stage = document.querySelector(".wq-stage");
    const s = stage ? stage.getBoundingClientRect() : null;
    const playing = !!document.querySelector("[aria-busy='true'], .wq-tile.wq-pop");
    return guides.map((g) => {
      const r = g.getBoundingClientRect();
      const overStage = !!s && r.left < s.right && r.right > s.left && r.top < s.bottom && r.bottom > s.top;
      const animating = g.getAnimations().some((a) => a.playState === "running");
      return { screen, allowed: allowed.includes(screen), overStage, animating, playing };
    });
  }, [GUIDE, GUIDE_SCREENS]);
}
export function guideHold(states, expectOne = false) {
  if (!states.length) return expectOne ? [{ kind: "no-subject", detail: "no guide on a screen that should show one" }] : [];
  const findings = [];
  for (const g of states) {
    if (!g.allowed) findings.push({ kind: "guide-on-forbidden-screen", detail: 'the guide is on "' + (g.screen || "an unmarked screen") + '"' });
    if (g.overStage) findings.push({ kind: "guide-over-stage", detail: "the guide's box intersects the stage" });
    if (g.animating && g.playing) findings.push({ kind: "guide-moves-while-clip-plays", detail: "the guide animates while a clip plays" });
  }
  return findings;
}

/* DEVICE-PIXEL SNAP (bible 8.2 as amended): every piece of pixel art lands on
   a whole number of device pixels per art pixel, at integer offsets, with
   nearest-neighbour scaling. No art exists yet; the detector reads every
   element marked data-wq-art and the control plants one at a fractional
   width on the 2.625 profile. */
export async function artSnap(page) {
  return page.evaluate(() => [...document.querySelectorAll("[data-wq-art]")].map((el) => {
    const r = el.getBoundingClientRect(), dpr = devicePixelRatio;
    /* an <img> knows its natural size; any other element declares it. Both
       axes: a sprite can be stretched in height alone. */
    const img = el instanceof HTMLImageElement ? el : null;
    const naturalW = Number(el.getAttribute("data-wq-art-w")) || (img ? img.naturalWidth : 0);
    const naturalH = Number(el.getAttribute("data-wq-art-h")) || (img ? img.naturalHeight : 0);
    /* and the FILE's own pixels: under the 2x/3x export ruling a file pixel is
       a fraction of a logical one, and nearest-neighbour must land each file
       pixel on a whole number of device pixels too */
    return { id: el.getAttribute("data-wq-art"), naturalW, naturalH, fileW: img ? img.naturalWidth : 0, fileH: img ? img.naturalHeight : 0,
      deviceW: r.width * dpr, deviceH: r.height * dpr, left: r.left * dpr, top: r.top * dpr, rendering: getComputedStyle(el).imageRendering, dpr };
  }));
}
/* The tolerance is in DEVICE PIXELS over the whole sprite, never a ratio: at
   k = 2.019 a 512-art-pixel sprite is 1,033.7 device px against 1,024, ten
   duplicated columns across its width, which a 0.02 tolerance on k would
   have passed (the council's after pass on step 0, 2026-08-22). */
export function snapHold(items) {
  if (!items.length) return [{ kind: "no-subject", detail: "no pixel art on this screen" }];
  const findings = [];
  /* An offset is on the grid within the browser's own layout precision:
     Chromium lays out on a 1/64 CSS px grid, so at a fractional ratio the
     nearest reachable offset can miss a device pixel by up to dpr/64 (0.041
     at 2.625, 0.07 at 4.5) - measured with the planted element below, 262
     device px asked for and 261.967 laid out. The raster snaps the box to
     whole device pixels from there. */
  for (const a of items) {
    const near = (v) => Math.abs(v - Math.round(v)) <= a.dpr / 64 + 0.0001;
    if (!a.naturalW || !a.naturalH) { findings.push({ kind: "art-unsized", detail: a.id + ": no natural size to snap to (data-wq-art-w/h or an <img>)" }); continue; }
    const kx = a.deviceW / a.naturalW, ky = a.deviceH / a.naturalH;
    const offX = Math.abs(a.deviceW - Math.round(kx) * a.naturalW), offY = Math.abs(a.deviceH - Math.round(ky) * a.naturalH);
    if (kx < 1 || ky < 1 || offX > 0.5 || offY > 0.5 || Math.round(kx) !== Math.round(ky))
      findings.push({ kind: "art-not-snapped", detail: a.id + ": " + kx.toFixed(3) + " x " + ky.toFixed(3) + " device px per art px at dpr " + a.dpr + " (" + offX.toFixed(2) + ", " + offY.toFixed(2) + " device px off a whole multiple)" });
    /* A 2x or 3x FILE (bible 16.2 as ruled) drawn at k device px per logical
       px puts k/2 or k/3 device px on each file pixel; unless that is whole,
       nearest-neighbour draws some file pixels one device px wide and others
       two - the unevenness 8.2 forbids, which a per-logical-pixel rule alone
       would pass (the art director, the third judgement, 2026-08-22). */
    else if (a.fileW && a.fileH) {
      const fx = a.deviceW / a.fileW, fy = a.deviceH / a.fileH;
      if (Math.abs(a.deviceW - Math.round(fx) * a.fileW) > 0.5 || Math.abs(a.deviceH - Math.round(fy) * a.fileH) > 0.5)
        findings.push({ kind: "art-not-snapped", detail: a.id + ": " + fx.toFixed(3) + " x " + fy.toFixed(3) + " device px per FILE px - a " + (a.fileW / a.naturalW) + "x file at " + Math.round(kx) + " device px per logical px lands file pixels unevenly" });
    }
    if (!near(a.left) || !near(a.top)) findings.push({ kind: "art-off-grid", detail: a.id + ": offset " + a.left.toFixed(2) + ", " + a.top.toFixed(2) + " device px" });
    if (a.rendering !== "pixelated" && a.rendering !== "crisp-edges") findings.push({ kind: "art-smoothed", detail: a.id + ": image-rendering is " + a.rendering });
  }
  return findings;
}
