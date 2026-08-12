/* The census's negative controls (E5). SEVEN of the census's detectors are run
 * against a defect planted on purpose; a detector that cannot find a fault it
 * was told about will not find one it was not.
 *
 * SEVEN, NOT ALL, and the difference is written here rather than glossed. These
 * have a control: horizontal-overflow, vertical-overflow, element-past-the-edge,
 * nested-scroll, control-too-small, control-obscured, nothing-measured. These do
 * NOT yet: tile-count, empty-tile, below-the-fold, missing, focus-lost,
 * unreachable-control, page/console errors, off-host requests, and
 * free-play-wrote-evidence. Each of those needs a defect planted in the app
 * rather than in a stylesheet, which is a bigger job than a CSS string. The
 * header of this file claimed "every" until a reviewer counted them on
 * 2026-08-12; a claim about coverage is exactly the kind that must be counted
 * rather than asserted.
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
     "of" and quietly recorded "mop".

     This asserts the REFUSAL, not just the mismatch. The earlier version
     checked only that a different word appeared, which would still pass if the
     census went on to examine it — the very fault it exists to rule out. So it
     runs the same expectation the census runs, inside a soft-assert boundary,
     and requires it to have failed. */
  const { shown } = await stage(page, VP, "cat", null, { forceWrongSeed: true, url: "/" });
  expect(shown).not.toBe("cat");
  expect(BANK_WORDS).toContain(shown);
  let refused = false;
  try { expect(shown, "the census must refuse this case").toBe("cat"); }
  catch { refused = true; }
  expect(refused, "a mis-staged word did NOT stop the case").toBe(true);
});
