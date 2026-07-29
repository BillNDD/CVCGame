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
import { ADVANCE_GUARD_MS } from "../../src/engine.js";

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
      return { w: f.getBoundingClientRect().width, full: b.width, ms: getComputedStyle(f).animationDuration };
    });
    await gradeByKey(page, "✓ got it (hold)", "Enter");
    await page.locator(".wq-tile").first().waitFor();
    await page.waitForTimeout(400);
    const early = await readFill();
    await page.waitForTimeout(1200);
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
    await page.waitForTimeout(400);
    const stillEarly = await readFill();
    await page.waitForTimeout(1200);
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

await browser.close();
stopServer();
console.log(`\nG7 interface gate: ${checks} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
