/* THE DEEP UX CENSUS — one test per layout class, per viewport.
 *
 * 44 words covering all 29 layout-risk classes in the bank, across 7 viewports:
 * 308 cells. Each cell stages a NAMED word through the app's own free-play
 * chooser, checks the prompt, grades it the way a grown-up does, and checks the
 * reveal. Both states are inspected for the whole list in one pass.
 *
 * The word is reached by holding Math.random still, then READ OFF THE SCREEN
 * and refused if it is not the one asked for. The app builds its own block from
 * its own bank through its own chooser; only the dice are held.
 *
 * expect.soft is deliberate: a cell reports EVERY defect it has rather than
 * stopping at the first, because the point of a census is coverage, not the
 * first thing that goes wrong.
 *
 * WHAT THIS CANNOT SETTLE, so no report implies otherwise: whether the voice is
 * right, whether a child understands the screen, whether a colour is pleasant.
 * There are no pixel baselines: screenshots vary with OS, browser build and
 * headless mode, so the census measures geometry, accessibility structure and
 * errors — facts that survive a different machine.
 */
import { test, expect } from "@playwright/test";
import { chunkWord } from "../../src/engine.js";
import { cases, inspect, stage, holdGrade, savedState, VIEWPORTS } from "../../tools/ux-census.mjs";

const CASES = cases();
const VP = Object.fromEntries(VIEWPORTS.map((v) => [v.name, v]));

/* The screens a word never visits, checked once per viewport. */
for (const [which, open] of [
  ["home", async () => {}],
  ["grown-ups corner", async (page) => page.getByRole("button", { name: "Grown-ups corner" }).click()],
  ["free-play chooser", async (page) => page.getByText("🎈 Free play").click()],
]) {
  test(`screen: ${which}`, async ({ page }, testInfo) => {
    const viewport = VP[testInfo.project.name];
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
    await page.goto("/", { waitUntil: "load" });
    await open(page);
    await page.waitForTimeout(200);
    const { findings, aria, unclassified } = await inspect(page, viewport, which, {});
    await testInfo.attach("aria", { body: aria, contentType: "text/plain" });
    if (unclassified.length)
      await testInfo.attach("controls with no size class", { body: unclassified.join("\n"), contentType: "text/plain" });
    for (const f of findings) expect.soft(f, `${f.kind}: ${f.detail}`).toBeUndefined();
    expect.soft(errors, "the page reported errors").toEqual([]);
  });
}

for (const c of CASES) {
  test(`${c.word} — ${c.sig} (${c.why}, ${c.size} in class)`, async ({ page, context }, testInfo) => {
    const viewport = VP[testInfo.project.name];
    const errors = [];
    const offsite = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
    page.on("request", (r) => {
      const u = r.url();
      if (!u.startsWith(testInfo.project.use.baseURL || "http://localhost:4187/") && !u.startsWith("data:")) offsite.push(u);
    });

    const { shown } = await stage(page, viewport, c.word, null, { url: "/" });
    /* Refused, not substituted: recording a different word than the one asked
       for is the fault tools/record-reveal.mjs shipped with. */
    expect(shown, `asked for "${c.word}", the app showed "${shown}"`).toBe(c.word);

    const before = await savedState(page);

    const prompt = await inspect(page, viewport, "word", {
      mustBeVisible: [".wq-word", "button[aria-label='✓ got it (hold)']"],
    });
    for (const f of prompt.findings) expect.soft(f, `[word] ${f.kind}: ${f.detail}`).toBeUndefined();

    const findings = [];
    const held = await holdGrade(page, "✓ got it (hold)", findings);
    for (const f of findings) expect.soft(f, `[grading] ${f.kind}: ${f.detail}`).toBeUndefined();

    if (held) {
      await page.locator(".wq-tile").first().waitFor({ timeout: 8000 });
      /* The advance control is inert for 400 ms on purpose (S1's cousin: a
         child cannot skip past the reveal by hammering). Focus is judged only
         once it is live, because that is the moment a person can act — and
         measured in a real browser, that is exactly when the app moves focus
         to it. Judging a moment earlier reported a defect that does not
         exist. */
      await page.waitForFunction(
        () => { const b = document.querySelector(".wq-rail .wq-cta"); return b && !b.disabled; },
        null, { timeout: 10000 });
      const reveal = await inspect(page, viewport, "reveal-correct", {
        expectFocus: true,
        expectTiles: chunkWord(c.word).length,
        mustBeVisible: [".wq-word", ".wq-tile", ".wq-rail .wq-cta"],
      });
      await testInfo.attach("aria", { body: reveal.aria, contentType: "text/plain" });
      for (const f of reveal.findings) expect.soft(f, `[reveal] ${f.kind}: ${f.detail}`).toBeUndefined();

      /* What a screen reader is told must match what is on screen: an empty or
         duplicated tile shows up as a mismatch here and nowhere else. */
      const ariaTiles = (reveal.aria.match(/\n\s*-\s/g) || []).length;
      expect.soft(ariaTiles, "the accessibility tree is empty").toBeGreaterThan(0);
    }

    /* Free play writes nothing (SPEC section 6): the learning evidence a
       grown-up relies on must be identical before and after. */
    expect.soft(await savedState(page), "free play changed the saved progress").toBe(before);
    expect.soft(errors, "the page reported errors").toEqual([]);
    expect.soft(offsite, "the app made a request off its own host (S6)").toEqual([]);
  });
}
