/* The census run loop, the benchmark and the negative controls.
 *
 * tools/ux-census.mjs owns WHAT is examined — the layout-risk signatures, the
 * viewports, and the per-state inspection. This file owns HOW a case is
 * staged, driven and recorded, and is the entry point.
 *
 *   node tools/ux-census-run.mjs --benchmark 100
 *   node tools/ux-census-run.mjs --run [--shard 1/2] [--only phone-portrait]
 *   node tools/ux-census-run.mjs --self-test
 *
 * ARTEFACTS ONLY FOR ANOMALIES. A clean case leaves numbers in the report and
 * nothing on disk. A case with a finding leaves a screenshot and its aria tree,
 * so the gallery has something to adjudicate. Pass traces are never kept: they
 * are evidence about what happened, not evidence that it was right.
 */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { LEVELS, chunkWord, PRAISE, SESSION_SIZE } from "../src/engine.js";
import { cases, signature, VIEWPORTS, inspect, CHILD_MIN, ADULT_MIN } from "./ux-census.mjs";

const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const val = (f, d) => { const i = ARGS.indexOf(f); return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : d; };
const PORT = 4187;
const URL = `http://localhost:${PORT}/`;
const OUT = ".census";
const BANK_WORDS = LEVELS.flatMap((l) => l.words);
const LONGEST_PRAISE = [...PRAISE.keys()].sort((a, b) => PRAISE[b].length - PRAISE[a].length)[0];

// ------------------------------------------------------------ the harness
function startServer() {
  if (!process.env.WQ_SKIP_BUILD) execSync("npm --prefix app run build", { stdio: "pipe" });
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"],
    { cwd: "app", stdio: "ignore", detached: true });
  return () => { try { process.kill(-server.pid); } catch { /* already gone */ } };
}
async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(URL); if (r.ok) return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("the preview server never came up");
}

/* Hold the dice still. The app builds its own block, from its own bank,
   through its own chooser - only Math.random is scripted, so the first draw is
   the word this case is about and the praise line is the longest one, which is
   the one that wraps. Everything else returns a fixed value so a run repeats. */
function seed(wordIndex, poolSize, praiseIndex, praiseCount, blockSize) {
  return ({ wi, ps, pi, pc, bs }) => {
    let n = 0;
    Math.random = () => {
      n += 1;
      if (n === 1) return (wi + 0.5) / ps;
      if (n <= bs) return 0.5;
      return (pi + 0.5) / pc;
    };
  };
}

/* A grade given the way a grown-up gives one: press, hold past 450 ms, let go.
   scroll:"none" is the point - a control below the fold must FAIL here rather
   than be quietly scrolled into view and reported as a pass. */
async function holdGrade(page, label, findings) {
  const button = page.getByRole("button", { name: label });
  try {
    await button.click({ scroll: "none", delay: 700, timeout: 5000 });
    return true;
  } catch (e) {
    findings.push({ kind: "unreachable-control", state: "grading",
      detail: `"${label}" could not be held where it sits: ${String(e).split("\n")[0].slice(0, 140)}` });
    return false;
  }
}

async function stage(context, viewport, word, watchers, opts = {}) {
  const page = await context.newPage();
  watchers(page);
  const wi = opts.forceWrongSeed
    ? (BANK_WORDS.indexOf(word) + 7) % BANK_WORDS.length     // deliberately not the word asked for
    : BANK_WORDS.indexOf(word);
  await page.addInitScript(seed(), { wi, ps: BANK_WORDS.length, pi: LONGEST_PRAISE,
                                     pc: PRAISE.length, bs: SESSION_SIZE });
  await page.goto(URL, { waitUntil: "load" });
  await page.getByText("🎈 Free play").click({ timeout: 8000 });
  await page.getByText("🎲 Truly random").click({ timeout: 8000 });
  await page.locator(".wq-word").waitFor({ timeout: 8000 });
  const shown = (await page.locator(".wq-word").textContent()).trim();
  return { page, shown };
}

/* Free play must never touch learning evidence (SPEC section 6). Read the
   saved state straight out of IndexedDB, the same store the app writes. */
async function savedState(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open("word-quest", 1);
    req.onerror = () => resolve("unreadable");
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) return resolve("no-store");
      const rq = db.transaction("kv", "readonly").objectStore("kv").get("wordquest:progress:v2");
      rq.onsuccess = () => resolve(rq.result === undefined ? "absent" : String(rq.result));
      rq.onerror = () => resolve("unreadable");
    };
  }));
}

// -------------------------------------------------------------- one case
async function runCase(context, viewport, c, opts = {}) {
  const findings = [];
  const errors = [];
  const requests = [];
  const watchers = (page) => {
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
    page.on("request", (r) => { if (!r.url().startsWith(URL) && !r.url().startsWith("data:")) requests.push(r.url()); });
  };
  const t0 = Date.now();
  let page;
  try {
    const staged = await stage(context, viewport, c.word, watchers, opts);
    page = staged.page;
    if (staged.shown !== c.word) {
      findings.push({ kind: "could-not-stage", state: "word",
        detail: `asked for "${c.word}", the app showed "${staged.shown}" — this case was NOT examined` });
      await page.close();
      return { ...c, viewport: viewport.name, findings, ms: Date.now() - t0, examined: false };
    }
    const before = opts.checkEvidence ? await savedState(page) : null;

    const prompt = await inspect(page, viewport, "word", {
      mustBeVisible: [".wq-word", "button[aria-label='✓ got it (hold)']"],
    });
    findings.push(...prompt.findings);

    if (await holdGrade(page, "✓ got it (hold)", findings)) {
      await page.locator(".wq-tile").first().waitFor({ timeout: 8000 }).catch(() => {
        findings.push({ kind: "no-reveal", state: "reveal-correct",
          detail: "holding “got it” produced no tile row within 8 s" });
      });
      const reveal = await inspect(page, viewport, "reveal-correct", {
        expectFocus: true,
        expectTiles: chunkWord(c.word).length,
        mustBeVisible: [".wq-word", ".wq-tile", ".wq-rail .wq-cta"],
      });
      findings.push(...reveal.findings);
      if (opts.keepAria) c.aria = reveal.aria;
    }

    if (opts.checkEvidence) {
      const after = await savedState(page);
      if (before !== after)
        findings.push({ kind: "free-play-wrote-evidence", state: "after-grading",
          detail: `the saved state changed during free play (${String(before).length} -> ${String(after).length} bytes)` });
    }

    for (const e of errors) findings.push({ kind: "page-error", state: "any", detail: e });
    for (const u of requests) findings.push({ kind: "unexpected-network", state: "any", detail: u });

    if (findings.length) {
      mkdirSync(`${OUT}/shots`, { recursive: true });
      const stem = `${c.word}-${viewport.name}`;
      await page.screenshot({ path: `${OUT}/shots/${stem}.png` }).catch(() => {});
      writeFileSync(`${OUT}/shots/${stem}.aria.txt`,
        await page.locator("body").ariaSnapshot({ mode: "ai", boxes: true }).catch(() => ""));
      c.shot = `shots/${stem}.png`;
    }
    await page.close();
  } catch (e) {
    findings.push({ kind: "case-crashed", state: "any", detail: String(e).split("\n")[0].slice(0, 200) });
    if (page) await page.close().catch(() => {});
  }
  return { ...c, viewport: viewport.name, findings, ms: Date.now() - t0, examined: true };
}

// --------------------------------------------------------- the screens
async function runScreen(context, viewport, which) {
  const findings = [];
  const page = await context.newPage();
  page.on("pageerror", (e) => findings.push({ kind: "page-error", state: which, detail: e.message.slice(0, 160) }));
  await page.goto(URL, { waitUntil: "load" });
  if (which === "grown-ups") await page.getByRole("button", { name: "Grown-ups corner" }).click({ timeout: 8000 });
  if (which === "free-play-modal") await page.getByText("🎈 Free play").click({ timeout: 8000 });
  await page.waitForTimeout(250);
  const r = await inspect(page, viewport, which, {});
  findings.push(...r.findings);
  if (findings.length) {
    mkdirSync(`${OUT}/shots`, { recursive: true });
    await page.screenshot({ path: `${OUT}/shots/${which}-${viewport.name}.png` }).catch(() => {});
  }
  await page.close();
  return { word: `(${which})`, sig: which, viewport: viewport.name, findings, examined: true };
}

// ------------------------------------------------------------ the report
function report(results, meta) {
  const withFindings = results.filter((r) => r.findings.length);
  const byKind = {};
  for (const r of withFindings) for (const f of r.findings) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/report.json`, JSON.stringify({ meta, byKind, results }, null, 1));
  return { withFindings, byKind };
}

// --------------------------------------------------------- negative controls
/* Every detector, proved against a planted defect. A census that cannot find a
   fault it was told about will not find one it was not (E5). */
async function selfTest(browser) {
  const vp = VIEWPORTS[0];
  /* Each plant is a defect this census exists to find, made on purpose on a
     screen where the element it targets actually exists. The first version
     widened `.wq-word`, which lives in a SESSION and not on the home screen,
     so it planted nothing and the control passed by finding a fault that was
     never there to find. */
  const planted = [
    /* The app clips sideways overflow on purpose (no page scroll in a session
       is a SPEC rule), so a wide element alone does NOT make the page scroll -
       it shows up as element-past-the-edge instead, which is its own plant
       below. To prove the page-scroll detector fires at all, the clip is
       lifted as part of the plant: that is what a future layout change would
       do by accident, and it is the state this detector exists to catch.

       MEASURED, not guessed, and it took three attempts: the clip is on
       `.wq-root`, and widening a control in the action rail does nothing to
       the page's scroll width because the rail is positioned and so does not
       feed its ancestors' scrollWidth. The plant therefore widens an element
       in normal flow - the home title. */
    ["horizontal-overflow", `html,body,.wq-root,.wq-shell{ overflow-x: auto !important; } .wq-home-title{ width: 3000px !important; }`],
    ["control-too-small", `.wq-cta{ min-height:10px !important; height:12px !important; min-width:10px !important; width:12px !important; padding:0 !important; }`],
    ["control-obscured", `body::after{ content:""; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,.01); }`],
    ["element-past-the-edge", `.wq-home-title{ position:relative !important; left: 2000px !important; }`],
  ];
  const seen = {};
  for (const [kind, css] of planted) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: "load" });
    await page.addStyleTag({ content: css });
    await page.waitForTimeout(150);
    const r = await inspect(page, vp, "self-test", {});
    seen[kind] = r.findings.some((f) => f.kind === kind);
    await context.close();
  }
  /* And the control for the control: a clean page must produce none of them. */
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(150);
  const clean = await inspect(page, vp, "self-test-clean", {});
  await context.close();
  seen["clean page is clean"] = !clean.findings.some((f) => planted.some(([k]) => k === f.kind));
  /* THE REFUSAL, driven for real. runCase reads the word off the screen and
     must refuse a case it could not stage; the earlier version of this control
     asserted `true` with a comment, which is decoration. Here the seed is
     deliberately pointed at a different word, so the app shows something other
     than what was asked for and the case must come back examined:false. */
  const ctx2 = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });
  const mis = await runCase(ctx2, vp, { word: "cat", sig: "self-test", level: 2, why: "control" },
                            { forceWrongSeed: true });
  await ctx2.close();
  seen["a mis-staged word is refused, not examined"] =
    mis.examined === false && mis.findings.some((f) => f.kind === "could-not-stage");
  return seen;
}

// ------------------------------------------------------------------- main
const stop = startServer();
try {
  await waitForServer();
  const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });

  if (has("--self-test")) {
    const seen = await selfTest(browser);
    for (const [k, v] of Object.entries(seen)) console.log((v ? "ok   " : "FAIL ") + k);
    await browser.close(); stop();
    const failed = Object.values(seen).filter((v) => !v).length;
    console.log(`\ncensus controls: ${Object.keys(seen).length - failed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }

  const all = cases();
  const only = val("--only", null);
  let viewports = only ? VIEWPORTS.filter((v) => v.name === only) : VIEWPORTS;
  const benchN = has("--benchmark") ? Number(val("--benchmark", 100)) : 0;

  /* The benchmark walks the same code as the run, spread across viewports and
     classes rather than taking the first N of anything, so its timing is
     honest about the whole census rather than about its easiest corner. */
  let plan = [];
  for (const v of viewports) for (const c of all) plan.push({ v, c });
  if (benchN) {
    const step = Math.max(1, Math.floor(plan.length / benchN));
    plan = plan.filter((_, i) => i % step === 0).slice(0, benchN);
  }
  const shard = val("--shard", null);
  if (shard) {
    const [i, n] = shard.split("/").map(Number);
    plan = plan.filter((_, k) => k % n === i - 1);
  }

  rmSync(OUT, { recursive: true, force: true });
  const t0 = Date.now();
  const results = [];
  let lastViewport = null, context = null;
  let done = 0;
  for (const { v, c } of plan) {
    if (lastViewport !== v.name) {
      if (context) await context.close();
      context = await browser.newContext({
        viewport: { width: v.width, height: v.height },
        hasTouch: v.touch, isMobile: v.touch, deviceScaleFactor: 1, reducedMotion: "reduce",
      });
      lastViewport = v.name;
      if (!benchN) for (const which of ["home", "grown-ups", "free-play-modal"])
        results.push(await runScreen(context, v, which));
    }
    results.push(await runCase(context, v, { ...c }, { checkEvidence: done % 20 === 0 }));
    done += 1;
    if (done % 10 === 0)
      process.stdout.write(`  ${done}/${plan.length} cells, ${Math.round((Date.now() - t0) / 1000)}s\r`);
  }
  if (context) await context.close();
  await browser.close();

  const secs = (Date.now() - t0) / 1000;
  const meta = {
    cells: results.length, seconds: Math.round(secs), viewports: viewports.map((v) => v.name),
    classes: new Set(all.map((c) => c.sig)).size, words: all.length, bank: BANK_WORDS.length,
    perCell: (secs / Math.max(plan.length, 1)).toFixed(2),
  };
  const { withFindings, byKind } = report(results, meta);

  console.log(`\n${results.length} cells in ${Math.round(secs)}s (${meta.perCell}s each)`);
  console.log(`${all.length} words covering ${meta.classes} layout classes over ${meta.bank} bank words`);
  console.log(`${withFindings.length} cells with findings`);
  for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(4)}  ${k}`);
  if (benchN) {
    const full = VIEWPORTS.length * all.length;
    console.log(`\nBENCHMARK: the full census is ${full} word cells + ${VIEWPORTS.length * 3} screen cells`);
    console.log(`estimated ${Math.round(full * (secs / plan.length) / 60)} minutes on this machine, one shard`);
  }
  console.log(`report: ${OUT}/report.json`);
} finally {
  stop();
}
