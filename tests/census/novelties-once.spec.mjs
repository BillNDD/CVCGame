/* The singleton half of the beta-cadence novelties (owner-ruled 2026-08-20),
 * bound to its own project by testMatch exactly as the census controls are -
 * a file selected by testMatch cannot silently skip.
 *
 * Two live cells (offline equality, update-stay) plus the negative controls
 * for all five novelty detectors (E5). Every control exercises the SAME
 * helper the live cells run, from tools/census-novelties.mjs. */
import { test, expect } from "@playwright/test";
import { stage, holdGrade, waitForReveal, requireStaged, GRADE } from "../../tools/ux-census.mjs";
import { landmarks, phaseHold, homeFurniture, chromeHold, offlineHold,
         markStay, assertStayed, pokeForeground, hitTest } from "../../tools/census-novelties.mjs";

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
  await page.getByText("▶️ Begin Session").waitFor();
  const before = await homeFurniture(page);
  await page.addStyleTag({ content: ".wq-cta{margin-top:9px!important}" });
  await page.waitForTimeout(100);
  const after = await homeFurniture(page);
  const findings = chromeHold(before, after);
  expect(findings.map((f) => f.kind)).toContain("chrome-drift");
});

test("control: an offline screen that differs is caught by the comparator", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.getByText("▶️ Begin Session").waitFor();
  const online = { home: await homeFurniture(page) };
  await page.addStyleTag({ content: ".wq-cta{min-height:80px!important}" });
  await page.waitForTimeout(100);
  const offline = { home: await homeFurniture(page) };
  const findings = offlineHold(online, offline);
  expect(findings.map((f) => f.kind)).toContain("offline-shift");
});

test("control: a page that reloads under the child is caught", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.getByText("▶️ Begin Session").waitFor();
  await markStay(page);
  await page.reload({ waitUntil: "load" });
  await page.getByText("▶️ Begin Session").waitFor();
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
  await page.getByText("▶️ Begin Session").waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const online = { home: await homeFurniture(page) };
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "load" });
    await page.getByText("▶️ Begin Session").waitFor();
    const offline = { home: await homeFurniture(page) };
    const findings = offlineHold(online, offline);
    expect(findings, JSON.stringify(findings)).toEqual([]);
  } finally {
    await context.setOffline(false);
  }
});
});
