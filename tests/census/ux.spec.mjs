/* THE DEEP UX CENSUS — one test per layout class, per viewport.
 *
 * 44 words covering all 29 layout-risk classes in the bank, across 8 device
 * profiles: 376 cells from this file — 44 word cases plus 3 screen cases, each
 * on 8 profiles — and 25 more from the controls, which run on one. Every number
 * in that sentence is asserted in tests/census/controls.spec.mjs rather than
 * typed and trusted: it read "9 more from the controls" while 18 ran, which is
 * how a document stops describing the thing it names.
 *
 * THE PROFILES ARE REAL DEVICES (build spec item 2), so the heights are what a
 * page actually gets after browser chrome — an iPhone 13 gives 390x664, not the
 * 390x844 this census asserted against for its first two days.
 * Each cell stages a NAMED word through the app's own free-play
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
import { cases, inspect, stage, holdGrade, savedState, VIEWPORTS, requireStaged } from "../../tools/ux-census.mjs";

const CASES = cases();
const VP = Object.fromEntries(VIEWPORTS.map((v) => [v.name, v]));

/* The screens a word never visits, checked once per viewport. */
/* Each screen names WHAT MUST BE ON IT. Without that these cells passed
   `{}` to inspect and asserted the existence of nothing: an auditor deleted
   the "Begin Session" button - a child cannot start a session at all - and all
   seven viewports stayed green. */
for (const [which, open, mustBeVisible, mustExist] of [
  /* Selectors read off the app's own source, not guessed: the first version of
     this list named a "Check for updates" button that lives on the home
     screen's grown-up strip, not in the corner, so three screens reported
     "missing" for a control that was never there. */
  ["home", async () => {}, ['button:has-text("Begin Session")', '[aria-label="Grown-ups corner"]']],
  ["grown-ups corner", async (page) => page.getByRole("button", { name: "Grown-ups corner" }).click(), null,
    ['button:has-text("Copy log")', 'button:has-text("Reset all progress")']],
  ["free-play chooser", async (page) => page.getByText("🎈 Free play").click(), ['button:has-text("Truly random")']],
]) {
  test(`screen: ${which}`, async ({ page }, testInfo) => {
    const viewport = VP[testInfo.project.name];
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
    await page.goto("/", { waitUntil: "load" });
    await open(page);
    await page.waitForTimeout(200);
    const { findings, aria, unclassified, covered } = await inspect(page, viewport, which, { mustBeVisible: mustBeVisible || undefined, mustExist });
    await testInfo.attach("aria", { body: aria, contentType: "text/plain" });
    if (unclassified.length)
      await testInfo.attach("controls with no size class", { body: unclassified.join("\n"), contentType: "text/plain" });
    /* Reported, never asserted: a toast floats over live content on purpose,
       so what it buries is a fact a person should read rather than a defect
       that reddens a cell. Naming it an overlay instead — which is what was
       done on 2026-08-12 — removed the finding rather than the false
       positive. */
    if (covered.length)
      await testInfo.attach("what a toast covered", { body: covered.join("\n"), contentType: "text/plain" });
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
    /* Refused, not substituted, and refused by a FUNCTION THAT THROWS rather
       than by an assertion in this file. An assertion here can be downgraded to
       expect.soft in one character, and when an auditor did exactly that the
       control that existed to forbid it still passed. */
    requireStaged(c.word, shown);

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
      if (reveal.covered.length)
        await testInfo.attach("what a toast covered", { body: reveal.covered.join("\n"), contentType: "text/plain" });

      for (const f of reveal.findings) expect.soft(f, `[reveal] ${f.kind}: ${f.detail}`).toBeUndefined();

      /* THE TILES, IN ORDER, AGAINST THE ENGINE'S OWN SPLIT. This assertion has
         now been wrong twice, and both times it was sold as the fix for the
         previous version:
           1. it counted lines in the aria snapshot and asserted "more than
              zero" — true of any page that is not blank;
           2. it read `text:` nodes out of the snapshot — but in mode:"ai" the
              tile letters are trailing text on `generic` lines, so it was
              reading the praise sentence and finding "c", "h", "e", "k" inside
              it. Deleting the entire tile row left it green.
         An auditor caught the second one. So it no longer parses a snapshot at
         all: it compares the VISIBLE tile text with chunkWord(), in order, with
         Playwright's own assertion. Delete a tile and it fails; reorder them
         and it fails. The aria snapshot is still attached to the report as
         evidence for a person to read — attached, not asserted, until
         toMatchAriaSnapshot lands with the next census. */
      /* IN VISUAL ORDER, AND ONLY WHAT IS PAINTED. toHaveText reads DOM order
         and count() counts DOM nodes, so an auditor set flex-direction:
         row-reverse - a child reading "chat" sees t-a-ch - and the check stayed
         green; then made the last tile invisible, so the child sees "ch a", and
         it stayed green again. Both are one-line ships. This sorts the tiles by
         their painted x position and drops anything the child cannot see. */
      const seen = await page.evaluate(() => [...document.querySelectorAll(".wq-tile")]
        .filter((el) => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0
            && r.width > 0 && r.height > 0;
        })
        .sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)
        .map((el) => el.textContent.trim()));
      expect.soft(seen, "the tiles a child SEES, left to right, do not match the word's own split")
        .toEqual(chunkWord(c.word));

      /* A REAL TAP, on the touch profiles, on the one control a child touches
         after the reveal — and it comes LAST, because a tap on "Next word"
         ENDS the reveal. Placed before the tile assertion, as it was when
         first written, it advanced the word and then the assertion measured
         the next word's tiles against this word's split. The tile check went
         red and looked like a game defect; it was the census tripping over its
         own feet. */
      if (viewport.touch) {
        const advance = page.locator(".wq-rail .wq-cta");
        await advance.tap({ scroll: "none", timeout: 5000 });
        await expect.soft(page.locator(".wq-word"), "a tap on “Next word” did not advance")
          .not.toHaveText(c.word, { timeout: 5000 });
      }
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
