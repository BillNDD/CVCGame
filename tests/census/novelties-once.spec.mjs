/* The singleton half of the beta-cadence novelties (owner-ruled 2026-08-20),
 * bound to its own project by testMatch exactly as the census controls are -
 * a file selected by testMatch cannot silently skip.
 *
 * Two live cells (offline equality, update-stay) plus the negative controls
 * for all five novelty detectors (E5). Every control exercises the SAME
 * helper the live cells run, from tools/census-novelties.mjs. */
import { test, expect } from "@playwright/test";
import { stage, holdGrade, waitForReveal, requireStaged, seedGraduated, GRADE, BANK_WORDS } from "../../tools/ux-census.mjs";
import { landmarks, phaseHold, homeFurniture, chromeHold, offlineHold,
         markStay, assertStayed, pokeForeground, hitTest, monkey, SOUND_ONLY,
         zoneSum, motionHold, unitWidthHold, wordBox, wordFits, widestWord, guideState, guideHold, snapHold } from "../../tools/census-novelties.mjs";

/* ---- the live singleton cells ---- */


test("update-stay: nothing takes the open page over on a foreground poke (S6)", async ({ page }) => {
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  await markStay(page);
  await pokeForeground(page);
  const findings = await assertStayed(page);
  expect(findings, JSON.stringify(findings)).toEqual([]);
  await expect(page.locator(".wq-word")).toBeVisible();   // and the child's word is still the screen
});

/* ---- the negative controls (E5): each detector shown its own fault ---- */

test("control: a phase-dependent style moves the word, and phaseHold says so", async ({ page }) => {
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  const snaps = [{ phase: "ready", marks: await landmarks(page) }];
  /* The plant must be PHASE-SCOPED: the tiles SLOT sits in the DOM through
     every phase (that reservation is the app's own defence), so styling the
     slot moves nothing between phases - the first version of this control
     proved that instead of proving the detector. The tiles themselves exist
     only in feedback, so growing a tile shifts the centred word exactly the
     way the ten-word Level 1's eleventh dot did the night of the cutover. */
  await page.addStyleTag({ content: ".wq-tile{height:90px!important}" });
  await holdGrade(page, GRADE.correct, []);
  await waitForReveal(page);
  snaps.push({ phase: "reveal", marks: await landmarks(page) });
  const findings = phaseHold(snaps);
  expect(findings.map((f) => f.kind)).toContain("phase-shift");
});

test("control: home furniture that moved across a visit is caught", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  const before = await homeFurniture(page);
  await page.addStyleTag({ content: ".wq-cta{margin-top:9px!important}" });
  await page.waitForTimeout(100);
  const after = await homeFurniture(page);
  const findings = chromeHold(before, after);
  expect(findings.map((f) => f.kind)).toContain("chrome-drift");
});

test("control: an offline screen that differs is caught by the comparator", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  const online = { home: await homeFurniture(page) };
  await page.addStyleTag({ content: ".wq-cta{min-height:80px!important}" });
  await page.waitForTimeout(100);
  const offline = { home: await homeFurniture(page) };
  const findings = offlineHold(online, offline);
  expect(findings.map((f) => f.kind)).toContain("offline-shift");
});

test("control: a page that reloads under the child is caught", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  await markStay(page);
  await page.reload({ waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  const findings = await assertStayed(page);
  expect(findings.map((f) => f.kind)).toContain("update-takeover");
});

test("control: an invisible interceptor over a control is caught by the hit-test", async ({ page }) => {
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  await page.evaluate(() => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;inset:0;z-index:9999;background:transparent";
    document.body.appendChild(d);
  });
  const findings = await hitTest(page);
  expect(findings.map((f) => f.kind)).toContain("control-intercepted");
});

test("control: a dead control and a thrown error are both caught by the monkey", async ({ page }) => {
  /* The monkey's own E5. A 56 px control that does nothing on tap - the
     shape of beta 23's dead cells - is planted on the home screen where the
     child's own two buttons sit, and a page error is thrown on the first
     tap. Sixty seeded taps among four controls reach the plant well over
     three times, and both kinds must be named. The seed is fixed so the walk
     is the same every time this control runs. */
  await page.goto("/", { waitUntil: "load" });
  await seedGraduated(page);
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  await page.evaluate(() => {
    const b = document.createElement("button");
    b.textContent = "planted dead control";
    b.className = "wq-cta";
    b.style.cssText = "position:fixed;left:16px;right:16px;top:40%;height:64px;z-index:50;";
    b.addEventListener("click", () => { if (!window.__thrown) { window.__thrown = true; setTimeout(() => { throw new Error("planted page error"); }, 0); } });
    document.body.appendChild(b);
  });
  const result = await monkey(page, { taps: 60, seed: 7, settle: 600 });
  const kinds = result.findings.map((f) => f.kind);
  expect(kinds, JSON.stringify(result.findings)).toContain("dead-control");
  expect(result.findings.some((f) => f.kind === "dead-control" && f.detail.includes("planted dead control"))).toBe(true);
  expect(kinds).toContain("console-error");
  expect(result.findings.some((f) => f.detail.includes("planted page error"))).toBe(true);
});

test("control: every label the detectors key on still names exactly one control", async ({ page }) => {
  /* Art project step 0a (2026-08-22). GRADE and SOUND_ONLY are keyed by
     accessible names; a sweep that renamed a control and not its key would
     leave the monkey calling the replay dead and holdGrade pressing nothing.
     Each key must resolve to exactly one control on the screen it belongs
     to: the grades on a staged word, the Build-it prompt in a build, the
     pre-ladder's replay on a pre session. */
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  for (const name of Object.values(GRADE)) expect(await page.getByRole("button", { name, exact: true }).count(), name).toBe(1);
  expect(await page.getByRole("button", { name: "Hear the word again", exact: true }).count()).toBe(1);
  /* A graduated save: the staged one sits on the pre-ladder, whose chooser
     has no Build row (SPEC section 6). */
  await page.goto("/", { waitUntil: "load" });
  await seedGraduated(page);
  await page.getByRole("button", { name: "Free play" }).click();
  await page.getByRole("button", { name: /Build a level \d+ word/ }).click();
  expect(await page.getByRole("button", { name: "Hear the word", exact: true }).count()).toBe(1);
  await page.getByLabel("Leave building").click();
  /* And the keys are exactly the set the app can show: a key nothing renders
     is a stale key. */
  expect([...SOUND_ONLY.keys()].sort()).toEqual(["Hear it again", "Hear the sound", "Hear the word", "Hear the word again"]);
});

test("control: a clean staged word reports none of the five", async ({ page }) => {
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  await markStay(page);   // so the stay detector judges a REAL clean page, not an unmarked one
  const snaps = [{ phase: "ready", marks: await landmarks(page) }];
  await holdGrade(page, GRADE.correct, []);
  await waitForReveal(page);
  snaps.push({ phase: "reveal", marks: await landmarks(page) });
  const all = [...phaseHold(snaps), ...(await hitTest(page)), ...(await assertStayed(page))];
  expect(all, JSON.stringify(all)).toEqual([]);
});

/* ---------------------------------------------------------------- step 0d
   The planted-fault controls of the step-0d detectors (E5), and the one cell
   that runs once because it sets its own viewport. */

test("200%: the widest bank word stays one line at 320 x 568 - at 100%, under rem scaling and under zoom", async ({ page }) => {
  /* Bible 15 and 19.2, as the reading chair restated it: "stays on screen" is
     satisfied by a wrap, and a phonics word in two fragments is worse than a
     smaller one. So: one line box, inside the viewport, at or above a literal
     floor. The word is the widest bank word by MEASURED width in em, probed
     over the whole bank so a new widest word measures itself in; the first
     draft measured the element's box, called every word 292 px and picked
     "something" by a tie. The floor is 36 px - the clamp's own minimum at
     100%, which a seven-year-old reads comfortably; below that the rule has
     failed, not bent.
     Three arms. 100% at 320 x 568 is the WCAG reflow width, where the height-
     sized word split seven bank words before the fit existed (and thirty-four
     on a 390 px phone). Rem scaling is a phone's text-size setting. Zoom is
     the desktop's 200%, CSS zoom as G8 applies it - on a 640 x 1136 viewport,
     because zoom halves the CSS pixels a screen has and 320 zoomed is a
     160 px screen no device owns; 640 zoomed is the same 320 CSS px as the
     first arm, reached by the other mechanism, with svh resolving through it. */
  await page.setViewportSize({ width: 320, height: 568 });
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  const widest = await widestWord(page, BANK_WORDS);
  expect(widest && widest.word, "the probe must find a word").toBeTruthy();
  expect(widest.em, "the widest bank word is wider than four em, or the probe measured nothing").toBeGreaterThan(4);
  const report = { widest };
  for (const [how, viewport, apply] of [
    ["100%", { width: 320, height: 568 }, () => {}],
    ["rem scaling", { width: 320, height: 568 }, () => { document.documentElement.style.fontSize = "200%"; }],
    ["zoom", { width: 640, height: 1136 }, () => { document.documentElement.style.zoom = "2"; }],
  ]) {
    await page.setViewportSize(viewport);
    const staged = await stage(page, null, widest.word, null);
    requireStaged(widest.word, staged.shown);
    await page.evaluate(apply);
    await page.waitForTimeout(150);
    const box = await wordBox(page);
    const findings = wordFits(box, 36);
    report[how] = { box, findings };
    expect(findings, how + ": " + JSON.stringify(report)).toEqual([]);
    expect(box.textPx, how + ": the word must have rendered wider than nothing").toBeGreaterThan(100);
  }
});

test("control: a frame in flow, a looping animation, equal tile widths, a wrapped word, a guide on the stage and unsnapped art are each caught", async ({ page }) => {
  const { shown } = await stage(page, null, "ship", null);
  requireStaged("ship", shown);
  /* frame in flow: a 40 px block inserted inside the shell */
  await page.evaluate(() => { const d = document.createElement("div"); d.id = "wq-plant-frame"; d.style.cssText = "height:40px"; document.querySelector(".wq-shell").prepend(d); });
  const frame = await zoneSum(page);
  expect(frame.findings.map((f) => f.kind)).toContain("frame-in-flow");
  await page.evaluate(() => document.getElementById("wq-plant-frame").remove());
  /* guide on the stage during an attempt, on a screen the allow-list forbids */
  await page.evaluate(() => { const g = document.createElement("div"); g.className = "wq-guide"; g.id = "wq-plant-guide"; g.style.cssText = "position:absolute;width:40px;height:40px"; document.querySelector(".wq-stage").appendChild(g); });
  const guide = guideHold(await guideState(page));
  expect(guide.map((f) => f.kind)).toEqual(expect.arrayContaining(["guide-on-forbidden-screen", "guide-over-stage"]));
  expect(guideHold([], true).map((f) => f.kind), "no guide where one is expected is a finding, not a pass").toEqual(["no-subject"]);
  await page.evaluate(() => document.getElementById("wq-plant-guide").remove());
  /* unsnapped art: a 300 px wide sprite of 64 art pixels at a fractional dpr */
  const snap = snapHold([{ id: "plant", k: (300 * 2.625) / 64, left: 3.1, top: 0, rendering: "auto", dpr: 2.625 }]);
  expect(snap.map((f) => f.kind).sort()).toEqual(["art-not-snapped", "art-off-grid", "art-smoothed"]);
  expect(snapHold([]).map((f) => f.kind)).toEqual(["no-subject"]);
  expect(snapHold([{ id: "good", k: 8, left: 16, top: 24, rendering: "pixelated", dpr: 2.625 }])).toEqual([]);
  /* a looping animation during the attempt, and two tiles sounding at once */
  expect(motionHold("attempt", ["div.wq-float:wqf"]).map((f) => f.kind)).toEqual(["motion-during-attempt"]);
  expect(motionHold("reveal", ["span.wq-tile.wq-pop:wqpop", "span.wq-tile.wq-pop:wqpop"]).map((f) => f.kind)).toEqual(["two-sounding-tiles"]);
  expect(motionHold("reveal", ["span.wq-tile.wq-pop:wqpop", "div.wq-ctafill:wqfill"])).toEqual([]);
  /* equal tile widths, and a reveal with no multi-letter unit at all */
  expect(unitWidthHold([{ text: "sh", w: 40 }, { text: "i", w: 40 }, { text: "p", w: 38 }]).map((f) => f.kind)).toEqual(["unit-not-wider"]);
  expect(unitWidthHold([{ text: "s", w: 30 }, { text: "a", w: 30 }]).map((f) => f.kind)).toEqual(["no-subject"]);
  /* a word off the screen, then a wrapped one. The Word component is told
     to stand down (its observer disconnects when the fit's own element is
     replaced, so the plant is a fresh element in the word's place) and a
     letter-spacing no line can hold is applied: without a break opportunity
     the word overflows the screen; with the old word-break back it splits.
     Each is the fault the fit exists to close, and each must be seen. */
  await page.evaluate(() => {
    const w = document.querySelector(".wq-word"); const p = w.cloneNode(true); p.id = "wq-plant-word";
    p.style.letterSpacing = "3em"; w.replaceWith(p);
  });
  const spilled = wordFits(await wordBox(page), 36);
  expect(spilled.map((f) => f.kind), JSON.stringify(spilled)).toContain("word-off-screen");
  await page.evaluate(() => { const p = document.getElementById("wq-plant-word"); p.style.whiteSpace = "normal"; p.style.wordBreak = "break-word"; });
  const wrapped = wordFits(await wordBox(page), 36);
  expect(wrapped.map((f) => f.kind), JSON.stringify(wrapped)).toContain("word-wrapped");
  expect(wordFits(null, 36).map((f) => f.kind)).toEqual(["no-subject"]);
  expect(wordFits({ text: "sat", lines: 1, left: 10, right: 200, fontPx: 30, vw: 320 }, 36).map((f) => f.kind)).toEqual(["word-too-small"]);
});

/* LAST ON PURPOSE: the worker's install precaches about 1,500 files through
   a single-threaded vite preview, and with this cell first its tail starved
   every sibling's page load - cells green alone failed in file order until
   the slowest neighbour moved to the end. */
test.describe("with workers allowed", () => {
  test.use({ serviceWorkers: "allow" });

test("offline equality: the offline app is the same app, measured", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "service-worker offline emulation is driven per-engine; chromium settles it");
  /* The worker precaches the whole voice pack before it activates - about
     1,500 files through vite preview - so this cell carries its own budget
     instead of dying at the default 60 s the way its first run did. The
     sequence is G7 check 12's, verbatim: ready, reload to be controlled,
     then the cord is pulled. */
  test.setTimeout(300_000);
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const online = { home: await homeFurniture(page) };
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "load" });
    await page.getByRole("button", { name: "Begin Session" }).waitFor();
    const offline = { home: await homeFurniture(page) };
    const findings = offlineHold(online, offline);
    expect(findings, JSON.stringify(findings)).toEqual([]);
  } finally {
    await context.setOffline(false);
  }
});
});
