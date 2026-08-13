/* BLAST RADIUS — what does this change break?
 *
 * E11's second step, as a command instead of a recollection. Name the thing you
 * are about to change and this lists every tracked file that mentions it — by
 * content AND by file name — every count that would move, every gate floor that
 * follows those counts, every mutant anchored on it, and every scenario doing
 * arithmetic on it.
 *
 * WHY IT EXISTS. On 2026-08-13 a beta spent twelve hours failing the same way:
 * a change was made, and only afterwards did something discover what depended
 * on it. Removing one word from the bank left it living in five other files,
 * found one gate at a time over an hour. The same removal put the promotion
 * boundary out of reach of every test, so ">=" could have become ">" and a
 * child would have been held at a level they had earned — caught by a mutation
 * gate twelve minutes into a run, at the worst possible moment.
 *
 * None of those needed a person to be cleverer. They needed a lookup.
 *
 * WHAT IT IS NOT. It is not a gate and it never fails a build. It reports; you
 * decide. It also cannot know what a change MEANS — that removing a word is
 * right, or that a threshold should be 0.8. It knows only what the repository
 * says depends on the thing you named, which is the part a person forgets.
 *
 * WHAT IT STILL CANNOT SEE. Case: "Cat" at the start of a sentence is not
 * found by --word cat, on purpose — every capital hit measured in this
 * repository was prose, not a dependency. Meaning: two files can agree on a
 * number by coincidence, and this cannot tell that apart from a dependency.
 *
 * Usage:
 *   node tools/blast-radius.mjs --word gob
 *   node tools/blast-radius.mjs --count 50
 *   node tools/blast-radius.mjs --symbol SOUNDOUT_SEAM_MS
 *   node tools/blast-radius.mjs --text "Let's try again."
 *   node tools/blast-radius.mjs --word the --all      (no per-group cap)
 *   node tools/blast-radius.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const ARGS = process.argv.slice(2);
const flag = (f) => {
  const i = ARGS.indexOf(f);
  if (i < 0) return null;
  const v = ARGS[i + 1];
  /* A missing value used to be taken from the next flag: "--word --count 50"
     searched the repository for the literal string "--count". */
  if (v === undefined || v.startsWith("--")) { console.error(`${f} needs a value.`); process.exit(2); }
  return v;
};

/* The repository root, resolved once, because git ls-files prints paths
   relative to the CURRENT directory. Run from app/ and a cwd-relative version
   of this tool reports two files instead of twelve, with the counts still
   right — wrong in exactly the place nobody would check. selfTest() re-points
   ROOT at a sandbox tree, which is the only reason it is a let. */
let ROOT = null;
const root = () => (ROOT ||= execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim());

/* Every tracked file, because a change is only real once it is committed, and
   an untracked file is nobody's dependency. */
const tracked = () =>
  execFileSync("git", ["ls-files"], { cwd: root(), encoding: "utf8" }).trim().split("\n").filter(Boolean);

/* Not opened as text. Their NAMES are still searched: w-gob.mp3 is the most
   easily forgotten dependency a word has. */
const BINARY = /\.(mp3|png|jpg|jpeg|webm|zip|pdf|wav|ico|woff2?)$/i;

/* Copy in this repository is typed with typographic punctuation and read back
   with whatever a keyboard produces. Both sides are flattened so --text finds
   the line either way; without this, "Let's try again." and "Let’s try again."
   return two different, both-incomplete answers. */
const PUNCT = [["’", "'"], ["‘", "'"], ["“", '"'], ["”", '"'],
  ["—", "-"], ["–", "-"], ["…", "..."], [" ", " "]];
const flatten = (s) => { let t = s; for (const [a, b] of PUNCT) t = t.split(a).join(b); return t; };

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* What kind of thing each file is, because "12 files mention it" is not a plan
   and "the engine, three tests, two documents and a floor" is. The order of
   these tests is the order of the report: what you must edit first is first,
   what you must NOT edit is named as such. */
const KINDS = [
  "THE ENGINE SOURCE (E1: never edit src/engine.js)",
  "ACCEPTANCE SCENARIO — arithmetic here is regenerated (G3)",
  "GENERATED — never edit by hand; regenerate",
  "TEST — literal expected values (E4)",
  "GATE FLOORS (E6: raise, never lower)",
  "MUTANT ANCHOR — re-point it, never delete it (E3)",
  "THE PACK RECIPE — word_speed_override and carrier_cut live here",
  "SHIPPED AUDIO — byte-pinned; delete it, never re-render it",
  "THE WAITING ROOM — a word that never shipped",
  "VOICE RECORD — change it with the shipping tool, not by hand (E10)",
  "RENDER SCRIPT — a mention here is history; do NOT edit it to erase a word",
  "GOVERNING FILE (G17) — the owner approves changes here",
  "SPEC — the master source for behaviour",
  "CHANGELOG — a parent reads this",
  "DOCUMENT — gated by doc-truth (G16)",
  "APP — copy here is gated (G11)",
  "APP ASSET",
  "TOOL",
  "UNCLASSIFIED — read it yourself",
];
const VOICE_RECORDS = ["tools/voice-lock.json", "tools/keeper-bytes.json", "tools/keepers-treatments.json",
  "tools/voice-words.csv", "tools/voice-sounds.csv", "app/public/voice-review.csv"];
const GOVERNING = ["CLAUDE.md", "AGENTS.md", "README.md"];

function classify(f) {
  if (f === "reference/word-quest.jsx") return KINDS[0];
  if (f.startsWith("features/")) return KINDS[1];
  if (f.startsWith("tests/generated/")) return KINDS[2];
  if (f.startsWith("tests/")) return KINDS[3];
  if (f === ".claude/gate-baseline.json") return KINDS[4];
  if (["tools/mutants.mjs", "tools/app-mutants.mjs", "tools/acceptance-mutants.mjs"].includes(f)) return KINDS[5];
  if (f === "app/public/voice/manifest.json") return KINDS[6];
  if (BINARY.test(f) && f.startsWith("app/public/voice/")) return KINDS[7];
  if (f.startsWith("tools/pending-words/")) return KINDS[8];
  if (VOICE_RECORDS.includes(f)) return KINDS[9];
  if (/^tools\/(render|bake|build)[-_]/.test(f)) return KINDS[10];
  if (GOVERNING.includes(f)) return KINDS[11];
  if (f === "SPEC.md") return KINDS[12];
  if (f === "CHANGELOG.md") return KINDS[13];
  if (f.startsWith("docs/")) return KINDS[14];
  if (f.startsWith("app/src/")) return KINDS[15];
  if (f.startsWith("app/")) return KINDS[16];
  if (f.startsWith("tools/")) return KINDS[17];
  return KINDS[18];
}

/* SEAM_MS lives inside SOUNDOUT_SEAM_MS and again as seamMs. A word-boundary
   search finds neither, and reports a clean short answer while doing it. */
function symbolVariants(s) {
  const out = new Set([s]);
  if (s.includes("_")) {
    const p = s.toLowerCase().split("_").filter(Boolean);
    out.add(p[0] + p.slice(1).map((x) => x[0].toUpperCase() + x.slice(1)).join(""));
  } else if (/[a-z][A-Z]/.test(s)) {
    out.add(s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase());
  }
  return [...out];
}

/* One matcher per kind of thing you can name. Numbers are their own case:
   "-1" must find "let first = -1" and not "pack-1", and "0.8" must find
   "0.80" — a floor written to two decimal places is the same floor. */
function matcher(needle, mode) {
  if (mode === "text") {
    const want = flatten(needle);
    return { test: (l) => flatten(l).includes(want), wrapped: want };
  }
  if (mode === "number") {
    const body = esc(needle) + (needle.includes(".") ? "0*" : "");
    const re = new RegExp(`(?<![\\w.])${body}(?![\\w.])`);
    return { test: (l) => re.test(l) };
  }
  if (mode === "symbol") {
    const vs = symbolVariants(needle);
    return { test: (l) => vs.some((v) => l.includes(v)), names: vs };
  }
  const re = new RegExp(`\\b${esc(needle)}\\b`);
  return { test: (l) => re.test(l) };
}

/* A sentence that wraps in a document is still that sentence. Two of the three
   places the S3 feedback line is written wrap it. */
function wrappedAt(lines, want) {
  const flatWant = want.replace(/\s+/g, " ").trim();
  let buf = "";
  const map = [];
  for (let i = 0; i < lines.length; i++) {
    for (const ch of flatten(lines[i]) + "\n") {
      if (/\s/.test(ch)) { if (buf.endsWith(" ")) continue; buf += " "; } else buf += ch;
      map.push(i + 1);
    }
  }
  const j = buf.indexOf(flatWant);
  return j < 0 ? 0 : map[j];
}

const pathTokens = (f) => f.split(/[^A-Za-z0-9]+/).filter(Boolean);

function hits(needle, mode = "word") {
  const m = matcher(needle, mode);
  const out = [];
  for (const f of tracked()) {
    const found = [];
    if (pathTokens(f).includes(needle)) found.push({ n: 0, line: "(the file name itself)" });
    if (!BINARY.test(f)) {
      let text = null;
      try { text = readFileSync(join(root(), f), "utf8"); } catch { text = null; }
      if (text !== null) {
        const lines = text.split("\n");
        lines.forEach((l, i) => { if (m.test(l)) found.push({ n: i + 1, line: l.trim().slice(0, 96) }); });
        if (!found.length && m.wrapped) {
          const at = wrappedAt(lines, m.wrapped);
          if (at) found.push({ n: at, line: "(wrapped across lines) " + lines[at - 1].trim().slice(0, 72) });
        }
      }
    }
    if (found.length) out.push({ file: f, kind: classify(f), found });
  }
  return out;
}

/* The counts a word changes, computed from the engine rather than recalled —
   which is the failure this tool exists to stop.

   Bank membership is NOT the level lists. bankWords() unions the levels with
   the TRICKY and WORD_SOUND keys, so 21 words are keyed twice and removing one
   from its level shrinks nothing. Saying otherwise invites an agent to lower a
   floor (E6) for a count that never moved. */
async function counts(word) {
  let m;
  try { m = await import("../src/engine.js"); }
  catch (e) { return { engine: false, why: String(e.message).split("\n")[0].slice(0, 120) }; }
  const bank = m.bankWords();
  const level = m.LEVELS.find((l) => l.words.includes(word));
  const alsoKeyed = [];
  if (Object.keys(m.TRICKY).includes(word)) alsoKeyed.push("TRICKY");
  if (Object.keys(m.WORD_SOUND).includes(word)) alsoKeyed.push("WORD_SOUND (its per-word sounds)");
  const now = {
    bank: bank.length,
    levelSize: level ? level.words.length : null,
    clips: m.voiceScript().length,
    sounds: m.soundInventory().length,
  };
  if (!bank.includes(word)) return { engine: true, inBank: false, level: null, alsoKeyed, now };
  /* A sound with exactly one user leaves with that user, and its clip leaves
     with it — so the clip count drops by two, not one. */
  const users = new Map();
  for (const w of bank) for (const id of m.soundIdsFor(w)) users.set(id, (users.get(id) || 0) + 1);
  const sole = m.soundIdsFor(word).filter((id) => users.get(id) === 1);
  const everywhere = {
    bank: now.bank - 1,
    levelSize: level ? now.levelSize - 1 : null,
    clips: now.clips - 1 - sole.length,
    sounds: now.sounds - sole.length,
  };
  const levelOnly = alsoKeyed.length
    ? { bank: now.bank, levelSize: level ? now.levelSize - 1 : null, clips: now.clips, sounds: now.sounds }
    : everywhere;
  return { engine: true, inBank: true, level: level ? level.n : null, alsoKeyed, sole, now, levelOnly, everywhere };
}

const FLOORS = {
  bank: ["g11_copy_rules (the chooser text names the bank size)"],
  clips: ["g13_clips"],
  levelSize: ["acceptance scenarios that do arithmetic on a level's size (G3)"],
  sounds: ["g13_clips (a sound's clip is in the same script)"],
  tests: ["g1_unit_tests and g20_tests_mapped — these move whenever the change adds or deletes a test"],
};

/* The counts are stale the moment reference/word-quest.jsx is edited, because
   they come from the generated engine and the file list comes from git. */
function stale() {
  const src = join(root(), "reference/word-quest.jsx"), gen = join(root(), "src/engine.js");
  if (!existsSync(gen)) return "src/engine.js is not built (it is generated, and gitignored) — run: npm run pretest";
  if (existsSync(src) && statSync(src).mtimeMs > statSync(gen).mtimeMs)
    return "reference/word-quest.jsx is NEWER than src/engine.js — the counts below are the old engine's; run: node tools/extract-engine.mjs";
  return null;
}

/* The line most worth seeing is the one that DEFINES the thing: a CSV row that
   starts with the word, a JSON key, a const. It used to be possible for a
   word's own row in tools/voice-words.csv to sit inside "… 435 more". */
const shown = (r, needle, n = 3) => {
  if (!r) return [];
  const rank = (h) => (h.n === 0 ? 0 : h.line.startsWith(needle) || h.line.startsWith('"' + needle) ? 1 : 2);
  return [...r.found].sort((a, b) => rank(a) - rank(b) || a.n - b.n).slice(0, n);
};

function report(title, rows, needle, { cap = 10, only = null } = {}) {
  console.log(`\n${title}`);
  const keep = only ? rows.filter((r) => only.includes(r.kind)) : rows;
  if (!keep.length) { console.log("  (nothing)"); return; }
  const byKind = new Map();
  for (const r of keep) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind).push(r);
  }
  const order = [...byKind].sort((a, b) => KINDS.indexOf(a[0]) - KINDS.indexOf(b[0]));
  for (const [kind, list] of order) {
    console.log(`\n  ${kind}`);
    const limit = ARGS.includes("--all") ? list.length : cap;
    for (const r of list.slice(0, limit)) {
      console.log(`    ${r.file}  (${r.found.length})`);
      for (const h of shown(r, needle)) console.log(`      ${h.n || "-"}: ${h.line}`);
      if (r.found.length > 3) console.log(`      … ${r.found.length - 3} more in this file`);
    }
    if (list.length > limit) console.log(`    … ${list.length - limit} more files here (--all to list them)`);
  }
}

/* The kinds worth chasing a moved NUMBER into: this is where the promotion
   scenario hid, and where an hour went. */
const ARITHMETIC = [KINDS[1], KINDS[2], KINDS[3], KINDS[4], KINDS[5], KINDS[14]];

// ------------------------------------------------------------------- controls
/* E5: a lookup that quietly finds nothing is worse than no lookup. These drive
   the REAL hits(), classify() and counts() — hits() over a sandbox git tree
   built at real repository paths, in the tools/ship-words.py sandbox style.
   An earlier version searched a six-line array through a private closure: the
   whole file could be deleted and all ten controls still passed, which is the
   E3 line. Every fault the two audits of 2026-08-13 found has a control here.*/
const CORPUS = {
  "reference/word-quest.jsx":
    'const L5 = { words: ["cat", "zzq"] };\n' +
    'const banned = ["catnip"];\n' +
    "const isSecure = (solid, total) => total > 0 && solid / total >= 0.8;\n" +
    "const SOUNDOUT_SEAM_MS = 120;\n" +
    "let first = -1;\n" +
    'const wrong = "Let’s try again.";\n',
  "tests/engine.test.js": "expect(all.length).toBe(438);\nexpect(seamMs(1)).toBe(120);\n",
  "docs/settled.md": "the bank holds 438 words, and pack-1 is retired.\nThe miss line reads Let's\ntry again. and nothing else.\n",
  ".claude/gate-baseline.json": '{ "g13_clips": 499, "g6_ratio": 0.80 }\n',
  "tools/render-voice-pack.py": "SPEED = 0.85\n",
  "tools/mutants.mjs": '["promotion >= to >", "solid / total >= 0.8;"],\n',
  /* The word's own row is the fifth line, and four rows mention it in passing
     before it: unranked, the row that matters sits inside "… more". */
  "tools/voice-words.csv": "word,level,round,notes\ncat,1,round 3,rendered beside zzq\n" +
    "dog,1,round 4,compared with zzq\nhen,2,round 5,after zzq\nzzq,9,round 99,the word itself\n",
  "app/public/voice/manifest.json": '{ "zzq": [1, 2] }\n',
  "app/public/voice/w-zzq.mp3": "zzq is written in these bytes as text, on purpose\n",
  "app/src/screens/HomeScreen.jsx": "any word from all 438\n",
};
const UNTRACKED = { "scratch.md": "zzq is named here but git does not track it\n" };

function sandbox() {
  const box = mkdtempSync(join(tmpdir(), "blast-radius-"));
  for (const [f, body] of Object.entries({ ...CORPUS, ...UNTRACKED })) {
    mkdirSync(join(box, dirname(f)), { recursive: true });
    writeFileSync(join(box, f), body);
  }
  execFileSync("git", ["init", "-q"], { cwd: box });
  execFileSync("git", ["add", ...Object.keys(CORPUS)], { cwd: box });
  return box;
}

const files = (rows) => rows.map((r) => r.file);
const linesOf = (rows, f) => (rows.find((r) => r.file === f)?.found || []).map((h) => h.n);

function searchControls(ok) {
  ok.push(["a word in the engine source is found", files(hits("zzq")).includes("reference/word-quest.jsx")]);
  ok.push(["a word's own row in the voice record is SHOWN, not hidden behind '… more'",
    shown(hits("zzq").find((r) => r.file === "tools/voice-words.csv"), "zzq").some((h) => h.line.startsWith("zzq,"))]);
  ok.push(["its shipped clip is named, even though the clip cannot be read",
    files(hits("zzq")).includes("app/public/voice/w-zzq.mp3")]);
  ok.push(["and the clip's bytes are never opened as text",
    linesOf(hits("zzq"), "app/public/voice/w-zzq.mp3").join() === "0"]);
  ok.push(["its entry in the pack recipe is found",
    files(hits("zzq")).includes("app/public/voice/manifest.json")]);
  ok.push(["a whole word does not match a longer one: cat is not catnip",
    linesOf(hits("cat"), "reference/word-quest.jsx").join() === "1"]);
  ok.push(["an untracked file is nobody's dependency", !files(hits("zzq")).includes("scratch.md")]);
  ok.push(["a term nobody uses reports nothing", hits("zzzznotathing").length === 0]);
  ok.push(["a count is found in a test AND a document AND the app",
    ["tests/engine.test.js", "docs/settled.md", "app/src/screens/HomeScreen.jsx"]
      .every((f) => files(hits("438", "number")).includes(f))]);
  ok.push(["a floor written to two decimal places is the same floor: 0.8 finds 0.80",
    ["tools/mutants.mjs", ".claude/gate-baseline.json"].every((f) => files(hits("0.8", "number")).includes(f))]);
  ok.push(["and 0.8 does not match 0.85", !files(hits("0.8", "number")).includes("tools/render-voice-pack.py")]);
  ok.push(["a negative number is found where it is used, and not in pack-1",
    files(hits("-1", "number")).join() === "reference/word-quest.jsx"]);
  ok.push(["a floor name is found in the baseline",
    files(hits("g13_clips", "symbol")).includes(".claude/gate-baseline.json")]);
  ok.push(["a symbol is found inside a longer identifier",
    files(hits("SEAM_MS", "symbol")).includes("reference/word-quest.jsx")]);
  ok.push(["and in its camelCase twin", files(hits("SEAM_MS", "symbol")).includes("tests/engine.test.js")]);
  ok.push(["a mutant anchor is found", files(hits("solid / total >= 0.8;", "text")).includes("tools/mutants.mjs")]);
  ok.push(["copy typed with a straight quote finds the curly one",
    files(hits("Let's try again.", "text")).includes("reference/word-quest.jsx")]);
  ok.push(["and finds it where a document wraps it across two lines",
    files(hits("Let's try again.", "text")).includes("docs/settled.md")]);
}

function classifyControls(ok) {
  const label = (f, part) => classify(f).includes(part);
  ok.push(["the engine source is called out by name, because E1 forbids editing the generated copy",
    label("reference/word-quest.jsx", "E1")]);
  ok.push(["a generated test is marked as generated", label("tests/generated/acceptance.test.js", "GENERATED")]);
  ok.push(["a baseline is marked as a floor", label(".claude/gate-baseline.json", "E6")]);
  ok.push(["a mutant file is marked re-point, never delete", label("tools/mutants.mjs", "E3")]);
  ok.push(["the pack recipe is not filed as 'other'", label("app/public/voice/manifest.json", "PACK RECIPE")]);
  ok.push(["a shipped clip says delete, never re-render", label("app/public/voice/w-cat.mp3", "byte-pinned")]);
  ok.push(["a voice record says use the shipping tool", label("tools/voice-words.csv", "VOICE RECORD")]);
  ok.push(["a render script says do NOT edit it to erase a word",
    label("tools/render-voice-pack.py", "do NOT edit")]);
  ok.push(["a governing file names the owner", label("CLAUDE.md", "G17")]);
  ok.push(["and nothing above lands in the unclassified bucket",
    !["app/public/voice/manifest.json", "tools/voice-words.csv", "CLAUDE.md", "app/public/voice/w-cat.mp3"]
      .some((f) => classify(f) === KINDS[18])]);
}

async function countControls(ok) {
  /* Against the REAL engine, because the fault being controlled is the tool
     believing the level lists are the bank. */
  const cat = await counts("cat"), the = await counts("the"), gob = await counts("gob");
  ok.push(["a word only in a level shrinks the bank when removed", cat.everywhere.bank === cat.now.bank - 1]);
  ok.push(["a word keyed twice does NOT shrink the bank when only its level entry goes",
    the.alsoKeyed.length > 0 && the.levelOnly.bank === the.now.bank]);
  ok.push(["a word that is the only user of a sound takes two clips with it",
    the.sole.length === 1 && the.everywhere.clips === the.now.clips - 2]);
  ok.push(["and a word that shares all its sounds takes one",
    cat.sole.length === 0 && cat.everywhere.clips === cat.now.clips - 1]);
  ok.push(["a word that is not in the bank is reported as not in the bank", gob.inBank === false]);
  ok.push(["every count that can move names the floors that follow it",
    ["bank", "clips", "levelSize", "sounds", "tests"].every((k) => FLOORS[k]?.length > 0)]);
}

async function selfTest() {
  const ok = [];
  const real = process.cwd();
  const box = sandbox();
  try {
    ROOT = box;
    searchControls(ok);
    /* F1, the worst of the two audits' findings: run from a subdirectory and a
       cwd-relative lookup answers with that subtree only, counts still right. */
    ROOT = null;
    process.chdir(join(box, "app"));
    const fromBelow = files(hits("zzq")).length;
    process.chdir(real);
    ROOT = box;
    ok.push(["the answer is the same run from a subdirectory as from the root",
      fromBelow === files(hits("zzq")).length && fromBelow === 4]);
  } finally {
    process.chdir(real);
    ROOT = null;
    rmSync(box, { recursive: true, force: true });
  }
  classifyControls(ok);
  await countControls(ok);

  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\nblast-radius controls: ${ok.length - failed} passed, ${failed} failed`);
  return failed;
}

// ------------------------------------------------------------------- main
if (ARGS.includes("--self-test")) process.exit((await selfTest()) ? 1 : 0);

const word = flag("--word"), count = flag("--count"), symbol = flag("--symbol"), text = flag("--text");
if ([word, count, symbol, text].every((v) => v === null)) {
  console.log("name what you are changing: --word <w> | --count <n> | --symbol <NAME> | --text \"...\"");
  process.exit(2);
}

const warn = stale();
if (warn) console.log(`\n⚠️  ${warn}`);

if (word !== null) {
  const c = await counts(word);
  console.log(`\n=== BLAST RADIUS: the word "${word}" ===`);
  if (!c.engine) {
    console.log(`\nNo counts: ${c.why}`);
  } else {
    console.log(`\nIn the bank: ${c.inBank ? `yes, Level ${c.level ?? "none"}` : "no"}`);
    if (c.alsoKeyed.length) console.log(`Also keyed in: ${c.alsoKeyed.join(", ")} — the bank is the union, not the levels`);
    console.log("Counts now:            ", JSON.stringify(c.now));
    if (c.inBank) {
      if (c.alsoKeyed.length) console.log("If its level entry goes:", JSON.stringify(c.levelOnly));
      console.log("If removed everywhere: ", JSON.stringify(c.everywhere));
      if (c.sole.length) console.log(`It is the ONLY user of: ${c.sole.join(", ")} — those clips go with it`);
      console.log("\nFloors that follow those counts:");
      /* Every key, from the table itself. FLOORS.tests was declared and never
         printed, and those were the two floors the founding incident raised. */
      for (const [k, list] of Object.entries(FLOORS)) for (const f of list) console.log(`  ${k}: ${f}`);
    }
  }
  report(`Files that name "${word}":`, hits(word), word);
  /* The step the tool used to leave to a person, which is where the hour went:
     the level size it just printed is the number the promotion scenario does
     arithmetic on, and nothing in the word's own file list mentions it. */
  if (c.engine && c.inBank && c.now.levelSize) {
    const n = String(c.now.levelSize);
    report(`Arithmetic on this level's size (${n}) — chased for you:`, hits(n, "number"), n, { only: ARITHMETIC });
  }
}
if (count !== null) report(`Files containing the literal ${count}:`, hits(count, "number"), count);
if (symbol !== null) {
  const vs = symbolVariants(symbol);
  report(`Files naming ${vs.join(" / ")}:`, hits(symbol, "symbol"), symbol);
}
if (text !== null) report(`Files containing "${text}":`, hits(text, "text"), text);

console.log("\nE11: name the change, name what it breaks, THEN edit.");
console.log("Cheap checks worth running now: node tools/mutants.mjs --anchors");
