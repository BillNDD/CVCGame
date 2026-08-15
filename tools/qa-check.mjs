/* QA-procedure structure check (gate G12). The manual script must have 20 or
   more numbered steps, and every step must carry an "Expected:" line. The
   floor lives in .claude/gate-baseline.json (g12_qa_steps).
   Negative control: --self-test feeds a fixture with a step that has no
   Expected line, and the checker must report it. */
import { readFileSync } from "node:fs";

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
  if (r.steps === 5 && r.problems.length === 2) { console.log("self-test OK: the missing Expected line is reported, on bare and lettered steps alike, and a lettered step counts"); process.exit(0); }
  console.error("self-test FAILED: " + JSON.stringify(r));
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(".claude/gate-baseline.json", "utf8"));
const { steps, problems } = check(readFileSync(DOC, "utf8"));
const floor = Math.max(20, baseline.g12_qa_steps || 0);
if (steps < floor) problems.push(`only ${steps} steps; the floor is ${floor}`);
console.log(`QA procedure: ${steps} steps, ${problems.length} problems`);
problems.forEach((p) => console.error("  PROBLEM: " + p));
process.exit(problems.length ? 1 : 0);
