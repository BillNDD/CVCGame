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
 *   - ran fewer controls or fewer cells than the floors in the baseline;
 *   - has any failed cell, including a soft-assertion failure;
 *   - contains a cell that EXPECTS to fail — test.fail() is a one-line E3
 *     bypass that the runner reports as a pass;
 *   - skipped cells without saying why;
 *   - was produced by some other config, or predates the build it judges.
 *
 * It also prints the coverage statement, because a census reports what it did
 * NOT look at as plainly as what it did. "0 findings" over three viewports and
 * one engine is not the same sentence as "0 findings" over twenty-one.
 *
 * Run: npm run census:report      Controls: npm run census:report -- --self-test
 *
 * TWO SCOPES, owner-ruled 2026-08-21 with the speed plan's census decisions:
 * the every-other-beta BODY, and the every-beta NOVELTIES (three cells on each
 * profile, two singletons, six planted-fault controls), which used to be
 * trapped inside the body. `--novelties` judges the second against its own
 * floors; without it a novelties-only report is refused by the body's floors,
 * which is right, because 32 cells are not a census.
 *
 * `--run` SPAWNS THE RUNNER FIRST, through Node with no shell, deletes the old
 * report before it starts and judges whatever the run produced whatever its
 * exit code was. The npm script used to do that with `rm -f`, a `{ ...; }`
 * group and `${CENSUS_PORT:-4187}` - three POSIX forms cmd.exe either fails
 * on or hands over as literal text - so `npm run census` had never once
 * started on the owner's own machine (found 2026-08-22).
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const REPORT = ".census/report.json";
const BUNDLE = "app/dist";
const CONFIG = "playwright.config.mjs";

/* THE FLOORS LIVE IN THE BASELINE, LIKE EVERY OTHER FLOOR IN THIS REPOSITORY
   (E6). They used to be a literal in this file and built into this file's own
   fixtures, so an auditor lowered them to {controls: 2} and all eleven controls
   still passed — a floor that moves with the thing it measures is not a floor.
   The self-test now asserts the baseline's values against literals (E4), so
   lowering one goes red here AND shows as a diff in an owner-visible file. */
const BASE = JSON.parse(readFileSync(new URL("../.claude/gate-baseline.json", import.meta.url), "utf8"));
const FLOOR = { controls: BASE.census_controls, cells: BASE.census_cells };
const NOVELTY_FLOOR = { controls: BASE.census_novelty_controls, cells: BASE.census_novelty_cells };
const CONTROL_PROJECT = "controls";
const NOVELTY_PROJECT = "novelties-once";
const NOVELTY_SPECS = ["tests/census/novelties.spec.mjs", "tests/census/monkey.spec.mjs", "tests/census/novelties-once.spec.mjs"];
/* A scope names its floors, which cells are its negative controls, and which
   project must exist for anything to have been proved. The body's controls
   are a project of their own; the novelties' controls live inside the
   singleton project and announce themselves by title. */
const SCOPES = {
  full: { name: "census", floor: FLOOR, project: CONTROL_PROJECT,
          isControl: (c) => c.project === CONTROL_PROJECT },
  novelties: { name: "novelties", floor: NOVELTY_FLOOR, project: NOVELTY_PROJECT,
          isControl: (c) => c.project === NOVELTY_PROJECT && c.title.startsWith("control:") },
};
const SCOPE = process.argv.includes("--novelties") ? SCOPES.novelties : SCOPES.full;
const RUN = process.argv.includes("--run");
/* Reasons a cell may legitimately skip. Anything else is a coverage hole. */
const DECLARED_SKIPS = ["CDP is Chromium-only", "engine not installed", "chromium settles it"];

/* Everything the census's answer depends on. It watched app/src and app/public
   and NOT app/dist — but the census measures the BUILT bundle through vite
   preview, so editing a source and not rebuilding left this gate silent about
   a report that described a different app. The census's own machinery is here
   too: change a detector or a viewport and the last run is no longer about
   this census. */
const WATCHED = ["app/dist", "app/src", "app/public", "src", "reference",
                 "tools/ux-census.mjs", "tools/census-novelties.mjs", "tools/census-report.mjs", "tests/census", CONFIG,
                 /* The two that BUILD the bundle and the one that sets the
                    floors this file enforces. An auditor named all three: they
                    change the app or the verdict and app/dist only catches the
                    first two once somebody remembers to rebuild. */
                 "app/index.html", "app/vite.config.js", ".claude/gate-baseline.json"];

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

/* The newest moment anything the census's answer depends on was touched. */
function newestSource(roots = WATCHED) {
  let newest = 0, where = "";
  const stamp = (path) => { const m = statSync(path).mtimeMs; if (m > newest) { newest = m; where = path; } };
  const walk = (path) => {
    let entries;
    try { entries = statSync(path).isDirectory() ? readdirSync(path, { withFileTypes: true }) : null; }
    catch { return; }
    if (!entries) return stamp(path);
    for (const e of entries) walk(join(path, e.name));
  };
  for (const r of roots) walk(r);
  return { newest, where, bundle: existsSync(BUNDLE) };
}

function judge(report, now = newestSource(), scope = SCOPES.full) {
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
  if (!now.bundle)
    problems.push(`there is no ${BUNDLE} — the census serves the built bundle, so nothing here was measured against one`);
  /* WHICH RUN IS THIS. The gate was observed judging a ninety-minute-old
     report produced by a different config as if it were the run just made,
     because nothing tied the file to the census. */
  const from = String(report.config?.configFile || "");
  if (!from.endsWith(CONFIG))
    problems.push(`this report was produced by ${from || "an unrecorded config"}, not by ${CONFIG}`);

  const controls = all.filter(scope.isControl);
  const census = all.filter((c) => !scope.isControl(c));
  const failed = all.filter((c) => c.status !== c.expected && c.status !== "skipped");
  const skipped = all.filter((c) => c.status === "skipped");
  const projects = [...new Set(all.map((c) => c.project))];

  if (!controls.length)
    problems.push(`no "${scope.project}" project ran — the ${scope.name} proved nothing about its own detectors`);
  else if (controls.length < scope.floor.controls)
    problems.push(`${controls.length} negative controls ran, floor ${scope.floor.controls}`);
  if (census.length < scope.floor.cells)
    problems.push(`${census.length} ${scope.name} cells ran, floor ${scope.floor.cells}`);
  for (const f of failed) problems.push(`FAILED ${f.project} › ${f.title}: ${f.errors[0] || f.status}`);
  /* THE ONE-LINE E3 BYPASS. test.fail() sets the cell's expectation to failure,
     so a broken app reports "1 passed", exit 0 — and the comparison above,
     which asks whether the status matched the EXPECTATION, agrees with it.
     forbidOnly has no equivalent. Nothing in this census may expect to fail. */
  const inverted = all.filter((c) => c.expected !== "passed");
  for (const c of inverted)
    problems.push(`${c.project} › ${c.title} expects "${c.expected}" — test.fail() makes a broken app read as a pass (E3)`);
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

  /* FROM METADATA, NOT FROM A NAME. Splitting the project name on "-" printed
     "Engines: phone, tablet, narrow, desktop" - the one paragraph whose whole
     job is to state coverage honestly, stating it falsely, and by exactly the
     mechanism that cost the controls their project. */
  /* REQUESTED IS NOT OBSERVED, and the difference is the whole point of this
     paragraph. An auditor set CENSUS_ENGINE=webkit on a machine with no
     WebKit: 18 cells failed with "Executable doesn't exist", and this printed
     "Engines: webkit" and SUPPRESSED "WebKit did not run at all in this
     report" — the one paragraph whose job is honest coverage, claiming an
     engine that never launched. An engine has run when it has produced a cell
     that PASSED; anything else is a request. */
  const passedIn = new Set(all.filter((c) => c.status === "passed").map((c) => c.project));
  const byName = new Map((report.config?.projects || []).map((p) => [p.name, p.metadata?.engine]));
  const engines = [...new Set([...byName.values()].filter(Boolean))];
  const observed = [...new Set([...passedIn].map((n) => byName.get(n)).filter(Boolean))];

  return { all, controls, census, failed, skipped, projects, engines, observed, problems };
}

/* THE WHOLE OUTPUT, AS TEXT. It used to be a run of console.log calls, and the
   control for the iOS paragraph asserted the CONSTANT rather than anything the
   tool printed - so deleting the line that printed it left 11 of 11 green. The
   report is built here and printed in one place, so a control can read what a
   person would actually see. */
function render(j) {
  const out = [];
  out.push("", "=== CENSUS REPORT ===", "");
  out.push(`Cells:     ${j.all.length}  (${j.census.length} census, ${j.controls.length} negative controls)`);
  out.push(`Failed:    ${j.failed.length}     Skipped: ${j.skipped.length}`);
  out.push(`Projects:  ${j.projects.length} — ${j.projects.join(", ")}`);
  out.push("", "WHAT THIS RUN DID NOT LOOK AT:");
  out.push(`  Engines requested: ${j.engines.length ? j.engines.join(", ") : "NOT DECLARED — no project states its engine"}`);
  out.push(`  Engines that produced a passing cell: ${j.observed.length ? j.observed.join(", ") : "none"}`);
  for (const e of j.engines)
    if (!j.observed.includes(e)) out.push(`  ${e} was asked for and produced no passing cell — it did not run.`);
  if (!j.observed.includes("webkit")) out.push("  WebKit did not run at all in this report.");
  out.push(`  ${IOS}`);
  out.push("  It cannot settle whether the voice is right, whether a child understands the screen,");
  out.push("  whether a colour is pleasant, or whether the game works on a real iPad in a real kitchen.");
  if (j.problems.length) {
    out.push("", "PROBLEMS:");
    for (const p of j.problems) out.push("  " + p);
    out.push("", `Census report: ${j.problems.length} problem(s)`);
  } else {
    out.push("", "Census report: 0 problems");
  }
  return out.join("\n");
}

function selfTest() {
  const ok = [];
  const cell = (project, title, status = "passed", expected = "passed") => ({
    title, tests: [{ projectName: project, expectedStatus: expected, results: [{ status, errors: [] }] }],
  });
  /* A fixture is dated AFTER the sources it judges, because a report that
     predates the code is the fault being controlled, not the baseline. */
  const FRESH = { newest: 1000, where: "app/src/App.jsx", bundle: true };
  const build = (specs, stats = {}, config = {}) => ({
    stats: { startTime: new Date(2000).toISOString(), ...stats },
    config: { configFile: `/repo/${CONFIG}`,
      projects: [{ name: CONTROL_PROJECT, metadata: { engine: "chromium" } },
                 { name: "desktop", metadata: { engine: "chromium" } }], ...config },
    suites: [{ specs }],
  });
  const many = (project, n, status = "passed") =>
    Array.from({ length: n }, (_, i) => cell(project, `cell ${i}`, status));

  /* LITERALS, NOT THE CONSTANT UNDER TEST (E4). Every fixture below is sized
     from these two numbers, so they cannot be the floors themselves — that is
     precisely the fault an auditor exploited by lowering FLOOR to {controls: 2}
     and watching every control still pass. */
  const CONTROLS = 41, CELLS = 708;
  ok.push(["the baseline states the floors this file was written against",
    FLOOR.controls === CONTROLS && FLOOR.cells === CELLS]);

  const good = build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", CELLS)]);
  ok.push(["a full run with every control is accepted", judge(good, FRESH).problems.length === 0]);

  /* The fault an auditor produced by deleting the controls project: cells ran,
     nothing was proved, exit 0. */
  const noControls = build(many("desktop", CELLS));
  ok.push(["a run with NO negative-control project is refused",
    judge(noControls, FRESH).problems.some((p) => p.includes("proved nothing about its own detectors"))]);

  const fewControls = build([...many(CONTROL_PROJECT, CONTROLS - 1), ...many("desktop", CELLS)]);
  ok.push(["a run that lost a control is refused",
    judge(fewControls, FRESH).problems.some((p) => p.includes("floor " + CONTROLS))]);

  const shortCensus = build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", 10)]);
  ok.push(["a run that examined almost nothing is refused",
    judge(shortCensus, FRESH).problems.some((p) => p.includes("census cells ran"))]);

  const oneFailed = build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", CELLS - 1),
    cell("desktop", "a cell that failed", "failed")]);
  ok.push(["a failed cell is refused", judge(oneFailed, FRESH).problems.some((p) => p.startsWith("FAILED"))]);

  /* test.fail(): the app breaks, the runner says "1 passed", exit 0. */
  const inverted = build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", CELLS - 1),
    cell("desktop", "a cell that expects to fail", "failed", "failed")]);
  ok.push(["a cell that EXPECTS to fail is refused, however green the runner calls it",
    judge(inverted, FRESH).problems.some((p) => p.includes("test.fail()"))]);

  /* The auditor's plant: a green census, then the app broken, and no re-run. */
  const stale = build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", CELLS)]);
  ok.push(["a report older than the code it judges is refused",
    judge(stale, { newest: 9999, where: "app/src/wq-css.js", bundle: true }).problems
      .some((p) => p.includes("changed afterwards"))]);
  ok.push(["a report with no start time at all is refused",
    judge({ ...stale, stats: {} }, FRESH).problems.some((p) => p.includes("no start time"))]);
  ok.push(["a run with no built bundle to measure is refused",
    judge(stale, { ...FRESH, bundle: false }).problems.some((p) => p.includes("no app/dist"))]);
  ok.push(["a report produced by some other config is refused",
    judge(build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", CELLS)], {},
      { configFile: "/repo/some-other.config.mjs" }), FRESH).problems
      .some((p) => p.includes("some-other.config.mjs"))]);

  /* THE NOVELTIES SCOPE. Literals again (E4): 16 planted-fault controls and
     109 cells beside them - 96 profile cells (twelve on each of eight
     profiles), 8 monkey walks and 5 singletons - counted by the runs of
     2026-09-02 and 2026-09-03. Art step 3 took the cells from 92 to 108 (the
     frame's hold and the word's bound on every profile, the wide frames on
     the four wide ones); the portrait ask added one cell and one control,
     since a title beginning "control:" is counted as a control and not as a
     cell. Art step 4 added the eighteenth control on 2026-09-03: the word's
     reclaimed margin, a hole step 3 opened and frameHold could not see. A novelties run judged
     as the body is refused, because it is not one; judged as novelties it
     passes only whole. */
  const NOVELTY_CONTROLS = 18, NOVELTY_CELLS = 109;
  ok.push(["the baseline states the novelty floors this file was written against",
    NOVELTY_FLOOR.controls === NOVELTY_CONTROLS && NOVELTY_FLOOR.cells === NOVELTY_CELLS]);
  const novControls = Array.from({ length: NOVELTY_CONTROLS }, (_, i) => cell(NOVELTY_PROJECT, `control: planted fault ${i}`));
  const novCells = [...many("desktop", NOVELTY_CELLS - 2), cell(NOVELTY_PROJECT, "update-stay"), cell(NOVELTY_PROJECT, "offline equality")];
  const novelties = build([...novControls, ...novCells]);
  ok.push(["a novelties run judged as the body is refused - 98 cells are not a census",
    judge(novelties, FRESH).problems.some((p) => p.includes("census cells ran"))]);
  ok.push(["a whole novelties run is accepted in its own scope",
    judge(novelties, FRESH, SCOPES.novelties).problems.length === 0]);
  ok.push(["a novelties run that lost a planted-fault control is refused",
    judge(build([...novControls.slice(1), ...novCells]), FRESH, SCOPES.novelties).problems
      .some((p) => p.includes("floor " + NOVELTY_CONTROLS))]);
  ok.push(["a novelties run that lost a profile's cells is refused",
    judge(build([...novControls, ...novCells.slice(3)]), FRESH, SCOPES.novelties).problems
      .some((p) => p.includes("novelties cells ran"))]);
  ok.push(["a novelties run with no singleton project proved nothing, and says so",
    judge(build(many("desktop", NOVELTY_CELLS)), FRESH, SCOPES.novelties).problems
      .some((p) => p.includes(`no "${NOVELTY_PROJECT}" project ran`))]);
  ok.push(["a failed novelty cell is refused",
    judge(build([...novControls, ...novCells.slice(1), cell("desktop", "phase walk", "failed")]), FRESH, SCOPES.novelties)
      .problems.some((p) => p.startsWith("FAILED"))]);

  const flaky = build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", CELLS)], { flaky: 2 });
  ok.push(["a cell that passed only on a retry is refused, as the config promises",
    judge(flaky, FRESH).problems.some((p) => p.includes("only on a retry"))]);

  const declared = build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", CELLS),
    { title: "a condition cell", tests: [{ projectName: "desktop", expectedStatus: "passed",
      annotations: [{ description: "CDP is Chromium-only" }], results: [{ status: "skipped", errors: [] }] }] }]);
  ok.push(["a skip that declares its reason is counted, not refused",
    judge(declared, FRESH).problems.length === 0]);
  const undeclared = build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", CELLS),
    cell("desktop", "a cell that skipped", "skipped")]);
  ok.push(["a skip with no reason is still a coverage hole",
    judge(undeclared, FRESH).problems.some((p) => p.includes("no declared reason"))]);

  /* THE OUTPUT A PERSON READS, not the constant behind it. Deleting the line
     that prints the iOS paragraph used to leave every control green. */
  const printed = render(judge(good, FRESH));
  ok.push(["the printed report carries the iOS sentence, in the words that do not soften it",
    printed.includes("NOT the same build") && printed.includes("No run on this machine is evidence about an iPad")]);
  ok.push(["the printed report states the engines from the run's own metadata",
    printed.includes("Engines requested: chromium")]);
  ok.push(["the printed report separates the engine ASKED FOR from the engine that actually ran",
    printed.includes("Engines that produced a passing cell: chromium")]);
  /* The auditor's plant: CENSUS_ENGINE=webkit on a machine with no WebKit.
     Every cell fails, and the coverage paragraph used to answer "Engines:
     webkit" and drop the line saying WebKit never ran. */
  const askedNotRun = build([...many(CONTROL_PROJECT, CONTROLS, "failed"), ...many("desktop", CELLS, "failed")],
    {}, { projects: [{ name: CONTROL_PROJECT, metadata: { engine: "webkit" } },
                     { name: "desktop", metadata: { engine: "webkit" } }] });
  const printedNotRun = render(judge(askedNotRun, FRESH));
  ok.push(["an engine that was asked for and never launched is not counted as coverage",
    printedNotRun.includes("webkit was asked for and produced no passing cell")
    && printedNotRun.includes("WebKit did not run at all in this report")
    && printedNotRun.includes("Engines that produced a passing cell: none")]);
  const noEngine = build([...many(CONTROL_PROJECT, CONTROLS), ...many("desktop", CELLS)], {}, { projects: [{ name: "desktop" }] });
  ok.push(["a run whose projects declare no engine says so, rather than guessing from a name",
    render(judge(noEngine, FRESH)).includes("NOT DECLARED")]);
  ok.push(["the printed report carries the problems, not just the exit code",
    render(judge(noControls, FRESH)).includes("proved nothing about its own detectors")]);
  /* And that the tool prints it. A report nothing prints is a report nobody
     reads, and no fixture above would notice.
     TWO GUARDS, because the first version of this control could not fail: it
     searched the whole source for the literal "console.log(render(" — which
     that very line contains, so it found itself and stayed green while the
     real call site was replaced with `void render(judgement)`. That is the
     "a control must not take its pass condition from the thing it is checking"
     shape, made once more in the act of fixing it elsewhere. So the needle is
     assembled from two pieces that never appear joined in this file, and only
     the main path below the self-test is searched. */
  const src = readFileSync(new URL("./census-report.mjs", import.meta.url), "utf8");
  const main = src.slice(src.lastIndexOf("if (process.argv.includes"));
  ok.push(["the tool still prints the report it renders", main.includes("console.log(" + "render(judgement))")]);

  /* THE ROOTS THEMSELVES. Every staleness fixture above injects `now`, so none
     of them touches the list of things being watched — an auditor removed
     app/dist from it and all nineteen controls stayed green. app/dist is the
     one that matters: the census serves the BUILT bundle through vite preview,
     so a source edit with no rebuild is invisible unless the bundle is watched. */
  for (const root of ["app/dist", "app/src", "app/public", "src", "tools/ux-census.mjs",
                      "tools/census-novelties.mjs", "tests/census", "playwright.config.mjs"])
    ok.push([`the staleness scan watches ${root}`, WATCHED.includes(root)]);
  /* And that the walker can read them. Three of the roots are single FILES,
     and readdirSync throws on a file — the version that only walked
     directories would have watched nothing at all through those three. */
  const tmp = mkdtempSync(join(tmpdir(), "census-control-"));
  writeFileSync(join(tmp, "a.txt"), "x");
  ok.push(["the staleness walker reads a directory root", newestSource([tmp]).newest > 0]);
  ok.push(["the staleness walker reads a single-FILE root, which three of the roots are",
    newestSource([join(tmp, "a.txt")]).newest > 0]);
  rmSync(tmp, { recursive: true, force: true });
  /* And that judge() actually calls it. Every fixture passes `now` in, so the
     default argument — the only path the real run takes — is otherwise
     untested. The fixture is dated the year 2000; nothing in this repository
     is that old, so a live scan must call it stale. */
  ok.push(["judge() reads the real tree when nothing is injected, which is what a real run does",
    judge(good).problems.some((p) => p.includes("changed afterwards"))]);

  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\ncensus-report controls: ${ok.length - failed} passed, ${failed} failed`);
  return failed;
}

if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);

if (RUN) {
  /* The old report goes first: a run that produces none must be judged as
     none, not as last time. The runner's exit code is deliberately ignored -
     the judgement below reads every cell and is stricter than the exit code. */
  rmSync(REPORT, { force: true });
  const args = ["node_modules/@playwright/test/cli.js", "test", "--config", CONFIG,
                ...(SCOPE === SCOPES.novelties ? NOVELTY_SPECS : []),
                ...process.argv.slice(2).filter((a) => a !== "--run" && a !== "--novelties")];
  console.log(`census ${SCOPE.name}: ${process.execPath} ${args.join(" ")}`);
  spawnSync(process.execPath, args, { stdio: "inherit" });
}
const judgement = judge(read(REPORT), undefined, SCOPE);
console.log(render(judgement));
process.exit(judgement.problems.length ? 1 : 0);
