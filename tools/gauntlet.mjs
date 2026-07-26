/* The gauntlet (docs/testing-gauntlet.md, Aggregation). Runs every automatic
   gate in order, parses the counts from each command, and compares them with
   the floors and ceilings in .claude/gate-baseline.json. One line per gate:
   name, command, pass or fail, counts. A red gauntlet blocks the change (E7).
   Run: npm run gauntlet */
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, rmdirSync } from "node:fs";

/* One gauntlet at a time: G4 mutates tests/generated mid-run, so a second
   concurrent run sees mutant residue and fails for the wrong reason. */
try {
  mkdirSync(".gauntlet.lock");
} catch {
  console.error("Another gauntlet appears to be running. Remove .gauntlet.lock if it is stale.");
  process.exit(1);
}
process.on("exit", () => { try { rmdirSync(".gauntlet.lock"); } catch {} });

const baseline = JSON.parse(readFileSync(".claude/gate-baseline.json", "utf8"));

/* Vitest and friends color their output when the CI variable is set, and the
   color codes hide the counts from the regexes below (every count reads "?").
   Ask child processes for plain output, and strip any codes that arrive
   anyway. The control proves colored text defeats the raw regex and the
   cleaner recovers it (E5). */
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;
{
  const colored = "engine.test.js \u001b[2m(\u001b[22m\u001b[2m56 tests\u001b[22m\u001b[2m)\u001b[22m";
  const probe = /engine\.test\.js\s+\((\d+) tests\)/;
  if (probe.test(colored) || !probe.test(colored.replace(ANSI, ""))) {
    console.error("control FAILED: the ANSI cleaner does not recover a count that color codes hide");
    process.exit(1);
  }
}

let failures = 0;
const summary = [];

function report(gate, command, ok, counts) {
  if (!ok) failures += 1;
  summary.push(`${ok ? "PASS" : "FAIL"}  ${gate.padEnd(22)} ${counts}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${gate}  [${command}]  ${counts}`);
}

function step(gate, command, counts = [], env = {}) {
  let out = "", ok = true;
  try {
    out = execSync(command, { stdio: "pipe", encoding: "utf8", env: { ...process.env, NO_COLOR: "1", ...env } });
  } catch (e) {
    out = String(e.stdout || "") + String(e.stderr || "");
    ok = false;
  }
  out = out.replace(ANSI, "");
  const parts = [];
  for (const c of counts) {
    const m = out.match(c.regex);
    const n = m ? Number(m[1]) : c.default !== undefined ? c.default : NaN;
    let pass = !Number.isNaN(n);
    let bound = "";
    if (c.floorKey) { pass = pass && n >= baseline[c.floorKey]; bound = ` (floor ${baseline[c.floorKey]})`; }
    if (c.maxKey) { pass = pass && n <= baseline[c.maxKey]; bound = ` (max ${baseline[c.maxKey]})`; }
    if (c.min !== undefined) { pass = pass && n >= c.min; bound = ` (min ${c.min})`; }
    if (c.max !== undefined) { pass = pass && n <= c.max; bound = ` (max ${c.max})`; }
    if (!pass) ok = false;
    parts.push(`${c.label}=${Number.isNaN(n) ? "?" : n}${bound}${pass ? "" : " <-- FAIL"}`);
  }
  report(gate, command, ok, parts.join(", "));
  if (!ok) console.log("---- output tail ----\n" + out.split("\n").slice(-15).join("\n"));
  return out;
}

step("extract engine", "node tools/extract-engine.mjs");

step("G11 copy", "node tools/copy-lint.mjs && node tools/copy-lint.mjs --self-test", [
  { label: "rules", regex: /Copy gate: (\d+) rules/, floorKey: "g11_copy_rules" },
  { label: "problems", regex: /(\d+) problems/, max: 0 },
]);

step("G1+G2+G9+G10 tests", "npx vitest run", [
  { label: "unit", regex: /engine\.test\.js\s+\((\d+) tests\)/, floorKey: "g1_unit_tests" },
  { label: "properties", regex: /properties\.test\.js\s+\((\d+) tests\)/, floorKey: "g2_properties" },
  { label: "faults", regex: /faults\.test\.js\s+\((\d+) tests\)/, floorKey: "g9_fault_tests" },
  { label: "safety", regex: /safety\.test\.js\s+\((\d+) tests\)/, floorKey: "g10_safety_tests" },
  { label: "acceptance", regex: /acceptance\.test\.js\s+\((\d+) tests\)/, floorKey: "g3_generated_tests" },
  { label: "failed", regex: /(\d+) failed/, max: 0, default: 0 },
]);

/* G2 structural check: every property runs through the shared RUNS constant,
   and RUNS carries at least the baseline case count. */
{
  const src = readFileSync("tests/properties.test.js", "utf8");
  const def = src.match(/const RUNS = \{ numRuns: (\d+) \}/);
  const cases = def ? Number(def[1]) : 0;
  const asserts = (src.match(/fc\.assert\(/g) || []).length;
  const runsUses = (src.match(/\bRUNS\b/g) || []).length - 1;
  const single = (src.match(/numRuns/g) || []).length === 1;
  const ok = cases >= baseline.g2_cases_per_property && asserts > 0 && runsUses === asserts && single;
  report("G2 cases", "structural check of tests/properties.test.js", ok,
    `cases_per_property=${cases} (floor ${baseline.g2_cases_per_property}), asserts=${asserts}, via_RUNS=${runsUses}`);
}

/* The porcelain check also catches a committed deletion of a generated file:
   git diff alone cannot see the regenerated file arriving as untracked. */
step("G3 regeneration", 'npm run gen:acceptance && git diff --exit-code -- tests/generated && test -z "$(git status --porcelain -- tests/generated)"', [
  { label: "scenarios", regex: /(\d+) scenarios[,)]/, floorKey: "g3_scenarios" },
  { label: "generated", regex: /(\d+) tests\)/, floorKey: "g3_generated_tests" },
]);

step("G4 acceptance-mutants", "node tools/acceptance-mutants.mjs --self-test && node tools/acceptance-mutants.mjs", [
  { label: "mutants", regex: /gate: (\d+) mutants/, floorKey: "g4_acceptance_mutants" },
  { label: "survived", regex: /(\d+) survived/, maxKey: "g4_survivors_max" },
]);

step("G5 source-mutants", "node tools/mutants.mjs", [
  { label: "mutants", regex: /gate: (\d+) mutants/, floorKey: "g5_source_mutants" },
  { label: "survived", regex: /(\d+) survived/, maxKey: "g5_survivors_max" },
]);

step("G6 coverage", "npx vitest run --coverage", [
  { label: "branches", regex: /engine\.js\s*\|\s*[\d.]+\s*\|\s*([\d.]+)/, floorKey: "g6_branches_min" },
  { label: "lines", regex: /engine\.js\s*\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*([\d.]+)/, floorKey: "g6_lines_min" },
]);

step("G6 quality", "npx eslint . && node tools/dep-cycles.mjs && node tools/quality-control.mjs", [
  { label: "cycles", regex: /Dependency cycles: (\d+)/, maxKey: "g6_dependency_cycles_max" },
]);

step("app build", "npm --prefix app run build");

step("G7 interface", "node tests/ui/interface.mjs", [
  { label: "checks", regex: /(\d+) checks passed/, floorKey: "g7_interface_checks" },
  { label: "failed", regex: /(\d+) failed/, max: 0 },
], { WQ_SKIP_BUILD: "1" });

step("G8 accessibility", "node tests/ui/a11y.mjs", [
  { label: "checks", regex: /(\d+) checks passed/, floorKey: "g8_checks" },
  { label: "failed", regex: /(\d+) failed/, maxKey: "g8_axe_violations_max" },
], { WQ_SKIP_BUILD: "1" });

step("G12 qa-procedure", "node tools/qa-check.mjs && node tools/qa-check.mjs --self-test", [
  { label: "steps", regex: /(\d+) steps/, floorKey: "g12_qa_steps" },
]);

console.log("\n================ GAUNTLET ================");
summary.forEach((l) => console.log(l));
console.log(`\nGauntlet: ${summary.length} gates, ${failures} failed`);
process.exit(failures ? 1 : 0);
