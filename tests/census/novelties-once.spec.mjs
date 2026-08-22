/* The singleton half of the beta-cadence novelties (owner-ruled 2026-08-20),
 * bound to its own project by testMatch exactly as the census controls are -
 * a file selected by testMatch cannot silently skip.
 *
 * Two live cells (offline equality, update-stay) plus the negative controls
 * for all five novelty detectors (E5). Every control exercises the SAME
 * helper the live cells run, from tools/census-novelties.mjs. */
import { test, expect, devices } from "@playwright/test";
import { stage, holdGrade, waitForReveal, requireStaged, seedGraduated, GRADE, BANK_WORDS } from "../../tools/ux-census.mjs";
import { landmarks, phaseHold, homeFurniture, chromeHold, offlineHold,
         markStay, assertStayed, pokeForeground, hitTest, monkey, tappable, SOUND_ONLY,
         zoneSum, runningAnimations, motionHold, popOverlap, unitWidthHold, wordBox, wordFits, widestWord, wordGeometry, wordHold,
         guideState, guideHold, artSnap, snapHold } from "../../tools/census-novelties.mjs";

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
  /* Two covers, told apart. A bare transparent layer over the planted
     button is NOT a dialog: the button stays in the walk and is reported as
     covered, naming the layer. The same layer inside an element that says
     aria-modal takes the button out of the walk, as the chooser does to
     "Free play". */
  await page.evaluate(() => { const d = document.createElement("div"); d.id = "wq-plant-cover"; d.className = "wq-plant-cover"; d.style.cssText = "position:fixed;left:0;right:0;top:35%;height:30%;z-index:60;background:transparent"; document.body.appendChild(d); });
  const bare = await tappable(page);
  const planted = bare.find((c) => c.label === "planted dead control");
  expect(planted, bare.map((c) => c.label).join(" | ")).toBeTruthy();
  expect(planted.own).toBe(false);
  expect(planted.cover).toBe("div.wq-plant-cover");
  /* a role="dialog" WITHOUT aria-modal is a non-modal dialog: the button
     stays in the walk (the fourth judgement) */
  await page.evaluate(() => { const d = document.getElementById("wq-plant-cover"); const m = document.createElement("div"); m.setAttribute("role", "dialog"); m.id = "wq-plant-dialog"; d.replaceWith(m); m.appendChild(d); });
  expect((await tappable(page)).map((c) => c.label)).toContain("planted dead control");
  await page.evaluate(() => document.getElementById("wq-plant-dialog").setAttribute("aria-modal", "true"));
  const underDialog = (await tappable(page)).map((c) => c.label);
  expect(underDialog, underDialog.join(" | ")).not.toContain("planted dead control");
  expect(underDialog).toContain("Begin Session");
  /* the dialog unwrapped, the bare cover back: ONE tap, seeded so the dice
     pick "Begin Session" and never the plant, must still report the covered
     control by name and by what covers it - it is reported when listed, not
     when picked (the walk leaves home, so this is the last thing the control
     does) */
  await page.evaluate(() => { const m = document.getElementById("wq-plant-dialog"); const d = document.getElementById("wq-plant-cover"); m.replaceWith(d); });
  expect((await tappable(page)).map((c) => c.label)).toContain("planted dead control");
  const walked = await monkey(page, { taps: 1, seed: 11, settle: 300 });
  expect(walked.seen, "the one tap must have picked a control other than the plant").not.toContain("planted dead control");
  expect(walked.findings.map((f) => f.kind), JSON.stringify(walked.findings)).toContain("covered-control");
  expect(walked.findings.some((f) => f.kind === "covered-control" && f.detail.includes("planted dead control") && f.detail.includes("div.wq-plant-cover"))).toBe(true);
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
     CSS zoom at 2 as G8 applies it, on a 640 x 1136 viewport: it halves the
     CSS pixels a line has (320 zoomed would be a 160 px line no device owns)
     and it does NOT scale svh - measured 2026-08-22, a 100svh root under
     html{zoom:2} is 2,272 px tall on a 1,136 px screen and the clamp still
     computes 88 px - so this arm measures the word's WIDTH under zoom and
     nothing about the shell; the first draft's comment claimed more. Every
     arm also reads the error ring: a refit must never write a phantom
     error into the grown-up's bug report. */
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
    expect(await page.evaluate(() => localStorage.getItem("wq-errors")), how + ": the error ring must stay empty").toBeNull();
  }
});

test("the fit across a rotation: the word refits and the error ring stays empty", async ({ page }) => {
  /* The first Word.jsx set its size from inside its own ResizeObserver
     delivery, and every refit raised "ResizeObserver loop completed with
     undelivered notifications" as a window error, which the app's error ring
     recorded - a phantom bug in the grown-up's report on every rotation
     (the reading chair, measured on the built app, 2026-08-22). Three
     viewports, the widest word, the ring read after each. */
  await page.setViewportSize({ width: 390, height: 844 });
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  const widest = await widestWord(page, BANK_WORDS);
  const staged = await stage(page, null, widest.word, null);
  requireStaged(widest.word, staged.shown);
  const sizes = [];
  for (const [w, h] of [[390, 844], [320, 568], [844, 390], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(250);
    const box = await wordBox(page);
    sizes.push(w + "x" + h + ":" + box.fontPx);
    expect(wordFits(box, 36), w + "x" + h + ": " + JSON.stringify(box)).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem("wq-errors")), w + "x" + h + ": the error ring must stay empty; sizes so far " + sizes.join(" ")).toBeNull();
  }
  /* and the word actually refitted across those viewports, or the cell
     exercised nothing */
  expect(new Set(sizes.map((x) => x.split(":")[1])).size, "the word never changed size across four viewports: " + sizes.join(" ")).toBeGreaterThan(1);
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
  /* the snap's arithmetic on fixtures: a ratio tolerance would pass
     k = 2.019 over 512 art pixels (1,033.7 device px against 1,024); the
     device-pixel tolerance refuses it, and a stretched height alone */
  expect(snapHold([]).map((f) => f.kind)).toEqual(["no-subject"]);
  expect(snapHold([{ id: "wide", naturalW: 512, naturalH: 64, deviceW: 512 * 2.019, deviceH: 128, left: 16, top: 24, rendering: "pixelated", dpr: 2.625 }]).map((f) => f.kind)).toEqual(["art-not-snapped"]);
  expect(snapHold([{ id: "tall", naturalW: 64, naturalH: 64, deviceW: 128, deviceH: 150, left: 16, top: 24, rendering: "pixelated", dpr: 2.625 }]).map((f) => f.kind)).toEqual(["art-not-snapped"]);
  expect(snapHold([{ id: "good", naturalW: 64, naturalH: 64, deviceW: 512, deviceH: 512, left: 16, top: 24, rendering: "pixelated", dpr: 2.625 }])).toEqual([]);
  /* a 2x FILE for a 64-logical sprite (128 file px): k = 5 per logical px is
     2.5 per file px and is refused; k = 4 and k = 6 land file pixels whole */
  const twoX = (k) => [{ id: "2x", naturalW: 64, naturalH: 64, fileW: 128, fileH: 128, deviceW: 64 * k, deviceH: 64 * k, left: 0, top: 0, rendering: "pixelated", dpr: 4.5 }];
  expect(snapHold(twoX(5)).map((f) => f.kind)).toEqual(["art-not-snapped"]);
  expect(snapHold(twoX(5))[0].detail).toContain("FILE px");
  expect(snapHold(twoX(4))).toEqual([]);
  expect(snapHold(twoX(6))).toEqual([]);
  /* a looping animation during the attempt, planted in the page and read
     back through the browser (the fixture lists below prove the hold's
     arithmetic; this proves the reader) */
  await page.evaluate(() => {
    const st = document.createElement("style"); st.id = "wq-plant-style"; st.textContent = "@keyframes wqplant{from{opacity:1}to{opacity:.4}}";
    const d = document.createElement("div"); d.id = "wq-plant-loop"; d.className = "wq-plant-loop"; d.style.cssText = "position:absolute;width:8px;height:8px;animation:wqplant 1s linear infinite";
    document.head.appendChild(st); document.querySelector(".wq-shell").appendChild(d);
  });
  await page.waitForTimeout(50);
  const planted = await runningAnimations(page);
  expect(motionHold("attempt", planted).map((f) => f.detail), JSON.stringify(planted)).toEqual([expect.stringContaining("div.wq-plant-loop:wqplant")]);
  await page.evaluate(() => { document.getElementById("wq-plant-loop").remove(); document.getElementById("wq-plant-style").remove(); });
  expect(motionHold("attempt", ["div.wq-float:wqf"]).map((f) => f.kind)).toEqual(["motion-during-attempt"]);
  /* the interval rule: two pops that intersect by 100 ms, two that merely
     touch, and none at all (the re-judgement: a detector with no control) */
  const crossing = popOverlap([{ tile: 0, start: 0, end: 700 }, { tile: 1, start: 600, end: 1300 }]);
  expect(crossing.findings.map((f) => f.kind)).toEqual(["two-sounding-tiles"]);
  expect(popOverlap([{ tile: 0, start: 0, end: 700 }, { tile: 1, start: 700, end: 1300 }])).toEqual({ findings: [], pops: 2 });
  expect(popOverlap([{ tile: 0, start: 0, end: 700 }, { tile: 0, start: 0, end: 700 }]).pops, "the same pop sampled twice is one pop").toBe(1);
  expect(popOverlap([]).pops).toBe(0);
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

test("control: a word that changes size or moves between ready and reveal is caught", async ({ page }) => {
  const { shown } = await stage(page, null, "ship", null);
  requireStaged("ship", shown);
  const ready = await wordGeometry(page);
  await holdGrade(page, GRADE.correct, []);
  await waitForReveal(page);
  /* the plant: the glyphs shrink mid-word, the way a refit during the reveal would */
  await page.evaluate(() => { const t = document.querySelector(".wq-word .wq-word-text"); t.style.fontSize = "20px"; });
  const shrunk = await wordGeometry(page);
  expect(wordHold(ready, shrunk, "ready and reveal").map((f) => f.kind), JSON.stringify({ ready, shrunk })).toEqual(expect.arrayContaining(["word-resized"]));
  await page.evaluate(() => { document.querySelector(".wq-word .wq-word-text").style.fontSize = ""; document.querySelector(".wq-word").style.marginTop = "9px"; });
  const moved = await wordGeometry(page);
  expect(wordHold(ready, moved, "ready and reveal").map((f) => f.kind)).toEqual(expect.arrayContaining(["word-moved", "baseline-moved"]));
  await page.evaluate(() => { document.querySelector(".wq-word").style.marginTop = ""; });
  expect(wordHold(ready, await wordGeometry(page), "ready and reveal")).toEqual([]);
  expect(wordHold(null, ready).map((f) => f.kind)).toEqual(["no-subject"]);
  expect(wordHold(ready, { ...ready, text: "other" }).map((f) => f.kind)).toEqual(["no-subject"]);
});

test("control: unsnapped art on the Pixel 7 is caught by the reader, and snapped art passes it", async ({ browser }) => {
  /* A REAL element on a REAL 2.625 context (the Pixel 7), read through
     artSnap's browser half: a 64 x 64 PNG drawn at 300 CSS px wide with the
     browser's smoothing is refused on all three counts; resized to eight
     device pixels per art pixel, at an integer device offset, pixelated, it
     passes. The first draft fed snapHold hand-typed numbers and never ran
     the reader (the council's after pass on step 0, 2026-08-22). */
  const ctx = await browser.newContext({ ...devices["Pixel 7"], baseURL: "http://localhost:" + (process.env.CENSUS_PORT || 4187) + "/", serviceWorkers: "block", reducedMotion: "reduce" });
  try {
    const page = await ctx.newPage();
    const { shown } = await stage(page, null, "sat", null);
    requireStaged("sat", shown);
    expect(await page.evaluate(() => devicePixelRatio)).toBe(2.625);
    await page.evaluate(() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 64;
      const x = cv.getContext("2d"); for (let i = 0; i < 64; i++) { x.fillStyle = i % 2 ? "#1d2c50" : "#7fa660"; x.fillRect(i, 0, 1, 64); }
      const img = document.createElement("img"); img.id = "wq-plant-art"; img.setAttribute("data-wq-art", "plant"); img.src = cv.toDataURL("image/png");
      img.style.cssText = "position:absolute;left:3.1px;top:0;width:300px;height:300px;image-rendering:auto";
      document.querySelector(".wq-shell").appendChild(img);
      return new Promise((res) => { img.onload = res; });
    });
    const wrong = snapHold(await artSnap(page));
    expect(wrong.map((f) => f.kind).sort(), JSON.stringify(wrong)).toEqual(["art-not-snapped", "art-off-grid", "art-smoothed"]);
    await page.evaluate(() => {
      const img = document.getElementById("wq-plant-art"); const k = 8, dpr = devicePixelRatio;
      img.style.width = img.style.height = (64 * k) / dpr + "px";
      img.style.left = 262 / dpr + "px"; img.style.top = 105 / dpr + "px";
      img.style.imageRendering = "pixelated";
    });
    const right = snapHold(await artSnap(page));
    expect(right, JSON.stringify(await artSnap(page))).toEqual([]);
  } finally { await ctx.close(); }
});

test("control: a window error in the built page reaches the ring the 200% and rotation cells read", async ({ page }) => {
  /* Those cells assert the ring is null. This proves a null means no error
     rather than no ring: an ErrorEvent dispatched in the staged page lands
     in localStorage under the key they read, with its message, and clears
     (the re-judgement of step 0, 2026-08-22). */
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  expect(await page.evaluate(() => localStorage.getItem("wq-errors"))).toBeNull();
  await page.evaluate(() => window.dispatchEvent(new ErrorEvent("error", { message: "wq-plant-error", filename: "plant.js", lineno: 1 })));
  const ring = await page.evaluate(() => JSON.parse(localStorage.getItem("wq-errors") || "null"));
  expect(ring && ring.length, JSON.stringify(ring)).toBe(1);
  expect(ring[0].message).toContain("wq-plant-error");
  expect(ring[0].screen).toBe("session");
  await page.evaluate(() => localStorage.removeItem("wq-errors"));
  expect(await page.evaluate(() => localStorage.getItem("wq-errors"))).toBeNull();
});
