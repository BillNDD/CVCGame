/* The effect map (G20). Owner-ruled 2026-08-10, over a recommendation for a
   leaner version: one row for every executable test, recording what it
   protects and what it does not prove.

   It is GENERATED, not written. A hand-kept map of 300+ tests starts lying
   the first time a test is renamed, and a document that lies is worse than no
   document — "What counts as finished work" bans paperwork that guards
   nothing. So the generator reads the real test files and the real gate
   definitions, and the gate fails when the committed map and the tree
   disagree: a test with no row, or a row naming a test that no longer exists.

   What is generated: the identifier, file, gate, suite, and the test's own
   sentence — this project names tests as behaviour, so the name IS the
   Given/When/Then effect. What is declared by hand, per FILE rather than per
   test: the requirement protected, the oracle, the platform, the mutant
   family, the evidence, and the known limits. A file-level declaration is
   small enough to stay true and specific enough to answer "what protects
   this rule, and what does that proof NOT cover".

   Run: node tools/effect-map.mjs           (writes docs/effect-map.md)
        node tools/effect-map.mjs --check   (fails if the map is stale)
        node tools/effect-map.mjs --self-test */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";

import { DECLARED, NON_TEST_GATES } from "./effect-declarations.mjs";

const TEST_DIRS = ["tests", "tests/generated"];
const files = [];
for (const d of TEST_DIRS) {
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) if (f.endsWith(".test.js")) files.push(`${d}/${f}`);
}
files.sort();

/* Test names, read from the source. `it("...")` and `it(\`...\`)`, plus the
   describe that holds them, so a row carries the behaviour in the project's
   own words. Loops that generate tests are recorded once, as a family. */
function readTests(file) {
  return readTestsFrom(readFileSync(file, "utf8"));
}
function readTestsFrom(src) {
  const out = [];
  let suite = "";
  for (const line of src.split("\n")) {
    /* the quote that opened the name closes it - a title with an apostrophe
       used to end at the apostrophe ("3c: the open sentence word", the
       fifth judgement of art step 0) */
    const d = line.match(/^\s*describe\(\s*(["'`])(.+?)\1/);
    if (d) { suite = d[2]; continue; }
    const t = line.match(/^\s*it\(\s*(["'`])(.+?)\1/);
    if (t) out.push({ suite, name: t[2] });
    else {
      const g = line.match(/^\s*it\(\s*`\$\{(.+?)\}(.*?)`/);
      if (g) out.push({ suite, name: `(generated family) …${g[2]}`.trim() });
    }
  }
  return out;
}

const rows = [];
for (const f of files) {
  const meta = DECLARED[f];
  for (const t of readTests(f)) {
    rows.push({ id: `${f.replace(/^tests\//, "").replace(/\.test\.js$/, "")}::${t.name.slice(0, 60)}`, file: f, suite: t.suite, name: t.name, meta });
  }
}

/* The three detectors, named once and called by BOTH --check and
   --self-test. When the self-test re-implemented them inline it could pass
   while the shipped path was broken, which is the fault a control exists to
   prevent - and the first fix repeated it. Stub any function here and the
   self-test fails. */
const detectUndeclared = (fileList, declared) => fileList.filter((f) => !declared[f]);
const detectOrphans = (fileList, declared) => Object.keys(declared).filter((f) => !fileList.includes(f));
const detectShortfall = (counts) => counts.filter((x) => x.rows !== x.sites);

const undeclared = detectUndeclared(files, DECLARED);
const orphanDeclarations = detectOrphans(files, DECLARED);

/* Reconcile the rows against the real it() SITES in each file. The parser is
   line-based, so a call it cannot read - a template literal, an it.each, a
   name split over two lines - would silently produce no row, and the map
   would understate the suite while --check still reported zero problems. A
   review found 57 running tests with no row on 2026-08-10. Counting sites
   independently of the parser turns that class of gap into a build failure.
   One site can run many times (a loop over a table), so rows count SITES,
   which is why the total here is smaller than the number of tests Vitest
   runs. */
/* Anchored to the start of a line: a bare /it\s*\(/ also matches the words
   "got it (hold)" inside a button label, which counted 17 phantom sites the
   first time this check ran. */
const SITE = /^\s*(it|test)(\.\w+)?\s*\(/gm;
const siteCount = (file) => (readFileSync(file, "utf8").match(SITE) || []).length;
const siteCounts = files.map((f) => ({
  file: f, sites: siteCount(f), rows: rows.filter((r) => r.file === f).length,
}));
const shortfall = detectShortfall(siteCounts);

/* The machine-readable half of a requirement sentence, as a reader sees it.
   Gate G25 computes safety coverage from the same field, so the document and
   the gate cannot disagree about what is proved. */
const fmtSafety = (safety) => {
  const e = Object.entries(safety || {});
  return e.length ? e.map(([r, kind]) => `${r} (${kind})`).join(", ") : "none";
};

function render() {
  const L = [];
  L.push("# Effect map — what every test protects, and what it does not prove");
  L.push("");
  L.push("GENERATED by `tools/effect-map.mjs`. Do not edit by hand: run the tool.");
  L.push("Gate G20 fails when this file and the test tree disagree, so a test with no row,");
  L.push("or a row for a test that no longer exists, blocks the build.");
  L.push("");
  L.push("Per-test rows carry the test's own sentence, which in this project IS the");
  L.push("Given/When/Then effect. The requirement, oracle, platform, mutant family, evidence");
  L.push("and known limits are declared per FILE, in the tool, where they stay true.");
  L.push("");
  L.push(`Totals: ${rows.length} it() SITES across ${files.length} files, plus ${NON_TEST_GATES.length} gates that are not test files.`);
  L.push("");
  L.push("A site inside a loop or a table runs many times, so these rows describe more tests than they number: Vitest executes 330. The rows count the places behaviour is asserted.");
  L.push("");
  for (const f of files) {
    const m = DECLARED[f];
    const mine = rows.filter((r) => r.file === f);
    L.push(`## ${f} — ${mine.length} tests${m ? ` (${m.gate})` : ""}`);
    L.push("");
    if (m) {
      L.push(`- **Requirement protected:** ${m.requirement}`);
      L.push(`- **Independent oracle:** ${m.oracle}`);
      L.push(`- **Platform:** ${m.platform}`);
      L.push(`- **Mutant family:** ${m.mutants}`);
      L.push(`- **Evidence produced:** ${m.evidence}`);
      L.push(`- **Known limits — what these tests do NOT prove:** ${m.limits}`);
      L.push(`- **Safety rules proved here:** ${fmtSafety(m.safety)}`);
    } else {
      L.push("- **UNDECLARED.** This file has no declaration in `tools/effect-map.mjs`. Add one.");
    }
    L.push("");
    L.push("| # | Suite | Effect (the test's own sentence) |");
    L.push("|---|---|---|");
    mine.forEach((r, i) => L.push(`| ${i + 1} | ${r.suite.replace(/\|/g, "\\|")} | ${r.name.replace(/\|/g, "\\|")} |`));
    L.push("");
  }
  L.push("## Gates that are not test files");
  L.push("");
  L.push("| Gate | Where | Requirement protected | Oracle | Known limits | Safety rules proved |");
  L.push("|---|---|---|---|---|---|");
  for (const [g, where, req, oracle, limits, safety] of NON_TEST_GATES)
    L.push(`| ${g} | \`${where}\` | ${req} | ${oracle} | ${limits} | ${fmtSafety(safety)} |`);
  L.push("");
  return L.join("\n") + "\n";
}

const OUT = "docs/effect-map.md";

if (process.argv.includes("--self-test")) {
  /* Planted inputs through the SHIPPED detectors. The first version of this
     control asked whether an absent file was absent - true however the tool
     behaves - and printed "self-test OK" with the detector gone. A review
     caught it on 2026-08-10. Every check below calls the same function
     --check calls, so breaking one breaks this. */
  const fake = "tests/planted.test.js";
  const real = files[0];
  const checks = {
    undeclaredCaught: detectUndeclared([...files, fake], DECLARED).length === 1,
    orphanCaught: detectOrphans(files, { ...DECLARED, [fake]: {} }).length === 1,
    shortfallCaught: detectShortfall([{ file: real, sites: 99, rows: 1 }]).length === 1,
    cleanAccepted: detectUndeclared(files, DECLARED).length === 0
      && detectOrphans(files, DECLARED).length === 0
      && detectShortfall(siteCounts).length === 0,
    staleCaught: existsSync(OUT) && readFileSync(OUT, "utf8").replace(/\n\| 1 \|[^\n]*/, "") !== render(),
    /* a title with an apostrophe is read whole (the fifth judgement of art
       step 0: "3c: the open sentence word" was all the map kept) */
    apostropheKept: readTestsFrom('describe("the palette", () => {\n  it("3c: the word\'s ring is BELOW 3:1", () => {});\n});\n')
      .map((t) => t.suite + " / " + t.name).join() === "the palette / 3c: the word's ring is BELOW 3:1",
  };
  if (Object.values(checks).every(Boolean)) {
    console.log("self-test OK: an undeclared test file is reported, a declaration for a vanished file is reported, a missed it() site is reported, a stale map is detected, a title with an apostrophe is read whole, and the real tree is accepted");
    process.exit(0);
  }
  console.error("self-test FAILED: " + JSON.stringify(checks));
  process.exit(1);
}

const text = render();
let problems = 0;
for (const f of undeclared) { console.error(`  PROBLEM: ${f} has no declaration in tools/effect-map.mjs`); problems++; }
for (const f of orphanDeclarations) { console.error(`  PROBLEM: tools/effect-map.mjs declares ${f}, which is not a test file any more`); problems++; }
for (const x of shortfall) { console.error(`  PROBLEM: ${x.file} has ${x.sites} it() sites but ${x.rows} rows - the parser missed ${x.sites - x.rows}`); problems++; }

if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== text) { console.error("  PROBLEM: docs/effect-map.md is stale — run node tools/effect-map.mjs"); problems++; }
  console.log(`Effect map: ${rows.length} tests over ${files.length} files, ${problems} problems`);
  process.exit(problems ? 1 : 0);
}

writeFileSync(OUT, text);
console.log(`Effect map: ${rows.length} tests over ${files.length} files, ${problems} problems -> ${OUT}`);
process.exit(problems ? 1 : 0);
