/* BLAST RADIUS — what does this change break?
 *
 * E11's second step, as a command instead of a recollection. Name the thing you
 * are about to change and this lists every tracked file that mentions it, every
 * count that would move, every gate floor that follows those counts, every
 * mutant anchored on it, and every scenario doing arithmetic on it.
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
 * Usage:
 *   node tools/blast-radius.mjs --word gob
 *   node tools/blast-radius.mjs --count 50
 *   node tools/blast-radius.mjs --symbol SOUNDOUT_SEAM_MS
 *   node tools/blast-radius.mjs --text "The word is"
 *   node tools/blast-radius.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ARGS = process.argv.slice(2);
const flag = (f) => { const i = ARGS.indexOf(f); return i >= 0 ? ARGS[i + 1] : null; };

/* Every tracked file, because a change is only real once it is committed, and
   an untracked file is nobody's dependency. */
const tracked = () => execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split("\n");

const BINARY = /\.(mp3|png|jpg|jpeg|webm|zip|pdf|wav|ico|woff2?)$/i;

/* What kind of thing each file is, because "12 files mention it" is not a plan
   and "the engine, three tests, two documents and a floor" is. */
function classify(f) {
  if (f === "reference/word-quest.jsx") return "THE ENGINE SOURCE (E1: never edit src/engine.js)";
  if (f.startsWith("features/")) return "ACCEPTANCE SCENARIO — arithmetic here is regenerated (G3)";
  if (f.startsWith("tests/generated/")) return "GENERATED — never edit by hand; regenerate";
  if (f.startsWith("tests/")) return "TEST — literal expected values (E4)";
  if (f === ".claude/gate-baseline.json") return "GATE FLOORS (E6: raise, never lower)";
  if (f === "tools/mutants.mjs" || f === "tools/app-mutants.mjs" || f === "tools/acceptance-mutants.mjs")
    return "MUTANT ANCHOR — re-point it, never delete it (E3)";
  if (f.startsWith("docs/")) return "DOCUMENT — gated by doc-truth (G16)";
  if (f === "SPEC.md") return "SPEC — the master source for behaviour";
  if (f === "CHANGELOG.md") return "CHANGELOG — a parent reads this";
  if (f.startsWith("app/src/")) return "APP — copy here is gated (G11)";
  if (f.startsWith("tools/")) return "TOOL";
  return "other";
}

function hits(needle, { whole = false } = {}) {
  const out = [];
  const re = whole ? new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`) : null;
  for (const f of tracked()) {
    if (BINARY.test(f)) continue;
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    const lines = text.split("\n");
    const found = [];
    lines.forEach((l, i) => {
      if (whole ? re.test(l) : l.includes(needle)) found.push({ n: i + 1, line: l.trim().slice(0, 96) });
    });
    if (found.length) out.push({ file: f, kind: classify(f), found });
  }
  return out;
}

/* The counts a word changes, computed from the engine rather than recalled —
   which is the failure this tool exists to stop. */
async function counts(word) {
  const m = await import("../src/engine.js");
  const bank = m.bankWords();
  const level = m.LEVELS.find((l) => l.words.includes(word));
  const inBank = bank.includes(word);
  return {
    inBank,
    level: level ? level.n : null,
    now: {
      bank: bank.length,
      levelSize: level ? level.words.length : null,
      clips: m.voiceScript().length,
      sounds: m.soundInventory().length,
    },
    after: inBank ? {
      bank: bank.length - 1,
      levelSize: level ? level.words.length - 1 : null,
      clips: m.voiceScript().length - 1,
      sounds: "unchanged unless this word was the only user of a sound",
    } : "not in the bank — removing it changes no count",
  };
}

const FLOORS = {
  bank: ["g11_copy_rules (the chooser text names the bank size)"],
  clips: ["g13_clips"],
  levelSize: ["acceptance scenarios that do arithmetic on a level's size (G3)"],
  tests: ["g1_unit_tests", "g20_tests_mapped"],
};

function report(title, rows) {
  console.log(`\n${title}`);
  if (!rows.length) { console.log("  (nothing)"); return; }
  const byKind = new Map();
  for (const r of rows) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind).push(r);
  }
  for (const [kind, list] of [...byKind].sort()) {
    console.log(`\n  ${kind}`);
    for (const r of list) {
      console.log(`    ${r.file}  (${r.found.length})`);
      for (const h of r.found.slice(0, 3)) console.log(`      ${h.n}: ${h.line}`);
      if (r.found.length > 3) console.log(`      … ${r.found.length - 3} more`);
    }
  }
}

/* Negative controls (E5 in spirit: a lookup that finds nothing is worthless).
   The corpus is synthetic so the controls do not depend on today's repository. */
function selfTest() {
  const ok = [];
  const corpus = [
    ["reference/word-quest.jsx", 'words: ["cat","gob"]'],
    ["tests/engine.test.js", "expect(all.length).toBe(438);"],
    ["docs/settled.md", "the bank holds 438 words"],
    [".claude/gate-baseline.json", '"g13_clips": 499'],
    ["tools/mutants.mjs", '["promotion >= to >", "solid / total >= 0.8;"]'],
    ["app/src/screens/HomeScreen.jsx", "any word from all 438"],
  ];
  const search = (needle) => corpus.filter(([, t]) => t.includes(needle)).map(([f]) => f);

  ok.push(["a word in the engine is found", search("gob").includes("reference/word-quest.jsx")]);
  ok.push(["a count is found in a test AND a document AND the app",
    ["tests/engine.test.js", "docs/settled.md", "app/src/screens/HomeScreen.jsx"]
      .every((f) => search("438").includes(f))]);
  ok.push(["a floor is found in the baseline", search("g13_clips").includes(".claude/gate-baseline.json")]);
  ok.push(["a mutant anchor is found", search("solid / total >= 0.8;").includes("tools/mutants.mjs")]);
  ok.push(["a term nobody uses reports nothing", search("zzzznotathing").length === 0]);
  ok.push(["every file gets a classification", corpus.every(([f]) => classify(f) !== undefined)]);
  ok.push(["the engine source is called out by name, because E1 forbids editing the generated copy",
    classify("reference/word-quest.jsx").includes("E1")]);
  ok.push(["a generated test is marked as generated",
    classify("tests/generated/acceptance.test.js").includes("GENERATED")]);
  ok.push(["a baseline is marked as a floor", classify(".claude/gate-baseline.json").includes("E6")]);
  ok.push(["a mutant file is marked re-point, never delete", classify("tools/mutants.mjs").includes("E3")]);

  for (const [name, pass] of ok) console.log((pass ? "ok   " : "FAIL ") + name);
  const failed = ok.filter(([, p]) => !p).length;
  console.log(`\nblast-radius controls: ${ok.length - failed} passed, ${failed} failed`);
  return failed;
}

// ------------------------------------------------------------------- main
if (ARGS.includes("--self-test")) process.exit(selfTest() ? 1 : 0);

const word = flag("--word"), count = flag("--count"), symbol = flag("--symbol"), text = flag("--text");
if (!word && !count && !symbol && !text) {
  console.log("name what you are changing: --word <w> | --count <n> | --symbol <NAME> | --text \"...\"");
  process.exit(2);
}

if (word) {
  const c = await counts(word);
  console.log(`\n=== BLAST RADIUS: the word "${word}" ===`);
  console.log(`\nIn the bank: ${c.inBank ? `yes, Level ${c.level}` : "no"}`);
  console.log("Counts now:   ", JSON.stringify(c.now));
  console.log("If removed:   ", JSON.stringify(c.after));
  if (c.inBank) {
    console.log("\nFloors that follow those counts:");
    for (const k of ["bank", "clips", "levelSize"]) for (const f of FLOORS[k]) console.log(`  ${k}: ${f}`);
    console.log("\nAlso: its clip, its manifest entry, its row in tools/voice-words.csv, its byte pin in");
    console.log("  tools/voice-lock.json and tools/keeper-bytes.json, its treatment in keepers-treatments.json,");
    console.log("  its entry in the pack recipe (word_speed_override, carrier_cut), and its file in");
    console.log("  tools/pending-words/ if it was ever in the waiting room.");
  }
  report(`Files that name "${word}":`, hits(word, { whole: true }));
}
if (count) report(`Files containing the literal ${count}:`, hits(count, { whole: true }));
if (symbol) report(`Files naming ${symbol}:`, hits(symbol, { whole: true }));
if (text) report(`Files containing "${text}":`, hits(text));

console.log("\nE11: name the change, name what it breaks, THEN edit.");
console.log("Cheap checks worth running now: node tools/mutants.mjs --anchors");
