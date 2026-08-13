/* THE CENSUS REPORT — and the only thing that can notice the census did not
 * happen.
 *
 * It exists because two audits found the same shape twice. First: the negative
 * controls selected themselves by matching a project NAME, so renaming the
 * projects skipped all 63 of them and exited 0, reported as success. That was
 * fixed by giving them their own project — and an auditor then deleted that
 * project from the config and got 329 cells, zero controls, exit 0, nothing
 * said. A run that quietly stops proving things looks exactly like a run that
 * proved them.
 *
 * So this reads the runner's own JSON and REFUSES a run that:
 *   - carried no negative-control project at all;
 *   - ran fewer controls than the floor below;
 *   - has any failed cell, including a soft-assertion failure;
 *   - skipped cells without saying why.
 *
 * It also prints the coverage statement, because a census reports what it did
 * NOT look at as plainly as what it did. "0 findings" over three viewports and
 * one engine is not the same sentence as "0 findings" over twenty-one.
 *
 * Run: npm run census:report      Controls: npm run census:report -- --self-test
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPORT = ".census/report.json";
/* Floors, raised when the counts grow, never lowered (E6). */
const FLOOR = { controls: 17, cells: 300 };
const CONTROL_PROJECT = "controls";
/* Reasons a cell may legitimately skip. Anything else is a coverage hole. */
const DECLARED_SKIPS = ["CDP is Chromium-only", "engine not installed"];

/* WebKit on Linux is the same engine core as iOS Safari, not the same build.
   The install guide tells a parent to use an iOS home screen, so this sentence
   has to reach the artefact a person reads, not only a source comment. */
const IOS = "WebKit here is the same engine core as iOS Safari, NOT the same build. "
  + "No run on this machine is evidence about an iPad. The QA script on a real device owns that.";

function read(path) {
  if (!existsSync(path)) throw new Error(`no census report at ${path} — the run did not finish, or never started`);
  return JSON.parse(readFileSync(path, "utf8"));
}

/* Every cell, flattened out of the runner's nested suites. */
function cells(report) {
  const out = [];
  const walk = (suites) => {
    for (const s of suites || []) {
      for (const spec of s.specs || []) {
        for (const t of spec.tests || []) {
          const r = t.results?.[t.results.length - 1] || {};
          out.push({
            title: spec.title,
            project: t.projectName || "(none)",
            status: r.status || "unknown",
            expected: t.expectedStatus || "passed",
            errors: (r.errors || []).map((e) => String(e.message || "").split("\n")[0]),
            reason: (t.annotations || []).map((a) => a.description || "").join(" "),
          });
        }
      }
      walk(s.suites);
    }
  };
  walk(report.suites);
  return out;
}

/* The newest moment any source the census measures was touched. */
function newestSource(roots = ["app/src", "app/public", "src", "reference"]) {
  let newest = 0, where = "";
  const walk = (dir) => {
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      const m = statSync(full).mtimeMs;
      if (m > newest) { newest = m; where = full; }
    }
  };
  for (const r of roots) walk(r);
  return { newest, where };
}

function judge(report, now = newestSource()) {
  const all = cells(report);
  const problems = [];

  /* STALENESS. The report used to be read with no idea when it was made or
     what from: an auditor ran a green census, then set every control label to
     four times its size WITHOUT re-running, and this gate green-lit a build
     eighteen seconds newer than the evidence - with the exact fault
     text-too-big exists to catch sitting in it. A census that predates the code
     it judges is not evidence about that code. */
  /* Not `Date.parse(x || 0)`: Date.parse coerces 0 to the string "0" and
     returns the year 2000, so a report with no start time was silently treated
     as one from 2000 rather than as one that cannot be dated at all. */
  const stamp = report.stats?.startTime;
  const started = typeof stamp === "string" && stamp ? Date.parse(stamp) : NaN;
  if (!Number.isFinite(started))
    problems.push("the report carries no start time, so it cannot be shown to be about this build");
  else if (now.newest > started)
    problems.push(`the census started ${new Date(started).toISOString()} but ${now.where} changed afterwards`
      + " — this report is about an older build. Re-run the census.");
  const controls = all.filter((c) => c.project === CONTROL_PROJECT);
  const census = all.filter((c) => c.project !== CONTROL_PROJECT);
  const failed = all.filter((c) => c.status !== c.expected && c.status !== "skipped");
  const skipped = all.filter((c) => c.status === "skipped");
  const projects = [...new Set(all.map((c) => c.project))];

  if (!controls.length)
    problems.push(`no "${CONTROL_PROJECT}" project ran — the census proved nothing about its own detectors`);
  else if (controls.length < FLOOR.controls)
    problems.push(`${controls.length} negative controls ran, floor ${FLOOR.controls}`);
  if (census.length < FLOOR.cells)
    problems.push(`${census.length} census cells ran, floor ${FLOOR.cells}`);
  for (const f of failed) problems.push(`FAILED ${f.project} › ${f.title}: ${f.errors[0] || f.status}`);
  /* The config says "a flaky pass is a finding, not a pass". Nothing read it. */
  if (report.stats?.flaky) problems.push(`${report.stats.flaky} cell(s) passed only on a retry, and the config sets retries to 0`);
  /* A SKIP DECLARES ITSELF. Item 5 of the build spec puts the CDP conditions -
     vision deficiency, CPU throttling, network emulation - behind Chromium, so
     they MUST skip on Firefox and WebKit. Refusing every skip would make that
     item impossible and the pressure would land on deleting this check, which
     is the E3 trap. So a skip carrying a declared reason is counted and printed
     in the coverage statement; an undeclared one is still a problem. */
  const undeclared = skipped.filter((c) => !DECLARED_SKIPS.some((d) => (c.reason || "").includes(d)));
  if (undeclared.length)
    problems.push(`${undeclared.length} cell(s) skipped with no declared reason — a skip is a coverage hole until it says why`);

  return { all, controls, census, failed, skipped, projects, problems };
}

function selfTest() {
  const ok = [];
  const cell = (project, title, status = "passed") => ({
    title, tests: [{ projectName: project, expectedStatus: "passed", results: [{ status, errors: [] }] }],
  });
  /* A fixture is dated AFTER the sources it judges, because a report that
     predates the code is the fault being controlled, not the baseline. */
  const FRESH = { newest: 1000, where: "app/src/App.jsx" };
  const build = (specs, stats = {}) =>
    ({ stats: { startTime: new Date(2000).toISOString(), ...stats }, suites: [{ specs }] });
  const many = (project, n, status = "passed") =>
    Array.from({ length: n }, (_, i) => cell(project, `cell ${i}`, status));

  const good = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", FLOOR.cells)]);
  ok.push(["a full run with every control is accepted", judge(good, FRESH).problems.length === 0]);

  /* The fault an auditor produced by deleting the controls project: cells ran,
     nothing was proved, exit 0. */
  const noControls = build(many("desktop", FLOOR.cells));
  ok.push(["a run with NO negative-control project is refused",
    judge(noControls, FRESH).problems.some((p) => p.includes("proved nothing about its own detectors"))]);

  const fewControls = build([...many(CONTROL_PROJECT, FLOOR.controls - 1), ...many("desktop", FLOOR.cells)]);
  ok.push(["a run that lost a control is refused",
    judge(fewControls, FRESH).problems.some((p) => p.includes("floor " + FLOOR.controls))]);

  const shortCensus = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", 10)]);
  ok.push(["a run that examined almost nothing is refused",
    judge(shortCensus, FRESH).problems.some((p) => p.includes("census cells ran"))]);

  const oneFailed = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", FLOOR.cells - 1),
    cell("desktop", "a cell that failed", "failed")]);
  ok.push(["a failed cell is refused", judge(oneFailed, FRESH).problems.some((p) => p.startsWith("FAILED"))]);



  /* The auditor's plant: a green census, then the app broken, and no re-run. */
  const stale = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", FLOOR.cells)]);
  ok.push(["a report older than the code it judges is refused",
    judge(stale, { newest: 9999, where: "app/src/wq-css.js" }).problems
      .some((p) => p.includes("changed afterwards"))]);
  ok.push(["a report with no start time at all is refused",
    judge({ suites: stale.suites }, FRESH).problems.some((p) => p.includes("no start time"))]);

  const flaky = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", FLOOR.cells)], { flaky: 2 });
  ok.push(["a cell that passed only on a retry is refused, as the config promises",
    judge(flaky, FRESH).problems.some((p) => p.includes("only on a retry"))]);

  const declared = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", FLOOR.cells),
    { title: "a condition cell", tests: [{ projectName: "desktop", expectedStatus: "passed",
      annotations: [{ description: "CDP is Chromium-only" }], results: [{ status: "skipped", errors: [] }] }] }]);
  ok.push(["a skip that declares its reason is counted, not refused",
    judge(declared, FRESH).problems.length === 0]);
  const undeclared = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", FLOOR.cells),
    cell("desktop", "a cell that skipped", "skipped")]);
  ok.push(["a skip with no reason is still a coverage hole",
    judge(undeclared, FRESH).problems.some((p) => p.includes("no declared reason"))]);

  ok.push(["the iOS sentence is not softened",
    IOS.includes("NOT the same build") && IOS.includes("No run on this machine is evidence about an iPad")]);

  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\ncensus-report controls: ${ok.length - failed} passed, ${failed} failed`);
  return failed;
}

if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);

const report = read(REPORT);
const { all, controls, census, failed, skipped, projects, problems } = judge(report);

console.log("\n=== CENSUS REPORT ===\n");
console.log(`Cells:     ${all.length}  (${census.length} census, ${controls.length} negative controls)`);
console.log(`Failed:    ${failed.length}     Skipped: ${skipped.length}`);
console.log(`Projects:  ${projects.length} — ${projects.join(", ")}`);

console.log("\nWHAT THIS RUN DID NOT LOOK AT:");
/* FROM METADATA, NOT FROM A NAME. Splitting the project name on "-" printed
   "Engines: phone, tablet, narrow, desktop" - the one paragraph whose whole job
   is to state coverage honestly, stating it falsely, and by exactly the
   mechanism increment 1 removed from the controls. */
const declared = (report.config?.projects || [])
  .map((p) => p.metadata?.engine).filter(Boolean);
const engines = new Set(declared);
console.log(`  Engines: ${engines.size ? [...engines].join(", ") : "NOT DECLARED — no project states its engine"}`);
if (!engines.has("webkit")) console.log("  WebKit did not run at all in this report.");
console.log(`  ${IOS}`);
console.log("  It cannot settle whether the voice is right, whether a child understands the screen,");
console.log("  whether a colour is pleasant, or whether the game works on a real iPad in a real kitchen.");

if (problems.length) {
  console.log("\nPROBLEMS:");
  for (const p of problems) console.log("  " + p);
  console.log(`\nCensus report: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log("\nCensus report: 0 problems");
