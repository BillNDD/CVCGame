/* The census's negative controls (E5). Every detector is run against a defect
 * planted on purpose; a detector that cannot find a fault it was told about
 * will not find one it was not.
 *
 * These run in ONE project (phone-portrait) because a detector is code, not a
 * viewport: proving it fires once proves it fires. The census itself is what
 * runs everywhere.
 */
import { test, expect } from "@playwright/test";
import { inspect, PLANTS, VIEWPORTS, stage, BANK_WORDS } from "../../tools/ux-census.mjs";

const VP = VIEWPORTS[0];
test.beforeEach(({ }, testInfo) => {
  test.skip(testInfo.project.name !== VP.name, "detectors are code, not viewports");
});

for (const [kind, css] of PLANTS) {
  test(`detector fires: ${kind}`, async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.addStyleTag({ content: css });
    await page.waitForTimeout(150);
    const { findings } = await inspect(page, VP, "planted", {});
    expect(findings.map((f) => f.kind)).toContain(kind);
  });
}

test("a clean page produces none of those findings", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(200);
  const { findings } = await inspect(page, VP, "clean", {});
  const kinds = new Set(findings.map((f) => f.kind));
  for (const [kind] of PLANTS) expect(kinds.has(kind), `clean page reported ${kind}`).toBe(false);
});

test("a case that cannot be staged is refused, never examined", async ({ page }) => {
  /* The word is deliberately not the one the seed selects. The census must say
     so and stop, rather than examine whatever the app happened to show —
     which is exactly what tools/record-reveal.mjs did when it was asked for
     "of" and quietly recorded "mop". */
  const { shown } = await stage(page, VP, "cat", null, { forceWrongSeed: true, url: "/" });
  expect(shown).not.toBe("cat");
  expect(BANK_WORDS).toContain(shown);
});
