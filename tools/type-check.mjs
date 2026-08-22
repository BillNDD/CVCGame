/* THE TYPE CHECKER IN THE CHECK (owner-ruled 2026-08-22, bug-hunt page,
 * sweeps: A: "@ts-check on tools/ and app/src in the check (4 s)").
 *
 * TypeScript reads the plain JavaScript - checkJs, no conversion - through
 * two configs: app/jsconfig.json (the child-facing app, with DOM types and
 * the build's globals declared in app/src/globals.d.ts) and jsconfig.json
 * (the tools, with Node types). The class of fault it refuses at authoring
 * time is the one that cost a gauntlet on 2026-08-17: a call with its
 * arguments shifted one place, which nothing typed until the run crashed at
 * gate 24 four days later.
 *
 * ZERO ON BOTH SIDES. The first draft of this tool gave the tools side a
 * ceiling of 27 "recorded" findings, and the owner called it what it was -
 * a checker allowed to pass with real findings in it. Every one of the 27
 * was an annotation a few minutes long (fixture unions, browser probes, one
 * reader parameter), and they were written the same hour. The two keys are
 * ceilings of 0 in the baseline so that E6 keeps them there: a finding that
 * arrives is a red check, never a number to raise.
 *
 * Run: node tools/type-check.mjs        Controls: node tools/type-check.mjs --self-test
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASELINE = JSON.parse(readFileSync(".claude/gate-baseline.json", "utf8"));
const TSC = "node_modules/typescript/bin/tsc";

export function countErrors(output) {
  return (output.match(/error TS\d+/g) || []).length;
}
function run(config) {
  const r = spawnSync(process.execPath, [TSC, "-p", config, "--pretty", "false"], { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  return { errors: countErrors(out), out };
}

function selfTest() {
  const ok = [];
  ok.push(["the counter reads the TS error rows", countErrors("a(1,2): error TS2304: x\nb(3,4): error TS2339: y\n") === 2]);
  ok.push(["the counter reads nothing from a clean run", countErrors("") === 0]);
  /* The planted fault: a file whose one line calls a function with its
     arguments shifted - the 2026-08-17 shape - under a config of its own, and
     the checker must count it. A checker that cannot see a planted fault is
     not checking. */
  const box = mkdtempSync(join(tmpdir(), "type-check-"));
  writeFileSync(join(box, "planted.mjs"), 'function step(gate, command, counts) { return [gate, command, counts]; }\nstep("G24", ["a"], "node x", {});\n');
  writeFileSync(join(box, "jsconfig.json"), JSON.stringify({
    compilerOptions: { checkJs: true, allowJs: true, noEmit: true, target: "ES2022", module: "ESNext", strict: false, types: [] },
    include: ["planted.mjs"],
  }));
  const planted = run(join(box, "jsconfig.json"));
  rmSync(box, { recursive: true, force: true });
  ok.push(["a call with its arguments shifted one place is refused", planted.errors >= 1]);
  ok.push(["both ceilings are zero - a checker that allows findings is not checking", BASELINE.tsc_app_errors_max === 0 && BASELINE.tsc_tools_errors_max === 0]);
  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\ntype-check controls: ${ok.length - failed} passed, ${failed} failed`);
  return failed;
}

if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);

const app = run("app/jsconfig.json");
const tools = run("jsconfig.json");
const problems = [];
if (app.errors > BASELINE.tsc_app_errors_max) problems.push(`app: ${app.errors} type error(s), ceiling ${BASELINE.tsc_app_errors_max}`);
if (tools.errors > BASELINE.tsc_tools_errors_max) problems.push(`tools: ${tools.errors} type error(s), ceiling ${BASELINE.tsc_tools_errors_max}`);
if (problems.length) {
  for (const p of problems) console.log("PROBLEM: " + p);
  console.log(app.out.split("\n").filter((l) => /error TS/.test(l)).join("\n"));
  console.log(tools.out.split("\n").filter((l) => /error TS/.test(l)).join("\n"));
}
console.log(`Type check: app ${app.errors} (max ${BASELINE.tsc_app_errors_max}), tools ${tools.errors} (max ${BASELINE.tsc_tools_errors_max}), ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
