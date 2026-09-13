/* THE SELF-TEST RUNNER - batch 1 of the refactor, owner-ruled 2026-09-12.
 *
 * Forty tools each carried their own copy of the same dozen lines: walk a
 * list of [name, passed] controls, print "ok   " or "FAIL " before each name,
 * count the failures, print "<tool> controls: N passed, M failed", and exit 1
 * on any failure. The shape gate counted three of those copies as duplicated
 * regions on the day it was born. This file is the one copy.
 *
 * MECHANICS ONLY. What a control asserts, what it is named and which fault it
 * plants stay in the tool that owns them - the oracle line of the batch-1
 * brief. This file knows nothing about any gate.
 *
 * The one judgement it makes is E5's: a self-test that ran ZERO controls is
 * refused - a FAIL line and a summary of "0 passed, 1 failed", never a green
 * run - because a scaffold whose control list an edit emptied must not print
 * "0 failed".
 *
 * The printed shape is the one tools/gauntlet.mjs reads: the summary matches
 * /<tool> controls: (\d+) passed/, and a control the gauntlet requires by name
 * is found in the output as "ok   <name>".
 *
 * Run: node tools/lib/selftest.mjs --self-test
 */
import { pathToFileURL } from "node:url";

/**
 * The lines and the counts, with nothing printed: the pure half, so a caller
 * can read them back.
 * @param {string} tool
 * @param {Array<unknown[]>} controls
 */
function summarise(tool, controls) {
  const list = Array.isArray(controls) ? controls : [];
  if (list.length === 0) {
    return {
      lines: [`FAIL ${tool} self-test ran zero controls - a self-test with nothing in it proves nothing (E5)`],
      summary: `${tool} controls: 0 passed, 1 failed`,
      passed: 0, failed: 1,
    };
  }
  const lines = list.map(([name, pass]) => (pass ? "ok   " : "FAIL ") + name);
  const failed = list.filter(([, pass]) => !pass).length;
  return { lines, summary: `${tool} controls: ${list.length - failed} passed, ${failed} failed`, passed: list.length - failed, failed };
}

/**
 * Print every control line, a blank line, then the summary; return the number
 * that failed, so a caller exits with it. `suffix` rides the summary line
 * (the E11 lookup names a bailed run there).
 * @param {string} tool
 * @param {Array<unknown[]>} controls
 * @param {{ print?: (line: string) => void, suffix?: string }} [opts]
 */
export function finish(tool, controls, { print = console.log, suffix = "" } = {}) {
  const r = summarise(tool, controls);
  for (const line of r.lines) print(line);
  print("\n" + r.summary + suffix);
  return r.failed;
}

/* ---------------------------------------------------------- controls --
   Planted lists through the shipped functions. The refusal of an empty list
   is the control that matters: without it a scaffold can print "0 failed"
   over nothing. */
/** @param {(name: string, pass: unknown) => void} T */
function summaryControls(T) {
  const mixed = summarise("probe", [["one holds", true], ["two holds", 1], ["three breaks", false]]);
  T("a passing control prints as ok followed by three spaces and its name", mixed.lines[0] === "ok   one holds");
  T("a truthy value that is not a boolean still counts as a pass", mixed.lines[1] === "ok   two holds");
  T("a failing control prints as FAIL followed by its name", mixed.lines[2] === "FAIL three breaks");
  T("the summary counts two passed and one failed", mixed.summary === "probe controls: 2 passed, 1 failed" && mixed.passed === 2 && mixed.failed === 1);
  T("the summary is the shape the gauntlet reads: /controls: (\\d+) passed/", /^probe controls: (\d+) passed, (\d+) failed$/.test(mixed.summary));
  const empty = summarise("probe", []);
  const refused = empty.failed === 1 && empty.passed === 0 && empty.lines.length === 1;
  T("a self-test that ran zero controls is refused as a FAIL line naming E5, never as a green run",
    refused && /^FAIL /.test(empty.lines[0]) && empty.lines[0].includes("E5") && empty.summary === "probe controls: 0 passed, 1 failed");
  T("a control list that is not a list is refused the same way", summarise("probe", /** @type {any} */ (undefined)).failed === 1);
}
/** @param {(name: string, pass: unknown) => void} T */
function finishControls(T) {
  const printed = [];
  const failed = finish("probe", [["a", true], ["b", false]], { print: (l) => printed.push(l), suffix: " (bailed)" });
  const shape = printed.length === 3 && printed[0] === "ok   a" && printed[1] === "FAIL b";
  T("finish prints the control lines, then a blank line and the summary, through the printer it is given",
    shape && printed[2] === "\nprobe controls: 1 passed, 1 failed (bailed)");
  T("finish returns the number that failed", failed === 1);
  T("finish returns zero when every control holds", finish("probe", [["a", true]], { print: () => {} }) === 0);
}
function selfTest() {
  const ok = [];
  const T = (name, pass) => ok.push([name, pass]);
  summaryControls(T);
  finishControls(T);
  return finish("selftest", ok);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href && process.argv.includes("--self-test")) {
  process.exit(selfTest() ? 1 : 0);
}
