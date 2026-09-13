/* THE GATE REPORT - batch 1 of the refactor, owner-ruled 2026-09-12.
 *
 * Twenty-three tools each formatted their own "PROBLEM:" line, at thirty-four
 * sites, and each typed its own one-line verdict. The gauntlet reads that
 * verdict with /(\d+) problems/ and nothing else, so every gate must print
 * the same shape. This file is the one place the shape is written.
 *
 * MECHANICS ONLY. What counts as a problem is the gate's; this file only
 * prints the list it is handed and the line that counts it - the oracle line
 * of the batch-1 brief.
 *
 * Run: node tools/lib/report.mjs --self-test
 */
import { pathToFileURL } from "node:url";
import { finish } from "./selftest.mjs";

/**
 * One "PROBLEM: " line per problem, indented, through the printer given.
 * @param {string[]} problems
 * @param {{ print?: (line: string) => void, indent?: string }} [opts]
 */
export function printProblems(problems, { print = console.log, indent = "  " } = {}) {
  for (const p of problems) print(`${indent}PROBLEM: ${p}`);
}

/**
 * The verdict line: "<gate>: <parts>, N problems" - `parts` is the gate's own
 * counts, already worded ("14 rules"), or empty.
 * @param {string} gate
 * @param {string} parts
 * @param {number} count
 */
export function verdict(gate, parts, count) {
  return `${gate}: ${parts ? parts + ", " : ""}${count} problems`;
}

/* ---------------------------------------------------------- controls -- */
function selfTest() {
  const ok = [];
  const T = (name, pass) => ok.push([name, pass]);
  const printed = [];
  const print = (/** @type {string} */ l) => printed.push(l);
  printProblems(["one", "two"], { print });
  T("every problem is one line, indented two spaces, starting PROBLEM:", printed.length === 2 && printed[0] === "  PROBLEM: one" && printed[1] === "  PROBLEM: two");
  printed.length = 0;
  printProblems([], { print });
  T("no problem prints no line", printed.length === 0);
  printProblems(["bare"], { print, indent: "" });
  T("the indent is the caller's when it says so", printed[0] === "PROBLEM: bare");
  T("the verdict names the gate, its counts and the problem count", verdict("Probe gate", "3 rules", 2) === "Probe gate: 3 rules, 2 problems");
  T("a verdict with no counts of its own has no dangling comma", verdict("Probe gate", "", 0) === "Probe gate: 0 problems");
  T("the verdict is the shape the gauntlet reads: /(\\d+) problems/ gives the count", (/(\d+) problems/.exec(verdict("Probe gate", "3 rules", 12)) || [])[1] === "12");
  return finish("report", ok);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href && process.argv.includes("--self-test")) {
  process.exit(selfTest() ? 1 : 0);
}
