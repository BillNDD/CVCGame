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
/* How many sentences this walk actually met. Counted rather than assumed:
   `pressNext` swallows the extra press a sentence needs, and a helper that
   silently absorbs the sentence would silently absorb its disappearance. */
let sentencesMet = 0;

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
/* Press for the next word, and press again if a SENTENCE takes the press.
   A sentence arrives after every fifth word read (SPEC section 12 point 2)
   and its own control carries the same "Next word" label, so any walk through
   a session meets one — exactly as a grown-up does.

   THIS GATE FOUND THE SENTENCE THE HARD WAY, and the arithmetic is worth
   keeping. Check 5 records four first results before check 6 begins, check 6's
   grade is a RETRY of an already-graded word so it adds none, and the close
   grade at check 12 is the fifth. The very next press was therefore the first
   sentence of the session, `.wq-word` left the screen as designed, and this
   gate sat waiting thirty seconds for a word that was never coming. The app
   was right and the walk was out of date.

   It RETURNS whether a sentence appeared, and the caller counts them, because
   a helper that silently absorbs the sentence would also silently absorb its
   disappearance. */
const pressNext = async (page) => {
  await page.locator(".wq-rail .wq-cta").click();
  if (await page.locator(".wq-sentence").isVisible().catch(() => false)) {
    /* THE SENTENCE NOW HAS AN ATTEMPT PHASE (owner-ruled 2026-08-14, fixing
       open-faults N): it arrives silent with NO advance control — the rail
       carries the prompt, and the only way forward is the grown-up's mark,
       exactly as a grown-up at a real screen. So this walk marks it correct
       by keyboard (S5) and then presses the reveal's always-live advance.
       The first version of this helper pressed a second time and waited on a
       control the attempt deliberately does not have. */
    await gradeByKey(page, "✓ got it (hold)", "Enter");
    await page.locator(".wq-rail .wq-cta").click();
    await page.locator(".wq-word").waitFor();
    return true;
  }
  await page.locator(".wq-word").waitFor();
  return false;
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
  await pressNext(page);
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
    await pressNext(page);
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
  await pressNext(page);
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
  sentencesMet += (await pressNext(page)) ? 1 : 0;
  await gradeByKey(page, "✓ got it (hold)", "Enter");
  const viaEnter = await page.locator(".wq-tile").first().isVisible().catch(() => false);
  if (viaEnter) ok("Enter grades directly");
  else fail("Enter did not grade", "no tiles");
  await page.waitForTimeout(500);
  sentencesMet += (await pressNext(page)) ? 1 : 0;
  await gradeByKey(page, "~ close (hold)", " ");
  const viaSpace = await page.locator(".wq-tile").first().isVisible().catch(() => false);
  if (viaSpace) ok("Space grades directly");
  else fail("Space did not grade", "no tiles");

  /* 12 — THE SENTENCE, in a real browser (SPEC section 12 point 6). Everything
     the vitest suite proves about it, it proves in jsdom, where nothing has a
     size: no geometry, no wrapping, no page scroll, no 56 px floor. This is
     where those become facts.

     The walk above has read five words by now, so the first sentence has
     already been met and pressed through — this asserts it, then walks on to
     the next one and measures it. */
  if (sentencesMet >= 1) ok(`the walk met the sentence after the fifth word (${sentencesMet} so far)`);
  else fail("no sentence in a twelve-word session", `sentencesMet=${sentencesMet}`);

  /* Walk on to the next sentence and hold it on the screen to measure. */
  let atSentence = false;
  for (let hop = 0; hop < 8 && !atSentence; hop++) {
    await page.waitForTimeout(500);
    await page.locator(".wq-rail .wq-cta").click();
    atSentence = await page.locator(".wq-sentence").isVisible().catch(() => false);
    if (!atSentence) {
      await page.locator(".wq-word").waitFor();
      await gradeByKey(page, "✓ got it (hold)", "Enter");
      await page.locator(".wq-tile").first().waitFor();
    }
  }
  if (!atSentence) fail("could not reach a second sentence to measure", "eight hops");
  else {
    const words = page.locator(".wq-sword");
    const n = await words.count();
    const boxes = [];
    for (let i = 0; i < n; i++) boxes.push(await words.nth(i).boundingBox());
    /* S7: every word is a control the child taps, so every word is 56 px or
       more — including "a", which is one character wide. */
    const small = boxes.filter((b) => !b || b.height < 56);
    if (n >= 2 && small.length === 0) ok(`every sentence word is a child-sized control (${n} words, shortest ${Math.min(...boxes.map((b) => b.height)).toFixed(1)}px >= 56)`);
    else fail("a sentence word is below the child floor", JSON.stringify({ n, small }));
    /* The page must not scroll, and the sentence must not run off the side.
       Eight words do not fit one phone line, so they WRAP — and a sentence
       that scrolls sideways is a sentence a child loses. */
    const m = await page.evaluate(() => ({
      sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight,
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    }));
    if (m.sh <= m.ch && m.sw <= m.cw) ok(`the sentence fits the phone without scrolling (${m.sw}x${m.sh} in ${m.cw}x${m.ch})`);
    else fail("the sentence scrolls the page", JSON.stringify(m));
    /* Exactly one word open, and the tiles under it are that word's (point 4). */
    const openCount = await page.locator(".wq-sword-open").count();
    if (openCount === 1) ok("exactly one word is open when the sentence arrives");
    else fail("wrong number of open words", `${openCount}`);
    /* Point 6: the grown-up's control is live at once — no wait, no fill.
       Every word reveal makes them wait for the child to hear the word; a
       sentence must not, because nothing here has to be heard first. */
    const railLive = await page.locator(".wq-rail .wq-cta").isEnabled();
    const fillOnRail = await page.locator(".wq-rail .wq-ctafill").count();
    if (railLive && fillOnRail === 0) ok("the sentence advance is live at once, with no wait to sit through");
    else fail("the sentence advance made the grown-up wait", `live=${railLive} fill=${fillOnRail}`);
    /* A tap on another word opens it and closes the last, and says nothing —
       the silence is checked by the vitest suite; the geometry is checked here. */
    const closed = words.nth(n - 1);
    const wasOpen = await page.locator(".wq-sword-open").first().textContent();
    await closed.click();
    await page.waitForTimeout(150);
    const nowOpen = await page.locator(".wq-sword-open").first().textContent().catch(() => null);
    const stillOne = await page.locator(".wq-sword-open").count();
    if (stillOne === 1 && nowOpen !== wasOpen) ok(`a tap moves the open word (${wasOpen.trim()} -> ${nowOpen.trim()}), still exactly one`);
    else fail("tapping did not move the open word", JSON.stringify({ wasOpen, nowOpen, stillOne }));
    /* Back to a word, so the checks below meet the screen they expect. */
    await page.locator(".wq-rail .wq-cta").click();
    await page.locator(".wq-word").waitFor();
  }

  /* 13-14 — the message slot holds its size, whoever is reading. Checks 13
     and 14 used to walk a session until they met one of the five words
     recognition could not judge, then assert that no record control was
     offered and that the adult's note fitted the fixed slot without moving the
     word. Both halves went on 2026-08-12: there is no record control anywhere,
     so that assertion could never fail again, and the five words lost their
     note when the microphone did.

     What survives is the reason the slot exists at all — P0-2, the word never
     moves — and that is now measured directly instead of through a note. The
     slot is filled to its worst case with the LONGEST tricky-word note in the
     bank, which is the longest adult text the stage can still be asked to
     show, and the word above it must not move by a pixel. */
  {
    const fresh = await startSession(context, { width: 390, height: 664 });
    const before = await fresh.locator(".wq-word").boundingBox();
    const slot = await fresh.evaluate(() => {
      const el = document.querySelector(".wq-slot-msg");
      return el ? { h: el.clientHeight, cs: getComputedStyle(el).minHeight } : null;
    });
    if (!slot) fail("no message slot on the stage", "the .wq-slot-msg row is missing");
    else if (slot.h < 52) fail("the message slot is under its reserved height", `${slot.h}px`);
    else ok(`the message slot reserves its height whatever it holds (${slot.h}px, min-height ${slot.cs})`);

    /* Fill it with the longest adult text the bank can produce and re-measure
       the word. A negative control follows: text that overflows the slot MUST
       move the word, proving this probe can see movement at all. */
    const longest = await fresh.evaluate(() => {
      const el = document.querySelector(".wq-slot-msg");
      const p = document.createElement("p");
      p.className = "wq-parentnote";
      p.style.cssText = "margin:0;font-size:11.5px;font-weight:700;line-height:1.35";
      p.textContent = "Tricky word! The a sounds like \u201Cuh\u201D \u2014 wut.";
      el.appendChild(p);
      return { noteH: p.scrollHeight, slotH: el.clientHeight };
    });
    const after = await fresh.locator(".wq-word").boundingBox();
    const moved = Math.abs(after.y - before.y) > 0.5 || Math.abs(after.height - before.height) > 0.5;
    if (longest.noteH > longest.slotH) fail("the longest adult note overflows the slot", `${longest.noteH}px in ${longest.slotH}px`);
    else if (moved) fail("the word moved when the slot was filled", JSON.stringify({ before, after }));
    else ok(`the longest adult note fits the slot (${longest.noteH}px in ${longest.slotH}px) and the word does not move`);

    await fresh.evaluate(() => {
      const el = document.querySelector(".wq-slot-msg");
      el.style.setProperty("min-height", "0", "important");
      el.style.setProperty("height", "auto", "important");
      el.querySelector(".wq-parentnote").textContent = "x ".repeat(400);
    });
    const wrecked = await fresh.locator(".wq-word").boundingBox();
    if (Math.abs(wrecked.y - before.y) > 0.5)
      console.log(`control OK: the probe reads real geometry (an unbounded slot moves the word ${Math.round(Math.abs(wrecked.y - before.y))}px)`);
    else fail("negative control broken", "an overflowing slot left the word where it was");
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
    const page = await startSession(context, { width: 390, height: 664 });
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
    await pressNext(page);
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

    for (const vp of [{ width: 390, height: 664 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
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

/* The word sits about the stage's visual centre — the owner's pick from four
   measured candidates (2026-08-03), judged again on a real iPhone 13 on
   2026-08-13 and ruled fine.
   THE BAND IS 42-58, NOT 48-52, AND THE REASON IS THE POINT. This check ran at
   390x844 for its whole life. 844 is the DEVICE height of an iPhone 13; a page
   gets 390x664, because the browser keeps the rest. At the honest height the
   midline is 45.7% — and at 375x629, an iPhone 13 mini, it is 39.2%. The
   owner looked at the real thing on a real phone and ruled the difference
   trivial: "they all look about centre. Nothing worth holding up a beta for.
   Like the lowest tier bug." So the gate now asks what the ruling asks —
   ABOUT centre — and still fails on a word at 20% or 80%, which is what a real
   regression looks like. The drift from a dead centre is recorded in
   docs/open-faults.md G3c-1 as owed and lowest tier, so it is not lost.
   Phase stability is check 5's job. */
{
  const context = await browser.newContext();
  const page = await startSession(context, { width: 390, height: 664 });
  const pct = await page.evaluate(() => {
    const st = document.querySelector(".wq-stage").getBoundingClientRect();
    const w = document.querySelector(".wq-word").getBoundingClientRect();
    return (w.top + w.height / 2 - st.top) / st.height * 100;
  });
  if (pct >= 42 && pct <= 58) ok(`the word sits about the stage centre (midline ${pct.toFixed(1)}% at 390x664, the real page size of an iPhone 13)`);
  else fail("the word is off the stage centre", `midline at ${pct.toFixed(1)}% (want 42-58)`);
  await context.close();
}

/* A 450 ms HOLD MUST NOT SELECT TEXT. Reported by the owner from a real
   iPhone 13 on 2026-08-13, with a screenshot: a touch between "skip" and
   "got it" started an iOS text selection across the grown-up strip, blue
   handles and all.
   The cause is the app's own core gesture. S5 requires a 450 ms pointer hold on
   every adult result control, and a 450 ms press on a touch screen is exactly
   what iOS reads as "select this text" — so the interaction a grown-up performs
   twenty times a session was fighting the operating system on every touch
   device, from the day the hold was built. No gate saw it because every browser
   check in this project drives a MOUSE, and a mouse never asks for a selection
   by pressing. That is the lesson worth more than the fix: this repository's
   evidence about touch has always come from a device that has none.
   The control below is the fault itself, planted: with the rule removed, the
   selectable surface comes back. */
{
  const context = await browser.newContext();
  const page = await startSession(context, { width: 390, height: 664 });
  const read = () => page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return "missing";
      const cs = getComputedStyle(el);
      return cs.webkitUserSelect || cs.userSelect;
    };
    return { strip: pick(".wq-striplabel"), word: pick(".wq-word"), hold: pick(".wq-sbtn.wq-hold") };
  });
  const live = await read();
  const locked = ["strip", "word", "hold"].filter((k) => live[k] === "none");
  if (locked.length === 3) ok(`a hold cannot select the child's screen (user-select none on the strip label, the word and the grade control a grown-up holds)`);
  else fail("a 450ms hold can select text on the child's screen",
    `${JSON.stringify(live)} — a long press on a touch device raises a selection instead of grading`);

  /* THE CONTROL RUNS HERE, ON THE SCREEN THE ELEMENTS ARE ON. Its first
     version ran after navigating to the grown-ups corner, where .wq-striplabel
     does not exist — so it read "missing", compared that against "none", and
     passed while proving nothing. A control that passes because its subject is
     absent is the shape this whole gate exists to refuse. */
  await page.addStyleTag({ content: `.wq-root{-webkit-user-select:text !important;user-select:text !important}` });
  const after = await read();
  if (after.strip === "text" && after.hold === "text")
    ok(`control OK: the probe reads live style (removing the rule makes the strip and the grade control selectable again)`);
  else fail("the user-select probe does not read live style",
    `${JSON.stringify(after)} — the elements must EXIST and must have changed`);

  /* AND THE GROWN-UP CAN STILL SELECT WHAT THEY CAME FOR. Turning selection off
     everywhere would take the inputs with it, which is the one place in this
     app where selecting text is the point.
     The name field, not the copy box: the copy box only renders when the
     CLIPBOARD IS BLOCKED, and in a headless browser the write succeeds, so a
     check pinned to it would have measured nothing on most runs. */
  await page.goto(URL, { waitUntil: "load" });
  await page.getByRole("button", { name: "Grown-ups corner" }).click();
  await page.locator("#wq-name").waitFor({ timeout: 8000 });
  const box2 = await page.evaluate(() => {
    const el = document.querySelector("#wq-name");
    if (!el) return "missing";
    const cs = getComputedStyle(el);
    return cs.webkitUserSelect || cs.userSelect;
  });
  if (box2 === "text") ok("the grown-up can still select and edit the text they came for (user-select text on the corner's inputs)");
  else fail("a grown-up's input cannot be selected", `user-select is ${box2} — turning selection off took the inputs with it`);
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
  const SIZES = [{ width: 390, height: 664 }, { width: 810, height: 1080 }, { width: 1280, height: 800 }];
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
  /* THREE choices since 2026-08-13, not two: sentences joined words (SPEC
     section 12 point 7). Named individually rather than counted, so a choice
     that vanishes is a failure and not a smaller number nobody reads. */
  const rand = await page.getByRole("button", { name: "Truly random" }).boundingBox();
  const lvl = await page.getByRole("button", { name: /Level \d+ .+ words/ }).boundingBox();
  const sent = await page.getByRole("button", { name: "📖 Sentences" }).boundingBox();
  if (rand && lvl && sent && rand.height >= 56 && lvl.height >= 56 && sent.height >= 56)
    ok(`all three free-play choices are child-sized (${Math.round(rand.height)}px, ${Math.round(lvl.height)}px and ${Math.round(sent.height)}px)`);
  else fail("a free-play choice is under 56 px or missing", JSON.stringify({ rand, lvl, sent }));
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
  if (bounded.length === 3 && bounded.every((d) => d.bg !== d.cardBg || d.border >= 2 || d.shadow !== "none"))
    ok("all three free-play choices are visibly bounded on the card");
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

/* 21-22 — the four-tile row fits the narrowest phone, and stays on one line.
   Every level up to 9 breaks into at most THREE sound units, so the tile row
   had never been asked to hold four. Levels 10 and 11 are blends, and a blend
   is two sounds run together, not one: "band" is b-a-n-d and "step" is
   s-t-e-p, four tiles each. The row is a flexbox with no wrap, so a fourth
   tile either fits or silently pushes the word off the side of a small
   screen. An engine test cannot see that — it has no width. Measured on the
   narrowest phone this app supports and on the tallest word the new levels
   contain. */
{
  const storageSrc = readFileSync("app/src/storage.js", "utf8");
  const dbName = storageSrc.match(/DB_NAME = "([^"]+)"/)[1];
  const dbStore = storageSrc.match(/DB_STORE = "([^"]+)"/)[1];
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(URL, { waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).waitFor();
  await page.evaluate(([db, store, key, save]) => new Promise((resolve, reject) => {
    const rq = indexedDB.open(db, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(store);
    rq.onsuccess = () => {
      const tx = rq.result.transaction(store, "readwrite");
      tx.objectStore(store).put(save, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
    rq.onerror = () => reject(rq.error);
  }), [dbName, dbStore, STORE_KEY, JSON.stringify({ version: 4, level: 20, sessionsCompleted: 0, perfectStreak: 0, words: {}, settings: { sound: true } })]);
  await page.reload({ waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.locator(".wq-word").waitFor();
  await gradeByKey(page, "✓ got it (hold)", "Enter");
  await page.locator(".wq-tile").first().waitFor();
  const seen = await page.locator(".wq-word").textContent();
  const tiles = await page.locator(".wq-tile").count();
  const boxes = [];
  for (const t of await page.locator(".wq-tile").all()) boxes.push(await t.boundingBox());
  const doc = await page.evaluate(() => ({
    w: document.documentElement.clientWidth,
    over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  if (tiles !== 4 || boxes.some((b) => !b)) {
    fail("a Level 20 word did not render four measurable tiles", `word=${seen} tiles=${tiles}`);
  } else {
    const left = Math.min(...boxes.map((b) => b.x));
    const right = Math.max(...boxes.map((b) => b.x + b.width));
    const oneLine = new Set(boxes.map((b) => Math.round(b.y))).size === 1;
    if (left >= 0 && right <= doc.w && !doc.over)
      ok(`four tiles fit 320 px wide ("${seen}" spans ${Math.round(right - left)} px of ${doc.w})`);
    else fail("the four-tile row overflows a 320 px screen", JSON.stringify({ seen, left, right, doc }));
    if (oneLine) ok(`the four tiles of "${seen}" sit on one line`);
    else fail("the four-tile row wrapped", JSON.stringify(boxes.map((b) => Math.round(b.y))));

    /* Negative control. A fit-check that cannot report a miss proves nothing,
       and this one would pass on any screen if it were reading the wrong box.
       The same probe is re-run with each tile forced far wider than the
       viewport: it MUST report the row off the screen. */
    await page.evaluate(() => {
      for (const t of document.querySelectorAll(".wq-tile")) {
        t.style.setProperty("padding-left", "200px", "important");
        t.style.setProperty("padding-right", "200px", "important");
      }
    });
    const wide = [];
    for (const t of await page.locator(".wq-tile").all()) wide.push(await t.boundingBox());
    const wideRight = Math.max(...wide.map((b) => b.x + b.width));
    const wideLeft = Math.min(...wide.map((b) => b.x));
    if (wideRight > doc.w || wideLeft < 0) ok("control: the fit probe reports an over-wide tile row off the screen");
    else fail("the fit probe passed a row it should have refused", JSON.stringify({ wideLeft, wideRight, w: doc.w }));
  }
  await context.close();
}

/* 38-48 — the session path fits every screen a family owns. The owner sent a
   screenshot on 2026-08-12 of the dots running off the right edge of a phone,
   and ruled: one line where the width allows, two or three where it does not,
   never out of bounds, with "read so far" holding the start of the first line.
   Measured at real device widths, on the WORST case — a twenty-word session,
   which a fresh Level 1 never produces because that level holds fourteen words.
   The expected rows are literal, and so are the dots per row: the track is a
   grid of fixed columns, so what each width does is a fact, not an estimate.
   479 and 480 are here as a pair because they sit either side of the stated
   breakpoint; if the rule moved, one of them would report the other's shape.
   A negative control follows: the phone rule is overridden back to twenty
   columns and the same probe must report the dots off the screen. */
{
  const storageSrc = readFileSync("app/src/storage.js", "utf8");
  const dbName = storageSrc.match(/DB_NAME = "([^"]+)"/)[1];
  const dbStore = storageSrc.match(/DB_STORE = "([^"]+)"/)[1];
  const SAVE = JSON.stringify({ version: 4, level: 20, sessionsCompleted: 0,
    perfectStreak: 0, words: {}, settings: { sound: true } });

  const probe = (page) => page.evaluate(() => {
    const lbl = document.querySelector(".wq-tracklbl");
    const segs = [...document.querySelectorAll(".wq-seg")].map((s) => s.getBoundingClientRect());
    const d = document.documentElement;
    if (!lbl || !segs.length) return null;
    const byRow = segs.reduce((a, r) => { const k = Math.round(r.y); (a[k] ||= []).push(r); return a; }, {});
    const keys = Object.keys(byRow).map(Number).sort((a, b) => a - b);
    const l = lbl.getBoundingClientRect();
    return {
      n: segs.length, rows: keys.length, perRow: keys.map((k) => byRow[k].length),
      left: Math.min(...segs.map((r) => r.left)), right: Math.max(...segs.map((r) => r.right)),
      cw: d.clientWidth, hScroll: d.scrollWidth - d.clientWidth, vScroll: d.scrollHeight - d.clientHeight,
      lblSize: getComputedStyle(lbl).fontSize,
      lblRight: l.right, lblTop: Math.round(l.top), firstRowTop: keys[0],
      firstDotLeft: Math.min(...byRow[keys[0]].map((r) => r.left)),
    };
  });

  const openAtWidth = async (vp) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(URL, { waitUntil: "load" });
    await page.getByRole("button", { name: "Begin Session" }).waitFor();
    await page.evaluate(([db, store, key, save]) => new Promise((resolve, reject) => {
      const rq = indexedDB.open(db, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(store);
      rq.onsuccess = () => {
        const tx = rq.result.transaction(store, "readwrite");
        tx.objectStore(store).put(save, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      };
      rq.onerror = () => reject(rq.error);
    }), [dbName, dbStore, STORE_KEY, SAVE]);
    await page.reload({ waitUntil: "load" });
    await page.getByRole("button", { name: "Begin Session" }).click();
    await page.locator(".wq-word").waitFor();
    await page.locator(".wq-seg").first().waitFor();
    return { context, page };
  };

  /* rows and perRow are the measured shape of the shipped stylesheet, written
     out as literals so a change to the track has to change this list too */
  const SCREENS = [
    { width: 300, height: 600, rows: 3, perRow: [7, 7, 6], what: "narrower than any phone this app supports" },
    { width: 320, height: 568, rows: 2, perRow: [10, 10], what: "the narrowest screen the app supports" },
    { width: 375, height: 629, rows: 2, perRow: [10, 10], what: "iPhone 13 mini, at its page size" },
    { width: 390, height: 664, rows: 2, perRow: [10, 10], what: "iPhone 13 and 14, at the page size a browser gives them" },
    { width: 430, height: 739, rows: 2, perRow: [10, 10], what: "iPhone 15 Pro Max, at its page size" },
    { width: 479, height: 900, rows: 2, perRow: [10, 10], what: "one pixel inside the phone rule" },
    { width: 480, height: 900, rows: 1, perRow: [20], what: "the first width that holds one row" },
    { width: 768, height: 1024, rows: 1, perRow: [20], what: "iPad Mini portrait, where the page size is the device size" },
    { width: 810, height: 1080, rows: 1, perRow: [20], what: "iPad Air portrait" },
    { width: 1280, height: 800, rows: 1, perRow: [20], what: "desktop" },
  ];
  for (const vp of SCREENS) {
    const { context, page } = await openAtWidth(vp);
    const m = await probe(page);
    const at = `${vp.width}x${vp.height} (${vp.what})`;
    if (!m) fail(`no session path at ${at}`, "no label or no dots");
    else if (m.n !== 20) fail(`the session path did not draw twenty dots at ${at}`, `${m.n} dots`);
    else if (m.hScroll > 0) fail(`the page overflows sideways at ${at}`, `${m.hScroll}px`);
    else if (m.vScroll > 0) fail(`the page scrolls at ${at}`, `${m.vScroll}px`);
    else if (m.left < 0 || m.right > m.cw)
      fail(`a dot sits outside the screen at ${at}`, `dots span ${m.left.toFixed(1)} to ${m.right.toFixed(1)} of ${m.cw}`);
    else if (m.rows !== vp.rows) fail(`the session path took ${m.rows} rows at ${at}`, `expected ${vp.rows}`);
    else if (JSON.stringify(m.perRow) !== JSON.stringify(vp.perRow))
      fail(`the dots split unevenly at ${at}`, `${JSON.stringify(m.perRow)}, expected ${JSON.stringify(vp.perRow)}`);
    else if (m.lblSize !== "9px") fail(`"read so far" is not 9px at ${at}`, m.lblSize);
    else if (m.lblRight > m.firstDotLeft + 0.5)
      fail(`"read so far" overlaps the dots at ${at}`, `label ends at ${m.lblRight.toFixed(1)}, first dot at ${m.firstDotLeft.toFixed(1)}`);
    else if (Math.abs(m.lblTop - m.firstRowTop) > 4)
      fail(`"read so far" left the first line at ${at}`, `label at ${m.lblTop}, first row at ${m.firstRowTop}`);
    else ok(`${at}: twenty dots on ${m.rows} ${m.rows === 1 ? "line" : "lines"} ${JSON.stringify(m.perRow)}, inside the screen (${m.left.toFixed(0)}-${m.right.toFixed(0)} of ${m.cw}), "read so far" first`);
    await context.close();
  }

  /* negative control: put the wide rule back on a phone, which is the fault
     the owner photographed, and the same probe must refuse it */
  {
    const { context, page } = await openAtWidth(SCREENS[3]);   // 390x844
    await page.addStyleTag({ content: ".wq-root .wq-prog{grid-template-columns:repeat(20,13px)!important}" });
    const bad = await probe(page);
    if (bad && bad.rows === 1 && bad.right > bad.cw)
      console.log(`control OK: the probe reads real geometry (one row of twenty runs ${Math.round(bad.right - bad.cw)}px past the edge of a 390px screen)`);
    else fail("negative control broken", `twenty columns on a phone measured as fitting: ${JSON.stringify(bad)}`);
    await context.close();
  }
}

/* 36-37 — the mastery map explains itself, and does not tell a parent their
   child failed. A user reported on 2026-08-12 that words their child had read
   correctly were "tracking as unmastered". Nothing was broken: a first correct
   reading reaches box 3, mastery is box 4, and every amber word is one the
   child got right. But the screen carried three colours with no key and a
   single "N/M mastered" that reads as failure. Both are measured here, in the
   rendered page, because a legend that exists only in the source is a legend
   nobody sees. */
{
  const context = await browser.newContext();
  const page = await startSession(context, { width: 390, height: 664 });
  await page.getByRole("button", { name: "Finish early" }).click().catch(() => {});
  await page.goto(URL, { waitUntil: "load" });
  await page.getByRole("button", { name: "Grown-ups corner" }).click();
  await page.getByText("Mastery map").waitFor();
  const body = await page.locator("body").innerText();
  const legend = ["read right twice", "read right once", "not yet", "not tried"]
    .filter((t) => body.includes(t));
  if (legend.length === 4) ok(`the mastery map names all four of its colours (${legend.join(", ")})`);
  else fail("the mastery map has colours with no key", `found ${legend.length} of 4: ${legend}`);

  /* The count must lead with what the child DID. "N read" before "N green",
     and the bare word "mastered" gone from the per-level row, because that is
     the word that read as a verdict on the child. */
  const rowCounts = await page.locator(".wq-rowbtn .wq-mono").allInnerTexts();
  const shaped = rowCounts.filter((t) => /\d+\/\d+ read · \d+ green/.test(t));
  if (shaped.length === rowCounts.length && rowCounts.length >= 11)
    ok(`all ${rowCounts.length} level rows read "N/M read · N green" (${rowCounts[0]})`);
  else fail("a level row still reports a bare mastered count", JSON.stringify(rowCounts.slice(0, 3)));
  await context.close();
}

await browser.close();
stopServer();
console.log(`\nG7 interface gate: ${checks} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
