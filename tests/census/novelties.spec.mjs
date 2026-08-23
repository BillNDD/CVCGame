/* The matrix half of the beta-cadence novelties (owner-ruled 2026-08-20).
 * Three cells per device profile: the phase walk, the home furniture, and the
 * reveal hit-test. Their negative controls live in novelties-once.spec.mjs,
 * exercising the SAME helpers (E5) - a copy proves nothing about the
 * original. The offline and update cells live there too: they test logic,
 * not geometry, so one profile settles them. */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { stage, holdGrade, waitForReveal, requireStaged, GRADE } from "../../tools/ux-census.mjs";
import { landmarks, phaseHold, homeFurniture, chromeHold, hitTest,
         zoneSum, runningAnimations, motionHold, popSpans, popOverlap, tileWidths, unitWidthHold,
         widestWord, wordBox, wordFits, wordGeometry, wordHold, soundingTile, soundingHold, buildControls, buildHold, faultOpen } from "../../tools/census-novelties.mjs";
import { BANK_WORDS, stageBuild, requireBuilt } from "../../tools/ux-census.mjs";
import { C } from "../../src/engine.js";

test("phase walk: the screen holds still while a word moves through its phases", async ({ page }, testInfo) => {
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  const snaps = [{ phase: "ready", marks: await landmarks(page) }];
  await holdGrade(page, GRADE.correct, []);
  await waitForReveal(page);
  snaps.push({ phase: "reveal", marks: await landmarks(page) });
  /* The interceptor question is asked HERE, mid-reveal, because this is the
     one moment the census's static screens never hold: pops, rings and the
     praise line are all up. */
  const intercepted = await hitTest(page);
  expect.soft(intercepted, JSON.stringify(intercepted)).toEqual([]);
  await page.locator(".wq-rail .wq-cta").click();
  await page.locator(".wq-word").waitFor();
  snaps.push({ phase: "next-ready", marks: await landmarks(page) });
  const findings = phaseHold(snaps);
  expect(findings, JSON.stringify(findings)).toEqual([]);
});

test("home furniture: the child's two big buttons sit where they sat, after a visit", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  const before = await homeFurniture(page);
  await page.getByRole("button", { name: "Free play" }).click();
  await page.getByRole("button", { name: "Any word" }).click();
  await page.locator(".wq-word").waitFor();
  await page.locator(".wq-header button").first().click();   // 🏠 home
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  const after = await homeFurniture(page);
  const findings = chromeHold(before, after);
  expect(findings, JSON.stringify(findings)).toEqual([]);
});

test("ready hit-test: every live control owns its own centre", async ({ page }) => {
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  const findings = await hitTest(page);
  expect(findings, JSON.stringify(findings)).toEqual([]);
});

/* ---------------------------------------------------------------- step 0d
   The art bible's claims as measurements, on every profile, before any art
   exists (art project step 0d, owner-ruled 2026-08-22). Each cell refuses a
   screen with no subject; the planted-fault controls are in
   novelties-once.spec.mjs. */

test("frame: the header, stage and rail fill the shell, and nothing else takes layout", async ({ page }) => {
  /* On the compact profile the session screen has spent its height; a frame
     in flow would push the rail off the screen. Measured on the session
     screen with a word up, the screen a child spends the most time on. */
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  const r = await zoneSum(page);
  expect(r.zones, "the three zones must exist").toBeTruthy();
  expect(r.findings, JSON.stringify(r)).toEqual([]);
});

test("unit width: a multi-letter tile is visibly wider than a single-letter one in the reveal", async ({ page }) => {
  /* Bible 11 and S8's observed proof, which safety-cover records as missing:
     "ship" reveals sh as one tile beside i and p. */
  const { shown } = await stage(page, null, "ship", null);
  requireStaged("ship", shown);
  await holdGrade(page, GRADE.correct, []);
  await waitForReveal(page);
  const tiles = await tileWidths(page);
  const findings = unitWidthHold(tiles);
  expect(findings, JSON.stringify({ tiles, findings })).toEqual([]);
});

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });
  test("one event at a time: nothing animates during an attempt; one sounding tile and the fill during a reveal, sampled every 100 ms and as intervals", async ({ page }) => {
    /* The census runs with reduced motion everywhere, which blinds every other
       cell to ambient motion; this one allows it and counts. */
    const { shown } = await stage(page, null, "sat", null);
    requireStaged("sat", shown);
    const attempt = await runningAnimations(page);
    expect(motionHold("attempt", attempt), JSON.stringify(attempt)).toEqual([]);
    await holdGrade(page, GRADE.correct, []);
    /* Sampled DURING the reveal - from the first tile until the advance goes
       live - because that is when the sounding tiles and the fill run. */
    await page.locator(".wq-tile").first().waitFor({ timeout: 8000 });
    const samples = [], spans = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) {
      samples.push(await runningAnimations(page));
      spans.push(...await popSpans(page));
      const live = await page.evaluate(() => { const b = document.querySelector(".wq-rail .wq-cta"); return !!b && !b.disabled; });
      if (live && samples.length > 3) break;
      await page.waitForTimeout(100);
    }
    const findings = samples.flatMap((s) => motionHold("reveal", s));
    expect(findings, JSON.stringify(samples)).toEqual([]);
    /* And as intervals on the document's timeline: no two sampled pops
       overlap, however briefly, and at least one pop was timed. */
    const overlap = popOverlap(spans);
    expect(overlap.findings, JSON.stringify(spans)).toEqual([]);
    expect(overlap.pops, "no pop was ever timed").toBeGreaterThan(0);
    /* And the samples saw a sounding tile at all, or the cell measured a
       silent reveal and proved nothing about one. */
    expect(samples.some((s) => s.some((n) => n.includes("wqpop"))), "no sounding tile was ever seen during the reveal").toBe(true);
  });
});

test("the widest word: one line on this profile, and its box, glyph size and baseline hold from attempt to feedback", async ({ page }) => {
  /* Bible 3.2 and 19.1 for the one word whose glyph size is computed at
     runtime. The phase walk stages "sat", which the fit never touches; this
     cell stages the widest bank word by rendered width (the probe), holds
     it to one line at 36 px or more on THIS profile, and then measures the
     same word in ready and in reveal: the box to 0.5 px, the glyph size to
     0.01 px, the text's bottom to 0.5 px. Between words the box and the
     baseline are constant by construction (Word.jsx) and only the glyphs
     may differ - the phase walk's next-ready comparison already holds the
     box across words. */
  const { shown } = await stage(page, null, "sat", null);
  requireStaged("sat", shown);
  const widest = await widestWord(page, BANK_WORDS);
  expect(widest && widest.em, "the probe must measure a word").toBeGreaterThan(4);
  const staged = await stage(page, null, widest.word, null);
  requireStaged(widest.word, staged.shown);
  const ready = await wordGeometry(page);
  const fit = wordFits(await wordBox(page), 36);
  expect(fit, JSON.stringify({ widest, ready, fit })).toEqual([]);
  await holdGrade(page, GRADE.correct, []);
  await waitForReveal(page);
  await page.waitForTimeout(300);   // a late layout or a font event, if any, lands here
  const reveal = await wordGeometry(page);
  const held = wordHold(ready, reveal, "ready and reveal");
  expect(held, JSON.stringify({ ready, reveal, held })).toEqual([]);
});

test.describe("with motion allowed, the sounding tile", () => {
  test.use({ reducedMotion: "no-preference" });
  test("the ceramic sounding state: a structural ring at offset 0, the band outside it, the face lifted 8-12%, nothing moved, nothing into a neighbour's letters; the live mark handed on at the second pop; the band 7 and 5 at six and eight tiles", async ({ page }) => {
    /* Bible 11 and 9.2 as measurements (art step 1). The reveal of "ship":
       the resting row's boxes first, then the first pop caught live, then
       the second; then the densities. */
    const { shown } = await stage(page, null, "ship", null);
    requireStaged("ship", shown);
    await holdGrade(page, GRADE.correct, []);
    await page.locator(".wq-tile").first().waitFor({ timeout: 8000 });
    const resting = await page.evaluate(() => [...document.querySelectorAll(".wq-slot-tiles .wq-tile")].map((t) => { const b = t.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => +v.toFixed(2)); }));
    await page.waitForFunction(() => !!document.querySelector(".wq-slot-tiles .wq-tile.wq-pop"), null, { timeout: 8000 });
    const s = await soundingTile(page);
    const findings = soundingHold(s, C, resting);
    expect(findings, JSON.stringify({ s, findings })).toEqual([]);
    expect(s.text, "the first sounding tile of ship is sh").toBe("sh");
    expect(s.wqband, "the reveal's band: 9, or 7 on a short stage").toBe(page.viewportSize().height < 520 ? 7 : 9);
    /* THE SECOND POP: the mark moves. The first tile keeps the .wq-pop class
       (its ring ended with its animation's last frame) but hands the live
       mark on, so exactly one tile is beneath its siblings at a time - the
       reset in schedulePops, which a read at the first pop can never see
       (the fifth judgement). */
    await page.waitForFunction(() => document.querySelectorAll(".wq-slot-tiles .wq-tile.wq-pop").length >= 2, null, { timeout: 8000 });
    const second = await soundingTile(page);
    const secondFindings = soundingHold(second, C, resting);
    expect(secondFindings, JSON.stringify({ second, secondFindings })).toEqual([]);
    expect(second.text, "the second sounding tile of ship is i").toBe("i");
    expect(second.popped, "two tiles carrying the class, one ring showing, one live").toBe(2);
    /* THE DENSITIES: six tiles resolve the band to 7 and eight to 5 on every
       profile, short stage included - the cascade's work, read rather than
       pinned (the fifth judgement: the cell had only ever seen "ship") */
    for (const [word, tiles, band] of [["animal", 6, 7], ["breakfast", 8, 5]]) {
      const dealt = await stage(page, null, word, null);
      requireStaged(word, dealt.shown);
      await holdGrade(page, GRADE.correct, []);
      await page.waitForFunction(() => !!document.querySelector(".wq-slot-tiles .wq-tile.wq-pop"), null, { timeout: 8000 });
      const dense = await soundingTile(page);
      const denseFindings = soundingHold(dense, C);
      expect(denseFindings, JSON.stringify({ word, dense, denseFindings })).toEqual([]);
      expect(dense.boxes.length, word + "'s tiles").toBe(tiles);
      expect(dense.wqband, word + "'s resolved band").toBe(band);
    }
  });
});

test("Build-it: every tile and slot is a 56 px child control a finger can reach, on the smallest and the largest tray, and a multi-letter tray tile is wider", async ({ page }) => {
  /* S7 and S8 on the one screen no G7 check opened (the before pass on step
     1): "ship" dealt through the dice, its tray read as controls; then
     "breakfast", the largest tray the bank deals (eight slots, ten tiles),
     which the monkey found running under the grown-up strip on the 320 px
     profile - every control must own its centre and sit on the screen. */
  const dealt = await stageBuild(page, "ship");
  requireBuilt("ship", dealt);
  const controls = await buildControls(page);
  const findings = buildHold(controls, 56);
  expect(findings, JSON.stringify({ controls, findings })).toEqual([]);
  expect(controls.filter((c) => c.slot).length).toBe(3);
  const big = await stageBuild(page, "breakfast");
  requireBuilt("breakfast", big);
  const largest = await buildControls(page);
  expect(largest.length, "eight slots and ten tiles").toBe(18);
  const bigFindings = buildHold(largest, 56);
  /* A phone in LANDSCAPE - the phone-landscape profile, a 750 x 342 page
     with a 245 px stage under the 62 px header and above the 35 px strip -
     cannot hold two slot rows and two tray rows of 64 px boxes: the tray
     starts below the fold (its first row at y = 338 on 2026-08-22) -
     docs/open-faults.md AE, the Build-it layout step's. Measured here and
     reported, not hidden: the landscape phone must show exactly that shape -
     the ten TRAY tiles off the screen (their bottoms past innerHeight) and
     under nothing, every slot in reach - with the page's own numbers in the
     report and the entry's heading still open, not CLOSED; everywhere
     else, nothing. */
  const landscape = page.viewportSize().width > page.viewportSize().height && page.viewportSize().height < 520;
  if (landscape) {
    const geometry = await page.evaluate(() => { const st = document.querySelector(".wq-stage").getBoundingClientRect(); const cs = [...document.querySelectorAll(".wq-tilebtn")]; return { innerWidth, innerHeight, stage: [Math.round(st.top), Math.round(st.bottom)], lowestBottom: Math.round(Math.max(...cs.map((b) => b.getBoundingClientRect().bottom))) }; });
    const offScreen = bigFindings.filter((f) => f.kind === "control-unreachable" && f.detail.includes("off the screen")).map((f) => f.detail.match(/^"([^"]+)"/)[1]).sort();
    expect(offScreen, JSON.stringify({ geometry, bigFindings })).toEqual(largest.filter((c) => !c.slot).map((c) => c.label).sort());
    expect(bigFindings.length, "the ten tray tiles and nothing else: " + JSON.stringify(geometry)).toBe(10);
    expect(geometry.lowestBottom, "the tray's last row below the fold: " + JSON.stringify(geometry)).toBeGreaterThan(geometry.innerHeight);
    expect(largest.filter((c) => !c.slot).map((c) => c.label + ":" + c.cover), "off the screen, under nothing - a lid would be a different fault").toEqual(largest.filter((c) => !c.slot).map((c) => c.label + ":"));
    expect(faultOpen(readFileSync(new URL("../../docs/open-faults.md", import.meta.url), "utf8"), "AE"), "the fault this shape is pinned to must still be open - its heading not CLOSED").toBe(true);
  } else {
    expect(bigFindings, JSON.stringify({ largest: largest.map((c) => c.label + ":" + c.w.toFixed(0) + "x" + c.h.toFixed(0) + (c.cover ? " under " + c.cover : "") + (c.offscreen ? " offscreen" : "")), bigFindings })).toEqual([]);
  }
});
