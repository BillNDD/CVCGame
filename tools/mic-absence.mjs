/* Is the child-facing microphone GONE, or merely switched off?

   This tool exists because of the one-way door in the middle of that question.
   Right now the microphone is still here, so this tool can be proved to WORK:
   run it today and every check goes red, on real hits, in named files. The
   moment the deletion lands, "the microphone is gone" becomes unfalsifiable —
   there is no tree left to prove a detector detects anything. Rule E5 says
   every detector ships a negative control, and for this one the negative
   control is a commit: the pre-deletion tree. It is available exactly once.

   So this is written and run BEFORE the deletion, its red output is recorded
   in the commit that adds it, and it is wired into a gate only when it turns
   green. A detector written after the thing it looks for is already gone has
   never been shown to look at anything.

   Three checks, weakest to strongest:
     --source   the terms appear in no tracked source file
     --bundle   they appear in nothing the build actually ships
     --runtime  a real browser, driven through a whole session, never reaches
                a recogniser or getUserMedia constructor at all

   The runtime check is the one that answers the question as asked. It does not
   read the source; it replaces the browser's own constructors before any app
   script runs and reports whether anything touched them. Source can lie by
   indirection. `window["Speech" + "Recognition"]` defeats every grep in this
   file and cannot defeat the trap.

   WHAT IS DELIBERATELY NOT SEARCHED FOR, and why. Two live features would be
   destroyed by a careless grep and neither is the child-facing microphone:
     - the render-time ASR (forced alignment that cuts word clips from
       carriers on a developer's machine, docs/settled.md and G13). It ships no
       code to the child. Searching for "asr" would hit all of it.
     - the G21 listening page, which is a review page for voice rounds.
       Searching for "listening" would hit all of it.
   The family voice-pack recorder is a THIRD thing, kept on purpose, and it
   will legitimately use getUserMedia and MediaRecorder when it ships. Those
   two terms are searched for anyway, and when the recorder lands its files go
   in the allowlist below BY NAME, with the date and the reason. An allowlist
   that grows silently is how a detector stops detecting.

   Run: node tools/mic-absence.mjs [--source] [--bundle] [--runtime]
        node tools/mic-absence.mjs --self-test */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

/* The child-facing recogniser and its plumbing. Each term is here because a
   named thing in the product uses it; none is a guess at what a future author
   might type. */
const TERMS = [
  "SpeechRecognition",        // the constructor, both spellings
  "webkitSpeechRecognition",
  "getUserMedia",             // opening a capture device at all
  "MediaRecorder",
  "handleTranscripts",        // the S1 acceptance rule
  "startRec",                 // the child's record control
  "micTried",
  "MAX_HEARD_WORDS",
  "assessPronunciation",      // the SPEC section 8 item 4 stub: takes the child's voice
];

/* Every file allowed to contain a term, each with the reason and the date it
   was allowed. EMPTY IS THE GOAL. A file listed here is a file this check is
   not checking, so the list is printed on every run and belongs in review. */
const ALLOWED = {
  // "app/src/recorder.js": "family voice-pack recorder, owner-kept (D1) — added YYYY-MM-DD",
};

const SOURCE_ROOTS = ["app/src", "app/public", "src", "reference", "tools", "tests"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "generated", "voice", "pending-sounds"]);
/* This file names every term it hunts for, so it can never be its own subject. */
const SELF = "tools/mic-absence.mjs";

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|jsx|ts|tsx|html|json)$/.test(name)) out.push(p);
  }
  return out;
};

const hitsIn = (text) => TERMS.filter((t) => text.includes(t));

function scan(files, label) {
  const found = [];
  for (const f of files) {
    if (f === SELF || ALLOWED[f]) continue;
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    const terms = hitsIn(text);
    if (!terms.length) continue;
    /* Report the first line of each hit, so a reader can go straight there. */
    const lines = text.split("\n");
    for (const t of terms) {
      const i = lines.findIndex((l) => l.includes(t));
      found.push({ file: f, term: t, line: i + 1 });
    }
  }
  console.log(`${label}: ${files.length} files scanned, ${Object.keys(ALLOWED).length} allowlisted`);
  for (const [f, why] of Object.entries(ALLOWED)) console.log(`  allowed: ${f} — ${why}`);
  if (!found.length) { console.log(`  ${label} CLEAN: no child-facing microphone term`); return 0; }
  for (const h of found.slice(0, 40)) console.log(`  HIT  ${h.file}:${h.line}  ${h.term}`);
  if (found.length > 40) console.log(`  ... and ${found.length - 40} more`);
  console.log(`  ${label} RED: ${found.length} hits`);
  return found.length;
}

async function runtime() {
  const { chromium } = await import("playwright");
  const { spawn } = await import("node:child_process");
  const PORT = 4195, URL = `http://localhost:${PORT}/`;
  if (!process.env.WQ_SKIP_BUILD) execSync("npm --prefix app run build", { stdio: "pipe" });
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"],
    { cwd: "app", stdio: "ignore", detached: true });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(URL); if (r.ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const page = await context.newPage();

  /* The trap goes in BEFORE any app script runs. Each constructor is replaced
     with something that records the call. They do not throw: a throw would
     change what the app does and this must observe, not steer. */
  await page.addInitScript(() => {
    window.__micCalls = [];
    const note = (what) => { window.__micCalls.push(what); };
    for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
      Object.defineProperty(window, name, {
        configurable: true,
        get() { note(name); return function Fake() { return { start() {}, stop() {}, abort() {} }; }; },
      });
    }
    if (navigator.mediaDevices) {
      const real = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = function (...a) { note("getUserMedia"); return real.apply(this, a); };
    }
    /* Control on the trap itself: if this probe reported zero because the trap
       never installed, this line would not appear either. */
    window.__micTrapInstalled = true;
  });

  await page.goto(URL, { waitUntil: "load" });
  const installed = await page.evaluate(() => window.__micTrapInstalled === true);
  if (!installed) { console.log("  runtime BROKEN: the trap did not install; this run proves nothing"); await browser.close(); try { process.kill(-server.pid); } catch {} return 1; }

  /* A whole session, not a glance at the home screen. */
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.locator(".wq-word").waitFor();
  for (let i = 0; i < 3; i++) {
    const rec = page.getByRole("button", { name: /Record/ });
    if (await rec.count()) await rec.first().click().catch(() => {});
    await page.waitForTimeout(300);
    const b = page.getByRole("button", { name: "✓ got it (hold)" });
    if (!(await b.count())) break;
    await b.focus(); await b.press("Enter");
    await page.locator(".wq-tile").first().waitFor().catch(() => {});
    await page.waitForFunction(() => { const x = document.querySelector(".wq-rail .wq-cta"); return !!x && !x.disabled; },
      null, { timeout: 12000 }).catch(() => {});
    await page.locator(".wq-rail .wq-cta").click().catch(() => {});
    await page.locator(".wq-word").waitFor().catch(() => {});
  }
  await page.goto(URL, { waitUntil: "load" });
  await page.getByRole("button", { name: "Grown-ups corner" }).click().catch(() => {});
  await page.waitForTimeout(500);
  const calls = await page.evaluate(() => window.__micCalls || []);

  /* Negative control on the trap: ask for the constructor directly. If this
     does NOT register, the probe above was reading nothing and its zero means
     nothing either. */
  const control = await page.evaluate(() => {
    const before = window.__micCalls.length;
    void window.webkitSpeechRecognition;
    return window.__micCalls.length - before;
  });
  await browser.close();
  try { process.kill(-server.pid); } catch {}

  if (control < 1) { console.log("  runtime BROKEN: the trap does not register a direct constructor read"); return 1; }
  console.log(`  control OK: the trap registers a direct constructor read (${control})`);
  if (!calls.length) { console.log("  runtime CLEAN: a whole session reached no recogniser and no capture device"); return 0; }
  console.log(`  runtime RED: the app reached ${[...new Set(calls)].join(", ")} (${calls.length} times)`);
  return calls.length;
}

/* Self-test (E5): the scanner must catch a planted term and must not fire on
   text that merely looks adjacent. */
if (process.argv.includes("--self-test")) {
  let bad = 0;
  const planted = 'const SR = window.SpeechRecognition || window.webkitSpeechRecognition;';
  if (hitsIn(planted).length < 2) { console.error("control FAILED: the scanner missed a planted recogniser"); bad = 1; }
  else console.log("ok   a planted recogniser is caught");
  const keeper = 'const asrCut = "asr_guard_lead_ms"; // the render aligner, and the listening page';
  if (hitsIn(keeper).length) { console.error("control FAILED: the scanner fired on the render ASR or the listening page"); bad = 1; }
  else console.log("ok   the render aligner and the listening page are not its subject");
  const recorder = 'navigator.mediaDevices.getUserMedia({ audio: true })';
  if (!hitsIn(recorder).length) { console.error("control FAILED: a capture device open is not caught"); bad = 1; }
  else console.log("ok   opening a capture device is caught (the family recorder must be allowlisted BY NAME)");
  console.log(bad ? "mic-absence self-test FAILED" : "mic-absence self-test: 3 passed, 0 failed");
  process.exit(bad);
}

const want = (f) => process.argv.includes(f) || process.argv.length === 2;
let red = 0;
if (want("--source")) red += scan(SOURCE_ROOTS.flatMap((d) => walk(d)), "source");
if (want("--bundle")) {
  if (!existsSync("app/dist")) { console.log("bundle: no app/dist — run npm --prefix app run build first"); red += 1; }
  else red += scan(walk("app/dist"), "bundle");
}
if (want("--runtime")) { console.log("runtime:"); red += await runtime(); }

console.log(red
  ? `\nmic-absence: RED — ${red} findings. The child-facing microphone is still here.`
  : "\nmic-absence: CLEAN — no source hit, nothing shipped, and a whole session reached no recogniser.");
process.exit(red ? 1 : 0);
