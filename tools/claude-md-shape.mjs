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
import { execSync } from "node:child_process";
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

/* ---- and what the REST of the repository may credit CLAUDE.md with ----
 *
 * The shape check above stops rules being written INTO CLAUDE.md. It does
 * nothing about the other direction, which is the one that actually kept
 * happening: a document elsewhere still saying "CLAUDE.md E6", or "'What counts
 * as finished work' (CLAUDE.md)", after both moved to AGENTS.md. No gate could
 * see it. G23 refuses a document carrying a fact it does not OWN, and prose
 * naming the WRONG owner is not that shape - that is fault F3, and on
 * 2026-08-31 it bit four times in one afternoon, twice inside AGENTS.md's own
 * opening paragraph, and eighteen more times across the tree.
 *
 * It became checkable only because the split left CLAUDE.md owning exactly one
 * thing. So the rule is: a line that CREDITS CLAUDE.md with a rule must be
 * talking about a safety rule. If it attributes and never mentions S1-S9 or
 * safety, then whatever it names lives in AGENTS.md and the sentence is stale.
 *
 * Deliberately narrow, and the narrowness is the point - a gate that cried wolf
 * here would be turned off. It fires only on an attributing verb, because
 * naming the file is not crediting it.
 *
 * It reads the line BEFORE and the line AFTER as well, and both directions were
 * paid for. The first version read only forward and reported four faults that
 * were not faults: "Safety rule S8 in / CLAUDE.md owns the list of those units"
 * wraps so that the verb lands a line below the word that makes it true, and
 * the two install guides and safety-cover.mjs all break the same way. A gate
 * whose first four findings are wrong is a gate someone switches off, so the
 * window is a sentence's worth of context, not a line's.
 *
 * What it cannot do: catch a sentence that credits CLAUDE.md with a safety rule
 * it does not actually have. That is still a person's job - but there are nine
 * rules, they are on one screen, and this gate is what makes that the ONLY
 * reading left to do. */
const ATTRIBUTES = /\b(owns?|requires?|forbids?|bans?|refuses?|governs?|carries|carried|mandates?|demands?|is explicit)\b/i;
const ABOUT_SAFETY = /\bS[1-9]\b|safety|child-facing/i;
const E_BESIDE = /CLAUDE\.md[^.\n]{0,24}\bE\d+\b|\bE\d+\b[^.\n]{0,24}CLAUDE\.md/i;

export function attributions(files) {
  const problems = [];
  for (const [path, text] of Object.entries(files)) {
    if (path === "tools/claude-md-shape.mjs") continue;   /* this file explains the rule */
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (!line.includes("CLAUDE.md")) return;
      /* An E-rule named beside CLAUDE.md is stale with no verb needed, and
         needs its own rule: "never raise (CLAUDE.md E6)" - the line the gate
         baseline really carried - credits nothing in words, so the attributing
         test below cannot see it. E1-E11 are AGENTS.md's, full stop. */
      if (E_BESIDE.test(line)) {
        problems.push(`${path}:${i + 1} names an engineering rule as CLAUDE.md's - E1-E11 are AGENTS.md's: "${line.trim().slice(0, 90)}"`);
        return;
      }
      if (!ATTRIBUTES.test(line)) return;
      const window = [lines[i - 1] || "", line, lines[i + 1] || ""].join(" ");
      if (ABOUT_SAFETY.test(window)) return;
      problems.push(`${path}:${i + 1} credits CLAUDE.md with a rule that is not a safety rule - it moved to AGENTS.md: "${line.trim().slice(0, 90)}"`);
    });
  }
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

  /* The stale-credit half. Each planted line is one this repository ACTUALLY
     carried on 2026-08-31, after the split had already made it false. */
  const A = (files) => attributions(files);
  T("catches a bare E-rule named as CLAUDE.md's - the gate-baseline line verbatim, which credits nothing in words",
    A({ "x.json": "never raise (CLAUDE.md E6)." }).length === 1);
  T("catches it the other way round too - the rule named before the file",
    A({ "x.md": "See rule E11 in CLAUDE.md before you start." }).length === 1);
  T('catches "What counts as finished work (CLAUDE.md)" - the line four files carried',
    A({ "x.md": "'What counts as finished work' (CLAUDE.md) governs every change." }).length === 1);
  T("catches AGENTS.md's own opening claim, which is where this went wrong twice",
    A({ "AGENTS.md": "**It does not own** the rules that bind the CHANGE itself - that is `CLAUDE.md`, which\nis the stricter document and wins wherever the two touch." }).length === 1);
  T("catches a before-a-beta rule credited to CLAUDE.md",
    A({ "SPEC.md": "milt is the reason CLAUDE.md now requires the WHOLE bank to be re-screened\nbefore every beta: the first draft lists were screened." }).length === 1);
  T("PASSES a real safety-rule credit - the gate must not cry wolf or it gets turned off",
    A({ "README.md": "privacy rule is safety rule S6 in CLAUDE.md - including the two update checks." }).length === 0);
  T("PASSES when the safety word wraps onto the next line, which is why it reads forward",
    A({ "x.md": "This is the rule CLAUDE.md owns and it is a\nchild-facing safety rule, S4." }).length === 0);
  T("PASSES when the safety word wrapped onto the PREVIOUS line - README's real shape, and the gate's own first four false alarms",
    A({ "README.md": "  A multi-letter unit always shows as one tile. Safety rule S8 in\n  CLAUDE.md owns the list of those units. This file names none of them." }).length === 0);
  T("PASSES a line that merely NAMES the file - naming is not crediting",
    A({ "x.md": "See CLAUDE.md and AGENTS.md for the full picture." }).length === 0);
  T("control: the real tree is clean, so the detector is not simply always red",
    A(trackedText()).length === 0);

  for (const f of fails) console.error("  FAIL " + f);
  console.log(fails.length === 0
    ? "claude-md-shape self-test: 18 controls, all caught"
    : `claude-md-shape self-test: ${fails.length} of 18 controls FAILED`);
  return fails.length ? 1 : 0;
}

/* Every tracked text file, read once. */
function trackedText() {
  const files = {};
  for (const f of execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean)) {
    if (!/\.(md|mjs|js|jsx|json|py|yml|yaml)$/.test(f)) continue;
    try { files[f] = readFileSync(f, "utf8"); } catch { /* unreadable, not this gate's business */ }
  }
  return files;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv[2] === "--self-test") process.exit(selfTest());
  const files = trackedText();
  const problems = [...check(readFileSync("CLAUDE.md", "utf8")), ...attributions(files)];
  for (const p of problems) console.error("  PROBLEM: " + p);
  if (problems.length) {
    console.error(`\nCLAUDE.md shape: ${problems.length} problem(s).`);
    console.error('CLAUDE.md owns the safety rules S1-S9 and nothing else. See "Where a new rule goes".');
    console.error("A rule that is not a safety rule belongs to AGENTS.md, and so does the sentence naming it.");
    process.exit(1);
  }
  console.log(`CLAUDE.md shape: ${ALLOWED_HEADINGS.length} allowed sections, ${SAFETY_RULES.length} safety rules, `
    + `${Object.keys(files).length} files scanned for stale credit, 0 problems`);
}
