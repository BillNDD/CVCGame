/* Coverage calibration (G6's negative control, rule E5).
   Command: npm run check:coverage-control

   Every other detector in this repository ships with a control that proves it
   catches its target fault. Coverage was the exception: it reported a number
   and the gauntlet compared that number with a floor, with nothing proving
   the meter was measuring anything at all. A drifted include glob, a stale
   generated engine, or a provider that quietly stopped instrumenting would
   still print a healthy table and still clear every floor.

   So the meter is calibrated against fixtures whose true coverage is known by
   construction, exactly as a scale is checked with a known weight:

     full.js     — every branch exercised   -> must report 100% lines AND 100% branches
     partial.js  — one branch never taken   -> must report BELOW 100% branches, above 0
     untested.js — no test touches it       -> must report 0% lines

   If the meter cannot tell these three apart, its numbers about the real
   sources mean nothing, and this gate says so instead of the floors passing
   in silence.

   The fixtures live in a throwaway directory inside the repository and are
   deleted again on the way out. Inside, because the run must use THIS
   project's vitest and its coverage provider — the thing being calibrated —
   and a root outside the tree resolves a different, unrelated vitest. The
   directory is gitignored and its own config limits coverage to itself, so
   the fixtures can never be mistaken for product code or reach the real
   run's numbers. */
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const root = ".cov-control";
rmSync(root, { recursive: true, force: true });
mkdirSync(join(root, "src"), { recursive: true });
mkdirSync(join(root, "test"), { recursive: true });

/* Both branches reachable and both taken by the test. */
writeFileSync(join(root, "src/full.js"), `export function sign(n) {
  if (n < 0) return "neg";
  return "pos";
}
`);
/* Both branches reachable; the test takes only one. */
writeFileSync(join(root, "src/partial.js"), `export function grade(n) {
  if (n > 10) return "big";
  return "small";
}
`);
/* Reachable, and nothing calls it. */
writeFileSync(join(root, "src/untested.js"), `export function lonely(n) {
  if (n) return 1;
  return 0;
}
`);

writeFileSync(join(root, "test/fixtures.test.js"), `import { describe, it, expect } from "vitest";
import { sign } from "../src/full.js";
import { grade } from "../src/partial.js";

describe("calibration fixtures", () => {
  it("takes both branches of full.js", () => {
    expect(sign(-1)).toBe("neg");
    expect(sign(1)).toBe("pos");
  });
  it("takes only one branch of partial.js", () => {
    expect(grade(1)).toBe("small");
  });
});
`);

writeFileSync(join(root, "vitest.config.mjs"), `export default {
  test: {
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.js"],
      reporter: ["text"],
    },
  },
};
`);

let out = "";
try {
  /* vitest through node itself, the mutant runners' own fix: a .bin shell
     script is not executable under the Windows default shell. */
  out = execSync(`"${process.execPath}" node_modules/vitest/vitest.mjs run --coverage --root ${root}`, {
    stdio: "pipe", encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
} catch (e) {
  out = String(e.stdout || "") + String(e.stderr || "");
}
out = out.replace(/\[[0-9;]*[A-Za-z]/g, "");

/* A row is: name | % Stmts | % Branch | % Funcs | % Lines | uncovered */
const row = (file) => {
  const m = out.match(new RegExp(`\\n\\s*${file}\\s*\\|\\s*([\\d.]+)\\s*\\|\\s*([\\d.]+)\\s*\\|\\s*([\\d.]+)\\s*\\|\\s*([\\d.]+)`));
  return m ? { stmts: +m[1], branches: +m[2], funcs: +m[3], lines: +m[4] } : null;
};

const full = row("full\\.js"), partial = row("partial\\.js"), untested = row("untested\\.js");
const problems = [];
const say = (name, r) => `${name}=${r ? `${r.lines}% lines/${r.branches}% branches` : "NOT REPORTED"}`;

if (!full || !partial || !untested)
  problems.push(`the coverage table did not report all three fixtures: ${say("full", full)}, ${say("partial", partial)}, ${say("untested", untested)}`);
else {
  if (full.lines !== 100 || full.branches !== 100)
    problems.push(`a fully exercised file must report 100/100, reported ${full.lines}/${full.branches}`);
  if (!(partial.branches < 100))
    problems.push(`a file with an untaken branch must report below 100% branches, reported ${partial.branches}`);
  if (!(partial.branches > 0))
    problems.push(`a partly exercised file must report above 0% branches, reported ${partial.branches}`);
  if (untested.lines !== 0)
    problems.push(`a file no test touches must report 0% lines, reported ${untested.lines}`);
}
if (!/v8|istanbul/.test(out) && !full)
  problems.push("no coverage provider output was found at all");

rmSync(root, { recursive: true, force: true });

problems.forEach((p) => console.error(`  PROBLEM: ${p}`));
if (full && partial && untested)
  console.log(`Coverage control: ${say("full", full)}, ${say("partial", partial)}, ${say("untested", untested)}`);
console.log(`Coverage calibration: 3 fixtures, ${problems.length} problems`);
if (!problems.length)
  console.log("control OK: the meter reports 100 for a fully exercised file, less for an untaken branch, and 0 for a file no test touches");
process.exit(problems.length ? 1 : 0);
