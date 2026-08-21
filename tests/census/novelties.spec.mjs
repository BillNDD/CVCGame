/* The matrix half of the beta-cadence novelties (owner-ruled 2026-08-20).
 * Three cells per device profile: the phase walk, the home furniture, and the
 * reveal hit-test. Their negative controls live in novelties-once.spec.mjs,
 * exercising the SAME helpers (E5) - a copy proves nothing about the
 * original. The offline and update cells live there too: they test logic,
 * not geometry, so one profile settles them. */
import { test, expect } from "@playwright/test";
import { stage, holdGrade, waitForReveal, requireStaged, GRADE } from "../../tools/ux-census.mjs";
import { landmarks, phaseHold, homeFurniture, chromeHold, hitTest } from "../../tools/census-novelties.mjs";

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
  await page.getByText("▶️ Begin Session").waitFor();
  const before = await homeFurniture(page);
  await page.getByText("🎈 Free play").click();
  await page.getByText("🎲 Truly random").click();
  await page.locator(".wq-word").waitFor();
  await page.locator(".wq-header button").first().click();   // 🏠 home
  await page.getByText("▶️ Begin Session").waitFor();
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
