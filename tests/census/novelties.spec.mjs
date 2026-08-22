/* The matrix half of the beta-cadence novelties (owner-ruled 2026-08-20).
 * Three cells per device profile: the phase walk, the home furniture, and the
 * reveal hit-test. Their negative controls live in novelties-once.spec.mjs,
 * exercising the SAME helpers (E5) - a copy proves nothing about the
 * original. The offline and update cells live there too: they test logic,
 * not geometry, so one profile settles them. */
import { test, expect } from "@playwright/test";
import { stage, holdGrade, waitForReveal, requireStaged, GRADE } from "../../tools/ux-census.mjs";
import { landmarks, phaseHold, homeFurniture, chromeHold, hitTest,
         zoneSum, runningAnimations, motionHold, tileWidths, unitWidthHold } from "../../tools/census-novelties.mjs";

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
  test("one event at a time: nothing animates during an attempt; one sounding tile and the fill during a reveal", async ({ page }) => {
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
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) {
      samples.push(await runningAnimations(page));
      const live = await page.evaluate(() => { const b = document.querySelector(".wq-rail .wq-cta"); return !!b && !b.disabled; });
      if (live && samples.length > 3) break;
      await page.waitForTimeout(120);
    }
    const findings = samples.flatMap((s) => motionHold("reveal", s));
    expect(findings, JSON.stringify(samples)).toEqual([]);
    /* And the samples saw a sounding tile at all, or the cell measured a
       silent reveal and proved nothing about one. */
    expect(samples.some((s) => s.some((n) => n.includes("wqpop"))), "no sounding tile was ever seen during the reveal").toBe(true);
  });
});
