/* The gauntlet (docs/testing-gauntlet.md, Aggregation). Runs every automatic
   gate in order, parses the counts from each command, and compares them with
   the floors and ceilings in .claude/gate-baseline.json. One line per gate:
   name, command, pass or fail, counts. A red gauntlet blocks the change (E7).
   Run: npm run gauntlet */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmdirSync } from "node:fs";
import { createHash } from "node:crypto";

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

/* A counter summed across files (a gated suite split at the file-length
   ceiling): every part must match, so a file that vanishes from the run can
   never pass silently. The control proves a missing file reads "?", not a
   smaller number. */
const sumCounts = (out, regexes) => {
  const ms = regexes.map((rx) => out.match(rx));
  return ms.every(Boolean) ? ms.reduce((a, m) => a + Number(m[1]), 0) : NaN;
};
{
  const both = "a.test.js (3 tests)\nb.test.js (2 tests)";
  const rxs = [/a\.test\.js\s+\((\d+) tests\)/, /b\.test\.js\s+\((\d+) tests\)/];
  if (sumCounts(both, rxs) !== 5 || !Number.isNaN(sumCounts("a.test.js (3 tests)", rxs))) {
    console.error("control FAILED: a summed counter must total every file and refuse a missing one");
    process.exit(1);
  }
}

/* A gate's output must CONTAIN the checks it promises, by name. The floors
   count results; they cannot tell a swap from a like-for-like replacement,
   so deleting one check and adding an easier one keeps the total and the
   loss is invisible. A named list closes that: a check that disappears is
   reported even when the count is unchanged.
   The control proves a missing name is caught and a present one is not. */
const missingNames = (out, required) => required.filter((r) => !out.includes(r));
{
  const out = "ok 1: the word holds still\nok 2: no page scroll";
  if (missingNames(out, ["no page scroll"]).length !== 0
      || missingNames(out, ["a check that was deleted"]).length !== 1) {
    console.error("control FAILED: the required-name check must catch a missing name and pass a present one");
    process.exit(1);
  }
}

let failures = 0;
const summary = [];
const results = [];

function report(gate, command, ok, counts, extra = {}) {
  if (!ok) failures += 1;
  summary.push(`${ok ? "PASS" : "FAIL"}  ${gate.padEnd(22)} ${counts}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${gate}  [${command}]  ${counts}`);
  results.push({ gate, command, status: ok ? "PASS" : "FAIL", counts, ...extra });
}

function step(gate, command, counts = [], env = {}, required = []) {
  let out = "", ok = true;
  try {
    out = execSync(command, { stdio: "pipe", encoding: "utf8", env: { ...process.env, NO_COLOR: "1", ...env } });
  } catch (e) {
    out = String(e.stdout || "") + String(e.stderr || "");
    ok = false;
  }
  out = out.replace(ANSI, "");
  const absent = missingNames(out, required);
  if (absent.length) ok = false;
  const parts = [], metrics = [];
  for (const c of counts) {
    let n;
    if (c.regexes) n = sumCounts(out, c.regexes);
    else {
      const m = out.match(c.regex);
      n = m ? Number(m[1]) : c.default !== undefined ? c.default : NaN;
    }
    let pass = !Number.isNaN(n);
    let bound = "";
    if (c.floorKey) { pass = pass && n >= baseline[c.floorKey]; bound = ` (floor ${baseline[c.floorKey]})`; }
    if (c.maxKey) { pass = pass && n <= baseline[c.maxKey]; bound = ` (max ${baseline[c.maxKey]})`; }
    if (c.min !== undefined) { pass = pass && n >= c.min; bound = ` (min ${c.min})`; }
    if (c.max !== undefined) { pass = pass && n <= c.max; bound = ` (max ${c.max})`; }
    if (!pass) ok = false;
    parts.push(`${c.label}=${Number.isNaN(n) ? "?" : n}${bound}${pass ? "" : " <-- FAIL"}`);
    metrics.push({ label: c.label, value: Number.isNaN(n) ? null : n,
                   floor: c.floorKey ? baseline[c.floorKey] : c.min, max: c.maxKey ? baseline[c.maxKey] : c.max,
                   pass });
  }
  if (absent.length) parts.push(`MISSING CHECKS: ${absent.join(" | ")} <-- FAIL`);
  report(gate, command, ok, parts.join(", "), { metrics, missing: absent, required });
  if (!ok) console.log("---- output tail ----\n" + out.split("\n").slice(-15).join("\n"));
  return out;
}

step("extract engine", "node tools/extract-engine.mjs");

/* The derived source lists (owner-ruled 2026-08-17). It guards the three scans
   that had each lost the same files, so it runs where they run. */
step("G11 app-sources", "node tools/app-sources.mjs && node tools/app-sources.mjs --self-test", [
  { label: "controls", regex: /app-sources controls: (\d+) passed/, floorKey: "g11_source_controls" },
], {}, ["ok   a new file is in by default"]);

step("G11 copy", "G11 app-sources", "node tools/copy-lint.mjs && node tools/copy-lint.mjs --self-test", [
  { label: "rules", regex: /Copy gate: (\d+) rules/, floorKey: "g11_copy_rules" },
  { label: "problems", regex: /(\d+) problems/, max: 0 },
]);

step("G1+G2+G9+G10 tests", "npx vitest run", [
  { label: "unit", regex: /engine\.test\.js\s+\((\d+) tests\)/, floorKey: "g1_unit_tests" },
  { label: "scheduler", regex: /scheduler\.test\.js\s+\((\d+) tests\)/, floorKey: "g1_scheduler_tests" },
  { label: "properties", regex: /properties\.test\.js\s+\((\d+) tests\)/, floorKey: "g2_properties" },
  { label: "faults", regex: /faults\.test\.js\s+\((\d+) tests\)/, floorKey: "g9_fault_tests" },
  /* safety.test.js reached the G6 file-length ceiling and split; the floor
     covers the SUM, so no test can vanish from either file. The first regex
     must not also match the second file's name — "safety-splash" does not
     contain the literal "safety.test.js". */
  { label: "safety", regexes: [/safety\.test\.js\s+\((\d+) tests\)/, /safety-splash\.test\.js\s+\((\d+) tests\)/], floorKey: "g10_safety_tests" },
  { label: "adult_controls", regex: /adult-controls\.test\.js\s+\((\d+) tests\)/, floorKey: "g10_adult_control_tests" },
  { label: "reveal", regex: /reveal\.test\.js\s+\((\d+) tests\)/, floorKey: "g10_reveal_tests" },
  { label: "sentence", regex: /sentence\.test\.js\s+\((\d+) tests\)/, floorKey: "g10_sentence_tests" },
  { label: "acceptance", regex: /acceptance\.test\.js\s+\((\d+) tests\)/, floorKey: "g3_generated_tests" },
  { label: "voice", regex: /voicepacks\.test\.js\s+\((\d+) tests\)/, floorKey: "g13_engine_tests" },
  { label: "updates", regex: /updates\.test\.js\s+\((\d+) tests\)/, floorKey: "g14_update_tests" },
  { label: "worker", regex: /serviceworker\.test\.js\s+\((\d+) tests\)/, floorKey: "g14_worker_tests" },
  { label: "failed", regex: /(\d+) failed/, max: 0, default: 0 },
  /* A skipped test still counts in Vitest's per-file "(N tests)" figure, so
     `it.skip` on a required test would keep every floor satisfied and the
     gate green while the behaviour went unprotected. No test is skipped
     today; this makes sure none quietly becomes so. */
  { label: "skipped", regex: /(\d+) skipped/, max: 0, default: 0 },
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
step("G3 regeneration", 'npm run gen:acceptance && git diff --exit-code -- tests/generated && node tools/generated-clean.mjs', [
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

/* Coverage watches the engine AND the app sources. vitest itself enforces the
   app-wide floors (vitest.config.mjs); these counts pin the engine and App.jsx,
   the file every beta.2 microphone fault lived in. */
/* G5 mutates the engine; G19 mutates the half the child touches — the
   transcript rule, the adult hold, the update comparison, the backup
   validator and the free-play write guard. */
/* The E11 lookup is not a gate — it never fails a build on what it reports.
   Its CONTROLS are load-bearing all the same: a lookup that has quietly stopped
   finding things sends an agent into a change believing nothing depends on it.
   Faults are planted in a scratch copy of the file, never in the tree. This
   carries no G number on purpose: G22 is already a cautionary tale about a
   number written into a document before a gate existed (open-faults C4). */
step("E11 lookup-mutants", "node tools/blast-radius-mutants.mjs", [
  { label: "controls", regex: /baseline: (\d+) controls/, floorKey: "e11_lookup_controls" },
  { label: "planted", regex: /(\d+) planted faults/, floorKey: "e11_lookup_mutants" },
  { label: "survived", regex: /(\d+) survived/, maxKey: "e11_lookup_survivors_max" },
  { label: "equivalent", regex: /(\d+) equivalent/, maxKey: "e11_lookup_equivalent_max" },
  { label: "anchors_moved", regex: /(\d+) anchor\(s\) moved/, maxKey: "e11_lookup_anchors_max" },
], {}, [
  /* Pins WHICH fault holds the single equivalence slot. Without this the slot
     could be moved to a different, inconvenient fault with every count
     unchanged. */
  "equivalent: a grandchild still builds its sandbox through git(), which scrubs",
]);

step("G19 app-mutants", "node tools/app-mutants.mjs", [
  { label: "mutants", regex: /gate: (\d+) mutants/, floorKey: "g19_app_mutants" },
  { label: "survived", regex: /(\d+) survived/, maxKey: "g19_survivors_max" },
], {}, [
  /* "a failed match records a miss by itself (breaks S1)" stood here until
     2026-08-12. It was a transcript mutant, and it retired with the microphone
     on the owner's ruling: there is no recognition, so nothing can record a
     miss by itself. The list was not updated with it, so the gauntlet spent a
     release demanding a check that no longer exists. A required-identifier
     list is only as honest as its last retirement.

     S1 IS NOT LEFT WITHOUT AN APP MUTANT: "one attempt records two results"
     below is the grade-once rule, which is S1's other half - only an adult
     records a result, and only once. */
  "killed: one attempt records two results",
  "killed: the adult hold drops from 450 ms to 50 ms",
  "killed: the update check ignores the build stamp",
  "killed: the backup validator accepts an array",
  "killed: free play writes to the save",
]);

step("G6 coverage", "npx vitest run --coverage", [
  { label: "branches", regex: /engine\.js\s*\|\s*[\d.]+\s*\|\s*([\d.]+)/, floorKey: "g6_branches_min" },
  { label: "lines", regex: /engine\.js\s*\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*([\d.]+)/, floorKey: "g6_lines_min" },
  { label: "app_branches", regex: /App\.jsx\s*\|\s*[\d.]+\s*\|\s*([\d.]+)/, floorKey: "g6_appjsx_branches_min" },
  { label: "app_lines", regex: /App\.jsx\s*\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*([\d.]+)/, floorKey: "g6_appjsx_lines_min" },
  /* The app-wide row. These two floors sat in the baseline reading as
     protection while NO tool consulted them, and they disagreed with the
     numbers vitest.config.mjs actually enforced — which is how an audit came
     to believe the app floors were in conflict. A floor that guards nothing
     is worse than no floor. Both places now carry the same numbers, and this
     is where they bite. The pattern stops at "app/src" followed by
     whitespace, so the app/src/screens row cannot answer for it. */
  { label: "appdir_branches", regex: /\n\s*app\/src\s+\|\s*[\d.]+\s*\|\s*([\d.]+)/, floorKey: "g6_app_branches_min" },
  { label: "appdir_lines", regex: /\n\s*app\/src\s+\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*([\d.]+)/, floorKey: "g6_app_lines_min" },
]);

/* G6's calibration: the meter itself, checked against fixtures whose true
   coverage is known by construction. Every other detector here ships a
   control (E5); coverage was the exception. */
step("G6 coverage-control", "node tools/coverage-control.mjs", [
  { label: "problems", regex: /calibration: \d+ fixtures, (\d+) problems/, max: 0 },
], {}, ["control OK: the meter reports 100 for a fully exercised file"]);

step("G6 quality", "npx eslint . && node tools/dep-cycles.mjs && node tools/quality-control.mjs", [
  { label: "cycles", regex: /Dependency cycles: (\d+)/, maxKey: "g6_dependency_cycles_max" },
]);

step("app build", "npm --prefix app run build");

step("G7 interface", "node tests/ui/interface.mjs", [
  { label: "checks", regex: /(\d+) checks passed/, floorKey: "g7_interface_checks" },
  { label: "failed", regex: /(\d+) failed/, max: 0 },
], { WQ_SKIP_BUILD: "1" }, [
  "controls all render at or above their floor",
  "tablet portrait 768x1024",
  "landscape 1280x800",
  "a session starts offline after one online load",
  "control OK: the probe reads rendered size",
]);

step("G8 accessibility", "node tests/ui/a11y.mjs", [
  { label: "checks", regex: /(\d+) checks passed/, floorKey: "g8_checks" },
  { label: "failed", regex: /(\d+) failed/, maxKey: "g8_axe_violations_max" },
], { WQ_SKIP_BUILD: "1" });

/* S6 watched rather than read: the source scan in tests/safety.test.js stays
   as the fast pre-filter, and this records what the browser actually asks
   for. A gate that can see a request from a dependency or a stylesheet. */
const netOut = step("G18 network", "node tests/ui/network.mjs", [
  { label: "checks", regex: /(\d+) checks passed/, floorKey: "g18_network_checks" },
  { label: "failed", regex: /(\d+) failed/, max: 0 },
], { WQ_SKIP_BUILD: "1" }, [
  "a full word and its whole reveal ask nothing of the network",
  "the Grown-ups corner asks nothing of the network",
  "the update check asks its own host only",
  "returning to the foreground stays on the app's own host",
  "control OK: the recorder catches a planted fetch",
]);

/* G21: the round page is how every listening verdict reaches this project. On
   2026-08-11 a whole round's marks were lost to a copy button that could not
   work inside an embedded viewer, and nothing here noticed because nothing
   drove the page. This drives it, with the clipboard denied. */
step("G21 listening-page", "node tests/ui/listening-page.mjs", [
  { label: "checks", regex: /(\d+) checks passed/, floorKey: "g21_listening_checks" },
  { label: "failed", regex: /(\d+) failed/, max: 0 },
], {}, [
  "the answers appear on screen where the reader is standing",
  "the export carries the word verdict, the chosen arm and the comment",
  "marks survive the tab being reloaded",
  "control OK: a page whose export box is parked off screen is caught",
  "control OK: a page that does not save marks is caught",
]);

step("G16 doc-truth", "node tools/doc-truth.mjs && node tools/doc-truth.mjs --self-test", [
  { label: "rules", regex: /Doc-truth gate: (\d+) rules/, floorKey: "g16_doc_rules" },
  { label: "problems", regex: /(\d+) problems/, max: 0 },
]);

/* G16b — the prose against the LEDGERS, which doc-truth never reads. Its own
   gate rather than a rule inside doc-truth: doc-truth answers "do the
   documents match the code", and this answers "do the documents match what a
   PERSON approved". Different evidence, different failure, different fix. */
step("G16b ledger-truth", "node tools/ledger-truth.mjs && node tools/ledger-truth.mjs --self-test", [
  { label: "sounds", regex: /Ledger truth: (\d+) sounds/, floorKey: "g16b_sounds" },
  { label: "problems", regex: /(\d+) problems/, max: 0 },
  { label: "controls", regex: /ledger-truth controls: (\d+) passed/, floorKey: "g16b_controls" },
]);

step("G12 qa-procedure", "node tools/qa-check.mjs && node tools/qa-check.mjs --self-test", [
  { label: "steps", regex: /(\d+) steps/, floorKey: "g12_qa_steps" },
]);

step("G13 voice-pack", "node tools/voice-check.mjs && node tools/voice-check.mjs --self-test", [
  { label: "clips", regex: /(\d+) clips required/, floorKey: "g13_clips" },
  { label: "problems", regex: /(\d+) problems/, max: 0 },
]);

/* The manifest's speech edges, re-measured from the audio. The sound-out's
   500 ms is a gap between SOUNDS, so a manifest that misstates where a clip's
   speech begins plays a rhythm nobody approved — silently, since every file
   is present and the right length. */
step("G13 voice-edges", "python3 tools/voice-edges.py --check && python3 tools/voice-edges.py --self-test", [
  { label: "clips", regex: /Voice edges: (\d+) clips measured/, floorKey: "g13_clips" },
  { label: "problems", regex: /(\d+) problems/, max: 0 },
  { label: "controls", regex: /voice-edges controls: (\d+) passed/, floorKey: "g13_edge_controls" },
], {}, ["ok   caught: a lead that is 200 ms longer than the audio"]);

step("G20 effect-map", "node tools/effect-map.mjs --check && node tools/effect-map.mjs --self-test", [
  { label: "tests_mapped", regex: /Effect map: (\d+) tests/, floorKey: "g20_tests_mapped" },
  { label: "problems", regex: /(\d+) problems/, max: 0 },
], {}, ["self-test OK: an undeclared test file is reported"]);

step("G17 governing", "node tools/check-governing.mjs && node tools/check-governing.mjs --self-test", [
  { label: "files", regex: /(\d+) governing files/, floorKey: "g17_governing_files" },
  { label: "strays", regex: /(\d+) strays/, max: 0 },
]);

/* G23 — the file map with teeth (owner-ruled 2026-08-15). One fact, one
   owner; a copy in a non-owner governing document fails; an undeclared
   tracked file fails; a DATA file no code reads fails unless declared
   HISTORY, whose count is a ceiling. Born red against the pre-fix tree:
   seven real hits at the HEAD of 2026-08-15. */
step("G23 file-map", "node tools/file-map.mjs --check && node tools/file-map.mjs --self-test", [
  { label: "declared", regex: /File map: (\d+) declared/, floorKey: "g23_declared" },
  { label: "facts", regex: /(\d+) owned facts/, floorKey: "g23_facts" },
  { label: "problems", regex: /(\d+) problems/, max: 0 },
  { label: "controls", regex: /file-map controls: (\d+) passed/, floorKey: "g23_controls" },
], {}, ["ok   the real tree holds no copied fact"]);

/* G24 — the S9 gate (open-faults L, built 2026-08-15): no tracked file
   contains a personal name. The name list lives OUTSIDE the repository —
   private/s9-names.txt, gitignored since day one, or the S9_NAMES variable —
   because a public repo holding the list of names that must never be public
   would BE the leak. Where no list exists (CI above all), the structural
   controls still run and the summary says "0 names" rather than implying a
   protection that is not there. */
step("G24 s9-names", "G25 safety-cover", "node tools/s9-names.mjs && node tools/s9-names.mjs --self-test", [
  { label: "files", regex: /(\d+) files scanned/, floorKey: "g24_files" },
  { label: "problems", regex: /(\d+) problems/, max: 0 },
  { label: "controls", regex: /s9 controls: (\d+) passed/, floorKey: "g24_controls" },
], {}, ["ok   a planted name in file content is caught"]);

/* G25: which safety rule has no executable proof. The floors are counts that
   grow as rules and proofs are added; the two _max keys are DEBT, recorded at
   today's honest number so it cannot grow quietly (E6). */
step("G25 safety-cover", "node tools/safety-cover.mjs && node tools/safety-cover.mjs --self-test", [
  { label: "rules", regex: /Safety cover: (d+) rules/, floorKey: "g25_rules" },
  { label: "proofs", regex: /rules, (d+) declared proofs/, floorKey: "g25_proofs" },
  { label: "problems", regex: /declared proofs, (d+) problems/, max: 0 },
  { label: "controls", regex: /safety-cover controls: (d+) passed/, floorKey: "g25_controls" },
], {}, ["ok   a relabelled tag is caught, not just a deleted one"]);

/* Every gate that MUST have run. A gauntlet that skipped one — a step
   removed, a command renamed — has to fail rather than report a smaller,
   greener total. This is the closed list the release evidence is checked
   against; it is the same idea as the named checks inside a gate, one level
   up. Control below proves a missing gate is caught. */
const REQUIRED_GATES = [
  "G11 copy", "G1+G2+G9+G10 tests", "G3 regeneration", "G4 acceptance-mutants",
  "G5 source-mutants", "G19 app-mutants", "E11 lookup-mutants", "G6 coverage", "G6 quality",
  "G7 interface", "G8 accessibility", "G18 network", "G16 doc-truth",
  "G12 qa-procedure", "G13 voice-pack", "G13 voice-edges", "G20 effect-map", "G17 governing", "G23 file-map",
  "G24 s9-names", "G6 coverage-control", "G21 listening-page", "app build",
];
const sh = (cmd) => { try { return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim(); } catch { return null; } };

const missingGates = (ranSet, required) => required.filter((g) => !ranSet.has(g));
const ran = new Set(results.map((r) => r.gate));
const skipped = missingGates(ran, REQUIRED_GATES);
/* The control calls the SAME function the check above calls, in both
   directions: every gate present must report nothing missing, and one gate
   removed must report exactly that one. The first version asked whether
   filtering 17 names against a 1-name set left anything - true however the
   detector behaves - so it passed with the mechanism gone. Caught by review,
   2026-08-10. */
{
  const all = new Set(REQUIRED_GATES);
  const oneShort = new Set(REQUIRED_GATES.slice(1));
  if (missingGates(all, REQUIRED_GATES).length !== 0
      || missingGates(oneShort, REQUIRED_GATES).length !== 1
      || missingGates(oneShort, REQUIRED_GATES)[0] !== REQUIRED_GATES[0]) {
    console.error("control FAILED: the required-gate list must accept a complete run and name an absent gate");
    process.exit(1);
  }
}
if (skipped.length) {
  failures += 1;
  console.log(`\nFAIL  required gates did not run: ${skipped.join(", ")}`);
}

/* The evidence file. A printed summary is read once and then gone; this
   binds the result to the exact bytes it certifies, so "publish only what was
   certified" is checkable instead of remembered. The tree hash covers the
   built payload, the commit covers the source, and `dirty` records whether
   the working tree matched the commit when the gates ran — a green report
   from a modified tree certifies nothing. */

const payloadHash = (() => {
  const files = (sh("find app/dist -type f | LC_ALL=C sort") || "").split("\n").filter(Boolean);
  if (!files.length) return null;
  const h = createHash("sha256");
  for (const f of files) { h.update(f); h.update(createHash("sha256").update(readFileSync(f)).digest("hex")); }
  return `sha256:${h.digest("hex")}`;
})();
/* A run over a modified tree certifies nothing: the gates measured files
   that are not the commit. docs/testing-gauntlet.md promised this and the
   status ignored it until a review pointed it out, 2026-08-10. Exit code
   still follows real failures, so ordinary work in a dirty tree is not
   blocked - but the evidence never claims PASS for bytes it did not test. */
const dirtyTree = sh("git status --porcelain") !== "";
const status = failures ? "FAIL" : (skipped.length || dirtyTree) ? "INCOMPLETE" : "PASS";
const report_ = {
  schema: "word-quest-gauntlet-evidence/1",
  status,
  commit: sh("git rev-parse HEAD"),
  commit_short: sh("git rev-parse --short HEAD"),
  dirty: dirtyTree,
  payload: { path: "app/dist", hash: payloadHash },
  platform: {
    node: process.version,
    os: `${process.platform} ${process.arch}`,
    browser: (netOut.match(/browser: (\S+)/) || [])[1] || null,
  },
  /* The RESOLVED tool versions, not the caret ranges in package.json: two
     runs of the same commit can otherwise use different vitest, playwright or
     axe builds with nothing recording which one produced the evidence. */
  suites: Object.fromEntries(["vitest", "playwright", "axe-core", "fast-check"].map((n) => {
    const v = sh(`node -p "require('./node_modules/${n}/package.json').version" 2>/dev/null`);
    return [n, v || null];
  })),
  /* required = the closed list that must run; ran = every step executed,
     which is larger because helpers like "extract engine" and "app build"
     are steps but not gates. They counted different things under names that
     read as a mismatch. */
  gates: { required: REQUIRED_GATES.length, steps_run: results.length, failed: failures, skipped },
  results,
  residual_risks: [
    "Device proof is human: the QA procedure on a real iPad or phone is not automated (G12).",
    "Spoken-word quality is settled by a listening round, never by a gate (G13).",
  ],
};
writeFileSync(".gauntlet-evidence.json", JSON.stringify(report_, null, 2) + "\n");

console.log("\n================ GAUNTLET ================");
summary.forEach((l) => console.log(l));
console.log(`\nGauntlet: ${summary.length} gates, ${failures} failed`);
console.log(`Evidence: .gauntlet-evidence.json  (${status}, commit ${report_.commit_short}${report_.dirty ? " DIRTY" : ""}, payload ${payloadHash ? payloadHash.slice(0, 20) + "…" : "not built"})`);
process.exit(failures ? 1 : 0);
