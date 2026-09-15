/* THE SHAPE GATE (G31) - batch 0 of the refactor, owner-ruled 2026-09-12.
 *
 * WHAT IT MEASURES, on app/src, the generated engine and every .mjs under
 * tools/ (the fixtures excepted; the subfolders joined the scope with tools/lib
 * in batch 1, so a helper is measured from the day it is born):
 *   - per function: cyclomatic complexity, cognitive complexity, nesting
 *     depth, length in lines (blank and comment lines skipped) - all four
 *     read from ESLint's own rules (`complexity`,
 *     `sonarjs/cognitive-complexity`, `max-depth`,
 *     `max-lines-per-function`) run in process through the linter that
 *     node_modules/eslint already ships, with every threshold at zero so
 *     every function is reported. The counter is therefore the counter G6's
 *     ceiling uses, never a second opinion of what "complexity" means;
 *   - per file: its length in lines (reported; G6 owns that ceiling);
 *   - duplication: every window of 40 tokens (comments dropped, each string
 *     one token, the rest identifiers, keywords and numbers) is hashed;
 *     identical windows in two or more places are merged into REGIONS. A
 *     group whose windows overlap each other inside one file is a table of
 *     same-shaped rows once its strings are stripped - a PERIODIC run - and
 *     is counted apart, never as a region;
 *   - dead exports: a name exported from app/src, tools or an engine module
 *     that no other file under app/src, tests, tools, reference or the engine
 *     mentions as a whole word (an engine export never reads as dead: the
 *     reference, which is in the search, declares every one). "Unreferenced outside its own
 *     file" is not "unused": most are called by their own file's self-test.
 *     A common name used as any identifier elsewhere counts as referenced,
 *     so the count is a floor on the dead exports, never a ceiling.
 *
 * THE CEILINGS, in .claude/gate-baseline.json, each measured when it was set
 * and each a `_max` (E6: never raised):
 *   g31_fn_over_10_max        functions with complexity over 10, all three areas
 *   g31_cog_over_15_max       functions with cognitive complexity over 15,
 *                             all three areas (batch 3, owner-ruled 2026-09-15)
 *   g31_fn_over_15_tools_max  functions in tools/*.mjs over 15 - the ceiling the
 *                             product code already obeys and the tools do not
 *   g31_fn_over_80_lines_max  functions longer than 80 lines, all three areas
 *   g31_depth_over_4_max      blocks nested deeper than 4, all three areas
 *   g31_dup_regions_max       merged duplicated regions
 *   g31_dead_exports_max      exports no other file references
 * A ceiling that is missing from the baseline is refused, because
 * `count > undefined` is false and that is a ceiling that silently stopped
 * existing (the G27 lesson).
 *
 * THE ENGINE IS MEASURED AS THE EXTRACTOR MAKES IT, from the reference build
 * into a temporary directory - the index and one module per section of the
 * reference since batch 2 of the refactor (2026-09-13), reported under the
 * names they carry in the tree - never from src/engine.js in the tree. This
 * gate rides the gauntlet's second lane beside G5, and G5 rewrites the
 * engine with a mutant planted; the reference itself is never rewritten (G5
 * writes reference/.mutant.jsx). Reading the extractor's own output from a
 * scratch path gives the same bytes on a clean tree and the right bytes on
 * a mutated one.
 *
 * WHAT IT DOES NOT DO. It measures shape, never behaviour: a function can be
 * simple and wrong. Cognitive complexity was report-only until batch 3
 * (ruling 4 of the plan); since the batch-3 ceiling it is enforced here and
 * eslint.measure.mjs remains the standalone report. tools/*.py is measured
 * by nothing here.
 * The reference build's own component is not in scope: the app never
 * imports it and eslint.config.mjs exempts the file.
 *
 * Run:      node tools/shape.mjs            (the gate: one line per metric)
 *           node tools/shape.mjs --list     (every function over a bar, by file)
 * Controls: node tools/shape.mjs --self-test
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Linter } from "eslint";
import sonarjs from "eslint-plugin-sonarjs";
import { finish } from "./lib/selftest.mjs";
import { loadBaseline } from "./lib/baseline.mjs";
import { printProblems, verdict } from "./lib/report.mjs";
import { run, must, withScratch } from "./lib/proc.mjs";

const WINDOW = 40;
const KEYS = {
  fn_over_10: "g31_fn_over_10_max",
  cog_over_15: "g31_cog_over_15_max",
  fn_over_15_tools: "g31_fn_over_15_tools_max",
  fn_over_80_lines: "g31_fn_over_80_lines_max",
  depth_over_4: "g31_depth_over_4_max",
  dup_regions: "g31_dup_regions_max",
  dead_exports: "g31_dead_exports_max",
};
const REFERENCE = "reference/word-quest.jsx";
const EXTRACTOR = "tools/extract-engine.mjs";
const SKIP_DIRS = new Set(["node_modules", "fixtures", "dist", "generated"]);

const posix = (p) => relative(process.cwd(), resolve(p)).split(sep).join("/");
function walk(dir, exts, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (!SKIP_DIRS.has(e)) walk(p, exts, out); }
    else if (exts.some((x) => e.endsWith(x))) out.push(posix(p));
  }
  return out;
}

/* ------------------------------------------------------------ eslint --
   One flat config per file kind; every rule at zero so every function
   reports. The three regexes read the messages the rules print today, and
   the self-test's fixtures prove they still read a real number. */
/** @type {import("eslint").Linter.RulesRecord} */
const RULES = {
  complexity: ["warn", 0],
  "max-depth": ["warn", 0],
  "max-lines-per-function": ["warn", { max: 0, skipBlankLines: true, skipComments: true }],
  "sonarjs/cognitive-complexity": ["warn", 0],
};
const linter = new Linter({ configType: "flat" });
/** @returns {import("eslint").Linter.Config[]} */
const configFor = (file) => [{
  files: ["**/*.js", "**/*.jsx", "**/*.mjs"],
  languageOptions: { ecmaVersion: 2024, sourceType: "module",
    parserOptions: file.endsWith(".jsx") ? { ecmaFeatures: { jsx: true } } : {} },
  plugins: { sonarjs },
  rules: RULES,
}];
/** @type {Array<[string, RegExp, (x: RegExpExecArray) => Record<string, unknown>]>} */
const READERS = [
  ["complexity", /^(.*?) has a complexity of (\d+)\./, (x) => ({ name: x[1], complexity: Number(x[2]) })],
  ["max-lines-per-function", /^(.*?) has too many lines \((\d+)\)\./, (x) => ({ name: x[1], lines: Number(x[2]) })],
  ["max-depth", /nested too deeply \((\d+)\)/, (x) => ({ depth: Number(x[1]) })],
  ["sonarjs/cognitive-complexity", /^Refactor this function to reduce its Cognitive Complexity from (\d+) to/, (x) => ({ cognitive: Number(x[1]) })],
];
/** @returns {{ fatal?: unknown, line?: number, column?: number, name?: string, complexity?: number, lines?: number, depth?: number, cognitive?: number }} */
function readMessage(m) {
  if (m.fatal || !m.ruleId) return { fatal: m.message, line: m.line };
  for (const [rule, re, make] of READERS) {
    const x = rule === m.ruleId ? re.exec(m.message) : null;
    if (x) return { line: m.line, column: m.column, ...make(x) };
  }
  return null;
}
/* One function reports once per rule, at the same position and in any order.
   Rows merge only where the anchors coincide: the complexity and max-lines
   messages carry the function name, the sonar message never does, and sonar
   anchors declarations at the name token while the core rules anchor at the
   head - so a declaration makes two rows. A name comes from whichever
   message on the row carries one; a declaration's cognitive row stands
   nameless and --list prints it by location. A function of complexity 1
   still reports at threshold zero, so every function has a row. */
function parseMessages(file, messages) {
  const functions = new Map(), blocks = [], fatal = [];
  for (const r of messages.map(readMessage)) {
    if (!r) continue;
    if (r.fatal) { fatal.push(`${file}:${r.line} ${r.fatal}`); continue; }
    if (r.depth) { blocks.push({ file, line: r.line, depth: r.depth }); continue; }
    const key = `${r.line}:${r.column}`;
    const row = functions.get(key) || { file, line: r.line, name: r.name, complexity: null, lines: null, cognitive: null };
    if (r.complexity !== undefined) row.complexity = r.complexity;
    if (r.lines !== undefined) row.lines = r.lines;
    if (r.cognitive !== undefined) row.cognitive = r.cognitive;
    if (r.name !== undefined) row.name = r.name;
    functions.set(key, row);
  }
  return { functions: [...functions.values()], blocks, fatal };
}
function lintFile(file, text = readFileSync(file, "utf8")) {
  return parseMessages(file, linter.verify(text, configFor(file), { filename: file }));
}

/* -------------------------------------------------------- duplication --
   The tokeniser and the merge are the measurement report's method
   (2026-09-12), kept here so the number the report gave is the number the
   gate holds. */
const isWord = (c) => /[A-Za-z0-9_$]/.test(c);
const isQuote = (c) => c === '"' || c === "'" || c === "`";
const isComment = (c, d) => c === "/" && (d === "/" || d === "*");
/* `st` is the cursor: the index and the line it is on. A line comment
   ends at its newline (kept, so the line count stays right); a block
   comment ends after its closing pair; either unclosed runs to the end. */
function skipComment(src, st) {
  const line = src[st.i + 1] === "/";
  const at = line ? src.indexOf("\n", st.i) : src.indexOf("*/", st.i + 2);
  const stop = at < 0 ? src.length : line ? at : at + 2;
  for (let k = st.i; k < stop; k++) if (src[k] === "\n") st.line++;
  st.i = stop;
}
/* A ' or " string never spans a line: it stops at a newline with no backslash
   before it, which is left for the caller so the line count stays right. Without that, a quote
   inside a regex literal - `/[.,!?;:"]/g` in sentenceWords - opened a false
   string that read on through the strings of every later line to the end of
   the file, and hid one duplicated region the gate's own definition counts
   (the refactor's engineer, 2026-09-13, before the storage-block move). A
   template literal still spans lines. */
function readString(src, st, toks) {
  const q = src[st.i];
  toks.push({ t: "STR", line: st.line });
  st.i++;
  while (st.i < src.length && src[st.i] !== q) {
    if (q !== "`" && src[st.i] === "\n") return;
    if (src[st.i] === "\\") st.i++;
    if (src[st.i] === "\n") st.line++;
    st.i++;
  }
  st.i++;
}
function readWord(src, st, toks) {
  let j = st.i;
  while (j < src.length && isWord(src[j])) j++;
  toks.push({ t: src.slice(st.i, j), line: st.line });
  st.i = j;
}
function tokenise(src) {
  const toks = [], st = { i: 0, line: 1 };
  while (st.i < src.length) {
    const c = src[st.i];
    if (c === "\n") { st.line++; st.i++; }
    else if (isComment(c, src[st.i + 1])) skipComment(src, st);
    else if (isQuote(c)) readString(src, st, toks);
    else if (isWord(c)) readWord(src, st, toks);
    else st.i++;
  }
  return toks;
}
function windowGroups(texts, W) {
  const groups = new Map();
  for (const [f, src] of Object.entries(texts)) {
    const toks = tokenise(src);
    for (let i = 0; i + W <= toks.length; i++) {
      const h = createHash("md5").update(toks.slice(i, i + W).map((t) => t.t).join(" ")).digest("hex");
      let g = groups.get(h); if (!g) groups.set(h, g = []);
      g.push({ file: f, line: toks[i].line, idx: i });
    }
  }
  return [...groups.values()].filter((g) => g.length >= 2);
}
/* Two windows of one group overlapping inside one file: a table of rows. */
function isPeriodic(g, W) {
  const sorted = [...g].sort((a, b) => a.file.localeCompare(b.file) || a.idx - b.idx);
  return sorted.some((o, i) => i > 0 && o.file === sorted[i - 1].file && o.idx - sorted[i - 1].idx < W);
}
/* A group whose every occurrence is one token after a known region's is
   that region, one token longer. */
function mergeRegion(regions, g, W) {
  const key = g.map((o) => `${o.file}#${o.idx}`).join("|");
  const prevKey = g.map((o) => `${o.file}#${o.idx - 1}`).join("|");
  const prev = regions.get(prevKey);
  if (prev) { prev.len++; regions.delete(prevKey); regions.set(key, prev); }
  else regions.set(key, { occ: g.map((o) => ({ file: o.file, line: o.line })), len: W });
}
function duplication(texts, W = WINDOW) {
  const dup = windowGroups(texts, W);
  const regions = new Map();
  let periodic = 0;
  for (const g of dup) {
    if (isPeriodic(g, W)) periodic++;
    else mergeRegion(regions, g, W);
  }
  return { regions: [...regions.values()], periodicGroups: periodic, groups: dup.length };
}

/* ------------------------------------------------------- dead exports --
   `exporting` maps a file to its text for the files whose exports are
   counted; `universe` maps every file a reference may live in (the exporting
   files included) to its text. */
function exportsOf(text) {
  const names = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const part of m[1].split(",")) { const n = part.trim().split(/\s+as\s+/).pop().trim(); if (n) names.add(n); }
  return [...names];
}
function deadExports(exporting, universe) {
  const dead = [];
  let total = 0;
  for (const [f, text] of Object.entries(exporting)) {
    for (const name of exportsOf(text)) {
      total++;
      const re = new RegExp("\\b" + name.replace(/\$/g, "\\$") + "\\b");
      const referenced = Object.entries(universe).some(([g, t]) => g !== f && re.test(t));
      if (!referenced) dead.push({ file: f, name });
    }
  }
  return { dead, total };
}

/* ----------------------------------------------------------- measure --
   `areas` maps an area name to its files; `universe` is the extra text the
   dead-export search may find a reference in. Returns every number the gate
   prints plus the rows behind them, so --list and the self-test read the
   same measurement. */
function measure(areas, extraUniverse = {}) {
  const texts = {};
  const functions = [], blocks = [], fatal = [];
  const files = [];
  for (const [area, list] of Object.entries(areas)) {
    for (const [file, text] of Object.entries(list)) {
      texts[file] = text;
      const r = lintFile(file, text);
      for (const fn of r.functions) functions.push({ area, ...fn });
      for (const b of r.blocks) blocks.push({ area, ...b });
      fatal.push(...r.fatal);
      const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
      files.push({ area, file, lines });
    }
  }
  const dup = duplication(texts);
  const universe = { ...texts, ...extraUniverse };
  const dead = deadExports(texts, universe);
  const cx = (f) => f.complexity ?? 0;
  return {
    files, functions, blocks, fatal, dup, dead,
    counts: {
      fn_over_10: functions.filter((f) => cx(f) > 10).length,
      cog_over_15: functions.filter((f) => (f.cognitive ?? 0) > 15).length,
      fn_over_15_tools: functions.filter((f) => f.area === "tools" && cx(f) > 15).length,
      fn_over_80_lines: functions.filter((f) => (f.lines ?? 0) > 80).length,
      depth_over_4: blocks.filter((b) => b.depth > 4).length,
      dup_regions: dup.regions.length,
      dead_exports: dead.dead.length,
    },
  };
}

/* The verdict is pure so the E6 controls can drive it: a ceiling under
   today's number is red, a ceiling that is not in the baseline is red, and a
   ceiling ABOVE today's number - slack - is red in its own line, which names
   the key and the number to lower it to (the review seat's M1, 2026-09-12:
   before this, slack went red only through the self-test's lowered-ceiling
   control, whose sentence then named a cause that had not happened). */
function judge(counts, baseline) {
  const problems = [];
  for (const [metric, key] of Object.entries(KEYS)) {
    if (typeof baseline[key] !== "number") problems.push(`${key} is missing from the baseline - a ceiling that does not exist cannot refuse anything`);
    else if (counts[metric] > baseline[key]) problems.push(`${metric} = ${counts[metric]} is over its ceiling ${key} = ${baseline[key]}`);
    else if (counts[metric] < baseline[key]) problems.push(`${metric} = ${counts[metric]} is under its ceiling ${baseline[key]} - lower ${key} to ${counts[metric]} in this commit`);
  }
  return problems;
}

/* The engine, extracted into a scratch directory (see the header): the index
   and the modules the extractor puts beside it, keyed by the names they
   carry in the tree. */
function extractedEngine() {
  return withScratch("shape-", (box) => {
    const index = join(box, "engine.js");
    must(run(process.execPath, [EXTRACTOR, REFERENCE, index]), "the extractor");
    const files = { "src/engine.js": readFileSync(index, "utf8") };
    for (const f of readdirSync(join(box, "engine"))) files["src/engine/" + f] = readFileSync(join(box, "engine", f), "utf8");
    return files;
  });
}
const read = (files) => Object.fromEntries(files.map((f) => [f, readFileSync(f, "utf8")]));
function realAreas() {
  return {
    "app/src": read(walk("app/src", [".js", ".jsx"])),
    engine: extractedEngine(),
    tools: read(walk("tools", [".mjs"])),
  };
}
/* Where a reference to an export may live, beyond the measured files: the
   tests - every directory under tests/ except those SKIP_DIRS names, so the
   generated acceptance suite is NOT read - and the reference build. */
function realUniverse() {
  return read([...walk("tests", [".js", ".mjs"]), REFERENCE]);
}

const bar = (metric) => ({ fn_over_10: 10, fn_over_15_tools: 15, fn_over_80_lines: 80, depth_over_4: 4, cog_over_15: 15 })[metric];
function report(m, baseline) {
  const perArea = Object.entries(m.files).reduce((o, [, f]) => { o[f.area] = (o[f.area] || 0) + 1; return o; }, {});
  console.log(`Shape gate: ${Object.keys(KEYS).length} metrics over ${m.files.length} files (${Object.entries(perArea).map(([a, n]) => `${a} ${n}`).join(", ")}), ${m.functions.length} functions`);
  for (const [metric, key] of Object.entries(KEYS)) {
    const max = typeof baseline[key] === "number" ? baseline[key] : "MISSING";
    console.log(`  ${metric} = ${m.counts[metric]} (max ${max})`);
  }
  console.log(`  periodic_runs = ${m.dup.periodicGroups} groups (tables of same-shaped rows; reported, never a region)`);
  const longest = [...m.files].sort((a, b) => b.lines - a.lines).slice(0, 3).map((f) => `${f.file} ${f.lines}`).join(", ");
  console.log(`  longest files: ${longest}`);
}
function list(m) {
  const show = (title, rows, fmt) => { console.log(`\n${title} (${rows.length})`); for (const r of rows) console.log("  " + fmt(r)); };
  show("functions over complexity 10", m.functions.filter((f) => (f.complexity ?? 0) > 10).sort((a, b) => b.complexity - a.complexity), (f) => `${f.file}:${f.line} ${f.name} = ${f.complexity}`);
  show("functions over cognitive complexity 15", m.functions.filter((f) => (f.cognitive ?? 0) > 15).sort((a, b) => (b.cognitive ?? 0) - (a.cognitive ?? 0)), (f) => `${f.file}:${f.line}${f.name === undefined ? "" : ` ${f.name}`} = ${f.cognitive}`);
  show("functions over 80 lines", m.functions.filter((f) => (f.lines ?? 0) > 80).sort((a, b) => b.lines - a.lines), (f) => `${f.file}:${f.line} ${f.name} = ${f.lines} lines`);
  show("blocks deeper than 4", m.blocks.filter((b) => b.depth > 4), (b) => `${b.file}:${b.line} depth ${b.depth}`);
  show("duplicated regions", [...m.dup.regions].sort((a, b) => b.len - a.len), (r) => `${r.len} tokens at ${r.occ.map((o) => `${o.file}:${o.line}`).join(", ")}`);
  show("dead exports", m.dead.dead, (d) => `${d.file} ${d.name}`);
}

/* ---------------------------------------------------------- controls --
   Planted fixtures under tools/fixtures/, measured as a tree of their own:
   one function over each bar, one duplicated pair, one dead export beside
   one live one. The cognitive bar has its own fixture and a pin on the
   sonar message shape, which names no function. Then the E6 direction on
   the REAL tree: every ceiling lowered by one must refuse, a missing key
   must refuse, and slack - a count under its ceiling - must refuse in a
   line that names the key and the number, proved verbatim on a planted 100
   under 101. */
function selfTest() {
  const ok = [];
  const T = (name, pass) => ok.push([name, pass]);
  fixtureControls(T);
  realTreeControls(T);
  return finish("shape", ok);
}
function fixtureControls(T) {
  const fx = (f) => "tools/fixtures/" + f;
  const fixtures = read(["complexity-over.js", "shape-cog.js", "shape-long.js", "shape-deep.js", "shape-dup-a.js", "shape-dup-b.js", "shape-dead.js"].map(fx));
  const m = measure({ tools: fixtures });
  const over = (metric) => m.functions.filter((f) => (metric === "lines" ? f.lines : f.complexity) > bar(metric === "lines" ? "fn_over_80_lines" : "fn_over_10"));
  T("a planted function of complexity 17 is read as 17, over 10 and over 15", m.functions.some((f) => f.file === fx("complexity-over.js") && f.complexity === 17) && m.counts.fn_over_10 === 1 && m.counts.fn_over_15_tools === 1);
  T("a planted function of cognitive complexity 16 is read as 16", m.functions.some((f) => f.file === fx("shape-cog.js") && f.cognitive === 16));
  T("both planted over-15 functions are counted in the fixture tree", m.counts.cog_over_15 === 2);
  T("they are complexity-over.js and shape-cog.js", m.functions.filter((f) => (f.cognitive ?? 0) > 15).map((f) => f.file).sort().join() === [fx("complexity-over.js"), fx("shape-cog.js")].join());
  T("the reader pins the sonar message shape, which names no function", (readMessage({ ruleId: "sonarjs/cognitive-complexity", message: "Refactor this function to reduce its Cognitive Complexity from 16 to the 0 allowed.", line: 1, column: 1 }) || {}).cognitive === 16);
  T("a planted function over 80 lines is counted, and it is the only one", m.counts.fn_over_80_lines === 1 && over("lines")[0].file === fx("shape-long.js"));
  T("a planted block at depth 5 is counted, and it is the only one", m.counts.depth_over_4 === 1 && m.blocks.find((b) => b.depth > 4).file === fx("shape-deep.js"));
  T("a run of tokens planted in two files is one region, spanning both", m.counts.dup_regions === 1 && m.dup.regions[0].occ.map((o) => o.file).sort().join() === [fx("shape-dup-a.js"), fx("shape-dup-b.js")].join());
  T("a planted export nobody names is dead, and its two live neighbours are not", m.counts.dead_exports === 1 && m.dead.dead[0].name === "planted_dead_export" && m.dead.total === 3);
  T("no fixture failed to parse", m.fatal.length === 0);
  /* A quote inside a regex literal, then a comment line, then a table of strings:
     the table must tokenise exactly as it does alone, line numbers included. */
  const table = 'const T = ["a", "b", "c"];\nconst U = ["d", "e"];\n';
  const tail = (src) => tokenise(src).slice(-tokenise(table).length).map((k) => `${k.t}@${k.line}`).join(" ");
  const regexFirst = 'const R = /[.,!?;:"]/g;\n' + table;
  T("a quote inside a regex literal does not swallow the strings on the lines after it",
    tail(regexFirst) === tail("\n" + table) && tokenise(regexFirst).filter((k) => k.t === "STR").length >= 5);
  const zero = Object.fromEntries(Object.values(KEYS).map((k) => [k, 0]));
  T("against a zero baseline the fixtures raise one problem per metric", judge(m.counts, zero).length === 7);
  T("a fixture in the tree fails the linter's parse and is reported, not skipped", parseMessages("x.js", [{ fatal: true, line: 1, message: "Parsing error: planted" }]).fatal.length === 1);
}
/* The E6 direction on the real tree. */
function realTreeControls(T) {
  const real = measure(realAreas(), realUniverse());
  const baseline = loadBaseline().data;
  const today = judge(real.counts, baseline);
  T("the real tree at today's ceilings raises no problem" + (today.length ? ": " + today.join("; ") : ""), today.length === 0);
  /* Judged against a baseline pinned at today's counts, not the file's, so
     slack in some other key can never make this line print for it. */
  const pinned = Object.fromEntries(Object.entries(KEYS).map(([metric, key]) => [key, real.counts[metric]]));
  T("every ceiling lowered by one under an unchanged tree is refused, naming its key",
    Object.entries(KEYS).every(([metric, key]) => { const p = judge(real.counts, { ...pinned, [key]: real.counts[metric] - 1 }); return p.length === 1 && p[0].includes(key) && p[0].includes("over its ceiling"); }));
  const slackCounts = Object.fromEntries(Object.keys(KEYS).map((metric) => [metric, metric === "dead_exports" ? 100 : 0]));
  const slackBaseline = Object.fromEntries(Object.entries(KEYS).map(([metric, key]) => [key, metric === "dead_exports" ? 101 : 0]));
  const slack = judge(slackCounts, slackBaseline);
  T("a count under its ceiling is refused as slack, in its own line: a planted 100 under 101 says 'dead_exports = 100 is under its ceiling 101 - lower g31_dead_exports_max to 100 in this commit'",
    slack.length === 1 && slack[0] === "dead_exports = 100 is under its ceiling 101 - lower g31_dead_exports_max to 100 in this commit");
  T("a ceiling missing from the baseline is refused", judge(real.counts, { ...baseline, g31_dup_regions_max: undefined }).some((p) => p.includes("missing")));
  T("every area measured at least one function - a scope that reads nothing cannot pass",
    ["app/src", "engine", "tools"].every((a) => real.functions.some((f) => f.area === a)));
}

const RUN_AS_COMMAND = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (RUN_AS_COMMAND) {
  if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);
  const baseline = loadBaseline().data;
  const m = measure(realAreas(), realUniverse());
  report(m, baseline);
  if (process.argv.includes("--list")) list(m);
  const problems = judge(m.counts, baseline);
  for (const f of m.fatal) problems.push(`a file did not parse: ${f}`);
  for (const a of ["app/src", "engine", "tools"]) if (!m.functions.some((f) => f.area === a)) problems.push(`the ${a} area measured no function at all - the scope reads nothing`);
  printProblems(problems);
  console.log(verdict("Shape gate", "", problems.length));
  process.exit(problems.length ? 1 : 0);
}
