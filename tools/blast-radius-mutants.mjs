/* FAULTS PLANTED IN THE BLAST-RADIUS LOOKUP, and the controls that must catch
 * them. E5: a detector ships with the negative controls that prove it catches
 * its target fault, and those controls ship in the repository — not in a
 * scratch directory that empties overnight.
 *
 * WHY THE FAULTS LOOK LIKE THIS. The first harness planted fifteen faults that
 * were the one-for-one inverse of the fix list written the same hour: every one
 * was total breakage (`for (const f of [])`, `if (false)`, `flatten = s => s`).
 * All fifteen died, which proved the controls were WIRED and said nothing about
 * whether they were SENSITIVE. An auditor then planted thirty-two faults of its
 * own — partial, off-by-one, wrong-but-plausible — and twenty-four survived.
 * The faults below are that second kind. Several are lifted from that audit.
 *
 * A fault that survives is the finding. It means some part of the lookup can be
 * wrong while every control stays green, and a lookup that is confidently wrong
 * is worse than none: the whole point is that a person stops checking by hand.
 *
 * IT WORKS ON A COPY. The first harness wrote mutants into the live working
 * tree fifteen times. Kill it between two writes and a mutant is left in the
 * repository — which has already happened three times here by other routes
 * (open-faults C2). This copies the file to a scratch directory, mutates the
 * copy, and never writes to the tree it was run from.
 *
 * Run: node tools/blast-radius-mutants.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const REL = "tools/blast-radius.mjs";

/* [name, from, to]. `from` must appear exactly once in the source: an anchor
   that has drifted is reported as a moved anchor rather than a passing mutant,
   because a mutant whose anchor moved tests nothing and reads as a success. */
const MUTANTS = [
  // --- the report layer. The first harness had nothing here, and this is
  // where twenty-four survivors lived.
  ["the report prints nothing at all",
    "  console.log(`\\n${title}`);", "  console.log(`\\n${title}`); if (rows.length) return;"],
  ["the report drops the last file of every group",
    "    for (const r of list) {", "    for (const r of list.slice(0, -1)) {"],
  ["the report keeps one file per group",
    "    for (const r of list) {", "    for (const r of list.slice(0, 1)) {"],
  ["the headings go, so a floor and a render script look alike",
    "    console.log(`\\n  ${kind}`);", "    console.log(`\\n`);"],
  ["the floors are printed except the last one",
    "for (const [k, list] of Object.entries(FLOORS)) for (const f of list) console.log(`  ${k}: ${f}`);",
    "for (const [k, list] of Object.entries(FLOORS).slice(0, -1)) for (const f of list) console.log(`  ${k}: ${f}`);"],
  ["the counts are computed and never printed",
    '    console.log("Counts now:            ", JSON.stringify(c.now));', "    void c.now;"],
  ["the sole-user sound is computed and never printed",
    "      if (c.sole.length) console.log(`It is the ONLY user of: ${c.sole.join(\", \")} — those clips go with it`);",
    "      void c.sole;"],
  ["the stale-engine warning is computed and never shown",
    "if (warn) console.log(`\\n⚠️  ${warn}`);", "void warn;"],
  ["the scan tally is silently overstated",
    "of ${SCAN.tracked} tracked", "of ${SCAN.tracked + 1} tracked"],

  // --- the chase. The founding incident lives entirely here.
  ["the chase runs on the level size only, as it first shipped",
    '    for (const [what, n] of [["this level\'s size", c.now.levelSize], ["the bank size", c.now.bank],\n      ["the clip count", c.now.clips]]) {',
    '    for (const [what, n] of [["this level\'s size", c.now.levelSize]]) {'],
  ["the chase never runs", "  if (c.engine && c.inBank) {", "  if (false) {"],
  ["the chase is filtered back to the kinds somebody thought mattered",
    "      report(`Arithmetic on ${what} (${n}) — chased for you:`, hits(String(n), \"number\"), String(n));",
    "      report(`Arithmetic on ${what} (${n}) — chased for you:`, hits(String(n), \"number\").filter((r) => !r.kind.startsWith(\"SPEC\")), String(n));"],

  // --- classification. A wrong-but-plausible kind is the realistic fault:
  // nothing crashes, the file is listed, and it is listed under the wrong head.
  ["an acceptance scenario is filed as a plain test",
    'if (f.startsWith("features/")) return KINDS[2];', 'if (f.startsWith("features/")) return KINDS[4];'],
  ["a generated test is filed as a hand-written one",
    'if (f.startsWith("tests/generated/")) return KINDS[3];', 'if (f.startsWith("tests/generated/")) return KINDS[4];'],
  ["the features directory is misspelled, so the scenario falls to the bottom",
    'if (f.startsWith("features/")) return KINDS[2];', 'if (f.startsWith("feature/")) return KINDS[2];'],
  ["the pack recipe goes back to being unclassified",
    'if (f === "app/public/voice/manifest.json") return KINDS[7];', 'if (false) return KINDS[7];'],
  ["a render script is filed as an ordinary tool, so nobody is warned off it",
    "if (/^tools\\/(render|bake|build)[-_]/.test(f)) return KINDS[11];", "if (false) return KINDS[11];"],
  ["the waiting room loses its sounds half",
    "if (/^tools\\/pending-(words|sounds)\\//.test(f)) return KINDS[9];",
    "if (/^tools\\/pending-words\\//.test(f)) return KINDS[9];"],

  // --- counts. Off-by-one and wrong-source, not deletion.
  ["the bank is the level lists again",
    "  const levelOnly = alsoKeyed.length && level", "  const levelOnly = false && level"],
  ["a sole-user sound costs one clip instead of two",
    "    clips: now.clips - 1 - sole.length,", "    clips: now.clips - 1,"],
  ["the sound count forgets the sound leaves too",
    "    sounds: now.sounds - sole.length,", "    sounds: now.sounds,"],
  ["sole users are counted over the levels, not the bank",
    "  for (const w of bank) for (const id of m.soundIdsFor(w)) users.set(id, (users.get(id) || 0) + 1);",
    "  for (const l of m.LEVELS) for (const w of l.words) for (const id of m.soundIdsFor(w)) users.set(id, (users.get(id) || 0) + 1);"],
  ["the level number is off by one",
    "return { engine: true, inBank: true, level: level ? level.n : null,",
    "return { engine: true, inBank: true, level: level ? level.n + 1 : null,"],
  ["the level shrinks by two", "    levelSize: level ? now.levelSize - 1 : null,", "    levelSize: level ? now.levelSize - 2 : null,"],
  ["TRICKY is checked and WORD_SOUND is not",
    '  if (Object.keys(m.WORD_SOUND).includes(word)) alsoKeyed.push("WORD_SOUND (its per-word sounds)");', "  void m.WORD_SOUND;"],
  ["a floor points at the wrong gate", '  clips: ["g13_clips"],', '  clips: ["g11_copy_rules"],'],
  ["the test floors are dropped again", "  tests: [", "  __unused: ["],

  // --- the search. Partial, not total.
  ["the walk stops one file short", "  for (const f of files) {", "  for (const f of files.slice(0, -1)) {"],
  ["binary files are opened as text", "    if (BINARY.test(f)) SCAN.binary++;", "    if (false) SCAN.binary++;"],
  ["the file name is never matched", "if (pathTokens(f).includes(needle)) found.push", "if (false) found.push"],
  ["ls-files runs in the working directory", 'git(["ls-files"], root())', 'git(["ls-files"], process.cwd())'],
  ["a word search loses its boundaries", "  const re = new RegExp(`\\\\b${esc(needle)}\\\\b`);", "  const re = new RegExp(esc(needle));"],
  ["only the file side of a sentence is flattened", "    return { test: (l) => flatten(l).includes(want), wrapped: want };",
    "    return { test: (l) => flatten(l).includes(needle), wrapped: want };"],
  ["the wrapped-sentence line is off by one", "      if (/\\s/.test(ch)) { if (buf.endsWith(\" \")) continue; buf += \" \"; } else buf += ch;\n      map.push(i + 1);",
    "      if (/\\s/.test(ch)) { if (buf.endsWith(\" \")) continue; buf += \" \"; } else buf += ch;\n      map.push(i);"],
  ["a padded decimal is a different number", '(needle.includes(".") ? "0*" : "")', '""'],
  ["a number may not carry a unit", "${body}(?!\\\\d|\\\\.\\\\d)", "${body}(?![\\\\w.])"],
  ["the hash guard swallows ordinary numbers", "if (!HASHISH.test(tokenAt(s, m.index))) return true;", "if (false) return true;"],
  ["a symbol is matched case-sensitively again",
    "    return { test: (l) => { const low = l.toLowerCase(); return vs.some((v) => low.includes(v)); }, names };",
    "    return { test: (l) => vs.some((v) => l.includes(v)), names };"],
  ["a symbol has no variants", "  const out = new Set([s]);", "  const out = new Set([s]); return [...out];"],
  ["the defining line is not ranked first",
    "  return [...r.found].sort((a, b) => rank(a) - rank(b) || a.n - b.n).slice(0, n);", "  return r.found.slice(0, n);"],
  ["an empty value is accepted again", '  if (v === "") { console.error(`${f} cannot be empty.`); process.exit(2); }', "  void 0;"],
  ["the sandbox stops forcing ignored paths in", 'git(["add", "-f", ...Object.keys(CORPUS)], box);', 'git(["add", ...Object.keys(CORPUS)], box);'],

  // --- the confirm round's survivors. Every one of these passed 76 green
  // controls, and each is now a control of its own.
  ["the git-variable scrub is dropped, so a hook's repository is written to",
    "  for (const k of GIT_VARS) delete e[k];", "  void GIT_VARS;"],
  ["--symbol computes its report and prints nothing",
    '  report(`Files naming ${vs.join(" / ")} (any case):`, hits(symbol, "symbol"), symbol);', "  void vs;"],
  ["--text computes its report and prints nothing",
    'if (text !== null) report(`Files containing "${text}":`, hits(text, "text"), text);', "if (false) void text;"],
  ["the wrapped search APPENDS a phantom hit instead of replacing a miss",
    "        if (!found.length && m.wrapped) {", "        if (m.wrapped) {"],
  ["two thirds of the mutation gate stop being mutant anchors",
    'if (["tools/mutants.mjs", "tools/app-mutants.mjs", "tools/acceptance-mutants.mjs"].includes(f)) return KINDS[6];',
    'if (["tools/mutants.mjs"].includes(f)) return KINDS[6];'],
  ["a name of three parts loses its middle",
    '    out.add(p[0] + p.slice(1).map((x) => x[0].toUpperCase() + x.slice(1)).join(""));',
    '    out.add(p[0] + p.slice(2).map((x) => x[0].toUpperCase() + x.slice(1)).join(""));'],
  ["--all becomes decoration", '  const lines = ARGS.includes("--all") ? Infinity : 3;', "  const lines = 3;"],
  ["the excerpt cap quietly tightens to one", '  const lines = ARGS.includes("--all") ? Infinity : 3;',
    '  const lines = ARGS.includes("--all") ? Infinity : 1;'],
  ["the hidden-line tail is off by one",
    "console.log(`      … ${r.found.length - lines} more lines in this file (--all)`);",
    "console.log(`      … ${r.found.length - lines - 1} more lines in this file (--all)`);"],
  ["the line saying the bank does NOT shrink is dropped",
    '    if (c.alsoKeyed.length) console.log(`Also keyed in: ${c.alsoKeyed.join(", ")} — the bank is the union, not the levels`);',
    "    void c.alsoKeyed;"],
  ["the file name stops ranking above the excerpt lines",
    `  const rank = (h) => (h.n === 0 ? 0 : h.line.startsWith(needle) || h.line.startsWith('"' + needle) ? 1 : 2);`,
    "  const rank = (h) => (h.line.startsWith(needle) ? 1 : 2);"],

  // --- the third confirm round. The fix for the git-hook fault shipped with a
  // control that could not fail for it: every one of these passed 92 green
  // controls while staging twenty files into the caller's repository.
  ["git() stops scrubbing, which is the git-hook fault restored verbatim",
    'const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", env: cleanEnv() });',
    'const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8" });'],
  ["one sandbox git call bypasses git() and inherits the caller's environment",
    '  git(["init", "-q"], box);', '  execFileSync("git", ["init", "-q"], { cwd: box });'],
  ["the scrub list keeps only what one control happens to set",
    'const GIT_VARS = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY",',
    'const GIT_VARS = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"]; const UNUSED = ["GIT_OBJECT_DIRECTORY",'],
  ["the hook controls are never called",
    '  if (!ARGS.includes("--nested")) hookControls(ok);', "  void hookControls;"],
  ["the nested guard is inverted, so the hook controls run only when nested",
    '  if (!ARGS.includes("--nested")) hookControls(ok);', '  if (ARGS.includes("--nested")) hookControls(ok);'],
  ["run() stops scrubbing, so every subprocess control inherits a hook's git",
    "  const opt = { cwd: box, encoding: \"utf8\", env: cleanEnv(), timeout: 60000, stdio: [\"ignore\", \"pipe\", \"pipe\"] };",
    "  const opt = { cwd: box, encoding: \"utf8\", timeout: 60000, stdio: [\"ignore\", \"pipe\", \"pipe\"] };",
    /* EQUIVALENT, and kept rather than deleted (E3). A grandchild that inherits
       GIT_DIR still builds its sandbox through git(), which scrubs, so nothing
       reaches the caller's repository and no control can tell the difference.
       The scrub in run() is defence in depth: it stops being equivalent the
       moment any subprocess path stops going through git(). It is reported
       separately so it is never read as a survivor, and never quietly dropped
       so nobody re-derives this reasoning in a year. */
    "equivalent: a grandchild still builds its sandbox through git(), which scrubs"],
  ["the file name is ranked last instead of first",
    "  const rank = (h) => (h.n === 0 ? 0 : h.line.startsWith(needle) || h.line.startsWith('\"' + needle) ? 1 : 2);",
    "  const rank = (h) => (h.n === 0 ? 9 : h.line.startsWith(needle) || h.line.startsWith('\"' + needle) ? 1 : 2);"],

  // --- the fourth confirm round.
  ["the scrub LOOP is narrowed while the list stays whole",
    "  for (const k of GIT_VARS) delete e[k];", "  for (const k of GIT_VARS.slice(0, 3)) delete e[k];"],
  ["the block reader falls back to the whole report when it cannot find the file",
    '  if (i < 0) return "";', "  if (i < 0) return out;"],
  ["the block reader runs past the end of the file's own lines",
    "  for (let k = i + 1; k < lines.length && /^ {6}\\S/.test(lines[k]); k++) rest.push(lines[k]);",
    "  for (let k = i + 1; k < lines.length; k++) rest.push(lines[k]);"],
  ["nestedness is taken from the environment again, where anyone can set it",
    '  if (!ARGS.includes("--nested")) hookControls(ok);',
    "  if (!process.env.BLAST_RADIUS_NESTED) hookControls(ok);"],
];

/* A COPY of the working tree's file, in a scratch directory — not a git clone.
   A clone carries the last COMMIT, so a harness that clones tests the version
   before the change it was written for, reports a screenful of moved anchors,
   and looks like a broken harness rather than a stale one. This copies what is
   on disk right now. It can be a bare copy because the lookup's own controls
   build their own git sandbox and the file imports nothing from beside it. */
const live = join(ROOT, REL);
const original = readFileSync(live, "utf8");
const box = mkdtempSync(join(tmpdir(), "blast-radius-mutants-"));
const target = join(box, "blast-radius.mjs");
writeFileSync(target, original);
/* A git repository, though an empty one: the cwd-relative fault must produce a
   wrong ANSWER here, which is what it produces in the real tree. Run it outside a
   repository and it throws instead, and a crash is not a detection. */
/* The same git-variable scrub the lookup itself needs: run this harness from a
   git hook and an unscrubbed `git init` would reach the caller's repository. */
const GIT_VARS = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR", "GIT_NAMESPACE",
  "GIT_CEILING_DIRECTORIES", "GIT_PREFIX", "GIT_INTERNAL_SUPER_PREFIX"];
const scrub = (e) => { const o = { ...e }; for (const k of GIT_VARS) delete o[k]; return o; };
execFileSync("git", ["init", "-q"], { cwd: box, env: scrub(process.env) });

/* A HOSTILE global gitignore, because a developer's own commonly lists .claude/
   or *.mp3, and the lookup's sandbox has to force those paths in. Without this
   the missing "git add -f" is unkillable here: it fires only on somebody else's
   machine, which is the worst place for a control to be missing. */
writeFileSync(join(box, "globalignore"), ".claude/\n*.mp3\n*.csv\n");
writeFileSync(join(box, "gitconfig"), `[core]\n\texcludesFile = ${join(box, "globalignore")}\n`);
const ENV = scrub({ ...process.env, GIT_CONFIG_GLOBAL: join(box, "gitconfig") });

/* A harness that reports kills without first proving the UNMUTATED file passes
   is reporting nothing: every mutant would "die" against an already-red test. */
let baseline = "";
try {
  baseline = execFileSync("node", [target, "--self-test"],
    { cwd: box, encoding: "utf8", env: ENV, timeout: 300000, stdio: ["ignore", "pipe", "pipe"] });
} catch (e) { baseline = (e.stdout || "") + (e.stderr || ""); }
if (!/controls: \d+ passed, 0 failed/.test(baseline)) {
  /* Caught, not thrown: --self-test exits 1 when it is red, so an uncaught
     execFileSync threw before this could say why, printed a stack trace
     instead of the failing control names, and skipped the cleanup below. */
  console.error("The unmutated lookup does not pass its own controls. Nothing below would mean anything.");
  console.error(baseline.split("\n").filter((l) => l.startsWith("FAIL")).join("\n") || baseline.slice(-800));
  rmSync(box, { recursive: true, force: true });
  process.exit(2);
}
console.log(`baseline: ${/controls: (\d+) passed/.exec(baseline)[1]} controls green under a hostile global gitignore\n`);

let survived = 0, moved = 0, equivalent = 0;
for (const [name, from, to, why] of MUTANTS) {
  const n = original.split(from).length - 1;
  if (n !== 1) {
    console.log(`ANCHOR ${n === 0 ? "MOVED" : `AMBIGUOUS (${n})`}   ${name}`);
    moved++;
    continue;
  }
  writeFileSync(target, original.replace(from, to));
  let out = "";
  /* A timeout, so a fault that loops fails as a survivor with something to read
     rather than hanging a release run with nothing. */
  try { out = execFileSync("node", [target, "--self-test"], { cwd: box, encoding: "utf8", env: ENV, timeout: 300000, stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const m = /controls: (\d+) passed, (\d+) failed/.exec(out);
  /* A crash is NOT a kill. A control that only fails by throwing has told you
     the tool is broken, not that the fault was detected, and the two look
     identical in a pass/fail count. */
  if (!m) { console.log(`CRASHED, not detected   ${name}`); survived++; continue; }
  const failed = Number(m[2]);
  if (failed > 0) { console.log(`killed by ${String(failed).padStart(2)}   ${name}`); continue; }
  if (why) { console.log(`EQUIVALENT       ${name}\n                 ${why}`); equivalent++; continue; }
  console.log(`SURVIVED         ${name}`); survived++;
}

rmSync(box, { recursive: true, force: true });
console.log(`\n${MUTANTS.length} planted faults in ${REL}: ${survived} survived, ${equivalent} equivalent, ${moved} anchor(s) moved.`);
console.log(readFileSync(live, "utf8") === original
  ? "The working tree is byte-for-byte as it was: every mutant lived in a scratch copy."
  : "WARNING: the working tree changed while this ran. Check it before committing.");
process.exit(survived + moved ? 1 : 0);
