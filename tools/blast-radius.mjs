/* BLAST RADIUS — what does this change break?
 *
 * E11's second step, as a command instead of a recollection. Name the thing you
 * are about to change and this lists every tracked file that mentions it — by
 * content AND by file name — every count that would move, every gate floor that
 * follows those counts, every mutant anchored on it, and every file doing
 * arithmetic on a number the change moves.
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
 * WHAT IT IS NOT. It cannot know what a change MEANS — that removing a word is
 * right, or that a threshold should be 0.8. It knows only what the repository
 * says depends on the thing you named, which is the part a person forgets.
 * The lookup itself never fails a build. Its CONTROLS do: `--self-test` runs in
 * `npm run check` (E7), so a broken lookup blocks a push even though a lookup
 * that merely reports something inconvenient never will.
 *
 * WHAT IT STILL CANNOT SEE, all four measured rather than assumed:
 *   1. Case. "Cat" at the start of a sentence is not a dependency and is not
 *      reported for --word. Every capital hit measured in this repository was
 *      prose or UI copy. --symbol folds case only for a name with a separator
 *      or a case transition (word_speed_override, HOLD_MS, seamMs), where a
 *      capital IS the identifier. A single ALL-CAPS word is left alone: HEART
 *      is a real export and also this repository's commonest phrase, and
 *      folding its case turns 10 files into 66, of which 56 are prose.
 *   2. Coincidence. Two files can agree on a number by accident, and nothing
 *      here can tell that apart from a dependency.
 *   2b. A numeral is found however it is punctuated (1500 finds "1,500" and
 *      "1_500"), but not when it is written as words.
 *   3. Computation. A dependency written as LEVELS[1].words.length rather than
 *      as a literal cannot be found by --count. Search the symbol as well.
 *   4. Classification. Every file's kind is a guess from its path. A file
 *      filed under the wrong kind is still listed, but under the wrong
 *      heading, and the heading is what you scan.
 *
 * Usage:
 *   node tools/blast-radius.mjs --word gob
 *   node tools/blast-radius.mjs --count 50
 *   node tools/blast-radius.mjs --symbol SOUNDOUT_SEAM_MS
 *   node tools/blast-radius.mjs --text "Let's try again."
 *   node tools/blast-radius.mjs --word the --all      (every matching line)
 *   node tools/blast-radius.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ARGS = process.argv.slice(2);
const flag = (f) => {
  const i = ARGS.indexOf(f);
  if (i < 0) return null;
  const v = ARGS[i + 1];
  /* A missing value used to be taken from the next flag: "--word --count 50"
     searched the repository for the literal string "--count". An empty value
     used to match every line of every file and print the repository back. */
  if (v === undefined || v.startsWith("--")) { console.error(`${f} needs a value.`); process.exit(2); }
  if (v === "") { console.error(`${f} cannot be empty.`); process.exit(2); }
  return v;
};

/* The repository root, resolved once, because git ls-files prints paths
   relative to the CURRENT directory. Run from app/ and a cwd-relative version
   of this tool reports two files instead of twelve, with the counts still
   right — wrong in exactly the place nobody would check. selfTest() re-points
   ROOT at a sandbox tree, which is the only reason it is a let. */
let ROOT = null;

/* Git's own environment variables OVERRIDE the working directory. A hook runs
   with GIT_DIR and GIT_INDEX_FILE exported, so a `git add` here — meant for a
   throwaway sandbox — writes the sandbox's files into the CALLING repository's
   index instead. An audit reproduced it from a clean tree: SPEC.md staged at 2
   lines instead of 975, src/engine.js staged though it is generated, 19 files
   and nearly twenty thousand deletions, all waiting for the next commit.
   Running `npm run check` from a pre-commit hook is the ordinary way to
   automate E7, so this is not an exotic path. Every git call below runs with
   these stripped, and a control proves a hook's repository is untouched. */
const GIT_VARS = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR", "GIT_NAMESPACE",
  "GIT_CEILING_DIRECTORIES", "GIT_PREFIX", "GIT_INTERNAL_SUPER_PREFIX"];
function cleanEnv(extra = {}) {
  const e = { ...process.env, ...extra };
  for (const k of GIT_VARS) delete e[k];
  return e;
}
const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", env: cleanEnv() });

const root = () => (ROOT ||= git(["rev-parse", "--show-toplevel"], process.cwd()).trim());

const tracked = () => git(["ls-files"], root()).trim().split("\n").filter(Boolean);

/* Not opened as text. Their NAMES are still searched: w-gob.mp3 is the most
   easily forgotten dependency a word has. */
const BINARY = /\.(mp3|png|jpg|jpeg|webm|zip|pdf|wav|ico|woff2?)$/i;

/* How much was actually looked at. A walk that quietly stopped early, or a
   file that failed to read, is otherwise indistinguishable from a short answer
   that is simply true. */
const SCAN = { tracked: 0, read: 0, binary: 0, unreadable: 0 };

/* Copy in this repository is typed with typographic punctuation and read back
   with whatever a keyboard produces. BOTH sides are flattened — flattening only
   the file gives the same two incomplete answers in the other direction, and
   the natural way to get a sentence is to paste it from SPEC, which is curly. */
const PUNCT = [["’", "'"], ["‘", "'"], ["“", '"'], ["”", '"'],
  ["—", "-"], ["–", "-"], ["…", "..."], [" ", " "]];
const flatten = (s) => { let t = s; for (const [a, b] of PUNCT) t = t.split(a).join(b); return t; };

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* What kind of thing each file is, because "12 files mention it" is not a plan
   and "the engine, three tests, two documents and a floor" is. The order of
   these tests is the order of the report: what you must edit first is first,
   what you must NOT edit is named as such. */
const KINDS = [
  "THE ENGINE SOURCE (E1: never edit src/engine.js)",
  "GENERATED ENGINE — edit reference/word-quest.jsx instead (E1)",
  "ACCEPTANCE SCENARIO — arithmetic here is regenerated (G3)",
  "GENERATED — never edit by hand; regenerate",
  "TEST — literal expected values (E4)",
  "GATE FLOORS (E6: raise, never lower)",
  "MUTANT ANCHOR — re-point it, never delete it (E3)",
  "THE PACK RECIPE — word_speed_override and carrier_cut live here",
  "SHIPPED AUDIO — byte-pinned; delete it, never re-render it",
  "THE WAITING ROOM — approved and not yet shipped",
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
  if (f === "src/engine.js") return KINDS[1];
  if (f.startsWith("features/")) return KINDS[2];
  if (f.startsWith("tests/generated/")) return KINDS[3];
  if (f.startsWith("tests/")) return KINDS[4];
  if (f === ".claude/gate-baseline.json") return KINDS[5];
  if (["tools/mutants.mjs", "tools/app-mutants.mjs", "tools/acceptance-mutants.mjs"].includes(f)) return KINDS[6];
  if (f === "app/public/voice/manifest.json") return KINDS[7];
  if (BINARY.test(f) && f.startsWith("app/public/voice/")) return KINDS[8];
  if (/^tools\/pending-(words|sounds)\//.test(f)) return KINDS[9];
  if (VOICE_RECORDS.includes(f)) return KINDS[10];
  if (/^tools\/(render|bake|build)[-_]/.test(f)) return KINDS[11];
  if (GOVERNING.includes(f)) return KINDS[12];
  if (f === "SPEC.md") return KINDS[13];
  if (f === "CHANGELOG.md") return KINDS[14];
  if (f.startsWith("docs/")) return KINDS[15];
  if (f.startsWith("app/src/")) return KINDS[16];
  if (f.startsWith("app/")) return KINDS[17];
  if (f.startsWith("tools/")) return KINDS[18];
  return KINDS[19];
}

/* SEAM_MS lives inside SOUNDOUT_SEAM_MS, again as seamMs, and again as hold_ms
   in the Python. Matching is case-insensitive across the variants: for an
   identifier a capital IS the identifier, and WORD_SPEED_OVERRIDE returning a
   third of what word_speed_override returns is two answers for one name. */
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

/* The token a match sits inside, so a number can tell "48px" (a dependency)
   from the start of a content hash (noise). */
function tokenAt(line, i) {
  let a = i, b = i;
  while (a > 0 && /[\w.-]/.test(line[a - 1])) a--;
  while (b < line.length && /[\w.-]/.test(line[b])) b++;
  return line.slice(a, b);
}
const HASHISH = /^[0-9a-f]{7,}$/i;
const unsep = (s) => s.replace(/(?<=\d)[,_](?=\d{3}\b)/g, "");

/* One matcher per kind of thing you can name. Numbers are their own case:
   "-1" must find "let first = -1" and not "pack-1"; "0.8" must find "0.80",
   because a floor written to two decimal places is the same floor; and "44"
   must find "44px", because the two files that implement a 44-pixel rule spell
   it with the unit and a report titled "files containing 44" that omits them
   is the failure this tool exists to remove. */
function matcher(needle, mode) {
  if (mode === "text") {
    const want = flatten(needle);
    return { test: (l) => flatten(l).includes(want), wrapped: want };
  }
  if (mode === "number") {
    /* 1,500 and 1500 are the same number, and the document that states the
       clip-duration ceiling writes it with the comma while the gate that
       enforces it writes it without. Only a separator between a digit and a
       group of exactly three is stripped, so md5_2 stays md5_2. */
    const body = esc(unsep(needle)) + (needle.includes(".") ? "0*" : "");
    /* Rejects a following DIGIT, and a dot only when a digit follows it: 44
       must find "44px", and "7" must find "7." at the end of a sentence — SPEC
       writes its level counts that way — while neither may match inside 7.5. */
    const re = new RegExp(`(?<![\\w.])${body}(?!\\d|\\.\\d)`, "g");
    return {
      test: (l) => {
        const s = unsep(l);
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(s))) if (!HASHISH.test(tokenAt(s, m.index))) return true;
        return false;
      },
    };
  }
  if (mode === "symbol") {
    const names = symbolVariants(needle);
    /* Case-insensitive only for a name with a separator or a case transition —
       word_speed_override, HOLD_MS, seamMs. A single ALL-CAPS word is a
       different case: HEART is a real export AND the repository's commonest
       phrase, and folding case turns 10 files into 66, of which 56 are prose.
       The S2 fix keeps its whole value; the prose stays out. */
    if (names.length === 1) return { test: (l) => l.includes(needle), names };
    const vs = names.map((v) => v.toLowerCase());
    return { test: (l) => { const low = l.toLowerCase(); return vs.some((v) => low.includes(v)); }, names };
  }
  const re = new RegExp(`\\b${esc(needle)}\\b`);
  return { test: (l) => re.test(l) };
}

/* A sentence that wraps in a document is still that sentence: docs/voice-pack.md
   wraps "Sound by sound, you built the whole word!" across two lines, and a
   line-by-line search reports the sentence as living in four files when it
   lives in five. Returns the 1-based line the sentence STARTS on. */
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
  const files = tracked();
  SCAN.tracked = files.length; SCAN.read = 0; SCAN.binary = 0; SCAN.unreadable = 0;
  for (const f of files) {
    const found = [];
    if (pathTokens(f).includes(needle)) found.push({ n: 0, line: "(the file name itself)" });
    if (BINARY.test(f)) SCAN.binary++;
    else {
      let text = null;
      try { text = readFileSync(join(root(), f), "utf8"); } catch { text = null; }
      if (text === null) SCAN.unreadable++;
      else {
        SCAN.read++;
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
   the TRICKY and WORD_SOUND keys, so some words are keyed twice and removing
   one from its level shrinks nothing. Saying otherwise invites an agent to
   lower a floor (E6) for a count that never moved.

   The engine is imported from the ROOT, not from this file's own directory, so
   the controls can put a small honest engine in a sandbox and read real
   arithmetic out of it instead of asserting facts about today's word bank. */
async function counts(word) {
  let m;
  try { m = await import(pathToFileURL(join(root(), "src/engine.js")).href); }
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
     with it — so the clip count drops by two, not one. Counted over the BANK:
     counted over the levels, a sound shared with a word that lives only in
     WORD_SOUND looks unique and the prediction is wrong by one clip. */
  const users = new Map();
  for (const w of bank) for (const id of m.soundIdsFor(w)) users.set(id, (users.get(id) || 0) + 1);
  const sole = m.soundIdsFor(word).filter((id) => users.get(id) === 1);
  const everywhere = {
    bank: now.bank - 1,
    levelSize: level ? now.levelSize - 1 : null,
    clips: now.clips - 1 - sole.length,
    sounds: now.sounds - sole.length,
  };
  const levelOnly = alsoKeyed.length && level
    ? { bank: now.bank, levelSize: now.levelSize - 1, clips: now.clips, sounds: now.sounds }
    : null;
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

/* Every FILE is listed, always. Only the excerpt LINES under it are capped:
   a dependency hidden behind "… 37 more files (--all to list them)" is the
   founding failure with a flag in front of it, and the reader who needed that
   flag is exactly the reader who did not notice the line offering it. */
function report(title, rows, needle) {
  console.log(`\n${title}`);
  if (!rows.length) { console.log("  (nothing)"); return; }
  const byKind = new Map();
  for (const r of rows) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind).push(r);
  }
  const lines = ARGS.includes("--all") ? Infinity : 3;
  for (const [kind, list] of [...byKind].sort((a, b) => KINDS.indexOf(a[0]) - KINDS.indexOf(b[0]))) {
    console.log(`\n  ${kind}`);
    for (const r of list) {
      console.log(`    ${r.file}  (${r.found.length})`);
      for (const h of shown(r, needle, lines)) console.log(`      ${h.n || "-"}: ${h.line}`);
      if (r.found.length > lines) console.log(`      … ${r.found.length - lines} more lines in this file (--all)`);
    }
  }
  console.log(`\n  ${rows.length} file(s), of ${SCAN.tracked} tracked: ${SCAN.read} read, ${SCAN.binary} not opened as text (name searched)`
    + (SCAN.unreadable ? `, ${SCAN.unreadable} UNREADABLE` : ""));
}

// ------------------------------------------------------------------- controls
/* E5: a lookup that quietly finds nothing is worse than no lookup.
 *
 * Two layers, because the first version only had the lower one and an audit
 * gutted the renderer with every control still green: 24 of 32 planted faults
 * survived, and the tool printed a clean, confident, complete-looking answer
 * with every file missing.
 *   - SEARCH controls call hits(), classify() and counts() over a sandbox git
 *     tree built at real repository paths, in the tools/ship-words.py style.
 *   - OUTPUT controls run this file as a subprocess with the sandbox as its
 *     working directory and assert on what it PRINTS.
 * The sandbox carries its own small engine, so no control asserts a fact about
 * today's word bank. An earlier version did, and removing one word made
 * `npm run check` die with a stack trace.
 */
const ENGINE = `
export const LEVELS = [
  { n: 1, words: ["cat", "hen"] },
  { n: 2, words: ["zzq", "qqz", "kek", "lel", "mem", "nen", "pep"] },
];
export const TRICKY = { qqz: "a tricky note" };
export const WORD_SOUND = { zzq: { 0: "zee" }, wsonly: { 0: "sole" } };
const SOUNDS = {
  cat: ["d:k", "d:a", "d:t"], hen: ["d:h", "d:t"], zzq: ["d:zee"], qqz: ["d:k", "d:a"],
  kek: ["d:k"], lel: ["d:k"], mem: ["d:k"], nen: ["d:k"], pep: ["d:k"],
  wsonly: ["d:sole", "d:h"],
};
export const soundIdsFor = (w) => SOUNDS[w] || [];
export function bankWords() {
  const s = new Set();
  for (const l of LEVELS) for (const w of l.words) s.add(w);
  for (const w of Object.keys(TRICKY)) s.add(w);
  for (const w of Object.keys(WORD_SOUND)) s.add(w);
  return [...s].sort();
}
export function soundInventory() {
  const s = new Set();
  for (const w of bankWords()) for (const id of soundIdsFor(w)) s.add(id);
  return [...s].sort();
}
export const voiceScript = () =>
  [1, 2, 3].concat(bankWords()).concat(soundInventory()).map((x) => ({ id: String(x) }));
`;
/* bank 10, level 2 holds 7, sounds 6, clips 3 + 10 + 6 = 19.
   zzq is the only user of d:zee. hen looks like the only user of d:h until
   wsonly — which is in no level — is counted, which is the whole point. */
const CORPUS = {
  "reference/word-quest.jsx":
    'const L2 = { words: ["zzq", "qqz"] };\n' +
    'const banned = ["zzqling"];\n' +
    "const isSecure = (solid, total) => total > 0 && solid / total >= 0.8;\n" +
    "const SOUNDOUT_SEAM_MS = 120;\n" +
    "const CHILD_TARGET = 44;\n" +
    'const HEART = ["kek"];\n' +
    "let first = -1;\n" +
    'const wrong = "Let’s try again.";\n',
  "features/promotion.feature": "  Given a player on Level 2 with 6 of the 7 words at box 3\n",
  "tests/generated/acceptance.test.js": "expect(LEVELS[1].words.length).toBe(7);\n",
  "tests/engine.test.js": "expect(all.length).toBe(10);\nexpect(seamMs(1)).toBe(120);\n",
  "SPEC.md": "Level word counts: 2, 7.\nThe child control floor is 44px.\nA word clip may not exceed 1,500 ms.\n",
  "CHANGELOG.md": "Ten words in the bank, and the heart words come early.\n",
  "docs/settled.md": "the bank holds 10 words, and pack-1 is retired.\nThe miss line reads Let's\ntry again. and nothing else.\n",
  ".claude/gate-baseline.json": '{ "g13_clips": 19, "g6_ratio": 0.80 }\n',
  "tools/render-voice-pack.py": "SPEED = 0.85\nhold_ms = 450\nword_speed_override = {}\nceiling = 1500\n",
  "tools/mutants.mjs": '["promotion >= to >", "solid / total >= 0.8;"],\n',
  /* A name hit AND five content hits, so a report that stopped ranking the
     file name first would push it out of the excerpt cap and hide the fact
     that the file is named for the word. */
  "tools/pending-words/w-zzq.json": '{ "word": "zzq",\n  "note": "zzq waiting",\n' +
    '  "from": "zzq round 1",\n  "seat": "zzq mid",\n  "why": "zzq unshipped" }\n',
  "tools/voice-words.csv": "word,level,round,notes\ncat,1,round 3,rendered beside zzq\n" +
    "hen,1,round 4,compared with zzq\nqqz,2,round 5,after zzq\nzzq,2,round 99,the word itself\n",
  /* A SECOND file of the same kind, so a report that keeps only the first file
     of each group is a fault rather than a coincidence. */
  /* Five hits whose defining line is LAST by line number, so a report that
     stopped ranking would show three passing mentions and hide the pin. */
  "tools/voice-lock.json": '{ "note": "zzq beside cat",\n  "more": "zzq again",\n' +
    '  "third": "zzq once more",\n  "fourth": "zzq yet again",\n  "zzq": ["pinned"] }\n',
  /* The same sentence on ONE line with a straight quote, where settled.md wraps
     it: flattening only the file side still finds the wrapped one, so without
     this the one-sided fault looks harmless. */
  "docs/qa-procedure.md": "The miss line reads Let's try again. exactly.\n",
  "app/public/voice/manifest.json": '{ "zzq": [1, 2] }\n',
  "app/public/voice/w-zzq.mp3": "zzq is written in these bytes as text, on purpose\n",
  "app/src/screens/HomeScreen.jsx": "any word from all 10\n",
  "app/src/wq-css.js": "min-height: 44px;\nconst wordSpeedOverride = 1;\n",
  "src/engine.js": ENGINE,
};
const UNTRACKED = { "scratch.md": "zzq is named here but git does not track it\n" };
const TOOL = fileURLToPath(import.meta.url);

function sandbox() {
  const box = mkdtempSync(join(tmpdir(), "blast-radius-"));
  for (const [f, body] of Object.entries({ ...CORPUS, ...UNTRACKED })) {
    mkdirSync(join(box, dirname(f)), { recursive: true });
    writeFileSync(join(box, f), body);
  }
  git(["init", "-q"], box);
  /* -f because a developer's global gitignore commonly lists .claude/ or
     *.mp3, and a control that crashes on somebody's machine teaches them to
     stop believing the check. Caught rather than thrown for the same reason:
     an unstaged corpus must be reported by the named control below, not as a
     stack trace in the middle of npm run check. */
  try { git(["add", "-f", ...Object.keys(CORPUS)], box); }
  catch { /* reported by "every tracked file is accounted for" */ }
  return box;
}

const files = (rows) => rows.map((r) => r.file);
/* The excerpt lines printed UNDER one named file. Asserting on the whole
   report instead let three faults through: with several files in the corpus,
   one file's off-by-one tail is another file's right answer, and a file-name
   marker dropped from one block is still printed by a clip that has no other
   hit. Excerpt lines are the six-space indent; the block ends at the next
   file or kind heading. */
const block = (out, file) => {
  const lines = out.split("\n");
  const i = lines.findIndex((l) => l.trim().startsWith(file + "  ("));
  if (i < 0) return "";
  const rest = [];
  for (let k = i + 1; k < lines.length && /^ {6}\S/.test(lines[k]); k++) rest.push(lines[k]);
  return rest.join("\n");
};
const linesOf = (rows, f) => (rows.find((r) => r.file === f)?.found || []).map((h) => h.n);
/* stderr is captured rather than inherited: a control that expects a refusal
   would otherwise print that refusal into the middle of the control list. */
/* stderr is captured rather than inherited: a control that expects a refusal
   would otherwise print that refusal into the middle of the control list. The
   timeout is so a fault that loops fails a control instead of hanging a
   release run with nothing to read. */
let LAST_STATUS = 0;
const run = (box, ...argv) => {
  const opt = { cwd: box, encoding: "utf8", env: cleanEnv(), timeout: 60000, stdio: ["ignore", "pipe", "pipe"] };
  try { LAST_STATUS = 0; return execFileSync(process.execPath, [TOOL, ...argv], opt); }
  catch (e) { LAST_STATUS = e.status ?? -1; return (e.stdout || "") + (e.stderr || ""); }
};

function searchControls(ok) {
  ok.push(["a word in the engine source is found", files(hits("zzq")).includes("reference/word-quest.jsx")]);
  ok.push(["a word's own row in the voice record is SHOWN, not hidden behind '… more'",
    shown(hits("zzq").find((r) => r.file === "tools/voice-words.csv"), "zzq").some((h) => h.line.startsWith("zzq,"))]);
  ok.push(["its shipped clip is named, even though the clip cannot be read",
    files(hits("zzq")).includes("app/public/voice/w-zzq.mp3")]);
  ok.push(["and the clip's bytes are never opened as text",
    linesOf(hits("zzq"), "app/public/voice/w-zzq.mp3").join() === "0"]);
  ok.push(["its entry in the pack recipe is found", files(hits("zzq")).includes("app/public/voice/manifest.json")]);
  ok.push(["its file in the waiting room is found", files(hits("zzq")).includes("tools/pending-words/w-zzq.json")]);
  ok.push(["a whole word does not match a longer one: zzq is not zzqling",
    linesOf(hits("zzq"), "reference/word-quest.jsx").join() === "1"]);
  ok.push(["an untracked file is nobody's dependency", !files(hits("zzq")).includes("scratch.md")]);
  ok.push(["a term nobody uses reports nothing", hits("zzzznotathing").length === 0]);
  ok.push(["every tracked file is accounted for: read, or matched by name only",
    SCAN.tracked === Object.keys(CORPUS).length && SCAN.read + SCAN.binary === SCAN.tracked && SCAN.unreadable === 0]);
}

function numberControls(ok) {
  ok.push(["a count is found in a test AND a document AND the app",
    ["tests/engine.test.js", "docs/settled.md", "app/src/screens/HomeScreen.jsx"]
      .every((f) => files(hits("10", "number")).includes(f))]);
  ok.push(["a number carrying a unit is still that number: 44 finds 44px",
    ["app/src/wq-css.js", "SPEC.md"].every((f) => files(hits("44", "number")).includes(f))]);
  ok.push(["and the bare number is found too", files(hits("44", "number")).includes("reference/word-quest.jsx")]);
  ok.push(["a floor written to two decimal places is the same floor: 0.8 finds 0.80",
    ["tools/mutants.mjs", ".claude/gate-baseline.json"].every((f) => files(hits("0.8", "number")).includes(f))]);
  ok.push(["and 0.8 does not match 0.85", !files(hits("0.8", "number")).includes("tools/render-voice-pack.py")]);
  ok.push(["a negative number is found where it is used, and not in pack-1",
    files(hits("-1", "number")).join() === "reference/word-quest.jsx"]);
  ok.push(["a numeral written with a separator is the same numeral: 1500 finds 1,500",
    ["SPEC.md", "tools/render-voice-pack.py"].every((f) => files(hits("1500", "number")).includes(f))]);
}

function symbolTextControls(ok) {
  ok.push(["a symbol is found inside a longer identifier",
    files(hits("SEAM_MS", "symbol")).includes("reference/word-quest.jsx")]);
  ok.push(["and in its camelCase twin", files(hits("SEAM_MS", "symbol")).includes("tests/engine.test.js")]);
  ok.push(["and spelled in lower case, because for an identifier a capital is not prose",
    files(hits("HOLD_MS", "symbol")).includes("tools/render-voice-pack.py")]);
  ok.push(["a name of three parts is found too, not only two",
    ["tools/render-voice-pack.py", "app/src/wq-css.js"]
      .every((f) => files(hits("WORD_SPEED_OVERRIDE", "symbol")).includes(f))]);
  /* And the limit of that: a single ALL-CAPS word is an export AND an ordinary
     English word, so folding its case turns a dependency list into prose. */
  ok.push(["a single-word name stays case-sensitive, so an export does not drag in prose",
    files(hits("HEART", "symbol")).join() === "reference/word-quest.jsx"]);
  ok.push(["a mutant anchor is found", files(hits("solid / total >= 0.8;", "text")).includes("tools/mutants.mjs")]);
  ok.push(["copy typed with a straight quote finds the curly one",
    files(hits("Let's try again.", "text")).includes("reference/word-quest.jsx")]);
  ok.push(["copy pasted with the curly quote finds the straight one, which is the same fault the other way up",
    files(hits("Let’s try again.", "text")).includes("docs/qa-procedure.md")]);
  ok.push(["a document that wraps the sentence is found, on the line it starts",
    linesOf(hits("Let's try again.", "text"), "docs/settled.md").join() === "2"]);
  /* And a sentence that does NOT wrap is reported as an ordinary line. Without
     this the wrap fallback quietly rescues a half-flattened matcher: the file
     is still found, so every other control passes, and the reader is told a
     line wraps that does not. */
  ok.push(["a sentence that does not wrap is not reported as though it did",
    /* The whole array, not found[0]: the fault this is written for APPENDS a
       phantom wrapped hit rather than replacing the real one, so every
       text-mode file gets a duplicate and the per-file count doubles. */
    (hits("Let’s try again.", "text").find((r) => r.file === "docs/qa-procedure.md")?.found || [])
      .every((h) => !h.line.includes("wrapped across lines"))]);
}

function classifyControls(ok) {
  const label = (f, part) => classify(f).includes(part);
  const cases = [
    ["reference/word-quest.jsx", "E1", "the engine source is called out by name"],
    ["src/engine.js", "GENERATED ENGINE", "the generated engine says edit the reference instead"],
    ["features/promotion.feature", "ACCEPTANCE SCENARIO", "an acceptance scenario is named as one"],
    ["tests/generated/acceptance.test.js", "GENERATED", "a generated test is marked as generated"],
    ["tests/engine.test.js", "E4", "a hand-written test is told to use literal values"],
    [".claude/gate-baseline.json", "E6", "a baseline is marked as a floor"],
    ["tools/mutants.mjs", "E3", "a mutant file is marked re-point, never delete"],
    ["tools/acceptance-mutants.mjs", "E3", "and so is the acceptance half of the mutation gate"],
    ["tools/app-mutants.mjs", "E3", "and the app half"],
    ["app/public/voice/manifest.json", "PACK RECIPE", "the pack recipe is not filed as 'other'"],
    ["app/public/voice/w-cat.mp3", "byte-pinned", "a shipped clip says delete, never re-render"],
    ["tools/pending-words/w-zzq.json", "WAITING ROOM", "the waiting room is named"],
    ["tools/pending-sounds/s-zz.json", "WAITING ROOM", "and so is the sounds half of it"],
    ["tools/voice-words.csv", "VOICE RECORD", "a voice record says use the shipping tool"],
    ["tools/render-voice-pack.py", "do NOT edit", "a render script says do NOT edit it to erase a word"],
    ["CLAUDE.md", "G17", "a governing file names the owner"],
    ["SPEC.md", "master source", "SPEC is named as the master source"],
    ["CHANGELOG.md", "a parent reads", "the changelog says a parent reads it"],
    ["docs/settled.md", "G16", "a document is named as doc-truth's"],
    ["app/src/screens/HomeScreen.jsx", "G11", "app copy is named as gated"],
    ["app/public/robots.txt", "APP ASSET", "an app asset is not app copy"],
    ["tools/gen-x.mjs", "TOOL", "a plain tool is a tool"],
    ["package.json", "UNCLASSIFIED", "and what has no kind says so, instead of guessing"],
  ];
  for (const [f, part, name] of cases) ok.push([name, label(f, part)]);
}

async function countControls(ok) {
  const cat = await counts("cat"), zzq = await counts("zzq"), hen = await counts("hen");
  const wsonly = await counts("wsonly"), none = await counts("nosuchword");
  const eq = (a, b) => a && JSON.stringify(a) === JSON.stringify(b);
  ok.push(["the bank is the union, not the level lists",
    eq(zzq.now, { bank: 10, levelSize: 7, clips: 19, sounds: 6 })]);
  ok.push(["a word keyed twice does NOT shrink the bank when only its level entry goes",
    eq(zzq.levelOnly, { bank: 10, levelSize: 6, clips: 19, sounds: 6 })]);
  ok.push(["and removing it everywhere takes its clip AND its sole sound's clip",
    eq(zzq.everywhere, { bank: 9, levelSize: 6, clips: 17, sounds: 5 })]);
  ok.push(["a word keyed once has no separate level-only case", cat.levelOnly === null]);
  ok.push(["and takes exactly one clip with it",
    eq(cat.everywhere, { bank: 9, levelSize: 1, clips: 18, sounds: 6 })]);
  ok.push(["sole users are counted over the BANK, not the levels",
    hen.sole.length === 0 && eq(hen.everywhere, { bank: 9, levelSize: 1, clips: 18, sounds: 6 })]);
  ok.push(["a word in no level is still in the bank", wsonly.inBank === true && wsonly.now.levelSize === null]);
  ok.push(["a word that is not in the bank is reported as not in the bank", none.inBank === false]);
  ok.push(["the level a word sits in is reported, not the one next to it", zzq.level === 2]);
  ok.push(["every count that can move names the floor it moves",
    /* Optional chaining throughout: a renamed key must FAIL this control, not
       throw inside it. A control that can only fail by crashing reports "the
       tool is broken" where it meant "the fault was caught", and the two are
       indistinguishable in a pass/fail count. */
    !!FLOORS.bank?.[0]?.includes("g11_copy_rules") && FLOORS.clips?.[0] === "g13_clips"
    && !!FLOORS.sounds?.[0]?.includes("g13_clips") && !!FLOORS.levelSize?.[0]?.includes("G3")
    && !!FLOORS.tests?.[0]?.includes("g1_unit_tests") && !!FLOORS.tests?.[0]?.includes("g20_tests_mapped")]);
}

/* The layer the first version had none of. Everything above can pass while the
   tool prints nothing at all. */
function outputControls(ok, box) {
  const out = run(box, "--word", "zzq");
  const has = (s) => out.includes(s);
  ok.push(["the report prints the files it found", has("reference/word-quest.jsx") && has("tools/voice-words.csv")]);
  ok.push(["under the heading that says what each file IS", has("THE ENGINE SOURCE") && has("SHIPPED AUDIO")]);
  ok.push(["the clip is in the printed report, not only in the search",
    has("app/public/voice/w-zzq.mp3")]);
  ok.push(["the counts reach the page", has('"bank":10') && has('"levelSize":7') && has('"clips":19')]);
  ok.push(["both removal cases reach the page",
    has("If its level entry goes") && has("If removed everywhere") && has('"clips":17')]);
  ok.push(["the sole-user sound is named on the page", has("ONLY user of: d:zee")]);
  ok.push(["every floor reaches the page",
    has("g11_copy_rules") && has("g13_clips") && has("g20_tests_mapped")]);
  ok.push(["the level a word sits in reaches the page", has("yes, Level 2")]);
  ok.push(["how much was looked at reaches the page, by value and not merely by shape",
    has(`of ${Object.keys(CORPUS).length} tracked`)]);

  /* The founding incident, in one assertion: the scenario contains the level
     size and never the word, so only the chase can reach it. */
  ok.push(["the chase reaches the scenario that does arithmetic on the level size",
    has("features/promotion.feature") && has("Arithmetic")]);
  ok.push(["and the generated test that hard-codes it", has("tests/generated/acceptance.test.js")]);
  /* And SPEC, which an audit removed a word without: its level-count sentence
     holds the number and no gate reads it. The chase must never be narrower
     than --count on the same number. */
  const chase = out.slice(out.indexOf("Arithmetic"));
  const byCount = run(box, "--count", "7");
  const missing = files(hits("7", "number")).filter((f) => !chase.includes(f));
  ok.push(["the chase is never narrower than --count on the same number", missing.length === 0]);
  ok.push(["so SPEC's own level-count line is chased, and it is the line no gate reads",
    chase.includes("SPEC.md") && byCount.includes("SPEC.md")]);
  ok.push(["the bank and clip counts are chased too, not only the level size",
    chase.includes("app/src/screens/HomeScreen.jsx") && chase.includes(".claude/gate-baseline.json")]);

  /* --symbol and --text had no output control at all, and they are the two the
     file's own header prescribes as the fallback for its declared blind spots:
     --text is how a mutant anchor is found, --symbol how a dependency written
     as a computation rather than a literal is found. */
  const sym = run(box, "--symbol", "SEAM_MS");
  ok.push(["--symbol prints its report, not just its title",
    sym.includes("reference/word-quest.jsx") && sym.includes("THE ENGINE SOURCE")]);
  ok.push(["and names the spellings it searched", sym.includes("SEAM_MS / seamMs")]);
  const txt = run(box, "--text", "Let's try again.");
  ok.push(["--text prints its report, not just its title",
    txt.includes("docs/qa-procedure.md") && txt.includes("DOCUMENT")]);
  ok.push(["a report that found something exits 0", LAST_STATUS === 0]);

  ok.push(["the line that says the bank does NOT shrink reaches the page", has("Also keyed in")]);
  /* The excerpt cap and the flag that lifts it: --all is in the usage block, so
     an agent will use it, so something has to prove it does anything. */
  const capped = run(box, "--word", "zzq"), all = run(box, "--word", "zzq", "--all");
  ok.push(["excerpt lines are capped at three, and the tail says how many are left",
    /* Both tails, because one file's off-by-one count is another file's right
       answer: with four hits and five hits in the corpus, an off-by-one tail
       still prints a "1" somewhere and a single-number check reads as fine. */
    block(capped, "tools/voice-words.csv").includes("3: hen,1,round 4,compared with zzq")
    && block(capped, "tools/voice-words.csv").includes("… 1 more lines in this file (--all)")]);
  ok.push(["and the defining line survives the cap even when it is last in the file",
    capped.includes('"zzq": ["pinned"]')]);
  ok.push(["and the file NAME outranks the excerpt lines, so a clip is never capped away",
    block(capped, "tools/pending-words/w-zzq.json").includes("(the file name itself)")]);
  /* By CONTENT, not by length: --all adds the hidden line and removes the tail
     that announced it, so the two outputs are the same number of lines and a
     length comparison passes whatever --all does. */
  ok.push(["--all lifts the cap instead of being decoration",
    all.includes("4: qqz,2,round 5,after zzq") && !capped.includes("4: qqz,2,round 5,after zzq")
    && !all.includes("more lines in this file")]);

  ok.push(["a word nobody uses prints nothing found, and does not pretend otherwise",
    run(box, "--word", "zzzznotathing").includes("(nothing)")]);
  ok.push(["no argument is refused with a message, not a stack trace",
    run(box).includes("name what you are changing")]);
  ok.push(["a flag used as a value is refused", run(box, "--word", "--count").includes("needs a value")]);
  ok.push(["an empty value is refused instead of printing the repository back",
    run(box, "--word", "").includes("cannot be empty")]);
  ok.push(["a missing engine loses the counts and keeps the file list",
    (() => { const e = join(box, "src/engine.js"); const keep = readFileSync(e); rmSync(e);
      const o = run(box, "--word", "zzq"); writeFileSync(e, keep);
      return o.includes("No counts") && o.includes("reference/word-quest.jsx"); })()]);
  ok.push(["an engine older than its source is called stale before anything is believed",
    (() => { const s = join(box, "reference/word-quest.jsx");
      /* Stamped rather than rewritten: two writes in the same millisecond are
         not ordered, and a control that depends on clock resolution is a
         control that fails on somebody else's machine. */
      const t = statSync(join(box, "src/engine.js")).mtime;
      utimesSync(s, t, new Date(t.getTime() + 5000));
      return run(box, "--word", "zzq").includes("NEWER than src/engine.js"); })()]);
}

/* THE CONTROL FOR THE WORST FAULT THIS TOOL HAS HAD. A git hook exports GIT_DIR
   and GIT_INDEX_FILE, and those OVERRIDE cwd — so the sandbox's `git add` wrote
   its stub corpus into the calling repository's index: SPEC.md staged at 2 lines
   instead of 975, the generated engine staged, nineteen files and nearly twenty
   thousand deletions queued for the next commit. `npm run check` from a
   pre-commit hook is the ordinary way to automate E7, so nothing exotic was
   needed to reach it. This stands a scratch repository in for that hook's
   repository, runs the whole self-test inside it with those variables set, and
   requires the scratch repository to be untouched afterwards.
   The nested run skips this control: without the guard it would recurse. */
function hookControls(ok) {
  const caller = mkdtempSync(join(tmpdir(), "blast-radius-hook-"));
  writeFileSync(join(caller, "keep.txt"), "a file the caller already had\n");
  git(["init", "-q"], caller);
  /* -f and a catch, for the same reason sandbox() has them: a global gitignore
     listing *.txt is somebody's real configuration, and a control that dies on
     it teaches them to stop believing the check. */
  try { git(["add", "-f", "keep.txt"], caller); } catch { /* asserted below */ }
  /* Scrub FIRST, then set — never cleanEnv({...}), which merges and then
     deletes the very variables being set, so the child runs in a cleaner
     environment than the parent and the control reproduces no hook at all.
     That was the shape of this control on its first attempt: it reported ok
     three times while every way of removing the fix passed 92 of 92 and staged
     twenty files into the caller's repository. */
  const hookEnv = {
    ...cleanEnv(),
    GIT_DIR: join(caller, ".git"),
    GIT_WORK_TREE: caller,
    GIT_INDEX_FILE: join(caller, ".git", "index"),
    BLAST_RADIUS_NESTED: "1",
  };
  let out = "";
  try {
    out = execFileSync(process.execPath, [TOOL, "--self-test"],
      { cwd: caller, encoding: "utf8", env: hookEnv, timeout: 120000, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const staged = git(["diff", "--cached", "--name-only"], caller).trim().split("\n").filter(Boolean);
  const untracked = git(["status", "--porcelain"], caller).trim();
  rmSync(caller, { recursive: true, force: true });
  ok.push(["a self-test run from a git hook stages nothing into that hook's repository",
    staged.join() === "keep.txt"]);
  ok.push(["and leaves no sandbox file behind in its working tree",
    !untracked.includes("SPEC.md") && !untracked.includes("engine.js")]);
  ok.push(["and still passes its own controls there, rather than going red for the environment",
    /controls: \d+ passed, 0 failed/.test(out)]);
}

async function selfTest() {
  const ok = [];
  const real = process.cwd();
  const box = sandbox();
  try {
    ROOT = box;
    searchControls(ok);
    numberControls(ok);
    symbolTextControls(ok);
    await countControls(ok);
    /* Run from a subdirectory: a cwd-relative walk answers with that subtree
       only, counts still right — wrong where nobody would check. */
    ROOT = null;
    process.chdir(join(box, "app"));
    const below = files(hits("zzq")).length;
    process.chdir(real);
    ROOT = box;
    ok.push(["the answer is the same run from a subdirectory as from the root",
      below === files(hits("zzq")).length && below === 7]);
    outputControls(ok, box);
  } finally {
    process.chdir(real);
    ROOT = null;
    rmSync(box, { recursive: true, force: true });
  }
  classifyControls(ok);
  if (!process.env.BLAST_RADIUS_NESTED) hookControls(ok);
  /* The guard exists to stop the hook control recursing into itself. It must
     not be a switch that quietly removes controls: set in the ambient
     environment, or deleted by an edit, it would take three controls away and
     still report "0 failed". This asserts they ran, by name. */
  ok.push(["the git-variable scrub names every variable git uses to override a working directory",
    ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY",
      "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR", "GIT_NAMESPACE",
      "GIT_CEILING_DIRECTORIES", "GIT_PREFIX", "GIT_INTERNAL_SUPER_PREFIX"]
      .every((v) => GIT_VARS.includes(v))]);
  ok.push(["the git-hook controls actually ran, rather than being skipped",
    !!process.env.BLAST_RADIUS_NESTED
    || ok.some(([n]) => n.includes("stages nothing into that hook's repository"))]);

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
  if (!c.engine) console.log(`\nNo counts: ${c.why}`);
  else {
    console.log(`\nIn the bank: ${c.inBank ? `yes, Level ${c.level ?? "none"}` : "no"}`);
    if (c.alsoKeyed.length) console.log(`Also keyed in: ${c.alsoKeyed.join(", ")} — the bank is the union, not the levels`);
    console.log("Counts now:            ", JSON.stringify(c.now));
    if (c.inBank) {
      if (c.levelOnly) console.log("If its level entry goes:", JSON.stringify(c.levelOnly));
      console.log("If removed everywhere: ", JSON.stringify(c.everywhere));
      if (c.sole.length) console.log(`It is the ONLY user of: ${c.sole.join(", ")} — those clips go with it`);
      console.log("\nFloors that follow those counts:");
      for (const [k, list] of Object.entries(FLOORS)) for (const f of list) console.log(`  ${k}: ${f}`);
    }
  }
  report(`Files that name "${word}":`, hits(word), word);
  /* The step the tool used to leave to a person, which is where the hour went:
     the numbers it has just printed are what the scenarios, the floors and the
     copy do arithmetic on, and none of those files mentions the word. Every
     kind is reported, because a chase narrower than --count on the same number
     is a chase that hides SPEC's own level-count line. */
  if (c.engine && c.inBank) {
    const seen = new Set();
    for (const [what, n] of [["this level's size", c.now.levelSize], ["the bank size", c.now.bank],
      ["the clip count", c.now.clips]]) {
      if (!n || seen.has(n)) continue;
      seen.add(n);
      report(`Arithmetic on ${what} (${n}) — chased for you:`, hits(String(n), "number"), String(n));
    }
  }
}
if (count !== null) report(`Files containing the literal ${count}:`, hits(count, "number"), count);
if (symbol !== null) {
  const vs = symbolVariants(symbol);
  report(`Files naming ${vs.join(" / ")} (any case):`, hits(symbol, "symbol"), symbol);
}
if (text !== null) report(`Files containing "${text}":`, hits(text, "text"), text);

console.log("\nE11: name the change, name what it breaks, THEN edit.");
console.log("Cheap checks worth running now: node tools/mutants.mjs --anchors");
