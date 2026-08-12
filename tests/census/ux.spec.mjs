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
      /* THE CONTROL IS ARMED TWICE, and waiting for the first arm is a trap.
         The app enables the advance control at 400 ms and then TAKES IT BACK
         when the reveal's real length is known, re-arming it for the rest of
         the sound-out. Disabling a focused button drops focus to <body>, so a
         census that sampled focus in that window reported "focus-lost" — a
         defect in the game that does not exist. Measured with the voice clips
         delayed 900 ms: live at +192 ms, disabled again at +779 ms, live for
         good at +8726 ms.
         So: wait for the control to be live AND STAY live for half a second.
         The window this closes is a real finding in its own right and is
         recorded in docs/open-faults.md. */
      await page.waitForFunction(() => {
        const b = document.querySelector(".wq-rail .wq-cta");
        if (!b || b.disabled) { window.__wqStable = 0; return false; }
        window.__wqStable = (window.__wqStable || 0) + 1;
        return window.__wqStable >= 5;
      }, null, { timeout: 25000, polling: 100 });
      const reveal = await inspect(page, viewport, "reveal-correct", {
        expectFocus: true,
        expectTiles: chunkWord(c.word).length,
        mustBeVisible: [".wq-word", ".wq-tile", ".wq-rail .wq-cta"],
      });
      await testInfo.attach("aria", { body: reveal.aria, contentType: "text/plain" });
      if (reveal.offScreen.length)
        await testInfo.attach("controls below the fold", { body: reveal.offScreen.join("\n"), contentType: "text/plain" });

      /* A REAL TAP, on the touch profiles, on the one control a child touches
         after the reveal. The grade above is a 700 ms pointer hold, which is
         the path S5 defines; this is the other path, and without it six touch
         profiles were being driven entirely by mouse clicks. */
      if (viewport.touch) {
        const advance = page.locator(".wq-rail .wq-cta");
        await advance.tap({ scroll: "none", timeout: 5000 });
        await expect.soft(page.locator(".wq-word"), "a tap on “Next word” did not advance")
          .not.toHaveText(c.word, { timeout: 5000 });
      }
      for (const f of reveal.findings) expect.soft(f, `[reveal] ${f.kind}: ${f.detail}`).toBeUndefined();

      /* What a screen reader is told must match what is on screen. The first
         version of this counted lines in the aria snapshot and asserted "more
         than zero", which passes on any page that is not blank — it compared
         nothing to nothing. This reads the letters out of the snapshot's own
         text nodes and requires them to spell the word, in order. */
      const ariaText = (reveal.aria.match(/text:\s*"?([^"\n]+)"?/g) || [])
        .join(" ").toLowerCase();
      for (const unit of chunkWord(c.word))
        expect.soft(ariaText, `the accessibility tree never mentions the tile "${unit}"`)
          .toContain(unit);
      expect.soft(reveal.aria.length, "the accessibility snapshot is empty").toBeGreaterThan(20);
    }

    /* Free play writes nothing (SPEC section 6): the learning evidence a
       grown-up relies on must be identical before and after. The read is
       asserted FIRST: if it fails on both sides it returns "unreadable" twice
       and the comparison passes while proving nothing. */
    const after = await savedState(page);
    expect.soft(after, "the saved state could not be read, so this check proved nothing")
      .not.toBe("unreadable");
    expect.soft(after, "free play changed the saved progress").toBe(before);
    expect.soft(errors, "the page reported errors").toEqual([]);
    expect.soft(offsite, "the app made a request off its own host (S6)").toEqual([]);
  });
}
