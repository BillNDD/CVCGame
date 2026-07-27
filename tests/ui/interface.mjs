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

  /* 6 — advance inert during the 400 ms guard, active after */
  await gradeByKey(page, "✓ got it (hold)", "Enter");
  await page.locator(".wq-tile").first().waitFor();
  const advance = page.locator(".wq-rail .wq-cta");
  const duringGuard = await advance.isDisabled();
  await page.waitForTimeout(600);
  const afterGuard = await advance.isEnabled();
  if (duringGuard && afterGuard) ok("advance control inert during the 400 ms guard, active after");
  else fail("advance guard wrong", `during=${duringGuard} after=${afterGuard}`);
  /* negative control: the same disabled-probe must FAIL now that the guard passed */
  if (await advance.isDisabled()) fail("negative control broken", "disabled-probe still true after the guard");
  else console.log("control OK: the guard probe reads live state (disabled-assert fails after the window)");

  /* 7 — the timing constants are the literal numbers */
  const holdSource = readFileSync("app/src/components/HoldButton.jsx", "utf8");
  if (ADVANCE_GUARD_MS === 400 && holdSource.includes("}, 450)"))
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
    const wordBoxBefore = await page.locator(".wq-word").boundingBox();
    let reached = false;
    for (let i = 0; i < 12 && !reached; i += 1) {
      if (await page.locator(".wq-prompt").count()) { reached = true; break; }
      await gradeByKey(page, "✓ got it (hold)", "Enter");
      await page.waitForTimeout(500);
      const next = page.getByRole("button", { name: /Next word|Finish!/ });
      if (!(await next.count())) break;
      await next.click();
      await page.locator(".wq-word").waitFor();
    }
    if (!reached) fail("no adult-judged word appeared", "walked a whole Level 1 session");
    else {
      const rec = await page.getByRole("button", { name: /Record/ }).count();
      if (rec === 0) ok("an adult-judged word offers no record control");
      else fail("adult-judged word still offered recording", `${rec} controls`);

      const fits = await page.evaluate(() => {
        const slot = document.querySelector(".wq-slot-msg");
        const note = document.querySelector(".wq-parentnote");
        if (!slot || !note) return null;
        return { noteH: note.scrollHeight, slotH: slot.clientHeight, size: getComputedStyle(note).fontSize };
      });
      const wordBoxAfter = await page.locator(".wq-word").boundingBox();
      const moved = !wordBoxAfter || !wordBoxBefore ||
        Math.abs(wordBoxAfter.y - wordBoxBefore.y) > 0.5 || Math.abs(wordBoxAfter.height - wordBoxBefore.height) > 0.5;
      if (!fits) fail("the adult note is missing", "no .wq-parentnote in the slot");
      else if (fits.noteH > fits.slotH) fail("the adult note overflows its slot", `${fits.noteH}px in ${fits.slotH}px`);
      else if (fits.size !== "11.5px") fail("the adult note is not 11.5px", fits.size);
      else if (moved) fail("the word moved on an adult-judged word", JSON.stringify({ wordBoxBefore, wordBoxAfter }));
      else ok(`the adult note fits the slot (${fits.noteH}px in ${fits.slotH}px at ${fits.size}) and the word does not move`);
    }
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
