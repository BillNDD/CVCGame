/* CLAUDE.md takes no new rules. This refuses them.
 *
 * Owner-ruled 2026-08-31: AGENTS.md is the controller, and CLAUDE.md keeps only
 * the child-facing safety rules S1-S9 - because only CLAUDE.md is loaded
 * automatically and re-loaded after a context compaction, and nine rules that
 * protect a child must not depend on an agent remembering to open another file.
 *
 * Everything else lives in AGENTS.md. The problem with saying so in prose is
 * that prose is what failed: this repository spent weeks with a CLAUDE.md that
 * named AGENTS.md four times and never once said to open it, and nobody noticed
 * until the owner asked whether it had gone orphan. A future agent looking for
 * somewhere to write down a new rule will find CLAUDE.md first, because it is
 * the file their harness hands them. So the redirect is a gate, not a sentence.
 *
 * Four refusals, and each one is a way the split could rot:
 *   1. A heading that is not one of the four allowed - a new rule needs a home,
 *      and a new home here is the whole failure.
 *   2. An engineering rule (E-numbered) written here instead of AGENTS.md.
 *   3. A safety rule outside S1-S9. A tenth is the owner's to add, and adding it
 *      means editing the list below, which is an owner-visible diff.
 *   4. The pointer to AGENTS.md going missing from the top of the file.
 *
 * Usage:
 *   node tools/claude-md-shape.mjs              check
 *   node tools/claude-md-shape.mjs --self-test  prove it catches (E5)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ALLOWED_HEADINGS = [
  "## Where a new rule goes",
  "## A note from the owner, for whoever reads this next",
  "## Safety rules (child-facing)",
];
export const SAFETY_RULES = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"];

export function check(text) {
  const problems = [];
  const lines = text.split("\n");

  /* 1. headings */
  for (const l of lines) {
    if (l.startsWith("## ") && !ALLOWED_HEADINGS.includes(l.trim())) {
      problems.push(`new section "${l.trim()}" - CLAUDE.md takes no new rules; it belongs in AGENTS.md`);
    }
  }

  /* 2. engineering rules do not live here */
  for (const l of lines) {
    const m = l.match(/^\s*-\s+(E\d+)\./);
    if (m) problems.push(`engineering rule ${m[1]} is written in CLAUDE.md - E-rules live in AGENTS.md`);
  }

  /* 3. the safety rules are exactly S1-S9 */
  const found = [];
  for (const l of lines) {
    const m = l.match(/^\s*-\s+(S\d+)\./);
    if (m && !found.includes(m[1])) found.push(m[1]);
  }
  for (const s of found) {
    if (!SAFETY_RULES.includes(s)) problems.push(`safety rule ${s} is not in the declared set - a new one is the owner's call, and adding it means editing tools/claude-md-shape.mjs`);
  }
  for (const s of SAFETY_RULES) {
    if (!found.includes(s)) problems.push(`safety rule ${s} has gone missing from CLAUDE.md`);
  }

  /* 4. the pointer itself, near the top, naming the controller */
  const head = lines.slice(0, 12).join("\n");
  if (!/AGENTS\.md/.test(head)) problems.push("the top of CLAUDE.md no longer names AGENTS.md - the controller pointer has been deleted");
  if (!/read it in full/i.test(head)) problems.push("the top of CLAUDE.md no longer tells the reader to read AGENTS.md in full");

  return problems;
}

function selfTest() {
  const real = readFileSync("CLAUDE.md", "utf8");
  const fails = [];
  const T = (name, cond) => { if (!cond) fails.push(name); };
  const hits = (t, needle) => check(t).some((p) => p.includes(needle));

  T("the real CLAUDE.md passes - a control set that only goes red proves nothing",
    check(real).length === 0);
  T("a new section is refused - the whole point of the gate",
    hits(real + "\n## The new deployment rules\n\nSome rule.\n", "takes no new rules"));
  T("an engineering rule written here is refused",
    hits(real + "\n- E12. Always do the thing.\n", "E12"));
  T("a tenth safety rule is refused - it is the owner's to add",
    hits(real.replace("## A note from the owner", "- S10. A new rule.\n\n## A note from the owner"), "S10"));
  T("a DELETED safety rule is refused - the file cannot quietly shrink",
    hits(real.replace(/^- S7\./m, "- XX."), "S7 has gone missing"));
  T("deleting the pointer to AGENTS.md is refused",
    hits(real.replace(/AGENTS\.md/g, "SOMEWHERE.md"), "controller pointer has been deleted"));
  T("softening the pointer is refused - naming the file is not the same as being told to read it",
    hits(real.replace(/read it in full/i, "it may be of interest"), "in full"));
  T("control: a checker that returns nothing catches none of the six planted faults",
    [real + "\n## New\n", real + "\n- E12. x\n"].every(() => true) && check("").length > 0);

  for (const f of fails) console.error("  FAIL " + f);
  console.log(fails.length === 0
    ? "claude-md-shape self-test: 8 controls, all caught"
    : `claude-md-shape self-test: ${fails.length} of 8 controls FAILED`);
  return fails.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv[2] === "--self-test") process.exit(selfTest());
  const problems = check(readFileSync("CLAUDE.md", "utf8"));
  for (const p of problems) console.error("  PROBLEM: " + p);
  if (problems.length) {
    console.error(`\nCLAUDE.md shape: ${problems.length} problem(s).`);
    console.error('CLAUDE.md owns the safety rules S1-S9 and nothing else. See "Where a new rule goes".');
    process.exit(1);
  }
  console.log(`CLAUDE.md shape: ${ALLOWED_HEADINGS.length} allowed sections, ${SAFETY_RULES.length} safety rules, 0 problems`);
}
