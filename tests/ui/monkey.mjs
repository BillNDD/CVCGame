/* THE MONKEY (G30). What a four-year-old's HAND does to the app, measured: a
   seeded storm of random taps, double-taps, drags and a few keys across
   whatever screen it lands on, on two phone profiles, on the engine
   CENSUS_ENGINE names. QA build-out item 2 (owner-ruled 2026-09-01: "a
   hand-rolled monkey tester"; the definition of done in
   docs/testing-gauntlet.md).

   NOT THE CENSUS MONKEY, AND WHY BOTH EXIST. tests/census/monkey.spec.mjs
   (the `monkey` detector in tools/census-novelties.mjs, owner-judged
   2026-08) walks the CONTROL LIST: it taps every tappable control on the
   session screen by name, never a hold and never the corner, and judges what
   the app said. This gate is the other instrument: coordinates, not
   controls. A hand lands between buttons, on the word, on the strip label,
   drags across the stage, reaches the corner - and this is what proves the
   app survives that, stays on screen, and writes nothing a hand may not
   write. The RNG is the census's own (mulberry32), imported, not re-rolled.

   WHAT COUNTS AS AN ADULT ACTION, so the gate never cries S1 falsely
   (the engineering seat's before pass, 2026-09-02). S5 names the keyboard
   as an adult action: Enter or Space on a focused result control grades
   DIRECTLY, and the app moves focus to the advance control after a reveal,
   so a storm that pressed Enter would grade and even finish a session
   lawfully. Enter and Space are therefore NOT in the mix; Tab, Escape and
   ArrowRight are. A pointer that dwells 450 ms inside a hold control is a
   real hold: every pointer's dwell is measured, and a changed result after
   a dwell past the hold length is INCONCLUSIVE with its seed, never an S1
   verdict - while a long dwell that changed nothing is S1 holding.
   The corner's two-tap Reset is reachable by design; an erase is reported
   as its own named finding, and the S1 probe compares the words that
   survive, field by field.

   WHAT IT ASSERTS, per profile, after the storm settles:
     1. no uncaught page error and no console error;
     2. the storm actually reached the session (coverage, from data-wq-screen)
        and the shell is still on screen;
     3. S1 - every word present before and after has identical
        box/attempts/correct/close/wrong, no word key appeared, and none
        vanished (a vanished word is inconclusive, never a pass);
     4. the session count did not move.
   NEGATIVE CONTROL (E5): after the storm the gate does the one adult act
   the app exposes - focus "got it", press Enter - and the same probe must
   then SEE the change. That proves the probe reads the app's own write, and
   that the save was writable at all: under a timed-out boot every write is
   a silent no-op (F3) and an S1 line would pass over nothing measured.

   WHAT IT CANNOT PROVE: that the app looked right while it was battered. */
import { spawn, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { launchEngine } from "./engine.mjs";
import { mulberry32 } from "../../tools/census-novelties.mjs";
import { STORE_KEY, LEVELS } from "../../src/engine.js";

const PORT = 4186;
const URL = `http://127.0.0.1:${PORT}/`;
const SEED = Number(process.env.MONKEY_SEED || 20260901);
const N = 300;                                   // pinned: the gauntlet requires "300 gestures" by name
const HOLD_MS = 450;                             // S5's hold, the dwell that makes a drag an adult act
let failures = 0, checks = 0;
const ok = (name) => { checks += 1; console.log(`ok ${checks}: ${name}`); };
const fail = (name, detail) => { failures += 1; console.error(`FAIL: ${name} — ${detail}`); };

if (!process.env.WQ_SKIP_BUILD) execSync("npm --prefix app run build", { stdio: "pipe" });
/* Bound to 127.0.0.1 like every gate since 2026-09-01: left to vite the
   preview binds ::1 alone here and Firefox's cold load runs 8 to 15 s. */
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
  cwd: "app", stdio: "ignore", detached: true,
});
const stopServer = () => { try { process.platform === "win32" ? server.kill() : process.kill(-server.pid); } catch {} };
let serverUp = false;
for (let i = 0; i < 300 && !serverUp; i++) {
  try { const r = await fetch(URL); if (r.ok) serverUp = true; } catch {}
  if (!serverUp) await new Promise((r) => setTimeout(r, 200));
}
if (!serverUp) { stopServer(); throw new Error(`the preview server never answered on ${URL} within 60 s - nothing below was measured`); }
const { browser, engine } = await launchEngine();
const shutdown = () => { try { browser.close(); } catch {} stopServer(); };
process.on("exit", shutdown);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { shutdown(); process.exit(130); });
process.on("uncaughtException", (e) => { shutdown(); console.error(e); process.exit(1); });
process.on("unhandledRejection", (e) => { shutdown(); console.error(e); process.exit(1); });

const storageSrc = readFileSync("app/src/storage.js", "utf8");
const dbName = storageSrc.match(/DB_NAME = "([^"]+)"/)[1];
const dbStore = storageSrc.match(/DB_STORE = "([^"]+)"/)[1];
/* The proven helper's shape (tests/ui/network.mjs, app/src/storage.js):
   resolve on the transaction's completion and close the connection. */
const idb = (page, mode, value) => page.evaluate(([db, store, key, v, m]) => new Promise((resolve, reject) => {
  const rq = indexedDB.open(db, 1);
  rq.onupgradeneeded = () => rq.result.createObjectStore(store);
  rq.onsuccess = () => {
    const tx = rq.result.transaction(store, m);
    const r = m === "readwrite" ? tx.objectStore(store).put(v, key) : tx.objectStore(store).get(key);
    let out;
    r.onsuccess = () => { out = r.result; };
    tx.oncomplete = () => { rq.result.close(); resolve(out); };
    tx.onerror = () => { rq.result.close(); reject(tx.error); };
    tx.onabort = () => { rq.result.close(); reject(tx.error); };
  };
  rq.onerror = () => reject(rq.error);
}), [dbName, dbStore, STORE_KEY, value ?? null, mode]);
const readSave = async (page) => JSON.parse(await idb(page, "readonly") || "{}");

/* A graduated save with four words in the boxes: the storm lands on a word
   session, the corner, free play - every screen a child can reach - and the
   words are what S1 protects. Version 7 so nothing migrates underneath. */
const words = {};
for (const w of LEVELS[0].words.slice(0, 4)) words[w] = { box: 3, attempts: 1, correct: 1, close: 0, wrong: 0, dueAt: 9, lastSession: 1 };
const seed = { version: 7, level: 2, preLevel: 0, prePerfectStreak: 0, sessionsCompleted: 5, perfectStreak: 0,
  words, log: [], pre: {}, settings: { sound: true, childName: "", lang: "en-US" } };

async function seedPage(page) {
  await page.goto(URL, { waitUntil: "load" });
  await page.getByRole("button", { name: "Begin Session" }).waitFor({ timeout: 20000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.waitForTimeout(400);
    await idb(page, "readwrite", JSON.stringify(seed));
    await page.reload({ waitUntil: "load" });
    await page.getByRole("button", { name: "Begin Session" }).waitFor({ timeout: 20000 });
    const got = await readSave(page);
    if (JSON.stringify(got.words) === JSON.stringify(words) && got.sessionsCompleted === seed.sessionsCompleted) return;
  }
  throw new Error("the seed never landed: the app kept overwriting it");
}

/* The S1 probe: the words that survive must be untouched, and none may
   appear. A reset (the corner's two-tap erase, an adult control by design)
   leaves no words; that is reported by name, separately. */
const RESULT_FIELDS = ["box", "attempts", "correct", "close", "wrong"];
function s1Diff(before, after) {
  const diffs = [];
  for (const w of Object.keys(after.words || {})) {
    if (!before.words[w]) { diffs.push(`${w} appeared`); continue; }
    for (const f of RESULT_FIELDS) if (before.words[w][f] !== after.words[w][f]) diffs.push(`${w}.${f} ${before.words[w][f]} -> ${after.words[w][f]}`);
  }
  return diffs;
}

async function storm(page, vw, vh, errors) {
  const rnd = mulberry32(SEED);
  const screens = new Set();
  let longestDwell = 0;
  /* EVERY pointer gesture is timed, not only the drag: the hold timer starts
     on pointerdown whatever opened the pointer, so a stalled click on a hold
     control is a real hold too (the after pass). A harness throw is a
     harness fault, kept apart from the app's own errors. */
  const harness = [];
  /* The dwell is the pointer's own down-to-up time, so every tap is sent as
     an explicit down and up with the clock around exactly that - a click's
     round trip through the harness is not a hold, and measuring it as one
     made a 913 ms Playwright call read as an adult (the first run). */
  const press = async (x, y, times) => {
    await page.mouse.move(x, y);
    for (let k = 0; k < times; k++) {
      const t0 = Date.now(); await page.mouse.down(); await page.mouse.up();
      longestDwell = Math.max(longestDwell, Date.now() - t0);
    }
  };
  for (let i = 0; i < N; i += 1) {
    const kind = rnd();
    const x = Math.floor(rnd() * vw), y = Math.floor(rnd() * vh);
    try {
      if (kind < 0.55) await press(x, y, 1);
      else if (kind < 0.70) await press(x, y, 2);
      else if (kind < 0.85) {
        await page.mouse.move(x, y);
        const t0 = Date.now(); await page.mouse.down();
        await page.mouse.move(Math.floor(rnd() * vw), Math.floor(rnd() * vh), { steps: 4 }); await page.mouse.up();
        longestDwell = Math.max(longestDwell, Date.now() - t0);
      }
      else if (kind < 0.95) await page.keyboard.press(["Tab", "Escape", "ArrowRight"][Math.floor(rnd() * 3)]);
      else await press(x, y, 3);
    } catch (e) { harness.push(`gesture ${i} threw: ${String(e).slice(0, 120)}`); }
    if (i % 25 === 0) {
      screens.add(await page.evaluate(() => document.documentElement.getAttribute("data-wq-screen") || "(none)").catch(() => "(gone)"));
      await page.waitForTimeout(30);
    }
  }
  return { screens: [...screens], longestDwell, harness };
}

/* A write in flight lands after a single read: read twice, half a second
   apart, and take the save only once it holds still. */
async function settledSave(page) {
  let a = await readSave(page);
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    const b = await readSave(page);
    if (JSON.stringify(a) === JSON.stringify(b)) return b;
    a = b;
  }
  return a;
}

const PROFILES = [{ width: 390, height: 664 }, { width: 320, height: 568 }];
for (const [pi, vp] of PROFILES.entries()) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
  page.on("filechooser", (fc) => fc.setFiles([]).catch(() => {}));   // "Load backup file": the picker opens, nothing is chosen
  page.on("download", (d) => d.cancel().catch(() => {}));            // "Save backup file": the blob download is discarded
  await page.setViewportSize(vp);
  await seedPage(page);
  const before = await readSave(page);
  const { screens, longestDwell, harness } = await storm(page, vp.width, vp.height, errors);
  if (harness.length) throw new Error(`the harness itself failed, not the app: ${harness[0]}`);
  const after = await settledSave(page);
  const shell = await page.evaluate(() => !!document.querySelector(".wq-shell")).catch(() => false);
  const label = `${vp.width}x${vp.height} on ${engine}, ${N} gestures, seed ${SEED}`;

  if (errors.length === 0) ok(`${label}: no page error and no console error`);
  else fail(`${label}: the storm raised errors`, errors.slice(0, 3).join(" | "));
  if (shell && screens.includes("session")) ok(`${label}: the storm reached the session and the shell is still on screen (screens met: ${screens.join(", ")})`);
  else fail(`${label}: the storm never reached the session, or the app blanked`, JSON.stringify({ shell, screens }));

  /* An erase (the corner's two-tap Reset, an adult control by design) leaves
     nothing to compare, and a comparison of nothing must never print "held":
     it is INCONCLUSIVE with its seed, like a dwelling pointer (the after pass). */
  const missing = Object.keys(before.words).filter((w) => !(after.words || {})[w]);
  const diffs = s1Diff(before, after);
  /* A long dwell matters only as the EXPLANATION of a changed result: a
     stalled harness that held 883 ms on nothing changed nothing, and that is
     S1 holding, not a verdict withheld (the second run). */
  if (diffs.length && longestDwell >= HOLD_MS) fail(`${label}: INCONCLUSIVE - a result changed after a pointer dwelled ${longestDwell} ms, which is an adult hold`, `replay with MONKEY_SEED=${SEED}: ${diffs[0]}`);
  else if (missing.length) fail(`${label}: INCONCLUSIVE - ${missing.length} of ${Object.keys(before.words).length} words are gone from the save (the corner's Reset, or a lost write)`, `replay with MONKEY_SEED=${SEED}`);
  else if (diffs.length === 0) ok(`${label}: S1 held - no result field of any word moved, no word appeared, none vanished (longest dwell ${longestDwell} ms)`);
  else fail(`${label}: S1 broken - a random gesture changed a result`, diffs.slice(0, 5).join("; "));
  if (after.sessionsCompleted === before.sessionsCompleted) ok(`${label}: the session count did not move (${before.sessionsCompleted})`);
  else fail(`${label}: the session count moved`, `${before.sessionsCompleted} -> ${after.sessionsCompleted}`);

  /* NEGATIVE CONTROL (E5), on the first profile: the one adult act, and the
     same probe must see it - which also proves the save was writable. */
  if (pi === 0) {
    /* Re-seeded first: the storm may lawfully have moved the LEVEL in the
       corner (a setting, not a result), and a higher level opens with chunk
       riders, whose grade goes to state.pre - the probe would then see no
       word move and call a working save broken (found on the first run).
       The read-only banner is read HERE, on home, after the re-seed. */
    await seedPage(page);
    const readOnlyShown = await page.evaluate(() => /Nothing is being saved/.test(document.body.innerText)).catch(() => true);
    await page.getByRole("button", { name: "Begin Session" }).click();
    await page.locator(".wq-word").waitFor({ timeout: 20000 });
    const base = await readSave(page);
    const b = page.getByRole("button", { name: "got it" });
    await b.focus(); await b.press("Enter");
    let seen = [];
    for (let i = 0; i < 12 && seen.length === 0; i++) { await page.waitForTimeout(250); seen = s1Diff(base, await readSave(page)); }
    if (!readOnlyShown && seen.length > 0) console.log(`control OK: the S1 probe sees the app's own write after an adult keyboard grade (${seen[0]}), so the save was writable and the probe reads it`);
    else {
      const why = await page.evaluate(() => ({ screen: document.documentElement.getAttribute("data-wq-screen"), word: document.querySelector(".wq-word")?.textContent, tiles: document.querySelectorAll(".wq-tile").length, gotit: document.querySelector('[aria-label="got it"]')?.disabled })).catch(() => null);
      fail("negative control broken", `readOnly=${readOnlyShown} diffs=${JSON.stringify(seen)} base=${Object.keys(base.words || {}).join(",")} now=${Object.keys((await readSave(page)).words || {}).join(",")} ${JSON.stringify(why)}`);
    }
  }
  await context.close();
}

await browser.close();
stopServer();
console.log(`\nG30 monkey gate: ${checks} checks passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
