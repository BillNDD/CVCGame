/* Interface measurement gate (G7). Playwright drives the built app and
   asserts MEASUREMENTS with literal values — never screenshots.
   Checks (docs/testing-gauntlet.md G7):
     1-4  no page scroll in a session at heights 430, 555, 720, 950
     5    the word's bounding box is identical across phases
     6    the advance control is inert for 400 ms, then active
     7    timing constants are the literal numbers 400 and 450
     8    a 150 ms hold does not grade; 9: a 700 ms hold grades
     10   Enter grades directly; 11: Space grades directly
     12   a session starts offline after one online load
   A negative control runs inline: the guard probe re-checked after the window
   must FAIL its disabled-assert, proving the probe reads live state.
   Run: npm run test:ui */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { ADVANCE_GUARD_MS, STORE_KEY } from "../../src/engine.js";

const PORT = 4183;
const URL = `http://localhost:${PORT}/`;
let failures = 0, checks = 0;
const ok = (name) => { checks += 1; console.log(`ok ${checks}: ${name}`); };
const fail = (name, detail) => { failures += 1; console.error(`FAIL: ${name} — ${detail}`); };

if (!process.env.WQ_SKIP_BUILD) execSync("npm --prefix app run build", { stdio: "pipe" });

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: "app", stdio: "ignore", detached: true,
});
const stopServer = () => { try { process.kill(-server.pid); } catch {} };
for (let i = 0; i < 50; i++) {
  try { const r = await fetch(URL); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });

async function startSession(context, viewport) {
  const page = await context.newPage();
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(URL, { waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.locator(".wq-word").waitFor();
  return page;
}
const gradeByKey = async (page, label, key) => {
  const b = page.getByRole("button", { name: label });
  await b.focus();
  await b.press(key);
};

/* 1-4 — no page scroll in a session at four heights, default text size */
for (const height of [430, 555, 720, 950]) {
  const context = await browser.newContext();
  const page = await startSession(context, { width: 390, height });
  const m = await page.evaluate(() => ({
    sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight,
    bs: document.body.scrollHeight, bc: document.body.clientHeight,
  }));
  if (m.sh <= m.ch && m.bs <= m.ch) ok(`no page scroll at 390x${height} (scrollHeight ${m.sh} <= ${m.ch})`);
  else fail(`page scrolls at 390x${height}`, JSON.stringify(m));
  await context.close();
}

/* 5 — the word's box is identical across ready, feedback, and the next ready */
{
  const context = await browser.newContext();
  const page = await startSession(context, { width: 390, height: 720 });
  const word = page.locator(".wq-word");
  const b1 = await word.boundingBox();
  await gradeByKey(page, "✓ got it (hold)", "Enter");
  await page.locator(".wq-tile").first().waitFor();
  const b2 = await word.boundingBox();
  await page.waitForTimeout(500);
  await page.locator(".wq-rail .wq-cta").click();
  await word.waitFor();
  const b3 = await word.boundingBox();
  const same = (a, b) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  // the retry path: a wrong grade re-queues this word three positions later
  const retriedWord = await word.textContent();
  await gradeByKey(page, "↻ not yet (hold)", "Enter");
  await page.locator(".wq-tile").first().waitFor();
  const bWrong = await word.boundingBox();
  let bRetry = null;
  for (let hop = 0; hop < 6; hop++) {
    await page.waitForTimeout(500);
    await page.locator(".wq-rail .wq-cta").click();
    await word.waitFor();
    if ((await word.textContent()) === retriedWord) { bRetry = await word.boundingBox(); break; }
    await gradeByKey(page, "✓ got it (hold)", "Enter");
    await page.locator(".wq-tile").first().waitFor();
  }
  if (same(b1, b2) && same(b1, b3) && same(b1, bWrong) && bRetry && same(b1, bRetry))
    ok(`word box fixed across ready, feedback, wrong, and retry (${b1.x},${b1.y} ${b1.width}x${b1.height})`);
  else fail("word box moved between phases", JSON.stringify({ b1, b2, b3, bWrong, bRetry }));

  /* 6-7 — the advance control waits for the reveal, then comes alive.
     Which rule applies depends on what this browser can actually play, and
     that is measured here rather than assumed: with the recorded pack the
     control waits for the whole reveal (about 5 to 7 seconds), and where the
     pack cannot play — no audio device, a locked context — the app falls back
     to the short guard, whose length nothing can know in advance. Both are
     asserted strictly; the check reports which path ran. Guessing one would
     make this gate flaky on a machine that differs from the last one. */
  await gradeByKey(page, "✓ got it (hold)", "Enter");
  await page.locator(".wq-tile").first().waitFor();
  const advance = page.locator(".wq-rail .wq-cta");
  const duringGuard = await advance.isDisabled();
  await page.waitForTimeout(1500);                 // a word is still being spoken here
  const revealPath = await advance.isDisabled();
  const t0 = Date.now();
  await page.waitForFunction(
    () => { const b = document.querySelector(".wq-rail .wq-cta"); return !!b && !b.disabled; },
    null, { timeout: 12000 },
  ).catch(() => {});
  const waited = 1500 + (Date.now() - t0);
  const live = await advance.isEnabled();
  if (duringGuard && live) ok(`advance control inert while the reveal plays, alive after (${waited} ms, ${revealPath ? "recorded pack" : "fallback guard"})`);
  else fail("advance guard wrong", `during=${duringGuard} live=${live} waited=${waited}`);
  if (revealPath ? waited >= 3000 && waited <= 9000 : waited <= 1600)
    ok(`advance timing matches the path that ran: ${revealPath ? "waited for the word" : "short guard"} at ${waited} ms`);
  else fail("advance timing wrong for the path", `revealPath=${revealPath} waited=${waited}`);
  /* negative control: the same disabled-probe must FAIL now that the guard passed */
  if (await advance.isDisabled()) fail("negative control broken", "disabled-probe still true after the guard");
  else console.log("control OK: the guard probe reads live state (disabled-assert fails after the window)");

  /* 7 — the timing constants are the literal numbers */
  const holdSource = readFileSync("app/src/components/HoldButton.jsx", "utf8");
  if (ADVANCE_GUARD_MS === 400 && holdSource.includes("const HOLD_MS = 450"))
    ok("timing constants literal: ADVANCE_GUARD_MS 400, hold delay 450");
  else fail("timing constants wrong", `guard=${ADVANCE_GUARD_MS}`);

  /* 8-9 — a 150 ms hold does not grade; a 700 ms hold grades */
  await advance.click();
  await page.locator(".wq-word").waitFor();
  const hold = page.getByRole("button", { name: "~ close (hold)" });
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const early = await page.locator(".wq-tile").count();
  if (early === 0) ok("a 150 ms hold does not grade");
  else fail("a 150 ms hold graded", `${early} tiles visible`);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  const fired = await page.locator(".wq-tile").first().isVisible().catch(() => false);
  if (fired) ok("a 700 ms hold grades");
  else fail("a 700 ms hold did not grade", "no tiles");

  /* 10-11 — the keyboard grades directly, no hold */
  await page.waitForTimeout(500);
  await advance.click();
  await page.locator(".wq-word").waitFor();
  await gradeByKey(page, "✓ got it (hold)", "Enter");
  const viaEnter = await page.locator(".wq-tile").first().isVisible().catch(() => false);
  if (viaEnter) ok("Enter grades directly");
  else fail("Enter did not grade", "no tiles");
  await page.waitForTimeout(500);
  await advance.click();
  await page.locator(".wq-word").waitFor();
  await gradeByKey(page, "~ close (hold)", " ");
  const viaSpace = await page.locator(".wq-tile").first().isVisible().catch(() => false);
  if (viaSpace) ok("Space grades directly");
  else fail("Space did not grade", "no tiles");

  /* 13-14 — a word recognition cannot judge fairly (SPEC section 3): no record
     control, and the adult's note must fit the fixed message slot without
     moving the word. Measured, never eyeballed. */
  {
    /* A FRESH session, because this check walks until it meets one of the five
       adult-judged words and the session order is shuffled. Reusing the page
       above left only a partial queue: on a run where no flagged word remained,
       the walk graded to the end, clicked "Finish!", and then waited thirty
       seconds for a word that no longer existed. A gate that fails on the
       luck of a shuffle is worse than no gate at all. */
    const fresh = await startSession(context, { width: 390, height: 844 });
    const wordBoxBefore = await fresh.locator(".wq-word").boundingBox();
    let reached = false;
    for (let i = 0; i < 12 && !reached; i += 1) {
      if (await fresh.locator(".wq-prompt").count()) { reached = true; break; }
      if (!(await fresh.locator(".wq-word").count())) break;   // session over: stop, never wait
      await gradeByKey(fresh, "✓ got it (hold)", "Enter");
      await fresh.waitForTimeout(500);
      const next = fresh.getByRole("button", { name: /Next word|Finish!/ });
      if (!(await next.count())) break;
      await next.click();
      await fresh.waitForTimeout(200);
    }
    if (!reached) fail("no adult-judged word appeared", "walked a whole Level 1 session");
    else {
      const rec = await fresh.getByRole("button", { name: /Record/ }).count();
      if (rec === 0) ok("an adult-judged word offers no record control");
      else fail("adult-judged word still offered recording", `${rec} controls`);

      const fits = await fresh.evaluate(() => {
        const slot = document.querySelector(".wq-slot-msg");
        const note = document.querySelector(".wq-parentnote");
        if (!slot || !note) return null;
        return { noteH: note.scrollHeight, slotH: slot.clientHeight, size: getComputedStyle(note).fontSize };
      });
      const wordBoxAfter = await fresh.locator(".wq-word").boundingBox();
      const moved = !wordBoxAfter || !wordBoxBefore ||
        Math.abs(wordBoxAfter.y - wordBoxBefore.y) > 0.5 || Math.abs(wordBoxAfter.height - wordBoxBefore.height) > 0.5;
      if (!fits) fail("the adult note is missing", "no .wq-parentnote in the slot");
      else if (fits.noteH > fits.slotH) fail("the adult note overflows its slot", `${fits.noteH}px in ${fits.slotH}px`);
      else if (fits.size !== "11.5px") fail("the adult note is not 11.5px", fits.size);
      else if (moved) fail("the word moved on an adult-judged word", JSON.stringify({ wordBoxBefore, wordBoxAfter }));
      else ok(`the adult note fits the slot (${fits.noteH}px in ${fits.slotH}px at ${fits.size}) and the word does not move`);
    }
    await fresh.close();
  }

  /* 18 — the wait is visible. While the advance control is inert a fill crosses
     it, and the fill's width has to be measurably further along later in the
     wait than earlier. The width is read from the running animation in the
     browser, which is the only place this can be checked at all. A negative
     control follows: with the animation switched off, the same probe must
     report no growth. */
  {
    const context = await browser.newContext();
    const page = await startSession(context, { width: 390, height: 844 });
    const readFill = () => page.evaluate(() => {
      const f = document.querySelector(".wq-rail .wq-ctafill");
      if (!f) return null;
      const b = document.querySelector(".wq-rail .wq-cta").getBoundingClientRect();
      const d = getComputedStyle(f).animationDuration;
      return { w: f.getBoundingClientRect().width, full: b.width, ms: d,
               msNum: d.endsWith("ms") ? parseFloat(d) : parseFloat(d) * 1000 };
    });
    /* Sample INSIDE the wait, whatever the wait turns out to be. The wait is
       the reveal's own length where a recorded reveal plays, and the 400 ms
       guard where none can. Fixed 400/1200 ms sleeps assumed the long case and
       read past the end of the short one, so this check failed under load and
       passed on a re-run — a gate nobody could trust. */
    await gradeByKey(page, "✓ got it (hold)", "Enter");
    await page.locator(".wq-tile").first().waitFor();
    await page.locator(".wq-rail .wq-ctafill").waitFor({ timeout: 5000 });
    const early = await readFill();
    await page.waitForTimeout(Math.max(120, Math.min(1200, (early?.msNum || 400) * 0.5)));
    const later = await readFill();
    if (!early || !later) fail("no fill on the inert advance control", JSON.stringify({ early, later }));
    else if (!(later.w > early.w + 5)) fail("the fill does not move during the wait", JSON.stringify({ early, later }));
    else if (later.w > later.full) fail("the fill runs past the control", JSON.stringify(later));
    else ok(`the wait shows a fill that moves (${early.w.toFixed(0)}px then ${later.w.toFixed(0)}px of ${later.full.toFixed(0)}px, over ${later.ms})`);

    /* negative control: no animation, so the probe must see a still fill */
    await page.addStyleTag({ content: ".wq-root .wq-ctafill{animation:none!important}" });
    await page.waitForFunction(() => { const b = document.querySelector(".wq-rail .wq-cta"); return !!b && !b.disabled; }, null, { timeout: 12000 }).catch(() => {});
    await page.locator(".wq-rail .wq-cta").click();
    await page.locator(".wq-word").waitFor();
    await gradeByKey(page, "✓ got it (hold)", "Enter");
    await page.locator(".wq-tile").first().waitFor();
    await page.locator(".wq-rail .wq-ctafill").waitFor({ timeout: 5000 }).catch(() => {});
    const stillEarly = await readFill();
    await page.waitForTimeout(Math.max(120, Math.min(1200, (stillEarly?.msNum || 400) * 0.5)));
    const stillLater = await readFill();
    if (stillEarly && stillLater && stillLater.w > stillEarly.w + 5)
      fail("negative control broken", `the fill moved with its animation switched off: ${JSON.stringify({ stillEarly, stillLater })}`);
    else console.log("control OK: the probe reads the running animation (a fill with no animation does not move)");
    await context.close();
  }

  /* 15-16 — landscape keeps one centred column. The tile row explains the word
     above it, so its centre has to be the word's centre; the same goes for the
     feedback sentence. The tiles are measured by their OWN extent, from the left
     edge of the first to the right edge of the last, because the row that holds
     them is full width and its centre stays put even when the tiles inside it
     are pushed to one side — which is exactly the fault this check exists for.
     A negative control follows: the old two-column rules are injected and the
     same probe must report the tiles off centre. */
  for (const vp of [{ width: 1280, height: 800 }, { width: 1080, height: 810 }]) {
    const context = await browser.newContext();
    const page = await startSession(context, vp);
    const wordBefore = await page.locator(".wq-word").boundingBox();
    await gradeByKey(page, "✓ got it (hold)", "Enter");
    await page.locator(".wq-tile").first().waitFor();
    const probe = () => page.evaluate(() => {
      const mid = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
      const tiles = [...document.querySelectorAll(".wq-tile")];
      const msg = document.querySelector(".wq-slot-msg p");
      const first = tiles[0].getBoundingClientRect();
      const last = tiles[tiles.length - 1].getBoundingClientRect();
      return {
        word: mid(document.querySelector(".wq-word")),
        tiles: (first.left + last.right) / 2,
        msg: msg ? mid(msg) : null,
        stage: getComputedStyle(document.querySelector(".wq-stagegrid")).display,
      };
    });
    const m = await probe();
    const wordAfter = await page.locator(".wq-word").boundingBox();
    const dTiles = Math.abs(m.tiles - m.word), dMsg = m.msg === null ? Infinity : Math.abs(m.msg - m.word);
    const still = Math.abs(wordAfter.x - wordBefore.x) <= 0.5 && Math.abs(wordAfter.y - wordBefore.y) <= 0.5;
    if (m.stage === "grid") fail(`landscape stage is a grid at ${vp.width}x${vp.height}`, m.stage);
    else if (dTiles > 1) fail(`landscape tiles off the word's centre at ${vp.width}x${vp.height}`, `${dTiles.toFixed(1)}px`);
    else if (dMsg > 1) fail(`landscape sentence off the word's centre at ${vp.width}x${vp.height}`, `${dMsg}`);
    else if (!still) fail(`the word moved between phases in landscape at ${vp.width}x${vp.height}`, JSON.stringify({ wordBefore, wordAfter }));
    else ok(`landscape ${vp.width}x${vp.height}: word, tiles and sentence share one centre (${dTiles.toFixed(1)}px, ${dMsg.toFixed(1)}px apart) and the word holds still`);

    /* negative control: the rules this change removed, put back for one probe.
       Each selector carries a .wq-root prefix it did not need in the stylesheet.
       The app renders its sheet inside the page body, so a tag appended to the
       head loses every tie — max-width and justify-content silently kept the
       app's values and the control passed while measuring nothing. The extra
       ancestor makes the injected rules win on specificity instead of order. */
    await page.addStyleTag({ content: `@media (orientation:landscape) and (min-width:640px) and (min-height:420px){
      .wq-root .wq-stagegrid{max-width:820px;display:grid;grid-template-columns:1.1fr 1fr;gap:26px}
      .wq-root .wq-slot-tiles,.wq-root .wq-slot-msg{justify-content:flex-start;align-items:flex-start;text-align:left}}` });
    const bad = await probe();
    if (Math.abs(bad.tiles - bad.word) > 1) console.log(`control OK: the probe reads real geometry (the old grid puts the tiles ${Math.abs(bad.tiles - bad.word).toFixed(0)}px off centre)`);
    else fail("negative control broken", `the old two-column rules measured as centred: ${JSON.stringify(bad)}`);
    await context.close();
  }

  /* 17 — the control floors, MEASURED. Safety rule S7 says child controls are
     56 px or more and adult controls 44 px or more. tests/safety.test.js
     proves the stylesheet CONTAINS those rules, which is a different claim: a
     control can carry min-height:56px and still render shorter inside a flex
     parent that shrinks it, under a transform, or below a later rule that
     wins. This measures what a thumb actually meets, on every screen the
     child and the grown-up can reach, at three shapes.
     A negative control follows: a rule that shrinks the controls is injected
     and the same probe must report them under the floor. */
  {
    const measure = (page) => page.evaluate(() => {
      const out = [];
      for (const [sel, floor, who] of [[".wq-cta", 56, "child"], [".wq-sbtn", 44, "adult"]]) {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;      // not rendered
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          out.push({ who, floor, h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10,
                     name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28) });
        }
      }
      return out;
    });
    const short = (list) => list.filter((c) =>
      c.h + 0.5 < c.floor || (c.who === "adult" && c.w + 0.5 < c.floor));

    for (const vp of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.setViewportSize(vp);
      await page.goto(URL, { waitUntil: "load" });
      await page.getByRole("button", { name: "▶️ Begin Session" }).waitFor();
      const seen = [];
      seen.push(...await measure(page));                        // home, with the grown-up strip
      await page.getByRole("button", { name: "▶️ Begin Session" }).click();
      await page.locator(".wq-word").waitFor();
      seen.push(...await measure(page));                        // session, ready phase
      await gradeByKey(page, "✓ got it (hold)", "Enter");
      await page.locator(".wq-tile").first().waitFor();
      seen.push(...await measure(page));                        // session, feedback phase
      const tooSmall = short(seen);
      /* PER CLASS, not a total. A single total let the 56 px child floor
         measure NOTHING while eleven adult controls cleared the guard: if
         .wq-cta stopped matching after a rename, the gate still printed
         "all render at or above their floor". Caught by review 2026-08-10.
         Real counts across the three screens are 4 child and 11 adult. */
      const nChild = seen.filter((c) => c.who === "child").length;
      const nAdult = seen.filter((c) => c.who === "adult").length;
      if (nChild < 3 || nAdult < 6)
        fail(`too few controls measured at ${vp.width}x${vp.height}`, `child=${nChild} adult=${nAdult} (need 3 and 6)`);
      else if (tooSmall.length) fail(`a control renders under its floor at ${vp.width}x${vp.height}`, JSON.stringify(tooSmall.slice(0, 4)));
      else ok(`${vp.width}x${vp.height}: ${nChild} child and ${nAdult} adult controls all render at or above their floor (smallest ${Math.min(...seen.map((c) => c.h))}px tall)`);

      /* negative control: shrink both control classes and re-measure */
      await page.addStyleTag({ content: ".wq-root .wq-cta{min-height:40px!important;padding:2px!important}"
        + ".wq-root .wq-sbtn{min-height:30px!important;min-width:30px!important;padding:0!important}" });
      const shrunk = short(await measure(page));
      /* BOTH classes must be caught: a control that only ever proved the
         adult rule would leave the child rule unproven. */
      const shrunkChild = shrunk.filter((c) => c.who === "child").length;
      const shrunkAdult = shrunk.filter((c) => c.who === "adult").length;
      if (shrunkChild > 0 && shrunkAdult > 0)
        console.log(`control OK: the probe reads rendered size (${shrunkChild} child and ${shrunkAdult} adult controls fall under the floor when the CSS shrinks them)`);
      else fail("negative control broken", `shrunken controls still measured at or above the floor at ${vp.width}x${vp.height} (child=${shrunkChild} adult=${shrunkAdult})`);
      await context.close();
    }
  }

  /* 18 — tablet portrait. A 768-wide portrait screen is the one common shape
     nothing measured: the phone checks run at 390 and the landscape checks at
     1280 and 1080 wide. The layout is one centred column at every size, so the
     tablet must show the tiles and the sentence on the word's centre, must not
     scroll the page, and must not overflow sideways. */
  {
    const context = await browser.newContext();
    const page = await startSession(context, { width: 768, height: 1024 });
    const before = await page.locator(".wq-word").boundingBox();
    await gradeByKey(page, "✓ got it (hold)", "Enter");
    await page.locator(".wq-tile").first().waitFor();
    const m = await page.evaluate(() => {
      const mid = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
      const tiles = [...document.querySelectorAll(".wq-tile")];
      const msg = document.querySelector(".wq-slot-msg p");
      const first = tiles[0].getBoundingClientRect(), last = tiles[tiles.length - 1].getBoundingClientRect();
      const d = document.documentElement;
      return {
        word: mid(document.querySelector(".wq-word")),
        tiles: (first.left + last.right) / 2,
        msg: msg ? mid(msg) : null,
        vScroll: d.scrollHeight - d.clientHeight,
        hScroll: d.scrollWidth - d.clientWidth,
      };
    });
    const after = await page.locator(".wq-word").boundingBox();
    const dTiles = Math.abs(m.tiles - m.word), dMsg = m.msg === null ? Infinity : Math.abs(m.msg - m.word);
    const still = Math.abs(after.x - before.x) <= 0.5 && Math.abs(after.y - before.y) <= 0.5;
    if (m.hScroll > 0) fail("tablet portrait overflows sideways", `${m.hScroll}px`);
    else if (m.vScroll > 0) fail("tablet portrait scrolls the page", `${m.vScroll}px`);
    else if (dTiles > 1) fail("tablet portrait tiles off the word's centre", `${dTiles.toFixed(1)}px`);
    else if (dMsg > 1) fail("tablet portrait sentence off the word's centre", `${dMsg}`);
    else if (!still) fail("the word moved between phases on tablet portrait", JSON.stringify({ before, after }));
    else ok(`tablet portrait 768x1024: one centred column, no page scroll, the word holds still (${dTiles.toFixed(1)}px, ${dMsg.toFixed(1)}px apart)`);
    await context.close();
  }

  /* 12 — a session starts offline after one online load */
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload({ waitUntil: "load" }); // online reload -> the page is SW-controlled
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  const offlineHome = await page.getByRole("button", { name: "Begin Session" })
    .waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
  if (!offlineHome) fail("offline session failed", "home did not load offline");
  else {
    await page.getByRole("button", { name: "Begin Session" }).click();
    const offlineWord = await page.locator(".wq-word").isVisible().catch(() => false);
    if (offlineWord) ok("a session starts offline after one online load");
    else fail("offline session failed", "word not visible");
  }
  await context.close();
}

/* The word sits at the stage's visual centre — the owner's pick from four
   measured candidates (2026-08-03). On a phone-sized stage the midline lands
   within a point of 50 percent; short stages degrade gracefully and are
   covered by the no-scroll checks above. Phase stability is check 5's job. */
{
  const context = await browser.newContext();
  const page = await startSession(context, { width: 390, height: 844 });
  const pct = await page.evaluate(() => {
    const st = document.querySelector(".wq-stage").getBoundingClientRect();
    const w = document.querySelector(".wq-word").getBoundingClientRect();
    return (w.top + w.height / 2 - st.top) / st.height * 100;
  });
  if (pct >= 48 && pct <= 52) ok(`the word sits at the stage centre (midline ${pct.toFixed(1)}% at 390x844)`);
  else fail("the word is off the stage centre", `midline at ${pct.toFixed(1)}% (want 48-52)`);
  await context.close();
}

/* 13-15 (A1-005) — a toast must clear the child's own control. The offset was
   a magic 112 px, which is not the height of anything: on a phone the toast
   covered the record control by 27 px and hid its label, and on iPad portrait
   by 3 px. The toast is raised by a real boot here — a stored value that is
   not valid JSON is read as damaged, and the app says so — and measured
   against the live rail control at three real device sizes. */
{
  const storageSrc = readFileSync("app/src/storage.js", "utf8");
  const dbName = storageSrc.match(/DB_NAME = "([^"]+)"/)[1];
  const dbStore = storageSrc.match(/DB_STORE = "([^"]+)"/)[1];
  const SIZES = [{ width: 390, height: 844 }, { width: 810, height: 1080 }, { width: 1280, height: 800 }];
  for (const vp of SIZES) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize(vp);
    await page.goto(URL, { waitUntil: "load" });
    /* Let the boot finish before seeding: the app writes a fresh save of its
       own on first load, and that write lands on top of an early seed. */
    await page.getByRole("button", { name: "Begin Session" }).waitFor();
    await page.evaluate(([db, store, key]) => new Promise((resolve, reject) => {
      const rq = indexedDB.open(db, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(store);
      rq.onsuccess = () => {
        const tx = rq.result.transaction(store, "readwrite");
        tx.objectStore(store).put("{not json at all", key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      };
      rq.onerror = () => reject(rq.error);
    }), [dbName, dbStore, STORE_KEY]);
    await page.reload({ waitUntil: "load" });
    const shown = await page.locator(".wq-toast").waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
    if (!shown) { fail(`no toast at ${vp.width}x${vp.height}`, "the damaged-save boot raised none"); await context.close(); continue; }
    const t = await page.locator(".wq-toast").boundingBox();
    /* The home rail holds two child controls — Begin Session and Free play —
       and the toast must clear them BOTH, so the worst overlap is the verdict.
       An empty or unmeasurable rail must FAIL, never pass vacuously: a
       measurement of zero controls proves nothing about the toast. */
    const boxes = [];
    for (const btn of await page.locator(".wq-rail .wq-cta").all()) boxes.push(await btn.boundingBox());
    if (boxes.length !== 2 || boxes.some((b) => !b)) {
      fail(`the home rail did not offer two measurable child controls at ${vp.width}x${vp.height}`, `measured ${boxes.length}`);
    } else {
      let overlap = -Infinity;
      for (const c of boxes) overlap = Math.max(overlap, Math.min(t.y + t.height, c.y + c.height) - Math.max(t.y, c.y));
      if (overlap <= 0) ok(`the toast clears both child controls at ${vp.width}x${vp.height} (gap ${Math.round(-overlap)}px)`);
      else fail(`the toast covers a child control at ${vp.width}x${vp.height}`, `overlap ${Math.round(overlap)}px`);
    }
    await context.close();
  }
}

/* 16-17 (A3-014) — the dashed form is the teaching payload of the feedback
   sentence and never breaks across a line: "sh-i-" on one row and "p, ship."
   on the next reads as two fragments, not one word split into its sounds.
   Check the rule reaches the element in the BUILT sheet — ten rules in this
   stylesheet once did not — then a negative control proving the measurement
   can see a wrap at all. */
{
  const context = await browser.newContext();
  const page = await startSession(context, { width: 390, height: 720 });
  await gradeByKey(page, "✓ got it (hold)", "Enter");
  await page.locator(".wq-dashed").waitFor();
  const dashed = page.locator(".wq-dashed");
  const ws = await dashed.evaluate((el) => getComputedStyle(el).whiteSpace);
  if (ws === "nowrap") ok("the dashed form computes white-space: nowrap in the built app");
  else fail("the dashed form may break across lines", `white-space: ${ws}`);
  const probe = await dashed.evaluate((el) => {
    const copy = el.cloneNode(true);
    copy.textContent = "sh-i-p-sh-i-p-sh-i-p-sh-i-p-sh-i-p";
    copy.style.whiteSpace = "normal";
    el.parentNode.appendChild(copy);
    const wrapped = copy.getClientRects().length;
    copy.style.whiteSpace = "nowrap";
    const held = copy.getClientRects().length;
    copy.remove();
    return { wrapped, held };
  });
  if (probe.wrapped > 1 && probe.held === 1)
    ok(`negative control: the same text takes ${probe.wrapped} rows without the rule and 1 with it`);
  else fail("the wrap measurement is blind", JSON.stringify(probe));
  await context.close();
}

/* The free-play chooser: between the tap and the game, a grown-up chooses
   truly random or the child's level. Both choices are child-sized (S7), Back
   starts nothing, and truly random enters an endless session that says what
   it is — FREE PLAY with the dice chip, never a level number it is not
   serving. */
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto(URL, { waitUntil: "load" });
  await page.getByRole("button", { name: "Free play" }).click();
  await page.locator(".wq-modal").waitFor();
  const rand = await page.getByRole("button", { name: "Truly random" }).boundingBox();
  const lvl = await page.getByRole("button", { name: /Level \d+ .+ words/ }).boundingBox();
  if (rand && lvl && rand.height >= 56 && lvl.height >= 56)
    ok(`both free-play choices are child-sized (${Math.round(rand.height)}px and ${Math.round(lvl.height)}px)`);
  else fail("a free-play choice is under 56 px", JSON.stringify({ rand, lvl }));
  /* A choice must LOOK like a control on the white card. The first cut of the
     level choice was white on white with no border and no shadow — a line of
     floating text — and nothing measured it. Now something does: each choice
     needs a background that differs from the card, a border of 2 px or more,
     or a real shadow. */
  const bounded = await page.evaluate(() => {
    const card = document.querySelector(".wq-modal");
    const cardBg = getComputedStyle(card).backgroundColor;
    return [...card.querySelectorAll(".wq-cta")].map((b) => {
      const s = getComputedStyle(b);
      return { bg: s.backgroundColor, border: parseFloat(s.borderTopWidth) || 0, shadow: s.boxShadow, cardBg };
    });
  });
  if (bounded.length === 2 && bounded.every((d) => d.bg !== d.cardBg || d.border >= 2 || d.shadow !== "none"))
    ok("both free-play choices are visibly bounded on the card");
  else fail("a free-play choice melts into the card", JSON.stringify(bounded));
  await page.getByRole("button", { name: "Back" }).click();
  const home = await page.getByRole("button", { name: "Begin Session" }).isVisible();
  const modals = await page.locator(".wq-modal").count();
  if (home && modals === 0) ok("Back closes the chooser and starts nothing");
  else fail("Back did not return cleanly to home", `home=${home} modals=${modals}`);
  await page.getByRole("button", { name: "Free play" }).click();
  await page.getByRole("button", { name: "Truly random" }).click();
  await page.locator(".wq-word").waitFor();
  const label = await page.locator(".wq-chip", { hasText: "FREE PLAY" }).count();
  const dice = await page.locator(".wq-chip", { hasText: "🎲" }).count();
  if (label === 1 && dice === 1) ok("truly random play is labeled FREE PLAY with the dice chip");
  else fail("random free play mislabels itself", `freeplay=${label} dice=${dice}`);
  await context.close();
}

await browser.close();
stopServer();
console.log(`\nG7 interface gate: ${checks} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
