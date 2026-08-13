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
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { inspect, PLANTS, VIEWPORTS, stage, BANK_WORDS, requireStaged, FONT_FLOOR, FONT_CEIL } from "../../tools/ux-census.mjs";

/* NO NAME-STRING SKIP. This file used to select itself with
   `test.skip(testInfo.project.name !== "phone-portrait")`. An auditor renamed
   the projects to `chromium-<viewport>` - the minimum item 1 of the census
   build spec requires - and every one of these 63 cells skipped, exit code 0,
   reported as success. Every E5 obligation in the census would have evaporated
   on the first commit, silently and greenly.
   The file is now bound to its own project by testMatch in the config, so
   there is nothing to skip and nothing to mis-spell. */
const VP = VIEWPORTS[0];

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

/* The detectors added on 2026-08-13, each with the plant an auditor used to
   prove the previous version was decoration. */
test("detector fires: text-too-small", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.addStyleTag({ content: `button, .wq-cta, .wq-sbtn { font-size: 6px !important; }` });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  expect(findings.map((f) => f.kind)).toContain("text-too-small");
});

test("detector fires: a PARTIAL cover, not just a full-page one", async ({ page }) => {
  /* The old control used a full-page overlay, the easiest possible case. This
     covers the left 49% - the exact plant that produced ZERO findings from the
     single-centre-point version, because every control's centre sat just clear
     of the panel edge while its label was half buried. It is a pseudo-element,
     so it is invisible to a DOM scan: this is what the five-point sample is
     for, and the element-overlap scan below is for the other shape. */
  await page.goto("/", { waitUntil: "load" });
  await page.addStyleTag({ content:
    `body::after{content:"";position:fixed;left:0;top:0;width:49vw;height:100vh;background:#000;z-index:99999;}` });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  expect(findings.map((f) => f.kind)).toContain("control-obscured");
});

test("detector fires: overlap, when something lands ON a control", async ({ page }) => {
  /* The fault this is actually for: the home-screen images that landed on top
     of one another. The first version of this plant sat half off the button and
     the only thing it collided with was the NEXT button down - so the control
     was green for a collision it never named, while the detector was blind to
     the case in its own title. It asserts the DETAIL now, not the kind: a
     finding of the right kind from the wrong pair is not evidence. */
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "▶️ Begin Session" }).waitFor({ timeout: 8000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Begin Session"));
    const r = b.getBoundingClientRect();
    const d = document.createElement("div");
    d.textContent = "landed on top";
    d.style.cssText = `position:fixed;left:${r.left + r.width * 0.25}px;top:${r.top + r.height * 0.2}px;`
      + `width:${r.width * 0.5}px;height:${r.height * 0.6}px;background:#c33;color:#fff;z-index:5;`;
    document.body.appendChild(d);
  });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  const overlap = findings.filter((f) => f.kind === "overlap").map((f) => f.detail).join(" | ");
  expect(overlap, "no overlap was reported at all").not.toBe("");
  expect(overlap, "an overlap was reported, but not between the two elements the plant collided")
    .toMatch(/landed on top/);
  expect(overlap, "the control that was landed on is not named in the finding").toMatch(/Begin Session/);
});

test("detector fires: control-obscured, from a badge on the CENTRE alone", async ({ page }) => {
  /* Requiring two of five sample points was a regression on the case the
     single-centre version already caught. On screen this reads "B NEW ssion". */
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "▶️ Begin Session" }).waitFor({ timeout: 8000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Begin Session"));
    const r = b.getBoundingClientRect();
    const d = document.createElement("div");
    d.textContent = "NEW";
    d.style.cssText = `position:fixed;left:${r.left + r.width / 2 - 30}px;top:${r.top + r.height / 2 - 10}px;`
      + `width:60px;height:20px;background:#333;color:#fff;z-index:9;`;
    document.body.appendChild(d);
  });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {});
  const obscured = findings.filter((f) => f.kind === "control-obscured").map((f) => f.detail).join(" | ");
  expect(obscured, "a badge on a control's centre was not reported").toMatch(/Begin Session/);
});

test("detector fires: text-too-big, the fault this census was commissioned for", async ({ page }) => {
  /* A label at four times its intended size. Floors alone left this green, and
     it is the reason the census exists. */
  await page.goto("/", { waitUntil: "load" });
  await page.addStyleTag({ content: `button { font-size: 64px !important; }` });
  await page.waitForTimeout(200);
  const { findings } = await inspect(page, VP, "planted", {});
  expect(findings.map((f) => f.kind)).toContain("text-too-big");
});

test("a clean page reports no overlap and no small text", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(200);
  const { findings } = await inspect(page, VP, "clean", {});
  const kinds = findings.map((f) => f.kind);
  expect(kinds, "a clean page reported an overlap").not.toContain("overlap");
  expect(kinds, "a clean page reported small text").not.toContain("text-too-small");
  expect(kinds, "a clean page reported big text").not.toContain("text-too-big");
});

test("detector fires: missing, when a screen loses a control it must have", async ({ page }) => {
  /* B5's plant, as a shipped control. An auditor deleted the "Begin Session"
     button - a child cannot start a session at all - and every one of the seven
     viewports stayed green, because the screen cells passed `{}` to inspect and
     so asserted the existence of nothing. */
  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "▶️ Begin Session" }).waitFor({ timeout: 8000 });
  /* The node is REMOVED, which is the fault. An earlier version of this plant
     used addStyleTag with `button:has-text(...)` - a Playwright selector, not
     CSS - and one invalid selector voids the whole rule, so nothing was hidden
     and the control failed for a reason that had nothing to do with the app. */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Begin Session"));
    b.remove();
  });
  await page.waitForTimeout(150);
  const { findings } = await inspect(page, VP, "planted", {
    mustBeVisible: ['button:has-text("Begin Session")'],
  });
  expect(findings.map((f) => f.kind)).toContain("missing");
});

test("the font limits are limits, not the values the app happens to render", () => {
  expect(FONT_FLOOR.control).toBe(12);
  expect(FONT_FLOOR.word).toBe(24);
  expect(FONT_CEIL.control).toBe(34);
  expect(FONT_CEIL.word).toBe(160);
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

  /* The REAL guard, called the way the census calls it. The previous version
     re-ran the census's own expect inside a try/catch, which proved that
     Playwright's expect throws and nothing about the census: an auditor
     downgraded the census's guard to expect.soft and this control still
     passed while the census examined a word it never asked for. */
  expect(() => requireStaged("cat", shown), "requireStaged accepted the wrong word").toThrow(/staging refused/);
  expect(requireStaged("cat", "cat"), "requireStaged rejected the RIGHT word").toBe("cat");

  /* And that the census actually calls it. A guard nothing calls is a guard
     that is not there. */
  const src = readFileSync(new URL("./ux.spec.mjs", import.meta.url), "utf8");
  expect(src, "the census no longer calls requireStaged").toContain("requireStaged(c.word, shown)");
  expect(src, "the census guards staging with a softenable assertion again")
    .not.toMatch(/expect\.soft\([^)]*shown/);
});
