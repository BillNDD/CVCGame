/* THE MUTANT RUNNERS' SHARED MECHANICS - batch 3 of the refactor, 2026-09-15.
 *
 * tools/mutants.mjs and tools/app-mutants.mjs ran the suite the same way:
 * record the output, strip the colour mask, read the row with the test
 * totals, and report a pristine failure. Three copies of that span lived in
 * the tree (one per gate plus the inline guard each carried) and two had
 * already drifted a byte apart in the mask. The span lives here now and both
 * gates import it.
 *
 * MECHANICS ONLY. What a mutant is, which file it plants in, what counts as
 * killed, and the lock each gate takes are the gates' own. Nothing here
 * knows one gate from the other.
 *
 * Run: node tools/lib/runner.mjs --self-test
 */
import { pathToFileURL } from "node:url";
import { run as runProcess } from "./proc.mjs";
import { finish } from "./selftest.mjs";

/* The last failure this helper swallowed, so the pristine control can SAY
   what went wrong instead of only that something did. Beta 25's gauntlet
   spent a run on "the pristine suite does not pass" with no name attached,
   and the suite passed three times in a row afterwards - a report that
   cannot name the failure cannot be diagnosed (the owner's deflaking rule,
   2026-08-21). */
let lastRunOutput = "";
export const run = (cmd, args) => {
  const r = runProcess(cmd, args);
  lastRunOutput = r.status === 0 ? "" : r.out;
  return r.status === 0;
};

/* A mutant is KILLED only when a TEST FAILED. A non-zero exit alone is not
   proof: a mutant that breaks the parse, crashes the runner, or kills the
   environment exits non-zero too, and scoring that as a kill claims
   protection the suite never demonstrated. Three outcomes, not two —
   killed, survived, and errored — and an error fails the gate rather than
   passing as a kill. */
export const ANSI = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*[A-Za-z]", "g");
/* Read the TESTS row, not the TEST FILES row. Vitest prints both, file first:
       Test Files  1 failed | 1 passed (2)
             Tests  2 passed (2)
   A file that throws at import fails as a FILE while zero tests fail, so a
   loose /(\d+) failed/ matched the file row and announced a crashed suite as
   "killed (1 test failed)" - the exact false kill this function exists to
   prevent. Caught by review and reproduced against vitest 2.1.9 on
   2026-08-10. "Tests" plus whitespace cannot match "Test Files": there is no
   "s" after "Test" there. The control below pins both shapes. */
export const testsFailed = (out) => {
  const m = out.match(/\bTests\s+(\d+) failed/);
  return m ? Number(m[1]) : 0;
};
{
  const crashed = "Test Files  1 failed | 1 passed (2)\n      Tests  2 passed (2)\n";
  const real = "Test Files  1 failed (13)\n      Tests  3 failed | 327 passed (330)\n";
  if (testsFailed(crashed) !== 0 || testsFailed(real) !== 3) {
    console.error("control FAILED: the failure parser must read the Tests row, not Test Files");
    process.exit(1);
  }
}
export function runTests() {
  try {
    /* Through Node's own binary, never "npx": execFileSync takes no shell, so
       on Windows the npx.cmd shim cannot be resolved (and newer Node refuses
       .cmd without a shell outright). Every mutant run then "failed", and the
       pristine-suite control - doing exactly its job - refused the gate.
       Found 2026-08-15, the fourth Windows-only gate fault of the move. */
    /* --bail 1 (P1 of the speed plan, 2026-08-21): a mutant is killed by ONE
       failing test, and the suite used to run all 380 to find it. vitest
       stops at the first failure and still prints the "Tests N failed" row
       this runner reads, so the verdict is unchanged and only the time moves.
       The pristine control above runs WITHOUT bail: a clean suite has nothing
       to stop at, and that run must prove every file green. */
    const r = runProcess(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--reporter=dot", "--bail", "1"],
      { env: { ...process.env, NO_COLOR: "1" } });
    if (r.status === 0) return { passed: true, failed: 0 };
    return { passed: false, failed: testsFailed(r.out.replace(ANSI, "")) };
  } catch (e) {
    /* runProcess never throws on an exit; this is the runner's own fault, and
       an errored mutant, never a kill. */
    return { passed: false, failed: 0, error: String(e && e.message ? e.message : e) };
  }
}
export function lastOutput() { return lastRunOutput; }

export function failureReport(out) {
  const lines = out.split(String.fromCharCode(10));
  const report = [];
  for (const l of lines) if (/(FAIL|×|✕|AssertionError|Error:)/.test(l)) report.push("  " + l.trim().slice(0, 200));
  report.push("  ---- tail ----", lines.slice(-25).join(String.fromCharCode(10)));
  return report.join(String.fromCharCode(10));
}

function selfTest() {
  const ok = [];
  const T = (name, pass) => ok.push([name, pass]);
  const crashed = "Test Files  1 failed | 1 passed (2)\n      Tests  2 passed (2)\n";
  const real = "Test Files  1 failed (13)\n      Tests  3 failed | 327 passed (330)\n";
  T("the failure parser reads the Tests row, not Test Files", testsFailed(crashed) === 0);
  T("the parser counts three on the real shape", testsFailed(real) === 3);
  const nl = String.fromCharCode(10);
  const tail = Array.from({ length: 25 }, (_, i) => "tail " + i);
  const sample = ["quiet", "FAIL first", "no match", "Error: second", "× chunker", "AssertionError: boom", ...tail].join(nl);
  const expected = ["  FAIL first", "  Error: second", "  × chunker", "  AssertionError: boom", "  ---- tail ----", ...tail].join(nl);
  T("the failure report keeps matching lines and the 25-line tail", failureReport(sample) === expected);
  const long = "  FAIL " + "x".repeat(300);
  T("the failure report trims a matching line to 200 characters", failureReport(long).split(nl)[0] === "  " + long.trim().slice(0, 200));
  T("the mask strips one escape sequence", ("a" + String.fromCharCode(27) + "[31mred").replace(ANSI, "") === "ared");
  return finish("runner", ok);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href && process.argv.includes("--self-test")) {
  process.exit(selfTest() ? 1 : 0);
}
