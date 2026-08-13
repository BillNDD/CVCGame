/* THE DEEP UX CENSUS — one test per layout class, per viewport.
 *
 * 44 words covering all 29 layout-risk classes in the bank, across 8 device
 * profiles: 416 cells from this file — 44 word cases, 3 screen cases and 5
 * state cases, each on 8 profiles — and 41 more from the controls, which run
 * on one. The control count in that sentence is asserted in
 * tests/census/controls.spec.mjs rather than typed and trusted: it read "9 more
 * from the controls" while 18 ran, which is how a document stops describing the
 * thing it names.
 *
 * THE PROFILES ARE REAL DEVICES (build spec item 2), so the heights are what a
 * page actually gets after browser chrome — an iPhone 13 gives 390x664, not the
 * 390x844 this census asserted against for its first two days.
 *
 * A word cell stages a NAMED word through the app's own free-play chooser,
 * checks the prompt, grades it the way a grown-up does, and checks the reveal.
 * Both states are inspected for the whole list in one pass. The five state
 * cells (build spec item 3) reach what a word never does: the close and wrong
 * reveals, a toast, the done screen, and the update row.
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
import { cases, inspect, stage, holdGrade, savedState, VIEWPORTS, requireStaged,
         waitForReveal, GRADE } from "../../tools/ux-census.mjs";

const CASES = cases();
/* NOT A LITERAL FALLBACK. This read `baseURL || "http://localhost:4187/"`, and
   with the port now a parameter that literal would have quietly declared every
   same-origin request off-host — an S6 finding against an app that had done
   nothing wrong. A missing baseURL is a broken config, so it says so. */
const baseURL = (testInfo) => {
  const url = testInfo.project.use.baseURL;
  if (!url) throw new Error("the census project declares no baseURL, so no request can be judged same-origin");
  return url;
};
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
    const { findings, aria, unclassified, covered } = await inspect(page, viewport, which, { mustBeVisible: mustBeVisible || undefined, mustExist, axe: true });
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

/* ITEM 3 — THE STATES A WORD NEVER REACHES.
   The census saw the prompt and the correct reveal and nothing else. These are
   the five it could not: the two reveals a child meets when the reading did NOT
   go well, the screen a child reaches by finishing, and the one row in the app
   that touches the network. */

/* The close and the wrong reveals. SPEC section 5's own sentences live here,
   they are the longest child-facing text in the game, and S3 requires a miss to
   read as an invitation rather than a failure — which is exactly the text that
   wraps under a control on a 320px phone and which nothing had ever measured. */
for (const grade of ["close", "wrong"]) {
  test(`state: ${grade} reveal`, async ({ page }, testInfo) => {
    const viewport = VP[testInfo.project.name];
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });

    /* "chat" is a four-tile word with a digraph: the widest tile row the bank
       can make, so if a reveal wraps anywhere it wraps here. */
    const { shown } = await stage(page, viewport, "chat", null, { url: "/" });
    requireStaged("chat", shown);
    const before = await savedState(page);

    const findings = [];
    const held = await holdGrade(page, GRADE[grade], findings);
    for (const f of findings) expect.soft(f, `[grading] ${f.kind}: ${f.detail}`).toBeUndefined();
    expect.soft(held, `the "${GRADE[grade]}" control could not be held where it sits`).toBe(true);
    if (!held) return;

    await waitForReveal(page);
    const reveal = await inspect(page, viewport, `reveal-${grade}`, {
      expectFocus: true, axe: true,
      expectTiles: chunkWord("chat").length,
      mustBeVisible: [".wq-word", ".wq-tile", ".wq-rail .wq-cta"],
    });
    await testInfo.attach("aria", { body: reveal.aria, contentType: "text/plain" });
    for (const f of reveal.findings) expect.soft(f, `[${grade}] ${f.kind}: ${f.detail}`).toBeUndefined();

    /* S3: a miss is an invitation to try again, never a failure message. The
       census does not police the WORDS — tools/copy-lint.mjs owns those, with
       the exact sentences — it requires that there IS one and that it lands
       where a child can read it. A reveal with an empty message slot means the
       state rendered without its own point, and every geometry check above
       would have passed over nothing.

       IT READS .wq-slot-msg, NOT THE WHOLE STAGE. The first version measured
       the stage's total text against a length I had guessed at, and a plant
       that emptied the sentence entirely sailed through it: the word and its
       tiles are text too, so the stage was never short enough to trip. A
       threshold nobody measured is decoration with a number on it. */
    const msg = page.locator(".wq-slot-msg");
    const said = (await msg.innerText()).replace(/\s+/g, " ").trim();
    expect.soft(said, `the ${grade} reveal put no sentence in the message slot`).not.toBe("");
    /* toBeInViewport with a ratio (build spec item 4), where an assertion
       belongs — rather than the hand-rolled box comparison inspect() uses for
       the things it merely reports. */
    await expect.soft(msg, `the ${grade} reveal's sentence is not on the screen a child is looking at`)
      .toBeInViewport({ ratio: 0.9 });

    expect.soft(await savedState(page), "free play changed the saved progress").toBe(before);
    expect.soft(errors, "the page reported errors").toEqual([]);
  });
}

/* A TOAST, ACTUALLY ON THE SCREEN. The report-only channel that says what a
   toast covers was written on 2026-08-13 with a comment claiming that "All
   progress cleared." and "Log copied" fire from the grown-ups corner, "which
   the census inspects". An auditor read the attachments of every screen cell
   and found the channel dead in all 376: <Toast> renders only after Copy log,
   a reset, a level jump or a backup, and no cell pressed any of them. The
   comment it replaced had been honest — "No census cell provokes a toast
   today" — so the fix had turned a true caveat into a false claim. This cell
   is what makes the claim true. */
test("state: a toast over the grown-ups corner", async ({ page }, testInfo) => {
  const viewport = VP[testInfo.project.name];
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });

  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "Grown-ups corner" }).click({ timeout: 8000 });
  await page.getByRole("button", { name: /Copy log/ }).click({ timeout: 8000 });
  await page.locator(".wq-toast").waitFor({ timeout: 8000 });
  /* BACK TO THE TOP BEFORE MEASURING. Playwright scrolls a control into view
     to click it, and the "Grown-ups corner" is a long scrolling page — so the
     first version of this cell measured it mid-scroll and reported two things
     that are not defects: a level row whose centre had passed under the sticky
     header, and that header overlapping the content behind it. Every other
     screen cell in this file measures a screen at its top, and a scrolled page
     is a different measurement, not a worse one. What the census does NOT yet
     know is how to judge a screen a parent has scrolled — content under a
     sticky header is by design, and telling that apart from content buried by
     one is a rule nobody has written. It is recorded in docs/open-faults.md
     rather than papered over here. */
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll("*")) if (el.scrollTop) el.scrollTop = 0;
  });
  await page.waitForTimeout(150);

  /* NOT NAMED `shown`. The control that forbids softening the staging refusal
     greps this file for a soft assertion carrying that identifier, and a local
     of that name in an unrelated cell trips it — as did the first version of
     THIS comment, which quoted the forbidden pattern verbatim and so tripped
     the guard by explaining it. The guard is right to be crude; the variable
     and the sentence both moved. */
  const toast = await inspect(page, viewport, "toast", { mustBeVisible: [".wq-toast"], axe: true });
  for (const f of toast.findings) expect.soft(f, `[toast] ${f.kind}: ${f.detail}`).toBeUndefined();
  /* The channel must have something in it. A report-only channel nobody can
     reach is the same as no channel, and it took an auditor to notice. */
  await testInfo.attach("what a toast covered", { body: toast.covered.join("\n") || "(nothing)", contentType: "text/plain" });
  expect.soft(toast.covered.length,
    "a toast is on the screen and the channel that says what it covers is empty — it is unreachable again")
    .toBeGreaterThan(0);
  expect.soft(toast.findings.map((f) => f.kind), "a toast floating over content was asserted as a collision")
    .not.toContain("overlap");
  expect.soft(errors, "the page reported errors").toEqual([]);
});

/* The done screen. A REAL session, because free play never ends — so this is
   the one cell in the file that is meant to write, and the only one that does
   not assert the saved progress is unchanged. */
test("state: done screen", async ({ page }, testInfo) => {
  const viewport = VP[testInfo.project.name];
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });

  await page.goto("/", { waitUntil: "load" });
  await page.getByRole("button", { name: "▶️ Begin Session" }).click({ timeout: 8000 });
  await page.locator(".wq-word").waitFor({ timeout: 8000 });

  /* One word read, because "Save as a short session" is disabled at zero — the
     app refuses to record a session nobody read, which is S1 doing its job and
     is why this route needs a grade at all. */
  const findings = [];
  const held = await holdGrade(page, GRADE.correct, findings);
  for (const f of findings) expect.soft(f, `[grading] ${f.kind}: ${f.detail}`).toBeUndefined();
  expect.soft(held, "the session could not be graded, so the done screen was never reached").toBe(true);
  if (!held) return;
  await waitForReveal(page);

  await page.getByRole("button", { name: "Leave session" }).click({ timeout: 5000 });
  await page.getByRole("button", { name: /Save .* as a short session|Save as a short session/ })
    .click({ timeout: 5000 });

  const done = await inspect(page, viewport, "done", {
    mustBeVisible: ['button:has-text("Home")'], axe: true,
  });
  await testInfo.attach("aria", { body: done.aria, contentType: "text/plain" });
  for (const f of done.findings) expect.soft(f, `[done] ${f.kind}: ${f.detail}`).toBeUndefined();
  expect.soft(errors, "the page reported errors").toEqual([]);
});

/* The update row, in both of its states. This is the ONE place in the app a
   parent can reach the network (S6), it is on the child's screen, and until now
   no census cell had ever looked at it. The newer version is served by
   intercepting the app's own same-origin request, so "⬆️ Update now" — a
   control that restarts the app and which a census has never seen rendered —
   is measured without anything being published anywhere. */
test("state: update row, before and after a check", async ({ page }, testInfo) => {
  const viewport = VP[testInfo.project.name];
  const offsite = [];
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(baseURL(testInfo)) && !u.startsWith("data:")) offsite.push(u);
  });
  await page.route("**/version.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ version: "99.0.0", build: "census-fixture" }) }));

  await page.goto("/", { waitUntil: "load" });
  const idle = await inspect(page, viewport, "update-row idle", {
    mustBeVisible: ['button[aria-label="↻ Check for updates (hold)"]'],
  });
  for (const f of idle.findings) expect.soft(f, `[update idle] ${f.kind}: ${f.detail}`).toBeUndefined();

  /* The 450 ms adult hold (S5), given the way a grown-up gives it. */
  const findings = [];
  const held = await holdGrade(page, "↻ Check for updates (hold)", findings);
  for (const f of findings) expect.soft(f, `[update] ${f.kind}: ${f.detail}`).toBeUndefined();
  expect.soft(held, "the update check could not be held where it sits").toBe(true);
  if (!held) return;

  const apply = page.getByRole("button", { name: "⬆️ Update now (hold)" });
  await apply.waitFor({ timeout: 8000 });
  const ready = await inspect(page, viewport, "update-row ready", {
    mustBeVisible: ['button[aria-label="⬆️ Update now (hold)"]'], axe: true,
  });
  await testInfo.attach("aria", { body: ready.aria, contentType: "text/plain" });
  for (const f of ready.findings) expect.soft(f, `[update ready] ${f.kind}: ${f.detail}`).toBeUndefined();
  /* S6 holds even here: the version check is same-origin and nothing else is. */
  expect.soft(offsite, "the update check reached off the app's own host (S6)").toEqual([]);
});

for (const c of CASES) {
  test(`${c.word} — ${c.sig} (${c.why}, ${c.size} in class)`, async ({ page, context }, testInfo) => {
    const viewport = VP[testInfo.project.name];
    const errors = [];
    const offsite = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
    page.on("request", (r) => {
      const u = r.url();
      if (!u.startsWith(baseURL(testInfo)) && !u.startsWith("data:")) offsite.push(u);
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
      /* The double-arming wait now lives in tools/ux-census.mjs, because item 3
         added three more states that must wait the same way and a wait that is
         copied is a wait that drifts. */
      await waitForReveal(page);
      const reveal = await inspect(page, viewport, "reveal-correct", {
        expectFocus: true, axe: true,
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
