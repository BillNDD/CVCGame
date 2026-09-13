/* QA-procedure structure check (gate G12). The manual script must have 20 or
   more numbered steps, and every step must carry an "Expected:" line. The
   floor lives in .claude/gate-baseline.json (g12_qa_steps).
   Negative control: --self-test feeds a fixture with a step that has no
   Expected line, and the checker must report it. */
import { readFileSync } from "node:fs";
import { finish } from "./lib/selftest.mjs";
import { loadBaseline } from "./lib/baseline.mjs";
import { printProblems, verdict } from "./lib/report.mjs";

const DOC = "docs/qa-procedure.md";

function check(text) {
  const lines = text.split("\n");
  const problems = [];
  let steps = 0;
  for (let i = 0; i < lines.length; i++) {
    /* A lettered sub-step — "7b." — is a step: it carries its own action and
       its own Expected line, and the sentence-attempt step of 2026-08-15 was
       inserted that way so thirty-four later steps (and every "step 37"-style
       reference in other documents) kept their numbers. The first version of
       this counter saw only bare numbers, so that step existed OUTSIDE the
       floor — present in the document and protected by nothing. */
    if (/^\s*\d+[a-z]?\.\s/.test(lines[i])) {
      steps += 1;
      if (!/^\s*Expected:/.test(lines[i + 1] || "")) {
        problems.push(`step without an Expected line: "${lines[i].trim().slice(0, 50)}"`);
      }
    }
  }
  return { steps, problems };
}

if (process.argv.includes("--self-test")) {
  const fixture = "1. Do a thing.\n   Expected: It works.\n2. Do another thing.\n3. Third thing.\n   Expected: Fine.\n3b. Lettered sub-step.\n   Expected: Counted like any other.\n3c. Lettered sub-step with no Expected.";
  const r = check(fixture);
  /* Literal (E4): four well-formed steps plus two faults — the bare step 2
     and the lettered 3c, both missing Expected. A lettered step must be
     COUNTED and must be HELD to the same rule. */
  const failed = finish("qa-check", [
    ["the missing Expected line is reported, on bare and lettered steps alike", r.problems.length === 2],
    ["a lettered step counts", r.steps === 5],
  ]);
  if (failed) { console.error("self-test FAILED: " + JSON.stringify(r)); process.exit(1); }
  console.log("self-test OK: the missing Expected line is reported, on bare and lettered steps alike, and a lettered step counts");
  process.exit(0);
}

const baseline = loadBaseline();
const { steps, problems } = check(readFileSync(DOC, "utf8"));
const floor = Math.max(20, baseline.floor("g12_qa_steps"));
if (steps < floor) problems.push(`only ${steps} steps; the floor is ${floor}`);
console.log(verdict("QA procedure", `${steps} steps`, problems.length));
printProblems(problems, { print: console.error });
process.exit(problems.length ? 1 : 0);
