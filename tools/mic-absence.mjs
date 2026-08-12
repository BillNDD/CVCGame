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
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, rmSync } from "node:fs";
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
  /* The cloud scoring stub, deleted 2026-08-12 with SPEC section 8 item 4. The term stays in
     this list precisely BECAUSE the code is gone: it is the tripwire against the idea coming
     back without a fresh ruling. */
  "assessPronunciation",
];

/* Every file allowed to contain a term, each with the reason and the date it
   was allowed. EMPTY IS THE GOAL. A file listed here is a file this check is
   not checking, so the list is printed on every run and belongs in review. */
const ALLOWED = {
  "tools/record-reveal.mjs":
    "a developer's screen-and-sound recorder for reviewing a reveal; runs on a workstation and "
    + "ships nothing to a child — added 2026-08-12",
  "tools/app-mutants.mjs":
    "the note recording the four transcript mutants retired on 2026-08-12 has to name what "
    + "they were — added 2026-08-12",
  // "app/src/recorder.js": "family voice-pack recorder, owner-kept (D1) — added YYYY-MM-DD",
};

/* TRACKED files, from git — not a filesystem walk. The first version walked
   directories, and picked up `reference/.mutant.jsx`: a gitignored working
   file that the mutation gate writes and deletes many times a run. A gauntlet
   killed halfway leaves one behind, so this check went RED on a machine with
   no product fault at all and CLEAN on the next. A gate whose answer depends
   on whether somebody once pressed Ctrl-C is not a gate.
   Asking git also makes the header's own words true: it says "no tracked
   source file", and now that is what it reads. */
const CODE = /\.(js|cjs|mjs|jsx|ts|tsx|html|json|webmanifest)$/;
const trackedFiles = () =>
  execSync("git ls-files -z", { encoding: "buffer" }).toString("utf8")
    .split("\0").filter((f) => f && CODE.test(f));
/* This file names every term it hunts for, so it can never be its own subject. */
const SELF = "tools/mic-absence.mjs";

/* The built payload is not tracked, so it is walked — but only app/dist, which
   the build owns entirely. */
const distFiles = (dir = "app/dist", out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    if (statSync(f).isDirectory()) distFiles(f, out);
    else if (CODE.test(name)) out.push(f);
  }
  return out;
};

const hitsIn = (text) => TERMS.filter((t) => text.includes(t));

/* scan() without the printing, for the self-test's allowlist controls. */
function scanSilently(files) {
  let n = 0;
  for (const f of files) {
    if (f === SELF || ALLOWED[f]) continue;
    try { n += hitsIn(readFileSync(f, "utf8")).length ? 1 : 0; } catch { /* unreadable */ }
  }
  return n;
}

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
        /* A setter, because this must OBSERVE and never steer: with a getter
           alone, `window.SpeechRecognition = X` throws in strict mode and
           changes what the app does. */
        set() {},
      });
    }
    /* Wrap the PROTOTYPE, not the instance: a call made as
       MediaDevices.prototype.getUserMedia.call(navigator.mediaDevices, ...)
       walks straight past an own-property wrapper. The legacy aliases are
       trapped too — they are the ones an old snippet reaches for. */
    if (window.MediaDevices && MediaDevices.prototype.getUserMedia) {
      const real = MediaDevices.prototype.getUserMedia;
      MediaDevices.prototype.getUserMedia = function (...a) { note("getUserMedia"); return real.apply(this, a); };
    }
    for (const legacy of ["getUserMedia", "webkitGetUserMedia", "mozGetUserMedia"]) {
      Object.defineProperty(navigator, legacy, {
        configurable: true,
        get() { note("navigator." + legacy); return function () {}; },
      });
    }
    if (window.MediaDevices && MediaDevices.prototype.getDisplayMedia) {
      const realD = MediaDevices.prototype.getDisplayMedia;
      MediaDevices.prototype.getDisplayMedia = function (...a) { note("getDisplayMedia"); return realD.apply(this, a); };
    }
    /* Control on the trap itself: if this probe reported zero because the trap
       never installed, this line would not appear either. */
    window.__micTrapInstalled = true;
  });

  await page.goto(URL, { waitUntil: "load" });
  const installed = await page.evaluate(() => window.__micTrapInstalled === true);
  if (!installed) { console.log("  runtime BROKEN: the trap did not install; this run proves nothing"); await browser.close(); try { process.kill(-server.pid); } catch {} return 1; }

  /* A whole session, not a glance at the home screen — and COUNTED, because a
     walk whose every step is wrapped in .catch() can silently grade nothing
     and still be described as a session. */
  let graded = 0;
  await page.getByRole("button", { name: /Begin Session/ }).click();
  await page.locator(".wq-word").waitFor();
  for (let i = 0; i < 3; i++) {
    const rec = page.getByRole("button", { name: /Record/ });
    if (await rec.count()) await rec.first().click().catch(() => {});
    await page.waitForTimeout(300);
    const b = page.getByRole("button", { name: "✓ got it (hold)" });
    if (!(await b.count())) break;
    await b.focus(); await b.press("Enter"); graded += 1;
    await page.locator(".wq-tile").first().waitFor().catch(() => {});
    await page.waitForFunction(() => { const x = document.querySelector(".wq-rail .wq-cta"); return !!x && !x.disabled; },
      null, { timeout: 12000 }).catch(() => {});
    await page.locator(".wq-rail .wq-cta").click().catch(() => {});
    await page.locator(".wq-word").waitFor().catch(() => {});
  }
  /* READ THE SESSION'S EVIDENCE BEFORE NAVIGATING AGAIN. Playwright re-runs
     addInitScript on every navigation, so the `window.__micCalls = []` at the
     top of the trap re-executes and the whole session walk is erased. The
     first version of this function read the array AFTER a goto() and then
     printed "a whole session reached no recogniser" — a sentence that was
     false by construction, and that the direct-read control could not catch,
     because that control runs on the fresh document too. Found in review,
     2026-08-12, after the result had already been reported as proof. */
  const sessionCalls = await page.evaluate(() => window.__micCalls || []);
  if (graded === 0) {
    console.log("  runtime BROKEN: no word was graded, so no session was walked; this run proves nothing");
    await browser.close(); try { process.kill(-server.pid); } catch {} return 1;
  }
  await page.goto(URL, { waitUntil: "load" });
  await page.getByRole("button", { name: /Grown-ups corner/ }).click().catch(() => {});
  await page.waitForTimeout(500);
  const calls = [...sessionCalls, ...await page.evaluate(() => window.__micCalls || [])];

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
  if (!calls.length) { console.log(`  runtime CLEAN: ${graded} graded words, the corner, and the home screen reached no recogniser and no capture device`); return 0; }
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

  /* The allowlist is the mechanism most likely to turn this tool into
     decoration, so it gets its own two controls: a listed file must be
     skipped, and an UNLISTED one holding the same text must not be. Without
     the second, an allowlist that matched everything would look like a pass. */
  const probe = "tools/fixtures/mic-allowlist-probe.js";
  writeFileSync(probe, 'const SR = window.webkitSpeechRecognition;\n');
  try {
    const unlisted = scanSilently([probe]);
    ALLOWED[probe] = "self-test fixture";
    const listed = scanSilently([probe]);
    delete ALLOWED[probe];
    if (unlisted === 1 && listed === 0) console.log("ok   the allowlist suppresses exactly the file it names, and nothing else");
    else { console.error(`control FAILED: allowlist behaviour wrong (unlisted=${unlisted}, listed=${listed})`); bad = 1; }
  } finally { rmSync(probe, { force: true }); }
  console.log(bad ? "mic-absence self-test FAILED" : "mic-absence self-test: 4 controls passed, 0 failed");
  process.exit(bad);
}

const FLAGS = ["--source", "--bundle", "--runtime"];
const given = process.argv.slice(2);
const unknown = given.filter((a) => !FLAGS.includes(a) && a !== "--self-test");
if (unknown.length) {
  /* `node tools/mic-absence.mjs --sourc` used to run NOTHING and exit 0 —
     a green with zero checks performed, in a tool whose whole job is to
     refuse exactly that shape of answer. */
  console.error(`mic-absence: unknown flag ${unknown.join(", ")}. Use ${FLAGS.join(", ")} or no flag for all three.`);
  process.exit(2);
}
const want = (f) => given.includes(f) || given.length === 0;
let red = 0;
/* The summary may only claim what actually ran. Saying "nothing shipped" after
   a --runtime-only run would be a detector lying about its own coverage, which
   is the fault this whole tool exists to make impossible. */
const ran = [];
if (want("--source")) { red += scan(trackedFiles(), "source"); ran.push("no source hit"); }
if (want("--bundle")) {
  /* Build it here rather than trusting whatever app/dist happens to hold: a
     stale bundle from before a change reads as "nothing shipped". */
  if (!process.env.WQ_SKIP_BUILD) execSync("npm --prefix app run build", { stdio: "pipe" });
  if (!existsSync("app/dist")) { console.log("bundle: no app/dist — the build produced nothing"); red += 1; }
  else { red += scan(distFiles(), "bundle"); ran.push("nothing shipped"); }
}
if (want("--runtime")) { console.log("runtime:"); red += await runtime(); ran.push("a whole session reached no recogniser"); }

console.log(red
  ? `\nmic-absence: RED — ${red} findings. The child-facing microphone is still here.`
  : `\nmic-absence: CLEAN on what was run — ${ran.join(", ")}.`
    + (ran.length === 3 ? "" : "  NOT a full pass: run with no flags for all three."));
process.exit(red ? 1 : 0);
