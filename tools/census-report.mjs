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
import { readFileSync, existsSync } from "node:fs";

const REPORT = ".census/report.json";
/* Floors, raised when the counts grow, never lowered (E6). */
const FLOOR = { controls: 17, cells: 300 };
const CONTROL_PROJECT = "controls";

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
          });
        }
      }
      walk(s.suites);
    }
  };
  walk(report.suites);
  return out;
}

function judge(report) {
  const all = cells(report);
  const problems = [];
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
  if (skipped.length) problems.push(`${skipped.length} cell(s) skipped, and a skip is a coverage hole until it says why`);

  return { all, controls, census, failed, skipped, projects, problems };
}

function selfTest() {
  const ok = [];
  const cell = (project, title, status = "passed") => ({
    title, tests: [{ projectName: project, expectedStatus: "passed", results: [{ status, errors: [] }] }],
  });
  const build = (specs) => ({ suites: [{ specs }] });
  const many = (project, n, status = "passed") =>
    Array.from({ length: n }, (_, i) => cell(project, `cell ${i}`, status));

  const good = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", FLOOR.cells)]);
  ok.push(["a full run with every control is accepted", judge(good).problems.length === 0]);

  /* The fault an auditor produced by deleting the controls project: cells ran,
     nothing was proved, exit 0. */
  const noControls = build(many("desktop", FLOOR.cells));
  ok.push(["a run with NO negative-control project is refused",
    judge(noControls).problems.some((p) => p.includes("proved nothing about its own detectors"))]);

  const fewControls = build([...many(CONTROL_PROJECT, FLOOR.controls - 1), ...many("desktop", FLOOR.cells)]);
  ok.push(["a run that lost a control is refused",
    judge(fewControls).problems.some((p) => p.includes("floor " + FLOOR.controls))]);

  const shortCensus = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", 10)]);
  ok.push(["a run that examined almost nothing is refused",
    judge(shortCensus).problems.some((p) => p.includes("census cells ran"))]);

  const oneFailed = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", FLOOR.cells - 1),
    cell("desktop", "a cell that failed", "failed")]);
  ok.push(["a failed cell is refused", judge(oneFailed).problems.some((p) => p.startsWith("FAILED"))]);

  const oneSkipped = build([...many(CONTROL_PROJECT, FLOOR.controls), ...many("desktop", FLOOR.cells),
    cell("desktop", "a cell that skipped", "skipped")]);
  ok.push(["a skipped cell is reported as a coverage hole",
    judge(oneSkipped).problems.some((p) => p.includes("skipped"))]);

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
const engines = new Set(projects.map((p) => (p.includes("-") ? p.split("-")[0] : "chromium")));
console.log(`  Engines: ${[...engines].join(", ")}`);
if (!projects.some((p) => p.startsWith("webkit"))) console.log("  WebKit did not run at all in this report.");
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
